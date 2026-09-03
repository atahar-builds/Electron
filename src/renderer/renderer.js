'use strict';

(function () {
  const petEl = document.getElementById('pet');
  const glyphEl = document.getElementById('glyph');
  const gazeEl = document.getElementById('gaze');
  const debugEl = document.getElementById('debug');

  const animator = new window.Animator(petEl, glyphEl, gazeEl);

  // Latest signals from the main process, merged in resolveAmbient().
  let walking = false;
  let activityBehavior = 'idle';
  let lastActivityBehavior = null;
  const dbg = { cursor: null, activity: null, clickThrough: false };

  /**
   * Cursor state beats app state: a pet chasing your mouse should look like
   * it's walking, not like it's typing. Everything else comes from the focused
   * app. 'curious' is a one-off, so it never becomes the ambient mood.
   */
  function resolveAmbient() {
    if (walking) return animator.setAmbient('walk');
    animator.setAmbient(activityBehavior === 'curious' ? 'idle' : activityBehavior);
  }

  // ---------------------------------------------------------------- cursor
  window.pet.onCursor((data) => {
    dbg.cursor = data;
    animator.setGaze(data.gazeX, data.gazeY);
    animator.setFacing(data.facing);
    if (data.walking !== walking) {
      walking = data.walking;
      resolveAmbient();
    }
    renderDebug();
  });

  // -------------------------------------------------------------- activity
  window.pet.onActivity((data) => {
    dbg.activity = data;
    activityBehavior = data.behavior;

    // Fire the perk-up once per focus change, not on every poll tick.
    if (data.behavior === 'curious' && lastActivityBehavior !== 'curious') {
      animator.play('curious', 900);
    }
    lastActivityBehavior = data.behavior;

    resolveAmbient();
    renderDebug();
  });

  // ----------------------------------------------------------------- state
  window.pet.onState((s) => {
    if (typeof s.clickThrough === 'boolean') {
      dbg.clickThrough = s.clickThrough;
      document.body.classList.toggle('click-through', s.clickThrough);
      renderDebug();
    }
  });

  window.pet.onConfig((cfg) => {
    debugEl.classList.toggle('hidden', !cfg.debugOverlay);
    dbg.clickThrough = !!cfg.clickThrough;
    document.body.classList.toggle('click-through', dbg.clickThrough);
  });

  // ------------------------------------------------------ drag vs. poke
  // One gesture, two meanings: move past DRAG_THRESHOLD and it's a drag,
  // release below it and it's a poke.
  const DRAG_THRESHOLD = 4;
  let pointerDown = false;
  let dragged = false;
  let startX = 0;
  let startY = 0;

  petEl.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    pointerDown = true;
    dragged = false;
    startX = e.screenX;
    startY = e.screenY;
    window.pet.dragStart();
  });

  window.addEventListener('mousemove', (e) => {
    if (!pointerDown) return;
    if (!dragged && Math.hypot(e.screenX - startX, e.screenY - startY) > DRAG_THRESHOLD) {
      dragged = true;
      petEl.classList.add('dragging');
    }
    if (dragged) window.pet.dragMove();
  });

  window.addEventListener('mouseup', () => {
    if (!pointerDown) return;
    pointerDown = false;
    petEl.classList.remove('dragging');
    window.pet.dragEnd();
    if (!dragged) {
      animator.play('react', 700);
      window.pet.poke();
    }
  });

  // Right-click is a quick way to eyeball the 'confused' state before Phase 2
  // wires it to unmatched speech.
  petEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    animator.play('confused', 1000);
  });

  // ----------------------------------------------------------------- debug
  function renderDebug() {
    if (debugEl.classList.contains('hidden')) return;
    const c = dbg.cursor;
    const a = dbg.activity;
    debugEl.textContent = [
      `state  ${animator.state}${walking ? ' (walking)' : ''}`,
      `cursor ${c ? `d=${c.distance}px face=${c.facing > 0 ? 'R' : 'L'}` : '—'}`,
      `app    ${a ? `${a.app.slice(0, 18)} [${a.label}]` : '—'}`,
      `mode   ${dbg.clickThrough ? 'click-through' : 'interactive'}${a && !a.available ? ' | active-win off' : ''}`,
    ].join('\n');
  }

  window.pet.ready();
  renderDebug();
})();

'use strict';

/**
 * ANIMATOR — the single place that decides which animation is playing.
 *
 * Right now each state is a CSS class on #pet driving inline-SVG keyframes.
 * That is deliberate: it keeps Phase 1 dependency-free and gives us a stable
 * seam. To move to Lottie or Rive later you only rewrite `render()` below —
 * load one .lottie/.riv per state (or one state machine) and swap
 * `el.className` for `lottie.play('walk')` / `riveInput.value = 'walk'`.
 * Nothing outside this file knows how the pixels get drawn.
 *
 * Two layers of state:
 *   ambient   — the long-lived mood (idle / walk / typing / sleep)
 *   transient — a one-off that wins for a fixed duration (curious / react / confused)
 */
(function () {
  const STATES = ['idle', 'walk', 'curious', 'typing', 'react', 'confused', 'sleep'];

  /** Glyph shown in the corner per state; '' means no glyph. */
  const GLYPHS = { react: '!', confused: '?', sleep: 'z' };

  class Animator {
    constructor(petEl, glyphEl, gazeEl) {
      this.el = petEl;
      this.glyphEl = glyphEl;
      this.gazeEl = gazeEl;

      this.ambient = 'idle';
      this.transient = null;
      this.transientUntil = 0;
      this.current = null;
      this.facing = 1;

      this.render();
      this.scheduleBlink();

      // Re-render when a transient expires. 100ms is plenty for animation swaps.
      setInterval(() => this.render(), 100);
    }

    /** Long-lived mood. Ignored while a transient is still playing. */
    setAmbient(state) {
      if (!STATES.includes(state)) return;
      this.ambient = state;
      this.render();
    }

    /** Short reaction that overrides the ambient mood for `ms`. */
    play(state, ms = 900) {
      if (!STATES.includes(state)) return;
      this.transient = state;
      this.transientUntil = Date.now() + ms;
      // Restart the CSS animation even if the same class is already applied.
      this.current = null;
      this.el.classList.remove('state-' + state);
      void this.el.offsetWidth; // force reflow so the keyframes replay
      this.render();
    }

    get state() {
      if (this.transient && Date.now() < this.transientUntil) return this.transient;
      this.transient = null;
      return this.ambient;
    }

    /** Move the eyes toward the cursor. Sleeping pets don't track. */
    setGaze(x, y) {
      if (this.state === 'sleep') { this.gazeEl.style.transform = ''; return; }
      this.gazeEl.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }

    /** facing: 1 = cursor is right of the pet, -1 = left. */
    setFacing(facing) {
      if (facing === this.facing) return;
      this.facing = facing;
      this.el.classList.toggle('face-left', facing < 0);
    }

    /**
     * THE SWAP POINT. Everything above is renderer-agnostic; only this method
     * knows we're using CSS classes today.
     */
    render() {
      const next = this.state;
      if (next === this.current) return;
      this.current = next;

      for (const s of STATES) this.el.classList.remove('state-' + s);
      this.el.classList.add('state-' + next);

      this.glyphEl.textContent = GLYPHS[next] || '';
    }

    /** Random blink every 2.5–6s, skipped while asleep (eyes already shut). */
    scheduleBlink() {
      const next = 2500 + Math.random() * 3500;
      setTimeout(() => {
        if (this.state !== 'sleep') {
          this.el.classList.add('blinking');
          setTimeout(() => this.el.classList.remove('blinking'), 130);
        }
        this.scheduleBlink();
      }, next);
    }
  }

  window.Animator = Animator;
  window.PET_STATES = STATES;
})();

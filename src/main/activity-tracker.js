'use strict';

const { APP_BEHAVIORS, DEFAULT_BEHAVIOR, TIMING } = require('../config/app-behavior');

/**
 * Polls the OS for the focused window and maps it to a pet behaviour using the
 * plain rule list in src/config/app-behavior.js.
 *
 * active-win v8 is ESM-only, so it is pulled in with a dynamic import(). If it
 * cannot load (missing OS deps, permissions not granted on macOS, headless
 * Linux) the tracker degrades to 'idle' instead of taking the app down.
 */
function startActivityTracking({ win, onBehavior }) {
  let activeWinFn = null;
  let loadFailed = false;
  let stopped = false;

  let lastAppKey = null;
  let lastChangeAt = Date.now();
  let curiousUntil = 0;

  async function loadActiveWin() {
    if (activeWinFn || loadFailed) return activeWinFn;
    try {
      const mod = await import('active-win');
      activeWinFn = mod.activeWindow || mod.default;
    } catch (err) {
      loadFailed = true;
      console.warn('[activity] active-win unavailable, app reactivity disabled:', err.message);
    }
    return activeWinFn;
  }

  async function tick() {
    if (stopped) return;

    let info = null;
    const fn = await loadActiveWin();
    if (fn) {
      try {
        info = await fn();
      } catch (err) {
        // A single failed probe is normal (screen locked, window closing).
        info = null;
      }
    }

    const owner = info?.owner?.name || '';
    const title = info?.title || '';
    const haystack = `${owner} ${title}`.toLowerCase();
    const appKey = owner || 'unknown';

    // Focus changed to a different app -> perk up for a moment.
    if (appKey !== lastAppKey) {
      lastAppKey = appKey;
      lastChangeAt = Date.now();
      curiousUntil = Date.now() + TIMING.curiousDurationMs;
    }

    const rule = matchRule(haystack);
    const idleFor = Date.now() - lastChangeAt;

    let behavior;
    if (Date.now() < curiousUntil) behavior = 'curious';
    else if (idleFor > TIMING.sleepAfterMs) behavior = 'sleep';
    else behavior = rule ? rule.behavior : DEFAULT_BEHAVIOR;

    const payload = {
      app: owner || 'unknown',
      title,
      label: rule ? rule.label : 'Idle',
      behavior,
      idleForMs: idleFor,
      available: !loadFailed,
    };

    if (typeof onBehavior === 'function') onBehavior(payload);
    send(win, 'activity:update', payload);
  }

  // `haystack` already lowercased; string rules are substring, RegExp rules test().
  function matchRule(haystack) {
    if (!haystack.trim()) return null;
    for (const rule of APP_BEHAVIORS) {
      const m = rule.match;
      if (typeof m === 'string' ? haystack.includes(m.toLowerCase()) : m.test(haystack)) {
        return rule;
      }
    }
    return null;
  }

  tick();
  const timer = setInterval(tick, TIMING.activityPollMs);

  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

/** Same teardown/crash guard as the cursor tracker. */
function send(win, channel, payload) {
  if (!win || win.isDestroyed()) return;
  const wc = win.webContents;
  if (!wc || wc.isDestroyed() || wc.isCrashed()) return;
  try {
    wc.send(channel, payload);
  } catch {
    /* render frame disposed between the check and the send */
  }
}

module.exports = { startActivityTracking };

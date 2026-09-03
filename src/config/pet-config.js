'use strict';

/** Tunables for the window and the cursor-follow behaviour. */
module.exports = {
  window: {
    width: 220,
    height: 220,
    /** Where the pet spawns on very first run: offset from bottom-right of the primary display. */
    spawnMarginX: 80,
    spawnMarginY: 140,
    /**
     * false = the pet never steals keyboard focus from whatever you're typing
     * in. Nice, but on Linux Electron warns that a non-focusable window "stops
     * interacting with the wm", which can break dragging on some desktops.
     * Default true (dragging always works); flip to false on Windows/macOS if
     * focus-stealing annoys you and dragging still works for you.
     */
    focusable: true,
  },

  cursor: {
    /** How often the main process samples the OS cursor position (ms). */
    pollMs: 100,
    /**
     * Pet starts walking when the cursor is further than this (px) from the
     * pet's centre, and stops once it gets within `stopRadius`. The gap between
     * the two prevents jitter.
     */
    walkRadius: 320,
    stopRadius: 150,
    /** Walk speed in px per poll tick. At pollMs=100 this is ~60px/sec. */
    speed: 6,
    /** Max px the eyes/head shift toward the cursor. */
    maxGaze: 6,
  },

  /** Show the debug overlay (state + active app + cursor delta) in the window. */
  debugOverlay: true,
};

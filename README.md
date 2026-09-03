# Desktop Pet — Phase 1

A "dumb" desktop virtual pet: frameless, transparent, always-on-top, and reactive to
your cursor and whatever app you have focused. **No LLM anywhere.** Later phases add
push-to-talk speech → local whisper.cpp → a plain keyword map.

Phase 1 is complete: window shell, idle loop, cursor follow, app-activity reactivity,
drag, poke, and a system tray.

## File structure

```
desktop-pet/
├── package.json
├── .env.example            # placeholders for Phase 3 keys — Phase 1 needs NONE
├── .gitignore
└── src/
    ├── config/
    │   ├── pet-config.js       # window size, cursor poll rate, walk radii, speed
    │   └── app-behavior.js     # ← EDIT THIS: app name → pet behaviour rules
    ├── main/
    │   ├── main.js             # app lifecycle, window, tray, IPC, drag
    │   ├── preload.js          # the only main↔renderer bridge (contextIsolation on)
    │   ├── state.js            # electron-store persistence
    │   ├── cursor-tracker.js   # screen.getCursorScreenPoint() polling + walking
    │   ├── activity-tracker.js # active-win polling + behaviour matching
    │   └── tray-icon.js        # tray PNG, embedded as base64
    └── renderer/
        ├── index.html          # inline SVG pet
        ├── styles.css          # all animation keyframes, one class per state
        ├── animator.js         # ← the Lottie/Rive swap point
        └── renderer.js         # IPC wiring, drag-vs-poke, debug overlay
```

## Install & run

```bash
npm install     # postinstall rebuilds active-win against Electron's ABI
npm run dev     # with debug overlay + devtools
npm start       # normal
```

**API keys needed for Phase 1: none.** `.env.example` documents the two free keys
Phase 3 will need (YouTube Data API v3, OpenWeatherMap) — ignore them for now.

## Manual test steps

Run `npm run dev`. The debug overlay at the bottom of the pet shows live state.

1. **Window shell** — Pet appears bottom-right, no title bar, no window frame, and
   the area around it is see-through to your desktop. It stays on top when you
   focus other apps, and does **not** appear in the taskbar/dock.
2. **Idle loop** — Left alone, the pet breathes slowly and blinks at random
   intervals (every 2.5–6s).
3. **Cursor gaze** — Move the mouse in a circle around the pet without touching it.
   Its eyes shift toward the cursor, and the whole pet flips to face left when the
   cursor is on its left. Overlay shows `cursor d=<px> face=L|R`.
4. **Walk toward cursor** — Move the cursor far away (>320px) and hold still. The
   pet switches to the walking animation (feet shuffle, faster bob) and moves
   across the screen toward you, stopping ~150px away. Overlay shows `(walking)`.
   Confirm it stops at the screen edge rather than sliding off.
5. **App reactivity** — Alt-tab to a different app. The pet perks up (`curious`,
   hop + antenna wiggle) for ~2s. Focus a code editor or terminal → it switches to
   the head-down `typing` bob, and the overlay shows `app <name> [Editor]`.
   Focus a browser → `[Browsing]`. Leave focus unchanged for 5 minutes → `sleep`
   (eyes shut, `z`).
6. **Drag** — Click and drag the pet. It follows the mouse 1:1, cursor becomes a
   grabbing hand, and it stays where dropped. Quit and relaunch → it reopens in
   the same spot.
7. **Poke** — Single click without moving. The pet shakes with a `!`. Confirm a
   drag does *not* also fire a poke.
8. **Confused preview** — Right-click the pet for the `confused` head-tilt + `?`.
   (Phase 2 wires this to unrecognised speech.)
9. **Click-through** — Press `Ctrl/Cmd+Shift+P` (or tray → Click-through). The pet
   dims slightly; clicks now land on the window *behind* it, but the eyes still
   track your cursor. Toggle back off and confirm dragging works again.
10. **Tray** — Tray icon menu offers Show/Hide, Click-through, Reset position, and
    Quit. `Ctrl/Cmd+Shift+H` also toggles visibility. Quit fully exits.

## Tuning

- **Behaviour per app** — `src/config/app-behavior.js`. Each rule is
  `{ match, behavior, label }`; `match` is a case-insensitive substring or a RegExp
  tested against `"<app owner name> <window title>"`, first match wins. Timings
  (poll rate, curious duration, sleep-after) are at the bottom of the same file.
- **Movement feel** — `src/config/pet-config.js`: `walkRadius` / `stopRadius`
  (the gap between them prevents jitter), `speed`, `maxGaze`, `pollMs`.
- **Debug overlay** — set `debugOverlay: false` in `pet-config.js`.

## Notes

- **Animations are inline SVG + CSS keyframes, not Lottie/Rive yet.** That keeps
  Phase 1 dependency-free, and `src/renderer/animator.js` is a deliberate seam:
  its `render()` method is the only code that knows how pixels get drawn. Swapping
  in Lottie or Rive means rewriting that one method — nothing else changes.
- **`active-win` ships a native addon** built for Node's ABI, so it must be
  rebuilt for Electron. `npm install` does this via `postinstall`. If the rebuild
  fails the app still runs — it logs a warning and app reactivity falls back to
  `idle`; re-run `npm run rebuild` to fix. On macOS, first launch will prompt for
  Screen Recording permission (needed to read window titles).
- **`npm audit`** reports advisories in `@mapbox/node-pre-gyp` → `tar`, pulled in
  only by `active-win` as build-time tooling. Nothing there runs at app runtime.
- **`window.focusable`** in `pet-config.js` is `true` so dragging is guaranteed to
  work. Setting it `false` stops the pet stealing keyboard focus, but Electron
  warns that on Linux this "stops interacting with the wm" and can break dragging
  on some desktops — try it, revert if the pet stops responding to the mouse.

## Not built yet

Phases 2–5 (push-to-talk + whisper.cpp, keyword map, action handlers, canned
reaction lines, settings panel) are untouched.

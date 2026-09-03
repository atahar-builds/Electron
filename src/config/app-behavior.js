'use strict';

/**
 * APP ACTIVITY -> PET BEHAVIOR MAPPING
 *
 * This is the file you edit to change how the pet reacts to whatever app you
 * have focused. Nothing here is magic: the active window's owner name and
 * window title are lowercased and matched against `match` with a plain
 * substring/regex test. First rule that matches wins.
 *
 *   match:    string (case-insensitive substring) OR RegExp
 *   behavior: one of the ANIMATION STATES below
 *   label:    optional human name, shown in the debug overlay only
 *
 * ANIMATION STATES the renderer knows about:
 *   'idle'      breathing + blinking loop (default)
 *   'walk'      walking toward the cursor
 *   'curious'   perk-up, used briefly whenever focus changes to a new app
 *   'typing'    head-down "working" bob, for editors/terminals
 *   'react'     poke reaction
 *   'confused'  question mark (used in Phase 2 for unmatched speech)
 *   'sleep'     zzz, after inactivity
 */

const APP_BEHAVIORS = [
  // --- code / text editors -------------------------------------------------
  { match: /code|vscode|cursor|sublime|atom|webstorm|intellij|pycharm|goland|rider|neovim|nvim|vim|emacs|zed|notepad/, behavior: 'typing', label: 'Editor' },

  // --- terminals -----------------------------------------------------------
  { match: /terminal|iterm|alacritty|kitty|wezterm|konsole|gnome-terminal|powershell|cmd\.exe|windows terminal|warp/, behavior: 'typing', label: 'Terminal' },

  // --- writing / docs ------------------------------------------------------
  { match: /word|docs|notion|obsidian|bear|pages|textedit|gedit/, behavior: 'typing', label: 'Writing' },

  // --- browsers ------------------------------------------------------------
  { match: /chrome|chromium|firefox|safari|edge|brave|arc|opera|vivaldi/, behavior: 'curious', label: 'Browsing' },

  // --- media / chill -------------------------------------------------------
  { match: /spotify|youtube music|vlc|music|netflix|iina|mpv/, behavior: 'idle', label: 'Music' },

  // --- chat ----------------------------------------------------------------
  { match: /slack|discord|telegram|whatsapp|signal|messages|teams|zoom/, behavior: 'curious', label: 'Chat' },
];

/** Fallback when nothing above matches. */
const DEFAULT_BEHAVIOR = 'idle';

const TIMING = {
  /** How often to poll the active window (ms). */
  activityPollMs: 1500,
  /** How long the 'curious' perk-up plays when focus changes to a new app (ms). */
  curiousDurationMs: 2200,
  /** No focus change for this long -> pet gets sleepy (ms). Default 5 min. */
  sleepAfterMs: 5 * 60 * 1000,
};

module.exports = { APP_BEHAVIORS, DEFAULT_BEHAVIOR, TIMING };

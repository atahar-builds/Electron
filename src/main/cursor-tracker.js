'use strict';

const { screen } = require('electron');
const { cursor: CFG } = require('../config/pet-config');

/**
 * Polls the OS cursor with screen.getCursorScreenPoint() and:
 *   1. tells the renderer which way to look (normalised gaze vector), and
 *   2. walks the window toward the cursor when it drifts too far away.
 *
 * All of this lives in the main process because getCursorScreenPoint() reports
 * the cursor even when it is outside our window — a renderer mousemove listener
 * would only see it while hovering the pet.
 */
function startCursorTracking({ win, getMode, onWalkStateChange }) {
  let walking = false;

  const timer = setInterval(() => {
    if (!win || win.isDestroyed() || !win.isVisible()) return;

    const cursor = screen.getCursorScreenPoint();
    const b = win.getBounds();
    const centerX = b.x + b.width / 2;
    const centerY = b.y + b.height / 2;

    const dx = cursor.x - centerX;
    const dy = cursor.y - centerY;
    const distance = Math.hypot(dx, dy);

    // --- 1. gaze ---------------------------------------------------------
    // Normalised direction (-1..1) plus a px offset the renderer applies to the
    // eyes and head. Guard against distance 0 (cursor exactly on centre).
    const nx = distance > 0.001 ? dx / distance : 0;
    const ny = distance > 0.001 ? dy / distance : 0;

    // --- 2. walking ------------------------------------------------------
    // Hysteresis: start walking past walkRadius, stop inside stopRadius. The
    // pet never walks while it is being dragged or is hidden.
    const mode = getMode();
    const canWalk = !mode.dragging;

    if (canWalk) {
      if (!walking && distance > CFG.walkRadius) walking = true;
      else if (walking && distance < CFG.stopRadius) walking = false;
    } else {
      walking = false;
    }

    if (walking) {
      const step = Math.min(CFG.speed, distance - CFG.stopRadius);
      if (step > 0) {
        const target = clampToDisplay(
          Math.round(b.x + nx * step),
          Math.round(b.y + ny * step),
          b.width,
          b.height
        );
        win.setPosition(target.x, target.y);
      }
    }

    if (typeof onWalkStateChange === 'function') onWalkStateChange(walking);

    send(win, 'cursor:update', {
      dx,
      dy,
      nx,
      ny,
      distance: Math.round(distance),
      walking,
      // Positive = cursor is to the right of the pet. Renderer uses this to flip.
      facing: nx >= 0 ? 1 : -1,
      gazeX: nx * CFG.maxGaze * Math.min(1, distance / 200),
      gazeY: ny * CFG.maxGaze * Math.min(1, distance / 200),
    });
  }, CFG.pollMs);

  return () => clearInterval(timer);
}

/** Keep the whole window inside the work area of whichever display it is on. */
function clampToDisplay(x, y, w, h) {
  const display = screen.getDisplayNearestPoint({ x: x + w / 2, y: y + h / 2 });
  const a = display.workArea;
  return {
    x: Math.max(a.x, Math.min(x, a.x + a.width - w)),
    y: Math.max(a.y, Math.min(y, a.y + a.height - h)),
  };
}

/**
 * isDestroyed() on the window is not enough: during teardown, or if the
 * renderer crashes, the render frame can be gone while the window object is
 * still around, and send() throws. Guard both, then swallow the race.
 */
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

module.exports = { startCursorTracking, clampToDisplay };

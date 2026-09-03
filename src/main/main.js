'use strict';

require('dotenv').config(); // Phase 1 needs no keys; wired up now for later phases.

const path = require('path');
const {
  app, BrowserWindow, Tray, Menu, ipcMain, screen, globalShortcut,
} = require('electron');

const store = require('./state');
const petConfig = require('../config/pet-config');
const { createTrayIcon } = require('./tray-icon');
const { startCursorTracking, clampToDisplay } = require('./cursor-tracker');
const { startActivityTracking } = require('./activity-tracker');

/** Mutable runtime mode shared with the trackers. */
const mode = {
  dragging: false,
  clickThrough: store.get('clickThrough', false),
};

let win = null;
let tray = null;
let stopCursor = null;
let stopActivity = null;
let dragOffset = { x: 0, y: 0 };

// Only one pet, please.
if (!app.requestSingleInstanceLock()) app.quit();

function createWindow() {
  const { width, height, spawnMarginX, spawnMarginY } = petConfig.window;
  const saved = store.get('position');
  const area = screen.getPrimaryDisplay().workArea;

  const spawn = saved || {
    x: area.x + area.width - width - spawnMarginX,
    y: area.y + area.height - height - spawnMarginY,
  };
  const pos = clampToDisplay(spawn.x, spawn.y, width, height);

  win = new BrowserWindow({
    width,
    height,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: petConfig.window.focusable,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // 'screen-saver' keeps it above fullscreen apps; visible on every workspace.
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  applyClickThrough(mode.clickThrough);

  // 'moved' fires on every setPosition(), and the walk loop moves the window
  // ~10x/sec — persisting each one would hammer the store. Save the last
  // position only once the pet has settled.
  win.on('moved', persistPositionSoon);

  if (process.argv.includes('--dev')) win.webContents.openDevTools({ mode: 'detach' });
}

let persistTimer = null;
function persistPositionSoon() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    if (!win || win.isDestroyed()) return;
    const [x, y] = win.getPosition();
    store.set('position', { x, y });
  }, 600);
}

function applyClickThrough(enabled) {
  mode.clickThrough = enabled;
  store.set('clickThrough', enabled);
  if (win && !win.isDestroyed()) {
    // forward:true keeps hover/gaze working while clicks pass through.
    win.setIgnoreMouseEvents(enabled, { forward: true });
    win.webContents.send('pet:state', { clickThrough: enabled });
  }
  if (tray) buildTrayMenu();
}

function toggleVisibility() {
  if (!win || win.isDestroyed()) return;
  if (win.isVisible()) win.hide();
  else win.showInactive(); // show without stealing focus
  store.set('hidden', !win.isVisible());
  buildTrayMenu();
}

function buildTrayMenu() {
  if (!tray) return;
  const visible = win && !win.isDestroyed() && win.isVisible();
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: visible ? 'Hide pet' : 'Show pet', click: toggleVisibility },
    {
      label: 'Click-through',
      type: 'checkbox',
      checked: mode.clickThrough,
      click: (item) => applyClickThrough(item.checked),
      toolTip: 'Let clicks pass through the pet to whatever is behind it',
    },
    { type: 'separator' },
    {
      label: 'Reset position',
      click: () => {
        store.delete('position');
        const { width, height, spawnMarginX, spawnMarginY } = petConfig.window;
        const area = screen.getPrimaryDisplay().workArea;
        win.setPosition(
          area.x + area.width - width - spawnMarginX,
          area.y + area.height - height - spawnMarginY
        );
      },
    },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } },
  ]));
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('Desktop Pet');
  buildTrayMenu();
  // Left-click the tray icon to show/hide (Windows/Linux convention).
  tray.on('click', toggleVisibility);
}

function registerIpc() {
  ipcMain.on('pet:ready', () => {
    win.webContents.send('pet:config', {
      debugOverlay: petConfig.debugOverlay,
      clickThrough: mode.clickThrough,
    });
  });

  ipcMain.on('drag:start', () => {
    mode.dragging = true;
    const cursor = screen.getCursorScreenPoint();
    const [x, y] = win.getPosition();
    dragOffset = { x: cursor.x - x, y: cursor.y - y };
  });

  ipcMain.on('drag:move', () => {
    if (!mode.dragging || !win || win.isDestroyed()) return;
    const cursor = screen.getCursorScreenPoint();
    const b = win.getBounds();
    const p = clampToDisplay(cursor.x - dragOffset.x, cursor.y - dragOffset.y, b.width, b.height);
    win.setPosition(p.x, p.y);
  });

  ipcMain.on('drag:end', () => {
    mode.dragging = false;
    persistPositionSoon();
  });

  ipcMain.on('pet:poke', () => {
    // Phase 4 will hang a canned line off this. For now the renderer handles
    // the animation itself; main just logs so you can see the wiring works.
    if (process.argv.includes('--dev')) console.log('[pet] poked');
  });
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) app.dock.hide(); // tray-only app

  createWindow();
  createTray();
  registerIpc();

  stopCursor = startCursorTracking({ win, getMode: () => mode });
  stopActivity = startActivityTracking({ win });

  globalShortcut.register('CommandOrControl+Shift+P', () => applyClickThrough(!mode.clickThrough));
  globalShortcut.register('CommandOrControl+Shift+H', toggleVisibility);
});

app.on('second-instance', () => {
  if (win && !win.isDestroyed()) win.showInactive();
});

// Tray app: closing the last window must not quit.
app.on('window-all-closed', (e) => { if (e && e.preventDefault) e.preventDefault(); });

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  clearTimeout(persistTimer);
  if (stopCursor) stopCursor();
  if (stopActivity) stopActivity();
});

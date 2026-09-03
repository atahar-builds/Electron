'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * The only bridge between the renderer (the pet's face) and the main process.
 * contextIsolation stays on; the renderer never touches Node directly.
 */
contextBridge.exposeInMainWorld('pet', {
  // main -> renderer
  onCursor: (cb) => ipcRenderer.on('cursor:update', (_e, data) => cb(data)),
  onActivity: (cb) => ipcRenderer.on('activity:update', (_e, data) => cb(data)),
  onState: (cb) => ipcRenderer.on('pet:state', (_e, data) => cb(data)),
  onConfig: (cb) => ipcRenderer.on('pet:config', (_e, data) => cb(data)),

  // renderer -> main
  dragStart: () => ipcRenderer.send('drag:start'),
  dragMove: () => ipcRenderer.send('drag:move'),
  dragEnd: () => ipcRenderer.send('drag:end'),
  poke: () => ipcRenderer.send('pet:poke'),
  ready: () => ipcRenderer.send('pet:ready'),
});

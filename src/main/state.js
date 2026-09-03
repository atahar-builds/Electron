'use strict';

const Store = require('electron-store');

/**
 * Local persistence for pet state. Phase 1 only stores where the pet was left
 * on screen; later phases add city, hotkey, aliases, etc.
 */
const store = new Store({
  name: 'pet-state',
  defaults: {
    position: null,          // { x, y } screen coords, null until first move
    clickThrough: false,
    hidden: false,
  },
});

module.exports = store;

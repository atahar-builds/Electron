'use strict';

const { nativeImage } = require('electron');

/**
 * 32x32 tray icon, embedded as base64 so there is no binary asset to keep in
 * sync. Replace TRAY_PNG_BASE64 (or swap in nativeImage.createFromPath) once you
 * have real art.
 */
const TRAY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABKklEQVR42tWXzRGCMBCFnfHOyZNjE3RBAfZiARRAAZRBMymABiiA+Rycd1AksAGC8c3kQsK+zf7ndPo3ABmQAwVw1yr0LYtFehZJCTSAAzqg1+r0rdGZ4ex5L/JBWA202NHqn2KrqR+62Vo4ychCya9AJfNuRS9Z15CbV+yPymQJmayPoMAg82EJOEc8OG9gKtVq4qOeTFHdvj1AgXbSCiogs7hcbq+1dv8N5VTkNxZyH8nS/gjNR0aojjsr+Zhkad8TjPnY/92BCnQfcaCO1h/ogoHrHqTAzkH4pcCsCyLgywV55Aq4GISmNLQiOA0thcjqX+O5MrgUWyLcmAXeUrzYjHz5HpiCtXdetLbjlcTz7TiJgSSJkeznQ2kSY3kSD5NknmZJPE5j4gn8UQoPa/XjigAAAABJRU5ErkJggg==';

function createTrayIcon() {
  const img = nativeImage.createFromDataURL('data:image/png;base64,' + TRAY_PNG_BASE64);
  // macOS wants a small template image so it adapts to light/dark menu bars.
  const resized = img.resize({ width: 16, height: 16 });
  if (process.platform === 'darwin') resized.setTemplateImage(true);
  return resized;
}

module.exports = { createTrayIcon };

/**
 * background.js — Service Worker untuk e-EMR Auto-Sync Extension
 *
 * Di versi ini berfungsi sebagai bridge/minimal worker.
 * Chrome Extension V3 mengharuskan adanya service worker agar extension
 * tetap aktif menerima event (meski pada praktiknya komunikasi utama
 * berlangsung langsung antara popup ↔ content script).
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[e-EMR Auto-Sync] Extension terinstall.');
});

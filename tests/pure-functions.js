/**
 * pure-functions.js
 *
 * Re-exports the testable pure functions from the dashboard application so
 * the Node.js test runner can import them without needing a browser DOM or
 * localStorage.
 *
 * The implementations here are kept 1-for-1 identical to the functions in
 * js/app.js. Any change to a function in app.js MUST be reflected here.
 *
 * Functions exported:
 *  - _getGreeting(hour)      — GreetingWidget
 *  - _formatTime(s)          — FocusTimerWidget
 *  - _validateUrl(url)       — QuickLinksWidget
 *  - StorageService_read(key, store) — StorageService (injectable store for testability)
 */

'use strict';

// ---------------------------------------------------------------------------
// _getGreeting(hour)
// Map an hour (0–23) to a greeting string.
// Req 1.3–1.6
// ---------------------------------------------------------------------------
function _getGreeting(hour) {
  if (hour >= 5 && hour <= 11) return 'Good Morning';
  if (hour >= 12 && hour <= 17) return 'Good Afternoon';
  if (hour >= 18 && hour <= 20) return 'Good Evening';
  return 'Good Night'; // 21–23 and 00–04
}

// ---------------------------------------------------------------------------
// _formatTime(s)
// Convert a count of seconds into a "MM:SS" string.
// Req 2.3
// ---------------------------------------------------------------------------
function _formatTime(s) {
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// _validateUrl(url)
// Return true iff url starts with "http://" or "https://" (case-sensitive).
// Req 4.3
// ---------------------------------------------------------------------------
function _validateUrl(url) {
  return typeof url === 'string' &&
    (url.startsWith('http://') || url.startsWith('https://'));
}

// ---------------------------------------------------------------------------
// StorageService_read(key, store)
// Read and deserialise a value from the given key-value store (injectable for
// testing — pass an object like { pd_tasks: '[...]' } instead of localStorage).
// Returns the parsed array on success, or null if the key is missing or the
// value cannot be parsed as a JSON array.
// Req 5.9
// ---------------------------------------------------------------------------
function StorageService_read(key, store) {
  try {
    const raw = (store && typeof store.getItem === 'function')
      ? store.getItem(key)
      : (store ? store[key] : null);

    if (raw === null || raw === undefined) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }
    return parsed;
  } catch (_err) {
    return null;
  }
}

module.exports = {
  _getGreeting,
  _formatTime,
  _validateUrl,
  StorageService_read,
};

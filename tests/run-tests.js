/**
 * run-tests.js — Node.js test harness for personal-dashboard pure functions
 *
 * Uses fast-check for property-based testing and a minimal hand-rolled
 * assertion helper for unit tests (no extra dependencies beyond fast-check).
 *
 * Run with:  node run-tests.js         (from the tests/ directory)
 *        or: npm test                  (from the tests/ directory)
 *
 * The harness exits with code 0 on success and code 1 if any test fails.
 */

'use strict';

const fc = require('fast-check');
const {
  _getGreeting,
  _formatTime,
  _validateUrl,
  StorageService_read,
} = require('./pure-functions');

// =============================================================================
// Minimal test utilities
// =============================================================================

let passed = 0;
let failed = 0;

/**
 * Run a named test case.
 * @param {string} name
 * @param {Function} fn  — throw (or call fail()) to signal failure
 */
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`      ${err.message || err}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

function section(title) {
  console.log(`\n${title}`);
  console.log('─'.repeat(title.length));
}

// =============================================================================
// Unit tests — _getGreeting
// =============================================================================

section('Unit tests: _getGreeting(hour)');

test('hour 0 → Good Night', () => assertEqual(_getGreeting(0),  'Good Night'));
test('hour 4 → Good Night', () => assertEqual(_getGreeting(4),  'Good Night'));
test('hour 5 → Good Morning', () => assertEqual(_getGreeting(5),  'Good Morning'));
test('hour 11 → Good Morning', () => assertEqual(_getGreeting(11), 'Good Morning'));
test('hour 12 → Good Afternoon', () => assertEqual(_getGreeting(12), 'Good Afternoon'));
test('hour 17 → Good Afternoon', () => assertEqual(_getGreeting(17), 'Good Afternoon'));
test('hour 18 → Good Evening', () => assertEqual(_getGreeting(18), 'Good Evening'));
test('hour 20 → Good Evening', () => assertEqual(_getGreeting(20), 'Good Evening'));
test('hour 21 → Good Night', () => assertEqual(_getGreeting(21), 'Good Night'));
test('hour 23 → Good Night', () => assertEqual(_getGreeting(23), 'Good Night'));

// =============================================================================
// Unit tests — _formatTime
// =============================================================================

section('Unit tests: _formatTime(s)');

test('0 → "00:00"',   () => assertEqual(_formatTime(0),    '00:00'));
test('1500 → "25:00"', () => assertEqual(_formatTime(1500), '25:00'));
test('61 → "01:01"',  () => assertEqual(_formatTime(61),   '01:01'));
test('60 → "01:00"',  () => assertEqual(_formatTime(60),   '01:00'));
test('59 → "00:59"',  () => assertEqual(_formatTime(59),   '00:59'));
test('90 → "01:30"',  () => assertEqual(_formatTime(90),   '01:30'));

// =============================================================================
// Unit tests — _validateUrl
// =============================================================================

section('Unit tests: _validateUrl(url)');

test('"http://x" is valid',   () => assert(_validateUrl('http://x'),   '"http://x" should be valid'));
test('"https://x" is valid',  () => assert(_validateUrl('https://x'),  '"https://x" should be valid'));
test('"http://" is valid',    () => assert(_validateUrl('http://'),    '"http://" should be valid'));
test('"ftp://x" is invalid',  () => assert(!_validateUrl('ftp://x'),   '"ftp://x" should be invalid'));
test('"" is invalid',         () => assert(!_validateUrl(''),          'empty string should be invalid'));
test('"HTTP://x" is invalid', () => assert(!_validateUrl('HTTP://x'),  'uppercase HTTP should be invalid (case-sensitive)'));
test('"HTTPS://x" is invalid', () => assert(!_validateUrl('HTTPS://x'),'uppercase HTTPS should be invalid (case-sensitive)'));
test('"example.com" is invalid', () => assert(!_validateUrl('example.com'), 'no-scheme string should be invalid'));
test('non-string (null) is invalid',     () => assert(!_validateUrl(null),  'null should be invalid'));
test('non-string (undefined) is invalid', () => assert(!_validateUrl(undefined), 'undefined should be invalid'));
test('non-string (number) is invalid',    () => assert(!_validateUrl(42),    'number should be invalid'));

// =============================================================================
// Unit tests — StorageService_read
// =============================================================================

section('Unit tests: StorageService_read(key, store)');

test('valid JSON array is returned as-is', () => {
  const store = { pd_tasks: JSON.stringify([{ id: '1', text: 'hello', completed: false }]) };
  const result = StorageService_read('pd_tasks', store);
  assert(Array.isArray(result), 'should return an array');
  assertEqual(result.length, 1);
  assertEqual(result[0].text, 'hello');
});

test('missing key returns null', () => {
  const store = {};
  const result = StorageService_read('pd_tasks', store);
  assert(result === null, 'should return null for missing key');
});

test('malformed JSON returns null', () => {
  const store = { pd_tasks: '{not valid json' };
  const result = StorageService_read('pd_tasks', store);
  assert(result === null, 'should return null for malformed JSON');
});

test('non-array JSON value returns null', () => {
  const store = { pd_tasks: JSON.stringify({ id: '1' }) };
  const result = StorageService_read('pd_tasks', store);
  assert(result === null, 'should return null for non-array JSON');
});

test('JSON null stored returns null', () => {
  const store = { pd_tasks: JSON.stringify(null) };
  const result = StorageService_read('pd_tasks', store);
  assert(result === null, 'should return null for stored JSON null');
});

test('empty array stored returns empty array', () => {
  const store = { pd_tasks: JSON.stringify([]) };
  const result = StorageService_read('pd_tasks', store);
  assert(Array.isArray(result), 'should return an array');
  assertEqual(result.length, 0);
});

// =============================================================================
// Property-based tests
// =============================================================================

section('Property tests (fast-check)');

/**
 * Property 1: Greeting text coverage
 * For any hour in [0, 23], _getGreeting returns exactly one of the four valid strings.
 * Validates: Requirements 1.3, 1.4, 1.5, 1.6
 */
test('Property 1 — _getGreeting always returns a valid greeting for hours 0–23', () => {
  const validGreetings = new Set(['Good Morning', 'Good Afternoon', 'Good Evening', 'Good Night']);
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 23 }), (hour) => {
      const result = _getGreeting(hour);
      return validGreetings.has(result);
    }),
    { numRuns: 100 }
  );
});

/**
 * Property 2: Timer format round-trip
 * For any s in [0, 1500], parsing MM and SS from _formatTime(s) back to seconds === s.
 * Validates: Requirements 2.3
 */
test('Property 2 — _formatTime round-trips seconds through MM:SS', () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 1500 }), (s) => {
      const formatted = _formatTime(s);
      // Must match "MM:SS"
      if (!/^\d{2}:\d{2}$/.test(formatted)) return false;
      const [mm, ss] = formatted.split(':').map(Number);
      return mm * 60 + ss === s;
    }),
    { numRuns: 100 }
  );
});

/**
 * Property 7: Quick Links URL validation
 * _validateUrl returns true iff the string starts with "http://" or "https://".
 * Validates: Requirements 4.3
 */
test('Property 7 — _validateUrl is true iff url starts with http:// or https://', () => {
  fc.assert(
    fc.property(fc.string(), (url) => {
      const result = _validateUrl(url);
      const expected = url.startsWith('http://') || url.startsWith('https://');
      return result === expected;
    }),
    { numRuns: 100 }
  );
});

/**
 * Property 9: StorageService_read never throws — returns array or null
 * For any arbitrary string stored as the value, StorageService_read either
 * returns an Array or null, and never throws.
 * Validates: Requirements 5.9
 */
test('Property 9 — StorageService_read always returns Array or null, never throws', () => {
  fc.assert(
    fc.property(fc.string(), (rawValue) => {
      const store = { pd_tasks: rawValue };
      const result = StorageService_read('pd_tasks', store);
      return result === null || Array.isArray(result);
    }),
    { numRuns: 100 }
  );
});

// =============================================================================
// Summary
// =============================================================================

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed > 0) {
  process.exit(1);
}

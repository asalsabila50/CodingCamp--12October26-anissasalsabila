# Implementation Plan: Personal Dashboard

## Overview

Implement a single-page, client-side dashboard using plain HTML, CSS, and Vanilla JavaScript — no build step, no external dependencies. The app is structured as one `index.html`, one `css/style.css`, and one `js/app.js`. Each widget is an encapsulated module object inside `app.js`. A shared `StorageService` handles all `localStorage` I/O.

---

## Tasks

- [x] 1. Scaffold project structure and HTML skeleton
  - Create `index.html` with semantic landmark elements for each widget: `#greeting`, `#focus-timer`, `#todo-list`, `#quick-links`
  - Add `<link>` to `css/style.css` and `<script defer>` to `js/app.js`
  - Create `css/style.css` and `js/app.js` as empty files
  - _Requirements: 6.4, 6.5_

- [x] 2. Implement StorageService
  - [x] 2.1 Write the `StorageService` module in `js/app.js`
    - Implement `read(key)`: wraps `localStorage.getItem` + `JSON.parse` in `try/catch`; returns parsed array or `null` on missing key or parse error
    - Implement `write(key, array)`: wraps `JSON.stringify` + `localStorage.setItem` in `try/catch`; logs and surfaces errors on failure
    - Define `KEYS` constant: `{ TASKS: 'pd_tasks', LINKS: 'pd_links' }`
    - _Requirements: 5.1, 5.2, 5.6, 5.9_

  - [ ]* 2.2 Write property test for StorageService — Property 9
    - **Property 9: Storage deserialization never throws**
    - Use `fc.string()` as arbitrary input stored under the key; assert `StorageService.read` always returns an array or `null`, never throws
    - **Validates: Requirements 5.9**

- [x] 3. Implement GreetingWidget
  - [x] 3.1 Write the `GreetingWidget` module in `js/app.js`
    - Implement `_getGreeting(hour)`: pure function mapping hour ranges to greeting strings (05–11 → "Good Morning", 12–17 → "Good Afternoon", 18–20 → "Good Evening", 21–23 + 00–04 → "Good Night")
    - Implement `_update()`: reads `new Date()` in `try/catch`; updates time (HH:MM), date ("Day, DD Month YYYY"), and greeting DOM nodes; renders "Time unavailable" placeholder on error (no greeting shown)
    - Implement `init()`: calls `_update()` immediately, then starts a 1-second `setInterval` calling `_update()`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [ ]* 3.2 Write property test for GreetingWidget — Property 1
    - **Property 1: Greeting text coverage**
    - Use `fc.integer({ min: 0, max: 23 })` as input; assert `_getGreeting(h)` returns exactly one of {"Good Morning", "Good Afternoon", "Good Evening", "Good Night"} for every value
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6**

- [x] 4. Implement FocusTimerWidget
  - [x] 4.1 Write the `FocusTimerWidget` module in `js/app.js`
    - Implement state machine with states: `IDLE | RUNNING | PAUSED | COMPLETE`; initialize `remaining = 1500`, `intervalId = null`
    - Implement `_formatTime(s)`: pure function converting seconds to `"MM:SS"` string
    - Implement `_tick()`: decrements `remaining` by 1; transitions to `COMPLETE` and calls `clearInterval` when `remaining` reaches 0
    - Implement `_render()`: updates MM:SS display; toggles `.timer--complete` CSS class in COMPLETE state; disables Start and enables Stop while RUNNING; enables Start and disables Stop in IDLE/PAUSED
    - Implement `init()`: renders initial 25:00 state; wires Start, Stop, Reset button click handlers; calls `clearInterval` before setting any new interval to prevent duplicates
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 4.2 Write property test for FocusTimerWidget — Property 2
    - **Property 2: Timer format round-trip**
    - Use `fc.integer({ min: 0, max: 1500 })` as input; assert parsing MM and SS from `_formatTime(s)` back to `MM * 60 + SS === s`
    - **Validates: Requirements 2.3**

- [x] 5. Implement TodoListWidget
  - [x] 5.1 Write the `TodoListWidget` module in `js/app.js`
    - Define `tasks` array; generate unique IDs via `Date.now() + '_' + Math.random()`
    - Implement `_loadFromStorage()`: reads `pd_tasks` via `StorageService.read`; initializes with empty array on `null` result or corrupt data
    - Implement `_save()`: writes full `tasks` array to `pd_tasks` via `StorageService.write`
    - Implement `addTask(text)`: rejects empty or whitespace-only text (keep input focused); rejects text > 500 chars; appends `{ id, text, completed: false }`; calls `_save()` and `_render()`
    - Implement `toggleComplete(id)`: flips `completed` boolean on the matching task; calls `_save()` and `_render()`
    - Implement `startEdit(id)`, `confirmEdit(id, newText)`, `cancelEdit(id)`: replaces task display with editable input; rejects empty `newText`; `cancelEdit` restores original text; `Escape` key triggers `cancelEdit`
    - Implement `deleteTask(id)`: removes task from array; calls `_save()` and `_render()`
    - Implement `_render()` and `_renderTask(task)`: full re-render of task list; applies strikethrough + reduced opacity for completed tasks
    - Implement `init()`: calls `_loadFromStorage()` then `_render()`; wires add-task form submit handler
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11_

  - [ ]* 5.2 Write property test for TodoListWidget — Property 3
    - **Property 3: Adding a task grows the task list**
    - Use `fc.string({ minLength: 1, maxLength: 500 })` filtered to exclude whitespace-only strings; assert task array length increases by exactly 1 and new task has `completed = false`
    - **Validates: Requirements 3.1**

  - [ ]* 5.3 Write property test for TodoListWidget — Property 4
    - **Property 4: Whitespace-only task text is rejected**
    - Use `fc.stringOf(fc.constantFrom(' ', '\t', '\n'))` as input; assert task array length is unchanged after `addTask(ws)`
    - **Validates: Requirements 3.2**

  - [ ]* 5.4 Write property test for TodoListWidget — Property 5
    - **Property 5: Task completion toggle is an involution**
    - Use `fc.record({ id: fc.string(), text: fc.string(), completed: fc.boolean() })` to generate a task; assert that calling `toggleComplete` twice leaves `completed` unchanged
    - **Validates: Requirements 3.4, 3.5**

  - [ ]* 5.5 Write property test for TodoListWidget — Property 6
    - **Property 6: Task persistence round-trip**
    - Use `fc.array(taskArbitrary)` where `taskArbitrary` covers all task fields; assert `JSON.parse(JSON.stringify(tasks))` deep-equals the in-memory `tasks` array after `_save()`
    - **Validates: Requirements 3.10, 5.1, 5.7**

- [x] 6. Checkpoint — core widgets
  - Ensure GreetingWidget, FocusTimerWidget, and TodoListWidget all render correctly in the browser and all passing tests remain green. Ask the user if questions arise.

- [x] 7. Implement QuickLinksWidget
  - [x] 7.1 Write the `QuickLinksWidget` module in `js/app.js`
    - Define `links` array; generate unique IDs via `Date.now() + '_' + Math.random()`
    - Implement `_loadFromStorage()`: reads `pd_links` via `StorageService.read`; initializes with empty array on `null` result
    - Implement `_save()`: writes full `links` array to `pd_links` via `StorageService.write`
    - Implement `_validateUrl(url)`: returns `true` iff `url` starts with `"http://"` or `"https://"` (case-sensitive)
    - Implement `addLink(label, url)`: rejects empty label or empty URL (display inline validation message within 100 ms, retain entered values); rejects invalid URL format with inline message; appends `{ id, label, url }`; calls `_save()` and `_render()`
    - Implement `deleteLink(id)`: removes link from array; calls `_save()` and `_render()`
    - Implement `_render()` and `_renderLink(link)`: renders link as a `<a>` button with `target="_blank" rel="noopener noreferrer"`; wires delete control
    - Implement `init()`: calls `_loadFromStorage()` then `_render()`; wires add-link form submit handler
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 7.2 Write property test for QuickLinksWidget — Property 7
    - **Property 7: Quick Links URL validation**
    - Use `fc.string()` as input; assert `_validateUrl(url)` returns `true` if and only if `url` starts with `"http://"` or `"https://"`
    - **Validates: Requirements 4.3**

  - [ ]* 7.3 Write property test for QuickLinksWidget — Property 8
    - **Property 8: Link persistence round-trip**
    - Use `fc.array(linkArbitrary)` where `linkArbitrary` covers all link fields; assert `JSON.parse(JSON.stringify(links))` deep-equals the in-memory `links` array after `_save()`
    - **Validates: Requirements 4.7, 5.2, 5.8**

- [x] 8. Wire app bootstrap and data persistence
  - [x] 8.1 Add `DOMContentLoaded` bootstrap in `js/app.js`
    - Call `GreetingWidget.init()`, `FocusTimerWidget.init()`, `TodoListWidget.init()`, `QuickLinksWidget.init()` in sequence
    - Add a `setTimeout` watchdog (1000 ms) that checks each widget's root element for visible content; display fallback placeholder and log to console for any widget that has not rendered (Req 6.7)
    - Display a global error banner if `StorageService.read` returned `null` during any widget init (Req 5.6)
    - _Requirements: 5.3, 5.6, 6.6, 6.7_

- [x] 9. Implement CSS layout and visual styles
  - [-] 9.1 Write all styles in `css/style.css`
    - Grid layout: 2–4 columns on viewports ≥ 768 px; single-column stack below 768 px (media query)
    - Each widget: `min-height: 100px`, `max-height: 600px`
    - Completed task style: `text-decoration: line-through`, reduced opacity
    - `.timer--complete` class: visually distinct state (color change + "Session complete!" text indicator)
    - Focus indicators and `aria-label` attributes on all interactive controls
    - _Requirements: 3.4, 2.6, 6.1, 6.2, 6.3, 6.4_

- [x] 10. Set up property-based test harness and write unit tests
  - [x] 10.1 Set up fast-check test harness
    - Create `tests/` directory; add a test runner configuration (e.g., a plain HTML test page or Node.js script) that imports `fast-check` and the extracted pure functions from `app.js`
    - Extract testable pure functions (`_getGreeting`, `_formatTime`, `_validateUrl`, `StorageService.read`) into an importable module or expose them via a test-only export pattern
    - _Requirements: 6.5_

  - [ ]* 10.2 Write unit tests for pure functions
    - `_getGreeting`: boundary values 0, 4, 5, 11, 12, 17, 18, 20, 21, 23
    - `_formatTime`: 0 → "00:00", 1500 → "25:00", 61 → "01:01"
    - `_validateUrl`: `"http://x"`, `"https://x"`, `"ftp://x"`, `""`, no-scheme strings
    - `StorageService.read`: valid JSON array, malformed JSON, missing key, non-array JSON value
    - Timer state transitions: Start → Stop → Start (assert single interval, no duplicates); Reset from RUNNING, PAUSED, COMPLETE
    - _Requirements: 1.3–1.6, 2.3, 4.3, 5.9_

- [x] 11. Final checkpoint — full integration
  - Ensure all implemented tests pass, all four widgets are visible and interactive in the browser, data survives a page reload, and the layout is correct at both desktop and mobile widths. Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All code lives in exactly three files: `index.html`, `css/style.css`, `js/app.js` (Req 6.4, 6.5)
- Property tests reference the numbered properties in `design.md` for full traceability
- `_save()` is always called synchronously before the next user interaction, satisfying Req 5.7 and 5.8
- The `fast-check` test harness (task 10.1) requires extracting pure functions; a simple approach is a `window.__test__` export guard that only exposes internals when `location.search` includes `?test`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["3.1", "4.1", "5.1", "7.1", "8.1"] },
    { "id": 2, "tasks": ["9.1", "10.1"] },
    { "id": 3, "tasks": ["2.2", "3.2", "4.2", "5.2", "5.3", "5.4", "5.5", "7.2", "7.3", "10.2"] }
  ]
}
```

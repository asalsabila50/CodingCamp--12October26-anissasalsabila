// =============================================================================
// StorageService — centralised localStorage access with error handling
// =============================================================================

const StorageService = (() => {
  const KEYS = {
    TASKS: 'pd_tasks',
    LINKS: 'pd_links',
  };

  /**
   * Read and deserialise a value from localStorage.
   * Returns the parsed array on success, or null if the key is missing,
   * the stored value is null, or the JSON cannot be parsed (corrupt data).
   *
   * @param {string} key
   * @returns {Array|null}
   */
  function read(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) {
        return null; // key does not exist
      }
      const parsed = JSON.parse(raw);
      // Ensure the stored value is actually an array; reject anything else.
      if (!Array.isArray(parsed)) {
        console.error(
          `StorageService.read: value for key "${key}" is not an array — discarding.`
        );
        return null;
      }
      return parsed;
    } catch (err) {
      console.error(
        `StorageService.read: failed to parse data for key "${key}":`,
        err
      );
      return null;
    }
  }

  /**
   * Serialise and write an array to localStorage.
   * Logs an error and returns false on failure (e.g. quota exceeded);
   * returns true on success.
   *
   * @param {string} key
   * @param {Array} array
   * @returns {boolean}
   */
  function write(key, array) {
    try {
      const serialised = JSON.stringify(array);
      localStorage.setItem(key, serialised);
      return true;
    } catch (err) {
      console.error(
        `StorageService.write: failed to write data for key "${key}":`,
        err
      );
      return false;
    }
  }

  return { read, write, KEYS };
})();

// =============================================================================
// GreetingWidget — live clock, date, and time-of-day greeting
// =============================================================================

const GreetingWidget = (() => {
  const DAYS = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
  ];
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  /**
   * Map an hour (0–23) to a greeting string.
   * Pure function — no side effects.
   *
   * @param {number} hour - Integer in [0, 23]
   * @returns {string}
   */
  function _getGreeting(hour) {
    if (hour >= 5 && hour <= 11) return 'Good Morning';
    if (hour >= 12 && hour <= 17) return 'Good Afternoon';
    if (hour >= 18 && hour <= 20) return 'Good Evening';
    return 'Good Night'; // 21–23 and 00–04
  }

  /**
   * Read the current time from Date() and update the greeting DOM nodes.
   * On any error, renders "Time unavailable" and hides the greeting.
   */
  function _update() {
    const timeEl     = document.getElementById('greeting-time');
    const dateEl     = document.getElementById('greeting-date');
    const messageEl  = document.getElementById('greeting-message');

    try {
      const now  = new Date();
      const hour = now.getHours();

      // HH:MM — 24-hour, zero-padded (Req 1.1)
      const hh = String(hour).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      timeEl.textContent = `${hh}:${mm}`;

      // "Day, DD Month YYYY" (Req 1.2)
      const dayName   = DAYS[now.getDay()];
      const dd        = String(now.getDate()).padStart(2, '0');
      const monthName = MONTHS[now.getMonth()];
      const yyyy      = now.getFullYear();
      dateEl.textContent = `${dayName}, ${dd} ${monthName} ${yyyy}`;

      // Greeting by hour range (Req 1.3–1.6)
      messageEl.textContent = _getGreeting(hour);
    } catch (err) {
      // Clock inaccessible — show placeholder, no greeting (Req 1.8)
      console.error('GreetingWidget._update: could not read system clock:', err);
      if (timeEl) timeEl.textContent = 'Time unavailable';
      if (dateEl) dateEl.textContent = 'Date unavailable';
      if (messageEl) messageEl.textContent = '';
    }
  }

  /**
   * Initialise the widget: render immediately then refresh every second.
   * Satisfies Req 1.7 (no wait for first interval tick).
   */
  function init() {
    _update();                          // immediate render (Req 1.7)
    setInterval(_update, 1000);         // 1-second refresh (Req 1.1)
  }

  return { init, _update, _getGreeting };
})();

// =============================================================================
// FocusTimerWidget — 25-minute Pomodoro-style countdown timer
// =============================================================================

const FocusTimerWidget = (() => {
  // ── State ──────────────────────────────────────────────────────────────────
  // Valid states: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETE'
  let state      = 'IDLE';
  let remaining  = 1500;   // seconds (25:00)
  let intervalId = null;

  // ── DOM references (populated in init) ────────────────────────────────────
  let displayEl     = null;
  let completeMsgEl = null;
  let startBtn      = null;
  let stopBtn       = null;
  let resetBtn      = null;

  // ── Pure helpers ───────────────────────────────────────────────────────────

  /**
   * Convert a count of seconds into a "MM:SS" string.
   * Pure function — no side effects.
   *
   * @param {number} s - Non-negative integer seconds (0–1500)
   * @returns {string}  e.g. 1500 → "25:00", 61 → "01:01", 0 → "00:00"
   */
  function _formatTime(s) {
    const minutes = Math.floor(s / 60);
    const seconds = s % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  // ── Internal behaviour ─────────────────────────────────────────────────────

  /**
   * Called every second while the timer is RUNNING.
   * Decrements remaining; transitions to COMPLETE when it reaches 0.
   * Satisfies Req 2.4 (count down) and Req 2.5 (reach zero → complete).
   */
  function _tick() {
    remaining -= 1;
    if (remaining <= 0) {
      remaining = 0;
      state = 'COMPLETE';
      clearInterval(intervalId);  // stop the interval (Req 2.7)
      intervalId = null;
    }
    _render();
  }

  /**
   * Sync the DOM to the current state.
   * - Updates the MM:SS display (Req 2.3)
   * - Toggles .timer--complete on the display element (Req 2.6)
   * - Disables Start while RUNNING; disables Stop while not RUNNING (Req 2.8)
   */
  function _render() {
    if (!displayEl) return; // guard against calling before init

    // Time display
    displayEl.textContent = _formatTime(remaining);

    // COMPLETE visual state (Req 2.6)
    const isComplete = state === 'COMPLETE';
    displayEl.classList.toggle('timer--complete', isComplete);
    completeMsgEl.hidden = !isComplete;

    // Button states (Req 2.8)
    const isRunning = state === 'RUNNING';
    startBtn.disabled = isRunning;
    stopBtn.disabled  = !isRunning;
  }

  // ── Event handlers ─────────────────────────────────────────────────────────

  function _onStart() {
    if (state === 'RUNNING' || state === 'COMPLETE') return;
    state = 'RUNNING';
    // Always clear any stale interval before creating a new one (Req 2.7)
    clearInterval(intervalId);
    intervalId = setInterval(_tick, 1000);
    _render();
  }

  function _onStop() {
    if (state !== 'RUNNING') return;
    state = 'PAUSED';
    clearInterval(intervalId);
    intervalId = null;
    _render();
  }

  function _onReset() {
    clearInterval(intervalId);
    intervalId = null;
    state     = 'IDLE';
    remaining = 1500;
    _render();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Initialise the widget: cache DOM references, render initial state,
   * and wire button click handlers.
   * Satisfies Req 2.1 (initial 25:00 display) and Req 2.2 (controls present).
   */
  function init() {
    displayEl     = document.getElementById('timer-display');
    completeMsgEl = document.getElementById('timer-complete-msg');
    startBtn      = document.getElementById('timer-start');
    stopBtn       = document.getElementById('timer-stop');
    resetBtn      = document.getElementById('timer-reset');

    if (!displayEl || !startBtn || !stopBtn || !resetBtn) {
      console.error('FocusTimerWidget.init: required DOM elements not found.');
      return;
    }

    startBtn.addEventListener('click', _onStart);
    stopBtn.addEventListener('click',  _onStop);
    resetBtn.addEventListener('click', _onReset);

    _render(); // show 25:00 immediately (Req 2.1)
  }

  return { init, _formatTime, _tick, _render };
})();

// =============================================================================
// TodoListWidget — persistent task management (add / edit / complete / delete)
// =============================================================================

const TodoListWidget = (() => {
  // ── State ──────────────────────────────────────────────────────────────────
  let tasks = [];

  // ── DOM references (populated in init) ────────────────────────────────────
  let listEl   = null;
  let formEl   = null;
  let inputEl  = null;

  // ── Storage helpers ────────────────────────────────────────────────────────

  /**
   * Load tasks from localStorage via StorageService.
   * Falls back to an empty array if the key is missing or data is corrupt.
   * Satisfies Req 3.3 and Req 5.4.
   */
  function _loadFromStorage() {
    const stored = StorageService.read(StorageService.KEYS.TASKS);
    tasks = Array.isArray(stored) ? stored : [];
  }

  /**
   * Persist the full tasks array to localStorage.
   * Called synchronously after every mutation (Req 3.10, 5.7).
   */
  function _save() {
    StorageService.write(StorageService.KEYS.TASKS, tasks);
  }

  // ── ID generation ──────────────────────────────────────────────────────────

  /** Generate a unique string ID. */
  function _generateId() {
    return Date.now() + '_' + Math.random();
  }

  // ── CRUD operations ────────────────────────────────────────────────────────

  /**
   * Add a new task with the given text.
   * Rejects empty / whitespace-only text and text longer than 500 characters.
   * Returns true on success, false on rejection.
   * Satisfies Req 3.1 and 3.2.
   *
   * @param {string} text
   * @returns {boolean}
   */
  function addTask(text) {
    const trimmed = text.trim();

    // Reject empty or whitespace-only input (Req 3.2)
    if (trimmed === '') {
      if (inputEl) inputEl.focus();
      return false;
    }

    // Reject text exceeding 500 characters
    if (trimmed.length > 500) {
      if (inputEl) inputEl.focus();
      return false;
    }

    tasks.push({ id: _generateId(), text: trimmed, completed: false });
    _save();
    _render();
    return true;
  }

  /**
   * Toggle the completed status of the task with the given id.
   * Satisfies Req 3.4 and 3.5.
   *
   * @param {string} id
   */
  function toggleComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    _save();
    _render();
  }

  /**
   * Enter edit mode for the task with the given id.
   * Replaces the task display row with an editable input + confirm/cancel controls.
   * Satisfies Req 3.6.
   *
   * @param {string} id
   */
  function startEdit(id) {
    const itemEl = listEl && listEl.querySelector(`[data-id="${id}"]`);
    if (!itemEl) return;

    const task = tasks.find(t => t.id === id);
    if (!task) return;

    // Replace content with edit controls
    itemEl.innerHTML = '';

    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'todo-edit-input';
    editInput.value = task.text;
    editInput.setAttribute('aria-label', 'Edit task text');

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'todo-btn todo-btn--confirm';
    confirmBtn.setAttribute('aria-label', 'Confirm edit');
    confirmBtn.textContent = 'Save';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'todo-btn todo-btn--cancel';
    cancelBtn.setAttribute('aria-label', 'Cancel edit');
    cancelBtn.textContent = 'Cancel';

    // Wire confirm / cancel (Req 3.7, 3.8, 3.11)
    confirmBtn.addEventListener('click', () => confirmEdit(id, editInput.value));
    cancelBtn.addEventListener('click',  () => cancelEdit(id));

    // Escape key triggers cancelEdit (Req 3.11)
    editInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') cancelEdit(id);
      if (e.key === 'Enter')  confirmEdit(id, editInput.value);
    });

    itemEl.appendChild(editInput);
    itemEl.appendChild(confirmBtn);
    itemEl.appendChild(cancelBtn);

    editInput.focus();
  }

  /**
   * Confirm an edit, saving new text if non-empty.
   * Rejects empty newText (Req 3.8); saves and re-renders on valid input (Req 3.7).
   *
   * @param {string} id
   * @param {string} newText
   */
  function confirmEdit(id, newText) {
    const trimmed = (newText || '').trim();

    // Reject empty text — keep unchanged (Req 3.8)
    if (trimmed === '') return;

    // Reject text exceeding 500 characters
    if (trimmed.length > 500) return;

    const task = tasks.find(t => t.id === id);
    if (!task) return;

    task.text = trimmed;
    _save();
    _render();
  }

  /**
   * Cancel an edit and restore the task to display mode with its original text.
   * Satisfies Req 3.11.
   *
   * @param {string} id
   */
  function cancelEdit(id) {
    // Re-render restores the original display row
    _render();
  }

  /**
   * Delete the task with the given id.
   * Satisfies Req 3.9.
   *
   * @param {string} id
   */
  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    _save();
    _render();
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  /**
   * Render a single task as a list item.
   * Applies completed styling (strikethrough + reduced opacity) when task.completed is true.
   * Satisfies Req 3.4 and 3.5.
   *
   * @param {Object} task
   * @returns {HTMLLIElement}
   */
  function _renderTask(task) {
    const li = document.createElement('li');
    li.className = 'todo-item' + (task.completed ? ' todo-item--completed' : '');
    li.setAttribute('data-id', task.id);

    // Checkbox / complete toggle (Req 3.4, 3.5)
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked = task.completed;
    checkbox.setAttribute('aria-label', task.completed ? 'Mark task incomplete' : 'Mark task complete');
    checkbox.addEventListener('change', () => toggleComplete(task.id));

    // Task text label
    const label = document.createElement('span');
    label.className = 'todo-text';
    label.textContent = task.text;

    // Edit button (Req 3.6)
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'todo-btn todo-btn--edit';
    editBtn.setAttribute('aria-label', `Edit task: ${task.text}`);
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => startEdit(task.id));

    // Delete button (Req 3.9)
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'todo-btn todo-btn--delete';
    deleteBtn.setAttribute('aria-label', `Delete task: ${task.text}`);
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    li.appendChild(checkbox);
    li.appendChild(label);
    li.appendChild(editBtn);
    li.appendChild(deleteBtn);

    return li;
  }

  /**
   * Full re-render of the task list.
   * Clears the list container and rebuilds it from the tasks array.
   * Satisfies Req 3.3.
   */
  function _render() {
    if (!listEl) return;
    listEl.innerHTML = '';

    tasks.forEach(task => {
      listEl.appendChild(_renderTask(task));
    });
  }

  // ── Initialisation ─────────────────────────────────────────────────────────

  /**
   * Build the widget's HTML skeleton inside #todo-list, then load data and render.
   * Wires the add-task form submit handler.
   * Satisfies Req 3.3 (render stored tasks on load).
   */
  function init() {
    const sectionEl = document.getElementById('todo-list');
    if (!sectionEl) {
      console.error('TodoListWidget.init: #todo-list element not found.');
      return;
    }

    // Build widget HTML
    sectionEl.innerHTML = `
      <h2>To-Do List</h2>
      <form id="todo-form" class="todo-form" novalidate>
        <input
          type="text"
          id="todo-input"
          class="todo-input"
          placeholder="Add a new task…"
          maxlength="500"
          aria-label="New task text"
          autocomplete="off"
        />
        <button type="submit" class="todo-btn todo-btn--add" aria-label="Add task">Add</button>
      </form>
      <ul id="todo-list-items" class="todo-list" aria-label="Task list" aria-live="polite"></ul>
    `;

    formEl  = document.getElementById('todo-form');
    inputEl = document.getElementById('todo-input');
    listEl  = document.getElementById('todo-list-items');

    // Wire add-task form submit (Req 3.1, 3.2)
    formEl.addEventListener('submit', (e) => {
      e.preventDefault();
      const added = addTask(inputEl.value);
      if (added) inputEl.value = ''; // only clear input on successful add
    });

    _loadFromStorage();
    _render();
  }

  return {
    init,
    addTask,
    toggleComplete,
    startEdit,
    confirmEdit,
    cancelEdit,
    deleteTask,
    _loadFromStorage,
    _save,
    _render,
    _renderTask,
    get tasks() { return tasks; },
    set tasks(val) { tasks = val; },
  };
})();

// =============================================================================
// QuickLinksWidget — persistent shortcut buttons to external URLs
// =============================================================================

const QuickLinksWidget = (() => {
  // ── State ──────────────────────────────────────────────────────────────────
  let links = [];

  // ── DOM references (populated in init) ────────────────────────────────────
  let linksContainerEl = null;
  let formEl           = null;
  let labelInputEl     = null;
  let urlInputEl       = null;
  let labelErrorEl     = null;
  let urlErrorEl       = null;

  // ── Storage helpers ────────────────────────────────────────────────────────

  /**
   * Load links from localStorage via StorageService.
   * Falls back to an empty array if the key is missing or data is corrupt.
   * Satisfies Req 4.4 and Req 5.5.
   */
  function _loadFromStorage() {
    const stored = StorageService.read(StorageService.KEYS.LINKS);
    links = Array.isArray(stored) ? stored : [];
  }

  /**
   * Persist the full links array to localStorage.
   * Called synchronously after every mutation (Req 4.7, 5.8).
   */
  function _save() {
    StorageService.write(StorageService.KEYS.LINKS, links);
  }

  // ── ID generation ──────────────────────────────────────────────────────────

  /** Generate a unique string ID. */
  function _generateId() {
    return Date.now() + '_' + Math.random();
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  /**
   * Validate that a URL starts with "http://" or "https://" (case-sensitive).
   * Pure function — no side effects.
   * Satisfies Req 4.3.
   *
   * @param {string} url
   * @returns {boolean}
   */
  function _validateUrl(url) {
    return typeof url === 'string' &&
      (url.startsWith('http://') || url.startsWith('https://'));
  }

  // ── CRUD operations ────────────────────────────────────────────────────────

  /**
   * Add a new link with the given label and url.
   * Rejects empty label or empty URL, and URLs that fail format validation.
   * Returns true on success, false on rejection.
   * Satisfies Req 4.1, 4.2, 4.3.
   *
   * @param {string} label
   * @param {string} url
   * @returns {boolean}
   */
  function addLink(label, url) {
    const trimmedLabel = (label || '').trim();
    const trimmedUrl   = (url   || '').trim();

    let hasError = false;

    // Validate label (Req 4.2)
    if (trimmedLabel === '') {
      _showError(labelErrorEl, 'Label is required.');
      hasError = true;
    } else {
      _clearError(labelErrorEl);
    }

    // Validate URL presence (Req 4.2)
    if (trimmedUrl === '') {
      _showError(urlErrorEl, 'URL is required.');
      hasError = true;
    } else if (!_validateUrl(trimmedUrl)) {
      // Validate URL format (Req 4.3)
      _showError(urlErrorEl, 'URL must start with "http://" or "https://".');
      hasError = true;
    } else {
      _clearError(urlErrorEl);
    }

    if (hasError) return false;

    links.push({ id: _generateId(), label: trimmedLabel, url: trimmedUrl });
    _save();   // write to storage before next interaction (Req 4.7)
    _render();
    return true;
  }

  /**
   * Delete the link with the given id.
   * Satisfies Req 4.6.
   *
   * @param {string} id
   */
  function deleteLink(id) {
    links = links.filter(l => l.id !== id);
    _save();   // write to storage before next interaction (Req 4.7)
    _render();
  }

  // ── Validation UI helpers ──────────────────────────────────────────────────

  /**
   * Display an inline validation message in the given element.
   * The element is shown and populated within the same synchronous call,
   * satisfying the 100 ms requirement (Req 4.2).
   *
   * @param {HTMLElement} el
   * @param {string} message
   */
  function _showError(el, message) {
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
  }

  /**
   * Clear and hide an inline validation message element.
   *
   * @param {HTMLElement} el
   */
  function _clearError(el) {
    if (!el) return;
    el.textContent = '';
    el.hidden = true;
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  /**
   * Render a single link as an anchor button with a delete control.
   * Uses target="_blank" rel="noopener noreferrer" (Req 4.5).
   *
   * @param {Object} link
   * @returns {HTMLDivElement}
   */
  function _renderLink(link) {
    const wrapper = document.createElement('div');
    wrapper.className = 'ql-item';
    wrapper.setAttribute('data-id', link.id);

    // Link button — opens URL in new tab (Req 4.5)
    const anchor = document.createElement('a');
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.className = 'ql-link-btn';
    anchor.textContent = link.label;
    anchor.setAttribute('aria-label', `Open ${link.label}`);

    // Delete control (Req 4.6)
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'ql-delete-btn';
    deleteBtn.setAttribute('aria-label', `Delete link: ${link.label}`);
    deleteBtn.textContent = '✕';
    deleteBtn.addEventListener('click', () => deleteLink(link.id));

    wrapper.appendChild(anchor);
    wrapper.appendChild(deleteBtn);

    return wrapper;
  }

  /**
   * Full re-render of the links list.
   * Clears the container and rebuilds it from the links array in order added.
   * Satisfies Req 4.4.
   */
  function _render() {
    if (!linksContainerEl) return;
    linksContainerEl.innerHTML = '';

    links.forEach(link => {
      linksContainerEl.appendChild(_renderLink(link));
    });
  }

  // ── Initialisation ─────────────────────────────────────────────────────────

  /**
   * Build the widget's HTML skeleton inside #quick-links, then load data and render.
   * Wires the add-link form submit handler.
   * Satisfies Req 4.4 (render stored links on load within 500 ms).
   */
  function init() {
    const sectionEl = document.getElementById('quick-links');
    if (!sectionEl) {
      console.error('QuickLinksWidget.init: #quick-links element not found.');
      return;
    }

    // Build widget HTML
    sectionEl.innerHTML = `
      <h2>Quick Links</h2>
      <form id="ql-form" class="ql-form" novalidate>
        <div class="ql-field-group">
          <label for="ql-label-input" class="ql-label">Label</label>
          <input
            type="text"
            id="ql-label-input"
            class="ql-input"
            placeholder="e.g. GitHub"
            aria-label="Link label"
            autocomplete="off"
          />
          <span id="ql-label-error" class="ql-error" role="alert" hidden></span>
        </div>
        <div class="ql-field-group">
          <label for="ql-url-input" class="ql-label">URL</label>
          <input
            type="text"
            id="ql-url-input"
            class="ql-input"
            placeholder="https://example.com"
            aria-label="Link URL"
            autocomplete="off"
          />
          <span id="ql-url-error" class="ql-error" role="alert" hidden></span>
        </div>
        <button type="submit" class="ql-add-btn" aria-label="Add link">Add Link</button>
      </form>
      <div id="ql-links-container" class="ql-links-container" aria-label="Quick links list" aria-live="polite"></div>
    `;

    formEl           = document.getElementById('ql-form');
    labelInputEl     = document.getElementById('ql-label-input');
    urlInputEl       = document.getElementById('ql-url-input');
    labelErrorEl     = document.getElementById('ql-label-error');
    urlErrorEl       = document.getElementById('ql-url-error');
    linksContainerEl = document.getElementById('ql-links-container');

    // Wire add-link form submit (Req 4.1, 4.2, 4.3)
    formEl.addEventListener('submit', (e) => {
      e.preventDefault();
      const added = addLink(labelInputEl.value, urlInputEl.value);
      if (added) {
        // Only clear inputs on successful add; retain values on validation failure (Req 4.2)
        labelInputEl.value = '';
        urlInputEl.value   = '';
        _clearError(labelErrorEl);
        _clearError(urlErrorEl);
      }
    });

    _loadFromStorage();
    _render();
  }

  return {
    init,
    addLink,
    deleteLink,
    _validateUrl,
    _loadFromStorage,
    _save,
    _render,
    _renderLink,
    get links() { return links; },
    set links(val) { links = val; },
  };
})();

// =============================================================================
// Test-only exports — exposed only when the URL includes ?test
// Allows the fast-check test harness to access pure functions without
// polluting the production global scope. (Req 6.5 — no extra scripts added
// to index.html; this guard is a no-op in normal page loads.)
// =============================================================================

if (typeof window !== 'undefined' &&
    typeof window.location !== 'undefined' &&
    window.location.search.includes('?test')) {
  window.__test__ = {
    _getGreeting: GreetingWidget._getGreeting,
    _formatTime:  FocusTimerWidget._formatTime,
    _validateUrl: QuickLinksWidget._validateUrl,
    StorageService: StorageService,
  };
}

// =============================================================================
// App bootstrap — initialise all widgets on DOMContentLoaded
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Track which widgets have rendered for the watchdog check
  const widgetIds = ['greeting', 'focus-timer', 'todo-list', 'quick-links'];
  let storageError = false;

  // Initialise all widgets (Req 6.6 — must render within 1 second of load event)
  GreetingWidget.init();
  FocusTimerWidget.init();

  // Detect storage errors during widget init that use localStorage
  const tasksData = StorageService.read(StorageService.KEYS.TASKS);
  const linksData = StorageService.read(StorageService.KEYS.LINKS);

  // If stored data existed but was unreadable (null returned for a key that had a value),
  // we surface an error banner. We detect this by checking if getItem has a value but read returned null.
  try {
    const rawTasks = localStorage.getItem(StorageService.KEYS.TASKS);
    const rawLinks = localStorage.getItem(StorageService.KEYS.LINKS);
    if ((rawTasks !== null && tasksData === null) ||
        (rawLinks !== null && linksData === null)) {
      storageError = true;
    }
  } catch (e) {
    storageError = true;
  }

  TodoListWidget.init();
  QuickLinksWidget.init();

  // Display global error banner if storage read failed (Req 5.6)
  if (storageError) {
    const banner = document.createElement('div');
    banner.id = 'storage-error-banner';
    banner.className = 'error-banner';
    banner.setAttribute('role', 'alert');
    banner.textContent = 'Some saved data could not be loaded. Starting with empty lists.';
    document.body.insertBefore(banner, document.body.firstChild);
  }

  // Watchdog: check each widget has visible content within 1 second (Req 6.7)
  setTimeout(() => {
    widgetIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el || el.children.length === 0) {
        console.error(`Widget #${id} failed to render within the time budget.`);
        if (el) {
          const placeholder = document.createElement('p');
          placeholder.className = 'widget-fallback';
          placeholder.textContent = 'Widget failed to load. Please refresh the page.';
          el.appendChild(placeholder);
        }
      }
    });
  }, 1000);
});

# Requirements Document

## Introduction

A personal dashboard web app built with plain HTML, CSS, and Vanilla JavaScript. It runs entirely in the browser with no backend server, using the Local Storage API for persistence. The dashboard provides four core widgets: a Greeting section showing current time and date, a Focus Timer for Pomodoro-style sessions, a To-Do List for task management, and a Quick Links section for favorite websites. The app is designed to be clean, minimal, fast-loading, and usable as a standalone page or browser extension.

## Glossary

- **Dashboard**: The single-page web application containing all four widgets.
- **Greeting_Widget**: The UI section that displays the current time, date, and a context-aware greeting message.
- **Focus_Timer**: The UI section that implements a 25-minute countdown timer with Start, Stop, and Reset controls.
- **Todo_List**: The UI section that manages a list of user tasks with add, edit, complete, and delete operations.
- **Quick_Links**: The UI section that displays and manages user-defined shortcut buttons to external URLs.
- **Storage**: The browser's Local Storage API used to persist all user data.
- **Task**: A single item in the Todo_List with a text description and a completion status.
- **Link**: A single item in the Quick_Links section with a display label and a URL.
- **Session**: A single 25-minute Focus_Timer countdown cycle.

---

## Requirements

### Requirement 1: Greeting Widget — Time and Date Display

**User Story:** As a user, I want to see the current time and date when I open the dashboard, so that I have immediate situational awareness without checking another app.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current time in HH:MM format (24-hour clock, zero-padded), updating every 1 second.
2. THE Greeting_Widget SHALL display the current day of the week and full date in the format "Day, DD Month YYYY" (e.g., "Saturday, 17 October 2026"), derived from the user's local system clock.
3. WHEN the user's local hour is between 05:00 and 11:59 inclusive, THE Greeting_Widget SHALL display the greeting text "Good Morning".
4. WHEN the user's local hour is between 12:00 and 17:59 inclusive, THE Greeting_Widget SHALL display the greeting text "Good Afternoon".
5. WHEN the user's local hour is between 18:00 and 20:59 inclusive, THE Greeting_Widget SHALL display the greeting text "Good Evening".
6. WHEN the user's local hour is between 21:00 and 23:59 inclusive, OR between 00:00 and 04:59 inclusive, THE Greeting_Widget SHALL display the greeting text "Good Night".
7. WHEN the Greeting_Widget is first rendered, THE Greeting_Widget SHALL immediately display the current time, date, and greeting without waiting for the first 1-second update interval to elapse.
8. IF the user's local system clock is inaccessible, THEN THE Greeting_Widget SHALL display a placeholder indicating time and date are unavailable, and SHALL NOT display a greeting message.

---

### Requirement 2: Focus Timer — Countdown Session

**User Story:** As a user, I want a 25-minute countdown timer I can start, stop, and reset, so that I can time focused work sessions without leaving the dashboard.

#### Acceptance Criteria

1. THE Focus_Timer SHALL initialize with a countdown value of 25 minutes and 00 seconds (25:00) on first load.
2. WHEN the user activates the Start control, THE Focus_Timer SHALL begin decrementing the countdown by one second each second.
3. WHILE a Session is running, THE Focus_Timer SHALL display the remaining time in MM:SS format.
4. WHEN the user activates the Stop control, THE Focus_Timer SHALL pause the countdown at the current remaining time.
5. WHEN the user activates the Reset control, THE Focus_Timer SHALL stop the countdown and restore the display to 25:00.
6. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically and display in a visually distinct completion state that differs from the active countdown, persisting until Reset is activated.
7. WHILE a Session is running, THE Focus_Timer SHALL disable the Start control and enable the Stop control to prevent duplicate timers.
8. WHEN the Focus_Timer is in idle or stopped state with remaining time greater than 00:00, THE Focus_Timer SHALL enable the Start control and disable the Stop control.

---

### Requirement 3: To-Do List — Task Management

**User Story:** As a user, I want to add, edit, complete, and delete tasks in a to-do list that persists across browser sessions, so that I can track my daily work from the dashboard.

#### Acceptance Criteria

1. WHEN the user submits a non-empty text input of up to 500 characters, THE Todo_List SHALL add a new Task with the provided text and a completion status of false.
2. IF the user submits an empty text input, THEN THE Todo_List SHALL reject the submission and keep the input field focused.
3. WHEN the page loads, THE Todo_List SHALL render all stored Tasks by reading from Storage.
4. WHEN the user activates the complete toggle on a Task, THE Todo_List SHALL update the Task's completion status to true and apply a strikethrough text decoration with reduced opacity as the completed visual style.
5. WHEN the user activates the complete toggle on an already-completed Task, THE Todo_List SHALL update the Task's completion status to false and remove the strikethrough and reduced opacity visual style.
6. WHEN the user activates the edit control on a Task, THE Todo_List SHALL replace the Task's text display with an editable input field pre-filled with the current Task text.
7. WHEN the user confirms an edit with non-empty text of up to 500 characters, THE Todo_List SHALL save the updated text and restore the Task to display mode.
8. IF the user confirms an edit with empty text, THEN THE Todo_List SHALL reject the update and keep the Task text unchanged.
9. WHEN the user activates the delete control on a Task, THE Todo_List SHALL remove the Task from the list and from Storage.
10. WHEN any Task is added, updated, or deleted, THE Todo_List SHALL write the full updated task array to Storage.
11. WHEN the user activates a cancel control or presses the Escape key during edit mode, THE Todo_List SHALL discard the edit and restore the Task to display mode with the original text unchanged.

---

### Requirement 4: Quick Links — Favorite Website Shortcuts

**User Story:** As a user, I want to add and manage shortcut buttons for my favorite websites that persist across sessions, so that I can open them quickly from the dashboard.

#### Acceptance Criteria

1. WHEN the user submits a Link label and a valid URL, THE Quick_Links SHALL add a new button displaying the label, append the Link to the displayed list without removing existing Links, and store the updated links array to Storage.
2. IF the user submits a Link with an empty label or an empty URL, THEN THE Quick_Links SHALL reject the submission, retain the entered values in the input fields, and display an inline validation message adjacent to the invalid field within 100ms.
3. IF the user submits a Link with a URL that does not begin with "http://" or "https://", THEN THE Quick_Links SHALL reject the submission and display an inline validation message indicating the URL format is invalid.
4. WHEN the page loads, THE Quick_Links SHALL render all stored Links as clickable buttons by reading from Storage within 500ms, displaying them in the order they were added.
5. WHEN the user activates a Link button, THE Quick_Links SHALL open the associated URL in a new browser tab without navigating away from the dashboard.
6. WHEN the user activates the delete control on a Link, THE Quick_Links SHALL remove the Link button from the display and from Storage, and the remaining Link buttons SHALL remain unchanged.
7. WHEN any Link is added or deleted, THE Quick_Links SHALL write the full updated links array to Storage before the next user interaction is accepted.

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my tasks and quick links to be saved automatically, so that my data is available the next time I open the dashboard.

#### Acceptance Criteria

1. THE Storage SHALL use the key `pd_tasks` to store the serialized Task array.
2. THE Storage SHALL use the key `pd_links` to store the serialized Link array.
3. WHEN the Dashboard initializes, THE Storage SHALL be read to restore all Tasks and Links before rendering.
4. IF Storage contains no data for `pd_tasks`, THEN THE Todo_List SHALL initialize with an empty task array.
5. IF Storage contains no data for `pd_links`, THEN THE Quick_Links SHALL initialize with an empty links array.
6. IF Storage read operation fails during Dashboard initialization, THEN THE Dashboard SHALL initialize with empty task and links arrays and display an error message indicating data could not be loaded.
7. WHEN a Task is added, edited, or deleted, THE Storage SHALL write the updated Task array to the key `pd_tasks` before the next user interaction is accepted.
8. WHEN a Link is added, edited, or deleted, THE Storage SHALL write the updated Links array to the key `pd_links` before the next user interaction is accepted.
9. IF Storage contains data for `pd_tasks` or `pd_links` that cannot be deserialized into a valid Task or Link array, THEN THE Dashboard SHALL discard the corrupted data, initialize the affected list with an empty array, and display an error message indicating data could not be loaded.

---

### Requirement 6: Layout and Responsive Design

**User Story:** As a user, I want the dashboard to be clean and readable on different screen sizes, so that I can use it comfortably on both desktop and smaller displays.

#### Acceptance Criteria

1. THE Dashboard SHALL arrange the four widgets in a grid layout of 2 to 4 columns on screens 768px wide and above.
2. WHEN the viewport width is below 768px, THE Dashboard SHALL stack the widgets in a single column at 100% width.
3. THE Dashboard SHALL constrain each widget to a minimum height of 100px and a maximum height of 600px.
4. THE Dashboard SHALL use a single CSS file for all visual styling, with no inline styles or additional external stylesheets.
5. THE Dashboard SHALL use a single JavaScript file for all application logic, with no additional external scripts.
6. THE Dashboard SHALL load and render all visible widget content within 1 second, measured from the browser load event to all four widgets being visible and interactive.
7. IF a widget fails to render within the time budget, THEN THE Dashboard SHALL display a fallback placeholder in that widget's position and log an error to the browser console.

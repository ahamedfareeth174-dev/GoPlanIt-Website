const calendarSummary = document.getElementById('calendarSummary');
const calendarView = document.getElementById('calendarView');
const reloadCalendar = document.getElementById('reloadCalendar');
const clearTimeline = document.getElementById('clearTimeline');
const taskModal = document.getElementById('taskModal');
const dayTasksModal = document.getElementById('dayTasksModal');
const closeDayTasksModal = document.getElementById('closeDayTasksModal');
const doneDayTasksModal = document.getElementById('doneDayTasksModal');
const addTaskFromDayModal = document.getElementById('addTaskFromDayModal');
const dayTasksTitle = document.getElementById('dayTasksTitle');
const dayTasksList = document.getElementById('dayTasksList');
const closeTaskModal = document.getElementById('closeTaskModal');
const cancelTaskModal = document.getElementById('cancelTaskModal');
const wizardBack = document.getElementById('wizardBack');
const wizardNext = document.getElementById('wizardNext');
const wizardSubmit = document.getElementById('wizardSubmit');
const wizardProgressText = document.getElementById('wizardProgressText');
const wizardProgressBar = document.getElementById('wizardProgressBar');
const taskModalTitle = document.getElementById('taskModalTitle');
const assignmentDueDateText = document.getElementById('assignmentDueDateText');
const calendarMonth = document.getElementById('calendarMonth');
const calendarYear = document.getElementById('calendarYear');
const calendarDay = document.getElementById('calendarDay');
const calendarStart = document.getElementById('calendarStart');
const calendarEnd = document.getElementById('calendarEnd');
const calendarTaskForm = document.getElementById('calendarTaskForm');
const calendarTaskText = document.getElementById('calendarTaskText');
const calendarTaskNotes = document.getElementById('calendarTaskNotes');
const calendarTaskType = document.getElementById('calendarTaskType');
const calendarTaskCategory = document.getElementById('calendarTaskCategory');
const calendarTaskDueDate = document.getElementById('calendarTaskDueDate');
const calendarTaskPriority = document.getElementById('calendarTaskPriority');
const calendarTaskDay = document.getElementById('calendarTaskDay');
const calendarTaskTime = document.getElementById('calendarTaskTime');
const calendarTaskHours = document.getElementById('calendarTaskHours');
const STORAGE_KEY = 'goplanitTasks';
const SETTINGS_KEY = 'goplanitCalendarSettings';
const SESSION_KEY = 'goplanitSession';
const PROFILE_KEY = 'goplanitProfile';
let wizardStepIndex = 0;
let activeModalDate = '';
let activeModalDay = '';
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const plannerDayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

function getSession() {
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  const session = JSON.parse(stored);
  if (session.expiresAt && session.expiresAt < Date.now()) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  return session;
}

function userKey(baseKey) {
  const session = getSession();
  const id = session && session.email ? session.email : 'guest';
  return `${baseKey}:${id}`;
}

function loadJson(key, fallback) {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : fallback;
}

function applyProfileTheme() {
  const profile = loadJson(userKey(PROFILE_KEY), {
    banner: 'aurora',
    accent: '#22c55e',
    background: '#09121d'
  });
  document.body.dataset.banner = profile.banner;
  document.documentElement.style.setProperty('--accent', profile.accent);
  document.documentElement.style.setProperty('--accent-strong', profile.accent);
  document.documentElement.style.setProperty('--custom-bg', profile.background);
}

function loadTasks() {
  const stored = localStorage.getItem(userKey(STORAGE_KEY));
  const tasks = stored ? JSON.parse(stored) : [];
  const cleanTasks = tasks.map(sanitizeTask);
  if (stored) saveTasks(cleanTasks);
  return cleanTasks;
}

function loadSettings() {
  const now = new Date();
  const selectedDate = toDateKey(now);
  const defaults = {
    day: dayNames[now.getDay()],
    month: now.getMonth(),
    year: now.getFullYear(),
    selectedDate,
    start: '08:00',
    end: '18:00'
  };
  const stored = localStorage.getItem(userKey(SETTINGS_KEY));
  return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
}

function saveSettings(settings) {
  localStorage.setItem(userKey(SETTINGS_KEY), JSON.stringify(settings));
}

function saveTasks(tasks) {
  localStorage.setItem(userKey(STORAGE_KEY), JSON.stringify(tasks));
}

function clearSavedTimeline() {
  const tasks = loadTasks();
  if (!tasks.length) {
    showToast('Your timeline is already clear.');
    renderCalendar();
    return;
  }

  const confirmed = window.confirm('Are you sure you want to clear the full timeline? This removes all saved planner tasks.');
  if (!confirmed) return;

  saveTasks([]);
  renderCalendar();
  showToast('Timeline cleared.');
}

function openTaskModal(dateKey, day) {
  calendarDay.value = day;
  calendarTaskDay.value = day;
  calendarTaskDueDate.value = dateKey;
  taskModal.hidden = false;
  resetTaskWizard(dateKey, day);
}

function closeModal() {
  taskModal.hidden = true;
}

function closeDayModal() {
  dayTasksModal.hidden = true;
}

function getTaskMeta(task) {
  const parts = [getCategoryLabel(task), task.priority || 'medium'];
  if (task.startTime) parts.push(task.startTime);
  if (task.hours) parts.push(`${Number(task.hours).toFixed(2)} hrs`);
  return parts.join(' | ');
}

function openDayTasksModal(dateKey, day) {
  activeModalDate = dateKey;
  activeModalDay = day;
  calendarDay.value = day;
  calendarTaskDay.value = day;
  calendarTaskDueDate.value = dateKey;
  renderDayTasksModal();
  dayTasksModal.hidden = false;
}

function renderDayTasksModal() {
  const tasks = getTasksForDate(loadTasks(), activeModalDate, activeModalDay);
  dayTasksTitle.textContent = `${activeModalDate} tasks`;

  if (!tasks.length) {
    dayTasksList.innerHTML = `
      <div class="empty-state compact">
        <strong>No tasks on this day</strong>
        <p>Add an assignment, exam, reminder, or task for ${escapeHtml(activeModalDate)}.</p>
      </div>
    `;
    return;
  }

  dayTasksList.innerHTML = tasks.map((task) => `
    <article class="day-task-card ${task.completed ? 'completed' : ''}">
      <div class="day-task-main">
        <span>${escapeHtml(getTaskMeta(task))}</span>
        <strong>${escapeHtml(task.text)}</strong>
        ${task.notes ? `<p>${escapeHtml(task.notes)}</p>` : ''}
        <div class="calendar-task-edit day-task-edit">
          <label>
            Task
            <input class="calendar-task-input" data-field="text" data-id="${task.id}" type="text" value="${escapeHtml(task.text)}" />
          </label>
          <label>
            Category
            <select class="calendar-task-input" data-field="category" data-id="${task.id}">
              ${getCategoryOptions(task.category || 'task')}
            </select>
          </label>
          <label>
            Type
            <select class="calendar-task-input" data-field="type" data-id="${task.id}">
              ${getTypeOptions(task.type || 'daily')}
            </select>
          </label>
          <label>
            Due date
            <input class="calendar-task-input" data-field="dueDate" data-id="${task.id}" type="date" value="${task.dueDate || activeModalDate}" />
          </label>
          <label>
            Day
            <select class="calendar-task-input" data-field="day" data-id="${task.id}">
              ${getDayOptions(task.day || activeModalDay)}
            </select>
          </label>
          <label>
            Priority
            <select class="calendar-task-input" data-field="priority" data-id="${task.id}">
              ${getPriorityOptions(task.priority || 'medium')}
            </select>
          </label>
          <label>
            Start
            <input class="calendar-task-input" data-field="startTime" data-id="${task.id}" type="time" value="${task.startTime || ''}" />
          </label>
          <label>
            Hrs
            <input class="calendar-task-input" data-field="hours" data-id="${task.id}" type="number" min="0.25" step="0.25" value="${Number(task.hours || 1).toFixed(2)}" />
          </label>
          <label class="calendar-notes-field">
            Brief notes
            <textarea class="calendar-task-input" data-field="notes" data-id="${task.id}" rows="3" placeholder="Add brief notes...">${escapeHtml(task.notes || '')}</textarea>
          </label>
        </div>
      </div>
      <div class="day-task-actions">
        <button class="btn btn-secondary" type="button" data-day-action="toggle" data-id="${task.id}">
          ${task.completed ? 'Reopen' : 'Done'}
        </button>
        <button class="action-btn" type="button" data-day-action="delete" data-id="${task.id}" title="Delete task">x</button>
      </div>
    </article>
  `).join('');
}

function getWizardSteps() {
  const category = calendarTaskCategory.value;
  if (category === 'assignment') {
    return ['category', 'text', 'due-confirm', 'priority', 'hours'];
  }
  if (category === 'exam') {
    return ['category', 'text', 'priority'];
  }
  if (category === 'reminder') {
    return ['category', 'notes'];
  }
  return ['category', 'text', 'type', 'priority', 'time', 'hours'];
}

function getWizardTitle(step) {
  const category = calendarTaskCategory.value;
  if (step === 'category') return 'What are you adding?';
  if (step === 'text' && category === 'assignment') return 'What homework is due?';
  if (step === 'text' && category === 'exam') return 'What exam is this?';
  if (step === 'text') return 'What is the task?';
  if (step === 'notes') return 'Write a quick reminder note';
  if (step === 'due-confirm') return 'Confirm the due date';
  if (step === 'type') return 'Is this daily or weekly?';
  if (step === 'priority') return 'How important is it?';
  if (step === 'time') return 'When should it start?';
  if (step === 'hours') return 'How long will it take?';
  return 'Add item';
}

function renderWizardStep() {
  const steps = getWizardSteps();
  if (wizardStepIndex >= steps.length) wizardStepIndex = steps.length - 1;

  document.querySelectorAll('.wizard-step').forEach((step) => {
    const isActive = step.dataset.step === steps[wizardStepIndex];
    step.hidden = !isActive;
    step.querySelectorAll('input, select, textarea').forEach((control) => {
      control.disabled = !isActive;
    });
  });

  const isFirst = wizardStepIndex === 0;
  const isLast = wizardStepIndex === steps.length - 1;
  const activeStep = steps[wizardStepIndex];
  wizardBack.hidden = isFirst;
  wizardNext.hidden = isLast;
  wizardSubmit.hidden = !isLast;
  taskModalTitle.textContent = getWizardTitle(activeStep);
  wizardProgressText.textContent = `Step ${wizardStepIndex + 1} of ${steps.length}`;
  wizardProgressBar.style.width = `${((wizardStepIndex + 1) / steps.length) * 100}%`;

  const activeInput = document.querySelector(`.wizard-step[data-step="${activeStep}"] input, .wizard-step[data-step="${activeStep}"] select, .wizard-step[data-step="${activeStep}"] textarea`);
  if (activeInput) activeInput.focus();
  if (assignmentDueDateText) {
    assignmentDueDateText.textContent = `This homework is due on ${calendarTaskDueDate.value}.`;
  }
}

function resetTaskWizard(dateKey = calendarTaskDueDate.value, day = calendarTaskDay.value) {
  wizardStepIndex = 0;
  calendarTaskText.value = '';
  calendarTaskNotes.value = '';
  calendarTaskType.value = 'daily';
  calendarTaskCategory.value = 'reminder';
  calendarTaskDueDate.value = dateKey;
  calendarTaskDay.value = day;
  calendarTaskPriority.value = 'medium';
  calendarTaskHours.value = '1';
  calendarTaskTime.value = '08:00';
  renderWizardStep();
}

function validateWizardStep() {
  const step = getWizardSteps()[wizardStepIndex];
  if (step === 'text' && !calendarTaskText.value.trim()) {
    calendarTaskText.reportValidity();
    return false;
  }
  if (step === 'notes' && !calendarTaskNotes.value.trim()) {
    calendarTaskNotes.focus();
    return false;
  }
  if (step === 'hours' && (!Number(calendarTaskHours.value) || Number(calendarTaskHours.value) <= 0)) {
    calendarTaskHours.reportValidity();
    return false;
  }
  return true;
}

function nextWizardStep() {
  if (!validateWizardStep()) return;
  const steps = getWizardSteps();
  wizardStepIndex = Math.min(wizardStepIndex + 1, steps.length - 1);
  renderWizardStep();
}

function previousWizardStep() {
  wizardStepIndex = Math.max(0, wizardStepIndex - 1);
  renderWizardStep();
}

function parseTime(time) {
  if (!time) return null;
  const [hour, minute] = time.split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour + minute / 60;
}

function formatHour(value) {
  const hour = Math.floor(value);
  const minutes = Math.round((value - hour) * 60);
  const paddedMinutes = String(minutes).padStart(2, '0');
  return `${String(hour).padStart(2, '0')}:${paddedMinutes}`;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDayFromDateKey(dateKey) {
  if (!dateKey) return calendarDay.value;
  const [year, month, day] = dateKey.split('-').map(Number);
  return dayNames[new Date(year, month - 1, day).getDay()];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function sanitizePlainText(value, limit = 1000) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .slice(0, limit);
}

function sanitizeEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function sanitizeDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? value : '';
}

function sanitizeTime(value, fallback = '') {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || '')) ? value : fallback;
}

function sanitizeTask(task) {
  task = task && typeof task === 'object' ? task : {};
  const dueDate = sanitizeDateKey(task.dueDate);
  return {
    id: sanitizePlainText(task.id, 80) || Date.now().toString() + Math.random().toString(16).slice(2),
    text: sanitizePlainText(task.text, 180) || 'Imported task',
    notes: sanitizePlainText(task.notes, 800),
    type: sanitizeEnum(task.type, ['daily', 'weekly'], 'daily'),
    category: sanitizeEnum(task.category, ['assignment', 'exam', 'reminder', 'task'], 'task'),
    dueDate,
    priority: sanitizeEnum(task.priority, ['high', 'medium', 'low'], 'medium'),
    day: dueDate ? getDayFromDateKey(dueDate) : sanitizeEnum(task.day, plannerDayNames, 'Mon'),
    startTime: sanitizeTime(task.startTime, ''),
    hours: Math.max(0.25, Math.min(24, Number(task.hours) || 1)),
    completed: Boolean(task.completed),
    created: sanitizePlainText(task.created, 40) || new Date().toISOString()
  };
}

function getDayOptions(selectedDay) {
  return plannerDayNames
    .map((day) => `<option value="${day}" ${selectedDay === day ? 'selected' : ''}>${day}</option>`)
    .join('');
}

function getPriorityOptions(selectedPriority) {
  return ['high', 'medium', 'low']
    .map((priority) => `<option value="${priority}" ${selectedPriority === priority ? 'selected' : ''}>${priority}</option>`)
    .join('');
}

function getTypeOptions(selectedType) {
  return ['daily', 'weekly']
    .map((type) => `<option value="${type}" ${selectedType === type ? 'selected' : ''}>${type}</option>`)
    .join('');
}

function getCategoryOptions(selectedCategory) {
  const categories = [
    ['assignment', 'Assignment'],
    ['exam', 'Exam'],
    ['reminder', 'Basic reminder'],
    ['task', 'Task']
  ];
  return categories
    .map(([value, label]) => `<option value="${value}" ${selectedCategory === value ? 'selected' : ''}>${label}</option>`)
    .join('');
}

function getCategoryLabel(task) {
  return {
    assignment: 'Assignment',
    exam: 'Exam',
    reminder: 'Reminder',
    task: 'Task'
  }[task.category] || 'Task';
}

function getTaskDotClass(task) {
  if (task.completed) return 'completed';
  if (task.category === 'exam' || task.priority === 'high') return 'exam';
  if (task.category === 'assignment') return 'assignment';
  if (task.category === 'reminder') return 'reminder';
  return 'task';
}

function renderDateDots(dayTasks) {
  const dotClasses = [...new Set(dayTasks.map(getTaskDotClass))].slice(0, 4);
  if (!dotClasses.length) return '';
  return `<div class="date-dots">${dotClasses.map((dotClass) => `<span class="date-dot ${dotClass}"></span>`).join('')}</div>`;
}

function showToast(message) {
  let stack = document.getElementById('toastStack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toastStack';
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  stack.appendChild(toast);
  window.setTimeout(() => {
    toast.classList.add('leaving');
    window.setTimeout(() => toast.remove(), 220);
  }, 2600);
}

function renderTaskSlot(slot) {
  const safeText = escapeHtml(slot.task.text);
  const timeLabel = ['assignment', 'exam', 'reminder'].includes(slot.task.category)
    ? 'Dated'
    : `${formatHour(slot.start)} - ${formatHour(slot.end)}`;
  const row = document.createElement('div');
  row.className = `timeline-slot calendar-task-slot ${slot.task.completed ? 'completed' : ''}`;
  row.innerHTML = `
    <button class="timeline-check" data-action="toggle" data-id="${slot.task.id}" title="Mark completed">✓</button>
    <strong>${timeLabel} | ${escapeHtml(getCategoryLabel(slot.task))}: ${safeText}</strong>
    <span>${escapeHtml(slot.task.priority)} · ${slot.hours.toFixed(2)} hrs</span>
    ${slot.task.notes ? `<span>${escapeHtml(slot.task.notes)}</span>` : ''}
    <div class="calendar-task-edit">
      <label>
        Task
        <input class="calendar-task-input" data-field="text" data-id="${slot.task.id}" type="text" value="${safeText}" />
      </label>
      <label>
        Type
        <select class="calendar-task-input" data-field="type" data-id="${slot.task.id}">
          ${getTypeOptions(slot.task.type || 'daily')}
        </select>
      </label>
      <label>
        Category
        <select class="calendar-task-input" data-field="category" data-id="${slot.task.id}">
          ${getCategoryOptions(slot.task.category || 'task')}
        </select>
      </label>
          <label>
        Due date
        <input class="calendar-task-input" data-field="dueDate" data-id="${slot.task.id}" type="date" value="${slot.task.dueDate || ''}" />
      </label>
      <label>
        Day
        <select class="calendar-task-input" data-field="day" data-id="${slot.task.id}">
          ${getDayOptions(slot.task.day || 'Mon')}
        </select>
      </label>
      <label>
        Priority
        <select class="calendar-task-input" data-field="priority" data-id="${slot.task.id}">
          ${getPriorityOptions(slot.task.priority || 'medium')}
        </select>
      </label>
      <label>
        Start
        <input class="calendar-task-input" data-field="startTime" data-id="${slot.task.id}" type="time" value="${slot.task.startTime || '08:00'}" />
      </label>
      <label>
        Hrs
        <input class="calendar-task-input" data-field="hours" data-id="${slot.task.id}" type="number" min="0.25" step="0.25" value="${Number(slot.task.hours || 1).toFixed(2)}" />
      </label>
      <label class="calendar-notes-field">
        Brief notes
        <textarea class="calendar-task-input" data-field="notes" data-id="${slot.task.id}" rows="3" placeholder="Add brief notes...">${escapeHtml(slot.task.notes || '')}</textarea>
      </label>
      <button class="action-btn" data-action="delete" data-id="${slot.task.id}" title="Delete task">✕</button>
    </div>
  `;
  return row;
}

function getTasksForPlannerDay(tasks, day) {
  return tasks.filter((task) => (task.day || 'Mon') === day);
}

function getTasksForDate(tasks, dateKey, fallbackDay) {
  return tasks.filter((task) => {
    if (task.dueDate) return task.dueDate === dateKey;
    return (task.day || 'Mon') === fallbackDay;
  });
}

function getSchedule(tasks, view, selectedDay, startTime, endTime) {
  const startHour = parseTime(startTime) ?? 8;
  const endHour = parseTime(endTime) ?? 18;
  const workHours = Math.max(0, endHour - startHour);

  const activeTasks = tasks.map((task) => ({
    ...task,
    hours: Math.max(0.25, Number(task.hours) || 1),
    day: task.day || 'Mon',
    startTime: task.startTime || ''
  })).sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });

  if (view === 'daily') {
    const dailyTasks = getTasksForPlannerDay(activeTasks, selectedDay);
    const schedule = [];
    const overflow = [];
    let cursor = startHour;

    dailyTasks.forEach((task) => {
      const requested = parseTime(task.startTime);
      if (requested !== null) {
        schedule.push({ task, start: requested, end: requested + task.hours, hours: task.hours });
        cursor = Math.max(cursor, requested + task.hours);
        return;
      }

      const assigned = Math.min(task.hours, Math.max(0, endHour - cursor));
      if (assigned <= 0) {
        overflow.push(task);
        return;
      }
      schedule.push({ task, start: cursor, end: cursor + assigned, hours: assigned });
      cursor += assigned;
      if (assigned < task.hours) {
        overflow.push({ ...task, hours: task.hours - assigned });
      }
    });

    schedule.sort((a, b) => a.start - b.start);
    return { type: 'daily', schedule, overflow, startHour, endHour };
  }

  const weekSchedule = plannerDayNames.map((label) => ({ label, blocks: [], cursor: startHour, remaining: workHours }));
  const overflow = [];

  activeTasks.forEach((task) => {
    const dayIndex = Math.max(0, plannerDayNames.indexOf(task.day));
    const day = weekSchedule[dayIndex];
    const requested = parseTime(task.startTime);

    if (requested !== null) {
      day.blocks.push({ task, start: requested, end: requested + task.hours, hours: task.hours });
      return;
    }

    const assigned = Math.min(task.hours, day.remaining);
    if (assigned <= 0) {
      overflow.push(task);
      return;
    }

    day.blocks.push({ task, start: day.cursor, end: day.cursor + assigned, hours: assigned });
    day.cursor += assigned;
    day.remaining -= assigned;
    if (assigned < task.hours) {
      overflow.push({ ...task, hours: task.hours - assigned });
    }
  });

  weekSchedule.forEach((day) => {
    day.blocks.sort((a, b) => a.start - b.start);
    delete day.cursor;
    delete day.remaining;
  });

  return { type: 'weekly', schedule: weekSchedule, overflow, startHour, endHour };
}

function renderCalendar() {
  const tasks = loadTasks();
  const settings = loadSettings();
  if (settings.selectedDate) {
    settings.day = getDayFromDateKey(settings.selectedDate);
  }
  calendarDay.value = settings.day;
  calendarTaskDay.value = settings.day;
  calendarTaskDueDate.value = settings.selectedDate;
  calendarMonth.value = String(settings.month);
  calendarYear.value = settings.year;
  calendarStart.value = settings.start;
  calendarEnd.value = settings.end;

  const selectedDate = settings.selectedDate || toDateKey(new Date(Number(settings.year), Number(settings.month), 1));
  settings.selectedDate = selectedDate;
  const dateTasks = getTasksForDate(tasks, selectedDate, settings.day);
  const calendar = getSchedule(dateTasks.map((task) => ({ ...task, day: settings.day })), 'daily', settings.day, settings.start, settings.end);
  const totalHours = tasks.reduce((sum, task) => sum + (Number(task.hours) || 1), 0);

  calendarSummary.innerHTML = `
    <span><strong>Mode:</strong> Monthly</span>
    <span><strong>Calendar:</strong> ${monthNames[settings.month]} ${settings.year}</span>
    <span><strong>Selected:</strong> ${selectedDate}</span>
    <span><strong>Total estimated:</strong> ${totalHours.toFixed(2)} hrs</span>
  `;

  calendarView.innerHTML = '';
  renderMonthCalendar(tasks, settings);

  if (calendar.overflow.length) {
    const warning = document.createElement('div');
    warning.className = 'timeline-overflow';
    warning.textContent = `Overflow: ${calendar.overflow.length} task(s) exceed the calendar capacity. Adjust hours, start/end times, or schedule day assignments.`;
    calendarView.appendChild(warning);
  }
}

function renderMonthCalendar(tasks, settings) {
  const year = Number(settings.year);
  const month = Number(settings.month);
  const today = new Date();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstDay.getDay();

  const monthGrid = document.createElement('div');
  monthGrid.className = 'month-calendar-grid';

  dayNames.forEach((day) => {
    const label = document.createElement('div');
    label.className = 'month-weekday';
    label.textContent = day;
    monthGrid.appendChild(label);
  });

  for (let blank = 0; blank < leadingBlanks; blank += 1) {
    const empty = document.createElement('div');
    empty.className = 'month-date empty';
    monthGrid.appendChild(empty);
  }

  for (let dateNumber = 1; dateNumber <= daysInMonth; dateNumber += 1) {
    const date = new Date(year, month, dateNumber);
    const dateKey = toDateKey(date);
    const plannerDay = dayNames[date.getDay()];
    const dayTasks = getTasksForDate(tasks, dateKey, plannerDay);
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'month-date';
    cell.dataset.action = 'show-date';
    cell.dataset.day = plannerDay;
    cell.dataset.date = dateKey;
    cell.classList.toggle(
      'today',
      date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
    );

    cell.innerHTML = `
      <strong>${dateNumber}</strong>
      <span>${plannerDay}</span>
      <small>${dayTasks.length ? `${dayTasks.length} task${dayTasks.length === 1 ? '' : 's'}` : 'Free'}</small>
      ${renderDateDots(dayTasks)}
      ${dayTasks.slice(0, 3).map((task) => `<em>${escapeHtml(getCategoryLabel(task))}: ${escapeHtml(task.text)}</em>`).join('')}
    `;
    monthGrid.appendChild(cell);
  }

  calendarView.appendChild(monthGrid);
}

function addCalendarTask(event) {
  event.preventDefault();
  const steps = getWizardSteps();
  if (wizardStepIndex !== steps.length - 1) {
    nextWizardStep();
    return;
  }
  const isReminder = calendarTaskCategory.value === 'reminder';
  const text = sanitizePlainText(isReminder ? calendarTaskNotes.value : calendarTaskText.value, 180).trim();
  if (!text) return;
  if (calendarTaskCategory.value !== 'task' && !calendarTaskDueDate.value) {
    return;
  }

  const tasks = loadTasks();
  const isUntimedDateItem = ['assignment', 'exam', 'reminder'].includes(calendarTaskCategory.value);
  const isDateBased = calendarTaskCategory.value !== 'task';
  const dueDate = isDateBased ? calendarTaskDueDate.value : '';
  const newTask = {
    id: Date.now().toString(),
    text,
    notes: isReminder ? text : sanitizePlainText(calendarTaskNotes.value, 800),
    type: isReminder ? 'daily' : calendarTaskType.value,
    category: calendarTaskCategory.value,
    dueDate,
    priority: isReminder ? 'medium' : calendarTaskPriority.value,
    day: dueDate ? getDayFromDateKey(dueDate) : calendarTaskDay.value,
    startTime: isUntimedDateItem ? '' : calendarTaskTime.value,
    hours: isReminder || calendarTaskCategory.value === 'exam' ? 0.25 : Number(calendarTaskHours.value) || 1,
    completed: false,
    created: new Date().toISOString()
  };

  saveTasks([...tasks, newTask]);
  calendarDay.value = newTask.day;
  if (newTask.dueDate) {
    const [year, month, day] = newTask.dueDate.split('-').map(Number);
    const dueDate = new Date(year, month - 1, day);
    calendarMonth.value = String(dueDate.getMonth());
    calendarYear.value = dueDate.getFullYear();
  }
  calendarTaskText.value = '';
  calendarTaskNotes.value = '';
  calendarTaskHours.value = '1';
  calendarTaskTime.value = '08:00';
  closeModal();
  handleCalendarUpdate();
  showToast(`${getCategoryLabel(newTask)} added to ${newTask.dueDate || newTask.day}.`);
}

function updateCalendarTask(target) {
  const id = target.dataset.id;
  const field = target.dataset.field;
  if (!id || !field) return;

  let value = target.value;
  if (field === 'text') {
    value = sanitizePlainText(value, 180).trim();
    if (!value) {
      renderCalendar();
      return;
    }
  }
  if (field === 'notes') value = sanitizePlainText(value, 800);
  if (field === 'type') value = sanitizeEnum(value, ['daily', 'weekly'], 'daily');
  if (field === 'category') value = sanitizeEnum(value, ['assignment', 'exam', 'reminder', 'task'], 'task');
  if (field === 'priority') value = sanitizeEnum(value, ['high', 'medium', 'low'], 'medium');
  if (field === 'day') value = sanitizeEnum(value, plannerDayNames, 'Mon');
  if (field === 'startTime') value = sanitizeTime(value, '');
  if (field === 'hours') {
    value = Number(value);
    if (Number.isNaN(value) || value <= 0) {
      renderCalendar();
      return;
    }
  }

  const tasks = loadTasks().map((task) => {
    if (task.id !== id) return task;
    if (field === 'dueDate' && value) {
      value = sanitizeDateKey(value);
      if (!value) return task;
      return { ...task, dueDate: value, day: getDayFromDateKey(value) };
    }
    return { ...task, [field]: value };
  });
  saveTasks(tasks);
  renderCalendar();
  if (dayTasksModal && !dayTasksModal.hidden) {
    renderDayTasksModal();
  }
  showToast('Reminder updated.');
}

function deleteCalendarTask(id) {
  const tasks = loadTasks();
  const selectedTask = tasks.find((task) => task.id === id);
  if (!selectedTask) return;

  const confirmed = window.confirm(`Delete "${selectedTask.text}" from the calendar?`);
  if (!confirmed) return;

  saveTasks(tasks.filter((task) => task.id !== id));
  renderCalendar();
  showToast('Reminder deleted.');
}

function toggleTaskCompletion(id) {
  const tasks = loadTasks();
  const selectedTask = tasks.find((task) => task.id === id);
  if (!selectedTask) return false;
  if (!selectedTask.completed && !window.confirm(`Are you sure you finished "${selectedTask.text}"?`)) {
    return false;
  }
  const updated = tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task);
  saveTasks(updated);
  renderCalendar();
  showToast(selectedTask.completed ? 'Marked open again.' : 'Marked complete.');
  return true;
}

function deleteTaskFromDayModal(id) {
  const tasks = loadTasks();
  const selectedTask = tasks.find((task) => task.id === id);
  if (!selectedTask) return;

  const confirmed = window.confirm(`Delete "${selectedTask.text}" from the calendar?`);
  if (!confirmed) return;

  saveTasks(tasks.filter((task) => task.id !== id));
  renderCalendar();
  renderDayTasksModal();
  showToast('Reminder deleted.');
}

function handleCalendarUpdate() {
  calendarTaskDay.value = calendarDay.value;
  let selectedDate = calendarTaskDueDate.value;
  const selectedMonth = Number(calendarMonth.value);
  const selectedYear = Number(calendarYear.value);
  if (!selectedDate) {
    selectedDate = toDateKey(new Date(selectedYear, selectedMonth, 1));
  } else {
    const [year, month] = selectedDate.split('-').map(Number);
    if (year !== selectedYear || month - 1 !== selectedMonth) {
      selectedDate = toDateKey(new Date(selectedYear, selectedMonth, 1));
      calendarTaskDueDate.value = selectedDate;
      calendarDay.value = getDayFromDateKey(selectedDate);
      calendarTaskDay.value = calendarDay.value;
    }
  }
  const settings = {
    day: calendarDay.value,
    month: selectedMonth,
    year: selectedYear,
    selectedDate,
    start: calendarStart.value,
    end: calendarEnd.value
  };
  saveSettings(settings);
  renderCalendar();
}

function initCalendar() {
  applyProfileTheme();
  renderCalendar();
  calendarTaskDay.value = calendarDay.value;
  reloadCalendar.addEventListener('click', renderCalendar);
  clearTimeline.addEventListener('click', clearSavedTimeline);
  calendarTaskForm.addEventListener('submit', addCalendarTask);
  closeTaskModal.addEventListener('click', closeModal);
  cancelTaskModal.addEventListener('click', closeModal);
  closeDayTasksModal.addEventListener('click', closeDayModal);
  doneDayTasksModal.addEventListener('click', closeDayModal);
  addTaskFromDayModal.addEventListener('click', () => {
    closeDayModal();
    openTaskModal(activeModalDate, activeModalDay);
  });
  wizardNext.addEventListener('click', nextWizardStep);
  wizardBack.addEventListener('click', previousWizardStep);
  calendarTaskCategory.addEventListener('change', () => {
    wizardStepIndex = 0;
    renderWizardStep();
  });
  taskModal.addEventListener('click', (event) => {
    if (event.target === taskModal) closeModal();
  });
  dayTasksModal.addEventListener('click', (event) => {
    if (event.target === dayTasksModal) closeDayModal();
  });
  calendarDay.addEventListener('change', handleCalendarUpdate);
  calendarMonth.addEventListener('change', handleCalendarUpdate);
  calendarYear.addEventListener('change', handleCalendarUpdate);
  calendarStart.addEventListener('change', handleCalendarUpdate);
  calendarEnd.addEventListener('change', handleCalendarUpdate);
  calendarView.addEventListener('click', handleCalendarClick);
  calendarView.addEventListener('change', handleCalendarTaskChange);
  dayTasksList.addEventListener('click', handleDayTasksClick);
  dayTasksList.addEventListener('change', handleCalendarTaskChange);
}

function handleDayTasksClick(event) {
  const button = event.target.closest('[data-day-action]');
  if (!button) return;
  const id = button.dataset.id;
  if (button.dataset.dayAction === 'toggle' && id) {
    const updated = toggleTaskCompletion(id);
    if (updated) renderDayTasksModal();
  }
  if (button.dataset.dayAction === 'delete' && id) {
    deleteTaskFromDayModal(id);
  }
}

function handleCalendarTaskChange(event) {
  const target = event.target;
  if (!target.classList.contains('calendar-task-input')) return;
  updateCalendarTask(target);
}

function handleCalendarClick(event) {
  const dateCell = event.target.closest('.month-date[data-action="show-date"]');
  if (dateCell) {
    calendarDay.value = dateCell.dataset.day;
    calendarTaskDay.value = dateCell.dataset.day;
    calendarTaskDueDate.value = dateCell.dataset.date;
    saveSettings({
      day: dateCell.dataset.day,
      month: Number(calendarMonth.value),
      year: Number(calendarYear.value),
      selectedDate: dateCell.dataset.date,
      start: calendarStart.value,
      end: calendarEnd.value
    });
    renderCalendar();
    openDayTasksModal(dateCell.dataset.date, dateCell.dataset.day);
    return;
  }

  const button = event.target.closest('button[data-action]');
  if (button) {
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (action === 'toggle' && id) {
      toggleTaskCompletion(id);
    }
    if (action === 'delete' && id) {
      deleteCalendarTask(id);
    }
    return;
  }

  const editControl = event.target.closest('.calendar-task-edit');
  if (editControl) return;
}

initCalendar();

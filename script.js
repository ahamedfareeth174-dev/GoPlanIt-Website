const todayLabel = document.getElementById('todayLabel');
const todayReminderList = document.getElementById('todayReminderList');
const dashboardWidgets = document.getElementById('dashboardWidgets');
const weekSummary = document.getElementById('weekSummary');
const weekReminderList = document.getElementById('weekReminderList');
const dashboardReminderModal = document.getElementById('dashboardReminderModal');
const closeDashboardReminderButton = document.getElementById('closeDashboardReminderModal');
const doneDashboardReminderModal = document.getElementById('doneDashboardReminderModal');
const dashboardReminderTitle = document.getElementById('dashboardReminderTitle');
const dashboardReminderEditor = document.getElementById('dashboardReminderEditor');
const plannerDay = document.getElementById('plannerDay');
const weeklyHourGoal = document.getElementById('weeklyHourGoal');
const showCompleted = document.getElementById('showCompleted');
const clearCompleted = document.getElementById('clearCompleted');
const motivationText = document.getElementById('motivationText');
const dashboardGreeting = document.getElementById('dashboardGreeting');
const profileAccountText = document.getElementById('profileAccountText');
const profileAvatar = document.getElementById('profileAvatar');
const profileBanner = document.getElementById('profileBanner');
const profileAccent = document.getElementById('profileAccent');
const profileBackground = document.getElementById('profileBackground');
const saveProfile = document.getElementById('saveProfile');
const logoutButton = document.getElementById('logoutButton');
const profileStatus = document.getElementById('profileStatus');
const bannerSwatches = document.getElementById('bannerSwatches');
const aiSuggestWeek = document.getElementById('aiSuggestWeek');
const aiResponse = document.getElementById('aiResponse');
const todayFocusCard = document.getElementById('todayFocusCard');
const exportPlannerData = document.getElementById('exportPlannerData');
const importPlannerData = document.getElementById('importPlannerData');
const importPlannerFile = document.getElementById('importPlannerFile');
const onboardingModal = document.getElementById('onboardingModal');
const onboardingForm = document.getElementById('onboardingForm');
const skipOnboarding = document.getElementById('skipOnboarding');
const onboardingGoal = document.getElementById('onboardingGoal');
const onboardingStudyTime = document.getElementById('onboardingStudyTime');
const onboardingWeeklyGoal = document.getElementById('onboardingWeeklyGoal');
const onboardingEmail = document.getElementById('onboardingEmail');
const onboardingPhone = document.getElementById('onboardingPhone');

const STORAGE_KEY = 'goplanitTasks';
const NOTES_KEY = 'goplanitNotes';
const SETTINGS_KEY = 'goplanitSettings';
const REMINDER_CONTACT_KEY = 'goplanitReminderContact';
const SESSION_KEY = 'goplanitSession';
const PROFILE_KEY = 'goplanitProfile';
const CALENDAR_SETTINGS_KEY = 'goplanitCalendarSettings';
const STUDY_SETTINGS_KEY = 'goplanitStudySettings';
const STUDY_MATERIALS_KEY = 'goplanitStudyMaterials';
const ONBOARDING_KEY = 'goplanitOnboarding';
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const plannerDayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const quoteOpeners = [
  'Small steps',
  'Focused effort',
  'One clear task',
  'Steady progress',
  'A calm start',
  'Your next choice',
  'Consistent work',
  'A prepared mind'
];
const quoteActions = [
  'turns a busy day into a finished one',
  'makes the hard part feel smaller',
  'builds the kind of momentum you can trust',
  'moves the week forward',
  'keeps your goals within reach',
  'creates room for better focus',
  'makes progress visible',
  'sets the tone for what comes next'
];
const quoteClosers = [
  'begin with the next reminder',
  'protect your attention for one task',
  'give yourself a clean first win',
  'let the schedule carry some of the weight',
  'make today easier to finish',
  'keep going before it feels perfect',
  'choose progress over pressure',
  'start where the path is clearest'
];
const BACKUP_ALLOWED_KEYS = new Set([
  STORAGE_KEY,
  NOTES_KEY,
  SETTINGS_KEY,
  REMINDER_CONTACT_KEY,
  PROFILE_KEY,
  CALENDAR_SETTINGS_KEY,
  STUDY_SETTINGS_KEY,
  STUDY_MATERIALS_KEY,
  ONBOARDING_KEY
]);
const MAX_BACKUP_BYTES = 1024 * 1024;

let tasks = [];
let session = null;
let activeReminderId = '';

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

function getFirstName() {
  return session && session.name ? session.name.split(' ')[0] : 'Planner';
}

function getInitials() {
  if (!session || !session.name) return 'GP';
  return session.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function generateMotivationalQuote() {
  const opener = quoteOpeners[Math.floor(Math.random() * quoteOpeners.length)];
  const action = quoteActions[Math.floor(Math.random() * quoteActions.length)];
  const closer = quoteClosers[Math.floor(Math.random() * quoteClosers.length)];

  return `${opener} ${action}; ${closer}.`;
}

function userKey(baseKey) {
  const id = session && session.email ? session.email : 'guest';
  return `${baseKey}:${id}`;
}

function loadJson(key, fallback) {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : fallback;
}

function loadState() {
  session = getSession();
  const settings = loadJson(userKey(SETTINGS_KEY), {});
  const today = dayNames[new Date().getDay()];

  tasks = loadJson(userKey(STORAGE_KEY), []).map(sanitizeImportedTask);
  localStorage.setItem(userKey(STORAGE_KEY), JSON.stringify(tasks));
  plannerDay.value = settings.plannerDay || today;
  weeklyHourGoal.value = settings.weeklyHourGoal || '20';
  showCompleted.checked = settings.showCompleted || false;
  dashboardGreeting.textContent = `Welcome back, ${getFirstName()}.`;
  if (profileAvatar) profileAvatar.textContent = getInitials();
  if (profileAccountText) {
    profileAccountText.textContent = session ? `${session.name} - ${session.email}` : 'Guest planner - log in for your own saved space.';
  }
  motivationText.textContent = generateMotivationalQuote();
  loadProfile();
}

function saveState() {
  localStorage.setItem(userKey(STORAGE_KEY), JSON.stringify(tasks));
  localStorage.setItem(userKey(SETTINGS_KEY), JSON.stringify({
    plannerDay: plannerDay.value,
    weeklyHourGoal: weeklyHourGoal.value,
    showCompleted: showCompleted.checked
  }));
}

function downloadFile(filename, type, content) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function loadProfile() {
  const profile = loadJson(userKey(PROFILE_KEY), {
    banner: 'aurora',
    accent: '#22c55e',
    background: '#09121d',
    mode: 'light'
  });
  if (profileBanner) profileBanner.value = profile.banner;
  if (profileAccent) profileAccent.value = profile.accent;
  if (profileBackground) profileBackground.value = profile.background;
  applyProfile(profile);
  setActiveBanner(profile.banner);
}

function applyProfile(profile) {
  document.body.dataset.banner = profile.banner;
  document.body.dataset.theme = profile.mode || 'light';
  document.documentElement.style.setProperty('--accent', profile.accent);
  document.documentElement.style.setProperty('--accent-strong', profile.accent);
  document.documentElement.style.setProperty('--custom-bg', profile.background);
}

function setActiveBanner(banner) {
  if (!bannerSwatches) return;
  bannerSwatches.querySelectorAll('.banner-swatch').forEach((button) => {
    button.classList.toggle('active', button.dataset.banner === banner);
  });
}

function handleProfileSave() {
  if (!profileBanner || !profileAccent || !profileBackground) return;
  const profile = {
    banner: profileBanner.value,
    accent: profileAccent.value,
    background: profileBackground.value,
    mode: document.body.dataset.theme || 'light'
  };
  localStorage.setItem(userKey(PROFILE_KEY), JSON.stringify(profile));
  applyProfile(profile);
  setActiveBanner(profile.banner);
  profileStatus.textContent = 'Profile saved for this account.';
  showToast('Profile saved.');
}

function handleBannerSwatchClick(event) {
  const button = event.target.closest('.banner-swatch');
  if (!button) return;
  profileBanner.value = button.dataset.banner;
  handleProfileSave();
}

function handleLogout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = 'portal.html';
}

function getWeeklyHourGoal() {
  const goal = Number(weeklyHourGoal.value);
  if (Number.isNaN(goal) || goal <= 0) return 20;
  return Math.min(70, Math.max(1, goal));
}

function sortTasks(items) {
  return [...items].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return (a.startTime || '23:59').localeCompare(b.startTime || '23:59');
  });
}

function formatTaskTime(task) {
  const time = task.startTime || '08:00';
  const hours = Number(task.hours || 1).toFixed(2);
  return `${time} · ${hours} hrs`;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCategoryLabel(task) {
  return {
    assignment: 'Assignment',
    exam: 'Exam',
    reminder: 'Reminder',
    task: 'Task'
  }[task.category] || 'Task';
}

function escapeHtml(value) {
  return String(value ?? '')
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

function sanitizeEmail(value) {
  const email = sanitizePlainText(value, 120).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function sanitizePhone(value) {
  return sanitizePlainText(value, 32).replace(/[^\d+]/g, '').slice(0, 20);
}

function sanitizeDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? value : '';
}

function sanitizeTime(value, fallback = '') {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || '')) ? value : fallback;
}

function getReminderContact() {
  return loadJson(userKey(REMINDER_CONTACT_KEY), {});
}

function buildReminderMessage(task) {
  const dateText = task.dueDate ? `Due: ${task.dueDate}` : `Day: ${task.day || 'Mon'}`;
  const timeText = task.startTime ? ` Time: ${task.startTime}.` : '';
  const notesText = task.notes ? ` Notes: ${task.notes}` : '';
  return `DueBoard reminder: ${getCategoryLabel(task)} - ${task.text}. ${dateText}.${timeText} Priority: ${task.priority || 'medium'}.${notesText}`;
}

function renderReminderSendLinks(task) {
  const contact = getReminderContact();
  const message = encodeURIComponent(buildReminderMessage(task));
  const subject = encodeURIComponent(`DueBoard reminder: ${task.text}`);
  const links = [];
  const email = sanitizeEmail(contact.email);
  const phone = sanitizePhone(contact.phone);

  if (email) {
    links.push(`<a class="reminder-send-link" href="mailto:${encodeURIComponent(email)}?subject=${subject}&body=${message}">Email reminder</a>`);
  }
  if (phone) {
    links.push(`<a class="reminder-send-link" href="sms:${encodeURIComponent(phone)}?&body=${message}">Text reminder</a>`);
  }

  if (!links.length) {
    return '<a class="reminder-send-link" href="portal.html">Add email/phone</a>';
  }
  return `<div class="reminder-send-actions">${links.join('')}</div>`;
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

function getPriorityClass(priority) {
  return `priority-${priority || 'medium'}`;
}

function getDayOptions(selectedDay) {
  return plannerDayNames
    .map((day) => `<option value="${day}" ${selectedDay === day ? 'selected' : ''}>${day}</option>`)
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
    ['reminder', 'Reminder'],
    ['task', 'Task']
  ];
  return categories
    .map(([value, label]) => `<option value="${value}" ${selectedCategory === value ? 'selected' : ''}>${label}</option>`)
    .join('');
}

function getPriorityOptions(selectedPriority) {
  return ['high', 'medium', 'low']
    .map((priority) => `<option value="${priority}" ${selectedPriority === priority ? 'selected' : ''}>${priority}</option>`)
    .join('');
}

function getVisibleTasks() {
  return showCompleted.checked ? tasks : tasks.filter((task) => !task.completed);
}

function getTasksForDay(day) {
  return sortTasks(getVisibleTasks().filter((task) => {
    if (task.dueDate) {
      const [year, month, date] = task.dueDate.split('-').map(Number);
      return dayNames[new Date(year, month - 1, date).getDay()] === day;
    }
    return (task.day || 'Mon') === day;
  }));
}

function getTasksForDate(dateKey) {
  return sortTasks(getVisibleTasks().filter((task) => task.dueDate === dateKey));
}

function getTasksForNextSevenDays() {
  const result = [];
  const today = new Date();
  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    const dateKey = toDateKey(date);
    const day = dayNames[date.getDay()];
    result.push({
      date,
      dateKey,
      day,
      tasks: sortTasks(getVisibleTasks().filter((task) => {
        if (task.dueDate) return task.dueDate === dateKey;
        return (task.day || 'Mon') === day;
      }))
    });
  }
  return result;
}

function renderTaskCard(task) {
  const card = document.createElement('article');
  card.className = `task-card ${task.completed ? 'completed' : ''}`;
  card.dataset.taskId = task.id;
  card.innerHTML = `
    <div>
      <div class="task-meta">
        <strong>${escapeHtml(task.text)}</strong>
        <span class="priority-chip">${getCategoryLabel(task)}</span>
        <span class="priority-chip ${getPriorityClass(task.priority)}">${task.priority}</span>
        <span class="hours-label">${task.type || 'daily'}</span>
        <span class="hours-label">${task.dueDate || task.day || 'Mon'}</span>
        <span class="hours-label">${formatTaskTime(task)}</span>
      </div>
      ${task.notes ? `<p class="task-notes">${escapeHtml(task.notes)}</p>` : ''}
      ${renderReminderSendLinks(task)}
    </div>
    <div class="task-actions">
      <button class="action-btn" data-action="toggle" data-id="${task.id}" title="Toggle completed">✓</button>
    </div>
  `;
  return card;
}

function renderTodayReminders() {
  const today = new Date();
  const todayKey = toDateKey(today);
  const selectedDay = plannerDay.value;
  const reminders = getTasksForDate(todayKey);
  const fallbackReminders = reminders.length ? reminders : getTasksForDay(selectedDay).filter((task) => !task.dueDate);
  todayLabel.textContent = `Showing reminders due today (${todayKey}). Click a reminder to edit it.`;
  todayReminderList.innerHTML = '';

  if (!fallbackReminders.length) {
    todayReminderList.innerHTML = `
      <div class="empty-state">
        <strong>No reminders due today</strong>
        <p>Your day is clear here. Add a reminder, assignment, exam, or task from the calendar when something comes up.</p>
        <div class="empty-actions">
          <a class="btn btn-secondary" href="calendar.html">Add from calendar</a>
          <button class="btn btn-secondary" type="button" data-action="sample-task">Add sample task</button>
        </div>
      </div>
    `;
    return;
  }

  fallbackReminders.forEach((task) => {
    todayReminderList.appendChild(renderTaskCard(task));
  });
}

function renderWeekReminders() {
  const visibleTasks = getVisibleTasks();
  const totalHours = visibleTasks.reduce((sum, task) => sum + (Number(task.hours) || 1), 0);
  weekSummary.innerHTML = `
    <span><strong>Open tasks:</strong> ${visibleTasks.length}</span>
    <span><strong>Estimated:</strong> ${totalHours.toFixed(2)} / ${getWeeklyHourGoal().toFixed(2)} hrs</span>
  `;

  const grid = document.createElement('div');
  grid.className = 'timeline-grid';
  getTasksForNextSevenDays().forEach((entry) => {
    const dayTasks = entry.tasks;
    const card = document.createElement('div');
    card.className = 'timeline-day';
    card.innerHTML = `<h3>${entry.day} ${entry.date.getMonth() + 1}/${entry.date.getDate()}</h3>`;

    if (!dayTasks.length) {
      card.innerHTML += '<div class="timeline-slot empty-mini"><span>No reminders</span></div>';
    } else {
      dayTasks.forEach((task) => {
        const slot = document.createElement('div');
        slot.className = `timeline-slot ${task.completed ? 'completed' : ''}`;
        slot.dataset.taskId = task.id;
        slot.innerHTML = `
          <button class="timeline-check" data-action="toggle" data-id="${task.id}" title="Mark completed">✓</button>
          <strong>${task.startTime || '08:00'} | ${getCategoryLabel(task)}: ${escapeHtml(task.text)}</strong>
          <span><span class="priority-chip ${getPriorityClass(task.priority)}">${task.priority}</span> ${task.dueDate || task.day || entry.day} · ${Number(task.hours || 1).toFixed(2)} hrs</span>
          ${task.notes ? `<span>${escapeHtml(task.notes)}</span>` : ''}
        `;
        card.appendChild(slot);
      });
    }
    grid.appendChild(card);
  });

  weekReminderList.innerHTML = '';
  weekReminderList.appendChild(grid);
}

function getTodayFocusTask() {
  const todayKey = toDateKey(new Date());
  const todaysTasks = getTasksForDate(todayKey);
  const fallbackTasks = getTasksForDay(dayNames[new Date().getDay()]).filter((task) => !task.dueDate);
  return sortTasks(todaysTasks.length ? todaysTasks : fallbackTasks)[0];
}

function renderTodayFocus() {
  if (!todayFocusCard) return;
  const task = getTodayFocusTask();
  if (!task) {
    todayFocusCard.innerHTML = `
      <div class="empty-state compact">
        <strong>No focus task yet</strong>
        <p>Add a task for today and DueBoard will pick the strongest next step.</p>
        <button class="btn btn-secondary" type="button" data-action="sample-task">Add sample task</button>
      </div>
    `;
    return;
  }

  todayFocusCard.innerHTML = `
    <button class="focus-task-button" type="button" data-task-id="${task.id}">
      <span class="priority-chip ${getPriorityClass(task.priority)}">${escapeHtml(task.priority || 'medium')}</span>
      <strong>${escapeHtml(task.text)}</strong>
      <small>${escapeHtml(getCategoryLabel(task))} | ${escapeHtml(task.dueDate || task.day || 'Today')} | ${Number(task.hours || 1).toFixed(2)} hrs</small>
      <p>Start here, then clear one small piece before switching tasks.</p>
    </button>
  `;
}

function openDashboardReminderModal(taskId) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;

  dashboardReminderTitle.textContent = `Edit reminder: ${task.text}`;
  dashboardReminderEditor.innerHTML = `
    <form id="dashboardReminderForm" class="dashboard-reminder-form">
      <label>
        Title
        <input name="text" type="text" value="${escapeHtml(task.text || '')}" required />
      </label>
      <label>
        Category
        <select name="category">
          ${getCategoryOptions(task.category || 'task')}
        </select>
      </label>
      <label>
        Type
        <select name="type">
          ${getTypeOptions(task.type || 'daily')}
        </select>
      </label>
      <label>
        Priority
        <select name="priority">
          ${getPriorityOptions(task.priority || 'medium')}
        </select>
      </label>
      <label>
        Due date
        <input name="dueDate" type="date" value="${task.dueDate || ''}" />
      </label>
      <label>
        Day
        <select name="day">
          ${getDayOptions(task.day || 'Mon')}
        </select>
      </label>
      <label>
        Start time
        <input name="startTime" type="time" value="${task.startTime || '08:00'}" />
      </label>
      <label>
        Hours
        <input name="hours" type="number" min="0.25" step="0.25" value="${Number(task.hours || 1).toFixed(2)}" />
      </label>
      <label class="checkbox-label">
        <input name="completed" type="checkbox" ${task.completed ? 'checked' : ''} />
        Mark completed
      </label>
      <label>
        Notes
        <textarea name="notes" rows="4" placeholder="Add brief notes...">${escapeHtml(task.notes || '')}</textarea>
      </label>
      <input name="taskId" type="hidden" value="${task.id}" />
    </form>
  `;
  dashboardReminderModal.hidden = false;
}

function closeDashboardReminderEditor() {
  dashboardReminderModal.hidden = true;
  dashboardReminderEditor.innerHTML = '';
}

function saveDashboardReminderModal() {
  const form = document.getElementById('dashboardReminderForm');
  if (!form) return;
  if (!form.reportValidity()) return;
  const formData = new FormData(form);
  const taskId = formData.get('taskId');
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;
  const text = String(formData.get('text') || '').trim();
  if (!text) return;

  const updatedTask = {
    ...task,
    text,
    category: formData.get('category'),
    type: formData.get('type'),
    priority: formData.get('priority'),
    dueDate: formData.get('dueDate') || '',
    day: formData.get('day'),
    startTime: formData.get('startTime') || '08:00',
    hours: Number(formData.get('hours')) || 1,
    notes: formData.get('notes').trim(),
    completed: formData.get('completed') === 'on'
  };

  if (updatedTask.dueDate) {
    updatedTask.day = getDayFromDateKey(updatedTask.dueDate);
  }

  tasks = tasks.map((item) => (item.id === taskId ? updatedTask : item));
  saveState();
  renderDashboard();
  closeDashboardReminderEditor();
  showToast('Reminder updated.');
}

function getBackupPayload() {
  const keys = [
    STORAGE_KEY,
    NOTES_KEY,
    SETTINGS_KEY,
    REMINDER_CONTACT_KEY,
    PROFILE_KEY,
    CALENDAR_SETTINGS_KEY,
    STUDY_SETTINGS_KEY,
    STUDY_MATERIALS_KEY,
    ONBOARDING_KEY
  ];
  const data = {};
  keys.forEach((key) => {
    data[key] = loadJson(userKey(key), null);
  });
  return {
    app: 'DueBoard',
    version: 1,
    exportedAt: new Date().toISOString(),
    account: session ? { email: session.email, name: session.name } : null,
    data
  };
}

function handleExportPlannerData() {
  const payload = getBackupPayload();
  const date = toDateKey(new Date());
  downloadFile(`dueboard-backup-${date}.json`, 'application/json', JSON.stringify(payload, null, 2));
  showToast('Planner backup exported.');
}

function handleImportPlannerData() {
  importPlannerFile.click();
}

function sanitizeImportedTask(task) {
  task = task && typeof task === 'object' ? task : {};
  const dueDate = sanitizeDateKey(task.dueDate);
  const day = dueDate ? getDayFromDateKey(dueDate) : sanitizeEnum(task.day, plannerDayNames, 'Mon');
  return {
    id: sanitizePlainText(task.id, 80) || Date.now().toString() + Math.random().toString(16).slice(2),
    text: sanitizePlainText(task.text, 180) || 'Imported task',
    notes: sanitizePlainText(task.notes, 800),
    type: sanitizeEnum(task.type, ['daily', 'weekly'], 'daily'),
    category: sanitizeEnum(task.category, ['assignment', 'exam', 'reminder', 'task'], 'task'),
    dueDate,
    priority: sanitizeEnum(task.priority, ['high', 'medium', 'low'], 'medium'),
    day,
    startTime: sanitizeTime(task.startTime, ''),
    hours: Math.max(0.25, Math.min(24, Number(task.hours) || 1)),
    completed: Boolean(task.completed),
    created: sanitizePlainText(task.created, 40) || new Date().toISOString()
  };
}

function sanitizeImportedNote(note) {
  note = note && typeof note === 'object' ? note : {};
  return {
    id: sanitizePlainText(note.id, 80) || Date.now().toString() + Math.random().toString(16).slice(2),
    title: sanitizePlainText(note.title, 160) || 'Imported note',
    body: sanitizePlainText(note.body, 12000),
    category: sanitizeEnum(note.category, ['study', 'projects', 'ideas', 'personal'], 'study'),
    color: sanitizeEnum(note.color, ['green', 'blue', 'yellow', 'pink'], 'green'),
    tags: Array.isArray(note.tags) ? note.tags.slice(0, 12).map((tag) => sanitizePlainText(tag, 32)).filter(Boolean) : [],
    pinned: Boolean(note.pinned),
    archived: Boolean(note.archived),
    created: sanitizePlainText(note.created, 40) || new Date().toISOString(),
    updated: sanitizePlainText(note.updated, 40) || new Date().toISOString()
  };
}

function sanitizeImportedProfile(profile) {
  profile = profile && typeof profile === 'object' ? profile : {};
  return {
    banner: sanitizeEnum(profile.banner, ['aurora', 'sunrise', 'midnight', 'meadow'], 'aurora'),
    accent: /^#[0-9a-fA-F]{6}$/.test(String(profile.accent || '')) ? profile.accent : '#2563eb',
    background: /^#[0-9a-fA-F]{6}$/.test(String(profile.background || '')) ? profile.background : '#f6f8fb',
    mode: sanitizeEnum(profile.mode, ['light', 'dark'], 'light')
  };
}

function sanitizeImportedBackupData(data) {
  const clean = {};
  Object.entries(data || {}).forEach(([key, value]) => {
    if (!BACKUP_ALLOWED_KEYS.has(key)) return;
    if (key === STORAGE_KEY) clean[key] = Array.isArray(value) ? value.slice(0, 500).map(sanitizeImportedTask) : [];
    if (key === NOTES_KEY) clean[key] = Array.isArray(value) ? value.slice(0, 300).map(sanitizeImportedNote) : [];
    if (key === SETTINGS_KEY) {
      clean[key] = {
        plannerDay: sanitizeEnum(value?.plannerDay, plannerDayNames, 'Mon'),
        weeklyHourGoal: String(Math.max(1, Math.min(70, Number(value?.weeklyHourGoal) || 20))),
        showCompleted: Boolean(value?.showCompleted)
      };
    }
    if (key === REMINDER_CONTACT_KEY) {
      clean[key] = {
        email: sanitizeEmail(value?.email),
        phone: sanitizePhone(value?.phone),
        updated: new Date().toISOString()
      };
    }
    if (key === PROFILE_KEY) clean[key] = sanitizeImportedProfile(value || {});
    if (key === CALENDAR_SETTINGS_KEY) {
      clean[key] = {
        day: sanitizeEnum(value?.day, plannerDayNames, 'Mon'),
        month: Math.max(0, Math.min(11, Number(value?.month) || 0)),
        year: Math.max(1970, Math.min(2100, Number(value?.year) || new Date().getFullYear())),
        selectedDate: sanitizeDateKey(value?.selectedDate) || toDateKey(new Date()),
        start: sanitizeTime(value?.start, '08:00'),
        end: sanitizeTime(value?.end, '18:00')
      };
    }
    if (key === STUDY_SETTINGS_KEY) {
      clean[key] = {
        minutes: Math.max(1, Math.min(180, Number(value?.minutes) || 25)),
        sound: sanitizeEnum(value?.sound, ['digital', 'urgent', 'siren', 'school'], 'digital')
      };
    }
    if (key === STUDY_MATERIALS_KEY) clean[key] = [];
    if (key === ONBOARDING_KEY) clean[key] = { completed: Boolean(value?.completed), updated: new Date().toISOString() };
  });
  return clean;
}

function handleImportPlannerFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (file.size > MAX_BACKUP_BYTES || !file.name.toLowerCase().endsWith('.json')) {
    showToast('Backup must be a JSON file under 1 MB.');
    importPlannerFile.value = '';
    return;
  }
  const confirmed = window.confirm('Importing a backup can overwrite planner data for this logged-in account. Continue?');
  if (!confirmed) {
    importPlannerFile.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const backup = JSON.parse(String(reader.result || '{}'));
      if (backup.app !== 'DueBoard' || !backup.data) {
        showToast('This is not a DueBoard backup.');
        return;
      }
      const cleanData = sanitizeImportedBackupData(backup.data);
      Object.entries(cleanData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          localStorage.setItem(userKey(key), JSON.stringify(value));
        }
      });
      loadState();
      renderDashboard();
      showToast('Planner backup imported.');
    } catch (error) {
      console.error(error);
      showToast('Backup import failed.');
    } finally {
      importPlannerFile.value = '';
    }
  };
  reader.readAsText(file);
}

function addSampleTask() {
  const today = new Date();
  const task = {
    id: Date.now().toString(),
    text: 'Sample study block',
    notes: 'Use this as a starter reminder, then edit it from the pop-up.',
    type: 'daily',
    category: 'task',
    dueDate: toDateKey(today),
    priority: 'medium',
    day: dayNames[today.getDay()],
    startTime: '16:00',
    hours: 1,
    completed: false,
    created: new Date().toISOString()
  };
  tasks = [task, ...tasks];
  saveState();
  renderDashboard();
  showToast('Sample task added.');
}

function markOnboardingComplete(values = {}) {
  localStorage.setItem(userKey(ONBOARDING_KEY), JSON.stringify({
    completed: true,
    ...values,
    updated: new Date().toISOString()
  }));
}

function maybeShowOnboarding() {
  if (!onboardingModal) return;
  const status = loadJson(userKey(ONBOARDING_KEY), {});
  if (status.completed) return;
  onboardingEmail.value = getReminderContact().email || (session && session.email) || '';
  onboardingPhone.value = getReminderContact().phone || '';
  onboardingWeeklyGoal.value = weeklyHourGoal.value || '20';
  onboardingModal.hidden = false;
}

function closeOnboarding() {
  if (onboardingModal) onboardingModal.hidden = true;
}

function handleOnboardingSubmit(event) {
  event.preventDefault();
  weeklyHourGoal.value = onboardingWeeklyGoal.value || weeklyHourGoal.value;
  localStorage.setItem(userKey(REMINDER_CONTACT_KEY), JSON.stringify({
    email: onboardingEmail.value.trim().toLowerCase(),
    phone: onboardingPhone.value.trim(),
    updated: new Date().toISOString()
  }));
  markOnboardingComplete({
    goal: onboardingGoal.value.trim(),
    studyTime: onboardingStudyTime.value,
    weeklyHourGoal: weeklyHourGoal.value
  });
  saveState();
  closeOnboarding();
  renderDashboard();
  showToast('Setup saved.');
}

function handleOnboardingSkip() {
  markOnboardingComplete({ skipped: true });
  closeOnboarding();
}

function renderDashboard() {
  renderTodayReminders();
  renderDashboardWidgets();
  renderWeekReminders();
  renderTodayFocus();
  renderAutoDailyPlan();
}

function renderDashboardWidgets() {
  if (!dashboardWidgets) return;
  const today = toDateKey(new Date());
  const upcomingDate = new Date();
  upcomingDate.setDate(upcomingDate.getDate() + 7);
  const upcomingKey = toDateKey(upcomingDate);
  const openTasks = tasks.filter((task) => !task.completed);
  const overdue = openTasks.filter((task) => task.dueDate && task.dueDate < today);
  const upcoming = openTasks.filter((task) => task.dueDate && task.dueDate >= today && task.dueDate <= upcomingKey);
  const exams = openTasks.filter((task) => task.category === 'exam');
  const pinnedNotes = loadJson(userKey(NOTES_KEY), []).filter((note) => note.pinned && !note.archived);

  dashboardWidgets.innerHTML = `
    <a class="dashboard-widget urgent" href="notifications.html">
      <span>Overdue</span>
      <strong>${overdue.length}</strong>
      <small>${overdue[0] ? escapeHtml(overdue[0].text) : 'Nothing overdue'}</small>
    </a>
    <a class="dashboard-widget" href="calendar.html">
      <span>Upcoming</span>
      <strong>${upcoming.length}</strong>
      <small>${upcoming[0] ? escapeHtml(upcoming[0].text) : 'No due dates soon'}</small>
    </a>
    <a class="dashboard-widget exam" href="study.html">
      <span>Exams</span>
      <strong>${exams.length}</strong>
      <small>${exams[0] ? escapeHtml(exams[0].text) : 'No exams saved'}</small>
    </a>
    <a class="dashboard-widget note" href="notes.html">
      <span>Pinned notes</span>
      <strong>${pinnedNotes.length}</strong>
      <small>${pinnedNotes[0] ? escapeHtml(pinnedNotes[0].title) : 'Pin notes for quick review'}</small>
    </a>
  `;
}

function confirmCompletion(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task || task.completed) return true;
  return window.confirm(`Are you sure you finished "${task.text}"?`);
}

function handleDashboardInteraction(event) {
  if (event.target.closest('a')) return;

  const button = event.target.closest('button[data-action]');
  if (button) {
    const id = button.dataset.id;
    if (button.dataset.action === 'sample-task') {
      addSampleTask();
      return;
    }
    if (button.dataset.action === 'toggle' && id) {
      if (!confirmCompletion(id)) return;
      tasks = tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task);
      saveState();
      renderDashboard();
      showToast('Reminder updated.');
      return;
    }
    if (button.dataset.action === 'delete' && id) {
      tasks = tasks.filter((task) => task.id !== id);
      saveState();
      renderDashboard();
      showToast('Reminder deleted.');
      return;
    }
  }

  const taskCard = event.target.closest('[data-task-id]');
  if (taskCard && taskCard.dataset.taskId) {
    openDashboardReminderModal(taskCard.dataset.taskId);
  }
}

function getDayFromDateKey(dateKey) {
  if (!dateKey) return 'Mon';
  const [year, month, day] = dateKey.split('-').map(Number);
  return dayNames[new Date(year, month - 1, day).getDay()];
}

function clearCompletedTasks() {
  tasks = tasks.filter((task) => !task.completed);
  saveState();
  renderDashboard();
  showToast('Completed reminders cleared.');
}

function arrangeWeeklyTasks() {
  const weeklyGoal = getWeeklyHourGoal();
  const targetPerDay = weeklyGoal / plannerDayNames.length;
  const dayLoads = Object.fromEntries(plannerDayNames.map((day) => [day, 0]));
  const openTasks = sortTasks(tasks.filter((task) => !task.completed));

  if (!openTasks.length) {
    showToast('Add reminders before arranging the week.');
    return;
  }

  const assignments = {};
  openTasks.forEach((task) => {
    const taskHours = Number(task.hours) || 1;
    const preferredDay = plannerDayNames
      .filter((day) => dayLoads[day] + taskHours <= targetPerDay)
      .sort((a, b) => dayLoads[a] - dayLoads[b])[0];
    const fallbackDay = [...plannerDayNames].sort((a, b) => dayLoads[a] - dayLoads[b])[0];
    const selectedDay = preferredDay || fallbackDay;
    const startHour = Math.min(17.75, 8 + dayLoads[selectedDay]);

    assignments[task.id] = {
      day: selectedDay,
      startTime: formatHour(startHour)
    };
    dayLoads[selectedDay] += taskHours;
  });

  tasks = tasks.map((task) => assignments[task.id] ? { ...task, ...assignments[task.id] } : task);
  saveState();
  renderDashboard();

  showToast('Weekly plan arranged.');
}

function formatHour(value) {
  const hour = Math.floor(value);
  const minutes = Math.round((value - hour) * 60);
  return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function renderAutoDailyPlan() {
  const today = new Date();
  const todayKey = toDateKey(today);
  const selectedTasks = getTasksForDate(todayKey).length
    ? getTasksForDate(todayKey)
    : getTasksForDay(dayNames[today.getDay()]).filter((task) => !task.dueDate);
  const totalHours = selectedTasks.reduce((sum, task) => sum + (Number(task.hours) || 1), 0);
  const orderedTasks = sortTasks(selectedTasks);

  if (!selectedTasks.length) {
    aiResponse.innerHTML = `
      <div class="empty-state compact">
        <strong>No daily plan yet</strong>
        <p>Add a reminder on today's calendar date and DueBoard will build the schedule here automatically.</p>
      </div>
    `;
    return;
  }

  const firstTask = orderedTasks[0];
  aiResponse.innerHTML = `
    <div class="ai-plan-summary">
      <span><strong>${orderedTasks.length}</strong> item${orderedTasks.length === 1 ? '' : 's'} today</span>
      <span><strong>${totalHours.toFixed(2)}</strong> estimated hrs</span>
    </div>
    <p class="ai-next-step">Start with <strong>${escapeHtml(firstTask.text)}</strong> because it is ${escapeHtml(firstTask.priority || 'medium')} priority.</p>
    <ol class="ai-plan-list">
      ${orderedTasks.map((task, index) => `
        <li>
          <span>${index + 1}</span>
          <div>
            <strong>${escapeHtml(task.text)}</strong>
            <small>${escapeHtml(getCategoryLabel(task))} - ${task.startTime || 'Flexible'} - ${Number(task.hours || 1).toFixed(2)} hrs</small>
          </div>
        </li>
      `).join('')}
    </ol>
  `;
}

function handleSettingsChange() {
  saveState();
  renderDashboard();
}

function init() {
  loadState();
  renderDashboard();
  todayReminderList.addEventListener('click', handleDashboardInteraction);
  weekReminderList.addEventListener('click', handleDashboardInteraction);
  if (todayFocusCard) todayFocusCard.addEventListener('click', handleDashboardInteraction);
  closeDashboardReminderButton.addEventListener('click', closeDashboardReminderEditor);
  doneDashboardReminderModal.addEventListener('click', saveDashboardReminderModal);
  dashboardReminderEditor.addEventListener('submit', (event) => {
    event.preventDefault();
    saveDashboardReminderModal();
  });
  dashboardReminderModal.addEventListener('click', (event) => {
    if (event.target === dashboardReminderModal) {
      closeDashboardReminderEditor();
    }
  });
  plannerDay.addEventListener('change', handleSettingsChange);
  weeklyHourGoal.addEventListener('change', handleSettingsChange);
  showCompleted.addEventListener('change', handleSettingsChange);
  clearCompleted.addEventListener('click', clearCompletedTasks);
  if (exportPlannerData) exportPlannerData.addEventListener('click', handleExportPlannerData);
  if (importPlannerData) importPlannerData.addEventListener('click', handleImportPlannerData);
  if (importPlannerFile) importPlannerFile.addEventListener('change', handleImportPlannerFile);
  if (onboardingForm) onboardingForm.addEventListener('submit', handleOnboardingSubmit);
  if (skipOnboarding) skipOnboarding.addEventListener('click', handleOnboardingSkip);
  if (onboardingModal) {
    onboardingModal.addEventListener('click', (event) => {
      if (event.target === onboardingModal) handleOnboardingSkip();
    });
  }
  if (saveProfile) saveProfile.addEventListener('click', handleProfileSave);
  if (bannerSwatches) bannerSwatches.addEventListener('click', handleBannerSwatchClick);
  if (logoutButton) logoutButton.addEventListener('click', handleLogout);
  aiSuggestWeek.addEventListener('click', arrangeWeeklyTasks);
  maybeShowOnboarding();
}

init();


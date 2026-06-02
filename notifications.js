const notificationCount = document.getElementById('notificationCount');
const notificationList = document.getElementById('notificationList');

const TASKS_KEY = 'goplanitTasks';
const NOTES_KEY = 'goplanitNotes';
const SESSION_KEY = 'goplanitSession';
const PROFILE_KEY = 'goplanitProfile';

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
  const profile = loadJson(userKey(PROFILE_KEY), { banner: 'aurora', accent: '#22c55e', background: '#09121d' });
  document.body.dataset.banner = profile.banner;
  document.documentElement.style.setProperty('--accent', profile.accent);
  document.documentElement.style.setProperty('--accent-strong', profile.accent);
  document.documentElement.style.setProperty('--custom-bg', profile.background);
}

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function buildNotifications() {
  const today = toDateKey(new Date());
  const soon = new Date();
  soon.setDate(soon.getDate() + 3);
  const soonKey = toDateKey(soon);
  const tasks = loadJson(userKey(TASKS_KEY), []).filter((task) => !task.completed);
  const notes = loadJson(userKey(NOTES_KEY), []).filter((note) => note.pinned && !note.archived);
  const alerts = [];

  tasks.forEach((task) => {
    if (task.dueDate && task.dueDate < today) alerts.push({ level: 'high', title: `Overdue: ${task.text}`, meta: task.dueDate, body: task.notes || 'This item is past its due date.' });
    else if (task.dueDate === today) alerts.push({ level: 'medium', title: `Due today: ${task.text}`, meta: task.category || 'task', body: task.notes || 'This needs attention today.' });
    else if (task.dueDate && task.dueDate <= soonKey) alerts.push({ level: 'low', title: `Coming soon: ${task.text}`, meta: task.dueDate, body: task.notes || 'Plan time before it becomes urgent.' });
    else if (task.category === 'exam') alerts.push({ level: 'high', title: `Exam reminder: ${task.text}`, meta: task.dueDate || task.day || 'Upcoming', body: 'Add study time for this exam.' });
  });

  notes.forEach((note) => {
    alerts.push({ level: 'note', title: `Pinned note: ${note.title}`, meta: note.category || 'note', body: note.body || 'Pinned for quick review.' });
  });

  return alerts;
}

function renderNotifications() {
  const alerts = buildNotifications();
  notificationCount.textContent = `${alerts.length} alert${alerts.length === 1 ? '' : 's'}`;
  notificationList.innerHTML = alerts.length ? alerts.map((alert) => `
    <article class="notification-card ${alert.level}">
      <div>
        <strong>${escapeHtml(alert.title)}</strong>
        <span>${escapeHtml(alert.meta)}</span>
      </div>
      <p>${escapeHtml(alert.body).slice(0, 180)}</p>
    </article>
  `).join('') : `
    <div class="empty-state">
      <strong>No alerts right now</strong>
      <p>Due dates, exams, overdue tasks, and pinned notes will appear here automatically.</p>
    </div>
  `;
}

function initNotifications() {
  applyProfileTheme();
  renderNotifications();
}

initNotifications();

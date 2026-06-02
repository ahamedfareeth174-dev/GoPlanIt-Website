const globalSearchInput = document.getElementById('globalSearchInput');
const searchResults = document.getElementById('searchResults');
const searchCount = document.getElementById('searchCount');

const TASKS_KEY = 'goplanitTasks';
const NOTES_KEY = 'goplanitNotes';
const SESSION_KEY = 'goplanitSession';
const PROFILE_KEY = 'goplanitProfile';
let activeKind = 'all';

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

function getRecords() {
  const tasks = loadJson(userKey(TASKS_KEY), []).map((task) => ({
    kind: 'task',
    title: task.text,
    body: `${task.category || 'task'} ${task.priority || ''} ${task.notes || ''} ${task.dueDate || task.day || ''}`,
    href: 'dashboard.html',
    meta: `${task.category || 'task'} - ${task.dueDate || task.day || 'No date'}`
  }));
  const notes = loadJson(userKey(NOTES_KEY), []).map((note) => ({
    kind: 'note',
    title: note.title,
    body: `${note.body || ''} ${(note.tags || []).join(' ')} ${note.category || ''}`,
    href: 'notes.html',
    meta: `${note.category || 'note'} - ${note.pinned ? 'pinned' : 'saved note'}`
  }));
  return [...tasks, ...notes];
}

function renderSearch() {
  const query = globalSearchInput.value.trim().toLowerCase();
  const records = getRecords().filter((record) => {
    if (activeKind !== 'all' && record.kind !== activeKind) return false;
    if (!query) return true;
    return `${record.title} ${record.body}`.toLowerCase().includes(query);
  });

  searchCount.textContent = `${records.length} result${records.length === 1 ? '' : 's'}`;
  searchResults.innerHTML = records.length ? records.map((record) => `
    <a class="search-result-card" href="${record.href}">
      <span>${escapeHtml(record.kind)}</span>
      <strong>${escapeHtml(record.title || 'Untitled')}</strong>
      <p>${escapeHtml(record.body).slice(0, 180)}</p>
      <small>${escapeHtml(record.meta)}</small>
    </a>
  `).join('') : `
    <div class="empty-state">
      <strong>No results</strong>
      <p>Try a different keyword, or add more tasks and notes first.</p>
    </div>
  `;
}

function initSearch() {
  applyProfileTheme();
  renderSearch();
  globalSearchInput.addEventListener('input', renderSearch);
  document.querySelector('.search-filter-row').addEventListener('click', (event) => {
    const button = event.target.closest('[data-kind]');
    if (!button) return;
    activeKind = button.dataset.kind;
    document.querySelectorAll('[data-kind]').forEach((item) => item.classList.toggle('active', item === button));
    renderSearch();
  });
}

initSearch();

const notesCount = document.getElementById('notesCount');
const notesStatus = document.getElementById('notesStatus');
const notesWordCount = document.getElementById('notesWordCount');
const newNoteButton = document.getElementById('newNoteButton');
const notesSearch = document.getElementById('notesSearch');
const notesList = document.getElementById('notesList');
const noteEditedLabel = document.getElementById('noteEditedLabel');
const noteTitle = document.getElementById('noteTitle');
const noteCategory = document.getElementById('noteCategory');
const noteColor = document.getElementById('noteColor');
const noteTags = document.getElementById('noteTags');
const noteBody = document.getElementById('noteBody');
const saveNoteButton = document.getElementById('saveNoteButton');
const makeTaskButton = document.getElementById('makeTaskButton');
const pinNoteButton = document.getElementById('pinNoteButton');
const archiveNoteButton = document.getElementById('archiveNoteButton');
const deleteNoteButton = document.getElementById('deleteNoteButton');

const NOTES_KEY = 'goplanitNotes';
const TASKS_KEY = 'goplanitTasks';
const SESSION_KEY = 'goplanitSession';
const PROFILE_KEY = 'goplanitProfile';

let notes = [];
let activeNoteId = '';
let activeFilter = 'all';
let session = getSession();
let autosaveTimer = null;

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
  const id = session && session.email ? session.email : 'guest';
  return `${baseKey}:${id}`;
}

function loadJson(key, fallback) {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : fallback;
}

function saveNotes() {
  localStorage.setItem(userKey(NOTES_KEY), JSON.stringify(notes));
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

function sanitizeNote(note) {
  const now = new Date().toISOString();
  return {
    id: sanitizePlainText(note.id, 80) || Date.now().toString(),
    title: sanitizePlainText(note.title, 160) || 'Untitled note',
    body: sanitizePlainText(note.body, 12000),
    category: sanitizeEnum(note.category, ['study', 'projects', 'ideas', 'personal'], 'study'),
    color: sanitizeEnum(note.color, ['green', 'blue', 'yellow', 'pink'], 'green'),
    tags: Array.isArray(note.tags) ? note.tags.slice(0, 12).map((tag) => sanitizePlainText(tag, 32).trim()).filter(Boolean) : [],
    pinned: Boolean(note.pinned),
    archived: Boolean(note.archived),
    created: sanitizePlainText(note.created, 40) || now,
    updated: sanitizePlainText(note.updated, 40) || now
  };
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

function createNote() {
  const now = new Date().toISOString();
  return {
    id: Date.now().toString(),
    title: 'Untitled note',
    body: '',
    category: 'study',
    color: 'green',
    tags: [],
    pinned: false,
    archived: false,
    created: now,
    updated: now
  };
}

function getActiveNote() {
  return notes.find((note) => note.id === activeNoteId) || null;
}

function getWordCount(value) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function formatDate(value) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function getFilteredNotes() {
  const query = notesSearch.value.trim().toLowerCase();
  return notes
    .filter((note) => {
      if (activeFilter === 'pinned' && !note.pinned) return false;
      if (activeFilter === 'archive' && !note.archived) return false;
      if (!['all', 'pinned', 'archive'].includes(activeFilter) && note.category !== activeFilter) return false;
      if (activeFilter !== 'archive' && note.archived) return false;
      if (!query) return true;
      const haystack = `${note.title} ${note.body} ${note.category} ${note.tags.join(' ')}`.toLowerCase();
      return haystack.includes(query);
    })
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updated) - new Date(a.updated));
}

function renderStats() {
  const activeNotes = notes.filter((note) => !note.archived);
  const words = activeNotes.reduce((sum, note) => sum + getWordCount(note.body), 0);
  notesCount.textContent = `${activeNotes.length} note${activeNotes.length === 1 ? '' : 's'}`;
  notesWordCount.textContent = `${words} word${words === 1 ? '' : 's'}`;
  notesStatus.textContent = session ? `Saved for ${session.email}` : 'Saved as guest notes.';
}

function renderNotesList() {
  const filtered = getFilteredNotes();
  notesList.innerHTML = '';

  if (!filtered.length) {
    notesList.innerHTML = `
      <div class="empty-state">
        <strong>No notes found</strong>
        <p>Create a note or adjust your search/filter to see more.</p>
      </div>
    `;
    renderStats();
    return;
  }

  filtered.forEach((note) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `note-card note-${note.color} ${note.id === activeNoteId ? 'active' : ''}`;
    card.dataset.id = note.id;
    card.innerHTML = `
      <div class="note-card-head">
        <strong>${escapeHtml(note.title || 'Untitled note')}</strong>
        ${note.pinned ? '<span>PIN</span>' : ''}
      </div>
      <p>${escapeHtml(note.body || 'No body text yet.').slice(0, 140)}</p>
      <div class="note-card-meta">
        <span>${escapeHtml(note.category)}</span>
        <span>${getWordCount(note.body)} words</span>
        <span>${formatDate(note.updated)}</span>
      </div>
    `;
    notesList.appendChild(card);
  });
  renderStats();
}

function renderEditor() {
  const note = getActiveNote();
  const disabled = !note;
  [noteTitle, noteCategory, noteColor, noteTags, noteBody, saveNoteButton, makeTaskButton, pinNoteButton, archiveNoteButton, deleteNoteButton].forEach((control) => {
    control.disabled = disabled;
  });

  if (!note) {
    noteTitle.value = '';
    noteCategory.value = 'study';
    noteColor.value = 'green';
    noteTags.value = '';
    noteBody.value = '';
    noteEditedLabel.textContent = 'Choose a note or create a new one.';
    pinNoteButton.textContent = 'Pin';
    archiveNoteButton.textContent = 'Archive';
    return;
  }

  noteTitle.value = note.title;
  noteCategory.value = note.category;
  noteColor.value = note.color;
  noteTags.value = note.tags.join(', ');
  noteBody.value = note.body;
  noteEditedLabel.textContent = `Last edited ${formatDate(note.updated)}`;
  pinNoteButton.textContent = note.pinned ? 'Unpin' : 'Pin';
  archiveNoteButton.textContent = note.archived ? 'Restore' : 'Archive';
}

function renderNotes() {
  renderNotesList();
  renderEditor();
}

function selectNote(id) {
  activeNoteId = id;
  renderNotes();
}

function handleNewNote() {
  const note = createNote();
  notes = [note, ...notes];
  activeNoteId = note.id;
  saveNotes();
  renderNotes();
  noteTitle.focus();
  showToast('New note created.');
}

function readEditorNote(note) {
  return {
    ...note,
    title: sanitizePlainText(noteTitle.value, 160).trim() || 'Untitled note',
    category: sanitizeEnum(noteCategory.value, ['study', 'projects', 'ideas', 'personal'], 'study'),
    color: sanitizeEnum(noteColor.value, ['green', 'blue', 'yellow', 'pink'], 'green'),
    tags: noteTags.value.split(',').map((tag) => sanitizePlainText(tag, 32).trim()).filter(Boolean).slice(0, 12),
    body: sanitizePlainText(noteBody.value, 12000),
    updated: new Date().toISOString()
  };
}

function handleSaveNote() {
  const note = getActiveNote();
  if (!note) return;
  notes = notes.map((item) => item.id === note.id ? readEditorNote(item) : item);
  saveNotes();
  renderNotes();
  showToast('Note saved.');
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function handleMakeTask() {
  const note = getActiveNote();
  if (!note) return;
  autosaveActiveNote();
  const tasks = loadJson(userKey(TASKS_KEY), []);
  const today = new Date();
  const text = noteTitle.value.trim() || note.title || 'Note follow-up';
  const newTask = {
    id: Date.now().toString(),
    text: `Review note: ${text}`,
    notes: noteBody.value.trim().slice(0, 240),
    type: 'daily',
    category: 'task',
    dueDate: toDateKey(today),
    priority: 'medium',
    day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][today.getDay()],
    startTime: '08:00',
    hours: 0.5,
    completed: false,
    created: new Date().toISOString(),
    sourceNoteId: note.id
  };
  localStorage.setItem(userKey(TASKS_KEY), JSON.stringify([newTask, ...tasks]));
  showToast('Note turned into a calendar task.');
}

function autosaveActiveNote() {
  const note = getActiveNote();
  if (!note) return;
  notes = notes.map((item) => item.id === note.id ? readEditorNote(item) : item);
  saveNotes();
  renderNotesList();
  noteEditedLabel.textContent = 'Draft saved just now';
}

function scheduleAutosave() {
  window.clearTimeout(autosaveTimer);
  autosaveTimer = window.setTimeout(autosaveActiveNote, 650);
}

function handlePinNote() {
  const note = getActiveNote();
  if (!note) return;
  notes = notes.map((item) => item.id === note.id ? { ...item, pinned: !item.pinned, updated: new Date().toISOString() } : item);
  saveNotes();
  renderNotes();
}

function handleArchiveNote() {
  const note = getActiveNote();
  if (!note) return;
  notes = notes.map((item) => item.id === note.id ? { ...item, archived: !item.archived, updated: new Date().toISOString() } : item);
  saveNotes();
  renderNotes();
  showToast(note.archived ? 'Note restored.' : 'Note archived.');
}

function handleDeleteNote() {
  const note = getActiveNote();
  if (!note || !window.confirm(`Delete "${note.title}"?`)) return;
  notes = notes.filter((item) => item.id !== note.id);
  activeNoteId = notes[0] ? notes[0].id : '';
  saveNotes();
  renderNotes();
  showToast('Note deleted.');
}

function handleFilterClick(event) {
  const button = event.target.closest('.note-filter');
  if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll('.note-filter').forEach((filter) => {
    filter.classList.toggle('active', filter === button);
  });
  renderNotesList();
}

function initNotes() {
  applyProfileTheme();
  notes = loadJson(userKey(NOTES_KEY), []).map(sanitizeNote);
  saveNotes();
  activeNoteId = notes.find((note) => !note.archived)?.id || notes[0]?.id || '';
  renderNotes();
  newNoteButton.addEventListener('click', handleNewNote);
  notesSearch.addEventListener('input', renderNotesList);
  document.querySelector('.notes-filter-group').addEventListener('click', handleFilterClick);
  notesList.addEventListener('click', (event) => {
    const card = event.target.closest('.note-card');
    if (card) selectNote(card.dataset.id);
  });
  saveNoteButton.addEventListener('click', handleSaveNote);
  makeTaskButton.addEventListener('click', handleMakeTask);
  pinNoteButton.addEventListener('click', handlePinNote);
  archiveNoteButton.addEventListener('click', handleArchiveNote);
  deleteNoteButton.addEventListener('click', handleDeleteNote);
  [noteTitle, noteCategory, noteColor, noteTags, noteBody].forEach((control) => {
    control.addEventListener('input', scheduleAutosave);
    control.addEventListener('change', scheduleAutosave);
  });
}

initNotes();

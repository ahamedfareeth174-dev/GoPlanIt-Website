const signupForm = document.getElementById('signupForm');
const loginForm = document.getElementById('loginForm');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const contactForm = document.getElementById('contactForm');
const reminderContactForm = document.getElementById('reminderContactForm');
const demoPlanner = document.getElementById('demoPlanner');
const accountMessage = document.getElementById('accountMessage');
const contactStatus = document.getElementById('contactStatus');
const reminderContactStatus = document.getElementById('reminderContactStatus');
const authSwitchButtons = document.querySelectorAll('[data-auth-view]');

const USERS_KEY = 'goplanitUsers';
const SESSION_KEY = 'goplanitSession';
const CONTACT_KEY = 'goplanitContactMessages';
const REMINDER_CONTACT_KEY = 'goplanitReminderContact';
const PROFILE_KEY = 'goplanitProfile';
const TASKS_KEY = 'goplanitTasks';
const NOTES_KEY = 'goplanitNotes';
const SETTINGS_KEY = 'goplanitSettings';
const CALENDAR_SETTINGS_KEY = 'goplanitCalendarSettings';
const STUDY_MATERIALS_KEY = 'goplanitStudyMaterials';
const LOGIN_LOCK_KEY = 'goplanitLoginLocks';
const SESSION_HOURS = 8;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_MINUTES = 10;
let useAccountDatabase = true;

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

function userKey(baseKey, emailOverride = '') {
  const session = getSession();
  const id = emailOverride || (session && session.email) || 'guest';
  return `${baseKey}:${id}`;
}

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
}

function sanitizePlainText(value, limit = 1000) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .slice(0, limit);
}

function sanitizeEmail(value) {
  const email = sanitizePlainText(value, 120).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function sanitizePhone(value) {
  return sanitizePlainText(value, 32).replace(/[^\d+]/g, '').slice(0, 20);
}

function createSession(email, name) {
  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ email, name, expiresAt }));
  if (window.updateAuthOnlyNavigation) window.updateAuthOnlyNavigation();
}

function loadCollection(key) {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
}

function saveCollection(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getLoginLocks() {
  return JSON.parse(localStorage.getItem(LOGIN_LOCK_KEY) || '{}');
}

function saveLoginLocks(locks) {
  localStorage.setItem(LOGIN_LOCK_KEY, JSON.stringify(locks));
}

function getLoginLock(email) {
  const locks = getLoginLocks();
  return locks[email] || { attempts: 0, lockedUntil: 0 };
}

function isLocked(email) {
  const lock = getLoginLock(email);
  return lock.lockedUntil && lock.lockedUntil > Date.now();
}

function recordFailedLogin(email) {
  const locks = getLoginLocks();
  const current = locks[email] || { attempts: 0, lockedUntil: 0 };
  const attempts = current.attempts + 1;
  locks[email] = {
    attempts,
    lockedUntil: attempts >= MAX_LOGIN_ATTEMPTS ? Date.now() + LOCK_MINUTES * 60 * 1000 : 0
  };
  saveLoginLocks(locks);
}

function clearLoginLock(email) {
  const locks = getLoginLocks();
  delete locks[email];
  saveLoginLocks(locks);
}

function getPasswordIssues(password) {
  const issues = [];
  if (password.length < 10) issues.push('at least 10 characters');
  if (!/[a-z]/.test(password)) issues.push('a lowercase letter');
  if (!/[A-Z]/.test(password)) issues.push('an uppercase letter');
  if (!/\d/.test(password)) issues.push('a number');
  if (!/[^A-Za-z0-9]/.test(password)) issues.push('a symbol');
  return issues;
}

function showMessage(node, message, type = 'success') {
  node.textContent = message;
  node.className = `form-message ${node.classList.contains('account-message') ? 'account-message ' : ''}${type}`;
  showToast(message, type);
}

function showToast(message, type = 'success') {
  let stack = document.getElementById('toastStack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toastStack';
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  toast.textContent = message;
  stack.appendChild(toast);
  window.setTimeout(() => {
    toast.classList.add('leaving');
    window.setTimeout(() => toast.remove(), 220);
  }, 2600);
}

function databaseReady() {
  return Boolean(window.GoPlanItDB && useAccountDatabase);
}

async function getUsersFromStorage() {
  if (databaseReady()) {
    try {
      await window.GoPlanItDB.migrateLegacyUsers();
      return await window.GoPlanItDB.getAllUsers();
    } catch (error) {
      console.warn('Account database unavailable. Falling back to local storage.', error);
      useAccountDatabase = false;
    }
  }
  return loadCollection(USERS_KEY);
}

function findUserByIdentifier(users, identifier) {
  const normalized = String(identifier || '').trim().toLowerCase();
  return users.find((user) => (
    user.email === normalized ||
    normalizeUsername(user.username) === normalizeUsername(normalized)
  ));
}

function showAuthView(viewId) {
  document.querySelectorAll('.auth-view').forEach((panel) => {
    const isActive = panel.id === viewId;
    panel.hidden = !isActive;
    panel.classList.toggle('active', isActive);
  });
  if (accountMessage) {
    accountMessage.textContent = '';
    accountMessage.className = 'form-message account-message';
  }
}

async function handleSignup(event) {
  event.preventDefault();
  try {
    const name = sanitizePlainText(document.getElementById('signupName').value, 80).trim();
    const username = normalizeUsername(document.getElementById('signupUsername').value);
    const email = sanitizeEmail(document.getElementById('signupEmail').value);
    const password = document.getElementById('signupPassword').value;
    const users = await getUsersFromStorage();

    if (!name) {
      showMessage(accountMessage, 'Name is required.', 'error');
      return;
    }

    if (username.length < 3 || username.length > 24) {
      showMessage(accountMessage, 'Username needs 3 to 24 letters, numbers, or underscores.', 'error');
      return;
    }

    if (!email) {
      showMessage(accountMessage, 'Enter a valid email address.', 'error');
      return;
    }

    if (users.some((user) => user.email === email)) {
      showMessage(accountMessage, 'An account with this email already exists.', 'error');
      return;
    }
    if (users.some((user) => normalizeUsername(user.username) === username)) {
      showMessage(accountMessage, 'That username is already taken.', 'error');
      return;
    }

    const passwordIssues = getPasswordIssues(password);
    if (passwordIssues.length) {
      showMessage(accountMessage, `Password needs ${passwordIssues.join(', ')}.`, 'error');
      return;
    }

    const passwordSalt = databaseReady() ? window.GoPlanItDB.generateSalt() : '';
    const newUser = {
      id: Date.now().toString(),
      name,
      username,
      email,
      passwordSalt,
      passwordHash: databaseReady() ? await window.GoPlanItDB.hashPassword(password, passwordSalt) : password,
      created: new Date().toISOString()
    };

    if (databaseReady()) {
      await window.GoPlanItDB.addUser(newUser);
    } else {
      saveCollection(USERS_KEY, [...users, { ...newUser, password }]);
    }

    createSession(email, name);
    localStorage.setItem(userKey(PROFILE_KEY, email), JSON.stringify({
      banner: 'aurora',
      accent: '#22c55e',
      background: '#09121d',
      mode: 'light'
    }));
    showMessage(accountMessage, `Welcome, ${name}. Your account was created.`);
    signupForm.reset();
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 700);
  } catch (error) {
    console.error(error);
    showMessage(accountMessage, 'The account database could not save this signup. Please try again.', 'error');
  }
}

async function handleLogin(event) {
  event.preventDefault();
  try {
    const identifier = sanitizePlainText(document.getElementById('loginIdentifier').value, 120).trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    if (isLocked(identifier)) {
      const minutes = Math.ceil((getLoginLock(identifier).lockedUntil - Date.now()) / 60000);
      showMessage(accountMessage, `Too many failed attempts. Try again in ${minutes} minute(s).`, 'error');
      return;
    }
    const users = await getUsersFromStorage();
    const user = findUserByIdentifier(users, identifier);
    const passwordMatches = user && (
      databaseReady()
        ? await window.GoPlanItDB.verifyPassword(password, user)
        : (user.password === password || user.passwordHash === password)
    );

    if (!user || !passwordMatches) {
      recordFailedLogin(identifier);
      showMessage(accountMessage, 'Login failed. Check your email and password.', 'error');
      return;
    }

    clearLoginLock(identifier);
    createSession(user.email, user.name);
    showMessage(accountMessage, `Welcome back, ${user.name}. Opening your planner...`);
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 700);
  } catch (error) {
    console.error(error);
    showMessage(accountMessage, 'The account database could not complete login. Please try again.', 'error');
  }
}

async function handleForgotPassword(event) {
  event.preventDefault();
  try {
    const identifier = sanitizePlainText(document.getElementById('resetIdentifier').value, 120).trim().toLowerCase();
    const password = document.getElementById('resetPassword').value;
    const issues = getPasswordIssues(password);
    if (issues.length) {
      showMessage(accountMessage, `New password needs ${issues.join(', ')}.`, 'error');
      return;
    }

    const users = await getUsersFromStorage();
    const user = findUserByIdentifier(users, identifier);
    if (!user) {
      showMessage(accountMessage, 'No account was found for that email or username.', 'error');
      return;
    }

    const passwordSalt = databaseReady() ? window.GoPlanItDB.generateSalt() : '';
    const updatedUser = {
      ...user,
      passwordSalt,
      passwordHash: databaseReady() ? await window.GoPlanItDB.hashPassword(password, passwordSalt) : password,
      password: databaseReady() ? undefined : password,
      passwordResetAt: new Date().toISOString()
    };

    if (databaseReady()) {
      await window.GoPlanItDB.updateUser(updatedUser);
    } else {
      saveCollection(USERS_KEY, users.map((item) => item.email === user.email ? updatedUser : item));
    }

    forgotPasswordForm.reset();
    showAuthView('loginPanel');
    showMessage(accountMessage, 'Password reset initiated. You can log in with the new password now.');
  } catch (error) {
    console.error(error);
    showMessage(accountMessage, 'Password reset could not complete. Please try again.', 'error');
  }
}

async function handleContact(event) {
  event.preventDefault();
  try {
    const email = sanitizeEmail(document.getElementById('contactEmail').value);
    const message = sanitizePlainText(document.getElementById('contactMessage').value, 2000).trim();
    if (!email || !message) {
      showMessage(contactStatus, 'Enter a valid email and message.', 'error');
      return;
    }
    const contactMessage = {
      id: Date.now().toString(),
      email,
      message,
      created: new Date().toISOString(),
      status: 'new'
    };

    if (databaseReady()) {
      await window.GoPlanItDB.addContactMessage(contactMessage);
    } else {
      const messages = loadCollection(CONTACT_KEY);
      saveCollection(CONTACT_KEY, [...messages, contactMessage]);
    }

    showMessage(contactStatus, 'Message saved. The site owner can review it from this browser database.');
    contactForm.reset();
  } catch (error) {
    console.error(error);
    showMessage(contactStatus, 'The message database could not save this yet. Please try again.', 'error');
  }
}

function loadReminderContact() {
  const stored = localStorage.getItem(userKey(REMINDER_CONTACT_KEY));
  if (!stored) return;

  const contact = JSON.parse(stored);
  const emailInput = document.getElementById('reminderEmail');
  const phoneInput = document.getElementById('reminderPhone');
  if (emailInput) emailInput.value = contact.email || '';
  if (phoneInput) phoneInput.value = contact.phone || '';
}

function handleReminderContact(event) {
  event.preventDefault();
  const email = sanitizeEmail(document.getElementById('reminderEmail').value);
  const phone = sanitizePhone(document.getElementById('reminderPhone').value);

  localStorage.setItem(userKey(REMINDER_CONTACT_KEY), JSON.stringify({
    email,
    phone,
    updated: new Date().toISOString()
  }));
  showMessage(reminderContactStatus, 'Reminder contact saved. Dashboard reminders can now open email or text messages.');
}

function loadDemoPlanner() {
  const email = 'demo@goplanit.local';
  const name = 'Demo Student';
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 6);
  const toDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  createSession(email, name);
  saveCollection(userKey(TASKS_KEY, email), [
    {
      id: 'demo-biology',
      text: 'Biology chapter review',
      notes: 'Review cell structure, organelles, and vocabulary before the quiz.',
      type: 'daily',
      category: 'exam',
      dueDate: toDateKey(today),
      priority: 'high',
      day: 'Mon',
      startTime: '16:00',
      hours: 1.5,
      completed: false,
      created: new Date().toISOString()
    },
    {
      id: 'demo-essay',
      text: 'History essay outline',
      notes: 'Build thesis, three evidence points, and a counterargument.',
      type: 'weekly',
      category: 'assignment',
      dueDate: toDateKey(tomorrow),
      priority: 'medium',
      day: 'Tue',
      startTime: '18:00',
      hours: 2,
      completed: false,
      created: new Date().toISOString()
    },
    {
      id: 'demo-project',
      text: 'Email project partner',
      notes: 'Send the source list and confirm roles.',
      type: 'daily',
      category: 'reminder',
      dueDate: toDateKey(nextWeek),
      priority: 'low',
      day: 'Fri',
      startTime: '',
      hours: 0.25,
      completed: false,
      created: new Date().toISOString()
    }
  ]);
  saveCollection(userKey(NOTES_KEY, email), [
    {
      id: 'demo-note',
      title: 'Biology study guide',
      body: 'Cell membrane controls movement. Mitochondria produce energy. Nucleus stores DNA.',
      tags: ['biology', 'exam'],
      pinned: true,
      archived: false,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    }
  ]);
  localStorage.setItem(userKey(SETTINGS_KEY, email), JSON.stringify({ plannerDay: 'Mon', weeklyHourGoal: '12', showCompleted: false }));
  localStorage.setItem(userKey(CALENDAR_SETTINGS_KEY, email), JSON.stringify({
    day: 'Mon',
    month: today.getMonth(),
    year: today.getFullYear(),
    selectedDate: toDateKey(today),
    start: '08:00',
    end: '18:00'
  }));
  localStorage.setItem(userKey(REMINDER_CONTACT_KEY, email), JSON.stringify({ email: 'demo@example.com', phone: '', updated: new Date().toISOString() }));
  localStorage.setItem(userKey(PROFILE_KEY, email), JSON.stringify({ banner: 'aurora', accent: '#2563eb', background: '#f6f8fb', mode: 'light' }));
  localStorage.setItem(userKey(STUDY_MATERIALS_KEY, email), JSON.stringify([]));
  window.location.href = 'dashboard.html';
}

if (signupForm) signupForm.addEventListener('submit', handleSignup);
if (loginForm) loginForm.addEventListener('submit', handleLogin);
if (forgotPasswordForm) forgotPasswordForm.addEventListener('submit', handleForgotPassword);
authSwitchButtons.forEach((button) => {
  button.addEventListener('click', () => showAuthView(button.dataset.authView));
});
if (contactForm) contactForm.addEventListener('submit', handleContact);
if (reminderContactForm) {
  loadReminderContact();
  reminderContactForm.addEventListener('submit', handleReminderContact);
}
if (demoPlanner) demoPlanner.addEventListener('click', loadDemoPlanner);

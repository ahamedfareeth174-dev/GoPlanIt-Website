const profileGreeting = document.getElementById('profileGreeting');
const profileAvatar = document.getElementById('profileAvatar');
const profileAccountText = document.getElementById('profileAccountText');
const profileName = document.getElementById('profileName');
const profileBanner = document.getElementById('profileBanner');
const profileAccent = document.getElementById('profileAccent');
const profileBackground = document.getElementById('profileBackground');
const profileDarkMode = document.getElementById('profileDarkMode');
const bannerSwatches = document.getElementById('bannerSwatches');
const saveProfile = document.getElementById('saveProfile');
const logoutButton = document.getElementById('logoutButton');
const profileStatus = document.getElementById('profileStatus');
const profilePreviewName = document.getElementById('profilePreviewName');
const profileThemeName = document.getElementById('profileThemeName');
const profileAccentValue = document.getElementById('profileAccentValue');
const profileBackgroundValue = document.getElementById('profileBackgroundValue');
const profileModeValue = document.getElementById('profileModeValue');

const USERS_KEY = 'goplanitUsers';
const SESSION_KEY = 'goplanitSession';
const PROFILE_KEY = 'goplanitProfile';

let session = getSession();

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
  if (!stored) return fallback;
  try {
    return JSON.parse(stored);
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function sanitizeEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function sanitizeColor(value, fallback) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value || '')) ? value : fallback;
}

function getInitials(name) {
  if (!name) return 'GP';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function getProfile() {
  const profile = loadJson(userKey(PROFILE_KEY), {
    banner: 'aurora',
    accent: '#22c55e',
    background: '#09121d',
    mode: 'light'
  });
  return {
    banner: sanitizeEnum(profile.banner, ['aurora', 'sunrise', 'midnight', 'meadow'], 'aurora'),
    accent: sanitizeColor(profile.accent, '#22c55e'),
    background: sanitizeColor(profile.background, '#09121d'),
    mode: sanitizeEnum(profile.mode, ['light', 'dark'], 'light')
  };
}

function applyProfile(profile) {
  document.body.dataset.banner = profile.banner;
  document.body.dataset.theme = profile.mode || 'light';
  document.documentElement.style.setProperty('--accent', profile.accent);
  document.documentElement.style.setProperty('--accent-strong', profile.accent);
  document.documentElement.style.setProperty('--custom-bg', profile.background);
}

function setActiveBanner(banner) {
  bannerSwatches.querySelectorAll('.banner-swatch').forEach((button) => {
    button.classList.toggle('active', button.dataset.banner === banner);
  });
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

function renderProfile() {
  const profile = getProfile();
  const name = session && session.name ? session.name : 'Planner';

  profileName.value = session && session.name ? session.name : '';
  profileBanner.value = profile.banner;
  profileAccent.value = profile.accent;
  profileBackground.value = profile.background;
  profileDarkMode.checked = profile.mode === 'dark';
  profileGreeting.textContent = `Make it yours, ${name.split(' ')[0]}.`;
  profileAvatar.textContent = getInitials(name);
  profileAccountText.textContent = session ? session.email : 'Guest planner';

  applyProfile(profile);
  setActiveBanner(profile.banner);
  renderPreview();
}

function renderPreview() {
  const name = profileName.value.trim() || 'Planner';
  const bannerLabel = profileBanner.value.charAt(0).toUpperCase() + profileBanner.value.slice(1);
  profilePreviewName.textContent = `Welcome back, ${name.split(' ')[0]}.`;
  profileThemeName.textContent = bannerLabel;
  profileAccentValue.textContent = profileAccent.value;
  profileBackgroundValue.textContent = profileBackground.value;
  profileModeValue.textContent = profileDarkMode.checked ? 'Dark' : 'Light';
}

async function saveName(name) {
  if (!session) return;
  if (window.GoPlanItDB) {
    try {
      const user = await window.GoPlanItDB.getUserByEmail(session.email);
      if (user) {
        await window.GoPlanItDB.updateUser({ ...user, name });
      }
    } catch (error) {
      console.warn('Profile database update failed. Falling back to local storage.', error);
      const users = loadJson(USERS_KEY, []);
      const updatedUsers = users.map((user) => user.email === session.email ? { ...user, name } : user);
      localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
    }
  } else {
    const users = loadJson(USERS_KEY, []);
    const updatedUsers = users.map((user) => user.email === session.email ? { ...user, name } : user);
    localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
  }
  session = { ...session, name };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

async function handleSaveProfile() {
  const name = profileName.value.trim() || 'Planner';
  const profile = {
    banner: sanitizeEnum(profileBanner.value, ['aurora', 'sunrise', 'midnight', 'meadow'], 'aurora'),
    accent: sanitizeColor(profileAccent.value, '#22c55e'),
    background: sanitizeColor(profileBackground.value, '#09121d'),
    mode: profileDarkMode.checked ? 'dark' : 'light'
  };

  await saveName(name);
  localStorage.setItem(userKey(PROFILE_KEY), JSON.stringify(profile));
  applyProfile(profile);
  setActiveBanner(profile.banner);
  renderPreview();
  profileAvatar.textContent = getInitials(name);
  profileGreeting.textContent = `Make it yours, ${name.split(' ')[0]}.`;
  profileStatus.textContent = 'Profile saved. Your dashboard and calendar will use this look.';
  showToast('Profile saved.');
}

function handleBannerClick(event) {
  const button = event.target.closest('.banner-swatch');
  if (!button) return;
  profileBanner.value = button.dataset.banner;
  const profile = {
    banner: profileBanner.value,
    accent: profileAccent.value,
    background: profileBackground.value,
    mode: profileDarkMode.checked ? 'dark' : 'light'
  };
  applyProfile(profile);
  setActiveBanner(profile.banner);
  renderPreview();
}

function handleLogout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = 'portal.html';
}

function initProfile() {
  renderProfile();
  bannerSwatches.addEventListener('click', handleBannerClick);
  profileName.addEventListener('input', renderPreview);
  profileAccent.addEventListener('input', () => {
    applyProfile({ banner: profileBanner.value, accent: profileAccent.value, background: profileBackground.value, mode: profileDarkMode.checked ? 'dark' : 'light' });
    renderPreview();
  });
  profileBackground.addEventListener('input', () => {
    applyProfile({ banner: profileBanner.value, accent: profileAccent.value, background: profileBackground.value, mode: profileDarkMode.checked ? 'dark' : 'light' });
    renderPreview();
  });
  profileDarkMode.addEventListener('change', () => {
    applyProfile({ banner: profileBanner.value, accent: profileAccent.value, background: profileBackground.value, mode: profileDarkMode.checked ? 'dark' : 'light' });
    renderPreview();
  });
  saveProfile.addEventListener('click', handleSaveProfile);
  logoutButton.addEventListener('click', handleLogout);
}

initProfile();

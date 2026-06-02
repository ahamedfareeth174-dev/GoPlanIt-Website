const NAV_SESSION_KEY = 'goplanitSession';
const NAV_PROFILE_KEY = 'goplanitProfile';
const PRIVATE_PAGES = [
  'calendar.html',
  'dashboard.html',
  'notes.html',
  'notifications.html',
  'profile.html',
  'search.html',
  'study.html'
];

function getNavSession() {
  const stored = localStorage.getItem(NAV_SESSION_KEY);
  if (!stored) return null;
  let session;
  try {
    session = JSON.parse(stored);
  } catch {
    localStorage.removeItem(NAV_SESSION_KEY);
    return null;
  }
  if (session.expiresAt && session.expiresAt < Date.now()) {
    localStorage.removeItem(NAV_SESSION_KEY);
    return null;
  }
  return session;
}

function getNavUserKey(baseKey) {
  const session = getNavSession();
  const id = session && session.email ? session.email : 'guest';
  return `${baseKey}:${id}`;
}

function applySavedProfileTheme() {
  const stored = localStorage.getItem(getNavUserKey(NAV_PROFILE_KEY));
  if (!stored) return;
  let profile;
  try {
    profile = JSON.parse(stored);
  } catch {
    localStorage.removeItem(getNavUserKey(NAV_PROFILE_KEY));
    return;
  }
  const mode = ['light', 'dark'].includes(profile.mode) ? profile.mode : 'light';
  const banner = ['aurora', 'sunrise', 'midnight', 'meadow'].includes(profile.banner) ? profile.banner : 'aurora';
  document.body.dataset.theme = mode;
  document.body.dataset.banner = banner;
  if (/^#[0-9a-fA-F]{6}$/.test(String(profile.accent || ''))) {
    document.documentElement.style.setProperty('--accent', profile.accent);
    document.documentElement.style.setProperty('--accent-strong', profile.accent);
  }
  if (/^#[0-9a-fA-F]{6}$/.test(String(profile.background || ''))) {
    document.documentElement.style.setProperty('--custom-bg', profile.background);
  }
}

function updateAuthOnlyNavigation() {
  const isLoggedIn = Boolean(getNavSession());
  document.querySelectorAll('.auth-only-search').forEach((link) => {
    link.hidden = !isLoggedIn;
  });
  document.querySelectorAll('.auth-only').forEach((link) => {
    link.hidden = !isLoggedIn;
  });

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  if (!isLoggedIn && PRIVATE_PAGES.includes(currentPage)) {
    window.location.href = 'portal.html';
  }
}

function getFocusableElements(container) {
  return [...container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((element) => element.offsetParent !== null);
}

function setupModalAccessibility() {
  document.addEventListener('keydown', (event) => {
    const modal = [...document.querySelectorAll('.modal-backdrop:not([hidden])')].at(-1);
    if (!modal) return;

    if (event.key === 'Escape') {
      const closeButton = modal.querySelector('[aria-label*="Close"], .modal-actions .btn-secondary, .action-btn');
      if (closeButton) closeButton.click();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = getFocusableElements(modal);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName !== 'hidden') return;
      const modal = mutation.target;
      if (!modal.hidden && modal.classList.contains('modal-backdrop')) {
        const first = getFocusableElements(modal)[0];
        if (first) window.setTimeout(() => first.focus(), 0);
      }
    });
  });

  document.querySelectorAll('.modal-backdrop').forEach((modal) => {
    observer.observe(modal, { attributes: true });
  });
}

updateAuthOnlyNavigation();
applySavedProfileTheme();
setupModalAccessibility();

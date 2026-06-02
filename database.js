window.GoPlanItDB = (() => {
  const DB_NAME = 'GoPlanItDatabase';
  const DB_VERSION = 1;
  const USERS_STORE = 'users';
  const CONTACT_STORE = 'contactMessages';

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB is not available in this browser.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(USERS_STORE)) {
          const users = db.createObjectStore(USERS_STORE, { keyPath: 'email' });
          users.createIndex('created', 'created');
        }
        if (!db.objectStoreNames.contains(CONTACT_STORE)) {
          const contacts = db.createObjectStore(CONTACT_STORE, { keyPath: 'id' });
          contacts.createIndex('created', 'created');
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function runStore(storeName, mode, action) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = action(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  }

  function generateSalt() {
    const values = new Uint8Array(16);
    crypto.getRandomValues(values);
    return Array.from(values).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  async function hashPassword(password, salt = '') {
    if (!crypto.subtle) {
      return `local-fallback:${salt}:${password}`;
    }
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );
    const digest = new Uint8Array(bits);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  async function verifyPassword(password, user) {
    if (user.passwordSalt) {
      return user.passwordHash === await hashPassword(password, user.passwordSalt);
    }
    if (user.passwordHash) {
      return user.passwordHash === await hashPassword(password, '');
    }
    return user.password === password;
  }

  async function addUser(user) {
    return runStore(USERS_STORE, 'readwrite', (store) => store.add(user));
  }

  async function updateUser(user) {
    return runStore(USERS_STORE, 'readwrite', (store) => store.put(user));
  }

  async function getUserByEmail(email) {
    return runStore(USERS_STORE, 'readonly', (store) => store.get(email));
  }

  async function getAllUsers() {
    return runStore(USERS_STORE, 'readonly', (store) => store.getAll());
  }

  async function addContactMessage(message) {
    return runStore(CONTACT_STORE, 'readwrite', (store) => store.add(message));
  }

  async function migrateLegacyUsers() {
    const legacy = JSON.parse(localStorage.getItem('goplanitUsers') || '[]');
    if (!legacy.length) return;

    const existingUsers = await getAllUsers();
    const existingEmails = new Set(existingUsers.map((user) => user.email));
    for (const user of legacy) {
      if (existingEmails.has(user.email)) continue;
      const passwordSalt = user.passwordSalt || generateSalt();
      const passwordHash = user.passwordHash && user.passwordSalt
        ? user.passwordHash
        : await hashPassword(user.password || '', passwordSalt);
      await addUser({
        id: user.id || Date.now().toString(),
        name: user.name,
        username: user.username || '',
        email: user.email,
        passwordSalt,
        passwordHash,
        created: user.created || new Date().toISOString()
      });
    }
  }

  return {
    addContactMessage,
    addUser,
    generateSalt,
    getAllUsers,
    getUserByEmail,
    hashPassword,
    migrateLegacyUsers,
    updateUser,
    verifyPassword
  };
})();

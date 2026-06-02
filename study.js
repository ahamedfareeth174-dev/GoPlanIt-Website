const studyTimer = document.getElementById('studyTimer');
const studyTimerLarge = document.getElementById('studyTimerLarge');
const studyTimerLabel = document.getElementById('studyTimerLabel');
const studyPlanList = document.getElementById('studyPlanList');
const studyMinutes = document.getElementById('studyMinutes');
const studySound = document.getElementById('studySound');
const startStudy = document.getElementById('startStudy');
const pauseStudy = document.getElementById('pauseStudy');
const resetStudy = document.getElementById('resetStudy');
const testSound = document.getElementById('testSound');
const studyAlarmModal = document.getElementById('studyAlarmModal');
const stopAlarm = document.getElementById('stopAlarm');
const restartStudy = document.getElementById('restartStudy');
const studyMaterialInput = document.getElementById('studyMaterialInput');
const studyMaterialNotes = document.getElementById('studyMaterialNotes');
const studyNoteFont = document.getElementById('studyNoteFont');
const summarizePastedNotes = document.getElementById('summarizePastedNotes');
const exportStudyWord = document.getElementById('exportStudyWord');
const exportStudyPdf = document.getElementById('exportStudyPdf');
const studyMaterialList = document.getElementById('studyMaterialList');
const quizMaterialSelect = document.getElementById('quizMaterialSelect');
const quizQuestionCount = document.getElementById('quizQuestionCount');
const generateQuiz = document.getElementById('generateQuiz');
const checkQuiz = document.getElementById('checkQuiz');
const quizOutput = document.getElementById('quizOutput');

const TASKS_KEY = 'goplanitTasks';
const NOTES_KEY = 'goplanitNotes';
const SESSION_KEY = 'goplanitSession';
const PROFILE_KEY = 'goplanitProfile';
const STUDY_SETTINGS_KEY = 'goplanitStudySettings';
const STUDY_MATERIALS_KEY = 'goplanitStudyMaterials';
const MAX_TEXT_UPLOAD_BYTES = 1024 * 1024;
const MAX_DOCUMENT_UPLOAD_BYTES = 5 * 1024 * 1024;
let secondsLeft = 25 * 60;
let timerId = null;
let alarmLoopId = null;
let audioContext = null;
let studyMaterials = [];
let currentQuiz = [];

const NOTE_FONTS = {
  system: { label: 'Clean sans', stack: 'Inter, system-ui, sans-serif' },
  serif: { label: 'Book serif', stack: 'Georgia, "Times New Roman", serif' },
  mono: { label: 'Study mono', stack: '"Courier New", Courier, monospace' },
  rounded: { label: 'Rounded', stack: '"Trebuchet MS", "Segoe UI", sans-serif' },
  script: { label: 'Handwritten', stack: '"Comic Sans MS", "Segoe Print", cursive' }
};

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

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
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

function sanitizePlainText(value, limit = 8000) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .slice(0, limit);
}

function sanitizeFileName(value) {
  return sanitizePlainText(value, 120).replace(/[<>:"/\\|?*]+/g, ' ').trim() || 'Study material';
}

function sanitizeFont(value) {
  return NOTE_FONTS[value] ? value : 'system';
}

function getFontStack(value) {
  return NOTE_FONTS[sanitizeFont(value)].stack;
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

function getExportDate() {
  return new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function renderTimer() {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const text = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  studyTimer.textContent = text;
  studyTimerLarge.textContent = text;
}

function getStudySettings() {
  return loadJson(userKey(STUDY_SETTINGS_KEY), {
    minutes: 25,
    sound: 'digital'
  });
}

function saveStudySettings() {
  saveJson(userKey(STUDY_SETTINGS_KEY), {
    minutes: Number(studyMinutes.value) || 25,
    sound: studySound.value
  });
}

function setTimerFromMinutes(minutes) {
  secondsLeft = Math.max(1, Math.min(180, Number(minutes) || 25)) * 60;
  studyMinutes.value = String(secondsLeft / 60);
  saveStudySettings();
  renderTimer();
}

function renderStudyPlan() {
  const today = toDateKey(new Date());
  const tasks = loadJson(userKey(TASKS_KEY), [])
    .filter((task) => !task.completed && (task.dueDate === today || task.priority === 'high'))
    .slice(0, 5);
  const notes = loadJson(userKey(NOTES_KEY), [])
    .filter((note) => note.pinned && !note.archived)
    .slice(0, 3);
  const items = [
    ...tasks.map((task) => ({ title: task.text, meta: `${task.category || 'task'} - ${task.priority || 'medium'} priority`, body: task.notes || 'Work through this item during a focus block.' })),
    ...notes.map((note) => ({ title: note.title, meta: 'Pinned note', body: note.body || 'Review this note before your next task.' }))
  ];

  studyPlanList.innerHTML = items.length ? items.map((item, index) => `
    <article class="study-plan-card">
      <span>${index + 1}</span>
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.meta)}</small>
        <p>${escapeHtml(item.body).slice(0, 160)}</p>
      </div>
    </article>
  `).join('') : `
    <div class="empty-state">
      <strong>No study plan yet</strong>
      <p>Add today's tasks or pin notes to build a focused study list.</p>
    </div>
  `;
}

function getReadableFileType(file) {
  const name = sanitizeFileName(file.name).toLowerCase();
  if (name.endsWith('.pdf')) return 'PDF study guide';
  if (name.endsWith('.doc') || name.endsWith('.docx')) return 'Word study guide';
  if (name.endsWith('.csv')) return 'CSV notes';
  if (name.endsWith('.json')) return 'JSON notes';
  if (name.endsWith('.md')) return 'Markdown notes';
  return 'Notes';
}

function isDocumentGuideFile(file) {
  const name = sanitizeFileName(file.name).toLowerCase();
  return ['.pdf', '.doc', '.docx'].some((ext) => name.endsWith(ext)) && file.size <= MAX_DOCUMENT_UPLOAD_BYTES;
}

function buildSimulatedGuideText(file) {
  const title = sanitizeFileName(file.name).replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
  const frequentTitleWords = getWordFrequency(title);
  const topicWords = frequentTitleWords.length ? frequentTitleWords : title.split(/\s+/).filter((word) => word.length > 2);
  const topics = topicWords.length ? topicWords.slice(0, 5) : ['main ideas', 'key terms', 'examples'];
  return [
    `Fake AI scan for ${title}.`,
    `The guide appears to focus on ${topics.join(', ')}.`,
    `Review the main ideas, important vocabulary, cause and effect relationships, and example problems before the quiz.`,
    `Pay attention to definitions, comparisons, timelines, formulas, and any repeated terms from the study guide.`,
    `A strong answer should connect evidence from the guide with the correct concept.`
  ].join(' ');
}

function getWordFrequency(text) {
  const stopWords = new Set(['the', 'and', 'for', 'that', 'this', 'with', 'from', 'you', 'are', 'was', 'were', 'have', 'has', 'into', 'your', 'about', 'will', 'can', 'not', 'but', 'all', 'our', 'their', 'there', 'which']);
  const counts = {};
  text.toLowerCase().match(/[a-z0-9']+/g)?.forEach((word) => {
    if (word.length < 4 || stopWords.has(word)) return;
    counts[word] = (counts[word] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([word]) => word);
}

function summarizeText(text) {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  if (!cleanText) {
    return {
      summary: 'No readable text was found to summarize.',
      bullets: ['Add pasted notes or a readable note file for a better summary.'],
      keywords: []
    };
  }

  const sentences = cleanText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleanText];
  const keywords = getWordFrequency(cleanText);
  const scored = sentences.map((sentence) => {
    const lower = sentence.toLowerCase();
    const score = keywords.reduce((sum, keyword) => sum + (lower.includes(keyword) ? 1 : 0), 0) + Math.min(sentence.length / 120, 1);
    return { sentence: sentence.trim(), score };
  });
  const bullets = scored.sort((a, b) => b.score - a.score).slice(0, 3).map((item) => item.sentence);
  return {
    summary: bullets.join(' '),
    bullets,
    keywords
  };
}

function renderStudyMaterials() {
  studyMaterialList.innerHTML = '';
  if (!studyMaterials.length) {
    studyMaterialList.innerHTML = `
      <div class="empty-state compact">
        <strong>No study materials yet</strong>
        <p>Upload a note file or paste notes to generate a summary card.</p>
      </div>
    `;
    renderQuizMaterialOptions();
    return;
  }

  studyMaterials.forEach((item) => {
    const font = sanitizeFont(item.font);
    const card = document.createElement('article');
    card.className = 'study-material-card';
    card.dataset.font = font;
    card.innerHTML = `
      <div class="study-material-head">
        <div>
          <span>${escapeHtml(item.type)}</span>
          <strong>${escapeHtml(item.name)}</strong>
        </div>
        <div class="study-material-tools">
          <label>
            Font
            <select data-material-font="${item.id}">
              ${Object.entries(NOTE_FONTS).map(([value, option]) => `<option value="${value}"${value === font ? ' selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
            </select>
          </label>
          <button class="action-btn" type="button" data-delete-material="${item.id}" title="Delete material">x</button>
        </div>
      </div>
      <div class="study-material-content">
        <p>${escapeHtml(item.summary)}</p>
        <ul>
          ${item.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}
        </ul>
        ${item.text ? `<details><summary>Full notes</summary><p class="study-full-note">${escapeHtml(item.text)}</p></details>` : ''}
      </div>
      ${item.keywords.length ? `<div class="material-keywords">${item.keywords.map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join('')}</div>` : ''}
    `;
    studyMaterialList.appendChild(card);
  });
  renderQuizMaterialOptions();
}

function renderQuizMaterialOptions() {
  if (!quizMaterialSelect) return;
  const selected = quizMaterialSelect.value;
  quizMaterialSelect.innerHTML = studyMaterials.length
    ? [
      '<option value="all">All study materials</option>',
      ...studyMaterials.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`)
    ].join('')
    : '<option value="">Add a guide first</option>';
  if ([...quizMaterialSelect.options].some((option) => option.value === selected)) {
    quizMaterialSelect.value = selected;
  }
}

function saveStudyMaterials() {
  saveJson(userKey(STUDY_MATERIALS_KEY), studyMaterials);
}

function addMaterial(name, type, text, fallbackMessage = '') {
  const safeText = sanitizePlainText(text, 20000).trim();
  const summary = summarizeText(safeText);
  const material = {
    id: Date.now().toString() + Math.random().toString(16).slice(2),
    name: sanitizeFileName(name),
    type,
    font: sanitizeFont(studyNoteFont.value),
    text: safeText,
    summary: safeText ? summary.summary : sanitizePlainText(fallbackMessage, 500),
    bullets: safeText ? summary.bullets : [sanitizePlainText(fallbackMessage, 500)],
    keywords: summary.keywords,
    created: new Date().toISOString()
  };
  studyMaterials = [material, ...studyMaterials];
  saveStudyMaterials();
  renderStudyMaterials();
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function canReadFile(file) {
  const name = sanitizeFileName(file.name).toLowerCase();
  return file.size <= MAX_TEXT_UPLOAD_BYTES && (
    file.type.startsWith('text/') ||
    ['.txt', '.md', '.csv', '.json'].some((ext) => name.endsWith(ext))
  );
}

async function handleMaterialUpload(event) {
  const files = Array.from(event.target.files || []);
  let skippedCount = 0;
  for (const file of files) {
    const type = getReadableFileType(file);
    if (canReadFile(file)) {
      const text = await readFileAsText(file);
      addMaterial(sanitizeFileName(file.name), type, text);
    } else if (isDocumentGuideFile(file)) {
      addMaterial(sanitizeFileName(file.name), type, buildSimulatedGuideText(file));
    } else {
      skippedCount += 1;
    }
  }
  if (skippedCount) {
    studyTimerLabel.textContent = 'Unsupported, oversized, or unsafe files were skipped.';
  }
  studyMaterialInput.value = '';
}

function handlePastedSummary() {
  const text = sanitizePlainText(studyMaterialNotes.value, 20000).trim();
  if (!text) return;
  addMaterial('Pasted study notes', 'Notes', text);
  studyMaterialNotes.value = '';
}

function buildStudyExportHtml() {
  const created = getExportDate();
  const cards = studyMaterials.map((item) => {
    const font = sanitizeFont(item.font);
    return `
      <section class="note" style="font-family: ${getFontStack(font)};">
        <p class="meta">${escapeHtml(item.type)} - ${escapeHtml(NOTE_FONTS[font].label)}</p>
        <h2>${escapeHtml(item.name)}</h2>
        <p>${escapeHtml(item.summary)}</p>
        <ul>${item.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul>
        ${item.text ? `<h3>Full notes</h3><p class="full">${escapeHtml(item.text)}</p>` : ''}
      </section>
    `;
  }).join('');

  return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>DueBoard Study Notes</title>
        <style>
          body { color: #263238; font-family: Inter, Arial, sans-serif; line-height: 1.55; margin: 40px; }
          h1 { margin: 0 0 6px; }
          .date, .meta { color: #6f6658; }
          .note { border-top: 1px solid #d8cabb; margin-top: 24px; padding-top: 20px; page-break-inside: avoid; }
          .note h2 { margin: 4px 0 10px; }
          .note h3 { margin: 18px 0 8px; }
          .full { white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <h1>DueBoard Study Notes</h1>
        <p class="date">Exported ${escapeHtml(created)}</p>
        ${cards || '<p>No study materials yet.</p>'}
      </body>
    </html>`;
}

function exportMaterialsAsWord() {
  if (!studyMaterials.length) {
    studyTimerLabel.textContent = 'Add study notes before exporting.';
    return;
  }
  downloadFile('dueboard-study-notes.doc', 'application/msword', buildStudyExportHtml());
  studyTimerLabel.textContent = 'Study notes exported as a Word document.';
}

function exportMaterialsAsPdf() {
  if (!studyMaterials.length) {
    studyTimerLabel.textContent = 'Add study notes before exporting.';
    return;
  }
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    studyTimerLabel.textContent = 'Allow popups to export study notes as a PDF.';
    return;
  }
  printWindow.document.open();
  printWindow.document.write(buildStudyExportHtml());
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  studyTimerLabel.textContent = 'Use the print dialog to save your notes as a PDF.';
}

function shortenText(text, limit = 130) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length > limit ? `${clean.slice(0, limit - 3).trim()}...` : clean;
}

function shuffleItems(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function getQuizMaterials() {
  if (!studyMaterials.length) return [];
  if (!quizMaterialSelect || quizMaterialSelect.value === 'all') return studyMaterials;
  return studyMaterials.filter((item) => item.id === quizMaterialSelect.value);
}

function buildQuizQuestion(seed, material, index) {
  const fallbackOptions = [
    'Ignore the guide and guess from memory.',
    'Focus only on formatting and page numbers.',
    'Skip examples and review only the title.',
    'Choose the longest answer without checking the idea.',
    'Study unrelated terms first.'
  ];
  const correct = shortenText(seed, 150);
  const options = shuffleItems([correct, ...shuffleItems(fallbackOptions).slice(0, 3)]);
  return {
    prompt: index % 2 === 0
      ? `According to ${material.name}, which point matters most?`
      : `Which answer best matches the study guide?`,
    options,
    answer: options.indexOf(correct),
    explanation: `Fake AI pulled this from ${material.name}: ${correct}`
  };
}

function buildKeywordQuestion(keyword, material) {
  const distractors = ['unrelated topic', 'random detail', 'page layout', 'file format', 'timer setting'];
  const correct = `Review "${keyword}" as a key term from the guide.`;
  const options = shuffleItems([correct, ...shuffleItems(distractors).slice(0, 3).map((item) => `Focus mainly on ${item}.`)]);
  return {
    prompt: `What should you review for ${material.name}?`,
    options,
    answer: options.indexOf(correct),
    explanation: `"${keyword}" appeared as one of the strongest study terms.`
  };
}

function createQuiz() {
  const materials = getQuizMaterials();
  if (!materials.length) {
    currentQuiz = [];
    renderQuiz();
    studyTimerLabel.textContent = 'Add a study guide before generating a quiz.';
    return;
  }

  const seeds = materials.flatMap((material) => {
    const summarySeeds = [material.summary, ...material.bullets].filter(Boolean);
    const keywordSeeds = material.keywords.map((keyword) => ({ keyword, material }));
    return [
      ...summarySeeds.map((text) => ({ text, material })),
      ...keywordSeeds
    ];
  });
  const count = Math.max(3, Math.min(10, Number(quizQuestionCount.value) || 5));

  currentQuiz = shuffleItems(seeds).slice(0, count).map((seed, index) => {
    if (seed.keyword) return buildKeywordQuestion(seed.keyword, seed.material);
    return buildQuizQuestion(seed.text, seed.material, index);
  });
  renderQuiz();
  studyTimerLabel.textContent = 'Fake AI quiz generated.';
}

function renderQuiz() {
  if (!quizOutput) return;
  if (!currentQuiz.length) {
    quizOutput.innerHTML = `
      <div class="empty-state compact">
        <strong>No quiz yet</strong>
        <p>Add a study guide, then generate a practice quiz.</p>
      </div>
    `;
    return;
  }

  quizOutput.innerHTML = `
    ${currentQuiz.map((question, questionIndex) => `
      <article class="quiz-card">
        <div class="quiz-question-head">
          <span>${questionIndex + 1}</span>
          <strong>${escapeHtml(question.prompt)}</strong>
        </div>
        <div class="quiz-options">
          ${question.options.map((option, optionIndex) => `
            <label>
              <input type="radio" name="quiz-${questionIndex}" value="${optionIndex}" />
              <span>${escapeHtml(option)}</span>
            </label>
          `).join('')}
        </div>
        <p class="quiz-explanation" hidden>${escapeHtml(question.explanation)}</p>
      </article>
    `).join('')}
  `;
}

function checkQuizAnswers() {
  if (!currentQuiz.length) {
    studyTimerLabel.textContent = 'Generate a quiz first.';
    return;
  }
  let correct = 0;
  currentQuiz.forEach((question, questionIndex) => {
    const selected = quizOutput.querySelector(`input[name="quiz-${questionIndex}"]:checked`);
    const card = quizOutput.querySelectorAll('.quiz-card')[questionIndex];
    const explanation = card.querySelector('.quiz-explanation');
    const selectedIndex = selected ? Number(selected.value) : -1;
    const isCorrect = selectedIndex === question.answer;
    if (isCorrect) correct += 1;
    card.classList.toggle('correct', isCorrect);
    card.classList.toggle('incorrect', !isCorrect);
    explanation.hidden = false;
  });
  quizOutput.querySelector('.quiz-score')?.remove();
  quizOutput.insertAdjacentHTML('afterbegin', `
    <div class="quiz-score">
      <strong>${correct}/${currentQuiz.length}</strong>
      <span>${correct === currentQuiz.length ? 'Clean sweep.' : 'Review the explanations, then try another quiz.'}</span>
    </div>
  `);
}

function startTimer() {
  if (timerId) return;
  stopAlarmLoop();
  studyTimerLabel.textContent = 'Focus session running.';
  timerId = window.setInterval(() => {
    secondsLeft = Math.max(0, secondsLeft - 1);
    renderTimer();
    if (secondsLeft === 0) {
      window.clearInterval(timerId);
      timerId = null;
      studyTimerLabel.textContent = 'Session complete. Take a break.';
      showAlarmPopup();
    }
  }, 1000);
}

function pauseTimer() {
  window.clearInterval(timerId);
  timerId = null;
  studyTimerLabel.textContent = 'Paused.';
}

function resetTimer() {
  pauseTimer();
  stopAlarmLoop();
  setTimerFromMinutes(studyMinutes.value);
  studyTimerLabel.textContent = 'Focus session ready.';
  renderTimer();
}

function playTone(frequency, startTime, duration, gainValue = 0.08, type = 'sine') {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.03);
}

function playSweep(startFrequency, endFrequency, startTime, duration, gainValue = 0.09) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(startFrequency, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, startTime + duration);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.03);
}

function playStudySound() {
  audioContext = audioContext || new AudioContext();
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  const now = audioContext.currentTime;
  const sound = studySound.value;

  if (sound === 'urgent') {
    for (let index = 0; index < 8; index += 1) {
      playTone(index % 2 ? 980 : 780, now + index * 0.16, 0.1, 0.13, 'square');
    }
  } else if (sound === 'siren') {
    for (let index = 0; index < 4; index += 1) {
      playSweep(520, 1180, now + index * 0.34, 0.28, 0.11);
    }
  } else if (sound === 'school') {
    for (let index = 0; index < 3; index += 1) {
      playTone(740, now + index * 0.34, 0.22, 0.12, 'triangle');
      playTone(560, now + index * 0.34 + 0.12, 0.2, 0.1, 'triangle');
    }
  } else {
    for (let index = 0; index < 6; index += 1) {
      playTone(880, now + index * 0.2, 0.12, 0.12, 'square');
    }
  }
}

function startAlarmLoop() {
  stopAlarmLoop();
  playStudySound();
  alarmLoopId = window.setInterval(playStudySound, 1700);
}

function stopAlarmLoop() {
  if (alarmLoopId) {
    window.clearInterval(alarmLoopId);
    alarmLoopId = null;
  }
}

function showAlarmPopup() {
  studyAlarmModal.hidden = false;
  startAlarmLoop();
}

function hideAlarmPopup() {
  studyAlarmModal.hidden = true;
  stopAlarmLoop();
  studyTimerLabel.textContent = 'Alarm stopped. Take a break.';
}

function handleTimerSettingChange() {
  pauseTimer();
  setTimerFromMinutes(studyMinutes.value);
  studyTimerLabel.textContent = 'Custom focus session ready.';
}

function handlePresetClick(event) {
  const button = event.target.closest('[data-minutes]');
  if (!button) return;
  pauseTimer();
  setTimerFromMinutes(button.dataset.minutes);
  studyTimerLabel.textContent = `${button.dataset.minutes}-minute session ready.`;
}

function initStudy() {
  applyProfileTheme();
  studyMaterials = loadJson(userKey(STUDY_MATERIALS_KEY), []);
  const settings = getStudySettings();
  studySound.value = ['digital', 'urgent', 'siren', 'school'].includes(settings.sound) ? settings.sound : 'digital';
  setTimerFromMinutes(settings.minutes);
  renderTimer();
  renderStudyPlan();
  renderStudyMaterials();
  renderQuiz();
  studyMinutes.addEventListener('change', handleTimerSettingChange);
  studySound.addEventListener('change', saveStudySettings);
  document.querySelector('.study-presets').addEventListener('click', handlePresetClick);
  startStudy.addEventListener('click', startTimer);
  pauseStudy.addEventListener('click', pauseTimer);
  resetStudy.addEventListener('click', resetTimer);
  testSound.addEventListener('click', playStudySound);
  stopAlarm.addEventListener('click', hideAlarmPopup);
  restartStudy.addEventListener('click', () => {
    hideAlarmPopup();
    resetTimer();
    startTimer();
  });
  studyMaterialInput.addEventListener('change', handleMaterialUpload);
  studyNoteFont.addEventListener('change', () => {
    studyMaterialNotes.dataset.font = sanitizeFont(studyNoteFont.value);
  });
  summarizePastedNotes.addEventListener('click', handlePastedSummary);
  exportStudyWord.addEventListener('click', exportMaterialsAsWord);
  exportStudyPdf.addEventListener('click', exportMaterialsAsPdf);
  generateQuiz.addEventListener('click', createQuiz);
  checkQuiz.addEventListener('click', checkQuizAnswers);
  studyMaterialList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-delete-material]');
    if (!button) return;
    studyMaterials = studyMaterials.filter((item) => item.id !== button.dataset.deleteMaterial);
    saveStudyMaterials();
    renderStudyMaterials();
  });
  studyMaterialList.addEventListener('change', (event) => {
    const select = event.target.closest('[data-material-font]');
    if (!select) return;
    studyMaterials = studyMaterials.map((item) => item.id === select.dataset.materialFont
      ? { ...item, font: sanitizeFont(select.value) }
      : item);
    saveStudyMaterials();
    renderStudyMaterials();
  });
  studyMaterialNotes.dataset.font = sanitizeFont(studyNoteFont.value);
}

initStudy();


const fileInput = document.querySelector('#document-input');
const textSource = document.querySelector('#text-source');
const wordCount = document.querySelector('#word-count');
const fileStatus = document.querySelector('#file-status');
const speedRange = document.querySelector('#speed-range');
const modalSpeedRange = document.querySelector('#modal-speed-range');
const speedOutput = document.querySelector('#speed-output');
const modalSpeedOutput = document.querySelector('#modal-speed-output');
const startButton = document.querySelector('#start-reading');
const readerModal = document.querySelector('#reader-modal');
const playPauseButton = document.querySelector('#play-pause');
const rsvpOutput = document.querySelector('#rsvp-output');
const readingProgress = document.querySelector('#reading-progress');
const themeToggle = document.querySelector('#theme-toggle');

const PDFJS_MODULE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
const PDF_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
let words = [];
let currentIndex = 0;
let wordsPerScreen = 1;
let timer = null;

function normalizeText(text) { return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
function currentChunks() { const chunks = []; for (let i = 0; i < words.length; i += wordsPerScreen) chunks.push(words.slice(i, i + wordsPerScreen).join(' ')); return chunks; }
function updateWordCount() { const text = normalizeText(textSource.value); wordCount.textContent = `${text ? text.split(' ').length : 0} palabras`; startButton.disabled = !text; }
function updateProgress() { const chunks = currentChunks(); const read = Math.min(currentIndex, chunks.length); readingProgress.value = chunks.length ? Math.round((read / chunks.length) * 100) : 0; }
function showCurrentChunk() { const chunks = currentChunks(); rsvpOutput.textContent = chunks[currentIndex] ?? 'Lectura finalizada'; updateProgress(); }
function stopReading() { clearTimeout(timer); timer = null; playPauseButton.innerHTML = '<span class="pause-icon" aria-hidden="true">▶</span><span>Continuar</span>'; playPauseButton.setAttribute('aria-label', 'Continuar lectura'); }
function scheduleNext() { const delay = Math.max(80, (60_000 / Number(speedRange.value)) * wordsPerScreen); timer = window.setTimeout(advance, delay); }
function advance() { const chunks = currentChunks(); if (currentIndex >= chunks.length) { rsvpOutput.textContent = 'Lectura finalizada'; updateProgress(); stopReading(); return; } showCurrentChunk(); currentIndex += 1; scheduleNext(); }
function startReading() { if (!words.length) return; clearTimeout(timer); playPauseButton.innerHTML = '<span class="pause-icon" aria-hidden="true">Ⅱ</span><span>Pausar</span>'; playPauseButton.setAttribute('aria-label', 'Pausar lectura'); if (currentIndex >= currentChunks().length) currentIndex = 0; advance(); }
function setWordsPerScreen(size) {
  const previousSize = wordsPerScreen;
  wordsPerScreen = Number(size);
  currentIndex = Math.floor((currentIndex * previousSize) / wordsPerScreen);
  document.querySelectorAll('[data-size]').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.size) === wordsPerScreen)));
  if (readerModal.open) {
    showCurrentChunk();
    if (timer) { stopReading(); startReading(); }
  }
}
function setSpeed(value) { speedRange.value = value; modalSpeedRange.value = value; speedOutput.textContent = value; modalSpeedOutput.textContent = `${value} ppm`; if (timer) { stopReading(); startReading(); } }
function prepareText() { words = normalizeText(textSource.value).split(' ').filter(Boolean); currentIndex = 0; updateWordCount(); }
async function readPdfFile(file) { const pdfjsLib = await import(PDFJS_MODULE_URL); pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL; const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise; const pages = []; for (let number = 1; number <= pdf.numPages; number += 1) { const content = await (await pdf.getPage(number)).getTextContent(); pages.push(content.items.map((item) => item.str).join(' ')); } return pages.join('\n'); }
async function extractFile(file) { if (file.name.toLowerCase().endsWith('.pdf')) return readPdfFile(file); if (file.name.toLowerCase().endsWith('.docx')) { if (!globalThis.mammoth) throw new Error('El lector de Word no está disponible.'); return (await globalThis.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value; } return new TextDecoder().decode(await file.arrayBuffer()); }

textSource.addEventListener('input', updateWordCount);
fileInput.addEventListener('change', async ({ target }) => { const [file] = target.files; if (!file) return; fileStatus.textContent = `Procesando ${file.name}…`; try { textSource.value = await extractFile(file); prepareText(); fileStatus.textContent = `${file.name} listo para leer`; } catch (error) { fileStatus.textContent = error.message || 'No fue posible leer el documento.'; } });
speedRange.addEventListener('input', () => setSpeed(speedRange.value)); modalSpeedRange.addEventListener('input', () => setSpeed(modalSpeedRange.value));
document.querySelectorAll('[data-size]').forEach((button) => button.addEventListener('click', () => setWordsPerScreen(button.dataset.size)));
startButton.addEventListener('click', () => { prepareText(); if (!words.length) return; readerModal.showModal(); showCurrentChunk(); startReading(); });
playPauseButton.addEventListener('click', () => timer ? stopReading() : startReading());
readerModal.addEventListener('cancel', () => stopReading());
themeToggle.addEventListener('click', () => { const dark = document.documentElement.dataset.theme !== 'dark'; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; themeToggle.setAttribute('aria-pressed', String(dark)); themeToggle.setAttribute('aria-label', dark ? 'Activar modo claro' : 'Activar modo oscuro'); themeToggle.innerHTML = `<span aria-hidden="true">${dark ? '☾' : '☼'}</span><span class="theme-label">${dark ? 'Oscuro' : 'Claro'}</span>`; });
updateWordCount();

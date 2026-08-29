const fileInput = document.querySelector('#document-input');
const textSource = document.querySelector('#text-source');
const speedRange = document.querySelector('#speed-range');
const speedOutput = document.querySelector('#speed-output');
const chunkSize = document.querySelector('#chunk-size');
const generateButton = document.querySelector('#generate-output');
const playPauseButton = document.querySelector('#play-pause');
const restartButton = document.querySelector('#restart');
const rsvpOutput = document.querySelector('#rsvp-output');
const readingProgress = document.querySelector('#reading-progress');
const readingStatus = document.querySelector('#reading-status');

const TEXT_EXTENSIONS = ['txt', 'md', 'csv', 'json', 'html', 'htm', 'xml'];
const PDFJS_MODULE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
const PDF_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

let chunks = [];
let currentIndex = 0;
let timer = null;

function getFileExtension(fileName) {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

function setStatus(message, isError = false) {
  readingStatus.textContent = message;
  readingStatus.classList.toggle('error', isError);
}

function normalizeText(text) {
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildChunks(words, size) {
  const output = [];
  for (let index = 0; index < words.length; index += size) {
    output.push(words.slice(index, index + size).join(' '));
  }
  return output;
}

function updateProgress() {
  const percent = chunks.length ? Math.round((currentIndex / chunks.length) * 100) : 0;
  readingProgress.value = percent;
  readingProgress.textContent = `${percent}%`;
  if (chunks.length) {
    setStatus(`${chunks.length} segmentos · ${Math.min(currentIndex, chunks.length)} leídos`);
  }
}

function stopReading() {
  clearInterval(timer);
  timer = null;
  playPauseButton.textContent = 'Reproducir';
}

function showCurrentChunk() {
  if (!chunks.length) return;
  rsvpOutput.textContent = chunks[currentIndex] ?? 'Lectura finalizada';
  updateProgress();
}

function advance() {
  if (currentIndex >= chunks.length) {
    rsvpOutput.textContent = 'Lectura finalizada';
    updateProgress();
    stopReading();
    return;
  }
  showCurrentChunk();
  currentIndex += 1;
}

function startReading() {
  if (!chunks.length) return;
  const wordsPerMinute = Number(speedRange.value);
  const delay = Math.max(80, (60_000 / wordsPerMinute) * Number(chunkSize.value));
  playPauseButton.textContent = 'Pausar';
  advance();
  timer = setInterval(advance, delay);
}

function resetReader(message = 'Carga o pega un texto para comenzar') {
  stopReading();
  chunks = [];
  currentIndex = 0;
  playPauseButton.disabled = true;
  restartButton.disabled = true;
  rsvpOutput.textContent = message;
  readingProgress.value = 0;
  readingProgress.textContent = '0%';
}

function generateOutput() {
  stopReading();
  const cleanText = normalizeText(textSource.value);
  const words = cleanText ? cleanText.split(' ') : [];
  chunks = buildChunks(words, Number(chunkSize.value));
  currentIndex = 0;
  playPauseButton.disabled = chunks.length === 0;
  restartButton.disabled = chunks.length === 0;
  rsvpOutput.textContent = chunks[0] ?? 'No hay texto para mostrar';
  setStatus(`${words.length} palabras listas`);
  updateProgress();
}

async function readTextFile(file) {
  const buffer = await file.arrayBuffer();

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('iso-8859-1').decode(buffer);
  }
}

async function readPdfFile(file) {
  const pdfjsLib = await import(PDFJS_MODULE_URL);

  pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(' '));
  }

  return pages.join('\n\n');
}

async function readDocxFile(file) {
  if (!globalThis.mammoth) {
    throw new Error('No se pudo cargar el lector DOCX. Revisa tu conexión e inténtalo otra vez.');
  }

  const result = await globalThis.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
}

async function extractTextFromFile(file) {
  const extension = getFileExtension(file.name);

  if (file.type === 'application/pdf' || extension === 'pdf') {
    return readPdfFile(file);
  }

  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || extension === 'docx') {
    return readDocxFile(file);
  }

  if (file.type.startsWith('text/') || TEXT_EXTENSIONS.includes(extension)) {
    return readTextFile(file);
  }

  throw new Error('Formato no soportado. Usa TXT, Markdown, CSV, JSON, HTML, XML, PDF o DOCX.');
}

fileInput.addEventListener('change', async (event) => {
  const [file] = event.target.files;
  if (!file) return;

  resetReader('Extrayendo texto...');
  setStatus(`Leyendo ${file.name}...`);

  try {
    const extractedText = await extractTextFromFile(file);
    textSource.value = extractedText;
    generateOutput();
  } catch (error) {
    textSource.value = '';
    resetReader('No se pudo extraer texto legible');
    setStatus(error.message, true);
  }
});

speedRange.addEventListener('input', () => {
  speedOutput.textContent = speedRange.value;
  if (timer) {
    stopReading();
    startReading();
  }
});

chunkSize.addEventListener('change', generateOutput);
generateButton.addEventListener('click', generateOutput);
playPauseButton.addEventListener('click', () => (timer ? stopReading() : startReading()));
restartButton.addEventListener('click', () => {
  stopReading();
  currentIndex = 0;
  showCurrentChunk();
});

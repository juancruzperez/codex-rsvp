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

let chunks = [];
let currentIndex = 0;
let timer = null;

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
  readingStatus.textContent = `${chunks.length} segmentos · ${Math.min(currentIndex, chunks.length)} leídos`;
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

function generateOutput() {
  stopReading();
  const cleanText = normalizeText(textSource.value);
  const words = cleanText ? cleanText.split(' ') : [];
  chunks = buildChunks(words, Number(chunkSize.value));
  currentIndex = 0;
  playPauseButton.disabled = chunks.length === 0;
  restartButton.disabled = chunks.length === 0;
  rsvpOutput.textContent = chunks[0] ?? 'No hay texto para mostrar';
  readingStatus.textContent = `${words.length} palabras listas`;
  updateProgress();
}

fileInput.addEventListener('change', async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  textSource.value = await file.text();
  generateOutput();
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

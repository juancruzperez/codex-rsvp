const fileInput = document.querySelector('#document-input');
const uploadBlock = document.querySelector('.upload-block');
const uploadCard = document.querySelector('.upload-card');
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
const closeReaderButton = document.querySelector('#close-reader');

const PDFJS_MODULE_URL =
'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';

const PDF_WORKER_URL =
'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];

let words = [];
let currentIndex = 0;
let wordsPerScreen = 1;
let timer = null;

/* =========================================================
TEXT / CHUNKS
========================================================= */

function normalizeText(text) {
return text
.replace(/<[^>]*>/g, ' ')
.replace(/\s+/g, ' ')
.trim();
}

function currentChunks() {
const chunks = [];

for (let i = 0; i < words.length; i += wordsPerScreen) {
chunks.push(
words.slice(i, i + wordsPerScreen).join(' ')
);
}

return chunks;
}

/* =========================================================
UI — WORD COUNT
========================================================= */

function updateWordCount() {
const text = normalizeText(textSource.value);
const count = text ? text.split(/\s+/).length : 0;

wordCount.textContent = `${count} palabras`;
startButton.disabled = !text;
}

/* =========================================================
UI — PROGRESS
========================================================= */

function updateProgress() {
const chunks = currentChunks();
const progressOutput =
document.querySelector('#progress-output');

if (!chunks.length) {
readingProgress.value = 0;

```
if (progressOutput) {
  progressOutput.textContent = '0%';
}

return;
```

}

/*

* currentIndex representa el próximo bloque
* que se va a mostrar.
*
* Por eso, cuando estamos mostrando el primer
* bloque, el progreso todavía es 0%.
* Cuando termina el último bloque, llega al 100%.
  */
  const progress = Math.min(
  Math.round(
  (currentIndex / chunks.length) * 100
  ),
  100
  );

readingProgress.value = progress;

if (progressOutput) {
progressOutput.textContent = `${progress}%`;
}
}

/* =========================================================
UI — CURRENT CHUNK
========================================================= */

function showCurrentChunk() {
const chunks = currentChunks();

if (!chunks.length) {
rsvpOutput.textContent = 'Lectura finalizada';
readingProgress.value = 100;

```
const progressOutput =
  document.querySelector('#progress-output');

if (progressOutput) {
  progressOutput.textContent = '100%';
}

return;
```

}

if (currentIndex >= chunks.length) {
rsvpOutput.textContent = 'Lectura finalizada';
readingProgress.value = 100;

```
const progressOutput =
  document.querySelector('#progress-output');

if (progressOutput) {
  progressOutput.textContent = '100%';
}

return;
```

}

rsvpOutput.textContent = chunks[currentIndex];

updateProgress();
}

/* =========================================================
RSVP — STOP / PAUSE
========================================================= */

function stopReading() {
if (timer !== null) {
clearTimeout(timer);
timer = null;
}

playPauseButton.innerHTML =
'<span class="pause-icon" aria-hidden="true">▶</span>' +
'<span>Continuar</span>';

playPauseButton.setAttribute(
'aria-label',
'Continuar lectura'
);
}

/* =========================================================
RSVP — SCHEDULER
========================================================= */

function scheduleNext() {
const wordsPerMinute =
Number(speedRange.value);

const delay = Math.max(
80,
(60_000 / wordsPerMinute) * wordsPerScreen
);

timer = window.setTimeout(
advance,
delay
);
}

/* =========================================================
RSVP — ADVANCE
========================================================= */

function advance() {
const chunks = currentChunks();

/*

* Si no quedan bloques por mostrar,
* terminamos la lectura.
  */
  if (currentIndex >= chunks.length) {
  rsvpOutput.textContent =
  'Lectura finalizada';

```
readingProgress.value = 100;
```

```
const progressOutput =
  document.querySelector('#progress-output');

if (progressOutput) {
  progressOutput.textContent = '100%';
}

stopReading();

return;
```

}

/*

* Mostrar el bloque actual.
  */
  rsvpOutput.textContent =
  chunks[currentIndex];

/*

* Avanzamos inmediatamente el índice.
* De esta forma el progreso representa
* el contenido que ya fue mostrado.
  */
  currentIndex += 1;

updateProgress();

/*

* Si acabamos de mostrar el último bloque,
* no programamos otro ciclo.
  */
  if (currentIndex >= chunks.length) {
  stopReading();
  return;
  }

scheduleNext();
}

/* =========================================================
RSVP — START / CONTINUE
========================================================= */

function startReading() {
if (!words.length) {
return;
}

/*

* Evita tener más de un temporizador activo.
  */
  if (timer !== null) {
  clearTimeout(timer);
  timer = null;
  }

/*

* Si la lectura ya terminó, comenzamos
* nuevamente desde el principio.
  */
  const chunks = currentChunks();

if (currentIndex >= chunks.length) {
currentIndex = 0;
readingProgress.value = 0;
}

playPauseButton.innerHTML =
'<span class="pause-icon" aria-hidden="true">Ⅱ</span>' +
'<span>Pausar</span>';

playPauseButton.setAttribute(
'aria-label',
'Pausar lectura'
);

advance();
}

/* =========================================================
WORDS PER SCREEN
========================================================= */

function setWordsPerScreen(size) {
const newSize = Number(size);

if (![1, 2, 3].includes(newSize)) {
return;
}

const previousSize = wordsPerScreen;

/*

* Convertimos la posición actual para mantener
* aproximadamente el mismo punto del texto.
  */
  const currentWordPosition =
  currentIndex * previousSize;

wordsPerScreen = newSize;

currentIndex = Math.floor(
currentWordPosition / wordsPerScreen
);

/*

* Evitamos quedar fuera del documento.
  */
  const chunks = currentChunks();

if (currentIndex > chunks.length) {
currentIndex = chunks.length;
}

document
.querySelectorAll('[data-size]')
.forEach((button) => {
button.setAttribute(
'aria-pressed',
String(
Number(button.dataset.size) ===
wordsPerScreen
)
);
});

if (!readerModal.open) {
updateProgress();
return;
}

const wasReading =
timer !== null;

stopReading();

if (currentIndex >= chunks.length) {
currentIndex = Math.max(
0,
chunks.length - 1
);
}

showCurrentChunk();

if (wasReading) {
startReading();
}
}

/* =========================================================
SPEED
========================================================= */

function setSpeed(value) {
const numericValue = Number(value);

speedRange.value = numericValue;
modalSpeedRange.value = numericValue;

speedOutput.textContent =
numericValue;

modalSpeedOutput.textContent =
`${numericValue} ppm`;

/*

* Si la lectura está activa,
* reiniciamos únicamente el temporizador
* para aplicar inmediatamente la nueva velocidad.
  */
  if (timer !== null) {
  clearTimeout(timer);
  timer = null;

```
scheduleNext();
```

}
}

/* =========================================================
PREPARE TEXT
========================================================= */

function prepareText() {
const normalizedText =
normalizeText(textSource.value);

words = normalizedText
? normalizedText.split(/\s+/).filter(Boolean)
: [];

currentIndex = 0;

updateWordCount();
updateProgress();
}

/* =========================================================
PDF
========================================================= */

async function readPdfFile(file) {
const pdfjsLib =
await import(PDFJS_MODULE_URL);

pdfjsLib.GlobalWorkerOptions.workerSrc =
PDF_WORKER_URL;

const pdf =
await pdfjsLib.getDocument({
data: await file.arrayBuffer()
}).promise;

const pages = [];

for (
let number = 1;
number <= pdf.numPages;
number += 1
) {
const page =
await pdf.getPage(number);

```
const content =
  await page.getTextContent();

pages.push(
  content.items
    .map((item) => item.str)
    .join(' ')
);
```

}

return pages.join('\n');
}

/* =========================================================
FILE EXTRACTION
========================================================= */

async function extractFile(file) {
const fileName =
file.name.toLowerCase();

if (fileName.endsWith('.pdf')) {
return readPdfFile(file);
}

if (fileName.endsWith('.docx')) {
if (!globalThis.mammoth) {
throw new Error(
'El lector de Word no está disponible.'
);
}

```
const result =
  await globalThis.mammoth.extractRawText({
    arrayBuffer:
      await file.arrayBuffer()
  });

return result.value;
```

}

if (fileName.endsWith('.txt')) {
return new TextDecoder().decode(
await file.arrayBuffer()
);
}

throw new Error(
'Formato no compatible. Utilizá PDF, Word o TXT.'
);
}

/* =========================================================
FILE VALIDATION
========================================================= */

function isAllowedFile(file) {
if (!file || !file.name) {
return false;
}

const fileName =
file.name.toLowerCase();

return ALLOWED_EXTENSIONS.some(
(extension) =>
fileName.endsWith(extension)
);
}

/* =========================================================
PROCESS FILE
========================================================= */

async function processFile(file) {
if (!file) {
return;
}

if (!isAllowedFile(file)) {
fileStatus.textContent =
'Formato no compatible. Utilizá PDF, Word o TXT.';

```
return;
```

}

fileStatus.textContent =
`Procesando ${file.name}…`;

if (uploadCard) {
uploadCard.classList.add(
'is-processing'
);
}

try {
const extractedText =
await extractFile(file);


textSource.value =
  extractedText;

prepareText();

if (!words.length) {
  fileStatus.textContent =
    `${file.name} no contiene texto legible.`;

  return;
}

fileStatus.textContent =
  `${file.name} listo para leer`;


} catch (error) {
console.error(
'Error al procesar el archivo:',
error
);

```
fileStatus.textContent =
  error.message ||
  'No fue posible leer el documento.';
```

} finally {
if (uploadCard) {
uploadCard.classList.remove(
'is-processing'
);
}
}
}

/* =========================================================
FILE INPUT
========================================================= */

fileInput.addEventListener(
'change',
async ({ target }) => {
const [file] =
target.files;

```
if (!file) {
  return;
}

await processFile(file);

/*
 * Permite volver a seleccionar
 * el mismo archivo.
 */
target.value = '';
```

}
);

/* =========================================================
DRAG & DROP
========================================================= */

if (uploadBlock) {
const dragEvents = [
'dragenter',
'dragover',
'dragleave',
'drop'
];

dragEvents.forEach(
(eventName) => {
uploadBlock.addEventListener(
eventName,
(event) => {
/*
* Fundamental:
* evita que el navegador abra
* el archivo arrastrado.
*/
event.preventDefault();
event.stopPropagation();
}
);
}
);

uploadBlock.addEventListener(
'dragenter',
() => {
if (uploadCard) {
uploadCard.classList.add(
'is-dragover'
);
}
}
);

uploadBlock.addEventListener(
'dragover',
() => {
if (uploadCard) {
uploadCard.classList.add(
'is-dragover'
);
}
}
);

uploadBlock.addEventListener(
'dragleave',
(event) => {
/*
* Evita quitar el estado visual
* cuando el cursor se mueve entre
* elementos hijos de la tarjeta.
*/
if (
event.relatedTarget &&
uploadBlock.contains(
event.relatedTarget
)
) {
return;
}

  if (uploadCard) {
    uploadCard.classList.remove(
      'is-dragover'
    );
  }
}


);

uploadBlock.addEventListener(
'drop',
async (event) => {
if (uploadCard) {
uploadCard.classList.remove(
'is-dragover'
);
}


  const files =
    event.dataTransfer.files;

  if (!files || !files.length) {
    return;
  }

  const [file] = files;

  await processFile(file);
}


);
}

/* =========================================================
TEXTAREA
========================================================= */

textSource.addEventListener(
'input',
() => {
/*
* Si el usuario modifica manualmente
* el texto, preparamos nuevamente
* la lectura desde el principio.
*/
prepareText();
}
);

/* =========================================================
SPEED CONTROLS
========================================================= */

speedRange.addEventListener(
'input',
() => {
setSpeed(
speedRange.value
);
}
);

modalSpeedRange.addEventListener(
'input',
() => {
setSpeed(
modalSpeedRange.value
);
}
);

/* =========================================================
CHUNK SIZE CONTROLS
========================================================= */

document
.querySelectorAll('[data-size]')
.forEach((button) => {
button.addEventListener(
'click',
() => {
setWordsPerScreen(
button.dataset.size
);
}
);
});

/* =========================================================
OPEN READER
========================================================= */

startButton.addEventListener(
'click',
() => {
prepareText();

```
if (!words.length) {
  return;
}

currentIndex = 0;

readingProgress.value = 0;

const progressOutput =
  document.querySelector('#progress-output');

if (progressOutput) {
  progressOutput.textContent =
    '0%';
}

readerModal.showModal();

startReading();
```

}
);

/* =========================================================
PLAY / PAUSE
========================================================= */

playPauseButton.addEventListener(
'click',
() => {
if (timer !== null) {
stopReading();
} else {
startReading();
}
}
);

/* =========================================================
CLOSE READER
========================================================= */

function closeReader() {
stopReading();

currentIndex = 0;

if (readerModal.open) {
readerModal.close();
}

rsvpOutput.textContent =
'Listo para comenzar';

readingProgress.value = 0;

const progressOutput =
document.querySelector('#progress-output');

if (progressOutput) {
progressOutput.textContent =
'0%';
}
}

if (closeReaderButton) {
closeReaderButton.addEventListener(
'click',
closeReader
);
}

/* =========================================================
ESC — CLOSE READER
========================================================= */

readerModal.addEventListener(
'cancel',
(event) => {
event.preventDefault();
closeReader();
}
);

/* =========================================================
MODAL CLOSE SAFETY
========================================================= */

readerModal.addEventListener(
'close',
() => {
stopReading();
}
);

/* =========================================================
THEME
========================================================= */

themeToggle.addEventListener(
'click',
() => {
const dark =
document.documentElement.dataset.theme !==
'dark';

document.documentElement.dataset.theme =
  dark
    ? 'dark'
    : 'light';

themeToggle.setAttribute(
  'aria-pressed',
  String(dark)
);

themeToggle.setAttribute(
  'aria-label',
  dark
    ? 'Activar modo claro'
    : 'Activar modo oscuro'
);

themeToggle.innerHTML =
  `<span aria-hidden="true">${
    dark ? '☾' : '☼'
  }</span>` +
  `<span class="theme-label">${
    dark
      ? 'Oscuro'
      : 'Claro'
  }</span>`;


}
);

/* =========================================================
INITIAL STATE
========================================================= */

updateWordCount();
updateProgress();

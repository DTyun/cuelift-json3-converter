const input = document.getElementById('input-text');
const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const errorBox = document.getElementById('input-error');
const preview = document.getElementById('output-preview');
const previewStatus = document.getElementById('preview-status');
const count = document.getElementById('cue-count');
const downloadButton = document.getElementById('download-button');
const copyButton = document.getElementById('copy-button');
const feedback = document.getElementById('feedback');
const srtButton = document.getElementById('format-srt');
const vttButton = document.getElementById('format-vtt');
let format = 'srt';
let cues = [];
let output = '';
let sourceName = 'captions';
const {parseJson3, serialize} = window.CueLiftConverter;

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', 'input-error');
}

function clearError() {
  errorBox.hidden = true;
  errorBox.textContent = '';
  input.removeAttribute('aria-invalid');
  input.removeAttribute('aria-describedby');
}

function render() {
  output = cues.length ? serialize(cues, format) : '';
  preview.textContent = output ? output.slice(0, 5000) + (output.length > 5000 ? '\n\n… Preview truncated. Download includes every cue.' : '') : 'Your subtitle preview will appear here.';
  previewStatus.textContent = cues.length ? (output.length > 5000 ? 'First 5,000 characters' : 'Full preview') : 'Waiting for captions';
  count.textContent = `${cues.length} ${cues.length === 1 ? 'CUE' : 'CUES'}`;
  downloadButton.disabled = !cues.length;
  copyButton.disabled = !cues.length;
  downloadButton.firstChild.textContent = `Download .${format} `;
  srtButton.classList.toggle('active', format === 'srt');
  vttButton.classList.toggle('active', format === 'vtt');
  srtButton.setAttribute('aria-pressed', String(format === 'srt'));
  vttButton.setAttribute('aria-pressed', String(format === 'vtt'));
}

function convert() {
  clearError();
  feedback.textContent = '';
  const raw = input.value.trim();
  if (!raw) { cues = []; render(); return; }
  try { cues = parseJson3(raw); }
  catch (error) { cues = []; showError(error.message); }
  render();
}

let timer;
input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(convert, 180); });
document.getElementById('sample-button').addEventListener('click', () => {
  sourceName = 'sample-captions';
  input.value = JSON.stringify({events:[
    {tStartMs:1000,dDurationMs:2300,segs:[{utf8:'Hello, world.'}]},
    {tStartMs:3500,dDurationMs:2900,segs:[{utf8:'These captions came from a JSON3 file.'}]},
    {tStartMs:6600,dDurationMs:2600,segs:[{utf8:'Download them as SRT or VTT.'}]}
  ]}, null, 2);
  convert();
});
document.getElementById('clear-button').addEventListener('click', () => {
  clearTimeout(timer); input.value = ''; fileInput.value = ''; sourceName = 'captions'; convert(); input.focus();
});
srtButton.addEventListener('click', () => { format = 'srt'; render(); });
vttButton.addEventListener('click', () => { format = 'vtt'; render(); });

async function readFile(file) {
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { cues = []; render(); showError('The file is larger than 10 MB. Choose a smaller JSON3 file.'); return; }
  if (!/\.(json|json3)$/i.test(file.name)) { cues = []; render(); showError('Choose a .json or .json3 file.'); return; }
  try {
    input.value = await file.text();
    sourceName = file.name.replace(/\.(json|json3)$/i, '') || 'captions';
    convert();
  } catch { cues = []; render(); showError('The file could not be read. Try opening it again.'); }
}
fileInput.addEventListener('change', () => readFile(fileInput.files[0]));
for (const eventName of ['dragenter', 'dragover']) dropZone.addEventListener(eventName, event => { event.preventDefault(); dropZone.classList.add('dragover'); });
for (const eventName of ['dragleave', 'drop']) dropZone.addEventListener(eventName, event => { event.preventDefault(); dropZone.classList.remove('dragover'); });
dropZone.addEventListener('drop', event => readFile(event.dataTransfer.files[0]));
downloadButton.addEventListener('click', () => {
  if (!output) return;
  const blob = new Blob([output], {type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `${sourceName}.${format}`; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  feedback.textContent = `Downloaded ${sourceName}.${format}`;
});
copyButton.addEventListener('click', async () => {
  if (!output) return;
  try { await navigator.clipboard.writeText(output); feedback.textContent = 'Subtitle text copied.'; }
  catch { feedback.textContent = 'Copy was blocked by this browser. Download the file instead.'; }
});
render();

import * as pdfjs from './pdf.min.mjs';
import { convertPdf, makePdf } from './core.js';
pdfjs.GlobalWorkerOptions.workerSrc = './pdf.worker.min.mjs';
const dep = {
  pdfjs, PDFLib: window.PDFLib, loadImage: src => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; }),
  makeCanvas: (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; },
  toPng: c => new Promise(r => c.toBlob(b => b.arrayBuffer().then(r), 'image/png')),
};
// FIX: le strisce sono 1-bit (solo 0/255 dopo binarize): il JPEG introduce ringing
// attorno ai bordi netti e "sbianca" le barre. Usiamo PNG (anche più piccolo di un JPG a parità di 1-bit).
const toPngBlob = c => new Promise(r => c.toBlob(r, 'image/png'));
const $ = id => document.getElementById(id), out = $('out'), st = $('st'), results = [];
const NAMES = { A: 'InPost Italia', B: 'InPost estero', C: 'BRT' };
const get = n => document.querySelector(`input[name=${n}]:checked`).value;
for (const n of ['fmt', 'mod']) {
  const v = localStorage.getItem(n), r = v && document.querySelector(`input[name=${n}][value="${v}"]`); if (r) r.checked = true;
  document.querySelectorAll(`input[name=${n}]`).forEach(i => i.onchange = () => localStorage.setItem(n, i.value));
}
function dl(f) { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }

async function run(inputs) {
  inputs = inputs.filter(f => /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name));
  for (const file of inputs) {
    st.textContent = 'Elaboro ' + file.name + '…';
    const box = document.createElement('div'); box.className = 'res';
    try {
      const labels = await convertPdf(new Uint8Array(await file.arrayBuffer()), dep, { module: +get('mod') });
      if (!labels.length) throw new Error('nessuna etichetta riconosciuta in questo PDF');
      const base = file.name.replace(/\.pdf$/i, ''), files = [];
      if (get('fmt') === 'pdf') {
        files.push([new File([await makePdf(labels.flatMap(l => l.strips), dep)], base + '_58mm.pdf', { type: 'application/pdf' }), 'Scarica PDF']);
      } else {
        // FIX: PNG per entrambe le strisce (1-bit pulito, zero compression artifact sul barcode)
        for (let i = 0; i < labels.length; i++) for (let j = 0; j < 2; j++) {
          const tag = (labels.length > 1 ? '_et' + (i + 1) : '') + (j ? '_2_dati' : '_1_codici');
          files.push([new File([await toPngBlob(labels[i].strips[j])], base + tag + '.png', { type: 'image/png' }), j ? 'Scarica 2 · dati' : 'Scarica 1 · codici']);
        }
      }
      box.innerHTML = '<div class="badge"></div><h2></h2><div class="prev"></div><div class="btns"></div>';
      box.querySelector('.badge').textContent = NAMES[labels[0].kind] + (labels.length > 1 ? ` · ${labels.length} etichette` : '');
      box.querySelector('h2').textContent = file.name;
      for (const c of labels[0].strips) { const i = new Image(); i.src = c.toDataURL('image/png'); box.querySelector('.prev').append(i); }
      const bt = box.querySelector('.btns'), fl = files.map(f => f[0]);
      for (const [f, lab] of files) { const b = document.createElement('button'); b.textContent = files.length > 2 ? f.name.replace(base, '…') : lab; b.onclick = () => dl(f); bt.append(b); results.push(f); }
      if (navigator.canShare && navigator.canShare({ files: fl })) { const b = document.createElement('button'); b.className = 'g'; b.textContent = 'Condividi / Stampa'; b.onclick = () => navigator.share({ files: fl }).catch(() => {}); bt.append(b); }
    } catch (e) { box.className = 'res err'; box.innerHTML = '<h2></h2><small></small>'; box.querySelector('h2').textContent = file.name; box.querySelector('small').textContent = e.message; console.error(e); }
    out.prepend(box);
  }
  st.textContent = ''; $('all').hidden = results.length < 3;
}
$('f').onchange = e => { run([...e.target.files]); e.target.value = ''; };
const drop = $('drop');
['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('on'); }));
['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('on'); }));
drop.addEventListener('drop', e => run([...e.dataTransfer.files]));
$('dall').onclick = () => results.forEach((f, i) => setTimeout(() => dl(f), i * 400));
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

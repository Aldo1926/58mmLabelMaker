import * as pdfjs from './pdf.min.mjs';
import { convertPdf, makePdf } from './core.js';
pdfjs.GlobalWorkerOptions.workerSrc = './pdf.worker.min.mjs';
const dep = {
  pdfjs, PDFLib: window.PDFLib,
  makeCanvas: (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; },
  toPng: c => new Promise(r => c.toBlob(b => b.arrayBuffer().then(r), 'image/png')),
};
const toJpg = c => new Promise(r => c.toBlob(r, 'image/jpeg', 0.95));
const $ = id => document.getElementById(id), out = $('out'), st = $('st'), results = [];
for (const k of ['mod', 'fmt']) { $(k).value = localStorage.getItem(k) || $(k).value; $(k).onchange = e => localStorage.setItem(k, e.target.value); }

function dl(f) { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }

async function run(inputs) {
  for (const file of inputs) {
    st.textContent = 'Elaboro ' + file.name + '…';
    const box = document.createElement('div'); box.className = 'item';
    try {
      const labels = await convertPdf(new Uint8Array(await file.arrayBuffer()), dep, { module: +$('mod').value });
      if (!labels.length) throw new Error('nessuna etichetta riconosciuta in questo PDF');
      const base = file.name.replace(/\.pdf$/i, ''), files = [];
      if ($('fmt').value === 'pdf') {
        const bytes = await makePdf(labels.flatMap(l => l.strips), dep);
        files.push([new File([bytes], base + '_58mm.pdf', { type: 'application/pdf' }), 'Scarica PDF']);
      } else {
        for (let i = 0; i < labels.length; i++) for (let j = 0; j < 2; j++) {
          const tag = (labels.length > 1 ? '_et' + (i + 1) : '') + (j ? '_2_dati' : '_1_codici');
          files.push([new File([await toJpg(labels[i].strips[j])], base + tag + '.jpg', { type: 'image/jpeg' }), j ? 'Scarica 2 · dati' : 'Scarica 1 · codici']);
        }
      }
      box.innerHTML = '<h2></h2><div class="prev"></div><div class="btns"></div>';
      box.querySelector('h2').textContent = base + ` (${labels.length} etichett${labels.length > 1 ? 'e' : 'a'})`;
      for (const c of labels[0].strips) { const i = new Image(); i.src = c.toDataURL('image/png'); box.querySelector('.prev').append(i); }
      const bt = box.querySelector('.btns'), fl = files.map(f => f[0]);
      for (const [f, lab] of files) { const b = document.createElement('button'); b.textContent = files.length > 2 ? f.name.replace(base, '…') : lab; b.onclick = () => dl(f); bt.append(b); results.push(f); }
      if (navigator.canShare && navigator.canShare({ files: fl })) { const b = document.createElement('button'); b.className = 'g'; b.textContent = 'Condividi / Stampa'; b.onclick = () => navigator.share({ files: fl }).catch(() => {}); bt.append(b); }
    } catch (e) { box.innerHTML = '<h2 class="err"></h2>'; box.firstChild.textContent = file.name + ': ' + e.message; console.error(e); }
    out.prepend(box);
  }
  st.textContent = ''; $('all').hidden = results.length < 3;
}
$('f').onchange = e => { run([...e.target.files]); e.target.value = ''; };
$('dall').onclick = () => results.forEach((f, i) => setTimeout(() => dl(f), i * 400));
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

// Core: legge le etichette InPost/BRT e produce due strisce 1-bit per stampanti termiche 58 mm.
// dep = { pdfjs, makeCanvas(w,h), PDFLib, toPng(canvas), loadImage(src) }
const PW = 324, M = 6, SC = 6;           // FIX: PW=324 (era la larghezza della versione "perfetta")
const LOGO_IN = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAACGAQAAAABP9orkAAADnUlEQVR42p2Yv3LjNhDGf4A0JgqPzXQuPHN8DHfmo7hM6fKqGNelzCPcozCTK1z6DY6XueJKyHMFlKG4KUjqDwURm6CRRvq4XOzu9+0CRoDv9yyvjQW4IbcsQKGDRa+CuUYFW7cqGEEFs1FnrVPBjC4gKGG/6WCig9U6WOV1W2hUsFL3UteqYGudNRtUMKNMljIgDzpYpYOVmRIeYQ4+LVqUcUVe5OIKe1izkkXY1+EbH5Zglr8B2PG0uFVpHkVEWmTZWvUK8Hm1aMzI5pceMEVc1rcb8SC45TQMe+wWNyrBgg/QZbJq4SnCjxwHRcJKpFmMhwQLbgeNyRZSgR8qZTMy55sxJwq0KUFEmkehEJFQDK9o4aRcwm2wwEN7LjWfz8uy+LU/i+6PRPV+PJeHTqe9fQoWz5IgSu31/7t9zGX1VsJMGJMvjVwnrbVzrVnRHqlePLO2PdTAZlfDxpSwLWewjRtD46HkDd54P7x0qiMpD2nawU+oEZ/cQnf47JGxGdgLaaqJIPTA2x7mz9MUAuA7IB6sJcLXAk0ctC/1v5/0M9BixJcUYQ572WtEs7ohhCueKtxZf/G7Q68zh35mT4vLYPdJv8dH4LpO+WaOXKwdYNPh3QenoorTc5ZvyWbqP5xwxG6qTUJlBKgp90BbwhcSGRuf3fl9+Nfn2R9+cn3JJz9NUQ9zWu6O9el3AFt0L81lAjrYDi9d+dRYYw6R8Qt0Hn9fj+JkSXfx9cSwgevT/Db3z50+bo+K8HhNqXk+qd657NGOhm6HRFzYQjFjUBJWyFDD0YJpOWLW5f5XZkbQcfOuX4KZE3WcZkufJOpaRsji3Nu6vh68thdHJB9oYteeZiFRTD/xLn7nLaWWh1XvDGXY1fWa7mJOR0da/sTRh+WBdvRZ2slauoHU1WCjHimUSFYJ+M1o8vLc68DgGJTEHpfqvJauuDqizPbO8k+Kgg7jWbEeYK+VmRh4TMRnnuEj99hhtuRF/OK40oBINKqpJlqoMuO2hT/WUGbOHxa4A0ebHfMeRTpuF30zIlZAbG62fF8BJnNatIRrgKbPwNpngAdZjoj8JSIiHY/LW5joextyx3+A9l11jL2TWnP6kKbI+xad4moiP5nZS2xOwl4zsNG3Mmh8U57E+1IF0905EHUnSu1Am70mGPIpkqWz4pJAexIfsrDuNJdXyluCbK7+011N73TWdPchXaWCxVoVt23unm6I21a30/cs7F8V0LyazN3eWAAAAABJRU5ErkJggg==', LOGO_BRT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAASCAAAAAAWSCP0AAAAeElEQVR42p2RQRLAIAgDN47//3J6qBRp1UM5MZJgSGQAEKNZVbshAu1B8jT2FlQ2+PDdmzkRBTScbK8WCZr0zFxWVBwYAVaIej/2MEnFAyN5UBzCDybtrvsF6uzucfYhJox3ppWhtGqgF/GYHoacA57c4wiqIj51AZG+Jx6XXgBtAAAAAElFTkSuQmCC';
const FS = 'Arial,Helvetica,Roboto,sans-serif', FM = FS;

// ---------------------------------------------------------------- foglio di blocchi
class Sheet {
  constructor(W, k, dep) { this.W = W; this.k = k; this.dep = dep; this.cw = W - 2 * M; this.blocks = []; this.tmp = this.mk(10)[1]; }
  mk(h, bg = '#fff') { const c = this.dep.makeCanvas(this.W, Math.max(1, Math.round(h))); const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); x.textBaseline = 'top'; return [c, x]; }
  f(s, mono) { return `bold ${s}px ${mono ? FM : FS}`; }
  w(t, s, mono) { this.tmp.font = this.f(s, mono); return this.tmp.measureText(t).width; }
  wrap(t, s, mono, maxw) {
    const out = [];
    for (const para of String(t).split('\n')) {
      let cur = '';
      for (const wd of para.split(/\s+/).filter(Boolean)) {
        const tr = cur ? cur + ' ' + wd : wd;
        if (this.w(tr, s, mono) <= maxw || !cur) cur = tr; else { out.push(cur); cur = wd; }
      }
      out.push(cur);
    }
    return out;
  }
  logo(img, h, label) {
    const w = Math.round(img.width * h / img.height), [c, x] = this.mk(h + 12);
    x.drawImage(img, M, 4, w, h);
    if (label) { x.fillStyle = '#000'; x.font = this.f(Math.round(h * 0.42)); x.textBaseline = 'middle'; x.fillText(label, M + w + 16, 4 + h / 2); }
    this.blocks.push(c);
  }
  rule(t = 3, pad = 6) { const [c, x] = this.mk(t + 2 * pad); x.fillStyle = '#000'; x.fillRect(M, pad, this.cw, t); this.blocks.push(c); }
  image(img) { const [c, x] = this.mk(img.height); x.drawImage(img, Math.floor((this.W - img.width) / 2), 0); this.blocks.push(c); }
  gap(h) { this.blocks.push(this.mk(h)[0]); }
  text(t, size, o = {}) {
    if (!t) return;
    const { min = 14, lines: ml = 1, align = 'left', mono = false, invert = false, pad = 2 } = o;
    size = Math.round(size * this.k); const mn = Math.round(min * this.k);
    let s = size, ls;
    for (;;) {
      ls = this.wrap(t, s, mono, this.cw);
      if ((ls.length <= ml && ls.every(l => this.w(l, s, mono) <= this.cw)) || s <= mn) break;
      s -= 2;
    }
    const lh = Math.round(s * 1.12), [c, x] = this.mk(lh * ls.length + 2 * pad, invert ? '#000' : '#fff');
    x.font = this.f(s, mono); x.fillStyle = invert ? '#fff' : '#000';
    ls.forEach((l, i) => { const w = this.w(l, s, mono); x.fillText(l, align === 'left' ? M : align === 'center' ? (this.W - w) / 2 : this.W - M - w, pad + i * lh); });
    this.blocks.push(c);
  }
  cells(items, vs, weights) {
    vs = Math.round(vs * this.k); const ls = Math.round(18 * this.k), ly = Math.round(ls * 1.2);
    weights = weights || items.map(() => 1); const tot = weights.reduce((a, b) => a + b, 0);
    const cs = items.map(([lab, val], i) => { val = String(val || '-'); const wd = this.cw * weights[i] / tot; let s = vs; while (s > 14 && this.w(val, s) > wd - 6) s -= 2; return { lab, val, s, wd }; });
    const [c, x] = this.mk(ly + Math.max(...cs.map(q => q.s * 1.1)) + 6);
    let px = M; x.fillStyle = '#000';
    for (const q of cs) { x.font = this.f(ls); x.fillText(q.lab, px + 2, 0); x.font = this.f(q.s); x.fillText(q.val, px + 2, ly); px += q.wd; }
    this.blocks.push(c);
  }
  render(tail = 0) {
    const [c, x] = this.mk(this.blocks.reduce((a, b) => a + b.height, 0) + tail);
    let y = 0; for (const b of this.blocks) { x.drawImage(b, 0, y); y += b.height; }
    return c;
  }
}

// ---------------------------------------------------------------- campionamento barcode / DataMatrix
const runs = a => { const r = []; let s = 0; for (let i = 1; i <= a.length; i++) if (i === a.length || a[i] !== a[s]) { r.push(i - s); s = i; } return r; };
const median = a => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };
function fitCount(lens, total) {
  const m0 = median([...lens].sort((a, b) => a - b).slice(0, Math.max(3, lens.length >> 3)));
  const lo = Math.max(8, Math.floor(total / m0 * 0.88)), hi = Math.floor(total / m0 * 1.12) + 2;
  const score = n => { let s = 0; for (const l of lens) { const q = l / (total / n), r = Math.round(q); s += Math.abs(q - r) + (r < 1 ? 10 : 0); } return s; };
  let best = 0, bs = 1e9;
  for (let n = lo; n < hi; n++) { const s = score(n); if (s < bs - 1e-9) { best = n; bs = s; } }
  for (let n = lo; n < hi; n++) if ((n - 2) % 11 === 0 && score(n) <= bs * 1.3 + 1) return n;
  return best;
}
async function grabDark(page, vp, box) {
  const [x0, y0, x1, y1] = box, w = Math.ceil((x1 - x0) * SC), h = Math.ceil((y1 - y0) * SC);
  const c = this.makeCanvas(w, h), ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  await page.render({ canvasContext: ctx, canvas: c, viewport: vp, transform: [1, 0, 0, 1, -x0 * SC, -y0 * SC] }).promise;
  const d = ctx.getImageData(0, 0, w, h).data; let a = w, b = h, e = 0, f = 0;
  const dark = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) if (d[i * 4] < 128) { dark[i] = 1; const x = i % w, y = (i / w) | 0; if (x < a) a = x; if (x > e) e = x; if (y < b) b = y; if (y > f) f = y; }
  if (e < a) throw new Error('codice non trovato nella zona attesa');
  return { dark, w, a, b, W: e - a + 1, H: f - b + 1 };
}
const px = (g, x, y) => g.dark[(g.b + y) * g.w + g.a + x];
function sampleBarcode(g, axis) {
  const n = axis === 'y' ? g.H : g.W, t = axis === 'y' ? g.W : g.H, prof = [];
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < t; j++) s += axis === 'y' ? px(g, j, i) : px(g, i, j); prof.push(s / t > 0.5 ? 1 : 0); }
  const N = fitCount(runs(prof), n), m = n / N;
  return Array.from({ length: N }, (_, i) => prof[Math.floor((i + 0.5) * m)]);
}
function sampleDM(g) {
  const row = []; for (let x = 0; x < g.W; x++) row.push(px(g, x, 2));
  const n = Math.round(g.W / median(runs(row))), m = [];
  for (let r = 0; r < n; r++) { m.push([]); for (let c = 0; c < n; c++) m[r].push(px(g, Math.floor((c + 0.5) * g.W / n), Math.floor((r + 0.5) * g.H / n))); }
  return m;
}

const C128 = '212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112'.split(' ');
function decode128(bits) {
  const r = runs(bits), val = i => C128.indexOf(r.slice(i, i + 6).join('')), st = val(0);
  if (st < 103 || st > 105) return '';
  let set = { 103: 'A', 104: 'B', 105: 'C' }[st], sum = st, out = '', pos = 6, n = 1;
  for (;;) {
    const v = val(pos); if (v < 0 || v > 105) return '';
    if (r.slice(pos + 6, pos + 13).join('') === '2331112') return sum % 103 === v ? out : '';
    sum += v * n++; pos += 6;
    if (set === 'C') { if (v < 100) out += String(v).padStart(2, '0'); else set = v === 100 ? 'B' : 'A'; }
    else if (v < 96) out += String.fromCharCode(set === 'B' || v < 64 ? 32 + v : v - 64);
    else if (v === 99) set = 'C'; else if (v === 100) set = 'B'; else if (v === 101) set = 'A';
  }
}

// ---------------------------------------------------------------- blocchi grafici (striscia 1)
function barcodeBlock(sh, bits, num, s) {
  const q = 10, N = bits.length, L = (N + 2 * q) * s; let fs = 44;
  while (fs > 16 && sh.w(num, fs, true) > L - 16) fs -= 2;
  const strip = Math.floor(fs * 1.2), xb = M + strip + 6, T = sh.W - M - xb, [c, x] = sh.mk(L);
  x.fillStyle = '#000';
  for (let i = 0; i < N; i++) if (bits[i]) {
    const y = Math.round((q + i) * s);
    x.fillRect(xb, y, T, Math.max(1, Math.round(s)));
  }
  x.save(); x.translate(M + strip / 2 + fs / 2, (L - sh.w(num, fs, true)) / 2); x.rotate(Math.PI / 2);
  x.font = sh.f(fs, true); x.fillText(num, 0, 0); x.strokeStyle = '#000'; x.lineWidth = Math.max(1.2, fs / 22); x.lineJoin = 'round'; x.strokeText(num, 0, 0); x.restore();
  sh.blocks.push(c);
}
function dmBlock(sh, mods) {
  const n = mods.length, q = 2, s = Math.max(1, Math.floor(sh.cw / (n + 2 * q))), sz = (n + 2 * q) * s, [c, x] = sh.mk(sz);
  x.fillStyle = '#000'; mods.forEach((r, i) => r.forEach((v, j) => v && x.fillRect((q + j) * s, (q + i) * s, s, s)));
  sh.image(c);
}

// ---------------------------------------------------------------- lettura testo
function lines(items, tol) {
  items = [...items].sort((a, b) => a.cy - b.cy || a.x0 - b.x0); const out = [];
  for (const it of items) { const l = out[out.length - 1]; if (l && Math.abs(it.cy - l.cy) <= tol) l.w.push(it); else out.push({ cy: it.cy, w: [it] }); }
  return out.map(l => {
    const w = l.w.sort((a, b) => a.x0 - b.x0); let t = w[0].s;
    for (let i = 1; i < w.length; i++) t += (w[i].x0 - w[i - 1].x1 > 0.15 * w[i].size || /\s$/.test(w[i - 1].s) ? ' ' : '') + w[i].s;
    return { cy: l.cy, x0: w[0].x0, size: Math.max(...w.map(q => q.size)), t: t.replace(/\s+/g, ' ').trim(), w };
  });
}
async function getItems(page, vp, Util) {
  const tc = await page.getTextContent(), out = [];
  for (const it of tc.items) {
    if (!it.str || !it.str.trim()) continue;
    const t = Util.transform(vp.transform, it.transform), size = Math.hypot(t[2], t[3]), vert = Math.abs(t[1]) > Math.abs(t[0]);
    out.push({ s: it.str, x0: t[4], x1: t[4] + (vert ? 0 : it.width * vp.scale), cy: vert ? t[5] + Math.sign(t[1]) * it.width * vp.scale / 2 : t[5] - size * 0.3, size, vert, top: t[5] - size });
  }
  return out;
}
function parseA(its) {
  const up = its.filter(i => !i.vert), d = {};
  const big = up.filter(i => i.size >= 38);
  d.deposito = (big.find(i => i.x0 < 250) || {}).s || ''; d.giro = (big.find(i => i.x0 > 400 && i.cy < 100) || {}).s || ''; d.prov = (big.find(i => i.x0 > 400 && i.cy >= 100) || {}).s || '';
  d.data = (up.find(i => /^\d{4}\.\d{2}\.\d{2}$/.test(i.s.trim())) || {}).s || '';
  d.numero = its.filter(i => i.vert && /^\d+$/.test(i.s.trim())).sort((a, b) => a.cy - b.cy).map(i => i.s.trim()).join('');
  const ls = lines(up.filter(i => i.x0 > 240 && i.x0 < 560 && i.cy > 210), 4), ix = p => ls.findIndex(l => l.t.startsWith(p));
  const im = ix('MITTENTE'), id = ix('DESTINATARIO'), idim = ix('DIMENSIONI'), ir = ix('NUMERO');
  d.mittente = ls.slice(im + 1, id).map(l => l.t);
  const dest = ls.slice(id + 1, idim); d.nome = dest[0] ? dest[0].t : '';
  d.codice = (dest.slice(1).find(l => l.size > 22) || {}).t || '';
  d.indirizzo = dest.slice(1).filter(l => l.t !== d.codice).map(l => l.t);
  d.dimensioni = ls[idim].t.replace('DIMENSIONI', '').trim(); d.rif = ls.slice(ir + 1).map(l => l.t);
  return d;
}
function parseB(its) {
  const lab = its.filter(i => !i.vert && i.x0 > 520 && i.x0 < 805 && i.cy > 85 && i.cy < 510), d = {};
  d.numero = (lab.find(i => /^\d{15,}$/.test(i.s.trim())) || {}).s || '';
  d.route = lines(lab.filter(i => i.x0 >= 660 && i.cy > 175 && i.cy < 350), 9).map(l => l.t);
  d.dest = lines(lab.filter(i => i.x0 < 662 && i.cy > 255 && i.cy < 340), 3).map(l => l.t);
  d.mittente = lines(lab.filter(i => i.x0 < 600 && i.cy > 180 && i.cy < 228), 3).map(l => l.t).filter(t => t !== 'Sender');
  const rows = lines(lab.filter(i => i.x0 < 720 && i.cy > 352 && i.cy < 410), 3).map(l => {
    const cs = []; for (const w of l.w) { const c = cs[cs.length - 1]; if (c && w.x0 - c.x1 <= 8) { c.t += ' ' + w.s; c.x1 = w.x1; } else cs.push({ t: w.s.trim(), x0: w.x0, x1: w.x1 }); } return cs; });
  d.info = [];
  for (let r = 0; r + 1 < rows.length; r += 2) for (const c of rows[r]) { const v = rows[r + 1].find(v => (v.x0 + v.x1) / 2 >= c.x0 - 6 && (v.x0 + v.x1) / 2 <= c.x1 + 6); if (v) d.info.push([c.t, v.t]); }
  return d;
}
function parseC(its) {
  const h = its.filter(i => !i.vert), d = {};
  const top = h.filter(i => i.cy < 175).sort((a, b) => a.x0 - b.x0).map(i => i.s.trim());
  d.zona = top.join(' | ');
  d.classe = (h.find(i => i.size >= 20 && i.x0 < 100 && i.cy > 200 && i.cy < 245) || {}).s || '';
  d.sub = (h.find(i => i.size < 14 && i.x0 < 100 && i.cy > 240 && i.cy < 262) || {}).s || '';
  d.sped = h.filter(i => i.cy > 262 && i.cy < 295 && i.x0 < 240).sort((a, b) => a.x0 - b.x0).map(i => i.s.trim()).join(' ');
  d.rif = (h.find(i => /^\d{6,}$/.test(i.s.trim()) && i.cy > 290) || {}).s || '';
  d.data = (h.find(i => /^\d{2}\/\d{2}\/\d{4}$/.test(i.s.trim())) || {}).s || '';
  const cols = []; for (const i of its.filter(i => i.vert).sort((a, b) => a.x0 - b.x0)) { const c = cols[cols.length - 1]; if (c && Math.abs(c.x - i.x0) < 3) c.w.push(i); else cols.push({ x: i.x0, w: [i] }); }
  const col = k => cols[k] ? cols[k].w.sort((a, b) => b.cy - a.cy).map(i => i.s.trim()) : [];
  [d.mitt, d.dest, d.ind, d.misure] = [col(0), col(1), col(2), col(3)];
  return d;
}

// ---------------------------------------------------------------- striscia 2 (dati in lungo)
const detA = (sh, d) => {
  sh.cells([['DEPOSITO', d.deposito], ['GIRO', d.giro], ['PROV.', d.prov], ['DIM.', d.dimensioni], ['DATA ETICHETTA', d.data]], 64, [1.2, 1.5, 1, 0.8, 2.2]);
  sh.rule(2, 3); sh.text(d.nome, 40, { min: 20 }); sh.text(d.codice, 56, { min: 20, invert: true });
  sh.text(d.indirizzo.join(', '), 36, { min: 20, lines: 2 }); sh.rule(2, 3);
  sh.text('MITTENTE: ' + d.mittente.join(', '), 28, { min: 18, lines: 2 }); sh.text('RIF. CLIENTE: ' + d.rif.join(''), 26, { min: 16, mono: true });
};
const detB = (sh, d) => {
  const h = Math.ceil(d.route.length / 2);
  sh.text(d.route.slice(0, h).join('  |  '), 60, { min: 20, invert: true }); sh.text(d.route.slice(h).join('  |  '), 60, { min: 20 }); sh.rule(2, 3);
  sh.text('DEST.: ' + d.dest.join(' - '), 36, { min: 20, lines: 2 });
  if (d.info.length) sh.cells(d.info, 40);
  if (d.mittente.length) sh.text('MITTENTE: ' + d.mittente.join(', '), 26, { min: 16, lines: 2 });
};
const detC = (sh, d) => {
  sh.text(d.zona, 64, { min: 20, invert: true, align: 'center' });
  sh.text([d.classe, d.sub, d.sped].filter(Boolean).join('   '), 60, { min: 20 }); sh.rule(2, 3);
  sh.text(d.dest[0], 48, { min: 20 });
  sh.text(`${d.ind.join(', ')}${d.dest[1] ? ' (' + d.dest[1] + ')' : ''}`, 40, { min: 20, lines: 2 });
  sh.cells([['COLLI', d.misure[1]], ['PESO', (d.misure[2] || '').replace('KG.', '').trim() + ' kg'], ['VOLUME', (d.misure[0] || '').replace('MC.', '').trim() + ' mc'], ['DATA', d.data]], 40);
  sh.text('MITTENTE: ' + (d.mitt[0] || '') + (d.mitt[1] ? ' (' + d.mitt[1] + ')' : ''), 26, { min: 16, lines: 2 });
  sh.text('RIF.: ' + d.rif, 30, { min: 16 });
};
function landStrip(dep, builder, d, length, logo, tail = 40) {
  for (let k = 2.5; k >= 0.4; k -= 0.05) {
    const sh = new Sheet(length, k, dep); builder(sh, d); const img = sh.render(0);
    if (img.height <= PW - 2 * M) {
      const out = dep.makeCanvas(PW, length + tail), x = out.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, PW, length + tail);
      x.translate((PW - img.height) / 2 + img.height, 0); x.rotate(Math.PI / 2); x.drawImage(img, 0, 0); return out;
    }
  }
  throw new Error('dati troppo lunghi per la striscia');
}
function binarize(c) {
  const x = c.getContext('2d'), im = x.getImageData(0, 0, c.width, c.height), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const v = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11 < 140 ? 0 : 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  x.putImageData(im, 0, 0); return c;
}

// ---------------------------------------------------------------- API
export async function convertPdf(bytes, dep, opt = {}) {
  // FIX: niente scaling del modulo. Module = valore scelto dall'utente (default 4).
  // Con PW=324 e module=4 le barre stampate sono larghe come nella versione originale "perfetta".
  const module_ = Math.max(3, opt.module || 4);
  const { pdfjs } = dep, out = [];
  const li = await dep.loadImage(LOGO_IN), lb = await dep.loadImage(LOGO_BRT);
  // FIX: logo riportati alle dimensioni originali (A/B 64, BRT 58)
  const LG = { A: [li, 64, 'ITALIA'], B: [li, 64, 'ESTERO'], C: [lb, 58, ''] };
  const doc = await pdfjs.getDocument({ data: bytes.slice(0), useSystemFonts: true }).promise;
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p), v0 = page.getViewport({ scale: 1 });
    let items = await getItems(page, v0, pdfjs.Util), txt = items.map(i => i.s).join(' ');
    let kind = /DESTINATARIO/.test(txt) ? 'A' : /Receiver/.test(txt) ? 'B' : /Rif\.:/.test(txt) && /KG\./.test(txt) ? 'C' : null;
    if (!kind) continue;
    const rot = kind === 'B' ? (page.rotate + 270) % 360 : page.rotate, vp = page.getViewport({ scale: 1, rotation: rot });
    if (kind === 'B') items = await getItems(page, vp, pdfjs.Util);
    const vps = page.getViewport({ scale: SC, rotation: rot }), gd = grabDark.bind(dep);
    const d = kind === 'A' ? parseA(items) : kind === 'B' ? parseB(items) : parseC(items);
    const bc = await gd(page, vps, kind === 'A' ? [70, 200, 235, 660] : kind === 'B' ? [540, 88, 790, 156] : [85, 165, 256, 252]);
    const sh = new Sheet(PW, 1, dep), bits = sampleBarcode(bc, kind === 'A' ? 'y' : 'x');
    if (kind === 'C') d.numero = decode128(bits) || (d.zona + d.classe + d.sub + d.sped).replace(/\D/g, '');
    sh.logo(...LG[kind]); sh.rule(2, 3);
    const headerH = sh.blocks.reduce((a, b) => a + b.height, 0);
    const headerH = sh.blocks.reduce((a, b) => a + b.height, 0);
    barcodeBlock(sh, bits, d.numero, module_); sh.gap(14);
    if (kind !== 'C') { const dm = await gd(page, vps, kind === 'A' ? [300, 527, 500, 662] : [698, 340, 763, 412]); dmBlock(sh, sampleDM(dm)); sh.gap(14); }
    const s1 = sh.render(40);
    const s2 = landStrip(dep, { A: detA, B: detB, C: detC }[kind], d, s1.height - 40 - headerH, LG[kind], 40 + headerH);

    out.push({ kind, strips: [binarize(s1), binarize(s2)] });
  }
  return out;
}
export async function makePdf(canvases, dep) {
  const pdf = await dep.PDFLib.PDFDocument.create();
  for (const c of canvases) { const img = await pdf.embedPng(await dep.toPng(c)), pg = pdf.addPage([c.width * 72 / 203, c.height * 72 / 203]); pg.drawImage(img, { x: 0, y: 0, width: pg.getWidth(), height: pg.getHeight() }); }
  return pdf.save();
}

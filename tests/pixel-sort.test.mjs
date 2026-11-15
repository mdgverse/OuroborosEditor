/* Pixel Sort / Sorted (1.7.0): painel da referência (Sort/Spans/Refine/
   Advanced) e o motor puro psOrdenar — direções, chaves, spans, Seed,
   Skip Spans, Max Run Length, Mix e compatibilidade com projetos antigos. */
import fs from 'node:fs';
import { ok, resumo } from './kit.mjs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const extrai = (ini, fim) => {
  const a = html.indexOf(ini), b = html.indexOf(fim, a);
  if (a < 0 || b < 0 || b < a) throw new Error('trecho não encontrado: ' + ini);
  return html.slice(a, b);
};

const NUM = (key, label, min, max, def, step = 1) => ({ type: 'num', key, label, min, max, def, step });
const ENUM = (key, label, options, def) => ({ type: 'enum', key, label, options, def });
const COL = (key, label, def) => ({ type: 'color', key, label, def });
const SEC = (key, label, tip, closed) => ({ type: 'sec', key, label, tip, closed: !!closed });
const BTN = (key, label, action, button) => ({ type: 'button', key, label, action, button, def: '' });
const paramsTxt = extrai('const PSORT_PARAMS = [', '];\n');
const PSORT_PARAMS = new Function('NUM', 'ENUM', 'COL', 'SEC', 'BTN', 'return [' + paramsTxt.slice('const PSORT_PARAMS = ['.length) + ']')(NUM, ENUM, COL, SEC, BTN);
const defs = PSORT_PARAMS.filter(d => d.type !== 'sec');
const por = Object.fromEntries(defs.map(d => [d.key, d]));

console.log('Pixel Sort · painel (referência)');

ok(por.preset.def === 'custom' && por.preset.options.length === 1, 'Preset: Custom (nenhum preset inventado)');
ok(JSON.stringify(por.direction.options.map(o => o[0])) === JSON.stringify(['horizontal', 'vertical', 'angle', 'radial', 'circular'])
  && por.direction.def === 'vertical', 'Direction: Horizontal/Vertical/Angle/Radial/Circular, padrão Vertical');
ok(JSON.stringify(por.sortKey.options.map(o => o[0])) === JSON.stringify(['luminance', 'lightness', 'value', 'saturation', 'hue', 'alpha'])
  && por.sortKey.def === 'luminance', 'Sort Key: Luminance/Lightness/Value/Saturation/Hue/Alpha');
ok(por.order.def === 'desc', 'Order padrão Descending');
ok(por.spanMode.def === 'band' && JSON.stringify(por.spanMode.options.map(o => o[0])) === JSON.stringify(['band', 'random', 'edges', 'whole']),
  'Span Mode: Brightness Band/Random Lengths/Between Edges/Whole Line');
ok(por.brightLow.def === 0.165 && por.brightHigh.def === 0.55, 'Brightness Low 0.165 · High 0.55');
ok(por.skipSpans.def === 0.101 && por.seed.def === 0, 'Skip Spans 0.101 · Seed 0');
ok(por.maxRun.def === 4588 && por.mixSrc.def === 1, 'Max Run Length 4588 px · Mix With Source 1');
ok((html.match(/params: PSORT_PARAMS,/g) || []).length === 2, 'Pixel sort e Sorted compartilham o painel/motor');

console.log('Pixel Sort · motor');

const puro = extrai('/* PSORT_PURO_INI */', '/* PSORT_PURO_FIM */');
const P = new Function(puro + '\nreturn { psOrdenar, psNorm, psValor, psTrilhas };')();

function img(w, h, fn) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, [r, g, b, a] = fn(x, y);
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a === undefined ? 255 : a;
  }
  return d;
}
const cinza = v => [v, v, v];
const base = { direction: 'horizontal', sortKey: 'luminance', order: 'asc', spanMode: 'whole', skipSpans: 0, seed: 0, maxRun: 4588, mixSrc: 1 };

/* linha 40..200 embaralhada vira crescente na horizontal */
const lin = img(6, 1, x => cinza([200, 40, 120, 80, 240, 160][x]));
const ordH = P.psOrdenar(lin, 6, 1, base);
ok([0, 1, 2, 3, 4, 5].every(i => ordH[i * 4] === [40, 80, 120, 160, 200, 240][i]), 'Horizontal ordena a linha (ascendente)');
const ordV = P.psOrdenar(img(1, 6, (x, y) => cinza([200, 40, 120, 80, 240, 160][y])), 1, 6, { ...base, direction: 'vertical' });
ok([0, 1, 2, 3, 4, 5].every(i => ordV[i * 4] === [40, 80, 120, 160, 200, 240][i]), 'Vertical ordena a coluna');
ok(P.psOrdenar(lin, 6, 1, { ...base, order: 'desc' })[0] === 240, 'Descending inverte a ordem');

/* chaves de cor */
const v = (r, g, b, a, k) => P.psValor(new Uint8ClampedArray([r, g, b, a]), 0, k);
ok(Math.abs(v(255, 255, 255, 255, 'luminance') - 1) < 0.001 && Math.abs(v(255, 0, 0, 255, 'value') - 1) < 0.001
  && Math.abs(v(255, 0, 0, 255, 'lightness') - 0.5) < 0.001 && Math.abs(v(255, 0, 0, 255, 'saturation') - 1) < 0.001
  && Math.abs(v(0, 255, 0, 255, 'hue') - 1 / 3) < 0.01 && v(9, 9, 9, 128, 'alpha') === 128 / 255,
  'luminance/lightness/value/saturation/hue/alpha com as fórmulas certas');
const alfaOrd = P.psOrdenar(img(3, 1, x => [200, 200, 200, [30, 200, 90][x]]), 3, 1, { ...base, sortKey: 'alpha' });
ok(alfaOrd[3] === 30 && alfaOrd[7] === 90 && alfaOrd[11] === 200, 'Sort Key Alpha ordena pela transparência');

/* Brightness Band: só a faixa 0.165..0.55 é ordenada */
const faixa = img(5, 1, x => cinza([10, 100, 60, 250, 90][x]));   // lum: .04 .39 .24 .98 .35
const band = P.psOrdenar(faixa, 5, 1, { ...base, spanMode: 'band', brightLow: 0.165, brightHigh: 0.55 });
ok(band[0] === 10 && band[12] === 250 && band[4] === 60 && band[8] === 100 && band[16] === 90,
  'Brightness Band ordena só dentro da faixa (bordas intocadas)');
const inv = P.psNorm({ brightLow: 0.9, brightHigh: 0.2, spanMode: 'band' });
ok(inv.low === 0.2 && inv.high === 0.9, 'faixa invertida é normalizada (low/high trocados)');

/* Random Lengths + Skip Spans: reproduzível pela Seed */
const ruido = img(32, 4, (x, y) => cinza((x * 37 + y * 91) % 256));
const r1 = P.psOrdenar(ruido, 32, 4, { ...base, spanMode: 'random', seed: 7, randMin: 4, randMax: 12 });
const r2 = P.psOrdenar(ruido, 32, 4, { ...base, spanMode: 'random', seed: 7, randMin: 4, randMax: 12 });
const r3 = P.psOrdenar(ruido, 32, 4, { ...base, spanMode: 'random', seed: 8, randMin: 4, randMax: 12 });
ok(Buffer.from(r1).equals(Buffer.from(r2)), 'Random Lengths: mesma Seed = mesmo resultado');
ok(!Buffer.from(r1).equals(Buffer.from(r3)), 'Random Lengths: Seed diferente muda os spans');
const pulado = P.psOrdenar(ruido, 32, 4, { ...base, skipSpans: 1 });
ok(Buffer.from(pulado).equals(Buffer.from(ruido)), 'Skip Spans 1 = nenhum span ordenado (fonte intacta)');

/* Between Edges: o salto de brilho separa os spans */
const degrau = img(6, 1, x => cinza([50, 200, 60, 240, 70, 220][x]));
const bordas = P.psOrdenar(degrau, 6, 1, { ...base, spanMode: 'edges', edgeThr: 0.25 });
ok(Buffer.from(bordas).equals(Buffer.from(degrau)), 'Between Edges: cada salto vira fronteira (spans de 1 não mudam)');
const semBorda = P.psOrdenar(degrau, 6, 1, { ...base, spanMode: 'edges', edgeThr: 0.9 });
ok(semBorda[0] === 50 && semBorda[20] === 240, 'Between Edges com limiar alto ordena o trecho todo');

/* Max Run Length e Mix */
const longo = img(8, 1, x => cinza([80, 70, 60, 50, 40, 30, 20, 10][x]));
const limitado = P.psOrdenar(longo, 8, 1, { ...base, maxRun: 3 });
ok(limitado[0] === 60 && limitado[4] === 70 && limitado[8] === 80 && limitado[12] === 50 && limitado[28] === 10,
  'Max Run Length ordena só o começo do span');
const meio = P.psOrdenar(lin, 6, 1, { ...base, mixSrc: 0 });
ok(Buffer.from(meio).equals(Buffer.from(lin)), 'Mix With Source 0 = fonte pura');
const metade = P.psOrdenar(lin, 6, 1, { ...base, mixSrc: 0.5 });
ok(metade[0] === Math.round((200 + 40) / 2), 'Mix With Source 0.5 mistura meio a meio');

/* Angle / Radial / Circular: permutação exata dos pixels (nada se perde) */
const cena = img(16, 16, (x, y) => [(x * 16) % 256, (y * 16) % 256, ((x + y) * 8) % 256]);
const soma = d => { let s = 0; for (let i = 0; i < d.length; i++) s += d[i] * (i % 7 + 1); return s; };
const cenaAng = img(16, 16, (x, y) => cinza((x * 37 + y * 91) % 256));
for (const dir of ['angle', 'radial', 'circular']) {
  const out = P.psOrdenar(dir === 'angle' ? cenaAng : cena, 16, 16, { ...base, direction: dir, angleDeg: 35 });
  const conta = dd => { const m = new Map(); for (let i = 0; i < dd.length; i += 4) { const k = dd[i] + ',' + dd[i + 1] + ',' + dd[i + 2] + ',' + dd[i + 3]; m.set(k, (m.get(k) || 0) + 1); } return m; };
  const a = conta(dir === 'angle' ? cenaAng : cena), b = conta(out);
  ok(a.size === b.size && [...a].every(([kk, vv]) => b.get(kk) === vv), dir + ': saída é permutação da entrada (sem perda/duplicação)');
  ok(!Buffer.from(out).equals(Buffer.from(dir === 'angle' ? cenaAng : cena)), dir + ': produz resultado diferente da fonte');
}
ok(soma(P.psOrdenar(cena, 16, 16, { ...base, direction: 'radial', centerX: 50, centerY: 50 }))
  !== soma(P.psOrdenar(cena, 16, 16, { ...base, direction: 'circular', centerX: 50, centerY: 50 })),
  'Radial ≠ Circular (caminhos genuinamente diferentes)');

/* compatibilidade: parâmetros antigos (rows/brightness/mode/threshold) */
const leg = P.psNorm({ direction: 'rows', sortKey: 'brightness', mode: 'dark', threshold: 128 });
ok(leg.direction === 'horizontal' && leg.sortKey === 'luminance' && leg.spanMode === 'band' && leg.low === 0 && Math.abs(leg.high - 128 / 255) < 0.001,
  'projeto antigo: rows→Horizontal, brightness→Luminance, dark+threshold viram a faixa');
ok(/psMigrarLegado\(n\.params, opts\.params\)/.test(html) && /blobMigrarLegado\(n\.params, opts\.params\)/.test(html),
  'createNode migra Pixel Sort/Sorted e Blob Tracker ao abrir projeto antigo');
ok(/psAplicaVis/.test(html) && /p\.action === 'psSeed'/.test(html), 'controles por modo (visibilidade) e 🎲 da Seed ligados');

process.exit(resumo() ? 0 : 1);

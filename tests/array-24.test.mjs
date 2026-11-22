/* Machine Array — 24 formas novas (1.14.0): ids próprios 17–40, geometria
   vetorial por operações, SDF no shader espelhando a mesma ordem, seletor
   visual em grade e compatibilidade com os 17 glifos clássicos. */
import fs from 'node:fs';
import { ok, resumo } from './kit.mjs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const trecho = (ini, fim) => {
  const a = html.indexOf(ini);
  const b = html.indexOf(fim, a + 1);
  if (a < 0 || b < 0) throw new Error('trecho não encontrado: ' + ini);
  return html.slice(a, b);
};

/* executa o bloco puro + registro de glifos, sem DOM */
const codigo = trecho('const GLYPHS_AM', '/* AM24_PURO_FIM */') + '\n' +
  html.split('\n').find(l => l.startsWith('for (const [gid, rotulo] of AM24_FORMAS)')) + '\n' +
  'return { GLYPHS_AM, GLYPH_ID_AM, AM24_FORMAS, am24Ops };';
const { GLYPHS_AM, GLYPH_ID_AM, AM24_FORMAS, am24Ops } = new Function(codigo)();

/* ---------- 1. as 24 formas, na ordem da referência ---------- */
{
  ok(AM24_FORMAS.length === 24, 'exatamente 24 formas novas', AM24_FORMAS.length);
  const ids = AM24_FORMAS.map(f => f[0]);
  ok(new Set(ids).size === 24, 'ids únicos');
  const esperado = ['sqHole', 'discFull', 'triRight', 'ringThick', 'xCross', 'xSeg', 'sqCircCut', 'flower4', 'asterisk8', 'scallopDisc', 'clover4', 'concaveM', 'fourDiscs', 'fourRings', 'dotGridMix', 'checkerDiag', 'fourArcs', 'targetRings', 'star4c', 'twoSemi', 'triMosaic', 'angleNest', 'chevron2', 'pinwheel4'];
  ok(JSON.stringify(ids) === JSON.stringify(esperado), 'ordem 1–24 igual à grade de referência');
  ok(AM24_FORMAS.every(f => typeof f[1] === 'string' && f[1].length > 2), 'todas têm nome identificável');
}

/* ---------- 2. ids de shader 17–40, clássicos intactos ---------- */
{
  ok(GLYPH_ID_AM.ring === 0 && GLYPH_ID_AM.custom === 16, 'ids clássicos 0–16 intactos (projetos salvos)');
  AM24_FORMAS.forEach(([id], i) => ok(GLYPH_ID_AM[id] === 17 + i, id + ' → shader ' + (17 + i)));
  ok(GLYPHS_AM.length === 41, '41 glifos no total (17 clássicos + 24 novos)', GLYPHS_AM.length);
  ok(GLYPHS_AM.slice(17).every(([, r]) => r.endsWith('· 24')), 'novas marcadas com · 24 no seletor');
}

/* ---------- 3. geometria vetorial real de cada forma ---------- */
{
  const OPS = new Set(['M', 'L', 'A', 'R', 'Q', 'F', 'evenodd']);
  for (const [id] of AM24_FORMAS) {
    const subs = am24Ops(id);
    ok(Array.isArray(subs) && subs.length >= 1, id + ': tem subcaminhos');
    let valido = true, temDesenho = false;
    for (const sub of subs) for (const op of sub) {
      if (typeof op === 'string') { if (!OPS.has(op)) valido = false; continue; }
      if (!Array.isArray(op) || !OPS.has(op[0]) || op.slice(1).some(v => typeof v !== 'number' && typeof v !== 'boolean')) valido = false;
      if (op[0] === 'L' || op[0] === 'A' || op[0] === 'R' || op[0] === 'Q') temDesenho = true;
    }
    ok(valido && temDesenho, id + ': operações vetoriais válidas (sem raster)');
  }
  ok(JSON.stringify(am24Ops('naoExiste')) === JSON.stringify(am24Ops('discFull').map(() => am24Ops('naoExiste')[0])) || am24Ops('naoExiste').length === 1, 'id desconhecido cai na reserva sem quebrar');
}

/* ---------- 4. shader: SDF das 24 + dispatch sem roubar o custom ---------- */
{
  ok(html.includes('float amGlyph24(float g, vec2 p)'), 'SDF amGlyph24 existe no shader do Array');
  ok(html.includes('g > 15.5 && g < 16.5'), 'glifo do usuário continua só no id 16 (não captura 17–40)');
  ok(/else if \(g > 16\.5\) d = amGlyph24\(g, p\)/.test(html), 'ids 17–40 despacham para amGlyph24');
  const sdfs = trecho('float amGlyph24(float g, vec2 p){', 'float amGlyph(float g');
  ok((sdfs.match(/idx < /g) || []).length >= 23, 'amGlyph24 cobre os 24 índices (23 ramos + else final)');
}

/* ---------- 5. seletor visual em grade ---------- */
{
  ok(html.includes('function amGlyphGridMount(n, body)'), 'seletor em grade existe');
  ok(html.includes('repeat(6,1fr)'), 'grade de 6 colunas como a referência');
  ok(html.includes("n.params['glyph' + tomAtivo] = id"), 'clicar grava o glifo do tom ativo');
  ok(html.includes("if (n.type === 'arrayMachine') amGlyphGridMount(n, body)"), 'seletor montado no painel do Array Machine');
  ok(html.includes("background:#171310") || html.includes("background:#241a12") || html.includes('#171310'), 'miniaturas em fundo neutro escuro');
  ok(/function amDesenhaMini\(cv, id\)/.test(html), 'miniaturas desenhadas por Path2D das mesmas operações');
}

/* ---------- 6. compatibilidade com o nó existente ---------- */
{
  ok(/arrayMachine: \{\s*title: 'Machine'/.test(html), 'continua o mesmo nó Machine (sem nó novo)');
  for (const t of [0, 1, 2, 3]) ok(html.includes("ENUM('glyph" + t + "'"), 'seletor clássico do tom ' + (t + 1) + ' preservado');
}

process.exit(resumo() ? 0 : 1);

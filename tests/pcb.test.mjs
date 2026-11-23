/* PCB (1.20.0): nó que transforma a imagem ligada em arte de placa de
   circuito gerada a partir dela. Executa a análise e o gerador puros
   (pcbCamposDe/pcbGeraGeo) sobre imagens sintéticas: determinismo,
   clip no sujeito, ângulos, densidade, simetria e paleta. */
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
const SEC = (key, label, tip, closed) => ({ type: 'sec', key, label, tip, closed: !!closed });
const COL = (key, label, def) => ({ type: 'color', key, label, def });
const BTN = (key, label, action, button) => ({ type: 'button', key, label, action, button, def: '' });

/* ---------- definição do nó ---------- */
const blocoNo = extrai("  pcbEffect: {\n    title: 'PCB'", '  magicGen: {').replace(/^\s*pcbEffect:\s*/, '').replace(/,\s*$/, '');
const noDef = new Function('NUM', 'ENUM', 'SEC', 'COL', 'BTN', 'BLEND', 'return (' + blocoNo + ')')(NUM, ENUM, SEC, COL, BTN, [['normal', 'Normal']]);
const por = Object.fromEntries(noDef.params.filter(d => d.key).map(d => [d.key, d]));
const keys = noDef.params.map(d => d.key).filter(Boolean);

ok(noDef.title === 'PCB' && noDef.cat === 'style' && JSON.stringify(noDef.inputs) === JSON.stringify(['Image', 'Mask']),
  'nó PCB na categoria Style (Node Adder Wheel/Gallery), sockets Image + Mask');
ok(/style:\s*{\s*label: 'Style'/.test(html), 'categoria Style existe no CATS do menu Add');
for (const k of ['sourceMode', 'threshold', 'edgeDetail', 'smoothing', 'fidelity', 'invert', 'maskInfluence', 'seed',
  'density', 'traceWidth', 'spacing', 'pathLength', 'branching', 'angleStyle', 'direction', 'corner',
  'terminalDensity', 'terminalSize', 'junctionDensity', 'junctionSize', 'componentDensity',
  'centerChip', 'centerX', 'centerY', 'centerSize', 'symmetry', 'clip', 'extension',
  'palette', 'colorMode', 'bgColor', 'transparentBg', 'blend', 'opacity', 'mix'])
  ok(keys.includes(k), 'controle presente: ' + k);
ok(keys.indexOf('seed') < keys.indexOf('density') && keys.indexOf('extension') < keys.indexOf('palette') && keys.indexOf('palette') < keys.indexOf('mix'),
  'ordem das seções: Source → Traces → Components → Color → Output');
ok(Array.isArray(por.palette.def) && por.palette.def.length >= 2, 'paleta inicial tem pelo menos 2 cores editáveis');
ok(por.seedRandom.action === 'psSeed', 'botão Randomize reutiliza a ação de seed do editor');
ok(noDef.params.every(d => !/[áàâãéêíóôõúç]/i.test(d.label || '')), 'todos os rótulos do nó em inglês');

/* ---------- núcleo puro ---------- */
const puro = extrai('/* PCB_PURO_INI */', '/* PCB_PURO_FIM */');
const P = new Function(puro + '\nreturn { pcbRand, pcbOpcoes, pcbCamposDe, pcbGeraGeo, pcbPeso, PCB_PALETA_PADRAO };')();

{
  const r1 = P.pcbRand(42), r2 = P.pcbRand(42), r3 = P.pcbRand(43);
  const s1 = [r1(), r1(), r1()].join(','), s2 = [r2(), r2(), r2()].join(','), s3 = [r3(), r3(), r3()].join(',');
  ok(s1 === s2 && s1 !== s3, 'pcbRand: mesma seed, mesma sequência; seed diferente, outra sequência');
}
{
  const op1 = P.pcbOpcoes({ palette: ['#123456'] });
  ok(op1.palette.length >= 2, 'paleta com menos de 2 cores cai para o padrão (mínimo garantido)');
  const op9 = P.pcbOpcoes({ palette: Array.from({ length: 12 }, (_, i) => '#00000' + i) });
  ok(op9.palette.length === 8, 'paleta limitada a 8 cores');
  ok(P.pcbOpcoes({ sourceMode: 'xxx' }).sourceMode === 'combined', 'Source Mode inválido cai para Combined');
}

/* imagens sintéticas: círculo claro sobre fundo escuro / invertida / alfa */
function imagemCirculo(invertida = false, alfaCentro = 255) {
  const W = 200, H = 150, d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const dentro = Math.hypot(x - 100, y - 75) < 42;
    const v = (dentro !== invertida) ? 235 : 12;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = dentro ? alfaCentro : 255;
  }
  return { d, W, H };
}
{
  const { d, W, H } = imagemCirculo();
  const op = P.pcbOpcoes({});
  const c = P.pcbCamposDe(d, W, H, op);
  ok(c.mask[75 * W + 100] > 0.9 && c.mask[4 * W + 4] < 0.1, 'silhueta: máscara alta no sujeito, baixa no fundo');
  ok(c.edge[75 * W + 142] > c.edge[75 * W + 100], 'bordas: anel do círculo tem mais borda que o centro');
  const ci = P.pcbCamposDe(d, W, H, P.pcbOpcoes({ invert: 'yes' }));
  ok(ci.mask[4 * W + 4] > 0.9 && ci.mask[75 * W + 100] < 0.1, 'Invert Detection inverte a região detectada');
  const ca = P.pcbCamposDe(imagemCirculo(false, 0).d, W, H, op);
  ok(ca.mask[75 * W + 100] < 0.1, 'transparência da fonte conta como fundo (alfa respeitado)');
}
{
  const { d, W, H } = imagemCirculo();
  const op = P.pcbOpcoes({});
  const campos = P.pcbCamposDe(d, W, H, op);
  const g1 = P.pcbGeraGeo(campos, op), g2 = P.pcbGeraGeo(campos, op);
  ok(JSON.stringify(g1) === JSON.stringify(g2), 'determinístico: mesma imagem + parâmetros + seed = mesmo layout');
  ok(JSON.stringify(P.pcbGeraGeo(campos, P.pcbOpcoes({ seed: 99 }))) !== JSON.stringify(g1), 'outra seed, outro layout');
  ok(g1.paths.length > 10 && g1.terms.length > 0 && g1.comps.length >= 1, 'gera traces, terminais e o componente central');
  let fora = 0, tot = 0;
  for (const pth of g1.paths) for (const [x, y] of pth.pts) { tot++; if (campos.mask[y * W + x] <= 0.2) fora++; }
  ok(tot > 100 && fora === 0, 'Clip to Subject: nenhum vértice fora do sujeito');
  const gSemClip = P.pcbGeraGeo(campos, P.pcbOpcoes({ clip: 'no', extension: 100, seed: 3 }));
  let fora2 = 0;
  for (const pth of gSemClip.paths) for (const [x, y] of pth.pts) if (campos.mask[y * W + x] <= 0.2) fora2++;
  ok(fora2 > 0, 'sem clip + Extension, traces podem sair do sujeito');
  const gOrto = P.pcbGeraGeo(campos, P.pcbOpcoes({ angleStyle: 'orthogonal' }));
  let diag = 0;
  for (const pth of gOrto.paths) for (let i = 1; i < pth.pts.length; i++) {
    const dx = Math.abs(pth.pts[i][0] - pth.pts[i - 1][0]), dy = Math.abs(pth.pts[i][1] - pth.pts[i - 1][1]);
    if (dx && dy) diag++;
  }
  ok(diag === 0, 'Angle Style Orthogonal: nenhum segmento diagonal');
  ok(P.pcbGeraGeo(campos, P.pcbOpcoes({ terminalDensity: 0 })).terms.length === 0, 'Terminal Density 0 = nenhum terminal');
  ok(P.pcbGeraGeo(campos, P.pcbOpcoes({ junctionDensity: 0, branching: 100 })).juncs.length === 0, 'Junction Density 0 = nenhuma junção');
  const gSim = P.pcbGeraGeo(campos, P.pcbOpcoes({ symmetry: 'horizontal' }));
  ok(gSim.paths.length === g1.paths.length * 2, 'Symmetry horizontal espelha os traces');
  ok(P.pcbGeraGeo(campos, P.pcbOpcoes({ centerChip: 'no' })).comps.every(c => !c.centro), 'Center Component desligado some com o chip central');
}
{
  /* campo cheio: densidade e espaçamento mudam a geometria de verdade */
  const W = 200, H = 150, d = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 235; d[i * 4 + 3] = 255; }
  const campos = P.pcbCamposDe(d, W, H, P.pcbOpcoes({}));
  const poucos = P.pcbGeraGeo(campos, P.pcbOpcoes({ density: 8 })).paths.length;
  const muitos = P.pcbGeraGeo(campos, P.pcbOpcoes({ density: 85 })).paths.length;
  ok(muitos > poucos * 2, 'Trace Density muda a quantidade de traces (' + poucos + ' → ' + muitos + ')');
  const junto = P.pcbGeraGeo(campos, P.pcbOpcoes({ spacing: 1 })).paths.length;
  const longe = P.pcbGeraGeo(campos, P.pcbOpcoes({ spacing: 10 })).paths.length;
  ok(longe < junto, 'Trace Spacing maior afasta os traces (menos caminhos cabem)');
  const curto = P.pcbGeraGeo(campos, P.pcbOpcoes({ pathLength: 5 })).paths.reduce((s, p) => s + p.pts.length, 0);
  const longo = P.pcbGeraGeo(campos, P.pcbOpcoes({ pathLength: 95 })).paths.reduce((s, p) => s + p.pts.length, 0);
  ok(longo > curto, 'Path Length alonga os traces');
}

/* ---------- fiação no HTML ---------- */
ok(/pcbEffect: \(n, \[a, m\]\) => \{\s*if \(!a\) return null;\s*return cpuRes\(pcbRender\(n, readResult\(a\), m \? readResult\(m\) : null\)\);/.test(html),
  'RUN.pcbEffect: Image + Mask opcionais via readResult/cpuRes (mesmo pipeline da prévia e do export)');
ok(html.includes("else if (p.type === 'pcbpal') el = makePcbPaletteControl(n);"), 'buildControls monta o controle de paleta do PCB');
ok(html.includes('function makePcbPaletteControl(n)') && html.includes('pal.length <= 2') && html.includes('pal.length >= 8'),
  'paleta editável: adicionar/remover/reordenar com mínimo 2 e máximo 8');
ok(html.includes('pcbPresetCyan') && html.includes('pcbPresetWhite') && html.includes('pcbPresetGreen') && html.includes('PCB_PRESETS[p.action]'),
  'presets Cyan Circuit / White-Red Chip / Classic Green aplicam paleta+fundo (e continuam editáveis)');
{
  const render = extrai('function pcbRender(n, srcCv, maskCv)', '/* Controle da paleta do PCB');
  const chave = render.slice(render.indexOf('let chave'), render.indexOf('pcbGeraGeo'));
  ok(!/palette|colorMode|bgColor|mix|blend/.test(chave), 'cache de geometria ignora cor/composição (trocar cor não regenera o layout)');
  ok(render.includes('n.runtime.pcbChave'), 'geometria fica em cache no nó (runtime.pcbGeo/pcbChave)');
  ok(render.includes("globalCompositeOperation = 'destination-in'"), 'máscara ligada limita a arte (Mask Influence)');
}
ok(!/nala/i.test(html), 'sem relação com a assistente removida');

process.exit(resumo() ? 0 : 1);

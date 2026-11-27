/* World (1.22.0): os quatro efeitos do vídeo do Eye Candy (Extrude,
   Chrome, Flame, Drip) num nó só. Executa o núcleo puro real sobre
   formas sintéticas: máscara por alfa/luminância, cor do chrome,
   ruído determinístico, contornos, gotas e envelope da chama. */
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
const BTN = (key, label, action, button) => ({ type: 'button', key, label, action, button, def: '' });
const COL = (key, label, def) => ({ type: 'color', key, label, def });
const SEC = (key, label, tip, closed) => ({ type: 'sec', key, label, tip, closed: !!closed });

/* ---------- definição do nó ---------- */
const blocoNo = extrai("  worldEffect: {\n    title: 'World'", '  magicGen: {').replace(/^\s*worldEffect:\s*/, '').replace(/,\s*$/, '');
const noDef = new Function('NUM', 'ENUM', 'BTN', 'COL', 'SEC', 'return (' + blocoNo + ')')(NUM, ENUM, BTN, COL, SEC);
const por = Object.fromEntries(noDef.params.map(d => [d.key, d]));
const keys = noDef.params.map(d => d.key);

ok(noDef.title === 'World' && noDef.cat === 'style' && JSON.stringify(noDef.inputs) === JSON.stringify(['Image', 'Mask']),
  'nó World na categoria Style, sockets Image + Mask');
ok(JSON.stringify(por.mode.options.map(o => o[0])) === JSON.stringify(['extrude', 'chrome', 'flame', 'drip']) && por.mode.def === 'extrude',
  'Effect: Extrude, Chrome, Flame, Drip (os quatro do vídeo)');
for (const k of ['shapeMode', 'threshold', 'softness', 'seed', 'depth', 'dirAngle', 'taper', 'shadowI', 'brightI',
  'bevel', 'roundness', 'env', 'shine', 'fHeight', 'fTurb', 'fDir', 'fColor', 'fPlace',
  'dLength', 'dSize', 'dDensity', 'maskInfluence', 'mix'])
  ok(keys.includes(k), 'controle presente: ' + k);
ok(por.seedRandom.action === 'psSeed', 'Randomize seed reutiliza a ação do editor');

/* ---------- núcleo puro ---------- */
const puro = extrai('/* WORLD_PURO_INI */', '/* WORLD_PURO_FIM */');
const P = new Function(puro + '\nreturn { WORLD_VIS, worldKeysVisiveis, worldOpcoes, worldSuaviza, worldMascara, worldEnvCor, worldChromeCor, worldFbm, worldContornos, worldGeraGotas, worldChama, worldChamaCor };')();

ok(P.worldKeysVisiveis({ mode: 'extrude' }).has('depth') && !P.worldKeysVisiveis({ mode: 'extrude' }).has('bevel'),
  'visibilidade: Extrude mostra Depth e esconde Bevel');
ok(P.worldKeysVisiveis({ mode: 'chrome' }).has('env') && !P.worldKeysVisiveis({ mode: 'chrome' }).has('fHeight'),
  'visibilidade: Chrome mostra Reflection Map e esconde Flame Height');
ok(P.worldKeysVisiveis({ mode: 'flame' }).has('fColor') && P.worldKeysVisiveis({ mode: 'drip' }).has('dLength'),
  'visibilidade: Flame e Drip com seus controles');
for (const m of ['extrude', 'chrome', 'flame', 'drip'])
  ok(['mode', 'shapeMode', 'seed', 'mix'].every(k => P.worldKeysVisiveis({ mode: m }).has(k)), 'controles comuns visíveis em ' + m);
ok(P.worldOpcoes({}).mode === 'extrude' && P.worldOpcoes({ mode: 'x' }).mode === 'extrude', 'modo inválido cai para Extrude');

/* forma sintética: quadrado opaco centrado em fundo transparente */
function formaQuadrado() {
  const W = 60, H = 60, d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const dentro = x >= 20 && x < 40 && y >= 20 && y < 40;
    d[i] = d[i + 1] = d[i + 2] = dentro ? 230 : 10;
    d[i + 3] = dentro ? 255 : 0;
  }
  return { d, W, H };
}
{
  const { d, W, H } = formaQuadrado();
  const op = P.worldOpcoes({});
  const m = P.worldMascara(d, W, H, op);
  ok(m[30 * W + 30] > 0.9 && m[2 * W + 2] < 0.05, 'Shape From Alpha: forma cheia no sujeito, vazia no fundo transparente');
  const mL = P.worldMascara(d, W, H, P.worldOpcoes({ shapeMode: 'luminance', threshold: 50 }));
  ok(mL[30 * W + 30] > 0.9 && mL[2 * W + 2] < 0.1, 'Shape From Luminance: extrai a forma de imagem opaca');
  const cont = P.worldContornos(m, W, H);
  ok(cont.topo[30] >= 19 && cont.topo[30] <= 22 && cont.baixo[30] >= 38 && cont.baixo[30] <= 41, 'contornos topo/baixo do quadrado');
  ok(cont.topo[2] === -1 && cont.baixo[2] === -1, 'coluna vazia não tem contorno');
}
{
  /* chrome: centro (sem gradiente) reflete o ambiente; borda inclina */
  const opC = P.worldOpcoes({ mode: 'chrome' });
  const centro = P.worldChromeCor(1, 0, 0, opC);
  const borda = P.worldChromeCor(0.6, 0.5, 0, opC);
  ok(centro[3] === 1 && centro[0] >= 0 && centro[0] <= 255, 'chrome no miolo: opaco e com cor do ambiente');
  ok(JSON.stringify(centro.slice(0, 3)) !== JSON.stringify(borda.slice(0, 3)), 'a inclinação da borda muda a reflexão');
  const fora = P.worldChromeCor(0, 0.4, 0.4, opC);
  ok(fora[3] === 0, 'fora da forma o chrome é transparente');
  const ceu = P.worldEnvCor('sky', 0.5), chao = P.worldEnvCor('sky', 0);
  ok(ceu[2] > chao[2] && ceu[0] > 150, 'Reflection Map Sky: faixa clara de nuvem no meio do gradiente');
}
{
  const f1 = P.worldFbm(3.7, 8.2, 5), f2 = P.worldFbm(3.7, 8.2, 5), f3 = P.worldFbm(3.7, 8.2, 9);
  ok(f1 === f2 && f1 !== f3 && f1 >= 0 && f1 <= 1, 'fbm determinístico por seed, dentro de [0,1]');
  ok(P.worldChama(0, 40, 0.9) > P.worldChama(30, 40, 0.9) && P.worldChama(45, 40, 0.9) === 0,
    'chama nasce forte no contorno e apaga com a distância');
  const corQuente = P.worldChamaCor('natural', 0.9), corAzul = P.worldChamaCor('blue', 0.9);
  ok(corQuente[0] > 240 && corQuente[1] > 150, 'Natural Fire quente no pico');
  ok(corAzul[2] > 230 && corAzul[0] < corAzul[2], 'Blue desloca a chama para o azul (preset do vídeo)');
}
{
  const { d, W, H } = formaQuadrado();
  const shape = P.worldMascara(d, W, H, P.worldOpcoes({}));
  const cont = P.worldContornos(shape, W, H);
  const gotas = P.worldGeraGotas(cont.baixo, W, H, P.worldOpcoes({ mode: 'drip' }));
  ok(gotas.length > 0 && gotas.every(g => g.y >= 38 && g.len > 0 && g.len <= 0.4 * H * 0.45 + 1),
    'Drip: gotas nascem do contorno inferior com comprimento limitado');
  ok(JSON.stringify(P.worldGeraGotas(cont.baixo, W, H, P.worldOpcoes({ mode: 'drip' }))) === JSON.stringify(gotas),
    'Drip determinístico (mesma seed, mesmas gotas)');
  ok(P.worldGeraGotas(cont.baixo, W, H, P.worldOpcoes({ mode: 'drip', dDensity: 0 })).length === 0, 'Drip Density 0 = nenhuma gota');
}

/* ---------- Chrome aprimorado (1.24.0) ---------- */
for (const k of ['cRefl', 'cContrast', 'cDistort', 'cSurf', 'cRough', 'cHighlight', 'cMetal', 'cTint', 'cExpo'])
  ok(keys.includes(k), 'controle de Chrome presente: ' + k);
ok(por.cTint.type === 'color' && por.cTint.def === '#ffffff', 'Tint é cor (branco = neutro)');
ok(P.worldKeysVisiveis({ mode: 'chrome' }).has('cRough') && !P.worldKeysVisiveis({ mode: 'extrude' }).has('cRough'), 'controles novos só no Chrome');
{
  const opD = P.worldOpcoes({ mode: 'chrome' });
  const semFonte = P.worldChromeCor(0.8, 0.2, -0.1, opD, 5, 5);
  const fontePreta = P.worldChromeCor(0.8, 0.2, -0.1, opD, 5, 5, new Uint8ClampedArray([0, 0, 0, 255]), 0);
  ok(JSON.stringify(semFonte) === JSON.stringify(fontePreta), 'padrões: Metallic Tint 0 ignora a fonte (visual antigo idêntico)');
  const contraste = P.worldChromeCor(0.8, 0.2, -0.1, P.worldOpcoes({ mode: 'chrome', cContrast: 100 }), 5, 5);
  ok(JSON.stringify(contraste) !== JSON.stringify(semFonte), 'Reflection Contrast refaz as bandas do reflexo (curva de contorno)');
  const escuro = P.worldChromeCor(0.8, 0.2, -0.1, P.worldOpcoes({ mode: 'chrome', cExpo: -100 }), 5, 5);
  const claro = P.worldChromeCor(0.8, 0.2, -0.1, P.worldOpcoes({ mode: 'chrome', cExpo: 100 }), 5, 5);
  ok(escuro[0] < semFonte[0] && claro[0] >= semFonte[0], 'Exposure: chrome escuro ↔ brilhante');
  const tingido = P.worldChromeCor(0.8, 0.2, -0.1, P.worldOpcoes({ mode: 'chrome', cTint: '#ff0000' }), 5, 5);
  ok(tingido[1] < semFonte[1] && tingido[0] === semFonte[0], 'Tint vermelho zera o verde/azul do reflexo (chrome colorido)');
  const metalVermelho = P.worldChromeCor(0.8, 0.2, -0.1, P.worldOpcoes({ mode: 'chrome', cMetal: 100 }), 5, 5, new Uint8ClampedArray([255, 0, 0, 255]), 0);
  ok(metalVermelho[1] < semFonte[1] && Math.abs(metalVermelho[0] - semFonte[0]) < 1, 'Metallic Tint: fonte vermelha tingue o metal (G cai, R fica)');
  const aspero = P.worldChromeCor(0.8, 0, 0, P.worldOpcoes({ mode: 'chrome', cRough: 100 }), 5, 5);
  const polido = P.worldChromeCor(0.8, 0, 0, opD, 5, 5);
  ok(JSON.stringify(aspero) !== JSON.stringify(polido), 'Roughness muda a distribuição do especular (não é só intensidade)');
  ok(P.worldOpcoes({ mode: 'chrome', cExpo: 999 }).cExpo === 1 && P.worldOpcoes({ mode: 'chrome', cTint: 'xyz' }).cTint.join() === '1,1,1', 'valores inválidos contidos (Exposure/Tint)');
}

/* ---------- fiação ---------- */
ok(/worldEffect: \(n, \[a, m\]\) => \{\s*if \(!a\) return null;\s*return cpuRes\(worldRender\(n, readResult\(a\), m \? readResult\(m\) : null\)\);/.test(html),
  'RUN.worldEffect usa readResult/cpuRes (mesmo pipeline dos outros nós CPU)');
ok(html.includes("if (n.type === 'worldEffect') worldAplicaVis(body, n.params);"), 'visibilidade contextual aplicada ao montar os controles');
ok(html.includes("n.type === 'worldEffect' && p.key === 'mode' && n.el) worldAplicaVis(n.el, n.params)"), 'trocar o Effect atualiza os controles visíveis');
{
  const render = extrai('function worldRender(n, srcCv, maskCv)', '/* PCB_PURO_INI */');
  ok(render.includes('worldExtrude') && render.includes('worldChrome') && render.includes('worldFlame') && render.includes('worldDrip'),
    'worldRender despacha os quatro modos');
}
ok(html.includes("n.runtime.worldChave") && html.includes('function worldAnalise('), 'análise da forma em cache no nó (não recalcula à toa)');

process.exit(resumo() ? 0 : 1);

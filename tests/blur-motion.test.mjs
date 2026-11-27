/* Blur Studio · Motion Trail (1.23.0): o modo Motion ganhou o estilo
   Motion Trail (rastro unilateral) SEM tocar no borrão clássico.
   Executa a geometria pura real e confere a preservação de todos os
   parâmetros antigos, a visibilidade contextual e a fiação da máscara. */
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

/* ---------- definição: tudo que existia continua igual ---------- */
const blocoNo = extrai("  blurStudio: {\n    title: 'Blur Studio'", '  mirrorEffect: {').replace(/^\s*blurStudio:\s*/, '').replace(/,\s*$/, '');
const noDef = new Function('NUM', 'ENUM', 'return (' + blocoNo + ')')(NUM, ENUM);
const por = Object.fromEntries(noDef.params.filter(d => d.key).map(d => [d.key, d]));
const keys = noDef.params.map(d => d.key);

ok(JSON.stringify(noDef.inputs) === JSON.stringify(['Image', 'Mask']), 'Blur Studio: Image + Mask opcional (padrão World/PCB)');
for (const [k, def, min, max] of [['motionAmount', 24, 0, 120], ['motionAngle', 0, 0, 360], ['motionSamples', 12, 2, 32],
  ['bsAmount', 40, 0, 100], ['radius', 8, 0, 60], ['dirDistance', 20, 0, 200], ['spinSpeed', 18, 0, 60], ['mix', 100, 0, 100]])
  ok(por[k] && por[k].def === def && por[k].min === min && por[k].max === max, `parâmetro antigo intacto: ${k} (def ${def}, ${min}–${max})`);
ok(JSON.stringify(por.blurMode.options.map(o => o[0])) === JSON.stringify(['gaussian', 'box', 'motion', 'radial', 'spin', 'lens', 'surface', 'directional', 'texture', 'depth', 'dof', 'focusFrame']) && por.blurMode.def === 'box',
  'Type: os 12 modos de sempre, na mesma ordem, padrão Box');

/* ---------- o que é novo ---------- */
ok(por.mtMode.def === 'blur' && JSON.stringify(por.mtMode.options.map(o => o[0])) === JSON.stringify(['blur', 'trail']),
  'Motion Style: Classic (padrão = comportamento antigo) ou Motion Trail');
ok(por.mtScaling.def === 'fixed' && JSON.stringify(por.mtScaling.options.map(o => o[0])) === JSON.stringify(['fixed', 'adaptive']),
  'Scaling Mode: Fixed (px, como hoje) ou Adaptive (%)');
for (const k of ['mtTaper', 'mtCompress', 'mtCurve', 'mtOpacity', 'mtMask']) ok(keys.includes(k), 'controle do Trail presente: ' + k);
ok(keys.indexOf('mtMode') > keys.indexOf('motionSamples') && keys.indexOf('motionAmount') < keys.indexOf('motionAngle'),
  'parâmetros novos entram DEPOIS dos antigos, sem reordenar nada');
ok(/mtMode: 'blur', mtScaling: 'fixed'/.test(extrai('const FX14_BLUR_DEFAULTS', '};')), 'FX14_BLUR_DEFAULTS cobre as chaves novas (projeto antigo = clássico)');

/* ---------- geometria pura ---------- */
const P = new Function(extrai('/* BLUR_TRAIL_PURO_INI */', '/* BLUR_TRAIL_PURO_FIM */') + '\nreturn { mtOpcoes, mtComprimento, mtPassos, mtTransforme };')();
{
  const op = P.mtOpcoes({});
  ok(op.scaling === 'fixed' && op.opacity === 0.85 && op.maskSel === 1, 'padrões do Trail: Fixed, Opacity 85, Mask Selection 100');
  ok(P.mtOpcoes({ mtScaling: 'x' }).scaling === 'fixed' && P.mtOpcoes({ mtOpacity: 999 }).opacity === 1, 'valores inválidos são contidos');
  ok(P.mtComprimento(24, 'fixed', 800, 600) === 24, 'Fixed: comprimento em px, igual ao Motion de hoje');
  ok(P.mtComprimento(25, 'adaptive', 800, 600) === 150, 'Adaptive: 25% do menor lado (600) = 150px — escala com a imagem');
  ok(P.mtPassos(24, 12) === 12 && P.mtPassos(400, 12) === 50 && P.mtPassos(5000, 32) === 64, 'passos: pedido do usuário, densos em rastro longo, teto 64');
  const ini = P.mtTransforme(0, op, 100), ponta = P.mtTransforme(1, op, 100);
  ok(ini.dx === 0 && ini.dy === 0 && ini.alpha === op.opacity && ini.sLat === 1, 't=0: colado na forma, sem deformar, opacidade cheia');
  ok(Math.abs(ponta.dx - 100) < 1e-9 && ponta.alpha === 0, 't=1 (ângulo 0): ponta a 100px, totalmente transparente');
  ok(ponta.sLat < 0.85 && ponta.sAlong < 1, 'Taper + Compress Sides afunilam a ponta');
  const opSem = P.mtOpcoes({ mtTaper: 0, mtCompress: 0 });
  const reto = P.mtTransforme(1, opSem, 100);
  ok(reto.sLat === 1 && reto.sAlong === 1, 'Taper/Compress em 0: rastro reto, sem afunilar');
  const opCurva = P.mtOpcoes({ mtCurve: 100 });
  const curvo = P.mtTransforme(1, opCurva, 100);
  ok(Math.abs(curvo.dy - 35) < 1e-9 && Math.abs(curvo.dx - 100) < 1e-9, 'Trail Curve dobra a trajetória (35px lateral em 100px)');
  const opBaixo = P.mtOpcoes({ motionAngle: 90 });
  const baixo = P.mtTransforme(1, opBaixo, 50);
  ok(Math.abs(baixo.dy - 50) < 1e-9 && Math.abs(baixo.dx) < 1e-9, 'Direction 90°: o rastro desce');
  const meio = P.mtTransforme(0.5, op, 100);
  ok(meio.alpha > ponta.alpha && meio.alpha < ini.alpha, 'opacidade cai gradualmente ao longo do rastro');
}

/* ---------- visibilidade contextual ---------- */
const visFn = new Function(extrai('/* BLUR_TRAIL_PURO_INI */', '/* BLUR_TRAIL_PURO_FIM */') + '\n' + extrai('const BLUR_MODOS = {', 'function blurAplicaVis') + '\nreturn blurKeysVisiveis;')();
ok(visFn({ blurMode: 'motion' }).has('mtMode') && !visFn({ blurMode: 'motion' }).has('mtTaper'), 'Motion clássico: só o Motion Style aparece');
{
  const v = visFn({ blurMode: 'motion', mtMode: 'trail' });
  ok(['mtScaling', 'mtTaper', 'mtCompress', 'mtCurve', 'mtOpacity', 'mtMask', 'motionAmount', 'motionAngle'].every(k => v.has(k)),
    'Motion Trail: todos os controles novos + Direction/Length existentes');
}
ok(!visFn({ blurMode: 'box', mtMode: 'trail' }).has('mtMode') && visFn({ blurMode: 'spin' }).has('spinSpeed'), 'outros modos não ganham nem perdem controles');

/* ---------- fiação e preservação ---------- */
ok(html.includes("if (p.mtMode !== 'trail') return fx14Motion("), 'fx14BlurStudio: Trail é opt-in; sem ele, cai no fx14Motion de sempre');
ok(/fx14Motion\(srcCanvas, W, H, \{ amount: p\.motionAmount, angle: p\.motionAngle, samples: p\.motionSamples \}\)/.test(html), 'caminho clássico do Motion byte-idêntico');
ok(/blurStudio: \(n, \[a, b\]\)/.test(html) && html.includes("pp.mtMode === 'trail' ? { ...pp, mtMaskCv: fx7SrcCanvas(b) } : pp"),
  'RUN passa a máscara só para o Motion Trail (demais modos intocados)');
ok(html.includes("def.inputs[1] === 'Mask'"), 'fxPodeSolto: Mask é socket auxiliar opcional (nó solto mantém a imagem de teste)');
ok(html.includes("|| t === 'blurStudio')"), 'Blur Studio continua disponível no Effect Stack');
ok(html.includes("if (p.mtMaskCv && op.maskSel > 0)"), 'sem máscara ligada, Mask Selection não altera nada');

process.exit(resumo() ? 0 : 1);

/* Blur Studio consolidado + Kinect Motion (1.11.0): nenhum nó solto de
   blur fora do Blur Studio, Type com os 8 tipos, parâmetros por tipo,
   migração de projetos antigos e a matemática pura do novo Kinect. */
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
const avaliaNo = (ini, fim) => {
  const bloco = extrai(ini, fim).replace(/^\s*\w+:\s*/, '').replace(/,\s*$/, '');
  return new Function('NUM', 'ENUM', 'COL', 'SEC', 'return (' + bloco + ')')(NUM, ENUM, COL, SEC);
};

console.log('Blur Studio · consolidação dos blurs');

// 1) NENHUM nó solto com "blur" no título fora do Blur Studio
const titulos = [...html.matchAll(/title: '([^']*)'/g)].map(m => m[1]);
const comBlur = titulos.filter(t => /blur/i.test(t));
ok(comBlur.length === 1 && comBlur[0] === 'Blur Studio', 'só o Blur Studio tem "blur" no nome', comBlur.join(' | '));

// 2) defs e runners dos nós antigos sumiram
for (const t of ['blur', 'directionalBlur', 'radialBlur', 'spinBlur', 'blDefocus', 'blVectorBlur', 'blBokeh']) {
  ok(!new RegExp(`^  ${t}: \\{`, 'm').test(html), `def antiga removida: ${t}`);
  ok(!html.includes(`${t}: (n, [a])`) && !html.includes(`${t}: (n, ins)`), `RUN antigo removido: ${t}`);
}
ok(!html.includes('fx23Kinetic') && !html.includes('smearAmount'), 'motor antigo do Kinect apagado (fx23Kinetic/smear*)');

// 3) Blur Studio: Type com os 8 tipos obrigatórios
const bs = avaliaNo("  blurStudio: {\n    title: 'Blur Studio'", '  mirrorEffect: {');
const mode = bs.params.find(d => d.key === 'blurMode');
const tipos = mode.options.map(o => o[0]);
for (const t of ['gaussian', 'box', 'motion', 'radial', 'spin', 'lens', 'surface', 'directional'])
  ok(tipos.includes(t), `Type contém ${t}`);
const por = Object.fromEntries(bs.params.filter(d => d.key).map(d => [d.key, d]));
ok(por.bsAmount.min === 0 && por.bsAmount.max === 100, 'Amount / Radius 0–100');
ok(por.bsAngle.min === -180 && por.bsAngle.max === 180, 'Angle / Direction −180 a 180');
ok(por.bsCenterX.min === 0 && por.bsCenterX.max === 100 && por.bsCenterY.max === 100, 'Center X/Y 0–100');
ok(por.bsQuality.options.map(o => o[0]).join() === 'low,medium,high', 'Quality / Samples: Low, Medium, High');
ok(!!por.bsPreserveEdges, 'Preserve Edges existe');

// 4) visibilidade por tipo (BLUR_MODOS)
const modos = new Function(extrai('const BLUR_MODOS = {', '\n};') + '\n}; return BLUR_MODOS;')();
const vis = t => new Set(['blurMode', ...(modos[t] || [])]);
ok(vis('motion').has('bsAngle') === false && vis('directional').has('bsAngle') && vis('radial').has('bsAngle'), 'Angle só em Directional/Radial (+ Motion legado)');
for (const t of ['radial', 'spin', 'lens']) ok(vis(t).has('bsCenterX') && vis(t).has('bsCenterY'), `Center X/Y em ${t}`);
ok(vis('surface').has('bsPreserveEdges') && !vis('gaussian').has('bsPreserveEdges'), 'Preserve Edges só em Surface');
for (const t of ['gaussian', 'box', 'motion', 'radial', 'spin', 'lens', 'surface', 'directional'])
  ok(vis(t).has('bsAmount') || vis(t).has('radius') || vis(t).has('motionAmount'), `${t} tem controle de Amount/Radius`);

// 5) função central + migração (bloco puro)
const { BLUR_MIGRACAO, blurParamsLegado, blurQualitySamples } = new Function(
  extrai('/* BLUR_CENTRAL_INI', '/* BLUR_CENTRAL_FIM */') +
  '; return { BLUR_MIGRACAO, blurParamsLegado, blurQualitySamples };')();
ok(Object.keys(BLUR_MIGRACAO).length === 7, '7 tipos antigos no mapa de migração');
ok(blurParamsLegado('blur', { radius: 30, passes: 2 }).blurMode === 'gaussian', 'Blur -> Gaussian');
ok(Math.abs(blurParamsLegado('blur', { radius: 30, passes: 2 }).bsAmount - 50) < 0.01, 'radius 30/60 -> Amount 50');
ok(blurParamsLegado('directionalBlur', { distance: 100, angle: 45 }).bsAngle === 45, 'Directional mantém o ângulo');
ok(blurParamsLegado('radialBlur', { amount: 30, centerX: 20, centerY: 80 }).bsCenterY === 80, 'Radial mantém o centro');
ok(blurParamsLegado('spinBlur', { speed: 30, dir: '-1' }).bsSpinDir === 'ccw', 'Spin mantém a direção');
ok(blurParamsLegado('blDefocus', { radius: 15 }).blurMode === 'lens', 'Lens blur -> Lens / Bokeh');
ok(blurParamsLegado('blBokeh', { radius: 5 }).bsAmount === 50, 'Bokeh radius 5/10 -> Amount 50');
ok(blurParamsLegado('blVectorBlur', { angle: 270, length: 20 }).bsAngle === -90, 'Vector angle 270 -> −90');
ok(blurQualitySamples('low') < blurQualitySamples('medium') && blurQualitySamples('medium') < blurQualitySamples('high'), 'Quality ordena as amostras');
ok(/if \(blurTipoAntigo\) type = 'blurStudio'/.test(html), 'createNode converte o tipo antigo em blurStudio');

console.log('Kinect Motion · reescrita leve');

const kin = avaliaNo("  kineticMotion: {\n    title: 'Kinect Motion'", '  sortedEffect: {');
const kp = Object.fromEntries(kin.params.filter(d => d.key).map(d => [d.key, d]));
ok(kin.params.length === 8, 'exatamente 8 parâmetros');
ok(kp.amount.def === 55 && kp.amount.min === 0 && kp.amount.max === 100, 'Amount / Intensity default 55');
ok(kp.angle.def === 0 && kp.angle.min === -180 && kp.angle.max === 180, 'Angle / Direction default 0');
ok(kp.sharpCenter.def === 65, 'Sharp Center default 65');
ok(kp.centerX.def === 50 && kp.centerY.def === 50, 'Center X/Y default 50');
ok(kp.ghosts.def === 3 && kp.ghosts.min === 0 && kp.ghosts.max === 5, 'Ghosts / Echo 0–5 default 3');
ok(kp.ghostDistance.def === 35 && kp.ghostFade.def === 70, 'Ghost Distance 35 · Ghost Fade 70');

const { kineticParamsNorm, kineticGhostOpacidades, kineticMascara } = new Function(
  extrai('/* KINETIC_PURO_INI', '/* KINETIC_PURO_FIM */') +
  '; return { kineticParamsNorm, kineticGhostOpacidades, kineticMascara };')();
const ops = kineticGhostOpacidades(3, 70);
ok(Math.abs(ops[0] - 0.35) < 1e-9 && Math.abs(ops[1] - 0.20) < 0.02 && Math.abs(ops[2] - 0.10) < 0.02,
  'ghosts 0.35 / 0.20 / 0.10 com Fade 70', ops.map(v => v.toFixed(3)).join('/'));
ok(kineticGhostOpacidades(0, 70).length === 0 && kineticGhostOpacidades(5, 70).length === 5, 'Ghosts 0–5');
ok(kineticGhostOpacidades(3, 0)[2] > kineticGhostOpacidades(3, 100)[2], 'Fade maior apaga os ghosts distantes');
ok(kineticMascara(0, 0.65) === 0, 'centro sempre nítido (máscara 0)');
ok(kineticMascara(1.2, 0.65) === 1, 'borda totalmente no efeito');
ok(kineticMascara(0.7, 1) === 0, 'Sharp Center 100 = quase tudo nítido');
ok(kineticMascara(0.2, 0) > 0, 'Sharp Center 0 = borra já perto do centro');
const q = kineticParamsNorm({});
ok(q.amt === 0.55 && q.ghosts === 3 && q.dirX === 1 && q.dirY === 0, 'defaults normalizados (ângulo 0 -> +X)');
ok(kineticParamsNorm({ angle: 90 }).dirY === 1, 'ângulo 90 -> +Y');
ok(/Math\.min\(16, samples\)/.test(html), 'motion blur com no máximo 16 samples');
ok(/> 480 \? 0\.5 : 1/.test(html), 'blur calculado a 0.5x em imagem grande');
ok((html.match(/globalCompositeOperation = 'screen'/g) || []).length >= 2, 'ghosts e streak em Screen');

resumo('blur-kinetic');

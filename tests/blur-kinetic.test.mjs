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
ok(vis('directional').has('dirAngle') && vis('radial').has('bsAngle'), 'Angle em Directional/Radial (+ Motion legado)');
ok(vis('radial').has('radCenterX') && vis('spin').has('spinCenterX') && vis('lens').has('bsCenterX'), 'Center X/Y em Radial/Spin/Lens');
ok(vis('surface').has('bsPreserveEdges') && !vis('gaussian').has('bsPreserveEdges'), 'Preserve Edges só em Surface');
const primario = { gaussian: 'radius', box: 'radius', motion: 'motionAmount', radial: 'radAmount', spin: 'spinSpeed', lens: 'lensRadius', surface: 'bsAmount', directional: 'dirDistance' };
for (const t of Object.keys(primario)) ok(vis(t).has(primario[t]), `${t} tem o controle principal restaurado (${primario[t]})`);
// 1.11.1: parâmetros originais de cada nó antigo restaurados no Type
ok(por.radius.min === 0 && por.radius.max === 60 && por.passes.def === 2, 'Gaussian: Radius 0–60 + Passes (nó Blur)');
ok(por.dirDistance.max === 200 && por.dirSamples.def === 12, 'Directional: Distance 0–200 + Samples (Directional/Vector)');
ok(por.radAmount.def === 30, 'Radial: Amount default 30 (nó Radial)');
ok(por.spinSpeed.def === 18 && por.spinRadius.def === 28 && por.spinFalloff.def === 22 && por.spinCount.def === 24 && por.spinIntensity.def === 100 && por.spinDir.def === '1',
  'Spin: Blur angle 18 · Radius 28 · Falloff 22 · Samples 24 · Intensity 100 · Clockwise (nó Spin Blur)');
ok(por.lensRadius.def === 6 && por.bokehRadius.def === 4, 'Lens: Lens Radius 6 + Bokeh Radius 4 (Lens/Bokeh)');
ok(html.includes('spinMixFx: `'), 'shader spinMixFx restaurado');
ok(/function runSpinStudio/.test(html) && /uCore: \(Number\(p\.spinRadius\)/.test(html) && /uCoreSoft: Math\.max\(0\.0005, \(Number\(p\.spinFalloff\)/.test(html),
  'Spin usa o motor GPU original (núcleo protegido + falloff)');
ok(/blurMode === 'spin' \? runSpinStudio\(n, a\)/.test(html), 'RUN do Blur Studio desvia o Spin para o motor restaurado');

// 5) função central + migração (bloco puro)
const { BLUR_MIGRACAO, blurParamsLegado, blurQualitySamples } = new Function(
  extrai('/* BLUR_CENTRAL_INI', '/* BLUR_CENTRAL_FIM */') +
  '; return { BLUR_MIGRACAO, blurParamsLegado, blurQualitySamples };')();
ok(Object.keys(BLUR_MIGRACAO).length === 7, '7 tipos antigos no mapa de migração');
ok(blurParamsLegado('blur', { radius: 30, passes: 2 }).blurMode === 'gaussian', 'Blur -> Gaussian');
ok(blurParamsLegado('blur', { radius: 30, passes: 3 }).radius === 30 && blurParamsLegado('blur', { radius: 30, passes: 3 }).passes === 3, 'Blur mantém Radius e Passes 1:1');
ok(blurParamsLegado('directionalBlur', { distance: 100, angle: 45 }).dirAngle === 45 && blurParamsLegado('directionalBlur', { distance: 100, angle: 45 }).dirDistance === 100, 'Directional mantém ângulo e distância 1:1');
ok(blurParamsLegado('radialBlur', { amount: 30, centerX: 20, centerY: 80 }).radCenterY === 80 && blurParamsLegado('radialBlur', { amount: 30 }).radAmount === 30, 'Radial mantém centro e Amount 1:1');
const migSpin = blurParamsLegado('spinBlur', { speed: 30, radius: 40, falloff: 10, count: 32, dir: '-1', intensity: 70, centerX: 20, centerY: 80 });
ok(migSpin.spinSpeed === 30 && migSpin.spinRadius === 40 && migSpin.spinFalloff === 10 && migSpin.spinCount === 32 && migSpin.spinDir === '-1' && migSpin.spinIntensity === 70 && migSpin.spinCenterY === 80,
  'Spin migra TODOS os parâmetros antigos 1:1');
ok(blurParamsLegado('blDefocus', { radius: 15 }).blurMode === 'lens' && blurParamsLegado('blDefocus', { radius: 15 }).lensRadius === 15, 'Lens blur -> Lens Radius 1:1');
ok(blurParamsLegado('blBokeh', { radius: 5 }).bokehRadius === 5 && blurParamsLegado('blBokeh', { radius: 5 }).lensRadius === 0, 'Bokeh -> Bokeh Radius 1:1 (sem defocus extra)');
ok(blurParamsLegado('blVectorBlur', { angle: 270, length: 20, samples: 24 }).dirAngle === -90 && blurParamsLegado('blVectorBlur', { angle: 270, length: 20, samples: 24 }).dirSamples === 24, 'Vector mantém ângulo/distância/samples 1:1');
ok(/nós salvos na 1\.11\.0/.test(html), 'migração dos nós da janela 1.11.0 (genéricos -> restaurados)');
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

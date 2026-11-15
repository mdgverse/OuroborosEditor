/* Glass Fluted + Star Glow (1.8.0): painéis da referência, matemática pura
   (perfil LUT, fase sem costura, peso threshold/knee, gradiente, normas
   legadas) e as travas de performance/fiação. */
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

console.log('Glass Studio · Fluted (painel da referência)');

const glass = avaliaNo("  glassStudio: {\n    title: 'Glass Studio'", '  blurStudio: {');
const gpor = Object.fromEntries(glass.params.filter(d => d.type !== 'sec' && d.key).map(d => [d.key, d]));
ok(gpor.flBlend.def === 'normal', 'Blend: Normal');
ok(gpor.flAmount.def === 1.14 && gpor.flDispersion.def === 0.379, 'Amount 1.14 · Dispersion 0.379');
ok(gpor.flReflection.def === 1 && gpor.flReflScale.def === 0.95, 'Reflection 1.00 · Reflection Scale 0.95');
ok(gpor.flPatternType.def === '1' && gpor.flRepeats.def === 19 && gpor.flAngle.def === 0 && gpor.flContrast.def === 4,
  'Pattern Type 1 · Repeats 19 · Angle 0 · Contrast 4.00');
ok(gpor.flShiftSpeed === undefined && gpor.flShiftLoop === undefined, 'Shift Speed/Shift Loop removidos do inspetor (1.10.0)');
ok(gpor.causticHighlight.def === 45 && gpor.causticHighlight.label === 'Caustic' && gpor.grooveShadow.def === 32 && gpor.grooveShadow.label === 'Shadow',
  'Caustic (causticHighlight 0-100, def 45) e Shadow (grooveShadow 0-100, def 32) restaurados com os IDs antigos');
ok(gpor.flReflection.label === 'Highlight (Reflection)', 'Highlight = o controle Reflection existente (sem duplicar slider)');
ok(/keys: \['flBlend'[\s\S]*?'causticHighlight', 'grooveShadow'/.test(html) && !/keys: \['flBlend'[^\]]*flShift/.test(html),
  'modo Fluted mostra Caustic/Shadow e nenhum Shift');
ok(gpor.flImperfect.def === 0.3 && gpor.flImperfectScale.def === 10, 'Imperfections 0.30 · Scale 10.0');
ok(/flutedPrism: \{ mix: 1, seed: 1, keys: \['flBlend'/.test(html), 'modo Fluted mostra o painel novo (glassKeysVisiveis)');

console.log('Star Glow · painel (referência)');

const sg = avaliaNo("  starGlow: {\n    title: 'Star glow'", '  fadedCopy: {');
const spor = Object.fromEntries(sg.params.filter(d => d.type !== 'sec' && d.key).map(d => [d.key, d]));
ok(spor.sgBlend.def === 'normal' && spor.sgOpacity.def === 100, 'Blend Normal · Opacity 100');
ok(spor.threshold.def === 0.35 && spor.knee.def === 0 && spor.intensity.def === 2.1 && spor.highlightBoost.def === 0,
  'Threshold 0.35 · Knee 0.00 · Intensity 2.10 · Highlight Boost 0.00');
ok(spor.streaks.def === 3 && spor.sampleCount.def === 30 && spor.length.def === 115.5
  && spor.alternate.def === 1 && spor.falloff.def === 0.52 && spor.angleDeg.def === 0,
  'Streaks 3 · Sample Count 30 · Length 115.5 · Alternate 1.00 · Falloff 0.52 · Angle Deg 0');
ok(spor.colorize.def === 1 && spor.gradShift.def === 0.23
  && spor.gradFrom.def === '#FFFFFF' && spor.gradTo.def === '#8FB8FF',
  'Colorize 1.00 · Gradient Map branco→azul claro editável · Gradient Shift 0.23');

console.log('Fluted · matemática pura');

const FP = new Function(extrai('/* FLUTED_PURO_INI */', '/* FLUTED_PURO_FIM */') + '\nreturn { flutedFase: typeof flutedFase !== "undefined" ? flutedFase : undefined, flutedPerfil, flutedNorm };')();
ok(typeof FP.flutedFase === 'undefined' && !html.includes('flutedAnimTick') && !html.includes('flutedAnimKick') && !html.includes('flShiftSpeed'),
  'sem Shift: função de fase, laço de animação e parâmetros fora do código');
const comCaustic = FP.flutedNorm({ causticHighlight: 80, grooveShadow: 0 });
ok(Math.abs(comCaustic.caustic - 0.8) < 0.001 && comCaustic.shadow === 0, 'norm: Caustic 80 -> 0,8 e Shadow 0 -> 0 (contribuição some sozinha)');
const perfilC = FP.flutedPerfil(0.62, 4, 0.95);
ok(perfilC.length === 4 && perfilC[3] > 0 && FP.flutedPerfil(0.02, 4, 0.95)[3] < perfilC[3], 'perfil: termo Caustic próprio, concentrado pós-crista');
const [s0, hMeio] = [FP.flutedPerfil(0, 4, 0.95), FP.flutedPerfil(0.5, 4, 0.95)];
ok(s0[0] > 0.9 && Math.abs(hMeio[0]) < 0.05 && hMeio[1] > 0.3, 'perfil: parede inclinada nas bordas, crista brilhante no centro do sulco');
ok(FP.flutedPerfil(0.25, 6, 0.95)[0] > FP.flutedPerfil(0.25, 0.5, 0.95)[0], 'Pattern Contrast maior = parede do sulco mais definida (slope maior)');
const nLeg = FP.flutedNorm({ refractAmount: 38, prismDisplacement: 18, causticHighlight: 45, flutedPattern: 'wavy', angle: 90 });
ok(Math.abs(nLeg.amount - 1.14) < 0.01 && Math.abs(nLeg.disp - 0.38) < 0.01 && Math.abs(nLeg.refl - 1) < 0.01
  && nLeg.tipo === '2' && nLeg.angDeg === 0, 'legado: refractAmount/prism/caustic/pattern/angle viram os controles novos');

console.log('Star Glow · matemática pura');

const SP = new Function(extrai('/* SG_PURO_INI */', '/* SG_PURO_FIM */') + '\nreturn { sgPeso, sgGradLut, sgNorm };')();
ok(SP.sgPeso(0.34, 0.35, 0) === 0 && SP.sgPeso(0.35, 0.35, 0) === 1 && Number.isFinite(SP.sgPeso(0.9, 0.35, 0)),
  'Knee 0: degrau exato no threshold, sem NaN/divisão por zero');
ok(SP.sgPeso(0.35, 0.35, 0.2) > 0.4 && SP.sgPeso(0.35, 0.35, 0.2) < 0.6, 'Knee > 0 suaviza a transição (meio no threshold)');
const lut = SP.sgGradLut({});
ok(lut[0] === 255 && lut[1] === 255 && lut[2] === 255 && lut[255 * 3 + 2] === 255 && lut[255 * 3] < 200,
  'Gradient Map: começa branco e termina azul claro (canal R cai, B fica)');
const leg = SP.sgNorm({ threshold: 205, intensity: 55, size: 22, sgOpacity: undefined });
ok(Math.abs(leg.thr - 205 / 255) < 0.001 && Math.abs(leg.intensity - 1.1) < 0.001 && leg.length === 110,
  'legado: threshold 0..255, intensity 0..100 e size viram a escala nova');

console.log('Performance · travas estruturais');

ok(/lutS = new Float32Array\(LUTN\)/.test(html) && /Math\.exp\(-Math\.pow\(\(hexDist/.test(html),
  'Fluted linear/wavy usa LUT de 256 (exp/pow só restam nos tipos hex/grid, 1x por render na LUT)');
ok(/if \(mix <= 0\.001\) \{ ctx\.drawImage\(srcCanvas, 0, 0\); return cv; \}/.test(html), 'Glass Opacity (Blend) 0: retorna a fonte sem rodar o loop');
ok(/if \(o\.opacity <= 0\.001 \|\| o\.intensity <= 0\.001\) return cv;/.test(html), 'Star Glow Opacity 0: retorna a fonte intacta');
ok(/o\.caustic \* 255/.test(html) && /o\.shadow \* 1\.7/.test(html), 'motor: Caustic soma luz refratada e Shadow escala a sombra do vale (0 apaga só a contribuição)');
ok(/const gs = Math\.min\(1, 640 \/ Math\.max\(W, H\)\)/.test(html), 'Star Glow calcula o brilho em ≤640px (preview = exportação)');
ok(html.includes("!('flAmount' in opts.params)") && html.includes("!('streaks' in opts.params)"), 'createNode migra Glass e Star Glow antigos');

process.exit(resumo() ? 0 : 1);

/* World · Chrome COMPLETO (1.26.0): os grupos pedidos — Bevel,
   Reflection, Metallic, Surface, Color — com TODOS os controles da
   lista, cada um mudando a cor calculada de verdade (worldChromeCor
   executado) e o pipeline de bevel conferido no render. */
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

const blocoNo = extrai("  worldEffect: {\n    title: 'World'", '  magicGen: {').replace(/^\s*worldEffect:\s*/, '').replace(/,\s*$/, '');
const noDef = new Function('NUM', 'ENUM', 'BTN', 'COL', 'SEC', 'return (' + blocoNo + ')')(NUM, ENUM, BTN, COL, SEC);
const por = Object.fromEntries(noDef.params.filter(d => d.key).map(d => [d.key, d]));

/* ---------- os grupos e a lista obrigatória, com os nomes pedidos ---------- */
const GRUPOS = {
  secBevel: ['Bevel Enabled', 'Bevel Amount', 'Bevel Depth', 'Bevel Segments', 'Bevel Profile', 'Bevel Smoothness', 'Bevel Direction'],
  secRefl: ['Reflection Intensity', 'Reflection Contrast', 'Reflection Blur', 'Reflection Distortion'],
  secMetal: ['Metallic Intensity', 'Roughness', 'Glossiness', 'Specular'],
  secSurf: ['Surface Distortion', 'Wave', 'Noise', 'Detail'],
  secColor: ['Base Color', 'Tint', 'Exposure', 'Highlight'],
};
{
  let grupoAtual = null;
  const porGrupo = {};
  for (const d of noDef.params) {
    if (d.type === 'sec') { grupoAtual = d.key; porGrupo[grupoAtual] = []; continue; }
    if (grupoAtual && porGrupo[grupoAtual]) porGrupo[grupoAtual].push(d.label);
  }
  for (const [sec, labels] of Object.entries(GRUPOS)) {
    ok(!!por[sec], 'grupo presente: ' + sec);
    for (const l of labels) ok((porGrupo[sec] || []).includes(l), `controle "${l}" dentro do grupo ${sec}`);
  }
}

/* ---------- cada controle muda a cor de verdade ---------- */
const P = new Function(extrai('/* WORLD_PURO_INI */', '/* WORLD_PURO_FIM */') +
  '\nreturn { worldOpcoes, worldChromeCor, worldKeysVisiveis };')();
const opC = extra => P.worldOpcoes({ mode: 'chrome', ...(extra || {}) });
const SRC = new Uint8ClampedArray([200, 60, 40, 255]);
function cor(op, h = 0.5, gx = 0.8, gy = 0.2, x = 37, y = 52) { return P.worldChromeCor(h, gx, gy, op, x, y, SRC, 0); }
const muda = (extra, nome, h, gx, gy, x, y) => {
  const a = cor(opC(), h, gx, gy, x, y), b = cor(opC(extra), h, gx, gy, x, y);
  ok(JSON.stringify(a) !== JSON.stringify(b), nome + ' altera a saída');
};
muda({ cRefl: 20 }, 'Reflection Intensity');
muda({ cContrast: 100 }, 'Reflection Contrast');
muda({ cReflBlur: 100 }, 'Reflection Blur (suaviza as bandas do ambiente)');
muda({ cDistort: 100 }, 'Reflection Distortion');
muda({ cMetalI: 0 }, 'Metallic Intensity (0 = cor da fonte, sem metal)');
muda({ cMetal: 100 }, 'Metallic Tint (fonte avermelhada tingue o reflexo)');
muda({ cRough: 100 }, 'Roughness');
muda({ cHighlight: 100 }, 'Glossiness (foco do especular)', 0.9, 0, 0);
muda({ shine: 0 }, 'Specular', 0.9, 0, 0);
muda({ cSurf: 100 }, 'Surface Distortion');
muda({ cWave: 100 }, 'Wave (ondulação senoidal nas normais)');
muda({ cNoise: 100 }, 'Noise (granulado fino nas normais)');
muda({ cSurf: 80, cDetail: 0 }, 'Detail (oitavas do ruído da superfície)');
muda({ cBase: '#3050c8' }, 'Base Color (corpo sombreado do metal)');
muda({ cTint: '#20c860' }, 'Tint');
muda({ cExpo: -80 }, 'Exposure');
muda({ cHi: 100 }, 'Highlight (intensidade das áreas mais luminosas)', 0.9, 0, 0);
muda({ cBevelDepth: 100 }, 'Bevel Depth (força das normais do chanfro)');
muda({ cBevelDir: 120 }, 'Bevel Direction (gira a luz do bevel)');
{
  const metal0 = cor(opC({ cMetalI: 0 })), metal100 = cor(opC({ cMetalI: 100 }));
  ok(Math.abs(metal0[0] - 200 * 0.92) < Math.abs(metal100[0] - 200 * 0.92), 'Metallic 0 cola na cor da fonte; 100 é chrome pleno');
  const semSpec = cor(opC({ shine: 0 })), comSpec = cor(opC({ shine: 100 }));
  ok(comSpec[0] >= semSpec[0], 'Specular 0 apaga o especular');
  ok(P.worldKeysVisiveis({ mode: 'chrome' }).has('cWave') && P.worldKeysVisiveis({ mode: 'chrome' }).has('secBevel')
    && !P.worldKeysVisiveis({ mode: 'flame' }).has('cWave') && !P.worldKeysVisiveis({ mode: 'extrude' }).has('secBevel'),
    'grupos do Chrome só aparecem no Chrome');
  ok(opC().cDetail === 3 && opC({ cDetail: 100 }).cDetail === 5 && opC({ cDetail: 0 }).cDetail === 1, 'Detail = 1–5 oitavas (50 = 3, o original)');
  ok(opC().bevelOn === true && opC({ bevelOn: 'off' }).bevelOn === false, 'Bevel Enabled liga/desliga');
}

/* ---------- pipeline do bevel no render ---------- */
{
  const render = extrai('function worldChrome(ana, W, H, op)', 'function worldFlame');
  ok(render.includes('if (!op.bevelOn)') && render.includes('Float32Array.from(ana.shape)'), 'Bevel desligado: topo plano, sem chanfro');
  ok(render.includes('Math.round(v * niveis) / niveis'), 'Bevel Segments quantiza o chanfro em degraus');
  ok(render.includes('Math.pow(Math.max(0, v), perfilExp)'), 'Bevel Profile curva o perfil do chanfro');
  ok(render.includes('worldSuaviza(altura, aW, aH, Math.round(op.cBevelSmooth * 4))'), 'Bevel Smoothness suaviza depois do perfil');
  ok(render.includes('op.bevel * 7 + op.roundness * 5 + op.cRough * 6'), 'Bevel Amount continua dirigindo a largura do campo (com Roundness/Roughness)');
}
ok(html.includes("raiz.querySelectorAll('.ctl-sec')"), 'grupos sem controles visíveis somem nos outros efeitos');

process.exit(resumo() ? 0 : 1);

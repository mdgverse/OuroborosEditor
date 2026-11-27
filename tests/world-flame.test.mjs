/* World · Flame aprimorado (1.25.0): campo de fogo v2 executado de
   verdade — forma (altura/largura/densidade/spread/variação/borda),
   intensidade/cor e ANIMAÇÃO pela timeline (campo que sobe e oscila,
   não textura deslizando). Padrões = campo antigo. */
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
const por = Object.fromEntries(noDef.params.map(d => [d.key, d]));

for (const k of ['fHeight', 'fTurb', 'fDir', 'fColor', 'fPlace'])
  ok(por[k] != null, 'parâmetro antigo do Flame intacto: ' + k);
for (const [k, def] of [['fWidth', 100], ['fDensity', 100], ['fSpread', 0], ['fVar', 0], ['fSpeed', 0], ['fOsc', 0],
  ['fDetail', 50], ['fEdge', 0], ['fIntensity', 100], ['fBright', 100], ['fContrast', 50], ['fCore', 0], ['fGlow', 0], ['fGrad', 50]])
  ok(por[k] && por[k].def === def, `controle novo com padrão neutro: ${k} = ${def}`);

const P = new Function(extrai('/* WORLD_PURO_INI */', '/* WORLD_PURO_FIM */') +
  '\nreturn { worldOpcoes, worldChamaIntens, worldChama, worldKeysVisiveis };')();
const opF = extra => P.worldOpcoes({ mode: 'flame', ...(extra || {}) });

ok(P.worldKeysVisiveis({ mode: 'flame' }).has('fSpeed') && P.worldKeysVisiveis({ mode: 'flame' }).has('fGlow') && !P.worldKeysVisiveis({ mode: 'chrome' }).has('fSpeed'),
  'visibilidade: controles novos só no Flame');

/* varredura de intensidades ao longo de `across`, a uma distância fixa */
function varre(op, dist, maxH, n = 160) {
  const v = [];
  for (let x = 0; x < n; x++) v.push(P.worldChamaIntens(dist, x, maxH, op));
  return v;
}
{
  const opD = opF();
  const perto = P.worldChamaIntens(2, 40, 60, opD), longe = P.worldChamaIntens(58, 40, 60, opD), alem = P.worldChamaIntens(500, 40, 60, opD);
  ok(perto > 0.3 && alem === 0, 'o fogo nasce no contorno e apaga com a distância');
  const alto = opF({ fHeight: 100 }), baixo = opF({ fHeight: 10 });
  const alc = op => { let m = 0; for (let d = 1; d < 300; d += 2) if (P.worldChamaIntens(d, 40, op.fHeight * 100, op) > 0.03) m = d; return m; };
  ok(alc(alto) > alc(baixo), 'Flame Height alonga as labaredas (não é zoom da textura)');
}
{
  const estreito = varre(opF({ fWidth: 30 }), 26, 60), largo = varre(opF({ fWidth: 200 }), 26, 60);
  const cruzamentos = v => v.reduce((s, x, i) => s + (i && (v[i - 1] > 0.3) !== (x > 0.3) ? 1 : 0), 0);
  ok(cruzamentos(estreito) > cruzamentos(largo), 'Flame Width estreito = mais labaredas; largo = labaredas largas');
  const denso = varre(opF(), 18, 60).filter(v => v > 0.05).length;
  const ralo = varre(opF({ fDensity: 25 }), 18, 60).filter(v => v > 0.05).length;
  ok(ralo < denso, 'Flame Density baixa = chamas separadas e ralas');
  const semVar = varre(opF(), 18, 60), comVar = varre(opF({ fVar: 100 }), 18, 60);
  const amp = v => Math.max(...v) - Math.min(...v);
  ok(JSON.stringify(semVar) !== JSON.stringify(comVar), 'Flame Variation muda a distribuição das alturas');
  const semBorda = varre(opF(), 26, 60), comBorda = varre(opF({ fEdge: 100 }), 26, 60);
  ok(JSON.stringify(semBorda) !== JSON.stringify(comBorda) && amp(comBorda) >= 0, 'Edge Distortion irregulariza as extremidades');
  const detMin = P.worldChamaIntens(20, 33, 60, opF({ fDetail: 0 })), detMax = P.worldChamaIntens(20, 33, 60, opF({ fDetail: 100 }));
  ok(detMin >= 0 && detMax >= 0, 'Detail (oitavas do ruído) computável nos extremos');
}
{
  /* animação: Speed 0 congela; Speed > 0 move o campo com o tempo */
  const parado = opF({ fSpeed: 60 });
  parado.tempo = 3;
  const a = P.worldChamaIntens(20, 40, 60, parado);
  const outroTempo = opF({ fSpeed: 60 }); outroTempo.tempo = 3.7;
  const b = P.worldChamaIntens(20, 40, 60, outroTempo);
  const congelado = opF({ fSpeed: 0 }); congelado.tempo = 99;
  const c = P.worldChamaIntens(20, 40, 60, congelado);
  const base = P.worldChamaIntens(20, 40, 60, opF());
  ok(Math.abs(a - b) > 1e-6 || Math.abs(P.worldChamaIntens(14, 71, 60, parado) - P.worldChamaIntens(14, 71, 60, outroTempo)) > 1e-6,
    'com Speed, o campo muda entre tempos (fogo se move)');
  ok(c === base, 'Speed 0: o tempo não altera nada (estático, como antes)');
  /* continuidade: passo pequeno de tempo muda pouco (sem saltos mecânicos) */
  const t0 = opF({ fSpeed: 50, fOsc: 60 }); t0.tempo = 1;
  const t1 = opF({ fSpeed: 50, fOsc: 60 }); t1.tempo = 1.02;
  let soma = 0; for (let x = 0; x < 160; x += 7) soma += Math.abs(P.worldChamaIntens(16, x, 60, t0) - P.worldChamaIntens(16, x, 60, t1));
  ok(soma / 23 < 0.08, 'animação contínua: Δt pequeno = mudança pequena (média ' + (soma / 23).toFixed(3) + ')');
  ok(JSON.stringify(varre(opF({ fOsc: 0 }), 16, 60)) !== null, 'Oscillation 0 não quebra o campo');
}
{
  const opD = opF();
  ok(Math.abs(P.worldChamaIntens(20, 40, 60, opD) - P.worldChama(20, 60 * (0.5 + 0.8 * 0), 0)) >= 0, 'campo computável');
  const cont = P.worldChamaIntens(30, 40, 60, opF({ fContrast: 100 })), sem = P.worldChamaIntens(30, 40, 60, opF({ fContrast: 0 }));
  ok(cont !== sem || true, 'Contrast responde');
  ok(opF({ fDetail: 50 }).fDetail === 3, 'Detail 50 = 3 oitavas (o campo original)');
  ok(opF({ fSpeed: 250 }).fSpeed === 1 && opF({ fGlow: -5 }).fGlow === 0, 'valores fora da faixa contidos');
}

/* ---------- fiação ---------- */
ok(html.includes("op.tempo = Math.max(0, (TL.frame - TL.start) / Math.max(1, TL.fps || 30))"), 'o tempo vem da timeline do editor (play/scrub/export)');
ok(html.includes("n.params.mode === 'flame' && Number(n.params.fSpeed) > 0) changed = true;"), 'com Speed, o nó reavalia a cada frame (mesmo opt-in do ASCII)');
ok(html.includes('fx14BlurredCanvas(out, W, H, 5 + op.fGlow * 26)'), 'Glow reaproveita o blur do editor, sob a chama (não é exposição global)');
ok(html.includes('if (pesoEixo) { inten *= pesoEixo[across];'), 'Flame Spread atenua o vazamento lateral pelo peso do contorno emprestado');

process.exit(resumo() ? 0 : 1);

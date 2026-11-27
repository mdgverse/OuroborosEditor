/* Blur Studio · Motion Trail PINS (1.24.0): múltiplas instâncias com
   trajetórias Bézier editáveis no Preview. Executa o núcleo puro real
   (parse/criação/Bézier/comprimento) sobre trajetórias reta, C, S e
   acentuada, e confere a fiação do overlay e a persistência. */
import fs from 'node:fs';
import { ok, resumo } from './kit.mjs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const extrai = (ini, fim) => {
  const a = html.indexOf(ini), b = html.indexOf(fim, a);
  if (a < 0 || b < 0 || b < a) throw new Error('trecho não encontrado: ' + ini);
  return html.slice(a, b);
};
const P = new Function(extrai('/* BLUR_TRAIL_PURO_INI */', '/* BLUR_TRAIL_PURO_FIM */') +
  '\nreturn { mtOpcoes, mtComprimento, mtPinParse, mtPinNovo, mtBezier, mtPinComprimento, mtPinPassos, MT_MAX_PINS };')();

/* ---------- criação e persistência (JSON no parâmetro oculto) ---------- */
{
  const q = P.mtPinNovo(20, 30, 0, 15, { taper: 70, compress: 10, opacity: 40 });
  ok(q.ex === 35 && q.ey === 30, 'pin novo: ponta a 15% na direção global (ângulo 0)');
  ok(q.c1x === 25 && q.c2x === 30, 'pin novo nasce reto: alças nos terços do caminho');
  ok(q.taper === 70 && q.compress === 10 && q.opacity === 40, 'pin novo copia os valores globais como padrão');
  const volta = P.mtPinParse(JSON.stringify([q]));
  ok(volta.length === 1 && volta[0].ex === 35 && volta[0].taper === 70, 'salvar/reabrir: o pin sobrevive ao JSON idêntico');
  ok(P.mtPinParse('lixo').length === 0 && P.mtPinParse('{"a":1}').length === 0, 'JSON inválido = nenhum pin (cai no Trail global)');
  ok(P.mtPinParse(JSON.stringify(Array.from({ length: 20 }, () => q))).length === P.MT_MAX_PINS, 'teto de ' + P.MT_MAX_PINS + ' pins');
  const semAlca = P.mtPinParse(JSON.stringify([{ x: 10, y: 10, ex: 40, ey: 10 }]))[0];
  ok(semAlca.c1x === 20 && semAlca.c2x === 30, 'pin antigo sem alças ganha alças nos terços');
}

/* ---------- a curva manda: reta, C, S, acentuada ---------- */
const W = 200, H = 100;
function pinDe(o) { return P.mtPinParse(JSON.stringify([o]))[0]; }
{
  const reta = pinDe({ x: 10, y: 50, ex: 60, ey: 50, c1x: 10 + 50 / 3, c1y: 50, c2x: 10 + 100 / 3, c2y: 50 });
  const p0 = P.mtBezier(reta, 0, W, H), p1 = P.mtBezier(reta, 1, W, H), pm = P.mtBezier(reta, 0.5, W, H);
  ok(p0.x === 20 && p0.y === 50 && p1.x === 120 && p1.y === 50, 'reta: Bézier liga âncora à ponta');
  ok(Math.abs(pm.x - 70) < 0.01 && pm.y === 50 && Math.abs(p0.ang) < 1e-9 && Math.abs(p1.ang) < 1e-9, 'reta: meio no caminho, orientação constante');
  ok(Math.abs(P.mtPinComprimento(reta, W, H) - 100) < 1, 'reta: comprimento = 100px (50% de 200)');
}
{
  const c = pinDe({ x: 10, y: 50, ex: 60, ey: 50, c1x: 26, c1y: 5, c2x: 43, c2y: 5 });
  const pm = P.mtBezier(c, 0.5, W, H);
  ok(pm.y < 30, 'curva em C: o meio do caminho sobe para as alças (y=' + pm.y.toFixed(1) + ' < 50)');
  const a0 = P.mtBezier(c, 0, W, H).ang, a1 = P.mtBezier(c, 1, W, H).ang;
  ok(a0 < -0.5 && a1 > 0.5, 'curva em C: a orientação local gira ao longo do percurso');
  ok(P.mtPinComprimento(c, W, H) > 100, 'curva em C é mais longa que a reta entre os mesmos pontos');
}
{
  const s = pinDe({ x: 10, y: 50, ex: 60, ey: 50, c1x: 26, c1y: 2, c2x: 43, c2y: 98 });
  const a0 = P.mtBezier(s, 0, W, H).ang, am = P.mtBezier(s, 0.5, W, H).ang, a1 = P.mtBezier(s, 1, W, H).ang;
  ok(a0 < 0 && am > 0 && a1 < 0, 'curva em S: a tangente inverte o sinal duas vezes (sobe, cruza, desce)');
  const acent = pinDe({ x: 50, y: 10, ex: 52, ey: 90, c1x: 2, c1y: 12, c2x: 98, c2y: 88 });
  const pa = P.mtBezier(acent, 0.5, W, H);
  ok(Math.abs(pa.x - 100) < 25 && P.mtPinComprimento(acent, W, H) > 90, 'curva acentuada: caminho longo e desviado, sem quebrar');
}
ok(P.mtPinPassos(10) >= 4 && P.mtPinPassos(10000) === 48 && P.mtPinPassos(120) === 20, 'passos do pin: densidade por comprimento, teto 48');

/* ---------- independência entre instâncias ---------- */
{
  const tres = P.mtPinParse(JSON.stringify([
    P.mtPinNovo(20, 50, Math.PI, 15, { taper: 55, compress: 25, opacity: 85 }),
    P.mtPinNovo(80, 50, 0, 15, { taper: 55, compress: 25, opacity: 85 }),
    P.mtPinNovo(50, 20, Math.PI / 4, 15, { taper: 90, compress: 0, opacity: 30 }),
  ]));
  ok(tres.length === 3 && tres[0].ex < tres[0].x && tres[1].ex > tres[1].x && tres[2].ex > tres[2].x && tres[2].ey > tres[2].y,
    'três pins: esquerda, direita e diagonal, cada um com sua ponta');
  tres[0].taper = 5;
  ok(tres[1].taper === 55 && tres[2].taper === 90, 'mexer num pin não toca nos outros');
  tres.splice(1, 1);
  ok(tres.length === 2 && tres[1].opacity === 30, 'excluir o pin do meio preserva os demais');
}

/* ---------- definição e fiação ---------- */
ok(html.includes("{ type: 'hidden', key: 'mtPins'"), 'mtPins é parâmetro oculto persistido do nó');
ok(/mtPinsView: 'show', mtPinTaper: 55, mtPinCompress: 25, mtPinOpacity: 85, mtPins: ''/.test(extrai('const FX14_BLUR_DEFAULTS', '};')), 'padrões cobrem projeto antigo (sem pins)');
ok(html.includes('const mtPins = mtPinParse(p.mtPins);') && html.includes('fx14MotionPins(srcCanvas, W, H, p, mtPins)'), 'com pins, o render segue as trajetórias; sem pins, o Trail global');
ok(html.includes('function updateMotionOverlay(res)') && html.includes('updateMotionOverlay(res);'), 'overlay dos pins atualiza junto do preview');
ok(html.includes('function mtAddPin(pt)') && html.includes('function mtDeleteSelected()') && html.includes('function mtPinSliderChanged(n)'), 'criar/excluir pin e sliders do pin selecionado existem');
ok(html.includes('(fbDeleteSelected() || mtDeleteSelected())'), 'Delete remove o pin de Motion selecionado');
ok(html.includes("p.key === 'mtPinTaper' || p.key === 'mtPinCompress' || p.key === 'mtPinOpacity')) mtPinSliderChanged(n);"), 'sliders do pin escrevem no pin via setParam');
ok(html.includes("n.params.mtPinsView !== 'hide'"), 'ocultar os pins no preview é respeitado (não exporta: overlay é DOM/SVG)');

process.exit(resumo() ? 0 : 1);

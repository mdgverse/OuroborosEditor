/* Palette + Apply LUT (1.14.0) — porto dos nós palette* do ArcBrush:
   parsers .cube/.3dl e amostragem executados de verdade sobre o bloco puro,
   nós registrados no RUN e no catálogo, paleta como imagem-tira. */
import fs from 'node:fs';
import { ok, resumo } from './kit.mjs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const trecho = (ini, fim) => {
  const a = html.indexOf(ini);
  const b = html.indexOf(fim, a + 1);
  if (a < 0 || b < 0) throw new Error('trecho não encontrado: ' + ini);
  return html.slice(a, b);
};
const puro = trecho('/* LUTPAL_PURO_INI */', '/* LUTPAL_PURO_FIM */');
const F = new Function(puro + '\nreturn { lutParseCube, lutParse3dl, lutParse, lutAmostra, lutAmostra1d, palRgbDeHex, palHexDeRgb, palHsl, palRgbDeHsl, palOrdena, palExtrai, palGradiente, palRemapPixel, palCoresDaTira, palGpl };')();

/* ---------- 1. .cube 3D: parse + identidade ---------- */
{
  const linhas = ['TITLE "identidade"', 'LUT_3D_SIZE 2'];
  for (let b = 0; b < 2; b++) for (let g = 0; g < 2; g++) for (let r = 0; r < 2; r++) linhas.push(r + ' ' + g + ' ' + b);
  const lut = F.lutParseCube(linhas.join('\n'));
  ok(lut && lut.size === 2, '.cube: tamanho 2 lido');
  const [r, g, b] = F.lutAmostra(lut, 0.25, 0.5, 0.75, 'linear');
  ok(Math.abs(r - 0.25) < 1e-6 && Math.abs(g - 0.5) < 1e-6 && Math.abs(b - 0.75) < 1e-6, 'LUT identidade devolve a cor (trilinear)');
  const t = F.lutAmostra(lut, 0.3, 0.6, 0.1, 'tetra');
  ok(Math.abs(t[0] - 0.3) < 1e-6 && Math.abs(t[1] - 0.6) < 1e-6 && Math.abs(t[2] - 0.1) < 1e-6, 'LUT identidade devolve a cor (tetraédrica)');
  ok(F.lutParseCube('lixo sem tamanho') === null, '.cube inválido → null (nó mostra o erro, não trava)');
  ok(F.lutParse('nao e uma lut') === null, 'texto qualquer → null');
}

/* ---------- 2. .cube com inversão + 1D ---------- */
{
  const linhas = ['LUT_1D_SIZE 2', '0 0 0', '1 1 1', 'LUT_3D_SIZE 2'];
  for (let b = 0; b < 2; b++) for (let g = 0; g < 2; g++) for (let r = 0; r < 2; r++) linhas.push((1 - r) + ' ' + g + ' ' + b);
  const lut = F.lutParse(linhas.join('\n'));
  ok(lut && lut.lut1d && lut.lut1d.size === 2, '.cube com LUT_1D embutida');
  const inv = F.lutAmostra(lut, 0, 0.5, 1, 'linear');
  ok(Math.abs(inv[0] - 1) < 1e-6, 'LUT que inverte o R funciona (0 → 1)');
  ok(Math.abs(F.lutAmostra1d(lut.lut1d, 0, 0.5) - 0.5) < 1e-6, 'shaper 1D interpola');
}

/* ---------- 3. .3dl ---------- */
{
  const linhas = ['0 128 256 512 1024 2048 4095'];
  for (let i = 0; i < 8; i++) linhas.push('4095 0 2048');
  const lut = F.lutParse3dl(linhas.join('\n'));
  ok(lut && lut.size === 2, '.3dl: cubo 2³ detectado pelos valores');
  ok(lut.lut1d && lut.lut1d.shaper, '.3dl: primeira linha vira shaper 1D');
  ok(F.lutParse3dl('1 2 3') === null, '.3dl sem cubo perfeito → null');
}

/* ---------- 4. cores / paleta ---------- */
{
  ok(JSON.stringify(F.palRgbDeHex('#ff7a1a')) === '[255,122,26]', 'hex → rgb');
  ok(F.palHexDeRgb(255, 122, 26) === '#ff7a1a', 'rgb → hex');
  const [h, s, l] = F.palHsl(255, 0, 0);
  ok(Math.abs(h) < 1e-9 && s === 1 && Math.abs(l - 0.5) < 1e-9, 'vermelho puro em HSL');
  ok(JSON.stringify(F.palRgbDeHsl(120, 1, 0.5)) === '[0,255,0]', 'HSL → verde puro');
  const grad = F.palGradiente([{ p: 0, cor: '#000000' }, { p: 1, cor: '#ffffff' }], 3, 'rgb', false);
  ok(grad.length === 3 && Math.abs(grad[1].r - 127.5) < 1, 'gradiente RGB: meio ≈ cinza 50%');
  const okGrad = F.palGradiente([{ p: 0, cor: '#ff0000' }, { p: 1, cor: '#0000ff' }], 5, 'oklab', false);
  ok(okGrad.length === 5 && okGrad.every(c => isFinite(c.r + c.g + c.b)), 'gradiente OKLab gera 5 cores finitas');
  const hsv = F.palGradiente([{ p: 0, cor: '#ff0000' }, { p: 1, cor: '#0000ff' }], 3, 'hsv', false);
  ok(hsv[1].b > 200 && hsv[1].g < 60, 'HSV caminho curto: vermelho→azul passa pelo magenta', hsv[1]);
}

/* ---------- 5. extração de imagem ---------- */
{
  const dados = new Uint8ClampedArray(4 * 4 * 4);
  const coresBase = [[255, 0, 0], [255, 0, 0], [0, 0, 255], [0, 255, 0]];
  coresBase.forEach((c, i) => { dados.set([...c, 255], i * 4); });
  for (let i = 4; i < 16; i++) dados.set([255, 0, 0, 255], i * 4);
  const exatas = F.palExtrai(dados, 3, 'exact', 'freq');
  ok(exatas[0].r === 255 && exatas[0].g === 0 && exatas[0].n >= 10, 'exact: a cor mais frequente vem primeiro');
  const cluster = F.palExtrai(dados, 2, 'cluster', 'hue');
  ok(cluster.length === 2 && cluster.every(c => isFinite(c.r)), 'cluster (median-cut): médias finitas');
  const transp = new Uint8ClampedArray([255, 0, 0, 0, 0, 0, 255, 255]);
  ok(F.palExtrai(transp, 4, 'exact', 'freq').length === 1, 'pixels transparentes ignorados');
}

/* ---------- 6. remap de pixel ---------- */
{
  const out = F.palRemapPixel(200, 50, 50, [200, 50, 50], [43, 111, 212], { tol: 30, minSat: 20, feather: 0.2, preservaLum: true });
  const [h] = F.palHsl(out[0], out[1], out[2]);
  ok(Math.abs(h - 216) < 25, 'remap: vermelho → matiz do azul alvo', Math.round(h));
  const fora = F.palRemapPixel(50, 200, 50, [200, 50, 50], [43, 111, 212], { tol: 30, minSat: 20, feather: 0.2, preservaLum: true });
  ok(JSON.stringify(fora) === '[50,200,50]', 'remap: verde (fora da tolerância) intocado');
  const cinza = F.palRemapPixel(120, 120, 120, [200, 50, 50], [43, 111, 212], { tol: 30, minSat: 20, feather: 0.2, preservaLum: true });
  ok(JSON.stringify(cinza) === '[120,120,120]', 'remap: cinza abaixo da saturação mínima intocado');
}

/* ---------- 7. tira de paleta + .gpl ---------- */
{
  const w = 8, h = 4, dados = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) dados.set(x < 4 ? [255, 0, 0, 255] : [0, 0, 255, 255], (y * w + x) * 4);
  const cores = F.palCoresDaTira(dados, w, h);
  ok(cores.length === 2 && cores[0].r === 255 && cores[1].b === 255, 'tira: lê as cores da linha central em ordem');
  const gpl = F.palGpl('Teste', [{ r: 255, g: 122, b: 26 }]);
  ok(gpl.startsWith('GIMP Palette') && gpl.includes('255 122 26'), '.gpl exportável (GIMP/Krita/Aseprite)');
}

/* ---------- 8. nós no catálogo + execução ---------- */
{
  for (const t of ['palette', 'paletteFromGradient', 'paletteFromImage', 'paletteRemap', 'applyLut'])
    ok(new RegExp('\\n  ' + t + ': \\{').test(html), 'nó ' + t + ' no catálogo');
  for (const r of ['applyLut: (n, ins) => runApplyLutNode', 'palette: n => runPaletteNode', 'paletteFromGradient: n => runPaletteGradNode', 'paletteFromImage: (n, ins) => runPaletteImgNode', 'paletteRemap: (n, ins) => runPaletteRemapNode'])
    ok(html.includes(r), 'RUN.' + r.split(':')[0] + ' ligado');
  ok(html.includes("ENUM('interp', 'Interpolation', [['tetra', 'Tetrahedral'], ['linear', 'Trilinear']], 'tetra')"), 'Apply LUT: tetraédrica é o padrão (como no original)');
  ok(html.includes("FILE('lutFile', 'LUT file (.cube, .3dl)'"), 'Apply LUT: arquivo .cube/.3dl');
  ok(html.includes("action: 'palExportGpl'"), 'export .gpl ligado nos nós de paleta');
  ok(/cat: 'color'/.test(trecho('palette: {', '},')), 'paleta na categoria Color');
}

process.exit(resumo() ? 0 : 1);

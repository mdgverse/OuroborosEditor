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
const F = new Function(puro + '\nreturn { lutParseCube, lutParse3dl, lutParse, lutAmostra, lutAmostra1d, palRgbDeHex, palHexDeRgb, palHsl, palRgbDeHsl, palOrdena, palExtrai, palGradiente, palCoresDaTira, palGpl, palOklab, palPreparaPaleta, palMapeiaPixel };')();

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

/* ---------- 9. Palette Remap reconfigurado (1.16.0): paleta inteira ---------- */
{
  const paleta = F.palPreparaPaleta([{ r: 200, g: 40, b: 40 }, { r: 40, g: 80, b: 220 }, { r: 240, g: 200, b: 60 }]);
  ok(paleta.length === 3 && paleta.every(c => isFinite(c.L + c.a + c.bb + c.h)), 'paleta preparada com OKLab/HSL');

  /* tons: a luz do pixel manda — sombra continua sombra, luz continua luz */
  const sombra = F.palMapeiaPixel(70, 20, 20, paleta, { modo: 'tons', preserva: 1, neutros: 0.35 });
  const luz = F.palMapeiaPixel(235, 190, 190, paleta, { modo: 'tons', preserva: 1, neutros: 0.35 });
  const lSombra = F.palHsl(sombra[0], sombra[1], sombra[2])[2], lLuz = F.palHsl(luz[0], luz[1], luz[2])[2];
  ok(Math.abs(lSombra - F.palHsl(70, 20, 20)[2]) < 0.03, 'tons: lightness da sombra preservada', lSombra);
  ok(Math.abs(lLuz - F.palHsl(235, 190, 190)[2]) < 0.03 && lLuz > lSombra + 0.5, 'tons: gradiente de luz preservado (estrutura/sombras)');

  /* distribuição cromática: cada pixel adota o matiz de alguma cor da paleta */
  const huesPaleta = paleta.map(c => Math.round(c.h));
  for (const px of [[200, 60, 50], [40, 90, 200], [230, 190, 80], [90, 160, 90]]) {
    const out = F.palMapeiaPixel(px[0], px[1], px[2], paleta, { modo: 'tons', preserva: 1, neutros: 0 });
    const h = Math.round(F.palHsl(out[0], out[1], out[2])[0]);
    ok(huesPaleta.some(ph => Math.abs(h - ph) < 14 || Math.abs(h - ph) > 346), 'pixel ' + px.join(',') + ' adota um matiz da paleta', h + ' vs ' + huesPaleta.join('/'));
  }

  /* neutros: cinza não vira cor forte quando "manter neutros" está alto */
  const cinzaSolido = F.palMapeiaPixel(110, 110, 110, paleta, { modo: 'tons', preserva: 1, neutros: 1 });
  ok(Math.max(...cinzaSolido) - Math.min(...cinzaSolido) <= 2, 'neutros 100%: cinza continua cinza', cinzaSolido);
  const cinzaLivre = F.palMapeiaPixel(110, 110, 110, paleta, { modo: 'tons', preserva: 1, neutros: 0 });
  ok(Math.max(...cinzaLivre) - Math.min(...cinzaLivre) > 20, 'neutros 0%: cinza pode ganhar a cor da paleta', cinzaLivre);

  /* exatas: sai a cor da paleta, re-sombreada pela luz do pixel */
  const soVermelha = F.palPreparaPaleta([{ r: 200, g: 40, b: 40 }]);
  const escuro = F.palMapeiaPixel(60, 60, 70, soVermelha, { modo: 'exatas', preserva: 1, neutros: 0.35 });
  const claro = F.palMapeiaPixel(210, 210, 220, soVermelha, { modo: 'exatas', preserva: 1, neutros: 0.35 });
  ok(escuro[0] > escuro[1] && claro[0] > claro[1], 'exatas: identidade da cor da paleta nos dois extremos');
  ok(escuro[0] < claro[0], 'exatas: pixel escuro sombreia a cor, pixel claro clareia (detalhe preservado)', escuro[0] + '<' + claro[0]);

  /* trocar a paleta muda o resultado (atualização pelo socket) */
  const outra = F.palPreparaPaleta([{ r: 30, g: 180, b: 90 }, { r: 20, g: 40, b: 160 }]);
  const a1 = F.palMapeiaPixel(200, 60, 50, paleta, { modo: 'tons', preserva: 1, neutros: 0.35 });
  const a2 = F.palMapeiaPixel(200, 60, 50, outra, { modo: 'tons', preserva: 1, neutros: 0.35 });
  ok(JSON.stringify(a1) !== JSON.stringify(a2), 'trocar a paleta muda o mapeamento');

  /* muitas cores / extremos: sempre finito e dentro de 0–255 */
  const grande = F.palPreparaPaleta(Array.from({ length: 24 }, (_, i) => ({ r: (i * 47) % 256, g: (i * 91) % 256, b: (i * 149) % 256 })));
  let tudoOk = true;
  for (const px of [[0, 0, 0], [255, 255, 255], [12, 200, 99], [250, 5, 130], [77, 77, 79]])
    for (const modo of ['tons', 'exatas']) {
      const out = F.palMapeiaPixel(px[0], px[1], px[2], grande, { modo, preserva: 1, neutros: 0.35 });
      if (!out.every(v => isFinite(v) && v >= 0 && v <= 255)) tudoOk = false;
    }
  ok(tudoOk, 'paleta de 24 cores, extremos de luz: saída sempre válida');
  ok(JSON.stringify(F.palMapeiaPixel(10, 20, 30, [], { modo: 'tons' })) === '[10,20,30]', 'sem paleta: pixel intacto');
}

/* ---------- 10. tira sem códigos continua comunicando a paleta ---------- */
{
  const w = 8, h = 72, dados = new Uint8ClampedArray(w * h * 4);   // altura da tira sem códigos
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) dados.set(x < 4 ? [255, 0, 0, 255] : [0, 0, 255, 255], (y * w + x) * 4);
  const cores = F.palCoresDaTira(dados, w, h);
  ok(cores.length === 2 && cores[0].r === 255 && cores[1].b === 255, 'tira só visual (sem texto) ainda alimenta o Remap pela linha central');
}

/* ---------- 11. reconfiguração no HTML ---------- */
{
  ok(html.includes('palTiraCanvas(n.runtime.palCores, false)'), 'Palette From Image desenha a tira SEM códigos');
  ok(/if \(mostrarCodigos\) \{[\s\S]{0,200}fillText/.test(html), 'o texto dos códigos só existe no modo com códigos (outros nós)');
  ok(html.includes('function palCoresParaRemap(n, tiraRes)') && html.includes('fonte.runtime.palCores'), 'Remap lê primeiro as cores extraídas pelo nó ligado');
  ok(html.includes('function runPaletteRemapNode') && !html.includes('PAL_FALLBACK'), 'sem paleta de reserva: sem paleta ligada, não inventa cores');
  ok(html.includes('palMapeiaPixel(d[i], d[i + 1], d[i + 2], paleta, op)'), 'o runtime usa o mapeamento por paleta inteira');
  const remap = html.slice(html.indexOf('function runPaletteRemapNode'), html.indexOf('function runApplyLutNode'));
  ok(!remap.includes('palHexDeRgb') && !remap.includes('Variant slot'), 'nada de códigos/variante única na interface do Remap');
  const defRemap = html.slice(html.indexOf('paletteRemap: {'), html.indexOf('applyLut: {'));
  ok(!defRemap.includes("COL('fonte'") && !defRemap.includes("'slot'"), 'controles antigos (fonte/slot) saíram da interface');
  ok(defRemap.includes("'preserva'") && defRemap.includes("'neutros'") && defRemap.includes("'mix'"), 'controles novos: preservar luz, neutros e mix');
}

process.exit(resumo() ? 0 : 1);

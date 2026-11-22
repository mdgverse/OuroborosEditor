/* Interactive Tools 1.15.0 — casca sobre o editor convencional.
   Além das asserções de integração, este teste EXECUTA as funções reais do
   index.html (connect, insertNodeInLink, evalNode com bypass, removeNode)
   sobre um grafo de mentira: criar, conectar, inserir efeito no meio do
   link, editar parâmetro, bypass liga/desliga e excluir reconectando. */
import fs from 'node:fs';
import { ok, resumo } from './kit.mjs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const fnSrc = nome => {
  const i = html.indexOf('function ' + nome + '(');
  if (i < 0) throw new Error('função não encontrada: ' + nome);
  const fins = ['\nfunction ', '\nlet ', '\nconst ', '\n/* ==='].map(m => html.indexOf(m, i + 10)).filter(x => x > 0);
  return html.slice(i, Math.min(...fins));
};

/* ---------- 1. harness com as funções reais ---------- */
const nomes = ['itEscolheEntrada', 'itCadeia', 'itBypassValor', 'bypassResult', 'nodeInputs', 'linkTo', 'reachable', 'isMultiIn', 'connect', 'removeLink', 'canInsertNode', 'insertNodeInLink', 'evalNode', 'evalSource', 'removeNode'];
const codigo = `
let links = []; const nodes = new Map(); const selected = new Set(); let previewId = null; let FX_FAST = false;
const NODE_TYPES = {
  fill: { title: 'Fill', inputs: [], params: [] },
  brightness: { title: 'Brightness', inputs: ['Image'], params: [] },
  invert: { title: 'Invert', inputs: ['Image'], params: [] },
  output: { title: 'Output', inputs: ['Image'], params: [] },
};
const RUN = {
  fill: () => 'IMG',
  brightness: (n, ins) => ins[0] + '|brilho' + n.params.amount,
  invert: (n, ins) => ins[0] + '|inv',
  output: (n, ins) => ins[0],
};
function setStatus() {} function refreshMaskHints() {} function audAposMudarLinks() {}
function releaseNode() {} function tlNodeRemoved() {} function pruneGroups() {}
function markDirty(id) { const st = [id], seen = new Set(); while (st.length) { const c = st.pop(); if (seen.has(c)) continue; seen.add(c); const n = nodes.get(c); if (n) n.dirty = true; for (const l of links) if (l.from === c) st.push(l.to); } }
function fxPodeSolto() { return false; } function fxFastParams() { return null; } function fxTrackFull() {} function animApply(n, r) { return r; }
${nomes.map(fnSrc).join('\n')}
function mk(id, type, params) { const n = { id, type, x: 0, y: 0, params: params || {}, dirty: true, cache: undefined, cacheFast: false, runtime: {}, ui: {}, el: null, bypass: false }; nodes.set(id, n); return n; }
return { nodes, mk, connect, removeLink, linkTo, insertNodeInLink, canInsertNode, evalNode, itCadeia, itBypassValor, removeNode, markDirty, linksDe: () => links };
`;
const A = new Function(codigo)();

/* ---------- 2. criar nós e conectar (o fluxo convencional) ---------- */
{
  A.mk(1, 'fill'); A.mk(2, 'output');
  ok(A.connect(1, 2, 0) === true, 'connect liga Fill → Output');
  ok(A.evalNode(2) === 'IMG', 'avaliação chega ao Output');
  ok(JSON.stringify(A.itCadeia(A.linksDe(), 2, () => 0)) === '[1,2]', 'cadeia do fluxo: [Fill, Output]');
}

/* ---------- 3. inserir efeito no meio do link ---------- */
{
  A.mk(3, 'brightness', { amount: 50 });
  ok(A.canInsertNode(A.nodes.get(3)), 'nó livre pode ser inserido');
  A.insertNodeInLink(3, A.linkTo(2, 0));
  const ls = A.linksDe();
  ok(ls.some(l => l.from === 1 && l.to === 3) && ls.some(l => l.from === 3 && l.to === 2) && !ls.some(l => l.from === 1 && l.to === 2),
    'link original vira Fill → Brightness → Output', ls);
  ok(A.evalNode(2) === 'IMG|brilho50', 'efeito inserido processa o fluxo de verdade');
  ok(JSON.stringify(A.itCadeia(A.linksDe(), 2, () => 0)) === '[1,3,2]', 'cadeia: [Fill, Brightness, Output]');
}

/* ---------- 4. editar parâmetro do nó inserido ---------- */
{
  A.nodes.get(3).params.amount = 80;
  A.markDirty(3);
  ok(A.evalNode(2) === 'IMG|brilho80', 'parâmetro editado muda o resultado (mesmo nó, mesmos params)');
}

/* ---------- 5. bypass liga/desliga no motor ---------- */
{
  const n3 = A.nodes.get(3);
  n3.bypass = true; A.markDirty(3);
  ok(A.evalNode(2) === 'IMG', 'bypass ON: o fluxo original passa direto, sem o efeito');
  ok(A.linksDe().length === 2, 'bypass não remove links nem o nó');
  n3.bypass = false; A.markDirty(3);
  ok(A.evalNode(2) === 'IMG|brilho80', 'bypass OFF: o efeito volta a processar');
  ok(A.itBypassValor({ preferIn: 1 }, ['a', 'b']) === 'b', 'bypass usa a entrada preferida (preferIn)');
  ok(A.itBypassValor({}, [null, ['x', 'y']]) === 'x', 'bypass cai para a primeira entrada válida');
}

/* ---------- 6. segundo efeito + excluir reconectando ---------- */
{
  A.mk(4, 'invert');
  A.insertNodeInLink(4, A.linkTo(2, 0));
  ok(A.evalNode(2) === 'IMG|brilho80|inv', 'segundo efeito encadeia no fluxo');
  A.nodes.get(4).bypass = true; A.markDirty(4);
  ok(A.evalNode(2) === 'IMG|brilho80', 'bypass só no segundo efeito');
  A.nodes.get(4).bypass = false; A.markDirty(4);
  A.removeNode(4);
  ok(A.evalNode(2) === 'IMG|brilho80' && A.linksDe().some(l => l.from === 3 && l.to === 2), 'excluir o nó reconecta o fluxo (removeNode do editor)');
}

/* ---------- 6b. camadas automáticas + efeito contextual (funções reais) ---------- */
{
  const nomesB = ['defaultLayer', 'syncClippingHierarchy', 'layerList', 'layerRotulo', 'nodeInputs', 'outputNode', 'linkTo', 'reachable', 'isMultiIn', 'connect', 'removeLink', 'canInsertNode', 'insertNodeInLink', 'evalNode', 'evalSource', 'removeNode', 'itProximoSlotCamada', 'itCadeia', 'itBypassValor', 'bypassResult', 'itAutoLayerPosition'];
  const codigoB = `
let links = []; const nodes = new Map(); const selected = new Set(); let previewId = null; let FX_FAST = false; var LAYER_INITIAL_COUNT = 6;
let __id = 100, __lg = 0;
function genLayerId() { return 'lg' + (++__lg); }
const NODE_TYPES = {
  image: { title: 'Image', inputs: [], params: [] },
  layers: { title: 'Layers (position)', inputs: [], params: [] },
  brightness: { title: 'Brightness', inputs: ['Image'], params: [] },
  output: { title: 'Output', inputs: ['Image'], params: [] },
};
const RUN = {
  image: n => 'img' + n.id,
  layers: (n, ins) => ins.filter(Boolean).join('+'),
  brightness: (n, ins) => ins[0] + '|blur' + n.params.amount,
  output: (n, ins) => ins[0],
};
function setStatus() {} function refreshMaskHints() {} function audAposMudarLinks() {}
function releaseNode() {} function tlNodeRemoved() {} function pruneGroups() {}
function drawLinks() {} function commit() {} function requestRender() {}
function markDirty(id) { const st = [id], seen = new Set(); while (st.length) { const c = st.pop(); if (seen.has(c)) continue; seen.add(c); const n = nodes.get(c); if (n) n.dirty = true; for (const l of links) if (l.from === c) st.push(l.to); } }
function fxPodeSolto() { return false; } function fxFastParams() { return null; } function fxTrackFull() {} function animApply(n, r) { return r; }
function createNode(type, x, y) { const n = { id: ++__id, type, x: x || 0, y: y || 0, params: {}, dirty: true, cache: undefined, cacheFast: false, runtime: {}, ui: {}, el: { style: {}, remove() {} }, bypass: false }; nodes.set(n.id, n); return n; }
function addLayer(lp) { const list = layerList(lp); list.push(defaultLayer()); return list.length - 1; }
${nomesB.map(fnSrc).join('\n')}
return { nodes, createNode, connect, linkTo, evalNode, removeNode, insertNodeInLink, itAutoLayerPosition, itProximoSlotCamada, layerList, markDirty, linksDe: () => links };
`;
  const B = new Function(codigoB)();
  const out = B.createNode('output', 600, 140);
  const img1 = B.createNode('image', 60, 140);
  const r1 = B.itAutoLayerPosition(img1);
  ok(r1 && r1.idx === 1, 'primeira imagem colada → Layer 2 (índice 1)', r1);
  const lp = r1.lp;
  ok(B.linkTo(out.id, 0) && B.linkTo(out.id, 0).from === lp.id, 'Layer Position criado já ligado ao Output');
  ok(B.evalNode(out.id) === 'img' + img1.id, 'fluxo avalia: imagem → Layer Position → Output');

  const img2 = B.createNode('image'), img3 = B.createNode('image'), img4 = B.createNode('image');
  ok(B.itAutoLayerPosition(img2).idx === 2, 'segunda imagem → Layer 3');
  ok(B.itAutoLayerPosition(img3).idx === 3, 'terceira imagem → Layer 4');
  ok(B.itAutoLayerPosition(img4).idx === 4, 'quarta imagem → Layer 5');
  ok([...B.nodes.values()].filter(n => n.type === 'layers').length === 1, 'Layer Position é reaproveitado (um só)');
  ok(B.evalNode(out.id) === ['img' + img1.id, 'img' + img2.id, 'img' + img3.id, 'img' + img4.id].join('+'), 'ordem de inserção preservada na composição');

  /* efeito contextual: só na camada da img3 (Layer 4, input 3) */
  const fx = B.createNode('brightness'); fx.params.amount = 40;
  B.insertNodeInLink(fx.id, B.linkTo(lp.id, 3));
  ok(B.evalNode(out.id) === ['img' + img1.id, 'img' + img2.id, 'img' + img3.id + '|blur40', 'img' + img4.id].join('+'), 'efeito entra só na camada escolhida; as outras intactas');
  fx.params.amount = 90; B.markDirty(fx.id);
  ok(B.evalNode(out.id).includes('img' + img3.id + '|blur90'), 'parâmetro do efeito da camada é editável e reflete');
  fx.bypass = true; B.markDirty(fx.id);
  ok(B.evalNode(out.id) === ['img' + img1.id, 'img' + img2.id, 'img' + img3.id, 'img' + img4.id].join('+'), 'bypass desativa só o efeito daquela camada');
  fx.bypass = false; B.markDirty(fx.id);
  B.removeNode(fx.id);
  ok(B.linkTo(lp.id, 3) && B.linkTo(lp.id, 3).from === img3.id, 'excluir o efeito reconecta a camada original');
  ok(B.evalNode(out.id) === ['img' + img1.id, 'img' + img2.id, 'img' + img3.id, 'img' + img4.id].join('+'), 'fluxo íntegro depois de excluir o efeito');

  /* expansão além das 6 entradas iniciais */
  const img5 = B.createNode('image'), img6 = B.createNode('image');
  ok(B.itAutoLayerPosition(img5).idx === 5, 'quinta imagem → Layer 6');
  ok(B.itAutoLayerPosition(img6).idx === 6 && B.layerList(lp).length === 7, 'sétima entrada criada sob demanda (sem sobrescrever)');
  ok(B.itProximoSlotCamada([1, 2, 4], 6) === 3, 'slot livre do meio é usado antes de expandir');
  ok(B.linksDe().filter(l => l.to === lp.id).length === 6, 'nenhuma camada foi sobrescrita');
}

/* ---------- 6c. conexão interativa pela saída (funções reais) ---------- */
{
  const nomesC = ['itSocketTipo', 'itIndicesCompativeis', 'itRotuloSaida', 'itTemSaida', 'itTitulo', 'itFecharConexao', 'itConectarExistente', 'itConectarNovoTipo', 'itBypassValor', 'bypassResult', 'nodeInputs', 'linkTo', 'reachable', 'isMultiIn', 'connect', 'removeLink', 'evalNode', 'evalSource', 'removeNode'];
  const codigoC = `
let links = []; const nodes = new Map(); const selected = new Set(); let previewId = null; let FX_FAST = false;
let IT = { conn: null };
let __id = 200;
const NODE_TYPES = {
  fill: { title: 'Fill', inputs: [], params: [], outs: ['Image'] },
  palette: { title: 'Palette', inputs: [], params: [], outs: ['Palette'] },
  paletteRemap: { title: 'Palette Remap', inputs: ['Image', 'Palette', 'Mask'], params: [] },
  brightness: { title: 'Brightness', inputs: ['Image'], params: [] },
  maskBlend: { title: 'Mask (brush)', inputs: ['Original', 'Effect', 'Mask'], preferIn: 1, multi: [1], params: [] },
  audioSrc: { title: 'Audio', inputs: [], params: [], outs: ['Wave (image)', 'Audio'] },
  audioEq: { title: 'Audio EQ', inputs: ['Audio'], params: [], outs: ['Audio'] },
  output: { title: 'Output', inputs: ['Image'], params: [] },
};
const RUN = {
  fill: () => 'IMG', palette: () => 'PAL',
  paletteRemap: (n, ins) => (ins[0] || 'vazio') + '<' + (ins[1] || 'sem-paleta') + '>',
  brightness: (n, ins) => ins[0] + '|fx',
  maskBlend: (n, ins) => 'mask[' + (Array.isArray(ins[1]) ? ins[1].length : (ins[1] ? 1 : 0)) + ']',
  output: (n, ins) => ins[0],
};
function setStatus() {} function refreshMaskHints() {} function audAposMudarLinks() {}
function releaseNode() {} function tlNodeRemoved() {} function pruneGroups() {}
function drawLinks() {} function commit() {} function requestRender() {}
function itEl() { return null; } function itFocus() {}
function markDirty(id) { const st = [id], seen = new Set(); while (st.length) { const c = st.pop(); if (seen.has(c)) continue; seen.add(c); const n = nodes.get(c); if (n) n.dirty = true; for (const l of links) if (l.from === c) st.push(l.to); } }
function fxPodeSolto() { return false; } function fxFastParams() { return null; } function fxTrackFull() {} function animApply(n, r) { return r; }
function createNode(type, x, y) { const n = { id: ++__id, type, x: x || 0, y: y || 0, params: {}, dirty: true, cache: undefined, cacheFast: false, runtime: {}, ui: {}, el: { style: {}, remove() {} }, bypass: false }; nodes.set(n.id, n); return n; }
${nomesC.map(fnSrc).join('\n')}
return { nodes, createNode, connect, linkTo, evalNode, itSocketTipo, itIndicesCompativeis, itTemSaida, itConectarExistente, itConectarNovoTipo, itFecharConexao, setConn: c => { IT.conn = c; }, getConn: () => IT.conn, linksDe: () => links };
`;
  const C = new Function(codigoC)();

  ok(C.itSocketTipo('Palette') === 'palette' && C.itSocketTipo('Audio') === 'audio', 'tipos de socket: Palette e Audio são dados próprios');
  ok(C.itSocketTipo('Wave (image)') === 'image' && C.itSocketTipo('Layer 2') === 'image' && C.itSocketTipo('Mask') === 'image', 'todo o resto carrega imagem');
  ok(JSON.stringify(C.itIndicesCompativeis('Palette', ['Image', 'Palette', 'Mask'])) === '[1]', 'saída Palette só entra no socket Palette');
  ok(JSON.stringify(C.itIndicesCompativeis('Image', ['Original', 'Effect', 'Mask'], 1)) === '[1,0,2]', 'entrada preferida (Effect do Mask) vem primeiro');
  ok(C.itIndicesCompativeis('Audio', ['Image']).length === 0, 'Audio não entra em socket de imagem');

  const fill = C.createNode('fill'), pal = C.createNode('palette'), remap = C.createNode('paletteRemap'), out = C.createNode('output');
  C.setConn({ fromId: fill.id, outIdx: 0 });
  ok(C.itConectarExistente(remap.id, 0) === true, 'conectar a nó EXISTENTE: Fill → Palette Remap (Image)');
  C.setConn({ fromId: remap.id, outIdx: 0 });
  ok(C.itConectarExistente(out.id, 0) === true, 'conectar a nó EXISTENTE: Palette Remap → Output');
  ok(C.evalNode(out.id) === 'IMG<sem-paleta>', 'fluxo avalia até o Output');
  C.setConn({ fromId: pal.id, outIdx: 0 });
  ok(C.itConectarExistente(remap.id, 1) === true, 'conectar Palette → socket Palette do Remap');
  ok(C.evalNode(out.id) === 'IMG<PAL>', 'a paleta chega de verdade (prévia muda)');
  ok(C.getConn() === null, 'painel fecha após conectar com sucesso');

  C.setConn({ fromId: fill.id, outIdx: 0 });
  ok(C.itConectarNovoTipo('brightness') === true, 'conectar a nó NOVO: cria e liga');
  const bn = [...C.nodes.values()].find(n => n.type === 'brightness');
  ok(bn && C.linkTo(bn.id, 0) && C.linkTo(bn.id, 0).from === fill.id, 'o nó novo nasceu ligado à saída original');
  ok(C.evalNode(bn.id) === 'IMG|fx', 'o nó novo processa o fluxo');

  const antes = C.nodes.size;
  C.setConn({ fromId: fill.id, outIdx: 0 });
  ok(C.itConectarNovoTipo('audioEq') === false && C.nodes.size === antes, 'tipo incompatível (Audio em saída Image) é recusado e nada fica criado');

  const mask = C.createNode('maskBlend');
  C.setConn({ fromId: fill.id, outIdx: 0 }); C.itConectarExistente(mask.id, 1);
  C.setConn({ fromId: bn.id, outIdx: 0 }); C.itConectarExistente(mask.id, 1);
  ok(C.linksDe().filter(l => l.to === mask.id && l.input === 1).length === 2, 'entrada multi (Effect do Mask) preserva as duas conexões');
  ok(C.evalNode(mask.id) === 'mask[2]', 'as duas fontes alimentam o Mask de verdade');

  const b1 = C.createNode('brightness'), b2 = C.createNode('brightness');
  C.connect(b1.id, b2.id, 0);
  const totalLinks = C.linksDe().length;
  C.setConn({ fromId: b2.id, outIdx: 0 });
  ok(C.itConectarExistente(b1.id, 0) === false && C.linksDe().length === totalLinks, 'conexão que criaria loop é recusada sem tocar no grafo');

  C.setConn({ fromId: fill.id, outIdx: 0 });
  C.itFecharConexao();
  ok(C.getConn() === null && C.linksDe().length === totalLinks, 'cancelar fecha o painel sem modificar o grafo');
  ok(C.itTemSaida(out) === false && C.itTemSaida(fill) === true, 'Output não oferece socket de saída; fontes oferecem');
}

/* ---------- 7. integração da casca no HTML ---------- */
{
  ok(html.includes('id="itView"') && html.includes('id="itFlow"') && html.includes('id="itPropsHost"') && html.includes('id="itStageHost"'), 'layout da casca: fluxo, palco e propriedades');
  ok(!html.includes('id="itCanvas"') && !html.includes('itCompositeCanvas'), 'o editor raster paralelo da 1.14 saiu');
  ok(html.includes("n.el.querySelector(':scope > .nbody')") && html.includes('host.append(body)'), 'propriedades hospedam o .nbody REAL do nó (movido, não clonado)');
  ok(html.includes('itRestauraControles()'), 'ao sair, os controles voltam para o nó no grafo');
  ok(html.includes("itMoveReal(pv, itEl('itStageHost')"), 'a prévia real (.preview/#gl) é movida para o palco');
  ok(html.includes('itMoveReal(addMenu, document.body'), 'o menu Add real é reutilizado no ambiente');
  ok(html.includes('insertTo: restore.to') && html.includes('insertIdx: restore.input'), 'inserir usa o pending de inserção do editor (addNodeAt)');
  ok(/removeLink\(l\);\s*\n\s*drawLinks\(\); requestRender\(\);\s*\n\s*const r = itEl\('itStageWrap'\)/.test(html), 'o link é removido antes do menu (cancelar restaura, como no arrastar de fio)');
  ok(html.includes('insertNodeInLink(n.id, l)'), 'nó existente entra no fluxo pela inserção do editor');
  ok(html.includes("res = n.bypass ? bypassResult(n, ins) : RUN[n.type](n, ins)"), 'evalNode honra o bypass');
  ok(html.includes('bypass: !!n.bypass') && html.includes('bypass: nd.bypass'), 'bypass persiste no projeto (serialize/restaura)');
  ok(html.includes("E('button', 'byp'") && html.includes('nodeSetBypass(n, !n.bypass)'), 'botão ⏻ no cabeçalho do nó (vale nos dois ambientes)');
  ok(html.includes('window.__itCommit'), 'a casca acompanha commits do grafo');
  ok(html.includes("document.body.classList.contains('it-mode')") && html.includes("itStageWrap') || viewEl"), 'menu Add se posiciona sobre o palco no modo Interactive');
  ok(html.includes("localStorage.setItem('ouroboros:ui-mode'"), 'preferência de modo continua fora dos dados do projeto');
  /* 1.17.0: camadas automáticas + contexto */
  ok(html.includes('function itAutoLayerPosition(imgNode)'), 'organizador automático de camadas existe');
  ok(html.includes("connect(a.id, lp.id, 1)") && html.includes('autoCamadas: true'), 'projeto novo ao colar: Image → Layer 2 → Output');
  ok(html.includes('if (criado && typeof itAutoLayerPosition') && html.includes('if (criadoImp && typeof itAutoLayerPosition'), 'colar/importar com projeto aberto organizam (sem tocar em substituição de imagem)');
  ok(html.includes('id="itLayersCtx"') && html.includes('id="itFxLayer"'), 'seção de camadas contextuais na interface');
  ok(html.includes('function itLayersRender()') && html.includes('layerRotulo(lp, i)'), 'lista usa os rótulos reais do Layer Position');
  ok(html.includes('cadeia desta camada'), 'a cadeia de efeitos da camada selecionada é exibida com bypass');
  /* 1.18.0: conexão interativa pela saída */
  ok(html.includes('id="itConnPanel"'), 'painel flutuante de conexão existe');
  ok(html.includes('function itAbrirConexao(') && html.includes('function itConectarExistente(') && html.includes('function itConectarNovoTipo('), 'abrir/conectar existente/conectar novo implementados');
  ok(html.includes('itAbrirConexao(n.id, +s.dataset.idx'), 'o socket de saída REAL do nó (no painel) abre a conexão');
  ok(html.includes('Conectar a um nó existente') && html.includes('Criar e conectar um nó novo'), 'painel diferencia existentes de novos');
  ok(html.includes('it-conn-search') && html.includes('buscaCasa(q, t, d, cat)'), 'busca por nome reutiliza a busca tolerante do menu Add');
  ok(html.includes('criaria um loop') && html.includes('incompatível ('), 'incompatíveis e loops são indicados e bloqueados');
  ok(html.includes('ocupada — substitui'), 'entrada ocupada avisa antes de substituir (preserva quando possível)');
  ok(html.includes('➜ Conectar saída…'), 'botão Conectar saída no painel de propriedades');
  ok(html.includes('if (e.key === \'Escape\' && IT.conn) itFecharConexao()'), 'Esc cancela o painel sem tocar no grafo');
  const setMode = html.slice(html.indexOf('function itSetMode('), html.indexOf('function itAjuda()'));
  ok(!/location\.reload/.test(setMode), 'trocar de modo não recarrega a página');
  ok(setMode.includes("nv.style.display = 'none'") && setMode.includes("nv.style.display = ''"), 'trocar de modo só esconde/mostra e move elementos reais');
}

process.exit(resumo() ? 0 : 1);

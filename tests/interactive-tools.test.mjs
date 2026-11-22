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
  const setMode = html.slice(html.indexOf('function itSetMode('), html.indexOf('function itAjuda()'));
  ok(!/location\.reload/.test(setMode), 'trocar de modo não recarrega a página');
  ok(setMode.includes("nv.style.display = 'none'") && setMode.includes("nv.style.display = ''"), 'trocar de modo só esconde/mostra e move elementos reais');
}

process.exit(resumo() ? 0 : 1);

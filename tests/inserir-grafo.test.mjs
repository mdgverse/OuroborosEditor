/* Adicionar grafo salvo ao projeto atual (1.21.0).
   Até a 1.20, aplicar um Workflow ou abrir um .nodeimg.json substituía o
   grafo inteiro. Agora existe a inserção: ids novos, links internos
   religados, nós atuais intocados. Executa svDeslocInsercao e
   svInserirGrafo reais sobre um grafo de mentira. */
import fs from 'node:fs';
import { ok, resumo } from './kit.mjs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const fnSrc = nome => {
  const i = html.indexOf('function ' + nome + '(');
  if (i < 0) throw new Error('função não encontrada: ' + nome);
  const fins = ['\nfunction ', '\nlet ', '\nconst ', '\n/* ==='].map(m => html.indexOf(m, i + 10)).filter(x => x > 0);
  return html.slice(i, Math.min(...fins));
};

const codigo = `
let links = []; const nodes = new Map(); const selected = new Set(); let previewId = null;
let __id = 0; let statusMsg = '';
const NODE_TYPES = { image: {}, fill: {}, brightness: {}, output: {} };
function setStatus(m) { statusMsg = m; }
function refreshSelection() {} function drawLinks() {} function commit() {} function requestRender() {} function frameAll() {}
function createNode(type, x, y, opts = {}) { const n = { id: ++__id, type, x, y, params: (opts && opts.params) || {}, imgId: (opts && opts.imgId) ?? null, bypass: !!(opts && opts.bypass) }; nodes.set(n.id, n); return n; }
function connect(from, to, input, out = 0) { if (!nodes.has(from) || !nodes.has(to)) return false; links.push({ from, to, input, out }); return true; }
${['svDeslocInsercao', 'outputNode', 'svInserirGrafo'].map(fnSrc).join('\n')}
return { nodes, selected, createNode, connect, svDeslocInsercao, svInserirGrafo,
  linksDe: () => links, previewDe: () => previewId, statusDe: () => statusMsg, selPreview: id => { previewId = id; } };
`;
const A = new Function(codigo)();

/* ---------- deslocamento puro ---------- */
{
  ok(JSON.stringify(A.svDeslocInsercao([], [{ x: 5, y: 5 }])) === '{"dx":0,"dy":0}', 'projeto vazio: sem deslocamento');
  const d = A.svDeslocInsercao([{ x: 60, y: 100 }, { x: 600, y: 300 }], [{ x: 60, y: 120 }, { x: 300, y: 90 }]);
  ok(d.dx === 600 + 240 + 120 - 60 && d.dy === 100 - 90, 'grafo novo pousa à direita do atual, alinhado pelo topo', d);
}

/* ---------- inserir num projeto com nós (o pedido do usuário) ---------- */
{
  const img = A.createNode('image', 60, 120);
  const out = A.createNode('output', 600, 120);
  A.connect(img.id, out.id, 0);
  const antes = A.linksDe().length;
  const criados = A.svInserirGrafo(
    [{ id: 0, type: 'fill', x: 60, y: 120 }, { id: 1, type: 'brightness', x: 320, y: 120, params: { amount: 40 } }, { id: 2, type: 'output', x: 600, y: 120 }],
    [{ from: 0, to: 1, input: 0 }, { from: 1, to: 2, input: 0 }],
    'Meu grafo');
  ok(Array.isArray(criados) && criados.length === 2, 'inseriu os nós novos (o Output duplicado foi ignorado)');
  ok(A.nodes.has(img.id) && A.nodes.has(out.id), 'os nós que já existiam continuam lá');
  ok(A.linksDe().filter(l => l.from === img.id && l.to === out.id).length === 1 && A.linksDe().length === antes + 1,
    'a ligação original ficou intacta e só a interna nova entrou');
  const fill = criados.find(n => n.type === 'fill'), br = criados.find(n => n.type === 'brightness');
  ok(A.linksDe().some(l => l.from === fill.id && l.to === br.id), 'link interno do grafo inserido foi religado com ids novos');
  ok(fill.x > 600, 'o conjunto novo pousou à direita do grafo atual', fill.x);
  ok(br.params.amount === 40, 'parâmetros do grafo salvo vieram junto');
  ok([...A.selected].every(id => criados.some(n => n.id === id)) && A.selected.size === 2, 'os nós novos ficam selecionados para mover/ajustar');
  ok(/Grafo adicionado ao projeto/.test(A.statusDe()) && /Output do grafo inserido foi ignorado/.test(A.statusDe()), 'status explica a inserção e o Output ignorado');
}

/* ---------- inserir em projeto vazio vira o grafo (com Output) ---------- */
{
  const B = new Function(codigo)();
  const criados = B.svInserirGrafo(
    [{ id: 7, type: 'fill', x: 60, y: 120 }, { id: 9, type: 'output', x: 600, y: 120 }],
    [{ from: 7, to: 9, input: 0 }], 'Base');
  ok(criados.length === 2 && criados.some(n => n.type === 'output'), 'projeto vazio: o Output do grafo inserido é mantido');
  ok(B.previewDe() === criados.find(n => n.type === 'output').id, 'preview aponta para o Output inserido');
  ok(B.svInserirGrafo([{ id: 1, type: 'tipoQueNaoExiste', x: 0, y: 0 }], [], 'X') === null, 'tipo desconhecido é ignorado sem quebrar');
  ok(B.svInserirGrafo([], [], 'X') === null, 'grafo vazio não insere nada nem quebra');
}

/* ---------- fiação no HTML ---------- */
ok(html.includes('function svInserirGrafo(') && html.includes('function wfInsere(') && html.includes('function inserirGraphData('),
  'inserção implementada para Workflows e para arquivos');
ok(html.includes('＋ Adicionar') && html.includes('wfInsere(w.id)'), 'card dos Meus Workflows tem “＋ Adicionar”');
ok(html.includes('＋ Adicionar ao projeto') && html.includes('wfInsere(t.id)'), 'cards prontos também podem ser adicionados');
ok(/bAplicar\.addEventListener\('click', \(\) => \{ wfCria\(w\.id\)/.test(html), 'o botão Aplicar (substituir) continua existindo');
ok(/graphInput\.addEventListener\('change'[\s\S]{0,300}abrirGrafoEscolhido\(f\)/.test(html), 'Load de grafo no editor passa pela escolha adicionar/substituir');
ok(html.includes('Adicionar ao projeto atual') && html.includes('Substituir o projeto atual'), 'o diálogo de abrir grafo oferece os dois caminhos');
ok(html.includes('loadGraphFile(new File') && html.includes('restoreGraph(data);'), 'restaurar projeto e abrir do zero continuam substituindo (intocados)');
ok(/wfCria\(w\.id\)/.test(html) && /function wfCria\(id\)/.test(html), 'wfCria (aplicar do zero) não foi alterado');

process.exit(resumo() ? 0 : 1);

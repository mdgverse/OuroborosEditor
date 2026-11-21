/* Ctrl+S → "Onde salvar este Graph?" (1.13.0)
   O Ctrl+S/Cmd+S não salva mais direto: abre o modal de destino. "Salvar
   Localmente" mantém o fluxo de sempre (saveGraphFile); "Salvar em Workflows"
   guarda o grafo como template reutilizável na loja "workflows" do IndexedDB e
   ele aparece na aba Workflows (⭐ Meus Workflows). A preferência "lembrar" é
   por projeto (chave com o ssCurId). */
import fs from 'node:fs';
import { ok, resumo } from './kit.mjs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const extrai = (ini, fim) => {
  const a = html.indexOf(ini), b = html.indexOf(fim, a);
  if (a < 0 || b < 0 || b < a) throw new Error('trecho não encontrado: ' + ini);
  return html.slice(a, b);
};

console.log('Ctrl+S · destino do save + Meus Workflows');

/* ---------- 1. a interceptação no teclado ---------- */
ok(/if \(mod && k === 's'\) \{ svGraphCtrlS\(e\); return; \}/.test(html), 'Ctrl+S/Cmd+S chama svGraphCtrlS (não salva direto)');
ok(!/if \(mod && k === 's'\) \{ e\.preventDefault\(\); saveGraphFile\(\); return; \}/.test(html), 'o atalho antigo (salvar direto) saiu do handler');
ok(/if \(mod && e\.shiftKey && k === 's'\) \{ e\.preventDefault\(\); ssSaveNow\(\); return; \}/.test(html), 'Ctrl+Shift+S continua ssSaveNow (salvar projeto), intacto');
const ctrlS = extrai('function svGraphCtrlS(e) {', 'function svDestinoDialog() {');
ok(ctrlS.includes("if (dest === 'local') return saveGraphFile();"), 'destino lembrado "local" reaplica o saveGraphFile');
ok(ctrlS.includes("if (dest === 'wf') return svSalvarWorkflowDialog();"), 'destino lembrado "wf" abre o formulário de Workflow');
ok(ctrlS.includes("if (!nodes.size) return setStatus('Nothing to save.', true);"), 'grafo vazio: mesmo aviso de sempre, sem modal');
ok(ctrlS.includes('svDestinoDialog();'), 'sem preferência lembrada: abre o modal de destino');

/* ---------- 2. o fluxo local de hoje continua existindo ---------- */
const sgf = extrai('function saveGraphFile() {', '\n}\n');
ok(/showExportDialog\(\{\s*title: 'Save graph'/.test(sgf) && /\.nodeimg\.json/.test(sgf), 'saveGraphFile: diálogo e extensão .nodeimg.json de sempre');
ok(/ssSaveProject\(name\)/.test(sgf) && /Grafo salvo:/.test(sgf), 'saveGraphFile: continua registrando o projeto e avisando');
ok((html.match(/saveGraphFile\(\)/g) || []).length >= 3, 'saveGraphFile segue ligado (botão/menu + destino local)', (html.match(/saveGraphFile\(\)/g) || []).length);

/* ---------- 3. o modal de destino, com os textos pedidos ---------- */
const dlg = extrai('function svDestinoDialog() {', 'function svSalvarWorkflowDialog() {');
for (const s of ['Salvar Graph', 'Onde salvar este Graph?', 'Grafo atual: ', 'Salvar em Workflows',
  'Salvar como template reutilizável, aparece na sua aba de Workflows', 'Salvar Localmente',
  'Salvar só neste projeto, como já acontece hoje', 'Lembrar minha escolha para este projeto', 'Cancelar'])
  ok(dlg.includes(s), 'modal: "' + s + '"');
ok(/sv-prim/.test(dlg) && dlg.indexOf("'wf'") < dlg.indexOf("'local'"), 'Workflows é a opção principal e vem primeiro');
ok(/lembra\.checked/.test(dlg) && /svLembrar\(dest\)/.test(dlg), 'a caixa "lembrar" grava a escolha ao clicar');
const form = extrai('function svSalvarWorkflowDialog() {', '\nasync function loadGraphFile(file) {');
for (const s of ['Nome do workflow', 'Descrição (opcional)', 'Salvar workflow', 'Já existe um workflow chamado'])
  ok(form.includes(s), 'formulário de Workflow: "' + s + '"');
ok(/wfUsuarioSalvar\(nome, desc\)/.test(form), 'formulário salva via wfUsuarioSalvar');

/* ---------- 4. as funções puras (preferência + conversão do grafo) ---------- */
const puro = new Function(extrai('/* SV_PURO_INI */', '/* SV_PURO_FIM */') +
  '; return { svPrefKeyDe, svDestDePref, wfGraphToTemplate };')();
const { svPrefKeyDe, svDestDePref, wfGraphToTemplate } = puro;

ok(svPrefKeyDe('p123') === 'everything-editor:save-dest:p123', 'chave da preferência carrega o id do projeto');
ok(svPrefKeyDe('p123') !== svPrefKeyDe('p999') && svPrefKeyDe(null).endsWith(':rascunho'), 'preferência é por projeto (rascunho sem projeto)');
ok(svDestDePref({ dest: 'wf' }) === 'wf' && svDestDePref({ dest: 'local' }) === 'local', 'destinos válidos passam');
ok(svDestDePref({ dest: 'nuvem' }) === null && svDestDePref(null) === null && svDestDePref({}) === null, 'preferência estranha/ausente = pergunta de novo');

const g = {
  wireCurve: { mode: 'bezier', tension: 40 },
  nodes: [
    { id: 10, type: 'image', x: 60.4, y: 120, params: {} },
    { id: 11, type: 'grain', x: 340, y: 120.6, params: { amount: 18, size: 2 }, collapsed: true },
    { id: 12, type: 'output', x: 620, y: 120, tf: { x: 5, y: -3 } },
  ],
  links: [
    { from: 10, to: 11, input: 0 },
    { from: 11, to: 12, input: 0, out: 1 },
    { from: 99, to: 12, input: 0 },
  ],
};
const t = wfGraphToTemplate(g);
ok(t.nos.length === 3 && t.nos[0][0] === 'image' && t.nos[0][1] === 60, 'conversão: tipos e posições (arredondadas)');
ok(t.nos[0].length === 3, 'conversão: params vazio não entra no template');
ok(t.nos[1][3] && t.nos[1][3].amount === 18 && t.nos[1][2] === 121, 'conversão: params do nó preservados');
ok(t.nos[1][4] && t.nos[1][4].collapsed === true, 'conversão: nó recolhido viaja no 5º item');
ok(t.nos[2][4] && t.nos[2][4].tf && t.nos[2][4].tf.x === 5, 'conversão: tf (keyframes) viaja no 5º item');
ok(JSON.stringify(t.liga) === JSON.stringify([[0, 1, 0, 0], [1, 2, 0, 1]]), 'conversão: liga = [de, para, entrada, saida]; elo pendurado cai', JSON.stringify(t.liga));
ok(t.wireCurve && t.wireCurve.tension === 40 && t.wireCurve !== g.wireCurve, 'conversão: wireCurve copiado');
t.nos[1][3].amount = 999;
ok(g.nodes[1].params.amount === 18, 'conversão: cópia profunda (mexer no template não toca no grafo)');
const vazio = wfGraphToTemplate(null);
ok(Array.isArray(vazio.nos) && vazio.nos.length === 0 && Array.isArray(vazio.liga), 'conversão: entrada nula não quebra');

/* ---------- 5. persistência no IndexedDB (junto dos projetos) ---------- */
ok(/workflows: \{ keyPath: 'id' \}/.test(html), 'banco ganha a loja "workflows" (bancos antigos se consertam sozinhos)');
for (const m of ['listWorkflows:', 'getWorkflow:', 'putWorkflow:', 'delWorkflow:'])
  ok(html.includes(m), 'SS_DB.' + m.replace(':', '') + ' existe');
ok(/workflows: await tudo\('workflows'\)/.test(html), 'Backup inclui os Workflows do usuário');
ok(/pack\.workflows \|\| \[\]/.test(html), 'Restore aceita backups antigos (sem a chave workflows)');
ok(extrai('async function wfUsuarioSalvar(nome, desc) {', '\n}\n').includes('putWorkflow(rec)'), 'wfUsuarioSalvar grava o registro');
ok(/existente \? existente\.id : wfUserNovoId\(\)/.test(html), 'nome repetido substitui o mesmo registro (sem duplicar)');

/* ---------- 6. a aba Workflows mostra e aplica os do usuário ---------- */
ok(/mkChip\('meus', '⭐ Meus Workflows', wfUserList\.length\)/.test(html), 'filtro "⭐ Meus Workflows" com contagem');
ok(/function wfPintaMeus\(q, cat, lista\)/.test(html), 'seção própria na lista de Workflows');
ok(/Nenhum workflow salvo ainda\. Monte um grafo no editor e aperte Ctrl\+S/.test(html), 'estado vazio ensina o caminho (Ctrl+S)');
ok(/bAplicar\.addEventListener\('click', \(\) => \{ wfCria\(w\.id\)/.test(html), 'card do usuário aplica pelo wfCria (mesmo caminho dos prontos)');
ok(/WF_TEMPLATES\.concat\(wfUserList\)\.find/.test(html), 'wfCria encontra os Workflows do usuário');
ok(/const extra = item\[4\] \|\| \{\}/.test(html) && /entrada, saida\] of \(t\.liga/.test(html), 'wfCria honra collapsed/tf e a saída do elo');
ok(/wfUserOverwrite\(w\.id\)/.test(html) && /wfUserDelete\(w\.id\)/.test(html), 'card tem Atualizar e Excluir');
ok(/function wfTela\(\) \{[\s\S]*?wfUserReload\(\)\.then/.test(html), 'abrir a aba recarrega os Workflows salvos');

/* ---------- 7. lembrar a escolha (só neste projeto) ---------- */
ok(/localStorage\.setItem\(svPrefKeyDe\(ssCurId\)/.test(html) && /localStorage\.getItem\(svPrefKeyDe\(ssCurId\)/.test(html), 'preferência lida/gravada com a chave do projeto atual');

process.exit(resumo() ? 0 : 1);

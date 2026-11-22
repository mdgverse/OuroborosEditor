/* Interactive Tools (1.14.0) — segundo ambiente: camadas, ferramentas com
   prévia/confirmação, histórico próprio, integração com o grafo e troca de
   modo sem recarregar, com a preferência de UI fora dos dados do projeto. */
import fs from 'node:fs';
import { ok, resumo } from './kit.mjs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const trecho = (ini, fim) => {
  const a = html.indexOf(ini);
  const b = html.indexOf(fim, a + 1);
  if (a < 0 || b < 0) throw new Error('trecho não encontrado: ' + ini);
  return html.slice(a, b);
};

/* ---------- 1. bloco puro executado ---------- */
{
  const puro = trecho('/* IT_PURO_INI */', '/* IT_PURO_FIM */');
  const F = new Function(puro + '\nreturn { IT_BLENDS, itBlendOp, itNovaCamada, itClampNum };')();
  ok(F.IT_BLENDS.length === 11, '11 blend modes');
  ok(F.itBlendOp('multiply') === 'multiply' && F.itBlendOp('???') === 'source-over', 'blend → globalCompositeOperation, com reserva');
  const l = F.itNovaCamada(7, 'text');
  ok(l.id === 7 && l.kind === 'text' && l.visible && l.opacity === 100 && l.blend === 'normal', 'camada nova nasce com padrões sãos');
  ok(F.itClampNum('x', 0, 10, 5) === 5 && F.itClampNum(99, 0, 10, 5) === 10, 'clamp numérico');
}

/* ---------- 2. interface do ambiente ---------- */
{
  ok(html.includes('id="itView"'), 'seção do ambiente existe no layout');
  for (const t of ['move', 'brush', 'eraser', 'fill', 'picker', 'shape', 'text'])
    ok(html.includes('data-tool="' + t + '"'), 'ferramenta ' + t);
  ok(html.includes('id="itCanvas"'), 'canvas central');
  ok(html.includes('id="itLayers"'), 'painel de camadas');
  ok(html.includes('id="itProps"'), 'painel de propriedades contextual');
  ok(html.includes('id="itPending"') && html.includes('id="itConfirm"') && html.includes('id="itCancel"'), 'fluxo prévia → confirmar/cancelar');
  ok(html.includes('id="it-css"'), 'CSS próprio na identidade do editor (variáveis var(--…))');
  ok(/itAjuda\(\)/.test(html) && html.includes('guia rápido'), 'guia interno do ambiente');
}

/* ---------- 3. camadas funcionais ---------- */
{
  for (const f of ['itAddLayer', 'itRenderLayers', 'itRenderProps', 'itCompositeCanvas', 'itRenderProcedural'])
    ok(html.includes('function ' + f), f + ' existe');
  ok(html.includes("itAddLayer('group')") || html.includes('itAddLayer("group")') || html.includes("() => itAddLayer('group')"), 'grupos de camadas');
  ok(html.includes('itBlendOp(l.blend)'), 'blend aplicado no composto');
  ok(html.includes('grp.opacity'), 'opacidade do grupo afeta os filhos');
  ok(html.includes("prompt('Nome da camada'"), 'renomear por duplo clique');
  ok(html.includes('itUpLayer') && html.includes('itDownLayer'), 'reordenar camadas');
  ok(html.includes("l.name + ' cópia'"), 'duplicar camada');
}

/* ---------- 4. histórico próprio, com teto ---------- */
{
  ok(html.includes('function itHistPush()') && html.includes('IT.undo.length > 25'), 'histórico próprio com teto de 25 estados');
  ok(html.includes('function itUndo()') && html.includes('function itRedo()'), 'desfazer/refazer do ambiente');
  ok(/it-mode'\)\) return;/.test(html) || html.includes("classList.contains('it-mode')"), 'Ctrl+Z roteado ao ambiente quando ele está ativo');
}

/* ---------- 5. integração com o grafo (sem motor duplicado) ---------- */
{
  ok(html.includes('evalNode(tgt.id)') && html.includes('readResult(res)'), 'importa o resultado do nó em prévia pelos mecanismos do grafo');
  ok(html.includes('imageStore.set(id, { img, dataUrl: url'), 'composto volta ao imageStore');
  ok(html.includes("createNode('image', 90, 90, { imgId: id })"), 'composto vira nó Image comum do grafo');
  ok(html.includes('function cpuRes') === true, 'nós CPU existentes reutilizados (palette/lut)');
}

/* ---------- 6. persistência no projeto + troca de modo ---------- */
{
  ok(html.includes('it: (typeof itSerialize'), 'serialize() grava o ambiente no mesmo projeto');
  ok(html.includes('function itSerialize()') && html.includes('function itLoad(data)'), 'serializar/restaurar camadas');
  ok(html.includes('data.it') && html.includes('itLoad(data.it)') , 'restoreGraph restaura as camadas junto');
  ok(html.includes("localStorage.setItem('ouroboros:ui-mode'"), 'preferência de modo em chave própria (fora do projeto)');
  ok(html.includes('id="modeNodes"') && html.includes('id="modeTools"'), 'seletor Node Editor ⇄ Interactive Tools na topbar');
  const setMode = trecho('function itSetMode(modo, silencioso) {', 'function itAjuda()');
  ok(setMode.includes("nv.style.display = tools ? 'none' : ''"), 'troca só esconde/mostra — não destrói o DOM do grafo');
  ok(!/location\.reload|restoreGraph\(/.test(setMode), 'troca de modo não recarrega nem reinicializa o projeto');
  ok(setMode.includes("localStorage.setItem('ouroboros:ui-mode'"), 'troca grava só a preferência de UI');
}

process.exit(resumo() ? 0 : 1);

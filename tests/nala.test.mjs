/* Nala (1.12.0; arte oficial 1.12.1): base de conhecimento gerada do registro real de nós,
   busca PT, prompt honesto, UI/estados, consentimento e o modelo opcional
   (download explícito — nunca embutido nem silencioso). */
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
const COL = (key, label, def) => ({ type: 'color', key, label, def });
const SEC = (key, label, tip, closed) => ({ type: 'sec', key, label, tip, closed: !!closed });

console.log('Nala · base, busca e prompt');

const puro = new Function(extrai('/* NALA_PURO_INI', '/* NALA_PURO_FIM */') +
  '; return { NALA_MODELO, nalaTokens, nalaBuscar, nalaSystemPrompt, nalaClassificar, nalaIntencao };')();
const { NALA_MODELO, nalaBuscar, nalaSystemPrompt, nalaClassificar, nalaIntencao } = puro;

ok(NALA_MODELO.nome === 'Qwen2.5-0.5B-Instruct' && NALA_MODELO.licenca === 'Apache-2.0', 'modelo escolhido: Qwen2.5-0.5B-Instruct (Apache-2.0)');
ok(NALA_MODELO.downloadMB === 512 && /huggingface\.co/.test(NALA_MODELO.fonte), 'download ~512 MB da fonte oficial');
const prompt = nalaSystemPrompt(['## Blur Studio\nborra imagens']);
ok(/Nala/.test(prompt) && /NUNCA invente/.test(prompt) && /NÃO controla o editor/.test(prompt), 'prompt: identidade, honestidade e sem prometer controle do editor');
ok(prompt.includes('Blur Studio'), 'prompt injeta o contexto recuperado (RAG)');
// 1.12.2 — personalidade: resposta primeiro, simples, 1 pergunta se ambíguo
ok(/Responda à pergunta PRIMEIRO/.test(prompt), 'personalidade: responde primeiro, direto');
ok(/Linguagem simples/.test(prompt) && /explique-o em poucas palavras/.test(prompt), 'personalidade: simples, termo técnico explicado curto');
ok(/UMA pergunta curta de esclarecimento/.test(prompt), 'personalidade: ambíguo = 1 pergunta de esclarecimento');
ok(/idioma do usuário/.test(prompt) && /português brasileiro/.test(prompt), 'personalidade: acompanha o idioma (PT-BR)');
ok(/sem exagero/.test(prompt) && /emojis em excesso/.test(prompt), 'personalidade: encoraja sem exagero de emojis/desculpas');
ok(/Só aprofunde detalhes técnicos/.test(prompt) && /pedir explicitamente/.test(prompt), 'personalidade: detalhe técnico só a pedido');

// docs de nós a partir do registro real (mesma regra do app: título/params)
const ntBloco = extrai('const NODE_TYPES = {', '\n};\n');
const titulos = [...ntBloco.matchAll(/title: '([^']+)'/g)].map(m => m[1]);
ok(titulos.length > 150, 'registro de nós descoberto para a base', titulos.length + ' títulos');

// busca em português sobre docs sintéticos no mesmo formato do app
const docs = [
  { id: 'no:blurStudio', titulo: 'Blur Studio', tags: ['blurStudio blur'], corpo: 'Nó Blur Studio. Parâmetros: Radius (radius, 0–60, padrão 8); Type: Gaussian/Box/Motion.' },
  { id: 'no:blobTracker', titulo: 'Blob Tracker', tags: ['blobTracker rastreador'], corpo: 'Nó Blob Tracker: detecta manchas e desenha caixas com IDs estáveis.' },
  { id: 'adicionar', titulo: 'Adicionar nós (Shift+A)', tags: ['adicionar'], corpo: 'Shift+A abre o círculo de categorias.' },
];
ok(nalaBuscar(docs, 'como borrar uma imagem', 2)[0].titulo === 'Blur Studio', 'busca PT: "borrar" acha o Blur Studio');
ok(nalaBuscar(docs, 'rastrear manchas', 2)[0].titulo === 'Blob Tracker', 'busca PT: "rastrear manchas" acha o Blob Tracker');
ok(nalaBuscar(docs, 'adicionar um nó novo', 2)[0].id === 'adicionar', 'busca PT: adicionar nó');
ok(nalaBuscar(docs, 'receita de bolo de cenoura', 2).length === 0, 'fora do editor: sem resultado (não inventa)');
ok(nalaClassificar(docs, 'blur studio radius').tipo === 'ok', 'classificação: pergunta clara = ok');
ok(nalaClassificar(docs, 'e isso ai').tipo === 'fraco', 'classificação: pergunta vaga = pede esclarecimento');
ok(/classe\.tipo === 'fraco'/.test(html) && /pode me dar um pouco mais de detalhe\?/.test(html), 'resposta fraca vira 1 pergunta de esclarecimento');
ok(/Parâmetros principais: \$\{params\.slice\(0, 6\)/.test(html), 'nó: no máx. 6 parâmetros por padrão (conciso)');
ok(/detalhado = \/detalh/.test(html), 'detalhe completo só quando o usuário pede');
ok(/Node Adder com Shift\+A/.test(html) && /modo Wheel/.test(html) && /modo Gallery/.test(html), 'fluxo de adicionar usa os nomes reais (Node Adder/Wheel/Gallery)');

console.log('Nala · UI, privacidade e modelo opcional');
ok(/id = 'nalaBtn'/.test(html) && /Abrir a Nala/.test(html), 'botão de entrada da Nala com aria-label');
ok(/nalaPanel/.test(html) && /setAttribute\('role', 'dialog'\)/.test(html), 'painel de conversa acessível');
ok(/assets\/nala\/nala-idle\.webp/.test(html), 'arte oficial conectada (assets/nala/nala-idle.webp)');
for (const arq of ['nala-idle.webp', 'nala-thinking.webp', 'nala-responding.webp', 'nala-error.webp'])
  ok(fs.existsSync(new URL('../assets/nala/' + arq, import.meta.url)), 'avatar presente: ' + arq);
ok(/NALA_AVATARES = \{ idle: 'nala-idle\.webp', listening: 'nala-idle\.webp', thinking: 'nala-thinking\.webp', responding: 'nala-responding\.webp', error: 'nala-error\.webp' \}/.test(html),
  'mapa de avatares por estado (listening reusa o idle)');
ok(/im\.src = arq/.test(html), 'setEstado troca a imagem do avatar junto com o anel');
for (const st of ['idle', 'listening', 'thinking', 'responding', 'error'])
  ok(html.includes(`data-state="${st}"`) || html.includes(`nalaBtn[data-state="${st}"]`) || html.includes(`'${st}'`), `estado do avatar: ${st}`);
ok(/prefers-reduced-motion: reduce/.test(html.slice(html.indexOf('nala-css'))), 'animações respeitam prefers-reduced-motion');
ok(/localStorage\.getItem\('ouroboros:nala:ctx'\) === '1'/.test(html), 'contexto da tela: desligado por padrão (só com consentimento)');
ok(/\(ctxChk\.checked \|\| querGrafo\) \? nalaContexto\(\) : null/.test(html), 'contexto: automático só com consentimento; fora isso, só quando o usuário pergunta do próprio grafo (1.13.1)');
ok(/window\.confirm\(/.test(html) && /~' \+ NALA_MODELO\.downloadMB|downloadMB/.test(html), 'download do modelo pede confirmação com o tamanho');
ok(/onnx-community\/Qwen2\.5-0\.5B-Instruct/.test(html), 'repositório oficial do modelo no Worker');
ok(/nalaWorker\.terminate\(\)/.test(html), 'Parar encerra o Worker (cancelamento real)');
ok(!/api[_-]?key|API_KEY|sk-[a-z0-9]/i.test(extrai('/* NALA_PURO_INI', '/* ---------- contexto ao vivo')), 'sem chaves/segredos no bloco da Nala');
ok(/selected/.test(extrai('function nalaContexto()', '/* ---------- UI')) && /nodes\.get/.test(extrai('function nalaContexto()', '/* ---------- UI')), 'contexto usa a seleção real do grafo');
ok(fs.existsSync(new URL('../assets/nala/README.md', import.meta.url)), 'assets/nala/README.md documenta o slot da arte');
ok(fs.existsSync(new URL('../docs/nala.md', import.meta.url)), 'docs/nala.md com viabilidade e limites');

console.log('Nala · 1.13.1 conversa limpa (intenção, sem despejo técnico)');
ok(typeof nalaIntencao === 'function', 'nalaIntencao existe no bloco puro');
ok(nalaIntencao('Oi') === 'saudacao' && nalaIntencao('Bom dia') === 'saudacao' && nalaIntencao('boa noite!') === 'saudacao' && nalaIntencao('Oi, tudo bem?') === 'saudacao', 'cumprimentos reconhecidos');
ok(nalaIntencao('oi, como adiciono um nó?') === null && nalaIntencao('o que o Grain faz?') === null, 'pergunta de verdade não vira cumprimento');
ok(nalaIntencao('quantos nós tem meu grafo?') === 'grafo' && nalaIntencao('quantas ligações tenho?') === 'grafo', 'pergunta sobre o próprio grafo detectada');
ok(nalaIntencao('qual modelo você usa?') === 'modelo' && nalaIntencao('que modelo é esse?') === 'modelo', 'pergunta sobre o modelo detectada');

/* responderKB de verdade, com docs mínimos no lugar da base real */
const kbSrc = extrai('function responderKB(pergunta) {', '/* ---------- modelo generativo opcional');
const kbDocs = [
  { id: 'adicionar', titulo: 'Adicionar nós (Shift+A)', tags: ['adicionar', 'shift+a', 'node adder'], corpo: 'Abra o Node Adder com Shift+A e escolha o nó.', passos: [] },
  { id: 'no:grain', noId: 'grain', titulo: 'Grain', tags: ['grain', 'Grain', 'Texture'], corpo: 'Nó Grain (categoria Texture). Entradas: image. Saída: imagem processada (ou conforme o tipo). Parâmetros: Amount (amount, 0–100, padrão 20); Size (size, 1–10, padrão 2).' },
];
const responderKB = new Function('nalaDocs', 'NALA_TOPICOS', 'nalaClassificar', 'nalaBuscar', 'NALA_MODELO', 'nalaIntencao',
  kbSrc + '; return responderKB;')(() => kbDocs, [], nalaClassificar, nalaBuscar, NALA_MODELO, nalaIntencao);

const rOi = responderKB('Oi');
ok(rOi === 'Oi! Como posso ajudar você?', '"Oi" → cumprimento curto e direto', rOi);
ok(responderKB('Bom dia') === rOi && !/Grafo atual|Qwen|512/.test(rOi), '"Bom dia" idem: sem estatística, sem modelo, sem metadado');
const rNo = responderKB('o que o Grain faz?');
ok(/Nó Grain/.test(rNo) && /Parâmetros principais/.test(rNo), 'pergunta de nó → resposta do nó');
ok(!/Grafo atual/.test(rNo) && !/ligaç(ão|ões)/.test(rNo), 'resposta de nó não despeja estatísticas do grafo');
const rMod = responderKB('qual modelo você usa?');
ok(/Qwen2\.5-0\.5B-Instruct/.test(rMod) && /512 MB/.test(rMod) && /Apache-2\.0/.test(rMod), 'modelo: a informação técnica aparece quando pedida');
ok(!/Grafo atual/.test(rMod), 'resposta de modelo não despeja estatísticas do grafo');

const prompt2 = nalaSystemPrompt(['## Contexto atual (interno — não repetir ao usuário)\nGrafo atual: 9 nó(s), 8 ligação(ões).']);
ok(/cumpriment/.test(prompt2) && /não os repita/.test(prompt2) && /Nunca despeje dados técnicos/.test(prompt2), 'prompt do generativo: cumprimento breve + nunca repetir contexto/estatísticas');
ok(!html.includes('(${ctxTxt})'), 'contexto NÃO é mais colado na frente da resposta (causa do bug)');
ok(/intencao === 'saudacao'/.test(html) && /intencao === 'modelo'/.test(html), 'envio: cumprimento/modelo respondem direto nos dois modos');
ok(/## Contexto atual \(interno — não repetir ao usuário\)/.test(html), 'bloco de contexto do modelo marcado como interno');
ok(/querGrafo/.test(html) && /intencao === 'grafo'/.test(html), 'pergunta de grafo tem caminho próprio (contexto só quando pedido)');
ok(!/Modelo local pronto\. Continuo respondendo/.test(html), 'sem mensagem técnica automática ao ativar o modelo');
ok(/addMsg\('erro', 'O modelo local falhou: '/.test(html), 'erros importantes continuam visíveis no chat');

console.log('Nala · 1.13.1 interface (conversa limpa, técnica no ⚙)');
ok(/cfg\.id = 'nalaCfg'; cfg\.hidden = true/.test(html), 'configurações nascem fechadas');
ok(/panel\.append\(head, cfg, msgs, form\)/.test(html), 'configurações fora do fluxo visível da conversa');
ok(/Configurações da Nala/.test(html) && /btnCfg\.addEventListener\('click'/.test(html) && /cfg\.hidden = !cfg\.hidden/.test(html), 'botão ⚙ abre/fecha "Configurações da Nala"');
ok(/nomeBox\.append\(\$el\('div', 'nala-nome', 'Nala'\)\)/.test(html), 'cabeçalho só com o nome (sem status técnico)');
ok(/Sobre a Nala:/.test(html) && /modelo generativo opcional é o/.test(html), '"Sobre a Nala" mora nas configurações, com modelo/tamanho/licença');
ok(/#nalaCfg|\.nala-config\[hidden\]\{display:none\}/.test(html), 'painel oculto não ocupa a conversa');

console.log('Nala · ícone mobile sem sobrepor o menu');
ok(/@media \(max-width: 820px\)\{[\s\S]*?#nalaBtn\{width:48px/.test(html), 'mobile: botão menor (48px) no canto');
ok(/env\(safe-area-inset-bottom,0px\)/.test(html), 'mobile: respeita a safe-area do aparelho');
ok(/function nalaReposicionar\(\)/.test(html) && /tlPanel/.test(extrai('function nalaReposicionar()', 'let nalaDocsCache')), 'reposiciona medindo a altura real da timeline');
ok(/getBoundingClientRect\(\)\.height/.test(html) && /Math\.max\(56, Math\.round\(tlH\) \+ 12\)/.test(html), 'fica acima da timeline (altura real + 12px, mín. 56)');
ok(/ResizeObserver/.test(html) && /addEventListener\('resize', nalaReposicionar\)/.test(html), 'reage a resize/dobrar a timeline');
ok(/orientation:landscape/.test(html), 'landscape tem ajuste próprio');
ok(/#nalaBtn\{position:fixed;right:14px/.test(html), 'desktop: posição original preservada');

resumo('nala');

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
  '; return { NALA_MODELO, nalaTokens, nalaBuscar, nalaSystemPrompt };')();
const { NALA_MODELO, nalaBuscar, nalaSystemPrompt } = puro;

ok(NALA_MODELO.nome === 'Qwen2.5-0.5B-Instruct' && NALA_MODELO.licenca === 'Apache-2.0', 'modelo escolhido: Qwen2.5-0.5B-Instruct (Apache-2.0)');
ok(NALA_MODELO.downloadMB === 512 && /huggingface\.co/.test(NALA_MODELO.fonte), 'download ~512 MB da fonte oficial');
const prompt = nalaSystemPrompt(['## Blur Studio\nborra imagens']);
ok(/Nala/.test(prompt) && /nunca invente/i.test(prompt) && /NÃO controla o editor/.test(prompt), 'prompt: identidade, honestidade e sem prometer controle do editor');
ok(prompt.includes('Blur Studio'), 'prompt injeta o contexto recuperado (RAG)');

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
ok(/ctxChk\.checked \? nalaContexto\(\) : null/.test(html), 'contexto só é lido com o consentimento ligado');
ok(/window\.confirm\(/.test(html) && /~' \+ NALA_MODELO\.downloadMB|downloadMB/.test(html), 'download do modelo pede confirmação com o tamanho');
ok(/onnx-community\/Qwen2\.5-0\.5B-Instruct/.test(html), 'repositório oficial do modelo no Worker');
ok(/nalaWorker\.terminate\(\)/.test(html), 'Parar encerra o Worker (cancelamento real)');
ok(!/api[_-]?key|API_KEY|sk-[a-z0-9]/i.test(extrai('/* NALA_PURO_INI', '/* ---------- contexto ao vivo')), 'sem chaves/segredos no bloco da Nala');
ok(/selected/.test(extrai('function nalaContexto()', '/* ---------- UI')) && /nodes\.get/.test(extrai('function nalaContexto()', '/* ---------- UI')), 'contexto usa a seleção real do grafo');
ok(fs.existsSync(new URL('../assets/nala/README.md', import.meta.url)), 'assets/nala/README.md documenta o slot da arte');
ok(fs.existsSync(new URL('../docs/nala.md', import.meta.url)), 'docs/nala.md com viabilidade e limites');

resumo('nala');

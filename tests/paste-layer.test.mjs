/* Correção 1.23.1 — colar/importar imagem NÃO pode cair direto na
   Layer 2 com a Layer 1 vazia. A regra: primeira entrada livre a partir
   da Layer 1; camada ocupada = link conectado (existir nó não ocupa).
   Executa itProximoSlotCamada real e confere os três pontos de entrada
   (colar no grafo, importar, HOME/projeto novo). */
import fs from 'node:fs';
import { ok, resumo } from './kit.mjs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const extrai = (ini, fim) => {
  const a = html.indexOf(ini), b = html.indexOf(fim, a);
  if (a < 0 || b < 0 || b < a) throw new Error('trecho não encontrado: ' + ini);
  return html.slice(a, b);
};

/* ---------- a regra, executada ---------- */
const slot = new Function(extrai('function itProximoSlotCamada(usados, total)', '/* 1.18.0 — tipo de dado') + '\nreturn itProximoSlotCamada;')();
ok(slot([], 6) === 0, 'projeto vazio: imagem colada → Layer 1');
ok(slot([0], 6) === 1, 'Layer 1 ocupada: próxima imagem → Layer 2');
ok(slot([0, 1], 6) === 2, 'Layers 1–2 ocupadas: próxima → Layer 3 (sem sobrescrever)');
ok(slot([0, 1, 2, 3, 4, 5], 6) === 6, 'tudo ocupado: expande (índice além do total)');
ok(slot([1, 2], 6) === 0, 'Layer 1 livre com 2–3 ocupadas: volta para a Layer 1');

/* ---------- ocupação é link, não existência ---------- */
{
  const auto = extrai('function itAutoLayerPosition(imgNode)', '\n}\nfunction itLinkEntrada');
  ok(auto.includes('links.filter(l => l.to === lp.id).map(l => l.input)'), 'itAutoLayerPosition mede ocupação pelos LINKS do Layer Position');
  ok(auto.includes('itProximoSlotCamada('), 'o slot vem da regra única itProximoSlotCamada');
  ok(auto.includes('if (links.some(l => l.from === imgNode.id)) return null;'), 'imagem já encaminhada não é reconectada (conexões preservadas)');
  ok(auto.includes('[...nodes.values()].find(n => n.type === \'layers\')'), 'Layer Position existente é reaproveitado, não recriado');
}

/* ---------- os três pontos de entrada seguem a mesma regra ---------- */
ok(html.includes("if (criado && typeof itAutoLayerPosition === 'function') itAutoLayerPosition(n);"), 'colar no grafo aberto → itAutoLayerPosition');
ok(html.includes("if (criadoImp && typeof itAutoLayerPosition === 'function') itAutoLayerPosition(n);"), 'importar arquivo → itAutoLayerPosition');
{
  const home = extrai('async function ssOpenImageFile(f, opcoes = {})', 'previewId = o.id;');
  ok(!home.includes('connect(a.id, lp.id, 1)'), 'HOME: nada de Layer 2 fixa (o bug original)');
  ok(home.includes('itProximoSlotCamada(') && home.includes('connect(a.id, lp.id, idxLp);'), 'HOME: projeto novo usa a mesma regra de slot (nasce na Layer 1)');
}
ok(!/a partir da Layer 2/.test(html), 'nenhum texto/código descreve mais a regra antiga');

process.exit(resumo() ? 0 : 1);

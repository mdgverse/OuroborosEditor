/* Carrossel da comunidade (1.9.0): laço infinito sem vão — cada metade do
   trilho precisa ser mais larga que a janela (a regressão era 2 cópias de
   um feed curto), clones fora de foco/leitor de tela, arrasto no relógio
   da própria animação, pausa fora da tela e fase preservada no resize. */
import fs from 'node:fs';
import { ok, resumo } from './kit.mjs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const extrai = (ini, fim) => {
  const a = html.indexOf(ini), b = html.indexOf(fim, a);
  if (a < 0 || b < 0 || b < a) throw new Error('trecho não encontrado: ' + ini);
  return html.slice(a, b);
};

console.log('Carrossel · laço sem emenda');

const mostra = extrai('function cmtyMostra(itens) {', '/* fase atual da animação');
ok(/track\.scrollWidth < vw/.test(mostra) && /cmtyCard\(it, true\)/.test(mostra),
  'repete o feed até a metade encher a janela (sem vão antes do salto)');
ok(/cloneNode\(true\)/.test(mostra) && /--cmty-dur/.test(mostra), 'duplica a metade pronta e mantém a duração por item (4,2s/item)');
const cartao = extrai('function cmtyCard(it, clone) {', '/* no app, target="_blank"');
ok(/aria-hidden', 'true'/.test(cartao) && /tabIndex = -1/.test(cartao), 'cópias do laço: aria-hidden + tabindex -1 (foco/leitor de tela limpos)');
ok(!/addEventListener\('click'/.test(cartao), 'cartão não tem listener próprio (clique é delegado no trilho)');

console.log('Carrossel · interação e pausa');

const inter = extrai('function cmtyInteracao() {', '/* assinatura do carrossel');
ok(/closest\('.cmty-card'\)/.test(inter) && /cmtySuprime/.test(inter), 'clique delegado vale p/ originais e clones; pós-arrasto é suprimido');
ok(/IntersectionObserver/.test(inter) && /classList\.toggle\('fora'/.test(inter), 'fora da tela: pausa a animação');
ok(/ResizeObserver/.test(inter) && /cmtyFase\(/.test(html) && /cmtyFaseRestaura/.test(html), 'resize remonta preservando a fase (sem salto)');
ok(/getAnimations\(\)\[0\]/.test(inter) && /a\.pause\(\)/.test(inter) && /a\.play\(\)/.test(inter) && /currentTime = nt/.test(inter),
  'arrasto move o relógio da própria animação (o laço continua válido)');
ok(/prefers-reduced-motion: reduce/.test(inter), 'reduced-motion: sem arrasto animado (fica a rolagem manual do CSS)');
ok(/\.cmty-vp\.fora \.cmty-track/.test(html) && /touch-action:pan-y/.test(html), 'CSS: pausa fora da tela e toque vertical preservado');

process.exit(resumo() ? 0 : 1);

/* World · organização (1.26.1): grupos do Chrome no MESMO padrão do nó
   Sorted (SEC recolhido por padrão, com dica, via buildSection), e a
   correção da causa raiz: o handler de change dos selects não chamava
   worldAplicaVis — trocar o Effect não mostrava os controles do Chrome.
   Também prova a exclusividade contextual por efeito. */
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
const BTN = (key, label, action, button) => ({ type: 'button', key, label, action, button, def: '' });
const COL = (key, label, def) => ({ type: 'color', key, label, def });
const SEC = (key, label, tip, closed) => ({ type: 'sec', key, label, tip, closed: !!closed });

/* ---------- o padrão do Sorted, medido no próprio Sorted ---------- */
const psort = new Function('SEC', 'ENUM', 'NUM', 'BTN', extrai('const PSORT_PARAMS = [', '\n];') + '\n]; return PSORT_PARAMS;')(SEC, ENUM, NUM, BTN);
const secsSorted = psort.filter(d => d.type === 'sec');
ok(secsSorted.length === 4 && secsSorted.every(d => d.closed === true && !!d.tip),
  'Sorted: 4 grupos, todos recolhidos por padrão e com dica (Sort/Spans/Refine/Advanced)');

/* ---------- o Chrome segue o mesmo padrão ---------- */
const blocoNo = extrai("  worldEffect: {\n    title: 'World'", '  magicGen: {').replace(/^\s*worldEffect:\s*/, '').replace(/,\s*$/, '');
const noDef = new Function('NUM', 'ENUM', 'BTN', 'COL', 'SEC', 'return (' + blocoNo + ')')(NUM, ENUM, BTN, COL, SEC);
const secsChrome = noDef.params.filter(d => d.type === 'sec');
ok(JSON.stringify(secsChrome.map(d => d.key)) === JSON.stringify(['secRefl', 'secMetal', 'secSurf', 'secColor', 'secBevel']),
  'Chrome: grupos na ordem Reflection, Metallic, Surface, Color, Bevel');
ok(secsChrome.every(d => d.closed === true && !!d.tip), 'Chrome: grupos recolhidos por padrão e com dica, como no Sorted');
ok(html.includes('if (p.type === \'sec\') { destino = buildSection(body, p).body; continue; }'),
  'os grupos usam o buildSection compartilhado (nenhum sistema novo)');

/* ---------- a causa raiz, corrigida ---------- */
{
  const handler = extrai("sel.addEventListener('change', () => {", 'markDirty(n.id);\n    requestRender();\n    commit();\n  });');
  ok(handler.includes("if (n.type === 'worldEffect' && p.key === 'mode' && n.el) worldAplicaVis(n.el, n.params);"),
    'trocar o Effect chama worldAplicaVis (era o que faltava: os controles do Chrome não apareciam)');
  ok(handler.includes("if (n.type === 'glowEffect' && p.key === 'style' && n.el) glowAplicaVis(n.el, n.params);"),
    'o padrão dos vizinhos (Glow) foi seguido, sem tocar neles');
}

/* ---------- exclusividade contextual por efeito ---------- */
const P = new Function(extrai('/* WORLD_PURO_INI */', '/* WORLD_PURO_FIM */') + '\nreturn { worldKeysVisiveis, worldOpcoes };')();
{
  const espec = {
    extrude: ['depth', 'dirAngle', 'taper', 'shadowI', 'brightI'],
    chrome: ['secRefl', 'cRefl', 'secBevel', 'bevelOn', 'cWave', 'cBase'],
    flame: ['fHeight', 'fTurb', 'fSpeed', 'fGlow'],
    drip: ['dLength', 'dSize', 'dDensity'],
  };
  for (const [modo, keys] of Object.entries(espec)) {
    const vis = P.worldKeysVisiveis({ mode: modo });
    for (const k of keys) ok(vis.has(k), `${modo} mostra o seu controle ${k}`);
    for (const [outro, okeys] of Object.entries(espec)) {
      if (outro === modo) continue;
      for (const k of okeys) ok(!vis.has(k), `${modo} NÃO mostra ${k} (é de ${outro})`);
    }
    ok(['mode', 'shapeMode', 'seed', 'mix', 'maskInfluence'].every(k => vis.has(k)), modo + ' mantém os controles comuns');
  }
  /* valores independentes por efeito: alternar não apaga nada */
  const params = { mode: 'flame', fHeight: 88, cRefl: 33, depth: 120 };
  ok(P.worldOpcoes(params).fHeight === 0.88 && P.worldOpcoes(params).cRefl === 0.33 && P.worldOpcoes(params).depth === 120,
    'valores de Chrome/Flame/Extrude coexistem nos params ao alternar');
}
ok(html.includes("raiz.querySelectorAll('.ctl-sec')"), 'grupo sem controle visível some inteiro nos outros efeitos');

process.exit(resumo() ? 0 : 1);

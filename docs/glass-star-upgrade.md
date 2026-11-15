# Glass Studio (Fluted) + Star Glow — upgrade 1.8.0

## 1. Gargalos identificados no Glass Studio (inspeção do código)

1. **Loop CPU por pixel em resolução cheia**: `fx13Fluted` (e os demais
   modos) percorrem W×H pixels em JavaScript a cada avaliação. No modo
   Fluted antigo, cada pixel executava **2× `Math.exp` + `Math.pow`**,
   `Math.sqrt`, `atan2` (honeycomb) e 3 amostragens bilineares com
   chamada de função — a 3840×2160 são ~8,3 milhões de pixels.
2. **Sem saída antecipada**: mesmo com Blend (mix) em 0, o loop inteiro
   rodava para devolver a imagem original.
3. **Preview em resolução cheia congela o arraste**: o preview rápido
   (`FX_FAST`, teto de 720 px) só vale com "Full resolution" desligado;
   com ele ligado, cada evento de slider reexecuta o loop 4K na thread
   principal (o agendador já coalesce por rAF e espaça renders pesados
   a ≤150 ms, mas um único render 4K já bloqueia a entrada).
4. **Alocações por avaliação**: canvas novo + `ImageData` novo a cada
   eval (o cache do grafo por `dirty` limita a frequência, mas cada
   render paga a alocação cheia). `getContext` repetido no canvas de
   origem dentro do loop de nós.
5. **Sem animação**: não havia fonte de tempo; qualquer animação
   ingênua exigiria um laço global permanente.

O que já existia e foi preservado: cache por nó (`dirty`), preview
rápido com parâmetros em px reescalados (`fxStudioRun`/`GLASS_PX`),
agendador com coalescência e espaçamento de renders pesados.

## 2. Mudanças de performance (e medição)

- **LUT do perfil (256 entradas)**: slope/highlight/groove do Fluted
  linear/wavy são calculados uma vez por render; o loop só faz lookup,
  3 amostragens e aritmética. Benchmark sintético em Node (réplica
  fiel da matemática antiga × nova, melhor de 2, CPU deste ambiente —
  **não é medição em aparelho**): 1280×720: 133 ms → 62 ms;
  1920×1080: 143 ms → 67 ms; 3840×2160: 553 ms → 285 ms (**~2,1×**).
- **Saídas antecipadas**: Opacity (Blend/mix) = 0 devolve a fonte sem
  loop, nos dois nós.
- **Imperfections** usa uma grade de ruído pré-calculada por render
  (hash estável por célula, amostragem bilinear) em vez de ruído por
  pixel — mesmo custo por quadro, zero cintilação.
- **Star Glow** calcula o brilho em resolução de trabalho ≤ 640 px
  (como um bloom clássico; streaks são suaves) e compõe ampliado —
  o mesmo caminho no preview e na exportação.
- **Animação do Shift** tem laço próprio (`flutedAnimTick`, ~30 fps):
  só existe com Fluted + Shift Speed > 0 e página visível; para
  sozinho quando o nó some, a velocidade zera ou a aba oculta
  (`visibilitychange` retoma). Sem nó animado, **nada** re-renderiza:
  o grafo continua cacheado por `dirty`.
- Nada foi feito "otimizando" por redução de qualidade: a resolução
  final de exportação continua a pedida; o preview rápido já existente
  (720 px) permanece opcional pelo toggle "Full resolution".

## 3. Fluted reescrito — semântica (inferida, documentada)

Visto no screenshot: Blend Normal, Opacity 100, Amount 1,14,
Dispersion 0,379, Reflection 1,00, Reflection Scale 0,95,
Pattern Type 1, Pattern Repeats 19, Pattern Angle 0,
Pattern Contrast 4,00, Shift Speed 1,0, Shift Loop 5,0 s,
Imperfections 0,30, Imperfections Scale 10,0. **Nenhuma fórmula ou
resultado visual consta do screenshot** — a semântica abaixo é
escolha documentada, não comportamento verificado da referência.

- Perfil do sulco (LUT): altura `sin(πt)`, inclinação
  `tanh(cos(πt)·(0,5+Contrast/2))`, brilho de crista e sombra de vale
  derivados — vidro canelado translúcido refratando a imagem, não
  listras chapadas. **Amount** = força da refração (deslocamento ∝
  inclinação × Amount × período); **Dispersion** separa R/B ao longo
  da inclinação; **Reflection/Reflection Scale** = intensidade e
  largura do brilho de crista; **Pattern Repeats** = nº de sulcos no
  menor lado (independe da resolução — preview e exportação batem);
  **Pattern Angle** gira o conjunto; **Pattern Type** 1 Linear,
  2 Wavy, 3 Honeycomb, 4 Crosshatch (os quatro padrões que já
  existiam como Prism pattern).
- **Shift**: fase = `tempo × Speed / Loop` em [0,1) — deslocar um
  período inteiro fecha o loop sem salto visível. Speed 0 = estático.
- **Imperfections**: desloca a fase pelo ruído estável (×0,7 período
  no máximo), na escala de Imperfections Scale px.
- **Blend** (Normal/Multiply/Screen/Overlay por canal) + o slider
  Blend existente como **Opacity**: 0 devolve a fonte intacta.
  Amostragem com clamp nas bordas (sem flip, sem borda preta); alfa
  da fonte preservado; janela (Effect area = Inside the window) e
  Frost/Grain antigos continuam funcionando.
- Migração (createNode): `refractAmount→Amount ×0,03`,
  `prismDisplacement→Dispersion ×0,0211`, `causticHighlight→
  Reflection ÷45`, `flutedPattern→Pattern Type`, `angle−90→Pattern
  Angle`, e Shift Speed = 0 em projeto antigo (era estático).
  `ribWidth/curvature/grooveShadow` antigos ficam salvos mas não
  são mais usados no Fluted (Repeats substitui ribWidth, sem
  equivalente independente de imagem).

## 4. Star Glow corrigido — semântica

O nó antigo desenhava cruzes brancas numa grade sobre pixels claros.
O novo implementa o comportamento da referência visual: **streaks
alongadas a partir das áreas claras da própria imagem**, em camadas
azul-brancas com decaimento, sobre a imagem original preservada.

- **Threshold/Knee**: peso do destaque por smoothstep entre
  `thr−knee` e `thr+knee`; Knee 0 = degrau exato (sem divisão).
  **Intensity** escala o peso; **Highlight Boost** multiplica o peso
  por `1 + boost·lum²` (picos brilham mais, sem tocar o resto).
- **Streaks**: nº de eixos (3 = 6 raios cruzados, como a referência);
  cada eixo soma a camada de destaques deslocada nos dois sentidos,
  `Sample Count` passos por sentido até `Length` px, com peso
  `(1−t)^(0,35+2,2·Falloff)` — Falloff maior = decaimento mais rápido.
  **Alternate** (semântica definida aqui, não verificável): eixos
  ímpares têm comprimento e força × (1 − 0,55·Alternate).
  **Angle Deg** gira todos os eixos.
- **Colorize/Gradient Map/Gradient Shift**: a cor do streak mistura
  a cor da fonte com o gradiente editável (Start/Middle/End,
  branco → azul claro padrão) conforme Colorize; a posição no
  gradiente vem da força do destaque e Gradient Shift a desloca
  (com wrap). Blend/Opacity compõem no fim; Opacity 0 = fonte.
- Alfa: pixels transparentes da fonte não geram streak; o brilho é
  calculado a ≤640 px e ampliado (suave por natureza), igual no
  preview e na exportação.
- Migração: `threshold ÷255`, `intensity ÷50`, `size ×5 → Length`.

## 5. Testes e limites

- `tests/glass-star.test.mjs` (25 verificações): defaults exatos dos
  três screenshots; perfil/fase/migração legada do Fluted; peso com
  Knee 0 sem NaN; LUT do gradiente branco→azul; normas legadas; e as
  travas estruturais (LUT, saídas antecipadas, laço de animação,
  resolução de trabalho, migrações).
- Sem navegador/GPU/aparelho neste ambiente: **Web e Android não
  foram testados em aparelho** — a prova é numérica (matemática pura),
  estrutural (painel/fiação) e o benchmark sintético acima. A
  comparação visual com a flor da referência e o arraste de sliders
  em 4K ficam para a validação no app publicado.

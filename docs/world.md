# World — nó multi-efeito do vídeo Eye Candy (1.22.0)

## Análise do vídeo de referência

- **Material**: “This Is The ONLY Photoshop Plugin You Need!” —
  GRIFFINGFX, YouTube (`-H_8CcIdYdw`), 7:27, publicado em 2025-12-03.
- **Acesso**: nesta sessão não foi possível baixar o arquivo de vídeo
  (a rede do ambiente não alcança YouTube/TurboScribe para download).
  A análise foi feita sobre os **metadados públicos e a transcrição
  completa** da página do vídeo, com os capítulos e tempos oficiais.
  O usuário confirmou o escopo: reproduzir **todos** os efeitos
  demonstrados, num nó só chamado **World**.
- **Técnica identificada** (plugin Eye Candy, Exposure Software, sobre
  camadas rasterizadas — a forma vem do alfa/seleção da camada):
  1. **Extrude (0:33)** — a camada vira objeto 3D: profundidade da
     extrusão, direção, *taper* (a extrusão converge ao centro quando a
     profundidade é 0), intensidade de sombra e de brilho e direção da
     luz controlam as paredes laterais; a face frontal é a camada.
  2. **Chrome (2:24)** — bevel “inflado” de metal líquido: perfil de
     bevel (outside bevel/liquid), **mapa de reflexão** (o que reflete
     na superfície — ex.: céu com nuvens), intensidade/blur interno,
     arredondamento dos cantos e largura do bevel.
  3. **Flame (4:12)** — chamas procedurais nascem da camada e interagem
     com ela (atrás ou sobre, via máscara de seleção), direção para
     cima, **cor da chama** configurável (preset “blue flame” salvo).
  4. **Drip (5:13)** — a camada derrete: gotas/pingos escorrem da
     borda inferior da forma.

## Implementação no Ouroboros (sem engine paralela)

Nó `worldEffect` (“World”, categoria Style, sockets Image + Mask
opcional), processado em canvas 2D como os demais nós CPU do editor
(Web e APK no mesmo caminho), com o seletor **Effect** trocando o modo
e a visibilidade contextual dos parâmetros (mesmo padrão do Glow).

- **Forma**: máscara derivada do alfa da fonte (ou por luminância com
  Threshold), suavizada (Shape Softness). Texto e camadas com
  transparência funcionam como no plugin; fotos opacas usam o modo
  Luminance.
- **Extrude**: cópias sombreadas da própria camada empilhadas ao longo
  da direção (≤72 passos), com Taper convergindo escala/deslocamento ao
  centro; Shadow Intensity escurece as paredes com a profundidade e
  Brightness clareia perto da face.
- **Chrome**: campo de altura = forma borrada (Bevel Width), normais
  por gradiente e cor por **mapa de reflexão procedural** (Sky &
  Clouds, Sunset, Studio, Liquid Mono) + especular (Shine) e
  Corner Roundness aumentando a suavização do campo.
- **Flame**: campo procedural (ruído fbm determinístico por Seed) que
  sobe do contorno superior da forma (direções Up/Down/Left/Right),
  altura/turbulência controláveis, rampas de cor Natural/Blue/Green/
  Violet e Placement sobre/atrás da camada.

### Flame aprimorado (1.25.0)

Referências: três Shorts de fogo sobre texto no Photoshop ("Dynamic
Fire Text Effect", "Flame effect in photoshop", "The Fastest Way To
Make Incredible Flame Effect") — só metadados/títulos foram acessíveis
(Shorts sem transcrição nesta rota; download bloqueado, sem contornar
proteções). O denominador comum — labaredas subindo das bordas do
texto, núcleo claro de alta luminosidade, pontas irregulares e
turbulentas — orientou os controles novos, todos reais no campo
`worldChamaIntens` e **neutros nos padrões**:

- **Forma**: Flame Width (frequência lateral das labaredas, sem mexer
  na altura), Flame Density (portão sobre o ruído: chamas separadas),
  Flame Spread (contorno emprestado às colunas vizinhas — o fogo vaza
  para as laterais), Flame Variation (variância das alturas) e Edge
  Distortion (pontas irregulares via fbm de alta frequência).
- **Movimento**: Animation Speed e Oscillation leem o tempo da
  **timeline do editor** (`TL.frame`) — a amostragem avança no domínio
  do ruído (o campo sobe e balança; não é textura deslizando), com
  opt-in de reavaliação por frame em `tlApplyFrame` (mesmo precedente
  do ASCII). Play, scrub e export de vídeo veem o mesmo movimento;
  Speed 0 = chama estática de sempre.
- **Intensidade/cor**: Intensity (alfa), Brightness (cor), Contrast,
  Core Intensity (reforço cúbico do núcleo), Color Gradient (expoente
  da rampa) e Glow (halo com o blur já existente no editor, composto
  sob a chama — não é exposição global).
- **Detalhe**: Detail muda as oitavas do fbm (2–4; 50 = as 3 originais).

Limitação: a animação é dirigida pela timeline (não há relógio de
parede independente), seguindo a convenção dos demais efeitos
animados do editor; partículas/fagulhas individuais não foram
adicionadas — o fogo é um campo contínuo.
- **Drip**: contorno inferior por coluna + gotas determinísticas
  (comprimento/largura/densidade) pintadas com a cor da fonte na borda.

Núcleo puro (`worldMascara`, `worldChromeCor`, `worldFbm`,
`worldContornos`, `worldGeraGotas`, `worldChama`) testável sem DOM em
`tests/world.test.mjs`. Saída composta como nos demais efeitos:
máscara opcional (Mask Influence) e Mix com a fonte.

### Chrome aprimorado (1.24.0)

Referência adicional: "How To Make Black Chrome Text In Photoshop!"
(transcrição obtida da página do vídeo; o arquivo não foi baixado) —
bevel suave com **curva de contorno** moldando as bandas do reflexo,
gradiente preto→branco como ambiente, realce nas bordas e brilho por
cima. Novos controles do Chrome, todos com efeito real no cálculo de
`worldChromeCor` e **neutros nos padrões** (projetos antigos renderizam
idêntico):

- **Reflection Intensity** (0–200%) e **Reflection Contrast** — o
  contraste refaz as bandas do mapa de reflexão em torno do meio, como
  a curva de contorno do bevel.
- **Reflection Distortion** — deforma só a consulta ao ambiente (ruído
  fbm), sem deformar a forma.
- **Surface Distortion** — perturba as normais com fbm: superfície
  orgânica/irregular, distinta da distorção do reflexo.
- **Roughness** — borra mais o campo de altura e espalha o especular
  (expoente menor + pico menor): metal fosco, não só "menos brilho".
- **Highlight Focus** — expoente do especular (foco do realce).
- **Metallic Tint** — tingue o reflexo pela cor da fonte (metais
  coloridos); **Tint** (cor) multiplica o reflexo (chrome colorido,
  realce continua branco); **Exposure** (−100..100) fecha a receita do
  vídeo: Liquid Mono + Exposure negativa = black chrome.

## Desempenho

- Campos de Chrome/Flame calculados em grade de até 1024 px e
  ampliados; Extrude/Drip desenham vetorialmente na resolução da fonte.
- A análise da forma fica em cache no nó (`runtime.worldAna`), com
  chave de dimensões + parâmetros de forma + conteúdo quantizado —
  mexer em cor/intensidade não recalcula a máscara.
- Sem dependências novas; buffers via `fx7NewCanvas`/`cpuRes` de sempre.

## Limitações (diferenças honestas para o plugin)

- O Extrude é 2.5D por empilhamento (como o resultado visual do
  plugin), sem malha 3D real nem oclusão entre objetos.
- O Chrome usa mapas de reflexão procedurais por gradiente (4
  ambientes), não arquivos HDR/fotos de ambiente.
- A chama é um campo 2D determinístico, não uma simulação de fluidos;
  em vídeo ela é estável por seed, mas não “queima” com física.
- Sem acesso ao download do vídeo nesta sessão, a fidelidade foi
  guiada pela transcrição/capítulos oficiais, não por medição de
  frames pixel a pixel.

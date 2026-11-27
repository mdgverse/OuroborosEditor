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
- **Drip**: contorno inferior por coluna + gotas determinísticas
  (comprimento/largura/densidade) pintadas com a cor da fonte na borda.

Núcleo puro (`worldMascara`, `worldChromeCor`, `worldFbm`,
`worldContornos`, `worldGeraGotas`, `worldChama`) testável sem DOM em
`tests/world.test.mjs`. Saída composta como nos demais efeitos:
máscara opcional (Mask Influence) e Mix com a fonte.

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

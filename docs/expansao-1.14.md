# Expansão 1.14.0 — Palette/LUT, Interactive Tools, modos e Array ×24

Relatório técnico da expansão. Princípio seguido em todas as frentes: é uma
**expansão** do editor existente — nenhum nó, recurso ou formato foi removido,
nenhum projeto salvo foi quebrado, nenhuma dependência nova foi adicionada.

---

## 1. Node Library — nós `palette*` + Apply LUT (referência: ArcBrush)

### 1.1 Inventário (o que foi encontrado)

A biblioteca pública do ArcBrush (`arcbrush.com/docs/nodes/`) tem **126 nós em
12 categorias**. Filtrando por nomes/identificadores que **começam** com o
prefixo `palette` (excluindo `color-palette…` e `…-palette`), existem
exatamente **4 nós**, todos na categoria Color:

| # | Nó (nome / id) | Entradas → Saída | Parâmetros principais (originais) |
|---|---|---|---|
| 1 | **Palette** (`palette`) | — → Palette | Palette Name (“My Palette”), Slots (≤64 nome+RGBA), importar `.gpl/.ase/.pal/.aseprite`, exportar `.gpl/.ase/.pal` |
| 2 | **Palette From Gradient** (`palette-from-gradient`) | — → Palette | Palette Name, Swatch Count 2–64 (5), Stop Count 2–8 (2) com Position+Color por parada, Interpolation (RGB, Linear sRGB, OKLab, OKLCh, HSV, Kubelka-Munk, Constant), Smoothness 0–1, Hue Path (Shorter) |
| 3 | **Palette From Image** (`palette-from-image`) | Image → Palette | Colors 2–256 (8), Mode Cluster (k-means, downsample ≤64) / Exact (cores reais ≤256), Attempts 1–10 (3), Sort By (Hue/Luminance/Saturation/Frequency), transparentes ignorados |
| 4 | **Palette Remap** (`palette-remap`) | Image + Palette (+ Mask opcional) → **Batch** | Source color `rgb(200,50,50)`, Hue Tolerance 1–90° (30), Min Saturation 0–50 (20), Feather 0–1 (0.20), Preserve Luminance (true), Mask From (Luminance), Mask Fit (None); uma variante por slot |
| 5 | **Apply LUT** (`apply-lut`, exceção obrigatória) | Image (Pixels) → Image | LUT File (`.cube/.3dl`; `.clf/.ctf/.csp/.vlt/.look` via OCIO), Watch File (~1 s), Input/Output Space (sRGB), Interpolation (Tetrahedral padrão; Linear/Best), Mix 0–1 (1.00) |

### 1.2 O que foi implementado (5/5 nós)

O Ouroboros não tem pinos tipados Palette/Batch. Adaptação documentada: **a
paleta viaja como imagem-tira** (swatches com hex, gerada em canvas 2D) entre
os nós, e o Palette Remap lê as cores da tira ligada no 2º socket. Todos os
nós estão na categoria Color, executam de verdade (CPU, reutilizando
`readResult`/`acquire`/`mkRes`) e participam do fluxo normal do grafo.

| Nó Ouroboros | Implementação real |
|---|---|
| **Palette** | Nome + até 12 slots de cor editáveis (o padrão de parâmetros do app é por-slot; o original aceita 64). Saída = tira. Export **.gpl** real (GIMP/Krita/Aseprite) via botão. |
| **Palette From Gradient** | 3 paradas (início/meio/fim com posição do meio), 2–64 amostras, interpolação **RGB / Linear sRGB / HSV (caminho curto/longo) / OKLab** (matemática OKLab completa, ida e volta). Export .gpl. |
| **Palette From Image** | Downsample para ≤144 px, **Exact** (cores reais por frequência) ou **Cluster** (median-cut determinístico — equivalente funcional ao k-means para este fim: médias das caixas mais populosas), ordenação Hue/Luminance/Saturation/Frequency, transparentes ignorados, cache por parâmetros. Export .gpl. |
| **Palette Remap** | Recolore pixels cujo matiz está dentro da tolerância da cor-fonte (feather suave, saturação mínima, luminância preservada), usando a cor do **slot** escolhido da paleta ligada; máscara opcional (Luminance/Alpha/R/G/B). Sem paleta ligada, usa uma paleta de reserva de 6 cores (declarada na interface). |
| **Apply LUT** | **Real**: lê `.cube` (3D + LUT_1D/shaper embutida) e `.3dl` (com linha shaper), amostragem **tetraédrica** (padrão) ou trilinear, Mix, domínio sRGB ou linear-light (converte, aplica, converte de volta). Arquivo inválido → mensagem no próprio nó e imagem atravessa intacta. Parse cacheado por conteúdo. |

 Matemática pura (parsers, amostragem, HSL/OKLab, extração, remap) vive entre
`/* LUTPAL_PURO_INI */` e `/* LUTPAL_PURO_FIM */` e é executada pelos testes.

### 1.3 Limitações (diferenças para o original, com alternativa)

- Sem pinos Palette/Batch: a paleta é uma imagem-tira; o Remap gera **uma**
  variante por avaliação (mude “Variant slot”), em vez do Batch com N saídas.
- Importação `.gpl/.ase/.pal/.aseprite` no nó Palette e formatos OCIO
  (`.clf/.ctf/.csp/.vlt/.look`) no Apply LUT não foram portados; exportação é
  `.gpl` (amplamente compatível). Watch File não se aplica (o arquivo é lido
  na seleção, pelo controle FILE existente).
- Interpolação Kubelka-Munk/OKLCh e Smoothness do gradiente original não
  foram reproduzidas; RGB/Linear/HSV/OKLab cobrem o uso prático.
- Palette manual tem 12 slots editáveis na UI (o Remap lê até 64 cores de
  tiras geradas por imagem/gradiente).

## 2. Interactive Tools — segundo ambiente

### 2.1 Análise funcional (base: Features do ArcBrush)

Do ArcBrush foram aproveitados os **conceitos funcionais**: operações que
começam por seleção direta, manipulação no canvas, resultado apresentado
antes de virar definitivo, organização por ferramentas e não-destrutividade.
A **usabilidade** segue a referência clássica de editores raster (canvas
central, ferramentas à esquerda, propriedades contextuais e camadas à
direita), mas toda a apresentação é a do Ouroboros (mesmas variáveis de tema,
marca laranja, painéis e botões existentes). Nada de código ou assets de
terceiros foi copiado; o Mozayk (sem licença declarada) foi só inspiração
visual para a grade do Array.

### 2.2 O que foi implementado

- **Layout**: barra de ferramentas (Move, Brush, Eraser, Fill, Pick, Shape,
  Text, Guia), canvas central com fundo xadrez de transparência, painel de
  Propriedades contextual (ferramenta + camada ativa) e painel de Camadas.
- **Camadas reais**: raster, texto, forma e **grupo**; criar, duplicar,
  excluir, renomear (duplo clique), reordenar (↑/↓), mostrar/ocultar,
  opacidade, 11 blend modes, posição/escala/rotação por camada, miniaturas,
  pertencimento a grupo (visibilidade/opacidade do grupo afetam os filhos).
  Texto e forma são **procedurais**: editáveis depois de criados.
- **Ferramentas com prévia antes de confirmar**: pincel, borracha, balde
  (flood fill com tolerância), forma (arrastar; Shift = elipse) e texto
  mostram o resultado sobre o composto e só gravam na camada em
  **Confirmar** (Cancelar descarta). Move arrasta a camada; Pick captura a
  cor do composto.
- **Histórico próprio**: desfazer/refazer do ambiente (botões e Ctrl+Z/Ctrl+Y
  roteados quando o ambiente está ativo), teto de 25 estados para não
  explodir a memória, separado do histórico do grafo.
- **Integração com o grafo (sem motor duplicado)**: “Importar resultado do
  nó em prévia” usa `evalNode` + `readResult` e vira camada raster; “Enviar
  composição ao grafo” grava o composto no `imageStore` e cria um nó
  **Image** comum, que aceita qualquer efeito a jusante. Exportar PNG usa o
  download existente.
- **Guia interno** (botão “? Guia”): descreve exatamente as ferramentas,
  atalhos e fluxos acima — nada além do que está implementado.

## 3. Alternância de modos Node Editor ⇄ Interactive Tools

- Seletor segmentado na topbar (“Node Editor” / “Interactive Tools”), no
  estilo do editor.
- A troca **só esconde/mostra** painéis (`display:none` + classe no body):
  não recarrega a página, não reinicializa o projeto, não destrói o DOM do
  grafo, não descarta camadas, resultados, históricos ou seleções.
- As camadas viajam **dentro do mesmo projeto**: `serialize()` grava o campo
  `it` (documento, camadas com pixels em PNG dataURL, transformações e
  parâmetros) e `restoreGraph()` o restaura junto do grafo — salvar,
  reabrir, Ctrl+S/Workflows e autosave preservam os dois ambientes.
- A **preferência de interface** (qual modo abrir) fica em
  `localStorage['ouroboros:ui-mode']`, separada dos dados do projeto.
- Trabalho contínuo: resultado do grafo vira camada; composto vira nó
  Image; nada é convertido destrutivamente ao alternar.

## 4. Machine Array — 24 formas novas no efeito existente

Dentro do **mesmo** nó Machine/Array (sem nó novo), somando-se aos 17 glifos
clássicos (ids 0–16 intocados, projetos salvos compatíveis). As 24 formas,
na ordem da imagem de referência do usuário, com ids de shader **17–40**:

17 sqHole (Hollow square) · 18 discFull (Filled circle) · 19 triRight (Right
triangle) · 20 ringThick (Thick ring) · 21 xCross (Diagonal cross) · 22 xSeg
(Segmented diagonal cross) · 23 sqCircCut (Square with circle cut) · 24
flower4 (Four-petal flower) · 25 asterisk8 (Geometric asterisk) · 26
scallopDisc (Scalloped flower disc) · 27 clover4 (Four-circle clover) · 28
concaveM (Concave notched shape) · 29 fourDiscs (Four circles) · 30 fourRings
(Four rings) · 31 dotGridMix (Semicircle and dot grid) · 32 checkerDiag
(Checkered mosaic) · 33 fourArcs (Four concave arcs) · 34 targetRings
(Concentric target) · 35 star4c (Concave 4-point star) · 36 twoSemi (Opposed
semicircles) · 37 triMosaic (Diagonal triangle mosaic) · 38 angleNest
(Concentric angles) · 39 chevron2 (Double chevron) · 40 pinwheel4 (Four-part
pinwheel).

- **Geometria**: cada forma é uma lista de operações vetoriais
  (`am24Ops`, bloco `AM24_PURO_INI/FIM` — mover/traço/arco/retângulo/curva,
  espaço de célula −1..1, regra even-odd onde há furos), desenhada do zero.
  As miniaturas usam Path2D a partir das **mesmas** operações; o render usa
  um SDF espelhado (`amGlyph24` no shader). Nenhum raster substitui
  geometria; nenhum código do Mozayk foi usado (repositório sem licença —
  apenas inspiração visual da grade).
- **Seletor visual**: grade de 6 colunas no painel do Array, fundo neutro
  escuro, nome sob cada miniatura, destaque laranja na selecionada, botões
  Tone 1–4, clique aplica ao tom ativo e redesenha na hora (o glifo continua
  gravado em `glyph0..3`, logo persiste no projeto como qualquer glifo).
- **Compatibilidade**: funcionam com todos os parâmetros existentes do
  Array (contagem, espaçamento, escala, rotação, distribuição H/V, tons,
  Shape Shifter etc.), porque são apenas novos valores do mesmo uniforme de
  glifo. Estrutura modular: forma nova = uma entrada em `AM24_FORMAS` + um
  ramo nos dois desenhistas (ops e SDF).
- Correção feita nesta frente: o ramo do glifo custom (id 16) capturava
  qualquer id > 15,5 — agora é `15.5 < g < 16.5`, e 17–40 despacham para
  `amGlyph24`.

## 5. Arquivos, testes e problemas

- **Modificado**: `index.html` (nós Palette/LUT + runtime, `am24Ops`/
  `amGlyph24`/seletor, ambiente Interactive Tools + CSS + seletor de modos,
  `serialize().it`), `VERSION` e `APP_VERSION` → **1.14.0**,
  `.github/workflows/tests.yml` (3 passos novos), `tests/version.test.mjs`.
- **Criados**: `tests/array-24.test.mjs`, `tests/palette-lut.test.mjs`,
  `tests/interactive-tools.test.mjs`, este documento.
- **Dependências novas**: nenhuma.
- **Testes**: os três arquivos novos executam os blocos puros de verdade
  (parsers de LUT e amostragem tetraédrica/trilinear, matemática de cor,
  extração/remap, as 24 geometrias e o registro de ids, blends e camadas) e
  conferem a integração no HTML; a suíte inteira do repositório foi rodada
  (ver PR). O parser GLSL roda no CI (`glsl-parse`).
- **Problemas encontrados e corrigidos durante a obra**: (a) colchetes
  faltando nos retornos multi-subcaminho de `am24Ops` — função reescrita com
  helper `sub(...)` e validada por `node --check`; (b) dispatch do shader
  roubando os ids novos para o glifo custom — corrigido e coberto por teste;
  (c) uma linha morta inalcançável no parser .cube — removida.
- **Não verificado**: os sites `arcbrush.com` (páginas de Features além do
  trecho público lido) e `mozayk.design` não foram integralmente acessíveis;
  o inventário acima cobre **toda** a Node Library pública documentada, e o
  que não pôde ser confirmado está listado como limitação, sem invenção.

## 6. Correção 1.14.1 — layout do seletor de formas

Relatado pelo usuário (print): a grade de 41 formas inflava o painel do nó
Machine e os rótulos quebravam em várias linhas, com células de alturas
diferentes. Correção: grade com altura máxima (252 px) e rolagem própria,
rótulos em uma única linha com reticências (nome completo no tooltip da
célula), título de uma linha e botão ▾/▸ para recolher a grade (estado só
de interface, por nó, fora dos dados do projeto). Geometria, ids e
comportamento de seleção não mudaram.

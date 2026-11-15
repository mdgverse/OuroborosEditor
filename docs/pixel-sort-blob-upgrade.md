# Pixel Sort / Sorted + Blob Tracker — upgrade 1.7.0

## Referência: o que foi visto × o que foi inferido

**Visto nos screenshots (transcrito):**
- Pixel Sort: seções Sort/Spans/Refine/Advanced; Preset = Custom;
  Direction = Vertical (opções Horizontal, Vertical, Angle, Radial,
  Circular); Sort Key = Luminance (Luminance, Lightness, Value,
  Saturation, Hue, Alpha); Order = Descending; Span Mode = Brightness
  Band (Brightness Band, Random Lengths, Between Edges, Whole Line);
  Brightness Low 0.165; Brightness High 0.55; Skip Spans 0.101;
  Seed 0 com botão de randomizar; Max Run Length 4588 px;
  Mix With Source 1.
- Blob Tracker: Blend = Normal; Opacity 100; key color branca;
  threshold 0,445; persistence 0,93; debug mask Off; random palette
  On; box color ciano; palette set 0; box blend = Default;
  box thickness 1,5; box outline opacity 1,00; box fill opacity 0,12;
  center type 4; center size 3,0; caption position 1; caption size 22;
  caption bg opacity 0,45.

**Inferido (não verificável nos screenshots — documentado como escolha):**
- "box type • Upgrade", "line type • Upgrade" e "line style • Upgrade"
  aparecem bloqueados e **sem opções visíveis**: nenhum paywall foi
  criado e nenhuma opção foi atribuída à referência. Box Type usa
  modos próprios documentados (Tracker Shape / Bounding Box / Corner
  Brackets / None) e as conexões continuam no sistema existente
  (Connect + Line Solid/Dashed/Dotted).
- Os números "center type 4" e "caption position 1" não revelam seus
  significados: viraram **modos nomeados** — Center Type = None / Dot /
  Cross / Ring / Diamond; Caption Position = Above / Below / Center
  (acima é o padrão, como no controle Placement anterior).
- Preset do Pixel Sort só tem "Custom": nenhum preset da referência
  pôde ser verificado, então nenhum foi inventado.

## Pixel Sort / Sorted — semântica implementada

- Os dois nós compartilham o painel (`PSORT_PARAMS`) e o motor puro
  `psOrdenar` (o Sorted antes fixava brilho/faixa; agora usa os
  próprios parâmetros, migrados — ver compatibilidade).
- **Direções** (cada pixel pertence a exatamente um caminho, logo a
  saída é sempre uma permutação dos pixels — nada se perde/duplica):
  Horizontal = linhas; Vertical = colunas; Angle = retas no ângulo do
  controle Angle (visível só nesse modo); Radial = raios a partir do
  centro (Center X/Y, visíveis em Radial/Circular); Circular = anéis
  em volta do centro.
- **Sort Key**: luminance = Rec. 709; lightness = (max+min)/2; value =
  max; saturation = saturação HSL; hue = matiz 0..1 (acromático = 0);
  alpha = canal alfa. Order Ascending/Descending.
- **Spans**: Brightness Band ordena trechos contíguos com luminância
  entre Low e High (se Low > High, a faixa é normalizada trocando os
  dois — vale o intervalo entre eles); Random Lengths parte cada
  caminho em trechos de comprimento pseudoaleatório entre Random Min
  Length e Random Max Length, reproduzível pela Seed; Between Edges
  corta o caminho onde o salto de luminância passa do Edge Threshold;
  Whole Line ordena o caminho inteiro.
- **Skip Spans**: fração dos spans pulada de forma determinística
  (hash da Seed + índice do span): 0 ordena tudo, 1 não ordena nada.
  O 🎲 sorteia uma Seed nova.
- **Max Run Length**: dentro de cada span, só os primeiros N pixels
  são ordenados; o restante fica onde estava. **Mix With Source**:
  0 = fonte, 1 = resultado (mistura linear por canal, incluindo alfa).
- Controles por modo aparecem só quando relevantes (Angle, Center,
  faixa, comprimentos, Edge Threshold) sem apagar valores salvos.
- Desempenho: o caminho existente (`fx7FastRes`) é mantido; a
  ordenação é por caminho com chaves pré-calculadas (2 arrays
  Float32), sem alocação por pixel.

## Blob Tracker — semântica implementada

- **Key Color + Threshold**: além do corte por luminância existente,
  a máscara exige distância euclidiana RGB normalizada até a Key
  Color ≤ Threshold (0 = cor exata, 1 = canto oposto do cubo RGB).
  É esta máscara combinada que o **Debug Mask** mostra (branco =
  detectado); desligar volta ao resultado normal.
- **Persistence**: trilhas não pareadas sobrevivem por até
  `round(p/(1−p))` quadros (0,93 ≈ 13, teto de 24), desvanecendo —
  nunca indefinidamente. Persistence 0 = comportamento antigo.
- **Random Palette**: cor HSL determinística por ID (mesma ID, mesma
  cor); Palette Set desloca/troca a paleta. Desligada, as caixas usam
  o **Box Color** (e o contorno volta ao sistema Colors existente).
- **Box**: Box Type (acima), Box Blend (Default = source-over, ou
  Multiply/Screen/Overlay na passagem das caixas), Box Thickness,
  Box Outline Opacity e Box Fill Opacity (preenchimento por blob na
  cor da caixa/paleta) afetam a família de caixas; o contorno Details
  continua com Line Width/Colors.
- **Center & Captions**: Center Type/Size desenham a marca central
  (Points sempre marca); Caption Position/Size/Background Opacity
  substituem Placement/Text Size/Tag Background (migrados).
- **Blend + Opacity**: todo o overlay é desenhado num canvas
  transparente e composto sobre a imagem com o modo escolhido e a
  opacidade — preview, vídeo e exportação usam o mesmo caminho.

## Compatibilidade (projetos antigos)

- Pixel Sort/Sorted: `rows→Horizontal`, `columns→Vertical`,
  `brightness→Luminance`; `mode` + `threshold` antigos viram Span
  Mode + Brightness Low/High equivalentes (bright = faixa
  [thr, 1], dark = [0, thr], all = Whole Line). Migração em
  `createNode` ao abrir o projeto; `psNorm` ainda aceita os valores
  legados se algo escapar.
- Blob Tracker: `textSize→Caption Size`, `placement→Caption
  Position`, `centerMark→Center Type`. Projetos antigos abrem com
  Random Palette desligada, Key Threshold = 1 (máscara por cor
  neutra), Persistence = 0 e Box Fill Opacity = 0 — ou seja, com a
  aparência e a detecção de antes; os controles novos estão lá para
  serem ligados.

## Testes

- `tests/pixel-sort.test.mjs` (34 verificações): painel com os
  defaults exatos; ordenação horizontal/vertical/descendente; as 6
  chaves (incl. alfa); Brightness Band e faixa invertida; Random
  Lengths reproduzível e sensível à Seed; Skip Spans 1 = fonte;
  Between Edges; Max Run Length; Mix 0/0.5; Angle/Radial/Circular
  como permutação exata e diferentes entre si; migração legada.
- `tests/blob-tracker.test.mjs` (40 verificações): tudo da 1.6.0 mais
  defaults da 2ª referência, máscara Key Color (bloqueia/libera e é a
  máscara exposta ao Debug Mask), paleta determinística e
  persistência com expiração dos fantasmas.
- Sem navegador/GPU neste ambiente: a prova é numérica (motores
  puros) e estrutural (painéis/fiação); o desenho final em aparelho
  fica para a validação no app publicado.

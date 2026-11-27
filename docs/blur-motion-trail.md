# Blur Studio · Motion Trail (atualização do modo Motion)

## Auditoria do nó existente (antes da alteração)

- Nó `blurStudio` ("Blur Studio", categoria Filter, entrada Image), com o
  seletor **Type** (`blurMode`): Gaussian, Box, **Motion**, Radial/Zoom,
  Spin, Lens/Bokeh, Surface, Directional, Textured, Depth, DOF e Field blur.
- O modo **Motion** usa `fx14Motion`: acumula `motionSamples` cópias da
  imagem deslocadas ao longo de `motionAngle`, centradas na posição
  original (borrão simétrico, dos dois lados), com falloff de alfa
  `1/(i+1)`. Parâmetros: `motionAmount` (distância 0–120 px, padrão 24),
  `motionAngle` (0–360°, padrão 0), `motionSamples` (2–32, padrão 12).
- Execução: `RUN.blurStudio` despacha por modo; o Motion cai em
  `fxStudioRun(a, fx14BlurStudio, n.params, BLUR_PX)` (CPU canvas-2D, com
  prévia leve `FX_FAST` que escala os parâmetros em px). A visibilidade dos
  controles por modo vem de `BLUR_MODOS` + `blurAplicaVis`.
- Persistência: parâmetros vivem em `n.params`; chaves ausentes em
  projetos antigos são cobertas pelos padrões da definição do nó e por
  `FX14_BLUR_DEFAULTS` dentro de `fx14BlurStudio`.

## Referência (imagens + vídeo)

- Painel do Motion Trail (Eye Candy): **Scaling Mode** Adaptive/Fixed,
  **Direction** (220°), **Length (%)**, **Taper**, **Compress Sides**,
  **Opacity**, **Mask Selection**. O exemplo mostra o rastro saindo da
  forma para um lado só, afunilando, perdendo opacidade e seguindo uma
  trajetória curva atrás do sujeito nítido.
- Vídeo (transcrição obtida da página; o arquivo não foi baixado):
  "Easy Motion Path Blur in Photoshop" (Poster Grind) demonstra o mesmo
  conceito no Path Blur do Photoshop: **desmarcar o blur centrado**
  (rastro unilateral), direção pela seta, velocidade = comprimento,
  trajetória curva editável, efeito sobre sujeito mascarado, podendo
  ficar atrás do objeto. Isso confirma o comportamento essencial:
  varredura unilateral ao longo de uma direção/caminho, com o original
  nítido por cima.

## O que foi adicionado (sem remover nem renomear nada)

No modo Motion, um novo **Motion Style**:

- `mtMode` — **Classic motion blur** (padrão; comportamento atual
  pixel-idêntico, inclusive em projetos antigos) ou **Motion Trail**.
- Controles existentes reutilizados no Trail: `motionAngle` = Direction,
  `motionAmount` = Length, `motionSamples` = qualidade da varredura.
- `mtScaling` — **Scaling Mode**: Fixed (comprimento em px, como hoje) ou
  Adaptive (comprimento em % do menor lado da imagem — o "Length (%)" da
  referência; escala com a resolução).
- `mtTaper` — afunilamento progressivo em direção à ponta do rastro.
- `mtCompress` — **Compress Sides**: compressão lateral progressiva.
- `mtCurve` — curvatura da trajetória (o caminho curvo das referências).
- `mtOpacity` — **Trail Opacity**, com distribuição gradual ao longo do
  comprimento (falloff embutido, ponta transparente).
- `mtMask` — **Mask Selection**: influência do socket **Mask** (novo,
  opcional, segundo socket — mesmo padrão de World/PCB) sobre onde o
  rastro aparece; sem máscara ligada, não tem efeito. O sujeito original
  nunca é cortado pela máscara — só o rastro.
- Os controles do Trail só aparecem quando Motion Style = Motion Trail
  (`blurKeysVisiveis`), sem tocar nos demais modos.

Núcleo geométrico puro entre `BLUR_TRAIL_PURO_INI/FIM`
(`mtOpcoes/mtComprimento/mtPassos/mtTransforme`), testado em
`tests/blur-motion.test.mjs`; o render (`fx14MotionTrail`) acumula no
máximo 64 cópias transformadas da fonte (longe→perto) e desenha o
original nítido por cima — sem dependências, no pipeline atual.

## Compatibilidade

- Nenhum identificador, padrão ou intervalo existente foi alterado; os
  novos parâmetros são aditivos e o padrão (`mtMode: 'blur'`) reproduz o
  comportamento anterior exatamente.
- O socket Mask é opcional e acrescentado no fim da lista de entradas;
  links salvos (índice 0) não mudam. `fxPodeSolto` passou a aceitar
  `Mask` como socket auxiliar opcional (mesma regra do `module`): um nó
  de efeito sem imagem ligada continua mostrando a imagem de teste —
  isso também uniformiza World/PCB, que têm o mesmo socket.
- O Blur Studio continua membro do Effect Stack (que só listava efeitos
  de uma entrada): exceção explícita em `stackEffectTypes`, porque
  World/PCB **não** podem entrar na pilha (o executor da pilha usa nós
  sem `runtime`). Dentro da pilha a máscara fica desligada e o Trail
  funciona sem ela.

## Pins com trajetórias Bézier (1.24.0)

Complemento sobre o mesmo modo Trail, inspirado no Path Blur do vídeo
(o caminho define o movimento):

- Cada **pin** é uma instância independente do Trail: âncora, ponta e
  duas alças formando uma **Bézier cúbica** editável no Preview
  (overlay SVG sobre o canvas, mesmo padrão dos pins do Field blur —
  elementos DOM/SVG, nunca entram na imagem exportada).
- Criar: clicar no vazio do preview (arrastar no vazio continua sendo
  pan; a roda do mouse continua zoom). Arrastar move âncora (o caminho
  inteiro acompanha), ponta ou alças. **Delete** ou o × remove o pin
  selecionado. Até 12 pins. **Trail Pins: Hide on preview** oculta os
  indicadores para ver o resultado limpo.
- Dados em `n.params.mtPins` (JSON, parâmetro oculto): coordenadas em %
  da imagem + `taper/compress/opacity` **por pin**, que nascem copiando
  os globais. Selecionar um pin sincroniza os sliders **Pin Taper / Pin
  Compress Sides / Pin Opacity** no corpo do nó; arrastá-los escreve só
  naquele pin (`mtPinSliderChanged`, via `setParam`).
- Processamento (`fx14MotionPins`): cada pin varre a imagem ao longo da
  sua curva — posição segue o caminho, a orientação gira com a tangente
  local, taper/compressão apertam até a ponta, opacidade cai ao longo
  do percurso; o Mask Selection global limita o conjunto dos rastros e
  o original nítido fecha por cima. **Sem pins, o Trail global de
  sempre** (direção/comprimento globais) continua valendo.
- Geometria pura (`mtPinParse/mtPinNovo/mtBezier/mtPinComprimento/
  mtPinPassos`, no bloco `BLUR_TRAIL_PURO`) testada em
  `tests/blur-pins.test.mjs` com trajetórias reta, C, S e acentuada.
- Desempenho: ≤48 passos por pin, passos proporcionais ao comprimento
  do caminho; o overlay só reconstrói atributos SVG dos pins visíveis.

## Limitações vs. referência

- A trajetória é uma curva paramétrica única (Trail Curve), não um
  caminho Bézier editável por pontos como no plugin/Photoshop.
- O pivô do afunilamento/compressão é o centro da imagem (convenção dos
  modos Radial/Spin deste nó), não o centro de massa da forma.

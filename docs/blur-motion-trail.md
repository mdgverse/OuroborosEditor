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

## Limitações vs. referência

- A trajetória é uma curva paramétrica única (Trail Curve), não um
  caminho Bézier editável por pontos como no plugin/Photoshop.
- O pivô do afunilamento/compressão é o centro da imagem (convenção dos
  modos Radial/Spin deste nó), não o centro de massa da forma.

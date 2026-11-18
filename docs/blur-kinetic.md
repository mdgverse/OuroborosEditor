# Blur Studio consolidado + Kinect Motion — 1.11.0

## 1. Consolidação dos blurs

Todos os nós soltos de blur foram removidos do menu/palette e viraram
**Types** do único nó **Blur Studio**:

| Nó antigo (removido) | Type no Blur Studio | Motor reutilizado |
|---|---|---|
| Blur | Gaussian | `fx14BlurredCanvas` (blur gaussiano do navegador) |
| (Box do Studio) | Box | `fx14Box` (raio/passes/mistura legados) |
| (Motion do Studio) | Motion | `fx14Motion` (parâmetros legados) |
| Directional blur, Vector blur | Directional | `fx32VectorBlur` (amostragem bilinear direcional) |
| Radial blur | Radial / Zoom | `blurAcumula` (cópias escaladas em torno do centro) |
| Spin Blur | Spin / Rotational | `blurAcumula` (cópias rotacionadas em torno do centro) |
| Lens blur, Bokeh blur (disc) | Lens / Bokeh | `fx32Bokeh` (disco) + máscara de foco no Center |
| — (novo) | Surface / Smart | `fx14BlurredCanvas` + mistura que respeita bordas |

Os Types antigos do Studio (Textured blur, Depth blur, Depth of field,
Field blur multi-pin) continuam no mesmo seletor.

**Função central:** `blurCentral(src, W, H, { type, amount, angle, centerX,
centerY, quality, preserveEdges, spinDir })` — nenhum Type duplica código;
cada um chama o motor do nó antigo correspondente.

**Parâmetros base (visíveis só onde fazem sentido, via `BLUR_MODOS`):**

- Amount / Radius 0–100 — todos os Types novos;
- Angle / Direction −180 a 180 — Motion (legado), Directional, Radial
  (no Radial, o ângulo adiciona uma torção tangencial ao zoom);
- Center X / Center Y 0–100 — Radial, Spin, Lens;
- Quality / Samples Low/Medium/High = 8/16/24 amostras;
- Preserve Edges On/Off — só Surface (diferença de luminância entre o
  nítido e o borrado derruba a mistura nas bordas fortes);
- Spin Direction — só Spin.

**Compatibilidade:** `BLUR_MIGRACAO` + `blurParamsLegado` em `createNode`
convertem qualquer nó antigo (`blur`, `directionalBlur`, `radialBlur`,
`spinBlur`, `blDefocus`, `blBokeh`, `blVectorBlur`) em `blurStudio` com o
Type e os parâmetros correspondentes (raio/distância/ângulo/centro
convertidos para a escala 0–100). Graphs antigos abrem sem quebrar.

Dois nós de estilo que só tinham "blur" no nome (não são nós de blur)
foram apenas renomeados no título: Giro Halftone (spin) e Smudged copy /
scan (photoscan). Validação: nenhum título de nó contém "blur" fora do
Blur Studio (coberto por `tests/blur-kinetic.test.mjs`).

## 2. Kinect Motion reescrito

O motor antigo (`fx23Kinetic`, smear/trail/beam/bloom) foi apagado por
completo. O novo `fxKinectMotion` segue o look das referências
(long-exposure editorial, `@digitallydiffused`): sujeito nítido no
centro, bordas arrastando numa direção, ghosts de múltipla exposição,
fringing cromático e grão de filme — leve: **1 pass principal a 0.5× +
1 pass de ghost + 1 composite final**.

Pipeline:

- **A · Máscara de foco** — `kineticMascara(d, sharp)`: radial suave a
  partir do Center; centro = 0 (100% nítido), bordas = 1.
- **B · Motion blur** — no máximo 16 samples ao longo do Angle, falloff
  1/(i+1), calculado a 0.5× em imagens > 480 px.
- **C · Ghosts** — cópias do sujeito em Screen ao longo do Angle,
  opacidades 0.35/0.20/0.10 com decaimento pelo Ghost Fade
  (`kineticGhostOpacidades`).
- **D · Streak de fundo** — segundo motion blur 2.2× mais forte em
  Screen (0.45) sobre a camada principal.
- **E · Fringing** — R e B amostrados em direções opostas ao longo do
  Angle, 1–3 px proporcionais ao Amount, pesado pela máscara.
- **F · Composite** — `mix(nítido, efeito, máscara)` + grão leve +
  vinheta suave nas bordas; o centro nunca é destruído.

Parâmetros (defaults): Amount / Intensity 55 · Angle / Direction 0 ·
Sharp Center 65 · Center X 50 · Center Y 50 · Ghosts / Echo 3 ·
Ghost Distance 35 · Ghost Fade 70.

Semântica definida nesta reescrita (não observada numa referência ao
vivo): o Angle do Radial adiciona torção ao zoom; Ghost Fade maior =
ghosts distantes somem mais rápido; Surface com Preserve Edges desligado
vira um blur suave comum.

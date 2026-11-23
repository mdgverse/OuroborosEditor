# PCB — nó de arte em placa de circuito (1.20.0)

## Abordagem

O nó **PCB** (categoria Style, sockets `Image` + `Mask` opcional) converte a
imagem ligada numa composição de placa de circuito **gerada a partir dela** —
nenhuma textura de circuito é colada por cima. As imagens anexadas pelo
usuário (borboleta, coração/cérebro com chip central, árvore, onda) serviram
de referência visual de linguagem: traces finos com ângulos controlados,
terminais/vias, junções e chips acompanhando o sujeito.

Pipeline (CPU/canvas 2D, igual aos demais nós de canvas do editor — Web e
APK usam o mesmo código):

1. **Análise** (`pcbCamposDe`, grade de até 256 px no lado maior):
   luminância suavizada (Detail Smoothing), máscara do sujeito por
   Threshold × alfa da fonte (Invert Detection inverte) e magnitude de
   borda (Sobel).
2. **Geração** (`pcbGeraGeo`): walkers angulares (Orthogonal / 45° / Mixed)
   nascem em pontos amostrados pelo peso do Source Mode
   (Silhouette/Edges/Brightness/Combined), andam seguindo o campo —
   tangente às bordas com peso de Edge Detail × Shape Fidelity —,
   respeitam Trace Spacing por uma grade de ocupação carimbada por
   walker, ramificam (Branching → junções) e param no sujeito
   (Clip to Subject) ou com orçamento de Extension Length. Terminais nas
   pontas, componentes retangulares com pinos espalhados pelo sujeito e
   o Center Component configurável. Symmetry espelha a geometria.
3. **Desenho** (`pcbDesenha`): polilinhas simplificadas (só vértices) na
   resolução da fonte, Trace Width/Corner Style, terminais circulares ou
   quadrados alternados, junções e chips com pinos.
4. **Composição** (`pcbRender`): máscara opcional via `destination-in`
   (luminância × Mask Influence) e mistura com a fonte por
   Blend Mode/Opacity/Mix With Source — convenções do editor.

Tudo no bloco `PCB_PURO` é determinístico e testável sem DOM:
mesma imagem + parâmetros + seed ⇒ mesmo layout.

## Cache e performance

- A **geometria** fica em `n.runtime.pcbGeo`, com chave = grade
  (dimensões + máscara quantizada) + apenas os parâmetros que mudam o
  layout. Trocar cor, fundo, blend, mix ou máscara **não** regenera os
  traces; trocar seed/forma regenera.
- Limites: grade de análise ≤ 256 px, ≤ ~500 traces-alvo, teto de
  60 000 pontos e de tentativas; geração típica em ~25–50 ms nessa grade.
- Fontes grandes: a análise é sempre na grade reduzida; o desenho é
  vetorial na resolução da fonte (traços escalam sem custo de pixel).

## Paleta

2–8 cores editáveis (adicionar/remover/reordenar; mínimo travado em 2),
atribuídas por Palette cycle, Seeded distribution ou From source image.
Presets **Cyan Circuit**, **White / Red Chip** e **Classic Green Board**
aplicam paleta + fundo e continuam editáveis. Background Color com opção
de fundo transparente (a arte sai sobre alfa quando Mix = 100).

## Parâmetros e projeto

Todos os parâmetros — incluindo as entradas da paleta, seed e conexões —
vivem nos `params`/links comuns do nó: salvam e restauram com o projeto,
sem formato novo. Rótulos todos em inglês.

## Vídeo

Cada frame é reanalisado; a chave de cache usa a máscara **quantizada**,
então frames quase idênticos reutilizam o mesmo layout. Limitação: se o
conteúdo do frame mudar o suficiente para cruzar um degrau da
quantização, o layout pode saltar entre duas gerações vizinhas (sem
ruído aleatório por frame — a seed continua fixa e determinística).

## Testes

`tests/pcb.test.mjs` (70 verificações) executa as funções reais sobre
imagens sintéticas: silhueta/inversão/alfa, determinismo e troca de seed,
clip dentro do sujeito, extensão sem clip, ortogonal sem diagonais,
densidade/espaçamento/comprimento alterando a geometria, terminais e
junções zerados, simetria dobrando traces, chip central opcional,
paleta com mínimo/máximo e a fiação (RUN, controle de paleta, presets,
cache que ignora cor).

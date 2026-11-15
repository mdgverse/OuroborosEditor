# Carrossel infinito + detecção do Blob Tracker — correção 1.9.0

## Carrossel da comunidade — causa e correção

**Causa da regressão**: o laço anda `translateX(-50%)` do trilho, o que
só é sem emenda se **cada metade do trilho for mais larga que a
janela**. A montagem antiga colocava exatamente 2 cópias do feed:
com um feed curto (6 itens × 144 px ≈ 864 px) e uma janela larga
(≥1280 px), a metade (864 px) não enchia a tela — no fim de cada
volta aparecia um **vão vazio** crescente e depois o salto. Em telas
estreitas (metade ≥ janela) o defeito não aparecia, o que explica
"funcionava antes": o feed já foi maior e as telas de teste,
menores.

**Correção** (`cmtyMostra`/`cmtyInteracao`, mesmo componente):
- O feed é repetido até a metade ≥ largura da janela (máx. 10
  repetições) e só então duplicado — laço sem vão em qualquer largura,
  com 1 item ou 24.
- Direção (para a esquerda), duração (4,2 s por item, mín. 28 s) e
  pausa em hover/foco **preservados** como estavam.
- Cópias de preenchimento e da segunda metade: `aria-hidden` +
  `tabindex="-1"` (sem duplicar foco nem leitor de tela); os cartões
  e links são os mesmos, sem conteúdo inventado.
- Clique vira **delegação no trilho** (clones não copiam listeners):
  originais e clones abrem o mesmo link, inclusive no APK.
- **Arrasto** (mouse/toque): pausa a animação e move o *relógio dela*
  via Web Animations — ao soltar, o laço continua válido do ponto
  exato; arrasto > 8 px suprime o clique (não abre sem querer).
- **Resize**: remonta as metades preservando a fase (sem salto);
  **fora da tela** (IntersectionObserver) pausa; `prefers-reduced-
  motion` mantém a alternativa de rolagem manual já existente.

## Blob Tracker — causas da detecção insuficiente e correções

Diagnóstico do pipeline (todos confirmados no código):

1. **Colapso da Sensitivity máxima**: com Sensitivity = 1, o limiar
   vai a 0, a imagem inteira vira **um único componente** com
   `frac = 1` — e o **Max Size (0,35) o descartava**. Resultado:
   zero detecções justamente no ajuste "mais sensível". Perto do
   máximo acontecia o mesmo em escala menor: tudo se fundia num
   blob gigante que o Max Size jogava fora (ou que virava uma caixa
   só), em vez de revelar regiões internas.
2. **Polaridade instável**: a regra antiga invertia a máscara quando
   "a maioria do quadro passava" — ao girar a Sensitivity, a máscara
   podia **trocar de lado** (do assunto para o fundo), quebrando a
   monotonicidade: mais Sensitivity nem sempre = mais detecção.
3. **Downscale agressivo**: análise em 288 px no maior lado apagava
   regiões pequenas antes da segmentação.
4. Min Size (0,03) e Merge seguiam funcionais, mas sem subdivisão
   não havia como existirem regiões internas num assunto conectado.

**Correções** (`blobAnalisar`, mesmo nó e parâmetros):
- **Subdivisão por mediana**: componente maior que o Max Size é
  dividido pelos próprios pixels (mediana de luminância, recursivo
  até 5 níveis, filhos ≥ metade do Min Size). Assunto grande com
  variação interna vira várias regiões — como na referência (várias
  caixas coloridas dentro da flor) — sem hard-code de imagem,
  posição ou contagem. Região **uniforme** não subdivide (continua
  respeitando o Max Size, como o filtro manda).
- **Polaridade pela borda do quadro**: fundo claro (borda clara) =
  blobs escuros; senão, blobs claros. A máscara agora **cresce
  monotonicamente** com a Sensitivity, e no máximo subdivide em vez
  de zerar.
- **Análise em 384 px** (Fine Tune: 640 px) para regiões pequenas
  sobreviverem; o desenho continua na resolução de saída, então
  preview e exportação permanecem alinhados.
- Debug Mask já mostrava a máscara real (luminância + Key Color);
  com a polaridade estável ela ficou previsível de diagnosticar.

O que a referência (imagem 2) mostra e foi usado como guia: várias
regiões de tamanhos diferentes **dentro** do assunto, caixas
coloridas por região, etiquetas pequenas e linhas ligando regiões
reais. As etiquetas da referência exibem coordenadas ("X166Y081") —
aqui as etiquetas continuam as existentes (ID/Size); nenhuma posição,
cor ou contagem foi copiada da imagem.

## Testes

- `tests/blob-tracker.test.mjs` (45): + Sensitivity máxima
  subdividindo (≥3 regiões, nenhuma acima do Max Size), máscara
  monotônica entre Sensitivity 0,3 → 0,9, região uniforme gigante
  respeitando o Max Size.
- `tests/carousel-loop.test.mjs` (10): preenchimento da metade,
  clones acessíveis corretamente, clique delegado, pausa fora da
  tela, resize com fase, arrasto no relógio da animação.
- Sem navegador/aparelho neste ambiente: a prova do carrossel e das
  caixas renderizadas é estrutural/numérica; ciclos visuais do laço,
  arrasto em toque real e a flor da referência em vídeo ficam para a
  validação no app publicado.

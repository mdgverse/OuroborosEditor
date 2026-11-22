# Interactive Tools 1.15.0 — casca sobre o editor convencional

Correção crítica da 1.14. A primeira versão do Interactive Tools era um
editor raster independente (canvas próprio, camadas próprias, histórico
próprio) que duplicava — pior — funcionalidades do editor. Isso foi
removido. A partir da 1.15, o Interactive Tools é uma **casca (wrapper)**:
muda **como** se interage com o editor, nunca **como o editor funciona**.

## Princípio

Nenhum nó, controle, menu ou motor foi recriado:

| Peça | De onde vem |
|---|---|
| Nós e parâmetros | os mesmos objetos `nodes`/`NODE_TYPES` do grafo |
| Controles do painel Propriedades | o próprio elemento `.nbody` do nó, **movido** (nunca clonado) para o painel e devolvido ao sair |
| Prévia central | o mesmo elemento `.preview`/`#gl`, movido para o palco e devolvido ao sair |
| Adicionar nó | o mesmo menu Add (`openAddMenu`, Wheel/Gallery com busca) |
| Inserir efeito num link | `removeLink` + pending de inserção (`addNodeAt`) — o mesmo caminho de soltar um fio no vazio; cancelar restaura o link |
| Inserir nó existente | `insertNodeInLink` — o mesmo de arrastar um nó livre sobre o fio |
| Excluir nó | `removeNode` — reconecta entrada→saída como no editor |
| Processamento | `evalNode`/`RUN` de sempre |
| Bypass | campo novo `n.bypass` honrado **no `evalNode`**: em bypass o nó devolve a entrada principal intacta. Vale nos dois ambientes, salva no projeto (`serialize`/`restoreGraph`) e tem botão ⏻ no cabeçalho do nó e no painel |

## Como funciona

- **Esquerda — Fluxo**: a cadeia de nós que alimenta o Output (seguindo a
  entrada principal/`preferIn` de cada nó), na ordem de processamento, com
  índice, estado de bypass, botão ＋ (inserir efeito no link que alimenta
  aquele nó) e ⏻ (bypass). Abaixo, **Todos os nós** lista os que estão fora
  do fluxo; ⇥ insere um nó livre no fluxo.
- **Centro — Palco**: a prévia ao vivo do nó em foco (a mesma prévia do
  editor, com seus overlays e interações próprias).
- **Direita — Propriedades**: os controles reais e completos do nó em foco
  (todos os parâmetros, sem versão simplificada), mais Bypass,
  “Inserir antes deste”, “Ver no grafo” e “Excluir nó”.
- Clicar num nó foca ele: seleção (`selected`), prévia (`previewId`) e
  propriedades acompanham. Commits do grafo atualizam a casca
  (`window.__itCommit`).
- **Adicionar nó** abre o menu real sobre o palco (`posicionaAddMenu`
  reconhece o modo e usa o retângulo do palco; o `#addMenu` é movido para o
  `body` enquanto o ambiente está ativo e devolvido ao sair).
- **Inserir efeito no fluxo**: remove o link alvo, abre o menu com
  `{outId, insertTo, restore}`; o nó escolhido entra no meio
  (origem → efeito → destino). Esc/cancelar restaura o link original.

## Bypass (liga/desliga de efeito intermediário)

`n.bypass` é avaliado em `evalNode` antes de chamar `RUN`: o resultado é a
entrada principal (`preferIn` ou a primeira válida), sem tocar em links,
parâmetros ou cache dos vizinhos além do `markDirty` normal. O estado
aparece esmaecido no cabeçalho do nó, persiste no arquivo do projeto e em
projetos antigos (sem o campo) vale `false` — nada quebra.

## Compatibilidade e legado

- Projetos de qualquer versão abrem iguais; o Node Editor não mudou de
  comportamento, exceto pelo botão ⏻ (aditivo) nos nós com entrada.
- Projetos salvos na 1.14 com camadas do ambiente antigo: o pacote continua
  **preservado no arquivo** (campo `it.legacy`), mas não é mais editável —
  aquele editor paralelo foi descontinuado por decisão de arquitetura; o
  grafo e seus nós nunca dependeram dele.
- A preferência de modo continua em `localStorage['ouroboros:ui-mode']`,
  fora dos dados do projeto.

## Testes

`tests/interactive-tools.test.mjs` executa as funções reais extraídas do
`index.html` (`connect`, `insertNodeInLink`, `evalNode`, `removeNode`,
cadeia/bypass puros) sobre um grafo simulado: criar e conectar, inserir
efeito no meio do link e ver o fluxo processar, editar parâmetro e ver o
resultado mudar, bypass liga/desliga sem tocar nos links, segundo efeito
encadeado e exclusão reconectando — além das asserções de integração da
casca (movimentação de elementos reais, pending de inserção, persistência).

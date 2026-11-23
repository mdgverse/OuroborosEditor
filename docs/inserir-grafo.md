# Adicionar grafo salvo ao projeto atual (1.21.0)

## O problema

Até a 1.20.0, todo caminho de reuso **substituía** o grafo aberto:
aplicar um Workflow (`wfCria`) começava de um grafo vazio e abrir um
arquivo `.nodeimg.json` (`loadGraphData`/`restoreGraph`) idem. Quem
salvava um grafo com Ctrl+S (no dispositivo ou em Workflows) e depois o
selecionava perdia o projeto em andamento.

## O que mudou

Existe agora a **inserção** (`svInserirGrafo`), que adiciona o grafo
salvo **ao lado** do projeto atual:

- nós criados com **ids novos** (`createNode`), pousados à direita do
  grafo existente (`svDeslocInsercao`, alinhados pelo topo);
- **links internos religados** entre os nós novos; os nós e ligações que
  já existiam não são tocados;
- parâmetros, `collapsed`, `tf`, `bypass` e imagens (`imgId`) viajam
  junto; nomes antigos de nós (`spraydelic`/`halftone`) são migrados
  como no `restoreGraph`;
- os nós novos ficam **selecionados**, prontos para mover/ajustar;
- desfazer (Ctrl+Z) remove a inserção, pois ela entra pelo `commit()`
  comum.

### A regra do Output

O editor trabalha com **um** Output. Se o projeto já tem um e o grafo
inserido também, o Output inserido é **ignorado** (e as ligações para
ele caem): a cadeia nova fica livre para o usuário ligar ao Output
existente — a mensagem de status avisa. Em projeto vazio, o Output
inserido é mantido e vira o preview, como numa aplicação normal.

## Onde aparece

- **Aba Workflows**: cada cartão (prontos e ⭐ Meus Workflows) ganhou
  **“＋ Adicionar (ao projeto)”** ao lado do **Aplicar** de sempre, que
  continua substituindo.
- **Load de grafo no editor** (arquivo `.nodeimg.json`): com projeto
  aberto, um diálogo pergunta **“Adicionar ao projeto atual”** ou
  **“Substituir o projeto atual”**. Com o projeto vazio, abre direto.
  As imagens embutidas no arquivo são importadas antes de inserir
  (`inserirGraphData`, mesmo caminho do `loadGraphData`).

Restaurar projeto, trocar de aba e abrir projeto salvo na Home
continuam substituindo — são fluxos de “abrir projeto”, não de reuso.

## Testes

`tests/inserir-grafo.test.mjs` executa `svDeslocInsercao` e
`svInserirGrafo` reais: projeto com nós mantém tudo e ganha só os
links internos novos, Output duplicado é ignorado com aviso, projeto
vazio mantém o Output inserido, tipos desconhecidos e grafos vazios
não quebram, e a fiação da interface está presente.

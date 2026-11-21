# Nala — assistente do editor (1.12.0)

## 1. Viabilidade (o que foi inspecionado)

| Fator do projeto | Realidade | Impacto |
|---|---|---|
| Formato | `index.html` único (~2,2 MB), sem bundler/`package.json` | Nada de dependência pesada embutida; o app precisa continuar abrindo direto |
| Hospedagem Web | GitHub Pages (estático, sem backend, sem headers COOP/COEP) | Sem servidor de inferência próprio; WASM multithread limitado |
| Android | Capacitor/WebView, `minSdk 29` (Android 10+), `copyWebApp` copia `index.html`+`assets` | O mesmo código roda no APK; WebGPU em WebView é raro/inconsistente |
| Backend/segredos | Não existe backend nem cofre de chaves | API paga/remota exigiria servidor novo + custo + consentimento — fora da v1 |

**Conclusão:** um LLM embutido no APK/Pages (centenas de MB) ou um backend
novo **não** é viável como padrão. A v1 entrega:

1. **Modo padrão — conhecimento local (offline):** busca sobre a base
   verificada do editor. Zero download, zero rede, roda igual na Web e
   no APK, inclusive em aparelho fraco.
2. **Modo opcional — modelo generativo local:** download explícito
   (com confirmação e tamanho) do modelo abaixo, executado num Web
   Worker no próprio aparelho. Se falhar (memória/WebGPU/rede), a Nala
   volta sozinha para o modo 1 e avisa.

## 2. Modelo escolhido

| Critério | Escolha |
|---|---|
| Modelo | **Qwen2.5-0.5B-Instruct** (`onnx-community/Qwen2.5-0.5B-Instruct`) |
| Licença | **Apache-2.0** (uso comercial, modificação e redistribuição permitidos, manter avisos) — verificado na página oficial do modelo |
| Fonte oficial | https://huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct |
| Download | ~**512 MB** uma única vez (ONNX quantizado q4 + tokenizer/config); fica em cache no navegador/WebView |
| Memória | ~**2 GB** durante a inferência (aparelhos com pouca RAM podem falhar — a UI trata e cai para a base local) |
| Runtime | Transformers.js + ONNX Runtime Web em Web Worker (WASM 1 thread por falta de COOP/COEP; WebGPU quando o navegador expõe) |
| Português | Sim — Qwen2.5 é multilíngue (29+ idiomas, incluindo português) |
| Internet | Só para o download inicial do modelo e da biblioteca (CDN jsDelivr/Hugging Face). Depois, offline |
| GPU | Não obrigatória (WASM/CPU funciona, mais lento) |

Rejeitados: Llama 3.2 (licença customizada da Meta, não é Apache);
modelos ≥1.5B (download/RAM altos demais para WebView de aparelhos
comuns); backend remoto (custo, segredo e privacidade); WebLLM como
padrão (exige WebGPU, ausente na maioria dos WebViews).

**Bloqueio registrado:** neste ambiente de desenvolvimento o host
`huggingface.co` não é acessível, então o modelo **não foi baixado nem
executado aqui**. O caminho de download/geração está implementado e
protegido por try/catch, mas a primeira execução real precisa ser
confirmada num aparelho/navegador do usuário (ver "Testes").

## 3. Base de conhecimento

- **Nós (≈200):** gerada **em tempo de execução** a partir de
  `NODE_TYPES` + `CATS` do próprio app — título, categoria, entradas e
  todos os parâmetros com faixa e padrão. Nunca fica desatualizada:
  nó novo entra sozinho na base.
- **Tópicos curados (`NALA_TOPICOS` no `index.html`):** Home/projetos/
  pastas, adicionar nós (Shift+A Wheel→lista), ligar sockets, parâmetros,
  imagem/GIF/vídeo e Assets, prévia/exportação, Timeline, Artboards,
  Comunidade, Web×Android, atalhos e limites da Nala.
- **Busca:** tokens PT sem acento, peso título>tags>corpo
  (`nalaBuscar`), sem embeddings — leve o bastante para qualquer aparelho.
- **Prompt (modo generativo):** `nalaSystemPrompt` injeta os trechos
  recuperados (RAG) e obriga: PT-BR, só o contexto, admitir o que não
  sabe, nunca afirmar que controla o editor.
- **Contexto ao vivo (opcional, desligado por padrão):** com a caixa
  marcada, a Nala lê apenas metadados do grafo (nº de nós/ligações, nó
  selecionado, controles visíveis). **Imagens e arquivos do projeto
  nunca são lidos nem enviados.**
- **Atualização:** tópicos mudam junto com a interface no mesmo PR;
  revisar `NALA_TOPICOS` quando um fluxo mudar. A parte de nós é
  automática. `tests/nala.test.mjs` trava as regras principais.

Não verificado/não prometido: a Nala **não** executa ações no editor
(sem criar/mover/apagar nós), não tem voz/microfone na v1 ("ouvindo" =
campo focado) e o modo generativo não foi executado neste ambiente.

## 3b. Personalidade e ícone mobile (1.12.2)

- **Personalidade:** prompt e modo local seguem a mesma regra —
  responde primeiro e curto, linguagem simples, passos com nomes reais
  (Node Adder, Wheel/Gallery, Shift+A), termo técnico explicado em
  poucas palavras, **uma** pergunta de esclarecimento quando a busca é
  fraca/ambígua (`nalaClassificar`), nós mostram no máximo 6 parâmetros
  (lista completa só com "detalhes"), idioma do usuário (PT-BR padrão),
  sem emojis/desculpas em excesso e sem inventar nada.
- **Ícone no mobile:** em telas ≤820px o botão encolhe (48px; 44px em
  landscape) e flutua **acima da timeline**, com `nalaReposicionar()`
  medindo a altura real do `#tlPanel` (ResizeObserver + MutationObserver
  + resize) + `env(safe-area-inset-bottom)`. Desktop inalterado.

## 4. Arquivos adicionados/alterados

- `index.html` — CSS `#nala-css`, bloco Nala (UI, base, busca, Worker
  do modelo, estados do avatar) e bump 1.12.0.
- `assets/nala/README.md` — slot e especificação da arte final.
- `tests/nala.test.mjs` + passo no CI.
- `docs/nala.md` — este documento.

## 5. Uso e manutenção

- **Usar:** botão dourado "N" no canto inferior direito (mouse, toque
  ou teclado; Esc fecha). Pergunte por nome do nó ou pelo objetivo.
- **Ativar o modelo:** no painel, "Baixar e ativar modelo local
  (~512 MB)" → confirme o download. "Parar" encerra o Worker
  (cancelamento real) e descarrega o modelo.
- **Trocar o modelo:** ajuste `NALA_MODELO` e o `pipeline(...)` no
  bloco Nala do `index.html` (manter licença permissiva e q4).
- **Arte da personagem:** conectada na 1.12.1 a partir das imagens-base
  do usuário — avatares de rosto 512×512 em WebP em `assets/nala/`
  (idle/thinking/responding/error; listening reusa o idle). Para
  trocar, substitua o arquivo mantendo o nome (ver
  `assets/nala/README.md`); nenhum código muda.

## 6. Testes (reais, neste ambiente)

- `tests/nala.test.mjs`: modelo/licença/fonte, prompt honesto, busca
  PT (Blur Studio, Blob Tracker, adicionar nó, fora-de-escopo sem
  invenção), UI/estados, reduced-motion, consentimento desligado por
  padrão, confirmação de download, cancelamento e ausência de segredos.
- Suíte completa do projeto verde; sintaxe do script validada.
- **Não executado aqui:** download/inferência do Qwen (rede bloqueada
  para o Hugging Face) e teste em aparelho Android físico. Primeira
  validação sugerida: abrir a Nala no site publicado, ativar o modelo
  com Wi-Fi e perguntar "como funciona o Blur Studio?".

## 7. Conversa limpa (1.13.1)

Correção a partir de uma captura real: ao mandar "Oi", a Nala despejava
estatísticas do grafo e texto técnico na conversa. Causas: (a) com o
contexto da tela ligado, o texto bruto do contexto era **colado antes de
toda resposta** da base local; (b) não havia noção de **cumprimento** —
"Oi" caía na busca genérica e, no modo generativo, recebia os blocos de
contexto e divagava.

O que mudou:

- **Intenções especiais** (`nalaIntencao`, bloco puro): `saudacao`,
  `modelo` e `grafo` são detectadas antes da busca. Cumprimento responde
  "Oi! Como posso ajudar você?" — nos dois modos (nem o Worker é
  acordado). "Qual modelo você usa?" responde curto com nome/licença/
  tamanho. Perguntar do próprio grafo é o único caminho que mostra as
  estatísticas — porque foi pedido.
- **Contexto é interno, nunca colado:** o fallback não prefixa mais a
  resposta com o contexto; no generativo, o bloco vai marcado como
  "interno — não repetir ao usuário" e o prompt (regras 9–11) proíbe
  despejar contagens, nó selecionado, modelo/licença/tamanho ou detalhes
  da base sem pedido explícito. O contexto automático continua atrás do
  consentimento (⚙).
- **Interface:** a conversa principal tem só avatar, nome, mensagens,
  campo, Enviar e fechar. Contexto da tela, status, download/ativação do
  modelo, progresso e o "Sobre a Nala" moram no painel **⚙ Configurações
  da Nala**, fechado por padrão. O consentimento e a confirmação com o
  tamanho do download (~512 MB) continuam como estavam; erros relevantes
  continuam aparecendo no chat, mas o "modelo pronto" não insere mais
  mensagem técnica automática.
- **Testes:** `tests/nala.test.mjs` executa o `responderKB` real (com
  docs mínimos) para "Oi", "Bom dia", pergunta de nó e "qual modelo?";
  confere o classificador de intenção, o prompt e a nova interface. O
  modo generativo continua **não executado neste ambiente** (Hugging
  Face inacessível): o comportamento dele é garantido pelo mesmo atalho
  determinístico de intenções + regras do prompt, a validar no aparelho.

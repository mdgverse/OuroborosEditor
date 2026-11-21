# Nala — arte oficial da personagem

Arte conectada na **1.12.1** a partir das imagens-base fornecidas pelo
usuário (mesma personagem e mesmos traços em todas: tranças loiras,
gola preta, argolas douradas). Os avatares são recortes de rosto
512×512 otimizados em WebP (~30–45 KB cada).

## Arquivos e estados

| Arquivo | Estado | Origem |
|---|---|---|
| `nala-idle.webp` | repouso / ouvindo | busto sorrindo, braços cruzados |
| `nala-thinking.webp` | pensando/carregando | busto com a mão no queixo |
| `nala-responding.webp` | respondendo | busto animado, dedo levantado (ideia) |
| `nala-error.webp` | erro | corpo inteiro, expressão séria |

O estado `listening` reutiliza o `nala-idle.webp` (o anel verde do CSS
indica o foco). A troca é feita por `NALA_AVATARES` + `setEstado()` no
bloco da Nala em `index.html`; o anel animado continua por cima
(girando = pensando, pulsando = respondendo, vermelho = erro) e
desliga com `prefers-reduced-motion`.

## Como trocar a arte no futuro

1. Exporte o novo rosto em **WebP ou PNG quadrado, 512×512** (fundo
   branco ou transparente — o avatar é cortado em círculo).
2. Substitua o arquivo correspondente nesta pasta, mantendo o nome.
3. Nenhum código precisa mudar. Para adicionar um estado novo, some
   uma entrada em `NALA_AVATARES` e um arquivo com o mesmo padrão.

As imagens-base originais (corpo/busto em alta) ficam com o usuário;
o app guarda apenas os recortes leves acima.

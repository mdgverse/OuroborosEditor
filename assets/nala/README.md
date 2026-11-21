# Nala — slot da arte da personagem

A arte final da Nala será fornecida depois. Enquanto isso, o app usa um
placeholder (anel dourado + letra "N") gerado por CSS — **não é a
aparência final**.

## Como conectar a arte final (sem tocar na lógica)

1. Exporte cada estado como **PNG ou WebP com transparência**, quadrado,
   recomendado **512×512 px** (mínimo 192×192).
2. Salve nesta pasta com estes nomes:
   - `nala-idle.png` — repouso (o app já tenta carregar este arquivo;
     se existir, substitui o placeholder automaticamente)
   - `nala-thinking.png` — pensando/carregando (opcional)
   - `nala-responding.png` — respondendo (opcional)
   - `nala-error.png` — erro (opcional)
3. Estados sem arquivo próprio reutilizam o `nala-idle.png` com o anel
   animado do CSS (girando = pensando, pulsando = respondendo,
   verde = ouvindo/campo focado, vermelho = erro).
4. Respeite `prefers-reduced-motion`: as animações do anel já desligam
   nesse modo; não adicione GIFs animados pesados.

## Estados implementados

| Estado (`data-state`) | Quando | Visual do placeholder |
|---|---|---|
| `idle` | painel fechado | anel dourado parado |
| `listening` | painel aberto / campo focado | anel verde suave |
| `thinking` | buscando/gerando | anel girando |
| `responding` | resposta exibida | anel pulsando |
| `error` | falha do modelo | anel vermelho |

Interação: mouse, teclado (Enter/Espaço no botão, Esc fecha) e toque.

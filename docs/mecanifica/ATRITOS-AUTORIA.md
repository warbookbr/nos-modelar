# Atritos de autoria — o que dói ao modelar

Registro das dificuldades observadas quando alguém — pessoa ou agente — modela
de verdade. Existe porque o `PLANO.md` manda que capacidade nova nasça de
dificuldade observada, não de lista especulativa de operações.

## Como registrar

Um atrito só entra aqui depois de acontecer numa rodada real de modelagem. Cada
entrada precisa de:

- **onde dói** — na linguagem da Oficina (escrever a peça) ou na bancada
  (inspecionar a peça). Confundir os dois faz consertar a ferramenta errada;
- **evidência** — quantas iterações, qual foto, qual comando, qual erro;
- **o que foi contornado** — a gambiarra usada para seguir em frente;
- **capacidade candidata** — o que resolveria o caso geral, não só este.

Retrabalho é a medida. Chute de coordenada, ida e volta para achar um nome e
foto que não mostra o defeito são todos contáveis, mesmo quando o método de
quem modelou é inesperado.

## Atritos abertos

### A-1 — enquadramento livre não volta pela URL

**Onde dói:** bancada.

**Evidência:** ao orbitar, `vistaAtual` vira `livre` e
`salvarEstadoNaUrl` grava `isometrica` no lugar
(`src/bancada/main.js`). `npm run bancada -- --focar` avisa que o recorte
fotografado não está no endereço que ele mesmo imprime.

**Contorno:** só usar as sete vistas canônicas como evidência compartilhável.

**Capacidade candidata:** registrar câmera e alvo na URL com precisão fixa, para
que qualquer enquadramento — não apenas os canônicos — seja reproduzível. Vale
para qualquer inspetor 3D, não só para a Mecanifica.

### A-2 — não há como reenquadrar o conjunto com algo selecionado

**Onde dói:** bancada.

**Evidência:** `btnEnquadrar` ("Enquadrar", `F`) e `btnFocarSelecao`
("Focar seleção") chamam a mesma `focarSelecao()`. O contrato em
`BANCADA-E-APRESENTACAO.md` pede enquadramento do conjunto **ou** da seleção;
hoje é preciso limpar a seleção para rever o todo, e aí se perde a seleção.

**Contorno:** anotar os nomes à mão antes de limpar.

**Capacidade candidata:** separar "enquadrar tudo" de "enquadrar seleção", sem
que uma ação destrua o estado da outra.

### A-3 — destaque verde encobre o material da peça isolada

**Onde dói:** bancada.

**Evidência:** `bancada-drone-inspecao-direita-sel-lente-isolar-focado.png` — a
lente isolada aparece inteira em verde, então a inspeção de forma e material
acontece sobre uma cor que não é a da peça.

**Contorno:** olhar a mesma vista sem isolamento para conferir cor.

**Capacidade candidata:** quando a seleção é a única coisa visível, o destaque é
redundante; o realce deveria virar contorno em vez de tingir a superfície.

## Atritos resolvidos

Nada ainda. Uma entrada sai de "abertos" quando a mudança está no repositório e
provada; a evidência da prova fica junto.

---
name: esbocar-opcoes
description: Mostrar à pessoa, em imagem, as opções de forma em disputa durante o alinhamento — cilindros, anéis e caixas desenhados lado a lado na mesma escala a partir de um JSON declarativo, junto da foto de referência, com uma frase por opção e a pergunta de qual se parece mais. Use no alinhamento sempre que houver escolha de forma. Não use para desenhar a peça final nem prancha cotada.
---

# Esboçar opções de forma

A pessoa entende forma vendo, e não lendo medidas. Sempre que o alinhamento
chegar a uma escolha de forma (em pé ou deitado, encostado na face ou na ponta,
redondo ou achatado), desenhe as opções com esta ferramenta em vez de
descrevê-las em texto.

Escreva `<peça>/referencias/<assunto>.esboco.json` e rode
`npm run esboco -- <arquivo>`. Ele grava `<assunto>.png` e `<assunto>.svg` ao
lado. O exemplo de referência é
[`ombro-opcoes.esboco.json`](../../../procedural/pecas/braco-robotico/referencias/ombro-opcoes.esboco.json).

## O arquivo

A raiz tem `opcoes` e, opcionalmente, `vista` (`isometrica`, o padrão, ou
`frontal`, `lateral`, `superior`). Cada opção tem `titulo`, `nota` (uma frase
curta) e `formas`, e todas saem na mesma escala, com barra de 100 mm.

Cada forma tem `id`, `tipo`, `cor` (hex ou roxo, verde, azul, vermelho,
laranja, amarelo, cinza, preto, branco) e `rotulo` opcional, que sai fora do
desenho com linha de chamada. Medidas em milímetro. O `cilindro` usa
`diametro`, `comprimento`, `eixo` (`x`, `y` vertical ou `z`) e, se precisar,
`achatado: { lado: "+x", profundidade }` para uma face plana lateral. O `anel`
usa `diametroExterno`, `diametroInterno`, `espessura` e `eixo`. A `caixa` usa
`largura` (x), `altura` (y), `profundidade` (z) e `raio` de canto opcional.

Posicione pela relação e não por coordenada. A primeira forma leva
`centro: [0, 0, 0]`; as demais usam `sobre: "<id>"`, que apoia a base no topo
daquela forma, centrada nela, ou `ponta: { id, lado: "+x" }`, que encosta a
forma na face daquele lado, respeitando o achatado. `desloca: [dx, dy, dz]`
ajusta depois, quando precisar. Referência a id inexistente é recusada com a
lista de ids válidos.

## Como mostrar

Abra o PNG com `Read` antes de mostrar e confira que cada opção corresponde ao
que foi dito. Mostre à pessoa a foto de referência e o esboço juntos, uma
frase curta por opção dizendo o que muda entre elas, e termine com a pergunta
"qual se parece mais com o objeto?". A resposta vira decisão escrita no PLANO,
como na skill [alinhar-modelagem](../alinhar-modelagem/SKILL.md).

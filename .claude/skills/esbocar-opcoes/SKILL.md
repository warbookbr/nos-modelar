---
name: esbocar-opcoes
description: Mostrar à pessoa, em imagem, as opções de forma em disputa durante o alinhamento — cilindros, anéis e caixas desenhados lado a lado na mesma escala a partir de um JSON declarativo, junto da foto de referência, com uma frase por opção e a pergunta de qual se parece mais. Use no alinhamento sempre que houver escolha de forma. Não use para desenhar a peça final nem prancha cotada.
---

# Esboçar opções de forma

A pessoa entende forma vendo, e não lendo medidas. Sempre que o alinhamento
chegar a uma escolha de forma (em pé ou deitado, encostado na face ou na ponta,
redondo ou achatado), desenhe as opções com esta ferramenta em vez de
descrevê-las em texto. A referência completa do JSON está em
[`modulos/esboco/README.md`](../../../modulos/esboco/README.md); esta skill
diz como usá-la no alinhamento.

## Pare e planeje

Antes de escrever qualquer JSON, pare e decida por escrito, em um parágrafo curto por decisão, o que segue. O nível de detalhe que a pessoa pediu: conceito de proporção, peça reconhecível ou detalhe funcional. Quais peças serão esboçadas e quais ficam de fora, respeitando o limite de cerca de 6 formas por opção. Como cada peça será detalhada com caixa, cilindro e anel, dizendo o que não dá para representar (tubo, perfil, esfera). Se as linhas de centro ficam visíveis. Se há marcações (legendas, numeração, marcadores). E se o conjunto vira um esboço só ou vários. O texto pode ir no campo opcional `plano` da raiz do JSON, que o desenho ignora e a análise copia para o manifesto. Detalhes em [`PARE-E-ANALISE.md`](../../../docs/mecanifica/usar/PARE-E-ANALISE.md).

## Escrever e rodar

Escreva `<peça>/referencias/<assunto>.esboco.json` e rode
`npm run esboco -- <arquivo>`, que grava `<assunto>.png` e `<assunto>.svg` ao
lado. O exemplo de referência é
[`ombro-opcoes.esboco.json`](../../../procedural/pecas/braco-robotico/referencias/ombro-opcoes.esboco.json).

A raiz tem `opcoes` e, opcionalmente, `vista`: `isometrica` (padrão, a que a
pessoa entende melhor), `frontal`, `lateral` ou `superior`. Cada opção tem
`titulo`, `nota` (uma frase curta) e `formas`, e todas saem na mesma escala,
com barra de 100 mm. Cada forma tem `id`, `tipo`, `cor` e `rotulo` opcional,
que sai fora do desenho como legenda numerada com linha de chamada.

Os tipos são `caixa` (`largura` x, `altura` y, `profundidade` z, `raio` de
canto e `furos: [{ diametro, centro: [x, z] }]`), `cilindro` (`diametro`,
`comprimento`, `eixo`, `achatado`) e `anel` (`diametroExterno`,
`diametroInterno`, `espessura`, `eixo`). Não há tubo, perfil nem esfera.

Posicione pela relação e não por coordenada: a primeira forma leva
`centro: [0, 0, 0]`; as demais usam `sobre: "<id>"` (base no topo daquela) ou
`ponta: { id, lado: "+x" }` (encosta na face daquele lado), com `desloca` para
o ajuste fino. `rotacao: [rx, ry, rz]` em graus gira pela regra da mão direita
em torno do eixo de mundo: rx=+90 leva +y para +z, ry=+90 leva +z para +x e
rz=+90 leva +x para +y.

## Limpar o desenho

`linhasCentro: true` no topo ou na opção traça os eixos de cilindros, anéis e
furos. `ocultar` (topo, opção ou forma; o nível mais interno vence, `[]` religa)
desliga `linhasCentro`, `legendas`, `numeracao`, `marcadores`, `escala`,
`titulo` ou `nota`. `oculto: true` numa forma a tira do desenho sem apagá-la,
e ela segue valendo como referência de `sobre` e `ponta`. Um rótulo que já
começa com número ("1. base") não recebe outro.

## Limites

Com mais de uns 6 formas por opção o desenho degrada: numa moto de 11 formas as
legendas se cruzam, a escala cai para 0,15 px/mm, as linhas de chamada cortam o
desenho e o SVG passa de 2,6 MB em vários segundos. Esboce só o que está em
disputa, use `ocultar: ["legendas"]` quando o conjunto for grande e
ilustrativo, e divida em vários esboços.

## Conferir antes de mostrar

Abra o PNG com `Read`. Para qualquer esboço que vá à pessoa, rode
`npm run esboco -- <arquivo> --analise` (8 imagens, sem linhas de centro; acrescente `--centros` só se a pessoa quiser vê-las, o que gera 16) e leia as imagens conforme a seção
Esboço de
[`PARE-E-ANALISE.md`](../../../docs/mecanifica/usar/PARE-E-ANALISE.md):
legenda que cruza, balão no elemento errado, escala pequena, oclusão errada e
rotação no sentido errado. Relate os defeitos por vista e região e o que não
foi conferido.

## Como mostrar

Mostre à pessoa a foto de referência e o esboço juntos, uma frase curta por
opção dizendo o que muda entre elas, e termine com a pergunta "qual se parece
mais com o objeto?". A resposta vira decisão escrita no PLANO, como na skill
[alinhar-modelagem](../alinhar-modelagem/SKILL.md).

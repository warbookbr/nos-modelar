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

Antes de escrever qualquer JSON, pare e decida por escrito, em um parágrafo curto por decisão, o que segue. O nível de detalhe que a pessoa pediu: conceito de proporção, peça reconhecível ou detalhe funcional. Quais peças serão esboçadas e quais ficam de fora, respeitando o limite de cerca de 6 formas por opção no modo de legendas padrão; com mais que isso, escolha `legendas: "lista"`. Como cada peça será detalhada com caixa, cilindro e anel, dizendo o que não dá para representar (tubo, perfil, esfera). Se as linhas de centro ficam visíveis. Se há marcações (legendas, numeração, marcadores) e, com mais de uns 6 formas por opção, o modo `legendas: "lista"`. E se o conjunto vira um esboço só ou vários. E as regras de contato: o gate `contato: { usar: true }` fica ligado por padrão quando o esboço tem 4 ou mais formas por opção, e desligá-lo é uma decisão que se escreve no `plano` com o motivo (por exemplo, conceito solto de proporção com peças sem relação entre si). Com o gate ligado, decida a tolerância, a penetração e as exceções declaradas: `atravessa` com o `max` esperado e o `motivo`, `encosta`, `livre` com o `motivo`. Declare `atravessa` só onde uma peça de fato passa pela outra (eixo em furo, anel em volta de cubo) e prefira desenhar as demais peças encostadas em vez de sobrepostas. O texto pode ir no campo opcional `plano` da raiz do JSON, que o desenho ignora e a análise copia para o manifesto. Detalhes em [`PARE-E-ANALISE.md`](../../../docs/mecanifica/usar/PARE-E-ANALISE.md).

## Escrever e rodar

Escreva `<peça>/referencias/<assunto>.esboco.json` e rode
`npm run esboco -- <arquivo>`, que grava `<assunto>.png` e `<assunto>.svg` ao
lado. O exemplo de referência é
[`ombro-opcoes.esboco.json`](../../../procedural/pecas/braco-robotico/referencias/ombro-opcoes.esboco.json).

A raiz tem `opcoes` e, opcionalmente, `vista`: `isometrica` (padrão, a que a
pessoa entende melhor), `frontal`, `lateral` ou `superior`. Cada opção tem
`titulo`, `nota` (uma frase curta) e `formas`, e todas saem na mesma escala,
com barra de 100 mm. Cada forma tem `id`, `tipo`, `cor` e `rotulo` opcional,
que sai fora do desenho como legenda numerada com linha de chamada. Com `legendas: "lista"` (raiz ou opção) o rótulo vira balão numerado sobre a peça e chave numerada abaixo do desenho, sem linha de chamada nem colunas laterais; a peça totalmente atrás de outra ganha balão tracejado na borda de quem a cobre e "(oculta nesta vista)" na chave.

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

No modo de legendas padrão, com mais de uns 6 formas por opção o desenho degrada: numa moto de 10 formas as
legendas se cruzam, a escala cai para 0,15 px/mm e as linhas de chamada cortam o
desenho. Com mais de uns 6 formas use `legendas: "lista"`, que sobe a escala
(na mesma moto, 0,28 px/mm na isométrica) e tira as linhas de chamada. Esboce só o que está em
disputa e divida em vários esboços quando ainda assim ficar cheio.

## Conferir antes de mostrar

Abra o PNG com `Read`. Para qualquer esboço que vá à pessoa, rode
`npm run esboco -- <arquivo> --analise` (8 imagens, sem linhas de centro; acrescente `--centros` só se a pessoa quiser vê-las, o que gera 16) e leia as imagens conforme a seção
Esboço de
[`PARE-E-ANALISE.md`](../../../docs/mecanifica/usar/PARE-E-ANALISE.md):
legenda que cruza, balão no elemento errado, escala pequena, oclusão errada e
rotação no sentido errado. Relate os defeitos por vista e região e o que não
foi conferido.

## Regras de contato

`contato: { "usar": true, "tolerancia": mm, "penetracao": mm, "folga": mm, "pares": [...] }` na raiz (a opção sobrepõe a raiz) liga o gate, e a política é ligá-lo por padrão a partir de 4 formas por opção. Sem `usar` nada muda. Toda exceção declara por quê: `atravessa` e `livre` exigem `motivo` (pelo menos 15 caracteres) e `atravessa` exige também `max` em mm; `encosta` não exige `motivo`. Par sem isso é "esboço recusado", com o par, o campo que falta e um exemplo. Exemplos:

```json
{ "a": "garfoE", "b": "guidao", "tipo": "atravessa", "max": 15, "motivo": "a presilha do guidão abraça a bengala" }
{ "a": "base", "b": "enfeite", "tipo": "livre", "motivo": "o enfeite é só um conceito solto sobre a base" }
{ "a": "base", "b": "alojamento", "tipo": "encosta" }
```

O `livre` continua ignorando o par, mas o relato o lista em "pares silenciados:" com o motivo; leia essa lista e apague o `livre` que esconde uma peça mal posicionada. Os padrões são tolerância de 1% (folga máxima para ligar duas peças), penetração de 0,3% (sobreposição aceita entre peças que não são `atravessa`) e folga de 10% da maior dimensão. `npm run esboco` imprime `colisao`, `longe`, `voando`, `par-nao-encosta` e `atravessa-excedido` por opção, com peças e mm, e o resultado `aprovado` ou `reprovado`, seguido de "atravessamentos declarados:" com a profundidade de cada par `atravessa` e de "pares silenciados:" com o motivo de cada `livre`; a imagem sai igual, e `--estrito` termina com código 1 se reprovado. Leia cada achado contra a imagem: peça `voando` costuma ser posição errada, e colisão de peças que devem se cruzar pede o par `atravessa` com o `max` esperado e o `motivo`, porque o `max` é o que faz uma peça enterrada demais reprovar. Leia também cada atravessamento: profundidade que a imagem mostra como peça dentro da outra, e não como encaixe, indica peça mal posicionada. Detalhes em [`PARE-E-ANALISE.md`](../../../docs/mecanifica/usar/PARE-E-ANALISE.md).

## Como mostrar

Mostre à pessoa a foto de referência e o esboço juntos, uma frase curta por
opção dizendo o que muda entre elas, e termine com a pergunta "qual se parece
mais com o objeto?". A resposta vira decisão escrita no PLANO, como na skill
[alinhar-modelagem](../alinhar-modelagem/SKILL.md).

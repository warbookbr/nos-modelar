# Avião de pequeno porte — o objeto no núcleo

Registro da passagem do avião do esboço à receita, fatia 1 do plano [o avião do esboço
à receita](../../../docs/mecanifica/planos/2026-10-15-o-aviao-do-esboco-a-receita.md),
em 2026-10-15. O objeto, a escala, as partes, o que se move, o realismo e o que
reprova foram combinados com a pessoa no
[alinhamento do avião](../../../docs/mecanifica/banco-de-provas/aviao-2026-10-11/ALINHAMENTO.md),
e a forma foi aprovada por ela no [esboço da segunda
rodada](../../../docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json)
em 2026-10-13. Este arquivo não refaz nada disso: diz como o esboço vira peças do
núcleo. As referências continuam no banco de provas, apontadas por
[`referencias.json`](referencias.json), com os contornos e as pranchas aceitos.

## As partes no núcleo

Cada unidade do esboço vira uma peça, com a receita em `partes/<parte>/receita.js` e o
mesmo nome da unidade, e as formas da unidade viram as partes da receita. A receita
refina o [andaime](andaime.json) que o esboço traduz, gravado com
`npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json --andaime procedural/pecas/aviao/andaime.json`,
e declara em `REFINA.partes` qual volume do andaime cada parte dela refina.

| peça | o que é, pelas formas do esboço |
|---|---|
| `fuselagem` | o casco por seções da fuselagem, o para-brisa e o montante dele, as oito janelas, a porta traseira e a barbatana ventral |
| `motor` | o capô, a entrada de ar e os dois escapes |
| `helice` | o cone e as cinco pás |
| `asas` | as duas metades da asa com a ponta levantada, os flaps, os ailerons, os eixos deles e os suportes |
| `empenagem-horizontal` | as duas metades do estabilizador, os profundores, os eixos e os suportes |
| `empenagem-vertical` | a deriva, a dorsal, o leme, o eixo dele e as dobradiças |
| `trem-do-nariz` | a carenagem, o pivô e os mancais, a alavanca e o atuador, o compasso, a perna, o pistão, o garfo, o eixo e a roda |
| `trens-principais` | os dois trens, cada um com a perna, o pivô, a coroa, o garfo, o eixo, a roda, o compasso e o atuador |

## A ordem de montagem

A fuselagem primeiro, porque todas as outras peças se prendem nela; depois o motor, na
frente dela, e a hélice, no motor; as asas; a empenagem horizontal e a vertical, na
cauda; e os dois trens. A montagem (`montagem.json`) ganha cada peça quando a receita
dela existe, na ordem das etapas.

## O quadro e a escala

O andaime está em milímetro, no quadro do esboço: a proa em z 0 e a cauda em z 10.461,
x para a direita do piloto e y para cima. O núcleo trabalha em metro, no mesmo quadro,
com a mesma origem e os mesmos eixos, como o contrato do refinamento pede. A escala é
a do alinhamento, a envergadura de 12.800 mm.

## A pose

As receitas ficam na pose de pouso: os trens baixados, as superfícies de comando
neutras e a hélice parada na pose do esboço. O curso de recolhimento dos trens e o
giro da hélice e das superfícies continuam no esboço, onde o gate de curso os confere,
porque montagem com pose e cinemática é capacidade em aberto no núcleo.

## O que reprova

Os sete critérios do alinhamento valem, com o quinto só na pose de pouso: o trem não
atravessa a asa nem a fuselagem baixado. E a peça reprova quando o `REFINA` acusa
parte fora do envelope do volume que ela refina, parte sem volume ou porta fora do
lugar.

## A tradução

A [tradução](../../../docs/mecanifica/banco-de-provas/aviao-receita-2026-10-15/TRADUCAO.md)
mostrou que a fuselagem, o motor e os trens saem no andaime com o envelope do
esboço, e que as asas, as empenagens e a hélice não: a N2 não subtrai o recorte e
não inclina o sólido. A fuselagem é a primeira peça; as superfícies esperam a decisão
da pessoa sobre o que falta ao contrato.

# Carro fastback: alinhamento

Registro da fatia 1 do plano [modelagem de carro](../../../docs/modelar/planos/2026-11-14-modelagem-de-carro.md). As decisões de objeto, medida, nível e partes foram tomadas pela pessoa em 2026-11-14 e estão no plano; este arquivo as junta com a prancha aceita e o `andaime.json`, e deixa na seção de decisões o que a família `veiculo` pergunta e a pessoa ainda não respondeu.

## O objeto e as referências

O objeto é um cupê fastback de duas portas, inteiro, no nível oficial de carroceria: lataria, vidros, frente e traseira com luzes, para-choques e difusor, retrovisores, maçanetas, rodas, forro dos arcos e interior em volumes simples. Chassi, suspensão, motor e porta que abre ficam fora. As quatro referências (lateral, frontal, traseira e superior) foram geradas por IA, ficam fora do repositório, em `tmp/carro/`, e valem como caráter da forma, nunca como medida. O carro segue a referência nos traços, sem trocá-los.

## Medidas fixadas pela pessoa

| medida | valor |
|---|---|
| comprimento | 4.750 mm |
| largura, sem retrovisores | 1.900 mm |
| altura | 1.380 mm |
| entre-eixos | 2.720 mm |
| balanço dianteiro e traseiro | 1.030 e 1.000 mm |
| pneu | 680 mm de diâmetro, aro de 19 polegadas |

A bitola de 1.620 mm e o pneu de 270 mm de largura foram lidos na frontal e na traseira, e a tabela não os fixa. A escala é o comprimento. As imagens divergem da tabela: a lateral sai 8% mais curta e 7% mais alta, e a tabela prevalece; a frontal, a traseira e a superior batem com a tabela a menos de 0,5%.

## Esqueleto

A prancha cotada das quatro vistas, em `referencias/*.prancha.mjs`, guarda a silhueta, os vidros, a borda do capô e da tampa, os arcos e os pneus, e foi aceita pela pessoa vista a vista em 2026-11-14. O `andaime.json` guarda os pontos duros (lábio, nariz, eixos, base e topo do para-brisa, pico do teto, base da tampa, spoiler, quadris, ombros e soleira) e quatro volumes para a régua do planejado contra o executado: corpo de baixo, cabine e rodas. A forma da lataria nasce das curvas da prancha por `gaiolaPorRede`; os volumes só limitam a caixa de cada região. Farol, lanterna, retrovisor, maçaneta, grade, tomadas e recortes de baixo não estão na prancha e são decididos sobre a chapa, com o 3D lido contra a referência.

O referencial é o do andaime: x para a direita do carro, y para cima com o chão em 0, z para a frente, centrado no comprimento e na largura. As pranchas frontal e traseira desenham x para a esquerda do carro; como o carro é simétrico, só a declaração de peça de um lado precisa da conversão.

## Partes

Cada item é uma etapa da montagem v5, com a receita em `partes/<peça>/receita.js`.

| peça | o que é | partes nomeadas |
|---|---|---|
| `lataria` | chapa contínua de capô, para-lamas, portas, teto, colunas e tampa, com simetria | `chapa`, `rebaixoLateral`, `paralamaTraseiro` |
| `paineis` | vãos de porta, capô e tampa por `paineisPorVaos` | `porta`, `capo`, `tampa` |
| `vidros` | para-brisa, laterais e traseiro, com borracha | `paraBrisa`, `vidroLateral`, `vidroTraseiro`, `borracha` |
| `frente` | para-choque, grade, faróis, entradas, tomadas do capô | `parachoque`, `grade`, `farol`, `entradaDeNeblina`, `tomada` |
| `traseira` | para-choque, lanternas, painel escuro, difusor, escapes, spoiler | `parachoque`, `lanterna`, `painel`, `difusor`, `escape`, `spoiler` |
| `retrovisor` | corpo com pé na porta, dois lados | `corpo`, `espelho`, `pe` |
| `macaneta` | maçaneta sobre placa, dois lados | `macaneta` |
| `rodas` | quatro instâncias da família `roda-pneu`, perfil `carro` até a roda esportiva fechar | `roda`, `pneu` |
| `forro-dos-arcos` | forro por trás de cada arco e assoalho | `forro`, `assoalho` |
| `interior` | bancos, painel e volante em volumes simples, vistos pelo vidro | `banco`, `painel`, `volante` |

A superfície e as linhas de vão da lataria são definição comum, em `partes/_comum/`. O piloto da fatia 2 é o quarto traseiro da `lataria`, do meio da porta para trás.

## Encaixes

As rodas assentam no chão com o centro nos eixos do andaime, a 340 mm, e o pneu fica dentro do arco com folga ao forro. Os vidros assentam na borracha dentro do vão da chapa, sem degrau para fora. O para-choque encosta na chapa pela borda da prancha, e o retrovisor pousa na porta, na base da coluna dianteira. A lanterna e o farol entram como abertura na chapa com a peça por trás.

## O que reprova o objeto

1. Envelope fora de 4.750 por 1.900 por 1.380 mm em mais de 1%, ou eixo fora do andaime em mais de 5 mm.
2. Silhueta de qualquer vista fora da prancha aceita além da tolerância da rodada.
3. Falha de ondulação fora de uma saliência declarada no `PLANO`.
4. Vão de painel fora de 0,2 mm do declarado, ou diferente entre os lados.
5. Pneu que toca ou atravessa o forro do arco.
6. Vidro que deixa ver o oco do carro, sem interior atrás.
7. Coluna dianteira ou faixa de teto acima da porta reduzida a uma lasca, vista de lado.
8. Os dois lados diferentes fora de uma exceção declarada.
9. Linhas vizinhas de fresta, emenda ou borda a menos de 30 mm uma da outra.
10. Nome de modelo ou de fabricante, logotipo, emblema ou imagem de referência no repositório.

## Decisões que dependem da pessoa

A largura da coluna dianteira vista de lado e da faixa de chapa acima da porta. A prancha lateral as dá com uns 70 mm e 60 mm; recomendo fixá-las assim, com 50 mm como mínimo da régua.

A seção do plástico escuro de baixo (lábio dianteiro, saia e difusor): quanto sai da lataria e como dobra embaixo. A referência mostra o lábio dianteiro saindo uns 30 mm e a saia rente; recomendo lábio e difusor como peças com seção própria de 30 mm de saída e a saia como faixa de 10 mm, dobrando para dentro embaixo.

O para-lama traseiro saliente: a família pergunta pelo alargamento do arco de veículo de trabalho, que este carro não tem. Recomendo declará-lo como saliência da chapa na ondulação, sem moldura de arco, e dispensar as regras de moldura e de pontas assentadas para este objeto.

As exceções à simetria: a referência não mostra nenhuma (o bocal de combustível não aparece). Recomendo declarar o carro simétrico, sem exceção.

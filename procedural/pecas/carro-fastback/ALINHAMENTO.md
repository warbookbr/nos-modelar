# Carro fastback: alinhamento

Registro da fatia 1 do plano [modelagem de carro](../../../docs/modelar/planos/2026-11-14-modelagem-de-carro.md). As decisões de objeto, medida, nível e partes foram tomadas pela pessoa em 2026-11-14 e estão no plano; este arquivo as junta com a prancha aceita e o `andaime.json`, com as quatro respostas da pessoa às perguntas da família `veiculo`.

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
7. Coluna dianteira ou faixa de chapa acima da porta com menos de 50 mm, vista de lado.
8. Os dois lados diferentes fora de uma exceção declarada.
9. Linhas vizinhas de fresta, emenda ou borda a menos de 30 mm uma da outra.
10. Nome de modelo ou de fabricante, logotipo, emblema ou imagem de referência no repositório.

## Decisões aprovadas pela pessoa

As quatro perguntas da família `veiculo` foram aceitas como recomendadas, em 2026-11-14.

A coluna dianteira vista de lado tem cerca de 70 mm e a faixa de chapa acima da porta cerca de 60 mm, como na prancha lateral, e nenhuma fica abaixo de 50 mm.

O lábio dianteiro e o difusor são peças com seção própria, saindo 30 mm da lataria; a saia é uma faixa de 10 mm que dobra para dentro embaixo.

O para-lama traseiro saliente é declarado como saliência da chapa na régua de ondulação, sem moldura de arco, e as regras `arco-com-alargamento`, `alargamento-ao-pneu` e `pontas-da-moldura-assentadas`, de veículo de trabalho, não valem para este objeto.

O carro é simétrico, sem exceção declarada.

## Aceite

- alinhamento: aceito pela pessoa em 2026-11-14, "Aceito as quatro", depois de ver as quatro recomendações; as medidas, o nível e as partes vêm das decisões dela no plano.

## Veredito da pessoa por rodada

- lataria, rodada 7 (registro `rodadas/rodada-07.json`, rodada 8 do quarto traseiro no plano): aprovada pela pessoa em 2026-11-21, "Aprovo esta versão", depois de ver a zebra lateral e a pintura isométrica e lateral, antes e depois. O crítico cego deu 6, com a ondulação do flanco, a quina do ombro, a ponta da tampa e a soleira em 170 mm; a medida tirou a crista da tampa (de 9 laços para 0) e as ilhas do ombro perto da porta. Seguem em aberto, com a recomendação levada a ela: manter a soleira em 170 mm e fazer a descida como a etapa da saia, manter a tolerância de 3 mm da planta, e não insistir na ondulação do flanco antes de ferramenta nova de superfície.

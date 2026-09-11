# Rodada de alinhamento, preenchida: o quadro de bicicleta

Este documento é um caso, não uma regra. As regras moram na skill
`alinhar-modelagem`; aqui está uma rodada inteira respondida, para quem nunca
conduziu uma saber o que sai dela. A peça escolhida é o quadro de bicicleta
porque ela existe inteira, com plano, contatos declarados e medidas verdes.

A bicicleta completa NÃO existe no acervo. O quadro é o módulo 1 de 5, e rodas,
garfo, guidão e transmissão são peças próprias que ainda não foram modeladas.
Esse recorte não é um detalhe do exemplo: decidir onde a peça termina é a
primeira coisa que a rodada faz, e uma rodada que não decide isso entrega ao
modelador um alvo sem borda.

## As sete perguntas, respondidas

**1. Qual é o objeto, e qual módulo dele.** Quadro de MTB hardtail 29
polegadas, tamanho M, módulo 1 de 5. Termina onde começa o garfo, a roda, o
guidão e a transmissão. O canote e o selim não entram: pertencem a outro
módulo, ainda que a altura do selim tenha mandado em dois números daqui.

**2. Quais imagens de referência.** Três recortes em
`docs/mecanifica/referencias/bicicleta-29/`: `lateral.png` para a proporção
geral, `lateral-quadro.png` para as juntas do triângulo principal, e
`triangulo-traseiro.png` para o encontro dos balanços na ponteira.

Uma ressalva que a rodada registrou e que vale para qualquer referência gerada:
estas imagens valem como CARÁTER, nunca como dimensão. Elas foram geradas por
IA, e medir proporção nelas é medir o que outro modelo inventou.

**3. Qual medida dá a escala.** O diâmetro da roda montada, aro mais pneu, 734
milímetros. Escolhido por ser o único valor publicado do conjunto: aro ISO 622
mais 56 de pneu. Todo o resto da tabela foi medido no recorte lateral nessa
escala.

**4. Que partes existem, e como cada uma se chama.** Oito, com o nome que vai no
passo `parte` da receita: `caixaMovimentoCentral`, `tuboSelim`, `tuboInferior`,
`tuboSuperior`, `balancoInferiorEsq`, `balancoInferiorDir`,
`balancoSuperiorEsq`, `balancoSuperiorDir`.

**5. Que forma cada uma tem, e por qual técnica.** O tubo inferior é o mais
largo do quadro, achatado e arqueado, da caixa até o tubo de direção, feito por
`loft` de superelipse entre duas polilinhas medidas. O tubo do selim e o
superior são achatados e retos, `loft` de superelipse ao longo de uma reta. Os
quatro balanços são finos e de seção circular. A caixa do movimento central é um
cilindro curto e transversal, com tampas.

**6. Que pares devem se tocar, e por quê.** Onze soldas, cada uma com motivo
escrito na receita: os quatro tubos que nascem na caixa, o encontro do tubo do
selim com o superior e com os dois balanços superiores, os dois tubos que
terminam na mesma ponta dentro do tubo de direção, e cada balanço inferior com o
seu superior na ponteira.

**7. O que faz reprovar este objeto.** Inclinação do tubo do selim diferente da
vista lateral; triângulo principal aberto, com tubo que não alcança o vizinho;
balanços assimétricos entre os lados; tubo inferior reto, sem o arqueio que a
referência mostra; e quadro em escala diferente da roda de 734 milímetros.

## Três decisões que a rodada tomou e que o plano não guarda

Estas não cabem em nenhum campo, e são o que faz o documento valer mais que a
receita: elas explicam por que os números são esses.

**A imagem ganhou da tabela publicada.** A tabela de 29 polegadas tamanho M foi
descartada porque a referência tem traseiro longo, direção em pé e garfo curto
para o tamanho da roda, e o pedido era bater com a imagem.

**A tabela cedeu uma vez, e não cedeu outra.** A primeira versão punha o selim a
914 milímetros do chão; a comparação contra a folha mediu 1128, e 914 é
indefensável para uma 29 de quadro médio, então a tabela mudou. A mesma medição
deu 777 milímetros de pneu contra 734, e aí a tabela ficou, porque 734 é valor
publicado. O critério é qual das duas fontes tem autoridade sobre aquele
número — não qual delas é mais recente.

**As juntas são medidas, não encadeadas.** Encadear ângulo e comprimento
acumulava erro em cada solda, e mexer num parâmetro arrastava tubos que não
deviam se mexer. Cada ponto de solda sai do recorte ampliado, em avanço do
movimento central e altura do solo. É por isso também que o tubo inferior tem as
bordas como polilinha de doze pontos — e é por isso que ele é, hoje, a única
parte sem controle de parâmetro na bancada.

## O que esta rodada não teria pego

Duas falhas anteriores desta mesma bicicleta passaram por todas as medidas, e
elas são a razão de o plano existir.

Os balanços que seguram a roda ficaram soltos no ar, e o comando devolveu zero,
porque contato declarado que não acontece era apenas exibido, não reprovava.
Hoje reprova.

O pneu saiu maciço: aro, cubo e raios nunca chegaram a ser modelados, e sem uma
segunda parte não havia par para acusar contato — a peça era um disco sólido e
passava limpa. É essa a ausência que a lista de partes do plano torna
mensurável, porque só se pode acusar a falta do que foi prometido antes.

Nenhuma das duas teria sido pega por revisor mais atento. Ambas eram invisíveis
para quem olhava, e passaram a ser visíveis quando viraram declaração cobrada
por medida.

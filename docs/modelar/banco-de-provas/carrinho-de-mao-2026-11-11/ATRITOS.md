# Carrinho de mão: atritos do alinhamento e do rascunho (2026-11-11)

O carrinho de mão é a peça de prova da fatia 1 do plano
[`2026-11-10-nucleo-para-qualquer-mecanismo.md`](../../planos/2026-11-10-nucleo-para-qualquer-mecanismo.md).
Esta pasta guarda os três primeiros passos: o alinhamento
([`ALINHAMENTO.md`](../../../../procedural/pecas/carrinho-de-mao/ALINHAMENTO.md)), as referências em
contornos e o rascunho com a conferência. As imagens são do rascunho:
[três quartos](rascunho-tres-quartos.png), [lado](rascunho-lado.png), [frente](rascunho-frente.png),
[cima](rascunho-cima.png), e a conferência contra os contornos de
[lado](conferencia-lado-contornos.png) e de [cima](conferencia-cima-contornos.png). As fotos e o
desenho de referência são de terceiros e ficaram fora do repositório.

1. O rascunho foi feito primeiro pela descrição de memória do pedido (garfo de dois tubos, pés em
   trapézio, caçamba de 900 × 600 com manoplas a 615), e as referências que chegaram depois mudaram
   a forma inteira: o chassi é um tubo só com um laço em U em volta da roda, os pés são um V de outra
   peça, a caçamba afina para a frente, e as medidas do pedido não cabem nas proporções delas (com
   1.400 de comprimento o pneu seria de 311). O rascunho foi reescrito. O processo não pegaria: o
   `fluxo:objeto` deixa passar ao rascunho sem referência, e a skill de alinhamento não pergunta se
   a pessoa vai mandar imagem antes de se modelar de memória. Falta a pergunta na skill
   `alinhar-modelagem`: há referência a caminho? Se há, o rascunho espera por ela.

2. O `fluxo:objeto` na pasta ainda sem nada respondeu "não é pasta de objeto", sem o passo
   seguinte; outro agente está corrigindo esse caso. Com o esboço já escrito e sem `ALINHAMENTO.md`
   nem imagem, respondeu "passo 1 de 6, alinhamento", com as referências em falta ("falta imagem,
   contorno ou prancha") e o rascunho em falta pela conferência, e mandou criar `referencias/` e
   escrever o rascunho em `<nome>.esboco.mjs` com `--sem-cores`, quando os dois já existiam e o
   esboço declara as cores. Com os contornos e a conferência no lugar, deu referências e rascunho
   como feitos e repetiu as três instruções do passo 1 em "agora". Depois do `ALINHAMENTO.md` deu o
   passo 4 certo. O processo não pegou: o teste do comando não cobre o objeto com passos fora de
   ordem, e o "agora" sai do primeiro passo em falta sem olhar os que já estão feitos. Também conta
   o rascunho como feito pela existência do `.conferir.json`, sem saber se a conferência rodou ou se
   a pessoa o aprovou; falta esse campo no estado do passo.

3. A `conferir:vistas` recusa a configuração sem nenhuma vista ("precisa ter pelo menos uma vista
   com referência"), e a configuração "pronta para receber as vistas de IA" não pôde ser conferida
   antes de haver referência, embora as quatro vistas de três quartos e a sobra entre partes não
   precisem dela. O processo pegou, pela recusa. Fica a pergunta se a configuração só de três
   quartos e sobra deve valer.

4. As referências não entram no repositório, e os contornos foram tirados por um script solto, por
   cor e por corte geométrico (o azul acima do tubo é a caçamba, o escuro dentro do círculo é a
   roda, a perna abaixo da face de baixo do braço é o pé), com o traçado da borda e a
   simplificação em px antes da troca para mm. O `npm run contorno` não foi tentado, porque ele
   trabalha sobre a imagem e grava o pacote ao lado dela. O processo não pegaria: falta dizer, na
   skill `contorno-da-imagem`, como medir uma referência que fica fora do repositório e gravar só o
   `contornos.json`.

5. As referências não concordam entre si e nenhuma ferramenta as reconcilia: a foto de lado é
   tirada de cima (a perna de longe 80 px acima da de perto, o tubo de perto uns 20 mm abaixo do
   plano do meio), a foto de cima põe o que é baixo uns 90 mm adiante do que é alto, e o desenho de
   linha do chassi, na escala do comprimento, dá os pés 334 mm abaixo do braço contra 245 da foto.
   As escolhas estão no `ALINHAMENTO.md`. Na conferência isso aparece como 30% de sobreposição no
   chassi e 17% nos pés de lado e 12% no laço de cima, e não como erro do rascunho. O processo não
   pegaria: é a reconciliação de vistas da fatia 3, e a vista de contornos não tem como declarar
   que o contorno é a união de duas pernas afastadas pela perspectiva.

6. A `gaiolaVarrida` não faz a polilinha com raio nos cantos; o trilho do chassi saiu de uma
   função escrita no esboço (`trilhoComRaios`), que põe um arco tangente em cada canto e devolve os
   marcos para as estações. A alça e o escape da empilhadeira montam os arcos à mão do mesmo jeito.
   O processo não pegaria: é a terceira peça com a mesma conta, e ela deve ir para o núcleo como
   opção do trilho `{ pontos, raios }`.

7. O quadro da `gaiolaVarrida` fixa um eixo da seção e não o projeta no plano normal à tangente;
   num tubo redondo que sobe, a seção fica elíptica. Com o eixo fixo em y, que é o único que não
   fica paralelo à tangente em nenhum trecho do chassi (o laço corre em x e os braços em z), a seção
   na subida das manoplas e na rampa do laço mede 0,87 e 0,89 do diâmetro numa direção (28 mm no
   lugar de 32). O processo não pegou: vi lendo o código do quadro, e a imagem não mostra. Falta
   um quadro que acompanhe o trilho sem girar (transporte paralelo) ou o aviso da seção achatada.

8. A `gaiolaPorLacos` não faz a casca aberta: ela tampa as duas pontas. A boca da caçamba saiu
   tirando, pelo nome, as faces que só têm pontos do último laço, antes do passo `subdivisao` com
   espessura. O processo não pegaria; falta o campo que deixa uma ponta aberta.

9. A espessura da chapa recusou a casca com o fundo de 175 mm de meia largura, porque os cantos do
   laço do fundo ficavam com raio local de 6,7 mm. O núcleo pegou, com os pontos da gaiola, e o
   fundo foi para 150 com um laço a mais no pé da parede.

10. O relato de contatos não dá o encosto entre a face de cima de um bloco cortado pelo corpo da
   caçamba e a face de fora dela: a face rente deu travessia, e a face 0,3 mm abaixo deu folga sem
   medida ("as caixas se sobrepõem e os sólidos não se tocam"), que não distingue 0,3 de 30 mm. Os
   tirantes ficaram com essa folga declarada. O processo não pegaria: falta a menor distância entre
   os sólidos quando o relato diz folga com as caixas sobrepostas.

11. O relato deu "interpenetram" entre a caçamba e o chassi com o fundo a 0,5 mm dos braços, e o
   teste de cada aresta de um contra os triângulos do outro e o de paridade dos vértices não acharam
   cruzamento; com 2,5 mm deu folga, e o rascunho ficou com 2,5. O processo não pegaria: o relato
   não diz qual ponto achou dentro, e a dúvida só se resolve com teste solto.

12. A sobra entre partes acusou o aro 89,6 mm fora do pneu na vista de lado, porque o pneu de lado é
   um anel; é o mesmo do item 18 da empilhadeira, ainda aberto. O par saiu da configuração. O
   processo pegou, como falso positivo conhecido.

13. A medida que o pedido dava (comprimento perto de 1.400, manoplas de 600 a 650, pneu de 350 a
   400) não fecha com as referências em nenhuma escala, e a escala ficou pelo pneu de 340, com
   1.535 de comprimento e as manoplas a 535. Isso está no `ALINHAMENTO.md` como decisão da pessoa,
   com a recomendação de manter o pneu. O processo não pegaria sozinho: a comparação da tabela do
   pedido com os contornos foi feita à mão, e falta à vista de contornos a conferência das medidas da
   TABELA, além da silhueta.

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

14. O `fluxo:objeto`, antes das receitas, mandou "despachar o modelador (skill criar-peca) com o PLANO do
   ALINHAMENTO.md", mas o `ALINHAMENTO.md` não tem `PLANO`: tem a tabela, as partes e o que reprova, e o
   `PLANO` de cada peça teve de ser escrito a partir dele. A resposta também não disse que a montagem
   (passo 5) é escrita junto das receitas, porque a peça depois da primeira precisa dela para passar no
   `guarda:referencial` (a roda, com a origem no centro do pneu, reprovava "abaixo do chão" até a
   `montagem.json` existir, e a regra que a solta está só no código da guarda). O processo não pegou:
   falta ao passo 4 do fluxo a frase de onde sai o `PLANO` e a ordem receita e montagem.

15. Com as quatro receitas medidas, o `fluxo:objeto` deu o passo 4 como "falta chassi (revisar)" e, em
   "agora", mandou rodar `vistas:critica` e despachar o crítico das quatro peças ao mesmo tempo, com o
   passo 5 dizendo "próxima chassi" e a skill do laço dizendo uma etapa por vez; também imprime "(sem
   medir; confirme com --acao)" ao lado de uma ação que só sai medindo. O processo não pegou: o "agora"
   lista todas as peças em `revisar` sem olhar a ordem das etapas.

16. A família `roda-pneu` publica o furo do cubo só como anel (`eixo`, para `assentaAnular`), e o
   encaixe cilíndrico da roda no eixo pediu uma porta `cilindro` interna que a receita acrescenta, saindo
   da parede do furo (a última faixa da revolução do cubo); a porta de cilindro que sai da origem do cubo
   inteiro reprova o raio, porque a face do plano dela é o anel até o raio de fora. O `encaixaCilindrico`
   também exige que o intervalo do eixo fique dentro do furo (`intervalo-axial-fora`), o que obrigou o
   eixo do chassi a publicar só o assento da roda, e não a barra inteira, e a largura do cubo a vir dele
   por vínculo. A folga radial da relação é em metro, e a escrita em mm reprovou sem dizer a unidade. O
   processo pegou, pela reprovação da junta, mas nenhum documento diz essas três coisas.

17. A família `roda-pneu` não cobre o rascunho em três pontos: o cubo vai até 0,3 do diâmetro (102 mm, o
   rascunho tinha 110), o ombro até 30% da banda (25,5 mm, o rascunho tinha 26,5) e o aro é um barril reto,
   sem as abas que seguram o talão; e ela sempre fura o cubo (de 3 a 12 furos), que o rascunho não tinha.
   A receita ficou nos limites dela. O processo pegou, pela recusa da família.

18. O relato de contatos do esboço (a medida do `descrever`, tolerância de 1 µm) deu "atravessa" entre a
   caçamba de cuba e o chassi novo, com o fundo a 2,5 mm dos braços: um vértice do tubo em [-171,9; 282;
   -643,6] saiu "dentro" da casca, que está a 7 mm dele, e a auditoria da montagem (1e-9) e o teste
   exato em 1e-9 deram as duas separadas. É o item 11 de novo, agora com 2,5 mm de folga; sumiu quando a
   caçamba mudou. O processo não pegaria: o relato não diz qual ponto achou dentro.

19. O `vistas:critica` recusa o pacote da caçamba, nas duas formas dela: a luz rasante de cima ilumina
   13% a 17% da peça, porque a borda e as paredes fazem sombra dentro da cuba aberta, abaixo do limiar de
   25%. A peça côncava aberta para cima não tem azimute que acenda o fundo com a luz rasante. O processo
   pegou, pela recusa; falta à ferramenta a vista de luz rasante que entra na cuba, e o pacote oficial
   não sai até isso mudar.

20. A caçamba do rascunho de outubro (`docs/modelar/banco-de-provas/carrinho-refeito-2026-10-08/`) existia
   no repositório e não foi consultada quando o rascunho de novembro foi feito, por decisão de quem
   conduz; a pessoa teve de apontá-la ("era genuinamente bom"). Ela tinha o que as fotos mostram e o
   rascunho novo perdeu: o fundo plano, de contorno próprio, separado das paredes por uma dobra nítida, e
   as paredes quase planas. A receita trouxe isso de volta. O processo não pegaria: nem o
   `fluxo:objeto` nem a skill de alinhamento procuram rascunho anterior do mesmo objeto no banco de
   provas.

21. Ao trazer o fundo plano, `lacosPelasVistas` recorta a planta na meia largura do laço, e o laço do
   fundo saiu com quinas vivas dos lados, que a espessura recusou (`cantoApertado`); a receita reduz a
   volta da boca para cada laço. Com a dobra entre o fundo e as paredes, o vinco no laço do fundo, de
   qualquer nitidez, e os arcos de raio 10 a 30 mm foram recusados pelo `cantoApertado` nas emendas dos
   trechos do laço do fundo, com raio local de 4 a 16 mm, acima da chapa de 1,5 mm; o menor que passou é o
   arco de 35 mm. O processo pegou, pela recusa, mas o aviso dá o raio local acima da espessura e diz que
   "não chega" a ela, sem dizer o limite que de fato usa.

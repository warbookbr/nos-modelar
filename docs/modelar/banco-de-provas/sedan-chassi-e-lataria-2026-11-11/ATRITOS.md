# Sedã em chassi e lataria: atritos do alinhamento e do rascunho

Registro de 2026-11-11 do teste pedido pela pessoa: refazer o sedã vermelho do
acervo (`procedural/pecas/carro-sedan-classico/`) como um chassi e uma lataria
em painéis de chapa, e anotar toda dificuldade. O objeto está em
`procedural/pecas/sedan-chassi-e-lataria/`, com o `ALINHAMENTO.md`, o rascunho
em `referencias/sedan-chassi-e-lataria.esboco.mjs` e a conferência em
`referencias/sedan-chassi-e-lataria.conferir.json`. Nada do núcleo nem das
ferramentas foi alterado; cada falta foi contornada do modo mais simples e está
descrita abaixo.

A resposta à pergunta central é sim para a carroceria facetada da referência e
não, ainda, para uma chapa lisa. Os quinze painéis do rascunho saem de uma
superfície só, coincidem por construção e têm vão de 4,000 mm no plano em que a
linha de vão foi desenhada, com os arcos de roda e as janelas abertos. O
caminho não usa ferramenta de painel, que não existe: usa booleanas e a casca
montada vinte e três vezes. Onde a chapa é inclinada em relação à vista do
corte o vão ao longo dela cresce (5,07 mm no para-brisa), e na chapa lisa o
corte funciona, mas a superfície que as três vistas dão sai ondulada. Os itens
1, 2, 3 e 4 trazem as medidas.

As imagens desta pasta: `tres-quartos-frente.png` e `tres-quartos-tras.png`, o
carro inteiro com uma cor por painel; `chassi-tres-quartos-frente.png` e
`chassi-tres-quartos-tras.png`, o chassi com as rodas; `explodida-frente.png` e
`explodida-tras.png`, os painéis afastados do chassi; `vaos-lateral.png` e
`vaos-capo.png`, recortes ampliados em que o vão de 4 mm aparece;
`lado-a-lado.png`, as vistas do acervo em cima e o rascunho nas cores do objeto
embaixo; `experimento-chapa-lisa.png`, o corpo de baixo como chapa de
subdivisão cortada em quatro painéis; `vaos-para-brisa-antes-depois.png`, a
seção do vão de cima do para-brisa com a parede do corte no modo vista e no
modo superfície; `vaos-cantos.png`, o canto da porta traseira com a lateral e a
coluna C, antes e depois, e o pé da coluna A. Todas, menos a da chapa lisa,
foram regeneradas na terceira etapa.

## Atritos

1. Não há operação que parta uma chapa em painéis por linhas de vão, nem
   operação que copie um sólido. Fato: procurei em `npm run capacidade`, no
   catálogo de 40 operações e em `operacoes-procedurais.md` por painel, vão
   entre painéis e linha de vão, e não há. O caminho que montei foi a
   carroceria inteira como chapa fechada (o sólido de fora menos o mesmo sólido
   recuado de 1 mm, por `subtrair`) e cada painel como `intersectar` dessa
   chapa com um prisma da região dele, recuado 2 mm por `deslocar` da
   `extrusao`. Como `intersectar` consome a chapa, tentei copiá-la com
   `arranja`: com `d: [0, 0, 0]` o núcleo recusa ("d nulo põe todas as cópias em
   cima da fonte"), e com a cópia afastada e trazida de volta a citação da
   cópia falha depois do primeiro corte ("a face 2 da origem subtrair:3 foi
   consumida pelo intersectar do passo 5"). A saída foi montar a casca de novo
   para cada painel e cada vidro, 23 vezes: o rascunho tem 1.171 passos, dos
   quais 655 extrusões, 173 interseções, 50 uniões e 28 subtrações, e monta em
   8 a 11 s. Atribuição: núcleo. O que resolveria: uma operação que receba a
   chapa, as linhas de vão por vista e a largura do vão e devolva cada painel
   como origem nomeada, ou, no mínimo, a booleana que guarda a fonte ou uma
   cópia de sólido no mesmo lugar.

2. O vão só é constante no plano da vista do corte. Fato: a região de cada
   painel é um prisma, e o `deslocar` recua o contorno no plano do desenho.
   Medi na malha, da borda de um painel à do vizinho (script próprio, item 5):
   mínimo de 4,000 mm e mediana de 4,00 a 4,06 mm nos onze pares de chapa. No
   para-brisa, cortado pela vista de frente numa chapa a 52 graus, o vão ao
   longo da chapa vai de 4,03 mm nos lados a 5,07 mm em cima e embaixo, e no
   vidro traseiro, a 4,79 mm. A parede do corte também sai paralela ao eixo da
   vista, e não normal à chapa. Atribuição: núcleo. O que resolveria: a linha
   de vão como curva sobre a superfície, com o recuo medido sobre ela e o corte
   pela normal, que é o que a operação do item 1 deveria fazer.

3. A ferramenta mais próxima, `aberturaPorContorno` com `lente`, não serviu
   para porta. Fato: ela tira de uma chapa um pedaço por contorno fechado e o
   devolve como sólido rente à pele, recuado de `recuoDaLente`, o que é um
   painel com vão. Testei a porta dianteira no corpo de baixo feito por
   `lacosPelasVistas`, `gaiolaPorLacos` com `aberta` e `espessura` e
   `subdivisao`. Sem `sentido` ela recusa, como documenta ("a reta do eixo x
   atravessa a chapa 2 vezes"); com `sentido: '+'` ou `'-'` recusa nos dois
   contornos que tentei, um deles um retângulo de 500 por 250 mm no trecho
   plano da porta ("o corte deixou uma bordas que não fecha em vez das duas de
   uma chapa"). Não investiguei a causa. Pela documentação ela também não
   aceita linha que sai pela borda da chapa, que é o caso do para-lama, da
   lateral e dos painéis da frente e de trás. Atribuição: núcleo. O que
   resolveria: a operação do item 1; antes dela, saber por que a abertura com
   `sentido` falha nessa chapa fechada.

4. A chapa lisa pelas três vistas não dá lataria aceitável sem trabalho de
   gaiola. Fato: o mesmo corte por região sobre o corpo de baixo como
   `subdivisao` com espessura de 1 mm, em nível 2, deu quatro painéis em 2,8 s
   (capô, para-lama e as duas portas, 2.172 faces), com o vão visível. A gaiola
   devolveu 13 avisos, entre eles "amostragem desigual" com razão de 1.636
   entre trechos e "o perfil passa da planta", e a imagem
   `experimento-chapa-lisa.png` mostra o para-lama ondulado e o canto da frente
   enrugado. O guia `modelar-carroceria.md` descreve a chapa lisa como uma
   parte só, por `gaiolaPorEstacoes` ou `gaiolaPorRede`, e registra que esse
   nível chegou à nota 7 do crítico na forma geral e 5 nos detalhes de borda.
   Fiquei com a superfície facetada, que é a da referência. Atribuição: núcleo
   e instrução. O que resolveria: o caminho de chapa lisa de carroceria inteira
   pelas vistas com qualidade medida antes do corte, e o guia dizendo como a
   chapa lisa se divide em painéis.

5. O relato de contatos não mede o vão. Fato: `npm run esboco:nucleo --
   <esboço> --so-montar --estrito` lista 183 pares em folga, e 117 deles saem
   como "as caixas se sobrepõem e os sólidos não se tocam", sem número: é o
   caso de todo vidro na porta ou no teto, de cada porta no teto e de cada
   farol no painel. Nos pares com número, ele é a distância entre as caixas num
   eixo: lateral traseira e teto saem com 2,000 mm, e a menor distância entre as
   bordas dos dois é 5,3 mm. Para afirmar o vão escrevi um script de 40 linhas,
   fora do repositório, que mede da borda de um painel às arestas do outro e dá
   mínimo, mediana e percentil 90. Atribuição: ferramenta. O que resolveria: o
   contato declarado como `folga` aceitar o valor esperado e a tolerância, e o
   relato medir a menor distância entre os sólidos e a variação dela ao longo
   da borda comum, além do degrau entre as duas superfícies.

6. A referência não tem o que um carro em painéis pede. Fato:
   `fonte-partes.json` dá a caixa e as silhuetas em 48 fatias de 91,7 mm e 24
   de 63,5 mm; `fonte-vistas.png` é toda vermelha, sem linha de painel, e não
   há vista de trás. A fonte tem duas janelas por lado, proporção de duas
   portas, e o pedido é de quatro. Não há chassi nenhum. Toda linha de vão, a
   divisão das portas, a soleira, a junta do teto na cintura e as 34 partes do
   chassi são proposta minha, e os perfis mais finos que as fatias vieram da
   `TABELA` da receita do acervo, que leu a malha que não está no repositório.
   Atribuição: referência. O que resolveria: para carro, uma prancha com as
   linhas de painel nas quatro vistas e um corte com o assoalho e as
   longarinas, pela skill `desenhar-prancha`, aprovada pela pessoa antes do
   rascunho.

7. O alinhamento pressupõe a pessoa presente, e o fluxo não tem estado para o
   alinhamento proposto por agente. Fato: `npm run fluxo:objeto` mandou
   "conduzir o alinhamento com a pessoa (skill alinhar-modelagem)", que pede
   uma pergunta por vez. Como agente despachado escrevi o `ALINHAMENTO.md` com
   oito decisões pendentes. Depois disso o fluxo deu os passos 1, 2 e 3 por
   feitos e mandou criar a receita do chassi: ele confere que o arquivo tem uma
   tabela, um título com "medidas" e um com "partes", que há um
   `.contornos.json` e que a conferência rodou, e não confere se a pessoa
   aceitou alguma coisa. Atribuição: ferramenta e instrução. O que resolveria:
   um campo de aceite da pessoa no alinhamento e no rascunho, lido pelo fluxo,
   e o estado "proposto, aguardando a pessoa" como passo.

8. O fluxo quer uma receita por peça, e os painéis dividem uma superfície.
   Fato: o fluxo lê cada item numerado da seção de partes como uma peça com
   `partes/<peça>/receita.js` e manda `npm run comecar -- modelar/peca/nova`
   para cada uma das 14. Os quinze painéis só coincidem porque saem da mesma
   casca e das mesmas linhas de vão, que no rascunho moram num módulo só. Nada
   no fluxo, na skill `criar-peca` ou no `FLUXO-DO-OBJETO.md` diz onde mora a
   definição comum a várias peças nem como a etapa de uma peça fica fixa
   quando a superfície comum muda. Atribuição: instrução e ferramenta. O que
   resolveria: o fluxo aceitar um módulo comum do objeto (a superfície e as
   linhas de vão) de que as receitas das peças dependem, com a assinatura dele
   na etapa.

9. O nome da peça no alinhamento tem duas regras. Fato: a skill
   `alinhar-modelagem` pede o nome das partes "em letras e dígitos, igual ao do
   passo parte da receita", e o acervo usa `paraLamaFrenteEsq`. Escrevi
   `lateraisTraseiras` na lista, e `npm run fluxo:objeto` parou com
   "'sedan-chassi-e-lataria/lateraisTraseiras' não é nome de peça; use letras
   minúsculas, dígitos e hífen". Ele lê o primeiro nome entre crases de cada
   item como nome de pasta. Troquei por `laterais-traseiras`. Atribuição:
   instrução. O que resolveria: a skill dizer que o item da lista é a peça, com
   nome de pasta, e que as partes nomeadas vêm depois dele.

10. Dois documentos descrevem o fluxo do objeto com passos diferentes. Fato:
    `FLUXO-DO-OBJETO.md` tem cinco etapas (alinhamento, mapa de partes,
    prancha, modelagem, aceite) e cita `npm run objeto`; `npm run fluxo:objeto`
    tem seis passos (alinhamento, referências, rascunho, receitas, montagem,
    fechamento), sem mapa de partes nem prancha. Segui o segundo, como o pedido
    mandava, e a prancha, que é onde as linhas de painel seriam desenhadas,
    não apareceu em passo nenhum. Atribuição: instrução. O que resolveria: um
    documento só, ou o guia dizendo qual comando vale para qual caso.

11. `conferir:vistas` não dá sobra nem falta, e o maior afastamento aponta as
    fendas dos vãos. Fato: a vista de contornos devolve a sobreposição, as duas
    áreas, a diferença de caixa por lado e o maior afastamento. A sobra e a
    falta que o pedido quer tive de calcular da sobreposição e das áreas. O
    maior afastamento do modelo saiu com 549 mm de lado, 888 mm de cima e 530
    mm de frente, em pontos como z -40 e y 973, que é a fenda entre as portas:
    onde os vãos dos dois lados se alinham e não há estrutura atrás, a
    silhueta tem um furo de 4 mm, e a medida toma a borda do furo como
    contorno. Atribuição: ferramenta. O que resolveria: a saída trazer sobra e
    falta em mm² e em parte da referência, e o afastamento medir só o contorno
    de fora, com os furos contados à parte.

12. A conferência compara o conjunto com uma referência que não tem chassi.
    Fato: com todas as partes, a sobra é de 5,2% de lado e 6,6% de frente, e é
    o chassi aparecendo 121 mm abaixo da carroceria. Mapeei a região da
    referência só para a lataria e as rodas para ter o número que interessa
    (sobra de 0,1% e falta de 7,1% de lado, 0,4% e 1,7% de cima, 0,2% e 2,8% de
    frente na carroceria). A falta de lado é o vão de 40 mm entre o pneu e o
    arco e os cantos que as fatias de 91,7 mm dão às rodas. Atribuição:
    referência e ferramenta. O que resolveria: a config aceitar partes do
    modelo fora da conta do conjunto, com o motivo, como já aceita regiões da
    referência em `ignorarRegioes`.

13. A família `roda-pneu` não tem o pneu da referência, e pôr quatro rodas num
    rascunho é trabalho manual. Fato: o perfil `carro` é um 205/55 R16 de 632
    mm, e a fonte tem pneu de 728 por 205; passei o diâmetro e a largura como
    parâmetro e o resto foi em proporção, com aro de 467 mm. O cubo da família
    fica dentro do pneu, e o da fonte sai até x 928: de frente, os pneus do
    modelo ficam 18,8 mm para dentro de cada lado e a região das rodas tem
    falta de 8,5%. Para instanciar a família no esboço em mm copiei da receita
    da roda do carrinho de mão as 25 linhas que convertem os passos de metro
    para mm, somam a base aos ids e trocam o nome das partes, e repeti a
    expansão quatro vezes, porque a família emite sempre `pneu`, `aro`, `cubo`
    e `disco`. Atribuição: família e ferramenta. O que resolveria: o esboço 2.0
    aceitar uma forma de família com perfil, parâmetros, prefixo de nome e
    posição, e um perfil de carro com o cubo saliente.

14. `deslocar` da `extrusao` recua todas as arestas por igual. Fato: para a
    casca não ter chapa embaixo, o perfil lateral de dentro precisa recuar 1 mm
    no topo, na frente e atrás e avançar 60 mm no fundo. Escrevi `recuar`, 16
    linhas, com a distância por aresta; a planta e as seções usaram o
    `deslocar` da ferramenta. Atribuição: núcleo. O que resolveria: `deslocar`
    aceitar uma distância por aresta, ou a casca como operação com faces
    abertas declaradas.

15. A função `casca` do núcleo não é operação que a receita chame para este
    caso. Fato: `procedural/nucleo/casca.js` faz casca de espessura constante
    com faces abertas, mas `casca` não está nas 40 operações do catálogo, e o
    cabeçalho dela diz que recusa sólido côncavo com vértice de valência 4 ou
    mais, que é o caso da carroceria unida à cabine. Não a testei; usei a
    subtração do sólido recuado. Atribuição: núcleo. O que resolveria: o mesmo
    do item 14.

16. `grupos` da `subdivisao` nomeia regiões da mesma superfície, mas não serve
    a painel. Fato: lido em `procedural/nucleo/subdivisao-grupos.test.ts`, sem
    rodar: o passo recusa `grupos` com `espessura` ("grupos só vale sem
    espessura") e com `simetria`, e as partes ficam coladas, sem vão.
    Atribuição: núcleo. O que resolveria: a operação do item 1 cobrir também a
    chapa de subdivisão.

17. Nada diz como fazer um chassi nem onde a lataria apoia. Fato: o roteiro
    `modelar/peca/nova` aponta `modelar-carroceria.md`, que trata a carroceria
    como uma chapa só, e não aponta `modelar-veiculos.md`, que ensina a
    carroceria em bloco por interseção das vistas e cita chassi oito vezes sem
    técnica de plataforma. As 11 regras da família `veiculo` falam de plástico
    de proteção, alargamento e forro de arco, e nenhuma de vão, espessura,
    apoio do painel ou dobradiça. O que funcionou foi invenção do rascunho:
    desenhar cada membro passando da chapa e apará-lo por `intersectar` com o
    interior da casca, o que deu 70 pares em "encosta" à tolerância de 0,001
    mm. Atribuição: instrução e família. O que resolveria: uma seção de guia
    para veículo em chassi e lataria com essa técnica, a ordem dos painéis e os
    critérios de vão, de degrau e de apoio na família.

18. O relato não avisa a parte que não encosta em nada. Fato: 13 partes do
    rascunho ficam soltas, com folga em toda a volta (os 8 vidros, os 2 faróis,
    a grade e as 2 lanternas), e o modo estrito sai com 0. Soube disso
    cruzando a lista de partes com os pares do relato. Atribuição: ferramenta.
    O que resolveria: o relato listar as partes sem nenhum par em "encosta" ou
    "atravessa", e o modo estrito recusá-las sem declaração.

19. O modo estrito pega travessia e não pega fenda. Fato: o estrito acusou o
    anteparo traseiro cruzando os pneus e o montante C cruzando o pneu e o
    assoalho, e corrigi os dois. As fendas que deixavam ver através do carro
    (na linha das portas, sob as portas e na cintura) só apareceram na imagem
    ampliada e no afastamento do item 11; fechei-as estendendo os montantes e a
    soleira 6 mm além da linha de vão. O vão entre o teto e as portas ainda
    deixa ver através da cabine onde não há montante. Atribuição: ferramenta. O
    que resolveria: uma leitura por vista que marque onde a silhueta tem furo
    estreito.

20. A vista rápida não amplia nem recorta, e cada chamada monta tudo de novo.
    Fato: a 1.400 px de largura o vão de 4 mm tem 1 px. Tirei a vista de lado a
    5.200 px e a de cima a 3.000 px e recortei com um script fora do
    repositório. Cada `npm run vista:rapida` levou 12 s, quase tudo de
    montagem, e as 11 imagens levaram cerca de 2 minutos em paralelo. A vista
    explodida e o chassi sozinho saíram de uma variável de ambiente lida pelo
    esboço, porque o esboço 2.0 não tem opção de afastar ou de esconder partes
    na captura. Atribuição: ferramenta. O que resolveria: `--caixa` ou
    `--recorte` em mm na vista rápida, `--partes` para mostrar um subconjunto,
    um afastamento por parte para a explodida e várias vistas numa montagem só.

21. `npm run capacidade` lista só as oito gaiolas. Fato: as booleanas,
    `aberturaPorContorno`, `deslocar` da `extrusao`, o `friso` com `aba` e
    `grupos` não estão nele; achei cada uma em `operacoes-procedurais.md`, de
    125 KB, por busca de palavra. Atribuição: instrução. O que resolveria: o
    comando dizer que cobre só os ajudantes de gaiola e apontar o catálogo, ou
    cobrir as operações de corte e de abertura.

22. A borda dos painéis é um corte reto. Fato: a chapa do rascunho acaba numa
    parede de 1 mm, sem aba dobrada nem painel interno, e os vidros, os faróis
    e a grade não têm onde apoiar. O `friso` com `aba` dobra a borda de um vão
    de chapa de subdivisão ou de `aberturaPorContorno`; não testei se aceita a
    borda de um painel tirado por `intersectar`. Atribuição: núcleo, a
    conferir. O que resolveria: a aba ao longo da borda de qualquer painel, por
    nome, como parte da operação do item 1.

23. Dois agentes na mesma árvore misturaram arquivos num commit. Fato: não fiz
    commit, e dois commits de outro agente na mesma árvore levaram os arquivos
    deste objeto: o `4820fc86` levou uma versão intermediária de 479 linhas de
    `referencias/sedan-chassi-e-lataria.esboco.mjs`, e o `3ccca8b0` levou o
    `ALINHAMENTO.md`, o rascunho final, os contornos, a config da conferência e
    as dez imagens desta pasta. Só este arquivo ficou fora deles. Atribuição:
    instrução. O que resolveria: o agente que
    faz commit numa árvore dividida citar os caminhos dele no `git add`.

## O que falta ao projeto para carro

Em ordem de importância, com o estado de cada item em 2026-11-11, depois da
terceira etapa. Entregue quer dizer usado neste rascunho e medido; o que a
entrega ainda não resolve está na seção da etapa correspondente.

Primeiro, a operação que parte uma chapa de carroceria em painéis por linhas de
vão, com o vão medido sobre a superfície e o corte pela normal (itens 1, 2, 3 e
16). Entregue para a carroceria facetada: `paineisPorVaos` monta a chapa uma
vez, e no modo superfície a parede do corte é normal à chapa, de modo que o
para-brisa passou de 3,45 para 4,00 mm entre as paredes. Continua faltando a
linha que atravessa sozinha a dobra viva e o degrau: no ombro e na cintura
deste carro ela exige um trecho por face ou volta ao modo vista (terceira
etapa, itens 1, 2 e 7). A chapa de subdivisão com `grupos` (item 16) não foi
testada aqui.

Segundo, a medida do vão e do degrau entre painéis vizinhos e a da parte solta
(itens 5 e 18). Entregue: `npm run vao:partes` mede o vão da pele, a distância
3D, o degrau e as partes soltas, lê o esperado e o degrau por par e o `apoia`
da opção do esboço, e concorda com o relato de contatos. Continua faltando a
distância 3D mínima por par e o degrau conferido sem a amostra isolada
(terceira etapa, itens 10 e 11).

Terceiro, a carroceria lisa de qualidade pelas vistas (item 4). Continua
faltando para este rascunho, que é facetado; é o trabalho da fatia 4c, nas
subpastas `alta-definicao/`.

Quarto, a referência de carro com linhas de painel, vista de trás e corte do
chassi (item 6). Continua faltando: toda divisão de painel e todo o chassi
deste rascunho seguem sendo proposta, sem medida.

Quinto, a instrução e os critérios de veículo em chassi e lataria (item 17).
Entregue em parte, pelo guia de chassi e lataria da fatia 4b. Continua
faltando dizer nele em que vista e em que modo se desenha cada tipo de linha
de vão, que foi o que mais custou na terceira etapa (item 2 dela).

Sexto, o lugar da superfície comum no fluxo do objeto e o estado do alinhamento
proposto por agente (itens 7, 8, 9 e 10). Entregue na fatia 4b, com o aceite e
o módulo comum no fluxo; não foi exercitado nesta etapa, que ficou no rascunho.

Sétimo, a borda de chapa real, com aba, painel interno e apoio de vidro (item
22), e a casca com faces abertas como operação (itens 14 e 15). Continua
faltando: os painéis acabam em corte reto, os 8 vidros, os 2 faróis, a grade e
as 2 lanternas seguem soltos, agora declarados em `apoia`, e a casca ainda é a
subtração do sólido recuado com o `recuar` escrito no esboço.

Oitavo, uma família de chassi ou de plataforma (item 17). Continua faltando:
as 34 partes do chassi são caixas e perfis escritos à mão. A cópia no lugar
tirou 141 passos do chassi sem mudar isso.

Nono, a roda de carro na proporção da referência e a instância de família no
esboço (item 13). Entregue a instância: as quatro rodas saem de uma chamada,
com a cor por parte. Continua faltando o perfil de carro com o pneu de 728 mm
e o cubo saliente.

Décimo, a imagem ampliada, o subconjunto de partes e a vista explodida (item
20), a sobra e a falta na conferência (itens 11 e 12), o aviso de fenda (item
19) e o alcance do `npm run capacidade` (item 21). Entregues a sobra, a falta,
as partes fora da conta e a lista de fendas na conferência, e a ficha do
ajudante no `npm run capacidade`. Continuam faltando o recorte em mm e várias
vistas de uma montagem só na vista rápida: as imagens desta pasta saíram de um
script fora do repositório que monta uma vez, recorta por caixa e tira a seção
por um plano.

## Segunda etapa: o rascunho refeito com paineisPorVaos

Registro de 2026-11-11, depois de o diagnóstico acima virar a fatia 4b do plano
`docs/modelar/planos/2026-11-10-nucleo-para-qualquer-mecanismo.md`. O esboço
foi reescrito para tirar os quinze painéis e os oito vidros de `paineisPorVaos`
(`procedural/nucleo/paineis-por-vaos.js`), com a casca montada uma vez, e as
quatro rodas passaram a `instanciaDeFamilia`
(`tools/modelar/instancia-de-familia.mjs`). O chassi e os acabamentos ficaram
como estavam, com as mudanças de desenho ditas abaixo. O vão, o degrau e as
partes soltas foram medidos por `npm run vao:partes` nas duas versões; a versão
anterior do esboço ficou fora do repositório e foi medida a partir de uma cópia
temporária.

O ajudante resolve o que o item 1 pedia. As 28 linhas de vão e as 23 sementes
foram aceitas na primeira chamada, sem aviso, e os 23 pedaços saíram nomeados.
A lataria caiu de 782 para 133 passos, e o vão da face de fora ficou em 4,08 mm
no para-brisa e no vidro traseiro, que antes tinham 5,07 e 4,41 mm. A meta de
menos de um terço dos passos vale para a lataria (17%) e não para o esboço
inteiro (48%), porque o chassi e as rodas ficam com 429 passos. A meta de 4,0 a
4,2 mm vale para o vão da face de fora em todos os pares de chapa, menos num
ponto de quina de dois pares, e não vale para a distância entre os dois
sólidos, que cai a 3,45 mm no para-brisa (item 2).

Três linhas do desenho mudaram entre as duas versões, e a tabela as carrega. A
linha da frente foi de z 2.000 para z 1.990, porque passava em cima de uma
quina da planta e dava vão mínimo de 3,81 mm e degrau de 1,22 mm entre o painel
dianteiro e o para-lama. A linha entre a porta traseira e a lateral foi de z
-777 para z -760, porque a lateral acabava numa ponta de 2 mm entre a linha e o
arco. O vidro passou de 4 mm para 1 mm de espessura, por sair da mesma chapa.

| medida | antes | depois |
|---|---|---|
| passos do esboço | 1.171 | 562 (48%) |
| passos da lataria (painéis, vidros e acabamentos) | 782 | 133 (17%) |
| passos do chassi e das rodas | 389 | 429 |
| extrusão, interseção, união, subtração | 655, 173, 50, 28 | 167, 68, 32, 11 |
| vezes que a casca é montada no esboço | 23 | 1, mais 2 execuções do ajudante ao carregar o módulo |
| montagem da opção | 7,1 a 8,3 s | 2,0 a 2,4 s |
| carga do módulo | 1,8 s | 2,3 s |
| `esboco:nucleo --so-montar --estrito` | 12,1 a 12,8 s | 6,7 s |
| linhas do esboço | 503 | 535 |
| modo estrito | sai com 0; 70 encostam, 59 atravessam | sai com 0; 64 encostam, 63 atravessam |
| partes soltas | 13 | 13 de fato; o comando lista 11 (item 13) |
| `vao:partes` | 73 de 213 pares fora de 4,0 ± 0,2, sem vão declarado por par | 5 de 211 fora, com o vão declarado em 47 pares (itens 13 e 14) |
| conferência de lado | 92,8%, sobra 0,1%, falta 7,1%, 131 fendas | 92,8%, sobra 0,1%, falta 7,1%, 128 fendas |
| conferência de cima | 98,2%, sobra 0,4%, falta 1,5%, 142 fendas | 98,2%, sobra 0,4%, falta 1,5%, 204 fendas |
| conferência de frente | 97,5%, sobra 0,3%, falta 2,2%, 8 fendas | 97,5%, sobra 0,3%, falta 2,2%, 8 fendas |

A conferência das duas versões usa a mesma config, com o chassi fora da conta.

O vão da face de fora em cada par, em mm, por `npm run vao:partes`, como
mínimo, mediana, percentil 90 e máximo, com o maior degrau. Os pares do lado
esquerdo repetem os do direito, salvo onde dito.

| par | antes: vão | antes: degrau | depois: vão | depois: degrau |
|---|---|---:|---|---:|
| capô e para-lama | 4,00 / 4,00 / 4,00 / 4,00 | 0,00 | 4,08 / 4,08 / 4,08 / 4,08 | 0,00 |
| capô e painel dianteiro | 4,03 / 4,03 / 4,03 / 4,03 | 0,00 | 4,08 / 4,08 / 4,08 / 4,08 | 0,00 |
| para-lama e painel dianteiro | 3,81 / 4,12 / 4,12 / 4,12 (esquerdo: mínimo 3,94) | 1,22 | 4,04 / 4,13 / 4,13 / 4,13 (esquerdo: mínimo 4,02) | 0,62 |
| para-lama e porta dianteira | 3,96 / 4,06 / 4,06 / 4,07 | 2,00 | 4,04 / 4,14 / 4,14 / 4,15 | 2,04 |
| para-lama e soleira | 4,00 / 4,06 / 4,06 / 4,06 | 0,00 | 4,09 / 4,14 / 4,14 / 4,14 | 0,00 |
| porta dianteira e porta traseira | 4,00 / 4,00 / 4,00 / 4,00 | 0,00 | 4,08 / 4,08 / 4,08 / 4,08 | 0,00 |
| porta dianteira e soleira | 4,00 / 4,00 / 4,00 / 4,00 | 0,00 | 4,08 / 4,08 / 4,08 / 4,08 | 0,00 |
| porta traseira e soleira | 4,00 / 4,00 / 4,00 / 4,01 | 0,00 | 4,08 / 4,08 / 4,08 / 4,09 | 0,00 |
| porta traseira e lateral traseira | 3,99 / 4,15 / 4,15 / 4,16 | 2,00 | 4,03 / 4,08 / 4,08 / 4,18 | 2,04 |
| lateral traseira e soleira | 4,04 / 4,15 / 4,15 / 4,15 | 0,00 | 3,97 / 4,08 / 4,08 / 4,08 | 0,00 |
| lateral traseira e tampa | 4,00 / 4,00 / 4,00 / 4,00 | 0,00 | 4,08 / 4,08 / 4,08 / 4,08 | 0,00 |
| lateral traseira e painel traseiro | 4,00 / 4,00 / 4,00 / 4,01 | 0,00 | 4,08 / 4,08 / 4,08 / 4,09 | 0,00 |
| tampa e painel traseiro | 4,00 / 4,00 / 4,00 / 4,00 | 0,00 | 4,08 / 4,08 / 4,08 / 4,08 | 0,00 |
| porta dianteira e teto | 4,04 / 4,04 / 4,10 / 4,10 | 0,00 | 4,08 / 4,08 / 4,08 / 4,12 | 0,00 |
| porta traseira e teto | 4,00 / 4,10 / 4,10 / 4,10 | 0,00 | 4,08 / 4,08 / 4,08 / 4,08 | 0,00 |
| lateral traseira e teto | 4,00 / 4,00 / 4,00 / 4,00 | 10,46 | 4,08 / 4,08 / 4,08 / 4,08 | 10,47 |
| vidro e porta dianteira | 4,00 / 4,04 / 4,10 / 4,10 | 0,00 | 4,08 / 4,08 / 4,08 / 4,08 | 0,00 |
| vidro e porta traseira | 4,00 / 4,10 / 4,10 / 4,10 | 0,00 | 4,08 / 4,08 / 4,08 / 4,08 | 0,00 |
| vigia e teto | 4,00 / 4,02 / 4,10 / 4,10 | 0,00 | 4,08 / 4,08 / 4,08 / 4,08 | 0,00 |
| para-brisa e teto | 4,04 / 5,07 / 5,07 / 5,07 | 0,00 | 4,08 / 4,08 / 4,08 / 4,10 | 0,00 |
| vidro traseiro e teto | 4,02 / 4,41 / 4,41 / 4,41 | 0,00 | 4,08 / 4,08 / 4,08 / 4,09 | 0,00 |
| capô e teto | 5,53 / 5,53 / 5,53 / 5,59 | 3,00 | 5,61 / 5,61 / 5,61 / 5,64 | 3,04 |
| para-lama e teto | 5,53 / 5,53 / 5,53 / 5,56 | 3,00 | 5,61 / 5,61 / 5,61 / 5,63 | 3,04 |
| tampa e teto | 4,92 / 4,92 / 4,92 / 4,96 | 3,00 | 4,98 / 4,98 / 4,98 / 5,02 | 3,04 |

Os três últimos pares e a lateral com o teto não são vizinhos na mesma face:
encontram-se num canto do carro, o pé da cabine e o ombro, e o vão e o degrau
deles são de desenho nas duas versões. O degrau de 2,0 mm da porta com o
para-lama e com a lateral é num ponto só, na aba do ombro.

A menor distância em 3D entre as bordas dos dois sólidos, pelo meu script da
primeira etapa, que continua fora do repositório: no para-brisa, 4,03 mm antes
e 3,45 mm depois; no vidro traseiro, 4,02 e 3,76 mm; entre a lateral e a
soleira, 3,93 mm depois; entre a porta dianteira e o teto, 4,00 e 3,98 mm.

As imagens desta pasta foram regeneradas pelo rascunho novo, e entrou
`vaos-para-brisa-antes-depois.png`, com a borda de cima do para-brisa vista de
frente nas duas versões.

### O que o ajudante ainda não resolve ou atrapalha

1. O esboço em mm recusava as partes do ajudante, e isso foi corrigido durante
   a etapa. Fato: na primeira montagem o conversor do esboço 2.0 parou em
   "passo 443 parte.sel.onde: o filtro onde com número não é convertido para
   metro; selecione por grupo, origem ou região", porque o ajudante nomeia cada
   painel por `onde.conexo` com números. Contornei pondo o ponto e o rumo de
   cada semente no `topo` da opção e citando os dois por nome. A correção do
   conversor e do ajudante chegou às 04:27, e tirei o contorno. Enquanto o
   arquivo do ajudante era regravado, um script meu falhou com "does not
   provide an export named paineisPorVaos". Atribuição: ferramenta, resolvido;
   o arquivo em edição por outro agente é de processo. O que resolveria: nada
   mais no conversor; quem edita um módulo do núcleo com outros agentes
   rodando grava num arquivo ao lado e troca de uma vez.

2. A folga entre as paredes do corte é menor que o vão da pele onde a chapa é
   inclinada. Fato: a lâmina é estreitada para o vão da face de fora dar 4,08
   mm, mas a parede do corte continua paralela ao eixo da vista. No para-brisa,
   a 52 graus, a lâmina tem 3,22 mm (`medidas.folgaMinima`), e a menor
   distância entre o vidro e o teto é 3,45 mm; no vidro traseiro, 3,76 mm; na
   linha de lado sobre a chapa inclinada na planta, 3,93 mm. Na versão
   anterior a menor distância era 4,03 mm, com 5,07 mm na pele. O ajudante
   escolhe a pele e avisa só abaixo de metade do vão (`folgaAbaixoDe`). O
   menor caso: a caixa de chapa de 1 mm com uma face a 38 graus da vista, do
   teste dele, cortada por uma linha paralela à aresta de inclinação.
   Atribuição: núcleo. O que resolveria: a lâmina com as paredes na direção da
   normal da chapa, ou a opção de garantir o vão entre as paredes em vez do da
   pele, com as duas medidas por linha no retorno.

3. Só a face que o raio da vista vê é compensada; a face paralela à vista é
   cortada sem leitura e sem aviso. Fato: as linhas `frente` e `peDoParaBrisa`
   são desenhadas de cima e cortam também as paredes laterais, que de cima são
   uma aresta. A parede é inclinada 10 graus na planta, e o vão nela sai com
   4,13 e 4,14 mm, contra 4,08 mm no resto; com 25 graus sairia com 4,5 mm. O
   aviso `camadasInclinadas` não aparece, porque o raio nunca toca a parede. O
   menor caso: uma casca em cunha, com a face de cima a 30 graus e a de baixo
   plana, cortada por uma linha de cima sem alcance, dá de 3,53 a 4,38 mm no
   mesmo par. Atribuição: núcleo. O que resolveria: ler a normal de toda face
   que a lâmina atravessa, e não só a do raio, e dar a cada face a largura
   dela, ou avisar a face atravessada que não foi lida.

4. A linha que sai pela borda da chapa numa face inclinada alarga no fim. Fato:
   a linha do fim da porta traseira descia de y 1.000 a y 380, abaixo da borda
   da chapa em y 419. A última amostra cai fora da chapa, fica sem normal e
   com fator 1, e a lâmina é interpolada até ela: o vão entre a lateral e a
   soleira ia de 4,08 a 4,23 mm nos últimos 40 mm. Contornei partindo a linha
   em duas, acabando a de baixo meio milímetro antes da borda e alongando-a
   com `alem: 30`. O `alem` vale para as duas pontas, e eu só queria a de
   baixo; a de cima caiu sobre a outra linha por sorte. Atribuição: núcleo. O
   que resolveria: a amostra sem chapa herdar o fator da amostra válida mais
   próxima, e `alem` por ponta.

5. Um plano de corte que atravessa duas faces pede duas linhas e alcances
   calculados à mão. Fato: o pé do vidro traseiro corta a tampa e as faixas de
   cima das laterais, mas não pode cortar a parede lateral. Desenhei
   `peDoVidroTraseiro` de cima com `alcance: [998, 1001]`, três milímetros que
   pegam só a chapa de cima, e a linha de cintura de lado até z -1.315, para
   as duas se encontrarem no canto. Nada confere que duas linhas de vistas
   diferentes se encontram: se o alcance ficar curto, sobra uma ponte entre
   dois painéis, e a única notícia é o erro de duas sementes no mesmo pedaço.
   O para-lama, que dobra da faixa de cima para a parede lateral, só não deu
   esse trabalho porque os limites dele são planos inteiros. Atribuição:
   núcleo. O que resolveria: a linha dada por pontos em 3D sobre a chapa, ou o
   corte declarado como plano com as faces que ele pega, e a conferência do
   encontro de duas linhas.

6. A linha sem alcance corta tudo o que está no caminho. Fato: para uma linha
   de lado servir aos dois lados do carro deixei `contornoDasPortas` sem
   alcance. Os trechos dela na linha de cintura atravessam o carro e tiram 2
   mm do pé das paredes da frente e de trás da cabine em toda a largura; por
   isso o capô fica a 5,6 mm do teto, com 3 mm de degrau, e a tampa a 5,0 mm.
   Com alcance por lado eu duplicaria a linha, e com a linha partida em duas
   o canto entre elas não seria fechado em esquadria (item 7). Atribuição:
   núcleo. O que resolveria: `alcance` como lista de intervalos, por exemplo
   os dois lados sem o meio.

7. O canto feito por duas linhas fica com um dente. Fato, no menor caso: numa
   placa de 600 por 400 mm, duas linhas que se encontram pelas pontas em L
   deixam os dois pedaços a 2,885 mm um do outro no canto, e a mesma volta
   numa polilinha só os deixa a 4,080 mm, porque a esquadria só existe dentro
   de uma linha. O `vao:partes` dá 4,08 mm nos dois casos e não vê o dente. No
   carro evitei o caso pondo cada canto dentro de uma polilinha ou em T sobre
   outra linha. Atribuição: núcleo e ferramenta. O que resolveria: fechar em
   esquadria as pontas de linhas que coincidem, e o comando do vão medir a
   distância de canto a canto.

8. A simetria só sai de graça de lado. Fato: as linhas de lado sem alcance
   valem para os dois lados, mas 10 das 28 linhas formam cinco pares espelhados
   que o esboço escreve um a um (as do capô, dos faróis, das lanternas e dos furos), e 16
   das 23 sementes são pares do mesmo ponto visto de + e de -. Os dois lados
   saem com malhas diferentes do mesmo corte: a lateral traseira tem 131 faces
   de um lado e 136 do outro, e um contato mudou de um lado só (item 12).
   Atribuição: núcleo. O que resolveria: `espelhar: 'x'` na linha e no painel,
   com o sufixo dos nomes, e o corte feito numa metade e espelhado.

9. O furo e o arco de roda saem maiores que a linha. Fato: a linha fechada com
   `dentro: 'descarta'` tira o prisma de fora, a linha mais meio vão. Para o
   arco de raio 404 desenhei 402, e para o furo do suporte, a folga menos 2
   mm. A linha só aceita pontos: o círculo do arco é um polígono de 48 lados
   que eu gerei, e `aberturaPorContorno` aceita arco e concordância no
   contorno. O furo do suporte traseiro, que morde a borda de baixo do painel,
   dá o aviso `camadasInclinadas` nos dois lados; limitei o alcance a 25 mm,
   como o aviso manda, e ele continua. Atribuição: núcleo. O que resolveria:
   no descarte, a borda sobre a linha por padrão; o contorno de `curva2d` como
   entrada; e o aviso dizer qual camada o causou.

10. A janela dentro da porta funciona, e o vidro herda a espessura da chapa.
    Fato: a linha fechada dentro da porta deu o vidro como painel próprio de
    primeira, nos dois lados, com 4,08 mm em toda a volta. O vidro sai com 1
    mm, e na versão anterior tinha 4 mm, de uma casca própria. Para o vidro
    de outra espessura a chapa teria de ser montada outra vez e o ajudante
    chamado de novo. Cada janela custa três passos, as duas extrusões e a
    subtração do anel. Atribuição: núcleo. O que resolveria: a espessura por
    painel, engrossando o pedaço para dentro depois do corte.

11. O ajudante não devolve a seleção de cada painel nem pinta. Fato: ele
    devolve `partes` com o nome, a origem do corte e o raio. Para pintar e
    para afastar cada painel na vista explodida usei `sel: { grupo: nome }`,
    que eu só conhecia da receita da empilhadeira. Atribuição: núcleo e
    instrução. O que resolveria: `partes[i].sel` pronto e o campo `cor` no
    painel.

12. O encosto entre peças de booleanas diferentes muda de um lado do carro
    para o outro. Fato: com o corte do ajudante, o relato de contatos deu a
    caixa de roda traseira esquerda atravessando a lateral em "184,959 mm
    pelo eixo x" e a direita encostando, e depois da correção do ajudante deu
    o montante C esquerdo atravessando a porta traseira em "4,036 mm pelo eixo
    z" e o direito encostando, com a mesma geometria espelhada. Deixar o
    montante 0,0005 mm aquém da chapa não mudou o resultado. Para o modo
    estrito sair com 0 mudei o desenho: a caixa de roda entra meia espessura
    na chapa do arco, como solda, e o montante C ganhou um batente 4 mm por
    dentro da porta. Não achei a causa. Atribuição: ferramenta, a conferir no
    núcleo. O que resolveria: o relato dizer onde os dois sólidos se cruzam,
    com o ponto e o volume, e não a sobreposição das caixas.

13. O `vao:partes` dá como travessia pares que encostam e pares com vão. Fato:
    ele classifica 96 dos 211 pares como "atravessa", e o relato de contatos,
    63; o capô apoiado na parede corta-fogo é um deles. Três pares com o vão
    declarado saem como "atravessa, sem vão" com o vão medido em 4,08 mm: a
    porta dianteira direita com o teto, o teto com o para-brisa e o teto com o
    vidro traseiro. A lista muda de uma rodada para outra e de um lado para o
    outro; em rodadas anteriores entraram a porta dianteira esquerda e uma das
    vigias, ora a direita, ora a esquerda. Por isso o comando sai com 1, e o para-brisa e o vidro
    traseiro somem da lista de soltas, que fica com 11 das 13. O relato de
    contatos dá os mesmos pares como "os sólidos não se tocam". Atribuição:
    ferramenta. O que resolveria: a travessia decidida pelo sólido, como no
    relato, e não por aresta que cruza face.

14. O `vao:partes` dá 3,973 mm num ponto de quina e não mede a folga entre os
    sólidos. Fato: entre a lateral e a soleira o mínimo cai a 3,973 mm no
    ponto em que o vão sai pela borda de baixo da chapa, em y 419, com mediana
    e máximo de 4,08 mm; a lâmina tem a mesma largura ali. O comando mede o vão
    da pele e não tem coluna para a menor distância entre os dois sólidos, que
    é a que o item 2 mostra abaixo de 4 mm. O degrau aceito é um só para todos
    os pares, e os cantos de desenho do carro têm 3,0 e 10,5 mm. A parte solta
    de propósito só se declara na linha de comando, com 13 `--apoia`, e não no
    esboço. Atribuição: ferramenta. O que resolveria: a amostra de quina
    tratada à parte, a coluna da menor distância em 3D, o degrau esperado por
    par e o `apoia` lido da opção do esboço, como a `folga`.

15. A conferência de vistas conta a mesma fenda muitas vezes, e o maior
    afastamento continua nela. Fato: de lado saem 128 fendas e de cima 204; a
    fenda inclinada da vigia aparece como uma série de fendas de 27 mm por 4,9
    mm, e o anel de um vidro, como uma fenda de 11,8 por 622 mm. O maior
    afastamento do modelo segue apontando fenda: 553 mm de lado e 886 mm de
    cima. Atribuição: ferramenta. O que resolveria: juntar os pedaços da
    mesma fenda antes de contar e tirar as fendas do afastamento.

16. O interior da casca, que apara o chassi, continua montado uma vez por
    membro. Fato: o ajudante cobre os painéis, e os membros do chassi que
    encostam na lataria ainda são aparados por `intersectar` com o interior,
    montado 21 vezes. O chassi e as rodas têm 429 dos 562 passos, e por isso o
    esboço inteiro não chega a um terço. Atribuição: núcleo. O que resolveria:
    a cópia de sólido ou a booleana que guarda a fonte, do item 1 da primeira
    etapa, ou o ajudante devolver o interior da chapa como origem que vários
    cortes possam usar.

17. Uma mensagem de erro não diz qual linha falhou. Fato, no menor caso: na
    placa, a linha que para a 100 mm da borda dá "os painéis 'a' e 'b' caem no
    mesmo pedaço; mova uma das sementes para o pedaço dela, ou confira a linha
    que devia separá-los", sem dizer qual linha acaba dentro da chapa nem
    onde. As outras que provoquei ajudam: a semente no vão diz a distância
    lida antes e depois do corte, e o eixo trocado diz a ordem dos pontos
    daquela vista. Atribuição: núcleo. O que resolveria: listar as linhas
    abertas com ponta dentro da chapa quando duas sementes caem no mesmo
    pedaço.

18. `instanciaDeFamilia` resolveu a cópia de código das rodas, e sobram três
    coisas. Fato: as quatro rodas saíram por uma chamada cada, com o perfil,
    os dois parâmetros, o nome por função, a pose e o giro de 180 graus do
    lado esquerdo, e a malha ficou com as mesmas 12.382 faces; o esboço perdeu
    16 linhas. Ela emite os 16 passos `solido` da família, que a versão
    anterior tirava. A cor é por material da família (`borracha` e `aco`), e o
    rascunho pinta o aro, o disco e o cubo de cores diferentes; passei
    `materiais: false` e pintei pelas `partes` que ela devolve. As portas não
    saem em mm, e a roda é posta por número e não pelo eixo do chassi. O pneu
    da fonte e o cubo saliente continuam fora do perfil `carro` (item 13 da
    primeira etapa). Atribuição: ferramenta e família. O que resolveria: a
    lista de poses numa chamada só, a cor por parte e as portas em mm.

### O que a escolha das sementes e o tempo de autoria mostraram

As sementes não deram trabalho neste carro: as 23 foram escolhidas numa
passada, e nenhuma caiu em vão nem em pedaço errado. Elas dariam trabalho num
painel que nenhuma das três vistas vê primeiro, que este carro não tem. O tempo
de autoria da lataria nova foi de cerca de dez minutos até a primeira montagem
aceita pelo ajudante, e de mais vinte para os contornos e os ajustes de
desenho: a recusa do conversor de mm, a linha que alargava na borda, as duas
linhas mudadas de lugar e os dois contatos que mudavam de um lado para o outro.

### O que eu mudaria na interface

Depois de usá-lo num carro inteiro, pediria seis coisas. A simetria declarada
na linha e no painel, para não escrever cópias espelhadas. O alcance como
lista de intervalos e o `alem` por ponta. O corte declarado como plano, ou a
linha em 3D sobre a chapa, para o limite que atravessa duas faces. A largura
da lâmina e a folga entre as paredes devolvidas por linha, com a escolha entre
garantir o vão da pele e o das paredes. O descarte com a borda sobre a linha e
o contorno com arcos como entrada. E a seleção e a cor de cada painel no
retorno, com o interior da chapa como origem para aparar o que encosta nela.

## Terceira etapa: modo superfície e cópia no lugar

Registro de 2026-11-11, depois de o núcleo ganhar o `modo: 'superficie'` do
`paineisPorVaos`, o `arranja` com `coincidente`, a distância 3D, o degrau por
par e o `apoia` no `npm run vao:partes`, e as várias poses e a cor por parte no
`instanciaDeFamilia`. O esboço foi atualizado para usar as quatro coisas. O
"antes" desta seção é o "depois" da segunda etapa, o esboço do commit
`c3e7819c`, e as duas versões foram medidas uma depois da outra sobre o mesmo
núcleo, o do commit `030d8430`, às 18h. O núcleo foi regravado várias vezes
durante a etapa (item 16), e as medidas intermediárias, citadas nos itens com
o commit, saíram de cópias congeladas dos commits `c3e7819c` e `4c6bcf35`.

O que entrou no esboço. Das 44 linhas de vão, 36 vão no modo superfície: o
para-brisa e o vidro traseiro, as seis janelas de lado, os nove furos da frente
e de trás, as linhas do capô e da tampa, o pé do vidro traseiro, o contorno das
portas acima da cintura, a soleira e o fim da porta traseira. Oito ficam no
modo vista: os três planos de corte que atravessam o carro, as duas linhas de
cintura, a linha entre as portas e os dois arcos de roda. O interior da casca é
construído uma vez por espessura, três ao todo, e copiado no lugar para os 21
membros. As quatro rodas saem de uma chamada. Os 8 vidros, os 2 faróis, a
grade e as 2 lanternas estão em `apoia`, os 47 vãos da lataria têm o degrau
aceito no par, e 33 folgas de desenho do chassi, das rodas e dos acabamentos
têm o valor medido e a tolerância.

A resposta à pergunta da etapa: o modo superfície resolve o que o item 2 da
segunda etapa registrou, e a distância entre as paredes do corte fica entre
4,00 e 4,08 mm em todos os pares de chapa e de vidro, contra 3,45 mm no
para-brisa. Ele não é melhor em tudo, e por isso as linhas não foram todas
trocadas: a montagem ficou quatro vezes mais lenta (item 4), a linha não
atravessa sozinha a dobra viva do ombro deste carro (item 1), e os planos de
corte em modo superfície deixaram o relato de contatos com recusas (item 2).
O que o item 3 da segunda etapa registrou, o vão de 4,13 mm na parede cortada
de cima, saiu por outra via: o plano de corte desenhado de lado, em modo
vista, que dá 4,08 mm na pele e 4,02 mm entre as paredes.

Os contornos da segunda etapa. A linha partida com `alem` na borda de baixo
saiu: a linha de superfície sai pela borda em face inclinada sem alargar, com
4,02 a 4,04 mm entre a lateral e a soleira, que tinham de 3,97 a 4,08. O alcance de 3
mm do pé do vidro traseiro saiu: a linha é de cima, em modo superfície, com o
alcance da face de cima. A linha da frente continua em z 1.990: em z 2.000,
sobre a quina da planta, o vão entre o painel dianteiro e o para-lama mede de
3,76 a 4,14 mm, com 3,87 mm entre os sólidos e degrau de 1,21 mm de um lado e
1,14 do outro, porque as duas bordas ficam em faces 8 graus diferentes. A
linha da porta traseira continua em z -760: em z -777 os números passam (de
4,01 a 4,17 mm, 4,01 entre os sólidos), mas a lateral acaba numa ponta de 3,8
mm entre a linha e o arco, que nenhuma medida acusa. O batente do montante C,
a solda da caixa de roda e o encosto meio micrômetro aquém da chapa
continuam, e esta etapa acrescentou cinco contornos, que estão nos itens 1,
2, 5 e 6.

| medida | antes | depois |
|---|---|---|
| passos do esboço | 562 | 428 (76%) |
| passos da lataria (painéis, vidros e acabamentos) | 133 | 140 |
| passos do chassi e das rodas | 429 | 288 (67%) |
| passos por operação | extrusão 167, parte 83, pincel 83, interseção 68, cubo 38, união 32, lathe 20, sólido 16, translação 16, liso 16, subtração 11, rotação 8, arranja 4 | parte 83, pincel 83, extrusão 52, cubo 38, subdivisão 36, interseção 32, lathe 20, sólido 16, translação 16, liso 16, união 14, rotação 8, arranja 7, subtração 6, limparLascas 1 |
| vezes que o interior da casca é montado | 21 | 3, com 18 cópias no lugar |
| chamadas da família de roda | 4 | 1 |
| linhas de vão | 28 | 44, 36 em modo superfície e 8 em modo vista |
| linhas do esboço | 535 | 641 |
| carga do módulo | 2,7 s | 19,9 s |
| montagem da opção | 2,4 a 2,6 s | 8,9 a 9,5 s |
| `esboco:nucleo --so-montar --estrito` | 6,9 s | 36,0 s |
| `vao:partes` | 12,9 s | 42,3 s |
| execuções do ajudante ao carregar | 2 | 3 |
| faces da malha | 12.382 | 16.060 |
| faces finas do corte | não contadas | 215 antes de `limparLascas` e 91 depois |
| modo estrito | sai com 0; 64 encostam, 63 atravessam | sai com 0; 64 encostam, 63 atravessam |
| pares Dir e Esq com relação diferente | 0 | 0 |
| partes com malha diferente entre os lados | 12 | 12 |
| partes soltas | 13, sem declaração | 13, todas em `apoia` |
| `vao:partes --esperado=4 --tolerancia=0.2 --folga3d=3.8 --soltas=recusar` | sai com 1: 32 de 209 pares fora, 13 soltas sem apoio | sai com 1: 11 de 209 pares fora, todos pela distância 3D em pares do chassi e das rodas com folga declarada abaixo de 3,8 mm (item 10) |
| o mesmo sem `--folga3d` | sai com 1 | sai com 0 |
| o mesmo com `--folga3d=3.8` e `--partes` da lataria e dos vidros | sai com 1 | sai com 0, 47 pares |
| conferência de lado | 92,8%, sobra 0,1%, falta 7,1%, 128 fendas | 92,8%, sobra 0,1%, falta 7,1%, 142 fendas |
| conferência de cima | 98,2%, sobra 0,4%, falta 1,5%, 204 fendas | 98,2%, sobra 0,4%, falta 1,5%, 220 fendas |
| conferência de frente | 97,5%, sobra 0,3%, falta 2,2%, 8 fendas | 97,5%, sobra 0,3%, falta 2,2%, 8 fendas |

Os tempos dependem da carga da máquina, que outros agentes dividiam: sobre a
cópia do commit `4c6bcf35`, às 14h, a carga foi de 3,8 e 17,7 s e a montagem
de 3,5 e 11,0 s. As 12 partes com malha diferente entre os lados são as mesmas
nas duas versões, e a diferença cresceu nos painéis: a lateral traseira tem
240 faces de um lado e 253 do outro, e tinha 133 e 137.

O vão da pele em cada par, em mm, como mínimo, mediana, percentil 90 e máximo,
a menor distância 3D entre os dois sólidos e o maior degrau, por `npm run
vao:partes`. Os pares do lado esquerdo repetem os do direito, salvo onde dito.

| par | antes: vão | antes: 3D | antes: degrau | depois: vão | depois: 3D | depois: degrau |
|---|---|---:|---:|---|---:|---:|
| capô e para-lama | 4,08 / 4,08 / 4,08 / 4,08 | 4,08 | 0,00 | 4,02 / 4,02 / 4,02 / 4,02 | 4,02 | 0,00 |
| capô e painel dianteiro | 4,08 / 4,08 / 4,08 / 4,08 | 4,05 | 0,00 | 4,11 / 4,11 / 4,11 / 4,11 | 4,08 | 0,00 |
| para-lama e painel dianteiro | 4,04 / 4,13 / 4,13 / 4,13 (esquerdo: 4,02 a 4,13) | 4,05 | 0,62 | 4,01 / 4,08 / 4,11 / 4,11 | 4,02 | 0,57 |
| para-lama e porta dianteira | 4,04 / 4,14 / 4,14 / 4,15 | 4,08 | 2,04 | 4,00 / 4,08 / 4,08 / 4,10 | 4,02 | 2,04 |
| para-lama e soleira | 4,09 / 4,14 / 4,14 / 4,14 | 4,08 | 0,00 | 4,08 / 4,10 / 4,13 / 4,15 | 4,02 | 0,00 |
| porta dianteira e porta traseira | 4,08 / 4,08 / 4,08 / 4,08 | 4,08 | 0,00 | 4,08 / 4,08 / 4,08 / 4,08 | 4,08 | 0,00 |
| porta dianteira e soleira | 4,08 / 4,08 / 4,08 / 4,08 | 4,08 | 0,00 | 4,02 / 4,02 / 4,02 / 4,11 | 4,02 | 0,00 |
| porta traseira e soleira | 4,08 / 4,08 / 4,08 / 4,09 | 4,08 | 0,00 | 4,02 / 4,02 / 4,02 / 4,02 | 4,02 | 0,00 |
| porta traseira e lateral traseira | 4,03 / 4,08 / 4,08 / 4,18 | 3,93 | 2,04 | 4,01 / 4,03 / 4,04 / 4,14 | 4,01 | 2,04 |
| lateral traseira e soleira | 3,97 / 4,08 / 4,08 / 4,08 | 3,93 | 0,00 | 4,02 / 4,04 / 4,04 / 4,04 | 4,02 | 0,00 |
| lateral traseira e tampa | 4,08 / 4,08 / 4,08 / 4,08 | 4,08 | 0,00 | 4,02 / 4,02 / 4,02 / 4,02 | 4,02 | 0,00 |
| lateral traseira e painel traseiro | 4,08 / 4,08 / 4,08 / 4,09 | 4,08 | 0,00 | 4,08 / 4,08 / 4,08 / 4,09 | 4,08 | 0,00 |
| tampa e painel traseiro | 4,08 / 4,08 / 4,08 / 4,08 | 4,08 | 0,00 | 4,08 / 4,08 / 4,08 / 4,08 | 4,08 | 0,00 |
| porta dianteira e teto | 4,08 / 4,08 / 4,08 / 4,12 | 3,98 | 0,00 | 4,02 / 4,02 / 4,02 / 4,02 | 4,02 | 0,00 |
| porta traseira e teto | 4,08 / 4,08 / 4,08 / 4,08 | 3,98 | 0,00 | 4,01 / 4,02 / 4,02 / 4,08 (esquerdo: 4,02 a 4,11) | 4,01 | 0,00 |
| lateral traseira e teto | 4,08 / 4,08 / 4,08 / 4,08 | 5,38 | 10,47 | 4,08 / 4,08 / 4,08 / 4,08 | 5,35 | 10,47 |
| vidro e porta dianteira | 4,08 / 4,08 / 4,08 / 4,08 | 3,98 | 0,00 | 4,02 / 4,02 / 4,02 / 4,02 | 4,02 | 0,00 |
| vidro e porta traseira | 4,08 / 4,08 / 4,08 / 4,08 | 3,98 | 0,00 | 4,02 / 4,02 / 4,02 / 4,02 | 4,02 | 0,00 |
| vigia e teto | 4,08 / 4,08 / 4,08 / 4,08 | 3,98 | 0,00 | 4,02 / 4,02 / 4,02 / 4,02 | 4,02 | 0,00 |
| para-brisa e teto | 4,08 / 4,08 / 4,08 / 4,10 | 3,45 | 0,00 | 4,01 / 4,04 / 4,06 / 4,10 | 4,00 | 0,00 |
| vidro traseiro e teto | 4,08 / 4,08 / 4,08 / 4,09 | 3,75 | 0,00 | 4,01 / 4,03 / 4,03 / 4,05 | 4,00 | 0,00 |
| capô e teto | 5,61 / 5,61 / 5,61 / 5,64 | 5,96 | 3,04 | 5,61 / 5,61 / 5,61 / 5,64 | 5,96 | 3,04 |
| para-lama e teto | 5,61 / 5,61 / 5,61 / 5,63 | 5,96 | 3,04 | 5,61 / 5,61 / 5,61 / 5,63 | 5,96 | 3,04 |
| tampa e teto | 4,98 / 4,98 / 4,98 / 5,02 | 5,38 | 3,04 | 4,95 / 4,95 / 4,95 / 4,98 | 5,36 | 3,04 |
| farol e painel dianteiro | 4,04 / 4,04 / 4,04 / 4,18 | 4,04 | 4,00 | 4,01 / 4,01 / 4,01 / 4,15 | 4,01 | 4,00 |
| grade e painel dianteiro | 4,04 / 4,04 / 4,04 / 4,04 | 4,04 | 0,00 | 4,01 / 4,01 / 4,01 / 4,01 | 4,01 | 0,00 |
| lanterna e painel traseiro | 4,04 / 4,04 / 4,04 / 4,18 | 4,04 | 4,00 | 4,01 / 4,01 / 4,01 / 4,16 | 4,01 | 4,00 |

Os onze pares que o comando pedido deixa fora são o montante C com a porta
traseira, dos dois lados (3,00 mm entre os sólidos, com 4,5 mm de vão
declarado), o anteparo com cada longarina, o assoalho com cada montante C e a
travessa central com o túnel (2,00 mm, a espessura do assoalho ou a folga ao
lado dele) e o disco com o pneu das quatro rodas (2,18 mm, da família).

### O que as novidades ainda não resolvem ou atrapalham

1. A linha de superfície não atravessa sozinha a dobra viva do ombro. Fato, em
   quatro partes. A parede do corpo tem três faces de cima para baixo, a faixa
   de cima, a faixa inclinada do ombro, a 38 graus, e a parede da planta. Com
   a linha de dois pontos, no núcleo do commit `c3e7819c`, as estações a cada
   40 mm pularam a faixa do ombro, que tem 17,5 mm de altura em z 1.990; as
   duas estações vizinhas, em y 909 e y 871, tinham normais a 4,35 graus uma
   da outra, abaixo dos 8 que pedem a bipartição, e a lâmina foi de uma à
   outra em linha reta, por fora da chapa. O para-lama ficou preso ao painel
   dianteiro por uma ponte, sem aviso, e a única notícia foi "os painéis
   'painelDianteiro' e 'paraLamaDir' caem no mesmo pedaço". Com `amostragem:
   20` a linha cortou e a carga do módulo foi a 78 s; com 10, passou de 5
   minutos. Com um ponto da linha em cada face, a dobra é achada e a lâmina se
   parte nela, e cada linha sozinha corta; duas juntas são recusadas pelo
   núcleo, no commit `c3e7819c`, com "o resultado sairia aberto ou
   não-manifold: 2 aresta(s) dirigida(s) sem par": o fim do para-lama com o
   arco de roda, a parede de trás com a linha de cima dela, e o fim do
   para-lama com o fim da porta traseira, que ficam a 1.450 mm um do outro. No
   commit `4c6bcf35` a mesma recusa aparece com as linhas de um plano só, e
   com o fim da porta traseira ela vem como "face(s) degenerada(s)" depois da
   correção de largura. O que funcionou foi
   partir a linha à mão em três, uma por face, com as pontas junto de cada
   dobra, para o ajudante emendá-las. A distância da ponta à dobra foi
   escolhida por tentativa: com 0,5 mm a emenda deixa no lado esquerdo um
   dente que o `vao:partes` lê como vão de 0,22 mm e degrau de 4,02 mm numa
   amostra; com 0,1, 0,25 e 0,375 mm o relato de contatos dá o anteparo
   atravessando a lateral esquerda, a 600 mm da linha; com 0,75 mm os dois
   passam. A linha continuada de uma vista a outra (`linhas[i].vistas`), que
   chegou durante a etapa, foi testada no núcleo do commit `030d8430`: o fim
   da porta traseira numa linha só é recusado com a mesma mensagem, o plano
   da frente e o de trás são aceitos e não separam os painéis, e o fim do
   para-lama é recusado "depois de corrigir a largura da lâmina para 8,04
   mm". O menor caso: uma chapa com um degrau em Z de 17 mm de altura e 14 mm
   de recuo, cortada por uma linha que o atravessa, mais uma segunda linha em
   qualquer lugar. Atribuição: núcleo. O que resolveria: bipartir o trecho
   também pela flecha, a distância do ponto lido no meio à corda entre as
   duas estações; a booleana aceitar as duas lâminas que se encontram na
   dobra; e a chapa com chanfro de 38 graus e degrau entre os testes do
   ajudante.

2. O plano de corte que atravessa o carro custa sete linhas em modo superfície
   e sai pior que uma linha em modo vista. Fato: a frente, a traseira e o fim
   do capô e do para-lama são planos que cortam a face de cima e as duas
   paredes. Em modo superfície cada um é uma linha de cima e três de lado por
   parede, pelo item 1. Com os três planos assim (`SEDAN_PLANOS=superficie`
   no esboço), no núcleo do commit `4c6bcf35`, o esboço monta com 445 passos e
   carrega em 35 a 43 s, a primeira folga medida fica abaixo do vão e o
   ajudante alarga todas as lâminas de superfície para 4,09 mm, e o modo
   estrito recusa: com as pontas a 0,5 mm da dobra, 17 recusas em 11 pares,
   nove deles porque o para-lama esquerdo sai como "sólido inconclusivo" (a
   malha dele é fechada, com uma face de área zero), mais a porta dianteira
   direita atravessando o montante A e o vidro traseiro atravessando o teto;
   com as pontas a 0,75 mm, só o vidro traseiro com o teto. O mesmo plano desenhado de lado, em modo vista, de cima da
   face de cima até abaixo da borda, é uma linha, corta os dois lados e a
   face de cima, e a lâmina é compensada pela parede inclinada na planta:
   4,08 mm na pele e 4,02 entre as paredes, com o modo estrito em 0. A segunda
   etapa tinha desenhado esses planos de cima, e por isso media 4,13 mm na
   parede. Atribuição: núcleo e instrução. O que resolveria: o guia dizer que
   o plano que atravessa o corpo se desenha na vista em que as paredes
   aparecem de frente, em modo vista, e a linha por `vistas` cortar a dobra
   viva.

3. A correção da largura pela folga medida vale para todas as lâminas de
   superfície, venha a folga de onde vier. Fato, no núcleo do commit
   `4c6bcf35`: o ajudante mede a menor distância 3D entre quaisquer dois
   pedaços e, se ela fica abaixo do vão, multiplica a largura das lâminas de
   superfície e corta de novo, até três vezes. Com só o pé do vidro traseiro
   em modo superfície e o para-brisa ainda em modo vista, com 3,45 mm entre
   as paredes, a lâmina de superfície saiu com 6,46 mm depois de três
   correções e cinco execuções, e os 3,45 mm continuaram. Com o canto do
   item 6 a 3,27 mm, as lâminas foram a 7,58 mm e a carga a 83 s, com o aviso
   `folgaAbaixoDoVao` dizendo "a chapa curva demais junto da linha", numa
   chapa plana. Por isso, num esboço que mistura os modos, toda linha em modo
   vista precisa dar pelo menos o vão entre as paredes, e foi o que levou o
   contorno das portas e as janelas de lado para o modo superfície: na
   parede da cabine, inclinada 12,9 graus, o modo vista dá 3,98 mm.
   Atribuição: núcleo. O que resolveria: medir a folga por linha, entre os
   pedaços que aquela lâmina separa, e corrigir só a largura dela; não
   corrigir pela folga de uma linha em modo vista; e o aviso trazer o ponto e
   os dois painéis.

4. O corte com lâminas de superfície é dez vezes mais lento. Fato, com
   `medirTempo`: com 57 lâminas de superfície, de 4.844 vértices e 6.764
   faces, o `subtrair` do corte leva de 10 a 14 s por execução e a medida da
   folga, de 4 a 5 s; o esboço todo em modo vista carrega em 2,7 s. Trocar os
   furos, a soleira e as linhas do capô de volta para o modo vista, ficando
   com 42 lâminas, não baixou o tempo, numa medida feita com outra montagem
   em paralelo. No esboço final, com 36 lâminas, a
   carga do módulo foi de 2,7 para 19,9 s, a montagem de 2,5 para 9,2 s, o
   modo estrito de 6,9 para 36 s e o `vao:partes` de 12,9 para 42 s; a
   conferência das três vistas levou 48 s e tinha levado 22. A opção
   `conferir: false`, que chegou durante a etapa, não foi medida. Atribuição:
   núcleo. O que resolveria: a lâmina sobre face plana com uma estação por
   trecho reto, e saber por que o `subtrair` com ferramentas de triângulos
   custa tanto.

5. A linha em U é recusada no modo superfície. Fato, no menor caso: numa placa
   de 600 por 400 mm, a linha de quatro pontos em U com 200 mm de boca é
   aceita em modo vista e recusada em modo superfície, com "volta sobre si
   mesma sobre a chapa" no commit `c3e7819c` e "a lâmina da linha se cruza
   (canto muito fechado ou pontos muito juntos)" no `030d8430`. No primeiro
   commit a linha em L também saía com a ponta de início enviesada a 45 graus
   e 1,4 vez mais larga, porque a primeira estação da linha aberta tomava a
   direção do último trecho; isso foi corrigido no segundo. No carro a tampa
   do porta-malas, que era um U, virou duas retas em T sobre o pé do vidro
   traseiro, e o contorno das portas acima da cintura virou três linhas por
   lado. Atribuição: núcleo. O que resolveria: a linha aberta não fechar a
   volta entre a última e a primeira estação.

6. O canto entre uma linha em modo vista e uma em modo superfície não é
   fechado nem conferido. Fato: a linha de cintura, em modo vista, encontra a
   linha da coluna A, em modo superfície, no pé da coluna. Com as duas
   acabando no mesmo ponto, a porta dianteira ficou a 3,27 mm do teto nesse
   canto, e a notícia foi a largura de todas as lâminas ir a 7,58 mm (item
   3). O `vao:partes` achou o ponto, em x 849, y 1.001, z 612. Contornei
   levando a linha de cintura um vão além da linha da coluna A e até a borda
   de fora do vão da coluna C. Atribuição: núcleo. O que resolveria: a emenda
   de pontas valer entre os dois modos, ou a recusa dizer as duas linhas e o
   ponto.

7. O degrau de 10 mm da cintura só se corta em modo vista, e o item 6 da
   segunda etapa continua. Fato: a vista de lado vê o degrau de perfil, e a
   linha que o atravessa, como a que separa as duas portas, pediria em modo
   superfície uma linha em cada parede e uma de cima sobre o degrau. As duas
   linhas de cintura e a linha entre as portas ficaram em modo vista, sem
   alcance, e a de cintura continua tirando 2 mm do pé do para-brisa e do
   vidro traseiro em toda a largura: o capô segue a 5,6 mm do teto, com 3 mm
   de degrau, e a tampa a 5,0 mm. Atribuição: núcleo. O que resolveria: o
   `alcance` como lista de intervalos, pedido na segunda etapa, ou a linha
   por `vistas` com um trecho de cima sobre o degrau.

8. O furo em modo superfície sobre a dobra tem a documentação e o núcleo em
   desacordo. Fato: `operacoes-procedurais.md` diz que o modo superfície
   recusa o furo com `descarta` que atravessa dobra viva. No núcleo do commit
   `030d8430` o arco de roda dianteiro, que cruza a quina de 15,7 graus da
   planta, foi aceito como furo de superfície sem mensagem; não medi o
   resultado. Os dois arcos ficaram em modo vista, em que uma linha corta os
   dois lados. Atribuição: instrução, a conferir no núcleo. O que resolveria:
   o teste do furo sobre a dobra viva e o texto de acordo com ele.

9. A linha de superfície vale para um lado do carro, e a simetria continua
   por conta do esboço. Fato: 14 linhas de lado são escritas duas vezes, com
   `lado: '+'` e `lado: '-'`, por uma função do esboço, e as 16 sementes de
   lado continuam em pares. As linhas de vão foram de 28 para 44. Atribuição:
   núcleo. O que resolveria: `espelhar: 'x'` na linha e no painel, pedido no
   item 8 da segunda etapa.

10. A distância 3D mínima do `vao:partes` é uma só para todos os pares. Fato:
    `--folga3d=3.8` vale também para o par com `folga` declarada, e reprova
    os onze pares do chassi e das rodas cuja folga de desenho é menor que
    isso, com o vão dentro do declarado. O comando pedido não sai com 0 com
    o rascunho certo; sem `--folga3d`, ou com ele e só a lataria, sai.
    Atribuição: ferramenta. O que resolveria: a distância 3D mínima no
    `folga` do par, ou a geral valer só para o par sem folga declarada.

11. O degrau é conferido pela maior amostra. Fato: o vão tem o percentil 5 e o
    95 e a marca de mínimo isolado, e o degrau reprova o par pelo máximo. Uma
    amostra na emenda do item 1 reprovou a lateral traseira esquerda com a
    porta, com degrau de 4,02 mm, e a direita, de mesma geometria, passou
    com 2,04 mm. Atribuição: ferramenta. O que resolveria: o degrau pelo
    percentil 95, com o máximo isolado marcado como no vão.

12. O relato de contatos muda com a malha, e não com a geometria. Fato: mudar
    de 0,75 para 0,25 mm a distância da ponta de uma linha em z -760 fez o
    anteparo, em z -1.350, passar de "encosta" a "atravessa" na lateral
    esquerda, com a direita em "encosta". O "sólido inconclusivo" do item 2
    saiu de uma malha fechada. É o item 12 da segunda etapa, que continua, e
    o encosto meio micrômetro aquém da chapa não o evita. Atribuição:
    ferramenta. O que resolveria: o relato dizer o ponto e o volume da
    travessia, e o sólido fechado com face de área zero não sair como
    inconclusivo.

13. O corte de superfície deixa mais faces finas e mais faces. Fato: a malha
    foi de 12.382 para 16.060 faces, a lateral traseira de 133 para 240, e o
    ajudante conta 215 faces finas depois do corte, das quais `limparLascas`,
    que chegou durante a etapa e fica ligada por padrão, tira 124 e deixa 91.
    A normal alisada que orienta a parede da lâmina sai inclinada numa face
    plana perto de uma quina: 7,9 graus na faixa de cima da parede, a 46 mm
    da quina da frente. É a causa provável de a primeira folga medida do
    item 2 ficar perto de 3,97 mm e pedir uma correção de largura; não a
    isolei. Atribuição: núcleo. O que resolveria: a normal da face tocada
    quando ela é plana, e a lâmina com as faces que a chapa pede.

14. A cópia no lugar funciona, e o esboço ainda administra os usos. Fato: o
    interior da casca passou de 21 montagens a 3, uma por espessura, com 18
    cópias; o chassi e as rodas foram de 429 para 288 passos, com a mesma
    malha em cada membro. O `total` do `arranja` precisa do número de usos,
    que só se conhece depois de escrever o chassi, e o esboço guarda os
    passos do interior, conta os usos e os insere no começo, em 21 linhas. Os
    `origemId` fora de ordem foram aceitos. O aviso `copiaNoLugarSemUso`,
    que chegou durante a etapa, não apareceu. Atribuição: núcleo. O que
    resolveria: a booleana com a opção de manter a ferramenta, ou o
    `paineisPorVaos` devolver o interior da chapa como origem de vários
    cortes, pedido no item 16 da segunda etapa.

15. As quatro rodas numa chamada e a cor por parte funcionam. Fato: uma
    chamada com quatro poses e `cores` por nome de parte da família deu as
    mesmas 16 partes e os mesmos passos, e a função das rodas foi de 18 para
    14 linhas. Sobra
    o que é da família: o disco fica a 2,18 mm do pneu, que o `vao:partes`
    lista como folga, e o perfil `carro` continua sem o pneu de 728 mm e o
    cubo saliente. Atribuição: família.

16. O núcleo, o esboço e a pasta de rascunho mudaram sob a medição. Fato:
    entre 12h45 e 14h18 o `paineis-por-vaos.js` e o
    `lamina-sobre-a-superficie.js` foram regravados por outro agente em pelo
    menos seis momentos, e a mesma chamada deu, em sequência, recusa do
    núcleo, uma conferência nova ("passa a 0 mm dela mesma"), recusa "depois
    de corrigir a largura da lâmina" e ponte entre painéis. Passei a medir
    sobre cópias de um commit tiradas por `git archive`. O esboço, ainda sem
    montar e com interruptores de teste, foi levado por onze commits de
    outros agentes, do `679c4956` ao `0535e929`, o que repete o item 23 da
    primeira etapa. A pasta de rascunho da sessão é
    dividida pelos agentes despachados, e um `tempo.mjs` meu foi
    sobrescrito por um de mesmo nome. Atribuição: instrução. O que
    resolveria: o agente que mede receber o commit sobre o qual medir e uma
    subpasta de rascunho própria, e o commit de trabalho em curso citar os
    caminhos de quem o faz.

### O que o tempo de autoria mostrou

A troca do interior, das rodas e das declarações levou cerca de vinte minutos
e funcionou na primeira montagem. A troca das linhas levou perto de duas
horas, quase todas nos itens 1, 2, 3 e 6: achar por que o corte era recusado
ou não separava pediu tirar uma linha por vez, a 20 s por tentativa, porque
nenhuma das mensagens diz a linha nem o ponto. As declarações de folga e de
degrau pediram duas rodadas do `vao:partes`, a 45 s cada.

### O que eu mudaria depois desta etapa

No ajudante, a ordem seria: a bipartição pela flecha e a booleana das lâminas
na dobra viva, que são o que impede a linha de superfície de cruzar faces
neste carro; a correção de largura por linha; a mensagem de recusa com a linha
e o ponto; e a simetria. No `vao:partes`, a distância 3D mínima por par e o
degrau pelo percentil. Na instrução, um quadro de qual vista e qual modo
servem a cada linha de um carro facetado: de lado em modo vista o plano que
atravessa o corpo e a linha sobre um degrau, e em modo superfície a linha
fechada numa face inclinada e a linha que desce uma parede.

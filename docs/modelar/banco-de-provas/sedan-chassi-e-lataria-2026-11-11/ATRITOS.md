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
subdivisão cortada em quatro painéis.

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

Em ordem de importância.

Primeiro, a operação que parte uma chapa de carroceria em painéis por linhas de
vão, com o vão medido sobre a superfície e o corte pela normal (itens 1, 2, 3 e
16). Na carroceria facetada a falta só encarece: o contorno por booleanas
funciona e custa 23 montagens da casca e 1.171 passos. Na chapa inclinada ou
curva ela impede o vão constante.

Segundo, a medida do vão e do degrau entre painéis vizinhos e a da parte solta
(itens 5 e 18). A falta impede cobrar o critério por gate: hoje o vão de um
vidro na porta sai sem número, e o que afirmei veio de um script meu.

Terceiro, a carroceria lisa de qualidade pelas vistas (item 4). A falta
encarece muito: a chapa lisa existe e se deixa cortar, mas a que as três vistas
dão ondula, e o caminho por estações ou por rede é o trabalho de várias rodadas
que o guia descreve para uma chapa só.

Quarto, a referência de carro com linhas de painel, vista de trás e corte do
chassi (item 6). A falta impede a fidelidade: toda divisão de painel e todo o
chassi deste rascunho são proposta, sem medida.

Quinto, a instrução e os critérios de veículo em chassi e lataria (item 17). A
falta encarece: a técnica de aparar o chassi pelo interior da casca e a ordem
dos painéis tiveram de ser inventadas, e nenhuma regra de família fala de vão,
apoio ou dobradiça.

Sexto, o lugar da superfície comum no fluxo do objeto e o estado do alinhamento
proposto por agente (itens 7, 8, 9 e 10). A falta encarece a etapa de receitas,
porque quinze painéis não são quinze receitas independentes.

Sétimo, a borda de chapa real, com aba, painel interno e apoio de vidro (item
22), e a casca com faces abertas como operação (itens 14 e 15). A falta
encarece e limita a aparência: de perto o painel é uma lâmina de corte reto.

Oitavo, uma família de chassi ou de plataforma (item 17). A falta encarece: as
34 partes do chassi são caixas e perfis escritos à mão, sem parâmetro de
entre-eixos, bitola ou altura do assoalho.

Nono, a roda de carro na proporção da referência e a instância de família no
esboço (item 13). A falta só incomoda.

Décimo, a imagem ampliada, o subconjunto de partes e a vista explodida (item
20), a sobra e a falta na conferência (itens 11 e 12), o aviso de fenda (item
19) e o alcance do `npm run capacidade` (item 21). A falta só incomoda.

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

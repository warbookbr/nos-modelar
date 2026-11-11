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

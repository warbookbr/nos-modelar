# Divisão por contorno: fatia 1, a operação e as provas na chapa de teste

Registro da fatia 1 do plano [divisão por contorno](../../planos/2026-11-18-divisao-por-contorno.md), medida em 2026-11-19. A prova no carro é da fatia 2 e não foi feita aqui.

## O que entrou

A operação `divisaoPorContorno` (`procedural/nucleo/operacoes/divisao-por-contorno.js`) divide uma chapa pelo contorno desenhado numa vista: as faces que o contorno atravessa são cortadas na curva e a região de dentro recebe o nome e o material da parte nova, sem sair da peça. Os argumentos são `chapa`, `vista`, `contorno` e `nome`, obrigatórios, e `material`, `substituir`, `sentido`, `encaixe`, `segmentosArco` e `segmentosSpline`. Ela está no registro com schema e exemplo que roda, e a conta sem efeito na malha é a função exportada `dividirMalhaPorContorno`.

## Por que o corte é próprio

O corte da `aberturaPorContorno` é a booleana de um prisma contra um sólido fechado. Ele tira a região de dentro e fecha o vão com uma parede nova, de modo que a área somada muda, e a função que o faz (`cortar`) não é exportada. Dividir sem tirar pede a mesma pele com arestas novas sobre ela. O plano previa esse caso em "Riscos e parada" e a extensão está escrita lá. Da abertura a operação importa, sem mudá-la, o quadro da vista (`quadroDaVista`) e a retirada do vértice de valência dois (`tirarValenciaDois`).

O corte traça o contorno sobre os triângulos que o adaptador desenha em cada face (`triangularFace`), que são a superfície dela. Cada aresta cruzada ganha um vértice no cruzamento, usado pelas duas faces da aresta, e cada canto do contorno ganha um vértice no plano do triângulo em que cai. Cada triângulo é dividido pelos trechos que passam por ele, e os pedaços côncavos se partem em convexos pela triangulação cujo pior triângulo é o melhor possível. O lado de cada pedaço sai do sentido do contorno, e as faces inteiras de dentro são alcançadas a partir dos pedaços de dentro sem atravessar a borda nova; se essa busca alcança um pedaço de fora, a operação recusa.

O encaixe (padrão 0,05) faz o cruzamento a menos dessa fração da aresta de uma ponta usar o vértice da ponta, e o canto do contorno a menos disso de um vértice ou de uma aresta do triângulo ir para cima dele. A borda se afasta da curva no máximo essa fração da maior aresta do triângulo de antes por onde passa (a diagonal, nas faces quadradas), salvo na ponta aparada de um bico mais estreito que o encaixe, e nenhum vértice de antes se move.

## A chapa de teste

A chapa por grade de `tools/fixtures/aberturas-em-teste/chapas.js`: 400 por 400 mm, de dupla curvatura (altura de 30 mm vezes sen(x/150) vezes cos(z/180)), com 2 mm de espessura e dois níveis de subdivisão, 880 faces de 20 mm. O contorno, na vista `y`, tem dois cantos vivos e dois arredondados, de raios 40 e 60 mm, com 16 segmentos por quarto de arco.

## As medidas

Saída de `npx vitest run procedural/nucleo/operacoes/divisao-por-contorno.test.mjs` (24 testes, 9 s):

| Prova | Medida |
|---|---|
| Área somada igual | chapa antes 325627,306428 mm², depois 325627,306428 mm², diferença relativa 1,4e-15 |
| Área da parte | 70738,884 mm² na parte e 254888,423 mm² no resto; vista do eixo, a parte tem 70083,5 mm² contra 70127,9 mm² do contorno nas duas peles (0,063 % a menos) |
| Aresta livre nova | nenhuma: zero reprovas de `analisarTopologia` (casca aberta, aresta não manifold, vértice em aresta, dobra, triângulo degenerado), antes e depois |
| Face fina | menor área / maior aresta² 0,0280, contra o limite 0,003 de `LIMITE_DE_FACE_FINA` (`procedural/nucleo/topologia.js`); a chapa antes tinha 0,0981 |
| Borda sobre a curva | 200 arestas de borda; a borda a no máximo 0,883 mm da curva (o contorno com 256 segmentos por quarto de arco) e a curva a no máximo 0,581 mm da borda; o limite do encaixe é 1,41 mm, 5 % da diagonal de 28,3 mm |
| Superfície igual | os 882 vértices de antes na mesma posição, bit a bit; 800 faces com os mesmos cantos e 80 cortadas; 194 vértices novos a no máximo 9,9e-18 m da superfície de antes, e o centro de cada triângulo das faces cortadas a no máximo 1,1e-17 m |
| Malha | 880 faces antes e 1147 depois, 288 na parte; 882 vértices antes e 1076 depois |
| Determinismo | a mesma receita dá a mesma malha, e o contorno desenhado no sentido contrário dá a mesma malha |

Com `encaixe: 0.02` a borda fica a menos de 0,5 mm da curva na mesma chapa.

## A bateria de posições

O contorno deslocado de 0,37 mm em x e 0,61 mm em z a cada passo, em 60 posições, com 4, 16 e 64 segmentos por quarto de arco, são 180 divisões por valor de encaixe (medido por script fora do repositório; o teste trava 20 posições, 60 divisões).

| Encaixe | Recusas | Reprovas de topologia | Menor área / maior aresta² |
|---|---|---|---|
| 0,05 | 0 de 180 | 0 | 0,0047 |
| 0,02 | 0 de 180 | 0 | 0,0032 |
| 0 | 122 de 180, todas por pedaço fino | 0 | não se aplica |

Antes do encaixe de canto em aresta e da triangulação de melhor pior triângulo, o encaixe 0,05 recusava 60 das 180 por pedaço fino. O leque de orelhas deixava um triângulo quase alinhado com um vértice distante, e o canto do contorno a centésimos de milímetro de uma aresta deixava uma tira entre a borda e a aresta. Sem encaixe a operação recusa com a medida, como o plano pede, em vez de entregar a lasca.

Numa chapa de 13120 faces (quatro níveis) a divisão leva 0,33 s e sai sem reprova.

## A revisão adversarial de 2026-11-19

A revisão bloqueou a primeira versão com dez ataques, e as correções estão no mesmo arquivo da operação, cada uma com teste de regressão.

O contorno de cotas redondas passa exatamente por vértices e arestas da malha, e a operação recusava como borda que não fechou: 29 de 40 contornos de cotas múltiplas de 10 mm, o retângulo exato sobre as linhas e o losango pelos vértices. O sinal zero era decidido caso a caso e as respostas não cabiam juntas. Agora os dois predicados do traço decidem o zero como se a malha estivesse deslocada de uma distância menor que qualquer outra, sem mudar coordenada, o cruzamento que cai sobre um vértice usa o vértice, e as passagens que caem no mesmo lugar do contorno são ordenadas para alternar entrar e sair. Os 40 contornos dividem, sem reprova de topologia nem face fina e com a área somada igual a 1e-12, e o retângulo exato na chapa plana não cria face nem vértice (72 faces na parte).

O canto do contorno exatamente sobre a diagonal de triangulação de uma face criava dois vértices no mesmo ponto e um triângulo degenerado, sem recusa. O canto sobre uma aresta passou a ser um vértice só para os dois lados que chegam a ele, e o teste confere que nenhum par de vértices ocupa o mesmo ponto.

Os pedaços novos não entravam nas listas de faces da origem da subdivisão, e a seleção `{ origem: { op: 'subdivisao', id: 1, parte: 'externa' } }` perdia 168 de 1048 faces depois da divisão. Os pedaços agora entram em toda lista de faces de origem que cita a face cortada (`faces`, as peles e os grupos da subdivisão, a parede e a lente da abertura, as do friso e a costura da booleana). No teste, as três peles somam as 1048 faces sem repetição e uma segunda divisão sobre a primeira sai sem reprova.

O triângulo de 3,3 graus era recusado como túnel, e o lado ao longo de uma linha da malha como espinho. O lado ao longo da linha agora divide. O bico mais estreito que o encaixe, cujos dois lados caem sobre a mesma aresta, recusa com essa causa e o lugar quando o trecho passa de duas vezes o encaixe da maior aresta do triângulo (10 mm no triângulo de 3,3 graus); abaixo disso a ponta é aparada (a estrela na vista inclinada perde 1,8 mm de uma ponta). A face mais estreita na vista que o encaixe, como a parede da borda da chapa curva vista quase de perfil, recebia votos contrários das duas bordas e recusava; agora vale o lado em que o centro dela cai.

`encaixe: NaN` recusava no campo `segmentosArco` e o contorno com NaN lançava exceção. Cada número recusa pelo campo em que veio, e o contorno que a receita não resolve recusa em `contorno`.

Depois das correções, a bateria de 180 posições continua com 0 recusas e 0 reprovas com encaixe 0,05 (menor razão 0,0047) e 0,02 (0,0032).

## A segunda revisão, de 2026-11-19

A lista de campos de origem feita à mão cobria a subdivisão e deixava de fora a grade do plano, as faixas do lathe, as laterais do cilindro e o mapa de cópias do espelha e do arranja: sobre um plano a seleção pela origem perdia 15 de 51 faces, e sobre a cópia de um espelha 181 de 1056. A lista saiu. O passo anota em `st.pedacosDaDivisao` os pedaços de cada face cortada, e a resolução de origem do núcleo (`comPedacosDaDivisao`, em `procedural/nucleo/nucleo.js`) entrega os pedaços logo depois da face, para qualquer gerador. O registro de cada gerador não é alterado, e por isso o endereço de uma face só (a face nomeada de um cubo) e o mapa de cópias, que não são listas, também funcionam sem recusa. A origem citada dentro de outra (o `de` de uma cópia) resolve sem os pedaços, de modo que dividir a fonte depois do espelho não quebra a cópia. Há um teste por gerador (subdivisão, plano, lathe, cilindro, espelha, arranja e a face de um cubo): a seleção pela origem marca as faces de antes mais todos os pedaços novos, e a segunda divisão, por um contorno que contém o primeiro, não deixa face da primeira parte para trás.

O contorno exatamente sobre as arestas mudava faces que só encostava: girava os cantos na chapa plana e partia quadriláteros não planos em dois triângulos do mesmo lado. A face cujos pedaços caem todos do mesmo lado, sem vértice novo, agora fica como estava. No teste, o contorno pelas arestas de um bloco de faces da pele de fora deixa a malha inteira igual à de antes, vértices e cantos, nas chapas plana e curva. Nos oito casos do ataque (bloco e L, pelas arestas da pele de fora e da de dentro, nas chapas curva e plana) nenhuma face de antes muda e nenhuma face nova aparece (880 faces antes e depois).

A recusa da borda diz "toca ou cruza".

## As recusas

Cada uma tem teste que confere a mensagem, e `node tools/gates/recusas-exercitadas.mjs` passou a vigiar o arquivo: argumentos inválidos (`chapa`, `vista`, `nome`, `material`, `substituir`, `sentido`, `segmentosArco`, `encaixe`, `contorno`), o contorno que se cruza, o ponto do contorno fora da chapa, o contorno que cruza a borda da chapa ou uma face de perfil, a chapa furada mais de uma vez sem `sentido`, as camadas que se sobrepõem em profundidade, o contorno que cabe num triângulo só, o espinho pelo mesmo vértice, o bico mais estreito que o encaixe, o número que a receita não resolve, o pedaço fino com a medida, a região de dentro que se liga à de fora por trás da camada e a região que já é de outra parte sem `substituir: true`. A defesa das contas de ponto flutuante do traço não tem entrada que a alcance e está nas exceções do gate, com o motivo.

## O que fica para a fatia 2

O contorno que passa sobre um vão já aberto na chapa (a borda da parte que cruza o arco de uma roda, por exemplo) é recusado, porque a divisão não atravessa parede de vão nem aceita ponto do contorno fora da chapa; se as partes do carro pedirem isso, a operação precisa crescer. O piso de segmentos do bico da abertura não foi reaproveitado: o canto vivo sai do polígono do contorno como desenhado. O passo não declara o que escreve em `ESCRITA_DAS_OPERACOES` nem o que lê em `LEITURA_DAS_OPERACOES`, de modo que o retrato e o cache o tratam pelo caminho completo; a medida de tempo no carro diz se vale declarar. A borda da parte não é publicada como origem citável.

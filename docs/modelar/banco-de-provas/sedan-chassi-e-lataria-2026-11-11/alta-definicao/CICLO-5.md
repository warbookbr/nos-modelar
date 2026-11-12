# Sedã em alta definição, ciclo 5: o carro inteiro

O quinto ciclo fecha o carro. Os para-choques e as lentes foram refeitos com o que o núcleo passou a oferecer depois do [ciclo 4](CICLO-4.md). A lataria saiu inteira pela simetria das gaiolas e foi posta sobre o chassi e as rodas do sedã facetado. O carro ganhou retrovisores e maçanetas simples. O esboço final é [`carro-inteiro.esboco.mjs`](../../../../../procedural/pecas/sedan-chassi-e-lataria/alta-definicao/carro-inteiro.esboco.mjs), que importa os de cada parte: [`frente-e-traseira.esboco.mjs`](../../../../../procedural/pecas/sedan-chassi-e-lataria/alta-definicao/frente-e-traseira.esboco.mjs), que encadeia [`andar-de-cima.esboco.mjs`](../../../../../procedural/pecas/sedan-chassi-e-lataria/alta-definicao/andar-de-cima.esboco.mjs) e [`caminho-a-gaiola-da-casca.esboco.mjs`](../../../../../procedural/pecas/sedan-chassi-e-lataria/alta-definicao/caminho-a-gaiola-da-casca.esboco.mjs), e o rascunho facetado no modo `chassi`. O espelho das peças soltas está em [`espelho.mjs`](../../../../../procedural/pecas/sedan-chassi-e-lataria/alta-definicao/espelho.mjs). Todos os números abaixo são medidos pelos comandos sobre o carro inteiro, salvo onde o texto diz que é previsão.

## O desenho

A simetria serviu. Cada gaiola por estações (o andar de baixo, a cabine, o para-brisa, o vidro traseiro, os dois painéis e a tomada de ar) passou a declarar `simetria: 'x'`, e o passo espelha a malha de controle antes de subdividir. A chapa sai inteira, sem costura no eixo. O que cruza o eixo continua uma parte só: capô, tampa do porta-malas, teto, painéis da frente e de trás, tomada de ar, para-brisa e vidro traseiro. As linhas de vão do lado esquerdo são as do direito com x trocado de sinal, e os painéis do lado esquerdo levam o sufixo `Esq`, com a semente vista de -x. O friso sobre a chapa com simetria faz sozinho a cópia espelhada, de modo que cada lábio e cada moldura é uma parte com os dois lados. A gaiola por laços não tem simetria: os para-choques vão de ponta a ponta, e o vidro das portas, a vigia, as lentes e o retrovisor do lado esquerdo são a cópia espelhada da gaiola do direito (x trocado, faces invertidas, sufixo nos nomes), feita pelo `espelho.mjs`.

O chassi e as quatro rodas são os do rascunho facetado. O modo `chassi` dá a plataforma com assoalho, túnel, longarinas, travessas, caixas de roda, montantes e eixos, e as rodas pela família roda-pneu em `instanciaDeFamilia`. Os números de passo foram deslocados para depois dos da lataria. Os membros que encostam na lataria vêm do rascunho aparados pelo interior da casca facetada, e a lataria da alta definição é outra: a estufa é 44 mm mais estreita e a planta das portas foi redesenhada. Na primeira montagem os montantes passavam até 81 mm pela pele. Cada um desses membros foi reaparado pela interseção com prismas da seção de dentro da lataria, tirada das funções do alvo, 2 mm aquém da pele de dentro, em estações a até 100 mm umas das outras. As longarinas foram cortadas na face de dentro dos painéis da frente e de trás.

## Os para-choques e as lentes antes e depois

| Medida | Ciclo 4 | Ciclo 5 |
|---|---|---|
| Forma do para-choque | meia barra, até o eixo, tampada ali | a barra inteira, de x -860 a 860 (atrás, -856 a 856) |
| Quina da ponta | dois laços de apoio à mão, a 4 e 10 mm da ponta | vinco com raio no próprio laço da ponta, que o núcleo cruza com as quatro quinas; laço seguinte a 32 mm |
| Raio pedido na ponta | não havia (a quina saía dos laços de apoio) | 6 mm; o de 8 mm não cabe, e o máximo é 7,25 (atrito 3) |
| Raio medido, quinas de fora (8 mm) | 7,3 (frente) e 7,8 (trás) | 7,3 (7,2 a 7,5) e 7,8 (7,7 a 7,8); todos os cortes dentro |
| Raio medido, quinas de dentro (3 mm) | 2,9 | 2,9; todos os cortes dentro |
| Raio medido, ponta (6 mm) | não havia | frente 5,9 (5,8 a 7,0), 14 de 14 dentro; trás 5,8 (4,3 a 7,0), 1 de 12 fora, no canto do chanfro |
| `ondulacao`, emendas nos cantos das tampas | 19 e 17 falhas, de até 1,7 mm | nenhuma falha; 21 e 17 emendas junto das feições, de até 1,44 e 0,69 mm |
| `ondulacao`, outras falhas | 0 | 1 em cada barra: 4,49 mm (frente) e 2,62 mm (trás) na face de fora, onde ela começa a envolver o canto (atrito 9) |
| Contornos de forma | os dois laços de apoio | fundo mínimo de 36 mm na ponta, ponto do meio de cima e de baixo a um terço da quina de dentro, e face de trás reta nos últimos 32 mm da frente (atritos 1 e 3) |
| Lente do farol | chapa posta à mão, pela conta do relevo mais o recuo | `lente` do anel: 9 pontos, 0,8 mm atrás da abertura (z 2103,2), 6 mm de sobra |
| Lanterna | vão rente de 400 por 120 mm, lente colada na chapa, sem rebaixo | rebaixo por relevo de 14 mm com a lente do anel; vão de 430 por 180 mm, recuos de 45, 45, 45 e 43 mm em duas correções pela recusa; abertura de 342 por 85 mm |
| Contato da lente com o painel | `atravessa` de 0,014 a 0,2 mm | `atravessa` de 0,014 mm nas quatro |
| Avisos das gaiolas | o painel saiu com a normal ao contrário, sem aviso | `fora` declarado nos painéis e na tomada; nenhum `normalContrariaAoFora`, `relevoEmGradeLarga` ou `lenteEmAberturaNaoRetangular` |
| `ondulacao`, painel de trás | 0 | 1 calombo de 0,40 mm abaixo da lanterna (x 484, y 567), na grade nova em volta do rebaixo |

As emendas de 1,7 mm sumiram como falha. Elas não vêm mais dos laços de apoio, que saíram, mas do cruzamento das quinas, e a leitura as dá dentro da faixa das feições. A abertura da lanterna ficou menor que a do facetado (400 por 110 mm), porque o anel come cerca de 45 mm de cada lado do vão (atrito 11).

## O carro inteiro

| Medida | Valor |
|---|---|
| Partes / faces | 98 / 229.428, nenhuma face sem parte; o lado inteiro do ciclo 4 tinha 32 / 103.497 |
| Linhas de código | 1.133 nos sete arquivos da pasta, das quais 219 no `carro-inteiro.esboco.mjs` e 25 no `espelho.mjs` |
| Montagem (`esboco:nucleo`) | 415 s com o corte de conferência dos painéis; 210 a 220 s sem ele |
| Medidas com cache | ondulação 452 s (ela não usa o cache), faces finas 12 s, raio 16 s, vão 150 s cada chamada |
| Junção no eixo | sem costura nem degrau à vista na luz rasante e nos recortes; capô com painel da frente a 4,005 mm em x 0, capô e tampa com o teto a 4,00 mm em 1.517 mm de linha, de um lado ao outro |
| Os dois lados | vãos iguais à décima de milímetro: portas, soleiras, laterais e tampa a 4,06 mm, com degrau até 0,05 mm; folga das rodas igual |
| `ondulacao`, chapa de baixo | 3 falhas: 0,50 mm no capô junto da frente e 0,32 mm na lateral de trás, as do ciclo 4, e 0,41 mm no capô junto do eixo (x 75, z 1723), nova com a simetria; junto das feições, 15,4 mm a 0,3 mm do ombro em z -1292, onde a quina morre |
| `ondulacao`, cabine | 0 falhas; junto das feições até 7,6 mm, nos pés das colunas, como no ciclo 4 |
| `ondulacao`, painel da frente | 1 falha: o calombo de 1,09 mm abaixo do farol, do ciclo 4 |
| `ondulacao`, tomada de ar | 2 falhas: 1,35 mm na ponta de trás, a do ciclo 4, e 3,48 mm no eixo em z 862, nova (atrito 10) |
| `ondulacao`, retrovisores, lentes, vidros | 0 falhas; nos retrovisores, 15 emendas junto das feições, de até 7,3 mm, no pé de 42 por 60 mm |
| `ondulacao`, total | 9 falhas fora das feições e 129 junto delas |
| Faces finas | 145: 132 no chassi e nas rodas (as booleanas do rascunho e do reaparo, as caixas de roda, os cubos) e 13 na lataria, nas quatro chapas do atrito 4 |
| Raio | 25 de 29 arestas com pedido dentro de 20%; fora, o ombro (11 de 84 cortes, onde a quina morre), a quina da cabine (2 de 49) e a ponta do para-choque de trás (1 de 12 de cada lado); retrovisor 6 mm nas quatro quinas e 4,6 mm para 5 na ponta, todos dentro |
| Vão dos painéis (`vao:partes`) | 4,00 a 4,07 mm em todos os pares da mesma chapa; os mínimos de 1,4 a 2,2 mm no canto de cima dos para-lamas com os painéis e no canto da frente do capô com o para-lama, os do ciclo 4 (atrito 6 do ciclo 4) |
| Rodas nos arcos | do pneu ao lábio, 26,9 mm na frente e 26,0 atrás, no topo do arco; do pneu à borda do arco, 39,0 e 37,9 mm; medidas de ponto a triângulo e declaradas como folga |
| Junção com o chassi | longarinas em `encosta` na face de dentro dos dois painéis; a lataria sobre 13 membros reaparados em folga declarada de 0 a 5 mm (medida de 0,24 a 13 mm); caixas de roda em solda com os arcos e os lábios; 3 membros em travessia rasa declarada (atrito 5) |
| Modo estrito | recusa com 42 itens: 31 travessias e 11 contatos esperados e não dados, todos com uma das quatro chapas que a medida de contatos chama de sólido inconclusivo (atrito 4); nenhuma travessia sem declaração entre sólidos que ela mede |
| `vao:partes --soltas=recusar` | 3 partes soltas (a tampa do porta-malas e as duas soleiras, que só tocam o chassi pela folga do apoio); `apoia` declarado depois da bateria, sem nova medida |
| Retrovisores e maçanetas | retrovisor de laços com raio, o pé 11 mm dentro da porta; maçaneta como caixa de 110 por 22 mm que entra 3 mm na porta, sem o rebaixo atrás |

### Tempo gasto em cada passo

Leitura do que entrou no núcleo, do guia do rebaixo e do chassi do facetado: 12 minutos. A simetria nos dois andares e na cabine: 15. A frente e a traseira, com a lanterna em duas correções de recuo, os para-choques em quatro rodadas e o nome repetido que fazia o espinho: 40. A junção com o chassi, com sete montagens do carro de 3,5 a 7,5 minutos cada, o reaparo e a procura da face de área nula: 80. O retrovisor e as maçanetas: 10. As medidas finais, em duas baterias, uma delas interrompida pela regressão do atrito 8: 50, quase tudo de espera. As imagens: 25. O documento: 20. Somando, cerca de quatro horas e dez minutos.

## As imagens

Em [`ciclo-5/`](ciclo-5/), nas cores reais (carroceria vermelha, vidro escuro, pneu preto, aro cinza, lentes claras), com a mesma câmera ortográfica para a alta definição e o facetado:

- [`tres-quartos-de-frente.png`](ciclo-5/tres-quartos-de-frente.png) e [`tres-quartos-de-tras.png`](ciclo-5/tres-quartos-de-tras.png), lado a lado com o facetado.
- [`vista-de-lado.png`](ciclo-5/vista-de-lado.png) e [`vista-de-frente.png`](ciclo-5/vista-de-frente.png), também com o facetado.
- [`luz-rasante-do-carro.png`](ciclo-5/luz-rasante-do-carro.png), de `vistas:superficie` sobre o carro inteiro: três quartos com a luz a 0 e a 90 graus, lado a 280 e topo a 20.
- [`recorte-para-choques.png`](ciclo-5/recorte-para-choques.png), o canto dos dois para-choques.
- [`recorte-juncao-no-eixo.png`](ciclo-5/recorte-juncao-no-eixo.png), o capô com o painel da frente e a grade, e o teto, em x 0.

Na luz rasante e nos recortes o eixo não aparece: o capô, o painel da frente, a grade, o teto e a tampa passam por x 0 sem linha, sem degrau e sem mudança de brilho. O canto do para-choque da frente mostra a ponta arredondada e uma dobra leve na aresta de cima, onde a barra começa a envolver o canto, que é a falha de 4,49 mm. Na vista de lado a faixa escura na porta da frente é a sombra do retrovisor. Ao lado do facetado, a alta definição tem a mesma proporção, as mesmas rodas e as mesmas aberturas, com a estufa mais estreita, os cantos arredondados, o farol e a lanterna em rebaixo e a grade de lâminas. A lanterna é visivelmente menor que a do facetado.

## Atritos

1. A lista de raios que `raioNaoCabe` deixa não acompanha os pontos que o cruzamento da ponta põe na linha (núcleo, gaiola por laços). Quando o aviso reduz o raio de uma quina ao longo da barra, o vinco fica com uma entrada de raio por laço (19), mas a linha já ganhou os pontos do cruzamento com a ponta (21), e a subdivisão recusa o passo com "o raio é um número maior que zero, { de, ate } ou uma lista com um número por ponto da linha". O menor caso é a barra de 330 por 32 mm do teste do núcleo, com raio de 8 mm nas quatro quinas e no laço da ponta. O processo pegou o defeito, porque a montagem recusa, mas a mensagem aponta o raio e não o cruzamento. O contorno foi de forma: barra com 36 mm de fundo na ponta e o ponto do meio a um terço da quina de dentro, para nenhum raio deixar de caber.
2. Os pontos que o cruzamento da ponta cria não levam o nome da gaiola (núcleo, gaiola por laços). Eles se chamam `canto5_3_1_1` e parecidos, e as duas barras usam os mesmos nomes. No topo comum, os do para-choque de trás sobrescreveram os da frente, que ganhou um espinho até z 99 e travessias com a parede corta-fogo, os pneus e os montantes, a 1,5 m dele. O processo não pegou: a montagem passou, a malha estava fechada e bem orientada, e só a caixa da parte e o relato de contatos mostraram o absurdo. Falta um gate que recuse o mesmo nome de ponto com valores diferentes entre passos, ou o prefixo da gaiola em todo ponto que ela cria. O contorno foi o prefixo à mão (`comPrefixo`).
3. O raio de 8 mm não cabe na ponta (núcleo, gaiola por laços). A volta recuada da tampa fica em 3,5 raios, no máximo 75% do que o contorno aguenta. Numa barra de 36 mm de fundo isso dá 13,5 mm, e cabe no máximo 7,25 mm. Com a face de trás acompanhando o canto do para-lama, a tampa dobrava 123 graus com ela, e nem o de 4 mm cabia. O processo pegou, porque `raioNaoCabe` diz o raio que cabe. O contorno foi a face de trás reta nos últimos 32 mm, o que deixa a ponta da barra 24 mm à frente do canto do para-lama, e o raio de 6 mm na ponta.
4. O corte deixa uma face de área nula que a medida de contatos não triangula (núcleo, painéis por vãos, e ferramenta, relato de contatos). Na parede do vão do fim da porta traseira, onde a linha cruza a quina da cintura (z -762 e -758, y 998), sai uma face de cinco pontos alinhados. A `limparLascas` não a tira, nem com 0,05 mm de tolerância. A medida de contatos para em "face degenerada não permite triangulação", chama a chapa de sólido inconclusivo e dá travessia com tudo o que fica perto: pneu, aro, montante C, painel, teto. A face cai num lado e não no outro, pelo arredondamento, e em chapas diferentes conforme o corte de conferência esteja ligado: com ele, o para-lama direito, a lateral traseira esquerda e as duas portas do outro lado. São as 42 recusas do modo estrito. O menor caso é uma chapa em L com quina de raio 6 mm e uma linha de vão por curva que a cruza a 2 mm de uma estação. O processo pega o efeito, porque o estrito recusa, mas não a causa: o relato não diz por que a parte é inconclusiva, e foi preciso chamar `prepararSolido` à mão. Faltam o motivo no relato e a limpeza da face de área nula na `limparLascas`. Não há contorno nesta pasta.
5. O núcleo não apara um sólido pelo lado de dentro de uma chapa subdividida (núcleo). O chassi do rascunho foi aparado pela casca facetada e não acompanha outra lataria. O contorno foi a seção de dentro tirada das funções do alvo, 2 mm aquém da pele, em prismas a cada 100 mm. A pele alisada fica até cerca de 2 mm dentro dos pontos do alvo nas curvas, e com a margem de 0 mm o membro entrava na chapa em toda a sua espessura. Com 2 mm, três pares ainda passam e foram declarados como travessia rasa, com esse motivo: o reforço da cintura e a travessa da cabine com o teto, e o suporte do radiador com o para-lama. O processo pegou, porque o relato listou 53 travessias.
6. O encosto exato entre um membro e a chapa não se alcança (ferramenta). Pela mesma razão do atrito 5, o apoio da lataria nos membros foi declarado como folga de 0 a 5 mm, com o motivo da cola de estrutura que fica fora do esboço. O `vao:partes` mede de 0,24 a 13 mm nesses pares, e a declaração larga esconde a diferença. O processo não pegaria um apoio que deixou de apoiar.
7. O friso sobre a chapa com simetria põe a cópia na mesma parte (núcleo, friso). Cada lábio e cada moldura de janela lateral é uma parte só com os dois lados, sem o sufixo, e um contato com o vidro de um lado vale para o par todo. O processo não pega.
8. Uma estação servia a duas coisas, e o comentário só dizia uma (instrução, e minha). A estação 33 mm antes do pé da tampa era o contorno da linha que não chegava ao fim da coluna, e o comentário dizia só isso. Com a linha corrigida eu a tirei, e o flanco da lateral traseira ganhou uma ondulação de 12,6 mm em z -1292, porque a gradação das estações do arco dependia dela. A ondulação pegou. A estação voltou, com o comentário dizendo as duas razões.
9. A face de fora do para-choque sai com uma ondulação de 4,49 mm (frente) e 2,62 mm (trás), lida na barra inteira, com o pico onde ela começa a envolver o canto (x 775). A rampa suave no lugar da reta não mudou a leitura (4,70 e 2,53 mm), e a causa não foi achada neste ciclo. No ciclo 4, com a meia barra e os laços de apoio, a leitura não acusava isso. Atribuição em aberto, entre a forma e a leitura da ondulação numa barra de laços espaçados a 4 raios. O processo pegou.
10. A tomada de ar ganhou um calombo de 3,48 mm no eixo, em z 862, ao virar uma chapa contínua pela simetria. No ciclo 4 a borda em x 0 era livre, e as colunas do topo (a borda, o meio e o centro) não precisavam concordar com a imagem. É forma da peça: falta uma coluna entre o meio e o centro onde a tomada sobe. O processo pegou.
11. O rebaixo por relevo come cerca de 45 mm de cada lado do vão (ferramenta, anel). Para a lanterna ter a lente do anel, o vão cresceu para 430 por 180 mm, e a abertura ficou com 342 por 85 mm, contra 400 por 110 no facetado. A abertura não se pede: ela sai do vão menos o recuo, e o recuo tem faixa estreita. O processo não pega a forma menor.
12. A gaiola por laços não tem `simetria`, e não há ajudante que espelhe uma gaiola (ferramenta geral). O vidro das portas, a vigia, as lentes e o retrovisor foram espelhados pelo `espelho.mjs`, de 25 linhas.
13. O relato de contatos só mede folga a menos de 20 mm, e a das rodas nos arcos, de 26 a 39 mm, foi medida por um script próprio de ponto a triângulo. A declaração fica sem conferência pelo comando.
14. A medida do carro inteiro encarece cada rodada (medido). A montagem leva 7 minutos com o corte de conferência e 3,5 sem ele, a ondulação 7,5 minutos sem cache, e cada mudança no esboço desfaz o cache das outras medidas. A junção com o chassi custou sete montagens.

## O que do ciclo 4 ficou resolvido e o que continua

Resolvido pelo núcleo e confirmado aqui: o cruzamento das quinas na gaiola por laços (os laços de apoio saíram, e as emendas deixaram de ser falha), a prova de separação na ponta alongada (o capô e a tampa voltaram a `alem: 30`), a curva até a estação em que a coluna termina (a linha da tampa chega ao pé dela, e as duas faces de área nula que a ponta antiga deixava saíram), o aviso de normal ao contrário (`fora` declarado, nenhum aviso) e a lente do anel (no farol e na lanterna). A vista de trás em `vistas:superficie` continua faltando (atrito 9 do ciclo 4). O degrau de 1,1 mm do capô e da tampa com a cabine continua (atrito 8 do ciclo 4), igual nos dois lados e de um lado a outro.

## Balanço da alta definição

A pergunta da fatia 4c é se o projeto leva uma IA a uma carroceria de superfície dura em alta definição. A resposta medida é que leva a lataria, e ainda não leva o carro montado. A lataria inteira sai de gaiolas declaradas em milímetro, com raio pedido nas quinas e conferido dentro de 20% em 25 de 29 arestas. Os vãos dos painéis ficam em 4,00 a 4,07 mm, iguais nos dois lados, e a simetria fecha o eixo sem costura. A ondulação dá 9 falhas, quase todas abaixo de 1,1 mm. Ao lado do facetado, a forma é a mesma, com a qualidade de superfície que ele não tinha. O que ainda não fecha é a junção com outra montagem. O chassi feito para outra casca não se reapara pela pele nova, e o modo estrito do conjunto recusa por uma face de área nula que a medida não diz qual é.

O custo, por ciclo:

| Ciclo | Trabalho | Rodadas registradas | Contornos à mão |
|---|---|---|---|
| 1, corpo de baixo e capô, dois caminhos | cerca de 1 hora | não contadas | 5 |
| 2, raio no vinco e linhas por curva | cerca de 1 hora e 40 minutos, em três sessões | não contadas | 3 |
| 3, cabine, vidros e molduras | cerca de 1 hora e 30 minutos | não contadas | 5 |
| 4, cabine sem contornos, frente e traseira | cerca de 2 horas e 30 minutos | 6 no farol | 8 |
| 5, carro inteiro | cerca de 4 horas e 10 minutos | 2 na lanterna, 4 nos para-choques, 7 montagens do carro | 6 |

O tempo cresce com o tamanho, mais pela espera das medidas do que pela escrita: no ciclo 5, mais da metade foi montagem e medida. Os contornos do ciclo 5 foram o espelho das peças soltas, o prefixo dos pontos do cruzamento, a forma da ponta do para-choque, o vão da lanterna aumentado para o recuo, o reaparo do chassi pela seção do alvo e o apoio declarado em folga larga.

O que ainda falta, em ordem:

1. A face de área nula do corte, com o motivo no relato de contatos e a limpeza na `limparLascas` (atrito 4). Sem isso o modo estrito do carro não passa, e nenhuma travessia real se distingue das fantasmas.
2. Aparar um sólido pelo lado de dentro de uma chapa subdividida, para o chassi acompanhar a lataria com encosto exato (atritos 5 e 6). É previsão que isso resolva os três pares rasos e as folgas largas.
3. O nome com prefixo nos pontos que a gaiola por laços cria, e o gate de ponto repetido no topo (atrito 2), e a lista de raios que acompanha os pontos do cruzamento (atrito 1).
4. A ondulação da face de fora dos para-choques (atrito 9) e o calombo da tomada no eixo (atrito 10).
5. O rebaixo de fundo fechado, para a maçaneta, a placa e a lanterna com abertura pedida (atrito 11 e o plano do rebaixo por contorno).
6. A porta com quadro, a aba das bordas e o degrau do capô com a cabine, do ciclo 4.
7. O espelho de gaiola no núcleo e a parte por lado no friso com simetria (atritos 7 e 12). É previsão que isso tire o `espelho.mjs`.
8. A vista de trás em `vistas:superficie` e o cache que sobreviva a uma mudança de contato (atrito 14).

Recomendo levar o carro à pessoa para o aceite de forma agora, porque a forma não depende do que falta, e corrigir os itens 1 e 3 no núcleo antes de outra junção com chassi.

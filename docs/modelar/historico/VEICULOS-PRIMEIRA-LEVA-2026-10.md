# Veículos de referência livre: o diagnóstico da primeira leva

Evidência encerrada do plano [veículos de referência livre](../planos/encerrados/2026-10-20-veiculos-de-referencia-livre.md), de 2026-10-20, tirada de [`modelar-veiculos.md`](../modelar-veiculos.md) em 2026-10-25: o diagnóstico das nove peças da primeira leva, a decisão por peça, as lacunas do núcleo e das ferramentas naquele dia, o experimento da perua pelas três vistas e o que virou gate. As seções citadas no texto são as do documento original, em que a 4 eram as instruções e a 5 os grupos, hoje as seções 1 e 2 de `modelar-veiculos.md`. Não governa trabalho novo; as lacunas que ficaram abertas estão no plano de ajustes no núcleo dos veículos.

## Diagnóstico da primeira leva

### Por que o carro-sedan-compacto passou

A fonte do compacto, o sedan do pacote A, é feita de blocos de lados retos: a carroceria vermelha tem seção retangular, a faixa cinza de baixo é mais larga que a carroceria, os para-lamas são cápsulas salientes e a cabine afunila pouco. Para essa arte, extrudar em x o perfil lateral reproduz a forma quase inteira, e o agente escolheu exatamente essa decomposição: uma extrusão de perfil lateral para a carroceria, outra para a cabine, um chassi mais largo com cortes cilíndricos nas rodas, quatro para-lamas em arco de 16 segmentos com o furo da roda, rodas grandes com aro saliente, e vidros, faróis, para-choques e placa como placas encostadas em faces planas. Todas as medidas saem de uma TABELA e todas as posições são derivadas, então as peças se encostam por construção. O que a pessoa reconhece num carro de brinquedo (a faixa escura, as rodas aparecendo nos vãos, o para-lama saliente, a proporção da cabine) está presente, e a cabine de largura constante, a principal simplificação, quase não se nota porque a fonte afunila pouco.

### Por que as outras oito não passaram

O defeito comum é que as receitas tratam o carro como uma extrusão do perfil lateral de largura constante, sem a seção frontal. Nas fontes da pacote D (Sedan, Wagon, Pickup, Jipe, Bus) a forma vive justamente na seção: a lateral tem um vinco na cintura, a estufa dos vidros afunila para dentro até o teto e a saia recolhe um pouco embaixo. Uma laje de largura constante perde tudo isso e vira uma caixa. O segundo defeito comum é a roda escondida: a carroceria desce até perto do chão com a largura total e a roda fica dentro dela, sem arco recortado nem saliência, e na isométrica a roda some. O terceiro é o perfil lateral errado em pontos que o comparador não reprova.

| Peça | Fonte | O que a imagem mostra contra a fonte | comparar-silhueta (média e máxima, z e y) |
|---|---|---|---|
| carro-sedan-classico | pacote B | carroceria alta e caixa, cabine da largura do carro, rodas quase escondidas; a fonte é baixa e longa, com estufa estreita, arcos recortados e cantos arredondados | 17/133 e 25/120 mm, passa |
| carro-sedan-angular | pacote D Sedan | o perfil da carroceria tem entalhes em V no topo, em z ±1641 (o agente pôs o recorte das rodas na borda de cima), o que cria uma barbatana atrás e pontas na frente; cabine sem afunilar | 30/332 e 39/454 mm, passa com 6 fatias fora |
| carro-taxi | pacote A taxi | nariz em rampa até o para-choque, quando a fonte tem frente alta e vertical; faltam os para-lamas em cápsula, a faixa cinza mais larga e a grade cinza | 38/648 e 47/943 mm, passa com 7 fatias fora |
| carro-perua | pacote D Wagon | o contorno lateral é quase igual ao da fonte, mas a seção é retangular (cabine tão larga quanto a carroceria) e as rodas ficam rentes à lateral; o cabeçalho diz que a origem é o pacote A, quando é a Wagon do pacote D | 6/71 e 20/74 mm, passa |
| jipe-aberto | pacote D Jipe | encosto do banco virou uma tábua de lado a lado, para-lamas são blocos pretos, santantônio fino demais, para-brisa grande e deitado, frente sem grade | 74/592 e 46/251 mm, reprova (43 fatias) |
| picape-angular | pacote D Pickup | cabine caixa sem afunilar, paredes da caçamba em lajes altas, santantônio torto, frente com blocos pretos soltos | 64/473 e 48/659 mm, reprova (13 fatias) |
| onibus-urbano | pacote D Bus | perfil e fileira de janelas próximos da fonte, mas as rodas estão escondidas sob a saia, sem arco | 10/350 e 52/350 mm, passa |
| onibus-rodoviario | pacote C | janelas numa faixa escura única, sem colunas, sem os cantos arredondados do teto e com as rodas escondidas | 12/378 e 59/916 mm, passa |

O comparador aprovou seis das oito reprovadas pela pessoa, e a perua reprovada tem números melhores que o compacto aprovado. A causa está na própria medida: cada fatia guarda só o envelope (o ymin e o ymax por z, o xmax por y), e o envelope não vê o afunilamento da cabine quando a carroceria é mais larga embaixo, não vê se a roda aparece, não vê o vinco nem a cor. Além disso a tolerância é de 5% do comprimento (225 mm num carro, 600 mm num ônibus) e a regra aceita até 8 fatias fora em z e 4 em y. O comparador serve para pegar escala e proporção grosseira, e a imagem de fonte e receita lado a lado era, na época, a única prova de forma.

O processo não teria pego sozinho nenhum destes três defeitos (seção constante, roda escondida, perfil com entalhe no lugar errado), nem a origem errada da perua. Por isso cada um deles tem uma lacuna correspondente na seção 3, e as instruções da seção 4 tornam obrigatória a folha comparativa.

## Decisão por peça

| Peça | Decisão | O que aproveitar | O que refazer |
|---|---|---|---|
| carro-sedan-compacto | manter, aprovado | tudo; é a base dos veículos do pacote A | nada, salvo pedido da pessoa |
| carro-taxi | refazer a partir do compacto | a estrutura do compacto inteira (TABELA, derivar, gerarPassos, contatos, pontos); do táxi atual, o luminoso e as rodas por `lathe` com chanfro | carroceria com frente alta, chassi mais largo com cortes, para-lamas em cápsula, grade cinza |
| carro-sedan-angular | refazer a carroceria | rodas octogonais, faróis, lanternas, materiais, a posição das rodas | carroceria e estufa pela técnica das três vistas, com o perfil lido de novo da fonte |
| carro-perua | refazer a carroceria a partir do experimento | o contorno lateral da TABELA atual (bate a 6 mm da fonte), as rodas, faróis e lanternas; o experimento `receita-final.js` já é a carroceria nova | estufa afunilada, vinco, arcos no perfil, caixas de roda, e o cabeçalho de origem (pacote D Wagon) |
| carro-sedan-classico | refazer do zero | só as medidas gerais e as posições das rodas | tudo, com o nível de detalhe do estilo pacote B (seção 5.1) |
| jipe-aberto | refazer a carroceria e os acessórios | rodas, posição dos eixos, cores | banheira aberta pelas três vistas, para-brisa com moldura, santantônio em barras grossas, bancos com assento e encosto, para-lamas planos, grade |
| picape-angular | refazer | rodas e posição dos eixos | cabine afunilada, caçamba com paredes finas tiradas do mesmo prisma, para-choque com protetor, santantônio |
| onibus-urbano | aproveitar como base | o perfil lateral, a fileira de janelas, os espelhos, a TABELA | arcos de roda recortados, rodas saindo da lateral, caixas de roda, frente |
| onibus-rodoviario | refazer | a orientação (`--girar 180`), as medidas e as rodas | janelas em fileira com colunas, teto com cantos arredondados no perfil frontal, arcos, saia |

## Lacunas do núcleo e das ferramentas

A análise inicial listou doze lacunas. As seis primeiras eram ferramentas pequenas, que não tocam o núcleo, e foram fechadas antes da leva de Sonnet. As seis últimas tinham contorno testado e ficaram como instrução; os achados de núcleo entre elas estão registrados em 'Ajustes no núcleo' do plano encerrado e são tratados no plano [ajustes no núcleo dos veículos](../planos/encerrados/2026-10-21-ajustes-no-nucleo-dos-veiculos.md), que os reproduziu e corrigiu o diagnóstico de vários deles; até cada fatia fechar, valem os contornos abaixo. As mudanças gerais que possam voltar ao NÓS vão registradas em `docs/modelar/UPSTREAM-NOS.md`.

| Lacuna | Sintoma nas nove peças | Estado |
|---|---|---|
| Folha de comparação na mesma câmera e escala, com mapa de diferença de silhueta | a pessoa reprovou oito peças por forma que nenhum número acusou | feita: `folha-comparativa.mjs`, com azul onde só a receita tem corpo, vermelho onde só a fonte tem e a área de cada um em porcentagem |
| Comparador frouxo e cego para seção | táxi passou com 648 mm de erro e a perua sem afunilar passou com 20 mm de média | feita: `comparar-silhueta.mjs --rigoroso` (tolerância de 2% do comprimento, nenhuma fatia fora) e `--cabine` (a estufa medida em separado) |
| Gerador das vistas da carroceria a partir de `fonte-partes.json` | perfis com poucos vértices ou fora do lugar, rodas medidas à mão | feita: `medidas-da-fonte.mjs`, que simplifica o perfil que gera |
| Folha de seis vistas a partir de uma `receita.js` | cada agente escreveu o próprio script de vistas | feita: `vistas-da-receita.mjs` |
| Origem e orientação da fonte sem conferência | a perua declarava origem pacote A sendo pacote D Wagon; o rodoviário veio de trás para a frente | feita: `veiculos-referencias.json` conferido por `origem-das-fontes.test.mjs`, e o campo `frente` gravado por `modelo-de-referencia.mjs` e exigido pelas ferramentas de comparação; o cabeçalho de `receita.js` ainda não é conferido por teste |
| Seção por estação e por material na fonte | o `fonte-partes.json` só guarda o máximo de cada fatia e não diz onde fica o vidro | feita em parte: `comparar-silhueta.mjs --cabine` separa a estufa e a medida passou a ser por superfície, com o campo `metodo`; a meia largura numa grade (z, y) e a silhueta por material não foram gravadas |
| Roda solta não reprova | sem caixa de roda, a roda só encosta na própria calota e o `descrever-peca` sai com código 0 | aberta: a instrução exige a caixa de roda, e a conexidade do grafo de contatos no `guarda:acervo` ficou sem gate |
| Booleana deixa lasca ao cortar o arco de roda | `subtrair` de cilindros de 8 lados na carroceria gerou a face 8006, razão 1,81e-3, que `conferir-malha` reprova | achado do núcleo: recortar o arco no perfil lateral 2D antes de extrudar; `subtrair` continua bom em peça pequena |
| Vértices colineares no perfil viram triângulo sem área | o angular deslocou vértices 1 mm em zigue-zague para o exportador aceitar | achado do núcleo: tirar os colineares antes de passar o perfil ao núcleo, o que `medidas-da-fonte.mjs` já faz |
| `arredondarAresta` deixa vértice órfão em forma facetada | relato dos agentes | achado do núcleo: arredondar no perfil 2D (`contorno` com `concordancia` ou pontos de arco), nunca na aresta 3D de uma booleana |
| `unir` com faces coincidentes e contato que exige coplanaridade | relato dos agentes | resolvida pela técnica: cada parte sai da interseção dos mesmos prismas com uma caixa de corte, e o plano de corte comum dá o contato exato |
| Seção que varia suavemente (pacote B, pacote C) e vidro com moldura | estufa do clássico e teto do rodoviário sem curva | resolvida pela técnica: seção frontal com concordâncias (`contorno` com `concordancia` ou `arco`), `inflate` em modo `secoes` com `estacoes`, ou `loft`; a moldura sai do `deslocar` do perfil para dentro |

Duas lacunas de ferramenta ficaram sem versão no repositório. A primeira é o `lasca.mjs`, que lista as faces finas do `conferir-malha` junto com a parte de cada uma e mostrou a face 8006 do experimento. A segunda é o código do experimento da perua, que prova a técnica da seção 4.2. Para ambas, a receita versionada `procedural/pecas/carro-perua/receita.js` é o exemplo da técnica: ela tem `arcoNoPerfil`, a interseção das três vistas, as caixas de roda e os contatos declarados.

## O experimento: a perua pelas três vistas

O experimento recriou a carroceria da perua (fonte pacote D Wagon, peça reprovada) pela técnica da seção 4.2, sem alterar a peça do acervo. A receita tem 164 linhas e 21 partes: carroceria com os arcos no perfil, três trechos de vidro e duas colunas na estufa, teto, duas caixas de roda, quatro pneus octogonais, quatro calotas, dois faróis e duas lanternas. Os números medidos foram estes. `comparar-silhueta`: caixa igual à fonte em x e y e 8 mm em z, fatias em z com média de 5 mm e máxima de 85 mm, fatias em y com média de 15 mm e máxima de 93 mm, zero fatias fora. `conferir-malha`: alerta de n-gon e ilhas, sem reprovação, 468 triângulos. `descrever-peca`: código 0, com os contatos declarados. `exportar-obj`: 21 corpos e 468 triângulos exportados. A folha de seis vistas leva 3 s para gerar.

A versão com `subtrair` de cilindros de 8 lados para os arcos teve a mesma silhueta e reprovou no `conferir-malha` por uma lasca no fundo da carroceria (face 8006, razão 1,81e-3 contra o limite de 3e-3); recortar o arco no perfil 2D eliminou a lasca. Sem as caixas de roda, as rodas ficavam sem contato com a carroceria e o `descrever-peca` aprovava assim mesmo.

Os números da silhueta são quase iguais aos da perua reprovada (6/71 e 20/74 mm), o que confirma que o comparador sem `--rigoroso` não separa as duas. A diferença está na imagem: a vista frontal do experimento mostra a estufa afunilando de 1005 para 856 mm de meia largura, o vinco da cintura e a saia recolhida, e a isométrica mostra as facetas da fonte, as colunas e a roda dentro do arco. O que ainda difere da fonte é o arco, que na fonte sobe mais e expõe mais roda, e a frente, onde a fonte tem o farol na quina de baixo do capô. As imagens do experimento não foram versionadas; a peça `carro-perua` do acervo, com `referencias/vistas.png`, `referencias/vistas-textura.png` e `referencias/alvo.md`, é o resultado aprovado dessa técnica.

## O que virou gate ou instrução geral

Pela regra do CLAUDE.md, cada achado desta leva vai para a ferramenta, o gate ou a instrução geral. A folha comparativa na mesma escala virou prova do roteiro `modelar/peca` para peça com `fonte-vistas.png` (`folha-comparativa.mjs`). O comparador reprova por fatia a 2% e separa a estufa (`--rigoroso` e `--cabine`). A origem e a orientação da fonte viraram campos conferidos por teste (`veiculos-referencias.json` e o campo `frente`). O gerador das medidas da fonte e a folha de seis vistas por receita entraram em `tools/modelar/` (`medidas-da-fonte.mjs` e `vistas-da-receita.mjs`). A técnica das três vistas, o arco no perfil e a caixa de roda entraram como instrução geral em `.claude/skills/criar-peca/references/operacoes-procedurais.md`, na parte de carroceria. A conexidade dos contatos e os achados de núcleo (lasca da booleana, colineares no perfil, vértice órfão do `arredondarAresta`) seguem sem correção e pedem plano próprio.


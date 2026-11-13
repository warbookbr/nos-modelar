# Modelar um veículo em chassi e lataria

Guia curto para o veículo que a referência mostra como chassi por baixo e lataria em painéis separados por frestas, como o sedã de [`procedural/pecas/sedan-chassi-e-lataria/`](../../../procedural/pecas/sedan-chassi-e-lataria/ALINHAMENTO.md). Para o veículo de volumes facetados sem painéis vale [`modelar-veiculos.md`](modelar-veiculos.md), e para a chapa contínua de superfície lisa vale [`modelar-carroceria.md`](modelar-carroceria.md). Tudo o que está aqui é receita de uso das ferramentas gerais: o núcleo não conhece veículo, e a lista de painéis, os vãos e os membros do chassi são dado do objeto.

## A casca, uma vez

A carroceria inteira se constrói uma vez, como uma chapa fechada de poucos milímetros: o sólido de fora (a interseção do perfil lateral, da planta e da seção frontal, extrudados) menos o mesmo sólido recuado da espessura, com o fundo aberto. Os painéis são pedaços dessa chapa, e por isso o vão entre dois vizinhos é o do projeto e os dois acompanham a mesma superfície. Construir um sólido por painel faz o vão depender de cada um estar certo, e o rascunho do sedã que fez assim montou a chapa 23 vezes.

## Os painéis, pelas linhas de vão

`paineisPorVaos` (`npm run capacidade -- painel` dá a ficha, e a seção correspondente de [`operacoes-procedurais.md`](../../../.claude/skills/criar-peca/references/operacoes-procedurais.md) tem o exemplo) recebe a chapa pronta, as linhas de vão desenhadas cada uma numa vista ortogonal, a largura do vão e o nome de cada painel por um ponto visto da vista dele. Ele devolve uma lâmina por linha, um só `subtrair` e uma parte por painel, com o vão medido ao longo da chapa e não no plano da vista. A linha de um lado do carro leva `alcance` para não cortar o outro lado, e a linha fechada dentro de um painel dá o pedaço de dentro como painel próprio ou o descarta. As linhas moram num módulo comum do objeto (`partes/_comum/`), porque todas as peças de painel dependem delas, e o fluxo do objeto avisa quando esse módulo muda depois da última rodada de uma peça.

## O chassi, desenhado passando e aparado

O membro do chassi que encosta por dentro na lataria (soleira, montante, parede corta-fogo, suporte do radiador, anteparo traseiro, caixa de roda) é desenhado passando da chapa e depois aparado por `intersectar` com o interior da casca, o sólido recuado que a própria casca já usa. Ele acaba na face de dentro da chapa e encosta nela. Foi a técnica que deu 70 pares de partes encostando no sedã. O membro que não toca a lataria (longarina, travessa, eixo) é caixa ou extrusão comum, e a roda sai da família `roda-pneu` por `instanciaDeFamilia` (`npm run capacidade -- roda`), uma chamada por roda.

## A ordem

Chassi com as rodas, casca, linhas de vão, painéis, vidros e acabamentos. O chassi vem primeiro porque a casca e os membros aparados se medem contra ele, e os vidros, faróis, grade e lanternas vêm por último porque ocupam os vãos que os painéis abriram. Cada passo se confere antes do seguinte: o chassi com o relato de contatos, a casca com a caixa e as vistas, os painéis com o vão.

## O que se mede

O vão e o degrau entre painéis vizinhos saem de `npm run vao:partes -- <esboço|receita> --esperado=<vão> --tolerancia=<mm> --degrau=<mm>`, medidos na malha de borda a borda, com o par fora da faixa e o ponto dele. A pele de fora de cada parte é a face da aresta que corre ao longo do vão; a parede do corte, mesmo a poucos graus da pele ou numa quina arredondada, não entra como pele, e o degrau é o menor desnível pela normal das duas peles, de modo que a quina do ombro entre dois painéis cortados por uma curva de vão mede o degrau que tem (no sedã em alta definição, de 0,03 a 0,05 mm onde saía 4,06 e 4,08). As medidas lêem a montagem do esboço de `tmp/cache-de-medida/` quando o esboço e o que ele importa não mudaram (`--sem-cache` a refaz). `--soltas=recusar` reprova a parte que não toca nenhuma outra, e `--apoia=<parte>:<motivo>` declara a que fica solta de propósito (um vidro no vão, um farol). O número diz onde olhar, e a forma continua sendo aprovada pela pessoa. A silhueta e a posição se conferem contra a referência por `npm run conferir:vistas`, e as partes que a referência não mostra, como o chassi sob a lataria, entram em `foraDaConta` com o motivo, para não pesarem na sobra nem na falta de nenhuma vista.

## O que ainda não se faz

A chapa lisa da carroceria inteira, com raio nas quinas e curvatura nos painéis, não sai com qualidade: testada só no corpo de baixo do sedã, saiu ondulada nas três vistas, e a carroceria facetada é o que o guia usa. A borda com aba (a dobra de 90 graus que fecha a porta, o capô e a tampa contra o vizinho) também não: os painéis saem com borda de chapa lisa, e o apoio dos vidros, dos faróis e das lanternas, que ficam soltos no vão, é declarado em `--apoia` até a ferramenta dar o apoio. Ambos são trabalho de ferramenta, e a decisão de aceitar a forma facetada num objeto é da pessoa.

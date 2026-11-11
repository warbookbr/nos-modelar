# Núcleo para qualquer mecanismo: do fluxo da empilhadeira às juntas, à leitura de referência e à dupla curvatura

**Estado:** ativo

**Território:** `tools/modelar/custo-por-peca.mjs`, `tools/modelar/custo-por-peca.test.mjs`, `tools/modelar/fluxo-do-objeto.mjs`, `tools/modelar/fluxo-do-objeto.test.mjs`, `tools/modelar/rodada-de-modelagem.mjs`, `tools/modelar/rodada-de-modelagem.test.mjs`, `tools/modelar/vistas-para-critica.mjs`, `tools/modelar/vistas-para-critica.test.mjs`, `procedural/pecas/carrinho-de-mao/`, `docs/modelar/banco-de-provas/carrinho-de-mao-2026-11-11/`, `procedural/nucleo/gaiola-varrida.js`, `procedural/nucleo/gaiola-varrida.test.mjs`, `procedural/nucleo/gaiola-por-lacos.js`, `procedural/nucleo/gaiola-por-lacos.test.ts`, `tools/modelar/capacidade.mjs`, `procedural/pecas/sedan-chassi-e-lataria/`, `docs/modelar/banco-de-provas/sedan-chassi-e-lataria-2026-11-11/`

**Responsável:** a IA da sessão que o ativar conduz e mede; a pessoa decide a
ordem das fatias e julga forma por imagem.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-10, com a
empilhadeira em receita até a torre.

## Problema observado

A empilhadeira foi do rascunho à receita em dezenove peças num dia, e nenhuma
dificuldade registrada veio de faltar primitiva. Vieram de faltar medida,
leitura ou junta, e estão nos itens 14 a 21 de
[`ATRITOS.md`](../banco-de-provas/empilhadeira-2026-11-09/ATRITOS.md) e nos
registros de rodada em `procedural/pecas/empilhadeira/partes/*/rodadas/`.

A montagem só mede encaixe cilíndrico e assento anular. O suporte do eixo
traseiro, o canal interno na torre, os garfos no carro e os pés do protetor
foram por posição, sem medida, e nenhuma junta gira, esterça, inclina ou sobe.
As quatro vistas de referência geradas por IA discordam entre si: a de frente
tem a altura 25% maior que a largura na mesma escala, e isso só apareceu numa
comparação feita à mão. O crítico sem contexto deu a mesma nota a três rodadas
da carcaça com defeitos diferentes em cada uma, leu três vezes como defeito um
encaixe medido como certo, por não ter vista em corte, e comparou a vista de
lado do protetor com as fotos de frente e de trás. A família de roda recusava
o pneu industrial e a de cilindro hidráulico não cobriu nenhum dos dois
cilindros da máquina. A coluna de trás do protetor e a alça ficaram em
extrusões cruzadas porque a varredura só faz seção constante. O rebaixo, o vão
e a costura sobre superfície de dupla curvatura têm três planos próprios, um em
rascunho e dois ativos, e são o que um carro esportivo ou uma moto pedem.

## Resultado

Uma IA leva um objeto mecânico novo, de uma referência em texto ou imagem até
a montagem com as juntas medidas, por um caminho só de comandos, e o custo por
peça, medido em rodadas de crítico e em tempo de modelador, cai de um objeto de
prova para o seguinte.

## Método

Cada objeto completo entra com uma pergunta escrita no plano dele: que
capacidade ele prova. O que ele revela vai para a ferramenta geral, o gate ou a
instrução, e nunca para o arquivo dele, como o `CLAUDE.md` já manda. O acervo
não cresce por catálogo: um objeto só entra quando a fatia que ele prova está
pronta. Este plano executa as fatias 0 e 1; cada fatia de 2 a 6 abre plano
próprio quando chegar a vez, com o território dela, e este arquivo fica como o
roteiro que diz a ordem e o critério de saída de cada uma.

## Filtro Agent-First

- `conferir:vistas`, `silhueta:pedida`, `sobra:partes` e `vista:rapida`: USAR
  DIRETO; são a camada de conferência que a empilhadeira provou.
- `rodada-de-modelagem`, `vistas:critica` e `etapas`: ENVOLVER num comando de
  fluxo que diz o próximo passo do objeto; hoje quem conduz encadeia os três e
  monta registro à mão quando um modelador entrega mais de uma peça.
- A montagem v5: REFATORAR, com relações novas e versão nova do formato salvo;
  é a mudança de maior risco e tem plano próprio.
- `contorno` e `contorno:prancha`: ENVOLVER numa reconciliação das vistas, que
  devolve a medida adotada e o conflito entre as fontes como campo.
- As famílias: USAR DIRETO, alargadas por opção declarada, como o ombro largo
  da `roda-pneu`.
- Núcleo de CAD externo: ADIAR sem prazo; a pessoa decidiu que o projeto cresce
  pelas próprias ferramentas.

## Incluído

- a linha de base de custo por peça, tirada dos registros da empilhadeira;
- o comando de fluxo e os três ajustes do pacote do crítico (fatia 1);
- o roteiro das fatias 2 a 6, com a pergunta e o critério de saída de cada uma.

## Excluído

- a implementação das fatias 2 a 6, que é de planos próprios;
- material, textura e paleta, que seguem a regra do `CLAUDE.md`;
- arquitetura como objeto de prova, que exige pouco do que falta.

## Gate de saída

1. A tabela de custo por peça da empilhadeira existe e sai de um comando.
2. Uma peça nova simples vai da referência à etapa fixa pelo comando de fluxo,
   sem registro montado à mão por quem conduz.
3. O pedido ao crítico traz a referência que vale para cada vista e uma vista
   em corte no plano de cada encaixe declarado, e a rodada seguinte recebe a
   contradição com a anterior.
4. `npm run gates` verde, e cada fatia de 2 a 6 com plano próprio em rascunho
   ou com a razão de não abrir.

## Fatias

0. **Linha de base, entregue em 2026-11-10.** Um comando (`npm run custo:peca`) lê os registros de rodada de um objeto e dá,
   por peça, as rodadas, as notas, os defeitos por atribuição e o que ficou
   aberto. Saída: a tabela da empilhadeira no banco de provas, em
   [`CUSTO-POR-PECA.md`](../banco-de-provas/empilhadeira-2026-11-09/CUSTO-POR-PECA.md).
   A empilhadeira deu 19 peças em 30 rodadas, média de 1,58 por peça, 6 fechadas
   na primeira rodada e 12 fixas por aceite com 28 defeitos abertos; das
   atribuições, 19 foram ao plano, 10 ao modelador, 8 à ferramenta e 2 ao
   crítico. O avião dá 2,75 rodadas por peça e o braço 6, pelo mesmo comando.
   Nenhum registro traz data, e gravá-la entra na fatia 1.
1. **Fluxo único, ferramentas entregues em 2026-11-11; falta a peça de prova.**
   `npm run fluxo:objeto` diz em que passo o objeto está e o próximo comando,
   da referência à etapa fixa. O registro da rodada escolhe o relato de cada
   peça num texto com várias, grava a data e mostra contradições e repetições
   entre rodadas. O pedido ao crítico diz a referência que vale para cada
   vista, traz até quatro vistas em corte no plano dos encaixes, com a folga
   escrita, e lista o que rodadas anteriores atribuíram ao plano, à ferramenta
   ou ao crítico. Prova: o eixo dianteiro da empilhadeira, que dois críticos
   leram com nota 6 e o assento como defeito, recebeu nota 8 sem defeito de um
   crítico sem contexto com o pacote novo, que leu no
   [corte](../banco-de-provas/empilhadeira-2026-11-09/corte-do-assento-do-eixo-dianteiro.png)
   a folga de 0,35 mm sob o teto do entalhe. Falta o item 2 do gate: uma peça
   nova simples levada da referência à etapa fixa só pelo comando de fluxo.
2. **Juntas na montagem** (plano próprio). Assento plano, guia prismática e
   articulação com eixo e curso entre instâncias, e a etapa nomeada antes de
   ter receita. Pergunta: a montagem mede o que hoje vai por posição? Saída:
   uma fixture sem domínio por relação, e a empilhadeira com o giro das rodas,
   o esterço, a inclinação e a elevação medidos.
3. **Leitura de referência** (plano próprio). A reconciliação das vistas, com a
   escala de cada uma, a medida adotada com a fonte e o conflito acusado antes
   de modelar. Saída: os 25% da vista de frente da empilhadeira saem da
   ferramenta, sem comparação à mão.
4a. **Tubo dobrado e chapa fina, neste plano; ajudantes entregues em 2026-11-11, falta a prova nas receitas.** Na `gaiolaVarrida`, o
   trilho em polilinha com raio nos cantos e o quadro que mantém a seção
   perpendicular ao caminho nas subidas; na `gaiolaPorLacos`, a casca aberta
   com espessura de chapa. Vêm dos itens 6 a 9 dos atritos do carrinho de mão.
   Saída: o chassi, os pés e a caçamba do carrinho saem cada um de um passo do
   ajudante, com o tubo de seção redonda a 1 mm em toda estação e a chapa na
   espessura pedida, e as saídas de hoje dos dois ajudantes ficam idênticas
   sem as opções novas.
   Entregue: o trilho `{ pontos, raios, fechado }`, o quadro `modo:
   'acompanha'`, o aviso da seção achatada no modo fixo e as estações por
   ângulo e flecha, na varredura; `aberta`, `bocas` e a conferência de
   `espessura` com o aviso `cantoApertado`, nos laços. No tubo do chassi do
   carrinho a seção ia a 26,8 mm na subida da manopla e fica em 32,0; a caçamba
   sai com a mesma malha e a chapa de 1,5 mm, sem apagar face à mão. A guarda do
   acervo não mudou em nenhuma das 83 peças.
4. **Forma por classe** (um plano por classe). Tubo e chapa dobrada, com a
   varredura de seção variável; e dupla curvatura com rebaixo, vão e costura,
   que depende dos planos de rebaixo por contorno, de aberturas e de costuras.
   Saída: a coluna de trás do protetor e a alça num passo, e uma fixture de
   lataria com rebaixo, vão e costura sem defeito de malha.
5. **Famílias** (plano próprio). A regra de promoção, pela qual vira família o
   que apareceu em dois objetos, e a `cilindro-hidraulico` alargada. Saída: os
   dois cilindros da empilhadeira saem da família com a mesma malha.
6. **Objetos de prova** (um plano por objeto). A moto, para tubo dobrado com a
   mecânica exposta; o carro esportivo, para dupla curvatura; o robô humanoide,
   para as juntas. Cada um entra depois da fatia que prova. Saída: o custo por
   peça de cada um abaixo do anterior, pela tabela da fatia 0.

## Riscos e parada

A fatia 2 muda o formato salvo da montagem: se a versão nova não ler as
montagens do avião e do braço como estão, para e volta à pessoa. As fatias 1 e
4 encostam no território dos planos de conferência, de aberturas e de costuras:
cada uma espera o plano dono fechar ou combina o arquivo com ele. Se o custo
por peça do primeiro objeto de prova não ficar abaixo do da empilhadeira, o
roteiro para antes do segundo objeto e a ordem das fatias é revista com a
pessoa.

## Ativação

Ativo desde 2026-11-10, quando o plano da empilhadeira fechou e a pessoa disse
"ok, pode fechar e ativar o plano do núcleo". O território é o das fatias 0 e
1. O pedido do crítico e a vista em corte ficam em arquivos do plano das partes
do braço e do de ferramentas de conferência e de vista, e entram combinados com
eles, como a seção de riscos diz.

Em 2026-11-11 a pessoa mandou seguir com a fatia 1, e `vistas-para-critica.mjs`
passou do plano das partes do braço a este durante a fatia; ele volta àquele
território quando ela fechar.

No mesmo dia a pessoa escolheu o carrinho de mão como a peça de prova da fatia
1, aprovou o rascunho dele por imagem ("Sim a forma esta boa") e perguntou
quando entram as três faltas de tubo dobrado e chapa fina que ele mostrou. Com
os seis lugares de plano ativo ocupados e os arquivos livres desde que o plano
da empilhadeira fechou, a metade de tubo e chapa da fatia 4 é feita dentro
deste plano, antes das receitas do carrinho, que passam a ser a prova dela. A
escala do carrinho fica pelo pneu de 340 mm, como recomendado.

Ainda em 2026-11-11 a pessoa pediu um teste em paralelo: saber se o projeto dá
à IA o que ela precisa para modelar bem o chassi e a lataria de um carro, com o
sedã vermelho do acervo (`carro-sedan-classico`) como referência. O teste é um
diagnóstico e não implementa nada no núcleo. Um objeto novo,
`sedan-chassi-e-lataria`, é levado pelo fluxo com a lataria em painéis de chapa
separados por vão, apoiados num chassi com contato medido, e cada dificuldade
entra em `ATRITOS.md` do banco de provas com a atribuição. A saída é a lista do
que falta ao projeto para carro, que alimenta as fatias 4 e 6.

Na sequência a pessoa disse que, terminado o diagnóstico do sedã, a IA da
sessão analisa e implementa as melhorias que fariam diferença para a modelagem,
no núcleo ou nas ferramentas, e deixou o carrinho e o sedã com ela até o fim,
sem supervisão nem aprovação: "deixo esse trabalho de maneira autonoma para
você até o fim a partir de agora [...] não vou ter tempo para supervisionar nem
aprovar então deixo sobre sua tutoria". O aceite de forma dessas duas provas
fica registrado como delegado, com essas palavras.

## Fechamento

Preencher somente ao concluir ou cancelar.

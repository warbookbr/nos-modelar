# Abertura de contorno em qualquer direção — o vão que dobra a quina sai inteiro, e os limites da operação ficam medidos

**Estado:** ativo

**Território:** `procedural/nucleo/operacoes/abertura-por-contorno.js`, `procedural/nucleo/operacoes/abertura-por-contorno.test.ts`, `tools/fixtures/abertura-de-prova/`, `tools/fixtures/aberturas-em-teste/`, `docs/modelar/banco-de-provas/abertura-em-qualquer-direcao-2026-11-06/`, `procedural/nucleo/uso-operacoes.js`, `procedural/nucleo/gaiola-por-lacos.js`, `procedural/nucleo/gaiola-por-lacos.test.ts`

**Responsável:** sessão de trabalho do furgão, a pedido da pessoa em 2026-11-06; o furgão fica em pausa enquanto este plano corre

**Repositório e base:** este repositório, a partir da main de 2026-11-06 com os faróis e a grade do furgão aceitos

## Problema observado

A `aberturaPorContorno` corta a chapa pelo contorno desenhado numa vista, projetado ao longo de um dos três eixos. No furgão, em 2026-11-06, a lanterna traseira que dobra a quina (a opção 1 escolhida pela pessoa) não coube num vão só: a vista de trás não alcança a lateral e a de lado não alcança a traseira, e o modelador fez dois vãos, um em cada vista, que a operação só aceitou a 30 mm um do outro, deixando uma faixa de lataria de 35 mm na quina (commit `c4efe203`, fora da main). O processo não pegaria isso: a peça de teste da operação é uma chapa curva aberta, vista de um lado só, e o caso da camada (`sentido`) foi provado em duas chapas empilhadas. Nenhuma peça de teste tem um vão que dobra quina, dois vãos vizinhos, um vinco cruzando o contorno, um corpo de três camadas ou uma chapa de outra gaiola, e cada um desses casos já apareceu ou vai aparecer numa peça real.

## Resultado

A receita dá uma direção qualquer para a vista, e o vão que dobra a quina de uma caixa de quinas redondas sai num vão só, fechado e com a borda sobre o desenho; uma bateria de peças de teste neutras, com formas e topologias diferentes, mede a operação em cada uma, e cada limite achado vira correção ou recusa com a medida e o que fazer.

## Filtro Agent-First

- A vista em qualquer direção: **REFATORAR** a operação para aceitar `vista` como vetor, além de `'x'`, `'y'` e `'z'`, com o desenho no plano perpendicular a ele, em vez de criar uma operação nova.
- A bateria de limites: **USAR DIRETO** as medidas que a peça de teste da abertura já tem (malha fechada, triângulo sem área, lasca, borda contra o desenho, bico), aplicadas a cada peça nova.
- O furgão: **ADIAR** para o plano dele, que estreita as portas traseiras e refaz as lanternas pela vista diagonal quando voltar.
- O custo da booleana sobre a chapa inteira (no backlog): **ADIAR**, mas medido na bateria, numa chapa do tamanho da do furgão.

## Incluído

- a vista por vetor, com o teste do vão que dobra a quina numa caixa de quinas redondas;
- a bateria de peças de teste em `tools/fixtures/aberturas-em-teste/`, uma por caso, cada uma com o gate de malha e de borda: o vão que dobra a quina; dois vãos vizinhos (a menor folga entre eles) e o vão dentro da lente de outro; o contorno que cruza um vinco vivo e o que passa perto da borda da chapa; o contorno côncavo (em L e em estrela) e o de bico muito agudo; a superfície de dupla curvatura forte; o corpo fechado de três camadas na mesma reta (um tubo dobrado em U) com `sentido`; e a chapa feita por outra gaiola (por rede e por laços);
- a correção de cada limite que couber na operação, ou a recusa com a medida e o que fazer;
- o tempo de cada caso e o de um vão numa chapa do tamanho da do furgão;
- o [banco de provas](../banco-de-provas/abertura-em-qualquer-direcao-2026-11-06/README.md) com as medidas e as imagens das peças, para a pessoa ver.

## Excluído

- mudar a receita do furgão;
- vão por contorno que não seja projetado (desenhado sobre a superfície);
- mudar a booleana do núcleo (`booleanas.js`).

## Gate de saída

1. O vão que dobra a quina sai num vão só, fechado, sem triângulo sem área nem lasca, com a borda a menos de 0,5 mm do desenho nas duas faces.
2. Cada caso da bateria tem um teste que passa, ou uma recusa testada com mensagem que diz o que fazer, e o banco de provas diz qual.
3. Os testes da abertura de antes continuam passando, e a abertura do furgão sai com a mesma malha.
4. O arquivo de teste da abertura cabe no teto da bateria rápida, ou os casos pesados vão para os testes lentos.
5. A pessoa vê as peças de teste em imagem.

## Fatias

1. A vista por vetor e o vão que dobra a quina.
2. A bateria: uma peça por caso, rodada e medida, com a tabela de limites.
3. As correções e as recusas.
4. O fechamento, com as imagens para a pessoa.

## Riscos e parada

Se a vista diagonal não fechar a malha na quina por causa da costura com faces quase paralelas à direção, o limite fica como recusa com o ângulo medido, e o vão da quina passa a ser dois vãos soldados numa operação de junção, em plano próprio. Se a bateria achar mais limites que o plano comporta, os que não bloqueiam um caso real vão ao backlog com a medida.

## Fechamento

Preencher somente ao concluir ou cancelar.

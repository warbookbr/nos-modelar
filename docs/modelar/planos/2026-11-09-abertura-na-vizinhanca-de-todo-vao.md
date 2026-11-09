# Abertura na vizinhança de todo vão: o vão grande e o vão junto de outro também recortam só o trecho dele

**Estado:** ativo

**Território:** `procedural/nucleo/operacoes/abertura-por-contorno.js`, `procedural/nucleo/operacoes/abertura-por-contorno.test.ts`, `tools/fixtures/aberturas-em-teste/`, `tools/modelar/acervo-real.test.mjs`, `tools/modelar/guardas/abre-na-bancada.test.mjs`

**Responsável:** a IA da sessão do furgão, com as decisões técnicas delegadas pela pessoa em 2026-11-09; a pessoa é a
crítica por imagem e só vê o furgão se a malha dele mudar de forma.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-09, com a janela da cabine em dois vidros.

## Problema observado

Com a janela da cabine em dois vidros (2026-11-09), o envio `342e7f16` reprovou no CI por tempo: o furgão levou 506 s nas
duas execuções do `acervo-real.test.mjs`, acima do teto de 420 s, e o `abre-na-bancada.test.mjs` passou do prazo de 180 s.
O perfil local por passo dá 207 s por execução, contra 118 s antes da janela, e 140 s deles em oito chamadas de
`aberturaPorContorno` que não recortam a vizinhança e fazem a booleana sobre as 102 mil faces da chapa. O motivo que o
registro (`vizinhanca.motivo`) dá em cada uma:

- os dois vidros grandes da janela (origens 1200 e 1201): a banda liga vértices a 690 mm, mais que 1,5 vez a aresta de 70 mm
  da borda, e as duas voltas não se correspondem;
- os dois vidros que encostam no vão vizinho (1202 e 1203): a borda sai com quatro voltas, e não duas, mesmo tiradas as faces
  de parede do outro vão;
- os quatro vãos de cima das faixas da lanterna (1101, 1103, 1105 e 1107), que já eram o item do backlog "Vizinhança da
  abertura colada à parede de outro vão": a borda sai com uma volta ou toca a si mesma, por lascas de 1 a 3 mm rentes ao
  chanfro do vão da porta.

O teto do furgão subiu a 860 s e o prazo dos dois testes a 1.000 s e 600 s no mesmo dia, para o envio não ficar parado, e
voltam a cair com este plano.

## Resultado

Os oito vãos do furgão recortam só a vizinhança, com o motivo de cada um vazio no registro, e a execução local do furgão
volta a menos de 130 s, com os tetos dos dois testes de volta à razão de 1,7 vez o medido no CI.

## Filtro Agent-First

REFATORAR a escolha da vizinhança dentro de `aberturaPorContorno`, sem argumento novo na receita: o agente que declara um vão
não deve saber se a booleana viu a chapa inteira ou só o trecho, e o registro continua dizendo qual foi e por quê. USAR
DIRETO o `vizinhanca.test.ts` e o perfil por passo como prova.

## Incluído

- a banda da vizinhança que se corresponde no vão grande, medida pela aresta da malha de cada trecho, e não por um limite só
  para a volta inteira;
- a vizinhança que absorve o tubo de parede inteiro do vão vizinho, quando a borda encosta nele;
- uma peça de prova em `tools/fixtures/aberturas-em-teste/` para cada um dos três motivos, que hoje cai na chapa inteira e
  passa a recortar, com a malha do vão igual à da chapa inteira dentro da tolerância da booleana;
- os tetos do `acervo-real.test.mjs` e do `abre-na-bancada.test.mjs` medidos de novo.

## Excluído

- mudar a receita do furgão para contornar o limite;
- o custo do retrato da procedência e da medida de contato, que seguem no backlog.

## Gate de saída

1. As três peças de prova recortam, e o vão sai igual ao da chapa inteira: mesma borda a menos de 0,5 mm, volume igual a
   menos de 3e-4 e nenhuma lasca nova.
2. O registro do furgão não traz `vizinhanca.motivo` em nenhum vão, e o perfil local dá menos de 130 s por execução.
3. A malha do acervo inteiro sai igual à de antes fora dos vãos que passaram a recortar; o furgão, se mudar a triangulação
   junto deles, vai à pessoa com as vistas de antes e depois.
4. Os tetos voltam a 1,7 vez o medido no CI, e o CI do envio fica verde.

## Fatias

1. As três peças de prova, cada uma falhando com o motivo de hoje.
2. A banda medida por trecho, para o vão grande.
3. O tubo de parede do vão vizinho absorvido, para o vão junto de outro e para a lanterna.
4. O furgão medido, os tetos de volta e o fechamento.

## Riscos e parada

Se recortar a vizinhança mudar a forma do vão em relação à chapa inteira além da tolerância, o vão volta à chapa inteira com
o motivo no registro e a decisão fica escrita aqui, sem esconder o custo; se a única saída for mudar o contrato da operação,
o plano para e a mudança é proposta antes.

## Fechamento

Preencher ao concluir ou cancelar.

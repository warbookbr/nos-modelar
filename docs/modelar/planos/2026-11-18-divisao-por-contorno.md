# Divisão por contorno: a parte de uma chapa sai com a borda na curva declarada, e não em dentes de serra

**Estado:** ativo

**Território:** `procedural/nucleo/operacoes/divisao-por-contorno.js` e o teste dele, `procedural/nucleo/nucleo.js` (o registro da operação nova e a entrega dos pedaços da divisão na resolução de origem), `procedural/nucleo/catalogo.test.mjs` (o teto e o total), `procedural/nucleo/fixtures/motor-r00-baseline.json`, `tools/arquitetura/mapear-motor-procedural.test.mjs` (a dependência nova), `docs/modelar/banco-de-provas/divisao-por-contorno-2026-11-18/`. A operação reaproveita o corte da operação de abertura por contorno sem mudá-lo, porque ele é do plano da correção de superfície; se precisar mudar, é empréstimo pedido a esse plano. A entrada da operação no guia de uso das operações é empréstimo do plano da correção de superfície, dono desse arquivo. O uso na lataria do carro entra como prova pelo plano do carro.

**Responsável:** a IA da sessão implementa e conduz a revisão adversarial; Tiago pediu o plano em 2026-11-18, com permissão para estendê-lo se a operação de abertura não servir, e aprova a borda por imagem.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-18 (6380144a), ativado pela pessoa com três planos ativos.

## Problema observado

Na lataria do `carro-fastback`, as partes `paralamaTraseiro` e `rebaixoLateral` saem do passo `parte` com `sel: { regiao: caixa(...) }` (`procedural/pecas/carro-fastback/partes/lataria/receita.js`), que pega faces inteiras da chapa subdividida pela caixa. A borda de cada parte fica em degraus do tamanho das faces, e o crítico reprovou o contorno dessas duas partes em dentes de serra nas rodadas 6 e 7 (registro 05 e rodada 7). A forma da chapa não muda com isso: a seleção só marca as faces. Não há no motor uma operação que divida uma chapa em partes ao longo de uma curva sobre ela.

## Resultado

Uma chapa se divide em partes ao longo de um contorno declarado sobre a superfície, cortando as faces na curva, com a mesma superfície antes e depois do corte (a união das partes é a chapa, sem buraco, sem sobreposição e sem face fina), e a borda de cada parte segue a curva.

## Filtro Agent-First

ENVOLVER sobre o corte de `aberturaPorContorno`: em vez de tirar a região de dentro do contorno, a operação a entrega como parte nova. USAR DIRETO na receita do carro, no lugar da seleção por caixa, como prova.

## Incluído

- a operação `divisaoPorContorno` (contorno projetado na chapa, faces cortadas na curva, parte nova com nome e material), com recusa clara de contorno que não cai na chapa ou se cruza;
- a prova em chapa de teste: área das partes somada igual à da chapa, nenhuma aresta livre nova fora da borda da chapa, nenhuma face abaixo do limite de face fina, e a borda a menos de uma tolerância da curva;
- a prova na lataria do carro pelo plano do carro: as duas partes com a borda na curva, a malha da chapa somada igual à de antes em forma, e a imagem das partes isoladas à pessoa.

## Excluído

- mudar a forma da chapa ou a curvatura dela, que é das etapas da curvatura contínua;
- mudar `aberturaPorContorno`, salvo por empréstimo pedido ao plano da correção de superfície.

## Gate de saída

1. Testes da operação nos dois sentidos e de cada recusa.
2. As partes do carro com a borda na curva, sem face fina, e a forma da chapa igual.
3. Imagem das partes isoladas aprovada pela pessoa.
4. Revisão adversarial sem bloqueio.

## Fatias

1. A operação sobre o corte da abertura, com a chapa de teste.
2. A prova no carro e o fechamento.

## Riscos e parada

Se o corte da abertura não servir para dividir sem tirar (por exemplo, se ele só sabe furar), o plano cresce para um corte próprio, e a pessoa já autorizou a extensão; isso fica escrito aqui antes de começar. Se o corte criar face fina que a malha do carro não aceita, a operação para e volta à pessoa com a medida.

Em 2026-11-19, na fatia 1, o plano cresceu para um corte próprio, no mesmo arquivo da operação: o corte da `aberturaPorContorno` é a booleana de um prisma contra um sólido fechado, que tira a região de dentro e fecha o vão com uma parede nova, e a função que o faz (`cortar`) não é exportada; dividir sem tirar pede a mesma pele com arestas novas sobre ela, sem parede e com a área somada igual. A operação reaproveita da abertura, por importação e sem mudá-la, o quadro da vista (`quadroDaVista`) e a retirada do vértice de valência dois (`tirarValenciaDois`). As provas da fatia 1 estão no [banco de provas](../banco-de-provas/divisao-por-contorno-2026-11-18/README.md).

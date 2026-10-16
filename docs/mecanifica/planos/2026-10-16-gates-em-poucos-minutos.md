# Gates em poucos minutos — a bateria completa volta a caber no trabalho sem tirar nenhuma conferência

**Estado:** ativo

**Responsável:** Claude, com a pessoa decidindo o que roda só no envio à main

**Repositório e base:** `warbookbr/nos-mecanifica`, ramo `claude/revisar-plano-ativo-cyj8c3`

**Sucessor:** [importar objeto de código](congelados/2026-10-15-importar-objeto-de-codigo.md), congelado em 2026-10-16 para dar lugar a
este plano, volta como ativo quando este fechar.

## Problema observado

Em 2026-10-16, `npm run gates` levou mais de 20 minutos no contêiner de 4 processadores. Os outros gates terminam em poucos minutos,
rodando em paralelo, e quase todo o tempo é do gate `test` (`vitest run`), que roda a suíte inteira: só os testes de `modulos/esboco` e da
ajuda levaram 550 s numa rodada isolada, e o teste do importador de STEP, entrado no mesmo dia, leva 50 s sozinho. A suíte cresce a cada
peça do acervo e a cada ferramenta, porque muitos testes geram a geometria inteira ou abrem o navegador, e nada vigia esse tempo. No
mesmo dia, três baterias completas rodaram ao mesmo tempo (a da integração e as de dois agentes), disputando a máquina, e cada agente
gastou de 40 minutos a uma hora só esperando gates. O `.claude/agents/implementador.md` já proíbe o agente de rodar `npm run gates`, mas
os briefs da sessão principal pediam o contrário; o processo não pegou isso.

## Resultado

A bateria padrão de `npm run gates` termina em até 5 minutos no contêiner de 4 processadores, e todo teste continua rodando antes do envio
à main.

## Filtro Agent-First

- **Duração por arquivo de teste, pelo Vitest:** USAR DIRETO. O repórter JSON do Vitest dá a duração de cada arquivo e de cada teste;
  basta gravá-la.
- **Paralelismo do Vitest (`pool`, `maxWorkers`, isolamento):** USAR DIRETO, pela configuração em `vitest.config.ts`, medindo antes e
  depois. O orçamento de 20 s por teste dessa configuração continua.
- **Escolha da bateria em `tools/gates.mjs`:** REFATORAR. Ele já escolhe a bateria curta quando só mudou peça ou documento; passa a
  separar também os testes lentos, que rodam quando o que eles cobrem muda, com `--completo` e antes do envio à main.
- **Orçamento de tempo por teste:** ENVOLVER, num gate que lê a duração gravada e reprova o teste da bateria padrão que passa do limite,
  com a lista para a pessoa decidir se ele fica mais leve ou vai para a bateria lenta.
- **Instrução aos agentes:** ENVOLVER. A regra do implementador vale para todo agente que mexe em código, e o brief que a sessão principal
  escreve não a contraria.

## Incluído

- a medição da suíte por arquivo, gravada, com os mais lentos nomeados;
- a separação entre testes rápidos e lentos, declarada num arquivo único que o `gates.mjs` e o CI leem, e o mapa de que caminhos
  disparam cada teste lento;
- o ajuste do paralelismo do Vitest, medido;
- o gate de orçamento de tempo, com teste;
- a lista do CI em `.github/workflows/ci.yml` igual à local, que o `reguas:check` já confere;
- a instrução, no `CLAUDE.md` ou na skill de orquestração, de que agente roda só os testes do que tocou e a bateria completa roda uma vez,
  na integração.

## Excluído

- apagar teste ou afrouxar o que um teste confere;
- mudar peça, família, núcleo ou ferramenta para ficar mais rápida, salvo quando a lentidão for defeito do teste, como gerar a mesma
  geometria várias vezes;
- trocar o Vitest ou o CI de serviço.

## Invariantes

Nenhuma conferência some: todo teste que existe hoje roda, pelo menos, com `--completo` e antes do envio à main. A saída de `npm run gates`
continua não zero quando qualquer gate falha, e o relatório continua mostrando todos de uma vez.

## Gate de saída

1. três medições da bateria padrão no contêiner de 4 processadores, todas em até 5 minutos, gravadas com a data;
2. a medição da bateria lenta e da `--completo`, gravadas;
3. o gate de orçamento de tempo em vigor e testado, e o `reguas:check` verde;
4. `npm run gates -- --completo` verde;
5. a decisão da pessoa sobre o que roda só no envio à main registrada.

## Fatias

1. **Medição.** A duração por arquivo da suíte inteira, gravada, e os vinte mais lentos com o motivo provável (geometria, navegador,
   WASM, espera).
2. **Separação e paralelismo.** O arquivo dos testes lentos, o mapa de caminhos, o `gates.mjs` escolhendo a bateria, o CI igual e o
   paralelismo ajustado, com a bateria padrão medida.
3. **Orçamento e instrução.** O gate de tempo e a instrução aos agentes.
4. **Fechamento.** As medições finais, a decisão da pessoa e o descongelamento do sucessor.

## Riscos e parada

Para e volta à pessoa se a bateria padrão não chegar a 5 minutos sem tirar teste dela que cubra código mudado com frequência, ou se o
paralelismo maior tornar a suíte instável, com teste que passa sozinho e falha junto.

## Fechamento

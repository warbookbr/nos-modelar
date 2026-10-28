# Gates em poucos minutos — a bateria completa volta a caber no trabalho sem tirar nenhuma conferência

**Estado:** concluído

**Responsável:** Claude, com a pessoa decidindo o que roda só no envio à main

**Repositório e base:** `warbookbr/nos-mecanifica`, ramo `claude/revisar-plano-ativo-cyj8c3`

**Sucessor:** [importar objeto de código](2026-10-15-importar-objeto-de-codigo.md), que voltou a ser o ativo quando este fechou e foi concluído no mesmo dia.

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

## Medição da fatia 1 (2026-10-16)

A suíte inteira, sozinha no contêiner de 4 processadores, sem outra bateria rodando: 368 arquivos e 5.949 testes, todos verdes, em
1.100 s de relógio (18 min), com 1.980 s somados por arquivo. Os 309 arquivos de até 5 s somam 155 s; os 59 acima de 5 s somam 1.824 s
(92%), e os 36 acima de 10 s somam 1.664 s. O arquivo mais lento, o da superfície aerodinâmica, leva 309 s sozinho, mais que a meta da
bateria inteira, e por isso nenhum ajuste de paralelismo basta sem separar os lentos. Medido com `npx vitest run --reporter=json`.

| Arquivo | s | Testes | Motivo provável |
|---|---|---|---|
| `procedural/familias/superficie-aerodinamica/superficie-aerodinamica.test.js` | 309 | 76 | geometria da família em amostras sorteadas, com a solidez de cada uma |
| `tools/modelar/esboco-blocagem.test.mjs` | 196 | 70 | blocagem N2 pela Manifold, objeto a objeto |
| `procedural/familias/roda-pneu/roda-pneu.test.js` | 108 | 89 | geometria da família em vários perfis |
| `tools/modelar/guardas/guarda-acervo.test.mjs` | 101 | 11 | gera e mede todas as peças do acervo |
| `procedural/familias/movel-de-caixa/movel-de-caixa.test.mjs` | 98 | 36 | geometria da família em vários perfis |
| `tools/modelar/calibracao-do-critico.test.mjs` | 75 | 37 | imagens do conjunto de calibração |
| `modulos/esboco/tests/brief-do-critico.test.js` | 70 | 27 | desenho das vistas do brief |
| `tools/modelar/esboco-importar-csg.test.mjs` | 59 | 71 | OpenSCAD e Manifold no corpus real |
| `tools/modelar/familia.test.mjs` | 52 | 10 | geometria das famílias pela ferramenta |
| `tools/mcp/mcp.test.mjs` | 52 | 41 | servidor MCP e capturas |
| `procedural/familias/dobradica/dobradica.test.mjs` | 51 | 9 | geometria da família |
| `tools/modelar/desenho.test.mjs` | 43 | 45 | desenho e rasterização |
| `modulos/esboco/tests/projecao.test.js` | 37 | 23 | projeção das vistas |
| `procedural/familias/cilindro-hidraulico/cilindro-hidraulico.test.js` | 30 | 33 | geometria da família |
| `tools/modelar/rodada-de-modelagem.test.mjs` | 25 | 29 | rodada com captura |
| `modulos/esboco/tests/condutor.test.js` | 24 | 39 | Condutor com imagens |
| `tools/oficina/sonda-supercarro-1-0.test.mjs` | 23 | 5 | sonda de peça grande |
| `modulos/esboco/tests/contato.test.js` | 22 | 27 | gate de contato |
| `modulos/esboco/tests/critico.test.js` | 22 | 13 | desenho para o crítico |
| `modulos/esboco/tests/desempenho.test.js` | 20 | 12 | medida de desempenho |

## Fatia 2 (2026-10-16)

A suíte se divide pela lista de `tools/testes-lentos.mjs`: os 59 arquivos acima de 5 s, os testes do servidor MCP e os que abrem a bancada,
64 ao todo. `npm run test:rapidos` roda os outros 305 sempre, com quatro trabalhadores do Vitest em vez de dois, e levou 97 s sozinho;
`npm run test:lentos` roda só os lentos ligados por importação ao que mudou desde o ramo remoto (`vitest --changed`), e todos no CI, com
`--completo` e quando não se sabe o ramo remoto. A guarda do acervo e as duas conferências de família, que sozinhas levavam 3,7, 2,2 e
1,9 minutos, só entram na bateria local quando muda um caminho que elas conferem (`GATES_POR_CAMINHO` em `tools/gates.mjs`), pela decisão
da pessoa de 2026-10-16, e continuam no CI e no `--completo`. Três medições seguidas da bateria padrão, sem nada mudado desde o ramo
remoto: 281 s, 286 s e 289 s, todas verdes. O caminho crítico passou a ser o `test:rapidos` disputando a máquina (210 s junto com os
outros gates) e o par `mcp:check` e `mcp:visual:check`, que dividem o servidor e somam 241 s.

## Riscos e parada

Para e volta à pessoa se a bateria padrão não chegar a 5 minutos sem tirar teste dela que cubra código mudado com frequência, ou se o
paralelismo maior tornar a suíte instável, com teste que passa sozinho e falha junto.

## Fechamento

Concluído em 2026-10-16. A bateria padrão de `npm run gates` passou de 27 minutos para 281 s, 286 s e 289 s em três medições seguidas, todas
verdes, com os testes divididos em rápidos e lentos (fatia 2) e a guarda do acervo e as conferências de família fora da bateria local
quando nada do que conferem mudou. A fatia 3 pôs o teto de 30 s por arquivo na bateria rápida, que reprova dizendo o arquivo, e a regra,
gerada do `roteiros.json` para o `CLAUDE.md`, de que agente despachado não roda a bateria. `npm run gates -- --completo` passou com os 38
gates verdes em 1.315 s (22 min), dos quais 1.154 s são do `test:lentos` rodando todos. O `reguas:check` e o teste que espelha os gates
no CI ficaram verdes com a troca de `test` por `test:rapidos` e `test:lentos` no `ci.yml`.

A pessoa decidiu em 2026-10-16 que todo envio à main roda a bateria completa antes, com `--completo` na máquina ou pelo CI, que roda
todos os testes e todos os gates.

Durante o plano, um commit foi enviado com dois testes vermelhos, porque o envio foi encadeado sem esperar o resultado da conferência; o
teste dos roteiros pegou o `CLAUDE.md` editado à mão, e a correção saiu no commit seguinte. O processo pegou o defeito, e o que faltou
foi esperar o resultado antes de enviar.

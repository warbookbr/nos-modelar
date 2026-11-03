# Descrever rápido — o mesmo resultado em uma fração do tempo

**Estado:** concluído

**Território:** `src/autoria/contato-de-solidos.js`, `src/autoria/contatos-da-peca.js`, `src/autoria/descrever-partes.js`, `src/autoria/arvore-de-caixas.js`

**Responsável:** sessão principal, com implementador despachado

**Repositório e base:** `warbookbr/nos-modelar`, ramo de trabalho do furgão realista

## Problema observado

O `descrever` do `furgao-realista` (160.284 faces, 25 partes) leva uns 14 minutos, e o laço curto da modelagem espera por ele. Um experimento feito fora do repositório em 2026-11-03, com perfil de CPU, mostrou que 780 dos 862 s (90,5%) vão para `pontoDentroMalha` em `src/autoria/contato-de-solidos.js`, que percorre todos os triângulos para cada ponto amostrado. Mostrou também que `descreverPeca` e `contatosDaPeca` auditam os mesmos pares de partes do zero, cada uma com uns 410 s. Com uma árvore de caixas como fase ampla e a mesma conta exata para cada candidato, as duas fases caíram para uns 10 s cada, com resultado idêntico: os mesmos 40 pares em contato, as mesmas 51 relações e 61.200 pontos sem nenhuma diferença, no furgão e em nove outras peças do acervo. Nenhum gate mede o tempo do `descrever`, e por isso a lentidão cresceu sem ninguém perceber.

## Resultado

O `descrever` dá exatamente o mesmo resultado de hoje em uma fração do tempo, sem dependência nova, e uma conferência de tempo máximo por peça no CI reprova a próxima lentidão.

## Filtro Agent-First

- **Reaproveitamento da auditoria (REFATORAR):** cada par de partes é auditado uma vez por execução do `descrever`, sem cache em disco e sem dependência da ordem.
- **Árvore de caixas (REFATORAR):** fase ampla própria, de umas 80 linhas, em `src/autoria/arvore-de-caixas.js`, montada uma vez por malha; cada candidato passa pela conta exata de hoje. A pessoa escolheu não trazer o `three-mesh-bvh`, para o módulo continuar neutro, sem three.
- **Orçamento de tempo (USAR DIRETO):** uma conferência no CI mede o `descrever` de uma peça escolhida e reprova acima do orçamento, com o tempo medido e o orçamento na mensagem.

## Incluído

- o reaproveitamento entre `descreverPeca` e `contatosDaPeca`;
- a árvore de caixas, com a força bruta mantida só como referência de teste;
- o teste de equivalência ponto a ponto (superfície, perto dela, dentro e fora, nas tolerâncias do módulo);
- a conferência de tempo no CI.

## Excluído

- a ondulação, cujo tempo vai para outro lugar e não melhora com a árvore;
- qualquer mudança de resultado do `descrever`.

## Gate de saída

1. O `descrever` do `furgao-realista` dá o mesmo resultado de antes e leva menos de um quinto do tempo, medido duas vezes com a carga da máquina anotada.
2. O teste de equivalência ponto a ponto passa, e o retrato do acervo fica com as 54 peças iguais.
3. A conferência de tempo roda no CI e reprova uma lentidão provocada de propósito.
4. `npm run gates` verde.

## Fatias

1. **Reaproveitamento e árvore.** As duas mudanças com o teste de equivalência e as medidas de antes e depois.
2. **Orçamento de tempo.** A conferência no CI, com a peça e o orçamento justificados.
3. **Fechamento.** Atritos, backlog e o plano movido para `encerrados/`.

## Riscos e parada

Se qualquer resultado do `descrever` mudar, a mudança para e volta com a diferença medida.

## Andamento

As fatias 1 e 2 foram feitas em 2026-11-03, no commit `fe06d755`. A árvore de caixas (`src/autoria/arvore-de-caixas.js`) é a fase ampla de `pontoDentroMalha`, e `criarMemoriaDeAuditoria` em `contato-de-solidos.js` faz cada par de partes ser auditado uma vez por execução, servindo a `descreverPeca` e a `contatosDaPeca`. O `descrever` do `furgao-realista` caiu de 904,9 s para 60,9 s com a saída idêntica linha a linha, e a bateria completa do mesmo dia mediu 49,4 s. A guarda `npm run guarda:tempo` (`tools/modelar/guardas/guarda-tempo-do-descrever.mjs`) roda no CI com o orçamento de 180 s, três vezes o tempo medido, e o teste dela reprova o tempo acima do orçamento, a peça que encolheu e a medida que não saiu.

## Fechamento

Concluído em 2026-11-03, a pedido da pessoa, com os quatro gates de saída cumpridos: o mesmo resultado em menos de um sétimo do tempo, a equivalência provada, a guarda de tempo no CI e a bateria verde. O que sobra de lentidão no furgão está na execução da receita, e não no `descrever`: o retrato da procedência do núcleo, que está no backlog e que a pessoa decidiu corrigir depois da etapa 4 do furgão.

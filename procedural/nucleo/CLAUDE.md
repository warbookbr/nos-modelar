# Núcleo: o que só vale nesta pasta

Vale além do contrato da raiz, para quem muda arquivo de `procedural/nucleo/`.

- O núcleo não importa nada de fora dele: nem `src/`, `tools/` ou `modulos/`, nem peças, famílias, critérios, extensões ou serviços. `npm run arquitetura:check` recusa o import, em `.js`, `.mjs` e `.ts`; os testes ficam fora da régua.
- Nenhum nome de veículo ou de outro objeto entra em código, em mensagem de erro nem em texto de ajuda. O que só serve a uma família é opção declarada sobre a operação geral.
- Tudo é determinístico: a mesma entrada dá a mesma malha, bit a bit. Sem relógio nem sorteio.
- Operação nova ou argumento novo entra no registro com schema e exemplo que roda; depois `npm run catalogo:gerar` e `npm run mapa`.
- A recusa diz o passo, a operação, o valor recebido e o limite. Recusa que não diz onde não ajuda quem escreve a receita.
- Mudança numa operação muda todas as peças que a usam: rode a guarda das peças afetadas com `node tools/modelar/guardas/guarda-acervo.mjs <peça>`.
- Teste que leva mais de 12 s sozinho entra em `TESTES_LENTOS`, em `tools/testes-lentos.mjs`.
- Antes de usar um ajudante de gaiola, `npm run capacidade -- <nome>` dá a ficha dele.
- Quem muda o que `ajustarCurvaLisa` devolve para a mesma entrada soma 1 em `VERSAO_DO_AJUSTE` (`ajuste-de-curva-lisa.js`): a versão entra na impressão do ajuste guardado pelas receitas, e o dado antigo deixa de conferir até ser regravado com `node tools/modelar/regravar-ajustes-de-curva.mjs <receita>`.
- Operação que corta faces ou que reescreve a lista de faces de uma origem já publicada trata os pedaços da divisão por contorno (`procedural/nucleo/pedacos-da-divisao.js`): quem lê `registro.faces` direto passa por `comOsPedacosDaDivisao`, e quem tira face de uma origem chama `tirarDosPedacosDaDivisao`. Hoje reescrevem lista de origem o `arredondarCostura`, o `limparLascas` e o `registraNaTampa` (`operacoes/arestas-em-grupos.js`, que põe na tampa de uma extrusão a peça nova que nasce de uma peça de tampa).

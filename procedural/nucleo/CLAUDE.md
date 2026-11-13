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

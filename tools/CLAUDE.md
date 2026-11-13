# Ferramentas: o que só vale nesta pasta

Vale além do contrato da raiz, para quem muda arquivo de `tools/`.

- Os testes rodam com `npx vitest run <arquivo>`, e não com `node --test`. `npm run gates` é de quem conduz o envio; agente despachado não o roda.
- Gate novo entra em `tools/gates.mjs` e em `.github/workflows/ci.yml`, e `tools/mapa/gates-espelham-ci.test.mjs` confere que os dois dizem o mesmo.
- Arquivo gerado não se edita à mão, se regenera: `npm run mapa`, `npm run catalogo:gerar`, `npm run roteiros:gerar`, `npm run planos:gerar`, `npm run decisoes:gerar`. Depois de juntar a main, rode `npm run mapa`.
- Ferramenta com comando em `package.json` responde a `--ajuda` e recebe opção com `=`.
- A ferramenta não conhece uma peça pelo nome: o que só serve a um objeto é opção declarada. Dado de teste mora em `tools/fixtures/`.
- Um teto de tempo fixo num teste é guarda contra travamento; a lentidão é julgada pelo teto relativo de `tools/testes-lentos.mjs`.
- A mensagem de recusa diz o que foi recebido, o que era esperado e o comando que conserta.

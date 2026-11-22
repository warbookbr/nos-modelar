# Tolerância do STEP: o acervo exportado antes e depois da tolerância em milímetro

Medida do plano da tolerância do STEP em milímetro (2026-11-22). `medir.mjs` exporta cada peça do acervo em STEP, em memória, com as opções padrão do comando (mm, escala 1000, tolerância 0,001), e grava se a validação passa, se a costura fecha, o número de corpos e a impressão geométrica. `comparar.mjs` compara duas medidas peça a peça.

`antes.json` foi medido numa cópia do repositório no commit anterior à correção; `depois.json`, com a correção. A comparação e a leitura dela estão no fim deste arquivo quando as duas medidas terminam.

```bash
node docs/modelar/banco-de-provas/tolerancia-do-step-2026-11-22/medir.mjs --saida=<arquivo.json> [--pecas=a,b]
node docs/modelar/banco-de-provas/tolerancia-do-step-2026-11-22/comparar.mjs antes.json depois.json
```

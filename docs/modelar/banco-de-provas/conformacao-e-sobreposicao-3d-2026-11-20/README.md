# Banco de provas — conformação na chapa e sobreposição 3D (2026-11-20)

Registro de validação do plano [conformação sobre a casca e sobreposição ortográfica 3D](../../planos/2026-11-20-conformacao-na-chapa-e-sobreposicao-3d.md).

## 1. Testes unitários e de fixture sintética

Comando: `npx vitest run procedural/nucleo/conformar-na-chapa.test.mjs tools/modelar/modelo-sobrepor.test.mjs`

- `procedural/nucleo/conformar-na-chapa.test.mjs` (10 testes verdes):
  - exportação de `FICHA` no padrão do núcleo e recusa explícita de argumentos inválidos;
  - modo `trilho` aberto sobre chapa curva com folga/invasão < 1 mm e malha fechada;
  - acompanhamento automático quando a curvatura da chapa sintética muda com os mesmos argumentos;
  - recusa explícita com ponto exato quando o raio local é menor que a meia-seção e causaria dobra/auto-interseção;
  - modo `contorno` fechado recuado (`deslocamentoMm` negativo) e em sentido horário (CW) com aderência < 1 mm e malha fechada;
  - suporte a `simetria: 'x'` (inclusive no modo `trilho` tocando `x = 0` sem faces internas duplicadas) e `unidade: 'm'`.
- `tools/modelar/modelo-sobrepor.test.mjs` (4 testes verdes):
  - projeção das quatro vistas ortográficas em mm e desvio zero na caixa exata;
  - medição de deslocamento conhecido de 20 mm na malha 3D com erro < 2 mm;
  - geração de SVG individual (contra prancha e sobre imagem calibrada) e quadro 2×2;
  - resposta a `--ajuda` com código de saída 0.

## 2. Revisão adversarial no núcleo

- Segunda revisão adversarial sobre `procedural/nucleo/conformar-na-chapa.js` concluída com **SEM BLOQUEIOS**.
- `npm run arquitetura:check` verde (núcleo independente do catálogo).

## 3. Prova prática no carro quadrado (`carro-quadrado/lataria`)

- Em `procedural/pecas/carro-quadrado/partes/lataria/receita/parachoques.js`, os dois trechos de `frisoLateral` (entre os arcos em `z = -755..+865, y = 515` e traseiro em `z = -1495..-1920, y = 515`, ajustado para manter folga da lanterna traseira) foram convertidos para `conformarNaChapa` no modo `trilho` (`vista: 'x'`, `sentido: '+'`, `simetria: 'x'`, `unidade: 'm'`, `deslocamentoMm: -2`, `secao: { largura: 56, altura: 18, chanfro: 4 }`).
- Em `procedural/pecas/carro-quadrado/partes/lataria/receita.js`, `escapamento` foi movido para `x = +540` (lado esquerdo visto de trás) e `placaTraseira` foi recuada 8 mm (`z = -2024..-2005`) para não aparecer pelo lado de dentro da tampa.
- `node tools/modelar/descrever-peca.mjs procedural/pecas/carro-quadrado/partes/lataria/receita.js`: 14 partes, 34.968 faces, 33.238 vértices, 0 faces sem identidade, 0 órfãos, 0 contatos não declarados (`frisoLateral` em 4 corpos simétricos conformados com `3304` faces e caixa `1.709317 × 0.056113 × 2.797412`).
- `npm run modelo:sobrepor` contra as 4 pranchas de `carro-quadrado`:
  - `lateral`: mediana `8.25 mm`, p95 `411.76 mm`, max `463.83 mm`;
  - `frontal`: mediana `29.98 mm`, p95 `105.76 mm`, max `105.91 mm`;
  - `traseira`: mediana `29.23 mm`, p95 `91.82 mm`, max `98.95 mm`;
  - `planta`: mediana `52.53 mm`, p95 `115.88 mm`, max `171.63 mm`.

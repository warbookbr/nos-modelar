# Manual

Lê uma montagem persistida e escreve a lista de peças e o passo a passo. `src/lista-de-pecas.js` é função pura sobre a montagem resolvida: uma linha por receita com os mesmos parâmetros, com a quantidade de instâncias, a caixa em milímetro (largura, altura e profundidade nos eixos da peça, arredondadas a 1 mm) e os materiais declarados nas faces, em ordem estável, em JSON e em Markdown. `src/passos.js` separa as etapas e pinta a montagem de cada passo (peça nova em laranja, já montadas esmaecidas, numa cópia da malha). `src/capturador.mjs` abre o servidor e o navegador uma vez e reaproveita `capturarMontagem`. `src/pagina.js` escreve `manual.html`, com CSS e imagens embutidos.

O módulo não conhece peça pelo nome. O passo mostra só o nome da etapa, a lista e a imagem; instrução não é inventada.

## Uso

`npm run manual -- <montagem.json> [--saida=<pasta dentro do repositório>] [--vista=] [--folga=] [--largura=] [--sem-imagens]`. A saída padrão é `tools/bancadas/out/manual-<montagem>/`, que não é versionada. `npm run manual -- --ajuda` lista as opções.

A imagem de cada passo enquadra a peça nova com `--folga` (padrão 1,5) e deixa o resto da montagem montada ao redor.

Testes: `npx vitest run modulos/manual`.

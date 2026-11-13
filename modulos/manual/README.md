# Manual

Lê uma montagem persistida e escreve a lista de peças e o passo a passo. `src/lista-de-pecas.js` é função pura sobre a montagem resolvida: uma linha por receita com os mesmos parâmetros, com a quantidade de instâncias, a caixa em milímetro (largura, altura e profundidade nos eixos da peça, arredondadas a 1 mm) e os materiais declarados nas faces, em ordem estável, em JSON e em Markdown. `src/passos.js` separa as etapas e pinta a montagem de cada passo (peça nova em laranja, já montadas esmaecidas, numa cópia da malha). `src/capturador.mjs` abre o servidor e o navegador uma vez e reaproveita `capturarMontagem`. `src/pagina.js` escreve `manual.html`, com CSS e imagens embutidos.

O módulo não conhece peça pelo nome. O texto vem do campo opcional `manual` da montagem v5 (só texto, lido por `src/autoria/ler-montagem-persistida.js`): `parametros` dá o nome de exibição de um parâmetro por identificador (sem ele, o identificador separado nas maiúsculas), `nomes` dá o nome de exibição por referência de peça (sem ele, o último trecho do caminho, com hífen virando espaço e inicial maiúscula) e `etapas` dá, por id de instância, `instrucao` e `avisos`. Etapas seguidas da mesma peça e dos mesmos parâmetros viram um passo, com a quantidade e duas imagens ("Onde vão", com todas as instâncias do grupo em destaque, e "Detalhe de uma delas", de perto, com a primeira); o passo de peça única tem uma imagem só; `--sem-agrupar` mantém um passo por etapa. Num grupo, instruções e avisos iguais saem uma vez e os diferentes saem todos, na ordem. Etapa sem texto sai só com a lista e a imagem; nada é inventado.

## Uso

`npm run manual -- <montagem.json> [--saida=<pasta dentro do repositório>] [--vista=] [--folga=] [--largura=] [--sem-agrupar] [--sem-imagens]`. A saída padrão é `tools/bancadas/out/manual-<montagem>/`, que não é versionada. `npm run manual -- --ajuda` lista as opções.

A imagem de cada passo enquadra o que entra nele com `--folga` (padrão 1,5) e deixa o resto da montagem montada ao redor.

Testes: `npx vitest run modulos/manual`.

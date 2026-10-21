# Fixtures do importador de STL

## sintetico/

Nove arquivos `.stl.gz` (dez peças) gerados por `node tools/mecanifica/fixtures/importar-stl/gerar-sintetico.mjs` a partir do `sintetico.step` do importador de STEP (`../importar-step/`), tesselados pelo OpenCascade WASM do repositório (`occt-wasm`) com até 0,2 rad por segmento, o que dá cilindros de 35 a 63 lados. Cada STL tem o nome que a peça teria num projeto de impressão (`blocoFuroCego`, `pontaFenda`), e as peças ficam nas posições do STEP, as mesmas da tabela `ESPERADO` do teste. `pino_e_bucha.stl.gz` tem dois componentes desconectados (o pino encosta na bucha sem dividir vértice), e `sapata.stl.gz` é ASCII. O gerador é determinístico (o gzip sai sem data) e o teste não regera os arquivos. Sem restrição de uso.

## denso/anel_espacador.stl.gz

Um anel de 32 mm de diâmetro externo, 31 mm de diâmetro interno e 9,5 mm de espessura, com o eixo em z e 252 lados, gerado por `node tools/mecanifica/fixtures/importar-stl/gerar-denso.mjs` sem nenhuma entrada externa. A parede é dividida em 27 faixas de altura igual, o que dá 28.224 triângulos (1,4 MB de STL binário, 255 KB compactado), a ordem de grandeza de uma malha de impressão exportada de um CAD e a que mantém o importador exercitado em malha grande. Os vértices são compartilhados entre triângulos vizinhos, a diagonal de cada quadrado alterna com a paridade da faixa e da coluna, e o anel fica longe da origem (centro em x = 210 e y = -85, base em z = 35). O gerador confere o volume da malha contra o do anel de 252 lados antes de gravar, é determinístico (sem relógio nem sorteio, e o gzip sai sem data) e o teste não regera o arquivo. Sem restrição de uso.

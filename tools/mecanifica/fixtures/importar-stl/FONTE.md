# Fixtures do importador de STL

## sintetico/

Nove arquivos `.stl.gz` (dez peças) gerados por `node tools/mecanifica/fixtures/importar-stl/gerar-sintetico.mjs` a partir do `sintetico.step` do importador de STEP (`../importar-step/`), tesselados pelo OpenCascade WASM do repositório (`occt-wasm`) com até 0,2 rad por segmento, o que dá cilindros de 35 a 63 lados. Cada STL tem o nome que a peça teria num projeto de impressão (`blocoFuroCego`, `pontaFenda`), e as peças ficam nas posições do STEP, as mesmas da tabela `ESPERADO` do teste. `pino_e_bucha.stl.gz` tem dois componentes desconectados (o pino encosta na bucha sem dividir vértice), e `sapata.stl.gz` é ASCII. O gerador é determinístico (o gzip sai sem data) e o teste não regera os arquivos. Sem restrição de uso.

## braco/base_spacer.stl.gz


```bash
curl -s -X POST https://api.printables.com/graphql/ -H 'content-type: application/json' \
curl -s -X POST https://api.printables.com/graphql/ -H 'content-type: application/json' \
```

e baixar o `link` devolvido (se vier "throttled", esperar alguns segundos entre as chamadas). O braço inteiro não é guardado aqui: os nove STL somam 55 MB.

## Medida no braço (importar-stl --conferir)

Nove peças, uma por arquivo, na posição do arquivo: 1 exata (o anel), 3 revoluções aproximadas pelo contorno externo e 5 caixas de último recurso, sem nenhum contato (as peças de impressão estão espalhadas). Ocupação média 0,49. A conferência contra a malha de cada arquivo mede 7 das 9 peças: `base` (306 mil triângulos) e `connector_straight` (367 mil) passam do que `conferirComMalha` aguenta (o `Math.min(...vertices)` dele estoura a pilha acima de uns 120 mil vértices soldados) e ficam sem medida. Importação em 15 a 17 s, dos quais 10 s nesses dois arquivos. Contra o STEP do mesmo módulo, o importador de STL dá a mesma forma nas nove peças e uma ocupação que difere até 0,02. O volume do sólido difere até 1% em seis peças; em `driveSmall` (2%), `driveBig_rotor` (9%) e `connector_straight` (38%) o STL e o STEP do modelo não têm o mesmo volume, e a diferença vem dos arquivos, e não da importação.

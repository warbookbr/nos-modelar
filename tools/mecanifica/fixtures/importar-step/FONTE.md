# Fixtures do importador de STEP

## sintetico.step

Dez sólidos gerados pelo próprio OpenCascade WASM do repositório (`occt-wasm` 4.3.2) com `node tools/mecanifica/fixtures/importar-step/gerar-sintetico.mjs`: placa com quatro furos redondos e um quadrado, garfo em U, peça em L, pino, bucha (anel), ponteira (tronco de cone), bloco com furo cego, sapata (caixa), placa escareada e ponta cônica com fenda. As medidas de cada peça estão no comentário do gerador e na tabela `ESPERADO` do teste. O arquivo é versionado e o teste não o regera (o cabeçalho do STEP leva a data da geração). Sem restrição de uso.

## ExcavArm-v7.step.gz

"Excavator Arm", printables.com/model/971298, arquivo `ExcavArm v7.step` (1,3 MB, 19 sólidos de nome genérico "Körper1" a "Körper31"), licença CC-BY; o autor consta na página do modelo. Guardado compactado com gzip (214 KB) e lido pelo teste com `gunzipSync`. Para baixar de novo, a API do Printables (o site responde 403):

```bash
curl -s -X POST https://api.printables.com/graphql/ -H 'content-type: application/json' \
  -d '{"query":"mutation { getDownloadLink(id:\"5953499\", printId:\"971298\", fileType:stl, source:model_detail){ ok output { link } } }"}'
```

e baixar o `link` devolvido (`.../excavarm-v7.step`). O arquivo é um leiaute de impressão, com as peças espalhadas em diagonal, e não a montagem.

## braco-step-x-esboco.png

À esquerda, quatro vistas ortográficas da malha dos sólidos do STEP, desenhadas por um z-buffer simples; à direita, a composta de `npm run esboco -- arm.esboco.json --composta`. A ordem e a orientação das quatro vistas da esquerda não são as da composta (a conferência numérica está no relato do `--conferir`, e não na imagem).

## Medida no braço (importar-step --conferir)

19 peças: 0 exatas, 9 aproximadas (3 prismas pela seção do meio e 6 revoluções pelo contorno externo) e 10 em caixa de último recurso; 5 contatos a 0,1 mm. Ocupação média (menor sobre maior volume, forma e sólido) 0,60, contra 0,44 da sonda de caixa ou cilindro; interseção sobre união média por peça 0,62 em 16 peças medidas (3 sem malha fechada), e 0,24 pelo volume do conjunto, que os sólidos grandes e oblíquos em caixa puxam para baixo. Importação em 5 a 6 s.

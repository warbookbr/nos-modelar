# Avaliação cega 1 — dobradiça de portão

## Candidato A — 14/16

1. **2/2** — A evidência estrita declara `facesSemIdentidade: 0` e `orfaos: 0`.
2. **2/2** — Há exatamente `folhaFixa`, `folhaMovel`, `barrilFixo`, `barrisMoveis` e `pino`, todas com faces acima de zero.
3. **2/2** — 430 faces, 3 materiais e altura total 1,22 atendem aos três limites.
4. **2/2** — Frontal e superior mostram folhas delgadas chegando ao eixo, sem interpenetração indevida visível.
5. **2/2** — A frontal mostra os três gomos alternados, com duas folgas claras entre eles.
6. **1/2** — O eixo comum dos gomos é claro; porém as pequenas extensões do pino além dos extremos não ficam inequivocamente legíveis nas vistas direita e isométrica.
7. **1/2** — As quatro vistas estão válidas e não cortadas, mas direita e superior ocupam pouco quadro e são pouco úteis para distinguir todos os elementos.
8. **2/2** — Os isolamentos exibem somente `folhaFixa+barrilFixo` e `folhaMovel+barrisMoveis`, respectivamente.

Problemas principais:

- Pino com saliência terminal pouco legível nas vistas exigidas.
- Vista direita excessivamente pequena no quadro.
- Vista superior pouco informativa para leitura dos gomos.

## Candidato B — 14/16

1. **2/2** — A evidência estrita declara `facesSemIdentidade: 0` e `orfaos: 0`.
2. **2/2** — Há exatamente as cinco partes semânticas exigidas e nenhuma está vazia.
3. **1/2** — Faces (326) e materiais (3) atendem, mas a altura total informada, 1,38, excede 1,26.
4. **2/2** — Nas vistas frontal e superior, as folhas chegam ao eixo e permanecem visualmente delgadas, sem interpenetração indevida evidente.
5. **2/2** — A frontal evidencia três gomos alternados e duas folgas visíveis.
6. **2/2** — Direita e isométrica mostram gomos no mesmo eixo vertical e pino claramente saliente acima e abaixo.
7. **1/2** — As imagens não estão cortadas, mas a vista superior está marcada como `valida: false`; portanto, o conjunto não cumpre integralmente o critério de vistas úteis e válidas.
8. **2/2** — Cada isolamento preserva apenas o subconjunto solicitado, como indicado pela seleção visível e pelos componentes remanescentes.

Problemas principais:

- Altura total de 1,38 fora da faixa de 1,14–1,26.
- Vista superior inválida segundo a evidência.
- Leitura frontal da folha móvel fica visualmente mais carregada junto ao eixo.

## Resultado

**Empate: A 14/16, B 14/16.**

Confiança: **média**. A atende os limites quantitativos e a altura, mas perde clareza de enquadramento e do pino; B comunica melhor o pino e os gomos, mas falha na altura e tem uma vista declarada inválida. A nota não atribui valor adicional à complexidade geométrica.

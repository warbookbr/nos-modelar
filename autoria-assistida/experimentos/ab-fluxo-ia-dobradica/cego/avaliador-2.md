# Avaliação cega 2 — dobradiça de portão

## Candidato A — 15/16

1. **2/2** — `facesSemIdentidade: 0` e `orfaos: 0` na descrição estrita.
2. **2/2** — Há exatamente `folhaFixa`, `folhaMovel`, `barrilFixo`, `barrisMoveis` e `pino`; todas têm faces.
3. **2/2** — 430 faces, três materiais e altura total 1,22: todos dentro dos limites.
4. **1/2** — As folhas chegam ao eixo e não há interpenetração frontal evidente, mas a `folhaMovel` é visualmente espessa; a evidência indica profundidade 0,303813.
5. **2/2** — A frontal mostra três gomos alternados e as duas folgas claras entre eles.
6. **2/2** — Direita/isométrica sustentam um único eixo vertical; as pontas claras do pino são visíveis além dos gomos, ainda que discretas.
7. **2/2** — As quatro vistas estão marcadas válidas, não cortadas, e a isométrica/frontal deixam folhas, gomos e pino distinguíveis.
8. **2/2** — Os isolamentos mostram somente `folhaFixa+barrilFixo` e `folhaMovel+barrisMoveis`, respectivamente.

Problemas principais:

- `folhaMovel` tem espessura visualmente alta para uma folha fina.
- As vistas direita e superior ocupam pouco do enquadramento, reduzindo a leitura fina.
- A projeção do pino nas extremidades é mínima.

## Candidato B — 12/16

1. **2/2** — `facesSemIdentidade: 0` e `orfaos: 0` na descrição estrita.
2. **2/2** — As cinco partes exigidas existem e todas são não vazias.
3. **1/2** — 326 faces e três materiais atendem, mas a altura total 1,38 fica fora de 1,14–1,26.
4. **0/2** — A frontal/superior mostram a `folhaMovel` como um volume muito espesso (e com perfil em cunha), não como folha fina; a profundidade reportada é 0,580417.
5. **2/2** — A frontal apresenta os três gomos alternados e duas folgas visíveis.
6. **2/2** — Os gomos se alinham no eixo vertical e o pino se projeta claramente acima e abaixo do conjunto.
7. **1/2** — Não há corte, mas a vista superior tem `valida: false`, limitando a utilidade do conjunto de quatro vistas.
8. **2/2** — Os dois isolamentos preservam exatamente os subconjuntos pedidos, conforme as seleções e legendas exibidas.

Problemas principais:

- Altura total de 1,38, acima do intervalo obrigatório.
- `folhaMovel` excessivamente espessa e em cunha, contrariando a leitura de folha fina.
- Vista superior marcada inválida na evidência.

## Resultado

**Vencedor: Candidato A, 15/16 versus 12/16.**

**Confiança: alta.** A vantagem decorre de falhas explicitamente registradas na evidência de B (altura e validade da vista superior), além da diferença visual de espessura das folhas.

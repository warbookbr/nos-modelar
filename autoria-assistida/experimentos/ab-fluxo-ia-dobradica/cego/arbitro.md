# Arbitragem cega final — dobradiça de portão

Esta decisão foi formada pela leitura da rubrica, das evidências e das seis
imagens de cada candidato antes da consulta aos dois pareceres. As notas abaixo
aplicam literalmente os oito critérios (0–2), sem prêmio por complexidade.

## Candidato A — 14/16

1. **2/2** — A descrição estrita informa `facesSemIdentidade: 0` e `orfaos: 0`.
2. **2/2** — Há exatamente as cinco partes nomeadas e todas têm faces.
3. **2/2** — 430 faces, três materiais e altura total de 1,22 atendem todos os limites.
4. **2/2** — Nas vistas frontal e superior, as folhas se leem como delgadas, alcançam o eixo e não há interpenetração indevida visível.
5. **2/2** — A frontal mostra três gomos alternados e duas folgas visíveis.
6. **1/2** — O eixo vertical comum é claro, mas a saliência do pino nas duas extremidades não fica inequivocamente legível nas vistas direita e isométrica.
7. **1/2** — As quatro vistas são declaradas válidas e não estão cortadas; porém direita (ocupação 0,03738) e superior (0,044785) são pequenas e não permitem leitura útil de todos os elementos, especialmente do pino.
8. **2/2** — Os isolamentos preservam somente `folhaFixa+barrilFixo` e `folhaMovel+barrisMoveis`, respectivamente.

Problemas principais: projeção terminal do pino pouco demonstrada; vista direita muito pequena; vista superior pouco informativa.

## Candidato B — 14/16

1. **2/2** — A descrição estrita informa `facesSemIdentidade: 0` e `orfaos: 0`.
2. **2/2** — Há exatamente as cinco partes nomeadas e todas têm faces.
3. **1/2** — Faces (326) e materiais (3) atendem, mas a altura total de 1,38 excede o intervalo obrigatório de 1,14–1,26.
4. **2/2** — Nas vistas frontal e superior, ambas as folhas alcançam o eixo e aparecem nitidamente mais finas que sua largura, sem interpenetração indevida visível.
5. **2/2** — A frontal mostra três gomos alternados e duas folgas visíveis.
6. **2/2** — Direita e isométrica mostram os gomos em um eixo vertical comum e o pino saliente acima e abaixo do conjunto.
7. **1/2** — Não há corte e as demais vistas são úteis, mas a evidência declara a vista superior `valida: false`; portanto, o conjunto das quatro não satisfaz integralmente o critério.
8. **2/2** — Os isolamentos preservam somente os dois subconjuntos solicitados.

Problemas principais: altura fora da faixa; vista superior declarada inválida; abertura/posição da folha móvel deixa a leitura frontal mais carregada junto ao eixo.

## Arbitragem das divergências

### Forma e espessura das folhas

**Decisão: 2/2 para ambos no critério 4.** A regra pede a leitura visual nas
vistas frontal e superior: nelas, as folhas de A e B são mais finas que largas,
chegam ao eixo e não exibem interpenetração indevida. Os valores de profundidade
em `dimensoes` (`0,303813` em A e `0,580417` em B) são caixas envolventes de
peças abertas/rotacionadas, não uma medida isolada e comprovada de espessura.
Não podem, pela regra literal, substituir o que as vistas requeridas mostram.
O perfil aberto de B torna sua leitura menos limpa, mas não invalida as três
condições do item.

### Pino nas extremidades

**Decisão: A 1/2; B 2/2 no critério 6.** Em A, o alinhamento dos gomos é
inequívoco, mas as pontas do pino são discretas a ponto de a vista direita não
demonstrar com segurança as duas saliências. Isso é atendimento parcial. Em B,
as extensões superior e inferior do pino aparecem claramente na direita e na
isométrica, cumprindo a condição inteira.

### Utilidade das vistas

**Decisão: 1/2 para ambos no critério 7.** A tem quatro vistas `valida: true` e
sem corte, mas a ocupação muito baixa de direita e superior reduz a utilidade
exigida pela rubrica. B está sem corte e tem boa leitura nas demais vistas, mas
`superior` está explicitamente marcada `valida: false`; a regra manda considerar
esse campo. Em ambos os casos há evidência suficiente para crédito parcial, mas
não para afirmar que o conjunto completo de quatro vistas atende integralmente.

## Resultado final

**Empate — A: 14/16; B: 14/16.**

**Confiança: média.** O empate decorre de falhas diferentes, ambas expressas nos
critérios: A perde clareza demonstrativa de pino e enquadramento; B perde altura
obrigatória e validade de uma vista. A decisão não trata a caixa envolvente de
uma folha aberta como espessura, pois a rubrica determina a verificação visual
nas vistas frontal e superior.

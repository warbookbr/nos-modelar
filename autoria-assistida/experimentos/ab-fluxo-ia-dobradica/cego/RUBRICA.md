# Avaliação cega — dobradiça de portão

Avalie os candidatos A e B sem tentar descobrir sua procedência. Use somente os
arquivos desta pasta. Cada item vale 0, 1 ou 2 pontos; o máximo é 16.

## Alvo comum

Uma dobradiça vertical de portão, técnico-didática, F2 e mecanicamente
plausível. Deve ter duas folhas retangulares de 1,20 de altura e cerca de 0,65
de largura, espessura claramente menor que a largura, três gomos cilíndricos
alternados no mesmo eixo vertical e um pino que atravesse os três e apareça além
do conjunto nas duas extremidades.

As cinco partes exigidas são, exatamente: `folhaFixa`, `folhaMovel`,
`barrilFixo`, `barrisMoveis` e `pino`.

## Oito critérios

1. A descrição estrita tem zero face sem identidade e zero órfão.
2. Existem exatamente as cinco partes semânticas exigidas, todas não vazias.
3. O modelo tem no máximo 1.200 faces, no máximo cinco materiais e altura total
   entre 1,14 e 1,26.
4. Nas vistas frontal e superior, as duas folhas são finas, chegam ao eixo e não
   apresentam interpenetração visível indevida.
5. Na vista frontal, aparecem três gomos alternados e duas folgas visíveis entre
   eles.
6. Nas vistas direita e isométrica, os gomos compartilham um eixo vertical e o
   pino aparece além do conjunto nas duas extremidades.
7. As quatro vistas principais são úteis, não cortadas e permitem distinguir
   folhas, gomos e pino. Considere também o campo `valida` da evidência.
8. As imagens `isolamento-fixo.png` e `isolamento-movel.png` preservam somente o
   subconjunto solicitado, respectivamente `folhaFixa+barrilFixo` e
   `folhaMovel+barrisMoveis`.

## Forma da resposta

Para cada candidato, dê a nota de cada item com uma justificativa curta baseada
em evidência. Some o total, indique vencedor ou empate e registre até três
problemas principais. Não premie complexidade por si só.

# Madeira em Node ao lado da do Blender (2026-10-19)

Prova de aparência para a pessoa julgar; nada aqui está aprovado. Todas usam a cor de `cores.madeira` da cadeira `cadeira_ripada_simples` (95, 48, 30), semente 1 e tile de 0,5 m a 512 px.

`madeira-folha.png` tem uma linha por amostra, com o Blender (`materiais.criar`, bpy 4.2.0, recorte de 0,5 m no centro de uma face de 1,5 m, bake da cor) à esquerda e a textura em Node (`modulos/textura`) à direita.

- A: desgaste 0, veio 1.
- B: desgaste 0,3, veio 1.
- C: desgaste 0,6, veio 1.
- D: desgaste 0,3, veio 3 (anéis e fibras bem visíveis).
- E: desgaste 0,3, veio 1, 4 tábuas, borda 0,5.

`madeira-repeticao.png` repete as amostras A e E em 2x2 para mostrar que não há emenda. Os arquivos `madeira-X.png` são os tiles em Node e `blender-X.png` os do Blender.

Diferenças que ficaram: o Blender neste recorte tem anéis retos e regulares, e o Node tem arcos e nós mais marcados, porque o centro do tronco cai dentro do tile de 0,5 m. A cor média do Node é cerca de 6% mais clara. O desgaste do Blender no miolo da face quase não aparece (só nas quinas da peça); o Node, sem quinas num tile, espalha pontos de tinta lascada e ferrugem por cristas de ruído, mais visíveis em C. As juntas entre tábuas e a borda (E) ficaram parecidas.

## Metal em Node ao lado do Blender

Prova de aparência para a pessoa julgar; nada aqui está aprovado. `metal-folha.png` tem uma linha por amostra, com o Blender (`materiais.criar`, bpy 4.2.0, recorte de 0,5 m no centro de uma face de 1,5 m, bake da cor, semente 1) à esquerda e a textura em Node à direita. As cores e os valores são os das receitas reais. `metal-X.png` e `blender-metal-X.png` são os tiles soltos, e `metal-repeticao.png` repete as amostras A e G em 2x2 para mostrar que não há emenda.

- A: pintado, sem desgaste (branco do micro-ondas, 238, 238, 232).
- B: micro-ondas, desgaste 0,2 e ferrugem 0,1.
- C: geladeira (214, 208, 192), desgaste 0,5; esta cor cai no critério de cinza médio e sai escovada.
- D: pintado com desgaste 0,6 e ferrugem 0,6, acima do que as receitas usam, para ver a ferrugem.
- E: escovado sem desgaste (cinza da lava-louças, 199, 198, 195).
- F: lava-louças, escovado, desgaste 0,25.
- G: ventilação do micro-ondas (190, 189, 182), escovado, desgaste 0,25 e ferrugem 0,15.

Diferenças que ficaram: o Node tem o dobro do contraste de textura do Blender no metal liso (desvio de nível 2 a 6 contra 1 a 4) e as faixas do escovado são mais compridas e visíveis; a cor média fica 2 a 4 níveis mais clara. No recorte do Blender o centro da face não tem quina nem chão, então o desgaste quase não aparece lá, enquanto o Node espalha manchas de ferrugem e escorridos por ruído, bem mais marcados em C e D. Nas lascas minúsculas o Node desenha pontos de uns 2 px, e o do Blender tem 1 px.

## Tecido em Node ao lado do Blender

`tecido-folha.png` segue o mesmo arranjo (Blender à esquerda, Node à direita, semente 1), com as cores das cadeiras. `tecido-X.png`, `blender-tecido-X.png` e `tecido-repeticao.png` (A e F em 2x2) são os arquivos soltos.

- A: azul da cadeira moderna (50, 60, 120), sem desgaste.
- B: o mesmo azul, desgaste 0,3.
- C: marrom da cadeira de madeira (120, 60, 35), desgaste 0,35 e ferrugem 0,1.
- D: azul, desgaste 0,6.
- E: azul, desgaste 0,3 e manchas 0,6.
- F: azul, desgaste 0,3 e rasgos 0,6.

Diferenças que ficaram: o fio do Node é mais grosso (cerca de 5 px contra menos de 2 px no Blender, que sai quase um tom liso com granulação), então a trama aparece bem mais no Node. O desgaste espalha pontos de ferrugem pelo tile no Node e quase não aparece no Blender, pelo mesmo motivo das quinas. As manchas do Node cobrem uma área maior e têm o miolo mais escuro. Os rasgos têm o mesmo desenho de fendas cruzadas com enchimento claro, em zonas diferentes.

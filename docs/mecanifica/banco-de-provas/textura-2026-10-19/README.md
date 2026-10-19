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

# Sonda N3.5 — suavização C1

Experimento isolado no quarto dianteiro histórico reprovado. Ele não cria
receita, não edita a fonte e não promove a malha resultante. Seis iterações
fixas de Laplaciano atuam somente através de arestas cujo diedro C1 é menor que
25°; bordas e quinas ficam congeladas.

`gerar-evidencias.mjs` registra C1 global, rugosidade apenas da região lisa,
deslocamento máximo e doze imagens individuais antes/depois. Para passar, a
redução de P95 na região livre precisa ser de ao menos 10% e a parcela abrupta
global não pode aumentar. O resultado só é uma sonda: mesmo um `passa` não
torna o quarto uma carroceria aprovada.

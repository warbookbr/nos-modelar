# Prova privada de captura R1B

Este experimento não modela uma peça e não é uma receita. Ele prova que a
evidência usada por uma futura prova de superfície possui oclusão e profundidade
reais antes de ser mostrada a um revisor.

O renderizador recebe uma malha explícita e uma câmera ortográfica, produz as
modalidades de superfície, profundidade, normais, wireframe e identidade de
região e mantém o z-buffer numérico para teste. Não pertence ao núcleo
procedural nem à bancada publicada.

Toda captura declara se a geometria é inteira ou meia peça e sua finalidade.
Um pacote que pretenda provar o conjunto exige frontal, lateral e superior da
mesma malha assinada; meia peça só é aceita nesse pacote se declarar espelho.
Para o aceite, cada vista também declara um quadro ortográfico fixo: reenquadrar
automaticamente cada forma é permitido só em inspeção e é recusado no pacote.

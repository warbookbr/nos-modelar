# Elo entre juntas: as provas

Evidência do plano [elo entre juntas](../../planos/2026-11-25-elo-entre-juntas.md).

## Elo reto, aprovado em 2026-11-26

O elo de antebraço de 230 mm (o comprimento do antebraço do esqueleto humanoide aprovado), seção elíptica de 96 por 76 mm, cintura 0,85 e parede de 2 mm, entre dois atuadores de 100 mm, posto só pelas portas das flanges (`tools/fixtures/elo-entre-juntas/elo-entre-atuadores.mjs`). A pessoa aprovou por imagem em 2026-11-26, com a frase "aprovo o elo reto, pode seguir" (`aprovado-*.png`). Na montagem, o elo só encosta nas flanges, nada atravessa, as duas juntas giram de -180 a 180 graus sem colisão e a furação de 8 furos casa nas duas bocas; a montagem resolve em cerca de 2 s e o elo sozinho sai em 0,5 a 1,5 s, com uns 135 cm³ de parede.

O elo sai em forma de trompete porque as duas flanges do atuador têm diâmetros diferentes: a boca de baixo cobre a flange de saída, menor, e a de cima a flange de fixação da carcaça do atuador seguinte, maior. A aprovação vale com essa diferença; uma flange de fixação menor no atuador fica para quando o humanoide pedir.

A camada `pessoa` do `aprovacao.json` da família segue `null`: a pessoa aprovou a peça de prova, e não os três pontos de extremo da camada mecânica.

## Elo com desvio, fatia 2 (2026-11-26, a aprovar)

O elo ganhou `desvio` (graus entre o eixo da boca B e o da A, 0 a 90), `azimute` (direção do desvio em volta do eixo do elo, 0 para +z) e `deslocamentoLateral` (0 a 40 mm na direção do desvio), todos com padrão zero, que dá o elo reto bit a bit (os hashes da malha do elo reto e os dos pontos mínimo e médio da aprovação mecânica não mudaram; o ponto máximo mudou porque agora leva desvio 90, azimute 180 e deslocamento 40). O eixo é um trecho reto em cada boca, onde fica o anel, e uma Bézier cúbica entre eles; cada seção gira com a tangente em torno do eixo do giro, fixo, de modo que o quadro da seção não torce. A boca B sai no ponto e na direção do caminho e a montagem casa só pelas portas.

O limite não é torção, e sim a face de dentro da curva, onde as seções se comprimem: medida a folga entre seções vizinhas nessa face, ela cai com a razão entre a maior meia largura da seção e o raio do arco do eixo, e a parede sai fina quando a folga passa de uns 50 %. A restrição `curva-fecha-a-parede` pede raio de curvatura do eixo de pelo menos 2,5 vezes essa meia largura (folga medida acima de 0,5 em todo o quadro varrido). Com a boca B de 124 mm, o elo de 230 mm e o de 431 mm chegam ao teto de 90°, o de 150 mm aceita 68,8° e o de 100 mm aceita 36,7°. A parede medida por raio fica entre 1,85 e 2,27 mm (mediana 2,00) no elo curto no desvio máximo e entre 1,99 e 2,05 mm na canela a 25°.

Peças de prova (entre dois atuadores de 100 mm, só pelas portas; os dois cursos de −180° a 180° passam): a canela de 431 mm a 25°, a canela a 90° (teto) e o elo de 100 mm a 36,7° (máximo aceito). As vistas estão em `tools/bancadas/out/elo-entre-juntas-desvio/` (fora do git): `canela-25-*`, `canela-90-*` e `curto-maximo-*`, cada uma sozinha, cortada ao meio e entre os atuadores. A aprovação da pessoa não foi gravada.

A pessoa aprovou o elo com desvio por imagem em 2026-11-26, com a frase "aprovo, pode conferir e seguir" (`aprovado-desvio-*.png`), pedindo a conferência do contorno serrilhado que a vista de cima da canela a 25° mostrava. A conferência mediu o ângulo entre as faces vizinhas da malha inteira: a canela a 25° tem as mesmas 176 arestas entre 15 e 30 graus que o mesmo elo reto (todas nos anéis das bocas, os 24 lados do furo) e nenhuma entre 30 e 60, e a canela a 90° tem 202, as 26 a mais na boca girada. O serrilhado é do desenho da silhueta na imagem, e a parede não ondula. Na face de dentro do elo curto no desvio máximo, a dobra perto da transição da boca é o limite que a restrição da curva aceita.

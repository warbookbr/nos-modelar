# Elo entre juntas: as provas

Evidência do plano [elo entre juntas](../../planos/2026-11-25-elo-entre-juntas.md).

## Elo reto, aprovado em 2026-11-26

O elo de antebraço de 230 mm (o comprimento do antebraço do esqueleto humanoide aprovado), seção elíptica de 96 por 76 mm, cintura 0,85 e parede de 2 mm, entre dois atuadores de 100 mm, posto só pelas portas das flanges (`tools/fixtures/elo-entre-juntas/elo-entre-atuadores.mjs`). A pessoa aprovou por imagem em 2026-11-26, com a frase "aprovo o elo reto, pode seguir" (`aprovado-*.png`). Na montagem, o elo só encosta nas flanges, nada atravessa, as duas juntas giram de -180 a 180 graus sem colisão e a furação de 8 furos casa nas duas bocas; a montagem resolve em cerca de 2 s e o elo sozinho sai em 0,5 a 1,5 s, com uns 135 cm³ de parede.

O elo sai em forma de trompete porque as duas flanges do atuador têm diâmetros diferentes: a boca de baixo cobre a flange de saída, menor, e a de cima a flange de fixação da carcaça do atuador seguinte, maior. A aprovação vale com essa diferença; uma flange de fixação menor no atuador fica para quando o humanoide pedir.

A camada `pessoa` do `aprovacao.json` da família segue `null`: a pessoa aprovou a peça de prova, e não os três pontos de extremo da camada mecânica.

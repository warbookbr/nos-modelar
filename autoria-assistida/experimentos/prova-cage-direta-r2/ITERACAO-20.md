# R2 — iteração 20: desacoplamento antes da anca

**Decisão:** aprovada; a transição anterior à anca recebe um anel próprio de
controle com identidade estável.

O maior resíduo de planta, em `z ≈ -0,82 m`, ficava entre a saída da cabine e a
anca. Alargar a estação de `z = -0,90 m` reduzia a planta, mas violava o
envelope; compensá-la na estação seguinte reabria a frontal. A cage passou a
declarar `anelAjusteAnca` nessa faixa. Os IDs das estações existentes foram
fixados explicitamente, portanto a inserção não muda a identidade dos loops
anteriores.

O flanco do novo anel é 0,92 a 0,74 m de altura; o ombro independente fica em
0,56 a 1,02 m. Em resolução final, a planta passa de 13,1/38,1 para
12,2/36,5 mm (média/máximo). Os máximos lateral e frontal permanecem 20,5 e
32,7 mm e o envelope compilado continua exato. As médias lateral e frontal
variam 0,1 mm, abaixo da precisão reportada pelo raster, sem regressão de
contorno máximo.

O próximo maior resíduo de planta é a tampa traseira, perto de `z = -1,96 m`.
Ele tem `larguraTampaTraseira` como controle próprio e deve ser tratado sem
tocar nos dois novos anéis.

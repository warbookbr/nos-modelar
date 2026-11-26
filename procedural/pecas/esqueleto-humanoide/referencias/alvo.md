# Alvo do esqueleto humanoide

Esqueleto de proporção de um humanoide de 1.750 mm: uma bola por junta e um bastão por membro, para a pessoa aprovar a proporção por imagem antes de modelar o robô. Eixos: direita +x, cima +y, frente +z, chão em y=0. Raiz na bacia (930 mm), tronco, pescoço e cabeça; ombro, cotovelo, punho e mão; quadril, joelho, tornozelo e ponta do pé, com o lado esquerdo por espelho.

Fonte das medidas: proporções antropométricas médias de um adulto (segmentos como fração da estatura, no esquema clássico de Drillis e Contini): ombro a 0,818 da altura (1.432 mm), quadril a 0,53 (928 mm), joelho a 0,285 (499 mm), tornozelo a 0,039 (68 mm), braço 0,186 (326 mm), mão 0,108 (189 mm). Sem imagem de terceiro. O braço (330, 230, 190 mm) e a altura do ombro (1.435 mm) vêm de `procedural/pecas/robo-humanoide/proporcoes.json`; coxa e canela têm 431 mm cada, e o ombro fica a 250 mm da linha central (`eixoDoBraco` do robô).

Poses declaradas: zero, sentado (quadril e joelho a 90°) e braço erguido (ombro direito a 150°). Variantes de proporção, em `variantes/`: pernas 4% mais longas e tronco 4% mais longo. As variantes mudam só a coxa e a canela, ou só o tronco, e a altura total sobe junto.

O que reprova: aviso de atravessamento ou de elemento abaixo do chão em qualquer pose declarada; junta fora da posição que as medidas dão; membro com comprimento diferente do declarado em `proporcoes.json`.

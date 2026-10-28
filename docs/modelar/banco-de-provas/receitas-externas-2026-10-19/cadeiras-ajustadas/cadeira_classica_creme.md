# cadeira_classica_creme: ajustes de construção

Comparação entre só o alinhamento e o alinhamento mais `cadeira_classica_creme.ajustes.json` (11 ajustes). A caixa envolvente total não mudou e os passantes seguem em 0; os embutidos caíram de 5 para 4. Só são caixas retas o assento e os quatro trilhos; todo o resto é extrusão, cilindro ou peça girada e `aplicarAjustes` não o alcança. Quem julga a forma é a pessoa.

| Defeito | Decisão | Evidência | Ajuste |
|---|---|---|---|
| D1 pernas traseiras e braço 18 mm para fora atrás | não tratável | pernas z -355, braço z -337, trilho_tras -345; todos extrusões | nenhum |
| D2 moldura e encosto entram 30 a 50 mm nos braços | não tratável | moldura x ±390 e encosto ±370 contra braço desde ±340; peças giradas | nenhum |
| D3 concha 15 mm acima do trilho e à frente do assento | não tratável | concha y 275..375 contra topo do trilho 360, z 358 contra 332; cilindro | nenhum |
| D3 discos braco_miolo e concha pretos | não tratável, relatado | pretos na frontal, lateral e isométricas; compatível com face invertida do cilindro, núcleo intocado | nenhum |
| D4 filete_frente entra 20 mm nas pernas e passa 10 mm da frente do assento | não tratável | filete x ±420, z 318..342, y 350..374; cilindro | nenhum |
| D5 faixa branca atrás do assento | falso alarme como erro de posição | assento e trilho_tras já se encostam em z -315; a faixa persiste depois e parece o vão dos chanfros (0,06 e 0,01) sem fundo atrás | nenhum |
| D6 assento -359..361, trilhos -419..421, laterais 406..461 e -459..-404 | corrigido | a receita tem ±360, ±420, 405..460; o alinhamento tinha deixado o eixo em +1 mm, e pernas e braços estão em 0 | faces x do assento, de trilho_frente, trilho_tras, trilho_lado e trilho_lado_x |
| D6 braco_miolo -516..-508 contra 510..518 | não tratável | 2 mm de diferença; cilindros | nenhum |
| Assento 10 mm dentro do trilho_frente (não listado) | corrigido | base em y 350, topo do trilho em 360 | face y min do assento para 360; contato face com face, assento 120 mm de espessura |

Apoio: o assento fica entre os trilhos laterais (±360 contra 405) e sobre o trilho da frente e atrás dele. As pernas, fora do assento, sustentam os trilhos e os braços, e o poste da frente sobe até y 620; por isso o critério de topo de perna contra o assento não se aplica a esta peça.

Preservado: proporção, altura do assento (cai 10 mm na base, o topo em 480 fica), recuo de 13 mm da frente do assento (332) em relação ao trilho (345), as juntas dos trilhos de frente e de trás 15 mm dentro dos laterais (embutido de encaixe, 4 pares, não aparece) e o vão entre assento e laterais.

Pontos do desenho (espelhado, só como pista): o encontro do braço com a perna e o rolo do braço (D1, D3), o disco preto do miolo (D3) e a quebra no topo do encosto (D2) são todos de peças não tratáveis acima. Nenhum ponto apontou erro em caixa reta além do D6.

Pendente para quem toca o núcleo: a face invertida dos cilindros e as extrusões que atravessam peças vizinhas.

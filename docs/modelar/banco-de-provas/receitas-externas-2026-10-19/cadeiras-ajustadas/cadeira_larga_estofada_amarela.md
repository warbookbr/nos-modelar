# cadeira_larga_estofada_amarela: ajustes de construção

Antes: alinhamento por regra, sem ajustes. Depois: com `cadeira_larga_estofada_amarela.ajustes.json`, em `tools/modelar/fixtures/receita-externa-cadeiras/`. Medidas em milímetro, x à direita, z à frente, conforme a tabela de peças. Quem julga a forma é a pessoa; este relato só trata erro de posição e medida.

Antes: 2 embutidos, 0 passantes. Depois: 0 embutidos, 0 passantes. A caixa envolvente total é a mesma nos dois (x -450..450, y 0..800, z -420..410), variação de 0 mm por eixo.

| Defeito | Decisão | Evidência | Ajuste |
|---|---|---|---|
| D1 encosto mais largo que o vão entre os braços (pessoa: encontro do encosto com o braço) | corrigido | encosto x -320..320 contra face interna dos braços em ±310; era um dos 2 embutidos | encosto, faces x para -310 e 310 |
| D2 encosto 110 mm à frente da traseira da base | falso alarme | z -300..-120 contra base até -410: 110 mm é recuo grande e simétrico em x, intenção do desenho (patamar atrás do encosto) | nenhum |
| D3 pés recuados 10 mm na frente e 20 mm atrás do braço (pessoa: bloco do pé sob o braço) | corrigido | pés z 330..400 e -400..-330 contra braço -420..410; recuos 10 e 20 diferentes entre si | pés da frente +10 em z, de trás -20 em z: faces alinhadas ao braço |
| D4 pés deslocados para dentro da espessura do braço | corrigido | pé x 370..440 sob braço 310..450: recuo de 10 mm por fora | pés a 380..450 (esquerdo e direito espelhados): face de fora alinhada, largura 70 mantida |
| D5 braços 10 mm além do corpo | falso alarme | braço -420..410 contra base -410..400: saliência de 10 mm, acima do limite de 5 mm, é intencional | nenhum |
| Peça lateral (pessoa) | já resolvido nos braços; achado novo na base | os braços são simétricos (x ±310..450, mesmo y e z); a base e o assento ficavam a 10 mm do braço (x ±300) e nada os ligava aos braços | base e assento, faces x para -310 e 310 |
| Achado novo: assento e encosto | corrigido | assento terminava em z -110 e o encosto em -120: folga de 10 mm | assento, face de trás para z -120 |

Preservado: proporção geral, altura dos braços (615) e do encosto (800), recuo do encosto em relação à traseira da base, saliência de 10 mm dos braços, tamanho dos pés (70 x 70 x 85) e cores. A base 5 mm acima do fundo dos braços (y 80 contra 85) ficou como está, por ser a diferença mínima permitida.

Não tratável: nada. O topo dos pés encosta na face de baixo dos braços (y 85), não na do assento, porque nesta receita o assento fica sobre a base e os pés apoiam os braços; isso é construção da receita, não erro de medida.

Verificação: `npx vitest run tools/modelar/esboco-para-passos.test.mjs`.

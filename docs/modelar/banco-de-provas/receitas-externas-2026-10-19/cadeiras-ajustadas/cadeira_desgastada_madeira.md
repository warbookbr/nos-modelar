# cadeira_desgastada_madeira: ajustes sobre a folha alinhada

Antes: só o alinhamento, sem ajustes. Depois: com os ajustes em `tools/modelar/fixtures/receita-externa-cadeiras/cadeira_desgastada_madeira.ajustes.json`. Medidas em milímetro, da tabela de peças. A caixa envolvente total não mudou (x -300..300, y 0..1040, z -278..285). Passantes: 7 antes, 4 depois; embutidos: 11 antes, 6 depois. Quem julga a forma é a pessoa.

| Defeito | Decisão | Evidência | Ajuste |
|---|---|---|---|
| D1 encosto vaza abaixo do assento | corrigido | as três tábuas começavam em y 400 e entravam 60 mm em tabua_assento_5 (passantes em y, 40 mm); agora começam em y 460, na face de cima do assento, e os três passantes sumiram | face y mínima de tabua_encosto_1, _2 e _3 para 460 |
| D2 pregos 4 e 5 do encosto flutuam | não tratável | prego_encosto_4 e _5 (cilindros, z -278..-270, y 892..908) ficam 10 mm atrás da face do encosto (z -260) e acima da travessa (y 620..670); ajuste só vale para caixa reta | nenhum; a correção é na receita de origem (pregar na face, z -266) |
| D3 degraus de 10 mm em x (encosto ±280, pernas ±290, assento ±300) | já resolvido como desenho | os degraus têm 10 mm, acima de 5 mm; o encosto recua e o assento avança sobre as pernas, simétricos nos dois lados | nenhum; preservado |
| D4 pernas da frente 15 mm atrás da borda do assento | falso alarme | assento z até 285, pernas até 270: avanço de 15 mm, acima de 5 mm, e as de trás rentes em -260 | nenhum; preservado como bico do assento |
| D5 saias recuadas 10 e 20 mm da face das pernas | falso alarme | saia_frente z 220..260 contra pernas até 270 (10 mm); saia_tras -240..-200 contra pernas desde -260 (20 mm); topo das saias em y 420 encosta no assento e as faces laterais em x ±220 encostam nas pernas | nenhum; preservado |
| D6 podres de 80 e 70 mm | falso alarme | podre_pe_1 e _2 têm y 0..80, _3 e _4 têm y 0..70; diferença de 10 mm entre frente e trás, simétrica em x | nenhum; preservado como desgaste desigual |
| D7 tábua central do encosto em y 1000, laterais em 1040 | falso alarme | o alinhamento já igualou as laterais em 1040 (eram 1050 e 1030); a central 40 mm mais baixa é diferença deliberada | nenhum; preservado |
| Desenho: círculo no topo do encosto | já resolvido / preservado | corresponde a D1 (corrigido) e D7 (preservado) | ver D1 e D7 |
| Desenho: círculo na mancha do assento | falso alarme | mancha_assento_1 e _2 (2 mm de altura, y 460..462) apoiam-se nas tábuas do assento e cobrem a fresta de 10 mm entre elas; é marca de sujeira, não peça solta | nenhum; preservado |
| Desenho: círculo no prego perto da perna da frente | falso alarme | prego_assento_1 e _2 (cilindros, z 249..265) estão dentro da tabua_assento_1 (z até 285); cilindro, de todo modo, não aceita ajuste | nenhum |
| Desenho: círculo na travessa lateral junto à perna | corrigido | travessa_lateral recuava 20 mm de uma face da perna e 25 mm da outra (x -270..-245 contra pernas -290..-220); agora recua 22,5 mm dos dois lados; os 4 passantes em x que restam são a ponta da travessa embutida na perna (encaixe), sem peça saindo | deslocar travessa_lateral em +2,5 mm e travessa_lateral_x em -2,5 mm em x |

Observações sem ajuste: tabua_assento_4 e _5 se tocam (z -165), enquanto as outras tábuas do assento têm fresta de 10 mm; o alinhamento já fechou uma fresta de 5 mm e deixei como está por ser desenho de tábuas desiguais. fenda_encosto e mancha_encosto_2 estão rentes à face de trás do encosto (z -260..-254), no desenho de marca na superfície.

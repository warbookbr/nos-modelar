# cadeira_classica_vinho: ajustes de construção

Folhas: `cadeira_classica_vinho-antes.png` e `cadeira_classica_vinho-depois.png`. Ajustes em `tools/mecanifica/fixtures/receita-externa-cadeiras/cadeira_classica_vinho.ajustes.json` (15 faces, só em caixas retas). Antes: 5 embutidos, 0 passantes; depois: 0 e 0. Caixa envolvente total idêntica (x -516..518, y 0..1117, z -455..390). Este relato não aprova a forma.

| Defeito | Decisão | Evidência | Ajuste |
|---|---|---|---|
| D1 encosto (±370) e moldura (±390) entram nos braços (face interna plana em ±340) | não tratável | peças giradas em extrusão; a caixa envolvente inclinada superestima o encontro, pois em z o braço acaba em -337 e o encosto recua para trás com a altura | nenhum |
| D2 assento -359..361 entra 19 a 21 mm nos braços | corrigido | vértices do braço: |x|=340 em y 340..600; assento agora -340..340 | assento x ±340 |
| Assento entra 10 mm nos trilhos; trilhos entram 20 mm na base dos braços (340) | corrigido (achado novo) | embutido assento/trilho_frente 10 mm; trilho_lado 20 mm no braço | topo dos 4 trilhos em y 340; base do assento em y 340 |
| Pontas dos trilhos frente e trás entram 15 mm nos laterais | corrigido (achado novo) | 4 embutidos de 15 mm em x | trilhos frente e trás x ±405, encostando no lado |
| D4 trilho_lado 406..461 contra -459..-404; assento -359..361; trilhos -419..421 | corrigido | o alinhamento simetrizava em torno de x=+1, puxado pelos cilindros do braço (508..518); pernas e braços são simétricos em x=0 | tudo simétrico em x=0: lados ±(405..460) |
| D4 braco_miolo_dir 510..518 contra -516..-508; cordão dir 508..514 contra -514..-508 | não tratável | cilindros: 2 mm de assimetria e sobre o eixo | nenhum |
| D3 concha_frontal 15 mm acima do trilho e 13 mm à frente | falso alarme / intenção | cilindro de enfeite aplicado na frente do trilho; o trilho (270..340) não carrega a concha, e esticá-lo redesenharia a peça | nenhum |
| D5 braco_cordao_dir cruza as facetas | não tratável | cilindro; é o desenho do cordão | nenhum |
| D6 moldura em z -455, 100 mm atrás das pernas traseiras (-355) | falso alarme | o encosto é inclinado (visto na lateral): a base repousa em z ≈ -312, perto do assento (-315), e o topo recua; pernas e encosto não são a mesma coluna | nenhum |
| Botões do assento sobre o assento | já resolvido | y 470..490 sobre o topo em 480, dentro do contorno do assento em x e z | nenhum |
| Pontos do desenho (7): ombro do encosto, junção encosto/braço, trilho frontal e pé do braço | cobertos pelos itens acima | folhas antes/depois; o desenho está espelhado em x e serve só de pista | ver D1, D2, D3 |
| Discos pretos (botões, concha, cordões, discos dos braços) | relato, sem ação | provável face invertida do cilindro (aparece preto em todas as vistas) | nenhum, o núcleo não foi tocado |

Preservado: proporção geral, encosto inclinado e em balanço, pernas e braços em extrusão, concha, cartucho, filete e botões. A espessura do assento passou de 130 para 140 mm e a altura dos trilhos de 90 para 70 mm. Pernas (extrusões) atravessam os braços até y 620 e não foram tratadas.

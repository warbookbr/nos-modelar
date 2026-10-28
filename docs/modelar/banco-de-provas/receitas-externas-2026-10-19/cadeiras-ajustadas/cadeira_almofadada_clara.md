# cadeira_almofadada_clara: ajustes

Medido com `vistas-de-passos.mjs --alinhar` sobre a receita atual. A lista de ajustes (`cadeira_almofadada_clara.ajustes.json`) ficou vazia: o alinhamento por regra já deixa as medidas no critério, e nenhum ponto restante é erro de posição que um ajuste de caixa reta possa tratar. As tabelas de peças de antes e depois são idênticas byte a byte; a caixa envolvente total não mudou (0 mm por eixo).

Medidas em milímetro; o conjunto é simétrico em torno de x = 37 (pernas e postes de 52 mm, assento de x -196 a 270).

| Defeito | Decisão | Evidência | Ajuste |
|---|---|---|---|
| D1 cinco ripas de mesma largura, mesmo passo | já resolvido | ripas de 26 mm (x -120..-94, -48..-22, 24..50, 96..122, 168..194), passo 72, nenhuma se sobrepõe | nenhum |
| D2 ripas fora do centro dos postes | já resolvido | centro das ripas (-120..194) = 37; centro do vão entre postes (-144..218) = 37; folga de 24 mm em cada ponta | nenhum |
| D3 postes atravessam a almofada | não tratável (poste contínuo legítimo) | passantes poste_d/almofada e poste_e/almofada, 45 mm em y, antes e depois; faces coplanares em x -196, x 270 e z -200 | nenhum (o ajuste só move caixas, não recorta a almofada) |
| D4 travessas recuadas 10 mm da face traseira dos postes | falso alarme (recuo de propósito) | travessas z -190..-148, postes z -200..-148; recuo de 10 mm, acima de 5 mm; ripas (z -180..-160) ficam dentro da face das travessas | nenhum |
| D5 travessa_baixa a 43 mm do assento | falso alarme | travessa_baixa y 520..600, topo do assento 477; ripas encostam nela (600) e na travessa_alta (930), sem folga solta | nenhum |
| Pedido: topo das pernas da frente encosta no assento | já resolvido | pernas y 0..432, face de baixo da almofada y 432; saias y 330..432; igualdade exata | nenhum |
| Desenho: topo do encosto à esquerda (travessa_alta) | falso alarme | travessa_alta x -144..218 encosta nos dois postes; topo y 1060, 24 mm abaixo dos postes (1084), de propósito | nenhum |
| Desenho: extremos do assento, esquerdo e direito | já resolvido | almofada x -196..270 rente às pernas e aos postes; saias de 24 mm rentes por fora; simetria em x = 37 | nenhum |
| Desenho: encontro perna da frente e assento | já resolvido | igual ao pedido acima | nenhum |
| Desenho: pé das ripas / travessa_baixa | falso alarme | ripas começam em y 600, topo da travessa_baixa; sem vão nem excesso | nenhum |

Preservado: proporção geral (caixa 466 x 1084 x 472 mm), o recuo de 10 mm das travessas, o desnível de 24 mm entre as travessas e o topo dos postes, as saias rentes ao assento e o poste contínuo atravessando a almofada.

Não tratado: D3. Se a pessoa quiser a almofada recortada ao redor dos postes, é mudança de receita ou de ferramenta, não de ajuste de posição. Os pontos do desenho vieram espelhados e foram usados só como pista do tipo de defeito. Quem julga a forma é a pessoa.

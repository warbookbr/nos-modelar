# cadeira_ripada_marrom: ajustes de construção

Folhas: `cadeira_ripada_marrom-antes.png` (só alinhamento) e `cadeira_ripada_marrom-depois.png` (com `cadeira_ripada_marrom.ajustes.json`). Medidas em milímetro, da tabela de peças. Forma não aprovada; quem julga é a pessoa.

| Defeito | Decisão | Evidência | Ajuste |
|---|---|---|---|
| D4 degrau de 1 mm entre poste_d e perna_td; simetria das pernas traseiras | corrigido | perna_te -302..-237 (65); perna_td 88..154 (66); espelho de te em torno de -74,5 dá 88..153; poste_d termina em 153 | perna_td, face x max para 153 |
| D5 travessa_topo 12 mm além dos postes (e ponto do desenho na ponta da travessa) | corrigido | travessa -314..165 contra postes -302..-252 e 103..153: sobra de 12 mm por lado | travessa_topo, face x min -302 e x max 153 (flush com os postes que a apoiam) |
| D1 pernas traseiras 47 mm para dentro da borda traseira do assento | falso alarme (intenção) | z -190..-162 é o mesmo recuo dos postes (-190..-154); as faces traseiras coincidem em -190 e a frente difere 8 mm; ficam dentro do assento e encostam em y 294 | nenhum |
| D1 seções diferentes (frente 70x24, trás 65x28) | falso alarme (intenção) | diferença de 5 mm ou mais em x e z, em dois pares coerentes | nenhum |
| D2 faceta de topo de poste sob a travessa | falso alarme | os 4 pares embutidos (postes e ripas entram 24 mm na travessa, y 793..817) são tenão; 0 passantes; a faceta persiste antes e depois e vem da ordenação de faces coplanares da vista (z -154 comum) | nenhum |
| D3 faceta de topo de perna na quina do assento | falso alarme | topo de perna em y 294 coincide com a face de baixo do assento; a faceta é o mesmo artefato de vista | nenhum |
| D5 assento de 88 mm sobre pernas de 24 a 28 mm | falso alarme (proporção) | espessura do assento é medida da receita, não erro de posição | nenhum |
| Ponto do desenho na ripa alta | falso alarme / incerto | ripas simétricas (centros -142,5 e -6,5 contra -74,5); folgas 82, 81, 82 mm; faces y 382 e 817 iguais às dos postes; não achei erro de posição | nenhum |
| Pernas da frente e simetria esquerda e direita das demais peças | já resolvido | fe/fd 70 mm, espelhadas; postes, ripas e assento simétricos desde o alinhamento | nenhum |

Antes e depois: passantes 0 e 0; embutidos 4 e 4; caixa envolvente total x -314..165, y 0..1001, z -237..239 nos dois casos (variação 0 mm). Só mudaram perna_td e travessa_topo.

Preservado: seções diferentes das pernas, recuo das pernas traseiras sob os postes, assento espesso, travessa com a altura original, ripas mais largas que os postes (55 contra 50).

Não tratável: nada nesta cadeira; as 10 peças são caixas retas sem giro.

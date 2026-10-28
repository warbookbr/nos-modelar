# cadeira_larga_estofada_clara: ajustes de construção

Ajustes em `tools/modelar/fixtures/receita-externa-cadeiras/cadeira_larga_estofada_clara.ajustes.json` (20 faces, cada uma com `motivo`), aplicados depois do alinhamento por regra. Medidas em mm, da tabela de peças. A forma não está aprovada; quem julga é a pessoa.

| Defeito | Decisão | Evidência (medida) | Ajuste |
|---|---|---|---|
| D1 encosto mais largo que o vão dos braços | corrigido | encosto x -320..320 contra braços em ±310: 2 pares embutidos; depois 0 | encosto x min -310, max 310 |
| D2 patamar da base atrás do encosto | corrigido | encosto z -300..-120, base e braços até -420: patamar de 120 | encosto z min -420 (espessura 180 vira 300; a pessoa pode preferir outra solução) |
| D3 braços 10 mm além da base e do assento | corrigido | braços z -420..410, base -410..400, assento até 400 | base z -420..410, assento z max 410 |
| D4 pés recuados da ponta do braço | corrigido | pés x até 440, z 330..400 e -400..-330, contra braço 450 e -420..410 | pés x ±450, z max 410, z min -420 |
| D5 pés baixos e nenhum sob a base | falso alarme | pés 85 mm de altura sob os braços, que carregam a base; pé sob a base seria desenho novo | nenhum |
| Desenho: ponto no pé da frente | corrigido (é o D4) | recuo de 10 mm em z e em x | ver D4 |
| Desenho: placa na face interna do braço, perto da frente | corrigido | assento x ±300 contra braço 310 (folga de 10), assento 400 contra braço 410 na frente | assento x ±310, z max 410 |
| Desenho: aresta entre braço, assento e base | corrigido (é o D3) | frente dos braços 10 mm além da base e do assento | ver D3 |
| Já resolvido pelo alinhamento | já resolvido | assento y 280..440 sobre base 80..280 (antes 285, folga de 5) e encosto y 280; topo do pé y 85 na face de baixo do braço | nenhum |
| Achado novo: base solta | corrigido | base x ±300, braços em ±310, pés em 370..440: sem contato com nada | base x ±310 |
| Achado novo: base 5 mm abaixo dos braços | corrigido | base y min 80, braços e topo dos pés 85 | base y min 85 |
| Achado novo: folga de 10 mm entre encosto e assento | corrigido | encosto z max -120, assento z min -110 | assento z min -120 |

Antes e depois: passantes 0 e 0; embutidos 2 e 0. Caixa envolvente total idêntica (x -450..450, y 0..800, z -420..410), variação 0 mm por eixo. As vistas mostram simetria esquerda e direita, a base encostada nos braços e as costas alinhadas.

Preservado: proporção geral, altura dos braços (615) e do encosto (800), espessura do assento, tamanho e posição dos pés em y e z (só as faces externas foram alinhadas ao braço) e a largura do vão entre os braços. Nada ficou sem tratamento por ser peça girada, cilindro ou extrusão: as nove peças são caixas retas.

Cor: a poltrona deve ficar branca. A cor não é geometria e não entra nos ajustes; o branco fica para o passo de material.

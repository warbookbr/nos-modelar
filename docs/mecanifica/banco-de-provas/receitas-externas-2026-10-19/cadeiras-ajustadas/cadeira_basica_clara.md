# cadeira_basica_clara: relato dos ajustes

Medido sobre a tabela de peças atual (com alinhamento). A lista de ajustes ficou vazia (`cadeira_basica_clara.ajustes.json`): nenhum erro de posição ou medida foi encontrado. A tabela depois é idêntica à antes, e a caixa envolvente total não mudou (x -252..252, y 0..1003, z -237..273). Não aprovo a forma; quem julga é a pessoa.

| Defeito | Decisão | Evidência | Ajuste |
|---|---|---|---|
| D1: assento avança 24 mm à frente das pernas dianteiras e 17 mm atrás das traseiras | falso alarme | Balanço de 17 mm em x nos dois lados e atrás, 24 mm na frente; a diferença de 7 mm é maior que 5 mm, logo é desnível deliberado, e as faces não se encostam | nenhum |
| D2: assento de 102 mm sobre pernas de 62 a 65 mm | não tratável | É proporção do desenho (y 348..450 contra pernas de 62 a 65 mm); corrigir seria redesenhar | nenhum |
| Ponto da pessoa: topo da perna da frente junto ao canto do assento | falso alarme | Topo da perna em y 348 e face de baixo do assento em y 348: contato exato, sem folga e sem atravessar; a perna está recuada 17 mm em x e 24 mm em z da borda. O que se vê no canto é o chanfro do assento | nenhum |
| Simetria esquerda e direita | já resolvido | Pernas x -235..-170 e 170..235, mesmas alturas e z em cada par | nenhum |
| Painel do encosto | já resolvido | x -170..170 encosta nas faces internas das pernas traseiras (x ±170); z -205..-170 dentro do z das pernas (-220..-158); topo y 950 abaixo do topo das pernas (1003) | nenhum |
| Passantes perna_td e perna_te com o assento (z, 61.8 mm) | não tratável | As pernas traseiras são uma peça só de y 0 a 1003 e atravessam o assento por desenho (o montante do encosto); cada uma fica inteira dentro da faixa z do assento | nenhum |

Preservado: proporção, montantes traseiros contínuos, balanço do assento, painel do encosto e as quatro pernas com 62 a 65 mm de seção.

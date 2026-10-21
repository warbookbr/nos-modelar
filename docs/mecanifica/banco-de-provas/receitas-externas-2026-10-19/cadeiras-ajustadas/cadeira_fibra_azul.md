# cadeira_fibra_azul: ajustes de construção

Ajustes em `tools/mecanifica/fixtures/receita-externa-cadeiras/cadeira_fibra_azul.ajustes.json`, aplicados depois do alinhamento. Medidas em milímetro, tiradas da tabela de peças atual. Não é aprovação de forma; quem julga é a pessoa.

| Defeito | Decisão | Evidência | Ajuste |
|---|---|---|---|
| D1 degrau de 20 mm atrás | corrigido | base z -420, braços e encosto z -440 | base_vime face z min para -440 |
| D2 base maciça sobre tocos | falso alarme | é proporção do desenho, não erro de medida; os pés seguem com 90 mm visíveis | nenhum |
| D3 pés fora da quina da base | corrigido | pés da frente 20 mm para dentro, os de trás 120 mm (após D1), x 10 mm | pes, pes_x, pes_y, pes_xy deslocados para rente às quinas: x -445..-375 e 365..435, z 270..340 e -440..-370 |
| Topo do pé dentro da base (não listado) | corrigido | pés y 0..120, base a partir de y 90: entravam 30 mm | face y max dos quatro pés para 90 |
| D4 almofada_encosto centrada em x 0 | não tratável | peça girada; ajuste só vale em caixa reta | nenhum |
| D5 almofada_encosto afunda no assento | não tratável, provavelmente intencional | peça girada, base y 392 contra topo do assento 460; almofada inclinada | nenhum |
| D6 braços 45 mm para fora da base | falso alarme | simétrico (x -490 e 480 em torno de -5), braços de 140 mm largos como no desenho | nenhum |
| D7 assento 20 mm recuado da frente | já resolvido, intencional | almofada_assento z -280..320, base e braços em 340; encosta no encosto em z -280 e nos braços em x -350 e 340 | nenhum |
| Suspeita de vistas espelhadas | já resolvido | quadro atual com x para a direita | nenhum |

Pontos do desenho da pessoa: a junção do pé com o assento e com o braço correspondia aos degraus de 10 a 120 mm dos pés (D3, corrigido) e ao topo do pé entrando na base (corrigido). O bloco no canto de trás do braço ficou como estava: braço, base e encosto agora terminam em z -440 e o braço permanece 45 mm para fora, por intenção do desenho.

Antes e depois: caixa envolvente total idêntica nos dois (x -490..480, y 0..758, z -440..340), variação de 0 mm por eixo. Passantes 0 e 0. Embutidos 10 antes e 6 depois (os quatro que sumiram eram os pés dentro da base). Simetria em x em torno de -5 confirmada em base, pés, braços, encosto e almofada do assento.

Preservado: alturas e larguras de todas as peças, braços mais largos que a base, recuo de 20 mm da almofada do assento, o encosto e a almofada inclinada (intocada).

Fora do alcance: a almofada_encosto (girada) segue com o centro em x 0 e a base dentro do assento.

# alvo: onibus-rodoviario

Origem do modelo: "pacote C", de autor C, publicado em repositório de modelos livres sob licença livre sem exigência de crédito. Pacote `pacote-c` da tabela `docs/modelar/veiculos-referencias.json` (modelo BUS, arquivo BUS.obj). Página: endereço omitido. A malha (cinco malhas: a carroceria e quatro rodas) fica em `importados/veiculos-livres/pacote-c/`, ignorada pelo git, e não entra no repositório. Só as medidas lidas dela entram aqui.

Orientação: a malha de origem tem a frente em -z. `fonte-partes.json` e `fonte-vistas.png` foram gerados com `--girar 180` e trazem a frente em +z (campo `frente` do JSON), que é a convenção do acervo. A vista lateral da fonte mostra a frente à esquerda e a vista de cima mostra a frente embaixo.

Dimensões da fonte, em milímetro, com a frente em +z: 12000 de comprimento, 2663 de largura (x ±1331), 2954 de altura. A carroceria tem o fundo em y 327; as rodas descem até o chão. Rodas de 896 de diâmetro e 337 de largura, com o centro em z 3203 e z -2889 e as faces de dentro em x ±928.

Como a receita lê a fonte: o perfil lateral, a seção frontal e as faces de frente e de trás vêm de `medidas-da-fonte.mjs`; a posição das janelas, das colunas, dos bagageiros e dos arcos foi lida de um mapa de profundidade da lateral da malha, gerado em rascunho (`tmp/onibus-rodoviario/`). A saia e a estufa são interseções do perfil lateral com a seção frontal, que dá o afunilamento da estufa (meia largura 1326 na cintura, 1236 perto do teto) e o canto arredondado do teto.

Folha comparativa lida na rodada final (`folha-comparativa.png`, receita contra fonte na mesma câmera):

- Lateral: o contorno confere (interseção sobre união 0,945). Fileira de nove vidros com colunas nos mesmos z da fonte, cintura, bagageiros na saia, arcos recortados com a roda inteira visível, frente quase vertical e rampa curta do teto no nariz como na fonte.
- Frontal: o afunilamento da estufa e o teto de cantos chanfrados conferem (interseção sobre união 0,865). O para-brisa é grande como o da fonte.
- Isométrica e de cima: a mancha azul de "sobra" no teto é efeito do comparador, que confunde o teto branco da fonte com o fundo; a lateral e a frontal não mostram sobra equivalente.

Diferenças restantes em relação à fonte:

- O vidro da fonte é uma face rebaixada da própria carroceria, sem cor. Aqui os vidros são sólidos escuros de toda a seção da estufa e as colunas são brancas. A cor escura do vidro é desvio a decidir com a pessoa (a fonte é monocromática); a recomendação é manter, porque um ônibus branco inteiro fica ilegível em primitivas.
- Os cantos da planta (frente e traseira) são retos; a fonte arredonda os da frente com raio perto de 150 mm. A planta não foi usada como quarto sólido.
- Os vidros ficam rentes à lateral; a fonte os tem rebaixados poucos milímetros, com moldura fina.
- O para-brisa não tem a diagonal que a fonte faz na base da janela da porta (de y 1788 a 1490 entre z 4712 e 5494); aqui a janela da porta termina em y 1788 e o para-brisa começa em z 5494.
- Os bagageiros são cinco placas cinza de 5 mm por lado, sem maçanetas e sem o friso horizontal em y 1117.
- A frente tem um para-choque único e dois faróis em caixa; a fonte tem indicadores nos cantos e uma faixa de grade abaixo do para-brisa.
- A traseira tem o vidro retangular (trapezoidal na fonte), duas lanternas largas e o para-choque fino; falta a tampa do motor rebaixada.
- Rodas: pneu de 24 lados, aro e cubo lisos; a fonte tem 2766 triângulos por roda, com raios e cubo em relevo.
- Não há retrovisores nem indicadores laterais.

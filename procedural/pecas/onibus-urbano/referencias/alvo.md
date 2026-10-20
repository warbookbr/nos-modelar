# Alvo: ônibus urbano

**Origem.** Modelo "Bus" do pacote D, de autor D, publicado em repositório de modelos livres sob licença livre sem exigência de crédito, pacote `pacote-d`, arquivo `Bus.fbx`. Página: endereço omitido. A malha não entra no repositório (fica em `importados/veiculos-livres/pacote-d/Bus.fbx`, ignorada pelo git). Daqui vêm `fonte-vistas.png` (quatro vistas) e `fonte-partes.json` (caixa e silhuetas em fatias, em metro, frente em +z, chão em y = 0, escalado para 11,5 m, giro aplicado 0 graus).

**Como as medidas foram tiradas.** A malha tem uma peça só, com seis materiais (carroceria, vidro, pneu, aro e dois sem uso). Os vértices de cada material, já na escala e no referencial do acervo, deram: os planos da cintura (y 2262) e do beiral (y 3260), as sete faixas de vidro e as colunas de 110 mm, a diagonal de baixo do vidro da cabine, os dois arcos de roda (polígono de cinco vértices), as rodas (octógono de raio 549, disco de aro de raio 388), a lâmina do retrovisor e o braço dela.

**Diferenças em relação à fonte, por vista.**
- Isométrica: a receita sobra 0,09% e falta 0,04% da área da fonte. Os pneus ficam dentro de um arco com caixa escura atrás; na fonte o fundo do arco é da cor da carroceria. O pneu não tem o anel rebaixado da fonte.
- Lateral: sobra 0% e falta 0,02%. Falta só a ponta do braço do retrovisor, que na fonte é um plano fino e na receita é uma barra de interseção.
- Frontal: falta 0,31%, nas pontas de cima dos dois braços dos retrovisores. A fonte tem a frente levemente abaulada em planta (centro 20 a 37 mm à frente dos cantos), que a receita não reproduz: a frente e a traseira têm o contorno do centro em toda a largura.
- De cima: sobra 0,01% e falta 0%. O bico dos retrovisores coincide.
- O fundo do arco da fonte está em x 1029; a caixa de roda da receita vai só até x 1126, a face de dentro do pneu, para fechar o contato.
- A quina de baixo da frente na fonte é chanfrada em planta (x 1436 em z 5688); a receita é reta.
- O vidro é uma cor só; a fonte tem duas tonalidades por reflexo de luz.
- A fonte não tem faróis, lanternas nem para-choques; nenhum foi acrescentado.

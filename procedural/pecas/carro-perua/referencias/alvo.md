# Alvo da perua

Origem: modelo "Wagon" do pacote pacote D, de autor D, publicado em repositório de modelos livres sob licença livre sem exigência de crédito. Página: endereço omitido. A malha não entra no repositório (fica em importados/veiculos-livres/pacote-d/Wagon.fbx, ignorada pelo git).

O que serve de alvo: `fonte-vistas.png` (quatro vistas ortográficas) e `fonte-partes.json`, a caixa e a silhueta por superfície em fatias de z e de y, em metro, com a frente em +z, o chão em y = 0 e a escala de 4,7 m de comprimento. A caixa é 2034 por 1580 por 4700 mm.

Técnica: a carroceria, os três vãos de vidro, as duas colunas e o teto saem da interseção do perfil lateral extrudado em x, da seção frontal extrudada em z e de uma caixa de recorte por parte. Os arcos das rodas são recortados no perfil lateral e cada caixa de roda fecha o arco entre os pneus. Rodas octogonais com calota, faróis e lanternas completam a peça (21 partes, 468 triângulos).

Prova de forma: folha comparativa na mesma câmera e escala (tmp/carro-perua/folha-final/folha.png). Área que sobra na receita: 1,3 % na isométrica, 0,9 % na lateral, 0,3 % na frontal, 0 % na planta; área que falta: no máximo 0,07 %. `comparar-silhueta --rigoroso --cabine auto`: caixa idêntica, média de 5 mm em z e 14 mm em y, máxima de 85 mm, nenhuma fatia fora.

Diferenças restantes, vistas na folha:
- isométrica: os faróis da fonte são brancos e fazem uma quina chanfrada na base do capô; na receita são placas retas de 8 mm na face do nariz, com sobra azul pequena nessa região.
- lateral: na fonte o arco da roda é um para-lama facetado com borda mais escura e sobe mais; na receita o arco é um octógono simples com folga de 100 mm e fundo escuro. A fonte tem um recorte pequeno na ponta do nariz (z 2076 a 2358, y 827 a 999) que a receita não tem, e um pequeno degrau no vidro traseiro que a receita faz reto.
- frontal: o afunilamento da cabine, o vinco da cintura e a saia recolhida coincidem; sobram 8 mm de roda em x 761 a 786.
- planta: coincide; a fonte mostra as facetas da frente do capô, que a receita não separa.
- lanternas: na fonte a lanterna vermelha está no canto alto da traseira; na receita fica na face vertical de trás, em y 960 a 1080.

Não modelado: maçanetas, frisos e a sombra da grade.

# Alvo: carro-sedan-angular

Origem. Modelo "Sedan", arquivo Sedan.fbx, do pacote D (pacote-d), de autor D. Licença livre sem exigência de crédito. Página: endereço omitido. A malha não entra no repositório: fica em importados/veiculos-livres/pacote-d/Sedan.fbx, ignorada pelo git. Aqui ficam só as vistas e as silhuetas em fatias (fonte-vistas.png, fonte-partes.json), geradas por modelo-de-referencia.mjs, com 4,5 m de comprimento. Frente em +z, conferida na lateral (frente à esquerda) e na planta (frente embaixo).

Técnica. Carroceria de baixo, estufa (parabrisa, coluna B, vidro traseiro) e teto saem, cada um, da interseção do perfil lateral da parte com a seção frontal do carro (saia a 897 mm de meia largura em y 190, vinco a 962 em y 765, teto a 820 em y 1513). Arcos de roda recortados no perfil da carroceria, mais uma caixa de roda por eixo. Rodas de 8 lados, raio 328 mm, face de fora em x 974 (a fonte mede 974 nas rodas e 962 na carroceria).

Medidas finais (comparar-silhueta --rigoroso, 90 mm por fatia): caixa igual à fonte (y a 1 mm); fatias em z média 2 mm, máxima 65 mm; fatias em y média 5 mm, máxima 42 mm; estufa média 2 mm, máxima 12 mm; zero fatias fora. Folha comparativa: interseção sobre união 0,978 na isométrica, 0,978 na lateral, 0,986 na frontal e 0,999 na planta.

Diferenças em relação à fonte, vistas na folha (folha-comparativa/folha.png):

- Isométrica: a fonte tem a coluna A e a coluna C como faixas claras e escuras de 30 a 40 mm nas bordas do vidro; a receita não as tem, e o vidro vai direto ao teto. Os faróis da fonte são trapézios na quina do nariz; na receita são placas retangulares de 350 mm que sobram 10 mm da face (a diferença azul na folha).
- Lateral: a fonte mostra facetas de sombra em torno das rodas (triangulação do painel, sem geometria própria na silhueta); a receita tem painel liso e o arco recortado em octógono com 45 mm de folga. A coluna B tem 65 mm e 50 mm de inclinação, lidas a olho na imagem.
- Frontal: o afunilamento, o vinco e a saia coincidem; a fonte tem a face do nariz em duas faixas (grade clara sob o capô) e a receita tem uma face inclinada só, com o farol sobre ela. Os cantos de cima do teto da fonte têm chanfro pequeno que a receita não tem.
- Planta: coincide; a fonte mostra a triangulação do capô e do porta-malas, que a receita não reproduz.

Escolhas e dúvidas: o perfil lateral do topo da fonte tem vértice em z 1078 e y 1087, que é amostra do envelope; a base real do parabrisa, cruzando a reta do capô com a do parabrisa, cai em z 1065 e y 1064, igual à altura do convés, e foi essa a medida adotada. Faróis brancos, como na fonte (a receita anterior usava amarelo). Não modelados: frisos, maçanetas, divisão das portas, interior, colunas A e C como partes, vidro dianteiro dividido.

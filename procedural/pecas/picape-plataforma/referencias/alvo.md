# Alvo: picape-plataforma

Origem: modelo `truck-flat` do pacote A, de autor A, licença livre sem exigência de crédito, endereço omitido (confirmado em docs/modelar/veiculos-referencias.json). A malha fica fora do repositório, em importados/veiculos-livres/pacote-a/truck-flat.glb. Em referencias/ ficam fonte-vistas.png e fonte-partes.json (metro, escala 1,765). Frente em +z, à esquerda na lateral.

Medidas: 4846 mm de comprimento, 2648 mm de largura com espelhos, 2295 mm de altura; rodas de 1060 mm de diâmetro em z 1381 e -1125. As faces da malha foram lidas em milímetro para o corpo, a saia, as abas dos arcos, a borda da caçamba e a cabine (meia largura 971 mm na base e 794 mm no teto).

## Diferenças em relação à fonte

- Lateral: perfil coincide (interseção sobre união 0,996). O piso da caçamba fica em y 1093 e não em 1077 (a parede de 11 mm entre o arco e o piso daria face lasca); a caçamba tem 319 mm de fundo em vez de 335.
- Frontal: a seção coincide. O pneu tem 529 mm de largura como na fonte, e o aro sai 15 mm da face de fora (a fonte tem o cubo rente). Faltam o degradê e as quinas arredondadas do para-choque.
- Superior: a borda da caçamba, a cabine afunilada e o para-brisa coincidem. O mapa de diferença da folha marca a cabine como "sobra" porque o teto branco da fonte tem a cor do fundo; é artefato da máscara, não da forma.
- Isométrica: o cubo do pneu é um disco liso, sem anel interno; os espelhos, faróis e piscas são caixas e placas de 6 a 12 mm; as lanternas são placas vermelhas em posição suposta no canto de trás (a fonte não tem vista traseira).
- Cores tiradas da imagem (cinza claro, saia e abas escuras, piso azulado); a textura da fonte não é reproduzida.

# Carcaça da empilhadeira: alinhamento

**Estado:** em pausa até o fim do [plano das ferramentas de
modelagem](../../planos/encerrados/2026-10-07-as-ferramentas-de-modelagem.md), porque a
carenagem moldada pede a casca nativa da fatia 6. O alinhamento parou na ordem de
montagem; o que já foi decidido com a pessoa em 2026-10-09 está abaixo.

## O objeto

A carcaça de uma empilhadeira a combustão de 2,5 t, sem torre, garfos, rodas,
assento, coluna de direção com volante, pedais e eixo dianteiro. As referências
em [`referencias/`](referencias/) são renders de CAD da carcaça em seis vistas,
sem marca. A imagem de topo em traço que veio junto trazia marca e nome de modelo
e ficou fora do repositório.

## A escala

A largura externa nos paralamas é 1.150 mm, da ficha técnica, e a base da
carcaça fica a 150 mm do solo. O comprimento é 2.150 mm, tirado das imagens: a
vista de cima tem 1,87 de comprimento para 1 de largura e a lateral, 2,54 de
comprimento para 1 de altura, o que dá cerca de 2.150 mm de comprimento e 846 mm
de altura sobre os 1.150 mm. A altura de 850 mm da ficha bate com as imagens; o
comprimento de 2.635 mm da ficha não bate, provavelmente porque mede a máquina
inteira, e a pessoa escolheu o das imagens.

## As partes

De trás para a frente, as oito partes aceitas pela pessoa: o contrapeso, bloco
cinza escuro embaixo e atrás, com a abertura da grade na traseira e os recortes
das rodas traseiras; o capô, bloco laranja alto sobre o contrapeso, com a tampa
cinza por cima; as duas laterais, chapas laranja que descem em rampa do capô até
o degrau, com o arco aberto da roda dianteira e o arco traseiro; os forros cinza
por dentro dos arcos traseiros; o piso do operador, escuro e rebaixado entre as
laterais, com o anteparo dos pedais subindo na frente; o painel frontal, caixa
escura à frente do piso; os paralamas dianteiros, abas finas e largas sobre as
rodas da frente, que dão a largura total; e o degrau de acesso, placa
antiderrapante no lado.

## O grau de realismo

Silhueta fiel e cantos arredondados. O contorno da lateral e o de cima saem das
imagens em milímetro pela skill `contorno-da-imagem`, e não a olho. Com o esboço
de hoje, as laterais, os paralamas e o degrau saem fiéis como chapas, e o capô, o
contrapeso e o painel como lofts de cantos arredondados; as superfícies que
curvam em duas direções (a passagem da lateral para o capô e os forros) ficam
aproximadas, e os rebaixos e a grade do contrapeso ficam como volume rebaixado.
Com a casca nativa, a carcaça pode sair como carenagem moldada.

## O que falta perguntar

A ordem de montagem, com a proposta de começar pelo piso e pelo contrapeso, as
laterais presas aos dois, o capô sobre o contrapeso entre as laterais, o painel
na frente do piso e os paralamas e o degrau presos nas laterais; os pares que se
tocam e por quê; e o que reprova o esboço.

## Como retomar

Primeiro fecham-se com a pessoa as três perguntas acima. Depois a skill
`contorno-da-imagem` tira da lateral e da vista de cima o contorno de cada parte
em milímetro, na escala de 1.150 mm de largura, e esse contorno é a entrada do
esbocista no lugar das proporções lidas a olho e das medidas da ficha. O esboço
é feito sobre o nível zero da fatia 4, com a casca nativa da fatia 6 para o
capô, as laterais e os forros, e conferido contra o contorno antes de qualquer
olhar. A forma é julgada pela pessoa, que pediu para ver a composta no lugar do
crítico.

## As tentativas

A [da IA local](tentativa-ia-local/) e a [do esbocista Haiku](tentativa-haiku/)
partiram do alinhamento antigo, com o comprimento de 2.635 mm da ficha e as
proporções lidas a olho, e saíram caixas compridas e estreitas de lados retos,
reprovadas pela pessoa na forma. Nenhuma passou pelo crítico.

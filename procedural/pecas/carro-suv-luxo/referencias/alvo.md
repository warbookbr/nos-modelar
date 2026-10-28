# carro-suv-luxo — alvo

## Origem

Modelo `suv-luxury` do pacote A, de autor A (endereço omitido), licença livre sem exigência de crédito (declarada no License.txt do pacote). A tabela `docs/modelar/veiculos-referencias.json` confirma o pacote e o arquivo `suv-luxury.glb`. A malha original fica em `importados/veiculos-livres/pacote-a/suv-luxury.glb`, fora do repositório. Aqui entram só as medidas (`fonte-partes.json`, escala 1,765) e as vistas (`fonte-vistas.png`). Na fonte a frente fica à esquerda na lateral e embaixo na vista de cima, então não há giro a aplicar.

## O que a fonte mostra

SUV de uma cor laranja, com faixa lateral cinza que passa pelos arcos das rodas, cabine que afunila em reta de 971 para 794 mm de meia largura, para-brisa em rampa, uma única janela lateral (na frente da cabine), teto solar branco, grade escura entre dois faróis amarelos que dobram a quina, lanternas vermelhas nos cantos de trás, retrovisores na base das colunas, para-choque cinza com placa octogonal e sem estepe. O xmax de 1324 mm entre y 1195 e 1578 é dos retrovisores; a carroceria tem 971 mm.

## Diferenças contra a fonte, por vista (folha-comparativa.png aberta)

- Isométrica: a forma coincide (interseção sobre união 0,96). O teto solar aparece como sobra porque a placa branca da fonte tem a cor do fundo e o mascarador a descarta. Os anéis cinza dos arcos têm a mesma espessura, mas o pneu da receita tem 24 lados lisos e sem nervura.
- Lateral: perfil igual (união 0,98), com a rampa do para-brisa, o teto plano e o chanfro e a inclinação de trás. A janela lateral da receita contorna o retrovisor (a fonte a deixa por baixo dele). O arco da fonte é um polígono de 24 lados com vértice no topo, igual ao da receita. A lanterna da quina é uma placa de 12 mm mais a lateral de 176 mm, e não uma face pintada.
- Frontal: afunilamento da cabine, moldura de 176 mm do para-brisa, faixa escura no pé do vidro, grade, faróis e retrovisores iguais. O pneu aparece sem a curva de borda da fonte.
- De cima: a faixa cinza, os chanfros do para-choque da frente e o trapézio do para-brisa coincidem; a faixa de vidro do vidro de trás é mais curta na receita (trapézio de 703 a 650 mm, y 1853 a 2131).

## Desvios declarados

- O teto fica em y 2283, 11 mm abaixo dos 2294 da fonte, e a traseira em z -2503, 12 mm antes dos -2515, porque a placa do teto solar e as lanternas somam 12 mm por cima; o envelope total (2295 por 5030 mm) fecha com a fonte.
- Os tons laranja são três (corpo, cabine e teto) para reproduzir a leitura da fonte; os materiais saem da cor das amostras do mapa de cores.
- O furo da faixa cinza tem 6 mm de folga em volta do pneu; o aro sai 30 mm da face de fora, como no compacto aprovado.
- A face de baixo do carro não existe: só o que se vê de fora.

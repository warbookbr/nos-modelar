# Perna estreita: as provas

Evidência do plano [perna estreita](../../planos/2026-11-27-perna-estreita.md).

## Fatia 1: a medida dos três caminhos (2026-11-27)

A base é a perna de prova do plano do elo (`tools/fixtures/elo-entre-juntas/perna-de-prova.mjs`): três atuadores de 100 mm (corpo 100, flange de fixação 124, saída 62), coxa e canela de 431 mm em U com a seção aprovada de 110 por 70 mm, cintura 0,85, parede 2 mm, eixos e cursos do esqueleto. Cada variante foi montada só pelas portas numa cópia descartável do código (fora do repositório), com o raio mínimo da curva e a fixação do atuador trocados, e a largura é a caixa em x de todas as peças. A "folga da linha do meio" é o x da peça mais próxima do meio com o quadril no x do esqueleto (100 mm); como os três eixos são paralelos a x a perna inteira desliza até 20 mm da linha do meio sem mudar nada, então a folga só decide se o deslizamento é preciso. O caminho C foi medido com os atuadores reais e chapas e coroas de caixas e cilindros; não passou por resolução de portas nem por conferência de colisão, e a ausência de colisão nele é conta, não medida.

| Caminho | Largura em x | Folga com o quadril em x=100 | Parede mínima medida | Custo estimado |
|---|---|---|---|---|
| Hoje (base) | 387,2 mm | -31,4 mm | 1,95 mm | nenhum |
| A1: furos num círculo de 80, boca B de 100 | 357,2 mm | -31,4 mm | 1,95 mm | médio |
| A2: círculo de 74, boca B de 88 | 344,1 mm | -32,3 mm | 1,95 mm | médio |
| B1: curva a 1,5 vez a meia largura | 305,3 mm | -3,9 mm | 1,83 mm | baixo |
| B2: curva a 1,2 vez | 286,9 mm | 1,3 mm | 1,61 mm | baixo |
| B3: curva a 1,0 vez | 275,0 mm | 4,5 mm | 0,96 mm (0,1 % das faces abaixo de 1 mm) | baixo, com reforço |
| D: A2 com B a 1,5 | 275,7 mm | -2,6 mm | 1,94 mm | médio mais baixo |
| D: A2 com B a 1,2 | 255,1 mm | 6,3 mm | 1,87 mm | médio mais baixo |
| D: A2 com B a 1,0 | 241,0 mm | 12,5 mm | 1,47 mm | médio mais baixo |
| D: A2 com B a 0,8 | recusa (a casca fecha, parede 0,01 mm) | | | |
| C: elo de chapa reta de 6 mm | 85 mm (73 dos atuadores mais as duas chapas) | 86 mm | | alto |

O que cada caminho muda nas famílias. No A, o atuador ganha uma opção de fixação (por exemplo `fixacao`: flange ou face) em que os furos ficam num círculo dentro do corpo e `diametroDoFlange` deixa de ser exigido maior que o corpo; as restrições `flange-maior-que-o-corpo` e `furos-do-flange-fora-do-corpo` passam a valer só para a fixação por flange, e o padrão de hoje segue igual. A boca B do elo já lê o diâmetro e o círculo da fixação, então o elo não muda, só recebe a boca menor (a medida usou 100 e 88 mm). No B, o fator 2,5 da restrição `curva-fecha-a-parede` e da `curva-dupla-fecha-a-parede` (e a constante `FATOR_DO_RAIO` da geometria) vira parâmetro declarado com padrão 2,5, e o padrão de hoje segue igual; o atuador não muda. No C, o atuador não muda e o elo ganha uma forma nova (chapa reta com duas bocas voltadas para o mesmo lado, em vez de uma boca para cada lado), com outra geometria, outras restrições, outra aprovação mecânica e a montagem pelas portas conferida; é a mudança maior.

A parede do B foi medida por raio na face de dentro (`espessurasDaCasca`) na coxa de 431 mm, com 1613 faces amostradas: com a curva a 1,5 vez a meia largura a parede mínima é 1,83 mm e a 1,2 vez é 1,61 mm, ambas sem face abaixo de 1,5 mm, então a casca pela receita aguenta sem reforço até uns 1,2 vez; a 1,0 vez 1,3 % das faces ficam abaixo de 1,5 mm e a mínima cai a 0,96 mm, e aí o reforço por dentro da curva passa a ser necessário. Com a boca B de 88 mm a parede aguenta melhor (1,47 mm a 1,0 vez), porque o raio da boca deixa de mandar na curva da canela.

Nenhuma combinação de curva e fixação chega a 180 mm sem mudar o esqueleto: a menor largura medida da perna em U é 241 mm (A com B a 1,0 vez), e a conta mostra que cada U ainda custa a espessura da boca, o raio da curva e a meia seção para fora dos atuadores, que juntos ocupam 141 mm. Só o elo de chapa reta fica abaixo do limite, com folga grande.

O C só funciona se as faces de apoio ficarem no mesmo plano: a face da saída do quadril e a de trás do joelho (as duas voltadas para −x) recebem a chapa da coxa, e a face da saída do joelho e a de trás do tornozelo (as duas para +x) a da canela. Isso pede deslizar o joelho 67,5 mm ao longo do eixo em relação ao quadril, o mesmo tipo de ajuste que a perna de hoje já faz (o joelho ficava 59,5 mm para fora); os eixos, as alturas e os cursos do esqueleto não mudam. Os três atuadores ocupam então o mesmo intervalo em x (73 mm) e a perna tem 85 mm de largura com chapas de 6 mm, com 86 mm de folga da linha do meio no x do esqueleto. Fica por provar, na fatia 2 se a pessoa escolher o C: a rigidez de uma chapa só presa a uma face (um garfo de duas chapas exigiria uma segunda face em cada atuador), a conferência de colisão com o curso de cada junta e o desenho da chapa que cobre a furação das flanges.

## Recomendação

O caminho C. Os caminhos A e B, sozinhos ou juntos, deixam a perna entre 241 e 344 mm, longe dos 180 mm do plano, e o plano manda parar e voltar à pessoa se nada chegar sem mudar o esqueleto; o C chega a 85 mm sem mudar o esqueleto, o atuador nem o padrão do elo, ao custo de uma forma nova na família do elo. Se a pessoa preferir manter a carenagem curva do elo, o melhor caminho é A com B a 1,2 vez, a 255 mm, que não cumpre o gate de saída do plano e exigiria revê-lo.

## Imagens (fora do repositório, em `tools/bancadas/out/perna-estreita/`)

`0-base.png`, `A-fixacao-pela-face.png` (A2), `B-curva-fechada.png` (B2, 1,2 vez), `D-A-mais-B.png` (A2 com B a 1,2 vez) e `C-chapa-reta.png`, cada uma com a folha de seis vistas (isométricas, frontal, lateral e superior).

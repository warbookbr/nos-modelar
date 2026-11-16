# Reflexo na bancada: a paridade da luz rasante e da curvatura com o Blender

Pasta do plano [reflexo na bancada](../../planos/2026-11-15-reflexo-na-bancada.md), fatia 5, medida em 2026-11-16. A pergunta é se a luz rasante e a curvatura que a bancada captura por comando (`npm run bancada -- <peça> --visao=luz-rasante|curvatura`) dizem o mesmo que as do Blender 4.2.3 (`tools/modelar/vistas-de-superficie.mjs`), que o pacote do crítico de peça de lataria exige hoje. A decisão de deixar de exigir o Blender é da pessoa; esta página traz a medida e a recomendação.

## Como se mediu

O script [`medir-paridade.mjs`](medir-paridade.mjs) gera as vistas do Blender da peça e, para cada azimute que o Blender escolheu na vista, a luz rasante da bancada com o mesmo azimute, em projeção ortográfica e enquadrada, e a curvatura da bancada na mesma vista. Cada imagem é lida na caixa da peça nela (no Blender, o que não é o fundo preto da curvatura; na bancada, o que não é o fundo da auditoria), e as posições são dadas em fração dessa caixa, de 0 a 1 da esquerda para a direita e de cima para baixo. A fração iluminada segue a regra do Blender (luminância do PNG acima de 8/255 dentro da peça). A posição do amassado é o centroide do 1 % de pixels que mais mudam entre a chapa com amassado e a chapa lisa, na mesma ferramenta. A curvatura que a cor diz sai da cor do pixel, de volta ao linear, pela escala de cada ferramenta; a escala da bancada é a da conta dela (`calculo-da-curvatura.js`), a mesma que a página mostra na legenda. As duas curvaturas são comparadas numa grade de 60 por 40 pontos da caixa, onde as duas têm valor.

As duas peças foram a chapa de prova com amassado (`tools/fixtures/acervo/chapa-de-reflexo-de-prova`, 1000 por 600 mm, amassado de 1,2 mm de fundo e 80 mm de raio em x 400 e y 300, com a lisa como controle), na vista de frente, e o quarto traseiro do carro (`carro-fastback/lataria`, rodada 1), na vista de lado, de +x. Os números estão em [`paridade-chapa.json`](paridade-chapa.json) e [`paridade-quarto-traseiro.json`](paridade-quarto-traseiro.json), e cada um se refaz com:

```
MODELAR_BLENDER=<blender 4.2.3> node docs/modelar/banco-de-provas/reflexo-na-bancada-2026-11-15/medir-paridade.mjs chapa-de-reflexo-de-prova --vista-blender=frente --vista-bancada=frontal --rotulo=chapa --lisa=chapa-lisa-de-reflexo-de-prova --amassado=0.4,0.5 --figura=tmp/paridade-chapa.png
MODELAR_BLENDER=<blender 4.2.3> node docs/modelar/banco-de-provas/reflexo-na-bancada-2026-11-15/medir-paridade.mjs carro-fastback/lataria --vista-blender=lado --vista-bancada=direita --rotulo=quarto-traseiro --figura=tmp/paridade-quarto-traseiro.png
```

A chapa leva perto de 3 minutos e o quarto traseiro perto de 7, quase todo no Blender. As figuras desta pasta são as do `--figura`, reduzidas a JPEG.

## A chapa com amassado

Na figura, da esquerda para a direita: a luz rasante do Blender e a da bancada com a luz a 30 graus, as duas a 120 graus, e a curvatura do Blender e a da bancada.

![A chapa de prova: luz rasante a 30 e a 120 graus e curvatura, Blender e bancada lado a lado](paridade-chapa.jpg)

| medida | Blender | bancada |
| --- | --- | --- |
| fração iluminada, luz a 30 graus | 1,000 | 1,000 |
| fração iluminada, luz a 120 graus | 1,000 | 1,000 |
| amassado na luz rasante a 30 graus (u, v) | 0,4000; 0,5000 | 0,3997; 0,5008 |
| amassado na luz rasante a 120 graus (u, v) | 0,4001; 0,5035 | 0,3992; 0,4995 |
| maior mudança de luminância no amassado, 30 e 120 graus | 0,0235 e 0,0275 | 0,0235 e 0,0275 |
| amassado na curvatura (u, v) | 0,3998; 0,4994 | 0,3996; 0,4994 |
| escala da cor da curvatura | 0,24703 1/m | 0,24758 1/m |
| curvatura que a cor diz no centro do amassado | −0,2465 1/m | −0,2475 1/m |

O amassado declarado fica em u 0,4 e v 0,5, e as duas ferramentas o põem a até 0,001 da caixa em u (1 mm) e a até 0,004 em v (2,4 mm). A luminância das duas luzes rasantes tem correlação de 0,999 e 0,998 na grade, com média de 0,482 contra 0,481 e de 0,485 contra 0,483. A curvatura das duas tem correlação de 0,997 e diferença mediana de 0,003 1/m, 1 % da escala; no centro do amassado as duas saturam a cor, e o valor dali diz só que as escalas batem.

## O quarto traseiro do carro

A mesma ordem: a luz rasante a 230 graus e a 320 graus, que o Blender escolheu para a vista de lado, e a curvatura.

![O quarto traseiro: luz rasante a 230 e a 320 graus e curvatura, Blender e bancada lado a lado](paridade-quarto-traseiro.jpg)

| medida | Blender | bancada |
| --- | --- | --- |
| fração iluminada, luz a 230 graus | 0,909 | 0,908 |
| fração iluminada, luz a 320 graus | 0,785 | 0,805 |
| luminância média da peça, 230 e 320 graus | 0,638 e 0,501 | 0,533 e 0,447 |
| correlação da luminância na grade, 230 e 320 graus | 0,981 e 0,952 | |
| escala da cor da curvatura | 3,77573 1/m | 3,77574 1/m |
| correlação da curvatura na grade | 0,984 | |
| diferença da curvatura na grade, mediana e percentil 90 | 0,047 e 0,237 1/m | |

A carroceria não tem amassado declarado, e a posição de um defeito não se mede nela; o que se mede é que as duas imagens mostram as mesmas manchas no mesmo lugar, pela correlação. A bancada sai mais escura em média, 16 % a 230 graus e 11 % a 320, porque ela reduz a força da luz quando a peça passa de 0,7 de brilho no percentil 99 (`exposicaoDaLuz`, de `src/bancada/visoes/visao-luz-rasante.js`), e o Blender não reduz: na mesma figura, o painel de trás do Blender a 230 graus chega perto do branco e o da bancada não. A diferença da curvatura passa de 0,24 1/m, 6 % da escala, só num décimo dos pontos da grade; onde eles ficam não foi medido.

## O que não foi medido

A vista de três quartos não entrou: a do Blender olha de (0,55; 0,45; 0,70) e mostra só a metade de x positivo na peça simétrica, e a isométrica da bancada olha de (1; 1; 1), de modo que as duas não são a mesma imagem. A bancada sobe a luz nessa vista e o Blender não, e é nela que a diferença de iluminação seria maior. Também ficou fora a vista de cima, e só duas peças foram medidas.

## Recomendação

Deixar de exigir o Blender no pacote de lataria, trocando a luz rasante e a curvatura dele pelas da bancada, numa fatia própria que faça três coisas antes de tirar a exigência: o `vistas:critica` capturar a luz rasante e a curvatura pela bancada nas vistas de frente e de lado, com a fração iluminada medida em cada imagem e a recusa abaixo de 25 % que o Blender tem hoje; o `pacote.json` e o registro da rodada (`superficieDoPacote`) aceitarem essas imagens; e a vista de três quartos medida antes de entrar. A razão é que, nas duas peças, as duas ferramentas dizem o mesmo: a mesma fração iluminada a 2 pontos, o amassado no mesmo lugar a até 2,4 mm e com o mesmo contraste, a mesma escala de cor a 0,2 % e o mesmo mapa de curvatura, com correlação de 0,98 ou mais. A única diferença medida é o brilho mais baixo da bancada no carro, que é a correção de exposição dela e não muda onde as manchas estão. Enquanto essa fatia não vier, o pacote segue como está: a zebra e a pintura da bancada ao lado das vistas do Blender, que seguem exigidas.

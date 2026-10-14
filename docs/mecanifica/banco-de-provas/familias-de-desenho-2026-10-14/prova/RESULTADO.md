# Carcaça da empilhadeira nova pela família de desenho: o resultado da prova

Fatia 5 do plano [as famílias de desenho](../../../planos/2026-10-14-familias-de-desenho.md),
em 2026-10-14. Claude descreveu em palavras a carcaça da foto lateral da empilhadeira
nova ([descrição](DESCRICAO.md)), e um desenhista que não viu a foto a desenhou só com
a família da carcaça, sem mudar a família nem o catálogo dela
([`familia/`](familia/NOTAS.md)). Para separar o que a família alcança do que a
descrição deu, a família também foi ajustada direto ao contorno da foto pelo script
[`ajustar.mjs`](ajustar.mjs), uma vez dentro das faixas ([`ajuste-na-faixa/`](ajuste-na-faixa/ajuste.json))
e uma vez com as faixas abertas ([`ajuste-aberto/`](ajuste-aberto/ajuste.json)). A
[comparação](comparacao.png) põe os três desenhos, em vermelho, sobre a carcaça da
foto, em cinza escuro, com as partes fora do modelo em cinza claro.

| | razão sem alinhar | razão pela melhor translação | parâmetros |
|---|---|---|---|
| às cegas, pela família | 0,631 | 0,767 | 10 de 15 presos no limite da faixa |
| a família ajustada à foto, dentro das faixas | 0,658 | 0,815 | 9 no limite da faixa |
| a família ajustada à foto, com as faixas abertas | 0,736 | 0,906 | 12 fora da faixa |

As razões são as da ferramenta, contra a união das regiões do
[contorno da foto](../../empilhadeira-2026-10-14/referencias/empilhadeira_lateral.contornos.json):

```bash
npm run desenho -- razao docs/mecanifica/banco-de-provas/empilhadeira-2026-10-14/referencias/empilhadeira_lateral.contornos.json docs/mecanifica/banco-de-provas/familias-de-desenho-2026-10-14/prova/familia/lateral.contornos.json
node docs/mecanifica/banco-de-provas/familias-de-desenho-2026-10-14/prova/ajustar.mjs faixa docs/mecanifica/banco-de-provas/familias-de-desenho-2026-10-14/prova/ajuste-na-faixa
node docs/mecanifica/banco-de-provas/familias-de-desenho-2026-10-14/prova/ajustar.mjs aberta docs/mecanifica/banco-de-provas/familias-de-desenho-2026-10-14/prova/ajuste-aberto docs/mecanifica/banco-de-provas/familias-de-desenho-2026-10-14/prova/ajuste-na-faixa/ajuste.json
```

A razão sem alinhar fica baixa nos três porque a ponta da frente da foto é o paralama
que passa por trás da torre, 135 mm à frente de onde a família põe a ponta do
paralama; a melhor translação é a que mede a forma. No ajuste aberto ela desloca o
desenho 136 mm na horizontal e nada na vertical, de modo que o chão e a traseira
caem no lugar e a escala suposta pelo pneu se confirma: a altura ajustada é 991 mm,
contra os 998 da descrição. A foto tem rodas, torre, cabine, banco e cilindro na
frente da carcaça, e o desenho não sabe o que fica atrás deles; tirar das duas formas
a área que essas partes tapam, com [`iou_sem_tapado.py`](iou_sem_tapado.py), muda as
três razões em menos de 0,001, e a medida não pune o desenho pelo que a foto esconde.

## O que a prova mostra

A distância entre a carcaça da foto e o desenho às cegas se reparte em três partes.
A descrição custou 0,05: com as mesmas faixas, a família ajustada à foto chega a
0,815, e às cegas chegou a 0,767. A faixa custou 0,09: abrindo as faixas, a mesma
forma chega a 0,906. O resto até 1 é forma que a família não tem. Nesta empilhadeira o
paralama é uma faixa curva que abraça a roda dianteira, e a família tem um paralama
reto com o aro por baixo; por região, o paralama fica em 0,11 e o aro em 0,20 no
ajuste aberto. A tampa (0,54) e o contrapeso (0,66) também têm outra forma: a tampa
desta foto é um bloco que passa da traseira do capô, e o contrapeso se arredonda em
volta da roda traseira.

A pergunta do plano, de quantas referências uma família pede, tem a primeira
resposta: uma não basta. A família da carcaça saiu de uma foto só, e doze dos quinze
parâmetros de outra empilhadeira da mesma classe caíram fora das faixas dela, a
altura 14% acima do máximo. A descrição da família já dizia "ajustada a uma
referência só", mas nada no contrato ou no gate diz de quantas referências a faixa
veio, e o processo só viu o problema nesta prova.

Comparado com a prova do plano anterior, o desenho às cegas da carcaça antiga, sem
família, deu 0,664 sem alinhar e 0,673 pela melhor translação contra a foto dele, e
custou cerca de 124.000 tokens; o desenho pela família deu 0,767 pela melhor
translação e custou 153.677 tokens, em 17 chamadas de ferramenta. São objetos
diferentes, e a comparação só indica a ordem de grandeza.

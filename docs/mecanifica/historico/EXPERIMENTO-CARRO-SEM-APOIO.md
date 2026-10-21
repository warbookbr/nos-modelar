# Carro modelado do zero, sem o motor da Mecanifica

Em agosto de 2026 o autor do repositório pediu a outro modelo de IA que
modelasse um carro esportivo do zero, sem usar o núcleo procedural, sem
contratos, sem schemas e sem nenhuma peça do acervo. O objetivo era ver como ela
se sairia sozinha, para comparar com o que a esteira da Mecanifica produz.

Este documento guarda o que aconteceu. O gerador e o
visor foram removidos do repositório em 2026-09-11, e a razão está no fim. A
receita ficou: ela é lida pelo gerador de evidências do canal de percepção N3,
que mede a pele dela, e por isso passou a morar ao lado de quem a lê, em
`autoria-assistida/experimentos/canal-percepcao-n3/receita-cupe.js`.

## O que a IA construiu

Ela escreveu três arquivos e mais nada. Um gerador de 421 linhas com shader
GLSL, montagem de buffers, cálculo de normais, materiais e órbita de câmera. Uma
receita de 112 linhas. Uma página autocontida com as vistas canônicas.

## A abordagem que ela escolheu

A carroceria é descrita por ESTAÇÕES ao longo do comprimento, e não por
primitivas combinadas. Cada estação é um corte transversal em uma posição `z`,
com alturas nomeadas — fundo, ventre, cintura, topo — e larguras nomeadas —
fundo, máxima, ombro, topo. O gerador interpola entre estações vizinhas e
costura a superfície.

A cabine é uma segunda pilha de estações, com base, ombro e teto. As rodas, os
arcos, os faróis e os espelhos entram como primitivas posicionadas por
coordenada. O resultado mede 19.720 triângulos em 11 grupos de material.

É a mesma família de solução que a bicicleta usa para os tubos: um perfil que
varia ao longo de um caminho. A diferença é que lá o perfil é uma superelipse
com expoente declarado, e aqui são quatro alturas e quatro larguras por estação,
digitadas à mão.

## O resultado

O README do experimento declarava a tentativa reprovada pelo critério visual que
o próprio autor dela escreveu: silhueta, integração entre carroceria, cabine e
rodas, e acabamento continuaram insuficientes para um esportivo italiano.

Nas cinco vistas geradas (isométrica, lateral, frontal, traseira e superior) via-se
a postura baixa, a anca traseira cheia e a cabine avançada, e também barras
vermelhas flutuando sobre o teto e blocos claros nos para-lamas, que eram
espelhos e faróis fora do lugar.

## O que a comparação ensina

A IA sem restrição chegou mais rápido a algo que lê como carro do que a esteira
da Mecanifica chegaria hoje. Isso é honesto e vale registrar.

O que ela produziu, porém, não é editável nem verificável. Não há parte nomeada,
não há contato declarado, não há parâmetro: mudar a altura da cintura exige
achar e reescrever números dentro de uma lista de estações, e nada no resultado
diz se a mudança quebrou alguma coisa. Nenhuma das medidas deste repositório se
aplica àquela malha, porque não há identidade semântica para medir.

## Por que o gerador saiu

Ao tentar renderizar as vistas em 2026-09-11 descobriu-se que os arquivos
commitados NÃO EXECUTAM. A receita e o gerador estavam em versões diferentes: os
faróis eram declarados com `raios` e lidos como `tamanho`, e as entradas
laterais eram declaradas com `x` e `perfil` e lidas como `centro` e `tamanho`. A
página subia e parava em "gerando malha…".

Ninguém tinha percebido porque nada no repositório executava aquele código.
Guardar gerador quebrado que ninguém roda é guardar dívida com aparência de
acervo, e é a mesma classe de defeito que este repositório vem fechando: código
sem régua que o chame apodrece em silêncio. As vistas foram obtidas numa
cópia temporária com as duas correções mínimas, e este texto é o que sobra como
evidência.

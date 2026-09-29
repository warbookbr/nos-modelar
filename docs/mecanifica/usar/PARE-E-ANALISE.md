# Pare e analise

Este passo existe porque formas foram declaradas prontas sem olhar de perto: um degrau que "sumiu" e não tinha sumido, vincos, um leque de triângulos e uma cunha de sombra num canto só apareceram com zoom, arame e vistas de vários ângulos, quando a pessoa os apontou. O processo não os pegava sozinho, e este documento é o que passa a pegá-los.

## Quando parar

A IA para e analisa depois de qualquer mudança de silhueta, encontro, corte, união ou arredondamento, antes de declarar uma forma pronta e antes de pedir o aceite da pessoa. Métrica verde, malha fechada e teste passando não substituem o passo.

## A matriz

`node tools/mecanifica/olhar-bancada.mjs --analise --peca=<nome>` gera de uma vez as vistas isometrica, frontal, direita, traseira, superior e inferior em três modos: sombreado, arame e arame com raio X (18 imagens), em vista ortográfica e sem interface. Com `--parte=<nome>` gera também a peça isolada e enquadrada nas seis vistas, pelo mesmo mecanismo de `--selecionadas` com modo isolar e `--focar`. Com `--zoom=<vista>:<x0,y0,x1,y1>` recorta esse retângulo em pixels e o amplia 3 vezes nos três modos; com `--zoom-antes=<png>` junta o mesmo recorte de uma captura anterior, de mesma `--res`, ao lado do atual, no arquivo `zoom-<vista>-antes-depois.png`. Tudo sai em `tools/bancadas/out/analise-<peca>/`, com um `manifesto.json` que traz o hash da receita, a data e a lista de arquivos, e a lista é impressa. Gerar a matriz não basta: o passo só vale depois de abrir as imagens.

## Como ler

Um leque de triângulos aparece no arame como muitas arestas saindo de um único vértice sobre uma face plana grande; no sombreado quase nunca aparece, e é defeito de triangulação. Uma faixa fina é uma face estreita e comprida entre duas maiores, visível no arame como duas linhas quase coincidentes, e costuma indicar um corte ou arredondamento que não fechou. Uma cunha de sombra é uma região triangular mais escura num canto do sombreado, e vem de normal errada ou de faces que se atravessam; o raio X mostra se há geometria atrás dela. Um degrau é uma aresta que separa dois planos paralelos deslocados; ele se confirma na vista frontal ou lateral seguindo a silhueta, e no raio X como duas linhas paralelas onde deveria haver uma.

## O relato

O relato lista os defeitos por região e vista, cada um com a imagem em que foi visto. Lista também o que não foi conferido, com o motivo. Um defeito só vale como "sumiu" com o antes e o depois do mesmo ponto, no mesmo recorte, o que o par de `--zoom-antes` entrega; sem o par, o relato diz "não conferi se sumiu". A IA nunca afirma o que não viu: sem ter aberto a imagem, o relato diz que a imagem foi gerada e não foi lida.

## Registro

Ao fixar uma etapa, `etapas-da-montagem.mjs --fixar` grava no aceite o campo `analise`, com `feita` se existe manifesto com o hash da receita atual e `ausente` no resto, inclusive quando a receita mudou depois da análise. O campo não bloqueia o aceite humano, que vale em qualquer ponto; ele só torna visível se a etapa foi aceita sem o passo.

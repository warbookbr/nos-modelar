#!/bin/bash
# vaos-sem-fundo.sh: mede os vãos sem fundo do carro montado pelas cinco receitas (`carro-pela-receita.mjs`) e declara, par a par e com o motivo, os que o forro dos vãos e a aba do
# painel de trás não fecham (`docs/modelar/banco-de-provas/sedan-chassi-e-lataria-2026-11-11/alta-definicao/RECEITA.md`). `CARRO_SEM_FECHAR=1` na frente mede o carro antes de fechá-los.
# Sai 1 enquanto houver par de painel fora da faixa que a receita declara (`FOLGAS`), e o que sobra sem fundo sai com o motivo. Os quatro cubos de roda são a folga radial do desenho
# da família roda-pneu; os outros são restos de 1 a 13 mm de linha nas pontas do forro, que esticá-las não fecha sem entrar em outra parte (a porta de trás, medido a 2 e a 4 mm).
# Uso: procedural/pecas/sedan-chassi-e-lataria/alta-definicao/vaos-sem-fundo.sh [outras opções do vao:partes]
cd "$(dirname "$0")/../../../.."
C=procedural/pecas/sedan-chassi-e-lataria/alta-definicao/carro-pela-receita.mjs
CUBO='folga radial de 8,7 mm do cubo no eixo, do desenho da família roda-pneu, que não modela retentor nem tampa do cubo'
RESTO='resto de 1 a 2 mm de linha no fim do forro do vão da porta traseira, em y 420 ou em z -1314, onde o forro acaba antes da quina; esticar a ponta do forro 2 mm a faz entrar na porta de trás'
npm run vao:partes -- $C --esperado=4 --tolerancia=0.2 --fundo=modelo --soltas=recusar --linhas=0 "$@" \
  --sem-fundo="cuboDianteiraDir:eixoDianteiro:$CUBO" --sem-fundo="cuboDianteiraEsq:eixoDianteiro:$CUBO" --sem-fundo="cuboTraseiraDir:eixoTraseiro:$CUBO" --sem-fundo="cuboTraseiraEsq:eixoTraseiro:$CUBO" \
  --sem-fundo="lateralTraseiraDir:tampaDoPortaMalas:resto de 13 mm de linha no pé da tampa, em z -2082, onde a tampa, a lateral e o painel de trás se encontram: o raio que desce para trás passa pelo vão antes do começo do forro da tampa, e esticar o forro para trás o poria para fora do painel de trás" \
  --sem-fundo="forroDosVaos:painelDianteiro:a ponta do forro do capô, em z 2118, fica a 2,4 mm do painel da frente, na quina do capô com o painel: 4 mm de linha" \
  --sem-fundo="lateralTraseiraDir:travessaDaCabine:$RESTO" --sem-fundo="lateralTraseiraEsq:travessaDaCabine:$RESTO" \
  --sem-fundo="lateralTraseiraDir:soleiraDir:$RESTO" --sem-fundo="lateralTraseiraEsq:soleiraEsq:$RESTO" \
  --sem-fundo="lateralTraseiraDir:soleiraDoChassiDir:$RESTO" --sem-fundo="lateralTraseiraEsq:soleiraDoChassiEsq:$RESTO"

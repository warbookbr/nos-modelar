#!/bin/bash
# vaos-sem-fundo.sh: mede os vãos sem fundo do carro montado pelas cinco receitas (`carro-pela-receita.mjs`) e declara, par a par e com o motivo, os 19 que a aba do painel de
# trás e o forro dos vãos não fecham (`docs/modelar/banco-de-provas/sedan-chassi-e-lataria-2026-11-11/alta-definicao/RECEITA.md`). `CARRO_SEM_FECHAR=1` na frente mede o carro antes
# de fechá-los. Sai 1 enquanto houver par de painel fora da faixa de 4,1 ± 0,1 mm que o esboço declara, e o que sobra sem fundo sai com o motivo.
# Uso: procedural/pecas/sedan-chassi-e-lataria/alta-definicao/vaos-sem-fundo.sh
cd "$(dirname "$0")/../../../.."
C=procedural/pecas/sedan-chassi-e-lataria/alta-definicao/carro-pela-receita.mjs
CUBO='folga radial de 8,7 mm do cubo no eixo, do desenho da família roda-pneu, que não modela retentor nem tampa do cubo'
LATPAINEL='o trecho de baixo do vão de 4 mm da lateral com o painel de trás, de y 470 a 550 em z -2083, não fecha com a aba de 20 mm: o raio oblíquo passa entre a aba e a lateral abaixo de y 550, e fechar pede aba mais larga ou forro, que é escolha de forma'
ABALAT='o mesmo trecho visto do outro lado da aba: o vão de 4 mm entre a aba e a lateral, de y 473 a 550, que a aba não fecha'
TETO='o vão de 4 mm entre o para-lama e o pé do teto, de x 770 a 818 em z 704 a 740, fica sobre o compartimento do motor, e o forro do vão do para-lama termina no pé da cabine; fechar pede forro na linha do peitoril'
RESTO='resto de 1 a 2 mm de linha no fim do forro do vão da porta traseira, em y 420 ou em z -1314, onde o forro acaba antes da quina'
npm run vao:partes -- $C --esperado=4 --tolerancia=0.2 --fundo=modelo --soltas=recusar --linhas=0 \
  --sem-fundo="cuboDianteiraDir:eixoDianteiro:$CUBO" --sem-fundo="cuboDianteiraEsq:eixoDianteiro:$CUBO" --sem-fundo="cuboTraseiraDir:eixoTraseiro:$CUBO" --sem-fundo="cuboTraseiraEsq:eixoTraseiro:$CUBO" \
  --sem-fundo="lateralTraseiraDir:painelTraseiro:$LATPAINEL" --sem-fundo="lateralTraseiraEsq:painelTraseiro:$LATPAINEL" \
  --sem-fundo="abaDoPainelTraseiro:lateralTraseiraDir:$ABALAT" --sem-fundo="abaDoPainelTraseiro:lateralTraseiraEsq:$ABALAT" \
  --sem-fundo="paraLamaDir:teto:$TETO" --sem-fundo="paraLamaEsq:teto:$TETO" \
  --sem-fundo="lateralTraseiraDir:tampaDoPortaMalas:resto de 13 mm de linha no pé da tampa, em z -2082, onde a tampa e a lateral chegam ao painel de trás e o forro da tampa começa" \
  --sem-fundo="forroDosVaos:teto:a ponta do forro do capô, em z 742, fica a 4 mm do pé do teto: o vão do capô com o teto, na linha do pé do para-brisa, não tem forro" \
  --sem-fundo="forroDosVaos:painelDianteiro:a ponta do forro do capô, em z 2118, fica a 4 mm do painel da frente, na quina do capô com o painel" \
  --sem-fundo="lateralTraseiraDir:travessaDaCabine:$RESTO" --sem-fundo="lateralTraseiraEsq:travessaDaCabine:$RESTO" \
  --sem-fundo="lateralTraseiraDir:soleiraDir:$RESTO" --sem-fundo="lateralTraseiraEsq:soleiraEsq:$RESTO" \
  --sem-fundo="lateralTraseiraDir:soleiraDoChassiDir:$RESTO" --sem-fundo="lateralTraseiraEsq:soleiraDoChassiEsq:$RESTO"

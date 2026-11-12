#!/bin/bash
# vaos-sem-fundo.sh: mede os vãos sem fundo do carro montado pelas cinco receitas (`carro-pela-receita.mjs`) e declara, par a par e com o motivo, os que o forro dos vãos e a aba do
# painel de trás não fecham (`docs/modelar/banco-de-provas/sedan-chassi-e-lataria-2026-11-11/alta-definicao/RECEITA.md`). `CARRO_SEM_FECHAR=1` na frente mede o carro antes de fechá-los.
# Sai 1 enquanto houver par fora da faixa que a receita declara (`FOLGAS`, cada par com a sua), e o que sobra sem fundo sai com o motivo. Sem `--esperado`, o `vao:partes` confere só os pares
# declarados (a vizinhança segue em `--vizinho=12`); com `--esperado=4 --tolerancia=0.2` ele comparava com 4,0 a 4,2 todo par vizinho, inclusive 64 de membro do chassi e de forro que não são vão
# de painel, e por isso nunca saía 0. Os cubos de roda já não têm folga no eixo (o furo central da instância tem o diâmetro do eixo, 2026-11-12, rodada 2); o que sobra sem fundo são restos de 1 a 13 mm
# de linha nas pontas do forro, que esticá-las não fecha sem entrar em outra parte (a porta de trás, medido a 2 e a 4 mm).
# Uso: procedural/pecas/sedan-chassi-e-lataria/alta-definicao/vaos-sem-fundo.sh [outras opções do vao:partes]
cd "$(dirname "$0")/../../../.."
C=procedural/pecas/sedan-chassi-e-lataria/alta-definicao/carro-pela-receita.mjs
RESTO='resto de 1 a 2 mm de linha no fim do forro do vão da porta traseira, em y 420 ou em z -1314, onde o forro acaba antes da quina; esticar a ponta do forro 2 mm a faz entrar na porta de trás'
npm run vao:partes -- $C --vizinho=12 --fundo=modelo --soltas=recusar --linhas=0 "$@" \
  --sem-fundo="lateralTraseiraDir:tampaDoPortaMalas:resto de 13 mm de linha no pé da tampa, em z -2082, onde a tampa, a lateral e o painel de trás se encontram: o raio que desce para trás passa pelo vão antes do começo do forro da tampa, e esticar o forro para trás o poria para fora do painel de trás" \
  --sem-fundo="forroDosVaos:teto:a ponta do forro do capô, em z 742, fica a 4 mm do pé do teto, na linha do pé do para-brisa: 8 mm de linha entre a ponta e o teto, que esticar a ponta em 2 mm não fecha (medido no carro inteiro)" \
  --sem-fundo="forroDosVaos:painelDianteiro:a ponta do forro do capô, em z 2118, fica a 2,4 mm do painel da frente, na quina do capô com o painel: 4 mm de linha" \
  --sem-fundo="lateralTraseiraDir:travessaDaCabine:$RESTO" --sem-fundo="lateralTraseiraEsq:travessaDaCabine:$RESTO" \
  --sem-fundo="lateralTraseiraDir:soleiraDir:$RESTO" --sem-fundo="lateralTraseiraEsq:soleiraEsq:$RESTO" \
  --sem-fundo="lateralTraseiraDir:soleiraDoChassiDir:$RESTO" --sem-fundo="lateralTraseiraEsq:soleiraDoChassiEsq:$RESTO"

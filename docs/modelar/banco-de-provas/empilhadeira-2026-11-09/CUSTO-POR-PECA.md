# Custo por peça da empilhadeira

Esta tabela é a linha de base de custo por peça do plano [Núcleo para qualquer mecanismo](../../decisoes/PLANOS-ENCERRADOS.md), gerada em 2026-11-10 pelo comando `npm run -s custo:peca -- procedural/pecas/empilhadeira`, que lê os registros de rodada em `procedural/pecas/empilhadeira/partes/*/rodadas/` e o aceite de cada etapa em `procedural/pecas/empilhadeira/montagem.etapas.json`. Os registros de rodada não trazem data, e por isso a coluna de datas sai vazia. A peça fecha pelo crítico quando a última rodada não tem defeito e por aceite quando a pessoa a fixou com defeitos abertos; a coluna de aceitos conta as linhas de `defeitosAceitos` do registro das etapas, que incluem a linha de resumo do crítico que não fechou. As colunas mod, pla, fer, cri e fam contam as frases de atrito que atribuem um defeito ao modelador, ao plano, à ferramenta, ao crítico ou à família, e a frase que não usa a palavra "atribuído" não entra na conta.

```text
custo por peça: empilhadeira

peça                 rod  notas  defeitos  abertos  aceitos  fecho    mod pla fer cri fam  datas
-------------------  ---  -----  --------  -------  -------  -------  -------------------  -----
alca                 2    4 8    4 0       0        0        critico    1   0   1   0   0  -
banco                3    6 6 7  5 4 4     4        5        aceite     2   4   1   0   0  -
canal-interno        1    8      0         0        0        critico    0   0   0   0   0  -
carcaca              3    6 6 6  5 5 4     4        5        aceite     1   3   1   2   0  -
carro                1    7      2         2        3        aceite     0   1   1   0   0  -
cilindro-elevacao    1    8      0         0        0        critico    0   0   0   0   0  -
cilindro-inclinacao  1    7      2         2        3        aceite     0   0   1   0   0  -
coluna-direcao       1    8      0         0        0        critico    0   0   0   0   0  -
correntes            1    8      0         0        0        critico    0   0   0   0   0  -
eixo-dianteiro       2    7 6    3 2       2        3        aceite     1   1   1   0   0  -
eixo-traseiro        1    8      1         1        2        aceite     0   1   0   0   0  -
escape               2    7 8    2 1       1        2        aceite     1   2   0   0   0  -
garfo                1    9      0         0        0        critico    0   0   0   0   0  -
glp                  2    8 8    2 4       4        5        aceite     1   1   0   0   0  -
protetor             2    7 6    4 4       4        5        aceite     1   2   0   0   0  -
roda-dianteira       2    6 7    4 1       1        2        aceite     1   1   1   0   0  -
roda-traseira        2    6 7    5 2       2        3        aceite     1   2   1   0   0  -
torre                1    8      0         0        0        critico    0   0   0   0   0  -
volante              1    8      1         1        2        aceite     0   1   0   0   0  -

peças: 19; rodadas: 30; média de rodadas por peça: 1.58; fecharam na primeira rodada: 6
notas finais: 6: 3, 7: 5, 8: 10, 9: 1
fecho: aceite: 12, critico: 7; defeitos abertos na última rodada: 28
atribuições: modelador 10, plano 19, ferramenta 8, critico 2, familia 0
```

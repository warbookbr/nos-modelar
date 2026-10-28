# Carcaça da empilhadeira, vista lateral: o resultado da prova

Segunda prova da fatia 2 do plano [desenho sem
referência](../../planos/encerrados/2026-10-13-desenho-sem-referencia.md), em 2026-10-14. A
[descrição](DESCRICAO.md) foi desenhada por duas IAs que não viram a imagem: uma por
restrições ([`restricoes/`](restricoes/lateral.desenho.json)) e outra escrevendo os
polígonos à mão ([`coordenadas/`](coordenadas/lateral.partes.json)). O registro de
leituras das duas mostra que nenhuma abriu a imagem nem arquivo da empilhadeira. O
contorno da referência saiu em três rodadas do contorno da imagem
([roteiro do crítico](../empilhadeira-2026-10-09/referencias/carcaca_lateral.pacote/roteiro.md)), com nota 8, 8 e 7,
e foi aceito pela pessoa com pendências; a silhueta, que é o que a prova mede, não
tem defeito apontado. A [comparação](comparacao.png) põe cada desenho sobre a
silhueta escondida.

| | restrições | coordenadas |
|---|---|---|
| razão interseção/união contra a união das partes da referência | 0,666 | 0,657 |
| razão interseção/união contra a silhueta da referência | 0,706 | 0,705 |
| nota do crítico, alvo contra modelo | 5 | 5 |
| rodadas do comando | 1 | 2 |
| tokens do desenhista | cerca de 124.000 | 77.308 |
| partes, relações e pontos | 7 partes, 76 relações, 38 pontos | 7 partes, 210 pontos |

A razão contra a silhueta exagera o acerto e contra a união das partes é a que vale:
na referência, a longarina fecha o arco traseiro por baixo, e o arquivo de contornos
guarda só o anel de fora da silhueta, de modo que o arco aparece cheio; os dois
desenhos o abrem, como a imagem. A conta contra a união das partes rasteriza as
regiões a 2 mm por pixel, sem a parte `entalhe`, que fica fora do modelo. A ferramenta
`npm run desenho -- razao` mede só a silhueta e não teria visto o viés; o processo não
o pegou, e a correção é a razão aceitar a união das partes ou os furos da silhueta.

A segunda prova repete a primeira. As duas formas empataram na razão e na nota, e a
de restrições custou cerca de 60% mais tokens. A frente da carcaça, com o arco
dianteiro, o poço e a rampa, saiu próxima da imagem nos dois; a traseira saiu errada
nos dois do mesmo jeito, e os erros vêm da descrição: ela dá ao arco traseiro um
oitavo do comprimento, quando a imagem mostra quase um quarto, e descreve o capô, o
painel e o contrapeso de um jeito que levou os dois desenhistas a um capô alto demais
e a um contrapeso que desce até o chão.

Nas duas provas, o que limitou o acerto foi a descrição e não a forma de desenhar.
As restrições não mostraram vantagem no primeiro desenho, nem num objeto de
retângulos nem num de arcos e rampa. A vantagem que resta sem prova é a da correção:
mudar uma relação e o resto acompanhar, onde as coordenadas pedem recalcular os
pontos à mão.

## A rodada de correção

A pessoa pediu em 2026-10-14 o teste da vantagem que restava às restrições, a
correção. Cada desenhista recebeu, numa sessão nova, só os defeitos que o crítico
apontou no próprio desenho, e corrigiu uma cópia dele: [`restricoes-r2/`](restricoes-r2/lateral.desenho.json)
e [`coordenadas-r2/`](coordenadas-r2/lateral.partes.json). A
[comparação](comparacao-r2.png) mostra os dois corrigidos sobre a silhueta escondida.

| | restrições | coordenadas |
|---|---|---|
| razão contra a união das partes, antes | 0,666 | 0,657 |
| razão contra a união das partes, depois | 0,741 | 0,650 |
| tokens da correção | 103.929 | 81.233 |
| o que mudou | 8 valores mudados, 6 relações religadas, 28 tiradas e 37 acrescentadas; 85 relações | 3 trechos do gerador reescritos e 2 valores ajustados, 95 linhas; 9 partes e 207 pontos |

Na correção as restrições ganharam: o desenho subiu 0,075, e o de coordenadas ficou
onde estava, embora tenha mudado tanto quanto. O desenhista por coordenadas
contou o que custou: o crítico dá os defeitos como fração do desenho anterior, e
ele teve de tirar os valores antigos e multiplicar à mão, de modo que um valor
errado passava ao desenho novo sem que nada acusasse; no desenho por restrições o
defeito vira o valor de uma relação, e o resolvedor refaz o resto. É uma medida
só, com um crítico diferente para cada desenho, e não prova a vantagem; ela aponta
para onde as restrições valem, que é a revisão e não o primeiro traço.

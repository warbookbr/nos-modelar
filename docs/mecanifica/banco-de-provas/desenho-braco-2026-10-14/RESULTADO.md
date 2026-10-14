# Braço robótico, vista lateral: o resultado da prova

Fatia 2 do plano [desenho sem referência](../../planos/2026-10-13-desenho-sem-referencia.md),
em 2026-10-14. A [descrição](DESCRICAO.md) foi desenhada por duas IAs que não viram a
imagem: uma por restrições, com a ferramenta `npm run desenho`
([`restricoes/`](restricoes/lateral.desenho.json)), e outra escrevendo os polígonos à
mão, com o ajudante [`coordenadas.mjs`](coordenadas.mjs)
([`coordenadas/`](coordenadas/lateral.partes.json)). O registro de leituras das duas
mostra que nenhuma abriu a imagem nem arquivo do braço. A [comparação](comparacao.png)
põe cada desenho, em vermelho, sobre a silhueta escondida, em cinza.

| | restrições | coordenadas |
|---|---|---|
| razão interseção/união, alinhada pelo canto de baixo da base | 0,7965 | 0,8096 |
| razão interseção/união, pela melhor translação | 0,8449 | 0,8703 |
| nota do crítico, alvo contra modelo | 6 | 6 |
| rodadas do comando | 1 | 1 |
| tokens do desenhista | 97.837 | 57.318 |
| partes, relações e pontos | 20 partes, 125 relações, 62 pontos | 20 partes, 264 pontos |

```bash
npm run desenho -- razao procedural/pecas/braco-robotico/referencias/lateral-sem-cabo.contornos.json docs/mecanifica/banco-de-provas/desenho-braco-2026-10-14/restricoes/lateral.contornos.json --ponto-a=-117,-5 --ponto-b=0,0
npm run desenho -- razao procedural/pecas/braco-robotico/referencias/lateral-sem-cabo.contornos.json docs/mecanifica/banco-de-provas/desenho-braco-2026-10-14/coordenadas/lateral.contornos.json --ponto-a=-117,-5 --ponto-b=0,0
```

Neste objeto a hipótese do plano não se confirmou: as duas formas empataram na
razão e na nota, e a de restrições custou 70% mais tokens. O braço é quase todo de
retângulos empilhados, em que escrever a coordenada é fácil e as relações não
dependem umas das outras; a vantagem esperada das restrições está nos objetos em que
um ângulo ou uma tangência move outras partes, como a caçamba do carrinho de mão.

Os desvios maiores são comuns aos dois desenhos e vêm da descrição: os anéis saíram
finos porque a descrição os chama de finos, e a base saiu mais larga que a coluna
porque a descrição diz que a coluna tem quatro quintos da base. Essa razão foi uma
das cinco correções que Claude fez conferindo a leitura de olho contra as caixas das
partes, e a correção estava errada: a região que ela mediu como coluna é o elo, mais
estreito que a coluna, e o crítico mede a base quase da largura da coluna. Conferir
uma descrição por medida exige saber o que cada região mede.

Dois achados são da ferramenta e o processo não os teria pego sozinho. A vista em
traço corta à direita o subtítulo quando ele é mais largo que o desenho, e nenhum
teste confere texto dentro da folha. O desenhista por restrições fez chanfros nos
cantos que a descrição diz arredondados, embora o formato tenha o arco, porque a
skill não mostra como arredondar um canto; o desenhista por coordenadas arredondou.
Os dois viram correção da ferramenta e da skill.

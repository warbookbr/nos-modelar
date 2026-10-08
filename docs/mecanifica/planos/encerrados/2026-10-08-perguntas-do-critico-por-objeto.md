# Perguntas do crítico por componente e por família de objeto

**Estado:** cancelado

**Por que foi cancelado:** absorvido, em 2026-10-08, pela fatia do crítico calibrado
de [as ferramentas de modelagem](../2026-10-07-as-ferramentas-de-modelagem.md),
que já previa calibrar o crítico e criar famílias de objeto. A linha de base e o
rascunho das perguntas abaixo são a entrada daquela fatia.

**Responsável:** Claude, com o aceite da pessoa

**Repositório e base:** `warbookbr/nos-mecanifica`, sobre a `main`

## Problema observado

O brief do crítico cego do esboço traz as mesmas cinco perguntas para qualquer
objeto: que pontas ficam no ar, o que atravessa o quê, o que está fora do lugar em
relação à parte a que deveria estar preso, o que a vista mostra que o nome não
explica, e a nota. Elas pegam defeito estrutural, mas nada do que é próprio do
objeto. Em 2026-10-08 a pessoa viu dois defeitos que o processo não apontou: as
dobradiças do guarda-roupa do lado de fora das portas, e a carroceria da picape
baixa demais para o comprimento, que o crítico aprovou com 8 na rodada 2. Nenhuma
das cinco perguntas leva o crítico a olhar de que lado da porta fica a dobradiça
nem a proporção entre altura e comprimento de um veículo.

A pesquisa da mesma data sobre modelos que leem a forma sem imagem (PointLLM,
ShapeLLM e os que vieram depois) achou que eles ainda perdem para a leitura por
imagem: no [GLUE3D](https://www.sciencedirect.com/science/article/pii/S1566253525010693)
o melhor modelo de nuvem de pontos acertou 55% das perguntas binárias, contra 79%
de um modelo de visão sobre renders. Os trabalhos de auditoria de forma gerada,
como o [MUSE](https://arxiv.org/abs/2605.28579) e o
[CADSmith](https://arxiv.org/pdf/2603.26512), separam o que é medida, conferido por
código na geometria, do juízo de intenção, feito por um modelo de visão com uma
rubrica escrita para aquilo. O esboço já tem a primeira metade (`--medidas`, o gate
de contato) e falta a rubrica própria do objeto.

## Linha de base de 2026-10-08

Seis agentes Haiku escreveram o rascunho das perguntas, 28 para os dez
componentes e 6 para cada uma das três famílias, com as medidas típicas, em
[`2026-10-08-perguntas-do-critico-rascunho.json`](2026-10-08-perguntas-do-critico-rascunho.json).
As faixas são estimativas, salvo onde a fonte diz outra coisa, e nenhuma vira gate
sem conferência. Com elas, o `critico-visual` julgou cinco vezes, cada vez um
agente novo, só com o brief e as quatro vistas que o `--proximo` grava:

| caso | brief | nota | o que apontou |
|---|---|---|---|
| guarda-roupa com as dobradiças por fora da porta | o de hoje | 8 | viu as dobradiças aparentes e as tratou como detalhe |
| o mesmo | com as perguntas da dobradiça e do móvel de caixa | 6 | dobradiça presa por fora, como peça fora de onde deveria estar presa |
| guarda-roupa com as dobradiças por dentro (controle) | com as perguntas | 8 | nenhum defeito inventado; disse que o interior não aparece nas vistas |
| picape da rodada 2, baixa | o de hoje | 7 | rodas ausentes e o piso cruzando o arco traseiro; nada da altura |
| a mesma | com as perguntas do veículo sem as de rodas | 7 | mediu a altura em 0,29 do comprimento e a achou plausível |

As perguntas pegaram o defeito de posição e não inventaram defeito no controle. A
proporção não foi pega pelo olho, nem com a pergunta: o crítico mediu e não tinha
contra o que comparar. A faixa estimada para picape começa em 0,30, então a
proporção tem de ir para a medição, como o plano já previa, e o `--medidas` hoje
só confere caixa e distância, sem razão entre duas dimensões. Duas coisas
apareceram que o plano não previa. A pergunta sobre uma parte que as vistas não
mostram (a dobradiça por dentro, a prateleira atrás da porta) recebe "não consigo
responder", então ela precisa de uma vista que a mostre ou fica de fora do brief. E
a pergunta da família sobre uma parte que o esboço ainda não tem (rodas, na
carroceria da picape) precisa de condição para entrar.

## Resultado

O brief do crítico passa a trazer, depois das cinco perguntas fixas, as perguntas
dos componentes que o objeto usa e as da família a que ele pertence, e as
perguntas que se respondem com número saem do olho do crítico e viram medidas
conferidas pelo `--medidas`. Nos dois casos acima, o crítico com o brief novo
aponta o defeito que o brief atual deixou passar.

## Filtro Agent-First

O brief do `--feito` e do `--proximo` fica como está e ganha um bloco: ENVOLVER. O
JSON de cada componente ganha o campo `perguntas`, lido pelo mesmo carregador:
REFATORAR, sem mudar a geometria nem a identidade de nenhuma forma. O `--medidas`
recebe as medidas típicas da família pelo caminho que já existe para
`plano.medidas`: USAR DIRETO. A leitura nativa de 3D por modelo próprio: ADIAR,
pela pesquisa acima.

## Incluído

- o campo `perguntas` nos componentes de `modulos/esboco/componentes/`, com as
  perguntas sobre o próprio componente (a dobradiça diz de que lado da porta fica,
  a roda diz se toca o chão), escritas sem sugerir a resposta;
- um arquivo por família de objeto com as perguntas do conjunto e as medidas
  típicas com faixa (a altura do assento de uma cadeira, a razão entre altura e
  comprimento de um veículo), começando por assento, veículo e móvel de caixa. As
  perguntas ao crítico são só de forma (de que lado, preso a quê, apoiado onde,
  virado para onde), e toda proporção vai só para as medidas, porque na linha de
  base o crítico mediu a picape e não soube julgar o número;
- o campo `plano.familia` no esboço, opcional, que escolhe o arquivo da família;
- uma condição por pergunta da família (o componente ou a forma que ela pede), para
  a pergunta sobre rodas não entrar no esboço sem rodas;
- a medida de razão entre duas dimensões no `mede` de `plano.medidas`, para a
  proporção da família ser conferida pelo `--medidas`;
- o brief do objeto, da unidade e do Marco com as perguntas dos componentes
  presentes e as da família, depois das cinco fixas, com a pergunta aberta sobre o
  que parece estranho mantida no fim;
- teto de perguntas por componente e por família, conferido por teste, para o
  brief não crescer sem limite.

## Excluído

- perguntas por primitiva: uma caixa não sabe se é porta ou assento, e o sentido
  vem da função que ela cumpre;
- ordem de etapas por família (carroceria antes das rodas, como na picape), que
  volta ao backlog se este plano mostrar que as famílias pegam;
- mudança na escala da nota ou na regra das três rodadas;
- vista em corte ou com as portas abertas no brief, para as perguntas sobre partes
  internas, que volta ao backlog; até lá, a pergunta sobre parte escondida fica fora
  do brief;
- modelo de leitura 3D nativa.

## Gate de saída

1. O brief gerado pelo `--proximo` (e não escrito à mão, como na linha de base)
   leva o crítico a apontar a dobradiça por fora como defeito estrutural, e o
   `--medidas` acusa fora da faixa a razão entre altura e comprimento da picape da
   rodada 2.
2. Os quatro objetos do banco de provas, julgados de novo pelas suas vistas finais
   com o brief novo, não perdem nota sem um defeito real apontado.
3. O brief cresce no máximo o teto declarado, medido em caracteres.
4. Os componentes sem `perguntas` e o esboço sem `plano.familia` produzem o brief
   de hoje, byte a byte.
5. Testes do carregador, do brief e do `--medidas` com a família, e `npm run gates`
   completo.

## Fatias

1. Linha de base. Feita em 2026-10-08, na seção acima.
2. `perguntas` nos componentes e no brief, revisando o rascunho pergunta a
   pergunta.
3. Arquivos de família com a condição por pergunta, `plano.familia`, a medida de
   razão e as medidas típicas no `--medidas`, com as faixas conferidas em ficha.
4. Prova do gate de saída e documentação no README do módulo e na skill.
5. Fechamento.

## Riscos e parada

Uma pergunta escrita como afirmação ("a dobradiça está do lado de dentro?") pode
levar o crítico a confirmar o que leu em vez de olhar a imagem. Se, na fatia 1 ou
na 4, o crítico passar a apontar defeito que a vista não mostra, ou a dar nota mais
alta sem defeito corrigido, o plano para e as perguntas são reescritas antes de
seguir. O controle da linha de base não mostrou isso, mas foi um caso só.

## Fechamento

Cancelado sem código, por absorção; ver o motivo no topo.

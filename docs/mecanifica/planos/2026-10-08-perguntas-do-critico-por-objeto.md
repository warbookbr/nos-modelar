# Perguntas do crítico por componente e por família de objeto

**Estado:** rascunho

**Responsável:** Claude, com o aceite da pessoa

**Repositório e base:** `warbookbr/nos-mecanifica`, a `main` depois do fechamento de
[o caminho curto da IA](2026-10-07-o-caminho-curto-da-ia.md)

## Problema observado

O brief do crítico cego do esboço traz as mesmas cinco perguntas para qualquer
objeto: que pontas ficam no ar, o que atravessa o quê, o que está fora do lugar em
relação à parte a que deveria estar preso, o que a vista mostra que o nome não
explica, e a nota. Elas pegam defeito estrutural, mas nada do que é próprio do
objeto. Em 2026-10-08 dois defeitos passaram pelo crítico e só a pessoa os viu: as
dobradiças do guarda-roupa ficaram do lado de fora das portas, e a carroceria da
picape ficou baixa demais para o comprimento. Nenhuma das cinco perguntas leva o
crítico a olhar de que lado da porta fica a dobradiça nem a proporção entre altura
e comprimento de um veículo. O processo não pegaria nenhum dos dois sozinho.

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
  comprimento de um veículo), começando por assento, veículo e móvel de caixa;
- o campo `plano.familia` no esboço, opcional, que escolhe o arquivo da família;
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
- modelo de leitura 3D nativa.

## Gate de saída

1. Com o brief atual e com o brief novo, o `critico-visual` julga as mesmas vistas
   do guarda-roupa com a dobradiça por fora e da picape baixa; o brief novo aponta
   os dois defeitos e o atual não, registrado com os dois vereditos.
2. Os quatro objetos do banco de provas, julgados de novo pelas suas vistas finais
   com o brief novo, não perdem nota sem um defeito real apontado.
3. O brief cresce no máximo o teto declarado, medido em caracteres.
4. Os componentes sem `perguntas` e o esboço sem `plano.familia` produzem o brief
   de hoje, byte a byte.
5. Testes do carregador, do brief e do `--medidas` com a família, e `npm run gates`
   completo.

## Fatias

1. Linha de base: rodar o crítico com o brief atual nos dois casos e registrar que
   ele não aponta os defeitos.
2. `perguntas` nos componentes e no brief.
3. Arquivos de família, `plano.familia` e as medidas típicas no `--medidas`.
4. Prova do gate de saída e documentação no README do módulo e na skill.
5. Fechamento.

## Riscos e parada

Uma pergunta escrita como afirmação ("a dobradiça está do lado de dentro?") pode
levar o crítico a confirmar o que leu em vez de olhar a imagem. Se, na fatia 1 ou
na 4, o crítico passar a apontar defeito que a vista não mostra, ou a dar nota mais
alta sem defeito corrigido, o plano para e as perguntas são reescritas antes de
seguir. Se os dois casos da fatia 1 forem pegos pelo brief atual, o problema não é
falta de pergunta e o plano é cancelado.

## Fechamento

Preencher somente ao concluir ou cancelar.

# Topologia, mover a peça, e ler o gesto

**Estado:** concluído

**Responsável:** Tiago (autoria) e a IA da sessão (implementação)

**Repositório e base:** `warbookbr/nos-mecanifica`, base `a47be13` na main.

## Problema observado

O modo de edição move o que já existe e nada mais. Ele não extruda, não duplica,
não apaga, não cria, não gira e não escala, e essas operações ficaram de fora do
plano anterior de propósito: todas mudam a topologia ou o número de partes, e a
rodada de absorção não sabia reescrever receita que ganhou ou perdeu parte.

Falta também mover a peça inteira. O autor relatou ao testar: ele seleciona uma
parte da bicicleta e não tem como deslocá-la como um corpo. Hoje isso só acontece
puxando todos os vértices dela, o que é trabalhoso e não diz nada sobre a
intenção.

E há um custo que só aparece do outro lado. Quando o ajuste vem do autor, a
rodada de absorção recebe uma nuvem de pontos e um número — "tuboSelim, 6,00 mm
fora" — e precisa adivinhar o que foi feito: translação, rotação, esticão,
afunilamento, dobra, e em qual ponta. Na prova do plano anterior isso não custou
nada porque a edição era minha e eu sabia. Numa edição de verdade, essa
adivinhação é a metade difícil da rodada.

## Resultado

O autor constrói e altera forma na bancada com as operações que mudam topologia,
move partes inteiras, e o que ele deixou chega à rodada de absorção descrito em
palavras geométricas, com números, em vez de uma nuvem de pontos.

## Filtro Agent-First

**Descrição do gesto — ENVOLVER.** Comparar duas malhas é determinístico e não
precisa de julgamento: o que sai é uma frase com número, no vocabulário que a
rodada de absorção já usa. É a capacidade que mais reduz contexto neste plano,
porque troca centenas de coordenadas por uma linha por parte.

**Mapa de parte para passo — ENVOLVER.** Hoje se acha por leitura do arquivo.
Com oito partes dá; numa máquina de quarenta, procurar vira o trabalho.

**Operações de topologia — USAR DIRETO.** Extrudar, duplicar e apagar mexem em
`V` e `F` do estado neutro, que é a estrutura que o núcleo já expõe. Não se cria
formato intermediário para isso.

**Reescrita de receita que ganhou ou perdeu parte — ADIAR dentro do plano.** É o
risco declarado abaixo, e a fatia 1 responde se ele existe antes de qualquer
interface ser construída.

## Incluído

- mover a parte inteira selecionada, como corpo, sem entrar em modo de edição;
- extrudar face e aresta, duplicar seleção, apagar vértice, aresta e face, e
  criar face a partir de vértices selecionados;
- `R` rotaciona e `S` escala a seleção, com trava de eixo e valor digitado, pelas
  mesmas regras do `G`;
- alvo e rodada de absorção capazes de tratar peça que ganhou ou perdeu parte;
- `npm run descrever:gesto`, que compara a malha do arquivo com a editada e
  descreve, por parte: quantos vértices andaram, se o movimento é translação
  rígida, rotação, escala, esticão com uma ponta presa, dobra ou sem padrão, e os
  números de cada caso;
- mapa de qual passo da receita constrói qual parte, legível por comando.

## Excluído

- inferir a receita automaticamente a partir da malha. A descrição do gesto é
  determinística; escrever receita continua sendo escrita, e a decisão de não
  automatizar isso está registrada e vale;
- subdivisão, bisel, loop cut e o resto do vocabulário de modelagem poligonal;
- edição de montagem — este plano é sobre uma peça por vez.

## Gate de saída

1. cada operação nova produz alvo que a rodada de absorção enxerga, inclusive
   uma que muda o número de partes;
2. o alvo salvo continua sem id de vértice, índice de array e posição de passo,
   e reexecuta igual;
3. `descrever:gesto` acerta o tipo de movimento em casos construídos onde a
   resposta é conhecida, e diz "sem padrão" quando não há;
4. gate novo nomeado em `tools/gates.mjs` e em `.github/workflows/ci.yml`,
   conferido por `reguas:check`, e falhando com a correção desfeita;
5. decisão Agent-First registrada e documentação de uso atualizada.

## Fatias

Cinco, nesta ordem, cada uma com o seu registro abaixo: medir se a absorção
aguenta peça que ganhou ou perdeu parte; mover a peça inteira; topologia; ler o
gesto; fechar. Ler o gesto veio por último porque são as operações que decidem
que vocabulário a descrição precisa ter.

## Medido na fatia 1 — o risco não se confirmou

A rodada de absorção sabe lidar com peça que ganhou ou perdeu parte, e o plano
segue.

Apagando o tubo superior da malha, a régua acusa `sobrando: ['tuboSuperior']` e
reprova; a receita reescrita sem aquela parte chega no alvo. Batizando as faces
do tubo superior como parte nova, ela acusa `ausentes: ['reforcoNovo']` junto com
o `sobrando`, e a receita reescrita também chega. Nenhum dos dois quebra a
medida.

O que a medida cobrou, e é requisito e não defeito: removendo o tubo superior dos
passos sem tirá-lo do `PLANO` e dos `contatos`, `guarda:acervo` reprova com
"contatos[5]: a peça não tem parte 'tuboSuperior'". Operação que muda o número de
partes obriga a rodada a revisar as três listas juntas.

Uma fraqueza real foi achada e corrigida na régua. Parte ausente já levava
`piorMm` a infinito, mas parte sobrando não: apagar o tubo superior devolvia
0,000916, que qualquer leitura entende como praticamente certo, enquanto um
tubo inteiro sobrava. Agora os dois sentidos levam a infinito.

## Feito na fatia 3 — topologia

As operações que mudam faces moram em `src/autoria/topologia-da-malha.js`, no
núcleo e sem Three.js: recebem a malha neutra mais o modo e a seleção, e devolvem
uma malha nova sem tocar a de entrada. Os testes provam a conta, e a guarda de
navegador prova que o resultado chegou à cena.

Dois defeitos apareceram quando a guarda cobriu esse caminho. A face extrudada
nascia no mesmo lugar da original, deixando paredes com área zero que
`adaptarThree` recusa por não definirem plano; o anel novo passa a nascer
afastado na direção da normal por um quarto do comprimento médio das arestas. E o
recorte da edição se perdia depois de qualquer operação de topologia, porque a
camada era recriada lendo as partes selecionadas no controlador e aplicar o
modelo reconstruído limpa essa seleção: a edição que valia para o tubo do selim
voltava a valer para a peça inteira, e o apagar seguinte levava as oito partes. A
camada guarda o próprio recorte em `partesEditadas`.

O desfazer passou a guardar vértices e faces, e não só posições, porque uma
parte apagada some junto com as faces. Ele escolhe entre repor coordenadas na
geometria desenhada e refazer o modelo inteiro, conforme o conjunto de faces
tenha mudado ou não.

## Feito na fatia 4 — ler o gesto

`src/autoria/descricao-do-gesto.js` compara a malha do arquivo com a editada e
classifica, por parte: translação, rotação em torno de um eixo de coordenada,
escala em torno do centro, esticão com uma ponta presa, dobra, ou nenhum desses.
A detecção procura eixo de coordenada e nada além disso, porque é o que as
operações da bancada produzem, e um giro oblíquo sai como sem padrão em vez de
virar classificação aproximada. `src/autoria/mapa-parte-passo.js` liga cada parte
ao passo que a nomeia e aos passos que constroem a geometria selecionada,
seguindo
alias quando existe, e `npm run descrever:gesto` põe os dois lado a lado.

A descrição é calculada na bancada, no salvamento, e a razão é medível: fora
dali só existem duas nuvens sem identificador, e descobrir qual ponto virou qual
por posição falha quando o movimento tem o tamanho do espaçamento entre pontos.
No tubo do selim os pontos ficam a 5,9 mm um do outro; num gesto de 6 mm o
pareamento por ordem lexicográfica atribuiu 422 mm e o pareamento por menor
distância atribuiu 32,6 mm. A reconstrução por posição fica para arquivo antigo,
e a saída diz qual leitura está mostrando.

Escrever a guarda descobriu que o caminho do salvamento não existia para quem
edita a malha. Salvar exigia junta puxada, o rodapé com o botão só aparecia no
modo de junta, e a base guardada como a peça como veio do arquivo era a mesma
malha viva que a edição altera, então os dois lados mudavam juntos e nenhuma
diferença era detectável. O botão passa a depender de a malha ter mudado, a base
passa a ser cópia, e o alvo grava de qual receita a peça veio pelo nome que
resolve um arquivo. `guarda:gesto` afirma esse caminho no navegador e foi
conferida desfazendo cada correção.

## Riscos e parada

O risco que obrigaria a parar era a fatia 1: se apagar ou criar parte não pudesse
ser expresso por reescrita, o plano pararia antes da fatia 3 e a saída seria
restringir topologia ao interior de uma parte que já existe. Ele não se
confirmou. O segundo era a descrição virar adivinhação, e a resposta foi
classificar só o que se verifica por medida, com "sem padrão" como resposta
legítima.

## Fechamento

**Concluído em 2026-09-17.** Os cinco itens do gate foram medidos, e o primeiro
achou um buraco real. Quatro das seis operações — extrudar, apagar,
girar e escalar — movem ponto, e a régua as enxerga pela forma. Duplicar e criar
face não movem ninguém: duplicar quatro faces do tubo do selim cria seis vértices
em cima de vértices que já estavam ali, e criar face não cria vértice nenhum. As
duas saíam do alvo com 0,000916 mm de desvio, idêntico ao da receita intacta, e a
rodada não tinha como saber que algo fora feito. O alvo passou a guardar quantas
faces cada parte tem, que é contagem e não identidade, e o `absorver` avisa
quando a forma bate e a contagem não bate. A contagem não reprova sozinha,
porque tesselação diferente com a mesma forma é receita válida.

O mesmo item achou uma armadilha em girar e escalar: o eixo era índice numérico,
e passar `'y'` caía num valor indefinido e respondia que nada mudou, que é a
resposta idêntica à de um gesto sem efeito. As duas passam a aceitar índice e
nome, e a recusar eixo desconhecido com motivo.

Os outros quatro itens estavam cumpridos. O alvo continua sem id de vértice,
índice de array e posição de passo, e capturar a mesma malha duas vezes dá o
mesmo arquivo. `descrever:gesto` acerta translação, esticão, rotação, escala e
dobra em casos construídos e responde sem padrão quando não há. `guarda:gesto`
está em `tools/gates.mjs` e na CI, conferida por `reguas:check`; a decisão
Agent-First está no plano e a documentação de uso está atualizada.

Fica de fora, e é o plano seguinte: subdivisão, bisel, loop cut, proportional
editing e modificadores.

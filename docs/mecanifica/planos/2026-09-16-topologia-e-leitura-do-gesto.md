# Topologia, mover a peça, e ler o gesto

**Estado:** ativo

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

1. na bicicleta, cada operação nova produz alvo que a rodada de absorção
   reproduz dentro da tolerância declarada, inclusive uma que muda o número de
   partes;
2. o alvo salvo continua sem id de vértice, índice de array e posição de passo, e
   reexecuta igual;
3. `descrever:gesto` acerta o tipo de movimento em casos construídos onde a
   resposta é conhecida — translação pura, esticão de uma ponta, rotação — e diz
   "sem padrão" quando não há;
4. gate novo nomeado em `tools/gates.mjs` e em `.github/workflows/ci.yml`,
   conferido por `reguas:check`, e falhando com a correção desfeita;
5. decisão Agent-First registrada e documentação de uso atualizada.

## Fatias

1. **A pergunta que pode parar tudo.** A rodada de absorção sabe lidar com peça
   que ganhou ou perdeu parte? Medir antes de construir interface.
2. **Mover a peça inteira.** É o pedido mais simples e o mais usado, e não
   depende de topologia.
3. **Topologia.** Extrudar, duplicar, apagar, criar. Depois rotacionar e escalar.
4. **Ler o gesto.** `descrever:gesto` e o mapa de parte para passo. Vêm por
   último de propósito: as operações acima decidem que vocabulário a descrição
   precisa ter, e escrevê-la antes seria descrever um conjunto que ainda vai
   mudar.
5. **Fechar.** Guarda de navegador, documentação, gates completos.

## Medido na fatia 1 — o risco não se confirmou

A rodada de absorção sabe lidar com peça que ganhou ou perdeu parte, e o plano
segue.

Apagando o tubo superior da malha, a régua acusa `sobrando: ['tuboSuperior']` e
reprova; a receita reescrita sem aquela parte chega no alvo. Batizando as faces
do tubo superior como parte nova, ela acusa `ausentes: ['reforcoNovo']` junto com
o `sobrando`, e a receita reescrita também chega. Nenhum dos dois quebra a
medida.

O que a medida cobrou, e é requisito e não defeito: a peça declara em `PLANO` o
que promete ser e declara os `contatos` entre partes. Removendo o tubo superior
dos passos sem tirá-lo dessas duas listas, `guarda:acervo` reprova com
"contatos[5]: a peça não tem parte 'tuboSuperior'". Então operação de topologia
que muda o número de partes obriga a rodada de absorção a revisar o plano e os
contatos junto com os passos — é trabalho a mais, não impedimento.

Uma fraqueza real foi achada e corrigida na própria régua. Parte AUSENTE já
levava `piorMm` a infinito, mas parte SOBRANDO não: apagar o tubo superior e
comparar com a receita intacta devolvia `piorMm` de 0,000916, um número que
qualquer leitura entende como "praticamente certo", enquanto um tubo inteiro
sobrava. Só a bandeira `dentro` acusava. Agora os dois sentidos levam a infinito.

## Feito na fatia 3 — topologia

As operações que mudam faces moram em `src/autoria/topologia-da-malha.js`, no
núcleo e sem Three.js: extrudar, duplicar, apagar, criar face, rotacionar e
escalar recebem a malha neutra mais o modo e a seleção, e devolvem uma malha nova
sem tocar a de entrada. Os dezesseis testes provam a conta, e a guarda de
navegador prova que o resultado chegou à cena.

Dois defeitos apareceram quando a guarda passou a cobrir esse caminho. O
primeiro era a face extrudada nascer no mesmo lugar da original, deixando as
paredes com área zero e fazendo `adaptarThree` recusar a face por não definir
plano; o anel novo passa a nascer afastado na direção da normal por um quarto do
comprimento médio das arestas. O segundo era o recorte da edição se perder depois
de qualquer operação de topologia: a camada era recriada lendo as partes
selecionadas no controlador, e aplicar o modelo reconstruído limpa essa seleção,
então a edição que valia para o tubo do selim voltava a valer para a peça inteira
e o apagar seguinte levava as oito partes. A camada agora guarda o próprio
recorte em `partesEditadas`.

O desfazer passou a guardar vértices e faces, e não só posições: guardar só
posições não devolve uma parte apagada, porque a parte sumiu junto com as faces.
Ele escolhe entre repor as coordenadas na geometria desenhada, quando o conjunto
de faces é o mesmo, e refazer o modelo inteiro, quando não é.

## Feito na fatia 4 — ler o gesto

`src/autoria/descricao-do-gesto.js` compara a malha do arquivo com a editada e
classifica, por parte, o que aconteceu: translação, rotação em torno de um eixo
de coordenada, escala em torno do centro, esticão com uma ponta presa, dobra, ou
nenhum desses. A detecção de rotação e de escala procura eixo de coordenada e
nada além disso, porque é o que as operações da bancada produzem, e um giro em
torno de eixo oblíquo sai como sem padrão em vez de virar classificação
aproximada. `src/autoria/mapa-parte-passo.js` liga cada parte ao passo que a
nomeia e aos passos que constroem a geometria selecionada, seguindo
alias quando existe, e `npm run descrever:gesto` põe os dois lado a lado.

A descrição é calculada na bancada, no instante do salvamento, e a razão é
medível: fora dali só existem duas nuvens de pontos sem identificador, e
descobrir qual ponto virou qual por posição falha quando o movimento tem o
tamanho do espaçamento entre pontos. No tubo do selim, com dezoito lados a
dezessete milímetros de raio, os pontos ficam a 5,9 mm um do outro; num gesto de
6 mm o pareamento por ordem lexicográfica atribuiu 422 mm de movimento, e o
pareamento completo por menor distância atribuiu 32,6 mm. O comando mantém a
reconstrução por posição para arquivo salvo antes desta descrição existir, e diz
na saída qual das duas leituras está mostrando.

Escrever a guarda desta fatia descobriu que o caminho do salvamento não existia
para quem edita a malha. Salvar exigia ter puxado uma junta, o rodapé com o botão
só aparecia no modo de junta, e a base guardada como a peça como veio do arquivo
era a mesma malha viva que a edição altera, então os dois lados mudavam juntos e
nenhuma diferença era detectável. Uma sessão inteira de edição terminava sem
produzir arquivo. O botão passa a depender de a malha ter mudado, o rodapé sobe
quando há o que salvar, a base passa a ser uma cópia, e o alvo passa a gravar de
qual receita a peça veio pelo nome que resolve um arquivo, sem o que nem
`descrever:gesto` nem `absorver` achavam receita para reexecutar.

A guarda `guarda:gesto` afirma esse caminho no navegador e foi conferida
desfazendo cada correção: sem a cópia da base o botão fica desativado depois do
movimento, e sem a descrição no salvamento o arquivo sai sem ela.

## Riscos e parada

O risco que obriga parar é a fatia 1. Se apagar uma parte ou criar uma parte nova
não puder ser expresso por reescrita de receita — porque o nome da parte, os
contatos declarados e o plano de modelagem deixam de bater —, as operações de
topologia entregam gesto que não volta, e o plano para antes da fatia 3. Nesse
caso a saída provável é restringir: permitir topologia só dentro de uma parte que
já existe, sem criar nem apagar parte.

O segundo risco é a descrição do gesto virar adivinhação. Ela só classifica o que
consegue verificar por medida; caso que não se encaixa em nenhum padrão sai como
"sem padrão", e isso não é falha da ferramenta.

## Fechamento

Preencher somente ao concluir ou cancelar.

# Trecho e vinco que somem aos poucos entre laços no gaiolaPorLacos

**Estado:** ativo

**Território:** `procedural/nucleo/gaiola-por-lacos.js`, `procedural/nucleo/gaiola-por-lacos.test.ts`, `tools/fixtures/solido-por-lacos/`

**Responsável:** Tiago (aprovação por imagem) e a IA da sessão do furgão (implementação); a sessão do braço aplica a correção no
cotovelo pelo plano dela.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-08.

Em 2026-11-08 entraram as fatias 1 e 2: a régua da dobra (`tools/modelar/dobra-da-superficie.mjs`, diedro abaixo de 120° fora
de vinco declarado), o `encolhe` no trecho, que segue a curva do vizinho, e o `esvai` no vinco, com a peça de prova dos tubos
cruzados sobre um disco. A aba e as rugas sumiram, a régua dá 0 dobras e as outras malhas ficaram idênticas; a ondulação
guarda 5 marcas de até 1,1 mm no contorno real do pé do filete, que a pessoa aceitou. Fatiada ao longo do tubo deitado, a
frente do tubo em pé vira rampa e mostra o topo do disco, o que o cotovelo reprova como degrau; a pessoa pediu testar a peça
fatiada na horizontal, com o tubo em pé redondo em cada laço. A régua acusa 14 dobras nos refletores do furgão, que são
facetas aprovadas: ela fica como aviso até haver um jeito de a peça declarar a dobra intencional.

A fatia 3 (2026-11-08) fez a peça fatiada na horizontal (`tubos-fatiados.js`): a base sai redonda e inteira sobre o disco,
com a parede vertical, e o campo novo `une` costura os pontos coincidentes não consecutivos, de modo que o tubo deitado nasce
exato no fundo dele. A junção abaixo do tubo deitado ficou com uma faixa ondulada (1 dobra, 66 marcas de até 2,4 mm), e três
variantes de planos não a tiraram; a tentativa parou como combinado com a pessoa, e a saída para a forma do cotovelo passa a
ser a união de dois sólidos com filete, fora deste plano. Junto entrou a régua `tools/modelar/vinco-oculto.mjs`, que acha vinco
e chanfro não declarados e desenha os achados numa imagem: ela pega a faixa da peça fatiada e a aba de hoje, fica quieta nas
peças boas e aponta 33 bordas de lataria no furgão, que ficam para a pessoa; não vai a gate.

## Problema observado

O cotovelo do braço (`procedural/pecas/braco-robotico/partes/cotovelo/receita.js`, 2026-11-08) é um tubo em pé cruzado no alto
por um tubo deitado que passa 19 mm à frente dele. O filete do encontro acaba na tangente, e o `gaiolaPorLacos` não tem trecho
nem vinco que suma aos poucos de um laço para o outro. O modelador contornou com dois laços a 0,2 mm um do outro, vinco vivo de
laço inteiro e uma rampa de laços. O pé do filete virou uma aba torta com uma aresta vertical fina embaixo da frente, que a
pessoa viu nas vistas montadas. A medição e a ondulação passaram, e o processo não pegou. No mesmo cotovelo, a escada da tampa
recusou um laço côncavo com trechos coincidentes, e a tampa da frente teve de ser círculo inteiro, com aviso de amostragem
desigual. O registro está no backlog ("Trecho que some entre laços no `gaiolaPorLacos`"), e a pessoa passou a correção a esta
sessão.

## Resultado

Um trecho pode encolher até zero e um vinco pode perder a nitidez aos poucos ao longo de uma faixa de laços declarada, sem laço
a menos de alguns milímetros do vizinho, e a malha sai sem aba, sem dobra e sem face fina no ponto onde o trecho some. Uma medida
nova reprova a dobra local que a ondulação não vê.

## Filtro Agent-First

`gaiolaPorLacos`: REFATORAR, com campos declarados e ficha atualizada. O modelador escreve a faixa em que o trecho ou o vinco
some (`de`, `ate`) e a função distribui a transição pelos laços; ele não escreve laços quase coincidentes nem rampas à mão. A
recusa diz o trecho, os laços e o que falta. A medida da dobra: ENVOLVER o `descrever`, com o nome da parte, o lugar e o ângulo.

## Incluído

- o trecho que encolhe até zero numa faixa de laços, com os pontos dele se aproximando por igual e o fundir do ponto no laço
  final, sem leque de faces finas;
- o vinco com nitidez que cai de um valor até zero numa faixa de laços;
- a escada da tampa que aceita laço côncavo com trechos coincidentes, ou a recusa que diz qual trecho reamostrar;
- a medida da dobra: diedro agudo entre faces vizinhas fora de vinco declarado, com o lugar, no `descrever`;
- a prova numa peça geral em `tools/fixtures/solido-por-lacos/`: dois tubos que se cruzam com afastamento, com o filete do
  encontro sumindo na tangente, aprovada pela pessoa por imagem.

## Excluído

- o cotovelo do braço, que a sessão do braço refaz com a ferramenta nova, pelo plano dela;
- outras operações de gaiola.

## Gate de saída

1. A peça de prova sai sem laço a menos de 2 mm do vizinho, sem face fina e sem dobra pela medida nova.
2. A medida nova reprova a forma de antes (laços a 0,2 mm e rampa) na mesma peça, e passa no acervo inteiro ou aponta o que já
   estava dobrado, com o caso levado à pessoa.
3. As peças que usam `gaiolaPorLacos` sem os campos novos saem com a malha idêntica.
4. A pessoa aprova por imagem o encontro da peça de prova.
5. Ficha da capacidade e testes atualizados.

## Fatias

1. A peça de prova que reproduz a aba com a técnica de hoje, e a medida da dobra que a reprova (feita).
2. O trecho que encolhe e o vinco que esvai, com a peça de prova refeita por eles (feita).
3. A mesma peça fatiada na horizontal, com a costura `une` e a régua de vinco oculto (feita; a junção não chegou ao nível da fatiada em x).
4. A tampa com laço côncavo, e a dobra intencional declarada pela peça, para a régua passar a aviso no `descrever`.
5. Fechamento, com aviso à sessão do braço.

## Riscos e parada

Se a medida da dobra apontar muitas peças do acervo já aprovadas, parar e trazer à pessoa a lista com imagens antes de mudar o
limiar. Se o trecho que encolhe pedir mudar o número de pontos do laço (hoje fixo em todos), parar e trazer as duas saídas:
pontos fixos com fusão gradual, ou laço com número variável de pontos e costura própria.

## Fechamento

Preencher ao concluir ou cancelar.

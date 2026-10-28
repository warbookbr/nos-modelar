# Vocabulário poligonal da bancada

**Estado:** congelado
**Congelado em:** 2026-09-17, por decisão do usuário · **Base:** `73af5ec` na main
**Nasce congelado:** este plano foi escrito para ser guardado, e não executado
agora. Ele existe porque a fila estava registrada em prosa no fechamento de
[topologia, mover a peça, e ler o gesto](../encerrados/2026-09-16-topologia-e-leitura-do-gesto.md),
e fila em prosa some.

## O que ele entregaria

As operações de modelagem poligonal que ficaram de fora do plano de topologia,
todas na bancada e todas também no núcleo, porque operação que não vira receita
é gesto que não volta:

- **subdivisão**, que parte cada face em faces menores;
- **bisel**, que troca uma aresta viva por uma faixa de faces;
- **loop cut**, que corta um anel de faces ao longo de um tubo;
- **proportional editing**, em que mover um vértice arrasta os vizinhos com peso
  que cai com a distância.

Os **modificadores** ficam de fora mesmo dentro deste plano, e a razão é de
contrato e não de esforço. Os quatro acima produzem uma malha nova e terminam.
Modificador é não destrutivo: fica pendurado na peça e se reaplica a cada
execução. Isso não é uma operação a mais, é uma mudança no que a receita é, e
esbarra na regra de que conteúdo salvo é determinístico, versionado,
reexecutável e validável. Se alguém quiser modificadores, o primeiro passo é
medir se eles cabem nessa regra, no mesmo formato da fatia 1 do plano de
topologia, e não implementá-los.

## Por que foi congelado

A bancada é a superfície da pessoa, e as quatro operações acima são ferramentas
para ela desenhar. O usuário decidiu que a frente que precisa melhorar agora é a
da IA: o que ela lê, o que ela mede e o que ela consegue escrever sozinha. Sair
acrescentando vocabulário de desenho antes disso aumenta o que a pessoa pode
fazer e não aumenta o que a IA consegue devolver, e a distância entre as duas
coisas é justamente o que a rodada de absorção paga.

Nada aqui foi refutado. O laço funciona hoje com extrudar, duplicar, apagar,
criar face, girar, escalar e mover a parte inteira, e as quatro operações que
faltam são aumento de vocabulário, não conserto de defeito.

## Condição de descongelamento

Qualquer uma das duas:

- a frente da IA alcançar um estado em que absorver uma edição livre deixou de
  ser o gargalo, e o que limita passar a ser o que a pessoa consegue desenhar na
  bancada;
- uma peça concreta precisar de uma dessas quatro formas e nenhuma combinação de
  extrudar, apagar e criar face alcançar, medido e registrado, e não suposto.

## O que fica parado junto

Nada de código. Nenhuma das quatro operações foi escrita, então não há módulo
sem consumidor esperando no repositório. O que fica parado é só a fila.

## O que quem for executar precisa saber antes

Três medidas desta rodada valem para qualquer operação nova, e ignorá-las custa
o que já custou uma vez:

A régua da absorção compara forma por caixa e por nuvem de pontos, e é cega para
operação que não move ninguém. Duplicar quatro faces do tubo do selim cria seis
vértices em cima de vértices que já estavam ali, e criar face não cria vértice
nenhum; as duas saíam do alvo com 0,000916 mm de desvio, idêntico ao da receita
intacta. Por isso o alvo guarda quantas faces cada parte tem. Subdivisão, bisel
e loop cut mudam a contagem de faces, então caem nesse mesmo caso e precisam ser
conferidos por ele.

Operação que muda o número de partes obriga a rodada de absorção a revisar
`PLANO` e `contatos` junto com os passos, senão `guarda:acervo` reprova.

A descrição do gesto classifica translação, rotação em torno de eixo de
coordenada, escala, esticão com uma ponta presa e dobra. Proportional editing
produz um campo de deslocamento que não é nenhum desses, e vai sair como sem
padrão até que alguém decida se vale um tipo novo. Sair como sem padrão é
resposta honesta, não defeito.

## Gate de saída, se um dia for descongelado

1. cada operação nova produz alvo que a rodada de absorção enxerga, seja pela
   forma, seja pela contagem de faces;
2. o alvo continua sem id de vértice, id de face, índice de array e posição de
   passo, e reexecuta igual;
3. cada operação existe no núcleo, sem Three.js, com teste de unidade que prova
   a conta, e guarda de navegador que prova que o resultado chegou à cena;
4. gate nomeado em `tools/gates.mjs` e em `.github/workflows/ci.yml`, conferido
   por `reguas:check`, e falhando com a correção desfeita;
5. documentação de uso atualizada em `usar/AJUSTE-DA-BANCADA.md`.

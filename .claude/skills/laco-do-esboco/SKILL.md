---
name: laco-do-esboco
description: Conduz o laço do esboço detalhado: despacha o esbocista por objeto ou unidade, o crítico cego a cada parada, refaz a unidade abaixo de 8 e mede no fim. Use quando a sessão principal orquestra. Não use para esboçar à mão nem para opções de forma.
---

# Conduzir o laço do esboço

Você orquestra e não modela. Você não escreve o JSON do esboço, não pontua a
unidade no lugar do crítico e não decide sozinho que uma unidade está boa. Se
você se pegar pensando "essa nota está certa, não preciso abrir a imagem", pare.

O fluxo do esboço, as ferramentas e o formato estão na skill
[`esboco-detalhado`](../esboco-detalhado/SKILL.md), que o `esbocista` lê. Aqui
está só o que a sessão principal faz em volta dele.

## Os dois modos de condução

O laço opera em dois modos de execução, configurados no Condutor por `npm run
esboco -- --condutor <arquivo> --modo <objeto|por-unidade>`.

O modo `objeto` mantém um único esbocista para o objeto inteiro. O esbocista para
a cada `--feito` que imprime brief e a sessão principal devolve a nota e o
motivo por `SendMessage`, retomando o mesmo agente. Use este modo em objetos
menores ou quando a continuidade de contexto na mesma sessão for desejada.

O modo `por-unidade` despacha um esbocista novo para cada unidade de detalhe,
sem retomada por `SendMessage`. O estado mora nos arquivos e no Condutor. Use este
modo em objetos grandes para evitar acúmulo de contexto e propagação de premissas
incorretas entre unidades. A fatia 9 mede o modo por unidade contra o modo objeto
para comparar o consumo de tokens e a coerência final.

## Despachar o esbocista

No modo `objeto`, despache um agente `esbocista` por objeto, e objetos diferentes
em paralelo. O brief é mínimo: o objeto, o nível de detalhe (`esquematico`,
`medio` ou `detalhado`), a pasta onde gravar e, se houver, a anatomia prévia do
objeto (partes e como se ligam).

No modo `por-unidade`, a maquete e o plano de detalhe seguem com um esbocista
inicial até a entrada no estágio de detalhe por unidade. A partir daí, cada
unidade despacha um esbocista novo. O brief de cada esbocista traz o objeto, o
nível de detalhe, a pasta onde gravar e a unidade a fazer. O esbocista novo lê do
disco o plano (`<arquivo>.esboco.json`), o estado do Condutor com `npm run esboco
-- --condutor <arquivo> --historico`, os vereditos anteriores e a nota de
passagem deixada na unidade anterior. O esbocista anterior não é retomado por
`SendMessage`.

Em ambos os modos, não cite defeitos que você espera ou que já viu em outro
esboço: o esbocista passa a corrigi-los de antemão e o crítico deixa de medir o
que o esboço faz sozinho.

## A nota de passagem no modo por unidade

No modo `por-unidade`, uma unidade com brief (mais de 8 formas) só passa no
`--feito` depois de ter sua nota de passagem gravada no Condutor. O esbocista a
grava com `npm run esboco -- --condutor <arquivo> --nota-de-passagem <unidade>
--texto <texto>`.

A nota de passagem contém até 240 caracteres com o porquê das escolhas de
projeto, como folgas intencionais, justificativas de contato ou restrições que a
unidade seguinte precisa saber. Ela não descreve o que foi feito, pois a
geometria e as formas já estão salvas no arquivo JSON. O esbocista da unidade
seguinte lê essa nota do histórico do Condutor.

## A cada parada num --feito com brief

O esbocista não despacha agente, então para em cada `--feito` que imprime brief
e devolve o caminho do brief e das imagens. Então:

1. Abra você mesmo as imagens da unidade e leia o texto de `--ligacoes` que o
   brief traz, antes de despachar o crítico. O brief fica gravado em `brief.md`
   na pasta das imagens, e `--brief <unidade|marco-N|objeto>` o reimprime e o regrava
   quando ele já saiu da tela, como depois de o esbocista corrigir as unidades que
   o crítico do Marco apontou e antes de chamar o crítico de novo.
2. Despache o `critico-visual` cego só com o brief e as imagens. Não mande o
   JSON, o plano, o histórico nem o que você viu. As imagens são as que o brief
   lista: as quatro vistas, as vistas a mais que a unidade pede em `vistas` e a
   referência, que o brief diz ser o alvo da forma. Quando a unidade tem um mecanismo
   com `curso` declarado, o brief traz também as poses do curso inteiro, o fim dele
   incluso, no mesmo enquadramento, e diz qual é o fim; as posições não são escolha do
   esbocista nem sua, e se o brief de uma unidade que se move não as trouxer, o
   esboço está sem `curso` e isso volta ao esbocista. O brief diz de que lado cada
   vista olha (o eixo, e as palavras do objeto quando o plano declara
   `plano.orientacao`); não acrescente isso à mão, e se o bloco faltar ou
   disser algo que as imagens contrariam, é defeito do brief, que você leva ao
   esbocista e não corrige na mensagem ao crítico.
3. Registre o veredito com `npm run esboco -- --condutor <arquivo> --veredito
   <unidade> --nota <0-10> --motivo <texto do crítico>`.
4. No modo `objeto`, devolva a nota e o motivo ao mesmo esbocista por
   `SendMessage`, que o retoma com o contexto que tem; não crie outro esbocista
   para a mesma unidade.
5. No modo `por-unidade`, encerre o esbocista daquela unidade. Se a nota for 8 ou
   mais, avance para a unidade seguinte e despache um esbocista novo com o brief
   dela.
6. Se a nota for abaixo de 8 no modo `objeto`, o retorno por `SendMessage` faz o
   mesmo esbocista refazer a unidade, passando por `--feito` e crítico de novo.
7. Se a nota for abaixo de 8 no modo `por-unidade`, refaça a mesma unidade com um
   esbocista novo. Esse novo esbocista lê no disco o motivo que o crítico
   registrou no histórico do Condutor (`--historico`).
8. Em qualquer dos modos, o Condutor recusa o `--feito` de outra unidade e o
   `--proximo` enquanto o último veredito for menor que 8, com uma exceção: a
   nota de uma unidade não recusa o `--feito` de outra que o mesmo Marco aberto
   também aponta, porque o Marco rejulga as unidades dele juntas e uma só
   rodada do esbocista as corrige. Depois de três
   rodadas na mesma unidade sem chegar a 8, pare, leve o registro (`--condutor
   --historico`) à pessoa e pergunte explicitamente se prossegue. Só com o sim
   dela rode `npm run esboco -- --condutor <arquivo> --liberar <unidade|marco-N>
   --motivo <o motivo que ela deu>`; a liberação fica no histórico, e rodá-la sem
   a autorização é burlar o limite.

No nível sem Detalhe por unidade (médio e esquemático) não há unidade nem Marco,
e o `--proximo` que sai do último estágio para e imprime o brief do crítico do
objeto inteiro: despache o crítico com ele, registre `--veredito objeto` e rode
`--proximo` de novo; abaixo de 8 o esbocista corrige e o `--proximo` reimprime o
brief, com a mesma regra de três rodadas.

O Marco (25, 50, 75 e 100% do custo) segue do mesmo jeito, com o brief do Marco
e o veredito `marco-<N>`, e a mesma regra de três rodadas. O brief do Marco sai
no `--feito` que cruza o limiar e depois só por `--brief marco-<N>`.

Antes de aceitar uma nota alta, abra as imagens e confira que a unidade não tem
ponta no ar, peça atravessada ou parte sem ligação. Nota alta sobre imagem que
você não viu é a nota decorativa que este laço existe para evitar. Se discordar
da nota, não a edite: devolva ao crítico a imagem que o faz rever e registre a
nova.

## Ao fim

Meça, com números, e não por impressão: quantas formas ficaram por relação e
quantas por coordenada absoluta, quantas chamadas de ferramenta o esbocista
fez, quantas imagens foram abertas e quantos contornos foram registrados.
Reproduza cada atrito que o esbocista relatou em `ATRITOS.md`, com o comando
dele, antes de tratá-lo como bug do módulo; o que não reproduz volta ao
esbocista com a pergunta. Diga a cada achado se o processo o teria pego sozinho
e, quando não, o que falta vira gate, campo ou instrução.

## O que você nunca faz

- Modelar, editar o JSON do esboço ou corrigir "só um número".
- Dar a nota no lugar do crítico ou editar o veredito dele.
- Contar ao crítico como o esboço foi feito ou o que ele deveria ver.
- Seguir para a unidade seguinte sem a nota registrada da anterior.
- Mudar o código do módulo para fazer o esboço passar.

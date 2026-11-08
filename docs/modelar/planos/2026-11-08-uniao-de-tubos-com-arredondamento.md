# União de dois tubos com arredondamento: o tubo em pé redondo até a base, cruzado por um tubo deitado afastado

**Estado:** ativo

**Território:** `tools/fixtures/uniao-de-tubos/`, `procedural/nucleo/operacoes/booleanas.js`

**Responsável:** Tiago (aprovação por imagem) e a IA da sessão do furgão (implementação); a sessão do braço refaz o cotovelo
pelo plano dela com o que este entregar.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-08.

A fatia 1 (2026-11-08) fez a peça de prova com `unir` e `arredondarCostura` como estão: a base sai redonda e inteira sobre o
disco, a parede é vertical, o arredondamento de 10 mm faz a frente de baixo limpo e para antes da base, e a régua de vinco
oculto não acha nada. Sobra um entalhe na ponta de trás, onde o tubo deitado acaba rente às costas do tubo em pé e o
arredondamento chega ao plano da tampa em fatias degeneradas (2 dobras de 100° e 107°). A pessoa passou `booleanas.js` a este
plano para a correção, vindo do plano do braço.

A fatia 2 (2026-11-08) corrigiu a causa em `arredondarCostura`: a bola rolava até a borda de uma face plana que limita o
sólido sem recusa, e agora o raio afina de forma contínua até sumir antes dessa borda, com o aviso `faceLimite`. A peça de
prova sai com 0 dobras, 0 vincos e 0 arestas agudas; o ombro, a coluna do braço e a fixture do ombro saem com a malha
idêntica, e só as rodadas encerradas 09 e 10 do ombro mudaram de hash, sem mudar a contagem de dobras. Fica o calombo de
0,75 mm nos pontos tangentes laterais, dentro do limite de ondulação de 1,1 mm, onde o fim da cadeia de estações é abrupto.

## Problema observado

O cotovelo do braço pede o tubo em pé redondo até o colar e cruzado no alto por um tubo deitado que passa 19 mm à frente dele,
com o encontro arredondado e sem degrau (`procedural/pecas/braco-robotico/ALINHAMENTO.md`, "O anel do cotovelo e o cotovelo").
O plano do [trecho que some entre laços](encerrados/2026-11-08-trecho-que-some-entre-lacos.md) mostrou que uma gaiola só não dá
essa forma: fatiada ao longo do tubo deitado, o pé da frente vira rampa; fatiada na horizontal, a junção sob o tubo deitado
sai ondulada. A pessoa decidiu esperar uma união dos dois tubos com arredondamento, e o cotovelo fica aberto até lá.

O núcleo já tem `unir` e `arredondarCostura` (`procedural/nucleo/operacoes/booleanas.js`), que o ombro do braço usa, com modo
curvo para costura sobre superfície facetada, `raioMinimo` e `afinarPontas`. Não se sabe ainda se eles dão o encontro de dois
cilindros que se cruzam com afastamento, onde a costura é uma curva em sela e o arredondamento some na tangente de baixo.

## Resultado

Uma peça de prova geral de dois tubos de mesmo diâmetro, um em pé sobre um disco e outro deitado cruzando-o no alto, afastado
à frente, sai com a base redonda inteira rente ao disco, o encontro arredondado com raio constante onde cabe e sumindo onde o
encontro fica tangente, sem dobra e sem vinco não declarado pelas réguas, e a pessoa a aprova por imagem.

## Filtro Agent-First

USAR DIRETO `unir` e `arredondarCostura` primeiro: cada tubo é feito na direção dele (revolução ou cilindro), e a união com o
arredondamento é declarada em dois passos. Só se a medida mostrar o que eles não fazem, REFATORAR a operação, com o território
de `booleanas.js` pedido ao plano do braço, que o declara no arredondamento da costura, e com a recusa dizendo o caso.

## Incluído

- a peça de prova em `tools/fixtures/uniao-de-tubos/`, com as medidas do cotovelo (tubos de 156 mm, folga de 39 mm entre o
  disco e o fundo do tubo deitado, tubo deitado de 175 mm afastado 19 mm à frente), sem nome do braço;
- a medida pelas réguas de dobra e de vinco oculto, pela ondulação e pelo contato da base com o disco;
- a correção na operação, se a prova mostrar a falta, com o território cedido pelo plano do braço.

## Excluído

- o cotovelo do braço, que a outra sessão refaz;
- outras formas de encontro que não sejam de dois cilindros.

## Gate de saída

1. A peça de prova sai sem dobra e sem vinco não declarado pelas réguas, e com a ondulação no nível da peça fatiada ao longo
   do tubo deitado (5 marcas de até 1,1 mm) ou melhor.
2. A base do tubo em pé é um círculo inteiro rente ao disco, sem degrau.
3. As peças que já usam `unir` e `arredondarCostura` saem com a malha idêntica, se a operação mudar.
4. A pessoa aprova o encontro por imagem.

## Fatias

1. A prova com `unir` e `arredondarCostura` como estão, e a medida; imagem à pessoa.
2. Se faltar, a correção na operação, com o território pedido ao plano do braço.
3. Fechamento, com aviso à sessão do braço.

## Riscos e parada

Se `arredondarCostura` não fechar a costura em sela, ou se a correção pedir mudar o formato da costura que o ombro do braço
usa, parar e trazer à pessoa o que a medida mostrou antes de mexer em `booleanas.js`.

## Fechamento

Preencher ao concluir ou cancelar.

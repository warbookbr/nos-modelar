# Costuras e furos limpos no núcleo: a união, o arredondamento e o furo sem dente, fresta, lasca nem face degenerada

**Estado:** ativo

**Território:** `procedural/nucleo/operacoes/booleanas.js`, `procedural/nucleo/operacoes/estruturais.js`, `procedural/nucleo/operacoes/geradores-avancados.js`, `procedural/nucleo/uso-operacoes.js`, `tools/modelar/guardas/guarda-acervo.mjs`, `tools/modelar/reguas-de-malha/`, `tools/fixtures/costuras-e-furos/`

**Responsável:** a IA da sessão do furgão, com as decisões técnicas delegadas pela pessoa em 2026-11-09 ("é basicamente uma
frente autônoma sua"); a pessoa é a crítica por imagem: recebe, com um resumo curto do que olhar, as peças do acervo que mudarem, e a forma de
peça continua sendo dela.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-09, com o braço robótico inteiro fixo.

Em 2026-11-09 a pessoa passou a este plano `booleanas.js`, `geradores-avancados.js` e `guarda-acervo.mjs`, que eram do plano
do [braço](2026-09-26-as-partes-do-braco.md); eles voltam a ele quando este fechar, se o braço ainda precisar.

A fatia 1 (2026-11-09) pôs as três réguas em `tools/modelar/reguas-de-malha/` e uma peça de prova por defeito em
`tools/fixtures/costuras-e-furos/`. Números de hoje: dentes no fim que afina, 24 pontas em 18 trechos (a peça limpa da união de
tubos tem 4 e 4, o bico legítimo onde o arredondamento some, e é a referência, e não zero); face degenerada, 1 no cotovelo de
195 mm; frente rente à tampa, 4 arestas soltas; muitos lados, 1 órfão do `arredondarCostura` com 216 a 232 lados (192 fecha
hoje, e a peça usa 224); `subtrair` sem corte, nenhum aviso; `furo` na tampa do `lathe`, recusado por 144 faces de entrada;
`furo` em face plana, 341 triângulos finos. Os dois braços numa carcaça curva não reproduziram nem na forma reduzida nem no
esboço inteiro, e saem do plano. No acervo, 0 faces degeneradas em 66 peças, pontas de serra só nas 5 peças do braço com
costura, e 17.098 triângulos finos, a maior parte de leques em tampas e contornos; o plano corrige os do `furo`, e os outros
ficam medidos como aviso.

## Problema observado

O braço robótico saiu inteiro em 2026-11-09 e, exportado e aberto no Blender, mostrou defeitos das operações do núcleo que
nenhuma medição do projeto pegou, e as rodadas do furgão e do braço deixaram outros no backlog:

- onde o `arredondarCostura` afina até sumir junto a uma face plana (o aviso `faceLimite`, da fatia 2 da
  [união de tubos](encerrados/2026-11-08-uniao-de-tubos-com-arredondamento.md)), a costura termina em dentes de serra, no braço
  superior, no antebraço e nos elos do punho;
- o `unir` e o `arredondarCostura` de dois `lathe` deixam faces de três cantos colineares, que o `descrever` e o `guarda:acervo`
  aceitam e a bancada recusa (`adaptarThree: face ... é degenerada`), e por elas 30 dos 66 pares do braço montado saem
  inconclusivos na auditoria de interseções;
- o `unir` deixa uma fresta quando a frente de um tubo fica rente à tampa de outro (o braço superior usa 0,05 mm de folga), e
  deixa vértices órfãos com dois `lathe` de 192 lados no cotovelo;
- o `arredondarCostura` recusa a costura de dois braços chatos numa carcaça curva (o retrovisor do furgão);
- um `subtrair` que não corta nada passa calado;
- o `furo` exige uma face de entrada só, e a tampa do `lathe` sai em leque, então o flange do braço virou `cilindro`; e o `furo`
  refaz a face plana em leques de triângulos longos, que dão estrias com sombreamento suave.

## Resultado

As três operações (`unir` com `arredondarCostura`, `subtrair` e `furo`) entregam malha sem dente, fresta, lasca, órfão nem face
degenerada nos casos acima, cada um com peça de prova, e três réguas novas acham sozinhas o que o Blender mostrou: serrilhado
na linha da costura, triângulo fino em face plana e face degenerada, esta cobrada pelo `guarda:acervo`.

## Filtro Agent-First

Medir primeiro: as réguas e as peças de prova entram antes de cada correção e reproduzem o defeito com número; a correção
inverte a medida. Toda correção é geral, na operação, e a peça que já usa a operação sai igual onde o defeito não estava.

## Incluído

- `tools/modelar/reguas-de-malha/`: a régua de serrilhado da costura, a de triângulo fino em face plana e a de face degenerada,
  com teste, rodadas pelo `descrever` como aviso e a de face degenerada como recusa do `guarda:acervo`;
- `tools/fixtures/costuras-e-furos/`: uma peça de prova por defeito, com as medidas do caso real e sem nome de objeto;
- as correções no `arredondarCostura` (fim que afina em faixa contínua, dois braços numa carcaça curva), no `unir` (tangência ao
  plano de uma tampa, muitos lados, a origem das faces degeneradas), no `subtrair` (aviso quando não muda o sólido) e no `furo`
  (a tampa em leque do `lathe` como uma face de entrada, e a face plana refeita em anéis em volta de cada furo);
- a ficha de `uso-operacoes.js` com cada limite novo;
- as peças do acervo que mudarem, com antes e depois medidos e uma imagem à pessoa.

## Excluído

- mudar receita de peça para contornar defeito de operação;
- a exportação, que é do plano do braço;
- operações que nenhum caso real acusou.

## Gate de saída

1. Cada defeito acima tem peça de prova que o reproduzia e passa a medir zero na régua dele.
2. As três réguas rodam no `descrever`, e o `guarda:acervo` recusa face degenerada; o acervo inteiro passa.
3. A auditoria de interseções do braço montado mede os 66 pares, sem inconclusivo.
4. As peças do acervo que usam as operações saem com a malha idêntica, ou mudam só onde o defeito estava, medido.
5. O revisor adversarial passa por cada correção de operação antes da integração.

## Fatias

1. As três réguas e as peças de prova de todos os defeitos, com os números de antes.
2. O fim do arredondamento que afina.
3. O `unir`: face degenerada, tangência à tampa e muitos lados; o aviso do `subtrair`; a recusa no `guarda:acervo`.
4. O `furo`: a tampa do `lathe` e a face refeita em anéis.
5. Fechamento: auditoria do braço, peças do acervo que mudaram, imagem à pessoa, aviso à sessão do braço.

## Riscos e parada

Se uma correção mudar uma peça aceita longe do defeito, ou pedir mudar o formato de saída de uma operação de que outras peças
dependem, parar aquela correção, registrar a medida e seguir com as outras. Se o aceite de uma etapa do braço cair porque a
malha mudou, a imagem do antes e do depois vai à pessoa com a medida, e a etapa só volta a fixa com o sim dela.

## Fechamento

Preencher ao concluir ou cancelar.

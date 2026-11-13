# Costuras e furos limpos no núcleo: a união, o arredondamento e o furo sem dente, fresta, lasca nem face degenerada

**Estado:** ativo

**Território:** `procedural/nucleo/operacoes/booleanas.js`, `procedural/nucleo/operacoes/estruturais.js`, `procedural/nucleo/operacoes/geradores-avancados.js`, `procedural/nucleo/uso-operacoes.js`, `procedural/nucleo/nucleo.js`, `procedural/nucleo/operacoes/furo-em-aneis.js`, `procedural/nucleo/operacoes/furo-em-aneis.test.ts`, `procedural/nucleo/lados-por-desvio.test.ts`, `tools/modelar/guardas/guarda-acervo.mjs`, `tools/modelar/descrever-peca.mjs`, `tools/modelar/reguas-de-malha/`, `tools/fixtures/costuras-e-furos/`

**Responsável:** a IA da sessão do furgão, com as decisões técnicas delegadas pela pessoa em 2026-11-09 ("é basicamente uma
frente autônoma sua"); a pessoa é a crítica por imagem: recebe, com um resumo curto do que olhar, as peças do acervo que mudarem, e a forma de
peça continua sendo dela.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-09, com o braço robótico inteiro fixo.

Em 2026-11-09 a pessoa passou a este plano `booleanas.js`, `geradores-avancados.js` e `guarda-acervo.mjs`, que eram do plano
do [braço](../decisoes/PLANOS-ENCERRADOS.md); eles voltam a ele quando este fechar, se o braço ainda precisar.

A fatia 1 (2026-11-09) pôs as três réguas em `tools/modelar/reguas-de-malha/` e uma peça de prova por defeito em
`tools/fixtures/costuras-e-furos/`. Números de hoje: dentes no fim que afina, 24 pontas em 18 trechos (a peça limpa da união de
tubos tem 4 e 4, o bico legítimo onde o arredondamento some, e é a referência, e não zero); face degenerada, 1 no cotovelo de
195 mm; frente rente à tampa, 4 arestas soltas; muitos lados, 1 órfão do `arredondarCostura` com 216 a 232 lados (192 fecha
hoje, e a peça usa 224); `subtrair` sem corte, nenhum aviso; `furo` na tampa do `lathe`, recusado por 144 faces de entrada;
`furo` em face plana, 341 triângulos finos. Os dois braços numa carcaça curva não reproduziram nem na forma reduzida nem no
esboço inteiro, e saem do plano. No acervo, 0 faces degeneradas em 66 peças, pontas de serra só nas 5 peças do braço com
costura, e 17.098 triângulos finos, a maior parte de leques em tampas e contornos; o plano corrige os do `furo`, e os outros
ficam medidos como aviso.

Andamento da fatia 3 (2026-11-12, medido a partir da main de hoje): as peças de prova de dentes no fim do arredondamento (3 pontas em 3 trechos, eram 24 em 18), da face degenerada em dois `lathe` (0 faces, eram 1) e de muitos lados no `unir` (0 órfãos, 0 faces degeneradas; 224 lados fecham) já mediam o esperado antes desta rodada, e o `furo` na tampa do `lathe` sai com 0 arestas soltas e 0 faces degeneradas. A frente rente à tampa passou de 4 arestas soltas a 0: o canto do aro de um tubo e o polo da tampa de outro coincidem, e a face que o `unir` mantém inteira ficava com o id que os pedaços cortados não usavam; ela passa ao canto representante (no acervo só mudam os ids de vértice do antebraço, com as mesmas 6.540 faces). O `subtrair` e o `intersectar` que não mudam o sólido avisam `semEfeito`, e o `guarda:acervo` recusa face degenerada (103 peças passam) e mostra o progresso de cada peça no stderr. Ficou fora: as réguas de serrilhado, costura registrada, triângulo fino e face torcida no `descrever` (o arquivo é do plano das ferramentas de conferência); as duas faces sem área do braço têm origem achada, uma agulha de 430 mm por 0,015 mm que o `arredondarCostura` deixa na faceta do tubo (peça de prova `agulha-na-faceta-do-tubo`: 1 agulha e 40 faces de menos de 1e-9 m²), e a correção que a remove (recusar na partição por colinear a metade abaixo do piso de lasca) mudou 4 partes do braço e a carroceria do sedã (de 174.936 a 173.701 faces), longe do defeito, e não entrou; a união da aba do `paineisPorVaos` com a chapa do sedã não foi reproduzida (o rascunho passou de 6 min).

Andamento de 2026-11-13: a agulha na faceta do tubo saiu, com a partição por colinear recusando a metade abaixo de 0,2 do piso de lasca (0 agulhas na peça de prova, 66 de 66 pares do braço conclusivos; mudam braço, antebraço, elo do punho e a carroceria do sedã em duas faces). O revisor adversarial liberou com a ressalva de que o fator vale numa janela estreita (0,2 a 0,25) e não fecha a classe: em 8 variantes novas do encontro de tubos, 6 saem limpas e 2 ainda ficam com face abaixo do piso. A régua de face degenerada passou a dois níveis: abaixo do piso da parte recusa, e entre o piso da parte e o da peça inteira avisa, porque é o que a auditoria da montagem acusaria; o furgão realista tem duas faces assim, uma em cada retrovisor. A peça de prova de dois `lathe` fica com 1 face como defeito conhecido. O que resta da classe passa ao plano da forma exata antes da malha.

## Problema observado

O braço robótico saiu inteiro em 2026-11-09 e, exportado e aberto no Blender, mostrou defeitos das operações do núcleo que
nenhuma medição do projeto pegou, e as rodadas do furgão e do braço deixaram outros no backlog:

- onde o `arredondarCostura` afina até sumir junto a uma face plana (o aviso `faceLimite`, da fatia 2 da
  [união de tubos](../decisoes/PLANOS-ENCERRADOS.md)), a costura termina em dentes de serra, no braço
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

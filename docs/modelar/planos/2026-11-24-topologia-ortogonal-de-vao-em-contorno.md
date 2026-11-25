# Topologia ortogonal e bem distribuída na costura de vão em faixaDeContornoNaRede

**Estado:** ativo

**Território:** `procedural/nucleo/faixa-de-contorno-na-rede.js`, `procedural/nucleo/faixa-de-contorno-na-rede.test.mjs`, `procedural/nucleo/fixtures/faixa-de-contorno-prova.js`, `procedural/pecas/carro-quadrado/`

**Responsável:** IA implementa, mede a ortogonalidade/distribuição de faces e inspeciona em arame ortográfico e luz rasante; a pessoa valida nas chapas de estudo e na carroceria.

**Repositório e base:** `warbookbr/nos-modelar`, branch `envio/carro-quadrado-forma` em 2026-11-24.

## Problema observado

Com o modo `vao` e `alinharSuperficie` entregues no plano encerrado (`e89e06c6`), o degrau geométrico na superfície limite caiu para `0,009 mm`, mas a inspeção ortográfica em arame nas três chapas isoladas de estudo (`carro-quadrado/estudo-arcos`) expôs dois problemas estruturais na topologia do vão:

1. **Cisalhamento brusco na fronteira vertical do vão:** as linhas horizontais da grade retangular chegam a `90°` nas verticais laterais do vão e, ao entrar em `pFrente`/`pTras`, mergulham em diagonal para acompanhar a metade inferior do arco. Em superfície curva subdividida em `niveis: 2`, essa quebra de direção dos triângulos exatamente sobre uma linha reta vertical deixa um vestígio sutil de sombra em luz rasante.
2. **Distribuição desigual de subdivisões ao redor do arco:** as âncoras fixas a ~45° fazem as laterais do arco (`n0..n1` e `n2..n3`) receberem mais divisões por milímetro que o topo (`n1..n2`), afunilando as faces perto da base e alargando-as no alto do arco.

## Bancada isolada de estudo e teste (`carro-quadrado/estudo-arcos`)

Faz parte explícita deste plano a peça isolada `procedural/pecas/carro-quadrado/partes/estudo-arcos/receita.js`, criada com o objetivo específico de **estudar, testar e comparar de forma limpa e isolada** o comportamento da ferramenta sobre uma chapa curva realista (mesmo abaulamento vertical, afunilamento longitudinal e vinco de ombro da lateral traseira do carro), sem o ruído das demais peças da carroceria, cobrindo lado a lado as três famílias de arco:

- `painelOmbroVincado`: ombro saliente com vinco externo (`vinco: 0,50`);
- `painelBojoSuave`: alargamento suave G1 na própria chapa, sem vinco externo;
- `painelChanfroAba`: chanfro para dentro com `abaInterna` dobrada.

Toda mudança na geração topológica de `vao` será validada primeiro nessas três chapas (em vista ortográfica em arame, luz rasante, pintura brilhante e zebra) antes de entrar na carroceria completa (`carro-quadrado/lataria`).

## Resultado

`faixaDeContornoNaRede` passa a gerar no modo `vao` uma transição topológica ortogonal e bem distribuída entre o contorno curvo do arco e o retângulo do vão — combinando calibração automática das âncoras superiores pela razão de aspecto do vão (igualando o passo tangencial entre laterais e topo do arco e mantendo as linhas horizontais niveladas na entrada) e anel intermediário morfado (interpolação suave entre o contorno externo do arco e o retângulo arredondado do vão) — eliminando o mergulho diagonal brusco na fronteira vertical.

## Filtro Agent-First

- `faixaDeContornoNaRede` (`vao`): **REFATORAR** (extensão retrocompatível) — calibrar automaticamente a posição angular das âncoras superiores (ou amostragem adaptativa do contorno) pela proporção `altura : largura` do vão e gerar anel intermediário morfado arco → retângulo arredondado antes da borda retangular do vão, entregando quads próximos de `90°` junto às bordas verticais e horizontais.
- `gaiolaPorRede` e `subdivisao`: **USAR DIRETO** — `retalho.superficie` e `alinharSuperficie` (PIA + gradação colinear) já sustentam a projeção exata dos novos anéis na superfície.

## Incluído

- calibração automática de âncoras / distribuição tangencial uniforme e anel intermediário morfado arco → retângulo no modo `vao` de `procedural/nucleo/faixa-de-contorno-na-rede.js`;
- métricas e testes unitários de ortogonalidade (ângulo próximo de `90°` junto às bordas do vão) e uniformidade de espaçamento ao redor do arco em `procedural/nucleo/faixa-de-contorno-na-rede.test.mjs`;
- validação comparativa nas três chapas isoladas de `procedural/pecas/carro-quadrado/partes/estudo-arcos/receita.js`;
- aplicação final em `procedural/pecas/carro-quadrado/partes/lataria/`.

## Excluído

- qualquer conceito específico de veículo dentro de `procedural/nucleo/`;
- alteração em `carro-fastback` ou em outras peças do acervo fora de `carro-quadrado/`.

## Invariantes

- Chamadas de `faixaDeContornoNaRede` sem `vao` continuam idênticas bit a bit.
- O núcleo permanece 100% determinístico e agnóstico a domínio.
- Nenhuma aprovação visual é declarada sem inspeção prévia em arame ortográfico, sólida, pintura brilhante e zebra nas três chapas de `estudo-arcos` e, depois, na `carro-quadrado/lataria`.

## Gate de saída

1. Em `faixa-de-contorno-na-rede.test.mjs`, a razão entre o espaçamento médio no topo (`n1..n2`) e nas laterais (`n0..n1`, `n2..n3`) do arco fica `<= 1,35x`, e os quads adjacentes às bordas verticais do vão mantêm ângulo interno próximo de `90°` (sem mergulho diagonal brusco), com `0` faces dobradas e `desvioMaximoMm < 0,1 mm`.
2. Nas três chapas de `carro-quadrado/estudo-arcos`, `descrever --estrito` passa com `0` faces órfãs e a vista ortográfica em arame confirma distribuição limpa nos três perfis de arco.
3. Em `carro-quadrado/lataria`, `23` corpos, `0` faces órfãs, `0` contatos acusados e aprovação visual da pessoa na bancada; `planos:check`, `mapa:check`, `docs:links:check`, `nome:check` e testes verdes.

## Fatias

1. Implementar no modo `vao` de `faixaDeContornoNaRede` a distribuição tangencial uniforme (âncoras calibradas pela proporção do vão) e o anel intermediário morfado (arco → retângulo arredondado), com testes unitários de ângulo e uniformidade.
2. Atualizar e inspecionar `carro-quadrado/estudo-arcos` (as 3 chapas isoladas de estudo e teste) em arame ortográfico, sólida, pintura e zebra, colhendo validação da pessoa.
3. Aplicar em `carro-quadrado/lataria`, validar `0` contatos / `0` faces órfãs e fechar o plano após aprovação visual final.

## Riscos e parada

Se o anel intermediário morfado aproximar demais os cantos superiores quando a folga entre o arco e o topo do vão for menor que `35 mm`, degradar automaticamente para costura direta sem anel morfado e emitir aviso estruturado `vaoSemFolgaParaAnelMorfado`.

## Fechamento

Preencher ao concluir ou cancelar.

# Costura automática de vão em faixaDeContornoNaRede e guardas de rede

**Estado:** concluído

**Território:** `procedural/nucleo/faixa-de-contorno-na-rede.js`, `procedural/nucleo/faixa-de-contorno-na-rede.test.mjs`, `procedural/nucleo/gaiola-por-rede.js`, `procedural/nucleo/gaiola-por-rede.test.mjs`, `procedural/nucleo/fixtures/faixa-de-contorno-prova.js`, `procedural/pecas/carro-quadrado/`

**Responsável:** IA da sessão implementa e mede; a pessoa julga pintura brilhante, zebra e encaixes na bancada.

**Repositório e base:** `warbookbr/nos-modelar`, branch `envio/carro-quadrado-forma` em 2026-11-23.

## Problema observado

Ao aplicar `faixaDeContornoNaRede` nos arcos de roda de `carro-quadrado/lataria` (`ac10d660`), a costura manual dos retalhos em volta da faixa produziu três classes de defeito visíveis em pintura brilhante e zebra:

1. Quatro vértices extraordinários de valência 5 caíram diretamente sobre o vinco `L3` (`e1_vinco`, `e2_vinco`, `e5_vinco`, `e6_vinco`), somados a um salto de altura de face (`112 mm` para `269 mm`), suavizando o vinco no para-lama e criando amassado junto à porta.
2. As ligações diagonais (`arcoD_ligF`, `arcoT_ligF`, `arcoT_ligT`, de `269` a `281 mm`) ficaram travadas em `divisoes = 1` por compartilharem o retalho de 4 lados com a soleira curta (`33 mm`), cortando por dentro do abaulamento lateral (`Curva 3`) e criando amassados diagonais na frente e na traseira; além disso, faltava um anel externo neutro de amortecimento após o vinco do arco.
3. A remoção das estações intermediárias `1550` e `1235` para abrir o vão único fez a spline Catmull-Rom de `L4`/`L5` afundar até `30,6 mm` abaixo da borda do capô.
4. Mesmo com o modo `vao`, o preenchimento bilinear de Coons afundava o miolo dos retalhos de transição e o encolhimento quadrático de Catmull-Clark (`Δx ≈ -κ h² / 6`) variava entre os quads curtos do anel de amortecimento e os quads mais longos do flanco adjacente, gerando linhas verticais/curvas de sombreamento saindo dos dois lados de cada arco; e lados espremidos do vão (`8,96 mm` em `arcoD_solT`) passavam sem aviso.

O processo não pegou esses defeitos sozinho: `gaiolaPorRede` listou `extraordinarios` e `densidades`, mas não emitia aviso de polo sobre vinco, de corda longa com `divisoes = 1` afundada, nem de desvio da superfície limite contra a superfície-guia; e `faixaDeContornoNaRede` não avisava quando o vão ficava espremido ou o anel de amortecimento ficava estreito demais.

## Resultado

Uma receita encaixa qualquer relevo de contorno em um vão retangular de `gaiolaPorRede` em uma única chamada declarativa (`faixaDeContornoNaRede` com `vao` e `anelDeAmortecimentoMm`), sem travamento em `divisoes = 1`, sem polos valência 5 sobre vincos, com projeção real do miolo (`retalho.superficie`), compensação automática do encolhimento de Catmull-Clark na zona neutra por interpolação progressiva (`alinharSuperficie` / PIA) e guardas automáticos em `gaiolaPorRede` (`extraordinarioEmVinco`, `cordaLongaEmTransicao`, `desvioDeSuperficie`) e `faixaDeContornoNaRede` (`vaoEstreito`, `amortecimentoEstreito`), provado na fixture neutra e em `carro-quadrado/lataria`.

## Filtro Agent-First

- `faixaDeContornoNaRede`: **REFATORAR** (extensão retrocompatível) — adicionar `anelDeAmortecimentoMm` (anel neutro externo com `superficie` herdada de `projetar`), `vao` (gera `solF`/`solT`/`ligF`/`ligT` projetadas na superfície, retalhos de transição com `superficie` e `divisoes` radiais `>= 2` calculadas por `passoTransicaoMm` e lista `cantos` pronta) e avisos automáticos `vaoEstreito` e `amortecimentoEstreito`.
- `gaiolaPorRede`: **REFATORAR / GUARDAR** (extensão retrocompatível) — suportar `retalho.superficie` (projeção do miolo sobre a superfície real), `alinharSuperficie` (interpolação progressiva / PIA na zona lisa pertencente apenas a retalhos com `superficie`, preservando vincos, cantos e relevo, somada à propagação automática de gradação de densidade entre curvas colineares que se encontram num nó) e emitir avisos diagnósticos `extraordinarioEmVinco`, `cordaLongaEmTransicao`, `desvioDeSuperficie` e `gradacaoBrusca` (incluindo emendas colineares entre curvas distintas), sem alterar nenhuma malha existente do acervo.
- `subdivisao` e `aberturaPorContorno`: **USAR DIRETO** — `gaiolaPorRede` reutiliza `limitesDaGaiola` já existente em `subdivisao.js`.

## Incluído

- `anelDeAmortecimentoMm`, `vao`, `cantos` e avisos `vaoEstreito` e `amortecimentoEstreito` em `procedural/nucleo/faixa-de-contorno-na-rede.js`, com testes em `faixa-de-contorno-na-rede.test.mjs` e fixture `faixa-de-contorno-prova.js`;
- `retalho.superficie`, `alinharSuperficie` (PIA) e avisos `extraordinarioEmVinco`, `cordaLongaEmTransicao` e `desvioDeSuperficie` em `procedural/nucleo/gaiola-por-rede.js`, com testes em `gaiola-por-rede.test.mjs` e `faixa-de-contorno-na-rede.test.mjs`;
- reescrita limpa de `carro-quadrado/lataria` (`chapa.js`, `receita.js` e `frente-traseira.js`) com faixa de apoio uniforme abaixo de `L4`, preservação das estações superiores (`1550`, `1235`, `-1125`) alinhadas ao capô, avaliador bicúbico C1, costura dos dois arcos pelo modo `vao` com `alinharSuperficie: true` e ajuste do encaixe da lanterna traseira.

## Excluído

- qualquer conhecimento de veículo no núcleo;
- alteração de malha em qualquer outra peça do acervo;
- mudança no território de `carro-fastback` (`2026-11-14-modelagem-de-carro.md`).

## Invariantes

- O núcleo continua 100% agnóstico a domínio e determinístico.
- Chamadas existentes de `faixaDeContornoNaRede` (sem `vao`) e de `gaiolaPorRede` preservam a mesma geometria.
- Aprovação visual final em pintura brilhante, zebra e encaixe do capô cabe à pessoa na bancada.

## Gate de saída

1. `faixaDeContornoNaRede` com `vao` e `anelDeAmortecimentoMm` gera malha limpa com `nRadial >= 2`, `0` faces órfãs e `0` avisos `cordaLongaEmTransicao` na fixture neutra, e emite `vaoEstreito` / `amortecimentoEstreito` quando o vão fica espremido.
2. `gaiolaPorRede` acusa `extraordinarioEmVinco`, `cordaLongaEmTransicao` e `desvioDeSuperficie` em testes unitários dedicados; `alinharSuperficie: true` reduz o desvio na superfície limite para `< 0,1 mm` sem alterar o relevo vincado; todos esses avisos ficam em `0` na `carro-quadrado/lataria`.
3. Em `carro-quadrado/lataria`, `L4` (vinco lateral) tem 0 vértices extraordinários, `desvioMaximoMm` na zona neutra fica `< 0,05 mm`, `L5` acompanha a borda do capô, `0` faces órfãs e `0` contatos acusados.
4. Provas visuais ampliadas na bancada (`solida`, `pintura` e `zebra` nos dois arcos + encaixe da lanterna traseira) inspecionadas pela IA e aprovadas pela pessoa; `planos:check`, `nome:check` e testes verdes.

## Fatias

1. Implementar `anelDeAmortecimentoMm`, `vao` e `cantos` em `faixaDeContornoNaRede` + testes na fixture neutra.
2. Implementar avisos `extraordinarioEmVinco` e `cordaLongaEmTransicao` em `gaiolaPorRede` + testes.
3. Implementar `retalho.superficie`, alinhamento progressivo `alinharSuperficie` (PIA) e guardas `desvioDeSuperficie` / `vaoEstreito` / `amortecimentoEstreito` + testes unitários.
4. Aplicar em `carro-quadrado/lataria` (faixa de apoio abaixo de `L4`, avaliador C1 bicúbico, preservação de `1550`/`1235`/`-1125`, modo `vao` + `alinharSuperficie: true` nos dois arcos e encaixe da lanterna traseira) e validar métricas + close-ups em `solida`, `pintura` e `zebra`.
5. Fechamento após aprovação visual da pessoa.

## Riscos e parada

Se manter as estações `1550`/`1235` em `L3..L6` com faixa de apoio gerar salto de densidade incompatível no sistema inteiro de `gaiolaPorRede`, parar na fatia 3 e apresentar o diagnóstico de `densidades` antes de alterar a topologia superior.

## Fechamento

Concluído em 2026-11-24 na branch `envio/carro-quadrado-forma`.

- Entregou em `procedural/nucleo/faixa-de-contorno-na-rede.js`: `anelDeAmortecimentoMm`, modo `vao`, `cantos` automáticos, herança de `superficie` no anel neutro e avisos `vaoEstreito` / `amortecimentoEstreito`.
- Entregou em `procedural/nucleo/gaiola-por-rede.js`: `retalho.superficie`, `alinharSuperficie` (interpolação progressiva / PIA na zona neutra + propagação automática de gradação entre curvas colineares) e avisos `extraordinarioEmVinco`, `cordaLongaEmTransicao`, `desvioDeSuperficie` e `gradacaoBrusca` entre curvas distintas (`165/165` testes verdes).
- Reescreveu `carro-quadrado/lataria` sem peça separada de arco (`desvioMaximoMm` na zona neutra reduzido de `1,439 mm` para `0,009 mm`, `23` corpos, `0` faces órfãs, `0` contatos) e criou a bancada isolada `procedural/pecas/carro-quadrado/partes/estudo-arcos/receita.js` com três opções de arco lado a lado.
- Na inspeção ortográfica em arame de `estudo-arcos`, a pessoa identificou que o leque de transição atual de `vao` cisalha as linhas horizontais para baixo ao cruzar a fronteira vertical e concentra mais subdivisões nas laterais do arco que no topo; essa evolução topológica do `vao` segue em plano próprio (`2026-11-24-topologia-ortogonal-de-vao-em-contorno.md`).

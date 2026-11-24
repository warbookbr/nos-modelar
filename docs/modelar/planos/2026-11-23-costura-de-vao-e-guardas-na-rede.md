# Costura automática de vão em faixaDeContornoNaRede e guardas de rede

**Estado:** ativo

**Território:** `procedural/nucleo/faixa-de-contorno-na-rede.js`, `procedural/nucleo/faixa-de-contorno-na-rede.test.mjs`, `procedural/nucleo/gaiola-por-rede.js`, `procedural/nucleo/gaiola-por-rede.test.mjs`, `procedural/nucleo/fixtures/faixa-de-contorno-prova.js`, `procedural/pecas/carro-quadrado/`

**Responsável:** IA da sessão implementa e mede; a pessoa julga pintura brilhante, zebra e encaixes na bancada.

**Repositório e base:** `warbookbr/nos-modelar`, branch `envio/carro-quadrado-forma` em 2026-11-23.

## Problema observado

Ao aplicar `faixaDeContornoNaRede` nos arcos de roda de `carro-quadrado/lataria` (`ac10d660`), a costura manual dos retalhos em volta da faixa produziu três classes de defeito visíveis em pintura brilhante e zebra:

1. Quatro vértices extraordinários de valência 5 caíram diretamente sobre o vinco `L3` (`e1_vinco`, `e2_vinco`, `e5_vinco`, `e6_vinco`), somados a um salto de altura de face (`112 mm` para `269 mm`), suavizando o vinco no para-lama e criando amassado junto à porta.
2. As ligações diagonais (`arcoD_ligF`, `arcoT_ligF`, `arcoT_ligT`, de `269` a `281 mm`) ficaram travadas em `divisoes = 1` por compartilharem o retalho de 4 lados com a soleira curta (`33 mm`), cortando por dentro do abaulamento lateral (`Curva 3`) e criando amassados diagonais na frente e na traseira; além disso, faltava um anel externo neutro de amortecimento após o vinco do arco.
3. A remoção das estações intermediárias `1550` e `1235` para abrir o vão único fez a spline Catmull-Rom de `L4`/`L5` afundar até `30,6 mm` abaixo da borda do capô.

O processo não pegou os dois primeiros defeitos sozinho: `gaiolaPorRede` listou `extraordinarios` e `densidades`, mas não emitiu aviso específico de polo sobre vinco nem de corda longa com `divisoes = 1` afundada em relação aos pontos-chave.

## Resultado

Uma receita encaixa qualquer relevo de contorno em um vão retangular de `gaiolaPorRede` em uma única chamada declarativa (`faixaDeContornoNaRede` com `vao` e `anelDeAmortecimentoMm`), sem travamento em `divisoes = 1`, sem polos valência 5 sobre vincos e com guardas automáticos em `gaiolaPorRede` (`extraordinarioEmVinco` e `cordaLongaEmTransicao`), provado na fixture neutra e em `carro-quadrado/lataria`.

## Filtro Agent-First

- `faixaDeContornoNaRede`: **REFATORAR** (extensão retrocompatível) — adicionar `anelDeAmortecimentoMm` (anel neutro externo isolando o estêncil da subdivisão), `vao` (gera `solF`/`solT`/`ligF`/`ligT` projetadas na superfície, retalhos de transição com `divisoes` radiais `>= 2` calculadas por `passoTransicaoMm` e lista `cantos` pronta) e diagnóstico explícito quando o contorno do vão entra sem folga.
- `gaiolaPorRede`: **ENVOLVER / GUARDAR** — emitir avisos diagnósticos `extraordinarioEmVinco` (polo de valência `!= 4` sobre curva com `vinco`) e `cordaLongaEmTransicao` (arco com `divisoes === 1` e flecha sagital `> 1 mm` contra os pontos-chave), sem alterar nenhuma malha existente do acervo.
- `subdivisao` e `aberturaPorContorno`: **USAR DIRETO** — nenhuma mudança necessária.

## Incluído

- `anelDeAmortecimentoMm`, `vao` e `cantos` em `procedural/nucleo/faixa-de-contorno-na-rede.js`, com testes em `faixa-de-contorno-na-rede.test.mjs` e fixture `faixa-de-contorno-prova.js`;
- avisos `extraordinarioEmVinco` e `cordaLongaEmTransicao` em `procedural/nucleo/gaiola-por-rede.js`, com testes em `gaiola-por-rede.test.mjs`;
- reescrita limpa de `carro-quadrado/lataria` (`chapa.js` e `receita.js`) com faixa de apoio uniforme abaixo de `L3`, preservação das estações superiores (`1550`, `1235`, `-1125`) alinhadas ao capô e costura dos dois arcos pelo modo `vao`.

## Excluído

- qualquer conhecimento de veículo no núcleo;
- alteração de malha em qualquer outra peça do acervo;
- mudança no território de `carro-fastback` (`2026-11-14-modelagem-de-carro.md`).

## Invariantes

- O núcleo continua 100% agnóstico a domínio e determinístico.
- Chamadas existentes de `faixaDeContornoNaRede` (sem `vao`) e de `gaiolaPorRede` preservam a mesma geometria.
- Aprovação visual final em pintura brilhante, zebra e encaixe do capô cabe à pessoa na bancada.

## Gate de saída

1. `faixaDeContornoNaRede` com `vao` e `anelDeAmortecimentoMm` gera malha limpa com `nRadial >= 2`, `0` faces órfãs e `0` avisos `cordaLongaEmTransicao` na fixture neutra.
2. `gaiolaPorRede` acusa `extraordinarioEmVinco` e `cordaLongaEmTransicao` em testes unitários dedicados, e ambos ficam em `0` na `carro-quadrado/lataria` após a reescrita.
3. Em `carro-quadrado/lataria`, `L3` tem 0 vértices extraordinários, `L5` acompanha a borda do capô com desvio `< 2 mm` ao longo de todo o comprimento (`1910` a `852 mm`), `0` faces órfãs e `0` contatos acusados.
4. Provas visuais na bancada (pintura brilhante, frente/capô e traseira) aprovadas pela pessoa; `planos:check`, `nome:check` e testes verdes.

## Fatias

1. Implementar `anelDeAmortecimentoMm`, `vao` e `cantos` em `faixaDeContornoNaRede` + testes na fixture neutra.
2. Implementar avisos `extraordinarioEmVinco` e `cordaLongaEmTransicao` em `gaiolaPorRede` + testes.
3. Aplicar em `carro-quadrado/lataria` (faixa de apoio abaixo de `L3`, preservação de `1550`/`1235`/`-1125` e modo `vao` nos dois arcos) e validar métricas + capturas na bancada.
4. Fechamento após aprovação visual da pessoa.

## Riscos e parada

Se manter as estações `1550`/`1235` em `L3..L6` com faixa de apoio gerar salto de densidade incompatível no sistema inteiro de `gaiolaPorRede`, parar na fatia 3 e apresentar o diagnóstico de `densidades` antes de alterar a topologia superior.

## Fechamento

Preencher somente ao concluir ou cancelar.

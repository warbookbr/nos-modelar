# Limites do sólido por laços — a coluna do braço sai pelos laços sem contorno à mão

**Estado:** ativo

**Território:** `procedural/nucleo/gaiola-por-lacos.js`, `procedural/nucleo/gaiola-por-lacos.test.ts`, `tools/fixtures/solido-por-lacos/`, `procedural/nucleo/operacoes/subdivisao.js`, `procedural/nucleo/uso-operacoes.js`, `docs/modelar/banco-de-provas/limites-do-solido-por-lacos-2026-11-05/`

**Responsável:** sessão de trabalho do furgão, a pedido da pessoa em 2026-11-05 ("vamos resolver o que der pra não ficar pendência")

**Repositório e base:** este repositório, a partir da main de 2026-11-05 com a coluna do braço refeita por `gaiolaPorLacos`

## Problema observado

A coluna do braço (`procedural/pecas/braco-robotico/partes/braco/receita.js`), refeita em 2026-11-05 como malha única pelo `gaiolaPorLacos` do [sólido por laços](encerrados/2026-11-05-solido-por-lacos.md) e aceita pela pessoa, precisou contornar cinco limites do ajudante, registrados pela sessão do braço no [backlog](BACKLOG.md) e trazidos para cá: o laço em cruz (cortado ao longo do eixo da coluna) dá quadrilátero de área zero na tampa, e a receita teve de cortar pelo eixo do pé e montar o encontro à mão; o plano da tampa não aceita a parede que coincide com ele, e a coluna entra 0,1 mm na face; o mínimo de 2,5 mm entre planos levou o chanfro do pé de 2 a 2,6 mm; o trecho que some e volta entre planos dá triângulo fino, e sem passo variável dentro de um trecho sai o aviso de amostragem desigual; e `compensar` nos planos junto da tampa empurra a peça 0,3 mm para fora. Fora do ajudante, `parte` numa malha única só recorta por caixa, e a parede da coluna abaixo do topo do pé ficou na parte do pé. O processo não pegaria nenhum: a peça de teste do plano do ajudante refaz o ombro, um L cortado num sentido só, sem encontro de dois cilindros, sem chanfro e sem trecho que some. O cotovelo é outro encontro de cilindros e bateria nos mesmos limites.

## Resultado

Uma peça de teste neutra com a forma da coluna (um disco e um cilindro que sobe dele, tangente às duas faces, com chanfro de 2 mm e filete no encontro) sai pelos laços cortados ao longo do eixo do cilindro, sem contorno à mão, com as medidas declaradas dentro de 0,5 mm, sem triângulo fino nem aviso, e com as duas partes separadas pela gaiola e não por caixa.

## Filtro Agent-First

- Os cinco limites: **REFATORAR** o ajudante onde o limite é dele (a tampa, a parede no plano da tampa, a distância entre planos, o passo dentro do trecho, a compensação junto da tampa), com recusa que diga o que fazer onde o limite continuar.
- A parte pela gaiola: **ENVOLVER** a saída que o passo `subdivisao` já publica por grupo (os grupos de faces da gaiola viram endereços da origem), para `parte` citar o grupo em vez de uma caixa.
- A coluna e o cotovelo: **ADIAR** para o plano do braço; a coluna aceita não muda neste plano.

## Incluído

- reproduzir cada limite numa peça de teste neutra em `tools/fixtures/solido-por-lacos/`, antes de corrigir;
- a correção de cada um no ajudante, ou a recusa com o motivo e o que fazer, quando a correção não couber;
- os grupos de faces da gaiola publicados pelo `subdivisao` para a seleção de parte;
- a ficha do ajudante e o banco de provas com as medidas de antes e depois.

## Excluído

- mudar a receita da coluna, do ombro ou do cotovelo;
- laço aberto e planos não paralelos.

## Gate de saída

1. Cada um dos cinco limites tem um teste que falhava antes e passa, ou uma recusa com mensagem útil testada.
2. A peça de teste da coluna sai fechada, sem triângulo sem área nem lasca, com o chanfro de 2 mm e o encontro dentro de 0,5 mm do declarado.
3. As peças de teste do ombro e da dobra em U saem iguais às de antes, ou com a diferença medida e explicada.
4. A pessoa vê a peça de teste da coluna em imagem.

## Fatias

1. Os casos que falham, um por limite, na peça de teste.
2. As correções no ajudante e os grupos no `subdivisao`.
3. A prova, a ficha e o banco de provas.
4. O fechamento.

## Riscos e parada

Se a tampa em cruz pedir triangulação geral de polígono côncavo dentro da gaiola de quadriláteros, ou se a distância entre planos não puder cair sem ondular, o limite fica como recusa com a medida e o plano registra por quê, em vez de crescer.

## Fechamento

Preencher somente ao concluir ou cancelar.

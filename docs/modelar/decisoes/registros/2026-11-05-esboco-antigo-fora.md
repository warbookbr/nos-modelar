# O esboço 2D antigo só se recria se voltar a haver objeto sem forma de referência

Estado: em vigor.
Decidido em: 2026-11-05.
Origem: `docs/modelar/historico/esboco-2d.md`, no commit `4bba1da1`.
Substitui: nada.

## O que ficou decidido
Em 2026-11-05, na fatia 4 do plano do esboço pelo núcleo, por decisão da pessoa, `modulos/esboco/` saiu (117 arquivos, 32 mil linhas). Ficaram o esboço 2.0 em `modulos/esboco-nucleo/` e as variantes de receita, com a regra de que a opção de forma sai das mesmas operações da peça e o que o núcleo não faz é recusado com o motivo. Saíram sem substituto o redesenho do conjunto de calibração do crítico, o Envelope do Condutor, a receita planejada, a expansão de componentes e a conferência de forma contra um `.esboco.json` qualquer. A origem dá `f9bfad3a` como última árvore com o módulo, mas esse hash não resolve neste clone; a última árvore com `modulos/esboco/` está em `9243e81f`, pai de `6364257d`, que o removeu.

## Por quê
O desenho promete formas que a peça pode não dar: no farol do furgão a pessoa escolheu a ponta em bico e o topo numa linha só, e a peça não as entregou, porque o vão segue as linhas da gaiola e a subdivisão arredonda os cantos. Dos 53 esboços de uso, os 13 posteriores a 2026-10-19 eram opções de forma de peça.

## Quando reabrir
Se voltar a haver objeto sem forma de referência e sem peça da qual variar; mesmo então as opções se escrevem pelo núcleo.

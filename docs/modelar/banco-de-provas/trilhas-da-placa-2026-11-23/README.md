# Trilhas da placa: a linha de base, as regras e a lista de exemplo

Evidência do plano das trilhas e validação da placa, ativado em 2026-11-23.

## Linha de base

O tempo de gerar cada placa como está, sem cobre traçado, medido por `executarReceita` em três execuções seguidas no mesmo processo: a placa de prova da família (`procedural/familias/componente-eletronico/placa-de-prova.js`, 15.182 faces) levou 6,3, 13,0 e 13,5 s, e a base do braço com a placa de controle (`procedural/pecas/braco-robotico/partes/base/receita.js`, 44.498 faces) levou 13,9, 14,4 e 13,4 s. O limite do item 4 do gate de saída fica em 28 s para a base com o cobre, o dobro da linha de base, como o plano propôs.

## Regras

As regras do cobre entraram em `PLACA` (`procedural/familias/componente-eletronico/placa.js`), com a fonte no comentário: trilha mínima de 0,15 mm e padrão de 0,25 mm, via com furo de 0,3 mm e anel de 0,15 mm, e a distância entre cobres (0,15 mm) e até a borda (0,3 mm) que as ilhas já usavam. A placa gera igual, porque nada lê esses campos ainda.

## A lista de exemplo

As duas listas estão no formato proposto para a mecatrônica em [`PROPOSTA-DO-ITEM.md`](PROPOSTA-DO-ITEM.md): a da placa de controle do braço em `procedural/pecas/braco-robotico/partes/base/placa.pedido.json`, com 47 redes e 143 terminais (12 V, terra, 5 V, o LED, a habilitação comum, e por junta o reinício, o passo, a direção e as quatro fases do motor), e a da placa de prova em `procedural/familias/componente-eletronico/cobre/placa-de-prova.pedido.json`, com 8 redes, uma delas entre componentes das duas faces. As funções dos pinos dos módulos e as larguras são suposições de exemplo, ditas no motivo do item. Cada terminal citado existe na placa e nenhum está em duas redes, conferido contra `terminaisDoComponente`.

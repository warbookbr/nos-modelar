# Componentes eletrônicos (2026-11-16): provas do gate de saída e limitações conhecidas

Este README guarda a prova de cada item do gate de saída do plano [família de componentes eletrônicos](../../decisoes/PLANOS-ENCERRADOS.md), conferidos em 2026-11-17 no commit 497c7b3b, e abaixo delas as limitações da reabertura de etapas.

## Item 1: a família no teste de família

`npx vitest run procedural/familias/componente-eletronico procedural/familias/familias.test.js` passou com 4 arquivos e 125 testes: 46 em `componente-eletronico.test.js` (cada encapsulamento no mínimo, no padrão e no máximo da faixa, malha fechada, medidas contra os parâmetros), 59 em `placa.test.js`, 7 em `placa-de-prova.test.js` e 13 em `familias.test.js`.

## Item 2: a prancha com os encapsulamentos

As imagens `fatia-1-prancha.png` e `fatia-2-prancha.png` foram aprovadas pela pessoa nas fatias 1 e 2.

## Item 3: a placa de prova

O teste `placa-de-prova.test.js` (7 testes, incluídos na contagem do item 1) gera a placa de 16 componentes sem passo sem efeito e com a malha fechada, uma parte por componente filha da placa, e confere que cada vértice de cada componente está onde a posição, o giro e o lado declarados levam o do componente gerado sozinho. A pessoa aprovou a imagem `fatia-3-placa-de-prova.png` em 2026-11-17 com "sobe a placa".

## Item 4: o braço robótico

A pessoa aprovou a placa de controle na caixa lateral da base, com a tampa fumê, a borda chanfrada e os parafusos de aço escuro (`fatia-4-tampa-com-parafusos.png`), em 2026-11-17, com "Esta boa sim, aprovada!". A guarda do acervo não conhece o nome `braco-robotico` sozinho (as peças têm o nome da pasta de `procedural/pecas/`), então `node tools/modelar/guardas/guarda-acervo.mjs braco-robotico` recusa com "não conheço braco-robotico". Rodada por peça, `guarda-acervo.mjs braco-robotico/<parte>` saiu com 0 nas treze partes (anel-antebraco, anel-cintura, anel-punho-4, anel-punho-5, anel-punho-6, antebraco, base, braco, elo-punho-4, elo-punho-5, flange, ombro, ombro-tambor), a base em 38 s, sem reprovação.

## Item 5: o retrato do acervo

`conferir-retrato-do-acervo` compara a execução rápida com a conferida e não serve a este item; o comando que compara duas versões do acervo é `node tools/modelar/retrato-do-acervo.mjs --gravar` e `--comparar`. A base foi a árvore do commit 497c7b3b com `procedural/pecas/braco-robotico/` e `procedural/familias/index.js` restaurados do commit 22e56f4f e a pasta `procedural/familias/componente-eletronico/` removida, porque o ramo da família já traz juntados os ramos irmãos do carro e da bicicleta, e uma base na main sozinha mostraria a mudança deles e não a deste plano (a primeira comparação, contra a main, mostrou a bicicleta-urbana e a lataria do carro mudadas por essa razão, e só elas além do braço). O retrato de 121 peças comparado dava: 120 peças iguais, e 1 com mudança, a `braco-robotico/base` (caixa mínima em x de -160 mm para -157,2 mm, volume 0,00980 para 0,00830 m³, faces 1072 para 44498, faces finas 0 para 356), que é o que a fatia 4 muda de propósito. Nenhuma outra peça mudou caixa, volume, área, faces ou partes.

## Item 6: a nota de uso

O catálogo de capacidades (`npm run catalogo:gerar`) é gerado do registro de operações e não lista famílias, então a nota não mora nele. A nota de uso da família está em [`eletronica.md`](../../../../.claude/skills/criar-peca/references/eletronica.md), referenciada pela skill `criar-peca` (seção Consulta) e por `guias/LEITURA-POR-TAREFA.md`.

## Limitações conhecidas da reabertura de etapas

Três limitações do registro de etapas ficaram conhecidas ao fim da revisão da reabertura (2026-11-17). Nenhuma delas deixa um comando fixar uma etapa sobre um encaixe mudado, mas a primeira deixa uma etapa que já estava fixa continuar lida como fixa sobre um encaixe que mudou depois. As três fecham no plano [etapas pela impressão do aceite](../../decisoes/PLANOS-ENCERRADOS.md).

Com uma etapa esvaziada (receita sem PASSOS) e o registro gravado nesse meio-tempo, a conferência pela medida da junta (C3) perde a referência: a etapa sem geometria mede juntas vazias, e o registro gravado passa a guardá-las no lugar das do aceite. Depois disso, no registro sem portas guardadas, a posterior que já estava fixa continua fixa se a porta da etapa citada mudar com a malha igual (ataques E2 da quinta revisão e N1 da sexta). A reabertura da etapa citada vê a mudança e recusa, então a leitura e a reabertura discordam, e nada se fixa por cima.

No registro sem portas guardadas, que é o de todo o acervo hoje, a etapa fixa esvaziada continua lida como fixa, porque não há porta de referência nem junta medida para comparar. A volta da receita com outra forma, ou com a medida da junta diferente, quebra a etapa; a volta idêntica não acusa nada, e é o resultado correto.

Uma instância tirada da montagem com o registro gravado nesse intervalo perde o histórico dela: devolvida, volta aberta e sem o aceite guardado, porque o registro novo só traz as etapas medidas (`atualizarRegistro` em `src/autoria/etapas-de-construcao.js`; ataque N2 da sexta revisão). Ela não volta fixa: fixá-la de novo pede ordem e aceite novos.

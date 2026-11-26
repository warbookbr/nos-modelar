# O processo leve, para objeto de uma família

Apoio da skill [`laco-de-modelagem`](SKILL.md). Leia quando o objeto for um perfil de uma família existente ou uma família nova de caixa com frente.

Medido nos aparelhos de caixa (2026-10-16): uma família que já cobre o objeto, com perfis, torna o laço completo desnecessário. Use o processo leve quando o objeto é um perfil de uma família existente, ou uma família nova de forma simples, de uma caixa com frente (porta, painel, botões, puxador, pés). Não o use quando o objeto exige geometria que nenhuma família tem, quando tem partes que se movem ou quando a pessoa pediu o laço completo.

O processo leve não depende de laço por unidade. Um `modelador` escreve a família e os perfis, o `critico-visual` cego olha uma prancha com os perfis lado a lado em uma ou duas rodadas, e o processo para na terceira rodada sem chegar a 8; o laço completo de uma peça vai até 6 rodadas, como diz a definição única em `docs/modelar/usar/REFERENCIA-E-CRITICA-VISUAL.md`. A forma continua sendo aprovada pela pessoa em imagem, com `npm run familia -- aprovar <id>`.

Ao mudar uma faixa ou uma opção da família depois da aprovação, o hash dos pontos extremos muda e a aprovação da pessoa se esvazia. Termine as mudanças de faixa antes de pedir o aceite, e peça o aceite uma vez só, com a prancha final.

O custo medido: a família levou cerca de 294 mil tokens (91 chamadas, 100 mil só de leitura), os ajustes depois da primeira prancha 285 mil, e os três perfis seguintes 184 mil (60 chamadas), contra 400 mil a 1,5 milhão por peça do avião. Quase todo o custo está na primeira família; cada perfil novo custa uma fração.

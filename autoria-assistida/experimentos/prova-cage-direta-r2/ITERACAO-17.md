# R2 — iteração 17: busca regional com envelope obrigatório

**Decisão:** aprovada; a melhor cage global medida passa a ser a desta rodada.

A calibração deixou de alterar a fonte a cada hipótese. `criarCageDireta`
aceita agora ajustes descartáveis em memória, e a comparação os mede antes de
qualquer promoção. A busca mantém como invariantes: quads, simetria, envelope
compilado de 2,00 m e ausência de regressão nos máximos das outras vistas.

Foram aprovados: ajuste de 10 mm no ombro dianteiro; estreitamento controlado
do ombro e expansão do flanco no anel dianteiro; redução do flanco da tampa
traseira; e a compensação entre o flanco da cabine traseira e o da anca. A
última dupla mantém o envelope exato e reduz a frontal sem reabrir a planta.

Contra a iteração 16, os máximos passam de 20,6/51,6/34,8 mm para
20,5/39,5/32,6 mm em lateral/planta/frontal. As médias finais são 8,3/15,4/
16,7 mm. A planta ainda é o maior resíduo; seus candidatos futuros devem ser
filtrados pelo envelope compilado em resolução final, pois a busca rápida não
é suficiente para aprovar máximos.

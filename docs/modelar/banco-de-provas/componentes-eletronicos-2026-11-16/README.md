# Componentes eletrônicos (2026-11-16): limitações conhecidas da reabertura de etapas

Três limitações do registro de etapas ficaram conhecidas ao fim da revisão da reabertura (2026-11-17). Nenhuma delas deixa um comando fixar uma etapa sobre um encaixe mudado, mas a primeira deixa uma etapa que já estava fixa continuar lida como fixa sobre um encaixe que mudou depois. As três fecham no plano [etapas pela impressão do aceite](../../planos/2026-11-17-etapas-pela-impressao-do-aceite.md).

Com uma etapa esvaziada (receita sem PASSOS) e o registro gravado nesse meio-tempo, a conferência pela medida da junta (C3) perde a referência: a etapa sem geometria mede juntas vazias, e o registro gravado passa a guardá-las no lugar das do aceite. Depois disso, no registro sem portas guardadas, a posterior que já estava fixa continua fixa se a porta da etapa citada mudar com a malha igual (ataques E2 da quinta revisão e N1 da sexta). A reabertura da etapa citada vê a mudança e recusa, então a leitura e a reabertura discordam, e nada se fixa por cima.

No registro sem portas guardadas, que é o de todo o acervo hoje, a etapa fixa esvaziada continua lida como fixa, porque não há porta de referência nem junta medida para comparar. A volta da receita com outra forma, ou com a medida da junta diferente, quebra a etapa; a volta idêntica não acusa nada, e é o resultado correto.

Uma instância tirada da montagem com o registro gravado nesse intervalo perde o histórico dela: devolvida, volta aberta e sem o aceite guardado, porque o registro novo só traz as etapas medidas (`atualizarRegistro` em `src/autoria/etapas-de-construcao.js`; ataque N2 da sexta revisão). Ela não volta fixa: fixá-la de novo pede ordem e aceite novos.

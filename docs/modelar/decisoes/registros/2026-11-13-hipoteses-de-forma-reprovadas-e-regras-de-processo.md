# As hipóteses de forma reprovadas em 38 falhas de autoria não voltam como base, e duas regras de processo valem antes de abrir experimento

Estado: em vigor.
Decidido em: 2026-11-13.
Origem: `docs/modelar/historico/REGISTRO-FALHAS-AUTORIA-V.md`, no commit `9437079b`.
Substitui: nada.

## O que ficou decidido
A origem não traz a data da decisão; vale a do último commit que a tocou, que é a da mudança de pasta, e as entradas citam datas de agosto de 2026. O registro marca como reprovadas e encerradas as hipóteses abaixo, e nenhuma volta como base de modelagem nova.

- V-01: seções de forma digitadas à mão (loft elíptico, três envelopes sobrepostos, cage direta, R2/R2B, cupê livre); cinco tentativas com a mesma assinatura, que não carrega intenção regional.
- V-02: loft ou envelope longitudinal como pele exterior; gera cápsula e acopla capô, ombro, teto e caixa de roda, e cage derivada de seções reintroduz a falha.
- V-04: mais polígonos; a densidade foi gasta em anéis, não em decisões de forma.
- V-09: suavização pós-modelagem; reduziu o P95 global só marginalmente, piorou a parcela abrupta e não deu ganho visual.
- V-17: a blocagem multivista N6.1, que repetiu a carroceria cápsula; nem malha fechada, nem teste, nem IoU autorizam reutilizá-la.
- V-22: interseção de silhuetas binárias, com IoU frontal 0,7645 e bloco escalonado sem leitura automotiva; a máscara dá ocupação, não arcos, cabine nem topologia.
- V-28: três vistas ortográficas não determinam a seção; 82% das estações ficam escondidas, duas famílias de vistas idênticas diferem 28 mm no flanco e a silhueta de prancha rasterizada tem cerca de 40 mm de ruído.
- V-30: trocar 80 coordenadas por 12 parâmetros chutados; mudou a quantidade, não o ato.
- V-36: esperar que a busca ache forma que o gerador não representa.

As duas regras de processo, ainda abertas na origem: V-31, varrer o registro antes de abrir experimento; V-32, não contornar por redação a condição de encerramento escrita antes.

## Por quê
Redescobrir o que já estava medido é a própria falha V-31: o canário de V-22 chegou a "silhueta não carrega topologia automotiva" por um caminho que V-28 já tinha medido. Em V-32, a saída por redação foi exatamente o mecanismo que a condição de encerramento existia para bloquear.

## Quando reabrir
Para V-32, a decisão de continuar precisa ser explícita e do usuário. Para V-22, o sucessor exige marcos semânticos regionais e patches contínuos de fronteira compartilhada; para V-36, um prior por família provado contra arquétipo holdout. Para as demais, a origem não dá condição.

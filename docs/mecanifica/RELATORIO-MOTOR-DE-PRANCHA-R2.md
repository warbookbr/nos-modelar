# Motor de Prancha — R2: contrato de autoria confiável

**Data:** 2026-08-20  
**Plano:** `2026-08-20-motor-de-prancha-autonomia.md`  
**Decisão:** aprovar o contrato mínimo e seguir para R3.

## Lacuna medida

R0 recusava vetor inválido, incoerência entre vistas, calibração ruim e comparação parcial. R1 mostrou que OpenCV, Potrace e Inkscape também não fornecem autoria: uma silhueta vetorizada não informa intenção, origem da medida, ambiguidade ou se é segura para orientar a geometria 3D. Logo o menor ganho verificável não é outro traçador; é tornar esses limites dados obrigatórios antes do render.

## Contrato escolhido

`mecanifica.prancha-autoria@1`, documentado em [`CONTRATO-AUTORIA-PRANCHA.md`](CONTRATO-AUTORIA-PRANCHA.md), acrescenta um bloco `autoria` à mesma especificação que já contém vetor, landmarks, cotas, envelope e leituras de vista. Ele exige:

- intenção curta, procedência tipada com evidência e IDs semânticos únicos;
- confiança declarada e lista explícita de incertezas, inclusive quando vazia;
- estado `pronta` ou `bloqueada`; bloqueio só é válido com confiança baixa e incerteza concreta de efeito `bloqueia`;
- modo `parcial` ou `quatro-vistas`; este último só vale quando as quatro vistas existem e todas têm camada desenhada.

O motor incorpora o estado ao relatório. Uma prancha bloqueada continua inspecionável, mas recebe alerta inequívoco de que não pode orientar modelagem precisa. Isso preserva o diagnóstico de referência insuficiente sem falsificar uma aprovação pela mera geração de SVG.

As relações de vistas não foram duplicadas no novo bloco: permanecem no contrato já executável de `vistas.leitura`, coerência por eixos e `envelope`. Landmarks e cotas também permanecem no dado que o motor mede. Duplicá-los criaria duas verdades para o mesmo ponto.

## Provas

`tools/mecanifica/prancha.test.mjs` agora cobre, além das proteções R0:

| Mutação | Resultado |
| --- | --- |
| remover `autoria` | recusa com causa |
| alegar quatro vistas omitindo uma | recusa |
| declarar quatro posições, mas não desenhar uma delas | recusa |
| referência sem escala independente | relatório bloqueado e alerta visível |

Os dois consumidores vivos foram migrados sem alteração geométrica: `prancha-chassi-p0.mjs` declara as medidas vinculantes P0; `prancha-cupe-cunha.mjs` declara o briefing ficcional e quatro vistas. Ambos continuam sem alertas de medida ou coerência.

## Limites

Confiança permanece uma declaração auditável, não uma inferência automática. O contrato ainda não prova autoria fria por outra IA nem o impacto em modelagem 3D; essas são, respectivamente, R4 e sua comparação vinculante. R3 tratará somente mecanismos que o corpus já demonstrar necessários.

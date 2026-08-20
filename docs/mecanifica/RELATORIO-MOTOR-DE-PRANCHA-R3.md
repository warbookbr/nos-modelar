# Motor de Prancha — R3: implementação e replay do corpus

**Data:** 2026-08-20
**Plano:** `2026-08-20-motor-de-prancha-autonomia.md`
**Decisão:** aprovar; não incorporar mecanismo externo nem validação adicional sem defeito que a justifique.

## Implementação selecionada

R1 rejeitou dependências externas para o caminho crítico. R2 implementou o único ganho que o corpus ainda não expressava como dado: autoria explícita, com procedência, confiança, incerteza e bloqueio. R3 reexecuta o corpus contra esse caminho integrado e encerra a escolha: não há segunda implementação a promover.

## Matriz executável

| Defeito R0 | Porta que decide | Resultado explícito |
| --- | --- | --- |
| contorno aberto | `prancha.test.mjs` / métrica | alertado |
| detalhe fora da silhueta | `prancha.test.mjs` / métrica | alertado |
| cúpula em lugar de filete | `prancha.test.mjs` / curvatura | alertado |
| discordância entre vistas | `prancha.test.mjs` / coerência | alertado |
| gravata auto-intersectante | `prancha.test.mjs` / métrica | alertado |
| coordenada `NaN` | `prancha.test.mjs` / contrato | recusado |
| camada em vista ausente | `prancha.test.mjs` / contrato | recusado |
| supressão sem motivo | `prancha.test.mjs` / métrica | alertado |
| calibração contraditória | `prancha-referencia.test.mjs` | recusado |
| sobreposição parcial | `prancha-referencia.test.mjs` | recusado |
| referência sem escala suficiente | `prancha.test.mjs` / autoria v1 | bloqueado e alertado |
| alegação vazia de quatro vistas | `prancha.test.mjs` / autoria v1 | recusado |

Os alertas não são aprovadores: impedem o estado “sem alertas”, que é a pré-condição operacional da skill antes de inspeção visual e crítica independente. Bloqueio não é recusa de SVG; preserva um artefato diagnosticável sem permitir que ele vire dimensão de uma modelagem precisa.

## Replay

```bash
npx vitest run tools/mecanifica/prancha.test.mjs tools/mecanifica/prancha-referencia.test.mjs
node tools/mecanifica/prancha-chassi-p0.mjs
node tools/mecanifica/prancha-cupe-cunha.mjs
```

O replay manteve os dois alvos sem alertas geométricos e sem alterar suas camadas, medidas, materiais ou câmera. A alteração da R2 é confinada à autoria e ao relatório.

## Limite e continuação

R3 não mede se outro agente, sem contexto, consegue criar e revisar uma prancha inédita, nem compara uma modelagem 3D orientada pelo alvo. Não há mecanismo honesto que substitua essas provas locais: ambas pertencem à R4. A próxima rodada precisa separar autor e revisor e usar só portas e documentação públicas. A evidência parcial da R4 está em [RELATORIO-MOTOR-DE-PRANCHA-R4.md](RELATORIO-MOTOR-DE-PRANCHA-R4.md) (`docs/mecanifica/RELATORIO-MOTOR-DE-PRANCHA-R4.md`).

# Capacidades candidatas ao NÓS

Este registro separa melhorias gerais do produto Mecanifica. Nenhuma entrada
autoriza implementação ou alteração no repositório original.

| Capacidade | Estado e prova | Arquivos | Limite |
|---|---|---|---|
| identidade semântica | entregue e exercitada em peças | `motor/oficina.js`, testes | não usa UUID ou índice salvo |
| partes e grupos | entregue na bancada | `motor/oficina.js`, `bancada.html` | montagem persistida fora |
| portas | entregue, 8 portas provadas | `guarda-portas-bancada.mjs` | grupo linear ainda sem endereço único |
| arranjo radial/linear | entregue em fixture | `arranja`, `_cerca-e-flor.js` | origem copia uma fonte |
| furo e centros | entregue em peças de prova | `_tampa-de-caixa.js`, `_flange-de-tubulacao.js` | não é booleana geral |
| orientação de seção | entregue em `loft` | `_corrimao.js`, núcleo | costura de `lathe` continua aberta |
| revisão visual | entregue em quatro vistas | `olhar-bancada.mjs` | `earcut` falha no servidor estático local |
| exportação resolvida | entregue e gateada | `exportar.mjs` | produto lê dados, não receita |
| consulta de subárvore | entregue na bancada | `descrever-peca.mjs`, testes | sem montagem persistida |
| materiais genéricos | futuro | backlog | não há contrato PBR ou paleta aberta |
| montagem/solver | futuro | planos concluídos e backlog | sem pose, contato ou solver persistidos |

Critério para uma contribuição: manter núcleo sem Three.js e domínio, fornecer
prova determinística, declarar limite e apontar o teste. O histórico de
experimentos está em `docs/mecanifica/historico/`.

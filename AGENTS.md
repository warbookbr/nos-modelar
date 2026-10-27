# Modelar — instruções para agentes

Comece pelo [`CLAUDE.md`](CLAUDE.md), o contrato mínimo que vale para qualquer
agente, e rode `npm run comecar -- <roteiro>`, que diz o que ler para a tarefa.
Não leia todo o histórico por padrão.

O trabalho dividido entre duas IAs neste repositório passa por
`comunicacao.md`. Decisões duráveis com `brigsd/nos-mecanifica` seguem
`docs/mecanifica/COORDENACAO-REPOS.md`.

## Fonte de verdade

- `docs/mecanifica/` governa o produto e seus contratos atuais.
- `docs/mecanifica/planos/README.md` governa o planejamento.
- `docs/nos-herdado/` é documentação herdada do NÓS e não autoriza
  implementação.
- Em divergência, `docs/mecanifica/` prevalece.

## Fronteiras e qualidade

O que o `CLAUDE.md` e os roteiros dizem vale aqui e não se repete. Além disso:
confira peças na bancada em mais de um enquadramento, e não altere
comportamento, geometria, materiais ou câmera sem escopo explícito.

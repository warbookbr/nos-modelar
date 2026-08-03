# Planos da Mecanifica

Este é o índice de planejamento. Ele separa decisão de produto, execução e
histórico para que um roteiro não cresça indefinidamente.

## Estado atual

**Plano ativo:** nenhum.

`AUT-2026-11`/Recorte F foi concluído em
[`AUT-2026-11`](2026-08-02-assentamento-anular.md): aro↔pneu passa a declarar
e medir faixa anular local, mantendo o alerta amplo por caixa. Deformação,
pressão e colisão de sólidos continuam fora do backlog executável.

`AUT-2026-10`/Recorte E foi concluído em
[`AUT-2026-10`](2026-08-02-contato-local-cilindrico.md): contato cilíndrico
local e alerta amplo por caixa aparecem juntos, sem declarar colisão exata de
sólidos. Cavidade anular aro/pneu e outras naturezas continuam no backlog.

`AUT-09`/Recorte D foi concluído em
[`AUT-2026-09`](2026-08-02-estados-de-encaixe.md): estados explícitos de encaixe
cilíndrico para a IA, antes de ampliar a geometria de colisão.

`AUT-08`/Recorte C foi concluído em
[`AUT-2026-08`](2026-08-02-pose-em-referencial.md): composição local/mundo em
referencial técnico rígido, sem abrir hierarquia.

`AUT-07`/Recorte B foi concluído em
[`AUT-2026-07`](2026-08-02-pose-derivada-roda.md): prévia pura e única de pose
para roda/cubo e pino/luva, por quadro e relação explicitamente declarados.

`AUT-06`/A-16 e `PEC-01` foram concluídos em
[`AUT-2026-06`](2026-08-02-interfaces-de-encaixe.md): interfaces cilíndricas
mensuráveis e `encaixaCilindrico` dirigido, apenas read-only. Pose derivada,
hierarquia e solucionador continuam fora do recorte.

`AUT-06`/A-1 foi concluído em
[`AUT-2026-05`](2026-08-02-camera-livre-reproduzivel.md), caminho canônico
`docs/mecanifica/planos/2026-08-02-camera-livre-reproduzivel.md`.

`AUT-02`/A-37 foi concluído em
[`AUT-2026-04`](2026-08-02-canto-composto.md), caminho canônico
`docs/mecanifica/planos/2026-08-02-canto-composto.md`.

`AUT-03`/A-33 foi concluído em
[`AUT-2026-03`](2026-08-02-triangulacao-de-furos.md), caminho canônico
`docs/mecanifica/planos/2026-08-02-triangulacao-de-furos.md`.

`AUT-04`/A-35 foi concluído em
[`AUT-2026-02`](2026-08-02-concordancia-por-ponto.md), caminho canônico
`docs/mecanifica/planos/2026-08-02-concordancia-por-ponto.md`. O `AUT-01` já foi
concluído em [`AUT-2026-01`](2026-08-02-contagem-por-desvio.md), caminho
`docs/mecanifica/planos/2026-08-02-contagem-por-desvio.md`.

O plano mestre anterior foi encerrado em
[`ENCERRAMENTO-PLANO-MESTRE-2026-08-02.md`](ENCERRAMENTO-PLANO-MESTRE-2026-08-02.md).

## Contrato de um plano

Cada plano:

1. resolve **um resultado**, não uma fase inteira do produto;
2. tem escopo incluído, escopo excluído e gate de saída antes de ficar ativo;
3. contém no máximo 10 fatias e 200 linhas;
4. aponta para medições e registros existentes, sem copiá-los integralmente;
5. não mistura backlog, diário de execução nem documentação permanente;
6. não cresce depois de ativado: descoberta não bloqueante volta ao backlog;
7. termina como `concluído` ou `cancelado`, com evidência e destino de sobras;
8. nunca deixa mais de um plano ativo neste índice.

Use [`MODELO.md`](MODELO.md) para abrir um plano. Nomeie o arquivo como
`AAAA-MM-DD-resultado-curto.md` e use um identificador estável independente dos
IDs de atrito, por exemplo `AUT-2026-01` ou `PROD-2026-01`.

## Estados permitidos

| Estado | Significado |
|---|---|
| `rascunho` | ainda pode mudar e não autoriza implementação |
| `pronto` | escopo e gate revisados, aguardando decisão de início |
| `ativo` | único plano que autoriza execução |
| `concluído` | gate atendido; o arquivo não volta a crescer |
| `cancelado` | premissa ou prioridade perdeu validade; motivo registrado |

## Fluxo

1. escolher um candidato ou registrar evidência nova;
2. preencher o modelo como `rascunho`;
3. revisar dependências, risco e orçamento;
4. obter decisão explícita e marcar um único plano como `ativo` aqui;
5. executar apenas as fatias incluídas;
6. validar o gate, registrar o fechamento e remover o plano da posição ativa;
7. devolver descobertas futuras ao backlog sem reabrir o plano.

Planos concluídos ou cancelados permanecem versionados para explicar decisões,
mas saem da leitura obrigatória de agentes novos.

O CI executa `npm run planos:check`: ele recusa mais de um plano ativo, índice
divergente, estado inválido e qualquer plano executivo acima de 200 linhas.

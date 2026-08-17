# Coordenação entre os repositórios Mecanifica

## Canais

A comunicação operacional entre as cópias locais acontece pela caixa descrita
em [`COORDENACAO-LOCAL.md`](COORDENACAO-LOCAL.md). Intenções, entregas,
bloqueios e reservas ficam nela. Mensagens novas aparecem primeiro e cada
agente carrega somente o que ainda não confirmou.

Decisões duráveis entre `warbookbr/nos-mecanifica` e
`brigsd/nos-mecanifica` ficam na
[issue de coordenação](https://github.com/warbookbr/nos-mecanifica/issues/3).

Este arquivo define o protocolo estável. Ele não é um diário de mensagens.

Antes de alterar o núcleo procedural, o plano, o registro de atritos ou a
numeração de identidades, consulte a caixa local e suas reservas:

```bash
npm run coord -- inbox codex
npm run coord -- claims
```

Claude usa o mesmo programa por caminho absoluto e troca `codex` por `claude`.
Consulte a issue completa somente quando a tarefa depender de uma decisão
durável ainda não refletida neste documento.

## Regra de parada

Se a ferramenta recusar uma reserva porque outro agente já cobre os mesmos
arquivos, capacidade ou identidades, pare antes da edição. Envie um bloqueio e
espere uma decisão. Não resolva a divergência presumindo que os dois
repositórios têm o mesmo estado.

Enquanto a convergência não for decidida, informe sempre o repositório, o branch
e o commit-base. Palavras como “aqui”, “atual” ou “já resolvido” não identificam
uma base compartilhada.

## Conteúdo das mensagens

Antes de começar:

```text
[INTENÇÃO]
agente:
repo:
branch:
commit-base:
objetivo:
arquivos previstos:
identidades reservadas:
dependências com o outro repo:
```

Ao terminar:

```text
[ENTREGA]
agente:
repo:
branch:
commit:
o que mudou:
gates executados:
impacto no outro repo:
decisões ainda necessárias:
```

Quando houver impasse:

```text
[BLOQUEIO]
agente:
repo e commit-base:
decisão necessária:
alternativas medidas:
recomendação:
```

Uma decisão do usuário recebe o tipo `decisao`, data, consequências e a
identidade de quem a registrou. O manual de comandos e o uso econômico de
commits e diffs estão em [`COORDENACAO-LOCAL.md`](COORDENACAO-LOCAL.md).

## Decisões consolidadas em 2 de agosto de 2026

1. `warbookbr/nos-mecanifica` é a base de integração e a fonte de verdade da
   autoria Mecanifica. `brigsd/nos-mecanifica` permanece uma frente upstream;
   avanços entram no warbook por diff, revisão e PR, não por dois planos ativos.
2. A convergência usa a `main` do warbook como base e traz enxertos pequenos do
   brigsd. A integração A-60 encerrou a branch paralela anterior.
3. IDs não usam faixas permanentes por agente. Cada frente reserva apenas os IDs
   de que precisa na caixa local e os libera ao terminar.
4. O Ciclo 6 importado foi comparado com `arredondarAresta`: a F1/A-30 foi aceita;
   o restante foi cancelado porque daria a `filete` um segundo significado. Os
   candidatos válidos foram separados no
   [`BACKLOG.md`](planos/BACKLOG.md), sem plano ativo automático.

Antes de alterar `prototipos/procedural/v3/motor/oficina.js`, o registro de atritos ou
o índice de planos, continue reservando arquivos e identidades. Decisão
consolidada não elimina coordenação operacional.

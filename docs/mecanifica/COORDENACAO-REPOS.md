# Coordenação entre os repositórios Mecanifica

## Canais

A caixa postal local entre agentes (`npm run coord`) saiu em 2026-10-08, sem
uso. O trabalho dividido entre duas IAs neste repositório passa por
`comunicacao.md`, com uma tarefa por seção.

Decisões duráveis entre `warbookbr/nos-mecanifica` e
`brigsd/nos-mecanifica` ficam na
[issue de coordenação](https://github.com/warbookbr/nos-mecanifica/issues/3).

Este arquivo define o protocolo estável. Ele não é um diário de mensagens.

Consulte a issue completa somente quando a tarefa depender de uma decisão
durável ainda não refletida neste documento.

## Regra de parada

Se outra frente já cobre os mesmos arquivos, capacidade ou identidades, pare
antes da edição. Registre um bloqueio e espere uma decisão. Não resolva a divergência presumindo que os dois
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
identidade de quem a registrou.

## Decisões consolidadas em 2 de agosto de 2026

1. `warbookbr/nos-mecanifica` é a base de integração e a fonte de verdade da
   autoria Mecanifica. `brigsd/nos-mecanifica` permanece uma frente upstream;
   avanços entram no warbook por diff, revisão e PR, não por dois planos ativos.
2. A convergência usa a `main` do warbook como base e traz enxertos pequenos do
   brigsd. A integração A-60 encerrou a branch paralela anterior.
3. IDs não usam faixas permanentes por agente. Cada frente reserva apenas os IDs
   de que precisa e os libera ao terminar (a reserva era feita na caixa
   local, que saiu em 2026-10-08).
4. O Ciclo 6 importado foi comparado com `arredondarAresta`: a F1/A-30 foi aceita;
   o restante foi cancelado porque daria a `filete` um segundo significado. Os
   candidatos válidos foram separados no
   [`BACKLOG.md`](planos/BACKLOG.md), sem plano ativo automático.

Decisão consolidada não elimina coordenação operacional: antes de alterar
`procedural/nucleo/oficina.js`, o registro de atritos ou o índice de planos em
paralelo com outra frente, combine os arquivos e as identidades pelo canal em
uso.

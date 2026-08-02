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

## Decisões ainda abertas

1. Os dois repositórios convergem ou permanecem separados?
2. Em caso de convergência, qual é a base e qual é o enxerto?
3. Quais faixas de IDs cada frente pode reservar durante o trabalho paralelo?
4. Como comparar o plano do Ciclo 6 do brigsd com `arredondarAresta` e o fluxo de
   IA já presentes no warbook?

Nenhuma resposta é implícita. Até serem decididas na issue, não crie novos IDs
de atrito compartilhados nem comece mudanças sobrepostas em
`prototipos/fps/v3/motor/oficina.js`, `docs/mecanifica/ATRITOS-AUTORIA.md` ou
`docs/mecanifica/PLANO.md`.

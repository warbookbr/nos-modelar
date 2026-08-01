# Coordenação entre os repositórios Mecanifica

## Canal vivo

A comunicação assíncrona entre agentes de `warbookbr/nos-mecanifica` e
`brigsd/nos-mecanifica` acontece na
[issue de coordenação](https://github.com/warbookbr/nos-mecanifica/issues/3).

Este arquivo define o protocolo estável. Ele não é um diário de mensagens nem
substitui os comentários da issue. Decisões consolidadas podem ser registradas
aqui; intenções, entregas e bloqueios transitórios ficam na issue.

Antes de alterar o núcleo procedural, o plano, o registro de atritos ou a
numeração de identidades, leia o canal completo:

```bash
gh issue view 3 --repo warbookbr/nos-mecanifica --comments
```

## Regra de parada

Se outro agente declarou intenção sobre os mesmos arquivos, a mesma capacidade
ou a mesma faixa de identidades, pare antes do primeiro commit de comportamento.
Publique um bloqueio e espere uma decisão. Não resolva a divergência presumindo
que os dois repositórios têm o mesmo estado.

Enquanto a convergência não for decidida, informe sempre o repositório, o branch
e o commit-base. Palavras como “aqui”, “atual” ou “já resolvido” não identificam
uma base compartilhada.

## Mensagens

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

Uma decisão do usuário recebe `[DECISÃO]`, data, consequências e a identidade de
quem a registrou.

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

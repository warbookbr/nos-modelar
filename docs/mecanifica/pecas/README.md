# Referência por peça

Uma folha por peça que já existe: convenção de eixos, o que cada parâmetro
controla e onde cada parte fica. Serve para outra sessão mexer na peça sem
reabrir a bancada só para descobrir a convenção.

Isto não é nem regra de uso nem doutrina de desenvolvimento, e é por isso que
tem pasta própria:

- `../usar/` guarda o que vale para **qualquer** tarefa. Uma folha destas vale
  só se você tocar naquela peça.
- A raiz de `../` é a área de desenvolvimento. Folha de peça não é
  desenvolvimento; é o manual de um artefato pronto.

Uma folha aqui **não** é citada por skill, e não deveria ser: skill é genérica,
e mandar `criar-peca` ler a folha do freio dianteiro seria dobrar a skill ao
conteúdo. Ela é consultada quando a peça em questão entra na tarefa.

## Folhas existentes

| peça | receita | folha |
| --- | --- | --- |
| freio a disco dianteiro | `prototipos/procedural/v3/pecas/freio-disco.js` | [`PRANCHA-FREIO-DISCO.md`](PRANCHA-FREIO-DISCO.md) |
| roda dianteira | `prototipos/procedural/v3/pecas/roda-dianteira.js` | [`PRANCHA-RODA-DIANTEIRA.md`](PRANCHA-RODA-DIANTEIRA.md) |

As duas usam a mesma convenção de eixos, definida na folha do freio: `X` é o
eixo da roda, `Y` é raio a partir da linha de centro, `Z` é tangente. Tudo em
metros.

## Regra de arquivo

Uma folha nova nasce junto com a peça que ela documenta, aponta a receita pelo
caminho, e declara a convenção de eixos ou diz de qual folha a herda. PNG de
vista não é versionado: é evidência regenerável, e cada vista traz o comando
que a reproduz.

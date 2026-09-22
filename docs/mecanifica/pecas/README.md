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

## Não há folha aqui hoje

As duas que existiam, do freio a disco dianteiro e da roda dianteira, saíram em
2026-09-22 junto com a pasta ficar sem assunto: as receitas que elas descreviam
foram apagadas em `c78961f6`, e desde então elas apontavam para arquivos que não
existem.

Elas não eram só texto velho. As duas declaravam que `X` é o eixo da roda, `Y` é
raio a partir da linha de centro e `Z` é tangente, com tudo em metros. A
convenção do acervo é outra: `y` é a vertical, o chão fica em `y = 0`, a
`TABELA` é medida em milímetros e a conversão acontece num lugar só. Quem lesse
uma dessas folhas para descobrir a convenção adotaria o referencial errado, que
foi exatamente como uma peça inteira saiu deitada no chão passando em todas as
medidas. Folha de peça apagada é referencial solto esperando alguém.

## Regra de arquivo

Uma folha nova nasce junto com a peça que ela documenta, aponta a receita pelo
caminho, e declara a convenção de eixos ou diz de qual folha a herda. Ela sai
junto com a peça: folha sem receita descreve uma peça que ninguém pode abrir, e
a convenção que ela declara continua valendo para quem ler. PNG de
vista não é versionado: é evidência regenerável, e cada vista traz o comando
que a reproduz.

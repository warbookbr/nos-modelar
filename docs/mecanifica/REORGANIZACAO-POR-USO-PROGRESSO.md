# Reorganização por uso — progresso

Documento auxiliar do plano
[`planos/2026-08-31-reorganizacao-por-uso.md`](planos/2026-08-31-reorganizacao-por-uso.md).
Ele existe porque o plano cabe em 200 linhas e o rastreio das fases não. Aqui
ficam o retrato de antes, o estado de cada fase e as decisões tomadas durante a
execução.

## Estado das fases

| fase | o que faz | estado |
| --- | --- | --- |
| F0 | medir antes de mexer | concluída |
| F1 | histórico para fora do caminho | concluída |
| F2 | criar `usar/` e a porta curta | pendente |
| F3 | gates G1, G3, G4, G5 e G7 | pendente |
| F4 | roteamento no `CLAUDE.md` e fusão dos gotchas | pendente |
| F5 | decidir sobre a pasta `desenvolver/` | pendente |

## F0 — retrato antes de mexer

Medido sobre a `main` em `4ba6703`, antes de qualquer alteração.

### Acervo

| categoria | quantidade |
| --- | --- |
| documentos em `docs/mecanifica/` | 81 |
| deles, citados pelas cinco skills de uso | 8 |
| relatórios encerrados (`RELATORIO-*` e equivalentes) | 27 |
| candidatos a `usar/` por nome | 14 |
| restante, de desenvolvimento | 42 |
| planos no total | 51 |
| planos concluídos ou cancelados | 43 |
| já em `historico/` | 5 |

### Custo de leitura obrigatório hoje

`CLAUDE.md` manda ler `INDEX.md` (635 linhas) e `planos/README.md` (327 linhas)
antes de planejar: **962 linhas**, e o INDEX aponta para 158 documentos.

### Raio de impacto da F1

O número bruto assusta e é enganoso; o número que importa é o último.

| medida | valor |
| --- | --- |
| menções brutas a documentos históricos | 147 |
| arquivos que os citam | 95 |
| arquivos **vivos** que os citam | 28 |
| deles, planos encerrados que se movem junto | 16 |
| **arquivos que realmente precisam de correção** | **12** |
| citações a **relatórios** em código, teste ou fixture | **0** |
| citações a **planos** em código (comentário) | 1 |

A última linha foi medida depois, na F1, e corrige uma afirmação ampla demais
que eu tinha feito aqui: a varredura original cobriu só os relatórios. A única
citação em código é um comentário em `tools/mecanifica/prancha.mjs`, que não lê
o arquivo.

Com isso, a condição de parada do plano — que dispara se a mudança exigir
reescrever código ou evidência encerrada — continua não disparando. Esta
reorganização é documental.

### Gates antes da mudança

`mapa:check`, `docs:links:check`, `docs:toc:check`, `typecheck`,
`arquitetura:check`, `catalogo:check`, `exportar:check`, `bancada:vazia:check` e
`planos:check` estavam verdes na `main` em `4ba6703`. A suíte fechava com 1344
testes.

### Defeito encontrado durante a medição

`planos:check` lê a pasta de planos com `readdirSync` sem recursão. Qualquer
plano movido para uma subpasta deixa de ter estado e limite de linhas
conferidos — some do gate em vez de ser guardado por ele. A pasta `congelados/`
já vinha se apoiando nisso. G4 corrige.

## F1 — histórico para fora do caminho

Movidos 27 relatórios encerrados para `historico/`, que passou de 5 para 33
arquivos, e 43 planos concluídos ou cancelados para `planos/encerrados/`. A
pasta de planos foi de 51 para 5 arquivos de plano mais índice, modelo e
backlog.

### Correção do número da F0

A F0 afirmou **zero** citações em código. O número estava certo para os
relatórios e **errado como afirmação geral**: medi só o grupo histórico, não os
planos. Existe uma citação em código — um comentário em
`tools/mecanifica/prancha.mjs` apontando para o caminho de um plano. É
comentário, não leitura de arquivo, então a condição de parada continua não
disparando; mas a afirmação ampla era minha, não do dado.

### O que quebrou e como foi corrigido

| medida | valor |
| --- | --- |
| referências absolutas quebradas | 84, em 12 arquivos |
| links relativos quebrados pela mudança | 159 |
| links relativos já quebrados antes, na `main` | 26 |
| corrigidos automaticamente | 171 |
| corrigidos por regra de nível (`../` → `../../`) | 12 |
| quebrados ao final | 2, ambos anteriores e intocáveis |

Os 12 arquivos de referência absoluta batem com a previsão da F0. Os dois que
restam vivem em `docs/historico/` de topo, que é registro imutável por regra do
repositório: reescrever caminho ali seria editar histórico.

### Lacuna encontrada no gate de links

`docs:links:check` só confere caminhos no formato `docs/<...>.md`. Ele **não vê
link relativo de markdown**, que é a forma que a maioria dos documentos usa.
Prova: a `main` já carregava **26 links relativos quebrados** com todos os gates
verdes, e a minha própria mudança passou no gate com 159 links quebrados antes
de eu medir por fora.

Isso vira **G7** na F3: alcançabilidade e resolução exata também para link
relativo. Sem ele, metade das citações do repositório não é conferida por
ninguém — e o gate transmite uma confiança que não tem.

### Terceiro teste lento

`rejeicoes-p0.test.mjs` estourou os 5 s padrão sob carga, como já havia
acontecido com o canário do casco e a exportação STEP. Não tem relação com esta
mudança: é o mesmo defeito latente aparecendo conforme a suíte cresce. Tempo
declarado com o motivo, isolado em ~9,8 s.

## Decisões tomadas durante a execução

Registradas aqui na hora, para que a razão não se perca.

### D1 — a raiz vira a área de desenvolvimento, em vez de uma pasta `desenvolver/`

O usuário pediu três pastas. Troquei uma delas pela raiz de `docs/mecanifica/`.
Motivo: mover os 42 documentos de desenvolvimento concentra a maior parte do
risco de link quebrado sem mudar nada da exposição, já que quem desenvolve entra
pelo `INDEX.md` de qualquer jeito. O ganho que o usuário quer — a IA que só usa
ver pouca coisa — vem inteiro de `usar/` e de tirar o histórico do caminho.

A F5 reavalia com o custo medido, e as duas saídas são conclusão válida:
executar a pasta, ou recusar com o número na mão.

### D2 — o congelamento do modelador inverso veio da branch, sem o link para o substituto

O plano congelado foi escrito na branch `claude/revisar-plano-ativo-cyj8c3` e
apontava para o plano que o substituiu, que ainda não existe na `main`. Trouxe o
documento inteiro e troquei só essa linha por uma frase que diz onde o
substituto vive. Reescrever a razão do congelamento seria falsificar registro: a
decisão é de 2026-08-26 e continua sendo essa.

## Lista de fronteira — decisão do usuário, não minha

Preenchida na F2. Documentos cuja pasta é discutível não são movidos por decisão
minha; entram aqui com recomendação, e o usuário decide.

| documento | recomendação | por quê |
| --- | --- | --- |
| a preencher na F2 | | |

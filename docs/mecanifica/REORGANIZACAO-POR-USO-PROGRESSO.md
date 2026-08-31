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
| F1 | histórico para fora do caminho | pendente |
| F2 | criar `usar/` e a porta curta | pendente |
| F3 | gates G1, G3, G4 e G5 | pendente |
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
| citações em código, teste ou fixture | **0** |

O zero na última linha é o resultado mais importante da F0: a condição de parada
do plano dispara se a mudança exigir reescrever código ou evidência encerrada, e
ela não dispara. Esta reorganização é integralmente documental.

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

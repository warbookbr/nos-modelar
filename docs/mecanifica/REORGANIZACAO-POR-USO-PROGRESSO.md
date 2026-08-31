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
| F2 | criar `usar/` e a porta curta | concluída |
| F3 | gates G1, G3, G4, G5 e G7 | concluída |
| F4 | roteamento no `CLAUDE.md` e fusão dos gotchas | pendente |
| F5 | decidir sobre a pasta `desenvolver/` | pendente |
| F6 | encurtar o INDEX de 665 para 200 linhas | pendente, criada na F3 |

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

## F2 — a pasta de uso

Criada `docs/mecanifica/usar/` com seis documentos e uma porta de 41 linhas. A
raiz caiu de 81 para 51 documentos.

O órfão foi fechado: `GOTCHAS-AUTORIA-VISUAL.md` era declarado leitura
obrigatória e nenhuma skill apontava para ele. Agora `criar-peca` e
`modelar-maquina` mandam lê-lo antes de gerar a primeira forma, cada uma
citando os gotchas que mais pegam o seu tipo de objeto.

### O G1 classificou antes de existir

Testei os seis candidatos contra a regra do G1 — documento de uso não cita
documento de desenvolvimento — antes de escrever o gate. Quatro passaram
limpos. Dois acusaram, e os dois acusaram **certo**:

- `METODO-DIAGNOSTICO-E-SEU-LIMITE.md` cita um plano concluído;
- `GOTCHAS-AUTORIA-VISUAL.md` cita `ATRITOS-AUTORIA.md`, que é documento de
  desenvolvimento.

Nos dois casos a citação é de **evidência**, não de autoridade: apontam onde a
prova está, não onde a regra mora. Isso mudou o desenho do G1 antes de eu
implementá-lo — ver D3.

## F3 — os gates que seguram

Entraram `G1`, `G3` e `G5` em `tools/mapa/estrutura-docs.mjs`
(`npm run docs:estrutura:check`), `G4` dentro de `planos.mjs` e `G7` dentro de
`links.mjs`. Todos no CI.

Cada um foi visto **vermelho antes de verde**, em sete casos de teste que
montam um repositório de mentira e disparam a regra de propósito.

### O que os gates acharam ao serem ligados

| gate | achado |
| --- | --- |
| G4 | `planos:check` conferia 5 planos; agora confere **68**. Os 63 em subpasta estavam invisíveis ao gate, sem conferência de estado nem de limite de linhas. |
| G5 | O `INDEX.md` tem **665 linhas** contra o teto de 200 que o próprio plano escreveu. |
| G7 | Já descrito na F1: 26 links relativos quebrados passavam com todos os gates verdes. |

### O defeito que o teste achou em mim

A primeira versão de `estrutura-docs.mjs` derivava a raiz do repositório da
localização do próprio script. Resultado: rodar a ferramenta apontada para
outro diretório continuava analisando o repositório real, e os **quatro casos
que deveriam reprovar passaram em verde**.

Se eu tivesse escrito só o caso positivo, teria entregado um gate que não
consegue reprovar nada e não teria como saber. A raiz virou parâmetro
(`--raiz=`), que é o que torna o gate testável.

### D4 — o teto do INDEX vira catraca, e não número afrouxado

O G5 nasceu reprovando o `INDEX.md`: 665 linhas contra 200. Três saídas, e duas
são mentira.

Afrouxar o teto para 700 finge conformidade e mata o gate. Deixar em 200
mantém o CI vermelho por uma dívida conhecida, e CI cronicamente vermelho para
de ser sinal. A terceira é a catraca: o teto fica no tamanho atual e o gate
impede a porta de **crescer** — que é exatamente como ela chegou a 665
apontando para 158 documentos.

Encurtar de verdade é mover narrativa de plano encerrado para fora do INDEX, o
que é trabalho de conteúdo, não de número. Virou a fatia **F6**, e ao fechá-la
o teto cai para 200.

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

### D3 — o G1 proíbe por padrão, com allowlist fechada e motivo escrito

A F2 mostrou que a regra crua do G1 reprovaria duas citações legítimas de
evidência. Duas saídas ruins: afrouxar o gate até ele não pegar nada, ou apagar
ponteiro bom para agradar o gate.

O G1 passa a proibir por padrão e aceitar exceção só por **allowlist fechada,
com par arquivo→destino e motivo escrito** — exatamente o padrão que
`tools/mapa/links.mjs` já usa. Sem glob, sem exceção por diretório. Assim cada
vazamento custa uma linha e uma justificativa que alguém vai ler depois, em vez
de passar despercebido.

## Lista de fronteira — decisão do usuário, não minha

Estes documentos ficaram na raiz, ou seja, contam como desenvolvimento. Não os
movi porque a classificação é discutível e a decisão é sua. Nada quebra se
ficarem como estão; mover depois é `git mv` mais correção de links.

| documento | minha recomendação | por quê |
| --- | --- | --- |
| `AUTORIA-IA.md` (667 linhas) | **dividir**, não mover | Descreve como a IA autora, o que é uso, mas também justifica decisões de projeto, o que é desenvolvimento. Do jeito que está, ir inteiro para `usar/` levaria material que quem usa não precisa. |
| `GOTCHAS-MODELAGEM-PROCEDURAL.md` | fundir na F4 e ir para `usar/` | Repete 7 dos 12 achados do outro registro. Manter os dois é garantir que alguém leia metade. |
| `PRANCHA-FREIO-DISCO.md`, `PRANCHA-RODA-DIANTEIRA.md` | mover para `usar/` | Parecem exemplo aplicado do contrato de prancha, e exemplo serve a quem usa. Não movi porque nenhuma skill os cita, então o G3 os acusaria de órfãos — a decisão real é se a skill deve citá-los. |
| `MONTAGENS-SEMANTICAS.md` | mover para `usar/` | É contrato que `auditar-montagem` aplica. Mesma pendência de citação que os anteriores. |
| `CONTRATO-ACEITE-VISUAL.md`, `CONTRATO-FORMA-GLOBAL-N2.md` | deixar na raiz | São contratos de experimento e de gate, não de tarefa de peça. Servem a quem desenvolve. |
| `ATIVACAO-BANCADA-SESSAO-ATIVA.md` | mover para `usar/` | Procedimento operacional puro: como pôr a peça na bancada. Mesma pendência de citação. |

O padrão que aparece nos quatro "mover": todos dependem de uma skill passar a
citá-los, senão o G3 os reprova como órfãos. Isso não é obstáculo do gate — é o
gate perguntando se o documento tem dono. Se nenhuma skill precisa dele, ele
provavelmente não é documento de uso.

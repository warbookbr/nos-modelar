# Esteira confiável para a IA

**Estado:** concluído

## Objetivo

Fazer o laço que a IA repete — descrever, ativar, olhar, medir, corrigir —
terminar sempre com a resposta certa, e reduzir o que ela precisa ler antes de
começar. Verificável pelos números da tabela abaixo, todos com alvo declarado.

## Hipótese

O custo dominante do trabalho da IA aqui não é a modelagem: é a esteira. Uma
sessão gasta rodadas em comandos que falham por motivo ambiental, em documentos
que apontam para arquivos removidos e em gates vermelhos que não são culpa dela.
Se isso for verdade, corrigir a esteira devolve mais rodadas do que qualquer
capacidade nova do motor — e é pré-requisito para medir qualquer outra coisa.

## Linha de base medida — 2026-09-07, `8efe072`, Windows 11

| Medida | Abertura | Alvo | Agora |
|---|---|---|---|
| olhar uma peça pelo nome | falha em **63 s**, sem imagem | sucesso, com PNG | **3,9 s** com PNG (R00) |
| `npm test` | **5 vermelhos / 4 arquivos** | 0, ou ignorado com motivo | **0 vermelhos, 4 ignorados** (R01) |
| `npm run gates` | morre no passo 2 de 17 | roda todos, relata todos | **18/18 em 106 s** (R01) |
| citações mortas na leitura obrigatória | **22** | 0, com gate | **0**, 113 conferidas (R02) |
| a suíte preserva o trabalho | troca a peça da bancada | não toca | **preserva** (R01) |
| leitura obrigatória antes da 1ª linha | **119,8 KB** | ≤ 70 KB | **69,8 KB** (R03) |
| saída de `descrever` por chamada | **9,8 KB** (27,1 numa máquina) | menor, sem perder contato | **4,2 KB** (8,6) (R05) |
| onde o tempo do laço vai | não se sabia | medido sem ritual | **96% em `olhar-bancada`** (R04) |

Os oito são reprodutíveis por comando; nenhum depende de julgamento.

## Escopo e invariantes

Escopo: as CLIs do laço e seus testes, `tools/mapa/` para os verificadores novos,
`package.json` e `ci.yml`, `docs/mecanifica/usar/` e as skills, e o `README.md`.

Invariantes, todos cumpridos: nenhuma rodada acrescenta ritual para a IA —
instrumento mede a ferramenta, nunca pede relato ao agente; nenhum documento
operacional perde conteúdo, o que sai do obrigatório vai para zona consultável
com ponteiro; teste não escreve na árvore real, nem em `public/` nem em
`pecas/`; teste que não pode rodar é ignorado com motivo, nunca vermelho e nunca
silenciado; o motor, as receitas e a geometria não são tocados.

## Rodadas

### R00 — fundir a esteira que já existe — **concluída**

A branch `feat/melhoria-esteira-autoria-ia` (base `8efe072`, 6 commits) já
entregava resolução única de endereço, auto-ativação da sessão no `olhar-bancada`
e o laço visual funcionando fora do catálogo de fixtures do harness.

**Resultado:** mergeada em `9cc275e` após revisão dos 6 commits. O laço fecha em
3,9 s para peça e 3,4 s para máquina, pelo nome curto. Quatro achados da revisão
foram corrigidos aqui: a declaração de plano ativo apontava para um plano de
execução e reprovava `planos:check`; a correção da sessão era salvar-e-restaurar,
não isolamento (R01); `descrever-peca` engolia a mensagem do resolvedor; e o
número de citações mortas subia de 22 para 26 na branch (R02).

### R01 — linha de base verde — **concluída**

Cinco testes falhavam, nenhum por defeito de código: quatro em `EPERM: symlink`
(medido: `symlink` falha e `link` funciona — é o privilégio do Windows) e um por
timeout de 5 s num estudo de campo que leva 1,2 s sozinho e estoura sob a carga
da suíte. Os quatro passam a se declarar ignorados com motivo; o quinto ganhou
orçamento do tamanho do trabalho que faz.

**Resultado:** 18/18 gates verdes em 106 s; a suíte não altera nenhum arquivo
versionado; a peça carregada na bancada sobrevive ao gate.

A causa da interferência era pior que a falha: o teste do perfil MCP APAGAVA os
dois arquivos de sessão no fim. Salvar e devolver não conserta — dois arquivos em
paralelo devolvem cada um o que capturaram, e vence quem terminar por último.
`ativarReceitaBancada` e `executarAtivarBancada` passaram a separar ONDE a sessão
é gravada de ONDE a receita é procurada, e o arquivo real deixou de ser tocado
por qualquer teste.

### R02 — gate de citações — **concluída**

Um verificador confere se cada caminho e cada `npm run` citados na leitura
obrigatória existem. Achou **22 citações mortas**, onze delas receitas que
`references/operacoes-procedurais.md` manda abrir e que saíram do acervo. Na
branch do R00 o número **sobe para 26** — sem gate, a classe cresce sozinha.

**Resultado:** 113 citações conferidas em 21 documentos, zero mortas; o gate
entrou no `ci.yml` e no `gates`. O README afirmava um selo obrigatório, um
`_modelo.js` e um teste byte a byte — os três saíram no mesmo `c78961f` que
removeu o acervo que policiavam, e o texto ficou para trás. Arquivo gerado não é
cobrado: o critério é o `.gitignore`.

### R03 — cortar o obrigatório — **concluída**

`GOTCHAS-AUTORIA-VISUAL.md` tinha 36 KB de leitura obrigatória, dos quais
**15,6 KB eram o registro V-01..V-38** — quase todo sobre o programa de
carroceria, congelado — contra **7 KB de lições operacionais de motor** que
valem para qualquer peça. O gate é `npm run leitura:obrigatoria` contra o teto.

**Resultado: 119,8 KB → 69,8 KB, 42% a menos, sem perder uma lição.** Saíram
para `historico/REGISTRO-FALHAS-AUTORIA-V.md` a tabela V-01..V-38 e as três
seções de estado do programa. O laço visual virou
[`LACO-VISUAL.md`](../../usar/LACO-VISUAL.md), citado pelas duas skills que o
copiavam palavra por palavra. O esquema JSON do achado e os casos aplicados
viraram consulta em `CRITICA-VISUAL-CONTRATO-E-CASOS.md`, e o método diagnóstico
foi reclassificado como consulta pelo que a própria porta já dizia dele: "vale
ler quando os achados encolhem e a qualidade não sobe".

O corte achou um defeito que a duplicação escondia: o `GUIA-AUTORIA-IA.md` que
chegou no R00 ensinava `ALIASES` como OBJETO, e o núcleo exige LISTA DE PARES —
`ALIASES precisa ser uma lista`. Duas verdades sobre a mesma coisa em dois
documentos é pior que uma verdade longe, porque quem lê a errada não tem como
saber que era a errada.

`npm run leitura:obrigatoria` entrou no `gates` e no `ci.yml`: o teto vira
catraca, e voltar a crescer passa a exigir decisão explícita.

### R04 — diário da oficina — **concluída**

Só depois de R00–R03, porque medir esteira quebrada mede a quebra. Um módulo
importado pelos CLIs que a IA já roda grava uma linha JSONL por invocação, fora
do versionamento. A unidade é a **rodada** — entre duas gravações da receita —,
não a tarefa: assim a leitura não precisa comparar machado com cadeira.

**Resultado:** `npm run diario` responde as quatro perguntas — onde vai o tempo,
onde emperra, o que falha, e o que saiu 0 sem entregar. As garantias estão em
teste: ligado e desligado produzem a MESMA saída e o mesmo código, falha ao
gravar não derruba quem está sendo medido, e nome curto e caminho completo caem
na mesma rodada.

A primeira leitura real já apontou o que a lista de abertura não tinha: das
quatro invocações de um laço, `olhar-bancada` levou 3.309 ms dos 3.451 ms — 96%
do tempo está em produzir imagem, e é ali que qualquer ganho seguinte tem de
sair.

Ela também achou dois defeitos no próprio instrumento, ambos da família que o R01
tratou: a suíte gravava no diário de quem trabalha, e o leitor contava a MESMA
falha sobre alvos diferentes como falhas distintas.

### R05 — volume de saída por rodada — **concluída**

`descrever --estrito` emite 9,8 KB por chamada, e a tabela de relações é O(n²)
em partes: 11 partes geram 55 linhas; uma máquina de 40 partes geraria ~780.
`--estrito` não filtra nada — ele só transforma face sem identidade em falha,
e a saída é byte a byte idêntica à do modo normal numa peça limpa.

Recorte: um modo resumido que entrega totais, violações e o que mudou desde a
chamada anterior, mantendo a tabela completa sob bandeira explícita.

Entra aqui um achado do R00, medido ao olhar a primeira máquina capturada: a
captura tem proporção **16:9 fixa no código** (`altura = largura * 9/16`), então
objeto alto gasta o quadro à toa — a prensa hidráulica ocupa cerca de 18% da
largura. É a mesma família da V-25 do registro de gotchas, em que forma foi
julgada por três rodadas numa imagem cortada: pixel que não existe não vira
julgamento. `olhar-bancada` passa a aceitar `--res=LARGURAxALTURA` e a escolher
a proporção pelo envelope do objeto quando ela não for declarada.

**Resultado:** `descrever` passa a resumir por PADRÃO — 9,8 KB → 4,2 KB numa peça
de 11 partes, 27,1 KB → 8,6 KB numa máquina de 20. Nenhum fato de contato se
perde: `interpenetra` e `encosta` saem inteiros, junto das cinco menores folgas,
que são as que podem ser um contato que não fechou; as maiores viram uma linha de
contagem. `--completo` devolve tudo, e o dado estruturado nunca encolheu — é dele
que os gates vivem. A meta de 2 KB não foi atingida e não deveria ser: cortar
mais exigiria esconder relação de contato, que é justamente o que se vai ler.

`olhar-bancada` aceita `--res=LARGURAxALTURA`, e avisa quando a silhueta é
vertical num quadro deitado. O padrão continua 16:9 de propósito — mudá-lo
mexeria em toda captura de gate já calibrada; o que passou a existir é a escolha,
apontada no momento em que ela importa.

## Fora de escopo

- motor, operações, receitas e geometria do acervo;
- contagem de tokens, nota por modelo ou qualquer medida de qualidade do agente;
- MCP além do que o R00 já traz pronto;
- reorganizar a documentação de novo: R03 corta e desduplica, não remaneja;
- o `laboratorio/`, que saiu para `warbookbr/nos-ciencia` em `8efe072`.

## Encerramento e decisão — `aprovar`

R00 a R05 fechadas; a tabela acima é a medida refeita, ao lado da de abertura.
Um alvo não foi atingido de propósito: a saída de `descrever` parou em 4,2 KB e
não nos 2 KB escritos na abertura, porque os 2 KB só sairiam escondendo relação
de contato — que é exatamente o que se vai ler. Alvo escrito antes de medir pode
estar errado, e o certo é dizer isso, não perseguir o número.

O que este plano NÃO fez, e continua valendo: ele não tocou o motor, as receitas
nem a geometria. Nada aqui é evidência sobre forma. O que ele mudou é o custo de
descobrir que a forma está errada.

Três defeitos apareceram no caminho e não estavam em nenhuma lista de abertura:
o teste do perfil MCP APAGAVA a sessão de trabalho; o `GUIA-AUTORIA-IA.md`
ensinava `ALIASES` numa sintaxe que o núcleo recusa de saída; e o perfil vazava
entre ativações no servidor MCP, por mutação do módulo importado. Os três são da
mesma família — estado global escrito por quem não é dono dele — e é a família
que o registro de falhas deve vigiar em seguida.

O que fica aberto para quem retomar: o diário mede, mas ninguém leu ainda uma
série longa. A primeira leitura curta já apontou `olhar-bancada` como 96% do
tempo do laço; confirmar isso em dezenas de rodadas reais é a próxima pergunta, e
ela decide se o esforço seguinte vai para captura mais barata ou para outro lugar.

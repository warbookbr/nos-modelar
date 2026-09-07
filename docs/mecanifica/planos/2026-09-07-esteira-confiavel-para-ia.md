# Esteira confiável para a IA

**Estado:** ativo

## Objetivo

Fazer o laço que a IA repete — descrever, ativar, olhar, medir, corrigir —
terminar sempre com a resposta certa, e reduzir o que ela precisa ler antes de
começar. Verificável por cinco números medidos hoje nesta árvore, todos com alvo
declarado na tabela de linha de base.

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

Os seis são reprodutíveis por comando; nenhum depende de julgamento.

## Escopo — arquivos e identidades

As CLIs do laço (`olhar-bancada`, `ativar-bancada`, `exportar-step`,
`descrever-peca`) e seus testes; `tools/mapa/` para os verificadores novos;
`package.json` e `ci.yml` para os passos; `docs/mecanifica/usar/` e as skills
para o corte de leitura; o `README.md` na seção do selo.

## Invariantes

1. Nenhuma rodada acrescenta ritual para a IA. Instrumento mede a ferramenta,
   nunca pede relato ao agente.
2. Nenhum documento operacional perde conteúdo: o que sai do caminho
   obrigatório vai para zona consultável, com link, e não é apagado.
3. Teste não escreve na árvore real do repositório — nem em `public/`, nem em
   `prototipos/procedural/v3/pecas/`.
4. Teste que não pode rodar no ambiente é **ignorado com motivo**, nunca
   vermelho e nunca silenciado.
5. O motor, as receitas e a geometria do acervo não são tocados por este plano.

## Rodadas

### R00 — fundir a esteira que já existe — **concluída**

A branch `feat/melhoria-esteira-autoria-ia` (base `8efe072`, 6 commits) já
entregava resolução única de endereço (`resolverCaminhoReceita`), auto-ativação
da sessão no `olhar-bancada` e o laço visual funcionando fora do catálogo de
fixtures do harness.

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
dois arquivos de sessão no fim, para o `bancada:vazia:check` não vê-los. Salvar e
devolver não conserta — dois arquivos em paralelo devolvem cada um o que
capturaram, e vence quem terminar por último. `ativarReceitaBancada` e
`executarAtivarBancada` passaram a separar ONDE a sessão é gravada de ONDE a
receita é procurada; o teste escreve em pasta própria e o arquivo real deixa de
ser lido, escrito ou apagado por qualquer teste.

### R02 — gate de citações — **concluída**

Um verificador confere se cada caminho e cada `npm run` citados na leitura
obrigatória existem. Achou **22 citações mortas**, onze delas receitas de
exemplo que `references/operacoes-procedurais.md` manda abrir e que saíram do
acervo. Medida que justifica o gate: na branch do R00 o número **sobe para 26** —
sem verificador, a classe cresce sozinha.

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
[`LACO-VISUAL.md`](../usar/LACO-VISUAL.md), citado pelas duas skills que o
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

Só depois de R00–R03, porque medir esteira quebrada mede a quebra.

Um módulo importado pelos CLIs que a IA já roda grava uma linha JSONL por
invocação, fora do versionamento, com o que a ferramenta já sabia. A unidade é a
**rodada** — entre duas gravações da receita —, não a tarefa: assim a leitura não
precisa comparar machado com cadeira. Mensagem de erro que se repete entre
sessões é defeito de ferramenta ou de documento, nunca do agente.

**Resultado:** `npm run diario` responde as quatro perguntas — onde vai o tempo,
onde emperra, o que falha, e o que saiu 0 sem entregar. As garantias estão em
teste: ligado e desligado produzem a MESMA saída e o mesmo código, falha ao
gravar não derruba quem está sendo medido, e nome curto e caminho completo caem
na mesma rodada.

A primeira leitura real já apontou o que a lista de abertura não tinha: das
quatro invocações de um laço, `olhar-bancada` levou 3.309 ms dos 3.451 ms — 96%
do tempo está em produzir imagem, e é ali que qualquer ganho seguinte tem de
sair.

Ela também achou dois defeitos no próprio instrumento, os dois da família que o
R01 tratou: a suíte gravava no diário de quem trabalha (três recusas do motor e
seis erros de uso que ninguém cometeu), e o leitor contava a MESMA falha sobre
alvos diferentes como falhas distintas — a normalização existe justamente para
que falha repetida pareça repetida.

### R05 — volume de saída por rodada

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

**Gate:** saída padrão de uma peça de 11 partes abaixo de 2 KB sem perder
nenhuma violação que a saída atual acusa, provado por comparação nas peças do
acervo.

## Fora de escopo

- motor, operações, receitas e geometria do acervo;
- contagem de tokens, nota por modelo ou qualquer medida de qualidade do agente;
- MCP além do que o R00 já traz pronto;
- reorganizar a documentação de novo: R03 corta e desduplica, não remaneja;
- o `laboratorio/`, que saiu para `warbookbr/nos-ciencia` em `8efe072`.

## Encerramento e decisão

O plano fecha quando as cinco medidas da linha de base atingem o alvo e o R04
produz um diário lido pelo menos uma vez. A decisão registrada será `aprovar`,
`corrigir` ou `interromper`, com a tabela medida de novo lado a lado com a de
abertura.

R00 pode ser recusado inteiro se a revisão dos commits reprovar: nesse caso R01
absorve o isolamento de teste e o restante da esteira volta ao backlog. Nenhuma
rodada posterior abre sem a anterior fechada, e R04 não abre com a linha de base
vermelha — um diário sobre esteira quebrada mede o defeito, não o trabalho.

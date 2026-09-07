# Esteira confiável para a IA

**Estado:** pronto

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

| Medida | Hoje | Alvo |
|---|---|---|
| `npm run bancada -- cadeira-de-madeira` | falha em **63 s** sem produzir imagem | sucesso, com PNG |
| `npm test` | **5 testes / 4 arquivos** vermelhos | 0 vermelhos, ou ignorado com motivo |
| `npm run gates` | morre no passo 2 de 19 (encadeado por `&&`) | roda os 19, relata todos |
| Citações inexistentes nos documentos de leitura obrigatória | **22** | 0, com gate |
| Caminho obrigatório antes da primeira linha de receita | **~108 KB** | ≤ 70 KB |

Os cinco são reprodutíveis por comando; nenhum depende de julgamento.

## Escopo — arquivos e identidades

- `tools/mecanifica/olhar-bancada.mjs`, `ativar-bancada.mjs`, `exportar-step.mjs`,
  `descrever-peca.mjs` e o novo `resolver-caminho-receita.mjs`;
- `tools/mecanifica/ativar-bancada.test.mjs`, `repositorio-autoria.test.ts`,
  `estudo-campo-revalidacao.test.ts`, `tools/mcp/catalogo-montagens.test.mjs`,
  `tools/modelagem/caminho-repositorio.test.mjs`;
- `tools/mapa/` — um verificador novo de citações;
- `package.json` — o passo `gates` e o passo do verificador novo;
- `docs/mecanifica/usar/` — `GOTCHAS-AUTORIA-VISUAL.md` e a porta `README.md`;
- `.claude/skills/` — as três skills que repetem os mesmos quatro blocos;
- `README.md` — a seção do selo.

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

### R00 — fundir a esteira que já existe

A branch `feat/melhoria-esteira-autoria-ia` (base `8efe072`, 6 commits) já
entrega resolução única de endereço (`resolverCaminhoReceita`), auto-ativação da
sessão no `olhar-bancada` e preservação do `sessao-ativa.json` nos testes.

Medido na própria branch: `olhar-bancada --peca=cadeira-de-madeira` passou de
**63 s de timeout mudo para 3,9 s com PNG gravado**, e o vermelho de
`ativar-bancada.test.mjs` na suíte desapareceu.

**Gate:** revisão dos 6 commits, `npm test` sem regressão nova, e o laço
completo (`descrever` → `ativar:bancada` → `olhar-bancada` → `exportar:step`)
rodando com nome curto em uma peça e em uma máquina.

**Limite conhecido:** a correção da sessão é salvar-e-restaurar, não isolamento.
O teste continua escrevendo no arquivo real durante a execução. R01 fecha isso.

### R01 — linha de base verde

Cinco testes falham nesta máquina. Quatro morrem em `EPERM: symlink` — medido:
`symlink` falha, `hardlink` funciona, ou seja, falta o privilégio do Windows,
não há defeito no código. O quinto (`estudo-campo-revalidacao`) precisa ser
diagnosticado antes de classificado.

Correções, nesta ordem:

1. teste que exige `symlink` detecta a capacidade e se declara ignorado com
   motivo legível, em vez de vermelho — a suíte precisa dizer a verdade nos dois
   sistemas;
2. `ativar-bancada.test.mjs` passa a usar `mkdtemp` e `cwd` próprios, sem tocar
   `public/sessao-ativa.json` nem `pecas/` reais;
3. `gates` deixa de encadear por `&&` e passa a rodar os 19 e relatar todos,
   com saída não-zero no fim se algum falhou.

**Gate:** `npm test` verde nesta máquina; `npm run gates` chega ao passo 19;
`npm test` executado duas vezes seguidas não altera nenhum arquivo versionado
nem o `sessao-ativa.json`.

### R02 — gate de citações

Um verificador extrai caminhos e `npm run` citados nos documentos de leitura
obrigatória e confere se existem. O protótipo tem 40 linhas e acusa **22
citações mortas** hoje: `references/operacoes-procedurais.md` manda ler onze
receitas de exemplo que foram removidas do acervo (entre elas a peça de
referência sem id cru e a que ensina a abrir vão), e o `README.md` manda copiar
um `_modelo.js` inexistente para satisfazer um gate de selo que também não
existe.

Medida que justifica o gate: na branch do R00 o número **sobe de 22 para 26** —
sem verificador, a classe cresce sozinha.

**Gate:** `npm run docs:citacoes:check` entra em `gates` e fecha em 0; cada
citação morta é corrigida ou removida, e o texto que dependia dela é reescrito
para o acervo atual.

### R03 — cortar o obrigatório

`GOTCHAS-AUTORIA-VISUAL.md` tem 36 KB e é leitura obrigatória. Medido por seção:
**15,6 KB são o registro histórico V-01..V-38**, quase todo sobre o programa de
carroceria, que está congelado; **7 KB são as lições operacionais de motor**
(`loft` contra `inflate`, furar chapa, armadilhas de `loft`, proporção) que
valem para qualquer peça.

1. o registro V vai para `historico/`, citado e consultável, fora do obrigatório;
2. os quatro blocos hoje repetidos palavra por palavra em três skills
   (`OLHE a imagem`, `Despachar o crítico`, `abra o alvo e sobreponha`,
   `o método tem limite`) viram um documento só, citado pelas três;
3. o `GUIA-AUTORIA-IA.md` que chega no R00 é reconciliado com o que já existe,
   para acrescentar caminho e não acrescentar volume.

**Gate:** caminho obrigatório ≤ 70 KB medido por script; `docs:links:check`,
`docs:estrutura:check` e `mapa:check` verdes; nenhuma lição operacional perdida,
conferida item a item contra a versão anterior.

### R04 — diário da oficina

Só depois de R00–R03, porque medir esteira quebrada mede a quebra.

Um módulo compartilhado, importado pelos CLIs que a IA já roda, grava uma linha
JSONL por invocação, fora do versionamento: instante, comando, alvo normalizado,
duração, código de saída, se produziu o artefato prometido, e os contadores que
a ferramenta **já calcula** (partes, faces, órfãos, achados).

A unidade de análise é a **rodada** — o intervalo entre duas gravações do arquivo
da receita — e não a tarefa. Isso responde onde o tempo vai e onde está a
dificuldade sem precisar comparar machado com cadeira: soma de duração por
comando, repetição do mesmo comando no mesmo alvo, e frequência de cada mensagem
de erro. Mensagem que se repete entre sessões é defeito de ferramenta ou de
documento — nunca do agente.

**Gate:** o laço completo de uma peça produz diário legível; o diário não muda
nenhuma saída existente; desligá-lo não altera nenhum resultado; e uma leitura
do diário aponta pelo menos um desperdício que não estava nesta lista.

### R05 — volume de saída por rodada

`descrever --estrito` emite 9,8 KB por chamada, e a tabela de relações é O(n²)
em partes: 11 partes geram 55 linhas; uma máquina de 40 partes geraria ~780.
`--estrito` não filtra nada — ele só transforma face sem identidade em falha,
e a saída é byte a byte idêntica à do modo normal numa peça limpa.

Recorte: um modo resumido que entrega totais, violações e o que mudou desde a
chamada anterior, mantendo a tabela completa sob bandeira explícita.

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

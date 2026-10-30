# Glossário e entrada para pessoas — os termos próprios do Modelar definidos num lugar só, e uma página que explica o projeto a quem chega de fora

**Estado:** ativo

**Responsável:** Claude, com a pessoa aprovando a página de entrada

**Repositório e base:** `warbookbr/nos-modelar`, main depois do fechamento do plano [ajustes no núcleo dos veículos](encerrados/2026-10-21-ajustes-no-nucleo-dos-veiculos.md); o [furgão realista](2026-10-30-furgao-realista.md) continua sucessor e ativa depois deste

## Problema observado

Uma análise externa do repositório, feita em 2026-10-30 a partir do README e da estrutura, concluiu que a documentação é densa e cheia de termos internos e que quem chega de fora tem curva de aprendizado alta; ela também não percebeu que o projeto é feito para agentes operarem e para a pessoa decidir e aprovar. Conferido: o projeto usa jargão próprio (peça, receita, TABELA, passo, neutro, porta, vão, lataria, friso, gaiola, retrato, rodada, crítico cego, gate, roteiro e outros) sem definição num lugar só, e não há página escrita para uma pessoa que não conhece o projeto. Para agentes, o `npm run comecar` já dá a leitura por tarefa com orçamento; falta o lugar onde um termo desconhecido se resolve sem ler documento inteiro.

## Resultado

Um glossário consultável sob demanda, com cada termo próprio definido em uma ou duas frases literais e apontando onde ele mora no código ou na documentação, e uma página de entrada para pessoas, ligada pelo README, que explica o que o Modelar é, para quem é, como uma peça nasce e é aprovada e como começar; um leitor sem contexto responde às perguntas de prova só com ela e o glossário.

## Filtro Agent-First

USAR DIRETO o `comecar` e a leitura por roteiro: o glossário entra como leitura sob demanda (`sobDemanda`) dos roteiros, e não como leitura obrigatória, para não pesar no orçamento. ENVOLVER nada. REFATORAR nada no código. ADIAR a reescrita dos documentos existentes para trocar jargão por texto literal: o glossário resolve o termo onde ele aparece, e a reescrita, se a medida pedir, é plano próprio.

## Incluído

o GLOSSARIO.md, criado em `docs/modelar/`, com os termos levantados por frequência nos documentos de uso, nas skills, no `CLAUDE.md` e nas mensagens das ferramentas, cada um com a definição e o caminho de onde ele é definido; o ponteiro para ele nos roteiros do `comecar` como leitura sob demanda; a página de entrada para pessoas, o COMECE-AQUI.md criado em `docs/`, ligada pelo README e pelo índice da documentação, escrita em português literal, sem termo interno sem o link do glossário; a prova com um leitor cego.

## Excluído

Reescrever os documentos de uso, as skills ou as mensagens das ferramentas; traduzir para outra língua; site, vídeo ou interface nova; mudar o escopo do projeto, que continua sendo a oficina para agentes.

## Invariantes

A leitura obrigatória de cada roteiro não cresce (`npm run leitura:obrigatoria` dentro dos orçamentos atuais). Nenhum caminho citado no glossário ou na página fica quebrado (`docs:citacoes:check`, `docs:links:check`). Nenhum nome de terceiro, marca ou termo proibido entra (`termos-proibidos`).

## Gate de saída

1. O glossário cobre todo termo próprio que aparece cinco vezes ou mais nos documentos de uso e nas skills, pela lista do levantamento, e cada definição cita um caminho que existe.
2. A página de entrada não usa termo do glossário sem o link para ele, e cabe em leitura de poucos minutos.
3. Um subagente sem contexto, com só a página e o glossário, responde corretamente às perguntas de prova: o que é o Modelar e para quem; como uma peça nasce e quem a aprova; o que o crítico cego faz; como rodar a bancada; onde estão as regras do projeto; o que é um plano ativo.
4. `npm run gates` verde e a pessoa aprova a página de entrada.

## Fatias

1. **Levantamento e glossário.** O levantamento dos termos por frequência, guardado no banco de provas com o comando que o refaz, e o glossário com o ponteiro sob demanda nos roteiros.
2. **Página de entrada.** Em paralelo com a fatia 1, a página para pessoas, depois ligada aos termos do glossário.
3. **Prova com leitor cego.** As perguntas do gate a um subagente sem contexto; o que ele errar volta para a página ou para o glossário.
4. **Fechamento.** README e índice apontando a página, backlog, bateria e o plano movido para `encerrados/`.

## Decisões que dependem da pessoa

1. **Plano criado e ativado pela pessoa.** Aprovada em 2026-10-30: a pessoa pediu o glossário e a página de entrada para pessoas agora, num plano ativo, com subagentes.

## Riscos e parada

O risco é o glossário virar segundo documento de uso, longo e com regra: ele só define e aponta, e a regra continua no lugar dela. Para e volta à pessoa se a leitura obrigatória precisar crescer ou se a página pedir mudar o escopo do projeto.

## Andamento

Ativado em 2026-10-30, a pedido da pessoa, logo depois do fechamento do plano dos veículos e antes do furgão realista.

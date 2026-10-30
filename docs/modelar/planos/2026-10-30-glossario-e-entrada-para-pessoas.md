# Glossário e entrada para pessoas — uma página que explica o projeto a quem chega de fora, com os termos que ela usa definidos nela

**Estado:** ativo

**Responsável:** Claude, com a pessoa aprovando a página de entrada

**Repositório e base:** `warbookbr/nos-modelar`, main depois do fechamento do plano [ajustes no núcleo dos veículos](encerrados/2026-10-21-ajustes-no-nucleo-dos-veiculos.md); o [furgão realista](2026-10-30-furgao-realista.md) continua sucessor e ativa depois deste

## Problema observado

Uma análise externa do repositório, feita em 2026-10-30 a partir do README e da estrutura, concluiu que a documentação é densa e cheia de termos internos e que quem chega de fora tem curva de aprendizado alta; ela também não percebeu que o projeto é feito para agentes operarem e para a pessoa decidir e aprovar. Conferido: o projeto usa jargão próprio (peça, receita, TABELA, passo, neutro, porta, vão, lataria, friso, gaiola, retrato, rodada, crítico cego, gate, roteiro e outros) sem definição num lugar só, e não há página escrita para uma pessoa que não conhece o projeto. Para agentes, o `npm run comecar` já dá a leitura por tarefa com orçamento; falta o lugar onde um termo desconhecido se resolve sem ler documento inteiro.

## Resultado

Uma página de entrada para pessoas, ligada pelo README, que explica o que o Modelar é, para quem é, como uma peça nasce e é aprovada e como começar, com uma seção curta que define em uma frase cada termo próprio que ela usa e liga ao documento onde o termo é definido de verdade; um leitor sem contexto responde às perguntas de prova só com ela.

## Filtro Agent-First

USAR DIRETO os documentos que já definem cada termo: a página liga a eles e não copia a definição deles. ENVOLVER nada. REFATORAR nada no código. ADIAR a reescrita dos documentos existentes para trocar jargão por texto literal, que, se a medida pedir, é plano próprio.

## Incluído

A página de entrada para pessoas, o COMECE-AQUI.md criado em `docs/`, ligada pelo README e pelo índice da documentação, escrita em português literal, com a seção dos termos que ela usa; o levantamento dos termos próprios por frequência, feito uma vez para escolher essa lista e registrado no andamento; a prova com um leitor cego.

## Excluído

Um glossário separado, que repetiria as definições dos documentos num segundo lugar e envelheceria com eles; reescrever os documentos de uso, as skills ou as mensagens das ferramentas; traduzir para outra língua; site, vídeo ou interface nova; mudar o escopo do projeto, que continua sendo a oficina para agentes.

## Invariantes

A leitura obrigatória de cada roteiro não cresce (`npm run leitura:obrigatoria` dentro dos orçamentos atuais). Nenhum caminho citado na página fica quebrado (`docs:citacoes:check`, `docs:links:check`). Nenhum nome de terceiro, marca ou termo proibido entra (`termos-proibidos`).

## Gate de saída

1. A seção de termos da página define em uma frase cada termo próprio que a página usa, com o link para o documento que o define, e nenhum termo próprio aparece na página fora dela sem esse link.
2. A página cabe em leitura de poucos minutos.
3. Um subagente sem contexto, com só a página e os documentos que ela liga, responde corretamente às perguntas de prova: o que é o Modelar e para quem; como uma peça nasce e quem a aprova; o que o crítico cego faz; como rodar a bancada; onde estão as regras do projeto; o que é um plano ativo.
4. `npm run gates` verde e a pessoa aprova a página de entrada.

## Fatias

1. **Levantamento dos termos.** A contagem dos termos próprios por frequência, para escolher os que a página define, com o documento que define cada um.
2. **Página de entrada.** A página para pessoas, com a seção dos termos.
3. **Prova com leitor cego.** As perguntas do gate a um subagente sem contexto; o que ele errar volta para a página.
4. **Fechamento.** README e índice apontando a página, backlog, bateria e o plano movido para `encerrados/`.

## Decisões que dependem da pessoa

1. **Plano criado e ativado pela pessoa.** Aprovada em 2026-10-30: a pessoa pediu o glossário e a página de entrada para pessoas agora, num plano ativo, com subagentes.
2. **Sem glossário separado.** Aprovada em 2026-10-30, pela recomendação: o glossário repetiria as definições que já moram nos documentos e envelheceria com eles, e para os agentes os roteiros do `comecar` já levam ao documento que define o termo; os termos que a página usa ficam definidos numa seção dela, ligados ao documento de origem.

## Riscos e parada

O risco é a página virar segundo documento de uso, longa e com regra: ela só explica e aponta, e a regra continua no lugar dela. Para e volta à pessoa se a leitura obrigatória precisar crescer ou se a página pedir mudar o escopo do projeto.

## Andamento

Ativado em 2026-10-30, a pedido da pessoa, logo depois do fechamento do plano dos veículos e antes do furgão realista.

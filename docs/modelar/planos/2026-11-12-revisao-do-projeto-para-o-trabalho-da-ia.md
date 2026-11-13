# Revisão do projeto para o trabalho da IA: o que protege, o que só custa, e se a organização e o núcleo servem a quem desenvolve

**Estado:** ativo

**Território:** `docs/modelar/banco-de-provas/revisao-do-projeto-2026-11-13/`. É a pasta do inventário e do relatório, que não mudam código nem regra. Os caminhos de ferramenta e de núcleo que esta linha listava serviam à validação por objetos de prova, que saiu do plano em 2026-11-13; a lista está no histórico deste arquivo, no commit `bed7a128`.

**Responsável:** a IA da sessão do furgão, sozinha desde 2026-11-13, quando a pessoa avisou que a sessão do núcleo não volta; a decisão de cada grupo de achados é da pessoa.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-12.

## Problema observado

A pessoa pediu uma análise do projeto inteiro e avisou que o pedido é genérico, porque ela o vê de fora. O pedido tem quatro
perguntas: o que nas regras e nos gates é exigência que deixa a IA seguir desenvolvendo sem ponta solta, e o que é burocracia
em excesso; se o projeto é prático para a IA trabalhar; se a organização de módulos e pastas está no nível das melhores
práticas; e se o núcleo está bem organizado, capaz, rápido e sem verbosidade para quem escreve receitas.

O tamanho do que há para olhar, medido em 2026-11-12: 125 comandos no `package.json`, 28 gates na bateria local e um CI de 13
trabalhos em paralelo, 490 arquivos de teste, 397 documentos em `docs/` somando 4,2 MB, 140 planos encerrados, 10 skills e 6 agentes. Em
linhas de código, `tools/` tem 93 mil, as peças 101 mil, o núcleo 53 mil, `src/` 47 mil e os módulos 9 mil.

Há sinais dos dois lados numa só semana de trabalho, e nenhum deles é medida do todo. Do lado de exigência que protegeu: a
auditoria de interseções apontou um grampo sobre a emenda do trilho antes de a pessoa ver a imagem, e um teste recusou uma
receita cujo plano o mapa da receita não saberia ler. Do lado de custo sem defeito: um orçamento de leitura estourado por 143
bytes obrigou a encurtar um texto correto; o mapa gerado do repositório conflita em toda junção de ramos; um teto de tempo
posto com uma medida só reprovou mais de um envio; a mesma lista de proibições é copiada à mão em cada pedido a um agente;
e uma guarda aceita o nome da peça de um jeito que o comando vizinho recusa.

## Resultado

A pessoa recebe um relatório curto em que cada regra, gate, obrigação de documento, fronteira de pasta e parte do núcleo tem
uma classificação com o número que a sustenta, e decide por grupo o que fica, o que se automatiza, o que se simplifica e o que
sai; cada mudança aprovada vira plano próprio ou correção pontual.

## Perguntas que a análise responde

1. Gates e regras. Para cada gate e cada regra do contrato: quantas vezes reprovou no histórico do CI, quantas dessas eram
   defeito real e quantas eram formato, quanto tempo custa e se repete o que outro já confere. Cada um sai como protege,
   protege mas deve ser automático, ou só custa.
2. Leitura e contexto. Quantos bytes a IA precisa ler para começar cada tipo de tarefa, quanto disso é usado, quais dos 397
   documentos são alcançados pelos roteiros e quais ninguém lê.
3. O que é escrito à mão e podia ser gerado, e o que é gerado e conflita: mapa, índices, listas de planos ativos repetidas em
   três arquivos, proibições repetidas nos pedidos aos agentes.
4. Pastas e módulos. O mapa de quem depende de quem entre núcleo, `src/`, módulos, ferramentas e peças, onde a fronteira é
   furada, por que as ferramentas têm quase o dobro das linhas do núcleo, e a comparação com a organização de projetos
   comparáveis, que entra por pesquisa, com a fonte.
5. Núcleo. As operações do catálogo contra o uso real nas receitas (as que ninguém usa, as que sempre aparecem juntas e
   pedem uma só), as linhas por peça como medida de verbosidade, o tempo por operação nas peças mais pesadas, a qualidade das
   mensagens de erro e a coerência dos nomes e argumentos.
6. Trabalho entre sessões e agentes. O limite de planos ativos, os territórios, os atritos que os agentes relatam e quantos
   deles viraram correção.
7. Para quem o projeto serve. A pessoa deu quatro usos de exemplo (arquitetura, peças automotivas, manuais de instalação e
   filme animado), todos com o objeto 3D como saída. Para cada uso: o que o projeto já entrega, o que falta e onde a falta
   mora. A leitura de partida, a conferir com medida: peça padrão reaproveitável por medida (ferragem, perfil, telha, parede)
   é família, fora do núcleo; saída além do objeto (passo a passo com lista de peças, desenho com cotas e corte, poses na
   exportação) é módulo, ao lado dos exportadores; repetição barata (uma peça modelada e muitas posicionadas) e função geral
   de reuso são do núcleo, quando um caso real pedir. Desta pergunta sai a decisão sobre um roadmap de famílias.

## Ativação e norte

Ativo desde 2026-11-13, com prioridade máxima, quando a pessoa disse "pode ativar o plano de análise" e tirou as quatro
perguntas que este rascunho fazia antes de ativar. O norte é dela: o projeto existe para a IA modelar o que o usuário pedir,
e por isso "praticidade, controle e organização para IA é o foco", e não a preferência de quem olha de fora. Ela acrescentou
que medir o que já aconteceu (dificuldades, tempos) "tecnicamente não basta para evoluir o projeto, e organizar melhor ele,
assim como elevar o teto", e pediu objetivos de validação: "fazer testes, como por exemplo modelar certas coisas para ir
melhorando o núcleo, ir melhorando a organização". O plano passa a ter duas frentes, o inventário do que existe e a validação
por objetos de prova, e conta com "vários agentes trabalhando em paralelo", com a sessão do núcleo planejando e orquestrando. As
medidas e o relatório ficam em [`revisao-do-projeto-2026-11-13`](../banco-de-provas/revisao-do-projeto-2026-11-13/README.md).

## Estado em 2026-11-13, para quem retomar

O inventário das sete perguntas está na pasta do território, e o [relatório](../banco-de-provas/revisao-do-projeto-2026-11-13/RELATORIO.md) traz a classificação por grupo e a decisão da pessoa, que aprovou todas as recomendações de mudança. A revisão cruzada entre duas sessões não aconteceu: a sessão do núcleo foi encerrada, e cinco números da metade dela foram refeitos por amostra e bateram.

A pessoa mudou o rumo do plano na mesma conversa, e as fatias abaixo já estão assim. A validação por objetos de prova saiu: "a modelagem eu vejo depois". A avaliação de cada gate e de cada teste virou plano próprio. A análise ganhou os mecanismos que tinham ficado de fora (as skills, a bancada com o crítico visual, o servidor de ferramentas, o backlog, o `comecar` e a ficha de capacidade), com a pergunta que ela deu: "se melhorássemos isso de alguma maneira, o que aconteceria?". E ganhou a organização da documentação, depois de ela notar que o projeto não tem uma página com a visão dos mecanismos: "eu fui criando essa estrutura que temos hoje no projeto mas não sei se existe alguma melhor".

## Filtro Agent-First

USAR DIRETO: o histórico do CI, a saída da bateria de gates, os roteiros do `comecar`, o catálogo de capacidades, os diários de atrito e o registro das conversas das sessões; a análise mede com o que existe. ADIAR: qualquer ferramenta nova de medição, salvo se uma pergunta não puder ser respondida sem ela.

## Incluído

- o inventário medido das sete perguntas, com o comando que reproduz cada número, e o relatório com a recomendação por grupo;
- a decisão da pessoa registrada por grupo;
- a análise dos seis mecanismos que ficaram de fora, respondida em rodadas perdidas que uma melhoria evitaria;
- a medida do que as sessões abrem de fato, contra o que os roteiros mandam ler;
- a pesquisa de como se organizam projetos feitos para serem operados por IA, somada à dos projetos de modelagem por código, e trazida ao relatório;
- a proposta de organização da documentação desenhada em uma página, a árvore de hoje ao lado da proposta, com o destino de cada documento solto, para a pessoa aprovar por imagem;
- a abertura dos planos de execução.

## Excluído

- executar dentro deste plano qualquer mudança de regra, de gate, de código ou de pasta;
- a validação por objetos de prova, que a pessoa retoma quando quiser;
- a avaliação de cada gate e de cada teste, que é do [plano das verificações](2026-11-13-revisao-das-verificacoes-e-dos-testes.md);
- mover ou reescrever documento antes de a pessoa aprovar o desenho da organização.

## Gate de saída

1. O relatório cabe em leitura de uma sentada, e cada classificação cita o número e o arquivo que o reproduz.
2. Nenhuma regra ou gate é recomendado para sair sem a lista do que ele já pegou.
3. A decisão da pessoa está registrada por grupo.
4. Cada mudança aprovada tem plano, item de backlog ou correção apontada, e as recusadas têm o motivo.
5. Cada um dos seis mecanismos tem a resposta à pergunta da pessoa, com a contagem que a sustenta.
6. O desenho da organização da documentação foi mostrado à pessoa e a decisão dela está registrada.

## Fatias

1. O inventário medido das sete perguntas. Feito.
2. O relatório e a decisão da pessoa. Feito em 2026-11-13.
3. O que falta medir: os seis mecanismos, o que as sessões abrem de fato e a pesquisa de projetos operados por IA.
4. O desenho da organização da documentação, e a decisão da pessoa sobre ele.
5. A abertura dos planos de execução e o fechamento. Já abertos: as [melhorias de processo](2026-11-13-melhorias-de-processo-da-revisao.md), o [núcleo para quem escreve receita](2026-11-13-nucleo-para-quem-escreve-receita.md) e a [revisão das verificações e dos testes](2026-11-13-revisao-das-verificacoes-e-dos-testes.md). Faltam o da saída de manual, que espera a pessoa retomar a instalação solar, e o da reorganização da documentação, que espera a fatia 4.

## Riscos e parada

Tirar uma regra que pega um defeito raro e caro: por isso nada sai sem a lista do que já pegou. A análise virar mais uma camada de documentos: o relatório tem tamanho limitado, e o que se mede a mais entra nos arquivos de pergunta. Uma sessão só levantou e conferiu: o que não foi refeito por amostra está dito no relatório como não conferido.

## Fechamento

Preencher ao concluir ou cancelar.

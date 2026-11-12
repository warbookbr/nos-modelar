# Revisão do projeto para o trabalho da IA: o que protege, o que só custa, e se a organização e o núcleo servem a quem desenvolve

**Estado:** rascunho

**Território:** a declarar ao ativar o plano. A análise não muda código nem regra; só o relatório dela entra no repositório.

**Responsável:** a definir entre as duas sessões que trabalham no repositório, com a decisão de cada grupo de achados com a pessoa.

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

## Perguntas à pessoa antes de ativar

O que mais incomoda hoje, em termos concretos: demora, retrabalho, perguntas demais, custo, ou o projeto difícil de entender.
Se entre rapidez e segurança contra regressão há uma preferência. Se a bancada e o produto entram na análise ou só o que
serve à modelagem. E se outras pessoas ou outras IAs vão trabalhar no repositório, o que muda o que a documentação precisa
explicar.

## Filtro Agent-First

USAR DIRETO: o histórico do CI, a saída da bateria de gates, os roteiros do `comecar`, o catálogo de capacidades, o registro
de custo e os atritos já registrados; a análise mede com o que existe. ADIAR: qualquer ferramenta nova de medição, salvo se
uma das seis perguntas não puder ser respondida sem ela.

## Incluído

- o inventário medido das seis perguntas, com o comando que reproduz cada número;
- a classificação de cada item e a recomendação por grupo;
- a revisão cruzada: cada sessão levanta uma metade e tenta derrubar os achados da outra;
- a decisão da pessoa registrada por grupo, e a abertura dos planos ou correções que ela aprovar.

## Excluído

- executar as mudanças dentro deste plano;
- modelagem de peças e os planos de objeto em curso;
- reescrever documentação antes da decisão sobre o que fica.

## Gate de saída

1. O relatório existe, cabe em leitura de uma sentada, e cada classificação cita o número e o comando que o reproduz.
2. Nenhuma regra ou gate é recomendado para sair sem a lista do que ele já pegou.
3. A decisão da pessoa está registrada por grupo.
4. Cada mudança aprovada tem plano, item de backlog ou correção apontada, e as recusadas têm o motivo.

## Fatias

1. O inventário medido, dividido entre as duas sessões: processo, documentos e agentes numa; pastas, módulos e núcleo na outra.
2. A revisão cruzada e a classificação, com a recomendação por grupo.
3. A decisão da pessoa.
4. A abertura dos planos de execução e o fechamento.

## Riscos e parada

Tirar uma regra que pega um defeito raro e caro: por isso nada sai sem a lista do que já pegou. A análise virar mais uma camada
de documentos: o relatório tem tamanho limitado e é o único documento novo. As duas sessões mexerem nas mesmas áreas: a análise
não muda código, e a execução sai em planos com território. Se o inventário mostrar que uma das seis perguntas pede semanas de
medição, ela sai deste plano e vira plano próprio.

## Fechamento

Preencher ao concluir ou cancelar.

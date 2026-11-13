# Revisão do projeto para o trabalho da IA: o que protege, o que só custa, e se a organização e o núcleo servem a quem desenvolve

**Estado:** ativo

**Território:** `docs/modelar/banco-de-provas/revisao-do-projeto-2026-11-13/`, `tools/modelar/custo-por-peca.mjs`, `tools/modelar/custo-por-peca.test.mjs`, `tools/modelar/fluxo-do-objeto.mjs`, `tools/modelar/fluxo-do-objeto.test.mjs`, `tools/modelar/rodada-de-modelagem.mjs`, `tools/modelar/rodada-de-modelagem.test.mjs`, `tools/modelar/vistas-para-critica.mjs`, `tools/modelar/vistas-para-critica.test.mjs`, `procedural/pecas/carrinho-de-mao/`, `docs/modelar/banco-de-provas/carrinho-de-mao-2026-11-11/`, `procedural/nucleo/gaiola-varrida.js`, `procedural/nucleo/gaiola-varrida.test.mjs`, `procedural/nucleo/gaiola-por-lacos.js`, `procedural/nucleo/gaiola-por-lacos.test.ts`, `tools/modelar/capacidade.mjs`, `procedural/pecas/sedan-chassi-e-lataria/`, `docs/modelar/banco-de-provas/sedan-chassi-e-lataria-2026-11-11/`, `procedural/nucleo/paineis-por-vaos.js`, `procedural/nucleo/paineis-por-vaos.test.ts`, `tools/modelar/vao-entre-partes.mjs`, `tools/modelar/vao-entre-partes.test.mjs`, `procedural/nucleo/lamina-sobre-a-superficie.js`, `procedural/nucleo/paineis-por-vaos-superficie.test.ts`, `tools/modelar/instancia-de-familia.mjs`, `tools/modelar/instancia-de-familia.test.mjs`, `procedural/nucleo/apoio-do-vinco.js`, `procedural/nucleo/apoio-do-vinco.test.ts`, `procedural/nucleo/gaiola-por-estacoes.js` (o campo `raio` do vinco), `tools/modelar/raio-da-aresta.mjs`, `tools/modelar/raio-da-aresta.test.mjs`, `tools/modelar/entrada-de-medida.mjs`, `tools/modelar/entrada-de-medida.test.mjs` (o cache da montagem; a bandeira `--sem-cache` entra em `lasca.mjs`, `ondulacao-da-superficie.mjs`, `vistas-de-superficie.mjs` e `exportar-obj.mjs`, só nela), `procedural/nucleo/curva-da-gaiola.js`, `procedural/nucleo/operacoes/friso.js`, `procedural/nucleo/friso-refinar.test.mjs`, `procedural/nucleo/gaiola-por-estacoes.test.mjs`, `.claude/skills/criar-peca/references/operacoes-procedurais.md`, `docs/modelar/modelar-carroceria.md`, `procedural/nucleo/gaiola-aneis.js`, `procedural/nucleo/normal-da-gaiola.js`, `procedural/nucleo/normal-da-gaiola.test.ts`, `procedural/nucleo/gaiola-aneis-rebaixo.test.mjs`, `procedural/nucleo/aparar.test.ts`, `procedural/nucleo/molde-de-dentro.js`, `procedural/nucleo/operacoes/subdivisao.js`, `procedural/nucleo/catalogo.test.mjs`, `procedural/nucleo/fixtures/motor-r00-baseline.json`, `tools/mcp/procedural.test.mjs`, `src/autoria/contato-de-solidos.js`, `src/autoria/contato-de-solidos-raio-na-aresta.test.mjs`, `src/autoria/contatos-da-peca.js`, `src/autoria/descrever-partes.js`, `src/autoria/encosto-da-peca.test.mjs`, `src/autoria/contato-em-plano-inclinado.test.mjs`, `src/autoria/molduras-do-vao.js`, `src/autoria/molduras-do-vao-chapa-cortada.test.mjs`, `procedural/nucleo/operacoes/limpar-lascas.js`, `procedural/nucleo/limpar-lascas-escala.test.mjs`, `procedural/nucleo/fixtures/lasca-na-escala-da-peca.json`, `procedural/nucleo/fixtures/lasca-na-tolerancia-da-peca.json`, `procedural/nucleo/paineis-por-vaos-aba.test.mjs`, `procedural/nucleo/ponto-na-malha.js`, `procedural/nucleo/ponto-na-malha.test.mjs`, `procedural/nucleo/composicoes.js`, `procedural/nucleo/composicoes.test.mjs`, `procedural/nucleo/triangulacao-face.js`, `tools/modelar/custo-de-importar-receita.test.mjs`, `tools/modelar/medir-importar-receita.mjs`, `tools/testes-lentos.mjs`, `tools/modelar/ondulacao-da-superficie.mjs`, `tools/modelar/ondulacao-corte-e-quina.test.mjs` (a operação `aparar` e a contagem de cruzamentos do contato, da fatia 4c, e os atritos de ferramenta que o sedã em receita revelou, no `RECEITA.md` dele; o par espelhado do relato e a tabela em mm ficam no território do plano de conferência). A primeira pasta é do inventário, que não muda código nem regra. Os demais caminhos vieram do plano do núcleo para qualquer mecanismo, fechado em 2026-11-13, e servem à frente de validação; a pasta de cada objeto de prova entra aqui quando ele for escolhido. A execução do que o inventário recomendar sai em planos próprios, com território.

**Responsável:** a IA da sessão do núcleo planeja e orquestra, com agentes em paralelo, por decisão da pessoa em 2026-11-13; a sessão do furgão levanta a metade dela e revisa a outra; a decisão de cada grupo de achados é da pessoa.

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

A pessoa encerrou a sessão que orquestrava e abre outra; esta seção é a passagem. Da fatia 1, a metade de pastas, módulos e
núcleo está levantada em cinco arquivos na pasta do território, ligados no README dela: pastas e módulos, projetos comparáveis,
operações e verbosidade, erros, nomes e argumentos, e tempo por operação. Três números foram conferidos por amostra contra o
código; o resto ainda não passou pela revisão cruzada. A metade de regras, documentos e agentes é da sessão do furgão (ramo
`claude/revisar-plano-ativo-cyj8c3`), avisada da ativação; ela não tem como enviar recado e responde pelo repositório ou pela
pessoa. Falta: a pergunta 7, que é das duas; a fatia 2 inteira; e o primeiro ciclo da fatia 4, já decidido pela pessoa e
descrito nela. O último envio da sessão encerrada é o que fecha o plano do núcleo e registra
estas decisões; quem retomar confere primeiro se o CI dele fechou verde e se a main o recebeu. A modelagem dos objetos de prova é
pesada para a máquina da nuvem, de quatro núcleos; a pessoa tentou ligar o computador dela à sessão e o recurso não estava
disponível, então a saída é uma sessão aberta direto no computador dela para essa parte.

Em 2026-11-13, mais tarde, a pessoa avisou que a sessão do núcleo não volta e que a sessão do furgão fica com o plano inteiro. Ela levantou a metade de regras, documentos e agentes e a pergunta 7, refez por amostra cinco números da outra metade, e escreveu o [relatório](../banco-de-provas/revisao-do-projeto-2026-11-13/RELATORIO.md) com a recomendação por grupo, que espera a decisão da pessoa (fatia 3). A revisão cruzada entre duas sessões não aconteceu. A fatia 4 não começou.

## Filtro Agent-First

USAR DIRETO: o histórico do CI, a saída da bateria de gates, os roteiros do `comecar`, o catálogo de capacidades, o registro
de custo e os atritos já registrados; a análise mede com o que existe. ADIAR: qualquer ferramenta nova de medição, salvo se
uma das sete perguntas não puder ser respondida sem ela.

## Incluído

- o inventário medido das sete perguntas, com o comando que reproduz cada número;
- a classificação de cada item e a recomendação por grupo;
- a revisão cruzada: cada sessão levanta uma metade e tenta derrubar os achados da outra;
- a decisão da pessoa registrada por grupo, e a abertura dos planos ou correções que ela aprovar;
- a validação por modelagem: objetos de prova escolhidos pelo que ainda não foi provado, cada um medido pela tabela de custo
  por peça (`npm run custo:peca`), com a melhoria geral que ele pedir entrando na ferramenta e a mesma parte refeita.

## Excluído

- executar dentro deste plano as mudanças de regra, de gate e de organização que o inventário recomendar;
- os planos de objeto em curso; a modelagem que entra aqui é a dos objetos de prova da frente de validação;
- reescrever documentação antes da decisão sobre o que fica.

## Gate de saída

1. O relatório existe, cabe em leitura de uma sentada, e cada classificação cita o número e o comando que o reproduz.
2. Nenhuma regra ou gate é recomendado para sair sem a lista do que ele já pegou.
3. A decisão da pessoa está registrada por grupo.
4. Cada mudança aprovada tem plano, item de backlog ou correção apontada, e as recusadas têm o motivo.
5. Cada objeto de prova tem o custo medido, a lista do que melhorou na ferramenta geral e o que ficou para plano próprio.

## Fatias

1. O inventário medido, dividido entre as duas sessões: regras, documentos e agentes com a sessão do furgão; pastas, módulos e
   núcleo com a sessão do núcleo, que aceitou a divisão em 2026-11-12; a pergunta 7 é das duas.
2. A revisão cruzada e a classificação, com a recomendação por grupo.
3. A decisão da pessoa.
4. A validação por objetos de prova, em ciclos curtos de escolher o objeto pelo que falta provar, modelar, medir, melhorar a
   ferramenta geral e refazer. Corre ao lado das fatias 1 a 3. Em 2026-11-13 a pessoa respondeu "sim para as duas" às duas
   recomendações de quem orquestrava. A primeira: esta frente absorve o que restava do
   [plano do núcleo para qualquer mecanismo](encerrados/2026-11-10-nucleo-para-qualquer-mecanismo.md), fechado por isso, a
   saber as juntas na montagem, a leitura de referência, a forma por classe, as famílias e os objetos de prova, com as saídas
   que ele descreve em cada uma. A segunda: o primeiro objeto de prova é um mecanismo com juntas que se movem, porque o sedã
   provou chapa e superfície dura e junta ainda não foi provada. A proposta para o primeiro ciclo, a ajustar por quem retomar:
   medir assento, guia prismática e articulação com eixo e curso na empilhadeira, que já está no acervo e não pede modelagem
   pesada, e em seguida modelar um mecanismo pequeno de cadeia fechada, como um macaco do tipo tesoura. O robô humanoide, a
   moto e o carro esportivo do plano fechado ficam para os ciclos seguintes, cada um depois da capacidade que ele prova.
5. A abertura dos planos de execução e o fechamento.

## Riscos e parada

Tirar uma regra que pega um defeito raro e caro: por isso nada sai sem a lista do que já pegou. A análise virar mais uma camada
de documentos: o relatório tem tamanho limitado e é o único documento novo. As duas sessões mexerem nas mesmas áreas: a análise
não muda código, e a execução sai em planos com território. Se o inventário mostrar que uma das sete perguntas pede semanas de
medição, ela sai deste plano e vira plano próprio. A máquina tem quatro núcleos e a conta tem limite de uso: agente de leitura
roda em paralelo, e medida pesada de modelagem roda uma de cada vez.

## Fechamento

Preencher ao concluir ou cancelar.

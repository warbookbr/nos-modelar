# Leitura por demanda e limpeza — a IA lê só o que a tarefa pede e o repositório perde o que ninguém usa

**Estado:** ativo

**Responsável:** Claude, com a pessoa aprovando o resultado da medida final

**Repositório e base:** `warbookbr/nos-modelar`, main depois do fechamento do plano [carroceria por rede de curvas](encerrados/2026-10-24-carroceria-por-rede-de-curvas.md)

## Problema observado

Uma sessão nova, sem memória, leu cerca de 120 KB só para se situar e mais 85 KB para achar o fluxo de modelagem, e nessa leitura achou quatro contradições, corrigidas em 2026-10-22. Dois inventários feitos a seguir, guardados fora do repositório, mediram o resto. O roteiro `modelar/peca` manda ler 62 KB antes do primeiro passo, e o caminho típico de uma peça nova chega a 177 KB com a skill de alinhamento, a referência das operações e o documento de parada. Nos 67 documentos que esses caminhos leem há 612 regras: 588 são próprias do Mecanifica, 313 são cobradas por gate, teste ou recusa de ferramenta, 202 não são cobradas por nada, 420 aparecem em mais de um documento e 74 estão desatualizadas ou contradizem o código ou outro documento. A entrada de contexto tem sete versões (o `CLAUDE.md` manda o `comecar`, o `AGENTS.md` e o revisor mandam o `INDEX.md`, o índice de uso manda a skill), o que o crítico recebe tem cinco definições e dois vocabulários de veredito, e a regra de identidade por nome teve um gate (`id-cru:check`) apagado em 2026-08-17 com o acervo antigo que não voltou com o acervo novo.

No código, de 605 arquivos que não são teste, 55 só são usados por testes e 10 por ninguém. Áreas inteiras ficaram sem consumidor: o fluxo de autoria N1/N2 e seu esquema, o laboratório de calibração cega de agosto, o alvo do chassi de agosto, o desenho por restrições com as famílias de desenho, os importadores de objeto de código (cujo plano fechou com a decisão de não seguir) e os módulos de otimização de malha e de preparo de micropolígono, que só imprimem uma linha no `conferir-malha`. O tempo da bateria não está nelas: o teste que varre o acervo leva cerca de 15 minutos, 40% dos testes lentos, e `mcp:check` repete os arquivos de `mcp:visual:check`.

## Resultado

Uma IA nova chega ao primeiro passo de uma tarefa lendo o contrato mínimo e o trecho que a árvore de perguntas do `comecar` entrega para aquela tarefa, as regras de sim ou não chegam como recusa das ferramentas no momento do erro, e o repositório perde o código, os gates e os documentos de funcionalidade sem uso; a mesma tarefa feita por duas IAs novas, antes e depois, mostra menos leitura e não mais erro.

## Filtro Agent-First

A árvore é REFATORAR do `comecar`: cada chamada faz uma pergunta e lista as respostas, e a resposta vira o argumento da chamada seguinte (`comecar modelar`, `comecar modelar aparelho-de-caixa`), sem programa que espera teclado; o modelo é a ajuda por tópico que o esboço já tem (`npm run esboco -- --ajuda <tópico>`). Cada nó entrega uma seção de documento por âncora, não o documento inteiro. As listas de famílias, peças de exemplo e operações saem do acervo, das famílias registradas e do catálogo gerado, nunca escritas à mão. As regras de sim ou não viram ENVOLVER sobre as ferramentas que já existem: recusa com a regra, o motivo e a correção na mensagem. O contrato mínimo é USAR DIRETO: um texto curto lido sempre, só com o que nenhuma ferramenta consegue conferir. A limpeza é cortar, com a bateria completa no fim de cada fatia.

## Incluído

O contrato mínimo; a árvore do `comecar` com gate de cobertura e teto por caminho; as recusas para as regras próprias de maior risco ainda sem cobrança; uma definição única do laço do crítico; a correção ou remoção dos 74 trechos desatualizados; a remoção das áreas de código sem uso decididas pela pessoa com seus testes, gates, documentos e skills; um documento curto de como recriar os importadores; a fusão de `mcp:check` em `mcp:visual:check` e a medida por etapa do teste que varre o acervo; as medidas de antes e depois com IAs novas.

## Excluído

O roteiro opcional do esboço continua, com seu módulo e a calibração do crítico, mas sai da leitura obrigatória e só aparece na árvore quando a resposta for sem referência. Ficam fora a reescrita de receitas do acervo, mudança de forma de qualquer peça, o plano de ajustes no núcleo dos veículos e a purga de histórico, que se faz uma vez antes de tornar o repositório público, com a lista pendente guardada fora do repositório.

## Invariantes

Nenhuma regra some: cada regra que sai de um documento passa a outro lugar dito na fatia (contrato mínimo, nó da árvore ou recusa de ferramenta), e o inventário de regras, refeito no fim, confere. As 54 peças do acervo regeneram iguais. O núcleo continua sem Three.js. Nenhum caminho da árvore passa do teto declarado, e o `CLAUDE.md` continua sendo o ponto de entrada que o Claude Code carrega.

## Gate de saída

1. Medida de antes e depois registrada: a mesma tarefa de modelagem e a mesma tarefa de mudança, cada uma feita por uma IA nova pelo caminho atual e pelo novo, com bytes lidos até o primeiro passo, tokens totais e erros contados pelos gates e pelo crítico; o caminho novo lê pelo menos 60% menos até o primeiro passo e não erra mais.
2. A leitura obrigatória do caminho de modelar uma peça fica em até 15 KB, contando o contrato mínimo.
3. O gate da árvore reprova nó que não resolve, caminho acima do teto e documento de uso que nenhum nó entrega.
4. O inventário de regras refeito no fim não acha regra perdida nem contradição nova, e as regras próprias marcadas como de maior risco têm recusa com teste.
5. As áreas removidas não deixam import, script, gate, passo de CI nem link quebrado, e o `npm run gates -- --completo` passa.

## Fatias

1. **Medida de antes.** Duas tarefas pequenas e fixas, uma de modelar uma peça de família existente e uma de corrigir um defeito pequeno do núcleo, são feitas cada uma por uma IA nova pelo caminho atual; registram-se bytes lidos até o primeiro passo, tokens e erros. A tarefa e o roteiro de medida ficam versionados para a medida de depois.
2. **Contrato mínimo e entrada única.** O contrato de 2 a 3 KB substitui as regras gerais do `CLAUDE.md`, e `AGENTS.md`, `INDEX.md`, `usar/README.md`, `comunicacao.md` e os agentes passam a mandar para o mesmo lugar. A regra de procedência de referência (prancha de terceiro não entra, imagem gerada não vale como medida) vem da pasta `docs/mecanifica/referencias/`, que sai, com o documento de casos por operação movido para `usar/`.
3. **Árvore no `comecar`.** Perguntas por chamada, nós que entregam seções por âncora, listas geradas, saída para "outra coisa" que mostra a busca por tópico, e o gate de cobertura e teto. Os oito roteiros atuais viram ramos.
4. **Regras para as ferramentas.** As regras próprias de maior risco sem cobrança, na ordem do inventário, viram recusa com explicação e teste: a cadeia tabela, derivar e passos nas receitas do acervo, a identidade posicional (o gate que existia volta), o contorno com ponto repetido e a parte solta que passa no `descrever`. Cada regra coberta sai da leitura.
5. **Laço do crítico em uma definição.** O que o crítico recebe, o vocabulário do veredito e o limite de rodadas ficam num documento só, e as outras quatro definições passam a apontar para ele ou saem.
6. **Trechos desatualizados.** Os 74 trechos do inventário são corrigidos contra o código ou removidos com o documento que só existia para eles.
7. **Limpeza de código.** Saem, com testes, gates, passos de CI, documentos e skills ligados: os resíduos sem chamador, o fluxo N1/N2 e seu esquema, a parte morta do canal de percepção, o laboratório de calibração cega, o alvo do chassi de agosto, o desenho por restrições com as famílias de desenho, os importadores (com o documento curto de recriação) e os módulos de otimização de malha e de preparo de micropolígono, cujas três verificações úteis (face torta, triângulo sem área, malha aberta) passam ao módulo de topologia. As áreas que o inventário marcou para investigar (bancadas herdadas, tradutor de receitas externas, revalidação opcional do MCP, estudos históricos que rodam como teste, famílias que nenhuma peça chama) vão à pessoa com recomendação antes de sair.
8. **Tempo da bateria.** `mcp:check` entra em `mcp:visual:check`, e o teste que varre o acervo é medido por etapa e reorganizado sem perder o que prova.
9. **Medida de depois.** As tarefas da fatia 1 são refeitas por IAs novas pelo caminho novo, e o gate 1 é medido; o inventário de regras é refeito.
10. **Fechamento.** `UPSTREAM-NOS.md`, backlog, `npm run gates -- --completo` e o plano movido para `encerrados/`; o plano de ajustes no núcleo dos veículos volta a ser o seguinte.

## Decisões da pessoa

1. **Esboço.** Aprovada em 2026-10-22: fica como caminho opcional sem referência e sai da leitura obrigatória.
2. **Desenho por restrições.** Aprovada em 2026-10-22: sai, por não ter uso no produto.
3. **Importadores.** Aprovada em 2026-10-22: saem, com um documento curto de como recriá-los.
4. **Módulos de malha.** Aprovada em 2026-10-22: o otimizador e o preparo de micropolígono saem; as verificações úteis vão para a topologia, e a fusão de faces coplanares, se a fatia 10 do plano de ajustes a usar, entra no núcleo.
5. **Áreas a investigar.** Ficam para a fatia 7, com recomendação por área.

## Riscos e parada

O risco maior é uma regra sumir na mudança e voltar a falhar em silêncio; o inventário refeito no fim existe para isso. Para e volta à pessoa se a medida de depois não ler menos ou errar mais, se uma remoção quebrar uma peça do acervo, ou se uma fatia passar de dois dias.

## Andamento

Escrito em 2026-10-22 a partir dos inventários de leitura e de código, sem implementação. Ativado em 2026-10-25, depois do fechamento do plano da rede de curvas.

Fatia 1 em curso em 2026-10-25. As tarefas, o defeito injetado e o modo de medir estão no [roteiro da medida](../banco-de-provas/leitura-por-demanda-2026-10/ROTEIRO.md), e `npm run medir:transcricao` passou a contar o que a IA lê até o primeiro passo.

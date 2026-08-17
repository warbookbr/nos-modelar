# Histórico de revisão — olhar para trás e voltar

**Estado:** concluído

**Responsável:** execução assistida por IA

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`implementacao/historico-de-revisao` sobre `main`.

## Problema observado

Melhoria 4 de [`../RELATORIO-ANALISE-GRANDES-MELHORIAS.md`](../RELATORIO-ANALISE-GRANDES-MELHORIAS.md):
*"snapshots são imutáveis, mas falta uma interface segura para comparar revisões
de autoria, restaurar conteúdo anterior como nova transição e manter variantes
nomeadas."*

O agente publicava e não conseguia olhar para trás. Se uma revisão saísse
errada, o conteúdo anterior estava guardado ali do lado — imutável, íntegro,
endereçado por hash — e **inalcançável pela porta**. A correção seria reescrever
a versão antiga à mão.

## Achado que barateou o recorte

A parte cara já existia. `lerRevisaoAtivaAutoria` **já percorria a cadeia
inteira**, com detecção de ciclo e validação de transição, e descartava tudo
menos o último elo. O histórico estava sendo lido; só não estava sendo devolvido.

A travessia foi extraída para `lerCadeiaAutoria`, e a leitura da ativa passou a
ser o último elo dela. Uma definição só: duas travessias poderiam discordar
sobre qual é a revisão ativa, e a que discordasse em silêncio seria a pior.

## Decisão de projeto

**A diferença fala a língua da alteração.** `diferencaMontagem` devolve
`{alvo, campo, de, para}` — exatamente o formato que `planejar_alteracao_montagem`
recebe. Um agente que leu *"instancia 'movel' :: pose.deslocamento: de X para Y"*
já sabe escrever a alteração que desfaz isso, sem traduzir formato no meio.
Existe prova de que a diferença lida, devolvida como alteração, reconstrói o
documento original byte a byte.

**Estrutural sai separado, e isso é honestidade.** Instância acrescentada ou
removida **não** é expressável como alteração. Devolver tudo numa lista faria o
agente acreditar que qualquer diferença pode ser desfeita trocando um campo, e
ele descobriria o contrário no meio de uma correção.

**Restaurar não reescreve a história.** Voltar a uma revisão antiga é publicar
uma revisão **nova** com aquele conteúdo. A ferramenta devolve um plano, e o
plano segue pelos gates de sempre — inspecionar, conferir, aplicar. O estado
ativo não se move sem confirmação e revalidação atuais, como o relatório exigia.

## Filtro Agent-First

| Interface | Decisão | Razão |
|---|---|---|
| travessia da cadeia | **REFATORAR** | já existia dentro da leitura da ativa; extrair evita uma segunda travessia que poderia discordar |
| vocabulário `{alvo, campo, de, para}` | **USAR DIRETO** | ler diferença e escrever alteração passam a ser a mesma língua |
| `planejarAutoriaMontagem` e os gates | **USAR DIRETO** | restaurar termina em documento completo e segue o caminho já provado |
| mover o estado ativo direto | **ADIAR** (recusado) | rollback silencioso contraria a exigência de confirmação e revalidação |
| variantes nomeadas | **ADIAR** | a melhoria 4 também as pede; são contrato próprio, sem evidência de urgência |

## Incluído

- `lerCadeiaAutoria`, e `lerRevisaoAtivaAutoria` como o último elo dela;
- `diferencaMontagem`, separando alterações de mudanças estruturais;
- três ferramentas MCP: `historico_autoria_montagem`,
  `comparar_revisoes_montagem` e `planejar_restauracao_montagem`;
- 7 provas de comparação e prova caixa-preta das três pela porta real.

## Excluído

- variantes nomeadas e ramificação;
- mover o estado ativo sem passar pelos gates;
- histórico de receita declarativa;
- comparação de imagens ou de evidência visual entre revisões.

## Gate de saída

1. **comportamento mensurável** — o histórico lista a cadeia com a ativa no fim;
   a comparação sai no formato da alteração; restaurar devolve plano e **não**
   move a ativa;
2. **o fecho do ciclo** — a diferença lida, devolvida como alteração, reconstrói
   o documento original byte a byte;
3. **compatibilidade** — `lerRevisaoAtivaAutoria` mantém o contrato e os testes
   existentes do repositório de autoria seguem verdes;
4. **testes e documentação** — provas unitárias e caixa-preta;
5. **decisão Agent-First registrada** — tabela acima.

## Fechamento

Gates completos de [`../INDEX.md`](../INDEX.md) verdes.

**Retirada do Caso 3, decidida no mesmo recorte.** O Caso 3 da homologação não
tinha escopo definido — era "o próximo da fila" —, e a pergunta que ele faria
(a IA consegue criar peça pelo fluxo?) foi respondida depois com evidência mais
forte: no experimento de autoria geométrica, um consumidor caixa-preta criou
três receitas do zero pela porta MCP, e o estudo de campo repetiu o ciclo. Um
terceiro caso manual não acrescentaria evidência; manteria uma pendência que
sugere falta onde não falta. A série de homologação do fluxo é encerrada nos
Casos 1 e 2.

**Decisão: aprovar.** Continuam abertas as costuras de `lathe`, os materiais
genéricos (travados pelo `CLAUDE.md`) e A-16.

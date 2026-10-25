# Medida de leitura da leitura por demanda

Roteiro das fatias 1 e 9 do plano da [leitura por demanda e limpeza](../../planos/2026-10-22-leitura-por-demanda-e-limpeza.md). Duas tarefas pequenas e fixas são feitas, cada uma, por uma IA nova, sem memória e sem a conversa de quem conduz, uma vez pelo caminho de leitura de antes e uma vez pelo de depois. Mede-se quanto ela lê até o primeiro passo, quantos tokens gasta no total e quantos erros os gates e o crítico acham no que ela entrega. As tarefas estão em [`tarefa-modelar.md`](tarefa-modelar.md) e [`tarefa-corrigir.md`](tarefa-corrigir.md), e o texto delas vai ao agente sem mudança.

## Preparar a cópia

Cada tarefa roda numa cópia de trabalho própria, fora do repositório principal, criada a partir do commit medido, para que a IA não leia esta pasta nem a conversa. Na raiz do repositório:

```sh
C=/tmp/medida-leitura/<tarefa>
git worktree add --detach $C <commit>
rm -rf $C/docs/mecanifica/banco-de-provas/leitura-por-demanda-2026-10
ln -s "$PWD/node_modules" $C/node_modules
```

Na tarefa de corrigir, aplique o defeito na cópia com `git -C $C apply "$PWD/docs/mecanifica/banco-de-provas/leitura-por-demanda-2026-10/defeito.patch"` e faça um commit dele na cópia com a mensagem "Estado da medida". Ele troca o sinal da folga no passo `encostar`. Sem o commit, `git diff` mostra o defeito à IA, e a primeira tentativa de 2026-10-25 achou-o assim, sem ler nada, e foi descartada. Se o patch não aplicar mais, porque o código em volta mudou, refaça a mesma troca à mão e registre isso no resultado.

## Despachar

Despache um agente de uso geral, novo, sem `SendMessage` e sem nenhuma outra instrução. O pedido é o texto da tarefa seguido desta linha: "O repositório desta tarefa é a cópia de trabalho em `<C>`; leia e escreva só nela." O agente não recebe o plano, esta pasta, o defeito nem o que outro agente fez. Se ele perguntar algo, a resposta é que decida e diga o que decidiu.

## Medir

A transcrição do agente é o arquivo JSONL que o Claude Code grava para ele. `npm run medir:transcricao -- --raiz <C> <transcrição.jsonl>` dá os turnos, os tokens e, na linha "até o primeiro passo", os bytes de texto que voltaram das ferramentas, as imagens e as chamadas até a primeira escrita de arquivo na cópia (pela ferramenta de edição ou por comando de shell que edita no lugar ou redireciona para ela), com os arquivos lidos e o contexto do turno que escreveu. O contexto inclui o que o agente recebe sem pedir, como o `CLAUDE.md`.

Os erros contam na cópia, depois que o agente entrega. São as falhas de `npm run gates` e, na tarefa de modelar, também os achados de `npm run descrever -- <peça>` e a nota e os defeitos do crítico cego sobre as vistas da bancada. Na tarefa de corrigir, conta também se a correção é a do defeito ou um desvio dele, como trocar o teste ou mexer noutro lugar.

## Registrar

O resultado de cada rodada vai para o [`RESULTADO.md`](RESULTADO.md) desta pasta, com o commit medido, o tipo do agente, os números de cada tarefa e os arquivos que ele leu até o primeiro passo. As transcrições e as cópias ficam fora do repositório. O gate 1 do plano compara o depois com o antes: o caminho novo lê pelo menos 60% menos até o primeiro passo e não erra mais.

# Navegação de receitas — o agente acha o trecho da receita que precisa sem lê-la inteira

**Estado:** concluído

**Território:** `tools/modelar/mapa-da-receita.mjs`, `tools/modelar/mapa-da-receita.test.mjs`, `procedural/pecas/furgao-realista/receita.js`, `procedural/pecas/furgao-realista/receita/`, `docs/modelar/banco-de-provas/navegacao-de-receitas-2026-11-05/`, `.claude/agents/modelador.md`, `docs/modelar/usar/GUIA-AUTORIA-IA.md` na linha da convenção

**Responsável:** sessão de trabalho do furgão, a pedido da pessoa em 2026-11-05

**Repositório e base:** este repositório, a partir da main de 2026-11-05

## Problema observado

Na medição das transcrições de 2026-11-05 ([provas da porta de entrada](../../banco-de-provas/porta-de-entrada-2026-11-05/README.md)), a receita da própria peça pesou tanto quanto a descoberta das ferramentas: um modelador leu `procedural/pecas/furgao-realista/receita.js`, de mais de duas mil linhas, 47 vezes, somando 312 KB, por faixas de linha às cegas. O furgão é o caso maior, mas as receitas do avião, do braço e as de carro do acervo têm o mesmo jeito: uma `TABELA` longa, funções de derivação e `PASSOS`, num arquivo só.

## Resultado

Um comando dá o mapa de qualquer receita do acervo (as seções da `TABELA`, as funções, as partes do `PLANO` e os blocos de `PASSOS`, cada um com a linha), e uma convenção diz quando e como dividir a receita em arquivos por assunto; a leitura da receita pelo modelador cai, medida com o mesmo script.

## Filtro Agent-First

- O mapa da receita: **ENVOLVER** a receita carregada e o próprio texto dela, sem segunda fonte.
- A divisão por assunto: **REFATORAR** só as receitas que passarem do tamanho que a convenção fixar, uma por vez, sem mudar a malha.

## Incluído

- o comando do mapa, para qualquer receita;
- a convenção de divisão, com o tamanho que a dispara;
- a divisão da receita maior, a do furgão, com 2.369 linhas (a seguinte, a das asas do avião, tem 838), provada pela malha igual; o plano do furgão cedeu a receita enquanto está em pausa;
- a medição antes e depois num modelador real;
- uma linha na definição do modelador apontando o mapa da receita antes de ler a receita.

## Excluído

- mudar forma de peça;
- reescrever receita só por estilo.

## Gate de saída

1. O mapa de toda receita do acervo sai sem erro e cabe numa tela por receita.
2. A receita dividida dá a mesma malha, byte a byte.
3. Um modelador real lê a receita em menos da metade do volume da linha de base.
4. `npm run gates` verde.

## Fatias

1. Linha de base e o comando do mapa.
2. A convenção e a divisão da receita maior.
3. A medição e o fechamento.

## Riscos e parada

Se a divisão de uma receita mudar a malha, para e volta à pessoa.

## Andamento

As fatias 1 e 2 fecharam em 2026-11-05, com as provas em [`navegacao-de-receitas-2026-11-05/`](../../banco-de-provas/navegacao-de-receitas-2026-11-05/README.md). Na linha de base, o modelador leu a receita do furgão em 235 chamadas e 889 KB, 81 KB em média por transcrição que a leu, e a leitura de receita ou peça foi 19,5% do que as ferramentas lhe devolveram. `npm run receita:mapa -- <peça>` dá o mapa das 56 receitas do acervo, o teste confere a linha de cada nome citado e as 80 linhas, e o do furgão tem 75 linhas. A convenção divide a receita acima de 1.000 linhas e ficou no README das provas, porque o guia que o roteiro de peça nova lê está fora do território. A receita do furgão virou `receita.js` com 743 linhas e sete arquivos em `receita/`, com a malha canônica, os `PASSOS` e as declarações iguais antes e depois.

## Fechamento

Concluído em 2026-11-05. O comando `npm run receita:mapa -- <peça>` dá o mapa das 56 receitas do acervo, o do furgão em 75 linhas; a convenção divide a receita acima de 1.000 linhas e ficou apontada na seção 2 do guia de autoria; a receita do furgão saiu de 2.369 linhas para 743 em `receita.js` e sete arquivos de assunto, com o mesmo hash da malha canônica antes e depois.

A fatia 3 mediu um modelador real numa tarefa de estudo descartável na receita do furgão: baixar a grade, alargar as frestas e subir o piso, cada mudança pela chave da `TABELA`. Ele leu cerca de 30 KB da receita em 18 chamadas, contra a média de 81 KB por transcrição da linha de base, abaixo da metade que o gate pedia. O ganho veio da divisão: ele achou os trechos com `ls`, `wc` e `grep` nos arquivos de assunto, e não usou o mapa, embora a definição do modelador o aponte. A medida é de um agente só, numa tarefa menor que uma rodada de modelagem, e serve de direção.

A tarefa de estudo também achou três pontos da receita do furgão, que ficaram registrados no plano dele para quando ele voltar: a grade e os faróis dividiam `farol_topo_y`, o topo do túnel do forro e a folga do forro até o pneu dividem `forro_folga`, e os motivos dos contatos do piso citam medidas escritas à mão no texto, fora da `TABELA`.

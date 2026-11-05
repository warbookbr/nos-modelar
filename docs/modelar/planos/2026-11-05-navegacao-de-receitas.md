# Navegação de receitas — o agente acha o trecho da receita que precisa sem lê-la inteira

**Estado:** ativo

**Território:** `tools/modelar/mapa-da-receita.mjs`, `tools/modelar/mapa-da-receita.test.mjs`, `procedural/pecas/furgao-realista/receita.js`, `procedural/pecas/furgao-realista/receita/`, `docs/modelar/banco-de-provas/navegacao-de-receitas-2026-11-05/`, `.claude/agents/modelador.md`

**Responsável:** sessão de trabalho do furgão, a pedido da pessoa em 2026-11-05

**Repositório e base:** este repositório, a partir da main de 2026-11-05

## Problema observado

Na medição das transcrições de 2026-11-05 ([provas da porta de entrada](../banco-de-provas/porta-de-entrada-2026-11-05/README.md)), a receita da própria peça pesou tanto quanto a descoberta das ferramentas: um modelador leu `procedural/pecas/furgao-realista/receita.js`, de mais de duas mil linhas, 47 vezes, somando 312 KB, por faixas de linha às cegas. O furgão é o caso maior, mas as receitas do avião, do braço e as de carro do acervo têm o mesmo jeito: uma `TABELA` longa, funções de derivação e `PASSOS`, num arquivo só.

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

## Fechamento

Preencher ao concluir ou cancelar.

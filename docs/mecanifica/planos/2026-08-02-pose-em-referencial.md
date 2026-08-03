# AUT-2026-08 — pose de encaixe em referencial transformado

**Estado:** concluído

**Responsável:** Codex

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`codex/concluir-pendencias-autoria`, base `55aa18b`

## Problema observado

`AUT-2026-07` deriva corretamente a pose de uma peça móvel quando todas as
transformações estão no mundo. A mesma regra ainda não prova que preserva uma
transformação local quando a instância é colocada em um referencial externo já
rotacionado e transladado. Isso é a lacuna restante do nível 3 antes de falar
em pai semântico ou hierarquia.

## Resultado

Uma instância pode declarar um referencial rígido externo e uma transformação
local. A prévia resolve no mundo, mas devolve a transformação local necessária
para o mesmo encaixe, sem criar pai, árvore ou identidade implícita.

## Incluído

- composição e inversão de transformação rígida neutras;
- campo opcional `referencial` em instância, com rotação própria e deslocamento
  explícitos; a escala permanece local à instância;
- provas em pino/luva com referência rotacionada/transladada e três poses
  locais da luva;
- testes de equivalência mundo/local, idempotência e falha sem mutação.

## Excluído

- pai nomeado, árvore, herança, submontagem ou propagação de dependências;
- espelho, escala não uniforme, múltiplos referenciais ou relação múltipla;
- persistir montagem, UI, exportação de montagem, colisão ou solver iterativo.

## Gate de saída

1. a mesma relação, sob referencial rígido transformado, chega à mesma pose de
   encaixe no mundo que a versão sem referencial;
2. a prévia devolve dados locais e repetidos, sem mudar a entrada;
3. rotação/reflexão e referências inválidas são recusadas com causa explícita;
4. fixture neutra, testes, exportação, documentação e gates gerais passam.

## Fatias

1. congelar a diferença entre referencial técnico e pai semântico;
2. compor/descompor a transformação rígida mínima no resolvedor de portas;
3. derivar e reaplicar prévia local na fixture neutra;
4. provar, documentar e encerrar sem absorver hierarquia.

## Riscos e parada

- se um referencial precisar de identidade, coleção de filhos ou ciclo, ele já
  é hierarquia e o plano para;
- se a inversão depender de matriz de Three.js, UUID ou escala não uniforme, o
  contrato volta a ser reduzido antes de avançar;
- se mundo e local divergirem por ordem de multiplicação, a prova comparativa é
  obrigatória e nenhuma correção por tolerância é aceita.

## Fechamento

Concluído em 2 de agosto de 2026. `referencial` agora aceita somente rotação
própria e deslocamento: por ser rígido, não tem escala, identidade, filhos ou
recursão. A instância conserva sua transformação local (com escala uniforme) e
o resolvedor compõe ambas para medir no mundo. A prévia faz a inversão antes de
devolver a nova transformação **local**.

A fixture pino/luva exerce três poses locais diferentes dentro do mesmo
referencial rotacionado e transladado; todas chegam ao mesmo encaixe mundial e
preservam o referencial na cópia aplicada. Reflexão e escala no referencial
reprovam antes de qualquer porta ou prévia parcial. Isso prova composição
local/mundo, não pai semântico, árvore, persistência ou rollback de estado
salvo.

Gates verdes: 985 testes, tipos, build, gabarito de seleção, ID cru, guardas de
portas e câmera, exportação, mapa, TOC, links e planos. Não há alteração visual
de geometria; a prova é numérica e headless. Hierarquia, múltiplas relações,
espelho, persistência, colisão e solver permanecem no mapa de maturidade.

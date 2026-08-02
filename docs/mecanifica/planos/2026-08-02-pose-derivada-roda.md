# AUT-2026-07 — pose derivada de um encaixe cilíndrico

**Estado:** concluído

**Responsável:** Codex

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`codex/concluir-pendencias-autoria`, base `cb086e6`

## Problema observado

O Recorte A de AUT-05 prova se a roda já está corretamente encaixada, mas não
consegue indicar onde uma roda deslocada deve ficar. Um cilindro com apenas
eixo e centro também deixa giro e posição axial ambíguos. A evidência e a
escada de maturidade estão em
[`MONTAGENS-SEMANTICAS.md`](../MONTAGENS-SEMANTICAS.md), níveis 1–3.

## Resultado

Uma única relação cilíndrica dirigida, entre referência fixa e peça móvel,
calcula uma prévia de pose canônica a partir de quadros completos e de um
alinhamento axial/giro explicitamente declarados. A operação é pura: erro ou
prévia nunca alteram a montagem de entrada.

## Incluído

- completar opcionalmente o quadro de uma porta cilíndrica com vetor de
  referência perpendicular ao eixo;
- aceitar, neste recorte, apenas escala uniforme positiva, rotação própria 3×3
  e deslocamento explícito de uma instância;
- derivar uma pose para a porta móvel de **uma** relação `encaixaCilindrico`,
  com referência fixa, pontos axiais e giro zero declarados;
- provar três poses iniciais, idempotência, relação impossível e fixture neutra
  pino/luva;
- manter a validação read-only existente como confirmação da prévia.

## Excluído

- duas ou mais relações, escolha de porta implícita, hierarquia, pai móvel,
  espelho, escala não uniforme e qualquer solver iterativo;
- aplicação persistente da prévia, UI de montagem, exportação de montagens ou
  detector global de colisão;
- inferir vetor de referência a partir de faces ou de coordenadas de runtime.

## Gate de saída

1. as portas usadas pelo recorte possuem quadro ortonormal explícito; vetores
   degenerados ou não perpendiculares são recusados;
2. três poses válidas mas diferentes da roda e do pino chegam à mesma pose
   canônica, preservando a escala declarada;
3. repetir a derivação não muda o resultado; relação impossível devolve erro
   estruturado e não muta a entrada;
4. a pose prévia satisfaz o validador de encaixe; testes, build, tipos, gates e
   revisão visual proporcional continuam verdes.

## Fatias

1. congelar convenção do quadro, do ponto axial e do giro, com limites claros;
2. transportar quadro e transformação rígida mínima pelo estado neutro;
3. derivar a prévia pura e validar seus invariantes em pino/luva;
4. aplicar ao piloto roda/cubo, medir, revisar e fechar sem absorver níveis 4+
   ou hierarquia.

## Riscos e parada

- se a pose exigir escolher silenciosamente entre giros, pontos axiais ou
  portas, o plano para e transforma a escolha em dado declarado;
- se a primeira versão precisar de matriz de runtime, UUID, pai ou ordem de
  array, ela para: só dados neutros e identidades semânticas podem entrar;
- se a relação medida não validar a pose derivada, a falha é do contrato e não
  pode ser mascarada por tolerância ou correção geométrica;
- se rotação/reflexão exigir tratar casos gerais antes do piloto, o escopo volta
  para uma transformação rígida mínima e o restante retorna ao backlog.

## Fechamento

Concluído em 2 de agosto de 2026. Portas cilíndricas podem declarar
`referencia`, vetor perpendicular ao eixo, e assim oferecem o quadro mínimo
necessário ao piloto. A nova prévia calcula rotação própria e deslocamento da
instância móvel a partir de uma relação dirigida e de pontos axiais/giro
explícitos; ela retorna dados, não persiste nem muda a entrada.

Roda/cubo preserva a pose-base revisada por centro↔centro e giro zero. Pino/luva
prova três poses iniciais distintas chegando ao mesmo resultado. A prova também
cobre idempotência, quadro ausente, reflexão recusada e ausência de escala não
uniforme. `npm run descrever:montagem -- roda-no-freio` mostra a prévia como
"não persistida" e a validação read-only continua confirmando o encaixe.

Gates verdes: 983 testes, tipos, build, gabarito de seleção, ID cru, guardas de
portas e câmera, exportação, mapa, TOC, links e planos. Não houve alteração
visual de geometria, portanto a revisão visual anterior de freio/roda permanece
válida; a mudança é de contrato neutro e é provada numericamente. Pai, espelho,
escala não uniforme, persistência, hierarquia, múltiplas relações, colisão e
solver retornam ao mapa de maturidade.

# AUT-2026-13 — recusa estrutural de montagem

**Estado:** concluído

**Responsável:** Codex

**Repositório e base:** warbookbr/nos-mecanifica, branch
codex/concluir-pendencias-autoria, base 286b50c

## Problema observado

Uma relação com portas de formas incompatíveis era marcada como tal, mas o leitor
continuava a calcular dimensões específicas da forma. Isso podia introduzir
NaN no resultado estruturado e uma prévia cilíndrica ainda podia ser proposta
para uma porta alterada para forma não cilíndrica.

## Resultado

Toda incompatibilidade estrutural encerra a medição antes de acessar dimensões da
forma errada; a recusa mantém causa, especificação declarada, alerta amplo quando
pedido e medidas explicitamente indisponíveis.

## Incluído

- barreira estrutural para encaixe cilíndrico, assentamento anular e prévia;
- resultado serializável, sem medida não finita;
- regressão com portas reais de formatos cruzados.

## Excluído

- novos tipos de porta, correção automática, solver ou migração de receitas.

## Gate de saída

1. forma ou direção incompatível não gera cálculo dimensional derivado;
2. prévia incompatível é recusada, sem mover instância;
3. diagnósticos normais e legados permanecem estáveis;
4. testes, tipos e documentação passam.

## Fatias

1. congelar as reproduções de forma cruzada;
2. interromper cálculo e prévia na fronteira estrutural;
3. provar serialização, diagnóstico e compatibilidade;
4. encerrar e publicar.

## Riscos e parada

Se a barreira alterar a medição de uma relação estruturalmente válida, preservar
o resultado anterior e reduzir o escopo à recusa inválida.

## Fechamento

Concluído em 2 de agosto de 2026. Portas com forma ou direção incompatível agora
encerram o leitor antes de qualquer medida específica da forma; o resultado
serializável declara medidas indisponíveis, e o diagnóstico por caixa permanece
se solicitado. A prévia cilíndrica recusa a mesma fronteira antes de ler quadro
ou pose. As regressões cobrem cilindro contra anel, anel contra cilindro, ausência
de contato local e prévia recusada; o texto essencial legado de pino/luva ficou
byte a byte congelado.

Gates: 44 arquivos e 998 testes, tipos, build, gabarito, ids, guardas de portas e
câmera, exportação, índices, links, planos, mapa e diff sem espaço em branco.

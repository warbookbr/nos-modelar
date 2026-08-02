# AUT-2026-04 — canto composto de aresta arredondada

**Estado:** ativo

**Responsável:** Codex

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`codex/concluir-pendencias-autoria`, base `dcca421`

## Problema observado

`arredondarAresta` já produz uma faixa de arco íntegra em uma aresta de ponta
simples. Uma aresta nominal de `chamferBox` chega às duas pontas com duas faces
adicionais; a operação recusa corretamente antes de escrever geometria. A-37 e
`FILETE-V2.md` guardam a reprodução.

## Resultado

Uma aresta de `chamferBox` pode receber `arredondarAresta` de dois ou mais
painéis e sair como casca fechada, com os painéis ainda citáveis por identidade
semântica e sem mudar nenhuma peça que hoje já constrói.

## Incluído

- caracterizar o leque ordenado de cada ponta e definir a costura do canto;
- construir e provar o caso composto mínimo numa fixture neutra;
- preservar o caminho de ponta simples e os IDs publicados por ele;
- verificar malha, polígonos simples, limite de raio, replay e adaptador;
- revisão visual em vistas isométrica, superior e lateral.

## Excluído

- mudar o significado do `filete` v1;
- arredondar arestas de produto, incluindo a pinça, nesta rodada;
- encontro entre duas operações de arredondamento ou raio variável;
- booleana genérica, reparo por solda/tolerância ou relaxar a recusa atual sem
  uma costura de canto completa.

## Gate de saída

1. o `chamferBox` mínimo antes recusado constrói uma casca fechada, sem face
   autoencostada ou triângulo degenerado no adaptador;
2. a faixa conserva `painel:0..n-1`, determinismo e rejeição atômica das
   entradas fora do contrato;
3. os testes e o gabarito provam que peças existentes permanecem byte-idênticas;
4. uma fixture não automotiva exerce os dois cantos compostos e passa em três
   vistas da bancada;
5. se a topologia exigir consumir ou renumerar faces antigas fora do contrato,
   o plano para e registra a decisão, sem ampliar o escopo.

## Fatias

1. reproduzir o bloqueio e medir a vizinhança dos dois cantos;
2. escrever a costura determinística do `chamferBox` mínimo;
3. provar identidade, malha, limite e compatibilidade do caminho antigo;
4. criar fixture, revisar visualmente, atualizar documentação e encerrar.

## Riscos e parada

- o canto composto pode exigir uma topologia nova, não uma exceção no ramo de
  ponta simples;
- alterar faces preexistentes sem uma identidade derivada verificável quebra o
  contrato de autoria;
- se uma prova revelar junção em T, polígono não simples ou custo sem fórmula,
  a implementação para antes de tocar produto.

## Fechamento

A preencher somente depois dos gates.

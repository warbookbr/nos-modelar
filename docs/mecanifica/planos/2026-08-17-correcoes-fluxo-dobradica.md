# Correções do fluxo encontradas no estudo de dobradiça

**Estado:** concluído

**Responsável:** Codex

**Base:** `warbookbr/nos-mecanifica`, `main` em `7adc657`.

## Objetivo

Corrigir apenas atritos cujo mecanismo, limite e ação já foram demonstrados no
estudo `2026-08-17-estudo-conjunto-dobradica.md`, sem transformar a fixture em
requisito de produto.

## Incluído

1. alinhar os documentos de estado ao mapa canônico, à cascata persistida e à
   autoria opt-in já entregues, declarando seus limites reais;
2. tornar a referência procedural canônica suficiente para `encostar`, pose de
   criação e `arranja`, e indicar um molde procedural correto;
3. expor uma medição reutilizável para módulo de receita já carregado, sem abrir
   o catálogo padrão a caminhos arbitrários;
4. enquadrar o visor privado por envelope projetado e distinguir vista fina
   legível de projeção quase unidimensional.

## Excluído

- catálogo ou contrato genérico de materiais;
- união topológica/CSG geral ou contrato de peça multicorpo;
- cinemática, limites, colisão ou espaço varrido;
- descoberta fora de universo explícito, correção ou promoção automática de
  dependentes.

## Critérios de saída

- `npm run criar -- _viga` volta a passar pelo contrato documentado;
- a receita confinada usa o serviço reutilizável, sem ampliar a CLI pública;
- o pino do estudo passa em isométrica, frontal e superior por ocupar o quadro
  conforme o envelope daquela vista, sem corte ou distorção;
- os documentos descrevem capacidades existentes e suas fronteiras sem alegar
  solver, descoberta geral ou material genérico;
- testes e gates documentais aplicáveis passam.

## Decisão de escopo

Autorizado pelo usuário em 17 de agosto de 2026 após a leitura do relatório.
Materiais ficam pendentes; os demais itens acima têm evidência causal e uma
correção local verificável.

## Fechamento

Os quatro recortes foram entregues. O contrato operacional agora cobre
`encostar`, pose de criação e cópias nomeadas; o molde indicado é procedural e
o manifesto de `npm run criar -- _viga` passou. Módulos já carregados podem ser
medidos sem abrir a CLI pública a caminhos arbitrários, e o experimento passou
a usar essa porta. O visor privado enquadra pelo envelope de cada vista: o pino
passou em isométrica, frontal e superior sem corte.

Passaram: testes focados e a suíte completa, `typecheck`, `build`, `porteiro`,
gabarito de seleção, guardas, exportação, mapa, links, TOC, planos e `criar`.
O gabarito ganhou somente `_modelo-procedural`, declarado como fixture nova.

**Decisão: `aprovar`.** União topológica, cinemática e materiais genéricos não
foram alterados e requerem decisão de contrato própria.

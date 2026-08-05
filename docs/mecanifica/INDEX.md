# Mecanifica — entrada atual

A Mecanifica é uma oficina 3D para explicar sistemas mecânicos a clientes. Este
repositório mantém o núcleo procedural, receitas de peças, visor compatível,
bancada de inspeção e ferramentas de validação. A aplicação jogável, a Oficina
humana e o som foram removidos. `bancada.html` é a única aplicação publicada
aqui; o produto do cliente vive em [warbookbr/mecanica](https://github.com/warbookbr/mecanica).

## Estado atual

- Casos 1 e 2 da homologação estão concluídos; Caso 3 não foi iniciado.
- As Fatias 1A e 1B do MCP foram aprovadas e encerradas.
- Não há plano executivo ativo.
- A ponte `adaptarThree` e a bancada publicada existem e são usadas pelos gates.
- A hierarquia semântica mínima e a consulta de subárvore existem na bancada.
- O import bare `earcut` falha no servidor estático local do visor/porteiro; isso
  é uma pendência de infraestrutura, não uma mudança de peça.
- Não existe contrato genérico de materiais. A validação de materiais é futura.

## Estrutura principal

| Caminho | Papel |
|---|---|
| `prototipos/fps/v3/motor/` | núcleo procedural e adaptadores compatíveis |
| `prototipos/fps/v3/pecas/` | receitas determinísticas de peças |
| `bancada.html`, `src/` | bancada neutra e ponte de apresentação |
| `tools/bancadas/` | porteiro, criação, exportação e gabaritos |
| `tools/mecanifica/` | gates da bancada, revisão e contratos |
| `autoria-assistida/` | pacotes e evidências de homologação |
| `docs/mecanifica/planos/` | contrato de planos e backlog aberto |
| `docs/mecanifica/historico/` | evidências encerradas, sem autoridade nova |

## Fontes de verdade

1. Este índice para a entrada e o estado atual.
2. `docs/mecanifica/ARQUITETURA.md` para fronteiras técnicas.
3. `docs/mecanifica/AUTORIA-IA.md` para o contrato de autoria.
4. `docs/mecanifica/BANCADA-E-APRESENTACAO.md` para revisão visual.
5. `docs/mecanifica/planos/README.md`,
   `docs/mecanifica/planos/mcp/INDEX.md` e qualquer futuro plano ativo para planejamento.
6. `docs/mecanifica/COORDENACAO-LOCAL.md` e `COORDENACAO-REPOS.md` para trabalho paralelo.
7. `docs/uso/oficina-contrato.md` para o vocabulário procedural vigente.
8. `docs/uso/MAPA.md` para o inventário gerado.
9. `docs/mecanifica/historico/` e `docs/historico/` somente como evidência.

## Leitura por tarefa

- Produto e escopo: `VISAO.md`, este índice e `planos/README.md`.
- Programa MCP: `docs/mecanifica/planos/mcp/INDEX.md`, o encerramento da Fatia
  1A e `docs/mecanifica/planos/2026-08-05-mcp-fatia-1b-visual.md`.
- Núcleo ou dependência: `ARQUITETURA.md`, `AUTORIA-IA.md` e `oficina-contrato.md`.
- Peça nova ou refinamento: `AUTORIA-IA.md`, `PERFIS-DE-AUTORIA.md`,
  `REFERENCIA-E-CRITICA-VISUAL.md` e `BANCADA-E-APRESENTACAO.md`.
- Homologação: `HOMOLOGACAO-FLUXO-IA.md` e `FLUXO-MODELAGEM-IA.md`.
- Montagens: `MONTAGENS-SEMANTICAS.md`.
- Freio ou roda: a prancha correspondente e o protocolo visual.
- Trabalho histórico: o README da zona histórica antes de abrir evidências.

## Comandos principais

```text
npm test
npm run typecheck
npm run build
npm run criar -- _viga
npm run peca -- freio-disco
npm run porteiro
npm run exportar:check
npm run gabarito:selecao:check
```

## Gates completos

```text
npm test
npm run typecheck
npm run build
npm run porteiro
npm run gabarito:selecao:check
npm run id-cru:check
npm run guarda:portas
npm run guarda:camera
npm run guarda:par
npm run mapa:check
npm run docs:toc:check
npm run docs:links:check
npm run planos:check
npm run exportar:check
npm run criar -- _viga
```

## Pendências atuais

- Resolver o import `earcut` no servidor estático local.
- Iniciar e executar o Caso 3 da homologação.
- Executar a Fatia 1B visual do programa MCP e medir contexto, payload e fallback.
- Resolver costuras topológicas de `lathe`.
- Dar endereço único a um grupo linear.
- Expressar abertura oblonga sem simulação visual.
- Criar contrato genérico de materiais.
- Fechar as capacidades ainda abertas comprovadas em A-4, A-6, A-7, A-8, A-16 e A-29.
- Tarefas do produto devem apontar para `warbookbr/mecanica`.

## Histórico

Resultados encerrados da própria Mecanifica ficam em
[`historico/README.md`](historico/README.md). Decisões do NÓS ficam em
`docs/historico/`; nenhuma dessas zonas autoriza trabalho novo.

## Inventário curado

Contratos e protocolos: [ARQUITETURA](ARQUITETURA.md), [AUTORIA-IA](AUTORIA-IA.md),
[BANCADA-E-APRESENTACAO](BANCADA-E-APRESENTACAO.md), [FLUXO-MODELAGEM-IA](FLUXO-MODELAGEM-IA.md),
[HOMOLOGACAO-FLUXO-IA](HOMOLOGACAO-FLUXO-IA.md), [MONTAGENS-SEMANTICAS](MONTAGENS-SEMANTICAS.md),
[UPSTREAM-NOS](UPSTREAM-NOS.md), [ATRITOS-AUTORIA](ATRITOS-AUTORIA.md), [VISAO](VISAO.md),
[PERFIS-DE-AUTORIA](PERFIS-DE-AUTORIA.md), [REFERENCIA-E-CRITICA-VISUAL](REFERENCIA-E-CRITICA-VISUAL.md),
[FILETE-V2](FILETE-V2.md), [PRANCHA-FREIO-DISCO](PRANCHA-FREIO-DISCO.md), [PRANCHA-RODA-DIANTEIRA](PRANCHA-RODA-DIANTEIRA.md),
[COORDENACAO-LOCAL](COORDENACAO-LOCAL.md), [COORDENACAO-REPOS](COORDENACAO-REPOS.md), [PLANO](PLANO.md).

Planejamento: [planos/README](planos/README.md), [programa MCP](planos/mcp/INDEX.md),
[Fatia 1B visual](planos/2026-08-05-mcp-fatia-1b-visual.md),
[encerramento da Fatia 1A](planos/mcp/concluidos/01-fatia-1a-piloto-leitura.md),
[BACKLOG](planos/BACKLOG.md), [MODELO](planos/MODELO.md) e
[concluídos](planos/concluidos/ENCERRAMENTO-PLANO-MESTRE-2026-08-02.md).

Índices e contratos herdados: [RECURSOS](../uso/RECURSOS.md), [oficina-contrato](../uso/oficina-contrato.md),
[oficina-referencia](../uso/oficina-referencia.md), [MAPA](../uso/MAPA.md), [oficina](../oficina.md).
O contexto histórico do NÓS está em [DECISIONS](../historico/DECISIONS.md),
[DECISIONS-ARCHIVE](../historico/DECISIONS-ARCHIVE.md), [TETO](../historico/TETO.md),
[oficina-projeto](../historico/oficina-projeto.md), [playground](../historico/playground.md),
[diagnostico](../historico/diagnostico-subpartes-semanticas.md), [proveniencia](../historico/proveniencia-local-fixture.md),
[fixtures](../historico/fixture-identidade-estavel-relatorio.md), [walkthrough](../historico/walkthrough_colaborador4.md),
[relatórios de fase 4](../historico/fase4-drone-inspecao-criacao-relatorio.md),
[refinos de moto](../historico/teto-moto-relatorio.md).

Outros registros preservados: [arquivo de decisões](../historico/DECISIONS-ARCHIVE.md),
[diagnóstico de subpartes](../historico/diagnostico-subpartes-semanticas.md),
[fase 4 criação](../historico/fase4-drone-inspecao-criacao-relatorio.md),
[fase 4 refino](../historico/fase4-drone-inspecao-refino-relatorio.md),
[fixture apaga](../historico/fixture-identidade-apaga-relatorio.md),
[fixture cubo](../historico/fixture-identidade-cubo-relatorio.md),
[fixture espelho](../historico/fixture-identidade-espelho-relatorio.md),
[fixture estável](../historico/fixture-identidade-estavel-relatorio.md),
[moto refino 3](../historico/teto-moto-refino-3-relatorio.md),
[moto refino](../historico/teto-moto-refino-relatorio.md),
[seleção semântica](../historico/teto-selecao-semantica-relatorio.md).

Rumo histórico: [NORTE](../rumo/NORTE.md), [PLANO](../rumo/PLANO.md),
[arquitetura-identidade-estavel](../rumo/arquitetura-identidade-estavel.md) e
[oficina-roteiro](../rumo/oficina-roteiro.md). A própria zona histórica da Mecanifica
é indexada em [historico/README](historico/README.md).

<!-- Inventário explícito para o gate de alcançabilidade: docs/mecanifica/ARQUITETURA.md docs/mecanifica/ATRITOS-AUTORIA.md docs/mecanifica/AUTORIA-IA.md docs/mecanifica/BANCADA-E-APRESENTACAO.md docs/mecanifica/COORDENACAO-LOCAL.md docs/mecanifica/COORDENACAO-REPOS.md docs/mecanifica/FILETE-V2.md docs/mecanifica/FLUXO-MODELAGEM-IA.md docs/mecanifica/HOMOLOGACAO-FLUXO-IA.md docs/mecanifica/MONTAGENS-SEMANTICAS.md docs/mecanifica/PERFIS-DE-AUTORIA.md docs/mecanifica/PLANO.md docs/mecanifica/PRANCHA-FREIO-DISCO.md docs/mecanifica/PRANCHA-RODA-DIANTEIRA.md docs/mecanifica/REFERENCIA-E-CRITICA-VISUAL.md docs/mecanifica/UPSTREAM-NOS.md docs/mecanifica/VISAO.md docs/mecanifica/historico/README.md docs/mecanifica/historico/EXPERIMENTO-AB-FLUXO-IA.md docs/mecanifica/historico/EXPERIMENTO-RODA-REALISTA.md docs/mecanifica/historico/OFICINA-OTIMIZACOES.md docs/mecanifica/historico/RELATO-RODA-REALISTA.md docs/mecanifica/historico/RELATORIO-PONTE-THREE.md docs/mecanifica/planos/README.md docs/mecanifica/planos/BACKLOG.md docs/mecanifica/planos/MODELO.md docs/mecanifica/planos/2026-08-04-mcp-para-agentes.md docs/mecanifica/planos/2026-08-05-mcp-fatia-1b-visual.md docs/mecanifica/planos/mcp/INDEX.md docs/mecanifica/planos/mcp/concluidos/01-fatia-1a-piloto-leitura.md docs/mecanifica/planos/concluidos/2026-08-02-assentamento-anular.md docs/mecanifica/planos/concluidos/2026-08-02-camera-livre-reproduzivel.md docs/mecanifica/planos/concluidos/2026-08-02-canto-composto.md docs/mecanifica/planos/concluidos/2026-08-02-concordancia-por-ponto.md docs/mecanifica/planos/concluidos/2026-08-02-contagem-por-desvio.md docs/mecanifica/planos/concluidos/2026-08-02-contato-local-cilindrico.md docs/mecanifica/planos/concluidos/2026-08-02-estados-de-encaixe.md docs/mecanifica/planos/concluidos/2026-08-02-identidade-porta-estavel.md docs/mecanifica/planos/concluidos/2026-08-02-interfaces-de-encaixe.md docs/mecanifica/planos/concluidos/2026-08-02-portas-espelho-arranja.md docs/mecanifica/planos/concluidos/2026-08-02-pose-derivada-roda.md docs/mecanifica/planos/concluidos/2026-08-02-pose-em-referencial.md docs/mecanifica/planos/concluidos/2026-08-02-recusa-estrutural-montagem.md docs/mecanifica/planos/concluidos/2026-08-02-tolerancias-de-montagem.md docs/mecanifica/planos/concluidos/2026-08-02-triangulacao-de-furos.md docs/mecanifica/planos/concluidos/2026-08-03-consulta-subarvore-ia.md docs/mecanifica/planos/concluidos/2026-08-03-hierarquia-semantica-minima.md docs/mecanifica/planos/concluidos/2026-08-03-inspecao-reproduzivel-de-par.md docs/mecanifica/planos/concluidos/2026-08-03-selecao-subarvore-semantica.md docs/mecanifica/planos/concluidos/ENCERRAMENTO-PLANO-MESTRE-2026-08-02.md docs/historico/DECISIONS-ARCHIVE.md docs/historico/DECISIONS.md docs/historico/TETO.md docs/historico/diagnostico-subpartes-semanticas.md docs/historico/fase4-drone-inspecao-criacao-relatorio.md docs/historico/fase4-drone-inspecao-refino-relatorio.md docs/historico/fixture-identidade-apaga-relatorio.md docs/historico/fixture-identidade-cubo-relatorio.md docs/historico/fixture-identidade-espelho-relatorio.md docs/historico/fixture-identidade-estavel-relatorio.md docs/historico/oficina-projeto.md docs/historico/playground.md docs/historico/proveniencia-local-fixture.md docs/historico/teto-moto-refino-3-relatorio.md docs/historico/teto-moto-refino-relatorio.md docs/historico/teto-moto-relatorio.md docs/historico/teto-selecao-semantica-relatorio.md docs/historico/walkthrough_colaborador4.md docs/rumo/NORTE.md docs/rumo/PLANO.md docs/rumo/arquitetura-identidade-estavel.md docs/rumo/oficina-roteiro.md docs/uso/MAPA.md docs/uso/RECURSOS.md docs/uso/oficina-contrato.md docs/uso/oficina-referencia.md docs/oficina.md -->

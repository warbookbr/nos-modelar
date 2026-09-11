# Mecanifica — entrada atual

Este repositório mantém a oficina procedural para IA: núcleo geométrico,
receitas determinísticas de peças, bancada de inspeção e ferramentas de medição,
revisão e validação.

O objetivo é melhorar e facilitar o trabalho da IA ao criar, organizar,
inspecionar, corrigir e manter objetos 3D mecânicos. Interface humana, jogo,
narrativa e apresentação externa não definem o escopo. A Oficina humana, a
aplicação jogável e o som foram removidos desta árvore. `bancada.html` é a única
aplicação publicada aqui.

## Se você só vai usar o Mecanifica

Criar, inspecionar, corrigir ou auditar uma peça **não passa por este
documento**. A porta é [`usar/README.md`](usar/README.md)
(`docs/mecanifica/usar/README.md`): a skill da tarefa e o contrato que ela
aplica, sem o material de desenvolvimento no caminho.

Este INDEX é para quem vai **mudar** o Mecanifica — núcleo, gates, arquitetura,
plano. O que está encerrado vive em
[`historico/README.md`](historico/README.md)
(`docs/mecanifica/historico/README.md`) e não governa trabalho novo.

## Estado atual

- Plano **ativo**: nenhum. [Esquecer precisa
  falhar](planos/encerrados/2026-09-08-esquecer-precisa-falhar.md) foi
  **concluído** em 2026-09-08: o veredito de contato virou o padrão em vez de
  depender da bandeira `--estrito`, a montagem passou a reprovar peça
  atravessando peça, e a contenção passou a amostrar o centroide do triângulo.
  Continua [o que nenhuma vista
  mostra](planos/encerrados/2026-09-07-o-que-nenhuma-vista-mostra.md), que fez
  contato não declarado reprovar com código de saída, conferiu por V−E+F a forma
  prometida e trouxe os pares acusados como imagem. O laboratório
  computacional saiu para
  [`warbookbr/nos-ciencia`](https://github.com/warbookbr/nos-ciencia) em
  2026-09-03; o piloto de peça que usou seus números continua aqui, em
  [`DOSSIE-CABO-DE-PA.md`](historico/DOSSIE-CABO-DE-PA.md).
- A [reorganização por uso](planos/encerrados/2026-08-31-reorganizacao-por-uso.md)
  (`docs/mecanifica/planos/encerrados/2026-08-31-reorganizacao-por-uso.md`)
  separou o acervo por quem o lê e deixou cinco gates; relato em
  [`REORGANIZACAO-POR-USO-PROGRESSO.md`](historico/REORGANIZACAO-POR-USO-PROGRESSO.md)
  (`docs/mecanifica/historico/REORGANIZACAO-POR-USO-PROGRESSO.md`). O modelador inverso
  está [congelado](planos/congelados/2026-08-25-modelador-inverso-priors-familia.md)
  (`docs/mecanifica/planos/congelados/README.md`), não refutado.
- A [exportação CAD/STEP modular](./planos/encerrados/2026-08-28-exportacao-cad-step.md)
  (`docs/mecanifica/planos/encerrados/2026-08-28-exportacao-cad-step.md`) foi
  **concluída e aprovada**. Entregou os módulos puros `modulos/exportador-cad/`
  e `modulos/exportador-obj/` e as CLIs `npm run exportar:step` e
  `npm run exportar:obj`. O STEP sai por `occt-wasm@4.3.2`: ferramenta
  MIT/Apache-2.0 com `.wasm` LGPL-2.1 consumido como pacote separado e
  substituível, o que não muda a licença deste repositório. Detalhe técnico em
  [`DOSSIE-EXPORTACAO-CAD-STEP.md`](DOSSIE-EXPORTACAO-CAD-STEP.md)
  (`docs/mecanifica/DOSSIE-EXPORTACAO-CAD-STEP.md`) e prova em
  [`RELATORIO-EXPORTACAO-CAD-STEP-R00.md`](./historico/RELATORIO-EXPORTACAO-CAD-STEP-R00.md)
  (`docs/mecanifica/historico/RELATORIO-EXPORTACAO-CAD-STEP-R00.md`).
- `npm run ativar:bancada` carrega peça ou montagem na bancada e sincroniza a
  sessão; o estado é local e não versionado. Procedimento em
  [`ATIVACAO-BANCADA-SESSAO-ATIVA.md`](./usar/ATIVACAO-BANCADA-SESSAO-ATIVA.md)
  (`docs/mecanifica/usar/ATIVACAO-BANCADA-SESSAO-ATIVA.md`); hospedagem estática
  e isolamento de rede em
  [`ARQUITETURA-SESSAO-E-SEGURANCA.md`](ARQUITETURA-SESSAO-E-SEGURANCA.md)
  (`docs/mecanifica/ARQUITETURA-SESSAO-E-SEGURANCA.md`).

A crônica dos planos concluídos e cancelados está em
[`planos/encerrados/README.md`](planos/encerrados/README.md)
(`docs/mecanifica/planos/encerrados/README.md`): evidência consultável, não
governa trabalho novo.

## Direção estabelecida

A unidade geométrica editável é a **peça**. A unidade de composição é a
**montagem**. Montagens podem conter outras montagens e formar sistemas, carros
completos e, depois que esse modelo estiver maduro, robôs.

Carro e motor não são receitas monolíticas. A IA deve trabalhar em alvos
reduzidos, escolher quais componentes observar juntos, manter o contexto
estrutural e revalidar as montagens afetadas depois de uma alteração.

Composição, relações e dependências devem existir como dado estruturado do
sistema. Documentação e diagramas podem ser gerados desse mapa, mas não podem
ser sua única fonte de verdade.

MCP, CLI, API ou edição assistida são portas possíveis. Nenhuma delas substitui
o núcleo nem define o modelo de autoria.

## Estrutura principal

| Caminho | Papel |
|---|---|
| `prototipos/procedural/v3/motor/` | núcleo procedural e adaptadores compatíveis |
| `prototipos/procedural/v3/pecas/` | receitas determinísticas de peças |
| `bancada.html`, `src/` | bancada neutra e adaptadores de inspeção |
| `tools/bancadas/` | porteiro, criação, exportação e gabaritos |
| `tools/mecanifica/` | gates da bancada, revisão e contratos |
| `tools/mcp/` | adaptador MCP sobre serviços existentes; hoje principalmente leitura |
| `autoria-assistida/` | pacotes e evidências de homologação de peças |
| `docs/mecanifica/planos/` | contrato de planos, programas e backlog aberto |
| `docs/mecanifica/pecas/` | folha de referência por peça pronta ([índice](pecas/README.md)) |
| `docs/mecanifica/historico/` | evidências encerradas, sem autoridade nova |

Montagem persistida v1 possui contrato e resolvedor em `src/autoria/` e provas
persistidas em `tools/mecanifica/fixtures/montagens-persistidas/`; o mapa global
de dependências possui contrato em `MAPA-CANONICO-DEPENDENCIAS.md` e serviços em
`src/autoria/`. Não invente uma localização por implicação.

Qual documento manda em cada assunto está na lista de fontes de verdade, em
[`INVENTARIO.md`](INVENTARIO.md) (`docs/mecanifica/INVENTARIO.md`): listar 21
fontes é inventário, não porta de entrada.

## Leitura por tarefa

- Estado, objetivo e horizonte: `VISAO.md`, este índice e `planos/README.md`.
- Autoria de peça: contrato em `usar/AUTORIA-DE-PECA.md`, razões em `AUTORIA-IA.md`.
- **Investigar defeito ou entender por que uma abordagem falha:**
  `METODO-DIAGNOSTICO-E-SEU-LIMITE.md`. Ele também diz quando **não** usar o
  método: decidir forma, proporção e caráter não é problema diagnóstico, e
  aplicar eliminação ali rende consertos certos num objeto que continua ruim.
- **Como a autoria de forma passa a funcionar:** o [dossiê do modelador inverso com priors por família](DOSSIE-MODELADOR-INVERSO-PRIORS-FAMILIA.md).
  O antigo [modelador por seleção](./historico/DOSSIE-MODELADOR-POR-SELECAO.md) é somente
  histórico.
- **Antes de abrir experimento novo:**
  [`GOTCHAS-AUTORIA-VISUAL.md`](./usar/GOTCHAS-AUTORIA-VISUAL.md)
  (`docs/mecanifica/usar/GOTCHAS-AUTORIA-VISUAL.md`), registro único e vivo do
  que já falhou — o de modelagem procedural foi fundido nele, e o
  [canário de casco](./historico/RELATORIO-N6-CANARIO-CASCO-VISUAL.md)
  (`docs/mecanifica/historico/RELATORIO-N6-CANARIO-CASCO-VISUAL.md`), a evidência
  negativa mais recente. Rodada gasta redescobrindo algo já medido é falha V-31.
- Peças versus montagens, carro, motor e dependências:
  `MONTAGENS-SEMANTICAS.md` e `ARQUITETURA.md`.
- Montagem persistida e contexto para IA: `MONTAGEM-PERSISTIDA-V1.md`,
  `MONTAGEM-PERSISTIDA-V2.md`, `MONTAGEM-PERSISTIDA-V3.md` e
  `CONTEXTO-MONTAGEM-IA.md`.
- Programa MCP: `docs/mecanifica/planos/mcp/INDEX.md` e os planos datados
  encerrados. O programa MCP não é o roteiro mestre da autoria.
- Núcleo ou dependência técnica: `ARQUITETURA.md`, `AUTORIA-IA.md` e
  `docs/uso/oficina-contrato.md`; para descobrir uma capacidade, abra
  `gerado/INDEX.md` antes de procurar em implementação.
- Reutilização procedural: `COMPOSICAO-PROCEDURAL-V1.md` e o catálogo de
  capacidades; não confundir composição de passos com montagem de peças.
- Capacidade ausente: `LACUNAS-DE-CAPACIDADE-V1.md` e o catálogo gerado; planeje
  primeiro, classifique com evidência e só então abra recorte de implementação.
- Descoberta MCP: `SERVICOS-PROCEDURAL-V1.md`; leia o catálogo, combine e valide
  em memória antes de propor extensão ou registrar lacuna.
- Peça nova ou refinamento: `AUTORIA-IA.md`, `PERFIS-DE-AUTORIA.md`,
  `INTENCAO-PECA-V1.md`, `REFERENCIA-E-CRITICA-VISUAL.md`,
  `FLUXO-MODELAGEM-IA.md` e `BANCADA-E-APRESENTACAO.md`.
- Contexto visual, isolamento e pares: `BANCADA-E-APRESENTACAO.md`.
- Homologação: `HOMOLOGACAO-FLUXO-IA.md` e `FLUXO-MODELAGEM-IA.md`.
- Freio ou roda: a prancha correspondente e o protocolo visual.
- Trabalho histórico: o README da zona histórica antes de abrir evidências.

## Comandos principais

```text
npm test
npm run typecheck
npm run build
npm run porteiro
npm run exportar:check
npm run descrever:montagem:persistida -- --arquivo=<raiz.json> --raiz-montagens=<dir> --raiz-pecas=<dir>
npm run diario
```

`npm run diario` lê o diário da oficina, que as ferramentas do laço gravam
sozinhas: onde o tempo foi, o que foi repetido sem a receita mudar, que erro se
repete e o que saiu 0 sem entregar. Desligar: `MECANIFICA_DIARIO=0`.

## Gates completos

```text
npm run gates
```

Roda TODOS e relata TODOS, com saída não-zero se algum falhar; a lista vive em
`tools/gates.mjs` e é conferida contra o `ci.yml` nos dois sentidos. Esta seção
era uma terceira cópia da lista, escrita à mão, e já tinha ficado para trás —
lista repetida em três lugares envelhece em três velocidades. Para um laço curto
enquanto se conserta um gate: `npm run gates -- --parar-no-primeiro`.

## Pendências atuais

- Não há plano ativo. O modelador inverso está congelado: nova geometria, corpus de priors, fitting e MCP de edição
  seguem dependendo dos gates dele, que não executam enquanto isso durar.
- `alinhar` e variantes nomeadas seguem recusados; `loft` fechado já existe.
  Medida e critérios em `docs/mecanifica/planos/BACKLOG.md`.

Nenhuma pendência desta lista autoriza implementação automática.

## Histórico e inventário

Resultados encerrados da Mecanifica ficam em
[`historico/README.md`](historico/README.md) e os planos já fechados em
[`planos/encerrados/README.md`](planos/encerrados/README.md). Decisões do NÓS
ficam em `docs/nos-herdado/`. Nenhuma dessas zonas autoriza trabalho novo.

A lista comentada de documentos e as fontes de verdade estão em
[`INVENTARIO.md`](INVENTARIO.md) (`docs/mecanifica/INVENTARIO.md`); o
inventário mecânico é gerado em [`../uso/MAPA.md`](../uso/MAPA.md), nunca à mão.

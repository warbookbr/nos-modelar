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

- Plano **ativo**: [o caminho curto da IA](planos/2026-10-07-o-caminho-curto-da-ia.md).
  O que fechou antes dele está em `planos/README.md` e na crônica abaixo.
- A [exportação CAD/STEP modular](./planos/encerrados/2026-08-28-exportacao-cad-step.md)
  entregou `modulos/exportador-cad/`, `modulos/exportador-obj/` e as CLIs
  `npm run exportar:step` e `npm run exportar:obj`. O STEP sai por
  `occt-wasm@4.3.2`, MIT/Apache-2.0 com `.wasm` LGPL-2.1 consumido como pacote
  separado, o que não muda a licença deste repositório. Detalhe em
  [`DOSSIE-EXPORTACAO-CAD-STEP.md`](DOSSIE-EXPORTACAO-CAD-STEP.md) e prova em
  [`RELATORIO-EXPORTACAO-CAD-STEP-R00.md`](./historico/RELATORIO-EXPORTACAO-CAD-STEP-R00.md).
- `npm run ativar:bancada` carrega peça ou montagem na bancada e sincroniza a
  sessão; o estado é local e não versionado. Procedimento em
  [`ATIVACAO-BANCADA-SESSAO-ATIVA.md`](./usar/ATIVACAO-BANCADA-SESSAO-ATIVA.md);
  hospedagem estática e isolamento de rede em
  [`ARQUITETURA-SESSAO-E-SEGURANCA.md`](ARQUITETURA-SESSAO-E-SEGURANCA.md).
- Os invariantes e os roteiros de leitura por intenção são dados em
  [`roteiros/roteiros.json`](roteiros/roteiros.json). Dele saem as regras e a
  lista de roteiros do `CLAUDE.md` (entre marcadores) e a página
  [`roteiros/ROTEIROS.md`](roteiros/ROTEIROS.md), geradas por
  `npm run roteiros:gerar` e conferidas pelo gate `leitura:obrigatoria`;
  `npm run comecar -- <roteiro>` e a ferramenta MCP `comecar` devolvem o
  roteiro com o passo seguinte lido do estado.
- O banco de provas versionado e o registro de custo do plano de modelagem vivem em
  [`banco-de-provas/BANCO-DE-PROVAS.md`](banco-de-provas/BANCO-DE-PROVAS.md)
  (`docs/mecanifica/banco-de-provas/BANCO-DE-PROVAS.md`).

A crônica dos planos concluídos e cancelados está em
[`planos/encerrados/README.md`](planos/encerrados/README.md)
(`docs/mecanifica/planos/encerrados/README.md`): evidência consultável, não
governa trabalho novo.

## Direção estabelecida

A unidade geométrica editável é a **peça**. A unidade de composição é a
**montagem**. Montagens podem conter outras montagens e formar sistemas e
máquinas inteiras, sem limite declarado de profundidade.

Máquina composta não é receita monolítica. A IA deve trabalhar em alvos
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
| `procedural/nucleo/` | núcleo procedural e adaptadores compatíveis |
| `procedural/pecas/` | uma pasta por peça: receita, referências, plano e rodadas |
| `modulos/` | ferramentas isoladas (esboço, contorno da imagem, exportadores), cada uma com o próprio README |
| `bancada.html`, `src/bancada/` | bancada: inspeção para a IA, edição para a pessoa |
| `src/autoria/` | núcleo headless: topologia, alvo, descrição do gesto, adaptadores |
| `tools/bancadas/` | porteiro, criação, exportação e gabaritos |
| `tools/mecanifica/` | gates da bancada, revisão e contratos |
| `tools/mcp/` | adaptador MCP sobre serviços existentes; hoje principalmente leitura |
| `docs/mecanifica/planos/` | contrato de planos, programas e backlog aberto |
| `docs/mecanifica/historico/` | evidências encerradas, sem autoridade nova |

Montagem persistida v1 tem contrato e resolvedor em `src/autoria/` e provas em
`tools/mecanifica/fixtures/montagens-persistidas/`; o mapa global de dependências
tem contrato em `MAPA-CANONICO-DEPENDENCIAS.md` e serviços em `src/autoria/`. Não
invente uma localização por implicação.

Qual documento manda em cada assunto está na lista de fontes de verdade, em
[`INVENTARIO.md`](INVENTARIO.md) (`docs/mecanifica/INVENTARIO.md`): listar 21
fontes é inventário, não porta de entrada.

## Leitura por tarefa

- Estado, objetivo e horizonte: `VISAO.md`, este índice e `planos/README.md`.
- **O que já existe, antes de propor ferramenta ou capacidade:** as operações do
  núcleo no catálogo gerado, [`gerado/CATALOGO-CAPACIDADES.md`](gerado/CATALOGO-CAPACIDADES.md);
  as formas, o posicionamento, os componentes e os comandos do esboço em
  [`modulos/esboco/README.md`](../../modulos/esboco/README.md), e os outros
  módulos no README de cada um; o que faz cada arquivo de `tools/` e `src/`
  em [`../MAPA.md`](../MAPA.md).
- Autoria de peça: contrato em `usar/AUTORIA-DE-PECA.md`, razões em `AUTORIA-IA.md`.
- **Investigar defeito ou entender por que uma abordagem falha:**
  `METODO-DIAGNOSTICO-E-SEU-LIMITE.md`. Ele também diz quando **não** usar o
  método: decidir forma, proporção e caráter não é problema diagnóstico, e
  eliminação ali rende consertos certos num objeto que continua ruim.
- **Como a autoria de forma passa a funcionar:** o [dossiê do modelador inverso com priors por família](DOSSIE-MODELADOR-INVERSO-PRIORS-FAMILIA.md).
  O antigo [modelador por seleção](./historico/DOSSIE-MODELADOR-POR-SELECAO.md) é só histórico.
- **Antes de abrir experimento novo:**
  [`GOTCHAS-AUTORIA-VISUAL.md`](./usar/GOTCHAS-AUTORIA-VISUAL.md)
  (`docs/mecanifica/usar/GOTCHAS-AUTORIA-VISUAL.md`), registro único e vivo do
  que já falhou — o de modelagem procedural foi fundido nele, e o
  [canário de casco](./historico/RELATORIO-N6-CANARIO-CASCO-VISUAL.md), a
  evidência negativa mais recente. Rodada gasta redescobrindo algo já medido é
  falha V-31.
- Peças versus montagens, composição e dependências:
  `MONTAGENS-SEMANTICAS.md` e `ARQUITETURA.md`.
- Montagem persistida e contexto para IA: `MONTAGEM-PERSISTIDA-V1.md` a
  `MONTAGEM-PERSISTIDA-V3.md` e `CONTEXTO-MONTAGEM-IA.md`.
- Programa MCP: `docs/mecanifica/planos/mcp/INDEX.md` e os planos datados
  encerrados. O programa MCP não é o roteiro mestre da autoria.
- Núcleo ou dependência técnica: `ARQUITETURA.md`, `AUTORIA-IA.md` e
  `docs/nos-herdado/oficina-contrato.md`; para descobrir capacidade, abra
  `gerado/INDEX.md` antes da implementação.
- Reutilização procedural: `COMPOSICAO-PROCEDURAL-V1.md` e o catálogo de
  capacidades; não confundir composição de passos com montagem de peças.
- Capacidade ausente: `LACUNAS-DE-CAPACIDADE-V1.md` e o catálogo gerado; planeje,
  classifique com evidência e só então abra recorte de implementação.
- Descoberta MCP: `SERVICOS-PROCEDURAL-V1.md`; leia o catálogo, combine e valide
  em memória antes de propor extensão ou registrar lacuna.
- Peça nova ou refinamento: `AUTORIA-IA.md`, `PERFIS-DE-AUTORIA.md`,
  `INTENCAO-PECA-V1.md`, `REFERENCIA-E-CRITICA-VISUAL.md`,
  `FLUXO-MODELAGEM-IA.md` e `BANCADA-E-APRESENTACAO.md`.
- **Bancada — contexto visual, arquitetura, e o laço de desenhar e absorver:**
  `BANCADA-E-APRESENTACAO.md` separa o que é de `src/bancada/` do que é de
  `src/autoria/`; o procedimento está em `usar/AJUSTE-DA-BANCADA.md`.
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
npm run descrever:gesto -- <ajuste.json>   # e npm run absorver -- <ajuste.json>
npm run diario
```

`descrever:gesto` diz o que a pessoa desenhou na bancada e onde mexer na receita;
`absorver` mede se a reescrita chegou. Em
[`AJUSTE-DA-BANCADA.md`](./usar/AJUSTE-DA-BANCADA.md).

`npm run diario` lê o diário da oficina, que as ferramentas do laço gravam
sozinhas: onde o tempo foi, o que foi repetido sem a receita mudar, que erro se
repete e o que saiu 0 sem entregar. Desligar: `MECANIFICA_DIARIO=0`.

## Gates completos

```text
npm run gates
```

Relata todos, com saída não-zero se algum falhar; a lista vive em
`tools/gates.mjs` e é conferida contra o `ci.yml` nos dois sentidos. Quando só
mudou peça (`procedural/pecas/`) ou documento desde o ramo remoto, roda a
bateria curta `GATES_CURTOS`, sem os gates de navegador e de MCP; qualquer outro
arquivo roda todos, e `--completo` força todos. O CI roda sempre a lista
inteira. Para consertar um gate: `npm run gates -- --parar-no-primeiro`.

## Pendências atuais

- Plano ativo: [o caminho curto da IA](planos/2026-10-07-o-caminho-curto-da-ia.md), aberto em 2026-10-07; [as ferramentas de modelagem](planos/congelados/2026-10-07-as-ferramentas-de-modelagem.md) ficou congelado com a fatia 1 entregue, e [o catálogo de famílias](planos/encerrados/2026-10-06-o-catalogo-de-familias.md) foi cancelado; [as partes do braço](planos/congelados/2026-09-26-as-partes-do-braco.md) seguem congeladas. Rascunho aberto: [o que o
  braço robótico achou](planos/2026-09-21-o-que-o-braco-robotico-achou.md), cujo
  resto é tudo código. Dois estão [congelados](planos/congelados/README.md):
  o modelador inverso, de que dependem nova geometria, corpus de priors, fitting
  e MCP de edição, e o vocabulário poligonal da bancada.
- `alinhar` e variantes nomeadas seguem recusados; `loft` fechado já existe.
  Medida e critérios em `planos/BACKLOG.md`.

Nenhuma pendência desta lista autoriza implementação automática.

## Histórico e inventário

Resultados encerrados ficam em [`historico/README.md`](historico/README.md), os
planos fechados em [`planos/encerrados/README.md`](planos/encerrados/README.md) e
as decisões do NÓS em `docs/nos-herdado/`. Nenhuma delas autoriza trabalho novo.

A lista comentada de documentos e as fontes de verdade estão em
[`INVENTARIO.md`](INVENTARIO.md); o inventário mecânico é gerado em
[`../MAPA.md`](../MAPA.md), nunca à mão.

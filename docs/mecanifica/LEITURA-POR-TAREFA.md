# Leitura por tarefa

Consulta por assunto, para quando nenhum roteiro de `roteiros/ROTEIROS.md` cobre a pergunta. Cada roteiro já diz o que ler antes de começar.


- Estado, objetivo e horizonte: `VISAO.md`, `INDEX.md` e `planos/README.md`.
- **O que já existe, antes de propor ferramenta ou capacidade:** as operações do
  núcleo no catálogo gerado, [`gerado/CATALOGO-CAPACIDADES.md`](gerado/CATALOGO-CAPACIDADES.md);
  as formas, o posicionamento, os componentes e os comandos do esboço em
  [`modulos/esboco/README.md`](../../modulos/esboco/README.md), e os outros
  módulos no README de cada um; o que faz cada arquivo de `tools/` e `src/`
  em [`../MAPA.md`](../MAPA.md).
- Autoria de peça: contrato em `usar/AUTORIA-DE-PECA.md`, razões em `AUTORIA-IA.md`.
- Carroceria e chapa contínua: a forma facetada pelas três vistas em
  [`modelar-veiculos.md`](modelar-veiculos.md), e a superfície lisa por
  subdivisão, com vincos, raio de borda, medidas e espessura, em
  [`modelar-carroceria.md`](modelar-carroceria.md).
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
- Peça nova ou refinamento: o que ler sai de `npm run comecar -- modelar/peca`;
  por assunto, a direção da autoria está em `AUTORIA-IA.md` e
  `PERFIS-DE-AUTORIA.md`, e o fluxo antigo em `FLUXO-MODELAGEM-IA.md`.
- **Bancada — contexto visual, arquitetura, e o laço de desenhar e absorver:**
  `BANCADA-E-APRESENTACAO.md` separa o que é de `src/bancada/` do que é de
  `src/autoria/`; o procedimento está em `usar/AJUSTE-DA-BANCADA.md`.
- Homologação: `HOMOLOGACAO-FLUXO-IA.md` e `FLUXO-MODELAGEM-IA.md`.
- Freio ou roda: a família `roda-pneu` (`procedural/familias/roda-pneu/`) e, no esboço, `.claude/skills/esboco-detalhado/faixas-rodas-discos.md`.
- Trabalho histórico: o README da zona histórica antes de abrir evidências.

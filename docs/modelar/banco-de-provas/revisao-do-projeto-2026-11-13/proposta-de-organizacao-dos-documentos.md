# Proposta de organização dos documentos, para a decisão da pessoa

Escrita em 2026-11-13, a partir da [pesquisa de projetos operados por IA](pergunta-4-projetos-operados-por-ia.md). Nada foi movido. A pessoa recebeu o desenho em uma página, com a árvore de hoje ao lado da proposta; este arquivo guarda o destino de cada documento. O destino foi dado pelo título e pelo uso de cada um, sem ler os 43 inteiros, e é conferido arquivo a arquivo pelo plano que executar a mudança.

## A árvore proposta para `docs/modelar/`

Quatro finalidades, cada documento em uma só. A entrada fica solta na pasta: `INDEX.md` e `MECANISMOS.md`. Fazer uma tarefa fica em `usar/`, que já existe. Consultar formato e regra fica em `contratos/`, pasta nova. Entender o porquê fica em `decisoes/` e `pesquisas/`, pastas novas. `planos/` guarda só o que está em andamento, à espera ou congelado. `banco-de-provas/`, `gerado/` e `roteiros/` ficam como estão. `planos/encerrados/` (118 arquivos, 1,4 MB) e `historico/` (88 arquivos) saem da árvore: o git os guarda, e cada plano encerrado deixa em `decisoes/` um registro curto do que ficou decidido e por quê, imutável, que um registro novo substitui quando a decisão muda. As pastas `procedural/nucleo/`, `procedural/pecas/` e `tools/` ganham cada uma um arquivo de instrução com o que só vale nela.

## O destino de cada documento solto

| Destino | Documentos |
|---|---|
| fica solto (entrada) | `INDEX.md`, `MECANISMOS.md` |
| `usar/` (7) | `modelar-carroceria.md`, `modelar-veiculo-em-chassi-e-lataria.md`, `modelar-veiculos.md`, `AUTORIA-IA.md`, `FLUXO-MODELAGEM-IA.md`, `BANCADA-E-APRESENTACAO.md`, `LEITURA-POR-TAREFA.md` |
| `contratos/` (20, que viram 17) | `ARQUITETURA.md`, `ARQUITETURA-SESSAO-E-SEGURANCA.md`, `CONTRATO-ACEITE-VISUAL.md`, `CONTRATO-DA-FAMILIA.md`, `CONTRATO-FORMA-GLOBAL-N2.md`, `COMPOSICAO-PROCEDURAL-V1.md`, `EXTENSOES-NATIVAS-V1.md`, `SERVICOS-PROCEDURAL-V1.md`, `MONTAGEM-PERSISTIDA-V1.md` a `V4` (quatro, fundidos em um com a versão vigente), `ESCRITA-TRANSACIONAL-MONTAGEM.md`, `FILETE-V2.md`, `PERFIS-DE-AUTORIA.md`, `MAPA-CANONICO-DEPENDENCIAS.md`, `MATRIZ-TESTES-ACOPLADOS.md`, `INVENTARIO.md`, `CONTEXTO-MONTAGEM-IA.md`, `CONTEXTO-VISUAL-REVALIDACAO.md` |
| `decisoes/` (6) | `VISAO.md`, `AGENT-FIRST.md`, `CONTINUIDADE-ARQUITETURAL.md`, `FAMILIAS-DE-OBJETOS.md`, `COORDENACAO-REPOS.md`, `UPSTREAM-NOS.md` |
| `pesquisas/` (8) | `ANALISES-DE-2026-10.md`, `PESQUISA-ABERTA-2026-10.md`, `DOSSIE-EXPORTACAO-CAD-STEP.md`, `DOSSIE-MODELADOR-INVERSO-PRIORS-FAMILIA.md`, `FERRAMENTAS-POR-OBJETO.md`, `LACUNAS-DE-CAPACIDADE-V1.md`, `HOMOLOGACAO-FLUXO-IA.md`, `ATRITOS-AUTORIA.md` |

## O que a mudança custa e o que arrisca

Cada arquivo movido quebra os links que apontam para ele: `AUTORIA-IA.md` é citado em 26 arquivos, `UPSTREAM-NOS.md` em 22 e `modelar-carroceria.md` em 17 (contagem por `grep` do nome em `docs/`, `.claude/` e na raiz, sem o mapa). O gate de links acusa cada um, de modo que o custo é trabalho e não risco de link quebrado em silêncio. Os roteiros de leitura citam oito desses documentos e são regenerados. O risco real é tirar da árvore um plano encerrado cuja lição ainda é consultada: por isso o registro de decisão é escrito antes de o plano sair, e o roteiro `pesquisar` passa a apontar para `decisoes/`.

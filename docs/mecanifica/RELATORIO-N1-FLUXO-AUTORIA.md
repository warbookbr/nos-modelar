# Relatório N1 — contratos e orquestração da autoria 3D

**Estado:** concluído
**Decisão:** aprovar a fundação contratual e abrir N2
**Geometria pública alterada:** não

## Resultado

A N1 entregou uma fronteira única e pura para a IA declarar um objetivo,
descobrir o protocolo da família, consultar provedores, receber plano ou
diagnóstico, distinguir fonte de produto e registrar transições com evidência.
Schemas e uma fachada configurada tornam o contrato consumível sem conhecer a
implementação interna.

O contrato operacional completo está em
[`FLUXO-AUTORIA-N1.md`](FLUXO-AUTORIA-N1.md).

O encerramento não aprova carro, robô, superfície ou montagem híbrida. Ele
aprova o trilho que impede essas capacidades de serem presumidas.

## Artefatos executáveis

| Artefato | Responsabilidade |
|---|---|
| `src/autoria/contrato-autoria-3d.js` | objetivo, receita elevada e registro de provedores |
| `src/autoria/orquestrar-fluxo-autoria.js` | protocolo, planejamento e transições |
| `src/autoria/schemas-autoria-3d.js` | schemas públicos e índice descobrível |
| `src/autoria/provedor-contratos-autoria.js` | planejamento real do briefing |
| `src/autoria/servico-fluxo-autoria.js` | fachada neutra sem I/O |
| `prototipos/procedural/v3/servicos/provedor-autoria.js` | adaptação da descoberta procedural existente |
| `prototipos/procedural/v3/servicos/fluxo-autoria.js` | configuração nativa atual |

O artefato estático dos schemas fica em
[`gerado/schemas-autoria-3d.json`](gerado/schemas-autoria-3d.json) e é conferido
por `npm run autoria:schemas:check`.

## Auditoria de reutilização

| Capacidade existente | Decisão N1 | Motivo |
|---|---|---|
| normalizador do objetivo | adaptar como briefing | recebe exatamente o dado disponível no início |
| descoberta procedural | adaptar para necessidade `procedural` explícita | já combina catálogo e classifica lacuna sem executar |
| prancha e aceite visual | não adaptar automaticamente | exigem especificação, imagens e evidências que o objetivo sozinho não contém |
| montagens e interfaces | não adaptar automaticamente | operam sobre fontes ou contexto de montagem já existentes |
| revisão visual | não adaptar automaticamente | exige revisão, vistas e crítico, não apenas intenção |
| publicação transacional | não adaptar automaticamente | a receita elevada ainda não está ligada ao repositório de revisões |

Essa recusa evita que “serviço existente” seja confundido com “etapa coberta”.
Nenhuma operação, validador ou repositório foi duplicado.

## Prova caixa-preta

O cliente importa somente `criarServicoAutoria3DNativa` e observa:

- nove schemas públicos mais limites declarados;
- dois provedores reais: `contratos-autoria` e `procedural-dimensional`;
- protocolo veicular com dez etapas;
- cobertura básica real de 1/10: briefing coberto e nove lacunas;
- cadeia procedural encontrada quando solicitada explicitamente;
- veículo ainda bloqueado porque procedural não substitui forma global;
- entrada inválida devolvida como diagnóstico estruturado, sem lançar;
- saídas determinísticas, serializáveis e sem caminho local.

Uma fixture completa existe somente para provar plano pronto, execução e
paridade de schemas. Ela não entra na configuração nativa nem na cobertura.

## Gates da N1

| Gate | Resultado |
|---|---|
| objetivo e receita elevada executáveis | passou |
| fonte e produto derivados separados | passou |
| provedores explícitos e determinísticos | passou |
| capacidade existente consultada antes de lacuna | passou |
| diagnóstico com causa, impacto e próximo passo | passou |
| transição sem salto e sem passe silencioso | passou |
| aceite humano obrigatório nos marcos | passou |
| schemas dinâmicos e estáticos em paridade | passou |
| cliente caixa-preta sem acesso oculto | passou |
| geometria pública preservada | passou |

## Baseline agregado preservado

As duas provas N1 passaram em 15/15; o conjunto relacionado passou em 31/31.
Typecheck, build, arquitetura, catálogo, schemas, documentação, mapa, planos,
exportação, porteiro, bancada e ensaio MCP também passaram.

`npm test` terminou com 104 arquivos verdes e os mesmos sete arquivos vermelhos
do baseline: 1.240 testes passaram, 11 falharam e dois foram ignorados. As falhas
continuam limitadas à antiga árvore `fps`, à resolução `repo://` das evidências
visuais e à importação isolada do perfil MCP de revisão. `mcp:check` reproduziu
43 passes, uma falha e dois ignorados; `mcp:ensaio` passou 4/4. A N1 não toca
essas áreas e não introduziu categoria nova de falha.

## Lacunas transferidas

As lacunas de `alvo`, `forma-global`, `semantica`, `montagem`, `superficie`,
`estados`, `validacao` e `publicacao` permanecem explícitas. Elas não são
bloqueio tardio da N1: são saídas do seu diagnóstico e entradas das fatias que
implementam cada capacidade.

A N2 recebe `alvo`, `andaime` e `blocagem`. N3 recebe superfície semântica e
compilação. Integração, estados e publicação permanecem nas fatias posteriores
do plano, depois das provas de forma.

## Decisão

`aprovar` a N1 porque seus contratos são executáveis, descobríveis, testados e
falham fechados. Abrir N2 sem promover nenhum provedor de forma inexistente.

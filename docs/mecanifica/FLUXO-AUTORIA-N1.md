# Fluxo de autoria 3D — contratos executáveis da N1

## Estado e alcance

Este é o contrato executável concluído da N1 do plano
[`2026-08-23-arquitetura-hibrida-familias-modelagem-ia.md`](./planos/encerrados/2026-08-23-arquitetura-hibrida-familias-modelagem-ia.md).
Ela cria a fronteira neutra acima dos serviços existentes sem mudar geometria
pública, receitas atuais, montagem, revisão, visor ou MCP.

A N1 prova contrato, descoberta e falha segura. Ela **não** afirma que os provedores de
andaime, blocagem, superfície semântica e conectividade já existem. Um provedor
completo usado nos testes é fixture; os adaptadores reais são o contrato de
briefing e a descoberta procedural existente.

## Contratos

### Objetivo de autoria

`mecanifica.objetivo-autoria@1` declara antes da geometria:

- ID semântico e família;
- intenção, qualidade, unidade e eixos;
- referências rastreáveis, restrições e condições de rejeição;
- incertezas diagnósticas ou bloqueantes;
- necessidades adicionais por etapa, classe, artefatos e interfaces.

O normalizador `normalizarObjetivoAutoria` recusa campos de runtime, caminhos,
eixos colineares, referências ausentes, duplicatas e rejeições vazias. Uma
incerteza com efeito `bloqueia` impede o planejamento antes de consultar
provedores. Rebaixar precisão precisa ser decisão explícita; o orquestrador não
preenche referência insuficiente.

### Receita autoral elevada

`mecanifica.receita-autoral@1` é um envelope de fontes nativas, não um segundo
executor geométrico. Ele liga objetivo, coordenadas, fontes, semântica,
dependências, produtos derivados e gates de aceite.

Fontes aceitas na v1:

- receita procedural;
- andaime;
- superfície semântica;
- montagem;
- estado;
- combinação dessas fontes.

Malha neutra ou densa, triangulação, normais, medições, imagens e contexto
resolvido são produtos derivados. Produto esperado não possui assinatura;
produto compilado exige `sha256`. Colocar uma malha densa na lista de fontes é
erro de contrato. O envelope referencia fontes por identidade semântica; o
conteúdo autoral continua no formato próprio de cada fonte.

### Provedores

`mecanifica.provedor-autoria@1` declara ID, versão, famílias, etapas, classes e
efeitos. O registro é explícito, determinístico e não aceita autorregistro. Cada
provedor implementa somente `planejar(contexto)` e devolve:

- `coberta`, com custo e plano serializável;
- `nao-coberta`, preferencialmente com lacuna classificada;
- `bloqueada`, com diagnóstico acionável.

O plano do provedor é dado JSON. Função, objeto de classe, ciclo, `NaN` ou
`Infinity` são recusados em vez de desaparecerem durante serialização.

O adaptador real `procedural-dimensional` chama o mesmo
`criarServicoDescobertaProcedural` já usado pelo catálogo e MCP. Ele combina
capacidades existentes primeiro; somente sem cadeia compatível chama
`analisarLacuna`. Não executa receita, não instala extensão, não grava lacuna e
não promove operação.

O adaptador `contratos-autoria` cobre somente `briefing/objetivo`. Ele confirma
que o objetivo já atravessou o normalizador e produz o roteiro dessa etapa. Não
declara que referência, forma, superfície ou publicação estão aprovadas.

## Orquestração

`planejarFluxoAutoria` deriva o protocolo por família e busca cobertura por
classe e etapa. Entre candidatos cobertos, escolhe menor custo e depois menor ID
semântico. Ausência de provedor obrigatório bloqueia o plano com `campo`,
`causa`, `impacto` e `proximoPasso`.

| Família | Etapas vinculantes na v1 |
|---|---|
| peça mecânica | briefing → alvo → decomposição → integração → superfície → revisão → promoção |
| veículo | protocolo completo, de briefing a promoção |
| humanoide | protocolo completo, de briefing a promoção |
| sistema articulado | briefing → alvo → decomposição → integração → estados → revisão → promoção |

O protocolo completo é:

`briefing → alvo → andaime → blocagem → decomposição → integração → superfície → estados → revisão → promoção`.

Uma necessidade adicional não substitui a etapa básica. Isso impede um plano
procedural estrutural de ser confundido com prova de forma global ou superfície
semântica.

## Execução e falha segura

`criarExecucaoFluxoAutoria` aceita somente plano `pronto`.
`registrarResultadoEtapa`:

- recusa salto de etapa;
- recusa aprovação sem ID de evidência;
- exige diagnóstico em reprovação ou bloqueio;
- torna reprovação e bloqueio terminais neste plano;
- exige aceite explícito do usuário na blocagem de veículo/humanoide;
- exige aceite explícito do usuário na promoção de toda família;
- recusa contradição entre decisão humana e resultado técnico.

O serviço registra transições imutáveis em memória. Ele ainda não compila,
renderiza, persiste ou publica; essas ações permanecem separadas e só entram por
provedores provados nas fatias correspondentes.

## Fachada e schemas descobríveis

`criarServicoFluxoAutoria` é a fachada neutra; a configuração atual
`criarServicoAutoria3DNativa` registra os dois provedores reais. Ela expõe
`schemas`, `provedores`, `protocolo`, `cobertura`, `planejar`,
`normalizarReceita`, `iniciar` e `registrar` sem I/O ou MCP.

O índice `mecanifica.schemas-autoria-3d@1` descreve objetivo, receita elevada,
manifesto de provedor, protocolo, plano, execução, resultado de etapa,
resultado de planejamento e cobertura. A cópia estática gerada é
[`gerado/schemas-autoria-3d.json`](gerado/schemas-autoria-3d.json). O gate
`npm run autoria:schemas:check` impede divergência entre código e artefato.

Schema valida estrutura e descoberta; os normalizadores continuam responsáveis
por relações semânticas como eixos não colineares e IDs cruzados. Nenhum schema
aprova forma, superfície, conectividade, evidência ou decisão humana.

## Cobertura atual honesta

| Capacidade | Estado ao concluir N1 |
|---|---|
| objetivo e incerteza | contrato e provedor de briefing executáveis |
| fonte versus derivado | contrato executável |
| registro de provedores | contrato executável |
| fluxo por família | planejador executável |
| transições e aceite humano | máquina de estados executável |
| descoberta procedural | adaptador real sobre serviço existente |
| schemas | índice dinâmico e artefato estático com gate de paridade |
| cliente caixa-preta | prova determinística da fachada configurada |
| andaime e blocagem | sem provedor; plano bloqueia |
| superfície semântica | tipo de fonte definido; sem executor |
| conectividade ampliada | sem provedor N1 |
| renderização, revisão e publicação unificadas | serviços existentes ainda não adaptados |

Um plano criado apenas com o provedor procedural atual deve ficar bloqueado nas
etapas não cobertas. Isso é resultado correto, não regressão: impede a IA de
confundir catálogo geométrico com fluxo completo de autoria.

## Prova executável

`tools/mecanifica/fluxo-autoria-n1.test.ts` e
`tools/mecanifica/fluxo-autoria-n1-caixa-preta.test.mjs` cobrem:

- canonicalização e casos adversariais dos contratos;
- separação obrigatória entre fonte e produto;
- reutilização real do catálogo procedural antes de lacuna;
- classificação preservada quando a cadeia não existe;
- planejamento determinístico;
- bloqueio por referência e provedor ausente;
- recusa de plano não serializável;
- sequência, evidência, decisão humana e terminalidade.
- schemas dinâmicos/estáticos e todas as saídas públicas;
- cobertura real por família e diagnóstico estruturado sem exceção;
- cliente que usa somente a fachada configurada, sem acesso oculto.

Comando focado:

```text
npx vitest run tools/mecanifica/fluxo-autoria-n1.test.ts tools/mecanifica/fluxo-autoria-n1-caixa-preta.test.mjs
```

## Encerramento e passagem para N2

A N1 está concluída. A prova real de veículo tem dez etapas básicas: briefing
fica coberto e as outras nove permanecem lacunas explícitas. Uma necessidade
procedural adicional é coberta sem alterar esse veredito global. O relatório de
encerramento está em
[`RELATORIO-N1-FLUXO-AUTORIA.md`](./historico/RELATORIO-N1-FLUXO-AUTORIA.md).

A N2 pode abrir para implementar alvo operacional, andaime e blocagem global.
Nenhum adaptador futuro pode declarar `forma-global`, `superficie` ou
`publicacao` apenas porque produz malha, imagem ou arquivo.

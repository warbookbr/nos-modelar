# Fluxo de autoria 3D — contratos executáveis da N1

## Estado e alcance

Esta é a primeira entrega executável da N1 do plano
[`2026-08-23-arquitetura-hibrida-familias-modelagem-ia.md`](planos/2026-08-23-arquitetura-hibrida-familias-modelagem-ia.md).
Ela cria a fronteira neutra acima dos serviços existentes sem mudar geometria
pública, receitas atuais, montagem, revisão, visor ou MCP.

A entrega prova contrato e falha segura. Ela **não** afirma que os provedores de
andaime, blocagem, superfície semântica e conectividade já existem. Um provedor
completo usado nos testes é fixture; o único adaptador real novo é o da
descoberta procedural existente.

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

## Cobertura atual honesta

| Capacidade | Estado após N1.1 |
|---|---|
| objetivo e incerteza | contrato executável |
| fonte versus derivado | contrato executável |
| registro de provedores | contrato executável |
| fluxo por família | planejador executável |
| transições e aceite humano | máquina de estados executável |
| descoberta procedural | adaptador real sobre serviço existente |
| andaime e blocagem | sem provedor; plano bloqueia |
| superfície semântica | tipo de fonte definido; sem executor |
| conectividade ampliada | sem provedor N1 |
| renderização, revisão e publicação unificadas | serviços existentes ainda não adaptados |
| JSON Schemas e porta caixa-preta | pendentes da N1.2 |

Um plano criado apenas com o provedor procedural atual deve ficar bloqueado nas
etapas não cobertas. Isso é resultado correto, não regressão: impede a IA de
confundir catálogo geométrico com fluxo completo de autoria.

## Prova executável

`tools/mecanifica/fluxo-autoria-n1.test.ts` cobre:

- canonicalização e casos adversariais dos contratos;
- separação obrigatória entre fonte e produto;
- reutilização real do catálogo procedural antes de lacuna;
- classificação preservada quando a cadeia não existe;
- planejamento determinístico;
- bloqueio por referência e provedor ausente;
- recusa de plano não serializável;
- sequência, evidência, decisão humana e terminalidade.

Comando focado:

```text
npx vitest run tools/mecanifica/fluxo-autoria-n1.test.ts
```

## Próxima entrega da N1

N1.2 precisa derivar schemas descobríveis desses contratos, adaptar somente os
serviços existentes que realmente satisfaçam uma classe, executar um cliente
caixa-preta interno e registrar o plano bloqueado real que indicará as lacunas
de N2/N3. Nenhum adaptador pode declarar `forma-global`, `superficie` ou
`publicacao` apenas porque produz malha, imagem ou arquivo.

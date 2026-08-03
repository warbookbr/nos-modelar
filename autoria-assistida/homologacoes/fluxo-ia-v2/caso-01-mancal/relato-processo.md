# Relato de processo — Caso 01: mancal de mesa

Este arquivo registra o percurso real do modelador cego no Caso 01 da
homologação do fluxo de IA. O caso terminou bloqueado antes de promover uma
`r001` válida. A fonte e o pacote foram preservados no ponto retomável; nenhuma
revisão foi fabricada manualmente para contornar a recusa.

## Estado entregue

- pacote `homologacao-mancal` preparado em modo `criacao`, personalizado e
  validado;
- fonte `_mancal-de-mesa.js` criada do zero;
- descrição estrita concluída duas vezes com o mesmo resultado: 3 partes, 432
  faces, 480 vértices, 0 faces sem identidade, 0 órfãos e 2 portas;
- envelopes medidos: base `0,160 × 0,085 × 0,080 m`, bucha
  `0,050 × 0,044 × 0,044 m` e eixo `0,120 × 0,020 × 0,020 m`;
- as portas descrevem cavidade interna de raio `0,0102 m` e superfície externa
  de raio `0,0100 m`, diferença radial de `0,0002 m` e, portanto, folga
  diametral nominal de `0,0004 m`;
- a fonte declara uma relação read-only e uma montagem de inspeção, mas o
  diagnóstico dessa relação não foi executado;
- uma execução completa do revisor visual de nível inferior gerou as quatro
  vistas canônicas com enquadramento válido; os quatro PNGs foram lidos;
- nenhuma revisão assistida `r001` foi criada, porque
  `revisar:modelagem` rejeitou as interfaces publicadas antes de abrir o
  navegador;
- não houve iteração posterior nem comparação entre revisões.

## Arquivos lidos antes da primeira edição da fonte

Documentação oficial:

- `AGENTS.md`;
- `docs/mecanifica/INDEX.md`;
- `docs/mecanifica/planos/README.md`;
- `docs/mecanifica/HOMOLOGACAO-FLUXO-IA.md`;
- `docs/mecanifica/AUTORIA-IA.md`;
- `docs/mecanifica/PERFIS-DE-AUTORIA.md`;
- `docs/mecanifica/REFERENCIA-E-CRITICA-VISUAL.md`;
- `docs/mecanifica/BANCADA-E-APRESENTACAO.md`;
- `docs/mecanifica/FLUXO-MODELAGEM-IA.md`;
- `docs/mecanifica/MONTAGENS-SEMANTICAS.md`, com leitura integral até a
  abertura do Nível 2 e leitura dirigida dos Níveis 2 a 4.

Arquivos do pacote e guias:

- `autoria-assistida/pacotes/homologacao-mancal/briefing.json`;
- `autoria-assistida/pacotes/homologacao-mancal/referencias.json`;
- `autoria-assistida/guias/forma/silhueta-e-transicoes.md`;
- `autoria-assistida/guias/material/leitura-de-material.md`;
- `autoria-assistida/guias/processo/evidencia-e-iteracao.md`.

Exemplos consultados para aprender a API, sem copiar a fonte alvo:

- `prototipos/fps/v3/pecas/_prateleira-furada.js`: furo passante, origem
  semântica, partes e aliases;
- `prototipos/fps/v3/pecas/_tampa-de-caixa.js`: forma ponto a ponto de
  `centros` para dois furos no mesmo passo;
- `prototipos/fps/v3/pecas/roda-dianteira.js`: porta cilíndrica interna e
  orientação no eixo X;
- `prototipos/fps/v3/pecas/freio-disco.js`: cilindro no eixo X, furo múltiplo e
  porta cilíndrica externa;
- `prototipos/fps/v3/montagens/pino-e-luva.js`: sintaxe neutra de interfaces e
  relação `encaixaCilindrico`;
- `prototipos/fps/v3/montagens/roda-no-freio.js`: forma atual da especificação
  nominal, tolerância de fabricação e tolerância numérica.

Fontes de ferramenta consultadas para esclarecer contratos antes da fonte:

- `tools/modelagem/formato-pacote.mjs`, somente os trechos de orçamento e
  validação do perfil;
- `src/autoria/interfaces-montagem.js`, somente os trechos do encaixe
  cilíndrico e da medição de folga.

## Arquivos lidos depois da primeira edição da fonte

- `tools/modelagem/revisao-modelagem.mjs`, trechos de `portaDaDescricao` e
  `modeloDaDescricao`, para confirmar a causa da recusa;
- `/tmp/mancal-npm-cache/_logs/2026-08-03T17_16_27_989Z-debug-0.log`, para
  distinguir falha de rede da falha interna do npm;
- os quatro PNGs gerados em `tools/bancadas/out/` para isométrica, frontal,
  direita e superior.

Nenhum documento legado em `docs/uso/`, `docs/rumo/` ou `docs/historico/` foi
consultado.

## Comandos, resultados e ações, na ordem

1. `sed` em `AGENTS.md` e `docs/mecanifica/INDEX.md` — encontrou a hierarquia
   documental, as rotas de criação/revisão e os gates oficiais; ação: limitar
   a leitura à linha de criação de peça e homologação.
2. `git status --short` junto da leitura de
   `docs/mecanifica/planos/README.md` e
   `docs/mecanifica/HOMOLOGACAO-FLUXO-IA.md` — havia alterações preexistentes
   em documentação, pertencentes a outro trabalho; ação: preservá-las e tocar
   somente os três caminhos autorizados.
3. `wc -l` e `sed` nos quatro contratos de autoria e em
   `FLUXO-MODELAGEM-IA.md` — fixaram o perfil técnico-didático F2, o fluxo de
   criação e a obrigação de ler as imagens.
4. Testes de existência nos três alvos autorizados — todos ausentes; ação:
   iniciar em modo criação.
5. `npm run preparar:modelagem -- homologacao-mancal
   --peca=_mancal-de-mesa --modo=criacao --partes=base,bucha,eixo` — pacote
   criado sem sobrescrever artefato.
6. `find` e `sed` no pacote novo — briefing canônico ainda tinha distância de
   `0,5 m`, 2.000 faces e checklist genérico; ação: personalizar para o handoff.
7. `rg` para localizar o schema de orçamento — falhou porque `rg` não existe no
   ambiente; ação: usar `grep`, conforme a regra de fallback.
8. `grep` em `tools/modelagem` — confirmou que o orçamento aceita `faces`,
   `partes` e `materiais`.
9. Primeira edição do briefing — fixou 0,35 m, 1.800 faces, 3 partes, 3
   materiais e os oito critérios do caso.
10. `npm run validar:modelagem -- homologacao-mancal` — recusou
    `perfil.origem` e explicou que só aceita `declarado` ou
    `suposicao-canonica`; ação: trocar para `declarado`.
11. Segunda edição do briefing e nova validação — pacote válido, 2.633 bytes,
    criação pendente de três partes; ação: ler os três guias selecionados.
12. `sed`/`grep` dirigidos em `MONTAGENS-SEMANTICAS.md`, nos seis exemplos
    listados e nos trechos de interface — esclareceram o eixo X, o perfil oco,
    o furo múltiplo e as interfaces externa/interna.
13. Primeira edição da fonte — criou a receita completa do zero.
14. `npm run descrever -- _mancal-de-mesa --estrito` — falhou antes de importar
    a peça porque o pacote `earcut` não existia; ação: tratar como ambiente,
    sem remodelar.
15. `npm ci` — ficou sem saída e terminou com `Exit handler never called`, sem
    poder escrever log em `/home/codespace/.npm/_logs`; ação: repetir com cache
    gravável em `/tmp`.
16. `npm ci --cache=/tmp/mancal-npm-cache --loglevel=warn` — repetiu o erro do
    npm; o log mostrou `EAI_AGAIN registry.npmjs.org`; ação: pedir autorização
    de rede, sem espera indefinida.
17. `npm ci --cache=/tmp/mancal-npm-cache --loglevel=warn --no-audit`, com
    acesso autorizado — instalou 62 pacotes; ação: repetir a descrição sem
    alterar geometria.
18. Segunda chamada de `npm run descrever -- _mancal-de-mesa --estrito` —
    passou: 3 partes, 432 faces, 0 sem identidade, 0 órfãos e 2 portas.
19. `npm run revisar:modelagem -- homologacao-mancal --revisao=r001` — falhou
    com `modeloDaDescricao: 'descrição.portas[0].interface' não é
    reconhecido`; nenhuma tentativa ou revisão foi gravada.
20. `find` no pacote — confirmou que ficaram somente `briefing.json` e
    `referencias.json`; ação: não inventar `r001` manual.
21. Leitura dirigida de `tools/modelagem/revisao-modelagem.mjs` — confirmou que
    `portaDaDescricao` permite apenas `id`, `rotulo`, `op`, `origemId`,
    `recorte`, `origem` e `passo`; o descritor atual inclui também `interface`.
    A recusa é, portanto, incompatibilidade reproduzível entre descritor e
    revisor, não porta malformada na peça.
22. `grep` por `metalico` no acervo — mostrou que essa propriedade havia sido
    usada somente na fonte nova e não pertence ao contrato de aparência; ação:
    removê-la antes da primeira imagem. Esta foi a segunda e última edição da
    fonte.
23. Primeira chamada de `npm run revisar -- _mancal-de-mesa` — falhou ao abrir
    `127.0.0.1:5173` com `EPERM`; ação: repetir com autorização de servidor
    local.
24. Terceira chamada de `npm run descrever -- _mancal-de-mesa --estrito` —
    repetiu exatamente os totais e envelopes válidos depois da correção de
    material.
25. Segunda chamada de `npm run revisar -- _mancal-de-mesa`, autorizada —
    falhou porque o executável Chromium do Playwright não existia.
26. `npx playwright install chromium` — baixou Chromium, FFMPEG e headless shell;
    avisou que faltavam bibliotecas do sistema.
27. Terceira chamada de `npm run revisar -- _mancal-de-mesa` — confirmou a
    ausência dessas bibliotecas; ação: instalar somente as dependências pedidas
    pelo Playwright.
28. `npx playwright install-deps chromium` — concluiu a instalação das
    bibliotecas de sistema.
29. Quarta chamada de `npm run revisar -- _mancal-de-mesa` — passou e gerou
    isométrica, frontal, direita e superior; ocupações de quadro informadas:
    19,0%, 21,8%, 20,4% e 20,5%.
30. Leitura visual dos quatro PNGs — confirmou as observações abaixo; ação:
    encerrar sem nova edição, por ordem do orquestrador e porque `r001`
    continuava bloqueada.

## Contagens observadas

- edições da fonte: **2** — criação integral e remoção da propriedade de
  material não contratada;
- edições do briefing: **2** — personalização e correção de `origem`;
- chamadas de descrição estrita: **3** — uma falhou por dependência ausente e
  duas concluíram com os mesmos totais;
- chamadas de revisão assistida: **1** — recusada antes da captura;
- revisões assistidas válidas: **0**;
- chamadas do revisor visual de nível inferior: **4** — três falhas de
  ambiente e uma execução completa;
- conjuntos completos de quatro vistas gerados e lidos: **1**;
- iterações posteriores a uma revisão válida: **0**;
- comparações de revisão: **0**.

## Leitura das quatro vistas

- **isométrica:** base, pedestal, alojamento, bucha bronze e eixo de aço são
  legíveis; os dois furos do pé aparecem separados; a bucha protrude nos dois
  lados do alojamento.
- **frontal:** o eixo permanece horizontal em X e a bucha aparece dos dois lados
  do alojamento; a silhueta de pedestal é simples e técnico-didática.
- **direita:** os três círculos são concêntricos; a bucha é lida como anel real
  em torno do eixo, não como cilindro maciço pintado.
- **superior:** o eixo e o alojamento ficam sobre a linha dos centros dos dois
  furos do pé. Os furos não ficam distinguíveis como aberturas nesta vista,
  embora apareçam na isométrica. O critério 4, que exige leitura na vista
  superior, ficou **divergente** e exigiria uma iteração geométrica explícita.

## Hipóteses de iteração

Não houve iteração posterior a `r001`, pois `r001` nunca foi promovida. A
remoção de `metalico` foi correção de contrato anterior à primeira imagem,
não rodada visual.

Hipótese pronta para a primeira iteração futura, ainda **não executada**:
deslocar os centros dos dois furos de fixação no eixo Z, preservando X próximo
de `±0,06 m`, deve torná-los visíveis na superior sem alterar as três partes,
as interfaces ou o envelope do pé. O aceite precisa ser comprovado numa revisão
posterior, não assumido deste relato.

## Bloqueios e dúvidas classificados

### `briefing`

- nenhum conflito interno observado;
- o checklist coube em oito itens e os orçamentos foram representáveis.

### `documentacao`

- `perfil.origem` não teve os valores aceitos evidentes no fluxo lido; o
  validador deu diagnóstico acionável e permitiu corrigir sem orientação
  externa;
- a rota oficial bastou para chegar a uma fonte estritamente descritível.

### `ferramenta`

- **bloqueio principal:** o descritor inclui `interface` em portas cilíndricas,
  mas `tools/modelagem/revisao-modelagem.mjs` rejeita qualquer chave
  `interface` em `portaDaDescricao`. Isso impede `r001` justamente quando a
  peça usa a capacidade exigida pelo caso;
- a recusa acontece antes da preservação de tentativa, portanto o pacote não
  conserva artefato estruturado do erro;
- dependências npm, Chromium e bibliotecas de sistema estavam ausentes. Foram
  restauradas durante o caso, mas consumiram quatro chamadas do revisor visual;
- a primeira tentativa de servidor local foi recusada pelo sandbox e precisou
  de autorização.

### `linguagem`

- nenhuma capacidade geométrica ausente foi comprovada: furo passante múltiplo,
  bucha oca, cilindros em X, partes, materiais e portas foram expressos sem ID
  posicional;
- a capacidade de diagnosticar a relação existe no acervo, mas sua prova neste
  arquivo ficou sem execução. Não se declara sucesso sem esse comando.

### `modelo`

- a propriedade `metalico` foi inferida indevidamente e removida ao se constatar
  que não pertence ao contrato atual;
- os furos foram postos em `Z=0`, alinhados sob o eixo, e ficaram ocultos na
  vista superior. Esse é erro de composição do modelo, não falha da câmera;
- não houve oportunidade autorizada de testar e comparar a correção.

## Contornos usados e capacidades ausentes

Contornos usados:

- cache npm em `/tmp` para obter log gravável;
- restauração autorizada de dependências;
- `npm run revisar -- _mancal-de-mesa` como evidência visual de nível inferior,
  depois da recusa de `revisar:modelagem`.

Contornos deliberadamente recusados:

- remover as interfaces da fonte para fazer o revisor passar;
- editar a ferramenta ou o núcleo;
- criar `revisoes/r001` ou `revisao.json` à mão;
- chamar as quatro imagens do contorno de revisão assistida válida;
- alterar a fonte depois da leitura superior sem uma revisão-base promovida.

Capacidade ausente/defeituosa observada no fluxo: o formato de revisão precisa
aceitar e canonicalizar a interface semântica que o descritor oficial já emite,
ou projetá-la de forma documentada sem perder a medida. Enquanto isso não
ocorrer, qualquer peça com porta cilíndrica mensurável fica impedida de gerar
revisão assistida.

## Gates sem execução ou sem conclusão

- `npm run id-cru:check`: **não executado**;
- diagnóstico read-only da relação `RELACAO_EIXO_NA_BUCHA`: **não executado**;
- `npm run bancada -- _mancal-de-mesa --par=bucha,eixo`: **não executado**;
- revisão assistida `r001`: **tentada e bloqueada**, sem artefato promovido;
- leitura dos quatro PNGs de uma `r001` assistida: **impossível**, porque ela
  não existe; foram lidos os quatro PNGs do contorno oficial de nível inferior;
- comparação de revisões: **não aplicável/não executada**;
- gates completos `npm test`, `npm run typecheck`, `npm run build`, mapa,
  documentação, portas, câmera e exportação: **não executados**;
- critério visual dos dois furos na superior: **não atendido** no estado
  observado;
- inspeção reproduzível do par sem deslocamento: **não comprovada**.

## Retomada por outro agente

1. Não sobrescrever o pacote nem criar `r001` manualmente.
2. Corrigir fora deste caso, em escopo próprio, a incompatibilidade entre
   `descreverPeca()` e `portaDaDescricao()` para preservar `interface` na
   revisão.
3. Repetir `npm run validar:modelagem -- homologacao-mancal` e
   `npm run descrever -- _mancal-de-mesa --estrito`.
4. Gerar `r001` pelo comando assistido e ler as quatro imagens. Ela será a
   primeira baseline válida; as imagens já existentes em
   `tools/bancadas/out/` não a substituem.
5. Se a superior repetir a oclusão, executar a hipótese de deslocamento em Z
   como primeira iteração e gerar `r002`; preservar e comparar as duas.
6. Executar o gate de ID cru, a inspeção `--par=bucha,eixo` e o diagnóstico
   read-only da folga. Conferir especialmente o intervalo axial publicado pelo
   eixo, pois ele é mais longo que a bucha e o validador pode informar uma
   divergência axial mesmo com a folga radial nominal correta.
7. Registrar no relato os novos comandos e resultados sem recontar esta rodada
   como se já tivesse produzido revisão válida.

## Auditoria posterior do orquestrador

Depois do encerramento do modelador, sem alterar a geometria:

- `npm run id-cru:check` passou com zero ID cru novo;
- a inspeção `--par=bucha,eixo` passou, escolheu a vista frontal por pixels
  visíveis e produziu URL reproduzível sem deslocar a geometria;
- `npm run gabarito:selecao:check` congelou e repetiu a assinatura geométrica
  de 480 vértices e 432 faces;
- a suíte do adaptador encontrou uma segunda divergência: a fonte declarava
  `meta.fechada: true`, mas os perfis fechados visualmente por `lathe` mantêm
  duas costuras topológicas soltas em cada anel.

A declaração foi corrigida para `fechada: false`, sem mudar um vértice ou face,
para que o artefato não prometa uma propriedade que não cumpre. Isto não resolve
a geometria: registra outra lacuna do fluxo. Descrição estrita, gabarito e
revisão visual aceitaram a peça; somente o gate do acervo confrontou a promessa
de casca fechada. Uma retomada deve decidir explicitamente entre remodelar os
anéis com uma operação de casca fechada ou declarar que o caso aceita superfície
com costura. Não se deve simplesmente voltar `fechada` para `true`.

## Repetição após a correção do contrato de revisão

Em 3 de agosto de 2026, um recorte separado corrigiu a incompatibilidade entre
o descritor e o revisor. A fonte do mancal não mudou nesta repetição. O revisor
v3 passou a aceitar, validar e preservar a `interface` pública da porta; `passo`
continua fora da revisão. O teste cobre a saída real de `descreverPeca()` para
este mancal, a revalidação do JSON persistido, mudança somente de raio no diff
e a recusa de uma chave de runtime.

Resultados da repetição:

- `npm run validar:modelagem -- homologacao-mancal`: válido (2.633 bytes);
- `npm run descrever -- _mancal-de-mesa --estrito`: 3 partes, 432 faces, 480
  vértices, 0 faces sem identidade, 0 órfãos e 2 portas;
- `npm run revisar:modelagem -- homologacao-mancal --revisao=r001`: promoveu
  `revisoes/r001/revisao.json`, com quatro PNGs e assinatura
  `sha256:0cf82cea15b67b58c5a249e1ebd100e0dc551cb3bd885f8ef2553cc4df4b773b`;
- `npm run id-cru:check`: passou sem ID cru novo;
- `npm run bancada -- _mancal-de-mesa --par=bucha,eixo --res=960`: passou,
  escolheu a vista frontal e publicou URL reproduzível sem deslocar a peça.
- verificação completa: `npm test` passou com 46 arquivos e 1.023 testes;
  `typecheck`, `build`, guards de portas e câmera, mapa, documentação, planos,
  gabarito, IDs crus e exportação também passaram.

As quatro vistas da `r001` foram lidas. Isométrica, frontal e direita confirmam
base, bucha oca e eixo concêntrico; a superior continua ocultando os dois furos
do pé. Assim, identidade, partes, orçamento, interfaces, quatro vistas e
inspeção do par estão demonstrados; o critério visual `furos-de-fixacao`
continua divergente. Não foi criada `r002`: corrigir essa composição exigiria a
hipótese geométrica já registrada e está fora do recorte deste defeito.

Uma segunda invocação concorrente de `r001`, feita somente durante a checagem
operacional, encontrou a promoção já concluída e foi preservada em
`tentativas/` sem sobrescrever a revisão. É evidência incidental da proteção
atômica, não uma nova rodada de modelagem nem bloqueio do Caso 1.

A costura topológica dos anéis de `lathe` permanece apenas como descoberta
separada. Não foi corrigida nem reclassificada nesta repetição.

## Iteração visual 1 — r002, furos de fixação

Hipótese executada: mover os centros de fixação de `Z=0` para `Z=-0,025 m` e
`Z=+0,025 m`, emparelhados com `X=-0,060 m` e `X=+0,060 m`, deve separar os
furos da projeção do eixo e do pedestal na vista superior. A margem até a
borda em profundidade continua 9 mm; raio, envelope, partes, materiais,
interfaces e orçamento não mudam.

A única edição da fonte nesta rodada foi essa posição. A `r001` foi conferida
antes e depois, sem alteração de conteúdo (SHA-256 do arquivo:
`1a984b422a404ae22c86f0f10986b4ce38c1dc144b935af29dd47424d4445f30`).
`npm run revisar:modelagem -- homologacao-mancal --revisao=r002` promoveu as
quatro imagens e `revisao.json` pelo fluxo oficial.

Leitura da `r002`:

- **isométrica:** os dois furos continuam legíveis e estão em cantos opostos
  do pé; bucha e eixo mantêm a leitura anterior;
- **frontal:** nenhuma mudança visual relevante, como esperado para um
  deslocamento em profundidade;
- **direita:** bucha oca e eixo seguem concêntricos;
- **superior:** os dois furos aparecem separados, um em cada lado diagonal do
  pé, sem oclusão pelo pedestal. O critério `furos-de-fixacao` está atendido.

`npm run comparar:revisao -- r001/revisao.json r002/revisao.json` informou
`modeloMudou: false`, sem diferença em caixa, contagens, partes, relações,
aparência ou portas. Isso é a expectativa do contrato atual: ele não descreve
centros de furos internos. Não é regressão desses campos, mas limita o diff
estrutural como prova desta alteração; os PNGs e o gabarito da malha são a
evidência complementar. O gabarito mudou somente para `_mancal-de-mesa`, de
hash `9732ca…407d5c` para `f65271…e7108a`, preservando 480 vértices e 432
faces. `id-cru`, validação estrita, validação do pacote, gabarito atualizado e
inspeção reproduzível de `bucha,eixo` passaram.

Não foi criada `r003`, não houve nova leitura de onboarding e não foi tocada a
costura dos anéis de `lathe`. Casos 2 e 3 continuam sem início.

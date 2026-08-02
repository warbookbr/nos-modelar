# Comece aqui — contexto da Mecanifica

Este é o ponto de entrada para pessoas e agentes. Ele responde o que o produto é,
onde está, qual documento manda em cada assunto e onde procurar código. O
inventário completo do repositório continua sendo gerado em
[`docs/uso/MAPA.md`](../uso/MAPA.md); este arquivo é a camada curta de
orientação e decisão.

## Resumo em um minuto

A Mecanifica será uma oficina 3D interativa para explicar a clientes como os
sistemas de um carro funcionam, o que falhou e o que pode acontecer quando um
reparo é adiado. O projeto reutiliza o núcleo procedural do NÓS, mas constrói uma
aplicação nova em Three.js.

Estado atual:

- as fases 0 a 4 e o primeiro ciclo de implementação estão concluídos (a
  hierarquia navegável de partes ficou adiada, sem bloquear o critério);
- a ponte para Three.js e a bancada de inspeção estão publicadas;
- a bancada provou seleção semântica, isolamento, contexto fantasma, vistas
  reproduzíveis e explosão automática;
- o drone herdado foi usado para encontrar e corrigir um defeito real de
  identidade e forma no trem de pouso;
- o freio a disco dianteiro existe como conjunto paramétrico por partes
  semânticas, com prancha multivista e testes de integridade;
- a fase 4 foi encerrada: o freio dianteiro direito aparece em uma carroceria
  contextual no galpão, com foco, carro fantasma, isolamento e explosão também
  acessíveis em mobile;
- a roda dianteira foi autorada e revisada separadamente na bancada; ela
  substitui a roda decorativa do canto dianteiro direito sem duplicar o cubo;
- um experimento isolado de roda mais realista provou que o núcleo procedural passa
  do low-poly, mas ainda entrega realismo técnico/procedural; ele não foi
  integrado, e o fluxo resultante está documentado em perfis de autoria;
- a Fundação de autoria v1 (ciclo 2) está **concluída** desde 31 de julho de
  2026: `origem` universal e portas semânticas permanecem; a proteção da antiga
  Oficina humana, sua aba de som e a ponte sonora do runtime viraram evidência
  histórica quando essas superfícies foram retiradas;
- o contrato de autoria já foi provado FORA do vocabulário automotivo: a fixture
  `prototipos/fps/v3/pecas/_jardineira.js` (jardineira de janela com uma muda)
  usa os cinco geradores novos e **oito** portas semânticas, com 0 face sem
  identidade e 0 órfão, e mediu onde o contrato ainda para (A-18 a A-20);
- o ciclo "Endereços semânticos v1" está **concluído** desde 31 de julho de
  2026: A-18, A-19, A-20 e A-22 resolvidos, cada um com prova em peça real. Os
  geradores com numeração fechada citam o eixo que já tinham, o eixo aceita
  parâmetro e as palavras `'primeira'`/`'ultima'`, o núcleo devolve as portas
  publicadas e a régua as mostra;
- o ciclo "Arranjos semânticos v1" (ciclo 3, O-13) está **concluído**, núcleo e
  peça, desde 31 de julho de 2026: entrou a op `arranja`, nos modos radial e
  linear, sempre estrutural, com cada cópia endereçável por identidade. A dívida
  A-23 (palavra reservada de extremidade engolindo parâmetro homônimo) foi paga
  junto. As três dívidas menores do ciclo foram pagas depois: o painel de portas
  da bancada ganhou prova de navegador (`npm run guarda:portas`, no CI); o teste
  que comparava uma função com ela mesma virou afirmação de identidade; e a roda
  experimental **foi reescrita** — 141 parâmetros → 43, os cem de coordenada →
  zero, 66 passos → 47, com cada um dos dez braços virando uma parte nomeada e
  isolável. A peça de exercício `prototipos/fps/v3/pecas/_cerca-e-flor.js` prova
  os dois modos do arranjo fora do vocabulário automotivo. A reescrita achou
  A-24: `arranja` copia UMA origem, e o `cilindro` não sabe dizer "a primitiva
  inteira";
- o ciclo 4, **"Corte e orientação de seção v1", está CONCLUÍDO** desde 31 de
  julho de 2026, no núcleo E na peça. Ele é o antigo candidato "Realismo
  geométrico v1", com escopo fechado em duas capacidades gerais: `orientacao` no
  `loft` — o autor declara a direção da seção em vez de herdar o frame implícito
  do gerador (A-25, UP-020) — e a op `furo` (A-27, UP-021), a primeira SUBTRAÇÃO
  do núcleo. `furo` não é uma booleana genérica, e isso é decisão: toda face que
  ele cria é endereçável pela origem `furo` e toda face que ele destrói entra num
  registro de consumo que faz a citação seguinte gritar.
  As duas foram provadas em peça no fechamento: `freio-disco.js` ganhou o
  **flange de roda** — quatro assentos de prisioneiro postos pelo `arranja`
  radial e furados de lado a lado pelo `furo` —, que era a omissão registrada no
  plano; e a peça de exercício `prototipos/fps/v3/pecas/_corrimao.js` (corrimão
  de escada, perfil chato, caminho com torção) prova a orientação declarada fora
  do vocabulário automotivo. A peça de exercício
  `prototipos/fps/v3/pecas/_prateleira-furada.js` já provava o corte no mesmo
  registro. Compor as duas capacidades achou e pagou A-28 (UP-022): a origem do
  `arranja` só sabia responder pela cópia INTEIRA, e `furo` exige uma face só —
  o portão dela passou de igualdade de origem para pertinência de face;
- a rodada **"Furo v2"** fechou em 31 de julho de 2026 e pagou A-26 (UP-023): a
  chave `centros` da op `furo` abre VÁRIOS furos na mesma face num passo só, na
  forma de lista `[[x,y,z], …]` e na de círculo
  `{pivo, distancia, total, volta|graus}` — "quatro furos a 62 mm do centro" é
  uma frase, e o passo se parece com ela, sem seno nem cosseno no formato
  salvo. Cada furo do passo é endereçável sozinho pelo eixo `furo`, dois anéis
  que se cruzam ou se encostam GRITAM, e a borda de vários anéis é uma
  triangulação que não cria vértice nenhum. A peça de exercício
  `prototipos/fps/v3/pecas/_tampa-de-caixa.js` prova o círculo de parafusos
  fora do vocabulário automotivo, com a chapa em UM corpo. Nenhuma peça de
  PRODUTO usa a forma nova: o flange do `freio-disco` continua uma chapa por
  prisioneiro, agora por dívida de peça e não por limite da linguagem;
- a rodada **"Flange de uma peça só"** fechou em 31 de julho de 2026 e pagou a
  dívida de peça que a "Furo v2" deixou: o flange do `freio-disco` deixou de ser
  uma chapa por prisioneiro e virou UM disco com os quatro furos num passo. Os
  quatro ressaltos quadrados nunca foram desenho mecânico — existiam só porque
  cada furo precisava de uma face própria. Medido: corpos da parte `cubo` 5 → 2,
  faces da peça 540 → 504, envelope idêntico, e `prisioneiros` passou a bastar
  sozinho (a peça constrói com 3, 5, 6 e 8, sem cosseno no arquivo). Levar a op
  ao produto ACHOU um defeito no núcleo: a orelha da partição aceitava vértice
  EM CIMA de uma aresta sua, e a face simétrica do flange (16 lados, 4 anéis de
  12 a 90°) gritava. Corrigido; 17 de 240 combinações gritavam antes, 0 depois
  — e essa conta vale DENTRO das 240. Varrendo 14 212, sobram 37 que travam a
  partição, todas face de poucos lados com furo raspando a borda: é o A-33,
  aberto, com a fronteira medida e fixada em teste.
  O que ela NÃO fez: a silhueta do furo continua o polígono de 12 arestas
  (A-31), e o flange tem o raio do cubo, sem degrau piloto/flange, porque o aro
  entra por cima do cubo com 0,6 mm de folga (A-32, novo);
- a rodada **"Borda do furo"** fechou em 31 de julho de 2026 e pagou A-31: a
  serrilha no contorno do furo era do ADAPTADOR, não da peça. `liso` nunca
  chegava ao renderizador (172 faces marcadas no freio, 100% dos triângulos com
  normal chapada) e a triangulação em leque virava a normal nas 4 faces côncavas
  da borda de cada furo. Agora a normal é posta, `liso` soma só entre faces
  lisas, e a triangulação é por orelhas. A silhueta do furo continua o polígono
  de `lados` arestas — isto consertou sombreado e forma da borda, não o contorno;
- **abertos:** A-29 (o passo do arranjo radial só dá centro nomeável em 90°,
  porque a gramática de PARAMS não tem seno nem cosseno — a forma de círculo do
  `centros` desarma o caso do círculo de furos, não o caso geral; o flange
  deixou de ser a evidência dele) e A-32 (o cubo do freio não tem cubo-piloto:
  o flange não pode ser mais largo que o barril, porque o aro entra por cima
  dele com 0,6 mm de folga);
- a primeira fatia de A-30 já permite raios diferentes na mesma face: pontos,
  discos e círculos expandem em ordem estável, `raio` do passo é padrão e o
  furo dentro de outro recebe diagnóstico próprio. Profundidade e seleção por
  nome ainda pertencem às próximas duas fatias;
- A-15 foi **retirado do produto**, não resolvido pela interface: a Oficina
  humana que emitia referências posicionais não existe mais na Mecanifica. O
  gate `id-cru` permanece protegendo as peças escritas por IA;
- a revisão visual oficial de autoria agora é `npm run revisar -- <peça>`: ela
  abre a bancada neutra nas quatro vistas canônicas e recusa geometria cortada
  ou pequena demais; `npm run peca` ficou apenas como diagnóstico herdado;
- o ciclo **Fluxo de modelagem assistida por IA v1** foi concluído em 1º de
  agosto de 2026: pacote curto, guias combináveis, revisão da bancada, crítica
  objetiva e comparação de iterações foram provados por agentes sem contexto
  oculto. Contrato, comandos e limites em
  [`FLUXO-MODELAGEM-IA.md`](FLUXO-MODELAGEM-IA.md);
- a medição A/B pós-ciclo está **concluída**: dois Sols modelaram a mesma peça,
  dois Terra e um árbitro avaliaram às cegas, e a mediana terminou empatada em
  14/16. O fluxo ajudou integração, aderência e rastreabilidade, mas não provou
  ganho líquido de forma ou velocidade; protocolo, artefatos e próximo recorte
  em [`EXPERIMENTO-AB-FLUXO-IA.md`](EXPERIMENTO-AB-FLUXO-IA.md);
- **Revisão visual econômica v1 está concluída:** o A/B revelou que sete
  capturas eram apagadas por enquadramento e a oitava expirou. Agora cada vista
  é enquadrada pelo próprio envelope, a prontidão recebe uma repetição e toda
  recusa conserva imagens e diagnóstico `camera`/`modelo`/`ferramenta`. As duas
  dobradiças congeladas passaram em uma execução cada, sem mudar geometria;
- a Oficina humana herdada, sua aba de som e os harnesses exclusivos foram
  removidos. O Pages publica somente o produto e a bancada; núcleo, peças,
  visor e jogo de referência continuam locais enquanto forem dependências reais;
- o filete real v2 está pausado no Escopo A: `arredondarAresta` cobre o anel
  simples; canto composto/`chamferBox` aguarda comparação com a frente paralela.
  A fronteira está em [`FILETE-V2.md`](FILETE-V2.md);
- caminhada, novos sistemas, narrativa e realismo F3 seguem em backlog, sem
  reabrir ciclos anteriores.

O estado detalhado e os critérios de saída ficam em
[`docs/mecanifica/PLANO.md`](PLANO.md). Se este resumo divergir do plano, o
plano prevalece.

## Hierarquia das fontes

Use esta ordem para resolver dúvidas:

1. [`docs/mecanifica/PLANO.md`](PLANO.md) — o que fazer agora e o que já foi
   concluído;
2. [`docs/mecanifica/COORDENACAO-REPOS.md`](COORDENACAO-REPOS.md) — canal e
   protocolo para trabalho paralelo entre warbook e brigsd;
3. [`docs/mecanifica/COORDENACAO-LOCAL.md`](COORDENACAO-LOCAL.md) — caixa local,
   mensagens econômicas, reservas e consulta de diffs por commit;
4. [`docs/mecanifica/ARQUITETURA.md`](ARQUITETURA.md) — fronteiras, dependências
   e direção técnica;
5. [`docs/mecanifica/AUTORIA-IA.md`](AUTORIA-IA.md) — contrato para criação e
   refinamento por IA;
6. [`docs/mecanifica/PERFIS-DE-AUTORIA.md`](PERFIS-DE-AUTORIA.md) — escolha do
   fluxo visual, fidelidade, precisão, interação e orçamento;
7. [`docs/mecanifica/REFERENCIA-E-CRITICA-VISUAL.md`](REFERENCIA-E-CRITICA-VISUAL.md)
   — briefing por peça, revisão intermediária e critério para extrair uma skill;
8. [`docs/mecanifica/BANCADA-E-APRESENTACAO.md`](BANCADA-E-APRESENTACAO.md) —
   autoria visual e experiência do cliente;
9. [`docs/mecanifica/FILETE-V2.md`](FILETE-V2.md) — contrato e gate do
   arredondamento real de aresta;
10. [`docs/mecanifica/FLUXO-MODELAGEM-IA.md`](FLUXO-MODELAGEM-IA.md) — pacote,
   revisão e crítica do ciclo ativo de modelagem por IA;
11. [`docs/mecanifica/EXPERIMENTO-AB-FLUXO-IA.md`](EXPERIMENTO-AB-FLUXO-IA.md) —
   medição cega do efeito real do fluxo sobre dois modeladores Sol;
12. [`docs/mecanifica/VISAO.md`](VISAO.md) — propósito, experiência e limites do
   produto;
13. [`docs/mecanifica/PRANCHA-FREIO-DISCO.md`](PRANCHA-FREIO-DISCO.md) — vistas
   ortogonais, partes e medidas nomeadas do primeiro sistema mecânico;
14. [`docs/mecanifica/ATRITOS-AUTORIA.md`](ATRITOS-AUTORIA.md) — dificuldades
   observadas ao modelar de verdade, e as capacidades que elas justificam;
15. [`docs/mecanifica/OFICINA-OTIMIZACOES.md`](OFICINA-OTIMIZACOES.md) — plano
   ordenado de mudanças na linguagem de autoria, com trade-off e custo;
16. [`docs/mecanifica/UPSTREAM-NOS.md`](UPSTREAM-NOS.md) — capacidades
   reaproveitáveis no NÓS;
17. [`docs/mecanifica/RELATORIO-PONTE-THREE.md`](RELATORIO-PONTE-THREE.md) —
    evidência da primeira integração.

`README.md` apresenta o projeto ao público. `AGENTS.md` e `CLAUDE.md` resumem as
regras de trabalho, mas não substituem os documentos acima.

A prova isolada do novo fluxo está em
[`EXPERIMENTO-RODA-REALISTA.md`](EXPERIMENTO-RODA-REALISTA.md), com execução e
limitações em [`RELATO-RODA-REALISTA.md`](RELATO-RODA-REALISTA.md). Ela é
evidência, não uma peça integrada nem um roteiro concorrente.

Os conteúdos em `docs/uso/`, `docs/rumo/` e `docs/historico/` pertencem ao NÓS
herdado. Eles são referência técnica ou histórica, não roteiro da Mecanifica.

## Leia conforme a tarefa

| Tarefa | Leitura necessária |
|---|---|
| Entender produto ou decidir escopo | [`docs/mecanifica/VISAO.md`](VISAO.md) e [`docs/mecanifica/PLANO.md`](PLANO.md) |
| Coordenar trabalho com o repositório do brigsd | [`docs/mecanifica/COORDENACAO-LOCAL.md`](COORDENACAO-LOCAL.md) e [`docs/mecanifica/COORDENACAO-REPOS.md`](COORDENACAO-REPOS.md) |
| Alterar módulos ou dependências | [`docs/mecanifica/ARQUITETURA.md`](ARQUITETURA.md) |
| Criar ou refinar uma peça | [`docs/mecanifica/AUTORIA-IA.md`](AUTORIA-IA.md), [`docs/mecanifica/PERFIS-DE-AUTORIA.md`](PERFIS-DE-AUTORIA.md), [`docs/mecanifica/REFERENCIA-E-CRITICA-VISUAL.md`](REFERENCIA-E-CRITICA-VISUAL.md) e [`docs/mecanifica/BANCADA-E-APRESENTACAO.md`](BANCADA-E-APRESENTACAO.md) |
| Avaliar se o fluxo ajuda uma IA a modelar | [`docs/mecanifica/EXPERIMENTO-AB-FLUXO-IA.md`](EXPERIMENTO-AB-FLUXO-IA.md) |
| Escolher realismo ou direção visual | [`docs/mecanifica/PERFIS-DE-AUTORIA.md`](PERFIS-DE-AUTORIA.md) e [`docs/mecanifica/REFERENCIA-E-CRITICA-VISUAL.md`](REFERENCIA-E-CRITICA-VISUAL.md) |
| Mexer no freio a disco | [`docs/mecanifica/PRANCHA-FREIO-DISCO.md`](PRANCHA-FREIO-DISCO.md) |
| Mexer na roda dianteira | [`docs/mecanifica/PRANCHA-RODA-DIANTEIRA.md`](PRANCHA-RODA-DIANTEIRA.md); para a prova isolada, [`docs/mecanifica/EXPERIMENTO-RODA-REALISTA.md`](EXPERIMENTO-RODA-REALISTA.md) e [`docs/mecanifica/RELATO-RODA-REALISTA.md`](RELATO-RODA-REALISTA.md) |
| Trabalhar na bancada ou apresentação | [`docs/mecanifica/BANCADA-E-APRESENTACAO.md`](BANCADA-E-APRESENTACAO.md) |
| Alterar o núcleo herdado | [`docs/uso/oficina-contrato.md`](../uso/oficina-contrato.md) e [`docs/uso/oficina-referencia.md`](../uso/oficina-referencia.md) |
| Melhorar a linguagem de autoria | [`docs/mecanifica/OFICINA-OTIMIZACOES.md`](OFICINA-OTIMIZACOES.md) e [`docs/mecanifica/ATRITOS-AUTORIA.md`](ATRITOS-AUTORIA.md) |
| Preparar contribuição ao NÓS | [`docs/mecanifica/UPSTREAM-NOS.md`](UPSTREAM-NOS.md) |
| Investigar decisões antigas | [`docs/uso/RECURSOS.md`](../uso/RECURSOS.md) e [`docs/uso/MAPA.md`](../uso/MAPA.md) |

Não é necessário ler todos os documentos antes de uma tarefa. Leia este índice,
o plano e somente as referências da linha aplicável.

## Estrutura principal

| Caminho | Responsabilidade |
|---|---|
| `src/` | aplicação nova da Mecanifica em Three.js |
| `src/autoria/` | adaptação neutra do núcleo procedural para renderização |
| `src/bancada/` | estúdio, câmeras, seleção, isolamento, explosão e estado por URL |
| `src/cena/` | composição visual da experiência principal |
| `src/dominio/mecanica/` | registros estáveis de sistemas automotivos, independentes do runtime Three.js |
| `src/interacao/` | interações semânticas da aplicação |
| `prototipos/fps/v3/` | núcleo, peças, visor e jogo de referência herdados; sem Oficina humana |
| `tools/mecanifica/` | testes headless dos contratos novos |
| `tools/modelagem/` | preparação, validação, revisão, crítica e comparação do fluxo assistido por IA |
| `tools/coordenacao/` | caixa postal local, reservas e metadados Git entre agentes |
| `autoria-assistida/` | guias curtos e pacotes de prova versionados para agentes modeladores e críticos |
| `tools/bancadas/` | ferramentas visuais e gates herdados ou compartilhados |
| `tools/mapa/` | geração do inventário e validação da documentação |
| `docs/mecanifica/` | fontes de verdade do produto atual |
| `docs/uso/`, `docs/rumo/`, `docs/historico/` | documentação do NÓS herdado |
| `.github/workflows/` | CI e publicação no GitHub Pages |

Para localizar um arquivo específico, consulte
[`docs/uso/MAPA.md`](../uso/MAPA.md). Ele é gerado a partir do cabeçalho de cada
arquivo e cobre código e documentação sem manter uma segunda descrição manual.

## Entradas executáveis

- `index.html` — aplicação principal;
- `bancada.html` — bancada neutra de autoria e inspeção; aceita `?peca=<nome>`
  para abrir qualquer peça de `prototipos/fps/v3/pecas/`;
- `https://warbookbr.github.io/nos-mecanifica/` — publicação da aplicação;
- `https://warbookbr.github.io/nos-mecanifica/bancada.html` — bancada publicada.

Desenvolvimento local:

```bash
npm ci
npm run dev
```

Inspeção sem navegador — dirige a bancada pela URL e salva PNG por vista, para
que uma sessão headless possa ver o que está modelando:

```bash
npm run bancada -- --listar
npm run bancada -- drone-inspecao --vistas=direita,frontal
npm run bancada -- drone-inspecao --selecionadas=lente --modo=isolar --focar
```

Conferência em número, sem foto — imprime caixa, centro, dimensões e faces por
parte semântica, e a folga ou interpenetração entre pares de partes. Foto não
tem escala nem eixo; esta é a régua:

```bash
npm run descrever -- freio-disco
npm run descrever -- freio-disco --partes=disco,pastilhaInterna,pistao
npm run descrever -- roda-dianteira
npm run descrever -- _jardineira --estrito
npm run descrever -- _cerca-e-flor --estrito
npm run descrever -- _prateleira-furada --estrito
npm run descrever -- _corrimao --estrito
npm run descrever -- _tampa-de-caixa --estrito
```

Prova de comportamento no navegador — dirige a bancada real e confere as portas
semânticas renderizadas no DOM:

```bash
npm run guarda:portas
```

`npm run guarda:portas` é a mesma ideia do outro lado da ferramenta: dirige a
bancada pela URL e afirma sobre o DOM renderizado que a peça com portas mostra as
oito portas e que a peça sem portas não mostra a seção. O painel do A-20 vive em
`src/bancada/main.js`, que nenhum arquivo de teste importa; sem esta prova ele
podia ser apagado inteiro com os outros gates verdes.

Verificação completa:

```bash
npm test
npm run typecheck
npm run build
npm run gabarito:selecao:check
npm run id-cru:check
npm run guarda:portas
npm run mapa:check
npm run docs:toc:check
npm run docs:links:check
```

`npm run id-cru:check` é o gate do O-4: peça **nova** que enderece geometria por
id posicional reprova. Cobre as **seis** formas de coleção que o núcleo lê —
`faces:[ids]`, `sel:{v}`, `sel:{f}`, `vs:[ids]` (`pesar`), `pontos:[{f}]`
(pincel livre) e `de:[ids]` (`mescla`) —, contando **id**, não passo. As formas
singulares (`face`, `v`, `a`/`b`, `para`) ficam fora, declarado no cabeçalho da
ferramenta. A chave `de` tem dois contratos desde o O-12 e só um é id cru: o
`de:{op,id,...}` do `publicarPorta` é origem estrutural, irmã de `sel:{origem}`,
e o gate distingue pela FORMA — objeto plano com `op` e `id` não conta. As peças herdadas ficam numa lista explícita e versionada em
`tools/bancadas/id-cru-herdado.json`, com a contagem exata congelada — a dívida
não cresce e, quando é paga, `npm run id-cru` encolhe a lista. A regra de "o que
é referência posicional" mora num módulo só,
`prototipos/fps/v3/motor/referencia-posicional.js`, importado pelo gate. Ela
viveu copiada em três lugares na antiga Oficina e divergiu duas vezes na chave
`de`; essa história e a extração para o NÓS estão preservadas em
[`ATRITOS-AUTORIA.md`](ATRITOS-AUTORIA.md) e
[`UPSTREAM-NOS.md`](UPSTREAM-NOS.md).

## Fluxo para uma sessão nova

1. Leia este arquivo e `docs/mecanifica/PLANO.md`.
2. Confirme a árvore de trabalho antes de editar.
3. Leia somente os documentos indicados para a tarefa.
4. Preserve as fronteiras entre núcleo, Three.js, domínio automotivo e interface.
5. Faça uma prova visível ou mensurável.
6. Rode os gates proporcionais ao risco.
7. Atualize plano, índice e registro upstream quando o estado real mudar.

## Estado e próximo ciclo

O ciclo 1 terminou na Fase 4. `index.html` contém a prova encerrada: carroceria
simplificada, galpão mínimo, registro semântico, modos
carro/contexto/isolar, seleção por parte e explosão autoral do freio. A roda
experimental permanece somente como evidência de autoria.

O ciclo 2, “Fundação de autoria v1”, fechou em 31 de julho de 2026. O ciclo 2b,
“Endereços semânticos v1”, fechou no mesmo dia e pagou a dívida que a
verificação daquele fechamento tinha medido (A-18, A-19, A-20 e A-22). A
conferência dos dois gates, condição por condição, e a lista de comandos da
verificação completa estão em [`PLANO.md`](PLANO.md).

O ciclo 3, “Arranjos semânticos v1”, fechou em 31 de julho de 2026, no núcleo e
na peça: `arranja` radial e linear, cada cópia endereçável por identidade, a
dívida A-23 paga junto e, no fechamento, a roda experimental reescrita e a peça
de exercício `_cerca-e-flor` provando os dois modos fora do vocabulário
automotivo. Ele **não** levou a op a nenhuma peça de produto: `freio-disco.js`
não foi tocada, e o prisioneiro de roda e a aleta de ventilação continuam não
modelados.

O ciclo 4, “Corte e orientação de seção v1”, fechou em 31 de julho de 2026, no
núcleo e na peça: `orientacao` no `loft`, a op `furo` passante e cega, o flange
de roda furado do `freio-disco` e o corrimão de perfil chato. A dívida A-28,
achada ao compor as duas, foi paga junto; A-26 e A-29 ficaram abertos.

A rodada avulsa “Flange de uma peça só” fechou em 31 de julho de 2026 e levou o
`centros` a uma peça de PRODUTO: o flange do freio virou um disco com quatro
furos, e a prova em produto achou e pagou um defeito da partição do núcleo.

**O ciclo 5, “Curva e filete v1”, está CONCLUÍDO.** As duas capacidades que
sobraram da crítica da roda entraram: a alça de curva do 3º elemento do ponto
virou raio de concordância no `lathe`, no `loft` e no `inflate`, e a op `filete`
corta UMA aresta escolhida por identidade. As nove condições do gate estão
conferidas uma a uma em [`PLANO.md`](PLANO.md). Provas: `_caixote-filetado`
(móvel, usa as duas), o ombro do pneu da `roda-dianteira` e o chanfro de entrada
e saída das pastilhas do `freio-disco`.

Duas coisas achadas dentro do ciclo, ditas na cara: a condição 2 media a
distância dos vértices ao arco, que é exata por construção e não podia falhar;
e o primeiro desenho do filete deixava a face com um canto em cima da aresta
seguinte, com o neutro fechado e a contagem certa — quem gritou foi o adaptador,
e só numa peça de verdade. **Malha fechada e contagem certa não provam polígono
simples.**

**Próxima entrega: o ciclo 6, “Furo por grupo, contagem por desvio e filete v2”,
ABERTO, com plano completo em [`PLANO.md`](PLANO.md).** Ele paga A-30, A-34,
A-36 e A-37 na mesma rodada: 7 frentes, 29 fatias que se commitam verdes, gate
medido e linha de base tirada do repositório de hoje. Os projetos que o
originaram estão em `docs/mecanifica/projetos/ciclo6/`, com o mapa de terreno,
as oito propostas independentes, os quatro vereditos de júri, o cruzamento e as
três críticas adversariais.

Três medições feitas no projeto mudaram o rumo antes de qualquer código. A
candidata registrada do A-34 estava errada: quebrar a quina da borda do furo
PIORA a ondulação do contorno em 9,5%, e subir `lados` de 12 para 20 a reduz em
64% pelo mesmo orçamento de faces — então o A-34 virou `lados` com unidade, e a
quebra saiu como A-38. O diagnóstico do A-36 gravado no núcleo estava errado no
motivo: a tentativa antiga não falhou pela interpolação esférica, falhou porque
pôs o centro do arco na aresta em vez da bissetriz, e a lista de ângulos dela é a
lista certa ao contrário. E o A-37 foi prototipado: dos 408 pares (face, aresta)
varridos, 84 construíam e passaram a 376, com 0 regressões.

## Manutenção desta documentação

- Mude `docs/mecanifica/PLANO.md` quando o estado das fases mudar.
- Mude este índice quando mudar a estrutura principal, a hierarquia documental
  ou a próxima entrega.
- Dê a todo arquivo novo um cabeçalho que descreva sua responsabilidade.
- Rode `npm run mapa` depois de criar, remover, renomear ou mudar o cabeçalho de
  um arquivo.
- Rode `npm run docs:links:check` para garantir que toda documentação continue
  alcançável a partir deste índice.

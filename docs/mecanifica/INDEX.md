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
  — e essa conta vale DENTRO das 240. A varredura histórica de 14 212 encontrou
  37 que travavam a partição, todas face de poucos lados com furo raspando a
  borda. O A-33 fechou depois: o caminho de pontes antigo fica intacto, e o
  fallback completo só entra quando ele esgota; as 37 assinaturas viraram
  regressão fixa de casca fechada e contagem exata.
  O que ela NÃO fez naquele momento: a silhueta continuou com a contagem escrita
  e o flange tem o raio do cubo, sem degrau piloto/flange, porque o aro
  entra por cima do cubo com 0,6 mm de folga (A-32, novo);
- a rodada **"Borda do furo"** fechou em 31 de julho de 2026 e pagou A-31: a
  serrilha no contorno do furo era do ADAPTADOR, não da peça. `liso` nunca
  chegava ao renderizador (172 faces marcadas no freio, 100% dos triângulos com
  normal chapada) e a triangulação em leque virava a normal nas 4 faces côncavas
  da borda de cada furo. Agora a normal é posta, `liso` soma só entre faces
  lisas, e a triangulação é por orelhas. A silhueta do furo continua o polígono
  de `lados` arestas — isto consertou sombreado e forma da borda, não o contorno;
- o A-34 foi pago depois por `lados:{desvio}`: em `cilindro`, `cone` e `furo`,
  a IA declara uma tolerância em metros e o núcleo deriva a menor contagem. A
  fixture `_gabarito-de-furacao` prova as três operações; o modo numérico antigo
  continua byte-idêntico;
- **abertos:** A-29 (o passo do arranjo radial só dá centro nomeável em 90°,
  porque a gramática de PARAMS não tem seno nem cosseno — a forma de círculo do
  `centros` desarma o caso do círculo de furos, não o caso geral; o flange
  deixou de ser a evidência dele) e A-32 (o cubo do freio não tem cubo-piloto:
  o flange não pode ser mais largo que o barril, porque o aro entra por cima
  dele com 0,6 mm de folga);
- A-30 já permite raios diferentes na mesma face: pontos,
  discos e círculos expandem em ordem estável, `raio` do passo é padrão e o
  furo dentro de outro recebe diagnóstico próprio. Em furo cego, esses grupos
  também podem declarar profundidades diferentes; mistura com passante continua
  proibida. Disco e círculo podem receber nome único e ser selecionados pela
  origem `furo` sem depender de posição. A peça `_flange-de-tubulacao` fecha a
  prova: passagem central e círculo de parafusos têm endereços por grupo, e as
  figuras gerais cobrem furos fora do centro e três profundidades cegas;
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
  removidos. A bancada é a única aplicação publicada por este repositório;
- o produto do cliente foi separado para [`warbookbr/mecanica`](https://github.com/warbookbr/mecanica).
  Este repositório executa o núcleo e exporta peças resolvidas, determinísticas
  e versionadas; o produto lê esses dados sem carregar a linguagem de autoria;
- `arredondarAresta` agora cobre também o canto composto de `chamferBox`: o
  caminho simples permanece byte-idêntico e o triângulo de canto preserva sua
  identidade ao receber a sequência do arco. A fixture neutra e as 24 arestas
  nominais ficaram provadas; produto continua separado em backlog. A fronteira
  e os limites estão em [`FILETE-V2.md`](FILETE-V2.md);
- caminhada, novos sistemas, narrativa e realismo F3 seguem em backlog, sem
  reabrir ciclos anteriores.
- o plano mestre de 2.417 linhas foi encerrado. O novo índice de planos não
  declara plano ativo; backlog não autoriza implementação automática.

O estado do planejamento fica em [`planos/README.md`](planos/README.md). O antigo
[`PLANO.md`](PLANO.md) é somente um ponto de compatibilidade para o encerramento.

## Hierarquia das fontes

Use esta ordem para resolver dúvidas:

1. [`docs/mecanifica/planos/README.md`](planos/README.md) — plano ativo, contrato
   dos planos curtos e backlog de candidatos; use
   [`BACKLOG.md`](planos/BACKLOG.md) (`docs/mecanifica/planos/BACKLOG.md`) para
   candidatos, [`MODELO.md`](planos/MODELO.md)
   (`docs/mecanifica/planos/MODELO.md`) para abrir um plano e o
   [`encerramento do plano mestre`](planos/ENCERRAMENTO-PLANO-MESTRE-2026-08-02.md)
   (`docs/mecanifica/planos/ENCERRAMENTO-PLANO-MESTRE-2026-08-02.md`)
   somente para contexto da transição;
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
10. [`docs/mecanifica/MONTAGENS-SEMANTICAS.md`](MONTAGENS-SEMANTICAS.md) — visão
   macro, cuidados lógicos e níveis de maturidade para posição, encaixe,
   hierarquia e montagens em escala;
11. [`docs/mecanifica/FLUXO-MODELAGEM-IA.md`](FLUXO-MODELAGEM-IA.md) — pacote,
   revisão e crítica do fluxo de modelagem por IA já entregue;
12. [`docs/mecanifica/EXPERIMENTO-AB-FLUXO-IA.md`](EXPERIMENTO-AB-FLUXO-IA.md) —
   medição cega do efeito real do fluxo sobre dois modeladores Sol;
13. [`docs/mecanifica/VISAO.md`](VISAO.md) — propósito, experiência e limites do
   produto;
14. [`docs/mecanifica/PRANCHA-FREIO-DISCO.md`](PRANCHA-FREIO-DISCO.md) — vistas
   ortogonais, partes e medidas nomeadas do primeiro sistema mecânico;
15. [`docs/mecanifica/ATRITOS-AUTORIA.md`](ATRITOS-AUTORIA.md) — dificuldades
   observadas ao modelar de verdade, e as capacidades que elas justificam;
16. [`docs/mecanifica/OFICINA-OTIMIZACOES.md`](OFICINA-OTIMIZACOES.md) — análise
   de dependências e candidatos da linguagem de autoria;
17. [`docs/mecanifica/UPSTREAM-NOS.md`](UPSTREAM-NOS.md) — capacidades
   reaproveitáveis no NÓS;
18. [`docs/mecanifica/RELATORIO-PONTE-THREE.md`](RELATORIO-PONTE-THREE.md) —
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
| Entender produto ou decidir escopo | [`docs/mecanifica/VISAO.md`](VISAO.md) e [`docs/mecanifica/planos/README.md`](planos/README.md) |
| Coordenar trabalho com o repositório do brigsd | [`docs/mecanifica/COORDENACAO-LOCAL.md`](COORDENACAO-LOCAL.md) e [`docs/mecanifica/COORDENACAO-REPOS.md`](COORDENACAO-REPOS.md) |
| Alterar módulos ou dependências | [`docs/mecanifica/ARQUITETURA.md`](ARQUITETURA.md) |
| Criar ou refinar uma peça | [`docs/mecanifica/AUTORIA-IA.md`](AUTORIA-IA.md), [`docs/mecanifica/PERFIS-DE-AUTORIA.md`](PERFIS-DE-AUTORIA.md), [`docs/mecanifica/REFERENCIA-E-CRITICA-VISUAL.md`](REFERENCIA-E-CRITICA-VISUAL.md) e [`docs/mecanifica/BANCADA-E-APRESENTACAO.md`](BANCADA-E-APRESENTACAO.md) |
| Avaliar se o fluxo ajuda uma IA a modelar | [`docs/mecanifica/EXPERIMENTO-AB-FLUXO-IA.md`](EXPERIMENTO-AB-FLUXO-IA.md) |
| Escolher realismo ou direção visual | [`docs/mecanifica/PERFIS-DE-AUTORIA.md`](PERFIS-DE-AUTORIA.md) e [`docs/mecanifica/REFERENCIA-E-CRITICA-VISUAL.md`](REFERENCIA-E-CRITICA-VISUAL.md) |
| Mexer no freio a disco | [`docs/mecanifica/PRANCHA-FREIO-DISCO.md`](PRANCHA-FREIO-DISCO.md) |
| Mexer na roda dianteira | [`docs/mecanifica/PRANCHA-RODA-DIANTEIRA.md`](PRANCHA-RODA-DIANTEIRA.md); para a prova isolada, [`docs/mecanifica/EXPERIMENTO-RODA-REALISTA.md`](EXPERIMENTO-RODA-REALISTA.md) e [`docs/mecanifica/RELATO-RODA-REALISTA.md`](RELATO-RODA-REALISTA.md) |
| Trabalhar na bancada ou apresentação | [`docs/mecanifica/BANCADA-E-APRESENTACAO.md`](BANCADA-E-APRESENTACAO.md) |
| Planejar posição, encaixe, hierarquia ou montagens em escala | [`docs/mecanifica/MONTAGENS-SEMANTICAS.md`](MONTAGENS-SEMANTICAS.md) |
| Alterar o núcleo herdado | [`docs/uso/oficina-contrato.md`](../uso/oficina-contrato.md) e [`docs/uso/oficina-referencia.md`](../uso/oficina-referencia.md) |
| Melhorar a linguagem de autoria | [`docs/mecanifica/OFICINA-OTIMIZACOES.md`](OFICINA-OTIMIZACOES.md) e [`docs/mecanifica/ATRITOS-AUTORIA.md`](ATRITOS-AUTORIA.md) |
| Preparar contribuição ao NÓS | [`docs/mecanifica/UPSTREAM-NOS.md`](UPSTREAM-NOS.md) |
| Investigar decisões antigas | [`docs/uso/RECURSOS.md`](../uso/RECURSOS.md) e [`docs/uso/MAPA.md`](../uso/MAPA.md) |

Não é necessário ler todos os documentos antes de uma tarefa. Leia este índice,
o índice de planos e somente as referências da linha aplicável.

## Estrutura principal

| Caminho | Responsabilidade |
|---|---|
| `src/` | superfícies Three.js da autoria; o produto vive em `warbookbr/mecanica` |
| `src/autoria/` | adaptação neutra do núcleo e leitor puro do formato de peça resolvida |
| `src/bancada/` | estúdio, câmeras, seleção, isolamento, explosão e estado por URL |
| `pecas-resolvidas/` | artefatos versionados que atravessam para o produto; gerados, nunca editados à mão |
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

- `bancada.html` — bancada neutra de autoria e inspeção; aceita `?peca=<nome>`
  para abrir qualquer peça de `prototipos/fps/v3/pecas/`;
- `https://warbookbr.github.io/nos-mecanifica/bancada.html` — bancada publicada.
- `https://warbookbr.github.io/mecanica/` — produto do cliente, publicado pelo
  repositório separado.

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

`npm run guarda:camera` complementa a prova: orbita a bancada ortográfica,
verifica `vista=livre` e a câmera explícita na URL, recarrega e compara o estado
restaurado. O helper puro não basta para vigiar a ligação com a câmera real.

Verificação completa:

```bash
npm test
npm run typecheck
npm run build
npm run gabarito:selecao:check
npm run id-cru:check
npm run guarda:portas
npm run guarda:camera
npm run mapa:check
npm run docs:toc:check
npm run docs:links:check
npm run planos:check
npm run exportar:check
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

1. Leia este arquivo e `docs/mecanifica/planos/README.md`.
2. Confirme a árvore de trabalho antes de editar.
3. Leia somente os documentos indicados para a tarefa.
4. Preserve as fronteiras entre núcleo, Three.js, domínio automotivo e interface.
5. Faça uma prova visível ou mensurável.
6. Rode os gates proporcionais ao risco.
7. Atualize o plano ativo, o índice de planos e o registro upstream quando o
   estado real mudar.

## Planejamento atual

Não há plano ativo. Os Recortes A, B e C de `AUT-05` foram concluídos em
[`AUT-2026-06`](planos/2026-08-02-interfaces-de-encaixe.md) e
[`AUT-2026-07`](planos/2026-08-02-pose-derivada-roda.md): interfaces cilíndricas
mensuráveis e prévia pura de pose para uma peça móvel, derivada de uma relação
com quadro explícito; [`AUT-2026-08`](planos/2026-08-02-pose-em-referencial.md)
completa a composição local/mundo em referencial rígido. Hierarquia, múltiplas
relações, persistência e solver continuam candidatos. O plano mestre foi
encerrado em 2 de agosto de 2026 e seu
resultado está sintetizado em
[`planos/ENCERRAMENTO-PLANO-MESTRE-2026-08-02.md`](planos/ENCERRAMENTO-PLANO-MESTRE-2026-08-02.md).

Os caminhos canônicos dos três recortes são
`docs/mecanifica/planos/2026-08-02-pose-derivada-roda.md` e
`docs/mecanifica/planos/2026-08-02-interfaces-de-encaixe.md` e
`docs/mecanifica/planos/2026-08-02-pose-em-referencial.md`.

Depois dele, o plano curto [`AUT-2026-01`](planos/2026-08-02-contagem-por-desvio.md)
pagou A-34 com contagem circular por tolerância e também foi encerrado.

O plano curto [`AUT-2026-05`](planos/2026-08-02-camera-livre-reproduzivel.md)
pagou A-1: qualquer órbita da bancada é reproduzível pela URL, sem mudar as
vistas canônicas existentes.

O plano curto seguinte [`AUT-2026-02`](planos/2026-08-02-concordancia-por-ponto.md)
pagou A-35 com discretização local de concordâncias e também foi encerrado.

A F1 do antigo Ciclo 6 foi aceita como entrega independente e pagou A-30. As
demais fatias foram canceladas porque o desenho importado transformaria
`filete` em arredondamento multipainel, em conflito com a decisão convergida de
preservar `filete` como chanfro e usar `arredondarAresta` para arco real.

Capacidades ainda válidas, narrativa de desgaste, peças e melhorias de fluxo
estão no [`BACKLOG.md`](planos/BACKLOG.md). Elas são candidatas sem ordem de
execução. O próximo plano só nasce após escolha explícita, com um resultado,
escopo excluído e gate próprios.

## Manutenção desta documentação

- Mude `docs/mecanifica/planos/README.md` quando um plano for ativado ou
  encerrado. Não reabra o plano mestre aposentado.
- Mude este índice quando mudar a estrutura principal, a hierarquia documental
  ou o plano ativo.
- Dê a todo arquivo novo um cabeçalho que descreva sua responsabilidade.
- Rode `npm run mapa` depois de criar, remover, renomear ou mudar o cabeçalho de
  um arquivo.
- Rode `npm run docs:links:check` para garantir que toda documentação continue
  alcançável a partir deste índice.

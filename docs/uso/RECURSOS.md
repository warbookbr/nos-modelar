# Recursos técnicos do Atelier herdado

Este é o catálogo detalhado das ferramentas e da documentação do NÓS herdado,
especialmente o **Atelier** em `prototipos/fps/v3/`. Ele não é o roteiro da
Mecanifica.

**Sessão nova na Mecanifica? Comece por
`docs/mecanifica/INDEX.md`.** Volte a este arquivo quando a tarefa tocar no
núcleo, nas bancadas ou no histórico herdado. Achou tooling do Atelier que não
está listado? Adicione — a próxima sessão agradece.

## Pré-requisito das bancadas visuais

`npm ci` na raiz, uma vez por checkout fresco (o Playwright está nas devDependencies;
o Chromium já vem no ambiente). Sem isso, as bancadas saem avisando.

## Scripts npm (`package.json` da raiz)

### Gates (rodam no CI — rode antes de todo commit)

| Comando | O que faz |
|---|---|
| `npm run typecheck` | `tsc --noEmit` sobre os contratos TypeScript em `tools/` |
| `npm test` | Vitest — os testes de núcleo (`tools/**/*.test.ts`) |
| `npm run mapa:check` | O mapa do repo está em dia? Falha se `docs/uso/MAPA.md` estiver velho ou se algum arquivo estiver SEM cabeçalho — criou arquivo? dê cabeçalho e rode `npm run mapa` |
| `npm run docs:toc:check` | O índice de `docs/oficina.md` está em dia? (regenerar: `npm run docs:toc`) |
| `npm run docs:links:check` | Referências resolvem e toda documentação está alcançável a partir de `docs/mecanifica/INDEX.md` |

### Bancadas — objeto / render

| Comando | O que faz |
|---|---|
| `npm run peca -- <nome>` | **O visor de peça**: renderiza uma peça de `prototipos/fps/v3/pecas/` em 3 ângulos → PNGs em `tools/bancadas/out/` (LEIA-os). `--res=1400`, `--giro=8` (8 ângulos), `--geo=normais\|flat` (SEM textura: emenda/faceta/silhueta saltam), `--e=<alt> --r=<raio>` (câmera) |
| `npm run oficina` | **A bancada da Oficina**: prova cada passo do editor (câmera, arrasto, undo, gizmo, extrude, mescla, pincel, exportar, materiais, animação, esqueleto) com NÚMERO — Playwright com eventos reais |
| `npm run guarda:salvar` | **A guarda do salvar pelo BOTÃO REAL** (A-15): edição por id posicional não chega ao POST nem ao fallback de download, peça semântica salva normal — dois servidores, um com a rota do `servir.mjs` e outro sem |
| `npm run porteiro -- <peca>` | **Gate de render**: pageerror / `__ready` / frame degenerado |
| `npm run gabarito -- <peca>` | **FORMA COMO NÚMERO (P5)**: mede a silhueta renderizada × o contorno de referência de `prototipos/fps/v3/gabaritos/<peca>.js` — IoU + VEREDITO calibrado (exit≠0 = reprovado), evidência em PNG (`tools/bancadas/out/gabarito-*`). Sem gabarito pra peça, falha alto (nada medido) |
| `npm run criar -- <peca>` | **O LAÇO ÚNICO (P7)**: um comando só — estado do núcleo (vértices/faces/caixa/colisão), o manifesto de capacidades (`OPS` do núcleo × a skill `criar-peca`, aponta deriva), `porteiro`+`gabarito` (se houver) e um VEREDITO AGREGADO (exit≠0 = reprovado). Renders em `tools/bancadas/out/criar-*` — LEIA-os. |
| `npm run executar` | Replay headless do núcleo (`nucleo`/`neutroCanonico`) em Node — determinismo/replay |

### Dev

| Comando | O que faz |
|---|---|
| `npm run servir` | Servidor local do v3 (`no-store`): `oficina.html`/`som.html` com SALVAR de verdade (`POST /oficina/salvar` → `pecas/`, `POST /som/salvar` → `pecas-som/`) |
| `npm run mapa` / `docs:toc` | Regenera `docs/uso/MAPA.md` / o índice de `docs/oficina.md` |

## Skills — `.claude/skills/`

| Skill | Pra quê |
|---|---|
| `nos-fluxo` | O FLUXO de entregar qualquer feature: orquestrar coder+revisor, jóias, gates, git, registrar decisão |
| `oficina` | A ARQUITETURA da Oficina (núcleo/adaptador/interface, o que cada passo construiu, armadilhas) — pra mexer NA ferramenta |
| `criar-peca` | CRIAR CONTEÚDO com a Oficina (objeto, som, animação por lista de PASSOS + o laço de ver/medir) — pra usar a ferramenta |
| `auditar-peca` | O gate de senso crítico + a visão de geometria — julgar peça com número, não opinião |

## Agentes — `.claude/agents/` (D-24, D-106)

O orquestrador briefa e integra, registrando em `docs/historico/DECISIONS.md`.

| Agente | Papel | Quando despachar | Modelo |
|---|---|---|---|
| `game-builder` | Constrói o v3 (motor GPU, Oficina, som, animação, interface); jóias aditivas, três camadas, prova por medição, branch wip sem push | qualquer feature do v3 | sonnet |
| `revisor-adversarial` | Tenta QUEBRAR por risco: fundação / formato salvo / jóia / conta de julgamento | quando é fundação, mexe no formato salvo, toca uma jóia, ou tem julgamento (dispensa se já provado byte-idêntico) | **opus** |

O DOMÍNIO (som/animação/geometria/pintura) mora nas **skills**, não num agent
por assunto (D-106). Os 6 agents da era 2D e a skill `estruturas` (v2) foram
aposentados — vivem no histórico do git.

## Catálogo documental

Este catálogo mantém todo documento herdado localizável. A hierarquia e a
leitura progressiva da Mecanifica estão em `docs/mecanifica/INDEX.md`; as
classificações “uso”, “rumo” e “histórico” abaixo se referem ao NÓS no estado em
que foi clonado.

### `docs/mecanifica/` — produto e integração

- **`docs/mecanifica/INDEX.md`** — porta de entrada: estado atual, fontes de verdade, estrutura e leitura por tarefa.
- **`docs/mecanifica/BANCADA-E-APRESENTACAO.md`** — contrato da bancada de autoria e da transição carro → sistema → peça.
- **`docs/mecanifica/VISAO.md`** — propósito do simulador mecânico e experiência pretendida para clientes.
- **`docs/mecanifica/ARQUITETURA.md`** — fronteiras entre domínio, adaptador Three.js, cena e interação.
- **`docs/mecanifica/PLANO.md`** — roteiro vigente e critérios de saída das fases da Mecanifica.
- **`docs/mecanifica/AUTORIA-IA.md`** — contrato para a IA criar conteúdo com identidade semântica estável.
- **`docs/mecanifica/UPSTREAM-NOS.md`** — separação das melhorias que podem voltar ao NÓS original.
- **`docs/mecanifica/RELATORIO-PONTE-THREE.md`** — evidências e limites da primeira ponte entre a Oficina e Three.js.

### `docs/uso/` — contratos do Atelier herdado

- **`docs/uso/RECURSOS.md`** — este arquivo: catálogo de comandos, bancadas, skills, agentes e documentos do Atelier.
- **`docs/uso/MAPA.md`** — a árvore do repo com resumo por arquivo (gerada, sempre fresca — `npm run mapa`).
- **`docs/uso/oficina-contrato.md`** — o que vale HOJE na Oficina: formato salvo, identidade de vértice, vocabulário de operações (gateado por `npm run criar`), camadas do código e o contrato de como a IA emite peça.
- **`docs/uso/oficina-referencia.md`** — o manual de como cada elemento da Oficina funciona hoje.

### `docs/rumo/` — direção registrada do NÓS

- **`docs/rumo/NORTE.md`** — objetivo maior, método experimental e não negociáveis do NÓS original; não governa a Mecanifica.
- **`docs/rumo/PLANO.md`** — roteiro do NÓS no momento da clonagem; não é o plano vigente da Mecanifica. A moto está congelada como **espécime de falha** — serve de régua de regressão, e não é referência nem de código (6.512 ids à mão) nem de forma.
- **`docs/rumo/oficina-roteiro.md`** — o que foi projetado pra Oficina e ainda NÃO existe, mais as decisões de escopo (booleano, UV manual e three.js ficam de fora por decisão).
- **`docs/rumo/arquitetura-identidade-estavel.md`** — proposta arquitetural de identidade estável de objetos e subpartes (origem + coordenada local + aliases), pra uma seleção sobreviver à edição da peça; é a hipótese que as fases do `PLANO.md` provam em fixture antes de mudar o núcleo.

### `docs/historico/` — o que se fez e o que se aprendeu (imutável)

- **`docs/historico/DECISIONS.md`** — TODAS as decisões (índice + detalhe das ativas).
- **`docs/historico/DECISIONS-ARCHIVE.md`** — o detalhe das decisões arquivadas (D-01…D-54); só movido pra desafogar o registro principal.
- **`docs/historico/playground.md`** — o épico (D-113) que fechou o vocabulário + forma-como-número + a camada IA de laço único — ENCERRADO, exceto a Aba Desenho.
- **`docs/historico/TETO.md`** — o experimento que mediu onde o vocabulário da Oficina parava (3 corridas), encerrado.
- **`docs/historico/oficina-projeto.md`** — o registro de projeto da Oficina: o racional do que já foi construído, os preparos de motor concluídos e a Ordem de construção encerrada.
- **`docs/historico/diagnostico-subpartes-semanticas.md`** — diagnóstico das referências literais de face da moto antes da seleção semântica — medição de estado passado + recomendação.
- **`docs/historico/teto-moto-relatorio.md`** — relatório de execução da 1ª corrida da moto no TETO.
- **`docs/historico/teto-moto-refino-relatorio.md`** — relatório de execução do refino da moto (2ª corrida).
- **`docs/historico/teto-moto-refino-3-relatorio.md`** — relatório de execução da 3ª corrida de refino da moto.
- **`docs/historico/teto-selecao-semantica-relatorio.md`** — medição da correção que tirou atributos/espelho de listas de IDs de face, trocando por seleção semântica.
- **`docs/historico/fixture-identidade-cubo-relatorio.md`** — prova de identidade estável (rótulos persistentes de subpartes) no fixture do cubo.
- **`docs/historico/fixture-identidade-estavel-relatorio.md`** — prova de identidade estável no fixture de loft.
- **`docs/historico/fixture-identidade-espelho-relatorio.md`** — prova de identidade estrutural sob `espelha` (Fase 3), experimental.
- **`docs/historico/fixture-identidade-apaga-relatorio.md`** — prova de identidade estrutural ao apagar (Fase 3).
- **`docs/historico/proveniencia-local-fixture.md`** — fixture de proveniência local de loft.
- **`docs/historico/fase4-drone-inspecao-criacao-relatorio.md`** — corrida de CRIAÇÃO da Fase 4: um agente limpo cria o drone do zero, 0 ids literais. Veredito PARCIAL.
- **`docs/historico/fase4-drone-inspecao-refino-relatorio.md`** — corrida de REFINO da mesma peça por crítica, editando sem regenerar. Medições antes/depois. Veredito PARCIAL.
- **`docs/historico/walkthrough_colaborador4.md`** — resumo de alterações de uma branch antiga de colaborador, sobre o protótipo FPS v3.

### Fora das três pastas — deliberadamente

- **`docs/oficina.md`** — o roteiro da Oficina (Ordem de construção + specs), MISTO (os três tempos verbais dentro dele) e por isso não classificado numa pasta; em fatiamento.

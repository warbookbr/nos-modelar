# Plano vigente da Mecanifica

Este é o roteiro ativo do projeto. Os planos em `docs/rumo/` descrevem o NÓS
herdado e não comandam a Mecanifica.

## Estado executivo

**Ciclo de implementação 1: CONCLUÍDO em 30 de julho de 2026.**

**Ciclo 2 — Fundação de autoria v1: CONCLUÍDO em 31 de julho de 2026.**

- fases 0 a 4: concluídas;
- fases 5 e 6: horizontes futuros, ainda sem autorização ou plano executivo;
- **nenhum ciclo técnico está em execução.** O próximo candidato é o ciclo 3
  ("Arranjos semânticos v1", O-13), que ainda **não** foi aberto: abrir exige
  escopo incluído, escopo excluído e gate objetivo escritos antes da primeira
  linha de código.

Uma fase concluída não volta a crescer. Descobertas posteriores entram no
backlog ou abrem outro ciclo com escopo, exclusões e prova de saída próprios.

## Regra de evolução

Cada rodada deve entregar uma prova visível ou mensurável. Capacidades gerais de
autoria nascem de dificuldades observadas na criação do galpão e dos freios, não
de uma lista especulativa de operações.

Para impedir um plano infinito:

1. o critério de saída encerra a fase, mesmo que existam melhorias possíveis;
2. item que não bloqueia esse critério sai da fase e vai para o backlog;
3. nenhuma descoberta amplia silenciosamente o ciclo em execução;
4. um novo ciclo começa somente com escopo incluído, escopo excluído e gate
   objetivo;
5. somente um ciclo fica ativo por vez.

## Fase 0 — separar rumo e legado

**Objetivo:** impedir que pessoas e agentes confundam o roteiro do NÓS com o da
Mecanifica.

- [x] registrar visão, arquitetura e plano próprios;
- [x] definir regras de autoria para IA;
- [x] criar trilha de melhorias reaproveitáveis pelo NÓS;
- [x] atualizar README, instruções e metadados;
- [x] registrar baseline executável e visual do Atelier;
- [x] substituir templates e alinhar a automação temporária do Pages.

**Saída:** uma sessão nova identifica corretamente o produto, o legado e a
próxima tarefa.

## Fase 1 — prova Three.js

**Objetivo:** provar que o núcleo procedural pode alimentar a nova camada visual.

- [x] instalar Three.js e Vite;
- [x] criar a estrutura modular da aplicação;
- [x] implementar um `adaptarThree()` mínimo;
- [x] renderizar o drone procedural herdado;
- [x] preservar identidade semântica na seleção;
- [x] validar desenvolvimento local e build;
- [x] preparar o workflow do GitHub Pages;
- [x] manter o Atelier acessível em `/legado/atelier/`;
- [x] validar a publicação real após o primeiro push.

**Critério de saída:** a mesma definição procedural produz um objeto visível,
selecionável e identificável no Three.js sem depender de IDs do runtime.

**Critério de parada:** se o núcleo precisar importar Three.js ou conhecer a cena,
redesenhar a fronteira antes de avançar.

## Fase 2 — bancada de autoria e inspeção

**Objetivo:** criar um ambiente reproduzível para modelar e revisar peças antes
de colocá-las na experiência do cliente.

- [x] estúdio neutro e iluminação previsível;
- [x] vistas ortogonais, isométrica e alternância de projeção;
- [x] seleção múltipla e enquadramento;
- [x] contexto fantasma e isolamento;
- [x] explosão automática suave;
- [x] estado reproduzível pela URL;
- [x] diagnóstico de superfícies sem identidade;
- [x] provar o fluxo encontrando e corrigindo a lente e o pouso do drone.

**Critério de saída:** outra sessão abre a mesma seleção e vista, isola peças
conectadas e identifica defeitos de forma ou semântica sem manipulação manual
imprecisa.

## Fase 3 — freio a disco paramétrico

**Objetivo:** criar o primeiro sistema mecânico por partes compreensíveis.

- [x] prancha de referência multivista
  ([`docs/mecanifica/PRANCHA-FREIO-DISCO.md`](PRANCHA-FREIO-DISCO.md));
- [x] disco, cubo, pinça, suporte, pistão, pastilhas e flexível
  (`prototipos/fps/v3/pecas/freio-disco.js`);
- [x] encaixes semânticos — as quatro relações de contato são derivadas de
  parâmetro e travadas por teste;
- hierarquia navegável não foi entregue — `f.parte` continua uma lista plana
  (ATRITOS-AUTORIA A-11); foi adiada porque não bloqueia o critério desta fase;
- [x] materiais básicos (7 materiais por parte);
- [x] vista montada e explodida — a explodida só é legível até ≈0,12 e não
  separa o miolo do freio (ATRITOS-AUTORIA A-12);
- [x] revisão visual em vários ângulos (3 ortogonais + isométrica + seleções em
  contexto);
- [x] medidas e testes de integridade
  (`tools/mecanifica/freio-disco-integridade.test.ts`, 7 casos).

**Critério de saída:** outro agente localiza e altera qualquer componente pelo
nome, sem procurar índices de vértices, faces ou objetos.

**Estado:** ATENDIDO para localizar e alterar — 8 partes nomeadas, 17 aliases,
180 faces com identidade, 0 órfãos, nenhum id de vértice/face/objeto no arquivo.
A hierarquia navegável fica em aberto e depende de uma capacidade nova; ela não
bloqueia a Fase 4, mas bloqueia a árvore de sistemas da apresentação. As
dificuldades da rodada, com as capacidades que elas justificam, estão em
[`docs/mecanifica/ATRITOS-AUTORIA.md`](ATRITOS-AUTORIA.md) (A-4 a A-14).

## Fase 4 — contexto do veículo e galpão mínimo

**Objetivo:** localizar o primeiro sistema dentro do carro e criar o contexto
navegável da demonstração.

**Estado: CONCLUÍDA em 30 de julho de 2026.**

- [x] carroceria externa simplificada e proporcional;
- [x] registro de sistemas selecionáveis — `freioDianteiroDireito` em
  `src/dominio/mecanica/freio-dianteiro-direito.js`, sem UUID ou índice de
  Three.js;
- [x] carro fantasma com sistema realçado em verde;
- [x] foco contextual e isolamento do sistema;
- [x] explosão autoral por caminho de montagem — vetores estáveis por parte,
  aplicados como projeção animada em `controlar-apresentacao.js`;
- [x] roda dianteira revisada isoladamente na bancada e composta no canto
  dianteiro direito, sem duplicar o cubo do freio;
- [x] experimento isolado de uma roda no perfil `realistaApresentacao`, sem
  integração: a prova alcançou um `tecnicoDidatico` detalhado e mediu os limites
  de repetição radial, perfis, cortes e transições;
- [x] piso, paredes, cobertura e iluminação do galpão;
- [x] interface responsiva para mouse, teclado e toque para a leitura atual;
  no mobile, modos e explosão permanecem acessíveis em controles compactos.

**Método da fase:** cada corte do carro, galpão ou sistema é também uma rodada de
observação de autoria. Antes de propor capacidade nova, registrar em
`ATRITOS-AUTORIA.md` onde a dificuldade ocorreu (bancada, Oficina ou domínio), a
evidência reproduzível e o contorno usado. Melhorias gerais só entram quando um
caso real da Fase 4 as justificar; melhorias de apresentação permanecem fora do
núcleo de autoria.

**Critério de saída: ATENDIDO.** A apresentação permite localizar o freio no
carro, aproximar, alternar entre carro/contexto/isolar e explodir as oito partes
por identidade semântica. O galpão e a carroceria preservam a orientação
espacial; os controles essenciais continuam disponíveis em desktop e mobile.

**Fora do escopo encerrado:** caminhada livre, outros sistemas, carro detalhado,
substituição visual da roda, narrativa de desgaste e as melhorias futuras da
linguagem. Nenhum desses itens reabre a Fase 4.

## Fase 5 — narrativa de desgaste

**Estado:** horizonte futuro, não iniciado e fora do ciclo concluído.

**Objetivo:** transformar o modelo em uma explicação útil para clientes.

- estado normal;
- desgaste progressivo;
- limite crítico;
- contato metal com metal;
- dano ao disco e perda de eficiência;
- estado reparado;
- textos curtos de causa, consequência e recomendação;
- controle de linha do tempo.

**Critério de saída:** a demonstração comunica o problema sem depender de
explicação técnica externa.

## Fase 6 — autoria assistida por IA

**Estado:** horizonte futuro, não iniciado e fora do ciclo concluído.

**Objetivo:** provar criação e refinamento sem chuva de IDs.

- formato versionado e schema;
- relações espaciais gerais;
- expressões entre parâmetros;
- diagnósticos de referências;
- descrição headless da peça;
- criação por um agente e refinamento por outro;
- registro das capacidades gerais candidatas ao NÓS.

**Critério de saída:** uma crítica como “aproxime a pastilha interna do disco e
reduza sua espessura” altera a definição existente sem regenerar o conjunto.

## Conclusão técnica do ciclo

A abordagem adotada daqui em diante é:

1. usar `tecnicoDidatico`, fidelidade `F2`, precisão mecânica e interação de
   montagem como padrão;
2. modelar um sistema por partes, nunca um carro detalhado em uma tacada;
3. provar envelope, encaixes e identidade na bancada antes do acabamento;
4. refinar em camadas e integrar somente depois dos gates;
5. tratar `realistaApresentacao`/`F3` como trabalho futuro, pois a linguagem
   atual ainda não sustenta esse resultado com custo autoral aceitável.

O experimento da roda não será integrado. Ele serviu para medir o teto atual e
confirmou que o próximo ganho vem da linguagem de autoria, não de insistir em
mais uma rodada visual sobre a mesma peça.

## Sequência executiva

**Nenhuma linha está em execução.** A linha 1 fechou; as demais são candidatas
ordenadas, não autorização para começar ou agrupá-las num ciclo.

| ordem | estado | área | entrega ou condição |
|---:|---|---|---|
| 1 | concluída em 31/07/2026 | Fundação de autoria v1 | as três condições do gate de encerramento verificadas item por item; A-15 segue aberto com o estado atualizado |
| 2 | próxima candidata, **não aberta** | eficiência de autoria | O-13 em ciclo próprio: repetição radial/linear com identidade por instância |
| 3 | candidata posterior | Realismo geométrico v1 | escolher somente uma ou duas capacidades justificadas pela crítica da roda |
| 4 | backlog | posição e relações | O-7 e O-8 continuam separados dos ciclos acima |
| 5 | backlog | produto | narrativa de desgaste da Fase 5, com cenário e linha do tempo próprios |
| 6 | backlog | apresentação | caminhada, carro detalhado, novos sistemas e árvore de navegação |

### Ciclo 2 — CONCLUÍDO em 31 de julho de 2026

**Nome:** Fundação de autoria v1.

**Inclui somente:**

- impedir que a Oficina entregue silenciosamente um arquivo incompatível
  (proteção mínima do A-15, sem prometer exportador completo);
- O-6: `origem` nos geradores cobertos pelo contrato;
- O-12: portas semânticas estáveis nesses geradores.

**Exclui:** O-7, O-13, relações de montagem, hierarquia, realismo F3, novas
peças e mudanças na apresentação.

**Gate de encerramento:** a Oficina recusa antes de salvar quando não consegue
representar semanticamente a edição; pinça e suporte podem usar `chamferBox` com
zero face sem identidade; uma prova não automotiva confirma o mesmo contrato.

**Conferência do gate, condição por condição (31 de julho de 2026).** As três
estão ATENDIDAS, cada uma com a medição que a sustenta:

| # | condição | estado | evidência |
|---|---|---|---|
| 1 | a Oficina recusa antes de salvar o que não sabe representar | **ATENDIDO** | `npm run guarda:salvar` verde, 16 afirmações (10 no cenário do servidor real, 6 no estático), e no CI desde este ciclo. O clique real em "Salvar peça" depois de um clique real em "marcar sólido" (que grava `['solido',{faces:[0]}]`) não emite POST, não emite download e não muda o byte em disco — nos dois cenários: servidor de dev com a rota real e servidor estático que força o fallback. A recusa é visível (mensagem de erro + `title` + alerta com o passo culpado), não trava a sessão, e vale também pelo gancho `window.__oficina.salvar()`. Não é bloqueio: `Ctrl+Z` tira a edição e o mesmo botão volta a gravar. A guarda mora em `salvarPeca`, o funil por onde passam os dois caminhos de saída |
| 2 | pinça e suporte usam `chamferBox` com zero face sem identidade | **ATENDIDO** | `freio-disco.js` monta a pinça com 3 `chamferBox` (ponte, garra interna, garra externa) e o suporte com 3 (placa e duas orelhas), endereçados por `origemId`/`sel:{origem}`/`sel:{alias}`. `npm run descrever -- freio-disco --estrito`: 8 partes, 300 faces, 362 vértices, **0 face sem identidade, 0 órfão**. Conferido também no olho, na bancada, com pinça e suporte selecionados em modo contexto |
| 3 | uma prova não automotiva confirma o mesmo contrato | **ATENDIDO** | `prototipos/fps/v3/pecas/_jardineira.js` — jardineira de janela com uma muda, zero vocabulário mecânico. Usa os cinco geradores que só ganharam `origem` na R4 e publica cinco portas. Quatro delas sofrem `rotaciona`/`transladar` depois de publicadas e são citadas na sequência; a quinta (`soleiraDaJardineira`) nunca é transformada, então prova o contrato mínimo, não a sobrevivência à transformação. Porta de granularidade sub-primitiva, entre os geradores novos, só a `esfera` tem: `cone` e `inflate` não recebem porta nenhuma (A-18). `npm run descrever -- _jardineira --estrito`: 6 partes, 351 faces, 350 vértices, **0 face sem identidade, 0 órfão**. `tools/mecanifica/jardineira-integridade.test.ts` amarra cada contagem à FÓRMULA do gerador e reconstrói a peça com outro `TOPO`. Quatro enquadramentos lidos na bancada (frontal, direita, superior, isométrica) mais um recorte isolando `bulbo`+`caule`, onde se vê o pé do caule pousando no colo do bulbo — a relação que o teste trava |

**Verificação completa executada no fechamento:** `npm test` (461 casos, 17
arquivos), `npm run typecheck`, `npm run build`, `npm run gabarito:selecao:check`
(22 peças byte-idênticas), `npm run id-cru:check` (0 id cru fora da lista
herdada), `npm run mapa` + `npm run mapa:check` (201 arquivos),
`npm run docs:links:check`, `npm run docs:toc:check`, `npm run guarda:salvar` e
`npm run descrever` em **todas** as 36 peças. Das 36, 8 passam `--estrito` com
0/0 — as duas do ciclo (`freio-disco`, `_jardineira`) entre elas; 14 não têm
envelope de `PASSOS` e a régua não as mede; 14 são fixtures herdadas com dívida
anterior ao ciclo. O ciclo tocou exatamente duas peças, e as duas passam.

O que o contrato **não** alcança está medido e nomeado (A-18 a A-20, e A-22
achado na própria verificação), em vez de suposto.

**O que este ciclo NÃO fechou, dito na cara:**

- **A-15 continua aberto.** A guarda impede a entrega silenciosa, que era a
  metade urgente; ela não faz a Oficina **emitir** referência semântica, e três
  das seis formas posicionais não têm caminho semântico nem no núcleo. O ciclo
  prometeu "proteção mínima, sem exportador completo" e entregou exatamente
  isso — o atrito fecha quando a interface souber gravar
  `sel:{alias|origem|porta}` no momento em que grava o passo;
- **A-22, novo.** A guarda passou a divergir do gate na direção oposta: abrir
  `_jardineira` na Oficina e clicar em Salvar, sem editar nada, é recusado por
  "5 referência(s) posicional(is)" que são as cinco portas do `publicarPorta`. O
  conserto do A-21 desceu para `tools/bancadas/id-cru.mjs` e não para
  `diagnosticarExportacaoIncompativel`. É recusa **a mais**, nunca a menos — não
  abre buraco na condição 1 —, e por isso ficou registrado em vez de corrigido
  dentro de um ciclo já fechado.

**Implementado e já publicado:**

- [x] guarda mínima do A-15 antes de POST e download, no funil `salvarPeca` —
  provada pelo **botão real** em `npm run guarda:salvar`, nos dois caminhos de
  saída e também pelo gancho `window.__oficina.salvar()`, que até esta rodada
  era uma porta dos fundos que gravava em `pecas/` o que o botão recusava;
- [x] `origem` em todos os geradores cobertos, incluindo `inflate`;
- [x] `publicarPorta` e `sel:{porta}` preservados após transformação;
- [x] pinça e suporte migrados para `chamferBox`, com zero face sem identidade;
- [x] testes do núcleo, typecheck, gabarito, mapa e gate de id cru verdes.

**Pendências finitas para encerrar:**

- [x] provar pelo botão real, no navegador, que o salvamento incompatível é
  recusado antes do POST e do fallback — `tools/mecanifica/guarda-salvar-oficina.mjs`
  dirige a interface: clique real em "marcar sólido" (que grava
  `['solido',{faces:[0]}]`) e clique real em "Salvar peça", contra o `servir.mjs`
  real e contra um servidor sem a rota. A medição achou a guarda no lugar errado
  — no ouvinte do clique, não no caminho — e o conserto a moveu para o funil;
- [x] consolidar uma fixture não automotiva explícita usando o mesmo contrato —
  `prototipos/fps/v3/pecas/_jardineira.js` (jardineira de janela com uma muda)
  usa os cinco geradores que só ganharam `origem` na R4 e publica cinco portas, quatro delas sobrevivendo a transformação
  antes das transformações, citando-as depois. Régua headless: 6 partes, 351
  faces, 350 vértices, 0 face sem identidade, 0 órfão. A prova achou quatro
  coisas, todas registradas em [`ATRITOS-AUTORIA.md`](ATRITOS-AUTORIA.md) e
  nenhuma contornada em silêncio: o gate `id-cru` reprovava `publicarPorta`
  (A-21, corrigido aqui — nenhuma PEÇA usava a op, então o defeito ficou
  invisível na R4); `cone`, `plano` e `chamferBox` só citam a primitiva inteira
  apesar de terem grade documentada (A-18); o eixo de uma origem não aceita
  parâmetro e reaponta em silêncio quando o `TOPO` muda (A-19); uma porta
  publicada é invisível fora do núcleo (A-20). A-18 a A-20 **não** entram neste
  ciclo;
- [x] reconciliar o estado de R4, A-15, O-6 e O-12 em índice, otimizações e
  registro upstream;
- [x] rodar a verificação completa e marcar este ciclo como concluído — feito em
  31 de julho de 2026, com a conferência do gate acima e a lista de comandos
  executados. A verificação achou A-22 e o registrou fora do ciclo, sem
  corrigi-lo aqui.

**Não entraram e continuam de fora:** A-18, A-19, A-20 e A-22. Nenhum é
pendência deste ciclo; quem abrir o próximo decide a ordem.

O-13 recebe um ciclo próprio somente depois desse gate. Essa separação é a
garantia de que o próximo plano também termina.

### Candidato a ciclo 3 — ainda não aberto

**Nome:** Arranjos semânticos v1.

**Inclui somente:** O-13, com repetição radial e linear, identidade estável por
instância e diagnóstico de referência inválida ou ambígua.

**Exclui:** curvas, cortes, filetes, auto polimento, alterações de material,
relações de montagem, novas peças de produto e automação de crítica visual.

**Gate proposto:** a roda experimental perde os cem parâmetros de coordenadas
dos braços; cada cópia continua isolável por identidade; uma composição não
automotiva prova o mesmo contrato; nenhum id runtime entra no arquivo salvo.

### Candidato a ciclo 4 — ainda não aberto

**Nome:** Realismo geométrico v1.

O ciclo nasce do briefing e da crítica visual da roda, registrados em
[`REFERENCIA-E-CRITICA-VISUAL.md`](REFERENCIA-E-CRITICA-VISUAL.md). Antes de
abri-lo, a análise deve escolher no máximo duas capacidades gerais entre perfil
curvo ou afunilado, orientação de seção, transição local e filete/bevel seletivo.

Ele não começa com uma lista de operações nem promete “polir” a peça inteira.
Seu gate será escrito depois de comparar referência e renders canônicos,
nomeando regiões e condições visuais de aceite. Uma skill de família só pode
ser extraída depois de o protocolo funcionar em outra família de objeto.

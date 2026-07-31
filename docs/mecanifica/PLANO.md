# Plano vigente da Mecanifica

Este é o roteiro ativo do projeto. Os planos em `docs/rumo/` descrevem o NÓS
herdado e não comandam a Mecanifica.

## Estado executivo

**Ciclo de implementação 1: CONCLUÍDO em 30 de julho de 2026.**

**Ciclo 2 — Fundação de autoria v1: CONCLUÍDO em 31 de julho de 2026.**

**Ciclo 2b — Endereços semânticos v1: CONCLUÍDO em 31 de julho de 2026.** Ele
pagou a dívida medida no fechamento do ciclo 2 (A-18, A-19, A-20 e A-22) e não
inventou capacidade nova.

**Ciclo 3 — Arranjos semânticos v1: CONCLUÍDO no núcleo em 31 de julho de
2026.** Entregou a op `arranja` (radial e linear) e pagou a dívida A-23 do ciclo
anterior. O que ele **não** fez está dito no fechamento abaixo, sem eufemismo: a
roda experimental não foi reescrita, então os cem parâmetros de coordenada
continuam no arquivo dela.

- fases 0 a 4: concluídas;
- fases 5 e 6: horizontes futuros, ainda sem autorização ou plano executivo;
- **nenhum ciclo técnico está em execução.** O ciclo 3 ("Arranjos semânticos
  v1", O-13) foi aberto e fechado em 31 de julho de 2026, no núcleo; o próximo
  candidato é o ciclo 4 ("Realismo geométrico v1"), que ainda **não** foi
  aberto.

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

**Nenhuma linha está em execução.** As linhas 1 e 1b fecharam; as demais são candidatas
ordenadas, não autorização para começar ou agrupá-las num ciclo.

| ordem | estado | área | entrega ou condição |
|---:|---|---|---|
| 1 | concluída em 31/07/2026 | Fundação de autoria v1 | as três condições do gate de encerramento verificadas item por item; A-15 segue aberto com o estado atualizado |
| 1b | concluída em 31/07/2026 | Endereços semânticos v1 | A-18, A-19, A-20 e A-22 resolvidos, cada um com prova em peça real; A-15 continua aberto e não foi tocado |
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

### Ciclo 2b — Endereços semânticos v1 — CONCLUÍDO em 31 de julho de 2026

**Nome:** Endereços semânticos v1. Ele corrigiu dívida do ciclo anterior; não
inventou capacidade nova.

**Incluiu somente:** A-18, A-19, A-20 e A-22. A-20 e A-22 entraram declarados,
não em silêncio: A-20 é o mecanismo que permite PROVAR o A-18 de forma direta, e
A-22 era a mesma regra copiada em três lugares que este ciclo ia mexer.

**Excluiu:** O-13 (arranjos), O-7, relações de montagem, hierarquia de partes,
realismo e peças de produto novas. Nada disso foi tocado.

**Gate de encerramento, condição por condição.** As quatro estão ATENDIDAS:

| # | condição | estado | evidência |
|---|---|---|---|
| 1 | A-18: os geradores com numeração fechada citam o eixo que já têm | **ATENDIDO** | `cone` reusa a estrutura do `cilindro` (`lado` + `tampa:'fundo'`), `chamferBox` a do `cubo` mais `aresta` (12) e `canto` (8), `plano` a grade `faixa`×`lado` do `loft` — sem vocabulário novo. `inflate` fica no contrato mínimo por decisão medida, escrita no código. **Provado na peça:** `_jardineira` publica `bordaDaFrenteDaSoleira` (`chamferBox:400 aresta 3`), `faixaDaFrenteDaTerra` (`plano:402 faixa 'ultima'`) e `assentoDoBotao` (`cone:405 tampa 'fundo'`), cada nome dizendo o que alcança de verdade |
| 2 | A-19: o eixo acompanha a contagem, e a peça deixa de ser remodelada em volta da limitação | **ATENDIDO** | o eixo aceita nome de PARAM/TOPO, expressão `=…` e as palavras `'primeira'`/`'ultima'`, resolvidas contra a contagem real. A distorção foi DESFEITA: `coloDoBulbo` diz `faixa: 'ultima'`, e o `rotaciona` de meia-volta e o parâmetro `bulboMeiaVolta` saíram. Dois casos do teste remontam a peça com outro `TOPO` e medem que colo e faixa continuam onde o nome promete |
| 3 | A-20: uma porta publicada é visível fora do núcleo, e o teste para de falar por procuração | **ATENDIDO** | `nucleo()` devolve `portas`; `src/autoria/descrever-partes.js` as mede para `npm run descrever` (`portas: 8`) e para a bancada. `tools/mecanifica/jardineira-integridade.test.ts`: 15 leituras de `f.material` como procuração viraram **0** — ele lê `neutro.portas` e cita `sel:{porta}` num passo de sonda próprio, 22 casos |
| 4 | A-22: a regra de referência posicional vive num lugar só | **ATENDIDO** | `prototipos/fps/v3/motor/referencia-posicional.js`, importado pela Oficina, pelo gate `id-cru` e pelo harness. `npm run guarda:salvar` abre `_jardineira` na Oficina real, vê 8 `publicarPorta` e SALVA; a mesma peça com uma edição posicional de verdade continua recusada |

**Aditividade:** `gabarito:selecao:check` verde com **uma** peça regravada —
`_jardineira`, reescrita de propósito para provar a capacidade. As outras 21
seguem byte-idênticas.

**Verificação executada no fechamento:** `npm test` (502 casos, 18 arquivos),
`npm run typecheck`, `npm run build`, `npm run gabarito:selecao:check`,
`npm run id-cru:check`, `npm run guarda:salvar`, `npm run mapa` +
`npm run mapa:check`, `npm run docs:links:check`, `npm run docs:toc:check`,
`npm run descrever -- _jardineira --estrito` (6 partes, 351 faces, 350 vértices,
0 face sem identidade, 0 órfão, 8 portas) e quatro enquadramentos lidos na
bancada, incluindo o recorte `bulbo`+`caule` isolado, onde se vê o colo pálido
no topo do bulbo entregando o caule.

**O que este ciclo NÃO fechou, dito na cara:** A-15 continua aberto e não foi
tocado — a Oficina segue sem saber EMITIR referência semântica. `adaptarThree`
continua sem expor portas, por decisão declarada. `inflate` continua no contrato
mínimo, por decisão medida.

### Ciclo 3 — Arranjos semânticos v1: CONCLUÍDO no núcleo (31/07/2026)

**Incluiu:** O-13 (repetição radial e linear com identidade estável por
instância e diagnóstico de referência inválida ou ambígua) e a dívida A-23 do
ciclo anterior (palavra reservada de extremidade engolindo parâmetro homônimo).

**Excluiu:** curvas, cortes, filetes, auto polimento, alterações de material,
relações de montagem, novas peças de produto e automação de crítica visual.

**O que ficou de pé:**

- a op `arranja`, nos modos `radial` e `linear`. Sempre estrutural: sem
  `origemId`, `derivaDe` e `sel:{origem:...}` o passo é recusado, então cópia
  anônima não é possível por construção;
- a origem `{op:'arranja', id, de}` com o eixo `copia`, que endereça a coleção
  inteira, uma cópia por índice, por nome de parâmetro, por `'primeira'`/
  `'ultima'` ou por filtro `{passo,fase}` — nenhuma citação depende de id de
  face nem da posição do passo, e há um caso que insere um passo antes do
  arranjo e cobra a mesma cópia;
- determinismo declarado e medido: o ângulo da cópia `k` é `(k+1)·passo`,
  derivado da contagem e aplicado sempre à posição da fonte. O teste compara os
  dois doubles (derivado e acumulado) e prova que são diferentes, senão a
  afirmação passaria com as duas implementações;
- ambiguidade grita, nunca escolhe: `volta` e `graus` juntos ou nenhum dos dois,
  `total < 2`, `d` nulo, campo do outro modo, e cópia que cai a múltiplo exato
  de 360° da fonte. Cada recusa é conferida contra o neutro puro — meia coleção
  endereçável nunca existe;
- A-23: a palavra reservada continua ganhando, mas a colisão com um `PARAM`/
  `TOPO` homônimo grita, com a causa nomeada e o conserto dito.

**Gate, condição por condição:**

| condição | resultado |
|---|---|
| repetição radial e linear existem no núcleo | `arranja`, 28 ops implementadas |
| cada cópia continua isolável por identidade | casos de coleção, índice, PARAM, extremidade e progressão, todos por `sel:{alias}`/`sel:{porta}` |
| nenhum id runtime entra no arquivo salvo | `npm run id-cru:check` verde, `arranja` recusa `faces`/`sel:{f}`/alias/região |
| peças existentes intactas | `npm run gabarito:selecao:check` — 22 peças byte-idênticas |
| verificação completa | `npm test` (540), `typecheck`, `build`, `gabarito:selecao:check`, `id-cru:check`, `guarda:salvar`, `guarda:portas`, `mapa`/`mapa:check`, `docs:links:check`, `docs:toc:check` |

**Teste de mutação, o que ele achou.** Dez mutações no que a rodada acabou de
escrever. Nove morreram (ângulo acumulado 1 caso; índice de cópia deslocado 4;
`total` contando cópias 13; origem não registrada 6; colisão de palavra
reservada silenciosa 2; weld desligado 2; `volta`+`graus` escolhendo em vez de
gritar 1; pivô default virando outro ponto 5). **Uma sobreviveu:** reverter os
cantos de toda cópia — a mão da face, que é formato salvo — deixava os 356 casos
verdes. O buraco foi fechado com afirmação de normal de Newell nos dois modos, em
commit próprio. Uma décima mutação (inverter a ordem em que a coleção resolve)
também sobreviveu e **não** virou teste: nenhum consumidor do núcleo distingue
essa ordem hoje, então ela ficou declarada no comentário da op como construção
determinística, não como promessa medida.

**O que este ciclo NÃO fechou, dito na cara:** a roda experimental **não** foi
reescrita — os cem parâmetros de coordenada continuam no arquivo dela, e o que
mudou é que agora existe a operação que os dispensa. Nenhuma peça de produto
usa `arranja` ainda, então o contrato foi provado em teste e não em peça: o
prisioneiro de roda e a aleta de ventilação continuam não modelados. A-15 segue
aberto.

**As duas dívidas menores, pagas depois.** Elas eram do mesmo tipo que a lição
dos dois ciclos anteriores: verde pelo motivo errado.

- **O painel de portas da bancada não tinha prova nenhuma.** Nenhum arquivo de
  teste importa `src/bancada/main.js`. A revisão mediu duas mutações que passavam
  todos os gates e os 540 testes: `convertido.medida.portas ?? []` virar `[]` em
  `main.js`, e `portasPublicadas(neutro)` virar `[]` em `carregar-peca.js`. O
  painel do A-20 podia ser apagado inteiro sem custo. Entrou
  `tools/mecanifica/guarda-portas-bancada.mjs` (`npm run guarda:portas`), que
  dirige a bancada **pela URL** e afirma sobre o **DOM renderizado**: a peça com
  portas mostra o painel visível, o resumo `8 publicadas` e os oito pares
  nome/origem; `_vao-e-anteparo` não mostra a seção; e uma afirmação compara os
  dois lados na mesma execução, senão um painel constante passaria em metade
  delas. O oráculo é **literal**, escrito à mão, não calculado por
  `portasPublicadas()` — a régua que a página usa não pode ser a régua que a
  mede (lição do A-22). Mutação: as duas trocas acima derrubam 5 afirmações cada;
  trocar `porta.origem` por `op:id`, perdendo o recorte, derruba 1. Como precisa
  de navegador, a prova entrou no `.github/workflows/ci.yml`, ao lado do
  `guarda:salvar`. Limite declarado: o painel é `display:none` no breakpoint
  mobile, e a prova roda em 1280×720; a lista rola dentro de 128 px, então nem
  toda porta fica visível de uma vez, mas as oito existem no DOM.
- **Um teste comparava uma função com ela mesma.** Em
  `referencia-posicional.test.ts`, o caso "o gate id-cru mede exatamente o que o
  módulo mede" comparava `contarIdCruDoGate(passos)` com `contarIdCru(passos)`,
  e `tools/bancadas/id-cru.mjs` **reexporta** essa função do mesmo módulo: era
  `f(x)` contra `f(x)` para o mesmo `f`. Ele foi **corrigido, não removido** — o
  que queria afirmar é o degrau anterior, que não existe uma segunda
  implementação, e isso se afirma por identidade de referência. Comparar saídas
  não serve: uma cópia recém-escrita concorda em quase tudo, e foi assim que as
  três cópias do A-22 conviveram por dois ciclos, divergindo só na chave `de`.
  Mutação: um wrapper local no gate que **delega** ao módulo — portanto concorda
  em toda entrada, e o teste antigo passaria — deixa o novo vermelho.

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

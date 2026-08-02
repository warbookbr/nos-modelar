# Plano vigente da Mecanifica

Este é o roteiro ativo do projeto. Os planos em `docs/rumo/` descrevem o NÓS
herdado e não comandam a Mecanifica.

## Estado executivo

**Ciclo de implementação 1: CONCLUÍDO em 30 de julho de 2026.**

**Ciclo 2 — Fundação de autoria v1: CONCLUÍDO em 31 de julho de 2026.**

**Ciclo 2b — Endereços semânticos v1: CONCLUÍDO em 31 de julho de 2026.** Ele
pagou a dívida medida no fechamento do ciclo 2 (A-18, A-19, A-20 e A-22) e não
inventou capacidade nova.

**Ciclo 3 — Arranjos semânticos v1: CONCLUÍDO em 31 de julho de 2026**, no
núcleo **e** na peça. Entregou a op `arranja` (radial e linear), pagou a dívida
A-23 e, no fechamento, as três dívidas menores que ele mesmo tinha declarado —
inclusive a maior delas: a roda experimental foi reescrita e perdeu os cem
parâmetros de coordenada. O que ele **não** fez está dito no fechamento abaixo.

- fases 0 a 4: concluídas;
- fase 5: horizonte futuro, ainda sem plano executivo;
- a fase 6 começou pelo recorte operacional **Fluxo de modelagem assistida por
  IA v1**, **CONCLUÍDO em 1º de agosto de 2026**. Contrato, comandos, provas e
  limites estão em [`FLUXO-MODELAGEM-IA.md`](FLUXO-MODELAGEM-IA.md);
- a avaliação A/B pós-ciclo também está **CONCLUÍDA**: a mediana cega empatou
  em 14/16. O fluxo melhorou aderência, integração e evidência, mas exigiu mais
  tentativas e não provou ganho líquido de modelagem. A peça, a rubrica e os
  três pareceres estão em
  [`EXPERIMENTO-AB-FLUXO-IA.md`](EXPERIMENTO-AB-FLUXO-IA.md);
- **Revisão visual econômica v1 está CONCLUÍDA:** o atrito A-38 foi pago sem
  mudar geometria. Enquadramento é calculado por vista, timeout de prontidão é
  repetido uma vez, e toda recusa preserva evidência classificada por assinatura
  do modelo. As duas dobradiças congeladas passaram em uma execução cada;
- **Retirada da Oficina humana está CONCLUÍDA:** páginas de objeto e som,
  servidor de salvamento, presets, harnesses e skills exclusivas saíram do
  Mecanifica. O Pages publica apenas produto e bancada. O núcleo procedural,
  as peças e os consumidores headless permanecem;
- **Ciclo 6 está ABERTO como plano importado e medido:** “Furo por grupo,
  contagem por desvio e filete v2” paga A-30, A-34, A-36 e A-37 por meio da
  linguagem procedural e da bancada neutra; ele não reintroduz a Oficina humana.

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
- [x] manter o Atelier acessível em `/legado/atelier/` durante a prova inicial;
- [x] retirar essa rota depois que produto e bancada passaram a cobrir o fluxo;
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

**Estado:** iniciada. O primeiro recorte operacional, “Fluxo de modelagem
assistida por IA v1”, foi concluído em 1º de agosto de 2026; os demais itens
continuam como horizonte da fase e não pertencem retroativamente a esse ciclo.

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

**Nenhuma linha nova está em execução.** Fluxo de modelagem assistida por IA v1
foi encerrado com seu gate atendido. Filete v2 permanece pausado no Escopo A.

| ordem | estado | área | entrega ou condição |
|---:|---|---|---|
| 1 | concluída em 31/07/2026 | Fundação de autoria v1 | as três condições do gate de encerramento foram verificadas; a dívida A-15 daquela interface foi retirada do produto junto com a Oficina humana |
| 1b | concluída em 31/07/2026 | Endereços semânticos v1 | A-18, A-19, A-20 e A-22 resolvidos, cada um com prova em peça real; a regra única continua no gate `id-cru` |
| 2 | concluída em 31/07/2026 | Arranjos semânticos v1 | O-13 entregue no núcleo E na peça: `arranja` radial/linear, a roda experimental reescrita (141 parâmetros → 43) e `_cerca-e-flor` provando o mesmo contrato fora do vocabulário automotivo; A-24 achado e registrado |
| 3 | concluída em 31/07/2026 | Corte e orientação de seção v1 | as duas capacidades entregues no núcleo E provadas em peça: `orientacao` no `loft` (A-25, UP-020) e a op `furo`, a primeira subtração do núcleo (A-27, UP-021). O `freio-disco` ganhou o flange de roda — quatro assentos postos pelo `arranja` radial e furados de lado a lado —, e a peça de exercício `_corrimao` prova a orientação declarada fora do vocabulário automotivo. Compor as duas achou e pagou A-28 (UP-022); A-26 e A-29 ficaram abertos, ditos na cara |
| 3b | concluída em 31/07/2026 | Furo v2 — vários furos na mesma face | A-26 pago (UP-023): a chave `centros` da op `furo`, na forma de lista e na de círculo, com identidade por furo dentro do passo, partição por pontes e orelhas e grito quando dois anéis se cruzam. Provada na peça de exercício `_tampa-de-caixa` (círculo de quatro parafusos numa chapa só, 0 face sem identidade, 0 órfão). NÃO tocou em peça de produto: o flange do `freio-disco` continua uma chapa por prisioneiro, e isso virou dívida de peça. Abriu A-30 (um raio por passo) |
| 3c | concluída em 31/07/2026 | Flange de uma peça só — a forma nova numa peça de PRODUTO | a dívida de peça que a 3b deixou está paga: o flange do `freio-disco` é UM disco com os quatro furos num passo. Corpos da parte `cubo` 5 → 2, envelope idêntico, e `prisioneiros` passou a bastar sozinho (constrói com 3, 5, 6 e 8). Levar a op ao produto ACHOU um defeito no núcleo — a orelha aceitava vértice em cima da aresta dela, e a face simétrica gritava —, corrigido com 10 casos novos. A-29 perdeu a evidência original; A-32 abriu (o cubo não tem cubo-piloto, então o flange não pode ser mais largo que o barril) |
| 4 | **CONCLUÍDO** | Curva e filete v1 | as duas capacidades que sobraram da crítica da roda: curva no perfil e filete seletivo. Escopo, exclusões e GATE escritos abaixo |
| 5 | **CONCLUÍDO em 01/08/2026** | Fluxo de modelagem assistida por IA v1 | pacote curto, guias combináveis, revisão determinística, crítica objetiva e comparação entre iterações; prova cega completa em `_caixote-filetado` e prova de compatibilidade em `freio-disco` |
| 5a | **CONCLUÍDA em 01/08/2026** | medição A/B do fluxo | dois Sols, dois Terra e um árbitro cego; empate mediano 14/16. A condição assistida venceu envelope e gate 4/4, mas usou mais tentativas, portanto não demonstrou ganho líquido. Próximo candidato: retorno visual econômico, sem abrir ciclo automaticamente |
| 5b | **CONCLUÍDA em 01/08/2026** | Revisão visual econômica v1 | A-38 pago: câmera por vista, repetição de prontidão, recusa preservada por assinatura e diagnóstico `camera`/`modelo`/`ferramenta`. As duas dobradiças congeladas passaram em uma chamada cada, sem alteração geométrica |
| 5c | **CONCLUÍDA em 01/08/2026** | retirada da Oficina humana | páginas e ferramentas exclusivas removidas; rota `/legado/atelier/` encerrada; bancada neutra permanece como única superfície de autoria visual |
| 6 | **ABERTO, plano importado** | Furo por grupo, contagem por desvio e filete v2 | paga A-30, A-34, A-36 e A-37 na mesma entrega. Plano completo abaixo, com 7 frentes, 29 fatias, gate medido e linha de base. Os projetos que o originaram estão em `docs/mecanifica/projetos/ciclo6/`; a execução usa linguagem procedural e bancada, sem reintroduzir a Oficina humana |
| 7 | backlog | posição e relações | O-7 e O-8 continuam separados dos ciclos acima |
| 8 | backlog | produto | narrativa de desgaste da Fase 5, com cenário e linha do tempo próprios |
| 9 | backlog | apresentação | caminhada, carro detalhado, novos sistemas e árvore de navegação |

### Ciclo 5 — CONCLUÍDO em 1º de agosto de 2026

**Nome:** Fluxo de modelagem assistida por IA v1.

**Resultado:** uma IA recebe um pacote limitado, trabalha sem abrir a Oficina
legada, gera uma revisão reproduzível na bancada e entrega a outra IA somente o
contexto necessário para uma crítica objetiva. A correção volta à mesma peça e
uma comparação estrutural invalida observações feitas sobre geometria antiga.

**Prova cega:** em `_caixote-filetado`, o primeiro crítico encontrou duas
divergências — transição seca do puxador e leitura fraca do material. Um agente
modelador alterou a definição procedural usando somente pacote, guias, revisão,
crítica, imagens e a skill de autoria. A revisão passou de 679 para 903 faces,
ainda abaixo do orçamento de 2.000; preservou duas partes, contato declarado,
zero face sem identidade e zero órfão. Um segundo crítico, sem acesso ao código,
à revisão anterior ou à primeira crítica, confirmou a transição, mas manteve a
leitura de material como divergente. A tentativa inicial de declarar zero foi
reprovada na revisão adversarial e virou uma regra: toda crítica cobre o
checklist completo, mesmo sem correção. `freio-disco` atravessou o mesmo
contrato como peça existente, sem ser remodelado.

| # | condição do gate | estado | evidência |
|---:|---|---|---|
| 1 | pacote e relatórios determinísticos | **ATENDIDA** | testes repetem entrada e exigem JSON canônico byte-idêntico |
| 2 | contexto frágil, posicional ou excessivo é recusado | **ATENDIDA** | validadores cobrem referência sem hash, arquivo `repo://` inexistente ou divergente, identidade runtime, parte/vista inexistente, caminho local, binário e limites do pacote |
| 3 | quatro vistas úteis; zero identidade ausente e zero órfão | **ATENDIDA** | `revisar:modelagem` passa no caixote e no freio; o gate recusou enquadramentos realmente pequenos ou cortados e foi calibrado com a vista superior real do caixote |
| 4 | IA nova trabalha com contexto limitado | **ATENDIDA** | os dois críticos Terra receberam somente briefing, referências, guias, `revisao.json` e quatro PNGs |
| 5 | crítica objetiva e limitada | **ATENDIDA** | `critica.json` canônico cobre todos os itens e exige parte/região, vista, categoria, evidência, aceite e viabilidade para cada divergência; máximo de cinco |
| 6 | segunda revisão mostra mudança estrutural | **ATENDIDA** | o diff `r001→r002` isolou a alteração no puxador; `r002→r003` mantém a geometria e introduz somente a aparência semântica v2; teste de mutação prova mudança só de cor/aspereza sem inferir pelos pixels |
| 7 | contrato não automotivo e peça existente | **ATENDIDA** | `_caixote-filetado` prova o ciclo completo; `freio-disco` prova a compatibilidade do pacote e da revisão |

**Limites declarados:** a crítica visual não mede continuidade matemática nem
fotorealismo; material pode depender de iluminação e distância; o comparador
descreve mudança estrutural e de aparência, mas não decide sozinho se ela é
melhor. A divergência de material do caixote permanece aberta sem reabrir o
ciclo: ela é evidência de que o fluxo conserva um problema em vez de fazê-lo
sumir. Uma capacidade nova só será proposta quando uma tarefa real ficar
bloqueada por um desses limites.

**Medição posterior, sem reabrir o ciclo:** o A/B descrito em
[`EXPERIMENTO-AB-FLUXO-IA.md`](EXPERIMENTO-AB-FLUXO-IA.md) comparou um Sol com o
pacote e outro sem ele. A mediana cega empatou em 14/16; a condição assistida
ganhou aderência dimensional, portas e evidência reproduzível, mas gastou mais
tentativas de revisão. O resultado limita a afirmação do ciclo: o fluxo melhora
a qualidade da entrega para o próximo agente, mas ainda não demonstrou melhorar
a habilidade visual nem o custo da modelagem.

### Revisão visual econômica v1 — CONCLUÍDA em 1º de agosto de 2026

**Incluiu somente:** A-38 — enquadrar cada vista pelo envelope projetado,
preservar evidência recusada por assinatura semântica, classificar falha de
câmera/modelo/ferramenta e repetir uma vez a prontidão expirada.

**Excluiu:** nova geometria, crítica automática, colisão sólida, relações de
montagem, novos guias de forma e nova rodada A/B.

**Gate atendido:** a dobradiça assistida congelada produziu `r002` em uma
execução e a crua produziu `r001` em uma execução; nenhuma geometria mudou. Uma
falha injetada conserva quatro PNGs, relatório e `tentativa.json`, não publica
revisão, não duplica o mesmo estado e permite promoção posterior. Caixote e
freio continuam passando nas quatro vistas. O guia de iteração foi corrigido
para não pedir micro-revisões durante a criação inicial.

### Retirada da Oficina humana — CONCLUÍDA em 1º de agosto de 2026

**Incluiu somente:** retirar `oficina.html`, a antiga aba de som, o servidor de
salvamento, os presets e testes exclusivos dessas interfaces, os comandos
públicos correspondentes e a cópia integral do Atelier no Pages. O botão do
jogo de referência que apontava para a página removida também saiu.

**Preservou:** `motor/oficina.js`, expressões, regra de referência posicional,
peças procedurais, visor, jogo de referência, testes do núcleo, adaptador
Three.js, bancada e todo o fluxo assistido por IA.

**Decisão:** a Mecanifica não mantém editor visual para autoria humana. O fluxo
oficial é arquivo procedural → medidas → revisão na bancada → crítica → ajuste.
A interface completa continua no repositório original do NÓS. As menções à
Oficina nas seções históricas abaixo registram o estado dos ciclos na época e
não descrevem uma entrada executável atual.

**Gate atendido:** 811 testes e typecheck verdes; build contém apenas
`index.html`, `bancada.html` e seus assets; `id-cru:check` e
`gabarito:selecao:check` verdes; a prova de portas da bancada passa no navegador;
o jogo de referência abre com `ready=true` e zero erro depois da retirada do
botão. Nenhum script público aponta para arquivo removido.

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

### Ciclo 3 — Arranjos semânticos v1: CONCLUÍDO (31/07/2026)

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

**Gate do fechamento, escrito antes e conferido item por item.** O gate deste
ciclo era: "a roda experimental perde os cem parâmetros de coordenadas dos
braços; cada cópia continua isolável por identidade; uma composição não
automotiva prova o mesmo contrato; nenhum id runtime entra no arquivo salvo". As
quatro condições estão **ATENDIDAS**:

| # | condição | estado | evidência |
|---|---|---|---|
| 1 | a roda perde os cem parâmetros de coordenada | **ATENDIDO** | `PARAMS` 141 → **43**, e os 100 nomes `r0_..r9_` de seno/cosseno são **0**. Passos 66 → 47; passos que geram instância repetida 20 → 3. Um braço é declarado no ângulo ZERO (Y é o raio nomeado, Z é zero) e não há seno nem cosseno no arquivo. A frase "cinco pares em torno do eixo X" está escrita: `rotaciona` de meia abertura, um `arranja` para o par, dois `arranja` de volta fechada para os grupos. Números completos, lado a lado com os antigos, em [`RELATO-RODA-REALISTA.md`](RELATO-RODA-REALISTA.md) |
| 2 | cada cópia continua isolável por identidade | **ATENDIDO** | os dez braços são dez PARTES nomeadas (`raioRecuadoDoGrupo3`), resolvidas por `{op:'arranja', id, copia}`. Na régua, `npm run descrever` dá caixa e corpo próprios a cada uma; na bancada, `--selecionadas=raioRecuadoDoGrupo3 --modo=isolar` mostra um braço só (PNG lido). Recessos e porcas ficam AGREGADOS de propósito, para a peça exercitar também a coleção inteira |
| 3 | uma composição não automotiva prova o mesmo contrato | **ATENDIDO** | `prototipos/fps/v3/pecas/_cerca-e-flor.js` — sete tábuas por arranjo **linear**, seis pétalas por arranjo **radial**, cada instância uma parte nomeada, zero vocabulário mecânico. `npm run descrever -- _cerca-e-flor --estrito`: 16 partes, 138 faces, 158 vértices, 0 face sem identidade, 0 órfão. Peça NOVA: `_jardineira` não foi tocada, para não arriscar as provas que ela já sustenta |
| 4 | nenhum id runtime entra no arquivo salvo | **ATENDIDO** | `npm run id-cru:check` verde com as duas peças; nenhuma delas aparece na lista herdada. Toda citação é `sel:{origem}` ou `sel:{alias}` |

**O teste de integridade, e a mutação que cada afirmação mata.**
`tools/mecanifica/arranjo-em-peca.test.ts`, 13 casos no fechamento (**18** hoje:
o ciclo 4 acrescentou cinco, ver "As três promessas do ciclo 3 sem afirmação"),
cobrindo as duas peças.
Nenhuma contagem está digitada nele: toda instância sai de `TOPO`. Cinco
mutações rodadas no que esta rodada acabou de escrever, **todas mortas**:

| mutação | casos que caíram |
|---|---:|
| trocar `raioRecuadoDoGrupo3` por `raioRecuadoDoGrupo4` (mesma malha, dois nomes trocados) | 2 |
| `total: 'gruposDeRaios'` → `total: 5` (malha byte-idêntica) | 1 |
| reverter os cantos da cópia no núcleo (`arranja`) | 1 |
| tirar o pivô do arranjo da flor (cai no default `[0,0,0]`) | 1 |
| trocar a expressão do comprimento da travessa | 1 |

A segunda é a que responde à lição dos ciclos anteriores: ela produz geometria
**byte-idêntica** e mesmo assim morre, porque a afirmação é sobre a PEÇA — o
arranjo tem de contar por nome de `TOPO`, não por número digitado.

**Aditividade:** `gabarito:selecao:check` verde com **duas** entradas mexidas e
declaradas — `roda-dianteira-realista-experimento` regravada (V 2184 → 2194,
F 2082 → 2132) e `_cerca-e-flor` nova. As outras 21 peças seguem byte-idênticas.

**Inspeção visual:** bancada em `direita`, `frontal` e `isometrica`, ortográfica,
mais o recorte isolando um braço; PNGs lidos e comparados com os enquadramentos
que o relato antigo cita. **A silhueta não mudou.**

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

**O que este ciclo NÃO fechou, dito na cara:**

- nenhuma peça de **produto** usa `arranja`. As duas que usam são experimento e
  exercício; `freio-disco.js` não foi tocada, então o prisioneiro de roda e a
  aleta de ventilação continuam não modelados;
- as quatro paredes da `_jardineira` continuam quatro passos copiados. Elas
  formam um retângulo e nenhum dos dois modos resolve as quatro de uma vez; a
  peça não foi tocada para não arriscar as provas que ela sustenta;
- **A-24, novo**, achado na própria reescrita: `arranja` copia UMA origem, e o
  contrato do `cilindro` não sabe dizer "a primitiva inteira" — `{op,id}` são só
  as laterais. Copiar um cilindro custa três arranjos e devolve as tampas
  SOLTAS do tubo: 13 corpos no lugar de 5, verde em todo gate e invisível na
  foto. A régua achou. A porca da roda virou `lathe` por causa disso, e é a
  única origem das +50 faces da peça;
- A-15 segue aberto e não foi tocado.

**As três dívidas menores do ciclo, pagas depois.** As duas primeiras saíram em
commits próprios, antes deste fechamento; a terceira é a reescrita da roda,
acima.

1. o painel de portas da bancada não tinha prova nenhuma — pago;
2. um teste comparava uma função com ela mesma — pago;
3. nenhuma peça usava `arranja`, e a roda que originou o item continuava com os
   cem parâmetros — pago neste fechamento, com o gate conferido item por item.

Detalhe das duas primeiras: Elas eram do mesmo tipo que a lição
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

### Ciclo 4 — Corte e orientação de seção v1 — CONCLUÍDO em 31 de julho de 2026

**Nome:** Corte e orientação de seção v1 (o ciclo antes chamado de candidato
"Realismo geométrico v1"). Duas capacidades, escolhidas pelo critério de servir
a QUALQUER família de objeto: móvel, robô, carroça, instrumento e carro têm
todos furo e caminho.

**Exclui:** curva de perfil, filete, afunilamento, relações de montagem,
hierarquia e novas peças de produto.

**Entregue até agora — orientação declarada da seção (A-25, UP-020):** o `loft`
aceita `orientacao: [x,y,z]`, a direção do mundo para onde aponta o eixo `+u` de
toda seção. Ela é projetada no plano de cada seção, aceita nome de PARAM e não
propaga nada, então não há rotação acumulada ao longo do caminho. Referência
paralela à tangente de alguma seção, vetor nulo e aridade errada gritam e
abortam o passo inteiro. Ausente, o transporte paralelo de sempre: 23 peças
byte-idênticas no `gabarito:selecao:check`, sem regravar nenhuma (o gate hoje
confere **24**, com `_prateleira-furada`, que entrou depois). **11** casos em
`tools/oficina/oficina.test.ts`, no describe `loft — orientação declarada da
seção`; 8 mutações rodadas, todas mortas — inclusive a
que propaga o frame a partir da referência declarada, que só morre em caminho
com torção. Conferida no olho na bancada, em isométrica e superior.

**O que ela NÃO fez:** nenhuma peça de PRODUTO usa a chave. A roda experimental
continua remontando o contorno em código auxiliar. A peça de exercício
`_prateleira-furada` passou a usar a palavra `orientacao` na op `furo`, que é a
mesma chave e a mesma regra, mas não é o `loft`.

**Entregue — abrir vazio: a op `furo` (A-27, UP-021):** um furo cilíndrico numa
face plana e convexa, PASSANTE (`saida`, a face por onde ele sai) ou CEGO
(`profundidade`, onde ele para). É o furo de prisioneiro, o parafuso de móvel, o
respiro de robô e o furo de eixo de carroça, com uma op só e sem palavra nova.

A decisão central foi **não construir uma booleana genérica**. Uma booleana
destrói a identidade de dezenas de faces de uma vez, em silêncio, que é o que
O-6 e O-12 vieram matar. As três garantias que o ciclo exigiu, cada uma com
afirmação que morre quando o valor muda:

1. **toda face criada é endereçável** — a origem `furo` (a 7ª do núcleo) tem os
   eixos numéricos `borda`, `parede` e `saida`, mais a tampa nominal `'fundo'`.
   Numeração fechada: vértices `b+j` e `b+lados+j`; faces `b+j` borda,
   `b+lados+j` parede, `b+2·lados+j` saída OU `b+2·lados` fundo. Mudar `raio` ou
   `centro` muda a FORMA, nunca o id;
2. **toda face destruída grita** — a face cortada entra em `st.consumidas`, e
   citá-la depois vira erro nomeando o furo e o passo. Inclusive na citação de
   UNIÃO (`{op:'cubo', id}`), que antes pulava id morto em silêncio e devolveria
   cinco faces das seis — plausível na foto. `apagaFace` continua como sempre:
   remover é uma coisa, ser substituída é outra;
3. **completude** — face não-plana, face côncava, anel que encosta ou vaza o
   contorno, saída igual à entrada, saída que o eixo não atravessa, raio ou
   profundidade ≤ 0 e entrada ambígua abortam o passo inteiro com 0 V / 0 F.

O casamento entre o anel e os cantos da face cortada é ANGULAR, não por índice:
por índice a borda de um quadrado com furo central e `lados:8` sai com
quadriláteros reflexos, que o leque de triangulação do visor preenche torto.

**Prova:** **40** casos em `tools/oficina/oficina.test.ts`, somando os sete
describes que começam por `furo —`, e **10** em
`tools/mecanifica/prateleira-integridade.test.ts`. 34 mutações rodadas; 3
sobreviveram e foram mortas com teste novo. Aditiva: `gabarito:selecao:check`
verde, as 23 peças anteriores byte-idênticas. A peça de exercício
`prototipos/fps/v3/pecas/_prateleira-furada.js` prova a op fora do vocabulário
automotivo — tábua, parafuso passante, cavilha cega e puxador vazado, 5 partes,
116 faces, 0 face sem identidade, 0 órfão, 3 portas — e foi conferida no
navegador em três enquadramentos, mais o furo cego isolado e focado.

**O que ela NÃO fez, dito na cara:** nenhuma peça de PRODUTO usa a op. O cubo do
freio continua sem prisioneiro e a roda sem furo de fixação. Só furo cilíndrico,
só face plana e convexa, só na direção da normal — rasgo, bolsão, sulco
transversal e furo oblíquo continuam sem operação. E **um furo por face**: um
segundo furo na mesma face é impossível, então um círculo de parafusos numa
placa ainda não existe (A-26, aberto).

**As três promessas do ciclo 3 sem afirmação, pagas aqui.** A revisão
adversarial do ciclo 3 achou de novo a mesma classe dos quatro ciclos
anteriores: promessa escrita no comentário, sem afirmação que morra quando ela é
quebrada. Três casos, cada um medido antes com uma mutação que sobrevivia à
suíte inteira:

| promessa | onde ela morava | mutação que sobrevivia antes | casos que caem agora |
|---|---|---|---:|
| as famílias de arranjo da roda (`fixadores`, `recessosRaios`) | comentário de `roda-dianteira-realista-experimento.js` | `total:'fixadoresNaRoda'` → `total:'ladosFixador'` (cinco porcas viram seis) | 2 |
| idem | idem | `total:'gruposDeRaios'` → `total:'ladosMiolo'` no arranjo dos ressaltos | 1 |
| idem | idem | deslocar o círculo de parafusos 1 cm (`= fixadorRaioOrbita + 0.01`) | 1 |
| a coleção INTEIRA é o endereço do material | cabeçalho de `_cerca-e-flor.js` | tirar `ORIGEM_TABUAS` do alias `cercaInteira` | 2 |
| idem | idem | tirar `ORIGEM_PETALAS` do alias `corolaInteira` | 1 |
| a solda no eixo é por igualdade EXATA, não tolerância | comentário da op `arranja` | trocar a igualdade por tolerância de `1e-6` | 1 |

Nenhuma das três tinha teste: `fixadores` e `recessosRaios` não eram citados por
arquivo de teste nenhum do repositório; a forma "coleção inteira" só era
observável pelo material, que ninguém media; e a solda tinha afirmação só para o
vértice EXATAMENTE no eixo, o lado fácil, então só desligá-la por completo era
pego.

O que entrou:

- `tools/mecanifica/arranjo-em-peca.test.ts` ganhou cinco casos (13 → **18**).
  Três separam a parte AGREGADA em CORPOS por conectividade — sem isso a régua
  mede uma caixa só e a contagem do arranjo não é observável — e medem o círculo
  de parafusos e a raiz do ressalto pelos parâmetros que os nomeiam. Dois afirmam
  que a coleção inteira pinta TODAS as instâncias, e que nenhuma face da peça
  fica sem material;
- `tools/oficina/arranja-contrato.test.ts` ganhou dois casos (6 → **8**): o
  vértice EXATAMENTE no eixo solda, e o vértice a `1e-9` do eixo **não** solda.
  O segundo é o que decide a regra, e é feito deslocando o **pivô** do arranjo em
  `1e-9`, sem tocar em peça nenhuma. Ele existe porque tolerância torna a
  contagem de vértices do arquivo salvo dependente do ruído de ponto flutuante do
  parâmetro; igualdade exata é reproduzível.

**Números velhos no PLANO, conferidos contra runtime.** A revisão marcou o item
como parcial. Medição desta rodada: `_prateleira-furada` 5 partes / 116 faces /
112 vértices / 3 portas, `_cerca-e-flor` 16/138/158, `_jardineira` 6/351/350,
`freio-disco` 8/300/362 e a roda experimental 2194 vértices — todos batem com o
que o texto já dizia. Três não batiam e foram corrigidos: os casos do `loft`
(10 → 11), os casos do `furo` (26 → 40) e a contagem de
`arranjo-em-peca.test.ts` (13 → 18). O `gabarito:selecao:check` conta **24**
peças hoje, não 23; onde o texto cita 23 ele fala do estado daquela entrega, e a
frase agora diz as duas coisas. Os números dentro de "verificação executada no
fechamento" dos ciclos 2, 2b e 3 são fotografias daquele dia e continuam como
estão, com o rótulo que já tinham.

**FECHAMENTO — as duas capacidades provadas em PEÇA.** Até aqui as duas viviam
no núcleo, com teste e mutação, e nenhuma peça de PRODUTO usava nenhuma delas.
Era a mesma classe que a revisão adversarial acha desde o ciclo 1: promessa
escrita, sem afirmação que morra quando ela é quebrada. O que entrou:

**1. O flange de roda do freio — as duas capacidades juntas, numa peça de
produto.** O plano registrava a omissão com estas palavras: "o cubo do freio
continua sem prisioneiro". `freio-disco.js` agora tem um flange de quatro
assentos: UMA sede (`chamferBox`), o `arranja` radial que a repete de 90° em 90°
em torno do eixo da roda, e um `furo` PASSANTE em cada assento, de lado a lado.
A peça foi de 300 para 540 faces e de 362 para 554 vértices, com **0 face sem
identidade** e **0 órfão** (`npm run descrever -- freio-disco --estrito`), e os
testes de integridade antigos continuam verdes SEM afrouxar nenhum: o conjunto
de pares que se interpenetram é o mesmo de antes (`cubo~disco`, `flexivel~pinca`,
`pinca~pistao`), e as folgas de repouso não mudaram.

Uma afirmação antiga precisou mudar de número, e o motivo é geométrico, não
cosmético: `descrever-partes.test.ts` fixava "a parte `cubo` é 1 corpo". Agora
são **1 + `prisioneiros`** — cada assento é uma primitiva própria, sem vértice
em comum com o cilindro. O teste passou a ler o número do TOPO da peça em vez de
tê-lo digitado, então acrescentar assento sem acrescentar corpo continua sendo
defeito.

Sete casos novos em `tools/mecanifica/freio-disco-integridade.test.ts`
(11 → 18): há um furo por prisioneiro declarado e cada um é um corpo separado; o
furo atravessa o assento de lado a lado (é passante, não cego); os quatro estão
no círculo de prisioneiros, nos quatro pontos cardeais; o diâmetro é o do
parâmetro que o nomeia e sobra assento em volta; a parede 0 de todo furo é a de
cima (a fase declarada por `orientacao`); o assento não passa do raio do cubo; e
a superfície em que a roda encosta continua endereçável depois do corte.

**2. `_corrimao.js` — a orientação declarada, fora do vocabulário automotivo.**
Um corrimão de escada de perfil chato (60 mm × 24 mm) entre dois pilaretes, num
caminho de cinco pontos com TORÇÃO. As três condições que tornam a chave
mensurável numa peça estão nele de propósito, e duas delas são AFIRMADAS pelo
teste para que ninguém as "simplifique" e deixe o resto passando por vácuo: o
caminho não é coplanar (num caminho plano o transporte paralelo dá o mesmo
resultado) e o perfil é chato (num perfil quadrado largura e espessura são a
mesma medida). 6 casos em `tools/mecanifica/corrimao-orientacao.test.ts`. A peça
tem 52 faces, 84 vértices, 2 partes, 0 face sem identidade, 0 órfão e 1 porta —
`apoioDaMao`, que só é endereço ESTÁVEL porque a orientação é declarada: sem a
chave, `lado:3` passeia pelas quatro faces ao longo do caminho, continuando a
resolver e resolvendo para outra coisa.

**3. A composição achou um atrito que nenhuma prova anterior tinha achado
(A-28, UP-022).** `furo` exige que a face de entrada resolva para EXATAMENTE uma
face; a origem `{op:'arranja', id, de, copia}` exigia que `de` fosse, chave por
chave, o `derivaDe` do passo — e `derivaDe` de um sólido é o sólido inteiro.
As duas capacidades do ciclo não compunham. O portão passou de IGUALDADE da
origem declarada para PERTINÊNCIA das faces: `de` pode ser qualquer origem cujas
faces sejam faces daquela fonte. É estritamente mais permissivo, então nenhuma
citação já escrita mudou de significado — `gabarito:selecao:check` verde com as
24 peças anteriores byte-idênticas. 6 casos novos em
`tools/oficina/arranja-contrato.test.ts` (8 → 14).

**Mutação, o gate deste ciclo.** 14 mutações rodadas contra as afirmações novas,
12 mortas. As duas primeiras versões do teste do freio deixavam sobreviver a
mutação que TIRA `orientacao` da peça — o conjunto de vértices de um anel de 12
lados é o mesmo em qualquer fase, e a caixa não vê a diferença; só a pergunta
"QUEM é a parede 0" separa as duas regras. A mesma classe apareceu no corrimão:
a primeira versão do teste sobrevivia a trocar o perfil por um quadrado.
Sobreviveu de propósito **uma** mutação, e ela não é defeito: mudar
`prisioneiroFuroRaio` de 6,5 para 6,0 mm é mudança de projeto, e a afirmação
segue o parâmetro por decisão. Trocar o `raio` do furo para OUTRO parâmetro
(o chanfro) é pego.

**Inspeção visual, lida:** `freio-disco` em `direita` e em isométrica com o cubo
isolado e focado — os quatro assentos aparecem em volta do eixo, cada um com o
furo aberto e a parede do furo visível; `_corrimao` em `frontal` (os dois
pilaretes e o corrimão subindo, com espessura constante) e em `superior` (a
largura constante do começo ao fim, que é a evidência de que a face larga
continua para cima em todo o percurso).

**Gates do fechamento, todos verdes:** `npm test` (646 casos, 24 arquivos),
`typecheck`, `build`, `gabarito:selecao:check` (25 peças; só `freio-disco` e o
novo `_corrimao` mudaram, e as duas foram declaradas), `id-cru:check`,
`guarda:salvar`, `guarda:portas`, `mapa`, `mapa:check`, `docs:links:check` e
`docs:toc:check`.

**O que continua NÃO feito, dito na cara:** A-26 seguia aberto no fechamento
deste ciclo — um furo por face, e é por isso que o flange é uma chapa por
prisioneiro em vez de uma chapa com quatro furos. Ele foi PAGO depois, numa
rodada avulsa (ver "Furo v2", abaixo); o flange, porém, não foi reescrito, e a
forma dele continua sendo dívida de peça. A-29 nasceu neste fechamento: o `furo` pede o ponto do MUNDO
por onde ele passa, e a gramática de PARAMS não tem seno nem cosseno, então um
arranjo radial só dá centro NOMEÁVEL em passos de 90° — o flange tem quatro
prisioneiros por causa da linguagem, não do desenho. A roda experimental continua
remontando o contorno em código auxiliar; a mangueira do freio continua com
seção circular e sem `orientacao`, porque numa seção circular a chave não muda
nada que se possa medir.

**Registro anterior deste ciclo, quando ainda era candidato:**

O ciclo nasce do briefing e da crítica visual da roda, registrados em
[`REFERENCIA-E-CRITICA-VISUAL.md`](REFERENCIA-E-CRITICA-VISUAL.md). Antes de
abri-lo, a análise deve escolher no máximo duas capacidades gerais entre perfil
curvo ou afunilado, orientação de seção, transição local e filete/bevel seletivo.

Ele não começa com uma lista de operações nem promete “polir” a peça inteira.
Seu gate será escrito depois de comparar referência e renders canônicos,
nomeando regiões e condições visuais de aceite. Uma skill de família só pode
ser extraída depois de o protocolo funcionar em outra família de objeto.

### Furo v2 — vários furos na mesma face — CONCLUÍDO em 31 de julho de 2026

**O que estava errado:** a op `furo` consome a face de entrada. O segundo furo
na mesma face citava uma face que já não existe, e gritava com razão. A figura
mecânica mais comum que existe — o círculo de parafusos numa placa — só existia
se cada furo caísse numa face diferente, e foi por isso que o flange do freio
virou uma chapa por prisioneiro (A-26, com evidência em peça de exercício E em
peça de produto).

**O que entrou:** a chave `centros` da op `furo`, em duas formas, e nada além
disso. A lista `[[x,y,z], …]` diz os pontos um a um; o círculo
`{pivo, distancia, total, volta|graus}` diz a frase do desenho com as palavras
que o `arranja` já tinha. "Quatro furos a 62 mm do centro" é um passo, e o
arquivo se parece com a frase. Nenhum seno e nenhum cosseno entram no formato
salvo: o círculo nasce no quadro (u,w) da própria face.

As quatro exigências, cada uma com afirmação que morre:

- **toda face criada é endereçável, e furos diferentes do mesmo passo são
  distinguíveis.** O eixo `furo` da origem recorta um furo só; o eixo ausente
  continua querendo dizer "todos", que é o que preserva o furo de um centro só.
  A superfície da face que não toca anel nenhum ganhou nome:
  `preenchimento` e `preenchimentoDaSaida`;
- **toda face destruída grita.** O registro de consumo não mudou: citar a face
  de entrada depois do corte continua gritando, com um anel ou com quatro;
- **anéis que se cruzam gritam.** Teorema do eixo separador entre os dois
  polígonos, com ENCOSTAR contando como cruzar, e o passo abortando com
  0 V / 0 F. A conferência é UMA, na entrada: a projeção na saída é afim, então
  não pode aproximar anéis disjuntos — e isso está MEDIDO no teste da saída
  oblíqua, em vez de virar uma segunda conferência que nunca falharia;
- **determinismo e numeração fechada.** O furo `k` ocupa `b+3·L·k`, e o
  preenchimento vem depois de todos, com `n + 2M − 2` faces por lado.

**A mutação achou o que a suíte não pegava:** trocar o bloco de ids entre os
furos (`b+3·L·(M−1−k)`) passava pelos 680 testes. Nenhum ligava o bloco de ids
ao ANEL que ele descreve, e o formato salvo passaria a endereçar outro furo em
toda peça já escrita. Agora a borda `j` do furo `k` tem de conter a aresta
`j → j+1` do anel `k`. Duas outras mutações sobreviveram e ficaram DECLARADAS
no núcleo: as provas internas da partição (contagem, área, casamento de
arestas) não têm caso que as dispare, e ninguém deve lê-las como conferidas.

**Prova em peça:** `prototipos/fps/v3/pecas/_tampa-de-caixa.js`, fora do
vocabulário automotivo — 253 faces, 4 partes, 0 face sem identidade, 0 órfão, 3
portas, e a chapa com UM corpo. Conferida no navegador em dois enquadramentos
(superior e isométrica). `gabarito:selecao:check` verde com as 25 peças
anteriores byte-idênticas.

**O que ela NÃO fez, dito na cara:** nenhuma peça de PRODUTO usava a forma nova
no fechamento dela. O flange do `freio-disco` continuava sendo uma chapa por
prisioneiro — a linguagem já não obrigava, mas a peça não tinha sido reescrita.
Essa dívida foi paga em seguida, na rodada "Flange de uma peça só", abaixo. E um
passo tem UM raio: a flange com furo central mais círculo de parafusos ainda não
é escrevível (A-30, aberto).

### Flange de uma peça só — CONCLUÍDA em 31 de julho de 2026

**O que estava errado:** o flange do `freio-disco` tinha quatro ressaltos
quadrados, um por prisioneiro. Eles nunca foram desenho mecânico. Existiam
porque um passo de `furo` consome a face de entrada, então cada furo precisava
de uma face só dele. Depois do `centros` da rodada "Furo v2" a linguagem já não
obrigava, e a forma ficou como dívida de peça.

**O que mudou na peça, medido:**

| | antes | depois |
|---|---|---|
| passos do trecho do flange | 7 | 4 |
| parâmetros do trecho | 9 | 5 |
| identidades estruturais | 6 (304–309) | 2 (304, 305) |
| CORPOS da parte `cubo` | 5 | 2 |
| faces da peça / vértices | 540 / 554 | 504 / 490 |
| envelope do `cubo` | x −0,070..0,032, y e z ±0,052 | idêntico |

E `prisioneiros` passou a bastar sozinho: a peça constrói com 3, 5, 6 e 8, com
zero órfão e sem um cosseno no arquivo. Antes, mudar 4 para 5 deixava o quinto
assento sem furo até alguém escrever o corte à mão.

**O defeito de NÚCLEO que a prova em produto achou:** a face do flange é a tampa
de um cilindro de 16 lados, com 4 anéis de 12 a 90°. Como 16, 12 e 4 são todos
múltiplos de 4, a simetria põe o vértice de um anel EXATAMENTE em cima da aresta
de uma orelha de outro (2,2·10⁻¹⁹ contra um eps de 10⁻¹²). "Em cima" não é
"dentro": a orelha era cortada, engolia a lasca do outro lado da aresta e
deixava o resto do polígono com orientação invertida. O sintoma chegava longe da
causa — `a partição criou um triângulo de área nula ou invertida`, uma das três
provas de estado impossível que o núcleo declarava não ter entrada capaz de
disparar. Tinha. Corrigido com o `pontoNoSegmento` que a ponte já usava: 17 de
240 combinações de face × furo × total gritavam antes, 0 depois.

**Mutações, 17 no total.** No núcleo: devolver a conferência a só
`dentroEstrito` mata 3 dos 10 casos novos. Na peça, morrem — orientação +Y→+Z
(2 casos), entrada trocada pela saída (9), órbita a 48 mm, que põe o furo fora
do flange (9), flange com o dobro do raio (2), `flangeFaceRodaX` sem a espessura
(2), flange no outro extremo do cubo (2), furo com 16 lados (3), flange com 32
lados (1), `segundoPrisioneiro` virando o terceiro (1), `assentosDeRoda` sem o
preenchimento (1), `total:'prisioneiros'` virando `total:4` (2). SOBREVIVEM, e é
o certo: órbita 38→36 mm, espessura 12→14 mm e raio do furo 6,5→7,0 mm — são a
superfície de refinamento dimensional, e as afirmações são relacionais.
`volta:360` → `graus:90` e `flangeRaio` → `cuboRaio` também sobrevivem porque
dizem literalmente o mesmo.

**Prova na foto**, no mesmo enquadramento da imagem que abriu a rodada
(`bancada-freio-disco-direita-sel-cubo-isolar-focado.png`, vista direita, cubo
isolado e focado): os quatro ressaltos sumiram e o círculo de parafusos está no
disco. Na ampliação de 3× o contorno do furo não tem mais a cunha escura nem a
costura triangular que o A-31 mediu — a borda é um furo limpo.

**O que ela NÃO fez, dito na cara:**

- a SILHUETA do furo continua o polígono de 12 arestas. Na ampliação dá para
  contar as quinas. Isso está registrado em A-31 e é assunto do ciclo 5;
- o flange tem o RAIO DO CUBO, então não há degrau piloto/flange na silhueta
  lateral. Não é limite de linguagem: o aro da roda entra por cima do cubo com
  0,6 mm de folga na escala da cena, e um flange mais largo bateria nele. Aberto
  como A-32, com o conserto (cubo em dois diâmetros) descrito lá;
- A-30 continua aberto: um passo tem um raio só;
- A-29 continua aberto, mas perdeu a evidência original — o flange não usa mais
  `arranja` + `furo`, e o caso que resta é o geral de apontar para a cópia `k`
  de um arranjo radial.

**Registros alterados:** `descrever-partes.test.ts` afirmava
`1 + TOPO.prisioneiros` corpos no `cubo` e passou a afirmar 2, com o motivo
escrito. Ele continua afirmando o que afirmava — que o flange não compartilha
vértice com o barril —, e quem prende os quatro furos ao TOPO da peça é
`freio-disco-integridade`, que ganhou quatro afirmações e não afrouxou nenhuma.
`gabarito:selecao:check` regravado com `freio-disco` como ÚNICA peça de hash
novo, das 26.

### Ciclo 5 — Curva e filete v1 — CONCLUÍDO

**Nome:** Curva e filete v1. São as duas capacidades que sobraram da lista que a
crítica visual da roda levantou (perfil curvo ou afunilado, orientação de seção,
transição local, filete/bevel seletivo) — as outras duas foram entregues no
ciclo 4.

**Escopo incluído:**

- **curva no perfil.** Hoje todo contorno é uma poligonal: o `lathe` reserva o
  terceiro elemento do ponto para a alça de curva e ainda não a implementa, e o
  `contorno` do `loft` recusa o ponto de 3 elementos com essa mesma mensagem. A
  capacidade é a alça de curva de verdade, no mesmo lugar em que já está
  reservada, para que raio de concordância, barriga de perfil e gargalo deixem
  de ser um pedaço de reta;
- **filete seletivo.** Arredondar uma aresta ESCOLHIDA por identidade semântica,
  não a caixa inteira como o `chamferBox`. É o que separa uma peça fundida de
  uma peça de bloco, e é o que a crítica da roda pediu primeiro.

**Escopo excluído:** subtração nova (booleana geral, rasgo, bolsão, furo
oblíquo), relações de montagem, hierarquia de partes, posição na criação da
primitiva, e novas peças de PRODUTO. A-26 e A-29 NÃO entram: eles são do corte,
não da curva, e misturá-los reabriria o ciclo 4.

### Fechamento do ciclo 5 — o que passou e o que ficou aberto

As nove condições, uma a uma:

1. **Cumprida.** A alça de curva vale no `perfil` do `lathe`, no `contorno` do
   `loft` e nos pontos do `inflate`, com a mesma palavra: o 3º elemento é um
   raio de concordância. Aridade fora do contrato continua gritando.
2. **Cumprida, depois de trocar a medição.** A afirmação que entrou media a
   distância dos VÉRTICES ao centro do arco, que é exata por construção e dá
   0,000000% em qualquer discretização — inclusive com um segmento, onde o
   arco é uma corda reta a 29% do arco de verdade. Trocada pela flecha da
   corda, que é o desvio da SUPERFÍCIE. Com 8 segmentos num canto reto: 0,482%.
3. **Cumprida.** A op `filete` endereça a aresta por origem estrutural, não
   consome face nenhuma e não regenera a peça.
4. **Cumprida.** O painel entra em `CONTRATOS_ORIGEM` com o eixo `painel`.
5. **Cumprida ao pé da letra, e a palavra é grande demais.** Com `n = 1` painel,
   os dois cantos nascem a 45° exatos, medidos na malha. Dois cantos de 45° são
   um CHANFRO, não um arredondamento. Está registrado como A-36, aberto.
6. **Cumprida, com o custo na mesa.** Pneu 280F/320V → 520F/560V; roda inteira
   494F → 734F (1,49×, não dobra). Freio 504F → 508F (quatro filetes, +1 F
   cada). Cubo simples com um filete: 8V/6F → 10V/7F.
7. **Cumprida.** `gabarito:selecao:check` verde, 26 das 28 peças byte-idênticas.
   Mudaram só `roda-dianteira` e `freio-disco`, as duas reescritas de propósito,
   mais as duas peças novas.
8. **Cumprida.** `_caixote-filetado` (móvel, não automotivo) usa AS DUAS: o
   filete na aresta de cima-da-frente e as concordâncias no perfil do puxador
   torneado. Em produto, a `roda-dianteira` usa a curva (ombro do pneu) e o
   `freio-disco` usa o filete (chanfro de entrada e saída das pastilhas).
9. **Cumprida, com sobrevivente dito na cara.** A troca cos/sin na amostragem do
   arco sobreviveu à conferência de raio, porque cos²+sin²=1 preserva a
   distância; virou teste que fixa a tangência exata.

**O defeito que a rodada achou em si mesma, e a lei que sai dele.** O primeiro
desenho do filete preservava os vértices da aresta dentro das duas faces. O
neutro continuava FECHADO e a contagem BATIA, então nenhum teste do núcleo caía
— mas a face ficava com um canto EM CIMA da aresta seguinte. Quem gritou foi o
adaptador, ao triangular em orelhas, e só quando a op chegou numa peça de
verdade. **Malha fechada e contagem certa não provam polígono simples.**

**Aberto ao fim do ciclo:** A-35 (`segmentosCurva` é por passo, não por
concordância), A-36 (o filete de um painel é chanfro), A-37 (o filete não compõe
com `chamferBox`, e era justo a pinça que precisava). A pinça, o suporte e o
pistão do freio continuam peças de bloco.

### Gate do ciclo 5 — escrito na abertura, sobre o estado de hoje

A comparação foi refeita depois do ciclo 4, sobre `roda-dianteira`,
`freio-disco` e `_corrimao` na bancada, em isométrica e em vista reta. O que se
vê, dito sem eufemismo:

- **o freio é uma peça de BLOCO.** Pinça, suporte e pistão são caixas de aresta
  viva a 90°. Uma pinça de verdade é fundida: toda aresta dela tem raio. É a
  diferença que a crítica da roda chamou de fundida contra bloco, e ela aparece
  na isométrica sem precisar aproximar;
- **o pneu tem VINCO onde deveria ter ombro.** O perfil do `lathe` é uma
  poligonal, então a passagem da banda de rodagem para o flanco é uma quina, não
  um raio. O mesmo vale para o barril do aro;
- **o corrimão é um tubo reto que encontra o pilarete em ângulo vivo**, sem
  concordância nenhuma entre os dois corpos;
- **a silhueta do furo é o polígono de `lados` arestas** (A-34). Normal suave
  não muda contorno.

**Condições de aceite.** Todas medidas; nenhuma "ficou melhor".

1. **A curva nasce onde já está reservada.** O terceiro elemento do ponto passa
   a ser aceito no `perfil` do `lathe`, no `contorno` do `loft` e nos pontos do
   `inflate` — os três lugares que hoje gritam "RESERVADA, ainda não
   implementada" — com a MESMA palavra e o MESMO significado nos três. Aridade
   fora do contrato continua gritando e abortando o passo.
2. **A curva é conferida contra a forma analítica.** Um arco de raio declarado,
   escrito com a alça, sai a menos de 1% do raio em toda amostra, com a
   discretização que o autor pedir. Conta fechada de vértices e faces, como toda
   op do núcleo.
3. **O filete é endereçado por IDENTIDADE.** Arredondar uma aresta escolhida por
   origem estrutural, não a caixa inteira como o `chamferBox`. As arestas não
   escolhidas continuam exatamente como estavam, e as faces vizinhas continuam
   existindo com a mesma identidade — a peça não é regenerada.
4. **O que o filete cria é ENDEREÇÁVEL.** A superfície nova entra em
   `CONTRATOS_ORIGEM` e se cita por família e faixa, como cubo, cilindro, lathe,
   loft e furo. Referência inválida grita.
5. **A silhueta muda, e isso é medido na MALHA.** Onde havia uma aresta a 90°
   passa a haver `n` faces com ângulo de 90°/(n+1) entre vizinhas consecutivas.
   Medido em graus, sobre o neutro. Mais a conferência no olho na bancada, em
   pelo menos dois enquadramentos, antes e depois no mesmo quadro.
6. **Custo declarado.** Faces e vértices por peça, antes e depois, escritos no
   relato. Filete que dobra a malha de uma peça inteira é reprovação.
7. **Aditivo.** `gabarito:selecao:check` verde, com todas as peças anteriores
   byte-idênticas — exceto as que a rodada reescrever de propósito, nomeadas uma
   a uma.
8. **Provado em peça de PRODUTO e em peça NÃO automotiva.** Uma peça de
   exercício de outra família (móvel, ferramenta, estrutura) usa as duas
   capacidades, e o `freio-disco` ou a `roda-dianteira` usa pelo menos uma.
9. **Mutação relatada.** Cada afirmação nova vem com a mutação que a mata, e o
   sobrevivente que não morrer é dito em voz alta, não escondido.

**O que este gate NÃO exige:** que a peça fique bonita, que o filete seja
variável ao longo da aresta, que ele resolva encontro de três arestas num canto,
nem que a concordância entre CORPOS diferentes (corrimão contra pilarete)
exista. Filete de canto e transição entre corpos ficam fora, declarados.

### Ciclo 6 — Furo por grupo, contagem por desvio e filete v2

**Nome:** Furo por grupo, contagem por desvio e filete v2. A rodada paga quatro
atritos na mesma entrega: A-30 (um raio e uma profundidade por furo), A-34
(`lados` ganha unidade), A-36 (o filete ganha painéis e a guarda do recuo) e
A-37 (o filete termina o corte num vértice de quatro ou mais arestas).

Os quatro são de LINGUAGEM: o que muda é o que o autor pode escrever no arquivo
da peça, e o núcleo continua sem importar Three.js e sem saber o que é um freio.

### Ciclo 6 — o que mudou desde que os atritos foram escritos

Quatro medições feitas depois da abertura mudaram o rumo. Nenhuma é opinião.

**1. A candidata registrada do A-34 estava errada, e o atrito lia a própria
evidência ao contrário.** O A-34 diz que a saída é quebrar a quina da borda do
furo. Foi construído e medido no `freio-disco`:

| opção | V | F | tri | ondulação do contorno do furo |
| --- | ---: | ---: | ---: | ---: |
| hoje (`lados` 12) | 498 | 508 | 956 | 0,2215 mm |
| quebrar a quina dos 2 aros, n=1 | 594 | 604 | 1148 | 0,2426 mm (**pior 9,5%**) |
| `lados` 20 | 562 | 604 | 1084 | 0,0800 mm (**−64%**) |

Mesmo orçamento de face, 32 vértices e 64 triângulos a menos, e só a linha do
`lados` mexe no número. A foto que o atrito cita
(`tools/bancadas/out/bancada-freio-disco-direita-sel-cubo-isolar-focado.png`)
foi decodificada: 3913,5 px/m. O flange tem 0,9992 mm de flecha, ou 3,91 px. O
furo tem 0,2215 mm, ou 0,87 px. O furo é a superfície mais redonda da peça, 4,5
vezes mais redonda que o flange em que ele mora. As quinas que se contam naquela
foto são os 16 lados do flange. **Decisão do dono do projeto: A-34 passa a ser
`lados` com unidade.** O autor declara a TOLERÂNCIA e o núcleo deriva a
contagem. A quebra de quina sai como atrito A-38, com projeto pronto.

**2. O diagnóstico do A-36 gravado no núcleo está errado no motivo.** O
comentário de `prototipos/fps/v3/motor/oficina.js` 3691-3699 diz que subdividir
o filete falhou por não-linearidade da interpolação esférica. O fato está certo
e a causa está errada. A causa é o CENTRO do arco. Construídos os dois núcleos e
medido o ângulo entre a normal de cada painel e a normal da face de entrada, com
`segmentosCurva: 4`:

| figura | φ | derivação certa (centro na bissetriz) | tentativa registrada (centro na aresta) |
| --- | ---: | --- | --- |
| cubo lado 1, topo/aresta 0 | 90° | 11,25 33,75 56,25 78,75 | 78,75 56,25 33,75 11,25 |
| cubo com v2/v3 movidos +0,5 z | 63,4349° | 7,93 23,79 39,65 55,51 | 82,07 66,21 50,35 7,93 |

A lista da tentativa é a lista certa ao contrário. A interpolação esférica é a
mesma nas duas. O centro certo é `c = (dA+dB)·raio/(1+cosθ)` e o raio do arco é
`R = raio·tan(θ/2)`. **E a derivação errada passa nos 806 testes de hoje, passa
no gabarito das 28 peças e passa em `conferirMalha(fechada:true)` inteira no
cubo, em n = 1, 2, 4, 8 e 16.** Malha fechada, contagem certa e polígono simples
não provam que a superfície tem a curvatura certa.

**3. O A-37 foi prototipado, e a varredura existe.** 408 pares (face, aresta)
sobre cubo, `chamferBox` de chanfro 0,1, cilindro de 8, cone de 6, esfera 8×4 e
placa com furo passante de 8, com raio 0,02:

| estado | constroem | gritam |
| --- | ---: | ---: |
| núcleo de hoje | 84 (todos a 2V/1F) | 324 |
| com o leque do vértice | 376 | 32 |

Os 292 destravados são reais. Os 32 que sobram gritam `as duas faces desta
aresta se dobram quase 180°` e estão todos na placa com furo. Zero regressões.
No caso que dá nome ao atrito (`chamferBox` 1×1×1 de chanfro 0,1, `de` = face
`topo`, aresta 0, raio 0,03) o volume tirado é 2,54558e-4 contra a cunha
analítica 2,545584e-4, nenhum vértice antigo se move, e as quatro faces do leque
mudam de área EXATAMENTE 0. O desenho concorrente tira 39,3% a mais e faz duas
faces vizinhas CRESCEREM de área.

**4. As quatro frentes se encostam em três lugares, e os três foram medidos.**
A frase do projeto do A-36 de que a guarda do recuo fica acima da região do A-37
"sem hunk compartilhado" é FALSA. Medido com `git merge` de verdade, sobre cópia
byte-idêntica de `oficina.js`: inserir a guarda depois da linha 3793 e reescrever
3795-3842 dá CONFLICT de 67 linhas, e o lado do A-36 ressuscita `terceiraFace`,
que é justo a função que o A-37 apaga. A-30 × A-34 dá 1 hunk em conflito no
furo. E o cruzamento A-36 × A-37 (n painéis numa ponta de quatro arestas) não
tem figura em nenhum dos dois projetos. É isso que obriga a refatoração a entrar
antes das duas, e obriga o cruzamento a virar afirmação.

### Ciclo 6 — escopo incluído, atrito por atrito

#### A-30 — `centros` vira lista de GRUPOS, e o grupo se nomeia

O autor passa a escrever raio e profundidade por grupo de furos, e a citar o
grupo pelo nome.

ANTES, `prototipos/fps/v3/pecas/_tampa-de-caixa.js` linhas 148-158, literal.
A peça é uma tampa CHEIA porque um passo tem um raio só, e o cabeçalho dela
(linhas 31-37) diz isso em voz alta:

```js
['furo', {
  origemId: FUROS_DE_PARAFUSO,
  de:    { ...ORIGEM_TAMPA, face: 'topo' },
  saida: { ...ORIGEM_TAMPA, face: 'fundo' },
  centros: { distancia: 'orbitaDoParafuso', total: 'parafusos', volta: 360 },
  raio: 'parafusoRaio',
  lados: 'furoLados',
  orientacao: [1, 0, 0],
}],
```

DEPOIS, em `prototipos/fps/v3/pecas/_flange-de-tubulacao.js`:

```js
['furo', {
  origemId: FUROS_DA_FLANGE,
  de:    { op: 'cilindro', id: CORPO, tampa: 'topo' },
  saida: { op: 'cilindro', id: CORPO, tampa: 'fundo' },
  raio:  'parafusoRaio',            // o PADRÃO do passo
  lados: 'furoLados',               // TOPO, um só para o passo inteiro
  orientacao: [1, 0, 0],
  centros: [
    { nome: 'passagem',  centro: [0, 0, 0], raio: '= passagemDiam / 2' },
    { nome: 'parafusos', distancia: 'orbita', total: 'parafusos', volta: 360 },
  ],
}],

['parte', { nome: 'bocaDaPassagem',
  sel: { origem: { op:'furo', id: FUROS_DA_FLANGE, grupo: 'passagem', parede: TODOS } } }],
```

Medido no desenho (cilindro de 16 lados, raio 0,060, altura 0,012; furo de 12
lados; passagem 0,025; 4 parafusos 0,0055 a 0,044): 120 V, 228 F, 320 triângulos,
casca fechada. `grupo:'passagem'` pinta 36 faces, `grupo:'parafusos'` pinta 144.
Trocando `parafusos` de 4 para 6, a MESMA citação pinta 216.

A flange tem o disco NA origem, então ela sozinha não mata o atalho "furo
central". As outras quatro famílias do T28 entram como figuras de teste, sem
virar peça de acervo. A que mais importa é a placa com dois DISCOS fora do
centro mais um no centro.

Junto, e não é opcional: a partição do polígono com buracos passa a tentar TRÊS
ordens de ponte fixas em vez de uma. Sem essa parte a capacidade grita em 1 de
cada 4 figuras que ela mesma acabou de permitir (2 981 defeitos em 11 305 figuras
válidas; com as três ordens, 108). As três ordens são fixas, nesta sequência, e a
primeira que fecha vence:

1. a ordem ESCRITA pelo autor. É a de hoje, byte por byte.
2. o anel mais PERTO do contorno primeiro. A chave é a menor distância AO
   QUADRADO entre um vértice do anel e um segmento do contorno. Sem `sqrt` e sem
   `Math.hypot`, porque a precisão de `Math.hypot` é definida pela implementação
   em ECMAScript e chave de ordenação não pode depender de motor. Desempate pelo
   índice de declaração.
3. o MENOR RAIO DECLARADO primeiro. A chave é o número que o autor escreveu,
   resolvido por `st.num`, comparado exato. NUNCA um raio recalculado da
   geometria. Desempate pelo índice de declaração.

Cada LADO da chapa tenta por conta própria. Não há quarta tentativa e não há
aleatoriedade.

#### A-34 — `lados` ganha unidade, e o núcleo deriva a contagem

O autor passa a declarar a tolerância em metro. Vale em `cilindro`, `cone` e
`furo`, que são as três ops com raio escalar já resolvido onde `lados` é lido.

ANTES, `prototipos/fps/v3/pecas/freio-disco.js`, hoje, literal:

```js
export const TOPO = { ladosCubo: 16, ladosFuroPrisioneiro: 12 };

['cilindro', { origemId: FLANGE, raio: 'flangeRaio', altura: 'flangeEspessura',
               lados: 'ladosCubo' }],
```

DEPOIS, a forma que a chave passa a aceitar:

```js
export const TOPO = { acabamento: 0.00025 };   // 0,25 mm entre o lado reto e o círculo

['cilindro', { origemId: FLANGE, raio: 'flangeRaio', altura: 'flangeEspessura',
               lados: { desvio: 'acabamento' } }],
```

`12` no furo e `16` no flange são dois números que não se comparam. Foi essa
incomparabilidade que fez o A-34 nascer apontando para a superfície errada. Com
`acabamento = 0,25 mm` o flange vai de 16 para 33 lados (flecha 0,9992 → 0,2355
mm) e o furo fica em 12 (flecha 0,2215 mm, já dentro).

A troca no `freio-disco` ENTRA nesta rodada, e ela é a prova em produto do A-34.
Ela vai no mesmo commit da pinça filetada, que já regrava o hash da peça e já
paga a foto do flange que a condição 21 pede. A forma nova nasce antes disso em
`prototipos/fps/v3/pecas/_gabarito-de-furacao.js`.

Nenhum transcendental entra no arquivo salvo. A peça escreve uma distância em
metro. O `arccos` e o `cos` ficam no núcleo.

#### A-36 — o filete ganha painéis, e o recuo ganha guarda

O autor passa a escrever em quantos painéis o corte se divide.

ANTES, `prototipos/fps/v3/pecas/_caixote-filetado.js`, hoje, literal:

```js
['filete', { origemId: FILETE_FRENTE, de: { op: 'cubo', id: CAIXA, face: 'topo' },
             aresta: 0, raio: 'raioFilete' }],
```

Essa linha continua valendo e continua produzindo o mesmo neutro, byte a byte.

DEPOIS, em `prototipos/fps/v3/pecas/_cabo-sextavado.js`:

```js
export const TOPO = { segsQuina: 3 };
export const PARAMS = { raioQuina: 0.012 };

['filete', {
  origemId: QUINA_0,
  de: { op: 'cilindro', id: BARRA, lado: 0 },
  aresta: 0,
  raio: 'raioQuina',
  segmentosCurva: 'segsQuina',
}],
```

Leitura da linha: recue 12 mm para dentro de cada face a partir desta aresta, e
distribua o corte em 3 painéis ao longo do arco tangente. `segmentosCurva` vai em
TOPO porque muda a CONTAGEM e renumera dentro do bloco do passo.

A citação não muda de forma. `['quinasDaBarra', { origem: { op:'filete', id:
QUINA_0 } }]` passa a selecionar 3 faces em vez de 1, sem uma letra alterada.
`CONTRATOS_ORIGEM` não muda uma linha de código: o contrato já foi escrito para n
painéis desde o primeiro dia.

Paga junto a metade menor do A-36: o recuo passa a ser conferido contra o
material disponível em cada face, por ray-cast no plano da face, nas quatro
portas (faceA/faceB × ponta v0/v1). Medido hoje, cubo de lado 1, aresta
topo/frente: `raio: 5` sai com 0 órfão, 0 bico, 0 aresta solta e adaptador OK.
Passa em `conferirMalha` INTEIRA e a peça é lixo. A folga mínima do acervo é
5,60× (`freio-disco`, passos 17, 18, 22 e 23), então a guarda fica muda.

A prova em produto do A-36 é a pinça do `freio-disco`, com `segmentosCurva` maior
que 1 nas arestas filetadas. A mesma linha prova o cruzamento com o A-37.

#### A-37 — o filete termina o corte num vértice de quatro ou mais arestas

O vocabulário do passo NÃO muda. A mesma escrita de hoje passa a construir.

ANTES, no `freio-disco`, medido: aborta com 0 V e 0 F no bloco do passo.

```js
['chamferBox', { origemId: PINCA_PONTE, larg: 'pincaLargura', alt: 'pincaPonteAltura',
                 prof: 'pincaProfundidade', chanfro: 'pincaChanfro' }],
['filete', { origemId: PINCA_QUEBRA, de: { op: 'chamferBox', id: PINCA_PONTE, face: 'topo' },
             aresta: 0, raio: 'pincaQuebra' }],
// órfão: "a ponta v0 da aresta 0 da face 26001 tem 2 face(s) além das duas da aresta"
```

DEPOIS, os mesmos caracteres, e a peça sai com 0 órfão.

O que o formato salvo GANHA é uma palavra de endereço na origem `filete`:

```js
['pincel', { modo: 'face', cor: '#3a3a3a',
             sel: { origem: { op: 'filete', id: PINCA_QUEBRA, tampa: 'inicio' } } }],
```

`tampa` é palavra nominal, só `'inicio'` ou `'fim'`, da mesma classe de
`face: 'topo'` do cubo. `painel` e `tampa` no mesmo endereço gritam.

A TAMPA É O POLÍGONO DE n+2 CANTOS, e isto foi medido. Com n painéis o anel do
arco tem n+1 pontos em cada ponta. A tampa que fecha os n+1 contra `v0` é o
`[v0, A_n, …, A_0]`, e não o triângulo `[P1, P0, v0]` que o projeto do A-37
escreveu para n=1. Com o triângulo sobram n−1 arestas sem par por ponta
composta. E a fórmula de área `0,5·r²·senθ` só vale em n=1. Medido com raio 1 e
θ=90°: n=1 0,500000000; n=2 0,292893219; n=3 0,250000000; n=4 0,234633135;
n=64 0,214680687, contra o limite analítico 1−π/4 = 0,214601836.

Junto vai a QUINTA propriedade da conferência: nenhum triângulo do adaptador com
área abaixo de 1e-9 vezes a escala² da peça, com `escala` = maior |v| da peça.
Medido: com `de` = `chamferBox` face `tras`, aresta 3, raio 0,02, o corte novo
entrega 0 órfãos, 0 arestas soltas, 0 bicos e 1 triângulo de área EXATAMENTE 0.
O acervo de hoje passa na régua nova com piso 7,1092e-6 em `_corrimao`.

### Ciclo 6 — escopo excluído, declarado

- **`lados` por grupo de furo.** A geometria já aguenta. O que bloqueia é a
  numeração `b+2Lk+j`, que é formato salvo com L único. Rodada própria.
- **`segmentosCurva: { desvio }` no filete.** Sai da rodada e abre como A-43,
  com o projeto pronto. A rodada entrega `lados` com unidade e `segmentosCurva`
  sem, que é a mesma incomparabilidade que fez o A-34 nascer errado. Não se
  esconde: está escrito aqui e vai no fechamento.
- **`lados: {desvio}` em `esfera`, `lathe` e `loft`.** A esfera tem dois eixos de
  discretização e uma frase só em `lados` consertaria metade da superfície.
  `lathe` e `loft` mudariam a ordem de grito.
- **Misturar PASSANTE e CEGO no mesmo passo de furo.** `temSaida` decide consumo
  de face e existência de borda de saída.
- **Um segundo passo de `furo` na mesma face.** A primeira consome a face. A
  rodada contorna isso para a flange; não resolve.
- **A quebra de quina do aro do furo.** É defeito real, com projeto e protótipo
  medidos. Sai como A-38.
- **O canto onde três filetes se encontram.** Cada filete fecha a própria ponta
  com a própria tampa. As tampas de dois filetes vizinhos não se fundem.
- **Filete VARIÁVEL ao longo da aresta, filete de LOOP no contorno do furo, e
  concordância entre CORPOS diferentes.** Já estavam fora e continuam.
- **Booleana geral e corte por plano que atravessa as faces vizinhas.**
- **A interface da Oficina.** Ela continua sem emitir `segmentosCurva`,
  `lados: {desvio}`, grupo com nome e `tampa`. O A-15 segue de pé, e a rodada
  aumenta a distância entre o que a linguagem aceita e o que a ferramenta escreve.
- **LOD por distância.** O núcleo é independente de vista, por decisão. Um passo
  que produzisse malha diferente conforme a câmera quebraria o determinismo.

### Ciclo 6 — as frentes de trabalho

**Por que a rodada NÃO se parte em duas.** A crítica pediu o corte, e o argumento
dela é medido: o ciclo 5 entregou duas capacidades em 1 348 inserções, 14
arquivos e 11 commits, entre 31-07 23:29:30 e 01-08 01:06:39, ou 97 minutos. Um
agente morreu dentro desses 97 minutos, e está no log (`a0e341d`). A projeção de
29 commits pela mesma taxa dá cerca de 5 horas, quase o dobro da maior janela já
observada aqui. O argumento é real e a resposta não é partir a rodada: o dono do
projeto decidiu que os quatro atritos saem juntos, e essa decisão não se
rediscute. O que a rodada faz com o argumento é três coisas, todas escritas:

1. **A prova em produto sobe para o commit 21 de 29**, e não fica no 26 de 30. O
   `freio-disco` reescrito carrega A-34 (o flange por desvio), A-36 (os painéis)
   e A-37 (a ponta composta) num commit só. A partir do 21 a rodada tem prova em
   produto e todo commit seguinte é ganho.
2. **A linha de sobrevivência é declarada.** Interrupção antes do 3 perde chão e
   se refaz em uma hora. Entre 4 e 13 a trilha do furo já é entregável sozinha.
   Entre 14 e 20 a trilha do filete não é: ela só fecha no 21. Interrupção entre
   14 e 20 não fecha rodada, e o que se salva é o teste vermelho commitado.
3. **A fatia opcional sai.** `segmentosCurva: {desvio}` vira A-43 antes de a
   rodada começar, e não no fim, sob pressão.

**Sete frentes. Duas delas são chão compartilhado e entram sozinhas, antes de
tudo.** O corte natural (uma frente por atrito) está medido como errado: A-36 ×
A-37 dá 2 hunks em conflito no filete, e A-30 × A-34 dá 1 hunk em conflito no
furo, com `git merge` de verdade.

| frente | atritos | o que ela toca |
| --- | --- | --- |
| **F0a** — a régua e as ferramentas do gate | todos | `tools/oficina/conferir-malha.ts`, `tools/oficina/chao-do-ciclo6.test.ts` (novo), `tools/oficina/canon-linha-de-base.test.ts` (novo), `tools/bancadas/gabarito-selecao.mjs`, `tools/bancadas/criar.mjs` |
| **F0b** — a forma | A-37 fatia 1, A-36 parte da 5 | `oficina.js` 3844-3877, `posicoesDoCorte`, `planoDeCostura`, `profundidadeDentro`; e TODO o comentário da op `filete` (3680-3728) |
| **F1** — A-30 | A-30, A-33 (reescrito) | `oficina.js` 765-768, 774-862, 1501-1600, 3282-3309, 3382-3433, 3462-3474, 3483, 3543, ~3494, 3630; `oficina.test.ts` 4919 e 5600-5615; `_flange-de-tubulacao.js` (nova) |
| **F2** — A-34 | A-34 | `oficina.js` ~1745-1752, 1780-1781, 1857-1859, 3385, 3571-3573, 7-10 (cabeçalho); `_gabarito-de-furacao.js` (nova) |
| **F3** — A-36 | A-36 | `oficina.js` corpo de `posicoesDoCorte` e corpo de `profundidadeDentro`; `_caixote-filetado.js` 22-23; `_cabo-sextavado.js` (nova) |
| **F4** — A-37 | A-37 | `oficina.js` ~1418 (`lequeDoVertice`), 873-907, 3795-3842, corpo de `planoDeCostura`; `_mordente-de-morsa.js` (nova); `freio-disco.js` |
| **F5** — acervo e documentação | todos | `gabarito-selecao.json`, `ATRITOS-AUTORIA.md`, `PLANO.md`, `INDEX.md`, `UPSTREAM-NOS.md`, `PRANCHA-FREIO-DISCO.md`, `PRANCHA-CICLO6.md` (nova), `SKILL.md`, `oficina-contrato.md`, `_tampa-de-caixa.js` 31-37, `oficina.js` 864-872 (só comentário) |

**O que cada frente NÃO pode tocar.** Isto não é etiqueta, é o que impede o
merge de desfazer trabalho.

- **F0a:** nada dentro de `export const OPS`.
- **F0b:** nenhuma linha de comportamento. O gabarito das 28 peças é a prova.
- **F1:** `oficina.js` 3385 e 3571-3573 (são do F2), tudo acima de 764, tudo de
  3633 a 3880, `conferir-malha.ts`, e qualquer documento.
- **F2:** `oficina.js` 3383-3384 (é do F1), `CONTRATOS_ORIGEM` inteiro (583-908),
  a op `filete` inteira, e `oficina.test.ts` (nenhuma linha).
- **F3:** `oficina.js` 3795-3842 e 873-907 (são do F4), 864-872 (foi para o F5),
  3680-3728 (foi para o F0b), `planoDeCostura`, `freio-disco.js`, e
  `oficina.test.ts`.
- **F4:** `oficina.js` 864-872 e 3680-3728, `posicoesDoCorte`,
  `profundidadeDentro`, e `oficina.test.ts`.
- **F5:** nenhuma linha de `oficina.js` que mude comportamento.

**Por que esta divisão, e não uma frente por atrito.** Seis motivos, todos
medidos.

1. **A régua entra antes de qualquer peça nova.** F0a troca o que
   `conferirMalha` cobra. Régua trocada no meio invalida prova já dada. Medido
   que ela commita verde hoje: piso 7,1092e-6 em `_corrimao` com `escala` =
   maior |v| da peça, 0 de 28 peças abaixo de 1e-9, e o L grande do A-34 também
   passa (cilindro L=499 dá 1,996e-7, ainda 200× acima do piso).
2. **A-36 e A-37 disputam o mesmo bloco.** Os dois substituem `oficina.js`
   3844-3877. Com a refatoração do F0b instalada e cada frente editando só a
   própria função, o merge dá 0 hunks em conflito. Sem ela, dá 2.
3. **A numeração do filete é formato salvo e os dois a reivindicam.** A-36 quer
   `b+2` e `b+3` para o segundo anel; A-37 quer `b+2` e `b+3` para os vértices
   das tampas, e a face `b+1` é painel 1 num e tampa no outro. A colisão é
   alcançável: todo vértice de `chamferBox` tem valência 4 (medido: 24 de 24), e
   a fatia 21 filete a pinça. A numeração se decide UMA vez, no F0b, antes de
   qualquer código novo, e ela é FIXA e com BURACO:
   **vértices dos painéis em `b+0..b+2n−1`; vértice da tampa da ponta `inicio`
   sempre em `b+2n`, o da ponta `fim` sempre em `b+2n+1`. Faces dos painéis em
   `b+0..b+n−1`; face da tampa `inicio` sempre em `b+n`, da tampa `fim` sempre
   em `b+n+1`. O slot fica VAZIO quando aquela ponta é simples. Numeração densa
   é proibida.** A prova de que o buraco importa é o cone de 6 lados: a aresta 0
   tem ponta de valência 3 e ponta de valência 6, e com numeração densa a face
   `b+1` viraria a tampa do `fim`, então toda peça que citasse `tampa:'fim'`
   endereçaria a tampa do `inicio`. Com os slots fixos ela sai em V
   `{b, b+1, b+3}` e F `{b+0, b+2}`.
4. **No furo, A-30 vem antes de A-34.** A-34 lê `raio` na linha 3385 e A-30 põe
   os raios por grupo em 3462-3474. Derivar L do raio do passo faz a flecha da
   passagem da própria flange exceder o desvio pedido em 102,5% (desvio 0,250
   mm), 112,8% (0,100 mm) e 113,9% (0,050 mm), sem grito. Descer a derivação de
   3385 para antes de 3477 é grátis: `L` é declarado em 3385 e só é usado em 3481.
5. **A derivação por desvio nasce no F2, e não no chão.** Com
   `segmentosCurva: {desvio}` fora da rodada, o A-34 é o único consumidor de
   `flechaDoArco(R,φ,n)` e `contagemPorDesvio(R,φ,desvio)`. Ela nasce na forma
   geral, com `flechaDoAnel(R,L) = flechaDoArco(R, 2π, L)` como apelido fino, e o
   A-43 a reusa sem reescrever. Isso tira uma dependência do F0b: o chão passa a
   travar duas frentes, não três.
6. **A pinça do freio vai depois das duas trilhas.** A guarda do A-36 impõe um
   teto de raio que o A-37 não conhece: `chanfro·√2`. Medido na geometria real, a
   porta que manda é sempre a TIRA DE CHANFRO. Ponte e garra (chanfro 0,004) dão
   teto 0,005657 m; suporte (chanfro 0,003) dá 0,004243 m. `pincaQuebra` tem de
   nascer com valor abaixo disso.

**O que corre em paralelo, e o que não corre.** Duas trilhas, duas worktrees.
TRILHA FURO = F1 + F2, e ela MERGEIA PRIMEIRO. TRILHA FILETE = F3 e depois F4, em
SÉRIE, na MESMA worktree. Medido que as trilhas não se encostam: a edição mais
baixa do A-30 no furo é `registraOrigem` em 3630; a mais alta do A-36 no filete é
o comentário em 3691, e esse comentário foi para o F0b. F3 e F4 não correm em
paralelo porque eles são as duas metades da MESMA função: a op `filete` vai de
3729 a 3880, 152 linhas, e F3 fica com `posicoesDoCorte` e F4 com
`planoDeCostura`. Serializar não custa tempo de gate (6,2 s) e apaga toda dúvida
de fronteira entre as duas funções. F3 antes de F4: F3 enche a lista de posições,
F4 só consome o comprimento dela.

**Os arquivos GERADOS, e a regra que vale para os dois.**
`tools/bancadas/gabarito-selecao.json` e `docs/uso/MAPA.md` têm uma linha de
total no cabeçalho que toda regravação reescreve. Medido: quatro branches, cada
uma gravando uma peça nova, dão conflito nos seis pares de
`gabarito-selecao.json`; e criar um arquivo faz `mapa:check` falhar na linha 8
(219 → 220 arquivos). A regra é: **conflito em arquivo gerado se resolve rodando
o gerador de novo, nunca à mão.** O gabarito é regravado duas vezes na rodada
(commit 21 para o `freio-disco`, commit 25 para as quatro peças novas) e o
`MAPA.md` é regravado na MESMA fatia que cria arquivo. Todo arquivo novo nasce
com cabeçalho, porque `mapa.mjs` cobra cabeçalho em todo arquivo-fonte.

**A lista de atritos novos.** Os três projetos abrem A-38 e A-39 com significados
diferentes. **A faixa é alocada agora, antes de as frentes começarem:** A-38 = a
`quebra` de quina do furo (F2); A-39 = a terceira face não-plana do filete,
1,4642e-2 no prisma triangular (F3); A-40 = o clamp silencioso de contagem,
`4294967296 | 0` vira 1 (F3); A-41 = a resposta do filete depende da tesselação
da vizinhança, 9,0436e-5 contra 1,9134e-7 (F4); A-42 = volume ambíguo em face
entortada, amplitude 1,6692e-5 (F4); A-43 = `segmentosCurva: {desvio}`, que sai
do escopo (F3); A-44 = a divergência de vocabulário do filete, que é `raio` como
RECUO contra `raio` como raio do arco em `arcoDeConcordancia` (1676), mais o
padrão de `segmentosCurva`, 1 no filete e 8 em `lathe`, `loft` e `inflate` (F5).

**Antes de a rodada começar.** `git worktree list` mostra duas worktrees mortas:
`.claude/worktrees/agent-a66976e63307ee497` em `wip/filete-seletivo-v2` (fce58dd)
e `.claude/worktrees/agent-aea230c82fee86f8e` em `wip/curva-perfil` (d135c01).
Medido com `git rev-list --count HEAD..<branch>`: as duas têm ZERO commits fora
do HEAD, então são só cópias velhas de trabalho já mergeado. Existe uma TERCEIRA
branch que o plano não via: `wip/filete-peca-inacabada`, com 1 commit fora do
HEAD (3d7baab, 76 inserções em `_caixote-filetado.js` e `freio-disco.js`). Lido:
é a tentativa de filetar a ponte da pinça que abortou, e é justo o caso que virou
o A-37. Ela morre nomeada, e a rodada a refaz no commit 21. Rodar
`git worktree remove` nas duas worktrees, `git worktree prune`, e apagar as TRÊS
branches, escrevendo no commit de limpeza o que havia em cada uma. As três são
LOCAIS: só existem `origin/main` e `origin/claude/clone-...`. Cada frente abre
worktree com nome próprio e EMPURRA a branch.

**Regra de ferramenta:** o orquestrador NUNCA aplica trabalho com `patch` nem com
`git apply`. Reproduzido: dois patches independentes que acrescentam no fim de
`oficina.test.ts`, aplicados com `patch -p1 --fuzz=3`, saem com exit 0, offset
−229 linhas, e enfiam o hunk três vezes dentro do bloco `ciclo 5 — o ombro do
pneu`. `git merge` no mesmo par conflita alto e não deixa passar.

### Ciclo 6 — a ordem, em fatias que se commitam verdes

São 29 commits verdes. Nenhuma fatia é maior que um bloco de código contíguo mais
os testes dele. A perda máxima com essa regra é uma fatia.

**O gate de linha de comando custa 6,2 s de RELÓGIO** (medido agora:
`npx vitest run` 5,48 s de relógio e 4,62 s de duração reportada;
`gabarito:selecao:check` 0,42 s; `id-cru:check` 0,31 s). Não existe motivo
técnico para acumular trabalho entre commits. `npm run criar` renderiza e é caro,
então ele só é cobrado no F5.

Onde o texto diz **"os três verdes"**, leia: `npx vitest run` verde,
`npm run gabarito:selecao:check` exit 0 com os 28 hashes antigos idênticos, e
`npm run id-cru:check` exit 0. Depois do commit 2 o gate do gabarito aceita peça
nova NOMEADA e continua saindo exit 0. Antes do commit 2 ele não aceita, e por
isso o commit 2 vem antes de qualquer peça.

#### Chão (F0a e F0b)

**Estado de porte no warbook, 1º de agosto de 2026.** A primeira parte do
F0a já está fechada em três commits, antes de qualquer mudança de
comportamento em `oficina.js`:

- **P1** (`55acc93`): `criar.mjs` voltou a encaminhar `ALIASES`; o freio a
  disco agora é medido com 0 órfãos pela mesma bancada que antes o acusava por
  engano. O teste `criar-aliases.test.mjs` guarda a regressão.
- **P2** (`1936fb5`): a quinta propriedade, área mínima relativa de triângulo,
  entrou com caso vermelho e varredura do acervo.
- **P3** (`e6e4c30`): os oito cânones da família simétrica de `furo` foram
  gravados antes de qualquer porte de ordem de ponte.

Ainda não entrou `gabarito:selecao --novas`, nem qualquer fatia de
comportamento do F0b/F1. Os três gates do roteiro continuam obrigatórios antes
de prosseguir.

1. **F0a — a régua, com o caso vermelho.** ENTRA: a quinta propriedade em
   `conferir-malha.ts` (área mínima de triângulo do adaptador ≥ 1e-9·escala², com
   `escala` = maior |v| da peça, escrita ao lado do número). FECHA: o teste que
   mede o piso do acervo inteiro, e O CASO VERMELHO, que é obrigatório. Medido: o
   cubo de lado 1 com filete de raio 0,99999999 passa em `conferirMalha` INTEIRA
   hoje, e a quinta propriedade o reprova com 4 de 16 triângulos de área
   EXATAMENTE 0. NÃO ENTRA o descarte de canto colinear em `adaptar-three.js`
   que o projeto pedia: medido que nenhuma face do caso vermelho tem canto a
   menos de 1e-3° de colinear, e que o recorte de orelhas já recusa orelha de
   área ≤ 1e-18 (`adaptar-three.js:133`). O sliver vem de dois vértices a 1,0e-8
   numa face de tamanho 1, e quem paga isso é a guarda do recuo do A-36. GATE:
   os três verdes. No corpo do commit: piso 7,1092e-6 em `_corrimao`, 0
   degenerados no acervo, folga de 7 109×.
2. **F0a — as ferramentas do gate.** ENTRA: `gabarito-selecao.mjs` ganha
   `--novas=<lista>`, e peça cujo nome está na lista não marca `diverge`; o
   script passa a imprimir quantas das antigas bateram. E `criar.mjs:57` passa a
   passar `mod.ALIASES ?? []` como sexto argumento para `nucleo`, que hoje ele
   derruba. FECHA: `canon-linha-de-base.test.ts`, com os 8 canons da família
   `furo v2 — face redonda com círculo de furos em simetria exata`
   (`oficina.test.ts:5484`) gravados como LITERAIS. Sem essa captura o T12 da
   fatia 4 não tem contra o que comparar depois do primeiro commit de
   comportamento. GATE: os três verdes; e no corpo, quantos órfãos de alias
   sobram em `npm run criar -- _caixote-filetado` depois da correção (hoje são
   25, todos de `alias 'caixaInteira' inexistente` e `seleção vazia`).
3. **F0b — a forma.** ENTRA: `oficina.js` 3844-3877 vira seis linhas que chamam
   funções puras e leem o custo derivado. `planoDeCostura` nasce perto de
   `aneisSeSobrepoem` (~1418), JÁ GENÉRICA no comprimento do anel: com anel de um
   elemento, `[...anelP.slice(1).reverse(), v0]` colapsa em `[idP1, v0]`, que é
   literalmente a linha de hoje. `posicoesDoCorte` nasce perto de
   `arcoDeConcordancia` (~1705). `profundidadeDentro(st, faceId, origem, dir)`
   nasce com a chamada JÁ ESCRITA na op, antes de `posicoesDoCorte`, e o corpo
   devolvendo `Infinity`. A guarda do recuo do F3 preenche só o corpo dela, e com
   isso ela não toca 3792-3794 nem `planoDeCostura`. A guarda de estouro
   `2·segs + 2 > BLOCO` roda ANTES de qualquer posição ser construída, e
   `plano.custo` só é lido depois. No MESMO commit, TODO o comentário da op
   `filete` (3680-3728) reescrito: a numeração do item 3 das frentes, a saída do
   parágrafo `SÓ UM PAINEL NESTA RODADA`, a saída da frase de FORA DE ESCOPO
   sobre o raio não conferido, e a frase de que a posição dentro do preenchimento
   NÃO é endereço estável. Mais `_caixote-filetado.js` 22-23, que diz `12V/9F` e
   é `10V/7F` (medido). FECHA: nenhum teste novo de comportamento. GATE: gabarito
   com 28 byte-idênticas é a prova de que nada mudou, mais 806 verdes. No corpo:
   "o merge de A-36 com A-37 vai de 2 hunks em conflito para 0".

#### Trilha furo (F1 e F2) — mergeia primeiro

4. **F1 fatia 1 — três ordens de ponte.** ENTRA:
   `triangularComAneis(contorno, aneis, escala, ordem)`; `d2AoSegmento`,
   `ordensDePonte` e `particionar` ao lado, com as TRÊS ordens exatamente como
   escritas no escopo do A-30, sem `sqrt` e sem `Math.hypot` na chave; o `furo`
   chamando `particionar` nos dois lados com um raio só. FECHA: T11 (a ordem é
   carregada), T12 (é inerte com raios iguais, contra os canons gravados no
   commit 2), T13 (é determinística), T14 (cada lado tenta por conta própria), e
   o grito 22 com o texto novo casado por inteiro (`… nenhuma orelha livre (o
   núcleo tentou 3 ordens de ponte e nenhuma fechou; o defeito é do núcleo,
   A-33, não do arquivo da peça)`). Junto, e obrigatório: mover 8 linhas de
   `AINDA_TRAVA` (`oficina.test.ts` 5607) para o bloco da região sadia, que são
   [6,3,7], [6,4,7], [6,12,7], [6,24,7], [8,3,9], [8,4,10], [10,4,11] e
   [18,3,11]. GATE: os três verdes.
5. **F1 fatia 2 — `centros` aceita grupos.** ENTRA: o parsing dos três formatos de
   item; `raiosPorFuro`; `raio` do passo vira o padrão; `raiosPorFuro[k]` no laço
   de anéis (3483); `raiosPorFuro` como chave da 3ª ordem; o ramo de continência
   antes do de cruzamento. FECHA: T1 a T10 e T24; as recusas 1 a 8 e 15 a 17.
   GATE: os três verdes.
6. **F1 fatia 3 — profundidade por furo.** ENTRA: `profundidade` opcional no item;
   `profsPorFuro`; profundidade em passo passante GRITA. FECHA: T22, T23; as
   recusas 10 a 12. GATE: os três verdes.
7. **F1 fatia 4 — o grupo se nomeia.** ENTRA: `nome` no item; `grupos` no
   `registraOrigem`; `'grupo'` em `chaves` E no `msg` do `validar` (767-768); a
   janela no `resolver`. Junto, e na MESMA fatia: a regex de `oficina.test.ts`
   4919. Sem ela a suíte fica verde e o diagnóstico mente. FECHA: T16 a T21; as
   recusas 13, 14, 18, 19, 20, 21; e o grito 5, que é o único texto de hoje que
   MUDA, com o texto novo casado por inteiro (`centros em círculo usa nome,
   pivo, distancia, total, volta, graus, raio, profundidade — 'eixo' não é
   palavra desta forma`). GATE: os três verdes.
8. **F1 fatia 5 — a peça e as figuras gerais.** ENTRA:
   `_flange-de-tubulacao.js`, `tools/mecanifica/flange-integridade.test.ts` e
   `npm run mapa`. O gabarito NÃO é regravado. FECHA: T1, T2, T15, T16, T17, T26;
   e o T28, com as quatro famílias que a flange não alcança escritas como figuras
   de teste em `furo-raio-por-grupo.test.ts`, sem virar peça de acervo. A que não
   pode faltar é a placa com dois DISCOS fora do centro mais um no centro, porque
   é ela que mata o atalho "furo central". A flange de robô cego com TRÊS
   profundidades é a segunda. As outras duas (tampo de mesa e base de ferramenta)
   caem, e o motivo é orçamento de commit, não geometria. GATE: 806+ verdes,
   id-cru verde, e `gabarito:selecao:check --novas=_flange-de-tubulacao` exit 0
   com 28 antigas idênticas.
9. **F2 fatia 1 — a derivação.** ENTRA: `flechaDoArco(R, phi, n)` e
   `contagemPorDesvio(R, phi, desvio)` antes de `export const OPS` (~1745-1752);
   `flechaDoAnel(R,L) = flechaDoArco(R, 2π, L)` e `ladosPorDesvio` como apelidos
   finos; `resolverLados(st, valor, raio, op)`. Nenhuma op chama nada. FECHA:
   round-trip em 3 980 casos com 0 erro; minimalidade em 16 000 amostras com 0
   violação; o clamp na flecha do triângulo; a regra do maior raio. GATE: os três
   verdes, gabarito intocado.
10. **F2 fatia 2 — `furo`.** ENTRA: `resolverLados` no lugar de 3385, DESCIDA para
    logo antes de 3477, derivando L de `Math.max(...raiosPorFuro)`; a guarda de
    estouro 3571-3573 roteada por `derivado`. Junto: `| 0` vira `Math.trunc` na
    linha 3385, que esta fatia já reescreve. Junto, e obrigatório: o cabeçalho do
    núcleo, `oficina.js` 7-10. Ele diz hoje que "mudar `raio` não renumera", e
    com `lados: {desvio}` mudar `raio` PASSA a renumerar. FECHA: afirmações 1, 3,
    5, 6, 7, 8, 9, 10, 12, 13, mais o teste da regra do MAIOR raio sobre a op, e
    mais o teste de que com desvio fixo mudar o raio renumera e uma citação fora
    da faixa nova vira ÓRFÃO nomeando a faixa. GATE: os três verdes, e
    `oficina.test.ts` 4814 sem uma linha de diff.
11. **F2 fatia 3 — `cilindro` e `cone`.** ENTRA: a mesma troca em 1780 e 1857,
    mais o grito de raio ≤ 0 só no ramo da frase, mais `| 0` virando `Math.trunc`
    nas duas linhas. Medido, para os três sítios juntos: custo zero, 28
    byte-idênticas e 806 verdes. FECHA: as quatro propriedades nas duas ops; o
    grito de raio ≤ 0; `lados: []` deixando de ser throw cru; e
    `cilindro lados: 4294967296`, que hoje constrói com 3 lados em silêncio (6 V
    e 5 F, medido), passando a lançar `estoura o bloco de ids`. GATE: os três
    verdes.
12. **F2 fatia 4 — a afirmação negativa.** ENTRA: nenhum código. FECHA: as três
    afirmações da condição 10, incluindo a ordenação DENTRO da peça de produto.
    GATE: os três verdes.
13. **F2 fatia 5 — a peça.** ENTRA: `_gabarito-de-furacao.js`, o teste de
    integridade dela e `npm run mapa`. Gabarito não regravado. FECHA: os dois
    furos de mesmo raio e mesmo acabamento, um por contagem e outro pela frase,
    com a MESMA contagem de faces e a MESMA flecha medida. GATE: como a fatia 8.
    **Aqui a trilha do furo MERGEIA na main.**

#### Trilha filete (F3 e depois F4, em série)

14. **F3 fatia 1 — `segmentosCurva` e o arco.** ENTRA, dentro de
    `posicoesDoCorte`: `const segs = Math.max(1, Math.trunc(st.num(a.segmentosCurva ?? 1)))`;
    `nV = 2·segs`, `nF = segs`; `desloc[0]` e `desloc[segs]` LITERAIS
    (`raio*dA`, `raio*dB`); o bloco do arco atrás de `if (segs > 1)` com
    `c = (dA+dB)·raio/(1+cosθ)`, `R = raio·tan(θ/2)`, Gram-Schmidt e amostragem em
    `phi*s/segs`; os anéis intercalados; os n painéis com herança dos 5 atributos
    em CADA um. A COSTURA NÃO ENTRA AQUI: ela já é genérica desde o F0b. FECHA:
    A1 a A14, A19, A20 em `tools/oficina/filete-paineis.test.ts`. GATE: os três
    verdes, e `oficina.test.ts` 5761 sem uma linha de mudança. É a fatia mais
    gorda das 29. Se passar de 30 minutos, parte em duas: primeiro o teste da lei
    do ângulo em aresta não-reta commitado VERMELHO com `it.fails` e o comentário
    do que ele espera, depois o código.
15. **F3 fatia 2 — a origem com n painéis.** ENTRA: zero linha de
    `CONTRATOS_ORIGEM`, e uma frase de comentário. FECHA: A15 (os sete casos de
    citação, com o texto do grito casado por inteiro) e A16 (herança nos quatro
    painéis, `tinta` em nenhum). GATE: os três verdes. Ela é separada da 14 de
    propósito: se a 14 quebrar a citação, esta diz onde.
16. **F3 fatia 3 — a guarda do recuo.** ENTRA: o CORPO de `profundidadeDentro` e
    as quatro portas. A chamada já está no lugar desde o F0b. Commit próprio
    porque ela NÃO é aditiva no sentido estrito: entrada antes aceita passa a
    gritar. FECHA: A17 (as quatro portas, com 0 V / 0 F contado no BLOCO do
    passo) e A18 (a cadeia do `freio-disco`, 0,073500 contra 0,076000). GATE: os
    três verdes, conferidos ANTES e DEPOIS, com a folga mínima do acervo (5,60×)
    no corpo da mensagem de commit.
17. **F3 fatia 4 — o defeito anterior e a peça.** ENTRA: `_cabo-sextavado.js`
    (cilindro de 6 lados, raio 0,09, altura 0,6, filete nas 6 arestas VERTICAIS,
    raio 0,012, `segmentosCurva` 3), `tools/mecanifica/cabo-sextavado-integridade.test.ts`
    e `npm run mapa`. Gabarito não regravado. FECHA: A21, que trava 1,4642e-2 de
    não-planaridade no prisma triangular com n=1 e a série até 1,5679e-2 com
    n=64, com o comentário dizendo que ele existe para esta rodada não levar a
    culpa. Mais 48 V / 26 F / 92 triângulos no cabo e φ = 60° exato. Escrito no
    corpo do commit, porque é medido: o cilindro de 6 lados tem 12 vértices, TODOS
    de valência 3, então esta peça exercita n=3 só em ponta SIMPLES. GATE: como a
    fatia 8.
18. **F4 fatia 1 — `lequeDoVertice` sozinho.** ENTRA: a função neutra, junto de
    `aneisSeSobrepoem` e `bordaAnular`. Nenhuma op a chama. FECHA: leque de cubo
    (k0=3, cadeia de 1), de `chamferBox` (k0=4, cadeia de 2), de polo de esfera
    (k0=8, cadeia de 6), borda aberta, aresta não-manifold e leque que repete
    face. Os três últimos com `st.F` montado à mão, porque nenhuma op do
    repositório os constrói. GATE: os três verdes.
19. **F4 fatia 2 — a op usa o leque na ponta SIMPLES.** ENTRA: `terceiraFace` sai;
    a ponta com cadeia de 1 segue o caminho literal de hoje; as mensagens passam a
    dizer `ponta 'inicio'` e `ponta 'fim'`. FECHA: `neutroCanonico` de cubo mais
    filete byte-idêntico ao de antes. É a fatia que prova a aditividade. GATE:
    os três verdes. Medido que nenhum teste lê as mensagens trocadas:
    `grep 'além das duas' tools/ src/` dá 0.
20. **F4 fatia 3 — a ponta COMPOSTA constrói, e o cruzamento com o A-36.** ENTRA:
    `v0` fica no lugar, `P0` nasce novo, `faceA` troca, `C1` e `Cm` ganham um
    canto, a TAMPA fecha como o polígono `[v0, A_n, …, A_0]` de n+2 cantos, e o
    espelho na outra ponta. Slots FIXOS, na numeração decidida no F0b.
    `registraOrigem` passa a levar `{ paineis, tampas }`, com `tampas` sempre
    publicada e `{}` na ponta simples. FECHA: P1 a P8 e P17; mais O CRUZAMENTO,
    que é a afirmação que nenhum dos dois projetos tinha: `chamferBox` 1×1×1 de
    chanfro 0,1, `de` = face `topo`, aresta 0, raio 0,03, `segmentosCurva: 3`,
    com os CONJUNTOS de V e F afirmados (`{b+0..b+5}` painéis, `b+6` e `b+7`
    tampas; `{b+0..b+2}` painéis, `b+3` e `b+4` tampas), `conferirMalha(fechada:
    true)` verde, e a área das duas tampas contra a série medida (raio 1, θ=90°:
    n=1 0,500000000; n=2 0,292893219; n=3 0,250000000; n=4 0,234633135). GATE: os
    três verdes.
21. **A PROVA EM PRODUTO: o `freio-disco` reescrito de propósito.** ENTRA: três
    coisas na mesma peça, e é o único commit da rodada que muda hash de peça
    antiga. (a) filete nas arestas da ponte, das garras e das orelhas do suporte,
    com `pincaQuebra` declarado como PARAM e com valor ABAIXO de 0,005657 (o teto
    que a guarda impõe, `chanfro·√2`, e `pincaChanfro` é 0,004). (b)
    `segmentosCurva` maior que 1 nesses filetes, que é o A-36 em produto e é o
    cruzamento com o A-37 numa peça de verdade. (c) o flange por
    `lados: { desvio: 'acabamento' }`, com `acabamento` em TOPO, que é o A-34 em
    produto e é a superfície que o registro do A-34 lia errado. Se o desenho
    pedir raio maior, o que muda é `pincaChanfro`, não a guarda. FECHA: a peça
    sai de 498 V / 508 F e a contagem nova é declarada, junto com a flecha do
    flange antes (0,9992 mm) e depois. GATE: os três verdes, com `freio-disco`
    nomeado no commit como peça reescrita de propósito, e o diff do gabarito
    mostrando só ele mudando. **Deste commit em diante a rodada tem prova em
    produto para A-34, A-36 e A-37.**
22. **F4 fatia 4 — `tampa` no contrato.** ENTRA: `validar` aceita a chave, recusa
    palavra fora de `'inicio'`/`'fim'` com mensagem própria, e recusa `painel` e
    `tampa` juntos; `resolver` ganha o ramo curto e o apêndice. FECHA: P14, P15 e
    P20. O P20 é a recusa 11 do A-37, que o projeto lista e nenhuma afirmação
    cobria: um passo consome a face da tampa, e a citação `tampa:'inicio'` depois
    dele grita com o texto de `conferirConsumo` casado e 0 V / 0 F no bloco. Sem
    ele, citar tampa comida devolve seleção vazia, que é o no-op silencioso que o
    `CLAUDE.md` proíbe. GATE: os três verdes.
23. **F4 fatia 5 — a varredura vira teste.** ENTRA: nenhum código. FECHA: 84 a
    2V/1F, 12 a 3V/2F, 280 a 4V/3F, 32 gritos de dobra de 180°, 0 regressões,
    `conferirMalha` com `fechada: true` nos 376. Mais P12 (teto de planaridade,
    6,596e-3) e P13 (piso de triângulo, 1e-9). Medido: a varredura custa 0,15 s e
    cabe na suíte. GATE: os três verdes.
24. **F4 fatia 6 — a peça.** ENTRA: `_mordente-de-morsa.js` (família ferramenta,
    `chamferBox` com filete nas quatro arestas do topo, `segmentosCurva` maior que
    1 em pelo menos DUAS delas, painel de uma cor e as tampas de outra, citadas
    por `tampa:'inicio'` e `tampa:'fim'`), o teste de integridade dela e
    `npm run mapa`. Gabarito não regravado. FECHA: a tampa citável por nome nas
    duas pontas, e o custo fechado nas duas topologias: ponta simples
    `nV = 2n`/`nF = n`, as duas pontas compostas `nV = 2n+2`/`nF = n+2`. GATE:
    como a fatia 8.

#### Acervo, documentação e olho (F5)

25. **F5 commit A — o gabarito das quatro peças novas.** ENTRA:
    `npm run gabarito:selecao`. FECHA: o diff conferido a olho, 28 linhas antigas
    idênticas, 4 linhas novas nomeadas, 1 `hashTotal`. GATE: os três verdes,
    agora com 32 peças e sem `--novas`.
26. **F5 commit B — `ATRITOS-AUTORIA.md`.** ENTRA: A-30, A-36 e A-37 fechados;
    A-33 e A-34 reescritos; A-38 a A-44 abertos nos números alocados. Junto, as
    quatro correções de texto medidas: a face 22001 vira 26001 (linha 35) e a
    tabela do A-33 (linha 131) sai com a varredura refeita. GATE: os três verdes.
27. **F5 commit C — `SKILL.md` e `docs/uso/oficina-contrato.md`.** ENTRA: a linha
    do `filete`, que HOJE NÃO EXISTE em nenhum dos dois, mais as três linhas de
    `lados` e a do `furo`. GATE: os dois `✗` de manifesto somem de
    `npm run criar -- _caixote-filetado`. Medido hoje, o comando reprova por
    QUATRO motivos, não um: `25 órfão(s)` de alias inexistente,
    `op(s) no núcleo SEM doc na skill: filete`,
    `op(s) no núcleo SEM linha FEITO em docs/uso/oficina-contrato.md: filete` e
    `distancia-paleta`, mais um `sem gabarito (IoU)` que não é reprovação. O
    primeiro é do `criar` e o commit 2 já o pagou. O da paleta fica FORA, declarado,
    e vira A-45; o gabarito de silhueta não é reprovação e continua sendo eixo não
    verificado.
28. **F5 commit D — os documentos de rumo e a prancha.** ENTRA: `PLANO.md`,
    `INDEX.md`, `UPSTREAM-NOS.md` (com `lequeDoVertice`, o filete de n painéis,
    `ladosPorDesvio`, o despachante de ordens de ponte e a quinta propriedade da
    conferência como capacidades candidatas), `PRANCHA-FREIO-DISCO.md` (que diz
    "180 faces" na linha 55 e na linha 211, e a pinça filetada muda esse número),
    `_tampa-de-caixa.js` 31-37 (que declara como limitação da linguagem o que
    esta rodada paga), e o esqueleto de `PRANCHA-CICLO6.md`. GATE: `mapa:check`,
    `docs:toc:check` e `docs:links:check` verdes. A prancha entra AQUI, e não no
    fim, para passar pelos três checks de documentação.
29. **F5 commit E — o olho, e ele não é opcional.** ENTRA: as fotos dentro de
    `PRANCHA-CICLO6.md`. GATE: a prancha, com o COMANDO completo e a URL de cada
    foto, e a frase do que se procurava e do que se viu. Testes verdes não
    substituem isto.

### Ciclo 6 — o gate da rodada

**Linha de base, medida neste repositório.**

- `npx vitest run`: 27 arquivos, 806 testes, 4,62 s de duração reportada e 5,48 s
  de relógio. `oficina.test.ts` sozinho: 454 casos em 1,74 s.
- `npm run gabarito:selecao:check`: 28 peças byte-idênticas, 0,42 s. Com uma peça
  nova no diretório ele sai com EXIT 1 e a linha `peça NOVA desde o gabarito`.
- `npm run id-cru:check`: 0 id cru fora da lista, 13 peças herdadas, 8 244 ids
  congelados, 0,31 s.
- `mapa:check` 0,20 s; `docs:toc:check` 0,22 s; `docs:links:check` 0,27 s. Com um
  arquivo novo, `mapa:check` FALHA na linha 8: 219 arquivos contra 220 esperados.
- Acervo: 28 peças com PASSOS, 6 com casca aberta por escolha (`_corrimao` 8
  arestas sem par, `_jardineira` 16, `_primitivas` 16, `_vao-e-anteparo` 8,
  `roda-dianteira` 144, `roda-dianteira-realista-experimento` 264).
- Peças que a rodada toca: `freio-disco` 498 V / 508 F / 956 tri;
  `_caixote-filetado` 656 V / 679 F / 1 304 tri; `_tampa-de-caixa` 184 V / 253 F;
  `_prateleira-furada` 112 V / 116 F.
- Valências, medidas: `chamferBox` 1×1×1 de chanfro 0,1 tem 24 V, TODOS de
  valência 4 (ponta composta). Cilindro de 6 lados tem 12 V, todos de valência 3
  (ponta simples). Cubo tem 8 V, todos 3. Cone de 6 tem 6 V de valência 3 e 1 de
  valência 6.
- Cubo lado 1 + filete raio 0,1, hoje: 10 V / 7 F, 16 triângulos, bloco V
  `{1000, 1001}`, bloco F `{1000}`. `V1000 = [-0.5, 0.9, 0.5]`,
  `V1001 = [0.5, 0.9, 0.5]`, `V7 = [-0.5, 1, 0.4]`, `V6 = [0.5, 1, 0.4]`;
  `F1 = [7,6,5,4]`, `F3 = [2,1,5,6,1001]`, `F4 = [3,2,1001,1000]`,
  `F5 = [0,3,1000,7,4]`, `F1000 = [1000,1001,6,7]`. Ângulo do painel com a normal
  do topo: 45,000000°.
- **O raio sem guarda, mesmo cubo, medido no NÚCLEO E no ADAPTADOR.** Todos
  constroem com 10 V / 7 F e 0 órfão, e é aí que a leitura antiga parava. Com o
  adaptador, o menor triângulo relativo (escala = maior |v| da peça) é: 0,1 →
  3,0000e-2; 0,5 → 8,3333e-2; 0,6 → 8,0000e-2; 0,9 → 3,0000e-2; 0,99 →
  3,3000e-3; 0,999 → 3,3300e-4; 0,9999999 → 2,9802e-8; 0,99999999 → 0, com 4 de
  16 triângulos de área EXATAMENTE 0; 5,0 → 2,3256e-2, e a peça é lixo. Em 1,0 e
  em 1,1 o ADAPTADOR LANÇA (`face 1 é degenerada` e `face 3 não fecha em
  orelhas`). Em 2,0 a conferência de HOJE já reprova, na segunda propriedade, com
  2 bicos. A fronteira exata da quinta propriedade: 0,99999998509883869 passa com
  4,9671e-9, e 0,99999998509883881 reprova com 0.
- Filete em aresta não-reta JÁ constrói hoje, endereçada por identidade:
  `{op:'cilindro', id:1, lado:0}`, `aresta: 0`, raio 0,05. L=3 sai 8V/6F, L=6 sai
  14V/9F, L=8 sai 18V/11F, todos com 0 órfão.
- Filete no acervo: 5 chamadas em 2 peças, TODAS a θ = 90,000000°. Folga mínima
  do recuo: 5,600× no `freio-disco`, 8,000× no `_caixote-filetado`.
- Piso de triângulo do adaptador no acervo: 7,1092e-6 em `_corrimao`, com
  `escala` = maior |v| da peça. Nenhuma das 28 abaixo disso. Em valor absoluto o
  piso é outro: 6,0289e-7 em `_tampa-de-caixa`. A definição vai ao lado do
  número, sempre.
- Clamp da casa: `Math.max(1, 4294967296 | 0)` devolve **1**;
  `Math.max(1, Math.trunc(4294967296))` devolve 4294967296. `cilindro` com
  `lados: 4294967296` constrói com 3 lados, 6 V e 5 F, em silêncio. São 9 sítios,
  não 4: `lados` em 1780, 1824, 1857, 2063, 2270 e 3385; `segmentosCurva` em
  2083, 2271 e 2529. `BLOCO` é 1000.
- Não-finito LANÇA, não grita: `raio: NaN` e `raio: Infinity` num `furo` saem com
  `oficina: valor numérico não-finito: NaN`, sem órfão nenhum. `raio: -1` e
  `raio: 0` gritam normalmente.
- Armadilha de double: `Math.tan(Math.PI/4)` é 0.9999999999999999.
  `0.5 - 0.1` é `0.4`; `0.5 - (0.1/tan)` é `0.39999999999999997`. O gabarito
  serializa com `toFixed(9)` e funde os dois em `"0.400000000"`. Medido no
  `freio-disco`: das 1 436 coordenadas não-nulas, 1 436 (100%) ficam com a MESMA
  string depois de mudar 1 ulp. O gabarito não protege caminho de double.
- `criar.mjs:57` chama `nucleo` com CINCO argumentos e derruba `mod.ALIASES`.
  `gabarito-selecao.mjs:80` passa o sexto. Por isso `npm run criar` vê 25 órfãos
  de alias numa peça que o gabarito constrói com 0.
- Buracos de teste: `grep 'além das duas' tools/ src/` dá 0. Nenhum teste compõe
  filete com filete. `tools/mecanifica/freio-disco-integridade.test.ts` tem 21
  casos e nenhuma asserção sobre os 4 filetes da peça.
- Varreduras pesadas: 408 pares do filete 0,15 s (cabe na suíte); 8 075 figuras de
  furo 233,6 s; 14 212 figuras do A-33 292,7 s (as duas últimas NÃO cabem).

**As condições.**

**1. Aditivo em hash, ao fim de cada fatia.** MEDE: `gabarito:selecao:check` mais
`git diff tools/bancadas/gabarito-selecao.json` lido linha a linha. Nas fatias que
não criam peça, 28 hashes idênticos. Nas que criam, `--novas=<a peça>` com exit 0
e as 28 antigas idênticas. O gabarito termina a rodada em 32 entradas, com o
`freio-disco` mudando de hash no commit 21. REPROVA: um dos 28 hashes mudar sem a
peça ser nomeada no commit; um commit que declare 1 linha e mude 2; usar
`--novas` para esconder peça que não é nova.

**2. Aditivo em double, porque o hash não prova.** MEDE: duas coisas, e a segunda
é nova. (a) teste com literais gravados e `toEqual` sobre o cubo com `raio: 0.1`,
com os nove valores da linha de base. O comentário do teste diz por que
`raio: 0.1` e não `0.05`. (b) `neutroCanonico` GRAVADO como literal para o
caminho do FURO, capturado ANTES do commit 4: os 8 canons da família de simetria
(commit 2) mais o `PLACA({...PASSANTE, lados: 6})` da afirmação 5 do A-34. Depois
do commit o valor "antes" não existe mais. REPROVA: `toBeCloseTo` em afirmação de
caminho antigo; aceitar gabarito verde como prova de que um caminho não mudou.
Medido: rotear n=1 pela fórmula do arco passa nas 28 peças E nos 806 testes, e só
cai em (a). E no `freio-disco` 100% das coordenadas sobrevivem a 1 ulp no
gabarito.

**3. Tempo, e as varreduras pesadas ficam fora da suíte.** MEDE:
`time npx vitest run` ao fim de cada fatia. Teto 8 s. Medido hoje: 5,48 s de
relógio com 806 testes em 27 arquivos. A rodada acrescenta 9 arquivos de teste e
cerca de 133 afirmações, o que projeta cerca de 7 s e deixa 1 s de folga. Toda
varredura nova é medida isolada antes de se decidir onde ela mora. REPROVA:
a suíte passar de 8 s; uma varredura de mais de 2 000 construções de furo dentro
de `vitest run`; uma varredura de amostra sem a contagem fechada no `expect`.

**4a. Cada recusa por `grita` aborta o passo inteiro.** MEDE:
`n.orfaos.length === 1` e o motivo casado com o TEXTO INTEIRO. Vale para 48 das
50 recusas novas: as 9 do A-36, 7 das 9 do A-34, 21 do A-30 e 11 do A-37. A
contagem `[...n.F.keys()].filter(f => f >= base && f < base+1000).length === 0`,
e o mesmo para V, é cobrada onde ela pode falhar: na guarda do recuo do A-36, que
lê `st.V` e pode acabar depois de algum `addV`. Nas guardas que ficam antes do
primeiro `addV` a contagem é verdadeira por construção e vai junto, mas não é a
parte viva. REPROVA: qualquer recusa que vire clamp silencioso, no-op ou meia
construção; contar V e F na peça em vez de no bloco; `toMatch` de regex curta no
lugar do texto inteiro.

**4b. As duas recusas que LANÇAM continuam lançando, e isso é declarado.** MEDE:
`raio` não-finito no `furo` e `desvio` não-finito lançam
`oficina: valor numérico não-finito: NaN`, com a string de hoje casada, e não
existe bloco em que contar V e F. Medido no núcleo sem patch: é o comportamento
herdado de `expressoes.js:15`. REPROVA: escrever `orfaos.length === 1` para esses
dois casos; consertá-los nesta rodada sem medir o efeito nas outras 7 entradas
não-finitas do repositório.

**5. As quatro propriedades, mais a quinta.** MEDE: `conferirMalha(n, { fechada:
true, rotulo: … })` em todas as figuras novas e nas peças de exercício, com a
quinta propriedade já instalada e com a definição de `escala` escrita ao lado do
piso. REPROVA: a quinta propriedade entrar DEPOIS do ramo que cria o triângulo
degenerado; a quinta propriedade entrar sem o caso vermelho do commit 1; malha
fechada mais contagem certa serem apresentadas como cumprimento desta condição.

**6. A-36: a lei do ângulo é cobrada em aresta não-reta, endereçada por
identidade.** MEDE: `segmentosCurva: 4` em cilindro L=3 (φ=120°) e L=8 (φ=45°),
com o ângulo entre a normal do painel k e a normal da face de entrada igual a
`(2k+1)·φ/(2n)`, a 4 casas. As constantes vêm da fórmula ESCRITA NO TESTE.
REPROVA: um gate que só olhe o cubo. Medido: `R = raio` em vez de `raio·tan(θ/2)`
SOBREVIVE a 90°, porque tan(45°)=1, e todo o acervo é 90°. REPROVA também: um
teste que leia C e R do próprio núcleo.

**7. A-36: a guarda do recuo pega o caso que nenhum gate pega hoje, e lê o estado
corrente.** MEDE: `raio: 5` num cubo de lado 1 GRITA; `raio: 0.9999999` constrói
e passa em `conferirMalha` com a quinta propriedade (menor triângulo relativo
2,9802e-8, 30× acima do piso); dois filetes seguidos na mesma face dão 0,073500
contra 0,076000. **A BANDA FICA DECLARADA, e a guarda não a fecha:** entre
0,99999998509883881 e 1,0, no cubo de lado 1, a guarda ACEITA e a quinta
propriedade REPROVA, porque a guarda compara `prof` com `raio` e `prof` é 1,0.
Isso não é conserto desta rodada; é limite escrito. REPROVA: uma guarda que
recuse `raio: 0.6`, que hoje constrói limpo; uma guarda que meça pelo CENTROIDE
(no cubo o centroide dá 0,5 e o contorno dá 1,0); uma guarda que leia a geometria
original da primitiva em vez de `st.V`; e escolher um valor de fronteira dentro
da banda, que é o que a versão anterior deste gate fez com 0,99999999.

**8. A-36 e A-37: a numeração e o custo são cobrados nos IDS, nas DUAS
topologias.** MEDE: com `segmentosCurva: 3` em ponta simples, os CONJUNTOS
`{1000..1005}` e `{1000,1001,1002}` mais o pareamento anel a anel; `V = 8+2n`,
`F = 6+n`, `tri = 12+4n` em n ∈ {1,2,3,4,8,16}. Com as duas pontas compostas,
`nV = 2n+2` e `nF = n+2`, e os slots das tampas nos números fixos. O estouro é
declarado por topologia: com ponta simples `2n ≤ 1000`, então n=500 constrói e
n=501 lança; com as duas pontas compostas `2n+2 ≤ 1000`, então n=499 constrói e
n=500 lança. A figura é NOMEADA em cada afirmação. E `segmentosCurva:
4294967296` LANÇA, porque a guarda `2·segs + 2 > BLOCO` roda antes de qualquer
posição ser construída. REPROVA: numerar por lado; numeração densa nas tampas;
afirmar "500 constrói e 501 lança" sem dizer em que figura; copiar
`Math.max(1, x | 0)` das outras nove ocorrências. Medido: com `| 0`,
`segmentosCurva: 4294967296` vira 1 e nenhuma guarda dispara.

**9. A-34: a derivação por desvio é a flecha CERTA, medida na malha, dos dois
lados.** A versão anterior desta condição era vazia, e isso foi medido: o
round-trip usa a MESMA função que o laço consulta, então ele fecha por construção
para qualquer flecha monótona em L. Testadas três flechas erradas nos mesmos
3 980 casos, as três saem com 0 erro de round-trip e 0 violação de minimalidade.
MEDE, no lugar disso: construir o anel com o L derivado E com L−1, medir a
ondulação nos dois NEUTROS, e afirmar `ondulação(L) ≤ desvio` E
`ondulação(L−1) > desvio`. Medido em 5 pares (raio, desvio): a flecha do meio
ângulo morre em 5 de 5 pelo lado que cabe, e a flecha da CORDA morre em 5 de 5
pelo lado do mínimo. Com a corda, `R = 0,052` e `desvio = 0,25 mm` pedem L=654 em
vez de 33, e a peça sai 19,8 vezes mais cara passando em todo o resto. O
round-trip e a minimalidade CONTINUAM no repositório, como prova do laço, e o
teste que mostra que o `ceil` cru erra 47,0% também. REPROVA: apresentar o
round-trip como prova da flecha; comparar contra `raio/2` em vez da flecha do
triângulo (medido: `flechaDoAnel(0.0065, 3) = 0.003249999999999999` contra
`raio/2 = 0.00325`); devolver L+1 no caso natural. FICA DECLARADO: a aproximação
quadrática `R·(π/L)²/2` sobrevive a este teste nos 5 pares, porque devolve o
mesmo L. Ela erra por menos de uma contagem na faixa medida.

**10. A-34: a afirmação negativa existe, é executável, e pode falhar.** MEDE:
três afirmações SEPARADAS. (a) a ondulação medida na malha é ≤ o desvio PEDIDO.
(b) a peça escrita por contagem e a escrita pela frase, com o mesmo raio e o
mesmo acabamento, saem com a MESMA contagem de faces e a MESMA ondulação. (c) a
ORDENAÇÃO dentro da peça de produto: no `freio-disco` de hoje o flange (R=0,052,
L=16) tem flecha 0,9992 mm e o furo do prisioneiro (R=0,0065, L=12) tem 0,2215
mm, razão 4,511×. A afirmação é que o furo do prisioneiro NÃO é o anel mais
facetado da peça, e que a razão contra o mais facetado é ≥ 4×. Ela falha no dia
em que alguém subir os `lados` do flange ou baixar os do furo, que é o evento que
o registro do A-34 leu errado. REPROVA: escrever a condição como
`ondulação == raio·(1−cos(π/L))`, que bate a 4 casas em L = 12, 16, 20, 24 e 32
porque o anel É construído por essa fórmula. REPROVA também a versão anterior de
(c), o anel externo concêntrico com o mesmo L: ela é aritmética de polígono
regular, não chama a derivação em lugar nenhum, e daria 0 violações para qualquer
implementação.

**11. A-30: a partição destrava, com os alvos escritos, e a tabela publicada é
corrigida.** MEDE: script de bancada próprio, rodado antes e depois, com as cinco
contagens impressas e a soma conferida nos DOIS lados. Antes: OK 10 866, cruzam
1 240, não cabe 1 165, estoura 904, trava 37, soma 14 212. **O ALVO, e sem ele a
condição não mede nada:** depois, OK 10 893 e trava 10, com as outras três linhas
inalteradas. E na faixa realista (face ≥ 12 lados, furo ≥ 8 lados) das cinco
famílias de raio misto: 4 352 figuras válidas, 464 travas antes, **0 depois**.
Sobre as 11 305 válidas, no máximo 108 travas contra 2 981 de hoje. Dentro da
suíte fica uma AMOSTRA NOMEADA: as 37 combinações que travam hoje mais as 8 que
saem de `AINDA_TRAVA`, com a contagem fechada de quantas saem inteiras e quantas
gritam. Medido: 45 figuras de furo cabem folgadas no teto de 8 s. A tabela de
`ATRITOS-AUTORIA.md` linha 131 diz 10 758 e as cinco linhas dela somam 14 104.
Ela erra em 108 e tem de ser reescrita. REPROVA: uma combinação que hoje sai
inteira passar a gritar; a soma não fechar em 14 212 nos dois lados; publicar a
tabela nova sem dizer que a antiga estava errada; deixar a varredura inteira
dentro de `vitest run`; entregar sem a amostra nomeada, e com isso deixar
`ordensDePonte` sem gate para a próxima rodada.

**12. A-30: o grupo se nomeia, com os números, e a citação por nome não vira
índice.** MEDE: na flange com 4 parafusos, `grupo:'passagem'` resolve 36 faces e
`grupo:'parafusos'` resolve 144; a interseção dos dois é vazia;
`{grupo:'parafusos', parede:0}` resolve 4. Com 6 parafusos, a MESMA citação
resolve 216, sem trocar uma letra. Anéis de raio declarado igual mantêm a ordem
de declaração. `id-cru:check` verde. REPROVA: endereçar grupo por índice; chave
de ordenação derivada de ponto flutuante (medido: o raio MEDIDO do anel reordena
anéis iguais por último bit e quebra [6,8,8] com bytes diferentes); acrescentar
`grupo` a `chaves` sem corrigir o `msg`. Medido: montar `grupos` com o índice do
ITEM antes da expansão do círculo faz `grupo:'parafusos'` devolver 36 em vez de
144, e "resolve o conjunto certo" não separa 36 de 144.

**13. A-30: o custo do furo é fórmula fechada, em cinco desenhos.** MEDE:
`nV = 2·L·M` e `nF = 3·L·M + 2·(n + 2M − 2)` para (parafusos, ladosFace,
ladosFuro) em {(3,12,8), (4,16,12), (5,16,12), (6,24,16), (8,32,16)}; e no cego
`nF = M·(2L+1) + (n_e + 2M − 2)`, conferido em 48 V / 59 F. REPROVA: declarar só
o 120 V / 228 F da flange. A mutação que isso mata é calcular `nF` à mão em vez
de somar os preenchimentos reais, e ela só aparece com M = 1. A flange tem M = 5.

**14. A-37: a varredura de 408 pares, contra a linha de base.** MEDE: a varredura
vira teste com as contagens fechadas declaradas (84 a 2V/1F, 12 a 3V/2F, 280 a
4V/3F, 32 gritos de dobra, 0 regressões) e `conferirMalha` com `fechada: true` nos
376. REPROVA: qualquer um dos 84 que constroem hoje deixar de construir ou mudar
de custo; algum dos 292 continuar gritando por ponta complexa; a varredura passar
sem a contagem fechada.

**15. A-37: o volume tirado é a cunha, nenhum vértice antigo se move, e a tampa é
o polígono de n+2 cantos.** MEDE: volume do neutro antes e depois por soma de
tetraedros; comparação bit a bit da posição de todo vértice anterior; área de cada
face do leque antes e depois. No caso do atrito: 2,54558e-4 contra 2,545584e-4,
erro relativo abaixo de 1e-5. A ÁREA DA TAMPA é medida contra a SÉRIE, não contra
`0,5·r²·senθ`: com raio 1 e θ=90°, n=1 0,500000000; n=2 0,292893219; n=3
0,250000000; n=4 0,234633135; n=64 0,214680687, tendendo a 1−π/4 = 0,214601836.
REPROVA: um desenho que tire 39% a mais; uma face vizinha que o autor nunca
nomeou CRESCER de área; qualquer variante que mova `v0` no ramo composto; a tampa
triangular `[P1, P0, v0]`, que com n painéis deixa n−1 arestas sem par por ponta
composta; e afirmar `0,5·r²·senθ` para n ≥ 2.

**16. Determinismo, e nada de transcendental no arquivo salvo.** MEDE: cada forma
nova roda duas vezes e dá `neutroCanonico` byte-idêntico, com `===` de string:
`segmentosCurva: 8`, `lados: {desvio}`, `centros` com raio por grupo, e o filete
de ponta composta. Nenhuma chave de ordenação usa `Math.hypot` nem `sqrt`, porque
a precisão de `Math.hypot` é definida pela implementação em ECMAScript. `grep`
por `Date.now`, `Math.random` e literal transcendental nas peças novas. REPROVA:
uma peça de exercício com coordenada calculada à mão; um cache de contagem por
`origemId` entre execuções; `Math.hypot` na segunda ordem de ponte.

**17. As medidas que não podem falhar estão nomeadas, e cada uma tem substituta.**
O ciclo 5 mediu a distância dos vértices ao centro do arco, que é exata por
construção e dá 0,000000% até com um segmento. Quatro condições desta rodada
repetem a forma e as quatro são reescritas. (a) A-34 "a flecha é conferida na
malha": substituída pelo teste de duas bordas da condição 9. (b) A-34 "um anel
externo com o mesmo L é mais ondulado": substituída pela ordenação dentro da peça
de produto, condição 10(c). (c) A-36 A4 "todo ponto novo está no arco": só vale se
C e R forem recalculados NO TESTE, e a afirmação forte é a de tangência exata
contra os dois pontos que o corte de um painel já usa. (d) A-37 "a tampa é
exata": `normal·e = ±1` e a fórmula de área não podem falhar sozinhas; o que pode
falhar é o SINAL, o canto deslizado pela aresta intermediária, e a CONTAGEM de
cantos da tampa. MEDE: antes de escrever cada afirmação, perguntar qual mutação a
mata. REPROVA: uma afirmação cuja mutação de morte não esteja escrita ao lado; uma
afirmação que compare a saída do núcleo com a mesma fórmula que a produziu.

**18. Mutação relatada, e os três buracos medidos são fechados.** MEDE: tabela de
mutação por afirmação no relato, mais os três buracos fechados por teste nomeado,
no commit da fatia que toca a região. Os três: nenhum teste dispara o grito de
ponta complexa; nenhum teste compõe filete com filete; o teste de integridade do
`freio-disco` não tem asserção sobre os 4 filetes da peça. REPROVA: entregar o
código com os três buracos abertos; esconder um sobrevivente; dizer "a suíte está
verde" sobre uma região que medido não tem teste nenhum.

**19. O repositório para de mentir, na mesma rodada.** MEDE: diff de comentário
linha a linha, com os três verdes e nenhuma linha executável mudada nas fatias de
texto, mais `mapa:check`, `docs:toc:check` e `docs:links:check`. Os SETE textos
errados: `_caixote-filetado.js` 22-23 (`12V/9F`, medido 10V/7F); `oficina.js`
3691-3699 e 3722-3728 (a causa errada e o escopo vencido); `oficina.js` 7-10 (o
cabeçalho diz que mudar `raio` não renumera, e com `lados: {desvio}` ele passa a
renumerar); `_tampa-de-caixa.js` 31-37 (declara como limitação da linguagem o que
esta rodada paga); `ATRITOS-AUTORIA.md` linha 35 (face 22001, medido 26001) e
linha 131 (OK 10 758, medido 10 866); `PRANCHA-FREIO-DISCO.md` linhas 55, 57 e
211 (180 faces, e a pinça filetada muda o número). REPROVA: entregar o código sem
reescrever o atrito. O repositório ficaria com a medição no código e a lenda no
documento, que é exatamente como o A-34 nasceu apontando para a superfície errada.

**20. Provado em peça de exercício não automotiva E em peça de produto.** MEDE:
quatro peças de exercício, uma por frente, cada uma com teste de integridade
próprio em `tools/mecanifica/` e com `conferirMalha` chamado:
`_flange-de-tubulacao` (A-30), `_gabarito-de-furacao` (A-34), `_cabo-sextavado`
(A-36) e `_mordente-de-morsa` (A-37). Peça de produto: UMA, o `freio-disco` do
commit 21, e ela carrega TRÊS das quatro capacidades: o flange por desvio
(A-34), os painéis (A-36) e a ponta composta (A-37). **A-30 sai sem prova em
produto, e isso é declarado com o motivo:** nenhuma peça de produto de hoje pede
dois diâmetros de furo no mesmo passo, e a peça que pediria (a flange do freio)
já foi resolvida por outro caminho no ciclo 4. REPROVA: quatro peças de exercício
e nenhuma de produto; uma peça de exercício com palavra automotiva no nome, na
parte ou no grupo; uma peça nova sem teste de integridade; declarar "provado em
produto" para o A-30.

**21. O olho, em dois enquadramentos por peça.** MEDE: `PRANCHA-CICLO6.md`, com o
COMANDO inteiro, a URL, e uma frase dizendo o que se procurava e o que se viu.
Medido: `npm run bancada` roda headless e imprime a URL, mas AVISA que `--focar`
não entra nela. Então a foto de perto é registrada pelo comando, não só pela URL.
A seleção é por PARTE (`--selecionadas=pinca`), não por alias. `--projecao`
aceita `perspectiva` e `ortografica`. `--geo=flat` não existe na bancada; ele é de
`npm run peca`. As fotos obrigatórias:

- `_cabo-sextavado` de longe, com `segmentosCurva` 1 e 3 no mesmo quadro. Procura:
  se 3 painéis LEEM como arredondamento e 1 lê como chanfro. Se os dois quadros
  lerem igual, a rodada entregou custo sem leitura, e isso vai no relato mesmo com
  todos os testes verdes.
- `_cabo-sextavado` de perto da quina. Procura: faceta entre os painéis e degrau
  nas pontas do arco.
- `_mordente-de-morsa`, dois enquadramentos, um deles em `npm run peca --
  _mordente-de-morsa --geo=flat`. Procura: se a tampa de canto aparece, e se ela
  aparece diferente nas arestas de n=1 e nas de n maior.
- `_flange-de-tubulacao` em superior, isométrica e frontal, mais um enquadramento
  de perto da boca da passagem. Procura: se a partição aparece como faceta na
  chapa.
- `_gabarito-de-furacao` em vista direita e isométrica. Procura: se os dois furos
  de mesmo raio e mesmo acabamento, um por contagem e outro pela frase, leem
  iguais na silhueta.
- `freio-disco --selecionadas=pinca --modo=isolar --focar`, isométrica e vista
  direita, antes e depois no mesmo quadro. Procura: se a pinça deixa de ler como
  caixa de aresta viva.
- `freio-disco --selecionadas=cubo --modo=isolar --focar --projecao=ortografica`,
  vista direita de perto, antes e depois. Procura: contar as quinas do flange no
  mesmo quadro em que o furo do prisioneiro aparece. É a foto que corrige o
  registro do A-34, e agora ela também mostra o flange de 16 lados virando 33.

REPROVA: uma frente entregue só com número; uma URL registrada como evidência de
enquadramento de perto; uma foto sem a frase do que se procurava.

**22. A ordem dos merges é a que foi medida.** MEDE: `git log --graph`. A trilha
do furo mergeia antes do commit 21, porque o `freio-disco` daquele commit precisa
de `lados: {desvio}` e de `filete` com painéis ao mesmo tempo. F3 fecha antes de
F4 começar. E depois de todo merge que toque `oficina.js` entre 3690 e 3880,
rodar `grep -n 'terceiraFace' prototipos/fps/v3/motor/oficina.js` e conferir que
ela sumiu. REPROVA: um merge automático que ressuscite `terceiraFace`, que medido
nenhum teste do repositório pega, porque `grep 'além das duas' tools/ src/` dá 0.

### Ciclo 6 — riscos, e o que fazer com cada um

**1. Perda de trabalho por contêiner reciclado. Já aconteceu neste
repositório**, e está no log: `a0e341d Ciclo 5, metade 2: o núcleo do filete
seletivo (resgatado do agente morto)`. Três branches órfãs continuam no disco, em
branches LOCAIS sem push. O QUE FAZER: commit de trabalho a cada 20 minutos,
mesmo sem fatia fechada, com prefixo `wip:` na branch da frente, e PUSH junto.
Sem push o commit não protege de nada. O orquestrador esmaga os `wip` no merge.

**2. A rodada não caber na janela.** Medido: o ciclo 5 fez 11 commits e 1 348
inserções em 97 minutos, e um agente morreu dentro. 29 commits pela mesma taxa dão
cerca de 5 horas. O QUE FAZER: a linha de sobrevivência está declarada na seção
das frentes. Depois do commit 13 a trilha do furo já é uma entrega inteira.
Depois do commit 21 a rodada tem prova em produto para três dos quatro atritos.
Se a interrupção cair entre 14 e 20, o que se salva é o teste vermelho commitado,
e o fechamento diz que a rodada entregou o furo e não o filete. Isso é
interrupção declarada, não rodada reprovada em silêncio.

**3. O F0b morrer, porque ninguém enxerga o valor dele no diff.** Ele é
refatoração sem mudança de comportamento, então é a fatia mais fácil de perder
inteira e a mais chata de refazer. O QUE FAZER: ele é a TERCEIRA coisa a entrar,
ele é pequeno, ele commita com o gabarito das 28 peças como prova, e ele é o
PRIMEIRO commit com push obrigatório. Se mesmo assim ele se perder, F3 e F4
voltam a colidir em 2 hunks, e o conflito cai exatamente no lugar onde o ciclo 5
já se queimou. Nesse caso, refazer o F0b antes de tocar em qualquer código do
filete. Nunca resolver esse merge à mão.

**4. A colisão de slot `b+2`/`b+3` aparecer só na peça de produto.** Com n=1 as
duas numerações coincidem, e com ponta simples as tampas não existem. Só o
cruzamento (n≥2 sobre `chamferBox`) a expõe, e medido que nenhuma figura dos dois
projetos o alcança: `chamferBox` tem 24 vértices, todos de valência 4, e o
cilindro de 6 lados tem 12, todos de valência 3. O QUE FAZER: a numeração se
decide no F0b, com os slots FIXOS e o buraco escrito, antes de qualquer código. E
o cruzamento vira afirmação na fatia 20, com a figura nomeada. Se a numeração não
estiver decidida quando a fatia 20 começar, PARAR e decidir primeiro.

**5. `pincaQuebra` não caber.** O A-37 declara o PARAM e nunca lhe dá valor. A
guarda do A-36 impõe teto `chanfro·√2`, que é 0,005657 m na ponte e na garra e
0,004243 m no suporte. O QUE FAZER: escolher `pincaQuebra` abaixo do teto. Se o
desenho pedir mais, mudar `pincaChanfro`, nunca afrouxar a guarda. A guarda também
NÃO recusa a figura sintética do A-37: `chamferBox` 1×1×1 de chanfro 0,1 com raio
0,03 tem teto 0,141421, e 0 de 96 pares foram recusados.

**6. O `desvio` mentir em silêncio.** Com A-34 antes de A-30, ou com
`resolverLados` deixado na linha 3385, o L é derivado do raio do passo, e a flecha
do furo maior excede o desvio declarado em 102,5% a 113,9% na própria flange. A
peça constrói, nenhum órfão, nenhum gate cai. O QUE FAZER: manter a ordem (fatia 5
antes da fatia 10) e travar a regra do MAIOR raio por teste próprio, na fatia 10.

**7. A rodada sair com duas leis para a mesma palavra.** Medido: existem 9 sítios
com `Math.max(n, ... | 0)`, não 4. O A-36 decide `Math.trunc` para o filete e
trava por teste. O QUE FAZER: nivelar os TRÊS que o A-34 já reescreve (1780,
1857, 3385) dentro das fatias 10 e 11. Medido: custo zero, 28 byte-idênticas e
806 verdes. Os seis que sobram vão para o A-40, com o número escrito.

**8. As duas fatias que passam de 30 minutos.** São a 14 (o laço de n anéis, 16
afirmações, Gram-Schmidt) e a 20 (a ponta composta, 9 afirmações, slots fixos, a
tampa de n+2 cantos e o espelho). O QUE FAZER: quando a fatia não fecha em 20
minutos, parte em dois commits. Primeiro o teste, commitado VERMELHO com
`it.fails` e um comentário do que ele espera. Depois o código que o torna verde.
O teste vermelho commitado é trabalho salvo, e é a parte que custa mais a refazer.
Isso vale para QUALQUER fatia que passe de 20 minutos, não só para essas duas.

**9. Os números medidos se perderem.** Uma fatia de código se reescreve em uma
hora. A medição que a sustenta custa a sessão inteira: 408 pares varridos, 14 212
combinações do A-33, 24 000 round-trips de desvio, 60 000 amostras de
minimalidade, a decodificação de pixel da foto do A-34. O QUE FAZER: todo número
medido entra no corpo da mensagem de commit ou no comentário do teste, NO MESMO
COMMIT em que foi medido, em TODAS as 29 fatias. Nunca só no relatório final,
nunca só no chat.

**10. O F5 morrer no meio.** O commit 25 regrava quatro peças de uma vez, e
`gabarito:selecao:check` fica vermelho até ele fechar. O QUE FAZER: as quatro
peças novas passam por `--novas` desde que nascem, então o gate delas é real
antes do 25. O commit 25 nomeia no corpo a lista exata de linhas que o diff pode
ter: 28 antigas idênticas, 4 novas, 1 `hashTotal`.

**11. A inspeção visual não acontecer.** Os quatro projetos são headless de ponta
a ponta, e três deles existem por causa do que o cliente vê. O A-36 escreve na
cara: nenhuma medida dele responde se um filete de 3 painéis com raio 12 mm
continua lendo como chanfro. O QUE FAZER: o commit 29 é o único que não tem
substituto automático. Se a rodada acabar sem ele, ela entrega quatro capacidades
provadas por número e nenhuma provada por olho, contra o que o `CLAUDE.md` exige.

### Ciclo 6 — o que fica aberto ao fim

**Atritos que a rodada abre, com número já alocado.**

- **A-38** — a quina viva do aro do furo, e a op `quebra`. Projeto pronto e
  protótipo medido, com a esquadria no lugar da bissetriz (no cubo a diferença é
  29%, não 3%).
- **A-39** — a terceira face do filete sai não-plana quando ela não é
  perpendicular à aresta. Medido no núcleo de HOJE: 1,4642e-2 no prisma
  triangular. O arco piora 7,1% no pior caso (n=64), não muda a classe. O conserto
  muda a posição de P1/Q1, logo não é aditivo.
- **A-40** — contagem fora de faixa é presa em silêncio em seis sítios que a
  rodada não reescreve. `4294967296 | 0` é 0, e o valor vira 1, pulando qualquer
  guarda de estouro.
- **A-41** — a resposta do filete passa a depender da TESSELAÇÃO da vizinhança.
  Cilindro de 8 lados, raio 0,001: vizinha inteira tira 9,0436e-5; vizinha partida
  por um furo longe tira 1,9134e-7, 472 vezes menos. Consertar exige dar tampa
  também à ponta simples, o que quebra a byte-identidade das 28 peças.
- **A-42** — o volume do sólido desenhado não é único quando uma face vizinha
  entorta. Esfera 8×4 com raio 0,01: a MESMA malha dá volumes entre 0,402363067 e
  0,402379759 conforme o canto em que a triangulação começa.
- **A-43** — `segmentosCurva: {desvio}` no filete. A rodada dá unidade a `lados`
  e não a `segmentosCurva`, que é a mesma incomparabilidade que fez o A-34 nascer
  errado. O projeto está pronto e a função geral `flechaDoArco(R, φ, n)` já nasce
  na fatia 9 na forma que ele precisa.
- **A-44** — a divergência de vocabulário do filete. `raio` é o RECUO no filete e
  É o raio do arco em `arcoDeConcordancia` (1676); a 90° ninguém percebe, e com
  φ=60° o autor escreve 0,012 e o arco tem R = 0,0208. E `segmentosCurva` tem
  padrão 1 no filete e 8 em `lathe`, `loft` e `inflate`. Nenhuma das duas é
  consertável sem quebrar as 28 peças.
- **A-45** — `npm run criar` reprova por motivo que não é da peça. Depois do
  commit 2 e do commit 27 sobra `distancia-paleta`, com 1 430 920 pixels em 3
  tons fora, numa peça que passa em todo o resto.

**Atritos que continuam abertos, menores.**

- **A-33** — a partição do furo. Encolhe de 37 para 10 casos em 14 212, de graça.
  Não fecha. Os 10 sobreviventes são face de 6, 7 e 8 lados com furo de 3 a 5
  lados. Resolver de verdade pede triangulação de polígono com buracos que não
  dependa de ponte mais orelha.
- **A-35** — `segmentosCurva` é por passo, não por concordância. A rodada não o
  toca. E ela cria um vizinho: se um dia o filete de LOOP existir,
  `segmentosCurva` no nível do passo passa a valer para as L quinas do contorno do
  furo de uma vez, que é o A-35 reproduzido numa op nova.
- **A-15** — a Oficina continua sem emitir `segmentosCurva`, `lados: {desvio}`,
  grupo com nome e `tampa`.
- **A-1** — `--focar` não entra na URL da bancada.

**O que a rodada não mediu, e é declarado.**

- Se o filete de vários painéis LÊ como arredondamento. Nenhum número responde
  isso. A condição 21 pede a foto.
- A banda entre 0,99999998509883881 e 1,0 no cubo de lado 1, em que a guarda do
  recuo ACEITA e a quinta propriedade REPROVA. A guarda compara `prof` com `raio`
  e não conhece a resolução do double. Fica escrito, não consertado.
- O número derivado do `lados: {desvio}` não aparece em lugar nenhum. O autor
  escreve o desvio e não vê o L. Quando o raio muda e o L novo é MAIOR, uma
  citação `borda: 12` que apontava para uma face continua dentro da faixa e passa
  a apontar para OUTRA face, sem grito. Só a citação que SAI da faixa grita
  (medido). O remédio é `npm run descrever` mostrar o L, e ele não entra.
- `oficina.js:4040` faz `const dict = { ...PARAMS, ...TOPO }`, então o núcleo não
  tem como cobrar que o `desvio` seja declarado em TOPO. Um autor que puser
  `acabamento` em PARAMS renumera o passo sem a disciplina de TOPO. É a razão
  pela qual o item de cima é fácil de disparar.
- `raio` e `profundidade` de GRUPO nascem com o mesmo defeito de não-finito do
  `raio` do passo: LANÇAM em vez de gritar. São duas superfícies novas com um
  defeito herdado, e a condição 4b as declara.
- A ordem do PREENCHIMENTO passa a depender de qual das três tentativas de ponte
  venceu. Ninguém mediu quantas faces trocam de cantos quando a vencedora muda. O
  comentário da op diz que a posição dentro do preenchimento não é endereço
  estável, e não existe afirmação que cubra isso.
- A composição de `segmentosCurva ≥ 2` com `espelha`, `arranja` e `mescla`. As 28
  peças só exercitam n=1 nesses caminhos.
- `liso` sobre o arco e sobre a tampa. Nas pontas do arco o painel 0 encosta na
  face de entrada, e `liso` só promedia entre faces marcadas. Nenhuma peça do
  acervo com filete é `liso`.
- A guarda do recuo contra faceC e faceD. Ela cobra faceA e faceB nas duas pontas.
  Um recuo que caiba nas duas faces da aresta e ainda assim atravesse a terceira
  fica sem grito.
- Se algum dos 32 gritos de dobra de 180° DEVERIA construir. Uma parede de furo
  com diedro quase raso pode ser alvo legítimo de filete de raio pequeno.
- Erro de unidade de 10×. O grito da flecha do triângulo pega o de 1000×.
  `desvio: 0.002` num raio de 0,0065 dá L=4 sem grito nenhum.
- A aproximação quadrática da flecha sobrevive ao teste de duas bordas nos 5 pares
  medidos, porque devolve o mesmo L. Ela não é a fórmula certa, e o teste não a
  separa da certa na faixa medida.
- A fronteira do A-33 com `lados` derivado alto. A varredura cobre furo de 3 a 24
  lados; um L derivado sobe a 79 no freio e a 333 num furo de anel único.
- Figura com quatro ou mais tamanhos de furo no mesmo passo. As famílias medidas
  param em três. E duas das cinco famílias do T28 (tampo de mesa e base de
  ferramenta) caíram por orçamento de commit, não por geometria.
- O custo de tempo em peça grande. `lequeDoVertice` é O(k·F) por ponta, e a maior
  peça medida tem 1 600 faces.
- O efeito da rodada sobre as 6 peças de casca aberta, peça a peça. Que nenhuma
  delas seja alcançada é dedução, não medição.
- O A-30 sai sem peça de produto, por escolha declarada na condição 20.

# Planos da Mecanifica

## Estado

**Plano ativo:** Nenhum.

[Esquecer precisa falhar](encerrados/2026-09-08-esquecer-precisa-falhar.md) foi
**concluído** em 2026-09-08. O veredito de contato deixou de depender da
bandeira `--estrito` e passou a ser o padrão, a montagem passou a reprovar peça
atravessando peça, a expectativa de interseção virou contrato em vez de
anotação, e a amostragem da contenção passou a incluir o centroide de cada
triângulo, o que corrigiu o rebaixamento de `interpenetram` para `encostam`
entre sólidos de lado igual.

O gate de fechamento entregou `cavalete-de-serra`, modelada por um agente sem
contexto a partir de um pedido que não citava contato nem bandeira, e ela passa
declarando os três contatos intencionais. A ferramenta não chegou a reprovar
esse agente, e o registro no plano diz por quê: ele declarou de primeira, depois
de ler uma receita que só tinha `contatos` porque a R00 os acrescentou horas
antes. O que ficou provado veio de medida direta — tirando o campo `contatos`
daquela mesma peça, o comando sai com código 1 e acusa os três pares.

A inversão do padrão também revelou dois defeitos reais no acervo, registrados e
não corrigidos: `barricada-de-sucata`, cuja receita trata `em` como canto mínimo
do cubo quando é translação de um cubo centrado, e `bicicleta-urbana`, que
mantém o tubo inferior atravessando o pneu dianteiro.

O [que nenhuma vista mostra](encerrados/2026-09-07-o-que-nenhuma-vista-mostra.md)
foi **concluído e aprovado** em 2026-09-08. Ele fechou as duas famílias de "erra
e mede limpo" que a bicicleta produziu: peça que não sai com a forma prometida, e
parte atravessando parte. Contato não declarado passou a REPROVAR com código de
saída, a forma prometida é conferida por V−E+F, os pares acusados saem como
imagem da mesma chamada, e a dica passou a aparecer uma vez e só quando se
aplica.

Nada de geometria foi escrito: o teste exato de sólido já existia dentro da
auditoria de montagem e a contagem de furo em `modulos/topologia`. O núcleo saiu
para `contato-de-solidos.js` e a auditoria de montagem caiu de 340 para 108
linhas sem mudar comportamento.

O gate de fechamento passou com quem não construiu a ferramenta: um subagente
frio recebeu *"leia as skills e o readme, modele uma bicicleta"*, sem menção a
colisão, e a peça saiu verde por estar certa — 22 contatos declarados, zero
atravessamentos. Ele ainda achou dois defeitos e corrigiu a geometria em vez de
declarar, que era o risco de projeto que mataria a porta.

O [atrito achado modelando](encerrados/2026-09-07-atrito-achado-modelando.md) foi
**concluído e aprovado** em 2026-09-07. Modelar uma bicicleta de ponta a ponta
produziu oito atritos, e **nenhum deles aparecia em gate** — os dezenove estavam
verdes antes, durante e depois. Argumento fora do contrato passou a gritar em vez
de virar translação por zero; a paleta de auditoria caiu de 43 pares
confundíveis para 4 e passou a nomear os que sobram; busca que zera diz qual
palavra a zerou; e o retrato do acervo passou a varrer as quatro pastas de
receita, não duas.

O achado que mais rendeu não estava na lista: ligar a validação expôs três
silêncios nos **próprios testes do repositório** — `esfera` com `seg`, `plano`
com `larg`/`prof`, `cubo` com `tam`. Três testes verdes medindo geometria
diferente da que declaravam.

O [parâmetro que move a peça](encerrados/2026-09-07-parametro-que-move-a-peca.md)
foi **concluído e aprovado** em 2026-09-07. Ele nasceu da pergunta "onde a IA
gasta tempo" e de uma medição que respondeu outra coisa: **dos 103 parâmetros
declarados no acervo, 13 estão vivos**. Dez das onze receitas trazem `PASSOS`
como literais fixos e `PARAMS` decorativo ao lado, e as três prensas somam trinta
e sete liberdades declaradas que não movem um vértice.

Ele deixou dois comandos. `npm run parametros` separa liberdade declarada de
liberdade real, e recusa diagnosticar receita que executa sem publicar parte, em
vez de chamar tudo de inerte. `npm run varrer` mede sensibilidade e lote sobre o
mesmo motor, com orçamento declarado, e termina com a linha de bancada que a
MEDIÇÃO escolheu — na cadeira, alterar a seção da perna não move a caixa das
pernas, move saias e travessas, e o palpite óbvio olharia no lugar errado.

A prova de campo condenou a primeira versão da própria ferramenta: o candidato
que zerava uma fresta de 14,14 mm abria quatro outras juntas, e o relatório só
contava interpenetração. Todo candidato passou a trazer quantas relações
pioraram. O A/B contra o fluxo desassistido fica pendente: quem o executar não
pode ser quem construiu a ferramenta.

A [esteira confiável para a IA](encerrados/2026-09-07-esteira-confiavel-para-ia.md)
foi **concluída e aprovada** em 2026-09-07. Ela não tocou o motor, as receitas
nem a geometria: mudou o custo de descobrir que a forma está errada. Olhar uma
peça pelo nome saiu de 63 s de timeout mudo para 3,2 s com PNG; a suíte saiu de
cinco vermelhos por privilégio ausente para zero, e parou de trocar a peça
carregada na bancada; `npm run gates` passou a rodar os dezenove e relatar todos,
em vez de morrer no segundo; as 22 citações mortas do caminho de leitura viraram
zero, com gate no CI; a leitura obrigatória caiu de 119,8 KB para 69,8 KB sem
perder lição; e a saída de `descrever` encolheu 57% mantendo todo fato de
contato.

Ela também deixou o **diário da oficina** (`npm run diario`): as ferramentas do
laço registram sozinhas onde o tempo vai e o que emperra, sem pedir relato a
quem as usa. A primeira leitura apontou `olhar-bancada` como 96% do tempo do
laço — confirmar isso numa série longa é a próxima pergunta.

A rodada R00 dela fundiu dois planos de execução que já estavam prontos e não
mergeados: a [melhoria da esteira de autoria para
IA](../../superpowers/plans/2026-09-03-melhoria-esteira-autoria-ia.md), que
entregou o endereço único de receita e a auto-ativação da sessão, e a [modelagem
da prensa hidráulica
H-frame](../../superpowers/plans/2026-09-03-modelagem-prensa-hidraulica.md), que
entregou a máquina em `maquinas/prensa-hidraulica/`. Plano de execução não é
plano executivo datado, e declará-los como plano ativo reprovava `planos:check`.

A [malha otimizada e prova por objeto](encerrados/2026-08-31-malha-otimizada-e-prova-por-objeto.md)
foi **encerrada** em 2026-09-01 com H0–H5 entregues e H6 parcial: três módulos de
saída de malha, o conferente único, o modo de auditoria visual e cinco peças no
acervo. Rastreio em [`../MALHA-OTIMIZADA-PROGRESSO.md`](../MALHA-OTIMIZADA-PROGRESSO.md).

O [laboratório computacional para investigação por
IA](encerrados/2026-09-01-laboratorio-computacional-ia.md) foi incubado neste
repositório e **encerrado** em 2026-09-03: o subsistema `laboratorio/` saiu
inteiro, com histórico, para
[`warbookbr/nos-ciencia`](https://github.com/warbookbr/nos-ciencia). A
separação é sem conhecimento em nenhum sentido — este repositório não
referencia o laboratório, e o laboratório não importa o motor de receitas.
Quem quiser cruzar as duas coisas faz isso manualmente, citando versão e
commit do lado citado. O dossiê de desenho (`DOSSIE-LABORATORIO-IA.md`) e o
relato de progresso ficam como registro histórico.

A [reorganização da documentação por uso](encerrados/2026-08-31-reorganizacao-por-uso.md)
foi **concluída e aprovada** em 2026-08-31. Ela separou a documentação por quem
a lê — [`usar/`](../usar/README.md) para quem usa o Mecanifica, a raiz de
`docs/mecanifica/` para quem o desenvolve, `historico/` e `encerrados/` para o
que já fechou — e deixou cinco gates que impedem a separação de vazar de volta.
A porta de entrada caiu de 665 para 200 linhas. O relato por fase, com as
decisões tomadas e o que foi recusado por custo medido, está em
[`../REORGANIZACAO-POR-USO-PROGRESSO.md`](../REORGANIZACAO-POR-USO-PROGRESSO.md).

**Plano congelado:** o [modelador inverso com priors por
família](congelados/2026-08-25-modelador-inverso-priors-familia.md) saiu do
caminho crítico em 2026-08-26, quando o usuário assumiu o julgamento de forma.
Não foi refutado; a pasta [`congelados/`](congelados/README.md) explica a
diferença entre congelado, cancelado e concluído, e cada plano guardado lá
declara sua condição de descongelamento.

**Concluído e aprovado:**
[`2026-08-28-exportacao-cad-step.md`](./encerrados/2026-08-28-exportacao-cad-step.md) —
entregou os módulos puros `modulos/exportador-cad/` e `modulos/exportador-obj/`,
as CLIs `npm run exportar:step` e `npm run exportar:obj` com escrita atômica, e a
ativação da bancada por sessão (`npm run ativar:bancada`).

O plano anterior de seleção foi **cancelado** antes de implementação. A
premissa “a IA compara bem” não tinha passado pelo teste repetido e embaralhado
que o próprio plano reservava para S1; o gerador manual continuava definindo o
limite da forma alcançável; e o alvo N6 não contém calibração para representar
um objeto 3D exato. A hipótese permanece no histórico, sem autorização.

O mecanismo vigente é [modelagem inversa com priors por
família](../DOSSIE-MODELADOR-INVERSO-PRIORS-FAMILIA.md). Veículos partem de
arquétipos automotivos semanticamente alinhados e deformáveis; humanoides usam
esqueleto, volumes e juntas; peças usam features e interfaces funcionais. As
famílias compartilham receitas, identidade, montagem, revisão, câmeras,
evidência e MCP, não um gerador universal.

A primeira execução é **P0, confiança antes de geometria**: fechar a suíte no
Windows, classificar cada alvo, produzir um canário calibrado e medir o crítico
em pares frios, repetidos, embaralhados e com holdout. Priors, fitting,
preferência e novo carro só abrem pelos gates cumulativos escritos antes da
implementação. O registro de falhas em
[`GOTCHAS-AUTORIA-VISUAL.md`](../usar/GOTCHAS-AUTORIA-VISUAL.md) é leitura
obrigatória antes de abrir experimento.

O [R2B com controle vertical](./encerrados/2026-08-23-redesenho-cage-r2b-controle-vertical.md)
foi concluído com decisão `interromper`: sua melhor evidência continuou
reprovada numérica e visualmente, e B2–B4 não prosseguem. Cage, métricas e
imagens permanecem como contraevidência; nada foi promovido.

A [auditoria das práticas de autoria 3D](./encerrados/2026-08-20-auditoria-praticas-autoria-3d.md)
foi concluída com decisão `corrigir`. Ela preserva a base semântica e congela
P2 e a validação integrada até uma prova privada ligar o aceite visual ao
fechamento e exercitar seções de caráter declaradas.

A [validação integrada do valor Agent-First](2026-08-20-validacao-integrada-mecanifica.md)
está **congelada em `pronto` antes de R0**. O comparativo da trava pode ser
retomado somente depois que a auditoria decidir se sua premissa e suas métricas
continuam válidas.

O plano de [autonomia verificável do Motor de Prancha](2026-08-20-motor-de-prancha-autonomia.md)
está **congelado em `pronto`**: R0–R3 foram aprovadas, R4 só prova autoria e
mutações, e impacto 3D permanece não demonstrado. R5 não executa; essa pergunta
foi transferida para a validação integrada.

O [P2 do chassi](2026-08-19-chassi-p2-prova-do-quarto.md) está **congelado no
estado `pronto`**. Suas evidências e a decisão pendente sobre a alteração local
permanecem íntegras, mas Q7 não executa enquanto a confiabilidade da prancha —
alvo e fonte de julgamento da prova — estiver sob auditoria ativa.

A [coerência entre vistas](./encerrados/2026-08-19-coerencia-entre-vistas.md) foi concluída e
fecha o motor de prancha. Ela desfez um silenciamento indevido de teste — que
sozinho já acusou quatro rodas escapando da carroceria em planta — e passou a
comparar as vistas pelos eixos que compartilham, com leitura `projecao` ou
`secao` declarada. Essa conclusão é evidência histórica; não reabre P1, cage ou
geometria antes dos gates do novo P0.

O [motor de prancha com filete e medida](./encerrados/2026-08-19-motor-de-prancha-medida.md)
foi **concluído**. Ele trocou a spline por traçado com filete, adotou âncora
proporcional e passou a emitir relatório medido da própria saída. O ganho não é
estético: o relatório pegou sozinho um arco de roda furando o capô e dez
inversões de curvatura na silhueta do P0 que ninguém tinha visto. Método
registrado na skill `desenhar-prancha`.

**Plano histórico em rascunho:**
[`2026-08-18-chassi-realista-kernel-geometrico.md`](2026-08-18-chassi-realista-kernel-geometrico.md).
Ele está em `rascunho` e não autoriza implementação. A representação então
decidida era malha de controle de quadriláteros com vincos,
avaliada por subdivisão Catmull-Clark nativa, com a malha densa como produto
compilado. OCCT/B-rep, Blender headless, SDF e kernel próprio foram rejeitados
naquele recorte. A prova do quarto, cage e `inflate` permanecem contraevidência;
nenhum deles é a próxima execução.

A [sonda da armadura humanoide tecnológica](./encerrados/2026-08-18-sonda-armadura-humanoide-1-0.md)
foi concluída com decisão `aprovar`. Ela testou hierarquia profunda,
bilateralidade, quiralidade, estados estáticos, contexto progressivo, crítica
visual estruturada e correções genéricas sem publicar geometria ou replicar
franquia. A evidência está em
[`../RELATORIO-SONDA-ARMADURA-HUMANOIDE-1-0.md`](../historico/RELATORIO-SONDA-ARMADURA-HUMANOIDE-1-0.md).

A [sonda do supercarro](./encerrados/2026-08-18-sonda-supercarro-1-0.md) foi concluída com
decisão `aprovar`; a evidência está em
[`../RELATORIO-SONDA-SUPERCARRO-1-0.md`](../historico/RELATORIO-SONDA-SUPERCARRO-1-0.md).

O [ensaio ponta a ponta da dobradiça](./encerrados/2026-08-18-ensaio-ponta-a-ponta-dobradica.md)
foi concluído com decisão `aprovar`; a evidência está em
[`../RELATORIO-ENSAIO-DOBRADICA-1-0.md`](../historico/RELATORIO-ENSAIO-DOBRADICA-1-0.md).

O plano da plataforma procedural extensível foi concluído no R10 com decisão
`aprovar`; a evidência está em `../RELATORIO-PLATAFORMA-PROCEDURAL-R10.md`.

O plano concluído mais recente foi a [auditoria de interseções em montagens](./encerrados/2026-08-18-auditoria-intersecoes-montagem.md), aprovada após integrar malha, contenção, casos inconclusivos e MCP.

O plano de desacoplamento entre núcleo, validadores, fixtures e catálogo foi
concluído com catálogo vazio e rollout coordenado com `warbookbr/mecanica`.

**Plano concluído anterior à auditoria:**
[`2026-08-17-migracao-fps-para-procedural.md`](./encerrados/2026-08-17-migracao-fps-para-procedural.md).

Ele moveu a raiz canônica para `prototipos/procedural/v3/`, preservando
comportamento, geometria e contratos, após verificar o consumidor externo.

**Plano concluído anterior:**
[`2026-08-17-correcoes-fluxo-dobradica.md`](./encerrados/2026-08-17-correcoes-fluxo-dobradica.md).

Ele corrigiu os atritos comprovados pelo estudo de dobradiça: referência
procedural, template, descrição de receita confinada, estado dos contratos e
enquadramento do visor privado. Materiais, união topológica e cinemática
continuam fora.

**Plano concluído anterior:**
[`2026-08-17-estudo-conjunto-dobradica.md`](./encerrados/2026-08-17-estudo-conjunto-dobradica.md).

O estudo criou três peças confinadas e uma montagem v3 válida, registrando nove
achados com diagnóstico causal. A decisão foi `corrigir`: a fixture passou,
mas documentação operacional e enquadramento de peças finas exigem recortes
próprios.

O plano concluído anterior foi
[`2026-08-14-revalidacao-cascata-persistida.md`](./encerrados/2026-08-14-revalidacao-cascata-persistida.md).

O plano abriu a revalidação em cascata como acréscimo sobre mapa, impacto,
revisões e transações existentes. R00–R06 foram concluídas com decisão
`aprovar`: contrato, persistência, derivação multi-raiz, resultados,
obsolescência, estudo de campo multi-raiz e consumo Agent-First estão provados.
Correção e publicação automática de dependentes permanecem fora.

O plano de
[`continuidade de autoria ativa`](./encerrados/2026-08-14-continuidade-autoria-ativa.md) foi
concluído e aprovado. Revisões imutáveis
autorizadas passam a alimentar leitura, vistas e revalidação, e o perfil de
autoria preserva as ferramentas de auditoria. Ele não abre mapa global,
correção automática de dependentes nem publicação em fontes JavaScript.

O diagnóstico técnico do motor procedural foi concluído. O relatório está em
[`../RELATORIO-DIAGNOSTICO-MOTOR.md`](../historico/RELATORIO-DIAGNOSTICO-MOTOR.md) e a
decisão final — **abrir Montagem Mínima Persistida v1** — já foi executada: o
plano está aberto em
[`2026-08-07-montagem-minima-persistida-v1.md`](./encerrados/2026-08-07-montagem-minima-persistida-v1.md).
O PR #33 que abriu o plano foi mergeado na `main`. A Montagem Mínima Persistida
v1 foi concluída no arquivo
[`2026-08-07-montagem-minima-persistida-v1.md`](./encerrados/2026-08-07-montagem-minima-persistida-v1.md).
O plano de relações locais foi concluído no R06 pelo PR #41, mergeado na `main`
no commit `e7b80ac`. As provas A–F, fixtures persistidas v2, contrato v2 e o
documento de continuidade arquitetural estão integrados. O contexto de
montagem foi concluído no R05 na branch do PR #42. A leitura e auditoria de
montagens por MCP foi aprovada no R04, com consumo caixa-preta e visão real. O
plano de materialização e autoria segura de montagens foi concluído com decisão
`aprovar`. O experimento de autoria geométrica do zero concluiu com `corrigir`.

O método, as perguntas de inspeção e o padrão de evidência usados no diagnóstico
permanecem registrados em
[`../PROTOCOLO-DIAGNOSTICO-MOTOR.md`](../PROTOCOLO-DIAGNOSTICO-MOTOR.md).

Um backlog, programa ou linha candidata não autoriza implementação automática.
Um plano só fica ativo quando tem objetivo, escopo, gates, arquivos reservados,
critério de saída e encerramento registrado.

## Execução atual

R05 do plano de relações locais registrou provas A–F com fixtures persistidas v2
e contrato canônico v2; R06 encerrou e integrou o conjunto na `main`. A Montagem
Mínima Persistida v1 foi encerrada com provas persistidas, determinismo e
contrato v1 documentado. CLI, MCP, bancada, escrita, solver e mapa global
permanecem fora do fechamento.

O contexto de montagem acrescentou serviço puro e CLI confinada sobre v1/v2.
Ele não alterou o resolvedor, os validadores, o motor ou peças publicadas.

O mapa canônico concluiu R00–R06 com decisão `aprovar`: contrato de universo,
snapshot confinado, composição, ocorrências, relações, usos reversos, consulta
de impacto, consumo MCP reduzido, continuidade ativa e escala estão provados.
O plano de cascata persistida foi concluído no R06 após as provas
focadas em contrato, persistência, retomada, compartilhamento, resultados,
obsolescência, concorrência, MCP e estudo de campo, com decisão `aprovar`.
Qualquer evolução permanece separada de promoção automática.

O diagnóstico concluiu que o motor de peça atual é adequado para servir de base
à primeira montagem persistida sem refatoração estrutural prévia. Os limites
conhecidos que não bloqueiam esse recorte são: catálogo semântico de materiais
compartilhado por referência, validação incompleta de reflexão, hierarquia
interna ainda não transportada pelo formato exportado e fragilidades de algumas
receitas históricas. Planos futuros precisam manter esses limites explícitos
enquanto não houver evidência nova.

## Resultado pós-estudo

[`2026-08-14-contexto-de-montagem-para-ia.md`](./encerrados/2026-08-14-contexto-de-montagem-para-ia.md)
foi concluído no R05. Ele entrega descrição estruturada, compacta e consultável
de montagem persistida arbitrária, com cobertura explícita do que foi e do que
não foi verificado.

O estudo completo mede 18.611 bytes e a consulta reduzida, 9.002 bytes.
Renderização, MCP e autoria transacional permanecem etapas posteriores e
separadas, sem abertura automática.

Com autorização explícita de continuidade, a relação espacial direcional e o
mapa de impacto local foram concluídos no R04. Disco–pinça é fixture; o contrato
permanece neutro e não promete colisão geral.

Com autorização explícita de continuidade, o plano de materialização e autoria
segura fechou em R06: a transação, a revalidação condicionante e a autoria MCP
opt-in foram aprovadas pelas provas internas, consumidor caixa-preta e estudo de
campo repetido.

## Programas

| Programa | Painel | Execução atual |
|---|---|---|
| MCP para agentes | [`mcp/INDEX.md`](mcp/INDEX.md) | leitura, autoria de montagem e receita declarativa opt-in aprovadas |

O painel de programa acompanha dependências e resultados, mas não conta como
plano executivo ativo. A Fatia 1A somente leitura foi aprovada e encerrada em
[`mcp/concluidos/01-fatia-1a-piloto-leitura.md`](mcp/concluidos/01-fatia-1a-piloto-leitura.md),
a Fatia 1B visual foi encerrada em
[`2026-08-05-mcp-fatia-1b-visual.md`](./encerrados/2026-08-05-mcp-fatia-1b-visual.md), a
avaliação consolidada foi concluída com decisão `corrigir` em
[`2026-08-05-mcp-avaliacao-consolidada.md`](./encerrados/2026-08-05-mcp-avaliacao-consolidada.md),
a correção de descoberta foi concluída com decisão `aprovar` em
[`2026-08-05-mcp-correcao-descoberta.md`](./encerrados/2026-08-05-mcp-correcao-descoberta.md)
e a primeira fatia de autoria controlada foi concluída com decisão `interromper`
em [`2026-08-05-mcp-autoria-controlada.md`](./encerrados/2026-08-05-mcp-autoria-controlada.md).

A primeira autoria controlada de pacotes não foi publicada. O PR #25 foi fechado sem merge porque a
implementação portátil não demonstrou simultaneamente publicação do pacote
completo em uma única transição e recusa atômica de sobrescrita contra destino
concorrente. Uma retomada exige plano técnico separado. Edição de receita,
revisões, materiais, Git e distribuição permanecem fora.

## Contrato de plano

Todo plano curto deve declarar:

1. objetivo verificável e fora de ambiguidade;
2. hipótese ou pergunta que justifica o trabalho;
3. arquivos e identidades em escopo;
4. invariantes que não podem mudar;
5. gates e evidências esperadas;
6. limites e itens explicitamente fora;
7. resultado, decisão e caminho de encerramento.

Estados aceitos nos planos executivos datados: `rascunho`, `pronto`, `ativo`,
`concluído` e `cancelado`. Só existe um plano `ativo` por vez.

## Concluídos

Os planos datados e o encerramento do plano mestre estão em
[`concluidos/`](concluidos/). A tabela é um índice curto; os detalhes continuam
nos arquivos originais.

| Grupo | Estado |
|---|---|
| Fundação, identidade e portas | concluído |
| Arranjos, furos, filete e tolerâncias | concluído |
| Câmera, pose e inspeção reproduzível | concluído |
| Hierarquia, subárvore e interfaces | concluído |
| Encerramento do plano mestre | concluído |
| MCP — Fatia 1A somente leitura | concluído |
| MCP — Fatia 1B visual somente leitura | concluído |
| MCP — avaliação consolidada por agente consumidor | concluído: corrigir |
| MCP — correção de descoberta de pacotes e revisões | concluído: aprovar |
| MCP — autoria controlada de pacotes | concluído: interromper |
| Diagnóstico do motor procedural | concluído: abrir Montagem Mínima Persistida v1 |
| Montagem Persistida v2 — relações locais | concluído: R06, PR #41 |
| Contexto de montagem para IA | concluído: R05, PR #42 |
| Montagem v3 — separação direcional e impacto local | concluído: R04, PR #42 |
| Contexto visual e autoria segura de montagem | concluído: R05, PR #43 |
| MCP — leitura e auditoria de montagens | concluído: aprovar, R04 |
| Abertura oblonga — rasgo no `furo` | concluído: aprovar |
| Pose de criação — `em` e `eixo` nos geradores | concluído: aprovar |
| Nome de cópia no `arranja` | concluído: aprovar |
| Alteração semântica compacta de montagem | concluído: aprovar |
| Encostar — contato derivado | concluído: aprovar |
| Ponto nomeado, e revisão dos atritos vizinhos | concluído: aprovar |
| Histórico de revisão, e retirada do Caso 3 | concluído: aprovar |
| Perfil fechado no `lathe`, e limpeza da lista | concluído: aprovar |
| Estudo de autoria — conjunto dobradiça | concluído: corrigir |

O plano da abertura oblonga está em
[`2026-08-17-abertura-oblonga.md`](./encerrados/2026-08-17-abertura-oblonga.md). Ele fechou a
primeira das três lacunas geométricas listadas em
[`../RELATORIO-ANALISE-GRANDES-MELHORIAS.md`](../historico/RELATORIO-ANALISE-GRANDES-MELHORIAS.md):
`furo` passou a expressar rasgo por `ate`, sem operação nova e sem família de
endereço nova. Costuras de `lathe` e endereço único de grupo linear continuam
abertas, sem abertura automática.

A [pose de criação](./encerrados/2026-08-17-pose-de-criacao.md) fechou o atrito A-4: os
geradores aceitam `em` e `eixo`, e o trio criar/rotacionar/transladar vira um
passo. O acervo gastava 128 dos 853 passos (15%) só em transporte.

Arquivos concluídos: [assentamento](concluidos/2026-08-02-assentamento-anular.md),
[câmera](concluidos/2026-08-02-camera-livre-reproduzivel.md), [canto](concluidos/2026-08-02-canto-composto.md),
[concordância](concluidos/2026-08-02-concordancia-por-ponto.md), [contagem](concluidos/2026-08-02-contagem-por-desvio.md),
[contato](concluidos/2026-08-02-contato-local-cilindrico.md), [encaixe](concluidos/2026-08-02-estados-de-encaixe.md),
[identidade](concluidos/2026-08-02-identidade-porta-estavel.md), [interfaces](concluidos/2026-08-02-interfaces-de-encaixe.md),
[espelho](concluidos/2026-08-02-portas-espelho-arranja.md), [pose derivada](concluidos/2026-08-02-pose-derivada-roda.md),
[pose](concluidos/2026-08-02-pose-em-referencial.md), [recusa](concluidos/2026-08-02-recusa-estrutural-montagem.md),
[tolerâncias](concluidos/2026-08-02-tolerancias-de-montagem.md), [triangulação](concluidos/2026-08-02-triangulacao-de-furos.md),
[consulta](concluidos/2026-08-03-consulta-subarvore-ia.md), [hierarquia](concluidos/2026-08-03-hierarquia-semantica-minima.md),
[inspeção](concluidos/2026-08-03-inspecao-reproduzivel-de-par.md), [seleção](concluidos/2026-08-03-selecao-subarvore-semantica.md),
[encerramento](concluidos/ENCERRAMENTO-PLANO-MESTRE-2026-08-02.md),
[MCP Fatia 1A](mcp/concluidos/01-fatia-1a-piloto-leitura.md),
[MCP Fatia 1B](./encerrados/2026-08-05-mcp-fatia-1b-visual.md),
[MCP avaliação consolidada](./encerrados/2026-08-05-mcp-avaliacao-consolidada.md),
[MCP correção de descoberta](./encerrados/2026-08-05-mcp-correcao-descoberta.md),
[MCP autoria controlada](./encerrados/2026-08-05-mcp-autoria-controlada.md) e
[diagnóstico do motor](./encerrados/2026-08-06-diagnostico-motor-procedural.md).

## Abertura em curso

Somente P0 do [modelador inverso com priors por
família](./congelados/2026-08-25-modelador-inverso-priors-familia.md) está aberto. O plano
executável está em
[`docs/superpowers/plans/2026-08-25-modelador-inverso-priors-familia-p0.md`](../../superpowers/plans/2026-08-25-modelador-inverso-priors-familia-p0.md).
Ele corrige a linha de base, qualifica alvo e calibra o avaliador; **não modela
carroceria**. P1 só abre se suíte, alvo e crítico passarem sem ressalva que
invalide o estágio seguinte. N3–N6, seleção por linhas e os demais candidatos
permanecem como evidência histórica ou backlog, sem continuidade automática.

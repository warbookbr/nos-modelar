# Laboratório computacional para IA — progresso por fatia

**Plano que governa:** [`planos/2026-09-01-laboratorio-computacional-ia.md`](planos/2026-09-01-laboratorio-computacional-ia.md)
**Dossiê:** [`DOSSIE-LABORATORIO-IA.md`](DOSSIE-LABORATORIO-IA.md)

Este documento é o relato: o que cada fatia entregou, o que ficou de fora e por
quê. O plano fica curto de propósito — ele autoriza e delimita; aqui mora o que
aconteceu. A regra do repositório é essa, e o gate de 200 linhas do plano é quem
a segura.

O fio condutor das três primeiras fatias é um só: **cada peça de maquinaria
entrou porque um estudo real precisou dela, e o que nenhum estudo pediu ficou de
fora com o motivo escrito.**

## R0 — o que o primeiro estudo devolveu

A Task 2 pedia "contratos v1 e identidade canônica". Ela foi feita **ao
contrário do plano, de propósito**: em vez de desenhar os nove contratos do
dossiê e depois procurar uso, rodei um estudo real e deixei que ele pedisse os
campos. Saíram cinco documentos, e cada campo existe porque o estudo usa.

A pergunta veio da modelagem, não de exercício: *dá para baixar a torção das
faces da cabeça do machado abaixo de 1% mexendo em `lados` e `expoenteSecao`,
sem mudar a forma?*

**A resposta é não.** A torção cai monotonicamente com `expoenteSecao`
(sustentada no domínio testado), mas o mínimo alcançável é 1,8% — nenhuma
configuração chega ao alvo com a forma preservada. Hipótese **contradita**, e
esse era um dos desfechos previstos por escrito antes de medir.

### O que o estudo achou que eu não fui procurar

**`lados` não é parâmetro livre nesta peça.** A primeira varredura devolveu 21
de 25 execuções gritando. A causa não era ruído: o furo do olho precisa CABER
numa face, e aumentar `lados` estreita a face. Dos cinco valores testados, só
`14` mantém o olho furável. A pergunta estava mal-posta, e foi o instrumento que
mostrou.

Isso também expôs um defeito latente na receita: `LADO_TOPO` e `LADO_FUNDO`
eram os literais 3 e 10, derivados à mão de `lados: 14`. Agora são calculados de
`lados`. Quem mexesse nesse número herdaria um furo fora do lugar, em silêncio.

### E um defeito no próprio instrumento, que o canário pegou

A primeira versão trocava `receita.PARAMS` — mas a receita calcula os argumentos
no carregamento do módulo, então o parâmetro não chegava a lugar nenhum e as 25
medidas saíram **idênticas**, com cara de varredura. Instrumento que não mede
nada e responde mesmo assim é o pior tipo. Agora ele tem um canário que compara
duas configurações que TÊM de diferir e se derruba se vierem iguais.

### O laboratório se pagou nesta rodada?

**Em parte, e vale ser exato.** O que mudou o resultado foi disciplina barata:
declarar o critério de refutação antes de medir, separar quem mede de quem
julga, e recusar conclusão vinda de execução que gritou. Nada disso precisou de
DAG, proveniência ou RO-Crate.

O que ainda não se pagou é a maquinaria pesada das fatias R1 a R7. Ela continua
justificada pelo dossiê, não por evidência deste estudo — e essa distinção fica
escrita para a próxima rodada cobrar.

## R1 — o que entrou, e o que ficou de fora com motivo

O buraco veio do R0, por uso: a síntese concluiu sobre a torção da cabeça do
machado **sem dizer qual cabeça**, e a receita mudou no meio do estudo. Quem
lesse a conclusão depois não teria como saber que objeto foi medido.

Entrou o que fecha isso:

- **armazém por conteúdo** — o id do artefato é o hash dele. Guardar o mesmo
  conteúdo duas vezes é no-op; conteúdo trocado por baixo é recusado na leitura,
  porque o nome prometia um hash que o conteúdo não tem;
- **proveniência** — commit, árvore limpa ou suja, e hash dos BYTES de cada
  entrada. Ela **recusa** chamar de reproduzível o que não é: sem commit, com
  árvore suja ou sem entrada identificada, ela diz não e diz por quê;
- **verificação de reprodução**, em três níveis separados de propósito. Entrada
  diferente é `nao-comparavel` — o caso mais perigoso é justamente aquele em que
  os números batem e não significam nada. Medida diferente com a mesma entrada é
  achado, não ruído. Conclusão diferente é o único nível que invalida a síntese.

**RO-Crate ficou de fora, e isso é decisão.** Ele é formato de EXPORTAÇÃO e não
existe consumidor: ninguém, dentro nem fora, pede um pacote nesse formato hoje.
Construí-lo agora seria adivinhar o que um leitor futuro quer — o mesmo erro que
esta fatia acabou de evitar ao deixar os contratos nascerem do estudo. Entra
quando houver quem leia.

Prova de ponta a ponta: duas execuções do instrumento, guardadas por conteúdo,
avaliadas e comparadas — veredito `reproduzido`. E a proveniência da rodada saiu
**não confiável**, corretamente, porque a árvore estava suja na hora.

## R2 — metade entregue, metade adiada, e o critério de cada uma

**Entrou o registro de instrumentos**, e ele é justificado por falha vivida, não
pelo dossiê: o instrumento do primeiro estudo não declarava domínio, e eu varri
`lados` de 10 a 26 sem saber que só 14 mantém o olho do machado furável —
descobri por 21 execuções gritando. O instrumento SABIA, a informação estava na
geometria dele, e não tinha onde dizer.

Duas regras, e as duas recusam:

- **importar não concede capacidade.** Instrumento não registrado é recusado com
  o motivo por escrito. Achar o arquivo, importá-lo ou encontrá-lo no `PATH` não
  vale como declaração;
- **manifesto sem `nao_cobre` é recusado.** Não declarar limite é afirmar que
  cobre tudo, e nenhum instrumento cobre. A síntese passa a repetir esses
  limites, e medida fora do domínio declarado é excluída antes de qualquer
  avaliação — o filtro de domínio roda ANTES do de admissibilidade, porque
  medida fora do que o instrumento promete nem deveria ser julgada.

**DAG e runner entraram depois, e a mudança de rumo fica registrada.** Eu tinha
adiado os dois com um critério escrito — um segundo instrumento, ou um estudo cujo
passo consuma a saída de outro — e nenhum dos dois apareceu. O que mudou foi a
decisão de quem manda no projeto: montar o laboratório antes de usá-lo, em vez de
deixar cada peça esperar a falha que a justifica. Anoto assim porque o critério
não foi cumprido, foi substituído, e a diferença importa para quem ler depois.

O planejador prova o grafo ANTES de qualquer execução, e cada prova veio de um
modo de falha: ciclo, capacidade que o instrumento não declara, duas saídas com o
mesmo nome (ordem de execução virando dado, que é a proibição de posição-como-
identidade outra vez), entrada que ninguém produz — o erro que mais parece
funcionar, porque o passo roda, recebe vazio e devolve número plausível — e
versão de instrumento sem fixar. Falha fechada: nenhuma ordem parcial sai, para
não convidar a rodar "o que dá". O módulo não importa o executor, e há teste que
verifica isso: "planejar não é executar" precisa de barreira, não de frase.

O executor confina tempo por passo, tempo total, teto de passos, propagação de
falha e diretório efêmero — e **declara na própria saída** que não confina rede,
sistema de arquivos fora daquele diretório, memória nem processos filhos. Ele
serve para instrumento local e confiável, que é o único que este laboratório tem,
e não para código de terceiro. Duas honestidades caras: o tempo do passo é
conferido depois de ele rodar, porque sem subprocesso não há como interromper uma
função no meio; e saída que o passo não prometeu é descartada, para um passo não
alimentar outro por canal que o grafo não declara.

Vinte e cinco testes, e cada regra foi vista vermelha antes de virar verde.

## R3 — o grafo entrou; os conectores de rede não, e digo por quê

**Fonte não é verdade** é a regra que o módulo inteiro serve. Uma citação válida
sustenta que ALGUÉM PUBLICOU uma alegação; ela não prova que a alegação está
correta nem que se aplica ao que estou medindo. Por isso a alegação não tem campo
de verdade nem escalar de confiança — seria o mesmo pecado já recusado nas
hipóteses, com outro nome — e há teste que verifica a ausência desses campos.

Três coisas ficam separadas porque são três julgamentos diferentes: o que a
publicação É (identidade, licença, retratação), o que ela AFIRMA (enunciado, onde
no texto, sob que condições) e se aquilo VALE AQUI. O terceiro é do laboratório,
não da fonte, e por isso `aplicar` exige justificativa escrita e ao menos uma
ressalva — transportar resultado sem ressalva é a forma mais comum de usar
achado fora do domínio dele. Alegação sem condição declarada também é recusada:
ela se comporta como lei universal.

Duas armadilhas que não levantam erro sozinhas ganharam mecanismo:

- **retratação alcança quem só cita.** Fonte retratada continua no grafo, marcada,
  e a contaminação viaja por citação, não só por vizinhança. Apagar esconderia
  que o estudo um dia se apoiou nela;
- **apoio que parece múltiplo.** Três alegações do mesmo artigo não são três
  evidências, e cinco revisões do mesmo experimento também não. O grafo conta
  fontes primárias distintas, não alegações.

Conflito fica preservado e ligado, nunca resolvido: o grafo não elege vencedora,
mostra a contradição para a síntese ter de falar dela.

**Os conectores de Crossref e OpenAlex não entraram, e isso não é atraso.** Eles
precisam de paginação, cache, rate-limit, licença e orçamento de contexto — cinco
coisas que só se provam contra a rede real, e o laboratório ainda não tem um
estudo que peça literatura. Construí-los agora seria produzir código cuja única
prova seria eu afirmando que funciona. O grafo, esse, tem prova local: dezenove
testes, cada recusa vista acontecer.

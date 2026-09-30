# O esboço sem conta à mão

**Estado:** ativo

**Responsável:** Claude, com o aceite da pessoa

**Repositório e base:** `warbookbr/nos-mecanifica`, branch da sessão sobre a `main`

## Problema observado

Em 2026-09-29, o esboço de uma moto de 10 formas (`modulos/esboco/`) custou
quatro rodadas de tentativa e erro. A IA calculou à mão cada centro, inclusive a
trigonometria da inclinação do garfo, escreveu duas vezes as peças simétricas e
errou três vezes seguidas: o garfo atravessava a roda, o braço do balancim
entrava no motor e a coluna entrava no tanque. Cada erro só apareceu depois de
uma imagem ou de um gate, e cada conserto pedia recalcular coordenadas.

O gate de contato mede colisão, distância e ligação em três dimensões, e a
pessoa viu na isométrica o que ele não mede: o garfo cobrindo a roda e os
braços do balancim passando por diante da roda e do motor, sem nenhuma
penetração. Na projeção, duas peças que só se aproximam parecem uma sobre a
outra, e decidir à mão o que fica por cima não serve para a IA. Faltam ainda
uma leitura em texto do que foi montado, formas para o que uma moto ou um braço
pedem (tubo entre dois pontos, esfera, cone), uma forma de a mesma moto virar
duas variantes por dois números, e um SVG que hoje passa de 2,6 MB em 11 s.

O Mecanifica já resolve várias dessas dores para peças e montagens: a operação
`encostar`, `espelha` e `arranja`, `TABELA` com `derivar`, portas publicadas com
relações por porta na montagem e a auditoria de interseções. O esboço é um
módulo independente do núcleo, e o custo de reaproveitar cada um deles é a
primeira decisão do plano.

## Resultado

Um conjunto de umas doze peças se esboça descrevendo relações e parâmetros, e não
coordenadas calculadas: peças encostadas por face ou por ponta, hastes entre dois
pontos, simetria por espelho e variantes por parâmetro. A ferramenta diz, em
texto e na imagem, o que está ligado, o que se atravessa e o que parece
sobreposto em cada vista, com o que cobre o quê, e propõe o conserto em milímetros. A IA
verifica o esboço por texto antes de gerar a imagem, e o arquivo antigo continua
gerando o mesmo desenho, byte a byte.

## Estado de partida

O módulo `modulos/esboco/` tinha numeração automática, `linhasCentro`, `ocultar`,
legendas em lista, o campo `plano`, o "Pare e planeje" e o "Pare e analise" e o
gate de contato opt-in. Esta seção é o que este plano não refaz.

## O que o estudo do Mecanifica decidiu

Um estudo de leitura, feito em 2026-09-29, mediu cada mecanismo contra o esboço.
Só dois arquivos entram como estão: `procedural/nucleo/expressoes.js`, que
aceita número, nome de parâmetro e `"=a+b*c"`, tem 92 linhas, nenhum import e
teste, e a função `poseQueEncaixa` de `src/autoria/posicao-por-porta.js`, pura,
que já calcula o centro e o ângulo de uma haste entre dois pontos (o garfo da
moto saiu em 24,97°, contra os −25° digitados à mão). O resto se reimplementa
dentro do módulo, sobre os prismas do esboço: `encostar` com direção e folga
(cerca de 10 linhas sobre o `apoio()` do gate), `espelha` (cerca de 30, com a
regra de nome explícito da cópia que o núcleo já usa) e o ponto nomeado (cerca
de 8). Não servem, e ficam fora do plano: as interfaces de porta e as relações
`assentaAnular` e `encaixaCilindrico`, que são validadores coaxiais em metro;
o resolvedor e a montagem v5, que exigem peças com malha e portas resolvidas;
os `vinculos` e as `etapas`; o `PLANO` estruturado com `criteriosDeReprovacao`;
e `auditar-intersecoes-montagem`, que devolve estado sem milímetros e roda sete
vezes mais devagar. O gate do esboço fica no módulo, porque mede distância e
penetração em mm.

O que o esboço deve herdar é o contrato de declaração do Mecanifica: toda
exceção declara `motivo` de pelo menos 15 caracteres, `atravessa` exige `max`, e
`livre`, que hoje cala o par por completo, deixa de existir como saída livre.
Hoje a moto tem cinco pares `atravessa` sem `max`, que nunca reprovam, e a
coluna e o tanque se atravessam 20 mm sem alarme. Em `modulos/esboco/` já existe
uma proposta, `PLANO-ESTADO-DA-ARTE.md`, fora de `planos/` e aguardando
aprovação, que propõe `de` e `para` e espelho; este plano a absorve, e ela é
apagada ou marcada como substituída na fatia 1.

## Filtro Agent-First

A operação é ENVOLVER onde o estudo achou arquivo puro para importar
(`expressoes.js` e `poseQueEncaixa`) e reimplementar a ideia onde o mecanismo
do Mecanifica exige malha, metro ou montagem. Escrever um resolvedor de
restrições geral é ADIADO, porque encostar, alinhar e espelhar cobrem o que as
fotos pedem. Importar a malha de uma peça real dentro do esboço também é
ADIADO. O módulo continua independente do núcleo, e isso é registrado no
README dele.

## Incluído

- feitas nas fatias 2 a 7: a leitura em texto `--descrever` (e `--mudou`), a
  sobreposição na projeção por vista com vista explodida e arestas ocultas,
  âncoras nomeadas com `tubo`, `encostar` e `alinhar`, `espelho` e `arranja`,
  `params` e expressões, o gate propondo o conserto com `--ajustar`, os
  componentes parametrizados (`roda`, `garfo`, `quadro`, `mancal`) e as formas
  novas (tubo, esfera, cone, extrusão, chanfro);
- o contrato de declaração do gate herdado do Mecanifica: `motivo` de pelo menos
  15 caracteres em toda exceção, `max` obrigatório em `atravessa`, o par do
  espelho herdando a declaração do original, e a decisão de política de a skill
  ligar o gate por padrão a partir de umas quatro formas;
- o registro, no README do módulo, de que ele é independente do núcleo e só
  importa `expressoes.js` e `poseQueEncaixa`, e a substituição do
  `PLANO-ESTADO-DA-ARTE.md` por este plano;
- validação do JSON por esquema, com mensagem que diz o campo e o valor
  válido, e um resumo compacto do formato para a IA na skill;
- desempenho: SVG e tempo menores, e um modo rápido sem PNG;
- a conferência contra referência: a silhueta do esboço sobreposta à foto na
  mesma escala, reaproveitando `conferir:referencia`;
- fixtures com resultado esperado: a moto de prova, o mancal e a casa, com o
  gate e as imagens de referência.

## Formato proposto

A proposta do estudo (haste por `de` e `para`, lado direito por espelho, café
racer por `parametros` na opção) está implementada e descrita no README do
módulo, que é a referência do formato.

## Excluído

- as portas com raio, as relações `assentaAnular` e `encaixaCilindrico`, a
  montagem v5 com o resolvedor, os `vinculos`, as `etapas` e o `PLANO`
  estruturado do Mecanifica, e a chamada a `auditar-intersecoes-montagem`;
- uma linguagem de comandos incrementais (`adiciona`, `encosta`, `espelha`),
  ADIADA: ela seria uma camada fina sobre as relações e as âncoras das fatias 2,
  4 e 5, e o `--descrever --mudou` já dá a leitura passo a passo. Volta se, depois
  dessas fatias, a IA ainda errar por escrever o esboço todo de uma vez; nesse
  caso os comandos gravam a relação no JSON (não as coordenadas), o gate só roda
  no comando `verificar`, e o vocabulário sai do mesmo esquema do JSON;
- importar a malha de uma peça real dentro do esboço;
- render tridimensional com sombreamento e cotas dimensionais na imagem, que
  são o fluxo da prancha;
- gerar a receita da peça a partir do esboço;
- mudança no núcleo do Mecanifica.

## Gate de saída

1. A moto de doze formas sai descrita com relações, `tubo`, `espelho` e
   `params`, sem nenhum centro calculado à mão, e passa no gate de contato.
2. `--descrever` lista o grafo de contatos e as sobreposições, e a moto de prova
   confere com a imagem.
3. O gate mede a sobreposição na projeção e diz quem cobre quem, com teste: o
   garfo ao lado da roda é acusado na isométrica e não na frontal.
4. O conserto proposto pelo gate, aplicado por `--ajustar`, resolve o achado,
   provado por teste.
5. O naked e o café racer diferem só por `params`.
6. Todo `.esboco.json` existente gera o mesmo SVG, byte a byte.
7. O número de valores escritos à mão no JSON da moto cai pelo menos pela
   metade contra o de hoje (medido no arquivo).
8. A pessoa confirma, olhando a moto e um segundo objeto, que o esboço ficou mais
   fácil de descrever e de ler.
9. A leitura padrão do `--descrever` mostra só o total de formas, os parâmetros
   e as divergências em ordem de gravidade, e a moto detalhada cabe em menos de
   40 linhas quando o gate aprova; âncoras, caixas e vizinhos só saem sob
   pedido, por exemplo `--forma garfoE.perna`. Atendido em 2026-09-30: a moto
   de prova (24 formas, 2 opções) sai em 9 linhas, a versão com um defeito em
   11, e `--completo` é a leitura antiga byte a byte (`tests/leitura.test.js`).
10. Todo achado do gate vem com uma imagem própria: o par envolvido colorido, o
    resto em cinza, sem legenda numerada e com zoom no ponto. Atendido em
    2026-09-30 por `--achado <n>` e pela `--analise` (`achados` no manifesto);
    o teste mede a cor nos pixels do PNG.
11. O contrato de relações (o que deve tocar, o que deve ficar livre, o que deve
    ser simétrico) é declarado no JSON e conferido pelo gate contra o medido.
    Atendido em 2026-09-30 por `plano.contrato` (`tests/plano.test.js`).
12. A conferência contra a foto mede, por vista e por parte, o desvio da
    silhueta em milímetros e a razão entre interseção e união, e reprova acima
    da tolerância declarada.
13. A skill proíbe a IA de auditar por imagem com legenda numerada e descreve o
    fluxo contrato, medidas da referência, construção por subsistema, montagem,
    conferência numérica, crítico sem contexto e pessoa. O fluxo e a proibição
    estão escritos na skill e no `PARE-E-ANALISE.md` (`tests/skill.test.js`); a
    conferência numérica contra a foto é o item 12, ainda aberto.
14. O `plano` do JSON ganha um campo estruturado e genérico de medidas nomeadas,
    cada uma com valor, unidade e origem (ficha técnica, foto ou conhecimento da
    IA), e o gate confere o esboço contra elas, sem conhecer o assunto: uma
    medida fora da tolerância vira achado com o desvio em milímetros. Atendido
    em 2026-09-30 por `plano.medidas` (`mede`: caixa total, caixa de formas ou
    distância entre âncoras; `tests/plano.test.js`).
15. O Pare e planeje fixa o nível de detalhe a partir do pedido (esquemático,
    médio ou detalhado), e o nível decide quanto se planeja e quanto se confere:
    um esboço rápido pede poucas medidas, e um objeto detalhado pede medidas por
    subsistema, contrato de relações e conferência contra a referência. A skill
    não cita nenhum objeto específico. Atendido em 2026-09-30 por `plano.nivel`
    e pelo Portão, que pede 1, 3 ou 5 medidas conforme o nível
    (`tests/condutor.test.js`); o teste da skill confere que as passagens do
    nível, das medidas e do fluxo não citam objeto.
16. Tanque, banco e carenagem da moto de prova saem com forma curva (perfil
    côncavo, afunilamento ou loft), e não como caixa ou extrusão convexa.
    Atendido em 2026-09-30 por `moto-curvas.esboco.json`: as imagens nas quatro
    vistas mostram tanque e carenagem afunilados e o banco com a sela, e a
    silhueta lateral de tanque e banco mede menos de 90% da caixa que os envolve.
17. O Condutor roda o fluxo por estágios (Maquete, Conferência da maquete, Plano
    de detalhe, Detalhe por unidade, Montagem), grava o estado em arquivo legível
    por máquina e só libera o estágio seguinte quando o Portão de estágio do
    atual passa, provado por teste: pular estágio é recusado com a mensagem do
    que falta. Atendido em 2026-09-30 por `--condutor` (`src/condutor.js`), com
    o estado em `<arquivo>.condutor.json` e o nível ligando os estágios; o fluxo
    percorre os cinco estágios na moto de formas curvas.
18. O Plano de detalhe agrupa em Unidades de detalhe as formas de acoplamento
    apertado do grafo de relações e ordena por dependência, e a mudança do
    agrupamento pela IA exige `motivo` de pelo menos 15 caracteres. Atendido em
    2026-09-30: a moto de formas curvas dá 11 unidades e 24 formas, o guidão une
    os dois garfos numa unidade só, e `--mover` sem motivo é recusado.
19. O Envelope de cada unidade (o volume da maquete e as portas) é conferido
    contra a versão detalhada, e o Marco chama o crítico visual sem contexto a
    cada 25% do custo estimado das unidades feitas, com imagens limpas. Parcial:
    o Marco registra "chamar crítico" no estado a cada 25% do custo (o despacho
    do crítico é da skill); o Envelope não foi feito.
20. `npm run gates --completo` passa.

## Fatias

1. As decisões do estudo postas em código e texto: importar `expressoes.js` e
   `poseQueEncaixa`, registrar a independência no README, absorver ou apagar o
   `PLANO-ESTADO-DA-ARTE.md`, e o contrato de declaração do gate (`motivo`,
   `max` obrigatório, `livre` restrito) com o formato do JSON e a compatibilidade
   escritos.
2. `--descrever`, o `--descrever --mudou` e as âncoras nomeadas.
3. A sobreposição na projeção por vista, com vista explodida e arestas ocultas
   tracejadas.
4. `tubo`, `encostar` e `alinhar`.
5. `espelho`, `arranja`, `params` e expressões.
6. O gate propondo o conserto e `--ajustar`.
7. Componentes e as formas novas. Feita em 2026-09-30: `usa` com `roda`, `garfo`,
   `quadro` e `mancal` em `modulos/esboco/componentes/`, expandidos em
   `src/componentes.js` (ids prefixados, parâmetros no escopo do componente,
   âncoras `<instancia>.<ancora>`, pares do gate, espelho de instância), o ponto
   `entre`, e as formas `tubo`, `esfera`, `cone` (com tronco), `extrusao` e
   `chanfro` na caixa, com gate, espelho, arranjo e `--ajustar`. A moto de prova
   `moto-componentes.esboco.json` passa no gate nas duas opções com 35 números
   escritos à mão.
8. A validação da moto detalhada (2026-09-30) mostrou o que faltava, e tudo foi
   feito no mesmo dia. Formas curvas: `extrusao` de perfil côncavo, `loft` e
   `revolucao`, com gate por partes convexas. Desempenho, na moto de 66 formas:
   `--analise` de 11 min para 36 s, 4,7 s com `--rapido`, e o teste da moto de 47
   s para 3,3 s. A projeção agrupada por componente (10 grupos por opção, contra
   107 achados). O contrato de relações: `contato.juntas` no lugar de dezenas de
   pares `atravessa`, pontos-guia nomeados no `caminho` do tubo, `{ ancora, mm }`,
   e o bug de `<instancia>.<parte>` corrigido. A leitura padrão do `--descrever`
   só com divergências (`--forma`, `--completo`), a imagem por achado
   (`--achado`), o `plano` estruturado (`nivel`, `medidas`, `contrato`), o esquema
   do JSON com "quis dizer" e o Condutor (estágios, Portão, Plano de detalhe,
   Marco), descritos no README do módulo. Nomes: Condutor (a máquina de estados
   do fluxo), Maquete (formas primitivas com dimensões e posições corretas),
   Plano de detalhe (o algoritmo que agrupa e ordena), Unidade de detalhe (uma
   peça, ou as peças de acoplamento apertado), Envelope (o volume da maquete que
   a peça detalhada não ultrapassa, com as portas nos mesmos lugares), Portão de
   estágio e Marco (o crítico visual a cada 25%). Mapeamento para o Mecanifica: a
   Unidade de detalhe é a etapa da montagem, o Envelope é o gate de encaixe da
   ponte, o Portão é o aceite por etapa e o Condutor generaliza o `objeto`. Fora
   desta fatia: o Envelope e o despacho do crítico pelo Condutor. O módulo
   passou de 299 para 367 testes, e `npm run gates` fecha com 32/32 verdes.
9. A referência e o fluxo. Feito em 2026-09-30: o fluxo na skill e no
   `PARE-E-ANALISE.md`, a proibição de auditar por legenda numerada, e o Pare e
   planeje produzindo `plano.nivel`, `plano.medidas` (com origem) e
   `plano.contrato`, lidos pelo gate. Falta a conferência numérica contra a foto,
   reaproveitando `conferir:referencia`, com o desvio por parte e por vista, a
   extração das medidas da foto para parâmetros, a moto detalhada de prova sem
   centro calculado à mão, as fixtures com resultado esperado (moto, mancal e
   casa) e o fechamento do plano.

## Riscos e desvios

O risco maior é acoplar o módulo `esboco` ao núcleo do Mecanifica, que ele não
importa hoje. O desvio é reimplementar dentro do esboço a ideia de cada
mecanismo (encostar, espelhar, parâmetro) sobre os prismas dele, e reservar um
adaptador fino só onde o estudo mostrar que o resolvedor da montagem se
aproveita sem converter malha.

O formato do JSON cresce, e cada campo novo é opcional, com o arquivo antigo
gerando o mesmo desenho byte a byte. Se um recurso quebrar essa igualdade, ele
ganha um nome novo em vez de mudar o antigo.

Se a sobreposição na projeção der falso alarme em conjuntos grandes, o limiar
passa a ser declarável por esboço, como a tolerância do contato, e o achado
entra no relato como aviso e não como reprovação.

## Fechamento

A preencher.

## Depois deste plano

O candidato principal é [as partes do braço](congelados/2026-09-26-as-partes-do-braco.md),
congelado em 2026-09-29 para dar lugar a este.

A ponte entre o esboço e o Mecanifica também fica para depois. O esboço
exportaria um esqueleto de montagem com uma parte por forma, com posição,
medidas, portas nas âncoras e as relações do contrato. O Mecanifica abriria cada
parte como um rascunho com o volume do esboço, a IA trocaria o rascunho pela
forma real, e o gate conferiria que a peça real cabe no volume do esboço e
mantém as portas nos mesmos lugares. O esboço passaria a ser o lugar onde se
acerta a composição e a proporção, e o núcleo cuidaria só da forma de cada peça.
Isso exige decidir antes como o módulo, hoje independente do núcleo, entrega o
esqueleto sem importá-lo.

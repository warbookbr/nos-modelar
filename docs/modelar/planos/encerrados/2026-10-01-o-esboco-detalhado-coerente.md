# O esboço detalhado coerente

**Estado:** concluído

**Responsável:** Claude, com o aceite da pessoa

**Repositório e base:** `warbookbr/nos-mecanifica`, branch da sessão sobre a `main`

## Problema observado

O plano [o esboço sem conta à mão](2026-09-29-o-esboco-sem-conta-a-mao.md)
fechou em 2026-10-01 com o fluxo por unidades funcionando: duas rodadas de
medição independentes, uma moto naked de 219 formas em 19 unidades e uma mini
escavadeira de 173 formas em 13, gastaram cerca de 10 KB de código auxiliar
contra 106 KB da primeira moto. As duas voltaram com o gate de contato
aprovado e, mesmo assim, o crítico cego deu 7 de 10 à moto: o motor não tem
quadro que o prenda, o escapamento termina contra a balança e o pinhão, os
espelhos são grandes demais e a rabeta é um conjunto de blocos soltos. O gate
mede contato e relações declaradas, e esses defeitos são de ligação e de função.

As duas rodadas também acharam seis bugs que mandaram a IA contornar o fluxo:
`unidade` numa instância de componente espelhada é recusada, `--feito` aceita
unidade com colisão aberta no mestre, `--detalhar` usa a tolerância da caixa
isolada e inventa peças soltas, `--editar` e `--integrar` regravam o JSON com
um número por linha, os Marcos de 25% a 75% disparam todos de uma vez, e o
máximo implícito da junta na mesma unidade estoura em eixo no cubo sem a
mensagem dizer que basta declarar `max`.

## Resultado

Um objeto detalhado de dezenas de unidades sai pelo fluxo sem a IA contornar a
ferramenta, e o gate e o crítico por unidade apontam as ligações que faltam e as
peças sem função antes de a imagem chegar à pessoa.

## Incluído

- os seis bugs acima, cada um com teste de reprodução mínima, e também
  `--remover a,b`, `--adicionar` com `arranja`, `arranja` radial com centro por
  expressão no `--detalhar`, e o aviso de ciclo que sobrevive a `--mover`;
- a conectividade estrutural no contrato: `plano.contrato.fixa` declara que uma
  peça precisa estar presa a outra por pelo menos N pontos de contato distintos
  (um motor ao quadro por dois), e o gate reprova a peça que só toca por um
  pino;
- o componente `roda` com raios, e perfis de pneu e de disco de freio por
  função (`gerar`);
- a forma `envolve`: faixa de largura e espessura dadas que contorna uma lista
  ordenada de círculos (centro, raio, eixo) por tangentes e arcos, para correia,
  corrente, esteira e cabo em polia; os elos saem pelo `arranja` sobre o caminho;
- o achado de ponta livre no gate: ponta de tubo, haste ou cilindro que não
  encosta em nada, ou várias pontas que terminam no mesmo ponto sem forma que as
  una, sem declaração de `ponta`;
- o crítico visual por unidade já no `--feito` de unidade com mais de 8 formas
  (e também no Marco): o orquestrador despacha o crítico cego com as quatro imagens
  `--unidade`, em resolução suficiente (`--largura <px>`), e a `funcao` da
  unidade, sem a história da construção; ele responde que pontas ficam no ar, o
  que atravessa o quê, o que está fora do lugar em relação à parte a que deveria
  estar preso e o que a vista mostra que o nome não explica;
- ferramentas para a IA (fatia 4): bloco `modulos` no esboço, com parâmetros e
  formas reutilizáveis por `usa`, e uma biblioteca genérica pequena (parafuso,
  mola, engrenagem, rolamento, perfil estrutural, dobradiça); `--corte
  <eixo>=<valor>` e `--explodir` por unidade; `ligar: [A.ancora, B.ancora]` e
  `encaixa`, que criam a haste ou posicionam a peça pela âncora; `--ligacoes`,
  mapa de ligações em texto (quem toca quem, pontos, pontas livres, unidades
  presas a nada), também entregue ao crítico; modo de prévia com menos facetas,
  `--unidade` que só redesenha a unidade mudada e `--zoom-forma <id>`;
- o campo `funcao` por unidade no plano, uma frase (por exemplo "laço fechado
  que contorna coroa e pinhão"); unidade com mais de 8 formas sem `funcao` não
  passa no `--feito`;
- `--medidas` em texto, com o valor medido ao lado de cada medida do plano, e
  `--feito` que imprime só os Marcos novos;
- a orquestração (fatia 6): a skill `esbocar-opcoes` volta a ser só a escolha
  de forma no alinhamento e o fluxo do esboço detalhado vai para a skill nova
  `esboco-detalhado`; a skill `laco-do-esboco` conduz a sessão principal
  (despacha um `esbocista` por objeto, espera cada `--feito`, despacha o crítico
  cego, devolve nota e motivo, registra o veredito, decide refazer ou parar e
  mede no fim); o agente `esbocista` modela um objeto pela `esboco-detalhado`,
  para a cada `--feito` com brief e não mexe no código do módulo; o
  `critico-visual` passa a cobrir o julgamento de unidade pela `funcao`, sem
  desenho alvo.

## Excluído

- a ponte entre o esboço e o Mecanifica, que fica para depois;
- a conferência com foto real, que espera uma referência;
- mudança no núcleo do Mecanifica;
- curva livre e seção côncava de loft.

## Gate de saída

1. Os seis bugs e os quatro ajustes de comando têm teste que falhava antes.
2. `plano.contrato.fixa` reprova uma peça presa por um só ponto e aprova a presa
   por dois, com teste.
2a. O Condutor recusa seguir com veredito abaixo de 8 antes de três rodadas e,
   depois delas, só segue com `--liberar` e motivo, com teste.
3. A `roda` com raios, o perfil de pneu e de disco e o `envolve` saem sem Python.
4. A moto e a escavadeira refeitas pelo `laco-do-esboco` têm nota 8 ou mais do
   crítico cego em cada unidade com brief, dada antes da unidade seguinte (o
   `--condutor --historico` mostra o veredito de cada uma), e a moto sai sem os
   defeitos já apontados (motor preso, escapamento com terminação, rabeta com
   suporte).
5. Nenhuma das duas precisa contornar um comando.
6. A pessoa confirma, olhando a moto e a escavadeira, que as ligações faltantes
   sumiram.
7. `npm run gates --completo` passa.

## Fatias

1. (feita) Os seis bugs e os ajustes de comando, com teste (`correcoes-do-fluxo.test.js`).
2. (feita) `plano.contrato.fixa`, a `roda` com raios, os perfis de pneu e de disco, o `envolve`, a ponta livre, a `funcao` por unidade e o crítico por unidade no `--feito`.
3. (feita) O crítico por unidade também no Marco, `--medidas` e o Marco incremental (este já vinha da fatia 1).
4. (feita) As ferramentas para a IA: `modulos` e biblioteca, `--corte` e `--explodir`,
   `ligar` e `encaixa`, `--ligacoes`, prévia rápida, `--unidade` incremental e `--zoom-forma`.
5. (feita) Os treze atritos da primeira refeita (`fatia5/ATRITOS.md` no scratchpad da
   sessão), cada um com teste que falhava antes: referências de módulo dentro
   de `envolve`, `estilo` e `arranja`; `arranja` em instância espelhada ou
   oculta; `--integrar` devolvendo `modulos` e `simetrico`; `--editar` em
   `pontos` e `parametros` e acrescentando forma a uma unidade; `fixa` com nome
   ambíguo entre unidade e forma; `lado` em componente e em `ligar`; `--remover`
   limpando juntas; âncoras `inicio`/`fim` da caixa por `de`/`para`; e
   `--integrar` sem gravar o detalhe que não cabe no Envelope. A skill
   passa a dizer que quem modela sem poder despachar agente para em cada
   `--feito` e devolve o brief a quem o chamou, que despacha o crítico e devolve
   a nota antes da unidade seguinte.
6. (feita) A orquestração: separar a `esboco-detalhado` da `esbocar-opcoes`, criar a
   `laco-do-esboco` e o agente `esbocista`, ajustar o `critico-visual` e
   atualizar quem aponta para a skill antiga (README do módulo,
   `PARE-E-ANALISE.md`, `docs/modelar/usar/README.md`, mapa).
7. (feita) A regra da nota no Condutor e a inspeção antes do `--feito`, achadas na
   empilhadeira que outra IA esboçou (cabine fechada com notas 3, 5 e 6, Marco
   50 com 6, 5 e 3, e o fluxo seguiu). O Condutor recusa a unidade seguinte
   enquanto o último veredito da unidade estiver abaixo de 8 e houver menos de
   três rodadas; na terceira sem 8, trava e só segue com
   `--liberar <unidade> --motivo <texto>`, que exige a autorização explícita da
   pessoa (a skill manda pedir antes) e fica no histórico. O `esbocista` e a
   `esboco-detalhado` mandam abrir as quatro imagens da unidade antes do
   `--feito`.
8. (feita) O custo de contexto. A skill `esboco-detalhado` (33 KB, lida inteira por
   todo esbocista) se divide num núcleo curto com o fluxo e as regras e numa
   referência por ferramenta, lida só quando a ferramenta é usada, sem perder
   instrução (conferido frase a frase: as 152 frases da skill antiga estão no núcleo ou nas referências). A `laco-do-esboco` ganha o modo de um
   `esbocista` novo por unidade, que lê o estado do disco (plano, Condutor,
   vereditos e a nota de passagem da unidade anterior), como o laço de
   modelagem já faz. O `descrever --listar` passa a achar as partes em
   subpastas de `procedural/pecas/`.
9. (feita como medição, interrompida com o aceite da pessoa) A moto e a escavadeira refeitas outra vez pelo `laco-do-esboco`, um
   `esbocista` por objeto, com o crítico entre unidades, medidas no transcript
   (formas por relação contra coordenada absoluta, imagens abertas, contornos),
   anatomia prévia opcional, e o fechamento. A moto vai com um esbocista novo
   por unidade e a escavadeira com um esbocista só, e o transcript compara os
   tokens dos dois modos. A primeira refeita fica como
   medição: 11 e 10 formas absolutas em 196 e 204, 18 imagens abertas em 338
   chamadas, nenhum crítico entre unidades e treze contornos.

## Riscos e desvios

O risco maior é a coerência funcional ser o que nenhuma medida pega, e o plano
virar uma lista infinita de regras por objeto. O desvio é manter a conectividade
genérica (pontos de contato distintos, sem citar objeto) e deixar o resto ao
crítico por unidade. Se o crítico e a pessoa divergirem de forma sistemática, o
plano para e volta à pessoa. A ponte do crítico pela sessão principal custa uma
volta por unidade; se ela tornar a refeita lenta demais, a alternativa é o
crítico só nas unidades com mais formas e no Marco, decidida com a pessoa.

## Fechamento

Fechado em 2026-10-06. As fatias 1 a 8 entregaram o que prometiam, com teste,
e os itens 1, 2, 3 e 7 do gate de saída estão cumpridos (`npm run gates
--completo` com 32 de 32). Os itens 4, 5 e 6 não estão: a refeita da fatia 9
foi interrompida com o aceite da pessoa e ficou como medição.

A medição: a moto no modo de um esbocista novo por unidade fechou 4 de 18
unidades com cerca de 700 mil tokens (de 71 a 95 mil por unidade pequena) e a
escavadeira no modo objeto fechou 1 de 8 com cerca de 260 mil. As notas do
crítico pararam entre 6 e 7 em nove rodadas, porque cada rodada resolve o
apontado e o crítico acha outro detalhe. Na mesma rodada entraram a vista de
unidade com as peças vizinhas, o `--feito` que regrava o brief de unidade
refeita e o Marco que deixa refazer as unidades que ele cobre (commit
`1b1f0ad5`).

Ficam em aberto, com o comando que reproduz nos `ATRITOS.md` da medição: as
peças vizinhas em cinza não têm nome e o crítico leu a longarina do quadro
como guidão; o `--integrar` e o `--feito` não rodam o gate do mestre, e uma
colisão com forma oculta só apareceu depois; o crítico não tem escala
ancorada nem recebe os defeitos da rodada anterior; o esbocista tirou o rolete
de cima e mudou a `funcao` para o defeito sumir; uma junta por padrão com `max`
de 170 mm deixava qualquer par do grupo se atravessar; o `--editar` não muda
campos do `plano`; o brief não é gravado em arquivo. A medição também mostrou
que a maior parte do custo foi reconstruir mecanismos comuns (esteira, garfo)
a partir de primitivas, e é isso que o plano seguinte ataca.

## Depois deste plano

O plano seguinte é [o catálogo de famílias](2026-10-06-o-catalogo-de-familias.md),
que absorve a ponte entre o esboço e o Mecanifica. O banco de provas segue como
candidato, e [as partes do braço](../congelados/2026-09-26-as-partes-do-braco.md)
continuam congeladas.

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

O módulo `modulos/esboco/` está na `main` com a numeração automática sem
duplicar, `linhasCentro` no topo do JSON, `ocultar` e `oculto`, legendas em
lista com balões sobre a peça, o campo `plano`, o "Pare e planeje" e o "Pare e
analise" do esboço com a matriz de vistas sem linhas de centro, e o gate de
contato opt-in com `tolerancia`, `penetracao`, `folga`, pares `atravessa`,
`encosta` e `livre` e `atravessamentos` com profundidade. Esta seção é o que este
plano não refaz.

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

- a leitura em texto, `--descrever`, com cada forma resolvida (centro, extensões,
  eixo), o grafo de quem toca quem, as âncoras livres, as sobreposições em
  três dimensões e por vista, e o `--descrever --mudou`, que mostra só o que
  mudou desde a última execução (o que passou a tocar em quê, o que ficou solto,
  o que apareceu de novo), para a IA editar o JSON em passos pequenos e ler a
  diferença em milissegundos, sem despejar o estado inteiro;
- a sobreposição na projeção por vista: cada par cujas silhuetas se cobrem
  além de um limiar, quem está na frente, e o que resolve (outra vista, vista
  explodida por eixo, arestas ocultas tracejadas, opacidade), sem a IA declarar
  camadas à mão;
- âncoras nomeadas em cada forma (centro, pontas do eixo, faces, aro) e o
  posicionamento por elas: `tubo` entre dois pontos, `encostar` com direção e
  folga, `alinhar` de eixos;
- simetria e repetição: `espelho` por eixo, com o gate tratando o par, e
  `arranja` linear e radial;
- `params` e valores por expressão (`"=entreEixos/2"`), para duas variantes
  diferirem em dois números;
- componentes parametrizados (`usa: "roda"`, `garfo`, `quadro de caixas`, `mancal`)
  como uma pequena biblioteca em JSON;
- as formas que o inventário do estudo pedir: tubo por pontos com raio, esfera,
  cone e tronco, extrusão de polígono, chanfro;
- o gate propondo o conserto (mova X em Y mm para encostar em Z) e `--ajustar`
  gravando um arquivo novo com o deslocamento aplicado, sem sobrescrever;
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

O trecho abaixo é a proposta do estudo para a moto, e não está implementado. A
haste sai de `de` e `para`, o lado direito do espelho, e o café racer diferiria
do naked por `parametros` na opção.

```json
{
  "parametros": { "entreEixos": 1400, "raioFrente": 300, "raioTras": 310 },
  "pontos": { "cabecote": [0, 898, 421.5] },
  "opcoes": [{ "titulo": "A. Naked", "formas": [
    { "id": "rodaFrente", "tipo": "anel", "diametroExterno": "=2*raioFrente", "diametroInterno": 420, "espessura": 110, "eixo": "x", "centro": [0, "raioFrente", "=entreEixos/2"] },
    { "id": "garfoE", "tipo": "cilindro", "diametro": 46, "de": "rodaFrente.centro", "para": "cabecote", "desloca": [-90, 0, 0] },
    { "id": "garfoD", "espelha": { "forma": "garfoE", "eixo": "x", "pos": 0 } },
    { "id": "tanque", "tipo": "caixa", "largura": 300, "altura": 200, "profundidade": 420, "encosta": { "referencia": "motor", "direcao": [0, -1, 0] }, "desloca": [0, 0, 110] }
  ] }],
  "contato": { "usar": true, "pares": [
    { "a": "garfoE", "b": "guidao", "tipo": "atravessa", "max": 15, "motivo": "a presilha do guidão abraça a bengala" }
  ] }
}
```

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
   pedido, por exemplo `--forma garfoE.perna`.
10. Todo achado do gate vem com uma imagem própria: o par envolvido colorido, o
    resto em cinza, sem legenda numerada e com zoom no ponto.
11. O contrato de relações (o que deve tocar, o que deve ficar livre, o que deve
    ser simétrico) é declarado no JSON e conferido pelo gate contra o medido.
12. A conferência contra a foto mede, por vista e por parte, o desvio da
    silhueta em milímetros e a razão entre interseção e união, e reprova acima
    da tolerância declarada.
13. A skill proíbe a IA de auditar por imagem com legenda numerada e descreve o
    fluxo contrato, medidas da referência, construção por subsistema, montagem,
    conferência numérica, crítico sem contexto e pessoa.
14. `npm run gates --completo` passa.

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
8. A validação da moto detalhada (2026-09-30) mostrou o que falta, na ordem em
   que entra: primeiro as formas curvas (perfil côncavo, afunilamento, loft por
   seções e superfície de revolução), porque tanque, banco e carenagem saíram
   como caixas e extrusões convexas e a moto ficou sem cara de moto; depois o
   desempenho (o `--analise` levou 6 min com uma opção e 11 min com duas, quase
   tudo na sugestão de explosão; meta de menos de 20 s por moto, com cache de
   silhuetas, filtro de pares por caixa envolvente e `sugerir` fora do padrão);
   depois o contrato de relações no JSON, com `junta {pecas, max, motivo}` no
   lugar de dezenas de pares `atravessa` (a moto teve 26), pontos-guia nomeados
   no `caminho` do tubo e âncora com deslocamento; a leitura padrão do
   `--descrever` reduzida às divergências, com o detalhe por forma só sob
   pedido; a projeção agrupada por componente, sem espelhos nem contatos abaixo
   de 10 mm, com os N achados mais graves (a moto teve 107); a imagem por
   achado, com o par colorido e sem legenda; e o esquema do JSON com mensagem
   que diz o campo e o valor válido, junto dos bugs achados (`r.pneu` visível na
   leitura e recusado em `alinha`, concordância de `arranja.nomes`, "volume"
   que é caixa envolvente).
9. A referência e o fluxo. A conferência numérica contra a foto, reaproveitando
   `conferir:referencia`, com o desvio por parte e por vista; a extração das
   medidas da foto para parâmetros, com a origem de cada número; o fluxo na
   skill, com o construtor por subsistema, o montador, o leitor de referência e o
   crítico visual sem contexto recebendo só imagens limpas; e a proibição de
   auditar por legenda numerada. Depois, a moto detalhada de prova sem centro
   calculado à mão, as fixtures com resultado esperado (moto, mancal e casa) e o
   fechamento do plano.

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

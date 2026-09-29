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

## Filtro Agent-First

A operação é ENVOLVER onde o Mecanifica já tem o mecanismo (`encostar`, `espelha`,
`arranja`, `TABELA` e `derivar`, portas e relações, `auditar-intersecoes-montagem`)
e escrever dentro do esboço só o que ele não tem: a projeção por vista e as
formas novas. Escrever um resolvedor de restrições geral é ADIADO, porque
encostar, alinhar e espelhar cobrem o que as fotos pedem. Importar a malha de
uma peça real dentro do esboço também é ADIADO.

## Incluído

- a leitura em texto, `--descrever`, com cada forma resolvida (centro, extensões,
  eixo), o grafo de quem toca quem, as âncoras livres, as sobreposições em
  três dimensões e por vista;
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
- a decisão sobre unificar o gate de contato com `auditar-intersecoes-montagem`
  ou mantê-lo dentro do módulo, e o que apagar de duplicado;
- validação do JSON por esquema, com mensagem que diz o campo e o valor
  válido, e um resumo compacto do formato para a IA na skill;
- desempenho: SVG e tempo menores, e um modo rápido sem PNG;
- a conferência contra referência: a silhueta do esboço sobreposta à foto na
  mesma escala, reaproveitando `conferir:referencia`;
- fixtures com resultado esperado: a moto de prova, o mancal e a casa, com o
  gate e as imagens de referência.

## Excluído

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
9. `npm run gates --completo` passa.

## Fatias

1. O estudo do que reaproveitar do Mecanifica, as decisões de acoplamento e o
   formato do JSON com a compatibilidade escrita.
2. `--descrever` e as âncoras nomeadas.
3. A sobreposição na projeção por vista, com vista explodida e arestas ocultas
   tracejadas.
4. `tubo`, `encostar` e `alinhar`.
5. `espelho`, `arranja`, `params` e expressões.
6. O gate propondo o conserto e `--ajustar`.
7. Componentes e as formas novas.
8. Desempenho, esquema do JSON e conferência contra referência.
9. A moto de prova, as fixtures e o fechamento.

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

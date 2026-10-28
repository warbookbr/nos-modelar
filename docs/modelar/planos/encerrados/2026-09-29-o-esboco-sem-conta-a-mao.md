# O esboço sem conta à mão

**Estado:** concluído

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

O Mecanifica já resolve várias dessas dores para peças e montagens (`encostar`,
`espelha`, `arranja`, `TABELA` com `derivar`, portas e auditoria de
interseções), e o custo de reaproveitar cada uma, com o esboço independente do
núcleo, foi a primeira decisão do plano.

## Resultado

Um conjunto de umas doze peças se esboça descrevendo relações e parâmetros, e não
coordenadas calculadas: peças encostadas por face ou por ponta, hastes entre dois
pontos, simetria por espelho e variantes por parâmetro. A ferramenta diz, em
texto e na imagem, o que está ligado, o que se atravessa e o que parece
sobreposto em cada vista, com o que cobre o quê, e propõe o conserto em milímetros. A IA
verifica o esboço por texto antes de gerar a imagem, e o arquivo antigo continua
gerando o mesmo desenho, byte a byte.

## O que o estudo do Mecanifica decidiu

Um estudo de leitura de 2026-09-29 mediu cada mecanismo contra o esboço. Só
dois arquivos entram como estão: `procedural/nucleo/expressoes.js` (número, nome
de parâmetro e `"=a+b*c"`, 92 linhas, sem import) e `poseQueEncaixa` de
`src/autoria/posicao-por-porta.js`, que calcula o centro e o ângulo de uma haste
entre dois pontos (o garfo saiu em 24,97°, contra os −25° digitados à mão). O
resto se reimplementa sobre os prismas do esboço: `encostar`, `espelha` e o
ponto nomeado. Não servem, e ficam fora: as interfaces de porta, as relações
`assentaAnular` e `encaixaCilindrico`, o resolvedor e a montagem v5, os
`vinculos`, as `etapas`, o `PLANO` do Mecanifica e `auditar-intersecoes-montagem`
(sem milímetros e sete vezes mais lento). O gate do esboço fica no módulo.

O esboço herda o contrato de declaração do Mecanifica: toda exceção declara
`motivo` de pelo menos 15 caracteres, `atravessa` exige `max`, e `livre`, que
cala o par por completo, deixa de ser saída livre. O `historico/PLANO-ESTADO-DA-ARTE-ESBOCO.md`
do módulo, que propunha `de`, `para` e espelho, foi absorvido por este plano.

## Filtro Agent-First

A operação é ENVOLVER onde o estudo achou arquivo puro para importar
(`expressoes.js` e `poseQueEncaixa`) e reimplementar a ideia onde o mecanismo
do Mecanifica exige malha, metro ou montagem. Escrever um resolvedor de
restrições geral é ADIADO, porque encostar, alinhar e espelhar cobrem o que as
fotos pedem. Importar a malha de uma peça real dentro do esboço também é
ADIADO. O módulo continua independente do núcleo, e isso é registrado no
README dele.

## Incluído

- feitas nas fatias 2 a 7: `--descrever` (e `--mudou`), a sobreposição na
  projeção por vista com vista explodida, âncoras nomeadas, `tubo`, `encostar`,
  `alinhar`, `espelho`, `arranja`, `params` e expressões, `--ajustar`, os
  componentes parametrizados e as formas novas (tubo, esfera, cone, extrusão);
- o contrato de declaração do gate herdado do Mecanifica: `motivo` de pelo menos
  15 caracteres em toda exceção, `max` obrigatório em `atravessa`, o par do
  espelho herdando a declaração do original, e a decisão de política de a skill
  ligar o gate por padrão a partir de umas quatro formas;
- o registro, no README do módulo, de que ele é independente do núcleo e só
  importa `expressoes.js` e `poseQueEncaixa`, e a substituição do
  `historico/PLANO-ESTADO-DA-ARTE-ESBOCO.md` por este plano;
- validação do JSON por esquema, com mensagem que diz o campo e o valor
  válido, e um resumo compacto do formato para a IA na skill;
- desempenho: SVG e tempo menores, e um modo rápido sem PNG;
- a conferência contra referência, reaproveitando `conferir:referencia`, e
  fixtures com resultado esperado: a moto de prova, o mancal e a casa.

## Formato proposto

A proposta do estudo (haste por `de` e `para`, lado direito por espelho, café
racer por `parametros` na opção) está implementada e descrita no README do
módulo, que é a referência do formato.

## Excluído

- as portas com raio, as relações `assentaAnular` e `encaixaCilindrico`, a
  montagem v5 com o resolvedor, os `vinculos`, as `etapas` e o `PLANO`
  estruturado do Mecanifica, e a chamada a `auditar-intersecoes-montagem`;
- uma linguagem de comandos incrementais (`adiciona`, `encosta`, `espelha`),
  REABERTA na fatia 10 só como `--editar <forma>.<campo>=<valor>`, porque a moto
  nova gastou 20 remendos em Python; o resto da linguagem segue adiado;
- importar a malha de uma peça real dentro do esboço;
- render tridimensional com sombreamento e cotas dimensionais na imagem, que
  são o fluxo da prancha;
- gerar a receita da peça a partir do esboço;
- mudança no núcleo do Mecanifica.

## Gate de saída

1. A moto de doze formas sai descrita com relações, `tubo`, `espelho` e
   `params`, sem nenhum centro calculado à mão, e passa no gate de contato.
   Atendido em 2026-09-30 por `moto-curvas.esboco.json`: nenhum literal não nulo
   em `centro`, `de` e `para`, um só `desloca` (o garfo ao lado da roda, -100
   mm) e o gate aprovado nas duas opções (`tests/esperado.test.js`).
2. `--descrever` lista o grafo de contatos e as sobreposições, e a moto de prova
   confere com a imagem.
3. O gate mede a sobreposição na projeção e diz quem cobre quem, com teste: o
   garfo ao lado da roda é acusado na isométrica e não na frontal.
4. O conserto proposto pelo gate, aplicado por `--ajustar`, resolve o achado,
   provado por teste.
5. O naked e o café racer diferem só por `params`.
6. Todo `.esboco.json` existente gera o mesmo SVG, byte a byte.
7. O número de valores escritos à mão no JSON da moto cai pelo menos pela
   metade contra o de hoje (medido no arquivo). Atendido só em parte, medido em
   2026-09-30: a moto de 12 formas tem 41 números contra 83 da original, mas a
   moto curva tem 98, porque o perfil de tanque, banco, carenagem e farol são
   71 números de desenho que a original não tem; sem eles são 27. Não cumpre
   contada inteira, e o número fica em `moto-curvas.esperado.json`.
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
    da tolerância declarada. Atendido em 2026-09-30 por `plano.referencia` e
   `--referencia` (`src/referencia.js`): IoU e desvio máximo em mm por vista e
   por parte, reprovação na leitura padrão e no Portão da Conferência; o teste
   usa contornos sintéticos: o esboço igual dá IoU 1,00, e o deslocado 30 mm
   reprova com 30 mm em seis casos (`tests/referencia.test.js`).
13. A skill proíbe a IA de auditar por imagem com legenda numerada e descreve o
    fluxo contrato, medidas da referência, construção por subsistema, montagem,
    conferência numérica, crítico sem contexto e pessoa. O fluxo e a proibição
    estão escritos na skill e no `PARE-E-ANALISE.md` (`tests/skill.test.js`), com
    a conferência contra a foto (item 12) e o crítico cego no Marco.
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
    cada 25% do custo estimado das unidades feitas, com imagens limpas. Atendido
    em 2026-09-30: o Marco registra "chamar crítico" (o despacho é da skill, que
    manda o crítico cego), e cada unidade guarda caixa e portas (na moto curva,
    11 unidades e 13 portas). `--envelope <unidade> <detalhado>` confere caixa
    e portas, e com `plano.envelope` o Portão do Detalhe o exige.
20. A moto nova refeita pelo fluxo da fatia 10 escreve menos de metade do código
    auxiliar (Python ou JSON avulso) da rodada de 2026-09-30, sem nenhum script
    fora da ferramenta, medido no transcript.
21. `npm run gates --completo` passa.

## Fatias

1. As decisões do estudo postas em código e texto: importar `expressoes.js` e
   `poseQueEncaixa`, registrar a independência no README, absorver ou apagar o
   `historico/PLANO-ESTADO-DA-ARTE-ESBOCO.md`, e o contrato de declaração do gate (`motivo`,
   `max` obrigatório, `livre` restrito) com o formato do JSON e a compatibilidade
   escritos.
2. `--descrever`, o `--descrever --mudou` e as âncoras nomeadas.
3. A sobreposição na projeção por vista, com vista explodida e arestas ocultas
   tracejadas.
4. `tubo`, `encostar` e `alinhar`.
5. `espelho`, `arranja`, `params` e expressões.
6. O gate propondo o conserto e `--ajustar`.
7. Componentes e as formas novas. Feita em 2026-09-30: `usa` com `roda`, `garfo`,
   `quadro` e `mancal`, o ponto `entre`, e `tubo`, `esfera`, `cone`,
   `extrusao` e `chanfro`; a moto de prova com componentes ficou com 35 números
   escritos à mão.
8. A validação da moto detalhada (2026-09-30), feita no mesmo dia: formas
   curvas (`extrusao` côncava, `loft`, `revolucao`), desempenho (`--analise` de
   11 min para 36 s, teste da moto de 47 s para 3,3 s), `contato.juntas`,
   pontos-guia, `{ ancora, mm }`, leitura padrão só com divergências, imagem
   por achado, `plano` estruturado, esquema do JSON e o Condutor com Plano de
   detalhe, Envelope e Marco, descritos no README do módulo.
9. A referência e o fluxo (2026-09-30): o fluxo na skill e no `PARE-E-ANALISE.md`,
   a conferência contra a foto, `--medidas-da-referencia`, o `--envelope` e as
   fixtures com `.esperado.json`.
10. A análise do transcript da moto nova (47 min, 138 chamadas, 106 KB de
    código auxiliar) pediu e entregou, em 2026-10-01: `unidade` declarada,
    junta dentro da mesma unidade sem declaração, `--detalhar` e `--integrar`,
    `--mover-lote`, caminhos pelo `INIT_CWD`, `--editar`, `estilos`, simetria
    implícita, perfis por função, Envelope por forma, `--unidade` e
    `plano.pecas`. Duas rodadas de medição (moto e mini escavadeira)
    confirmaram o ganho e acharam os seis bugs que seguem para o plano novo.

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

Fechado em 2026-10-01. O módulo `modulos/esboco/` passou a descrever o esboço por
relações, parâmetros e unidades, e não por coordenadas calculadas à mão. Em dez
fatias entraram as âncoras nomeadas e `--descrever` com `--mudou`; a
sobreposição na projeção com vista explodida; `tubo`, `encosta` e `alinha`;
`espelha`, `arranja`, parâmetros e expressões; o gate que propõe o conserto em
milímetros e o `--ajustar`; os componentes `roda`, `garfo`, `quadro` e
`mancal` e as formas `esfera`, `cone`, `extrusao`, `chanfro`, `loft` e
`revolucao`; o desempenho (`--analise` de 11 min para 36 s na moto de 66
formas); o contrato de relações com `juntas`, `plano.medidas`, `plano.contrato`
e `plano.pecas`; a leitura padrão só com divergências e a imagem por achado; o
Condutor com unidades, Envelope e Marcos; a conferência contra a foto; e, na
décima fatia, `unidade` declarada, junta dentro da mesma unidade sem declaração,
`--detalhar` e `--integrar`, `--editar`, `estilos`, simetria implícita, perfis
por função, Envelope por forma e `--unidade`. O módulo foi de 29 para 482
testes e `npm run gates` fecha com 32/32 verdes.

O gate de saída ficou provado assim. A moto de doze formas sai sem centro
calculado à mão em `moto-parametros` (41 números escritos contra 83) e em
`moto-componentes` (35); a moto de formas curvas tem 98 números, 71 deles dos
perfis de tanque, banco, carenagem e farol, que a primeira não tinha. A
conferência contra a foto foi provada com silhueta sintética, e ainda não com
foto real. O item 20 foi medido no transcript de duas rodadas independentes: a
moto de 165 formas escrita à mão gastou 138 chamadas e 106 KB de código que
gera ou remenda o JSON, e a moto nova de 219 formas e a mini escavadeira de 173
formas gastaram cerca de 10 KB, sem Python, com mais JSON escrito direto (47 KB
na moto). O crítico cego deu 7 de 10 à moto nova, contra 6,5 à primeira. Em
2026-10-01 a pessoa viu a moto e a mini escavadeira, as reconheceu como o que
deviam ser e aceitou a qualidade para fechar o plano, com os defeitos
restantes indo para o plano seguinte.

Ficou fora, e vai para [o esboço detalhado coerente](2026-10-01-o-esboco-detalhado-coerente.md):
seis bugs achados nas duas rodadas (espelho de instância com `unidade`,
`--feito` com colisão aberta, tolerância do `--detalhar`, formato do JSON no
`--editar` e `--integrar`, Marcos pelo custo congelado, mensagem do máximo
implícito), a coerência funcional que o gate de contato não vê (motor preso ao
quadro, escapamento ligado, rabeta) e a `roda` com raios. A ponte entre o
esboço e o Mecanifica continua para depois, e `--sugerir` ainda leva 32 s por
opção.

## Depois deste plano

O plano seguinte é [o esboço detalhado coerente](2026-10-01-o-esboco-detalhado-coerente.md),
e depois dele [as partes do braço](../congelados/2026-09-26-as-partes-do-braco.md),
congeladas em 2026-09-29 para dar lugar a este. A ponte entre o esboço e o
Mecanifica (um esqueleto de montagem por forma, com o gate de encaixe da peça
real no volume do esboço) também fica para depois, e exige decidir antes como o
módulo, independente do núcleo, entrega o esqueleto sem importá-lo.

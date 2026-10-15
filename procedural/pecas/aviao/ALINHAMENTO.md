# Avião de pequeno porte — o objeto no núcleo

Registro da passagem do avião do esboço à receita, fatia 1 do plano [o avião do esboço
à receita](../../../docs/mecanifica/planos/2026-10-15-o-aviao-do-esboco-a-receita.md),
em 2026-10-15. O objeto, a escala, as partes, o que se move, o realismo e o que
reprova foram combinados com a pessoa no
[alinhamento do avião](../../../docs/mecanifica/banco-de-provas/aviao-2026-10-11/ALINHAMENTO.md),
e a forma foi aprovada por ela no [esboço da segunda
rodada](../../../docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json)
em 2026-10-13. Este arquivo não refaz nada disso: diz como o esboço vira peças do
núcleo. As referências continuam no banco de provas, apontadas por
[`referencias.json`](referencias.json), com os contornos e as pranchas aceitos.

## As partes no núcleo

Cada unidade do esboço vira uma peça, com a receita em `partes/<parte>/receita.js` e o
mesmo nome da unidade, e as formas da unidade viram as partes da receita. A receita
refina o [andaime](andaime.json) que o esboço traduz, gravado com
`npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json --andaime procedural/pecas/aviao/andaime.json`,
e declara em `REFINA.partes` qual volume do andaime cada parte dela refina.

| peça | o que é, pelas formas do esboço |
|---|---|
| `fuselagem` | o casco por seções da fuselagem, o para-brisa e o montante dele, as oito janelas, a porta traseira e a barbatana ventral |
| `motor` | o capô, a entrada de ar e os dois escapes |
| `helice` | o cone e as cinco pás |
| `asas` | as duas metades da asa com a ponta levantada, os flaps, os ailerons, os eixos deles e os suportes |
| `empenagem-horizontal` | as duas metades do estabilizador, os profundores, os eixos e os suportes |
| `empenagem-vertical` | a deriva, a dorsal, o leme, o eixo dele e as dobradiças |
| `trem-do-nariz` | a carenagem, o pivô e os mancais, a alavanca e o atuador, o compasso, a perna, o pistão, o garfo, o eixo e a roda |
| `trens-principais` | os dois trens, cada um com a perna, o pivô, a coroa, o garfo, o eixo, a roda, o compasso e o atuador |

## A ordem de montagem

A fuselagem primeiro, porque todas as outras peças se prendem nela; depois o motor, na
frente dela, e a hélice, no motor; as asas; a empenagem horizontal e a vertical, na
cauda; e os dois trens. Cada peça entra na montagem (`montagem.json`), na ordem das
etapas, com uma receita planejada, só com o `PLANO` e sem passos, que o modelador
completa na etapa dela, e a guarda do acervo a trata como planejada. Até 2026-10-15 a
montagem ganhava a peça só quando a receita existia, e `npm run objeto` dava o avião
por completo com duas etapas de oito.

## O quadro e a escala

O andaime está em milímetro, no quadro do esboço: a proa em z 0 e a cauda em z 10.461,
x para a direita do piloto e y para cima. O núcleo trabalha em metro, no mesmo quadro,
com a mesma origem e os mesmos eixos, como o contrato do refinamento pede. A escala é
a do alinhamento, a envergadura de 12.800 mm.

## A pose

As receitas ficam na pose de pouso: os trens baixados, as superfícies de comando
neutras e a hélice parada na pose do esboço. O curso de recolhimento dos trens e o
giro da hélice e das superfícies continuam no esboço, onde o gate de curso os confere,
porque montagem com pose e cinemática é capacidade em aberto no núcleo.

## O que reprova

Os sete critérios do alinhamento valem, com o quinto só na pose de pouso: o trem não
atravessa a asa nem a fuselagem baixado. E a peça reprova quando o `REFINA` acusa
parte fora do envelope do volume que ela refina, parte sem volume ou porta fora do
lugar.

## A tradução

A [tradução](../../../docs/mecanifica/banco-de-provas/aviao-receita-2026-10-15/TRADUCAO.md)
mostrou que a fuselagem, o motor e os trens saem no andaime com o envelope do
esboço, e que as asas, as empenagens e a hélice não: a N2 não subtrai o recorte e
não inclina o sólido. A fuselagem é a primeira peça; as superfícies esperam a decisão
da pessoa sobre o que falta ao contrato.

## O plano da fuselagem

É a primeira etapa. A receita fica em `partes/fuselagem/receita.js`, com o nome
`aviao/fuselagem`, e as formas e as medidas vêm da unidade `fuselagem` do esboço
aprovado; o [detalhe da unidade](../../../docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao-detalhe-fuselagem.esboco.json)
e o mestre trazem as seções, os cortes e as posições.

- `fuselagem`: o casco por seções, com as 20 seções de retângulo arredondado do
  esboço, de z 2377 a z 10.461, e a transição lisa entre elas; com os vãos da porta
  e das oito janelas recortados no casco, onde a porta e as janelas assentam.
- `parabrisa`: o vidro do para-brisa, rente ao casco, assentado numa abertura recortada
  nele, no contorno em planta do esboço (até 2026-10-15 era a casca saliente do esboço).
- `montanteParabrisa`: a barra central do para-brisa, apoiada no vidro de ponta a ponta.
- `janela1D` a `janela4E`: as oito janelas, placas de canto arredondado nos vãos.
- `porta`: o painel da porta traseira, do lado esquerdo, no vão dela.
- `barbatana`: a aleta ventral sob a cauda.

O `REFINA` aponta `../../andaime.json` e liga cada parte ao volume que ela refina:
`fuselagem`, `parabrisa`, `porta` e `barbatana` aos volumes de mesmo nome, cada
janela ao seu (`janela1-d` a `janela4-e`), e o `montanteParabrisa`, que o andaime
não traduz porque é uma caixa de canto arredondado inclinada, ao volume
`fuselagem`, dentro de cujo envelope ele fica. A tolerância do envelope é de 5 mm.

A escala é o comprimento da fuselagem no esboço, 8084 mm, de z 2377 a z 10.461. Os
contatos são o para-brisa, as janelas, a porta e a barbatana com a fuselagem, e o
montante com o para-brisa.

Reprova a fuselagem: facetada ou com degrau visível entre seções; com o perfil de
lado ou de cima fora do esboço (o topo da cabine, a curva do para-brisa e o
afinamento até a cauda); com porta ou janela sem vão, uma placa por cima do casco;
com parte solta, sem encostar na fuselagem; com o `REFINA` acusando parte fora do
envelope; e com o comprimento a mais de 3% de 8084 mm.

A fuselagem ficou fixa em 2026-10-15 com o aceite da pessoa, depois de duas rodadas
com nota 8; o para-brisa anguloso, a ondulação de 20 a 30 mm na linha de baixo entre
o capô e a cabine e a largura da cabine contra a foto de topo, que inclui a carenagem
da raiz da asa, vêm do esboço aprovado e ficam como pendência.

Depois do motor, na mesma data, a pessoa pediu o para-brisa rente ao casco, como as
janelas: no esboço ele é uma casca apoiada sobre a frente da cabine, sem abertura por
baixo, e o degrau aparece. A fuselagem reabre para uma rodada depois da correção do
sombreamento (os riscos das janelas e a junta com o capô), com a abertura recortada no
casco, o vidro assentado rente nela e o montante central apoiado no vidro de ponta a
ponta. A rodada 3 fez isso, o crítico deu nota 9 sem defeito e a pessoa aceitou a
fuselagem em 2026-10-15; a fuselagem, o motor sem mudança e a hélice foram fixados de
novo nessa ordem.

## O plano do motor

É a segunda etapa. A receita fica em `partes/motor/receita.js`, com o nome
`aviao/motor`, e as formas vêm da unidade `motor` do esboço aprovado (o mestre e o
[detalhe](../../../docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao-detalhe-motor.esboco.json)).

- `capo`: o capô por seções, liso, da face da frente da fuselagem até o cone da
  hélice, com a boca de ar recortada embaixo.
- `entradaDeAr`: a carenagem da entrada de ar sob o capô, com a mesma boca de ar.
- `escapeD` e `escapeE`: os dois escapes laterais, tubos com o furo de saída.

O `REFINA` aponta `../../andaime.json` e liga cada parte ao volume de mesmo nome
(`capo`, `entrada-de-ar`, `escape-d` e `escape-e`), com a tolerância de 5 mm. A escala
é o comprimento do capô no esboço. Os contatos são o capô com a face da frente da
fuselagem, que é plana, em z 2377, com 1450 por 1030 mm e o centro em y 1303, a
entrada de ar com o capô e cada escape com o capô.

Reprova o motor: capô facetado ou com degrau entre seções; capô que não assenta na
face da frente da fuselagem, com fresta ou degrau na junta; boca de ar ou escape sem
abertura; parte solta; e o `REFINA` acusando parte fora do envelope.

O motor ficou fixo em 2026-10-15 com o aceite da pessoa, depois de duas rodadas, a
segunda com nota 8. O `REFINA.esboco` confere cada parte contra a forma de mesmo nome
do esboço: capô 0,981, entrada de ar 0,958 e escapes 0,969. O furo da boca de ar, que
abre na face de trás do capô e a fuselagem tapa, e a raiz lisa dos escapes, onde o
esboço tem um leque de frisos, ficam como pendência.

## O plano da hélice

É a terceira etapa. A receita fica em `partes/helice/receita.js`, com o nome
`aviao/helice`, e as formas vêm da unidade `helice` do esboço aprovado (o mestre e o
[detalhe](../../../docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao-detalhe-helice.esboco.json)).

- `cone`: o cone da hélice, de revolução em torno do eixo z pelo perfil do esboço, liso,
  da proa em z 8 até dentro do lábio do capô.
- `pa1` a `pa5`: as cinco pás, cada uma a pá da família `superficie-aerodinamica` com o
  perfil `pa-de-helice` e os parâmetros do esboço (envergadura de 912 mm e as cordas
  dele), a raiz dentro do cone e as cinco em arranjo radial de 72 graus em torno do eixo
  da hélice, na pose do esboço. A família entra pelos `PASSOS`, como diz a
  [autoria de peça](../../../docs/mecanifica/usar/AUTORIA-DE-PECA.md).

O `REFINA` aponta `../../andaime.json` e liga o `cone` ao volume `cone` e a `pa1` ao
volume `helice-pa`, com a tolerância de 5 mm. As outras quatro pás não têm volume,
porque o andaime não gira o sólido, e são conferidas só pelo `REFINA.esboco`, que liga
cada parte à forma de mesmo papel do esboço (`cone`, `helicePa` e `helicePa1` a
`helicePa4`) com o mínimo de 0,95. A escala é o diâmetro da hélice no esboço, de ponta
a ponta das pás. Os contatos são cada pá com o cone.

Reprova a hélice: pá reta, sem a torção da família; pá que não entra no cone ou que fica
solta; pás fora do arranjo de 72 graus; cone facetado; e o `REFINA` acusando parte fora
do envelope ou abaixo do mínimo contra o esboço.

A hélice fechou na primeira rodada com nota 9, e a pessoa a aceitou como está em
2026-10-15: as cinco pás são as da família, com razão 1,000 contra o esboço, e o cone
dá 0,998. O contorno do perfil da pá sai em lados retos numa vista isolada, pela
resolução da família, e fica como pendência dela. A etapa ficou fixa depois da fuselagem e
do motor, que foram reabertos e vêm antes na ordem.

## O plano das asas

É a quarta etapa. A receita fica em `partes/asas/receita.js`, com o nome `aviao/asas`,
e as formas vêm da unidade `asas` do esboço aprovado (o mestre e o
[detalhe](../../../docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao-detalhe-asas.esboco.json)),
com as 20 formas visíveis, dez de cada lado, o esquerdo espelhado em x.

- `asaD` e `asaE`: as metades da asa, a superfície da família `superficie-aerodinamica`
  com o perfil `asa` e os parâmetros do esboço (enflechamento, diedro e o afinamento),
  com os vãos do flap e do aileron recortados com a fresta do esboço e o corte da ponta.
  O esboço recorta da asa também os alojamentos do trem principal (perna, braço e roda),
  que são cortadores da unidade dos trens; a asa os recorta igual.
- `pontaD` e `pontaE`: as pontas levantadas a 56 graus, a mesma superfície com a ponta
  levantada, cortada para ficar só além da metade da asa.
- `flapD`, `flapE`, `aileronD` e `aileronE`: os comandos, lofts das seções do esboço, nos
  vãos da asa, neutros.
- `eixoFlapD` a `eixoAileronE`: os eixos, hastes de 30 mm ao longo das dobradiças.
- `suporteFlap1D` a `suporteAileron2E`: os oito suportes, caixas de canto arredondado sob
  a asa.

O `REFINA` aponta `../../andaime.json` e liga cada parte ao volume de mesmo nome em slug
(`asa-d`, `ponta-d`, `flap-d` e os outros), com a tolerância de 5 mm, e o
`REFINA.esboco` liga cada parte à forma de mesmo id do esboço, com o mínimo de 0,95. É a
razão de volume que diz se a asa e a ponta seguem o esboço, porque o envelope da ponta é
a caixa da asa inteira. A escala é a envergadura de ponta a ponta no esboço, 12.825 mm.
Os contatos são cada ponta com a sua metade, cada eixo com o seu comando e cada suporte
com a asa e com o eixo que segura.

Reprova as asas: asa reta, sem o enflechamento, o diedro ou o afinamento; ponta sem a
levantada ou com degrau; comando fora do vão, sem a fresta ou atravessando a asa; eixo ou
suporte solto; vão sem recorte; e o `REFINA` acusando parte fora do envelope ou abaixo do
mínimo contra o esboço.

## O plano das empenagens

São a quinta e a sexta etapas, independentes das asas e uma da outra, e por isso
modeladas em paralelo. As formas vêm das unidades `empenagem-horizontal` e
`empenagem-vertical` do esboço aprovado (o mestre e os detalhes de cada uma).

A empenagem horizontal (`partes/empenagem-horizontal/receita.js`, `aviao/empenagem-horizontal`)
tem 12 partes, seis de cada lado: `estabilizadorD` e `estabilizadorE`, a superfície da
família com o perfil `estabilizador` e o vão do profundor recortado com a fresta;
`profundorD` e `profundorE`, lofts no vão; `eixoProfundorD` e `eixoProfundorE`; e três
suportes de cada lado. A escala é a envergadura do estabilizador, 4780 mm.

A empenagem vertical (`partes/empenagem-vertical/receita.js`, `aviao/empenagem-vertical`)
tem 10 partes: `deriva`, a superfície da família com o perfil `deriva`, cortada na raiz e
no vão do leme como no esboço (a forma `deriva.fin`); `dorsal`, a aleta que desce da
deriva ao dorso da fuselagem (a forma `deriva.dorsal`); `leme`, no vão; `eixoLeme`; e três
pares de dobradiças. A escala é a altura da deriva com o leme, 1960 mm.

Nas duas, o `REFINA` liga cada parte ao volume do andaime e à forma do esboço, com o mínimo
de 0,95; a razão de volume é o que diz se a deriva segue o esboço, porque o envelope dela
fica 1965 mm além. Reprova: superfície reta, sem o enflechamento ou o afinamento; comando
fora do vão, sem a fresta ou atravessando; eixo, suporte ou dobradiça solta; vão sem
recorte; dorsal solta ou com degrau; e o `REFINA` acusando parte fora do envelope ou abaixo
do mínimo.


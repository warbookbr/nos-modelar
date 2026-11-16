# Cordão de solda na costura de tubos: o friso que segue a costura de uma união, e a costura em nó de tubos

**Estado:** concluído

**Território:** `procedural/nucleo/operacoes/friso.js`, `procedural/nucleo/operacoes/friso-na-costura.test.ts`, `procedural/nucleo/operacoes/booleanas.js`, `procedural/nucleo/operacoes/arredondar-costura-no.test.ts`, `procedural/nucleo/fixtures/no-de-tubos.js`, `procedural/pecas/bicicleta-urbana/`, `docs/modelar/banco-de-provas/costura-em-no-de-tubos-2026-11-15/`, `procedural/nucleo/operacoes/refino-da-costura.js`, `procedural/nucleo/adaptador.js`, `procedural/nucleo/liso-por-angulo.js`, `procedural/nucleo/liso-por-angulo.test.js`, `src/autoria/adaptar-three.js`, `src/autoria/normal-lisa-por-angulo.test.js`, `modulos/exportador-gltf/src/gerar-gltf.js`, `tools/modelar/vista-rapida.mjs`, `tools/modelar/normais-lisas.test.ts`

O território cresceu em 2026-11-16 com a decisão da pessoa, na fatia 7: o refino da costura mostrou que a normal lisa pesava as faces por contagem ou por área, e o peso pelo ângulo do canto entrou nos quatro lugares que a calculam.

**Responsável:** a IA desta sessão conduz e mede, e a pessoa julga a forma por imagem.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-15 (fc89c909).

## Problema observado

A bicicleta urbana precisa de acabamento de solda nas junções do quadro, e a pessoa reprovou por imagem a aproximação da rodada 7, que alarga a ponta de cada tubo e aparece como luva com linha de emenda.

O núcleo já tem a operação para isso, a mesma que arredonda os encontros dos corpos do braço robótico: `unir` seguido de `arredondarCostura`. A fixture `procedural/nucleo/fixtures/no-de-tubos.js` mediu em 2026-11-15, com tubos de 48 lados fechados nas pontas e raios de 3 e 5 mm, onde ela fecha a malha e onde recusa. Fecha em T reto de raios 17 e 8 mm, oblíquo a 35° de raios 17 e 8 mm, oblíquo a 60° de raios 17 e 16 mm, em dois tubos sozinhos que saem do mesmo ponto a 22° e em três tubos cujas costuras no receptor não se tocam. Recusa, com e sem `raioMinimo`, quando dois tubos a 22° nascem no mesmo ponto de um terceiro, como os dois estais no tubo do selim: no ponto triplo, onde as costuras dos dois estais sobre o tubo do selim se encostam, a superfície se fecha em cunha de cerca de 61° e o círculo tangente não cabe. O registro está em `docs/modelar/banco-de-provas/costura-em-no-de-tubos-2026-11-15/SONDA.md`.

O defeito é portanto estreito: o ponto triplo, onde três superfícies se encontram na costura. O braço robótico não passa por ele porque nenhum encontro dele junta três corpos no mesmo ponto.

A pessoa viu em 2026-11-15 a concordância lisa de dois tubos (raios de 5 e 8 mm) e um cordão com volume ao lado, e pediu o cordão: ela lê a concordância lisa como solda, mas sem o volume do cordão. O protótipo do cordão (`docs/modelar/banco-de-provas/costura-em-no-de-tubos-2026-11-15/CORDAO.md`) é um `friso` de perfil em lente, mais alto no meio e afinando a zero nas bordas, ao longo da linha da costura calculada por fora da receita, unido aos dois tubos. A pessoa escolheu a lente de 9 mm de largura e 4,8 mm de espessura total e reprovou a borda dela, que ainda aparece como uma divisa arredondada: a transição para os tubos precisa ser quase imperceptível. Duas coisas do núcleo impedem isso hoje. O `friso` por polilinha usa um perfil fixo e uma normal só para a volta inteira, e o ângulo entre os dois tubos varia ao longo da costura (de 60° a 120° num tubo oblíquo a 60°), de modo que um perfil fixo não fica tangente aos dois tubos em todo ponto. E o `arredondarCostura` sobre a borda do cordão recusa até com raio de 0,6 mm, porque a borda fina da lente dobra mais de 45° dentro do alcance do raio.

A forma do cordão foi decidida com a pessoa por imagem em 2026-11-15, em rodadas registradas em `docs/modelar/banco-de-provas/costura-em-no-de-tubos-2026-11-15/CORDAO.md`. O cordão redondo leu como mangueira e o arco alto como cobra; a borda tangente ao tubo deixou riscos no sombreado e lascas na união, e a união falhou em dois de cerca de dez casos com a borda rasa. A pessoa trouxe a foto de uma solda TIG de quadro, e a forma escolhida foi o chanfro: a face reta de borda a borda no canto entre os dois tubos, sem altura no meio, com o sombreado próprio. As escamas da solda ficam para uma textura de relevo que siga a linha, no plano da ferramenta de material, e não na malha.

## Resultado

Um `friso` cita a costura entre dois sólidos de um `unir` como linha e põe nela o perfil `cordao`, um chanfro desenhado a cada ponto no canto entre as duas superfícies, que a união funde aos tubos com malha fechada, inclusive no ponto triplo; as junções do quadro da bicicleta passam a usar esse cordão no lugar do alargamento das pontas.

## Filtro Agent-First

`friso`: REFATORAR. A intenção do autor é "ponha um cordão de solda desta largura ao longo do encontro destes dois corpos". O `friso` já desenha um perfil ao longo de uma linha, e uma operação de solda separada daria dois caminhos para a mesma intenção. Entra como nova fonte de linha, `costura: { de: { op: 'unir', id }, entre: [a, b] }`, ao lado de `linha` e `superficie`, e como nova forma de perfil, `cordao: { largura }`, o chanfro calculado a cada ponto pelo canto, com os pés achados na superfície de cada sólido. O autor não calcula a linha nem o perfil, e o cordão marca o próprio sombreado.

`arredondarCostura`: REFATORAR só no ponto triplo, se o cordão do ponto triplo pedir que a concordância passe por ele. Se o cordão resolver o ponto triplo sozinho, a mudança no `arredondarCostura` sai do plano e volta ao backlog.

Escamas da solda: ADIAR para o plano da ferramenta de material, como relevo que segue a linha do cordão; o cordão deixa a direção da linha disponível para isso. O protótipo das escamas na malha, que a pessoa viu, não entra no núcleo.

## Incluído

- a fixture do nó de tubos, já na main, com os casos de dois, três e quatro tubos;
- a linha da costura entre dois sólidos de um `unir`, lida da costura que a booleana registra, como fonte de linha do `friso`;
- o perfil `cordao`, o chanfro posto em cada ponto no canto, com o sombreado próprio;
- a robustez da união do cordão com os tubos, e o ponto triplo;
- as junções do quadro da bicicleta refeitas com o cordão, com imagem para a pessoa;
- a união que funde o canto novo que cai quase em cima de um canto de operando, em vez de recusar a casca: na bicicleta, a coroa do garfo de 398 a 402 mm e o topo dos estais em 48 e 52 mm recusam hoje a união do cordão (um canto do corte a 16 µm de um canto do cordão, ou uma aresta de 0,15 µm vinda da união dos tubos), e a saída foi desviar a medida;
- o refinamento da malha do tubo perto da costura feito pela ferramenta, e não pela receita: hoje a bicicleta põe anéis a cada 4 mm na ponta de cada tubo soldado, num ajudante próprio, para o cordão não deixar triângulo longo, e toda peça nova com solda teria de repetir isso;
- a nota em `GOTCHAS-POR-OPERACAO.md` e nas skills de modelagem dizendo que junta de tubos soldada se faz com `unir` e `friso` com `costura` e `cordao`.

## Excluído

- escamas, textura ou ondulação do cordão, que vão ao plano de material;
- as outras limitações conhecidas do `arredondarCostura` (rasgo em U com classes diferentes, rebaixo girado);
- o protótipo de forma exata de junção de tubos (`procedural/nucleo/forma-exata/`);
- o pneu e os demais acertos da bicicleta, que seguem pelo laço da peça.

## Gate de saída

1. Nos casos de dois tubos da fixture, de 35° a 90° e com raios iguais e diferentes, o cordão e a união fecham a malha sem aresta sem par, sem vínculo não manifold e sem dobra de face (ângulo entre faces vizinhas acima de 150°) fora da borda do chanfro.
2. Nos casos com ponto triplo (`tubo e dois estais` e `no de 4 tubos`), o mesmo.
3. O cordão de uma junção de dois tubos de 32 mm acrescenta até 600 faces à peça, contando os cortes da união nos tubos.
4. Os casos que hoje passam (os testes do `friso`, os de `arredondar-costura-*.test.ts`, os casos medidos de forma exata e o braço robótico) continuam com a mesma malha, conferida pelo retrato do acervo.
5. Toda recusa nova cita o ponto e a saída, e tem teste que a cita (`recusas:check`).
6. A pessoa vê as junções do selim, da caixa de direção e do movimento central da bicicleta, de perto e inteira, ao lado da foto, e aprova ou devolve.
7. Documentação: a nota de uso e o registro das rodadas de forma e das medidas no banco de provas.
8. Na bicicleta, a varredura da coroa do garfo de 395 a 405 mm e a do topo dos estais de 40 a 56 mm, de 1 em 1 mm, fecha as uniões das juntas sem a recusa "é defeito do cálculo" (casca aberta ou precisão); a recusa do `friso` por curva fechada demais, que diz o ponto e a largura, é limite de geometria e não conta. A linha de base, em 2026-11-16, com a placa da gancheira na junta do quadro: 18 de 27 valores recusam, 12 por casca aberta na gancheira ou no topo do tubo do selim, 1 por uma aresta de 0,15 µm que a primeira união deixa para a segunda, e 6 (estais de 51 a 56 mm) pelo cordão que não cabe entre o estai e o tubo superior. Um teste com dois sólidos cujos cantos ficam a menos da tolerância declarada prova a fusão e a malha fechada.
9. A receita da bicicleta declara a solda só com `unir`, `friso` com `costura` e `cordao`, e `unir` com `vincarCostura`, sem anéis próprios nas pontas dos tubos, e o cordão continua sem triângulo longo, medido como na fatia 3.

## Fatias

1. Feita: a fixture do nó de tubos e a linha de base da recusa no ponto triplo (main 8b204c45).
2. Feita: a linha da costura como fonte do `friso`, reamostrada e suavizada, com a normal média da superfície de cada sólido.
3. Feita: o perfil `cordao` como chanfro enxuto, com o sombreado próprio, o defeito do alto da junção oblíqua corrigido e a união robusta nos casos de dois tubos; a forma já foi escolhida pela pessoa.
4. Feita: o ponto triplo, revisado pelo revisor adversarial por ser mudança de núcleo.
5. Feita: a bicicleta, com as juntas do quadro e do garfo com o cordão, aprovada pela pessoa por imagem em 2026-11-16 ("a solda atual ficou muito boa"; a bicicleta inteira, de lado, de frente e em perspectiva, ao lado da foto).
6. Feita (b1dd71ba, revisada pelo revisor adversarial): a fusão do canto quase coincidente na união, com a tolerância declarada e medida contra o retrato do acervo, e a varredura do gate 8; revisada pelo revisor adversarial por ser mudança de núcleo. Vem logo depois da aprovação da bicicleta, por ser a correção que mais custa a quem escreve receita.
7. Feita (990e0f6b, corrigida em 37ceb55e): o refinamento perto da costura feito pela ferramenta, e a bicicleta sem os anéis próprios (gate 9).
8. Feita (9cf528c1): documentação e fechamento.

## Riscos e parada

Se o chanfro na bicicleta inteira não convencer a pessoa, o plano para e a forma volta a ser decidida com ela. Se a união do cordão com os tubos continuar falhando em algum caso da fixture depois de duas abordagens de robustez, o plano para e a pessoa decide entre a concordância só pelo `arredondarCostura` e uma operação que desloca a malha dos tubos sem booleana. Se o ponto triplo não fechar em duas abordagens, a pessoa decide entre terminar o cordão antes dele e adiar. Mudança que altere a malha de qualquer peça do acervo fora da bicicleta é motivo de parada, e não de atualização do retrato. Se a fusão da fatia 6 mudar a malha de alguma peça do acervo, ela fica restrita à união com `vincarCostura` e a pessoa decide se vale estendê-la; se não houver tolerância que feche a varredura sem mudar o acervo, a pessoa decide entre manter a recusa, que já diz o ponto, e outra abordagem.

## Fechamento

Concluído em 2026-11-16, medido no ramo `bicicleta` contra a base e911b02d, depois da revisão adversarial da fatia 7 e das correções dela (37ceb55e).

O `friso` com `costura` e o perfil `cordao` põe o chanfro de solda no canto entre dois sólidos de um `unir`, e o `unir` com `vincarCostura` o funde aos tubos e refina sozinho a faixa em volta da costura. A bicicleta declara as juntas do quadro e do garfo assim, sem anéis próprios, e a pessoa aprovou a forma por imagem nas fatias 5 e 7.

Gate 1 cumprido em parte. Nos casos de dois tubos da fixture (T reto 17/8, oblíquo a 35° 17/8, oblíquo a 60° 17/16 e T de raios iguais 17/17) a malha fecha sem órfão, sem aresta sem par e sem vínculo não manifold (`npx vitest run procedural/nucleo/operacoes/friso-na-costura.test.ts`). A dobra acima de 150° fora da borda do chanfro aparece em 1 aresta no oblíquo a 60° e em 2 no T de raios iguais, sempre com uma lasca de 1 a 4 µm de largura e normal virada; a base tem as mesmas, e nenhum teste confere a dobra. O caso de 90° com raios diferentes é o T reto; não há caso oblíquo a 90° de raios iguais além do T 17/17.

Gate 2 cumprido em parte. `tubo e dois estais` e `no de 4 tubos` fecham do mesmo modo, no mesmo teste, e cada um tem 2 dobras acima de 150° em lasca de cerca de 1,5 µm junto do ponto triplo, iguais à base.

Gate 3 cumprido pela contagem do teste: o par de 32 mm (oblíquo a 60° 17/16) acrescenta 506 faces entre cordão e cortes da união. Com o refino da faixa, que o teste conta à parte desde a fatia 7, são 680.

Gate 4 cumprido: o retrato do acervo gravado em e911b02d e comparado em 990e0f6b dá 120 peças iguais, entre elas o braço robótico, e só a bicicleta mudada (`node tools/modelar/retrato-do-acervo.mjs --comparar <retrato da base>`). Os testes do `friso`, de `arredondar-costura-no` e dos cantos quase coincidentes passam (39 de 39).

Gate 5 cumprido: `npm run recusas:check` passa com o `friso.js` vigiado; a união reforçada e o refino não trouxeram recusa nova.

Gate 6 cumprido: a pessoa aprovou as juntas do selim, da caixa de direção e da coroa, de perto e na bicicleta inteira ao lado da foto, em 2026-11-16, e de novo na fatia 7.

Gate 7 cumprido: a nota de uso está em `docs/modelar/usar/GOTCHAS-POR-OPERACAO.md`, na referência de operações do `criar-peca` e no `laco-de-modelagem`; o registro das rodadas e das medidas, com as pranchas da fatia 7, está em `docs/modelar/banco-de-provas/costura-em-no-de-tubos-2026-11-15/README.md`.

Gate 8 cumprido: `node tmp/varredura/juntas.mjs garfo_eixo_a_coroa 395 405` fecha os 11 valores, e `estai_abaixo_da_abracadeira 40 56` fecha de 40 a 49 e recusa de 50 a 56 só pelo `friso` com curva fechada demais, o limite de geometria; nenhum valor recusa por casca aberta ou precisão, contra 12 da linha de base. A recusa de geometria passou a começar em 50 mm, e não em 51, desde que os anéis saíram. O teste dos cantos quase coincidentes é `procedural/nucleo/operacoes/booleana-cantos-quase-coincidentes.test.ts`.

Gate 9 cumprido. A receita declara a solda só com `unir`, `friso` com `costura` e `cordao` e `unir` com `vincarCostura`, sem anéis próprios. A régua, que não tinha ficado gravada na fatia 3, virou teste em `friso-na-costura.test.ts`: todo triângulo da malha que toca o pé do cordão, com razão de aspecto acima de 8 e lado acima de 4,5 mm, com os limites da base com anéis. A primeira versão do refino (990e0f6b) passava pela imagem e falhava nela (1.161 triângulos acima de 40 mm contra 128 da base), o que a revisão adversarial achou; depois das correções são 54, com o maior lado de 110,5 mm, e a pessoa aprovou de novo a bicicleta por imagem. A revisão também corrigiu a normal lisa (peso pelo ângulo vezes um fator que apaga a lasca, e o triângulo virado contra o plano com a normal do plano, nas quatro implementações) e o refino que entrava em juntas sem cordão.

Commits: fixture e linha de base 10cf0c9f; friso na costura 6a4ed37f; forma do chanfro 7719ff8b, b83a7574, 3f5a5604; ponto triplo e pares 84554d9f, 7807486d, a69099ae; bicicleta 3d68455d a d49c1c9f; fusão do canto quase coincidente 4b5cc745 e b1dd71ba; refino e normal pelo ângulo 990e0f6b; documentação da fatia 8 9cf528c1; correções da revisão 37ceb55e.

Candidatos ao backlog: a lasca de 1 a 4 µm com normal virada que a união deixa junto da costura (gates 1 e 2), sem teste de dobra que a pegue; o catálogo gerado de `uso-operacoes.js` sem limite que fale de `vincarCostura` e do refino automático; as faces finas da bicicleta, de 594 com anéis para 1.918, que já não pesam na normal mas pesam na malha.

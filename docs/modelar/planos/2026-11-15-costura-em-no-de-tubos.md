# Cordão de solda na costura de tubos: o friso que segue a costura de uma união, e a costura em nó de tubos

**Estado:** ativo

**Território:** `procedural/nucleo/operacoes/friso.js`, `procedural/nucleo/operacoes/friso-na-costura.test.ts`, `procedural/nucleo/operacoes/booleanas.js`, `procedural/nucleo/operacoes/arredondar-costura-no.test.ts`, `procedural/nucleo/fixtures/no-de-tubos.js`, `procedural/pecas/bicicleta-urbana/`, `docs/modelar/banco-de-provas/costura-em-no-de-tubos-2026-11-15/`

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
7. O refinamento perto da costura feito pela ferramenta, e a bicicleta sem os anéis próprios (gate 9).
8. Documentação e fechamento.

## Riscos e parada

Se o chanfro na bicicleta inteira não convencer a pessoa, o plano para e a forma volta a ser decidida com ela. Se a união do cordão com os tubos continuar falhando em algum caso da fixture depois de duas abordagens de robustez, o plano para e a pessoa decide entre a concordância só pelo `arredondarCostura` e uma operação que desloca a malha dos tubos sem booleana. Se o ponto triplo não fechar em duas abordagens, a pessoa decide entre terminar o cordão antes dele e adiar. Mudança que altere a malha de qualquer peça do acervo fora da bicicleta é motivo de parada, e não de atualização do retrato. Se a fusão da fatia 6 mudar a malha de alguma peça do acervo, ela fica restrita à união com `vincarCostura` e a pessoa decide se vale estendê-la; se não houver tolerância que feche a varredura sem mudar o acervo, a pessoa decide entre manter a recusa, que já diz o ponto, e outra abordagem.

## Fechamento

A preencher.

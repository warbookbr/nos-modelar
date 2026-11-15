# Costura arredondada em nó de tubos: o cordão de solda onde três ou mais tubos se encontram

**Estado:** ativo

**Território:** `procedural/nucleo/operacoes/booleanas.js`, `procedural/nucleo/operacoes/arredondar-costura-no.test.ts`, `procedural/nucleo/fixtures/no-de-tubos.js`, `procedural/pecas/bicicleta-urbana/`, `docs/modelar/banco-de-provas/costura-em-no-de-tubos-2026-11-15/`

**Responsável:** a IA desta sessão conduz e mede, e a pessoa julga a forma por imagem.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-15 (fc89c909).

## Problema observado

A bicicleta urbana precisa de acabamento de solda nas junções do quadro, e a pessoa reprovou por imagem a aproximação da rodada 7, que alarga a ponta de cada tubo e aparece como luva com linha de emenda.

O núcleo já tem a operação para isso, a mesma que arredonda os encontros dos corpos do braço robótico: `unir` seguido de `arredondarCostura`. Uma sonda de 2026-11-15 mediu onde ela funciona e onde recusa, com tubos de 48 lados fechados nas pontas e raios de 3, 5 e 8 mm. Com dois tubos ela fecha a malha em todos os casos provados: em T reto de raios 17 e 8 mm, oblíquo a 35° de raios 17 e 8 mm e oblíquo a 60° de raios 17 e 16 mm, sem aresta sem par. Com quatro tubos no mesmo nó (o tubo do selim, o tubo de cima e os dois estais, como na junção do selim) ela recusa com todos os raios, com e sem `raioMinimo`: no ponto em que a costura de um tubo encontra a costura do vizinho as duas superfícies se fecham em cunha de cerca de 61°, o círculo tangente não cabe, e nem o raio mínimo de 1 mm é aceito.

O defeito é portanto estreito: o ponto em que duas costuras se cruzam num nó de três ou mais corpos. O braço robótico não passa por ele porque as costuras dele não se cruzam.

## Resultado

Um `unir` de três ou mais tubos que se encontram num nó aceita `arredondarCostura` com raio declarado e entrega malha fechada, com o arredondamento contínuo ao longo de cada costura e resolvido no ponto em que duas costuras se cruzam, e as junções do quadro da bicicleta passam a usar essa operação no lugar do alargamento das pontas.

## Filtro Agent-First

`arredondarCostura`: REFATORAR. A intenção do autor ("arredonde o encontro destes corpos com este raio") já é a da operação, e criar uma operação de solda separada daria dois caminhos para a mesma intenção. A mudança fica dentro dela, sem argumento novo obrigatório. Se o cruzamento pedir uma escolha de forma (o raio cair até zero no ponto de cruzamento, ou um remendo que funde os dois arredondamentos), ela entra como opção declarada com padrão, e a recusa de hoje continua valendo onde nenhuma das duas couber, com a mensagem dizendo o ponto e a saída.

Aparência de cordão de solda (escamas, largura irregular): ADIAR. O plano entrega a concordância lisa; a textura de solda é material e fica no backlog.

## Incluído

- a fixture geral de nó de tubos (três e quatro tubos, raios iguais e diferentes, ângulos de 35° a 90°) e o teste que hoje recusa;
- o tratamento do ponto em que duas costuras se cruzam, dentro de `arredondarCostura`;
- as junções do quadro da bicicleta refeitas com a operação, com imagem para a pessoa;
- a nota em `GOTCHAS-POR-OPERACAO.md` e nas skills de modelagem dizendo que junta de tubos se faz com `unir` e `arredondarCostura`.

## Excluído

- textura ou relevo de cordão de solda;
- as outras limitações conhecidas da operação (rasgo em U com classes diferentes, rebaixo girado);
- o protótipo de forma exata de junção de tubos (`procedural/nucleo/forma-exata/`), que segue como está;
- o pneu e os demais acertos da bicicleta, que seguem pelo laço da peça.

## Gate de saída

1. A fixture de nó com três e com quatro tubos passa em `arredondarCostura` com raios de 3 e 5 mm: malha fechada, sem aresta sem par, sem vínculo não manifold e sem face de área abaixo do limite da peça além das que a união sem arredondamento já tem.
2. Os casos que hoje passam (os testes de `arredondar-costura-*.test.ts`, os casos medidos de forma exata e o braço robótico) continuam com a mesma malha, conferida pelo retrato do acervo.
3. Onde o raio não cabe mesmo com o tratamento, a recusa cita o ponto e a saída, e tem teste que a cita (`recusas:check`).
4. A pessoa vê as junções do selim, da caixa de direção e do movimento central da bicicleta, de perto e ao lado da foto, e aprova ou devolve.
5. Documentação: a nota de uso e o registro da sonda no banco de provas.

## Fatias

1. Baseline: a fixture de nó de tubos e o teste que registra a recusa de hoje, com a sonda de 2026-11-15 escrita no banco de provas e uma imagem do caso de dois tubos, para confirmar que a concordância de dois tubos lê como solda antes de investir no nó.
2. O ponto de cruzamento: a menor mudança em `arredondarCostura` que fecha a malha no nó, revisada pelo revisor adversarial por ser mudança de núcleo.
3. A bicicleta: as cinco juntas com a operação, medição da peça e imagens para a pessoa.
4. Documentação e fechamento.

## Riscos e parada

Se a imagem da fatia 1 mostrar que a concordância de dois tubos não lê como solda aos olhos da pessoa, o plano para antes da fatia 2 e a forma do cordão volta a ser decidida com ela. Se a fatia 2 não fechar a malha no nó de quatro tubos em duas tentativas de abordagem, o plano para e a pessoa decide entre o raio que cai a zero no cruzamento e adiar. Mudança que altere a malha de qualquer peça do acervo fora da bicicleta é motivo de parada, e não de atualização do retrato.

## Fechamento

A preencher.

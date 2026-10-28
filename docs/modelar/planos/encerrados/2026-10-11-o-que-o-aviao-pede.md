# O que o avião pede

**Estado:** concluído

**Responsável:** Claude, com o aceite da pessoa

**Repositório e base:** `warbookbr/nos-mecanifica`, branch da sessão sobre a `main`

## Problema observado

[As ferramentas de modelagem](2026-10-07-as-ferramentas-de-modelagem.md)
deixou casca, chapa, articulações, barras e quatro famílias, provadas em carrinho
de mão, guarda-roupa, cadeira e cadeira de rodas, que são objetos de peças retas
ou de revolução. A [contagem por objeto](../../FERRAMENTAS-POR-OBJETO.md) aponta o
que esses objetos não exercitam: o perfil aerodinâmico e as pás (`aerofolio`), que
não existe e serve a 17 objetos, e a superfície suave por seções (`loftSuave`),
parcial e pedida por 46. Sem modelar um objeto que dependa delas, não se sabe o
que de fato falta, quanto custa contornar nem quais partes se repetem a ponto de
virar primitiva 2.0.

A pessoa escolheu em 2026-10-11 o avião de pequeno porte, monomotor turboélice de
asa baixa e trem recolhível, com uma referência em quatro vistas, sem marca nem
nome de fabricante, separada em
[`aviao-2026-10-11/referencias`](../../banco-de-provas/aviao-2026-10-11/referencias/).
O [alinhamento](../../banco-de-provas/aviao-2026-10-11/ALINHAMENTO.md) e os
[atritos](../../banco-de-provas/aviao-2026-10-11/ATRITOS.md) ficam na mesma pasta.

## Resultado

O avião de pequeno porte é modelado até a aprovação da pessoa, e cada atrito do
caminho fica registrado, reproduzido e classificado como ferramenta nova, correção
do núcleo ou nada. As partes que se repetem na lista viram primitivas 2.0 ou
ferramentas, escolhidas pela pessoa, e o avião refeito com elas mostra em tokens e
nota quanto o Mecanifica melhorou.

## Filtro Agent-First

O esboço, o contorno, a prancha, o Condutor, as famílias e o veredito são **USAR
DIRETO**: o plano mede o que eles fazem num objeto difícil e não os muda antes de
o atrito aparecer. As ferramentas novas da fatia 5 entram pelo contrato
`mecanifica.familia@1` ou como extensão nativa do núcleo, e a decisão de cada uma
é registrada na fatia 4 com a mesma régua. O que o avião revelar e não bloquear o
resultado volta ao backlog.

## Incluído

- o alinhamento com a pessoa: nível de detalhe, partes, o que se move (proposta:
  hélice, ailerons, flaps, leme, profundor e trem recolhível) e o que reprova;
- as quatro vistas da referência, o contorno das partes e a prancha cotada, com a
  envergadura de 12,8 m como escala;
- o esboço detalhado do avião inteiro só com as ferramentas e famílias atuais,
  com o laço do esboço, o crítico cego e os Marcos; o trem usa a roda 2.0 e o
  cilindro hidráulico como amortecedor;
- o registro de cada atrito em `ATRITOS.md`, com o comando que o reproduz;
- a classificação dos atritos e das partes candidatas, com a lista de objetos da
  lista que cada candidata atende;
- a implementação do que a pessoa escolher, provada na bancada e aprovada nas
  camadas mecânica, crítico e pessoa;
- o avião refeito com o que foi criado e a comparação com a primeira rodada no
  [banco de provas](../../banco-de-provas/BANCO-DE-PROVAS.md).

## Excluído

- aerodinâmica, cálculo estrutural, massa e física de voo;
- interior da cabine além do que as janelas mostram;
- avião comercial, helicóptero, planador e drone, que entram como objetos da
  conferência de repetição e não são modelados aqui;
- os candidatos de sucessão, que passaram ao plano sucessor.

## Gate de saída

1. o alinhamento escrito e confirmado pela pessoa, as vistas com contorno aceito
   pelo crítico e a prancha cotada aprovada pela pessoa;
2. a primeira rodada do avião completa, com a nota do crítico por unidade e por
   Marco, o custo registrado e a forma aprovada pela pessoa;
3. todo atrito reproduzido por comando e classificado, e toda candidata a
   primitiva com a contagem de objetos da lista que ela atende;
4. cada primitiva ou ferramenta escolhida com teste, `familias:check` quando for
   família e aprovação nas três camadas;
5. a segunda rodada do avião, com tokens e nota comparados à primeira e aprovada
   pela pessoa;
6. `npm run gates --completo` verde e a documentação de ferramentas por objeto
   atualizada.

## Fatias

1. **Alinhamento.** Pela skill
   [`alinhar-modelagem`](../../../../.claude/skills/alinhar-modelagem/SKILL.md),
   com opções de forma em imagem quando houver disputa, e fecha na anatomia do
   avião em `ALINHAMENTO.md`: partes, ligações, o que se move e o que reprova.
   Vem antes da referência porque a lista de partes do contorno sai dele, como
   no [fluxo do objeto](../../usar/FLUXO-DO-OBJETO.md). A escala é a envergadura de
   12,8 m, escolhida pela pessoa em 2026-10-11.
2. **Referência.** Separar as vistas (feito na abertura), declarar os papéis em
   `papeis.json`, tirar o contorno das partes pela skill
   [`contorno-da-imagem`](../../../../.claude/skills/contorno-da-imagem/SKILL.md) e
   fazer a prancha pela
   [`prancha-dos-contornos`](../../../../.claude/skills/prancha-dos-contornos/SKILL.md).
   As vistas são um desenho e podem não concordar entre si; a prancha decide a
   medida que vale e diz de qual vista ela veio.
3. **Primeira rodada.** Esboço detalhado pelo laço do esboço, em modo por
   unidade, só com o que existe hoje. Cada vez que o esbocista contornar uma
   falta, o contorno vira atrito, e o laço não para por isso. Fecha com o custo
   e a aprovação da pessoa.
4. **Classificação.** Cada atrito vira ferramenta nova, correção do núcleo ou
   nada, com a justificativa. Cada parte vira candidata a primitiva 2.0 quando
   aparece em outros objetos da lista, conferida na contagem por objeto (o perfil
   de asa, por exemplo, em empenagem, pá de hélice, pá de turbina eólica e
   ventoinha). A fatia termina com a pessoa escolhendo o que a fatia 5 constrói.
5. **Implementação.** O que a pessoa escolheu, cada item com prancha na bancada
   neutra nos extremos das faixas e num ponto médio, crítico e aprovação da
   pessoa. Em 2026-10-12 a pessoa escolheu corrigir todos os itens da
   [classificação](../../banco-de-provas/aviao-2026-10-11/CLASSIFICACAO.md), para não
   deixar pendência. A ordem vai em três ondas, cada pacote com dono de arquivos
   próprio para os agentes trabalharem em paralelo sem se cruzar:
   - onda 1, correções: o processo do crítico (brief em arquivo e reimpresso, o
     lado de cada vista, vistas da proa, do lado esquerdo e de baixo, a
     referência no brief, o enquadramento da unidade, a nota que não trava as
     outras); contorno e prancha (R1, R6 a R8 e a silhueta em pedaços de E3);
     referência no esboço (E1, E2, E4); gate de contato e miúdos (E6, E8, E10,
     E18, E23, E28, E35, E39); depois, integração do detalhe e Envelope (E13,
     E14, E16, E19, E22, E27, E32, E36, E37, E41), que toca o Condutor;
   - onda 2, ferramentas novas: famílias no esboço (E7), a superfície
     aerodinâmica como família, com a hélice como perfil dela (A), o recorte de
     uma forma por outra no esboço (B), o curso de mecanismo varrido pelo gate e
     mostrado inteiro ao crítico (C, E40, E42, E43) e a superfície suave por
     seções (D); e a contagem por objeto corrigida onde subestimou o recorte;
   - onda 3, a fatia 6.
6. **Segunda rodada e fechamento.** O avião refeito com o que a fatia 5 criou,
   pelo mesmo laço, comparado à primeira rodada em tokens, chamadas, rodadas e
   nota. O fechamento conta primitivas, ferramentas e atritos resolvidos.

## Riscos e parada

Se a primeira rodada não chegar a uma forma que a pessoa aprove, por falta de uma
ferramenta, o plano para na fatia 3 e leva à pessoa o atrito que bloqueou, para
decidir se a fatia 5 começa antes. Se a fatia 4 apontar mais itens do que cabem,
a pessoa escolhe os que entram e o resto volta ao backlog com o atrito que o
justifica. Se uma primitiva nova exigir mudar o contrato de família ou de portas,
o plano para e redesenha com a pessoa antes de ampliar.

## Sucessor

O próximo plano é o [desenho sem referência](2026-10-13-desenho-sem-referencia.md),
decidido pela pessoa em 2026-10-13. Os candidatos de sucessão levantados aqui em
2026-10-11 passaram para o fim dele.

## Fechamento

Concluído em 2026-10-13, com a aceitação da pessoa. O alinhamento, as quatro
vistas com contorno e as duas pranchas cotadas foram aceitos (item 1); as pranchas
foram refeitas na segunda rodada com a borda subpixel e as formas declaradas do
contorno, e aceitas de novo. A primeira rodada fechou com o Marco de 100% em 8,
3,93 milhões de tokens e a forma aprovada pela pessoa em 2026-10-12 (item 2). Os
atritos R1 a R8 e E1 a E43 foram reproduzidos e classificados na
[classificação](../../banco-de-provas/aviao-2026-10-11/CLASSIFICACAO.md) (item 3), e a
pessoa mandou corrigir todos. A fatia 5 entregou a família `superficie-aerodinamica`
(asa, estabilizador, deriva, pá e hélice) aprovada nas três camadas, o recorte de
uma forma por outra, o curso de mecanismo varrido pelo gate e mostrado ao crítico,
a superfície suave por seções e as famílias no esboço, além das correções de
contorno, prancha, integração, gate e processo do crítico, este recalibrado em 11
de 12 imagens (item 4).

A segunda rodada fechou com todas as unidades e o Marco de 100% em 8, sem nenhuma
liberação da pessoa, e a forma aprovada em 2026-10-13 (item 5). Custou 3,60
milhões de tokens contra 3,93 milhões, 8% a menos, com 11 esbocistas contra 12 e
12 críticas contra 19; os trens recolhem dentro do capô e da asa sem atravessar, o
que a primeira rodada não fazia. Fora dessa conta ficaram 1,39 milhão de tokens de
cinco implementadores que corrigiram a blocagem, o brief e o desenho durante a
rodada. A contagem de [ferramentas por objeto](../../FERRAMENTAS-POR-OBJETO.md) passou
o perfil aerodinâmico a parcial e o recorte do esboço a existente, e a bateria
completa passa em 14 minutos, depois de ter subido a 22 com os esboços do avião
no teste da blocagem; o resumo dos gates passou a listar os arquivos de teste
mais lentos (item 6).

Ficam como ressalva os detalhes de superfície que a pessoa aceitou sem a rodada de
acabamento (deriva, leme, compensador, ponta e suportes da asa, rebaixo da porta,
perna do nariz e garfo do trem principal) e os 38 atritos abertos da segunda
rodada, que foram ao [backlog](../BACKLOG.md) com a integração do detalhe com o mestre
como o primeiro grupo a puxar.

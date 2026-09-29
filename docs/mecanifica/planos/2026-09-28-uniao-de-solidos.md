# União de sólidos — dois sólidos viram uma peça só

**Estado:** ativo

**Responsável:** Claude, com o aceite visual da pessoa

**Repositório e base:** `warbookbr/nos-mecanifica`, branch da sessão sobre a `main`

## Problema observado

Em 2026-09-28, a pessoa pediu o canto de cima do ombro reto, como na foto
frontal. O único jeito de fazer isso no núcleo foi enfiar uma coluna e um braço
reto um no outro. O núcleo não tem operação que funda dois sólidos, então as
duas malhas continuam separadas. O render mostra uma linha e manchas de sombra
onde elas se cruzam, e o `liso` piora isso, porque suaviza as normais das duas
malhas por cima do encontro. A pessoa viu os vincos de primeira, e a medida e
os gates não viram nada. As tentativas ficaram fora do repositório. O ombro
aceito continua sendo o L com a dobra curva, de canto arredondado. O cotovelo,
o punho e o garfo do braço são blocos que saem uns dos outros e vão esbarrar
no mesmo problema.

## Resultado

Uma receita junta, subtrai ou intersecta sólidos com um passo só, e depois
arredonda a costura onde eles se encontram. A malha que sai é uma superfície
fechada, sem face interna. Cada face sabe de qual sólido de entrada veio e
mantém o material dele, e a costura pode ser selecionada pelos passos
seguintes. As ferramentas que já leem a peça (descrever, portas, contatos,
bancada, exportação) continuam funcionando sobre a malha unida. O ombro com
canto reto sai sem vinco na vista isométrica em 1600 px, e a pessoa confirma
isso olhando.

## Filtro Agent-First

A operação é ENVOLVER: o cálculo fica com a biblioteca Manifold (`manifold-3d`,
em WebAssembly, sem Three.js), e o núcleo só converte a malha na entrada e na
saída e grava a identidade. Escrever o cálculo à mão fica ADIADO, porque
booleana robusta é um problema difícil que a biblioteca já resolve. O filete ao
longo da costura é ENVOLVER também: o `filete` que já existe foi escrito para
arestas de malha em quadriláteros, e a costura de uma booleana sai em
triângulos irregulares. Se o `filete` não servir, a costura é arredondada por
um passo próprio, porque as peças da foto têm os encontros arredondados e uma
aresta viva no lugar deles é defeito visível.

## Incluído

- os passos `unir`, `subtrair` e `intersectar` no núcleo, com a mesma forma de
  seleção por origem que os outros passos usam, aceitando dois ou mais sólidos;
- a identidade, desenhada contra a regra do núcleo de que cada passo só
  numera dentro do seu bloco de 1000 ids (`BLOCO` em `nucleo.js`). A face que
  a união não toca fica com o id, a origem, a parte e o material que já tinha.
  A face cortada pela costura fica com o id dela, na parte que sobra. Só os
  pedaços a mais de uma face cortada ganham id novo, no bloco do passo da
  união. A face que fica dentro do outro sólido é consumida e registrada em
  `st.consumidas`, como o `furo` já faz, para quem a citar depois receber o
  erro com o conserto. A Manifold devolve triângulos com o número da face de
  origem, e esse número reagrupa os triângulos no polígono de antes. Por isso
  a união de dois lofts de 1000 faces não estoura o bloco, porque quase todas
  as faces continuam com o id que já tinham;
- a costura selecionável como aresta nomeada pela operação que a criou;
- o arredondamento da costura com raio declarado;
- o `liso` respeitando o ângulo na costura, para não borrar a sombra do
  encontro;
- as ferramentas que leem a peça conferidas sobre uma malha unida: `descrever`,
  portas, contatos, guardas, bancada e exportação;
- o inventário das operações que as partes restantes do braço vão pedir,
  olhando as fotos parte por parte; o que faltar e couber aqui entra, e o resto
  vai ao backlog com a parte que o pede;
- a prova numa fixture neutra, com dois cubos que se cruzam, conferindo que a
  malha sai fechada, sem face interna e com o volume esperado;
- a prova no ombro, com a coluna e o braço reto unidos;
- o registro em `docs/mecanifica/UPSTREAM-NOS.md`, porque a operação é geral.

## Excluído

- booleanas com malhas abertas, que a biblioteca recusa;
- mudança nas peças já fixas, exceto o ombro, que só muda com o aceite da
  pessoa.

## Gate de saída

1. A fixture dos dois cubos sai fechada, com volume dentro de 0,1% do
   esperado e nenhuma face dentro do outro sólido.
2. A mesma receita executada duas vezes dá a mesma malha, byte a byte.
3. Cada face que sai aponta uma origem que existia na entrada.
4. A costura arredondada da fixture tem o raio declarado, medido na malha.
5. `descrever`, portas, contatos, guardas, bancada e exportação passam sobre a
   fixture unida, cada um com teste.
6. O ombro unido, visto em isométrica a 1600 px, não mostra vinco, e a pessoa
   confirma olhando.
7. O inventário do braço está escrito, com cada operação que falta marcada
   como feita aqui ou levada ao backlog.
8. `npm run gates --completo` passa.

## Fatias

1. A fixture dos dois cubos falhando sem a operação, para servir de linha de
   base.
2. O passo `unir` com a Manifold e a identidade herdada.
3. Os passos `subtrair` e `intersectar`, que usam o mesmo caminho.
4. O arredondamento da costura e o `liso` com ângulo sobre ela.
5. As ferramentas de leitura conferidas sobre a malha unida.
6. O ombro com canto reto refeito com `unir`, mostrado à pessoa.
7. O inventário das partes restantes do braço.
8. Fechamento.

## Riscos e desvios

A união é capacidade de base, e o plano só fecha com ela funcionando. Cada
risco tem o desvio já escolhido, e nenhum deles encerra o plano.

A Manifold carrega WebAssembly de forma assíncrona, e o núcleo executa as
receitas de forma síncrona. O caminho previsto é carregar a biblioteca uma vez,
quando cada ferramenta abre. Onde isso não bastar, o executor passa a ser
assíncrono, com a autorização que a pessoa deu em 2026-09-28, e cada
ferramenta afetada ganha teste provando que continua dando o mesmo resultado.

Se a malha do núcleo não estiver fechada o bastante para a Manifold aceitar,
os vértices repetidos são soldados antes da união; se isso não bastar, o
`loft` é consertado primeiro.

Se a Manifold falhar num caso sem conserto, entra outra biblioteca de
booleanas e, em último caso, uma versão escrita no núcleo, restrita aos casos
que as peças pedem.

Se uma união passar de 1000 pedaços novos, ela é dividida em passos menores.
Se isso ficar ruim de usar no dia a dia, o `BLOCO` é aumentado. A pessoa deixou
em 2026-09-29 essa decisão com a IA, que é quem trabalha com a numeração. Como
aumentar o `BLOCO` renumera todo conteúdo salvo, a mudança vem com a migração
das receitas e dos alvos salvos e com testes provando que cada peça do acervo
reexecuta igual.

## Fechamento

A preencher.

## Depois deste plano

O candidato principal para vir em seguida é [as partes do
braço](congelados/2026-09-26-as-partes-do-braco.md), congelado em 2026-09-28
para dar lugar a este. Ele volta com o ombro de canto reto já feito pela união
e segue com as partes restantes do braço.

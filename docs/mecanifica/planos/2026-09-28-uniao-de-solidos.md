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

Uma receita junta, subtrai ou intersecta dois sólidos com um passo só. A malha
que sai é uma superfície fechada, sem face interna, e cada face dela sabe de
qual sólido de entrada veio. O ombro com canto reto sai sem vinco na vista
isométrica em 1600 px, e a pessoa confirma isso olhando.

## Filtro Agent-First

A operação é ENVOLVER: o cálculo fica com a biblioteca Manifold (`manifold-3d`,
em WebAssembly, sem Three.js), e o núcleo só converte a malha na entrada e na
saída e grava a identidade. Escrever o cálculo à mão fica ADIADO, porque
booleana robusta é um problema difícil que a biblioteca já resolve. O filete ao
longo da costura também fica ADIADO até a união existir. Ele entra só se a
aresta viva da costura aparecer como defeito na foto.

## Incluído

- os passos `unir`, `subtrair` e `intersectar` no núcleo, com a mesma forma de
  seleção por origem que os outros passos usam;
- a identidade: cada face que sai herda a origem do sólido de onde veio, e a
  costura não inventa nome novo;
- a prova numa fixture neutra, com dois cubos que se cruzam, conferindo que a
  malha sai fechada, sem face interna e com o volume esperado;
- a prova no ombro, com a coluna e o braço reto unidos;
- o registro em `docs/mecanifica/UPSTREAM-NOS.md`, porque a operação é geral.

## Excluído

- filete e arredondamento na costura;
- booleanas com malhas abertas, que a biblioteca recusa;
- mudança nas peças já fixas, exceto o ombro, que só muda com o aceite da
  pessoa.

## Gate de saída

1. A fixture dos dois cubos sai fechada, com volume dentro de 0,1% do
   esperado e nenhuma face dentro do outro sólido.
2. A mesma receita executada duas vezes dá a mesma malha, byte a byte.
3. Cada face que sai aponta uma origem que existia na entrada.
4. O ombro unido, visto em isométrica a 1600 px, não mostra vinco, e a pessoa
   confirma olhando.
5. `npm run gates --completo` passa.

## Fatias

1. A fixture dos dois cubos falhando sem a operação, para servir de linha de
   base.
2. O passo `unir` com a Manifold e a identidade herdada.
3. Os passos `subtrair` e `intersectar`, que usam o mesmo caminho.
4. O ombro com canto reto refeito com `unir`, mostrado à pessoa.
5. Fechamento.

## Riscos e parada

A Manifold carrega WebAssembly de forma assíncrona, e o núcleo hoje executa as
receitas de forma síncrona. O caminho previsto é carregar a biblioteca uma vez,
quando cada ferramenta abre. Se isso não bastar em algum lugar, a pessoa já
autorizou em 2026-09-28 tornar o executor assíncrono, desde que cada ferramenta
afetada ganhe teste provando que continua dando o mesmo resultado. Também paro se a malha que o núcleo gera
não for fechada o bastante para a Manifold aceitar sem reparo. Nesse caso,
consertar o `loft` vem antes.

## Fechamento

A preencher.

## Depois deste plano

O candidato principal para vir em seguida é [as partes do
braço](congelados/2026-09-26-as-partes-do-braco.md), congelado em 2026-09-28
para dar lugar a este. Ele volta com o ombro de canto reto já feito pela união
e segue com as partes restantes do braço.

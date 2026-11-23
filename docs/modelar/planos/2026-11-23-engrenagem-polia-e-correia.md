# Engrenagem, polia e correia: o par que transmite movimento por poucos números

**Estado:** rascunho

**Território:** a declarar ao ativar. Previsto: `procedural/familias/engrenagem/`, `procedural/familias/polia-e-correia/`, `procedural/familias/index.js`, `tools/fixtures/transmissao/`, `docs/modelar/ferramentas-por-objeto.json`, `tools/modelar/capacidade.mjs`, e, se a fatia 1 confirmar a colisão, o arquivo do `chamar` da família em `src/autoria/`.

**Responsável:** a IA da sessão, com a pessoa aprovando a forma de cada família por imagem.

**Repositório e base:** `warbookbr/nos-modelar`, main na ativação.

## Problema observado

O [mapa de ferramentas por objeto](../pesquisas/FERRAMENTAS-POR-OBJETO.md) dá como inexistentes as engrenagens, pedidas por 26 objetos em 11 famílias, e a polia com correia, pedida por 18 objetos em 7 famílias. Entre eles estão a caixa de câmbio, o torno, a bicicleta, o servo, a garra, a furadeira de bancada, a esteira transportadora, o robô cartesiano, o guindaste e o compressor. O componente engrenagem do esboço antigo saiu com ele em 2026-11-05, e polia nunca houve. Hoje uma engrenagem só sai com o contorno do dente calculado à mão na receita, e um par só fica engrenado se a receita acertar sozinha a distância entre centros e a fase do dente. O braço de prova, ativo desde 2026-11-23, já pede polias GT2 de 20 e 80 dentes no cotovelo.

## Resultado

O agente faz uma engrenagem ou uma polia por módulo, ou passo, e número de dentes. Ele faz um par engrenado, ou duas polias com a correia fechada em volta, por uma chamada que devolve a distância entre centros e a relação de transmissão, sem calcular ponto de dente.

## Filtro Agent-First

A engrenagem e a polia com correia são famílias pelo [contrato da família](../contratos/CONTRATO-DA-FAMILIA.md), com perfis, conferência, aprovação e portas: ENVOLVER as operações que o núcleo já tem (a `extrusao` de contorno, o `lathe`, o `arranja` radial e a booleana), sem operação nova. O dente evolvente é cálculo da família, em mm, e sai como contorno fechado para a `extrusao`. O núcleo continua sem saber o que é dente.

Par como composição: ENVOLVER. O par (engrenagem com engrenagem, polia com polia e correia) é uma composição da família que chama as duas peças, as põe na distância entre centros e acerta a fase do dente. A distância, a relação e o comprimento da correia saem como dado da chamada, e a pessoa não recalcula nada.

Tabela de norma: USAR DIRETO a forma da tabela da família `fixador`, com os módulos da série ISO 54 e os perfis de correia (GT2 de 2 mm, HTD de 3 e 5 mm, T5 e as seções em V Z, A e B) como dado da família. O catálogo de normas único que a [análise de 2026-10](../pesquisas/ANALISES-DE-2026-10.md) propõe fica ADIAR, para quando uma terceira família pedir a mesma tabela.

Colisão de ids de origem entre duas chamadas de família na mesma receita: o backlog a registra desde o plano da hélice ("Portas e montagem do fixador e da mola"). O par depende disso. A fatia 1 reproduz a colisão e, se ela existir, REFATORAR o `chamar` para dar prefixo próprio a cada chamada. A correção é geral e serve também à mola e ao fixador.

## Incluído

1. A reprodução da colisão de ids com duas chamadas da mesma família numa receita neutra (`tools/fixtures/transmissao/`), e a correção no `chamar` se ela se confirmar, com o acervo saindo igual.
2. A família `engrenagem`, com os perfis reta de dente evolvente, helicoidal, cremalheira e catraca. Os parâmetros são módulo, número de dentes, ângulo de pressão, largura, furo e cubo. A conferência garante que o dente não se corta (o número mínimo de dentes sem correção de perfil é recusado com a medida). As portas são o eixo, a face de apoio e o círculo primitivo.
3. O par engrenado como composição da `engrenagem`, que põe as duas na distância entre centros pelo módulo e pelos dentes, com a fase que encaixa dente em vão. A medida da folga entre flancos é feita pelo gate de contato em posições amostradas de uma volta.
4. A família `polia-e-correia`, com os perfis polia dentada (GT2, HTD, T5), polia em V e polia lisa. Os parâmetros são o perfil, o número de dentes ou o diâmetro primitivo, a largura, as flanges, o furo e o cubo. As portas são o eixo, a face de apoio e o diâmetro primitivo.
5. O conjunto de duas polias com a correia fechada em volta, como composição. Ele tem a distância entre centros, o comprimento da correia arredondado ao comprimento comercial mais próximo com a distância corrigida, e a correia com os dentes no lado de dentro quando o perfil é dentado.
6. O mapa de ferramentas atualizado para engrenagens e polia com correia, e a ficha de cada uma em `npm run capacidade`.

## Excluído

A engrenagem cônica, o sem-fim com a coroa, a engrenagem interna e o trem planetário ficam para outro plano, que este deixa preparado pelo dente evolvente. Ficam fora também a corrente de rolos com a coroa, que é a ferramenta `elos`, a correia com tensor ou com mais de duas polias, o cálculo de resistência e de torque, e o movimento animado na bancada. A polia do braço de prova é decisão do plano dele: este plano entrega a família e não muda `procedural/pecas/braco-de-prova/`.

## Invariantes

O núcleo não ganha nome de objeto nem operação nova. O acervo sai igual, com a mesma malha em cada peça, também depois da correção do `chamar`. Cada família é determinística: a mesma chamada dá a mesma malha, byte a byte, em duas execuções.

## Gate de saída

1. A colisão de ids reproduzida e resolvida, ou descartada com a prova, e o acervo igual.
2. Cada família com perfis, conferência pelo contrato da família, teste e o veredito da pessoa por imagem em `aprovacao.json`.
3. Um par de engrenagens retas de módulo 1 (20 e 40 dentes) e um par de polias GT2 (20 e 80 dentes) com a correia montados na bancada. A distância entre centros medida está igual à calculada, até 0,01 mm, e nenhum dente atravessa o vizinho nas posições amostradas de uma volta.
4. Cada perfil abaixo de dois segundos de execução no ponto médio, e a malha exportável em STEP e OBJ.
5. `npm run gates` verde e o CI verde.

## Fatias

1. A receita neutra com duas chamadas da mesma família, a colisão de ids reproduzida ou descartada, e a correção no `chamar`, se for o caso.
2. A família `engrenagem` com a reta, a helicoidal, a cremalheira e a catraca, e a aprovação da pessoa por imagem.
3. O par engrenado, com a fase e a medida de folga nas posições amostradas.
4. A família `polia-e-correia` com as polias e o conjunto com a correia, e a aprovação da pessoa por imagem.
5. O mapa de ferramentas, as fichas e o fechamento.

## Decisão da pessoa

Antes de ativar, a pessoa decide a ordem. A recomendação é polia e correia antes da engrenagem, porque o braço de prova já pede o par GT2 de 20 e 80 dentes e a polia é a peça mais simples das duas. Nesse caso as fatias 4 e 2 trocam de lugar, e o dente evolvente vem depois.

## Riscos e parada

Se o contorno do dente evolvente com muitos dentes (acima de 150) passar de dois segundos ou der lasca na `extrusao`, a família reduz os pontos por flanco e mede de novo, e se ainda assim não passar, a fatia volta à pessoa com a medida. Se a helicoidal pedir uma varredura com giro que o núcleo não tem, ela sai do plano e vai ao backlog com a medida, sem operação nova. Se a correção do `chamar` mudar a malha de alguma peça do acervo, a fatia 1 para e volta à pessoa antes de seguir.

## Fechamento

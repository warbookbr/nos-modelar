# Engrenagem, polia e correia: o par que transmite movimento por poucos números

**Estado:** concluído

**Território:** `procedural/familias/polia-e-correia/`, `procedural/familias/engrenagem/`, `tools/fixtures/transmissao/`, `src/autoria/chamar-familia.js`, `docs/modelar/banco-de-provas/transmissao-2026-11-23/`, `procedural/familias/cremalheira/`, `tools/modelar/aprovacao-da-familia.mjs`, `tools/modelar/lascas-da-malha.mjs`, `tools/modelar/lascas-da-malha.test.mjs`, `procedural/familias/index.js`, `docs/modelar/ferramentas-por-objeto.json`, `tools/modelar/capacidade.mjs`.

Ativado pela pessoa em 2026-11-23, começando pela polia. Os três últimos caminhos do território são compartilhados entre os planos desde a mesma data, por decisão da pessoa, porque todo plano de família nova passa por eles.

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

Colisão de ids de origem entre duas chamadas de família na mesma receita: o backlog a registra desde o plano da hélice ("Portas e montagem do fixador e da mola"). A fatia 1 mediu que ela só acontece com duas chamadas cruas em `CHAMADAS_COMPOSICOES` e que `instanciaDeFamilia` já a resolve: USAR DIRETO, sem mudar o `chamar`.

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

1. Feita em 2026-11-23: a colisão reproduzida e descartada como defeito do caminho certo, em `tools/fixtures/transmissao/duas-instancias.test.mjs`.
2. Feita em 2026-11-23: a família `polia-e-correia` com as polias dentadas, em V e lisa, aprovada pela pessoa por imagem.
3. Feita em 2026-11-23: o conjunto de duas polias dentadas com a correia fechada, com o par GT2 de 20 e 80 dentes medido.
4. Feita em 2026-11-23: a família `engrenagem` com a reta e a catraca e a família `cremalheira`; a helicoidal saiu para o backlog.
5. Feita em 2026-11-24: o par engrenado e o pinhão sobre a cremalheira, com a fase e a medida de folga nas posições amostradas.
6. Feita em 2026-11-24: o registro das famílias, o mapa de ferramentas, as fichas, a exportação e o fechamento.

## Decisão da pessoa

Decidido em 2026-11-23: a polia e a correia vêm antes da engrenagem, porque o braço de prova já pede o par GT2 de 20 e 80 dentes e a polia é a peça mais simples das duas.

## Riscos e parada

Se o contorno do dente evolvente com muitos dentes (acima de 150) passar de dois segundos ou der lasca na `extrusao`, a família reduz os pontos por flanco e mede de novo, e se ainda assim não passar, a fatia volta à pessoa com a medida. Se a helicoidal pedir uma varredura com giro que o núcleo não tem, ela sai do plano e vai ao backlog com a medida, sem operação nova. Se a correção do `chamar` mudar a malha de alguma peça do acervo, a fatia 1 para e volta à pessoa antes de seguir.

## Andamento

Fatia 1, em 2026-11-23. Duas chamadas cruas da família `mola` em `CHAMADAS_COMPOSICOES` dão 7 órfãos com origem ambígua (52 com o `fixador`), porque a composição declara ids de origem fixos e a expansão não os separa por chamada. Pelo `instanciaDeFamilia`, que soma a base aos ids e renomeia as partes, as duas molas saem com 6.200 faces, nenhum órfão e as partes `aEspiras` e `bEspiras`, tanto pelas `poses` de uma chamada quanto por duas chamadas com a `base` encadeada; sem a base, a colisão volta. O `chamar` e o núcleo não mudam, e o acervo fica igual. O processo pegaria a colisão numa peça, porque os órfãos aparecem no `descrever` e reprovam a guarda do acervo, mas o caminho certo não estava escrito no contrato da família e o backlog o dava como defeito: o contrato ganhou a frase que manda duas instâncias para o `instanciaDeFamilia`, com a prova. O par de polias e o de engrenagens seguem por ele.

Fatia 2, em 2026-11-23. A família `polia-e-correia` gera a polia dentada GT2, HTD 3M, HTD 5M e T5 por número de dentes, com ou sem flanges, a polia em V das seções Z, A e B de um a quatro canais e a polia lisa, todas com cubo, furo e a porta `eixo`, numa parte só, em menos de meio segundo cada. O corpo é um `lathe`; os vãos dos dentes são uma `extrusao` repetida por `arranja` radial e tirada por `subtrair`, sem operação nova. O canal em V segue a ISO 4183:1989 (largura de referência, alturas, distância entre canais, borda, ângulo de 34 ou 38 graus pelo diâmetro e diâmetro mínimo), e o diâmetro da polia em V é o de referência. As dentadas usam a profundidade e a largura do vão e a diferença da linha primitiva do gerador aberto "Parametric Pulley" (2012), porque a ISO 13050 (HTD) e a DIN 7721 (T5) completas são pagas e a GT2 não tem norma pública; o vão da GT2 e das HTD é curvo e o da T5 é trapezoidal de 40 graus. Flange, cubo, parede em volta do furo e a polia lisa não seguem norma. A primeira versão aproximou as medidas de canal sem fonte, e a pessoa pediu os valores de norma antes de aprovar; o processo não exigia a fonte de uma tabela de norma usada por família, e o contrato da família passou a pedir (seção "Medidas de norma"). A camada mecânica foi gravada depois de a pessoa aprovar as sete polias por imagem.

Fatia 3, em 2026-11-23. `correia.js` da família calcula a transmissão de duas polias dentadas: a correia fica com o número inteiro de dentes mais próximo da distância pedida, e a distância entre centros sai do comprimento primitivo (2·√(C² − (R2 − R1)²) + R1·(π − 2β) + R2·(π + 2β)) por bisseção. A correia é o corpo em trechos de 16 dentes e cada dente um sólido à parte, da altura da tabela da Pfeifer Industries, 0,05 mm afastada da polia, e as polias giram até um vão ficar sob um dente. O par GT2 de 20 e 80 dentes pedido a 150 mm sai com correia de 201 dentes (402 mm) e 149,78 mm entre centros, medidos na malha até 0,01 mm, sem contato entre correia e polias, em menos de 1 s, na prova `tools/fixtures/transmissao/par-gt2.test.mjs`. Dois achados no caminho. A correia de um contorno só com mil pontos levava 25 s na divisão da tampa em pedaços convexos (o custo que o backlog já registra) e passou a sair em trechos. Com as bases dos dentes na mesma reta da face lisa, a tampa saía com pedaço de área nula, e a medida de contatos devolvia a lista de contatos vazia com a cobertura incompleta, inclusive com a polia girada meio dente; os dentes passaram a sólidos à parte, e a prova exige a cobertura completa e acusa a polia girada. O processo pegaria isso numa peça, porque a descrição da peça reprova par inconclusivo; a prova de fixture não conferia a cobertura e agora confere. No mesmo dia, a pedido da pessoa, entraram a correia em V e a lisa: a seção clássica da DIN 2215 (largura no topo, altura e base de Z, A e B, da ficha da Mädler) varrida pelo `friso` em volta das duas polias, uma volta por canal, com a largura de referência da ISO 4183 no diâmetro de referência, subindo o necessário para ficar a 0,05 mm das paredes do canal de 34 graus; a lisa tem 3 mm de espessura, sem norma. A distância entre centros fica a pedida, porque o comprimento comercial da ISO 4184 não está no repositório. Os quatro pares da prova `tools/fixtures/transmissao/par-por-atrito.test.mjs` saem sem contato em menos de 0,2 s, e a correia em V acusa a polia deslocada 3 mm. A primeira correia lisa tocava a polia maior: a corda entre amostras de 5 graus afunda 0,08 mm num raio de 80 mm, mais que a folga, e a seção de toda correia, dentada inclusive, passou a subir a flecha das cordas; a prova ganhou o par T5 de 24 e 150 dentes, que passaria da folga sem isso.

Fatia 4, em 2026-11-23. A família `engrenagem` gera a reta de dente evolvente e a catraca, e a `cremalheira` ficou família à parte, porque a aprovação exige que toda porta declarada saia em todo tipo e a cremalheira não tem eixo; o território ganhou `procedural/familias/cremalheira/`. A reta segue o perfil de referência tipo A da ISO 53:1998, tabela 2, lida na amostra pública da norma (20°, saliência de 1 módulo, creux de 1,25 e raio de pé de 0,38), com espessura de meio passo no primitivo e de 17 a 200 dentes; o vão é a evolvente do círculo de base, radial abaixo dele e com o raio de pé tangente. A cremalheira é o mesmo perfil em linha, e a catraca não tem norma (regras da família no código). Corpo por `lathe` ou `extrusao`, vãos por `extrusao` repetida e `subtrair`, sem operação nova. A helicoidal saiu, como o plano previa: o núcleo não tem extrusão com giro e o `loft` só aceita seção convexa; foi ao backlog. A cremalheira teve dois achados: três pontos alinhados no flanco reto abriam a extrusão do vão no módulo 10, e o custo da divisão da tampa em pedaços convexos cresce mais que linearmente (12 s com 100 dentes), de modo que o teto ficou em 60 dentes e a medida foi ao item do backlog que já registrava esse custo. Depois da primeira aprovação, a pessoa estranhou a catraca: ela saía em 25 pedaços, a roda e uma lasca solta na ponta de cada dente, porque o lado de fora do vão era a corda entre as duas pontas, que passava por dentro do círculo de cabeça; a reta de módulo 2 com 30 dentes tinha o mesmo defeito (27 pedaços), com a corda de ±4,8° a 31,99 mm na cabeça de 32 mm. O vão passou a fechar por um ponto do meio afastado da cabeça, e a evolvente a passar da cabeça sem canto. A aprovação mecânica não pegou, porque confere a malha fechada e cada lasca é fechada; o teste de cada família passou a exigir a malha num pedaço só (`tools/fixtures/transmissao/pedacos.mjs`), nos perfis, e os pontos mínimo, médio e máximo das três famílias saem num pedaço. Um pedaço só não serve de regra geral, porque a roda, a dobradiça, a mola e outras saem em vários pedaços de propósito (a roda chega a 34). Em 2026-11-24 a pessoa autorizou a regra geral de lascas, e o território ganhou a aprovação das famílias: `lascasDaMalha` reprova na aprovação de toda família o pedaço com 2 × volume / área abaixo de 0,02 mm, que pega a catraca antiga (0,0003 mm) e deixa passar o pedaço mais fino de propósito das 13 famílias, a superfície aerodinâmica inteira no ponto mínimo (0,068 mm).

Fatia 5, em 2026-11-24. `engrenamento.js` da família `engrenagem` dá o par de retas, na distância a = m·(z1 + z2)/2 afastada de j / (2·tan 20°) para a folga entre flancos j (0,05 módulo por padrão, regra da família, porque o dente de meio passo dá folga nula na distância nominal), com a motora de dente voltado para a movida e a movida de vão voltado para a motora, e o pinhão sobre a cremalheira, com o centro a rp mais o mesmo afastamento acima da linha primitiva. O par de módulo 1 com 20 e 40 dentes sai a 30,069 mm, medidos na malha até 0,01 mm; nenhum dente atravessa o outro em quatro posições de um passo da motora (os dentes são iguais, e o engrenamento se repete a cada passo) nem em três posições de um passo da cremalheira; a medida de contatos acusa o par apertado, a motora meio dente fora de fase e o pinhão girando ao contrário (`tools/fixtures/transmissao/par-de-engrenagens.test.mjs`).

## Fechamento

Concluído em 2026-11-24. Entregues as famílias `polia-e-correia` (dentada GT2, HTD 3M, HTD 5M e T5, em V das seções Z, A e B da ISO 4183 e lisa), `engrenagem` (reta de dente evolvente pela ISO 53 e catraca) e `cremalheira` (o perfil da ISO 53 em linha, até 60 dentes), cada uma com perfis, teste, camada mecânica gravada e a forma aprovada pela pessoa por imagem; a correia dentada, em V e lisa entre duas polias (`correia.js`); o par de engrenagens e o pinhão sobre a cremalheira (`engrenamento.js`); as fichas `transmissaoDentada`, `transmissaoPorAtrito`, `parDeEngrenagens` e `pinhaoECremalheira` em `npm run capacidade`; o mapa de ferramentas com a polia e a engrenagem como parciais; e, fora do recorte inicial, a reprovação de lasca solta abaixo de 0,02 mm na aprovação de toda família.

O gate de saída passou. 1: a colisão de ids foi descartada com a prova, porque duas instâncias passam pelo `instanciaDeFamilia`, e o núcleo e o acervo não mudaram. 2: cada família com perfis, conferência pelo contrato, teste e o veredito da pessoa. 3: o par de módulo 1 com 20 e 40 dentes e o par GT2 de 20 e 80 dentes com a correia, montados, com a distância entre centros medida igual à calculada até 0,01 mm e nenhum dente atravessando o outro nas posições amostradas. 4: cada perfil abaixo de 2 s, e os 14 exportados em STEP e OBJ com a tolerância de 0,01 mm (`tools/fixtures/transmissao/exportacao.test.mjs`, na lista dos lentos, uns 27 s). 5: gates e CI verdes em cada envio.

Fica fora e foi ao backlog: a engrenagem helicoidal, que pede extrusão com giro no núcleo, e a medida da cremalheira longa no item de `pedacosConvexos`. Ficam para outro plano a cônica, o sem-fim e a coroa, a engrenagem interna, o trem planetário, o tensor e a correia de mais de duas polias, o comprimento comercial da correia em V (ISO 4184) e o uso das polias GT2 no braço de prova, que é decisão do plano dele. As imagens estão em `docs/modelar/banco-de-provas/transmissao-2026-11-23/`.

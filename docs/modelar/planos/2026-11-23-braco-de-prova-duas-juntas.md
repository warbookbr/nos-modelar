# Braço de prova de duas juntas: a forma com os componentes escolhidos na mecatrônica dentro

**Estado:** concluído

**Território:** `procedural/pecas/braco-de-prova/`, `modulos/ficha-do-objeto/`, `tools/modelar/exportar-ficha.mjs`, `tools/modelar/conferir-pedido.mjs`, `docs/modelar/banco-de-provas/braco-de-prova-2026-11-23/`.

Em 2026-11-25, o território ganhou o módulo da ficha inteiro e os dois comandos da ponte, porque o pedido inicial pede a regra do pedido sem ficha, a massa declarada da peça comprada e a peça que representa cada componente.

Ativado pela pessoa em 2026-11-23, junto com o plano irmão da mecatrônica.

**Responsável:** a IA da sessão modela pelo alinhamento e pelo laço de modelagem; a pessoa decide a forma no alinhamento e a aprova por imagem.

**Repositório e base:** `warbookbr/nos-modelar`, main na ativação. O outro lado é o plano do roteiro de ponta a ponta do nos-mecatronica (o plano `2026-11-23-roteiro-de-ponta-a-ponta` da pasta de planos de lá), que leva o pedido inicial com os componentes e confere a forma pela simulação.

## Problema observado

O braço de prova de duas juntas tem os requisitos aprovados e os componentes escolhidos do lado da mecatrônica: um braço de mesa, num plano vertical, com dois elos que somam 300 mm, um NEMA 23 de 57 × 57 × 76 mm com uma redução planetária de 5:1 de 57 × 57 × 55 mm no ombro, um NEMA 17 de 42 × 42 × 40 mm com polias GT2 de 20 e 80 dentes no cotovelo, e os drivers, o Arduino Uno e a fonte de 12 V na base. No Modelar ele não existe. É o primeiro objeto que nasce dos componentes, e não o contrário, como aconteceu com o braço de seis eixos, cuja forma foi aprovada antes de se saber que motor ia dentro.

## Resultado

A peça `braco-de-prova` no acervo, montada em etapas como o braço robótico, com cada componente do pedido inicial ocupando o lugar dele na forma, aprovada pela pessoa por imagem; a ficha exportada por `npm run exportar:ficha -- braco-de-prova`, com os componentes como peças com a massa da folha de dados; e o pedido inicial respondido item a item por `npm run conferir:pedido`.

## Filtro Agent-First

Componente comprado na forma: ENVOLVER a forma do componente pela caixa e pelo eixo do item `componente` (um bloco com o eixo de saída), declarado como peça do objeto e fixo na montagem, sem família nova; a família `motor-de-passo` fica para quando outro objeto pedir mais que a caixa. A massa da peça é a do item, não a do volume da malha.

Pedido inicial: ENVOLVER o `conferir:pedido` com o item `componente`: a resposta cumprida diz a peça que representa o componente, e a não cumprida diz por que ele não coube. A cópia dos esquemas sobe para a 1.2 quando a mecatrônica a publicar.

## Incluído

- o alinhamento da forma com a pessoa (base, elos, onde vai cada motor e redução, a garra como volume) e o plano da receita;
- as partes e a montagem, com os componentes do pedido inicial como peças fixas na pose que o alinhamento decidir;
- a ponte do objeto (`ponte.json`) com os conjuntos, as duas juntas, as massas dos componentes pela folha e a densidade do resto;
- a cópia dos esquemas 1.2, a resposta ao item `componente` no conferidor do pedido, com teste, e o pedido inicial respondido;
- o banco de provas com as vistas aprovadas, a ficha e o pedido respondido.

## Excluído

- a garra modelada em detalhe, que entra como volume com a massa dos requisitos;
- a placa de circuito, que a mecatrônica ainda não pediu;
- mudar a forma para cumprir item não cumprido sem a pessoa.

## Gate de saída

1. A pessoa aprovou a forma por imagem, e as etapas da montagem estão fixas.
2. Cada componente do pedido inicial está na forma, ou volta como não cumprido com o motivo.
3. A ficha do braço de prova passa no conferidor da ponte daqui e no de lá, e sai igual em duas exportações.
4. O pedido inicial respondido passa no conferidor de lá.
5. A guarda do acervo passa com a peça nova, e o núcleo não muda.

## Fatias

1. O alinhamento da forma com a pessoa e o plano da receita.
2. A modelagem pelo laço, com os componentes no lugar, e a aprovação da pessoa.
3. A ponte do objeto, a ficha e a resposta ao pedido inicial, depois da 1.2 publicada lá.
4. O banco de provas e o fechamento.

## Riscos e parada

Se o NEMA 23 com a planetária não couber de forma aceitável no ombro de um braço de 150 mm de elo, o plano para e o item volta não cumprido, com a medida, para a pessoa decidir lá entre outro componente e outro tamanho de braço.

## Fechamento

Concluído em 2026-11-25. A pessoa aceitou as nove etapas da montagem por imagem em 2026-11-24, com os defeitos de acabamento em aberto para uma etapa posterior, e elas estão fixas; as vistas aprovadas estão no banco de provas como `aprovado-*.png`. A ficha sai de `npm run exportar:ficha -- braco-de-prova` com 9 peças, 3 conjuntos e 2 juntas, igual em duas exportações, e passa nos conferidores daqui e de lá; as peças compradas levam a massa do pedido inicial por `massaDasInstancias`. O pedido inicial, na versão 1.2 e com a planetária de folga baixa que a pessoa escolheu depois da simulação, volta com os oito componentes cumpridos e passa no conferidor de lá. A guarda do acervo passa com a peça nova, e o núcleo não mudou além do encaixe parcial, que teve plano próprio. Três achados não seriam pegos pelo processo sozinho: o eixo do ombro sem encaixe no elo, que o crítico visual achou e agora a relação de encaixe confere; a operação de casca fora da cobertura do cache, que só o CI pegou, e a base entrou na lista; e a folga da planetária contra a precisão, que o crítico da simulação achou e a simulação de lá agora confere. Voltam ao backlog o acabamento das nove partes (botão de cogumelo, eixos e furos facetados, correia, meio milímetro do eixo do cotovelo além da polia grande), o comando que lê `articulacoes.json` e o caminho para corrigir uma forma aprovada fora do laço.

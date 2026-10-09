# Contrato de forma global N2

## Papel

Este contrato implementa a fatia N2 do plano ativo. Ele permite à IA declarar
um alvo mensurável, criar um andaime do objeto inteiro, compilar uma blocagem
neutra e decidir se a forma pode avançar. Não implementa superfície, detalhe,
decomposição, montagem ou regras de carro no núcleo.

## Fontes e derivados

São fontes editáveis:

- `mecanifica.alvo-forma-global@2`: envelope, landmarks, silhuetas, regiões
  obrigatórias, rejeições, limiares e orçamento;
- `mecanifica.andaime-global@2`: envelope pretendido, landmarks e volumes
  semânticos do objeto inteiro.

São derivados descartáveis:

- `mecanifica.blocagem-global@2`: triângulos neutros, envelope medido,
  procedência por volume/região e estatísticas;
- vistas SVG/PNG, máscaras de comparação, medições e decisões.

Índices de vértices e faces pertencem somente ao produto compilado. Identidade
autoral permanece nos IDs do alvo, andaime, landmark, volume e região.

## Vocabulário

A N2 aceita dez volumes globais. Todo volume declara `id`, `regioes`, `tipo` e
`centro`, e os campos abaixo, todos obrigatórios, sem nenhum extra. As medidas
estão em milímetro.

| Tipo | Intenção | Campos do tipo |
|---|---|---|
| `caixa` | massa retangular simples | `dimensoes` |
| `cilindro` | roda, eixo ou volume axial bruto | `eixo`, `raio`, `comprimento`, `segmentos` |
| `prisma` | perfil convexo extrudado num eixo | `eixoExtrusao`, `eixosPerfil`, `comprimento`, `perfil` |
| `casco-secoes` | casco convexo por seções ao longo de um eixo | `eixoPercurso`, `eixosSecao`, `secoes` |
| `cone` | cone ou tronco de cone | `eixo`, `raioBase`, `raioTopo`, `comprimento`, `segmentos` |
| `esfera` | cúpula, bola, volume arredondado | `raio`, `segmentos` |
| `anel` | flange, arruela, aro com furo passante | `eixo`, `raioExterno`, `raioInterno`, `espessura`, `segmentos` |
| `revolucao` | sólido de revolução de um perfil | `eixo`, `perfil` (`[raio, altura]`), `segmentos` |
| `extrusao` | perfil simples, convexo ou côncavo, extrudado num eixo | `eixoExtrusao`, `eixosPerfil`, `comprimento`, `perfil` |
| `tubo` | tubo por pontos com raio de curva | `caminho`, `raio`, `raioCurva`, `segmentos` |

Esse vocabulário não pretende modelar superfície final. Ele existe para provar
postura, silhueta, proporção e completude antes de investir em N3. As seis
últimas linhas são as primitivas do esboço, que `primitivas-forma-global.js`
valida e transforma em malha.

As primitivas seguem estas regras. O `centro` do cone, do anel e da revolução é o
meio do comprimento ao longo do eixo; na extrusão e no tubo é a origem dos pontos
do perfil e do caminho, como no prisma. O cone tem `raioBase` no começo do eixo e
`raioTopo` no fim, um deles pode ser zero, e raios iguais são recusados porque
formam um cilindro. A esfera tem os polos em y e `segmentos` múltiplo de 4, o que
põe o equador e os pontos cardeais em vértices e deixa o envelope exatamente
igual ao raio. O anel é oco, com `0 < raioInterno < raioExterno`, e a vista ao
longo do eixo mostra o furo. A revolução é maciça: o perfil sobe ao longo do
eixo, aceita degraus e cinturas, tem raio zero só nas pontas e mede as alturas a
partir do meio da faixa. A extrusão aceita qualquer polígono simples, sem ponto
repetido, sem área nula e sem arestas que se cruzem ou se toquem, em qualquer
sentido e em qualquer ordem de `eixosPerfil`; as tampas côncavas são
trianguladas por orelhas (`earcut`). O tubo varre uma seção circular por um
caminho de 2 a 64 pontos; com `raioCurva` maior que zero cada canto vira um arco
de raio `raioCurva` na linha de centro, cortado em seções retas de no máximo 6
graus, e com `raioCurva` zero o canto é uma meia-esquadria. O `raioCurva` precisa
passar do `raio` do tubo, para a curva interna não se fechar, e os trechos
precisam comportar as curvas ou as juntas vizinhas.

Toda malha de primitiva é fechada, tem a normal para fora e sai igual a cada
execução do mesmo andaime. Cada recusa diz o caminho do campo, o valor recebido e
o que é aceito, no formato `volumes[2].raioTopo: recebeu 30; aceita valor
diferente de raioBase (30)...`, e o código do erro (`ErroFormaGlobal.codigo`)
identifica o caso. Dimensão não positiva, eixo contraditório, perfil que não é
polígono simples e orçamento excedido falham antes de produzir uma blocagem. O
perfil do `prisma` e das seções do `casco-secoes` continua precisando ser
convexo; o perfil côncavo usa a `extrusao`.

## G01 — forma global medida

`mecanifica.avaliacao-forma-global@1` compara alvo e blocagem na mesma unidade e
nos mesmos eixos. O gate só aprova quando todos estes itens passam:

1. envelope derivado dentro do erro relativo permitido;
2. todos os landmarks presentes e dentro da tolerância;
3. todas as regiões globais obrigatórias representadas;
4. volumes e triângulos dentro do orçamento;
5. silhuetas frontal, direita e superior acima do IoU mínimo e abaixo do
   desvio máximo.

O comparador rasteriza separadamente os contornos do alvo e os triângulos da
blocagem. Uma média não esconde vista reprovada. Objeto parcial, cabine
achatada, landmark deslocado e estouro de orçamento são casos vermelhos do
corpus executável.

G01 é técnico. Ele não afirma que o objeto foi reconhecido.

## G02 — reconhecimento e aceite

`mecanifica.decisao-forma-global@1` só aprova quando:

- G01 está aprovado;
- uma crítica de papel `critico-visual-independente` registra o que reconheceu
  recebendo vistas neutras sem a identidade esperada;
- o usuário decide `aprovar` explicitamente.

Ausência de crítica ou de decisão mantém G02 `bloqueado`. Crítica ou usuário
reprovando torna a decisão `reprovado`. O autor não pode preencher o papel de
crítico independente e G01 verde não é convertido em reconhecimento implícito.

## Porta operacional

`criarServicoAutoria3DNativa().formaGlobal` expõe uma única fachada pura para
normalizar alvo/andaime, compilar, avaliar, decidir e renderizar evidências. O
provedor `forma-global-nativa` cobre somente `alvo`, `andaime` e `blocagem` no
planejador. Decomposição, integração, superfície, estados, revisão e publicação
continuam lacunas explícitas.

## Reexecução

```text
npx vitest run tools/mecanifica/forma-global-n2-caixa-preta.test.mjs tools/mecanifica/forma-global-n2-primitivas.test.mjs tools/mecanifica/forma-global-n2-g01-primitivas.test.mjs
npm run autoria:n2:evidencias
npm run autoria:n2:evidencias:check
```

`forma-global-n2-primitivas.test.mjs` prova cada primitiva (envelope medido, malha
fechada, volume conhecido, determinismo e recusa) e
`forma-global-n2-g01-primitivas.test.mjs` aprova no G01 um andaime que usa as seis,
com três casos vermelhos (envelope, região e silhueta).

Os PNGs são conveniência de inspeção. Os SVGs, JSONs e hashes do manifesto são
os derivados textuais reexecutáveis. O alvo e o andaime versionados continuam
as fontes de verdade.

## Limites

N2 não prova qualidade de superfície, curvatura, vincos, aberturas, contato,
conectividade, cinemática ou carro final. A prova usa um veículo compacto bruto
apenas porque quatro rodas, postura, corpo e cabine oferecem leitura global
fácil de atacar. N4 continuará responsável pelo carro bruto produzido sobre a
representação de superfície escolhida em N3.

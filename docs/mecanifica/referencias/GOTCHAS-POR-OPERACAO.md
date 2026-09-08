# Gotchas por operação: os casos completos

Consulta. Os limites curtos de cada operação chegam por
`descrever_capacidade`, junto com o schema; este documento guarda o caso que
originou cada um — a peça, o número medido, a rodada perdida. O limite diz o que
evitar; o caso diz por quê.

Fonte dos limites: `prototipos/procedural/v3/motor/uso-operacoes.js`. Alterar um
limite aqui não muda nada: mude lá, rode `npm run catalogo:gerar`, e o gate
`catalogo:check` confere.

## `loft` ou `inflate`: a escolha que nenhuma medida denuncia

Esta é a armadilha mais cara desta rodada, e ela não aparece em número nenhum.

A cabeça do machado e as abas da maça nasceram como `loft` de seções em losango.
As duas passavam em tudo: fechadas, orientadas, sem face órfã, sem grito. E as
duas estavam **erradas de forma** — a cabeça do machado era um cristal de
quartzo e a aba da maça era uma lente hexagonal espetada na haste.

A causa é a mesma nos dois casos, e é a SEÇÃO:

- um losango tem vértice no meio de cada lado, então a peça ganha uma QUINA
  correndo pelo meio da face — justamente onde uma cabeça de machado ou uma aba
  de maça precisa ser CHAPA;
- polo de raio zero fecha o `loft`, mas fechar afinando até virar BICO. Numa
  cabeça de machado isso apaga o gume; numa aba de maça apaga a aresta que bate.
  Maça de abas bate com aresta, não com ponta.

**A regra:** `loft` serve quando a forma É uma seção viajando — cabo, punho,
tubo, corrimão, lâmina de espada. Quando a forma é uma CHAPA COM CONTORNO —
cabeça de machado, aba de maça, guarda recortada, suporte estampado — a seção
viajando é a ferramenta errada, e nenhuma quantidade de estações conserta isso.
Para chapa, use `inflate`: uma silhueta recortada cruzada com uma planta de
espessura, que é a mesma descrição que o ferreiro usa, e sai fechada por
construção, sem polo e sem tampa.

Três detalhes de `inflate` que custaram render:

1. **`modo: 'secoes'`, não `'grade'`.** `grade` é literalmente voxelizado e sai
   com escada no contorno.
2. **`expoenteSecao` alto.** 2 é elipse e a face sai como travesseiro; foi
   preciso 12–14 para a face virar chapa de verdade.
3. **Dois pontos no z máximo, nunca um.** Silhueta que termina em ponta única
   deixa a última estação com altura zero e nascem faces de área nula —
   `malha:conferir` reprova. Fisicamente esses dois pontos são o pequeno plano
   do fio, que todo gume real tem.
## Furar uma chapa: quatro exigências, e três não são óbvias

O olho do machado — um furo passante por onde o cabo entra — levou três versões
para existir. `furo` sempre soube abrir o buraco; o que faltava era a receita
saber pedir. As quatro exigências, na ordem em que barram:

**1. A face de entrada precisa ter ENDEREÇO.** `furo` exige que `de` resolva
para exatamente uma face. Peça de `inflate` no modo `'secoes'` se endereça por
`{op:'inflate', id, estacao, lado}`. No modo `'grade'` não há endereço, e o
motor diz por quê.

**2. `lados` precisa ser 10, 14 ou 18 — nunca múltiplo de 4.** Esta é a menos
óbvia de todas. A seção começa com um vértice em 0°, então `lados` múltiplo de 4
põe outro VÉRTICE no topo, a 90°. Um furo centrado no eixo cai bem em cima dessa
linha, entre duas faces, e não cabe em nenhuma. Com `lados` ≡ 2 (mod 4) existe
uma FACE centrada no topo. Foi o que destravou o olho do machado depois de
`lados: 16` recusar em todas as estações.

**3. A face precisa ser GRANDE o bastante,** e por isso existem as `estacoes`
explícitas. Divisão em partes iguais dava 10,6 mm por face contra os ~30 mm do
olho; baixar `divisoes` daria a face e destruiria a lâmina. Com `estacoes` você
põe uma estação longa sobre o olho e as curtas onde o contorno curva. O furo tem
de caber na face de ENTRADA **e** na de SAÍDA, e as duas precisam se enxergar
(com `lados: 12`, o lado 2 enxerga o 9; o 2 com o 8, não).

**4. A face precisa ser PLANA,** com tolerância apertada. E face de `inflate` só
sai plana quando as duas seções vizinhas são SEMELHANTES — a mesma regra do
`loft`. Por isso o bloco do olho tem seção CONSTANTE, mesma altura e mesma
espessura de ponta a ponta da estação. Isso não é concessão à ferramenta: é como
um machado é forjado, com o olho num bloco paralelo e a lâmina abrindo depois.

**Depois de furar, a origem antiga não se cita mais inteira.** O furo CONSOME as
faces de entrada e saída — elas viram a borda anular do corte — e
`{op:'inflate', id}` passa a ser recusado. Isso é proteção, não estorvo: sem ela
você receberia em silêncio um conjunto diferente do que pediu. Una as duas
origens num `ALIAS`, ou ponha a peça furada como primeira geometria da receita e
use `sel: {tudo: true}`.
## Armadilhas de `loft`, medidas nas armas do acervo

Estas quatro apareceram modelando espada, machado e maça, e nenhuma delas dá
erro: a receita executa, a peça aparece, e o defeito só se vê na imagem ou no
conferente.

**1. `loft` sem polo sai TUBO ABERTO.** Uma seção `{pos, raio: 0}` em cada ponta
fecha a forma. Sem isso a lâmina da espada entrou com 24 arestas de borda — que
é buraco, e buraco reprova no preparo para micropolígono. O polo da base pode
ficar enterrado dentro da peça vizinha; ele existe para fechar, não para
aparecer.

**2. Quad de `loft` só sai PLANO quando as duas seções são SEMELHANTES** — mesma
razão entre espessura e altura. Não é regra de bolso: é o determinante da
diagonal, e dá zero exatamente nesse caso. Consequências práticas:

- vale para o que É seção viajando, como a lâmina da espada;
- lâmina que afila só na largura e mantém a espessura torce 25% perto da ponta,
  e a seção deixa de ser losango deitado e vira losango em pé — uma agulha
  grossa. Fazer a espessura acompanhar a largura conserta a forma E a torção;
- quando a forma EXIGE romper a semelhança — a cabeça do machado fica mais alta
  e mais fina ao mesmo tempo — a torção é inevitável. Aceite e diga por quê.
  Subdividir não resolve: de 4 para 16 estações o triângulo quadruplica e a
  torção cai só pela metade.

**3. `{op:'cilindro', id}` sem eixo seleciona SÓ AS LATERAIS.** As tampas pedem
citação própria (`tampa: 'fundo'`, `tampa: 'topo'`). Sem elas as duas faces
ficam sem parte, cinzentas e mudas. `npm run ativar:bancada` conta e nomeia as
faces órfãs, e diz esta causa.

**4. Repetição radial é UMA descrição.** Seis abas de maça saem de um `arranja`
`modo: 'radial'` com `volta: 360` e `total: 6`. Descrever seis abas é seis
lugares para errar. Nomeie as cópias: posição não é identidade.

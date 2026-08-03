# Relato de processo — Caso 02: placa adaptadora

## Estado entregue

Execução autorizada pelo despacho atual sobre `main` em
`c5b8e2072c3f887830a773fbf45adb5147257a51`, apesar da pausa administrativa
registrada no protocolo. A branch local é `codex/homologacao-caso-2-placa`.

- fonte `_placa-adaptadora.js` criada do zero, com uma parte (`placa`), um
  corpo conexo, uma chapa de `0,240 × 0,018 × 0,180 m`, 528 faces e um
  material;
- descrição estrita: zero faces sem identidade, zero órfãos e cinco portas;
- `id-cru:check`: zero ID cru novo;
- `r001` foi solicitada pelo comando oficial, mas **não foi promovida**:
  a câmera recusou a vista frontal de uma chapa de 18 mm; nenhuma revisão foi
  criada manualmente;
- quatro PNGs da captura oficial de bancada foram gerados e lidos. Isométrica,
  direita e superior passaram o enquadramento; a frontal foi recusada;
- não houve iteração de geometria: o diagnóstico determina corrigir a câmera,
  não remodelar a peça para ocupar o quadro.

## Leitura antes da primeira edição

- `AGENTS.md` e `docs/mecanifica/INDEX.md`;
- `docs/mecanifica/planos/README.md`, `HOMOLOGACAO-FLUXO-IA.md`,
  `COORDENACAO-LOCAL.md` e `COORDENACAO-REPOS.md`;
- os quatro contratos exigidos para criar peça e
  `docs/mecanifica/FLUXO-MODELAGEM-IA.md`;
- os exemplos `_flange-de-tubulacao`, `_tampa-de-caixa`,
  `_gabarito-de-furacao` e `_prateleira-furada`.

Também foram lidos, durante a execução, a gramática de `furo` em
`prototipos/fps/v3/motor/oficina.js`, o schema de orçamento em
`tools/modelagem/formato-pacote.mjs` e o revisor para confirmar a classificação
da tentativa. Nenhum documento legado foi consultado.

## Preparação

- caixa `codex`: sem mensagens; reservas: nenhuma ativa antes do caso;
- reserva criada: `64c1bc912928`, para a fonte, o pacote e este relato;
- pacote `homologacao-placa` preparado em modo `criacao`, com a parte `placa`;
- briefing personalizado para envelope, orçamento e cinco critérios do Caso 2.

## Comandos, resultados e ação tomada

1. `npm run coord -- inbox codex` e `npm run coord -- claims` — sem mensagens
   novas e sem reserva ativa; a reserva inicial foi recusada pelo filesystem
   somente-leitura do ambiente, não por sobreposição.
2. `npm run coord -- claim ...` e `send ...` com autorização do ambiente —
   reserva `64c1bc912928` e intenção `d8011652aaa8` registradas.
3. `npm run preparar:modelagem -- homologacao-placa
   --peca=_placa-adaptadora --modo=criacao --partes=placa` — criou o pacote sem
   sobrescrever artefato.
4. `npm run validar:modelagem -- homologacao-placa` — válido, 2.182 bytes,
   alvo e parte esperada reconhecidos.
5. `npm run descrever -- _placa-adaptadora --estrito` — 1 parte, 1 corpo, 528
   faces, 328 vértices, zero face sem identidade e zero órfão; envelope exato.
6. `npm run id-cru:check` — passou, sem ID cru novo.
7. `npm run revisar:modelagem -- homologacao-placa --revisao=r001` — a primeira
   chamada não pôde abrir `127.0.0.1:5173` no sandbox; a tentativa ficou
   classificada como `ferramenta`. Depois de liberar o ambiente, a mesma
   assinatura chegou às quatro capturas, mas a frontal foi recusada por
   enquadramento. Como a ferramenta deduplica por assinatura, preservou a
   primeira tentativa e descartou as imagens temporárias da segunda; nenhuma
   `r001` foi promovida.
8. `npm run bancada -- _placa-adaptadora --revisar` — gerou novamente as quatro
   imagens no diretório oficial de saída para leitura. A frontal mediu 3,1% de
   área (`48,0% × 6,4%`) e falhou; isométrica, direita e superior mediram,
   respectivamente, 20,8%, 4,1% e 28,8%, todas válidas.
9. `npm test`, `npm run typecheck` e `npm run build` — passaram. O primeiro
   `npm run gabarito:selecao:check` recusou corretamente a peça nova sem a
   declaração transitória; `npm run gabarito:selecao:check --
   --novas=_placa-adaptadora` passou, preservando as 35 peças existentes
   byte-idênticas. O gate de IDs crus foi repetido e passou.

## Leitura das quatro vistas

- **isométrica:** chapa única, passagem central real e profunda, seis furos em
  círculo e três furos da fileira são reconhecíveis. A fileira fica afastada do
  círculo e não se confunde com ele.
- **frontal:** apenas a faixa de 18 mm da espessura é visível. Não há leitura
  útil da passagem ou dos furos; o enquadramento oficial a recusou por área
  insuficiente.
- **direita:** a espessura permanece legível como chapa, mas os vazios não são
  distinguíveis nessa projeção lateral.
- **superior:** a passagem central é inequívoca; os seis furos têm distribuição
  regular e os três furos lineares são individualmente distinguíveis.

## Hipóteses de iteração

Nenhuma iteração foi executada, e portanto não há `r002` ou comparação entre
revisões. A hipótese que seria necessária não é uma alteração de fonte:
**uma câmera ortográfica com exceção explícita para chapa fina deve enquadrar a
frontal sem exigir espessura artificial**. Ela pertence a ferramenta/fluxo e
não foi implementada neste Caso 2. Alterar a geometria para elevar a ocupação
violaria o envelope ou a instrução do próprio diagnóstico.

## Bloqueios e dúvidas classificados

### `ferramenta`

- o sandbox inicial impediu a abertura do servidor local, sem relação com o
  modelo; a tentativa estrutural foi preservada;
- o revisor não promove `r001` quando a área frontal de uma chapa fina fica
  abaixo de 3,5%, embora o briefing imponha a espessura de 18 mm. A ação que
  ele próprio recomenda é reenquadrar a câmera, fora dos arquivos autorizados;
- a deduplicação de tentativa por assinatura conserva a recusa anterior de
  ferramenta e não acrescenta as imagens da repetição que chegou à recusa de
  câmera. A captura de bancada preserva a evidência visual, mas não substitui
  uma revisão assistida válida.

### `linguagem`

- `furo` nomeia semanticamente um disco único ou um círculo inteiro. A fileira
  foi declarada como três discos com nomes estáveis
  `fileiraLinearEsquerda`, `fileiraLinearCentro` e
  `fileiraLinearDireita`, mas o vocabulário não possui uma lista linear
  nomeada como grupo único. Assim, passagem central e círculo têm porta de
  grupo, enquanto a fileira só é nomeável por seus três membros; o critério de
  três **grupos** nomeáveis não fica plenamente atendido;
- abertura oblonga é capacidade ausente: a gramática aceita somente disco e
  círculo para `furo`, sem contorno oblongamente editável. Nenhuma pintura,
  sobreposição ou JavaScript auxiliar foi usado para fingir essa abertura.

### `modelo`

- nenhum erro de identidade, corpo, envelope, material, orçamento ou posição
  dos furos foi encontrado. A leitura em planta confirma as separações pedidas.

## Gates e retomada

Atendidos: preparação/validação do pacote, descrição estrita, uma parte e um
corpo, envelope, 528/1.200 faces, um material, ID cru, gabarito para peça nova,
testes, typecheck e build.

Não atendidos: `r001` assistida, quatro vistas válidas, leitura frontal dos
vazios e porta única para a fileira linear. Não foram fabricadas evidências ou
revisões para contornar essas lacunas.

Para retomar, mantenha a fonte e o pacote. Primeiro corrija, em recorte próprio,
o enquadramento de placas finas e a preservação de evidência quando uma tentativa
já existe. Depois execute novamente `revisar:modelagem` para produzir a primeira
`r001` válida, leia suas quatro imagens e só então formule uma hipótese de
iteração. A capacidade de grupo linear nomeado deve ser tratada separadamente;
não usar índices de furo, IDs de face ou JavaScript auxiliar como atalho.

## Retomada corretiva — gate de vistas naturalmente finas

O recorte posterior foi autorizado sem alterar `_placa-adaptadora.js`. A causa
era a regra pura `enquadramentoUtil`: ela exigia dimensão longa de 32% **e**
área de 3,5%. A frontal real da placa já ocupava `48,0% × 6,4%`, portanto tinha
silhueta longa enquadrada e espessura mensurável, mas área de apenas 3,072%.

A regra agora exige, além de não haver corte nem valor não finito, pelo menos
32% na dimensão longa e 4% na curta. A decisão explícita é que projeção com
lado zero ou quase degenerado não é uma vista de espessura e continua inválida;
uma chapa fina não é render vazio. A regressão pura primeiro reproduziu a
falha de `0,48 × 0,064` e depois passou junto de nove testes focados, cobrindo
vista normal, objeto pequeno, corte, projeção quase degenerada, vazia e não
finita.

`npm run revisar:modelagem -- homologacao-placa --revisao=r001` foi repetido
oficialmente, com a mesma assinatura de modelo da tentativa histórica, e
promoveu `revisoes/r001/revisao.json` mais quatro PNGs. As quatro vistas têm
`cortado: false` e `valida: true`: isométrica `48,0% × 43,3%`, frontal
`48,0% × 6,4%`, direita `48,0% × 8,5%` e superior `46,5% × 62,0%`.

Leitura humana das imagens promovidas:

- **isométrica:** passagem central, seis furos circulares e fileira linear de
  três permanecem legíveis, sem alterar a geometria original;
- **frontal:** vista válida da espessura, mas não torna passagem ou furos
  visíveis;
- **direita:** vista válida da espessura, mas também não torna os furos
  visíveis;
- **superior:** passagem central, seis furos regularmente distribuídos e os
  três lineares são distinguíveis.

Assim, a cláusula do briefing que pede os furos distinguíveis nas **quatro**
vistas é divergente/inadequada para uma chapa de 18 mm. O gate de enquadramento
não mede visibilidade funcional de cada furo em toda projeção e não deve forçar
uma câmera ou geometria artificial para isso. Permanecem pendentes, fora deste
recorte: grupo linear nomeado como endereço único, abertura oblonga e a
deduplicação da tentativa histórica.

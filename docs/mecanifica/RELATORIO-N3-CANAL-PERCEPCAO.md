# Relatório N3 — canal de percepção

**Decisão atual:** N3 está revalidada para C1. A aprovação anterior foi
revogada porque usou mosaico e cor plana por triângulo, que faziam
triangulação, costura e borda parecerem defeitos de superfície. N3.5 foi
executada e rejeitada: não produziu melhoria visual/material suficiente.

N3 está corrigindo um canal nativo, determinístico e independente do núcleo
procedural: zebra, isófota e mapa de curvatura por variação de normal entre
faces adjacentes. Ele existe para tornar a continuidade de superfície visível e
medível; não reconhece carro, não julga proporção e não fecha G02.

**Regra vinculante da reabertura:** toda imagem obrigatória é aberta
separadamente, em tamanho nativo; zebra tem isométrica, lateral, frontal e
superior, e isófota/curvatura têm vista isométrica. Painel ou métrica podem
indexar e resumir, mas nunca aprovam. A saída nova rasteriza normal interpolada
por pixel, com z-buffer e sem wireframe; o resultado serializado mantém o gate
em `passa: false` até inspeção individual registrada e vinculada ao manifesto
das imagens por SHA-256.

Foram usadas **duas das quatro rodadas permitidas** para a métrica: a primeira
marcou o toro sintético como falso negativo por 0,068° acima do corte inicial
de 18°; a segunda fixou o corte em 19°. Essas rodadas não equivalem a aceite
visual; o aceite anterior foi revogado. A revalidação abriu os 42 arquivos
obrigatórios individualmente e registrou o novo aceite em
[`inspecao-individual.json`](../../autoria-assistida/experimentos/canal-percepcao-n3/evidencias/inspecao-individual.json).

## Corpus e gate

O corpus gerado em
[`autoria-assistida/experimentos/canal-percepcao-n3/`](../../autoria-assistida/experimentos/canal-percepcao-n3/)
tem três controles sadios por construção e quatro negativos. As evidências
antigas em painel são obsoletas e não podem ser usadas como aceite.

| Caso | Veredito C1 | Evidência de descontinuidade |
|---|---|---|
| esfera sintética | regular | p95 9,823°, 0% abrupta |
| toro sintético | regular | p95 18,068°, 0% abrupta |
| patch justo | regular | p95 2,294°, 0% abrupta |
| quebra sintética | irregular | máximo 84,288°, 3,226% abrupta |
| quarto dianteiro | irregular | p95 22,027°, 4,211% abrupta |
| R2B | irregular | p95 76,343°, 20,216% abrupta |
| Cupê livre, pele primária | irregular | p95 65,769°, 18,079% abrupta |

O cupê livre é recompilado da receita isolada pelo mesmo loft de carroceria usado
na tentativa, com o mesmo recorte de arcos de roda; cabine, rodas e detalhes
não entram porque não são a pele primária. O R2B e o quarto usam suas malhas
históricas. As evidências individuais e o resultado serializado estão
em [`evidencias/`](../../autoria-assistida/experimentos/canal-percepcao-n3/evidencias/).
O `resultado-c1.json` só passa se a impressão do manifesto ainda corresponder
ao aceite; uma imagem nova ou alterada invalida automaticamente esse vínculo.

A ordem humana disponível é binária — sadio por construção ou reprovado —, não
uma classificação estética entre os quatro reprovados. Portanto o gate verifica
essa separação; os números acima **não** fingem ordenar qualidade de carroceria
ou preferência humana.

## Procedência

`npm run procedencia:check -- <fonte.json>` foi entregue. O contrato N3 exige
origem `medido`, `derivado`, `resolvido` ou `declarado`, limita o último a um
quinto e veta `declarado` nos campos estruturais de veículo. Valor resolvido
precisa citar apenas fontes medidas/derivadas. O corpus válido está em
[`fonte-veiculo-valida.json`](../../autoria-assistida/experimentos/canal-percepcao-n3/fonte-veiculo-valida.json).

Esse é um gate de fonte normalizada N3; ele não reescreve schemas N1/N2 nem
finge que valores legados já ganharam procedência retroativamente.

## Verificação executada

```text
npx vitest run tools/mecanifica/percepcao-superficie.test.mjs \
  tools/mecanifica/procedencia-check.test.mjs \
  autoria-assistida/experimentos/canal-percepcao-n3/canal-percepcao-n3.test.mjs
# 3 arquivos, 6 testes: verdes
npm run percepcao:n3:evidencias
# métricas e aceite individual vinculado ao manifesto: passam
npm run procedencia:check -- autoria-assistida/experimentos/canal-percepcao-n3/fonte-veiculo-valida.json
# passa
```

## N3.5 — sonda de suavização

A sonda isolada em
[`sonda-suavizacao-n3-5/`](../../autoria-assistida/experimentos/sonda-suavizacao-n3-5/)
aplicou seis iterações fixas de Laplaciano somente através de arestas C1 abaixo
de 25°; bordas e quinas ficaram congeladas, a fonte permaneceu imutável e a
topologia foi preservada. As doze imagens antes/depois foram abertas
individualmente.

**Decisão: rejeitar.** O P95 global caiu de 22,027° para 21,321°, mas a região
livre caiu só 0,57% e a parcela abrupta piorou de 4,211% para 4,391%. As quatro
zebras, isófotas e curvaturas não mostram melhora visível. A malha resultante
é descartada e não entra em N4/N6.

Esse resultado reprova somente a hipótese de reparo pós-modelagem por
suavização. Não executou um solver de restrições (C2), nem uma busca (C3), e
portanto não os reprova nem os deixa sob suspeita. N4 passa a ser a próxima
prova permitida de C2, com seção limpa e três restrições declaradas; N5 continua
bloqueada até N4 expor liberdade residual e objetivo mensurável. N6 permanece
bloqueada.

## Limite da bateria geral

`npm test` completo foi tentado, mas não ficou verde por passivos que N3 não
altera: há uma árvore local residual `prototipos/fps/v3` fora do Git, que viola
o guarda de migração, e testes antigos de aceite visual/modelagem param por
evidência `repo://modelador-alvo.svg` ausente. Os testes específicos N3, build,
typecheck, porteiro, guards da bancada, documentação, exportação, catálogo e
schemas passaram. Os ensaios MCP ultrapassaram a janela de 30 s do executor e
foram encerrados junto com seus servidores de teste, sem alteração de MCP.

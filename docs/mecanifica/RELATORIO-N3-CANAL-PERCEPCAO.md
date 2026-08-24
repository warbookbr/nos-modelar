# Relatório N3 — canal de percepção

**Decisão:** aprovar C1 e encerrar N3. **Não abre N3.5 automaticamente.**

N3 entregou um canal nativo, determinístico e independente do núcleo
procedural: zebra, isófota e mapa de curvatura por variação de normal entre
faces adjacentes. Ele existe para tornar a continuidade de superfície visível e
medível; não reconhece carro, não julga proporção e não fecha G02.

Foram usadas **duas das quatro rodadas permitidas**: a primeira marcou o toro
sintético como falso negativo por 0,068° acima do corte inicial de 18°; a
segunda fixou o corte em 19° e manteve todos os quatro negativos irregulares.

## Corpus e gate

O corpus gerado em
[`autoria-assistida/experimentos/canal-percepcao-n3/`](../../autoria-assistida/experimentos/canal-percepcao-n3/)
tem três controles sadios por construção e quatro negativos. O [painel zebra
rasterizado](../../autoria-assistida/experimentos/canal-percepcao-n3/evidencias/painel-zebra.png)
foi inspecionado visualmente antes deste encerramento.

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
históricas. As evidências individuais, o painel e o resultado serializado estão
em [`evidencias/`](../../autoria-assistida/experimentos/canal-percepcao-n3/evidencias/).

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
# gate C1: passa
npm run procedencia:check -- autoria-assistida/experimentos/canal-percepcao-n3/fonte-veiculo-valida.json
# passa
```

N3.5 continua sendo a próxima sonda autorizável: aplicar somente energia de
suavidade ao quarto reprovado e verificar se a melhoria C1 também melhora a
leitura humana. N4 e N6 continuam bloqueados.

## Limite da bateria geral

`npm test` completo foi tentado, mas não ficou verde por passivos que N3 não
altera: há uma árvore local residual `prototipos/fps/v3` fora do Git, que viola
o guarda de migração, e testes antigos de aceite visual/modelagem param por
evidência `repo://modelador-alvo.svg` ausente. Os testes específicos N3, build,
typecheck, porteiro, guards da bancada, documentação, exportação, catálogo e
schemas passaram. Os ensaios MCP ultrapassaram a janela de 30 s do executor e
foram encerrados junto com seus servidores de teste, sem alteração de MCP.

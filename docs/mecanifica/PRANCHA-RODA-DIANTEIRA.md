# Prancha de referência — roda dianteira

Referência multivista de `prototipos/procedural/v3/pecas/roda-dianteira.js`. A roda é
um ativo de autoria separado do `freio-disco`: ela fornece o pneu, o aro e a
tampa central; o cubo continua tendo uma única fonte de verdade no freio.

## Convenção e composição

Usa a mesma convenção da prancha do freio:

| eixo | significado |
|---|---|
| X | eixo da roda; `+X` é a face externa, do lado do cliente |
| Y, Z | plano radial; `[0, 0, 0]` é o centro do cubo |

A peça nasce em tamanho de componente (pneu de raio 0,340 m). Na pose manual
congelada, a roda usa escala 1,60 e o freio usa 2,45: a cavidade do aro mede
0,128 m, o piloto mede 0,12495 m e a folga radial declarada é 0,00305 m. A
relação está em `prototipos/procedural/v3/montagens/roda-no-freio.js`, não é uma
coincidência de `Object3D`: `npm run descrever:montagem -- roda-no-freio` a
valida sem mover nenhuma peça.

Não acrescente `cubo`, prisioneiros ou manga de eixo a esta peça. Cada um é uma
identidade física distinta e deverá ser autorado no seu próprio ativo quando o
sistema correspondente for criado.

## Revisão na bancada

Medida e imagem são complementares: a primeira decide dimensão e identidade; a
segunda decide proporção e acabamento.

```bash
npm run descrever -- roda-dianteira
npm run descrever:montagem -- roda-no-freio
npm run bancada -- roda-dianteira --vistas=direita,frontal,superior --projecao=ortografica --estrito
npm run bancada -- roda-dianteira --selecionadas=aro,tampaCentral --modo=contexto --focar
```

| vista | o que revisar |
|---|---|
| direita (ao longo de X) | pneu circular, aro concêntrico e tampa central na face externa |
| frontal (ao longo de Z) | perfil do pneu e do aro, sem inversão de eixo |
| superior (ao longo de Y) | a mesma largura axial da vista frontal |

## Partes semânticas

| parte | faces | caixa esperada (x, y, z) | papel |
|---|---:|---|---|
| `pneu` | 520 | `±0,110 · ±0,340 · ±0,340` | contato com o solo e volume externo |
| `aro` | 192 | `±0,095 · ±0,245 · ±0,245` | estrutura metálica que recebe o pneu e deixa o centro para o cubo |
| `tampaCentral` | 22 | `0,095…0,115 · ±0,078 · ±0,078` | acabamento da face externa |

São 734 faces, 824 vértices, 0 faces sem identidade e 0 órfãos, conforme
`npm run descrever -- roda-dianteira`. `pneuInteiro`, `aroInteiro` e
`tampaCentralInteira` são aliases de seleção; `aroAbertura` nomeia a face
interna estável para regras visuais. A porta `cavidadeDoCubo` declara, além da
origem dessa face, uma interface cilíndrica interna: eixo X, vetor de referência
Y, raio interno e intervalo axial. Ela é o par dirigido de `pilotoDaRoda` no
freio. O eixo e a referência formam o quadro explícito que a prévia de montagem
pode alinhar; a relação declara centro↔centro e giro zero, preservando esta pose
revisada como baseline.

## Limite conhecido da régua

O relatório por partes ainda mede `aro↔pneu` por envelopes e, corretamente,
mantém `interpenetra` como alerta amplo. A montagem
`npm run descrever:montagem -- aro-no-pneu` acrescenta a outra leitura: as
portas `assentoDoAroNoPneu` e `assentoDoPneuNoAro` declaram uma faixa anular e
medem sua sobreposição radial/axial. Uma leitura não apaga a outra.

Isto não é detector universal de cavidade, deformação de borracha, pressão ou
contato de sólidos. A faixa existe porque o autor a declarou; outra natureza
de contato precisa de porta e métrica próprias.

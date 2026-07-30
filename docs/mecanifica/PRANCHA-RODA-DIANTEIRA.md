# Prancha de referência — roda dianteira

Referência multivista de `prototipos/fps/v3/pecas/roda-dianteira.js`. A roda é
um ativo de autoria separado do `freio-disco`: ela fornece o pneu, o aro e a
tampa central; o cubo continua tendo uma única fonte de verdade no freio.

## Convenção e composição

Usa a mesma convenção da prancha do freio:

| eixo | significado |
|---|---|
| X | eixo da roda; `+X` é a face externa, do lado do cliente |
| Y, Z | plano radial; `[0, 0, 0]` é o centro do cubo |

A peça nasce em tamanho de componente (pneu de raio 0,340 m). Na cena, a roda
usa escala 1,60 e o freio usa 2,45: isso faz a abertura interna do aro medir
0,128 m e o cubo do freio medir 0,127 m de raio. É uma relação de montagem
declarada nos registros de domínio, não uma coincidência de `Object3D`.

Não acrescente `cubo`, prisioneiros ou manga de eixo a esta peça. Cada um é uma
identidade física distinta e deverá ser autorado no seu próprio ativo quando o
sistema correspondente for criado.

## Revisão na bancada

Medida e imagem são complementares: a primeira decide dimensão e identidade; a
segunda decide proporção e acabamento.

```bash
npm run descrever -- roda-dianteira
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
| `pneu` | 280 | `±0,110 · ±0,340 · ±0,340` | contato com o solo e volume externo |
| `aro` | 192 | `±0,095 · ±0,245 · ±0,245` | estrutura metálica que recebe o pneu e deixa o centro para o cubo |
| `tampaCentral` | 22 | `0,095…0,115 · ±0,078 · ±0,078` | acabamento da face externa |

São 494 faces e nenhuma face sem identidade. `pneuInteiro`, `aroInteiro` e
`tampaCentralInteira` são aliases de seleção; `aroAbertura` nomeia a face
interna estável para futuras regras visuais.

## Limite conhecido da régua

O relatório atual mede relações corpo a corpo por envelopes. Assim, ele chama
`aro↔pneu` de interpenetração mesmo quando o aro está corretamente assentado
dentro da cavidade do pneu. Isso é aceitável para esta primeira composição,
mas não deve virar uma exceção silenciosa: está registrado como A-16 em
[`ATRITOS-AUTORIA.md`](ATRITOS-AUTORIA.md). Uma futura porta de volume/assento
semântico permitirá declarar o encaixe sem ensinar a ferramenta a ignorar
interpenetrações reais.

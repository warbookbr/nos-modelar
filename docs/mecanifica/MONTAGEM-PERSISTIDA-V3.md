# Montagem persistida v3 e impacto local

A v3 acrescenta uma relação espacial genérica e um mapa derivado de impacto
local ao contrato v2. Disco–pinça é apenas uma fixture de aceitação: o núcleo
não conhece freio, veículo ou outro domínio de aplicação.

## Separação direcional

O documento preserva `formato: mecanifica.montagem`, usa `versao: 3` e aceita
as relações v2 mais `mantemSeparacaoDirecional`:

```json
{
  "id": "regiaoARegiaoB",
  "tipo": "mantemSeparacaoDirecional",
  "referencia": { "caminho": ["corpo"], "parte": "superficieA" },
  "movel": { "caminho": ["tampa"], "parte": "superficieB" },
  "especificacao": {
    "eixo": [0, 1, 0],
    "separacaoMinima": 0.002,
    "toleranciaNumerica": 0.000001
  }
}
```

`caminho` é relativo à montagem declarante e termina em peça. `parte` é
facultativa e usa a identidade semântica das faces; sem ela, a região é a peça
inteira. Índice de face, UUID e identidade de runtime são inválidos.

O eixo finito e não nulo é local à montagem declarante. O resolvedor o
normaliza, compõe à pose mundo da montagem e projeta os vértices das regiões. A
medida é `min(movel) - max(referencia)` ao longo desse eixo. A relação satisfaz
quando `medida + toleranciaNumerica >= separacaoMinima`.

Valor negativo significa sobreposição **direcional das projeções**. Não prova
colisão volumétrica, distância euclidiana, contato ou espaço livre em outras
direções. Região vazia, parte ausente, caminho que não termina em peça e eixo
zero falham fechado com diagnóstico.

V1 e v2 permanecem legíveis com suas semânticas fechadas. Somente v3 aceita a
relação nova.

## Mapa de impacto local

`src/autoria/derivar-impacto-montagem.js` exporta o serviço puro:

```js
derivarImpactoMontagem(montagemResolvida, {
  caminho: ['subconjunto', 'componente'],
})
```

A saída serializável usa `formato: mecanifica.impacto-montagem`, `versao: 1` e
separa:

- `relacoesDiretas`: possuem endpoint no alvo ou em sua subárvore;
- `relacoesIndiretas`: fecho posterior por endpoints compartilhados;
- `instanciasRelacionadas`: caminho e origem `direta` ou `indireta`;
- `montagensARevalidar`: declarantes e ancestrais semânticos;
- `limitacoes`: dependências que a árvore local não permite afirmar.

O mapa não executa revalidação, não infere contato por proximidade e não procura
usos fora da raiz recebida. Relações diretas e indiretas não devem ser fundidas:
essa distinção informa à IA por que cada contexto foi incluído.

## Evidência

A fixture neutra prova separações `+0,020 m`, zero e `−0,005 m`, região por
parte, eixo não unitário e montagem filha rotacionada. No conjunto experimental,
R001 satisfaz 5 de 5 relações e R002 reprova somente a separação direcional. O
mapa do disco encontra 2 relações diretas e 3 indiretas.

Ficam fora deste contrato colisão geral/BVH, distância mínima entre triângulos,
catálogo global de usos, revalidação automática, solver, escrita, renderização
de montagem e publicação por MCP.

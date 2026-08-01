# Filete v2 — desenho antes de implementação

## Decisão

O `filete` atual não deve receber um parâmetro de painéis como remendo local.
Com um painel ele produz um **chanfro** e é semanticamente correto chamá-lo
assim. Para produzir um raio real, a operação precisa construir uma faixa de
arco e resolver os dois cantos dessa faixa. Isso altera a topologia de mais de
duas faces e, em `chamferBox`, atinge faces de canto já existentes.

O protótipo atual prova o bloqueio: qualquer aresta nominal de `chamferBox`
chega a cada ponta com duas faces além das duas faces da aresta. O v1 exige
uma só e falha fechado. Não é uma validação excessiva: soltar essa regra sem
uma malha de canto criaria frestas, junções em T ou polígonos autoencostados.

## Contrato proposto

Não reaproveitar `filete` para dois significados diferentes. A migração segura
é:

1. manter `filete` v1 com um painel e documentá-lo como chanfro compatível;
2. introduzir `arredondarAresta` v2, sempre estrutural, com:

```js
['arredondarAresta', {
  origemId: 42,
  de: { op: 'chamferBox', id: 7, face: 'frente' },
  aresta: 1,
  raio: 'raioDaFundicao',
  paineis: 'paineisDoRaio',
}]
```

- `de` e `aresta` conservam a escolha semântica da aresta.
- `raio` é PARAM e deve caber nas duas faces e em cada canto.
- `paineis` é TOPO inteiro, mínimo 2; um painel continua pertencendo a
  `filete`/chanfro e não entra no novo contrato.
- a origem nova publica `painel: 0..paineis-1`; cada painel tem identidade
  estável e citações inválidas falham antes de alterar a malha.
- as faces antigas permanecem vivas quando isso for topologicamente possível;
  faces de canto que precisarem ser particionadas preservam o mesmo id na
  região original e recebem subfaces derivadas pela origem nova.

## Algoritmo em dois escopos

### Escopo A — aresta simples

Pré-condições: malha fechada, aresta compartilhada por duas faces, uma face de
continuidade em cada ponta e essas quatro faces formando um anel simples.

1. calcular os planos das duas faces e o centro do arco tangente de raio `r`;
2. obter `paineis + 1` pontos determinísticos do arco em cada ponta;
3. particionar face A, face B e as duas faces de continuidade sem mudar seus
   ids principais;
4. ligar pares de amostras em `paineis` quads; cada quad é `painel:k`;
5. conferir manifold, polígonos simples, orientação, limite de raio e replay.

O raio máximo não é a distância ao centroide: ele é limitado pelo primeiro
encontro das linhas de recuo com as bordas vizinhas de cada face. Isso permite
gritar antes de escrever metade da geometria.

### Escopo B — canto composto / `chamferBox`

Em cada ponta, coletar o leque ordenado de faces. Em vez de exigir uma terceira
face, construir a interseção das faixas de arredondamento dentro do leque e
triangular a região restante. Esse é um operador de canto, não uma exceção ao
`if` atual. Ele precisa declarar quais subfaces pertencem à origem do
arredondamento e provar que nenhum canto foi engolido.

O primeiro alvo de produto é uma cópia pequena de `chamferBox`, não a pinça. Só
depois de o caso composto ficar determinístico a pinça e o suporte podem mudar.

## Testes de aceitação pendentes

O executável `node tools/oficina/filete-v2-aceitacao.mjs` falha hoje de
propósito e enumera os dois bloqueios que a implementação deve remover. Ele só
deve ficar verde junto com:

- teste topológico: uma aresta de cubo vira dois ou mais painéis e cada
  transição mede `ângulo/(paineis+1)`;
- teste de raio: `r` excessivo aborta sem criar V/F; `r` válido mede o arco;
- teste de identidade: cada `painel:k` resolve e painéis antigos não trocam de
  identidade;
- teste de determinismo: mesmo PASSOS dá neutro byte-idêntico;
- teste composto: uma aresta de `chamferBox` deixa de gritar e permanece
  manifold, sem face autoencostada;
- prova não automotiva antes da prova no freio;
- custo medido: V/F antes/depois e limite explícito por número de painéis.

Até esses testes existirem, a pinça e o suporte do freio não devem tentar usar
o v1: a recusa atual é a proteção correta.

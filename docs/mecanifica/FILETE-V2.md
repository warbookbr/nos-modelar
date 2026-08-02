# Filete v2 — Escopos A e B implementados

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
- as faces antigas permanecem vivas; no canto composto, a face triangular já
  existente preserva o próprio id e recebe os vértices intermediários do arco.

## Algoritmo em dois escopos

### Escopo A — aresta simples — IMPLEMENTADO

Pré-condições: malha fechada, aresta compartilhada por duas faces, uma face de
continuidade em cada ponta e essas quatro faces formando um anel simples.

1. calcular os planos das duas faces e o centro do arco tangente de raio `r`;
2. obter `paineis + 1` pontos determinísticos do arco em cada ponta;
3. particionar face A, face B e as duas faces de continuidade sem mudar seus
   ids principais;
4. ligar pares de amostras em `paineis` quads; cada quad é `painel:k`;
5. conferir manifold, polígonos simples, orientação, limite de raio e replay.

Implementação entregue em `motor/oficina.js` como `arredondarAresta`, sem mudar
o significado nem o formato salvo de `filete`. O custo é fechado para `n`
painéis: `+2n` vértices e `+n` faces. A prova
`tools/oficina/arredondar-aresta.test.ts` mede um arco de raio declarado, seus
painéis `painel:0..n-1`, replay canônico, abortamento atômico e a passagem pelo
adaptador Three com casca fechada. O caso de cubo com dois painéis sai de
8V/6F para 12V/8F.

O raio máximo não é a distância ao centroide: ele é limitado pelo primeiro
encontro das linhas de recuo com as bordas vizinhas de cada face. Isso permite
gritar antes de escrever metade da geometria.

### Escopo B — canto composto / `chamferBox` — IMPLEMENTADO

Em cada ponta, a operação coleta o leque ordenado de faces. O caso composto
aceito tem duas faces além das duas da aresta: a tira vizinha e o triângulo de
canto. Em vez de criar uma subface, preserva o id do triângulo e substitui o
vértice comum pela sequência inteira do arco; assim, cada painel compartilha
uma aresta com a faixa e o canto continua costurado às duas faces vizinhas.

O caminho de ponta simples continua literal. A varredura de todas as 24 arestas
das seis faces nominais de `chamferBox` prova casca fechada e painéis citáveis.
O alvo de produto continua deliberadamente fora: `_bloco-arredondado-composto`
é a prova geral, e pinça/suporte só mudam quando houver necessidade de produto.

## Aceite do Escopo B

`node tools/oficina/filete-v2-aceitacao.mjs` passa com uma aresta de
`chamferBox` em 28 V/28 F e sem órfãos. O teste de núcleo cobre as 24 arestas,
manifold, polígono simples, painéis, replay e recusa atômica; a fixture neutra
confere a leitura visual. A pinça e o suporte do freio não foram alterados: o
resultado fecha a capacidade geral sem ampliar esta rodada para produto.

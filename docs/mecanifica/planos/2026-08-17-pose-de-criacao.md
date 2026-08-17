# Pose de criação — `em` e `eixo` nos geradores

**Estado:** concluído

**Responsável:** execução assistida por IA

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`implementacao/pose-de-criacao` sobre `main`.

## Problema observado

Atrito **A-4** de [`../ATRITOS-AUTORIA.md`](../ATRITOS-AUTORIA.md): "primitivas
ainda nascem presas à origem". A otimização **O-7** já havia medido a
consequência no freio: *"16 dos 52 passos do freio não descrevem o freio,
descrevem transporte"*.

Medição refeita hoje, no acervo inteiro:

| medida | valor |
|---|---|
| passos totais | 853 |
| passos de transporte (`transladar` + `rotaciona`) | **128 (15%)** |
| pior caso (`freio-disco`, `drone-inspecao`, `_freio-hierarquia`) | **29%** |
| transporte por gerador criado | **0,84** |
| `rotaciona` imediatamente após o gerador da mesma origem | 23 de 33 (70%) |

Quase um passo de encanamento por primitiva. E o custo não é só de tamanho: a
posição ficava longe da forma, `origemId` virava obrigatório só para poder
selecionar a primitiva de volta, e esquecer o passo de transporte deixava o
corpo empilhado na origem sem erro nenhum. Peças chegaram a escrever helpers
locais como `girarParaEixoX` em `_mancal-de-mesa.js` para disfarçar a repetição.

## Resultado

Os geradores aceitam `em` (posição) e `eixo` (direção do eixo de revolução) no
próprio passo. O trio vira um passo:

```js
['cilindro', {…}]                                          ['cilindro', {…,
['rotaciona', {eixo:'z', graus:-90, pivo:[0,0,0], sel}]  ≡     eixo: 'x',
['transladar', {d:[dx,dy,dz], sel}]                            em: [dx,dy,dz]}]
```

## Decisão de projeto

**Lido no despacho, não em cada gerador.** Oito geradores implementando a mesma
translação seriam oito chances de divergir de sinal ou de ordem. O laço de
`PASSOS` aplica a mesma transformação rígida aos vértices que o passo acabou de
criar, seja qual for o gerador — e por isso `em` funciona igual em `cubo`,
`lathe` e `chamferBox` sem nenhum código por op.

**A ordem é gira-depois-move, com giro na origem**, porque é exatamente o que a
receita escrevia à mão, e a convenção de `eixo:'x'` (−90° em torno de Z) é a
mesma dos helpers locais. Reusa `giraPonto`, a função que já serve `rotaciona` e
`arranja`, para que os dois caminhos não possam divergir de sinal.

**`eixo` só nos gerados por revolução.** `cubo`, `plano`, `esfera` e
`chamferBox` não têm eixo; aceitar a palavra neles prometeria orientação que a
forma não tem. E `eixo` continua sendo o eixo do GIRO em `rotaciona` e
`arranja` — a pose não sequestrou o nome, o que teria mudado todo arranjo radial
do acervo em silêncio.

**Isto não é `alinhar` (O-8).** Não encosta, não mede vizinho, não resolve pivô
por seleção. O próprio O-7 se descreve como "o atalho barato" e coloca O-8
depois; esta ordem foi respeitada.

## Filtro Agent-First

| Interface | Decisão | Razão |
|---|---|---|
| geradores existentes | **USAR DIRETO** | a pose não entra no corpo de nenhum gerador; a geometria continua nascendo como antes |
| `giraPonto` | **USAR DIRETO** | única definição de sinal de rotação, já compartilhada por `rotaciona` e `arranja` |
| despacho de `PASSOS` | **ENVOLVER** | o único ponto onde a pose cabe uma vez só para todos os geradores |
| `transladar` / `rotaciona` | **USAR DIRETO** | continuam necessários quando o pivô não é a origem ou o alvo já existe |
| `alinhar`/`encostar` relacionais (A-6, O-8) | **ADIAR** | capacidade maior, com determinismo de desempate por resolver |

## Incluído

- `em: [x,y,z]` em `cubo`, `cilindro`, `esfera`, `cone`, `plano`, `chamferBox`
  e `lathe`;
- `eixo: 'x'|'y'|'z'` em `cilindro`, `cone` e `lathe`;
- recusas: `em` fora de gerador, `eixo` em gerador sem revolução, eixo
  desconhecido e `em` com aridade errada;
- `tools/mecanifica/pose-de-criacao.test.ts` com 14 provas;
- `em`/`eixo` documentados na skill `criar-peca`.

## Excluído

- `alinhar`, `encostar` e qualquer seletor relacional;
- pivô configurável na pose (use `rotaciona`);
- orientação por vetor livre ou por ângulo arbitrário;
- migrar peças existentes para a forma curta.

## Gate de saída

1. **comportamento mensurável** — a pose produz malha idêntica, vértice por
   vértice, à escrita longa, nos sete geradores e nos dois eixos;
2. **compatibilidade e determinismo** — nenhuma peça usa a pose ainda, e as 37
   permanecem byte-idênticas ao gabarito; `eixo` continua significando eixo de
   giro em `rotaciona` e `arranja`;
3. **prova visual** — dispensada: a afirmação central é uma igualdade de malha
   contra o caminho já provado, mais forte que uma foto;
4. **testes e documentação** — 14 provas, contrato documentado no núcleo e na
   skill de criar peça;
5. **decisão Agent-First registrada** — tabela acima.

## Fechamento

Gates completos de [`../INDEX.md`](../INDEX.md) verdes. A pose não foi aplicada
a nenhuma peça existente de propósito: o valor está em quem escrever a próxima,
e migrar peça de exemplo mudaria malha sem melhorar capacidade nenhuma.

**Decisão: aprovar.** A-4 sai da lista de atritos abertos. A-6 (`encostar`),
A-7, A-8, A-16 e A-29 continuam abertos, sem abertura automática.

# Montagem persistida

Contrato executável para compor instâncias semanticamente identificadas de
peças e montagens, sem copiar autoria geométrica para o arquivo persistido. A
versão vigente é a v4. Cada versão preserva a composição, as poses e as
relações da anterior e acrescenta uma coisa: a v2 as relações mecânicas locais
entre instâncias, a v3 a separação direcional e o mapa de impacto local, e a v4
a política de auditoria de interseções. Montagens v1, v2 e v3 continuam legíveis
e resolvíveis com seus significados anteriores, e montagens de versões
diferentes podem coexistir recursivamente. Só a v3 em diante aceita a relação
`mantemSeparacaoDirecional`, e só a v4 exige `auditoriaIntersecoes`.

## Exemplo mínimo

```json
{
  "formato": "mecanifica.montagem",
  "versao": 1,
  "id": "conjunto",
  "instancias": [
    {
      "id": "freio",
      "alvo": { "tipo": "peca", "ref": "freio-disco" },
      "pose": {
        "rotacao": [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        "deslocamento": [0, 0, 0]
      }
    }
  ]
}
```

`id` da montagem e de cada instância é texto não vazio; IDs de instância são
únicos dentro da montagem. `alvo.tipo` é `peca` ou `montagem`, e `alvo.ref` é
texto não vazio persistível. `instancias` é ordenada por ID na forma canônica.

`pose` é opcional e, quando omitida, vale identidade. Sua forma persistida é
somente uma rotação rígida 3x3 própria e um deslocamento finito. Escala não
pertence à persistência v1.

## Resultado resolvido

O resolvedor devolve instâncias na ordem canônica, cada uma com `id`,
`caminho` como array de IDs, `alvo`, `poseLocal` e `poseMundo`. Instâncias de
peça também têm `definicao: { ref, neutro }`; instâncias de montagem têm
`montagem: { id, instancias }` resolvida recursivamente. Montagens reutilizadas
geram ocorrências independentes; dentro de uma resolução, definições da mesma
`ref` são cacheadas e compartilhadas.

`carregarPeca(ref)` fornece o artefato bruto da peça publicada e
`carregarMontagem(ref)` fornece o JSON persistido da montagem. Os carregadores
são injetados no resolvedor e não conhecem o contrato de produção.

Falhas são fail-closed: não há árvore válida parcial. Códigos principais
incluem `formato-desconhecido`, `versao-nao-suportada`, `estrutura-invalida`,
`pose-invalida`, `carregador-invalido`, `referencia-ausente`, `peca-invalida`,
`montagem-invalida` e `ciclo`.

## Relações locais (v2)

### Forma persistida

O documento usa `formato: mecanifica.montagem`, `versao: 2`, `id`, `instancias`
e `relacoes`. `instancias` preserva a forma da v1. Cada relação tem `id` único,
`tipo`, `referencia`, `movel` e `especificacao`. Cada endpoint é
`{ caminho: [ids de instância], porta: id-da-porta }`, relativo à montagem que
declara a relação, e termina em uma instância de peça.

Os tipos suportados são:

- `encaixaCilindrico`: `folgaRadial { nominal, toleranciaFabricacao { menos, mais } }` e `toleranciaNumerica`;
- `assentaAnular`: `sobreposicaoRadial`, `sobreposicaoAxial` e `toleranciaNumerica`, usando a mesma forma de faixa.

Todos os números devem ser finitos e não negativos; a faixa nominal menos a
tolerância inferior não pode ser negativa.

### Forma resolvida

Cada relação resolvida mantém `id`, `tipo`, endpoints semânticos (`referencia`
e `movel`), `especificacao`, `satisfeita`, `medidas` e `diagnosticos`.
Endpoints resolvidos apontam para as instâncias da árvore por identidade. A
relação pode ser mecanicamente reprovada com `satisfeita: false`, medidas e
diagnósticos.

Erro estrutural — versão, tipo, ID, caminho, endpoint, porta ou especificação
inválidos — falha fechado com exceção e diagnóstico; não produz árvore parcial.
Reprovação mecânica é resultado válido e não interrompe as demais relações.

A resolução é determinística, não muta as entradas e não copia geometria ou
autoria para a montagem.

## Separação direcional (v3)

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

## Mapa de impacto local (v3)

`src/autoria/derivar-impacto-montagem.js` exporta o serviço puro:

```js
derivarImpactoMontagem(montagemResolvida, {
  caminho: ['subconjunto', 'componente'],
})
```

Quando uma definição é reutilizada, a mesma API oferece um alvo semântico
independente de caminho:

```js
derivarImpactoDefinicaoMontagem(montagemResolvida, {
  tipo: 'peca', // ou 'montagem'
  ref: 'parafuso',
})
```

Essa consulta localiza todos os consumidores da definição dentro da raiz. A
saída conserva `alvo: { tipo, ref }` e acrescenta `consumidoresDefinicao` (os
caminhos que referenciam diretamente a definição) e `caminhosIniciais` (esses
consumidores e suas subárvores, quando houver). Relações tocadas por qualquer
consumidor entram no fecho direto/indireto e todos os declarantes/ancestrais
necessários aparecem em `montagensARevalidar`. Se a definição não for usada na
raiz, a operação falha com `definicao-nao-usada` e uma ação explícita, em vez de
retornar um impacto vazio que poderia ser confundido com cobertura global.

Como o serviço continua limitado à árvore resolvida recebida, a limitação
`uso-global-fora-da-raiz-nao-verificado` permanece presente. Um catálogo global
ou outra raiz deve ser consultado separadamente para descobrir usos externos.
Pela porta MCP, `planejar_revalidacao_montagem` aceita o alvo antigo como lista
de caminhos ou `{ tipo, ref }` para uma definição compartilhada e devolve os
mesmos consumidores e caminhos iniciais no roteiro.

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

## Expectativas de interseção (v4)

### Formato

Além dos campos da v3, a raiz v4 exige:

```json
{
  "auditoriaIntersecoes": {
    "toleranciaNumerica": 0.000001,
    "expectativas": [
      {
        "id": "interferencia-do-encaixe",
        "a": { "caminho": ["pino"] },
        "b": { "caminho": ["luva"] },
        "motivo": "interferencia de montagem declarada"
      }
    ]
  }
}
```

Cada lado termina em uma peça e usa caminho semântico relativo à montagem
declarante. IDs de expectativa são únicos. O leitor ordena expectativas por ID,
recusa caminhos iguais, duplicidades, tolerância negativa e motivo vazio.

Uma expectativa somente explica a intenção registrada. O par continua sendo
auditado e continua aparecendo como `interpenetram`, `encostam`, `separadas` ou
`inconclusivo`. Nenhuma relação existente cria expectativa automaticamente.

### Auditoria

`src/autoria/auditar-intersecoes-montagem.js` exporta:

```js
auditarIntersecoesMontagem(montagemResolvida, {
  caminho: ['submontagem', 'peca'],
  modoFoco: 'incidente',
  toleranciaNumerica: 0.000001,
})
```

O serviço expande submontagens até peças-folha. Sem `caminho`, testa todos os
pares da raiz. Com foco, `modoFoco: 'incidente'` (padrão retrocompatível)
testa cada folha do foco contra todas as folhas da raiz; `modoFoco: 'interno'`
restringe o escopo a pares em que os dois lados pertencem ao foco. Em ambos os
modos, `paresOmitidosPorFoco` informa os pares fora do escopo e a cobertura fica
incompleta quando há omissões. Caixas mundiais só eliminam pares seguramente
separados; a decisão restante usa a malha final e teste de contenção.

A saída usa `formato: mecanifica.auditoria-intersecoes`, `versao: 1` e informa
escopo, tolerância, pares ordenados, método, expectativas associadas e
cobertura. `inconclusivo` é obrigatório para malha inválida/aberta quando a
geometria exige concluir sobre um sólido. Timeout ou falta de cobertura não
vira ausência de interseção.

### Consumo pela IA

`descrever_montagem` continua sendo contexto estrutural barato e não executa a
auditoria por implicação. `revisar_montagem` executa a auditoria e transporta o
resultado em `auditoriaIntersecoes`. A revisão:

- reprova se encontrar `interpenetram`;
- fica incompleta se houver `inconclusivo`, foco parcial ou vista indisponível;
- só remove a limitação de colisão do contexto quando todos os pares da raiz
  foram decididos;
- nunca chama o resultado de homologação, aprovação ou validade completa.

## Evidência (v3)

A fixture neutra prova separações `+0,020 m`, zero e `−0,005 m`, região por
parte, eixo não unitário e montagem filha rotacionada. No conjunto experimental,
R001 satisfaz 5 de 5 relações e R002 reprova somente a separação direcional. O
mapa do disco encontra 2 relações diretas e 3 indiretas.

## Limites

Sem autoria geométrica copiada para a montagem, sem Three.js, solver,
reposicionamento, correção ou prévia de pose, cinemática, movimento, espaço
varrido nem folga universal. Ficam fora também colisão geral/BVH, distância
mínima entre triângulos, catálogo global de usos, revalidação automática, escrita
e renderização de montagem.

O contrato executável está em
[`src/autoria/ler-montagem-persistida.js`](../../../src/autoria/ler-montagem-persistida.js)
e [`src/autoria/resolver-montagem-persistida.js`](../../../src/autoria/resolver-montagem-persistida.js).

# Perfil fechado no `lathe` — e a limpeza da lista de pendências

**Estado:** concluído

**Responsável:** execução assistida por IA

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`implementacao/lathe-fechado` sobre `main`.

## Problema observado

Pendência "resolver costuras topológicas de `lathe`", registrada desde o
[relatório do diagnóstico](../RELATORIO-DIAGNOSTICO-MOTOR.md): *"perfis de
`lathe` podem produzir uma costura topológica não soldada quando a receita
simula fechamento"*.

O `lathe` tratava o perfil como polilinha **sempre aberta**, e dizia isso no
próprio comentário. Uma receita que escrevia o último ponto no mesmo lugar do
primeiro estava pedindo "a seção dá a volta e fecha" — é assim que se descreve
anel de vedação, pneu e qualquer toroide — e recebia um segundo anel de
vértices **coincidentes** com o primeiro: colados no espaço, separados na
topologia.

Visualmente fechava. O único lugar onde a costura aparecia era
`meta.fechada:false` em `_mancal-de-mesa`, sem que nada explicasse por quê a
quem lesse a receita.

## Resultado

O último ponto coincidente **reusa** os vértices do primeiro. A superfície fecha
de verdade, e o `lathe` passa a expressar toroide.

## Decisão de projeto

**A comparação é exata, nunca aproximada.** Um limiar faria dois pontos quase
iguais fecharem o laço em silêncio, mudando a topologia de uma peça cujo autor
não pediu isso. Quem quer fechar escreve a mesma coordenada — e ela vem do mesmo
PARAM, então escrever igual é o caminho natural.

**A afirmação é topológica, não visual.** Numa malha fechada, toda aresta é
compartilhada por exatamente duas faces. É isso que a costura quebrava, é isso
que as provas medem, e é exatamente o que uma foto não distinguiria.

## Filtro Agent-First

| Interface | Decisão | Razão |
|---|---|---|
| geração de anel/polo do `lathe` | **USAR DIRETO** | a solda não muda como um anel nasce; muda quantos nascem |
| contagem de faces por faixa | **USAR DIRETO** | a última faixa liga ao anel inicial sem forma nova |
| limiar de proximidade para fechar | **ADIAR** (recusado) | fecharia laço em silêncio numa peça que não pediu |
| `loft` fechado | **ADIAR** | mesmo padrão, contrato próprio, sem evidência de urgência |

## Incluído

- solda do último ponto coincidente no `lathe`;
- `tools/mecanifica/lathe-fechado.test.ts` com 8 provas;
- `_mancal-de-mesa` passa a declarar `meta.fechada: true`;
- gabarito e peça exportada regravados.

## Excluído

- fechar por limiar;
- `loft` fechado;
- solda entre passos diferentes;
- qualquer promessa de reparo geral de malha.

## Impacto medido nas peças de exemplo

| peça | vértices | faces |
|---|---|---|
| `_mancal-de-mesa` | 480 → 416 | 432 → 432 |
| `roda-dianteira` | 824 → 752 | 734 → 734 |
| `roda-dianteira-realista-experimento` | 2194 → 2062 | 2132 → 2132 |

**Faces idênticas nas três** — é a assinatura da solda: ela remove vértice
duplicado, não superfície. `roda-dianteira` é exportada, e o arquivo de
`pecas-resolvidas/` foi regravado; conforme o `README.md`, isso é dado de
integração e o consumidor externo não veta a mudança daqui.

## Gate de saída

1. **comportamento mensurável** — no perfil fechado, zero arestas com uso
   diferente de dois; no aberto, a borda continua existindo;
2. **compatibilidade** — perfil aberto comum não muda; ponto quase igual não
   fecha;
3. **determinismo** — duas execuções, mesma malha;
4. **testes e documentação** — 8 provas topológicas;
5. **decisão Agent-First registrada** — tabela acima.

## Limpeza da lista, decidida no mesmo recorte

**Materiais genéricos — retirado das pendências.** O `CLAUDE.md` proíbe inventar
esse contrato. Uma lista de pendências que pede o que a regra do projeto barra
não orienta ninguém; o item continua registrado como direção futura em
`VISAO.md`, que é onde ele pertence.

**A-16 (encaixe oco) — retirado.** A régua da peça mede por caixa de corpo e
**já declara** essa limitação no próprio relatório, então ninguém é enganado: o
custo é ruído de leitura, não erro escondido. E a capacidade de declarar assento
intencional **já existe na camada certa** — as relações de montagem têm
`assentaAnular` e `encaixaCilindrico`. Criar um segundo vocabulário para a mesma
ideia dentro da peça seria duplicação. Quem precisa medir assento modela como
montagem e usa a relação.

## Fechamento

Gates completos de [`../INDEX.md`](../INDEX.md) verdes.

**Decisão: aprovar.** A lista de pendências fica vazia de capacidade em aberto.
Permanecem como candidatos sem plano: `alinhar` (centragem derivada), `loft`
fechado e variantes nomeadas de revisão.

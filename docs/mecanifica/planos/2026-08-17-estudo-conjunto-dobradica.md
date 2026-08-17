# Estudo de campo — autoria de um conjunto simples de três peças

**Estado:** concluído

**Responsável:** Codex

**Repositório e base:** `warbookbr/nos-mecanifica`, `main` em `7adc657`.

## Problema observado

Os contratos e gates de autoria existem, mas a documentação de entrada contém
afirmações divergentes sobre o estado atual e distribui instruções de criação
entre documentos históricos e uma skill específica de outro agente. É preciso
medir o fluxo como consumidor novo, sem alterar o núcleo para facilitar a
fixture.

## Resultado

Criar uma dobradiça didática confinada, composta por folha fixa, folha móvel e
pino, inspecioná-la em mais de um enquadramento e registrar atritos com causa,
evidência, impacto e classificação.

## Filtro Agent-First

| Interface | Decisão | Razão |
|---|---|---|
| núcleo procedural e seleções semânticas | **USAR DIRETO** | o estudo mede o contrato atual, sem corrigi-lo durante a prova |
| receitas confinadas e montagem v3 | **ENVOLVER** | são o caminho mínimo para provar três peças e suas relações |
| documentação operacional | **ENVOLVER** | divergências observadas precisam ser confrontadas com código e gates |
| núcleo, câmera, materiais e relações novas | **ADIAR** | qualquer mudança apagaria a evidência que o estudo deve registrar |

## Incluído

- três receitas procedurais confinadas ao experimento;
- montagem persistida com identidades semânticas e relação cilíndrica;
- descrição estrutural, medidas e inspeção visual em ao menos dois
  enquadramentos;
- registro incremental de acertos, lacunas, erros e documentação insuficiente.

## Excluído

- publicar peças em `prototipos/procedural/v3/pecas/` ou no catálogo;
- alterar núcleo, bancada, câmera, materiais, MCP ou contratos de montagem;
- implementar capacidades encontradas durante o estudo;
- alegar engenharia ou homologação da geometria criada.

## Gate de saída

1. três receitas executam sem órfãos e com todas as faces nomeadas;
2. a montagem resolve por identidades semânticas e a relação declarada passa;
3. cada peça e o conjunto são conferidos estruturalmente e visualmente em mais
   de um enquadramento;
4. cada atrito registra evidência, causa provável, por que o estado existe e
   ação recomendada;
5. gates focados e gates documentais aplicáveis passam.

## Fatias

1. estabelecer baseline documental e escolher a fixture;
2. modelar as três peças e resolver a montagem;
3. medir, renderizar e revisar em múltiplas vistas;
4. consolidar o registro e encerrar com decisão.

## Riscos e parada

- parar se uma sobreposição aparecer na coordenação local;
- não criar relação nova só para fazer a dobradiça parecer mais completa;
- não corrigir documentação ou núcleo no mesmo recorte: registrar primeiro;
- reduzir a prova se a infraestrutura visual não consumir receitas confinadas,
  preservando a falha como evidência reproduzível.

## Fechamento

As três receitas executaram sem órfãos e sem faces sem parte. A montagem v3
satisfez 3/3 relações cilíndricas, todas com folga radial medida de 0,0002 m e
sobreposição axial de 0,04 m. Conjunto e folhas passaram em duas vistas; o pino
foi lido em três, mas o enquadramento automático recusou sua proporção fina.

O registro em
`autoria-assistida/experimentos/estudo-conjunto-dobradica/REGISTRO.md`
documenta nove achados com causa e recomendação. Entre eles: ausência
deliberada de união topológica geral e cinemática, falta de porta reutilizável
para receitas confinadas, template procedural incorreto, estado arquitetural
desatualizado e câmera inadequada para peças pequenas.

Gates de núcleo, testes, build, bancada, inventário e documentação passaram. O
gate final `npm run criar -- _viga` reprovou o manifesto porque `encostar`
existe no núcleo e na skill, mas não possui linha `FEITO` no contrato
procedural; a peça e seus renders passaram. Essa falha é evidência do estudo e
não foi corrigida para não ampliar o recorte.

**Decisão: `corrigir`.** O estudo está concluído e a fixture permanece
confinada. Correções de documentação, enquadramento, consumo de receitas
confinadas, união topológica ou movimento exigem recortes próprios.

# Catálogo de capacidades procedural

> Gerado por `npm run catalogo:gerar`; não edite à mão. A fonte é o registro explícito do motor.

Assinatura do registro: `sha256:7ba5466719f07939ed7a4bd6ac9d5eb304abe2512df01e1feeb87d6767898646`.

Há 32 operações em 1 módulo(s).

| operação | intenção | entra/sai | interfaces | custo | schema |
|---|---|---|---|---:|---|
| `apagaFace` | Remover exatamente uma face, preferencialmente por seleção semântica. | `mecanifica.malha-poligonal@1` → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.apagaFace@1` |
| `arranja` | Criar cópias lineares ou radiais com identidade estrutural. | `mecanifica.malha-poligonal@1` → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.arranja@1` |
| `arredondarAresta` | Substituir uma aresta convexa por múltiplos painéis de raio geométrico. | `mecanifica.malha-poligonal@1` → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.arredondarAresta@1` |
| `chamferBox` | Criar caixa de faces planas com quinas chanfradas. | — → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.chamferBox@1` |
| `cilindro` | Criar cilindro fechado com laterais e duas tampas endereçáveis. | — → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.cilindro@1` |
| `cone` | Criar cone fechado com base circular. | — → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.cone@1` |
| `cubo` | Criar uma caixa retangular apoiada em y=0. | — → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.cubo@1` |
| `displace` | Deslocar seleção ao longo das normais por ruído determinístico. | `mecanifica.malha-poligonal@1` → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.displace@1` |
| `encostar` | Posicionar uma seleção em contato direcional com uma referência. | `mecanifica.malha-poligonal@1` → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.encostar@1` |
| `esfera` | Criar esfera UV apoiada no chão. | — → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.esfera@1` |
| `espelha` | Duplicar faces refletidas, com modo estrutural opcional. | `mecanifica.malha-poligonal@1` → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.espelha@1` |
| `extruda` | Extrudar uma face por ID posicional. | `mecanifica.malha-poligonal@1` → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.extruda@1` |
| `filete` | Criar chanfro plano compatível com o filete v1. | `mecanifica.malha-poligonal@1` → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.filete@1` |
| `furo` | Abrir um ou vários furos estruturais passantes ou cegos. | `mecanifica.malha-poligonal@1` → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.furo@1` |
| `inflate` | Construir volume voxel fechado pela interseção de dois contornos 2D. | — → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.inflate@1` |
| `lathe` | Revolucionar perfil [raio,y] em torno de um eixo. | — → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.lathe@1` |
| `liso` | Marcar faces para sombreamento liso. | `mecanifica.malha-poligonal@1` → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.liso@1` |
| `loft` | Conectar seções ao longo de um caminho 3D. | — → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.loft@1` |
| `material` | Associar faces a um material declarado em MATERIAIS. | `mecanifica.malha-poligonal@1` → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.material@1` |
| `mescla` | Fundir vértices posicionais em um vértice-alvo. | `mecanifica.malha-poligonal@1` → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.mescla@1` |
| `moveA` | Mover os dois vértices de uma aresta posicional. | `mecanifica.malha-poligonal@1` → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.moveA@1` |
| `moveF` | Mover todos os vértices de uma face posicional. | `mecanifica.malha-poligonal@1` → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.moveF@1` |
| `moveV` | Mover um vértice por ID posicional. | `mecanifica.malha-poligonal@1` → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.moveV@1` |
| `parte` | Nomear faces como parte semântica e declarar hierarquia opcional. | `mecanifica.malha-poligonal@1` → `mecanifica.parte@1` | — → — | 1 | `mecanifica.argumentos.parte@1` |
| `pesar` | Atribuir peso de osso a vértices ou faces posicionais. | `mecanifica.malha-poligonal@1` → `mecanifica.pesos@1` | — → — | 1 | `mecanifica.argumentos.pesar@1` |
| `pincel` | Atribuir cor de face ou dabs locais determinísticos. | `mecanifica.malha-poligonal@1` → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.pincel@1` |
| `plano` | Criar grade plana no plano xz. | — → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.plano@1` |
| `publicarPorta` | Publicar interface semântica endereçável de uma origem existente. | `mecanifica.malha-poligonal@1` → `mecanifica.porta@1` | — → — | 1 | `mecanifica.argumentos.publicarPorta@1` |
| `rotaciona` | Rotacionar malha ou seleção em convenção destra. | `mecanifica.malha-poligonal@1` → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.rotaciona@1` |
| `solido` | Marcar faces para renderização sólida. | `mecanifica.malha-poligonal@1` → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.solido@1` |
| `transladar` | Transladar malha inteira ou seleção semântica. | `mecanifica.malha-poligonal@1` → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.transladar@1` |
| `vira` | Inverter o winding de uma face posicional. | `mecanifica.malha-poligonal@1` → `mecanifica.malha-poligonal@1` | — → — | 1 | `mecanifica.argumentos.vira@1` |

## Como usar

Consulte o catálogo para descobrir contratos disponíveis. Para argumentos, pré-condições, limites e exemplo executável, use `schemas-operacoes.json` ou `descrever_capacidade` no MCP. A validação de uma receita concreta continua sendo feita pelo executor e pelos gates.

O arquivo `grafo-capacidades.json` é um **hipergrafo direcionado**: uma operação pode consumir e produzir o mesmo tipo de artefato. Por isso ele não finge ser um DAG; um DAG nessa projeção apagaria ciclos reais de transformação.

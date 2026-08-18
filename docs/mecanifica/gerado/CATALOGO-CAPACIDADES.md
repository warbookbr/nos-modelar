# Catálogo de capacidades procedural

> Gerado por `npm run catalogo:gerar`; não edite à mão. A fonte é o registro explícito do motor.

Assinatura SHA-256 do registro: `028de9845c7841dee68afed413be675c8c1b6be92831203cbb193407063a2750`.

Há 32 operações em 1 módulo(s).

| operação | entra | sai | efeitos | identidade |
|---|---|---|---|---|
| `apagaFace` | `mecanifica.malha-poligonal@1` | `mecanifica.malha-poligonal@1` | `transforma-malha` | `preserva-ou-deriva` |
| `arranja` | `mecanifica.malha-poligonal@1` | `mecanifica.malha-poligonal@1` | `transforma-malha` | `preserva-ou-deriva` |
| `arredondarAresta` | `mecanifica.malha-poligonal@1` | `mecanifica.malha-poligonal@1` | `transforma-malha` | `preserva-ou-deriva` |
| `chamferBox` | — | `mecanifica.malha-poligonal@1` | `cria-geometria` | `cria-por-passo` |
| `cilindro` | — | `mecanifica.malha-poligonal@1` | `cria-geometria` | `cria-por-passo` |
| `cone` | — | `mecanifica.malha-poligonal@1` | `cria-geometria` | `cria-por-passo` |
| `cubo` | — | `mecanifica.malha-poligonal@1` | `cria-geometria` | `cria-por-passo` |
| `displace` | `mecanifica.malha-poligonal@1` | `mecanifica.malha-poligonal@1` | `transforma-malha` | `preserva-ou-deriva` |
| `encostar` | `mecanifica.malha-poligonal@1` | `mecanifica.malha-poligonal@1` | `transforma-malha` | `preserva-ou-deriva` |
| `esfera` | — | `mecanifica.malha-poligonal@1` | `cria-geometria` | `cria-por-passo` |
| `espelha` | `mecanifica.malha-poligonal@1` | `mecanifica.malha-poligonal@1` | `transforma-malha` | `preserva-ou-deriva` |
| `extruda` | `mecanifica.malha-poligonal@1` | `mecanifica.malha-poligonal@1` | `transforma-malha` | `preserva-ou-deriva` |
| `filete` | `mecanifica.malha-poligonal@1` | `mecanifica.malha-poligonal@1` | `transforma-malha` | `preserva-ou-deriva` |
| `furo` | `mecanifica.malha-poligonal@1` | `mecanifica.malha-poligonal@1` | `transforma-malha` | `preserva-ou-deriva` |
| `inflate` | — | `mecanifica.malha-poligonal@1` | `cria-geometria` | `cria-por-passo` |
| `lathe` | — | `mecanifica.malha-poligonal@1` | `cria-geometria` | `cria-por-passo` |
| `liso` | `mecanifica.malha-poligonal@1` | `mecanifica.malha-poligonal@1` | `anota-face` | `preserva` |
| `loft` | — | `mecanifica.malha-poligonal@1` | `cria-geometria` | `cria-por-passo` |
| `material` | `mecanifica.malha-poligonal@1` | `mecanifica.malha-poligonal@1` | `anota-face` | `preserva` |
| `mescla` | `mecanifica.malha-poligonal@1` | `mecanifica.malha-poligonal@1` | `transforma-malha` | `preserva-ou-deriva` |
| `moveA` | `mecanifica.malha-poligonal@1` | `mecanifica.malha-poligonal@1` | `transforma-malha` | `preserva-ou-deriva` |
| `moveF` | `mecanifica.malha-poligonal@1` | `mecanifica.malha-poligonal@1` | `transforma-malha` | `preserva-ou-deriva` |
| `moveV` | `mecanifica.malha-poligonal@1` | `mecanifica.malha-poligonal@1` | `transforma-malha` | `preserva-ou-deriva` |
| `parte` | `mecanifica.malha-poligonal@1` | `mecanifica.parte@1` | `nomeia-faces` | `declara-semantica` |
| `pesar` | `mecanifica.malha-poligonal@1` | `mecanifica.pesos@1` | `anota-pesos` | `por-vertice` |
| `pincel` | `mecanifica.malha-poligonal@1` | `mecanifica.malha-poligonal@1` | `anota-face` | `preserva` |
| `plano` | — | `mecanifica.malha-poligonal@1` | `cria-geometria` | `cria-por-passo` |
| `publicarPorta` | `mecanifica.malha-poligonal@1` | `mecanifica.porta@1` | `publica-porta` | `declara-semantica` |
| `rotaciona` | `mecanifica.malha-poligonal@1` | `mecanifica.malha-poligonal@1` | `transforma-malha` | `preserva-ou-deriva` |
| `solido` | `mecanifica.malha-poligonal@1` | `mecanifica.malha-poligonal@1` | `anota-face` | `preserva` |
| `transladar` | `mecanifica.malha-poligonal@1` | `mecanifica.malha-poligonal@1` | `transforma-malha` | `preserva-ou-deriva` |
| `vira` | `mecanifica.malha-poligonal@1` | `mecanifica.malha-poligonal@1` | `transforma-malha` | `preserva-ou-deriva` |

## Como usar

Consulte o catálogo para descobrir contratos disponíveis. Ele descreve capacidade registrada; a validação de uma receita concreta continua sendo feita pelo executor e pelos gates.

O arquivo `grafo-capacidades.json` é um **hipergrafo direcionado**: uma operação pode consumir e produzir o mesmo tipo de artefato. Por isso ele não finge ser um DAG; um DAG nessa projeção apagaria ciclos reais de transformação.

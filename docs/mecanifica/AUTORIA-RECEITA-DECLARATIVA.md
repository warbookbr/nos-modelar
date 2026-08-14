# Autoria de receita declarativa

## Contrato

`mecanifica.receita-declarativa` v1 representa uma receita procedural como
dado JSON. Campos obrigatórios:

- `id` e `meta.nome` iguais e semânticos;
- `params`, `topo`, `passos`, `materiais` e `aliases` aceitos pelo núcleo;
- `formato` e `versao` explícitos.

Funções, imports, módulos, classes, valores não finitos e qualquer JavaScript
executável são recusados. A proposta está limitada a 512 KiB, 2.048 passos,
2.048 aliases e 500.000 vértices/faces depois da execução. Esses limites
protegem o serviço de propostas acidentais excessivas; não transformam o núcleo
em ambiente para código hostil, pois nenhum código do agente é executado.

## Ciclo seguro

1. planejar valida o documento, executa o núcleo em memória e calcula os hashes;
2. confirmar vincula ID, revisão-pai, objeto e commit aos mesmos bytes;
3. inspecionar produz vistas isométrica e direita e revalida todas as raízes do
   catálogo explícito, substituindo somente a peça candidata em memória;
4. aplicar repete os gates e publica snapshot imutável por transição exclusiva;
5. observar relê somente a revisão ativa.

Faces sem parte semântica, órfãos, porta inválida, relação reprovada, captura
incompleta, confirmação divergente ou revisão velha bloqueiam a publicação.

## Perfil MCP

O perfil `autoria` conserva as quatro ferramentas de montagem e acrescenta:

- `observar_autoria_receita`;
- `planejar_autoria_receita`;
- `inspecionar_proposta_receita`;
- `aplicar_autoria_receita`.

O host configura `MECANIFICA_REPOSITORIO_AUTORIA`,
`MECANIFICA_CATALOGO_MONTAGENS` e uma lista explícita em
`MECANIFICA_RECEITAS_AUTORIZADAS`. O recurso `mecanifica://estado` anuncia os
IDs autorizados. O cliente usa apenas IDs, revisão, documento e confirmação;
nunca envia ou recebe caminhos locais.

## Limites

O formato não promete importar automaticamente todo módulo JavaScript histórico.
Também não publica arquivos em `prototipos/fps/v3/pecas/`, não executa Git e não
descobre dependentes fora do catálogo. Um gerador de módulo pode consumir a
revisão declarativa futuramente, desde que preserve os mesmos bytes e gates.

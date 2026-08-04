# Autoria assistida por IA

## Contrato atual

Uma peça pode ser escrita como receita determinística. O núcleo resolve
`PARAMS`, `TOPO`, `PASSOS`, `MATERIAIS`, `ALIASES`, partes, portas e origens.
Cada parte relevante recebe nome semântico estável. A receita exporta `meta` e
`construir`, e quando usa o formato procedural expõe os dados reexecutáveis.

Expressões nomeadas resolvem números e vetores sem seno, cosseno ou índices
crus no arquivo salvo. Operações estruturais publicam origem e seleção. `parte`,
`material`, `liso`, `solido`, `publicarPorta` e as seleções por grupo consultam
essa identidade. `arranja`, `furo`, `espelha`, `loft`, `filete` e as primitivas
existentes são capacidades do núcleo, cada uma com seus limites documentados no
contrato procedural.

## Hierarquia mínima

O caminho de leitura é: montagem ou peça, parte semântica, grupo/porta, origem
estrutural e face. A bancada mostra a hierarquia e a consulta de subárvore. A
seleção vazia, ambígua ou sem dono grita; nunca vira no-op silencioso.

## Forma do arquivo

Os exemplos de sintaxe nos documentos são ilustrativos até aparecerem em uma
receita e passarem os gates. Capacidade existente significa: implementada no
núcleo, coberta por teste e exercitada por peça. Proposta, backlog ou exemplo
não autoriza adicionar uma operação.

## Limites

Não há contrato genérico de materiais, PBR, paleta aberta, montagem persistida
ou solver de encaixe. A abertura oblonga não é expressável. O endereço único de
um grupo linear ainda está aberto. Tarefas do produto cliente vão para
`warbookbr/mecanica`.

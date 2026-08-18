# Relatório R10 — plataforma procedural

## Resultado

**Decisão: aprovar.** A R10 encerra o plano de plataforma procedural extensível
e descobrível. Não há executor, receita pública ou catálogo paralelo no estudo:
o catálogo publicado continua vazio e toda a prova vive em
`autoria-assistida/experimentos/plataforma-procedural-r10/`.

## Limpeza e integração

O mapa executável registra 32 operações, 48 exportações e 65 consumidores. O
corpus R00 preserva 32/32 casos e zero diagnósticos. A extensão nativa deixou de
ser uma prova limitada ao núcleo: `registroOperacoes` atravessa execução,
descrição e exportação por opção explícita; sem a opção, a receita com
`prismaTriangular` é recusada sem estado parcial. A assinatura do registro entra
na impressão da receita exportada, preservando reprodutibilidade.

## Estudo de campo privado

Três famílias foram construídas: apoio prismático (subgrafo declarativo), pino
circular (revolução) e nervura triangular (extensão nativa dentro de subgrafo).
A procedência registra tanto o caminho semântico da composição como
`mecanifica.operacao.prismaTriangular`.

A montagem v4 resolve as três peças. A auditoria cobre os três pares: apoio–
nervura e apoio–pino encostam; nervura–pino permanece separada. Não há pares
inconclusivos. Duas capturas PNG válidas e distintas foram produzidas para cada
peça e para o conjunto.

## Métricas e limites

No ambiente Node 22, a mediana atual do corpus é 7,947 ms, heap final 8.488.400
bytes e variação RSS 262.144 bytes. A baseline funcional permanece intacta; a
medição de tempo não recebe teto entre máquinas. Materiais genéricos, solver,
cinemática, correção e promoção automática continuam fora.

## Gates

Passaram: estudo R10, composições R06, extensões R07, exportação, arquitetura,
baseline, catálogo, tipagem, build, porteiro, bancada vazia, guardas, mapa,
documentação, planos e MCP. A suíte completa executou 272 arquivos e 1.028
testes: 1.026 passaram, dois foram ignorados conforme o contrato e nenhum
falhou. O ambiente foi validado com Node 22 e Chromium Playwright.

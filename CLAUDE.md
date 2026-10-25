# Mecanifica — contrato mínimo

Só o que nenhuma ferramenta confere; a regra que um gate cobra chega como recusa
dele. `npm run comecar -- <roteiro>` (ou a ferramenta MCP
`comecar`) diz o que ler, a skill, os comandos e o passo seguinte.

<!-- roteiros:inicio -->
- `mudar`: Mudar núcleo, gate, arquitetura, ferramenta ou plano.
- `documentar`: Escrever, mover ou cortar documento, fora de um plano.
- `pesquisar`: Saber o que já se tentou, mediu ou pesquisou antes de propor algo.
- `modelar`: A tarefa é uma peça (receita), um esboço sem referência, ou a auditoria de uma peça ou de uma montagem?
<!-- roteiros:fim -->

<!-- invariantes:inicio -->
## Regras

- IDs internos, índices de arrays e posições de passos nunca são identidade
  persistida.
- Conteúdo salvo é determinístico, versionado, reexecutável e validável.
- Modele e revise peças na bancada neutra antes de levá-las ao produto. Nenhuma
  métrica aprova forma sozinha, e quem aprova forma é a pessoa.
- A correção que um objeto revela vai para a ferramenta, o gate ou a instrução
  geral, e não para o arquivo daquele objeto. O que só serve a uma família ou
  objeto entra como opção declarada sobre a ferramenta geral.
- Imagem de referência com marca, logotipo ou nome de fabricante não entra no
  repositório, nem prancha de terceiro, da qual entram só as coordenadas
  derivadas. Imagem gerada por IA vale como caráter da forma, nunca como medida.
- Material entra só como escolha por peça na receita e módulo de textura; PBR e
  paleta nova, só com plano.
- Sem plano ativo, o backlog não autoriza implementação.

## Coordenação e qualidade

- Use pt-BR.
- Escreva em parágrafos corridos e literais, aqui e nas respostas ao usuário.
  Sem frases picotadas, listas de fragmentos, oposições "não X, e sim Y" nem
  negrito no meio do texto. Descreva o fato, não a analogia.
- Responda curto: cada fato uma vez, sem recapitular o que o usuário já sabe nem
  justificar além do que a decisão pede. Um erro se reconhece em uma frase.
- Ao reportar à pessoa, traga um sumário breve do que foi feito, sem termos
  internos, e diga se algo depende da decisão dela, sempre com a recomendação.
- Rode `npm run gates` antes de enviar (`--completo` e o CI rodam todos os
  testes lentos). Agente despachado não o roda; quem integra roda uma vez.
- Todo achado responde se o processo o teria pego sozinho. Quando não, o que
  falta vira gate, campo ou instrução antes de a correção ser dada por pronta.
- Histórico e evidências encerradas não governam trabalho novo, nem por citação
  nem por analogia.
<!-- invariantes:fim -->

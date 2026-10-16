# Mecanifica — acordo de trabalho

Núcleo procedural, receitas, bancada e ferramentas com que a IA cria, inspeciona e
audita peças e montagens. `bancada.html` é a única aplicação publicada aqui.

## Entrada de contexto

Rode `npm run comecar` (ou a ferramenta MCP `comecar`) e escolha o roteiro da
tarefa; `npm run comecar -- <roteiro>` devolve o que ler, a skill, os comandos e o
passo seguinte.

<!-- roteiros:inicio -->
- `mudar`: Mudar núcleo, gate, arquitetura, ferramenta ou plano.
- `documentar`: Escrever, mover ou cortar documento, fora de um plano.
- `pesquisar`: Saber o que já se tentou, mediu ou pesquisou antes de propor algo.
- `modelar/peca`: Escrever ou corrigir a receita de uma peça e prová-la na bancada.
- `modelar/esboco`: Escrever o JSON do esboço de um objeto ou de uma unidade, como esbocista.
- `modelar/laco-do-esboco`: Despachar esbocista e crítico, registrar vereditos e medir o custo de um ou mais objetos.
- `modelar/auditar-peca`: Obter evidência objetiva de uma peça antes de publicar ou homologar.
- `modelar/auditar-montagem`: Conferir composição, relações, encaixes e impacto de um conjunto montado.
<!-- roteiros:fim -->

<!-- invariantes:inicio -->
## Regras

- O núcleo de autoria é independente de Three.js e do domínio automotivo. O
  teste `tools/arquitetura/nucleo-sem-three.test.mjs`, do gate `test`, confere.
- IDs internos, índices de arrays e posições de passos nunca são identidade
  persistida.
- Conteúdo salvo é determinístico, versionado, reexecutável e validável.
- Modele e revise peças na bancada neutra antes de levá-las ao produto. Nenhuma
  métrica aprova forma sozinha, e quem aprova forma é a pessoa.
- A correção que um objeto revela vai para a ferramenta, o gate ou a instrução
  geral, e não para o arquivo daquele objeto. O que só serve a uma família ou
  objeto entra como opção declarada sobre a ferramenta geral.
- Mudanças gerais que possam voltar ao NÓS ficam isoladas e registradas em
  `docs/mecanifica/UPSTREAM-NOS.md`.
- Imagem de referência com marca, logotipo ou nome de fabricante não entra no
  repositório.
- Não invente contrato genérico de materiais, PBR, paleta nova ou capacidade de
  produto nesta documentação.
- Sem plano ativo, o backlog não autoriza implementação.
- O trabalho dividido com outra IA neste repositório passa por `comunicacao.md`,
  com uma tarefa por seção.

## Coordenação e qualidade

- Use pt-BR.
- Escreva em parágrafos corridos e literais, aqui e nas respostas ao usuário.
  Sem frases picotadas, listas de fragmentos, oposições "não X, e sim Y" nem
  negrito no meio do texto. Descreva o fato, não a analogia: diga "o valor fixo
  deixa de corresponder ao parâmetro e as partes se atravessam", não "o número
  envelhece mal".
- Responda curto. Diga cada fato uma vez, sem repetir com outras palavras, sem
  recapitular o que o usuário já sabe e sem justificar além do que a decisão
  pede. Um erro se reconhece em uma frase.
- Ao reportar à pessoa, traga um sumário breve do que foi feito, sem termos
  internos, e diga se algo depende da decisão dela, sempre com a recomendação.
- Rode `npm run gates` antes de enviar: ele roda os testes rápidos sempre e os
  lentos ligados ao que mudou, e `--completo` e o CI rodam todos. Agente
  despachado não o roda; quem integra roda uma vez.
- Não edite `docs/MAPA.md` à mão; depois de mexer em documentação, rode
  `npm run mapa`. O gate `mapa:check` confere.
- Todo achado responde se o processo o teria pego sozinho. Quando não, o que
  falta vira gate, campo ou instrução antes de a correção ser dada por pronta.
- Histórico e evidências encerradas não governam trabalho novo, nem por citação
  nem por analogia.
<!-- invariantes:fim -->

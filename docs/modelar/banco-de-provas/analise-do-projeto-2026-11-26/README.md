# Análise do projeto: o resumo das quatro frentes

Pasta do plano [análise do projeto](../../decisoes/PLANOS-ENCERRADOS.md). Cada frente escreveu a versão melhor às 11:27 UTC de 2026-11-26, antes de ler o repositório, e depois comparou: [documentação](documentacao.md), [núcleo](nucleo.md), [ferramentas](ferramentas.md) e [processo](processo.md). Nada foi executado além de leitura, contagem e consultas à API do GitHub.

## O que já está acima da referência

O roteador `npm run comecar` com orçamento de leitura cobrado por gate, o `CLAUDE.md` gerado de um JSON que diz o gate de cada regra, o núcleo sem ciclo de importação, com registro de operações assinado, identidade posicional por passo e cache por prefixo com prova bit a bit, a zebra numérica sobre a superfície limite, o registro de rodada medido pela ferramenta e a bateria local que escolhe os testes pelo arquivo lido.

## As dez recomendações, por ganho sobre custo

1. O passo de juntar à main do CI passa a juntar a main nova e tentar de novo sozinho, ou vira fila de junção. Em dez dias, 13 execuções verdes se perderam porque outra sessão andou a main no meio, e houve 57 commits de junção manual. Custo pequeno a médio. ([processo](processo.md), recomendação 1)
2. O teto de tempo dos testes deixa de reprovar no CI e passa a aviso, reprovando só na máquina local. Foram 12 das 52 falhas em dez dias, todas em máquina mais lenta, sem defeito. Custo pequeno. (processo, 2)
3. O navegador do CI fica em cache pela versão, no lugar de ser instalado em 14 máquinas a cada execução. Tira a falha de 26/11 e as instalações presas de 23/11. Custo pequeno. (processo, 6)
4. O `docs/MAPA.md` (389 KB, gerado, tocado em 222 de 556 commits) sai do versionamento ou é gerado no CI. Tira 7 a 8 reprovações e o principal ponto de conflito entre sessões. Custo médio. (processo, 5)
5. O laço de modelagem fica mais rápido: a bancada mantém o Vite e o Chromium aquecidos entre comandos (uma vista de 15 s para perto de 2 s), a dobra e o vinco oculto entram no cache por passo (76 dos 105 s da ação da rodada) e o pacote do crítico cai para umas dez imagens padrão mais as partes que mudaram (de 10 min para perto de 2). Custo pequeno a médio. ([ferramentas](ferramentas.md), 2 a 4)
6. O núcleo ganha um módulo único de aresta com chave numérica e um índice de adjacência e grade espacial mantidos por versão da malha, no lugar das 26 chaves de texto e das 59 varreduras da peça inteira em 13 arquivos. Ganho medido de 6 a 11 s por peça pesada. Custo médio. É a continuação do plano das operações repartidas que está em andamento. ([núcleo](nucleo.md), 1 e 2)
7. Um registro de ferramentas com gate: 34 linhas de comando não têm entrada no `package.json` (a zebra numérica e a distância à pele entre elas), 21 arquivos só são alcançados por teste, e o `tools/README.md` descreve uma pasta que não existe desde outubro. Custo pequeno. (ferramentas, 1 e 7)
8. O roteador ganha ramo para conduzir a rodada, montar e exportar, o orçamento de leitura passa a somar a skill que o roteiro manda aplicar, e a skill do laço cai de 3.645 para perto de 1.500 palavras. Criar uma peça hoje custa 4.500 palavras, 61% acima do que o gate mede. Custo pequeno a médio. ([documentação](documentacao.md), 1, 4 e 6)
9. Regras que só vivem em texto viram régua: o envio conferido contra o território do plano ativo, negrito no meio do texto como catraca (262 hoje) e termo de domínio no código do núcleo (32 linhas). Custo pequeno. (processo, 8; documentação, 5)
10. A decisão da pessoa passa a ter campo na rodada, ao lado do veredito do crítico (as 150 rodadas não têm), e a calibração do crítico é refeita com capturas da bancada, porque as doze imagens de hoje são do desenhista aposentado em 05/11. Custo médio. (processo, 7)

## Achados que pedem atenção fora da lista

O `.claude/settings.json` libera `Bash(kill *)` enquanto as regras dos agentes proíbem `kill`. O servidor MCP está ligado só para o Codex, sem `.mcp.json`, embora o `CLAUDE.md` da raiz cite a ferramenta MCP `comecar`. O `node tools/mapa/mapa.mjs --ajuda` regrava o mapa em vez de imprimir ajuda. A página de entrada diz 54 peças e a árvore tem 64. Nenhum desses quebra o produto.

## O que ficou para depois

Repartir `nucleo.js` (4.057 linhas) e a função de 2.634 linhas das booleanas, juntar as doze ferramentas de comparação com a referência numa biblioteca, unificar os dois caches e a matemática de vetor (24 cópias) são de custo médio a grande e entram como plano depois dos de cima.

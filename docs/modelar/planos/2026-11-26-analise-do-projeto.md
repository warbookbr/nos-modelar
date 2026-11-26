# Análise do projeto: a documentação, o núcleo, as ferramentas e o processo comparados com uma versão melhor desenhada antes da leitura

**Estado:** concluído

**Território:** `docs/modelar/banco-de-provas/analise-do-projeto-2026-11-26/`.

Ativado pela pessoa em 2026-11-26 ("Crie e ativa um plano para isso tambem, como sao muitas frentes eu preciso de um retorno mais otimizado tambem quando voce me trazer suas recomendações").

**Responsável:** a IA da sessão conduz e despacha um agente por frente; a pessoa decide quais recomendações viram plano.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-26 (4758eca8).

## Problema observado

O projeto cresceu por planos curtos, cada um resolvendo o defeito que um objeto revelou: são 308 documentos, 113 arquivos no núcleo, 569 ferramentas e 10 skills. Nenhum plano olhou o conjunto contra um desenho de referência: se a documentação custa pouco para quem usa e para quem desenvolve, se a estrutura do núcleo é a que um motor de modelagem determinístico pede, e se cada ferramenta usa a melhor abordagem para o que resolve.

## Resultado

Um relatório por frente e um resumo único para a pessoa, com as recomendações ordenadas por ganho sobre custo, cada uma com a evidência (arquivo, medida ou contagem) e a versão melhor com que foi comparada.

## Filtro Agent-First

Só leitura e medida barata (contagem, tamanho, grep, tempo de comandos leves). Nenhuma receita pesada, nenhum gate, nenhuma mudança fora do território.

## Incluído

Cada frente começa escrevendo a versão melhor, desenhada pelo objetivo do projeto e pelo estado da arte, antes de ler o que existe, e só depois compara:

- documentação: o caminho que um agente e uma pessoa fazem para usar e para desenvolver (quantos documentos e quantos tokens até a primeira ação certa), duplicação, documento morto, regra que vive só em texto e não em gate;
- núcleo: a representação da malha e do estado, o registro das operações, o determinismo, o acoplamento entre módulos, o tamanho dos arquivos e o custo das varreduras que se repetem;
- ferramentas: para cada família de ferramentas (medida, bancada, rodadas, contorno e prancha, gates, mapa), a abordagem usada contra a melhor conhecida, duplicação entre ferramentas e ferramentas sem uso;
- processo: os gates e o CI (tempo, falso vermelho, o que cobram), os testes, as skills e os agentes, e o que mais a leitura mostrar.

## Excluído

- implementar qualquer recomendação, que vira plano próprio com a decisão da pessoa;
- julgar forma de peça.

## Invariantes

Nenhum arquivo fora do território muda. Toda recomendação diz a evidência e se o processo atual a teria pego sozinho.

## Gate de saída

1. A versão melhor de cada frente escrita antes da comparação, com a data de cada uma no relatório.
2. Um relatório por frente e o resumo único, com no máximo dez recomendações ordenadas por ganho sobre custo.
3. A decisão da pessoa sobre cada recomendação gravada aqui; `npm run gates` verde e o CI verde.

## Fatias

1. As quatro frentes, em paralelo, cada uma por um agente só de leitura.
2. O resumo único, a decisão da pessoa e o fechamento.

## Riscos e parada

A máquina tem 16 GB e outro trabalho pesado roda ao mesmo tempo: os agentes não executam receita nem gate. Se uma frente achar um defeito que quebra o produto, ele sai do relatório para a pessoa na hora.

## Decisão da pessoa

Decidido pela pessoa em 2026-11-26 ("1 a 10 aprovadas. Sobre os achados sao importantes, tambem vou seguir sua recomendação em relação a eles"), e, para dar vaga aos planos que saem daqui, "Modelagem do carro congela, e se necessário tambem congela a superfície de produção". As recomendações viraram três planos ativos: [processo e CI](2026-11-26-processo-e-ci.md) (1, 2, 3, 4 e 9, com a regra nova do limite de planos de núcleo), [laço de modelagem mais rápido](2026-11-26-laco-de-modelagem-mais-rapido.md) (5 e 10) e [ferramentas e documentação](2026-11-26-ferramentas-e-documentacao.md) (7, 8 e os achados). A 6 segue no plano das operações repartidas entre núcleos. A modelagem do carro e a superfície de produção foram congeladas.

## Andamento

As quatro frentes e o resumo estão no [banco de provas](../banco-de-provas/analise-do-projeto-2026-11-26/README.md).

## Fechamento

Concluído em 2026-11-26. Cada frente escreveu a versão melhor às 11:27 UTC, antes de ler o repositório, e comparou com a evidência. As dez recomendações foram aprovadas pela pessoa e distribuídas em três planos novos e num plano em andamento; o que ficou de custo grande (repartir `nucleo.js`, juntar as ferramentas de comparação com a referência, unificar os caches e a matemática de vetor) está no resumo como seguinte. Os gates locais e o CI são do envio deste fechamento.

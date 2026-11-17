# O cache por passo da receita

O cache por passo existe para o laço de modelagem: depois de editar um passo da receita, o comando seguinte refaz só esse passo e os que vêm depois dele, e não a receita inteira. A malha que sai é idêntica, bit a bit, à da execução completa.

## Como se liga

Os comandos que executam a receita em Node o usam sem opção nenhuma: `npm run descrever`, a captura `npm run bancada` (`olhar-bancada`), que executa a receita uma vez só e grava ao lado da sessão o neutro que a página lê, e a medida de contatos da captura. O serviço `descreverPeca`, chamado em processo, o recebe desligado, e quem chama o liga com `cachePorPrefixo: true`. A página da bancada não executa a receita da captura: lê o neutro gravado pela ativação e só executa como antes quando o arquivo falta, caso em que o relato da captura diz `página: receita executada na página` com o motivo.

O estado depois de um passo fica guardado sob uma chave que encadeia o conteúdo dos passos 0 a k, a disponibilidade da Manifold e a versão do código (o núcleo, as extensões do registro, os pacotes que eles importam e o Node). Uma edição no passo j muda a chave de j e dos seguintes, e a execução recomeça do último estado guardado antes de j. Um estado de outra versão do código, de outro ambiente ou de outra receita com prefixo diferente nunca é servido.

Nem todo passo vira ponto guardado. Viram ponto o passo que leva ao menos 250 ms, os dois últimos e o anterior ao primeiro passo que mudou desde a execução anterior; por isso a primeira edição depois de um passo caro pode refazer tudo desde o ponto anterior mais próximo, e a segunda no mesmo passo já recomeça dele. Com a receita sem mudança nenhuma, nenhum passo é executado.

## Onde mora e como limpar

Os pontos moram em `tmp/cache-por-prefixo/`, na raiz do repositório e fora do controle de versão. O cache da medida de contatos é outro, em `tmp/cache-de-medida/`. Quando a versão do código muda, os pontos de versões velhas são apagados no comando seguinte, de modo que a pasta não cresce sem fim por mudança de núcleo; para limpar à mão, apague a pasta inteira (`rm -rf tmp/cache-por-prefixo`), que o próximo comando a recria e refaz a receita uma vez.

## Sem cache e conferência

`--sem-cache`, em `npm run descrever` e em `npm run bancada`, executa a receita inteira do zero, sem ler nem gravar estado guardado, e na bancada mede os contatos de novo. Use-o quando suspeitar do cache: se a saída com e sem ele diferir, é defeito do cache, e ele fica desligado até a causa ser corrigida. O modo conferido do núcleo (`OPCOES.memoriaConferida`) roda de novo inteira a execução que recomeçou de um estado guardado, compara a impressão do neutro e recusa a divergência, apagando os pontos da receita. A prova de que o acervo todo dá o mesmo neutro é `CACHE_ACERVO_INTEIRO=1 npx vitest run procedural/nucleo/planejador/cache-por-prefixo-acervo.test.mjs` (uns 11 min); no CI roda um conjunto de cobertura de 24 s.

## O que o cache não faz e limitações conhecidas

O cache não torna mais rápida a primeira execução de uma receita, e uma edição no primeiro passo refaz tudo. A medida de 2026-11-17 está no [banco de provas do plano](../banco-de-provas/cache-por-passo-2026-11-16/README.md): o laço da bicicleta foi de 74,6 s a 32,0 s, e o do quarto traseiro do carro, de 30 passos executados para 2. As limitações conhecidas, como a trava de índice que um processo morto deixa (tomada na hora) ou o pid reaproveitado, a leitura síncrona do neutro pela página, que bloqueia a carga de uma peça muito pesada, a varredura de sessões abandonadas só pela idade e o que o JSON da receita não guarda (funções, valores indefinidos de objeto) e que por isso não troca a impressão da entrada, estão em [Limitações conhecidas](../banco-de-provas/cache-por-passo-2026-11-16/README.md#limitações-conhecidas). A execução paralela das partes independentes e o estreitamento das operações que varrem a malha ficam no backlog.

# Execução paralela: medir quanto tempo as ferramentas ganham usando os quatro núcleos da máquina

**Estado:** ativo

**Território:** `docs/modelar/banco-de-provas/execucao-paralela-2026-11-26/`, `docs/modelar/planos/BACKLOG.md`.

Ativado pela pessoa em 2026-11-26 ("pode criar o plano e ativar e fazer a medição sim"), pela linha "Execução paralela de partes independentes" do backlog, cuja condição (o cache por passo) foi cumprida com o encerramento daquele plano em 2026-11-17.

**Responsável:** a IA da sessão mede e escreve; a pessoa decide, pelas medidas, se e onde a execução paralela entra.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-26 (273c89cc).

## Problema observado

A execução de uma receita é um laço de passos num processo só. A lataria do `carro-fastback` leva perto de 107 s por execução, e quem mede uma forma nova espera esse tempo inteiro, porque o cache por passo só poupa os passos anteriores ao que mudou. Entre as peças do acervo já há paralelismo: `npm run gates` roda quatro verificações de cada vez, a `guarda:acervo` mede as peças em até quatro fios (`conferirAcervo`, com `worker_threads`) e os testes lentos rodam em quatro processos; o `retrato:acervo` roda uma peça depois da outra. A máquina tem quatro núcleos e 16 GB. Ninguém mediu quanto do tempo de uma receita está em passos que não dependem uns dos outros, nem quanto custa copiar o estado da peça para outro processo, nem quanta memória quatro execuções ao mesmo tempo pedem.

## Resultado

Um banco de provas com as medidas que respondem, para cada um dos três níveis, quanto se ganharia e quanto custaria: dentro de uma receita (passos independentes), entre as partes de um objeto (as partes do braço robótico, cada uma com a própria receita) e entre as peças do acervo (as ferramentas que percorrem todas). Com isso a pessoa decide qual nível vira plano de implementação.

## Filtro Agent-First

Só medição: scripts no banco de provas, sobre `executarReceita`, `importarReceita` e o grafo de leitura e escrita de `procedural/nucleo/planejador/leitura-escrita.js`, sem mudar nenhum deles.

## Incluído

- dentro de uma receita, na lataria do carro e na parte mais lenta do braço: o tempo de cada passo, o caminho mais longo pelo grafo de dependência dos passos (o limite do ganho com núcleos à vontade) e o custo de serializar e desserializar o estado nos pontos em que o grafo se ramifica;
- entre as partes do braço: o tempo das partes uma depois da outra e em um, dois e quatro processos, com o pico de memória de cada processo e da soma;
- entre as peças do acervo: quanto a `guarda:acervo` ganha hoje com quatro fios contra um, e se a peça mais lenta já é o piso do tempo dela;
- a carga e o tempo roubado da máquina virtual durante cada medida, como o banco de provas do cache por passo já faz.

## Excluído

- mudar o núcleo, o executor da receita ou qualquer ferramenta; a implementação de um nível é plano próprio, depois da decisão da pessoa;
- paralelizar dentro de uma operação (a subdivisão ou a booleana em vários núcleos).

## Invariantes

Nenhum arquivo fora do território muda, e o resultado de cada execução medida em paralelo é igual, byte a byte na malha serializada, ao da execução em série.

## Gate de saída

1. O banco de provas com as medidas dos três níveis, cada uma com o comando que a reproduz.
2. A igualdade da malha entre a execução em série e a paralela em cada medida que executou em paralelo.
3. A recomendação escrita, com o ganho e o custo de memória de cada nível, e a decisão da pessoa gravada aqui.
4. `npm run gates` verde e o CI verde.

## Fatias

1. As medidas dos três níveis e a recomendação.
2. A decisão da pessoa, a linha do backlog trocada pelo resultado e o fechamento.

## Riscos e parada

A máquina já reiniciou por falta de memória com duas execuções pesadas ao mesmo tempo. Cada medida em paralelo começa pela de dois processos, com o pico de memória lido antes de passar a quatro, e para se a soma passar de 12 GB. Se o tempo roubado da máquina virtual passar de 10% numa medida, ela se repete.

## Decisão da pessoa

## Andamento

## Fechamento

# Cache por passo da receita: refazer só o que mudou, entre comandos, medido no laço de modelagem

**Estado:** ativo

**Território:** `procedural/nucleo/planejador/`, `procedural/nucleo/nucleo.js`, `tools/modelar/descrever-peca.mjs`, `docs/modelar/banco-de-provas/cache-por-passo-2026-11-16/`

Ativado em 2026-11-16 no fechamento do cordão de solda, como a pessoa decidiu. `tools/modelar/olhar-bancada.mjs`, onde a bancada usaria o cache (fatia 4), é do plano do reflexo enquanto ele estiver ativo, e entra neste território quando o reflexo fechar; até lá o cache se prova no `descrever`.

**Responsável:** a IA da sessão implementa e mede; a pessoa decide o que fazer se o ganho não pagar a complexidade.

**Repositório e base:** `warbookbr/nos-modelar`, main na ativação.

Sucessor do plano do [cordão de solda](../decisoes/PLANOS-ENCERRADOS.md), decidido pela pessoa em 2026-11-16: os dois mudam o núcleo, e este é ativado no fechamento daquele. Continua o [planejador de execução](../decisoes/PLANOS-ENCERRADOS.md), concluído em 2026-11-14, que levou o furgão realista de 118 s para 47 s com o rastreio declarado e mandou o cache por passo e a execução paralela para o backlog.

## Problema observado

Todo comando que olha uma peça (bancada, descrever, guardas, varreduras, testes) gera a receita do zero, passo a passo, mesmo quando só o último passo mudou. No laço de modelagem isso se repete a cada ajuste: na sessão de 2026-11-13 a 2026-11-16 a captura da zebra do quarto traseiro do carro levou 1 min 26 s, a varredura das juntas da bicicleta gerou a bicicleta inteira 27 vezes, e os agentes passaram boa parte do tempo esperando comando. O backlog registra o que falta para o cache: a leitura declarada nos manifestos (0 de 6.611 passos que leem a malha a declaram, medido em `procedural/nucleo/planejador/leitura-escrita.js`), sem a qual não se sabe que passo depende de qual.

## Resultado

Um comando repetido sobre a mesma receita com um passo mudado refaz só os passos que dependem dele, com a malha idêntica bit a bit à da execução completa, e o tempo medido do laço (gerar, capturar, medir) cai em pelo menos metade na bicicleta e no quarto traseiro do carro.

## Filtro Agent-First

Linha de base: MEDIR antes de tudo, por peça pesada (bicicleta, carro, furgão realista, braço), quanto do tempo de cada comando é execução da receita, captura, conferência de contato e descrição, para o cache mirar no que custa.

Leitura declarada: REFATORAR os manifestos das operações que leem a malha, declarando o que leem, conferido contra a leitura real pelo modo conferido que o planejador já tem.

Cache: CRIAR no planejador a impressão digital das entradas de cada passo (os argumentos e o estado lido) e o estado guardado entre comandos, em disco fora do repositório, com o modo conferido que refaz tudo e compara bit a bit.

Execução paralela das partes independentes: ADIAR para depois do cache, como o backlog diz, salvo se a linha de base mostrar que ela paga sozinha.

## Incluído

- a linha de base medida, por comando e por peça pesada;
- a leitura declarada nas operações que a peça pesada usa, conferida;
- o cache por passo com a impressão digital, o estado entre comandos e o modo conferido;
- o uso do cache na bancada e no `descrever`;
- a prova no acervo inteiro: malha idêntica com e sem cache;
- o tempo do laço antes e depois na bicicleta e no carro, no banco de provas.

## Excluído

- mudar o resultado de qualquer operação;
- o paralelismo, salvo pela exceção acima;
- a captura da bancada sem placa de vídeo, que é do ambiente.

## Gate de saída

1. A malha de toda receita do acervo é idêntica com e sem cache, pelo modo conferido, por teste.
2. Mudar o último passo de uma receita refaz só ele e os que dependem dele, por teste que conta os passos executados.
3. O laço medido (gerar, capturar, medir) cai em pelo menos metade na bicicleta e no quarto traseiro do carro, mediana de três, mesma máquina.
4. O cache nunca serve estado de outra versão do núcleo nem de outra receita: a impressão digital inclui a versão do código do núcleo, por teste.

## Fatias

1. Linha de base, com a decisão de onde o cache rende mais.
2. Leitura declarada nas operações da linha de base, conferida.
3. O cache e o modo conferido, com o acervo idêntico.
4. Uso na bancada e no `descrever`, com o tempo do laço medido.
5. Documentação e fechamento.

## Riscos e parada

Se a linha de base mostrar que a execução não é a maior fatia do tempo do laço (a conferência de contato e a captura já foram medidas como grandes no furgão), o plano volta à pessoa com a medida antes da fatia 2. Se o cache servir um estado errado uma vez no acervo, ele fica desligado até a causa ser corrigida e provada.

## Fechamento

A preencher.

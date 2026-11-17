# Cache por passo da receita: refazer só o que mudou, entre comandos, medido no laço de modelagem

**Estado:** ativo

**Território:** `procedural/nucleo/planejador/`, `procedural/nucleo/nucleo.js`, `tools/modelar/descrever-peca.mjs`, `src/bancada/carregar-peca.js`, `docs/modelar/banco-de-provas/cache-por-passo-2026-11-16/`; e, por empréstimo pedido por quem conduz em 2026-11-17 (nenhum plano ativo o tem), `procedural/nucleo/memoria-de-pura.js` e o teste dele, só para a chave exata distinguir o buraco de uma lista; e, por empréstimo do plano de comparar com a referência pedido por quem conduz em 2026-11-17, tools/modelar/olhar-bancada.mjs só para ligar o cache (sem crase, para não sobrepor os territórios); o `descrever-peca.mjs` foi emprestado em 2026-11-17, por decisão da pessoa, ao plano de comparar com a referência só para a opção recusas, um ramo logo depois de executar a receita

Ativado em 2026-11-16 no fechamento do cordão de solda, como a pessoa decidiu. O plano do reflexo fechou, e `src/bancada/carregar-peca.js`, onde a página da bancada executa a receita, entrou no território em 2026-11-17 para a fatia 4. `tools/modelar/olhar-bancada.mjs`, onde a captura usaria o cache, é do plano de comparar com a referência, e foi emprestado a este em 2026-11-17, por quem conduz, só para ligar o cache.

**Responsável:** a IA da sessão implementa e mede; a pessoa decide o que fazer se o ganho não pagar a complexidade.

**Repositório e base:** `warbookbr/nos-modelar`, main na ativação.

Sucessor do plano do [cordão de solda](../decisoes/PLANOS-ENCERRADOS.md), decidido pela pessoa em 2026-11-16: os dois mudam o núcleo, e este é ativado no fechamento daquele. Continua o [planejador de execução](../decisoes/PLANOS-ENCERRADOS.md), concluído em 2026-11-14, que levou o furgão realista de 118 s para 47 s com o rastreio declarado e mandou o cache por passo e a execução paralela para o backlog.

## Problema observado

Todo comando que olha uma peça (bancada, descrever, guardas, varreduras, testes) gera a receita do zero, passo a passo, mesmo quando só o último passo mudou. No laço de modelagem isso se repete a cada ajuste: na sessão de 2026-11-13 a 2026-11-16 a captura da zebra do quarto traseiro do carro levou 1 min 26 s, a varredura das juntas da bicicleta gerou a bicicleta inteira 27 vezes, e os agentes passaram boa parte do tempo esperando comando. O backlog registra o que falta para o cache: a leitura declarada nos manifestos (0 de 6.611 passos que leem a malha a declaram, medido em `procedural/nucleo/planejador/leitura-escrita.js`), sem a qual não se sabe que passo depende de qual.

## Resultado

Um comando repetido sobre a mesma receita com um passo mudado refaz só esse passo e os que vêm depois dele, recomeçando do estado guardado logo antes, com a malha idêntica bit a bit à da execução completa, e o tempo medido do laço (gerar, capturar, medir) cai em pelo menos metade na bicicleta e no quarto traseiro do carro.

## Filtro Agent-First

Linha de base: MEDIR antes de tudo, por peça pesada (bicicleta, carro, furgão realista, braço), quanto do tempo de cada comando é execução da receita, captura, conferência de contato e descrição, para o cache mirar no que custa.

Leitura declarada: DECLARAR o que as operações da linha de base leem, conferido contra a leitura real; desde a revisão da fatia 2 ela é diagnóstico e medida, e não governa o cache.

Cache: CRIAR no planejador o cache por prefixo entre comandos: o estado depois do passo k guardado em disco, fora do repositório, sob a chave do conteúdo dos passos 0 a k e da versão do código do núcleo, e a edição no passo j recomeçando do último estado guardado antes de j, com o modo conferido que refaz tudo e compara bit a bit.

Execução paralela das partes independentes: ADIAR para depois do cache, como o backlog diz, salvo se a linha de base mostrar que ela paga sozinha.

## Incluído

- a linha de base medida, por comando e por peça pesada;
- a leitura declarada nas operações que a peça pesada usa, conferida;
- o cache por prefixo com a chave pelo conteúdo e a versão do núcleo, o estado entre comandos e o modo conferido;
- o uso do cache na bancada e no `descrever`;
- a prova no acervo inteiro: malha idêntica com e sem cache;
- o tempo do laço antes e depois na bicicleta e no carro, no banco de provas.

## Excluído

- mudar o resultado de qualquer operação;
- o paralelismo, salvo pela exceção acima;
- a captura da bancada sem placa de vídeo, que é do ambiente.

## Gate de saída

1. A malha de toda receita do acervo é idêntica com e sem cache, pelo modo conferido, por teste.
2. Mudar um passo de uma receita refaz só ele e os que vêm depois dele quando o passo anterior é ponto guardado. Com a escolha pelo custo, viram ponto o passo que leva ao menos o limiar, os dois últimos passos e o passo antes do primeiro que mudou desde a execução anterior, de modo que mudar o último refaz só ele e a segunda edição no mesmo passo refaz só ele e os seguintes, numa receita de oito passos, por teste que conta os passos executados.
3. O laço medido (gerar, capturar, medir) cai em pelo menos metade na bicicleta, mediana de três, mesma máquina; no quarto traseiro do carro, cuja execução varia 50 % entre execuções iguais pela `subdivisao`, a queda se mede pelos passos executados no laço, contados como no gate 2.
4. O cache nunca serve estado de outra versão do código nem de outro ambiente: a chave inclui a versão do código (o núcleo, as extensões do registro, os pacotes que eles importam e o Node) e a Manifold carregada ou não, e o ponto de outra receita só serve quando o prefixo é o mesmo, por teste.

## Fatias

1. Linha de base, com a decisão de onde o cache rende mais. Feita em 2026-11-17, na [pasta do plano](../banco-de-provas/cache-por-passo-2026-11-16/README.md), pelo `medir-linha-de-base.mjs`, com a carga, o roubo de CPU e uma calibração ao lado de cada medida. A execução da receita é de 65 % a 94 % do laço depois de uma edição (`descrever` e uma captura): 39,8 s de 56,5 s na bicicleta, 385 s de 411 s no quarto traseiro do carro e 147 s de 227 s no furgão realista, medianas de três; o braço não é peça pesada (as treze partes executam em 11 s somadas), e a parada do plano não vale. Em todo laço a mesma receita é executada três vezes, no `descrever`, que não lê o cache da receita inteira, na ativação da captura, que o lê, e na página da bancada, que nunca o lê, e o que mais rende é executar uma vez por edição: o laço da bicicleta iria a uns 29 s e o do carro a uns 170 s, abaixo da metade do gate 3. Depois disso, o cache por passo rende na bicicleta e no carro com pontos logo depois das operações caras (as uniões do quadro, a subdivisão da chapa), que é a memória de execução que o núcleo já tem num processo, gravada em disco com a versão do núcleo na chave; no furgão, em que o prefixo ainda refaz metade da execução, o ganho depende da leitura declarada. A decisão, tomada em 2026-11-17: primeiro a receita passa a ser executada uma vez por edição (o `descrever` lê e grava o cache da receita inteira, e a página da bancada, em `src/bancada/carregar-peca.js`, recebe o estado executado em vez de executar o módulo, na fatia 4), e só depois vem o cache por passo em disco, que grava os pontos da memória de execução entre comandos com a versão do código do núcleo na chave.
2. Leitura declarada nas operações da linha de base, conferida. Feita em 2026-11-17, na [pasta do plano](../banco-de-provas/cache-por-passo-2026-11-16/README.md#fatia-2-a-leitura-declarada-conferida): o núcleo ganhou o registro de leitura por passo, desligado por padrão, e a declaração das nove operações está em `procedural/nucleo/planejador/leitura-declarada.js`, conferida nas 121 receitas do acervo. As primitivas (`lathe`, `extrusao`, `subdivisao`) não leem a malha que existia, o `friso` lê só a costura citada, o `subtrair` lê os vértices citados e varre as faces, e `unir`, `aberturaPorContorno`, `limparLascas` e `arredondarAresta` varrem a malha. Como as operações caras são as que varrem, a dependência por leitura rende pouco além do prefixo enquanto elas não forem estreitadas, o que muda `procedural/nucleo/operacoes/`, fora do território: a decisão de estreitá-las é da pessoa, e a da abertura por contorno inclui o raio da peça inteira, que hoje entra na conta do vão. A revisão adversarial da fatia 2 (2026-11-17) mostrou que a declaração não serve para pular passos, e quem conduz decidiu que ela não governa o cache: fica como diagnóstico e medida. As lacunas são cinco. A `subdivisao` lê `st.pontosDaGaiola`, que uma `subdivisao` anterior deixou, e a saída de uma segunda subdivisão muda quando só a primeira muda, com a leitura declarada 'nada'. O `friso` lê os próprios argumentos e `st.superficiesDosFrisos`, que outro passo guardou, e a mesma malha com outros nomes de ponto muda o friso. A leitura de uma entrada ausente (o `get` e o `has` de uma face que um passo anterior apagou) some do resumo, como a deleção some do lado da escrita, na procedência. O planejador não vê o que o `friso` cita (`costura.de` não está nos campos de referência, e o manifesto o dá como criador). A seleção ausente (`sel` nulo) resolve a peça inteira sem marcar a leitura como dinâmica. As três primeiras são testes de edição em `procedural/nucleo/planejador/cache-por-prefixo.test.mjs`, e as três últimas estão no backlog.
3. O cache por prefixo em disco e o modo conferido, com o acervo idêntico. Feita em 2026-11-17, na [pasta do plano](../banco-de-provas/cache-por-passo-2026-11-16/README.md#a-revisão-da-fatia-2-e-a-fatia-3-o-cache-por-prefixo): a memória em armazém (`procedural/nucleo/planejador/memoria-em-armazem.js`) guarda o estado depois do passo sob a chave do prefixo, com a versão do núcleo no nome e dentro do ponto, por um armazém e uma serialização que o host dá, e o modo conferido da memória roda de novo inteira a execução que recomeçou e recusa a divergência. Os gates 1, 2 e 4 têm teste: a edição do último passo executa só ele, o estado de outra versão não é servido e, no CI, o exemplo de cada operação e sete peças baratas que cobrem as operações do acervo dão o mesmo neutro recomeçando do passo do meio (24 s). A prova do gate 1 é a varredura das 121 receitas, `CACHE_ACERVO_INTEIRO=1 npx vitest run procedural/nucleo/planejador/cache-por-prefixo-acervo.test.mjs`, rodada em 2026-11-17 e registrada na pasta do plano: o mesmo neutro nas 121, em 709 a 767 s, e de novo em 676 s com as correções da revisão (`558350aa`). A revisão adversarial do cache (2026-11-17) pediu quatro correções, feitas com teste em `cache-por-prefixo.test.mjs`: o processo sem a Manifold não guarda ponto depois do passo que gritou por ela e a disponibilidade dela entra na chave, e o modo conferido apaga o ponto recusado e os que a execução recusada guardou depois dele; a versão do código (`procedural/nucleo/planejador/versao-do-codigo.mjs`) cobre o núcleo, as extensões do registro, os pacotes que eles importam e o Node; a chave do prefixo (`chave-do-prefixo.js`) distingue o buraco de uma lista do valor indefinido; e os pontos da memória em armazém são escolhidos pelo custo (o passo que leva ao menos `limiarDeCustoMs`, os dois últimos e o anterior à divergência), com `maximo` validado, o índice trancado quando o armazém sabe trancar e o estado lido copiado salvo quando o desserializador já devolve cópia. Fica para a fatia 4 o armazém em disco no host, com a versão de `versaoDoCodigoNoDisco`, a gravação atômica e a trava entre processos, a limpeza dos pontos de versões velhas e a medida do limiar de custo no laço.
4. Uso na bancada e no `descrever`, com o tempo do laço medido. Em curso: o `descrever` liga o cache por prefixo em disco desde 2026-11-17 ([pasta do plano](../banco-de-provas/cache-por-passo-2026-11-16/README.md#fatia-4-primeira-parte-o-descrever-com-o-cache-por-prefixo-e-a-medida-do-laço)), e o `descrever` depois de uma edição no fim foi de 26,4 s a 8,5 s na bicicleta e de 153 s a 13 s no quarto traseiro (0 dos 10 passos executados). O laço cai 20 % e 31 %, porque a captura ainda executa a receita na ativação e na página; tirá-las pede no território `tools/modelar/entrada-de-medida.mjs`, `tools/modelar/ativar-bancada.mjs` e `src/bancada/sessao/carregar-sessao.js`, e a decisão é de quem conduz.
5. Documentação e fechamento.

## Riscos e parada

Se a linha de base mostrar que a execução não é a maior fatia do tempo do laço (a conferência de contato e a captura já foram medidas como grandes no furgão), o plano volta à pessoa com a medida antes da fatia 2. Se o cache servir um estado errado uma vez no acervo, ele fica desligado até a causa ser corrigida e provada.

## Fechamento

A preencher.

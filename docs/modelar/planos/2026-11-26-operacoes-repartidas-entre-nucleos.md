# Operações repartidas entre núcleos: o corte das aberturas, a subtração e a divisão usando mais de um núcleo, com a mesma malha

**Estado:** ativo

**Núcleo:** sim

**Território:** `docs/modelar/banco-de-provas/operacoes-repartidas-2026-11-26/`, `procedural/nucleo/operacoes/abertura-por-contorno.js`, `procedural/nucleo/operacoes/abertura-por-contorno.test.ts`, `procedural/nucleo/operacoes/abertura-por-contorno-simetria.test.ts`, `procedural/nucleo/operacoes/abertura-por-contorno-guarda.test.ts`, `procedural/nucleo/operacoes/abertura-por-contorno-guarda-chapa-mudada.test.ts`, `procedural/nucleo/operacoes/abertura-por-contorno-guarda-conferida.test.ts`, `tools/fixtures/corte-das-aberturas/`. O arquivo das booleanas do núcleo é do plano do resgate dos ramos antigos; se a repartição precisar mudá-la, é empréstimo pedido a esse plano.

Ativado pela pessoa em 2026-11-26 ("ativar o plano de repartir as operações mais caras entre os núcleos, começando pelo corte das aberturas e pode prosseguir").


**Responsável:** a IA da sessão mede e propõe; a pessoa ativa o plano e decide pelas medidas da fatia 1.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-26.

Nasceu da decisão da pessoa em 2026-11-26 no plano da [execução paralela](../decisoes/PLANOS-ENCERRADOS.md), que mediu que uma receita não ganha nada rodando passos lado a lado: cada passo pesado depende do anterior, e o tempo está dentro de poucas operações.

## Problema observado

A lataria do `carro-fastback` leva 55 s, dos quais 29 s no corte das aberturas (`aberturaPorContorno`), 14 s na subtração dos vãos (`subtrair`) e 8 s na divisão por contorno (`divisaoPorContorno`). No furgão realista o corte das aberturas é 23 s de 47 s. Cada uma dessas operações roda num núcleo só, e a máquina de quatro núcleos fica com três parados enquanto quem modela espera.

## Resultado

As operações mais caras repartem o trabalho entre os processos da máquina (`processosDaMaquina`) e dão a mesma malha, byte a byte na impressão do neutro, que a execução num núcleo só, com o tempo medido no carro e no furgão.

## Incluído

- a medida de onde vai o tempo dentro do corte das aberturas, na lataria do carro e no furgão, pelo perfil de CPU do Node;
- a repartição da parte cara entre fios (`worker_threads`), com o número de fios de `processosDaMaquina()` e um fio só quando a malha é pequena, e a junção dos pedaços em ordem fixa;
- a igualdade da malha, pela impressão do neutro canônico, em todas as peças do acervo que usam a operação, com 1, 2 e 4 fios.

## Excluído

- a placa de vídeo;
- mudar a forma de qualquer peça ou a ordem dos passos de receita.

## Invariantes

A malha de toda peça do acervo sai igual, byte a byte na impressão do neutro canônico, com qualquer número de fios. O núcleo não ganha nome de objeto, e a operação sem fios (um só) continua sendo o caminho de hoje.

## Gate de saída

1. A medida da fatia 1 no banco de provas, com o comando que a reproduz.
2. A igualdade da malha, pela impressão do neutro canônico, em todas as peças do acervo que usam o corte das aberturas, antes e depois, e o teste de que a grade guardada se refaz quando a chapa muda.
3. O tempo da lataria do carro e do furgão antes e depois.
4. Revisão adversarial sem bloqueio; `npm run gates` verde e o CI verde.

## Fatias

1. Medir onde vai o tempo dentro do corte das aberturas (achar as faces que se cruzam, cortar cada face, costurar o resultado), e quanto custa mandar a malha para outro fio (`worker_threads` com memória compartilhada) contra o tempo da parte que se reparte, para a pessoa decidir se segue.
2. O corte das aberturas sem as varreduras da chapa inteira: a grade do classificador de parede montada uma vez por chapa e reaproveitada entre os cortes enquanto a chapa não muda, e as faces próximas ao prisma achadas por ela, com a igualdade da malha em todo o acervo e o tempo antes e depois.
3. As varreduras da booleana (os vértices soltos achados pelas faces que ela tocou, as chaves por aresta numéricas, a conferência dos triângulos novos por grade), por empréstimo do arquivo das booleanas pedido ao plano do resgate dos ramos antigos, ou depois do fechamento dele; e o fechamento.

## Decisão da pessoa

Decidido pela pessoa em 2026-11-26 ("pode seguir com suas recomendações"), depois da fatia 1, que mediu a conta geométrica em menos de 10% do tempo do corte das aberturas e o resto em varreduras da chapa ou da peça inteira repetidas a cada corte: o plano troca a repartição entre fios pela retirada dessas varreduras, com a mesma malha enquanto toda operação declarar completa a escrita que faz (a revisão da fatia 2 mostrou que o índice guardado depende disso, e a leitura conferida recusa a divergência), e começa pelo que é do próprio corte (fatia 2), deixando a booleana para o empréstimo ou para depois do plano do resgate. `procedural/nucleo/fios-da-operacao.js` fica sem uso e sai do território no fechamento.

## Andamento

A fatia 2 foi feita em 2026-11-26, com duas revisões adversariais sem bloqueio e as correções delas: o furgão caiu de 56,2 s para 43,9 s com a mesma malha nas três peças que usam o corte das aberturas ([banco de provas](../banco-de-provas/operacoes-repartidas-2026-11-26/README.md)).

## Riscos e parada

A repartição só vale se o resultado for o mesmo em qualquer número de processos: a ordem em que os pedaços se juntam é fixa pelo índice da face, nunca pela ordem em que os fios terminam. Se a igualdade falhar em alguma peça do acervo, a fatia para e volta à pessoa com a peça. A placa de vídeo fica fora, pela mesma razão.

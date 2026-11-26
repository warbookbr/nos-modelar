# Laço de modelagem mais rápido: a rodada mede, mostra e registra em minutos, com a decisão da pessoa gravada

**Estado:** ativo

**Núcleo:** não

**Território:** `tools/modelar/dobra-da-superficie.mjs`, `tools/modelar/vinco-oculto.mjs`, `tools/modelar/rodada-de-modelagem.mjs`, `tools/modelar/rodada-de-modelagem.test.mjs`, `tools/modelar/dobra-da-superficie.test.mjs`, `src/autoria/laco-de-modelagem.js`, `src/autoria/laco-de-modelagem.test.js`, `tools/modelar/calibracao-do-critico.mjs`, `tools/modelar/calibracao-do-critico.test.mjs`, `tools/modelar/navegador.mjs`, `.claude/skills/laco-de-modelagem/`, `docs/modelar/banco-de-provas/laco-mais-rapido-2026-11-26/`. A bancada aquecida e o pacote menor do crítico mudam a bancada e as vistas para crítica, que são do plano do resgate dos ramos antigos: essas duas partes são empréstimo pedido a esse plano, ou esperam o fechamento dele.

Ativado pela pessoa em 2026-11-26, com as recomendações 5 e 10 da análise do projeto ("1 a 10 aprovadas").

**Responsável:** a IA da sessão implementa e mede; a pessoa decide o conjunto padrão de imagens do crítico.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-26.

## Problema observado

Uma vista da bancada leva 15 s porque cada comando sobe o Vite e o Chromium de novo; a ação da rodada leva 105 s com o cache quente, 76 deles na dobra e no vinco oculto, que estão fora do cache por passo; o pacote do crítico da lataria levou 9 min 54 s com 57 imagens (banco de provas da análise do projeto, `ferramentas.md`). As 150 rodadas registradas não têm campo para a decisão da pessoa, e as doze imagens de calibração do crítico são do desenhista aposentado em 05/11 (`processo.md`). A skill do laço tem 3.645 palavras sem orçamento (`documentacao.md`).

## Resultado

A dobra e o vinco oculto pelo cache por passo; a bancada aquecida entre comandos; o pacote do crítico com um conjunto padrão de umas dez imagens mais as partes que mudaram; a decisão da pessoa num campo da rodada, ao lado do veredito do crítico; a calibração do crítico refeita com capturas da bancada de hoje; e a skill do laço com o ciclo e o registro no corpo e o resto em arquivos de apoio.

## Excluído

- mudar o que o crítico julga ou o brief dele; `.claude/agents/critico-visual.md` não muda.

## Invariantes

A medida pelo cache sai igual à execução direta; a calibração nova prende o hash como hoje; nenhuma rodada registrada muda.

## Gate de saída

1. A ação da rodada da lataria com o tempo antes e depois, e a mesma medida.
2. A vista da bancada aquecida com o tempo antes e depois.
3. O pacote do crítico com o conjunto padrão aprovado pela pessoa e o tempo antes e depois.
4. O campo da decisão da pessoa com teste da recusa sem as palavras dela, e a calibração nova passando no gate.
5. `npm run gates` verde e o CI verde.

## Fatias

1. A dobra e o vinco pelo cache, e o campo da decisão da pessoa.
2. A calibração do crítico com capturas da bancada, e a skill do laço repartida.
3. A bancada aquecida e o pacote menor do crítico (empréstimo do resgate), e o fechamento.

## Riscos e parada

Se a bancada aquecida der imagem diferente da bancada fria na mesma câmera, ela para e volta à pessoa com as duas imagens.

## Decisão da pessoa

Decidido pela pessoa em 2026-11-26 ("1, 2, 3, 4 sim"), depois da etapa A da calibração do crítico: a calibração passa a medir o crítico com o pedido da rodada (o `pedido.md` do `vistas:critica`) e as capturas da bancada; as duas imagens que vêm de esboços que saíram são trocadas por duas peças do acervo em que a pessoa já reprovou defeito parecido numa rodada; os julgamentos são refeitos, de propósito e por comando, nunca sozinhos (a conferência automática só avisa quando o crítico roda num modelo diferente do medido, porque um usuário com outro modelo não pode disparar dezenas de despachos sem saber); a regra de acerto pode ser ajustada sobre as imagens novas; e o nome antigo do projeto na definição do crítico é corrigido na mesma medição, o único caso em que `.claude/agents/critico-visual.md` muda.

Decidido pela pessoa em 2026-11-26 ("Sim, pode guardar"): a decisão da pessoa sobre uma rodada fica num arquivo ao lado das rodadas, gravado depois da rodada, quando ela vê a peça, com a mesma regra do formato e das palavras dela, sem reescrever o registro da rodada.

## Andamento

Em 2026-11-26 a fatia 1 remediu antes de mexer: a ação da rodada da lataria do carro leva 29,9 s com o cache quente, e não os 105 s de 18/11 (a receita mudou e o ajuste da gaiola ficou esparso em 22/11), com a dobra e o vinco em cerca de 3 s. Com eles pela execução guardada, a ação cai para 27 a 29 s, e as duas linhas de comando caem de 68 s e 64 s para 2,7 s e 2,8 s, com a saída igual byte a byte na lataria e em cinco peças pequenas. A decisão da pessoa sobre cada rodada passou a um arquivo ao lado das rodadas (`rodadas/decisoes-da-pessoa.json`), gravado por `--decisao-da-pessoa ... --rodada <n>` depois da rodada, e a ferramenta das rodadas ganhou o `--ajuda`. A revisão adversarial bloqueou porque a recusa do formato errado trazia um comando pronto com palavras de aprovação inventadas e porque um teste escrevia na pasta real de rodadas; as correções tiraram todo texto pronto das recusas e da ajuda (com um teste que reprova qualquer um), puseram os testes da linha de comando numa pasta temporária e fecharam a leitura do arquivo, a data e o texto, com 52 mutantes mortos. A skill do laço foi repartida: o corpo caiu de 3.645 para 1.503 palavras, com o ciclo, o registro e o passo novo de gravar a decisão da pessoa depois de mostrar a peça, e o processo leve, o trabalho parte por parte, o pacote e a referência, o refino e o registro à mão foram, sem corte, para cinco arquivos de apoio; os três roteiros do processo leve leem só o apoio dele (291 palavras). O tempo que sobra na ação está na medida das partes e nas formas e na referência dentro do `descrever`, fora deste território ([banco de provas](../banco-de-provas/laco-mais-rapido-2026-11-26/README.md)).

## Fechamento

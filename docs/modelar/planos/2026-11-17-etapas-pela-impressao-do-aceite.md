# Etapas pela impressão do aceite: o estado de cada etapa sai da comparação do medido agora com o que a pessoa aprovou

**Estado:** concluído

**Território:** `src/autoria/etapas-de-construcao.js`, `src/autoria/etapas-pela-impressao.js`, `tools/modelar/custo-por-peca.mjs`, `tools/modelar/fluxo-do-objeto.mjs`, `tools/modelar/objeto.mjs`, `tools/modelar/rodada-de-modelagem.mjs`, `tools/modelar/vistas-de-superficie.mjs`, `tools/modelar/vistas-para-critica.mjs`, `tools/modelar/guardas/guarda-acervo.mjs` (os consumidores do estado das etapas, acrescentados na fatia 2), `tools/modelar/etapas-da-montagem.mjs`, `tools/modelar/etapas-da-montagem.test.mjs`, `tools/modelar/etapas-de-construcao.test.mjs`, `tools/modelar/etapas-reabrir-braco.test.mjs`, `tools/modelar/guardas/etapas-do-acervo.test.mjs`, `procedural/pecas/aviao/montagem.etapas.json`, `procedural/pecas/braco-robotico/montagem.etapas.json`, `procedural/pecas/carrinho-de-mao/montagem.etapas.json`, `procedural/pecas/empilhadeira/montagem.etapas.json`, `procedural/pecas/sedan-chassi-e-lataria/montagem.etapas.json`, `docs/modelar/usar/MONTAGENS-SEMANTICAS.md`, `docs/modelar/banco-de-provas/etapas-pela-impressao-2026-11-17/`; o comando de migração é o arquivo novo `tools/modelar/migrar-etapas-para-impressao.mjs`, com o filho `tools/modelar/medir-arvore-para-migracao.mjs` e o teste `tools/modelar/migrar-etapas-para-impressao.test.mjs`, e `src/autoria/etapas-pela-impressao.js` e `tools/modelar/etapas-consumidores-v3.test.mjs` já eram do plano desde a fatia 1 e 2, a conferência da guarda e a lista travada dos eventos migrados (`tools/modelar/guardas/etapas-do-acervo.mjs` e `etapas-do-acervo.migradas.json`) e a nota na skill `.claude/skills/laco-de-modelagem/SKILL.md` entram neste território (o plano dono da skill, a leitura por partes, está congelado e não segura território).

**Responsável:** a IA da sessão implementa e conduz a revisão adversarial; Tiago decidiu escrever o plano e pô-lo antes do robô humanoide na fila, e decidiu a regra do desfazer (abaixo), em 2026-11-17.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-17 (60c159c4 e o fechamento do plano de comparar), ativado em 2026-11-17 depois do fechamento da família de componentes eletrônicos, que levou a reabertura de etapas da forma atual com três limitações escritas.

## Problema observado

A reabertura de uma etapa fixa mantendo as posteriores provadas passou por cinco rodadas de revisão adversarial na família de componentes eletrônicos, e cada correção pontual abriu um caso novo: a reabertura que descartava as portas do aceite, a prova vazia sem junta, a quebrada que voltava a aberta sozinha, a etapa nova numa porta não guardada, a etapa sem geometria lida como desconhecida e as juntas do aceite mantidas que se comparavam consigo mesmas. Os ataques estão no registro da família (pasta de provas dos componentes eletrônicos). O estudo de 2026-11-17 achou a causa no modelo do registro: a referência do que a pessoa aprovou mora em seis lugares que se regravam a cada comando (`forma`, `portas` e `juntas` da etapa, `portas` e `juntasDasPosteriores` da reabertura, e o próprio registro anterior), o estado gravado é entrada da leitura seguinte, o aceite de uma etapa depende de porta guardada no registro de outra, e a ausência de campo é lida como "não mudou". O espaço de ataque é a sequência de comandos vezes os dois formatos de registro vezes a receita vazia, e não fecha por enumeração.

## Resultado

O registro guarda só fatos imutáveis, os aceites e as reaberturas, e o estado de cada etapa é função pura do registro e do medido agora: fixa quando a impressão de agora é igual à do aceite vigente, quebrada quando difere (com a diferença como motivo), não conferível quando não há geometria para medir, e aberta sem aceite vigente.

A impressão do aceite guarda, em valores e não em hash, o que a pessoa aprovou: o hash da forma, os parâmetros derivados e a pose da instância, a medida de cada junta da etapa, a interface de cada porta de etapa anterior que ela cita (por relação, vínculo ou posição), vista do lado de quem cita, e a ordem das anteriores. Reabrir é um evento acrescentado, com quem, data e motivo.

Regra decidida pela pessoa em 2026-11-17: a etapa quebrada cuja mudança é desfeita, ficando o medido igual ao aprovado, volta a fixa sozinha; quebrada só vira aberta por reabertura explícita.

## Filtro Agent-First

A leitura e os comandos `--fixar` e `--reabrir` de `etapas-da-montagem` são USAR DIRETO e mudam por dentro sem mudar de nome; a migração é ENVOLVER, um comando com relatório por etapa; `conferirPosteriores`, `abalarPelasPortas`, `portasDeReferencia`, `juntasDasPosteriores` e a leitura do registro v1 saem (REFATORAR), porque o modelo novo não precisa deles.

## Incluído

- a função de impressão e a leitura pura, com os ataques das cinco revisões convertidos em testes permanentes com `expect`, nos dois sentidos (o que deve quebrar quebra, o que não mudou segue fixo);
- `fixar` e `reabrir` só acrescentando eventos, e os consumidores que leem o estado gravado passando pela leitura;
- a migração dos cinco registros do acervo (52 etapas fixas) sem novo aceite: pela reconstrução no commit que gravou cada aceite, com o hash da forma como contraprova, e, onde o commit não reproduz a forma, pela impressão de agora marcada `origem: migração`, com a condição de a forma de agora ser a do aceite;
- o contrato em `MONTAGENS-SEMANTICAS.md` e a nota na skill.

## Excluído

- mudança no que a pessoa aprova ou em como aprova;
- a placa de controle e a tampa da base do braço, que fecham no plano da família com a ferramenta atual.

## Gate de saída

1. Os ataques das cinco revisões passam como testes nos dois sentidos, e um teste de propriedade mostra que nenhuma sequência de leituras e de comandos sobre outras etapas muda a impressão de um aceite.
2. A guarda do acervo devolve as 52 etapas fixas depois da migração, com a origem de cada impressão listada.
3. Não sobra no código leitura de "registro sem portas" nem estado gravado usado como entrada.
4. Revisão adversarial sem bloqueio.

## Fatias

1. Impressão e leitura pura, com a tabela de ataques como testes. Feita em 2026-11-17, na [pasta do plano](../banco-de-provas/etapas-pela-impressao-2026-11-17/README.md): `src/autoria/etapas-pela-impressao.js` guarda eventos imutáveis (versão 3) e lê o estado de cada etapa pela comparação da impressão de agora com a do aceite vigente, e `medirAgora` monta o medido da montagem resolvida; os ataques A1 a E8 e a propriedade das sequências estão em `etapas-da-montagem.test.mjs`, e no braço do acervo, medido à mão, o deslocamento de 30 mm da junta do ombro quebra o braço e as nove seguintes e o desfazer as devolve fixas. `fixar` e `reabrir` ainda usam o caminho antigo.
2. A ferramenta e os consumidores. Feita em 2026-11-17, na [pasta do plano](../banco-de-provas/etapas-pela-impressao-2026-11-17/README.md#fatia-2-a-ferramenta-e-os-consumidores): `fixar` e `reabrir` só acrescentam eventos ao registro v3 e os consumidores do estado passam pela leitura; o registro v1 e v2 segue lido pelo caminho antigo, escolhido só pela versão do registro, com aviso, até a migração da fatia 3.
3. A migração do acervo, com relatório por etapa. Feita em 2026-11-17, na [pasta do plano](../banco-de-provas/etapas-pela-impressao-2026-11-17/README.md#fatia-3-a-migração-em-ensaio): das 52 etapas fixas, 43 migraram pela história do commit do aceite (via a), 9 pela impressão de agora (via b, as oito do avião e o anel da cintura do braço; só o anel cita porta e leva a porta não provada) e nenhuma ficou de fora (via c); os cinco registros foram gravados, um commit por montagem, a leitura nova devolve as 52 fixas, a guarda do acervo lê pela impressão e lista a origem de cada uma, e o caminho antigo (inclusive o registro v1 e v2) saiu do código, que recusa o registro antigo com a mensagem que manda rodar a migração.
4. Contrato, skill e fechamento. Feita em 2026-11-17: o contrato está em `MONTAGENS-SEMANTICAS.md` (o registro de eventos, a leitura derivada, a regra do desfazer, a migração e os limites) e a nota na skill `laco-de-modelagem`.

## Riscos e parada

A impressão sensível demais quebraria as 52 etapas a cada mudança mínima do motor; a comparação usa a tolerância de 12 algarismos que o código já usa, e se a migração não reproduzir a forma em mais da metade das etapas o plano para e volta à pessoa. A porta de dentro de submontagem pode não ser exposta no mundo pelo resolvedor; se não for, ela fica fora da impressão com aviso, e não se inventa leitura.

## Fechamento

Concluído em 2026-11-17, com as quatro fatias e a revisão adversarial de cada uma. A prova de cada item do gate de saída, com as provas completas na pasta `docs/modelar/banco-de-provas/etapas-pela-impressao-2026-11-17/`:

1. Os ataques das cinco revisões (A1 a E8) são testes com `expect` nos dois sentidos em `tools/modelar/etapas-da-montagem.test.mjs`, contra a leitura nova, e a propriedade (40 comandos aleatórios sobre outras etapas, com leituras no meio, em dois medidos, não mudam o aceite nem o estado de uma etapa) está no mesmo arquivo; 16 mutações que sobreviviam à primeira revisão ganharam `expect`. A tabela ataque por resultado está no README da pasta.
2. A guarda do acervo (`tools/modelar/guardas/etapas-do-acervo.test.mjs`) devolve as 52 etapas fixas (o plano dizia 51) depois da migração, 43 pela história do commit do aceite e 9 pela impressão de agora (as oito do avião e o anel da cintura do braço, que é a única com porta não provada), com a origem de cada impressão na mensagem; a lista dos eventos migrados é travada por hash em `etapas-do-acervo.migradas.json`, e as duas forjas dos revisores e o aceite órfão reprovam.
3. O código não lê registro sem portas nem usa estado gravado como entrada: `atualizarRegistro`, `fixarEtapa`, `reabrirEtapa`, `conferirPosteriores`, `abalarPelasPortas`, `portasDeReferencia`, `juntasDasPosteriores` e a leitura do v1 saíram, o registro v1 e v2 recusa em todo comando com a mensagem que manda rodar a migração, e os consumidores leem só o registro medido ou os eventos.
4. Revisão adversarial sem bloqueio: cada fatia foi revista, os bloqueios (a guarda que cobrava aceites anulados por reabertura) e os achados foram corrigidos com teste, e a revisão de confirmação liberou a junção.

Fica de fora, declarado no contrato: a porta do anel da cintura sem prova de aceite, a porta de dentro de submontagem e a expectativa de interseção fora da impressão, e a medição da montagem inteira a cada leitura (o sedã leva uns 200 s).

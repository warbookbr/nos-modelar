# Etapas pela impressão do aceite: provas

Plano: [Etapas pela impressão do aceite](../../planos/2026-11-17-etapas-pela-impressao-do-aceite.md).

## Fatia 1: a impressão e a leitura pura

A fatia acrescentou `src/autoria/etapas-pela-impressao.js`, um módulo ao lado de `etapas-de-construcao.js` que ainda não está no caminho de `fixar` e `reabrir`. O registro é uma lista de eventos imutáveis (aceites e reaberturas, versão 3), e o estado de cada etapa é `lerEtapas(registro, medido)`, uma função pura. A impressão de um aceite guarda em valores o hash da forma, os parâmetros que a montagem derivou, a pose da instância no mundo, a medida de cada junta da etapa, a interface de cada porta de etapa anterior que ela cita (por relação, vínculo ou posição, vista do lado de quem cita) e a ordem das anteriores. A leitura devolve fixa quando a impressão de agora é igual à do aceite vigente (12 algarismos), quebrada com a diferença como motivo, não conferível quando não há geometria e aberta sem aceite vigente. Uma quebrada cuja mudança é desfeita volta a fixa sem evento novo; só a reabertura explícita a faz aberta.

O medido de agora vem de `medirAgora`, em `tools/modelar/etapas-da-montagem.mjs`, que resolve a montagem até a primeira receita sem passos e devolve por etapa a forma, os parâmetros derivados, a pose e as juntas, e as interfaces no mundo das portas citadas. Os ataques das revisões estão em `tools/modelar/etapas-da-montagem.test.mjs`, no bloco "a leitura pela impressão do aceite" (o arquivo novo de teste não está no território do plano), com a propriedade de que 40 comandos aleatórios sobre as outras etapas, com leituras no meio, não mudam o aceite de uma nem o estado dela, em dois medidos (a fixture dos três blocos e uma cadeia de seis etapas à mão). Os ataques A1 a E8 saíram dos arquivos de revisão (`zz-adversario`, `zz-quarta`, `zz-quinta`); o `zz-sexta` não existia, e N1 e N2 não entram.

A medida no braço do acervo, feita à mão e fora dos testes (leva 29 s por medição): `medirAgora` mede as 12 etapas, as 12 se aceitam em memória e a leitura as devolve fixas. Com a porta `juntaDoOmbro` deslocada 30 mm (o A10), o ombro e as duas primeiras seguem fixos, o braço e as nove seguintes quebram, cada uma com a porta citada e a pose como diferença; com o ombro reaberto o resultado é o mesmo, e desfeito o deslocamento todas voltam a fixas.

## A tabela dos ataques

A coluna "antiga hoje" é o que o código ainda em uso faz com o mesmo ataque, medido em 2026-11-17 com os três arquivos de revisão. "Pegou sozinho" diz se algum gate ou teste do repositório antes da revisão teria acusado o caso que a leitura nova trata diferente; nos casos em que a leitura nova trata diferente a resposta é não, porque o único que exercitava o registro era a guarda do acervo, que só confere as 51 etapas fixas sem mudança, e cada caso foi achado por uma revisão adversarial. Agora cada um tem `expect` nos dois sentidos.

| Ataque | Leitura nova | Antiga hoje | Pegou sozinho |
| --- | --- | --- | --- |
| A1, A3, A4, C5: reabrir antes e mudar a porta depois | quebra a posterior pela própria impressão; sem mudança as posteriores seguem fixas; o topo só quebra quando a porta do meio que ele cita andou | quebra, mas o topo vai junto pela cadeia mesmo com o pino do meio parado (A1 com pino 18) | não; só a prova de porta da revisão 1 |
| A5, A9, A6: reabrir sem contexto, repetir, perder o aceite | reabrir é só acrescentar evento; reabrir aberta recusa; os eventos de antes ficam iguais | recusa por falta de contexto; as portas do aceite se regravam | não |
| A2, A7, B5, B6, C3, D4, D6, E2, E3, E4, E6, E7, E8: registro sem portas, prova pela junta vazia, escrita intermediária | deixam de existir: o registro v1 e o v2 recusam, e a impressão sempre traz as portas citadas; os mesmos movimentos de porta quebram a citante | E2, E6, D4 e E8 deixam fixas as etapas que citam a porta movida (lavagem pela junta); E3, E4, E7 recusam | não |
| B1: quebrada gravada por outra reabertura virando aberta | a quebrada segue quebrada, porque o estado não é gravado | segue quebrada (corrigido na revisão 3) | não |
| B2: só a porta da base muda, malha igual | base segue fixa (a malha é a aprovada), meio e topo quebram | as três quebram | não |
| B3: afastamento da posição mudado | meio e topo quebram (a pose do topo andou) | meio quebra, topo segue fixo | não |
| B4, C2, D5: citação nova ou etapa nova | a citação nova vai à impressão da citante e a quebra; a etapa nova no fim não quebra ninguém; a etapa nova no meio muda a ordem das anteriores e quebra as seguintes; aceitar a nova não refixa o meio | B4 e C2 já tratados; em D5 o topo segue fixo e fixar a nova recusa por posterior quebrada | não |
| B7, B8, D2: aceitar quebrada, sem aceite, fora de ordem, sem geometria | recusam com os mesmos códigos (`etapa-quebrada`, `etapa-sem-aceite`, `etapa-fora-de-ordem`, `etapa-sem-geometria`), mesmo com `aceiteHumano` | recusam | sim, pelos testes de recusa existentes |
| A8: ordem trocada | a ordem das anteriores difere e todas quebram; na montagem real o resolvedor recusa antes | o resolvedor recusa | sim, pelo resolvedor |
| C1, E1: caminho completo de reabrir, mudar, refixar e desfazer | refixar na ordem devolve tudo fixo; desfazer a mudança quebra o que foi aceito sobre ela, e refazê-la devolve | igual, mas por regravar portas | não |
| D1, D3, E1b, C4: etapa sem geometria | não conferível (nunca fixa), e as seguintes também; ao voltar, voltam a fixas sem evento | lida como quebrada | não |
| E5: registro v1 | recusa (`registro-antigo`) | lido pelo texto da receita | não |
| A10, C6: braço real | medido à mão, acima; não entra nos testes por levar 29 s | não medido no código antigo | não |

## Decisões desta fatia

A impressão da etapa traz os meios de citação (relação, vínculo, posição) como texto com o id, de modo que renomear uma relação quebra a etapa que a cita; é mais sensível do que o mínimo, e a fatia 3 mede quantas das 51 etapas isso quebra na migração. A etapa depois da primeira receita sem passos não tem geometria na leitura de agora (a montagem se resolve só até ela), então fica não conferível mesmo com a receita própria intacta. A porta de dentro de submontagem não entra na impressão e a leitura devolve um aviso por etapa; nenhum caso da fixture a exercita, e a fatia 3 confere se o braço, o avião e os outros têm alguma.

## Limites declarados da impressão

A porta de dentro de submontagem não entra na impressão (o resolvedor não a expõe no mundo), e na prática é inalcançável: o acervo não tem submontagem nem relação com caminho profundo, e `medirAgora` só publica portas de peça. A leitura mantém o aviso por etapa para o dia em que houver. A expectativa de interseção (`auditoriaIntersecoes`) e o apoio no chão ficam fora da impressão, como já ficavam fora do estado antes: o aceite da etapa não os cobre. A especificação da relação (a folga declarada e a tolerância) entra só pela medida da junta, e não pelo texto dela.

## Revisão adversarial da fatia 1

A revisão não bloqueou e pediu quatro correções, feitas com teste: o aceite acrescentado à mão sem reabertura entre dois aceites, a reabertura antes do aceite e o aceite com junta que não passa recusam (`registro-invalido`), assim como impressão com campo null, de outro tipo ou sobrando e registro de outra montagem; os eventos são cópias congeladas e a leitura devolve o aceite copiado; a poeira abaixo de 1e-12 vale zero antes de comparar; e número não finito recusa a impressão. As 16 mutações que sobreviviam ganharam `expect` (comparação das impressões, interface no mundo e rotação da pose, validação, órfãos, avisos, corte do resumo, ordem das citadas, campos do aceite).

## Fatia 2: a ferramenta e os consumidores

`fixar` e `reabrir` em `tools/modelar/etapas-da-montagem.mjs` só acrescentam eventos ao registro da versão 3 (`acrescentarAceite` e `acrescentarReabertura`); `estadoDasEtapas` devolve a leitura pela impressão do aceite (`leitura`, com o `medido`), e `fixarComLeitura` devolve também a leitura de depois. O `reabrir` do registro novo não mede nada. O `fixar` avisa, sem recusar, das etapas posteriores que seguem quebradas: aceitar a base não refixa o meio, que quebrou pela própria impressão e pede reabertura e novo aceite.

A escolha do caminho é só pela versão do registro: sem registro, ou da versão 3, vale a leitura nova (o primeiro `fixar` num objeto sem registro grava o da versão 3); da versão 1 ou 2 vale o caminho antigo, que grava o estado em cada etapa, e o comando imprime o aviso `AVISO_DO_CAMINHO_ANTIGO`. Não há bandeira de linha de comando. Os cinco registros do acervo seguem na versão 2 até a fatia 3, e nenhum foi tocado.

Os consumidores do estado gravado, e como cada um lia e lê agora:

| Consumidor | Lia | Lê no registro v3 |
| --- | --- | --- |
| `fluxo-do-objeto.mjs` (`lerEtapas`) | `estado` de cada etapa do arquivo | o estado da leitura (`registroComEstado`, que mede a montagem); o v2 como gravado |
| `objeto.mjs` (`estadoDoObjeto`) | `estado` fixa e quebrada para a contagem e a próxima parte | o mesmo, pela leitura, no comando (`estadoDoObjetoMedido`); `estadoDoObjeto` sem a leitura recusa o v3 em vez de contar errado |
| `vistas-de-superficie.mjs` (`etapaFixaDaPeca`) | `estado === 'fixa'` da etapa da peça, para dispensar a luz rasante | `etapaFixaDaPecaMedida` (assíncrona, pela leitura), passada por `latariaDaPeca`, `rodada-de-modelagem` e `vistas-para-critica`; a versão síncrona, sem a medida, responde que não está fixa (o lado que não dispensa nada) |
| `vistas-para-critica.mjs` (`registroDasEtapas`, `etapaFixaDaPeca`) | `estado` de cada instância da peça, para tirar o contorno de peça aprovada | `registroDasEtapasMedido`, o registro com o estado da leitura; `etapaFixaDaPeca` segue pura sobre ele |
| `custo-por-peca.mjs` (`aceitesDasEtapas`) | o `aceite` de cada etapa, não o estado | os aceites vigentes dos eventos (`aceitesVigentes`), sem medir |
| `guardas/guarda-acervo.mjs` e `guarda-referencial.mjs` (`etapaQueEspera`) | `estado` da etapa de uma receita sem passos | o v3 não grava estado, e etapa sem geometria nunca é fixa, então a receita sem passos sempre espera a etapa |
| `guardas/etapas-do-acervo.test.mjs` | `estadoDasEtapas` sobre o registro v2 | igual, pelo caminho antigo, até a fatia 3 |

`receitasDaMontagem`, `montagemAteAGeometria` e `citacoesDasPortas` são usados por `planejado-contra-executado`, `entrada-de-medida`, `manual` e `instalacao-solar` sem tocar no estado. Os testes novos estão no bloco "o registro da versão 3 pelos comandos" de `etapas-da-montagem.test.mjs` (os do caminho antigo começam de um registro v2 vazio, porque sem ele o comando já usa a leitura nova) e, para o braço com um registro v3 construído em memória (reabrir a base acrescenta um evento, as onze seguem fixas, aceitar de novo devolve as doze, sem gravar), em `etapas-reabrir-braco.test.mjs`. O comando de linha em `--fixar` não tem teste de arquivo, porque a fixture usa peças que não estão no acervo; foi rodado à mão numa cópia do `carrinho-de-mao` sem registro (leitura v3, abertas) e com o registro v2 do acervo (aviso do caminho antigo).

## O que fica para a fatia 3

A fatia 3 escreve o comando de migração dos cinco registros do acervo, com a reconstrução por commit e a impressão `origem: migração`, e o relatório por etapa; a guarda do acervo só passa a cobrar impressão depois dela, e o caminho antigo (`atualizarRegistro`, `conferirPosteriores`, `abalarPelasPortas`, `portasDeReferencia`, `juntasDasPosteriores`, a leitura do v1) sai na migração do último registro.

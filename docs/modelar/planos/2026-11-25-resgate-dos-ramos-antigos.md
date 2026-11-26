# Resgate dos ramos antigos: as peças, as ferramentas e o núcleo que nunca entraram na main

**Estado:** ativo

**Território:** `procedural/pecas/alternador/`, `procedural/pecas/radiador/`, `procedural/pecas/turbocompressor/`, `procedural/pecas/disco-de-embreagem/`, `procedural/pecas/junta-do-cabecote/`, `procedural/pecas/amortecedor-dianteiro/`, `procedural/pecas/biela-de-motor/`, `procedural/pecas/disco-de-freio-ventilado/`, `procedural/pecas/filtro-de-oleo/`, `procedural/pecas/pistao-de-motor/`, `procedural/pecas/vela-de-ignicao/`, `procedural/pecas/mesa-de-jantar/`, `procedural/pecas/escrivaninha-com-gaveta/`, `procedural/pecas/mesa-de-centro-oval/`, `procedural/pecas/roda-esportiva/`, `tools/modelar/analise-da-peca.mjs`, `tools/modelar/analise-da-peca.test.mjs`, `tools/modelar/olhar-bancada.mjs`, `docs/modelar/usar/GOTCHAS-POR-OPERACAO.md`, `src/autoria/descrever-partes.js`, `src/autoria/descrever-partes.test.js`, `procedural/nucleo/operacoes/booleanas.js`, `procedural/nucleo/pedacos-convexos.js`, `procedural/nucleo/pedacos-convexos.test.mjs`, `procedural/nucleo/operacoes/arredondar-costura-placa-e-barril.test.ts`, `procedural/nucleo/operacoes/arredondar-costura-pular.test.ts`, `procedural/nucleo/selecao-geometrica.js`, `procedural/nucleo/selecao-geometrica.test.mjs`, `modulos/esboco-nucleo/src/milimetro.js`, `modulos/esboco-nucleo/tests/conexo-em-metro.test.js`, `procedural/nucleo/uso-operacoes.js`, `procedural/nucleo/CLAUDE.md`, `src/autoria/plano-de-modelagem.js`, `tools/modelar/referencias-do-plano.mjs`, `tools/modelar/referencias-nao-construidas.test.mjs`, `tools/fixtures/referencias-nao-construidas/`, `tools/modelar/vistas-para-critica.mjs`, `tools/modelar/acervo-real.test.mjs`, `tools/testes-lentos.mjs`, `tools/modelar/ramos-parados.mjs`, `tools/modelar/ramos-parados.test.mjs`, `docs/modelar/banco-de-provas/resgate-dos-ramos-2026-11-25/`

Ativado pela pessoa em 2026-11-25, com a frase "Sim, vou seguir suas recomendações, pode criar o plano e ativar", depois do inventário dos ramos. O arquivo `procedural/nucleo/uso-operacoes.js` passa do plano da superfície de produção (G2), que está pausado e é conduzido pela mesma sessão, para este, por recomendação aceita na mesma frase; o G2 o pede de volta se voltar a precisar dele antes do fechamento deste.

**Responsável:** a IA da sessão porta, mede e conduz; a pessoa aprova cada peça por imagem e decide os pontos marcados.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-25 (692ba0d8a).

## Problema observado

Oito ramos `claude/**` e `envio/**` têm trabalho que nunca entrou na main. O passo `juntar` do CI só avança a main quando ela não andou desde a base do ramo; nesses ramos ela andou, o passo falhou com a mensagem de juntar a main e enviar de novo, e nenhuma sessão voltou a eles. Ficaram para trás catorze peças, cinco delas aprovadas pela pessoa, uma correção da análise da bancada, quatro armadilhas de operação confirmadas no motor de hoje e melhorias do arredondamento de costura e das booleanas. A main andou de 165 a 730 commits desde as bases, e juntar os ramos desfaria trabalho mais novo.

O inventário de 2026-11-25 (no banco de provas deste plano) comparou cada item com a main atual, rodando em memória as receitas e o código dos ramos contra o núcleo de hoje. Ficaram fora, por a main já ter o mesmo ou melhor: a família `peca-de-revolucao` e as cinco peças reescritas sobre ela (o `lathe` com `espessura`), a invasão de contato e a lista de toleradas (`penetracaoMaxima` e `atravessamentoDeSolidos`), os `MOVIMENTOS` da receita (a extensão de articulação), o `auditar:forma` (ondulação, dobra, vinco oculto, emendas e vão entre partes), a `cascaPorPerfis` (a simetria da rede e o `rebaixoPorContorno`), o `enveloparNaChapa` e o `embutirNoVao` (o `conformarNaChapa`), o esqueleto de receita (os guias) e a lista de operações que faltavam. Ficam fora também o `envio/carro-quadrado-forma`, trabalho vivo de outra sessão que a Tarefa 3 de `comunicacao.md` protege, o `envio/carro-quadrado-v2`, absorvido por ele, e os ramos `prova/mutacoes` e `referencias`, que existem de propósito fora da main.

## Resultado

As catorze peças no acervo com a aprovação da pessoa por imagem, a análise da bancada sem apagar a peça vizinha, as quatro armadilhas no guia, a confirmação corpo a corpo no descrever, as melhorias do arredondamento de costura e das booleanas no núcleo com o acervo conferido, a roda esportiva pausada no acervo e um comando que lista os ramos parados, para que nenhum trabalho volte a ficar para trás sem aviso.

## Filtro Agent-First

Peças: USAR DIRETO as receitas dos ramos, que rodam no núcleo de hoje, com a categoria do plano de hoje e o mapa regenerado. Hélices feitas à mão (a mola do amortecedor, as molas da embreagem, a rosca da vela) ficam como estão; trocá-las pelas famílias `mola` e `fixador` é melhoria nova e vai ao backlog. Núcleo: ENVOLVER o `arredondarCostura` com as opções novas (`limpar`, `pularOQueNaoCabe`), que só agem quando a receita liga; REFATORAR o fundo do tubo, a nova tentativa do mergulho e a lista das origens sobre o código de hoje, reaplicando à mão, nunca por merge; REFATORAR a origem dos pedaços refeitos para expandir na resolução da origem, como `comOsPedacosDaDivisao`, em vez de reescrever as listas dentro do `nucleoBooleano`. Ramos parados: ENVOLVER `git` num comando legível, sem gate novo no CI.

## Incluído

- as catorze peças, com `PLANO.categoria`, o mapa regenerado, o crítico cego e a aprovação da pessoa por imagem; a junta do cabeçote, que leva 123 s no núcleo de hoje, otimizada ou declarada em `PECAS_PESADAS` com a medida;
- a análise da bancada numa subpasta por peça, com teste;
- as quatro armadilhas (`lathe` com o perfil de cima para baixo, `extrusao` com `eixo: 'z'`, a `parte` pela origem depois do `unir`, `moveV` com origem e região) e o polo contado como seção do loft, no guia de armadilhas;
- a confirmação corpo a corpo em `relacaoConfirmadaPorSolido` quando a parte inteira der `interpenetram` ou `inconclusivo`, reaproveitando `corposDe`, com o acervo conferido;
- no núcleo, nesta ordem: os seletores `onde.radial` e `onde.setor`; `limpar` e `pularOQueNaoCabe` no `arredondarCostura`; a nova tentativa com o mergulho mudado; a face coberta pelo tubo fora das listas das outras origens, casada com `tirarDosPedacosDaDivisao`; o fundo do tubo limitado pela espessura; e a origem dos pedaços refeitos, redesenhada;
- `PLANO.referenciasNaoConstruidas` e a roda esportiva pausada, sem os caminhos absolutos com nome de usuário das rodadas 4 a 6;
- `npm run ramos:parados`, que lista os ramos `claude/**` e `envio/**` com commits fora da main, a data e se o último CI deles falhou no `juntar`, e uma linha no contrato pedindo à sessão que confira o CI até a main andar.

## Excluído

- o ramo `envio/carro-quadrado-forma` e qualquer arquivo dele;
- a família `peca-de-revolucao` e a reescrita das cinco peças de revolução com `lathe` e `espessura`, que vai ao backlog;
- trocar as hélices feitas à mão pelas famílias de hoje;
- retomar o laço da roda esportiva, que a pessoa pausou;
- apagar ramos, que a pessoa faz pelo GitHub com a lista do fechamento.

## Gate de saída

1. As catorze peças executam, passam na guarda do acervo e no descrever, e cada uma tem a aprovação da pessoa por imagem registrada, ou volta com o motivo.
2. A análise de duas peças na mesma saída mantém as imagens das duas.
3. Cada mudança do núcleo tem teste, e a conferência do retrato do acervo mostra que nenhuma peça mudou além das esperadas, com as que mudaram mostradas à pessoa.
4. A origem dos pedaços refeitos passa pela revisão adversarial antes de juntar.
5. `npm run ramos:parados` lista os ramos de hoje como o inventário os achou.
6. `npm run gates` e o CI verdes, e a main andou com cada envio.

## Fatias

1. As cinco peças aprovadas (alternador, radiador, turbocompressor, disco de embreagem, junta do cabeçote), com a medida de tempo e as imagens à pessoa.
2. As seis automotivas e as três mesas sem aprovação, pelo laço com o crítico cego, e as imagens à pessoa.
3. A análise da bancada por subpasta, as armadilhas no guia e a confirmação corpo a corpo, com o acervo conferido.
4. O núcleo sem risco: os seletores, `limpar` e `pularOQueNaoCabe`, com os testes do ramo.
5. O núcleo de risco médio: a nova tentativa do mergulho, a face fora das outras origens e o fundo pela espessura, com o retrato do acervo antes e depois.
6. A origem dos pedaços refeitos, redesenhada, com o retrato do acervo e a revisão adversarial.
7. `referenciasNaoConstruidas` e a roda esportiva pausada.
8. `ramos:parados`, a lista dos ramos para a pessoa apagar e o fechamento.

## Riscos e parada

Se uma peça mudar de forma no núcleo de hoje a ponto de a aprovação antiga não valer, ela volta à pessoa como peça nova. Se a conferência do acervo mostrar que uma mudança do núcleo altera peça que não devia, a mudança para e volta à pessoa com as imagens de antes e depois. Se a origem dos pedaços refeitos não couber sem mudar as receitas que usam origem como operando, ela fica de fora e vai ao backlog, e a roda esportiva entra sem a parte do aro que dependia dela.

## Andamento

Fatia 1 feita em 2026-11-26: as cinco peças aprovadas no acervo, confirmadas pela pessoa por imagem, e a fusão das tampas pelos vizinhos, que tirou a junta do cabeçote de 123 s sem mudar nenhuma peça do acervo. A medida está no banco de provas.

Fatia 2 feita em 2026-11-26: as seis automotivas e as três mesas no acervo, pelo crítico cego, com a mesa de centro corrigida, e aprovadas pela pessoa por imagem.

Fatia 3 feita em 2026-11-26: a análise da bancada por subpasta, as armadilhas no guia e a confirmação corpo a corpo, sem mudar nenhum veredito do acervo.

## Fechamento

Preencher ao concluir ou cancelar: estado final, commit e PR, gates, resultado observado e candidatos devolvidos ao backlog.

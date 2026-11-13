# Decisões em vigor, lote 2

## 2026-09-12-a-seta-move-de-verdade.md
Estado: concluído, em 2026-09-12. Crônica: tem linha.
- [C] A seta de eixo move a parte na medida do arrasto e só aparece se um parâmetro translada naquele eixo. Porquê: é comportamento da interface da bancada, entregue em código e guarda; a regra "seta que mente é pior que seta ausente" não governa o trabalho de modelagem de hoje.

## 2026-09-14-ajuste-da-bancada-volta-como-receita.md
Estado: concluído, em 2026-09-15. Crônica: tem linha.
- [B] O ajuste da bancada volta como receita reescrita e medida em milímetro, e a origem de cada número é declarada. Porquê: caminho de volta entregue com gate. Lugar: `.claude/skills/absorver-ajuste-da-bancada/SKILL.md`, `docs/modelar/usar/AJUSTE-DA-BANCADA.md`, `tools/modelar/origens-check.mjs`.

## 2026-09-15-modo-de-edicao-de-malha.md
Estado: concluído, em 2026-09-16. Crônica: tem linha.
- [B] O núcleo e as ferramentas da IA não dependem da bancada; a rodada reescreve a receita em vez de buscar número. Porquê: busca de parâmetros não alcança edição livre (2,5 mm contra tolerância de 0,5). Lugar: `bancada:fronteira:check` (`tools/arquitetura/fronteira-da-bancada.mjs`), `docs/modelar/usar/AJUSTE-DA-BANCADA.md` (seção que diz que a rodada não procura número).

## 2026-09-16-topologia-e-leitura-do-gesto.md
Estado: concluído, em 2026-09-17. Crônica: tem linha.
- [B] A descrição do gesto é determinística e não infere receita; escrever receita continua sendo escrita. Porquê: fixado no plano como decisão que vale. Lugar: `.claude/skills/absorver-ajuste-da-bancada/SKILL.md` e `docs/modelar/usar/AJUSTE-DA-BANCADA.md` ("Ler o gesto antes de reescrever": o descritor não reescreve nada).
- [B] Forma que bate com contagem de faces que não bate é avisada, não reprovada, e o alvo não guarda identidade de vértice. Porquê: tesselação diferente com a mesma forma é receita válida. Lugar: `tools/modelar` (`absorver`), `docs/modelar/usar/AJUSTE-DA-BANCADA.md`.

## 2026-09-17-nada-depende-da-bicicleta.md
Estado: concluído, em 2026-09-22. Crônica: tem linha.
- [B] Acervo sem peça só passa com declaração `ACERVO-SEM-PECA.md`, e a declaração com peça presente reprova; varredura vazia sem declaração reprova. Porquê: gate que aprova calado varredura vazia passa sem medir. Lugar: `tools/modelar/guardas/guarda-acervo.mjs`, `guarda-referencial.mjs`, `tools/modelar/origens-check.mjs`.
- [B] Nenhuma guarda ou teste nomeia peça do acervo. Porquê: o núcleo não conhece objeto. Lugar: `CLAUDE.md` (regra do núcleo), guardas lendo o acervo.

## 2026-09-21-o-que-o-braco-robotico-achou.md
Estado: concluído, em 2026-11-05. Crônica: tem linha.
- [C] Relato de achados do braço, todos resolvidos, movidos para outros planos ou para o backlog. Porquê: o encerramento do próprio plano diz que o conteúdo é registro e cada achado tem destino.

## 2026-09-22-a-peca-nasce-encaixada.md
Estado: concluído, em 2026-09-23. Crônica: tem linha.
- [B] O vínculo entre peças é derivação direta de medida de porta mais acréscimo, sem solver de restrições geral. Porquê: manter o mecanismo pequeno e conferível. Lugar: `docs/modelar/PESQUISA-ABERTA-2026-10.md`, código da montagem em `procedural/nucleo/`.

## 2026-09-22-o-motor-mora-num-lugar-so.md
Estado: concluído, em 2026-09-22. Crônica: tem linha.
- [B] O núcleo mora em `procedural/nucleo/`, a palavra "motor" não nomeia pasta e teste que só prova o núcleo mora ao lado dele. Porquê: dois lugares com o mesmo nome confundiam. Lugar: `procedural/nucleo/arrumacao.test.mjs` (roda no gate `test`).

## 2026-09-22-o-teste-carrega-o-que-ele-prova.md
Estado: concluído, em 2026-09-22. Crônica: tem linha.
- [B] Teste não fica desligado e fixture que o teste executa mora em `tools/fixtures/`. Porquê: teste com `it.skip` por três semanas passou despercebido. Lugar: `tools/testes/nenhum-teste-desligado.test.mjs`, `tools/fixtures/`.

## 2026-09-23-o-laco-constroi-parte-por-parte.md
Estado: concluído, em 2026-09-25. Crônica: tem linha.
- [B] Etapa só se fixa em ordem, com juntas passando, e o aceite humano só vale quando o laço parou. Porquê: evitar fixar peça sem prova. Lugar: `tools/modelar/etapas-da-montagem.mjs` (`--aceite-humano`), `.claude/skills/laco-de-modelagem/SKILL.md`.

## 2026-09-25-o-braco-inteiro.md
Estado: concluído, em 2026-09-26. Crônica: tem linha.
- [B] A porta fora do plano ou do raio declarado reprova em toda peça do acervo; contorno por parte vem de watershed com sementes nomeadas. Porquê: entregue em código. Lugar: `src/autoria/porta-confere-forma.js` via `guarda-acervo`, skill `contorno-da-imagem`, `docs/modelar/usar/FLUXO-DO-OBJETO.md`.

## 2026-09-26-as-partes-do-braco.md
Estado: concluído, em 2026-11-12. Crônica: tem linha.
- [C] Braço inteiro por receitas, exportado em glTF sem `.blend` por decisão da pessoa; a conferência por contorno saiu por decisão dela e voltou ao backlog. Porquê: entrega de peça; as exclusões estão no backlog e a exportação glTF está em `tools/modelar/exportar-gltf.mjs`.

## 2026-09-28-uniao-de-solidos.md
Estado: concluído, em 2026-09-29. Crônica: tem linha.
- [B] União, subtração e interseção usam Manifold com identidade posicional herdada, e `arredondarCostura` recusa costura que dobra mais de 45° e grita quando sobra lasca. Porquê: casca aberta e raio mudado em silêncio passavam sem aviso. Lugar: `procedural/nucleo/operacoes/booleanas.js` e seus testes, `docs/modelar/usar/GOTCHAS-POR-OPERACAO.md`.

## 2026-09-29-o-esboco-sem-conta-a-mao.md
Estado: concluído, em 2026-10-01. Crônica: tem linha.
- [C] O esboço passou a ser descrito por relações e parâmetros, sem centro calculado à mão; a linguagem incremental ficou reduzida ao `--editar`. Porquê: entrega de módulo, depois reabsorvida pelo plano "esboço pelo núcleo"; a linha da crônica basta.

## 2026-10-01-o-esboco-detalhado-coerente.md
Estado: concluído, em 2026-10-06. Crônica: tem linha.
- [C] Entregou as fatias 1 a 8 e uma medição de custo (4 de 18 unidades fechadas com cerca de 700 mil tokens), com os atritos em aberto passados ao plano seguinte. Porquê: nenhuma regra nova, só medida datada.

## 2026-10-06-o-catalogo-de-familias.md
Estado: cancelado, em 2026-10-07. Crônica: tem linha.
- [B] Ferramenta nova só entra porque uma família homologada precisa dela, e toda ferramenta é determinística. Porquê: evitar catálogo de terceiros e operação não reproduzível. Lugar: `CLAUDE.md` (conteúdo determinístico; opção declarada sobre a ferramenta geral), `docs/modelar/FERRAMENTAS-POR-OBJETO.md` com `ferramentas:check`.

## 2026-10-07-as-ferramentas-de-modelagem.md
Estado: concluído, em 2026-10-11. Crônica: tem linha.
- [A] O OCCT é kernel só da exportação STEP e não é kernel de autoria; a camada de features sobre a malha é o caminho, e a hipótese de usá-lo para modelar só reabre se surgir requisito de fabricação ou tolerância de peça mecânica, ou se a camada de features não der arredondamento ou casca aceitáveis. Porquê: a análise de agosto o rejeitou para ativo visual, e `ANALISES-DE-2026-10.md` e `PESQUISA-ABERTA-2026-10.md` ainda o tratam como hipótese aberta, sem dizer que foi decidido. Procurei: "OCCT", "OpenCascade", "kernel" em `tools/`, `procedural/`, `src/`, `.claude/`, `docs/modelar/*.md`, `docs/modelar/usar/`, `CLAUDE.md`; só acho o OCCT como dependência da exportação (`DOSSIE-EXPORTACAO-CAD-STEP.md`, `INDEX.md`) e como hipótese em `ANALISES-DE-2026-10.md` e `PESQUISA-ABERTA-2026-10.md`. Rascunho do registro: O OCCT fica só na exportação STEP. A autoria usa a camada de features sobre a malha da Manifold, porque a análise de agosto rejeitou o kernel B-Rep para ativo visual (nomeação topológica contra identidade posicional, peso do wasm). A decisão reabre se um requisito de fabricação ou de tolerância de peça mecânica aparecer, ou se a camada de features não der arredondamento e casca aceitáveis.
- [B] O `loft` fica fora da pele exterior de carroceria. Porquê: decisão herdada da análise de agosto. Lugar: `docs/modelar/CONTRATO-DA-FAMILIA.md`, `docs/modelar/ANALISES-DE-2026-10.md`.
- [B] O crítico reprova só depois da medida e o conjunto de calibração fica fora do repositório rastreado. Porquê: medida antes do olhar. Lugar: `docs/modelar/usar/CRITICA-VISUAL-CONTRATO-E-CASOS.md`, `CLAUDE.md` (nenhuma métrica aprova forma sozinha).

## 2026-10-07-o-caminho-curto-da-ia.md
Estado: concluído, em 2026-10-08. Crônica: tem linha.
- [B] Reduzir tokens de ferramenta não reduz custo faturado quando o cache domina a entrada; a medição separa entrada nova, gravada e lida. Porquê: estudo achado mostrou alta de 7% no custo com corte de 38% nos tokens. Lugar: `tools/modelar/medir-transcricao.mjs` (cabeçalho e campos `entradaNova`, `cacheGravado`, `cacheLido`).

## 2026-10-08-perguntas-do-critico-por-objeto.md
Estado: cancelado, em 2026-10-08. Crônica: tem linha.
- [C] Cancelado sem código, absorvido por outros planos. Porquê: a linha da crônica já diz o destino.

## 2026-10-11-o-que-o-aviao-pede.md
Estado: concluído, em 2026-10-13. Crônica: tem linha.
- [C] Entregou a família `superficie-aerodinamica`, o recorte de uma forma por outra e o curso de mecanismo varrido pelo gate; os atritos abertos foram ao backlog. Porquê: entrega de código e peça, sem regra a guardar além do que a crônica diz.

## 2026-10-13-desenho-sem-referencia.md
Estado: concluído, em 2026-10-14. Crônica: tem linha.
- [B] Potrace e VectorCraft não deram ganho sobre a borda subpixel do contorno; trocar o contorno é decisão da pessoa. Porquê: medido no levantamento. Lugar: `docs/modelar/PESQUISA-ABERTA-2026-10.md` (seção do VectorCraft).
- [C] O módulo de desenho por restrições empatou com coordenadas no primeiro traço e ganhou na correção; o limite foi a descrição. Porquê: o módulo não existe mais em `modulos/` e a medida é datada.

## 2026-10-14-familias-de-desenho.md
Estado: concluído, em 2026-10-14. Crônica: tem linha.
- [C] Famílias de desenho da carcaça e do braço, com faixa por duas referências e ajuste por `--ajustar`. Porquê: os quatro achados viraram ferramenta, gate ou instrução dentro do próprio plano e o módulo de desenho não está mais em `modulos/`.

## 2026-10-15-importar-objeto-de-codigo.md
Estado: concluído, em 2026-10-16. Crônica: tem linha.
- [B] Código aberto trazido para o repositório leva a licença de origem e o aviso de autoria, e corpus de terceiros com licença que exige crédito não fica na árvore. Porquê: a pessoa tirou o corpus e o objeto copyleft do repositório. Lugar: `docs/modelar/PESQUISA-ABERTA-2026-10.md` (combinado de 2026-10-13 e seção dos acervos com licença aberta).
- [B] Importação de objeto de código não é o caminho principal; STL de malha única colada não se traduz. Porquê: medido nas sondas. Lugar: `docs/modelar/PESQUISA-ABERTA-2026-10.md`, `tools/modelar/malha-para-esboco.mjs`.

## 2026-10-15-o-aviao-do-esboco-a-receita.md
Estado: concluído, em 2026-10-16. Crônica: tem linha.
- [B] A auditoria de montagem mede o apoio no chão de cada roda e as interseções entre peças, e cada encaixe de junta é declarado com motivo e profundidade. Porquê: rodas 17 mm acima do chão e peças atravessadas passaram sem medida. Lugar: `tools/modelar/etapas-da-montagem.mjs` (`etapas --auditar`, `apoioNoChao`), `docs/modelar/usar/AUDITORIA-DA-MONTAGEM.md`.
- [C] As receitas do avião ficam na pose de pouso e o curso dos trens e da hélice continua no esboço. Porquê: pose e cinemática de montagem estão no backlog como capacidade em aberto.

## 2026-10-16-aparelhos-de-caixa.md
Estado: concluído, em 2026-10-19. Crônica: tem linha.
- [B] Mudar faixa ou opção da família depois da aprovação esvazia o aceite da pessoa, então as faixas terminam antes de pedir o aceite, uma vez só. Porquê: o hash dos pontos extremos muda. Lugar: `.claude/skills/laco-de-modelagem/SKILL.md` (linha 26).
- [B] O processo leve de peça (esboço da família, perfil, prancha final) custa uma fração do processo do avião. Porquê: limite de parada não atingido. Lugar: `.claude/skills/laco-de-modelagem/SKILL.md`, roteiro `modelar/peca`.
- [C] Aparelho de caixa foi família nova e não opção do `movel-de-caixa`; os demais grupos da classe não abrem sem decisão da pessoa. Porquê: escolha de escopo daquela família, já no contrato da família e no backlog.

## 2026-10-16-gates-em-poucos-minutos.md
Estado: concluído, em 2026-10-16. Crônica: tem linha.
- [B] Todo envio à main roda a bateria completa (na máquina com `--completo` ou pelo CI), nenhum teste some, a bateria rápida tem teto de 30 s por arquivo, e agente despachado não roda a bateria. Porquê: manter a bateria curta sem tirar conferência. Lugar: `CLAUDE.md` (regra de `npm run gates` e CI), `tools/gates.mjs`, `tools/testes-lentos.mjs`, `reguas:check`.

## 2026-10-19-objetos-externos-como-familias.md
Estado: concluído, em 2026-10-20. Crônica: tem linha.
- [B] Nome de fabricante, marca e arquivo `.obj`/`.mtl` de projeto externo não entram no repositório; o objeto escolhido recebe nome neutro. Porquê: regra de marca e de terceiros. Lugar: `CLAUDE.md` (imagem de referência), `tools/arquitetura/termos-proibidos.mjs`, `malha-fora-do-git.test.mjs`, `avisos-de-terceiros.test.mjs`.
- [C] O plano terminou com 19 peças do acervo pela conversão do esboço em passos do núcleo, e não por famílias à mão (a família `cadeira` custou 915 mil tokens). Porquê: o caminho é a ferramenta `esboco-para-passos.mjs`, que já existe, e o custo é medida datada.

## 2026-10-19-receitas-com-material-e-textura.md
Estado: concluído, em 2026-10-19. Crônica: tem linha.
- [B] A receita guarda só a escolha de material e a imagem de textura é sempre regerada, sem arquivo de imagem versionado junto da peça; PBR e paleta nova ficam fora. Porquê: conteúdo salvo reexecutável. Lugar: `CLAUDE.md` (regra de material e textura), `modulos/textura/`, `tools/arquitetura/imagem-pesada-no-git.test.mjs`.

## 2026-10-20-veiculos-de-referencia-livre.md
Estado: concluído, em 2026-10-20. Crônica: tem linha.
- [B] Malha de terceiros estuda-se como referência e nunca entra no git; a fonte registra `frente` e `metodo`, e a ferramenta recusa fonte sem eles; a aprovação de forma vem da folha comparativa aberta. Porquê: comparador por vértices media escala e não forma; fonte com frente invertida passou. Lugar: `tools/modelar/modelo-de-referencia.mjs`, `comparar-silhueta.mjs`, `frente-da-fonte.mjs`, `origem-das-fontes.test.mjs`, `tools/arquitetura/malha-fora-do-git.test.mjs`.

## 2026-10-21-ajustes-no-nucleo-dos-veiculos.md
Estado: concluído, em 2026-10-30. Crônica: tem linha.
- [B] Ponto repetido no contorno falha alto e `limparContorno` é opt-in; `lathe` aberto exige `superficie: true`; tolerância de contato 1e-9 global com declaração por contato até 1e-7 e motivo; booleana funde faces. Porquê: deduplicar renumera face salva e esconde erro; mudar o sentido de dado salvo é proibido. Lugar: `procedural/nucleo/contorno.js`, `.claude/skills/criar-peca/references/operacoes-procedurais.md`, `docs/modelar/usar/GOTCHAS-POR-OPERACAO.md`, testes `ponto-repetido.test.ts` e `limpar-contorno.test.mjs`.
- [B] O núcleo não tem Three.js, domínio automotivo nem ferramenta externa, e receita do acervo não é reescrita para usar função nova sem plano. Porquê: bit a bit antes e depois. Lugar: `tools/arquitetura/nucleo-sem-three.mjs`, `CLAUDE.md`.

## 2026-10-21-carroceria-por-subdivisao.md
Estado: concluído, em 2026-10-23 (o sétimo teste; crônica tem linha na parte dos planos de agosto). Crônica: tem linha.
- [B] A subdivisão com vincos nomeados mantém a aproximação como padrão e a interpolação só por opção declarada (`medidas`, resolvida por eliminação de Gauss, falha com os nomes se singular). Porquê: interpolar muda o sentido do dado salvo. Lugar: `docs/modelar/modelar-carroceria.md`, `procedural/nucleo/` (operação `subdivisao`), `docs/modelar/usar/GOTCHAS-POR-OPERACAO.md`.
- [B] A lista de termos proibidos é embaralhada com a chave `MECANIFICA_CHAVE_TERMOS` e o histórico se confere antes de tornar o repositório público. Porquê: o repositório deve ficar público sem expor os termos. Lugar: `tools/arquitetura/termos-proibidos.mjs`, `historico-limpo.mjs`, `docs/modelar/INDEX.md`.

## 2026-10-22-leitura-por-demanda-e-limpeza.md
Estado: concluído, em 2026-10-27. Crônica: tem linha.
- [B] A leitura obrigatória é só o contrato mínimo e as regras de maior risco viram recusa de ferramenta, e regra que sai de documento passa a lugar dito. Porquê: a leitura até o primeiro passo era longa demais. Lugar: `CLAUDE.md`, `npm run comecar`, `docs/modelar/roteiros/roteiros.json`.
- [C] O esboço sai da leitura obrigatória, e desenho por restrições, importadores e módulos de malha sem uso saíram, junto com visor e bancadas herdados. Porquê: o código removido está no git e a crônica diz o resultado; a decisão não governa trabalho novo.

## 2026-10-23-gaiola-que-segue-as-feicoes.md
Estado: concluído, em 2026-10-24. Crônica: tem linha.
- [C] Anéis de gaiola em vão real, leitura com peso, face virada e conferência entre rodadas; gaiola por retalhos só depois do oitavo teste. Porquê: o oitavo teste foi feito e o plano sucessor (rede de curvas) fixou o nível oficial; as ferramentas estão em `tools/modelar` e em `modelar-carroceria.md`.

## 2026-10-24-carroceria-por-rede-de-curvas.md
Estado: concluído, em 2026-10-25. Crônica: tem linha.
- [B] O nível oficial de carroceria é a lataria lisa com os detalhes de borda como `friso` à parte, e detalhe fino de canal ou moldura com vários degraus fica como limite conhecido (cerca de 5), sem mais rodadas; passar disso pede plano. Porquê: decisão da pessoa depois do piloto cego. Lugar: `docs/modelar/modelar-carroceria.md` (seção "Nível oficial de carroceria", linha 225).

## 2026-10-25-renomear-para-modelar.md
Estado: concluído, em 2026-10-28. Crônica: tem linha.
- [B] Os identificadores `mecanifica.*` dos formatos salvos e o banco local `mecanifica-bancada` ficam com o nome antigo, e o nome antigo fora dessas exceções é recusado. Porquê: formato salvo não muda de identificador. Lugar: `tools/arquitetura/nome-antigo.mjs` (exceções declaradas) e `nome-antigo.test.mjs`.

## 2026-10-27-bateria-rapida-e-retorno-cedo.md
Estado: concluído, em 2026-10-28. Crônica: tem linha.
- [B] A bateria local roda só o barato e o que a mudança afeta, o pesado fica para o CI dividido, nada entra na main sem tudo verde, e teste que lê arquivo sem declarar reprova no seletor. Porquê: uma linha no núcleo levou 23 min na bateria local. Lugar: `CLAUDE.md` (regra de `npm run gates` e CI), `tools/gates.mjs`, `tools/testes-lentos.mjs`, registro do que cada teste lê.

## 2026-10-30-glossario-e-entrada-para-pessoas.md
Estado: concluído, em 2026-10-30. Crônica: tem linha.
- [A] Não há glossário separado: a página de entrada para pessoas (`docs/COMECE-AQUI.md`) define os termos que usa numa seção dela, ligados ao documento de origem, e os agentes chegam ao termo pelos roteiros do `comecar`. Porquê: um glossário repetiria as definições dos documentos num segundo lugar e envelheceria com eles. Procurei: "glossário" e "glossario" em `docs/`, `tools/`, `.claude/`, `CLAUDE.md`; só aparece em `docs/MAPA.md` e `docs/modelar/planos/README.md`, que são índice e crônica do próprio plano, e em `docs/COMECE-AQUI.md`, que aplica a decisão sem a enunciar. Rascunho do registro: Não se cria glossário separado. Os termos próprios do projeto são definidos uma vez, no documento que os governa, e a página de entrada para pessoas os lista ligados a esse documento; os agentes usam os roteiros do `comecar`. Um glossário paralelo repetiria definições e envelheceria com elas.
- [B] A leitura obrigatória de cada roteiro não cresce com a página nova, e nenhum caminho citado fica quebrado. Porquê: orçamento de leitura. Lugar: `npm run leitura:obrigatoria`, `docs:citacoes:check`, `docs:links:check`.

## 2026-10-30-interface-da-bancada.md
Estado: cancelado, em 2026-10-30 (fundido no plano das visões). Crônica: não tem linha.
- [C] Cancelado porque a reestruturação da interface foi feita dentro do plano das visões de conferência. Porquê: o plano tem Estado cancelado e nenhuma entrega própria; a decisão de tela está no plano das visões.

## 2026-10-30-visoes-de-conferencia-na-bancada.md
Estado: concluído, em 2026-11-03. Crônica: tem linha.
- [B] As visões (sólido, arame, raio X, curvatura, zebra, luz rasante) não mudam as imagens das guardas nem do pacote do crítico com o seletor em sólido, e a curvatura foi conferida contra a do Blender. Porquê: a bancada não pode alterar o que o crítico recebe. Lugar: `npm run bancada:guardas`, `src/bancada/visoes/visoes-de-superficie.test.js`, `docs/modelar/BANCADA-E-APRESENTACAO.md`.
- [C] Os temas Foco e Revisão saíram depois, por decisão da pessoa. Porquê: a linha do plano "ajustes da bancada" já o diz.

## 2026-11-03-ajustes-da-bancada.md
Estado: concluído, em 2026-11-03. Crônica: tem linha.
- [C] O objeto abre inteiro pela janela Abrir e a tela perdeu diagnóstico, portas e temas extras. Porquê: ajuste de interface entregue, sem regra a guardar além da crônica.

## 2026-11-03-descrever-rapido.md
Estado: concluído, em 2026-11-03. Crônica: tem linha.
- [B] O `descrever` mantém a saída idêntica e tem guarda de tempo no CI que reprova acima de 180 s. Porquê: o furgão levava 905 s. Lugar: `tools/modelar/descrever-peca.mjs`, `tools/modelar/guardas/guarda-acervo.test.mjs` (guarda de tempo).

## 2026-11-03-regras-de-desenho-por-familia.md
Estado: concluído, em 2026-11-03. Crônica: tem linha.
- [B] O que a pessoa corrige vira regra em dados da família, com a pergunta no alinhamento e no crítico e, quando há medida, uma conferência da prancha que reprova; o pedido da pessoa é contado por etapa. Porquê: a correção de um objeto vai para a ferramenta geral e não para o arquivo do objeto. Lugar: `CLAUDE.md` (regra da correção), `.claude/skills/alinhar-modelagem/SKILL.md`, `docs/modelar/CONTRATO-DA-FAMILIA.md`.

## 2026-11-05-abertura-de-contorno-livre.md
Estado: concluído, em 2026-11-05. Crônica: tem linha.
- [B] O recuo da lente padrão de 2,5 espessuras vale só para aba com raio da dobra de até uma espessura; acima disso a receita declara o recuo. Porquê: decisão tomada com a pessoa ao ver a forma. Lugar: operação `aberturaPorContorno` no núcleo (`procedural/nucleo/`), testes `tools/fixtures/aberturas-em-teste/`.

## 2026-11-05-esboco-pelo-nucleo.md
Estado: concluído, em 2026-11-05. Crônica: tem linha.
- [B] A calibração do crítico fica congelada nas imagens gravadas até o crítico ou o brief mudarem, e o campo `esboco` sai das famílias. Porquê: o desenhista antigo saiu com o módulo, e mudar o crítico obriga a medir de novo. Lugar: `tools/modelar/calibracao-do-critico.mjs` (gate `calibracao:check`, que confere o agente `critico-visual.md` e o brief fixo).
- [B] As opções de forma saem das mesmas operações da peça (esboço 2.0 e `npm run variantes`). Porquê: o esboço antigo duplicava o núcleo. Lugar: `.claude/skills/esbocar-opcoes/SKILL.md`, `modulos/esboco-nucleo/README.md`.

## 2026-11-05-limites-do-solido-por-lacos.md
Estado: concluído, em 2026-11-06. Crônica: tem linha.
- [B] A cruz com espessura na tampa fica como recusa com a medida, laço aberto e planos não paralelos ficam fora, e planos a menos de 2,5 mm passam com vinco vivo. Porquê: pediria triangular polígono côncavo dentro de gaiola de quadriláteros. Lugar: `procedural/nucleo/gaiola-por-lacos.js` (recusas com a medida na mensagem), ficha `npm run capacidade`.

## 2026-11-05-navegacao-de-receitas.md
Estado: concluído, em 2026-11-05. Crônica: tem linha.
- [B] Receita acima de 1.000 linhas se divide em arquivos por assunto, e o mapa de qualquer receita sai por `npm run receita:mapa`. Porquê: um modelador leu 30 KB contra 81 KB da linha de base. Lugar: `docs/modelar/usar/GUIA-AUTORIA-IA.md` (seção 2), `tools/modelar/mapa-da-receita.mjs`.

## 2026-11-05-porta-de-entrada-dos-agentes.md
Estado: concluído, em 2026-11-05. Crônica: tem linha.
- [B] O modelador acha a capacidade numa ficha curta (`npm run capacidade`, `--ajuda` das ferramentas) e não por leitura do código; a medida de um agente só serve de direção e não de prova. Porquê: o gate de metade da leitura não passou e o plano registrou por quê. Lugar: `npm run capacidade`, `.claude/skills/criar-peca/SKILL.md`.

## 2026-11-05-solido-por-lacos.md
Estado: concluído, em 2026-11-05. Crônica: tem linha.
- [B] Em peça nova a compensação do ponto se declara nos trechos de canto e de curva; medidas em todos os pontos e planos a menos de 2,5 mm são recusados com a medida na mensagem. Porquê: decisão da pessoa ao ver as peças L e U. Lugar: `procedural/nucleo/gaiola-por-lacos.js` (cabeçalho, `compensar`), ficha `npm run capacidade`.

## 2026-11-06-abertura-em-qualquer-direcao.md
Estado: concluído, em 2026-11-06. Crônica: tem linha.
- [B] Ficam recusados, com a medida, dois vãos a menos de 0,3 mm, bico abaixo de 2 graus sem reduzir o recuo da lente, camadas sobrepostas e a camada do meio de um corpo de três. Porquê: limites medidos numa bateria de nove peças. Lugar: `tools/fixtures/aberturas-em-teste/` (testes), `docs/modelar/usar/GOTCHAS-POR-OPERACAO.md`.

## 2026-11-06-abertura-so-na-vizinhanca.md
Estado: concluído, em 2026-11-07. Crônica: tem linha.
- [B] A booleana de cada vão vê só a vizinhança dele, e mudança em `booleanas.js` pede à pessoa que mude o território. Porquê: sete aberturas do furgão caíram de 51 s para 3,7 s. Lugar: `procedural/nucleo/` (`abertura-por-contorno.js`), `tools/fixtures/aberturas-em-teste/`; a regra de território está no próprio plano ativo de cada sessão, não em decisão a guardar.

## 2026-11-08-materiais-realistas.md
Estado: concluído, em 2026-11-08. Crônica: não tem linha.
- [A] Texturas, relevos e ambiente são gerados pelo projeto a partir de números, sem imagem de fora; uma exceção por material só entra se a imagem gerada não convencer, e então a origem e a licença ficam registradas. Porquê: manter o conteúdo salvo determinístico e livre de terceiros. Procurei: "imagem de fora", "licença", "exceção por material", "sem foto" em `modulos/textura/`, `src/`, `tools/`, `.claude/`, `docs/modelar/*.md`, `docs/modelar/usar/`, `CLAUDE.md`; o `CLAUDE.md` só diz que material entra por escolha por peça e módulo de textura, e `ambiente-de-reflexo.js` diz "sem imagem de fora" só para o ambiente, sem a cláusula da exceção. Rascunho do registro: Textura, relevo e ambiente de material saem de `modulos/textura/` e do ambiente gerado, calculados de números e reproduzíveis, sem imagem de fora. Uma imagem de terceiro só entra como exceção por material, quando a imagem gerada não convence a pessoa, e então a origem e a licença vão registradas. Vale para a bancada e para a exportação glTF, que mostram o mesmo material.
- [B] O pacote do crítico e as vistas do Blender seguem neutros (sem ambiente) para a nota ser comparável entre rodadas; o material da receita passa por um normalizador único que recusa campo desconhecido. Porquê: comparabilidade e recusa de campo silencioso. Lugar: `src/autoria/material-da-receita.js`, `tools/modelar/vistas-para-critica.mjs`, `docs/modelar/BANCADA-E-APRESENTACAO.md`.

## 2026-11-08-trecho-que-some-entre-lacos.md
Estado: concluído, em 2026-11-08. Crônica: não tem linha.
- [B] Dobra ou vinco não declarado é aviso do `descrever`, e a peça declara o que é de propósito em `PLANO.dobrasAceitas`. Porquê: ruga e chanfro sem declaração passavam. Lugar: `tools/modelar/dobra-da-superficie.mjs`, `tools/modelar/vinco-oculto.mjs`, `src/autoria/dobras-aceitas.js`, `tools/modelar/descrever-peca.mjs`.

## 2026-11-08-uniao-de-tubos-com-arredondamento.md
Estado: concluído, em 2026-11-08. Crônica: não tem linha.
- [B] No modo curvo, `arredondarCostura` recusa a bola que encostaria numa quina também quando a fatia chega a uma face plana que limita o sólido, e afina o raio com o aviso `faceLimite`. Porquê: sem isso a base saía com calombo. Lugar: `procedural/nucleo/operacoes/booleanas.js` e testes, `docs/modelar/usar/GOTCHAS-POR-OPERACAO.md`.

## 2026-11-09-abertura-na-vizinhanca-de-todo-vao.md
Estado: concluído, em 2026-11-12. Crônica: tem linha.
- [B] Um teto de tempo de gate sai de pelo menos duas medidas do CI (a máquina varia quase o dobro): o teto do acervo ficou em 320 s, 1,7 vez a maior medida. Porquê: o teto de 180 s reprovou na segunda medida. Lugar: `tools/testes-lentos.mjs` (comentários de 2026-11-10 e do teto da bateria rápida), `tools/modelar/guardas/guarda-acervo.mjs`.

## 2026-11-09-empilhadeira.md
Estado: concluído, em 2026-11-10. Crônica: não tem linha.
- [C] Empilhadeira de dezenove receitas em montagem de 23 etapas fixas pelo aceite; as juntas que giram não são medidas com curso, e as pendências foram para o backlog e para o plano do núcleo. Porquê: entrega de peça; as lacunas estão no backlog e no plano de revisão ativo.

## 2026-11-09-ferramentas-de-conferencia-e-vista.md
Estado: concluído, em 2026-11-12. Crônica: tem linha.
- [B] O cronômetro por passo do `descrever` mede de uma consulta do registro à seguinte e não embrulha a operação, porque embrulhar tira o passo do caminho rápido do núcleo (de 180 s a 480 s no CI); a dobra só é aceita quando a cadeia inteira cabe na região. Porquê: o primeiro envio reprovou no CI por custo. Lugar: `tools/modelar/descrever-peca.mjs` e seu teste que prende a operação devolvida à original, `tools/modelar/dobra-da-superficie.mjs`.
- [B] Arquivo de território sem plano segue o roteiro `mudar/defeito` para defeito pontual, e capacidade nova pede plano. Porquê: regra do contrato. Lugar: `CLAUDE.md` (`mudar`), `docs/modelar/roteiros/roteiros.json`.

## 2026-11-10-nucleo-para-qualquer-mecanismo.md
Estado: concluído, em 2026-11-13. Crônica: tem linha.
- [C] Entregou o custo por peça, o fluxo único do objeto, o tubo dobrado, a chapa fina, a lataria em painéis e o sedã em cinco etapas; o restante passou ao plano de revisão por decisão da pessoa. Porquê: a linha da crônica já diz tudo e as pendências vivem no plano ativo.

## DESENHO-bancada-referencias-e-controles.md
Estado: nenhum dos dois (arquivo de desenho com "Estado: pronto para revisão", de 2026-09-09; não é plano). Crônica: tem linha (apenas o link do arquivo).
- [C] Desenho da aba de referência por imagem, dos controles persistentes e do wireframe da bancada. Porquê: especificação de interface já implementada em `src/bancada/referencias/` e descrita em `docs/modelar/BANCADA-E-APRESENTACAO.md`; não governa modelagem.

# Resumo

Planos lidos: 58 de 58 (a leitura foi dirigida: título, Estado, Excluído, Invariantes, Decisões, Fechamento e a linha da crônica de cada plano, com busca em `tools/`, `procedural/`, `src/`, `modulos/`, `.claude/`, `docs/modelar/*.md`, `docs/modelar/usar/` e `CLAUDE.md` para cada candidata; o corpo das fatias dos planos grandes, como `2026-10-21-ajustes-no-nucleo-dos-veiculos.md` e `2026-10-21-carroceria-por-subdivisao.md`, não foi lido linha a linha).
Decisões: A = 3, B = 53, C = 20.

Decisões A:
- `2026-10-07-as-ferramentas-de-modelagem.md`: o OCCT é kernel só da exportação STEP e não de autoria; reabre só por requisito de fabricação ou tolerância, ou se a camada de features sobre a malha não bastar.
- `2026-10-30-glossario-e-entrada-para-pessoas.md`: não há glossário separado, os termos são definidos no documento que os governa e a página de entrada os liga a ele.
- `2026-11-08-materiais-realistas.md`: texturas, relevos e ambiente são gerados de números, sem imagem de fora, e a exceção por material exige origem e licença registradas.

Observações: `docs/modelar/modelar-carroceria.md` (linha 227) e `docs/modelar/INDEX.md` (linha 26) citam planos de `encerrados/` e vão precisar do link corrigido quando a pasta sair. O plano `2026-10-30-interface-da-bancada.md`, `2026-11-08-materiais-realistas.md`, `2026-11-08-trecho-que-some-entre-lacos.md`, `2026-11-08-uniao-de-tubos-com-arredondamento.md`, `2026-11-09-empilhadeira.md` e `DESENHO-bancada-referencias-e-controles.md` não têm linha de crônica de plano próprio (o último só aparece como link solto). Arquivos que faltaram: nenhum.

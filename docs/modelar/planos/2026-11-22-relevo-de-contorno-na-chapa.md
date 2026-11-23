# Relevo de contorno na chapa: anéis concêntricos na rede de curvas e moldura conformada multipainel

**Estado:** rascunho

**Território:** nenhum (aguarda aprovação)

**Responsável:** a definir na ativação; a pessoa valida as provas visuais na bancada (pintura brilhante, zebra e luz rasante).

**Repositório e base:** `warbookbr/nos-modelar`, a partir da base de 2026-11-22 (estudo motivado na modelagem de `procedural/pecas/carro-quadrado/partes/lataria/`).

Território previsto ao ativar (sem sobreposição com `2026-11-14-modelagem-de-carro.md`): `procedural/nucleo/faixa-de-contorno-na-rede.js`, `procedural/nucleo/faixa-de-contorno-na-rede.test.mjs`, `procedural/nucleo/conformar-na-chapa.js`, `procedural/nucleo/conformar-na-chapa.test.mjs`, `procedural/nucleo/fixtures/`, `tools/modelar/capacidade.mjs` e `docs/modelar/guias/modelar-carroceria.md`.

## Problema observado

Ao modelar o ressalto em volta dos arcos de roda de `carro-quadrado/lataria` (`procedural/pecas/carro-quadrado/partes/lataria/receita/acabamentos.js`, parte `arcosEstampados`), o recurso disponível sem redesenhar toda a rede à mão foi gerar uma peça fechada separada e colada sobre a pele da lateral. Esse contorno mostrou três defeitos estruturais: a faixa sai estreita e destacada como um aplique artificial, a costura entre a peça colada e a chapa quebra o reflexo contínuo sob pintura brilhante e zebra, e o relevo não atravessa com continuidade real a emenda para outros painéis (como o encontro entre para-lama e para-choque ou soleira).

A análise de quatro famílias geométricas reais de relevos em volta de aberturas e contornos — comuns em carrocerias automotivas e igualmente presentes em carenagens de eletrodomésticos, carcaças robóticas e chapas estampadas — mostra por que uma única receita pronta de peça separada não resolve o problema:

1. **Faixa chanfrada para dentro na própria chapa:** vinco externo nítido paralelo à abertura e plano inclinado recuando em direção à borda, cortado ao meio pela emenda entre painéis vizinhos como uma superfície única.
2. **Ombro ou ressalto estampado saliente:** vinco externo bem definido, coroa convexa deslocada para fora com afinamento progressivo nas extremidades (ou prolongamento contínuo pelo painel adjacente) e aba dobrada para dentro da abertura.
3. **Alargamento volumétrico contínuo (bojo amplo):** elevação larga e suave em continuidade G1/G2 sem vinco seco, absorvendo o painel lateral e o painel frontal ou traseiro antes do corte das frestas.
4. **Moldura externa fisicamente separada:** peça aplicada de outro material (plástico, borracha, alargador aparafusado) que abraça a borda e frequentemente percorre dois ou mais corpos vizinhos com seção variável.

Nenhuma operação atual do núcleo cobre essas quatro famílias sem atrito severo. Em `gaiolaPorEstacoes`, a grade ortogonal cruza contornos curvos em diagonal, impedindo deslocar uma faixa paralela à curva sem serrilhado. Em `gaiolaPorRede`, o fluxo de malha acompanha feições, mas criar dois a quatro anéis concêntricos sobre uma superfície curva com retalhos de transição à mão exige dezenas de curvas e nós auxiliares — lacuna já anotada em `docs/modelar/planos/BACKLOG.md` ("Curva paralela a outra na rede de curvas"). `rebaixoPorContorno` faz apenas degrau booleano plano de profundidade fixa para dentro (não faz ressalto para fora, perfil transversal livre nem modulação longitudinal). `divisaoPorContorno` divide triângulos sem mover vértices, e deformar malha já triangulada após `subdivisao` destrói a suavidade das normais na luz rasante e na zebra. Por fim, `conformarNaChapa` gera apenas peça separada com seção retangular fixa (`{ largura, altura, chanfro }`), sem afinamento ao longo do trilho e restrita a uma única malha-alvo.

## Decisão arquitetural: na malha versus peça à parte

A separação correta acompanha a realidade física do objeto e separa duas camadas distintas, ambas 100% agnósticas a domínio (o núcleo não conhece veículo, arco de roda nem para-choque):

1. **Na própria malha (caminho principal — famílias 1, 2 e 3):** todo relevo estampado ou moldado na pele contínua nasce na **superfície-mestre antes do corte dos painéis**, por meio de um ajudante de anéis concêntricos sobre `gaiolaPorRede` (`faixaDeContornoNaRede`). Como os anéis geram quadriláteros puros alinhados ao contorno, a subdivisão preserva reflexo contínuo e permite alternar entre chanfro plano, ombro com vinco ou bojo suave G1 apenas mudando o perfil transversal e a nitidez do vinco. Em seguida, `paineisPorVaos`, `aberturaPorContorno` ou `divisaoPorContorno` cortam as frestas entre painéis sobre a chapa já estampada — assim o relevo continua pelo painel vizinho (para-lama e para-choque, ou tampa e carenagem) com continuidade exata através da fresta, sem alinhamento manual entre peças.
2. **Peça à parte (caminho complementar — família 4):** reservado para molduras, borrachas e alargadores fisicamente separados da chapa. Em vez de criar uma nova operação, o plano evolui `conformarNaChapa` para aceitar perfil 2D livre, modulação longitudinal de largura/altura e uma lista ordenada de malhas-alvo (`malhas`), permitindo que uma moldura externa atravesse de forma contínua a junção entre dois corpos vizinhos.

Deformação direta de vértices sobre malha já subdividida e triangulada fica descartada: o custo topológico de remover lascas e a quebra de continuidade de curvatura violam a meta de superfície limpa sob zebra e luz rasante.

## Resultado

Uma receita declara, sem coordenadas manuais de anéis auxiliares, qualquer relevo contínuo paralelo a um contorno aberto ou fechado diretamente na chapa de `gaiolaPorRede` (chanfro, ressalto vincado ou bojo suave com aba interna e modulação longitudinal, atravessando emendas de painéis cortadas depois) ou, quando o objeto exigir moldura física separada, gera uma moldura conformada de perfil livre e seção variável sobre um ou mais corpos vizinhos via `conformarNaChapa`.

## Filtro Agent-First

- `gaiolaPorRede` e `subdivisao`: **USAR DIRETO** — o motor de retalhos, vincos nomeados, emendas G1 e espessura já entrega superfície contínua de quadriláteros; o contrato interno permanece intacto.
- `faixaDeContornoNaRede` (novo ajudante puro sobre `gaiolaPorRede`): **ENVOLVER** — reduz dezenas de curvas paralelas, nós de junção e retalhos manuais a uma declaração semântica curta (`contorno`, `faixas: [{ larguraMm, deslocamentoMm, vinco?, continuidade? }]`, `modulacao`, `abaInterna`), mantendo acesso total às curvas e nós gerados para composição com o restante da rede e recusando com diagnóstico (ponto e raio mínimo) quando o deslocamento causa auto-interseção.
- `paineisPorVaos`, `aberturaPorContorno` e `divisaoPorContorno`: **USAR DIRETO** — operam depois da chapa estampada, garantindo continuidade do relevo através das emendas de painel sem conhecer a existência da faixa.
- `conformarNaChapa`: **REFATORAR** (extensão retrocompatível) — acrescentar `perfil` 2D livre, `modulacao` ao longo do trilho (no mesmo formato conceitual já testado em `friso.js`) e `malhas` (lista de sólidos-alvo com suavização na transição de normal), preservando 100% do contrato atual de `secao` e `malha`.
- `friso` e `rebaixoPorContorno`: **USAR DIRETO** — continuam atendendo borrachas/molduras de borda de vão e rebaixos retos localizados.
- Deformação de relevo sobre malha pós-subdivisão e pré-configurações de domínio (ex.: "tipo de arco de carro"): **ADIAR / FORA** — a primeira degrada a qualidade de superfície; a segunda viola o invariante de núcleo sem domínio.

## Contrato proposto (resumo de intenção)

No ajudante `faixaDeContornoNaRede` (unidades em mm, saída compatível com `gaiolaPorRede`):

- **Entrada:** superfície-guia (função de amostragem ou rede/superfície base), curva de referência (aberta ou fechada, com sentido de fora explícito), lista de `faixas` do contorno para fora (`larguraMm`, `deslocamentoMm` positivo para ressalto ou negativo para chanfro/rebaixo, `vinco` opcional `0..1 | 'viva'`, `continuidade` opcional `'G1'`), `modulacao` opcional em função da fração `s` do comprimento (`0..1`, ex.: pontos `[s, fator]` ou afinamento suave nas pontas), e `abaInterna` opcional (`profundidadeMm`, `anguloGraus`) dobrando a borda para o lado interno.
- **Saída:** `{ curvas, nos, retalhos, curvaExterna, avisos }` prontos para composição direta em `gaiolaPorRede`, mais diagnóstico determinístico de raio de curvatura mínimo versus largura total da faixa (recusa antes de gerar auto-interseção).

Na evolução de `conformarNaChapa`:

- **`perfil`:** polígono 2D `[[u, v], ...]` em mm (alternativa a `secao`), suportando seções assimétricas e abas de retorno.
- **`modulacao`:** escala de altura/largura ao longo de `s ∈ [0, 1]` do trilho (ex.: `[[0, 0.2], [0.15, 1], [0.85, 1], [1, 0.2]]`), com opção de fechamento suave nas pontas.
- **`malhas`:** lista de sólidos-alvo ordenados; cada amostra do trilho projeta sobre a união das superfícies visíveis e suaviza a normal na travessia da fresta entre corpos, avisando se algum trecho cair num vão maior que a tolerância.

## Incluído

- ajudante puro `procedural/nucleo/faixa-de-contorno-na-rede.js` com recusa de auto-interseção, perfil transversal multi-anel, vincos opcionais, modulação longitudinal e aba interna;
- fixture neutra (sem domínio de veículo) cobrindo os três perfis na malha (chanfro plano para dentro, ombro saliente vincado com aba interna e bojo amplo suave em G1) e o corte posterior da chapa por emenda de painel;
- extensão retrocompatível de `procedural/nucleo/conformar-na-chapa.js` (`perfil`, `modulacao` e `malhas`) com fixture neutra de moldura atravessando dois painéis separados por uma fresta;
- registro das fichas em `tools/modelar/capacidade.mjs` e seção de uso em `docs/modelar/guias/modelar-carroceria.md`;
- prova em produto numa peça de lataria real (ex.: substituição dos `arcosEstampados` separados ou piloto equivalente), avaliada na bancada em pintura brilhante, zebra e luz rasante.

## Excluído

- operação específica de veículo ou catálogo de estilos de para-lama no núcleo;
- deformação de relevo sobre malha já triangulada após `subdivisao`;
- alteração na superfície G2 ou no território ativo de `carro-fastback` (`2026-11-14-modelagem-de-carro.md`);
- migração automática de peças já aprovadas do acervo (ficam com malha idêntica).

## Invariantes

- O núcleo não conhece veículo nem outro domínio de objeto.
- Toda saída é determinística, manifold, com 0 faces órfãs e sem faces finas abaixo do limiar do projeto.
- O acervo existente mantém malha idêntica (zero regressão em `guarda:acervo` e no retrato do acervo).
- `conformarNaChapa` preserva 100% de compatibilidade com chamadas atuais (`malha`, `secao`).
- Aprovação de forma e reflexo cabe sempre à pessoa em captura de bancada (pintura, zebra e luz rasante).

## Gate de saída

1. Fixture neutra prova, com testes automatizados, os três perfis na chapa (chanfro, ombro vincado com aba e bojo G1), com amplitude medida dentro de 0,5 mm do perfil declarado e 0 auto-interseções.
2. Corte de fresta (`aberturaPorContorno` ou `paineisPorVaos`) sobre a chapa estampada produz dois painéis independentes cuja diferença de normal e altura através da fresta fica dentro de 0,2 mm e 1 grau.
3. Recusa diagnóstica testada quando a largura total da faixa excede o raio mínimo de curvatura do contorno (apontando ponto e medida).
4. `conformarNaChapa` passa testes de perfil livre, modulação longitudinal, projeção multipainel sobre fresta e compatibilidade integral com todos os testes antigos.
5. Prova visual em bancada (pintura brilhante, zebra e luz rasante) da fixture e da peça-piloto aprovada pela pessoa.
6. Fichas registradas em `npm run capacidade`, guia atualizado, decisões Agent-First verificadas e `npm run gates` verde.

## Fatias

1. **Baseline e fixture neutra:** criar chapa curva neutra em `gaiolaPorRede` (uma pele curva com abertura e linha de corte de painel) e medir a referência sem relevo (malha, ondulação, zebra e tempo).
2. **Núcleo de anéis concêntricos (`faixaDeContornoNaRede`):** implementar geração de curvas paralelas sobre a superfície-guia, perfil transversal multi-anel, vincos, modulação longitudinal, aba interna e recusa de raio mínimo; provar os três perfis (chanfro, ombro vincado, bojo suave) na fixture neutra.
3. **Continuidade multipainel:** cortar a chapa estampada da fatia 2 em dois painéis separados por vão constante, medir continuidade de altura e normal através da fresta e validar em pintura e zebra na bancada.
4. **Moldura externa evoluída (`conformarNaChapa`):** adicionar `perfil` 2D livre, `modulacao` longitudinal e lista `malhas` com travessia de fresta, mantendo retrocompatibilidade total e testes dedicados.
5. **Prova em produto e documentação:** aplicar na lataria-piloto, comparar lado a lado na bancada com a pessoa, registrar fichas em `capacidade.mjs` e documentar o critério "na malha vs. peça à parte" em `docs/modelar/guias/modelar-carroceria.md`.
6. **Fechamento:** conferir gates, atualizar `PLANOS-ENCERRADOS.md` e devolver eventuais pendências ao backlog.

## Riscos e parada

- **Auto-interseção em contornos de raio fechado:** se o offset sobre a superfície curva gerar dobras em cantos apertados que o encolhimento local ou a recusa clara não resolvam de forma previsível, o plano para na fatia 2 para restringir o contrato de raio mínimo antes de seguir.
- **Vértices extraordinários na emenda da faixa com o resto da rede:** se a transição entre a curva externa da faixa e os retalhos vizinhos criar beliscões visíveis na zebra mesmo com `liso` e `continuidade: 'G1'`, a fatia 2 para e registra o achado junto à linha do G2 no backlog antes de aplicar em produto.
- **Fresta larga demais na projeção multipainel de `conformarNaChapa`:** se a interpolação da normal na fresta gerar degrau visível acima de 0,5 mm na moldura separada, a fatia 4 exige ponte explícita de fresta máxima com recusa acima do teto.

## Fechamento

Preencher somente ao concluir ou cancelar.

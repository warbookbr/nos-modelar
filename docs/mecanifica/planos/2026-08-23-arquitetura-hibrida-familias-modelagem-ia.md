# Arquitetura híbrida nativa de autoria por famílias para IA

**Estado:** ativo
**Responsável:** Codex · **Base:** `8198833`
**Execução:** N0 e N1 concluídos; N2 mantém G01 verde e G02 pendente, sem promoção. N3 foi **revalidada para C1**: a aprovação anterior usou painel e rasterização plana inválidos, foi revogada e substituída por inspeção individual multivista ligada ao manifesto SHA-256. N3.5 foi executada e **rejeitada**: suavização C1 não melhorou materialmente o quarto e aumentou ruptura abrupta. N4 corrigiu uma crista central C0 que o P95 escondia e então aprovou a viabilidade estreita de C2; N5 provou C3 somente sobre alvo sintético. O alvo visual N6 foi aprovado e separado por vista; a primeira blocagem N6.1 foi **reprovada** como cápsula com rodas. N6 reabre somente por testes regionais pareados sobre uma carroceria contínua.

## Por onde começar

Uma IA sem contexto começa por `METODO-DIAGNOSTICO-E-SEU-LIMITE.md` (decidir forma **não** é problema diagnóstico), este plano apenas na fatia aberta e `REFERENCIA-E-CRITICA-VISUAL.md` (alvo, sobreposição e crítico). Código existente que não se reescreve: `tools/mecanifica/capturar-montagem.mjs`, `src/autoria/forma-global.js`, `tools/mecanifica/comparar-alvo.mjs` e `tools/mecanifica/olhar.mjs`.

## O que a evidência obriga a mudar

Cinco tentativas falharam igual: `loft` de seções elípticas; três envelopes sobrepostos; cage quad com Catmull-Clark em doze rodadas; cage direta R2/R2B interrompida; e `laboratorio-isolado/cupe-livre-01/`, feito por **outro modelo, em esforço máximo e sem importar uma linha deste repositório**, mas reprovado — a mesma receita de **catorze seções digitadas à mão**. Mudaram representação, ferramenta, modelo e base; não mudou o ato.

A assinatura é sempre a mesma: **o que é verificável por medida passa, o que só se vê reprova** — dez condições de rejeição verdes e crítico cego em 3/10. Três medidas fecham o diagnóstico:

- três vistas ortográficas deixam **82% das estações sem informação de seção**, e
  duas famílias com as três vistas idênticas diferem 28 mm no flanco
  (`autoria-assistida/experimentos/prova-secoes-por-medida/`);
- o alvo P0 inventado põe o nariz a 520 mm e o perfil **medido** de um cupê real
  põe a 841 mm, abaixo do topo do pneu dianteiro;
- 80 coordenadas viraram 12 parâmetros com nome, e os 12 também foram chutados.

**Causa raiz:** a IA autora em milímetros e a forma é julgada em imagem, e os
dois espaços só se ligam por um laço lento e com perda.

## A inversão

| | hoje | a partir de N3 |
|---|---|---|
| a IA produz | coordenadas | restrições, objetivos, julgamento comparativo |
| quem produz número | a IA, no braço | solver e busca |
| realimentação | render lido a olho | percepção medida **e** visível |

## Práticas retiradas por evidência

1. **Tabela de seções digitada à mão** está proibida como fonte de forma.
2. **Alvo inventado pela IA não é referência vinculante.** Os landmarks do
   `CHASSI-P0-ALVO-E-LIMIARES.md` estão marcados não vinculantes no próprio
   documento.
3. As operações do `DOSSIE-MOTOR-SUPERFICIES-NATIVAS.md` — "ajustar largura,
   tensão e volume por região" — são **metas de solver**, não atos de autoria.
4. **Aprovação por vacuidade**: condição fora de escopo devolve `naoAvaliavel`
   com motivo, nunca `passa`.
5. Prova veicular em **quarto isolado** não decide forma.

## As três capacidades, com o risco de cada uma declarado

### C1 — canal de percepção · risco baixo

A captura tem `superficie`, `normais`, `profundidade`, `wireframe`, `identidade` e `silhueta`, mas não zebra, isófotas e curvatura — a ponte industrial entre julgamento visível e mensurável de superfície. Técnica conhecida e fechada: por isso é a primeira fatia.

### C2 — autoria por restrição · **risco alto, é a incerteza central do plano**

A fonte deixa de conter coordenada e passa a conter enunciado com nome: relação ("o ponto mais largo fica logo abaixo do ombro"), desigualdade ("o capô abaula, nunca afunda"), continuidade ("G1 na linha de ombro"), folga ("40 mm sobre o pneu") e aderência ("silhueta a menos de 25 mm do perfil medido").

**A auditoria acusou aqui o mesmo pecado que o plano denuncia no dossiê antigo:** "um solver satisfaz o conjunto" escondia a coisa mais difícil. Não é fatia entre outras — é a aposta. Correções:

- o solver **não é geral**: resolve apenas a lista fechada de cinco tipos; tipo novo exige fatia com evidência;
- N4 abre com uma **sonda de viabilidade** — uma seção, três restrições — antes de qualquer compromisso;
- se a sonda falhar, a condição de encerramento dispara **ali**, não em N6.

**Leitura corrigida após N3.5:** a sonda de suavização não executou C2; ela só
testou se uma malha histórica ruim poderia ser recuperada depois de pronta. A
resposta foi não. Portanto N4 continua sendo a primeira prova de C2 e precisa
partir de uma representação limpa, não de R2B, cupê livre ou quarto reprovado.

### C3 — busca · risco médio

Onde sobrar liberdade, a IA define o objetivo e uma busca acha os valores. **O espaço de busca é exatamente o grau de liberdade que C2 deixar em aberto — nunca inventado pela IA.** Sem espaço livre bem-definido, C3 fecha vazia; isso evita chamar doze chutes nomeados de avanço.

N3.5 também não executou busca, logo não produz veredito sobre C3. N5 continua
bloqueada até N4 provar uma representação de C2 e declarar ao menos um grau de
liberdade e um objetivo mensurável que possam ser buscados.

## Procedência do número, com gate

Todo valor da fonte declara origem: `medido`, `derivado`, `resolvido` ou
`declarado`. Coordenada crua não é origem válida. `declarado` exige uma frase de
justificativa e é minoria auditável.

Para veículo, a minoria não basta: dimensões do envelope, landmarks `nariz`, eixos, início/fim/pico da cabine e ombros, e contornos de `massa-primaria` não podem ser `declarado`; precisam ser `medido` ou `derivado`. `resolvido` só aparece no candidato de fonte medida/derivada. Falta nessa lista reprova por vacuidade, mesmo abaixo do quinto global.

**Gate obrigatório da abertura N3:** `procedencia:check` será entregue antes do encerramento; reprova valor sem origem, `declarado` acima de um quinto e a lista estrutural acima. Até existir, é requisito aberto — não capacidade alegada.

## Famílias

| Família | Ato de autoria dominante | Referência |
|---|---|---|
| mecânica dimensional | receita procedural atual, **inalterada** | cota e função |
| superfície estilizada (veículo) | restrição proporcional e relacional | prancha medida |
| cobertura sobre base (humanoide) | conformar placa a corpo com folga | cânone humano |
| sistema articulado | juntas, limites e estados | pose e envelope |
| máquina completa | composição por interfaces | conjunto |

Veículo e humanoide **não compartilham o ato de autoria**: carroceria é seção e
silhueta, armadura é projeção e afastamento. Tratar as duas igual foi parte da
falha da sonda humanoide. Compartilham identidade, peça, montagem, revisão,
impacto, interfaces, C1, C2, C3 e o protocolo de crítica.

**O eixo humanoide não está especificado** — uma linha de plano não é projeto, e
o plano ainda não sabe como fazer. N8 exige dossiê próprio antes de abrir.

## Fatias, com teto e marco visível

Cada fatia tem teto de rodadas. **Estourar o teto abre revisão, nunca mais
rodadas** — foi assim que a carroceria chegou a doze.

| Fatia | Teto | Marco que o usuário vê |
|---|---|---|
| N3 — canal de percepção | 4 | zebra individual multivista dos artefatos reprovados |
| N3.5 — sonda de suavização | 2 | rejeitada: quarto só suavizado, sem melhora material |
| N4 — autoria por restrição | 5 | aprovada: duas formas limpas do mesmo enunciado |
| N5 — busca | 3 | vencedor de uma liberdade residual contra alvo sintético |
| N6 — carro por regiões contínuas | 5 | referência regional, forma local e carro inteiro coerentes |
| N7 — integração | 4 | superfície e mecânica ligadas |

**N3 — gate de calibração.** O canal precisa separar artefato reprovado de
superfície sã. Não existe superfície aprovada aqui — o README diz isso —, então o
lado sadio é **sintético e verificável**: esfera, toro e um patch justo, onde a
zebra é regular por construção. O canal precisa mostrar zebra regular nesses,
irregularidade no quarto dianteiro, no R2B e no cupê livre, e ordená-los conforme o
veredito humano. Canal que aprova o que o usuário reprovou não serve.

N3 aprova somente C1, **qualidade de superfície**. Zebra, isófota e curvatura não provam proporção, caráter ou reconhecimento; portanto não fecham G02, não aprovam veículo e não liberam N6. Esses julgamentos voltam no reconhecimento cego do carro inteiro; N3 limita-se a C1, corpus sintético/reprovado, `procedencia:check` e quatro rodadas. **Revalidada em 2026-08-24:** o primeiro painel usava cor plana por triângulo e foi incorretamente tratado como prova; C1 exige raster de normais interpoladas e abertura individual, em tamanho nativo, de cada imagem obrigatória. Métrica e mosaico não aprovam nada; o aceite só vale se `inspecao-individual.json` coincidir por SHA-256 com o manifesto gerado.

**N3.5 — sonda de suavização.** Barata e decisiva; existe porque o plano não
podia ficar quatro fatias sem nada visível. Pega o quarto dianteiro reprovado,
aplica **só energia de suavidade** guiada por C1, sem restrição nem busca, e
mede. Testa exclusivamente a hipótese de que suavidade medida recupera uma
malha histórica ruim antes de gastar N4. **Executada em 2026-08-24 e
rejeitada:** seis iterações fixas preservaram topologia, bordas e quinas, mas
reduziram o P95 da região livre só 0,57% e elevaram a parcela abrupta de 4,211%
para 4,391%; as doze vistas individuais não mostram melhora visível. Isso não
é veredito sobre C2 ou C3; a malha é descartada.

**N4 — sonda de viabilidade de C2.** Concluída e aprovada no escopo estreito:
constrói uma
seção nova e contínua de uma família paramétrica declarada, sem reaproveitar
malha reprovada, e resolve exatamente três restrições: (1) relação de posição
do ponto mais largo abaixo do ombro; (2) desigualdade de capô convexo, sem
afundamento; (3) continuidade G1 na linha de ombro. A prova entrega duas
formas diferentes que satisfazem o mesmo enunciado, abre cada vista C1
individualmente e registra a procedência de cada parâmetro. Falhar dentro do
teto de N4 rejeita C2; passar não aprova veículo.

**N5 — busca residual de C3.** Executada no escopo mínimo: `bojoRelativo` é
o único grau livre da seção N4; a busca enumerou 21 candidatos, mantendo as
três restrições, C1 e diedro máximo ≤ 19°, e escolheu 0,16 para igualar a
sagita sintética medida de 41,6 mm. Isto prova o mecanismo de busca, não um
estilo automotivo. **N6.0** exige alvo aprovado e vistas individuais vinculadas por hash. A primeira N6.1, uma casca genérica por estações, foi reprovada visualmente e não é base. A reabertura N6.1 testa, sem detalhar nem criar peças soltas: (a) recortes regionais derivados das vistas completas, com câmera, escala e hash de origem preservados; (b) edição de uma **região nomeada da mesma carroceria contínua** — dianteira/capô e para-lamas, cabine/cintura, lateral/entrada, ombros/deck traseiro —; (c) comparação individual recorte↔render local e regressão nas quatro vistas completas; e (d) crítico cego que pode reprovar ou devolver `indeterminado`. Um recorte orienta e limita a correção local, mas não autoriza modelar frente, centro ou traseira como objetos a serem colados. Só uma rodada em que todos os marcos regionais e a leitura do conjunto sobrevivam abre superfície/receita; N4/N5 sozinhas não bastam.

## Passivo declarado

Um plano que ignora dívida deixa ela apodrecer. Fica registrado e datado:

- **Sincronização N1/N2 concluída na abertura N3:** `fluxo-autoria-n1-caixa-preta` e `forma-global-n2-caixa-preta` acompanham `avaliarAlvo`/G00 e schema gerado; os quatro casos antes vermelhos precisam permanecer verdes;
- planos congelados — P2, validação integrada e motor de prancha — não voltam
  sem decisão explícita;
- artefatos reprovados viram insumo do gate de calibração do N3.

## Aprovação, parada e saída honesta

Toda prova decide **plataforma** e **artefato** em separado; capacidade aprovada
com artefato reprovado é resultado válido e qualidade só fecha com os dois.
Achado visual grave não é adiado. As camadas de validação seguem como estavam,
mais percepção e procedência.

A condição de encerramento tem **dois braços**, e o segundo veio da auditoria:

> **(a)** se a sonda de viabilidade do N4 não fechar dentro do teto, a
> conclusão é que **a autoria por restrição não se provou construível aqui**;
> **(b)** se N6 falhar no reconhecimento cego com N3, N4 e N5 aprovados, a
> conclusão é que **autoria de superfície automotiva por IA está fora de alcance
> nesta plataforma no estado atual**.

Nos dois casos o alvo passa a ser editar, validar, montar e raciocinar sobre
geometria vinda de fora, onde a base já é forte — critério escrito antes, para a
sexta tentativa não virar a sétima por inércia.

## Fora de escopo

Software externo como dependência ou rota de produção, clone de Blender ou CAD,
produção final, fabricação, solver universal, UV, textura e escultura livre antes
de um gate provar que são essenciais à forma.

## Registro

- **V1 — 2026-08-23:** plano ativado após o R2B.
- **V2 — 2026-08-24:** reescrito de N3 em diante: o plano dizia **o que** autorar, não **como a IA decide o número**.
- **V3 — 2026-08-24:** auditoria corrigiu dez defeitos: C2 escondia a parte difícil, N3 exigia uma superfície sã inexistente e C3 não justificava seu espaço de busca. Entraram sonda N4 e segundo braço de encerramento, lado sadio sintético, N3.5 barato, teto de rodadas, procedência, passivo, ponto de entrada e humanoide não especificado.
- **V4 — 2026-08-24:** N3 aberto após sincronizar as quatro provas públicas N1/N2. Percepção declara seu limite — superfície não é reconhecimento veicular —, procedência estrutural não se esconde no teto global e o verificador é entrega N3, não capacidade presumida.
- **V5 — 2026-08-24:** N3 encerrou C1 com painel visual inspecionado, corpus reprodutível e `procedencia:check`; N3.5 permanece parada até autorização. A calibração só separa o veredito binário disponível, sem fabricar ranking estético dos rejeitados.
- **V6 — 2026-08-24:** a inspeção individual corrigiu a V5: painel lado a lado e cor plana por triângulo não provaram C1. N3 reabre com raster de normais interpoladas, imagens individuais multivista e bloqueio de N3.5 até aceite visual válido.
- **V7 — 2026-08-24:** C1 foi revalidada: os 42 diagnósticos foram abertos individualmente, os controles não mostraram triangulação/costura espúria e os rejeitados mantiveram falhas reais. O aceite é vinculado ao manifesto SHA-256; qualquer imagem regenerada sem inspeção correspondente perde o gate.
- **V8 — 2026-08-24:** N3.5 rejeitou a hipótese de que suavização C1 isolada recupera o quarto histórico: preservou topologia, mas a redução de rugosidade foi imaterial e a ruptura abrupta cresceu. Nenhuma malha foi promovida.
- **V9 — 2026-08-24:** corrigida a inferência da N3.5: ela não testa C2 nem C3. N4 é a próxima prova de autoria por restrição, construída do zero sobre uma seção limpa; N5 permanece bloqueada até haver liberdade residual e objetivo mensurável.
- **V10 — 2026-08-24:** N4 aprovou a viabilidade estreita de C2: duas seções novas, diferentes e C1-regulares obedecem as mesmas três restrições, com procedência e inspeção individual vinculada ao manifesto. N5 não abriu: não existe liberdade residual/objetivo de busca declarado.
- **V11 — 2026-08-24:** a inspeção individual de N5 revelou uma crista central C0 que o P95 de N4 escondia. O aceite N4 foi revogado, a base do capô foi reescrita com tangentes nulas no centro/ombro e diedro máximo passou a ser gate. N4 foi revalidada; N5 então provou C3 sobre `bojoRelativo` e alvo sintético. O usuário aprovou uma prancha N6; ela foi recortada/hashada e só abre a preparação, com pareamento vista↔vista obrigatório.
- **V12 — 2026-08-24:** a primeira N6.1 isolada confirmou a causa já documentada: casca por estações e rodas anexadas não produzem leitura automotiva, embora gerem arquivos e métricas. A tentativa foi reprovada e passa a ser evidência negativa. A reabertura é regional, mas preserva uma única carroceria: recortes por região vêm das vistas completas, carregam a mesma escala/câmera/hash e toda edição local regressa o conjunto inteiro.

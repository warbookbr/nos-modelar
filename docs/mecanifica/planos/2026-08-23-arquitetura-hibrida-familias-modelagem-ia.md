# Arquitetura híbrida nativa de autoria por famílias para IA

**Estado:** ativo
**Responsável:** Codex · **Base:** `8198833`
**Execução:** N0 e N1 concluídos; N2 mantém G01 verde e G02 pendente, sem promoção. N3 está **concluída** com C1 calibrado e procedência verificável; N3.5 é a próxima sonda, ainda não aberta.

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

### C3 — busca · risco médio

Onde sobrar liberdade, a IA define o objetivo e uma busca acha os valores. **O espaço de busca é exatamente o grau de liberdade que C2 deixar em aberto — nunca inventado pela IA.** Sem espaço livre bem-definido, C3 fecha vazia; isso evita chamar doze chutes nomeados de avanço.

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
| N3 — canal de percepção | 4 | zebra dos artefatos reprovados lado a lado |
| N3.5 — sonda de suavização | 2 | o quarto reprovado, só suavizado |
| N4 — autoria por restrição | 5 | duas formas do mesmo enunciado |
| N5 — busca | 3 | melhor candidato contra ajuste no braço |
| N6 — carro inteiro bruto | 5 | o carro |
| N7 — integração | 4 | superfície e mecânica ligadas |

**N3 — gate de calibração.** O canal precisa separar artefato reprovado de
superfície sã. Não existe superfície aprovada aqui — o README diz isso —, então o
lado sadio é **sintético e verificável**: esfera, toro e um patch justo, onde a
zebra é regular por construção. O canal precisa mostrar zebra regular nesses,
irregularidade no quarto dianteiro, no R2B e no cupê livre, e ordená-los conforme o
veredito humano. Canal que aprova o que o usuário reprovou não serve.

N3 aprova somente C1, **qualidade de superfície**. Zebra, isófota e curvatura não provam proporção, caráter ou reconhecimento; portanto não fecham G02, não aprovam veículo e não liberam N6. Esses julgamentos voltam no reconhecimento cego do carro inteiro; N3 limita-se a C1, corpus sintético/reprovado, `procedencia:check` e quatro rodadas. **Encerrada em 2026-08-24:** o [relatório N3](../RELATORIO-N3-CANAL-PERCEPCAO.md) registra controles sadios regulares e quarto, R2B e Cupê-livre irregulares; a ordenação humana disponível é binária, logo C1 separa classes e não inventa ranking estético entre reprovados.

**N3.5 — sonda de suavização.** Barata e decisiva; existe porque o plano não
podia ficar quatro fatias sem nada visível. Pega o quarto dianteiro reprovado,
aplica **só energia de suavidade** guiada por C1, sem restrição nem busca, e
mede. Testa a hipótese central — suavidade medida melhora o que humano julga —
antes de gastar N4. Se não melhorar, C2 e C3 ficam sob suspeita.

**N4** não começa sem N3 calibrado. **N6** não começa sem N4 e N5.

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
- **V2 — 2026-08-24:** reescrito de N3 em diante. O plano anterior dizia **o
  que** autorar e não **como a IA decide o número**.
- **V3 — 2026-08-24:** auditoria corrigiu dez defeitos: C2 escondia a parte difícil, N3 exigia uma superfície sã inexistente e C3 não justificava seu espaço de busca. Entraram sonda N4 e segundo braço de encerramento, lado sadio sintético, N3.5 barato, teto de rodadas, procedência, passivo, ponto de entrada e humanoide não especificado.
- **V4 — 2026-08-24:** N3 aberto após sincronizar as quatro provas públicas N1/N2. Percepção declara seu limite — superfície não é reconhecimento veicular —, procedência estrutural não se esconde no teto global e o verificador é entrega N3, não capacidade presumida.
- **V5 — 2026-08-24:** N3 encerrou C1 com painel visual inspecionado, corpus reprodutível e `procedencia:check`; N3.5 permanece parada até autorização. A calibração só separa o veredito binário disponível, sem fabricar ranking estético dos rejeitados.

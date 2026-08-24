# Arquitetura híbrida nativa de autoria por famílias para IA

**Estado:** ativo
**Responsável:** Codex · **Base:** `8198833`
**Execução:** N0 e N1 concluídos, N2 com G01 verde e G02 pendente. De N3 em
diante foi reescrito e revisado por auditoria do próprio plano.

## Por onde começar

Uma IA sem contexto começa nesta ordem: `METODO-DIAGNOSTICO-E-SEU-LIMITE.md`
(decidir forma **não** é problema diagnóstico); este plano, só a fatia aberta;
`REFERENCIA-E-CRITICA-VISUAL.md`, o laço de alvo, sobreposição e crítico. Código
que já existe e não se reescreve: `tools/mecanifica/capturar-montagem.mjs`,
`src/autoria/forma-global.js`, `tools/mecanifica/comparar-alvo.mjs` e
`tools/mecanifica/olhar.mjs`.

## O que a evidência obriga a mudar

Cinco tentativas falharam igual: `loft` de seções elípticas; três envelopes
sobrepostos; cage quad com Catmull-Clark em doze rodadas; a cage direta R2/R2B,
interrompida; e `laboratorio-isolado/cupe-livre-01/`, feito por **outro
modelo, em esforço máximo, sem importar uma linha deste repositório**, e
reprovado — cuja receita faz o mesmo que todas, **catorze seções digitadas à
mão**. Mudaram representação, ferramenta, modelo e base. Não mudou o ato.

A assinatura é sempre a mesma: **o que é verificável por medida passa, o que só
se vê reprova** — dez condições de rejeição verdes e crítico cego em 3/10. Três
medidas fecham o diagnóstico:

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

A captura tem `superficie`, `normais`, `profundidade`, `wireframe`, `identidade`
e `silhueta`, e **não tem** o que a indústria usa para julgar superfície:
**zebra, isófotas e curvatura**. Zebra torta é defeito, zebra reta e espaçada é
superfície boa — julgável a olho **e** mensurável no mesmo artefato, a ponte que
falta. Técnica conhecida e fechada: por isso é a primeira fatia.

### C2 — autoria por restrição · **risco alto, é a incerteza central do plano**

A fonte deixa de conter coordenada e passa a conter enunciado com nome: relação
("o ponto mais largo fica logo abaixo do ombro"), desigualdade ("o capô abaula,
nunca afunda"), continuidade ("G1 na linha de ombro"), folga ("40 mm sobre o
pneu") e aderência ("silhueta a menos de 25 mm do perfil medido").

**A auditoria acusou aqui o mesmo pecado que o plano denuncia no dossiê antigo:**
"um solver satisfaz o conjunto" era uma frase para a coisa mais difícil de tudo.
Não é fatia entre outras — é a aposta. Correções:

- o solver **não é geral**. Ele resolve a lista fechada de cinco tipos acima, e
  só. Tipo novo exige fatia nova com evidência;
- N4 abre com uma **sonda de viabilidade** num caso mínimo — uma seção, três
  restrições — antes de qualquer compromisso com o resto;
- se a sonda falhar, a condição de encerramento dispara **ali**, não em N6.

### C3 — busca · risco médio

Onde sobrar liberdade, a IA não chuta: define o objetivo e uma busca acha os
valores. **O espaço de busca é exatamente o grau de liberdade que C2 deixar em
aberto — nunca um espaço inventado pela IA.** Se C2 não deixar espaço livre
bem-definido, C3 não se aplica e a fatia fecha vazia. Isso fecha a armadilha em
que a IA caiu ao chamar de avanço doze parâmetros que também eram chute.

## Procedência do número, com gate

Todo valor da fonte declara origem: `medido`, `derivado`, `resolvido` ou
`declarado`. Coordenada crua não é origem válida. `declarado` exige uma frase de
justificativa e é minoria auditável.

**Gate executável:** `procedencia:check` lê a fonte e reprova valor sem origem, e
reprova quando `declarado` passa de um quinto dos valores. Regra sem gate
apodrece — este repositório já provou isso.

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

**N3.5 — sonda de suavização.** Barata e decisiva; existe porque o plano não
podia ficar quatro fatias sem nada visível. Pega o quarto dianteiro reprovado,
aplica **só energia de suavidade** guiada por C1, sem restrição nem busca, e
mede. Testa a hipótese central — suavidade medida melhora o que humano julga —
antes de gastar N4. Se não melhorar, C2 e C3 ficam sob suspeita.

**N4** não começa sem N3 calibrado. **N6** não começa sem N4 e N5.

## Passivo declarado

Um plano que ignora dívida deixa ela apodrecer. Fica registrado e datado:

- **4 testes vermelhos na main** em `fluxo-autoria-n1-caixa-preta` e
  `forma-global-n2-caixa-preta`: a API do N2 ganhou `avaliarAlvo` e a prova
  caixa-preta não acompanhou. Resolver **antes** de abrir N3;
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
- **V3 — 2026-08-24:** revisado por auditoria do próprio plano, dez defeitos.
  Os três graves: C2 escondia a coisa mais difícil numa frase, o mesmo pecado
  que o plano denuncia no dossiê antigo; o gate do N3 **não podia ser
  executado**, por exigir uma superfície sã que não existe aqui; e C3 movia o
  problema um andar acima sem dizer de onde vinha o espaço de busca. Entram
  sonda de viabilidade e segundo braço de encerramento em N4, lado sadio
  sintético em N3, N3.5 como marco barato, teto de rodadas, gate de procedência,
  passivo declarado, ponto de entrada, e humanoide marcado não especificado.

# Arquitetura híbrida nativa de autoria por famílias para IA

**Estado:** ativo
**Responsável:** Codex
**Repositório e base:** `warbookbr/nos-mecanifica`, `0d99700`
**Execução:** N0 e N1 concluídos. N2 entregue com G01 verde e G02 pendente. N3
em diante foi **reescrito** nesta revisão, pelo motivo da seção seguinte.

## O que a evidência obriga a mudar

Cinco tentativas de dar forma a uma carroceria falharam do mesmo jeito: `loft`
de seções elípticas; três envelopes sobrepostos com 1.014 vértices; cage quad
com Catmull-Clark em doze rodadas; a cage direta R2/R2B, interrompida; e o
experimento `laboratorio-isolado/cupe-livre-01/`, feito por **outro modelo,
em esforço máximo, sem importar uma linha deste repositório**, e reprovado.

Abrindo a receita do cupê livre, ela faz o mesmo que todas as outras: **catorze
seções transversais digitadas à mão, com números tirados da cabeça**. Mudaram a
representação, a ferramenta, o modelo e a base de código. Não mudou o ato.

A assinatura da falha é sempre a mesma: **o que é verificável por medida passa,
o que só se vê reprova.** Dez condições de rejeição verdes e crítico cego em
3/10 não é coincidência.

Três medidas desta rodada fecham o diagnóstico:

- três vistas ortográficas deixam **82% das estações sem informação de seção**;
  duas famílias com as três vistas idênticas ainda diferem 28 mm no flanco
  (`autoria-assistida/experimentos/prova-secoes-por-medida/`);
- o alvo P0 que a própria IA inventou põe o nariz a 520 mm; o perfil **medido**
  de um cupê fastback real põe a 841 mm — 321 mm abaixo, e abaixo do topo do
  pneu dianteiro;
- trocar 80 coordenadas por 12 parâmetros com nome não resolveu: os 12 também
  foram chutados, com nome bonito em cima.

**Causa raiz:** a IA autora em milímetros e a forma é julgada em imagem. Os dois
espaços só se ligam por um laço lento e com perda — renderizar e olhar. Tudo que
a IA consegue verificar sozinha é ortogonal ao que decide o aceite.

## A inversão

| | hoje | a partir de N3 |
|---|---|---|
| a IA produz | coordenadas | restrições, objetivos e julgamento comparativo |
| quem produz número | a IA, no braço | solver e busca |
| realimentação | render lido a olho | canal de percepção medido **e** visível |

A IA passa a fazer o que faz bem — nomear, relacionar, restringir, escrever
código, comparar candidatos — e para de fazer o que faz mal: emitir coordenada
absoluta e prever como um número vira sombra.

## Práticas retiradas por evidência

1. **Tabela de seções digitada à mão está proibida** como fonte de forma. Cinco
   tentativas, duas famílias de modelo, mesmo resultado.
2. **Alvo inventado pela IA não é referência vinculante.** Os landmarks do
   `CHASSI-P0-ALVO-E-LIMIARES.md` passam a `não vinculantes` até serem
   confrontados com dado medido; o erro de 321 mm no nariz é a prova.
3. A lista de operações do `DOSSIE-MOTOR-SUPERFICIES-NATIVAS.md` — "ajustar
   largura, altura, seção, tensão e volume por região" — descreve **metas de
   solver**, não atos de autoria. Reescrever nesses termos.
4. **Aprovação por vacuidade** em detector é falha do detector: condição fora de
   escopo devolve `naoAvaliavel` com motivo, nunca `passa`.
5. Prova veicular em **quarto isolado** não decide forma. Já estava no dossiê;
   passa a ser impeditivo.

## Três capacidades novas, compartilhadas entre famílias

### C1 — canal de percepção

Hoje a captura tem `superficie`, `normais`, `profundidade`, `wireframe`,
`identidade` e `silhueta`. Falta exatamente o que a indústria usa para julgar
superfície: **linhas de reflexo — zebra e isófotas — e mapa de curvatura**.
Zebra torta, apertada ou quebrada é defeito de superfície; zebra reta e
espaçada é superfície boa. É julgável a olho **e mensurável no mesmo artefato**.

É o que liga os dois espaços que hoje não se falam.

### C2 — autoria por restrição

A fonte editável deixa de conter coordenada. Contém enunciado com nome:

- relação — "o ponto mais largo fica logo abaixo do ombro";
- desigualdade — "o capô abaula, nunca afunda";
- continuidade — "G1 do para-lama dianteiro ao traseiro na linha de ombro";
- folga — "40 mm uniformes sobre o pneu no arco";
- aderência — "silhueta lateral a menos de 25 mm do perfil medido".

Um solver satisfaz o conjunto. O que ficar subdeterminado é resolvido por
energia de suavidade — que é, não por acaso, o que faz superfície parecer boa.

### C3 — busca sobre parâmetros semânticos

Onde sobrar liberdade, a IA **não chuta**: define o objetivo (C1 + aderência à
referência + restrições de C2) e uma busca acha os valores. A IA julga os
finalistas por comparação, que é onde ela é forte, em vez de gerar em absoluto,
que é onde ela é fraca.

## Aprovação em dois eixos

Mantida sem mudança. Toda prova decide **plataforma** e **artefato** em
separado. Capacidade aprovada com artefato reprovado é resultado válido; prova
de qualidade só fecha com os dois. Achado visual grave não é adiado.

## Famílias

| Família | Ato de autoria dominante | Referência |
|---|---|---|
| mecânica dimensional | receita procedural atual, **inalterada** | cota e função |
| superfície estilizada (veículo) | restrição proporcional e relacional | prancha medida e landmarks |
| cobertura sobre base (humanoide) | **conformar placa a corpo com folga** | cânone de proporção humana |
| sistema articulado | juntas, limites e estados | pose e envelope |
| máquina completa | composição por interfaces | conjunto |

Veículo e humanoide **não compartilham o ato de autoria**. Carroceria é seção e
silhueta; armadura é projeção e afastamento sobre uma base corporal. Tratar as
duas com o mesmo mecanismo foi parte da falha da sonda humanoide.

Compartilham tudo o mais: identidade, peça, montagem, revisão, impacto,
interfaces, C1, C2, C3 e o protocolo de crítica.

## Fatias

1. **N0 — verdade.** Concluída.
2. **N1 — contrato.** Concluída.
3. **N2 — forma global.** Entregue; G02 aberto. **Não avança sem N3.**
4. **N3 — canal de percepção (C1).** Zebra, isófotas e curvatura, renderizados
   e medidos. **Gate de calibração:** o canal precisa separar os artefatos que
   humanos já reprovaram — quarto dianteiro, R2B e Cupê livre — de uma
   superfície de referência sã. Canal que aprova o que o usuário reprovou não
   serve, e a evidência para calibrar já existe no repositório.
5. **N4 — autoria por restrição (C2).** Gate: a fonte de autoria de um corpo
   inteiro **não contém uma coordenada sequer**, e duas formas visivelmente
   diferentes saem do mesmo conjunto mudando só enunciado declarado.
6. **N5 — busca (C3).** Gate: no mesmo orçamento, a busca vence o ajuste no
   braço, medido por C1 e por aderência à referência.
7. **N6 — carro inteiro bruto.** Corpo completo, nunca quarto. Reconhecimento
   cego e aceite do usuário antes de qualquer detalhe.
8. **N7 — integração.** Superfície e mecânica ligadas por interfaces.
9. **N8 — humanoide.** Corpo-base e poucas placas conformadas e conectadas, com
   o solver de conformação, sem regra de carro no núcleo.
10. **N9 — Agent-First.** Descoberta, edição, captura e gates por serviço,
    skill e MCP.
11. **N10 — decisão.** Promover, corrigir, redesenhar ou remover por evidência.

N4 não começa sem N3 calibrado. N6 não começa sem N4 e N5. N8 não começa se N7
depender de regra automotiva.

## Validadores e porteiros

Camadas estrutural, forma global, superfície, conectividade, interface,
contexto, estados e visual permanecem como estavam, com dois acréscimos:

- **percepção** — zebra, isófotas e curvatura entram como camada medida;
- **procedência do número** — todo valor da fonte de autoria declara origem:
  `medido`, `derivado`, `resolvido` ou `declarado`. `declarado` é minoria
  auditável e precisa de uma frase de justificativa. Coordenada crua não é
  origem válida.

`relacoes: []` continua falha em conjunto que exige encaixe. `Low poly` só vale
declarado. Peça isolada não aprova máquina.

## Parada e saída honesta

Três blocagens não reconhecíveis revisam referência, representação ou
ferramenta. Além disso, esta revisão declara uma **condição de encerramento**:

> Se N6 falhar no reconhecimento cego depois de N3, N4 e N5 aprovados, a
> conclusão registrada é que **autoria de superfície automotiva por IA está
> fora de alcance nesta plataforma no estado atual**, e o alvo do repositório
> passa a ser editar, validar, montar e raciocinar sobre geometria de
> superfície vinda de fora — que é onde a base já é forte.

Isso não é desistência antecipada: é o critério escrito antes, para que a sexta
tentativa não vire a sétima por inércia.

## Fora de escopo

Software externo como dependência ou rota de produção, clone de Blender ou CAD,
produção final, fabricação, solver universal prematuro, UV, textura e escultura
livre antes de um gate provar que são essenciais à forma.

## Registro

- **V1 — 2026-08-23:** plano ativado após o R2B, com dois eixos de decisão,
  famílias, andaime global e superfície semântica.
- **V2 — 2026-08-24:** reescrito de N3 em diante. O plano anterior descrevia
  **o que** autorar e não **como a IA decide o número**, e todas as operações do
  dossiê de superfícies terminavam em "ajustar valor" — o ato que cinco provas
  já mostraram não funcionar. Entram o canal de percepção, a autoria por
  restrição, a busca, a procedência obrigatória do número, a separação do ato de
  autoria entre veículo e humanoide, e uma condição de encerramento escrita.

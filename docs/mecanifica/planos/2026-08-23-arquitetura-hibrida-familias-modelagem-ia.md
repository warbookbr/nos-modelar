# Modelador por seleção — a IA escolhe, não desenha

**Estado:** ativo
**Responsável:** Codex · **Base:** `3bf1b19`
**Dossiê vinculante:** [`../DOSSIE-MODELADOR-POR-SELECAO.md`](../DOSSIE-MODELADOR-POR-SELECAO.md)
**Execução:** N0 a N5 concluídos. N6 e o que vinha depois foram **cancelados** em
2026-08-24, por decisão do usuário, depois da sexta reprovação de forma. Este
plano é a execução do dossiê.

## Por onde começar

Nesta ordem: `GOTCHAS-AUTORIA-VISUAL.md`, o registro do que já falhou;
`METODO-DIAGNOSTICO-E-SEU-LIMITE.md`, que diz por que decidir forma não é
problema de diagnóstico; o dossiê acima; e este plano, só na fatia aberta.
Código existente que não se reescreve:
`tools/mecanifica/capturar-montagem.mjs`, `tools/mecanifica/percepcao-superficie.mjs`,
`tools/mecanifica/comparar-alvo.mjs`, `tools/mecanifica/olhar.mjs` e
`src/autoria/forma-global.js`.

## Por que o caminho anterior foi cancelado

Seis tentativas falharam do mesmo jeito. Todas pediram que a IA **produzisse** o
formato, e todas terminaram com alguém digitando números — inclusive uma feita
por outro modelo, em esforço máximo, sem tocar neste repositório. Mudaram
representação, ferramenta, modelo e base de código. Não mudou o ato.

A aposta anterior era um resolvedor de restrições. Ela sai não por ter falhado,
mas porque **as restrições que decidem se algo parece um carro não são
escrevíveis** — ninguém sabe enunciar como regra o que faz um para-lama parecer
certo, e se soubesse o problema já estaria resolvido.

## A assimetria que sustenta o plano

Medida nesta investigação, várias vezes:

- **produzir forma: ruim.** Seis tentativas, seis reprovações;
- **julgar comparando: bom.** A IA identificou corretamente flanco sem volume,
  capô em calha, nariz aberto e frente sem leitura, todos confirmados depois por
  medida ou pelo usuário; um revisor cego, vendo só imagens, deu vereditos
  consistentes; e a primeira sobreposição contra o alvo produziu o achado certo
  em segundos, depois de doze rodadas falhando em criar.

O mecanismo usa a IA no que ela acerta e tira dela o que ela erra.

## O mecanismo, em uma frase

> A estrutura de carro é fixa. Um gerador simples varia **as linhas de caráter**.
> Um costurador estica a pele entre elas. A IA **ordena** candidatos. Um julgador
> aprendido com essas ordenações permite rodar centenas de vezes sem gastar turno.
> O vencedor já nasce editável, porque a coisa que gera é a mesma que edita.

O detalhe de cada camada está no dossiê. Três pontos que este plano fixa:

1. a IA **nunca escolhe um valor** — ela ordena;
2. o gerador **pode ser burro**; ele varia, não julga;
3. **ordenar não é aprovar.** Mosaico ordena e nunca promove; inspeção
   individual continua obrigatória para o que avançar, pela regra em V-07.

## O que o plano assume, e como cada coisa quebra

As caixas de variação são desenhadas à mão, e isso limita o alcançável. A
diferença para a armadilha em V-30 é que ali a IA escolhia os valores; aqui não
escolhe nenhum. E a caixa apertada **se denuncia sozinha**: se os melhores
candidatos vivem encostados na borda de uma caixa, a caixa está limitando a
forma, e isso é medido e reportado.

Os cinco riscos e o teste de cada um estão no dossiê; os dois primeiros são baratos e vêm antes de qualquer investimento, e é por isso que S0 e S1 existem.

## Fatias

Cada fatia tem teto. Estourar o teto abre revisão, nunca mais rodadas.

| Fatia | Teto | O que responde ou entrega | Marco visível |
|---|---|---|---|
| S0 | 2 | as caixas alcançam um carro? | a folha das cem linhas |
| S1 | 2 | a IA é coerente ao ordenar? | a concordância dela consigo mesma |
| S2 | 4 | o costurador: linhas viram pele | uma carroceria qualquer, inteira |
| S3 | 4 | o laço de seleção com a IA ordenando | a convergência em imagens |
| S4 | 5 | julgador aprendido e busca em volume | centenas de rodadas sem turno |
| S5 | 5 | o carro | reconhecimento cego e aceite |
| S6 | 4 | edição por intenção sobre o vencedor | o mesmo carro, alterado |
| S7 | 4 | ligação com a mecânica | o conjunto |

### S0 — as caixas alcançam um carro?

Gerar cem conjuntos de linhas e olhar. Uma pergunta só: **alguma está no bairro
certo?** Conjunto de linhas se olha direto, sem construir superfície, então é o
teste mais barato que existe e vem primeiro.

Passa se algumas lerem como carro em proporção e postura, mesmo toscas. Reprova
se todas forem cápsula, caixa ou bloco — aí o problema é o gerador, não a
seleção, e o plano volta à mesa antes de gastar o resto.

### S1 — a IA é coerente ao ordenar?

Mostrar os mesmos pares duas vezes, embaralhados, e medir se ela concorda consigo mesma. Se não concordar, o mecanismo inteiro cai, e é melhor saber aqui do que na quinta fatia. É o teste que a investigação anterior nunca fez sobre a própria capacidade que estava usando.

### S2 — o costurador

Linhas viram pele por interpolação transfinita entre os quatro contornos de cada
região. Arcos e vão envidraçado são recortes, não peças coladas. Regiões
vizinhas compartilham a linha de contorno, que é o que impede painel colado e
volume anexo — os dois sintomas que reprovaram tentativas anteriores.

Aqui não se julga beleza: julga-se se a pele fecha, se as regiões concordam e se
o canal de percepção não acusa defeito — ele está com o braço de diedro reaberto
em V-08 e precisa ser normalizado antes de voltar a valer como evidência.

### S3 — o laço de seleção

Gerar leva, renderizar, mostrar junto, a IA ordena, a leva seguinte nasce em
volta das melhores com variação menor, repete. O usuário entra de vez em quando,
só para dizer se a direção é a que ele quer.

### S4 — julgador aprendido e volume

Das ordenações da IA se ajusta um previsor do gosto; a busca roda contra ele sem
custo de turno e volta periodicamente para correção. Duas medidas obrigatórias:
acerto fora da amostra, e variedade da população ao longo das rodadas. Previsor
que ninguém confere vira ficção, e busca sem variedade colapsa cedo.

### S5 — o carro

Corpo completo, nunca um pedaço. Reconhecimento cego por revisor sem contexto e
aceite do usuário antes de qualquer detalhe.

### S6 — edição por intenção

Baixar o teto, alongar o capô, mudar a frente. Sai quase de graça porque o
conjunto de linhas é a representação editável, mas precisa de prova: a alteração
faz o que foi pedido e não estraga o resto.

### S7 — integração

Superfície ligada às peças mecânicas pelas interfaces que já existem.

## O que continua valendo do trabalho anterior

Nada disso é descartado, e nada disso julga forma: identidade, peças, montagem,
revisão, impacto e revalidação, que são a razão de S6 e S7 serem viáveis; o
canal de percepção, agora como detector de defeito e não juiz de forma, com V-08
reaberto; a comparação contra alvo, o olhar e o crítico cego; a procedência do
número, que o gerador declara como qualquer outra fonte; e o registro de falhas,
que é leitura obrigatória antes de abrir experimento — V-31 existe porque uma
rodada já foi gasta redescobrindo o que estava medido ali.

## Práticas proibidas, por evidência

1. **A IA digitar coordenada ou parâmetro de forma.** Seis provas. Vale também
   para família de curvas escrita à mão que satisfaz restrições por construção.
2. **Alvo inventado pela IA como referência vinculante.** O nariz do alvo
   anterior estava 321 mm abaixo do medido num carro real.
3. **Aprovação por painel, mosaico ou métrica.** Mosaico ordena, não promove.
4. **Detector devolvendo `passa` fora do escopo.** Devolve `naoAvaliavel`.
5. **Prova de forma em pedaço isolado.** Corpo inteiro ou nada.
6. **Consertar forma ruim depois de pronta.** Hipótese já reprovada.

## Aprovação e parada

Toda prova decide **plataforma** e **artefato** em separado; capacidade aprovada
com artefato reprovado é resultado válido, e qualidade só fecha com os dois.
Achado visual grave não é adiado.

A condição de encerramento tem quatro braços. O último existe porque a versão
anterior foi contornada por redação — ver V-32:

> **(a)** S0 sem nenhuma variação no bairro certo: **o gerador não alcança**;
> **(b)** S1 com a IA incoerente consigo mesma: **a assimetria não se sustenta**;
> **(c)** S3 rodando até o teto sem convergir: **a seleção não conduz**;
> **(d)** qualquer reprovação de forma em S5 encerra a fatia e obriga decisão
> explícita do usuário — nenhuma leitura de redação sobre o que foi "estreito"
> ou "sintético" reabre por conta própria.

Nos quatro casos, o alvo do repositório passa a ser editar, validar, montar e
raciocinar sobre geometria vinda de fora, onde a base já é forte.

## Fora de escopo

Software externo como dependência ou rota de produção, clone de programa de
modelagem, produção final, fabricação, UV, textura e escultura livre. O eixo
humanoide segue **não especificado** e exige dossiê próprio antes de abrir.

## Registro

- **V1 — 2026-08-23:** plano ativado após o R2B.
- **V2 — 2026-08-24:** reescrito porque dizia o que autorar e não como a IA
  decide o número.
- **V3 — 2026-08-24:** auditoria do próprio plano, dez defeitos corrigidos.
- **V4 — 2026-08-24:** mudança de mecanismo por decisão do usuário. A autoria por
  restrição sai; entra ordenar candidatos.
- **V5 — 2026-08-24:** o mecanismo vira **projeto completo**, com dossiê próprio,
  a pedido do usuário e sem pressa por resultado rápido. A decisão central passa
  a ser explícita: **o gerador varia linhas de caráter, não seções**, porque é
  nas linhas que mora a diferença entre um carro comum e um bonito, e variar
  tabela de seção era variar ruído. Entram o costurador entre linhas, o julgador
  aprendido que torna o volume possível, variedade e memória contra colapso, e a
  entrega já editável — o conjunto de linhas é a mesma coisa que gera e que
  edita. Entram também dois testes baratos que o trabalho anterior nunca fez:
  se as caixas alcançam um carro, e se a IA é coerente consigo mesma ao ordenar.

# Autoria por seleção — a IA escolhe, não desenha

**Estado:** ativo
**Responsável:** Codex · **Base:** `2a74b7e`
**Execução:** N0 a N5 concluídos com o resultado registrado abaixo. **N6 e o que
vinha depois estão cancelados** e substituídos por S0–S4, por decisão do usuário
em 2026-08-24, depois da sexta reprovação de forma.

## Por onde começar

Uma IA sem contexto lê, nesta ordem: `GOTCHAS-AUTORIA-VISUAL.md`, que é o
registro do que já falhou e por quê; `METODO-DIAGNOSTICO-E-SEU-LIMITE.md`, que
diz por que decidir forma não é problema de diagnóstico; e este plano, só na
fatia aberta. Código que já existe e não se reescreve:
`tools/mecanifica/capturar-montagem.mjs`, `tools/mecanifica/percepcao-superficie.mjs`,
`tools/mecanifica/comparar-alvo.mjs`, `tools/mecanifica/olhar.mjs` e
`src/autoria/forma-global.js`.

## Por que o plano anterior foi cancelado

Seis tentativas de dar forma a uma carroceria falharam do mesmo jeito. Todas
pediram que a IA **produzisse** o formato, e todas terminaram com alguém
digitando números. Mudaram representação, ferramenta, modelo e base de código —
incluindo uma tentativa de outro modelo, em esforço máximo, sem tocar neste
repositório. Não mudou o ato, e não mudou o resultado.

A aposta central do plano anterior era um resolvedor de restrições. Ela não foi
descartada por ter falhado: foi descartada porque as restrições que decidem se
algo parece um carro **não são escrevíveis**. Ninguém sabe enunciar como regra o
que faz um para-lama parecer certo. Se soubesse, o problema já estaria resolvido.

## A assimetria que sustenta o plano novo

Está medida nesta investigação, várias vezes:

- **produzir forma: ruim.** Seis tentativas, seis reprovações;
- **julgar forma comparando: bom.** A IA identificou corretamente flanco sem
  volume, capô em calha, nariz aberto e frente sem leitura — todos confirmados
  depois por medida ou pelo usuário. Um revisor cego, vendo só imagens, deu
  vereditos consistentes e certos. E a primeira sobreposição contra o alvo
  produziu o achado certo em segundos, depois de doze rodadas falhando em criar.

O mecanismo novo usa a IA no que ela acerta e tira dela o que ela erra.

## O mecanismo

> **Alguma coisa gera muitas variações. A IA escolhe. A próxima leva nasce em
> volta da escolhida. Repete até convergir.**

É o princípio do retrato falado. A testemunha não sabe desenhar o rosto, mas
sabe apontar qual dos nove está mais perto; repetindo, chega-se a um rosto que
ela jamais desenharia. Ela não ganhou habilidade de desenho — foi usada no que
sabe fazer.

Três diferenças em relação a tudo que já foi tentado:

1. a IA **nunca escolhe um valor**. Ela ordena candidatos;
2. o gerador **pode ser burro**. Ele não precisa saber o que é bonito, só
   precisa variar bastante e rápido, dentro do formato geral de carro;
3. o volume é o ponto. Doze rodadas não é iteração — é uma tentativa dividida em
   doze. Um projetista faz doze ajustes em um minuto. Com rodada barata e sem
   depender do usuário, dá para fazer centenas.

## O que este plano assume, e como isso pode quebrar

**O espaço do gerador precisa alcançar um carro bom.** Se nenhuma combinação
possível chega perto, ordenar não adianta — seleção acha o melhor do que existe,
não o que não existe. Este é o risco central e ele é barato de testar, por isso
S0 existe e vem antes de tudo.

**O espaço é desenhado à mão, e isso é uma limitação declarada.** A diferença
para a armadilha já registrada em `GOTCHAS-AUTORIA-VISUAL.md`, V-30, é que lá a
IA **escolhia os valores** e chamava isso de autoria; aqui ela não escolhe
nenhum. O espaço limita o que é alcançável, e S0 mede exatamente esse limite.

**Selecionar não é aprovar.** Mosaico serve para ordenar candidatos e nunca para
promover — a regra de inspeção individual continua valendo integralmente para
qualquer coisa que avance. Ver V-07 e a regra de painel nos gotchas.

## Fatias

Cada fatia tem teto. Estourar o teto abre revisão, nunca mais rodadas.

| Fatia | Teto | O que entrega | Marco visível |
|---|---|---|---|
| S0 — o espaço alcança? | 2 | cem variações geradas e olhadas | a folha das cem |
| S1 — laço de seleção | 3 | gerar, mostrar, ordenar, repetir | a convergência em imagens |
| S2 — carro inteiro | 4 | melhor candidato após centenas de rodadas | o carro |
| S3 — tornar editável | 4 | o vencedor vira peça com identidade | o carro alterado com intenção |
| S4 — integração | 4 | superfície ligada à mecânica | o conjunto |

### S0 — o espaço alcança um carro?

Gerar cem variações e olhar. Uma pergunta só: **alguma está no bairro certo?**

Passa se pelo menos algumas lerem como carro em silhueta e proporção, mesmo
toscas. Reprova se todas forem cápsula, caixa ou bloco — e aí o problema é o
gerador, não a seleção, e o plano volta à mesa antes de gastar o resto.

O gerador fixa o que é estrutura de carro — roda no chão, entre-eixos, cabine
sobre a base, arco sobre a roda — e sorteia o que é proporção e forma. Ele não
tem noção de bonito e não precisa ter.

### S1 — o laço de seleção

Gerar uma leva, renderizar, mostrar todas juntas, a IA ordena, a leva seguinte
nasce em volta das melhores com variação menor, repete. O usuário entra de vez
em quando, só para dizer se a direção escolhida é a que ele quer.

Fecha quando a ordenação parar de mudar de direção e as escolhas convergirem, ou
quando ficar claro que não convergem.

### S2 — carro inteiro

Corpo completo, nunca um quarto. Reconhecimento cego por revisor sem contexto e
aceite do usuário antes de qualquer detalhe.

### S3 — tornar editável

O vencedor não pode ser uma malha morta. Ele vira peça com identidade,
alterável por intenção — mais comprido, teto mais baixo, frente diferente — sem
perder o que foi conquistado. É aqui que o resto do repositório volta a valer.

### S4 — integração

Superfície ligada às peças mecânicas pelas interfaces que já existem.

## O que continua valendo do trabalho anterior

Nada disso é descartado, e nada disso vira julgamento de forma:

- **identidade, peças, montagem, revisão, impacto e revalidação** — provados e
  aprovados, e são a razão de S3 e S4 serem viáveis;
- **canal de percepção** — vira detector de defeito de superfície, não juiz de
  forma. Continua com V-08 reaberto: o braço de diedro mede densidade de malha,
  e precisa ser normalizado antes de voltar a ser evidência;
- **comparação contra alvo, olhar e crítico cego** — o laço de referência é
  obrigatório e não muda;
- **procedência do número** — o gerador declara origem como qualquer outra fonte;
- **o registro de falhas** — `GOTCHAS-AUTORIA-VISUAL.md` é leitura obrigatória
  antes de abrir experimento, e V-31 existe porque uma rodada já foi gasta
  redescobrindo o que estava medido ali.

## Práticas proibidas, por evidência

1. **A IA digitar coordenada ou parâmetro de forma.** Seis provas. Vale também
   para família de curvas escrita à mão que satisfaz restrições por construção.
2. **Alvo inventado pela IA como referência vinculante.** O nariz do alvo
   anterior estava 321 mm abaixo do medido num carro real.
3. **Aprovação por painel, mosaico ou métrica.** Mosaico ordena, não promove.
4. **Detector devolvendo `passa` fora do escopo.** Devolve `naoAvaliavel`.
5. **Prova de forma em pedaço isolado.** Corpo inteiro ou nada.

## Aprovação e parada

Toda prova decide **plataforma** e **artefato** em separado; capacidade aprovada
com artefato reprovado é resultado válido, e qualidade só fecha com os dois.
Achado visual grave não é adiado.

A condição de encerramento tem três braços, e o terceiro existe porque o anterior
foi contornado por redação — ver V-32:

> **(a)** se S0 não produzir nenhuma variação no bairro certo, a conclusão é que
> **o gerador não alcança** e o mecanismo não se sustenta como está;
> **(b)** se S1 rodar até o teto sem convergir, a conclusão é que **a seleção não
> conduz** e a assimetria medida não se traduz em forma;
> **(c)** qualquer reprovação de forma em S2 encerra a fatia e obriga decisão
> explícita do usuário antes de qualquer continuação — nenhuma leitura de
> redação sobre o que foi "estreito" ou "sintético" reabre por conta própria.

Nos três casos, o alvo do repositório passa a ser editar, validar, montar e
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
- **V4 — 2026-08-24:** **mudança de mecanismo, por decisão do usuário.** A
  autoria por restrição deixa de ser a aposta, porque as regras que decidem se
  algo parece um carro não são escrevíveis. O plano passa a usar a assimetria
  medida na investigação: a IA erra ao produzir forma e acerta ao comparar. O
  ato de autoria vira ordenar candidatos, o gerador é deliberadamente burro, e
  o volume de rodadas passa a ser o ponto. N6 e o que vinha depois foram
  cancelados; entram S0 a S4, com o risco central — o gerador alcançar um carro
  bom — testado na primeira fatia e não na última.

---
name: desenhar-prancha
description: Desenhar uma prancha ortográfica alvo da Mecanifica com o motor de prancha — silhueta, aberturas, painéis e cotas em vistas lateral, frontal, traseira e superior. Use quando a tarefa for produzir ou corrigir o desenho de referência de uma carroceria, carenagem ou invólucro antes de existir geometria 3D.
---

# Desenhar prancha ortográfica

Esta skill produz o **alvo**: o desenho contra o qual a geometria futura será
medida. Não produz malha, não toca o núcleo procedural e não substitui a
bancada.

Ferramentas:
`tools/mecanifica/prancha.mjs` (motor) e
`tools/mecanifica/prancha-geometria.mjs` (traçado e medida).
Exemplo vivo: `tools/mecanifica/prancha-chassi-p0.mjs`.

## A regra que governa tudo

> **Nunca julgue o desenho só olhando.**

O modo de falha desta tarefa é sempre o mesmo: desenhar, olhar, achar ruim,
mexer, repetir. Isso não converge — produz forma genérica arredondada e consome
rodadas. O motor emite um relatório medido da própria saída; **leia o relatório
antes de olhar o desenho.** Se o relatório acusa, corrija sem renderizar.

O olho entra depois, e só para o que a métrica não cobre: caráter e intenção.

## 1. Calibrar antes de traçar

Antes da primeira linha, fixe e escreva:

- dimensões rígidas: comprimento, largura, altura, entre-eixos, bitolas,
  diâmetro de roda, balanços;
- consistência aritmética entre elas — `balanços + entre-eixos = comprimento`;
- consistência física — a roda cabe sob a carroceria:
  `meia bitola + meia largura de pneu < meia largura máxima`;
- de 10 a 20 landmarks com coordenada, que são a verdade dimensional.

Nunca comece a desenhar para "descobrir" a proporção. Sem alvo, qualquer
desenho passa.

## 2. Ancorar em proporção, não em milímetro chutado

Use `criarAncoras({ entreEixos, altura, meiaLargura })`:

```js
const A = criarAncoras({ entreEixos: 2650, altura: 1190, meiaLargura: 1000 });
A.fz(0)     // eixo traseiro
A.fz(1)     // eixo dianteiro
A.fz(0.45)  // base do para-brisa a 45% do entre-eixos
A.fy(0.82)  // 82% da altura total
```

Referência se lê em proporção. Traduzir de cabeça para milímetro introduz erro
sistemático. Milímetro absoluto só onde a medida é rígida.

## 3. Traçar com filete, não com spline

**Esta é a decisão de forma mais importante da skill.**

Carroceria é feita de **trechos retos ou quase retos ligados por raios curtos**.
Spline por pontos (`suave`) distribui a curvatura pela linha inteira e produz
sabonete: teto vira cúpula, ombro vira bolha, aresta de tampa desaparece.

O tipo padrão é `filete`, com raio por vértice em milímetros:

```js
{ vista: 'lateral', nome: 'teto', pts: [
  [1200, 980],        // canto vivo
  [400, 1290, 260],   // filete de 260 mm
  [-1800, 1180],
]}
```

`suave` continua válido onde a forma é genuinamente spline — contorno de planta,
perfil de capô. Se estiver em dúvida, use filete.

## 4. Ordem obrigatória das camadas

Uma de cada vez, medindo entre elas. Não desenhe tudo de uma vez.

1. **silhueta** de cada vista, fechada nas pontas;
2. **aberturas** — arcos de roda, vãos envidraçados — como loops;
3. **cortes de painel** — portas, capô, tampa;
4. **detalhe** — cromo, faróis, lanternas, louvers;
5. **cotas, landmarks e legenda**.

Detalhe adicionado antes de a silhueta fechar vira ruído que esconde o erro
estrutural embaixo.

## 5. Declarar a leitura de cada vista

Toda vista declara o que ela é:

- `leitura: 'projecao'` — enxerga o corpo inteiro, como uma prancha de convenção.
  Tem de bater com o extremo global daquele eixo;
- `leitura: 'secao'` — corta numa estação, como uma frontal desenhada no eixo
  dianteiro. Só precisa **caber dentro** do corpo.

O motor compara as vistas pelos eixos que elas compartilham: lateral e planta
compartilham `z`; lateral, frontal e traseira compartilham `y`; planta, frontal
e traseira compartilham `x`. Sem essa declaração, as quatro vistas podem
discordar sobre o mesmo corpo e ninguém percebe.

Declare também o `envelope` — comprimento, largura, altura — e o motor confere
contra o que foi de fato traçado, no lugar de `throw` escrito à mão.

**Não declare `secao` para calar um desacordo.** Se todas as vistas de um eixo
forem seção, ninguém estabelece a extensão do corpo naquele eixo, e o motor
acusa exatamente isso.

## 6. Declarar a expectativa junto com a linha

Toda linha de caráter recebe `nome` e `esperado`. É o que transforma "achei que
ficou abaulado" em alerta automático:

```js
{ vista: 'lateral', nome: 'linhaDoTeto', classe: 'contorno',
  pts: [...],
  esperado: { concentracaoMax: 0.25, inversoesMax: 0, raioMinMin: 120 } }
```

Métricas emitidas por camada nomeada:

| métrica | o que é | como ler |
|---|---|---|
| `concentracao` | fração do comprimento que concentra 90% do giro | perto de 0 = retas com raios curtos; perto de 1 = abaulado |
| `retidao` | fração praticamente reta | alta em rampa e aresta |
| `inversoes` | trocas de sinal de curvatura | 0 em linha de caráter; >0 é ondulação |
| `raioMin` | menor raio do traçado | confirma que o filete pedido existe |

`concentracao` é o discriminador principal. **Retidão sozinha não separa rampa
de cúpula** — uma spline por três pontos também é quase toda reta, ela só espalha
a curva pelo meio.

Por vista, o relatório também dá `contornoFechado` e `pontosForaDoContorno`.

## 7. Rodar, ler o relatório, só então olhar

```bash
node tools/mecanifica/<especificacao>.mjs
```

O script deve imprimir `imprimirRelatorio(relatorio)`. Ordem:

1. **zero alerta?** Se não, corrija a especificação e rode de novo. Não
   renderize ainda.
2. renderize e olhe:
   `node -e "…chromium…"` com `deviceScaleFactor: 2`.
3. compare com a referência e anote **diferenças, não impressões**: "a linha do
   teto está abaulada", não "está estranho".

## 8. Comparar com a referência por número

Se existe prancha de referência rasterizada, pare de comparar de olho. Use
`tools/mecanifica/prancha-referencia.mjs`:

```js
const img = lerPng(caminho);
const env = envelope(img, { x0, x1, y0, y1 });
const cal = calibrarPorRodas(env, ret, { entreEixos, comprimento, altura });
const ref = paraMilimetros(env, cal, { qual: 'topo' });
const c = compararSilhuetas(ref, minhaSilhueta);
```

Leia primeiro o **resíduo** da calibração. Ele compara duas medidas
independentes contra o que a escala prevê; acima de uns 3%, a prancha está fora
de esquadro e o resto da comparação carrega esse erro.

Depois leia o desvio **por região** — traseira, teto, para-brisa, capô, nariz —
e não só o total. O agregado esconde: um desenho com 45 mm de desvio médio pode
ter capô perfeito e traseira 112 mm alta.

**Dois limites que valem mais que o resultado:**

- a imagem de referência não entra no repositório, só as coordenadas derivadas.
  Ver `docs/mecanifica/referencias/README.md`;
- **desvio é confiável, curvatura de raster não é.** Numa prancha de 736 px, o
  desvio médio é estável sob suavização e a contagem de inversões varia de 31 a
  51 sem convergir. Julgue proporção e posição pela referência; julgue caráter
  de superfície pelas métricas do seu próprio traçado.

Um efeito colateral honesto disto: a medida pode **contrariar** sua leitura
visual. No estudo do fastback eu havia afirmado que o erro grave era a linha do
teto abaulada; medindo, o teto desviava 17 mm e os erros reais eram a traseira
alta em 112 mm e a ponta do nariz em 314 mm. Quando medida e olho divergem, a
medida ganha.

### Antes de tudo: OLHE a imagem

Rasterize as vistas e **abra o PNG**:

```
node tools/mecanifica/olhar.mjs saida.png vista-a.svg vista-b.svg
```

Ler o PNG como imagem é passo obrigatório antes de julgar, antes de despachar
crítico e antes de levar qualquer coisa ao usuário. SVG gerado, entregue e nunca
aberto por quem desenhou é o modo de falha real: um nariz aberto de 600 x 370 mm
ficou várias rodadas visível na vista frontal e só foi achado por um script.
Medição pega o defeito que alguém já imaginou; olhar pega o resto.

## 9. Despachar o crítico, sem contexto

Quando o relatório determinístico estiver **limpo** e antes de levar o resultado
ao usuário, despache um subagente como **crítico visual**. O protocolo completo
está em
[`../../../docs/mecanifica/REFERENCIA-E-CRITICA-VISUAL.md`](../../../docs/mecanifica/REFERENCIA-E-CRITICA-VISUAL.md).

Passe **apenas o PNG** e a pergunta. **Não passe receita, código, passos,
relatório, o seu raciocínio nem o histórico de construção.** O crítico é para
VER a imagem — revisão de receita é outro trabalho, com outro dono, e um crítico
que lê a receita volta a julgar a intenção em vez do resultado, que é
exatamente o defeito que este papel existe para cobrir. Papel separado dentro da
mesma sessão é ficção: quem modelou tem a narrativa e não consegue não tê-la.

A forma padrão é legibilidade cega: entregue a imagem sem dizer o que é e
pergunte "o que é isto?". Se a resposta não bate com a intenção, é achado, e o
teste não exige gosto — só verifica se a forma comunica.

Três limites, todos inegociáveis:

- **achado, nunca aprovação.** Silêncio do crítico não vira evidência de
  qualidade nem entra num registro como aceite. Forma quem aprova é o usuário;
- **depois da medida, nunca no lugar dela.** Se o relatório ainda acusa, corrija
  primeiro: crítico é caro e não determinístico, medida é grátis e determinística;
- **em marco, não a cada rodada.** Cada despacho é partida fria.

## 10. Checklist de defeitos recorrentes

Todos já aconteceram. Confira antes de entregar:

- contorno não fecha nas pontas — nariz e traseira em planta são os campeões;
- linha de detalhe passando do contorno em vista frontal ou traseira;
- polígono fechado traçado com `suave`, estourando acima da silhueta — vidro e
  corte de painel são **retos**, use `filete` ou `poli`;
- linha inferior da lateral atravessando a roda em vez de ser interrompida pelo
  arco, que é abertura real;
- cota colidindo com legenda, rótulo ou outra cota;
- rótulo de landmark cortado na margem;
- pneu mais largo que a carroceria — sempre verifique o item 1;
- vista lateral desenhada com a frente para o lado errado;
- **`foraDoContorno` aplicado por hábito.** Este é o pior da lista, porque
  desliga um teste que funcionava. Ele vale por camada **e por vista**: uma roda
  escapa legitimamente na lateral, onde desce abaixo da soleira, e **nunca** na
  planta, onde estar fora da carroceria é o defeito. Foi assim que um pneu passou
  12 mm para fora sem ninguém ver. Todo uso que sobreviver leva comentário
  dizendo por que aquela camada tem direito de sair, naquela vista;
- linha inferior traçada com `suave`: a spline afunda abaixo do ponto declarado.
  Na prancha do P0 ela mergulhava para 94 mm onde a altura livre é 105.

## 11. Encerrar

- relatório sem alerta;
- todas as vistas fechadas;
- diferenças contra a referência escritas, com causa apontada;
- gates de documentação verdes se a saída entrou em `docs/`.

Se a prancha for referência vinculante de um plano, diga explicitamente que ela
é **derivada** da tabela de medidas: divergiu, a tabela manda.

## Antes de qualquer julgamento: abra o alvo e sobreponha

Não é opcional e não é passo final. Uma prova inteira do chassi foi feita sem
isto: doze rodadas de modelagem sem que o desenho de referência fosse aberto uma
única vez, e o crítico visual recebendo só o render.

1. `npm run olhar -- alvo.png caminho/do/desenho.svg` e **leia a imagem**;
2. `npm run comparar:alvo -- cmp.svg caminho/da/malha.json` para pôr a silhueta
   do modelo sobre as curvas do alvo, em milímetros e na mesma origem;
3. despache o agente `critico-visual` passando os **três** caminhos — alvo,
   modelo e sobreposição. Crítico que recebe só o render dá opinião.

Sem alvo desenhado, desenhe antes: veja
[`REFERENCIA-E-CRITICA-VISUAL.md`](../../../docs/mecanifica/REFERENCIA-E-CRITICA-VISUAL.md).

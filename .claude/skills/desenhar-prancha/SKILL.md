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

## 5. Declarar a expectativa junto com a linha

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

## 6. Rodar, ler o relatório, só então olhar

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

## 7. Checklist de defeitos recorrentes

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
- vista lateral desenhada com a frente para o lado errado.

## 8. Encerrar

- relatório sem alerta;
- todas as vistas fechadas;
- diferenças contra a referência escritas, com causa apontada;
- gates de documentação verdes se a saída entrou em `docs/`.

Se a prancha for referência vinculante de um plano, diga explicitamente que ela
é **derivada** da tabela de medidas: divergiu, a tabela manda.

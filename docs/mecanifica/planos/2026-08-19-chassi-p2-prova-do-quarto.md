# Chassi P2 — prova descartável do quarto dianteiro

**Estado:** ativo

**Responsável:** Claude

## Objetivo

Executar a prova decisiva da rodada P2 do
[plano do chassi](2026-08-18-chassi-realista-kernel-geometrico.md): confirmar ou
reabrir a representação decidida — cage de quads com vincos, avaliada por
Catmull-Clark determinística.

Alvo em [`../CHASSI-P0-ALVO-E-LIMIARES.md`](../CHASSI-P0-ALVO-E-LIMIARES.md);
contrato em [`../CHASSI-P1-CONTRATO-DA-CAGE.md`](../CHASSI-P1-CONTRATO-DA-CAGE.md).

## O que esta prova é, e o que ela não é

É **descartável e privada**. Vive em
`autoria-assistida/experimentos/prova-cage-quarto-dianteiro/`, não entra no
núcleo, não vira peça publicada e não altera receita existente. Se o critério de
descarte disparar, o diretório inteiro é jogado fora e a decisão de representação
reabre — esse é o ponto de uma prova descartável.

**Não** autoriza `subdividir` no núcleo. A subdivisão nasce aqui como módulo
isolado; levá-la ao núcleo é decisão de P4, depois de P3 medir custo.

## Invariantes

- núcleo, receitas, catálogo e baseline intactos — a prova não toca em nenhum;
- determinismo byte a byte: mesma cage, mesmo nível, mesma saída;
- sem dependência nova;
- nenhum vocabulário automotivo no módulo de subdivisão; `paralama` vive na cage;
- a pele primária não sofre booleana, e `loft` não entra.

## Rodadas

### Q1 — Catmull-Clark determinístico

Módulo puro: cage de quads mais vincos entra, malha por nível sai. Regra de
vinco semi-agudo por aresta. Coberto por teste, incluindo os casos que denunciam
implementação errada — cubo que converge para esfera, aresta com nitidez que
permanece aguda, e vértice extraordinário estável.

**Aceite:** a subdivisão de um cubo converge para o limite conhecido, e uma
aresta com nitidez 2 continua aguda no nível 2 e suaviza no nível 3.

### Q2 — cage e validador

Formato `mecanifica.cage-quad@1` conforme P1, com validador que recusa face não
quadrilátera, loop descontínuo, aresta de vinco inexistente e seção fora de
tolerância.

### Q3 — o quarto dianteiro

Cage manual do quarto dianteiro, com tudo que P2 exige: plano de simetria, capô,
para-lama e lateral como regiões da mesma superfície, arco de roda aberto com
retorno de borda, transição sem corpo sobreposto, linha de caráter por vinco,
recorte de farol e início do vão envidraçado.

### Q4 — compilação e medida

Compilar para os níveis 1 e 2, emitir malha e medir: faces da cage, faces por
nível, bytes, tempo de avaliação, erro de silhueta contra a prancha do P0, pontos
extraordinários visíveis e razão entre faces da cage e compiladas.

**Critério de descarte, declarado em P0 e não renegociável aqui:** reabre se a
cage passar de ~800 quads no quarto dianteiro, se o arco não puder ser aberto sem
booleana, ou se a alteração local exigir tocar mais de um loop nomeado.

### Q5 — alteração local e forma não automotiva

`elevar a crista 25 mm` aplicada e medida: quantos loops toca, quanto muda a
malha compilada, e reexecução idêntica. Mais uma forma não automotiva pelo mesmo
módulo, provando que a representação não carrega vocabulário de carro.

### Q7 — refazer a partir da seção declarada

A forma foi reprovada. Causa raiz isolada: a cage nasceu de silhueta e meia
largura, com seção interpolada genericamente, então não há quebra para o vinco
revelar e a linha de caráter não se lê. Declarar as cinco seções de P0 e
reconstruir a cage a partir delas.

### Q6 — veredito

`manter` ou `reabrir`, com as medidas na mesa e crítico visual despachado sem
contexto antes de levar ao usuário.

## Gate para concluir

- Q1 a Q5 executadas, com medidas registradas;
- critério de descarte avaliado explicitamente;
- determinismo provado por replay;
- gates do INDEX verdes;
- aceite do usuário sobre a forma, que nenhuma medida substitui.

## Fora deste plano

`subdividir` no núcleo, integração com bancada, exportação, UV, material,
carroceria inteira, interior e qualquer promoção a peça publicada.

## Registro

- **V1 — 2026-08-19:** plano aberto.
- **V2 — 2026-08-19:** Q1 a Q5 entregues e **reprovadas no aceite**. O plano
  segue ativo: prova reprovada não fecha. A próxima rodada é Q7 — declarar as
  cinco seções transversais de P0 como contrato, em vez de interpolar seção
  genérica, e refazer a cage a partir delas. As oito condições de rejeição de P0
  passam a ser rodadas **antes** de apresentar, não depois.

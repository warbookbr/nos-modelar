# Chassi P0 — alvo, referência e limiares

Rodada P0 do plano
[`planos/2026-08-18-chassi-realista-kernel-geometrico.md`](planos/2026-08-18-chassi-realista-kernel-geometrico.md).
Fundamentação em
[`ANALISE-CHASSI-REALISTA-KERNEL-GEOMETRICO.md`](ANALISE-CHASSI-REALISTA-KERNEL-GEOMETRICO.md).

Este documento fixa **contra o que a geometria será julgada**, antes de existir
geometria. Ele não autoriza implementação, não escolhe topologia de cage — isso é
P1 — e não altera núcleo, receita ou catálogo.

Tudo aqui é vinculante. Um número só muda por revisão explícita registrada na
seção 8, nunca porque o modelo ficou difícil de bater.

## 1. Por que esta rodada existe

Em 2026-08-18 a sonda passou nos gates e foi rejeitada pelo usuário. A causa não
foi um gate frouxo: foi a ausência de alvo. Não havia dimensão declarada, perfil
declarado antes de modelar, nem condição de rejeição escrita. Sem alvo, os eixos
de integridade, dimensão e apresentação aprovam sozinhos, e silhueta, superfície
e aceite não têm contra o que reprovar.

P0 fecha essa lacuna. Se P0 estiver certo, P2 é decidível por medição.

## 2. Perfil de autoria declarado

Declarado **antes** de qualquer modelagem, como exige
[`PERFIS-DE-AUTORIA.md`](PERFIS-DE-AUTORIA.md):

```js
export const PERFIL_AUTORIA = {
  visual: 'realistaApresentacao',
  fidelidade: 'F3',
  precisao: 'dimensional',
  interacao: 'montagem',
  distanciaMinima: 0.60,
  orcamentoFaces: 44800,
};
```

Notas que evitam a repetição do erro anterior:

- `precisao: 'dimensional'` e não `'mecanica'`: o alvo é a pele exterior. Não há
  requisito de suspensão, monocoque ou encaixe funcional nesta fase, e prometer
  precisão mecânica criaria um gate que ninguém pretende cumprir.
- `distanciaMinima: 0.60` fixa o que `F3` significa aqui: a carroceria sustenta
  inspeção a 60 cm. É essa distância que torna vinco, retorno de borda e
  transição de painel requisitos, e não enfeite.
- `orcamentoFaces` é o teto da **malha compilada de publicação**, não da cage.

## 3. Sistema de coordenadas e unidades

Mantém a convenção já usada nas receitas: `x` = largura, `y` = altura,
`z` = frente positiva.

| Elemento | Definição |
|---|---|
| unidade de autoria | metro |
| unidade deste documento | milímetro, para legibilidade |
| `x = 0` | plano de simetria longitudinal |
| `y = 0` | solo |
| `z = 0` | ponto médio do entre-eixos |

Toda medida abaixo é em milímetros. Toda medida lateral é dada como `±`, e o
modelo é espelhado a partir do lado `x > 0`.

## 4. Dimensões rígidas

Alvo: **supercarro ficcional de motor central**. Ficcional não significa livre —
significa que as proporções precisam ser internamente consistentes e plausíveis
para a classe, já que não existe original a copiar.

### 4.1 Envelope

| Dimensão | Valor | Tolerância |
|---|---|---|
| comprimento total | 4600 | ±10 |
| largura máxima, sem espelhos | 2000 | ±8 |
| altura total | 1190 | ±8 |
| entre-eixos | 2650 | ±3 |
| bitola dianteira | 1660 | ±3 |
| bitola traseira | 1680 | ±3 |
| balanço dianteiro | 940 | ±8 |
| balanço traseiro | 1010 | ±8 |
| altura livre do solo | 105 | ±5 |

Consistência verificável: `940 + 2650 + 1010 = 4600`. Bitola traseira maior que a
dianteira, largura máxima na anca traseira — assinatura da classe. A largura
máxima cobre o pneu traseiro com folga: `840 + 305/2 = 992 < 1000`. O mesmo vale
na frente: `830 + 245/2 = 952 < 965`, a meia largura do ombro dianteiro.

### 4.2 Rodas

| Dimensão | Dianteira | Traseira | Tolerância |
|---|---|---|---|
| aro | 20″ (508) | 21″ (533) | exato |
| pneu | 245/35 R20 | 305/30 R21 | exato |
| diâmetro externo | 680 | 716 | ±4 |
| raio do arco na carroceria | 385 | 400 | ±5 |
| folga radial pneu–arco | 45 | 42 | derivada |

O arco é abertura real na pele, não borda de envelope. Isto é requisito de
topologia, medido no eixo 5.

### 4.3 Landmarks

Pontos que a silhueta precisa atingir. São a verdade dimensional contra a qual as
curvas mestras e depois a cage são medidas.

| Id | Landmark | x | y | z |
|---|---|---|---|---|
| L01 | ponta do nariz | 0 | 520 | +2265 |
| L02 | centro da roda dianteira | ±830 | 340 | +1325 |
| L03 | centro da roda traseira | ±840 | 358 | −1325 |
| L04 | base do para-brisa | 0 | 980 | +480 |
| L05 | topo do para-brisa | 0 | 1185 | −180 |
| L06 | ponto mais alto do teto | 0 | 1190 | −560 |
| L07 | fim do vidro traseiro | 0 | 1120 | −1150 |
| L08 | tampa do motor, traseira | 0 | 1055 | −1750 |
| L09 | extremidade traseira | 0 | 920 | −2335 |
| L10 | linha de cintura, na porta | ±930 | 950 | 0 |
| L11 | soleira, aresta inferior | ±925 | 145 | 0 |
| L12 | largura máxima, anca traseira | ±1000 | 850 | −900 |
| L13 | ombro dianteiro | ±965 | 900 | +1325 |
| L14 | topo do arco dianteiro | ±830 | 725 | +1325 |
| L15 | topo do arco traseiro | ±840 | 758 | −1325 |

Derivada e vinculante: inclinação do para-brisa, de L04 a L05, é **73° da
vertical** (±2°).

### 4.4 Prancha ortográfica

As seções 4.1 a 4.3 são desenhadas em
[`img/chassi-p0-prancha.svg`](img/chassi-p0-prancha.svg), gerada por
`node tools/mecanifica/prancha-chassi-p0.mjs`. A prancha é derivada, não uma
segunda verdade: se ela divergir das tabelas acima, as tabelas mandam e o
gerador está errado.

Ela desenha o alvo, não uma peça. Nenhuma geometria foi modelada.

### 4.5 Curvas mestras

O produto de P0 são cinco curvas que qualquer cage precisa reproduzir. Elas são o
alvo; a cage é uma hipótese sobre como atingi-lo.

1. **silhueta lateral** — perfil em `x = 0`, de L01 a L09, passando por L04, L05,
   L06, L07, L08;
2. **planta** — meia largura em função de `z`, de L01 a L09, com máximo em L12;
3. **linha de ombro** — a aresta de caráter que percorre L13 → L10 → L12;
4. **seção transversal em cinco estações** — `z` = +1900, +1325, 0, −1325, −2000;
5. **contorno dos arcos** — círculos em L14 e L15 com os raios da seção 4.2,
   fechados por retorno de borda.

## 5. Referência: decisão registrada

O dossiê, seção 3.3, registra o problema: existe **uma** imagem em perspectiva,
sem distância focal, escala ou prancha ortográfica. Uma imagem assim sustenta
direção estética e não determina forma 3D.

A saída não é calibrar melhor uma referência que não dá para calibrar. A decisão
desta rodada é:

> **A referência vinculante é a prancha ortográfica derivada das seções 4.1 a
> 4.4 deste documento, não a imagem.** A imagem em perspectiva fica como direção
> estética, explicitamente não vinculante, e não entra em nenhum gate.

Isso é honesto com o fato de o carro ser ficcional: não existe original, logo não
existe erro de silhueta contra o mundo — existe erro contra o alvo declarado. E
resolve o falso positivo na raiz, porque o alvo passa a ser mensurável.

Consequência operacional: as três vistas ortográficas de julgamento são geradas
com câmera ortográfica, escala fixa e enquadramento fixo, declarados junto com o
gate de apresentação. Nenhuma vista em perspectiva reprova ou aprova o eixo 3.

## 6. Limiares dos oito eixos

Os oito eixos vêm do dossiê, seção 13. Aqui cada um recebe número e método. Um
eixo sem número não é gate.

### Eixo 1 — integridade

| Métrica | Limiar |
|---|---|
| execução da receita | sem erro, sem aviso de identidade |
| arestas non-manifold | 0 |
| faces degeneradas, área < 1e−9 m² | 0 |
| bordas abertas fora das aberturas declaradas | 0 |
| estabilidade de hash em 3 replays | idêntico byte a byte |

### Eixo 2 — dimensão

| Métrica | Limiar |
|---|---|
| entre-eixos, bitolas | ±3 mm |
| comprimento, largura, altura, balanços | conforme seção 4.1 |
| centro de roda, por eixo | ±3 mm |
| landmark L01–L15, desvio 3D | ≤ 6 mm |
| inclinação do para-brisa | ±2° |

### Eixo 3 — silhueta

Medida contra a prancha ortográfica da seção 5, por vista.

| Métrica | Lateral | Frontal | Superior |
|---|---|---|---|
| IoU de silhueta | ≥ 0.975 | ≥ 0.970 | ≥ 0.970 |
| Hausdorff de contorno | ≤ 14 mm | ≤ 16 mm | ≤ 16 mm |
| desvio de landmark projetado | ≤ 8 mm | ≤ 8 mm | ≤ 8 mm |

### Eixo 4 — superfície

| Métrica | Limiar |
|---|---|
| continuidade em região declarada lisa | sem quebra de G1 fora de loop de vinco |
| listras de zebra sobre capô, ombro e lateral | contínuas, sem torção nem bifurcação |
| pontos extraordinários em superfície visível | ≤ 12 no quarto dianteiro |
| ponto extraordinário sobre loop de vinco | 0 |
| distância mínima entre ponto extraordinário e loop de vinco | ≥ 30 mm |
| ponto extraordinário na linha de centro do capô | 0 |

Ponto extraordinário é vértice de valência ≠ 4 na cage. Eles são inevitáveis;
o requisito é que fiquem fora das regiões onde a reflexão os denuncia.

### Eixo 5 — topologia

| Métrica | Limiar |
|---|---|
| faces da cage que não são quadriláteros | 0 |
| operações booleanas na pele primária | 0 |
| aberturas declaradas realmente abertas | 100% |
| profundidade de retorno de borda em abertura | ≥ 6 mm |
| gaps | 0 |
| self-intersections | 0 |
| faces da cage por passo | ≤ 900 |
| vértices da cage por passo | ≤ 900 |

A última linha é `BLOCO = 1000` de `nucleo.js:33` transformado em limiar. A cage
completa excede o bloco de um passo, então é emitida por regiões, cada região um
passo, com folga de 10% para o crescimento de P2.

### Eixo 6 — semântica

| Métrica | Limiar |
|---|---|
| loops nomeados endereçáveis após subdivisão | 100% |
| identidade preservada da cage ao nível 2 | 100% |
| linhagem face da cage → filhas | determinística, sem heurística |
| loops tocados por `elevar a crista 25 mm` | exatamente 1 |
| reexecução da alteração por outra sessão | resultado idêntico |

### Eixo 7 — apresentação

| Métrica | Limiar |
|---|---|
| conjunto de câmeras | fixo e declarado, ortográfico para o eixo 3 |
| iluminação | fixa e declarada |
| reprodutibilidade da vista | idêntica entre execuções |
| material de julgamento | um só, neutro, com resposta especular suficiente para zebra |

O material de julgamento não é o material de produto. Ele existe para tornar a
superfície visível, e não pode esconder erro de forma sob cor ou textura.

### Eixo 8 — aceite

Aprovação explícita do usuário, registrada. O aceite **não substitui** os eixos
1 a 7: se qualquer um reprovar, o marco não fecha mesmo com aceite. E o inverso
também vale, que é o ponto desta rodada: passar em 1 a 7 não fecha o marco sem
aceite.

## 7. Condições de rejeição visual

Escritas antes de existir geometria, como o plano exige. Cada uma reprova
sozinha, mesmo com todos os números dentro do limiar. Derivam da tabela de
sintomas do dossiê, seção 6 — são os defeitos observados na sonda, promovidos a
critério.

1. o corpo lê como cápsula, tubo ou casco de barco na vista lateral;
2. as rodas parecem externas ao corpo, ou o arco lê como borda pintada em vez de
   abertura;
3. o para-lama lê como volume anexo, e não como região da mesma superfície;
4. a cabine parece pousada sobre o corpo, sem transição de teto e coluna;
5. a reflexão ondula ou quebra ao longo da linha de ombro;
6. o recorte de farol lê como decalque em vez de conformação;
7. o vão envidraçado lê como superfície escurecida em vez de abertura com
   moldura;
8. a densidade de malha está na amostragem e não na decisão de forma — visível
   como facetamento em região que deveria ser lisa, ou como excesso de subdivisão
   em região plana.

## 8. Orçamento e níveis de compilação

| Nível | Faces | Uso |
|---|---|---|
| cage | ≤ 2800 quads | artefato autoral, versionado |
| nível 1 | ≤ 11200 quads | preview na bancada |
| nível 2 | ≤ 44800 quads | publicação, igual a `orcamentoFaces` |

Reconciliação com o critério de descarte de P2: o quarto dianteiro pode consumir
até 800 quads, quase 29% do teto total, porque é a região mais densa do carro —
arco aberto, transição capô–para-lama, recorte de farol e início do vão
envidraçado concentram-se ali. Teto e assoalho consomem muito menos. Se o quarto
dianteiro passar de 800, o teto de 2800 cai junto, e é isso que aciona a
reabertura da decisão de representação.

A razão entre faces da cage e faces compiladas é medida e reportada. É ela que
distingue "a forma exige esta densidade" de "a densidade veio da amostragem" —
o defeito 8 da seção 7.

## 9. O que P0 não decide

Topologia da cage, fluxo de loops, formato de vinco, contrato com
`mecanifica.malha-poligonal@1`, política de diff, onde a subdivisão executa e
qualquer linha de código. P1 e P3 tratam disso.

## 10. Registro

- **P0 v1 — 2026-08-19:** perfil `realistaApresentacao / F3 / dimensional`
  declarado antes de modelar; envelope, rodas e quinze landmarks fixados; cinco
  curvas mestras definidas como alvo; referência resolvida — a prancha
  ortográfica derivada deste documento é vinculante e a imagem em perspectiva
  não é; limiares numéricos dos oito eixos fixados; oito condições de rejeição
  visual escritas antes da geometria; `BLOCO = 1000` convertido em limiar de
  900 ids por passo de cage.
- **P0 v2 — 2026-08-19:** prancha ortográfica desenhada a partir das tabelas. O
  desenho expôs uma inconsistência do próprio alvo: com largura máxima 1960 e
  bitola traseira 1680, o pneu 305 ultrapassava a carroceria em 12 mm de cada
  lado. Largura máxima corrigida para 2000, L12 para ±1000 e L13 para ±965.

# Chassi P1 — contrato da malha de controle

Rodada P1 do plano
[`planos/2026-08-18-chassi-realista-kernel-geometrico.md`](planos/2026-08-18-chassi-realista-kernel-geometrico.md).
Alvo dimensional em
[`CHASSI-P0-ALVO-E-LIMIARES.md`](CHASSI-P0-ALVO-E-LIMIARES.md); fundamentação da
representação em
[`ANALISE-CHASSI-REALISTA-KERNEL-GEOMETRICO.md`](ANALISE-CHASSI-REALISTA-KERNEL-GEOMETRICO.md).

Este documento fixa **o formato do artefato autoral** e como ele se liga ao que já
existe. Não autoriza implementação, não escreve operação nova e não altera o
núcleo. P2 é quem prova.

## 1. O que o código já garante

Lido diretamente, não inferido. É contra isto que a cage precisa encaixar.

| Fato | Onde | Consequência para a cage |
|---|---|---|
| a face persistida guarda `vs` como lista de ids, sem limite de tamanho | `nucleo.js:2662` | quad é face válida hoje; não é preciso tipo novo de face |
| a face carrega `parte` na própria linha canônica | `nucleo.js:2679` | o nome semântico viaja com a face compilada, sem tabela paralela |
| `V` e `F` são ordenados por id e o JSON é byte-idêntico ida e volta | `nucleo.js:2645` | qualquer id derivado precisa ser inteiro e totalmente ordenável |
| `BLOCO = 1000` por passo, em vértice e face | `nucleo.js:33` | a cage cabe por região; a malha compilada não cabe |
| `local(id)` aborta com `id >= BLOCO` | `nucleo.js:403` | o compilado **não pode** passar pelo alocador posicional |
| não existe entidade aresta | `nucleo.js:2649` | vinco e loop precisam de identificação derivada dos vértices |
| seleção resolve por `grupo`, `origem`, `alias`, `porta`, `regiao` | `nucleo.js:1458` | a região da cage é endereçável por `parte`, sem vocabulário novo |
| operação declara `artefatos.entra/sai`, `efeitos` e `identidade` | `nucleo.js:2373` | `subdividir` entra pelo registro existente |
| a comparação de peça publicada é byte a byte do texto | `exportar-peca.mjs:262` | **não existe diff estrutural**; a política da seção 7 é nova |

## 2. A cage é um artefato próprio

A malha de controle **não** é uma `mecanifica.malha-poligonal@1`. Ela carrega
duas coisas que o formato salvo não tem — nitidez por aresta e loop nomeado — e
esticar o formato existente quebraria a compatibilidade byte a byte que o plano
declara inegociável.

> **Formato:** `mecanifica.cage-quad@1`, produzido pelos passos da receita e
> consumido pela compilação. A malha entregue a `mecanifica.malha-poligonal@1`
> continua sendo o **produto**, não o artefato autoral.

```
cage-quad@1 = {
  V:      Map(id -> [x, y, z]),        // mesma forma do neutro
  F:      Map(id -> { id, vs, parte }), // vs SEMPRE com 4 ids
  vincos: [[vMenor, vMaior, nitidez]],
  loops:  { nome: { v: [ids...], fechado: bool } },
  secoes: [{ z, contorno: [[x, y]...], tolerancia }],
  simetria: { plano: 'x', autorada: 'x >= 0' },
}
```

### Regras do formato

- **Só quadriláteros.** `vs.length === 4` é erro fora disso, não aviso. Triângulo
  e n-gon geram ponto extraordinário, e P0 limita ponto extraordinário visível.
- **Aresta é derivada, nunca declarada.** A identidade de uma aresta é o par
  ordenado `[min(a, b), max(a, b)]`. Não existe id de aresta persistido, porque o
  formato salvo não tem entidade aresta e inventar uma criaria segunda verdade.
- **Nitidez** é real em `[0, 3]`, lida como "por quantos níveis a aresta
  permanece aguda"; fracionário interpola. `0` é liso, e ausência da aresta na
  lista significa `0`.
- **Loop é caminho de vértices**, não lista de arestas: as arestas saem dos pares
  consecutivos. Ordem importa e é validada por continuidade — cada par
  consecutivo precisa ser aresta de alguma face.
- **Autoria em meia carroceria.** A cage é escrita em `x >= 0` e espelhada na
  compilação. Vértice com `x == 0` é costura e não é duplicado.

## 3. Loops nomeados são a unidade editável

P0 declarou a unidade editável; aqui ela vira dado. O domínio é **finito e
fechado** para o chassi:

| loop | o que governa |
|---|---|
| `linhaDeOmbro` | aresta de caráter da lateral |
| `arcoDianteiro`, `arcoTraseiro` | borda da abertura de roda |
| `cristaParalama` | crista sobre o eixo |
| `cintura` | aresta inferior do flanco |
| `baseParabrisa` | costura entre capô e vidro |
| `vaoEnvidracado` | borda do recorte de vidro |

Nomes vivem na receita, nunca no núcleo — a operação continua sendo `subdividir`
sobre quads, e `paralama` é vocabulário de domínio.

**Regra de edição, que é o requisito de P2:** `elevar a crista 25 mm` toca
exatamente um loop. Se uma alteração declarada em P0 exigir tocar dois, a
topologia da cage está errada, não a alteração.

## 4. Seção transversal é verificação, não gerador

A curva mestra 4 de P0 entra aqui como **contrato de conferência**. A seção
declara a forma esperada numa estação; a cage é hipótese sobre como atingi-la.

- estações fixadas em P0: `z` = +1900, +1325, 0, −1325, −2000;
- a seção é polilinha fechada em `(x, y)`, na mesma convenção da prancha;
- o validador projeta os vértices da cage naquela estação sobre o plano e mede o
  desvio contra o contorno declarado;
- **tolerância: 8 mm**, coerente com o desvio de landmark de 6 mm de P0 mais a
  folga de projeção.

A seção **não gera** a cage. Gerar a partir dela reintroduziria a varredura
longitudinal — o defeito que a seção 8.7 do dossiê proíbe.

## 5. Linhagem: o que persiste e o que é derivado

Esta é a decisão mais importante do documento, e ela **corrige** uma formulação
solta do dossiê.

O dossiê disse que a linhagem de identidade sai "por aritmética". Isso é verdade
para o cálculo, mas seria falso como identidade persistida: `CLAUDE.md` proíbe
índice de array e posição como identidade, e um id derivado de posição em lista
ordenada é exatamente isso.

> **A malha compilada não tem identidade persistida.** Os ids dela são derivação
> válida dentro de uma compilação num nível declarado, e nenhuma receita, montagem
> ou revisão pode citá-los.

O que persiste, então:

1. **a cage**, com ids posicionais comuns, respeitando `BLOCO`;
2. **o nome semântico**: `parte` na face e o nome do loop;
3. **a seção declarada**.

E a regra de herança, que é o que P2 precisa provar:

> Toda face filha herda o `parte` da face da cage que a gerou. Catmull-Clark
> produz exatamente `n` filhas por face de `n` lados, então uma face da cage com
> `parte = 'paralamaDianteiro'` produz 4 filhas por nível, todas com o mesmo nome.

Consequência prática: `sel: { grupo: 'paralamaDianteiro' }` funciona igual na cage
e no nível 2, sem tabela de tradução. É por isso que a decisão de representação é
defensável — a seleção semântica atravessa a subdivisão de graça.

## 6. Ligação com `mecanifica.malha-poligonal@1`

A compilação produz um neutro comum: `V` com posições, `F` com `vs` de quatro
ids e `parte` herdado. Nenhum campo novo, nenhuma mudança de schema, nenhuma
receita existente afetada.

**O ponto de atrito, declarado agora para não virar surpresa em P2:** o alocador
posicional aborta em `id >= BLOCO` (`nucleo.js:403`). A compilação precisa
escrever ids fora desse caminho. Duas rotas, e P1 **não escolhe** — a escolha
depende de medição que só P2 tem:

| rota | como | custo |
|---|---|---|
| compilação fora do passo | `subdividir` emite artefato derivado, sem passar por `baseDoPasso` | exige ponto de extensão novo no núcleo |
| compilação por regiões | a malha densa vira N passos de ≤ 900 | 15+ passos por peça, e a decomposição vira identidade |

A segunda rota é a que o `CLAUDE.md` desaconselha, porque faz a decomposição em
regiões virar identidade persistida. A primeira é a preferida, e P2 mede o custo.

## 7. Política de diff

Não existe diff estrutural hoje — `exportar:check` compara texto byte a byte
(`exportar-peca.mjs:262`) e diz apenas "mudou" ou "não mudou". Para uma cage isso
é inútil: mover um vértice 1 mm e reconstruir a topologia inteira produzem o mesmo
veredito.

O diff é computado **sobre a cage**, nunca sobre o compilado, e classifica em três
famílias que não se misturam:

| classe | condição | o que reportar | aprovação |
|---|---|---|---|
| **forma** | mesma contagem de V e F, mesma incidência | deslocamento máximo e médio, por loop nomeado | automática se dentro dos limiares de P0 |
| **topologia** | contagem ou incidência mudou, ou loop ganhou/perdeu vértice | o que entrou e o que saiu, por loop | explícita, sempre |
| **semântica** | um `parte` ou nome de loop apareceu, sumiu ou trocou de face | o nome afetado e as faces envolvidas | explícita, sempre |

Uma mudança pode cair em mais de uma classe; o relatório lista todas. Região que
desaparece por edição é **estado explícito**, não silêncio — é o item que o
dossiê, seção 11, deixou em aberto.

## 8. Orçamento, herdado de P0 e refinado

| nível | teto | uso |
|---|---|---|
| cage | 2800 quads, ≤ 900 V e ≤ 900 F por passo | artefato autoral versionado |
| nível 1 | 11200 quads | preview na bancada |
| nível 2 | 44800 quads | publicação |

Quarto dianteiro: ≤ 800 quads de cage, que é o critério de descarte de P2.

## 9. O que P1 não decide

Implementação de `subdividir`, escolha entre as duas rotas da seção 6, onde a
subdivisão executa, custo de bundle e memória, formato de exportação do nível
compilado, e qualquer geometria. P2 e P3 tratam disso.

Também não decide vinco por vértice (canto agudo isolado): nenhum caso do alvo de
P0 pediu, e inventar agora seria contrato sem requisito.

## 10. Registro

- **P1 v1 — 2026-08-19:** formato `mecanifica.cage-quad@1` fixado como artefato
  autoral separado, para não esticar `malha-poligonal@1` e quebrar a
  compatibilidade byte a byte. Aresta declarada como par ordenado derivado, já
  que o formato salvo não tem entidade aresta. Loop nomeado definido como caminho
  de vértices, com domínio fechado de sete nomes. Seção transversal encaixada
  como conferência e explicitamente **não** como geradora, para não reintroduzir
  varredura. **Formulação do dossiê corrigida:** a malha compilada não tem
  identidade persistida — id derivado de posição em lista ordenada é exatamente o
  que `CLAUDE.md` proíbe; o que persiste é a cage e o nome semântico, e a herança
  de `parte` pelas quatro filhas é o que faz a seleção atravessar a subdivisão.
  Atrito com `local(id)` em `nucleo.js:403` registrado com duas rotas e sem
  escolha, porque a escolha depende de medição de P2. Política de diff escrita do
  zero, em três classes, porque a comparação atual é byte a byte e não distingue
  forma de topologia.

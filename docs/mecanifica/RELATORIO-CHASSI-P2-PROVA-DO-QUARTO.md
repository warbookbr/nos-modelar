# Chassi P2 — relatório da prova do quarto dianteiro

Rodada P2 do [plano do chassi](planos/2026-08-18-chassi-realista-kernel-geometrico.md),
executada sob [`planos/2026-08-19-chassi-p2-prova-do-quarto.md`](planos/2026-08-19-chassi-p2-prova-do-quarto.md).
Alvo em [`CHASSI-P0-ALVO-E-LIMIARES.md`](CHASSI-P0-ALVO-E-LIMIARES.md);
contrato em [`CHASSI-P1-CONTRATO-DA-CAGE.md`](CHASSI-P1-CONTRATO-DA-CAGE.md).

Código e evidências em
`autoria-assistida/experimentos/prova-cage-quarto-dianteiro/`. Zona privada e
descartável: núcleo, receitas, catálogo e baseline não foram tocados.

## 1. O que foi construído

| módulo | o que faz |
|---|---|
| `subdividir.mjs` | Catmull-Clark determinística com vinco semi-agudo |
| `cage.mjs` | formato `mecanifica.cage-quad@1`, validador e espelhamento |
| `quarto-dianteiro.mjs` | a cage do quarto, derivada dos landmarks de P0 |
| `compilar.mjs` | compilação, medida e critério de descarte |
| `alteracao-local.mjs` | `elevar a crista 25 mm`, medida |
| `forma-nao-automotiva.mjs` | invólucro com rasgo, pelos mesmos módulos |
| `render.mjs` | desenho sólido por pintor, sem dependência |

51 testes.

## 2. Medidas

| grandeza | valor |
|---|---|
| cage do quarto dianteiro | **114 quads**, 157 vértices |
| cage espelhada | 228 quads, 298 vértices |
| nível 1 | 912 faces, 1021 vértices, 68 KB, 8,6 ms |
| nível 2 | 3648 faces, 3835 vértices, 295 KB, 22,9 ms |
| razão cage → nível 2 | 16,0× |
| pontos extraordinários internos | **4** |
| faces removidas para abrir o arco | 18 |
| vincos declarados | 32 |

## 3. Critério de descarte, os três braços

| braço | limite | medido | veredito |
|---|---|---|---|
| tamanho da cage | ≤ ~800 quads | 114 | **passa**, com folga de 86% |
| arco sem booleana | obrigatório | 18 faces removidas por topologia | **passa** |
| alteração local | ≤ 1 loop | **2 loops** | **disparou** |

## 4. O braço que disparou, e o diagnóstico

`elevar a crista 25 mm` moveu 16 vértices e tocou dois loops nomeados:
`cristaParalama` e `baseParabrisa`.

A causa está medida, não suposta: os dois loops compartilham **exatamente um
vértice** — o 138, em `(869, 975, 466)`, onde a crista do para-lama termina na
base do para-brisa. Não são duas regiões acopladas; são duas linhas de caráter
que se encontram, como se encontram num carro real.

Efeito da edição na malha compilada: topologia intacta, 1324 de 3835 vértices
moveram, deslocamento máximo 17,2 mm a partir de um comando de 25 mm, e a
reexecução deu resultado idêntico.

**Este relatório não renegocia o critério.** Ele foi declarado em P0 antes de
existir geometria, justamente para não ser afrouxado quando incomodasse, e o
projeto inteiro nasceu de um gate que passou quando não devia. O que está
registrado é o fato medido e o diagnóstico; a decisão entre *reabrir a
representação* e *refinar o critério* é do usuário, e precisa ficar escrita.

A leitura honesta do autor, oferecida como recomendação e não como veredito: a
intenção do critério era garantir **controle independente** — que mexer na crista
não arraste o capô nem a porta. Isso foi cumprido. O que o critério não previu é
que loops nomeados formam rede, e encontro em vértice terminal é inevitável em
qualquer cage real. Se ele for refinado, a forma defensável é contar apenas loops
tocados em mais de um vértice.

## 5. O que a prova mostrou que o `loft` não fazia

- **abertura de verdade.** O arco é buraco na malha, com contorno projetado sobre
  o círculo de 385 mm e retorno de borda de 26 mm. Não é borda de envelope nem
  recorte pintado.
- **regiões da mesma superfície.** Capô, para-lama e lateral são nomes de face
  numa malha só, provado por componente conexo único no teste.
- **nome que atravessa a subdivisão.** `sel: { grupo: 'paralamaDianteiro' }`
  vale igual na cage e no nível 2, sem tabela de tradução, porque a face carrega
  o nome e as filhas herdam.
- **linha de caráter por vinco.** A linha de ombro é nitidez 1,4 sobre um loop,
  não uma fileira extra de geometria.

## 6. Veredito: REPROVADA no eixo de aceite

O usuário reprovou a forma. Isso é o veredito de registro, e não um comentário
ao lado das medidas.

**O erro de método que produziu este relatório precisa ficar escrito**, porque
ele é a falha fundadora do projeto repetida com roupa nova. Em 2026-08-18 os
gates passaram e o usuário reprovou. Aqui o autor escreveu o gate verde e a
reprovação **na mesma página** — a seção 2 com medidas boas e a seção de limites
admitindo forma medíocre — e mesmo assim chamou o conjunto de prova. Admitir o
defeito por antecipação não é aceitá-lo: é blindá-lo para que passe assim mesmo.

As oito condições de rejeição visual de P0 existem exatamente para converter
"ficou ruim" em específico, e **não foram rodadas** antes de fechar. Rodando:

| condição de P0 | resultado |
|---|---|
| 1 — lê como cápsula, tubo ou sabonete | **dispara** |
| 2 — arco lê como borda pintada | passa |
| 3 — para-lama lê como volume anexo | passa |
| 5 — reflexão quebra na linha de ombro | **dispara** — a linha não se lê |
| 6 — recorte de farol lê como decalque | **dispara** — está invisível |
| 8 — densidade na amostragem e não na forma | inconclusivo |

Cada uma reprova sozinha, por decisão declarada antes de existir geometria.

### O diagnóstico que a condição 5 entrega

A linha de ombro foi declarada com nitidez 1,4 e **não aparece**. A causa não é
nível de subdivisão nem vinco fraco:

> **O vinco foi aplicado onde não há quebra.** Nos anéis 4 e 5 da seção, a
> superfície é quase colinear. Vinco torna nítido um ângulo que já existe; onde a
> superfície é lisa, ele não faz nada.

E isso aponta a causa raiz da forma inteira: a cage foi gerada a partir de uma
silhueta e de uma meia largura, com a seção transversal **interpolada
genericamente**. P1 encaixou a seção como contrato de entrada da cage
precisamente para isso, e esta rodada passou por cima. Sem seção com caráter, não
há caráter para vinco nenhum revelar.

## 7. Limites honestos desta prova

- **a forma é medíocre.** A máquina está provada; o desenho não. A vista frontal
  ainda lê como banheira, o recorte de farol mal se enxerga e o nariz termina num
  corte plano. Nada disso é limitação da representação — é do autor, e é o que a
  crítica visual e o aceite do usuário existem para pegar;
- **não há comparação numérica contra a prancha do P0** nesta rodada;
- **`subdividir` não entrou no núcleo** e não deve entrar antes de P3 medir custo;
- **o crítico visual não foi despachado** ainda, conforme o protocolo de
  `REFERENCIA-E-CRITICA-VISUAL.md`.

## 8. Registro

- **P2 v1 — 2026-08-19:** Q1 a Q5 executadas. Dois braços do critério de descarte
  passam com folga; o terceiro disparou por um vértice compartilhado entre dois
  loops que se encontram.
- **P2 v2 — 2026-08-19:** **reprovada pelo usuário no eixo de aceite.** Três das
  oito condições de rejeição visual de P0 disparam, e elas não haviam sido
  rodadas antes de fechar. Registrado o erro de método — autocrítica preventiva
  usada como blindagem, com gate verde e reprovação na mesma página. Causa raiz
  da forma isolada: a seção transversal foi interpolada genericamente em vez de
  declarada, então não existe quebra para o vinco revelar, e a linha de ombro não
  se lê. A representação **não** está confirmada por esta rodada: medida boa com
  forma reprovada não confirma nada.

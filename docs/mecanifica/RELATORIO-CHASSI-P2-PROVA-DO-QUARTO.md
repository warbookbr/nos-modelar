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

## 6. Limites honestos desta prova

- **a forma é medíocre.** A máquina está provada; o desenho não. A vista frontal
  ainda lê como banheira, o recorte de farol mal se enxerga e o nariz termina num
  corte plano. Nada disso é limitação da representação — é do autor, e é o que a
  crítica visual e o aceite do usuário existem para pegar;
- **não há comparação numérica contra a prancha do P0** nesta rodada;
- **`subdividir` não entrou no núcleo** e não deve entrar antes de P3 medir custo;
- **o crítico visual não foi despachado** ainda, conforme o protocolo de
  `REFERENCIA-E-CRITICA-VISUAL.md`.

## 7. Registro

- **P2 v1 — 2026-08-19:** Q1 a Q5 executadas. Dois braços do critério de descarte
  passam com folga; o terceiro disparou por um vértice compartilhado entre dois
  loops que se encontram. Veredito Q6 pendente de decisão do usuário sobre o
  critério.

# Dossiê: roda-esportiva

Gerado por `npm run dossie -- roda-esportiva` do que já está gravado; não edite fora dos marcadores `a-mao`, porque `npm run dossie -- roda-esportiva --check` recusa o arquivo diferente do gerado. A seção entre os marcadores é escrita à mão e o gerador a preserva.

## Aceite da pessoa ao alinhamento

Sem `ALINHAMENTO.md` na pasta: o aceite da pessoa ao alinhamento não está gravado.

## Planos que cobrem a pasta

Nenhum plano na árvore cobre a pasta deste objeto.


Planos encerrados que citam o objeto (o texto está no git, no commit que a crônica indica):

- `2026-11-25-resgate-dos-ramos-antigos.md`: Resgate dos ramos antigos (2026-11-26): catorze peças, a roda esportiva pausada, a análise da bancada, as armadilhas, a confirmação corpo a corpo, melhorias do arredondamento de costura, referenciasNaoConstruidas e ramos:parados na main; a origem dos pedaços refeitos foi ao backlog pela revisão adv… (commit `f581bc872`)

## O alvo

- Objeto: roda esportiva de carro com pneu 245/40 R19, etapa 1 (aro, raios, tampa, parafusos, valvula, pneu)
- Escala: diametro externo do pneu, 679 mm
- Referências: `referencias/alvo.md`, `referencias/locais/variante-a.jpg`, `referencias/locais/variante-b.jpg`; não construídas: `referencias/locais/variante-b.jpg`
- Partes do plano:
  - `aro`: barril de liga leve com a borda externa fina e arredondada, assento do pneu, canaleta funda por dentro e barril visivel atras dos raios. Técnica declarada: lathe de seção fechada com concordância nas bordas e furo da válvula por subtrair; unido aos raios por unir e arredondarCostura (raio 8, raioMinimo, afinarPontas)
  - `raios`: variante A dez raios finos em cinco pares em V, variante B cinco raios duplos; concavos, com o centro recuado, fundidos ao aro e ao centro. Técnica declarada: extrusao de eixo x com janelas de canto redondo (deslocar), intersectar com prato de lathe que dá a concavidade, subtrair do furo e dos assentos, unir ao aro e arredondarCostura; na variante B a face da frente é usinada
  - `tampaCentral`: disco grafite com a borda arredondada, assentado no furo central. Técnica declarada: lathe com concordancia na borda
  - `parafusos`: cinco parafusos de cabeça sextavada cônica nos assentos rebaixados do centro, no círculo de 112 mm. Técnica declarada: lathe de seis lados repetido por arranja radial
  - `valvula`: bico de valvula curto na borda do aro, entre dois raios. Técnica declarada: lathe de eixo x assentado em furo da borda
  - `pneu`: perfil baixo de flanco abaulado, banda com quatro sulcos ao longo da volta e garras diagonais nos dois ombros. Técnica declarada: lathe da seção do pneu com os quatro sulcos no próprio perfil; garras diagonais por subtrair de uma ferramenta (cubo girado em y e em z) repetida por arranja radial, 60 por ombro
- Critérios de reprovação:
  - raio que termina dentro do barril, abaixo do labio, com pe ou degrau: a ponta sobe ate a face do labio e se funde a ele em curva continua
  - raio de largura constante: ele alarga do centro (cerca de 20 mm) para o aro (cerca de 28 mm)
  - variante A com os dois raios do par grudados alem do primeiro quarto do comprimento: o par se abre desde o centro, cada raio com cerca de 20 mm junto ao centro e laterais fundas, com corpo, e o miolo pouco alem dos parafusos
  - degrau, fresta ou quina viva na emenda dos raios com o aro ou com o centro
  - pneu sem sulcos ou sem garras nos ombros, ou banda lisa
  - raios planos, sem a concavidade do centro recuado
  - pneu atravessando o aro, ou folga visivel entre pneu e assento
  - variante A sem os pares em V, ou variante B sem a face usinada de outra cor
  - barril do aro sem espaco livre para o disco de 360 mm e a pinca

### Operações

Passos da receita: 55. Operações por parte, lidas do grafo dos passos (uma operação que serve a mais de uma parte aparece em todas):

| Parte | Operações (nome ×vezes) |
| --- | --- |
| `raios` | lathe ×6, rotaciona ×1, subtrair ×2, extrusao ×1, intersectar ×1, arranja ×1, limparLascas ×2, unir ×1, arredondarCostura ×1, parte ×2, material ×1, liso ×1 |
| `aro` | lathe ×2, rotaciona ×1, subtrair ×1, parte ×1, material ×2, liso ×1 |
| `tampaCentral` | lathe ×1, parte ×1, material ×1, liso ×1 |
| `parafusos` | lathe ×1, arranja ×1, parte ×2, material ×1, liso ×1 |
| `valvula` | lathe ×1, rotaciona ×1, parte ×1, material ×1, liso ×1 |
| `pneu` | lathe ×1, cubo ×2, rotaciona ×4, transladar ×2, arranja ×2, subtrair ×1, limparLascas ×1, parte ×1, material ×1, liso ×1 |

### Rodadas

| Rodada | Registrada | Medidas | Nota | Defeitos | Decisão da pessoa |
| --- | --- | --- | --- | --- | --- |
| 1 | 2026-11-14 | passou | 5 | 4 | sem decisão gravada |
| 2 | 2026-11-14 | reprovou | sem veredito | - | sem decisão gravada |
| 3 | 2026-11-14 | passou | 5 | 4 | sem decisão gravada |
| 4 | 2026-11-14 | passou | 4 | 5 | sem decisão gravada |
| 5 | 2026-11-14 | passou | 5 | 5 | sem decisão gravada |
| 6 | 2026-11-14 | passou | 5 | 5 | sem decisão gravada |

Faces e tempo da execução: nenhuma rodada os gravou (`medidas.faces` e `medidas.segundos` entram nas rodadas registradas desde 2026-11-27; as anteriores não são reescritas).

Atrito e nota de passagem de cada rodada, condensados (o texto inteiro está na rodada gravada):

- rodada 1: nota: Aro e raios são uma superfície só (unir + arredondarCostura raio 8). Espaço do freio por espacoDoFreio(): disco assenta em x = 40, barril livre até r… | atrito: arredondarCostura nas arestas convexas das janelas recusou sempre perto do ápice da fresta em V e do centro;…; o raio mínimo da costura (1/64 da meia-extensão) não aparece na documentação, só na recusa (e mais 6)
- rodada 2: nota: Raios alargados (A 36/50, B 38/50) porque o alvo tem raios encorpados; prato com expoente 1.3 e liso 60 para ler a concavidade; ladosDoPrato fica em… | atrito: arredondarCostura convexas nos raios recusa em raio 3, 4 e 6 mm; o minimo 1/64 da meia-extensao so aparece na…; abas serrilhadas nas pontas dos raios e o recorte do aro parecem faces de parede divididas pelo unir e agrupa… (e mais 4)
- rodada 3: nota: As lascas vinham todas do arredondarCostura da costura aro-raios; a rodada 2 subiu paineisDaCostura para 24 e foram a 288. Varri o parametro: 13 da 1… | atrito: o seletor de parte nao tem criterio radial: nao da para reatribuir ao aro as faces de parede do barril que o…; paineisDaCostura tem otimo estreito e nao monotonico (13 da 186, 24 da 288, 0 gera falso zero); so a varredur… (e mais 4)
- rodada 4: nota: O afinamento dos raios e decisao da pessoa. Medi em variante-a.jpg (aro 790 px = 500 mm): raio 0,047 do diametro do aro na raiz (24 mm) e 0,06 na pon… | atrito: o seletor de parte nao tem criterio radial: nao da para reatribuir ao aro as faces de parede que o unir junta…; arredondarCostura e caprichoso com a geometria: mudar avancoAxialDaParede de 28 para 29 faz o passo recusar o… (e mais 5)
- rodada 5: nota: Pares em V pelo pedido da pessoa: raio 15-16 mm (~3% do aro), miolo 76 mm, centros em 5 graus a r=80 e 8,5 graus no aro, janela estreita com canto 4.… | atrito: onde.radial junto com origem de arredondarCostura nao selecionou nada; so sel grupo raios + onde.radial devol…; bancada --sem-cache devolveu a imagem antiga na selecao isolada; so --analise regenerou as vistas (e mais 4)
- rodada 6: nota: Largura 20 mm constante (decisao da pessoa), aro com parede 12 e canaleta 19 para manter o fundo em r=210,3 e a folga da pinca. Prato mais grosso por… | atrito: PLANO.criteriosDeReprovacao[0] da decisao da pessoa chegou com 247 caracteres e o descrever recusou o plano;…; raioDaQuinaDosRaios 3,8 e 4: arredondarCostura de arestas convexas deixa 2899 faces sem identidade e a parte… (e mais 7)

Defeitos da rodada 6, a última com veredito:

- `aro`, superficie (anguloso): parede interna do barril, onde os raios encostam
- `raios`, angulo (menor): origem dos pares em V, junto ao miolo
- `raios`, comprimento (maior): miolo central, que se estende além do círculo dos parafusos
- `raios`, espessura (menor): corpo de cada raio, do miolo ao aro
- `raios`, uniao (afastado): extremidades externas dos raios, emenda com o aro

Observação do crítico: Pneu, tampa, parafusos e válvula batem com o alvo; o conjunto fica comprometido pela emenda estilhaçada dos raios com o aro e pelos raios finos demais.

A pasta não tem `decisoes-da-pessoa.json`: o julgamento da pessoa sobre as rodadas anteriores não está gravado como decisão.

### Escolhas de técnica, à mão

<!-- dossie:a-mao:peca:inicio -->
_Escolhas de técnica e o porquê. Um item por escolha, no modelo `escolha: porquê (a rodada, o plano ou a medida que a mostrou)`. Sem rodada nem medida que a sustente, a frase não entra._

- raios por extrusão com janelas furadas, cortada por `intersectar` com um prato de revolução: dá a concavidade do centro recuado sem modelar cada raio, e a largura dos raios sai da janela (rodada 5, centros a 5 graus na raiz e 8,5 no aro; rodada 6, largura de 20 mm por decisão da pessoa).
- raios e aro numa superfície só, por `unir` e `arredondarCostura`, com `limpar` ligado e raio de costura 5: o par de 5 mm com abertura de 8,5 mm no aro foi a combinação que deu 0 lascas, e subir `paineisDaCostura` só multiplicou as lascas (rodada 3, de 186 para 288; rodada 6).
- sem o passo de devolver a parede ao aro por raio maior ou igual a 212: ele criava as abas (rodada 6).
- avanço axial da parede 31 mm e dobra 2 mm escolhidos por varredura, que deu 179 faces finas (rodada 4).
<!-- dossie:a-mao:peca:fim -->

### Dívida conhecida, à mão

<!-- dossie:a-mao:peca.divida:inicio -->
- contatos: o `CONTATOS` ficou vazio e o `descrever` não decide 8 pares, porque aro e raios são, cada um, casca aberta (atritos das rodadas 1 a 6); o assento do pneu foi medido à parte.
- faces finas dos raios: o `arredondarCostura` das arestas convexas deixa lascas que o `limparLascas` não tira, e o número oscila de 0 a 8 com qualquer variação de painéis ou de raio (atrito da rodada 6).
<!-- dossie:a-mao:peca.divida:fim -->

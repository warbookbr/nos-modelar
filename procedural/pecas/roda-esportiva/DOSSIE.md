# Dossiê: roda-esportiva

Gerado por `npm run dossie -- roda-esportiva` do que já está gravado; não edite fora dos marcadores `a-mao`, porque `npm run dossie -- roda-esportiva --check` recusa o arquivo diferente do gerado. A seção entre os marcadores é escrita à mão e o gerador a preserva.

## Planos que cobrem a pasta

- [Ferramentas e documentação: toda ferramenta registrada e achada, e o roteador cobrindo o trabalho inteiro](../../../docs/modelar/planos/2026-11-26-ferramentas-e-documentacao.md) (ativo)
  - banco de provas: [ferramentas-e-documentacao-2026-11-26](../../../docs/modelar/banco-de-provas/ferramentas-e-documentacao-2026-11-26); sem tabela de tentativas

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

Defeitos da rodada 6, a última com veredito:

- `aro`, superficie (anguloso): parede interna do barril, onde os raios encostam
- `raios`, angulo (menor): origem dos pares em V, junto ao miolo
- `raios`, comprimento (maior): miolo central, que se estende além do círculo dos parafusos
- `raios`, espessura (menor): corpo de cada raio, do miolo ao aro
- `raios`, uniao (afastado): extremidades externas dos raios, emenda com o aro

Observação do crítico: Pneu, tampa, parafusos e válvula batem com o alvo; o conjunto fica comprometido pela emenda estilhaçada dos raios com o aro e pelos raios finos demais.

A pasta não tem `decisoes-da-pessoa.json`: o julgamento da pessoa sobre as rodadas anteriores não está gravado como decisão.

### Medida de faces e tempo

Faces e tempo de execução: não gravados. O registro da rodada guarda só `facesFinas`, as faces finas, e nenhum arquivo guarda o total de faces nem o tempo da receita. De onde viria: `medidas.faces` e `medidas.segundos` no `rodada-NN.json`, tirados do `descrever` que `rodada-de-modelagem.mjs` já roda; proposta ao plano do laço de modelagem.

### Escolhas de técnica, à mão

<!-- dossie:a-mao:peca:inicio -->
_Escolhas de técnica e o porquê. Um item por escolha, no modelo `escolha: porquê (a rodada, o plano ou a medida que a mostrou)`. Sem rodada nem medida que a sustente, a frase não entra._

- raios por extrusão com janelas furadas, cortada por `intersectar` com um prato de revolução: dá a concavidade do centro recuado sem modelar cada raio, e a largura dos raios sai da janela (rodada 5, centros a 5 graus na raiz e 8,5 no aro; rodada 6, largura de 20 mm por decisão da pessoa).
- raios e aro numa superfície só, por `unir` e `arredondarCostura`, com `limpar` ligado e raio de costura 5: o par de 5 mm com abertura de 8,5 mm no aro foi a combinação que deu 0 lascas, e subir `paineisDaCostura` só multiplicou as lascas (rodada 3, de 186 para 288; rodada 6).
- sem o passo de devolver a parede ao aro por raio maior ou igual a 212: ele criava as abas (rodada 6).
- avanço axial da parede 31 mm e dobra 2 mm escolhidos por varredura, que deu 179 faces finas (rodada 4).
<!-- dossie:a-mao:peca:fim -->

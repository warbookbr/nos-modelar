# Sonda: do esboço traduzido à receita do Mecanifica, sem agente (2026-10-19)

A pessoa preferiu converter as cadeiras do esboço traduzido em receita do Mecanifica, em vez de modelar uma família à mão. A sonda `sonda-passos.mjs` lê as formas resolvidas do esboço de uma receita (`formasResolvidas`) e escreve, para cada caixa sem giro, os passos `cubo` (com `larg`, `alt`, `prof` e `em`, em metro) e `parte` (o nome da peça) que o núcleo executa (`executarReceita`). Nenhum agente e nenhum token de modelagem: a conversão é mecânica. A comparação é a caixa envolvente da malha executada contra a do esboço.

| Cadeira | Passos | Peças recusadas | Caixa envolvente da receita contra a do esboço |
|---|---|---|---|
| cadeira_ripada_simples | 30 | 0 | igual (510 × 1120 × 540) |
| cadeira_almofadada_clara | 32 | 0 | igual |
| cadeira_basica_clara | 12 | 0 | igual |
| cadeira_ripada_marrom | 20 | 0 | igual |
| cadeira_larga_estofada_clara | 18 | 0 | igual |
| cadeira_larga_estofada_amarela | 18 | 0 | igual |
| cadeira_fibra_azul | 18 | 1 (almofada girada) | altura 700 contra 757,6 |
| cadeira_fibra_roxa | 18 | 1 (almofada girada) | altura 670 contra 726,7 |
| cadeira_desgastada_madeira | 50 | 9 (pregos, cilindros) | profundidade 555 contra 563 |
| cadeira_classica_creme | 10 | 15 (extrusões, cilindros, giradas) | muito menor |
| cadeira_classica_vinho | 10 | 21 (extrusões, cilindros, giradas) | muito menor |

Seis das onze saem completas e com a caixa idêntica. O que falta para as outras cinco é traduzir três coisas que o núcleo já tem como operações: o giro de uma forma, o cilindro e a extrusão. O chanfro de 2 a 10 mm dos cantos das caixas não entrou (seria um `arredondarAresta` por aresta) e é uma diferença de acabamento em todas. A conversão também copia o que a receita de origem tem de errado (peças atravessadas e desalinhadas); os ajustes da pessoa e qualquer limpeza ficam como passo explícito sobre a receita convertida.

## Extensão (2026-10-19)

A conversão virou a ferramenta `tools/mecanifica/esboco-para-passos.mjs`, com teste, e passou a cobrir o giro (a matriz do esboço vira até três `rotaciona` em torno do centro da forma), o cilindro em qualquer eixo, a extrusão e o chanfro (`chamferBox`). Cada forma é executada sozinha pelo núcleo e conferida contra a do esboço (caixa envolvente em 0,5 mm e, na extrusão, o conjunto dos vértices do perfil); a orientação e o sinal que o núcleo usa em `eixo` e em `rotaciona` saem da própria conferência. As onze cadeiras convertem sem nenhuma recusa, com a caixa envolvente da malha idêntica à do esboço, e as vitorianas (extrusões e cilindros girados, 20 e 26 peças) levam cerca de 0,2 s cada.

`receitas-nucleo.png` mostra as onze cadeiras executadas pelo núcleo a partir dos passos convertidos (isométrica, sem material nem ajuste). Os ajustes da pessoa (o branco da `cadeira_larga_estofada_clara` e o topo das pernas da frente da `cadeira_almofadada_clara`) ainda não foram aplicados.

## Alinhamento das caixas (2026-10-19)

A pessoa marcou na imagem trinta e cinco pontos com defeito. Eles vêm de desencontros da receita de origem, e não do núcleo: pernas da esquerda recuadas 27 mm da borda do assento enquanto as da direita ficam rentes, postes 28 mm fora de alinhamento com as pernas de trás, topo de perna a 32 mm do assento, faces que diferem por 1 a 6 mm. A ferramenta `tools/mecanifica/esboco-alinhar-caixas.mjs` trata esses desencontros em caixas sem giro, com quatro regras e o limite de cada uma escrito no arquivo: simetria em torno do eixo do objeto, colunas (pernas da frente e de trás alinhadas), degrau (faces de 0,25 a 6 mm viram iguais), contato e folga (até 40 mm). Ligada na conversão (`passosDoEsboco(esboco, { alinhar: true })`), ela altera de 0 a 57 caixas por cadeira, sem recusa e com a caixa envolvente a menos de 15 mm da do esboço. `receitas-nucleo-alinhadas.png` mostra o resultado. O que a regra não trata: formas giradas, cilindros e extrusões (a vitoriana quase toda), e o que a receita de origem desenhou de propósito com detalhe estranho, como as tábuas do encosto da `cadeira_desgastada_madeira`.


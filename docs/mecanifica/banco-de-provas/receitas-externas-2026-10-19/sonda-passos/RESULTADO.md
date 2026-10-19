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

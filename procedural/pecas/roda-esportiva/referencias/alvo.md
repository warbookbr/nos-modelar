# Alvo da roda esportiva

Estado: pausada pela pessoa na rodada 6 (ver Andamento, ao fim); a peça está no acervo mas não está aprovada.

Roda esportiva de carro com pneu e freio, peça inteira, em duas variantes da mesma receita (`variante` na TABELA). Imagens de caráter geradas por IA, fora do versionamento: `referencias/locais/variante-a.jpg` e `referencias/locais/variante-b.jpg`. Valem como caráter, nunca como medida.

## Escala

Pneu 245/40 R19: aro de assento 482,6 mm, largura do pneu 245 mm, flanco de 98 mm, diâmetro externo perto de 679 mm. Aro de 8,5 polegadas de largura (216 mm). Disco de freio de 360 mm por 32 mm. Furação de 5 parafusos em círculo de 112 mm.

## Etapas de montagem

Etapa 1, roda e pneu (esta rodada):

1. `aro`: liga leve, com a borda externa fina e arredondada, o assento do pneu, a canaleta funda por dentro e o barril visível atrás dos raios. Os raios nascem do centro e se fundem à borda do aro em curva contínua, sem degrau nem quina na emenda (critério da pessoa). Centro com assento dos cinco parafusos rebaixados e furo da tampa.
2. `raios`: variante A, dez raios finos em cinco pares em V, grafite escuro; variante B, cinco raios duplos com a face da frente usinada clara e as laterais grafite. Raios côncavos: o centro fica recuado em relação à borda do aro.
3. `tampaCentral`: disco grafite com a borda arredondada.
4. `parafusos`: cinco, com cabeça sextavada ou cônica, nos assentos.
5. `valvula`: bico de válvula curto na borda, entre dois raios.
6. `pneu`: perfil baixo, flanco abaulado, banda com quatro sulcos ao longo da volta e garras em diagonal nos dois ombros, com o passo e a inclinação da imagem. Sem letras na lateral.

Etapa 2, freio (rodada seguinte, depois da aprovação da etapa 1): `disco` furado com cubo central e `pinca` (amarela na A, vermelha na B), abraçando o disco por trás dos raios. Não modelar na etapa 1, mas deixar o espaço e as medidas para ela: o disco e a pinça cabem dentro do barril do aro sem tocar os raios.

## Contatos

Pneu assentado no assento do aro; raios fundidos ao aro (uma superfície contínua, não peças encostadas); tampa no furo central; parafusos nos assentos; válvula no furo da borda.

## Materiais

Borracha (pneu), liga leve grafite (aro, raios), face usinada clara (raios da variante B), metal (parafusos, válvula).

## O que reprova

- Degrau, fresta ou quina viva na emenda dos raios com o aro ou com o centro.
- Pneu sem sulcos ou sem garras nos ombros, ou banda lisa.
- Raios planos, sem a concavidade do centro recuado.
- Pneu atravessando o aro, ou folga visível entre pneu e assento.
- Variante A sem os pares em V, ou variante B sem a face usinada de outra cor.
- Barril do aro sem espaço livre para o disco de 360 mm e a pinça.

## Andamento (2026-11-14)

Laço pausado pela pessoa depois da rodada 6 (notas 4, 4, 5, 4, 5, 5; a ferramenta deu parar-sem-convergencia). Pneu, tampa, parafusos e válvula conferem. Os raios e a emenda com o aro seguem reprovados e esperam o motor: arredondar as quinas dos raios (`arredondarCostura` convexo em 3,8 mm passa com `pularOQueNaoCabe`, mas o `subtrair` seguinte recusa por aresta de 9e-8 m, abaixo da precisão da Manifold). A origem das faces cortadas já se propaga e devolve a parede da emenda ao aro. Ao retomar, a pessoa pediu raio que alarga de cerca de 20 mm no centro a 28 mm no aro e ponta fundida à face do lábio, já escritos nos critérios do PLANO.

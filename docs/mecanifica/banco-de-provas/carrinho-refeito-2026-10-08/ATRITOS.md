# Atritos

## Bacia oca de parede inclinada e contorno arredondado (caçamba do carrinho)

O módulo não tem uma forma que una o contorno do fundo ao da boca como casca: o `loft` só aceita seção convexa, então um loft vazado (anel entre dois contornos) é recusado, e a `revolucao` e o `anel` só dão contorno circular. O comando que mostra a recusa:

`npm run esboco -- docs/mecanifica/banco-de-provas/carrinho-refeito-2026-10-08/atrito-loft-vazado.esboco.json --descrever`

Saída: `esboço recusado: opção 1 (loft vazado), forma "bacia", secoes[0]: o "perfil" da seção precisa ser um polígono convexo (o loft não aceita seção côncava; use "extrusao" para o perfil côncavo)`. A `extrusao` aceita perfil côncavo, mas sem inclinação (seção constante ao longo do eixo), e uma parede inclinada com contorno em D (frente em arco, cantos arredondados) só sai com uma faceta por trecho do contorno, cada uma com coordenadas próprias, o que não acompanha os parâmetros do chassi.

Aproximação usada: fundo em caixa, quatro paredes em loft de seção retangular (largura e posição em função dos parâmetros) e a borda em tubo com `raioCurva`. Ficam sem representação o arco da frente, os cantos arredondados das paredes e a curva de transição entre o fundo e a parede da frente.

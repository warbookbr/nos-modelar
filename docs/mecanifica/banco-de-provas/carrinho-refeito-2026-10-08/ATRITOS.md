# Atritos

## Bacia oca de parede inclinada e contorno arredondado (caçamba do carrinho)

O módulo não tem uma forma que una o contorno do fundo ao da boca como casca: o `loft` só aceita seção convexa, então um loft vazado (anel entre dois contornos) é recusado, e a `revolucao` e o `anel` só dão contorno circular. O comando que mostra a recusa:

`npm run esboco -- docs/mecanifica/banco-de-provas/carrinho-refeito-2026-10-08/atrito-loft-vazado.esboco.json --descrever`

Saída: `esboço recusado: opção 1 (loft vazado), forma "bacia", secoes[0]: o "perfil" da seção precisa ser um polígono convexo (o loft não aceita seção côncava; use "extrusao" para o perfil côncavo)`. A `extrusao` aceita perfil côncavo, mas sem inclinação (seção constante ao longo do eixo), e uma parede inclinada com contorno em D (frente em arco, cantos arredondados) só sai com uma faceta por trecho do contorno, cada uma com coordenadas próprias, o que não acompanha os parâmetros do chassi.

Aproximação usada: fundo em caixa, quatro paredes em loft de seção retangular (largura e posição em função dos parâmetros) e a borda em tubo com `raioCurva`. Ficam sem representação o arco da frente, os cantos arredondados das paredes e a curva de transição entre o fundo e a parede da frente.

## A caçamba em casca (carrinho-casca.esboco.json)

Os números abaixo se referem a `carrinho-casca.esboco.json` desta pasta.

1. Uma vista isolada em tamanho grande não sai por `--vista`. O comando `npm run esboco -- carrinho-casca.esboco.json --vista lateral --largura 1100 --saida vistas` imprimiu o relato do gate e não gravou nada na pasta `vistas`. Foi preciso `--analise --largura 1100 --saida vistas` e escolher o arquivo entre as 12 imagens.

2. A medida `larguraEntreManoplas` do chassi usava `mede: "larguraTotal"`, que passa a incluir a boca da caçamba (768 mm contra 584 mm declarados). Rodar `npm run esboco -- carrinho-casca.esboco.json --descrever` com a caçamba e sem trocar o `mede` dá a divergência de medida. A medida passou a `{ "caixa": "x", "formas": ["quadro", "manoplaD", "manoplaE"] }`, com o mesmo valor e a mesma tolerância.

3. O título e a nota da opção continuam descrevendo só o chassi, e o brief do crítico do objeto os copia (`npm run esboco -- --condutor carrinho-casca.esboco.json --proximo`): o crítico cego lê "Chassi de carrinho de mão" diante de uma imagem que tem caçamba.

4. A recusa da casca com `inclinacao` ("o plano do fundo cruzando a seção secoes[1]; afaste essa seção da ponta") não diz a distância mínima, e o plano interno fica a espessura acima do fundo inclinado, não a folga entre seções. Reproduz com `npm run esboco -- carrinho-casca.esboco.json --descrever` tirando `+espCaca` de `p1Caca` nos parâmetros: a primeira seção de transição precisa estar pelo menos uma espessura (4 mm) acima do mínimo sem cruzamento.

5. Sem seno, cosseno nem raiz nas expressões, o raio do arco do fundo e a altura da borda de uma seção inclinada saem de frações e tangentes digitadas à mão (`f1FrenteCaca` e semelhantes em `carrinho-casca.esboco.json`), que envelhecem se a inclinação mudar; `npm run esboco -- --ajuda parametros` confirma a lista de funções.

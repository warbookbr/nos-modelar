---
name: esbocar-opcoes
description: Mostrar à pessoa, em imagem, as opções de forma em disputa durante o alinhamento — cilindros, anéis, caixas, cones, esferas, extrusões, tubos e componentes prontos desenhados lado a lado na mesma escala a partir de um JSON declarativo, junto da foto de referência, com uma frase por opção e a pergunta de qual se parece mais. Use no alinhamento sempre que houver escolha de forma. Não use para desenhar a peça final nem prancha cotada.
---

# Esboçar opções de forma

A pessoa entende forma vendo, e não lendo medidas. Sempre que o alinhamento
chegar a uma escolha de forma (em pé ou deitado, encostado na face ou na ponta,
redondo ou achatado), desenhe as opções com esta ferramenta em vez de
descrevê-las em texto. A referência completa do JSON está em
[`modulos/esboco/README.md`](../../../modulos/esboco/README.md); esta skill
diz como usá-la no alinhamento.

Para esboçar o objeto inteiro com contrato, medidas, unidades e crítico, use a
skill [`esboco-detalhado`](../esboco-detalhado/SKILL.md).

## Pare e planeje

Antes de escrever o JSON, decida por escrito, em um parágrafo curto por decisão, o que segue. Quais peças serão esboçadas e quais ficam de fora, respeitando o limite de cerca de 6 formas por opção no modo de legendas padrão; com mais que isso, escolha `legendas: "lista"`. Se as linhas de centro ficam visíveis. Se há marcações (legendas, numeração, marcadores) e, com mais de uns 6 formas por opção, o modo `legendas: "lista"`. E se o conjunto vira um esboço só ou vários. O texto pode ir no campo opcional `plano` da raiz do JSON, que o desenho ignora e a análise copia para o manifesto; os campos do `plano` de um esboço detalhado estão na skill `esboco-detalhado`. Detalhes em [`PARE-E-ANALISE.md`](../../../docs/mecanifica/usar/PARE-E-ANALISE.md).

## Escrever e rodar

Escreva `<peça>/referencias/<assunto>.esboco.json` e rode
`npm run esboco -- <arquivo>`, que grava `<assunto>.png` e `<assunto>.svg` ao
lado. O exemplo de referência é
[`ombro-opcoes.esboco.json`](../../../procedural/pecas/braco-robotico/referencias/ombro-opcoes.esboco.json).

A raiz tem `opcoes` e, opcionalmente, `vista`: `isometrica` (padrão, a que a
pessoa entende melhor), `frontal`, `lateral` ou `superior`. Cada opção tem
`titulo`, `nota` (uma frase curta) e `formas`, e todas saem na mesma escala,
com barra de 100 mm. Cada forma tem `id`, `tipo`, `cor` e `rotulo` opcional,
que sai fora do desenho como legenda numerada com linha de chamada. Com `legendas: "lista"` (raiz ou opção) o rótulo vira balão numerado sobre a peça e chave numerada abaixo do desenho, sem linha de chamada nem colunas laterais; a peça totalmente atrás de outra ganha balão tracejado na borda de quem a cobre e "(oculta nesta vista)" na chave.

Os tipos são `caixa` (`largura` x, `altura` y, `profundidade` z, `raio` de
canto ou `chanfro` nas doze arestas, e `furos: [{ diametro, centro: [x, z] }]`),
`cilindro` (`diametro`, `comprimento`, `eixo`, `achatado`), `anel`
(`diametroExterno`, `diametroInterno`, `espessura`, `eixo`), `cone`
(`diametro` da base, `diametroTopo` para o tronco, `comprimento`, `eixo`),
`esfera` (`diametro`), `extrusao` (`perfil: [[u, v], ...]` polígono simples,
convexo ou côncavo, `comprimento`, `eixo`), `loft` (`secoes: [{ pos, forma:
"retangulo" | "elipse" | "poligono", tamanho: [u, v], centro: [u, v], raio,
nome }, ...]` em ordem crescente de `pos`, `eixo`), `revolucao` (`perfil:
[[raio, altura], ...]` do começo ao fim do eixo, `eixo`, `lados`) e `tubo`
(`caminho` de 2 ou mais pontos, `diametro`, `raioCurva`). Para tanque, banco e
carenagem use `loft` (a seção muda de tamanho e de centro ao longo do eixo, e
`nome` numa seção vira a âncora `<id>.<nome>`), para uma sela ou um U use
`extrusao` com o perfil côncavo, e para escapamento, cubo e farol use
`revolucao`. Não há curva livre nem seção côncava de loft: as formas são
facetadas, e mais seções ou mais pontos no perfil deixam a forma mais suave.

Posicione pela relação e não por coordenada: a primeira forma leva
`centro: [0, 0, 0]`; as demais usam `sobre: "<id>"` (base no topo daquela) ou
`ponta: { id, lado: "+x" }` (encosta na face daquele lado), com `desloca` para
o ajuste fino. `rotacao: [rx, ry, rz]` em graus gira pela regra da mão direita
em torno do eixo de mundo: rx=+90 leva +y para +z, ry=+90 leva +z para +x e
rz=+90 leva +x para +y.

## Limpar o desenho

`linhasCentro: true` no topo ou na opção traça os eixos de cilindros, anéis e
furos. `ocultar` (topo, opção ou forma; o nível mais interno vence, `[]` religa)
desliga `linhasCentro`, `legendas`, `numeracao`, `marcadores`, `escala`,
`titulo` ou `nota`. `oculto: true` numa forma a tira do desenho sem apagá-la,
e ela segue valendo como referência de `sobre` e `ponta`. Um rótulo que já
começa com número ("1. base") não recebe outro.

## Limites

No modo de legendas padrão, com mais de uns 6 formas por opção o desenho degrada: numa moto de 10 formas as
legendas se cruzam, a escala cai para 0,15 px/mm e as linhas de chamada cortam o
desenho. Com mais de uns 6 formas use `legendas: "lista"`, que sobe a escala
(na mesma moto, 0,28 px/mm na isométrica) e tira as linhas de chamada. Esboce só o que está em
disputa e divida em vários esboços quando ainda assim ficar cheio.

## Conferir antes de mostrar

Abra o PNG com `Read`. Para qualquer esboço que vá à pessoa, rode
`npm run esboco -- <arquivo> --analise` (8 imagens, sem linhas de centro, mais 4 ou 8 quando há sobreposição na projeção; num esboço denso `--analise --rapido` confere contato e projeção só em texto, sem imagem, enquanto você corrige, e `--sugerir` liga a busca de explosão, que custa mais; acrescente `--centros` só se a pessoa quiser vê-las, o que gera 16 e as variantes) e leia as imagens conforme a seção
Esboço de
[`PARE-E-ANALISE.md`](../../../docs/mecanifica/usar/PARE-E-ANALISE.md):
legenda que cruza, balão no elemento errado, escala pequena, oclusão errada e
rotação no sentido errado. Relate os defeitos por vista e região e o que não
foi conferido. Havendo foto, a conferência numérica contra ela
(`--referencia`, por vista e por parte) vem antes das imagens e não as
substitui.

## Como mostrar

Mostre à pessoa a foto de referência e o esboço juntos, uma frase curta por
opção dizendo o que muda entre elas, e termine com a pergunta "qual se parece
mais com o objeto?". A resposta vira decisão escrita no PLANO, como na skill
[alinhar-modelagem](../alinhar-modelagem/SKILL.md).

# Exportador Wavefront OBJ

O módulo serializa a malha neutra de uma peça ou montagem em `.obj`, com uma tag `o` e um grupo `g` por corpo conexo de cada parte. A malha neutra está em metro; a saída multiplica pela escala da unidade escolhida (`mm`, `cm` ou `m`). A porta pública é `src/index.js`, com `exportarObj(opcoes)`, que devolve o texto, os bytes, o `.mtl` quando houver e o diagnóstico.

## Tolerância de triângulo degenerado

Um triângulo da face é degenerado quando a sua altura sobre o maior lado (2 × área ÷ maior aresta) fica abaixo de `tolerancia × 1e-6`. A tolerância é um comprimento, e a altura também, então a comparação é feita entre grandezas do mesmo tipo.

Até a fatia de material e textura de 2026-10-19, a comparação era a área contra `tolerancia²`. Com a tolerância padrão de 1 mm, o limite virava 1 mm² e recusava os triângulos de leque dos cantos arredondados, que têm cerca de 0,6 mm² (um canto de raio 3 mm em 12 passos). O padrão de 1 mm exporta esses cantos agora. A recusa continua valendo para o triângulo sem área de fato, como três pontos colineares. A fração de 1e-6 só separa o zero numérico da geometria real. Com isso, `tolerancia` deixa de barrar triângulos finos de forma visível: quem precisar de um limite maior para a geometria terá de pedi-lo como outra opção, e não existe hoje.

## Material e textura

Cada face pode trazer `material`, o nome declarado na receita. Quando o chamador passa `texturas: { nomeDoMaterial: { arquivo, metrosPorTile } }`, a saída ganha `mtllib`, `usemtl` por parte e coordenadas `vt`. O `.mtl` tem `newmtl`, `Kd 1 1 1` e `map_Kd <arquivo>` para cada material usado, e o nome dele vem de `nomeMtl` (padrão `<nome>.mtl`). A entrada de `texturas` pode trazer `brilho` (número de 0 a 1): o material então ganha `Ns` (brilho x 200) e `Ks` cinza (brilho x 0,5) entre `Kd` e `map_Kd`; sem `brilho` o `.mtl` é o de antes.

As coordenadas são planares. Cada triângulo se projeta no plano do eixo dominante da sua normal, e (u, v) é a posição em metros da malha neutra dividida por `metrosPorTile`. A escala da saída não entra, então o tile tem o mesmo tamanho em qualquer unidade. O OBJ aceita u e v fora de 0 a 1, e o Blender repete a imagem.

Sem `texturas` (ou com o objeto vazio), a saída é a de antes, byte a byte: sem `mtllib`, sem `vt`, com `v//vn`. Com `texturas`, toda face precisa de material com entrada declarada; a exportação recusa com `material-sem-textura` ou `face-sem-material` caso contrário.

O módulo só escreve a referência ao arquivo. Não gera nem grava a imagem. Quem grava o `.mtl` e a imagem ao lado do `.obj` é a linha de comando `tools/modelar/exportar-obj.mjs` com `--com-textura`, que importa `modulos/textura/src/index.js` quando existe e recusa com mensagem clara quando não existe.

## Testes

Os testes ficam em `tests/`: `exportador-obj.test.js` (contrato original), `tolerancia.test.js` (canto arredondado, degenerada e regressão por hash), e `textura.test.js` (`.mtl`, `usemtl`, `vt` por eixo dominante e recusas). A prova no Blender está em `docs/modelar/banco-de-provas/exportacao-2026-10-19/provar_blender.py`.

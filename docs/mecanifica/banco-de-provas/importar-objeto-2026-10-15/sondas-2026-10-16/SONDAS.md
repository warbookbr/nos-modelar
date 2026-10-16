# Sondas de importação de 2026-10-16

Plano [Importar objeto de código](../../../planos/2026-10-15-importar-objeto-de-codigo.md). Três sondas baratas mediram o que se consegue
tirar de objetos reais sem desenhá-los, e o resultado está resumido na [pesquisa aberta](../../../PESQUISA-ABERTA-2026-10.md#sondas-de-importação-de-2026-10-16).
Os arquivos de origem não estão aqui: cada um se baixa de novo pelo endereço abaixo, e os scripts guardados refazem a medida.

## Picape em STL, por fatias

A pessoa trouxe um STL de picape de um repositório de modelos livres (de autor F, CC-BY-SA). O desenho reproduz uma picape comercial real, e a
pessoa decidiu que nada dele entra no repositório; também a licença CC-BY-SA obrigaria a receita derivada a sair com a mesma licença. O
`stl_sonda2.py` ajusta caixas e cilindros aos componentes conexos da malha e reconstrói o corpo por 40 cortes reais e loft. A silhueta subiu
para 0,85 de interseção sobre união na lateral e 0,89 na frontal, mas o corpo saiu retorcido: a malha é feita de várias cascas abertas, e cada
corte encontra pedaços diferentes. Conclusão: STL de malha colada serve como referência e alvo de medida, e só peças simples e isoladas, como
as rodas, se traduzem em primitivas.

## Quadro de drone em OpenSCAD, pelo importador

Fonte: "Complete frame for TinyTina drone - OpenSCAD parametric - reinforced prop guards", de Josep V. Moragues, thingiverse.com/thing:3519833,
CC-BY 4.0, obtido pelo espelho do Internet Archive (`archive.org/details/thingiverse-3519833`). Comandos, a partir dos três `.scad`:

```bash
openscad -q -o <peca>.csg <peca>.scad
openscad -q -o <peca>.stl <peca>.scad
npm run importar-csg -- <peca>.csg --frente +y --parcial [--conferir <peca>.stl]
```

Os relatos estão em `drone-*.importacao.json`. O trem de pouso saiu sem forma; os corpos inferior e superior saíram com 36 e 16 formas e 22 e
27 recusas, por `offset`, diferença 2D com furo, `linear_extrude` com `scale`, `hull` e `minkowski`. O `--conferir` lançou exceção com o esboço
vazio e com cilindro de 6 lados.

## Braço de escavadeira em STEP, uma forma por sólido

Fonte: "Excavator Arm", printables.com/model/971298, arquivo `ExcavArm v7.step`, CC-BY, obtido pela API do Printables (`getDownloadLink`).
O `sonda_step.py` lê o STEP com o gmsh (`pip install gmsh numpy scipy pillow`; no contêiner faltavam `libxft2`, `libglu1-mesa`, `libxinerama1`
e `libxcursor1`), ajusta a cada sólido uma caixa ou um cilindro orientado pelos eixos principais e acha contatos por proximidade:

```bash
python -I sonda_step.py <arquivo.step> <saida> <pasta-destes-scripts>
```

Saíram 19 sólidos, 12 caixas e 7 cilindros, 10 contatos e ocupação média de 0,44 (volume do sólido sobre o da forma), em segundos e sem
tokens. O relatório está em `escavadeira-step.relatorio.json` e as vistas em `escavadeira-step-*.png` (à esquerda o STEP, à direita as
formas). O gmsh não trouxe os nomes dos sólidos, que no arquivo são genéricos ("Körper1" a "Körper31"), e o arquivo é um leiaute de
impressão, com as peças espalhadas, de modo que os contatos não descrevem a montagem.

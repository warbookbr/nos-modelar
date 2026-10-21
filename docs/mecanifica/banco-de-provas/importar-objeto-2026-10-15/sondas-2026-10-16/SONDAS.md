# Sondas de importação de 2026-10-16

Plano [Importar objeto de código](../../../planos/encerrados/2026-10-15-importar-objeto-de-codigo.md). Três sondas baratas mediram o que se consegue
tirar de objetos reais sem desenhá-los, e o resultado está resumido na [pesquisa aberta](../../../PESQUISA-ABERTA-2026-10.md#sondas-de-importação-de-2026-10-16).
Os arquivos de origem não estão aqui, e os scripts guardados refazem a medida com qualquer arquivo do mesmo tipo.

## Picape em STL, por fatias

A pessoa trouxe um STL de picape de um repositório de modelos livres (de autor F, CC-BY-SA). O desenho reproduz uma picape comercial real, e a
pessoa decidiu que nada dele entra no repositório; também a licença CC-BY-SA obrigaria a receita derivada a sair com a mesma licença. O
`stl_sonda2.py` ajusta caixas e cilindros aos componentes conexos da malha e reconstrói o corpo por 40 cortes reais e loft. A silhueta subiu
para 0,85 de interseção sobre união na lateral e 0,89 na frontal, mas o corpo saiu retorcido: a malha é feita de várias cascas abertas, e cada
corte encontra pedaços diferentes. Conclusão: STL de malha colada serve como referência e alvo de medida, e só peças simples e isoladas, como
as rodas, se traduzem em primitivas.

## Quadro de drone em OpenSCAD, pelo importador

A fonte era um quadro de drone paramétrico de terceiros, em três `.scad` com licença que exige crédito. Os arquivos e os relatos derivados saíram do repositório por decisão da pessoa. Os comandos que refazem a sonda com qualquer `.scad` são:

```bash
openscad -q -o <peca>.csg <peca>.scad
openscad -q -o <peca>.stl <peca>.scad
npm run importar-csg -- <peca>.csg --frente +y --parcial [--conferir <peca>.stl]
```

O trem de pouso saiu sem forma; os corpos inferior e superior saíram com 36 e 16 formas e 22 e 27 recusas, por `offset`, diferença 2D com furo, `linear_extrude` com `scale`, `hull` e `minkowski`. O `--conferir` lançou exceção com o esboço vazio e com cilindro de 6 lados. As construções foram implementadas depois no importador e os dois casos do `--conferir` têm teste com fixture escrita à mão.

## Braço de escavadeira em STEP, uma forma por sólido

A fonte era um STEP de 19 sólidos de um modelo externo com licença que exige crédito, retirado do repositório por decisão da pessoa junto com o relatório e as vistas derivados. O `sonda_step.py` lê um STEP com o gmsh (`pip install gmsh numpy scipy pillow`; no contêiner faltavam `libxft2`, `libglu1-mesa`, `libxinerama1` e `libxcursor1`), ajusta a cada sólido uma caixa ou um cilindro orientado pelos eixos principais e acha contatos por proximidade:

```bash
python -I sonda_step.py <arquivo.step> <saida> <pasta-destes-scripts>
```

Nesse arquivo saíram 19 sólidos, 12 caixas e 7 cilindros, 10 contatos e ocupação média de 0,44 (volume do sólido sobre o da forma), em segundos e sem tokens. O gmsh não trouxe os nomes dos sólidos, que no arquivo eram genéricos, e o arquivo era um leiaute de impressão, com as peças espalhadas, de modo que os contatos não descreviam a montagem.

## BlendNet, scripts do Blender traduzidos em esboço

Fonte: BlendNet, huggingface.co/datasets/FreedomIntelligence/BlendNet, Apache-2.0, 12.059 pares de instrução e script `bpy`. Um agente
escreveu um tradutor que lê o script pela árvore sintática do Python, sem rodar o Blender, e o conferiu contra a execução real no Blender
instalado como módulo Python (`pip install bpy==4.2.0`). Numa amostra de 60 objetos, 4 por categoria, 41 saem certos: sem recusa, com o mesmo
número de partes, a caixa de cada parte dentro de 2% da diagonal e o esboço válido, com razão de volume mediana de 0,9998. Nos 12.059
scripts, o tradutor aceita 9.372 (77,7%), a menos de 1 ms por script, e só o toro, que o esboço não tem, responde por 1.284 recusas. As
partes vêm nomeadas pelo script em 94% dos casos. A tradução é fiel, mas os objetos do BlendNet são simples e às vezes mal montados, como a
estante com as peças afastadas em linha. O relato completo, os scripts e as imagens estão em [`blendnet/`](blendnet/RESULTADO.md).

# Fonte do objeto-prova da importação de código

Plano [Importar objeto de código](../../planos/encerrados/2026-10-15-importar-objeto-de-codigo.md), fatia 1.

## O que havia e o que saiu

A fatia 1 guardou aqui um caminhão basculante de brinquedo, de um único arquivo OpenSCAD de um repositório externo de modelos, com o `.csg` que o OpenSCAD exporta dele, o esboço importado, o relato da importação e uma composta de quatro vistas. A licença do repositório de origem é copyleft, e a pessoa decidiu que nem a fonte nem nenhum derivado ficam no repositório. Os cinco arquivos foram apagados, e o teste do importador que os lia saiu junto.

O objeto-prova também levava o corpus de teste do importador de `.csg` (um quadro de drone, um braço SCARA e um foguete, todos de terceiros e com licença que exige crédito), já retirado com os arquivos `.csg` exportados dele. O que o teste do importador prova passou a depender só da fixture sintética `tools/mecanifica/fixtures/importar-csg/sintetico.csg`, escrita à mão, com 22 formas que cobrem cada nó do formato, e dos casos pequenos escritos à mão no próprio teste. A conferência contra a malha do OpenSCAD segue provada com um cubo em STL de texto e, quando o `openscad` está instalado, com a malha que ele calcula da fixture.

## O que ficou

- [`sondas-2026-10-16/`](sondas-2026-10-16/SONDAS.md): os scripts das sondas e o relato, sem os arquivos de origem.

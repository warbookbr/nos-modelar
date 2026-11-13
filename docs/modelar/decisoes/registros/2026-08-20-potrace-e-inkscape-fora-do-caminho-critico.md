# Potrace e o traçador do Inkscape ficam fora do caminho crítico da prancha por licença e por semântica

Estado: em vigor.
Decidido em: 2026-08-20.
Origem: `docs/modelar/historico/RELATORIO-MOTOR-DE-PRANCHA-R1.md`, no commit `b1f22c61`.
Substitui: nada.

## O que ficou decidido
O relatório R1 do motor de prancha, de 2026-08-20, rejeitou Potrace e o Trace Bitmap do Inkscape para o caminho crítico e adiou o OpenCV. O Potrace é GPL, incompatível com trazer a implementação para o núcleo MIT sem novo recorte de licença, e o traçador do Inkscape entrega um conjunto de curvas de bitmap que ainda exige seleção e semântica posteriores. O OpenCV, de licença Apache-2.0 compatível, fica adiado; o SVG Path segue como saída vetorial.

## Por quê
Num PNG sintético de 760 por 360 px, o leitor local deu escala de 8 mm/px, resíduo de +0,67% no comprimento e +1,18% na altura e 6 vértices no topo. O OpenCV não calculou escala nem resíduo e devolveu 7 contornos, com 12 vértices na maior fronteira e sem critério de silhueta.

## Quando reabrir
O OpenCV, se surgir corpus que o envelope local não consegue diagnosticar. O Potrace, só com novo recorte de licença.

# Banco de provas — ferramentas de prancha para IA (2026-11-20)

Registro de validação do plano [ferramentas de prancha para IA](../../planos/2026-11-20-ferramentas-de-prancha-para-ia.md). Nenhuma imagem raster de referência entra versionada nesta pasta.

## 1. Testes unitários e de fixture sintética

Comando: `npx vitest run tools/modelar/prancha/referencia-grade.test.mjs tools/modelar/prancha/prancha-coerencia.test.mjs tools/modelar/prancha/prancha-sobrepor.test.mjs`

- `referencia-grade.test.mjs` (3 testes): leitura de cabeçalho PNG e JPEG sem dependência externa; conversão pixel↔milímetro com e sem `--espelhar-x` com erro < 1e-6 mm; geração de SVG com grade calibrada e recorte ampliado.
- `prancha-coerencia.test.mjs` (5 testes): aprovação de conjunto coerente de quatro pranchas parciais e reprovação exata em mm para divergências injetadas em envelope `y` (40 mm), landmark `teto` (40 mm), camada `paraBrisa` em `z` (60 mm) e `x` (70 mm) e medida rígida `M.largura` (50 mm).
- `prancha-sobrepor.test.mjs` (4 testes): extração limpa somente da geometria do `desenho` ignorando título, cotas e legenda; separação entre `escala-rigida` e `proporcao-foto`; montagem individual e em quadro 2×2; medida de desvio contra contorno de referência com erro < 0,1 mm (gate: < 2 mm).

## 2. Prova prática em pranchas reais

- `npm run prancha:coerencia -- procedural/pecas/carro-fastback/referencias/` identificou divergências cruzadas reais que os relatórios individuais das quatro pranchas parciais não acusavam: `envelope x` em 5,41 mm, `paraBrisa` em 24,26 mm entre frontal e planta, `vidroTraseiro` em 14,74 mm entre planta e traseira e `vidroLateralEsq`/`vidroLateralDir` em 108,75 mm entre planta e traseira.
- `npm run prancha:coerencia -- procedural/pecas/carro-quadrado/referencias/` identificou na hora o desvio transversal de 36,64 mm no `vidroTraseiro` entre planta e traseira e 20 mm entre `parachoqueTopo` da frontal e da traseira.
- `npm run referencia:grade` sobre a vista lateral do carro quadrado (2400×1792 px, `1,858×1,827 mm/px`) permitiu ler diretamente na malha numerada a soleira em 240 mm, o friso lateral entre 480 e 540 mm, o topo do arco em 670 mm e a linha do para-brisa sem estimativa a olho nem interferência da sombra do piso ou do rack.
- `npm run prancha:sobrepor -- --config=... --modo=proporcao-foto` montou o quadro 2×2 limpo em alto contraste com o desvio de razão de cada imagem de referência em relação à tabela rígida: lateral `-1,7%`, frontal `-2,3%`, traseira `-1,6%` e planta `-2,9%`.
- O ciclo com crítico visual sem contexto sobre a saída de `prancha:sobrepor` elevou o alinhamento da R1 (`5,0/10`) para a R2 (`6,0/10`) e expôs dois pontos concretos: a necessidade de conferir visualmente a moldura amarela de `--caixa` no `referencia:grade` antes de traçar (para não engolir sombra do chão na planta nem rack no teto) e o limite físico de imagens geradas por IA, que têm perspectiva e proporções distintas entre vistas e não se alinham 100% em projeção ortográfica pura.

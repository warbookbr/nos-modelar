# Fonte do objeto-prova da importação de código

Plano [Importar objeto de código](../../planos/2026-10-15-importar-objeto-de-codigo.md), fatia 1.

## A fonte

O objeto é um caminhão basculante de brinquedo, `toy-truck10-v3a.scad`, de um único arquivo OpenSCAD sem biblioteca, com cubos, cilindros, diferenças e rotações. O arquivo está aqui, sem alteração, e confere byte a byte com o do commit abaixo.

- Endereço: endereço omitido
- Repositório: um repositório externo de modelos, commit `42ac2a801d96f131b70cbef1fdb88e7ab348ad62` (HEAD de 2026-10-15).
- Autor: o cabeçalho do arquivo diz "Created by: autor E" e cita como inspiração um caminhão-tanque de brinquedo de "autor G", sem derivar dele. O repositório um repositório externo de modelos o reúne numa coleção.
- Licença: o cabeçalho do arquivo diz "License - Public domain", e o `LICENSE` do repositório é a GNU GPL versão 3. As duas permitem guardar a fonte aqui. Vale a mais restritiva, a GPL-3.0, se alguém redistribuir este diretório.
- Data da busca e da cópia: 2026-10-15.
- Marca: nenhuma no objeto nem no nome do arquivo. O comentário cita o Skeinforge, que é o programa de fatiamento da impressão, e não uma marca do objeto.

## O que não é

O plano pediu um carrinho de mão. A busca não achou nenhum em OpenSCAD com licença aberta. A busca de código do GitHub por `wheelbarrow` em arquivos `.scad` devolveu um espaçador de roda de carrinho de mão (`alexose/3D-Printing`, um tubo de 23 mm), uma plataforma de deck e peças de um acervo de tijolos de brinquedo de marca; por `barrow`, `carriola`, `brouette`, `kruiwagen` e `Schubkarre` não devolveu nada além disso. A busca de repositórios por `wheelbarrow` e `barrow` com linguagem OpenSCAD devolveu um só, `rileytuttle/electric_eel_barrow`, sem README nem arquivo de licença, o que não permite guardar a fonte. O GitLab e o Codeberg não têm nenhum arquivo OpenSCAD de carrinho, e o Thingiverse e o Printables responderam 403 deste ambiente, de modo que a busca neles não foi feita.

Faltando o carrinho, o plano aceita um braço robótico, uma picape ou uma empilhadeira. O braço `iuming/OpenSCAD_Learning` (MIT, um arquivo) usa `hull` nos elos e na garra, que o importador recusa; o `MAKE3-Arm` e o `jenny5-CAD` (os dois MIT) são braços reais, com engrenagens, parafusos e polias, que exportam milhares de nós (o do `jenny5-CAD` tem 934 cilindros e 669 polígonos) e usam `hull`; os outros braços achados não têm licença. Não achei picape nem empilhadeira com licença aberta que caibam num arquivo. O caminhão basculante não está na lista, e é o objeto de veículo, com licença aberta, que usa só o que o importador cobre e tem forma para o crítico julgar. Os veículos de `wxffxx/Project_Runway` (MIT) também cabem, mas têm de quatro a dez caixas e cilindros cada, e não exercitam o importador. É um brinquedo de cerca de 36 mm de comprimento: a forma é a de um caminhão basculante (cabine, caçamba articulada na traseira, quatro rodas), e o que se mede com ele é o caminho do importador, e não o custo de um objeto do tamanho do avião.

## O que há aqui

- `toy-truck10-v3a.scad`: a fonte, sem alteração.
- `toy-truck10-v3a.csg`: o que `openscad -o toy-truck10-v3a.csg toy-truck10-v3a.scad` exporta (OpenSCAD 2021.01, do apt do Ubuntu 24.04). A árvore deixa de ter os nomes `wheel`, `axle`, `bed`, `bed_axle`, `bed_axle_cutout` e `cab`; cada chamada de módulo sobra como um `group()`.
- `toy-truck10-v3a.esboco.json`: a importação, por `npm run importar-csg -- docs/mecanifica/banco-de-provas/importar-objeto-2026-10-15/toy-truck10-v3a.csg --girar -90,0,0 --frente +x --conferir toy-truck10-v3a.stl`. O `--girar -90,0,0` desfaz o `rotate([90,0,0])` com que a fonte deita o caminhão para imprimir de lado, e o `--frente +x` põe a cabine, que a fonte deixa em +x, na proa (-z).
- `toy-truck10-v3a.importacao.json`: o nó e a linha do `.csg` de cada forma, os avisos e a conferência numérica.
- `toy-truck10-v3a-composta.png`: as quatro vistas do esboço importado, por `npm run esboco -- <esboço> --composta`.

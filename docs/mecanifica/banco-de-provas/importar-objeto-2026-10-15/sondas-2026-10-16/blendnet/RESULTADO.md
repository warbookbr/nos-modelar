# BlendNet para esboço: sonda de tradução barata e determinística

Fonte: BlendNet, huggingface.co/datasets/FreedomIntelligence/BlendNet, Apache-2.0, baixado em 2026-10-16 (não guardado aqui). Os scripts da sonda estão em `scripts/`, as imagens (bpy à esquerda, esboço à direita) em `imagens/` e os números por objeto em `resultados.json` e `todos.json`.

## Resultado

Dos 60 objetos da amostra, 41 saem certos (68%), isto é, passam em (a) a tradução não recusou nada, (b) mesmo número de partes, (c) caixa de cada parte casada por nome dentro de 2% da diagonal do objeto e (d) o esboço valida. Contagens por critério: (a) 42, (b) 45, (c) 43, (d) 59 de 59 esboços gerados (o objeto 32 não gerou nenhuma forma). Nos 41 certos o maior desvio de caixa foi 0,29% da diagonal. A razão interseção/união de volume (e), calculada pela Manifold do repositório sobre as partes casadas, saiu para 39 dos 41 certos, com mediana 0,9998 e mínimo 0,981; os dois que faltam são tabuleiros só de planos (sem volume). O 0,994 que aparece em quase todo cilindro é o círculo do esboço contra o polígono de 32 lados do Blender, não erro de posição.

A taxa de aceitação (só o critério (a)) nos 12.059 scripts inteiros, sem Blender, é 9.372 (77,7%); 1.284 scripts (10,6%) têm o toro como única recusa. Nessa rodada completa só (a) foi medido, sem correção geométrica.

## Falhas nos 60 (19 objetos que não saem certos)

| Tipo | Objetos | Exemplo |
|---|---|---|
| Primitiva sem equivalente | 10 (8 por toro, 2 por `primitive_circle_add`) | 01 Transformer: `primitive_torus_add(major_radius=0.6, minor_radius=0.1, ...)`; o esboço não tem toro |
| Escala desigual (elipsoide, cilindro elíptico) | 3 | 06 Winter Hat: `primitive_uv_sphere_add(radius=1)` com escala (1, 1, 0.75) |
| Operação de modo de edição | 2 | 33 Eco-Friendly Logo: `mode_set(EDIT)` e `transform.rotate` na malha |
| Operador sem tradução (`object.join`) | 2 | 42 Drumsticks: 6 formas contra 2 objetos juntados |
| Modificador sem equivalente | 1 | 58 Suitcase: `modifier_apply(modifier="Bevel")` |
| Tradução errada sem recusa (silenciosa) | 1 | 35 Corporate Emblem: `primitive_cone_add(vertices=3, ...)` sai como cone circular (caixa 5,8% fora); o cone do esboço ignora `lados` |

Dois deles são recusas que o resultado geométrico não confirma: 10 Eraser recusou `mesh.select_all` (no-op) e 58 Suitcase recusou o Bevel, e nos dois a caixa e a contagem de partes batem. O quadro de eixos não causou nenhuma falha: com (x, y, z) do Blender virando (x, z, -y), as caixas bateram em todos os casos comparáveis. Não apareceu objeto sem nome: nenhuma recusa por nome, e as formas têm sempre o nome Blender no `rotulo`.

Limitação do esboço achada no caminho: `lados` abaixo de 8 passa no `--descrever`, mas o sólido (N2) o recusa, de modo que hexágono e prisma triangular (objetos 35 e 59) valem para a caixa e não entram no volume. Sem os dois, o cilindro hexagonal do lápis (59) e o hexágono do 35 ficam fora da razão de volume.

## Tempo por objeto (60 da amostra, medianas)

Tradução em Python puro: 1,3 ms (máximo 18,7 ms; nos 12.059 scripts, mediana 0,8 ms e p95 3,8 ms). Execução do script no bpy: 9 ms (máximo 1,11 s), e 0,70 s por processo com o `import bpy` (máximo 2,0 s). Validação por `node tools/mecanifica/esboco.mjs <arq> --descrever`: 0,73 s, rodada 4 em paralelo. Um processo de bpy por objeto, com timeout de 120 s, nenhum estourou.

## Nomes e forma

Das 586 formas traduzidas, 35 (6%) têm nome padrão do Blender (`Cube.001`, `Torus` etc.), concentradas em 2 objetos. O resto vem nomeado pelo script (`Pencil Body`, `Wooden Square 12`), útil para casar parte a parte, mas em inglês e muitas vezes numerado em série. O `id` é o nome com caracteres não alfanuméricos trocados por `_` e o nome original fica em `rotulo`.

Nas imagens as formas traduzidas coincidem com as do bpy. O que nem sempre é reconhecível é o próprio objeto do BlendNet: o Stapler é duas caixas, uma haste e um cilindro, e a Bookshelf (59 partes) sai como peças afastadas em linha. O esboço reproduz fielmente a pilha de primitivas do script, que por si só nem sempre lembra o nome. Vi as seis imagens; as demais 54 só foram medidas.

## Imagens (bpy à esquerda, esboço à direita; frontal, lateral e superior)

Certos:
- imagens/20-Coffee_Grinder-certo.png
- imagens/26-Stapler-certo.png
- imagens/16-Bookshelf-certo.png

Errados:
- imagens/35-Corporate_Emblem-errado.png (pirâmide triangular virou cone circular)
- imagens/01-Transformer-errado.png (toros ausentes)
- imagens/42-Drumsticks-errado.png (forma igual, partes 6 contra 2 por causa do `join`)

## Como foi medido e o que pode enviesar

- Fonte: BlendNet.jsonl baixado (22 MB, 12.059 linhas; colunas id, name, instruction, category, instruction_type, script, color_brightness, verify, entropy, unit_n, param_ratio). bpy 4.2.0 em venv próprio, python 3.11.
- Amostra: dentro de cada uma das 16 categorias, ordenada por id, as 4 primeiras; nas 4 categorias menos mecânicas (Foodstuffs, Graphic symbols, Articles of clothing, Musical instruments) as 3 primeiras, totalizando 60. A amostra é pequena e a escolha por id não é aleatória; a taxa de 68% tem incerteza ampla.
- Verdade: cena vazia (`read_factory_settings(use_empty=True)`), script executado com `exec` num processo por objeto; malha avaliada pelo depsgraph com a matriz de mundo; objetos ocultos ou em wire/bounds ficam de fora. Dois scripts (17 e 49, Bird Feeder) usam `math` sem importar e falham no Blender sem ajuda; foram rodados de novo com `import math, random` e `mathutils` na frente, e a verdade vem dessa segunda execução.
- Unidade: 1 unidade do Blender = 1000 mm. Plano vira caixa de 1 mm de espessura. Cilindro e cone de `vertices` menor que 32 levam `lados`; com 32 ou mais, o círculo do esboço.
- Nenhum script do BlendNet é executado pelo tradutor (só AST). Os scripts da amostra foram conferidos antes por padrões de `os`, `subprocess`, `open`, `eval`, `exec` e não apresentaram nenhum antes de irem ao bpy.
- Defeitos do tradutor visíveis: 22 dos 12.059 terminam em erro interno do próprio tradutor (por exemplo iteração sobre `bpy.data.objects`), contados como recusa na rodada completa; nenhum na amostra.

## O que faltaria para virar ferramenta do repositório

O tradutor teria de virar `tools/mecanifica/esboco-importar-blender.mjs` (hoje é Python em scripts/), seguindo o `importar-csg`: recusar tudo de uma vez com nó e linha, gravar um `.importacao.json` ao lado e aceitar `--nomes`, com fixture sintética e teste, e sem depender do bpy. O esboço precisaria de toro, de elipsoide, de cone e prisma com `lados` abaixo de 8 aceitos pela N2, e de uma decisão sobre `join` (agrupar por parte) e `Bevel`; só o toro responde por 10,6% dos scripts. A conferência contra o bpy (a única que pega erro silencioso como o do objeto 35) ficaria como sonda opcional fora do gate, porque o wheel do bpy tem cerca de 520 MB, e o gate pegaria o erro silencioso de outro jeito, recusando cone e cilindro com `vertices` menor que 32 enquanto o esboço ignorar `lados`.

## Arquivos

- Fonte: blendnet/fonte/BlendNet.jsonl; amostra: blendnet/amostra.json
- Scripts: blendnet/scripts/ (traduzir.py, verdade_bpy.py, medir.mjs, exportar_malha.mjs, rodar60.py, consolidar.py, imagens.py, traduzir_todos.py, amostra.py, stl_vistas_lib.py copiado)
- Esboços traduzidos: blendnet/traduzidos/NN.esboco.json (os recusados saem parciais, só com o que foi reconhecido)
- Medidas por objeto: blendnet/resultados.json; rodada completa: blendnet/todos.json

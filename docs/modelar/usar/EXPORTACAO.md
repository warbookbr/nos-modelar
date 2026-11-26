# Exportação

A peça ou a montagem pronta sai do Modelar em quatro formatos, cada um por um comando. Todos leem a receita pelo nome da peça ou pelo caminho, rodam o núcleo de novo e gravam em `exportacoes/`, pasta que o git ignora. Nenhum deles muda a receita, e duas exportações da mesma receita saem iguais byte a byte. A malha neutra está em metro, com o eixo y para cima.

## STEP, para programa de CAD

Use quando a peça vai para um programa de CAD. O arquivo é STEP facetado, com um corpo fechado por pedaço conexo de cada parte, em milímetro por padrão.

```bash
npm run exportar:step -- <peça> --somente-validar
npm run exportar:step -- <peça> [--unidade=<mm|cm|m>] [--saida=<arquivo.step>] [--sobrescrever]
```

A primeira linha só valida a malha e faz parte da esteira de validação de toda peça. A segunda grava `exportacoes/cad/<peça>.step`, e só se roda a pedido da pessoa.

## OBJ, para malha com as partes nomeadas

Use quando quem recebe quer a malha com o nome de cada parte, ou a textura gerada de cada material. O arquivo sai em metro por padrão, com um objeto por corpo conexo de cada parte.

```bash
npm run exportar:obj -- --arquivo=<peça> [--unidade=<m|cm|mm>] [--saida=<arquivo.obj>] [--com-textura] [--sobrescrever]
```

Com `--com-textura` saem ao lado as imagens dos materiais e o `.mtl`. O comando também lê um esboço 2.0, com `--opcao=<n>` para escolher a opção. Os detalhes da tolerância de triângulo estão em `modulos/exportador-obj/README.md`.

## glTF, para ver a peça com os materiais

Use quando a peça ou a montagem vai para um visualizador, um motor de jogo ou outra ferramenta que lê `.glb`. Sai uma malha por parte, com os materiais da receita. Com o nome de um objeto que tem `montagem.json`, sai um nó por instância, na pose de repouso da montagem.

```bash
npm run exportar:gltf -- <peça ou objeto montado> [--saida <arquivo.glb>] [--ambiente estudio|ceu]
```

O padrão grava `exportacoes/gltf/<peça>.glb` por cima do que houver. O que a bancada mostra e o arquivo não leva está em `modulos/exportador-gltf/README.md`.

## Ficha do objeto, para a simulação mecatrônica

Use quando o objeto montado vai para a simulação de ligações, circuito e física. O objeto precisa de `montagem.json` e de `ponte.json` na pasta dele, e a ponte declara os conjuntos, as juntas e os materiais.

```bash
npm run exportar:ficha -- <objeto> [--ponte=<arquivo>] [--saida=<pasta>]
```

Saem em `exportacoes/ficha/<objeto>/` a malha `.glb`, com um nó por peça, e a ficha conferida pelo esquema. O formato da ponte e a leitura do pedido que volta estão em `modulos/ficha-do-objeto/README.md`.

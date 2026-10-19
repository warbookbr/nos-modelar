# Receitas do projeto externo no esboço do Mecanifica (2026-10-19)

A pessoa remodelou em 3D objetos do projeto externo, que no jogo são desenhos para câmera 2.5D, e guardou as receitas no repositório `repositorio-externo` (pasta `externo/receitas`). A receita deles é um JSON de peças `caixa`, `cilindro` e `prisma` com `chanfro`, em metro, com x leste, y norte e z para cima, e o objeto virado para o sul. O `receita_para_esboco.mjs` daqui traduz cada peça para a forma equivalente do esboço (`caixa` com `chanfro`, `cilindro`, `cone`, `extrusao`), em milímetro e com a troca de eixos (x, y, z) para (x, z, -y). As cores vêm da tabela `cores` da receita.

As receitas com `espelhar` precisam ser expandidas antes, pela função `expandir` do `externo/receita.py` do repositório de origem.

## Medida

Das 66 receitas, 41 têm todas as peças traduzidas e 25 têm alguma recusa. Das 1.394 peças, 1.179 (85%) saem como forma do esboço. As 215 restantes são 200 peças com `rot` (giro livre, que o tradutor ainda não converte) e 15 com `cortes`, `curva` ou `afinar`. Os sete objetos de teste desta pasta (micro-ondas, geladeira, fogão, lava-louças, cadeira, televisão e balcão) saíram sem nenhuma recusa e sem erro do esboço, e as cinco composições em `imagens/` mostram a forma: todas reconhecíveis, com porta, painel, botões, puxador e pés nos lugares certos.

Um achado do tradutor: o chanfro da receita pode passar do que o esboço aceita em caixa fina (a porta de 12 mm com chanfro de 6 mm foi recusada), e o tradutor limita o chanfro a 20% da menor medida.

## Texturas

A textura de cada receita é feita por redes de nós do Blender (`externo/blender/materiais.py`, madeira, metal, tecido, desgaste), assada num atlas de cor. O acordo do Mecanifica deixa material, cor e PBR de fora, então elas não entram. Fica registrado que existem e que só dependem de `bpy`.

## O que falta para virar receita do Mecanifica

Os esboços são o formato de importação. Para virar receita de peça ou família, o objeto precisa de alinhamento, do crítico visual e da aprovação da pessoa na forma. Pelo que a pasta mostra, os aparelhos e os móveis dos 41 objetos inteiros são candidatos a perfis das famílias `aparelho-de-caixa` e `movel-de-caixa`.

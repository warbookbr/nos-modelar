# O que o repositório do projeto externo tem de objetos extraídos

Levantamento de 2026-10-20 no clone local do repositório do projeto externo, feito por um agente de pesquisa somente leitura, para saber se há objetos além das 66 receitas que o Mecanifica já traz. Os números vêm de contagem de arquivos e do `fila-de-objetos.json`; a família de cada item foi atribuída por expressão regular sobre o nome e é aproximada.

## Resposta curta

O clone não tem objetos extraídos além dos já conhecidos: 66 receitas `externo` em JSON, 25 arquivos `.obj` e 25 `.mtl` feitos à mão (24 objetos prontos e 1 de teste), e listas de candidatos. Não há `.glb`, `.fbx`, `.blend`, `.x`, `.stl`, nem textura alguma (nenhum `.png`, `.dds` ou pacote). O acervo grande que os documentos do repositório descrevem (42.544 objetos, 40.233 imagens, 952 modelos originais do jogo e 2.250 texturas) está no `.gitignore` e fica só na máquina do autor, e por isso não foi contado.

## Onde moram os objetos, em `projeto-externo`

| Pasta | O que tem |
|---|---|
| `externo/receitas/` | 66 receitas na raiz e 107 arquivos de rodada em 62 pastas de `historico/` |
| `externo/fichas/` | 66 fichas do inspetor |
| `externo/vereditos/` | 40 pastas, 84 JSON de três rodadas |
| `externo/fila/fila-de-objetos.json` | 583 objetos com estado: 509 em fila, 46 aguardando aprovação, 15 aprovados, 3 em retrabalho, 2 em inspeção, 1 em modelagem, 4 não portar e 3 reprovados |
| `pasta-de-modelos-prontos/` | 24 `.obj` e 24 `.mtl` em três pastas, e `manifesto-do-pacote` |
| `objetos-extraidos/catalogo_de_sprites.json` | catálogo de 1.942 entradas e 1.742 identificadores únicos de sprite, a lista do que pode ser extraído |

## Objetos por família

"Fila" é o estado de objeto listado e ainda não iniciado. Há 2 itens da família "outros" já contados nas receitas.

| Família | Receitas | Malhas obj | Em fila (não iniciados) | Total na fila |
|---|---|---|---|---|
| Cadeira e assento | 22 | 1 | 45 | 75 |
| Mesa e balcão | 7 | 3 | 31 | 38 |
| Geladeira e freezer | 8 | 4 | 0 | 7 |
| Fogão e forno | 8 | 1 | 1 | 9 |
| Micro-ondas | 2 | 1 | 0 | 2 |
| Lava-louças | 2 | 0 | 0 | 2 |
| Máquina de lavar | 2 | 0 | 6 | 8 |
| Pia | 2 | 1 | 4 | 6 |
| Vaso e banheiro | 2 | 0 | 11 | 13 |
| Televisão | 3 | 0 | 0 | 3 |
| Rádio, telefone e áudio | 1 | 0 | 19 | 20 |
| Computador e terminal | 2 | 0 | 1 | 3 |
| Gerador | 1 | 0 | 2 | 3 |
| Café e espresso | 2 | 0 | 0 | 2 |
| Prateleira e gôndola | 0 | 3 | 35 | 35 |
| Caixa, baú e armário | 0 | 4 | 93 | 93 |
| Lixeira | 0 | 0 | 7 | 7 |
| Ar-condicionado e antena | 0 | 0 | 16 | 18 |
| Fogueira, forja e churrasco | 0 | 0 | 19 | 19 |
| Porta, janela e parede | 0 | 1 | 3 | 3 |
| Comida, lata e água | 0 | 4 | 0 | 0 |
| Outros (nomes genéricos como `peca_artesanal_*`) | 2 | 2 | 216 | 217 |
| Total | 66 | 25 | 509 | 583 |

Por categoria da fila: móveis 304, eletrodomésticos 131, contêineres 108, cozinha 27 e banheiro 13. O catálogo de sprites soma, por categoria, gôndolas e prateleiras 686, móveis e contêineres 580, portas e janelas 298, eletrodomésticos 131 e itens de chão 47.

## Discrepâncias que o levantamento achou

- O `PLANO.md` do repositório diz 56 aprovados, 3 em andamento, 7 reprovados ou não portados e 517 pendentes, e o `fila-de-objetos.json` dá 61 aprovados ou aguardando, 6 em andamento, 7 e 509. Não se sabe qual está certo.
- Os vereditos cobrem só 40 das 66 receitas. Faltam as 22 cadeiras, que o plano marca como aprovadas na rodada 1, mas cuja aprovação não está no disco.
- Quatro fichas (`ar_condicionado_a`, `antena_parabolica_a`, `geladeira_comercial_a` e `geladeira_comercial_branca_b`, todas `nao_portar`) não têm receita, e quatro receitas não têm ficha. As geladeiras `geladeira_branca`, `geladeira_branca_n3` e `geladeira_velha_n3` estão nas receitas e não têm ficha.
- O `README.md` de `externo` cita `fila/fila.sqlite`, e o arquivo real é `fila/fila-de-objetos.json`.

## O que ficou sem confirmar

O acervo completo, os 952 modelos originais, as 2.250 texturas, os 24 pacotes `.pack` (cerca de 527 MB) e as malhas `.obj` das 66 receitas não estão no clone, e nada disso foi contado. A saída do `externo` iria para `acervo/data/externo/<id>/`, que não existe aqui. Para trazer os 509 objetos em fila, as receitas precisam ser geradas na máquina da pessoa e enviadas; o Mecanifica só converte o que chega como receita.

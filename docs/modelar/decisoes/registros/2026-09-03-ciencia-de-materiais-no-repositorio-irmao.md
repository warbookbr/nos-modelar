# A ciência de materiais mora no repositório irmão, sem import nos dois sentidos

Estado: em vigor.
Decidido em: 2026-09-03.
Origem: `docs/modelar/planos/encerrados/2026-09-01-laboratorio-computacional-ia.md`, no commit `b1f22c61`.
Substitui: nada.

## O que ficou decidido
Em 2026-09-03 o laboratório de ciência de materiais, incubado aqui desde 2026-09-01, foi migrado inteiro, com histórico, para `warbookbr/nos-ciencia`, por decisão da pessoa. A separação é sem conhecimento em nenhum sentido: este repositório não importa nem referencia o laboratório, e o laboratório não importa o motor de receitas. Quem precisar cruzar peça e estudo faz a ponte à mão, citando versão e commit do lado citado. Só o instrumento que roda o motor, `tools/modelar/medir-torcao.mjs`, ficou aqui, porque um instrumento que roda o motor mora onde o motor mora.

## Por quê
Manter ciência de materiais e autoria 3D no mesmo repositório obriga qualquer leitura, humana ou de IA, a atravessar os dois domínios para entender qualquer um. A fronteira testada por `arquitetura:lab:check` provava que o núcleo não dependia do laboratório, mas não resolvia esse custo de leitura.

## Quando reabrir
A origem não dá condição.

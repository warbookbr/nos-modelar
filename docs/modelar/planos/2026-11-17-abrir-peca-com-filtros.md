# Abrir peça com filtros: a janela de abrir da bancada busca por nome e separa por categoria e situação

**Estado:** ativo

**Território:** `src/bancada/acervo-receitas.js`, `src/bancada/acervo-receitas.test.js`, `src/bancada/componentes/menu-abrir.js`, `src/bancada/componentes/menu-abrir.test.js`, `docs/modelar/banco-de-provas/abrir-peca-com-filtros-2026-11-17/`; e, só no trecho da janela de abrir, `src/bancada/main.js`.

**Responsável:** a IA da sessão implementa; Tiago pediu em 2026-11-17 e aprova pela imagem da janela.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-17, ativado pela pessoa em 2026-11-17 na vaga do cache por passo, que fechou. Não toca núcleo nem receita, e pode rodar ao lado dos outros planos.

## Problema observado

A janela "Abrir peça" da bancada lista mais de cem receitas do acervo, as montagens e as de ensaio numa só coluna em ordem alfabética, com só a marca `peça` ou `montagem` à direita (imagem enviada pela pessoa em 2026-11-17). Achar uma peça pede rolar a lista inteira, e as de ensaio, que existem para os testes, aparecem no meio das de trabalho.

## Resultado

Na janela de abrir, a pessoa digita parte do nome e a lista filtra na hora, escolhe uma categoria com a contagem ao lado, e vê só as receitas de trabalho por padrão, com as de ensaio atrás de um filtro.

## Filtro Agent-First

A lista de `listarParaBancada` é USAR DIRETO e ganha a categoria e a situação de cada item; a janela é ENVOLVER, com busca e filtros sobre a mesma lista. A categoria sai do que a receita já declara (`PLANO.familia`, `familiaProcedural`, a pasta da peça e a marca de montagem), sem campo novo para preencher à mão; o item sem nada que o classifique cai em "outros", e a contagem de "outros" mostra quanto falta declarar.

## Incluído

- campo de busca no topo, sem diferença de maiúscula e acento, que filtra enquanto se digita;
- filtros por categoria com contagem (veículos, móveis, robótica, eletrônica, ferramentas e utensílios, outros), a lista exata saindo do que o acervo declara;
- filtro por situação: em trabalho e de ensaio, com as de ensaio escondidas por padrão e a marca delas mantida;
- testes da classificação sobre o acervo real e da janela.

## Excluído

- mudar o nome ou a pasta de qualquer peça;
- miniatura de cada peça na lista, que fica para o backlog se a pessoa quiser.

## Gate de saída

1. Toda receita do acervo cai numa categoria, e "outros" lista as que não declaram nada.
2. A busca e os filtros se combinam, e limpar volta à lista completa.
3. Imagem da janela aprovada pela pessoa.
4. Testes da bancada verdes.

## Fatias

1. A categoria e a situação em `listarParaBancada`, com teste sobre o acervo.
2. A janela com busca e filtros, imagem e fechamento.

## Riscos e parada

Se mais de um terço do acervo cair em "outros", a classificação pelo que já está declarado não serve, e o plano para e volta à pessoa com a lista, em vez de inventar categoria.

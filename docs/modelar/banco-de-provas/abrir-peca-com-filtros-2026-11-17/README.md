# Abrir peça com filtros, 2026-11-17

Imagens da janela "Abrir peça" da bancada, capturadas no Chromium sem tela sobre o servidor de desenvolvimento, com o acervo real de 63 entradas (58 de trabalho e 5 de ensaio, sem contar as partes de objeto, que a janela não lista). A imagem `abrir-filtros.png` junta as quatro, da esquerda para a direita.

1. `01-lista-inteira.png`: a janela aberta, com a lista de trabalho inteira (58) e as de ensaio escondidas. As categorias contam Veículos 33, Móveis e eletrodomésticos 14, Robótica 2, Eletrônica 1, Ferramentas e utensílios 7 e Outros 1.
2. `02-busca-sedan.png`: a busca "sedan" deixa 5 entradas, e a contagem de cada categoria passa a ser a do que a busca deixou.
3. `03-categoria-utensilios.png`: a categoria Ferramentas e utensílios escolhida, 7 entradas.
4. `04-ensaio-e-busca-prova.png`: o filtro "De ensaio" ligado e a busca "prova", com a marca `ensaio` mantida nas entradas de ensaio.

A categoria é declarada pelo objeto: `PLANO.categoria` na receita da peça e `categoria` na montagem em dados, de uma lista fechada em `src/autoria/categorias-de-objeto.js`. Quando o objeto não declara, vale a família de critérios (`PLANO.familia`: `veiculo`, `movel-de-caixa`, `assento`), e o que nada declara cai em Outros. `PLANO.familia` não serviu para as categorias novas porque é validada contra os critérios de `procedural/criterios/` e põe perguntas no brief do crítico.

Antes das declarações, Outros tinha 18 de 58 entradas de trabalho (31%): 10 peças sem família e 7 montagens em dados, mais `carro-fastback/lataria`. Agora tem 1 de 58, a `carro-fastback/lataria`, que é do plano do carro e fica em Outros até ele declará-la. As 5 de ensaio também caem em Outros, mas ficam escondidas por padrão.

Comando que reproduz a classificação: `npx vitest run src/bancada/acervo-receitas.test.js`. A aprovação da forma da janela é da pessoa, por estas imagens.

O texto de `bancada.html` sobre a janela ("mais as de ensaio, que existem para os testes e vêm marcadas") ficou defasado, porque as de ensaio agora ficam atrás do filtro de situação. O arquivo estava fora do território do plano, e a correção é uma linha de texto da bancada.

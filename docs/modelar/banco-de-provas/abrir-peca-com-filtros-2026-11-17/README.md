# Abrir peça com filtros, 2026-11-17

Imagens da janela "Abrir peça" da bancada, capturadas no Chromium sem tela sobre o servidor de desenvolvimento, com o acervo real de 63 entradas (58 de trabalho e 5 de ensaio, sem contar as partes de objeto, que a janela não lista). A imagem `abrir-filtros.png` junta as quatro, da esquerda para a direita.

1. `01-lista-inteira.png`: a janela aberta, com a lista de trabalho inteira (58) e as de ensaio escondidas. As categorias contam Veículos 29, Móveis e eletrodomésticos 11 e Outros 18.
2. `02-busca-sedan.png`: a busca "sedan" deixa 5 entradas, e a contagem de cada categoria passa a ser a do que a busca deixou.
3. `03-categoria-moveis.png`: a categoria Móveis e eletrodomésticos escolhida, 11 entradas.
4. `04-ensaio-e-busca-prova.png`: o filtro "De ensaio" ligado e a busca "prova", com a marca `ensaio` mantida nas entradas de ensaio.

A categoria sai de `PLANO.familia` (`veiculo`, `movel-de-caixa`, `assento`), lida da receita em segundo plano na primeira vez que a janela fica visível. O que nada declara cai em Outros: 18 de 58 entradas de trabalho (31%), que são 10 peças sem família declarada e as 7 montagens em dados, mais `carro-fastback/lataria`. Contando as 5 de ensaio, que também caem em Outros, seriam 23 de 63 (37%).

Comando que reproduz a classificação: `npx vitest run src/bancada/acervo-receitas.test.js`. A aprovação da forma da janela é da pessoa, por estas imagens.

# Corpus do canal de percepção N3

`gerar-evidencias.mjs` produz, sem alterar nenhuma receita, zebra, isófota e
curvatura para três superfícies sadias por construção (esfera, toro e patch
justo), uma quebra sintética e três evidências reprovadas: quarto dianteiro,
R2B e a pele primária recompilada da receita isolada do cupê livre.

O último caso recompila literalmente apenas o `criarLoft` da carroceria: rodas,
cabine e detalhes não são superfície primária e ficam fora da leitura C1. Isso
não troca nem corrige o experimento isolado; dá ao canal uma malha reproduzível
dele para calibração.

Execute `node gerar-evidencias.mjs`. Cada diagnóstico é salvo como imagem PNG
individual, em tamanho nativo: zebra nas quatro vistas (isométrica, lateral,
frontal e superior), isófota e curvatura na isométrica. Não há painel de
aprovação. Se houver mosaico, ele é apenas índice.

`evidencias/resultado-c1.json` separa a métrica do aceite: os controles devem
ser regulares e os negativos irregulares. O gate só passa quando
`inspecao-individual.json` registra a inspeção e sua impressão SHA-256 coincide
com as imagens atuais; qualquer regeneração diferente o devolve a `passa: false`.
A leitura não decide se um objeto é um carro, nem aprova proporção ou caráter
visual.

`fonte-veiculo-valida.json` é o corpus mínimo de `procedencia:check`: campos
estruturais são medidos/derivados; o único declarado é não estrutural; e o
valor resolvido aponta para fontes medidas/derivadas.

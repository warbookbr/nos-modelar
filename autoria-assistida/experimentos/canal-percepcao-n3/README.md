# Corpus do canal de percepção N3

`gerar-evidencias.mjs` produz, sem alterar nenhuma receita, zebra, isófota e
curvatura para três superfícies sadias por construção (esfera, toro e patch
justo), uma quebra sintética e três evidências reprovadas: quarto dianteiro,
R2B e a pele primária recompilada da receita isolada do cupê livre.

O último caso recompila literalmente apenas o `criarLoft` da carroceria: rodas,
cabine e detalhes não são superfície primária e ficam fora da leitura C1. Isso
não troca nem corrige o experimento isolado; dá ao canal uma malha reproduzível
dele para calibração.

Execute `node gerar-evidencias.mjs`. O resultado em `evidencias/resultado-c1.json`
é o gate: só passa se o lado sadio for regular e todo caso reprovado for
irregular no canal. A leitura não decide se um objeto é um carro, nem aprova
proporção ou caráter visual.

`fonte-veiculo-valida.json` é o corpus mínimo de `procedencia:check`: campos
estruturais são medidos/derivados; o único declarado é não estrutural; e o
valor resolvido aponta para fontes medidas/derivadas.

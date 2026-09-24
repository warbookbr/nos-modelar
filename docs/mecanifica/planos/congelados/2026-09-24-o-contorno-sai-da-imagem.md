# O contorno sai da imagem

**Estado:** congelado
**Congelado em:** 2026-09-24, por decisão da pessoa, no mesmo dia em que foi escrito.

**Por que foi congelado.** O plano ativo, [O laço constrói parte por
parte](../2026-09-23-o-laco-constroi-parte-por-parte.md), está no meio do braço
robótico, com a base fixa e o anel da cintura como próxima etapa. A pessoa
decidiu terminar o braço antes de abrir outra frente, e deixou este plano
guardado como candidato a vir logo depois.

**Condição de descongelamento.** O plano ativo fechar, ou uma etapa do braço
parar porque a referência não deixa medir proporção ou posição de uma parte.

**Levado para o plano ativo.** Só a nota de que este plano é candidato a
segui-lo.

**Fica parado junto.** Nada: nenhum código deste plano foi escrito. A prancha
lateral do braço desenhada à mão em 2026-09-24, com retângulos lidos a olho na
`lateral.png`, ficou fora do repositório e é a linha de base que este plano
precisa superar.

## Problema observado

Em 2026-09-24 a pessoa pediu uma prancha da vista lateral do braço, tirada de
`procedural/pecas/braco-robotico/referencias/lateral.png`, para ver se um
desenho em texto substitui a imagem. O motor de prancha
(`tools/mecanifica/prancha/`) foi feito para silhueta de carroceria, e os
contornos foram traçados à mão: cada parte virou um retângulo de cantos
arredondados com coordenadas lidas a olho, pixel por pixel. A pessoa julgou que
o resultado não serve nem para conferir proporção e posição, e tem razão:
contorno desenhado por quem lê a imagem carrega o erro dessa leitura, e nenhuma
medida o separa da forma verdadeira.

`prancha-referencia.mjs` já lê um PNG, mas só extrai o envelope de cima e de
baixo por coluna, que perde toda parte que se sobrepõe a outra na mesma coluna,
como o antebraço sobre o punho.

## Resultado

Um comando recebe uma imagem de referência e a escala, e devolve em texto os
contornos de cada região da imagem, em milímetros, traçados pela própria
imagem, com a região nomeada pela pessoa ou pelo modelador. A prancha e a
conferência do modelo contra a referência passam a usar esse arquivo.

## Candidatos a testar

Potrace transforma imagem de duas cores em contornos vetoriais com curvas; é o
motor da vetorização do Inkscape e tem porte em JavaScript no npm. OpenCV separa
a imagem por cor e contraste e acha o contorno de cada região; tem versão em
JavaScript (`opencv.js`). Segment Anything recorta objetos quando a cor não
basta, mas é modelo pesado e só entra se o corte por cor falhar.

A fatia de pesquisa também levanta outros: autotrace, os traçadores de bitmap
de bibliotecas de desenho, e qualquer projeto que separe regiões e devolva
contorno medido.

## Incluído

- comparar os candidatos na `lateral.png`, com a mesma pergunta para todos:
  o contorno de cada parte bate com a borda da imagem, em pixels medidos;
- escolher um, por medida, e envolvê-lo num comando em `tools/mecanifica/`;
- nomear as regiões e converter para milímetros pela escala declarada;
- ligar o resultado a `conferir:referencia` e ao motor de prancha.

## Excluído

- guardar a imagem em texto sem perda, que foi discutido e não reduz o
  repositório;
- cor, sombra e acabamento, que continuam só na imagem;
- trocar o motor de prancha.

## Gate de saída

1. em cada parte visível da `lateral.png`, o contorno extraído fica a no máximo
   2 pixels da borda da imagem na maior parte do perímetro, medido;
2. o mesmo comando, rodado duas vezes na mesma imagem, devolve o mesmo arquivo;
3. a prancha feita com esses contornos é aceita pela pessoa como melhor que a
   linha de base desenhada à mão;
4. os 32 gates verdes.

## Fatias

1. Pesquisa: levantar candidatos, dizer para cada um o que entrega, a licença,
   se roda em Node sem serviço externo e o peso da dependência.
2. Ensaio: rodar Potrace e OpenCV na `lateral.png` e medir o desvio do contorno
   contra a borda da imagem, parte por parte.
3. Comando: envolver o escolhido, nomear regiões e escrever os contornos em
   milímetros.
4. Uso: prancha e conferência contra referência lendo esse arquivo, com a
   pessoa julgando a prancha nova ao lado da antiga.

## Riscos e parada

Se nenhum candidato separar as partes que se sobrepõem na imagem, como o tambor
do ombro atrás da coluna, o contorno por região não basta e a pergunta passa a
ser segmentação por objeto, que é outro plano. Dependência que exige serviço
externo ou GPU para rodar não entra sem decisão da pessoa.

## Fechamento

Preencher somente ao concluir ou cancelar.

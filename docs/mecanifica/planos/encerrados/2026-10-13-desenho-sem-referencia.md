# Desenho sem referência

**Estado:** concluído

**Responsável:** Claude, com o aceite da pessoa; o levantamento da fatia 1 é de um agente em Opus 5.5, como a pessoa pediu

**Repositório e base:** `warbookbr/nos-mecanifica`, branch da sessão sobre a `main`, que já traz o plano anterior inteiro

## Problema observado

Todo o caminho de forma da Mecanifica parte de uma imagem que existe: o contorno
da imagem tira as partes de uma referência, a prancha cota esses contornos, e o
esboço e o crítico comparam o modelo com ela. Quando o objeto não tem imagem, a IA
fica sem o que traçar, e o que ela desenha não tem prancha, cota nem alvo que o
crítico possa usar. O plano [o que o avião pede](2026-10-11-o-que-o-aviao-pede.md)
mostrou também o custo de traçar sobre imagem pequena, com a borda em escadinha e
rodadas do crítico gastas nela.

A pessoa propôs em 2026-10-13 um módulo à parte em que a IA desenha um objeto a
partir de uma descrição, sem imagem de referência, com foco em praticidade,
acerto e controle.

## Hipótese

A IA acerta mais e gasta menos quando declara as partes, as medidas e as relações
entre elas (paralela, tangente, alinhada, a tantos milímetros) e um resolvedor de
restrições dá a geometria, do que quando escreve coordenadas. Se a saída do módulo
tiver o mesmo formato dos contornos que o contorno da imagem já grava, a prancha, o
esboço e o crítico a usam como se fosse uma referência, sem mudar.

## Resultado

A IA desenha as vistas de um objeto descrito em texto, com medidas e partes
nomeadas, num arquivo salvo que é determinístico e reexecutável, que a prancha cota
e o crítico julga, e o desenho de um objeto simples é aprovado pela pessoa sem
imagem de referência. O objeto de prova é um que já tem referência no repositório,
escondida da IA durante o desenho, para que a razão interseção/união do desenho
contra o contorno dessa referência meça o acerto além do olho do crítico.

## Filtro Agent-First

A pesquisa da fatia 1 decide, para cada peça do caminho atual, se o módulo novo a
usa direto, a envolve ou a adia: as famílias e os perfis, o esboço com medidas, a
prancha dos contornos, o formato dos contornos, o crítico cego e a calibração. A
ferramenta não precisa ter sido feita para IA: a pessoa lembrou em 2026-10-14 que
um programa aberto feito para gente, comandado pelas funções dele, serviu a outra
tarefa melhor do que procurar um pronto para IA, e o levantamento avalia por igual
programas de desenho técnico comandados por script (o esboço com restrições do
FreeCAD, o SolveSpace, o LibreCAD, o Inkscape, o OpenSCAD) e bibliotecas. O que entra usado de fora tem a
versão fixada e a instalação reproduzível, e o desenho salvo fica no formato do
repositório, com a mesma entrada dando o mesmo arquivo; código trazido de fora
leva a licença de origem e o aviso de autoria, como o combinado de 2026-10-13 na
[pesquisa](../../PESQUISA-ABERTA-2026-10.md) permite.

## Incluído

- o levantamento do que a Mecanifica já tem e serve ao desenho sem imagem, e do
  que existe fora, feito para IA ou para gente, que a IA consiga comandar aqui,
  com a recomendação; o ponto de partida é a pesquisa de
  2026-10-13 em [IA que desenha e resolvedores de restrições
  2D](../../PESQUISA-ABERTA-2026-10.md), que recomenda portar a JS o resolvedor
  `cadcraft-constraints` (MIT ou Apache-2.0, pré-alfa), usar o planegcs como
  oráculo nos testes, devolver à IA o relatório do resolvedor (graus de liberdade,
  conflito, restrição redundante) e adotar do AIDL as restrições duras e leves;
- no mesmo levantamento, o teste do Potrace e da linha de comando do VectorCraft
  contra o contorno da imagem nas vistas do avião, combinado com a pessoa para
  depois da segunda rodada, com a borda medida contra a borda subpixel atual e a
  saída conferida entre execuções;
- o desenho do módulo em pasta própria em `modulos/`, isolado do núcleo de
  autoria e independente de Three.js, com o formato salvo versionado;
- um protótipo mínimo que desenhe o objeto de prova a partir de uma descrição, com
  teste, julgado pelo crítico e medido contra a referência escondida, com o custo
  em tokens registrado;
- a decisão da pessoa sobre continuar.

## Excluído

- mudar o contorno da imagem, a prancha ou o esboço para este fim antes de a
  fatia 1 apontar o que falta;
- trocar o contorno da imagem pelo Potrace ou pelo VectorCraft neste plano: o
  teste diz se vale, e a troca é decisão da pessoa;
- desenho 3D direto sem passar pelas vistas, e geração de imagem por modelo
  treinado;
- levar o módulo ao produto.

## Gate de saída

1. o levantamento escrito, com o resultado do Potrace e do VectorCraft, a
   recomendação e o que a pessoa escolheu;
2. o protótipo com teste, determinístico (a mesma entrada dá o mesmo arquivo byte a
   byte), sem Three.js e com o núcleo de autoria intocado, conferido pelo teste
   `nucleo-sem-three`;
3. a vista do objeto de prova com a razão interseção/união contra a referência
   escondida registrada, nota do crítico e aprovação da pessoa;
4. `npm run gates --completo` verde.

## Fatias

1. **Levantamento.** O agente em Opus 5.5 lê o que a Mecanifica tem, pesquisa o
   que existe pronto, roda o teste do Potrace e do VectorCraft e propõe o módulo,
   o formato salvo e o objeto de prova. A pessoa escolhe. Entregue em 2026-10-14 no
   [levantamento](../../LEVANTAMENTO-DESENHO-SEM-REFERENCIA.md); a pessoa aceitou no
   mesmo dia as seis recomendações: o planegcs 1.3.0 como resolvedor, a lateral
   sem cabo do braço robótico como objeto de prova, a descrição escrita por ela
   com só a altura e o alcance totais tirados da imagem, a mesma descrição
   desenhada também por coordenadas para comparar, o corte das pontas pelo
   alisamento do contorno no backlog e a prancha dizendo a procedência do desenho.
2. **Protótipo.** O menor módulo que desenha o objeto de prova a partir de uma
   descrição, provado por teste, pelo crítico e pela referência escondida. A
   pessoa pediu que Claude escrevesse a
   [descrição](../../banco-de-provas/desenho-braco-2026-10-14/DESCRICAO.md) do braço. A
   ferramenta está em `modulos/desenho-por-restricoes`, com `npm run desenho` e a
   skill `desenho-por-restricoes`, provada no carrinho de mão e em formas
   sintéticas. O [resultado](../../banco-de-provas/desenho-braco-2026-10-14/RESULTADO.md) do
   braço deu empate entre restrições e coordenadas. A pessoa escolheu uma segunda prova com a
   lateral da carcaça da empilhadeira, com esta
   [descrição](../../banco-de-provas/desenho-carcaca-2026-10-14/DESCRICAO.md). O
   [resultado](../../banco-de-provas/desenho-carcaca-2026-10-14/RESULTADO.md) da
   carcaça repetiu o empate, e nas duas provas o que limitou o acerto foi a
   descrição. Na rodada de correção da carcaça, pedida pela pessoa, o desenho por
   restrições subiu de 0,67 para 0,74 e o por coordenadas ficou em 0,65.
3. **Decisão.** A pessoa decidiu em 2026-10-14 seguir e mudar o rumo: o módulo
   fica como o formato do desenho, e o sucessor monta peças e famílias de desenho
   ajustadas às referências que já têm contorno.

## Riscos e parada

Se a fatia 1 mostrar que o desenho sem imagem precisa mudar o contrato de família,
de esboço ou de prancha, o plano para e a pessoa decide antes de ampliar. O crítico
foi calibrado para comparar com referência; se ele não conseguir julgar a vista
pela descrição, isso vira achado da fatia 2 e a pessoa decide se o crítico ganha um
modo novo, que pede calibração própria.

## Sucessor

O próximo plano é o das [famílias de desenho](2026-10-14-familias-de-desenho.md),
decidido pela pessoa em 2026-10-14, com o roteiro dos planos seguintes e os
candidatos de sucessão que estavam aqui.

## Fechamento

Concluído em 2026-10-14, com a decisão da pessoa. O levantamento foi escrito, com o
Potrace e o VectorCraft sem ganho sobre a borda subpixel, e a pessoa escolheu as
seis recomendações (item 1). O módulo `modulos/desenho-por-restricoes` desenha por
partes e relações com o planegcs 1.3.0, é determinístico, não usa Three.js nem o
núcleo de autoria, grava o formato dos contornos que o esboço e a prancha leem e
ganhou na prova o canto arredondado e o texto dentro da folha (item 2). As duas
provas, o braço robótico e a carcaça da empilhadeira, mediram cada desenho contra a
referência escondida e foram julgadas pelo crítico (item 3): no primeiro traço as
restrições empataram com as coordenadas (0,80 contra 0,81 no braço e 0,67 contra
0,66 na carcaça, com nota 6 e 5 nos dois) e custaram de 60 a 70% mais tokens; na
correção, ganharam (0,74 contra 0,65). A pessoa não aprovou nenhuma das vistas como
forma, porque a prova media o caminho e não a forma, e decidiu seguir com base nas
medidas. A bateria completa passou (item 4).

Ficam como ressalva: o que limitou o acerto foi a descrição, e não a forma de
desenhar, o que dá ao sucessor o problema certo; a razão da ferramenta mede só o
anel de fora da silhueta e exagera o acerto quando uma barra fina fecha um vão, como
o arco traseiro da carcaça; e a paleta do mapa de partes, que confundiu o crítico do
contorno da carcaça, foi para o backlog.

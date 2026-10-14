# Desenho sem referência

**Estado:** ativo

**Responsável:** Claude, com o aceite da pessoa; o levantamento da fatia 1 é de um agente em Opus 5.5, como a pessoa pediu

**Repositório e base:** `warbookbr/nos-mecanifica`, branch da sessão sobre a `main`, que já traz o plano anterior inteiro

## Problema observado

Todo o caminho de forma da Mecanifica parte de uma imagem que existe: o contorno
da imagem tira as partes de uma referência, a prancha cota esses contornos, e o
esboço e o crítico comparam o modelo com ela. Quando o objeto não tem imagem, a IA
fica sem o que traçar, e o que ela desenha não tem prancha, cota nem alvo que o
crítico possa usar. O plano [o que o avião pede](encerrados/2026-10-11-o-que-o-aviao-pede.md)
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
[pesquisa](../PESQUISA-ABERTA-2026-10.md) permite.

## Incluído

- o levantamento do que a Mecanifica já tem e serve ao desenho sem imagem, e do
  que existe fora, feito para IA ou para gente, que a IA consiga comandar aqui,
  com a recomendação; o ponto de partida é a pesquisa de
  2026-10-13 em [IA que desenha e resolvedores de restrições
  2D](../PESQUISA-ABERTA-2026-10.md), que recomenda portar a JS o resolvedor
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
   [levantamento](../LEVANTAMENTO-DESENHO-SEM-REFERENCIA.md), à espera da escolha.
2. **Protótipo.** O menor módulo que desenha o objeto de prova a partir de uma
   descrição, provado por teste, pelo crítico e pela referência escondida.
3. **Decisão.** A pessoa decide se o módulo segue, muda ou para.

## Riscos e parada

Se a fatia 1 mostrar que o desenho sem imagem precisa mudar o contrato de família,
de esboço ou de prancha, o plano para e a pessoa decide antes de ampliar. O crítico
foi calibrado para comparar com referência; se ele não conseguir julgar a vista
pela descrição, isso vira achado da fatia 2 e a pessoa decide se o crítico ganha um
modo novo, que pede calibração própria.

## Candidatos de sucessão

Os objetos levantados em 2026-10-11 para o mesmo exercício do avião, cada um
forçando uma falta diferente: a bicicleta (corrente, engrenagem e transmissão, com
a roda 2.0), a empilhadeira (mastro telescópico com trilho e corrente e várias
articulações, com o
[alinhamento](../banco-de-provas/empilhadeira-2026-10-09/ALINHAMENTO.md) já
começado), a cadeira de escritório (estofado e espuma, base em estrela, pistão a
gás e rodízio) e um objeto de esteira, como robô de esteira ou escavadeira (o elo
articulado). E os que o plano [as ferramentas de
modelagem](encerrados/2026-10-07-as-ferramentas-de-modelagem.md) deixou: o carrinho
de mão como família de objeto, a bacia em casca como primitiva, a dobradiça de
caneco e as ressalvas do fechamento dele. E, do [backlog](BACKLOG.md), os atritos
abertos da segunda rodada do avião, com a integração do detalhe com o mestre como o
primeiro grupo.

## Fechamento

Preencher ao concluir ou cancelar.

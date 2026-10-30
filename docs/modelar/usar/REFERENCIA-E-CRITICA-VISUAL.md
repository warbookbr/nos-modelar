# Referência e crítica visual — protocolo de modelagem

Este documento organiza como uma IA transforma imagens de referência em
critérios verificáveis, revisa uma peça durante a modelagem e distingue falha de
execução de capacidade ausente na linguagem. Ele é um protocolo experimental,
não uma skill e não abre sozinho trabalho de implementação.

## O que ficou fora deste documento

O formato JSON do achado reexecutável (`mecanifica.achados-critica-visual`), o
caso aplicado da roda dianteira e a regra de quando um guia vira skill estão em
[`CRITICA-VISUAL-CONTRATO-E-CASOS.md`](CRITICA-VISUAL-CONTRATO-E-CASOS.md). São
consulta; este documento é o que se lê antes de julgar.

## O laço do crítico

Esta seção é a definição única do que o crítico recebe, de como ele responde e de
quantas rodadas o laço tem; as skills dos laços, o `LACO-VISUAL.md` e o resto
deste documento apontam para ela, e a definição do agente `critico-visual` é a
mesma.

O crítico é o agente `critico-visual`, despachado sem contexto em marco: antes de
levar uma forma à pessoa, de fechar uma etapa ou de propor publicação, e depois
que descrição, medidas e gates estão limpos. Ele recebe o pedido que
`npm run vistas:critica` monta na pasta da rodada: as vistas da peça e de cada
parte em arquivos separados, o alvo ou a referência quando existem, as partes
que o plano promete com a forma e a técnica, os critérios de reprovação e as
perguntas. Ele não recebe receita, código, passos, medidas, o raciocínio de quem
modelou nem o histórico da construção. Sempre que a forma vai à pessoa, a
legibilidade cega (só a imagem e "o que é isto?") roda antes.

Três laços usam outro pacote, sem receita, código nem medidas e com o mesmo
veredito: o refino de carroceria, com o pacote cego e as rodadas além da
primeira com a pessoa; o
processo leve, com a prancha dos perfis (skill `laco-de-modelagem`); e o esboço,
com o brief do Condutor (skill `laco-do-esboco`).

Ele responde com o veredito `mecanifica.veredito-de-forma` em bloco JSON:
`alvo`, `nota` de 0 a 10, `observacao` de até 240 caracteres e `defeitos`, cada
um com `parte`, `tipo`, `onde`, `sentido` e `evidencia` (de 15 a 240
caracteres). Os tipos e sentidos são fechados: `angulo` e `comprimento` (maior,
menor), `posicao` (adiantada, atrasada, alta, baixa, e para o lado externa e interna), `espessura` (maior,
menor), `ausencia` (faltando), `uniao` (afastado, atravessando), `superficie`
(anguloso, segmentado, facetado) e `cota` (faltando, mal_posta, sobreposta), e
`src/autoria/veredito-de-forma.js` recusa o que sair disso. O veredito é achado,
nunca aprovação: quem aprova forma é a pessoa.

A rodada fecha com nota 8 ou mais e nenhum defeito. No laço de uma peça
(`rodada-de-modelagem`), o limite é de 6 rodadas, e o laço para antes se 3
rodadas seguidas não reduzem os defeitos; passar disso é decisão da pessoa,
gravada no `limite.json` da pasta de rodadas da peça, com quem decidiu e por quê. No laço do esboço, cada unidade tem 3
rodadas para chegar a 8, e a quarta só com o sim da pessoa, registrado pelo
Condutor. No mapa de partes e na prancha (`rodadas-com-critico.mjs`), que julgam
desenho e não forma, a nota 9 fecha, e depois de três rodadas a pessoa decide. O veredito entra no registro como o crítico o devolveu, e quem conduz
o laço não edita a nota nem os defeitos.

## Princípio

Uma referência visual não deve virar uma ordem genérica como “faça mais
realista”. Antes de modelar, ela vira um **briefing da peça**: um artefato curto,
específico daquela tarefa, com regiões, relações e enquadramentos observáveis.
## Papéis

### Orquestrador

- separa verdade técnica de aparência;
- escolhe vistas comparáveis e o perfil de autoria;
- propõe o briefing e, quando útil, o debate com o usuário;
- mantém o checklist curto e priorizado;
- não transforma cada detalhe observado em requisito obrigatório.

### Modelador

- constrói e refina por região, preservando identidade semântica;
- produz as mesmas vistas canônicas em cada marco;
- responde ao checklist com evidência;
- informa quando uma correção depende de capacidade ausente.

### Crítico visual

Recebe as referências, os renders atuais nas mesmas vistas e o nível de
realismo desejado. Na primeira passada, não recebe justificativas nem o histórico
de construção: avalia o resultado, não a narrativa do modelador.

O crítico é uma sessão separada, despachada, sem contexto, que recebe o artefato,
as vistas e o critério e nunca o raciocínio de quem modelou (seção 3 de
[`LACO-VISUAL.md`](LACO-VISUAL.md)).

Isto não é preciosismo de processo. O modo de falha documentado não é
incapacidade, é **apego à própria narrativa**: numa comparação de silhueta, o
autor afirmou que o defeito grave era a linha do teto; a medida mostrou desvio de
17 mm no teto e de 112 mm na traseira, que ele não havia apontado. Um crítico frio
não herda a expectativa de quem desenhou.

### Antes de despachar: olhe você mesmo

O crítico não substitui o ato de olhar. Antes de despachar, rasterize as vistas
e leia o PNG como imagem, como manda a seção 1 de
[`LACO-VISUAL.md`](LACO-VISUAL.md), que traz o comando e o caso que motivou a
regra.

### Regra obrigatória de inspeção individual

**Mosaico, folha de contato, painel lado a lado ou miniatura é somente índice;
nunca é evidência suficiente para aprovar ou encerrar uma fatia visual.** Cada
imagem exigida pelo gate é aberta separadamente, em tamanho nativo, e lida antes
de registrar o resultado. Para forma 3D, o conjunto mínimo inclui mais de um
enquadramento: isométrica, lateral, frontal e superior quando aplicáveis.

Um canal de diagnóstico também obedece a essa regra: zebra, isófota e curvatura
não podem mostrar wireframe, triangulação, costura de UV/índice ou um recorte de
exportação como se isso fosse defeito de superfície. Primeiro se valida a leitura
nos controles sadios, depois se lê cada artefato individualmente. Métrica e
painel resumem; não substituem essa inspeção.

### Pareamento referência ↔ render

Quando a referência nasce como prancha com várias vistas, ela é uma fonte de
origem, não uma imagem a ser julgada inteira. O pacote deve recortar e hashear
cada vista antes da modelagem. Em toda rodada, `frontal` confronta somente
`frontal`, `lateral` somente `lateral`, `traseira` somente `traseira` e
`superior` somente `superior`, todos abertos individualmente em tamanho nativo.
A perspectiva confirma a integração entre decisões já aceitas nas ortográficas;
ela nunca mascara uma falha nelas. O manifesto do alvo precisa declarar esse
pareamento e o crítico registra os hashes de ambos os lados da comparação.

### O crítico recebe IMAGEM

O que se despacha ao crítico é a imagem, e a pergunta é sobre o que ela
mostra. Receita, código, passos, contrato e relatório não vão para ele, pelo
motivo dado na seção 3 de [`LACO-VISUAL.md`](LACO-VISUAL.md), e o crítico não
recebe medida nenhuma. Duas perguntas valem sobre a imagem: a legibilidade cega,
só o PNG e "o que é isto?", que roda sempre que uma forma vai à pessoa, porque é
barata e é a única defesa contra entregar algo que o autor já não consegue
enxergar; e as condições de rejeição declaradas, perguntando quais estão
violadas no que se vê, sem o motivo de cada escolha, que ancora. Esta roda em
marco e depois da medida limpa, porque gastá-la no que a medida já reprova é
desperdício. Além de "achado, nunca aprovação" (`LACO-VISUAL.md`, seção 3):

- **cada despacho é partida fria** e reconstrói contexto;
- **não edita.** Aponta e prova; quem corrige é o modelador.

O que o crítico devolve é o veredito descrito em [O laço do crítico](#o-laço-do-crítico),
com a vista e a região de cada defeito na `evidencia`. O crítico não edita a peça.
## Pergunta-base para o crítico

Para legibilidade cega, sem referência e sem dizer o que é:

> Descreva o que você vê nesta imagem. Que objeto é este, de que família, e o
> que na forma sustenta essa leitura? Se algo na imagem contradiz a leitura que
> você deu, aponte.

Para comparação contra referência, o pedido do `npm run vistas:critica` já traz
a pergunta, e a resposta é o veredito de [O laço do crítico](#o-laço-do-crítico),
com defeitos tipados no lugar de uma lista livre de divergências.

Uma crítica sem referência pode ser usada depois para perguntar o que parece
artificial, desconectado ou estruturalmente improvável. Ela não substitui a
comparação principal.
## O laço obrigatório: abrir o alvo, sobrepor, despachar com os dois

Os três passos — abrir o alvo antes de modelar, sobrepor a cada rodada e
despachar o crítico com os dois — estão em [`LACO-VISUAL.md`](LACO-VISUAL.md),
junto das outras regras que valem em qualquer tarefa que produza forma.

O custo que os originou fica aqui, porque é o argumento: o quarto dianteiro do
chassi foi modelado por doze rodadas sem que o desenho de referência do P0 fosse
aberto uma única vez. A única pergunta que o crítico podia responder era "isso
parece um carro?". Quando a sobreposição finalmente existiu, ela mostrou em
cinco segundos que o nariz do modelo era parede vertical onde o alvo enrola, e
que a planta era 500 mm mais larga que o alvo na ponta.
## Fluxo

1. Fixar perfil de autoria, distância mínima e orçamento.
2. Reunir referência técnica e referência de aparência separadamente.
3. Gerar briefing com no máximo oito itens e vistas de prova.
4. Permitir revisão do usuário quando o resultado visual for subjetivo.
5. Modelar envelope e interfaces; depois, uma região por vez.
6. Renderizar vistas canônicas equivalentes às referências, **e sobrepor ao
   alvo**, como no passo 2 da seção 2 de `LACO-VISUAL.md`, antes de julgar qualquer coisa.
7. Rodar a crítica **por despacho**, como em [O laço do crítico](#o-laço-do-crítico),
   depois que a prova determinística estiver limpa.
8. Corrigir os defeitos do veredito, cada um na parte e na vista que ele aponta.
9. Repetir até a rodada fechar ou o limite de rodadas parar o laço.
10. Integrar somente depois dos gates semânticos, geométricos e visuais.

O fluxo tem limite: checklist e crítica não crescem indefinidamente. Divergência
não prioritária vai para backlog da peça.

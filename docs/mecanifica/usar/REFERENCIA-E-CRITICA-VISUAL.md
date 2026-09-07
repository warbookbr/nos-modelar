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

> **O crítico é uma sessão separada, despachada, sem contexto.** Papel separado
> dentro da mesma sessão é ficção: quem modelou *tem* a narrativa e não consegue
> não tê-la. O orquestrador despacha um subagente e passa apenas o artefato, as
> vistas e o critério — nunca o próprio raciocínio.

Isto não é preciosismo de processo. O modo de falha documentado não é
incapacidade, é **apego à própria narrativa**: numa comparação de silhueta, o
autor afirmou que o defeito grave era a linha do teto; a medida mostrou desvio de
17 mm no teto e de 112 mm na traseira, que ele não havia apontado. Um crítico frio
não herda a expectativa de quem desenhou.

### Antes de despachar: OLHE você mesmo

O crítico existe porque quem modelou não consegue não ter a narrativa. Ele
**não** existe para substituir o ato de olhar. Rasterize as vistas e abra a
imagem:

```
node tools/mecanifica/olhar.mjs saida.png vista-a.svg vista-b.svg
```

e leia o PNG como imagem. SVG entregue ao usuário e nunca aberto por quem
desenhou é o modo de falha real desta investigação: um nariz aberto de
600 x 370 mm ficou várias rodadas visível na vista frontal e só foi achado por
um script que contava laços de borda. Medição só pega o defeito que alguém já
imaginou; olhar pega o resto.

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

O que se despacha ao crítico é a **imagem**, e a pergunta é sobre o que ela
mostra. Não se despacha receita, código, passos, contrato nem relatório para
revisão: isso é revisão de código, tem outro dono, e um crítico lendo a receita
volta a julgar a intenção em vez do resultado — que é exatamente o defeito que o
papel existe para cobrir.

Três formas de despacho, da mais forte para a mais fraca:

1. **Legibilidade cega.** Entregue só o PNG, sem dizer o que é, e pergunte
   "o que é isto?". Se a resposta não bate com a intenção, é achado — e o teste
   não exige gosto nenhum, só verifica se a forma comunica. É a forma padrão.
2. **Condições de rejeição sobre a imagem.** Entregue o PNG e a lista de
   condições de rejeição declaradas, e pergunte quais estão violadas **no que se
   vê**. Omita o motivo de cada escolha: o motivo é justamente o que ancora.
3. **Reinterpretação da medida.** Entregue o relatório numérico junto do PNG e
   peça a leitura independente. Pega o caso em que o autor explica um alerta em
   vez de corrigir. É a forma mais fraca porque reintroduz números.

Limites do papel, que valem mais que os achados:

- **produz achado, nunca aprovação.** Silêncio do crítico não é evidência de
  qualidade, e não pode ser registrado como aceite. Aprovação de forma é do
  usuário;
- **legibilidade cega roda sempre que uma forma vai ao usuário.** É barata e é
  a única defesa contra entregar algo que o autor já não consegue enxergar. As
  formas 2 e 3, essas sim, rodam em marco e depois da medida limpa: são caras e
  gastá-las no que a medida já reprova é desperdício;
- **cada despacho é partida fria** e reconstrói contexto;
- **não edita.** Aponta e prova; quem corrige é o modelador.

O crítico aponta no máximo cinco divergências prioritárias. Para cada uma,
informa:

- região e vista em que aparece;
- evidência visual observável;
- impacto em silhueta, proporção, profundidade, transição ou fabricação;
- classificação provável: ajuste, remodelagem local ou capacidade ausente;
- condição visual de aceite, sem prescrever uma sequência rígida de comandos.

Uma segunda passada opcional pode receber o vocabulário disponível para revisar
a classificação de viabilidade. O crítico não edita a peça.
## Pergunta-base para o crítico

Para legibilidade cega, sem referência e sem dizer o que é:

> Descreva o que você vê nesta imagem. Que objeto é este, de que família, e o
> que na forma sustenta essa leitura? Se algo na imagem contradiz a leitura que
> você deu, aponte.

Para comparação contra referência:

> Compare a peça atual com as referências considerando silhueta, proporções,
> continuidade entre superfícies, espessura, profundidade, acabamento de bordas
> e detalhes funcionais. Liste no máximo cinco divergências que mais impedem
> atingir o nível de realismo solicitado. Para cada uma, indique a região
> visual, a evidência observável, a condição de aceite e se a correção parece
> exigir ajuste, remodelagem local ou capacidade ausente.

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
   alvo** com `comparar:alvo` antes de julgar qualquer coisa.
7. Rodar crítica intermediária **por despacho** — subagente `critico-visual`,
   sem contexto, recebendo alvo, modelo e sobreposição,
   limitado às cinco maiores divergências — depois que a prova determinística
   estiver limpa.
8. Classificar cada divergência e corrigir somente as prioritárias.
9. Repetir uma vez; nova rodada exige evidência de ganho ou bloqueio real.
10. Integrar somente depois dos gates semânticos, geométricos e visuais.

O fluxo tem limite: checklist e crítica não crescem indefinidamente. Divergência
não prioritária vai para backlog da peça.

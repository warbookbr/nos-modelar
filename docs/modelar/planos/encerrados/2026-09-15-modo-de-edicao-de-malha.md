# Modo de edição de malha — vértice, aresta e face

**Estado:** concluído

**Responsável:** Tiago (autoria) e a IA da sessão (implementação)

**Repositório e base:** `warbookbr/nos-mecanifica`, base `b7e7238` na main.

## Problema observado

O gesto por junta, entregue em 2026-09-15, move os cantos onde as partes se
encontram e nada além disso. O autor testou e recusou: "complexo demais". Ele
quer o que já sabe usar — selecionar a peça, Tab para entrar no modo edição,
escolher entre vértice, aresta e face, e mover.

A restrição que justificava o gesto por junta caiu. Ela existia porque não havia
caminho de volta: liberdade de edição produzia malha que nenhuma receita
reproduzia, então valia limitar o gesto ao que a receita já sabia expressar.
Agora `capturarAlvo` e `npm run absorver` existem e funcionam com qualquer malha
deformada, seja qual for o gesto que a deformou.

Sobra uma seta que some sem explicação: o tubo superior tem seta em y e z e
nenhuma em x, porque nenhum parâmetro declarado o desloca lateralmente. No modo
de edição a pergunta deixa de existir, porque o vértice se move sem depender de
parâmetro.

## Resultado

Com a peça aberta, o autor entra no modo de edição com Tab, seleciona vértices,
arestas ou faces e os move; o que ele desenhou é salvo como alvo e a rodada de
absorção reproduz o resultado dentro da tolerância medida.

## Filtro Agent-First

**Seleção e movimento de malha — ENVOLVER.** É interface humana e não entra no
vocabulário que a IA lê. A IA continua vendo receita; o que sai daqui para ela é
o mesmo alvo medido que a rodada de absorção já consome.

**Medida do alvo — REFATORAR.** Hoje o alvo é a caixa de cada parte, e caixa não
enxerga vértice movido no meio de um tubo: a absorção diria "chegou" sem ter
reproduzido o detalhe. A medida precisa descer abaixo da caixa. É a decisão de
projeto desta fatia e o que a fatia 1 fixa com número.

**Desfazer — USAR DIRETO.** `historico-parametros.js` já guarda passos de sessão
e para no estado que veio do arquivo. O desfazer da edição usa a mesma pilha.

**Topologia — ADIAR.** Extrudar, duplicar, apagar e criar vértice mudam a
contagem de partes, e a rodada de absorção não sabe reescrever receita que ganhou
ou perdeu parte. Fica para o plano seguinte, escrito assim que este fechar.

## Incluído

- Tab entra e sai do modo de edição sobre a parte selecionada;
- 1, 2 e 3 trocam entre vértice, aresta e face, com o que está selecionado
  convertido ao mudar de modo;
- clique seleciona, Shift+clique soma, Alt+clique tira, A seleciona tudo, Alt+A
  limpa, L seleciona a ilha conexa sob o ponteiro, e arrastar abre caixa de
  seleção;
- G move a seleção, X, Y e Z travam o eixo, número digitado dá valor exato, Esc
  cancela e clique confirma;
- Ctrl+Z desfaz, parando no estado que veio do arquivo;
- gizmo de três setas no centro da seleção, arrastável, convivendo com o G. O
  autor pediu depois de testar: a trava de eixo por tecla funciona, mas não
  mostra para onde a seleção vai andar antes de ela andar;
- ímã com Ctrl durante o movimento, grudando no vértice mais próximo da malha
  que não está na seleção. É o uso mecânico — encostar uma ponta na outra sem
  depender de mira —, e é o que o Ctrl faz no Blender;
- alvo que enxerga vértice movido, não só caixa de parte;
- gate de navegador afirmando seleção, movimento e desfazer sobre o pacote
  construído.

## Excluído

- extrudar, duplicar, apagar e criar geometria. Mudam topologia, e a absorção
  ainda não trata disso. **Assim que este plano fechar, o plano seguinte é
  escrito para essas operações** — não voltam ao backlog, ficam na fila;
- rotacionar e escalar seleção (R e S). Entram junto com o plano de topologia;
- remoção do gesto por junta. Os dois convivem: o punho continua sendo o jeito
  rápido de mexer num canto inteiro;
- proporcional editing, snap, e modificadores.

## Gate de saída

1. na bicicleta, mover um vértice, uma aresta e uma face produz alvo que a
   rodada de absorção reproduz dentro da tolerância declarada;
2. o alvo salvo não contém id de vértice, índice de array nem posição de passo, e
   reexecuta igual em duas máquinas;
3. prova visual da peça editada sobreposta ao alvo;
4. gate novo nomeado em `tools/gates.mjs` e em `.github/workflows/ci.yml`,
   conferido por `reguas:check`, e falhando com a correção desfeita;
5. decisão Agent-First acima registrada, e a documentação de uso atualizada para
   que uma sessão nova chegue ao fluxo sem o autor explicar nada.

## Fatias

1. **A medida que enxerga vértice.** Fixar como o alvo descreve geometria abaixo
   da caixa, sem id de vértice, e com que tolerância. Mostrar o caso que falha:
   vértice movido no meio de um tubo que a medida atual não vê.
2. **Selecionar.** Modo de edição, os três níveis, e todas as teclas de seleção,
   com realce na tela.
3. **Mover.** G com trava de eixo, valor digitado, cancelar, confirmar e
   desfazer.
3b. **Apontar e grudar.** Gizmo de três setas na seleção, e o ímã do Ctrl.
4. **Fechar.** Gate de navegador, documentação, `npm run mapa`, gates completos,
   e a abertura do plano de topologia.

## Medido na fatia 1 — o que a medida responde, e o que ela não responde

Variar os números que a receita já declara NÃO alcança uma edição livre. Mover um
vértice do tubo do selim 5 mm em y deixa a receita 5,000 mm fora, e uma descida
por coordenada sobre os vinte e nove parâmetros, com passo caindo de 8% até
0,06%, só chega a 2,531 mm — cinco vezes a tolerância, e vindo de
`quedaDoMovimentoCentral`, que desce o quadro inteiro em vez de reproduzir a
edição. Mover o tubo do selim inteiro 5 mm em y não melhora nada: 5,000 mm antes
e depois.

ISSO NÃO É O LIMITE DO PLANO, e registrar assim seria enganar quem ler depois. A
rodada de absorção não procura número: ela reescreve `TABELA`, `derivar` e
`gerarPassos`. Para o tubo do selim ficar com outra forma, a receita ganha a
entrada que descreve essa forma, com origem declarada em `ORIGENS` — e isso é
trabalho de escrita, não de busca. A busca acima serve só para dizer que a
receita COMO ESTÁ não alcança, que é a pergunta que o comando `npm run absorver`
responde no começo de cada rodada.

Duas medidas de apoio. A busca foi validada em controle, para a conclusão não ser
sobre busca ruim: contra um alvo que é uma receita — `balancoTraseiro` 502 → 514
— ela sai de 12,158 mm e chega a 0,969 mm, convergindo para a resposta certa. E a
medida de nuvem de pontos não é rigorosa demais: o gesto por junta, que
corresponde a um parâmetro existente, passa com 0,340 mm.

O que falta provar é a reescrita: pegar uma edição de vértice, escrever a receita
que chega nela e medir. É o que a fatia 1 ainda deve.

## Riscos e parada

O risco que obriga parar é a absorção não alcançar o que a edição livre produz.
Mover um vértice solto pode desenhar uma forma que nenhum arranjo dos parâmetros
declarados reproduz, e aí a rodada de absorção passa a falhar de forma rotineira
em vez de excepcional. O sinal é a fatia 1: se a medida que enxerga vértice não
puder ser expressa pelos parâmetros da bicicleta em nenhum caso de teste, o plano
para antes da fatia 2 e a conversa volta a ser sobre o que a receita consegue
dizer.

O segundo risco é a tolerância. Ela é fixada na fatia 1 com número e não é
afrouxada depois para fazer uma rodada passar.

## Fechamento

**Concluído em 2026-09-16.** Commits `827bc21`, `36c7464`, `532a575`, `8c0fb0c`,
`091831b`, `661fcce`, `566d1d8`, `dd8c073` e `a47be13`, na main. Trinta e um
gates verdes, com dois novos: `guarda:edicao`, que afirma o modo no navegador, e
`bancada:fronteira:check`, que impede o núcleo e as ferramentas da IA de
dependerem da bancada.

O que passou a ser possível: `Tab` entra no modo de edição — só nas partes
selecionadas, se houver —, `1`, `2` e `3` trocam entre vértice, aresta e face,
`L` pega a ilha, `G` move com trava de eixo e valor digitado, o gizmo de três
setas move pelo ponteiro, `Ctrl` gruda no vértice mais próximo, e `Ctrl+Z`
desfaz até o estado do arquivo. O que a pessoa desenhou vira alvo medido, e a
rodada de absorção reescreve a receita a partir dele.

A pergunta que quase derrubou o plano, e a resposta. Variar os números que a
receita já declara não alcança uma edição livre: mover um vértice 5 mm deixa a
melhor busca sobre os vinte e nove parâmetros a 2,531 mm, cinco vezes a
tolerância. Mas a rodada não procura número, ela reescreve a receita. Provado no
caso que nenhum número alcança — o triângulo do quadro é simétrico e nada
desloca o tubo do selim para o lado: com o anel de cima empurrado 6 mm em x, a
receita fica 6,000 mm fora e a reescrita chega a 0,236 mm, na primeira
tentativa.

Seis defeitos de interface foram achados pela guarda ou pelo autor e corrigidos,
cada um medido: digitar o valor do movimento trocava de nível; a edição valia
para a peça inteira em vez da parte selecionada; a câmera ficava presa porque a
camada parava todos os botões; o clique tremido virava caixa vazia e limpava a
seleção (25 de 42 vértices respondiam com 8 px de tremida); o gizmo engolia o
clique de seleção e trazia outro vértice (42,7 px de erro, hoje 2,8); e o realce
era apagado pelos pontos normais por ordem de fila de desenho (o pixel vinha
âmbar em toda posição de câmera, hoje vem branco).

Devolvido à fila, e não ao backlog: extrudar, duplicar, apagar, criar,
rotacionar e escalar, mais mover a parte inteira, que o autor pediu ao testar.

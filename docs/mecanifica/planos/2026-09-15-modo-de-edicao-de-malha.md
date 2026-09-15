# Modo de edição de malha — vértice, aresta e face

**Estado:** ativo

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
4. **Fechar.** Gate de navegador, documentação, `npm run mapa`, gates completos,
   e a abertura do plano de topologia.

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

Preencher somente ao concluir ou cancelar.

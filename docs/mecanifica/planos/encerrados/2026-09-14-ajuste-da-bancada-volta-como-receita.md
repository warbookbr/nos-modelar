# Ajuste da bancada volta como receita — o caminho de volta existe

**Estado:** concluído

**Responsável:** Tiago (autoria) e a IA da sessão (implementação)

**Repositório e base:** `warbookbr/nos-mecanifica`, base `874b9fb` na main.

## Problema observado

A bancada exige que todo gesto caia num parâmetro nomeado, e por isso quase não
há gesto possível. Medido na bicicleta em 2026-09-14: a seta de z de
`balancoInferiorEsq` está ligada a `balancoTraseiro`, e a sonda mostra centro da
caixa andando 0.0126 contra crescimento de 0.0252 — o dobro exato, assinatura de
uma ponta presa esticando a outra. A parte não anda, ela estica, e os quatro
balanços esticam juntos porque todos terminam no eixo traseiro. No `tuboSuperior`
a seta de y está em `pontoTuboSuperiorFrente.1` com centro 0.0242 contra
crescimento 0.0468, o mesmo dobro. O autor arrastou as duas e viu a peça mudar de
tamanho em vez de mudar de lugar.

A causa não é a receita. Num quadro em treliça cada tubo é definido pelos dois
pontos de junta que ele liga, e não existe número na `TABELA` que empurre um tubo
inteiro sem descolar as juntas. A causa é a bancada prometer um gesto que o
formato não comporta, porque insiste em escrever direto no parâmetro durante a
edição.

## Resultado

O autor ajusta a peça na bancada com liberdade, salva, e uma rodada de absorção
devolve uma receita organizada que executa e chega no que ele deixou, dentro de
tolerância medida, sem nenhum id de vértice no arquivo salvo.

## Filtro Agent-First

**Captura do ajuste — ENVOLVER.** A malha editada não vai para a IA como malha;
vai como alvo medível por parte, no mesmo vocabulário de `descrever-partes.js`
que o laço de modelagem já usa. Custo de contexto fixo e independente da
contagem de vértices, e comparável por número.

**Reescrita da receita — USAR DIRETO.** Receita é código e a IA já escreve
receita. Não se cria uma linguagem intermediária de edição: o que a rodada
produz é `TABELA`, `derivar` e `gerarPassos`, lidos e provados como qualquer
receita.

**Decisão de aceitar a reescrita — ENVOLVER.** Quem aprova não é a sessão: é a
comparação entre a receita reexecutada e o alvo capturado, parte a parte. Mesmo
critério de `proximaAcao`, que já tira a decisão de parar de quem escreveu.

**Editor de malha completo — ADIAR.** Sem caminho de volta provado, liberdade de
edição só produz arquivo que não salva. Volta ao backlog depois desta fatia.

**Desambiguação da intenção — ENVOLVER.** Puxar a ponteira 12mm para trás pode
ser balanço mais longo ou roda mais atrás, e as duas produzem a mesma malha. A
skill pergunta quando duas leituras couberem na tolerância; resolve sozinha
quando só uma couber.

## Incluído

- captura do estado ajustado da bancada como alvo por parte, determinística e
  versionada, sem id de vértice e sem índice de passo;
- skill `absorver-ajuste-da-bancada` com o método da rodada: ler a receita atual
  e o alvo, propor a reescrita, medir, perguntar o que for ambíguo, registrar a
  rodada ao lado da peça;
- medida de aceite: reexecutar a receita reescrita e comparar caixa por parte
  contra o alvo, com tolerância declarada;
- gate contra deriva: parâmetro novo na `TABELA` sem origem declarada reprova;
- edição mínima que exercita o caminho de volta — arrastar um ponto de junta da
  peça, que é o gesto que o autor tentou e a bancada não comporta hoje;
- linha nova na tabela de `docs/mecanifica/usar/README.md` apontando a skill, e o
  contrato dela em documento próprio nessa pasta.

## Excluído

- editor de malha completo ao estilo Blender, com vértice, aresta, face,
  extrusão e duplicação. Esta fatia entrega o caminho de volta; o editor vem
  depois, sobre um caminho de volta que já existe;
- mudar o que a IA que modela lê hoje. `criar-peca` e `laco-de-modelagem` seguem
  como estão, porque absorver ajuste não é etapa de modelagem;
- corrigir a escolha de seta por eixo para exigir translação rígida. Vira
  desnecessário se a edição passar a ser por junta, e o plano decide isso na
  fatia 2, não antes;
- salvar direto no repositório pela API do GitHub a partir da rodada de absorção.
  O salvar atual já existe e não muda aqui.

## Gate de saída

1. na bicicleta, um ajuste real feito na bancada é absorvido e a receita
   reescrita executa dentro da tolerância declarada contra o alvo capturado;
2. o arquivo salvo não contém id de vértice, índice de array nem posição de
   passo, e reexecuta igual em duas máquinas;
3. prova visual: a peça reexecutada sobreposta ao alvo, lida por olho antes de
   fechar;
4. gate novo nomeado em `tools/gates.mjs` e em `.github/workflows/ci.yml`,
   conferido por `reguas:check`, e falhando com a correção desfeita;
5. decisão Agent-First acima registrada, e a entrada de documentação existindo
   de modo que uma sessão nova chegue à skill sem o autor explicar nada.

## Fatias

1. **O caso que falha.** Capturar o estado da bicicleta ajustada e mostrar que
   nada hoje sabe transformá-lo em receita. Fixar a tolerância de aceite com
   número, não com adjetivo.
2. **O gesto que cabe.** Arrastar um ponto de junta na bancada, acumulando o
   ajuste em memória sem escrever parâmetro. Decidir aqui o destino da seta por
   eixo atual.
3. **A volta.** Skill de absorção, medida de aceite, registro da rodada ao lado
   da peça e gate contra parâmetro sem origem declarada.
4. **A porta.** Linha na tabela de `usar/README.md`, contrato em documento
   próprio, `npm run mapa`, gates completos e fechamento.

## Riscos e parada

O risco que obriga parar é a deriva de parâmetro: se, para acertar o alvo, a
reescrita precisar inventar números sem significado físico declarável, a receita
deixa de ser legível e o ganho se inverte. O sinal é o gate de origem declarada
reprovando de forma recorrente em ajustes comuns. Nesse caso a fatia 3 para e o
plano é redesenhado com o alvo restrito ao que a `TABELA` já sabe expressar.

O segundo risco é a tolerância de aceite virar elástico. Ela é fixada na fatia 1
com número e não é afrouxada depois para fazer uma rodada passar; se o ajuste
não couber nela, quem muda é a receita, não a tolerância.

## Fechamento

**Concluído em 2026-09-15.** Commits `b4a865e`, `98841ff`, `b616377` e o desta
linha, na main. Vinte e nove gates verdes, com dois novos: `guarda:junta`, que
afirma o gesto no navegador, e `origens:check`, que cobra a declaração de onde
veio cada número.

O que passou a ser possível: a pessoa abre a peça, liga `Juntas`, arrasta os
cantos, e salva um arquivo com a peça como ela ficou. A skill
`absorver-ajuste-da-bancada` recebe esse arquivo, e `npm run absorver` diz em
milímetro o que a receita ainda não alcança, parte por parte.

As medidas que sustentam o resultado. O gesto cabe numa receita: puxar as duas
ponteiras 12,059 mm para trás produz um alvo que a receita com
`balancoTraseiro: 514` reproduz com erro máximo de 0,104 mm, dentro da tolerância
de meio milímetro. O gesto não vaza: arrastar a ponteira esquerda move o balanço
inferior e o superior daquele lado e deixa as outras seis partes intocadas, medido
por caixa no teste e por posição no navegador. E a régua enxerga o defeito certo:
contra um alvo com o balanço 12 mm mais longo, a receita original erra 11,955 mm e
acusa só os quatro balanços.

Dois defeitos foram achados na prova de navegador e corrigidos: o punho voltava
para a posição do arquivo ao soltar o ponteiro, porque o redesenho lia as juntas
da malha base em vez da ajustada, e o rodapé do modo ficava dentro de uma aba
escondida. A guarda reprova com a primeira correção desfeita, acusando "ponteiro
110px, punho 0.0px".

Devolvido ao backlog: o editor de malha completo, adiado de propósito até o
caminho de volta existir — agora ele existe. Continua no backlog dizer à pessoa
por que um eixo ficou sem seta.

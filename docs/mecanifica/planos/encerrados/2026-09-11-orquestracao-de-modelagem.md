# Orquestração de modelagem — alinhamento, despacho e veredito

**Estado:** concluído

**Responsável:** Claude

**Repositório e base:** `nos-mecanifica`, base `60a5f31`

## Problema observado

Quem modela também aprova o que modelou, e por isso trabalho torto passa. Na
prova do quarto dianteiro do chassi eu modelei sem abrir o desenho de
referência uma única vez e mandei ao revisor visual só o render; a nota foi 3
de 10 duas vezes seguidas sem que nenhum de nós pudesse apontar contra o quê, e
o registro disso está no cabeçalho de `tools/mecanifica/comparar-alvo.mjs`. Na
bicicleta eu declarei que a prancha estava reta e alinhada ao guidão quando ela
estava torta, e chamei de translação um defeito que era de ângulo: eu disse que
o tubo do selim precisava ir para a frente quando o que faltava era girá-lo.

Os instrumentos que pegariam parte disso existem e ficaram fora do caminho.
`src/autoria/contatos-da-peca.js` nasceu porque o tubo inferior de uma
bicicleta atravessou o pneu e passou em todos os testes;
`tools/mecanifica/conferir-juntas.mjs` mede vão, paralelismo e selagem. Mesmo
assim a bicicleta antiga saiu com partes que não se tocavam, porque a receita
não declarou os contatos e ninguém rodou a medida. O `INTENCAO`, documentado em
`docs/mecanifica/usar/INTENCAO-PECA-V1.md`, é opcional e magro demais para
servir de contrato.

A consequência é que o resultado depende de quem está na cadeira, e não do
método. Orientação que não falha é conselho, e conselho é ignorado sob pressão
de terminar.

## Resultado

Uma peça passa a ser modelada a partir de um plano de modelagem escrito antes,
por três papéis separados — quem alinha, quem modela, quem julga —, e nenhum
deles aprova o próprio trabalho.

## Filtro Agent-First

`contatos-da-peca` e `conferir-juntas`: **USAR DIRETO**. Medem o que precisa ser
medido e já saem com código de erro; o que falta é estarem no laço.

`INTENCAO`: **REFATORAR**. A forma de cinco campos não carrega partes, contatos
nem critérios de reprovação. Cresce para virar o plano de modelagem, mantendo a
validação e a assinatura que já tem.

`critico-visual`: **ENVOLVER**. O isolamento que o laço exige já está nele — a
única ferramenta é `Read`, ele recebe caminhos de imagem e tem escrito que não
deve descobrir de onde as imagens vieram. Muda só a saída, que passa de nota e
prosa para defeitos nomeados.

Modelador: **CRIAR**. Não existe. O `implementador` implementa mudanças no
repositório e não é um autor de peça; `revisor-adversarial` julga código e não
forma. Sem um modelador com papel próprio, quem modela é a sessão principal,
que também é quem aprova.

Motor de prancha: **ADIAR**. O traço trêmulo vem de polilinha digitada à mão, e
consertar isso é outro plano. Aqui a referência é a imagem, não a prancha.

## Incluído

- o plano de modelagem como arquivo, ampliando `INTENCAO`: partes com nome e
  forma pretendida, pares que devem se tocar, imagens de referência com a
  medida que dá a escala, e critérios de reprovação daquele objeto;
- a skill da rodada de alinhamento, com as perguntas fixas e as que dependem da
  família da peça;
- o documento vinculado ao README com o exemplo completo preenchido;
- veredito estruturado do revisor, com vocabulário fechado de defeito;
- o laço dos três papéis, com registro por rodada e critério de parada;
- o gate que confere a peça contra o plano de modelagem;
- os arquivos de agente do modelador e do revisor, genéricos por construção: o
  papel, o que podem ler, o que têm proibido fazer e o formato de entrada e
  saída moram no agente; partes, nomes, formas, contatos e critérios vêm do
  plano de modelagem.

## Excluído

- conserto do motor de prancha e do traço por polilinha;
- medida automática de ângulo e comprimento contra a imagem de referência, que
  entra depois, quando o laço já estiver de pé;
- qualquer mudança no vocabulário de operações do núcleo;
- modelagem do carro.

## Gate de saída

1. peça sem plano de modelagem não passa: o gate acusa e diz o que falta;
2. par declarado como contato que não se toca reprova com número, e a mensagem
   nomeia as duas partes;
3. parte nomeada no plano e ausente na peça reprova;
4. o revisor não recebe a história da construção, e o veredito dele nomeia
   parte, tipo de defeito e sentido do erro — veredito em prosa é recusado;
5. o modelador não emite juízo sobre o próprio resultado e o revisor não edita
   receita: nenhum dos dois arquivos de agente cita objeto específico, e trocar
   a bicicleta por outra peça não exige tocá-los;
6. o vocabulário de defeito é fechado, e "ângulo" e "posição" são entradas
   distintas, de modo que um defeito de ângulo não possa ser respondido com
   translação;
7. o laço registra cada rodada com receita, medida e veredito, e para por
   critério atingido ou por limite de rodadas, nunca por concordância do autor;
8. a rodada de alinhamento é executável como skill e produz o arquivo;
9. os vinte gates continuam verdes.

## Fatias

1. **Plano de modelagem como formato.** Ampliar `INTENCAO` para carregar
   partes, contatos, referências e critérios, com validação e recusa de chave
   desconhecida como a de hoje. Prova: plano bem formado é aceito, plano sem
   contatos declarados é recusado dizendo o que falta.
2. **Gate da peça contra o plano.** Comando que compara a peça executada com o
   plano: parte que o plano nomeia e a peça não tem, e par declarado que não se
   toca, saem com código 1. Prova: tirar um contato da bicicleta faz o comando
   reprovar nomeando o par.
3. **Skill da rodada de alinhamento.** Roteiro com as perguntas fixas — objeto,
   imagens e escala, partes e nomes, forma e técnica por parte, contatos,
   critérios de reprovação — e as variáveis por família. Termina escrevendo o
   arquivo. Prova: rodar a skill sobre a bicicleta reproduz um plano equivalente
   ao que a receita atual já cumpre.
4. **Os dois papéis como agentes.** Arquivo do modelador, que escreve receita a
   partir do plano de modelagem e não avalia o resultado, e ajuste do
   `critico-visual`, que julga e não edita. Nenhum dos dois cita objeto
   específico. Prova: os mesmos dois arquivos servem à bicicleta e a uma peça de
   outra família, sem edição.
5. **Veredito estruturado.** Contrato de saída do revisor: lista de defeitos com
   parte, tipo dentro do vocabulário fechado, extremidade afetada e sentido do
   erro. Prova: veredito em prosa é recusado pelo validador; veredito válido
   vira entrada de rodada.
6. **O laço.** Comando que recebe o plano, despacha o modelador, roda os gates,
   despacha o revisor com alvo e critérios mas sem a construção, leva o veredito
   de volta e repete até fechar ou até o limite. Prova: uma peça defeituosa de
   propósito é corrigida em rodadas registradas, e o registro mostra o veredito
   que motivou cada correção.
7. **Documento e exemplo.** O documento vinculado ao README com a bicicleta
   inteira preenchida: o que foi perguntado, o que foi decidido, e como virou
   plano. Prova: `docs:links:check` e `docs:estrutura:check` verdes.

## Riscos e parada

O risco que obriga parar é o plano de modelagem virar burocracia sem poder. Se
ele for escrito e os gates continuarem passando sem lê-lo, voltamos ao conselho
com mais passos. Por isso a segunda fatia vem antes da skill: primeiro o
arquivo tem que ser capaz de reprovar, depois vale a pena escrevê-lo com
cuidado.

O segundo risco é o vocabulário fechado de defeito ser estreito demais para o
objeto. Se o revisor precisar dizer algo que não cabe em nenhum tipo, ele vai
espremer o defeito no tipo mais próximo e a correção sairá errada. A saída não é
abrir o vocabulário para texto livre, é registrar o caso e acrescentar um tipo
nomeado.

O terceiro risco é o revisor sem referência medida continuar julgando por
impressão. Este plano não entrega a medida de ângulo e comprimento contra a
imagem, então a reprovação por proporção ainda depende do olho. Se as rodadas
mostrarem que o revisor oscila, a medida deixa de ser trabalho posterior e vira
bloqueio.

## Fechamento

**Concluído** em 2026-09-11, nos commits `0dd86da` a este, com vinte e um gates
verdes — um a mais que antes, o `guarda:acervo`.

O que passou a reprovar: contato declarado que não acontece, parte prometida e
não entregue, parte entregue sem promessa, peça do acervo sem plano de
modelagem, veredito em prosa, e defeito apontado em parte que não existe. O que
passou a parar sozinho: o laço, por fechamento, por limite ou por três rodadas
julgadas sem os defeitos caírem.

Os três papéis estão separados por arquivo e por ferramenta: o crítico continua
com `Read` apenas, o modelador não aprova nem decide parada, e quem orquestra
não edita veredito nem receita. Um teste recusa agente que cite o objeto da vez.

Desvios do desenho original, ambos registrados no corpo do plano: o `INTENCAO`
não foi ampliado e o `PLANO` nasceu como contrato ao lado, para não quebrar a
validação estrita e a assinatura das receitas que já o declaram; e os contatos
continuaram onde já eram medidos, em vez de migrarem para o plano.

Devolvido ao backlog, e é o que limita o resultado: a medida de ângulo e
comprimento contra a imagem de referência não foi feita, então reprovação por
proporção ainda depende do olho do revisor. Se as rodadas mostrarem que ele
oscila, essa medida deixa de ser trabalho posterior e vira bloqueio. Falta
também rodar o laço de ponta a ponta numa peça nova, com agentes de verdade: o
que está provado é o mecanismo, não a convergência.

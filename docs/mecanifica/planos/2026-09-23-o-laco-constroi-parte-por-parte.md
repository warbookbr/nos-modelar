# O laço constrói parte por parte

**Estado:** ativo

**Responsável:** Tiago (autoria) e a IA da sessão (implementação)

**Repositório e base:** `warbookbr/nos-mecanifica`, base `132570c0` na main.

## Problema observado

O plano [a peça nasce encaixada](encerrados/2026-09-22-a-peca-nasce-encaixada.md)
deixou pronto o mecanismo: a montagem v5 com etapas, vínculos de medida e
posição por porta, o resolvedor que constrói na ordem e o registro de etapas que
só fixa em ordem, com junta passando e aceite. Nada disso chega ao trabalho de
modelagem ainda. As skills mandam modelar a peça inteira de uma vez, se
contradizem em unidade, lugar da peça e ferramenta de captura, e o laço depende
de quem conduz seguir a sequência de memória.

## Resultado

O laço de modelagem constrói uma parte por vez sobre a montagem v5, a ferramenta
de rodada recusa passo fora de ordem, as skills dizem uma coisa só e curta, e as
três primeiras partes do braço robótico nascem por esse caminho.

## Alinhado com a pessoa

Combinado em 2026-09-23, depois de reler as skills.

As skills se contradiziam em três pontos, e os três são corrigidos. A cadeia da
receita é escrita uma vez, em `docs/mecanifica/usar/AUTORIA-DE-PECA.md`, e as
skills apontam para ela: a `TABELA`, em milímetros, é o que se mede e se edita,
e a receita a exporta como `PARAMS`; `derivar()` converte para metro e calcula
as posições, e `gerarPassos()` produz os passos já em metros. Metro é a unidade
da malha, do visor e dos formatos 3D; milímetro é a unidade em que peça mecânica
se mede. Um estilo mais antigo, o da fixture do eixo, põe `PARAMS` em metros e
cita os parâmetros pelo nome dentro dos passos; os dois convivem, e o contrato
diz qual é o padrão. Hoje nenhum gate confere essa cadeia. Na primeira versão
deste texto a cadeia estava descrita errada, com a conversão entre `TABELA` e
`PARAMS`; a leitura da peça de prova na fatia 2 mostrou que `PARAMS` é a própria
`TABELA`. A
peça mora em `procedural/pecas/<peça>/`; `modelar-maquina` e a pasta
`procedural/maquinas/` que ela mandava criar saem. O nome `pecas` é decidido na
fatia 3 deste plano: quando o braço virar várias receitas e uma montagem, a pasta guarda um
objeto e não uma peça, e só o primeiro caso real diz que forma ela terá.

A bancada serve para investigar e `vistas:critica` para julgar, e as duas skills
dizem isso. `npm run bancada` passa a sair sem interface por padrão, que é o que
a IA quase sempre quer; `npm run bancada:tela` mostra a tela como a pessoa vê,
para quando o assunto é a própria interface. A skill de modelagem só cita o
primeiro, e o segundo é documentado onde se fala de mexer na bancada. Até aqui o
padrão era com interface, e a imagem limpa dependia de lembrar da opção.

`auditar-montagem` continua sendo a auditoria da montagem pronta, no fim ou de
uma que já existe, e ganha uma linha dizendo isso. A etapa de montagem do laço
usa as ferramentas dela, de relação, interseção e impacto, em cada junta.

As skills são reescritas como método curto, e o porquê de cada regra vai para
uma referência consultada quando preciso. Elas cresceram por acúmulo de avisos
sobre falhas antigas, e citam receitas que já não existem.

O alinhamento começa por como o objeto funciona e como uma pessoa o montaria, e
só depois por como ele parece. A ordem das etapas segue a ordem real de
montagem. Com isso o trabalho não desmorona quando não há imagem de referência,
e a medida de cada parte sai da função que ela cumpre ao lado da vizinha.

A ferramenta de rodada recusa passo fora de ordem: registrar sem medida, fechar
sem crítico, fixar etapa sem o aceite da pessoa. A skill passa a mandar
perguntar à ferramenta qual é o próximo passo, em vez de descrever a sequência e
depender de quem conduz segui-la.

Cada etapa despacha um modelador novo, que lê do disco as partes já fixas e o
parecer da etapa anterior: o estado mora nos arquivos, e um agente longo
carregaria para as etapas seguintes o que entendeu errado na primeira. Modelador
e crítico podem repetir a etapa entre si, e ao fim dela o orquestrador para e
mostra à pessoa as vistas da parte, as medidas da junta e o veredito; a etapa só
fica fixa com o aceite dela. O registro de cada rodada guarda a diferença da
receita para a rodada anterior, gerada pela ferramenta, e o modelador fecha a
etapa com uma nota curta dizendo por que escolheu o que escolheu.

## Incluído

- as skills `laco-de-modelagem`, `alinhar-modelagem`, `criar-peca` e
  `auditar-montagem` e o contrato `.claude/agents/modelador.md`, reescritos
  como acima; `modelar-maquina` apagada;
- a cadeia da receita escrita em `docs/mecanifica/usar/AUTORIA-DE-PECA.md`;
- `npm run bancada` sem interface por padrão e `npm run bancada:tela`;
- a ferramenta de rodada gravando o registro de etapas, a diferença da receita
  e a nota de passagem, e recusando passo fora de ordem;
- as três primeiras partes do braço robótico, com a rodada de alinhamento
  terminada.

## Excluído

- mudar o mecanismo da montagem v5, salvo o que o braço mostrar que falta,
  consertado de forma genérica e provado de novo na fixture neutra;
- as onze partes restantes do braço;
- o tato, que entra em plano próprio;
- exportar um objeto de várias partes. Os três exportadores, `exportar`,
  `exportar:step` e `exportar:obj`, recebem uma receita de cada vez e não leem
  montagem, então as partes sairiam sozinhas, todas na origem. O conserto é o
  exportador pedir ao resolvedor da montagem as partes já posicionadas e gravar
  tudo junto, e decidir com o produto se o braço vai como peça única ou como
  partes com a posição de cada uma. Fica para plano próprio, depois de as
  primeiras partes do braço estarem aceitas, para ser provado com elas.

## Gate de saída

1. as skills não se contradizem em unidade, lugar da peça e captura, e nenhuma
   cita receita que não existe;
2. a ferramenta de rodada recusa registrar sem medida, fechar sem crítico e
   fixar etapa sem aceite, e cada recusa tem teste;
3. as três primeiras partes do braço nascem por vínculo e posição de porta, sem
   número de encaixe digitado, e as juntas passam na entrada de cada uma;
4. os 32 gates verdes ao fim de cada fatia.

## Arquivos reservados

As skills e o contrato citados, `docs/mecanifica/usar/AUTORIA-DE-PECA.md`,
`tools/mecanifica/olhar-bancada.mjs`, `tools/mecanifica/rodada-de-modelagem.mjs`,
`src/autoria/laco-de-modelagem.js`, `package.json` e
`procedural/pecas/braco-robotico/`.

## Fatias

1. **As instruções.** Skills, contrato, cadeia da receita e bancada limpa por
   padrão.
2. **A ferramenta do laço.** Registro de etapas em disco, diferença da receita,
   nota de passagem e recusa de passo fora de ordem.
3. **O primeiro usuário.** Terminar a rodada de alinhamento do braço, que parou
   na escala, construir as três primeiras partes e decidir o nome da pasta
   `pecas`. O que der atrito volta para o mecanismo e é consertado de forma
   genérica.

## Feito na fatia 1

`criar-peca` caiu de 15.021 para cerca de 6.000 bytes: método curto, o porquê de
cada regra em `references/por-que.md`, e uma seção de consulta com os
documentos de uso. `alinhar-modelagem` começa por como o objeto funciona e se
monta, e a ordem vira `etapas`. `laco-de-modelagem` conduz etapa por etapa, com
modelador novo e parada para a pessoa. O contrato do modelador ganhou a etapa e
a nota de passagem, e `auditar-montagem` diz que é para montagem pronta. A
cadeia da receita está em `AUTORIA-DE-PECA.md`, e a montagem v5 em
`MONTAGENS-SEMANTICAS.md`. `modelar-maquina` e `procedural/maquinas` saíram das
instruções e das listas de busca. `npm run bancada` sai sem interface, e
`bancada:tela` está em `BANCADA-E-APRESENTACAO.md`. O diário da cadeira, receita
apagada, foi de `usar/` para o histórico. O gate `docs:estrutura` pegou sozinho
os documentos que a skill curta deixou de citar.

## Feito na fatia 2

A rodada ganhou `notaDePassagem` e `receita`: a ferramenta grava a impressão do
texto julgado e a diferença linha a linha para a rodada anterior, contra uma
cópia guardada em `rodadas/`, e não contra o git, porque importa o que o
crítico julgou. `npm run etapas` grava o registro de etapas ao lado da montagem
e é a única porta para fixar etapa: recusa fora de ordem, sem o crítico ter
fechado a peça, sem nota de passagem, com junta reprovada e sem aceite, cada
recusa com teste. Registrar sem medida e fechar sem crítico já eram recusados.

## Andamento da fatia 3

A rodada de alinhamento do braço terminou e está em
`procedural/pecas/braco-robotico/ALINHAMENTO.md`. Com a pessoa ficou decidido
que o objeto é uma pasta só, com a montagem e as referências, e que cada parte
é uma receita própria em `partes/<parte>/`, porque cada etapa tem modelador,
rodadas e aceite próprios e a montagem liga receitas diferentes. As
ferramentas chamam a parte pelo nome curto `braco-robotico/base`: o resolvedor
procura também em `partes/`, a rodada aceita uma barra entre objeto e parte, e
`guarda:acervo` lista a parte pelo mesmo nome, com teste. A pasta `pecas`
mantém o nome; trocar por `objetos` mexe em muitos caminhos sem ser preciso
para o braço, e se for feito será em plano próprio.

## Riscos e parada

Partes corretas sozinhas e erradas juntas: a etapa confere encaixe, e não
proporção. Se isso aparecer no braço, a proporção entre partes vira campo do
`PLANO` e conferência da etapa. O risco que obriga parar é o braço exigir que
duas partes se ajustem uma à outra ao mesmo tempo: isso é solver, e vira plano
próprio.

## Fechamento

Preencher somente ao concluir ou cancelar.

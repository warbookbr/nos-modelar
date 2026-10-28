# O catálogo de famílias

**Estado:** cancelado

**Responsável:** Claude, com o aceite da pessoa

**Repositório e base:** `warbookbr/nos-mecanifica`, branch da sessão sobre a `main`

## Problema observado

[O esboço detalhado coerente](2026-10-01-o-esboco-detalhado-coerente.md)
fechou com uma medição: a maior parte do custo e das rodadas foi a IA
reconstruir, a partir de primitivas, mecanismos que se repetem entre máquinas.
As esteiras da escavadeira levaram seis rodadas e cerca de 260 mil tokens, a
suspensão dianteira da moto três rodadas sem passar de 7, e as notas do crítico
pararam entre 6 e 7 porque cada reconstrução traz um detalhe novo para corrigir.
Hoje a IA é livre para fazer qualquer forma, mas não tem à mão nada que faça as
formas difíceis do melhor jeito, nem peças já aprovadas para partir delas. O
esboço e o Mecanifica também não compartilham nada: o que o esboço decide é
refeito na modelagem.

## Resultado

Um catálogo, consultável pela IA, com duas camadas. A de baixo são ferramentas:
geradores de formas difíceis de fazer à mão (cabo e mangueira entre dois pontos,
mola, corrente, conexão de tubo, padrão de furos) e operações gerais empilháveis
sobre qualquer forma (espelhar, repetir em série, dar espessura, arredondar
borda, dobrar ao longo de um caminho). A de cima são famílias: peças
paramétricas homologadas, feitas com as ferramentas, que a IA usa e varia. A
família é o gerador, e os objetos homologados são pontos dentro dela: o pneu de
moto, o de trator e o de caminhão de mineração são a mesma família `pneu` com
seção, largura, aro e desenho da banda diferentes. Quando aparece um caso que a
família não alcança, ela ganha um parâmetro, e ninguém recria a peça do zero.

## Incluído

- o formato da entrada do catálogo, em dados e versionado: o que ela é
  (ferramenta, família ou objeto homologado), os parâmetros com as faixas
  válidas, as combinações recusadas com o motivo, as interfaces de encaixe com
  outras famílias (o pneu "aro 17" serve na roda "aro 17" sem conta), o estado
  da homologação (testes e nota do crítico), a versão e de quais ferramentas
  ela depende;
- um comando que consulta o catálogo (o que existe para "pneu", o que encaixa
  em "roda aro 17", quem usa a família X), para a IA escolher sem ler arquivo;
- a definição de cada família como dados neutros, lida pelo esboço e pelo
  Mecanifica, com dois geradores: o do esboço, simples, com as formas do
  módulo, e o do Mecanifica, a receita procedural detalhada; com os mesmos
  parâmetros, os dois saem com o mesmo tamanho e os mesmos pontos de encaixe,
  e essa conferência faz parte da homologação;
- a homologação: uma entrada só entra no catálogo com teste, gerada nos
  extremos das faixas e num ponto médio, com nota 8 ou mais do crítico cego em
  cada um, as interfaces conferidas e, para família, a coerência entre os dois
  geradores;
- o impacto de versão: quando uma entrada muda, o catálogo diz quem a usa, e
  só o afetado é reconferido;
- o crítico com escala ancorada (8 é sem defeito estrutural; detalhe de
  superfície não desce a nota abaixo de 8), com os defeitos da rodada anterior
  e com nome nas peças vizinhas, porque a homologação depende dele e a medição
  anterior mostrou que sem isso a nota não sai de 6 ou 7;
- a cobertura: a [lista das famílias de objetos](../../FAMILIAS-DE-OBJETOS.md) que o
  Mecanifica deve modelar e as [ferramentas por objeto](../../FERRAMENTAS-POR-OBJETO.md),
  de onde saem as ferramentas a criar, ordenadas pelos objetos que atendem;
- as primeiras ferramentas e famílias, construídas juntas: cada família
  homologada é o teste das ferramentas que ela usa, e uma ferramenta que não dá
  conta de fazer bem a família ainda não está pronta.

## Excluído

- recriar addons por inteiro ou por catálogo de terceiros; cada ferramenta
  entra porque uma família homologada precisa dela;
- operações não determinísticas: toda ferramenta gera o mesmo resultado para
  os mesmos parâmetros, como exige a regra de conteúdo salvo, e o vocabulário
  poligonal da bancada continua congelado;
- mudança no núcleo do Mecanifica além do que o gerador detalhado de uma
  família pedir, registrada à parte;
- a promoção automática de algo que a IA criou fora do catálogo, que fica para
  depois.

## Gate de saída

1. O formato da entrada e o comando de consulta existem, com teste.
2. Pelo menos três ferramentas e três famílias estão homologadas pelo processo
   acima, cada família com três objetos homologados de um extremo ao outro da
   faixa (por exemplo pneu de moto, de trator e de caminhão de mineração).
3. Uma família tem os dois geradores, e a conferência entre eles passa.
4. Uma combinação inválida é recusada com o motivo, e uma mudança de versão
   lista quem é afetado.
5. Um esboço de máquina feito com o catálogo usa as famílias por parâmetro, e
   as unidades que elas cobrem passam no crítico na primeira rodada.
6. `npm run gates --completo` passa.

## Fatias

1. O formato da entrada, o comando de consulta e o crítico com escala
   ancorada, defeitos anteriores e nome nas vizinhas.
2. As primeiras ferramentas e famílias, escolhidas com a pessoa em 2026-10-06
   e homologadas juntas. Famílias: `pneu` (objetos homologados de carro, moto e
   caminhão), `roda` (o aro forma par com o pneu e prova o encaixe entre
   famílias) e `cilindroHidraulico` (camisa, haste e olhais, com curso e
   diâmetro variáveis). Ferramentas: revolução com perfil (seção do pneu, aro,
   camisa), repetição em série em círculo ou ao longo de um caminho (blocos da
   banda, raios, parafusos da roda) e cabo ou mangueira entre dois pontos, com
   caimento e conexões nas pontas (as mangueiras do cilindro são o primeiro
   teste). Cada ferramenta é usada por pelo menos uma família e cada família
   usa mais de uma ferramenta. Ficam para uma segunda leva a mola com
   amortecedor, a esteira e os fixadores.
3. O gerador detalhado de uma família no Mecanifica e a conferência entre os
   dois geradores.
4. Um esboço de máquina feito com o catálogo, medido como na refeita anterior,
   e o fechamento.

## Riscos e desvios

O risco maior é o catálogo crescer sem foco e nenhuma família ficar boa. O
desvio é que nada entra sem homologação, e as primeiras famílias são poucas e
escolhidas com a pessoa. O segundo risco é os dois geradores divergirem; a
conferência de tamanho e encaixe é o que os prende. Se uma família pedir
parâmetros demais para cobrir casos muito diferentes, ela se divide em duas, e
o catálogo registra a relação entre elas.

## Fechamento

Cancelado em 2026-10-07 e substituído por [as ferramentas de
modelagem](2026-10-07-as-ferramentas-de-modelagem.md). A avaliação da estrutura
nas [análises de 2026-10](../../ANALISES-DE-2026-10.md) mostrou que os dois
geradores por família fixariam a duplicação entre esboço e núcleo em vez de
removê-la, e que as ferramentas e a verificação vêm antes das famílias. Deste
plano ficaram feitos o crítico com escala ancorada, defeitos da rodada anterior e
nome nas vizinhas (T012), a [lista de ferramentas por
objeto](../../FERRAMENTAS-POR-OBJETO.md) com o gate `ferramentas:check`, e a
[pesquisa aberta](../../PESQUISA-ABERTA-2026-10.md). O formato da entrada do
catálogo, o comando de consulta e as famílias não foram começados e voltam
depois do plano novo.

## Depois deste plano

O banco de provas segue como candidato, para medir o catálogo contra a IA sem
ele. Os achados em aberto do plano anterior que este não absorve (gate do
mestre no `--integrar` e no `--feito`, `funcao` fixa, junta por padrão
limitada, `--editar` no `plano`, brief em arquivo) também ficam como candidatos.
[As partes do braço](../congelados/2026-09-26-as-partes-do-braco.md) continuam
congeladas.

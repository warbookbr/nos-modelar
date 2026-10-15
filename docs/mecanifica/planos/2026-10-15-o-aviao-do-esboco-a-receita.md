# O avião do esboço à receita

**Estado:** ativo

**Responsável:** Claude, com o aceite da pessoa

**Repositório e base:** `warbookbr/nos-mecanifica`, branch da sessão sobre a `main`

## Problema observado

O avião de pequeno porte tem o esboço aprovado pela pessoa em 2026-10-13, na
segunda rodada do plano [o que o avião pede](encerrados/2026-10-11-o-que-o-aviao-pede.md):
o mestre e oito unidades (fuselagem, asas, empenagem horizontal, empenagem vertical,
motor, hélice, trem do nariz e trens principais) em
[`esboco-r2/`](../banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json), com
o Marco de 100% em 8. Ele existe só como esboço: no núcleo, as peças do acervo são o
braço robótico e o suporte do tubo, e nenhum objeto ainda passou do esboço para a
receita.

O caminho existe em pedaços e nunca foi percorrido por um objeto real. O tradutor do
nível zero (`src/autoria/tradutor-nivel-zero.js`) traduz o esboço para o andaime da
[forma global N2](../CONTRATO-FORMA-GLOBAL-N2.md); a receita declara `REFINA` e o
verificador do refinamento confere cada parte dentro do envelope do volume que ela
refina e as portas do andaime; e `npm run esboco -- --envelope <unidade> <receita.js>`
confere a receita contra a unidade do esboço. Nenhuma receita do acervo declara
`REFINA`. O [fluxo do objeto](../usar/FLUXO-DO-OBJETO.md) leva um objeto de várias
partes do alinhamento ao aceite, com uma receita por parte na ordem da montagem, e
foi escrito antes do esboço: ele não diz como o esboço aprovado entra na modelagem.

A pessoa abriu este plano em 2026-10-15, com o avião como o primeiro objeto a passar
do esboço para a receita, porque o esboço dele já está aprovado. A picape, o braço
robótico, o carrinho de mão e a empilhadeira, cujos esboços ela ainda não aprovou,
entram depois do avião completo.

## Resultado

O avião existe no núcleo como um objeto do fluxo, com uma receita por parte na ordem
da montagem, cada uma refinando o andaime traduzido do esboço aprovado e conferida
por `REFINA`, e montado e aprovado pela pessoa na bancada neutra. O que a travessia
pedir fica na ferramenta, no gate ou na instrução geral, de modo que o objeto
seguinte passe pelo mesmo caminho sem descobri-lo de novo.

## Filtro Agent-First

O tradutor do nível zero, `REFINA`, o verificador do refinamento, o Envelope por
receita, o [fluxo do objeto](../usar/FLUXO-DO-OBJETO.md) (`npm run objeto`,
`npm run etapas`), o laço de modelagem com o modelador e o crítico, as famílias do
núcleo (`superficie-aerodinamica` para asa, estabilizador, deriva, pá e hélice, e
`roda-pneu` para as rodas) e a bancada neutra são usados direto. Onde a travessia
pedir algo que eles não fazem, a correção vai à ferramenta geral, e o que só serve ao
avião entra como opção declarada sobre ela. A receita segue o formato salvo do
núcleo, determinístico, versionado e reexecutável, e a identidade de cada parte é o
nome dela na montagem e no `REFINA`, nunca a posição de um passo.

## Incluído

- a tradução do esboço aprovado para o andaime de cada parte, com as perdas da
  tradução (formas aproximadas, sem equivalente e recortes) medidas e registradas;
- o objeto do avião no fluxo: alinhamento, papéis das imagens de referência, a
  montagem com as etapas e o `PLANO` de cada parte, tirados do alinhamento e do
  esboço que já existem, sem refazer o que a pessoa já aceitou;
- a receita de cada parte pelo laço de modelagem, com `REFINA` contra o andaime da
  parte e as famílias do núcleo onde elas servem;
- a montagem do avião no núcleo, com os contatos e encaixes do esboço, a auditoria
  de interseções e o crítico contra as referências e o esboço;
- os atritos do backlog que a travessia precisar, a começar pelo grupo da integração
  do detalhe com o mestre, que a pessoa escolheu como o primeiro a puxar;
- o custo de cada parte e do objeto, comparado ao das duas rodadas do esboço.

## Excluído

- o curso dos trens e da hélice no núcleo: as receitas ficam na pose de pouso, e o
  movimento continua no esboço, porque montagem com pose e cinemática é capacidade
  em aberto no [backlog](BACKLOG.md);
- materiais, cor e acabamento de produto, e o detalhe de superfície que a pessoa
  aceitou sem a rodada de acabamento no esboço;
- os outros objetos, que entram depois do avião completo.

## Gate de saída

1. o andaime de cada parte traduzido do esboço aprovado, com as perdas registradas, e
   a receita de cada parte no núcleo com `REFINA` passando no envelope e nas portas,
   no veredito de `descrever-peca` e na `guarda:acervo`;
2. cada etapa da montagem fechada pelo crítico ou por aceite humano, e o avião
   montado sem interseção entre partes, aprovado pela pessoa na bancada;
3. o custo por parte e o total medidos, comparados ao das duas rodadas do esboço;
4. cada achado da travessia respondendo se o processo o teria pego sozinho, e o que
   faltava virado em ferramenta, gate ou instrução;
5. `npm run gates -- --completo` verde.

## Fatias

1. **A travessia de uma parte.** O esboço aprovado traduzido para o andaime de todas
   as partes, com as perdas medidas; o objeto do avião montado no fluxo; e a primeira
   parte da montagem, a fuselagem, levada do andaime à receita pelo laço de
   modelagem, com `REFINA`, o Envelope por receita e a bancada. É a fatia que mostra
   o que o caminho não faz, e o que ela achar vai à ferramenta antes da fatia 2. A
   [tradução](../banco-de-provas/aviao-receita-2026-10-15/TRADUCAO.md), em
   2026-10-15, deu 110 volumes: a fuselagem, o motor e os trens saem com o envelope
   do esboço, e as asas, as empenagens e a hélice não, porque o recorte some e a N2
   não inclina as pás. A
   [fuselagem](../../../procedural/pecas/aviao/ALINHAMENTO.md) passou pelo laço em
   duas rodadas, com nota 8 nas duas e os defeitos restantes vindos do esboço
   aprovado, e a pessoa a aceitou como está em 2026-10-15; ela segue o esboço com
   razão de volume de 0,99 no casco, mas custou cerca de 1,54 milhão de tokens, perto
   de quatro vezes a média de uma unidade do esboço. Na mesma data a pessoa decidiu
   que as superfícies sejam conferidas pela sobreposição de volume de cada parte com
   a forma do próprio esboço, com recortes e inclinações, abaixo de um mínimo
   reprova, e que o plano siga com um modelador novo a cada rodada e um pedido curto,
   medindo o custo de cada parte.
2. **As outras partes.** Na ordem da montagem, com um agente por parte e até três
   em paralelo quando as partes não dependem uma da outra (as asas e as empenagens,
   os dois trens), cada um com a lista fechada dos arquivos da parte dele, e Claude
   juntando um por vez.
   Na mesma data, com as empenagens fixas, a pessoa aprovou cinco melhorias de ferramenta
   que a travessia mostrou, na ordem recomendada. Antes da rodada de ajustes, com os trens
   fechados: o pacote do crítico montado pela ferramenta a partir do `PLANO`, com a vista
   montada enquadrada na peça nova e a sobreposição dos cortes do modelo com os do esboço,
   que desfez dois defeitos falsos lidos em vista pequena; o registro da rodada lendo direto
   o veredito do crítico e o relato do modelador; e a correção da booleana que deixa um canto
   solto quando o recorte raspa a casca, contornada hoje nas asas e na deriva. Antes do
   próximo objeto: a receita planejada gerada da unidade do esboço, com o plano, o `REFINA`,
   os contatos e o alvo novo; e a comparação do modelo com a referência real na mesma escala.
   Ainda em 2026-10-15 a pessoa aprovou ampliar a receita planejada gerada para sair também
   com a `TABELA` e os `PONTOS` tirados do esboço, e adiantá-la para logo depois do registro
   da rodada. O modelador dos trens principais fez 110 comandos de terminal, e só uns 13
   eram do laço; os outros garimpavam medidas e pontos no JSON do esboço. Também em 2026-10-15
   a pessoa autorizou começar, em paralelo com a rodada de ajustes e sob este plano, a fatia 1
   do [plano de importar objeto de código](2026-10-15-importar-objeto-de-codigo.md), que fica
   pronto e passa a ativo quando o avião fechar.
3. **A montagem e o aceite.** O avião inteiro no núcleo, a auditoria de interseções,
   o crítico contra as referências e o esboço, e a aprovação da pessoa na bancada. A
   auditoria mede também o apoio no chão: os dois trens saíram do esboço com as rodas
   17 mm acima dele, os dois críticos as deram no chão porque a vista montada não o
   desenha, e nenhum gate mede apoio.
4. **Fechamento.** O custo, os achados e a bateria completa.

## Riscos e parada

Se a tradução perder forma que a receita não recupera, ou se o envelope de caixa do
`REFINA` não conseguir dizer se uma parte curva, como a asa ou a fuselagem, segue o
esboço, o plano para na fatia 1 e leva à pessoa o que falta ao contrato antes de
modelar as outras partes. Se uma parte pedir capacidade nova do núcleo de autoria, a
mudança tem o próprio recorte, com o revisor adversarial, e mudança de contrato do
núcleo ou da montagem para o plano até a pessoa decidir. Se a primeira parte custar
mais que o dobro da unidade dela no esboço, o plano para e mede antes de seguir.

## Roteiro depois deste plano

Combinado com a pessoa em 2026-10-15: com o avião completo, seguem a picape, o braço
robótico, o carrinho de mão e a empilhadeira, cujos esboços ela ainda não aprovou,
cada um pelo esboço a partir dos desenhos e pela receita no núcleo, com as primitivas
2.0 que pedirem; e, mais adiante, os objetos da [lista de
famílias](../FAMILIAS-DE-OBJETOS.md), na ordem da [contagem de ferramentas por
objeto](../FERRAMENTAS-POR-OBJETO.md). A ordem entre os quatro fica com a pessoa.

## Fechamento

Preencher ao concluir ou cancelar.

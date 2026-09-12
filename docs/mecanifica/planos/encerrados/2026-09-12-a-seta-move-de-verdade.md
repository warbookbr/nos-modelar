# A seta move de verdade

**Estado:** concluído

**Responsável:** Claude

**Repositório e base:** `nos-mecanifica`, base `825341a`

## Problema observado

O autor tentou mover uma parte da bicicleta pela seta e relatou três coisas: a
peça andou muito pouco, outras partes andaram junto, e a seta é difícil de
pegar. As três foram medidas e nenhuma é impressão.

A seta de x do tubo do selim está ligada a `raioTuboSelim`, que é o raio do
tubo. Mudar esse número desloca o centro do tubo em zero nos três eixos e só
muda o tamanho, e ainda assim ele ganha a seta: a escolha compara as BORDAS da
caixa da parte, e engordar afasta as duas bordas como mover afastaria uma. A
medida confunde crescer com andar. Medido: raio de 17 para 17,85 dá deslocamento
de borda de 0,83 mm em x e deslocamento de centro de 0 mm.

Toda reexecução reencaixa a peça no estúdio, recentralizando e redimensionando
para caber num tamanho fixo. Como a espessura mudou, a caixa da peça inteira
mudou e o modelo todo escorregou. Medido: um arrasto de 120 px moveu as oito
partes os mesmos 51,9 mm, juntas. O deslocamento pedido pelo gesto briga com o
reencaixe, e é por isso que o arrasto parece surdo.

A haste da seta tem raio de 0,012 na escala do grupo, algo como treze
milímetros na cena: ela é fina demais para o ponteiro, e nada na tela responde
antes do clique dizendo que o ponteiro está sobre ela.

## Resultado

Arrastar a seta de um eixo move a parte selecionada naquele eixo, na medida do
arrasto, sem que o resto da peça escorregue, e a seta responde ao ponteiro antes
do clique.

## Filtro Agent-First

`ligacao-parte-parametro.js` — **REFATORAR**. A medida por borda responde a
pergunta errada e nenhum envoltório conserta isso; a intenção "qual número move
esta parte neste eixo" precisa de deslocamento de centro.

`posicionarNoEstudio` — **ENVOLVER**. A função está certa para o que faz, que é
encaixar uma peça recém-chegada. O que muda é quem a chama: a prévia de
parâmetro passa a reaproveitar a colocação em vigor.

`setas-de-parametro.js` — **USAR DIRETO**. O alvo de clique e o realce são
acréscimos dentro do módulo, sem contrato novo.

## Incluído

- escolha da seta pelo deslocamento do centro da parte;
- colocação no estúdio travada enquanto a mesma peça está aberta;
- alvo de clique maior que a haste desenhada, e realce sob o ponteiro;
- provas: unidade para a medida e a escolha, navegador para o arrasto.

## Excluído

- ponto de curva como parâmetro, que continua no backlog;
- qualquer edição de malha;
- redesenho do gizmo com rotação ou escala.

## Gate de saída

1. um arrasto medido no navegador move a parte selecionada e só ela;
2. nenhum parâmetro que apenas engorda a parte ganha seta;
3. a peça não escorrega entre prévias da mesma peça;
4. a guarda falha com qualquer das correções desfeita;
5. gates completos verdes.

## Fatias

0. **Arrasto que sobrevive à prévia.** Achado durante a medição e não previsto
   aqui: a prévia reconstrói o modelo a cada movimento, e a reconstrução chamava
   `esconder`, que jogava o arrasto fora. O gesto andava um passo de ponteiro e
   parava. É o que o autor sentiu como "a seta não entende que cliquei nela".
   Junto com ele, a conversão do arrasto ignorava a escala do estúdio, então o
   avanço saía multiplicado pela ampliação da peça, três vezes e meia na
   bicicleta, e o arrasto também escrevia fora do mínimo e do máximo declarados.

1. **Medida do centro.** `ligacao-parte-parametro.js` passa a devolver
   deslocamento de centro por eixo e crescimento por eixo, e a sensibilidade
   passa a ser de translação. Prova: `raioTuboSelim` mede centro zero.
2. **Escolha honesta.** `setas-por-eixo.js` escolhe pelo centro, então
   parâmetro que só engorda não vira seta. Prova: unidade com entrada de
   crescimento puro.
3. **Colocação travada.** A prévia reaproveita posição e escala em vigor; só
   peça nova reencaixa. Prova: navegador mede as partes não selecionadas
   paradas.
4. **Seta pegável.** Cilindro invisível mais grosso como alvo de clique, e
   realce quando o ponteiro está sobre ela. Prova: navegador acerta a seta a
   partir de um ponto fora da haste desenhada.

## Riscos e parada

O risco que obriga parar é a parte cujo movimento no eixo não vem de parâmetro
nenhum. Se, medindo pelo centro, uma parte ficar sem seta em algum eixo, a
bancada precisa mostrar isso em vez de ligar a seta ao melhor parâmetro
disponível — seta que mente é pior que seta ausente.

O segundo risco é a colocação travada esconder peça que cresceu para fora do
enquadramento. A saída é o enquadrar, que continua disponível pela tecla.

## Fechamento

**Concluído** em 2026-09-12, com 27 gates verdes.

O que passou a valer, medido sobre o pacote construído: arrastar a seta de um
eixo move a parte selecionada exatamente na medida do arrasto — pediu 0,8963 e
andou 0,8956 unidades de mundo —, nenhuma outra parte se move, e engordar um
tubo pelo painel não desloca mais o resto da peça. Parâmetro que só muda tamanho
não governa seta nenhuma, e o arrasto respeita o mínimo e o máximo que a tabela
declara.

A prova é `guarda:seta`, que abre a peça no navegador, mexe no raio pelo campo
numérico, arrasta a seta a partir de um ponto doze pixels ao lado da haste
desenhada e mede as oito partes. Verifiquei que ela falha com cada uma das
quatro correções desfeita isoladamente. A ordem das fases importa e está escrita
na guarda: o encaixe no estúdio só é exercitado com a peça como o arquivo a
descreve.

Ficou de fora, e volta ao backlog: o tubo do selim não tem seta em x, porque
nenhum parâmetro o translada nesse eixo. Isso é a regra funcionando — seta que
mente é pior que seta ausente —, mas a bancada ainda não diz à pessoa por que o
eixo está vazio.

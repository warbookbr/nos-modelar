# Nada depende da bicicleta

**Estado:** ativo

**Responsável:** Tiago (autoria) e a IA da sessão (implementação)

**Repositório e base:** `warbookbr/nos-mecanifica`, base `a72aa47` na main.

## Problema observado

O acervo tem uma peça, `bicicleta-quadro`, com 518 linhas, e as ferramentas
foram provadas contra ela. Vinte e seis arquivos a citam. O código de produção
não depende dela — `olhar-bancada.mjs`, `material-da-peca.mjs`,
`ativar-bancada.mjs` e `acervo-receitas.js` só a mencionam como exemplo em texto
de ajuda e comentário. Quem depende são as cinco guardas de navegador, cada uma
com `const PECA = 'bicicleta-quadro'` no topo, e cerca de quinze testes que
importam a receita; `alvo-do-ajuste.test.js` a cita doze vezes. Três guardas vão
além do nome da peça e pedem a parte `tuboSelim`.

O defeito não é depender de uma receita. É depender de propriedades que essa
receita tem por acaso. A `guarda:edicao` precisa de peça com várias partes, com
vértices que se sobrepõem na tela e com um anel de dezoito lados a dezessete
milímetros de raio, e nada disso está declarado: são características que a
bicicleta calhou de ter. A própria guarda admite a dependência ao afirmar "a
peça tem vértices que se sobrepõem na tela, senão a prova não vale". Mudar a
`TABELA` da bicicleta hoje ou quebra a bateria de gates, ou a deixa verde
provando menos do que o texto promete.

O padrão certo já existe e não foi usado: `tools/fixtures/acervo/` guarda
`cadeira-de-madeira.js` e `chapa-de-fixacao.js`. Ferramenta se prova contra
fixture que ela governa; conteúdo do acervo é o que o produto entrega. As
guardas escritas nesta linha de trabalho, inclusive `guarda:gesto` e
`guarda:edicao`, foram direto no conteúdo.

## Resultado

Nenhuma guarda e nenhum teste depende de peça do acervo. A bicicleta e a imagem
de referência dela saem do repositório, e os gates continuam verdes. A prova é a
remoção: enquanto ela estiver lá, ninguém sabe quem dependia dela.

## Filtro Agent-First

**REFATORAR.** Não há capacidade nova aqui. O que muda é de que objeto a prova
depende, e isso baixa o custo de toda rodada futura: hoje qualquer mudança de
conteúdo arrisca a bateria de gates, e qualquer mudança de gate arrisca o
conteúdo. Adiar tem custo crescente, porque cada guarda nova nasce acoplada.

## Incluído

- uma peça de prova em `tools/fixtures/`, governada pelas ferramentas, com as
  propriedades que as guardas precisam declaradas como requisito e conferidas:
  mais de uma parte, vértices que se sobrepõem na projeção da tela, um anel com
  lados suficientes para medir precisão de clique, junta entre partes, e
  referência visual própria;
- as cinco guardas de navegador e os testes movidos para ela;
- uma segunda peça de acervo, a moto, porque `guarda:acervo` recusa acervo vazio
  e está certa em recusar;
- remoção de `bicicleta-quadro` e da imagem de referência dela.

## Excluído

- mudar o que as guardas afirmam. Elas medem o mesmo depois da troca; o que muda
  é sobre o que medem. Guarda que passar a afirmar menos é regressão;
- `guarda:acervo` continua acoplada ao acervo real, porque medir o acervo é a
  função dela;
- qualquer operação nova de modelagem. O vocabulário poligonal segue congelado.

## Gate de saída

1. `prototipos/procedural/v3/pecas/bicicleta-quadro/` não existe, e a imagem de
   referência dela também não;
2. `grep` por `bicicleta-quadro` em `tools/`, `src/` e `.github/` não acha
   citação em teste nem em guarda; exemplo em texto de ajuda é reescrito para a
   peça que existir, e ferramenta que existe só para a bicicleta —
   `prancha-bicicleta-29.mjs` — sai junto com ela;
3. os 31 gates verdes, com cada guarda de navegador conferida desfazendo a
   correção que ela protege, como as desta linha já foram;
4. as propriedades que a peça de prova precisa ter estão declaradas em um lugar
   só e conferidas por teste, em vez de herdadas por acaso;
5. a moto entra no acervo cumprindo `PLANO`, `contatos` e `origens:check`, como
   qualquer peça.

## Fatias

1. **Medir o acoplamento e declarar o requisito.** Que propriedade cada guarda
   precisa, nome por nome, lida do código e não suposta. Sem isso a peça de
   prova nasce com as propriedades erradas e o trabalho se repete.
2. **A peça de prova.** Construí-la, com referência própria, e provar por teste
   que ela tem as propriedades declaradas.
3. **Mover guardas e testes.** Um de cada vez, conferindo que cada guarda
   continua reprovando com a correção desfeita.
4. **A moto.** Segunda peça de acervo, pelo laço de modelagem normal.
5. **Apagar a bicicleta.** É o gate, e vem por último de propósito.

## Medido na fatia 1 — o requisito lido do código

O acoplamento, contado: cinco guardas com `const PECA` no topo, três pedindo
parte pelo nome, e `guarda:junta` fixando até o nome do canto com as partes que
passam por ele. Nos testes, sete arquivos citam partes por nome e dois citam
parâmetros da `TABELA`.

`tools/fixtures/requisitos-da-peca-de-prova.js` transforma isso em régua, com a
guarda que exige cada item escrita junto: três partes no mínimo, porque
`guarda:edicao` afirma que as OUTRAS ficam paradas; oito vértices disputando o
mesmo lugar; ilha conectada de vinte e quatro vértices, que é o que `L` pega; ao
menos uma junta; e referência visual declarada.

Medir contra a bicicleta primeiro pagou: duas medidas que escrevi estavam erradas
e ela as derrubou. Uma procurava anel contando vértices na mesma altura, e o tubo
do selim é inclinado, então o anel de dezoito lados aparecia como quatro; virou
tamanho de ilha conectada. A outra definia junta como vértice compartilhado, e a
bicicleta não tem nenhum: junta é vértice de partes diferentes a menos de um
raio, e quem sabe isso é `detectarJuntas`, que a régua passou a chamar em vez de
reimplementar o critério.

O que a régua mede na bicicleta hoje: oito partes, 484 vértices disputados, ilha
de 266 e seis juntas. Os dois últimos números são exatamente os que
`guarda:edicao` e `guarda:junta` imprimem quando rodam, e bater com eles é o que
prova que a régua mede a condição certa em vez de uma grandeza parecida.

## Feito na fatia 2 — a peça de prova

`tools/fixtures/acervo/peca-de-prova/` é uma peça cujo projeto são os requisitos:
quatro tubos e um cubo, com cinco partes, 178 vértices disputando o mesmo lugar,
ilha de 38 e três juntas. Cada linha da `TABELA` declara em `ORIGENS` para que
requisito de guarda ela existe, e o teste ao lado prova que reduzir os lados do
tubo derruba a régua — a peça não passa por sorte.

Ela mora com as outras receitas de ensaio, fora do acervo publicado, porque o
resolvedor da CLI já buscava ali pelo motivo escrito lá: essas receitas dão
assunto estável aos testes e ficam de fora para que trabalho de peça não mexa no
que a suíte mede. `guarda:acervo` não a varre.

Faltavam dois caminhos para a bancada conseguir abri-la, e os dois foram
abertos com a mesma regra: `acervo-receitas.js` ganhou `listarParaBancada`, que
junta acervo e ensaio marcando qual é qual, e `imagens-da-peca.js` passou a
indexar as duas raízes. A separação entre as duas listas não é enfeite: juntar
ensaio dentro de `listarAcervo` fez a varredura de parâmetros saltar de 96
declarados para 102 contando requisito de fixture como parâmetro de peça, e foi
o teste que trava esse retrato que acusou.

O retrato subiu mesmo assim, de 96/32 para 102/38, e está certo: a varredura lê
`PASTAS_BUSCA` e sempre mediu as fixtures. Os seis números novos são a `TABELA`
da peça de prova, e os seis são vivos, porque cada um move geometria — que é o
requisito de guarda que ele existe para atender.

Abrir a peça nova achou um defeito que a bicicleta escondia. O rodapé com o
botão de salvar tem `display: flex` na classe, e isso vence o atributo `hidden`:
esconder o rodapé por JavaScript nunca funcionou, e ele aparecia em peça
recém-aberta, sem nada para salvar. Medido nas duas peças, o atributo dizia
escondido enquanto a tela mostrava. Uma regra mais específica corrige, e agora o
rodapé some com a malha intocada e sobe com "malha editada" depois do primeiro
gesto.

## Feito na fatia 3 — as guardas migradas

As cinco guardas de navegador abrem a peça de prova. Trocar a peça expôs quatro
coisas que a bicicleta escondia, e três delas eram fraqueza de guarda.

O clique da guarda caía num vértice a zero pixel de distância e nada era
selecionado: o ponto estava atrás do rodapé do salvar, que fica sobre o canvas.
A leitura de pontos passou a perguntar `elementFromPoint` quem está por cima e a
descartar o que não é a cena, o que torna honestas todas as afirmações por
clique, e não só esta.

A afirmação do movimento por `G` media o topo da caixa da cena inteira. Caixa só
se mexe quando o que andou está na borda, então mover uma parte interior subia
zero e reprovava um movimento que tinha acontecido; na bicicleta ela passava
porque a seleção calhava de ficar no alto. Passou a medir o centro da seleção.

A imagem de referência de 1,2 KB era embutida como data URI pelo empacotador, e
a afirmação de que o arquivo é SERVIDO pelo pacote nunca acontecia. A imagem
passou dos 100 KB, e a requisição voltou a existir.

A quarta é dimensionamento. A 400 mm o estúdio ampliava a peça e o avanço de 0,2
movia a seleção 1,16 na cena, para fora do quadro; com um metro a escala fica
perto de um. E com tubo de 45 mm de raio o mesmo canto rendia três juntas, porque
`detectarJuntas` declara raio de 20 mm para solda de tubo de quadro. O raio
voltou para 22 mm, dentro do contrato da função.

## Riscos e parada

`guarda:acervo` sai com código 1 quando o acervo está vazio, então a bicicleta
não pode sair antes de a moto entrar. Essa ordem é imposta por medida, não por
preferência.

O risco que obriga a parar é a peça de prova não conseguir reproduzir alguma
condição que a bicicleta oferece e que a guarda precisa. Se isso acontecer, a
guarda em questão está medindo algo que só existe naquele conteúdo, e a saída é
decidir se ela vira teste de unidade ou se deixa de existir — e não manter a
bicicleta por causa dela.

A moto é peça de acervo de verdade, com forma a julgar, então ela pode consumir
rodadas de modelagem sem relação com este plano. Se isso ameaçar o plano, a moto
vira plano próprio e este fecha com a peça de prova e o desacoplamento feitos.

## Fechamento

Preencher somente ao concluir ou cancelar.

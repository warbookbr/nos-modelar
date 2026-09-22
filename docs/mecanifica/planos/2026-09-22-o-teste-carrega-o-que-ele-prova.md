# O teste carrega o que ele prova

**Estado:** ativo

**Responsável:** Tiago (autoria) e a IA da sessão (implementação)

**Repositório e base:** `warbookbr/nos-mecanifica`, base `e9d9917a` na main.

## Problema observado

Dezesseis arquivos de teste, espalhados por `tools/oficina`,
`tools/mecanifica`, `tools/mcp` e `tools/modelagem`, carregam o material de que
precisam de `autoria-assistida/`, uma pasta de 3,3 MB e 500 arquivos que não
pertence a nenhum deles. O teste mora num lugar e o que ele mede mora em outro,
sem que nada ligue os dois além do caminho escrito dentro do teste.

É o mesmo defeito que o plano
[nada depende da bicicleta](encerrados/2026-09-17-nada-depende-da-bicicleta.md)
encontrou no acervo e a regra que ele deixou escrita já cobre este caso:
ferramenta se prova contra fixture que ela governa. Esses dezesseis não
cumprem.

**O núcleo não precisa dessas peças; um cubo basta.** `sonda-supercarro-1-0`
carrega doze peças para afirmar três coisas: que nenhuma aparece no catálogo
publicado, que o total dá 1428 vértices e 1434 faces, e que exportar a mesma
peça duas vezes produz texto idêntico. A terceira é a que importa, porque é o
determinismo do núcleo, e ela se prova com um cubo criado na linha de cima do
teste. As outras duas travam números de conteúdo, que é o que o plano da
bicicleta chamou de depender de propriedade que a peça tem por acaso.

Essas peças estão ali por acidente e não por necessidade. Elas foram rodadas de
modelagem de verdade, feitas para outra coisa; quando alguém precisou de um
objeto para exercitar o núcleo, usou o que estava por perto em vez de escrever
as três linhas que criam um cubo. O núcleo tem 32 operações, e as primitivas
`cubo`, `cilindro`, `esfera`, `cone` e `plano` produzem qualquer objeto de que
uma prova de comportamento precise.

Três ferramentas em `tools/modelagem` já ESCREVEM dentro de
`autoria-assistida/`, gerando material por código em vez de guardá-lo:
`gerar-canario-geometrico-p0.mjs`, `gerar-corpus-p0.mjs` e `formato-pacote.mjs`.
O padrão certo já existe no repositório e não foi aplicado aos outros.

## Resultado

Nenhum teste carrega material de `autoria-assistida/`, e a pasta deixa de
existir. Cada teste cria o que mede ou usa fixture que vive ao lado dele.

## O que sobra dela, medido

3,3 MB em 500 arquivos, divididos assim: `rascunhos-defeituosos` com 1,2 MB, dos
quais 93 arquivos de código e 28 de dados que são as peças carregadas pelos
testes; `avaliacao` com 944 KB em dois arquivos de dados; `experimentos` com
860 KB; `pacotes` com 164 KB e `alvos` com 52 KB, ambas geradas por ferramenta e
portanto refazíveis. Tirando o que os testes carregam e o que é regenerável,
sobram 58 arquivos de texto.

**E a maior parte dos 58 também não se salva.** Li os maiores. A maioria é
diário de iteração, do tipo "alarguei a estação em `z = -0,90` e a planta passou
de 13,1 para outro número", descrevendo ajuste numa peça que não existe mais,
num experimento encerrado. Isso é rastro de trabalho, não lição.

O que tem valor é o punhado que registra uma tentativa que FALHOU e por quê,
porque evita alguém tentar de novo. Os dois relatos de homologação do fluxo,
com 593 linhas somadas, são o caso claro: `HOMOLOGACAO-FLUXO-IA.md` aponta para
eles como evidência de que o fluxo foi exercitado ponta a ponta duas vezes.

Por isso a saída não é mover 58 arquivos para `historico/`. É ler os poucos que
registram uma conclusão e perguntar se ela já está escrita num relatório de lá.
Se está, o arquivo é cópia e sai. Se não está, a conclusão vira um parágrafo num
relatório existente, e não um arquivo novo. Mover tudo seria trocar uma pasta
que ninguém lê por uma pasta maior que ninguém lê.

## Medido na fatia 1 — quem depende da pasta

A contagem de dezesseis estava incompleta. Quem depende de `autoria-assistida/`
hoje são dezesseis testes de fora, dezessete testes que moram dentro dela, um
script do `package.json` e, fora dos testes, o servidor MCP em funcionamento.

Quatro testes só precisam de uma receita qualquer. `autoria-receitas`,
`autoria-ativa`, `autoria-receita` e `estudo-campo-revalidacao` importam
`eixo-guia.js` para provar publicação, revisão e revalidação; nenhuma
afirmação depende da forma do eixo. Trocam pela peça de prova.

Dois usam o nome só como texto. `caminho-confinado` monta um disco falso e usa
`autoria-assistida` como nome de pasta qualquer, e `caminho-procedural` a põe
na lista de pastas onde procura raiz antiga. Troca o nome no primeiro e tira
da lista no segundo.

Quatro são da calibração do crítico: `gerar-canario-geometrico-p0`,
`gerar-corpus-p0`, `validar-corpus-avaliacao` e `calibracao-critico-cli`. O
material é gerado por código e só é gravado dentro da pasta; muda o lugar de
gravação para junto da ferramenta.

Quatro são estudos de montagem inteiros, carregados por `carregar-estudo.mjs`:
`ensaio-ponta-a-ponta-dobradica`, `plataforma-procedural-campo-r10`,
`sonda-supercarro-1-0` e `contexto-montagem-estudo`. Provam montagem,
auditoria de pares e vistas. Viram fixture de montagem pequena ao lado do
teste, e travas de número de conteúdo, como os 1428 vértices, saem registradas.

Os dezessete testes internos provam experimentos encerrados (cage, sondas,
captura, percepção) cujo código mora na mesma pasta, e saem junto com ela. O
script `percepcao:n3:evidencias` é desse mesmo experimento.

O que o plano não sabia: `guias/` e `pacotes/` são dados em uso. O servidor MCP
lista os pacotes e o perfil de revisão lê e valida pacote a partir de
`autoria-assistida/pacotes`, por `tools/modelagem/formato-pacote.mjs`; os
comandos `preparar:modelagem`, `validar:modelagem`, `revisar:modelagem` e
`fechar:aceite:visual` também. `mcp.test` e `fechar-aceite-visual` testam esse
fluxo com os pacotes oficiais. Apagar a pasta quebra esse fluxo, e decidir se
ele continua vivo ou se muda de casa é decisão fora do escopo escrito.

## Filtro Agent-First

**REFATORAR.** Não há capacidade nova. O que muda é de que objeto a prova
depende, e isso baixa o custo de toda rodada futura pelo mesmo motivo já medido
na bicicleta: enquanto o material for conteúdo antigo, qualquer mexida nele
arrisca a suíte, e qualquer mexida na suíte arrisca o material. Adiar tem custo
crescente porque cada teste novo copia o padrão dos vizinhos.

Há um ganho adicional específico deste caso: 3,3 MB e 500 arquivos deixam de
ser carregados por clone e por sessão, e o que sobra dali passa a ser evidência
consultável em vez de dependência executável.

## Incluído

- ler, um por um, o que cada um dos dezesseis testes afirma de fato;
- substituir o material por primitiva criada dentro do próprio teste — cubo,
  cilindro, esfera — quando o que se prova é comportamento do núcleo, e por
  fixture ao lado do teste quando o que se prova é integração entre partes;
- apagar de `autoria-assistida/` o que deixar de ter consumidor executável;
- ler os documentos que registram conclusão e absorver a lição num relatório do
  histórico quando ela ainda não estiver lá;
- apagar a pasta.

## Excluído

- mover os 58 documentos para `historico/`. A lição é que se absorve, não o
  arquivo: relatório de iteração de uma peça apagada não vira evidência por
  mudar de pasta;
- um gate contra a pasta voltar. Ela deixa de existir, e gate contra nome de
  pasta que não existe protege de quê ainda não se sabe;
- mudar o que qualquer teste afirma. Se um teste trava número de conteúdo que
  não prova nada, ele perde a afirmação e isso é registrado; trocar afirmação
  por outra mais fraca sem dizer é regressão calada;
- mexer no núcleo ou em `tools/`, que acabaram de ser reorganizados.

## Gate de saída

1. `autoria-assistida/` não existe, e `grep` pelo nome em `tools/`, `src/`,
   `package.json` e configuração não acha nada;
2. os 32 gates verdes ao fim de cada fatia;
3. cada afirmação perdida está escrita neste plano, com o motivo;
4. cada lição absorvida aponta o relatório do histórico que passou a carregá-la.

## Fatias

1. **Ler os dezesseis.** Para cada um, o que ele afirma e qual parte da
   afirmação depende do conteúdo. A lista vai para este plano; sem ela, a
   substituição troca uma prova por outra sem ninguém perceber.
2. **Os que só precisam de um objeto qualquer.** Substituir por primitiva criada
   no próprio teste, começando pelos que provam determinismo e formato.
3. **Os de integração.** Fixture ao lado do teste, nomeada pela capacidade que
   ela exercita, como `tools/fixtures/acervo/peca-de-prova/` já é.
4. **Ler o que sobrou.** Os documentos que registram conclusão, um por um,
   perguntando se a lição já está no histórico. Absorver as que faltam.
5. **Apagar a pasta**, medindo o que sai.

## Riscos e parada

O risco que obriga parar é descobrir que alguma afirmação só é possível com
aquele conteúdo específico. Se acontecer, o conteúdo em questão vira fixture
nomeada e governada pelo teste, e não fica onde está: o que não pode continuar é
o teste depender de uma pasta que não é dele.

O risco de conveniência é este plano virar desculpa para apagar lição. A defesa
é a fatia 4 ser leitura de verdade, com cada conclusão que sobreviver apontando
onde passou a morar. Apagar sem essa passagem é perder o que o repositório
aprendeu pagando caro.

## Fechamento

Preencher somente ao concluir ou cancelar.

# Comece aqui

Esta página explica o Modelar a quem nunca o viu: o que ele é, para quem é, o
que já existe nele, como uma peça nasce e é aprovada e como se trabalha com ele
no dia a dia. Ela se lê em poucos minutos. Os termos próprios do projeto levam ao
documento onde cada um é definido, e a seção
[Palavras do projeto](#palavras-do-projeto), no fim, resume cada um em uma
frase.

## O que é o Modelar

O Modelar é uma oficina procedural em que agentes de IA criam, medem, conferem e
corrigem objetos 3D mecânicos, como veículos, eletrodomésticos, móveis e
máquinas. Procedural quer dizer que cada objeto é gerado por código: um arquivo
descreve, passo a passo e com as medidas em milímetro, como a geometria se
constrói, e rodar o mesmo arquivo dá sempre o mesmo resultado. Esse arquivo é a
[receita](modelar/usar/AUTORIA-DE-PECA.md#a-receita-da-tabela-à-malha), e o que ela gera é a
[peça](modelar/usar/AUTORIA-DE-PECA.md#peça). Um objeto de várias peças encaixadas é uma
[montagem](modelar/usar/AUTORIA-DE-PECA.md#montagem).

O repositório reúne o núcleo geométrico, que executa as operações de construção
sem saber que objeto está construindo, as receitas do acervo, a
[bancada](modelar/BANCADA-E-APRESENTACAO.md), que é a página 3D onde a peça é
inspecionada, e as ferramentas que medem e validam o resultado. Os agentes
escrevem as receitas e conferem o que saiu com números e imagens. A pessoa
decide o que modelar, escolhe entre opções de forma e aprova a forma olhando as
imagens.

## Para quem é

O Modelar é feito para ser operado por agentes de IA: as instruções, os
comandos e as verificações automáticas foram escritos para eles. A pessoa que
dirige o trabalho não precisa escrever código nem conhecer o núcleo. Ela
conversa com o agente, olha o que ele traz e decide. Quem quer mudar o próprio
projeto, como o núcleo, uma verificação ou a documentação, também trabalha por
um agente, dentro de um plano que a pessoa aprovou.

## O que já existe

O [acervo](#palavras-do-projeto), em `procedural/pecas/`, tem 54 peças:
27 veículos (carros, picapes, caminhões, ônibus, tratores, furgão, ambulância e
jipe), 8 móveis (balcões, uma mesa e poltronas), 5 eletrodomésticos (geladeira,
freezer, lava-louças, lavadora e secadora, micro-ondas), as 8 peças que montam
o avião, as 4 que montam o braço robótico e duas peças de prova, uma carenagem de chapa e um
suporte de tubo. Os 27 veículos e o avião foram aprovados pela pessoa, e as outras peças
passaram pelas verificações automáticas. Nenhuma peça é um modelo final para uso
fora do projeto: cada uma existe para provar uma capacidade do núcleo e pode
mudar ou sair sem aviso.

Há 7 [famílias](modelar/FAMILIAS-DE-OBJETOS.md) registradas, cada uma um código que
gera objetos parecidos a partir de poucos números: roda com pneu, dobradiça,
cilindro hidráulico, móvel de caixa, superfície aerodinâmica, aparelho de caixa
e cadeira. A família de aparelho de caixa, por exemplo, gera o forno elétrico,
o micro-ondas, a fritadeira de forno e a lava-louças compacta, cada um com as
suas medidas, sem receita escrita do zero.

A peça pronta pode ser exportada em STEP, o formato dos programas de CAD
(`npm run exportar:step`), e em OBJ com as partes nomeadas
(`npm run exportar:obj`). A cor de cada material (madeira, metal, tecido ou
liso) é uma imagem gerada por código, escolhida peça a peça na receita.

## Como uma peça nasce e é aprovada

Antes de qualquer geometria vem o
[alinhamento](modelar/usar/RODADA-DE-ALINHAMENTO-EXEMPLO.md): o agente pergunta à pessoa o que
o objeto faz, quais são as partes, em que ordem ele se monta, qual medida real
dá a escala, quais imagens servem de referência e o que reprovaria o resultado.
Quando há escolha de forma, ele desenha as opções lado a lado com a foto e
pergunta qual se parece mais. O que fica decidido é escrito na pasta da peça, em
`procedural/pecas/<nome>/`, e o resto do trabalho é cobrado contra esse registro.

Depois o agente escreve a receita, parte por parte, na ordem em que o objeto se
monta. Cada versão é medida por comandos: as partes se tocam onde deviam e só
ali, as folgas e encaixes ficam dentro do especificado, nenhuma parte ficou
solta e a malha pode ser exportada. Os comandos imprimem números e recusam o
que está fora, e a forma só vai adiante quando as medidas estão limpas.

Então entra o [crítico cego](modelar/usar/REFERENCIA-E-CRITICA-VISUAL.md#o-laço-do-crítico), um agente
separado que recebe só as imagens da peça e da referência, sem a receita, o
código ou a história da construção. Ele devolve uma nota de 0 a 10 e a lista de
defeitos que vê, como uma parte mais alta que a referência ou uma superfície
facetada. O agente que modelou corrige e chama o crítico de novo, numa nova
[rodada](modelar/usar/REFERENCIA-E-CRITICA-VISUAL.md#o-laço-do-crítico). A peça passa pelo crítico quando uma
rodada dá nota 8 ou mais sem nenhum defeito; se isso não acontece em 6 rodadas,
o agente para e a pessoa decide se continua. O crítico aponta defeito e nunca aprova.

Quem aprova a forma é a pessoa. Um objeto de várias partes, como o avião, é
modelado uma parte por vez, e cada parte vira uma peça. O agente mostra as vistas
da parte montada sobre as já prontas, as medidas e o veredito do crítico, e a parte só fica fixa
quando a pessoa diz que aceita. Se ela aceita com defeito em aberto, o aceite
fica gravado com o nome dela, a data e os defeitos. Só a pessoa reabre uma parte
já aceita. O caminho inteiro, da imagem à montagem, está em
[`FLUXO-DO-OBJETO.md`](modelar/usar/FLUXO-DO-OBJETO.md).

## Como trabalhar com um agente no dia a dia

A pessoa pede em linguagem comum: modelar um objeto novo a partir de uma foto,
corrigir uma peça que está errada, explicar o que uma peça tem, ou mudar uma
ferramenta do projeto. O agente começa por `npm run comecar`, que pergunta qual é
a tarefa e diz o que ele precisa ler e qual
[skill](#palavras-do-projeto) seguir. Cada tipo de tarefa tem um
[roteiro](modelar/roteiros/ROTEIROS.md), que diz o que ler e indica a skill, e a lista deles está em
[`ROTEIROS.md`](modelar/roteiros/ROTEIROS.md).

O agente devolve imagens da peça, as medidas que conferiu, o veredito do crítico
e um resumo curto do que fez, e diz o que depende da pessoa, com a recomendação
dele. A pessoa decide em quatro momentos: no alinhamento, quando responde às
perguntas e escolhe entre as opções de forma; ao fim de cada parte, quando
aceita ou pede correção; quando o laço do crítico chega ao limite; e quando uma
mudança no projeto pede um plano novo.

A pessoa também pode mexer na peça com a mão. Na bancada ela arrasta as juntas, os pontos
onde as partes se encontram, e salva o ajuste num arquivo; o agente lê esse
arquivo, reescreve a receita para chegar ao mesmo lugar e mede se chegou. O
procedimento está em
[`AJUSTE-DA-BANCADA.md`](modelar/usar/AJUSTE-DA-BANCADA.md).

## Como abrir a bancada

A bancada roda no próprio computador, com o Node instalado:

```bash
npm ci
npm run dev
```

Abra o endereço que o `npm run dev` mostra, em geral
`http://localhost:5173/nos-modelar/bancada.html`. Para carregar uma peça do
acervo, rode noutro terminal `npm run ativar:bancada -- <nome-da-peca>`, por
exemplo `npm run ativar:bancada -- furgao` (o nome é o da pasta da peça em
`procedural/pecas/`); a página aberta recarrega sozinha
com a peça. O procedimento completo está em
[`ATIVACAO-BANCADA-SESSAO-ATIVA.md`](modelar/usar/ATIVACAO-BANCADA-SESSAO-ATIVA.md).

## Onde estão as regras

As regras que valem para todo trabalho estão no
[`CLAUDE.md`](../CLAUDE.md), na raiz do repositório: o idioma, como escrever,
que forma só a pessoa aprova, o que pode e o que não pode entrar no repositório
e como se envia uma mudança. O [`AGENTS.md`](../AGENTS.md) aponta o mesmo
contrato para outros agentes. O resto das regras é conferido por verificações
automáticas, os [gates](modelar/INDEX.md#gates-completos), que rodam juntos com
`npm run gates` e recusam a mudança que fere uma regra, dizendo o motivo.

## Planos e backlog

Mudança no projeto segue um plano: um documento curto com o problema, o
resultado esperado, o que entra e o que fica fora, as condições que não podem
mudar e a prova de que terminou. Só existe um
[plano ativo](modelar/planos/README.md) por vez, e a pessoa decide
qual plano entra e quando. Os planos ficam em
[`docs/modelar/planos/`](modelar/planos/README.md), cujo índice diz qual está
ativo e qual vem depois; os fechados vão para a pasta `encerrados/` e ficam como
registro, sem mandar em trabalho novo. Uma correção pontual, que devolve o que o
código e a documentação já prometem, dispensa plano.

O [backlog](modelar/planos/BACKLOG.md), em
[`BACKLOG.md`](modelar/planos/BACKLOG.md), lista ideias candidatas. Nenhum item
dele autoriza implementação: uma ideia só vira trabalho quando entra num plano
ativo.

## O que o projeto não faz

O Modelar não é um jogo, um editor 3D para modelar à mão nem uma biblioteca de
modelos prontos para produto. A bancada é a única aplicação, e a
interface de jogo, a oficina para uso humano e o som saíram do repositório. Não
há material físico completo (o PBR), que, como paleta nova, só entra por plano.
A colisão de uma peça que se move, como a porta de um armário na dobradiça, é
conferida em posições amostradas do movimento, e a que começa e termina entre
duas amostras não é vista.
O núcleo não sabe o que é um veículo nem qualquer outro tipo de objeto: o que é
próprio de uma família fica na família. Imagem de referência com marca,
logotipo ou nome de fabricante não entra no repositório, e imagem gerada por IA
serve para mostrar o caráter da forma e nunca como fonte de medida.

## Palavras do projeto

- Acervo: o conjunto das peças versionadas em `procedural/pecas/`, que as
  verificações regeneram e comparam a cada mudança.
- Alinhamento: a conversa antes de modelar em que a pessoa decide objeto,
  partes, escala, referências e o que reprova ([exemplo](modelar/usar/RODADA-DE-ALINHAMENTO-EXEMPLO.md)).
- Backlog: a lista de ideias candidatas em
  [`BACKLOG.md`](modelar/planos/BACKLOG.md), que não autoriza trabalho sozinha.
- Bancada: a página 3D onde a peça é inspecionada, medida e ajustada à mão
  ([arquitetura](modelar/BANCADA-E-APRESENTACAO.md)).
- Crítico cego: o agente que recebe só as imagens da peça e da referência e
  devolve nota e defeitos ([o laço do crítico](modelar/usar/REFERENCIA-E-CRITICA-VISUAL.md#o-laço-do-crítico)).
- Família: um código que gera objetos parecidos a partir de poucos números
  ([famílias de objetos](modelar/FAMILIAS-DE-OBJETOS.md)).
- Gate: uma verificação automática que recusa a mudança que fere uma regra,
  rodada por `npm run gates` ([lista](modelar/INDEX.md#gates-completos)).
- Montagem: o objeto feito de várias peças encaixadas
  ([peça e montagem](modelar/usar/AUTORIA-DE-PECA.md#montagem)).
- Peça: o objeto geométrico que uma receita gera, com as partes nomeadas
  ([peça](modelar/usar/AUTORIA-DE-PECA.md#peça)).
- Plano ativo: o único plano em execução, que autoriza a mudança no projeto
  ([planos](modelar/planos/README.md)).
- Receita: o arquivo de código que descreve, com as medidas, como a peça se
  constrói ([a receita](modelar/usar/AUTORIA-DE-PECA.md#a-receita-da-tabela-à-malha)).
- Rodada: uma volta de correção da peça seguida de um novo julgamento do
  crítico; o laço é a sequência de rodadas de uma peça ([o laço do crítico](modelar/usar/REFERENCIA-E-CRITICA-VISUAL.md#o-laço-do-crítico)).
- Roteiro: o que o agente lê para um tipo de tarefa, entregue por
  `npm run comecar` ([roteiros](modelar/roteiros/ROTEIROS.md)).
- Skill: um procedimento escrito que o agente segue para uma tarefa, guardado
  em `.claude/skills/`.

Para seguir adiante, quem vai mudar o projeto lê
[`docs/modelar/INDEX.md`](modelar/INDEX.md), e o inventário de todos os arquivos
está em [`docs/MAPA.md`](MAPA.md).

# Comece aqui

Esta página explica o Modelar a quem nunca o viu: o que ele é, para quem é, o
que já existe nele, como uma peça nasce e é aprovada e como se trabalha com ele
no dia a dia. Ela se lê em poucos minutos. Os termos próprios do projeto levam a
um link para o [glossário](modelar/GLOSSARIO.md), onde cada um tem uma
definição curta.

## O que é o Modelar

O Modelar é uma oficina procedural em que agentes de IA criam, medem, conferem e
corrigem objetos 3D mecânicos, como veículos, eletrodomésticos, móveis e
máquinas. Procedural quer dizer que cada objeto é gerado por código: um arquivo
descreve, passo a passo e com as medidas em milímetro, como a geometria se
constrói, e rodar o mesmo arquivo dá sempre o mesmo resultado. Esse arquivo é a
[receita](modelar/GLOSSARIO.md#receita), e o que ela gera é a
[peça](modelar/GLOSSARIO.md#peça). Um objeto de várias peças encaixadas é uma
[montagem](modelar/GLOSSARIO.md#montagem).

O repositório reúne o núcleo geométrico, que executa as operações de construção
sem saber que objeto está construindo, as receitas do acervo, a
[bancada](modelar/GLOSSARIO.md#bancada), que é a página 3D onde a peça é
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

O [acervo](modelar/GLOSSARIO.md#acervo), em `procedural/pecas/`, tem 54 peças:
27 veículos (carros, picapes, caminhões, ônibus, tratores, furgão, ambulância e
jipe), 8 móveis (balcões, uma mesa e poltronas), 5 eletrodomésticos (geladeira,
freezer, lava-louças, lavadora e secadora, micro-ondas), o avião em 8 partes, o
braço robótico em 4 partes e duas peças de prova, uma carenagem de chapa e um
suporte de tubo. Os 27 veículos e o avião foram aprovados pela pessoa. Nenhuma
peça é base de produto: cada uma existe para provar uma capacidade do núcleo e
pode mudar ou sair sem aviso.

Há 7 [famílias](modelar/GLOSSARIO.md#família) registradas, cada uma um código que
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
[alinhamento](modelar/GLOSSARIO.md#alinhamento): o agente pergunta à pessoa o que
o objeto faz, quais são as partes, em que ordem ele se monta, qual medida real
dá a escala, quais imagens servem de referência e o que reprovaria o resultado.
Quando há escolha de forma, ele desenha as opções lado a lado com a foto e
pergunta qual se parece mais. O que fica decidido é escrito na pasta da peça, e
o resto do trabalho é cobrado contra esse registro.

Depois o agente escreve a receita, parte por parte, na ordem em que o objeto se
monta. Cada versão é medida por comandos: as partes se tocam onde deviam e só
ali, as folgas e encaixes ficam dentro do especificado, nenhuma parte ficou
solta e a malha pode ser exportada. Os comandos imprimem números e recusam o
que está fora, e a forma só vai adiante quando as medidas estão limpas.

Então entra o [crítico cego](modelar/GLOSSARIO.md#crítico-cego), um agente
separado que recebe só as imagens da peça e da referência, sem a receita, o
código ou a história da construção. Ele devolve uma nota de 0 a 10 e a lista de
defeitos que vê, como uma parte mais alta que a referência ou uma superfície
facetada. O agente que modelou corrige e chama o crítico de novo, numa nova
[rodada](modelar/GLOSSARIO.md#rodada). A rodada fecha com nota 8 ou mais e
nenhum defeito, e o laço de uma peça para em 6 rodadas; passar disso é decisão
da pessoa. O crítico aponta defeito e nunca aprova.

Quem aprova a forma é a pessoa. O agente mostra as vistas da peça montada sobre
as partes já prontas, as medidas e o veredito do crítico, e a parte só fica fixa
quando a pessoa diz que aceita. Se ela aceita com defeito em aberto, o aceite
fica gravado com o nome dela, a data e os defeitos. Só a pessoa reabre uma parte
já aceita. O caminho inteiro, da imagem à montagem, está em
[`FLUXO-DO-OBJETO.md`](modelar/usar/FLUXO-DO-OBJETO.md).

## Como trabalhar com um agente no dia a dia

A pessoa pede em linguagem comum: modelar um objeto novo a partir de uma foto,
corrigir uma peça que está errada, explicar o que uma peça tem, ou mudar uma
ferramenta do projeto. O agente começa por `npm run comecar`, que pergunta qual é
a tarefa e diz o que ele precisa ler e qual
[skill](modelar/GLOSSARIO.md#skill) seguir. Cada tipo de tarefa tem um
[roteiro](modelar/GLOSSARIO.md#roteiro) de leitura, e a lista deles está em
[`ROTEIROS.md`](modelar/roteiros/ROTEIROS.md).

O agente devolve imagens da peça, as medidas que conferiu, o veredito do crítico
e um resumo curto do que fez, e diz o que depende da pessoa, com a recomendação
dele. A pessoa decide em quatro momentos: no alinhamento, quando responde às
perguntas e escolhe entre as opções de forma; ao fim de cada parte, quando
aceita ou pede correção; quando o laço do crítico chega ao limite; e quando uma
mudança no projeto pede um plano novo.

A pessoa também pode mexer na peça com a mão. Na bancada ela arrasta as juntas
onde as partes se encontram e salva o ajuste num arquivo; o agente lê esse
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
exemplo `npm run ativar:bancada -- furgao`; a página aberta recarrega sozinha
com a peça. O procedimento completo está em
[`ATIVACAO-BANCADA-SESSAO-ATIVA.md`](modelar/usar/ATIVACAO-BANCADA-SESSAO-ATIVA.md).

## Onde estão as regras

As regras que valem para todo trabalho estão no
[`CLAUDE.md`](../CLAUDE.md), na raiz do repositório: o idioma, como escrever,
que forma só a pessoa aprova, o que pode e o que não pode entrar no repositório
e como se envia uma mudança. O [`AGENTS.md`](../AGENTS.md) aponta o mesmo
contrato para outros agentes. O resto das regras é conferido por verificações
automáticas, os [gates](modelar/GLOSSARIO.md#gate), que rodam juntos com
`npm run gates` e recusam a mudança que fere uma regra, dizendo o motivo.

## Planos e backlog

Mudança no projeto segue um plano: um documento curto com o problema, o
resultado esperado, o que entra e o que fica fora, as condições que não podem
mudar e a prova de que terminou. Só existe um
[plano ativo](modelar/GLOSSARIO.md#plano-ativo) por vez, e a pessoa decide
qual plano entra e quando. Os planos ficam em
[`docs/modelar/planos/`](modelar/planos/README.md), cujo índice diz qual está
ativo e qual vem depois; os fechados vão para a pasta `encerrados/` e ficam como
registro, sem mandar em trabalho novo. Uma correção pontual, que devolve o que o
código e a documentação já prometem, dispensa plano.

O [backlog](modelar/GLOSSARIO.md#backlog), em
[`BACKLOG.md`](modelar/planos/BACKLOG.md), lista ideias candidatas. Nenhum item
dele autoriza implementação: uma ideia só vira trabalho quando entra num plano
ativo.

## O que o projeto não faz

O Modelar não é um jogo, um editor 3D para modelar à mão nem uma biblioteca de
modelos prontos para produto. A bancada é a única aplicação, e a
interface de jogo, a oficina para uso humano e o som saíram do repositório. Não
há hoje encaixe automático entre peças, verificação de colisão em movimento nem
material físico completo (o PBR), e PBR e paleta nova só entram por plano.
O núcleo não sabe o que é um veículo nem qualquer outro tipo de objeto: o que é
próprio de uma família fica na família. Imagem de referência com marca,
logotipo ou nome de fabricante não entra no repositório, e imagem gerada por IA
serve para mostrar o caráter da forma e nunca como fonte de medida.

Para seguir adiante, quem vai mudar o projeto lê
[`docs/modelar/INDEX.md`](modelar/INDEX.md), e o inventário de todos os arquivos
está em [`docs/MAPA.md`](MAPA.md).

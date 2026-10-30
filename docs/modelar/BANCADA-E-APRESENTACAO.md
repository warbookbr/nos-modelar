# Bancada e apresentação

## Papel atual

`bancada.html` é a única aplicação publicada deste repositório, e ela tem dois
papéis que convivem. Para a IA, é superfície de inspeção: abre uma peça, mede o
neutro, mostra vistas canônicas e registra uma URL reproduzível. Para a pessoa,
é editor: ela abre a peça, mexe onde quiser, salva, e o que sai dali volta para
a IA como medida.

O segundo papel é decisão de produto, e ele nasceu de um limite medido. A
bancada exigia que todo gesto caísse num parâmetro nomeado no instante do
arrasto, e num quadro em treliça nenhum número empurra um tubo inteiro sem
descolar as juntas: a seta de z de `balancoInferiorEsq` movia o centro da caixa
0,0126 e fazia a parte crescer 0,0252, o dobro exato, porque uma ponta estava
presa e a outra esticava. O gesto que a pessoa quer fazer não cabe no parâmetro
no momento em que ela o faz. Os dois momentos foram separados: a pessoa desenha
livremente, e traduzir o desenho em receita organizada virou uma rodada com dono,
com tempo de perguntar o que ficou ambíguo.

## Os dois lados e a fronteira entre eles

O código vive em dois lugares, e a separação é conferida por gate.

`src/bancada/` é o que só existe para a pessoa e para o navegador: o modo de
edição de malha, os punhos de junta, os gizmos de seta, o painel de referências,
as preferências de cena e o salvamento. Nada disso é importado por quem roda em
terminal.

`src/autoria/` é o que a IA usa sem navegador nenhum. `topologia-da-malha.js`
faz extrudar, duplicar, apagar, criar face, girar e escalar sobre a malha neutra,
sem Three.js. `alvo-do-ajuste.js` escreve e confere o alvo. `ajuste-de-junta.js`
deforma por junta. `descricao-do-gesto.js` classifica o que foi feito.
`mapa-parte-passo.js` liga parte a passo da receita. `origem-de-parametro.js`
cobra que parâmetro novo diga de onde veio.

`npm run bancada:fronteira:check` proíbe `src/autoria/`, `tools/modelar/`,
`tools/mcp/` e `tools/autoria/` de importarem `src/bancada/`. Sem essa régua, o
motor procedural passaria a exigir Three.js, `document` e `window` para rodar, e
o CLI, o MCP e os testes headless parariam por causa de uma interface. Quando um
módulo de `src/bancada/` for preciso dos dois lados, a saída não é abrir exceção:
é tirá-lo de lá, como já aconteceu com o catálogo de peças e as cores de
auditoria.

## Como a bancada se monta

O estado da tela mora num lugar só, `src/bancada/estado/estado-central.js`. É um
objeto de chaves de primeiro nível (a vista em vigor, a peça em cena, a
fotografia da seleção, o status da sessão, o modo das juntas, a visão
escolhida e as outras), e quem muda uma coisa escreve só a chave que mudou. O
painel que desenha uma coisa assina as chaves que lê e é avisado, na hora e na
ordem das assinaturas, quando o valor delas muda. Escrever o mesmo valor não
avisa ninguém; a seleção é um objeto novo a cada mudança do controlador das
partes, e por isso redesenha toda vez.

Cada área da tela é um componente em `src/bancada/componentes/`: a barra
superior com as janelas Abrir, Controles e Estado (`barra-superior.js`, com
`menu-abrir.js`, `menu-controles.js` e `menu-estado.js`), a fileira das vistas
com a projeção e o seletor de visão (`barra-das-vistas.js`), o painel de
componentes (`painel-componentes.js`), o painel de inspeção com as abas
(`painel-inspecao.js` e `aba-anotacoes.js`), o rodapé das juntas
(`rodape-juntas.js`), a oferta da sessão ativa (`sessao-ativa.js`), a régua de
escala (`referencia-metrica.js`), o teclado (`teclado.js`), o endereço da página
(`endereco.js`), os avisos (`avisos.js`), a caixa da visão sobre a cena
(`caixa-da-visao.js`), a ponte da captura automática (`ponte-da-captura.js`), o
tema (`tema.js`), a busca de comandos (`busca-de-comandos.js`), os painéis do
tema (`paineis-do-tema.js`) e os componentes do tema Foco descritos abaixo. `elementos-da-pagina.js` é o único lugar que procura
elementos, e entrega a cada componente só o grupo dele. A ponte
`window.__mecanificaBancada` é um contrato fixo: as chaves dela estão listadas
em `CHAVES_DA_PONTE`, e o teste do componente cobra que nenhuma suma.

O que não é tela fica em módulos que não tocam a página. A peça em cena, com o
controlador das partes, a seleção por clique, os enquadramentos e o estado
escrito na URL, mora em `cena/peca-em-cena.js`; o ajuste por junta, a edição de
malha, o desfazer e o alvo do ajuste, em `cena/edicao-da-peca.js`; a projeção,
a grade, a visão e a câmera restaurada da URL, em `cena/vista-da-cena.js`; a
imagem de referência na cena, em `referencias/imagem-na-cena.js`; e de onde vem
a peça (a sessão ativa, o acervo, o catálogo e a entrega em espera), em
`sessao/sessao-da-bancada.js`. O `main.js` só monta essas peças, na mesma ordem
da subida de antes, porque a ordem em que os objetos entram na cena e os
ouvintes se registram decide a imagem e quem responde primeiro a uma tecla.

`componentes/fronteira-da-pagina.test.js` cobra a fronteira: `main.js` e os
módulos sem tela não procuram elemento, não ouvem a janela, não leem o endereço
e não pedem quadro ao navegador. Os componentes são testados sobre uma página
falsa, `componentes/dom-de-teste.js`, sem navegador.

## O sistema visual e os temas

A aparência da bancada sai de um arquivo só, `src/bancada/sistema-visual.css`,
com as variáveis de espaço (uma grade de 4 e 8 pixels, mais o meio passo de 2),
de texto (uma família, três tamanhos e algarismos de largura fixa para os
números), de cor (cinzas neutros, um destaque, e o erro e o acerto só para
mensagens) e de forma (raio, traço, sombra e altura de controle). Há dois
conjuntos com os mesmos nomes: o claro, tirado da proposta B e usado pelos
temas Foco e Revisão, e o escuro, tirado da proposta A e usado pelo tema
Bancada. A folha de estilo, `styles.css`, não escreve cor, tamanho de fonte nem
espaçamento: `src/bancada/estilo/sistema-visual.test.js` lê cada folha da
bancada e reprova a declaração que escapar das variáveis, e roda com os outros
testes da bancada.

Um tema é uma declaração em `src/bancada/temas/temas.js`, e não código. Ele diz
o conjunto de cores (`cores`), a arrumação da folha de estilo (`arrumacao`, hoje
`foco` ou `classica`), o lugar de cada componente móvel (`lugares`, do nome em
`data-movel` na página para o nome em `data-lugar`), o texto dos controles que
mudam de nome (`rotulos`, pelo `data-rotulo`), os painéis que abrem sobre a cena
com a largura de cada um (`paineis`) e a cena 3D que ele pede (`cena`: o fundo, a
cor da grade, a grade esmaecida, a sombra suave e a cor do contorno da seleção,
com as cores escritas como o nome da variável do sistema visual). O componente
`componentes/tema.js` lê a declaração e escreve `data-tema`, `data-cores` e
`data-arrumacao` na raiz da página, leva cada componente para o lugar do tema e
o devolve para casa quando o tema seguinte não o cita, troca os rótulos e
entrega a cena ao ambiente. A escolha fica no estado central (`tema`), guardada
como preferência local, e a pessoa a faz na janela Controles e na busca de
comandos. Tema novo declara esses campos; precisa de CSS só se pedir uma
arrumação nova, e então escreve as regras dela sob
`:root[data-arrumacao="<nome>"]`.

O Foco é o tema padrão. A cena ocupa a tela inteira, e os controles flutuam:
no alto, o grupo da peça (a árvore, o nome e a sessão, Abrir e Editar), a barra
da cena (projeção, visão, enquadrar e a caixa da cena com a grade, o chão e a
explosão) e o grupo da direita (a busca de comandos e as janelas Controles e
Estado, e o botão dos detalhes); o cubo de orientação (`cubo-de-orientacao.js`)
no lugar das nove vistas em botão, com faces que levam à vista; a árvore das
partes como gaveta à esquerda, com isolar e ocultar por linha e sem contagem de
faces; o cartão da seleção (`cartao-da-selecao.js`) ao lado da parte, com as
medidas, as ações e "Detalhes", que abre o painel da direita (Seleção,
Referência e Notas); a barra do modo de edição (`barra-de-edicao.js`), com
juntas e malha, desfazer, descartar e o rodapé do ajuste; e a barra de estado
(`barra-de-estado.js`), com a dica do gesto, a seleção, a escala, a unidade e a
peça. A busca de comandos (`busca-de-comandos.js`) abre com `Ctrl+K` em
qualquer tema. Os painéis abertos são do componente `paineis-do-tema.js`: abrir
um painel que deixaria a cena com menos de 70% da largura recolhe o outro, e
com as larguras do Foco os dois só cabem juntos a partir de 1920 pixels. A cena
do Foco tem o fundo claro do sistema visual, a grade que some antes da borda, a
sombra suave no chão e o contorno da seleção na borda da peça no lugar da tinta
verde (`cena/cenario-do-tema.js` e `cena/contorno-da-selecao.js`). Os temas
Bancada e Revisão usam por enquanto a arrumação de antes dos temas, com as cores
do conjunto deles, e a cena de antes.

A captura automática não herda o tema: a auditoria esconde tudo o que não é a
cena, e a cena volta ao fundo, à luz e à falta de grade, chão, sombra e contorno
da auditoria, então as imagens das guardas e do pacote do crítico saem iguais
em qualquer tema.

## As visões de conferência

O controle "Visão", na barra da cena do Foco e no fim da fileira das vistas na
arrumação clássica, troca o jeito de desenhar a
mesma peça, com uma tecla para cada visão, que o menu Controles deixa trocar: a
sólida (`O`), o arame que esconde o que fica atrás (`M`), o raio X (`Shift+M`), a
curvatura (`K`), a zebra (`B`) e a luz rasante (`J`). A escolha volta na próxima
vez que a página abre, vale depois de trocar de peça, de arrastar uma junta e de
operar a malha, e convive com a seleção, o contexto, o isolamento e a explosão:
a parte escolhida não ganha o verde do destaque nessas três últimas visões,
porque ele pintaria por cima da cor que elas medem, e a seleção se lê pelo
fantasma das outras partes. As visões moram em `src/bancada/visoes/`, uma por
arquivo, e não tocam a página: a caixa pequena que aparece sobre a cena com a
legenda ou o controle de cada uma é o componente `caixa-da-visao.js`, que também
lhes dá a soltura do ponteiro e o relógio de quadros. Voltar para a sólida
devolve os materiais, as luzes e a sombra da cena como estavam.

A curvatura pinta em cada vértice a curvatura média que o crítico recebe nas
vistas obrigatórias da lataria, com a mesma conta, a mesma escala, as mesmas
cores e a mesma faixa ocre junto dos vincos declarados
(`src/autoria/curvatura-da-lataria.js`, sobre os triângulos do estado neutro, e
não sobre os da cena): vermelho é abaulado, azul é afundado, e as duas saturam
na escala que a legenda escreve; o ocre marca a lataria a até 40 mm dos vincos
que a forma desenha, fora da escala, onde a cor não mede defeito; o cinza claro
é peça de borda e o cinza escuro é lataria sem dado, junto da borda livre e das
dobras vivas. A peça que não declara lataria tem a curvatura da peça inteira, e
a legenda diz isso. A conta corre fora do quadro da cena e se refaz quando o
ponteiro solta depois de um arrasto de junta, de um movimento de vértice ou de
uma operação de malha; durante o arrasto a peça fica com a cor da conta anterior.
Na carenagem de prova, de 34 mil vértices, ela leva cerca de 0,3 s a cada edição
e ocupa a cena por menos de 0,06 s.

A zebra desenha listras pelo reflexo do olhar na superfície, como a zebra das
vistas do Blender: elas andam quando a câmera gira, saem lisas e contínuas na
chapa boa e se entortam no amassado e na quina que ondula. A caixa da zebra
ajusta a largura das listras, que parte de 4,5 graus, a do Blender.

A luz rasante apaga a luz do estúdio e acende um sol baixo sobre o plano da
imagem, com sombra, sobre a peça em material fosco, com o brilho das imagens de
luz rasante do Blender: a superfície a 10 graus da luz sai com 0,2 de brilho
linear. A luz acompanha a câmera, então girar a peça deixa a luz rasante para o
lado que se vê. A direção e a altura começam pelas que deixam ler melhor uma
inclinação pequena no que a câmera vê, sem contar o que fica na sombra e
descontando o que estoura no branco (`escolherLuz`, em
`visoes/azimute-da-luz.js`). A altura é a de 10 graus do Blender quando a peça
encara a câmera, como a chapa vista de cima, e sobe quando ela se inclina para
longe do plano da imagem, como na vista de três quartos, em que a 10 graus a luz
chegava de frente à lateral da carenagem de prova e a estourava. A caixa da luz
rasante muda a direção, mantendo a altura, ou escolhe as duas de novo para a
vista do momento. No amassado da peça de prova com vinco vista de cima, a luz
escolhida corre ao longo da dobra e dá o contraste da melhor imagem do Blender
naquela região, três vezes o da direção que a bancada escolhia antes.

A captura automática não herda a visão da pessoa: a ponte da captura suspende o
seletor durante a auditoria, e as imagens das guardas e do pacote do crítico
saem na sólida.

## O laço: desenhar, salvar, ler, absorver

A pessoa seleciona uma parte e aperta `G` para movê-la como corpo, ou `Tab` para
entrar no modo de edição, onde `1`, `2` e `3` trocam entre vértice, aresta e
face, `L` pega a ilha sob o ponteiro, o gizmo move pelo arrasto, `Ctrl` gruda no
vértice mais próximo, e `E`, `Shift+D`, `X`, `F`, `R` e `S` mudam a malha.
`Ctrl+Z` desfaz um gesto por vez e para no estado que veio do arquivo.

Quando a malha deixa de ser igual à do arquivo, o botão de salvar aparece e baixa
um `ajuste-<peça>.json`. Ele guarda, por parte, os dois cantos da caixa, a nuvem
canônica de pontos, quantas faces a parte tem, de qual receita a peça veio, as
juntas puxadas, e a descrição do gesto. Não guarda id de vértice, id de face,
índice de array nem posição de passo: a identidade ali é o nome da parte.

A descrição do gesto é calculada na bancada, no instante do salvamento, e isso é
arquitetura e não conveniência. Ali as duas malhas ainda têm os mesmos vértices.
Fora dali só existem duas nuvens de pontos, e descobrir qual ponto virou qual por
posição falha quando o movimento tem o tamanho do espaçamento entre pontos: no
tubo do selim da bicicleta os pontos ficam a 5,9 mm um do outro, e num gesto de
6 mm o pareamento por ordem lexicográfica atribuiu 422 mm de movimento e o
pareamento por menor distância atribuiu 32,6 mm.

Do outro lado, `npm run descrever:gesto` diz por parte se o movimento foi
translação, rotação em torno de um eixo de coordenada, escala, esticão com uma
ponta presa, dobra ou nenhum desses, e aponta o passo da receita que constrói
aquela parte. `npm run absorver` mede se a receita reescrita chega onde a pessoa
deixou a peça, com tolerância de meio milímetro. A skill que conduz a tradução é
`absorver-ajuste-da-bancada`, e o procedimento está em
[`AJUSTE-DA-BANCADA.md`](./usar/AJUSTE-DA-BANCADA.md).

A bancada nunca escreve receita. Ela salva medida, e quem escreve receita é quem
escreve receita.

## Direção para sistemas compostos

Quando montagens recursivas existirem, a bancada deve continuar sendo a camada
visual de inspeção da IA. Ela não deve virar a fonte de verdade da composição.

O contexto de inspeção precisa separar:

1. **alvo de edição** — entidade que pode ser alterada;
2. **contexto visual** — entidades mostradas somente para comparação;
3. **dependências afetadas** — relações e montagens que precisam ser
   revalidadas;
4. **vistas e medições obrigatórias** — prova mínima da tarefa.

A IA deve conseguir pedir contextos como:

```text
somente a roda
roda + cubo
roda + eixo
capô + dobradiças
pistão + biela + virabrequim
motor + cofre do motor
suspensão + roda + caixa de roda
```

Mostrar apenas roda e eixo não pode apagar o fato de que ambos pertencem a
montagens maiores. Isolamento visual reduz o que aparece na imagem; não remove
relações, dependências nem obrigações de validação.

A seleção futura deve aceitar peça, montagem, parte interna, subárvore e conjunto
arbitrário de entidades relacionadas, sempre por identidade semântica estável.

## Retorno visual para a IA

Use as quatro vistas canônicas quando a tarefa exigir revisão. A IA deve ler os
PNGs e conferir:

- enquadramento;
- cortes acidentais;
- legibilidade;
- proporção;
- identidade das partes;
- detalhes escondidos;
- coerência com referências visuais.

`npm run bancada` fotografa sem a interface desde 2026-09-23: a imagem é para
ler a peça, e com painéis, cabeçalho, piso e grade a peça ficava numa faixa
estreita no meio. Quem mexe na própria interface usa `npm run bancada:tela`,
que fotografa a tela como a pessoa a vê.

`porteiro` verifica abertura, erros de página e quadro degenerado.
`revisar:modelagem` conserva tentativas e revisões sem criação manual de
evidência.

Para sistemas compostos, a revisão visual precisa ocorrer em mais de uma escala:

- peça isolada;
- interfaces importantes em pares ou pequenos conjuntos;
- montagem local;
- contexto maior quando proporção ou interferência depender dele.

Uma imagem bonita não prova encaixe. Vistas complementam medidas de dimensão,
centro, eixo, folga, contato e interferência.

## Relação com medição e validação

A bancada mostra. Outros serviços medem e validam.

Ela deve receber e representar diagnósticos estruturados, por exemplo:

```text
alvo: aro-dianteiro
relação: fixação-no-cubo
estado: inválida
causa: centros desalinhados
medida: 2.4 mm
```

A IA precisa conseguir ligar o diagnóstico numérico ao componente visível sem
procurar por UUID, índice de face ou posição casual.

## Limites atuais

A bancada ainda não:

- persiste montagem;
- deriva contexto de um mapa de dependências;
- resolve encaixes;
- valida movimento ou espaço varrido;
- distingue formalmente alvo editável de contexto somente leitura;
- edita mais de uma peça por vez.

Ela também não publica alteração de receita, e isso não é limite a vencer: é a
separação que faz o laço funcionar.

Do vocabulário de modelagem poligonal, ficaram de fora subdivisão, bisel, loop
cut, proportional editing e modificadores.

O visor legado resolve o import bare `earcut` por import map também nos
servidores estáticos de `porteiro`, `criar`, `peca` e `gabarito`. Uma regressão
nessa resolução deve ser corrigida na infraestrutura, nunca na câmera ou peça.

## Critério de saída atual

Uma revisão de peça só é aceita depois de passar:

- execução e integridade;
- identidade semântica;
- medições aplicáveis;
- gates de câmera e portas;
- leitura visual das vistas exigidas;
- comparação com a revisão anterior, quando houver.

Quando montagens persistidas existirem, o critério também deverá exigir
revalidação das relações e dos dependentes afetados. Essa capacidade ainda não
está implementada.

A definição ampla está em [`AUTORIA-IA.md`](AUTORIA-IA.md), e a direção das
montagens em [`MONTAGENS-SEMANTICAS.md`](./usar/MONTAGENS-SEMANTICAS.md).

`--arame` desenha a malha por cima da peça sólida, e as arestas que ficam atrás
somem; `--raio-x` desenha a malha transparente, com as arestas de trás à vista.
O opaco responde como é a malha da superfície que se vê, e o raio X o que está
escondido do outro lado. O pacote de `vistas:critica` leva as duas.

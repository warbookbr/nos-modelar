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

`npm run bancada:fronteira:check` proíbe `src/autoria/`, `tools/mecanifica/`,
`tools/mcp/` e `tools/autoria/` de importarem `src/bancada/`. Sem essa régua, o
motor procedural passaria a exigir Three.js, `document` e `window` para rodar, e
o CLI, o MCP e os testes headless parariam por causa de uma interface. Quando um
módulo de `src/bancada/` for preciso dos dois lados, a saída não é abrir exceção:
é tirá-lo de lá, como já aconteceu com o catálogo de peças e as cores de
auditoria.

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

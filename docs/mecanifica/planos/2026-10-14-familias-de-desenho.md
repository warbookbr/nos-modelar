# As famílias de desenho

**Estado:** ativo

**Responsável:** Claude, com o aceite da pessoa

**Repositório e base:** `warbookbr/nos-mecanifica`, branch da sessão sobre a `main`

## Problema observado

O plano do [desenho sem referência](encerrados/2026-10-13-desenho-sem-referencia.md)
mostrou que a IA desenha uma vista por partes e relações com o módulo
`modulos/desenho-por-restricoes`, e que o que limita o acerto é a proporção que ela
recebe ou inventa, e não a forma de desenhar: nas duas provas, o desenho por
restrições e o por coordenadas erraram nos mesmos lugares, e só na correção as
restrições ganharam. Hoje cada desenho começa do zero, e o que a IA sabe da
proporção de uma classe de objeto é o conhecimento genérico dela.

A pessoa propôs em 2026-10-14 desenhar a partir da imagem de referência, para o
desenho sair certo, e guardar o desenho como código reutilizável, como as primitivas
2.0, mas para o desenho; e organizar a esteira inteira do objeto: referência,
desenho, esboço, receita no núcleo.

## Resultado

Uma biblioteca de peças de desenho (arco de roda com aro, cápsula, flange com cubo,
anel, garfo, rampa com ombro e as que as referências pedirem) e de famílias de
desenho (o objeto de uma classe, montado com as peças, com a faixa de proporção de
cada parâmetro), escritas no formato de restrições, cada uma ajustada a referências
que já têm contorno até a razão interseção/união passar de um mínimo combinado com
a pessoa. Com ela, um objeto novo da mesma classe sai de uma família com os
parâmetros dele, e um objeto de classe nova sai das peças.

## Filtro Agent-First

O contorno da imagem, a prancha, o módulo de desenho e o crítico são usados direto.
A família de desenho segue a régua das famílias 3D (`procedural/familias/`):
parâmetros com faixa, perfis nomeados, prova nos extremos e no ponto médio, e
aprovação nas três camadas; o contrato próprio dela sai da primeira fatia. Peça e
família ficam no formato salvo do módulo, determinístico e versionado, e a imagem é
só a saída para a pessoa e o crítico.

## Incluído

- o desenho por restrições ajustado à referência: a IA desenha vendo o contorno e
  a razão interseção/união, e corrige até passar do mínimo, de 0,95 contra a
  união das partes, proposto por Claude e aceito pela pessoa em 2026-10-14, que
  deixou a escolha das medidas com Claude, com a volta à pessoa se o formato
  atual não chegar a ele;
- as peças de desenho que as referências já contornadas repetem, e as famílias da
  carcaça da empilhadeira e do braço robótico, com as vistas do avião como terceira
  prova;
- a faixa de proporção de cada parâmetro medida nas referências, e a pergunta de
  quantas referências uma família pede para não dar a mesma cara a todo objeto;
- a razão da ferramenta contra a união das partes ou com os furos da silhueta, que
  a prova da carcaça mostrou faltar;
- a decisão com a pessoa de se o desenho substitui a prancha, já que as cotas
  ficam nas relações.

## Excluído

- o esboço 3D a partir dos desenhos e a tradução do esboço para receita, que são
  os planos seguintes do roteiro;
- curva livre com restrição (spline), salvo se uma referência a exigir.

## Gate de saída

1. a razão da ferramenta contra a união das partes, e o contrato da peça e da
   família de desenho escrito, com teste;
2. as peças e as famílias da carcaça e do braço ajustadas às referências acima do
   mínimo, com o crítico e a aprovação da pessoa;
3. um objeto de prova desenhado a partir de uma família, com a razão contra a
   referência dele e o custo comparados ao da prova do plano anterior;
4. `npm run gates --completo` verde.

## Fatias

1. **Razão.** A razão interseção/união da ferramenta contra a união das partes,
   ou com os furos da silhueta, porque é a nota que os desenhistas perseguem.
2. **Ajuste à referência.** A carcaça e o braço desenhados por restrições vendo a
   referência, até o mínimo, com as peças que se repetem anotadas; um agente para
   cada objeto, em paralelo. O [braço](../banco-de-provas/familias-de-desenho-2026-10-14/braco/NOTAS.md)
   chegou a 0,9555 em 2026-10-14, e a
   [carcaça](../banco-de-provas/familias-de-desenho-2026-10-14/carcaca/NOTAS.md) a
   0,9941.
3. **Contrato.** O formato da peça e da família de desenho, com parâmetros,
   faixas e a ligação ao formato do módulo, escrito a partir dos dois ajustes.
4. **Famílias.** As famílias da carcaça e do braço, com a faixa de cada parâmetro
   e a prova nos extremos, um agente para cada, em paralelo. Feitas em 2026-10-14, em
   [`procedural/familias-de-desenho/`](../../../procedural/familias-de-desenho/carcaca-empilhadeira/README.md):
   a carcaça com 15 parâmetros, três peças e 33 conjuntos provados, o perfil de
   referência em 0,9941; o [braço](../../../procedural/familias-de-desenho/braco-colaborativo/README.md)
   com 9 parâmetros, quatro peças e 21 conjuntos, em 0,9540. O crítico, olhando o
   mínimo, o médio e o máximo contra a referência, deu 9 à carcaça (faltam uma linha
   fina na base da lateral e o fim da linha do aro) e 8 ao braço (o elo da coluna
   mais estreito que na imagem e a caixa lateral sem descer ao pé), sem defeito
   estrutural, com os extremos plausíveis. A pessoa aprovou a forma das duas
   famílias em 2026-10-14, pelas imagens do mínimo, do médio e do máximo, com os
   detalhes finos anotados.
5. **Prova.** Um objeto desenhado a partir de família, medido contra a referência.
   A pessoa mandou em 2026-10-14 as vistas de outra empilhadeira, sem marca, em
   [`empilhadeira-2026-10-14/referencias/`](../banco-de-provas/empilhadeira-2026-10-14/referencias/);
   a lateral foi contornada ([roteiro do crítico](../banco-de-provas/empilhadeira-2026-10-14/referencias/empilhadeira_lateral.pacote/roteiro.md)) e a [descrição](../banco-de-provas/familias-de-desenho-2026-10-14/prova/DESCRICAO.md)
   da carcaça foi a um desenhista que não vê a foto e usa só a família, que fez o
   [desenho às cegas](../banco-de-provas/familias-de-desenho-2026-10-14/prova/familia/NOTAS.md)
   com dez dos quinze parâmetros presos no limite da faixa. O
   [resultado](../banco-de-provas/familias-de-desenho-2026-10-14/prova/RESULTADO.md)
   dá 0,767 às cegas, 0,815 com a família ajustada à foto dentro das faixas e 0,908
   com as faixas abertas, treze parâmetros fora delas: uma referência não basta para
   a faixa de uma família.
6. **Ampliação.** A pessoa escolheu em 2026-10-14 ampliar a família agora, e não
   deixar para o backlog. O ajuste à referência virou o comando
   `npm run desenho -- familia --ajustar`, e a prova ganhou o sorteio de conjuntos
   nas faixas (`--provar --sorteio`), porque a prova de pares não via três
   parâmetros que se contradizem juntos. A
   [família da carcaça](../../../procedural/familias-de-desenho/carcaca-empilhadeira/README.md)
   passou à versão 2.0.0, com as faixas das duas empilhadeiras: 0,9943 contra a
   referência antiga e 0,9230 contra a nova, 335 conjuntos desenhados na prova e
   nenhuma reprovação em 1500 sorteados. O crítico deu 7 nas duas rodadas, a
   primeira corrigida na família e a segunda com detalhes que a versão 1.0.0 já
   tinha e formas da foto nova que a família não tem, e a pessoa aprovou a forma em
   2026-10-14 com esses pontos anotados como pendência. O paralama curvo da
   empilhadeira nova fica de fora, como forma que a família não tem.

Na mesma data a pessoa decidiu que o desenho não substitui a prancha por ora: a
prancha mede a foto, e o desenho é o objeto redesenhado; a decisão volta no plano do
esboço, quando o esboço passar a ler as medidas do desenho.

A ordem mudou em 2026-10-14, a pedido da pessoa, para agentes trabalharem em
paralelo sem disputa: cada um recebe a lista fechada dos arquivos que muda, quem
mexe em código trabalha numa cópia isolada do repositório e Claude junta um por vez,
e a bateria completa roda uma vez depois de juntar. A máquina da sessão tem quatro
processadores, e por isso o paralelo fica em dois ou três agentes por vez.

## Riscos e parada

Se o ajuste à referência não passar do mínimo com o formato atual, o plano para e
leva à pessoa o que falta ao módulo antes de ampliar. Se uma família exigir mudar o
contrato de família 3D, o plano para e a pessoa decide.

## Roteiro depois deste plano

Combinado com a pessoa em 2026-10-14, na ordem: o esboço 3D feito a partir dos
desenhos e a tradução do esboço para receita no núcleo, com o avião como primeiro
objeto, porque já tem esboço aprovado e é o elo que mais falta na esteira; depois a
picape, como primeiro objeto a passar pela esteira inteira do zero, com as
primitivas 2.0 que ela pedir; e, mais adiante, os objetos da [lista de
famílias](../FAMILIAS-DE-OBJETOS.md), na ordem da [contagem de ferramentas por
objeto](../FERRAMENTAS-POR-OBJETO.md). O [backlog](BACKLOG.md) entra onde cada plano
precisar: os atritos da segunda rodada do avião, a geometria exata e a visão
(OpenCASCADE, Manifold no esboço e Segment Anything), as pontas cortadas e a paleta
do mapa de partes.

## Candidatos de sucessão

Os objetos levantados em 2026-10-11 para o mesmo exercício do avião, cada um
forçando uma falta diferente: a bicicleta (corrente, engrenagem e transmissão, com
a roda 2.0), a empilhadeira (mastro telescópico com trilho e corrente e várias
articulações, com o
[alinhamento](../banco-de-provas/empilhadeira-2026-10-09/ALINHAMENTO.md) já
começado), a cadeira de escritório (estofado e espuma, base em estrela, pistão a
gás e rodízio) e um objeto de esteira, como robô de esteira ou escavadeira (o elo
articulado). E os que o plano [as ferramentas de
modelagem](encerrados/2026-10-07-as-ferramentas-de-modelagem.md) deixou: o carrinho
de mão como família de objeto, a bacia em casca como primitiva, a dobradiça de
caneco e as ressalvas do fechamento dele.

## Fechamento

Preencher ao concluir ou cancelar.

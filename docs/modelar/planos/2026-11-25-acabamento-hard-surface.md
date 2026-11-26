# Acabamento de hard surface: chanfro e arredondamento em qualquer aresta, linhas de painel e recortes na casca

**Estado:** rascunho

**Núcleo:** sim

**Responsável:** a IA da sessão ou o agente despachado de cada fatia; a pessoa aprova a forma por imagem e decide o que está em Decisão da pessoa. As fatias que mudam o núcleo passam pelo `revisor-adversarial` antes do envio.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-25.

## Problema observado

A pessoa perguntou, em 2026-11-25, se as famílias de robô (o atuador de junta e o elo entre juntas) dariam o visual de "hard surface": a carenagem de peças duras, com arestas chanfradas ou arredondadas, linhas de painel, entradas de ar, tampas e parafusos embutidos. A resolução não é o limite (o `lathe`, a `extrusao` e a casca pela receita saem tão densos quanto se pedir); o que falta é o acabamento.

O que existe hoje, pelo [mapa de ferramentas por objeto](../pesquisas/FERRAMENTAS-POR-OBJETO.md) e pelo núcleo:

- O arredondamento é parcial. O núcleo tem `arredondarAresta`, `arredondarCadeia`, `arredondarCanto`, `arredondarCostura` e `chamferBox`, e cada caso pede a operação certa; não há um chanfro ou arredondamento de aresta escolhida que sirva a qualquer forma, e o mapa diz isso.
- O sulco e o rebaixo existem: `rebaixoPorContorno` (`procedural/nucleo/rebaixo-por-contorno.js`) rebaixa uma região, uma faixa em volta de um contorno ou um sulco ao longo de uma linha, numa vista, a uma profundidade, com o fundo acompanhando a superfície. Ele foi feito para a carroceria (tomadas do capô, sulco estampado) e não foi provado sobre uma casca fina, onde o sulco não pode passar da parede.
- O recorte que atravessa existe: `aberturaPorContorno` e `furoPassante`. A grade de furos ou rasgos em padrão existe só por `arranja` à mão, e a furação com escareado ou rebaixo (o parafuso embutido) não existe (o mapa marca os furos como parciais por isso).

Isso ainda não foi feito porque cada peça do acervo resolveu a sua aresta com a operação do caso, e o arredondamento geral é o problema mais difícil do núcleo: arredondar uma aresta qualquer de uma malha facetada, com as faces vizinhas de qualquer forma, sem deixar lasca nem atravessar, é o que as peças contornaram até aqui.

## Resultado

O agente escolhe arestas por seleção semântica (a borda de uma flange, a aresta de uma extrusão, a costura de uma booleana) e pede o chanfro ou o arredondamento de raio dado, em qualquer forma; desenha linhas de painel sobre uma casca fina, com a profundidade limitada pela parede; e põe recortes e rebaixos na casca, entradas de ar em padrão e furos de parafuso com escareado ou rebaixo, cada um por uma chamada.

## Filtro Agent-First

Chanfro e arredondamento em qualquer aresta: ENVOLVER as operações de arredondamento do núcleo num ajudante que escolhe a operação certa pela aresta pedida (aresta reta entre faces planas, cadeia de arestas, costura de booleana, canto), e só criar o caso que nenhuma cobre. A primeira fatia mede, num conjunto de arestas de prova, onde cada operação existente falha, antes de escrever código novo.

Linhas de painel: USAR DIRETO o `rebaixoPorContorno` em modo de sulco sobre a casca, com a profundidade limitada pela espessura da parede, e medir se a casca pela receita e a do `lathe` aceitam o sulco sem furar.

Recortes e rebaixos: USAR DIRETO `aberturaPorContorno`, `furoPassante` e `rebaixoPorContorno`; ENVOLVER o padrão (grade, círculo, favo) num ajudante sobre o `arranja`; e criar o furo com escareado e com rebaixo como opção do `furo`.

## Incluído

1. A medida das operações de arredondamento existentes num conjunto de arestas de prova (borda de flange torneada, aresta de extrusão, cadeia em volta de um recorte, costura de booleana, aresta de casca), e o ajudante `chanfrarOuArredondar` que escolhe a operação pela aresta, com recusa clara onde nenhuma serve.
2. O caso que a medida mostrar que falta, no núcleo, com o revisor adversarial.
3. As linhas de painel sobre casca fina, com o limite da parede.
4. O padrão de recortes (grade, círculo e favo) e o furo com escareado e com rebaixo.
5. Uma carenagem de prova de robô com tudo junto, o banco de provas, o mapa de ferramentas, as fichas e o fechamento.

## Excluído

O decalque e a textura de superfície (ruído, recartilhado), a superfície de produção G2 (que tem plano próprio), o painel que se abre com dobradiça, a rosca nos furos e a migração das peças do acervo que já arredondam pelo caso delas.

## Invariantes

O núcleo não ganha nome de objeto. As peças do acervo que usam as operações de arredondamento, rebaixo e abertura saem iguais, com a assinatura de antes. Cada parte é sólido fechado, sem lasca.

## Gate de saída

1. A medida das operações existentes, escrita no andamento, com o caso que cada uma cobre e o que falha.
2. O chanfro e o arredondamento de raio dado em cada aresta do conjunto de prova, sem lasca, sem atravessar e com o raio medido até 2 %.
3. A linha de painel sobre a casca sem furar a parede, e o furo escareado com o ângulo e o diâmetro medidos.
4. As peças do acervo com a assinatura igual; `npm run gates` verde e o CI verde.

## Fatias

1. A medida das operações de arredondamento existentes no conjunto de arestas de prova.
2. O ajudante de chanfro e arredondamento e o caso que falta, com a aprovação da pessoa e o revisor.
3. As linhas de painel sobre a casca, com a aprovação da pessoa.
4. O padrão de recortes e o furo escareado e rebaixado, com a aprovação da pessoa.
5. A carenagem de prova, o banco de provas, o mapa de ferramentas, as fichas e o fechamento.

## Decisão da pessoa

Pendente: se o plano começa depois dos planos do atuador de junta e do elo entre juntas, para a carenagem de prova ser a do robô; e se o arredondamento precisa de continuidade de curvatura (G2) ou basta tangente (G1), que é o que as operações de hoje dão.

## Riscos e parada

Se a medida da fatia 1 mostrar que o arredondamento geral pede refazer as operações do núcleo, o plano para e volta à pessoa com a medida e o tamanho do trabalho antes de seguir.

## Andamento

## Fechamento

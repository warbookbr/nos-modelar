# Sólido por laços — a receita dá o contorno da peça em cada plano, e o núcleo monta a gaiola fechada e a subdivide numa malha só

**Estado:** ativo

**Território:** `procedural/nucleo/gaiola-por-lacos.js`, `procedural/nucleo/gaiola-por-lacos.test.ts`, `tools/fixtures/solido-por-lacos/`, `docs/modelar/banco-de-provas/solido-por-lacos-2026-11-05/`

**Responsável:** sessão de trabalho do furgão, a pedido da pessoa em 2026-11-05; a sessão do braço fica parada até este plano fechar

**Repositório e base:** este repositório, a partir da main de 2026-11-05 com o ombro aceito

## Problema observado

O corpo do ombro do braço (`procedural/pecas/braco-robotico/partes/ombro/receita.js`, 2026-11-05) deixou de ser a união de dois lofts, cuja emenda fazia uma faixa de sombra na lateral, e virou uma malha única por `subdivisao` de uma gaiola escrita à mão dentro da receita: um laço em L com o mesmo número de pontos em cada plano x e as paredes de lado fechadas por uma escada de faces. A técnica serve a qualquer peça em que dois corpos precisam se fundir sem emenda (cotovelo, carcaça de punho, alça, cabo de ferramenta, corpo de aparelho com cantos suaves), mas ficou no arquivo de uma peça, contra a regra de que a correção que um objeto revela vai para a ferramenta geral. O ombro mostrou quatro limites, registrados no backlog: `medidas` exatas em todos os pontos fazem a superfície ondular (62 mm), planos a menos de 2,5 mm entre si ondulam (25 mm), as arestas saem mais macias que com `arredondarAresta`, e uma região com poucos pontos deixou calombo.

## Resultado

Uma receita declara uma lista de laços fechados, um por plano ao longo de um eixo, e recebe do núcleo a gaiola fechada no formato que o passo `subdivisao` aceita, com os lados tampados, os vincos vivos declarados por nome e avisos que impedem os quatro limites do ombro antes de subdividir.

## Filtro Agent-First

- O ajudante `gaiolaPorLacos`: **ENVOLVER** a mesma saída das outras gaiolas (pontos, faces, vincos e cantos em nomes), para o passo `subdivisao` não mudar.
- Os quatro limites: **ENVOLVER** em avisos e recusas do ajudante (planos próximos demais, laços com número de pontos diferente, amostragem desigual entre trechos vizinhos) e em opções declaradas (medidas só nos pontos que a receita marcar, vinco vivo por trecho do laço), em vez de deixar cada receita descobrir.
- O ombro e o cotovelo: **ADIAR** para o plano do braço, que os leva ao ajudante quando a sessão dele voltar.
- A ficha do ajudante no comando `capacidade`: **USAR DIRETO** o formato do plano da porta de entrada, com o bloco `FICHA` no cabeçalho do arquivo novo.

## Incluído

- o ajudante, com o contrato, as recusas e os avisos;
- a peça de teste neutra em `tools/fixtures/solido-por-lacos/`, que refaz a forma do corpo do ombro pelos laços, sem citar o braço, e um segundo caso de dobra em U;
- a comparação da peça de teste com a gaiola escrita à mão do ombro: a mesma forma de fora dentro de 0,5 mm;
- a ficha do ajudante.

## Excluído

- mudar a receita do ombro ou do cotovelo;
- laço aberto ou superfície que não fecha (é a chapa, das outras gaiolas);
- laços em planos não paralelos.

## Gate de saída

1. A peça de teste sai fechada: nenhuma aresta sem par, nenhum vínculo não manifold, nenhum triângulo sem área.
2. A forma de fora da peça de teste fica a até 0,5 mm da do corpo do ombro feito à mão, medida pela malha.
3. Os quatro limites do ombro viram aviso ou recusa com teste: planos próximos, medidas em todos os pontos, amostragem desigual, e o vinco vivo que dá a aresta da nitidez pedida.
4. A mesma receita dá a mesma malha; o retrato do acervo dá as mesmas peças; `npm run gates` verde.
5. A pessoa aprova a peça de teste por imagem.

## Fatias

1. Linha de base: a gaiola do ombro tirada da receita do braço para a peça de teste, medida, e os quatro limites reproduzidos.
2. O ajudante com o contrato e os testes do gate 1, 2 e 4.
3. Os avisos e as opções dos quatro limites, com os testes do gate 3.
4. A ficha, as imagens para a pessoa e o fechamento.

## Riscos e parada

Se a mesma forma do ombro não sair do ajudante sem uma opção que só o ombro usa, para e volta à pessoa. Se resolver um dos limites pedir mudança no passo `subdivisao`, para também, porque o passo é de todas as chapas.

## Andamento

A fatia 1 fechou em 2026-11-05 com a linha de base nas [provas](../banco-de-provas/solido-por-lacos-2026-11-05/README.md): a peça de teste `tools/fixtures/solido-por-lacos/` refaz a gaiola do ombro sem citar o braço, sai fechada (nenhuma aresta sem par, vínculo não manifold nem triângulo sem área) e fica a 0,000 mm do corpo do ombro. Os quatro limites se reproduzem nela com número: a cota exata em todos os pontos dá uma emenda de 62,6 mm e 302 faces viradas, os planos a 0,12 mm uma ondulação de 5,16 mm na traseira, o canto de 32 mm sai com o recuo de um arco de 34,2 mm contra 32,0 do `arredondarAresta`, e metade dos planos na quina leva o calombo do encontro de 0,58 a 1,27 mm. Para a fatia 2 ficam a tampa das paredes de lado, cuja escada obriga as duas cadeias do laço a ter o mesmo número de pontos, a ponta da saída que se fecha num ponto, a orientação pelo volume e os vincos declarados por trecho do laço.

## Fechamento

Preencher ao concluir ou cancelar.

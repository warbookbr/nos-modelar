# Carroceria por casca deformável ajustada contra referência

**Estado:** congelado

**Congelado em:** 2026-09-10, por decisão do usuário, no mesmo dia em que foi
escrito. **Base:** `82847e9`

**Responsável original:** Claude, a pedido do usuário

## Por que foi congelado

Este plano supõe que existe uma casca base de carro para deformar. Não existe.
Deformar região muda proporção e não muda arquétipo, então uma base de sedã
produz vários sedãs e nunca produz um carro de formato abaulado nem uma picape. Enquanto a base não
existir e não estiver provada, todo o resto deste plano mede o ajuste de uma
coisa que ninguém construiu.

O usuário decidiu, então, tratar a construção da base como o problema anterior e
guardar este aqui inteiro. O congelamento não é refutação: a premissa continua
de pé e a rota é que mudou de ordem.

## Condição de descongelamento

Existir no acervo uma casca base de carro, fechada, com regiões nomeadas, que
passe na bancada como corpo único sem face órfã e que alguém olhe e reconheça
como carro antes de qualquer ajuste. No dia em que isso existir, este plano
volta como está.

## O que fica parado junto

Nada de código. Este plano nunca chegou a produzir arquivo; o que existe é o
`conferir:referencia`, que já está em uso pela bicicleta e não depende dele.

## Problema observado

Modelar carro empilhando sólido produz forma que tenta fazer sentido e não vira
carroceria. A causa não é falta de instrução: um carro é casca contínua e o
vocabulário do motor é sólido empilhado, então nenhuma documentação fecha essa
distância. O repositório já mediu a segunda metade do problema em
`autoria-assistida/experimentos/prova-secoes-por-medida/README.md`: três vistas
ortográficas não determinam a seção transversal, oitenta e dois por cento das
estações ficam escondidas atrás da envoltória frontal, e duas famílias de seção
com as três vistas idênticas ainda diferem vinte e oito milímetros no flanco.

## Resultado

Uma carroceria nasce como casca fechada única com regiões nomeadas, e o ajuste
dela contra a referência deixa de ser correção por olho e passa a ser
otimização numérica sobre os parâmetros das regiões, com desvio em milímetro
nos três planos. A receita continua determinística: o otimizador roda fora dela
e escreve o resultado de volta como número.

## Filtro Agent-First

O `conferir:referencia` é **USADO DIRETO** como função de custo; ele já calcula
silhueta por projeção da malha, sem câmera e em milissegundos, e só precisa
passar a medir planta e frontal além da lateral. A subdivisão de Catmull-Clark é
**REFATORADA** para dentro do motor como operação própria, porque suavizar casca
é capacidade de autoria e não detalhe de visor. O otimizador sem gradiente é
**ENVOLVIDO** numa ferramenta de linha de comando que nunca é chamada pela
receita, para que determinismo e reexecução continuem valendo. Renderização
diferenciável fica **ADIADA**: ela existe para otimizar milhões de parâmetros, e
aqui são algumas dezenas, onde diferença finita basta.

## Incluído

- operação de casca com regiões nomeadas e deformação local por região;
- subdivisão como operação do motor, determinística e sem dependência externa;
- medida de desvio em planta e frontal, além da lateral que já existe;
- ferramenta de ajuste por otimizador sem gradiente, fora da execução da receita;
- marca de origem em cada parâmetro, dizendo se o valor foi medido ou escolhido.

## Excluído

- construção da casca base, que é o plano anterior e a razão deste estar aqui;
- rede neural, gerador 3D e qualquer dependência que precise de placa de vídeo;
- vinco, linha de caráter e raio de aresta, que exigem controle local e não
  sobrevivem a deformação de região;
- chassi estrutural com painéis, flanges e soldas.

## Gate de saída

1. a casca sai da bancada como corpo único, sem face órfã e sem furo;
2. o desvio é relatado em milímetro nos três planos, e uma carroceria
   propositalmente torta reprova com o número certo;
3. partindo de um estado ruim, o otimizador faz o desvio cair sozinho, e a
   queda é reproduzível com a mesma semente;
4. a receita com os números escritos de volta executa igual, sem otimizador
   presente;
5. cada parâmetro diz se foi medido ou escolhido.

## Fatias

1. **Casca com regiões.** Operação nova que recebe a casca base e uma tabela de
   regiões nomeadas, capô, para-brisa, teto, caixa de roda dianteira e traseira,
   ombro, cintura, saia, para-choques e porta-malas, cada uma com meia dúzia de
   números que a deformam localmente. Prova: a casca continua fechada depois de
   qualquer combinação de valores dentro dos limites declarados.
2. **Subdivisão.** Catmull-Clark como operação do motor, com teste de que a
   malha refinada é determinística, que a contagem de faces segue a regra e que
   a identidade semântica de cada região sobrevive ao refinamento.
3. **Medida nos três planos.** Estender `conferir:referencia` para planta e
   frontal, reusando o mesmo envelope por projeção. Prova: uma carroceria torta
   de propósito reprova, e a assinatura do desvio diz em qual plano.
4. **Ajuste.** Ferramenta de linha de comando com Nelder-Mead ou CMA-ES em
   JavaScript puro, dirigindo os parâmetros contra a soma dos desvios dos três
   planos. Prova: parte de um estado ruim conhecido e o desvio cai, com o mesmo
   resultado na mesma semente.
5. **Procedência do número.** Cada parâmetro carrega se veio de medida ou de
   escolha, e a saída do ajuste diz quais ele moveu.

## Riscos e parada

O risco que obriga parar é o desvio empatar entre duas formas visivelmente
diferentes. Se acontecer, o alvo não determina a forma, e o problema deixa de
ser de código e passa a ser de referência: sem alvo tridimensional ou fotos em
ângulo, o otimizador converge confiante para uma carroceria que pode não ser
aquela. Insistir em código nesse ponto produz número bonito sobre forma errada,
que é o defeito que este repositório existe para não cometer.

O segundo risco é a fidelidade fina. Vinco, linha de caráter, raio de aresta e
encontro de painéis são o que faz um carro ser aquele carro, e nada disso
sobrevive a deformação de região grande. Este plano entrega fidelidade de
proporção e de silhueta, e não entrega fidelidade de detalhe. Se o aceite exigir
detalhe, o plano não serve e precisa ser redesenhado, não ampliado.

## Fechamento

Fecha quando as cinco fatias estiverem integradas com os gates verdes e uma
carroceria ajustada contra referência real for aceita pelo usuário na bancada.
Enquanto a casca base não existir, ele permanece aqui.

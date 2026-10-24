# Carroceria por rede de curvas — a superfície preenchida entre curvas de feição nomeadas, com o detalhe lido em cortes ampliados

**Estado:** ativo

**Responsável:** Claude, com a pessoa aprovando a forma do piloto e decidindo o nível oficial de carroceria se ele não passar

**Repositório e base:** `warbookbr/nos-modelar`, main depois do fechamento do plano [gaiola que segue as feições](encerrados/2026-10-23-gaiola-que-segue-as-feicoes.md)

## Problema observado

Em oito testes cegos, a IA chegou à forma geral de um trecho de carroceria a uns 2 mm, lisa e coerente entre modeladores, mas os detalhes de borda (molduras, calha, lábios, ponta da janela, coluna) ficaram na escala ou no feitio errados, e o crítico estacionou em 5 a 6. Duas causas foram medidas no plano encerrado: a gaiola por estações é uma grade de fatias que nenhuma feição segue, e anéis e abas foram remendos dela; e o pacote cego mostra os cortes com menos de meio pixel por milímetro, abaixo do detalhe fino. Um modelo com 1.510 vértices teve a mesma nota que os de 9 mil, então o número de polígonos não é a causa.

## Resultado

Uma receita declara a superfície de uma região de carroceria por curvas de feição nomeadas, o núcleo preenche os retalhos entre elas com a topologia seguindo as curvas, os detalhes de borda saem de perfis lidos em cortes ampliados, e o piloto mede se isso leva a região a nota 7 do crítico.

## Filtro Agent-First

A rede de curvas é **REFATORAR** a autoria de superfície: a IA passa a decidir dezenas de curvas nomeadas, tiradas das linhas 3D e dos cortes, no lugar de centenas de pontos de gaiola. O preenchimento é **ENVOLVER** sobre a `subdivisao`, entregando uma gaiola de quadriláteros por retalho que a subdivisão já sabe tratar. Os cortes ampliados são **USAR DIRETO** o gerador do pacote com uma opção a mais. O nível oficial de carroceria depois do piloto é **ADIAR** até a medida.

## Incluído

- cortes de detalhe ampliados no pacote cego, em regiões declaradas;
- preenchimento de retalhos entre curvas nomeadas, com quadriláteros e continuidade entre retalhos vizinhos;
- o piloto numa região (janela lateral com a coluna atrás dela), com o perfil lido do corte para a moldura;
- a decisão do nível oficial de carroceria.

## Excluído

- o carro inteiro por rede de curvas antes de o piloto passar;
- retirar a gaiola por estações, que continua servindo às peças existentes;
- velocidade das ferramentas, que fica no backlog.

## Invariantes

O núcleo continua sem Three.js, sem domínio automotivo e sem ferramenta externa. Mesma receita, mesma malha, bit a bit. Curvas, retalhos e pontos são endereçados por nome. As peças do acervo regeneram iguais.

## Gate de saída

1. O pacote de prova com cortes ampliados mostra um cordão de 10 mm com erro de leitura abaixo de 0,5 mm, e `ler-perfil` o lê a menos de 1 mm.
2. Numa forma desenhada por código com uma janela em gota, um arco e uma coluna, a superfície preenchida entre as curvas passa pelas curvas a menos de 0,5 mm, sai só de quadriláteros fora dos cantos declarados, sem falha de ondulação nem face virada, e as arestas seguem as curvas.
3. No piloto às cegas, a região da janela com a coluna tira nota 7 ou mais do crítico, com a moldura e a ponta da janela certas, e a pessoa aprova a forma; se não tirar, a pessoa decide o nível oficial de carroceria.
4. `npm run gates -- --completo` verde.

## Fatias

1. **Cortes de detalhe ampliados.** O gerador do pacote cego passa a aceitar regiões de detalhe declaradas e gera, nelas, cortes com 3 a 4 pixels por milímetro, que `ler-corte` e `ler-perfil` leem. Pronto quando o gate 1 passa e o pacote do oitavo teste é regerado com cortes ampliados na janela, no vidro e na calha.
2. **Preenchimento entre curvas.** Uma operação ou ajudante recebe curvas nomeadas e a lista de retalhos que elas fecham e entrega a gaiola de quadriláteros para a `subdivisao`, com a densidade de cada retalho declarada e a continuidade entre vizinhos. Pronto quando o gate 2 passa.
3. **Piloto às cegas.** Um modelador faz a região da janela lateral com a coluna atrás dela por rede de curvas, com o pacote de cortes ampliados e o perfil lido para a moldura, mais uma rodada de refino com o crítico; a régua, a vista em arame e o crítico vão à pessoa. Pronto quando o gate 3 é medido e a pessoa decide.
4. **Fechamento.** `UPSTREAM-NOS.md`, backlog, `npm run gates -- --completo` e o plano movido para `encerrados/`. O plano seguinte é o da [leitura por demanda e limpeza](2026-10-22-leitura-por-demanda-e-limpeza.md), e depois dele o de [ajustes no núcleo dos veículos](2026-10-21-ajustes-no-nucleo-dos-veiculos.md).

## Decisões da pessoa

1. **Rede de curvas com parada.** Aprovada em 2026-10-24: em vez de seguir ajustando a gaiola por estações ou abandonar a carroceria com detalhe, um piloto curto da rede de curvas numa região, com os cortes ampliados; se ele não chegar a 7 no crítico, o nível oficial passa a ser lataria lisa com os detalhes como peças à parte, que já entrega 5 a 6.

## Riscos e parada

O risco maior é a definição dos retalhos (quais curvas fecham cada um, e os retalhos de três ou cinco lados) virar trabalho tão grande para a IA quanto os pontos da gaiola; a fatia 2 para e volta à pessoa se a forma de prova pedir mais de uma decisão por retalho além das curvas. Também para se uma fatia passar de dois dias ou se o núcleo precisar de dependência externa.

## Andamento

Escrito e ativado em 2026-10-24, com a decisão aprovada, sem implementação.

Fatia 1 feita em 2026-10-24 na ferramenta. O gerador do pacote cego (`tools/blender/pacote-cego.py`) aceita a chave `detalhes` da configuração, com regiões de detalhe declaradas por corte e janela em milímetro no plano (ou a projeção de uma caixa 3D), e grava, ao lado dos cortes do trecho inteiro, um corte ampliado de cada um com 4 pixels por milímetro (de 3 a 8), com o quadro, a grade, as cotas, o recorte e a visibilidade dos outros e o contorno cortado pela janela; `ler-corte` o lê por nome, por região ou todos, e `ler-perfil` o prefere ao corte do trecho quando ele cobre o ponto do detalhe. Numa chapa desenhada por código, com um corte de 2,2 m que dá ao corte do trecho 0,34 pixel por milímetro e erro de leitura de 1,8 mm, o corte ampliado sai com erro de 0,18 mm e contorno a menos de 0,5 mm do desenhado, e `ler-perfil` lê o cordão de 10 mm a até 0,37 mm (a calha de canal duplo a 0,26 mm) onde o corte do trecho erra 2,9 a 3,5 mm, mais que a altura do cordão. O pacote do oitavo teste, regerado fora do repositório com cinco regiões (a moldura da janela lateral em cima e embaixo e a calha do teto em z850, z1000 e z1100, e a moldura do vidro traseiro em x250), saiu com as vistas e os cortes do trecho iguais pixel a pixel aos do original e 11 cortes ampliados com erro de leitura de 0,18 a 0,33 mm; o lábio do teto lê-se como um gancho de uns 15 por 16 mm com a mesma forma em três cortes, e a soleira da janela como uma faixa de 58 mm por 10 mm sobre a corda, antes lidos com erro de 2 a 9 mm. Os achados, cada um com a resposta se o processo o teria pego. A janela e o alcance com que `perfil.py` acha o pé do detalhe eram fixos em 3 e 6 mm, de modo que um cordão de 10 mm lido com erro de 0,2 mm saía a 0,99 mm e a calha a 2,4 mm do desenhado; os testes antigos só tinham detalhes de 25 e 62 mm e a escala de 3 pixels por milímetro, e só o teste com o cordão fino, escrito nesta fatia, o pegou, de modo que o processo não o pegaria sozinho e a janela agora cresce com o erro. O título do corte ampliado cobria o traço que passava sob ele e a leitura perdia 11 mm do contorno; só o teste com o pacote do `pacote-cego.py` o pegou, porque no pacote de prova sem Blender a janela ficava longe do título, e a faixa do título passou a ficar fora do recorte. A leitura automática da janela do detalhe (que cresce até o contorno voltar à base) falha onde o detalhe está num canto da chapa, como a calha do teto e a soleira, e a caixa em volta do detalhe a resolve; nenhum gate o impede, e a documentação diz que a caixa é a leitura certa nesses casos.

Fatia 2 feita em 2026-10-24. `gaiolaPorRede` (`procedural/nucleo/gaiola-por-rede.js`) recebe curvas nomeadas em mm (Catmull-Rom centrípeta por pontos-chave e nós nomeados, por coordenada ou por fração de outra curva) e os retalhos que elas fecham, cada um a lista das curvas ou dos trechos de nó a nó, e devolve a gaiola de quadriláteros no formato do passo `subdivisao`: as arestas seguem as curvas, a curva declarada vinco vira vinco nomeado, `linha(curva)` é a linha nomeada do `friso`, a cota da curva é exata ou com peso (e `leitura` como na gaiola por estações), e os retalhos de três a oito lados saem em n quadriláteros em volta de um centro extraordinário declarado. O interior é Coons; o miolo dos retalhos de quatro lados é alisado pela normal, minimizando a variação do laplaciano, para a tangente não quebrar nas curvas compartilhadas; a densidade sai de um passo e de um sistema inteiro (lados opostos somam o mesmo, arco compartilhado igual nos dois retalhos), com o espaçamento graduado pela curvatura. Na chapa de 1000 × 600 mm desenhada por código, com a janela em gota de 230 mm, o arco de roda e a coluna inclinada (19 curvas, 10 retalhos, 2 deles de cinco lados, 654 pontos de gaiola e 9.480 vértices em nível 2), a superfície passa pelas curvas a até 0,26 mm, sai só de quadriláteros, a borda da janela é um laço de arestas da malha, o salto de normal nas curvas lisas compartilhadas é de até 0,96 grau (12 graus na cintura vincada), `npm run ondulacao` sai sem falha e sem face virada com o desvio máximo de 0,17 mm (0,43 mm sem o alisamento), a moldura de 10 mm como `friso` sobre a curva da janela fecha sólida e interpenetra a chapa de 1,5 mm, e duas execuções dão a mesma malha. A receita pede, além das curvas, uma decisão por retalho (a lista de curvas dele), mais o passo e o sentido de fora da rede inteira, e nenhuma divisão nem canto; o limite do plano, de uma decisão por retalho além das curvas, não foi passado. Os achados, cada um com a resposta se o processo o teria pego. Uma ligação que chega quase reta ao contorno (172 graus) dobrou faces do preenchimento de Coons, e nenhum gate existia para isso antes da subdivisão; o ajudante passou a gritar com o nó e o ângulo. Uma borda desenhada em uma curva só através da dobra da cintura arredondou a dobra e deixou a superfície 2 mm da forma desenhada junto dela, e nada o acusa, porque a ondulação lê a superfície e não a compara com a intenção; só a comparação com a forma desenhada da chapa de prova pegou, e a instrução manda partir a curva na dobra. O espaçamento uniforme por arco deixou a borda da janela a 0,59 mm da curva na ponta de raio 20 mm e fez o `friso` gritar por um trecho de 1 mm; o gate de 0,5 mm e o grito do friso pegaram, e o espaçamento passou a seguir a curvatura com declive limitado. O alisamento de placa fina achatou a curvatura (0,57 mm de desvio médio à forma, contra 0,24) e o alisamento da variação do laplaciano com o centro extraordinário solto o deslocou 15 mm no retalho de cinco lados; só o teste de retalho de n lados sobre uma calota pegou, e o centro e esses retalhos ficam fora do alisamento. O calombo de 0,43 mm que o Coons deixa junto de uma curva compartilhada com a face de 40 mm foi pego pela leitura de ondulação (limiar de 0,3 mm). O alisamento reduz o salto de tangente da gaiola sem zerá-lo, e a continuidade fora do vinco é a da subdivisão.

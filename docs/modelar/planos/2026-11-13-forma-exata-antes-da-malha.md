# Forma exata antes da malha, vocabulário alto e retorno em milímetro

**Estado:** ativo

**Território:** `procedural/nucleo/forma-exata/`, `procedural/nucleo/chapa-de-contorno.js`, `procedural/nucleo/corpo-de-secao-variavel.js`, `procedural/nucleo/furo-passante.js`, `tools/modelar/vistas-para-critica.mjs`, `tools/modelar/silhueta-contra-referencia.mjs`, `tools/modelar/silhueta-contra-referencia.test.mjs`, `.claude/agents/modelador.md`, `docs/modelar/usar/GUIA-AUTORIA-IA.md`, `docs/modelar/banco-de-provas/forma-exata-2026-11-13/`

**Responsável:** a IA da sessão do furgão conduz, com agentes e o revisor adversarial nas fatias de núcleo; a pessoa decidiu o rumo em 2026-11-13 e decide de novo depois do estudo da fatia 3.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-13.

## Problema observado

O núcleo vira malha de triângulos logo no começo e depois arredonda, chanfra e corta em cima dos triângulos. Os defeitos que isso deixa (triângulo sem área, agulha, dente na costura, face fina) custam dias cada um: o plano das costuras levou duas rodadas para tirar uma agulha de 430 mm por 0,015 mm, com uma regra que só funciona numa janela estreita de tolerância. Dos 221 atritos dos diários, 153 são capacidade que faltava ou defeito de ferramenta. E a primeira forma da kukri, feita em 8 minutos, mostrou as três faltas juntas: a operação de alto nível que não existe, o furo que deixa face fina, e a comparação com a referência feita a olho.

A pessoa perguntou por que não melhorar isso dentro do projeto, e escolheu dois caminhos: mudar o método por dentro do núcleo, adiando a hora de virar malha, e subir o vocabulário e o retorno.

## Resultado

Quem escreve uma receita de peça de aresta dura diz a forma em poucas operações de alto nível, o arredondamento, o chanfro e o furo saem sem defeito de malha porque são resolvidos antes dela, e a diferença para a referência volta em milímetro, por trecho.

## Filtro Agent-First

USAR DIRETO: os contornos exatos de reta e arco que o núcleo já tem (`contorno.js`, `curva2d.js`), que saíram bem na medida por estrago; o módulo de contorno da imagem; as vistas da bancada; a kukri e as peças de prova das costuras como casos. ADIAR: motor de sólidos exato completo; reescrever operações que as peças de superfície livre usam; qualquer mudança no que o acervo já produz.

## Incluído, em fatias pela ordem de execução

1. O retorno em milímetro. Um comando que recebe a receita, a vista e um contorno de referência em milímetro e devolve o desvio da silhueta por trecho (onde o modelo está para fora, para dentro e quanto), em dados e numa imagem de sobreposição, com a vista de perfil escolhida pelos eixos que o `PLANO` declara. O contorno de referência sai do módulo de contorno da imagem, e o roteiro de peça nova passa a apontar para os dois. Prova: na kukri, o comando acusa o dorso sem a quebra em ângulo, com o desvio em milímetro no trecho.
2. O vocabulário alto, como composição sobre o que existe, sem mudar o método: a chapa de contorno com chanfro de borda num trecho do contorno, o corpo de seção variável ao longo de um eixo com sulcos, e o furo passante num sólido qualquer. Cada uma com ficha de capacidade e exemplo. Prova: a kukri reescrita com elas, em menos passos e menos linhas, com a mesma forma ou melhor.
3. O estudo do método, antes de qualquer mudança larga: um protótipo, na pasta nova, que representa uma peça de aresta dura como contornos e superfícies exatas com as operações de borda (chanfro, arredondamento, furo) resolvidas nesse nível, e só então gera a malha. Medido em três casos: a kukri, a peça de prova da agulha na faceta do tubo e a do furo em face plana. O estudo diz o que o método cobre, o que não cobre (superfície livre, costura entre dois corpos curvos) e quanto custaria levar cada operação. A pessoa decide com esse número.
4. As operações de aresta dura pelo método novo, na ordem que o estudo indicar, cada uma ao lado da antiga, que continua valendo para o acervo. Só começa com a decisão da pessoa sobre a fatia 3, e pode virar plano próprio.

5. As instruções pequenas que a kukri mostrou faltar, aprovadas pela pessoa em 2026-11-13 e feitas por quem conduz: o modelador corrige antes de entregar a parte que não confere com um critério de reprovação; o guia de autoria diz o limite de 240 caracteres dos textos do `PLANO` e o que a `medida` de um ponto devolve; e a guarda do acervo responde a `--ajuda`, esta última junto da integração do plano das costuras, que é dono do arquivo. O pedido ao crítico visual passa a dizer, em palavras, de que lado ficam o dorso e o gume no alvo e no modelo, porque na primeira rodada da kukri ele leu a foto invertida em dois achados. E o contorno de referência do desvio de silhueta sai do módulo de contorno da imagem e é conferido pela pessoa sobre a foto antes de valer como medida: o da kukri foi levantado a olho, deu o dorso curvo onde a foto o tem reto, e o desvio de 7,3 mm que o comando acusou não existia.

Andamento de 2026-11-13. A fatia 1 está feita: `npm run silhueta:desvio` mede a silhueta contra um contorno em milímetro, por trecho, e entrou no roteiro de peça nova. A fatia 2 está feita, com revisão adversarial em duas passadas: `chapaDeContorno`, `corpoDeSecaoVariavel` e `furoPassante`, e a kukri reescrita com elas foi de 297 para 152 linhas e de 12 faces finas para nenhuma; a pessoa aceitou por imagem a faca reescrita, com um ponto de 1,55 mm no começo do gume em que a versão nova segue a tabela. A fatia 3 está feita: o estudo está em `docs/modelar/banco-de-provas/forma-exata-2026-11-13/ESTUDO-DO-METODO.md`. O método cobre chapa, bloco e torno, não cobre o encontro geral de dois corpos curvos nem a peça de prova da agulha, e custa de 35% a 90% mais faces na chapa.

Decisão da pessoa em 2026-11-13, sobre a fatia 3, com a estimativa corrigida pelo revisor adversarial (o protótipo recusa a lâmina da kukri com chanfro acima de 2 mm e não cobre o encontro de dois corpos curvos; as estimativas em dias do estudo não têm medida por trás): o método novo não segue agora, nem o pedaço das tampas. A fatia 4 está cancelada e o estudo fica guardado, com o protótipo fora do registro de operações, para a peça que precisar dele. O esforço vai para o que a kukri mostrou que ajuda a modelar, nas fatias 6 e 7.

6. O contorno de referência sai da imagem pela ferramenta, e não a olho: do módulo de contorno da imagem ao arquivo de trechos que `silhueta:desvio` lê, com uma imagem de sobreposição do contorno sobre a foto que a pessoa confere antes de ele valer como medida. Prova: o contorno da kukri refeito assim, com o dorso reto que a pessoa viu na foto.
7. Mais operações de alto nível, escolhidas pela contagem dos atritos dos diários do banco de provas: um levantamento diz quais capacidades faltaram mais vezes e a quais peças serviriam, a pessoa vê a lista, e cada operação entra como as da fatia 2, com ficha, exemplo, teste que discrimina e revisão adversarial.

Andamento das fatias 5 a 7, em 2026-11-13. A fatia 5 está feita: o pedido do crítico recebe a orientação da referência em palavras, a recusa de lataria sem Blender diz o caminho da dispensa e a guarda do acervo e as vistas da crítica respondem a `--ajuda`. A fatia 6 está feita: `npm run silhueta:referencia` tira o contorno da imagem, com limiar e alisamento declarados e gravados, e a sobreposição inteira e de perto para a pessoa conferir; `silhueta:desvio --ajustar` relata o desvio pelos dois pontos declarados e pelo melhor ajuste rígido, e avisa quando os pontos de alinhamento são suspeitos. Na kukri, a pessoa conferiu o contorno, e o ajuste mostrou que 4 a 7 mm do desvio eram alinhamento; a diferença de forma que sobra é de até 5,7 mm no dorso depois da quebra, 3,4 mm na barriga do gume e 5,9 mm no degrau junto ao cabo.

Na fatia 7, o levantamento dos atritos indicou oito operações candidatas. As quatro funções do núcleo que não tinham ficha ganharam ficha, e `recortarArcoNoPerfil` ganhou a opção de fase que a fazia divergir das receitas. A primeira operação, o sólido pelo cruzamento de vistas, foi construída e não entra: a revisão adversarial mediu 24 linhas virando 21 em três receitas, contra as 400 estimadas para as 28, e pede cinco consertos; o trabalho fica no ramo `forma-vistas`. As estimativas de linhas poupadas do levantamento não valem como critério. A peça de torno por trechos não começa. O corpo por fatias de contorno livre segue, julgado pelo limite de detalhe que tira, e não por linhas.

## Excluído

Trocar o método das operações de superfície livre (subdivisão, gaiola, lataria); mudar a malha de qualquer peça do acervo; adotar um motor de terceiros como caminho de autoria, que continua decidido como está no registro de decisão sobre o motor de exportação.

## Invariantes

O núcleo não conhece faca, veículo nem outro objeto: as operações novas são gerais. Tudo é determinístico. O retrato do acervo não muda nas fatias 1 a 3. Nada entra no núcleo sem o revisor adversarial.

## Gate de saída

1. O comando de desvio da silhueta roda em duas peças do acervo e na kukri, e o roteiro de peça nova leva a ele.
2. A kukri sai com as operações de alto nível, e o custo dela é medido de novo contra os 8 minutos e 260 linhas da primeira forma.
3. O estudo do método está escrito com os três casos medidos, e a decisão da pessoa está registrada.
4. `npm run gates` verde e o retrato do acervo igual.

## Riscos e parada

O método novo virar um segundo núcleo pela metade: por isso a fatia 3 é um estudo com três casos e a decisão vem antes da fatia 4. As operações de alto nível esconderem os defeitos de malha em vez de evitá-los: cada uma passa pela régua de face degenerada e pela de face fina. O desvio de silhueta depender de uma referência mal alinhada: o comando recusa referência sem escala e sem os dois pontos de alinhamento declarados.

## Fechamento

Preencher ao concluir ou cancelar.

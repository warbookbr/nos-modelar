# Gotchas de modelagem procedural

**Estado:** regra operacional para qualquer autoria procedural julgada por forma,
montagem ou inspeção visual. Aplica-se a prensas, veículos, robôs, máquinas e
peças compostas.

Este documento registra falhas que já ocorreram na oficina e que não podem ser
tratadas como detalhes isolados de uma receita. O objetivo é impedir que uma
geometria que executa, tem nomes semânticos e passa em um teste estrutural seja
apresentada como um modelo concluído quando ainda é apenas um bloco de estudo.

## Regra zero: executar não é concluir

Uma receita que roda sem erro provou somente que seus passos são aceitos pelo
contrato do motor. Ela ainda precisa provar escala, montagem, continuidade,
proporção, resolução, função e reconhecimento visual. Nenhum teste isolado, cor,
hash, malha fechada ou render bonito substitui essa prova.

## Gotchas que já aconteceram

### 1. `pai` sem contato físico

**O que aconteceu:** a receita declarou relações como `pai: 'colunaDorsal'`, mas
isso organizou a árvore sem prender geometricamente uma peça à outra. A parte
superior podia parecer flutuando mesmo com uma hierarquia semântica válida.

**Por que é genérico:** em um carro, um painel pode ser filho do chassi e ainda
estar deslocado; em um robô, um braço pode pertencer ao ombro e ainda não tocar
o tronco; em uma prensa, cabeçote, coluna, mesa e martelo podem ter nomes
corretos e posições incompatíveis.

**Regra:** `pai` descreve organização. Apoio, encaixe, folga, eixo e continuidade
precisam ser declarados por geometria, portas, transformações ou relações
explícitas e validados depois da resolução.

### 2. Blockout confundido com modelo final

**O que aconteceu:** a prensa foi construída majoritariamente com caixas e
cilindros. O resultado ajudou a testar composição e identidade, mas foi tratado
visualmente como se fosse uma modelagem acabada.

**Por que é genérico:** o mesmo atalho produz carroceria-caixa, robô-boneco,
motor sem volumes funcionais ou peça mecânica sem seus vazios e interfaces.

**Regra:** separar as rodadas de envelope, estrutura, articulação, acabamento e
detalhe. Um blockout só pode avançar se estiver identificado como blockout e se
houver uma etapa explícita de refinamento.

### 3. Primitivas não são gramática de família

**O que aconteceu:** a existência de cubos e cilindros resolveu “há volumes
nesta posição”, mas não resolveu o caráter de uma prensa: garganta, chassi
estrutural, alojamentos, mesa, guias, acionamento e relação funcional entre
eles.

**Por que é genérico:** a forma reconhecível de um veículo, robô ou máquina vem
de relações entre volumes, não da soma de primitivas coloridas.

**Regra:** antes de gerar a malha, declarar a gramática mínima da família: quais
volumes são obrigatórios, quais relações os conectam, quais vazios definem a
silhueta e quais interfaces provam a função.

### 4. Resolução de malha escolhida sem olhar a silhueta

**O que aconteceu:** componentes visíveis usaram cilindros com 16, 24 e 32
lados. A receita era válida, mas as rodas, eixos e superfícies circulares ficaram
claramente facetados.

**Por que é genérico:** baixa resolução aparece em qualquer peça curva vista de
perto, enquanto resolução excessiva em partes escondidas só aumenta custo sem
melhorar a leitura.

**Regra:** escolher lados por raio, curvatura, distância da câmera e importância
na silhueta. Toda superfície circular protagonista deve ser inspecionada em
vista ortográfica e em aproximação; cada detalhe pode ter orçamento diferente.

### 5. Coordenadas soltas sem cadeia de apoio

**O que aconteceu:** cada componente recebeu um `em: [...]` independente. A
receita não carregava uma cadeia verificável do piso à base, da base à estrutura,
da estrutura ao acionamento e do acionamento ao elemento móvel.

**Por que é genérico:** posições absolutas acumulam pequenos erros e não
explicam o que deve permanecer alinhado quando uma dimensão muda.

**Regra:** estabelecer eixos, origem, plano de apoio e referências de montagem
antes dos detalhes. Para cada parte, deve ser possível responder: apoiada em quê,
alinhada por qual eixo, com qual folga e afetada por qual alteração.

### 6. Teste estrutural verde usado como aceite visual

**O que aconteceu:** a receita executou e seu teste passou, mas a imagem ainda
mostrava uma forma muito simplificada e problemas de leitura espacial.

**Por que é genérico:** testes de import, identidade, contagem e fechamento não
medem proporção, reconhecimento, acabamento, continuidade visual ou semelhança
com uma referência.

**Regra:** separar gates: estrutural, geométrico, interfaces, montagem,
movimento e inspeção visual. Um gate verde não autoriza os demais; fora do
escopo deve ser `naoAvaliavel`, nunca aprovação por ausência de erro.

### 7. Uma vista bonita esconde a montagem ruim

**O que aconteceu:** a perspectiva podia tornar a composição legível, embora
uma vista ortográfica revelasse vãos, desalinhamentos, espessuras ou relações
fracas entre as partes.

**Por que é genérico:** perspectiva, sombra e oclusão escondem erros em carros,
robôs e máquinas; uma peça pode parecer correta de frente e falhar de lado ou
por cima.

**Regra:** definir vistas críticas por família. Validar frente, traseira, lados,
superior e perspectiva quando cada uma responder a uma pergunta diferente.
Uma vista não compensa a reprovação de outra.

### 8. Cor e material usados para compensar forma

**O que aconteceu:** cores fortes separaram volante, embreagem, chassi e mesa,
mas também deram sensação de definição a volumes ainda genéricos.

**Por que é genérico:** contraste pode melhorar a leitura sem corrigir espessura,
encaixe, escala, perfil, vazio ou continuidade.

**Regra:** primeiro validar silhueta e montagem em material neutro; depois usar
material para comunicar função, acabamento e diferença entre componentes. Cor
não é evidência de forma correta.

### 9. Detalhe adicionado antes do envelope funcional

**O que aconteceu:** a receita colocou volante, botoeira, guias e pequenos
componentes antes de provar completamente o envelope de trabalho, o caminho de
carga e o alinhamento entre mesa, martelo e acionamento.

**Por que é genérico:** detalhes precoces criam uma máquina ou robô ocupado, mas
não garantem que o conjunto tenha espaço para operar, girar, articular ou ser
montado.

**Regra:** validar nesta ordem: envelope e escala; volumes estruturais; interfaces
e apoios; movimento e folgas; silhueta; detalhes; materiais. Detalhe que não
serve a uma relação, função ou leitura deve esperar.

### 10. Relação semântica confundida com relação mecânica

**O que aconteceu:** nomes como `marteloSlide`, `eixoExcentrico` e
`fusoAjusteMartelo` explicavam a intenção, mas não garantiam curso, eixo comum,
transmissão ou contato funcional.

**Por que é genérico:** chamar algo de roda, junta, pistão ou braço não faz a
geometria cumprir esse papel.

**Regra:** para cada relação funcional, declarar o papel mecânico, os eixos, o
pivô ou trajetória, os limites e a evidência que permite verificá-los. Nomear é
necessário; provar a relação é obrigatório.

### 11. Refinamento global no lugar de correção localizada

**O que aconteceu:** seria tentador aumentar todos os lados, suavizar tudo ou
aplicar o mesmo acabamento à montagem inteira para esconder a aparência
low-poly. Isso elevaria custo sem corrigir apoios, proporções ou componentes
errados.

**Por que é genérico:** suavização global também pode destruir quinas funcionais,
identidade de peças e diferenças de escala.

**Regra:** cada reprovação deve apontar parte, vista e contrato afetados. Corrigir
o marco local, re-renderizar as vistas afetadas e só então decidir se a mudança
precisa propagar.

### 12. Referência e intenção esquecidas durante a execução

**O que aconteceu:** a receita guardou parâmetros e nomes, mas não carregou para
cada decisão a pergunta visual ou funcional que justificava a forma.

**Por que é genérico:** sem intenção rastreável, a IA otimiza o que é fácil de
gerar — caixas, cilindros, simetria e cores — em vez do que torna o objeto
reconhecível e utilizável.

**Regra:** cada grupo relevante deve ter intenção, referência ou priors de
família, relações esperadas e vista de verificação. Se a decisão não pode ser
explicada, ela não deve ser tratada como fato do modelo.

## Checklist antes de aceitar uma receita

- A origem, os eixos, a escala e o plano de apoio estão explícitos?
- Toda parte estrutural tem apoio, interface ou relação de montagem verificável?
- A hierarquia semântica está separada das transformações físicas?
- O envelope funcional existe antes dos detalhes decorativos?
- A resolução das curvas foi escolhida pela silhueta e pela distância de inspeção?
- A receita usa a operação adequada para a forma, em vez de acumular cubos?
- As vistas críticas mostram continuidade, folga, alinhamento e reconhecimento?
- Os testes verdes cobrem exatamente o que afirmam cobrir?
- O material neutro continua convincente sem depender das cores?
- Cada reprovação aponta uma correção localizada e uma nova evidência?

## O que a IA deve entregar junto com a forma

Uma autoria concluída deve entregar, além da receita executável:

1. envelope, escala, eixos e plano de apoio;
2. mapa de partes e relações físicas, separado da hierarquia semântica;
3. intenção ou prior de família para cada volume importante;
4. orçamento de resolução para curvas visíveis;
5. vistas críticas e perguntas de inspeção;
6. resultados estruturais e geométricos, incluindo o que não foi avaliado;
7. lista de pendências visuais, sem promover um blockout como final.

## Limite honesto

Este documento não transforma o motor em um solver de montagem nem substitui
julgamento visual. Ele define o comportamento mínimo da autoria para que as
limitações existentes sejam declaradas, medidas e corrigidas, em vez de serem
confundidas com sucesso.
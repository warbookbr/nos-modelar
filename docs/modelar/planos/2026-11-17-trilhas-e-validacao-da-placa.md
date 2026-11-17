# Trilhas de cobre e validação elétrica da placa declarada: a lista de ligações vira cobre conferido por regra e por conectividade

**Estado:** rascunho

**Território:** a declarar ao ativar. O provável é uma pasta nova `procedural/familias/componente-eletronico/cobre/` (o leitor da lista, o traçador, o conferidor e o mapa das redes), `procedural/familias/componente-eletronico/placa.js` (a placa passa a ler o traçado salvo e a abrir as camadas das faces onde há cobre), `tools/modelar/tracar-placa.mjs` e `tools/modelar/conferir-placa.mjs` com os testes deles, `procedural/pecas/braco-robotico/partes/base/` (a lista, o traçado salvo e a receita) e `docs/modelar/banco-de-provas/trilhas-da-placa-<data>/`.

**Responsável:** a IA da sessão implementa; Tiago decide a emenda do invariante descrita abaixo, aprova o formato da lista pelo exemplo e aprova a forma por imagem.

**Repositório e base:** `warbookbr/nos-modelar`, main na ativação, depois do fechamento do [plano da família de componentes eletrônicos](../decisoes/PLANOS-ENCERRADOS.md), como a pessoa decidiu em 2026-11-17. O outro lado é `warbookbr/nos-mecatronica`, pelo contrato da ponte (`ponte/README.md` de lá) e pelas decisões 0001 e 0004 de lá.

Pedido pela pessoa em 2026-11-17, ao perguntar se a placa de controle do braço "vai ter os trilhos de cobre e ser validada". É plano próprio, fora dos dois que o [plano-raiz da mecatrônica](2026-11-16-eletronica-no-modelar.md) gerou, e depende da [ponte com a mecatrônica](2026-11-16-ponte-com-a-mecatronica.md) para a lista real chegar.

## Problema observado

A placa declarada da família (`procedural/familias/componente-eletronico/placa.js`, no ramo `familia`, commit 5039a02f) gera o laminado, os furos dos terminais e de fixação e as ilhas de cobre em volta de cada terminal nas duas faces, confere a folga de 0,15 mm entre ilhas e de 0,3 mm até a borda, e publica cada terminal com o id, a posição no plano da placa e a seção. A placa de controle do braço, de 165 por 100 mm com 189 furos, fica em pé na caixa lateral da base pela pose declarada. Nenhuma ilha está ligada a outra: a placa não tem trilha, nenhuma ligação elétrica chega ao Modelar, e nada confere que o cobre de uma placa liga o que deveria ligar sem unir redes diferentes. O plano da família deixou as trilhas de fora, como relevo sem significado elétrico, e o da ponte deixou a netlist do lado da mecatrônica.

Do lado da mecatrônica, a matriz tem as linhas `lig-pino-no-lugar`, `lig-curto` e `lig-cobre-confere` como dela; esta última confere o cobre lido de um Gerber de placa existente. O candidato "Ligações elétricas do objeto" do backlog de planos de lá vai produzir a netlist do braço a partir da ficha, e ainda não é plano.

## Resultado

A placa declarada recebe a lista de ligações (cada rede com os terminais que ela une e a largura e a distância exigidas), o traçador escreve o traçado das trilhas nas duas faces com vias, a placa gera esse cobre, e o conferidor recusa, citando a rede, os terminais, a face, o ponto e o valor medido, toda violação de largura mínima, distância entre cobres, distância à borda, furo e anel, toda rede que não vira cobre contínuo e todo cobre que une duas redes; a placa de controle do braço sai traçada e conferida com zero violação.

## A emenda que a pessoa decide antes de ativar

O plano-raiz diz que "o Modelar não lê código da mecatrônica nem guarda ligação, circuito ou resultado de simulação", e o plano da ponte exclui a netlist. Traçar cobre exige saber que terminais são a mesma rede, e a regra de que conteúdo salvo é reexecutável exige que essa lista fique no Modelar ao lado da receita. A emenda proposta é esta: a lista atravessa como item do pedido, que é o arquivo que já volta da mecatrônica, e o Modelar guarda a cópia do pedido recebido, sem editá-la, como entrada da receita da placa. O que o Modelar sabe dela é topologia (estes terminais são uma rede) e exigência de forma (largura e distância mínimas por rede); tensão, corrente, polaridade, tipo de sinal e a decisão de quais redes existem continuam do lado de lá. A recomendação é aceitar a emenda, que muda uma frase no invariante do plano-raiz e o item da netlist no Excluído da ponte, porque a forma do cobre é do Modelar pela decisão 0001 de lá e cumprir um pedido com conferência é o fluxo que a ponte já prevê. Sem a emenda, este plano não se ativa.

## Filtro Agent-First

Lista de ligações: ENVOLVER o pedido da ponte com um item novo, provisoriamente `ligacoes`, que cita a placa pelo id e traz as redes, cada uma com o id, os terminais como portas `{ peca, porta }` da ficha e, opcional, a largura e a distância mínimas que a camada elétrica de lá calcula pela corrente e pela tensão. A intenção é "ligue estes terminais com este cobre", sem circuito. Enquanto a ponte não leva o item, a lista vem de um exemplo escrito à mão no formato proposto, como a fatia 1 da ponte fez com a ficha e o pedido, com os números marcados como exemplo. Descartados: o Modelar escrever a netlist, que é de lá; ler o arquivo de ligações em `objetos/` do outro repositório, que a 0001 proíbe; e um formato de terceiro como a netlist do KiCad, que não usa o identificador da ficha.

Traçado das trilhas: CRIAR um traçador automático como ferramenta de autoria, que lê a placa declarada, a lista e as regras e escreve o traçado salvo, e fazer a receita ler só o traçado salvo, que passa a ser declarado. Ele é roteador em grade sobre as duas faces, com via onde troca de face, ordem das redes fixa (a da lista) e desempate fixo, de modo que a mesma entrada dá o mesmo arquivo byte a byte. O autor intervém por dois campos declarados na placa: trechos fixos de uma rede, que o traçador mantém, e áreas proibidas ao cobre. Descartados: traçar a cada geração, que mudaria a forma aprovada quando o traçador mudasse e somaria o tempo do traçado a cada geração; e o traçado inteiro à mão, que na placa do braço são centenas de trechos, com custo de contexto e erro altos.

Regras de projeto: ENVOLVER a tabela `PLACA` da família, que já tem a folga entre cobres, a distância à borda, a folga do furo e o anel, com a largura mínima da trilha, a largura padrão, o furo e o anel mínimos e a medida da via, cada valor como estimativa de fabricação comum com a fonte, como os que existem. A largura e a distância de uma rede no pedido valem acima da regra geral, nunca abaixo.

Conferidor: CRIAR uma função pura que recebe os polígonos de cobre de cada face (ilhas, trilhas e vias), os furos e a lista, e mede as regras e a conectividade sem ler o rótulo de rede que o traçado dá a cada trecho: une o cobre que se toca em cada face, liga as faces pelos furos que têm ilha nas duas, e então confere que cada rede cai num só pedaço de cobre e que nenhum pedaço tem terminais de duas redes. A placa o chama antes de gerar passo e recusa com `ErroFamilia`, como já recusa a folga; o comando `conferir-placa` devolve o relatório em JSON e o mapa das redes. Terminal fora da lista, como a aleta do dissipador, é cobre isolado e sai no relatório como sem rede.

Geometria do cobre: USAR DIRETO a `extrusao` com furos e a CrossSection da Manifold pelo `perfil2d.js` para unir e deslocar polígonos. As camadas das faces passam a ser abertas onde há cobre, para a face continuar plana e o componente continuar assentando nela. O núcleo não muda nem ganha palavra de eletrônica; se faltar capacidade, o plano para.

Identidade: a rede pelo id da lista, o trecho e a via pelo id da rede e o índice no traçado salvo, e o traçado leva a chave das entradas (o SHA-256 da declaração da placa, da lista e das regras em forma canônica), para a placa recusar traçado velho depois que um componente se move.

ADIAR: o comando MCP, a máscara de solda e a serigrafia (material novo pede plano), o Gerber de fabricação, o plano de terra em área cheia, o barril metalizado do furo como geometria (hoje não modelado) e a exportação do cobre na ficha para a mecatrônica conferir do lado de lá.

## O formato salvo

A lista recebida é a cópia do pedido, em `procedural/pecas/<objeto>/partes/<parte>/<placa>.pedido.json`, com o item de ligações da placa; o Modelar escreve só a `resposta` do item, como a ponte prevê. O traçado salvo fica ao lado, em `<placa>.tracado.json`: a versão do formato, a chave das entradas, as regras usadas, e por rede os trechos (face, largura, pontos [x, z] em mm no plano da placa, na grade de 0,001 mm), as vias (centro, furo e anel) e a origem de cada trecho, traçado ou declarado. A receita passa o traçado à placa declarada por um campo opcional `cobre`; sem ele a placa gera como hoje, e as outras peças do acervo não mudam.

## O que precisa do lado do nos-mecatronica

Lá, pelo fluxo daquele repositório e pela 0004, o item de ligações entra no esquema do pedido como versão 1.1 (tipo de item novo, opcional), com o SHA-256 em `versoes.json`, e o conferidor de lá passa a recusar porta inexistente e porta citada em duas redes. A camada elétrica de lá é quem dá a largura e a distância por rede, pela corrente e pela tensão; até isso existir, o exemplo declara os valores como exemplo. O candidato das ligações elétricas de lá, quando virar plano, produz a lista real do braço e a escreve nesse item, trocando o exemplo sem mudar código daqui. As portas que a ficha leva para os componentes da placa têm de ser os terminais que a placa publica, com os mesmos ids, o que é da fatia 2 da ponte. A matriz de lá ganha uma linha com o Modelar como dono para o cobre traçado e conferido, e `lig-cobre-confere` continua de lá. Este plano entrega o exemplo e o texto da proposta; quem muda o esquema é a mecatrônica.

## Incluído

- o exemplo à mão da lista no formato proposto, para a placa de prova da família e para a placa de controle do braço, e o texto da proposta do item para a mecatrônica;
- as regras de projeto declaradas em `PLACA`, com fonte;
- o conferidor de regras e de conectividade, com fixtures erradas, uma por regra, mais rede aberta, curto, terminal inexistente, terminal em duas redes e traçado velho;
- a placa declarada gerando trilhas e vias pelo traçado salvo, com as camadas das faces abertas onde há cobre;
- o traçador automático e o comando que escreve o traçado salvo e o relatório;
- o mapa das redes, uma imagem de cada face com cada rede numa cor, os terminais rotulados e as violações marcadas;
- a placa de controle do braço traçada e conferida, e a resposta no item do pedido.

## Excluído

- tensão, corrente, polaridade, tipo de sinal e a verificação do circuito, que são da mecatrônica;
- mudar posição de componente aprovada para o traçado caber sem a aprovação da pessoa;
- a mudança do esquema da ponte, que é feita lá;
- placa de mais de duas camadas, impedância controlada e par diferencial.

## Gate de saída

1. Na placa de prova e na placa do braço, o relatório do conferidor dá zero rede aberta e zero curto, e traz o mínimo medido de largura de trilha, de distância entre cobres de redes diferentes, de distância à borda, de furo e de anel, cada um igual ou acima da regra declarada ou da exigência da rede.
2. Cada fixture errada é recusada com a rede, os terminais, a face, o ponto [x, z] e o valor medido contra a regra, por teste; e um teste que troca o rótulo de rede de um trecho mostra que o conferidor acha o mesmo curto, porque mede pelo cobre.
3. O traçador rodado duas vezes sobre a mesma entrada escreve o mesmo arquivo byte a byte, e a base do braço gerada duas vezes dá a mesma malha.
4. O tempo de geração da base com o cobre fica dentro do limite fixado na fatia 1 a partir da linha de base medida nela; a proposta é até o dobro.
5. O mapa das redes das duas faces e a placa em 3D de cima e de baixo, e o braço de perto pela janela da caixa, aprovados pela pessoa por imagem.
6. O retrato do acervo só muda na base do braço, `node tools/modelar/guardas/guarda-acervo.mjs braco-robotico` sem reprovação nova, e os testes da família passam.
7. Nenhum arquivo do núcleo menciona trilha, rede ou eletrônica, conferido como no gate da ponte.
8. A nota de uso na família, no catálogo e na skill de criar peça, e a proposta do item entregue à mecatrônica, com o estado dela registrado no fechamento.
9. As decisões do Filtro Agent-First conferidas contra o que foi feito.

## Fatias

1. A linha de base e o contrato: medir o tempo de geração da placa de prova e da base do braço como estão, fixar o limite do item 4 do gate, declarar as regras em `PLACA` com a fonte, e escrever o exemplo à mão da lista das duas placas e o texto da proposta para a mecatrônica; a pessoa lê o exemplo e aprova o formato.
2. O conferidor e a geometria primeiro, sobre um traçado declarado à mão na placa de prova: a placa gera trilhas e vias, as camadas das faces abrem onde há cobre, o conferidor passa o certo e recusa cada fixture errada, e o mapa das redes sai para a pessoa.
3. O traçador automático na placa de prova, com o comando, o relatório das redes traçadas e não traçadas e o teste de determinismo, conferido pelo conferidor da fatia 2.
4. A placa de controle do braço traçada e conferida, com a medida de tempo, o retrato do acervo e as imagens para a pessoa.
5. A resposta no item do pedido, a documentação, o banco de provas e o fechamento.

## Riscos e parada

A pessoa aceitou a emenda do invariante em 2026-11-17: o Modelar guarda a cópia do pedido recebido da ponte como entrada da receita, sem editá-la, só com a topologia e as exigências de forma, sem circuito; os textos do plano-raiz e da ponte se ajustam na ativação. Se o traçador não fechar todas as redes do braço dentro das regras, o plano para com a lista das redes não traçadas e a região congestionada, e a pessoa decide entre mover componente, aumentar a placa ou declarar à mão os trechos dessas redes; a regra não é afrouxada para caber. Se o tempo de geração passar do limite da fatia 1, o plano para: o custo da tampa da extrusão com muitos furos, já medido em 34 s numa camada de 189 furos, é do núcleo e vira plano próprio, e o corte em faixas da placa terá de recortar as trilhas que cruzam a faixa. Se abrir as camadas das faces pelo cobre exigir capacidade que a `extrusao` não tem, como a ilha de laminado cercada por uma trilha, o plano para e a capacidade vira plano. Se a mecatrônica não publicar a versão com o item até a fatia 5, o plano fecha a fatia 4 e espera, sem fechar sobre um formato que só existe aqui. A família e a ponte declaram `procedural/familias/componente-eletronico/` e `procedural/pecas/braco-robotico/`, e este plano não se ativa enquanto a família estiver ativa; com a ponte ativa ao mesmo tempo, os territórios se separam por arquivo antes da ativação.

## Fechamento

A preencher.

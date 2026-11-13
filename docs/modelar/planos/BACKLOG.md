# Backlog aberto

Este arquivo lista candidatos. Nenhum item é autorização de implementação.
Candidatos ligados à direção de autoria precisam respeitar as invariantes de
[`AUTORIA-IA.md`](../guias/AUTORIA-IA.md) e
[`MONTAGENS-SEMANTICAS.md`](../usar/MONTAGENS-SEMANTICAS.md).

| Candidato | Próximo recorte |
|---|---|
| Formato canônico de montagem recursiva | definir o menor formato que instancia peças e montagens, preserva identidade e não copia autoria geométrica |
| Alteração semântica compacta | mudar por ID/campo, recompor documento completo e confirmar bytes finais |
| Histórico operacional e variantes | comparar, reativar como nova transição e ramificar sem mover estado ativo implicitamente |
| Onboarding e custo de contexto | medir leitura e inspeção com o MCP aprovado, sem confundir economia de contexto com capacidade de autoria |
| Seleção de contexto pela IA | medir como a IA escolhe alvos, pares, subárvores e conjuntos sem carregar o sistema inteiro |
| Diagnóstico visual estruturado | ligar medidas e falhas a entidades visíveis por identidade semântica |
| Costuras topológicas de `lathe` | investigação de núcleo, sem alterar receita por atalho |
| Endereço único para grupo linear | capacidade semântica aberta |
| Abertura oblonga | ainda não expressável; não simular com pintura |
| Contrato genérico de materiais | coberto em 2026-10-19 pelo plano [receitas com material e textura](../decisoes/PLANOS-ENCERRADOS.md), na forma de escolha de material por peça e textura gerada; o brilho por material entrou no plano dos objetos externos (fatia 5), e PBR completo e paleta nova seguem fora |
| Movimento e espaço varrido | exige montagem, pose e relações persistidas antes de solver ou cinemática geral |
| A-4, A-6, A-7, A-8, A-16 e A-29 | capacidades abertas comprovadas, sem inventar IDs novos |
| Fechamento de tampas em anel (sólidos ocos) | evidência em `cabo-de-pa-bambu`: dois lofts concêntricos geram tubo aberto nas extremidades, e o motor não tem primitiva para costurar o anel entre as bordas de dois perfis coaxiais. Malha não-manifold, volume incalculável, STEP falha em sólido. Afeta qualquer peça oca. Sem contorno hoje |
| Medida de ângulo e comprimento contra a imagem de referência | sem ela, reprovar por proporção depende do olho do revisor; o laço de modelagem registrou isso como o que limita o resultado dele |
| Curva medida como parâmetro | parte cuja forma nasce de polilinha, como o tubo inferior da bicicleta, continua sem controle na bancada: a leitura desce em coordenada e para em lista de listas |
| Módulo compartilhado de tubos | `secao` e `tuboPerfilado` vivem dentro de `bicicleta-quadro.js`; a próxima peça que quiser tubo achatado recria as duas |
| Geometria exata e visão: OpenCASCADE, Manifold no esboço e Segment Anything | teste rápido de cada um depois do plano do desenho sem referência, pedido pela pessoa em 2026-10-14, na ordem e com as adaptações de identidade de face da [análise](../pesquisas/PESQUISA-ABERTA-2026-10.md#geometria-exata-e-visão-para-o-modelar-análise-de-2026-10-14) |
| Teste da família de superfície aerodinâmica | é o arquivo mais lento da bateria (cerca de 5,5 minutos, um teste só passa de 2) e o resumo dos gates o aponta acima do teto de 120 s; medir por etapa e encurtar sem perder cobertura, como o teste da blocagem no plano do avião. A pessoa perguntou em 2026-10-14 como acelerar os gates, e a máquina da sessão tem quatro processadores sem folga |
| Sombra no chão no contorno da imagem | a sombra da empilhadeira nova acaba em degradê até o branco, e a parte `sombra`, fora do modelo, fica em 0,373 na borda contra o mínimo de 0,8 sem que semente nenhuma resolva; o mínimo de borda devia dispensar a parte fora do modelo cuja borda com o fundo é degradê, ou a ferramenta ganhar uma opção para sombra no chão |
| Folhas de divisa do contorno da imagem | os recortes saem no tamanho natural de cada divisa, e uma divisa grande toma a folha inteira enquanto as pequenas ficam finas no meio do branco; a folha 1 da [empilhadeira nova](../banco-de-provas/empilhadeira-2026-10-14/referencias/empilhadeira_lateral.pacote/roteiro.md) tem 2620 x 2904 px e chega ao crítico a cerca de 70%. Igualar a altura dos recortes de cada linha e quebrar a divisa grande em pedaços; pedido pela pessoa em 2026-10-14 |
| Paleta do mapa de partes | uma parte clara pintada a 20% sobre a linha escura do traço sai quase da cor de uma parte escura (o capô sobre o traço deu o verde do piso), e o crítico do contorno da [carcaça](../banco-de-provas/empilhadeira-2026-10-09/referencias/carcaca_lateral.pacote/roteiro.md) apontou isso como defeito em duas rodadas; a cor do mapa precisa ficar distinta sobre o traço |
| Pontas agudas cortadas pelo alisamento do contorno | o `denteMaximo` do contorno da imagem corta ponta aguda (5 px numa ponta de 21 graus) e tirou de 102 a 138 mm das pontas das pás no topo do avião; o teste sintético do [levantamento](../decisoes/HISTORICO-RETIRADO.md), com a forma verdadeira conhecida, vira o gate |
| Porta de família que não acompanha o giro | na [hélice do avião](../../../procedural/pecas/aviao/partes/helice/receita.js), em 2026-10-15, o modelador relatou que a família publica as portas da pá no quadro local e `rotaciona` não as leva junto, o que dá porta fora do plano; a receita filtra as portas da expansão. Pede reproduzir num teste do núcleo antes de corrigir |
| Bloco de 1000 identificadores por forma no loft | na [empenagem horizontal do avião](../../../procedural/pecas/aviao/partes/empenagem-horizontal/receita.js), em 2026-10-16, o loft dos suportes do profundor com 52 pontos por seção só coube em 18 estações; com mais, a receita lançou erro por estourar o bloco de ids da forma. Pede medir quantas peças esbarram nisso antes de mudar o tamanho do bloco |
| Sessão de captura órfã da bancada | desde 2026-10-15 cada captura headless grava a peça num arquivo próprio em `tools/bancadas/out/sessoes/` e o apaga ao fim; um processo que morre no meio deixa o arquivo lá, e nada limpa os órfãos |
| Atritos abertos da segunda rodada do avião | 38 atritos em seis grupos na [classificação](../banco-de-provas/aviao-2026-10-11/CLASSIFICACAO.md#segunda-rodada); a pessoa escolheu em 2026-10-13 a integração do detalhe com o mestre (34, 40, 28, 5, 20, 30, 35, 11, 15 e 9) como o primeiro grupo a puxar, depois do plano do desenho sem referência |
| Tradutor do BlendNet como ferramenta | a [sonda de 2026-10-16](../banco-de-provas/importar-objeto-2026-10-15/sondas-2026-10-16/blendnet/RESULTADO.md) traduziu scripts do Blender em esboço sem rodar o Blender, em Python fora do repositório; virar comando do esboço daria rascunho de objeto simples com peças nomeadas em segundos |
| Arredondamento verdadeiro na porta do aparelho | a porta de `aparelho-de-caixa` tem chanfro de 2 mm porque a união com o arredondamento falhou; investigar a falha da união antes de trocar |
| Teto de chanfro do tradutor de receitas | o tradutor limita o chanfro a 20% da menor medida e corta 247 caixas das 66 receitas; o esboço aceita quase a metade; testar o gate com essas 247 antes de subir o teto |
| Peças de receita com corte, curva ou afinamento | 16 peças das receitas externas ficam fora do tradutor, e a torneira de `sanitario_quimico` tem perfil que se cruza na própria receita de origem |
| Toro no esboço | o esboço não tem a forma de anel ou boia; ela respondeu por 10,6% das recusas do BlendNet e aparece em pneu, alça e argola |
| Texto e ícones sobre o objeto | o painel do micro-ondas branco, o da lava-louças compacta e o da lavadora-secadora têm nomes de função, ícones e dígitos que só existem na imagem de referência; o núcleo não modela texto, e o módulo de textura não tem etiqueta (decalque). Quando a textura ganhar escrita, esses painéis são as primeiras peças a alterar, e cada receita lista no cabeçalho o que a imagem escreve |
| Custo do diagnóstico de parâmetros do acervo | `diagnosticar_parametros` com `acervo` custa a soma de cada peça, porque cada parâmetro da TABELA reconstrói a peça inteira: 76 s com 30 peças e 12,6 minutos (755 s) com 48 alvos em 2026-10-20 (trator-pa 77 s, trator-sirene 68 s, caminhao-lixo 54 s, mediana abaixo de 15 s). Os testes de encanamento (`parametros-peca.test.mjs` e `tools/mcp/perfis/parametros.test.mjs`) já não pagam isso: varrem um acervo de três peças pela opção `raiz`, e o acervo real é conferido uma vez por `tools/modelar/acervo-real.test.mjs` (lento, com teto de 40 s por alvo e o custo por peça impresso). Resta cortar o custo em si, medindo só os parâmetros de cada peça que mudaram |
| Afinamento do pé da mesa quadrada | o pé de `mesa_pes_recortados_escura` tem afinamento de 12 mm em dois lados perto do chão, recusado pelo tradutor de receitas; `mesa-quadrada-escura` usa pé reto de 80 por 80 mm |
| Brilho do material | o módulo de textura não tem lustro; um campo opcional `brilho` mapeado para Ks e Ns do `.mtl` daria o acabamento polido dos eletrodomésticos, mas é PBR e só entra com plano |
| Faces finas e n-gons em peças com `subtrair` e `arredondarAresta` | `malha:conferir` reprova a topologia da lava-louças compacta, da lavadora-secadora e de outras peças com corte e arredondamento; os guardas só alertam, sem reprovar. A parte dos veículos (a face fina do `subtrair` de cilindros na perua) foi resolvida no plano encerrado dos [ajustes no núcleo dos veículos](../decisoes/PLANOS-ENCERRADOS.md), fatias 1 e 10; a lava-louças e a lavadora-secadora seguem aqui |
| Arredondamento verdadeiro em volta de polígonos facetados | o puxador curvo da `lava-loucas-compacta-branca` é um arco facetado, e o arredondamento de aresta não acompanha o contorno de polígonos; o vértice solto do `arredondarAresta` em forma facetada foi resolvido no plano encerrado dos [ajustes no núcleo dos veículos](../decisoes/PLANOS-ENCERRADOS.md), fatia 7, e o arredondamento que acompanha o contorno segue aqui |
| Migrar as receitas do acervo para as funções novas do núcleo | o plano encerrado dos [ajustes no núcleo dos veículos](../decisoes/PLANOS-ENCERRADOS.md) resolveu no núcleo o vértice colinear do perfil (fatia 6), o ponto repetido e a revolução aberta (fatia 2) e o contato em plano inclinado (fatia 8), mas deixou as receitas como estavam, porque são peças aprovadas: os limpadores de contorno copiados, o zigue-zague de 1 mm do `carro-sedan-angular` e o encaixe de 1 mm continuam nelas; a migração muda a forma e pede plano próprio, com o retrato do acervo como régua |
| Sete regras próprias sem recusa | o inventário de regras refeito em 2026-10-27, no fim do plano da [leitura por demanda](../decisoes/PLANOS-ENCERRADOS.md), confirmou sem cobrança de ferramenta: o passo "pare e analise" antes de declarar a forma pronta, o `--cores` em peça de várias partes e a peça com vizinho aprovada só em `isolar`, a legibilidade cega antes de a forma ir à pessoa, `Date.now` e `Math.random` crus em receita, material PBR ou paleta nova, a existência da prova citada no `UPSTREAM-NOS.md` e os contatos declarados antes de medir; cada uma vira recusa com teste quando um plano a puxar |
| Nome antigo no endereço do servidor MCP e nas globais da bancada | `mecanifica://` nos recursos do servidor MCP e as globais `__mecanificaSessao`, `__mecanificaBancada` e `__mecanificaVisorMontagem` na bancada ficaram como exceção do `nome:check`; trocar o endereço exige avisar quem já configurou o servidor, e as globais são só do nosso código |
| Conferência de âncora nos links dos documentos | o `docs:links:check` confere o arquivo e não a âncora depois de `#`; um link do backlog ficou apontando um título renomeado até o `nome:check` achar |
| Camadas antigas da bateria ao lado do seletor | a bateria curta por pasta (`GATES_CURTOS`) e os gates por caminho (`GATES_POR_CAMINHO`) em `tools/gates.mjs` são de antes do seletor e decidem pelo ramo remoto; ver se o seletor sozinho cobre o que elas pulam e tirá-las |
| Leitura do Python pelo caminho calculado | o registro de leituras anota o arquivo dado a um programa que não é node e a pasta dele, e não o que o script abre por caminho montado dentro dele; um teste de Blender que leia um JSON longe do argumento escaparia, coberto hoje só pelo CI |
| Quina implícita na compensação da gaiola por laços | `compensar` em `gaiolaPorLacos` move o ponto da quina de um contorno (o canto sem vinco entre um trecho reto e outro) até 59 mm para fora num corpo de 960 mm, e a superfície sai 11,5 mm da lateral reta; em 2026-11-10 entrou o aviso `compensacaoPassa`, que mede isso, e a conta ficou como estava. A correção medida em protótipo é deixar parado o ponto em que o contorno declarado vira mais de 15 graus em 1 mm: o corpo de prova vai a zero, e a gaiola das peças que já usam `compensar` muda até 1,7 mm (coluna 0,87, L 1,67, tubos fatiados 1,64, tubos 0,67, dobra 0), com as assinaturas tiradas de novo. Pede decisão da pessoa, porque mexe em peça aceita. O degrau entre laços (13 mm sem compensar, 17 com) fica sem medida |
| O que o protetor e o posto da empilhadeira pediram às ferramentas | montados em rascunho em 2026-11-10 (`ATRITOS.md` da empilhadeira, item 16): `conferir:vistas` não aceita vista sem imagem, só com contornos em mm (a lateral da máquina inteira); `sobra:partes` conta por cheio o vão de um quadro vazado e não tem vistas por par; o esboço não tem varredura de seção ao longo de um caminho para coluna, tubo e perfil dobrado; o relato de contatos não separa apoio em face curva de travessia; e o registro da leitura usa formatos diferentes para `aceitas` e `decididas` |
| O que as receitas da empilhadeira pediram à montagem e ao pacote do crítico | etapas oficiais de 2026-11-10 (`ATRITOS.md` da empilhadeira, itens 20 e 21, e os registros em `procedural/pecas/empilhadeira/partes/*/rodadas/`): a montagem v5 só mede encaixe cilíndrico e assento anular, sem plano sobre plano (o suporte do eixo traseiro sob o fundo do poço), sem guia (o canal interno no externo) e sem articulação entre instâncias (o giro das rodas, o esterço, a inclinação e a elevação da torre), e a pessoa aceitou em 2026-11-10 a junta do eixo traseiro medida pelo alinhamento com os poços até a relação existir; a montagem recusa nomear a etapa sem receita; o pacote do crítico não tem vista em corte no plano de um encaixe, e dois críticos leram como defeito o assento do eixo dianteiro, medido a 0,5 mm do teto do entalhe; `vistas:superficie` suaviza a 30 graus fixos e ignora o `liso` da receita; `npm run parametros` não termina com TABELA em listas de contorno; o crítico troca de defeitos entre rodadas com a mesma nota e a contradição só aparece a quem lê os dois vereditos; e quatro testes do CI reprovaram por carga da máquina em três execuções (a razão de tempo do vão na cúpula e as esperas fixas de duas guardas da bancada) |
| O que a carcaça inteira da empilhadeira deixou sem medida | montada e corrigida em 2026-11-10 em quatro vistas (`ATRITOS.md` da empilhadeira, item 15): o casamento da vista usa uma escala só, e a vista de frente de IA tem altura e largura em escalas 27% diferentes; o contorno em arco é facetado pela simplificação de 6 mm e foi ajustado a um círculo dentro do módulo (`ladoSuave`), sem ajudante geral; o corpo de `lacosPelasVistas` subdividido sem `compensar` encolhe 10 a 15 mm a silhueta nos degraus e nenhuma ferramenta mede isso contra a silhueta pedida; e não há campo para a medida que duas vistas dão diferente (a aba do paralama, o pé da lateral) |
| A receita de peça como entrada da conferência de vistas | `npm run conferir:vistas` (2026-11-10) roda numa chamada, para uma opção de esboço, as linhas do modelo, o casamento com a referência, a leitura por regiões e a sobra entre partes, com as vistas e as cores declaradas numa config. A receita de peça fica de fora: `PLANO.referencias` é uma lista de caminhos, sem vista nem caixa, e o laço de modelagem usa `vistas:critica`. A entrada pela receita encosta em `src/autoria/plano-de-modelagem.js`, do plano de ferramentas de conferência e de vista |
| Captura de tela recusada pelo Chromium | `svgParaPng` em `tools/modelar/esboco.mjs` falhou uma vez no CI com "Unable to capture screenshot" e passou nas rodadas seguintes; sem causa achada, reabrir se repetir Em 2026-11-09 a maquete da empilhadeira repetiu a falha em `npm run esboco:nucleo` (`page.screenshot`): sempre com `--vista direita` ou `esquerda` sozinha e em cerca de metade das capturas de quatro painéis, num ambiente com o headless 1243 no lugar do 1194; tentar a captura de novo resolveria (`docs/modelar/banco-de-provas/empilhadeira-2026-11-09/ATRITOS.md`). No mesmo dia a causa no contêiner apareceu e foi corrigida em `tools/modelar/navegador.mjs` (o 1243 só cria WebGL pelo ANGLE); a falha do CI, no 1194, continua sem causa e o item fica para ela |
| Traseira da geladeira compacta | a `geladeira-compacta-branca` foi modelada a partir de duas imagens que não mostram a traseira, e ela ficou lisa |
| Vinco que segue curva livre e quebras de sombra nas cópias | o vinco da subdivisão segue colunas e estações da gaiola, e `espelha` e `arranja` não propagam `quebras`; as vistas da receita ignoram `liso` (fechamento do plano de [carroceria por subdivisão](../decisoes/PLANOS-ENCERRADOS.md)) |
| Velocidade do alisamento e do comparador de vincos | `npm run alisar` leva de 3 a 9 minutos por ciclo na carroceria e oscila entre 3 e 7 falhas, e `comparar-vincos` leva de 3 a 6 minutos por rodada; na rede de curvas do nono teste cego o alisamento levou uns 18 minutos e devolveu uma cópia com mais falhas que a receita |
| `curvas` e `interpolar` com `termina`, `comeca` e vinco em estação gerada | os dois modeladores do sétimo teste cego amostraram as curvas à mão porque as colunas geradas não aceitam `termina`, `comeca` nem `de`, e cada linha extra virou estação-chave |
| Medida de zebra e cota declarada na borda livre | a régua não mede listras de reflexo, e os pontos medidos na borda livre de vão ficam até 19 mm da superfície limite sem gate que compare a cota com a superfície |
| Método de modelagem sem medida de um objeto | a seção da aba de `modelar-carroceria.md` chegou a descrever a aba e o friso do trecho do teste cego com as medidas; nenhum gate confere que a instrução geral não carrega medida de um objeto |
| Curva paralela a outra na rede de curvas | no piloto da [rede de curvas](../decisoes/PLANOS-ENCERRADOS.md), o modelador não fez curvas em laço em volta do vão, por custo, e a topologia saiu em grade; um ajudante que gere a curva a uma distância de outra, sobre a superfície, e os retalhos entre as duas tiraria esse custo. Nenhum gate mede quantas curvas contornam um vão |
| Perfil de detalhe na borda livre de um vão | `ler-perfil` recusa o detalhe que fica na borda livre (sem chapa dos dois lados), e as molduras do piloto da rede de curvas foram medidas a olho na vista; uma leitura que tome a chapa de um lado só, com o erro dito, resolveria |
| Friso que segue a parede curva | o `friso` monta o perfil na normal da curva e não acompanha a parede onde ela curva, e uma moldura mais larga que a parede onde se apoia descolou dela no piloto da rede de curvas |
| Nó no meio de uma curva da rede | um nó nomeado para começar um detalhe no meio de uma curva deu divisões desiguais e duas faces côncavas, só pegas na exportação; o ajudante devia gritar antes |
| Ângulo da aba fora de 80 a 90 graus | a `aba` do `friso` abaixo de 80 graus se divide em duas dobras rasas, abaixo do limiar de 40 graus, e acima de 90 graus a perna passa sob a chapa e é recusada; a aba de canto fechado ou aberto pede outra montagem |
| Parte renomeada na conferência entre rodadas | `conferir-refino.py` compara por nome de parte, e uma parte da lataria renomeada entre rodadas sai como nova e sumida e escapa da medida |
| Resolução do pacote cego | os cortes ampliados resolvem o detalhe onde a região é declarada, mas nenhum gate confere que o menor detalhe que o crítico aponta cabe na resolução do pacote |
| Fresta entre a porta e o corpo na família de aparelhos | na medida de leitura de 2026-10-25, a peça feita pela família `aparelho-de-caixa` saiu com uma fresta de 1 a 1,5 mm, na altura inteira, entre a porta e o painel e a frente do corpo, onde a cavidade corta as quinas arredondadas; o crítico e o modelador a viram, e nenhuma medida automática a acusa. Corrigir muda a geometria aprovada e pede novo aceite da pessoa |
| Faces finas na cavidade da família de aparelhos | o piso e o teto da cavidade da família `aparelho-de-caixa` saem com triângulos finos, e `npm run malha:conferir` reprova a peça (9 faces no forno da medida de leitura, de 4 a 21 nos perfis da família); a aprovação da família não roda a conferência de malha, e por isso não pegou |
| Contato declarado entre partes fundidas | a família `aparelho-de-caixa` funde as partes num sólido só, a medida de contato não decide nenhum par, e a ferramenta conta o contato declarado e não decidido como contato que não acontece, reprovando a peça; o `descrever` só avisa dos pares não decididos, e a peça passa sem prova de junta |
| Pescoço mais longo e concordância arredondada no olhal do cilindro | na família `cilindro-hidraulico`, depois da fatia 16 do plano dos veículos, o pescoço do terminal e o do fundo entram no anel do olhal com quina viva e são curtos demais para se ler na escala comum: na calibração da fatia 19 os cinco julgamentos do cilindro de controle leram os dois olhais sem pescoço; numa peça real o pescoço é visível e a passagem é arredondada por solda ou forja; a pessoa deixou para um ajuste futuro da família em 2026-10-30 |
| Sentido de amassado e ondulação no veredito do crítico | o tipo `superficie` do veredito só aceita anguloso, segmentado e facetado, e o crítico descreve o amassado e a ondulação que as vistas de superfície mostram só em texto livre; acrescentar o sentido muda a lista do agente crítico, que só a pessoa libera, e obriga a refazer os 44 julgamentos da calibração; a pessoa deixou para depois em 2026-10-30 |
| Lataria em receita só de composição | a peça de lataria é reconhecida pelo passo `subdivisao` nos `PASSOS`; a receita feita só de chamadas de composição não tem passos próprios e só entra na obrigação das vistas de superfície se declarar `PLANO.lataria`; nenhuma peça do acervo está nesse caso em 2026-10-30, e nada pega um caso futuro |
| Face virada na superfície sem espessura | no fechamento do plano dos veículos, a espessura passou a recusar o vértice cuja normal não fica do lado de toda face em volta; na chapa sem espessura a face virada pela subdivisão num canto côncavo (a dobra de 174 graus do painel da perua de prova) só aparece em `npm run ondulacao`; o passo `subdivisao` poderia recusar face virada fora dos vincos, mas recusaria superfícies ainda em construção; a pessoa deixou para depois em 2026-10-30 |
| Regra de canto côncavo da subdivisão | a causa de fundo da face virada é a regra de canto do Catmull-Clark em ângulo côncavo perto de 180 graus; uma regra própria mudaria a forma das peças com subdivisão, e pede plano próprio, com o retrato do acervo e a carenagem de prova como régua |
| Contraste do amassado na zebra e na luz rasante | o gate 3 do plano encerrado das [visões de conferência](../decisoes/PLANOS-ENCERRADOS.md) pedia medir em imagem o contraste da região do amassado contra a mesma região sem ele; só a escolha da luz ficou provada por conta, sobre as normais da chapa de prova |
| Estado "carregando" dos controles da bancada | a fatia 7 do plano das visões previa o estado dos controles enquanto a peça carrega, e nada o mede nem o mostra em captura |
| Regra dos 70% com a aba de referência aberta | no arranjo único da bancada a cena ocupa 70,6% de 1400 px com os painéis fechados; com a aba de referência de 340 px aberta, que o plano de [ajustes da bancada](../decisoes/PLANOS-ENCERRADOS.md) alargou, a `guarda:temas` não mede a fração |
| Restos de estilo dos temas que saíram | os temas Foco e Revisão saíram em 2026-11-03, mas o cabeçalho de `src/bancada/styles.css` ainda descreve as arrumações deles e cita uma folha do Revisão que não existe, e as regras com `:not([data-arrumacao="foco"])` ficaram; nada cobra regra de estilo sem uso |
| Execução da receita do furgão ainda proporcional às entradas novas | O retrato da procedência passou a ser atualizado pela declaração de escrita de cada operação (`ESCRITA_DAS_OPERACOES` em `procedural/nucleo/nucleo.js`, conferida contra a conta completa por `rastreio-do-retrato.test.ts` e por `OPCOES.retrato: 'conferido'`), e a execução do `furgao-realista` caiu de uns 46 s para uns 10 s na mesma máquina carregada, com a procedência idêntica; o que sobra no núcleo é copiar e serializar cada vértice e face novos (uns 640 mil), e no `descrever`, `guarda:acervo` e vistas o grosso agora é a conferência de contato entre sólidos (`relacaoConfirmadaPorSolido`) e a descrição, não a execução; guardar a execução entre comandos só vale se a medição seguinte mostrar a execução ainda como maior fatia. Em 2026-11-07, depois da [abertura só na vizinhança do vão](../decisoes/PLANOS-ENCERRADOS.md), a execução do furgão ficou em uns 30 s, e `retratarEntradas` é a maior parcela, com uns 11 s |
| Para-choques na varredura | o plano encerrado das [regras de desenho por família](../decisoes/PLANOS-ENCERRADOS.md) levou as saias e as molduras do furgão à `gaiolaVarrida`, mas os para-choques ficaram no código antigo da receita: o recuo lateral da seção na quina muda a escala e o centro do arco juntos, e a varredura só aceita seção rígida; pede seção que varia ao longo do trilho |
| Medida de contato do furgão realista | com as rodas e o forro da etapa 4 (187 mil faces), o `descrever` do furgão leva uns 24 s por execução, 17 deles em `relacaoConfirmadaPorSolido` (`src/autoria/contato-de-solidos.js`), e cada comando do laço sobre ele espera por isso; o `acervo-real.test.mjs` deu ao furgão um teto próprio de 145 s em 2026-11-03 (84 s medidos no CI) para não esconder a regressão das outras peças |
| Cadeia de cotas que soma o total | o atrito 15 do furgão realista: as cotas parciais de uma prancha não somavam a cota total, e nenhuma conferência da prancha soma a cadeia; é regra da prancha, e não do desenho de uma família |
| Playwright sem suporte ao Ubuntu 26.04 | o `ubuntu-latest` do GitHub passou ao 26.04 em 2026-10-31 e o Playwright 1.56.0 recusou instalar o navegador; o CI e a publicação ficaram fixados no `ubuntu-24.04` em 2026-11-03, e subir o Playwright para uma versão que o suporte devolve o `ubuntu-latest` |
| Ondulação lida em parede plana | a medida de ondulação da superfície (`tools/modelar/ondulacao-da-superficie.mjs`) acusou 22,4 a 25,5 mm na parede de lado do ombro do braço, onde a parede fica entre x 94,20 e 94,92 mm, ou seja, plana (fatia 1 do [sólido por laços](../decisoes/PLANOS-ENCERRADOS.md), 2026-11-05). O número vem do ajuste da superfície com vizinhança de três espaçamentos de 73,6 mm, que a leitura registra como "junto" de uma feição e não conta como falha, de modo que o número falso foi parar no backlog como defeito sem que o processo o pegasse. A correção é a vizinhança do ajuste não passar da feição, ou o relato dizer que o número junto da feição não é ondulação |
| Ficha da regra de contato | o modelador da guitarra de estudo, na medição de fechamento da [porta de entrada dos agentes](../decisoes/PLANOS-ENCERRADOS.md) (2026-11-05), leu `src/autoria/contato-de-solidos.js` por dentro para saber quando duas superfícies contam como encostadas (`superficie-na-tolerancia`) e por que o fundo da bolsa só encostou no braço com vincos vivos. A regra merece uma ficha no comando `capacidade`, recortada do cabeçalho do arquivo como as das gaiolas: o que é encostar, interpenetrar e folga, a tolerância, e o que a superfície curva faz com o contato |
| Cilindro aceita raio negativo | na fatia 2 do [esboço pelo núcleo](../decisoes/PLANOS-ENCERRADOS.md) (2026-11-05), o gerador `cilindro` do núcleo aceitou `raio: -1` sem gritar, embora o catálogo diga raio positivo. O processo não pega isso: nenhum gate confere o sinal do raio. A correção é a validação no gerador, com a mensagem do catálogo, e o mesmo conferido nos outros geradores que recebem raio |
| Haste entre dois pontos e comparação com referência no esboço 2.0 | do esboço antigo, o `de`/`para` (144 usos nos esboços detalhados, para barra, tubo e suporte) e a comparação da silhueta com uma imagem de referência valem no [esboço pelo núcleo](../decisoes/PLANOS-ENCERRADOS.md), mas ficaram fora da fatia de praticidade de 2026-11-05 por decisão da pessoa; entram quando um caso pedir. O comparador de contornos continua no repositório depois da migração |
| Lasca da abertura na sela de flanco | na bateria da [abertura em qualquer direção](../decisoes/PLANOS-ENCERRADOS.md) (2026-11-06), o vão numa sela, pelo flanco, deixa uma lasca em 4 de 8 posições: uma face da parede ou da lente com quatro pontos alinhados, que pediria retriangular duas faces em três, com id novo. A malha fecha, o gate de malha acusa e o registro traz `limpeza.finasRestantes` |
| Pasta de peça sem receita | achado do [rascunho do braço robótico](../decisoes/PLANOS-ENCERRADOS.md), conferido em 2026-11-05: uma pasta em `procedural/pecas/` só com `referencias/` é invisível ao `guarda:acervo`, que só vê pasta com `receita.js`, `montagem.js` ou `index.js`. A correção é a guarda acusar a pasta que tem referências e nenhuma porta |
| Peça avulsa conferida antes da malha | do mesmo rascunho: o `guarda:acervo` já aceita a parte planejada que espera a vez numa montagem, mas uma peça avulsa com `PLANO` e sem passos vai direto à medida de contatos, então o alinhamento dela não é conferido antes de existir malha |
| Veredito "não julguei" | do mesmo rascunho: o veredito de forma exige nota de 0 a 10, e um crítico que não recebeu alvo não tem nota legítima; o esquema precisa de um jeito de dizer que não julgou, com o motivo |
| Referencial na rodada de alinhamento | do mesmo rascunho: a pergunta de qual eixo é o vertical e onde fica o chão não está na rodada de alinhamento; hoje só o `guarda:referencial` pega o erro, depois da geometria escrita |
| Divulgação progressiva sem a pessoa no laço | o registro de uso (`npm run uso`, de 2026-10-19 a 2026-11-05) mostra uns 80 pedidos de roteiro e só 9 tópicos de `--ajuda`, nenhum na modelagem por receita, e a mesma recusa do loft repetida 4 vezes; com a pessoa e a sessão principal dirigindo o laço, a IA quase não precisa pedir. Medir com um agente que recebe só o objetivo de uma peça por receita pequena, sem instrução de quem orquestra, o que ele pede ao `comecar` e ao `--ajuda`, quando, e onde erra por não pedir; pedido pela pessoa em 2026-11-06 |
| Causa calada quando a borda coincide com o vão ou a coluna sai de ordem | o modelador das portas traseiras do furgão, em 2026-11-06, achou dois casos em que o `descrever` falha sem apontar o passo: a tira da fresta exatamente sobre o corte de um vão da `aberturaPorContorno` some (o vértice é apagado) e aparece só como vão não conferido, e uma coluna de gaiola fora de ordem faz a carroceria e as lanternas sumirem como parte ausente. O processo pega a falha, mas não a causa; a operação devia recusar com a medida (borda a menos de x mm do contorno, coluna fora de ordem) |
| Fundo da luz rasante igual à superfície sem luz | na rodada 21 do furgão (2026-11-07), o crítico leu uma ponta acima do teto, sobre o para-brisa, na luz rasante de lado a 30 graus; a malha não tem vértice acima do teto, e a ponta é o canto da frente do teto que pega luz, enquanto o resto do teto, sem luz, fica preto como o fundo. Nenhum gate pega a ilusão; o fundo da vista devia ser distinto da superfície sem luz, ou a vista levar uma luz de preenchimento fraca |
| Cópia da receita na rodada presa aos módulos vivos | `rodada-de-modelagem.mjs` grava `receita-NN.js` com os imports reescritos para os módulos vivos da pasta `receita/`, então a cópia não refaz a forma julgada quando um módulo muda, e quebra o build quando um nome some (o `PISCAS` na etapa 8 do furgão, em 2026-11-07). O build pegou a quebra, mas nada pega a deriva silenciosa; a cópia devia congelar também os módulos locais que importa |
| Borda aberta no vão do farol direito conforme o raio do canto | na etapa 8 do furgão (2026-11-07), a `aberturaPorContorno` do vão do farol direito deixa a borda aberta com raio de canto de 20 a 40 mm, ou com o lado de dentro em x 462 e 470, e fecha com 45 e 50 mm, ou com x 480 e 500. O `descrever` acusa a borda aberta, mas não a causa, e o farol ficou com raio 45 em vez dos 30 das fotos de estudo |
| Entalhe na borda do vão onde o corte cruza um anel da gaiola | na luz de canto do furgão (2026-11-08), a borda da `aberturaPorContorno` ganha um par de vértices da pele de fora e da de dentro a 2,1 mm um do outro onde o lado reto do contorno cruza o anel `degrauFrente3` da gaiola (y 977), e o aro mostra um entalhe de 2 mm na silhueta, nas duas luzes. `limpezaFina: false` não muda nada, e nenhuma opção alinha a borda à grade; subir anéis na chapa custa mais faces que a folga. A correção é da operação, na costura do corte com a aresta de anel |
| Causa do vão recusado no descrever | o modelador do furgão (2026-11-08) só achou por que `segmentosArco` 7 e 8 recusavam o vão da luz de canto ("o corte deixou uma borda que não fecha") lendo `neutro.orfaos` num script próprio; o descrever resumido devia dizer o vão, o motivo e o teto do parâmetro |
| Teste do acervo perto do teto dos testes lentos | em 2026-11-08 o `tools/modelar/guardas/guarda-acervo.test.mjs` passou do teto de 60 s por arquivo no CI (118 s) num envio que só mudava documento e o normalizador das dobras aceitas, e passou na repetição; aqui, sozinho e sem carga, leva 217 s. Desde a fatia 4 do trecho que some entre laços, o `descrever` roda as réguas de dobra e de vinco oculto nas peças com subdivisão. Se voltar a falhar, medir o tempo por peça antes e depois das réguas e decidir entre dividir o teste e tirar as réguas do caminho do acervo |
| Testes lentos ligados pelo navegador | em 2026-11-08 a bateria local rodou só os testes lentos ligados pelo grafo de imports ao que mudou, e deixou de fora o `tools/mcp/mcp.test.mjs`, que chega a `adaptar-three.js` pelo visor aberto no navegador, e não por import; o CI reprovou a fatia 1 dos materiais ali (oito receitas de teste com `metalness`, campo que o normalizador passou a recusar). O grafo devia contar o que o visor carrega |
| Saída de manual a partir da montagem | aprovado pela pessoa em 2026-11-13, na revisão do projeto, para quando ela retomar a instalação solar: a lista de peças com quantidade e uma imagem por etapa, lidas de `etapas` e das instâncias da montagem, num módulo ao lado dos exportadores; o manual da instalação solar foi escrito à mão fora do repositório |
| Por que a nota do crítico não sobe entre rodadas | medido na revisão do projeto, em [mecanismos que ficaram de fora](../banco-de-provas/revisao-do-projeto-2026-11-13/mecanismos-que-ficaram-de-fora.md): em 54 de 86 pares de rodadas seguidas a nota ficou igual ou caiu, e metade dos defeitos da rodada seguinte eram novos; falta separar se a causa é o crítico ou a peça, antes de mexer no pedido ao crítico; recomendado à pessoa em 2026-11-13, sem resposta ainda |
| Ficha de capacidade para as 42 operações e busca do `comecar` por nome | medido na mesma análise: `npm run capacidade` cobre 16 ajudantes e nenhuma das 42 operações, que já publicam contrato e exemplo, e `comecar -- <operação>` não acha nada; recomendado à pessoa em 2026-11-13, sem resposta ainda |
| Carrinho de mão como família de objeto | candidato apontado pela pessoa em 2026-10-11, vindo de `CONTEXTO-FERRAMENTAS-DE-MODELAGEM.md` (histórico retirado, ver [a crônica](../decisoes/HISTORICO-RETIRADO.md)): chassi, caçamba e a roda no perfil de carrinho de mão, a partir do carrinho azul aprovado |
| Bacia em casca como primitiva | candidato apontado pela pessoa em 2026-10-11, vindo do mesmo documento: a caçamba generalizada, com parede inclinada e contorno em D ou retangular |
| Dobradiça de caneco para a porta sobreposta passar de 90° | candidato apontado pela pessoa em 2026-10-11, vindo do mesmo documento, junto com as ressalvas do fechamento do plano das ferramentas de modelagem |

Dezesseis linhas que diziam "concluído" saíram desta tabela em 2026-09-11. Elas
descreviam trabalho entregue, e candidato entregue não é candidato: o registro
de cada um está em [`encerrados/README.md`](../decisoes/PLANOS-ENCERRADOS.md), que é onde se
procura o que já foi feito. Uma delas declarava ativo um plano que está
encerrado desde agosto.

## Ordem lógica, não ordem executiva

Algumas dependências já podem ser afirmadas sem abrir plano:

1. montagem persistida depende de identidade estável de peça e instância;
2. mapa de dependências depende de composição e relações persistidas;
3. contexto de trabalho depende do mapa;
4. revalidação automática depende de relações mensuráveis;
5. escrita por qualquer porta reutiliza um serviço interno transacional;
6. MCP pode avançar no mesmo plano assim que esse contrato for executável e
   verificável, sem virar uma barreira temporal permanente.

Essa ordem não escolhe o primeiro plano nem autoriza implementação automática.

## Candidatos medidos e recusados por falta de evidência

Medido em 2026-08-17, no acervo inteiro. Os três apareciam como "candidatos sem
plano" e foram testados pela mesma régua que retirou os seletores relacionais,
o A-16 e o Caso 3: **capacidade entra quando há evidência de que ela está
travando alguém, não quando é plausível**.

| candidato | medida | decisão |
|---|---|---|
| `alinhar` (centragem derivada) | 3 de 95 `transladar` têm cara de centragem, e os três já usam parâmetro nomeado (`centroBuchaY`), não conta na mão | recusado |
| `loft` fechado | 0 de 22 — **medida inválida**, ver abaixo | **implementado** |
| variantes nomeadas de revisão | nenhuma ramificação ocorreu; a cadeia de autoria é linear e a escrita concorrente é recusada, não ramificada | recusado |

A comparação que decide: `em`/`eixo` entrou com **128 de 853 passos** (15%) em
transporte puro, e o ponto nomeado com **18 de 61 parâmetros** do freio
existindo só para nomear 6 pontos. Essa é a ordem de grandeza de um atrito real.
Três ocorrências que já usam nome, e zero ocorrências, não são.

**A medida por uso não serve para capacidade ausente, e isto foi um erro meu.**
Contar quantas peças usam algo só mede ATRITO — o rastro que uma solução de
contorno deixa. Capacidade que não existe não deixa rastro: ninguém escreve o
que o motor recusa. O rasgo e o `lathe` fechado, entregues no mesmo dia, também
tinham **zero** uso anterior, e não foram recusados por isso — a pergunta certa
para eles foi "é forma mecânica real que hoje é impossível?".

O `loft` fechado responde sim a essa pergunta: mangueira em anel, aro fechado e
tubo em laço são formas reais, e o caminho que volta em si produzia uma costura
não soldada. Ele foi implementado.

`alinhar` continua recusado, e ali a medida **vale**: centrar já é possível hoje
escrevendo a conta, então o atrito deixaria rastro — e o rastro é 3 em 95, já
com nome. Variantes seguem sem evidência dos dois tipos.

Reabrir os recusados exige **evidência nova de campo** — uma peça ou uma
sessão em que a falta atrapalhou —, não a lembrança de que já estiveram na
lista. Enquanto isso, `alinhar` e `loft` fechado permanecem descritos aqui como
forma conhecida, para que ninguém precise redescobri-los do zero quando a
evidência aparecer.

## Questões abertas da montagem semântica

Vieram de `usar/MONTAGENS-SEMANTICAS.md`, onde eram um rabo de pensamento de
desenvolvimento dentro de um contrato de uso — o gate G1 acusou a mistura. A
direção não decide antecipadamente:

- como ampliar a montagem persistida v1 com relações, variantes e instâncias compartilhadas;
- como versionar instâncias e relações;
- quando uma alteração modifica a origem ou cria uma variante;
- como representar movimento e cinemática;
- até onde revalidar dependentes;
- quando uma região interna deve virar peça separada;
- se a representação por malha final e pose mundial aberta no plano de
  [auditoria de interseções](../decisoes/PLANOS-ENCERRADOS.md)
  será aprovada pelas provas adversariais e de escala;
- se haverá solver e qual será seu alcance;
- como agentes concorrentes reservam alvos.

Resolvem-se por planos pequenos e provas, dentro das invariantes de
[`../usar/MONTAGENS-SEMANTICAS.md`](../usar/MONTAGENS-SEMANTICAS.md) e
[`../AUTORIA-IA.md`](../guias/AUTORIA-IA.md).

## Questões ainda abertas da autoria

Esta definição não decide antecipadamente:

- como representar variantes e instâncias compartilhadas;
- como versionar relações;
- como declarar movimento e cinemática;
- se haverá solver automático e qual será seu alcance;
- se a representação por malha final e pose mundial aberta no plano de
  [auditoria de interseções](../decisoes/PLANOS-ENCERRADOS.md)
  será aprovada pelas provas adversariais e de escala;
- quando uma alteração cria variante ou modifica a peça de origem;
- como agentes concorrentes reservam alvos;
- qual será a primeira camada de escrita;
- quais operações entram no MCP e quais permanecem em serviços internos;
- como materiais, física e deformação entrarão no mesmo mapa;
- qual fidelidade mínima caracteriza um carro ou robô completo.

Essas perguntas devem ser resolvidas por planos pequenos, provas e comparação de
resultados, sempre dentro das invariantes deste documento.

Vieram de `AUTORIA-IA.md`, onde eram deliberação de projeto dentro de um
documento que também servia de contrato. Resolvem-se por planos pequenos.

## Dizer por que o eixo ficou sem seta

Medida: na bicicleta, o tubo do selim não tem seta em x porque nenhum parâmetro
declarado o translada nesse eixo. A regra está certa — seta que mente é pior que
seta ausente —, mas a bancada não diz isso: o eixo simplesmente não aparece, e
quem olha não distingue "não dá para mover nesse eixo" de "a bancada falhou".
Origem: fechamento de `encerrados/2026-09-12-a-seta-move-de-verdade.md`.


## Triângulo sem área na união de superfícies tangentes

A união de dois cilindros de mesmo raio em L (a coluna do braço sobre o pé)
deixa um triângulo sem área na geratriz em que as duas superfícies se
tangenciam: o vértice da costura cai no meio da aresta longa do pé, e o
adaptador corta a face com três cantos alinhados. `conferirMalha` acusa, e
nem `guarda:acervo` nem a auditoria da montagem pegam, porque nenhuma das duas
olha a triangulação do adaptador. A correção é a união retirar o canto
colinear nesse caso, como já faz na lasca do encaixe, e o que falta no
processo é a guarda do acervo passar a contar triângulo sem área. Origem: a
rodada 3 da coluna, em 2026-11-04, provada em
`procedural/nucleo/operacoes/arredondar-costura-pontas.test.ts`.

## Conferência de cada parte montada contra o contorno da referência

O `conferir:referencia` por parte posicionada, que compara cada parte de uma montagem com o contorno dela no arquivo de
contornos e reprova a parte fora da tolerância, saiu do plano das [partes do braço](../decisoes/PLANOS-ENCERRADOS.md)
por decisão da pessoa em 2026-11-12: lá as proporções foram mudadas de propósito em relação à imagem. Serve a objeto que siga a
referência à risca. Ficam junto os dois achados herdados do rascunho do braço: a medida de junta do `conferir-pontos`, que toma
o centro da sobreposição das caixas e erra quando uma parte entra pelo flanco da outra, e a conferência de que a técnica escrita
no `PLANO` de cada parte foi a usada.

# Backlog aberto

Este arquivo lista candidatos. Nenhum item é autorização de implementação.
Candidatos ligados à direção de autoria precisam respeitar as invariantes de
[`AUTORIA-IA.md`](../AUTORIA-IA.md) e
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
| Contrato genérico de materiais | coberto em 2026-10-19 pelo plano [receitas com material e textura](encerrados/2026-10-19-receitas-com-material-e-textura.md), na forma de escolha de material por peça e textura gerada; o brilho por material entrou no plano dos objetos externos (fatia 5), e PBR completo e paleta nova seguem fora |
| Movimento e espaço varrido | exige montagem, pose e relações persistidas antes de solver ou cinemática geral |
| A-4, A-6, A-7, A-8, A-16 e A-29 | capacidades abertas comprovadas, sem inventar IDs novos |
| Fechamento de tampas em anel (sólidos ocos) | evidência em `cabo-de-pa-bambu`: dois lofts concêntricos geram tubo aberto nas extremidades, e o motor não tem primitiva para costurar o anel entre as bordas de dois perfis coaxiais. Malha não-manifold, volume incalculável, STEP falha em sólido. Afeta qualquer peça oca. Sem contorno hoje |
| Medida de ângulo e comprimento contra a imagem de referência | sem ela, reprovar por proporção depende do olho do revisor; o laço de modelagem registrou isso como o que limita o resultado dele |
| Curva medida como parâmetro | parte cuja forma nasce de polilinha, como o tubo inferior da bicicleta, continua sem controle na bancada: a leitura desce em coordenada e para em lista de listas |
| Módulo compartilhado de tubos | `secao` e `tuboPerfilado` vivem dentro de `bicicleta-quadro.js`; a próxima peça que quiser tubo achatado recria as duas |
| Geometria exata e visão: OpenCASCADE, Manifold no esboço e Segment Anything | teste rápido de cada um depois do plano do desenho sem referência, pedido pela pessoa em 2026-10-14, na ordem e com as adaptações de identidade de face da [análise](../PESQUISA-ABERTA-2026-10.md#geometria-exata-e-visão-para-o-mecanifica-análise-de-2026-10-14) |
| Teste da família de superfície aerodinâmica | é o arquivo mais lento da bateria (cerca de 5,5 minutos, um teste só passa de 2) e o resumo dos gates o aponta acima do teto de 120 s; medir por etapa e encurtar sem perder cobertura, como o teste da blocagem no plano do avião. A pessoa perguntou em 2026-10-14 como acelerar os gates, e a máquina da sessão tem quatro processadores sem folga |
| Sombra no chão no contorno da imagem | a sombra da empilhadeira nova acaba em degradê até o branco, e a parte `sombra`, fora do modelo, fica em 0,373 na borda contra o mínimo de 0,8 sem que semente nenhuma resolva; o mínimo de borda devia dispensar a parte fora do modelo cuja borda com o fundo é degradê, ou a ferramenta ganhar uma opção para sombra no chão |
| Folhas de divisa do contorno da imagem | os recortes saem no tamanho natural de cada divisa, e uma divisa grande toma a folha inteira enquanto as pequenas ficam finas no meio do branco; a folha 1 da [empilhadeira nova](../banco-de-provas/empilhadeira-2026-10-14/referencias/empilhadeira_lateral.pacote/roteiro.md) tem 2620 x 2904 px e chega ao crítico a cerca de 70%. Igualar a altura dos recortes de cada linha e quebrar a divisa grande em pedaços; pedido pela pessoa em 2026-10-14 |
| Paleta do mapa de partes | uma parte clara pintada a 20% sobre a linha escura do traço sai quase da cor de uma parte escura (o capô sobre o traço deu o verde do piso), e o crítico do contorno da [carcaça](../banco-de-provas/empilhadeira-2026-10-09/referencias/carcaca_lateral.pacote/roteiro.md) apontou isso como defeito em duas rodadas; a cor do mapa precisa ficar distinta sobre o traço |
| Pontas agudas cortadas pelo alisamento do contorno | o `denteMaximo` do contorno da imagem corta ponta aguda (5 px numa ponta de 21 graus) e tirou de 102 a 138 mm das pontas das pás no topo do avião; o teste sintético do [levantamento](../LEVANTAMENTO-DESENHO-SEM-REFERENCIA.md), com a forma verdadeira conhecida, vira o gate |
| Forma que a família de desenho não tem | o paralama da [empilhadeira nova](../banco-de-provas/familias-de-desenho-2026-10-14/prova/RESULTADO.md) é uma faixa curva que abraça a roda, e a família da carcaça tem um paralama reto: o paralama fica em 0,23 por região mesmo com a família ajustada. O crítico da família 2.0.0 apontou também, na foto nova, a face de trás do capô quase vertical, a lateral subindo até perto de 79% da altura junto ao capô e o furo redondo da lateral, e nos extremos o pé estreito do recorte dianteiro; a pessoa aprovou com esses pontos pendentes ([README da família](../../../procedural/familias-de-desenho/carcaca-empilhadeira/README.md)). Entram como peça ou opção declarada da família quando outra referência da classe pedir |
| Parte opcional numa família de desenho | a empilhadeira nova não tem o painel que a família desenha entre o encosto e o capô, e o formato não liga uma parte a um parâmetro que a tire; o ajuste leva o painel ao mais baixo que a faixa deixa, 0,22 mm acima do capô |
| Relação de ordem com os valores derivados do desenho | as relações de ordem da família só leem os parâmetros dela, e duas relações da carcaça 2.0.0 repetem a conta do pé da rampa e as constantes do desenho; se a conta mudar no desenho, a relação deixa de dizer o limite certo |
| Partidas e deslocamento no ajuste da família | `familia --ajustar` parte de um conjunto só e procura a translação livre; na carcaça, um desenho com a frente errada por 76 a 168 mm quase empatou em razão com o que acertava, e as partidas foram feitas à mão com `--valores` e `--soltos`. Várias partidas e um limite para o deslocamento resolveriam |
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
| Custo do diagnóstico de parâmetros do acervo | `diagnosticar_parametros` com `acervo` custa a soma de cada peça, porque cada parâmetro da TABELA reconstrói a peça inteira: 76 s com 30 peças e 12,6 minutos (755 s) com 48 alvos em 2026-10-20 (trator-pa 77 s, trator-sirene 68 s, caminhao-lixo 54 s, mediana abaixo de 15 s). Os testes de encanamento (`parametros-peca.test.mjs` e `tools/mcp/perfis/parametros.test.mjs`) já não pagam isso: varrem um acervo de três peças pela opção `raiz`, e o acervo real é conferido uma vez por `tools/mecanifica/acervo-real.test.mjs` (lento, com teto de 40 s por alvo e o custo por peça impresso). Resta cortar o custo em si, medindo só os parâmetros de cada peça que mudaram |
| Afinamento do pé da mesa quadrada | o pé de `mesa_pes_recortados_escura` tem afinamento de 12 mm em dois lados perto do chão, recusado pelo tradutor de receitas; `mesa-quadrada-escura` usa pé reto de 80 por 80 mm |
| Brilho do material | o módulo de textura não tem lustro; um campo opcional `brilho` mapeado para Ks e Ns do `.mtl` daria o acabamento polido dos eletrodomésticos, mas é PBR e só entra com plano |
| Faces finas e n-gons em peças com `subtrair` e `arredondarAresta` | `malha:conferir` reprova a topologia da lava-louças compacta, da lavadora-secadora e de outras peças com corte e arredondamento; os guardas só alertam, sem reprovar. Em carroceria, `subtrair` de cilindros de 8 lados gerou uma face de razão 1,81e-3 na perua; contorno: recortar o arco no perfil 2D antes de extrudar. A parte dos veículos está no [plano ativo](2026-10-21-ajustes-no-nucleo-dos-veiculos.md) (fatias 1 e 10); a lava-louças e a lavadora-secadora seguem aqui |
| Arredondamento verdadeiro em volta de polígonos facetados | o puxador curvo da `lava-loucas-compacta-branca` é um arco facetado, e o arredondamento de aresta não acompanha o contorno de polígonos; nos veículos o `arredondarAresta` deixou vértice solto em forma facetada, e o contorno é arredondar no perfil 2D. O vértice solto dos veículos está no [plano ativo](2026-10-21-ajustes-no-nucleo-dos-veiculos.md) (fatia 7); o arredondamento que acompanha o contorno segue aqui |
| Pontos alinhados em perfil de extrusão | o exportador recusa a face sem área que um vértice colinear do perfil gera, e o `carro-sedan-angular` deslocou vértices 1 mm em zigue-zague para passar; contorno: tirar os colineares do perfil antes do núcleo (`medidas-da-fonte.mjs` já faz). Está no [plano ativo](2026-10-21-ajustes-no-nucleo-dos-veiculos.md) (fatia 6) |
| Partes que somem em silêncio, revolução aberta e contato em plano inclinado | contorno com ponto repetido faz a parte sumir sem erro, a revolução de perfil que não toca o eixo sai aberta sem `furos: []`, e a precisão simples da malha (1e-8 m) passa da tolerância de contato (1e-9 m) em plano inclinado; contorno: deduplicar pontos, `furos: []` e vértices idênticos ou encaixe declarado. No [plano ativo](2026-10-21-ajustes-no-nucleo-dos-veiculos.md) (fatias 2 e 8) |
| Traseira da geladeira compacta | a `geladeira-compacta-branca` foi modelada a partir de duas imagens que não mostram a traseira, e ela ficou lisa |

Dezesseis linhas que diziam "concluído" saíram desta tabela em 2026-09-11. Elas
descreviam trabalho entregue, e candidato entregue não é candidato: o registro
de cada um está em [`encerrados/README.md`](encerrados/README.md), que é onde se
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
  [auditoria de interseções](encerrados/2026-08-18-auditoria-intersecoes-montagem.md)
  será aprovada pelas provas adversariais e de escala;
- se haverá solver e qual será seu alcance;
- como agentes concorrentes reservam alvos.

Resolvem-se por planos pequenos e provas, dentro das invariantes de
[`../usar/MONTAGENS-SEMANTICAS.md`](../usar/MONTAGENS-SEMANTICAS.md) e
[`../AUTORIA-IA.md`](../AUTORIA-IA.md).

## Questões ainda abertas da autoria

Esta definição não decide antecipadamente:

- como representar variantes e instâncias compartilhadas;
- como versionar relações;
- como declarar movimento e cinemática;
- se haverá solver automático e qual será seu alcance;
- se a representação por malha final e pose mundial aberta no plano de
  [auditoria de interseções](encerrados/2026-08-18-auditoria-intersecoes-montagem.md)
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


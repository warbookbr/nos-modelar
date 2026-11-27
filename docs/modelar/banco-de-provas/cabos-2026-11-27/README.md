# Cabos: as provas

Evidência do plano [cabos](../../planos/2026-11-27-cabos.md).

## Fatia 1: o cabo entre dois pontos (2026-11-27)

A curva é a elástica discreta (`procedural/familias/cabo/curva.js`): uma haste inextensível de até 97 nós, de trechos iguais, que sai reta de cada ponta na direção pedida e minimiza a soma dos quadrados da segunda diferença com o comprimento de cada trecho fixo; com o caimento entra a gravidade em −y. O palpite é uma Bézier de quarta ordem de menor flexão, com a flecha de um lado só (a regra do lado é fixa), e cada iteração resolve o problema quadrático linearizado pelo complemento de Schur. A Bézier cúbica de Hermite, a primeira ideia, não serve: com as duas pontas viradas uma para a outra os quatro pontos de controle ficam numa reta e o cabo não arqueia. O comprimento da curva lisa (Hermite C¹ pelos nós) é acertado a 0,02% refazendo a haste com o comprimento corrigido.

As estações do tubo vêm do desvio máximo da corda, numa escada de 17 números de estações (uma composição por degrau, porque a composição tem pontos fixos). As faces são lados × trechos + 2 × (lados − 2); o friso desenha o círculo em quartos de arco, e por isso os lados são 8, 12, 16 a 32.

`node docs/modelar/banco-de-provas/cabos-2026-11-27/medir-casos.mjs` mede os casos de `tools/fixtures/cabo/casos.mjs` (comprimento de corte, raio mínimo, faces e tempo).

Imagens em `tools/bancadas/out/cabos/` (não versionadas): um arquivo por caso e `lados-8.png` contra `lados-24.png`.

A pessoa aprovou o cabo entre dois pontos por imagem em 2026-11-27, com a frase "aprovo sim" (`aprovado-*.png`: o laço, o caimento e o mesmo cabo com 8 e com 24 lados), sabendo que os lados vão de 8 a 32 de 4 em 4 e que a conferência de porta se confunde quando as duas tampas ficam no mesmo plano.

## Fatia 2: pedido, passagens, terminais e feixe (2026-11-27)

O jeito de pedir é `cabo({ de: { ponto, direcao }, para: { ponto, direcao }, comprimento | folga, diametro, lados, ... })` em `procedural/familias/cabo/pedido.js`: a ponta B entra em coordenada absoluta e vira o deslocamento da família, a folga de qualquer tamanho vira comprimento (o piso de 0,3 da família é o do ponto mínimo da aprovação, em que todos os parâmetros estão no mínimo e as direções mandam o cabo para longe da outra ponta), e a recusa fala o vocabulário do pedido. As passagens são até duas, com ponto e direção (a da corda se omitida), a braçadeira é um anel de fio redondo e o terminal é a capa cilíndrica ou o olhal (anel), todos voltas fechadas do friso, sem booleana. O comprimento se reparte entre os trechos pelo desvio das direções em relação à corda. Os acessórios são chamadas próprias (`cabo.capa` e `cabo.anel`, duas composições da família), que `cabo()` junta ao cabo; o feixe não os leva. O feixe (`feixeDeCabos`, 2 a 6 cabos) desloca cada cabo pelo eixo normal ao plano de dobra, mede a distância entre os eixos contra a soma dos raios e soma as faces no orçamento; entra pelas `poses` de `instanciaDeFamilia`. Os extremos da família mudaram só no ponto máximo (comprimento até 12000 mm e diâmetro até 25 mm, para o ponto máximo com passagens ser chamável); mínimo, médio e os três perfis têm o mesmo hash de antes.

Imagens em `tools/bancadas/out/cabos-fatia2/` (não versionadas): `bracadeiras.png`, `terminais.png`, `feixe.png`.

A pessoa aprovou a fatia 2 por imagem em 2026-11-27, com a frase "Sim, aprovo as duas" (`aprovado-fatia2-*.png`: o cabo com duas braçadeiras, os terminais de capa e olhal e o feixe de três cabos), e os limites novos da família, diâmetro até 25 mm e comprimento até 12.000 mm.

## Fatia 3: o cabo na montagem com articulação (2026-11-27)

As pontas se prendem a portas por `{ instancia, porta, sentido?, afastamento? }` (`procedural/familias/cabo/montagem.js`): o ponto é o centro da porta na pose resolvida e a direção de saída é o eixo dela. Em cada passo do curso de uma junta as instâncias que ela move são levadas à pose do passo (a mesma conta de `conferirArticulacao`, que não devolve a pose), as portas são resolvidas de novo e o cabo é refeito pela `cabo()` com o mesmo comprimento. A conferência (`conferirCursoDoCabo`) acusa por passo `estica`, `dobra`, `autocontato`, `pontas-coladas`, `atravessa` (o tubo contra cada sólido, pela régua de contato da articulação, folga de 0,3 mm) e `inconclusivo`. Passagens e feixe ficam fora do cabo por portas.

Prova (`tools/fixtures/cabo/junta-com-cabo*.test.mjs`): dois atuadores de 100 mm da fixture de duas juntas, com a porta `cabo` declarada na fixture em cada carcaça, junta A de −90° a 90° em 24 passos. O cabo de 110 mm passa nos 25 passos, com o comprimento de corte entre 109,996 e 110 mm; o curso inteiro leva uns 3,7 s. Os arranjos que falham, em 12 passos: cabo de 48 mm estica de −90° a −60° e de 60° a 90°; cabo de 110 mm da porta oposta dobra abaixo do raio mínimo de −30° a 30°; cabo de 115 mm da mesma porta atravessa a carcaça B e a saída B só no passo zero, onde uma conta independente (eixo do cabo dentro do corpo de revolução de B) também o põe dentro.

Imagens em `tools/bancadas/out/cabos-na-junta/` (não versionadas), de `node tools/fixtures/cabo/junta-com-cabo-vistas.mjs`: `inicio-*`, `meio-*`, `fim-*` (isométrica, de cima e de lado) e `atravessa-no-meio-*`. Aguardam a aprovação da pessoa (gate 5).

Achado: a memória do plano do cabo usava a ordem dos campos como chave, e a chamada e as medidas pediam a mesma conta em ordens diferentes, de modo que cada pose resolvia a haste duas vezes; a chave agora é ordenada e o curso refeito caiu de 8,4 s para 4,4 s.

A pessoa aprovou o cabo na junta por imagem em 2026-11-27, com a frase "aprovo o cabo na junta, o que me preocupa é ele passando por dentro de outra peça" (`aprovado-junta-*.png`; `falha-atravessa-no-meio.png` é o arranjo feito para falhar).

## Fatia 4: a saída do cabo no centro, a conferência de alinhamento e o curso fino (2026-11-27)

Achado da pessoa ao aprovar o cabo na junta: a ponta do cabo não ficava no centro da saída. A porta da fixture estava posta à mão (a de B rente à borda do cilindro de saída, a de A no topo do tambor, onde não há saída), e nenhuma conferência pegou.

A família `atuador-de-junta` publica agora a porta `cabo`, um plano no centro da ponta livre do cilindro de saída do cabo, com a normal para fora dele (+x no cilíndrico, −x no servo), em todas as formas. É plano e não anel porque a conferência de forma do anel mede o raio contra todos os vértices da carcaça junto do plano, e a flange do atuador de 100 mm tem o raio igual ao alcance da saída. A porta é o último passo de cada composição que tem a carcaça, e a geometria sai igual: 321 conjuntos de parâmetros (pontos, perfis, escalas e varredura da aprovação) deram o mesmo hash de vértices e faces antes e depois, e os hashes dos três pontos e dos oito perfis da aprovação mecânica não mudaram.

A prova (`tools/fixtures/cabo/junta-com-cabo.mjs`) usa a porta nos dois atuadores, sem porta inventada. Arranjos: passa, 150 mm em ±90°; curto, 80 mm, estica em todo o curso; fechado, 130 mm, dobra abaixo de 9 mm só em ±90°; atravessa, 200 mm no curso de ±180°, atravessa a carcaça A de 157° em diante. Os de hoje passaram de 110, 48, 110 e 115 mm para esses, porque a saída real fica a 62 mm do eixo e a 26,5 mm de altura, e as pontas ficam a 71 mm (pose zero) e 88 mm (±90°) uma da outra.

A conferência do curso (`conferirCursoDoCabo`) acusa `estica`, `dobra`, `autocontato`, `pontas-coladas`, `atravessa`, `inconclusivo`, `recusado` e `desalinhada`. O `desalinhada` vem de duas réguas, com tolerância de 0,1 mm em cada coordenada e 1 grau: a porta tem de estar no centro da face plana do sólido em que pousa, com a saída na direção da normal para fora (`conferirAlinhamentoDasPontas`, que reprova as portas antigas), e a ponta do cabo construído tem de estar no centro da porta e sair na direção do eixo dela. O `atravessa` diz o ângulo, a peça, o ponto do cabo mais fundo nela, a direção mais curta para fora e o ponto em que uma braçadeira tiraria o cabo do caminho.

O curso fino: onde a folga do cabo a um sólido fica abaixo de dois diâmetros, o intervalo até o passo vizinho é dividido ao meio até a folga se resolver ou o passo chegar a um oitavo do da declaração. Caso entre passos: o cabo de 200 mm no curso de 100° a 260° em 3 passos passa nos quatro passos grossos e atravessa A de 157° a 203°; só o refinamento o acha.

Vistas em `tools/bancadas/out/cabos-na-junta/` (fora do git): início, meio e fim do curso do arranjo que passa e o atravessa a 180°, cada pose nas vistas isométrica, de lado e de cima, geradas por `node tools/fixtures/cabo/junta-com-cabo-vistas.mjs`.

Na fatia 4 o cabo passou a sair das portas `cabo` que o atuador de junta publica no centro da ponta do cilindro de saída, e as imagens `aprovado-junta-*` foram refeitas com o cabo de 150 mm. A pessoa aprovou em 2026-11-27, com a frase "aprovo, o cabo está passando por fora sim, pode enviar e seguir com a exportação", depois de conferir que o cabo passa por fora da flange na vista de lado a +90°.

## Fatia 5: a exportação funcional para Blender e Unreal (2026-11-27)

`gerarMontagemResolvida` (`tools/modelar/exportar-gltf.mjs`) exporta uma montagem com as juntas e os cabos; a prova é `tools/fixtures/cabo/junta-com-cabo-gltf.mjs`, que exporta o arranjo que passa. O arquivo tem, na raiz da cena, `cabo`, `carcacaA` e `junta-juntaA`; sob `junta-juntaA` ficam `saidaA`, `carcacaB` e `junta-juntaB`, e sob esta `saidaB`; `cabo.ponta-de` é filho de `carcacaA` e `cabo.ponta-para` de `carcacaB`. O nó de cada junta fica no pivô e tem o eixo dela como o +Y local; girar o nó de `junta-juntaA` em torno do +Y local leva a peça e a ponta do cabo para onde `resolvidaNoValor` os põe (`modulos/exportador-gltf/tests/articulacao.test.js`, a 0,01 mm, com o arquivo no validador sem erro nem aviso).

O Blender rodou aqui pelo módulo `bpy` (o download do executável é recusado pelo proxy do ambiente): `MODELAR_BPY_PYTHON=<python com bpy> npx vitest run tools/blender/cabo-vivo.test.mjs` importa o `.glb`, roda `cabo-vivo.py`, gira `junta-juntaA` (em torno do Z local do Blender) em cinco ângulos e confere a ponta do cabo vivo contra a nossa montagem a 0,01 mm, a outra ponta parada, o comprimento da curva em repouso a 0,5% do de corte e a malha estática escondida. No Blender real (aberto por quem recebe o arquivo): File, Import, glTF 2.0; aba Scripting, abrir `cabo-vivo.py` (gravado ao lado do `.glb`) e Run Script; girar o objeto `junta-juntaA` em torno do Z. A curva é um Bézier de duas pontas e não guarda o comprimento fora do repouso: a 90° ela tem 165 mm contra os 150 de corte; o cabo de comprimento certo em cada pose é o da família.

### A Unreal (não testada aqui: não há Unreal neste ambiente)

1. Importe o `.glb` no Content Browser (a importação de glTF do Interchange); as peças vêm como malhas e os nós vazios como componentes numa hierarquia: `junta-juntaA` é pai de `saidaA`, `carcacaB` e `junta-juntaB`. Se o arquivo importar como uma malha só, ligue a importação de hierarquia (importar como Blueprint ou como cena) ou monte a hierarquia à mão pelos nomes.
2. No Blueprint, gire o componente `junta-juntaA` em torno do eixo +Y do glTF (na Unreal, depois da conversão de eixos, é o eixo que o componente mostra ao selecioná-lo; confira girando 90° e vendo a carcaça B dar a volta no eixo do atuador).
3. Acrescente um componente Cable (CableComponent) como filho de `cabo.ponta-de` (o nó vazio da ponta A, que já traz a posição e a direção da porta) e ponha em `Cable Length`, `Cable Width`, `Num Segments` e `Num Sides` os valores `CableLength`, `CableWidth`, `NumSegments` e `NumSides` dos extras do nó `cabo` (em centímetro, como a Unreal pede; os extras aparecem como metadados do nó importado, e estão no `.glb`, que se abre em texto em qualquer visualizador de JSON).
4. Em `Attach End To`, escolha o componente `cabo.ponta-para` (o nome está em `AttachEndTo`, e o de início em `AttachStartTo`). Esconda a malha estática `cabo` (é a pose de repouso, para quem não monta o cabo vivo).
5. O CableComponent simula a corda com a gravidade e o atrito da Unreal; os valores dos extras dão o tamanho e a seção, e a forma em cada pose é a dela. Para o cabo de comprimento certo em cada ângulo, o dado é o comprimento de corte (`comprimentoDeCorteMm`), que a simulação da Unreal só aproxima.

## Fatia 6: o addon do Blender que mantém o comprimento do cabo (2026-11-27)

O addon é o pacote `modulos/exportador-gltf/blender/addon_cabo_vivo/` (`__init__.py` com o painel e os operadores, `cabos.py` com a ligação ao Blender, `elastica.py` com a conta em numpy, sem `bpy`, e `blender_manifest.toml`). A exportação com cabo grava `modelar_cabo_vivo.zip` ao lado do `.glb` e do `cabo-vivo.py`; o `.zip` é a extensão do Blender 4.2 ou mais nova, com o manifesto na raiz.

Como instalar e usar:

1. No Blender (4.2 ou mais novo): Edit > Preferences > Get Extensions, o menu de cima à direita (setinha), Install from Disk, e escolha `modelar_cabo_vivo.zip`. Deixe a extensão ligada.
2. Importe o `.glb` (File > Import > glTF 2.0).
3. Na vista 3D, aperte N e abra a aba Modelar, painel Cabo vivo: Montar cabos cria, para cada cabo importado, uma curva de Bézier com espessura (bevel pelo diâmetro, lados pela resolução do bevel), esconde a malha estática do cabo e a refaz na hora. Dali em diante, girar o nó da junta ou animá-lo refaz a curva em cada quadro com o comprimento de corte. O painel mostra o estado de cada cabo (`ok`, `estica` quando as pontas ficam longe demais para o comprimento, `dobra` quando o raio de dobra da haste cai abaixo do declarado) e o comprimento da curva.
4. Gravar cabos percorre o intervalo da animação da cena (início e fim da linha do tempo), refaz o cabo a frio em cada quadro e grava a forma como chaves de animação nos pontos e alças da curva. O cabo gravado deixa de ser refeito pelo addon, e o arquivo `.blend` reproduz a forma sem o addon, em outro computador e na renderização. Desgravar cabos apaga a gravação e devolve o cabo ao modo vivo.

Sem janela e sem painel, o mesmo cabe em Python: `bpy.ops.modelar.cabos_montar()`, `bpy.ops.modelar.cabos_gravar()` e `bpy.ops.modelar.cabos_desgravar()`.

O que o addon lê é o que a exportação grava nos `extras` do nó do cabo (`comprimentoDeCorteMm`, `diametroMm`, `lados`, `raioMinimoDiametros`, `caimento`) e os dois nós vazios das pontas (`AttachStartTo` e `AttachEndTo`): a posição de cada vazio é a ponta e o +Z dele no Blender é a direção de saída. O caimento puxa o cabo para −Z do mundo. A conta é a da família portada: a mesma haste de 17 a 97 nós, a mesma elástica por complemento de Schur com a projeção de Newton, a mesma Hermite entre os nós (o Bézier do Blender tem as alças da Hermite, um terço da corda) e o mesmo acerto do comprimento liso a 0,02%. Ela é determinística: mesmo estado, mesma saída. Enquanto a junta se move, a conta parte da forma anterior quando as pontas andaram menos de três trechos e viraram menos de 0,3; senão parte do palpite de Bézier. Os dois dão a mesma curva: a diferença é de 4e-9 mm. Vale só para o cabo de duas pontas: passagens, terminais e feixe não vão nos `extras`, e o addon refaz um cabo livre entre as duas pontas.

Medido aqui (Blender 5.3 como biblioteca do Python, `MODELAR_BPY_PYTHON=<python com bpy> npx vitest run tools/blender/cabo-vivo.test.mjs`; o teste instala o `.zip` como extensão, importa o `.glb` do arranjo que passa, monta e gira a junta A de −90° a 90° de 15 em 15 graus; sem o Blender ele se pula):

| Medida | Resultado |
| --- | --- |
| comprimento da curva avaliada contra o de corte (150 mm) | dentro de 0,5% em todos os ângulos |
| pontas contra a montagem | a menos de 0,1 mm em todos os ângulos |
| raio mínimo de dobra da haste (declarado 9 mm) | 13,00 mm no pior ângulo (±90°) |
| raio mínimo da curva lisa medido por três pontos | 7,16 mm no pior ângulo (±90°): a Hermite passa abaixo do raio da haste junto da emenda do trecho reto da ponta; a conta da família tem a mesma curva |
| distância máxima entre a curva do Blender e as estações da família | 0,127 mm no meio do curso, 0,183 mm no maior do curso (a polilinha das estações da família já se afasta até 0,2 mm da curva lisa) |
| tempo por atualização, um cabo (curso em passos de 1 grau) | 3,8 ms a conta em média (5,9 ms no máximo), 4,1 ms o quadro inteiro; 11,9 iterações em média |
| tempo por atualização, cinco cabos | 19,5 ms a conta em média (40,8 ms no máximo), 20,1 ms o quadro inteiro |
| gravar, 13 quadros, 189 curvas de animação | o arquivo aberto sem o addon (desligado e arquivo reaberto, sem nenhum gancho dele) reproduz a forma viva com diferença máxima de 4e-9 mm; depois de gravado o addon não refaz mais a curva |

O salto de ângulo grande (as pontas andando mais de três trechos entre duas atualizações) parte do palpite e leva uns 30 a 50 ms por cabo; arrastar a junta pelo mouse é o caso de passos pequenos. Não testado: Blender 4.2 e 4.3 (o código de gravar usa as curvas da ação plana nesses; só o Blender 5.3 foi rodado), a janela do Blender (o painel), e o Blender de verdade como executável (aqui só o módulo `bpy`).


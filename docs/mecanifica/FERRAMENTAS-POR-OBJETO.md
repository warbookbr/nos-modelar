# Ferramentas por objeto

<!-- Gerado por `npm run ferramentas:gerar` a partir de `ferramentas-por-objeto.json`. Não edite à mão; `ferramentas:check` reprova a divergência. -->

Este documento responde que ferramentas o Mecanifica precisa ter para a IA modelar os objetos da [lista de famílias](FAMILIAS-DE-OBJETOS.md) sem reconstruir cada forma a partir de primitivas. Cada um dos 369 objetos das 28 famílias da fase atual recebeu as ferramentas que tirariam dela a maior parte do trabalho, e as ferramentas estão ordenadas pelo número de objetos que atendem. A referência diz de onde vem a ideia (addon ou modificador do Blender, CAD por código, bancada de CAD ou catálogo), e a coluna "aqui" diz o que o esboço e o núcleo já fazem. Os dados estão em [`ferramentas-por-objeto.json`](ferramentas-por-objeto.json).

Cada objeto da fase atual recebe as ferramentas que tirariam da IA a maior parte do trabalho de modelá-lo. Uma ferramenta entra no objeto quando sem ela a IA teria de reconstruir a forma a partir de primitivas; operações que todo objeto usa um pouco (espelho, arredondar uma aresta) só entram quando definem o objeto.

Os tipos são três. O modificador age sobre uma forma que já existe; o gerador cria uma forma geral a partir de poucos parâmetros; o especializado gera uma peça mecânica padronizada, que costuma virar família do catálogo.

## Ferramentas, por objetos atendidos

| # | Ferramenta | Tipo | Objetos | Famílias | Aqui | O que automatiza |
|---|---|---|---|---|---|---|
| 1 | casca com espessura (`casca`) | modificador | 125 (34%) | 25 | parcial | transforma um sólido fechado numa parede de espessura constante, com faces abertas escolhidas (carenagem, tanque, gabinete, panela, capacete) |
| 2 | articulações (`articula`) | especializado | 93 (25%) | 25 | parcial | gera dobradiça, olhal, garfo com pino, rótula e tesoura com o eixo de giro publicado como porta |
| 3 | estrutura de barras (`barras`) | gerador | 72 (20%) | 19 | parcial | faz uma rede de nós e barras com perfil, juntas nos nós e padrões de treliça prontos (quadro tubular, treliça, andaime, torre, grade de arame) |
| 4 | repetição em série (`repete`) | modificador | 69 (19%) | 24 | parcial | copia uma forma em linha, em grade NxM, em círculo ou ao longo de um caminho, com contagem e passo |
| 5 | chapa dobrada (`chapa`) | gerador | 62 (17%) | 16 | parcial | faz peça de chapa por abas e dobras com raio, alívio de canto e espessura constante (suporte, carroceria de caminhão, eletrocalha, gabinete metálico) |
| 6 | gabinete (`gabinete`) | gerador | 57 (15%) | 16 | não | faz caixa de equipamento com tampa, encaixe entre as metades, ressaltos, grade de ventilação e recortes de painel |
| 7 | cabo ou mangueira entre pontos (`cabo`) | gerador | 49 (13%) | 19 | parcial | liga dois pontos com caimento e raio mínimo de curva, com terminal em cada ponta, e feixes de vários cabos |
| 8 | roda e pneu (`rodaPneu`) | especializado | 49 (13%) | 11 | sim | gera aro, disco ou raios, cubo com furação e pneu com seção e banda, que encaixam por aro |
| 9 | superfície suave por seções (`loftSuave`) | gerador | 46 (12%) | 15 | parcial | faz carenagem, casco e fuselagem por seções com transição curva, em vez de troncos planos entre seções |
| 10 | furação em padrão (`furos`) | modificador | 43 (12%) | 16 | parcial | fura em grade, em círculo (PCD) ou em favo, com escareado, rebaixo ou rosca, em qualquer face |
| 11 | perfil estrutural (`perfil`) | gerador | 43 (12%) | 18 | parcial | estende uma seção normalizada (I, H, U, L, tubo, alumínio ranhurado) ao longo de uma linha, com cortes de ponta |
| 12 | manopla e botão (`manopla`) | especializado | 42 (11%) | 14 | não | gera botão rotativo, manípulo, volante e cabo ergonômico com furo de eixo e estrias |
| 13 | guia linear (`guia`) | especializado | 32 (9%) | 13 | parcial | gera trilho e carro, corrediça de gaveta e guia em V por tamanho e curso |
| 14 | tubulação com conexões (`tubulacao`) | gerador | 27 (7%) | 11 | não | traça uma rede de tubos e põe sozinha as curvas, tês, reduções, flanges e válvulas por bitola |
| 15 | engrenagens (`engrenagem`) | especializado | 26 (7%) | 11 | parcial | gera engrenagem reta, helicoidal, cônica, sem-fim, cremalheira e catraca com dente evolvente por módulo e número de dentes, e diz a distância entre centros do par |
| 16 | molas (`mola`) | especializado | 26 (7%) | 10 | parcial | gera mola de compressão, tração com ganchos e torção com braços, com espiras fechadas nas pontas e comprimento entre dois pontos |
| 17 | rosca (`rosca`) | especializado | 26 (7%) | 13 | não | faz rosca macho ou fêmea métrica, trapezoidal ou de tampa, em qualquer cilindro ou furo |
| 18 | tecido e estofado (`tecido`) | gerador | 26 (7%) | 11 | não | faz almofada inflada com costura, lona esticada, vela e rede a partir de contorno e pressão |
| 19 | atuador linear (`atuador`) | especializado | 24 (7%) | 10 | parcial | gera cilindro hidráulico ou pneumático e fuso com camisa, haste, olhais e portas, por curso e diâmetro, ligado entre dois pontos |
| 20 | móvel modular (`movel`) | gerador | 23 (6%) | 6 | parcial | faz caixaria de móvel com laterais, prateleiras, portas e gavetas por vãos |
| 21 | fixadores normalizados (`fixador`) | especializado | 21 (6%) | 9 | parcial | gera parafuso, porca, arruela, rebite e pino por norma e bitola |
| 22 | relevo funcional (`textura`) | modificador | 21 (6%) | 10 | parcial | aplica recartilhado, estrias de pega, piso antiderrapante ou chapa ondulada numa face |
| 23 | elos ao longo de caminho fechado (`elos`) | gerador | 19 (5%) | 8 | não | distribui elos articulados num contorno fechado em volta de rodas (corrente, esteira de trator, porta-cabos, degraus de escada rolante, correia dentada) |
| 24 | texto e escala gravados (`texto`) | modificador | 19 (5%) | 9 | não | grava ou põe em relevo letras, números e escalas graduadas (paquímetro, mostrador, placa) |
| 25 | polia e correia (`polia`) | especializado | 18 (5%) | 7 | não | gera polias em V ou dentadas e a correia fechada que as envolve na posição certa |
| 26 | perfil aerodinâmico e pás (`aerofolio`) | gerador | 17 (5%) | 6 | não | gera asa, empenagem, pá de hélice, rotor e ventoinha por perfil NACA, corda, torção, enflechamento e número de pás |
| 27 | elementos de construção (`arquitetura`) | gerador | 13 (4%) | 6 | não | faz parede com aberturas, laje, telhado de águas e escada por espelho e piso |
| 28 | dobrar, torcer e afunilar (`deforma`) | modificador | 11 (3%) | 9 | não | deforma uma forma pronta ao longo de um eixo (shape de skate, lâmina curva, escudo abaulado, cabide) |
| 29 | rolamentos e buchas (`rolamento`) | especializado | 11 (3%) | 4 | parcial | gera rolamento por série com anéis, corpos rolantes, gaiola e vedação, e bucha e mancal com furação |
| 30 | lâmina e dentes de corte (`lamina`) | especializado | 10 (3%) | 6 | não | gera gume afiado, serrilha e dentes de serra ao longo de uma borda |
| 31 | corte e união gerais (`booleana`) | modificador | 9 (2%) | 8 | parcial | subtrai, une ou intersecta formas quaisquer, para rasgos, janelas, cavidades e peças fundidas |
| 32 | hélice (`helice`) | gerador | 9 (2%) | 3 | parcial | gera o caminho e o sólido helicoidal de passo, raio e voltas quaisquer (mola, rosca, caracol transportador, bobina, escada caracol) |
| 33 | encaixe por pressão (`encaixe`) | especializado | 8 (2%) | 4 | não | gera clipe, gancho elástico e engate entre duas peças, com a folga certa |
| 34 | placa de circuito (`pcb`) | gerador | 8 (2%) | 7 | não | faz a placa com furos de fixação e componentes por encapsulamento padrão |
| 35 | varredura de perfil (`varre`) | gerador | 8 (2%) | 6 | parcial | passa um perfil qualquer ao longo de um caminho 3D, com seção que pode mudar no percurso (duto, trompete, armação de óculos) |
| 36 | vedação (`vedacao`) | especializado | 7 (2%) | 2 | não | gera o-ring, retentor e junta plana, com a canaleta de alojamento cortada na peça |
| 37 | arredondar e chanfrar arestas escolhidas (`arredonda`) | modificador | 6 (2%) | 2 | parcial | arredonda ou chanfra as arestas que a IA nomeia, em qualquer forma, e não só na caixa |
| 38 | came (`came`) | especializado | 5 (1%) | 3 | não | gera o perfil do came a partir da lei de movimento do seguidor |
| 39 | eixo escalonado (`eixo`) | especializado | 5 (1%) | 2 | parcial | gera eixo por trechos com diâmetro, rasgo de chaveta, ranhura de anel elástico, chanfro e ponta roscada |
| 40 | nervura de reforço (`nervura`) | modificador | 4 (1%) | 3 | não | põe nervuras finas entre paredes de uma casca, presas às faces que tocam |
| 41 | bobina e núcleo (`bobina`) | especializado | 3 (1%) | 2 | não | gera enrolamento sobre carretel e núcleo de lâminas para motor, transformador e solenoide |
| 42 | ressalto para parafuso (`ressalto`) | modificador | 1 (0%) | 1 | não | cria o pino oco de fixação dentro de um gabinete, com furo, rebaixo e raiz arredondada |

## O que falta, por objetos atendidos

As ferramentas que não existem ou existem em parte, na mesma ordem, com o que já há.

- casca com espessura (`parcial`, 125 objetos): a extensão nativa `casca` do núcleo esvazia sólido convexo ou de três faces por vértice, só para dentro; o esboço só tem o anel (cilindro oco); casca de forma livre e lado de fora não existem.
- articulações (`parcial`, 93 objetos): extensão nativa de articulação (revolução e prismática, curso conferido contra as peças por `conferirArticulacao`) e família `dobradica` de abas; rótula de esfera e olhal fora do cilindro não.
- estrutura de barras (`parcial`, 72 objetos): extensão nativa `estruturaDeBarras` do núcleo: barras de tubo ou perfil maciço entre nós, com corte de ponta e massa; juntas soldadas e padrões não; tubo do esboço.
- repetição em série (`parcial`, 69 objetos): arranja linear e radial no esboço e no núcleo, e ao longo de tubo no esboço; grade 2D não.
- chapa dobrada (`parcial`, 62 objetos): extensão nativa `chapaDobrada` do núcleo: abas, dobras com raio, tampas e origem estrutural; alívio de canto e planificado de peça qualquer não.
- gabinete (`não`, 57 objetos): nem esboço nem núcleo.
- cabo ou mangueira entre pontos (`parcial`, 49 objetos): tubo do esboço, sem caimento nem terminais.
- roda e pneu (`sim`, 49 objetos): família `roda-pneu` 2.0: de 50 a 2000 mm, pneumático, maciço, sem pneu e com garra, disco, raiada de um plano e de duas flanges, sete perfis prontos e portas de eixo, assento e furos.
- superfície suave por seções (`parcial`, 46 objetos): loft no esboço e no núcleo, com faces planas entre seções; inflate no núcleo.
- furação em padrão (`parcial`, 43 objetos): esboço: furos na caixa; núcleo: furo com centros; escareado, rebaixo e furo fora da caixa não.
- perfil estrutural (`parcial`, 43 objetos): componente perfil do esboço: L, U e tubo retangular.
- manopla e botão (`não`, 42 objetos): nem esboço nem núcleo.
- guia linear (`parcial`, 32 objetos): trilho simples de gaveta e de porta de correr dentro da família `movel-de-caixa`, com articulação prismática; trilho e carro avulsos e guia em V não.
- tubulação com conexões (`não`, 27 objetos): nem esboço nem núcleo.
- engrenagens (`parcial`, 26 objetos): componente engrenagem do esboço, com dente trapezoidal.
- molas (`parcial`, 26 objetos): componente mola do esboço, só compressão e três voltas.
- rosca (`não`, 26 objetos): nem esboço nem núcleo.
- tecido e estofado (`não`, 26 objetos): nem esboço nem núcleo.
- atuador linear (`parcial`, 24 objetos): família `cilindro-hidraulico`: camisa, haste, êmbolo, cabeça e olhais liso e com rótula, curso conferido; cilindro de haste dupla e telescópico não.
- móvel modular (`parcial`, 23 objetos): família `movel-de-caixa`: nove perfis (roupeiro, guarda-roupa, de correr, armário aéreo e de chão, cômoda, criado-mudo, estante, gaveteiro) com portas embutidas, sobrepostas e de correr, gavetas e curso conferido; cadeira, mesa e sofá não.
- fixadores normalizados (`parcial`, 21 objetos): componente parafuso do esboço, sem norma nem porca.
- relevo funcional (`parcial`, 21 objetos): núcleo: displace com ruído; padrão regular não existe.
- elos ao longo de caminho fechado (`não`, 19 objetos): nem esboço nem núcleo.
- texto e escala gravados (`não`, 19 objetos): nem esboço nem núcleo.
- polia e correia (`não`, 18 objetos): nem esboço nem núcleo.
- perfil aerodinâmico e pás (`não`, 17 objetos): nem esboço nem núcleo.
- elementos de construção (`não`, 13 objetos): nem esboço nem núcleo.
- dobrar, torcer e afunilar (`não`, 11 objetos): nem esboço nem núcleo.
- rolamentos e buchas (`parcial`, 11 objetos): componentes rolamento e mancal do esboço, sem pista nem gaiola.
- lâmina e dentes de corte (`não`, 10 objetos): nem esboço nem núcleo.
- corte e união gerais (`parcial`, 9 objetos): núcleo: subtrair, unir, intersectar; esboço: só furos na caixa.
- hélice (`parcial`, 9 objetos): componente mola do esboço, com três voltas fixas.
- encaixe por pressão (`não`, 8 objetos): nem esboço nem núcleo.
- placa de circuito (`não`, 8 objetos): nem esboço nem núcleo.
- varredura de perfil (`parcial`, 8 objetos): esboço: tubo de seção circular e envolve; núcleo: loft ao longo de caminho.
- vedação (`não`, 7 objetos): nem esboço nem núcleo.
- arredondar e chanfrar arestas escolhidas (`parcial`, 6 objetos): esboço: raio e chanfro só na caixa; núcleo: arredondarAresta, arredondarCostura, chamferBox.
- came (`não`, 5 objetos): nem esboço nem núcleo.
- eixo escalonado (`parcial`, 5 objetos): cilindro e revolução do esboço; chaveta e ranhura não.
- nervura de reforço (`não`, 4 objetos): nem esboço nem núcleo.
- bobina e núcleo (`não`, 3 objetos): nem esboço nem núcleo.
- ressalto para parafuso (`não`, 1 objetos): nem esboço nem núcleo.

## Cada ferramenta

### gabinete (`gabinete`)

Faz caixa de equipamento com tampa, encaixe entre as metades, ressaltos, grade de ventilação e recortes de painel. Parâmetros: dimensões, parede, divisão, recortes. Referências: BOSL2; geradores de caixa de projeto paramétrica. Aqui: não, nem esboço nem núcleo. Atende 57 objetos em 16 famílias.

### manopla e botão (`manopla`)

Gera botão rotativo, manípulo, volante e cabo ergonômico com furo de eixo e estrias. Parâmetros: tipo, diâmetro, eixo, pega. Referências: BOSL2; bibliotecas de knob paramétrico. Aqui: não, nem esboço nem núcleo. Atende 42 objetos em 14 famílias.

### tubulação com conexões (`tubulacao`)

Traça uma rede de tubos e põe sozinha as curvas, tês, reduções, flanges e válvulas por bitola. Parâmetros: traçado, bitola, tipo de conexão. Referências: FreeCAD: Dodo e Flamingo; Plant 3D (conceito de catálogo de conexões). Aqui: não, nem esboço nem núcleo. Atende 27 objetos em 11 famílias.

### rosca (`rosca`)

Faz rosca macho ou fêmea métrica, trapezoidal ou de tampa, em qualquer cilindro ou furo. Parâmetros: tipo, passo, diâmetro, comprimento, sentido. Referências: BOSL2: threading e bottlecaps; Blender: Bolt Factory; FreeCAD: Thread. Aqui: não, nem esboço nem núcleo. Atende 26 objetos em 13 famílias.

### tecido e estofado (`tecido`)

Faz almofada inflada com costura, lona esticada, vela e rede a partir de contorno e pressão. Parâmetros: contorno, espessura, pressão, costuras, pontos de amarra. Referências: Blender: Cloth e pressão; Marvelous Designer (conceito). Aqui: não, nem esboço nem núcleo. Atende 26 objetos em 11 famílias.

### casca com espessura (`casca`)

Transforma um sólido fechado numa parede de espessura constante, com faces abertas escolhidas (carenagem, tanque, gabinete, panela, capacete). Parâmetros: espessura, faces abertas, lado (dentro ou fora). Referências: Blender: modificador Solidify; CadQuery e build123d: shell; Onshape e FreeCAD: Shell/Thickness. Aqui: parcial, a extensão nativa `casca` do núcleo esvazia sólido convexo ou de três faces por vértice, só para dentro; o esboço só tem o anel (cilindro oco); casca de forma livre e lado de fora não existem. Atende 125 objetos em 25 famílias.

### articulações (`articula`)

Gera dobradiça, olhal, garfo com pino, rótula e tesoura com o eixo de giro publicado como porta. Parâmetros: tipo, diâmetro do pino, abas, ângulo. Referências: BOSL2: hinges; Onshape e Fusion: juntas de montagem. Aqui: parcial, extensão nativa de articulação (revolução e prismática, curso conferido contra as peças por `conferirArticulacao`) e família `dobradica` de abas; rótula de esfera e olhal fora do cilindro não. Atende 93 objetos em 25 famílias.

### estrutura de barras (`barras`)

Faz uma rede de nós e barras com perfil, juntas nos nós e padrões de treliça prontos (quadro tubular, treliça, andaime, torre, grade de arame). Parâmetros: nós, barras ou padrão de treliça, perfil da barra, tipo de junta. Referências: Blender: modificador Skin e Wireframe; Onshape: Frame; FreeCAD: Frame. Aqui: parcial, extensão nativa `estruturaDeBarras` do núcleo: barras de tubo ou perfil maciço entre nós, com corte de ponta e massa; juntas soldadas e padrões não; tubo do esboço. Atende 72 objetos em 19 famílias.

### repetição em série (`repete`)

Copia uma forma em linha, em grade NxM, em círculo ou ao longo de um caminho, com contagem e passo. Parâmetros: modo, contagem, passo ou ângulo, caminho. Referências: Blender: modificadores Array e Curve; BOSL2: grid_copies, rot_copies, path_copies. Aqui: parcial, arranja linear e radial no esboço e no núcleo, e ao longo de tubo no esboço; grade 2D não. Atende 69 objetos em 24 famílias.

### chapa dobrada (`chapa`)

Faz peça de chapa por abas e dobras com raio, alívio de canto e espessura constante (suporte, carroceria de caminhão, eletrocalha, gabinete metálico). Parâmetros: espessura, abas, ângulo e raio de cada dobra, alívio. Referências: FreeCAD: SheetMetal; Onshape: Sheet Metal. Aqui: parcial, extensão nativa `chapaDobrada` do núcleo: abas, dobras com raio, tampas e origem estrutural; alívio de canto e planificado de peça qualquer não. Atende 62 objetos em 16 famílias.

### cabo ou mangueira entre pontos (`cabo`)

Liga dois pontos com caimento e raio mínimo de curva, com terminal em cada ponta, e feixes de vários cabos. Parâmetros: pontas, comprimento ou folga, diâmetro, terminais. Referências: Blender: curva com Bevel e física de corda; Blender Geometry Nodes: cabos entre pontos. Aqui: parcial, tubo do esboço, sem caimento nem terminais. Atende 49 objetos em 19 famílias.

### roda e pneu (`rodaPneu`)

Gera aro, disco ou raios, cubo com furação e pneu com seção e banda, que encaixam por aro. Parâmetros: aro, largura, seção, raios ou disco, furação, banda. Referências: Blender: modelagem por Screw e Array (técnica). Aqui: sim, família `roda-pneu` 2.0: de 50 a 2000 mm, pneumático, maciço, sem pneu e com garra, disco, raiada de um plano e de duas flanges, sete perfis prontos e portas de eixo, assento e furos. Atende 49 objetos em 11 famílias.

### elos ao longo de caminho fechado (`elos`)

Distribui elos articulados num contorno fechado em volta de rodas (corrente, esteira de trator, porta-cabos, degraus de escada rolante, correia dentada). Parâmetros: elo, passo, rodas ou caminho, tensão. Referências: Blender: Array com Curve (técnica de esteira); FreeCAD Gears: sprocket. Aqui: não, nem esboço nem núcleo. Atende 19 objetos em 8 famílias.

### texto e escala gravados (`texto`)

Grava ou põe em relevo letras, números e escalas graduadas (paquímetro, mostrador, placa). Parâmetros: texto ou divisões, fonte, altura, profundidade. Referências: BOSL2: text3d; CadQuery: text; Blender: objeto Text. Aqui: não, nem esboço nem núcleo. Atende 19 objetos em 9 famílias.

### polia e correia (`polia`)

Gera polias em V ou dentadas e a correia fechada que as envolve na posição certa. Parâmetros: perfil, diâmetros, centros, largura. Referências: FreeCAD Gears: timing gear; BOSL2. Aqui: não, nem esboço nem núcleo. Atende 18 objetos em 7 famílias.

### perfil aerodinâmico e pás (`aerofolio`)

Gera asa, empenagem, pá de hélice, rotor e ventoinha por perfil NACA, corda, torção, enflechamento e número de pás. Parâmetros: perfil, corda e torção ao longo do raio ou da envergadura, pás. Referências: OpenVSP; gerador de perfis NACA; Blender: Extra Objects. Aqui: não, nem esboço nem núcleo. Atende 17 objetos em 6 famílias.

### elementos de construção (`arquitetura`)

Faz parede com aberturas, laje, telhado de águas e escada por espelho e piso. Parâmetros: planta, pé-direito, aberturas, inclinação, degraus. Referências: Blender: Archimesh; FreeCAD: BIM. Aqui: não, nem esboço nem núcleo. Atende 13 objetos em 6 famílias.

### dobrar, torcer e afunilar (`deforma`)

Deforma uma forma pronta ao longo de um eixo (shape de skate, lâmina curva, escudo abaulado, cabide). Parâmetros: eixo, ângulo de dobra ou de torção, fator de afunilamento. Referências: Blender: modificador Simple Deform. Aqui: não, nem esboço nem núcleo. Atende 11 objetos em 9 famílias.

### lâmina e dentes de corte (`lamina`)

Gera gume afiado, serrilha e dentes de serra ao longo de uma borda. Parâmetros: ângulo do gume, dentes, passo, travamento. Referências: BOSL2 (técnica por perfil). Aqui: não, nem esboço nem núcleo. Atende 10 objetos em 6 famílias.

### encaixe por pressão (`encaixe`)

Gera clipe, gancho elástico e engate entre duas peças, com a folga certa. Parâmetros: tipo, deflexão, interferência. Referências: BOSL2: joiners; Fusion: Snap Fit. Aqui: não, nem esboço nem núcleo. Atende 8 objetos em 4 famílias.

### placa de circuito (`pcb`)

Faz a placa com furos de fixação e componentes por encapsulamento padrão. Parâmetros: contorno, furos, componentes e posição. Referências: KiCad e KiCad StepUp: modelos 3D por encapsulamento. Aqui: não, nem esboço nem núcleo. Atende 8 objetos em 7 famílias.

### vedação (`vedacao`)

Gera o-ring, retentor e junta plana, com a canaleta de alojamento cortada na peça. Parâmetros: tipo, diâmetro, seção, compressão. Referências: tabelas de canaleta por norma de o-ring. Aqui: não, nem esboço nem núcleo. Atende 7 objetos em 2 famílias.

### came (`came`)

Gera o perfil do came a partir da lei de movimento do seguidor. Parâmetros: curso, ângulos de subida, repouso e descida, raio de base. Referências: FreeCAD e Onshape: geradores de came (conceito). Aqui: não, nem esboço nem núcleo. Atende 5 objetos em 3 famílias.

### nervura de reforço (`nervura`)

Põe nervuras finas entre paredes de uma casca, presas às faces que tocam. Parâmetros: espessura, caminho ou direção, altura. Referências: Onshape: Rib; Fusion: Rib e Web. Aqui: não, nem esboço nem núcleo. Atende 4 objetos em 3 famílias.

### bobina e núcleo (`bobina`)

Gera enrolamento sobre carretel e núcleo de lâminas para motor, transformador e solenoide. Parâmetros: núcleo, carretel, espiras, camadas. Referências: técnica por hélice e repetição. Aqui: não, nem esboço nem núcleo. Atende 3 objetos em 2 famílias.

### ressalto para parafuso (`ressalto`)

Cria o pino oco de fixação dentro de um gabinete, com furo, rebaixo e raiz arredondada. Parâmetros: diâmetro, altura, furo, rosca. Referências: Fusion: Boss. Aqui: não, nem esboço nem núcleo. Atende 1 objetos em 1 famílias.

### superfície suave por seções (`loftSuave`)

Faz carenagem, casco e fuselagem por seções com transição curva, em vez de troncos planos entre seções. Parâmetros: seções, curvatura entre elas, densidade. Referências: Blender: Subdivision Surface; OpenVSP; FreeCAD Ship; CadQuery: loft com ruled=False. Aqui: parcial, loft no esboço e no núcleo, com faces planas entre seções; inflate no núcleo. Atende 46 objetos em 15 famílias.

### furação em padrão (`furos`)

Fura em grade, em círculo (PCD) ou em favo, com escareado, rebaixo ou rosca, em qualquer face. Parâmetros: padrão, diâmetro, passo, tipo de furo, face. Referências: Onshape e FreeCAD: Hole com padrão; BOSL2: grid_copies com screw_hole. Aqui: parcial, esboço: furos na caixa; núcleo: furo com centros; escareado, rebaixo e furo fora da caixa não. Atende 43 objetos em 16 famílias.

### perfil estrutural (`perfil`)

Estende uma seção normalizada (I, H, U, L, tubo, alumínio ranhurado) ao longo de uma linha, com cortes de ponta. Parâmetros: seção e tamanho, comprimento, corte de ponta. Referências: FreeCAD: Frame/BIM Profile; Onshape: Frame. Aqui: parcial, componente perfil do esboço: L, U e tubo retangular. Atende 43 objetos em 18 famílias.

### guia linear (`guia`)

Gera trilho e carro, corrediça de gaveta e guia em V por tamanho e curso. Parâmetros: tamanho, curso, tipo. Referências: catálogos de fabricantes em STEP (conceito). Aqui: parcial, trilho simples de gaveta e de porta de correr dentro da família `movel-de-caixa`, com articulação prismática; trilho e carro avulsos e guia em V não. Atende 32 objetos em 13 famílias.

### engrenagens (`engrenagem`)

Gera engrenagem reta, helicoidal, cônica, sem-fim, cremalheira e catraca com dente evolvente por módulo e número de dentes, e diz a distância entre centros do par. Parâmetros: tipo, módulo, dentes, ângulo de pressão, largura. Referências: FreeCAD Gears; BOSL2: gears; Blender: Extra Objects (gears). Aqui: parcial, componente engrenagem do esboço, com dente trapezoidal. Atende 26 objetos em 11 famílias.

### molas (`mola`)

Gera mola de compressão, tração com ganchos e torção com braços, com espiras fechadas nas pontas e comprimento entre dois pontos. Parâmetros: tipo, diâmetro do arame, diâmetro médio, voltas, comprimento livre. Referências: BOSL2; FreeCAD: Spring; Blender: Extra Objects. Aqui: parcial, componente mola do esboço, só compressão e três voltas. Atende 26 objetos em 10 famílias.

### atuador linear (`atuador`)

Gera cilindro hidráulico ou pneumático e fuso com camisa, haste, olhais e portas, por curso e diâmetro, ligado entre dois pontos. Parâmetros: diâmetro, curso, extensão, montagem das pontas. Referências: catálogos de fabricantes em STEP (conceito). Aqui: parcial, família `cilindro-hidraulico`: camisa, haste, êmbolo, cabeça e olhais liso e com rótula, curso conferido; cilindro de haste dupla e telescópico não. Atende 24 objetos em 10 famílias.

### móvel modular (`movel`)

Faz caixaria de móvel com laterais, prateleiras, portas e gavetas por vãos. Parâmetros: dimensões, vãos, tipo de cada vão, espessura do painel. Referências: Blender: Archimesh (armários). Aqui: parcial, família `movel-de-caixa`: nove perfis (roupeiro, guarda-roupa, de correr, armário aéreo e de chão, cômoda, criado-mudo, estante, gaveteiro) com portas embutidas, sobrepostas e de correr, gavetas e curso conferido; cadeira, mesa e sofá não. Atende 23 objetos em 6 famílias.

### fixadores normalizados (`fixador`)

Gera parafuso, porca, arruela, rebite e pino por norma e bitola. Parâmetros: tipo, norma, bitola, comprimento. Referências: Blender: Bolt Factory; FreeCAD: Fasteners; BOSL2: screws. Aqui: parcial, componente parafuso do esboço, sem norma nem porca. Atende 21 objetos em 9 famílias.

### relevo funcional (`textura`)

Aplica recartilhado, estrias de pega, piso antiderrapante ou chapa ondulada numa face. Parâmetros: padrão, passo, profundidade, face. Referências: BOSL2: knurling e textures; Blender: Displace com textura de imagem. Aqui: parcial, núcleo: displace com ruído; padrão regular não existe. Atende 21 objetos em 10 famílias.

### rolamentos e buchas (`rolamento`)

Gera rolamento por série com anéis, corpos rolantes, gaiola e vedação, e bucha e mancal com furação. Parâmetros: série e tamanho, tipo. Referências: FreeCAD: Fasteners e Parts Library; catálogos de fabricantes em STEP. Aqui: parcial, componentes rolamento e mancal do esboço, sem pista nem gaiola. Atende 11 objetos em 4 famílias.

### corte e união gerais (`booleana`)

Subtrai, une ou intersecta formas quaisquer, para rasgos, janelas, cavidades e peças fundidas. Parâmetros: operandos, operação. Referências: Blender: modificador Boolean; Manifold; CadQuery: cut, union. Aqui: parcial, núcleo: subtrair, unir, intersectar; esboço: só furos na caixa. Atende 9 objetos em 8 famílias.

### hélice (`helice`)

Gera o caminho e o sólido helicoidal de passo, raio e voltas quaisquer (mola, rosca, caracol transportador, bobina, escada caracol). Parâmetros: raio, passo, voltas, perfil, sentido. Referências: Blender: modificador Screw; CadQuery: Wire.makeHelix; BOSL2: helix e spiral_sweep. Aqui: parcial, componente mola do esboço, com três voltas fixas. Atende 9 objetos em 3 famílias.

### varredura de perfil (`varre`)

Passa um perfil qualquer ao longo de um caminho 3D, com seção que pode mudar no percurso (duto, trompete, armação de óculos). Parâmetros: perfil, caminho, escala ou rotação ao longo do caminho. Referências: Blender: curva com Bevel e Taper; CadQuery e build123d: sweep; BOSL2: path_sweep. Aqui: parcial, esboço: tubo de seção circular e envolve; núcleo: loft ao longo de caminho. Atende 8 objetos em 6 famílias.

### arredondar e chanfrar arestas escolhidas (`arredonda`)

Arredonda ou chanfra as arestas que a IA nomeia, em qualquer forma, e não só na caixa. Parâmetros: arestas por nome ou por seleção, raio ou distância. Referências: Blender: modificador Bevel; CadQuery e build123d: fillet e chamfer; BOSL2: rounding. Aqui: parcial, esboço: raio e chanfro só na caixa; núcleo: arredondarAresta, arredondarCostura, chamferBox. Atende 6 objetos em 2 famílias.

### eixo escalonado (`eixo`)

Gera eixo por trechos com diâmetro, rasgo de chaveta, ranhura de anel elástico, chanfro e ponta roscada. Parâmetros: trechos, chavetas, ranhuras, pontas. Referências: FreeCAD PartDesign: Shaft Design Wizard. Aqui: parcial, cilindro e revolução do esboço; chaveta e ranhura não. Atende 5 objetos em 2 famílias.

## Objetos

### Veículos terrestres

| Objeto | Ferramentas |
|---|---|
| carro de passeio | superfície suave por seções, casca com espessura, roda e pneu, molas, articulações, corte e união gerais |
| picape | superfície suave por seções, casca com espessura, chapa dobrada, roda e pneu, molas, articulações |
| ônibus | casca com espessura, chapa dobrada, estrutura de barras, roda e pneu, repetição em série, articulações |
| caminhão | chapa dobrada, perfil estrutural, roda e pneu, molas, casca com espessura, cabo ou mangueira entre pontos |
| carreta | perfil estrutural, chapa dobrada, roda e pneu, molas, repetição em série, articulações |
| moto | estrutura de barras, superfície suave por seções, casca com espessura, roda e pneu, molas, elos ao longo de caminho fechado, cabo ou mangueira entre pontos |
| scooter | superfície suave por seções, casca com espessura, roda e pneu, molas, estrutura de barras |
| bicicleta | estrutura de barras, roda e pneu, elos ao longo de caminho fechado, engrenagens, cabo ou mangueira entre pontos, fixadores normalizados |
| triciclo | estrutura de barras, roda e pneu, elos ao longo de caminho fechado, cabo ou mangueira entre pontos |
| quadriciclo | estrutura de barras, roda e pneu, molas, articulações, superfície suave por seções |
| kart | estrutura de barras, roda e pneu, articulações, chapa dobrada |
| trem | casca com espessura, chapa dobrada, roda e pneu, molas, perfil estrutural, repetição em série |
| vagão | chapa dobrada, perfil estrutural, roda e pneu, molas, repetição em série |
| bonde | casca com espessura, chapa dobrada, roda e pneu, articulações, cabo ou mangueira entre pontos |
| carrinho de mão | estrutura de barras, roda e pneu, casca com espessura |
| carrinho de supermercado | estrutura de barras, roda e pneu, articulações |
| patinete | estrutura de barras, roda e pneu, articulações, manopla e botão |
| skate | dobrar, torcer e afunilar, roda e pneu, rolamentos e buchas, fixadores normalizados, articulações |
| cadeira de rodas | estrutura de barras, roda e pneu, tecido e estofado, articulações, manopla e botão |

### Veículos aéreos e espaciais

| Objeto | Ferramentas |
|---|---|
| avião comercial | perfil aerodinâmico e pás, superfície suave por seções, casca com espessura, roda e pneu, repetição em série, atuador linear |
| avião de pequeno porte | perfil aerodinâmico e pás, superfície suave por seções, casca com espessura, roda e pneu |
| planador | perfil aerodinâmico e pás, superfície suave por seções, casca com espessura |
| helicóptero | perfil aerodinâmico e pás, superfície suave por seções, casca com espessura, estrutura de barras, articulações |
| drone multirrotor | perfil aerodinâmico e pás, gabinete, perfil estrutural, repetição em série, placa de circuito |
| drone de asa fixa | perfil aerodinâmico e pás, superfície suave por seções, casca com espessura |
| balão | superfície suave por seções, tecido e estofado, cabo ou mangueira entre pontos, repetição em série |
| dirigível | superfície suave por seções, tecido e estofado, perfil aerodinâmico e pás, casca com espessura |
| foguete | casca com espessura, perfil aerodinâmico e pás, tubulação com conexões, repetição em série |
| cápsula | casca com espessura, superfície suave por seções, repetição em série, relevo funcional |
| satélite | gabinete, chapa dobrada, repetição em série, estrutura de barras, articulações |
| sonda | gabinete, estrutura de barras, cabo ou mangueira entre pontos, articulações |
| estação espacial | casca com espessura, estrutura de barras, repetição em série, articulações, cabo ou mangueira entre pontos |
| rover | estrutura de barras, roda e pneu, articulações, gabinete, cabo ou mangueira entre pontos |

### Embarcações

| Objeto | Ferramentas |
|---|---|
| barco a remo | superfície suave por seções, casca com espessura, articulações |
| lancha | superfície suave por seções, casca com espessura, corte e união gerais, perfil aerodinâmico e pás |
| veleiro | superfície suave por seções, casca com espessura, tecido e estofado, cabo ou mangueira entre pontos, perfil estrutural |
| jet ski | superfície suave por seções, casca com espessura, manopla e botão |
| navio cargueiro | superfície suave por seções, chapa dobrada, casca com espessura, repetição em série, perfil estrutural, estrutura de barras |
| navio tanque | superfície suave por seções, chapa dobrada, casca com espessura, tubulação com conexões |
| rebocador | superfície suave por seções, casca com espessura, chapa dobrada, cabo ou mangueira entre pontos |
| balsa | chapa dobrada, casca com espessura, perfil estrutural, repetição em série |
| submarino | superfície suave por seções, casca com espessura, perfil aerodinâmico e pás |
| boia | casca com espessura, cabo ou mangueira entre pontos |
| plataforma flutuante | estrutura de barras, perfil estrutural, tubulação com conexões, chapa dobrada, casca com espessura |

### Máquinas pesadas, de construção e agrícolas

| Objeto | Ferramentas |
|---|---|
| escavadeira | chapa dobrada, elos ao longo de caminho fechado, atuador linear, articulações, cabo ou mangueira entre pontos, casca com espessura |
| retroescavadeira | chapa dobrada, atuador linear, articulações, roda e pneu, cabo ou mangueira entre pontos, casca com espessura |
| pá carregadeira | chapa dobrada, atuador linear, articulações, roda e pneu, cabo ou mangueira entre pontos |
| trator de esteira | elos ao longo de caminho fechado, chapa dobrada, atuador linear, articulações, casca com espessura |
| motoniveladora | chapa dobrada, perfil estrutural, atuador linear, articulações, roda e pneu |
| rolo compactador | chapa dobrada, casca com espessura, articulações, roda e pneu |
| guindaste | estrutura de barras, cabo ou mangueira entre pontos, polia e correia, perfil estrutural, roda e pneu, atuador linear |
| grua | estrutura de barras, cabo ou mangueira entre pontos, polia e correia, perfil estrutural, repetição em série |
| empilhadeira | perfil estrutural, elos ao longo de caminho fechado, atuador linear, roda e pneu, chapa dobrada, guia linear |
| caminhão betoneira | hélice, casca com espessura, chapa dobrada, roda e pneu, perfil estrutural |
| perfuratriz | estrutura de barras, hélice, atuador linear, guia linear, perfil estrutural |
| trator agrícola | casca com espessura, chapa dobrada, roda e pneu, articulações, atuador linear |
| colheitadeira | chapa dobrada, hélice, roda e pneu, repetição em série, lâmina e dentes de corte, casca com espessura |
| pulverizador | estrutura de barras, tubulação com conexões, cabo ou mangueira entre pontos, articulações, roda e pneu |
| plantadeira | chapa dobrada, perfil estrutural, repetição em série, roda e pneu, elos ao longo de caminho fechado |
| enfardadeira | chapa dobrada, repetição em série, elos ao longo de caminho fechado, roda e pneu, engrenagens |

### Máquinas industriais

| Objeto | Ferramentas |
|---|---|
| torno | chapa dobrada, gabinete, guia linear, rosca, manopla e botão, engrenagens, texto e escala gravados |
| fresadora | gabinete, guia linear, rosca, manopla e botão, chapa dobrada |
| furadeira de bancada | casca com espessura, polia e correia, guia linear, manopla e botão, molas |
| prensa | chapa dobrada, atuador linear, guia linear, perfil estrutural |
| dobradeira | chapa dobrada, atuador linear, guia linear, perfil estrutural |
| serra de fita | chapa dobrada, casca com espessura, polia e correia, lâmina e dentes de corte |
| retífica | gabinete, guia linear, manopla e botão, casca com espessura |
| injetora | gabinete, chapa dobrada, atuador linear, guia linear, hélice, tubulação com conexões |
| extrusora | hélice, tubulação com conexões, gabinete, repetição em série |
| esteira transportadora | perfil estrutural, polia e correia, rolamentos e buchas, repetição em série |
| linha de montagem | perfil estrutural, estrutura de barras, repetição em série, guia linear |
| ponte rolante | perfil estrutural, guia linear, cabo ou mangueira entre pontos, polia e correia, roda e pneu |
| compressor | casca com espessura, tubulação com conexões, repetição em série, polia e correia |
| gerador industrial | gabinete, chapa dobrada, repetição em série, furação em padrão, cabo ou mangueira entre pontos |
| misturador | casca com espessura, lâmina e dentes de corte, engrenagens |
| caldeira | casca com espessura, tubulação com conexões, chapa dobrada, furação em padrão |

### Robôs

| Objeto | Ferramentas |
|---|---|
| braço industrial | articulações, casca com espessura, superfície suave por seções, cabo ou mangueira entre pontos |
| robô SCARA | casca com espessura, articulações, guia linear, cabo ou mangueira entre pontos |
| robô cartesiano | perfil estrutural, guia linear, elos ao longo de caminho fechado, polia e correia, rosca |
| robô delta | estrutura de barras, articulações, casca com espessura |
| robô móvel com rodas | gabinete, roda e pneu, placa de circuito |
| robô de esteira | elos ao longo de caminho fechado, gabinete, roda e pneu |
| humanoide | superfície suave por seções, casca com espessura, articulações, cabo ou mangueira entre pontos |
| quadrúpede | superfície suave por seções, casca com espessura, articulações |
| garra | articulações, engrenagens, molas, relevo funcional |
| efetuador | articulações, atuador linear, furação em padrão |
| exoesqueleto | casca com espessura, articulações, tecido e estofado, estrutura de barras |
| robô aspirador | casca com espessura, gabinete, roda e pneu, repetição em série |
| drone terrestre | gabinete, roda e pneu, elos ao longo de caminho fechado, estrutura de barras |

### Motores, transmissões e mecanismos

| Objeto | Ferramentas |
|---|---|
| motor a combustão | came, fixadores normalizados, tubulação com conexões, casca com espessura, vedação, repetição em série |
| motor elétrico | casca com espessura, repetição em série, bobina e núcleo, rolamentos e buchas, fixadores normalizados, furação em padrão |
| motor de passo | bobina e núcleo, rolamentos e buchas, fixadores normalizados, casca com espessura |
| servo | gabinete, engrenagens, fixadores normalizados, placa de circuito |
| turbina | perfil aerodinâmico e pás, repetição em série, casca com espessura, superfície suave por seções |
| caixa de câmbio | casca com espessura, engrenagens, rolamentos e buchas, vedação, fixadores normalizados, nervura de reforço, eixo escalonado |
| redutor | casca com espessura, engrenagens, rolamentos e buchas, vedação, nervura de reforço, eixo escalonado |
| diferencial | engrenagens, casca com espessura, rolamentos e buchas, fixadores normalizados |
| embreagem | molas, repetição em série, furação em padrão, rolamentos e buchas |
| freio | furação em padrão, repetição em série, casca com espessura |
| suspensão | molas, atuador linear, articulações, estrutura de barras |
| direção | engrenagens, articulações, manopla e botão, estrutura de barras |
| atuador linear | atuador linear, rosca, guia linear |
| cilindro hidráulico | atuador linear, articulações, tubulação com conexões, cabo ou mangueira entre pontos, vedação |
| cilindro pneumático | atuador linear, articulações, tubulação com conexões |
| bomba | casca com espessura, tubulação com conexões, perfil aerodinâmico e pás, vedação |
| came e seguidor | came, molas, articulações |
| biela e manivela | articulações, furação em padrão, superfície suave por seções |
| catraca | engrenagens, molas, articulações |

### Elementos de máquina e fixação

| Objeto | Ferramentas |
|---|---|
| parafuso | fixadores normalizados, rosca |
| porca | fixadores normalizados, rosca |
| arruela | fixadores normalizados |
| rebite | fixadores normalizados |
| pino | fixadores normalizados |
| chaveta | eixo escalonado |
| mola de compressão | molas, hélice |
| mola de tração | molas, hélice |
| mola de torção | molas, hélice |
| rolamento | rolamentos e buchas |
| bucha | rolamentos e buchas |
| mancal | rolamentos e buchas, furação em padrão, fixadores normalizados |
| engrenagem reta | engrenagens |
| helicoidal | engrenagens |
| cônica e sem-fim | engrenagens, hélice |
| polia | polia e correia |
| correia | polia e correia, elos ao longo de caminho fechado |
| corrente | elos ao longo de caminho fechado |
| coroa e pinhão | engrenagens, elos ao longo de caminho fechado |
| acoplamento | furação em padrão, corte e união gerais, fixadores normalizados |
| eixo | eixo escalonado |
| junta universal | articulações |
| junta homocinética | articulações, repetição em série |
| dobradiça | articulações |
| trilho | guia linear, perfil estrutural |
| guia linear | guia linear |
| fuso | rosca, eixo escalonado |
| vedação | vedação |
| anel o-ring | vedação |

### Ferramentas

| Objeto | Ferramentas |
|---|---|
| martelo | superfície suave por seções, relevo funcional |
| chave de boca | corte e união gerais, texto e escala gravados |
| chave de fenda | manopla e botão, relevo funcional |
| alicate | articulações, relevo funcional, lâmina e dentes de corte |
| serrote | lâmina e dentes de corte, manopla e botão |
| furadeira | casca com espessura, relevo funcional, furação em padrão, engrenagens |
| parafusadeira | casca com espessura, relevo funcional, furação em padrão |
| esmerilhadeira | casca com espessura, relevo funcional, furação em padrão, engrenagens |
| serra circular | casca com espessura, lâmina e dentes de corte, relevo funcional |
| lixadeira | casca com espessura, relevo funcional |
| tupia | casca com espessura, manopla e botão, rosca |
| morsa | rosca, guia linear, relevo funcional, manopla e botão |
| grampo | rosca, manopla e botão |
| macaco hidráulico | atuador linear, articulações, manopla e botão |
| torquímetro | texto e escala gravados, manopla e botão, relevo funcional |
| paquímetro | texto e escala gravados, guia linear, lâmina e dentes de corte |

### Energia

| Objeto | Ferramentas |
|---|---|
| gerador | gabinete, furação em padrão, repetição em série, cabo ou mangueira entre pontos |
| painel solar | repetição em série, perfil estrutural, chapa dobrada |
| turbina eólica | perfil aerodinâmico e pás, casca com espessura, superfície suave por seções |
| bateria | gabinete, texto e escala gravados, repetição em série |
| inversor | gabinete, repetição em série, furação em padrão, placa de circuito |
| transformador | bobina e núcleo, casca com espessura, repetição em série |
| poste de transmissão | estrutura de barras, cabo ou mangueira entre pontos, repetição em série |
| subestação | estrutura de barras, cabo ou mangueira entre pontos, repetição em série |
| usina em miniatura | repetição em série, tubulação com conexões, elementos de construção |
| carregador de veículo | gabinete, cabo ou mangueira entre pontos, texto e escala gravados |

### Transporte vertical

| Objeto | Ferramentas |
|---|---|
| elevador | chapa dobrada, guia linear, cabo ou mangueira entre pontos, polia e correia |
| escada rolante | elos ao longo de caminho fechado, perfil estrutural, repetição em série, guia linear |
| esteira rolante | elos ao longo de caminho fechado, perfil estrutural, repetição em série |
| plataforma elevatória | articulações, atuador linear, chapa dobrada |
| monta-carga | chapa dobrada, guia linear, cabo ou mangueira entre pontos, polia e correia |
| teleférico | cabo ou mangueira entre pontos, polia e correia, casca com espessura, estrutura de barras |

### Climatização e ventilação

| Objeto | Ferramentas |
|---|---|
| ar-condicionado | gabinete, furação em padrão, repetição em série, perfil aerodinâmico e pás, tubulação com conexões |
| ventilador | perfil aerodinâmico e pás, casca com espessura, estrutura de barras, articulações |
| exaustor | perfil aerodinâmico e pás, chapa dobrada, furação em padrão |
| coifa | chapa dobrada, furação em padrão |
| desumidificador | gabinete, furação em padrão |
| aquecedor | gabinete, furação em padrão, repetição em série |
| duto | chapa dobrada, varredura de perfil, tubulação com conexões |
| grelha | furação em padrão, repetição em série, chapa dobrada |
| torre de resfriamento | casca com espessura, superfície suave por seções, repetição em série, tubulação com conexões |

### Instalações

| Objeto | Ferramentas |
|---|---|
| tubulação | tubulação com conexões |
| conexão de tubo | tubulação com conexões, rosca |
| válvula | tubulação com conexões, manopla e botão, fixadores normalizados, rosca |
| registro | tubulação com conexões, manopla e botão, rosca |
| bomba | casca com espessura, tubulação com conexões, perfil aerodinâmico e pás |
| caixa d'água | casca com espessura, rosca |
| reservatório | casca com espessura, tubulação com conexões, furação em padrão |
| filtro | casca com espessura, rosca, repetição em série |
| medidor | gabinete, texto e escala gravados, tubulação com conexões |
| eletroduto | varredura de perfil, tubulação com conexões |
| eletrocalha | chapa dobrada, furação em padrão, perfil estrutural |
| cabo | cabo ou mangueira entre pontos |
| quadro elétrico | gabinete, chapa dobrada, articulações |
| painel de comando | gabinete, manopla e botão, texto e escala gravados |
| tomada | gabinete, encaixe por pressão |
| interruptor | gabinete, encaixe por pressão, articulações |

### Eletrodomésticos

| Objeto | Ferramentas |
|---|---|
| geladeira | gabinete, casca com espessura, articulações, manopla e botão |
| fogão | chapa dobrada, manopla e botão, estrutura de barras, articulações |
| forno | gabinete, articulações, manopla e botão, furação em padrão |
| micro-ondas | gabinete, furação em padrão, articulações, texto e escala gravados |
| máquina de lavar | gabinete, casca com espessura, furação em padrão, articulações, manopla e botão |
| secadora | gabinete, casca com espessura, furação em padrão, articulações |
| lava-louças | gabinete, estrutura de barras, articulações |
| liquidificador | casca com espessura, lâmina e dentes de corte, rosca, manopla e botão |
| batedeira | casca com espessura, articulações, dobrar, torcer e afunilar |
| cafeteira | casca com espessura, gabinete, manopla e botão |
| aspirador | casca com espessura, cabo ou mangueira entre pontos, varredura de perfil, roda e pneu |
| ferro de passar | superfície suave por seções, casca com espessura, furação em padrão, cabo ou mangueira entre pontos |
| torradeira | chapa dobrada, furação em padrão, manopla e botão |

### Eletrônicos e gabinetes

| Objeto | Ferramentas |
|---|---|
| computador de mesa | gabinete, furação em padrão, placa de circuito, chapa dobrada |
| notebook | gabinete, articulações, repetição em série, arredondar e chanfrar arestas escolhidas |
| celular | gabinete, arredondar e chanfrar arestas escolhidas, corte e união gerais |
| tablet | gabinete, arredondar e chanfrar arestas escolhidas |
| monitor | gabinete, articulações, arredondar e chanfrar arestas escolhidas |
| teclado | repetição em série, gabinete, texto e escala gravados |
| mouse | superfície suave por seções, casca com espessura |
| controle | superfície suave por seções, casca com espessura, manopla e botão, relevo funcional |
| roteador | gabinete, furação em padrão, repetição em série |
| caixa de som | gabinete, furação em padrão, casca com espessura |
| fone | superfície suave por seções, casca com espessura, tecido e estofado, cabo ou mangueira entre pontos, articulações |
| câmera | gabinete, manopla e botão, texto e escala gravados, relevo funcional |
| console | gabinete, furação em padrão, arredondar e chanfrar arestas escolhidas |
| gabinete de equipamento | gabinete, chapa dobrada, furação em padrão |
| rack de servidor | chapa dobrada, perfil estrutural, furação em padrão, repetição em série |
| placa de circuito | placa de circuito |

### Móveis

| Objeto | Ferramentas |
|---|---|
| cadeira | móvel modular, estrutura de barras, tecido e estofado, dobrar, torcer e afunilar |
| poltrona | tecido e estofado, móvel modular |
| sofá | tecido e estofado, móvel modular |
| banco | móvel modular, estrutura de barras |
| mesa | móvel modular, estrutura de barras |
| escrivaninha | móvel modular |
| armário | móvel modular, articulações |
| guarda-roupa | móvel modular, articulações, guia linear |
| cômoda | móvel modular, guia linear |
| estante | móvel modular, repetição em série |
| prateleira | móvel modular, fixadores normalizados |
| cama | móvel modular, tecido e estofado |
| beliche | móvel modular, estrutura de barras, elementos de construção |
| berço | móvel modular, repetição em série |
| rack | móvel modular |
| gaveteiro | móvel modular, guia linear |
| cadeira de escritório | tecido e estofado, atuador linear, roda e pneu, estrutura de barras, articulações |

### Construção e estruturas

| Objeto | Ferramentas |
|---|---|
| casa | elementos de construção |
| galpão | elementos de construção, estrutura de barras, perfil estrutural, chapa dobrada |
| ponte | estrutura de barras, perfil estrutural, cabo ou mangueira entre pontos |
| torre | estrutura de barras, perfil estrutural |
| andaime | estrutura de barras, fixadores normalizados |
| escada | elementos de construção |
| rampa | elementos de construção, estrutura de barras |
| portão | estrutura de barras, articulações, guia linear |
| cerca | estrutura de barras, repetição em série |
| telhado | elementos de construção, chapa dobrada, repetição em série |
| treliça | estrutura de barras |
| viga | perfil estrutural |
| pilar | perfil estrutural |
| laje | elementos de construção |
| contêiner | chapa dobrada, relevo funcional, articulações |
| abrigo | elementos de construção, estrutura de barras, chapa dobrada |

### Mobiliário urbano e infraestrutura

| Objeto | Ferramentas |
|---|---|
| poste de luz | perfil estrutural, casca com espessura, cabo ou mangueira entre pontos |
| semáforo | gabinete, repetição em série |
| placa | chapa dobrada, texto e escala gravados |
| banco de praça | móvel modular, estrutura de barras |
| lixeira | chapa dobrada, furação em padrão, casca com espessura |
| ponto de ônibus | estrutura de barras, elementos de construção, chapa dobrada |
| hidrante | casca com espessura, rosca, tubulação com conexões |
| bicicletário | estrutura de barras, repetição em série |
| cancela | articulações, perfil estrutural, gabinete |
| guarita | elementos de construção |
| parquímetro | gabinete, texto e escala gravados |

### Equipamentos médicos e de laboratório

| Objeto | Ferramentas |
|---|---|
| maca | estrutura de barras, tecido e estofado, roda e pneu, articulações |
| cadeira odontológica | tecido e estofado, articulações, atuador linear, superfície suave por seções |
| cama hospitalar | estrutura de barras, móvel modular, articulações, atuador linear, roda e pneu |
| prótese | superfície suave por seções, articulações, casca com espessura |
| órtese | casca com espessura, articulações, tecido e estofado |
| muleta | estrutura de barras, manopla e botão, furação em padrão |
| andador | estrutura de barras, roda e pneu, manopla e botão |
| microscópio | casca com espessura, manopla e botão, guia linear, rosca |
| centrífuga | casca com espessura, articulações, repetição em série |
| estufa | gabinete, articulações, texto e escala gravados |
| bancada de laboratório | móvel modular, perfil estrutural |
| suporte de soro | estrutura de barras, roda e pneu |

### Esporte e lazer

| Objeto | Ferramentas |
|---|---|
| aparelhos de academia | estrutura de barras, perfil estrutural, cabo ou mangueira entre pontos, polia e correia, guia linear |
| bicicleta ergométrica | estrutura de barras, casca com espessura, polia e correia |
| esteira de corrida | polia e correia, perfil estrutural, gabinete |
| halteres | relevo funcional, rosca |
| gol | estrutura de barras, tecido e estofado |
| cesta de basquete | estrutura de barras, chapa dobrada, tecido e estofado |
| mesa de pingue-pongue | móvel modular, articulações, estrutura de barras, tecido e estofado |
| brinquedo de parquinho | estrutura de barras, elementos de construção, casca com espessura |
| gangorra | estrutura de barras, articulações |
| balanço | estrutura de barras, cabo ou mangueira entre pontos, elos ao longo de caminho fechado |
| escorregador | casca com espessura, dobrar, torcer e afunilar, estrutura de barras |
| carrinho de controle remoto | casca com espessura, roda e pneu, molas, placa de circuito |

### Armas e defesa, históricas e de jogo

| Objeto | Ferramentas |
|---|---|
| armadura | casca com espessura, dobrar, torcer e afunilar, articulações, fixadores normalizados |
| escudo | casca com espessura, dobrar, torcer e afunilar |
| espada | lâmina e dentes de corte, manopla e botão, relevo funcional |
| catapulta | estrutura de barras, articulações, cabo ou mangueira entre pontos, engrenagens |
| trabuco | estrutura de barras, articulações, cabo ou mangueira entre pontos |
| balista | estrutura de barras, cabo ou mangueira entre pontos, articulações, engrenagens |
| canhão | corte e união gerais, roda e pneu |
| torre de cerco | estrutura de barras, elementos de construção, roda e pneu |

### Instrumentos musicais

| Objeto | Ferramentas |
|---|---|
| violão | superfície suave por seções, casca com espessura, repetição em série, cabo ou mangueira entre pontos, manopla e botão |
| guitarra | superfície suave por seções, repetição em série, cabo ou mangueira entre pontos, manopla e botão |
| baixo | superfície suave por seções, repetição em série, cabo ou mangueira entre pontos, manopla e botão |
| violino | superfície suave por seções, casca com espessura, cabo ou mangueira entre pontos, dobrar, torcer e afunilar |
| piano | móvel modular, repetição em série, articulações |
| teclado | repetição em série, gabinete |
| bateria | casca com espessura, fixadores normalizados, estrutura de barras |
| flauta | furação em padrão, articulações, molas |
| trompete | varredura de perfil, superfície suave por seções, molas |
| saxofone | varredura de perfil, superfície suave por seções, articulações, molas |
| pedestal | estrutura de barras, articulações, rosca |
| amplificador | gabinete, tecido e estofado, manopla e botão |

### Relógios e mecanismos de precisão

| Objeto | Ferramentas |
|---|---|
| relógio de pulso | casca com espessura, engrenagens, texto e escala gravados, elos ao longo de caminho fechado |
| relógio de parede | texto e escala gravados, engrenagens, casca com espessura |
| relógio de pêndulo | engrenagens, móvel modular, articulações, texto e escala gravados |
| câmera fotográfica | gabinete, manopla e botão, relevo funcional, texto e escala gravados |
| fechadura | molas, fixadores normalizados, corte e união gerais |
| cadeado | articulações, molas, casca com espessura |
| cofre | chapa dobrada, articulações, manopla e botão, texto e escala gravados |
| caixa de música | engrenagens, móvel modular, repetição em série |
| autômato mecânico | came, engrenagens, articulações |

### Embalagens e recipientes

| Objeto | Ferramentas |
|---|---|
| garrafa | casca com espessura, rosca, superfície suave por seções |
| lata | casca com espessura, chapa dobrada |
| frasco | casca com espessura, rosca |
| pote | casca com espessura, rosca |
| caixa | chapa dobrada, encaixe por pressão |
| palete | repetição em série, perfil estrutural |
| engradado | casca com espessura, furação em padrão, repetição em série, nervura de reforço |
| barril | casca com espessura, dobrar, torcer e afunilar, repetição em série |
| tanque | casca com espessura, tubulação com conexões, chapa dobrada |
| botijão | casca com espessura, rosca |
| contêiner de carga | chapa dobrada, articulações, relevo funcional |
| tampa | rosca, relevo funcional, casca com espessura |

### Utensílios e objetos do dia a dia

| Objeto | Ferramentas |
|---|---|
| talheres | dobrar, torcer e afunilar, lâmina e dentes de corte |
| panela | casca com espessura, manopla e botão |
| frigideira | casca com espessura, manopla e botão |
| chaleira | casca com espessura, superfície suave por seções, manopla e botão |
| luminária | articulações, casca com espessura, cabo ou mangueira entre pontos, molas |
| abajur | casca com espessura, tecido e estofado, cabo ou mangueira entre pontos |
| óculos | articulações, varredura de perfil |
| guarda-chuva | tecido e estofado, articulações, repetição em série |
| mochila | tecido e estofado |
| mala | casca com espessura, roda e pneu, guia linear, manopla e botão |
| porta-retrato | perfil estrutural |
| vaso | casca com espessura, superfície suave por seções |
| cabide | varredura de perfil, dobrar, torcer e afunilar |

### Moda e acessórios

| Objeto | Ferramentas |
|---|---|
| calçado | superfície suave por seções, tecido e estofado, relevo funcional |
| bolsa | tecido e estofado, encaixe por pressão |
| cinto | tecido e estofado, furação em padrão |
| relógio | casca com espessura, engrenagens, elos ao longo de caminho fechado |
| joia | repetição em série, varredura de perfil |
| capacete | casca com espessura, superfície suave por seções, furação em padrão |
| óculos de proteção | casca com espessura, tecido e estofado |
| luva de proteção | tecido e estofado |

### Peças funcionais para impressão 3D

| Objeto | Ferramentas |
|---|---|
| suporte | nervura de reforço, furação em padrão, arredondar e chanfrar arestas escolhidas |
| adaptador | rosca, corte e união gerais |
| gabarito | furação em padrão, corte e união gerais |
| caixa de projeto | gabinete, ressalto para parafuso, encaixe por pressão, furação em padrão |
| organizador | repetição em série, casca com espessura |
| engate rápido | encaixe por pressão, molas |
| clipe | encaixe por pressão, dobrar, torcer e afunilar |
| dobradiça impressa | articulações |
| encaixe por pressão | encaixe por pressão |

### Máquinas têxteis e de embalagem

| Objeto | Ferramentas |
|---|---|
| máquina de costura | casca com espessura, engrenagens, came, manopla e botão |
| tear | estrutura de barras, repetição em série, cabo ou mangueira entre pontos, came |
| bordadeira | gabinete, guia linear, placa de circuito |
| envasadora | perfil estrutural, tubulação com conexões, repetição em série, guia linear |
| rotuladora | perfil estrutural, polia e correia, guia linear |
| seladora | gabinete, atuador linear, articulações |
| embaladora | perfil estrutural, polia e correia, guia linear, gabinete |

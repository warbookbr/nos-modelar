# Levantamento: desenho sem referência

Fatia 1 do plano [desenho sem referência](planos/2026-10-13-desenho-sem-referencia.md), feita em 2026-10-14 por um agente em Opus 5.5 no ramo `claude/revisar-plano-ativo-cyj8c3`. Tudo o que foi instalado, compilado e executado ficou fora do repositório, numa pasta de trabalho temporária; o anexo traz os comandos. Cada afirmação diz de onde vem: verificado em execução neste contêiner, verificado em página ou código aberto, ou de memória e de resumo de busca, que não foram conferidos.

## Sumário e recomendação

A recomendação é um módulo novo, `modulos/desenho-por-restricoes`, em JavaScript, que usa como resolvedor o planegcs 1.3.0, o resolvedor do Sketcher do FreeCAD compilado para WebAssembly e publicado no npm, e põe por cima dele uma camada própria: o formato em que a IA declara partes, pontos nomeados e relações com o lado de cada uma, a tradução para as primitivas do planegcs, o relatório que volta à IA (estado, graus de liberdade, restrições em conflito e redundantes pelo nome que a IA deu, relação resolvida do lado errado e medidas derivadas) e a saída no formato `mecanifica.contornos@1`, que o esboço lê sem mudança e a prancha lê sem mudança de contrato. A lateral de um carrinho de mão com 17 restrições foi desenhada em cinco programas, e os quatro que resolvem restrições (planegcs, libslvs do SolveSpace, Sketcher do FreeCAD sem interface e a linha de comando do CADCraft) deram a mesma geometria até o milésimo de milímetro. O planegcs ganhou por rodar no Node do repositório em 83 a 110 ms por processo, pesar 1 MB sem dependência, dar o mesmo arquivo nas duas execuções e nomear o conflito e a redundância pelo identificador que a IA escreveu (verificado em execução). O FreeCAD tem o melhor diagnóstico, mas pesa 3 GB, leva 0,3 a 0,45 s por processo e não entra num gate; serve de oráculo para fixar valores de teste. Portar o resolvedor do CADCraft fica como plano B: o crate tem 3.793 linhas, cerca de 1.700 no núcleo do resolvedor, e não as 250 que a pesquisa de 2026-10-13 estimou (verificado no código).

A hipótese foi testada na parte que se mede sem rodar a IA. O formato dos contornos serve: o esboço exige só `formato`, `silhueta.contornoMm` e o `contornoMm` de cada região, e a prancha usa só `contornoMm`, `pedacos`, `foraDoModelo` e `mmPorPx`, nada do que liga o arquivo a uma imagem (verificado no código). O resolvedor dá a geometria e o diagnóstico que a IA precisa. Apareceu um achado contra a hipótese: com um chute inicial do lado errado, o planegcs devolveu sucesso, zero grau de liberdade e a caçamba espelhada para baixo do braço, porque a distância de ponto a reta não tem sinal (verificado em execução). Declarar relações não basta; o formato precisa dizer de que lado cada coisa fica, e o módulo precisa conferir o lado depois de resolver. A parte da hipótese que diz que a IA acerta mais e gasta menos com restrições do que com coordenadas não se mede sem a IA desenhando, e a proposta é que a fatia 2 meça as duas coisas sobre a mesma descrição.

O Potrace e o VectorCraft não devem trocar nem complementar o contorno da imagem. Numa imagem sintética com verdade conhecida, a borda subpixel atual fica a 0,09 px da verdade em média; o Potrace e o VectorCraft sobre a máscara ou com o limiar do módulo ficam de 0,33 a 0,55 px para fora; o único que fica melhor que o atual, o Potrace sobre a imagem ampliada oito vezes e cortada no meio-tom (0,045 px), parte a silhueta do avião em pedaços onde o traço escuro não fecha. O teste revelou um defeito do contorno atual: o alisamento da máscara (`denteMaximo`) corta ponta aguda, 5 px numa ponta de 21 graus, e no topo do avião ele tira de 102 a 138 mm das pontas das hélices.

O que depende da pessoa, com a recomendação de cada um. Primeiro, o resolvedor: planegcs (recomendado, LGPL-2.0 ou posterior, usado sem modificação como dependência fixada), portar o do CADCraft (MIT ou Apache-2.0, mais trabalho e pré-alfa) ou chamar o FreeCAD por fora. Segundo, o objeto de prova: a lateral sem cabo do braço robótico (recomendado), que tem contorno aprovado e partes de retas, arcos e anéis; a lateral do avião fica para depois, porque pede spline. Terceiro, quem escreve a descrição e que medidas ela pode trazer: a pessoa, com só a altura e o alcance totais (recomendado). Quarto, incluir na fatia 2 a comparação com a IA escrevendo coordenadas sobre a mesma descrição (recomendado, porque a hipótese é comparativa). Quinto, se o corte das pontas pelo `denteMaximo` vira item do backlog com o teste sintético como gate (recomendado). Sexto, se a prancha ganha uma linha que diga a procedência do desenho, ou se aceita o rótulo de referência raster que ela escreve hoje (recomendado mudar, duas linhas, sem mudar contrato).

## 1. O que a Mecanifica já tem e serve

O contorno da imagem (`modulos/contorno-da-imagem` e a porta `tools/mecanifica/contorno-da-imagem.mjs`) grava `<imagem>.contornos.json` no formato `mecanifica.contornos@1`: `imagem` (sha256, largura, altura), `mmPorPx`, `residuo` da calibração por duas âncoras, `silhueta` com `contornoPx`, `contornoMm`, `linhaDeForaMm`, `pedacos` e `linhasDeForaMm`, e em cada região `semente`, `areaMm2`, `contornoPx`, `contornoMm`, `pedacos` e, quando é o caso, `foraDoModelo`; com formas declaradas, `formas` traz o que foi ajustado e avisado. A coordenada em milímetro tem h para a direita e v para cima. Regerado neste contêiner, o arquivo das três vistas do avião saiu igual ao gravado byte a byte, em 0,5 a 1,0 s por vista com o OpenCV já carregado (verificado em execução). O módulo novo usa o formato direto como saída, sem os campos de pixel, que nenhum consumidor lê (verificado por busca em `tools/mecanifica/prancha/prancha-dos-contornos.mjs`, `modulos/esboco/src/referencia.js`, `tools/mecanifica/esboco-referencia.mjs`, `tools/mecanifica/descrever-peca.mjs` e `tools/mecanifica/contorno-da-peca.mjs`), e com um campo novo `origem` que diz o arquivo de desenho de onde veio.

A borda subpixel e a forma declarada são do caminho com imagem e o módulo novo não as usa: a geometria resolvida já é exata, e a reta e o arco saem como reta e arco. Elas continuam produzindo o contorno da referência escondida contra a qual o desenho é medido. O mecanismo de rodadas (`validarRodada`, `proximaAcao`, nota mínima 9 e três rodadas, em `modulos/contorno-da-imagem/src/rodadas.js` e `tools/mecanifica/rodadas-com-critico.mjs`) é usado direto nas rodadas do crítico sobre o desenho, e `empilharColuna` e `etiquetasFora` servem para pôr os nomes das partes fora do desenho, como a prancha já faz.

A prancha dos contornos (`npm run contorno:prancha`) lê o arquivo de contornos e o `<imagem>.prancha.json` com as cotas de cada parte, e o módulo novo a usa direto. Duas coisas dela supõem imagem, e nenhuma é contrato. A procedência gravada diz `referencia-raster-derivada` com "mm por pixel, calibrada por duas âncoras", e o subtítulo diz "partes pelo watershed com sementes"; num desenho isso sai falso, e com `mmPorPx` ausente a procedência escreve "undefined mm por pixel". O roteiro do crítico aponta como alvo `<base>.png`, que no desenho não existe; o módulo resolve isso gravando a vista em traço com esse nome, e o crítico da prancha passa a comparar a prancha com o desenho de onde ela saiu, que é o que se quer conferir nas cotas. A tolerância da cota por dois pontos usa `mmPorPx` e cai em 1 mm sem ele, o que serve à geometria exata (verificado no código).

O esboço (`modulos/esboco`) lê o contorno como referência por `plano.referencia`, com `lerContornos`, que exige só `formato`, `silhueta.contornoMm` e o `contornoMm` de cada região, e mede a razão interseção/união e o desvio por vista e por parte; `--medidas-da-referencia` tira dele as linhas de `plano.medidas`. O módulo novo é usado por ele direto, sem mudança. A conferência do esboço compara um esboço 3D com um contorno 2D; para medir o desenho 2D contra a referência escondida o módulo precisa da sua própria medida entre dois contornos, que é pequena (rasterizar os dois na mesma grade, como `referencia.js` faz). Os perfis por função do esboço (`modulos/esboco/src/perfis.js`, estrela, arco e outros) e o contorno por trechos do núcleo (`procedural/nucleo/curva2d.js`, reto, arco, arco tangente, concordância e spline Catmull-Rom, puro e sem import) são adiados: o protótipo só precisa de reta, círculo e arco, e importar o núcleo quebraria a independência pedida; se a spline for necessária depois, `curva2d.js` entra como exceção de leitura declarada, como o esboço já faz com `procedural/nucleo/contorno.js`.

As famílias (`procedural/familias/`: roda-pneu, dobradiça, cilindro hidráulico, móvel de caixa e superfície aerodinâmica) são 3D, passam pelo núcleo de autoria e têm parâmetros em razão do tamanho principal. O módulo novo as adia. O que elas podem dar ao desenho mais tarde é vocabulário de proporção (a razão entre aro e pneu, a faixa de haste por camisa do cilindro), que a IA usaria como relação declarada e não como chamada de família.

O crítico visual (`.claude/agents/critico-visual.md`) é usado direto na prova, no modo que já existe, alvo contra modelo: depois de o desenho fechar, o alvo passa a ser a imagem escondida e o modelo é a vista em traço. Sem imagem, o agente diz que julgar forma sem alvo é opinião; o modo de julgar a vista pela descrição é o risco que o plano já registra e fica adiado. A calibração do crítico (`docs/mecanifica/banco-de-provas/calibracao-do-critico/`, doze imagens das quatro vistas do brief do esboço 3D) não cobre vista em traço 2D e fica adiada; o modo novo, se a pessoa o pedir, precisa de conjunto próprio.

## 2. O que existe fora

### 2.1 A prova comum

A mesma vista foi pedida a cada programa: a lateral de um carrinho de mão em milímetros, com o chão em v = 0 e o eixo da roda em h = 0. As relações foram 17 e fecham o desenho sem grau de liberdade: roda de raio 200 tangente ao chão e com o centro no eixo; braço de 1.500 mm saindo do centro da roda até o pegador, que fica a 650 mm do chão; pé vertical que sai do braço a 1.050 mm do centro da roda e acaba no chão; fundo da caçamba paralelo ao braço e 80 mm acima dele, começando a 250 mm do eixo e com 650 mm; traseira vertical até a borda, que fica a 900 mm do chão e é horizontal; e a frente a 120 graus do fundo. O chute inicial foi grosseiro, como a IA escreveria sem fazer conta. Cada programa rodou quatro cenários: completo; conflito, com uma segunda altura de 700 mm para o pegador; faltando, sem a altura da borda; e redundante, com uma relação que repete outra.

Os quatro resolvedores deram a mesma resposta: centro da roda em (0; 200), pegador em (1430,909; 650), pé de (1001,636; 515) a (1001,636; 0), fundo de (250; 362,484) a (870,06; 557,484), borda de (870,06; 900) a (−335,725; 900). A frente da caçamba passa 336 mm à frente do eixo da roda, o que é a consequência do ângulo de 120 graus e da borda a 900 mm; é o tipo de número que o relatório deve devolver à IA para ela conferir se a forma faz sentido (verificado em execução).

| programa | roda aqui | mesma saída nas duas execuções | tempo por processo | conflito | faltando | redundante |
|---|---|---|---|---|---|---|
| planegcs 1.3.0 (npm, WebAssembly) | sim, Node 22 | sim, JSON igual | 83 a 110 ms (carga 15 a 37, resolve 15 a 42) | falha e nomeia as duas alturas do pegador | sucesso com 1 grau de liberdade, sem dizer onde | converge e nomeia a redundante |
| libslvs pelo python-solvespace 3.0.8 | sim, Python 3.11 | sim, JSON igual | 33 a 36 ms | inconsistente e nomeia as duas alturas | sucesso com 1 grau de liberdade, sem dizer onde | inconsistente, sem nomear nada |
| Sketcher do FreeCAD 1.0.2 sem interface | sim, AppImage extraída, 3,0 GB | o JSON sim, o `.FCStd` não | 0,33 a 0,45 s (resolve 85 a 150 ms) | código −4 e as duas alturas pelo número | 1 grau de liberdade, sem dizer onde | código −2 e a redundante pelo número |
| CADCraft (cadcraft-cli, ramo de 2026-10-13) | sim, compilado da fonte em 3 min 34 s | sim, DXF igual | 15 ms | recusa ao acrescentar, "constraints conflict: #28, #8", saída 1 | 1 grau de liberdade e quais objetos ficaram soltos | recusa, "redundant with #11" |
| OpenSCAD 2021.01 | sim, apt | sim, SVG e DXF iguais | 25 ms | não há restrição | não há | não há |

Tudo na tabela foi verificado em execução. O que cada um pediu para escrever e o que cada um ensinou estão a seguir.

O planegcs recebe uma lista JSON de primitivas com identificador (ponto, reta, círculo, arco, elipse, B-spline) e restrições que citam os identificadores (`p2p_distance`, `p2l_distance`, `point_on_line_pl`, `tangent_lc`, `parallel`, `l2l_angle_ll`, `vertical_l`, `horizontal_l` e cerca de 80 outras), que é muito perto do que a IA escreveria. O identificador da restrição pode ser uma frase, e a frase volta na lista de conflito, de modo que a IA recebe "pegador a 650 do chão" e "pegador a 700 do chão" e não um número. O grau de liberdade é um só, para o desenho inteiro. A distância de ponto a reta não tem sinal, e daí veio o achado principal: com o fundo da caçamba amarrado por duas distâncias ao braço e o chute de um ponto abaixo dele, o resolvedor pôs o fundo atravessando o braço, e com o chute da caçamba inteira abaixo dele devolveu `Success`, zero grau de liberdade e a caçamba espelhada, com a frente em −518 mm em vez de −336 mm. Só o chute decide o ramo, e nada no relatório avisa. A licença é LGPL-2.0 ou posterior (verificado no npm), e o pacote foi publicado em 2026-10-05.

A libslvs, a biblioteca de resolução do SolveSpace, pelo python-solvespace (GPLv3 ou posterior, verificado no pip), tem distância com sinal, e por isso o mesmo chute ruim caiu no ramo certo. O preço é que o sinal depende do sentido em que a reta foi escrita: o chão escrito da origem para +h põe a distância positiva para baixo, e o desenho todo saiu de cabeça para baixo até a reta ser escrita ao contrário e a distância ao braço ganhar sinal negativo. Também foi preciso pôr o plano de trabalho num grupo fixo, sem o que o desenho tinha nove graus de liberdade a mais. A IA erraria as duas coisas. A redundância saiu como inconsistência sem nome. A linha de comando `solvespace-cli` só regenera e exporta arquivos `.slvs` já feitos e não serve para desenhar (verificado em execução).

O Sketcher do FreeCAD, por `freecadcmd` com um script Python, aceita as restrições com os nomes que um desenhista usa (`Radius`, `Tangent`, `PointOnObject`, `Coincident`, `Distance`, `DistanceX`, `DistanceY`, `Vertical`, `Horizontal`, `Parallel`, `Angle`), tem os eixos do desenho como geometria fixa e devolve `ConflictingConstraints`, `RedundantConstraints`, `PartiallyRedundantConstraints`, `MalformedConstraints` e `DoF`. É o mesmo resolvedor do planegcs, e por isso deu a mesma resposta. O arquivo `.FCStd` muda a cada gravação, então o arquivo salvo precisa ser o do repositório e não o dele. Não existe pacote do FreeCAD no Ubuntu 24.04 deste contêiner; a AppImage 1.0.2 baixada do GitHub tem 796 MB e 3,0 GB extraída, e o script imprime acentos só com `PYTHONIOENCODING=utf-8` (verificado em execução).

A linha de comando do CADCraft foi compilada da fonte (Rust, MIT ou Apache-2.0, verificado no `Cargo.toml`) e desenha por comandos no estilo do AutoCAD, `line`, `circle`, `geomconstraint` e `dcaligned`, `dchorizontal`, `dcvertical`, `dcangular` e `dcradius`, citando cada objeto pelo identificador que o comando anterior devolveu (100, 101 e assim por diante, em ordem). É o diagnóstico mais útil dos quatro: recusa a restrição que conflita no momento em que ela entra, com o número dela e o da outra, e `constraints.dof` diz quais objetos ainda têm liberdade, o que nenhum dos outros diz. Falta distância de ponto a reta, e a folga de 80 mm entre o braço e o fundo pediu uma reta auxiliar perpendicular. O raio salvo saiu 200,00000000001194, então quem grava precisa arredondar. O projeto se declara pré-alfa (verificado em execução e no código).

O OpenSCAD não tem resolvedor: a mesma vista saiu certa porque o script fez a conta da inclinação do braço e da frente da caçamba com seno e arco seno, e um nome indefinido vira só um aviso, com o arquivo gravado sem a parte (verificado em execução). É o caminho das coordenadas, com a conta na mão de quem escreve.

### 2.2 Programas de desenho comandados por script, sem resolvedor

O Inkscape 1.2.2 roda pela linha de comando com `--actions` e exportou um SVG para PNG em 1,3 s; não resolve restrição e no repositório não acrescenta nada ao que `svgParaPng` já faz (verificado em execução). O LibreCAD 2.2 tem os subcomandos `dxf2png` e `dxf2pdf`, mas `librecad dxf2png` ficou parado sem tela até o tempo-limite de 60 s, mesmo com `QT_QPA_PLATFORM=offscreen` (verificado em execução); o script em Lua é do LibreCAD 3, que não está no apt (de memória). O QCAD roda scripts ECMAScript sem interface com `qcad -platform offscreen -no-gui -allow-multiple-instances -autostart script.js`, e o fórum registra falhas de script que depende de ação de interface (resumo de busca); não tem resolvedor de restrições (de memória) e não está no apt deste contêiner. O CadQuery 2.8.0 (Apache-2.0, 1,8 GB instalado) tem esboço com restrições, mas aqui nem o exemplo da documentação convergiu: o resolvedor devolveu estado 4 com custo 0,17, o contorno saiu aberto e nada foi informado sobre conflito ou graus de liberdade (verificado em execução, causa não investigada). O build123d 0.13.0 não tem resolvedor de esboço (de memória) e não instala junto com o CadQuery 2.8.0 no mesmo ambiente, por conflito de dependências (verificado em execução). O Penrose, linguagem de diagrama por otimização com restrições, gera um diagrama enganoso quando a disposição é impossível, e a documentação não garante a mesma saída para a mesma semente (resumo de busca); não serve.

### 2.3 IA que desenha

O AIDL (https://github.com/deGravity/aidl) é a ideia mais próxima: uma linguagem hierárquica em Python em que o modelo declara estruturas e restrições, resolvida pelo SolveSpace pelo mesmo python-solvespace testado acima, com restrições geométricas exatas e restrições de composição por caixa, que admitem desigualdade e se resolvem alternando um sistema duro e um leve; a árvore de estruturas restringe cada restrição à própria subárvore, que vira um problema separado (verificado na página; a licença não aparece no README). O trabalho de Casey e outros no ICCV 2025, da Autodesk, usa o retorno do resolvedor do Fusion para treinar a geração de restrições e leva os esboços totalmente restritos de 34% a 93% (resumo de busca); o sinal é o mesmo que o relatório do módulo devolveria à IA, sem treino. O ezpz da Zoo existe no crates.io como `kcl-ezpz` 0.2.15, com uma versão em WebAssembly que os próprios autores dizem ser só de teste (resumo de busca), e o CADCraft o avaliou e preferiu escrever o seu porque ele traz a pilha de álgebra linear `faer` e modela a geometria da linguagem KCL (verificado no comentário de `crates/constraints/src/lib.rs`). Os demais itens da pesquisa de 2026-10-13 (JSketcher, Kiwi.js, CAD-Assistant, CADCodeVerify, HIPPE, build123d-mcp e os modelos treinados) não foram reabertos.

### 2.4 Avaliação pelos critérios

| candidato | roda aqui | determinístico | a IA comanda por texto | diagnóstico | licença | custo de manter |
|---|---|---|---|---|---|---|
| planegcs | sim | sim | JSON de primitivas | conflito e redundância por nome; grau de liberdade só global; sem lado | LGPL-2.0+ | baixo: uma dependência fixada de 1 MB |
| porte do resolvedor do CADCraft | o original roda | o original sim | o que o módulo definir | o melhor, com graus de liberdade por objeto | MIT ou Apache-2.0 | alto: cerca de 1.700 linhas de Rust para portar e manter |
| FreeCAD sem interface | sim, 3 GB | o resultado sim, o arquivo não | script Python | completo, sem dizer quem está solto | LGPL-2.0+ | alto: AppImage fora do apt e do npm |
| libslvs (python-solvespace) | sim | sim | script Python | conflito por índice; redundância sem nome | GPLv3+ | médio, e a GPL contamina o que a importa |
| cadcraft-cli como programa externo | sim, compilado | sim | comandos por identificador | o melhor dos que rodaram | MIT ou Apache-2.0 | alto: toolchain Rust e projeto pré-alfa |
| OpenSCAD, Inkscape, LibreCAD, QCAD, CadQuery, build123d | uns sim, outros não | os que rodaram, sim | sim | nenhum de restrição | GPL ou Apache | não resolvem o problema |

A camada própria do módulo cobre o que falta ao planegcs: o lado de cada relação, conferido depois de resolver, e o grau de liberdade por parte, que se acha resolvendo de novo com cada parte presa ou, se for preciso, portando só a análise do CADCraft (`crates/constraints/src/dof.rs`, 195 linhas, posto de jacobiano por componente com QR e pivotamento).

## 3. Potrace e VectorCraft no contorno da imagem

### 3.1 Como foi medido

O Potrace 1.16 veio do apt. A linha de comando do VectorCraft (`vectorcraft-cli`, ramo de 2026-10-14) compilou da fonte no Linux em 10 min 35 s, depois de instalar o Rust 1.95 que o projeto exige (o contêiner tinha o 1.94); a vetorização roda por `vectorcraft-cli run --in <png> --cmd select.all --cmd imageTrace.makeAndExpand --params <json> --export <svg>` (verificado em execução). Cada vista do avião foi regerada com o módulo do repositório, e dela saíram a máscara da silhueta sem as partes fora do modelo, a máscara de cada parte e a imagem em cinza só na vizinhança de 3 px da silhueta. Cada ferramenta vetorizou as máscaras e o cinza, com o limiar do módulo (225) e com o meio-tom entre o fundo e o traço. A borda vetorizada foi amostrada a cada 0,05 px e comparada com a borda subpixel atual nos dois sentidos, com o pixel (x, y) de centro em (x, y), como no arquivo de contornos; as saídas do Potrace e do VectorCraft têm o canto do pixel no inteiro e foram deslocadas de meio pixel, e o `mkbitmap -s 8` ainda desloca a imagem ampliada de 3,5 px de saída, o que foi medido na imagem sintética e descontado.

Concordar com a borda atual não diz quem está certo, então antes veio uma imagem sintética de 480 x 205 px no estilo das referências (fundo 245, traço escuro de 1,5 px, miolo cinza), desenhada a 16 vezes e reduzida por média, com quatro formas de verdade conhecida: uma asa com ponta de 21 graus, um círculo de raio 40, uma placa inclinada de 7 graus e uma barra de 4 px.

### 3.2 Contra a verdade

| método | distância média (px) | deslocamento médio (px, + é para fora) | desvio nas retas (px) | ponta de 21° perdida (px) | quinas da placa (px) |
|---|---|---|---|---|---|
| borda subpixel atual | 0,090 | +0,025 | 0,085 | 5,03 | 0,44 |
| a mesma, com `denteMaximo` 0 | 0,081 | +0,025 | 0,080 | 1,19 | 0,44 |
| Potrace na máscara do módulo | 0,330 | +0,276 | 0,378 | 5,08 | 0,16 |
| Potrace na máscara, quinas vivas (`-a 0`) | 0,403 | +0,363 | 0,411 | 5,00 | 0,15 |
| Potrace no cinza ampliado 8x, limiar 225 | 0,546 | +0,549 | 0,574 | 0,35 | 0,17 |
| Potrace no cinza ampliado 8x, meio-tom | 0,045 | +0,017 | 0,055 | 1,33 | 0,35 |
| VectorCraft no cinza, limiar 225 | 0,389 | +0,391 | 0,398 | 0,26 | 0,37 |
| VectorCraft no cinza, meio-tom | 0,126 | −0,119 | 0,139 | 1,39 | 0,28 |
| VectorCraft, predefinição Technical Drawing | 0,390 | +0,391 | 0,398 | 0,26 | 0,37 |
| VectorCraft, predefinição Flat Logo | 0,452 | +0,377 | 0,560 | 0,46 | 0,25 |

Verificado em execução. O limiar 225 põe a borda onde o pixel antisserrilhado tem 11% de tinta, 0,4 a 0,55 px para fora da borda verdadeira, em qualquer ferramenta; o deslocamento é do limiar, e não do método. A borda subpixel atual usa o meio-tom e fica a 0,09 px; no avião, de 23,5 mm por pixel na lateral, são 2 mm. O Potrace sobre o cinza ampliado e cortado no meio-tom fica a metade disso, mas a diferença de 1 mm não muda nenhuma tolerância do repositório (3% da maior dimensão ou 5 mm no esboço). O VectorCraft dá a forma mais enxuta, 36 âncoras para as quatro formas no limiar 225 e 575 no meio-tom.

### 3.3 No avião

| vista | método | distância média (px / mm) | p95 (px) | máxima (px / mm) | deslocamento (px) | interseção/união |
|---|---|---|---|---|---|---|
| lateral | Potrace na máscara | 0,62 / 14,5 | 1,30 | 2,85 / 67 | +0,60 | 0,971 |
| lateral | Potrace no cinza 8x, limiar 225 | 0,84 / 19,7 | 1,67 | 4,41 / 104 | +0,84 | 0,960 |
| lateral | VectorCraft na máscara | 0,63 / 14,7 | 1,27 | 3,07 / 72 | +0,60 | 0,970 |
| lateral | VectorCraft no cinza, limiar 225 | 0,76 / 17,7 | 1,44 | 4,06 / 95 | +0,76 | 0,964 |
| topo | Potrace na máscara | 0,61 / 17,6 | 1,07 | 3,62 / 105 | +0,59 | 0,971 |
| topo | VectorCraft na máscara | 0,61 / 17,7 | 1,05 | 2,94 / 86 | +0,59 | 0,971 |
| topo | VectorCraft no cinza, limiar 225 | 0,67 / 19,4 | 1,03 | 4,23 / 123 | +0,66 | 0,967 |
| frontal | Potrace na máscara | 0,69 / 18,3 | 1,20 | 3,39 / 90 | +0,66 | 0,893 |
| frontal | VectorCraft na máscara | 0,69 / 18,4 | 1,17 | 3,31 / 88 | +0,67 | 0,892 |
| frontal | VectorCraft no cinza, limiar 225 | 0,73 / 19,3 | 1,16 | 3,95 / 105 | +0,73 | 0,884 |

Verificado em execução. As duas ferramentas concordam entre si e ficam 0,6 a 0,8 px para fora da borda atual, que é o deslocamento do limiar visto na sintética. No meio-tom as duas falham no avião: o traço escuro do contorno não fecha em toda a volta, e a silhueta sai em 3 a 31 pedaços, com interseção/união de 0,28 a 0,94 contra a atual. Por parte, sobre as máscaras do watershed, a distância média fica em 0,51 a 0,60 px (12 a 16 mm) com deslocamento quase nulo, porque a máscara deixa de fora a divisa de 1 px entre partes vizinhas, que a borda subpixel divide ao meio; a pior parte de cada vista fica entre 2,8 e 3,1 px (68 a 90 mm), no trem de pouso, na hélice ou na fuselagem.

### 3.4 Estabilidade e tempo

As duas ferramentas deram o mesmo arquivo nas duas execuções em todos os casos, e a borda atual também (verificado em execução). O Potrace leva de 3 a 12 ms por máscara e de 50 a 80 ms com o `mkbitmap` ampliando oito vezes; o VectorCraft leva de 13 a 72 ms por processo; o módulo atual leva de 0,5 a 1,0 s por vista, mas isso inclui o watershed e todas as partes, e não só a borda.

### 3.5 Conclusão e achado

Não vale trocar nem complementar. A borda atual já faz o que o Potrace e o VectorCraft só fazem com o limiar certo, e a partição em partes, que é o que mais pesa, continua sendo do watershed com sementes; a escadinha que o plano do avião lembrou era do contorno de máscara antigo, que a borda subpixel já trocou. A troca é decisão da pessoa e não foi feita.

O teste sintético mostrou um defeito do módulo atual: a abertura e o fechamento 3 x 3 que tiram os dentes da máscara (`denteMaximo`, 9 px² por padrão) cortam a ponta aguda, 5,0 px numa ponta de 21 graus contra 1,2 px sem o alisamento. Regerado o avião com `denteMaximo` 0, a silhueta muda em média 0,01 a 0,02 px, mas as pontas das hélices no topo andam 3,5 e 4,7 px (102 e 138 mm), o trem de pouso na frontal até 2,1 px (56 mm) e a antena ventral na lateral 2,1 px (49 mm) (verificado em execução). Na sintética, a ponta da barra de 4 px também fica 2 px curta com ou sem o alisamento. O processo não pegaria isso sozinho: o crítico olha o mapa e as divisas, e nenhum teste do contorno mede contra uma verdade conhecida. O que falta é um teste com imagem sintética de verdade conhecida no gate do módulo, como o desta medida; a decisão de abrir o item é da pessoa, e o plano atual não o autoriza.

## 4. A proposta

### 4.1 O módulo

`modulos/desenho-por-restricoes/`, com `package.json` próprio como os outros módulos, sem importar Three.js, o núcleo de autoria nem outro módulo, e com a dependência `@salusoft89/planegcs` fixada em 1.3.0 no `package.json` da raiz, como o `@techstark/opencv-js` do contorno da imagem. A porta de linha de comando fica em `tools/mecanifica/desenho.mjs`, com `npm run desenho`, e o teste `nucleo-sem-three` não muda. O núcleo puro recebe o JSON da descrição e devolve o relatório e os contornos; quem lê e grava arquivo é a porta. O módulo entra em `docs/mecanifica/UPSTREAM-NOS.md` como capacidade candidata, isolado.

### 4.2 O formato salvo

A descrição fica em `<pasta do objeto>/<vista>.desenho.json`, com `formato: "mecanifica.desenho@1"`, e é o que a IA escreve e o que se versiona. Ela traz a vista e de que lado se olha, a convenção dos eixos (h para a direita e v para cima, em milímetro, como o arquivo de contornos), as referências fixas (o chão, um eixo), os pontos nomeados com o chute inicial, as partes com a forma de cada uma sobre esses pontos e as relações. A identidade de tudo é o nome, nunca a posição na lista, como a regra do repositório pede. O resultado fica em `<vista>.contornos.json`, no formato que o contorno da imagem já grava, com `origem: { desenho, sha256, resolvedor: "planegcs@1.3.0" }` no lugar de `imagem`, sem `mmPorPx`, `residuo` nem campos de pixel, e em `<vista>.png`, a vista em traço com os nomes fora, que é o alvo que o roteiro da prancha procura. Os números saem arredondados a 0,001 mm, com o zero negativo trocado por zero, e as partes e os pontos em ordem de nome, de modo que a mesma descrição dá o mesmo arquivo byte a byte; a libslvs e o CADCraft mostraram o −0 e o ruído na última casa que o arredondamento precisa tirar.

### 4.3 Como a IA escreve

Este é o carrinho de mão da prova comum no formato proposto. O formato é proposta; a mesma descrição, escrita nas primitivas do planegcs, foi a que rodou e deu os números da seção 2.1.

```json
{
  "formato": "mecanifica.desenho@1",
  "objeto": "carrinho de mão",
  "vista": "lateral",
  "olhando": "do lado esquerdo, roda à esquerda",
  "referencias": { "chao": { "reta": "horizontal", "v": 0 }, "eixoDaRoda": { "reta": "vertical", "h": 0 } },
  "pontos": {
    "C": [10, 180], "H": [1400, 700], "F": [1000, 500], "G": [1000, 10],
    "A": [260, 300], "B": [900, 500], "D": [900, 850], "E": [0, 850]
  },
  "partes": {
    "roda": { "circulo": { "centro": "C" } },
    "braco": { "barra": ["C", "H"], "espessura": 40 },
    "pe": { "barra": ["F", "G"], "espessura": 30 },
    "cacamba": { "poligono": ["A", "B", "D", "E"] }
  },
  "relacoes": [
    { "nome": "raio da roda", "raio": "roda", "mm": 200 },
    { "nome": "roda no chão", "tangente": ["roda", "chao"], "lado": "acima" },
    { "nome": "roda no eixo", "sobre": ["C", "eixoDaRoda"] },
    { "nome": "comprimento do braço", "distancia": ["C", "H"], "mm": 1500 },
    { "nome": "altura do pegador", "distancia": ["H", "chao"], "mm": 650, "lado": "acima" },
    { "nome": "pé preso no braço", "sobre": ["F", "braco"] },
    { "nome": "posição do pé", "distancia": ["C", "F"], "mm": 1050 },
    { "nome": "pé no chão", "sobre": ["G", "chao"] },
    { "nome": "pé a prumo", "vertical": ["F", "G"] },
    { "nome": "folga do fundo", "distancia": ["A", "braco"], "mm": 80, "lado": "acima" },
    { "nome": "frente do fundo", "distancia": ["A", "eixoDaRoda"], "mm": 250, "lado": "direita" },
    { "nome": "fundo junto do braço", "paralela": [["A", "B"], "braco"] },
    { "nome": "comprimento do fundo", "distancia": ["A", "B"], "mm": 650 },
    { "nome": "traseira a prumo", "vertical": ["B", "D"] },
    { "nome": "altura da borda", "distancia": ["D", "chao"], "mm": 900, "lado": "acima" },
    { "nome": "borda de nível", "horizontal": ["D", "E"] },
    { "nome": "inclinação da frente", "angulo": [["A", "B"], ["A", "E"]], "graus": 120 }
  ]
}
```

São 17 relações em palavras de desenhista, cada uma com um nome que volta no relatório. O `lado` é o que impede o ramo espelhado: o módulo traduz a relação sem sinal para o planegcs e, resolvida a geometria, confere de que lado o ponto ficou. A tradução é direta: `sobre` vira `point_on_line_pl`, `distancia` entre pontos vira `p2p_distance`, entre ponto e reta `p2l_distance`, `tangente` vira `tangent_lc`, `paralela` vira `parallel`, `angulo` vira `l2l_angle_ll` em radianos e `vertical` e `horizontal` viram as do planegcs; a barra vira um polígono com a espessura em volta do eixo depois de resolver, e a espessura não entra no resolvedor.

### 4.4 O que volta à IA

O planegcs devolveu nos três cenários de erro, nas palavras do script (verificado em execução):

```json
{"cenario":"conflito","status":"Failed","grausDeLiberdade":-1,"conflitantes":["pegador a 650 do chão","pegador a 700 do chão"],"redundantes":[]}
{"cenario":"faltando","status":"Success","grausDeLiberdade":1,"conflitantes":[],"redundantes":[]}
{"cenario":"redundante","status":"Converged","grausDeLiberdade":0,"conflitantes":[],"redundantes":["fundo a 80 do braço (B)"]}
```

O relatório do módulo diz isso em português e acrescenta o que o planegcs não diz. O estado é um de quatro: resolvido, conflito, solto ou lado trocado. No conflito vêm os nomes das relações que não cabem juntas. No solto vêm os graus de liberdade e as partes e os pontos que ainda se movem, achados prendendo uma parte de cada vez e resolvendo de novo; no cenário faltando seriam a traseira, a borda e a frente da caçamba, como o CADCraft mostrou. No lado trocado vêm a relação, o lado pedido e o lado em que o ponto ficou, e o módulo tenta uma vez de novo refletindo o chute do ponto pela reta antes de devolver. Redundância é aviso, e não erro. Por fim vêm as medidas derivadas que a IA não escreveu e precisa conferir, como a altura do pé (515 mm), a posição da frente da caçamba (336 mm à frente do eixo) e a largura e a altura totais da vista. O desenho só é gravado no estado resolvido, como o CADCraft faz.

### 4.5 Da geometria aos contornos

Cada parte vira um anel fechado em milímetro: o polígono pelos pontos resolvidos, o círculo e o arco discretizados com um número fixo de segmentos por quarto de volta, e a barra pelo retângulo em volta do eixo. A silhueta é a união das partes que não estão em `foraDoModelo`, feita numa grade fina e contornada, ou pela `CrossSection` do `manifold-3d`, que já é dependência da raiz; os pedaços vão em `pedacos`, do maior para o menor, como no arquivo de contornos. A parte escondida atrás de outra fica só com o pedaço visível, pela ordem de profundidade declarada, porque é assim que o contorno da imagem define a região e é assim que o esboço e a prancha a medem.

### 4.6 O objeto de prova

A recomendação é a lateral sem cabo do braço robótico, `procedural/pecas/braco-robotico/referencias/lateral-sem-cabo.png`, de 1010 x 559 px e 2,05 mm por pixel, com contorno de 14 partes já aprovado e prancha feita. As partes são retângulos de canto redondo, anéis e cilindros, que reta, arco, tangência e concentricidade descrevem, e o objeto é simples o bastante para o primeiro protótipo. A lateral do avião, de 20 partes com fuselagem curva, pede spline com restrição e fica para uma segunda prova. A carcaça da empilhadeira tem imagem mas não tem contorno, e o carrinho de mão não tem imagem de referência. O exemplo deste levantamento usa o carrinho e não o braço justamente para não pôr número da referência escondida num documento que a IA do desenho pode ler.

A imagem fica escondida da IA que desenha: o agente recebe só a descrição e o que este levantamento propõe, e a pasta `procedural/pecas/braco-robotico/`, a receita do braço e os planos e o banco de provas que trazem medidas dele ficam fora do que ele pode ler, o que se declara no despacho e se confere pelo registro de leituras. A descrição é escrita pela pessoa, em palavras, com as partes, as relações e só duas medidas tiradas da referência, a altura e o alcance totais, para que a escala não seja o que se mede. Fechado o desenho, a razão interseção/união da silhueta é medida contra a do contorno escondido de dois jeitos: com as duas alinhadas pelo canto de baixo da base, declarado na descrição, e com a melhor translação, que separa erro de posição de erro de forma. A razão por parte sai depois de ligar cada nome do desenho a uma região da referência, feito por quem avalia. O crítico recebe a vista em traço como modelo e a imagem como alvo, pelo modo que já existe. Para medir a hipótese, a mesma descrição é desenhada também por outra IA escrevendo coordenadas direto, sem resolvedor, e as duas são comparadas na razão interseção/união, nas rodadas e nos tokens.

### 4.7 Tamanho da fatia 2

A estimativa é de 1.500 a 1.900 linhas: cerca de 250 para validar o formato com mensagens que digam o que corrigir, 250 para traduzir as relações para o planegcs, 200 para resolver, ler o diagnóstico, conferir o lado e achar as partes soltas, 150 para os contornos e a silhueta, 150 para a vista em traço, 80 para a razão interseção/união entre dois contornos, 150 para a porta de linha de comando e de 400 a 600 de testes. Os testes fixam o carrinho com os valores em que os quatro resolvedores concordaram, os quatro cenários, o chute espelhado, a mesma saída byte a byte e a leitura do arquivo pelo `lerContornos` do esboço e pela prancha. Com a descrição da pessoa, a rodada da IA, a comparação com coordenadas, o crítico e a medida, são de uma a duas sessões, e o custo em tokens fica registrado no banco de provas, como o plano pede.

### 4.8 Riscos

O resolvedor declara sucesso no ramo errado quando o chute está do lado errado e a relação não tem sinal; foi o que aconteceu aqui, e o `lado` com a conferência depois de resolver é obrigatório desde o primeiro teste. Curva livre, como a fuselagem, pede spline com restrição, que o planegcs tem mas que é mais difícil de a IA escrever; a prova escolhida a evita, e a segunda prova a enfrenta. O crítico foi calibrado para o esboço 3D e julga melhor com alvo; na prova ele tem alvo, mas o uso sem imagem, que é o objetivo do plano, pede o modo novo que o plano já registra. A licença do planegcs é LGPL: usada como dependência sem modificação, fica como está; se um dia for preciso alterá-la, a alteração tem de ser publicada. O pacote tem um mantenedor só; a versão fica fixada, e o porte do CADCraft é a saída se ele parar. O acerto medido será o do conhecimento da IA sobre a proporção do objeto, e não só o da ferramenta; é por isso que a comparação com coordenadas sobre a mesma descrição faz parte da medida. Por fim, a imagem escondida só fica escondida se o despacho proibir as pastas que trazem medidas do braço, e o registro de leituras é o que prova.

### 4.9 Contratos

O caminho não exige mudar o contrato de família, de esboço ou de prancha, e o plano não para por isso. As famílias ficam de fora. O esboço lê o arquivo do desenho como lê o da imagem. A prancha lê o arquivo e desenha; as duas linhas que escrevem procedência de referência raster e watershed são texto e não contrato, e a pessoa decide se elas passam a ler o campo `origem`, que é a sexta escolha do sumário. O formato `mecanifica.contornos@1` ganha um campo opcional, `origem`, e perde, nos arquivos do desenho, os campos de pixel que nenhum consumidor lê; se a pessoa preferir um formato com outro nome, o esboço e a prancha precisariam aceitá-lo, e aí sim haveria mudança de contrato.

## Anexo: comandos das provas

Os scripts ficaram na pasta de trabalho temporária e foram apagados com ela; os comandos e as entradas essenciais estão aqui. O caminho `$S` é essa pasta.

Instalação: `apt-get install -y --no-install-recommends potrace solvespace openscad librecad inkscape`; `python3 -m venv $S/venv && $S/venv/bin/pip install python-solvespace==3.0.8 shapely==2.1.2 svgelements==1.9.6 pillow numpy ezdxf==1.4.2`; `npm install @salusoft89/planegcs@1.3.0`; `curl -L -o FreeCAD.AppImage https://github.com/FreeCAD/FreeCAD/releases/download/1.0.2/FreeCAD_1.0.2-conda-Linux-x86_64-py311.AppImage && ./FreeCAD.AppImage --appimage-extract`; `git clone --depth 1 https://github.com/storytold/vectorcraft` e `https://github.com/storytold/cadcraft`, `rustup toolchain install 1.95 --profile minimal`, `cargo +1.95 build --release -p vectorcraft-cli` e `-p cadcraft-cli`.

Carrinho de mão: `node carrinho_planegcs.mjs <pasta do planegcs> <completo|conflito|faltando|redundante> <saida.json>`; `python -I carrinho_slvs.py <cenario> <saida.json>`; `PYTHONIOENCODING=utf-8 CENARIO=<cenario> SAIDA=<saida.json> squashfs-root/usr/bin/freecadcmd carrinho_freecad.py`; `cadcraft-cli run --cmd 'line {"points":[[-500,0],[2000,0]]}' ... --cmd 'constraints.dof {}' --save <saida.dxf>`, com os objetos em 100 a 109 e as restrições pelo identificador de cada um; `openscad -o <saida.svg> carrinho.scad`. A mesma saída foi conferida com `sha256sum` de duas execuções.

Vetorização: a máscara e o cinza de cada vista saíram do módulo do repositório importado por um script fora dele, que chama `contornosDaImagem` de `tools/mecanifica/contorno-da-imagem.mjs` e grava as máscaras em PBM e PNG. Potrace: `potrace -b geojson -u 100 [-a 0] -o <saida> silhueta.pbm` e `mkbitmap -n -s 8 -3 -t <limiar/255> -o c8.pbm cinza.pgm && potrace -b geojson -u 100 -o <saida> c8.pbm`. VectorCraft: `vectorcraft-cli run --in <png> --cmd select.all --cmd imageTrace.makeAndExpand --params '{"params":{"mode":"blackAndWhite","threshold":<limiar>,"ignoreWhite":true,"paths":100,"corners":75,"noise":4}}' --export <saida.svg>`, e as predefinições por `{"preset":"Technical Drawing"}` e `{"preset":"Flat Logo","params":{"ignoreWhite":true}}`. A imagem sintética foi desenhada com o Pillow a 16 vezes e reduzida com `Image.BOX`, e o `denteMaximo` 0 foi passado no arquivo de regiões de uma cópia, sem tocar o do repositório.

A entrada do planegcs que rodou, cenário completo (o chão de O a X, o eixo de O a Y, os três pontos fixos):

```js
const P = (id, x, y, fixed = false) => ({ id, type: 'point', x, y, fixed });
const L = (id, p1_id, p2_id) => ({ id, type: 'line', p1_id, p2_id });
const primitivas = [
  P('O', 0, 0, true), P('X', 1000, 0, true), P('Y', 0, 1000, true), L('chao', 'O', 'X'), L('eixo', 'O', 'Y'),
  P('C', 10, 180), P('H', 1400, 700), P('F', 1000, 500), P('G', 1000, 10),
  P('A', 260, 300), P('B', 900, 500), P('D', 900, 850), P('E', 0, 850),
  { id: 'roda', type: 'circle', c_id: 'C', radius: 190 },
  L('braco', 'C', 'H'), L('pe', 'F', 'G'), L('fundo', 'A', 'B'), L('tras', 'B', 'D'), L('borda', 'D', 'E'), L('frente', 'A', 'E'),
  { id: 'roda.raio=200', type: 'circle_radius', c_id: 'roda', radius: 200 },
  { id: 'roda tangente ao chão', type: 'tangent_lc', l_id: 'chao', c_id: 'roda' },
  { id: 'roda no eixo x=0', type: 'point_on_line_pl', p_id: 'C', l_id: 'eixo' },
  { id: 'braço.comprimento=1500', type: 'p2p_distance', p1_id: 'C', p2_id: 'H', distance: 1500 },
  { id: 'pegador a 650 do chão', type: 'p2l_distance', p_id: 'H', l_id: 'chao', distance: 650 },
  { id: 'pé sobre o braço', type: 'point_on_line_pl', p_id: 'F', l_id: 'braco' },
  { id: 'pé a 1050 da roda', type: 'p2p_distance', p1_id: 'C', p2_id: 'F', distance: 1050 },
  { id: 'pé no chão', type: 'point_on_line_pl', p_id: 'G', l_id: 'chao' },
  { id: 'pé vertical', type: 'vertical_l', l_id: 'pe' },
  { id: 'fundo a 80 do braço (A)', type: 'p2l_distance', p_id: 'A', l_id: 'braco', distance: 80 },
  { id: 'frente do fundo a 250 do eixo', type: 'p2l_distance', p_id: 'A', l_id: 'eixo', distance: 250 },
  { id: 'fundo paralelo ao braço', type: 'parallel', l1_id: 'fundo', l2_id: 'braco' },
  { id: 'fundo.comprimento=650', type: 'p2p_distance', p1_id: 'A', p2_id: 'B', distance: 650 },
  { id: 'traseira vertical', type: 'vertical_l', l_id: 'tras' },
  { id: 'borda a 900 do chão', type: 'p2l_distance', p_id: 'D', l_id: 'chao', distance: 900 },
  { id: 'borda horizontal', type: 'horizontal_l', l_id: 'borda' },
  { id: 'frente a 120 graus do fundo', type: 'l2l_angle_ll', l1_id: 'fundo', l2_id: 'frente', angle: (120 * Math.PI) / 180 },
];
// const gcs = new GcsWrapper(new (await init_planegcs_module()).GcsSystem());
// gcs.push_primitives_and_params(primitivas); gcs.solve(); gcs.apply_solution();
// gcs.gcs.dof(), gcs.get_gcs_conflicting_constraints(), gcs.get_gcs_redundant_constraints()
```

O chute espelhado que caiu no ramo errado trocou só `A` por `[300, 150]`, `B` por `[900, 380]` e `E` por `[100, 850]`.

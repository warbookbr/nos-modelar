# Técnicas de forma: o que gera os elementos dos objetos

Esta é a organização da análise de padrões por técnica. Cada elemento de [`ELEMENTOS-DE-OBJETOS.md`](ELEMENTOS-DE-OBJETOS.md) foi gerado ou acabado por técnicas descritas em texto livre (223 descrições diferentes); aqui elas estão agrupadas em técnicas base por regras fixas de nome, e cada técnica diz que elementos dependem dela, quanto isso pesa nos 364 objetos de [`FAMILIAS-DE-OBJETOS.md`](FAMILIAS-DE-OBJETOS.md), o que o esboço e o núcleo já fazem e que fontes externas confirmadas a implementam. Os dados estão em [`tecnicas-de-forma.json`](tecnicas-de-forma.json), derivado de [`elementos-de-objetos.json`](elementos-de-objetos.json).

Uma técnica gera a forma de um elemento (revolução faz o eixo) ou se aplica sobre uma forma já feita (arredondamento, espelho). O peso é a soma, sobre os elementos que dependem da técnica, do número de objetos em que cada elemento aparece; mede quanto da lista de objetos a técnica sustenta. O estado é `tem` quando esboço e núcleo fazem a técnica, `parcial` quando um dos dois faz ou faz só um caso, e `não` quando nenhum faz.

## Visão geral

| Técnica | Peso gera (elementos) | Peso aplica (elementos) | Esboço | Núcleo | Estado | Fontes |
|---|---|---|---|---|---|---|
| arredondamento | 0 (0) | 3712 (53) | `raio` na caixa | `arredondarAresta`, `arredondarCostura` | `parcial` | 1 |
| espelho | 201 (1) | 3504 (51) | `espelha`, `simetrico` | `espelha` | `tem` | 0 |
| chanfro | 0 (0) | 3524 (50) | `chanfro` na caixa | `chamferBox`, `filete` (chanfro plano) | `parcial` | 4 |
| extrusão de perfil | 2553 (33) | 0 (0) | `extrusao` | `extruda` só empurra uma face existente | `parcial` | 3 |
| corte booleano | 2407 (33) | 0 (0) | só `furo`/`furos` na caixa | `subtrair`, `intersectar` | `parcial` | 0 |
| repetição linear | 270 (4) | 2100 (30) | `arranja` linear | `arranja` linear | `tem` | 0 |
| repetição radial | 637 (11) | 1656 (18) | `arranja` radial | `arranja` radial | `tem` | 0 |
| revolução | 2027 (31) | 0 (0) | `revolucao` | `lathe` | `tem` | 2 |
| furação em padrão | 1116 (15) | 566 (4) | `furos` na caixa | `furo` com `centros` | `tem` | 1 |
| casca com espessura | 1315 (17) | 217 (2) | só `anel` (cilindro oco) | não | `não` | 4 |
| união booleana | 1514 (25) | 0 (0) | não (formas se sobrepõem sem fundir) | `unir` | `parcial` | 0 |
| varredura ao longo de caminho | 1453 (19) | 0 (0) | `tubo` (só seção circular) e `envolve` | `loft` ao longo de caminho 3D | `parcial` | 7 |
| loft entre seções | 1029 (17) | 0 (0) | `loft` | `loft` | `tem` | 4 |
| hélice | 950 (12) | 0 (0) | não | não | `não` | 6 |
| nervura | 0 (0) | 658 (4) | não | não | `não` | 0 |
| dobra ao longo de caminho | 0 (0) | 622 (7) | não | não | `não` | 0 |
| recartilhado e textura | 347 (4) | 0 (0) | não | `displace` (ruído) | `parcial` | 5 |
| flange de borda | 0 (0) | 343 (2) | não | não | `não` | 2 |
| torção | 0 (0) | 341 (6) | não | não | `não` | 0 |
| chapa dobrada | 139 (3) | 0 (0) | não | não | `não` | 2 |
| superfície livre | 83 (1) | 0 (0) | `loft` | `inflate` (por silhuetas) | `parcial` | 0 |
| repetição ao longo de caminho | 29 (3) | 0 (0) | `arranja` ao longo de `tubo` ou `envolve` | não | `parcial` | 0 |

## O que falta, por peso

As técnicas que o projeto não faz ou faz só em parte, na ordem do peso total. É a lista de onde sair o que implementar.

- arredondamento (`parcial`, peso 3712): esboço `raio` na caixa; núcleo `arredondarAresta`, `arredondarCostura`.
- chanfro (`parcial`, peso 3524): esboço `chanfro` na caixa; núcleo `chamferBox`, `filete` (chanfro plano).
- extrusão de perfil (`parcial`, peso 2553): esboço `extrusao`; núcleo `extruda` só empurra uma face existente.
- corte booleano (`parcial`, peso 2407): esboço só `furo`/`furos` na caixa; núcleo `subtrair`, `intersectar`.
- casca com espessura (`não`, peso 1532): esboço só `anel` (cilindro oco); núcleo não.
- união booleana (`parcial`, peso 1514): esboço não (formas se sobrepõem sem fundir); núcleo `unir`.
- varredura ao longo de caminho (`parcial`, peso 1453): esboço `tubo` (só seção circular) e `envolve`; núcleo `loft` ao longo de caminho 3D.
- hélice (`não`, peso 950): esboço não; núcleo não.
- nervura (`não`, peso 658): esboço não; núcleo não.
- dobra ao longo de caminho (`não`, peso 622): esboço não; núcleo não.
- recartilhado e textura (`parcial`, peso 347): esboço não; núcleo `displace` (ruído).
- flange de borda (`não`, peso 343): esboço não; núcleo não.
- torção (`não`, peso 341): esboço não; núcleo não.
- chapa dobrada (`não`, peso 139): esboço não; núcleo não.
- superfície livre (`parcial`, peso 83): esboço `loft`; núcleo `inflate` (por silhuetas).
- repetição ao longo de caminho (`parcial`, peso 29): esboço `arranja` ao longo de `tubo` ou `envolve`; núcleo não.

## Por técnica

### arredondamento

Aplica sobre: chassi ou quadro (201), casca (187), articulação (183), eixo (172), botão ou manopla (170), perfil estrutural (169), tubo (156), conexão (152), grade ou furação em padrão (151), superfície de pega (150), tampa (148), mangueira ou cabo (145), vedação (138), chapa dobrada (122), vidro ou painel (111), fixador (109), mola (104), rolamento ou mancal (103), engrenagem (88), trilho ou guia (83), tecido ou estofado (83), trava ou fecho (78), roda (72), placa de circuito ou componente elétrico (66), freio (50), polia e correia (47), válvula ou obturador (44), pneu (39), hélice ou rotor (36), cilindro ou atuador linear (35), lâmina ou elemento de corte (30), núcleo magnético e bobina (29), aleta ou dissipador de calor (24), corrente (22), fuso ou rosca de avanço (21), mordaça ou mordente (21), bocal ou tubeira (20), contrapeso (20), elemento de aquecimento ou combustão (18), ponteiro ou mostrador (17), gancho ou olhal de carga (17), rótula ou junta esférica (16), elemento filtrante (13), pistão ou êmbolo (13), asa ou aerofólio (9), came ou excêntrico (7), degrau ou palete articulado (6), rosca helicoidal de transporte (4), esteira de tração ou lagarta (4), esteira porta-cabos (4), zíper (3), remo (1), vela náutica (1).

No projeto: esboço `raio` na caixa; núcleo `arredondarAresta`, `arredondarCostura`.

Fontes confirmadas que citam a técnica:

| Domínio | Solução | Licença | Via elemento | Link |
|---|---|---|---|---|
| cad_por_codigo | Build123d: Sweep(sections, path) ao longo de Wire 3D | Apache-2.0 | chassi ou quadro | https://build123d.readthedocs.io/en/latest/objects.html |

### espelho

Gera: chassi ou quadro (201).

Aplica sobre: casca (187), articulação (183), eixo (172), botão ou manopla (170), perfil estrutural (169), tubo (156), conexão (152), grade ou furação em padrão (151), superfície de pega (150), tampa (148), mangueira ou cabo (145), vedação (138), chapa dobrada (122), vidro ou painel (111), fixador (109), mola (104), rolamento ou mancal (103), engrenagem (88), trilho ou guia (83), tecido ou estofado (83), trava ou fecho (78), roda (72), placa de circuito ou componente elétrico (66), freio (50), polia e correia (47), válvula ou obturador (44), pneu (39), hélice ou rotor (36), cilindro ou atuador linear (35), lâmina ou elemento de corte (30), núcleo magnético e bobina (29), aleta ou dissipador de calor (24), corrente (22), fuso ou rosca de avanço (21), mordaça ou mordente (21), bocal ou tubeira (20), contrapeso (20), elemento de aquecimento ou combustão (18), ponteiro ou mostrador (17), gancho ou olhal de carga (17), rótula ou junta esférica (16), elemento filtrante (13), pistão ou êmbolo (13), asa ou aerofólio (9), degrau ou palete articulado (6), rosca helicoidal de transporte (4), esteira de tração ou lagarta (4), esteira porta-cabos (4), zíper (3), remo (1), vela náutica (1).

No projeto: esboço `espelha`, `simetrico`; núcleo `espelha`.

Nenhuma fonte confirmada cita a técnica pelo nome; as fontes de cada elemento estão em `ELEMENTOS-DE-OBJETOS.md`.

Descrições originais agrupadas aqui (1): espelhamento simétrico de semi-chassi.

### chanfro

Aplica sobre: chassi ou quadro (201), casca (187), articulação (183), eixo (172), botão ou manopla (170), perfil estrutural (169), tubo (156), conexão (152), grade ou furação em padrão (151), superfície de pega (150), tampa (148), mangueira ou cabo (145), vedação (138), chapa dobrada (122), vidro ou painel (111), fixador (109), rolamento ou mancal (103), engrenagem (88), trilho ou guia (83), trava ou fecho (78), roda (72), placa de circuito ou componente elétrico (66), freio (50), polia e correia (47), válvula ou obturador (44), pneu (39), hélice ou rotor (36), cilindro ou atuador linear (35), lâmina ou elemento de corte (30), núcleo magnético e bobina (29), aleta ou dissipador de calor (24), corrente (22), fuso ou rosca de avanço (21), mordaça ou mordente (21), bocal ou tubeira (20), contrapeso (20), elemento de aquecimento ou combustão (18), ponteiro ou mostrador (17), gancho ou olhal de carga (17), rótula ou junta esférica (16), elemento filtrante (13), pistão ou êmbolo (13), asa ou aerofólio (9), came ou excêntrico (7), degrau ou palete articulado (6), rosca helicoidal de transporte (4), esteira de tração ou lagarta (4), esteira porta-cabos (4), zíper (3), remo (1).

No projeto: esboço `chanfro` na caixa; núcleo `chamferBox`, `filete` (chanfro plano).

Fontes confirmadas que citam a técnica:

| Domínio | Solução | Licença | Via elemento | Link |
|---|---|---|---|---|
| cad_por_codigo | Build123d: Sweep(sections, path) ao longo de Wire 3D | Apache-2.0 | chassi ou quadro | https://build123d.readthedocs.io/en/latest/objects.html |
| cad_por_codigo | Build123d: Revolve de polilinha com Cylinder escalonados | Apache-2.0 | eixo | https://build123d.readthedocs.io/en/latest/objects.html |
| blender_nativo | Curva 3D Bézier com propriedades nativas de Chanfro (Bevel Depth e Res | GPL-2.0-or-later | tubo | https://docs.blender.org/manual/en/latest/modeling/curves/properties/geometry.html#bevel |
| cad_por_codigo | Build123d: Box, thicken de casca curvada | Apache-2.0 | vidro ou painel | https://build123d.readthedocs.io/en/latest/objects.html |

### extrusão de perfil

Gera: chassi ou quadro (201), articulação (183), eixo (172), botão ou manopla (170), perfil estrutural (169), tubo (156), conexão (152), tampa (148), vedação (138), chapa dobrada (122), vidro ou painel (111), fixador (109), mola (104), engrenagem (88), trilho ou guia (83), trava ou fecho (78), placa de circuito ou componente elétrico (66), freio (50), cilindro ou atuador linear (35), lâmina ou elemento de corte (30), núcleo magnético e bobina (29), aleta ou dissipador de calor (24), corrente (22), mordaça ou mordente (21), contrapeso (20), elemento de aquecimento ou combustão (18), ponteiro ou mostrador (17), elemento filtrante (13), came ou excêntrico (7), degrau ou palete articulado (6), esteira de tração ou lagarta (4), esteira porta-cabos (4), zíper (3).

No projeto: esboço `extrusao`; núcleo `extruda` só empurra uma face existente.

Fontes confirmadas que citam a técnica:

| Domínio | Solução | Licença | Via elemento | Link |
|---|---|---|---|---|
| cad_por_codigo | CadQuery: plugin cadquery-sheetmetal | Apache-2.0 | chapa dobrada | https://build123d.readthedocs.io/en/latest/sheet_metal/index.html |
| cad_por_codigo | MCAD: alum_profiles.scad | LGPL-2.1 | perfil estrutural | https://github.com/openscad/MCAD |
| cad_por_codigo | BOSL2: pulleys.scad (pulley para perfis GT2, T5 e correias em V com fl | BSD-2-Clause | polia e correia | https://github.com/BelfrySCAD/BOSL2/wiki/pulleys.scad |

Descrições originais agrupadas aqui (33): extrusão linear cilíndrica; extrusão linear com conicidade / ângulo de saída; extrusão linear com flange perimetral; extrusão linear com furo concêntrico; extrusão linear com perfil; extrusão linear com perfil estrutural; extrusão linear com ângulo de saída / conicidade de corte; extrusão linear de agulha/ponteiro com contrapeso; extrusão linear de bloco suporte prismático; extrusão linear de cabeça; extrusão linear de cabeçotes e olhais; extrusão linear de corpo de pinça e pastilhas; extrusão linear de dente individual com saliência de engate; extrusão linear de elo estrutural oco com travas; extrusão linear de lâminas arqueadas (feixe de molas); extrusão linear de lâminas ferromagnéticas; extrusão linear de malha/tecido filtrante; extrusão linear de olhais e garfos; extrusão linear de perfil 2D padronizado; extrusão linear de perfil aletado; extrusão linear de perfil de chapa fina; extrusão linear de perfil de contorno plano; extrusão linear de perfil de dente evolvente; extrusão linear de perfil de sapata com nervuras de garra; extrusão linear de perfil elastomérico; extrusão linear de perfil estrutural com ranhuras; extrusão linear de perfil excêntrico (spline fechada); extrusão linear de perfil guia retificado; extrusão linear de perfil maciço balanceado; extrusão linear de placa prismática fina; extrusão linear de placas de elo em formato de 8; extrusão linear de prisma sextavado de aperto; extrusão linear de suportes e aletas térmicas.

### corte booleano

Gera: casca (187), articulação (183), eixo (172), botão ou manopla (170), perfil estrutural (169), conexão (152), grade ou furação em padrão (151), tampa (148), vedação (138), mola (104), rolamento ou mancal (103), engrenagem (88), trilho ou guia (83), trava ou fecho (78), placa de circuito ou componente elétrico (66), freio (50), polia e correia (47), válvula ou obturador (44), pneu (39), hélice ou rotor (36), cilindro ou atuador linear (35), lâmina ou elemento de corte (30), aleta ou dissipador de calor (24), bocal ou tubeira (20), ponteiro ou mostrador (17), gancho ou olhal de carga (17), rótula ou junta esférica (16), pistão ou êmbolo (13), asa ou aerofólio (9), came ou excêntrico (7), degrau ou palete articulado (6), rosca helicoidal de transporte (4), vela náutica (1).

No projeto: esboço só `furo`/`furos` na caixa; núcleo `subtrair`, `intersectar`.

Nenhuma fonte confirmada cita a técnica pelo nome; as fontes de cada elemento estão em `ELEMENTOS-DE-OBJETOS.md`.

Descrições originais agrupadas aqui (35): corte booleano com plano inclinado de bisel de afiação; corte booleano de abertura angular de articulação; corte booleano de aberturas e janelas; corte booleano de alojamento de pistão e encaixes; corte booleano de alívio e centro de giro; corte booleano de alívio interno da saia; corte booleano de bocas de entrada e saída; corte booleano de canais de fluxo de ar; corte booleano de canal para anel elástico; corte booleano de canaleta de vedação; corte booleano de canaletas de rolagem; corte booleano de canaletas periféricas de anéis; corte booleano de chanfro/esquadro de junta; corte booleano de câmaras internas de fluxo; corte booleano de câmaras internas e pórticos; corte booleano de dutos internos; corte booleano de encaixe de haste; corte booleano de encaixe do eixo; corte booleano de encaixe e ranhura; corte booleano de encaixes de articulação e sedes de eixos; corte booleano de extremidades retificadas; corte booleano de fendas e superfícies de controle; corte booleano de folga e rebaixo; corte booleano de furações e ilhas de montagem; corte booleano de furo central de eixo e chaveta; corte booleano de furo transversal para pino; corte booleano de garganta e saída de fluxo; corte booleano de ilhoses e punhos de canto; corte booleano de junta plana; corte booleano de pistas de rolamento / ranhuras; corte booleano de rasgo de chaveta; corte booleano de rasgo de chaveta e alívios de peso; corte booleano de sulcos longitudinais e transversais; corte booleano de trava de segurança; corte booleano por projeção de esboço (punch).

### repetição linear

Gera: grade ou furação em padrão (151), placa de circuito ou componente elétrico (66), núcleo magnético e bobina (29), aleta ou dissipador de calor (24).

Aplica sobre: articulação (183), botão ou manopla (170), perfil estrutural (169), tubo (156), conexão (152), superfície de pega (150), mangueira ou cabo (145), vedação (138), chapa dobrada (122), fixador (109), mola (104), rolamento ou mancal (103), trilho ou guia (83), trava ou fecho (78), cilindro ou atuador linear (35), lâmina ou elemento de corte (30), corrente (22), fuso ou rosca de avanço (21), mordaça ou mordente (21), contrapeso (20), elemento de aquecimento ou combustão (18), ponteiro ou mostrador (17), elemento filtrante (13), pistão ou êmbolo (13), came ou excêntrico (7), degrau ou palete articulado (6), rosca helicoidal de transporte (4), esteira de tração ou lagarta (4), esteira porta-cabos (4), zíper (3).

No projeto: esboço `arranja` linear; núcleo `arranja` linear.

Nenhuma fonte confirmada cita a técnica pelo nome; as fontes de cada elemento estão em `ELEMENTOS-DE-OBJETOS.md`.

Descrições originais agrupadas aqui (4): repetição linear de corte booleano; repetição linear de fileiras de pinos/pads; repetição linear de lâminas empilhadas; repetição linear de lâminas finas de troca térmica.

### repetição radial

Gera: conexão (152), rolamento ou mancal (103), engrenagem (88), roda (72), polia e correia (47), pneu (39), hélice ou rotor (36), lâmina ou elemento de corte (30), núcleo magnético e bobina (29), aleta ou dissipador de calor (24), ponteiro ou mostrador (17).

Aplica sobre: articulação (183), eixo (172), botão ou manopla (170), grade ou furação em padrão (151), superfície de pega (150), tampa (148), vedação (138), fixador (109), mola (104), trava ou fecho (78), placa de circuito ou componente elétrico (66), freio (50), válvula ou obturador (44), cilindro ou atuador linear (35), bocal ou tubeira (20), elemento de aquecimento ou combustão (18), elemento filtrante (13), came ou excêntrico (7).

No projeto: esboço `arranja` radial; núcleo `arranja` radial.

Nenhuma fonte confirmada cita a técnica pelo nome; as fontes de cada elemento estão em `ELEMENTOS-DE-OBJETOS.md`.

Descrições originais agrupadas aqui (11): repetição radial de aletas concêntricas; repetição radial de blocos e sulcos da banda de rodagem; repetição radial de corpos rolantes; repetição radial de dentes de serra; repetição radial de dentes em torno do eixo; repetição radial de dentes síncronos na polia; repetição radial de garras ou dentes de engate; repetição radial de graduações e marcas de escala; repetição radial de pás em torno do cubo; repetição radial de raios estruturais ou aberturas de alívio; repetição radial de ranhuras/polos magnéticos.

### revolução

Gera: articulação (183), eixo (172), botão ou manopla (170), conexão (152), tampa (148), mangueira ou cabo (145), vedação (138), fixador (109), rolamento ou mancal (103), engrenagem (88), trava ou fecho (78), roda (72), freio (50), polia e correia (47), válvula ou obturador (44), pneu (39), hélice ou rotor (36), cilindro ou atuador linear (35), lâmina ou elemento de corte (30), corrente (22), fuso ou rosca de avanço (21), bocal ou tubeira (20), contrapeso (20), elemento de aquecimento ou combustão (18), ponteiro ou mostrador (17), gancho ou olhal de carga (17), rótula ou junta esférica (16), elemento filtrante (13), pistão ou êmbolo (13), came ou excêntrico (7), rosca helicoidal de transporte (4).

No projeto: esboço `revolucao`; núcleo `lathe`.

Fontes confirmadas que citam a técnica:

| Domínio | Solução | Licença | Via elemento | Link |
|---|---|---|---|---|
| cad_por_codigo | BOSL2: knurling.scad (knurled_cylinder, knurl), rot_copies() para lóbu | BSD-2-Clause | botão ou manopla | https://github.com/BelfrySCAD/BOSL2/wiki/knurling.scad |
| cad_por_codigo | BOSL2: rot_copies() de furos e canais de refrigeração em disco cilíndr | BSD-2-Clause | freio | https://github.com/BelfrySCAD/BOSL2/wiki/distributors.scad |

Descrições originais agrupadas aqui (31): revolução com perfil; revolução com perfil de aro perimetral e cubo central; revolução com perfil de bico injetor e queimador; revolução com perfil de camisa e haste; revolução com perfil de canais trapezoidais em V ou canal de polia; revolução com perfil de corpo e obturador; revolução com perfil de cubo e ogiva; revolução com perfil de disco com borda afiada; revolução com perfil de disco ou tambor; revolução com perfil de fechamento; revolução com perfil de mostrador circular e aro; revolução com perfil de olhal ou haste; revolução com perfil de passagem escalonada; revolução com perfil de pino e bucha; revolução com perfil de pinos, buchas e roletes; revolução com perfil de pistas externa e interna; revolução com perfil de setor excêntrico; revolução com perfil de seção transversal oca do pneu; revolução com perfil de tampas e anéis de vedação; revolução com perfil de terminais e prensagens; revolução com perfil do disco/corpo base; revolução com perfil ergonômico; revolução com perfil escalonado; revolução com perfil escalonado de cabeça e saia; revolução com perfil esférico de pino e haste; revolução com perfil interno e externo convergente-divergente; revolução de alojamento/copo fêmea; revolução de eixo cilíndrico central e calha; revolução de eixo escalonado cilíndrico; revolução de seção fechada (toroide / anel O-ring); revolução excêntrica com perfil.

### furação em padrão

Gera: chassi ou quadro (201), articulação (183), eixo (172), grade ou furação em padrão (151), vidro ou painel (111), trilho ou guia (83), roda (72), freio (50), mordaça ou mordente (21), contrapeso (20), elemento de aquecimento ou combustão (18), pistão ou êmbolo (13), elemento filtrante (13), esteira de tração ou lagarta (4), esteira porta-cabos (4).

Aplica sobre: casca (187), perfil estrutural (169), chapa dobrada (122), engrenagem (88).

No projeto: esboço `furos` na caixa; núcleo `furo` com `centros`.

Fontes confirmadas que citam a técnica:

| Domínio | Solução | Licença | Via elemento | Link |
|---|---|---|---|---|
| cad_por_codigo | BOSL2: containers.scad (threaded_lid, box) | BSD-2-Clause | tampa | https://github.com/BelfrySCAD/BOSL2/wiki/containers.scad |

Descrições originais agrupadas aqui (16): corte booleano de alívio e furação; corte booleano de contorno e furos de fixação; corte booleano de furação circular de fixação; corte booleano de furos de montagem e alívios; corte booleano de furos de pino de articulação e alívio; corte booleano de furos escareados de montagem; corte booleano de furos escareados para parafusos; corte booleano de perfurações de escoamento; corte booleano de pinos e furos de articulação com batente; furação concêntrica; furação concêntrica booleana; furação concêntrica de centro usinado; matriz bidimensional de perfuração; repetição radial de furação booleana; repetição radial de furos de saída de chama; repetição radial de furos e canais de ventilação.

### casca com espessura

Gera: casca (187), perfil estrutural (169), tubo (156), tampa (148), mangueira ou cabo (145), chapa dobrada (122), vidro ou painel (111), rolamento ou mancal (103), tecido ou estofado (83), pneu (39), bocal ou tubeira (20), elemento filtrante (13), asa ou aerofólio (9), rosca helicoidal de transporte (4), esteira porta-cabos (4), remo (1), vela náutica (1).

Aplica sobre: chassi ou quadro (201), rótula ou junta esférica (16).

No projeto: esboço só `anel` (cilindro oco); núcleo não.

Fontes confirmadas que citam a técnica:

| Domínio | Solução | Licença | Via elemento | Link |
|---|---|---|---|---|
| blender_nativo | Solidify Modifier (modo Simple ou Complex) aplicando espessura uniform | GPL-2.0-or-later | casca | https://docs.blender.org/manual/en/latest/modeling/modifiers/generate/solidify.html |
| blender_nativo | Curva 3D Bézier com propriedades nativas de Chanfro (Bevel Depth e Res | GPL-2.0-or-later | tubo | https://docs.blender.org/manual/en/latest/modeling/curves/properties/geometry.html#bevel |
| cad_por_codigo | Build123d: Box, thicken de casca curvada | Apache-2.0 | vidro ou painel | https://build123d.readthedocs.io/en/latest/objects.html |
| blender_nativo | Screw Modifier aplicado a perfil laminar retangular com passo longo (p | GPL-2.0-or-later | rosca helicoidal de transporte | https://docs.blender.org/manual/en/latest/modeling/modifiers/generate/screw.html |

Descrições originais agrupadas aqui (9): casca / espessura de bucha cilíndrica; casca / espessura de calha envoltória; casca / espessura de parede constante; casca / espessura de parede constante (solidify fino); casca / espessura de parede constante (solidify); casca / espessura de parede constante de pá côncava; casca / espessura de parede constante de revestimento; casca / solidify; revolução com espessura de parede.

### união booleana

Gera: chassi ou quadro (201), articulação (183), botão ou manopla (170), tampa (148), mangueira ou cabo (145), rolamento ou mancal (103), trava ou fecho (78), roda (72), placa de circuito ou componente elétrico (66), freio (50), válvula ou obturador (44), hélice ou rotor (36), cilindro ou atuador linear (35), núcleo magnético e bobina (29), aleta ou dissipador de calor (24), corrente (22), fuso ou rosca de avanço (21), mordaça ou mordente (21), elemento de aquecimento ou combustão (18), ponteiro ou mostrador (17), gancho ou olhal de carga (17), degrau ou palete articulado (6), esteira de tração ou lagarta (4), zíper (3), remo (1).

No projeto: esboço não (formas se sobrepõem sem fundir); núcleo `unir`.

Nenhuma fonte confirmada cita a técnica pelo nome; as fontes de cada elemento estão em `ELEMENTOS-DE-OBJETOS.md`.

Descrições originais agrupadas aqui (16): união booleana; união booleana de abas/travas; união booleana de conectores terminais; união booleana de corpos de componentes; união booleana de elo montado; união booleana de elo à sapata; união booleana de empunhadura; união booleana de flanges de montagem; união booleana de flanges e derivações; união booleana de nós estruturais; união booleana de pás ao cubo; união booleana de raios ao aro e cubo; união booleana de suportes de rolete e dentes de engate; união booleana de suportes e conexões; união booleana de suportes estruturais; união booleana sobre corpo base.

### varredura ao longo de caminho

Gera: chassi ou quadro (201), casca (187), perfil estrutural (169), tubo (156), mangueira ou cabo (145), vedação (138), trilho ou guia (83), tecido ou estofado (83), trava ou fecho (78), placa de circuito ou componente elétrico (66), polia e correia (47), núcleo magnético e bobina (29), corrente (22), elemento de aquecimento ou combustão (18), gancho ou olhal de carga (17), asa ou aerofólio (9), zíper (3), remo (1), vela náutica (1).

No projeto: esboço `tubo` (só seção circular) e `envolve`; núcleo `loft` ao longo de caminho 3D.

Fontes confirmadas que citam a técnica:

| Domínio | Solução | Licença | Via elemento | Link |
|---|---|---|---|---|
| cad_por_codigo | Build123d: Sweep(sections, path) ao longo de Wire 3D | Apache-2.0 | chassi ou quadro | https://build123d.readthedocs.io/en/latest/objects.html |
| cad_por_codigo | Build123d: Sweep(Circle(r), path=Helix(pitch, height, radius)) | Apache-2.0 | mola | https://build123d.readthedocs.io/en/latest/objects.html |
| freecad_onshape | FreeCAD PartDesign Workbench (AdditivePipe) / Onshape 3D Curve Sweep e | LGPL-2.1 / Apache-2.0 | tubo | https://wiki.freecad.org/PartDesign_AdditivePipe e https://github.com/FreeCAD/FreeCAD |
| cad_por_codigo | Build123d: Sweep(Circle(r), path=Spline(...)) | Apache-2.0 | mangueira ou cabo | https://build123d.readthedocs.io/en/latest/objects.html |
| cad_por_codigo | BOSL2: shapes3d.scad (torus), rounding.scad | BSD-2-Clause | vedação | https://github.com/BelfrySCAD/BOSL2/wiki/shapes3d.scad#functionmodule-torus |
| cad_por_codigo | BOSL2: threading.scad (trapezoidal_threaded_rod) | BSD-2-Clause | fuso ou rosca de avanço | https://github.com/BelfrySCAD/BOSL2/wiki/threading.scad |
| cad_por_codigo | Build123d: Sweep(Rectangle(w, h), path=Helix(pitch, height, radius)) | Apache-2.0 | rosca helicoidal de transporte | https://build123d.readthedocs.io/en/latest/objects.html |

Descrições originais agrupadas aqui (18): sweep / extrusão ao longo de curva; sweep ao longo de borda para vivos/costuras; sweep ao longo de bordas perimetrais com perfil de tralha/bainha; sweep ao longo de curva; sweep ao longo de curva 3D tubular contínua; sweep ao longo de curva guia; sweep ao longo de curva/canaleta fechada; sweep ao longo de curvas guia; sweep ao longo de trajetória fechada para enrolamento; sweep com perfil de aerofólio e torção geométrica (twist); sweep de fita de suporte flexível ao longo de trajetória 3D; sweep de seção circular ao longo de curva oval fechada de elo; sweep de seção da correia ao longo de trajetória fechada; sweep de seção oca ao longo de curva 3D; sweep de seção oca/sólida ao longo de curva spline 3D com caimento; sweep de seção transversal ao longo de curva 3D de curvatura variável; sweep de seção variável ao longo de eixo longitudinal; sweep de trilhas condutoras.

### loft entre seções

Gera: chassi ou quadro (201), casca (187), superfície de pega (150), vidro ou painel (111), fixador (109), tecido ou estofado (83), válvula ou obturador (44), hélice ou rotor (36), lâmina ou elemento de corte (30), bocal ou tubeira (20), contrapeso (20), gancho ou olhal de carga (17), asa ou aerofólio (9), came ou excêntrico (7), zíper (3), remo (1), vela náutica (1).

No projeto: esboço `loft`; núcleo `loft`.

Fontes confirmadas que citam a técnica:

| Domínio | Solução | Licença | Via elemento | Link |
|---|---|---|---|---|
| cad_por_codigo | BOSL2: skin.scad (skin de perfis anatômicos escalonados) + knurling.sc | BSD-2-Clause | superfície de pega | https://github.com/BelfrySCAD/BOSL2/wiki/skin.scad |
| freecad_onshape | FreeCAD Curves Workbench (GordonSurface) / PartDesign (AdditiveLoft) / | LGPL-2.1 / Apache-2.0 | superfície de pega | https://github.com/tomate44/CurvesWB |
| cad_por_codigo | BOSL2: skin.scad com seções aerodinâmicas torcidas e rot_copies() | Apache-2.0 | hélice ou rotor | https://cadquery.readthedocs.io/en/latest/classreference.html#cadquery.Workplane.loft |
| cad_por_codigo | CadQuery: coordenadas analíticas NACA 4/5 dígitos geradas via spline f | Apache-2.0 | asa ou aerofólio | https://cadquery.readthedocs.io/en/latest/classreference.html#cadquery.Workplane.loft |

Descrições originais agrupadas aqui (17): loft de canal interno convergente em Y do cursor deslizante; loft de concavidades anatômicas para dedos; loft de transição cabeça-corpo; loft de transição entre dutos e câmara; loft entre curvas de testa, esteira e valuma com arqueamento aerodinâmico (camber); loft entre curvas guia para painel curvado; loft entre seções circulares e elípticas de transição; loft entre seções de aerofólio com torção geométrica (twist); loft entre seções de lâmina de perfil curvo; loft entre seções de lóbulo; loft entre seções de transição de massa; loft entre seções de transição suave de haste cilíndrica para pá hidrodinâmica; loft entre seções transversais; loft entre seções transversais anatômicas; loft entre seções transversais ao longo do corpo; loft entre seções transversais de aerofólio (NACA); loft entre seções tubulares de transição.

### hélice

Gera: conexão (152), grade ou furação em padrão (151), tampa (148), fixador (109), mola (104), engrenagem (88), trava ou fecho (78), válvula ou obturador (44), cilindro ou atuador linear (35), fuso ou rosca de avanço (21), rótula ou junta esférica (16), rosca helicoidal de transporte (4).

No projeto: esboço não; núcleo não.

Fontes confirmadas que citam a técnica:

| Domínio | Solução | Licença | Via elemento | Link |
|---|---|---|---|---|
| cad_por_codigo | BOSL2: gears.scad (spur_gear, bevel_gear, ring_gear, worm, rack) | BSD-2-Clause | engrenagem | https://github.com/BelfrySCAD/BOSL2/wiki/gears.scad |
| normas_catalogos | Molas helicoidais cilíndricas de compressão e tração conforme DIN EN 1 | norma_publica | mola | DIN EN 13906-1, DIN 2095, DIN 2093, Catálogo Gutekunst |
| cad_por_codigo | BOSL2: threading.scad (pipe, threaded_coupler) | BSD-2-Clause | conexão | https://github.com/BelfrySCAD/BOSL2/wiki/threading.scad |
| cad_por_codigo | BOSL2: skin.scad com seções aerodinâmicas torcidas e rot_copies() | Apache-2.0 | hélice ou rotor | https://cadquery.readthedocs.io/en/latest/classreference.html#cadquery.Workplane.loft |
| normas_catalogos | Rótulas radiais esféricas conforme ISO 12240-1 / DIN 648 e terminais r | norma_publica | rótula ou junta esférica | ISO 12240-1, ISO 12240-4, DIN 648, Catálogo SKF Rótulas |
| cad_por_codigo | Build123d: Sweep(Rectangle(w, h), path=Helix(pitch, height, radius)) | Apache-2.0 | rosca helicoidal de transporte | https://build123d.readthedocs.io/en/latest/objects.html |

Descrições originais agrupadas aqui (17): corte booleano de rosca e ranhuras de recirculação; corte booleano de rosca/fenda; furação helicoidal em padrão; hélice paramétrica; hélice paramétrica de mola interna; hélice paramétrica de rosca; hélice paramétrica de rosca de fixação; hélice paramétrica de rosca de haste; hélice paramétrica de rosca externa/interna; hélice paramétrica de roscas de fixação; sweep ao longo de espiral plana/cônica; sweep ao longo de hélice paramétrica de passo constante/variável; sweep ao longo de hélice paramétrica de perfil trapezoidal ou ogival; sweep de lâmina plana ao longo de hélice paramétrica de passo constante/cônico; sweep helicoidal de dente ao longo de hélice paramétrica; união booleana de haste roscada; união booleana de helicoide ao eixo cilíndrico.

### nervura

Aplica sobre: chassi ou quadro (201), casca (187), tampa (148), chapa dobrada (122).

No projeto: esboço não; núcleo não.

Nenhuma fonte confirmada cita a técnica pelo nome; as fontes de cada elemento estão em `ELEMENTOS-DE-OBJETOS.md`.

### dobra ao longo de caminho

Aplica sobre: tubo (156), mangueira ou cabo (145), chapa dobrada (122), vidro ou painel (111), tecido ou estofado (83), esteira porta-cabos (4), vela náutica (1).

No projeto: esboço não; núcleo não.

Nenhuma fonte confirmada cita a técnica pelo nome; as fontes de cada elemento estão em `ELEMENTOS-DE-OBJETOS.md`.

### recartilhado e textura

Gera: botão ou manopla (170), superfície de pega (150), mordaça ou mordente (21), degrau ou palete articulado (6).

No projeto: esboço não; núcleo `displace` (ruído).

Fontes confirmadas que citam a técnica:

| Domínio | Solução | Licença | Via elemento | Link |
|---|---|---|---|---|
| cad_por_codigo | BOSL2: knurling.scad (knurled_cylinder, knurl), rot_copies() para lóbu | BSD-2-Clause | botão ou manopla | https://github.com/BelfrySCAD/BOSL2/wiki/knurling.scad |
| freecad_onshape | FreeCAD PartDesign Workbench (Revolution + PolarPattern) / Onshape Knu | Apache-2.0 / LGPL-2.1 | botão ou manopla | https://wiki.freecad.org/PartDesign_PolarPattern |
| addons_blender | Tissue | GPL-2.0-or-later | superfície de pega | https://github.com/alessandro-zomparelli/tissue |
| cad_por_codigo | BOSL2: skin.scad (skin de perfis anatômicos escalonados) + knurling.sc | BSD-2-Clause | superfície de pega | https://github.com/BelfrySCAD/BOSL2/wiki/skin.scad |
| normas_catalogos | Dimensões ergonômicas para empunhaduras e pegas manuais conforme ISO 7 | norma_publica | superfície de pega | ISO 7250, DIN 33402, DIN 82, Catálogo Halder |

Descrições originais agrupadas aqui (7): corte booleano de matriz de recartilhado (knurling); corte booleano de perfil prismático em V / recartilhado; relevo/emboss procedural de textura superficial; repetição linear de estrias e ranhuras de aperto; repetição linear de frisos e dentes antiderrapantes; repetição linear/radial de nervuras de atrito; repetição radial de ranhuras de pega.

### flange de borda

Aplica sobre: casca (187), tubo (156).

No projeto: esboço não; núcleo não.

Fontes confirmadas que citam a técnica:

| Domínio | Solução | Licença | Via elemento | Link |
|---|---|---|---|---|
| freecad_onshape | FreeCAD SheetMetal Workbench (SMFold, SMFlange, SMBend, SMUnfold) / On | GPL-3.0 (FreeCAD SheetMetal) / Proprietária Onshape | chapa dobrada | https://github.com/shaise/FreeCAD_SheetMetal |
| cad_por_codigo | BOSL2: pulleys.scad (pulley para perfis GT2, T5 e correias em V com fl | BSD-2-Clause | polia e correia | https://github.com/BelfrySCAD/BOSL2/wiki/pulleys.scad |

### torção

Aplica sobre: perfil estrutural (169), mola (104), hélice ou rotor (36), corrente (22), asa ou aerofólio (9), remo (1).

No projeto: esboço não; núcleo não.

Nenhuma fonte confirmada cita a técnica pelo nome; as fontes de cada elemento estão em `ELEMENTOS-DE-OBJETOS.md`.

### chapa dobrada

Gera: chapa dobrada (122), elemento filtrante (13), esteira porta-cabos (4).

No projeto: esboço não; núcleo não.

Fontes confirmadas que citam a técnica:

| Domínio | Solução | Licença | Via elemento | Link |
|---|---|---|---|---|
| cad_por_codigo | CadQuery: plugin cadquery-sheetmetal | Apache-2.0 | chapa dobrada | https://build123d.readthedocs.io/en/latest/sheet_metal/index.html |
| freecad_onshape | FreeCAD SheetMetal Workbench (SMFold, SMFlange, SMBend, SMUnfold) / On | GPL-3.0 (FreeCAD SheetMetal) / Proprietária Onshape | chapa dobrada | https://github.com/shaise/FreeCAD_SheetMetal |

Descrições originais agrupadas aqui (4): conformação de dobras retilíneas (sheet metal flange / fold); corte booleano de alívio de dobra e cantos; repetição linear ao longo de curva de trajetória de dobra; repetição radial de dobras/plissas em torno de eixo.

### superfície livre

Gera: tecido ou estofado (83).

No projeto: esboço `loft`; núcleo `inflate` (por silhuetas).

Nenhuma fonte confirmada cita a técnica pelo nome; as fontes de cada elemento estão em `ELEMENTOS-DE-OBJETOS.md`.

Descrições originais agrupadas aqui (1): conformação por superfícies curvas livres.

### repetição ao longo de caminho

Gera: corrente (22), esteira de tração ou lagarta (4), zíper (3).

No projeto: esboço `arranja` ao longo de `tubo` ou `envolve`; núcleo não.

Nenhuma fonte confirmada cita a técnica pelo nome; as fontes de cada elemento estão em `ELEMENTOS-DE-OBJETOS.md`.

Descrições originais agrupadas aqui (3): repetição linear alternada ao longo de trajetória guia; repetição linear alternada de dentes ao longo de curvas guia; repetição linear ao longo de curva fechada de perímetro.


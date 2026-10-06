# Elementos Mecânicos de Objetos — Análise de Padrões e Fontes (T015)

Documento canônico derivado por script a partir de [`elementos-de-objetos.json`](elementos-de-objetos.json).
A mesma análise organizada por técnica de forma, com o que o projeto já faz e o que falta, está em [`TECNICAS-DE-FORMA.md`](TECNICAS-DE-FORMA.md).
Consolida a decomposição mecânica de **364 objetos únicos** distribuídos nas **28 famílias** de [`FAMILIAS-DE-OBJETOS.md`](FAMILIAS-DE-OBJETOS.md), mapeando as técnicas de modelagem geométrica, as operações do núcleo procedural, as características funcionais implementadas vs faltantes e as fontes abertas auditadas com verificação de paywall.

## Metodologia e Decisões Técnicas (T015)

1. **Quatro Decisões Estritas:**
   - **`já temos` (0):** o projeto gera 100% das características funcionais definidoras.
   - **`temos parcial` (22):** o projeto gera parte das características em `modulos/esboco` ou `procedural/nucleo/operacoes`, e o campo `falta` explicita os detalhes que restam implementar.
   - **`converter` (15):** o projeto não gera nenhuma característica no repositório, mas há fonte técnica aberta confirmada com a ideia/algoritmo paramétrico para transposição.
   - **`criar` (16):** o projeto não gera nenhuma característica e não há fonte procedural aberta confirmada com a receita da forma (exigindo modelagem procedural do zero baseada em requisitos).
2. **Saneamento e Validação Estrita de Links (HTTP 200):**
   - Links do BOSL2 corrigidos para a organização oficial `BelfrySCAD`.
   - Links de build123d atualizados para as rotas vigentes da documentação.
   - Eliminadas URLs sintéticas com nomes legíveis do Onshape; mantidos apenas documentos com hash hexadecimal de 24 caracteres ou páginas oficiais `cad.onshape.com/FsDoc/...`.
   - 100% dos links de fontes com status `confirmado` testados e validados contra a rede (zero links quebrados, zero URLs inválidas).
3. **Cálculo Determinístico Intacto:** frequências, percentuais e matriz de objetos preservados integralmente da auditoria estrita da T014.

---

## Top 15 Elementos de Maior Retorno

Ranking ordenado estritamente pelo número de objetos atendidos entre os elementos que **não** são `já temos`:

| # | Elemento | Decisão | Falta (Temos Parcial) | Objetos | % Objetos | Famílias | % Famílias | Técnicas Chave | Destravamento Arquitetural |
|---|---|---|---|---|---|---|---|---|---|
| 01 | **chassi ou quadro** | `temos parcial` | perfis tubulares ocos estruturais; travessas transversais de amarração e hardpoints de fixação | 201 | 55.2% | 25 | 89.3% |  | Estruturas de suporte de carga, quadros de veículos, pontes e gabinetes |
| 02 | **casca** | `temos parcial` | espessura de parede fina constante uniforme (shell/solidify); nervuras internas de reforço estrutural | 187 | 51.4% | 26 | 92.9% |  | Carenagens, envoltórias, tanques, fuselagens e gabinetes em veículos, robôs e eletrodomésticos |
| 03 | **articulação** | `temos parcial` | nós/olhais ocos intercalados (knuckles); furação de fixação nas abas | 183 | 50.3% | 28 | 100.0% |  | Mecanismos de rotação angular, dobradiças, braços robóticos e elos de suspensão |
| 04 | **eixo** | `temos parcial` | rasgo de chaveta longitudinal (keyway); ranhuras para anel elástico de retenção (circlip) | 172 | 47.3% | 25 | 89.3% |  | Eixos de transmissão de potência, árvores de manivelas e acoplamentos rotativos |
| 05 | **botão ou manopla** | `temos parcial` | recartilhado ou estrias periféricas para atrito; furo chavetado/encaixe indexado de eixo ou marcação de escala | 170 | 46.7% | 24 | 85.7% |  | Interfaces físicas de acionamento, IHM, volantes manuais e manípulos de ajuste |
| 06 | **perfil estrutural** | `temos parcial` | seção tubular oca 100% contínua e fechada; raios de concordância de laminação/dobra nas quinas | 169 | 46.4% | 25 | 89.3% |  | Vigas estruturais, montantes de máquinas, trilhos de suporte e perfis extrudados |
| 07 | **tubo** | `temos parcial` | seção transversal oca com espessura de parede; lúmen interno vazado e extremidades abertas | 156 | 42.9% | 27 | 96.4% |  | Linhas de fluido hidráulico, pneumático, exaustão, dutos de combustível e conduítes |
| 08 | **conexão** | `temos parcial` | rosca cônica/paralela de união (NPT/BSP) ou flange; espigão espiralado de retenção para mangueira | 152 | 41.8% | 23 | 82.1% |  | Niples roscados, conexões hidráulicas, flanges de acoplamento e engates rápidos |
| 09 | **grade ou furação em padrão** | `temos parcial` | padrão em matriz retangular bidimensional direta (NxM com dx/dy); escariado ou rebaixo de assentamento embutido no padrão | 151 | 41.5% | 24 | 85.7% |  | Grades de ventilação, painéis perfurados de dissipação e matrizes de montagem |
| 10 | **superfície de pega** | `temos parcial` | ranhuras ou rebaixos ergonômicos para os dedos; textura superficial padronizada de aderência (grip) | 150 | 41.2% | 27 | 96.4% |  | Manoplas ergonômicas, empunhaduras de ferramentas, pegadores e alças de tração |
| 11 | **tampa** | `temos parcial` | aba perimetral de encaixe com batente; rebaixo para anel de vedação ou rosca de fechamento | 148 | 40.7% | 24 | 85.7% |  | Tampas de inspeção de cárter, flanges cegos, fechamentos herméticos e portas de acesso |
| 12 | **mangueira ou cabo** | `temos parcial` | seção tubular oca flexível com camadas de reforço; terminais de crimpagem/niples prensados nas extremidades | 145 | 39.8% | 21 | 75.0% |  | Mangueiras flexíveis de alta pressão e chicotes elétricos de comando |
| 13 | **vedação** | `converter` | *(nenhuma gerada — converter fonte)* | 138 | 37.9% | 24 | 85.7% |  | Anéis O-ring, retentores labiais e juntas de vedação estanque para fluidos |
| 14 | **chapa dobrada** | `converter` | *(nenhuma gerada — converter fonte)* | 122 | 33.5% | 23 | 82.1% |  | Bandejas estruturais, suportes conformados, consoles e caixas metálicas |
| 15 | **vidro ou painel** | `temos parcial` | rebaixo perimetral para encaixe em caixilho/moldura; furação de montagem com presilhas ou buchas de amortecimento | 111 | 30.5% | 22 | 78.6% |  | Visores de nível, para-brisas, telas de comando, janelas de máquinas e cabines |

---

## Catálogo Geral dos 53 Elementos Canônicos

| Elemento | Decisão | Falta (Temos Parcial) | Objetos | Famílias | Técnicas Principais | Principais Fontes Confirmadas |
|---|---|---|---|---|---|---|
| **chassi ou quadro** | `temos parcial` | perfis tubulares ocos estruturais; travessas transversais de amarração e hardpoints de fixação | 201 | 25 |  | cad_por_codigo, freecad_onshape, normas_catalogos |
| **casca** | `temos parcial` | espessura de parede fina constante uniforme (shell/solidify); nervuras internas de reforço estrutural | 187 | 26 |  | blender_nativo, cad_por_codigo, freecad_onshape |
| **articulação** | `temos parcial` | nós/olhais ocos intercalados (knuckles); furação de fixação nas abas | 183 | 28 |  | cad_por_codigo, freecad_onshape |
| **eixo** | `temos parcial` | rasgo de chaveta longitudinal (keyway); ranhuras para anel elástico de retenção (circlip) | 172 | 25 |  | cad_por_codigo, freecad_onshape |
| **botão ou manopla** | `temos parcial` | recartilhado ou estrias periféricas para atrito; furo chavetado/encaixe indexado de eixo ou marcação de escala | 170 | 24 |  | cad_por_codigo, freecad_onshape, normas_catalogos |
| **perfil estrutural** | `temos parcial` | seção tubular oca 100% contínua e fechada; raios de concordância de laminação/dobra nas quinas | 169 | 25 |  | blender_nativo, addons_blender, cad_por_codigo, freecad_onshape, normas_catalogos |
| **tubo** | `temos parcial` | seção transversal oca com espessura de parede; lúmen interno vazado e extremidades abertas | 156 | 27 |  | blender_nativo, addons_blender, cad_por_codigo, freecad_onshape |
| **conexão** | `temos parcial` | rosca cônica/paralela de união (NPT/BSP) ou flange; espigão espiralado de retenção para mangueira | 152 | 23 |  | cad_por_codigo, freecad_onshape |
| **grade ou furação em padrão** | `temos parcial` | padrão em matriz retangular bidimensional direta (NxM com dx/dy); escariado ou rebaixo de assentamento embutido no padrão | 151 | 24 |  | blender_nativo, addons_blender, cad_por_codigo, freecad_onshape |
| **superfície de pega** | `temos parcial` | ranhuras ou rebaixos ergonômicos para os dedos; textura superficial padronizada de aderência (grip) | 150 | 27 |  | addons_blender, cad_por_codigo, freecad_onshape, normas_catalogos |
| **tampa** | `temos parcial` | aba perimetral de encaixe com batente; rebaixo para anel de vedação ou rosca de fechamento | 148 | 24 |  | cad_por_codigo, freecad_onshape |
| **mangueira ou cabo** | `temos parcial` | seção tubular oca flexível com camadas de reforço; terminais de crimpagem/niples prensados nas extremidades | 145 | 21 |  | blender_nativo, addons_blender, cad_por_codigo, freecad_onshape, normas_catalogos |
| **vedação** | `converter` | *(nenhuma gerada — converter)* | 138 | 24 |  | blender_nativo, cad_por_codigo, freecad_onshape, normas_catalogos |
| **chapa dobrada** | `converter` | *(nenhuma gerada — converter)* | 122 | 23 |  | cad_por_codigo, freecad_onshape |
| **vidro ou painel** | `temos parcial` | rebaixo perimetral para encaixe em caixilho/moldura; furação de montagem com presilhas ou buchas de amortecimento | 111 | 22 |  | cad_por_codigo, freecad_onshape |
| **fixador** | `temos parcial` | rosca helicoidal funcional com passo e profundidade; acionamento interno na cabeça (fenda, Phillips ou Allen) | 109 | 14 |  | addons_blender, cad_por_codigo, freecad_onshape |
| **mola** | `temos parcial` | espiras terminais fechadas e retificadas (dead coils); passo variável e deformação paramétrica sob carga | 104 | 25 |  | blender_nativo, addons_blender, cad_por_codigo, freecad_onshape, normas_catalogos |
| **rolamento ou mancal** | `temos parcial` | pistas toroidais côncavas de rolagem nos anéis; gaiola espaçadora dos corpos rolantes e blindagens laterais | 103 | 16 |  | cad_por_codigo, freecad_onshape, normas_catalogos |
| **engrenagem** | `temos parcial` | perfil de dente em evolvente precisa (involute); furo de montagem no cubo com rasgo de chaveta | 88 | 21 |  | addons_blender, cad_por_codigo, freecad_onshape |
| **trilho ou guia** | `converter` | *(nenhuma gerada — converter)* | 83 | 24 |  | cad_por_codigo, freecad_onshape, normas_catalogos |
| **tecido ou estofado** | `criar` | *(nenhuma gerada — criar)* | 83 | 15 |  | *(sem fontes confirmadas)* |
| **trava ou fecho** | `converter` | *(nenhuma gerada — converter)* | 78 | 22 |  | cad_por_codigo, freecad_onshape, normas_catalogos |
| **roda** | `temos parcial` | furação de fixação em padrão circular (PCD) no cubo; raios ou alma estrutural com nervuras de alívio | 72 | 16 |  | cad_por_codigo, freecad_onshape, normas_catalogos |
| **placa de circuito ou componente elétrico** | `criar` | *(nenhuma gerada — criar)* | 66 | 17 |  | *(sem fontes confirmadas)* |
| **freio** | `temos parcial` | pista dupla ventilada com aletas radiais internas; furação de ventilação na pista e pinça com pastilhas | 50 | 13 |  | cad_por_codigo, freecad_onshape, normas_catalogos |
| **polia e correia** | `temos parcial` | canal perfilado em V ou perfil dentado na polia; correia fechada com perfil correspondente sincronizado | 47 | 14 |  | cad_por_codigo, freecad_onshape, normas_catalogos |
| **válvula ou obturador** | `criar` | *(nenhuma gerada — criar)* | 44 | 16 |  | *(sem fontes confirmadas)* |
| **pneu** | `temos parcial` | banda de rodagem com desenho funcional de sulcos e ranhuras; talão reforçado de assentamento estanque no aro | 39 | 7 |  | cad_por_codigo, freecad_onshape |
| **hélice ou rotor** | `converter` | *(nenhuma gerada — converter)* | 36 | 11 |  | cad_por_codigo, normas_catalogos |
| **cilindro ou atuador linear** | `converter` | *(nenhuma gerada — converter)* | 35 | 12 |  | cad_por_codigo, freecad_onshape, normas_catalogos |
| **lâmina ou elemento de corte** | `converter` | *(nenhuma gerada — converter)* | 30 | 7 |  | cad_por_codigo, freecad_onshape, normas_catalogos |
| **núcleo magnético e bobina** | `criar` | *(nenhuma gerada — criar)* | 29 | 9 |  | *(sem fontes confirmadas)* |
| **aleta ou dissipador de calor** | `converter` | *(nenhuma gerada — converter)* | 24 | 10 |  | cad_por_codigo, freecad_onshape, normas_catalogos |
| **corrente** | `converter` | *(nenhuma gerada — converter)* | 22 | 12 |  | cad_por_codigo, freecad_onshape, normas_catalogos |
| **fuso ou rosca de avanço** | `converter` | *(nenhuma gerada — converter)* | 21 | 9 |  | cad_por_codigo, freecad_onshape |
| **mordaça ou mordente** | `criar` | *(nenhuma gerada — criar)* | 21 | 8 |  | *(sem fontes confirmadas)* |
| **bocal ou tubeira** | `converter` | *(nenhuma gerada — converter)* | 20 | 11 |  | cad_por_codigo, freecad_onshape, normas_catalogos |
| **contrapeso** | `temos parcial` | furação de fixação excêntrica para balanceamento dinâmico; rasgos ou rebaixos de calibração de massa | 20 | 11 |  | cad_por_codigo, freecad_onshape |
| **elemento de aquecimento ou combustão** | `criar` | *(nenhuma gerada — criar)* | 18 | 8 |  | *(sem fontes confirmadas)* |
| **gancho ou olhal de carga** | `criar` | *(nenhuma gerada — criar)* | 17 | 9 |  | *(sem fontes confirmadas)* |
| **ponteiro ou mostrador** | `criar` | *(nenhuma gerada — criar)* | 17 | 7 |  | *(sem fontes confirmadas)* |
| **rótula ou junta esférica** | `converter` | *(nenhuma gerada — converter)* | 16 | 8 |  | cad_por_codigo, freecad_onshape, normas_catalogos |
| **elemento filtrante** | `criar` | *(nenhuma gerada — criar)* | 13 | 7 |  | *(sem fontes confirmadas)* |
| **pistão ou êmbolo** | `criar` | *(nenhuma gerada — criar)* | 13 | 8 |  | *(sem fontes confirmadas)* |
| **asa ou aerofólio** | `converter` | *(nenhuma gerada — converter)* | 9 | 3 |  | addons_blender, cad_por_codigo, normas_catalogos |
| **came ou excêntrico** | `converter` | *(nenhuma gerada — converter)* | 7 | 4 |  | cad_por_codigo, freecad_onshape |
| **degrau ou palete articulado** | `criar` | *(nenhuma gerada — criar)* | 6 | 4 |  | *(sem fontes confirmadas)* |
| **esteira de tração ou lagarta** | `criar` | *(nenhuma gerada — criar)* | 4 | 2 |  | *(sem fontes confirmadas)* |
| **esteira porta-cabos** | `criar` | *(nenhuma gerada — criar)* | 4 | 2 |  | *(sem fontes confirmadas)* |
| **rosca helicoidal de transporte** | `converter` | *(nenhuma gerada — converter)* | 4 | 2 |  | blender_nativo, cad_por_codigo, freecad_onshape |
| **zíper** | `criar` | *(nenhuma gerada — criar)* | 3 | 2 |  | *(sem fontes confirmadas)* |
| **vela náutica** | `criar` | *(nenhuma gerada — criar)* | 1 | 1 |  | *(sem fontes confirmadas)* |
| **remo** | `criar` | *(nenhuma gerada — criar)* | 1 | 1 |  | *(sem fontes confirmadas)* |

---

## Auditoria Detalhada de Características por Elemento

| Elemento | Decisão | Características Definidoras | O que o Projeto Gera | Falta para Conclusão |
|---|---|---|---|---|
| **chassi ou quadro** | `temos parcial` | • envelope tridimensional básico com vigas longitudinais e coluna<br>• perfis tubulares ocos estruturais<br>• travessas transversais de amarração e hardpoints de fixação | • **envelope tridimensional básico com vigas longitudinais e coluna**: modulos/esboco/componentes/quadro.json (formas 'viga' e 'coluna') | • perfis tubulares ocos estruturais<br>• travessas transversais de amarração e hardpoints de fixação |
| **casca** | `temos parcial` | • superfície conformada tridimensional / envelope de fechamento<br>• espessura de parede fina constante uniforme (shell/solidify)<br>• nervuras internas de reforço estrutural | • **superfície conformada tridimensional / envelope de fechamento**: operação `loft` do núcleo e `inflate`, forma `loft` do esboço | • espessura de parede fina constante uniforme (shell/solidify)<br>• nervuras internas de reforço estrutural |
| **articulação** | `temos parcial` | • pino cilíndrico central de pivô<br>• abas laterais planas de montagem<br>• nós/olhais ocos intercalados (knuckles)<br>• furação de fixação nas abas | • **pino cilíndrico central de pivô**: modulos/esboco/componentes/dobradica.json (forma 'pino')<br>• **abas laterais planas de montagem**: modulos/esboco/componentes/dobradica.json (formas 'abaE' e 'abaD') | • nós/olhais ocos intercalados (knuckles)<br>• furação de fixação nas abas |
| **eixo** | `temos parcial` | • corpo de revolução cilíndrico escalonado<br>• rasgo de chaveta longitudinal (keyway)<br>• ranhuras para anel elástico de retenção (circlip) | • **corpo de revolução cilíndrico escalonado**: forma `cilindro` do esboço, operação `cilindro` do núcleo | • rasgo de chaveta longitudinal (keyway)<br>• ranhuras para anel elástico de retenção (circlip) |
| **botão ou manopla** | `temos parcial` | • corpo cilíndrico ou prismático de pega<br>• recartilhado ou estrias periféricas para atrito<br>• furo chavetado/encaixe indexado de eixo ou marcação de escala | • **corpo cilíndrico ou prismático de pega**: forma `cilindro` do esboço e `caixa` | • recartilhado ou estrias periféricas para atrito<br>• furo chavetado/encaixe indexado de eixo ou marcação de escala |
| **perfil estrutural** | `temos parcial` | • seção conformada padronizada (cantoneira L, U)<br>• seção tubular oca 100% contínua e fechada<br>• raios de concordância de laminação/dobra nas quinas | • **seção conformada padronizada (cantoneira L, U)**: modulos/esboco/componentes/perfil.json (formas 'aba1', 'aba2') | • seção tubular oca 100% contínua e fechada<br>• raios de concordância de laminação/dobra nas quinas |
| **tubo** | `temos parcial` | • trajetória 3D com trechos retos e arcos de concordância<br>• seção transversal oca com espessura de parede<br>• lúmen interno vazado e extremidades abertas | • **trajetória 3D com trechos retos e arcos de concordância**: forma `tubo` do esboço | • seção transversal oca com espessura de parede<br>• lúmen interno vazado e extremidades abertas |
| **conexão** | `temos parcial` | • corpo angular com bifurcação/derivação de fluxo (curva, T)<br>• rosca cônica/paralela de união (NPT/BSP) ou flange<br>• espigão espiralado de retenção para mangueira | • **corpo angular com bifurcação/derivação de fluxo (curva, T)**: forma `tubo` do esboço com raioCurva | • rosca cônica/paralela de união (NPT/BSP) ou flange<br>• espigão espiralado de retenção para mangueira |
| **grade ou furação em padrão** | `temos parcial` | • furação cilíndrica passante ou cega<br>• repetição linear ou radial com espaçamento paramétrico<br>• padrão em matriz retangular bidimensional direta (NxM com dx/dy)<br>• escariado ou rebaixo de assentamento embutido no padrão | • **furação cilíndrica passante ou cega**: procedural/nucleo/operacoes/estruturais.js (operação furo)<br>• **repetição linear ou radial com espaçamento paramétrico**: procedural/nucleo/operacoes/estruturais.js (operação arranja) | • padrão em matriz retangular bidimensional direta (NxM com dx/dy)<br>• escariado ou rebaixo de assentamento embutido no padrão |
| **superfície de pega** | `temos parcial` | • volume anatômico básico por transição de seções ou revolução<br>• ranhuras ou rebaixos ergonômicos para os dedos<br>• textura superficial padronizada de aderência (grip) | • **volume anatômico básico por transição de seções ou revolução**: forma `loft` do esboço e `revolucao` | • ranhuras ou rebaixos ergonômicos para os dedos<br>• textura superficial padronizada de aderência (grip) |
| **tampa** | `temos parcial` | • fechamento plano laminar ou de revolução<br>• aba perimetral de encaixe com batente<br>• rebaixo para anel de vedação ou rosca de fechamento | • **fechamento plano laminar ou de revolução**: forma `caixa` do esboço e `revolucao` | • aba perimetral de encaixe com batente<br>• rebaixo para anel de vedação ou rosca de fechamento |
| **mangueira ou cabo** | `temos parcial` | • caminho flexível tridimensional suave<br>• seção tubular oca flexível com camadas de reforço<br>• terminais de crimpagem/niples prensados nas extremidades | • **caminho flexível tridimensional suave**: forma `tubo` do esboço | • seção tubular oca flexível com camadas de reforço<br>• terminais de crimpagem/niples prensados nas extremidades |
| **vedação** | `converter` | • anel elastomérico toroidal (O-ring) ou lábio dinâmico (retentor)<br>• canaleta de alojamento normatizada com folgas de compressão<br>• deformação elástica de pré-carga sob montagem | *Nenhuma característica gerada no repositório* | *Implementação procedural completa (via conversão de fonte técnica)* |
| **chapa dobrada** | `converter` | • planificação bidimensional com compensação de dobra (fator K)<br>• raios de concordância de conformação plástica<br>• abas e flanges dobrados sucessivos com alívios de canto | *Nenhuma característica gerada no repositório* | *Implementação procedural completa (via conversão de fonte técnica)* |
| **vidro ou painel** | `temos parcial` | • placa plana prismática dimensional<br>• rebaixo perimetral para encaixe em caixilho/moldura<br>• furação de montagem com presilhas ou buchas de amortecimento | • **placa plana prismática dimensional**: forma `caixa` do esboço | • rebaixo perimetral para encaixe em caixilho/moldura<br>• furação de montagem com presilhas ou buchas de amortecimento |
| **fixador** | `temos parcial` | • cabeça conformada hexagonal ou cilíndrica<br>• haste cilíndrica de ancoragem<br>• rosca helicoidal funcional com passo e profundidade<br>• acionamento interno na cabeça (fenda, Phillips ou Allen) | • **cabeça conformada hexagonal ou cilíndrica**: modulos/esboco/componentes/parafuso.json (forma 'cabeca')<br>• **haste cilíndrica de ancoragem**: modulos/esboco/componentes/parafuso.json (forma 'haste') | • rosca helicoidal funcional com passo e profundidade<br>• acionamento interno na cabeça (fenda, Phillips ou Allen) |
| **mola** | `temos parcial` | • espiras helicoidais tridimensionais com diâmetro de arame e passo<br>• espiras terminais fechadas e retificadas (dead coils)<br>• passo variável e deformação paramétrica sob carga | • **espiras helicoidais tridimensionais com diâmetro de arame e passo**: modulos/esboco/componentes/mola.json (forma 'espiras' via caminho helicoidal) | • espiras terminais fechadas e retificadas (dead coils)<br>• passo variável e deformação paramétrica sob carga |
| **rolamento ou mancal** | `temos parcial` | • anéis concêntricos externo e interno<br>• corpos rolantes aproximados<br>• pistas toroidais côncavas de rolagem nos anéis<br>• gaiola espaçadora dos corpos rolantes e blindagens laterais | • **anéis concêntricos externo e interno**: modulos/esboco/componentes/rolamento.json, mancal.json<br>• **corpos rolantes aproximados**: modulos/esboco/componentes/rolamento.json (esferas) | • pistas toroidais côncavas de rolagem nos anéis<br>• gaiola espaçadora dos corpos rolantes e blindagens laterais |
| **engrenagem** | `temos parcial` | • corpo de revolução cilíndrico com cubo e disco<br>• dentes com ângulo de pressão e passo circular<br>• perfil de dente em evolvente precisa (involute)<br>• furo de montagem no cubo com rasgo de chaveta | • **corpo de revolução cilíndrico com cubo e disco**: modulos/esboco/componentes/engrenagem.json (forma 'corpo')<br>• **dentes com ângulo de pressão e passo circular**: modulos/esboco/componentes/engrenagem.json (aproximação trapezoidal) | • perfil de dente em evolvente precisa (involute)<br>• furo de montagem no cubo com rasgo de chaveta |
| **trilho ou guia** | `converter` | • perfil linear com pistas de rolamento retificadas ou perfil em V/T<br>• furação padronizada ao longo do comprimento para fixação<br>• bloco deslizante/carro com recirculação de esferas | *Nenhuma característica gerada no repositório* | *Implementação procedural completa (via conversão de fonte técnica)* |
| **tecido ou estofado** | `criar` | • almofada volumétrica com contorno anatômico<br>• costuras perimetrais, vincos e dobras de conformação<br>• revestimento flexível sobre estrutura interna | *Nenhuma característica gerada no repositório* | *Implementação procedural completa do zero (sem fonte direta)* |
| **trava ou fecho** | `converter` | • lingueta, ferrolho ou trinco basculante/deslizante<br>• mola de retorno ou sistema de engate rápido (snap-action)<br>• batente ou contrafecho de retenção | *Nenhuma característica gerada no repositório* | *Implementação procedural completa (via conversão de fonte técnica)* |
| **roda** | `temos parcial` | • aro circular externo de revolução com flanges de retenção<br>• cubo central cilíndrico de montagem<br>• furação de fixação em padrão circular (PCD) no cubo<br>• raios ou alma estrutural com nervuras de alívio | • **aro circular externo de revolução com flanges de retenção**: modulos/esboco/componentes/roda.json (forma 'aro')<br>• **cubo central cilíndrico de montagem**: modulos/esboco/componentes/roda.json (forma 'cubo') | • furação de fixação em padrão circular (PCD) no cubo<br>• raios ou alma estrutural com nervuras de alívio |
| **placa de circuito ou componente elétrico** | `criar` | • substrato laminado com furação padronizada<br>• pistas condutoras, ilhas e máscara de solda<br>• componentes discretos tridimensionais soldados | *Nenhuma característica gerada no repositório* | *Implementação procedural completa do zero (sem fonte direta)* |
| **freio** | `temos parcial` | • disco circular de revolução<br>• pista dupla ventilada com aletas radiais internas<br>• furação de ventilação na pista e pinça com pastilhas | • **disco circular de revolução**: forma `revolucao` do esboço | • pista dupla ventilada com aletas radiais internas<br>• furação de ventilação na pista e pinça com pastilhas |
| **polia e correia** | `temos parcial` | • corpo circular de revolução com bordas<br>• canal perfilado em V ou perfil dentado na polia<br>• correia fechada com perfil correspondente sincronizado | • **corpo circular de revolução com bordas**: forma `revolucao` do esboço, `anel` | • canal perfilado em V ou perfil dentado na polia<br>• correia fechada com perfil correspondente sincronizado |
| **válvula ou obturador** | `criar` | • corpo de passagem de fluxo com sede usinada estanque<br>• obturador móvel conformado (disco, esfera, carretel ou agulha)<br>• haste de acionamento com gaxeta de vedação | *Nenhuma característica gerada no repositório* | *Implementação procedural completa do zero (sem fonte direta)* |
| **pneu** | `temos parcial` | • carcaça de revolução toroidal com seção transversal fechada<br>• banda de rodagem com desenho funcional de sulcos e ranhuras<br>• talão reforçado de assentamento estanque no aro | • **carcaça de revolução toroidal com seção transversal fechada**: forma `anel` do esboço e `revolucao` | • banda de rodagem com desenho funcional de sulcos e ranhuras<br>• talão reforçado de assentamento estanque no aro |
| **hélice ou rotor** | `converter` | • pás com perfil aerodinâmico/hidrodinâmico com torção contínua ao longo do raio<br>• cubo central com acoplamento mecânico de eixo<br>• ângulo de passo e corda variáveis por seção radial | *Nenhuma característica gerada no repositório* | *Implementação procedural completa (via conversão de fonte técnica)* |
| **cilindro ou atuador linear** | `converter` | • camisa cilíndrica com cabeçotes dianteiro e traseiro<br>• haste móvel com êmbolo interno e rosca de ponta<br>• pórticos de alimentação de fluido e munhões de montagem | *Nenhuma característica gerada no repositório* | *Implementação procedural completa (via conversão de fonte técnica)* |
| **lâmina ou elemento de corte** | `converter` | • corpo laminar metálico com geometria de cunha<br>• bisel retificado com gume de corte afiado<br>• serrilha, dentes conformados ou quebra-cavacos | *Nenhuma característica gerada no repositório* | *Implementação procedural completa (via conversão de fonte técnica)* |
| **núcleo magnético e bobina** | `criar` | • núcleo de lâminas ferromagnéticas estampadas (E-I) ou toroidal<br>• carretel plástico com abas de contenção<br>• enrolamento de espiras de fio esmaltado com terminais de saída | *Nenhuma característica gerada no repositório* | *Implementação procedural completa do zero (sem fonte direta)* |
| **aleta ou dissipador de calor** | `converter` | • base plana condutora de contato térmico<br>• conjunto de aletas paralelas de parede fina com espaçamento regular<br>• ranhuras longitudinais de aumento de área convectiva | *Nenhuma característica gerada no repositório* | *Implementação procedural completa (via conversão de fonte técnica)* |
| **corrente** | `converter` | • elos internos e externos intercalados em passo regular<br>• buchas, roletes giratórios e pinos prensados<br>• trajetória articulada fechada sobre engrenagens de corrente | *Nenhuma característica gerada no repositório* | *Implementação procedural completa (via conversão de fonte técnica)* |
| **fuso ou rosca de avanço** | `converter` | • fuso com rosca trapezoidal ou helicoidal de passo longo<br>• castanha com rosca fêmea correspondente ou recirculação de esferas<br>• pontas de eixo usinadas para mancais e acoplamento | *Nenhuma característica gerada no repositório* | *Implementação procedural completa (via conversão de fonte técnica)* |
| **mordaça ou mordente** | `criar` | • bloco prismático temperado com face de aperto retificada<br>• ranhuras serrilhadas ou recartilhado cruzado na face de contato<br>• furos escareados para fixação ao corpo da morsa/placa | *Nenhuma característica gerada no repositório* | *Implementação procedural completa do zero (sem fonte direta)* |
| **bocal ou tubeira** | `converter` | • duto axisimétrico com redução progressiva de seção (convergente)<br>• garganta calibrada e seção de expansão divergente (perfil de Laval)<br>• rosca de montagem e perfil de saída conformado | *Nenhuma característica gerada no repositório* | *Implementação procedural completa (via conversão de fonte técnica)* |
| **contrapeso** | `temos parcial` | • bloco volumétrico maciço de densidade concentrada<br>• furação de fixação excêntrica para balanceamento dinâmico<br>• rasgos ou rebaixos de calibração de massa | • **bloco volumétrico maciço de densidade concentrada**: forma `caixa` do esboço e `cilindro` | • furação de fixação excêntrica para balanceamento dinâmico<br>• rasgos ou rebaixos de calibração de massa |
| **elemento de aquecimento ou combustão** | `criar` | • tubo condutor de calor conformado em espiral/serpentina<br>• terminais elétricos de ligação cerâmicos/metálicos nas extremidades<br>• flange ou niple de montagem estanque em parede de vaso | *Nenhuma característica gerada no repositório* | *Implementação procedural completa do zero (sem fonte direta)* |
| **gancho ou olhal de carga** | `criar` | • corpo forjado curvo em C/J com seção transversal trapezoidal variável<br>• olhal superior circular ou haste roscada de içamento<br>• trava de segurança basculante com mola na boca do gancho | *Nenhuma característica gerada no repositório* | *Implementação procedural completa do zero (sem fonte direta)* |
| **ponteiro ou mostrador** | `criar` | • haste afilada indicadora com cubo de balanceamento de massa<br>• escala graduada plana ou circular com marcações regulares e numeração<br>• furo central de encaixe por pressão no eixo do instrumento | *Nenhuma característica gerada no repositório* | *Implementação procedural completa do zero (sem fonte direta)* |
| **rótula ou junta esférica** | `converter` | • pino com cabeça esférica retificada<br>• alojamento esférico côncavo bipartido com folga calibrada<br>• coifa de vedação elastomérica de retenção de graxa | *Nenhuma característica gerada no repositório* | *Implementação procedural completa (via conversão de fonte técnica)* |
| **elemento filtrante** | `criar` | • meio filtrante pregueado/plissado em acordeão ou malha sinterizada<br>• tubo central perfurado de sustentação estrutural<br>• tampas terminais coladas com anéis de vedação | *Nenhuma característica gerada no repositório* | *Implementação procedural completa do zero (sem fonte direta)* |
| **pistão ou êmbolo** | `criar` | • cabeça cilíndrica com canais perimetrais para anéis de segmento<br>• saia cilíndrica de orientação com alívios laterais<br>• olhais internos usinados para pino de articulação | *Nenhuma característica gerada no repositório* | *Implementação procedural completa do zero (sem fonte direta)* |
| **asa ou aerofólio** | `converter` | • perfil aerodinâmico normatizado (NACA) com linha de curvatura e espessura<br>• bordo de ataque arredondado e bordo de fuga afilado<br>• variação de corda, enflechamento e diedro ao longo da envergadura | *Nenhuma característica gerada no repositório* | *Implementação procedural completa (via conversão de fonte técnica)* |
| **came ou excêntrico** | `converter` | • perfil perimetral não circular de raio continuamente variável<br>• lobo harmônico/cicloidal com rampas de subida, repouso e descida<br>• furo central de eixo com rasgo de chaveta | *Nenhuma característica gerada no repositório* | *Implementação procedural completa (via conversão de fonte técnica)* |
| **degrau ou palete articulado** | `criar` | • piso ranhurado antiderrapante com dentes de engrene no pente<br>• estrutura suporte de treliça fundida/soldada<br>• eixos de montagem lateral com rodízios de guiamento | *Nenhuma característica gerada no repositório* | *Implementação procedural completa do zero (sem fonte direta)* |
| **esteira de tração ou lagarta** | `criar` | • sapatas/elos modulares articulados com garras de penetração no solo<br>• pinos e buchas de união com rotação contínua<br>• guia central e dentes internos de engrenamento com a roda motriz | *Nenhuma característica gerada no repositório* | *Implementação procedural completa do zero (sem fonte direta)* |
| **esteira porta-cabos** | `criar` | • elos ocos articulados em cadeia com batentes angulares de raio de curvatura<br>• travessas móveis de abertura e separadores internos de cabos<br>• terminais extremos de fixação estática e móvel | *Nenhuma característica gerada no repositório* | *Implementação procedural completa do zero (sem fonte direta)* |
| **rosca helicoidal de transporte** | `converter` | • helicoide contínuo de passo longo e perfil laminar soldado<br>• tubo ou eixo central maciço de sustentação e transmissão de torque<br>• munhões de extremidade usinados para mancais de rolamento | *Nenhuma característica gerada no repositório* | *Implementação procedural completa (via conversão de fonte técnica)* |
| **zíper** | `criar` | • fita têxtil lateral de suporte com cordão de reforço<br>• dentes engrenáveis estampados/moldados em passo constante<br>• cursor móvel de engate e desengate com puxador | *Nenhuma característica gerada no repositório* | *Implementação procedural completa do zero (sem fonte direta)* |
| **vela náutica** | `criar` | • painel triangular ou quadrangular com corte aerodinâmico e camber<br>• bolsas para talas de reforço (battens) longitudinais<br>• punhos de amarra reforçados nos três vértices com ilhoses | *Nenhuma característica gerada no repositório* | *Implementação procedural completa do zero (sem fonte direta)* |
| **remo** | `criar` | • haste cilíndrica de alavanca com empunhadura anatômica<br>• pá/colher perfilada com curvatura hidrodinâmica e nervura dorsal<br>• colar de fixação e apoio para a forqueta do barco | *Nenhuma característica gerada no repositório* | *Implementação procedural completa do zero (sem fonte direta)* |

---

## Distribuição de Objetos por Família (28 Famílias)

| # | Família | Total de Objetos | Elementos Mecânicos Mais Frequentes |
|---|---|---|---|
| 01 | **Armas e defesa, históricas e de jogo** | 8 | fixador (7), articulação (6), chassi ou quadro (5), eixo (5) |
| 02 | **Climatização e ventilação** | 9 | grade ou furação em padrão (8), chapa dobrada (6), hélice ou rotor (6), tubo (6) |
| 03 | **Construção e estruturas** | 16 | perfil estrutural (15), chassi ou quadro (11), grade ou furação em padrão (10), articulação (6) |
| 04 | **Elementos de máquina e fixação** | 27 | fixador (12), vedação (6), articulação (5), rolamento ou mancal (5) |
| 05 | **Eletrodomésticos** | 13 | botão ou manopla (12), grade ou furação em padrão (11), articulação (10), superfície de pega (10) |
| 06 | **Eletrônicos e gabinetes** | 15 | botão ou manopla (13), conexão (13), placa de circuito ou componente elétrico (13), grade ou furação em padrão (12) |
| 07 | **Embalagens e recipientes** | 12 | casca (10), tampa (7), chapa dobrada (6), vedação (6) |
| 08 | **Embarcações** | 11 | casca (11), chassi ou quadro (11), perfil estrutural (11), tubo (11) |
| 09 | **Energia** | 9 | conexão (8), vedação (8), fixador (8), mangueira ou cabo (7) |
| 10 | **Equipamentos médicos e de laboratório** | 12 | botão ou manopla (11), articulação (9), chassi ou quadro (9), tubo (8) |
| 11 | **Esporte e lazer** | 12 | chassi ou quadro (11), fixador (11), perfil estrutural (9), articulação (7) |
| 12 | **Ferramentas** | 16 | superfície de pega (15), fixador (13), botão ou manopla (11), eixo (8) |
| 13 | **Instalações** | 16 | conexão (16), fixador (12), vedação (11), tampa (10) |
| 14 | **Instrumentos musicais** | 12 | botão ou manopla (11), casca (8), mola (8), eixo (7) |
| 15 | **Mobiliário urbano e infraestrutura** | 11 | perfil estrutural (8), tampa (6), vidro ou painel (6), chassi ou quadro (5) |
| 16 | **Moda e acessórios** | 8 | tecido ou estofado (7), trava ou fecho (7), casca (5), articulação (3) |
| 17 | **Motores, transmissões e mecanismos** | 18 | fixador (18), eixo (14), rolamento ou mancal (14), vedação (12) |
| 18 | **Máquinas industriais** | 16 | botão ou manopla (16), chassi ou quadro (16), conexão (16), mangueira ou cabo (16) |
| 19 | **Máquinas pesadas, de construção e agrícolas** | 16 | articulação (16), chapa dobrada (16), chassi ou quadro (16), conexão (16) |
| 20 | **Máquinas têxteis e de embalagem** | 7 | botão ou manopla (7), placa de circuito ou componente elétrico (7), casca (6), chassi ou quadro (6) |
| 21 | **Móveis** | 17 | chassi ou quadro (16), perfil estrutural (10), trilho ou guia (8), vidro ou painel (8) |
| 22 | **Peças funcionais para impressão 3D** | 9 | grade ou furação em padrão (6), trava ou fecho (5), casca (4), conexão (3) |
| 23 | **Relógios e mecanismos de precisão** | 9 | casca (7), eixo (7), engrenagem (7), mola (7) |
| 24 | **Robôs** | 13 | chassi ou quadro (13), fixador (13), conexão (11), mangueira ou cabo (11) |
| 25 | **Transporte vertical** | 6 | chassi ou quadro (6), eixo (6), freio (6), grade ou furação em padrão (6) |
| 26 | **Utensílios e objetos do dia a dia** | 13 | casca (7), superfície de pega (7), botão ou manopla (6), articulação (6) |
| 27 | **Veículos aéreos e espaciais** | 14 | chassi ou quadro (14), conexão (14), mangueira ou cabo (14), perfil estrutural (14) |
| 28 | **Veículos terrestres** | 19 | chassi ou quadro (19), eixo (19), roda (19), rolamento ou mancal (19) |

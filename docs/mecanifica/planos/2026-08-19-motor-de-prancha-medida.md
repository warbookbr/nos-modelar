# Motor de prancha com filete e medida

**Estado:** concluído

**Responsável:** Claude

## Objetivo

Levar o motor de prancha ortográfica de "desenhista que arredonda tudo" para
"desenhista que mede o que traça". Escopo fechado em ferramenta de desenho 2D:
nada de núcleo procedural, malha, subdivisão ou catálogo.

As demais frentes ficam congeladas enquanto este plano estiver ativo. O plano do
chassi realista segue em `rascunho` e não é tocado.

## Problema

O estudo do fastback ficou a cerca de 30% da referência. A análise apontou uma
causa mecânica única, com três braços:

- **o interpolador arredonda tudo.** `suave()` é Catmull-Rom por pontos.
  Carroceria é o contrário: trechos retos ou quase retos ligados por raios
  curtos. Por isso teto vira cúpula, ombro vira bolha e aresta de tampa some;
- **as coordenadas são milímetros chutados.** A referência é lida em proporção
  — "base do para-brisa a 0,45 do entre-eixos" — e a tradução mental para
  milímetro introduz erro sistemático;
- **nada é medido.** O gerador não emite um único número sobre a própria saída.
  Sem número, a correção é impressão: desenho, olho, acho ruim, mexo.

## Invariantes

- o motor não conhece vocabulário automotivo: conhece vista, camada, cota,
  âncora e métrica; `paralama` vive na especificação;
- saída determinística, byte a byte, sem timestamp e sem dependência nova;
- a prancha do P0 continua sendo produzida, e sua geometria só muda onde o
  filete corrigir um arredondamento que era defeito;
- nenhuma alteração em núcleo, receita, montagem, catálogo ou bancada;
- métrica emitida é derivada da saída, nunca declarada à mão.

## Rodadas

### R1 — filete

Novo tipo de traçado: polilinha com raio de filete por vértice. Vértice com
raio zero é canto vivo; raio positivo vira arco tangente aos dois segmentos.
Substitui `suave` como primitiva principal de contorno; `suave` permanece para
o que é genuinamente spline.

Aceite: uma rampa reta com um único filete no topo produz rampa reta, e não
cúpula, medida pelo sinal da curvatura ao longo do traçado.

### R2 — âncoras proporcionais

A especificação passa a aceitar fração de entre-eixos, de altura e de meia
largura, resolvidas para milímetro pelo motor. Milímetro absoluto continua
válido onde a medida é rígida.

Aceite: mover o entre-eixos reposiciona os pontos ancorados sem reescrever a
especificação.

### R3 — métrica

O motor emite, por vista, um relatório JSON derivado do traçado: extremos,
razões de proporção, ângulo de tangente em pontos declarados, inventário de
inversões de curvatura e verificação de fechamento de contorno.

Aceite: o relatório detecta, sozinho, os defeitos que eu só peguei olhando —
linha passando do contorno, vista não fechada nas pontas e cúpula onde a
especificação pediu rampa.

### R4 — skill

Skill que carrega o método: calibrar antes de traçar, ordem obrigatória das
camadas, medir a cada rodada e checklist de defeitos recorrentes.

### R5 — prova

Carroceria nova, do zero, especificada com âncoras, traçada com filete e
julgada pelo relatório antes de eu olhar. Registro do que a métrica pegou antes
do olho.

## Gate para concluir

- filete, âncora e métrica implementados e cobertos por teste;
- prancha do P0 regenerada, com diferença explicada;
- skill escrita e exercitada na prova;
- prova executada com relatório antes do julgamento visual;
- gates do INDEX verdes.

## Fora deste plano

Leitura de imagem de referência, calibração pixel→milímetro, sobreposição com
referência externa, geometria 3D, malha e qualquer coisa do plano do chassi.
Sem o arquivo de referência em disco, a análise quantitativa contra imagem
externa continua bloqueada e não é prometida aqui.

## Registro

- **V1 — 2026-08-19:** plano aberto. Causa raiz vinda da análise do estudo do
  fastback: interpolador que arredonda, coordenada chutada e ausência de medida.
- **V2 — 2026-08-19:** R1 a R5 executadas.
  **R1** filete entregue e provado por número: a mesma rampa dá concentração de
  giro 0,065 com filete contra 0,477 com spline.
  **R2** âncoras proporcionais entregues.
  **R3** relatório entregue. A primeira métrica proposta, retidão, **não separava**
  rampa de cúpula — uma spline por três pontos também é quase toda reta. O
  discriminador correto é a concentração do giro. A medida por vértice também
  estava errada: media densidade de amostragem, e um círculo perfeito aparecia
  como giro concentrado; corrigido para janela de comprimento de arco.
  **R4** skill `desenhar-prancha` escrita.
  **R5** cupê de cunha desenhado do zero e julgado pelo relatório antes de
  qualquer render.
  O relatório pegou, sozinho e antes do olho: vidro lateral acima da linha do
  para-brisa, cortes de porta abaixo da soleira, tomada lateral dentro da
  abertura da roda, vidro traseiro fora do contorno da vista, e — o mais grave —
  **o arco da roda dianteira furando o capô**, topo do arco em 705 mm contra
  perfil em 642 mm. Nenhum deles eu teria visto sem medir.
  Aplicado também à prancha do P0: a silhueta superior tinha **10 inversões de
  curvatura**, ondulação que eu nunca havia notado. Refeita com filete pelos
  landmarks: concentração 0,543 → 0,216, inversões 10 → 4, pior desvio de
  landmark 3,8 mm dentro da tolerância de 6 mm.

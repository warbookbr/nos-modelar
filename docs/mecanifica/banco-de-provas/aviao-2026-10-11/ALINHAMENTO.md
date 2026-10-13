# Avião de pequeno porte: alinhamento

**Estado:** escala confirmada pela pessoa em 2026-10-11. As partes, o que se
move, o realismo e o que reprova são a recomendação de Claude, mostrada à pessoa
na mesma data, e valem até ela corrigir; o contorno das vistas não fixa forma, e
a correção cabe até o começo do esboço. Fatia 1 do plano [o que o avião
pede](../../planos/2026-10-11-o-que-o-aviao-pede.md).

## O objeto

Um monomotor turboélice de asa baixa, com cabine para poucos passageiros, porta
traseira grande, cauda convencional e trem triciclo recolhível. As referências em
[`referencias/`](referencias/) são as quatro vistas de um desenho sem marca nem
nome de fabricante, separado pela IA em `topo.png`, `lateral.png`, `frontal.png`
e `traseira.png`, com os rótulos de texto apagados.

## A escala

A envergadura é 12.800 mm, de ponta a ponta da asa na vista de topo, valor típico
de aviões desse porte, aceito pela pessoa. Todas as outras medidas saem dela pela
proporção das imagens: na vista de topo a envergadura ocupa 439 px e o
comprimento 359 px, o que dá cerca de 10.470 mm de comprimento; na lateral, com
esse comprimento, a altura do chão ao topo da deriva dá cerca de 4.200 mm. A
prancha confere essas contas e diz de qual vista veio cada medida.

## As partes

Da frente para trás: o cone da hélice e a hélice de cinco pás (cinco na vista
frontal); o capô do motor, com a entrada de ar sob o cone e os dois escapes
laterais; a fuselagem, lisa, afinando até a cauda, com a barbatana ventral sob a
cauda; o para-brisa e as janelas laterais; a porta traseira, à esquerda; a asa,
em duas metades com a ponta levantada, com aileron e flap em cada metade; o
estabilizador horizontal com o profundor; a deriva com o leme; o trem do nariz; e
os dois trens principais, que recolhem para dentro da asa. Cada lado repetido
(metades da asa, ailerons, flaps, trens principais) é dito uma vez, com o número
de instâncias.

Fora do modelo: o interior da cabine, rebites, antenas, luzes e o chão desenhado
nas vistas.

## O que se move

A hélice gira em torno do eixo do motor. Aileron, flap, profundor e leme giram
em torno da própria dobradiça, presa na asa ou na empenagem. O trem do nariz e
os principais recolhem sem atravessar asa, fuselagem nem um ao outro em nenhuma
posição do curso.

## O grau de realismo

Detalhado, porque o plano existe para forçar o Mecanifica num objeto difícil:
asa, empenagem e pás com perfil aerodinâmico, fuselagem por seções com transição
lisa, superfícies de comando separadas da asa por fresta e eixo, e trem com
perna, amortecedor e roda.

## O que reprova

1. Asa, estabilizador, deriva ou pá com seção de placa, sem perfil aerodinâmico.
2. Fuselagem ou capô facetados, com degrau visível entre seções.
3. Pá da hélice reta, sem torção da raiz à ponta.
4. Aileron, flap, profundor ou leme sem eixo de giro que o prenda à superfície
   fixa.
5. Trem que atravessa asa ou fuselagem em qualquer posição do curso de
   recolhimento.
6. Qualquer parte solta, sem ligação com a fuselagem por outra parte.
7. Medida principal (envergadura, comprimento, altura) a mais de 3% da prancha.

## O contorno das vistas

A frontal fechou com nota 9 em 2026-10-11; a lateral e o topo pararam em 8 depois
de três rodadas e foram aceitos pela pessoa em 2026-10-12, com as pendências no
`aceite.json` de cada série. O roteiro do crítico de cada vista:
[lateral](referencias/lateral.pacote/roteiro.md),
[topo](referencias/topo.pacote/roteiro.md) e
[frontal](referencias/frontal.pacote/roteiro.md).

## As pranchas

As pranchas de lateral (nota 7) e de topo (nota 6) pararam depois de três
rodadas e foram aceitas pela pessoa em 2026-10-12, com as medidas certas e as
pendências de desenho no `aceite.json` de cada série (atritos 6 a 8). O
comprimento da fuselagem vale o da lateral, 8.028 mm, por decisão da pessoa. O
roteiro do crítico de cada uma:
[lateral](referencias/lateral.prancha.pacote/roteiro.md) e
[topo](referencias/topo.prancha.pacote/roteiro.md).

## O esboço da primeira rodada

O esboço detalhado ([`esboco/aviao.esboco.json`](esboco/aviao.esboco.json)), feito
só com o que o Mecanifica tinha, fechou com o Marco de 100% em nota 8 e foi
aprovado pela pessoa em 2026-10-12, com duas pendências que contrariam o
critério 5: o trem do nariz atravessa o capô depois de 85 graus do curso, e o
principal recolhe numa carenagem sob a asa, e não dentro dela, porque o esboço
não recorta uma forma com outra. Os atritos do caminho estão em
[`esboco/ATRITOS.md`](esboco/ATRITOS.md), e a comparação com a referência em
`esboco/comparacao-final.png`.

O último brief do crítico de cada unidade e de cada Marco: [fuselagem](esboco/aviao-critico-fuselagem/brief.md), [motor](esboco/aviao-critico-motor/brief.md), [helice](esboco/aviao-critico-helice/brief.md), [asas](esboco/aviao-critico-asas/brief.md), [empenagem-horizontal](esboco/aviao-critico-empenagem-horizontal/brief.md), [trem-do-nariz](esboco/aviao-critico-trem-do-nariz/brief.md), [trens-principais](esboco/aviao-critico-trens-principais/brief.md), [marco-25](esboco/aviao-critico-marco-25/brief.md), [marco-50](esboco/aviao-critico-marco-50/brief.md), [marco-75](esboco/aviao-critico-marco-75/brief.md), [marco-100](esboco/aviao-critico-marco-100/brief.md).

A classificação dos atritos da fatia 4 está em [`CLASSIFICACAO.md`](CLASSIFICACAO.md).

## O esboço da segunda rodada

A segunda rodada, com as ferramentas da fatia 5, está em
[`esboco-r2/`](esboco-r2/aviao.esboco.json), com os atritos em
[`esboco-r2/ATRITOS.md`](esboco-r2/ATRITOS.md). O brief do crítico de cada unidade
e de cada Marco: [fuselagem](esboco-r2/aviao-critico-fuselagem/brief.md),
[marco-50](esboco-r2/aviao-critico-marco-50/brief.md),
[asas](esboco-r2/aviao-critico-asas/brief.md),
[empenagem-horizontal](esboco-r2/aviao-critico-empenagem-horizontal/brief.md),
[marco-75](esboco-r2/aviao-critico-marco-75/brief.md),
[empenagem-vertical](esboco-r2/aviao-critico-empenagem-vertical/brief.md),
[trem-do-nariz](esboco-r2/aviao-critico-trem-do-nariz/brief.md),
[trens-principais](esboco-r2/aviao-critico-trens-principais/brief.md),
[marco-100](esboco-r2/aviao-critico-marco-100/brief.md).

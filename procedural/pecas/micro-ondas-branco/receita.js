/* micro-ondas-branco — micro-ondas de bancada: corpo de metal claro sobre uma base escura, porta com janela à esquerda, painel
 * detalhado em coluna alta à direita (visor com dígitos de sete segmentos, três faixas de função e teclado de 15 teclas) e oito
 * grades de ventilação, quatro em cada lateral.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 e a frente do micro-ondas em +z; o fundo fica em -z e x cresce para a direita
 * de quem olha o micro-ondas de frente. A TABELA, em milímetro (e em razão da altura do painel, onde a medida vem de painel.png), é
 * a única fonte das medidas; `derivar` transforma a tabela em caixas e `gerarPassos` escreve, por parte, a forma, a `parte` e o
 * `material` que a parte usa. Nenhuma posição é digitada nos passos.
 *
 * Forma e medidas de partida: a base é a receita original (tools/mecanifica/fixtures/receita-externa-eletro/microondas_suspenso_branco.receita.json)
 * convertida em passos, com o corpo de 638 por 470 por 435 mm, a base de 598 por 21 por 395 mm e as oito grades nas laterais. O eixo de
 * simetria das grades cai em x 0 e o centro do corpo cai em x 0 e z 0. A pessoa aprovou essa forma e pediu quatro mudanças.
 *
 * Mudanças desta versão, cada uma com o motivo:
 *
 * 1. Assentado no chão. A base começa em y 0 (era y 814, suspensa) e o corpo em y 21. Só o eixo y deslocou 814 mm; as grades passaram
 *    de y 970 a 1035 para y 156 a 221. Motivo: pedido da pessoa, como o micro-ondas-cromado. Caixa total igual à anterior:
 *    x ±325, z -217,5 a 233,5 e altura de 491 mm, agora de y 0 a 491 (antes y 814 a 1305).
 *
 * 2. Porta maior. Antes -> depois (milímetro):
 *      porta     385 por 315 por 12   ->  428,5 por 360 por 12   (+11,3% em largura, +14,3% em altura)
 *      janela    325 por 230 por 4    ->  362 por 263 por 4      (+11,4% e +14,3%, a proporção da porta)
 *      folga da janela na porta: 30 nos lados e 45 embaixo e 40 em cima  ->  33,25 nos lados e 52 embaixo e 45 em cima
 *      porta x   -266 a 119           ->  -299 a 129,5
 *      porta y   900 a 1215 (65 acima da base do corpo e 90 abaixo do topo)  ->  76 a 436 (55 acima e 55 abaixo, centrada em y)
 *    A porta e o painel têm a frente no mesmo plano z 229,5, com a face de trás na frente do corpo (z 217,5). A margem é de 20 mm:
 *    do lado esquerdo do corpo até a porta, da porta até o painel e do painel até o lado direito do corpo; o painel tem 20 mm acima
 *    e abaixo também. A porta cresce no máximo 15% em altura (pedido), então a margem de cima e a de baixo dela são de 55 mm, e não
 *    de 20: a margem uniforme vale nos três vãos laterais e na altura do painel.
 *
 * 5. Moldura da porta e puxador vertical (segundo pedido). A moldura é a borda da porta em volta da janela. Antes (porta 428,5 por
 *    360): esquerda 33,25, direita 33,25, embaixo 52 e em cima 45, com janela de 362 por 263 mm. Agora: esquerda 18, cima 18,
 *    baixo 18 e direita 30, com janela de 380,5 por 324 mm (x -281 a 99,5, y 94 a 418). A faixa direita (30 mm) leva o
 *    `puxadorDaPorta`, barra vertical de 14 mm de largura e 324 mm de altura (a da janela, na mesma posição em y), extrusão em z de
 *    retângulo de cantos de 5 mm, de metal escovado, saindo 7 mm da frente da porta, em x 107,5 a 121,5 (folga de 8 mm até a
 *    janela e 8 mm até a borda da porta). A porta mantém 428,5 por 360 mm. O puxador é o ponto mais à frente: a caixa total passa
 *    a z -217,5 a 236,5 (de 451 para 454 mm de profundidade).
 *
 * 6. Textura lisa. O corpo, a porta e as grades passam de `metal` (e a porta de bege) para `liso` branco com desgaste de 0,02 a 0,03,
 *    porque o metal gerava listras de madeira ou escovado num aparelho pintado. A base e o painel mantêm a cor e baixam o desgaste
 *    para 0,03 e 0,05. Só o puxador fica `metal`, escovado.
 *
 * 7. Caixa e porta mais largas, puxador mais largo (terceiro pedido). Antes -> depois (milímetro):
 *      corpo            638 -> 700 de largura (altura 470 e profundidade 435 iguais; x ±319 -> ±350)
 *      base escura      598 -> 660 (mantém 20 mm de recuo de cada lado do corpo)
 *      porta            428,5 -> 490,5 por 360 (x -299 a 129,5 -> -330 a 160,5; margem de 20 mm até o lado esquerdo e até o painel)
 *      janela           380,5 por 324 -> 431,5 por 324 (x -281 a 99,5 -> -312 a 119,5; moldura de 18 mm à esquerda, em cima e embaixo)
 *      moldura direita  30 -> 41 mm (8 mm de folga, 25 do puxador e 8 de folga)
 *      puxador          14 por 324 por 7 -> 25 por 324 por 7 (x 107,5 a 121,5 -> 127,5 a 152,5), cantos de 5 mm
 *      painel           149,5 por 430 por 12 igual, agora em x 180,5 a 330 (20 mm do lado direito do corpo)
 *      grades           mesmas medidas, agora de x ±350 a ±356 (encostadas nas laterais novas, que `derivar` lê de corpo_largura)
 *      caixa total      x ±325 -> ±356 (650 -> 712 mm); y 0 a 491 e z -217,5 a 236,5 iguais
 *    O parâmetro ventilacao_x0 saiu da tabela: a grade acompanha a lateral do corpo. A largura extra de 62 mm foi toda para a porta.
 *
 * 3. Painel em coluna. Antes: 150 por 410 por 12 mm, x 154 a 304, y 865 a 1275, seis teclas de 90 por 22 mm e visor de 110 por 85.
 *    Agora: 149,5 por 430 por 12 mm, x 149,5 a 299, y 41 a 471, 20 mm mais alto e 0,5 mm mais estreito. A largura vem da razão
 *    largura/altura de painel.png (177 por 509 px, 0,3477): 430 mm de altura dão 149,5 mm de largura. As seis teclas e o visor antigos
 *    saem, e entram as partes abaixo.
 *
 *    Razões medidas em painel.png (509 px de altura e 177 de largura; a escala é de 0,845 mm por px, igual em x e em y). Cada razão é
 *    px / 509. O eixo do conteúdo fica em x = 90,5 px (o conteúdo da imagem está 2 px à direita do centro da imagem; a peça o centra
 *    no painel).
 *      painel (largura/altura)           177/509 = 0,3477
 *      moldura do visor (não modelada)   x 24 a 157, y 26 a 102
 *      visor (retângulo escuro)          x 43 a 138 (95 px, 0,1866), y 47 a 79 (32 px, 0,0629); topo a 0,0923
 *      dígitos                           y 49 a 77 (0,0550 de altura; topo a 0,0963), 19 px de largura (0,0373), traço de 4 px (0,0079);
 *                                        bordas da direita em x 64, 86, 114 e 136 px (-0,0521, -0,0088, 0,0462 e 0,0894 do eixo)
 *      faixa dia a dia                   x 24 a 157 (133 px, 0,2613), y 122 a 166 (44 px, 0,0864); topo a 0,2397
 *      faixa kids                        y 181 a 225; topo a 0,3556
 *      faixa descongelar                 y 241 a 285; topo a 0,4735
 *      botões das faixas                 três por faixa, passo de 44 px (0,0864), 36 por 28 px (0,0707 por 0,0550), centrados na faixa
 *      teclas                            41 por 35 px na imagem, passo de 44 px em x e de 38 px em y; as cinco linhas têm topo em
 *                                        298, 336, 374, 412 e 450 px (a primeira a 0,5855 do topo)
 *    O passo da grade do teclado é igual em x e em y, por pedido, e a tecla é quadrada. A peça usa nos dois eixos o passo medido em y
 *    (38 px, 0,0747 da altura, 32,1 mm) e a tecla de 34 px (0,0668, 28,7 mm): as cinco linhas caem onde estão na imagem, e as três
 *    colunas ficam 14% mais juntas que na imagem (110 px de largura contra 128).
 *
 *    Partes novas do painel: a placa (cinza médio, cubo com oito arestas arredondadas); o visor (retângulo escuro rebaixado 3 mm no
 *    topo, aberto na placa por `subtrair`); `digitosDoVisor` (21 caixas finas verdes #28c83c: 19 segmentos de "1", "2", "0" e "0" e
 *    os dois pontos, agrupadas num alias por `unir`, que a parte nomeia); três molduras rasas de 1 mm (molduraDiaADia, molduraKids,
 *    molduraDescongelar) e nove botões de 2 mm sobre elas (arroz, bebidas, manterAquecido; pipoca, brigadeiro, boloDeCaneca; feijao,
 *    carnes, aves); quinze teclas de 3 mm na placa (tecla1 a tecla9, teclaPotencia, tecla0, teclaTiraOdor e a linha de baixo, com
 *    teclaCancelar vermelha, teclaRelogio cinza e teclaIniciar azul). Molduras, botões e teclas são extrusões em z de retângulo de
 *    cantos arredondados, listas na TABELA com laços em `derivar`.
 *
 *    TEXTO E ÍCONES QUE A IMAGEM ESCREVE E QUE NÃO ENTRAM, porque o núcleo não modela texto: "DIA A DIA", "KIDS", "DESCONGELAR"; os
 *    nomes dos botões (Arroz, Bebidas, Manter Aquecido, Pipoca, Brigadeiro, Bolo de Caneca, Feijão, Carnes, Aves); os numerais 1 a 9 e
 *    0; "Potência", "Tira Odor", "Cancela Pausa", "Relógio Tempo" e "Iniciar +30 Seg."; os ícones (tigela, xícara, travessa, pipoca,
 *    brigadeiro, caneca, feijão, carne, ave e relógio) e os traços que separam os botões. O PAINEL É, POR ISSO, PEÇA A ALTERAR quando
 *    o módulo de textura ganhar escrita (linha "Texto e ícones sobre o objeto" do backlog).
 *
 * 4. Arestas arredondadas em vez de chanfro simples. O corpo (chanfro de 25 mm), a base (4 mm), a porta (2 mm) e a placa do painel
 *    (2 mm) passam de `chamferBox` para `cubo` com `arredondarAresta` escolhida por `sel.onde`, porque o chanfro já ocupa a aresta que
 *    o arredondamento troca. Corpo: 9 mm de raio e 4 painéis nas doze arestas. Base: 6 mm e 4 painéis nas doze (com 4 mm as 16 faixas das arestas longas da base saíam em lascas, área sobre maior aresta ao quadrado abaixo de 0,003, e com 3 painéis o alias da base não resolveu e a parte ficou sem nome). Porta e placa: 5 mm e
 *    4 painéis nas oito arestas de frente e de lado; as quatro de trás ficam vivas, porque encostam no corpo. Janela e grades mantêm o
 *    chanfro de 1 mm; molduras, botões e teclas são extrusões de cantos arredondados. Saem da tabela corpo_chanfro, base_chanfro,
 *    porta_chanfro, painel_chanfro e visor_chanfro.
 *
 * Mudanças anteriores mantidas: os materiais vêm da receita original (cor RGB em hexadecimal; vidro e plástico são `liso`); o campo
 * `ferrugem` da original não tem lugar no formato de MATERIAIS. As grades são simétricas em torno de x 0 e encostam por fora nas laterais do corpo (hoje de ±350 a ±356).
 *
 * Caixa total: x ±356, y 0 a 491, z -217,5 a 236,5 (712 por 491 por 454 mm). O ponto mais à frente é o puxador da porta (z 236,5).
 */

export const TABELA = {
  corpo_largura: 700,
  corpo_altura: 470,
  corpo_profundidade: 435,
  corpo_raio: 9,
  corpo_paineis: 4,

  base_largura: 660,
  base_altura: 21,
  base_profundidade: 395,
  base_raio: 6,
  base_paineis: 4,

  margem: 20,

  porta_altura: 360,
  porta_espessura: 12,
  porta_raio: 5,
  porta_paineis: 4,

  moldura_porta_esq: 18,
  moldura_porta_cima: 18,
  moldura_porta_baixo: 18,
  moldura_porta_dir: 41,

  janela_espessura: 4,
  janela_chanfro: 1,

  puxador_largura: 25,
  puxador_saliencia: 7,
  puxador_raio: 5,

  painel_altura: 430,
  painel_razao: 0.3477,
  painel_raio: 5,
  painel_paineis: 4,

  rebaixo_profundidade: 3,
  visor_largura_f: 0.1866,
  visor_altura_f: 0.0629,
  visor_topo_f: 0.0923,
  visor_espessura: 1.5,

  digito_altura_f: 0.055,
  digito_largura_f: 0.0373,
  digito_traco_f: 0.0079,
  digito_topo_f: 0.0963,
  digito_folga: 0.4,
  digito_espessura: 1,
  digitos: ['1', '2', '0', '0'],
  digitos_x_dir_f: [-0.0521, -0.0088, 0.0462, 0.0894],
  dois_pontos_x_f: -0.001,

  moldura_largura_f: 0.2613,
  moldura_altura_f: 0.0864,
  moldura_espessura: 1,
  moldura_raio: 3.5,
  molduras_nomes: ['molduraDiaADia', 'molduraKids', 'molduraDescongelar'],
  molduras_topo_f: [0.2397, 0.3556, 0.4735],

  botao_largura_f: 0.0707,
  botao_altura_f: 0.055,
  botao_passo_f: 0.0864,
  botao_espessura: 2,
  botao_raio: 3,
  botoes_nomes: ['botaoArroz', 'botaoBebidas', 'botaoManterAquecido',
    'botaoPipoca', 'botaoBrigadeiro', 'botaoBoloDeCaneca',
    'botaoFeijao', 'botaoCarnes', 'botaoAves'],

  tecla_lado_f: 0.0668,
  tecla_passo_f: 0.0747,
  tecla_topo_f: 0.5855,
  tecla_espessura: 3,
  tecla_raio: 3.5,
  teclas_linhas: [
    ['tecla1', 'tecla2', 'tecla3'],
    ['tecla4', 'tecla5', 'tecla6'],
    ['tecla7', 'tecla8', 'tecla9'],
    ['teclaPotencia', 'tecla0', 'teclaTiraOdor'],
    ['teclaCancelar', 'teclaRelogio', 'teclaIniciar'],
  ],
  teclas_ultima_linha_material: ['teclaVermelha', 'teclaCinza', 'teclaAzul'],

  ventilacao_largura: 6,
  ventilacao_altura: 11,
  ventilacao_z0: -134,
  ventilacao_profundidade: 90,
  ventilacao_chanfro: 1,
  ventilacao_y0: [156, 174, 192, 210],
};

const m = (mm) => mm / 1000;
const fmt = (v) => String(Math.round(v * 10) / 10).replace('.', ',');

const CIMA = [0, 1, 0];
const BAIXO = [0, -1, 0];
const FRENTE = [0, 0, 1];
const TRAS = [0, 0, -1];

/* As doze arestas do corpo e da base, e as oito de frente e de lado da porta e da placa. Cada uma é [normal da face vizinha, eixo e
 * lado do extremo]; `sel.onde` a escolhe sem citar id. */
const ARESTAS_DA_CAIXA = [
  ...[CIMA, BAIXO].flatMap((n) => [['x', 'max'], ['x', 'min'], ['z', 'max'], ['z', 'min']].map(([e, l]) => [n, e, l])),
  ...[FRENTE, TRAS].flatMap((n) => [['x', 'max'], ['x', 'min']].map(([e, l]) => [n, e, l])),
];
const ARESTAS_DA_PLACA = [
  [CIMA, 'x', 'max'], [CIMA, 'x', 'min'], [BAIXO, 'x', 'max'], [BAIXO, 'x', 'min'],
  [CIMA, 'z', 'max'], [BAIXO, 'z', 'max'], [FRENTE, 'x', 'max'], [FRENTE, 'x', 'min'],
];

/* Retângulo de cantos arredondados em (x, y) relativos ao centro, em milímetro, com `seg` segmentos por canto. */
export function retanguloArredondado(largura, altura, raio, seg) {
  const pts = [];
  const cx = largura / 2 - raio;
  const cy = altura / 2 - raio;
  for (const [sx, sy, a0] of [[1, 1, 0], [-1, 1, 90], [-1, -1, 180], [1, -1, 270]]) {
    for (let k = 0; k <= seg; k += 1) {
      const a = ((a0 + (90 * k) / seg) * Math.PI) / 180;
      pts.push([sx * cx + Math.cos(a) * raio, sy * cy + Math.sin(a) * raio]);
    }
  }
  return pts;
}

const SEGMENTOS_DO_DIGITO = { 0: 'abcdef', 1: 'bc', 2: 'abdeg' };
const SEGMENTOS_POR_CANTO = 3;

/* Caixas em milímetro: { nome, forma, x0, x1, y0, y1, z0, z1, material, ... }. `forma` é cubo, chamferBox, extrusaoZ ou grupo;
 * `arestas` lista as arestas que o `arredondarAresta` arredonda e `rebaixo` o rebaixo que o `subtrair` abre na placa. A frente do
 * corpo fica em z = metade da profundidade, e a porta e o painel começam nela; molduras, botões e teclas assentam na frente deles. */
export function derivar(T) {
  const caixas = [];
  const meiaL = T.corpo_largura / 2;
  const corpoFrente = T.corpo_profundidade / 2;
  const zFrente = corpoFrente + T.porta_espessura;
  const yCorpo0 = T.base_altura;
  const yCorpo1 = yCorpo0 + T.corpo_altura;
  const caixa = (nome, forma, x0, x1, y0, y1, z0, z1, material, apoio, extra = {}) => caixas.push({ nome, forma, x0, x1, y0, y1, z0, z1, material, apoio, ...extra });

  /* corpo: o volume de metal, centrado em x e z, do topo da base até a altura total, com as doze arestas arredondadas */
  caixa('corpo', 'cubo', -meiaL, meiaL, yCorpo0, yCorpo1, -corpoFrente, corpoFrente, 'metal',
    'assentado na face de cima da base escura, centrado em x e z',
    { arestas: ARESTAS_DA_CAIXA, raio: T.corpo_raio, paineis: T.corpo_paineis });

  /* base escura: faixa sob o corpo, do chão até a face de baixo do corpo */
  caixa('baseEscura', 'cubo', -T.base_largura / 2, T.base_largura / 2, 0, T.base_altura, -T.base_profundidade / 2, T.base_profundidade / 2, 'base',
    'no chão, com a face de cima encostada na face de baixo do corpo',
    { arestas: ARESTAS_DA_CAIXA, raio: T.base_raio, paineis: T.base_paineis });

  /* painel: a coluna à direita; a altura é da tabela e a largura vem da razão medida em painel.png */
  const H = T.painel_altura;
  const painelX1 = meiaL - T.margem;
  const painelX0 = painelX1 - H * T.painel_razao;
  const cx = (painelX0 + painelX1) / 2;
  const painelY0 = yCorpo0 + T.margem;
  const painelY1 = painelY0 + H;
  const S = (f) => f * H;
  const yDe = (f) => painelY1 - f * H;

  /* porta: folha na frente do corpo; a margem é a mesma até o lado do corpo e até o painel, e a porta fica centrada em y */
  const portaX0 = -meiaL + T.margem;
  const portaX1 = painelX0 - T.margem;
  const portaY0 = yCorpo0 + (T.corpo_altura - T.porta_altura) / 2;
  caixa('porta', 'cubo', portaX0, portaX1, portaY0, portaY0 + T.porta_altura, corpoFrente, zFrente, 'porta',
    'com a face de trás encostada na face de frente do corpo, à esquerda',
    { arestas: ARESTAS_DA_PLACA, raio: T.porta_raio, paineis: T.porta_paineis });

  /* janela: vidro na frente da porta; o que sobra da porta é a moldura (fina à esquerda, em cima e embaixo, larga à direita) */
  const janelaX0 = portaX0 + T.moldura_porta_esq;
  const janelaX1 = portaX1 - T.moldura_porta_dir;
  const janelaY0 = portaY0 + T.moldura_porta_baixo;
  const janelaY1 = portaY0 + T.porta_altura - T.moldura_porta_cima;
  caixa('janela', 'chamferBox', janelaX0, janelaX1, janelaY0, janelaY1,
    zFrente, zFrente + T.janela_espessura, 'vidro', 'saindo 4 mm à frente da face de frente da porta, dentro da moldura',
    { chanfro: T.janela_chanfro });

  /* puxador vertical: barra na faixa larga da direita da moldura, com a altura da janela e centrada nela, no meio da faixa */
  const puxX = (janelaX1 + portaX1) / 2;
  caixa('puxadorDaPorta', 'extrusaoZ', puxX - T.puxador_largura / 2, puxX + T.puxador_largura / 2, janelaY0, janelaY1,
    zFrente, zFrente + T.puxador_saliencia, 'puxador', 'assentada na face de frente da porta, no meio da faixa direita da moldura',
    { raio: T.puxador_raio });

  /* visor: retângulo escuro no fundo de um rebaixo que a placa recebe no topo */
  const visorLarg = S(T.visor_largura_f);
  const visorAlt = S(T.visor_altura_f);
  const visorY1 = yDe(T.visor_topo_f);
  const visorZ0 = zFrente - T.rebaixo_profundidade;
  const visor = { x0: cx - visorLarg / 2, x1: cx + visorLarg / 2, y0: visorY1 - visorAlt, y1: visorY1 };
  caixa('painel', 'cubo', painelX0, painelX1, painelY0, painelY1, corpoFrente, zFrente, 'painel',
    'com a face de trás encostada na face de frente do corpo, à direita, com o rebaixo do visor aberto por subtrair',
    { arestas: ARESTAS_DA_PLACA, raio: T.painel_raio, paineis: T.painel_paineis, rebaixo: { ...visor, z0: visorZ0, z1: zFrente + 1 } });
  caixa('visor', 'cubo', visor.x0, visor.x1, visor.y0, visor.y1, visorZ0, visorZ0 + T.visor_espessura, 'visor',
    `no fundo do rebaixo de ${fmt(T.rebaixo_profundidade)} mm do painel, centrado em x`);

  /* dígitos "12:00": segmentos de sete segmentos e os dois pontos, todos numa parte só, sobre o visor */
  const dz0 = visorZ0 + T.visor_espessura;
  const dz1 = dz0 + T.digito_espessura;
  const dh = S(T.digito_altura_f);
  const dw = S(T.digito_largura_f);
  const t = S(T.digito_traco_f);
  const g = T.digito_folga;
  const dyb = yDe(T.digito_topo_f) - dh;
  const segmentos = [];
  const seg = (x0, x1, y0, y1) => segmentos.push({ x0, x1, y0, y1, z0: dz0, z1: dz1 });
  T.digitos.forEach((d, i) => {
    const xr = cx + S(T.digitos_x_dir_f[i]);
    const xl = xr - dw;
    const meio = (dh - t) / 2;
    const horiz = [xl + t + g, xr - t - g];
    const vSup = [dyb + (dh + t) / 2 + g, dyb + dh - t - g];
    const vInf = [dyb + t + g, dyb + meio - g];
    const traco = {
      a: () => seg(horiz[0], horiz[1], dyb + dh - t, dyb + dh),
      d: () => seg(horiz[0], horiz[1], dyb, dyb + t),
      g: () => seg(horiz[0], horiz[1], dyb + meio, dyb + meio + t),
      f: () => seg(xl, xl + t, vSup[0], vSup[1]),
      b: () => seg(xr - t, xr, vSup[0], vSup[1]),
      e: () => seg(xl, xl + t, vInf[0], vInf[1]),
      c: () => seg(xr - t, xr, vInf[0], vInf[1]),
    };
    for (const s of SEGMENTOS_DO_DIGITO[d]) traco[s]();
  });
  const xDois = cx + S(T.dois_pontos_x_f);
  for (const fy of [1 / 3, 2 / 3]) {
    const yc = dyb + dh * fy;
    seg(xDois - t / 2, xDois + t / 2, yc - t / 2, yc + t / 2);
  }
  caixa('digitosDoVisor', 'grupo', visor.x0, visor.x1, visor.y0, visor.y1, dz0, dz1, 'digito',
    `sobre a face de frente do visor, ${fmt(T.digito_espessura)} mm de espessura, "12:00"`, { segmentos });

  /* molduras rasas e botões: três faixas, cada uma com três botões */
  const mLarg = S(T.moldura_largura_f);
  const mAlt = S(T.moldura_altura_f);
  const zMoldura1 = zFrente + T.moldura_espessura;
  T.molduras_nomes.forEach((nome, i) => {
    const yc = yDe(T.molduras_topo_f[i]) - mAlt / 2;
    caixa(nome, 'extrusaoZ', cx - mLarg / 2, cx + mLarg / 2, yc - mAlt / 2, yc + mAlt / 2, zFrente, zMoldura1, 'moldura',
      'assentada na face de frente do painel, centrada na coluna', { raio: T.moldura_raio });
    for (let c = 0; c < 3; c += 1) {
      const bx = cx + (c - 1) * S(T.botao_passo_f);
      const bw = S(T.botao_largura_f);
      const bh = S(T.botao_altura_f);
      caixa(T.botoes_nomes[i * 3 + c], 'extrusaoZ', bx - bw / 2, bx + bw / 2, yc - bh / 2, yc + bh / 2, zMoldura1,
        zMoldura1 + T.botao_espessura, 'botao', `assentado na face de frente da ${nome}`, { raio: T.botao_raio });
    }
  });

  /* teclas: grade de 3 colunas por 5 linhas, quadradas, com o mesmo passo em x e em y */
  const lado = S(T.tecla_lado_f);
  const passo = S(T.tecla_passo_f);
  T.teclas_linhas.forEach((linha, r) => {
    linha.forEach((nome, c) => {
      const kx = cx + (c - 1) * passo;
      const ky = yDe(T.tecla_topo_f) - r * passo - lado / 2;
      const material = r === T.teclas_linhas.length - 1 ? T.teclas_ultima_linha_material[c] : 'tecla';
      caixa(nome, 'extrusaoZ', kx - lado / 2, kx + lado / 2, ky - lado / 2, ky + lado / 2, zFrente, zFrente + T.tecla_espessura, material,
        'assentada na face de frente do painel, no teclado de passo igual em x e em y', { raio: T.tecla_raio });
    });
  });

  /* grades: cada lado tem a mesma lista de alturas, espelhada em torno do eixo x 0, encostada por fora na lateral do corpo */
  for (const [ladoNome, sinal] of [['Dir', +1], ['Esq', -1]]) {
    T.ventilacao_y0.forEach((y0, i) => {
      const x0 = sinal > 0 ? meiaL : -(meiaL + T.ventilacao_largura);
      caixa(`ventilacao${ladoNome}${i + 1}`, 'chamferBox', x0, x0 + T.ventilacao_largura, y0, y0 + T.ventilacao_altura,
        T.ventilacao_z0, T.ventilacao_z0 + T.ventilacao_profundidade, 'grade',
        `na lateral ${sinal > 0 ? 'direita' : 'esquerda'}, encostada na face lateral do corpo`, { chanfro: T.ventilacao_chanfro });
    });
  }

  return caixas;
}

/* Ids de origem por parte; nenhum é identidade persistida fora da receita. A forma da parte `i` (de 1) leva `i`. */
const idArredonda = (i, k) => 10000 + 100 * i + k;
const idSegmento = (k) => 2000 + k;
const ID_CORTE_DO_VISOR = 4000;
const ID_SUBTRACAO_DO_PAINEL = 5000;
const ALIAS_DOS_SEGMENTOS = 'segmentosDoVisor';

const origemDeForma = (c, i) => (c.forma === 'extrusaoZ' ? { op: 'extrusao', id: i } : { op: c.forma, id: i });

/* A seleção que a parte usa: a forma com arredondamento é a forma mais as faixas que o arredondamento cria (alias); o painel é o
 * resultado do `subtrair`; o grupo dos dígitos é a união dos segmentos (alias). */
function selDaParte(c, i) {
  if (c.forma === 'grupo') return { alias: ALIAS_DOS_SEGMENTOS };
  if (c.rebaixo) return { origem: { op: 'subtrair', id: ID_SUBTRACAO_DO_PAINEL } };
  if (c.arestas) return { alias: `${c.nome}Inteiro` };
  return { origem: origemDeForma(c, i) };
}

export const ALIASES = (() => {
  const aliases = [];
  derivar(TABELA).forEach((c, i0) => {
    const i = i0 + 1;
    if (c.arestas) {
      aliases.push([`${c.nome}Inteiro`, { unir: [
        { origem: { op: 'cubo', id: i } },
        ...c.arestas.map((_, k) => ({ origem: { op: 'arredondarAresta', id: idArredonda(i, k) } })),
      ] }]);
    }
    if (c.forma === 'grupo') {
      aliases.push([ALIAS_DOS_SEGMENTOS, { unir: c.segmentos.map((_, k) => ({ origem: { op: 'cubo', id: idSegmento(k) } })) }]);
    }
  });
  return aliases;
})();

/** Os PASSOS: uma forma por parte, em metro, com a `parte` e o `material` logo depois. `em` é o centro em x e z e a base em y; na
 *  extrusão em z, é o centro em x e y e o início em z. */
export function gerarPassos(T) {
  const passos = [];
  const centro = (c) => [m((c.x0 + c.x1) / 2), m(c.y0), m((c.z0 + c.z1) / 2)];
  const medidas = (c) => ({ larg: m(c.x1 - c.x0), alt: m(c.y1 - c.y0), prof: m(c.z1 - c.z0) });
  derivar(T).forEach((c, i0) => {
    const i = i0 + 1;
    const sel = selDaParte(c, i);
    if (c.forma === 'cubo') {
      passos.push(['cubo', { origemId: i, ...medidas(c), em: centro(c) }]);
      (c.arestas ?? []).forEach(([dir, eixo, ladoDoExtremo], k) => {
        passos.push(['arredondarAresta', {
          origemId: idArredonda(i, k), raio: m(c.raio), paineis: c.paineis,
          sel: { origem: { op: 'cubo', id: i }, onde: { alvo: 'aresta', normal: { dir, ate: 5 }, extremo: { eixo, lado: ladoDoExtremo } } },
        }]);
      });
      if (c.rebaixo) {
        const r = c.rebaixo;
        passos.push(['cubo', {
          origemId: ID_CORTE_DO_VISOR, ...medidas(r), em: [m((r.x0 + r.x1) / 2), m(r.y0), m((r.z0 + r.z1) / 2)],
        }]);
        passos.push(['subtrair', {
          origemId: ID_SUBTRACAO_DO_PAINEL,
          solidos: [{ alias: `${c.nome}Inteiro` }, { origem: { op: 'cubo', id: ID_CORTE_DO_VISOR } }],
        }]);
      }
    } else if (c.forma === 'chamferBox') {
      passos.push(['chamferBox', { origemId: i, ...medidas(c), chanfro: m(c.chanfro), em: centro(c) }]);
    } else if (c.forma === 'extrusaoZ') {
      passos.push(['extrusao', {
        origemId: i, eixo: 'z', altura: m(c.z1 - c.z0),
        perfil: retanguloArredondado(c.x1 - c.x0, c.y1 - c.y0, c.raio, SEGMENTOS_POR_CANTO).map(([x, y]) => [m(x), m(y)]),
        em: [m((c.x0 + c.x1) / 2), m((c.y0 + c.y1) / 2), m(c.z0)],
      }]);
    } else {
      c.segmentos.forEach((s, k) => {
        passos.push(['cubo', { origemId: idSegmento(k), ...medidas(s), em: centro(s) }]);
      });
    }
    passos.push(['parte', { nome: c.nome, sel }]);
    passos.push(['material', { sel, usa: c.material }]);
    if (c.arestas) passos.push(['liso', { angulo: 30, sel }]);
  });
  return passos;
}

/* Os contatos intencionais: cada par se toca pela face que o motivo diz. As listas (molduras, botões, teclas e grades) repetem em
 * laço o que a TABELA já declarou. */
const GRADES = ['Dir', 'Esq'].flatMap((lado) => [1, 2, 3, 4].map((i) => `ventilacao${lado}${i}`));
const TECLAS = TABELA.teclas_linhas.flat();
export const CONTATOS = [
  { par: ['baseEscura', 'corpo'], motivo: 'a face de cima da base escura encosta na face de baixo do corpo, e a base fica sob o corpo inteiro' },
  { par: ['corpo', 'porta'], motivo: 'a face de trás da porta encosta na face de frente do corpo, na metade esquerda' },
  { par: ['corpo', 'painel'], motivo: 'a face de trás do painel encosta na face de frente do corpo, na coluna da direita' },
  ...GRADES.map((grade) => ({ par: ['corpo', grade], motivo: 'a grade encosta na face lateral do corpo, por fora dela, a 6 mm de espessura' })),
  { par: ['puxadorDaPorta', 'porta'], motivo: 'a face de trás do puxador assenta na face de frente da porta, na faixa larga da direita, sem atravessá-la' },
  { par: ['janela', 'porta'], motivo: 'a janela encosta na face de frente da porta, sem atravessá-la, e sai 4 mm à frente' },
  { par: ['painel', 'visor'], motivo: 'o visor assenta no fundo do rebaixo de 3 mm do painel, com as laterais coladas nas paredes do rebaixo' },
  { par: ['visor', 'digitosDoVisor'], motivo: 'os segmentos dos dígitos assentam na face de frente do visor, dentro do rebaixo do painel' },
  ...TABELA.molduras_nomes.map((nome) => ({ par: ['painel', nome], motivo: 'a moldura rasa assenta na face de frente do painel e sai 1 mm à frente' })),
  ...TABELA.botoes_nomes.map((nome, i) => ({ par: [TABELA.molduras_nomes[Math.floor(i / 3)], nome], motivo: 'o botão assenta na face de frente da moldura e sai 2 mm à frente dela' })),
  ...TECLAS.map((tecla) => ({ par: ['painel', tecla], motivo: 'a tecla assenta na face de frente do painel e sai 3 mm à frente, sem atravessá-lo' })),
];

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha: cantos das partes que fixam a caixa total, a frente comum da
 * porta e do painel e o teclado. */
export function pontosDeclarados(T = TABELA) {
  const c = Object.fromEntries(derivar(T).map((x) => [x.nome, x]));
  const min = (nome, parte) => ({ nome, parte, medida: 'minimo', em: [c[parte].x0, c[parte].y0, c[parte].z0], toleranciaMm: 0.5 });
  const max = (nome, parte) => ({ nome, parte, medida: 'maximo', em: [c[parte].x1, c[parte].y1, c[parte].z1], toleranciaMm: 0.5 });
  return [
    min('canto de trás, embaixo, à esquerda, da base escura (no chão)', 'baseEscura'),
    min('canto de trás, embaixo, à esquerda, do corpo', 'corpo'),
    max('canto da frente, em cima, à direita, do corpo', 'corpo'),
    min('canto de baixo, atrás, à esquerda, da porta', 'porta'),
    max('canto de cima da frente, à direita, da porta', 'porta'),
    min('canto de baixo, atrás, à esquerda, do painel', 'painel'),
    max('canto de cima da frente, à direita, do painel', 'painel'),
    max('canto de cima da frente, à direita, da janela', 'janela'),
    min('canto de baixo, à esquerda, da janela', 'janela'),
    min('canto de baixo, à esquerda, do puxador da porta', 'puxadorDaPorta'),
    max('canto de cima da frente, à direita, do puxador (ponto mais à frente)', 'puxadorDaPorta'),
    min('canto de baixo, à esquerda, da tecla 1', 'tecla1'),
    max('canto de cima, à direita, da tecla iniciar', 'teclaIniciar'),
    max('face de fora, de cima, da grade direita 4', 'ventilacaoDir4'),
  ];
}

/* A parte do PLANO, escrita pela mesma `derivar` que a malha: o texto e a medida não se separam. */
function parteDoPlano(c) {
  const dim = `${fmt(c.x1 - c.x0)} por ${fmt(c.y1 - c.y0)} por ${fmt(c.z1 - c.z0)} mm`;
  const faixa = `x ${fmt(c.x0)} a ${fmt(c.x1)}, y ${fmt(c.y0)} a ${fmt(c.y1)}`;
  if (c.forma === 'grupo') {
    return { nome: c.nome, forma: `${c.segmentos.length} caixas finas verdes (segmentos de "12:00" e os dois pontos), ${faixa}, z ${fmt(c.z0)} a ${fmt(c.z1)}`, tecnica: `cubo por segmento, todos unidos num alias por unir e nomeados como uma parte só; ${c.apoio}` };
  }
  if (c.forma === 'extrusaoZ') {
    return { nome: c.nome, forma: `${dim}, cantos de ${fmt(c.raio)} mm, ${faixa}`, tecnica: `extrusao em z de retângulo de cantos arredondados, ${c.apoio}` };
  }
  if (c.forma === 'chamferBox') {
    return { nome: c.nome, forma: `${dim}, chanfro de ${fmt(c.chanfro)} mm, ${faixa}`, tecnica: `chamferBox ${c.apoio}` };
  }
  if (c.arestas) {
    return { nome: c.nome, forma: `${dim}, ${c.arestas.length} arestas arredondadas em ${fmt(c.raio)} mm com ${c.paineis} painéis, ${faixa}`, tecnica: `cubo com arredondarAresta escolhida por sel.onde, ${c.apoio}` };
  }
  return { nome: c.nome, forma: `${dim}, ${faixa}`, tecnica: `cubo ${c.apoio}` };
}

const receita = {
  meta: { nome: 'micro-ondas-branco', desc: 'micro-ondas de bancada assentado no chão, com corpo de metal claro, base escura, porta grande com janela e puxador vertical, painel em coluna com visor de dígitos, três faixas de função e quinze teclas, e oito grades laterais' },
  PARAMS: TABELA,
  MATERIAIS: {
    metal: { tipo: 'liso', cor: '#f3f3ee', desgaste: 0.02 },
    base: { tipo: 'liso', cor: '#79665d', desgaste: 0.03 },
    porta: { tipo: 'liso', cor: '#f3f3ee', desgaste: 0.02 },
    vidro: { tipo: 'liso', cor: '#3a3e52', desgaste: 0.15 },
    painel: { tipo: 'liso', cor: '#8a8b88', desgaste: 0.05 },
    visor: { tipo: 'liso', cor: '#0a0c0b', desgaste: 0.05 },
    digito: { tipo: 'liso', cor: '#28c83c' },
    moldura: { tipo: 'liso', cor: '#7a7b78', desgaste: 0.15 },
    botao: { tipo: 'liso', cor: '#9c9d99', desgaste: 0.15 },
    tecla: { tipo: 'liso', cor: '#4c4b49', desgaste: 0.15 },
    teclaVermelha: { tipo: 'liso', cor: '#b32b27', desgaste: 0.15 },
    teclaCinza: { tipo: 'liso', cor: '#8f8f8c', desgaste: 0.15 },
    teclaAzul: { tipo: 'liso', cor: '#2b5ea8', desgaste: 0.15 },
    grade: { tipo: 'liso', cor: '#e4e4de', desgaste: 0.03 },
    puxador: { tipo: 'metal', cor: '#a3a6aa', acabamento: 'escovado', desgaste: 0.1 },
  },
  TOPO: { origem: 'chão, no meio do micro-ondas em x e em z; y para cima e a frente do micro-ondas em +z' },
  PLANO: {
    objeto: 'micro-ondas de bancada no chão, 712 por 491 por 454 mm: base escura, porta grande com janela e puxador vertical, painel em coluna com visor, três faixas de botões e 15 teclas, e grades laterais',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'altura total do micro-ondas', milimetros: 491 },
    familia: 'movel-de-caixa',
    partes: derivar(TABELA).map(parteDoPlano),
    criteriosDeReprovacao: [
      'a base escura não começa em y 0, ou o micro-ondas não assenta sobre ela, ou a base não fica sob o corpo inteiro',
      'a porta atravessa o corpo em vez de encostar na face de frente, a janela não fica na face de frente da porta, ou a porta não tem a margem de 20 mm até o lado do corpo e até o painel',
      'a moldura da porta não é fina (18 mm) à esquerda, em cima e embaixo e larga (30 mm) à direita',
      'o puxador vertical não tem a altura da janela, não fica centrado nela, ou não cabe dentro da faixa direita da moldura com margem dos dois lados',
      'a frente da porta e a do painel não ficam no mesmo plano z 229,5, ou o painel se sobrepõe à porta',
      'o painel não é uma coluna de razão largura/altura 0,3477, ou o visor não é um rebaixo escuro com os dígitos de sete segmentos por cima',
      'uma faixa de função não tem três botões dentro de uma moldura rasa, ou o teclado não tem 15 teclas de passo igual em x e em y, ou a linha de baixo não é vermelha, cinza e azul',
      'uma aresta do corpo, da base, da porta ou da placa do painel fica em chanfro simples em vez de arredondamento em painéis, ou a malha fica aberta',
      'uma grade não encosta na face lateral do corpo, ou as grades de um lado não são espelho das do outro',
      'o corpo não tem a mesma largura e profundidade da base escura, ou a caixa total difere de 712 por 491 por 454 mm',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  ALIASES,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export const PASSOS = gerarPassos(TABELA);

export default receita;

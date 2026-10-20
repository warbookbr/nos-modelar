/* caminhao-lixo — caminhão de coleta de lixo de brinquedo: cabine curta de capô claro e teto verde na frente, caçamba compactadora
 * verde de topo aberto, com a traseira em rampa, cheia de pedras de lixo, e os dois braços cinza que sobem pelos lados da caçamba,
 * passam por cima da cabine e descem até uma travessa na frente do capô. Chassi cinza, para-lamas em arco, quatro rodas grandes de
 * pneu escuro com cubo cinza azulado, faróis amarelos nos cantos do nariz e barra de levantamento atrás.
 *
 * Origem: recriado em primitivas do núcleo a partir do modelo "garbage-truck" do pacote A, de autor A (pacote A, endereço omitido,
 * endereço da página: endereço omitido), licença livre sem exigência de crédito (declarada no License.txt do pacote). A malha
 * de origem NÃO está no repositório: ela fica em importados/veiculos-livres/pacote-a/garbage-truck.glb, que o git ignora. O que entra aqui
 * são as medidas tiradas dela (referencias/fonte-partes.json, em metro, escala 1,765, e a leitura dos vértices por cor) e as vistas
 * (referencias/fonte-vistas.png). O que não ficou igual à referência está em referencias/alvo.md.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente do caminhão em +z, x para a direita de quem olha de frente, centrado
 * em x e z. A TABELA é em milímetro e é a única fonte das medidas; `m` é a única conversão para metro; `derivar` calcula as formas e
 * `gerarPassos` escreve, por parte, a forma, a `parte` e o `material`. Nenhuma posição é digitada no passo.
 *
 * Como a forma é feita (estrutura da picape-compacta): a cabine é a INTERSEÇÃO do perfil lateral (z, y) em x com a seção frontal
 * (x, y) em z; a caçamba é montada por partes (duas paredes laterais com o perfil da silhueta, um miolo entre elas com o piso em rampa,
 * a parede da frente e as pedras), e os braços são extrusões em x do caminho dobrado da barra. Os arcos das rodas são recortados nos
 * próprios perfis laterais, antes de extrudar, e cada caixa de roda enche o mesmo arco entre as faces de dentro dos pneus; nenhuma
 * booleana corta a peça. Uma extrusão com `eixo: 'x'` leva o perfil [u, v] a y = -u e z = v; com `eixo: 'z'`, a x = u e y = -v; com
 * `eixo: 'y'`, a x = u e z = v. Os pneus, os cubos e os cubos dos braços são revoluções em torno de x (`lathe`).
 */

export const TABELA = {
  lados: 32, // contagem de lados dos pneus e dos arcos (a mesma, para os arcos acompanharem o pneu)

  // larguras
  caixa_meia_largura: 971, // cabine e miolo da caçamba
  chassi_meia_largura: 1147, // chassi, saias e paredes da caçamba

  // rodas: pneu de 1059 mm de diâmetro e 530 mm de largura, com o cubo embutido na face de fora
  roda_raio: 529.5,
  roda_x_dentro: 529.5,
  roda_x_fora: 1059,
  roda_z_frente: 1915,
  roda_z_tras: -944,
  pneu_furo_raio: 250,
  pneu_chanfro_raio: 450,
  pneu_chanfro_largura: 100,
  cubo_profundidade: 88,
  cubo_recesso_raio: 150,
  cubo_recesso_fundo_raio: 100,
  cubo_recesso_profundidade: 22,

  // arcos: o do perfil (a caixa de roda enche o mesmo arco) e o anel do para-lama em volta dele, de x 971 a 1147
  arco_raio: 590,
  para_lama_raio: 688,
  para_lama_x0: 971, // o anel é uma faixa cinza no plano da lateral (x 971 a 1147), como na fonte
  suporte_x1: 1235,
  suporte_z0: -2787,
  suporte_z1: -2537,
  suporte_alto_y0: 1413,
  suporte_alto_y1: 1596,
  suporte_baixo_y0: 713,
  suporte_baixo_y1: 887,

  // chassi cinza: faixa de y 353 a 529,5 entre os arcos, e a de trás, mais alta, até 706 (onde a caçamba assenta)
  chassi_base_y: 353,
  chassi_topo_y: 529.5,
  caixa_tras_base_y: 706,
  chassi_z_tras: -2239,

  // para-choque da frente (y 353 a 706, quinas cortadas; começa onde o arco dianteiro acaba, z 2505) e placas claras
  para_choque_z1: 2956,
  para_choque_quina_x: 1059,
  para_choque_quina_z: 2868,
  para_choque_y1: 765,
  placa_meia_largura: 309,
  placa_frente_y0: 309,
  placa_frente_y1: 574,
  placa_frente_z1: 3044,
  placa_tras_y0: 221,
  placa_tras_y1: 485,
  placa_tras_z1: -2327,

  // saias cinza sob a cabine e no nariz, de y 529,5 e 706 a 1059
  saia_topo_y: 1059,
  nariz_saia_z: 2780,

  // cabine: parte baixa clara com capô em rampa, parte alta cinza que afunila, teto verde
  cab_z_tras: 921,
  nariz_z: 2610,
  nariz_topo_y: 1283,
  capo_fim_z: 2067,
  cintura_y: 1413,
  pilar_topo_z: 1719,
  cab_alta_y: 2296,
  cab_vertical_y: 1590,
  teto_meia_largura: 800,
  teto_z_frente: 1328,
  teto_y: 2470,

  // faróis amarelos nos cantos do nariz e grade entre eles
  farol_x0: 480,
  farol_frente_topo_y: 1239,

  // vidros azul claros
  parabrisa_meia_largura_y0: 760,
  parabrisa_meia_largura_y1: 640,
  parabrisa_y1: 2150,
  parabrisa_espessura: 20,
  vidro_lateral_frente_z: 1880,
  vidro_lateral_topo_z: 1590,
  vidro_lateral_topo_y: 2100,
  vidro_lateral_espessura: 12,

  // retrovisores: caixas que saem da lateral da cabine até x 1324
  retrovisor_x1: 1324,
  retrovisor_y0: 1240,
  retrovisor_y1: 1590,
  retrovisor_z0: 1496,
  retrovisor_z1: 1675,

  // caçamba: paredes de 176 mm (x 971 a 1147), perfil da silhueta, parede da frente, piso em rampa
  cacamba_topo_y: 2824,
  cacamba_topo_z: -1332,
  cacamba_ombro_z: -1586,
  cacamba_ombro_y: 2745,
  cacamba_tras_z: -2692,
  cacamba_frente_z: 921,
  parede_frente_z0: 744,
  piso_y: 2471,
  piso_espessura: 60,
  rampa_z0: -1310,
  rampa_z1: -2318,
  labio_y: 1593,

  // pedras de lixo: prismas de seis lados sobre o piso (y 2471 até o topo de cada uma)
  pedras: [
    { nome: 'pedraA', x: -350, z: 91, r: 330, topo: 2824 },
    { nome: 'pedraB', x: -593, z: -822, r: 275, topo: 2700 },
    { nome: 'pedraD', x: 452, z: -807, r: 183, topo: 2650 },
    { nome: 'pedraE', x: 701, z: 0, r: 259, topo: 2824 },
    { nome: 'pedraF', x: 129, z: -122, r: 183, topo: 2750 },
    { nome: 'pedraG', x: 570, z: 396, r: 137, topo: 2620 },
  ],

  // braços: barra de 146 mm de espessura em x (1266 a 1412), caminho dobrado em três trechos, cubo na caçamba e travessa na frente
  braco_x0: 1266,
  braco_x1: 1412,
  braco_raiz_frente: [439, 799],
  braco_raiz_tras: [580, 762],
  braco_joelho_baixo: [991, 2296],
  braco_dobra_baixo: [2044, 2014],
  braco_dobra_cima: [2163, 2133],
  braco_ponta_baixo: [2668, 1390],
  braco_ponta_cima: [2787, 1509],
  braco_topo: [974, 2452],
  braco_topo_frente: [865, 2389],
  travessa_a: [2430, 1628],
  travessa_b: [2490, 1687],
  travessa_c: [2609, 1568],
  travessa_d: [2549, 1509],
  cubo_braco_z: 529,
  cubo_braco_y: 850,
  cubo_braco_raio: 177,

  // barra de levantamento atrás: postes de x 790 a 974 e pés até z -3045
  poste_x0: 790,
  poste_x1: 974,
  poste_z0: -2870,
  poste_y1: 1765,
  pe_x0: 617,
  pe_y0: 441,
  pe_y1: 529,
  pe_z0: -3045,
};

const m = (mm) => mm / 1000;

/* ---------- geometria 2D em milímetro ---------- */

const area = (l) => l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0) / 2;
const antihorario = (l) => (area(l) < 0 ? [...l].reverse() : l);
/* o núcleo gira a extrusão em x de y para x: [u, v] vai a y = -u, z = v. Entra [z, y]. */
const perfilLateral = (zy) => antihorario(zy.map(([z, y]) => [-y, z]));
/* a extrusão em z leva [u, v] a x = u, y = -v. Entra [x, y]. */
const secaoFrontal = (xy) => antihorario(xy.map(([x, y]) => [x, -y]));

/* O polígono de `n` lados de uma roda, em [z, y], percorrido no sentido horário a partir da esquerda (z menor). */
function circuloHorario(zc, yc, r, n) {
  return Array.from({ length: n }, (_, k) => {
    const a = Math.PI - (2 * Math.PI * k) / n;
    return [zc + r * Math.cos(a), yc + r * Math.sin(a)];
  });
}

/* Insere no anel os pontos em que as arestas cruzam o nível y; os pontos inseridos têm o y exato do nível. */
function comNivel(anel, y) {
  const saida = [];
  anel.forEach((a, i) => {
    const b = anel[(i + 1) % anel.length];
    saida.push(a);
    if ((a[1] - y) * (b[1] - y) < 0) { const t = (y - a[1]) / (b[1] - a[1]); saida.push([a[0] + t * (b[0] - a[0]), y]); }
  });
  return saida;
}
/* O vértice que cai no nível (a 1e-6 mm) é posto exatamente nele, para o nível não criar uma lasca ao lado do vértice. */
const noNivel = (anel, y) => anel.map(([a, b]) => (Math.abs(b - y) < 1e-6 ? [a, y] : [a, b]));
const anelCortado = (zc, yc, r, n, niveis) => niveis.reduce((anel, y) => comNivel(noNivel(anel, y), y), circuloHorario(zc, yc, r, n));

/* O trecho do anel que vai do ponto `de` ao ponto `ate`, no sentido horário. */
function percorrer(anel, de, ate) {
  const saida = [];
  for (let i = de; ; i = (i + 1) % anel.length) { saida.push(anel[i]); if (i === ate) break; }
  return saida;
}

/* A parte do arco acima do nível y: da esquerda, por cima, até a direita, em ordem crescente de z, cortada em y. */
function capaAcima(zc, yc, r, n, y) {
  const anel = anelCortado(zc, yc, r, n, [y]);
  return percorrer(anel, anel.findIndex((p) => p[1] === y && p[0] < zc), anel.findIndex((p) => p[1] === y && p[0] > zc));
}

/* O trecho de um lado do arco entre os níveis yBaixo e yAlto: no lado direito vai de cima para baixo; no esquerdo, de baixo para cima. */
function trechoDoArco(zc, yc, r, n, lado, yBaixo, yAlto) {
  const anel = anelCortado(zc, yc, r, n, [yBaixo, yAlto]);
  const no = (y) => anel.findIndex((p) => p[1] === y && (lado > 0 ? p[0] > zc : p[0] < zc));
  return lado > 0 ? percorrer(anel, no(yAlto), no(yBaixo)) : percorrer(anel, no(yBaixo), no(yAlto));
}

/* O arco por cima, da direita (nível yDir) até a esquerda (nível yEsq), em ordem decrescente de z. */
function arcoDaDireitaParaEsquerda(zc, yc, r, n, yDir, yEsq) {
  const anel = anelCortado(zc, yc, r, n, [yDir, yEsq]);
  const iEsq = anel.findIndex((p) => p[1] === yEsq && p[0] < zc);
  const iDir = anel.findIndex((p) => p[1] === yDir && p[0] > zc);
  /* o ponto inserido num nível só vale do lado em que o nível corta o caminho; do outro lado seria um vértice colinear */
  const caminho = percorrer(anel, iEsq, iDir).filter((p) => yDir === yEsq || !((p[1] === yEsq && p[0] > zc) || (p[1] === yDir && p[0] < zc)));
  return caminho.reverse();
}

/* x ao longo de y pela reta que passa por (y0, x0) e (y1, x1), válida também fora do intervalo. */
const reta = (y0, x0, y1, x1) => (y) => x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);

/* O paralelogramo da aresta P-Q deslocado `e` para fora, na direção da normal `n`; a face de dentro usa os mesmos vértices da aresta. */
function placaSobre(P, Q, e, n) {
  const k = e / Math.hypot(...n);
  return [P, Q, [Q[0] + n[0] * k, Q[1] + n[1] * k], [P[0] + n[0] * k, P[1] + n[1] * k]];
}

/* O polígono [x, z] da metade da direita, espelhado para a esquerda. */
const espelho = (pts) => [...pts, ...[...pts].reverse().map(([x, z]) => [-x, z])];

const arred = (v) => Math.round(v * 100) / 100;

/* ---------- derivar ---------- */

/* Cada forma tem `nome`, `forma` (vistas, lateral, planta, cubo ou lathe), `material`, `txt` (a forma, para o plano), `tec` (a técnica) e
 * as medidas, em milímetro. */
export function derivar(T) {
  const M = T.caixa_meia_largura;
  const W = T.chassi_meia_largura;
  const yR = T.roda_raio;
  const zF = T.roda_z_frente;
  const zT = T.roda_z_tras;
  const y0 = T.chassi_base_y;
  const yC = T.chassi_topo_y;
  const yH = T.caixa_tras_base_y;
  const yPC = T.para_choque_y1;
  const yS = T.saia_topo_y;
  const zPC0 = zF + T.arco_raio; // o para-choque da frente começa onde o arco dianteiro acaba
  const n = T.lados;
  const arcoR = T.arco_raio;
  const rodas = [];
  for (const s of [1, -1]) {
    for (const [ponta, zc] of [['Frente', zF], ['Tras', zT]]) rodas.push({ s, lado: s > 0 ? 'Dir' : 'Esq', ponta, zc });
  }
  const LADOS = [{ s: 1, l: 'Dir' }, { s: -1, l: 'Esq' }];
  const arcoDir = (zc, yb, ya) => trechoDoArco(zc, yR, arcoR, n, 1, yb, ya);
  const arcoEsq = (zc, yb, ya) => trechoDoArco(zc, yR, arcoR, n, -1, yb, ya);
  const retangulo = (xa, xb, ya, yb) => [[xa, ya], [xb, ya], [xb, yb], [xa, yb]];
  const folga = 100;
  const formas = [];

  /* chassi em três trechos, separados pelos arcos: frente (nada, o para-choque começa onde o arco acaba), centro e trás */
  formas.push({
    nome: 'chassiCentro', forma: 'lateral', material: 'cinzaEscuro', x0: -W, largura: 2 * W,
    lado: [...arcoDir(zT, y0, yC), ...arcoEsq(zF, y0, yC)],
    txt: 'trecho do chassi cinza escuro de y 353 a 529,5 entre os arcos das rodas, de 2294 mm de largura',
    tec: 'extrusao com eixo x do perfil lateral com os dois arcos',
  });
  formas.push({
    nome: 'chassiTras', forma: 'lateral', material: 'cinzaEscuro', x0: -W, largura: 2 * W,
    lado: [[T.chassi_z_tras, y0], ...arcoEsq(zT, y0, yH), [T.chassi_z_tras, yH]],
    txt: 'trecho do chassi cinza escuro atrás do arco traseiro, de y 353 a 706, até z -2239, de 2294 mm de largura',
    tec: 'extrusao com eixo x do perfil lateral com o arco',
  });

  /* para-choque da frente e as duas placas */
  formas.push({
    nome: 'paraChoqueFrente', forma: 'planta', material: 'cinza', y0, altura: yPC - y0,
    planta: espelho([[W, zPC0], [W, T.para_choque_quina_z], [T.para_choque_quina_x, T.para_choque_z1]]),
    txt: 'caixa cinza de 2294 mm de largura, de y 353 a 765 e z 2505 a 2956, com as quinas da frente cortadas',
    tec: 'extrusao com eixo y da planta de quinas cortadas',
  });
  formas.push({
    nome: 'placaFrente', forma: 'cubo', material: 'cinzaClaro', larg: 2 * T.placa_meia_largura, alt: T.placa_frente_y1 - T.placa_frente_y0,
    prof: T.placa_frente_z1 - T.para_choque_z1, em: [0, T.placa_frente_y0, (T.placa_frente_z1 + T.para_choque_z1) / 2],
    txt: 'placa clara de 618 por 265 por 88 mm, de y 309 a 574, saindo do para-choque da frente até z 3044',
    tec: 'cubo encostado na face da frente do para-choque',
  });
  formas.push({
    nome: 'placaTras', forma: 'cubo', material: 'cinzaClaro', larg: 2 * T.placa_meia_largura, alt: T.placa_tras_y1 - T.placa_tras_y0,
    prof: T.chassi_z_tras - T.placa_tras_z1, em: [0, T.placa_tras_y0, (T.chassi_z_tras + T.placa_tras_z1) / 2],
    txt: 'placa clara de 618 por 264 por 88 mm, de y 221 a 485, saindo da traseira do chassi até z -2327',
    tec: 'cubo encostado na face de trás do chassi',
  });

  /* saias cinza: atrás do arco dianteiro (sob a cabine) e no nariz, acima do para-choque */
  formas.push({
    nome: 'saiaCabine', forma: 'lateral', material: 'cinza', x0: -W, largura: 2 * W,
    lado: [[T.cab_z_tras, yC], ...arcoEsq(zF, yC, yPC), ...trechoDoArco(zF, yR, T.para_lama_raio, n, -1, yPC, yS), [T.cab_z_tras, yS]],
    txt: 'saia cinza de 2294 mm de largura, de y 529,5 a 1059, entre a caçamba em z 921 e o arco da roda dianteira',
    tec: 'extrusao com eixo x do perfil lateral com a borda do arco',
  });
  formas.push({
    nome: 'saiaNariz', forma: 'lateral', material: 'cinza', x0: -W, largura: 2 * W,
    lado: [...trechoDoArco(zF, yR, T.para_lama_raio, n, 1, yPC, yS), [T.nariz_saia_z, yPC], [T.nariz_saia_z, yS]],
    txt: 'saia cinza de 2294 mm de largura, de y 765 a 1059, do arco dianteiro ao nariz em z 2780, sobre o para-choque',
    tec: 'extrusao com eixo x do perfil lateral com a borda do arco',
  });

  /* cabine baixa clara, com o capô em rampa */
  formas.push({
    nome: 'cabineBaixa', forma: 'vistas', material: 'cinzaClaro',
    lado: [[T.cab_z_tras, yS], [T.nariz_z, yS], [T.nariz_z, T.nariz_topo_y], [T.capo_fim_z, T.cintura_y], [T.cab_z_tras, T.cintura_y]],
    frontal: retangulo(-M, M, yS - folga, T.cintura_y + folga),
    txt: 'corpo claro da cabine e do capô de 1942 mm de largura, de y 1059 a 1413, do nariz em z 2610 à caçamba em z 921, com o capô em rampa de y 1283 a 1413',
    tec: 'interseção do perfil lateral com a seção frontal retangular',
  });

  /* cabine alta cinza: a frente inclinada do pé do para-brisa ao teto, e a seção que afunila de 971 a 800 */
  const xAlta = reta(T.cab_vertical_y, M, T.cab_alta_y, T.teto_meia_largura);
  const yTopoAlta = T.cab_alta_y + folga;
  const altaFrontal = [[-M, T.cintura_y - folga], [M, T.cintura_y - folga], [M, T.cab_vertical_y], [xAlta(yTopoAlta), yTopoAlta],
    [-xAlta(yTopoAlta), yTopoAlta], [-M, T.cab_vertical_y]];
  formas.push({
    nome: 'cabineAlta', forma: 'vistas', material: 'cinzaAzulado',
    lado: [[T.cab_z_tras, T.cintura_y], [T.capo_fim_z, T.cintura_y], [T.pilar_topo_z, T.cab_alta_y], [T.cab_z_tras, T.cab_alta_y]],
    frontal: altaFrontal,
    txt: 'cabine cinza de y 1413 a 2296, com a frente inclinada de z 2067 a 1719, vertical até y 1590 e afunilando de 1942 mm a 1600 mm no teto',
    tec: 'interseção do perfil lateral com a seção frontal que afunila',
  });
  formas.push({
    nome: 'tetoCabine', forma: 'vistas', material: 'verde',
    lado: [[T.cab_z_tras, T.cab_alta_y], [T.pilar_topo_z, T.cab_alta_y], [T.teto_z_frente, T.teto_y], [T.cab_z_tras, T.teto_y]],
    frontal: retangulo(-T.teto_meia_largura, T.teto_meia_largura, T.cab_alta_y - folga, T.teto_y + folga),
    txt: 'teto verde de 1600 mm de largura, de y 2296 a 2470, com a frente inclinada até z 1328',
    tec: 'interseção do perfil lateral inclinado com a seção frontal retangular',
  });

  /* vidros: o para-brisa é uma placa sobre a frente inclinada; os laterais, cascas sobre a lateral da cabine alta */
  const pilar = [[T.capo_fim_z, T.cintura_y], [T.pilar_topo_z, T.cab_alta_y]];
  const xPara = reta(T.cintura_y, T.parabrisa_meia_largura_y0, T.parabrisa_y1, T.parabrisa_meia_largura_y1);
  formas.push({
    nome: 'parabrisa', forma: 'vistas', material: 'vidro',
    lado: placaSobre(...pilar, T.parabrisa_espessura, [T.cab_alta_y - T.cintura_y, T.capo_fim_z - T.pilar_topo_z]),
    frontal: [[-xPara(T.cintura_y), T.cintura_y], [xPara(T.cintura_y), T.cintura_y], [xPara(T.parabrisa_y1), T.parabrisa_y1], [-xPara(T.parabrisa_y1), T.parabrisa_y1]],
    txt: 'placa de vidro azul clara de 20 mm sobre a frente inclinada da cabine, de y 1413 a 2150, de 1520 mm de largura embaixo e 1280 em cima',
    tec: 'interseção da faixa lateral paralela à face com o trapézio frontal',
  });
  const janela = [[T.cab_z_tras, T.cintura_y], [T.vidro_lateral_frente_z, T.cintura_y], [T.vidro_lateral_topo_z, T.vidro_lateral_topo_y],
    [T.cab_z_tras, T.vidro_lateral_topo_y]];
  const e = T.vidro_lateral_espessura;
  const xJ = xAlta(T.vidro_lateral_topo_y);
  for (const { s, l } of LADOS) {
    formas.push({
      nome: `vidroLateral${l}`, forma: 'vistas', material: 'vidro', lado: janela,
      frontal: [[s * M, T.cintura_y], [s * M, T.cab_vertical_y], [s * xJ, T.vidro_lateral_topo_y], [s * (xJ + e), T.vidro_lateral_topo_y],
        [s * (M + e), T.cab_vertical_y], [s * (M + e), T.cintura_y]],
      txt: `janela em placa de vidro de 12 mm sobre a lateral ${s > 0 ? 'direita' : 'esquerda'} da cabine alta, de z 921 a 1880 na base, com a frente inclinada até z 1590 em y 2100`,
      tec: 'interseção do trapézio lateral com a casca frontal que acompanha a lateral da cabine',
    });
  }

  /* faróis amarelos nos cantos do nariz, e a grade escura entre eles */
  const perfilFarol = [[T.nariz_z, yS], [T.nariz_saia_z, yS], [T.nariz_saia_z, T.farol_frente_topo_y], [T.nariz_z, T.nariz_topo_y]];
  for (const { s, l } of LADOS) {
    formas.push({
      nome: `farol${l}`, forma: 'lateral', material: 'amarelo', x0: s > 0 ? T.farol_x0 : -M, largura: M - T.farol_x0, lado: perfilFarol,
      txt: `farol amarelo do canto ${s > 0 ? 'direito' : 'esquerdo'} do nariz, de x 480 a 971, de z 2610 a 2780, de y 1059 a 1283 com a face de cima inclinada`,
      tec: 'extrusao com eixo x do perfil lateral do farol',
    });
  }
  formas.push({
    nome: 'grade', forma: 'lateral', material: 'cinzaEscuro', x0: -T.farol_x0, largura: 2 * T.farol_x0, lado: perfilFarol,
    txt: 'grade escura de 960 mm de largura entre os faróis, com o mesmo perfil deles, de z 2610 a 2780',
    tec: 'extrusao com eixo x do mesmo perfil lateral dos faróis, encostada neles',
  });

  /* retrovisores: caixas da lateral da cabine a x 1324 */
  for (const { s, l } of LADOS) {
    const larg = T.retrovisor_x1 - M;
    formas.push({
      nome: `retrovisor${l}`, forma: 'cubo', material: 'cinzaAzulado', larg, alt: T.retrovisor_y1 - T.retrovisor_y0,
      prof: T.retrovisor_z1 - T.retrovisor_z0, em: [s * (M + larg / 2), T.retrovisor_y0, (T.retrovisor_z0 + T.retrovisor_z1) / 2],
      txt: `caixa cinza azulada de 353 por 350 por 179 mm, da lateral da cabine a x ${s > 0 ? '' : '-'}1324, de y 1240 a 1590`,
      tec: 'cubo encostado na lateral da cabine',
    });
  }

  /* caçamba: o perfil da silhueta (topo plano, ombro, rampa a 45 graus, traseira vertical) com o arco da roda de trás recortado */
  const yRampaTopo = T.cacamba_ombro_y - (T.cacamba_ombro_z - T.cacamba_tras_z); // a rampa externa cai a 45 graus até a traseira
  const rampaFimY = T.piso_y + (T.rampa_z1 - T.rampa_z0); // a rampa interna, paralela, termina aqui
  const arcoTras = arcoDaDireitaParaEsquerda(zT, yR, arcoR, n, yC, yH);
  const arcoTrasParede = arcoDaDireitaParaEsquerda(zT, yR, T.para_lama_raio, n, yC, yH);
  const baixoCacamba = (zFrente, arco = arcoTras) => [[zFrente, yC], ...arco, [T.cacamba_tras_z, yH]];
  for (const { s, l } of LADOS) {
    formas.push({
      nome: `paredeCacamba${l}`, forma: 'lateral', material: 'verde', x0: s > 0 ? M : -W, largura: W - M,
      lado: [...baixoCacamba(T.cab_z_tras, arcoTrasParede), [T.cacamba_tras_z, yRampaTopo], [T.cacamba_ombro_z, T.cacamba_ombro_y],
        [T.cacamba_topo_z, T.cacamba_topo_y], [T.cab_z_tras, T.cacamba_topo_y]],
      txt: `parede ${s > 0 ? 'direita' : 'esquerda'} da caçamba, verde, de 176 mm de espessura, com o topo plano em y 2824, o ombro, a rampa a 45 graus até a traseira em z -2692 e o arco de 688 mm da roda de trás`,
      tec: 'extrusao com eixo x do perfil da silhueta com o arco recortado',
    });
  }
  const yPisoBaixo = T.piso_y - T.piso_espessura;
  const yRampaBaixo = rampaFimY - T.piso_espessura;
  formas.push({
    nome: 'miolo', forma: 'lateral', material: 'verde', x0: -M, largura: 2 * M,
    lado: [...baixoCacamba(T.parede_frente_z0), [T.cacamba_tras_z, T.labio_y], [T.rampa_z1, T.labio_y], [T.rampa_z1, yRampaBaixo],
      [T.rampa_z0, yPisoBaixo], [T.parede_frente_z0, yPisoBaixo]],
    txt: 'miolo verde da caçamba entre as paredes, de 1942 mm de largura, do fundo com o arco da roda de trás ao piso em y 2411, com o lábio traseiro em y 1593',
    tec: 'extrusao com eixo x do perfil do fundo, do piso em rampa e do lábio',
  });
  formas.push({
    nome: 'piso', forma: 'lateral', material: 'cinzaAzulado', x0: -M, largura: 2 * M,
    lado: [[T.parede_frente_z0, T.piso_y], [T.rampa_z0, T.piso_y], [T.rampa_z1, rampaFimY], [T.rampa_z1, yRampaBaixo],
      [T.rampa_z0, yPisoBaixo], [T.parede_frente_z0, yPisoBaixo]],
    txt: 'piso cinza azulado de 60 mm sobre o miolo, plano em y 2471 e depois em rampa a 45 graus até z -2318, entre as paredes',
    tec: 'extrusao com eixo x do perfil do piso, com os mesmos vértices da face de cima do miolo',
  });
  formas.push({
    nome: 'paredeFrenteCacamba', forma: 'cubo', material: 'verde', larg: 2 * M, alt: T.cacamba_topo_y - yC, prof: T.cab_z_tras - T.parede_frente_z0,
    em: [0, yC, (T.cab_z_tras + T.parede_frente_z0) / 2],
    txt: 'parede verde da frente da caçamba, de 1942 por 2294 por 177 mm, de y 529,5 a 2824, de z 744 a 921, atrás da cabine',
    tec: 'cubo encostado na frente do miolo e nas paredes laterais',
  });

  /* pedras de lixo: prismas de seis lados sobre o piso */
  for (const p of T.pedras) {
    const hex = Array.from({ length: 6 }, (_, k) => [arred(p.x + p.r * Math.cos((Math.PI / 3) * k)), arred(p.z + p.r * Math.sin((Math.PI / 3) * k))]);
    formas.push({
      nome: p.nome, forma: 'planta', material: 'pedra', y0: T.piso_y, altura: p.topo - T.piso_y, planta: hex,
      txt: `pedra de lixo cinza azulada, prisma de seis lados de ${2 * p.r} mm, de y 2471 a ${p.topo}, sobre o piso`,
      tec: 'extrusao com eixo y de um hexágono, assentada no piso',
    });
  }

  /* braços: a barra dobrada de cada lado, a ponta verde, o cubo na parede da caçamba e a travessa na frente */
  const cinzaBraco = [T.braco_raiz_frente, T.braco_raiz_tras, T.braco_joelho_baixo, T.braco_dobra_baixo, T.braco_dobra_cima, T.braco_topo,
    T.braco_topo_frente];
  const pontaBraco = [T.braco_dobra_baixo, T.braco_ponta_baixo, T.braco_ponta_cima, T.braco_dobra_cima];
  for (const { s, l } of LADOS) {
    const x0 = s > 0 ? T.braco_x0 : -T.braco_x1;
    const larg = T.braco_x1 - T.braco_x0;
    formas.push({
      nome: `braco${l}`, forma: 'lateral', material: 'cinzaBraco', x0, largura: larg, lado: cinzaBraco,
      txt: `barra cinza do braço ${s > 0 ? 'direito' : 'esquerdo'}, de 146 mm de espessura, de x ${s > 0 ? '1266 a 1412' : '-1412 a -1266'}, do cubo em z 529 sobe até y 2452, segue pela cabine e desce até a dobra em z 2163`,
      tec: 'extrusao com eixo x do perfil dobrado da barra',
    });
    formas.push({
      nome: `pontaBraco${l}`, forma: 'lateral', material: 'verde', x0, largura: larg, lado: pontaBraco,
      txt: `ponta verde do braço ${s > 0 ? 'direito' : 'esquerdo'}, trecho descendente a 45 graus de z 2044 a 2787, de y 2133 a 1390`,
      tec: 'extrusao com eixo x do trecho final da barra, encostada na barra pela face da dobra',
    });
    const R = T.cubo_braco_raio;
    const prof = T.braco_x0 - W;
    formas.push({
      nome: `cuboBraco${l}`, forma: 'lathe', material: 'cinzaBraco', lados: 16, perfil: [[0, 0], [R, 0], [R, prof], [0, prof]],
      em: [s > 0 ? W : -T.braco_x0, T.cubo_braco_y, T.cubo_braco_z],
      txt: `disco cinza de 354 mm de diâmetro e 119 mm de espessura na parede ${s > 0 ? 'direita' : 'esquerda'} da caçamba, em z 529 e y 850, onde nasce o braço`,
      tec: 'lathe em torno de x de um disco',
    });
  }
  formas.push({
    nome: 'travessaBraco', forma: 'lateral', material: 'cinzaBraco', x0: -T.braco_x0, largura: 2 * T.braco_x0,
    lado: [T.travessa_a, T.travessa_b, T.travessa_c, T.travessa_d],
    txt: 'travessa cinza de 2532 mm entre os dois braços, de seção inclinada de 84 por 168 mm, em z 2430 a 2609 e y 1509 a 1687, na frente do capô',
    tec: 'extrusao com eixo x de um paralelogramo inclinado a 45 graus',
  });

  /* barra de levantamento atrás: postes de y 529 a 1790 e pés claros até z -3045 */
  for (const { s, l } of LADOS) {
    formas.push({
      nome: `posteTras${l}`, forma: 'cubo', material: 'cinzaBraco', larg: T.poste_x1 - T.poste_x0, alt: T.poste_y1 - T.pe_y1,
      prof: T.cacamba_tras_z - T.poste_z0, em: [s * (T.poste_x0 + T.poste_x1) / 2, T.pe_y1, (T.cacamba_tras_z + T.poste_z0) / 2],
      txt: `poste cinza ${s > 0 ? 'direito' : 'esquerdo'} da barra de levantamento, de x 790 a 974, de y 529 a 1790, de z -2870 a -2692, colado na traseira da caçamba`,
      tec: 'cubo encostado na traseira da caçamba e assentado no pé',
    });
    formas.push({
      nome: `peTras${l}`, forma: 'cubo', material: 'cinzaClaro', larg: T.poste_x1 - T.pe_x0, alt: T.pe_y1 - T.pe_y0,
      prof: T.cacamba_tras_z - T.pe_z0, em: [s * (T.poste_x1 + T.pe_x0) / 2, T.pe_y0, (T.cacamba_tras_z + T.pe_z0) / 2],
      txt: `pé claro ${s > 0 ? 'direito' : 'esquerdo'} da barra de levantamento, de x 617 a 974, de y 441 a 529, de z -3045 a -2692`,
      tec: 'cubo sob o poste',
    });
  }

  /* para-lamas: faixa cinza de 590 a 688 de raio no plano da lateral (x 971 a 1147); atrás ela vai de y 529,5 (chassi central) a y 706
   * (chassi de trás), na frente começa em y 765, sobre o para-choque */
  for (const r of rodas) {
    const [nivelDir, nivelEsq] = r.ponta === 'Frente' ? [yPC, yPC] : [yC, yH];
    const ext = arcoDaDireitaParaEsquerda(r.zc, yR, T.para_lama_raio, n, nivelDir, nivelEsq);
    const int = arcoDaDireitaParaEsquerda(r.zc, yR, arcoR, n, nivelDir, nivelEsq);
    formas.push({
      nome: `paraLama${r.ponta}${r.lado}`, forma: 'lateral', material: 'cinza', x0: r.s > 0 ? T.para_lama_x0 : -W, largura: W - T.para_lama_x0,
      lado: [...ext, ...[...int].reverse()],
      txt: `faixa de para-lama de 176 mm de espessura sobre a roda ${r.ponta === 'Frente' ? 'da frente' : 'de trás'} ${r.lado === 'Dir' ? 'à direita' : 'à esquerda'}, de 590 a 688 mm de raio, de x 971 a 1147, no plano da lateral`,
      tec: 'extrusao com eixo x de uma faixa em arco entre os raios 590 e 688',
    });
  }

  /* suportes da barra de levantamento: quatro blocos que saem da lateral da caçamba, atrás */
  for (const { s, l } of LADOS) {
    for (const [nome, ya, yb] of [['Alto', T.suporte_alto_y0, T.suporte_alto_y1], ['Baixo', T.suporte_baixo_y0, T.suporte_baixo_y1]]) {
      formas.push({
        nome: `suporte${nome}${l}`, forma: 'cubo', material: 'cinzaBraco', larg: T.suporte_x1 - W, alt: yb - ya, prof: T.suporte_z1 - T.suporte_z0,
        em: [s * (W + T.suporte_x1) / 2, ya, (T.suporte_z0 + T.suporte_z1) / 2],
        txt: `bloco cinza ${nome === 'Alto' ? 'de cima' : 'de baixo'} do suporte ${s > 0 ? 'direito' : 'esquerdo'} da barra de levantamento, de x ${s > 0 ? '1147 a 1235' : '-1235 a -1147'}, de y ${ya} a ${yb}, de z -2787 a -2537`,
        tec: 'cubo encostado na lateral da caçamba',
      });
    }
  }

  /* caixas de roda: o arco do perfil entre as faces de dentro dos pneus; a da frente fecha em y 1059, sob a cabine */
  const frenteArco = [...arcoEsq(zF, y0, yS), ...arcoDir(zF, y0, yS)];
  formas.push({
    nome: 'caixaRodaFrente', forma: 'lateral', material: 'caixaRoda', x0: -T.roda_x_dentro, largura: 2 * T.roda_x_dentro, lado: frenteArco,
    txt: 'caixa escura do arco dianteiro, de 1059 mm de largura entre as faces de dentro dos pneus, com 590 mm de raio, de y 353 a 1059',
    tec: 'extrusao com eixo x do arco do perfil, fechado em y 353 e em y 1059',
  });
  formas.push({
    nome: 'caixaRodaTras', forma: 'lateral', material: 'caixaRoda', x0: -T.roda_x_dentro, largura: 2 * T.roda_x_dentro,
    lado: capaAcima(zT, yR, arcoR, n, y0),
    txt: 'caixa escura do arco traseiro, de 1059 mm de largura entre as faces de dentro dos pneus, com 590 mm de raio, fechada em y 353',
    tec: 'extrusao com eixo x do próprio arco do perfil, fechado na base',
  });

  /* rodas: pneu com chanfro e furo para o cubo, e cubo com recesso, revoluções em torno de x */
  const R = T.roda_raio;
  const L = T.roda_x_fora - T.roda_x_dentro;
  const cl = T.pneu_chanfro_largura;
  const pneu = [[T.pneu_furo_raio, 0], [T.pneu_chanfro_raio, 0], [R, cl], [R, L - cl], [T.pneu_chanfro_raio, L], [T.pneu_furo_raio, L]];
  const a0 = L - T.cubo_profundidade;
  const cuboDir = [[0, a0], [T.pneu_furo_raio, a0], [T.pneu_furo_raio, L], [T.cubo_recesso_raio, L],
    [T.cubo_recesso_fundo_raio, L - T.cubo_recesso_profundidade], [0, L - T.cubo_recesso_profundidade]];
  const cuboEsq = cuboDir.map(([r, a]) => [r, L - a]);
  for (const r of rodas) {
    const posicao = `${r.ponta === 'Frente' ? 'da frente' : 'de trás'} ${r.lado === 'Dir' ? 'à direita' : 'à esquerda'}`;
    formas.push({
      nome: `roda${r.ponta}${r.lado}`, forma: 'lathe', material: 'pneu', liso: true, secao: true, lados: n, perfil: pneu,
      em: [r.s > 0 ? T.roda_x_dentro : -T.roda_x_fora, yR, r.zc],
      txt: `pneu escuro de 1059 mm de diâmetro e 530 mm de largura com chanfro e furo de 500 mm para o cubo, centro em y 529,5 e z ${r.zc}, ${r.lado === 'Dir' ? 'à direita' : 'à esquerda'}`,
      tec: 'lathe em torno de x, com o chanfro e o furo no perfil',
    });
    formas.push({
      nome: `cubo${r.ponta}${r.lado}`, forma: 'lathe', material: 'cubo', liso: true, lados: n, perfil: r.s > 0 ? cuboDir : cuboEsq,
      em: [r.s > 0 ? T.roda_x_dentro : -T.roda_x_fora, yR, r.zc],
      txt: `cubo cinza azulado de 500 mm de diâmetro e 88 mm de profundidade, embutido na face de fora do pneu ${posicao}, com recesso cônico no centro`,
      tec: 'lathe em torno de x, com o recesso no perfil',
    });
  }
  return formas;
}

/* ---------- passos ---------- */

const emMetro = (v) => v.map(m);
const perfilM = (pontos) => pontos.map(([u, v]) => [m(u), m(v)]);
const LARGURA_MAX = 1450; // meia largura que os prismas lateral e de planta cobrem
const COMPRIMENTO_MAX = 3100; // meio comprimento dos prismas frontal e de planta

/* Os passos de uma forma, com os ids do bloco `base`: a forma leva base + 1 (e +2, +3 nas extrusões da interseção) e a interseção, base + 10. */
function passosDaForma(f, base) {
  const passos = [];
  let sel;
  if (f.forma === 'vistas') {
    passos.push(['extrusao', { origemId: base + 1, eixo: 'x', altura: m(2 * LARGURA_MAX), em: [m(-LARGURA_MAX), 0, 0], perfil: perfilM(perfilLateral(f.lado)) }]);
    passos.push(['extrusao', { origemId: base + 2, eixo: 'z', altura: m(2 * COMPRIMENTO_MAX), em: [0, 0, m(-COMPRIMENTO_MAX)], perfil: perfilM(secaoFrontal(f.frontal)) }]);
    passos.push(['intersectar', { origemId: base + 10, solidos: [{ origem: { op: 'extrusao', id: base + 1 } }, { origem: { op: 'extrusao', id: base + 2 } }] }]);
    sel = { origem: { op: 'intersectar', id: base + 10 } };
  } else if (f.forma === 'lateral') {
    passos.push(['extrusao', { origemId: base + 1, eixo: 'x', altura: m(f.largura), em: [m(f.x0), 0, 0], perfil: perfilM(perfilLateral(f.lado)) }]);
    sel = { origem: { op: 'extrusao', id: base + 1 } };
  } else if (f.forma === 'cubo') {
    passos.push(['cubo', { origemId: base + 1, larg: m(f.larg), alt: m(f.alt), prof: m(f.prof), em: emMetro(f.em) }]);
    sel = { origem: { op: 'cubo', id: base + 1 } };
  } else if (f.forma === 'planta') {
    passos.push(['extrusao', { origemId: base + 1, eixo: 'y', altura: m(f.altura), em: [0, m(f.y0), 0], perfil: perfilM(antihorario(f.planta)) }]);
    sel = { origem: { op: 'extrusao', id: base + 1 } };
  } else {
    /* um perfil que não toca o eixo (o pneu, com o furo do cubo) só fecha como seção: `furos: []` liga esse modo */
    passos.push(['lathe', { origemId: base + 1, eixo: 'x', perfil: perfilM(f.perfil), ...(f.secao ? { furos: [] } : {}), lados: f.lados, em: emMetro(f.em) }]);
    sel = { origem: { op: 'lathe', id: base + 1 } };
  }
  passos.push(['parte', { nome: f.nome, sel }]);
  passos.push(['material', { sel, usa: f.material }]);
  if (f.liso) passos.push(['liso', { angulo: 30, sel }]);
  return passos;
}

/** Os PASSOS: cada forma, a `parte` e o `material` logo depois. */
export function gerarPassos(T) {
  return derivar(T).flatMap((f, k) => passosDaForma(f, 100 * (k + 1)));
}

/* ---------- contatos ---------- */

const PONTAS = ['Frente', 'Tras'];
const LADOS = ['Dir', 'Esq'];

/* Os contatos, declarados antes de medir: cada par se toca pela face ou pela aresta que o motivo diz. */
export const CONTATOS = [
  // chassi, para-choque, placas
    { par: ['paraChoqueFrente', 'saiaNariz'], motivo: 'a face de cima do para-choque, em y 765, recebe a face de baixo da saia do nariz' },
  { par: ['paraChoqueFrente', 'placaFrente'], motivo: 'a face de trás da placa encosta na face da frente do para-choque, em z 2956' },
  { par: ['chassiTras', 'placaTras'], motivo: 'a face da frente da placa de trás encosta na face de trás do chassi, em z -2239' },
  // saias e cabine
  { par: ['chassiCentro', 'saiaCabine'], motivo: 'a face de baixo da saia da cabine, em y 529,5, assenta na face de cima do chassi central' },
  { par: ['saiaCabine', 'cabineBaixa'], motivo: 'a face de baixo da cabine baixa, em y 1059, assenta na face de cima da saia' },
  { par: ['saiaNariz', 'cabineBaixa'], motivo: 'a face de baixo da cabine baixa, em y 1059, assenta na face de cima da saia do nariz' },
  { par: ['cabineBaixa', 'cabineAlta'], motivo: 'a face de baixo da cabine alta, em y 1413, assenta no tampo da cabine baixa' },
  { par: ['cabineAlta', 'tetoCabine'], motivo: 'a face de baixo do teto, em y 2296, assenta na face de cima da cabine alta, com o mesmo retângulo' },
  { par: ['cabineAlta', 'parabrisa'], motivo: 'a face de trás do para-brisa é o mesmo plano da frente inclinada da cabine alta' },
  { par: ['cabineBaixa', 'parabrisa'], motivo: 'a aresta de baixo do para-brisa assenta no tampo da cabine baixa, em y 1413, só pela aresta' },
  { par: ['cabineBaixa', 'farolDir'], motivo: 'a face de trás do farol é o mesmo plano da frente do nariz, em z 2610, de y 1059 a 1283' },
  { par: ['cabineBaixa', 'farolEsq'], motivo: 'a face de trás do farol é o mesmo plano da frente do nariz, em z 2610, de y 1059 a 1283' },
  { par: ['saiaNariz', 'farolDir'], motivo: 'a face de baixo do farol, em y 1059, assenta na face de cima da saia do nariz' },
  { par: ['saiaNariz', 'farolEsq'], motivo: 'a face de baixo do farol, em y 1059, assenta na face de cima da saia do nariz' },
  { par: ['grade', 'farolDir'], motivo: 'a face de fora da grade, em x 480, encosta na face de dentro do farol, com o mesmo perfil' },
  { par: ['grade', 'farolEsq'], motivo: 'a face de fora da grade, em x -480, encosta na face de dentro do farol, com o mesmo perfil' },
  { par: ['grade', 'cabineBaixa'], motivo: 'a face de trás da grade encosta na frente do nariz, em z 2610' },
  { par: ['grade', 'saiaNariz'], motivo: 'a face de baixo da grade, em y 1059, assenta na face de cima da saia do nariz' },
  ...LADOS.flatMap((l) => [
    { par: ['cabineAlta', `vidroLateral${l}`], motivo: 'a face de dentro do vidro lateral é o mesmo plano da lateral da cabine alta' },
    { par: ['cabineBaixa', `vidroLateral${l}`], motivo: 'a aresta de baixo do vidro lateral, em y 1413, toca o canto da lateral da cabine baixa, só pela aresta' },
    { par: ['cabineBaixa', `retrovisor${l}`], motivo: 'a face de dentro do retrovisor encosta na lateral da cabine baixa, em x 971 ou -971, de y 1240 a 1413' },
    { par: ['cabineAlta', `retrovisor${l}`], motivo: 'a face de dentro do retrovisor encosta na lateral vertical da cabine alta, em x 971 ou -971, de y 1413 a 1590' },
    { par: [`retrovisor${l}`, `vidroLateral${l}`], motivo: 'o retrovisor toca a quina de baixo do vidro lateral, em y 1413, só pela aresta' },
  ]),
  // caçamba
  { par: ['miolo', 'chassiCentro'], motivo: 'a face de baixo do miolo, em y 529,5, assenta na face de cima do chassi central' },
  { par: ['miolo', 'chassiTras'], motivo: 'a face de baixo do miolo, em y 706, assenta na face de cima do chassi de trás' },
  { par: ['miolo', 'piso'], motivo: 'a face de baixo do piso é a face de cima do miolo, com os mesmos vértices do perfil' },
  { par: ['miolo', 'paredeFrenteCacamba'], motivo: 'a face da frente do miolo, em z 744, encosta na face de trás da parede da frente' },
  { par: ['piso', 'paredeFrenteCacamba'], motivo: 'a face da frente do piso, em z 744, encosta na face de trás da parede da frente' },
  { par: ['paredeFrenteCacamba', 'cabineBaixa'], motivo: 'a face da frente da parede, em z 921, encosta na face de trás da cabine baixa' },
  { par: ['paredeFrenteCacamba', 'cabineAlta'], motivo: 'a face da frente da parede, em z 921, encosta na face de trás da cabine alta' },
  { par: ['paredeFrenteCacamba', 'tetoCabine'], motivo: 'a face da frente da parede, em z 921, encosta na face de trás do teto verde' },
  { par: ['paredeFrenteCacamba', 'chassiCentro'], motivo: 'a face de baixo da parede da frente, em y 529,5, assenta na face de cima do chassi central' },
  { par: ['paredeFrenteCacamba', 'saiaCabine'], motivo: 'a face de trás da saia da cabine encosta na face da frente da parede, em z 921' },
  ...LADOS.flatMap((l) => [
    { par: [`paredeCacamba${l}`, 'miolo'], motivo: 'a face de dentro da parede, em x 971 ou -971, encosta na lateral do miolo' },
    { par: [`paredeCacamba${l}`, 'piso'], motivo: 'a face de dentro da parede, em x 971 ou -971, encosta na lateral do piso' },
    { par: [`paredeCacamba${l}`, `vidroLateral${l}`], motivo: 'a face da frente da parede, em z 921, toca a face de trás do vidro lateral, só pela borda' },
    { par: ['paredeFrenteCacamba', `vidroLateral${l}`], motivo: 'a face da frente da parede, em z 921, encosta na face de trás do vidro lateral' },
    { par: [`paredeCacamba${l}`, 'paredeFrenteCacamba'], motivo: 'a face de dentro da parede, em x 971 ou -971, encosta na lateral da parede da frente' },
    { par: [`paredeCacamba${l}`, 'chassiCentro'], motivo: 'a face de baixo da parede, em y 529,5, assenta na face de cima do chassi central' },
    { par: [`paredeCacamba${l}`, 'chassiTras'], motivo: 'a face de baixo da parede, em y 706, assenta na face de cima do chassi de trás' },
    { par: [`paredeCacamba${l}`, 'saiaCabine'], motivo: 'a face da frente da parede, em z 921, encosta na face de trás da saia da cabine' },
    { par: [`paredeCacamba${l}`, 'cabineBaixa'], motivo: 'a face da frente da parede, em z 921, encosta na face de trás da cabine baixa, só pela borda de dentro, em x 971' },
    { par: [`paredeCacamba${l}`, 'cabineAlta'], motivo: 'a face da frente da parede, em z 921, encosta na face de trás da cabine alta, só pela borda de dentro, em x 971' },
    { par: [`paredeCacamba${l}`, `posteTras${l}`], motivo: 'a face de trás da parede, em z -2692, encosta na face da frente do poste' },
    { par: ['miolo', `posteTras${l}`], motivo: 'a face de trás do miolo, em z -2692, encosta na face da frente do poste' },
    { par: [`posteTras${l}`, `peTras${l}`], motivo: 'a face de baixo do poste, em y 529, assenta na face de cima do pé' },
    { par: [`paredeCacamba${l}`, `cuboBraco${l}`], motivo: 'a face de dentro do cubo do braço encosta na parede da caçamba, em x 1147 ou -1147' },
    { par: [`cuboBraco${l}`, `braco${l}`], motivo: 'a face de fora do cubo, em x 1266 ou -1266, encosta na raiz da barra do braço' },
    { par: [`braco${l}`, `pontaBraco${l}`], motivo: 'a face da dobra da barra é a mesma face da ponta verde, com os mesmos vértices' },
    { par: [`pontaBraco${l}`, 'travessaBraco'], motivo: 'a face de fora da travessa, em x 1266 ou -1266, encosta na face de dentro da ponta verde' },
  ]),
  { par: ['piso', 'pedraA'], motivo: 'a face de baixo da pedra, em y 2471, assenta na face de cima do piso' },
  { par: ['piso', 'pedraB'], motivo: 'a face de baixo da pedra, em y 2471, assenta na face de cima do piso' },
  { par: ['piso', 'pedraD'], motivo: 'a face de baixo da pedra, em y 2471, assenta na face de cima do piso' },
  { par: ['piso', 'pedraE'], motivo: 'a face de baixo da pedra, em y 2471, assenta na face de cima do piso' },
  { par: ['piso', 'pedraF'], motivo: 'a face de baixo da pedra, em y 2471, assenta na face de cima do piso' },
  { par: ['piso', 'pedraG'], motivo: 'a face de baixo da pedra, em y 2471, assenta na face de cima do piso' },
  { par: ['cabineBaixa', 'rodaFrenteDir'], motivo: 'o topo do pneu da frente, em y 1059, toca a face de baixo da cabine baixa numa linha, só pela aresta' },
  { par: ['cabineBaixa', 'rodaFrenteEsq'], motivo: 'o topo do pneu da frente, em y 1059, toca a face de baixo da cabine baixa numa linha, só pela aresta' },
  { par: ['caixaRodaFrente', 'paraChoqueFrente'], motivo: 'a quina de trás da caixa de roda, em y 353, fica a poucos milímetros da face de trás do para-choque, dentro da tolerância' },
  // rodas, caixas e para-lamas
  ...PONTAS.flatMap((p) => LADOS.flatMap((l) => [
    { par: [`caixaRoda${p}`, `roda${p}${l}`], motivo: 'a face de dentro do pneu, em x 529,5 ou -529,5, encosta na face da caixa de roda' },
    { par: [`cubo${p}${l}`, `roda${p}${l}`], motivo: 'o cubo enche o furo de 250 mm de raio na face de fora do pneu e encosta na parede do furo' },
  ])),
  { par: ['caixaRodaFrente', 'chassiCentro'], motivo: 'a caixa de roda enche o arco do perfil e encosta nas faces do arco do chassi central' },
  { par: ['caixaRodaFrente', 'saiaCabine'], motivo: 'a caixa de roda enche o arco do perfil e encosta nas faces do arco da saia da cabine' },
  { par: ['caixaRodaFrente', 'cabineBaixa'], motivo: 'a face de cima da caixa de roda, em y 1059, encosta na face de baixo da cabine baixa' },
  { par: ['caixaRodaTras', 'chassiCentro'], motivo: 'a caixa de roda enche o arco do perfil e encosta nas faces do arco do chassi central' },
  { par: ['caixaRodaTras', 'chassiTras'], motivo: 'a caixa de roda enche o arco do perfil e encosta nas faces do arco do chassi de trás' },
  { par: ['caixaRodaTras', 'miolo'], motivo: 'a caixa de roda enche o arco do perfil e encosta nas faces do arco do miolo' },
  ...LADOS.flatMap((l) => [
    { par: [`paraLamaFrente${l}`, 'saiaCabine'], motivo: 'a faixa do para-lama encosta nas faces do arco de 688 mm da saia da cabine, e a base dela, em y 765, assenta no degrau da saia' },
    { par: [`paraLamaFrente${l}`, 'saiaNariz'], motivo: 'a faixa do para-lama encosta nas faces do arco de 688 mm da saia do nariz' },
    { par: [`paraLamaFrente${l}`, 'paraChoqueFrente'], motivo: 'a base da faixa do para-lama, em y 765, assenta na face de cima do para-choque' },
    { par: [`paraLamaFrente${l}`, 'cabineBaixa'], motivo: 'a face de dentro da faixa do para-lama, em x 971 ou -971, encosta na lateral da cabine baixa' },
    { par: [`paraLamaTras${l}`, `paredeCacamba${l}`], motivo: 'a faixa do para-lama encosta nas faces do arco de 688 mm da parede da caçamba' },
    { par: [`paraLamaTras${l}`, 'miolo'], motivo: 'a face de dentro da faixa do para-lama, em x 971 ou -971, encosta na lateral do miolo' },
    { par: [`paraLamaTras${l}`, 'chassiCentro'], motivo: 'a base da faixa do para-lama, em y 529,5, assenta na face de cima do chassi central' },
    { par: [`paraLamaTras${l}`, 'chassiTras'], motivo: 'a base da faixa do para-lama, em y 706, assenta na face de cima do chassi de trás' },
    ...['Alto', 'Baixo'].map((a) => ({ par: [`suporte${a}${l}`, `paredeCacamba${l}`], motivo: 'a face de dentro do bloco, em x 1147 ou -1147, encosta na lateral da caçamba' })),
  ]),
];

/* ---------- pontos declarados ---------- */

export function pontosDeclarados(T = TABELA) {
  const tol = 1;
  return [
    { nome: 'canto da frente, em cima, do para-choque da frente', parte: 'paraChoqueFrente', medida: 'maximo', em: [T.chassi_meia_largura, T.para_choque_y1, T.para_choque_z1], toleranciaMm: tol },
    { nome: 'canto da frente, em cima, da placa da frente', parte: 'placaFrente', medida: 'maximo', em: [T.placa_meia_largura, T.placa_frente_y1, T.placa_frente_z1], toleranciaMm: tol },
    { nome: 'canto de trás, embaixo, da placa de trás', parte: 'placaTras', medida: 'minimo', em: [-T.placa_meia_largura, T.placa_tras_y0, T.placa_tras_z1], toleranciaMm: tol },
    { nome: 'topo da caçamba, na frente, à direita', parte: 'paredeCacambaDir', medida: 'maximo', em: [T.chassi_meia_largura, T.cacamba_topo_y, T.cacamba_frente_z], toleranciaMm: tol },
    { nome: 'canto de cima do teto da cabine, na frente', parte: 'tetoCabine', medida: 'maximo', em: [T.teto_meia_largura, T.teto_y, T.pilar_topo_z], toleranciaMm: tol },
    { nome: 'ponta de trás do pé da barra de levantamento', parte: 'peTrasEsq', medida: 'minimo', em: [-T.poste_x1, T.pe_y0, T.pe_z0], toleranciaMm: tol },
    { nome: 'topo do poste direito da barra de levantamento', parte: 'posteTrasDir', medida: 'maximo', em: [T.poste_x1, T.poste_y1, T.cacamba_tras_z], toleranciaMm: tol },
    { nome: 'topo da dobra do braço direito e ponta da frente', parte: 'pontaBracoDir', medida: 'maximo', em: [T.braco_x1, T.braco_dobra_cima[1], T.braco_ponta_cima[0]], toleranciaMm: tol },
    { nome: 'ponta do retrovisor direito', parte: 'retrovisorDir', medida: 'maximo', em: [T.retrovisor_x1, T.retrovisor_y1, T.retrovisor_z1], toleranciaMm: tol },
    { nome: 'pneu de trás, à esquerda, embaixo', parte: 'rodaTrasEsq', medida: 'minimo', em: [-T.roda_x_fora, 0, T.roda_z_tras - T.roda_raio], toleranciaMm: tol },
    { nome: 'pneu da frente, à direita, na frente e em cima', parte: 'rodaFrenteDir', medida: 'maximo', em: [T.roda_x_fora, 2 * T.roda_raio, T.roda_z_frente + T.roda_raio], toleranciaMm: tol },
    { nome: 'centro do farol direito', parte: 'farolDir', medida: 'centro', em: [(T.farol_x0 + T.caixa_meia_largura) / 2, (T.saia_topo_y + T.nariz_topo_y) / 2 - 10, (T.nariz_z + T.nariz_saia_z) / 2], toleranciaMm: 40 },
  ];
}

const receita = {
  meta: { nome: 'caminhao-lixo', desc: 'caminhão de coleta de lixo de brinquedo, verde, de caçamba aberta com pedras, braços sobre a cabine, chassi cinza e rodas grandes, recriado do modelo garbage-truck do pacote A, de autor A' },
  PARAMS: TABELA,
  MATERIAIS: {
    verde: { tipo: 'liso', cor: '#3fa97a', acabamento: 'pintado' },
    vidro: { tipo: 'liso', cor: '#cfe6fb', acabamento: 'pintado' },
    cinza: { tipo: 'liso', cor: '#6d6f84', acabamento: 'pintado' },
    cinzaEscuro: { tipo: 'liso', cor: '#4d4e5f', acabamento: 'pintado' },
    cinzaClaro: { tipo: 'liso', cor: '#d6d6e5', acabamento: 'pintado' },
    cinzaAzulado: { tipo: 'liso', cor: '#7a7e93', acabamento: 'pintado' },
    cinzaBraco: { tipo: 'liso', cor: '#6f7288', acabamento: 'pintado' },
    pedra: { tipo: 'liso', cor: '#8a8fa6', acabamento: 'pintado' },
    caixaRoda: { tipo: 'liso', cor: '#2c2d35', acabamento: 'pintado' },
    amarelo: { tipo: 'liso', cor: '#f5c01b', acabamento: 'pintado' },
    pneu: { tipo: 'liso', cor: '#36363a', acabamento: 'pintado' },
    cubo: { tipo: 'metal', cor: '#959cbb', acabamento: 'escovado' },
  },
  TOPO: { origem: 'chão, no meio do caminhão em x e em z; y para cima e a frente do caminhão em +z' },
  PLANO: {
    objeto: 'caminhão de lixo de brinquedo de 6088 mm de comprimento, 2648 mm de largura com espelhos e 2824 mm de altura, de cabine clara com teto verde, caçamba verde aberta com pedras, braços sobre a cabine e rodas grandes',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total do caminhão, de z -3045 a 3044, com as placas e a barra de levantamento', milimetros: 6089 },
    familia: 'veiculo',
    get partes() { return derivar(TABELA).map((f) => ({ nome: f.nome, forma: f.txt, tecnica: f.tec })); },
    criteriosDeReprovacao: [
      'a caixa total não fica em x -1412 a 1412, y 0 a 2824 e z -3045 a 3044, ou alguma roda não toca o chão',
      'um lado do caminhão difere do outro em medida ou posição de peça simétrica',
      'a cabine e a caçamba saem de um perfil só: a caçamba precisa ser mais larga (2294 contra 1942 mm) e subir de y 2470 a 2824 atrás da cabine',
      'a caçamba é um bloco maciço fechado no topo: ela precisa de bordas de 176 mm, piso em y 2471 com rampa a 45 graus atrás e pedras sobre o piso',
      'os braços não sobem pelos lados da caçamba, passam sobre a cabine e descem até a travessa na frente do capô',
      'as rodas ficam escondidas, sem arco recortado no perfil, sem caixa de roda e sem anel de para-lama saliente em volta do pneu',
      'a silhueta lateral, frontal ou de cima difere da referência, vista na folha comparativa, em mais de dois por cento do comprimento',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;

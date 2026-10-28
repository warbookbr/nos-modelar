/* carro-sedan-classico — sedã de caixa dos anos 80, vermelho, de cabine longa e estufa afunilada, com capô de tomada de ar, para-lamas
 * em volta dos arcos das rodas, vidros com moldura, para-choques de cantos arredondados, faróis e grade na frente, lanternas atrás,
 * retrovisores e quatro rodas de pneu com aro de raios e cubo.
 *
 * Origem: "pacote B", de autor B, publicado em repositório de modelos livres sob licença livre sem exigência de crédito, pacote "pacote-b" da tabela
 * docs/modelar/veiculos-referencias.json, página endereço omitido. A malha (pacote-b.obj, com dois objetos: "Cylinder",
 * as quatro rodas, e "Cube", a carroceria) NÃO está no repositório: fica em importados/veiculos-livres/pacote-b/pacote-b.obj, ignorada pelo git.
 * Daqui vêm só as medidas de referencias/fonte-partes.json (caixas e silhuetas em fatias, em metro) e as vistas de
 * referencias/fonte-vistas.png. O que não ficou igual à fonte está em referencias/alvo.md.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente do carro em +z, x para a direita de quem olha de frente, centrado em x e
 * z. A TABELA, em milímetro, é a única fonte das medidas; `derivar` calcula as formas e `gerarPassos` escreve a forma, a `parte` e o
 * `material` de cada uma, com a conversão para metro num lugar só (`m`). Nenhuma posição é digitada no passo.
 *
 * Técnica: cada volume da carroceria é a INTERSEÇÃO de prismas dos mesmos perfis. O perfil lateral (z, y) é extrudado em x, a seção
 * frontal (x, y) é extrudada em z, a planta (x, z) é extrudada em y, e uma caixa recorta a faixa da parte. A carroceria de baixo sai do
 * perfil lateral com os arcos das rodas recortados no próprio perfil (sem booleana de cilindro) e da planta; a cabine sai do perfil
 * lateral e da seção frontal que afunila 120 mm por lado até o teto; cada para-lama é a mesma interseção, só do que passa de x 860. Os
 * vidros são placas de 12 mm por fora das faces da cabine, com a moldura (70 mm) deixada pela seção recuada. Como as partes saem dos
 * mesmos prismas e dos mesmos planos de corte, as faces de encontro coincidem por construção.
 */

const m = (mm) => mm / 1000;
const arred = (v) => Math.round(v * 1e6) / 1e6;

export const TABELA = {
  comprimento_total: 4400,       // a medida que dá a escala (de z -2200 a 2200)
  altura_total: 1523,            // do chão ao teto
  meia_largura_total: 986,       // até a ponta dos retrovisores
  folga_prisma: 100,             // quanto os prismas passam das medidas externas, para o corte ficar por conta da caixa

  // carroceria de baixo: perfil lateral (z, y), planta (z, meia largura) e meia largura de 860 mm nas portas
  corpo_meia_largura: 860,
  corpo_base_y: 419,
  corpo_base_tras_y: 460,
  corpo_topo_y: 1000,
  nariz_z: 2122,
  nariz_topo_y: 970,
  capo_fim_z: 1879,              // onde o capô chega ao plano do topo
  porta_malas_z: -1421,
  traseira_z: -2087,
  traseira_topo_y: 972,
  planta: [[2122, 770], [2060, 852], [2000, 872], [1700, 926], [1421, 934], [871, 933], [700, 885], [560, 860], [-560, 860], [-700, 885], [-800, 913], [-1237, 928], [-1650, 911], [-1925, 888], [-2087, 880]],

  // para-lamas: o que passa de x 860 em volta do arco; seção frontal (meia largura, y), da base ao topo chanfrado
  paraLama_frente_z0: 700,
  paraLama_frente_z1: 2000,
  paraLama_tras_z0: -2150,       // a caixa passa da traseira em 63 mm; a face de trás sai do perfil lateral
  paraLama_tras_z1: -700,
  paraLama_x1: 1000,
  paraLama_secao: [[935, 300], [935, 790], [880, 900]],

  // capô: tomada de ar elevada sobre o capô, perfil lateral (z, y) do topo e planta em trapézio (z, meia largura)
  capo_perfil: [[1768, 1098], [871, 1098], [779, 1088]],
  capo_ponta_frente: [1660, 1000],   // onde a rampa da frente chega ao topo do capô (o topo avança 108 mm além dela, como a fonte)
  capo_ponta_tras: [720, 1000],      // onde a rampa de trás chega ao cowl
  capo_base_y: 950,                  // a base do prisma passa 50 mm abaixo do topo; a caixa corta em y 1000
  capo_planta: [[1768, 446], [636, 213]],

  // cabine: perfil lateral (z, y) do pé do para-brisa ao pé do vidro de trás, e seção frontal que afunila
  cabine_perfil: [[688, 1000], [321, 1472], [229, 1523], [-1054, 1523], [-1100, 1463], [-1283, 1066], [-1313, 1000]],
  cabine_meia_largura_base: 850,     // em y 1000
  cabine_meia_largura_topo: 730,     // em y 1523
  cabine_base_y: 1000,

  // vidros: placas de 12 mm por fora das faces da cabine, com moldura de 70 mm
  vidro_espessura: 12,
  vidro_moldura: 70,
  parabrisa_y0: 1075,
  parabrisa_y1: 1425,
  vidroTraseiro_y0: 1110,
  vidroTraseiro_y1: 1420,
  janelaFrente: [[446, 1075], [250, 1450], [-697, 1450], [-697, 1075]],
  janelaTras: [[-852, 1075], [-852, 1450], [-1030, 1450], [-1190, 1075]],

  // para-choques: placas de planta com cantos arredondados, encostadas nas faces da frente e de trás da carroceria
  paraChoqueFrente_z1: 2198,
  paraChoqueFrente_meia_largura: 770,
  paraChoqueFrente_y0: 413,
  paraChoqueFrente_y1: 745,
  paraChoqueFrente_meia_largura_ponta: 728,   // a face da frente é mais estreita que o fundo, como a planta da fonte (728 mm em z 2200)
  paraChoqueTras_z1: -2200,
  paraChoqueTras_meia_largura: 856,
  paraChoqueTras_y0: 457,
  paraChoqueTras_y1: 745,
  paraChoqueTras_raio: 100,
  paraChoque_segmentos_arco: 8,
  
  // faróis, grade e lanternas: placas sobre as faces da frente e de trás
  farol_x0: 330,
  farol_x1: 760,
  farol_y0: 755,
  farol_y1: 945,
  farol_esp: 14,
  grade_meia_largura: 283,
  grade_y0: 765,
  grade_y1: 935,
  grade_esp: 22,
  lanterna_x0: 440,
  lanterna_x1: 840,
  lanterna_y0: 815,
  lanterna_y1: 925,
  lanterna_esp: 12,

  // retrovisores: caixas que saem da lateral da carroceria até x 986
  retrovisor_y0: 972,
  retrovisor_y1: 1047,
  retrovisor_z0: 321,
  retrovisor_z1: 413,

  // rodas: pneu (revolução com chanfro), aro de raios (disco com 8 vazios) e cubo, todos de eixo x
  roda_raio: 364,
  roda_z_frente: 1249,
  roda_z_tras: -1181,
  roda_x_fora: 927,              // a face de fora do cubo
  pneu_largura: 205,
  pneu_chanfro: 24,
  pneu_lados: 32,
  aro_raio: 255,
  aro_esp: 7,
  aro_raios: 8,
  aro_vazio_raio_interno: 75,
  aro_vazio_raio_externo: 222,
  aro_largura_do_raio: 34,
  aro_segmentos_arco: 8,         // por quarto de volta
  cubo_raio: 62,
  cubo_esp: 10,
  cubo_lados: 16,
  arco_folga: 40,                // o arco tem raio de pneu mais 40 mm
  arco_lados: 12,
};

/* ---- geometria 2D em milímetro ---- */

const area = (l) => l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0) / 2;
const antihorario = (l) => (area(l) < 0 ? [...l].reverse() : l);
const espelhar = (meia) => [...meia, ...[...meia].reverse().map(([x, y]) => [-x, y])];

/* Prolonga a reta de a por b até a altura y (devolve [z, y]). */
const prolongar = ([za, ya], [zb, yb], y) => [za + ((zb - za) * (y - ya)) / (yb - ya), y];
const zNaReta = (a, b, y) => prolongar(a, b, y)[0];

/* Pontos do arco da roda no perfil lateral, de trás para a frente, do plano da base ao plano da base. */
function arcoDaRoda(T, zc) {
  const R = T.roda_raio + T.arco_folga;
  const yc = T.roda_raio;
  const yb = T.corpo_base_y;
  const d = Math.asin((yb - yc) / R);
  const pts = [];
  for (let k = 0; k <= T.arco_lados; k += 1) {
    const a = (Math.PI - d) - (k * (Math.PI - 2 * d)) / T.arco_lados;
    pts.push([arred(zc + R * Math.cos(a)), k === 0 || k === T.arco_lados ? yb : arred(yc + R * Math.sin(a))]);
  }
  return pts;
}

/* Perfil lateral (z, y) da carroceria de baixo: o topo da frente para trás, a traseira, e a base com os dois arcos, de trás para a frente. */
function ladoDoCorpo(T) {
  return [
    [T.nariz_z, T.nariz_topo_y], [T.capo_fim_z, T.corpo_topo_y], [T.porta_malas_z, T.corpo_topo_y], [T.traseira_z, T.traseira_topo_y],
    [T.traseira_z, T.corpo_base_tras_y],
    ...arcoDaRoda(T, T.roda_z_tras), ...arcoDaRoda(T, T.roda_z_frente),
    [T.nariz_z, T.corpo_base_y],
  ];
}

/* Planta (x, z) em meia largura, estendida 80 mm além das faces da frente e de trás, para as faces saírem só do perfil lateral. */
function plantaDoCorpo(T) {
  const P = T.planta;
  const lista = [[P[0][0] + 80, P[0][1]], ...P, [P[P.length - 1][0] - 80, P[P.length - 1][1]]];
  return espelhar(lista.map(([z, x]) => [x, z]));
}

const larguraDaCabine = (T, y) => T.cabine_meia_largura_base
  + ((T.cabine_meia_largura_topo - T.cabine_meia_largura_base) * (y - T.cabine_base_y)) / (T.altura_total - T.cabine_base_y);

/* Cabine: perfil lateral com as pontas das rampas prolongadas 50 mm abaixo da base, onde a caixa corta. */
function ladoDaCabine(T) {
  const P = T.cabine_perfil;
  const yBase = T.cabine_base_y - 50;
  const frente = prolongar(P[1], P[0], yBase);
  const tras = prolongar(P[P.length - 2], P[P.length - 1], yBase);
  return [frente, ...P.slice(1, -1), tras];
}

/* Seção frontal (x, y) da cabine, recuada `margem` de cada lado; passa 100 mm do teto, e o teto sai do perfil lateral. */
function secaoDaCabine(T, margem = 0) {
  const y0 = T.cabine_base_y - 100;
  const y1 = T.altura_total + 100;
  const xb = larguraDaCabine(T, T.cabine_base_y) - margem;
  return espelhar([[xb, y0], [xb, T.cabine_base_y], [larguraDaCabine(T, y1) - margem, y1]]);
}

/* Placa de vidro sobre uma aresta inclinada da cabine: o paralelogramo entre a aresta e a aresta deslocada `esp` para fora. */
function placaSobreAresta(T, a, b, y0, y1) {
  const p0 = [zNaReta(a, b, y0), y0];
  const p1 = [zNaReta(a, b, y1), y1];
  const dz = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dz, dy);
  let nz = dy / len;
  let ny = -dz / len;
  const centro = [-100, (T.cabine_base_y + T.altura_total) / 2];
  const meio = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  if (nz * (meio[0] - centro[0]) + ny * (meio[1] - centro[1]) < 0) { nz = -nz; ny = -ny; }
  const e = T.vidro_espessura;
  return [p0, p1, [p1[0] + e * nz, p1[1] + e * ny], [p0[0] + e * nz, p0[1] + e * ny]];
}

/* Faixa fina paralela à lateral inclinada da cabine, do lado `s` (+1 direita), para as janelas laterais. */
function lajeDaLateral(T, s) {
  const y0 = T.cabine_base_y;
  const y1 = T.altura_total + 100;
  const e = T.vidro_espessura;
  const meia = [[larguraDaCabine(T, y0), y0], [larguraDaCabine(T, y1), y1], [larguraDaCabine(T, y1) + e, y1], [larguraDaCabine(T, y0) + e, y0]];
  return meia.map(([x, y]) => [s * x, y]);
}

/* Contorno da planta de um para-choque: de [-meia, z0] a [meia, z0] pela face encostada, e a frente com cantos arredondados. */
function contornoDoParaChoque(meia, z0, z1, raio, ponta) {
  if (ponta) return [[-meia, z0], [meia, z0], [ponta, z1], [-ponta, z1]];
  return {
    contorno: {
      inicio: [-meia, z0],
      trechos: [{ reto: [meia, z0] }, { reto: [meia, z1] }, { concordancia: raio }, { reto: [-meia, z1] }, { concordancia: raio }],
    },
  };
}

/* Os vazios do aro: trapézios entre os raios interno e externo, que deixam raios de largura constante. Em [u, v] do perfil de eixo x. */
function vaziosDoAro(T, yc, zc) {
  const n = T.aro_raios;
  const passo = (2 * Math.PI) / n;
  const meiaLarg = T.aro_largura_do_raio / 2;
  const h1 = Math.asin(meiaLarg / T.aro_vazio_raio_interno);
  const h2 = Math.asin(meiaLarg / T.aro_vazio_raio_externo);
  const ponto = (r, a) => [-yc + r * Math.cos(a), zc + r * Math.sin(a)];
  const vazios = [];
  for (let k = 0; k < n; k += 1) {
    const a0 = k * passo;
    vazios.push([
      ponto(T.aro_vazio_raio_interno, a0 + h1), ponto(T.aro_vazio_raio_interno, a0 + passo - h1),
      ponto(T.aro_vazio_raio_externo, a0 + passo - h2), ponto(T.aro_vazio_raio_externo, a0 + h2),
    ]);
  }
  return vazios;
}

const RODAS = [
  { lado: 'Esq', s: -1, ponta: 'Frente', zKey: 'roda_z_frente' },
  { lado: 'Dir', s: 1, ponta: 'Frente', zKey: 'roda_z_frente' },
  { lado: 'Esq', s: -1, ponta: 'Tras', zKey: 'roda_z_tras' },
  { lado: 'Dir', s: 1, ponta: 'Tras', zKey: 'roda_z_tras' },
];

/* Meia largura da tomada de ar numa altura z da planta em trapézio. */
const larguraDoCapoEm = (T, z) => {
  const [[zf, wf], [zt, wt]] = T.capo_planta;
  return wt + ((z - zt) * (wf - wt)) / (zf - zt);
};

/* Formas em milímetro. Cada uma tem `nome`, `material`, `tipo` e as medidas. `tipo: 'vistas'` é a interseção de `solidos` (prismas dos
 * perfis e caixas); `prisma` é um prisma só; `torno` é revolução em torno de x; `disco` é o aro de raios; `cubo` é uma caixa. */
export function derivar(T) {
  const H = T.meia_largura_total + T.folga_prisma;
  const C = T.comprimento_total / 2 + T.folga_prisma;
  const Y1 = T.altura_total + T.folga_prisma;
  const L = T.corpo_meia_largura;
  const formas = [];

  const prismaX = (perfil) => ({ k: 'x', perfil, x0: -H, x1: H });
  const prismaZ = (perfil) => ({ k: 'z', perfil, z0: -C, z1: C });
  const prismaY = (perfil, y0 = 0, y1 = Y1) => ({ k: 'y', perfil, y0, y1 });
  const caixa = (x0, x1, y0, y1, z0, z1) => ({ k: 'caixa', x0, x1, y0, y1, z0, z1 });
  // as caixas passam 50 mm dos prismas, para nenhuma face de corte coincidir com a face de outro prisma
  const Hc = H + 50;
  const Cc = C + 50;
  const Yc = Y1 + 50;

  const lado = ladoDoCorpo(T);
  const planta = plantaDoCorpo(T);

  /* carroceria de baixo: perfil lateral com arcos, planta, e os 860 mm de meia largura das portas */
  formas.push({
    nome: 'carroceria', tipo: 'vistas', material: 'vermelho',
    solidos: [prismaX(lado), prismaY(planta), caixa(-L, L, -50, Yc, -Cc, Cc)],
    plano: {
      forma: `carroceria de baixo de ${2 * L} mm de largura nas portas, de y ${T.corpo_base_y} ao topo em ${T.corpo_topo_y}, com capô, tampa do porta-malas e os dois arcos de roda recortados no perfil, e planta que alarga sobre as rodas`,
      tecnica: `interseção do perfil lateral em x com a planta em y e uma caixa de ${L} mm de meia largura`,
    },
  });

  /* para-lamas: o que passa de x 860, entre a planta e a seção chanfrada, com o mesmo arco do perfil */
  const secaoPL = espelhar(T.paraLama_secao);
  const faixas = [['Frente', T.paraLama_frente_z0, T.paraLama_frente_z1], ['Tras', T.paraLama_tras_z0, T.paraLama_tras_z1]];
  for (const [ponta, z0, z1] of faixas) {
    for (const s of [-1, 1]) {
      const [x0, x1] = s > 0 ? [L, T.paraLama_x1] : [-T.paraLama_x1, -L];
      formas.push({
        nome: `paraLama${ponta}${s > 0 ? 'Dir' : 'Esq'}`, tipo: 'vistas', material: 'vermelho',
        solidos: [prismaX(lado), prismaZ(secaoPL), prismaY(planta), caixa(x0, x1, -50, Yc, z0, z1)],
        plano: {
          forma: `para-lama ${ponta === 'Frente' ? 'da frente' : 'de trás'} ${s > 0 ? 'direito' : 'esquerdo'}, o volume que passa de x ${L} até ${T.paraLama_secao[0][0]} em volta do arco, de z ${Math.max(z0, T.traseira_z)} a ${z1}, com o topo chanfrado até y ${T.paraLama_secao[2][1]}`,
          tecnica: `interseção do perfil lateral com arco, da seção frontal chanfrada, da planta e de uma caixa que parte do plano x ${L}`,
        },
      });
    }
  }

  /* capô: tomada de ar de planta em trapézio sobre o topo */
  const cf = T.capo_ponta_frente;
  const ct = T.capo_ponta_tras;
  const cp = T.capo_perfil;
  const ladoCapo = [prolongar(cp[0], cf, T.capo_base_y), ...cp, prolongar(cp[cp.length - 1], ct, T.capo_base_y)];
  const [[zf, wf], [zt, wt]] = T.capo_planta;
  formas.push({
    nome: 'capo', tipo: 'vistas', material: 'vermelho',
    solidos: [prismaX(ladoCapo), prismaY(espelhar([[wf, zf], [wt, zt]])), caixa(-Hc, Hc, T.corpo_topo_y, Yc, -Cc, Cc)],
    plano: {
      forma: `tomada de ar do capô, de z ${ct[0]} a ${cf[0]}, que sobe de y ${T.corpo_topo_y} a ${cp[0][1]} com rampas na frente e atrás, em trapézio de ${2 * wt} mm atrás e ${2 * wf} mm na frente`,
      tecnica: 'interseção do perfil lateral em x, da planta em trapézio em y e de uma caixa que corta no topo do capô',
    },
  });

  /* cabine: perfil lateral e seção frontal que afunila, de y 1000 ao teto */
  formas.push({
    nome: 'cabine', tipo: 'vistas', material: 'vermelho',
    solidos: [prismaX(ladoDaCabine(T)), prismaZ(secaoDaCabine(T)), caixa(-Hc, Hc, T.cabine_base_y, Yc, -Cc, Cc)],
    plano: {
      forma: `cabine longa, de y ${T.cabine_base_y} a ${T.altura_total}, com para-brisa inclinado, teto plano e vidro de trás inclinado, e meia largura de ${T.cabine_meia_largura_base} mm na base que afunila a ${T.cabine_meia_largura_topo} mm no teto`,
      tecnica: 'interseção do perfil lateral em x, da seção frontal que afunila em z e de uma caixa que corta na base',
    },
  });

  /* vidros: placas de 12 mm por fora das faces, recuadas pela moldura */
  const P = T.cabine_perfil;
  const secaoInterna = secaoDaCabine(T, T.vidro_moldura);
  formas.push({
    nome: 'parabrisa', tipo: 'vistas', material: 'vidro',
    solidos: [prismaX(placaSobreAresta(T, P[0], P[1], T.parabrisa_y0, T.parabrisa_y1)), prismaZ(secaoInterna)],
    plano: {
      forma: `placa de vidro escuro de ${T.vidro_espessura} mm sobre a face inclinada do para-brisa, de y ${T.parabrisa_y0} a ${T.parabrisa_y1}, com moldura de ${T.vidro_moldura} mm nas laterais`,
      tecnica: 'interseção de um paralelogramo fino em x, paralelo à face, com a seção frontal recuada',
    },
  });
  formas.push({
    nome: 'vidroTraseiro', tipo: 'vistas', material: 'vidro',
    solidos: [prismaX(placaSobreAresta(T, P[P.length - 3], P[P.length - 2], T.vidroTraseiro_y0, T.vidroTraseiro_y1)), prismaZ(secaoInterna)],
    plano: {
      forma: `placa de vidro escuro de ${T.vidro_espessura} mm sobre a face inclinada de trás da cabine, de y ${T.vidroTraseiro_y0} a ${T.vidroTraseiro_y1}, com moldura de ${T.vidro_moldura} mm nas laterais`,
      tecnica: 'interseção de um paralelogramo fino em x, paralelo à face, com a seção frontal recuada',
    },
  });
  for (const s of [1, -1]) {
    const lado2 = s > 0 ? 'Dir' : 'Esq';
    for (const [nome, janela, desc] of [['vidroLateralFrente', T.janelaFrente, 'janela da porta, entre o para-brisa e a coluna B'], ['vidroLateralTras', T.janelaTras, 'janela de trás, entre a coluna B e a coluna C']]) {
      formas.push({
        nome: `${nome}${lado2}`, tipo: 'vistas', material: 'vidro',
        solidos: [prismaX(janela), prismaZ(lajeDaLateral(T, s))],
        plano: {
          forma: `placa de vidro escuro de ${T.vidro_espessura} mm na lateral ${s > 0 ? 'direita' : 'esquerda'} da cabine, ${desc}, de y ${janela[0][1]} a ${janela[1][1]}`,
          tecnica: 'interseção do contorno da janela em x com uma faixa fina paralela à lateral inclinada da cabine',
        },
      });
    }
  }

  /* para-choques: planta com cantos arredondados, encostados nas faces da frente e de trás da carroceria */
  const pcf = contornoDoParaChoque(T.paraChoqueFrente_meia_largura, T.nariz_z, T.paraChoqueFrente_z1, 0, T.paraChoqueFrente_meia_largura_ponta);
  formas.push({
    nome: 'paraChoqueFrente', tipo: 'prisma', material: 'vermelho', solido: prismaY(pcf, T.paraChoqueFrente_y0, T.paraChoqueFrente_y1),
    plano: {
      forma: `para-choque da frente de ${2 * T.paraChoqueFrente_meia_largura} mm de largura, de z ${T.nariz_z} a ${T.paraChoqueFrente_z1} e de y ${T.paraChoqueFrente_y0} a ${T.paraChoqueFrente_y1}, com a face da frente de ${2 * T.paraChoqueFrente_meia_largura_ponta} mm de largura, chanfrando os cantos`,
      tecnica: 'extrusão em y de uma planta com os cantos da frente chanfrados, encostada na face da frente da carroceria',
    },
  });
  const pct = contornoDoParaChoque(T.paraChoqueTras_meia_largura, T.traseira_z, T.paraChoqueTras_z1, T.paraChoqueTras_raio);
  formas.push({
    nome: 'paraChoqueTras', tipo: 'prisma', material: 'vermelho', solido: prismaY(pct, T.paraChoqueTras_y0, T.paraChoqueTras_y1),
    plano: {
      forma: `para-choque de trás de ${2 * T.paraChoqueTras_meia_largura} mm de largura, de z ${T.traseira_z} a ${T.paraChoqueTras_z1} e de y ${T.paraChoqueTras_y0} a ${T.paraChoqueTras_y1}, com os dois cantos de trás arredondados em ${T.paraChoqueTras_raio} mm`,
      tecnica: 'extrusão em y de uma planta com concordância nos cantos, encostada na face de trás da carroceria',
    },
  });

  /* faróis, grade e lanternas */
  for (const s of [-1, 1]) {
    const lado2 = s > 0 ? 'Dir' : 'Esq';
    formas.push({
      nome: `farol${lado2}`, tipo: 'cubo', material: 'farol',
      larg: T.farol_x1 - T.farol_x0, alt: T.farol_y1 - T.farol_y0, prof: T.farol_esp,
      xc: (s * (T.farol_x0 + T.farol_x1)) / 2, y0: T.farol_y0, zc: T.nariz_z + T.farol_esp / 2,
      plano: { forma: `farol ${s > 0 ? 'direito' : 'esquerdo'} de ${T.farol_x1 - T.farol_x0} por ${T.farol_y1 - T.farol_y0} mm, saindo ${T.farol_esp} mm da face da frente`, tecnica: 'cubo encostado na face da frente da carroceria' },
    });
  }
  formas.push({
    nome: 'grade', tipo: 'cubo', material: 'grade',
    larg: 2 * T.grade_meia_largura, alt: T.grade_y1 - T.grade_y0, prof: T.grade_esp,
    xc: 0, y0: T.grade_y0, zc: T.nariz_z + T.grade_esp / 2,
    plano: { forma: `grade de ${2 * T.grade_meia_largura} por ${T.grade_y1 - T.grade_y0} mm entre os faróis, saindo ${T.grade_esp} mm da face da frente`, tecnica: 'cubo encostado na face da frente da carroceria' },
  });
  for (const s of [-1, 1]) {
    const lado2 = s > 0 ? 'Dir' : 'Esq';
    formas.push({
      nome: `lanterna${lado2}`, tipo: 'cubo', material: 'lanterna',
      larg: T.lanterna_x1 - T.lanterna_x0, alt: T.lanterna_y1 - T.lanterna_y0, prof: T.lanterna_esp,
      xc: (s * (T.lanterna_x0 + T.lanterna_x1)) / 2, y0: T.lanterna_y0, zc: T.traseira_z - T.lanterna_esp / 2,
      plano: { forma: `lanterna ${s > 0 ? 'direita' : 'esquerda'} de ${T.lanterna_x1 - T.lanterna_x0} por ${T.lanterna_y1 - T.lanterna_y0} mm na face de trás, posição suposta porque a fonte não mostra a traseira`, tecnica: 'cubo encostado na face de trás da carroceria' },
    });
  }

  /* retrovisores */
  for (const s of [-1, 1]) {
    const lado2 = s > 0 ? 'Dir' : 'Esq';
    const larg = T.meia_largura_total - L;
    formas.push({
      nome: `retrovisor${lado2}`, tipo: 'cubo', material: 'vermelho',
      larg, alt: T.retrovisor_y1 - T.retrovisor_y0, prof: T.retrovisor_z1 - T.retrovisor_z0,
      xc: s * (L + larg / 2), y0: T.retrovisor_y0, zc: (T.retrovisor_z0 + T.retrovisor_z1) / 2,
      plano: { forma: `retrovisor ${s > 0 ? 'direito' : 'esquerdo'}, caixa da lateral da carroceria até x ${T.meia_largura_total}, de z ${T.retrovisor_z0} a ${T.retrovisor_z1}`, tecnica: 'cubo encostado na lateral da carroceria' },
    });
  }

  /* caixas de roda: o arco fechado na base, entre as faces de dentro dos pneus */
  const xDentro = T.roda_x_fora - T.cubo_esp - T.aro_esp - T.pneu_largura;
  for (const [ponta, zKey] of [['Frente', 'roda_z_frente'], ['Tras', 'roda_z_tras']]) {
    formas.push({
      nome: `caixaRoda${ponta}`, tipo: 'prisma', material: 'escuro',
      solido: { k: 'x', perfil: arcoDaRoda(T, T[zKey]), x0: -xDentro, x1: xDentro },
      plano: {
        forma: `caixa de roda ${ponta === 'Frente' ? 'da frente' : 'de trás'}, o vão do arco de ${T.roda_raio + T.arco_folga} mm de raio fechado na base, entre as faces de dentro dos pneus, de x ${-xDentro} a ${xDentro}`,
        tecnica: 'extrusão em x do mesmo polígono do arco do perfil lateral, escura',
      },
    });
  }

  /* rodas: pneu, aro de raios e cubo, quatro vezes */
  for (const r of RODAS) {
    const zc = T[r.zKey];
    const sufixo = `${r.ponta}${r.lado}`;
    const fimPneu = xDentro + T.pneu_largura;
    const fimAro = fimPneu + T.aro_esp;
    const R = T.roda_raio;
    const c = T.pneu_chanfro;
    const W = T.pneu_largura;
    formas.push({
      nome: `pneu${sufixo}`, tipo: 'torno', material: 'pneu', lados: T.pneu_lados,
      x0: r.s > 0 ? xDentro : -fimPneu, yc: R, zc,
      perfil: [[0, 0], [R - c, 0], [R, c], [R, W - c], [R - c, W], [0, W]],
      plano: { forma: `pneu de ${2 * R} mm de diâmetro e ${W} mm de largura, com chanfro de ${c} mm, centro em z ${zc}, de x ${r.s > 0 ? xDentro : -fimPneu} a ${r.s > 0 ? fimPneu : -xDentro}`, tecnica: `revolução em torno de x de um perfil com chanfro, ${T.pneu_lados} lados` },
    });
    formas.push({
      nome: `aro${sufixo}`, tipo: 'disco', material: 'aro', x0: r.s > 0 ? fimPneu : -fimAro, esp: T.aro_esp, yc: R, zc,
      raio: T.aro_raio, vazios: vaziosDoAro(T, R, zc),
      plano: { forma: `aro de ${2 * T.aro_raio} mm de diâmetro e ${T.aro_esp} mm de espessura, com ${T.aro_raios} vazios que deixam os raios, na face de fora do pneu`, tecnica: 'extrusão em x de um círculo com oito furos trapezoidais' },
    });
    formas.push({
      nome: `cubo${sufixo}`, tipo: 'torno', material: 'aro', lados: T.cubo_lados,
      x0: r.s > 0 ? fimAro : -(fimAro + T.cubo_esp), yc: R, zc,
      perfil: [[0, 0], [T.cubo_raio, 0], [T.cubo_raio, T.cubo_esp], [0, T.cubo_esp]],
      plano: { forma: `cubo de ${2 * T.cubo_raio} mm de diâmetro e ${T.cubo_esp} mm de espessura no centro do aro, até x ${r.s * T.roda_x_fora}`, tecnica: 'revolução em torno de x de um retângulo' },
    });
  }

  return formas;
}

/* ---- passos ---- */

const pontosM = (lista) => lista.map(([a, b]) => [arred(m(a)), arred(m(b))]);
const emM = (v) => {
  if (typeof v === 'number') return arred(m(v));
  if (Array.isArray(v)) return v.map(emM);
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, emM(x)]));
};

/* Perfil [u, v] de cada eixo de extrusão, anti-horário: eixo x leva [u, v] a y = -u e z = v; eixo z a x = u e y = -v; eixo y a x = u e z = v. */
function perfilDoPrisma(s) {
  if (s.k === 'x') return antihorario(s.perfil.map(([z, y]) => [-y, z]));
  if (s.k === 'z') return antihorario(s.perfil.map(([x, y]) => [x, -y]));
  return Array.isArray(s.perfil) ? antihorario(s.perfil) : s.perfil;
}

function passoDoSolido(s, id, segmentosArco) {
  if (s.k === 'caixa') {
    return ['cubo', { origemId: id, larg: m(s.x1 - s.x0), alt: m(s.y1 - s.y0), prof: m(s.z1 - s.z0), em: [m((s.x0 + s.x1) / 2), m(s.y0), m((s.z0 + s.z1) / 2)] }];
  }
  const perfil = perfilDoPrisma(s);
  const p = Array.isArray(perfil) ? pontosM(perfil) : emM(perfil);
  const extra = Array.isArray(perfil) ? {} : { segmentosArco };
  if (s.k === 'x') return ['extrusao', { origemId: id, eixo: 'x', altura: m(s.x1 - s.x0), em: [m(s.x0), 0, 0], perfil: p, ...extra }];
  if (s.k === 'z') return ['extrusao', { origemId: id, eixo: 'z', altura: m(s.z1 - s.z0), em: [0, 0, m(s.z0)], perfil: p, ...extra }];
  return ['extrusao', { origemId: id, eixo: 'y', altura: m(s.y1 - s.y0), em: [0, m(s.y0), 0], perfil: p, ...extra }];
}

/** Os PASSOS: para cada forma, os prismas, a interseção quando há, a `parte` e o `material`. A forma `k` leva o bloco de ids 100 * (k + 1). */
export function gerarPassos(T) {
  const passos = [];
  derivar(T).forEach((f, k) => {
    const base = 100 * (k + 1);
    let sel;
    if (f.tipo === 'vistas') {
      f.solidos.forEach((s, j) => passos.push(passoDoSolido(s, base + 1 + j, T.paraChoque_segmentos_arco)));
      const solidos = f.solidos.map((s, j) => ({ origem: { op: s.k === 'caixa' ? 'cubo' : 'extrusao', id: base + 1 + j } }));
      passos.push(['intersectar', { origemId: base + 50, solidos }]);
      sel = { origem: { op: 'intersectar', id: base + 50 } };
    } else if (f.tipo === 'prisma') {
      passos.push(passoDoSolido(f.solido, base + 1, T.paraChoque_segmentos_arco));
      sel = { origem: { op: 'extrusao', id: base + 1 } };
    } else if (f.tipo === 'torno') {
      passos.push(['lathe', { origemId: base + 1, eixo: 'x', perfil: pontosM(f.perfil), lados: f.lados, em: [m(f.x0), m(f.yc), m(f.zc)] }]);
      sel = { origem: { op: 'lathe', id: base + 1 } };
    } else if (f.tipo === 'disco') {
      passos.push(['extrusao', {
        origemId: base + 1, eixo: 'x', altura: m(f.esp), em: [m(f.x0), 0, 0], segmentosArco: T.aro_segmentos_arco,
        perfil: { circulo: { raio: m(f.raio), centro: [arred(m(-f.yc)), arred(m(f.zc))] } },
        furos: f.vazios.map((v) => pontosM(v)),
      }]);
      sel = { origem: { op: 'extrusao', id: base + 1 } };
    } else {
      passos.push(['cubo', { origemId: base + 1, larg: m(f.larg), alt: m(f.alt), prof: m(f.prof), em: [m(f.xc), m(f.y0), m(f.zc)] }]);
      sel = { origem: { op: 'cubo', id: base + 1 } };
    }
    passos.push(['parte', { nome: f.nome, sel }]);
    passos.push(['material', { sel, usa: f.material }]);
  });
  return passos;
}

/* Os contatos: cada par se toca pela face indicada no motivo, declarados antes de medir. */
export const CONTATOS = [
  ...['FrenteDir', 'FrenteEsq', 'TrasDir', 'TrasEsq'].map((s) => ({
    par: [`paraLama${s}`, 'carroceria'],
    motivo: `a face de dentro do para-lama ${s}, no plano x 860 ou -860, encosta na lateral da carroceria, que sai da mesma interseção`,
  })),
  ...['Frente', 'Tras'].map((p) => ({
    par: [`caixaRoda${p}`, 'carroceria'],
    motivo: `as faces do arco da caixa de roda ${p} são as mesmas faces do arco recortado no perfil da carroceria`,
  })),
  { par: ['cabine', 'carroceria'], motivo: 'a face de baixo da cabine, em y 1000, assenta no topo da carroceria, que é plano nesse trecho' },
  { par: ['capo', 'carroceria'], motivo: 'a face de baixo da tomada de ar, em y 1000, assenta no topo do capô da carroceria' },
  ...['parabrisa', 'vidroTraseiro', 'vidroLateralFrenteDir', 'vidroLateralFrenteEsq', 'vidroLateralTrasDir', 'vidroLateralTrasEsq'].map((v) => ({
    par: [v, 'cabine'],
    motivo: `a face de dentro do ${v} encosta na face inclinada da cabine, no mesmo plano da aresta do perfil`,
  })),
  { par: ['paraChoqueFrente', 'carroceria'], motivo: 'a face de trás do para-choque da frente encosta na face da frente da carroceria, em z 2122' },
  { par: ['paraChoqueTras', 'carroceria'], motivo: 'a face da frente do para-choque de trás encosta na face de trás da carroceria, em z -2087' },
  ...['Dir', 'Esq'].map((l) => ({ par: [`farol${l}`, 'carroceria'], motivo: `a face de trás do farol ${l} encosta na face da frente da carroceria, em z 2122` })),
  { par: ['grade', 'carroceria'], motivo: 'a face de trás da grade encosta na face da frente da carroceria, em z 2122' },
  ...['Dir', 'Esq'].map((l) => ({ par: [`lanterna${l}`, 'carroceria'], motivo: `a face da frente da lanterna ${l} encosta na face de trás da carroceria, em z -2087` })),
  ...['Dir', 'Esq'].map((l) => ({ par: [`retrovisor${l}`, 'carroceria'], motivo: `a face de dentro do retrovisor ${l} encosta na lateral da carroceria, em x 860 ou -860` })),
  ...['Frente', 'Tras'].flatMap((p) => ['Dir', 'Esq'].flatMap((l) => [
    { par: [`pneu${p}${l}`, `caixaRoda${p}`], motivo: `a face de dentro do pneu ${p}${l} encosta na ponta da caixa de roda, em x 705 ou -705` },
    { par: [`aro${p}${l}`, `pneu${p}${l}`], motivo: `a face de dentro do aro ${p}${l} encosta na face de fora do pneu, no disco do centro` },
    { par: [`cubo${p}${l}`, `aro${p}${l}`], motivo: `a face de dentro do cubo ${p}${l} encosta na face de fora do aro, no centro` },
  ])),
];

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha. */
export function pontosDeclarados(T = TABELA) {
  const xDentro = T.roda_x_fora - T.cubo_esp - T.aro_esp - T.pneu_largura;
  const xForaPneu = xDentro + T.pneu_largura;
  const R = T.roda_raio;
  const tol = 2;
  const tolRoda = 4;
  return [
    { nome: 'canto de trás, embaixo, do para-choque de trás', parte: 'paraChoqueTras', medida: 'minimo', em: [-T.paraChoqueTras_meia_largura, T.paraChoqueTras_y0, T.paraChoqueTras_z1], toleranciaMm: tol },
    { nome: 'canto da frente, em cima, do para-choque da frente', parte: 'paraChoqueFrente', medida: 'maximo', em: [T.paraChoqueFrente_meia_largura, T.paraChoqueFrente_y1, T.paraChoqueFrente_z1], toleranciaMm: tol },
    { nome: 'teto da cabine, à direita e atrás do para-brisa', parte: 'cabine', medida: 'maximo', em: [T.cabine_meia_largura_base, T.altura_total, T.cabine_perfil[0][0]], toleranciaMm: tol },
    { nome: 'topo da tomada de ar do capô, na frente', parte: 'capo', medida: 'maximo', em: [larguraDoCapoEm(T, T.capo_perfil[0][0]), T.capo_perfil[0][1], T.capo_perfil[0][0]], toleranciaMm: tol },
    { nome: 'pneu da frente, à direita, na frente e em cima', parte: 'pneuFrenteDir', medida: 'maximo', em: [xForaPneu, 2 * R, T.roda_z_frente + R], toleranciaMm: tolRoda },
    { nome: 'pneu de trás, à esquerda, atrás e embaixo', parte: 'pneuTrasEsq', medida: 'minimo', em: [-xForaPneu, 0, T.roda_z_tras - R], toleranciaMm: tolRoda },
    { nome: 'ponta do retrovisor direito', parte: 'retrovisorDir', medida: 'maximo', em: [T.meia_largura_total, T.retrovisor_y1, T.retrovisor_z1], toleranciaMm: tol },
    { nome: 'face de fora do cubo da roda da frente, à direita', parte: 'cuboFrenteDir', medida: 'maximo', em: [T.roda_x_fora, R + T.cubo_raio, T.roda_z_frente + T.cubo_raio], toleranciaMm: tolRoda },
  ];
}

const receita = {
  meta: { nome: 'carro-sedan-classico', desc: 'sedã de caixa vermelho de cabine longa, com tomada de ar no capô, para-lamas, vidros com moldura, faróis, grade e rodas de raios' },
  PARAMS: TABELA,
  MATERIAIS: {
    vermelho: { tipo: 'liso', cor: '#b3342a', acabamento: 'pintado' },
    vidro: { tipo: 'liso', cor: '#262b33', acabamento: 'pintado' },
    pneu: { tipo: 'liso', cor: '#1a1a1c', acabamento: 'pintado' },
    aro: { tipo: 'metal', cor: '#9a9da4', acabamento: 'escovado' },
    escuro: { tipo: 'liso', cor: '#2a1210', acabamento: 'pintado' },
    farol: { tipo: 'liso', cor: '#d9d5c0', acabamento: 'pintado' },
    grade: { tipo: 'liso', cor: '#3a3d44', acabamento: 'pintado' },
    lanterna: { tipo: 'liso', cor: '#8c1a1a', acabamento: 'pintado' },
  },
  TOPO: { origem: 'chão, no meio do carro em x e em z; y para cima e a frente do carro em +z' },
  PLANO: {
    objeto: 'sedã de caixa dos anos 80, vermelho, de 4400 mm de comprimento, 1972 mm de largura com retrovisores e 1523 mm de altura, de cabine longa afunilada, tomada de ar no capô, para-lamas e rodas de raios',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total do sedã, de z -2200 a 2200', milimetros: 4400 },
    familia: 'veiculo',
    partes: derivar(TABELA).map((f) => ({ nome: f.nome, forma: f.plano.forma, tecnica: f.plano.tecnica })),
    criteriosDeReprovacao: [
      'o conjunto não mede 4400 mm de comprimento, 1972 mm de largura com retrovisores ou 1523 mm de altura, ou alguma roda não toca o chão',
      'um lado do carro difere do outro em medida ou posição de peça simétrica',
      'a cabine tem largura constante, em vez de afunilar de 850 mm de meia largura na base a 730 mm no teto',
      'a roda não aparece no arco: o arco não é recortado no perfil lateral, ou falta a caixa de roda, ou o pneu atravessa a carroceria',
      'os para-lamas não alargam o carro sobre as rodas, ou a planta tem a mesma largura da frente à traseira',
      'os vidros são faixas sem moldura, ou ficam fora das faces da cabine',
      'o capô não tem a tomada de ar elevada, ou os para-choques são caixas de cantos vivos',
      'faróis, grade ou lanternas não estão encostados nas faces de frente e de trás da carroceria',
      'a silhueta lateral, frontal ou de cima não confere com a referência em mais de dois por cento do comprimento',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  ALIASES: [],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;

/* picape-plataforma — picape de brinquedo de cabine curta e afunilada, cinza claro, com vidros azul claros, caçamba rasa de borda
 * larga e piso escuro, aletas escuras de arco em volta das quatro rodas, para-choques e saia cinza escuros, faróis amarelos na
 * quina da frente, lanternas vermelhas atrás e espelhos em caixa na base do para-brisa.
 *
 * Origem: recriada em primitivas do núcleo a partir do modelo "truck-flat" do pacote A, de autor A (pacote A, endereço omitido,
 * endereço da página: endereço omitido), licença livre sem exigência de crédito (declarada no License.txt do pacote). A
 * malha de origem NÃO está no repositório: ela fica em importados/veiculos-livres/pacote-a/truck-flat.glb, que o git ignora. O que
 * entra aqui são as medidas tiradas dela (referencias/fonte-partes.json, em metro, com a escala 1,765, e as faces da própria malha
 * lidas em milímetro) e as vistas (referencias/fonte-vistas.png). O que não ficou igual à referência está em referencias/alvo.md.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente da picape em +z, x para a direita de quem olha de frente, centrado
 * em x e z. A TABELA é em milímetro e é a única fonte das medidas; `derivar` calcula perfis, seções e polígonos de planta, e
 * `gerarPassos` escreve, por parte, a forma e a `parte` com o `material`, com a conversão para metro num lugar só (`m`).
 *
 * Como a forma nasce: cada volume da carroceria é a INTERSEÇÃO de prismas, o perfil lateral (z, y) extrudado em x, a seção frontal
 * (x, y) extrudada em z e, onde a planta importa (aba da caçamba, para-choque, parede), a planta (x, z) extrudada em y. É isso que
 * dá o afunilamento da cabine (meia largura de 971 mm na base e 794 mm no teto), o capô inclinado e a borda da caçamba mais larga
 * que a parede, sem nenhum vértice calculado em 3D. Os arcos das rodas são recortados no próprio perfil lateral (nunca por
 * booleana), e a caixa de roda fecha cada arco, e o fundo dele, entre as faces de dentro dos dois pneus. A caçamba não é um corte: é a soma de
 * piso, duas paredes e a parede de trás, cada uma saída do seu prisma, e a borda mais larga é o degrau da seção em L.
 *
 * Na extrusão do núcleo, com eixo x o ponto [u, v] vai para y = -u e z = v; com eixo z vai para x = u e y = -v; com eixo y vai
 * para x = u e z = v. Simplificações em relação à fonte estão em referencias/alvo.md.
 */

export const TABELA = {
  comprimento: 4846,
  meia_largura: 1324,

  // corpo cinza claro: meia largura da lateral, base do corpo sobre a saia, topo da borda e do fim do capô
  meia_corpo: 971,
  y_corpo_base: 882,
  y_borda: 1412,
  z_corpo_tras: -2334,

  // nariz: a grade escura fecha a frente em z 2246; o capô sobe dela (y 1059) até o pé do para-brisa (z 1717, y 1412)
  z_nariz: 2246,
  y_nariz_topo: 1059,
  grade_espessura: 12,
  z_capo_fim: 1717,

  // cabine: teto plano, face de trás quase vertical, para-brisa inclinado; a seção afunila de 971 mm na base para 794 mm no teto
  y_teto: 2294,
  z_teto_frente: 1011,
  z_cab_tras_base: 137,
  z_cab_tras_topo: 128,
  meia_teto: 794,

  // vidros: placas de 12 mm por fora da face da cabine; o para-brisa afunila de 792 para 650 mm de meia largura
  vidro_espessura: 12,
  y_vidro_topo: 2157,
  pb_meia_base: 792,
  pb_meia_topo: 650,
  vidro_lateral_frente_base: 1492,
  vidro_lateral_frente_topo: 925,
  vidro_lateral_tras: 498,

  // caçamba: o piso (corpo até y 1076 mais 12 mm de piso escuro), as paredes de 177 mm e a borda mais larga (x 1059) acima de y 1236
  y_piso_corpo: 1085,
  piso_espessura: 8,
  meia_interna: 794,
  y_borda_base: 1236,
  meia_borda: 1059,
  z_caixa_frente: 137,
  z_borda_frente_fora: 225,
  z_parede_tras_dentro: -2158,
  z_borda_tras: -2423,
  borda_chanfro_tras: 88,

  // saia escura: a faixa de y 530 a 882, que afunila para baixo (x 853 em y 530), com nariz e traseira recuados
  y_saia_base: 530,
  meia_saia_base: 853,
  saia_frente_base: [2187, 706],
  saia_tras_base: [-2217, 706],
  saia_z_fim: 2158,

  // chassi (piso de baixo) e para-choques
  chassi_meia: 1147,
  chassi_y0: 353,
  para_choque_y1: 706,
  para_choque_z_dentro: 2158,
  para_choque_z_fora: 2334,
  para_choque_canto: [[971, 2334], [1096, 2283], [1147, 2158]],

  // pino central que sai do para-choque, de seção octogonal, com a placa clara na frente
  pino_meia: 309,
  pino_y0: 265,
  pino_y1: 574,
  pino_chanfro: 88,
  pino_z_frente: 2411,
  pino_z_ponta: 2423,

  // rodas: centro em x 794 (de 530 a 1059), pneu de 1060 mm de diâmetro e 529 mm de largura, com chanfro; o aro sai 15 mm
  roda_x_dentro: 530,
  roda_x_fora: 1059,
  roda_raio: 530,
  roda_z_frente: 1381,
  roda_z_tras: -1125,
  roda_lados: 24,
  roda_chanfro: 40,
  aro_raio: 270,
  aro_espessura: 15,

  // arco de roda: polígono de 16 lados, de raio 545 (o pneu passa a 4 mm do teto); a aba escura sobe até y 1218 com 176 mm de largura
  arco_lados: 16,
  arco_raio: 545,
  aba_topo_y: 1218,
  aba_x_dentro: 971,
  aba_x_fora: 1147,

  // espelhos em caixa, na base do para-brisa, na altura da borda
  espelho_x1: 1324,
  espelho_y0: 1236,
  espelho_z: [1540, 1717],

  // faróis: placa amarela na face da grade (e na lateral, até z 2070) e peça clara de pisca entre o farol e o centro da grade
  farol_x: [547, 977],
  farol_espessura: 6,
  farol_z_lateral: 2070,
  pisca_x: [365, 547],

  // lanternas: placas vermelhas na face de trás e na lateral da parede de trás
  lanterna_x_dentro: 640,
  lanterna_y: [1085, 1236],
  lanterna_espessura: 8,
};

const m = (mm) => mm / 1000;
const area = (l) => l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0) / 2;
const antihorario = (l) => (area(l) < 0 ? [...l].reverse() : l);
/* Mapeamento do núcleo, medido: eixo x leva [u, v] a (y = -u, z = v); eixo z, a (x = u, y = -v); eixo y, a (x = u, z = v). Entram milímetro; saem metro. */
const perfilLateral = (zy) => antihorario(zy.map(([z, y]) => [-y, z])).map(([u, v]) => [m(u), m(v)]);
const secaoFrontal = (xy) => antihorario(xy.map(([x, y]) => [x, -y])).map(([u, v]) => [m(u), m(v)]);
const planta = (xz) => antihorario(xz).map(([u, v]) => [m(u), m(v)]);
const espelhar = (meia) => [...meia, ...[...meia].reverse().map(([x, y]) => [-x, y])];
const espelharX = (pts) => pts.map(([x, z]) => [-x, z]);

/* Cadeia de vértices do arco de uma roda: o semicírculo de cima de um polígono regular de `lados` lados, com face plana em cima, de
 * trás para a frente (z crescente). O primeiro e o último vértice ficam acima do centro; abaixo deles o arco desce em parede vertical. */
function cadeiaDoArco(zc, yc, R, lados) {
  const passo = (2 * Math.PI) / lados;
  return Array.from({ length: lados / 2 }, (_, j) => {
    const a = Math.PI - passo / 2 - passo * j;
    return [zc + R * Math.cos(a), yc + R * Math.sin(a)];
  });
}

/* Parte da cadeia acima da linha y: os dois pontos de corte e os vértices entre eles (para o recorte de baixo de um corpo). */
function cadeiaAcima(cad, y) {
  const n = cad.length;
  const corta = (a, b) => [a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]), y];
  let i = 0; while (cad[i + 1][1] <= y) i += 1;
  let k = n - 1; while (cad[k - 1][1] <= y) k -= 1;
  return [corta(cad[i], cad[i + 1]), ...cad.slice(i + 1, k), corta(cad[k - 1], cad[k])];
}

/* Parte da cadeia abaixo da linha y, do lado esquerdo (de baixo até o corte) e do lado direito (do corte até embaixo). */
function cadeiaAbaixo(cad, y) {
  const n = cad.length;
  const corta = (a, b) => [a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]), y];
  let i = 0; while (cad[i + 1][1] <= y) i += 1;
  let k = n - 1; while (cad[k - 1][1] <= y) k -= 1;
  return { esq: [...cad.slice(0, i + 1), corta(cad[i], cad[i + 1])], dir: [corta(cad[k - 1], cad[k]), ...cad.slice(k)] };
}

/* Perfis, seções e plantas em milímetro, calculados da TABELA. */
export function derivar(T) {
  const yc = T.roda_raio;
  const yHood = (z) => T.y_nariz_topo + ((T.z_nariz - z) * (T.y_borda - T.y_nariz_topo)) / (T.z_nariz - T.z_capo_fim);
  const zFrenteCorpo = T.z_nariz - T.grade_espessura;
  const arcoF = cadeiaDoArco(T.roda_z_frente, yc, T.arco_raio, T.arco_lados);
  const arcoT = cadeiaDoArco(T.roda_z_tras, yc, T.arco_raio, T.arco_lados);
  const rw = (R) => R * Math.cos(Math.PI / T.arco_lados);
  const parede = rw(T.arco_raio);
  const yPiso = T.y_piso_corpo + T.piso_espessura;
  const e = T.vidro_espessura;

  /* linha da cabine: x em função de y (afunila de meia_corpo em y_borda a meia_teto em y_teto) e z da face do para-brisa em função de y */
  const xCab = (y) => T.meia_corpo - ((T.meia_corpo - T.meia_teto) * (y - T.y_borda)) / (T.y_teto - T.y_borda);
  const zPb = (y) => T.z_capo_fim - ((T.z_capo_fim - T.z_teto_frente) * (y - T.y_borda)) / (T.y_teto - T.y_borda);
  const xVidro = (y) => T.pb_meia_base - ((T.pb_meia_base - T.pb_meia_topo) * (y - T.y_borda)) / (T.y_vidro_topo - T.y_borda);
  /* normal da face do para-brisa, para fora (frente e cima) */
  const dz = T.z_teto_frente - T.z_capo_fim; const dy = T.y_teto - T.y_borda; const norma = Math.hypot(dz, dy);
  const nz = dy / norma; const ny = -dz / norma;
  const pbA = [zPb(T.y_borda), T.y_borda]; const pbB = [zPb(T.y_vidro_topo), T.y_vidro_topo];
  const cosCab = (T.y_teto - T.y_borda) / Math.hypot(T.meia_corpo - T.meia_teto, T.y_teto - T.y_borda);

  /* arco da caixa de roda e da aba: parede vertical na base da cadeia */
  const caixa = (zc, cad) => [[zc - parede, T.chassi_y0], ...cad, [zc + parede, T.chassi_y0]];
  const aba = (zc) => {
    const Rf = (T.aba_topo_y - yc) / Math.cos(Math.PI / T.arco_lados);
    const fora = cadeiaDoArco(zc, yc, Rf, T.arco_lados);
    const dentro = cadeiaDoArco(zc, yc, T.arco_raio, T.arco_lados);
    return [[zc - rw(Rf), T.y_saia_base], ...fora, [zc + rw(Rf), T.y_saia_base], [zc + parede, T.y_saia_base], ...[...dentro].reverse(), [zc - parede, T.y_saia_base]];
  };

  /* saia: três ilhas entre os arcos, de y 530 a 882, com a frente e a traseira recuadas */
  const yS0 = T.y_saia_base; const yS1 = T.y_corpo_base;
  const cF = cadeiaAbaixo(arcoF, yS1); const cT = cadeiaAbaixo(arcoT, yS1);
  const [zFb, yFb] = T.saia_frente_base; const [zTb, yTb] = T.saia_tras_base;
  const saiaTras = [[T.z_corpo_tras, yS1], [zTb, yTb], [-T.saia_z_fim, yTb], [-T.saia_z_fim, yS0], [T.roda_z_tras - parede, yS0], ...cT.esq];
  const saiaMeio = [[T.roda_z_tras + parede, yS0], [T.roda_z_frente - parede, yS0], ...cF.esq, ...cT.dir];
  const saiaFrente = [[T.roda_z_frente + parede, yS0], [T.saia_z_fim, yS0], [T.saia_z_fim, yFb], [zFb, yFb], [T.z_nariz, yS1], ...cF.dir];

  const canto = T.para_choque_canto;
  const pcFrente = [[-canto[0][0], canto[0][1]], [canto[0][0], canto[0][1]], [canto[1][0], canto[1][1]], [canto[2][0], canto[2][1]],
    [-canto[2][0], canto[2][1]], [-canto[1][0], canto[1][1]]];
  const pcTras = pcFrente.map(([x, z]) => [x, -z]);

  /* pino octogonal: a seção frontal dele, e a mesma na placa */
  const pn = T.pino_meia; const pc = T.pino_chanfro;
  const pino = [[-pn + pc, T.pino_y0], [pn - pc, T.pino_y0], [pn, T.pino_y0 + pc], [pn, T.pino_y1 - pc], [pn - pc, T.pino_y1], [-pn + pc, T.pino_y1], [-pn, T.pino_y1 - pc], [-pn, T.pino_y0 + pc]];

  /* borda da caçamba: seção em L (parede até y 1236, borda mais larga acima) e plantas das paredes e da parede de trás */
  const yB0 = T.y_piso_corpo; const yB1 = T.y_borda;
  const meiaI = T.meia_interna; const mc = T.meia_corpo; const mb = T.meia_borda;
  const secaoParede = (s) => [[s * meiaI, yB0], [s * mc, yB0], [s * mc, T.y_borda_base], [s * mb, T.y_borda_base], [s * mb, yB1], [s * meiaI, yB1]];
  /* a aresta chanfrada da borda passa por (meia_borda, z_caixa_frente) e (meia_corpo, z_borda_frente_fora); a planta a prolonga para fora */
  const dzCh = T.z_borda_frente_fora - T.z_caixa_frente; const dxCh = mb - mc;
  const zCh = (x) => T.z_caixa_frente + ((mb - x) * dzCh) / dxCh;
  const xForaP = mb + 100;
  const plantaParede = [[meiaI - 100, T.z_parede_tras_dentro], [xForaP, T.z_parede_tras_dentro], [xForaP, zCh(xForaP)], [mc, T.z_borda_frente_fora], [mc, T.z_caixa_frente], [meiaI - 100, T.z_caixa_frente]];
  const ch = T.borda_chanfro_tras;
  const plantaTras = [[-(mb + 100), T.z_parede_tras_dentro], [mb + 100, T.z_parede_tras_dentro], [mb + 100, T.z_borda_tras + ch + 100], [mb, T.z_borda_tras + ch], [mc, T.z_borda_tras], [-mc, T.z_borda_tras], [-mb, T.z_borda_tras + ch], [-(mb + 100), T.z_borda_tras + ch + 100]];
  const ladoTras = [[T.z_parede_tras_dentro, yB0], [T.z_corpo_tras, yB0], [T.z_corpo_tras, T.y_borda_base], [T.z_borda_tras, T.y_borda_base], [T.z_borda_tras, yB1], [T.z_parede_tras_dentro, yB1]];
  const secaoTras = espelhar([[mc, yB0], [mc, T.y_borda_base], [mb, T.y_borda_base], [mb, yB1]]);

  return {
    yHood, zFrenteCorpo, yPiso, parede, arcoF, arcoT,
    /* carroceria: o corpo da frente (capô incluído) e o piso da caçamba, com os arcos recortados na base (y 882) */
    ladoCorpo: [[T.z_corpo_tras, T.y_corpo_base], ...cadeiaAcima(arcoT, T.y_corpo_base), ...cadeiaAcima(arcoF, T.y_corpo_base),
      [zFrenteCorpo, T.y_corpo_base], [zFrenteCorpo, yHood(zFrenteCorpo)], [T.z_capo_fim, T.y_borda], [T.z_caixa_frente, T.y_borda],
      [T.z_caixa_frente, T.y_piso_corpo], [T.z_corpo_tras, T.y_piso_corpo]],
    secaoCorpo: espelhar([[T.meia_corpo, T.y_corpo_base - 100], [T.meia_corpo, T.y_borda + 100]]),
    /* cabine */
    ladoCabine: [[T.z_cab_tras_base, T.y_borda], [T.z_capo_fim, T.y_borda], [T.z_teto_frente, T.y_teto], [T.z_cab_tras_topo, T.y_teto]],
    secaoCabine: espelhar([[xCab(T.y_borda - 100), T.y_borda - 100], [xCab(T.y_teto + 100), T.y_teto + 100]]),
    ladoParabrisa: [pbA, pbB, [pbB[0] + e * nz, pbB[1] + e * ny], [pbA[0] + e * nz, pbA[1] + e * ny]],
    secaoParabrisa: espelhar([[xVidro(T.y_borda - 100), T.y_borda - 100], [xVidro(T.y_vidro_topo + 100), T.y_vidro_topo + 100]]),
    ladoVidro: [[T.vidro_lateral_frente_base, T.y_borda], [T.vidro_lateral_frente_topo, T.y_vidro_topo], [T.vidro_lateral_tras, T.y_vidro_topo], [T.vidro_lateral_tras, T.y_borda]],
    secaoVidro: (s) => [[s * xCab(T.y_borda - 100), T.y_borda - 100], [s * xCab(T.y_vidro_topo + 100), T.y_vidro_topo + 100],
      [s * (xCab(T.y_vidro_topo + 100) + e / cosCab), T.y_vidro_topo + 100], [s * (xCab(T.y_borda - 100) + e / cosCab), T.y_borda - 100]],
    /* caçamba */
    secaoParede, plantaParede, plantaTras, ladoTras, secaoTras,
    plantaParedeEsq: espelharX(plantaParede),
    secaoParedeEsq: secaoParede(-1),
    /* underbody */
    saiaTras, saiaMeio, saiaFrente,
    secaoSaia: espelhar([[T.meia_saia_base - (T.meia_corpo - T.meia_saia_base) * 100 / (T.y_corpo_base - T.y_saia_base), T.y_saia_base - 100],
      [T.meia_corpo + (T.meia_corpo - T.meia_saia_base) * 100 / (T.y_corpo_base - T.y_saia_base), T.y_corpo_base + 100]]),
    pcFrente, pcTras, pino,
    caixaF: caixa(T.roda_z_frente, arcoF), caixaT: caixa(T.roda_z_tras, arcoT), abaF: aba(T.roda_z_frente), abaT: aba(T.roda_z_tras),
  };
}

const RODAS = [
  { ponta: 'Frente', s: -1, nome: 'Esq' }, { ponta: 'Frente', s: 1, nome: 'Dir' },
  { ponta: 'Tras', s: -1, nome: 'Esq' }, { ponta: 'Tras', s: 1, nome: 'Dir' },
];

/** Os PASSOS. Os ids: um bloco de mil por parte feita de interseção; as demais partes têm ids próprios. */
export function gerarPassos(T) {
  const D = derivar(T);
  const passos = [];
  const sel = (op, id) => ({ origem: { op, id } });
  const parte = (nome, s, usa) => { passos.push(['parte', { nome, sel: s }]); passos.push(['material', { sel: s, usa }]); };
  const L = T.meia_largura + 50;
  const C = T.comprimento / 2 + 50;
  const Y0 = 0; const YA = 2600;

  /* Uma parte feita da interseção de prismas: lateral (z, y), frontal (x, y) e, se houver, planta (x, z). */
  const porVistas = (base, nome, material, { lado, secao, plano }) => {
    passos.push(['extrusao', { origemId: base + 1, eixo: 'x', altura: m(2 * L), em: [m(-L), 0, 0], perfil: perfilLateral(lado) }]);
    passos.push(['extrusao', { origemId: base + 2, eixo: 'z', altura: m(2 * C), em: [0, 0, m(-C)], perfil: secaoFrontal(secao) }]);
    const solidos = [sel('extrusao', base + 1), sel('extrusao', base + 2)];
    if (plano) {
      passos.push(['extrusao', { origemId: base + 3, altura: m(YA - Y0), em: [0, m(Y0), 0], perfil: planta(plano) }]);
      solidos.push(sel('extrusao', base + 3));
    }
    passos.push(['intersectar', { origemId: base + 10, solidos }]);
    parte(nome, sel('intersectar', base + 10), material);
  };
  /* Prisma de perfil lateral (z, y) entre x0 e x1. */
  const prisma = (id, nome, material, perfil, x0, x1) => {
    passos.push(['extrusao', { origemId: id, eixo: 'x', altura: m(x1 - x0), em: [m(x0), 0, 0], perfil: perfilLateral(perfil) }]);
    parte(nome, sel('extrusao', id), material);
  };
  /* Prisma de planta (x, z) entre y0 e y1. */
  const prismaY = (id, nome, material, plano, y0, y1) => {
    passos.push(['extrusao', { origemId: id, altura: m(y1 - y0), em: [0, m(y0), 0], perfil: planta(plano) }]);
    parte(nome, sel('extrusao', id), material);
  };
  /* Prisma de seção frontal (x, y) entre z0 e z1. */
  const prismaZ = (id, nome, material, secao, z0, z1) => {
    passos.push(['extrusao', { origemId: id, eixo: 'z', altura: m(z1 - z0), em: [0, 0, m(z0)], perfil: secaoFrontal(secao) }]);
    parte(nome, sel('extrusao', id), material);
  };
  const caixa = (id, nome, material, [x0, x1], [y0, y1], [z0, z1]) => {
    passos.push(['cubo', { origemId: id, larg: m(x1 - x0), alt: m(y1 - y0), prof: m(z1 - z0), em: [m((x0 + x1) / 2), m(y0), m((z0 + z1) / 2)] }]);
    parte(nome, sel('cubo', id), material);
  };

  /* corpo e cabine */
  porVistas(1000, 'carroceria', 'cinzaClaro', { lado: D.ladoCorpo, secao: D.secaoCorpo });
  porVistas(2000, 'cabine', 'cinzaClaro', { lado: D.ladoCabine, secao: D.secaoCabine });
  porVistas(3000, 'parabrisa', 'vidro', { lado: D.ladoParabrisa, secao: D.secaoParabrisa });
  porVistas(4000, 'vidroLateralDir', 'vidro', { lado: D.ladoVidro, secao: D.secaoVidro(1) });
  porVistas(5000, 'vidroLateralEsq', 'vidro', { lado: D.ladoVidro, secao: D.secaoVidro(-1) });

  /* caçamba: piso escuro, duas paredes com borda e a parede de trás */
  caixa(6000, 'assoalho', 'piso', [-T.meia_interna, T.meia_interna], [T.y_piso_corpo, D.yPiso], [T.z_parede_tras_dentro, T.z_caixa_frente]);
  porVistas(7000, 'paredeLateralDir', 'cinzaClaro', { lado: [[-3000, 0], [3000, 0], [3000, 2600], [-3000, 2600]], secao: D.secaoParede(1), plano: D.plantaParede });
  porVistas(8000, 'paredeLateralEsq', 'cinzaClaro', { lado: [[-3000, 0], [3000, 0], [3000, 2600], [-3000, 2600]], secao: D.secaoParede(-1), plano: D.plantaParedeEsq });
  porVistas(9000, 'paredeTraseira', 'cinzaClaro', { lado: D.ladoTras, secao: D.secaoTras, plano: D.plantaTras });

  /* espelhos */
  caixa(10000, 'espelhoDir', 'cinzaClaro', [T.meia_corpo, T.espelho_x1], [T.espelho_y0, T.y_borda], T.espelho_z);
  caixa(10001, 'espelhoEsq', 'cinzaClaro', [-T.espelho_x1, -T.meia_corpo], [T.espelho_y0, T.y_borda], T.espelho_z);

  /* frente: grade escura, faróis, piscas */
  const zf = D.zFrenteCorpo;
  prisma(11000, 'grade', 'cinzaEscuro', [[zf, T.y_corpo_base], [T.z_nariz, T.y_corpo_base], [T.z_nariz, T.y_nariz_topo], [zf, D.yHood(zf)]], -T.meia_corpo, T.meia_corpo);
  const zF1 = T.z_nariz + T.farol_espessura;
  caixa(11001, 'farolDir', 'amarelo', T.farol_x, [T.y_corpo_base, T.y_nariz_topo], [T.z_nariz, zF1]);
  caixa(11002, 'farolEsq', 'amarelo', [-T.farol_x[1], -T.farol_x[0]], [T.y_corpo_base, T.y_nariz_topo], [T.z_nariz, zF1]);
  const lateralFarol = [[T.farol_z_lateral, T.y_corpo_base], [T.z_nariz, T.y_corpo_base], [T.z_nariz, T.y_nariz_topo], [T.farol_z_lateral, D.yHood(T.farol_z_lateral)]];
  prisma(11003, 'farolLateralDir', 'amarelo', lateralFarol, T.meia_corpo, T.farol_x[1]);
  prisma(11004, 'farolLateralEsq', 'amarelo', lateralFarol, -T.farol_x[1], -T.meia_corpo);
  caixa(11005, 'piscaDir', 'cinzaClaro', T.pisca_x, [T.y_corpo_base, T.y_nariz_topo], [T.z_nariz, zF1]);
  caixa(11006, 'piscaEsq', 'cinzaClaro', [-T.pisca_x[1], -T.pisca_x[0]], [T.y_corpo_base, T.y_nariz_topo], [T.z_nariz, zF1]);

  /* traseira: lanternas na face de trás e na lateral da parede */
  const zL = T.z_corpo_tras - T.lanterna_espessura;
  caixa(12000, 'lanternaDir', 'lanterna', [T.lanterna_x_dentro, T.meia_corpo + T.lanterna_espessura], T.lanterna_y, [zL, T.z_corpo_tras]);
  caixa(12001, 'lanternaEsq', 'lanterna', [-(T.meia_corpo + T.lanterna_espessura), -T.lanterna_x_dentro], T.lanterna_y, [zL, T.z_corpo_tras]);
  caixa(12002, 'lanternaLateralDir', 'lanterna', [T.meia_corpo, T.meia_corpo + T.lanterna_espessura], T.lanterna_y, [T.z_corpo_tras, T.z_parede_tras_dentro]);
  caixa(12003, 'lanternaLateralEsq', 'lanterna', [-(T.meia_corpo + T.lanterna_espessura), -T.meia_corpo], T.lanterna_y, [T.z_corpo_tras, T.z_parede_tras_dentro]);

  /* saia, chassi, para-choques, pinos */
  porVistas(13000, 'saiaTras', 'saia', { lado: D.saiaTras, secao: D.secaoSaia });
  porVistas(14000, 'saiaMeio', 'saia', { lado: D.saiaMeio, secao: D.secaoSaia });
  porVistas(15000, 'saiaFrente', 'saia', { lado: D.saiaFrente, secao: D.secaoSaia });
  /* chassi: três segmentos de caixa, entre o para-choque e os vãos das rodas; o fundo dos vãos é da caixa de roda */
  const zT = T.roda_z_tras; const zF = T.roda_z_frente; const pd = D.parede; const cm = T.chassi_meia;
  const yCh = [T.chassi_y0, T.y_saia_base];
  caixa(16006, 'chassiTras', 'cinzaEscuro', [-cm, cm], yCh, [-T.saia_z_fim, zT - pd]);
  caixa(16007, 'chassiMeio', 'cinzaEscuro', [-cm, cm], yCh, [zT + pd, zF - pd]);
  caixa(16008, 'chassiFrente', 'cinzaEscuro', [-cm, cm], yCh, [zF + pd, T.saia_z_fim]);
  prismaY(16001, 'paraChoqueFrente', 'cinzaEscuro', D.pcFrente, T.chassi_y0, T.para_choque_y1);
  prismaY(16002, 'paraChoqueTras', 'cinzaEscuro', D.pcTras, T.chassi_y0, T.para_choque_y1);
  prismaZ(16003, 'pinoFrente', 'cinzaEscuro', D.pino, T.para_choque_z_fora, T.pino_z_frente);
  prismaZ(16004, 'placaFrente', 'cinzaClaro', D.pino, T.pino_z_frente, T.pino_z_ponta);
  prismaZ(16005, 'pinoTras', 'cinzaEscuro', D.pino, -T.pino_z_ponta, -T.para_choque_z_fora);

  /* abas dos arcos e caixas de roda */
  prisma(17000, 'abaFrenteDir', 'cinzaEscuro', D.abaF, T.aba_x_dentro, T.aba_x_fora);
  prisma(17001, 'abaFrenteEsq', 'cinzaEscuro', D.abaF, -T.aba_x_fora, -T.aba_x_dentro);
  prisma(17002, 'abaTrasDir', 'cinzaEscuro', D.abaT, T.aba_x_dentro, T.aba_x_fora);
  prisma(17003, 'abaTrasEsq', 'cinzaEscuro', D.abaT, -T.aba_x_fora, -T.aba_x_dentro);
  prisma(18000, 'caixaRodaFrente', 'saia', D.caixaF, -T.roda_x_dentro, T.roda_x_dentro);
  prisma(18001, 'caixaRodaTras', 'saia', D.caixaT, -T.roda_x_dentro, T.roda_x_dentro);

  /* rodas: pneu de revolução com chanfro nas duas bordas e aro cinza na face de fora */
  const largura = T.roda_x_fora - T.roda_x_dentro; const ch = T.roda_chanfro; const R = T.roda_raio;
  RODAS.forEach((r, k) => {
    const zc = r.ponta === 'Frente' ? T.roda_z_frente : T.roda_z_tras;
    const x0 = r.s > 0 ? T.roda_x_dentro : -T.roda_x_fora;
    passos.push(['lathe', { origemId: 19000 + k, eixo: 'x', lados: T.roda_lados, em: [m(x0), m(R), m(zc)],
      perfil: [[0, 0], [m(R - ch), 0], [m(R), m(ch)], [m(R), m(largura - ch)], [m(R - ch), m(largura)], [0, m(largura)]] }]);
    parte(`roda${r.ponta}${r.nome}`, sel('lathe', 19000 + k), 'pneu');
    const xa = r.s > 0 ? T.roda_x_fora : -(T.roda_x_fora + T.aro_espessura);
    passos.push(['cilindro', { origemId: 19100 + k, raio: m(T.aro_raio), altura: m(T.aro_espessura), lados: T.roda_lados, eixo: 'x', em: [m(xa), m(R), m(zc)] }]);
    parte(`aro${r.ponta}${r.nome}`, { alias: `aroInteiro${k}` }, 'aro');
  });
  return passos;
}

/* O aro é um cilindro inteiro (lateral e as duas tampas). */
const cilindroInteiro = (id) => ({
  unir: [{ origem: { op: 'cilindro', id } }, { origem: { op: 'cilindro', id, tampa: 'fundo' } }, { origem: { op: 'cilindro', id, tampa: 'topo' } }],
});
export const ALIASES = RODAS.map((_, k) => [`aroInteiro${k}`, cilindroInteiro(19100 + k)]);

const lados = ['Dir', 'Esq'];
const pontas = ['Frente', 'Tras'];

export const CONTATOS = [
  /* corpo e cabine */
  { par: ['cabine', 'carroceria'], motivo: 'a face de baixo da cabine, em y 1412, assenta no tampo do corpo, de z 137 a 1717, com os mesmos vértices' },
  { par: ['parabrisa', 'cabine'], motivo: 'a face de trás da placa do para-brisa encosta na face inclinada da frente da cabine, sem folga' },
  { par: ['vidroLateralDir', 'cabine'], motivo: 'o vidro lateral direito assenta na face inclinada da lateral direita da cabine' },
  { par: ['vidroLateralEsq', 'cabine'], motivo: 'o vidro lateral esquerdo assenta na face inclinada da lateral esquerda da cabine' },
  { par: ['parabrisa', 'carroceria'], motivo: 'a aresta de baixo do para-brisa, em y 1412 e z 1717, toca o tampo do corpo no pé da face inclinada' },
  /* caçamba */
  { par: ['assoalho', 'carroceria'], motivo: 'o piso escuro de 8 mm assenta no tampo do corpo sob a caçamba, em y 1085' },
  { par: ['assoalho', 'paredeLateralDir'], motivo: 'a face de fora do piso encosta na face de dentro da parede direita, em x 794' },
  { par: ['assoalho', 'paredeLateralEsq'], motivo: 'a face de fora do piso encosta na face de dentro da parede esquerda, em x -794' },
  { par: ['assoalho', 'paredeTraseira'], motivo: 'a face de trás do piso encosta na face da frente da parede de trás, em z -2158' },
  { par: ['paredeLateralDir', 'carroceria'], motivo: 'a parede direita assenta no tampo do corpo sob a caçamba, em y 1085, e encosta na face de trás da cabine do corpo em z 137' },
  { par: ['paredeLateralEsq', 'carroceria'], motivo: 'a parede esquerda assenta no tampo do corpo sob a caçamba, em y 1085, e encosta na face de trás da cabine do corpo em z 137' },
  { par: ['paredeTraseira', 'carroceria'], motivo: 'a parede de trás assenta no tampo do corpo sob a caçamba, em y 1085, de z -2334 a -2158' },
  { par: ['paredeLateralDir', 'paredeTraseira'], motivo: 'a parede direita encosta na face da frente da parede de trás, em z -2158' },
  { par: ['paredeLateralEsq', 'paredeTraseira'], motivo: 'a parede esquerda encosta na face da frente da parede de trás, em z -2158' },
  { par: ['espelhoDir', 'carroceria'], motivo: 'a face de dentro do espelho direito encosta na lateral do corpo, em x 971, de z 1540 a 1717' },
  { par: ['espelhoEsq', 'carroceria'], motivo: 'a face de dentro do espelho esquerdo encosta na lateral do corpo, em x -971, de z 1540 a 1717' },
  /* frente e traseira */
  { par: ['grade', 'carroceria'], motivo: 'a face de trás da grade, em z 2234, encosta na face da frente do corpo, que sai do mesmo perfil' },
  { par: ['grade', 'saiaFrente'], motivo: 'a grade assenta na face de cima da saia, em y 882, na quina da frente' },
  { par: ['farolDir', 'grade'], motivo: 'a face de trás do farol direito encosta na face da frente da grade, em z 2246' },
  { par: ['farolEsq', 'grade'], motivo: 'a face de trás do farol esquerdo encosta na face da frente da grade, em z 2246' },
  { par: ['piscaDir', 'grade'], motivo: 'a face de trás do pisca direito encosta na face da frente da grade, em z 2246' },
  { par: ['piscaEsq', 'grade'], motivo: 'a face de trás do pisca esquerdo encosta na face da frente da grade, em z 2246' },
  { par: ['farolLateralDir', 'carroceria'], motivo: 'a placa amarela lateral direita encosta na lateral do corpo, em x 971, da quina da frente até z 2070' },
  { par: ['farolLateralEsq', 'carroceria'], motivo: 'a placa amarela lateral esquerda encosta na lateral do corpo, em x -971, da quina da frente até z 2070' },
  { par: ['farolLateralDir', 'farolDir'], motivo: 'a placa lateral direita encosta no farol direito na quina, no plano z 2246, entre x 971 e 977' },
  { par: ['farolLateralEsq', 'farolEsq'], motivo: 'a placa lateral esquerda encosta no farol esquerdo na quina, no plano z 2246, entre x -977 e -971' },
  { par: ['lanternaDir', 'paredeTraseira'], motivo: 'a face da frente da lanterna direita encosta na face de trás da parede de trás, em z -2334' },
  { par: ['lanternaEsq', 'paredeTraseira'], motivo: 'a face da frente da lanterna esquerda encosta na face de trás da parede de trás, em z -2334' },
  { par: ['lanternaLateralDir', 'paredeTraseira'], motivo: 'a placa vermelha lateral direita encosta na lateral da parede de trás, em x 971' },
  { par: ['lanternaLateralEsq', 'paredeTraseira'], motivo: 'a placa vermelha lateral esquerda encosta na lateral da parede de trás, em x -971' },
  { par: ['lanternaLateralDir', 'lanternaDir'], motivo: 'a placa lateral direita encosta na lanterna de trás na quina, no plano z -2334' },
  { par: ['lanternaLateralEsq', 'lanternaEsq'], motivo: 'a placa lateral esquerda encosta na lanterna de trás na quina, no plano z -2334' },
  /* saia, chassi e para-choques */
  { par: ['saiaFrente', 'carroceria'], motivo: 'a face de cima da saia da frente, em y 882, encosta na face de baixo do corpo' },
  { par: ['saiaMeio', 'carroceria'], motivo: 'a face de cima da saia do meio, em y 882, encosta na face de baixo do corpo' },
  { par: ['saiaTras', 'carroceria'], motivo: 'a face de cima da saia de trás, em y 882, encosta na face de baixo do corpo' },
  { par: ['saiaFrente', 'chassiFrente'], motivo: 'a saia da frente assenta na face de cima do segmento da frente do chassi, em y 530' },
  { par: ['saiaMeio', 'chassiMeio'], motivo: 'a saia do meio assenta na face de cima do segmento do meio do chassi, em y 530' },
  { par: ['saiaTras', 'chassiTras'], motivo: 'a saia de trás assenta na face de cima do segmento de trás do chassi, em y 530' },
  { par: ['saiaFrente', 'paraChoqueFrente'], motivo: 'a saia da frente assenta na face de cima do para-choque, em y 706, e encosta na face de trás dele em z 2158' },
  { par: ['saiaTras', 'paraChoqueTras'], motivo: 'a saia de trás assenta na face de cima do para-choque, em y 706, e encosta na face da frente dele em z -2158' },
  { par: ['chassiFrente', 'paraChoqueFrente'], motivo: 'a face da frente do segmento da frente do chassi, em z 2158, encosta na face de trás do para-choque da frente' },
  { par: ['chassiTras', 'paraChoqueTras'], motivo: 'a face de trás do segmento de trás do chassi, em z -2158, encosta na face da frente do para-choque de trás' },
  { par: ['pinoFrente', 'paraChoqueFrente'], motivo: 'a face de trás do pino da frente encosta na face da frente do para-choque, em z 2334' },
  { par: ['placaFrente', 'pinoFrente'], motivo: 'a placa clara encosta na face da frente do pino, em z 2411, com o mesmo octógono' },
  { par: ['pinoTras', 'paraChoqueTras'], motivo: 'a face da frente do pino de trás encosta na face de trás do para-choque, em z -2334' },
  { par: ['caixaRodaFrente', 'chassiMeio'], motivo: 'a parede de trás da caixa de roda da frente, em z 846, encosta na face da frente do segmento do meio do chassi, de y 353 a 530' },
  { par: ['caixaRodaFrente', 'chassiFrente'], motivo: 'a parede da frente da caixa de roda da frente, em z 1915, encosta na face de trás do segmento da frente do chassi, de y 353 a 530' },
  { par: ['caixaRodaTras', 'chassiTras'], motivo: 'a parede de trás da caixa de roda de trás, em z -1659, encosta na face da frente do segmento de trás do chassi, de y 353 a 530' },
  { par: ['caixaRodaTras', 'chassiMeio'], motivo: 'a parede da frente da caixa de roda de trás, em z -590, encosta na face de trás do segmento do meio do chassi, de y 353 a 530' },
  { par: ['caixaRodaFrente', 'carroceria'], motivo: 'o arco da roda da frente é o mesmo polígono recortado no perfil do corpo, e a caixa o fecha entre os pneus' },
  { par: ['caixaRodaTras', 'carroceria'], motivo: 'o arco da roda de trás é o mesmo polígono recortado no perfil do corpo, e a caixa o fecha entre os pneus' },
  { par: ['caixaRodaFrente', 'saiaFrente'], motivo: 'a caixa da roda da frente encosta nas pontas da saia, nas paredes verticais do arco' },
  { par: ['caixaRodaFrente', 'saiaMeio'], motivo: 'a caixa da roda da frente encosta na ponta da saia do meio, na parede vertical do arco' },
  { par: ['caixaRodaTras', 'saiaMeio'], motivo: 'a caixa da roda de trás encosta na ponta da saia do meio, na parede vertical do arco' },
  { par: ['caixaRodaTras', 'saiaTras'], motivo: 'a caixa da roda de trás encosta na ponta da saia de trás, na parede vertical do arco' },
  ...lados.flatMap((l) => [
    { par: [`abaFrente${l}`, 'chassiMeio'], motivo: 'a base da aba da frente, em y 530, assenta na face de cima do segmento do meio do chassi, atrás do vão da roda' },
    { par: [`abaFrente${l}`, 'chassiFrente'], motivo: 'a base da aba da frente, em y 530, assenta na face de cima do segmento da frente do chassi, na frente do vão da roda' },
    { par: [`abaTras${l}`, 'chassiTras'], motivo: 'a base da aba de trás, em y 530, assenta na face de cima do segmento de trás do chassi, atrás do vão da roda' },
    { par: [`abaTras${l}`, 'chassiMeio'], motivo: 'a base da aba de trás, em y 530, assenta na face de cima do segmento do meio do chassi, na frente do vão da roda' },
  ]),
  ...lados.flatMap((l) => pontas.map((p) => ({ par: [`aba${p}${l}`, 'carroceria'], motivo: 'a face de dentro da aba, em x 971 ou -971, encosta na lateral do corpo' }))),
  /* contatos por aresta ou por faixa estreita, que saem dos mesmos números da tabela */
  ...lados.flatMap((l) => [
    { par: [`espelho${l}`, 'cabine'], motivo: 'a aresta de cima do espelho, em y 1412 e x 971, toca a aresta de baixo da lateral da cabine' },
    { par: [`paredeLateral${l}`, 'cabine'], motivo: 'a aresta de cima da parede, em y 1412 e z 137, toca a aresta de baixo da face de trás da cabine' },
    { par: [`farol${l}`, `pisca${l}`], motivo: 'a face de dentro do farol, em x 547, encosta na face de fora do pisca, na mesma altura da grade' },
    { par: [`farol${l}`, 'saiaFrente'], motivo: 'a aresta de baixo do farol, em y 882 e z 2246, toca a aresta de cima da saia da frente' },
    { par: [`pisca${l}`, 'saiaFrente'], motivo: 'a aresta de baixo do pisca, em y 882 e z 2246, toca a aresta de cima da saia da frente' },
    { par: [`farolLateral${l}`, 'grade'], motivo: 'a placa lateral encosta na lateral da grade, em x 971 ou -971, de z 2234 a 2246' },
    { par: [`farolLateral${l}`, 'saiaFrente'], motivo: 'a placa lateral assenta na face de cima da saia da frente, em y 882, de z 2070 a 2246' },
    { par: [`lanterna${l}`, 'carroceria'], motivo: 'a aresta de baixo da lanterna, em y 1085 e z -2334, toca a aresta de cima da face de trás do corpo' },
    { par: [`lanternaLateral${l}`, 'carroceria'], motivo: 'a aresta de baixo da placa lateral, em y 1085 e x 971, toca a aresta de cima da lateral do corpo' },
    { par: [`lanternaLateral${l}`, `paredeLateral${l}`], motivo: 'a face da frente da placa lateral encosta na face de trás da parede, em z -2158' },
  ]),
  ...lados.flatMap((l) => [
    { par: [`abaFrente${l}`, 'saiaFrente'], motivo: 'a aresta de dentro da aba, em x 971 e y 882, toca a aresta de cima da lateral da saia da frente' },
    { par: [`abaFrente${l}`, 'saiaMeio'], motivo: 'a aresta de dentro da aba, em x 971 e y 882, toca a aresta de cima da lateral da saia do meio' },
    { par: [`abaTras${l}`, 'saiaMeio'], motivo: 'a aresta de dentro da aba, em x 971 e y 882, toca a aresta de cima da lateral da saia do meio' },
    { par: [`abaTras${l}`, 'saiaTras'], motivo: 'a aresta de dentro da aba, em x 971 e y 882, toca a aresta de cima da lateral da saia de trás' },
    { par: [`abaTras${l}`, `paredeLateral${l}`], motivo: 'a face de dentro da aba de trás, em x 971, encosta na lateral da parede da caçamba, de y 1085 a 1218' },
  ]),
  /* rodas */
  ...lados.flatMap((l) => pontas.flatMap((p) => [
    { par: [`aro${p}${l}`, `roda${p}${l}`], motivo: 'a face de dentro do aro encosta na face de fora do pneu, em x 1059 ou -1059, no disco do centro' },
    { par: [`roda${p}${l}`, `caixaRoda${p}`], motivo: 'a face de dentro do pneu encosta na face da caixa de roda, em x 530 ou -530, que fecha o arco entre os dois pneus' },
  ])),
];

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha. */
export function pontosDeclarados(T = TABELA) {
  const tol = 1;
  return [
    { nome: 'canto de trás da borda, à esquerda, embaixo', parte: 'paredeTraseira', medida: 'minimo', em: [-T.meia_borda, T.y_piso_corpo, T.z_borda_tras], toleranciaMm: tol },
    { nome: 'teto da cabine, atrás, à direita', parte: 'cabine', medida: 'maximo', em: [T.meia_corpo, T.y_teto, T.z_capo_fim], toleranciaMm: tol },
    { nome: 'ponta do pino da frente, em cima', parte: 'placaFrente', medida: 'maximo', em: [T.pino_meia, T.pino_y1, T.pino_z_ponta], toleranciaMm: tol },
    { nome: 'ponta do pino de trás, embaixo', parte: 'pinoTras', medida: 'minimo', em: [-T.pino_meia, T.pino_y0, -T.pino_z_ponta], toleranciaMm: tol },
    { nome: 'pneu de trás, à esquerda, embaixo', parte: 'rodaTrasEsq', medida: 'minimo', em: [-T.roda_x_fora, 0, T.roda_z_tras - T.roda_raio], toleranciaMm: tol },
    { nome: 'pneu da frente, à direita, em cima', parte: 'rodaFrenteDir', medida: 'maximo', em: [T.roda_x_fora, 2 * T.roda_raio, T.roda_z_frente + T.roda_raio], toleranciaMm: tol },
    { nome: 'ponta do espelho direito', parte: 'espelhoDir', medida: 'maximo', em: [T.espelho_x1, T.y_borda, T.espelho_z[1]], toleranciaMm: tol },
    { nome: 'canto da frente do para-choque, à esquerda, embaixo', parte: 'paraChoqueFrente', medida: 'minimo', em: [-T.chassi_meia, T.chassi_y0, T.para_choque_z_dentro], toleranciaMm: tol },
  ];
}

const receita = {
  meta: { nome: 'picape-plataforma', desc: 'picape de brinquedo cinza clara, cabine curta e afunilada, caçamba rasa de borda larga, abas escuras nos arcos, para-choques e rodas com aro' },
  PARAMS: TABELA,
  MATERIAIS: {
    cinzaClaro: { tipo: 'liso', cor: '#d9d9e1' },
    vidro: { tipo: 'liso', cor: '#cfe4f4' },
    cinzaEscuro: { tipo: 'liso', cor: '#565869' },
    saia: { tipo: 'liso', cor: '#464859' },
    piso: { tipo: 'liso', cor: '#6d6f82' },
    pneu: { tipo: 'liso', cor: '#26262a' },
    aro: { tipo: 'metal', cor: '#7d84a1', acabamento: 'escovado' },
    amarelo: { tipo: 'liso', cor: '#e6b422' },
    lanterna: { tipo: 'liso', cor: '#c93a2c' },
  },
  TOPO: { origem: 'chão, no meio da picape em x e em z; y para cima e a frente da picape em +z' },
  PLANO: {
    objeto: 'picape de brinquedo de 4846 mm de comprimento, 2648 mm de largura com espelhos e 2295 mm de altura, cinza clara, com cabine curta afunilada, caçamba rasa de borda larga e piso escuro',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total da picape, de z -2423 a 2423', milimetros: 4846 },
    familia: 'veiculo',
    partes: [
      { nome: 'carroceria', forma: 'corpo cinza claro de 1942 mm de largura, de y 882 ao topo do capô e da borda em y 1412, com o capô inclinado do nariz (z 2234) ao pé do para-brisa (z 1717), o piso da caçamba até y 1085 e os quatro arcos recortados na base', tecnica: 'interseção de perfil lateral com os arcos de roda recortados na base e seção frontal retangular' },
      { nome: 'cabine', forma: 'cabine curta de y 1412 a 2294 e de z 128 a 1717, com teto plano, traseira quase vertical, para-brisa inclinado e seção que afunila de 1942 mm de largura embaixo para 1588 mm no teto', tecnica: 'interseção de perfil lateral trapezoidal e seção frontal que afunila' },
      { nome: 'parabrisa', forma: 'placa azul clara de 12 mm sobre a face inclinada da frente da cabine, de y 1412 a 2157, com 1584 mm de largura embaixo e 1300 mm em cima', tecnica: 'interseção de uma faixa lateral inclinada e de uma seção frontal trapezoidal' },
      { nome: 'vidroLateralDir', forma: 'placa azul clara de 12 mm na face inclinada da lateral direita da cabine, de z 498 a 1492 embaixo e a 925 em cima, de y 1412 a 2157', tecnica: 'interseção de um quadrilátero lateral e de uma faixa inclinada da seção frontal' },
      { nome: 'vidroLateralEsq', forma: 'placa azul clara de 12 mm na face inclinada da lateral esquerda da cabine, espelhada da direita', tecnica: 'interseção de um quadrilátero lateral e de uma faixa inclinada da seção frontal' },
      { nome: 'assoalho', forma: 'piso escuro da caçamba de 1588 por 2295 mm e 8 mm de espessura, em y 1085 a 1093, de z -2158 a 137', tecnica: 'caixa assentada no tampo do corpo' },
      { nome: 'paredeLateralDir', forma: 'parede direita da caçamba de 177 mm de espessura (x 794 a 971), de y 1085 a 1412, com a borda mais larga (até x 1059) acima de y 1236 e a ponta da frente chanfrada', tecnica: 'interseção da seção frontal em L com a planta chanfrada' },
      { nome: 'paredeLateralEsq', forma: 'parede esquerda da caçamba, espelhada da direita', tecnica: 'interseção da seção frontal em L com a planta chanfrada' },
      { nome: 'paredeTraseira', forma: 'parede de trás da caçamba, de z -2334 a -2158 (borda até -2423 acima de y 1236, com cantos chanfrados), de y 1085 a 1412, com 2118 mm de largura na borda', tecnica: 'interseção do perfil lateral em degrau, da seção frontal em L e da planta chanfrada' },
      { nome: 'espelhoDir', forma: 'caixa clara de 353 por 176 por 177 mm que sai da lateral direita do corpo até x 1324, de y 1236 a 1412, na base do para-brisa', tecnica: 'caixa encostada na lateral do corpo' },
      { nome: 'espelhoEsq', forma: 'caixa clara de 353 por 176 por 177 mm que sai da lateral esquerda do corpo até x -1324, de y 1236 a 1412', tecnica: 'caixa encostada na lateral do corpo' },
      { nome: 'grade', forma: 'placa escura de 12 mm que fecha a frente do corpo, de y 882 a 1059 na face e até o capô em cima, com 1942 mm de largura', tecnica: 'extrusão em x de um trapézio lateral' },
      { nome: 'farolDir', forma: 'placa amarela de 430 por 177 por 6 mm na face da frente, à direita, de x 547 a 977 e de y 882 a 1059', tecnica: 'caixa encostada na face da grade' },
      { nome: 'farolEsq', forma: 'placa amarela de 430 por 177 por 6 mm na face da frente, à esquerda', tecnica: 'caixa encostada na face da grade' },
      { nome: 'farolLateralDir', forma: 'placa amarela de 6 mm na lateral direita do nariz, de z 2070 a 2246 e de y 882 até a linha do capô', tecnica: 'extrusão em x de um quadrilátero lateral' },
      { nome: 'farolLateralEsq', forma: 'placa amarela de 6 mm na lateral esquerda do nariz, espelhada da direita', tecnica: 'extrusão em x de um quadrilátero lateral' },
      { nome: 'piscaDir', forma: 'placa clara de 182 por 177 por 6 mm na face da grade, entre o farol direito e o centro, de x 365 a 547', tecnica: 'caixa encostada na face da grade' },
      { nome: 'piscaEsq', forma: 'placa clara de 182 por 177 por 6 mm na face da grade, entre o farol esquerdo e o centro', tecnica: 'caixa encostada na face da grade' },
      { nome: 'lanternaDir', forma: 'placa vermelha de 8 mm na face de trás da parede de trás, à direita, de x 640 a 979 e de y 1085 a 1236', tecnica: 'caixa encostada na face de trás' },
      { nome: 'lanternaEsq', forma: 'placa vermelha de 8 mm na face de trás da parede de trás, à esquerda', tecnica: 'caixa encostada na face de trás' },
      { nome: 'lanternaLateralDir', forma: 'placa vermelha de 8 mm na lateral direita da parede de trás, de z -2334 a -2158 e de y 1085 a 1236', tecnica: 'caixa encostada na lateral da parede' },
      { nome: 'lanternaLateralEsq', forma: 'placa vermelha de 8 mm na lateral esquerda da parede de trás', tecnica: 'caixa encostada na lateral da parede' },
      { nome: 'saiaTras', forma: 'faixa escura de y 530 a 882 atrás da roda de trás, que afunila para baixo (x 853 em y 530) e recua a traseira (z -2217 em y 706)', tecnica: 'interseção de perfil lateral com o arco recortado e seção frontal trapezoidal' },
      { nome: 'saiaMeio', forma: 'faixa escura de y 530 a 882 entre as duas rodas, que afunila para baixo', tecnica: 'interseção de perfil lateral com os dois arcos e seção frontal trapezoidal' },
      { nome: 'saiaFrente', forma: 'faixa escura de y 530 a 882 na frente da roda dianteira, que afunila para baixo e recua o nariz (z 2187 em y 706)', tecnica: 'interseção de perfil lateral com o arco recortado e seção frontal trapezoidal' },
      { nome: 'chassiTras', forma: 'segmento escuro de y 353 a 530 atrás do vão da roda de trás, de z -2158 a -1659, com 2294 mm de largura', tecnica: 'caixa' },
      { nome: 'chassiMeio', forma: 'segmento escuro de y 353 a 530 entre os vãos das duas rodas, de z -590 a 846, com 2294 mm de largura', tecnica: 'caixa' },
      { nome: 'chassiFrente', forma: 'segmento escuro de y 353 a 530 na frente do vão da roda dianteira, de z 1915 a 2158, com 2294 mm de largura', tecnica: 'caixa' },
      { nome: 'paraChoqueFrente', forma: 'para-choque escuro de 2294 mm de largura, de y 353 a 706 e de z 2158 a 2334, com os cantos chanfrados em dois lados', tecnica: 'extrusão em y da planta chanfrada' },
      { nome: 'paraChoqueTras', forma: 'para-choque escuro de 2294 mm de largura, de y 353 a 706 e de z -2334 a -2158, com os cantos chanfrados em dois lados', tecnica: 'extrusão em y da planta chanfrada' },
      { nome: 'pinoFrente', forma: 'pino escuro de seção octogonal de 618 por 309 mm, de y 265 a 574, que sai do para-choque da frente de z 2334 a 2411', tecnica: 'extrusão em z do octógono' },
      { nome: 'placaFrente', forma: 'placa clara de 12 mm de espessura na ponta do pino da frente, de z 2411 a 2423, com o mesmo octógono', tecnica: 'extrusão em z do octógono' },
      { nome: 'pinoTras', forma: 'pino escuro de seção octogonal que sai do para-choque de trás, de z -2423 a -2334', tecnica: 'extrusão em z do octógono' },
      { nome: 'abaFrenteDir', forma: 'aba escura de arco da roda da frente à direita, de x 971 a 1147, em anel de 545 a 701 mm de raio, de y 530 a 1218', tecnica: 'extrusão em x do anel do arco' },
      { nome: 'abaFrenteEsq', forma: 'aba escura de arco da roda da frente à esquerda', tecnica: 'extrusão em x do anel do arco' },
      { nome: 'abaTrasDir', forma: 'aba escura de arco da roda de trás à direita, de x 971 a 1147, de y 530 a 1218', tecnica: 'extrusão em x do anel do arco' },
      { nome: 'abaTrasEsq', forma: 'aba escura de arco da roda de trás à esquerda', tecnica: 'extrusão em x do anel do arco' },
      { nome: 'caixaRodaFrente', forma: 'caixa escura que fecha o arco e o fundo do vão da roda da frente entre as faces de dentro dos pneus, de x -530 a 530, de y 353 ao teto do arco', tecnica: 'extrusão em x do polígono do arco, fechado na base' },
      { nome: 'caixaRodaTras', forma: 'caixa escura que fecha o arco e o fundo do vão da roda de trás entre as faces de dentro dos pneus, de x -530 a 530', tecnica: 'extrusão em x do polígono do arco, fechado na base' },
      { nome: 'rodaFrenteDir', forma: 'pneu escuro de 1060 mm de diâmetro e 529 mm de largura, com chanfro de 40 mm nas bordas, na roda da frente à direita, com 24 lados', tecnica: 'lathe de eixo x do perfil do pneu com chanfro' },
      { nome: 'rodaFrenteEsq', forma: 'pneu escuro de 1060 mm de diâmetro e 529 mm de largura, com chanfro de 40 mm nas bordas, na roda da frente à esquerda, com 24 lados', tecnica: 'lathe de eixo x do perfil do pneu com chanfro' },
      { nome: 'rodaTrasDir', forma: 'pneu escuro de 1060 mm de diâmetro e 529 mm de largura, com chanfro de 40 mm nas bordas, na roda de trás à direita, com 24 lados', tecnica: 'lathe de eixo x do perfil do pneu com chanfro' },
      { nome: 'rodaTrasEsq', forma: 'pneu escuro de 1060 mm de diâmetro e 529 mm de largura, com chanfro de 40 mm nas bordas, na roda de trás à esquerda, com 24 lados', tecnica: 'lathe de eixo x do perfil do pneu com chanfro' },
      { nome: 'aroFrenteDir', forma: 'disco cinza azulado de 540 mm de diâmetro e 15 mm de espessura, saindo da face de fora do pneu da frente à direita', tecnica: 'cilindro de eixo x' },
      { nome: 'aroFrenteEsq', forma: 'disco cinza azulado de 540 mm de diâmetro e 15 mm de espessura, saindo da face de fora do pneu da frente à esquerda', tecnica: 'cilindro de eixo x' },
      { nome: 'aroTrasDir', forma: 'disco cinza azulado de 540 mm de diâmetro e 15 mm de espessura, saindo da face de fora do pneu de trás à direita', tecnica: 'cilindro de eixo x' },
      { nome: 'aroTrasEsq', forma: 'disco cinza azulado de 540 mm de diâmetro e 15 mm de espessura, saindo da face de fora do pneu de trás à esquerda', tecnica: 'cilindro de eixo x' },
    ],
    criteriosDeReprovacao: [
      'o conjunto não mede 4846 mm de comprimento, 2648 mm de largura com espelhos ou 2295 mm de altura, ou alguma roda não toca o chão',
      'um lado da picape difere do outro em medida ou posição de peça simétrica',
      'a cabine tem largura constante em vez de afunilar de 1942 mm embaixo para 1588 mm no teto, ou o capô não sobe inclinado até o pé do para-brisa',
      'a caçamba é uma caixa fechada ou tem paredes altas e soltas, em vez de piso escuro raso com parede de 177 mm e borda mais larga',
      'uma roda não tem pneu escuro com aro cinza, não aparece no arco recortado ou o arco não tem aba escura e caixa de roda',
      'o para-brisa e os vidros laterais não são placas azul claras na face inclinada da cabine',
      'a saia escura, os para-choques e os pinos não formam a faixa escura de baixo mais larga que o corpo',
      'a silhueta lateral ou frontal não confere com a referência em mais de dois por cento do comprimento',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  ALIASES,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;

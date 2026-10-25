/* picape-angular — picape de cabine afunilada e caçamba aberta (fundo, paredes laterais e tampa traseira), com santantônio atrás da
 * cabine, para-choques de barra com protetor de duas barras na frente, faróis, lanternas e quatro rodas octogonais.
 *
 * Origem: recriada em primitivas do núcleo a partir do modelo "Pickup" do pacote pacote D, de autor D, licença
 * licença livre sem exigência de crédito, na página endereço omitido. A malha original NÃO está no repositório
 * (fica em importados/veiculos-livres/pacote-d/Pickup.fbx, ignorada pelo git). Em referencias/ ficam as quatro vistas ortográficas
 * (fonte-vistas.png) e as silhuetas em fatias (fonte-partes.json), lidas dessa malha em metro. As medidas desta tabela vêm dessas
 * silhuetas e das faces da própria malha, lidas em milímetro (a escala da fonte é 0,0064 m por unidade).
 *
 * Referencial do acervo: y para cima, o chão em y = 0, a frente em +z, x para a direita de quem olha de frente, centrado em x e z.
 * A TABELA é em milímetro e é a única fonte das medidas; `derivar` calcula os perfis e as seções e `gerarPassos` escreve as formas,
 * com a conversão para metro num lugar só (`m`).
 *
 * Como a forma nasce: cada volume da carroceria é a INTERSEÇÃO de três sólidos, o perfil lateral (z, y) extrudado em x, a seção
 * frontal (x, y) extrudada em z e uma caixa que recorta a faixa de y e de z daquela parte. É isso que dá o afunilamento da cabine
 * (meia largura de 1043 mm na cintura e 891 mm no teto, ou 1782 mm de largura no teto, como a fonte), o ombro da lateral e a saia
 * recolhida embaixo, sem nenhum vértice calculado em 3D. Como as partes saem dos mesmos prismas, as faces em que se encontram
 * são o mesmo plano de corte e o contato fecha exato, sem `unir`. Os arcos de roda são recortados no próprio perfil lateral, e a
 * caixa de roda fecha o arco entre as faces de dentro dos dois pneus. A caçamba é a interseção com uma seção em U (fundo e paredes),
 * com a tampa traseira como parte própria. O vidro lateral e o para-brisa são placas de 10 mm que ocupam a própria face da cabine;
 * a cabine verde é recuada por essa espessura, e o teto fecha por cima.
 *
 * Na extrusão do núcleo, com eixo x o ponto [u, v] vai para y = -u e z = v; com eixo z vai para x = u e y = -v.
 * Simplificações em relação à fonte estão em referencias/alvo.md.
 */

export const TABELA = {
  comprimento: 5200,
  meia_largura: 1190,

  // seção frontal da carroceria (meia largura, altura): saia em 1033 mm, ombro em 1108 mm, cintura em 1043 mm
  y_base: 322,
  meia_base: 1033,
  y_ombro: 900,
  meia_ombro: 1108,
  y_cintura: 1370,
  meia_cintura: 1043,

  // perfil lateral do corpo, de frente para trás (z, y): nariz, capô, e a caçamba
  z_frente_base: 2431,
  z_frente_ombro: 2509,
  y_frente_ombro: 932,
  z_nariz: 2418,
  y_nariz: 1230,
  z_capo_fim: 1193,
  z_cab_tras: -494,
  z_tras_base: -2515,
  z_tras_ombro: -2577,
  y_tras_ombro: 932,
  z_tras_topo: -2546,

  // caçamba: o fundo em y 988, as paredes internas em x 919 e a tampa traseira de z -2546 a -2446 (100 mm de espessura)
  y_fundo: 988,
  meia_interna: 919,
  z_tampa_dentro: -2446,

  // arcos de roda, recortados no perfil lateral: centro em z, meia largura na base, no ombro, e altura do ombro e do topo
  arco_frente: { zc: 1652, base: 491, ombro: 443, y_ombro: 884, y_topo: 985 },
  arco_tras: { zc: -1366, base: 487, ombro: 400, y_ombro: 852, y_topo: 973 },

  // cabine: o perfil lateral (traseira quase vertical, para-brisa inclinado, teto plano) e a seção que afunila para o teto
  z_cab_tras_topo: -425,
  y_teto: 1925,
  z_teto_frente: 605,
  z_pb_topo: 662,
  y_pb_topo: 1908,
  y_vidro_topo: 1893,
  meia_vidro_topo: 935,
  meia_teto: 891,
  vidro_espessura: 10,
  pb_meia_base: 1003,
  pb_meia_topo: 895,
  vidro_lateral_tras: [-388, -371],
  vidro_lateral_frente: [1107, 610],

  // rodas: octógonos com vértice em cima, de raio 441, largura de 267 mm (de x 864 a 1131); o aro cinza é a tampa de 10 mm da face de fora
  raio_roda: 441,
  lados_roda: 8,
  x_roda_dentro: 864,
  x_roda_fora: 1131,
  raio_aro: 312,
  espessura_aro: 10,
  z_roda_frente: 1662,
  z_roda_tras: -1363,

  // santantônio: travessa atrás do teto, dois montantes e duas escoras que descem inclinadas para dentro da caçamba
  barra_meia_travessa: 889,
  barra_x_dentro: 701,
  barra_x_fora: 889,
  barra_z: [-673, -507],
  barra_y_travessa: [1765, 1922],
  barra_y_pe: 942,
  barra_z_escora_fim: -2035,
  barra_y_escora_fim: [797, 955],

  // para-choques de barra (y 266 a 595) e protetor de duas barras verticais na frente
  y_para_choque: [266, 595],
  para_choque_frente: { meia: 1119, z: [2286, 2598] },
  para_choque_tras: { meia: 1189, z: [-2598, -2286] },
  protetor: { x: [325, 513], y: [398, 1221], z: [2214, 2526] },

  // faróis (placas de 6 mm sobre a face inclinada do nariz) e lanternas (placas de 15 mm sobre a face de trás)
  farol: { x: [726, 1043], y_base: 1063, espessura: 6 },
  lanterna: { x: [699, 1074], y: [1173, 1362], espessura: 15 },
};

const m = (mm) => mm / 1000;
const area = (l) => l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0) / 2;
const antihorario = (l) => (area(l) < 0 ? [...l].reverse() : l);
/* Mapeamento do núcleo, medido: eixo x leva [u, v] a (y = -u, z = v); eixo z leva [u, v] a (x = u, y = -v). Entram milímetro; saem metro. */
const perfilLateral = (zy) => antihorario(zy.map(([z, y]) => [-y, z])).map(([u, v]) => [m(u), m(v)]);
const secaoFrontal = (xy) => antihorario(xy.map(([x, y]) => [x, -y])).map(([u, v]) => [m(u), m(v)]);
/* A meia seção, do lado direito de baixo para cima, vira a seção inteira com o lado esquerdo espelhado. */
const espelhar = (meia) => [...meia, ...[...meia].reverse().map(([x, y]) => [-x, y])];

/* O arco de roda: de trás para a frente, a base, o ombro, o topo, o ombro e a base. */
const arco = (a, y0) => [[a.zc - a.base, y0], [a.zc - a.ombro, a.y_ombro], [a.zc, a.y_topo], [a.zc + a.ombro, a.y_ombro], [a.zc + a.base, y0]];

/* Octógono com vértice em cima e embaixo, em volta do eixo da roda, em (z, y). */
const octogono = (zc, yc, r, lados) => Array.from({ length: lados }, (_, k) => {
  const a = (2 * Math.PI * k) / lados;
  return [zc + r * Math.sin(a), yc + r * Math.cos(a)];
});

/* Perfis, seções e caixas em milímetro, calculados da TABELA. */
export function derivar(T) {
  const y0 = T.y_base;
  const arcoF = arco(T.arco_frente, y0);
  const arcoT = arco(T.arco_tras, y0);
  const t = T.vidro_espessura;
  const cabLado = (d) => [[T.z_cab_tras, T.y_cintura], [T.z_capo_fim - d, T.y_cintura], [T.z_pb_topo - d, T.y_pb_topo], [T.z_teto_frente - d, T.y_teto], [T.z_cab_tras_topo, T.y_teto]];
  const [zbT, zbF] = T.barra_z;
  const [yp0, yp1] = T.barra_y_travessa;
  const face = (z0, y0f, z1, y1f, y) => z0 + ((y - y0f) * (z1 - z0)) / (y1f - y0f);
  return {
    /* corpo da frente: do fim da caçamba ao nariz, com o arco da roda dianteira recortado na base */
    ladoCorpo: [[T.z_cab_tras, y0], ...arcoF, [T.z_frente_base, y0], [T.z_frente_ombro, T.y_frente_ombro], [T.z_nariz, T.y_nariz], [T.z_capo_fim, T.y_cintura], [T.z_cab_tras, T.y_cintura]],
    /* corpo de trás: o fundo e as paredes da caçamba, com o arco da roda traseira */
    ladoCacamba: [[T.z_tras_base, y0], ...arcoT, [T.z_cab_tras, y0], [T.z_cab_tras, T.y_cintura], [T.z_tras_topo, T.y_cintura], [T.z_tras_ombro, T.y_tras_ombro]],
    secaoCorpo: espelhar([[T.meia_base, y0], [T.meia_ombro, T.y_ombro], [T.meia_cintura, T.y_cintura]]),
    secaoU: espelhar([[T.meia_base, y0], [T.meia_ombro, T.y_ombro], [T.meia_cintura, T.y_cintura], [T.meia_interna, T.y_cintura], [T.meia_interna, T.y_fundo]]),
    arcoF,
    arcoT,
    /* cabine: o miolo verde é recuado pela espessura do vidro, e o teto e os vidros fecham por fora */
    cabLadoFora: cabLado(0),
    cabLadoMiolo: cabLado(t),
    secaoMiolo: espelhar([[T.meia_cintura - t, T.y_cintura], [T.meia_vidro_topo - t, T.y_vidro_topo]]),
    secaoTeto: espelhar([[T.meia_vidro_topo, T.y_vidro_topo], [T.meia_teto, T.y_teto]]),
    secaoParabrisa: espelhar([[T.pb_meia_base, T.y_cintura], [T.pb_meia_topo, T.y_pb_topo]]),
    ladoParabrisa: [[T.z_capo_fim, T.y_cintura], [T.z_pb_topo, T.y_pb_topo], [T.z_pb_topo - t, T.y_pb_topo], [T.z_capo_fim - t, T.y_cintura]],
    ladoVidro: [[T.vidro_lateral_tras[0], T.y_cintura], [T.vidro_lateral_tras[1], T.y_vidro_topo], [T.vidro_lateral_frente[1], T.y_vidro_topo], [T.vidro_lateral_frente[0], T.y_cintura]],
    secaoVidro: (lado) => [[lado * T.meia_cintura, T.y_cintura], [lado * T.meia_vidro_topo, T.y_vidro_topo], [lado * (T.meia_vidro_topo - t), T.y_vidro_topo], [lado * (T.meia_cintura - t), T.y_cintura]],
    /* santantônio: a escora é um paralelogramo em (z, y) que desce da travessa até dentro do fundo da caçamba */
    escora: [[zbT, yp1], [T.barra_z_escora_fim, T.barra_y_escora_fim[1]], [T.barra_z_escora_fim, T.barra_y_escora_fim[0]], [zbT, yp0]],
    barra: { zbT, zbF, yp0, yp1 },
    /* faróis na face inclinada do nariz, de y_base a y_nariz; lanternas na face inclinada da tampa */
    ladoFarol: (() => {
      const zb = face(T.z_nariz, T.y_nariz, T.z_frente_ombro, T.y_frente_ombro, T.farol.y_base);
      return [[T.z_nariz, T.y_nariz], [zb, T.farol.y_base], [zb + T.farol.espessura, T.farol.y_base], [T.z_nariz + T.farol.espessura, T.y_nariz]];
    })(),
    ladoLanterna: (() => {
      const [ya, yb] = T.lanterna.y;
      const za = face(T.z_tras_ombro, T.y_tras_ombro, T.z_tras_topo, T.y_cintura, ya);
      const zb = face(T.z_tras_ombro, T.y_tras_ombro, T.z_tras_topo, T.y_cintura, yb);
      return [[za, ya], [zb, yb], [zb - T.lanterna.espessura, yb], [za - T.lanterna.espessura, ya]];
    })(),
  };
}

const RODAS = [
  { ponta: 'Frente', lado: -1, nome: 'Esq' }, { ponta: 'Frente', lado: 1, nome: 'Dir' },
  { ponta: 'Tras', lado: -1, nome: 'Esq' }, { ponta: 'Tras', lado: 1, nome: 'Dir' },
];

/* Os ids: um bloco de mil por parte da carroceria; as demais partes têm ids próprios. */
export function gerarPassos(T) {
  const D = derivar(T);
  const passos = [];
  const sel = (op, id) => ({ origem: { op, id } });
  const parte = (nome, s, usa) => { passos.push(['parte', { nome, sel: s }]); passos.push(['material', { sel: s, usa }]); };
  const L = T.meia_largura + 50;
  const C = T.comprimento / 2 + 50;

  /* Uma parte da carroceria: interseção do perfil lateral, da seção frontal e da caixa [y0, y1] por [z0, z1]. */
  const porVistas = (base, nome, material, { lado, secao, y0, y1, z0, z1 }) => {
    passos.push(['extrusao', { origemId: base + 1, eixo: 'x', altura: m(2 * L), em: [m(-L), 0, 0], perfil: perfilLateral(lado) }]);
    passos.push(['extrusao', { origemId: base + 2, eixo: 'z', altura: m(2 * C), em: [0, 0, m(-C)], perfil: secaoFrontal(secao) }]);
    passos.push(['cubo', { origemId: base + 3, larg: m(2 * L + 100), alt: m(y1 - y0), prof: m(z1 - z0), em: [0, m(y0), m((z0 + z1) / 2)] }]);
    passos.push(['intersectar', { origemId: base + 10, solidos: [sel('extrusao', base + 1), sel('extrusao', base + 2), sel('cubo', base + 3)] }]);
    parte(nome, sel('intersectar', base + 10), material);
  };
  /* Caixa de faces planas em milímetro; `em` é o centro da base. */
  const caixa = (id, nome, material, [x0, x1], [y0, y1], [z0, z1]) => {
    passos.push(['cubo', { origemId: id, larg: m(x1 - x0), alt: m(y1 - y0), prof: m(z1 - z0), em: [m((x0 + x1) / 2), m(y0), m((z0 + z1) / 2)] }]);
    parte(nome, sel('cubo', id), material);
  };
  /* Prisma de perfil (z, y), de x0 a x1. */
  const prisma = (id, nome, material, perfil, x0, x1) => {
    passos.push(['extrusao', { origemId: id, eixo: 'x', altura: m(x1 - x0), em: [m(x0), 0, 0], perfil: perfilLateral(perfil) }]);
    parte(nome, sel('extrusao', id), material);
  };

  const folga = 10;
  const zTras = T.z_tras_ombro - folga;
  const zFrente = T.z_frente_ombro + folga;
  const yBase = T.y_base - folga;

  porVistas(1000, 'carroceria', 'verde', { lado: D.ladoCorpo, secao: D.secaoCorpo, y0: yBase, y1: T.y_cintura, z0: T.z_cab_tras - folga, z1: zFrente });
  porVistas(2000, 'cacamba', 'verde', { lado: D.ladoCacamba, secao: D.secaoU, y0: yBase, y1: T.y_cintura, z0: T.z_tampa_dentro, z1: T.z_cab_tras + folga });
  porVistas(3000, 'tampaTraseira', 'verde', { lado: D.ladoCacamba, secao: D.secaoCorpo, y0: yBase, y1: T.y_cintura, z0: zTras, z1: T.z_tampa_dentro });

  /* caixas de roda: o arco fechado na base, entre as faces de dentro dos pneus */
  prisma(4000, 'caixaDeRodaFrente', 'escuro', D.arcoF, -T.x_roda_dentro, T.x_roda_dentro);
  prisma(4001, 'caixaDeRodaTras', 'escuro', D.arcoT, -T.x_roda_dentro, T.x_roda_dentro);

  /* cabine: miolo verde até o plano y_vidro_topo, teto por cima, para-brisa e vidros laterais na face */
  const zc0 = T.z_cab_tras - folga;
  porVistas(5000, 'cabine', 'verde', { lado: D.cabLadoMiolo, secao: D.secaoMiolo, y0: T.y_cintura, y1: T.y_vidro_topo, z0: zc0, z1: T.z_capo_fim });
  porVistas(6000, 'teto', 'verde', { lado: D.cabLadoFora, secao: D.secaoTeto, y0: T.y_vidro_topo, y1: T.y_teto, z0: zc0, z1: T.z_capo_fim });
  porVistas(7000, 'parabrisa', 'vidro', { lado: D.ladoParabrisa, secao: D.secaoParabrisa, y0: T.y_cintura, y1: T.y_vidro_topo, z0: zc0, z1: T.z_capo_fim + folga });
  porVistas(8000, 'janelaDir', 'vidro', { lado: D.ladoVidro, secao: D.secaoVidro(1), y0: T.y_cintura, y1: T.y_vidro_topo, z0: zc0, z1: T.z_capo_fim });
  porVistas(9000, 'janelaEsq', 'vidro', { lado: D.ladoVidro, secao: D.secaoVidro(-1), y0: T.y_cintura, y1: T.y_vidro_topo, z0: zc0, z1: T.z_capo_fim });

  /* santantônio: travessa, dois montantes e duas escoras inclinadas */
  const { zbT, zbF, yp0, yp1 } = D.barra;
  caixa(10000, 'barraTravessa', 'escuro', [-T.barra_meia_travessa, T.barra_meia_travessa], [yp0, yp1], [zbT, zbF]);
  caixa(10001, 'barraMontanteDir', 'escuro', [T.barra_x_dentro, T.barra_x_fora], [T.barra_y_pe, yp0], [zbT, zbF]);
  caixa(10002, 'barraMontanteEsq', 'escuro', [-T.barra_x_fora, -T.barra_x_dentro], [T.barra_y_pe, yp0], [zbT, zbF]);
  prisma(10003, 'barraEscoraDir', 'escuro', D.escora, T.barra_x_dentro, T.barra_x_fora);
  prisma(10004, 'barraEscoraEsq', 'escuro', D.escora, -T.barra_x_fora, -T.barra_x_dentro);

  /* para-choques e protetor */
  const pf = T.para_choque_frente;
  const pt = T.para_choque_tras;
  caixa(11000, 'paraChoqueFrente', 'escuro', [-pf.meia, pf.meia], T.y_para_choque, pf.z);
  caixa(11001, 'paraChoqueTras', 'escuro', [-pt.meia, pt.meia], T.y_para_choque, pt.z);
  caixa(11002, 'protetorDir', 'escuro', T.protetor.x, T.protetor.y, T.protetor.z);
  caixa(11003, 'protetorEsq', 'escuro', [-T.protetor.x[1], -T.protetor.x[0]], T.protetor.y, T.protetor.z);

  /* faróis e lanternas: placas sobre as faces inclinadas */
  prisma(12000, 'farolDir', 'branco', D.ladoFarol, T.farol.x[0], T.farol.x[1]);
  prisma(12001, 'farolEsq', 'branco', D.ladoFarol, -T.farol.x[1], -T.farol.x[0]);
  prisma(12002, 'lanternaDir', 'vermelho', D.ladoLanterna, T.lanterna.x[0], T.lanterna.x[1]);
  prisma(12003, 'lanternaEsq', 'vermelho', D.ladoLanterna, -T.lanterna.x[1], -T.lanterna.x[0]);

  /* rodas: pneu octogonal e aro cinza na face de fora, de eixo x */
  RODAS.forEach((r, k) => {
    const zc = r.ponta === 'Frente' ? T.z_roda_frente : T.z_roda_tras;
    const yc = T.raio_roda;
    const larguraPneu = T.x_roda_fora - T.x_roda_dentro - T.espessura_aro;
    const x0 = r.lado > 0 ? T.x_roda_dentro : -(T.x_roda_fora - T.espessura_aro);
    const xa = r.lado > 0 ? T.x_roda_fora - T.espessura_aro : -T.x_roda_fora;
    passos.push(['extrusao', { origemId: 13000 + k, eixo: 'x', altura: m(larguraPneu), em: [m(x0), 0, 0], perfil: perfilLateral(octogono(zc, yc, T.raio_roda, T.lados_roda)) }]);
    parte(`roda${r.ponta}${r.nome}`, sel('extrusao', 13000 + k), 'pneu');
    passos.push(['extrusao', { origemId: 13100 + k, eixo: 'x', altura: m(T.espessura_aro), em: [m(xa), 0, 0], perfil: perfilLateral(octogono(zc, yc, T.raio_aro, T.lados_roda)) }]);
    parte(`aro${r.ponta}${r.nome}`, sel('extrusao', 13100 + k), 'aro');
  });
  return passos;
}

/* Nenhuma parte é um cilindro inteiro: pneus e aros são extrusões de octógono e já saem fechados. */
export const ALIASES = [];

const contatoRodas = RODAS.flatMap((r) => [
  { par: [`roda${r.ponta}${r.nome}`, `caixaDeRoda${r.ponta}`], motivo: 'a face de dentro do pneu encosta na face da caixa de roda, em x 864, que fecha o arco entre os dois pneus' },
  { par: [`aro${r.ponta}${r.nome}`, `roda${r.ponta}${r.nome}`], motivo: 'o aro cinza assenta na face de fora do pneu, em x 1121, como a tampa da fonte' },
]);

export const CONTATOS = [
  { par: ['cacamba', 'carroceria'], motivo: 'a face da frente da caçamba encosta na face de trás do corpo, no plano z -494, que sai do mesmo corte' },
  { par: ['tampaTraseira', 'cacamba'], motivo: 'a tampa traseira encosta no fundo e nas paredes da caçamba, no plano z -2446' },
  { par: ['caixaDeRodaFrente', 'carroceria'], motivo: 'o arco dianteiro é o mesmo polígono recortado no perfil do corpo, e a caixa o fecha entre os pneus' },
  { par: ['caixaDeRodaTras', 'cacamba'], motivo: 'o arco traseiro é o mesmo polígono recortado no perfil da caçamba, e a caixa o fecha entre os pneus' },
  ...contatoRodas,
  { par: ['cabine', 'carroceria'], motivo: 'o miolo da cabine assenta no topo do corpo, no plano y 1370, que sai do mesmo corte' },
  { par: ['teto', 'cabine'], motivo: 'o teto assenta no miolo da cabine, no plano y 1893' },
  { par: ['parabrisa', 'cabine'], motivo: 'o para-brisa encosta na face inclinada da frente do miolo da cabine' },
  { par: ['parabrisa', 'carroceria'], motivo: 'a base do para-brisa assenta no topo do capô, em y 1370' },
  { par: ['parabrisa', 'teto'], motivo: 'a borda de cima do para-brisa encosta na face de baixo do teto, em y 1893' },
  { par: ['janelaDir', 'cabine'], motivo: 'o vidro lateral direito encosta na face inclinada do lado direito do miolo da cabine' },
  { par: ['janelaEsq', 'cabine'], motivo: 'o vidro lateral esquerdo encosta na face inclinada do lado esquerdo do miolo da cabine' },
  { par: ['janelaDir', 'carroceria'], motivo: 'a base do vidro lateral direito assenta no topo do corpo, em y 1370' },
  { par: ['janelaEsq', 'carroceria'], motivo: 'a base do vidro lateral esquerdo assenta no topo do corpo, em y 1370' },
  { par: ['janelaDir', 'teto'], motivo: 'a borda de cima do vidro lateral direito encosta na face de baixo do teto, em y 1893' },
  { par: ['janelaEsq', 'teto'], motivo: 'a borda de cima do vidro lateral esquerdo encosta na face de baixo do teto, em y 1893' },
  { par: ['barraTravessa', 'barraMontanteDir'], motivo: 'o montante direito sobe até a face de baixo da travessa, em y 1765' },
  { par: ['barraTravessa', 'barraMontanteEsq'], motivo: 'o montante esquerdo sobe até a face de baixo da travessa, em y 1765' },
  { par: ['barraTravessa', 'barraEscoraDir'], motivo: 'a escora direita parte da face de trás da travessa, em z -673' },
  { par: ['barraTravessa', 'barraEscoraEsq'], motivo: 'a escora esquerda parte da face de trás da travessa, em z -673' },
  { par: ['barraMontanteDir', 'cacamba'], motivo: 'o montante direito entra cerca de 46 mm no fundo da caçamba, como na fonte' },
  { par: ['barraMontanteEsq', 'cacamba'], motivo: 'o montante esquerdo entra cerca de 46 mm no fundo da caçamba, como na fonte' },
  { par: ['barraEscoraDir', 'cacamba'], motivo: 'a escora direita desce até dentro do fundo da caçamba, onde a fonte a esconde' },
  { par: ['barraEscoraEsq', 'cacamba'], motivo: 'a escora esquerda desce até dentro do fundo da caçamba, onde a fonte a esconde' },
  { par: ['barraEscoraDir', 'barraMontanteDir'], motivo: 'a escora direita e o montante direito dividem a aresta da face de trás da travessa, em z -673 e y 1765' },
  { par: ['barraEscoraEsq', 'barraMontanteEsq'], motivo: 'a escora esquerda e o montante esquerdo dividem a aresta da face de trás da travessa, em z -673 e y 1765' },
  { par: ['cabine', 'cacamba'], motivo: 'a traseira do miolo da cabine toca a borda da frente da caçamba, na aresta de z -494 e y 1370' },
  { par: ['paraChoqueTras', 'cacamba'], motivo: 'o para-choque traseiro entra no fundo da caçamba pela face de trás, como na fonte' },
  { par: ['protetorDir', 'carroceria'], motivo: 'a barra vertical direita do protetor entra no nariz do corpo, como na fonte' },
  { par: ['protetorEsq', 'carroceria'], motivo: 'a barra vertical esquerda do protetor entra no nariz do corpo, como na fonte' },
  { par: ['paraChoqueFrente', 'carroceria'], motivo: 'o para-choque dianteiro entra no corpo pela face da frente, abaixo do nariz, como na fonte' },
  { par: ['paraChoqueTras', 'tampaTraseira'], motivo: 'o para-choque traseiro entra na base da tampa traseira, pela face de trás, como na fonte' },
  { par: ['protetorDir', 'paraChoqueFrente'], motivo: 'a barra vertical direita do protetor nasce dentro do para-choque dianteiro, em y 398' },
  { par: ['protetorEsq', 'paraChoqueFrente'], motivo: 'a barra vertical esquerda do protetor nasce dentro do para-choque dianteiro, em y 398' },
  { par: ['farolDir', 'carroceria'], motivo: 'o farol direito é uma placa que assenta na face inclinada do nariz' },
  { par: ['farolEsq', 'carroceria'], motivo: 'o farol esquerdo é uma placa que assenta na face inclinada do nariz' },
  { par: ['lanternaDir', 'tampaTraseira'], motivo: 'a lanterna direita é uma placa que assenta na face inclinada de trás da tampa' },
  { par: ['lanternaEsq', 'tampaTraseira'], motivo: 'a lanterna esquerda é uma placa que assenta na face inclinada de trás da tampa' },
];

/* Os pontos declarados, em milímetro, são cantos que existem como vértice da peça. */
export function pontosDeclarados(T = TABELA) {
  return [
    { nome: 'canto da frente, em cima, do para-choque dianteiro', parte: 'paraChoqueFrente', medida: 'maximo', em: [T.para_choque_frente.meia, T.y_para_choque[1], T.para_choque_frente.z[1]], toleranciaMm: 0.5 },
    { nome: 'canto de baixo, atrás, do para-choque traseiro', parte: 'paraChoqueTras', medida: 'minimo', em: [-T.para_choque_tras.meia, T.y_para_choque[0], T.para_choque_tras.z[0]], toleranciaMm: 0.5 },
    { nome: 'topo do pneu dianteiro direito', parte: 'rodaFrenteDir', medida: 'maximo', em: [T.x_roda_fora - T.espessura_aro, 2 * T.raio_roda, T.z_roda_frente + T.raio_roda], toleranciaMm: 0.5 },
    { nome: 'canto de baixo, atrás, da travessa do santantônio', parte: 'barraTravessa', medida: 'minimo', em: [-T.barra_meia_travessa, T.barra_y_travessa[0], T.barra_z[0]], toleranciaMm: 0.5 },
  ];
}

const receita = {
  meta: { nome: 'picape-angular', desc: 'picape de cabine afunilada e caçamba aberta, com santantônio, para-choques de barra, faróis, lanternas e rodas octogonais' },
  PARAMS: TABELA,
  MATERIAIS: {
    verde: { tipo: 'liso', cor: '#25cc00' },
    vidro: { tipo: 'liso', cor: '#7cdbff' },
    escuro: { tipo: 'liso', cor: '#2e2e2e' },
    pneu: { tipo: 'liso', cor: '#050505' },
    aro: { tipo: 'metal', cor: '#acacac', acabamento: 'escovado' },
    branco: { tipo: 'liso', cor: '#f2f2ee' },
    vermelho: { tipo: 'liso', cor: '#cc0e03' },
  },
  TOPO: { origem: 'chão, no centro da picape em x e em z; y para cima e a frente da picape em +z' },
  PLANO: {
    objeto: 'picape de caçamba aberta de 2380 mm de largura, 1926 mm de altura e 5200 mm de comprimento, com cabine afunilada, santantônio, para-choques de barra, faróis, lanternas e quatro rodas octogonais',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total da picape', milimetros: 5200 },
    familia: 'veiculo',
    partes: [
      { nome: 'carroceria', forma: 'corpo da frente, de z -494 ao nariz em 2509, da saia (y 322) ao topo do capô em y 1370, com ombro de 2216 mm de largura e arco da roda dianteira', tecnica: 'interseção do perfil lateral, da seção frontal e de uma caixa, com o arco recortado no perfil' },
      { nome: 'cacamba', forma: 'fundo (y 988) e duas paredes laterais de 124 mm de espessura, de z -2446 a -494, abertas por cima, com o arco da roda traseira', tecnica: 'interseção do perfil lateral, de uma seção frontal em U e de uma caixa' },
      { nome: 'tampaTraseira', forma: 'parede de trás da caçamba, de z -2577 a -2446, da saia a y 1370, com a face de trás inclinada', tecnica: 'interseção do perfil lateral da caçamba, da seção frontal cheia e de uma caixa' },
      { nome: 'caixaDeRodaFrente', forma: 'arco da roda dianteira fechado na base, entre as faces de dentro dos pneus', tecnica: 'extrusão em x do polígono do arco' },
      { nome: 'caixaDeRodaTras', forma: 'arco da roda traseira fechado na base, entre as faces de dentro dos pneus', tecnica: 'extrusão em x do polígono do arco' },
      { nome: 'cabine', forma: 'miolo verde da cabine, de y 1370 a 1893, que afunila de 2066 mm de largura embaixo para 1850 mm em cima, traseira quase vertical e frente inclinada', tecnica: 'interseção do perfil lateral da cabine, da seção frontal afunilada e de uma caixa' },
      { nome: 'teto', forma: 'teto plano da cabine, de y 1893 a 1925, com 1782 mm de largura em cima e chanfro na frente', tecnica: 'interseção do perfil lateral da cabine, da seção do teto e de uma caixa' },
      { nome: 'parabrisa', forma: 'placa de vidro de 10 mm na face inclinada da frente da cabine, de 2006 mm de largura embaixo e 1790 mm em cima', tecnica: 'interseção de um paralelogramo lateral, de uma seção trapezoidal e de uma caixa' },
      { nome: 'janelaDir', forma: 'vidro lateral de 10 mm na face inclinada direita da cabine, de z -388 a 1107 embaixo', tecnica: 'interseção do quadrilátero lateral, de uma seção inclinada de 10 mm e de uma caixa' },
      { nome: 'janelaEsq', forma: 'vidro lateral de 10 mm na face inclinada esquerda da cabine, espelhado de janelaDir', tecnica: 'interseção do quadrilátero lateral, de uma seção inclinada de 10 mm e de uma caixa' },
      { nome: 'barraTravessa', forma: 'travessa de 1778 por 157 mm e 166 mm de profundidade, atrás do teto, em z -673 a -507', tecnica: 'caixa' },
      { nome: 'barraMontanteDir', forma: 'montante vertical de 188 por 166 mm, de y 942 até a travessa, à direita', tecnica: 'caixa' },
      { nome: 'barraMontanteEsq', forma: 'montante vertical de 188 por 166 mm, de y 942 até a travessa, à esquerda', tecnica: 'caixa' },
      { nome: 'barraEscoraDir', forma: 'escora de 188 mm de largura, inclinada, da travessa até o fundo da caçamba em z -2035, à direita', tecnica: 'extrusão em x de um paralelogramo' },
      { nome: 'barraEscoraEsq', forma: 'escora de 188 mm de largura, inclinada, da travessa até o fundo da caçamba em z -2035, à esquerda', tecnica: 'extrusão em x de um paralelogramo' },
      { nome: 'paraChoqueFrente', forma: 'para-choque de barra de 2238 mm de largura, de y 266 a 595 e de z 2286 a 2598', tecnica: 'caixa' },
      { nome: 'paraChoqueTras', forma: 'para-choque de barra de 2378 mm de largura, de y 266 a 595 e de z -2598 a -2286', tecnica: 'caixa' },
      { nome: 'protetorDir', forma: 'barra vertical de 188 mm de largura, de y 398 a 1221, na frente, à direita', tecnica: 'caixa' },
      { nome: 'protetorEsq', forma: 'barra vertical de 188 mm de largura, de y 398 a 1221, na frente, à esquerda', tecnica: 'caixa' },
      { nome: 'farolDir', forma: 'farol branco, placa de 6 mm na face inclinada do nariz, à direita', tecnica: 'extrusão em x de um paralelogramo' },
      { nome: 'farolEsq', forma: 'farol branco, placa de 6 mm na face inclinada do nariz, à esquerda', tecnica: 'extrusão em x de um paralelogramo' },
      { nome: 'lanternaDir', forma: 'lanterna vermelha, placa de 15 mm na face inclinada da tampa traseira, à direita', tecnica: 'extrusão em x de um paralelogramo' },
      { nome: 'lanternaEsq', forma: 'lanterna vermelha, placa de 15 mm na face inclinada da tampa traseira, à esquerda', tecnica: 'extrusão em x de um paralelogramo' },
      { nome: 'rodaFrenteEsq', forma: 'pneu octogonal de 441 mm de raio, com vértice em cima, e 257 mm de largura', tecnica: 'extrusão em x de um octógono' },
      { nome: 'rodaFrenteDir', forma: 'pneu octogonal de 441 mm de raio, com vértice em cima, e 257 mm de largura', tecnica: 'extrusão em x de um octógono' },
      { nome: 'rodaTrasEsq', forma: 'pneu octogonal de 441 mm de raio, com vértice em cima, e 257 mm de largura, no eixo traseiro', tecnica: 'extrusão em x de um octógono' },
      { nome: 'rodaTrasDir', forma: 'pneu octogonal de 441 mm de raio, com vértice em cima, e 257 mm de largura, no eixo traseiro', tecnica: 'extrusão em x de um octógono' },
      { nome: 'aroFrenteEsq', forma: 'aro cinza octogonal de 312 mm de raio e 10 mm de espessura na face de fora do pneu', tecnica: 'extrusão em x de um octógono' },
      { nome: 'aroFrenteDir', forma: 'aro cinza octogonal de 312 mm de raio e 10 mm de espessura na face de fora do pneu', tecnica: 'extrusão em x de um octógono' },
      { nome: 'aroTrasEsq', forma: 'aro cinza octogonal de 312 mm de raio e 10 mm de espessura na face de fora do pneu', tecnica: 'extrusão em x de um octógono' },
      { nome: 'aroTrasDir', forma: 'aro cinza octogonal de 312 mm de raio e 10 mm de espessura na face de fora do pneu', tecnica: 'extrusão em x de um octógono' },
    ],
    criteriosDeReprovacao: [
      'a picape não mede 2380 por 1926 por 5200 mm, ou algum canto de peça sai do quadro declarado',
      'a cabine tem a mesma largura embaixo e no teto, ou passa de 1782 mm de largura no teto',
      'a caçamba é um bloco fechado, ou as paredes laterais e a tampa não saem do mesmo prisma do corpo',
      'a caçamba não tem fundo abaixo da borda, ou não está atrás da cabine',
      'as rodas ficam escondidas, sem arco recortado e sem caixa de roda, ou não tocam o chão em y 0',
      'o santantônio não passa atrás do teto, ou as escoras não descem para dentro da caçamba',
      'um lado difere do outro em peça simétrica',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  ALIASES,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;

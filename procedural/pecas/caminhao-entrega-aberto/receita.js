/* caminhao-entrega-aberto — caminhão de entrega de brinquedo de plataforma aberta: cabine curta e afunilada, capô e lados baixos
 * laranja, cabine e teto laranja sobre moldura escura, vidros claros, e atrás da cabine uma plataforma plana e baixa de cor
 * azul acinzentada, com as abas escuras em volta das quatro rodas, para-choques e pinos nas duas pontas, faróis amarelos na
 * quina da frente e lanternas vermelhas nos cantos de trás.
 *
 * Origem: recriada em primitivas do núcleo a partir do modelo "delivery-flat" do pacote A, de autor A (pacote A, endereço omitido,
 * endereço da página: endereço omitido), licença livre sem exigência de crédito (declarada no License.txt do pacote). A
 * malha de origem NÃO está no repositório: ela fica em importados/veiculos-livres/pacote-a/delivery-flat.glb, que o git ignora. O que
 * entra aqui são as medidas tiradas dela (referencias/fonte-partes.json, em metro, com a escala 1,765, e as faces da própria malha
 * lidas em milímetro, por cor da textura) e as vistas (referencias/fonte-vistas.png). O que não ficou igual à referência está em
 * referencias/alvo.md.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente do caminhão em +z, x para a direita de quem olha de frente,
 * centrado em x e z. A TABELA é em milímetro e é a única fonte das medidas; `derivar` calcula perfis, seções e polígonos, e
 * `gerarPassos` escreve, por parte, a forma e a `parte` com o `material`, com a conversão para metro num lugar só (`m`).
 *
 * Como a forma nasce: o corpo laranja, a cabine, o teto e as abas de trás são INTERSEÇÃO de prismas (perfil lateral (z, y)
 * extrudado em x, seção frontal (x, y) extrudada em z), e a cabine afunila de 971 mm de meia largura na base para 794 mm no teto
 * sem nenhum vértice calculado em 3D. Os arcos das rodas são recortados no próprio perfil lateral (nunca por booleana). A
 * plataforma é uma placa baixa em três pedaços entre os arcos, e cada arco é fechado por uma caixa de roda entre as faces de
 * dentro dos dois pneus. Os pneus são de revolução com chanfro nas duas bordas.
 *
 * Na extrusão do núcleo, com eixo x o ponto [u, v] vai para y = -u e z = v; com eixo z vai para x = u e y = -v; com eixo y vai
 * para x = u e z = v. Simplificações em relação à fonte estão em referencias/alvo.md.
 */

export const TABELA = {
  comprimento: 5736,
  meia_largura: 1324,

  // corpo laranja da frente: meia largura, base (que é também o topo da plataforma) e topo do capô e das laterais da cabine
  meia_corpo: 971,
  y_corpo_base: 883,
  y_borda: 1412,
  z_cab_tras: 833,

  // nariz: a grade escura fecha a frente em z 2692; o capô sobe dela (y 1236) até o pé do para-brisa (z 2162, y 1412)
  z_nariz: 2692,
  y_nariz_topo: 1236,
  grade_espessura: 12,
  z_capo_fim: 2162,

  // cabine: teto plano de 12 mm, face de trás quase vertical, para-brisa inclinado; a seção afunila de 971 mm para 794 mm
  y_teto: 2295,
  z_teto_frente: 1809,
  z_cab_tras_topo: 921,
  y_cab_tras_vert: 2206,
  meia_teto: 794,
  teto_espessura: 12,

  // vidros: placas de 12 mm por fora das faces da cabine
  vidro_espessura: 12,
  y_vidro_topo: 2131,
  pb_meia_base: 791,
  pb_meia_topo: 648,
  y_vidro_lat_topo: 2122,
  vidro_lat_frente_base: 1973,
  vidro_lat_frente_topo: 1689,
  vidro_lat_tras: 1009,
  vt_y: [1589, 2118],
  vt_meia: [755, 650],

  // giroflex laranja sobre o teto: tronco de pirâmide
  giro_meia_base: 353,
  giro_meia_topo: 318,
  giro_z_base: [1189, 1542],
  giro_z_topo: [1224, 1506],
  y_giro_topo: 2383,

  // espelhos em caixa, na base do para-brisa, na altura da borda
  espelho_x1: 1324,
  espelho_y0: 1236,
  espelho_z: [1986, 2162],

  // faróis: placa amarela na face da grade e na lateral do nariz (até z 2515)
  farol_x: [485, 977],
  y_farol0: 1059,
  farol_espessura: 6,
  farol_z_lateral: 2515,

  // nariz de baixo: cunha escura entre o para-choque e a grade
  nariz_baixo_z_fim: 2633,

  // chassi, plataforma e para-choques
  chassi_meia: 1147,
  chassi_y0: 353,
  z_traseira: -2780,
  z_chassi_frente: 2492,
  y_para_choque_topo: 706,
  para_choque_canto: [[971, 2780], [1096, 2728], [1147, 2603]],
  pc_tras_z_dentro: -2603,
  pc_tras_raio: 177,
  pc_tras_lados: 6,

  // pinos de seção octogonal que saem dos para-choques, com a placa clara na ponta
  pino_meia: 309,
  pino_chanfro: 88,
  pino_frente_y: [265, 574],
  pino_tras_y: [442, 750],
  pino_z_ponta: 2868,
  placa_espessura: 12,

  // lanternas: placas vermelhas na face de trás da plataforma, nos cantos
  lanterna_x_dentro: 882,
  lanterna_y0: 706,
  lanterna_espessura: 8,

  // rodas: pneu de 1060 mm de diâmetro e 529 mm de largura; a de trás é 133 mm mais para fora; o aro sai 15 mm
  roda_raio: 530,
  roda_z_frente: 1827,
  roda_z_tras: -1032,
  roda_x_dentro_frente: 530,
  roda_x_fora_frente: 1059,
  roda_x_dentro_tras: 662,
  roda_x_fora_tras: 1191,
  roda_lados: 24,
  roda_chanfro: 40,
  aro_raio: 270,
  aro_espessura: 15,

  // arcos: polígono de 24 lados com vértice em cima, de raio 540 (o pneu passa a 10 mm); a aba escura sobe até o raio 688
  arco_lados: 24,
  arco_raio: 540,
  aba_raio_fora: 688,
  aba_x_dentro_frente: 971,
  aba_x_dentro_tras: 618,
  aba_x_fora: 1147,
  aba_tras_chanfro: [1129, 706],
};

const m = (mm) => mm / 1000;
const area = (l) => l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0) / 2;
const antihorario = (l) => (area(l) < 0 ? [...l].reverse() : l);
/* Mapeamento do núcleo, medido: eixo x leva [u, v] a (y = -u, z = v); eixo z, a (x = u, y = -v); eixo y, a (x = u, z = v). Entram milímetro; saem metro. */
const perfilLateral = (zy) => antihorario(zy.map(([z, y]) => [-y, z])).map(([u, v]) => [m(u), m(v)]);
const secaoFrontal = (xy) => antihorario(xy.map(([x, y]) => [x, -y])).map(([u, v]) => [m(u), m(v)]);
const planta = (xz) => antihorario(xz).map(([u, v]) => [m(u), m(v)]);
const espelhar = (meia) => [...meia, ...[...meia].reverse().map(([x, y]) => [-x, y])];
const arredonda = (v) => Math.round(v * 1000) / 1000;

/* Cadeia de vértices do arco de uma roda: o semicírculo de cima de um polígono regular de `lados` lados, com um vértice em cima,
 * de trás para a frente (z crescente), do vértice na altura do eixo atrás ao vértice na altura do eixo na frente. */
function cadeiaDoArco(zc, yc, R, lados) {
  const passo = (2 * Math.PI) / lados;
  return Array.from({ length: lados / 2 + 1 }, (_, j) => {
    const a = Math.PI - passo * j;
    return [arredonda(zc + R * Math.cos(a)), arredonda(yc + R * Math.sin(a))];
  });
}

const corta = (a, b, y) => [arredonda(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1])), y];

/* Parte da cadeia acima da linha y: os dois pontos de corte e os vértices entre eles. */
function cadeiaAcima(cad, y) {
  const n = cad.length;
  let i = 0; while (cad[i + 1][1] <= y) i += 1;
  let k = n - 1; while (cad[k - 1][1] <= y) k -= 1;
  return [corta(cad[i], cad[i + 1], y), ...cad.slice(i + 1, k), corta(cad[k - 1], cad[k], y)];
}

/* Parte da cadeia abaixo da linha y: do lado de trás (do começo da cadeia até o corte) e do lado da frente (do corte ao fim). */
function cadeiaAbaixo(cad, y) {
  const n = cad.length;
  let i = 0; while (cad[i + 1][1] <= y) i += 1;
  let k = n - 1; while (cad[k - 1][1] <= y) k -= 1;
  return { esq: [...cad.slice(0, i + 1), corta(cad[i], cad[i + 1], y)], dir: [corta(cad[k - 1], cad[k], y), ...cad.slice(k)] };
}

/* Linhas da cabine: meia largura em função de y (afunila de meia_corpo em y_borda a meia_teto em y_teto) e z da face do para-brisa. */
const meiaCabine = (T, y) => T.meia_corpo - ((T.meia_corpo - T.meia_teto) * (y - T.y_borda)) / (T.y_teto - T.y_borda);
const zParabrisa = (T, y) => T.z_capo_fim - ((T.z_capo_fim - T.z_teto_frente) * (y - T.y_borda)) / (T.y_teto - T.y_borda);

/* Perfis, seções e plantas em milímetro, calculados da TABELA. */
export function derivar(T) {
  const yc = T.roda_raio;
  const yB = T.y_corpo_base;
  const yHood = (z) => T.y_nariz_topo + ((T.z_nariz - z) * (T.y_borda - T.y_nariz_topo)) / (T.z_nariz - T.z_capo_fim);
  const zFrenteCorpo = T.z_nariz - T.grade_espessura;
  const arcoF = cadeiaDoArco(T.roda_z_frente, yc, T.arco_raio, T.arco_lados);
  const arcoT = cadeiaDoArco(T.roda_z_tras, yc, T.arco_raio, T.arco_lados);
  const abaForaF = cadeiaDoArco(T.roda_z_frente, yc, T.aba_raio_fora, T.arco_lados);
  const abaForaT = cadeiaDoArco(T.roda_z_tras, yc, T.aba_raio_fora, T.arco_lados);
  const R = T.arco_raio;
  const e = T.vidro_espessura;
  const yTopoAba = yc + T.aba_raio_fora;

  /* linha da cabine: x em função de y (afunila de meia_corpo em y_borda a meia_teto em y_teto) e z das faces da frente e de trás */
  const xCab = (y) => meiaCabine(T, y);
  const zPb = (y) => zParabrisa(T, y);
  const zTras = (y) => T.z_cab_tras + ((T.z_cab_tras_topo - T.z_cab_tras) * (y - T.y_cab_tras_vert)) / (T.y_teto - T.y_cab_tras_vert);
  const xVidro = (y) => T.pb_meia_base - ((T.pb_meia_base - T.pb_meia_topo) * (y - T.y_borda)) / (T.y_vidro_topo - T.y_borda);
  /* normal da face do para-brisa, para fora (frente e cima) */
  const dz = T.z_teto_frente - T.z_capo_fim; const dy = T.y_teto - T.y_borda; const norma = Math.hypot(dz, dy);
  const nz = dy / norma; const ny = -dz / norma;
  const pbA = [zPb(T.y_borda), T.y_borda]; const pbB = [zPb(T.y_vidro_topo), T.y_vidro_topo];
  const cosCab = (T.y_teto - T.y_borda) / Math.hypot(T.meia_corpo - T.meia_teto, T.y_teto - T.y_borda);
  const yPlaca = T.y_teto - T.teto_espessura;

  /* plataforma: três pedaços de y 530 a 883, com a traseira, a frente e os arcos recortados */
  const cT = cadeiaAbaixo(arcoT, yB); const cF = cadeiaAbaixo(arcoF, yB);
  const platTras = [[T.z_traseira, yB], [T.z_traseira, T.y_para_choque_topo], [T.pc_tras_z_dentro, T.y_para_choque_topo],
    [T.pc_tras_z_dentro, yc], ...cT.esq];
  const platMeio = [...cT.dir, ...cF.esq];
  const platFrente = [...cF.dir, [T.z_chassi_frente, yc], [T.z_chassi_frente, yB]];

  /* para-choque da frente (chanfro em dois lados) e de trás (canto em quarto de círculo) */
  const canto = T.para_choque_canto;
  const pcFrente = [[-canto[2][0], T.z_chassi_frente], [canto[2][0], T.z_chassi_frente], [canto[2][0], canto[2][1]], [canto[1][0], canto[1][1]],
    [canto[0][0], canto[0][1]], [-canto[0][0], canto[0][1]], [-canto[1][0], canto[1][1]], [-canto[2][0], canto[2][1]]];
  const rc = T.pc_tras_raio; const cx = T.chassi_meia - rc; const cz = T.z_traseira + rc;
  const arcoCanto = Array.from({ length: T.pc_tras_lados + 1 }, (_, j) => {
    const a = (Math.PI / 2) * (j / T.pc_tras_lados);
    return [arredonda(cx + rc * Math.sin(a)), arredonda(cz - rc * Math.cos(a))];
  });
  const pcTras = [...[...arcoCanto].reverse(), ...arcoCanto.map(([x, z]) => [-x, z])];

  /* pino octogonal de uma ponta: a seção frontal dele, e a mesma na placa */
  const pn = T.pino_meia; const pc = T.pino_chanfro;
  const octogono = ([y0, y1]) => [[-pn + pc, y0], [pn - pc, y0], [pn, y0 + pc], [pn, y1 - pc], [pn - pc, y1], [-pn + pc, y1], [-pn, y1 - pc], [-pn, y0 + pc]];

  /* aba de cima do arco: faixa entre os raios 540 e 688, acima da plataforma */
  const abaAcima = (zc, fora) => {
    const dentro = cadeiaDoArco(zc, yc, R, T.arco_lados);
    return [...cadeiaAcima(fora, yB), ...[...cadeiaAcima(dentro, yB)].reverse()];
  };
  /* seção da aba de trás: a quina de dentro é chanfrada (de [618, 1129] a [706, 1218]) e o chanfro segue até y 1300 */
  const [chY, chX] = T.aba_tras_chanfro;
  const inclina = (yTopoAba - chY) / (chX - T.aba_x_dentro_tras);
  const yAlto = 1300;
  const secaoAbaTras = (s) => [[s * T.aba_x_dentro_tras, yB - 100], [s * T.aba_x_dentro_tras, chY],
    [s * (T.aba_x_dentro_tras + (yAlto - chY) / inclina), yAlto], [s * T.aba_x_fora, yAlto], [s * T.aba_x_fora, yB - 100]];

  /* caixas de roda: a da frente fecha o arco inteiro; a de trás fecha só até o topo da plataforma */
  const caixaF = [[T.roda_z_frente - R, T.chassi_y0], ...arcoF, [T.roda_z_frente + R, T.chassi_y0]];
  const caixaT = [[T.roda_z_tras - R, T.chassi_y0], ...cT.esq, ...cT.dir, [T.roda_z_tras + R, T.chassi_y0]];

  /* giroflex: seção frontal que afunila de 353 mm em y 2295 a 318 mm em y 2383, estendida além das duas pontas */
  const xGiro = (y) => T.giro_meia_base - ((T.giro_meia_base - T.giro_meia_topo) * (y - T.y_teto)) / (T.y_giro_topo - T.y_teto);

  return {
    yHood, zFrenteCorpo, yPlaca, arcoF, arcoT,
    /* corpo laranja da frente: capô, laterais baixas da cabine e a parede de trás, com o arco da frente recortado na base */
    ladoCorpo: [[T.z_cab_tras, yB], ...cadeiaAcima(arcoF, yB), [zFrenteCorpo, yB], [zFrenteCorpo, yHood(zFrenteCorpo)],
      [T.z_capo_fim, T.y_borda], [T.z_cab_tras, T.y_borda]],
    secaoCorpo: espelhar([[T.meia_corpo, yB - 100], [T.meia_corpo, T.y_borda + 100]]),
    /* cabine escura, até a face de baixo da placa do teto */
    ladoCabine: [[T.z_cab_tras, T.y_borda], [T.z_capo_fim, T.y_borda], [zPb(yPlaca), yPlaca], [zTras(yPlaca), yPlaca], [T.z_cab_tras, T.y_cab_tras_vert]],
    secaoCabine: espelhar([[xCab(T.y_borda - 100), T.y_borda - 100], [xCab(T.y_teto + 100), T.y_teto + 100]]),
    ladoTeto: [[zPb(yPlaca), yPlaca], [T.z_teto_frente, T.y_teto], [T.z_cab_tras_topo, T.y_teto], [zTras(yPlaca), yPlaca]],
    ladoGiro: [[T.giro_z_base[0], T.y_teto], [T.giro_z_base[1], T.y_teto], [T.giro_z_topo[1], T.y_giro_topo], [T.giro_z_topo[0], T.y_giro_topo]],
    secaoGiro: espelhar([[xGiro(T.y_teto - 100), T.y_teto - 100], [xGiro(T.y_giro_topo + 100), T.y_giro_topo + 100]]),
    ladoParabrisa: [pbA, pbB, [pbB[0] + e * nz, pbB[1] + e * ny], [pbA[0] + e * nz, pbA[1] + e * ny]],
    secaoParabrisa: espelhar([[xVidro(T.y_borda - 100), T.y_borda - 100], [xVidro(T.y_vidro_topo + 100), T.y_vidro_topo + 100]]),
    ladoVidro: [[T.vidro_lat_frente_base, T.y_borda], [T.vidro_lat_frente_topo, T.y_vidro_lat_topo], [T.vidro_lat_tras, T.y_vidro_lat_topo], [T.vidro_lat_tras, T.y_borda]],
    secaoVidro: (s) => [[s * xCab(T.y_borda - 100), T.y_borda - 100], [s * xCab(T.y_vidro_lat_topo + 100), T.y_vidro_lat_topo + 100],
      [s * (xCab(T.y_vidro_lat_topo + 100) + e / cosCab), T.y_vidro_lat_topo + 100], [s * (xCab(T.y_borda - 100) + e / cosCab), T.y_borda - 100]],
    vidroTraseiro: [[-T.vt_meia[0], T.vt_y[0]], [T.vt_meia[0], T.vt_y[0]], [T.vt_meia[1], T.vt_y[1]], [-T.vt_meia[1], T.vt_y[1]]],
    /* plataforma e chassi */
    platTras, platMeio, platFrente,
    pcFrente, pcTras,
    pinoFrente: octogono(T.pino_frente_y), pinoTras: octogono(T.pino_tras_y),
    abaFrente: abaAcima(T.roda_z_frente, abaForaF), abaTras: abaAcima(T.roda_z_tras, abaForaT), secaoAbaTras,
    caixaF, caixaT,
    zInicioMeio: T.roda_z_tras + R, zFimMeio: T.roda_z_frente - R, zInicioFrente: T.roda_z_frente + R,
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

  /* Uma parte feita da interseção de prismas: lateral (z, y) e frontal (x, y). */
  const porVistas = (base, nome, material, { lado, secao }) => {
    passos.push(['extrusao', { origemId: base + 1, eixo: 'x', altura: m(2 * L), em: [m(-L), 0, 0], perfil: perfilLateral(lado) }]);
    passos.push(['extrusao', { origemId: base + 2, eixo: 'z', altura: m(2 * C), em: [0, 0, m(-C)], perfil: secaoFrontal(secao) }]);
    passos.push(['intersectar', { origemId: base + 10, solidos: [sel('extrusao', base + 1), sel('extrusao', base + 2)] }]);
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
  const mi = T.meia_corpo;
  const yB = T.y_corpo_base;
  const yc = T.roda_raio;

  /* corpo laranja, cabine, teto e giroflex */
  porVistas(1000, 'carroceria', 'laranja', { lado: D.ladoCorpo, secao: D.secaoCorpo });
  porVistas(2000, 'cabine', 'cabine', { lado: D.ladoCabine, secao: D.secaoCabine });
  porVistas(3000, 'teto', 'laranjaTeto', { lado: D.ladoTeto, secao: D.secaoCabine });
  porVistas(4000, 'giroflex', 'laranjaTeto', { lado: D.ladoGiro, secao: D.secaoGiro });

  /* vidros */
  porVistas(5000, 'parabrisa', 'vidro', { lado: D.ladoParabrisa, secao: D.secaoParabrisa });
  porVistas(6000, 'vidroLateralDir', 'vidro', { lado: D.ladoVidro, secao: D.secaoVidro(1) });
  porVistas(7000, 'vidroLateralEsq', 'vidro', { lado: D.ladoVidro, secao: D.secaoVidro(-1) });
  prismaZ(8000, 'vidroTraseiro', 'vidro', D.vidroTraseiro, T.z_cab_tras - T.vidro_espessura, T.z_cab_tras);

  /* espelhos */
  caixa(9000, 'espelhoDir', 'laranja', [mi, T.espelho_x1], [T.espelho_y0, T.y_borda], T.espelho_z);
  caixa(9001, 'espelhoEsq', 'laranja', [-T.espelho_x1, -mi], [T.espelho_y0, T.y_borda], T.espelho_z);

  /* frente: grade escura, faróis amarelos, nariz de baixo */
  const zf = D.zFrenteCorpo;
  prisma(10000, 'grade', 'cinzaEscuro', [[zf, yB], [T.z_nariz, yB], [T.z_nariz, T.y_nariz_topo], [zf, D.yHood(zf)]], -mi, mi);
  const zF1 = T.z_nariz + T.farol_espessura;
  caixa(10001, 'farolDir', 'amarelo', T.farol_x, [T.y_farol0, T.y_nariz_topo], [T.z_nariz, zF1]);
  caixa(10002, 'farolEsq', 'amarelo', [-T.farol_x[1], -T.farol_x[0]], [T.y_farol0, T.y_nariz_topo], [T.z_nariz, zF1]);
  const lateralFarol = [[T.farol_z_lateral, T.y_farol0], [T.z_nariz, T.y_farol0], [T.z_nariz, T.y_nariz_topo], [T.farol_z_lateral, D.yHood(T.farol_z_lateral)]];
  prisma(10003, 'farolLateralDir', 'amarelo', lateralFarol, mi, T.farol_x[1]);
  prisma(10004, 'farolLateralEsq', 'amarelo', lateralFarol, -T.farol_x[1], -mi);
  prisma(10005, 'narizBaixo', 'saia', [[T.z_chassi_frente, T.y_para_choque_topo], [T.nariz_baixo_z_fim, T.y_para_choque_topo], [T.z_nariz, yB], [T.z_chassi_frente, yB]], -mi, mi);

  /* plataforma: três pedaços entre os arcos, e o chassi de baixo */
  prisma(11000, 'plataformaTras', 'plataforma', D.platTras, -T.chassi_meia, T.chassi_meia);
  prisma(11001, 'plataformaMeio', 'plataforma', D.platMeio, -T.chassi_meia, T.chassi_meia);
  prisma(11002, 'plataformaFrente', 'plataforma', D.platFrente, -T.chassi_meia, T.chassi_meia);
  const yCh = [T.chassi_y0, yc];
  caixa(11003, 'chassiMeio', 'saia', [-T.chassi_meia, T.chassi_meia], yCh, [D.zInicioMeio, D.zFimMeio]);
  caixa(11004, 'chassiFrente', 'saia', [-T.chassi_meia, T.chassi_meia], yCh, [D.zInicioFrente, T.z_chassi_frente]);

  /* para-choques, pinos e placas das pontas */
  prismaY(12000, 'paraChoqueFrente', 'cinzaEscuro', D.pcFrente, T.chassi_y0, T.y_para_choque_topo);
  prismaY(12001, 'paraChoqueTras', 'cinzaEscuro', D.pcTras, yc, T.y_para_choque_topo);
  const zPlF = T.pino_z_ponta - T.placa_espessura;
  prismaZ(12002, 'pinoFrente', 'cinzaEscuro', D.pinoFrente, T.para_choque_canto[0][1], zPlF);
  prismaZ(12003, 'placaFrente', 'claro', D.pinoFrente, zPlF, T.pino_z_ponta);
  prismaZ(12004, 'pinoTras', 'cinzaEscuro', D.pinoTras, -zPlF, T.z_traseira);
  prismaZ(12005, 'placaTras', 'claro', D.pinoTras, -T.pino_z_ponta, -zPlF);

  /* lanternas nos cantos de trás da plataforma */
  const zL = T.z_traseira - T.lanterna_espessura;
  caixa(13000, 'lanternaDir', 'lanterna', [T.lanterna_x_dentro, T.chassi_meia], [T.lanterna_y0, yB], [zL, T.z_traseira]);
  caixa(13001, 'lanternaEsq', 'lanterna', [-T.chassi_meia, -T.lanterna_x_dentro], [T.lanterna_y0, yB], [zL, T.z_traseira]);

  /* abas dos arcos e caixas de roda */
  prisma(14000, 'abaFrenteDir', 'cinzaEscuro', D.abaFrente, T.aba_x_dentro_frente, T.aba_x_fora);
  prisma(14001, 'abaFrenteEsq', 'cinzaEscuro', D.abaFrente, -T.aba_x_fora, -T.aba_x_dentro_frente);
  porVistas(15000, 'abaTrasDir', 'cinzaEscuro', { lado: D.abaTras, secao: D.secaoAbaTras(1) });
  porVistas(16000, 'abaTrasEsq', 'cinzaEscuro', { lado: D.abaTras, secao: D.secaoAbaTras(-1) });
  prisma(17000, 'caixaRodaFrente', 'saia', D.caixaF, -T.roda_x_dentro_frente, T.roda_x_dentro_frente);
  prisma(17001, 'caixaRodaTras', 'plataforma', D.caixaT, -T.roda_x_dentro_tras, T.roda_x_dentro_tras);

  /* rodas: pneu de revolução com chanfro nas duas bordas e aro cinza na face de fora */
  const ch = T.roda_chanfro; const R = T.roda_raio;
  RODAS.forEach((r, k) => {
    const frente = r.ponta === 'Frente';
    const zc = frente ? T.roda_z_frente : T.roda_z_tras;
    const xd = frente ? T.roda_x_dentro_frente : T.roda_x_dentro_tras;
    const xf = frente ? T.roda_x_fora_frente : T.roda_x_fora_tras;
    const largura = xf - xd;
    const x0 = r.s > 0 ? xd : -xf;
    passos.push(['lathe', { origemId: 18000 + k, eixo: 'x', lados: T.roda_lados, em: [m(x0), m(R), m(zc)],
      perfil: [[0, 0], [m(R - ch), 0], [m(R), m(ch)], [m(R), m(largura - ch)], [m(R - ch), m(largura)], [0, m(largura)]] }]);
    parte(`roda${r.ponta}${r.nome}`, sel('lathe', 18000 + k), 'pneu');
    const xa = r.s > 0 ? xf : -(xf + T.aro_espessura);
    passos.push(['cilindro', { origemId: 18100 + k, raio: m(T.aro_raio), altura: m(T.aro_espessura), lados: T.roda_lados, eixo: 'x', em: [m(xa), m(R), m(zc)] }]);
    parte(`aro${r.ponta}${r.nome}`, { alias: `aroInteiro${k}` }, 'aro');
  });
  return passos;
}

/* O aro é um cilindro inteiro (lateral e as duas tampas). */
const cilindroInteiro = (id) => ({
  unir: [{ origem: { op: 'cilindro', id } }, { origem: { op: 'cilindro', id, tampa: 'fundo' } }, { origem: { op: 'cilindro', id, tampa: 'topo' } }],
});
export const ALIASES = RODAS.map((_, k) => [`aroInteiro${k}`, cilindroInteiro(18100 + k)]);

const lados = ['Dir', 'Esq'];
const pontas = ['Frente', 'Tras'];

export const CONTATOS = [
  /* corpo laranja e cabine */
  { par: ['cabine', 'carroceria'], motivo: 'a face de baixo da cabine, em y 1412, assenta no tampo do corpo, de z 833 a 2162, com os mesmos vértices' },
  { par: ['teto', 'cabine'], motivo: 'a face de baixo da placa do teto encosta na face de cima da cabine, em y 2283, com o mesmo contorno' },
  { par: ['giroflex', 'teto'], motivo: 'a base do giroflex, em y 2295, assenta no tampo do teto' },
  { par: ['parabrisa', 'cabine'], motivo: 'a face de trás da placa do para-brisa encosta na face inclinada da frente da cabine, sem folga' },
  { par: ['parabrisa', 'carroceria'], motivo: 'a aresta de baixo do para-brisa, em y 1412 e z 2162, toca o tampo do corpo no pé da face inclinada' },
  { par: ['vidroLateralDir', 'cabine'], motivo: 'o vidro lateral direito assenta na face inclinada da lateral direita da cabine' },
  { par: ['vidroLateralEsq', 'cabine'], motivo: 'o vidro lateral esquerdo assenta na face inclinada da lateral esquerda da cabine' },
  { par: ['vidroTraseiro', 'cabine'], motivo: 'a face da frente da placa do vidro de trás encosta na face de trás da cabine, em z 833' },
  { par: ['espelhoDir', 'carroceria'], motivo: 'a face de dentro do espelho direito encosta na lateral do corpo, em x 971, de z 1986 a 2162' },
  { par: ['espelhoEsq', 'carroceria'], motivo: 'a face de dentro do espelho esquerdo encosta na lateral do corpo, em x -971, de z 1986 a 2162' },
  /* frente */
  { par: ['grade', 'carroceria'], motivo: 'a face de trás da grade, em z 2680, encosta na face da frente do corpo, que sai do mesmo perfil' },
  { par: ['grade', 'narizBaixo'], motivo: 'a grade assenta na face de cima da cunha escura do nariz, em y 883, na quina da frente' },
  { par: ['farolDir', 'grade'], motivo: 'a face de trás do farol direito encosta na face da frente da grade, em z 2692' },
  { par: ['farolEsq', 'grade'], motivo: 'a face de trás do farol esquerdo encosta na face da frente da grade, em z 2692' },
  { par: ['farolLateralDir', 'carroceria'], motivo: 'a placa amarela lateral direita encosta na lateral do corpo, em x 971, de z 2515 a 2680' },
  { par: ['farolLateralEsq', 'carroceria'], motivo: 'a placa amarela lateral esquerda encosta na lateral do corpo, em x -971, de z 2515 a 2680' },
  { par: ['farolLateralDir', 'farolDir'], motivo: 'a placa lateral direita encosta no farol direito na quina, no plano z 2692, entre x 971 e 977' },
  { par: ['farolLateralEsq', 'farolEsq'], motivo: 'a placa lateral esquerda encosta no farol esquerdo na quina, no plano z 2692, entre x -977 e -971' },
  { par: ['farolLateralDir', 'grade'], motivo: 'a placa lateral encosta na lateral da grade, em x 971, de z 2680 a 2692' },
  { par: ['farolLateralEsq', 'grade'], motivo: 'a placa lateral encosta na lateral da grade, em x -971, de z 2680 a 2692' },
  { par: ['narizBaixo', 'carroceria'], motivo: 'a face de cima da cunha do nariz, em y 883, encosta na face de baixo do corpo, de z 2492 a 2680' },
  { par: ['narizBaixo', 'plataformaFrente'], motivo: 'a face de trás da cunha, em z 2492, encosta na ponta da frente da plataforma' },
  { par: ['narizBaixo', 'paraChoqueFrente'], motivo: 'a cunha assenta na face de cima do para-choque da frente, em y 706, de z 2492 a 2633' },
  /* plataforma, chassi e para-choques */
  { par: ['plataformaFrente', 'carroceria'], motivo: 'a face de cima da plataforma da frente, em y 883, encosta na face de baixo do corpo' },
  { par: ['plataformaMeio', 'carroceria'], motivo: 'a face de cima da plataforma do meio, em y 883, encosta na face de baixo do corpo, de z 833 a 1419' },
  { par: ['plataformaMeio', 'chassiMeio'], motivo: 'a plataforma do meio assenta na face de cima do segmento do meio do chassi, em y 530' },
  { par: ['plataformaFrente', 'chassiFrente'], motivo: 'a plataforma da frente assenta na face de cima do segmento da frente do chassi, em y 530' },
  { par: ['plataformaFrente', 'paraChoqueFrente'], motivo: 'a face da frente da plataforma, em z 2492, encosta na face de trás do para-choque, de y 530 a 706' },
  { par: ['chassiFrente', 'paraChoqueFrente'], motivo: 'a face da frente do segmento da frente do chassi, em z 2492, encosta na face de trás do para-choque da frente' },
  { par: ['plataformaTras', 'paraChoqueTras'], motivo: 'a plataforma de trás assenta na face de cima do para-choque de trás, em y 706, e encosta na face de trás dele em z -2603' },
  { par: ['pinoFrente', 'paraChoqueFrente'], motivo: 'a face de trás do pino da frente encosta na face da frente do para-choque, em z 2780' },
  { par: ['placaFrente', 'pinoFrente'], motivo: 'a placa clara encosta na face da frente do pino, em z 2856, com o mesmo octógono' },
  { par: ['pinoTras', 'paraChoqueTras'], motivo: 'a face da frente do pino de trás encosta na face de trás do para-choque, em z -2780' },
  { par: ['pinoTras', 'plataformaTras'], motivo: 'a face da frente do pino de trás encosta na face de trás da plataforma, em z -2780, de y 706 a 750' },
  { par: ['placaTras', 'pinoTras'], motivo: 'a placa clara encosta na face de trás do pino, em z -2856, com o mesmo octógono' },
  ...lados.map((l) => ({ par: [`lanterna${l}`, 'plataformaTras'], motivo: 'a face da frente da lanterna encosta na face de trás da plataforma, em z -2780, de y 706 a 883' })),
  /* caixas de roda */
  { par: ['caixaRodaFrente', 'chassiMeio'], motivo: 'a parede de trás da caixa de roda da frente, em z 1287, encosta na face da frente do segmento do meio do chassi, de y 353 a 530' },
  { par: ['caixaRodaFrente', 'chassiFrente'], motivo: 'a parede da frente da caixa de roda da frente, em z 2367, encosta na face de trás do segmento da frente do chassi, de y 353 a 530' },
  { par: ['caixaRodaTras', 'chassiMeio'], motivo: 'a parede da frente da caixa de roda de trás, em z -492, encosta na face de trás do segmento do meio do chassi, de y 353 a 530' },
  { par: ['caixaRodaFrente', 'carroceria'], motivo: 'o arco da roda da frente é o mesmo polígono recortado no perfil do corpo, e a caixa o fecha entre os pneus' },
  { par: ['caixaRodaFrente', 'plataformaMeio'], motivo: 'a caixa da roda da frente encosta no arco de trás da plataforma do meio, nos mesmos planos do polígono' },
  { par: ['caixaRodaFrente', 'plataformaFrente'], motivo: 'a caixa da roda da frente encosta no arco da frente da plataforma da frente, nos mesmos planos do polígono' },
  { par: ['caixaRodaTras', 'plataformaTras'], motivo: 'a caixa da roda de trás encosta no arco de trás da plataforma de trás, nos mesmos planos do polígono' },
  { par: ['caixaRodaTras', 'plataformaMeio'], motivo: 'a caixa da roda de trás encosta no arco da frente da plataforma do meio, nos mesmos planos do polígono' },
  /* abas */
  ...lados.flatMap((l) => [
    { par: [`abaFrente${l}`, 'carroceria'], motivo: 'a face de dentro da aba, em x 971 ou -971, encosta na lateral do corpo em volta do arco' },
    { par: [`abaFrente${l}`, 'plataformaMeio'], motivo: 'a base da aba da frente, em y 883, assenta na face de cima da plataforma do meio, atrás do arco' },
    { par: [`abaFrente${l}`, 'plataformaFrente'], motivo: 'a base da aba da frente, em y 883, assenta na face de cima da plataforma da frente, na frente do arco' },
    { par: [`abaTras${l}`, 'plataformaTras'], motivo: 'a base da aba de trás, em y 883, assenta na face de cima da plataforma de trás, atrás do arco' },
    { par: [`abaTras${l}`, 'plataformaMeio'], motivo: 'a base da aba de trás, em y 883, assenta na face de cima da plataforma do meio, na frente do arco' },
  ]),
  /* contatos por aresta, que saem dos mesmos números da tabela */
  ...lados.flatMap((l) => [
    { par: [`abaTras${l}`, 'caixaRodaTras'], motivo: 'a aresta de dentro da base da aba, em y 883, toca a aresta de cima da caixa de roda de trás, onde o arco corta a plataforma' },
    { par: [`espelho${l}`, 'cabine'], motivo: 'a aresta de cima do espelho, em y 1412 e x 971 ou -971, toca a aresta de baixo da lateral da cabine' },
    { par: [`vidroLateral${l}`, 'carroceria'], motivo: 'a aresta de baixo do vidro lateral, em y 1412, toca o tampo do corpo no pé da face inclinada da cabine' },
    { par: [`lanterna${l}`, 'paraChoqueTras'], motivo: 'a aresta de baixo da lanterna, em y 706 e z -2780, toca a aresta de cima da face de trás do para-choque' },
  ]),
  /* rodas */
  ...lados.flatMap((l) => pontas.flatMap((p) => [
    { par: [`aro${p}${l}`, `roda${p}${l}`], motivo: 'a face de dentro do aro encosta na face de fora do pneu, em x 1059 ou 1191 e os opostos, no disco do centro' },
    { par: [`roda${p}${l}`, `caixaRoda${p}`], motivo: 'a face de dentro do pneu encosta na face da caixa de roda, em x 530 ou 662 e os opostos, que fecha o arco entre os dois pneus' },
  ])),
];

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha. */
export function pontosDeclarados(T = TABELA) {
  const tol = 1;
  const yPlaca = T.y_teto - T.teto_espessura;
  return [
    { nome: 'ponta do pino da frente, em cima', parte: 'placaFrente', medida: 'maximo', em: [T.pino_meia, T.pino_frente_y[1], T.pino_z_ponta], toleranciaMm: tol },
    { nome: 'ponta do pino de trás, embaixo', parte: 'placaTras', medida: 'minimo', em: [-T.pino_meia, T.pino_tras_y[0], -T.pino_z_ponta], toleranciaMm: tol },
    { nome: 'base do giroflex, à direita, na frente', parte: 'giroflex', medida: 'maximo', em: [T.giro_meia_base, T.y_giro_topo, T.giro_z_base[1]], toleranciaMm: tol },
    { nome: 'canto da frente do teto, à direita, na borda da placa', parte: 'teto', medida: 'maximo', em: [meiaCabine(T, yPlaca), T.y_teto, zParabrisa(T, yPlaca)], toleranciaMm: tol },
    { nome: 'pneu de trás, à esquerda, embaixo', parte: 'rodaTrasEsq', medida: 'minimo', em: [-T.roda_x_fora_tras, 0, T.roda_z_tras - T.roda_raio], toleranciaMm: tol },
    { nome: 'pneu da frente, à direita, em cima', parte: 'rodaFrenteDir', medida: 'maximo', em: [T.roda_x_fora_frente, 2 * T.roda_raio, T.roda_z_frente + T.roda_raio], toleranciaMm: tol },
    { nome: 'ponta do espelho direito', parte: 'espelhoDir', medida: 'maximo', em: [T.espelho_x1, T.y_borda, T.espelho_z[1]], toleranciaMm: tol },
    { nome: 'canto da frente do para-choque, à esquerda, embaixo', parte: 'paraChoqueFrente', medida: 'minimo', em: [-T.chassi_meia, T.chassi_y0, T.z_chassi_frente], toleranciaMm: tol },
    { nome: 'canto de trás da lanterna, à direita, em cima', parte: 'lanternaDir', medida: 'minimo', em: [T.lanterna_x_dentro, T.lanterna_y0, T.z_traseira - T.lanterna_espessura], toleranciaMm: tol },
  ];
}

const receita = {
  meta: { nome: 'caminhao-entrega-aberto', desc: 'caminhão de entrega de brinquedo de plataforma aberta, cabine laranja afunilada com giroflex, plataforma plana e baixa, abas escuras nos arcos, para-choques e pinos nas pontas e rodas com aro' },
  PARAMS: TABELA,
  MATERIAIS: {
    laranja: { tipo: 'liso', cor: '#e6604a' },
    laranjaTeto: { tipo: 'liso', cor: '#f26a44' },
    cabine: { tipo: 'liso', cor: '#66677c' },
    vidro: { tipo: 'liso', cor: '#e2edf8' },
    cinzaEscuro: { tipo: 'liso', cor: '#565869' },
    plataforma: { tipo: 'liso', cor: '#6e7087' },
    saia: { tipo: 'liso', cor: '#464859' },
    pneu: { tipo: 'liso', cor: '#26262a' },
    aro: { tipo: 'metal', cor: '#7d84a1', acabamento: 'escovado' },
    amarelo: { tipo: 'liso', cor: '#f2c21b' },
    lanterna: { tipo: 'liso', cor: '#d3363d' },
    claro: { tipo: 'liso', cor: '#d9d9e4' },
  },
  TOPO: { origem: 'chão, no meio do caminhão em x e em z; y para cima e a frente do caminhão em +z' },
  PLANO: {
    objeto: 'caminhão de entrega de brinquedo de plataforma aberta, 5736 mm de comprimento, 2648 mm de largura com espelhos e 2383 mm de altura, cabine laranja afunilada e plataforma plana e baixa',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total do caminhão, de z -2868 a 2868', milimetros: 5736 },
    familia: 'veiculo',
    partes: [
      { nome: 'carroceria', forma: 'corpo laranja de 1942 mm de largura, de y 883 ao topo do capô e das laterais em y 1412, de z 833 a 2680, com o capô inclinado do nariz (y 1240) ao pé do para-brisa (z 2162) e o arco da roda da frente recortado na base', tecnica: 'interseção de perfil lateral com o arco recortado na base e seção frontal retangular' },
      { nome: 'cabine', forma: 'cabine escura de y 1412 a 2283 e de z 833 a 2162 embaixo, com face de trás vertical, para-brisa inclinado e seção que afunila de 1942 mm de largura embaixo para 1588 mm no teto', tecnica: 'interseção de perfil lateral trapezoidal e seção frontal que afunila' },
      { nome: 'teto', forma: 'placa laranja de 12 mm sobre a cabine, de y 2283 a 2295, de z 921 a 1809 em cima e meia largura de 794 mm', tecnica: 'interseção de perfil lateral e seção frontal da cabine' },
      { nome: 'giroflex', forma: 'tronco de pirâmide laranja sobre o teto, de y 2295 a 2383, de 706 por 353 mm na base e 636 por 282 mm em cima', tecnica: 'interseção de perfil lateral trapezoidal e seção frontal trapezoidal' },
      { nome: 'parabrisa', forma: 'placa clara de 12 mm sobre a face inclinada da frente da cabine, de y 1412 a 2131, com 1582 mm de largura embaixo e 1296 mm em cima', tecnica: 'interseção de uma faixa lateral inclinada e de uma seção frontal trapezoidal' },
      { nome: 'vidroLateralDir', forma: 'placa clara de 12 mm na face inclinada da lateral direita da cabine, de z 1009 a 1973 embaixo e a 1689 em cima, de y 1412 a 2122', tecnica: 'interseção de um quadrilátero lateral e de uma faixa inclinada da seção frontal' },
      { nome: 'vidroLateralEsq', forma: 'placa clara de 12 mm na face inclinada da lateral esquerda da cabine, espelhada da direita', tecnica: 'interseção de um quadrilátero lateral e de uma faixa inclinada da seção frontal' },
      { nome: 'vidroTraseiro', forma: 'placa clara de 12 mm na face de trás da cabine, trapezoidal, de y 1589 a 2118, com 1510 mm de largura embaixo e 1300 mm em cima', tecnica: 'extrusão em z de um trapézio' },
      { nome: 'espelhoDir', forma: 'caixa laranja de 353 por 176 por 176 mm que sai da lateral direita do corpo até x 1324, de y 1236 a 1412, de z 1986 a 2162', tecnica: 'caixa encostada na lateral do corpo' },
      { nome: 'espelhoEsq', forma: 'caixa laranja de 353 por 176 por 176 mm que sai da lateral esquerda do corpo até x -1324, de y 1236 a 1412', tecnica: 'caixa encostada na lateral do corpo' },
      { nome: 'grade', forma: 'placa escura de 12 mm que fecha a frente do corpo, de y 883 a 1236 na face e até o capô em cima, com 1942 mm de largura', tecnica: 'extrusão em x de um trapézio lateral' },
      { nome: 'farolDir', forma: 'placa amarela de 492 por 177 por 6 mm na face da frente, à direita, de x 485 a 977 e de y 1059 a 1236', tecnica: 'caixa encostada na face da grade' },
      { nome: 'farolEsq', forma: 'placa amarela de 492 por 177 por 6 mm na face da frente, à esquerda', tecnica: 'caixa encostada na face da grade' },
      { nome: 'farolLateralDir', forma: 'placa amarela de 6 mm na lateral direita do nariz, de z 2515 a 2692 e de y 1059 até a linha do capô', tecnica: 'extrusão em x de um quadrilátero lateral' },
      { nome: 'farolLateralEsq', forma: 'placa amarela de 6 mm na lateral esquerda do nariz, espelhada da direita', tecnica: 'extrusão em x de um quadrilátero lateral' },
      { nome: 'narizBaixo', forma: 'cunha escura de 1942 mm de largura entre o para-choque e a grade, de y 706 a 883 e de z 2492 a 2692, com a face da frente inclinada', tecnica: 'extrusão em x de um quadrilátero lateral' },
      { nome: 'plataformaTras', forma: 'placa escura azulada de 2294 mm de largura e y 530 a 883 que vai da traseira (z -2780) ao arco da roda de trás, com o arco recortado', tecnica: 'extrusão em x do perfil lateral com o arco recortado' },
      { nome: 'plataformaMeio', forma: 'placa escura azulada de 2294 mm de largura e y 530 a 883 entre o arco da roda de trás e o da roda da frente, com os dois arcos recortados', tecnica: 'extrusão em x do perfil lateral com os dois arcos recortados' },
      { nome: 'plataformaFrente', forma: 'placa escura azulada de 2294 mm de largura e y 530 a 883 na frente do arco da roda da frente, até z 2492', tecnica: 'extrusão em x do perfil lateral com o arco recortado' },
      { nome: 'chassiMeio', forma: 'segmento escuro de y 353 a 530 entre os arcos das duas rodas, de z -492 a 1287, com 2294 mm de largura', tecnica: 'caixa' },
      { nome: 'chassiFrente', forma: 'segmento escuro de y 353 a 530 na frente do arco da roda da frente, de z 2367 a 2492, com 2294 mm de largura', tecnica: 'caixa' },
      { nome: 'paraChoqueFrente', forma: 'para-choque escuro de 2294 mm de largura, de y 353 a 706 e de z 2492 a 2780, com os cantos chanfrados em dois lados', tecnica: 'extrusão em y da planta chanfrada' },
      { nome: 'paraChoqueTras', forma: 'para-choque escuro de 2294 mm de largura, de y 530 a 706 e de z -2780 a -2603, com os cantos de trás arredondados em quarto de círculo de 177 mm', tecnica: 'extrusão em y da planta com cantos em arco' },
      { nome: 'pinoFrente', forma: 'pino escuro de seção octogonal de 618 por 309 mm, de y 265 a 574, que sai do para-choque da frente de z 2780 a 2856', tecnica: 'extrusão em z do octógono' },
      { nome: 'placaFrente', forma: 'placa clara de 12 mm de espessura na ponta do pino da frente, de z 2856 a 2868, com o mesmo octógono', tecnica: 'extrusão em z do octógono' },
      { nome: 'pinoTras', forma: 'pino escuro de seção octogonal de 618 por 308 mm, de y 442 a 750, que sai da traseira de z -2780 a -2856', tecnica: 'extrusão em z do octógono' },
      { nome: 'placaTras', forma: 'placa clara de 12 mm de espessura na ponta do pino de trás, de z -2868 a -2856, com o mesmo octógono', tecnica: 'extrusão em z do octógono' },
      { nome: 'lanternaDir', forma: 'placa vermelha de 8 mm na face de trás da plataforma, no canto direito, de x 882 a 1147 e de y 706 a 883', tecnica: 'caixa encostada na face de trás' },
      { nome: 'lanternaEsq', forma: 'placa vermelha de 8 mm na face de trás da plataforma, no canto esquerdo', tecnica: 'caixa encostada na face de trás' },
      { nome: 'abaFrenteDir', forma: 'aba escura de arco da roda da frente à direita, de x 971 a 1147, em faixa entre 540 e 688 mm de raio, acima de y 883', tecnica: 'extrusão em x da faixa do arco' },
      { nome: 'abaFrenteEsq', forma: 'aba escura de arco da roda da frente à esquerda', tecnica: 'extrusão em x da faixa do arco' },
      { nome: 'abaTrasDir', forma: 'aba escura de arco da roda de trás à direita, de x 618 a 1147, em faixa entre 540 e 688 mm de raio, acima de y 883, com a quina de dentro chanfrada em cima', tecnica: 'interseção do perfil lateral da faixa com a seção frontal chanfrada' },
      { nome: 'abaTrasEsq', forma: 'aba escura de arco da roda de trás à esquerda', tecnica: 'interseção do perfil lateral da faixa com a seção frontal chanfrada' },
      { nome: 'caixaRodaFrente', forma: 'caixa escura que fecha o arco e o fundo do vão da roda da frente entre as faces de dentro dos pneus, de x -530 a 530, de y 353 ao topo do arco', tecnica: 'extrusão em x do polígono do arco, fechado na base' },
      { nome: 'caixaRodaTras', forma: 'caixa escura que fecha o vão da roda de trás entre as faces de dentro dos pneus, de x -662 a 662, de y 353 ao topo da plataforma (y 883)', tecnica: 'extrusão em x do polígono do arco, cortado no topo da plataforma' },
      { nome: 'rodaFrenteDir', forma: 'pneu escuro de 1060 mm de diâmetro e 529 mm de largura, com chanfro de 40 mm nas bordas, na roda da frente à direita, com 24 lados', tecnica: 'lathe de eixo x do perfil do pneu com chanfro' },
      { nome: 'rodaFrenteEsq', forma: 'pneu escuro de 1060 mm de diâmetro e 529 mm de largura, com chanfro de 40 mm nas bordas, na roda da frente à esquerda, com 24 lados', tecnica: 'lathe de eixo x do perfil do pneu com chanfro' },
      { nome: 'rodaTrasDir', forma: 'pneu escuro de 1060 mm de diâmetro e 529 mm de largura, com chanfro de 40 mm nas bordas, na roda de trás à direita, de x 662 a 1191, com 24 lados', tecnica: 'lathe de eixo x do perfil do pneu com chanfro' },
      { nome: 'rodaTrasEsq', forma: 'pneu escuro de 1060 mm de diâmetro e 529 mm de largura, com chanfro de 40 mm nas bordas, na roda de trás à esquerda, com 24 lados', tecnica: 'lathe de eixo x do perfil do pneu com chanfro' },
      { nome: 'aroFrenteDir', forma: 'disco cinza azulado de 540 mm de diâmetro e 15 mm de espessura, saindo da face de fora do pneu da frente à direita', tecnica: 'cilindro de eixo x' },
      { nome: 'aroFrenteEsq', forma: 'disco cinza azulado de 540 mm de diâmetro e 15 mm de espessura, saindo da face de fora do pneu da frente à esquerda', tecnica: 'cilindro de eixo x' },
      { nome: 'aroTrasDir', forma: 'disco cinza azulado de 540 mm de diâmetro e 15 mm de espessura, saindo da face de fora do pneu de trás à direita', tecnica: 'cilindro de eixo x' },
      { nome: 'aroTrasEsq', forma: 'disco cinza azulado de 540 mm de diâmetro e 15 mm de espessura, saindo da face de fora do pneu de trás à esquerda', tecnica: 'cilindro de eixo x' },
    ],
    criteriosDeReprovacao: [
      'o conjunto não mede 5736 mm de comprimento, 2648 mm de largura com espelhos ou 2383 mm de altura, ou alguma roda não toca o chão',
      'um lado do caminhão difere do outro em medida ou posição de peça simétrica',
      'a cabine tem largura constante em vez de afunilar de 1942 mm embaixo para 1588 mm no teto, ou o capô não sobe inclinado até o pé do para-brisa',
      'a plataforma é uma caixa, tem paredes ou ficou mais alta que y 883 atrás da cabine, em vez de uma placa baixa e plana entre os arcos',
      'uma roda não tem pneu escuro com aro cinza, não aparece no arco recortado ou o arco não tem aba escura e caixa de roda',
      'o para-brisa e os vidros laterais não são placas claras na face inclinada da cabine, ou o teto e o giroflex não são laranja',
      'os para-choques, os pinos e a faixa escura de baixo não estão nas duas pontas',
      'a silhueta lateral ou frontal não confere com a referência em mais de dois por cento do comprimento',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  ALIASES,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;

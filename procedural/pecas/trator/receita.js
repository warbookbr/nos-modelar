/* trator — trator de brinquedo de capô laranja, estreito e longo, cabine alta de vidros azul claros e teto saliente sobre as rodas
 * traseiras, que são muito maiores que as dianteiras, com para-lamas grandes em arco sobre as traseiras, para-lamas de braço
 * inclinado sobre as dianteiras, escapamento vertical, pesos claros na frente e atrás e luzes laranja nos lados da cabine.
 *
 * Origem: recriado em primitivas do núcleo a partir do modelo "tractor" do pacote A, de autor A (pacote A, endereço omitido,
 * endereço da página: endereço omitido), licença livre sem exigência de crédito (declarada no License.txt do pacote). A
 * malha de origem NÃO está no repositório: ela fica em importados/veiculos-livres/pacote-a/tractor.glb, que o git ignora. O que entra
 * aqui são as medidas tiradas dela (referencias/fonte-partes.json, em metro, com a escala 1,765, e as faces e os vértices da
 * própria malha lidos em milímetro) e as vistas (referencias/fonte-vistas.png). O que não ficou igual à referência está em
 * referencias/alvo.md.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente do trator em +z, x para a direita de quem olha de frente, centrado
 * em x e z. A TABELA é em milímetro e é a única fonte das medidas; `derivar` calcula perfis, seções e arcos, e `gerarPassos`
 * escreve, por parte, a forma e a `parte` com o `material`, com a conversão para metro num lugar só (`m`).
 *
 * Como a forma nasce: o trator não tem carroceria contínua. O chassi, o capô, os pesos e as hastes são extrusões de um perfil. A
 * cabine é um miolo de 916 mm de largura (extrusão do perfil lateral) mais duas asas, cada uma a INTERSEÇÃO do perfil lateral
 * com a seção frontal que afunila a parede de 775 mm para 622 mm no teto; o perfil das asas já nasce recortado pelo círculo do
 * para-lama traseiro, e por isso a asa, o vidro lateral e o para-lama se encostam pelo mesmo arco, sem booleana. O para-lama
 * traseiro é um setor de coroa (de 15 a 120 graus, raio de 928 a 1082 mm) extrudado em x, com os mesmos 24 lados do pneu, de modo
 * que a face de dentro dele assenta na faixa de rodagem. As rodas são `lathe` de 24 lados com o ombro chanfrado, o bolsão do aro e o
 * cubo. As rodas ficam inteiras para fora: não há arco recortado nem caixa de roda, e o contato delas é com o chassi, com o miolo
 * da cabine e com o para-lama.
 *
 * Na extrusão do núcleo, com eixo x o ponto [u, v] vai para y = -u e z = v; com eixo z vai para x = u e y = -v; com eixo y vai
 * para x = u e z = v. Simplificações em relação à fonte estão em referencias/alvo.md.
 */

export const TABELA = {
  comprimento: 3886,
  meia_largura: 1184,
  altura: 2828,

  // miolo: o chassi, o capô, o miolo da cabine, a face de dentro dos para-lamas e das rodas ficam nos mesmos 458 mm de meia largura
  meia_miolo: 458,

  // chassi: viga baixa de y 371 a 831, que sobe na frente em rampa de z 1636 (y 371) a z 1789 (y 831)
  chassi_y0: 371,
  chassi_y1: 831,
  chassi_z_tras: -1143,
  chassi_z_quina: 1636,
  chassi_z_frente: 1789,

  // pesos claros: seção de 538 mm com cantos de 77 mm e 269 mm de altura; o da frente se apoia na rampa do chassi, o de trás na face de trás
  peso_meia: 269,
  peso_chanfro: 77,
  peso_alt: 269,
  peso_frente_y0: 332,
  peso_frente_z: [1636, 1713],
  peso_tras_y0: 409,
  peso_tras_z: [-1220, -1143],

  // engate de trás: caixa de y 831 a 1139 atrás da cabine, com os cantos de trás cortados
  engate_y1: 1139,
  engate_meia: 384,
  engate_meia_ponta: 307,
  engate_z_canto: -1374,
  engate_z_ponta: -1450,

  // capô laranja: seção que alarga de 315 mm na base a 458 mm, de z 407 a 1789, com a tampa de topo de 391 mm de meia largura
  capo_base_meia: 315,
  capo_y_ombro: 1292,
  capo_y_quina: 1522,
  capo_y_topo: 1599,
  capo_topo_meia: 391,
  capo_z_tras: 407,

  // grelha: duas fendas azul claras na face da frente do capô, de 6 mm
  grelha_x: [161, 315],
  grelha_y: [1139, 1446],
  grelha_espessura: 6,

  // para-choque da frente: caixa de 1244 mm; a base sobe a 860 para passar 2 mm acima do pneu dianteiro, que o corta na quina
  para_choque_meia: 622,
  para_choque_y: [860, 985],
  para_choque_z: [1789, 1943],

  // tampa do radiador (direita) e escapamento (esquerda), revoluções de 8 lados sobre o topo do capô
  tampa_lados: 8,
  tampa_x: 230,
  tampa_z: 1557,
  tampa_perfil: [[101, 0], [87, 84], [54, 84], [32, 154]],
  escapamento_x: -199,
  escapamento_z: 652,
  escapamento_perfil: [[133, 0], [115, 110], [60, 110], [72, 552]],

  // para-lamas da frente: braço inclinado a 45 graus e placa sobre o pneu; x de 458 a 967
  pl_frente_x: [458, 967],
  pl_frente_coluna_z: [519, 673],
  pl_frente_coluna_y0: 583,
  pl_frente_coluna_topo: [873, 809],
  pl_frente_placa_z: [1013, 1566],
  pl_frente_placa_y: [1150, 1303],

  // cabine: base de y 831 a 1599 (z 407 a -1143), face da frente em rampa até o teto (z 100, y 2674), parede que afunila de 775 a 622 mm
  cab_z_tras: -1143,
  cab_z_frente_base: 407,
  cab_z_frente_topo: 100,
  cab_y_base: 831,
  cab_y_ombro: 1599,
  cab_y_teto: 2674,
  cab_parede_base: 775,
  cab_parede_topo: 622,

  // teto: placa de 154 mm de espessura, 1398 mm de largura, com o canto da frente cortado
  teto_meia: 699,
  teto_z_tras: -1297,
  teto_z_frente: 254,
  teto_y_quina: 2751,
  teto_y_topo: 2828,
  teto_z_ponta: 177,

  // vidros: placas de 12 mm com 1 mm de encaixe no corpo (plano inclinado só fecha por vértice idêntico, e o corpo não tem vértice em y 1747); o para-brisa afunila de 599 a 488 mm de meia largura, a janela lateral vai de y 1769 a 2505
  vidro_espessura: 12,
  vidro_encaixe: 1,
  pb_y: [1747, 2526],
  pb_meia_base: 599,
  janela_y: [1769, 2505],
  janela_z_tras: -972,
  janela_ponto_frente: [80, 2123],
  vidro_tras_y: [2005, 2505],
  vidro_tras_meia_ref: 550,
  vidro_tras_y_ref: 1979,

  // luzes laranja nos lados da cabine, encostadas na parede de 775 mm
  luz_x: [775, 1018],
  luz_y: [1446, 1835],
  luz_z: [273, 407],

  // rodas: 24 lados, uma face de dentro em 458 mm; o perfil é [raio, distância desde a face de dentro]
  lados_roda: 24,
  roda_frente: {
    raio: 575, z: 1289, x_fora: 996, raio_ombro_dentro: 486, raio_ombro_fora: 489,
    faixa: [224, 347], cavidade_raio: 316, cavidade_fundo: 300,
    aro_raio_borda: 210, aro_raio_fundo: 157, aro_fundo: 347,
  },
  roda_tras: {
    raio: 928, z: -1015, x_fora: 1184, raio_ombro_dentro: 788, raio_ombro_fora: 788,
    faixa: [212, 417], cavidade_raio: 620, cavidade_fundo: 400,
    aro_raio_borda: 439, aro_raio_fundo: 396, aro_fundo: 572,
    cubo_raio_fundo: 242, cubo_raio_topo: 186,
  },

  // para-lama de trás: setor de coroa de 15 a 120 graus, do raio do pneu (928) a 1082 mm, com os 24 lados do pneu
  pl_tras_x: [458, 1184],
  pl_tras_graus: [15, 120],
  pl_tras_raio_fora: 1082,
};

const m = (mm) => mm / 1000;
const area = (l) => l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0) / 2;
const antihorario = (l) => (area(l) < 0 ? [...l].reverse() : l);
/* Mapeamento do núcleo, medido: eixo x leva [u, v] a (y = -u, z = v); eixo z, a (x = u, y = -v); eixo y, a (x = u, z = v). Entram milímetro; saem metro. */
const perfilLateral = (zy) => antihorario(zy.map(([z, y]) => [-y, z])).map(([u, v]) => [m(u), m(v)]);
const secaoFrontal = (xy) => antihorario(xy.map(([x, y]) => [x, -y])).map(([u, v]) => [m(u), m(v)]);
const planta = (xz) => antihorario(xz).map(([u, v]) => [m(u), m(v)]);
const espelhar = (meia) => [...meia, ...[...meia].reverse().map(([x, y]) => [-x, y])];

/* Vértice de um polígono regular de `lados` lados, a `graus` do eixo y para trás (graus = 0 aponta para a frente, 90 para cima). */
const naCirculo = (cz, cy, R, graus) => [cz + R * Math.cos((graus * Math.PI) / 180), cy + R * Math.sin((graus * Math.PI) / 180)];

/* Ponto em que a cadeia de vértices cruza o valor `v` do eixo `eixo` (0 = z, 1 = y), por interpolação do segmento que o contém. */
function cruza(cad, eixo, v) {
  for (let i = 0; i < cad.length - 1; i += 1) {
    const a = cad[i]; const b = cad[i + 1];
    if ((a[eixo] - v) * (b[eixo] - v) < 0) {
      const t = (v - a[eixo]) / (b[eixo] - a[eixo]);
      return { i, p: [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])] };
    }
  }
  throw new Error(`a cadeia do arco não cruza ${eixo === 0 ? 'z' : 'y'} = ${v}`);
}

/* Perfis, seções e arcos em milímetro, calculados da TABELA. */
export function derivar(T) {
  const passo = 360 / T.lados_roda;
  const rt = T.roda_tras;
  const rf = T.roda_frente;
  const yc = rt.raio;
  const Rf = T.pl_tras_raio_fora;
  const [g0, g1] = T.pl_tras_graus;
  const ang = (a, b) => { const r = []; for (let g = a; g <= b + 1e-9; g += passo) r.push(g); return r; };

  /* cadeias do círculo externo e do interno do para-lama de trás, da frente (15 graus) para trás (120) */
  const fora = ang(g0, g1).map((g) => naCirculo(rt.z, yc, Rf, g));
  const dentro = ang(g0, g1).map((g) => naCirculo(rt.z, yc, rt.raio, g));
  /* cadeia do círculo externo inteira, de -15 a 105 graus, para o recorte das asas e dos vidros */
  const arco = ang(-passo, 105).map((g) => naCirculo(rt.z, yc, Rf, g));

  /* parede da cabine: x em função de y, de 775 mm até y 1599 e daí afunilando até 622 mm em y 2674 */
  const parede = (y) => (y <= T.cab_y_ombro ? T.cab_parede_base
    : T.cab_parede_base - ((T.cab_parede_base - T.cab_parede_topo) * (y - T.cab_y_ombro)) / (T.cab_y_teto - T.cab_y_ombro));
  const inclina = (T.cab_z_frente_base - T.cab_z_frente_topo) / (T.cab_y_teto - T.cab_y_ombro);
  const zFrenteCab = (y) => T.cab_z_frente_base - inclina * (y - T.cab_y_ombro);
  const cosParede = (T.cab_y_teto - T.cab_y_ombro) / Math.hypot(T.cab_parede_base - T.cab_parede_topo, T.cab_y_teto - T.cab_y_ombro);

  /* perfil lateral da cabine inteira e o das asas, que é o mesmo sem o que cai dentro do círculo do para-lama de trás */
  const ladoCabine = [[T.cab_z_tras, T.cab_y_base], [T.cab_z_frente_base, T.cab_y_base], [T.cab_z_frente_base, T.cab_y_ombro],
    [T.cab_z_frente_topo, T.cab_y_teto], [T.cab_z_tras, T.cab_y_teto]];
  const corteBaixo = cruza(arco.slice(0, 3), 1, T.cab_y_base);
  const corteTras = cruza(arco.slice(arco.length - 3), 0, T.cab_z_tras);
  const arcoUtil = arco.slice(1, arco.length - 1); // de 0 a 90 graus
  const ladoAsa = [corteBaixo.p, [T.cab_z_frente_base, T.cab_y_base], [T.cab_z_frente_base, T.cab_y_ombro],
    [T.cab_z_frente_topo, T.cab_y_teto], [T.cab_z_tras, T.cab_y_teto], corteTras.p, ...arcoUtil.slice().reverse()];
  const secaoAsa = (s) => {
    const y0 = T.cab_y_base - 100; const y1 = T.cab_y_teto + 100;
    return [[s * T.meia_miolo, y0], [s * parede(y0), y0], [s * T.cab_parede_base, T.cab_y_ombro], [s * parede(y1), y1], [s * T.meia_miolo, y1]];
  };

  /* janela lateral: a borda da frente segue a inclinação do para-brisa; embaixo e atrás o círculo do para-lama a recorta */
  const [jy0, jy1] = T.janela_y;
  const [zj, yj] = T.janela_ponto_frente;
  const zJanela = (y) => zj - inclina * (y - yj);
  const cadJanela = arcoUtil;
  const cJ0 = cruza(cadJanela, 1, jy0);
  const cJ1 = cruza(cadJanela, 0, T.janela_z_tras);
  const ladoJanela = [[zJanela(jy0), jy0], cJ0.p, ...cadJanela.slice(cJ0.i + 1, cJ1.i + 1), cJ1.p, [T.janela_z_tras, jy1], [zJanela(jy1), jy1]];
  const secaoJanela = (s) => {
    const y0 = jy0 - 100; const y1 = jy1 + 100; const e = T.vidro_espessura / cosParede;
    const d = T.vidro_encaixe;
    return [[s * (parede(y0) - d), y0], [s * (parede(y1) - d), y1], [s * (parede(y1) + e), y1], [s * (parede(y0) + e), y0]];
  };

  /* para-brisa: placa de 12 mm sobre a face da frente da cabine; a normal aponta para fora (frente e cima) */
  const [py0, py1] = T.pb_y;
  const A = [zFrenteCab(py0), py0]; const B = [zFrenteCab(py1), py1];
  const dz = B[0] - A[0]; const dy = B[1] - A[1]; const norma = Math.hypot(dz, dy);
  const nz = (dy / norma) * T.vidro_espessura; const ny = (-dz / norma) * T.vidro_espessura;
  const xPb = (y) => T.pb_meia_base - ((T.cab_parede_base - T.cab_parede_topo) * (y - py0)) / (T.cab_y_teto - T.cab_y_ombro);
  const d = T.vidro_encaixe / T.vidro_espessura;
  const ladoParabrisa = [[A[0] - nz * d, A[1] - ny * d], [B[0] - nz * d, B[1] - ny * d], [B[0] + nz, B[1] + ny], [A[0] + nz, A[1] + ny]];
  const secaoParabrisa = espelhar([[xPb(py0 - 100), py0 - 100], [xPb(py1 + 100), py1 + 100]]);

  /* vidro de trás: placa de 12 mm sobre a face de trás da cabine, com a mesma inclinação das paredes */
  const [ty0, ty1] = T.vidro_tras_y;
  const xTras = (y) => T.vidro_tras_meia_ref - ((T.cab_parede_base - T.cab_parede_topo) * (y - T.vidro_tras_y_ref)) / (T.cab_y_teto - T.cab_y_ombro);
  const ladoVidroTras = [[T.cab_z_tras - T.vidro_espessura, ty0], [T.cab_z_tras, ty0], [T.cab_z_tras, ty1], [T.cab_z_tras - T.vidro_espessura, ty1]];
  const secaoVidroTras = espelhar([[xTras(ty0 - 100), ty0 - 100], [xTras(ty1 + 100), ty1 + 100]]);

  /* teto */
  const ladoTeto = [[T.teto_z_tras, T.cab_y_teto], [T.teto_z_frente, T.cab_y_teto], [T.teto_z_frente, T.teto_y_quina],
    [T.teto_z_ponta, T.teto_y_topo], [T.teto_z_tras, T.teto_y_topo]];

  /* chassi e pesos */
  const yRampa = (z) => T.chassi_y0 + ((z - T.chassi_z_quina) * (T.chassi_y1 - T.chassi_y0)) / (T.chassi_z_frente - T.chassi_z_quina);
  const ladoChassi = [[T.chassi_z_tras, T.chassi_y0], [T.chassi_z_quina, T.chassi_y0], [T.chassi_z_frente, T.chassi_y1], [T.chassi_z_tras, T.chassi_y1]];
  const pc = T.peso_chanfro; const pm = T.peso_meia;
  const [pfz0, pfz1] = T.peso_frente_z;
  const ladoPesoFrente = [[pfz0, T.peso_frente_y0], [pfz1, T.peso_frente_y0], [pfz1, yRampa(pfz1)], [pfz0, yRampa(pfz0)]];
  const secaoPesoFrente = espelhar([[pm - pc, T.peso_frente_y0], [pm, T.peso_frente_y0 + pc], [pm, T.peso_frente_y0 + T.peso_alt - pc],
    [pm - pc, T.peso_frente_y0 + T.peso_alt], [pm - pc, T.chassi_y1]]);
  const secaoPesoTras = espelhar([[pm - pc, T.peso_tras_y0], [pm, T.peso_tras_y0 + pc], [pm, T.peso_tras_y0 + T.peso_alt - pc], [pm - pc, T.peso_tras_y0 + T.peso_alt]]);
  const plantaEngate = [[-T.engate_meia_ponta, T.engate_z_ponta], [T.engate_meia_ponta, T.engate_z_ponta], [T.engate_meia, T.engate_z_canto],
    [T.engate_meia, T.cab_z_tras], [-T.engate_meia, T.cab_z_tras], [-T.engate_meia, T.engate_z_canto]];

  /* capô: seção que alarga da base ao ombro, sobe reta até a quina e fecha no topo; extrudada em z */
  const secaoCapo = espelhar([[T.capo_base_meia, T.chassi_y1], [T.meia_miolo, T.capo_y_ombro], [T.meia_miolo, T.capo_y_quina], [T.capo_topo_meia, T.capo_y_topo]]);

  /* para-lama da frente: braço a 45 graus (da coluna à placa) e placa de 153 mm sobre o pneu */
  const [cz0, cz1] = T.pl_frente_coluna_z; const [ct0, ct1] = T.pl_frente_coluna_topo;
  const [pz0, pz1] = T.pl_frente_placa_z; const [py_0, py_1] = T.pl_frente_placa_y;
  const ladoParaLamaFrente = [[cz0, T.pl_frente_coluna_y0], [cz1, T.pl_frente_coluna_y0], [cz1, ct1], [pz0, py_0], [pz1, py_0], [pz1, py_1],
    [cz0 + (py_1 - ct0), py_1], [cz0, ct0]];

  /* para-lama de trás: coroa de 15 a 120 graus */
  const ladoParaLamaTras = [...fora, ...[...dentro].reverse()];

  return {
    ladoCabine, ladoAsa, secaoAsa, ladoJanela, secaoJanela, ladoParabrisa, secaoParabrisa, ladoVidroTras, secaoVidroTras, ladoTeto,
    ladoChassi, ladoPesoFrente, secaoPesoFrente, secaoPesoTras, plantaEngate, secaoCapo, ladoParaLamaFrente, ladoParaLamaTras, yRampa,
    parede, zFrenteCab,
  };
}

/* O perfil [raio, distância desde a face de dentro] do pneu: ombro chanfrado, faixa, ombro de fora, bolsão do aro. */
function perfilPneu(r) {
  return [[0, 0], [r.raio_ombro_dentro, 0], [r.raio, r.faixa[0]], [r.raio, r.faixa[1]], [r.raio_ombro_fora, r.x_fora - 458],
    [r.cavidade_raio, r.x_fora - 458], [r.cavidade_raio, r.cavidade_fundo], [0, r.cavidade_fundo]];
}
/* O aro enche o bolsão: da cavidade até a face, com o fundo rebaixado no meio. */
function perfilAro(r) {
  const larg = r.x_fora - 458;
  return [[0, r.cavidade_fundo], [r.cavidade_raio, r.cavidade_fundo], [r.cavidade_raio, larg], [r.aro_raio_borda, larg],
    [r.aro_raio_fundo, r.aro_fundo], [0, r.aro_fundo]];
}
const perfilCubo = (r) => [[0, r.aro_fundo], [r.cubo_raio_fundo, r.aro_fundo], [r.cubo_raio_topo, r.x_fora - 458], [0, r.x_fora - 458]];

const RODAS = [
  { ponta: 'Frente', lado: 'Esq', s: -1 }, { ponta: 'Frente', lado: 'Dir', s: 1 },
  { ponta: 'Tras', lado: 'Esq', s: -1 }, { ponta: 'Tras', lado: 'Dir', s: 1 },
];
const LADOS = [{ lado: 'Esq', s: -1 }, { lado: 'Dir', s: 1 }];

/** Os PASSOS. Os ids: um bloco de cem por parte; a parte feita de interseção usa os ids seguintes do bloco. */
export function gerarPassos(T) {
  const D = derivar(T);
  const passos = [];
  const sel = (op, id) => ({ origem: { op, id } });
  const parte = (nome, s, usa) => { passos.push(['parte', { nome, sel: s }]); passos.push(['material', { sel: s, usa }]); };
  const L = T.meia_largura + 50;
  const C = T.comprimento / 2 + 50;
  const YA = 3000;
  let bloco = 100;
  const proximo = () => { const b = bloco; bloco += 100; return b; };

  /* Interseção do perfil lateral (z, y) com a seção frontal (x, y) e, se houver, a planta (x, z). */
  const porVistas = (nome, material, { lado, secao, plano }) => {
    const base = proximo();
    passos.push(['extrusao', { origemId: base + 1, eixo: 'x', altura: m(2 * L), em: [m(-L), 0, 0], perfil: perfilLateral(lado) }]);
    passos.push(['extrusao', { origemId: base + 2, eixo: 'z', altura: m(2 * C), em: [0, 0, m(-C)], perfil: secaoFrontal(secao) }]);
    const solidos = [sel('extrusao', base + 1), sel('extrusao', base + 2)];
    if (plano) {
      passos.push(['extrusao', { origemId: base + 3, altura: m(YA), em: [0, 0, 0], perfil: planta(plano) }]);
      solidos.push(sel('extrusao', base + 3));
    }
    passos.push(['intersectar', { origemId: base + 10, solidos }]);
    parte(nome, sel('intersectar', base + 10), material);
  };
  /* Prisma do perfil lateral (z, y) entre x0 e x1. */
  const prisma = (nome, material, perfil, x0, x1) => {
    const id = proximo();
    passos.push(['extrusao', { origemId: id, eixo: 'x', altura: m(x1 - x0), em: [m(x0), 0, 0], perfil: perfilLateral(perfil) }]);
    parte(nome, sel('extrusao', id), material);
  };
  /* Prisma da seção frontal (x, y) entre z0 e z1. */
  const prismaZ = (nome, material, secao, z0, z1) => {
    const id = proximo();
    passos.push(['extrusao', { origemId: id, eixo: 'z', altura: m(z1 - z0), em: [0, 0, m(z0)], perfil: secaoFrontal(secao) }]);
    parte(nome, sel('extrusao', id), material);
  };
  const caixa = (nome, material, [x0, x1], [y0, y1], [z0, z1]) => {
    const id = proximo();
    passos.push(['cubo', { origemId: id, larg: m(x1 - x0), alt: m(y1 - y0), prof: m(z1 - z0), em: [m((x0 + x1) / 2), m(y0), m((z0 + z1) / 2)] }]);
    parte(nome, sel('cubo', id), material);
  };
  /* Revolução em torno de y (tampa e escapamento): o perfil sai de [raio, altura] e a base fica em y = y0. */
  const revolucaoY = (nome, material, lados, perfil, x, y0, z) => {
    const id = proximo();
    passos.push(['lathe', { origemId: id, eixo: 'y', lados, em: [m(x), m(y0), m(z)], perfil: [[0, 0], ...perfil, [0, perfil[perfil.length - 1][1]]].map(([u, v]) => [m(u), m(v)]) }]);
    parte(nome, sel('lathe', id), material);
  };
  /* Revolução em torno de x, com a face de dentro em x0 (direita) ou espelhada (esquerda): o perfil vem de dentro para fora. */
  const revolucaoX = (nome, material, perfil, s, larg, yc, zc, furos) => {
    const id = proximo();
    const x0 = s > 0 ? 458 : -(458 + larg);
    const pts = s > 0 ? perfil : [...perfil].reverse().map(([r, t]) => [r, larg - t]);
    passos.push(['lathe', { origemId: id, eixo: 'x', lados: T.lados_roda, em: [m(x0), m(yc), m(zc)], perfil: pts.map(([u, v]) => [m(u), m(v)]), ...(furos ? { furos: [] } : {}) }]);
    parte(nome, sel('lathe', id), material);
  };

  /* chassi, pesos, engate */
  prisma('chassi', 'cinzaEscuro', D.ladoChassi, -T.meia_miolo, T.meia_miolo);
  porVistas('pesoFrente', 'claro', { lado: D.ladoPesoFrente, secao: D.secaoPesoFrente });
  {
    const id = proximo();
    passos.push(['extrusao', { origemId: id, eixo: 'z', altura: m(T.peso_tras_z[1] - T.peso_tras_z[0]), em: [0, 0, m(T.peso_tras_z[0])], perfil: secaoFrontal(D.secaoPesoTras) }]);
    parte('pesoTras', sel('extrusao', id), 'claro');
  }
  {
    const id = proximo();
    passos.push(['extrusao', { origemId: id, altura: m(T.engate_y1 - T.cab_y_base), em: [0, m(T.cab_y_base), 0], perfil: planta(D.plantaEngate) }]);
    parte('engateTras', sel('extrusao', id), 'cinzaEscuro');
  }
  caixa('paraChoqueFrente', 'cinzaEscuro', [-T.para_choque_meia, T.para_choque_meia], T.para_choque_y, T.para_choque_z);

  /* capô, grelha, tampa e escapamento */
  prismaZ('capo', 'laranja', D.secaoCapo, T.capo_z_tras, T.chassi_z_frente);
  const zG1 = T.chassi_z_frente + T.grelha_espessura;
  caixa('grelhaDir', 'vidro', T.grelha_x, T.grelha_y, [T.chassi_z_frente, zG1]);
  caixa('grelhaEsq', 'vidro', [-T.grelha_x[1], -T.grelha_x[0]], T.grelha_y, [T.chassi_z_frente, zG1]);
  revolucaoY('tampaRadiador', 'cinzaEscuro', T.tampa_lados, T.tampa_perfil.map(([r, t]) => [r, t]), T.tampa_x, T.capo_y_topo, T.tampa_z);
  revolucaoY('escapamento', 'cinzaEscuro', T.tampa_lados, T.escapamento_perfil, T.escapamento_x, T.capo_y_topo, T.escapamento_z);

  /* para-lamas da frente */
  for (const { lado, s } of LADOS) {
    const [x0, x1] = T.pl_frente_x;
    prisma(`paraLamaFrente${lado}`, 'cinza', D.ladoParaLamaFrente, s > 0 ? x0 : -x1, s > 0 ? x1 : -x0);
  }

  /* cabine: miolo, asas, teto, vidros, luzes */
  prisma('cabineMiolo', 'cinza', D.ladoCabine, -T.meia_miolo, T.meia_miolo);
  for (const { lado, s } of LADOS) porVistas(`cabineAsa${lado}`, 'cinza', { lado: D.ladoAsa, secao: D.secaoAsa(s) });
  prisma('teto', 'cinza', D.ladoTeto, -T.teto_meia, T.teto_meia);
  porVistas('parabrisa', 'vidro', { lado: D.ladoParabrisa, secao: D.secaoParabrisa });
  for (const { lado, s } of LADOS) porVistas(`vidroLateral${lado}`, 'vidro', { lado: D.ladoJanela, secao: D.secaoJanela(s) });
  porVistas('vidroTraseiro', 'vidro', { lado: D.ladoVidroTras, secao: D.secaoVidroTras });
  caixa('luzCabineDir', 'laranjaClaro', T.luz_x, T.luz_y, T.luz_z);
  caixa('luzCabineEsq', 'laranjaClaro', [-T.luz_x[1], -T.luz_x[0]], T.luz_y, T.luz_z);

  /* para-lamas de trás */
  for (const { lado, s } of LADOS) {
    const [x0, x1] = T.pl_tras_x;
    prisma(`paraLamaTras${lado}`, 'cinza', D.ladoParaLamaTras, s > 0 ? x0 : -x1, s > 0 ? x1 : -x0);
  }

  /* rodas: pneu, aro (que enche o bolsão) e, atrás, o cubo */
  for (const { ponta, lado, s } of RODAS) {
    const r = ponta === 'Frente' ? T.roda_frente : T.roda_tras;
    const larg = r.x_fora - 458;
    revolucaoX(`roda${ponta}${lado}`, 'pneu', perfilPneu(r), s, larg, r.raio, r.z, false);
  }
  for (const { ponta, lado, s } of RODAS) {
    const r = ponta === 'Frente' ? T.roda_frente : T.roda_tras;
    revolucaoX(`aro${ponta}${lado}`, 'aro', perfilAro(r), s, r.x_fora - 458, r.raio, r.z, false);
  }
  for (const { lado, s } of LADOS) {
    const r = T.roda_tras;
    revolucaoX(`cuboTras${lado}`, 'cubo', perfilCubo(r), s, r.x_fora - 458, r.raio, r.z, false);
  }
  return passos;
}

export const ALIASES = [];

const lados = ['Dir', 'Esq'];

export const CONTATOS = [
  /* cabine */
  { par: ['cabineMiolo', 'chassi'], motivo: 'a face de baixo do miolo da cabine, em y 831, assenta na face de cima do chassi, de z -1143 a 407' },
  ...lados.flatMap((l) => [
    { par: [`cabineAsa${l}`, 'cabineMiolo'], motivo: 'a face de dentro da asa, em x 458 ou -458, encosta na lateral do miolo da cabine' },
    { par: ['teto', `cabineAsa${l}`], motivo: 'a face de baixo do teto, em y 2674, assenta no topo da asa da cabine' },
    { par: ['parabrisa', `cabineAsa${l}`], motivo: 'a placa do para-brisa encosta na face inclinada da frente da asa, de x 458 a 599 e de -599 a -458' },
    { par: [`vidroLateral${l}`, `cabineAsa${l}`], motivo: 'a placa do vidro lateral encosta na face inclinada da parede da asa, sem folga' },
    { par: [`vidroLateral${l}`, `paraLamaTras${l}`], motivo: 'o vidro lateral é recortado pelo círculo do para-lama e encosta no arco dele ao longo da borda de baixo' },
    { par: ['vidroTraseiro', `cabineAsa${l}`], motivo: 'a placa do vidro de trás encosta na face de trás da asa, acima do arco do para-lama, em z -1143' },
    { par: [`luzCabine${l}`, `cabineAsa${l}`], motivo: 'a face de dentro da luz laranja, em x 775 ou -775, encosta na parede da asa, de y 1446 a 1599' },
    { par: ['capo', `cabineAsa${l}`], motivo: 'a aresta de trás do capô, em x 458 ou -458 e z 407, toca a aresta da frente da asa, de y 1292 a 1522' },
  ]),
  ...lados.map((l) => ({ par: [`cabineAsa${l}`, 'chassi'], motivo: 'a aresta de baixo de dentro da asa, em y 831 e x 458 ou -458, toca a aresta de cima da lateral do chassi' })),
  { par: ['chassi', 'engateTras'], motivo: 'a aresta de trás de cima do chassi, em z -1143 e y 831, toca a aresta de baixo da frente do engate' },
  { par: ['teto', 'cabineMiolo'], motivo: 'a face de baixo do teto, em y 2674, assenta no topo do miolo da cabine' },
  { par: ['parabrisa', 'cabineMiolo'], motivo: 'a placa do para-brisa encosta na face inclinada da frente do miolo da cabine' },
  { par: ['vidroTraseiro', 'cabineMiolo'], motivo: 'a placa do vidro de trás encosta na face de trás do miolo da cabine, em z -1143' },
  { par: ['engateTras', 'cabineMiolo'], motivo: 'a face da frente do engate, em z -1143, encosta na face de trás do miolo da cabine, de y 831 a 1139' },
  /* frente */
  { par: ['capo', 'chassi'], motivo: 'a face de baixo do capô, em y 831, assenta na face de cima do chassi, de z 407 a 1789' },
  { par: ['capo', 'cabineMiolo'], motivo: 'a face de trás do capô, em z 407, encosta na face da frente do miolo da cabine' },
  { par: ['paraChoqueFrente', 'capo'], motivo: 'a face de trás do para-choque, em z 1789, encosta na face da frente do capô' },
  { par: ['grelhaDir', 'capo'], motivo: 'a face de trás da fenda direita da grelha encosta na face da frente do capô, em z 1789' },
  { par: ['grelhaEsq', 'capo'], motivo: 'a face de trás da fenda esquerda da grelha encosta na face da frente do capô, em z 1789' },
  { par: ['tampaRadiador', 'capo'], motivo: 'a base da tampa do radiador assenta no topo do capô, em y 1599' },
  { par: ['escapamento', 'capo'], motivo: 'a base do escapamento assenta no topo do capô, em y 1599' },
  { par: ['pesoFrente', 'chassi'], motivo: 'a face de cima do peso da frente assenta na rampa da frente do chassi, que sai do mesmo número de apoio' },
  { par: ['pesoTras', 'chassi'], motivo: 'a face da frente do peso de trás, em z -1143, encosta na face de trás do chassi' },
  /* para-lamas e rodas */
  ...lados.flatMap((l) => [
    { par: [`paraLamaFrente${l}`, 'chassi'], motivo: 'a face de dentro da coluna do para-lama, em x 458 ou -458, encosta na lateral do chassi, de y 583 a 831' },
    { par: [`paraLamaFrente${l}`, 'capo'], motivo: 'a face de dentro da placa do para-lama, em x 458 ou -458, encosta na lateral do capô, de y 1292 a 1303' },
    { par: [`paraLamaFrente${l}`, `rodaFrente${l}`], motivo: 'a face de baixo da placa do para-lama, em y 1150, toca a faixa de rodagem no alto do pneu dianteiro' },
    { par: [`paraLamaTras${l}`, 'cabineMiolo'], motivo: 'a face de dentro do para-lama de trás, em x 458 ou -458, encosta na lateral do miolo da cabine' },
    { par: [`paraLamaTras${l}`, `cabineAsa${l}`], motivo: 'a face de fora do arco do para-lama encosta no arco recortado na asa, com os mesmos vértices do círculo de 1082 mm' },
    { par: [`paraLamaTras${l}`, `rodaTras${l}`], motivo: 'a face de dentro do arco, de raio 928 mm e 24 lados, assenta na faixa de rodagem do pneu traseiro' },
    { par: [`rodaFrente${l}`, 'chassi'], motivo: 'a face de dentro do pneu dianteiro, em x 458 ou -458, encosta na lateral do chassi' },
    { par: [`rodaTras${l}`, 'chassi'], motivo: 'a face de dentro do pneu traseiro, em x 458 ou -458, encosta na lateral do chassi' },
    { par: [`rodaTras${l}`, 'cabineMiolo'], motivo: 'a face de dentro do pneu traseiro, em x 458 ou -458, encosta na lateral do miolo da cabine' },
    { par: [`aroFrente${l}`, `rodaFrente${l}`], motivo: 'o aro enche o bolsão do pneu dianteiro e assenta no fundo dele e na parede de 316 mm' },
    { par: [`aroTras${l}`, `rodaTras${l}`], motivo: 'o aro enche o bolsão do pneu traseiro e assenta no fundo dele e na parede de 620 mm' },
    { par: [`cuboTras${l}`, `aroTras${l}`], motivo: 'a base do cubo assenta no fundo rebaixado do aro traseiro, em 114 mm da face de dentro do pneu' },
  ]),
];

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha. */
export function pontosDeclarados(T = TABELA) {
  const tol = 1;
  const rt = T.roda_tras; const rf = T.roda_frente;
  const arcoY = rt.raio + T.pl_tras_raio_fora;
  return [
    { nome: 'pneu de trás, à esquerda, embaixo, atrás', parte: 'rodaTrasEsq', medida: 'minimo', em: [-rt.x_fora, 0, rt.z - rt.raio], toleranciaMm: tol },
    { nome: 'pneu da frente, à direita, em cima, na frente', parte: 'rodaFrenteDir', medida: 'maximo', em: [rf.x_fora, 2 * rf.raio, rf.z + rf.raio], toleranciaMm: tol },
    { nome: 'topo do teto, na frente, à direita', parte: 'teto', medida: 'maximo', em: [T.teto_meia, T.teto_y_topo, T.teto_z_frente], toleranciaMm: tol },
    { nome: 'topo do para-lama de trás, à direita', parte: 'paraLamaTrasDir', medida: 'maximo', em: [T.pl_tras_x[1], arcoY, rt.z + T.pl_tras_raio_fora * Math.cos((T.pl_tras_graus[0] * Math.PI) / 180)], toleranciaMm: tol },
    { nome: 'canto de trás, embaixo, do chassi', parte: 'chassi', medida: 'minimo', em: [-T.meia_miolo, T.chassi_y0, T.chassi_z_tras], toleranciaMm: tol },
    { nome: 'quina da frente, em cima, do para-choque', parte: 'paraChoqueFrente', medida: 'maximo', em: [T.para_choque_meia, T.para_choque_y[1], T.para_choque_z[1]], toleranciaMm: tol },
    { nome: 'ponta da luz da cabine, à direita', parte: 'luzCabineDir', medida: 'maximo', em: [T.luz_x[1], T.luz_y[1], T.luz_z[1]], toleranciaMm: tol },
    { nome: 'ponta de trás, embaixo, do engate', parte: 'engateTras', medida: 'minimo', em: [-T.engate_meia, T.cab_y_base, T.engate_z_ponta], toleranciaMm: tol },
    { nome: 'ponta do peso da frente, embaixo', parte: 'pesoFrente', medida: 'minimo', em: [-T.peso_meia, T.peso_frente_y0, T.peso_frente_z[0]], toleranciaMm: tol },
  ];
}

const receita = {
  meta: { nome: 'trator', desc: 'trator de brinquedo de capô laranja, cabine alta de vidros azuis com teto saliente, rodas traseiras grandes e dianteiras pequenas e para-lamas em arco' },
  PARAMS: TABELA,
  MATERIAIS: {
    laranja: { tipo: 'liso', cor: '#f2ab3c', acabamento: 'pintado' },
    laranjaClaro: { tipo: 'liso', cor: '#e8942e', acabamento: 'pintado' },
    cinza: { tipo: 'liso', cor: '#7e8094', acabamento: 'pintado' },
    cinzaEscuro: { tipo: 'liso', cor: '#5f6079', acabamento: 'pintado' },
    claro: { tipo: 'liso', cor: '#d3d3e1', acabamento: 'pintado' },
    vidro: { tipo: 'liso', cor: '#cde5f3', acabamento: 'pintado' },
    pneu: { tipo: 'liso', cor: '#2f2f37', acabamento: 'pintado' },
    aro: { tipo: 'metal', cor: '#9ca3c0', acabamento: 'escovado' },
    cubo: { tipo: 'liso', cor: '#66667c', acabamento: 'pintado' },
  },
  TOPO: { origem: 'chão, no meio do trator em x e em z; y para cima e a frente do trator em +z' },
  PLANO: {
    objeto: 'trator de brinquedo de 3886 mm de comprimento, 2368 mm de largura e 2828 mm de altura, com capô laranja estreito, cabine alta de teto saliente, rodas traseiras grandes e dianteiras pequenas',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total do trator, de z -1943 a 1943', milimetros: 3886 },
    familia: 'veiculo',
    partes: [
      { nome: 'chassi', forma: 'viga cinza escura de 916 mm de largura, de y 371 a 831, de z -1143 a 1789, com a frente em rampa', tecnica: 'extrusao com eixo x de perfil lateral' },
      { nome: 'pesoFrente', forma: 'bloco claro de 538 mm de largura e 269 mm de altura, de z 1636 a 1713, com os cantos chanfrados, sob a rampa do chassi', tecnica: 'interseção do perfil lateral com a seção frontal' },
      { nome: 'pesoTras', forma: 'bloco claro de 538 mm de largura e 269 mm de altura, de z -1220 a -1143, com os cantos chanfrados, atrás do chassi', tecnica: 'extrusao com eixo z da seção chanfrada' },
      { nome: 'engateTras', forma: 'caixa cinza escura de y 831 a 1139, de z -1450 a -1143, com os cantos de trás cortados', tecnica: 'extrusao com eixo y da planta' },
      { nome: 'paraChoqueFrente', forma: 'caixa cinza escura de 1244 por 125 por 154 mm, de y 860 a 985, na frente do capô', tecnica: 'cubo encostado na face da frente do capô' },
      { nome: 'capo', forma: 'capô laranja de z 407 a 1789, que alarga de 630 mm na base a 916 mm e fecha em 782 mm no topo, y 831 a 1599', tecnica: 'extrusao com eixo z da seção frontal' },
      { nome: 'grelhaDir', forma: 'fenda azul clara de 154 por 307 mm e 6 mm de espessura na face da frente do capô, à direita', tecnica: 'cubo encostado na face da frente do capô' },
      { nome: 'grelhaEsq', forma: 'fenda azul clara de 154 por 307 mm e 6 mm de espessura na face da frente do capô, à esquerda', tecnica: 'cubo encostado na face da frente do capô' },
      { nome: 'tampaRadiador', forma: 'tampa cinza escura de 8 lados, de 202 mm de diâmetro na base e 154 mm de altura, sobre o capô à direita', tecnica: 'lathe em torno de y, com o degrau no perfil' },
      { nome: 'escapamento', forma: 'tubo cinza escuro de 8 lados, de 266 mm de diâmetro na base e 552 mm de altura sobre um colar, sobre o capô à esquerda', tecnica: 'lathe em torno de y, com o colar no perfil' },
      { nome: 'paraLamaFrenteEsq', forma: 'para-lama cinza de braço inclinado a 45 graus e placa de 153 mm sobre o pneu dianteiro esquerdo, de x -967 a -458', tecnica: 'extrusao com eixo x de perfil lateral' },
      { nome: 'paraLamaFrenteDir', forma: 'para-lama cinza de braço inclinado a 45 graus e placa de 153 mm sobre o pneu dianteiro direito, de x 458 a 967', tecnica: 'extrusao com eixo x de perfil lateral' },
      { nome: 'cabineMiolo', forma: 'miolo cinza da cabine de 916 mm de largura, de y 831 a 2674, com a frente em rampa', tecnica: 'extrusao com eixo x de perfil lateral' },
      { nome: 'cabineAsaEsq', forma: 'asa cinza da parede esquerda da cabine, de x -775 a -458 que afunila a -622 no teto, recortada pelo arco do para-lama', tecnica: 'interseção do perfil lateral recortado com a seção frontal afunilada' },
      { nome: 'cabineAsaDir', forma: 'asa cinza da parede direita da cabine, de x 458 a 775 que afunila a 622 no teto, recortada pelo arco do para-lama', tecnica: 'interseção do perfil lateral recortado com a seção frontal afunilada' },
      { nome: 'teto', forma: 'teto cinza de 1398 mm de largura e 154 mm de espessura, de z -1297 a 254, com a ponta da frente cortada', tecnica: 'extrusao com eixo x de perfil lateral' },
      { nome: 'parabrisa', forma: 'placa azul clara de 12 mm sobre a face inclinada da frente da cabine, de 1198 mm de largura na base a 976 no topo', tecnica: 'interseção do perfil lateral com a seção frontal' },
      { nome: 'vidroLateralEsq', forma: 'placa azul clara de 12 mm na parede esquerda da cabine, de y 1769 a 2505, recortada pelo arco do para-lama', tecnica: 'interseção do perfil lateral recortado com a seção frontal' },
      { nome: 'vidroLateralDir', forma: 'placa azul clara de 12 mm na parede direita da cabine, de y 1769 a 2505, recortada pelo arco do para-lama', tecnica: 'interseção do perfil lateral recortado com a seção frontal' },
      { nome: 'vidroTraseiro', forma: 'placa azul clara de 12 mm na face de trás da cabine, de y 2005 a 2505', tecnica: 'interseção do perfil lateral com a seção frontal' },
      { nome: 'luzCabineEsq', forma: 'caixa laranja de 243 por 389 por 134 mm na lateral esquerda da cabine, de y 1446 a 1835', tecnica: 'cubo encostado na parede da cabine' },
      { nome: 'luzCabineDir', forma: 'caixa laranja de 243 por 389 por 134 mm na lateral direita da cabine, de y 1446 a 1835', tecnica: 'cubo encostado na parede da cabine' },
      { nome: 'paraLamaTrasEsq', forma: 'setor de coroa cinza de 15 a 120 graus, de 928 a 1082 mm de raio, de x -1184 a -458, sobre o pneu traseiro esquerdo', tecnica: 'extrusao com eixo x do setor de 24 lados' },
      { nome: 'paraLamaTrasDir', forma: 'setor de coroa cinza de 15 a 120 graus, de 928 a 1082 mm de raio, de x 458 a 1184, sobre o pneu traseiro direito', tecnica: 'extrusao com eixo x do setor de 24 lados' },
      { nome: 'rodaFrenteEsq', forma: 'pneu escuro de 1150 mm de diâmetro e 538 mm de largura, de 24 lados, com ombros chanfrados e bolsão do aro, à esquerda', tecnica: 'lathe em torno de x, com o ombro chanfrado no perfil' },
      { nome: 'rodaFrenteDir', forma: 'pneu escuro de 1150 mm de diâmetro e 538 mm de largura, de 24 lados, com ombros chanfrados e bolsão do aro, à direita', tecnica: 'lathe em torno de x, com o ombro chanfrado no perfil' },
      { nome: 'rodaTrasEsq', forma: 'pneu escuro de 1856 mm de diâmetro e 726 mm de largura, de 24 lados, com ombros chanfrados e bolsão do aro, à esquerda', tecnica: 'lathe em torno de x, com o ombro chanfrado no perfil' },
      { nome: 'rodaTrasDir', forma: 'pneu escuro de 1856 mm de diâmetro e 726 mm de largura, de 24 lados, com ombros chanfrados e bolsão do aro, à direita', tecnica: 'lathe em torno de x, com o ombro chanfrado no perfil' },
      { nome: 'aroFrenteEsq', forma: 'aro azul acinzentado de 632 mm de diâmetro no bolsão do pneu dianteiro esquerdo, com o fundo rebaixado', tecnica: 'lathe em torno de x que enche o bolsão' },
      { nome: 'aroFrenteDir', forma: 'aro azul acinzentado de 632 mm de diâmetro no bolsão do pneu dianteiro direito, com o fundo rebaixado', tecnica: 'lathe em torno de x que enche o bolsão' },
      { nome: 'aroTrasEsq', forma: 'aro azul acinzentado de 1240 mm de diâmetro no bolsão do pneu traseiro esquerdo, com o fundo rebaixado', tecnica: 'lathe em torno de x que enche o bolsão' },
      { nome: 'aroTrasDir', forma: 'aro azul acinzentado de 1240 mm de diâmetro no bolsão do pneu traseiro direito, com o fundo rebaixado', tecnica: 'lathe em torno de x que enche o bolsão' },
      { nome: 'cuboTrasEsq', forma: 'cubo escuro cônico de 484 mm de diâmetro na base e 372 no topo, no fundo do aro traseiro esquerdo', tecnica: 'lathe em torno de x' },
      { nome: 'cuboTrasDir', forma: 'cubo escuro cônico de 484 mm de diâmetro na base e 372 no topo, no fundo do aro traseiro direito', tecnica: 'lathe em torno de x' },
    ],
    criteriosDeReprovacao: [
      'o conjunto não mede 3886 mm de comprimento, 2368 mm de largura ou 2828 mm de altura, ou alguma roda não toca o chão',
      'as rodas traseiras não têm quase o dobro do diâmetro das dianteiras, ou as rodas estão escondidas por arco recortado ou caixa de roda',
      'um lado do trator difere do outro em medida ou posição de peça simétrica',
      'o capô não é estreito e longo na frente da cabine, ou o escapamento e a tampa do radiador não saem do topo dele',
      'a cabine não afunila da parede de 775 mm para o teto, ou o teto não é saliente sobre ela',
      'o para-lama de trás não é um arco grande sobre o pneu, ou os vidros não são placas azul claras encostadas na cabine',
      'os para-lamas da frente não têm o braço inclinado sobre o pneu dianteiro',
      'a silhueta lateral ou frontal não confere com a referência em mais de dois por cento do comprimento',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  ALIASES,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;

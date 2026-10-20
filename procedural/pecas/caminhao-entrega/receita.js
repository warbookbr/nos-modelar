/* caminhao-entrega — caminhão de entrega estilizado: cabine curta e alta, de lavanda clara, na frente, baú verde alto e mais largo
 * atrás, com uma escotilha no teto e a porta de enrolar na traseira, chassi cinza longo com para-choques e placas, para-lamas em
 * arco, e rodas grandes de pneu escuro com cubo cinza azulado. Faróis amarelos, lanternas vermelhas e retrovisores claros. Sem
 * texto nem marca: só cores e formas.
 *
 * Origem: recriado em primitivas do núcleo a partir do modelo "delivery" do pacote A, de autor A (pacote A, endereço omitido,
 * endereço da página: endereço omitido), licença livre sem exigência de crédito (declarada no License.txt do pacote). A
 * malha de origem NÃO está no repositório: ela fica em importados/veiculos-livres/pacote-a/delivery.glb, que o git ignora. O que entra
 * aqui são as medidas tiradas dela (referencias/fonte-partes.json, em metro, escala 1,765) e as vistas (referencias/fonte-vistas.png).
 * O que não ficou igual à referência está em referencias/alvo.md.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente do caminhão em +z, x para a direita de quem olha de frente,
 * centrado em x e z. A TABELA é em milímetro e é a única fonte das medidas; `m` é a única conversão para metro; `derivar` calcula
 * as formas e `gerarPassos` escreve, por parte, a forma, a `parte` e o `material`. Nenhuma posição é digitada no passo.
 *
 * Como a forma é feita: a cabine e o baú são partes separadas, e o degrau e a diferença de largura entre elas são o que se reconhece
 * nele. Cada volume é a INTERSEÇÃO de prismas, o perfil lateral (z, y) em x, a seção frontal (x, y) em z e, quando a planta
 * importa, a planta (x, z) em y; as faces onde duas partes se encontram saem do mesmo plano de corte, sem `unir` e sem booleana de
 * subtração. Uma extrusão com `eixo: 'x'` leva o perfil [u, v] a y = -u e z = v; com `eixo: 'z'`, a x = u e y = -v; com `eixo: 'y'`,
 * a x = u e z = v. A cabine afunila para o teto pela seção frontal; o baú tem os cantos de cima chanfrados na seção frontal; a
 * traseira é um quadro em arco com a soleira, as lanternas e a porta de enrolar em dentes de serra, recuada no vão. Os arcos das
 * rodas são recortados no próprio perfil lateral e cada caixa de roda enche o mesmo arco entre as faces de dentro dos pneus. Os
 * pneus e os cubos são revoluções em torno de x (`lathe`).
 */

export const TABELA = {
  lados: 32, // contagem de lados dos pneus
  passos_arco: 12, // segmentos por meia volta nos arcos dos para-lamas e das caixas de roda (24 por volta, como na fonte)

  // rodas: pneu de 1060 mm de diâmetro e 529 mm de largura, com o cubo embutido na face de fora; eixos em z 1827 e -1032
  roda_raio: 530,
  roda_x_dentro: 530,
  roda_x_fora: 1059,
  roda_z_frente: 1827,
  roda_z_tras: -1032,
  pneu_furo_raio: 272,
  pneu_chanfro_raio: 450,
  pneu_chanfro_largura: 177,
  cubo_profundidade: 176,
  cubo_recesso_raio: 193,
  cubo_recesso_fundo_raio: 174,
  cubo_recesso_profundidade: 88,
  cubo_pino_fundo_raio: 107,
  cubo_pino_topo_raio: 82,

  // arcos: a folga de 15 mm até o pneu (545 mm do eixo) e o anel do para-lama até 690 mm
  arco_raio: 545,
  anel_raio: 690,

  // largura do baú e do chassi: 2294 mm
  meia_largura: 1147,

  // trilho cinza escuro do meio, só entre os vãos das rodas
  trilho_base_y: 353,
  trilho_topo_y: 530,

  // para-choques: barras de 2294 mm; a da frente vai de y 353 a 706 e a de trás de y 530 a 706; as quinas da planta se fecham até a ponta
  para_choque_y1: 706,
  para_choque_tras_y0: 530,
  para_choque_lado_z: 2603,
  para_choque_chanfro_x: 1096,
  para_choque_chanfro_z: 2728,
  para_choque_ponta_x: 971,
  para_choque_ponta_z: 2780,

  // placas octogonais de 618 mm de largura, saindo da ponta dos para-choques
  placa_meia_larg: 309,
  placa_chanfro: 88,
  placa_z1: 2868,
  placa_frente_y0: 265,
  placa_frente_y1: 574,
  placa_tras_y0: 441,
  placa_tras_y1: 750,

  // nariz, saia e capô da cabine: meia largura de 971, nariz em z 2692 com a saia chanfrada embaixo
  cab_meia_largura: 971,
  nariz_z: 2692,
  saia_y0: 530,
  capo_base_y: 882,
  saia_chanfro_z: 2633,
  saia_chanfro_x: 912,
  nariz_y: 1236,
  nariz_chanfro_z: 2515,
  nariz_chanfro_y: 1280,
  capo_fim_z: 1986,
  capo_topo_y: 1412,

  // cabine: da face da frente do baú ao para-brisa, de y 1412 a 2294, afunilando de 971 a 794 de meia largura
  cab_z_tras: 833,
  cab_topo_y: 2294,
  cab_meia_largura_topo: 794,
  cab_z_frente_topo: 1635,
  parabrisa_y_topo: 2130,
  parabrisa_meia_base: 791,
  parabrisa_meia_topo: 648,
  vidro_espessura: 12,
  vidro_lado_z_frente_base: 1796,
  vidro_lado_z_frente_topo: 1512,
  vidro_lado_y_topo: 2121,

  // bloco claro do teto da cabine: de z 833 a 1456 e y 2294 a 2471, com o chanfro da frente
  teto_cab_meia_largura: 618,
  teto_cab_z1: 1456,
  teto_cab_chanfro_y0: 2383,
  teto_cab_chanfro_z: 1368,
  teto_cab_topo_y: 2471,

  // retrovisores claros: da lateral da cabine a x 1324
  retrovisor_x1: 1324,
  retrovisor_y0: 1236,
  retrovisor_y1: 1588,
  retrovisor_z0: 1408,
  retrovisor_z1: 1585,

  // faróis amarelos nos cantos do nariz: de x 485 à lateral da cabine
  farol_x0: 485,
  farol_y0: 1059,
  farol_espessura: 12,

  // baú verde: de z -2780 a 833, de 2294 mm de largura, com o teto a y 2824 e os cantos de cima chanfrados
  bau_z_frente: 833,
  bau_z_tras: -2780,
  bau_ombro_y: 2736,
  bau_chanfro_x: 88,
  bau_topo_y: 2824,
  bau_degrau_tras_y: 706,

  // traseira: quadro de 177 mm de profundidade em volta do vão da porta, soleira e lanternas; a porta de enrolar fica dentro do vão
  quadro_profundidade: 177,
  porta_meia_largura: 971,
  porta_y0: 882,
  porta_dente: 441,
  porta_dentes: 4,
  porta_vale_recuo: 30,
  porta_vale_desvio: 5, // vales alternados em 5 mm: vales colineares viram triângulo sem área na triangulação da tampa
  porta_pico_z: -2734,
  soleira_meia_largura: 794,
  luz_y0: 706,

  // escotilha do teto: tronco de pirâmide de y 2824 a 2912
  escotilha_meia_base: 353,
  escotilha_z0: -1815,
  escotilha_z1: -1109,
  escotilha_meia_topo: 318,
  escotilha_topo_z0: -1779,
  escotilha_topo_z1: -1144,
  escotilha_topo_y: 2912,
};

const m = (mm) => mm / 1000;
const r9 = (v) => Math.round(v * 1e9) / 1e9;

const area = (l) => l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0) / 2;
const antihorario = (l) => (area(l) < 0 ? [...l].reverse() : l);

/* Tira os pontos repetidos e os colineares do contorno: vértice sem dobra vira triângulo sem área no exportador. */
function limpar(pontos) {
  let p = pontos.map(([a, b]) => [r9(a), r9(b)]);
  for (;;) {
    const n = p.length;
    let achou = -1;
    for (let i = 0; i < n && achou < 0; i += 1) {
      const a = p[(i + n - 1) % n]; const b = p[i]; const c = p[(i + 1) % n];
      const igual = Math.abs(b[0] - a[0]) < 1e-7 && Math.abs(b[1] - a[1]) < 1e-7;
      const cruz = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (igual || Math.abs(cruz) < 1e-6) achou = i;
    }
    if (achou < 0) return p;
    p = p.filter((_, i) => i !== achou);
  }
}

/* Prismas em milímetro. `perfil` já está no plano [u, v] do núcleo, em sentido anti-horário, com `altura` e `em` na unidade do eixo. */
const prismaX = (zy, x0, x1) => ({ eixo: 'x', perfil: antihorario(limpar(zy).map(([z, y]) => [-y, z])), altura: x1 - x0, em: [x0, 0, 0] });
const prismaZ = (xy, z0, z1) => ({ eixo: 'z', perfil: antihorario(limpar(xy).map(([x, y]) => [x, -y])), altura: z1 - z0, em: [0, 0, z0] });
const prismaY = (xz, y0, y1) => ({ eixo: 'y', perfil: antihorario(limpar(xz).map(([x, z]) => [x, z])), altura: y1 - y0, em: [0, y0, 0] });

const solido = (nome, material, ...prismas) => ({ tipo: prismas.length > 1 ? 'intersecao' : 'extrusao', nome, material, prismas });
const cubo = (nome, material, [x0, x1], [y0, y1], [z0, z1]) => ({
  tipo: 'cubo', nome, material, larg: x1 - x0, alt: y1 - y0, prof: z1 - z0, em: [(x0 + x1) / 2, y0, (z0 + z1) / 2],
});

/* Meio círculo poligonal de n lados por meia volta, da frente (ângulo 0) para trás (ângulo pi), em volta de (zc, yc). */
function semicirculo(zc, yc, R, n) {
  const v = [];
  for (let k = 0; k <= n; k += 1) {
    const a = (Math.PI * k) / n;
    v.push([r9(zc + R * Math.cos(a)), k === 0 || k === n ? yc : r9(yc + R * Math.sin(a))]);
  }
  return v;
}

/* Meio círculo poligonal cortado em y = yCorte só do lado da frente (ângulos de 0 a pi/2), com o pé de trás inteiro. */
function semicirculoCortadoNaFrente(zc, yc, R, n, yCorte) {
  const v = semicirculo(zc, yc, R, n);
  const saida = [];
  for (let i = 0; i < n; i += 1) {
    const a = v[i]; const b = v[i + 1];
    if (i < n / 2) {
      if (i === 0 && a[1] >= yCorte) saida.push(a);
      if (a[1] < yCorte && b[1] >= yCorte) saida.push([r9(a[0] + ((yCorte - a[1]) * (b[0] - a[0])) / (b[1] - a[1])), yCorte]);
      if (b[1] >= yCorte) saida.push(b);
    } else saida.push(b);
  }
  return saida;
}

/* A parte do meio círculo poligonal que fica em y >= yCorte, da frente para trás, com os pontos de corte nas cordas. */
function arcoAcima(zc, yc, R, n, yCorte = yc) {
  const v = semicirculo(zc, yc, R, n);
  const saida = [];
  const corte = ([z0, y0], [z1, y1]) => [r9(z0 + ((yCorte - y0) * (z1 - z0)) / (y1 - y0)), yCorte];
  if (v[0][1] >= yCorte) saida.push(v[0]);
  for (let i = 0; i + 1 < v.length; i += 1) {
    const a = v[i]; const b = v[i + 1];
    if (a[1] < yCorte && b[1] >= yCorte) saida.push(corte(a, b));
    if (b[1] >= yCorte) saida.push(b);
    if (a[1] >= yCorte && b[1] < yCorte) saida.push(corte(a, b));
  }
  return saida;
}

/* Normal externa, unitária, de uma reta que sobe para a frente: a da seção (z, y) ou a do plano lateral (x, y). */
const normalDe = ([a0, b0], [a1, b1]) => {
  const da = a1 - a0; const db = b1 - b0; const L = Math.hypot(da, db);
  return [Math.abs(db) / L, (da < 0 ? Math.abs(da) : -Math.abs(da)) / L];
};

/* Ponto sobre a reta que passa por p0 e p1, na altura y (em v). */
const sobreReta = ([a0, b0], [a1, b1], y) => [a0 + ((y - b0) * (a1 - a0)) / (b1 - b0), y];

/* Formas em milímetro. Cada uma tem `nome`, `tipo` (cubo, extrusao, intersecao ou lathe), `material` e as medidas dela. Todo número
 * aqui sai da tabela. */
export function derivar(T) {
  const W = T.meia_largura;
  const Ro = T.roda_raio;
  const yEixo = Ro;
  const R1 = T.arco_raio;
  const R2 = T.anel_raio;
  const zF = T.roda_z_frente;
  const zT = T.roda_z_tras;
  const N = T.passos_arco;
  const C = T.cab_meia_largura;
  const LX = W + 100;
  const ZZ = 3000;
  const zPortaFundo = T.bau_z_tras + T.quadro_profundidade;
  const yPortaTopo = T.porta_y0 + T.porta_dentes * T.porta_dente;
  /* alturas além da cabine, a uma altura dela acima e abaixo: nelas a reta inclinada da lateral e a do para-brisa passam por números
     exatos em milímetro, o que faz a face das placas coincidir com a da cabine dentro da tolerância de contato (1e-9 m) */
  const passo = T.cab_topo_y - T.capo_topo_y;
  const Y_LONGE_BAIXO = T.capo_topo_y - passo;
  const Y_LONGE_CIMA = T.cab_topo_y + passo;
  const formas = [];

  /* chassi: o trilho do meio e os para-choques, com as quinas da planta fechadas até a ponta */
  formas.push(cubo('chassiMeio', 'chassi', [-W, W], [T.trilho_base_y, T.trilho_topo_y], [zT + R1, zF - R1]));
  const plantaBarra = (s, z0) => [
    [-W, z0], [W, z0], [W, s * T.para_choque_lado_z], [T.para_choque_chanfro_x, s * T.para_choque_chanfro_z],
    [T.para_choque_ponta_x, s * T.para_choque_ponta_z], [-T.para_choque_ponta_x, s * T.para_choque_ponta_z],
    [-T.para_choque_chanfro_x, s * T.para_choque_chanfro_z], [-W, s * T.para_choque_lado_z],
  ];
  formas.push(solido('paraChoqueFrente', 'paraChoque', prismaY(plantaBarra(1, zF + R1), T.trilho_base_y, T.para_choque_y1)));
  formas.push(solido('paraChoqueTras', 'paraChoque', prismaY(plantaBarra(-1, zT - R2), T.para_choque_tras_y0, T.para_choque_y1)));
  const octogono = (y0, y1) => {
    const a = T.placa_meia_larg; const c = T.placa_chanfro;
    return [[-(a - c), y0], [a - c, y0], [a, y0 + c], [a, y1 - c], [a - c, y1], [-(a - c), y1], [-a, y1 - c], [-a, y0 + c]];
  };
  formas.push(solido('placaFrente', 'placa', prismaZ(octogono(T.placa_frente_y0, T.placa_frente_y1), T.para_choque_ponta_z, T.placa_z1)));
  formas.push(solido('placaTras', 'placa', prismaZ(octogono(T.placa_tras_y0, T.placa_tras_y1), -T.placa_z1, -T.para_choque_ponta_z)));

  /* saia da cabine em dois blocos, antes e depois da roda da frente; o da frente tem a quina de baixo chanfrada em z e em x */
  formas.push(cubo('saiaCabineTras', 'saia', [-C, C], [T.saia_y0, T.capo_base_y], [T.cab_z_tras, zF - R1]));
  formas.push(solido('saiaCabineFrente', 'saia',
    prismaX([[zF + R1, T.para_choque_y1], [T.saia_chanfro_z, T.para_choque_y1], [T.nariz_z, T.capo_base_y], [zF + R1, T.capo_base_y]], -LX, LX),
    prismaZ([[-T.saia_chanfro_x, T.para_choque_y1], [T.saia_chanfro_x, T.para_choque_y1], [C, T.capo_base_y], [-C, T.capo_base_y]], -ZZ, ZZ)));

  /* capô lavanda por cima, com o arco da roda da frente no perfil e a frente com o nariz chanfrado */
  const arcoCapo = arcoAcima(zF, yEixo, R1, N, T.capo_base_y);
  formas.push(solido('capo', 'lavanda', prismaX([
    [T.cab_z_tras, T.capo_base_y], ...[...arcoCapo].reverse(), [T.nariz_z, T.capo_base_y], [T.nariz_z, T.nariz_y],
    [T.nariz_chanfro_z, T.nariz_chanfro_y], [T.capo_fim_z, T.capo_topo_y], [T.cab_z_tras, T.capo_topo_y],
  ], -C, C)));

  /* caixas de roda: o vão da frente (retângulo da saia mais o arco do capô) e o de trás (meio círculo do baú), entre as faces de
     dentro dos pneus */
  const xi = T.roda_x_dentro;
  formas.push(solido('caixaRodaFrente', 'caixaRoda', prismaX([
    [zF - R1, yEixo], [zF + R1, yEixo], [zF + R1, T.capo_base_y], ...arcoCapo, [zF - R1, T.capo_base_y],
  ], -xi, xi)));
  const arcoBau = semicirculo(zT, yEixo, R2, N);
  formas.push(solido('caixaRodaTras', 'caixaRoda', prismaX(arcoBau, -xi, xi)));

  /* cabine: perfil lateral com seção frontal que afunila de 971 a 794 de meia largura */
  const larguraEm = (y) => sobreReta([C, T.capo_topo_y], [T.cab_meia_largura_topo, T.cab_topo_y], y)[0];
  const lateralCabine = [[T.cab_z_tras, T.capo_topo_y], [T.capo_fim_z, T.capo_topo_y], [T.cab_z_frente_topo, T.cab_topo_y], [T.cab_z_tras, T.cab_topo_y]];
  const frontalCabine = (y0, y1) => [[-larguraEm(y0), y0], [larguraEm(y0), y0], [larguraEm(y1), y1], [-larguraEm(y1), y1]];
  formas.push(solido('cabine', 'cabine', prismaX(lateralCabine, -LX, LX), prismaZ(frontalCabine(Y_LONGE_BAIXO, Y_LONGE_CIMA), -ZZ, ZZ)));

  /* bloco claro do teto da cabine, com a frente chanfrada */
  formas.push(solido('tetoCabine', 'tetoClaro', prismaX([
    [T.cab_z_tras, T.cab_topo_y], [T.teto_cab_z1, T.cab_topo_y], [T.teto_cab_z1, T.teto_cab_chanfro_y0],
    [T.teto_cab_chanfro_z, T.teto_cab_topo_y], [T.cab_z_tras, T.teto_cab_topo_y],
  ], -T.teto_cab_meia_largura, T.teto_cab_meia_largura)));

  /* para-brisa: placa de 12 mm sobre a face inclinada da frente da cabine, com o contorno em trapézio (791 embaixo, 648 em cima) */
  const pA = [T.capo_fim_z, T.capo_topo_y];
  const pB = [T.cab_z_frente_topo, T.cab_topo_y];
  const nP = normalDe(pA, pB);
  const esp = T.vidro_espessura;
  const lamina = (y0, y1) => {
    const a = sobreReta(pA, pB, y0); const b = sobreReta(pA, pB, y1);
    return [a, b, [b[0] + esp * nP[0], b[1] + esp * nP[1]], [a[0] + esp * nP[0], a[1] + esp * nP[1]]];
  };
  const halfPB = (y) => T.parabrisa_meia_base + ((y - T.capo_topo_y) * (T.parabrisa_meia_topo - T.parabrisa_meia_base)) / (T.parabrisa_y_topo - T.capo_topo_y);
  const trapezioPB = [[-halfPB(T.capo_topo_y), T.capo_topo_y], [halfPB(T.capo_topo_y), T.capo_topo_y], [halfPB(T.parabrisa_y_topo), T.parabrisa_y_topo], [-halfPB(T.parabrisa_y_topo), T.parabrisa_y_topo]];
  formas.push(solido('parabrisa', 'vidro', prismaX(lamina(Y_LONGE_BAIXO, Y_LONGE_CIMA), -LX, LX), prismaZ(trapezioPB, -ZZ, ZZ)));

  /* vidros laterais da cabine: tira de 12 mm sobre a lateral inclinada, recortada pelo contorno do vidro e pelo retrovisor */
  const nL = normalDe([C, T.capo_topo_y], [T.cab_meia_largura_topo, T.cab_topo_y]);
  const tiraLado = (s) => {
    const a = [larguraEm(Y_LONGE_BAIXO), Y_LONGE_BAIXO]; const b = [larguraEm(Y_LONGE_CIMA), Y_LONGE_CIMA];
    return [[s * a[0], a[1]], [s * b[0], b[1]], [s * (b[0] + esp * nL[0]), b[1] + esp * nL[1]], [s * (a[0] + esp * nL[0]), a[1] + esp * nL[1]]];
  };
  const contornoVidroLado = [
    [T.cab_z_tras, T.capo_topo_y], [T.retrovisor_z0, T.capo_topo_y], [T.retrovisor_z0, T.retrovisor_y1], [T.retrovisor_z1, T.retrovisor_y1],
    [T.retrovisor_z1, T.capo_topo_y], [T.vidro_lado_z_frente_base, T.capo_topo_y], [T.vidro_lado_z_frente_topo, T.vidro_lado_y_topo],
    [T.cab_z_tras, T.vidro_lado_y_topo],
  ];
  for (const s of [1, -1]) {
    formas.push(solido(`vidroCabine${s > 0 ? 'Dir' : 'Esq'}`, 'vidro', prismaX(contornoVidroLado, -LX, LX), prismaZ(tiraLado(s), -ZZ, ZZ)));
  }

  /* retrovisores */
  for (const s of [1, -1]) {
    formas.push(solido(`retrovisor${s > 0 ? 'Dir' : 'Esq'}`, 'claro', prismaZ([
      [s * C, T.retrovisor_y0], [s * T.retrovisor_x1, T.retrovisor_y0], [s * T.retrovisor_x1, T.retrovisor_y1],
      [s * larguraEm(T.retrovisor_y1), T.retrovisor_y1], [s * C, T.capo_topo_y],
    ], T.retrovisor_z0, T.retrovisor_z1)));
  }

  /* baú: perfil lateral com o arco da roda de trás e o degrau de trás, seção frontal de cantos de cima chanfrados; termina no plano
     da porta, em z -2603, e o quadro da traseira o completa até z -2780 */
  const secaoBau = [[-W, T.trilho_topo_y], [W, T.trilho_topo_y], [W, T.bau_ombro_y], [W - T.bau_chanfro_x, T.bau_topo_y],
    [-(W - T.bau_chanfro_x), T.bau_topo_y], [-W, T.bau_ombro_y]];
  formas.push(solido('bauCorpo', 'bau', prismaX([
    [T.bau_z_frente, T.trilho_topo_y], ...arcoBau, [zT - R2, T.bau_degrau_tras_y], [zPortaFundo, T.bau_degrau_tras_y],
    [zPortaFundo, T.bau_topo_y], [T.bau_z_frente, T.bau_topo_y],
  ], -LX, LX), prismaZ(secaoBau, -ZZ, ZZ)));

  /* escotilha do teto: tronco de pirâmide, interseção de um trapézio em z e de um trapézio em x */
  formas.push(solido('escotilha', 'bau',
    prismaZ([[-T.escotilha_meia_base, T.bau_topo_y], [T.escotilha_meia_base, T.bau_topo_y], [T.escotilha_meia_topo, T.escotilha_topo_y], [-T.escotilha_meia_topo, T.escotilha_topo_y]], -ZZ, ZZ),
    prismaX([[T.escotilha_z0, T.bau_topo_y], [T.escotilha_z1, T.bau_topo_y], [T.escotilha_topo_z1, T.escotilha_topo_y], [T.escotilha_topo_z0, T.escotilha_topo_y]], -LX, LX)));

  /* quadro da traseira: arco de pilares e viga em volta do vão da porta, com os mesmos cantos chanfrados do baú */
  const P = T.porta_meia_largura;
  formas.push(solido('quadroTras', 'bau', prismaZ([
    [-W, T.porta_y0], [-P, T.porta_y0], [-P, yPortaTopo], [P, yPortaTopo], [P, T.porta_y0], [W, T.porta_y0], [W, T.bau_ombro_y],
    [W - T.bau_chanfro_x, T.bau_topo_y], [-(W - T.bau_chanfro_x), T.bau_topo_y], [-W, T.bau_ombro_y],
  ], T.bau_z_tras, zPortaFundo)));
  formas.push(cubo('soleiraTras', 'bau', [-T.soleira_meia_largura, T.soleira_meia_largura], [T.luz_y0, T.porta_y0], [T.bau_z_tras, zPortaFundo]));
  for (const s of [1, -1]) {
    const xs = [s * T.soleira_meia_largura, s * W].sort((a, b) => a - b);
    formas.push(cubo(`luzTras${s > 0 ? 'Dir' : 'Esq'}`, 'lanterna', xs, [T.luz_y0, T.porta_y0], [T.bau_z_tras, zPortaFundo]));
  }

  /* porta de enrolar: fatia em dentes de serra, de fundo plano no plano do vão, com os vales recuados 30 mm do fundo e os picos para trás */
  const zVale = zPortaFundo - T.porta_vale_recuo;
  const dentes = [[zPortaFundo, T.porta_y0], [zVale, T.porta_y0]];
  for (let k = 0; k < T.porta_dentes; k += 1) {
    const y0 = T.porta_y0 + k * T.porta_dente;
    dentes.push([T.porta_pico_z, y0 + T.porta_dente / 2], [zVale + (k % 2 === 0 ? T.porta_vale_desvio : 0), y0 + T.porta_dente]);
  }
  dentes.push([zPortaFundo, yPortaTopo]);
  formas.push(solido('portaTras', 'porta', prismaX(dentes, -P, P)));

  /* para-lamas: meia coroa de 545 a 690 mm de raio, de x 971 a 1147; na frente fica ao lado do capô, com o pé da frente sobre a barra
     do para-choque (y 706), atrás dentro do arco do baú */
  const coroa = (zc, yFrente) => [...semicirculoCortadoNaFrente(zc, yEixo, R2, N, yFrente), ...semicirculoCortadoNaFrente(zc, yEixo, R1, N, yFrente).reverse()];
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    const [x0, x1] = s > 0 ? [C, W] : [-W, -C];
    formas.push(solido(`paraLamaFrente${lado}`, 'paraLama', prismaX(coroa(zF, T.para_choque_y1), x0, x1)));
    formas.push(solido(`paraLamaTras${lado}`, 'paraLama', prismaX(coroa(zT, yEixo), x0, x1)));
  }

  /* faróis sobre a face da frente do capô e o chanfro do nariz: cada farol cobre a face vertical e o chanfro */
  const ep = T.farol_espessura;
  const zN = T.nariz_z;
  const nFarol = normalDe([zN, T.nariz_y], [T.nariz_chanfro_z, T.nariz_chanfro_y]);
  const A = [zN, T.farol_y0]; const B = [zN, T.nariz_y]; const Q = [T.nariz_chanfro_z, T.nariz_chanfro_y];
  const nAB = [1, 0];
  const miter = (n1, n2) => { const k = 1 + n1[0] * n2[0] + n1[1] * n2[1]; return [(n1[0] + n2[0]) / k, (n1[1] + n2[1]) / k]; };
  const mB = miter(nAB, nFarol);
  const contornoFarol = [A, B, Q, [Q[0] + ep * nFarol[0], Q[1] + ep * nFarol[1]], [B[0] + ep * mB[0], B[1] + ep * mB[1]], [A[0] + ep * nAB[0], A[1] + ep * nAB[1]]];
  for (const s of [1, -1]) {
    const [x0, x1] = s > 0 ? [T.farol_x0, C] : [-C, -T.farol_x0];
    formas.push(solido(`farol${s > 0 ? 'Dir' : 'Esq'}`, 'amarelo', prismaX(contornoFarol, x0, x1)));
  }

  /* rodas: pneu com chanfro e furo para o cubo, e cubo com o recesso e o pino do centro, revoluções em torno de x */
  const L = T.roda_x_fora - T.roda_x_dentro;
  const cl = T.pneu_chanfro_largura;
  const pneu = [[T.pneu_furo_raio, 0], [T.pneu_chanfro_raio, 0], [Ro, cl], [Ro, L - cl], [T.pneu_chanfro_raio, L], [T.pneu_furo_raio, L]];
  const a0 = L - T.cubo_profundidade;
  const aRec = L - T.cubo_recesso_profundidade;
  const cuboDir = [[0, a0], [T.pneu_furo_raio, a0], [T.pneu_furo_raio, L], [T.cubo_recesso_raio, L],
    [T.cubo_recesso_fundo_raio, aRec], [T.cubo_pino_fundo_raio, aRec], [T.cubo_pino_topo_raio, L], [0, L]];
  const cuboEsq = cuboDir.map(([r, a]) => [r, L - a]);
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    for (const [ponta, zc] of [['Frente', zF], ['Tras', zT]]) {
      const xp = s > 0 ? T.roda_x_dentro : -T.roda_x_fora;
      formas.push({ tipo: 'lathe', nome: `roda${ponta}${lado}`, material: 'pneu', secao: true, perfil: pneu, lados: T.lados, em: [xp, yEixo, zc] });
      formas.push({ tipo: 'lathe', nome: `cubo${ponta}${lado}`, material: 'cubo', secao: false, perfil: s > 0 ? cuboDir : cuboEsq, lados: T.lados, em: [xp, yEixo, zc] });
    }
  }

  return formas;
}

/* Passo de um prisma: o `origemId` dado, perfil em metro. */
function passoDoPrisma(p, id) {
  return ['extrusao', { origemId: id, eixo: p.eixo, altura: m(p.altura), perfil: p.perfil.map(([u, v]) => [m(u), m(v)]), em: p.em.map((v) => m(v)) }];
}

/* Os ids de bloco: a forma `k` leva 100 * (k + 1); os prismas dela levam os ids seguintes e a interseção leva o 50º. */
function blocos(T) {
  return derivar(T).map((f, k) => ({ f, base: 100 * (k + 1) }));
}

/** Os PASSOS: cada forma e, logo depois, a `parte` com o `material`. */
export function gerarPassos(T) {
  const passos = [];
  blocos(T).forEach(({ f, base }) => {
    let sel;
    if (f.tipo === 'cubo') {
      passos.push(['cubo', { origemId: base, larg: m(f.larg), alt: m(f.alt), prof: m(f.prof), em: f.em.map((v) => m(v)) }]);
      sel = { origem: { op: 'cubo', id: base } };
    } else if (f.tipo === 'lathe') {
      /* um perfil que não toca o eixo (o pneu, com o furo do cubo) só fecha como seção: `furos: []` liga esse modo */
      passos.push(['lathe', {
        origemId: base, eixo: 'x', perfil: f.perfil.map(([u, v]) => [m(u), m(v)]), ...(f.secao ? { furos: [] } : {}), lados: f.lados, em: f.em.map((v) => m(v)),
      }]);
      sel = { origem: { op: 'lathe', id: base } };
    } else if (f.tipo === 'extrusao') {
      passos.push(passoDoPrisma(f.prismas[0], base));
      sel = { origem: { op: 'extrusao', id: base } };
    } else {
      f.prismas.forEach((p, i) => passos.push(passoDoPrisma(p, base + 1 + i)));
      passos.push(['intersectar', { origemId: base + 50, solidos: f.prismas.map((_, i) => ({ origem: { op: 'extrusao', id: base + 1 + i } })) }]);
      sel = { origem: { op: 'intersectar', id: base + 50 } };
    }
    passos.push(['parte', { nome: f.nome, sel }]);
    passos.push(['material', { sel, usa: f.material }]);
    if (f.tipo === 'lathe') passos.push(['liso', { angulo: 30, sel }]);
  });
  return passos;
}

const DE = ['Dir', 'Esq'];
const c = (a, b, motivo) => ({ par: [a, b], motivo });

/* Os contatos, declarados antes de medir: cada par se toca pela face ou pela aresta que o motivo diz. As medidas são as da TABELA. */
function contatosDeclarados() {
  const lista = [
    c('chassiMeio', 'saiaCabineTras', 'a face de cima do trilho do meio, em y 530, sustenta o bloco da saia atrás da roda da frente'),
    c('chassiMeio', 'bauCorpo', 'a face de cima do trilho do meio, em y 530, sustenta o fundo do baú entre as rodas'),
    c('chassiMeio', 'caixaRodaTras', 'a face de cima do trilho do meio, em y 530, sustenta a ponta da frente da caixa da roda de trás'),
    c('chassiMeio', 'caixaRodaFrente', 'a aresta de cima da ponta de trás do trilho, em z 1282 e y 530, toca a aresta de baixo da face de trás da caixa da roda'),
    c('paraChoqueFrente', 'saiaCabineFrente', 'a face de cima da barra do para-choque, em y 706, sustenta a saia da cabine na frente da roda'),
    c('paraChoqueFrente', 'caixaRodaFrente', 'a face de trás da barra do para-choque, em z 2372, encosta na ponta da frente da caixa da roda'),
    c('paraChoqueFrente', 'placaFrente', 'a face da frente do para-choque, em z 2780, encosta na placa da frente'),
    c('paraChoqueTras', 'bauCorpo', 'a face de cima da barra de trás, em y 706, assenta sob o degrau de trás do baú'),
    c('paraChoqueTras', 'placaTras', 'a face de trás do para-choque, em z -2780, encosta na placa de trás'),
    c('paraChoqueTras', 'caixaRodaTras', 'a aresta de baixo da ponta de trás da caixa da roda, em z -1722 e y 530, toca a face da frente da barra de trás'),
    c('paraChoqueTras', 'soleiraTras', 'a face de cima da barra de trás, em y 706, sustenta a soleira do vão da porta'),
    c('saiaCabineFrente', 'capo', 'a face de cima da saia, em y 882, assenta sob o capô, de z 2372 a 2692'),
    c('saiaCabineFrente', 'caixaRodaFrente', 'a face de trás do bloco da saia, em z 2372, encosta na ponta da frente da caixa da roda'),
    c('saiaCabineTras', 'capo', 'a face de cima da saia, em y 882, assenta sob o capô'),
    c('saiaCabineTras', 'caixaRodaFrente', 'a face da frente do bloco da saia, em z 1282, encosta na ponta de trás da caixa da roda'),
    c('saiaCabineTras', 'bauCorpo', 'a face de trás da saia, em z 833, encosta na face da frente do baú'),
    c('capo', 'caixaRodaFrente', 'o arco do capô e o arco da caixa da roda saem dos mesmos pontos do círculo de 545 mm'),
    c('capo', 'bauCorpo', 'a face de trás do capô, em z 833, encosta na face da frente do baú, de y 882 a 1412'),
    c('capo', 'cabine', 'a face de baixo da cabine, em y 1412, assenta no tampo do capô, de z 833 a 1986'),
    c('capo', 'parabrisa', 'a aresta de baixo do para-brisa, em y 1412, toca o canto em que a face inclinada da cabine sai do tampo do capô'),
    c('cabine', 'bauCorpo', 'a face de trás da cabine, em z 833, encosta na face da frente do baú, de y 1412 a 2294'),
    c('cabine', 'parabrisa', 'a face de trás do para-brisa encosta na face inclinada da frente da cabine'),
    c('cabine', 'tetoCabine', 'a face de cima da cabine, em y 2294, sustenta o bloco claro do teto'),
    c('tetoCabine', 'bauCorpo', 'a face de trás do bloco do teto, em z 833, encosta na face da frente do baú, de y 2294 a 2471'),
    c('bauCorpo', 'escotilha', 'a face de cima do baú, em y 2824, sustenta a escotilha do teto'),
    c('bauCorpo', 'quadroTras', 'a face de trás do corpo do baú, em z -2603, encosta no quadro da traseira'),
    c('bauCorpo', 'soleiraTras', 'a face de trás do corpo do baú, em z -2603, encosta na soleira, de y 706 a 882'),
    c('bauCorpo', 'portaTras', 'a face de trás do corpo do baú, em z -2603, encosta no fundo plano da porta de enrolar'),
    c('bauCorpo', 'caixaRodaTras', 'o arco do fundo do baú e a caixa da roda de trás saem dos mesmos pontos do círculo de 690 mm'),
    c('quadroTras', 'portaTras', 'as faces de dentro dos pilares, em x 971, e a de baixo da viga, em y 2646, encostam na porta de enrolar'),
    c('placaTras', 'soleiraTras', 'a face de trás da soleira, em z -2780, encosta na placa de trás, de y 706 a 750'),
    c('soleiraTras', 'portaTras', 'a face de cima da soleira, em y 882, sustenta a ponta de baixo da porta de enrolar'),
  ];
  const sem = lista;
  for (const lado of DE) {
    sem.push(c('cabine', `vidroCabine${lado}`, `o vidro lateral ${lado === 'Dir' ? 'direito' : 'esquerdo'} encosta na lateral inclinada da cabine, sem folga`));
    sem.push(c('cabine', `retrovisor${lado}`, 'a face de dentro do retrovisor encosta na lateral inclinada da cabine, de y 1412 a 1588'));
    sem.push(c('bauCorpo', `vidroCabine${lado}`, 'a face de trás do vidro lateral, em z 833, encosta na face da frente do baú'));
    sem.push(c('capo', `vidroCabine${lado}`, 'a aresta de baixo do vidro lateral, em y 1412, toca a aresta de fora do tampo do capô, em x 971'));
    sem.push(c('capo', `retrovisor${lado}`, 'a face de dentro do retrovisor encosta na lateral do capô, em x 971, de y 1236 a 1412'));
    sem.push(c(`vidroCabine${lado}`, `retrovisor${lado}`, 'o recorte do vidro lateral abraça o retrovisor, nos planos z 1408 e 1585'));
    sem.push(c('capo', `farol${lado}`, 'a face de trás do farol encosta na face da frente e no chanfro do nariz do capô'));
    sem.push(c('capo', `paraLamaFrente${lado}`, 'a face de dentro do para-lama encosta na lateral do capô, em x 971'));
    sem.push(c('saiaCabineTras', `paraLamaFrente${lado}`, 'a face de dentro do para-lama encosta na lateral do bloco da saia, em x 971'));
    sem.push(c('saiaCabineFrente', `paraLamaFrente${lado}`, 'a aresta de cima da lateral chanfrada da saia, em x 971 e y 882, toca a face de dentro do para-lama'));
    sem.push(c('chassiMeio', `paraLamaFrente${lado}`, 'o pé de trás do para-lama da frente assenta na face de cima do trilho do meio, em y 530'));
    sem.push(c('paraChoqueFrente', `paraLamaFrente${lado}`, 'o pé da frente do para-lama assenta na face de cima da barra do para-choque, em y 706'));
    sem.push(c('chassiMeio', `paraLamaTras${lado}`, 'o pé da frente do para-lama de trás assenta na face de cima do trilho do meio, em y 530'));
    sem.push(c('paraChoqueTras', `paraLamaTras${lado}`, 'a aresta do pé de trás do para-lama, em z -1722 e y 530, toca a face da frente da barra de trás'));
    sem.push(c('bauCorpo', `paraLamaTras${lado}`, 'a face de fora do para-lama de trás encosta no arco de 690 mm do fundo do baú, de x 971 a 1147'));
    sem.push(c('quadroTras', `luzTras${lado}`, 'a face de baixo do pilar, em y 882, assenta sobre a lanterna'));
    sem.push(c('soleiraTras', `luzTras${lado}`, 'a lateral da soleira, em x 794, encosta na lanterna'));
    sem.push(c('bauCorpo', `luzTras${lado}`, 'a face de trás do corpo do baú, em z -2603, encosta na lanterna, de y 706 a 882'));
    sem.push(c(`luzTras${lado}`, 'portaTras', 'a face de cima da lanterna, em y 882, toca a face de baixo da ponta da porta de enrolar, de x 794 a 971'));
    sem.push(c('paraChoqueTras', `luzTras${lado}`, 'a face de cima da barra de trás, em y 706, sustenta a lanterna'));
    for (const ponta of ['Frente', 'Tras']) {
      sem.push(c(`roda${ponta}${lado}`, `caixaRoda${ponta}`, 'a face de dentro do pneu, em x 530, encosta na face de fora da caixa da roda'));
      sem.push(c(`cubo${ponta}${lado}`, `roda${ponta}${lado}`, 'o cubo enche o furo de 272 mm de raio na face de fora do pneu e encosta na parede do furo'));
    }
  }
  return sem;
}
export const CONTATOS = contatosDeclarados();

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha: cada um é um canto da caixa da parte. */
export function pontosDeclarados(T = TABELA) {
  const tol = 1;
  const yPortaTopo = T.porta_y0 + T.porta_dentes * T.porta_dente;
  return [
    { nome: 'canto de trás, embaixo, da placa de trás', parte: 'placaTras', medida: 'minimo', em: [-T.placa_meia_larg, T.placa_tras_y0, -T.placa_z1], toleranciaMm: tol },
    { nome: 'canto da frente, em cima, da placa da frente', parte: 'placaFrente', medida: 'maximo', em: [T.placa_meia_larg, T.placa_frente_y1, T.placa_z1], toleranciaMm: tol },
    { nome: 'topo da escotilha, no canto de trás', parte: 'escotilha', medida: 'maximo', em: [T.escotilha_meia_base, T.escotilha_topo_y, T.escotilha_z1], toleranciaMm: tol },
    { nome: 'teto da cabine, na frente', parte: 'cabine', medida: 'maximo', em: [T.cab_meia_largura, T.cab_topo_y, T.capo_fim_z], toleranciaMm: tol },
    { nome: 'topo do bloco claro do teto da cabine', parte: 'tetoCabine', medida: 'maximo', em: [T.teto_cab_meia_largura, T.teto_cab_topo_y, T.teto_cab_z1], toleranciaMm: tol },
    { nome: 'ponta do retrovisor direito', parte: 'retrovisorDir', medida: 'maximo', em: [T.retrovisor_x1, T.retrovisor_y1, T.retrovisor_z1], toleranciaMm: tol },
    { nome: 'quina de trás, embaixo, do corpo do baú', parte: 'bauCorpo', medida: 'minimo', em: [-T.meia_largura, T.trilho_topo_y, T.bau_z_tras + T.quadro_profundidade], toleranciaMm: tol },
    { nome: 'quina da frente, em cima, do corpo do baú', parte: 'bauCorpo', medida: 'maximo', em: [T.meia_largura, T.bau_topo_y, T.bau_z_frente], toleranciaMm: tol },
    { nome: 'quina de trás, embaixo, do quadro da traseira', parte: 'quadroTras', medida: 'minimo', em: [-T.meia_largura, T.porta_y0, T.bau_z_tras], toleranciaMm: tol },
    { nome: 'pico mais para trás da porta de enrolar', parte: 'portaTras', medida: 'minimo', em: [-T.porta_meia_largura, T.porta_y0, T.porta_pico_z], toleranciaMm: tol },
    { nome: 'topo da porta de enrolar', parte: 'portaTras', medida: 'maximo', em: [T.porta_meia_largura, yPortaTopo, T.bau_z_tras + T.quadro_profundidade], toleranciaMm: tol },
    { nome: 'ponta da frente, em cima, do para-choque da frente', parte: 'paraChoqueFrente', medida: 'maximo', em: [T.meia_largura, T.para_choque_y1, T.para_choque_ponta_z], toleranciaMm: tol },
    { nome: 'pneu de trás, à esquerda, embaixo', parte: 'rodaTrasEsq', medida: 'minimo', em: [-T.roda_x_fora, 0, T.roda_z_tras - T.roda_raio], toleranciaMm: tol },
    { nome: 'pneu da frente, à direita, na frente e em cima', parte: 'rodaFrenteDir', medida: 'maximo', em: [T.roda_x_fora, 2 * T.roda_raio, T.roda_z_frente + T.roda_raio], toleranciaMm: tol },
  ];
}

const receita = {
  meta: { nome: 'caminhao-entrega', desc: 'caminhão de entrega estilizado, de cabine lavanda curta e baú verde alto atrás, com porta de enrolar, chassi cinza, para-lamas em arco e rodas grandes, recriado do modelo delivery do pacote A, de autor A' },
  PARAMS: TABELA,
  MATERIAIS: {
    bau: { tipo: 'liso', cor: '#44a276', acabamento: 'pintado' },
    cabine: { tipo: 'liso', cor: '#dcdce9', acabamento: 'pintado' },
    lavanda: { tipo: 'liso', cor: '#d3d3e3', acabamento: 'pintado' },
    tetoClaro: { tipo: 'liso', cor: '#e6e6ef', acabamento: 'pintado' },
    vidro: { tipo: 'liso', cor: '#cde4f4', acabamento: 'pintado' },
    claro: { tipo: 'liso', cor: '#c4c7ce', acabamento: 'pintado' },
    placa: { tipo: 'liso', cor: '#d9d9e7', acabamento: 'pintado' },
    chassi: { tipo: 'liso', cor: '#454552', acabamento: 'pintado' },
    paraChoque: { tipo: 'liso', cor: '#5f6075', acabamento: 'pintado' },
    paraLama: { tipo: 'liso', cor: '#5f5f72', acabamento: 'pintado' },
    saia: { tipo: 'liso', cor: '#58586b', acabamento: 'pintado' },
    caixaRoda: { tipo: 'liso', cor: '#2c2d35', acabamento: 'pintado' },
    porta: { tipo: 'liso', cor: '#5d5d70', acabamento: 'pintado' },
    lanterna: { tipo: 'liso', cor: '#d3363d', acabamento: 'pintado' },
    amarelo: { tipo: 'liso', cor: '#f2c12e', acabamento: 'pintado' },
    pneu: { tipo: 'liso', cor: '#2c2c31', acabamento: 'pintado' },
    cubo: { tipo: 'metal', cor: '#9aa3b5', acabamento: 'escovado' },
  },
  TOPO: { origem: 'chão, no meio do caminhão em x e em z; y para cima e a frente do caminhão em +z' },
  PLANO: {
    objeto: 'caminhão de entrega de 5736 mm de comprimento, 2648 mm de largura com os espelhos e 2912 mm de altura, de cabine lavanda curta na frente, baú verde alto e mais largo atrás, chassi cinza e rodas grandes',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total do caminhão, de z -2868 a 2868, com as placas', milimetros: 5736 },
    familia: 'veiculo',
    partes: [
      { nome: 'chassiMeio', forma: 'trilho cinza escuro de 2294 mm de largura, de y 353 a 530, só entre os vãos das rodas, de z -487 a 1282', tecnica: 'cubo sob o fundo do baú e a saia da cabine' },
      { nome: 'paraChoqueFrente', forma: 'barra cinza de 2294 mm de largura, de y 353 a 706 e z 2372 a 2780, com as quinas da planta fechadas até 971 de meia largura', tecnica: 'extrusao com eixo y da planta de quinas fechadas, sob a saia da cabine' },
      { nome: 'paraChoqueTras', forma: 'barra cinza de 2294 mm de largura, de y 530 a 706 e z -2780 a -1722, com as quinas da planta fechadas até 971 de meia largura', tecnica: 'extrusao com eixo y da planta de quinas fechadas, sob o degrau de trás do baú' },
      { nome: 'placaFrente', forma: 'placa clara octogonal de 618 mm de largura e 309 de altura, de y 265 a 574, saindo do para-choque da frente até z 2868', tecnica: 'extrusao com eixo z de um octógono de cantos chanfrados' },
      { nome: 'placaTras', forma: 'placa clara octogonal de 618 mm de largura e 309 de altura, de y 441 a 750, saindo do para-choque de trás até z -2868', tecnica: 'extrusao com eixo z de um octógono de cantos chanfrados' },
      { nome: 'saiaCabineTras', forma: 'bloco escuro de 1942 mm de largura, de y 530 a 882, entre a face da frente do baú e a roda da frente', tecnica: 'cubo encostado na face da frente do baú' },
      { nome: 'saiaCabineFrente', forma: 'bloco escuro de 1942 mm de largura, de y 706 a 882, entre a roda da frente e o nariz em z 2692, com a quina de baixo chanfrada', tecnica: 'interseção do perfil lateral com a seção frontal trapezoidal' },
      { nome: 'capo', forma: 'capô lavanda de 1942 mm de largura, de y 882 ao topo, com nariz até z 2692 e chanfro em y 1236, capô quase plano até y 1412 e arco da roda da frente no perfil', tecnica: 'extrusao com eixo x de perfil lateral com arco de 545 mm recortado' },
      { nome: 'caixaRodaFrente', forma: 'vão escuro da roda da frente, de 1060 mm de largura entre as faces de dentro dos pneus, com o contorno do arco do capô', tecnica: 'extrusao com eixo x do contorno do arco, sem booleana' },
      { nome: 'caixaRodaTras', forma: 'vão escuro da roda de trás, de 1060 mm de largura entre as faces de dentro dos pneus, com o contorno do arco de 690 mm do baú', tecnica: 'extrusao com eixo x de um meio círculo' },
      { nome: 'cabine', forma: 'cabine lavanda de y 1412 a 2294, de 1942 mm de meia largura embaixo e 1588 mm em cima, com frente inclinada até z 1635', tecnica: 'interseção do perfil lateral com a seção frontal que afunila' },
      { nome: 'tetoCabine', forma: 'bloco claro de 1236 mm de largura sobre o teto da cabine, de z 833 a 1456 e y 2294 a 2471, com a frente chanfrada', tecnica: 'extrusao com eixo x do perfil lateral com chanfro' },
      { nome: 'parabrisa', forma: 'placa azul clara de 12 mm sobre a face inclinada da cabine, em trapézio de 1582 mm embaixo e 1296 em cima', tecnica: 'interseção de uma lâmina do perfil lateral com um trapézio frontal' },
      { nome: 'vidroCabineDir', forma: 'placa azul clara de 12 mm sobre a lateral inclinada direita da cabine, recortada em torno do retrovisor', tecnica: 'interseção de uma tira da seção frontal com o contorno lateral do vidro' },
      { nome: 'vidroCabineEsq', forma: 'placa azul clara de 12 mm sobre a lateral inclinada esquerda da cabine, recortada em torno do retrovisor', tecnica: 'interseção de uma tira da seção frontal com o contorno lateral do vidro' },
      { nome: 'retrovisorDir', forma: 'retrovisor claro direito, da lateral da cabine a x 1324, de y 1236 a 1588, de z 1408 a 1585', tecnica: 'extrusao com eixo z de um pentágono' },
      { nome: 'retrovisorEsq', forma: 'retrovisor claro esquerdo, da lateral da cabine a x -1324, de y 1236 a 1588, de z 1408 a 1585', tecnica: 'extrusao com eixo z de um pentágono' },
      { nome: 'bauCorpo', forma: 'baú verde de 2294 mm de largura, de y 530 a 2824, de z -2603 a 833, com o arco da roda de trás de 690 mm, degrau de trás em y 706 e cantos de cima chanfrados 88 mm', tecnica: 'interseção do perfil lateral com arco e da seção frontal de cantos chanfrados' },
      { nome: 'escotilha', forma: 'escotilha verde no teto do baú, tronco de pirâmide de y 2824 a 2912, de 706 por 706 mm na base e 636 por 635 em cima, de z -1815 a -1109', tecnica: 'interseção de um trapézio em z com um trapézio em x' },
      { nome: 'quadroTras', forma: 'quadro verde da traseira, de z -2780 a -2603, com dois pilares de 176 mm e a viga de y 2646 ao teto em volta do vão da porta', tecnica: 'extrusao com eixo z de um contorno em arco com os cantos de cima chanfrados' },
      { nome: 'soleiraTras', forma: 'soleira verde de 1588 mm de largura, de y 706 a 882 e z -2780 a -2603, sob o vão da porta', tecnica: 'cubo sobre o para-choque de trás' },
      { nome: 'luzTrasDir', forma: 'lanterna vermelha direita, de x 794 a 1147, de y 706 a 882 e z -2780 a -2603', tecnica: 'cubo ao lado da soleira' },
      { nome: 'luzTrasEsq', forma: 'lanterna vermelha esquerda, de x -1147 a -794, de y 706 a 882 e z -2780 a -2603', tecnica: 'cubo ao lado da soleira' },
      { nome: 'portaTras', forma: 'porta de enrolar escura de 1942 mm de largura, de y 882 a 2646, em quatro dentes de serra que saem até z -2734, recuada no vão do quadro', tecnica: 'extrusao com eixo x de um perfil lateral em dentes de serra' },
      ...['Frente', 'Tras'].flatMap((p) => DE.map((l) => ({
        nome: `paraLama${p}${l}`,
        forma: `meia coroa escura de 545 a 690 mm de raio em volta da roda ${p === 'Frente' ? 'da frente' : 'de trás'} ${l === 'Dir' ? 'à direita' : 'à esquerda'}, de x 971 a 1147`,
        tecnica: 'extrusao com eixo x de uma meia coroa de 24 lados por volta',
      }))),
      { nome: 'farolDir', forma: 'placa amarela direita de 12 mm sobre a face da frente e o chanfro do nariz, de x 485 a 971 e y 1059 a 1280', tecnica: 'extrusao com eixo x de um contorno em L' },
      { nome: 'farolEsq', forma: 'placa amarela esquerda de 12 mm sobre a face da frente e o chanfro do nariz, de x -971 a -485 e y 1059 a 1280', tecnica: 'extrusao com eixo x de um contorno em L' },
      ...['Frente', 'Tras'].flatMap((p) => DE.map((l) => ({
        nome: `roda${p}${l}`,
        forma: `pneu escuro de 1060 mm de diâmetro e 529 mm de largura, com chanfro e furo de 544 mm para o cubo, centro em y 530 e z ${p === 'Frente' ? '1827' : '-1032'}, ${l === 'Dir' ? 'à direita' : 'à esquerda'}`,
        tecnica: 'lathe em torno de x, com o chanfro e o furo no perfil',
      }))),
      ...['Frente', 'Tras'].flatMap((p) => DE.map((l) => ({
        nome: `cubo${p}${l}`,
        forma: `cubo cinza azulado de 544 mm de diâmetro e 176 mm de profundidade, embutido na face de fora do pneu ${p === 'Frente' ? 'da frente' : 'de trás'} ${l === 'Dir' ? 'à direita' : 'à esquerda'}, com recesso e pino no centro`,
        tecnica: 'lathe em torno de x, com o recesso e o pino no perfil',
      }))),
    ],
    criteriosDeReprovacao: [
      'a caixa total não fica em x -1324 a 1324, y 0 a 2912 e z -2868 a 2868, ou alguma roda não toca o chão',
      'um lado do caminhão difere do outro em medida ou posição de peça simétrica',
      'cabine e baú saem de um perfil só: o baú deve ser uma caixa mais larga (2294 mm) e mais alta que a cabine, com o degrau visível sobre ela e encostada na traseira dela',
      'a cabine não afunila para o teto, ou o para-brisa e os vidros não são placas azul claras encostadas na cabine',
      'o baú não tem a escotilha no teto, os cantos de cima chanfrados, a porta de enrolar recuada atrás e as lanternas vermelhas nos cantos de baixo',
      'o chassi cinza não é mais largo que a cabine, ou falta o para-choque com a placa clara na frente e atrás',
      'uma roda não tem pneu escuro com cubo cinza azulado, ou não aparece no arco recortado com a caixa de roda escura atrás e o para-lama em volta',
      'a silhueta lateral, frontal ou de cima difere da referência, vista na folha comparativa, em mais de dois por cento do comprimento',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;

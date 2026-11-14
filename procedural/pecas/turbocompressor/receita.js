/* turbocompressor — turbocompressor de carro de passeio de uma peça só, com seis partes: carcacaCompressor, rotorCompressor, miolo,
 * carcacaTurbina, linhas e abracadeira. O alvo está em `referencias/alvo.md`.
 *
 * REFERENCIAL. O eixo do rotor é a reta x = 0, y = eixo_y, em z; o chão é y = 0 (a voluta do compressor encosta nele embaixo). A boca do
 * compressor fica em z = 0 e a flange de saída da turbina em z = 200. A TABELA é em milímetro; `derivar` calcula posições, perfis e as
 * seções das volutas, e `gerarPassos` converte para metro com `m()`, o único lugar da conversão.
 *
 * AS VOLUTAS são `loft` de seções circulares ao longo de um caminho que começa em espiral (o raio do centro e o raio da seção crescem com
 * o ângulo) e continua num arco e num trecho reto até a flange de saída, tangente à espiral. Cada carcaça é a união desse loft com o
 * corpo de revolução central e a flange de saída. O rotor é um conjunto de pás extrudadas em z (planta curva), cortado por um envelope
 * de revolução que dá a silhueta de meridiano, unido ao cubo, à porca e ao eixo. Todos os corpos de revolução usam o mesmo número de
 * lados, de modo que as faces encostadas coincidem. */

export const TABELA = {
  lados: 48,
  eixo_y: 78,
  /* ao longo do eixo (z): o plano de cada encontro */
  z_boca: 0, z_compressor_fim: 66, z_miolo_fim: 128, z_turbina_fim: 200,
  /* carcaça do compressor: perfil de revolução oco (boca de 60 mm, rebordo, anel de abraçadeira, pescoço, corpo, flange traseira) */
  boca_raio: 30, rebordo_raio: 38, rebordo_z: 3, pescoco_raio: 34, anel_raio: 38, anel_z0: 7, anel_z1: 11, pescoco_externo: 34.5, pescoco_ate: 26,
  corpo_raio: 46, corpo_z0: 32, flange_raio: 50, flange_z0: 58, cavidade_raio: 37, cavidade_z0: 29, cavidade_z1: 60, boca_ate: 22, furo_traseiro: 6,
  /* voluta do compressor */
  vc_zc: 37, vc_r0: 50, vc_r1: 64, vc_a0: 8, vc_a1: 19, vc_th0: 40, vc_th1: 330, vc_amostras: 40,
  vc_rumo_final: 90, vc_raio_curva: 60, vc_a_saida: 16, vc_reta: 24, vc_arco_amostras: 6,
  vc_flange_raio: 24, vc_flange_espessura: 6, vc_flange_recuo: 1.5,
  /* rotor: cubo, pás cheias e intercaladas, envelope de meridiano, porca e eixo */
  rotor_z0: 10, rotor_z1: 48, rotor_pas: 6, pa_espessura: 1.6, pa_giro: 55, pa_r_cheia: 6, pa_r_curta: 17, pa_r_ponta: 40, pa_amostras: 12,
  envelope: [[27, 20], [33, 34], [33, 48]],
  cubo: [[8, 10], [9, 16], [13, 26], [20, 34], [27, 42], [31, 48]],
  porca_raio: 7, porca_z0: 4, porca_z1: 11, eixo_raio: 8, eixo_z0: 46,
  /* miolo */
  miolo_raio: 38, miolo_flange_raio: 50, miolo_flange_z: 8,
  oleo_z: 97, oleo_raio: 9, oleo_y0: 30, oleo_y1: 58, porca_oleo_raio: 12, porca_oleo_y0: 44, porca_oleo_y1: 52,
  retorno_pescoco_raio: 12, retorno_y0: 30, retorno_y1: 52, retorno_placa_y: 56, retorno_placa_x: 34, retorno_placa_z: 44, retorno_placa_e: 6,
  retorno_furo_raio: 4.5, retorno_furo_z: 16.5,
  agua_raio: 7, agua_x0: 30, agua_x1: 54, agua_rebarba_raio: 9, agua_rebarba_x0: 46, agua_rebarba_x1: 50, agua_z: [82, 112],
  /* voluta da turbina */
  vt_zc: 164, vt_r0: 40, vt_r1: 56, vt_a0: 8, vt_a1: 20, vt_th0: 230, vt_th1: 530, vt_amostras: 40,
  vt_rumo_final: 270, vt_raio_curva: 40, vt_a_saida: 19, vt_reta: 22, vt_arco_amostras: 4,
  vt_flange_x: 74, vt_flange_z: 56, vt_flange_e: 8, vt_flange_furo_raio: 5.5, vt_flange_furo_x: 28, vt_flange_furo_z: 20,
  turbina_corpo_raio: 46, turbina_flange_raio: 50, turbina_flange_z: 8, turbina_cavidade_z: 168,
  saida_raio: 28, saida_furo_raio: 22, saida_flange_raio: 38, saida_flange_z: 6, saida_cone_z: 178,
  /* linhas: tubo de óleo de 8 mm e tubo curto de cobre */
  oleo_tubo_raio: 4, oleo_sobe: 20, oleo_curva_raio: 20, oleo_corre: 44, oleo_amostras_arco: 8,
  cobre_raio: 3, cobre_sai: 14, cobre_curva_raio: 12, cobre_sobe: 20, cobre_amostras_arco: 6,
  /* abraçadeiras */
  abr_espessura: 5, abr_largura: 10,
  polo: 0.5, polo_contato: 0.05,
};

const m = (mm) => mm / 1000;
const rad = (g) => (g * Math.PI) / 180;

/* o caminho de uma voluta: espiral que cresce, arco que gira o rumo até o alvo e trecho reto; cada amostra é { p: [x, y, z], r } em mm */
function caminhoDeVoluta(T, c) {
  const { zc, r0, r1, a0, a1, th0, th1, amostras, rumoFinal, raioCurva, aSaida, reta, arcoAmostras } = c;
  const pts = [];
  for (let k = 0; k <= amostras; k += 1) {
    const f = k / amostras;
    const th = rad(th0 + (th1 - th0) * f);
    const R = r0 + (r1 - r0) * f;
    pts.push({ p: [R * Math.cos(th), T.eixo_y + R * Math.sin(th), zc], r: a0 + (a1 - a0) * f });
  }
  const rumo = th1 + 90;
  /* o giro do arco é a menor diferença entre o rumo da espiral no fim e o rumo alvo, módulo 360 */
  const giro = ((((rumoFinal - rumo) + 180) % 360) + 360) % 360 - 180;
  const passo = (raioCurva * rad(giro)) / arcoAmostras;
  let [x, y] = pts[pts.length - 1].p;
  for (let j = 1; j <= arcoAmostras; j += 1) {
    const meio = rad(rumo + (giro * (j - 0.5)) / arcoAmostras);
    x += passo * Math.cos(meio);
    y += passo * Math.sin(meio);
    pts.push({ p: [x, y, zc], r: a1 + (aSaida - a1) * (j / arcoAmostras) });
  }
  const dx = Math.cos(rad(rumoFinal));
  const dy = Math.sin(rad(rumoFinal));
  for (let j = 1; j <= 3; j += 1) pts.push({ p: [x + (dx * reta * j) / 3, y + (dy * reta * j) / 3, zc], r: aSaida });
  return { pts, fim: pts[pts.length - 1].p };
}

/* um tubo: trecho reto, arco de 90 graus entre duas direções e trecho reto; devolve os pontos do eixo do tubo */
function caminhoDeTubo(inicio, dirIni, dirFim, retoIni, raioCurva, retoFim, amostrasArco) {
  const pts = [inicio.slice()];
  let p = inicio.slice();
  const avanca = (dir, d) => {
    const n = Math.hypot(...dir);
    p = p.map((v, k) => v + (dir[k] / n) * d);
    pts.push(p.slice());
  };
  avanca(dirIni, retoIni);
  const corda = (raioCurva * (Math.PI / 2)) / amostrasArco;
  for (let j = 0; j < amostrasArco; j += 1) {
    const ang = (Math.PI / 2) * ((j + 0.5) / amostrasArco);
    avanca(dirIni.map((v, k) => v * Math.cos(ang) + dirFim[k] * Math.sin(ang)), corda);
  }
  avanca(dirFim, retoFim);
  return pts;
}

/* a planta de uma pá: faixa curva de espessura constante; o centro recua `pa_giro` graus de pa_r_cheia a pa_r_ponta */
function plantaDaPa(T, theta0, rIni) {
  const lado1 = [];
  const lado2 = [];
  for (let k = 0; k <= T.pa_amostras; k += 1) {
    const r = rIni + ((T.pa_r_ponta - rIni) * k) / T.pa_amostras;
    const th = rad(theta0 - (T.pa_giro * (r - T.pa_r_cheia)) / (T.pa_r_ponta - T.pa_r_cheia));
    const d = Math.asin(T.pa_espessura / 2 / r);
    lado1.push([r * Math.cos(th - d), r * Math.sin(th - d)]);
    lado2.push([r * Math.cos(th + d), r * Math.sin(th + d)]);
  }
  /* anti-horário: sai pelo lado de menor ângulo e volta pelo de maior */
  return [...lado1, ...lado2.reverse()];
}

export function derivar(T = TABELA) {
  const Y = T.eixo_y;

  /* carcaça do compressor: perfil [raio, z] fechado, anti-horário, com a boca como furo e a cavidade do rotor por dentro */
  const carcacaCompressor = [
    [T.boca_raio, T.z_boca], [T.rebordo_raio, T.z_boca], [T.rebordo_raio, T.rebordo_z], [T.pescoco_raio, T.rebordo_z],
    [T.pescoco_raio, T.anel_z0], [T.anel_raio, T.anel_z0], [T.anel_raio, T.anel_z1], [T.pescoco_externo, T.anel_z1],
    [T.pescoco_externo, T.pescoco_ate], [T.corpo_raio, T.corpo_z0], [T.corpo_raio, T.flange_z0], [T.flange_raio, T.flange_z0],
    [T.flange_raio, T.z_compressor_fim], [T.furo_traseiro, T.z_compressor_fim], [T.furo_traseiro, T.cavidade_z1], [T.cavidade_raio, T.cavidade_z1],
    [T.cavidade_raio, T.cavidade_z0], [T.boca_raio, T.boca_ate], [T.boca_raio, T.z_boca],
  ];
  const voluta = caminhoDeVoluta(T, {
    zc: T.vc_zc, r0: T.vc_r0, r1: T.vc_r1, a0: T.vc_a0, a1: T.vc_a1, th0: T.vc_th0, th1: T.vc_th1, amostras: T.vc_amostras,
    rumoFinal: T.vc_rumo_final, raioCurva: T.vc_raio_curva, aSaida: T.vc_a_saida, reta: T.vc_reta, arcoAmostras: T.vc_arco_amostras,
  });
  const flangeSaida = {
    x: voluta.fim[0], y: voluta.fim[1] - T.vc_flange_recuo, z: voluta.fim[2],
    perfil: [[0, 0], [T.vc_flange_raio, 0], [T.vc_flange_raio, T.vc_flange_espessura], [0, T.vc_flange_espessura]],
  };

  /* rotor: seis pás cheias e seis intercaladas entre elas */
  const passoAngular = 360 / T.rotor_pas;
  const pas = [];
  for (let k = 0; k < T.rotor_pas; k += 1) {
    pas.push(plantaDaPa(T, k * passoAngular, T.pa_r_cheia));
    pas.push(plantaDaPa(T, k * passoAngular + passoAngular / 2, T.pa_r_curta));
  }
  const envelope = [[0, T.rotor_z0], [T.envelope[0][0], T.rotor_z0], ...T.envelope, [0, T.rotor_z1]];
  const cubo = [[0, T.rotor_z0], ...T.cubo, [0, T.rotor_z1]];
  const eixoRotor = [[0, T.eixo_z0], [T.eixo_raio, T.eixo_z0], [T.eixo_raio, T.cavidade_z1], [0, T.cavidade_z1]];
  const porca = [[0, T.porca_z0], [T.porca_raio, T.porca_z0], [T.porca_raio, T.porca_z1], [0, T.porca_z1]];

  /* miolo: corpo de revolução com as duas flanges, as conexões de óleo e de água e o retorno com a flange de dois furos */
  const mz0 = T.z_compressor_fim;
  const mz1 = T.z_miolo_fim;
  const mioloCorpo = [
    [0, mz0], [T.miolo_flange_raio, mz0], [T.miolo_flange_raio, mz0 + T.miolo_flange_z], [T.miolo_raio, mz0 + T.miolo_flange_z],
    [T.miolo_raio, mz1 - T.miolo_flange_z], [T.miolo_flange_raio, mz1 - T.miolo_flange_z], [T.miolo_flange_raio, mz1], [0, mz1],
  ];
  const cilindroY = (raio, y0, y1) => [[0, y0], [raio, y0], [raio, y1], [0, y1]];
  const oleo = cilindroY(T.oleo_raio, Y + T.oleo_y0, Y + T.oleo_y1);
  const porcaOleo = cilindroY(T.porca_oleo_raio, Y + T.porca_oleo_y0, Y + T.porca_oleo_y1);
  const retorno = cilindroY(T.retorno_pescoco_raio, Y - T.retorno_y1, Y - T.retorno_y0);
  const retornoPlaca = {
    y0: Y - T.retorno_placa_y,
    centro: [0, T.oleo_z],
    furos: [-1, 1].map((s) => [0, T.oleo_z + s * T.retorno_furo_z]),
  };
  /* a conexão de água: perfil [raio, x]; do lado de -x o eixo cresce para baixo, e a ordem dos pontos se inverte para ficar anti-horária */
  const aguaBase = [
    [0, T.agua_x0], [T.agua_raio, T.agua_x0], [T.agua_raio, T.agua_rebarba_x0], [T.agua_rebarba_raio, T.agua_rebarba_x0],
    [T.agua_rebarba_raio, T.agua_rebarba_x1], [T.agua_raio, T.agua_rebarba_x1], [T.agua_raio, T.agua_x1], [0, T.agua_x1],
  ];
  const aguaMais = aguaBase;
  const aguaMenos = aguaBase.map(([r, x]) => [r, -x]).reverse();

  /* carcaça da turbina: corpo de revolução com a flange do miolo, o cone da saída axial, a flange redonda e o furo da saída */
  const tz0 = T.z_miolo_fim;
  const tz1 = T.z_turbina_fim;
  const carcacaTurbina = [
    [0, tz0], [T.turbina_flange_raio, tz0], [T.turbina_flange_raio, tz0 + T.turbina_flange_z], [T.turbina_corpo_raio, tz0 + T.turbina_flange_z],
    [T.turbina_corpo_raio, T.saida_cone_z], [T.saida_raio, T.saida_cone_z + 6], [T.saida_raio, tz1 - T.saida_flange_z],
    [T.saida_flange_raio, tz1 - T.saida_flange_z], [T.saida_flange_raio, tz1], [T.saida_furo_raio, tz1], [T.saida_furo_raio, T.turbina_cavidade_z],
    [0, T.turbina_cavidade_z],
  ];
  const vt = caminhoDeVoluta(T, {
    zc: T.vt_zc, r0: T.vt_r0, r1: T.vt_r1, a0: T.vt_a0, a1: T.vt_a1, th0: T.vt_th0, th1: T.vt_th1, amostras: T.vt_amostras,
    rumoFinal: T.vt_rumo_final, raioCurva: T.vt_raio_curva, aSaida: T.vt_a_saida, reta: T.vt_reta, arcoAmostras: T.vt_arco_amostras,
  });
  const flangeEntrada = {
    y0: vt.fim[1] - T.vt_flange_e + 2,
    centro: [vt.fim[0], vt.fim[2]],
    furos: [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [vt.fim[0] + sx * T.vt_flange_furo_x, vt.fim[2] + sz * T.vt_flange_furo_z])),
  };

  /* linhas: o tubo de óleo sai do topo da conexão, sobe, curva para +z e corre por cima; o de cobre sai da ponta da conexão de -x */
  const tuboOleo = caminhoDeTubo([0, Y + T.oleo_y1, T.oleo_z], [0, 1, 0], [0, 0, 1], T.oleo_sobe, T.oleo_curva_raio, T.oleo_corre, T.oleo_amostras_arco);
  const tuboCobre = caminhoDeTubo([-T.agua_x1, Y, T.agua_z[1]], [-1, 0, 0], [0, 1, 0], T.cobre_sai, T.cobre_curva_raio, T.cobre_sobe, T.cobre_amostras_arco);

  /* abraçadeiras: anéis de parede de 5 mm em volta do par de flanges, metade em cada lado do plano de encontro */
  const aW = T.abr_largura / 2;
  const anel = (zc) => [
    [T.flange_raio, zc - aW], [T.flange_raio + T.abr_espessura, zc - aW], [T.flange_raio + T.abr_espessura, zc + aW], [T.flange_raio, zc + aW], [T.flange_raio, zc - aW],
  ];
  const abracadeiras = [anel(T.z_compressor_fim), anel(T.z_miolo_fim)];

  return {
    carcacaCompressor, voluta, flangeSaida, pas, envelope, cubo, eixoRotor, porca, mioloCorpo, oleo, porcaOleo, retorno, retornoPlaca, aguaMais,
    aguaMenos, carcacaTurbina, vt, flangeEntrada, tuboOleo, tuboCobre, abracadeiras,
  };
}

/* seções de um loft a partir de um caminho em mm e dos raios, com um polo em cada ponta */
function secoesDeCaminho(pontos, raios, polo, poloInicio = polo) {
  const dir = (a, b) => {
    const v = b.map((x, k) => x - a[k]);
    const n = Math.hypot(...v);
    return v.map((x) => x / n);
  };
  const t0 = dir(pontos[0], pontos[1]);
  const t1 = dir(pontos[pontos.length - 2], pontos[pontos.length - 1]);
  return [
    { pos: pontos[0].map((x, k) => m(x - poloInicio * t0[k])), raio: 0 },
    ...pontos.map((p, k) => ({ pos: p.map(m), raio: m(raios[k]) })),
    { pos: pontos[pontos.length - 1].map((x, k) => m(x + polo * t1[k])), raio: 0 },
  ];
}

const par = ([r, z]) => [m(r), m(z)];

export function gerarPassos(T = TABELA) {
  const d = derivar(T);
  const Y = T.eixo_y;
  const P = [];
  const sel = (op, id) => ({ origem: { op, id } });
  const parte = (nome, op, id, mat) => {
    P.push(['parte', { nome, sel: sel(op, id) }], ['material', { sel: sel(op, id), usa: mat }], ['liso', { angulo: 30, sel: sel(op, id) }]);
  };
  /* lathe em torno do eixo do rotor (z), na altura do eixo */
  const lateZ = (origemId, perfil) => P.push(['lathe', { origemId, perfil: perfil.map(par), lados: T.lados, eixo: 'z', em: [0, m(Y), 0] }]);
  /* lathe em torno de y, com o centro em [x, y, z] */
  const lateY = (origemId, perfil, x, y, z, lados = T.lados) => P.push(['lathe', { origemId, perfil: perfil.map(par), lados, em: [m(x), m(y), m(z)] }]);
  /* lathe em torno de x, na altura do eixo e com o centro em z */
  const lateX = (origemId, perfil, z) => P.push(['lathe', { origemId, perfil: perfil.map(par), lados: 24, eixo: 'x', em: [0, m(Y), m(z)] }]);
  const loftDe = (origemId, caminho, lados) => P.push(['loft', {
    origemId, secoes: secoesDeCaminho(caminho.pts.map((q) => q.p), caminho.pts.map((q) => q.r), T.polo), lados,
  }]);

  /* 1. carcacaCompressor: voluta em caracol, corpo de revolução oco e flange de saída, unidos */
  loftDe(1, d.voluta, 32);
  lateZ(2, d.carcacaCompressor);
  lateY(3, d.flangeSaida.perfil, d.flangeSaida.x, d.flangeSaida.y, d.flangeSaida.z);
  P.push(['unir', { origemId: 4, solidos: [sel('loft', 1), sel('lathe', 2), sel('lathe', 3)] }]);
  parte('carcacaCompressor', 'unir', 4, 'aluminioFundido');

  /* 2. rotorCompressor: pás extrudadas em z, cortadas pelo envelope, com o cubo, a porca e o eixo */
  const z0 = T.rotor_z0;
  d.pas.forEach((planta, k) => {
    P.push(['extrusao', { origemId: 10 + k, perfil: planta.map(par), altura: m(T.rotor_z1 - z0), eixo: 'z', em: [0, m(Y), m(z0)] }]);
  });
  lateZ(22, d.cubo);
  P.push(['unir', { origemId: 23, solidos: [...d.pas.map((_, k) => sel('extrusao', 10 + k)), sel('lathe', 22)] }]);
  lateZ(24, d.envelope);
  P.push(['intersectar', { origemId: 25, solidos: [sel('unir', 23), sel('lathe', 24)] }]);
  lateZ(26, d.porca.map(([r, z]) => [r, z]));
  lateZ(27, d.eixoRotor);
  P.push(['unir', { origemId: 28, solidos: [sel('intersectar', 25), sel('lathe', 26), sel('lathe', 27)] }]);
  parte('rotorCompressor', 'unir', 28, 'aluminioRotor');

  /* 3. miolo */
  lateZ(30, d.mioloCorpo);
  lateY(31, d.oleo, 0, 0, T.oleo_z, 24);
  lateY(32, d.porcaOleo, 0, 0, T.oleo_z, 6);
  lateY(33, d.retorno, 0, 0, T.oleo_z, 24);
  P.push(['extrusao', {
    origemId: 34,
    perfil: { retangulo: { largura: m(T.retorno_placa_x), profundidade: m(T.retorno_placa_z), centro: par(d.retornoPlaca.centro) } },
    furos: d.retornoPlaca.furos.map((c) => ({ circulo: { raio: m(T.retorno_furo_raio), centro: par(c) } })),
    altura: m(T.retorno_placa_e), em: [0, m(d.retornoPlaca.y0), 0],
  }]);
  lateX(35, d.aguaMais, T.agua_z[0]);
  lateX(36, d.aguaMenos, T.agua_z[1]);
  P.push(['unir', { origemId: 37, solidos: [30, 31, 32, 33, 35, 36].map((id) => sel('lathe', id)).concat([sel('extrusao', 34)]) }]);
  parte('miolo', 'unir', 37, 'miolo');

  /* 4. carcacaTurbina: voluta em caracol, corpo de revolução com a saída axial e a flange de entrada retangular de quatro furos */
  loftDe(40, d.vt, 32);
  lateZ(41, d.carcacaTurbina);
  P.push(['extrusao', {
    origemId: 42,
    perfil: { retangulo: { largura: m(T.vt_flange_x), profundidade: m(T.vt_flange_z), centro: par(d.flangeEntrada.centro) } },
    furos: d.flangeEntrada.furos.map((c) => ({ circulo: { raio: m(T.vt_flange_furo_raio), centro: par(c) } })),
    altura: m(T.vt_flange_e), em: [0, m(d.flangeEntrada.y0), 0],
  }]);
  P.push(['unir', { origemId: 43, solidos: [sel('loft', 40), sel('lathe', 41), sel('extrusao', 42)] }]);
  parte('carcacaTurbina', 'unir', 43, 'ferroGrafite');

  /* 5. linhas: tubo de óleo e tubo de cobre */
  /* a ponta de contato do tubo é um polo que toca a conexão no ponto de saída, com a primeira seção polo_contato adiante: o tubo não
     penetra a conexão e a tampa da ponta fica quase plana */
  const tubo = (origemId, pontos, raio) => {
    const t = pontos[1].map((v, k) => v - pontos[0][k]);
    const n = Math.hypot(...t);
    const deslocado = [pontos[0].map((v, k) => v + (t[k] / n) * T.polo_contato), ...pontos.slice(1)];
    P.push(['loft', { origemId, secoes: secoesDeCaminho(deslocado, deslocado.map(() => raio), T.polo, T.polo_contato), lados: 16 }]);
  };
  tubo(50, d.tuboOleo, T.oleo_tubo_raio);
  tubo(51, d.tuboCobre, T.cobre_raio);
  P.push(['unir', { origemId: 52, solidos: [sel('loft', 50), sel('loft', 51)] }]);
  parte('linhas', 'unir', 52, 'acoDoTubo');

  /* 6. abracadeira: dois anéis */
  lateZ(60, d.abracadeiras[0]);
  lateZ(61, d.abracadeiras[1]);
  P.push(['unir', { origemId: 62, solidos: [sel('lathe', 60), sel('lathe', 61)] }]);
  parte('abracadeira', 'unir', 62, 'acoDaAbracadeira');
  return P;
}

export const CONTATOS = [
  { par: ['carcacaCompressor', 'miolo'], motivo: 'a flange traseira do compressor assenta na face da flange do miolo, em z = 66' },
  { par: ['miolo', 'carcacaTurbina'], motivo: 'a flange da turbina assenta na face da flange traseira do miolo, em z = 128' },
  { par: ['carcacaCompressor', 'abracadeira'], motivo: 'o anel de abraçadeira abraça a flange do compressor, face com face no raio de 50 mm' },
  { par: ['miolo', 'abracadeira'], motivo: 'os anéis abraçam as flanges do miolo, face com face no raio de 50 mm' },
  { par: ['carcacaTurbina', 'abracadeira'], motivo: 'o anel de trás abraça a flange da turbina, face com face no raio de 50 mm' },
  { par: ['rotorCompressor', 'carcacaCompressor'], motivo: 'o eixo do rotor encosta no fundo da cavidade, em z = 60; as pás não tocam a parede da boca' },
  { par: ['miolo', 'linhas'], motivo: 'o tubo de óleo sai do topo da conexão do miolo e o de cobre sai da ponta da conexão de água' },
];

const receita = {
  meta: { nome: 'turbocompressor', desc: 'turbocompressor de passeio, 200 mm ao longo do eixo: voluta do compressor de 160 mm com rotor visível pela boca, miolo, voluta da turbina, linhas e abraçadeiras' },
  PARAMS: TABELA,
  MATERIAIS: {
    aluminioFundido: { tipo: 'metal', cor: '#c4c7cb', aspereza: 0.55, metalicidade: 0.7 },
    aluminioRotor: { tipo: 'metal', cor: '#b6b9bd', aspereza: 0.35, metalicidade: 0.85 },
    miolo: { tipo: 'metal', cor: '#6d7075', aspereza: 0.6, metalicidade: 0.6 },
    ferroGrafite: { tipo: 'metal', cor: '#2f2d2c', aspereza: 0.75, metalicidade: 0.5 },
    acoDoTubo: { tipo: 'metal', cor: '#8c8f93', aspereza: 0.35, metalicidade: 0.85 },
    acoDaAbracadeira: { tipo: 'metal', cor: '#a2a5a9', aspereza: 0.4, metalicidade: 0.85 },
  },
  TOPO: { origem: 'eixo do rotor em x = 0, y = 80, em z; boca do compressor em z = 0, flange de saída da turbina em z = 200; y para cima, chão em y = 0' },
  PLANO: {
    objeto: 'turbocompressor de carro de passeio, peça inteira, com o eixo do rotor em z: voluta do compressor de 160 mm, miolo dos mancais, voluta da turbina, linhas de óleo e de água e abraçadeiras, uns 200 mm ao longo do eixo',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'diâmetro externo da voluta do compressor', milimetros: 160 },
    partes: [
      { nome: 'carcacaCompressor', forma: 'voluta de alumínio fundido em caracol, crescendo em volta do eixo, com a boca de entrada axial de 60 mm (rebordo e anel de abraçadeira) que mostra o rotor dentro e a saída tangencial em tubo curvo com rebordo', tecnica: 'loft de seções circulares ao longo de uma espiral crescente e de um arco, unido a um lathe oco da boca e da cavidade e a uma flange de saída' },
      { nome: 'rotorCompressor', forma: 'rotor com 6 pás cheias e 6 intercaladas, curvas, e a porca no nariz, visível pela boca', tecnica: 'doze extrusões em z de planta curva unidas ao cubo e cortadas por intersectar com o envelope de revolução, mais lathe da porca e do eixo' },
      { nome: 'miolo', forma: 'carcaça central cinza entre as duas volutas, com a entrada de óleo em cima (conexão com porca de latão), o retorno de óleo embaixo (flange de dois furos) e duas conexões de água laterais', tecnica: 'lathe do corpo com flanges, lathe das conexões e da porca sextavada, extrusão da flange com dois furos, unidos' },
      { nome: 'carcacaTurbina', forma: 'voluta de ferro fundido grafite, escura, com a flange de entrada dos gases embaixo (retangular, quatro furos) e a saída axial com flange redonda', tecnica: 'loft em espiral crescente com arco e trecho reto, unido a um lathe da saída axial e a uma extrusão com quatro furos' },
      { nome: 'linhas', forma: 'tubo fino de óleo de 8 mm que sai da conexão do miolo, curva e segue por cima, e um tubo curto de cobre na lateral', tecnica: 'dois loft de seção circular ao longo de caminhos com reta, arco de 90 graus e reta, unidos' },
      { nome: 'abracadeira', forma: 'anéis de fixação entre as carcaças e o miolo', tecnica: 'dois lathe de anel, unidos' },
    ],
    criteriosDeReprovacao: [
      'voluta do compressor ou da turbina como cilindro, sem o caracol de seção crescente',
      'boca do compressor sem o rotor visível dentro',
      'flange de entrada da turbina sem os quatro furos',
      'tubo de óleo solto no ar, sem sair da conexão do miolo',
    ],
  },
  contatos: CONTATOS,
  get PONTOS() {
    const T = this.PARAMS;
    const Y = T.eixo_y;
    return [
      { nome: 'canto de baixo do miolo (flange de retorno, conexão de água e face do compressor)', parte: 'miolo', medida: 'minimo', em: [-T.agua_x1, Y - T.retorno_placa_y, T.z_compressor_fim], toleranciaMm: 1 },
      { nome: 'canto de cima do miolo (porca de óleo e face da turbina)', parte: 'miolo', medida: 'maximo', em: [T.agua_x1, Y + T.oleo_y1, T.z_miolo_fim], toleranciaMm: 1 },
      { nome: 'centro das abraçadeiras', parte: 'abracadeira', medida: 'centro', em: [0, Y, (T.z_compressor_fim + T.z_miolo_fim) / 2], toleranciaMm: 1 },
      { nome: 'centro do rotor', parte: 'rotorCompressor', medida: 'centro', em: [0, Y, (T.porca_z0 + T.cavidade_z1) / 2], toleranciaMm: 1 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;

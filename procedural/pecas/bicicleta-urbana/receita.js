/* bicicleta-urbana — bicicleta urbana de marcha única, peça inteira, de quadro médio e rodas 700c.
 *
 * Referencial do acervo: y para cima, o chão da peça em y = 0 (embaixo dos dois pneus), a frente da bicicleta em +z e o
 * plano de simetria em x = 0 (a direita da bicicleta, o lado da corrente, em -x). A origem em z é o eixo do movimento central.
 * A tabela é em milímetro, a malha em metro, com a conversão em `m()` na `gerarPassos`.
 *
 * O quadro e o garfo são feitos de tubos redondos, cada um um `loft` de seções circulares entre dois nós calculados na
 * `derivar` a partir da geometria (entre-eixos, ângulos do tubo do selim e da direção, altura do movimento central). A roda é
 * feita na própria receita: pneu, aro e cubo são `lathe` em torno do eixo x, e os 32 raios são 4 raios-base (dois por lado,
 * cruzados) repetidos por `arranja` radial. A coroa, a catraca e o protetor são `lathe` com o número de lados igual ao número de
 * dentes. A corrente são elos de caixa: em cada trecho reto um elo repetido por `arranja` linear, em cada enrolamento um elo
 * repetido por `arranja` radial em torno da coroa ou da catraca. O guidão é um `loft` de seções circulares ao longo de uma
 * curva calculada (riser: sobe e recua para as pontas), e as manoplas seguem o mesmo caminho nas pontas.
 */

export const TABELA = {
  /* geometria geral */
  entre_eixos: 1000,
  chainstay: 415,
  altura_eixo: 335,
  altura_movimento_central: 270,
  angulo_tubo_selim: 73,
  angulo_direcao: 71,
  /* roda 700c */
  aro_assento_diametro: 622,
  pneu_largura: 32,
  pneu_altura: 24,
  aro_altura: 15,
  aro_largura: 22,
  cubo_corpo_raio: 11,
  cubo_flange_raio: 22,
  cubo_flange_x: 33,
  cubo_flange_espessura: 5,
  eixo_raio: 5,
  eixo_dianteiro_largura: 100,
  eixo_traseiro_largura: 130,
  raio_diametro: 2,
  raios_total: 32,
  raios_cruzamentos: 3,
  raio_encaixe_no_aro: 2,
  lados_roda: 72,
  lados_pneu_secao: 4,
  /* tubos do quadro (diâmetro externo) */
  tubo_superior_diametro: 34,
  tubo_inferior_diametro: 44,
  tubo_selim_diametro: 32,
  caixa_direcao_diametro: 46,
  caixa_direcao_comprimento: 135,
  estai_diametro: 16,
  base_diametro: 18,
  estai_x_topo: 18,
  base_x_inicio: 26,
  movimento_central_raio: 20,
  movimento_central_largura: 68,
  tubo_selim_comprimento: 560,
  tubo_superior_no_selim: 750,
  tubo_superior_na_direcao: 500,
  tubo_inferior_na_direcao: 405,
  lados_tubo: 14,
  tampa_conica: 0.6,
  selim_tampa: 20,
  /* garfo */
  garfo_offset: 45,
  garfo_eixo_a_coroa: 375,
  garfo_perna_diametro: 22,
  garfo_coroa_diametro: 26,
  garfo_coluna_diametro: 28,
  garfo_coluna_alem_da_caixa: 40,
  garfo_x: 50,
  /* mesa e guidão */
  mesa_folga_acima_caixa: 22,
  mesa_fixacao_comprimento: 48,
  mesa_fixacao_diametro: 36,
  mesa_braco_comprimento: 72,
  mesa_braco_diametro: 28,
  mesa_angulo: 12,
  mesa_cabeca_raio: 20,
  mesa_cabeca_largura: 50,
  guidao_largura: 680,
  guidao_diametro: 22,
  /* a largura de 680 é a total, com as manoplas: o caminho termina antes, pelo raio da manopla inclinada */
  guidao_recuo_da_ponta: 15,
  guidao_reto_meio: 110,
  guidao_subida: 85,
  guidao_recuo: 70,
  guidao_secoes_por_lado: 12,
  manopla_diametro: 31,
  manopla_comprimento: 130,
  /* canote e selim */
  canote_diametro: 27,
  canote_dentro: 120,
  canote_total: 250,
  selim_comprimento: 270,
  selim_largura: 140,
  selim_espessura: 45,
  selim_trilho_diametro: 6,
  selim_trilho_x: 28,
  selim_altura_sobre_canote: 8,
  /* transmissão */
  dentes_coroa: 44,
  dentes_catraca: 16,
  passo_corrente: 12.7,
  linha_da_corrente_x: 44,
  /* a direita da bicicleta, com a frente em +z, fica em -x: o lado da corrente */
  lado_da_corrente: -1,
  coroa_altura_dente: 4.1,
  catraca_altura_dente: 3.5,
  corrente_elo_largura: 6,
  corrente_elo_altura: 7.5,
  corrente_sobreposicao: 0.4,
  /* pedivela */
  pedivela_comprimento: 170,
  pedivela_angulo: -8,
  pedivela_braco_x: 60,
  pedivela_braco_diametro: 22,
  pedivela_eixo_raio: 7,
  protetor_raio: 99,
  protetor_x: 52.5,
  protetor_espessura: 3,
  protetor_raio_interno: 22,
  pedal_largura: 95,
  pedal_altura: 22,
  pedal_profundidade: 85,
  pedal_afastamento: 74,
};

const rad = (g) => (g * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const m = (mm) => mm / 1000;

/* Ponto no plano do corpo: (z, y) da bicicleta, com o lado x apartado. */
const ponto = (x, z, y) => [x, y, z];
const soma = (a, b) => a.map((v, i) => v + b[i]);
const esc = (a, k) => a.map((v) => v * k);
const menos = (a, b) => a.map((v, i) => v - b[i]);
const norma = (a) => Math.hypot(...a);
const unit = (a) => esc(a, 1 / norma(a));

/** Tudo o que a receita desenha, em milímetro: a posição dos nós, os perfis e os trechos da corrente. */
export function derivar(T) {
  const itens = [];
  const tubo = (parte, material, pts, raios, lados = T.lados_tubo) => itens.push({ k: 'tubo', parte, material, pts, raios: Array.isArray(raios) ? raios : pts.map(() => raios), lados });
  const torno = (parte, material, perfil, em, { lados = T.lados_roda, liso = 35, eixo = 'x' } = {}) => itens.push({ k: 'torno', parte, material, perfil, em, lados, liso, eixo });

  const zEixoTras = -T.chainstay;
  const zEixoFrente = T.entre_eixos - T.chainstay;
  const yEixo = T.altura_eixo;
  const yBB = T.altura_movimento_central;
  const bb = [0, yBB, 0];

  /* direção: o eixo de direção sobe e recua; o plano (z, y) com a direção para cima e para trás */
  const a = rad(T.angulo_direcao);
  const dDir = [0, Math.sin(a), -Math.cos(a)];
  const nFrente = [0, Math.cos(a), Math.sin(a)]; // perpendicular, para frente e para cima
  const eixoDianteiro = [0, yEixo, zEixoFrente];
  const naDirecao = (t) => soma(soma(eixoDianteiro, esc(nFrente, -T.garfo_offset)), esc(dDir, t));
  const naPerna = (t, x) => { const p = soma(eixoDianteiro, esc(dDir, t)); p[0] = x; return p; };

  /* tubo do selim */
  const s = rad(T.angulo_tubo_selim);
  const dSel = [0, Math.sin(s), -Math.cos(s)];
  const noSelim = (L) => soma(bb, esc(dSel, L));
  const baseDoTuboSuperior = soma(bb, esc(dSel, (T.tubo_superior_no_selim - yBB) / Math.sin(s)));

  /* QUADRO */
  const raioQ = (d) => d / 2;
  const cabecaBaixo = naDirecao(T.garfo_eixo_a_coroa + 20);
  const cabecaCima = naDirecao(T.garfo_eixo_a_coroa + 20 + T.caixa_direcao_comprimento);
  tubo('quadro', 'aluminio', [cabecaBaixo, cabecaCima], raioQ(T.caixa_direcao_diametro), 24);
  tubo('quadro', 'aluminio', [baseDoTuboSuperior, naDirecao(T.garfo_eixo_a_coroa + 20 + T.tubo_superior_na_direcao - 400)], raioQ(T.tubo_superior_diametro));
  tubo('quadro', 'aluminio', [bb, naDirecao(T.garfo_eixo_a_coroa + 20 + 18)], raioQ(T.tubo_inferior_diametro), 18);
  tubo('quadro', 'aluminio', [bb, noSelim(T.tubo_selim_comprimento)], raioQ(T.tubo_selim_diametro));
  for (const lado of [-1, 1]) {
    const dropout = [lado * T.eixo_traseiro_largura / 2, yEixo, zEixoTras];
    tubo('quadro', 'aluminio', [[lado * T.estai_x_topo, ...noSelim((T.tubo_superior_no_selim - yBB) / Math.sin(s) - 22).slice(1)], dropout], raioQ(T.estai_diametro));
    tubo('quadro', 'aluminio', [[lado * T.base_x_inicio, yBB, 0], dropout], raioQ(T.base_diametro));
  }
  torno('quadro', 'aluminio', [[0, -T.movimento_central_largura / 2], [T.movimento_central_raio, -T.movimento_central_largura / 2], [T.movimento_central_raio, T.movimento_central_largura / 2], [0, T.movimento_central_largura / 2]], bb, { lados: 24, liso: 40 });

  /* GARFO */
  for (const lado of [-1, 1]) {
    tubo('garfo', 'aluminio', [naPerna(0, lado * T.garfo_x), naPerna(T.garfo_eixo_a_coroa, lado * T.garfo_x)], raioQ(T.garfo_perna_diametro), 18);
  }
  const coroaGarfoZ = naPerna(T.garfo_eixo_a_coroa, 0);
  tubo('garfo', 'aluminio', [[-T.garfo_x - 8, coroaGarfoZ[1], coroaGarfoZ[2]], [T.garfo_x + 8, coroaGarfoZ[1], coroaGarfoZ[2]]], raioQ(T.garfo_coroa_diametro));
  tubo('garfo', 'aluminio', [coroaGarfoZ, naDirecao(T.garfo_eixo_a_coroa)], raioQ(T.garfo_coroa_diametro));
  const topoDaColuna = T.garfo_eixo_a_coroa + 20 + T.caixa_direcao_comprimento + T.garfo_coluna_alem_da_caixa;
  tubo('garfo', 'aluminio', [naDirecao(T.garfo_eixo_a_coroa), naDirecao(topoDaColuna)], raioQ(T.garfo_coluna_diametro), 18);

  /* MESA */
  const fixaBaixo = T.garfo_eixo_a_coroa + 20 + T.caixa_direcao_comprimento + T.mesa_folga_acima_caixa;
  const fixaCima = fixaBaixo + T.mesa_fixacao_comprimento;
  tubo('mesa', 'preto', [naDirecao(fixaBaixo), naDirecao(fixaCima)], raioQ(T.mesa_fixacao_diametro), 18);
  const centroFixa = naDirecao((fixaBaixo + fixaCima) / 2);
  const mesaA = rad(T.mesa_angulo);
  const guidaoCentro = soma(centroFixa, [0, Math.sin(mesaA) * T.mesa_braco_comprimento, Math.cos(mesaA) * T.mesa_braco_comprimento]);
  tubo('mesa', 'preto', [centroFixa, guidaoCentro], raioQ(T.mesa_braco_diametro), 18);
  torno('mesa', 'preto', [[0, -T.mesa_cabeca_largura / 2], [T.mesa_cabeca_raio, -T.mesa_cabeca_largura / 2], [T.mesa_cabeca_raio, T.mesa_cabeca_largura / 2], [0, T.mesa_cabeca_largura / 2]], guidaoCentro, { lados: 24, liso: 40 });

  /* GUIDÃO: caminho riser; x medido do centro, o trecho reto no meio, depois sobe e recua para as pontas */
  const meia = T.guidao_largura / 2 - T.guidao_recuo_da_ponta;
  const caminho = (de, ate, n) => Array.from({ length: n + 1 }, (_, i) => {
    const x = de + ((ate - de) * i) / n;
    const u = Math.max(0, (Math.abs(x) - T.guidao_reto_meio) / (meia - T.guidao_reto_meio));
    return soma(guidaoCentro, [x, T.guidao_subida * u ** 1.6, -T.guidao_recuo * u ** 1.3]);
  });
  const pedaco = (de, ate) => caminho(de, ate, T.guidao_secoes_por_lado * 2);
  tubo('guidao', 'preto', pedaco(-meia + 5, meia - 5), raioQ(T.guidao_diametro), 16);
  const manoplaInicio = meia - T.manopla_comprimento;
  tubo('manoplas', 'borracha', caminho(-meia, -manoplaInicio, 4), raioQ(T.manopla_diametro), 16);
  tubo('manoplas', 'borracha', caminho(manoplaInicio, meia, 4), raioQ(T.manopla_diametro), 16);

  /* CANOTE e SELIM */
  const baseCanote = T.tubo_selim_comprimento - T.canote_dentro;
  const topoCanote = baseCanote + T.canote_total;
  tubo('canote', 'preto', [noSelim(baseCanote), noSelim(topoCanote)], raioQ(T.canote_diametro), 16);
  const apoio = noSelim(topoCanote);
  const centroSelim = soma(apoio, [0, T.selim_altura_sobre_canote + T.selim_espessura / 2, 25]);
  const secoes = [];
  const nSel = 8;
  const perfilSelim = (t) => {
    // t de 0 (traseira) a 1 (bico): largura cai e a espessura afina para o bico
    const larg = t < 0.35 ? T.selim_largura * (0.55 + 0.45 * Math.sin((t / 0.35) * Math.PI / 2)) : T.selim_largura * (0.55 * (1 - ((t - 0.35) / 0.65) ** 1.3) + 0.12);
    const esp = T.selim_espessura * (1 - 0.35 * t);
    return { larg, esp };
  };
  for (let i = 0; i <= nSel; i++) {
    const t = i / nSel;
    secoes.push({ t, z: centroSelim[2] - T.selim_comprimento / 2 + 25 + T.selim_comprimento * t * 0.92, ...perfilSelim(t) });
  }
  itens.push({ k: 'selim', parte: 'selim', material: 'preto', secoes, base: centroSelim, apoioY: apoio[1] });
  for (const lado of [-1, 1]) {
    tubo('selim', 'aco', [[lado * T.selim_trilho_x, apoio[1] + T.selim_altura_sobre_canote, secoes[1].z], [lado * T.selim_trilho_x, apoio[1] + T.selim_altura_sobre_canote, secoes[7].z]], raioQ(T.selim_trilho_diametro), 8);
  }
  torno('selim', 'aco', [[0, -T.selim_trilho_x - 6], [10, -T.selim_trilho_x - 6], [10, T.selim_trilho_x + 6], [0, T.selim_trilho_x + 6]], [0, apoio[1] + 2, apoio[2]], { lados: 16, liso: 40 });

  /* RODAS: cubo, aro, pneu e raios no mesmo corpo */
  const rodas = [['rodaDianteira', zEixoFrente, T.eixo_dianteiro_largura], ['rodaTraseira', zEixoTras, T.eixo_traseiro_largura]];
  const raioAssento = T.aro_assento_diametro / 2;
  const raioPneu = raioAssento + T.pneu_altura;
  const raioAroInterno = raioAssento - T.aro_altura;
  const meiaAro = T.aro_largura / 2;
  const meiaPneu = T.pneu_largura / 2;
  const nRaiosLado = T.raios_total / 2;
  const passoRaios = 360 / (nRaiosLado / 2);
  const delta = (T.raios_cruzamentos * 360) / T.raios_total;
  for (const [parte, z, larguraEixo] of rodas) {
    const em = [0, yEixo, z];
    const xe = larguraEixo / 2;
    const f = T.cubo_flange_x;
    const e = T.cubo_flange_espessura;
    torno(parte, 'aco', [[0, -xe], [T.eixo_raio, -xe], [T.eixo_raio, -f - e], [T.cubo_flange_raio, -f - e], [T.cubo_flange_raio, -f], [T.cubo_corpo_raio, -f], [T.cubo_corpo_raio, f], [T.cubo_flange_raio, f], [T.cubo_flange_raio, f + e], [T.eixo_raio, f + e], [T.eixo_raio, xe], [0, xe]], em, { lados: 24, liso: 40 });
    torno(parte, 'aroMetal', [[raioAroInterno, -meiaAro], [raioAssento, -meiaAro], [raioAssento, meiaAro], [raioAroInterno, meiaAro], [raioAroInterno, -meiaAro]], em, { liso: 30 });
    const topoPneu = raioPneu;
    const ombro = T.pneu_altura * 0.45;
    torno(parte, 'borracha', [
      [raioAssento, -meiaPneu + 2], [raioAssento + ombro * 0.5, -meiaPneu], [raioAssento + ombro * 1.2, -meiaPneu + 0.8], [topoPneu - 4, -meiaPneu * 0.7], [topoPneu, -meiaPneu * 0.35],
      [topoPneu, meiaPneu * 0.35], [topoPneu - 4, meiaPneu * 0.7], [raioAssento + ombro * 1.2, meiaPneu - 0.8], [raioAssento + ombro * 0.5, meiaPneu], [raioAssento, meiaPneu - 2], [raioAssento, -meiaPneu + 2],
    ], em, { lados: T.lados_roda * 2, liso: 40 });
    itens.push({ k: 'raios', parte, material: 'aco', em, flange: { r: T.cubo_flange_raio - 3, x: f + e / 2 }, aro: raioAroInterno + T.raio_encaixe_no_aro, delta, passo: passoRaios, quantos: nRaiosLado / 2, diametro: T.raio_diametro });
  }

  /* TRANSMISSÃO */
  const xc = T.linha_da_corrente_x;
  const S = T.lado_da_corrente;
  /* espelha o perfil em x para o lado da corrente; inverter a ordem mantém o sentido das faces */
  const noLado = (perfil) => (S < 0 ? perfil.map(([r, a]) => [r, -a]).reverse() : perfil);
  const rc = T.passo_corrente / (2 * Math.sin(Math.PI / T.dentes_coroa));
  const rg = T.passo_corrente / (2 * Math.sin(Math.PI / T.dentes_catraca));
  const c1 = [yBB, 0]; // [y, z]
  const c2 = [yEixo, zEixoTras];
  const dv = [c2[1] - c1[1], c2[0] - c1[0]]; // [dz, dy]
  const D = Math.hypot(...dv);
  const alfa = Math.atan2(dv[1], dv[0]);
  const beta = Math.acos((rc - rg) / D);
  const ang = (fi) => [Math.cos(fi), Math.sin(fi)]; // [z, y]
  const t1 = (fi) => [c1[1] + rc * ang(fi)[0], c1[0] + rc * ang(fi)[1]]; // [z, y]
  const t2 = (fi) => [c2[1] + rg * ang(fi)[0], c2[0] + rg * ang(fi)[1]];
  const fiCima = alfa - beta;
  const fiBaixo = alfa + beta;
  const corrente = { xc: S * xc, largura: T.corrente_elo_largura, altura: T.corrente_elo_altura, folga: T.corrente_sobreposicao, trechos: [] };
  for (const [nome, fi] of [['superior', fiCima], ['inferior', fiBaixo]]) {
    const p1 = t1(fi); const p2 = t2(fi);
    const comp = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const n = Math.max(1, Math.round(comp / T.passo_corrente));
    corrente.trechos.push({ k: 'reto', nome, de: p1, para: p2, n, comp });
  }
  const arco = (nome, centro, raio, de, ate) => {
    const varre = de - ate;
    const n = Math.max(1, Math.round((raio * varre) / T.passo_corrente));
    corrente.trechos.push({ k: 'arco', nome, centro, raio, de, varre, n });
  };
  arco('coroa', [c1[1], c1[0]], rc, fiCima, fiBaixo - 2 * Math.PI);
  arco('catraca', [c2[1], c2[0]], rg, fiBaixo, fiCima);
  itens.push({ k: 'corrente', parte: 'corrente', material: 'aco', ...corrente });

  torno('pedivela', 'preto', noLado([[T.dentes_coroa > 0 ? 20 : 0, xc - 1], [rc - 18, xc - 1], [rc - 18, xc - T.corrente_elo_largura / 2 - 0.5], [rc + T.coroa_altura_dente, xc - T.corrente_elo_largura / 2 - 0.5], [rc + T.coroa_altura_dente, xc + T.corrente_elo_largura / 2 + 0.5], [rc - 18, xc + T.corrente_elo_largura / 2 + 0.5], [rc - 18, xc + 1], [20, xc + 1], [20, xc - 1]]), bb, { lados: T.dentes_coroa, liso: 25 });
  torno('pedivela', 'preto', noLado([[T.protetor_raio_interno, T.protetor_x - T.protetor_espessura / 2], [T.protetor_raio, T.protetor_x - T.protetor_espessura / 2], [T.protetor_raio, T.protetor_x + T.protetor_espessura / 2], [T.protetor_raio_interno, T.protetor_x + T.protetor_espessura / 2], [T.protetor_raio_interno, T.protetor_x - T.protetor_espessura / 2]]), bb, { lados: 72, liso: 30 });
  torno('pedivela', 'aco', noLado([[0, -T.pedivela_braco_x - 8], [T.pedivela_eixo_raio, -T.pedivela_braco_x - 8], [T.pedivela_eixo_raio, T.protetor_x + T.protetor_espessura / 2 + 4], [0, T.protetor_x + T.protetor_espessura / 2 + 4]]), bb, { lados: 16, liso: 40 });
  const pa = rad(T.pedivela_angulo);
  const pedalPts = {};
  for (const lado of [1, -1]) {
    const fase = lado === S ? pa : pa + Math.PI;
    const ponta = [lado * T.pedivela_braco_x, yBB + Math.sin(fase) * T.pedivela_comprimento, Math.cos(fase) * T.pedivela_comprimento];
    tubo('pedivela', 'aluminioEscuro', [[lado * T.pedivela_braco_x, yBB, 0], ponta], raioQ(T.pedivela_braco_diametro), 14);
    pedalPts[lado] = ponta;
    const x0 = lado * (T.pedal_afastamento);
    const x1 = lado * (T.pedal_afastamento + T.pedal_largura);
    itens.push({ k: 'pedal', parte: 'pedais', material: 'preto', x0: Math.min(x0, x1), x1: Math.max(x0, x1), y: ponta[1], z: ponta[2], lado, eixoRaio: 5, eixoDe: lado * (T.pedivela_braco_x), eixoAte: lado * (T.pedal_afastamento + 10), alt: T.pedal_altura, prof: T.pedal_profundidade });
  }

  /* CATRACA */
  torno('catraca', 'aco', noLado([[8, T.cubo_flange_x + T.cubo_flange_espessura], [14, T.cubo_flange_x + T.cubo_flange_espessura], [14, xc - T.corrente_elo_largura / 2 - 1], [rg + T.catraca_altura_dente, xc - T.corrente_elo_largura / 2 - 1], [rg + T.catraca_altura_dente, xc + T.corrente_elo_largura / 2 + 1], [8, xc + T.corrente_elo_largura / 2 + 1], [8, T.cubo_flange_x + T.cubo_flange_espessura]]), [0, yEixo, zEixoTras], { lados: T.dentes_catraca, liso: 25 });

  return { itens, g: { zEixoTras, zEixoFrente, yEixo, yBB, guidaoCentro, apoio, topoCanote, rc, rg, fiCima, fiBaixo, alfa, beta, D, c1, c2, centroSelim, pedalPts, raioPneu, baseDoTuboSuperior } };
}

/** Os PASSOS, já em metro. */
export function gerarPassos(T) {
  const { itens } = derivar(T);
  const passos = [];
  let id = 1;
  const proximo = () => id++;
  const partes = new Map(); // parte -> [sel]
  const materiaisPorSel = [];
  const marca = (parte, material, sel) => {
    if (!partes.has(parte)) partes.set(parte, []);
    partes.get(parte).push({ sel, material });
  };
  const v = (p) => p.map(m);

  for (const it of itens) {
    if (it.k === 'tubo') {
      const oid = proximo();
      const n = it.pts.length;
      const polo = (fim, vizinho) => ({ pos: v(soma(fim, esc(unit(menos(fim, vizinho)), T.tampa_conica))), raio: 0 });
      passos.push(['loft', { origemId: oid, lados: it.lados, secoes: [polo(it.pts[0], it.pts[1]), ...it.pts.map((p, i) => ({ pos: v(p), raio: m(it.raios[i]) })), polo(it.pts[n - 1], it.pts[n - 2])] }]);
      marca(it.parte, it.material, { origem: { op: 'loft', id: oid } });
    } else if (it.k === 'torno') {
      const oid = proximo();
      passos.push(['lathe', { origemId: oid, eixo: it.eixo, lados: it.lados, perfil: it.perfil.map(([r, a]) => [m(r), m(a)]), em: v(it.em) }]);
      marca(it.parte, it.material, { origem: { op: 'lathe', id: oid } });
      passos.push(['liso', { angulo: it.liso, sel: { origem: { op: 'lathe', id: oid } } }]);
    } else if (it.k === 'selim') {
      const oid = proximo();
      const sx = it.secoes;
      const secoes = sx.map((s) => {
        const meia = s.larg / 2;
        const pts = [];
        const n = 16;
        for (let i = 0; i < n; i++) {
          const th = (2 * Math.PI * i) / n;
          pts.push([m(Math.cos(th) * meia), m(Math.sin(th) * (s.esp / 2))]);
        }
        return { pos: [0, m(it.base[1]), m(s.z)], contorno: pts };
      });
      const polo = (z) => ({ pos: [0, m(it.base[1]), m(z)], raio: 0 });
      passos.push(['loft', { origemId: oid, lados: 16, secoes: [polo(sx[0].z - T.selim_tampa), ...secoes, polo(sx[sx.length - 1].z + T.selim_tampa)] }]);
      marca(it.parte, it.material, { origem: { op: 'loft', id: oid } });
    } else if (it.k === 'raios') {
      const [, yc, zc] = it.em;
      const pivo = v(it.em);
      const rF = it.flange.r;
      for (const lado of [1, -1]) {
        for (const cruz of [1, -1]) {
          const base = (cruz === 1 ? 0 : it.passo / 2) + (lado === 1 ? 0 : it.passo / 4);
          const hubA = rad(base);
          const rimA = rad(base + cruz * it.delta);
          const p0 = [lado * it.flange.x, yc + rF * Math.sin(hubA), zc + rF * Math.cos(hubA)];
          const p1 = [0, yc + it.aro * Math.sin(rimA), zc + it.aro * Math.cos(rimA)];
          const oid = proximo();
          passos.push(['loft', { origemId: oid, lados: 6, secoes: [{ pos: v(soma(p0, esc(unit(menos(p0, p1)), T.tampa_conica))), raio: 0 }, { pos: v(p0), raio: m(it.diametro / 2) }, { pos: v(p1), raio: m(it.diametro / 2) }, { pos: v(soma(p1, esc(unit(menos(p1, p0)), T.tampa_conica))), raio: 0 }] }]);
          const copias = proximo();
          passos.push(['arranja', { modo: 'radial', total: it.quantos, graus: it.passo, eixo: 'x', pivo, origemId: copias, derivaDe: { op: 'loft', id: oid }, sel: { origem: { op: 'loft', id: oid } } }]);
          marca(it.parte, it.material, { origem: { op: 'loft', id: oid } });
          marca(it.parte, it.material, { origem: { op: 'arranja', id: copias, de: { op: 'loft', id: oid } } });
        }
      }
    } else if (it.k === 'corrente') {
      const { xc, largura, altura, folga } = it;
      const elo = (centroZY, ang, comp) => {
        const oid = proximo();
        passos.push(['cubo', { origemId: oid, larg: m(largura), alt: m(altura), prof: m(comp), em: [m(xc), m(centroZY[1] - altura / 2), m(centroZY[0])] }]);
        const sel = { origem: { op: 'cubo', id: oid } };
        if (Math.abs(ang) > 1e-9) passos.push(['rotaciona', { eixo: 'x', graus: -ang, sel }]);
        marca('corrente', it.material, sel);
        return { oid, sel };
      };
      for (const t of it.trechos) {
        if (t.k === 'reto') {
          const dz = (t.para[0] - t.de[0]) / t.n;
          const dy = (t.para[1] - t.de[1]) / t.n;
          const passo = Math.hypot(dz, dy);
          const ang = deg(Math.atan2(dy, dz));
          const { oid, sel } = elo([t.de[0] + dz / 2, t.de[1] + dy / 2], ang, passo + folga);
          if (t.n > 1) {
            const copias = proximo();
            passos.push(['arranja', { modo: 'linear', total: t.n, d: [0, m(dy), m(dz)], origemId: copias, derivaDe: { op: 'cubo', id: oid }, sel }]);
            marca('corrente', it.material, { origem: { op: 'arranja', id: copias, de: { op: 'cubo', id: oid } } });
          }
        } else {
          const passoAng = t.varre / t.n;
          const fi0 = t.de - passoAng / 2;
          const centro = [t.centro[0] + t.raio * Math.cos(fi0), t.centro[1] + t.raio * Math.sin(fi0)];
          const angTang = deg(fi0) - 90;
          const corda = 2 * t.raio * Math.sin(passoAng / 2);
          const { oid, sel } = elo(centro, angTang, corda + folga);
          if (t.n > 1) {
            const copias = proximo();
            passos.push(['arranja', { modo: 'radial', total: t.n, graus: deg(passoAng), eixo: 'x', pivo: [m(xc), m(t.centro[1]), m(t.centro[0])], origemId: copias, derivaDe: { op: 'cubo', id: oid }, sel }]);
            marca('corrente', it.material, { origem: { op: 'arranja', id: copias, de: { op: 'cubo', id: oid } } });
          }
        }
      }
    } else if (it.k === 'pedal') {
      const oid = proximo();
      const larg = it.x1 - it.x0;
      passos.push(['cubo', { origemId: oid, larg: m(larg), alt: m(it.alt), prof: m(it.prof), em: [m((it.x0 + it.x1) / 2), m(it.y - it.alt / 2), m(it.z)] }]);
      marca('pedais', it.material, { origem: { op: 'cubo', id: oid } });
      const eid = proximo();
      passos.push(['lathe', { origemId: eid, eixo: 'x', lados: 12, perfil: [[0, m(Math.min(it.eixoDe, it.eixoAte))], [m(it.eixoRaio), m(Math.min(it.eixoDe, it.eixoAte))], [m(it.eixoRaio), m(Math.max(it.eixoDe, it.eixoAte))], [0, m(Math.max(it.eixoDe, it.eixoAte))]], em: [0, m(it.y), m(it.z)] }]);
      marca('pedais', 'aco', { origem: { op: 'lathe', id: eid } });
    }
  }
  for (const [nome, lista] of partes) {
    for (const { sel, material } of lista) {
      passos.push(['parte', { nome, sel }]);
      passos.push(['material', { sel, usa: material }]);
    }
  }
  return passos;
}

export const CONTATOS = [
  { par: ['quadro', 'garfo'], motivo: 'a coluna do garfo atravessa a caixa de direção, coaxial a ela, e se apoia nela' },
  { par: ['garfo', 'rodaDianteira'], motivo: 'as pontas das pernas do garfo seguram as extremidades do eixo dianteiro' },
  { par: ['quadro', 'rodaTraseira'], motivo: 'as gancheiras superiores e inferiores seguram as extremidades do eixo traseiro' },
  { par: ['garfo', 'mesa'], motivo: 'a fixação da mesa abraça o topo da coluna do garfo' },
  { par: ['mesa', 'guidao'], motivo: 'a cabeça da mesa segura o guidão pelo centro' },
  { par: ['guidao', 'manoplas'], motivo: 'cada manopla cobre a ponta do guidão' },
  { par: ['quadro', 'canote'], motivo: 'o canote entra no tubo do selim, coaxial a ele' },
  { par: ['canote', 'selim'], motivo: 'a braçadeira dos trilhos do selim assenta no topo do canote' },
  { par: ['quadro', 'pedivela'], motivo: 'o eixo do pedivela atravessa o movimento central e os braços ficam ao lado dele' },
  { par: ['pedivela', 'pedais'], motivo: 'cada pedal gira no eixo na ponta do braço do pedivela' },
  { par: ['rodaTraseira', 'catraca'], motivo: 'a catraca assenta na face externa da flange direita do cubo traseiro' },
  { par: ['pedivela', 'corrente'], motivo: 'a corrente enrola os dentes da coroa, no mesmo plano x da coroa' },
  { par: ['catraca', 'corrente'], motivo: 'a corrente enrola os dentes da catraca, no mesmo plano x da coroa' },
];

const receita = {
  meta: { nome: 'bicicleta-urbana', desc: 'bicicleta urbana de marcha única, rodas 700c com 32 raios, quadro de tubos redondos, guidão riser e corrente de elos' },
  PARAMS: TABELA,
  MATERIAIS: {
    aluminio: { cor: '#5b6a7a', metalicidade: 0.7, aspereza: 0.4 },
    aluminioEscuro: { cor: '#2b2e33', metalicidade: 0.6, aspereza: 0.45 },
    aroMetal: { cor: '#3a3d42', metalicidade: 0.7, aspereza: 0.4 },
    preto: { cor: '#1c1d20', metalicidade: 0.1, aspereza: 0.6 },
    borracha: { cor: '#151618', metalicidade: 0, aspereza: 0.85 },
    aco: { cor: '#9aa0a6', metalicidade: 0.85, aspereza: 0.35 },
  },
  TOPO: { origem: 'chão sob o eixo do movimento central; y para cima, a frente da bicicleta em +z, o lado da corrente (direita da bicicleta) em -x' },
  PLANO: {
    objeto: 'bicicleta urbana de marcha única, rodas 700c, entre-eixos de 1000 mm, quadro médio de alumínio, guidão riser de 680 mm',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'diâmetro externo do pneu 700c', milimetros: 670 },
    partes: [
      { nome: 'quadro', forma: 'tubos redondos: superior, inferior (mais grosso), do selim, caixa de direção grossa, 2 gancheiras superiores e 2 inferiores, movimento central', tecnica: 'loft de seções circulares entre nós derivados; lathe no movimento central' },
      { nome: 'garfo', forma: 'garfo reto de duas pernas com ponte e coluna coaxial à caixa de direção', tecnica: 'loft circular por perna, ponte e coluna' },
      { nome: 'rodaDianteira', forma: 'cubo, 32 raios cruzados, aro e pneu 700c centrados entre as pernas do garfo', tecnica: 'lathe de pneu, aro e cubo; raios por loft e arranja radial' },
      { nome: 'rodaTraseira', forma: 'cubo, 32 raios cruzados, aro e pneu 700c centrados entre as gancheiras', tecnica: 'lathe de pneu, aro e cubo; raios por loft e arranja radial' },
      { nome: 'mesa', forma: 'fixação na coluna, braço para frente e cabeça que segura o guidão pelo centro', tecnica: 'loft circular e lathe da cabeça' },
      { nome: 'guidao', forma: 'guidão riser de 680 mm: trecho reto central, pontas subindo e recuando', tecnica: 'loft circular ao longo de caminho calculado' },
      { nome: 'manoplas', forma: 'duas manoplas cilíndricas nas pontas do guidão', tecnica: 'loft circular sobre o mesmo caminho das pontas' },
      { nome: 'canote', forma: 'tubo fino dentro do tubo do selim, coaxial, saindo acima dele', tecnica: 'loft circular coaxial ao tubo do selim' },
      { nome: 'selim', forma: 'assento acolchoado com bico, dois trilhos e braçadeira', tecnica: 'loft de seções elípticas; trilhos em loft; lathe da braçadeira' },
      { nome: 'pedivela', forma: 'coroa de 44 dentes com protetor, eixo e dois braços opostos no movimento central', tecnica: 'lathe com lados iguais aos dentes; braços em loft' },
      { nome: 'pedais', forma: 'dois pedais de caixa, cada um num eixo na ponta do braço', tecnica: 'cubo e lathe do eixo' },
      { nome: 'catraca', forma: 'pinhão de 16 dentes no cubo traseiro, no plano da coroa', tecnica: 'lathe com 16 lados' },
      { nome: 'corrente', forma: 'corrente de elos simples ligando a coroa à catraca por dois trechos retos e dois enrolamentos', tecnica: 'cubo de elo repetido por arranja linear e radial' },
    ],
    criteriosDeReprovacao: [
      'uma roda fora do centro entre as pernas do garfo ou das gancheiras',
      'o pneu toca ou atravessa quadro, garfo ou gancheira',
      'a corrente não liga a coroa à catraca, ou coroa e catraca fora do mesmo plano x',
      'o selim ou o guidão abaixo do tubo superior',
      'o canote ou a coluna do garfo fora do eixo do tubo que os recebe',
      'guidão diferente da vista frontal: largura perto de 680 mm, pontas subindo e recuando',
    ],
  },
  contatos: CONTATOS,
  get PONTOS() {
    const T = this.PARAMS;
    const { g } = derivar(T);
    const topo = g.yEixo + g.raioPneu;
    return [
      { nome: 'eixo traseiro', parte: 'rodaTraseira', medida: 'centro', em: [0, g.yEixo, g.zEixoTras], toleranciaMm: 1 },
      { nome: 'eixo dianteiro', parte: 'rodaDianteira', medida: 'centro', em: [0, g.yEixo, g.zEixoFrente], toleranciaMm: 1 },
      { nome: 'topo do pneu dianteiro', parte: 'rodaDianteira', medida: 'maximo', em: [T.eixo_dianteiro_largura / 2, topo, g.zEixoFrente + g.raioPneu], toleranciaMm: 1 },
      { nome: 'chão sob o pneu traseiro', parte: 'rodaTraseira', medida: 'minimo', em: [-T.eixo_traseiro_largura / 2, topo - 2 * g.raioPneu, g.zEixoTras - g.raioPneu], toleranciaMm: 1 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;

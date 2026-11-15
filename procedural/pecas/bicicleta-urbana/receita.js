/* bicicleta-urbana — bicicleta urbana de marcha única, peça inteira, de quadro médio e rodas de 670 mm.
 *
 * Referencial do acervo: y para cima, o chão da peça em y = 0 (embaixo dos dois pneus), a frente da bicicleta em +z e o
 * plano de simetria em x = 0 (a direita da bicicleta, o lado da corrente, em -x). A origem em z é o eixo do movimento central.
 * A tabela é em milímetro, a malha em metro, com a conversão em `m()` na `gerarPassos`.
 *
 * O quadro e o garfo são feitos de tubos redondos, cada um um `loft` de seções circulares entre dois nós calculados na
 * `derivar` a partir da geometria (entre-eixos, ângulos do tubo do selim e da direção, altura do movimento central). A roda é
 * feita na própria receita: pneu, aro e cubo são `lathe` em torno do eixo x, e os 36 raios são 4 raios-base (dois por lado,
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
  /* roda: pneu alto, de 48 x 42 mm, sobre um aro menor, para o diâmetro externo de 670 mm */
  aro_assento_diametro: 586,
  pneu_largura: 48,
  pneu_altura: 42,
  aro_altura: 15,
  aro_largura: 22,
  cubo_corpo_raio: 14,
  cubo_flange_raio: 28,
  cubo_flange_x: 34,
  cubo_flange_espessura: 5,
  eixo_raio: 6,
  porca_raio: 10,
  porca_espessura: 7,
  ponteira_raio: 16,
  eixo_dianteiro_largura: 100,
  eixo_traseiro_largura: 140,
  raio_diametro: 2.8,
  raios_total: 36,
  raios_cruzamentos: 3,
  raio_encaixe_no_aro: 2,
  raio_aro_x: 3,
  pneu_encaixe_no_aro: 0.6,
  folga_minima: 5,
  lados_roda: 72,
  lados_pneu_secao: 4,
  /* tubos do quadro (diâmetro externo) */
  tubo_superior_diametro: 38,
  tubo_inferior_diametro: 48,
  tubo_selim_diametro: 42,
  caixa_direcao_diametro: 62,
  caixa_direcao_diametro_baixo: 54,
  caixa_sobre_coroa: 14,
  abracadeira_selim_diametro: 48,
  abracadeira_selim_comprimento: 10,
  caixa_direcao_comprimento: 160,
  estai_diametro: 20,
  estai_folga_pneu: 6.5,
  estai_abaixo_da_abracadeira: 40,
  solda_largura: 8,
  solda_trecho: 70,
  base_diametro: 18,
  estai_x_topo: 17,
  base_x_inicio: 36,
  movimento_central_raio: 20,
  movimento_central_largura: 68,
  tubo_selim_comprimento: 560,
  tubo_superior_no_selim: 750,
  tubo_superior_na_direcao: 525,
  tubo_inferior_na_direcao: 62,
  lados_tubo: 48,
  tampa_conica: 0.6,
  selim_tampa: 7,
  /* garfo */
  garfo_offset: 45,
  garfo_eixo_a_coroa: 375,
  garfo_perna_diametro: 22,
  garfo_coroa_diametro: 26,
  garfo_coroa_meia_largura: 44,
  garfo_coroa_arqueio: 8,
  garfo_perna_diametro_ponta: 18,
  garfo_coluna_diametro: 28,
  garfo_coluna_alem_da_caixa: 50,
  garfo_x: 50,
  garfo_folga_pneu: 6,
  /* mesa e guidão */
  mesa_espacador: 10,
  mesa_folga_acima_caixa: 0,
  mesa_fixacao_comprimento: 48,
  mesa_fixacao_diametro: 40,
  mesa_braco_comprimento: 88,
  mesa_braco_diametro: 36,
  mesa_angulo: 38,
  guidao_largura: 680,
  guidao_diametro: 22,
  /* a largura de 680 é a total, com as manoplas: o caminho termina antes, pelo raio da manopla inclinada */
  guidao_recuo_da_ponta: 15,
  /* centro reto até guidao_reto_meio; o riser sobe suave em guidao_subida_comprimento; dali às pontas o guidão fica na altura final e só recua */
  guidao_reto_meio: 90,
  guidao_subida_comprimento: 100,
  guidao_subida: 48,
  guidao_recuo: 75,
  guidao_erguida_na_ponta: 8,
  guidao_secoes_por_lado: 40,
  manopla_diametro: 31,
  manopla_comprimento: 82,
  /* canote e selim */
  canote_diametro: 27,
  canote_dentro: 120,
  canote_total: 250,
  selim_comprimento: 270,
  selim_largura: 150,
  selim_espessura: 44,
  selim_cupula: 4,
  selim_afundamento: 4,
  selim_trilho_curva: 5,
  selim_presilha_a_frente: 5,
  selim_braco_raio: 8,
  selim_trilho_diametro: 6,
  selim_trilho_x: 28,
  selim_largura_bico: 0.15,
  selim_largura_traseira: 1,
  selim_secoes: 22,
  selim_lados: 28,
    /* transmissão */
  dentes_coroa: 40,
  dentes_catraca: 16,
  passo_corrente: 12.7,
  linha_da_corrente_x: 52,
  /* a direita da bicicleta, com a frente em +z, fica em -x: o lado da corrente */
  lado_da_corrente: -1,
  coroa_altura_dente: 4.1,
  catraca_altura_dente: 3.5,
  corrente_elo_largura: 6,
  corrente_elo_altura: 7.5,
  corrente_sobreposicao: 0.6,
  /* pedivela */
  pedivela_comprimento: 165,
  pedivela_angulo: -8,
  pedivela_braco_x: 80,
  pedivela_braco_diametro: 18,
  pedivela_eixo_raio: 7,
  protetor_raio: 91,
  protetor_x: 62,
  protetor_espessura: 4,
  protetor_anel_largura: 13,
  coroa_aro_radial: 16,
  coroa_dente_fundo: 3,
  coroa_dente_largura: 5.5,
  aranha_bracos: 5,
  aranha_braco_raio: 9,
  aranha_cubo_raio: 26,
  aranha_poste_raio: 3.5,
  pedal_largura: 78,
  pedal_altura: 16,
  pedal_profundidade: 68,
  pedal_afastamento: 96,
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
  /* Tubo do quadro com as pontas marcadas para a solda: o trecho de cada ponta (de comprimento `trecho`) entra na união da junta
     que o recebe, e o meio fica um tubo só. A união (`unir`) funde os tubos de cada junta num sólido só, sem face interna, e o
     cordão de solda é o `friso` na costura dessa união (`costura` com perfil `cordao`), um chanfro de `solda_largura` mm em cada
     par de tubos que se toca, fundido aos tubos por outra união com a costura vincada (ver o passo das juntas). */
  const soldado = (pts, raios, lados, inicio, fim, trecho = T.solda_trecho) => {
    const r = Array.isArray(raios) ? raios : pts.map(() => raios);
    const acum = [0];
    for (let i = 1; i < pts.length; i++) acum.push(acum[i - 1] + norma(menos(pts[i], pts[i - 1])));
    const total = acum[acum.length - 1];
    const em = (d) => {
      let i = 1;
      while (i < pts.length - 1 && acum[i] < d) i++;
      const u = (d - acum[i - 1]) / (acum[i] - acum[i - 1]);
      return { p: pts[i - 1].map((v, k) => v + (pts[i][k] - v) * u), r: r[i - 1] + (r[i] - r[i - 1]) * u };
    };
    /* o tubo é um corpo só, da ponta à ponta: o trecho de cada ponta soldada ganha anéis a cada 4 mm (deslocados 0,37 do passo,
       para não coincidirem com a costura de outro tubo), para a união com o cordão não deixar triângulos longos que riscam o
       sombreado, e o meio fica com oito; o tubo entra inteiro na união do quadro */
    const ss = new Set([0, total]);
    const faixa = (a, b) => { const partes = Math.max(8, Math.round((b - a) / 4)); for (let k = 1; k < partes; k++) ss.add(a + ((b - a) * (k + 0.37)) / partes); };
    const a = inicio ? trecho : 0;
    const b = fim ? total - trecho : total;
    if (inicio) faixa(0, a);
    if (fim) faixa(b, total);
    for (let k = 0; k <= 8; k++) ss.add(a + ((b - a) * k) / 8);
    pts.forEach((_, i) => ss.add(acum[i]));
    const lista = [...ss].sort((x, y) => x - y).filter((x, i, arr) => i === 0 || x - arr[i - 1] > 1e-6);
    const amostras = lista.map((x) => em(Math.min(total, Math.max(0, x))));
    itens.push({ k: 'tubo', parte: 'quadro', material: 'aluminio', pts: amostras.map((q) => q.p), raios: amostras.map((q) => q.r), lados, junta: inicio || fim ? 'quadro' : null });
  };
  const torno = (parte, material, perfil, em, { lados = T.lados_roda, liso = 35, eixo = 'x', junta = null } = {}) => itens.push({ k: 'torno', parte, material, perfil, em, lados, liso, eixo, junta });

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
  const baseCaixa = T.garfo_eixo_a_coroa + T.caixa_sobre_coroa;
  const cabecaBaixo = naDirecao(baseCaixa);
  const cabecaCima = naDirecao(baseCaixa + T.caixa_direcao_comprimento);
  const cabecaMeio = naDirecao(baseCaixa + T.caixa_direcao_comprimento * 0.35);
  itens.push({ k: 'tubo', parte: 'quadro', material: 'aluminio', pts: [cabecaBaixo, cabecaMeio, cabecaCima], raios: [raioQ(T.caixa_direcao_diametro_baixo), raioQ((T.caixa_direcao_diametro_baixo + T.caixa_direcao_diametro) / 2), raioQ(T.caixa_direcao_diametro)], lados: 48, junta: 'quadro' });
  soldado([baseDoTuboSuperior, naDirecao(baseCaixa + T.tubo_superior_na_direcao - 400)], raioQ(T.tubo_superior_diametro), T.lados_tubo, 'selimTopo', 'cabeca', T.solda_trecho);
  soldado([bb, naDirecao(baseCaixa + T.tubo_inferior_na_direcao)], raioQ(T.tubo_inferior_diametro), T.lados_tubo, 'mc', 'cabeca', T.solda_trecho + 20);
  soldado([bb, noSelim(T.tubo_selim_comprimento)], raioQ(T.tubo_selim_diametro), T.lados_tubo, 'mc', 'selimTopo', T.solda_trecho + 40);
  /* abraçadeira do canote: anel grosso no topo do tubo do selim */
  tubo('quadro', 'preto', [noSelim(T.tubo_selim_comprimento - T.abracadeira_selim_comprimento), noSelim(T.tubo_selim_comprimento - 2)], raioQ(T.abracadeira_selim_diametro), 32);
  for (const lado of [-1, 1]) {
    const dropout = [lado * T.eixo_traseiro_largura / 2, yEixo, zEixoTras];
    /* estais superiores: como na foto lateral, os dois sobem juntos e se soldam na face de trás do tubo do selim, logo abaixo da
       braçadeira, um ao lado do outro (a pessoa reprovou, em 2026-11-15, os estais soldados nos lados do tubo); a ponta de cada
       um fica enterrada no tubo, e o meio do trajeto abre o suficiente para a folga do pneu */
    const topoEstai = noSelim(T.tubo_selim_comprimento - T.estai_abaixo_da_abracadeira);
    const tras = [0, -Math.cos(s), -Math.sin(s)]; // perpendicular ao tubo do selim, para trás
    const rS = raioQ(T.tubo_selim_diametro), rE = raioQ(T.estai_diametro);
    const xLado = rE * 0.9; // os dois estais quase se tocam atrás do tubo
    /* o ponto de solda na face de trás do tubo do selim, e a linha dele até a gancheira: o estai sai do tubo já nessa linha, e a
       ponta entra no tubo pela mesma linha, para trás do ponto de solda */
    const solda = soma(topoEstai, esc(tras, rS));
    const xMeio = T.pneu_largura / 2 + T.estai_folga_pneu + rE + 0.5;
    const rumo = unit(menos(dropout, solda));
    const ao = (f, x) => [lado * x, solda[1] + (dropout[1] - solda[1]) * f, solda[2] + (dropout[2] - solda[2]) * f];
    const dentro = soma(solda, esc(rumo, -(rE + 6)));
    soldado([[lado * xLado, dentro[1], dentro[2]], ao(0, xLado), ao(0.12, xLado + 4), ao(0.25, xMeio), ao(0.55, xMeio + 4), ao(1, T.eixo_traseiro_largura / 2)], rE, T.lados_tubo, 'selimTopo', `gancheira${lado}`, T.solda_trecho);
    soldado([[lado * T.base_x_inicio, yBB, 0], dropout], raioQ(T.base_diametro), T.lados_tubo, 'mc', `gancheira${lado}`, T.solda_trecho);
  }
  torno('quadro', 'aluminio', [[0, -T.movimento_central_largura / 2], [T.movimento_central_raio, -T.movimento_central_largura / 2], [T.movimento_central_raio, T.movimento_central_largura / 2], [0, T.movimento_central_largura / 2]], bb, { lados: 24, liso: 40, junta: 'quadro' });

  /* GARFO: coroa encostada na base da caixa, ombros que nascem dela, lâminas levemente curvas para a frente, coluna coaxial */
  const nUp = 16;
  /* cada perna nasce no centro da coroa, dentro do colar, abre num ombro redondo e desce quase vertical; a abertura nunca fica abaixo da folga mínima do pneu */
  const raioPneuG = T.aro_assento_diametro / 2 + T.pneu_altura;
  const rTopo = raioQ(T.garfo_perna_diametro + 8);
  const rLaminaMm = (u) => rTopo + (raioQ(T.garfo_perna_diametro_ponta) - rTopo) * u;
  const exigeX = (p, r) => (Math.hypot(p[1] - yEixo, p[2] - zEixoFrente) - r < raioPneuG + T.garfo_folga_pneu ? T.pneu_largura / 2 + T.garfo_folga_pneu + r + 0.3 : 0);
  const nOmbro = 6;
  const pernaBase = [];
  for (let j = 0; j <= nOmbro; j++) {
    const th = (j / nOmbro) * (Math.PI / 2);
    const p = naDirecao(T.garfo_eixo_a_coroa + T.garfo_coroa_arqueio * (1 - Math.sin(th)));
    pernaBase.push({ p, r: rTopo, exige: exigeX(p, rTopo), x: T.garfo_coroa_meia_largura * Math.sin(th) });
  }
  for (let i = 1; i <= nUp; i++) {
    const u = i / nUp; // 0 = coroa, 1 = ponta
    const p = soma(naDirecao(T.garfo_eixo_a_coroa * (1 - u)), esc(nFrente, T.garfo_offset * u ** 1.3));
    const r = rLaminaMm(u);
    pernaBase.push({ p, r, exige: exigeX(p, r), x: T.garfo_coroa_meia_largura + (T.garfo_x - T.garfo_coroa_meia_largura) * u });
  }
  for (const q of pernaBase) q.x = Math.max(q.x, q.exige);
  for (const lado of [-1, 1]) {
    const perna = pernaBase.map((q) => { const p = [...q.p]; p[0] = lado * q.x; return p; });
    tubo('garfo', 'aluminio', perna, pernaBase.map((q) => q.r), 32);
  }
  tubo('garfo', 'aluminio', [naDirecao(T.garfo_eixo_a_coroa - 6), naDirecao(baseCaixa + 2)], raioQ(T.caixa_direcao_diametro_baixo) - 0.5, 32);
  const topoDaColuna = baseCaixa + T.caixa_direcao_comprimento + T.garfo_coluna_alem_da_caixa;
  tubo('garfo', 'aluminio', [naDirecao(T.garfo_eixo_a_coroa), naDirecao(topoDaColuna)], raioQ(T.garfo_coluna_diametro), 24);

  /* MESA: espaçador e braçadeira do diâmetro da caixa no topo da coluna, e uma só extensão que sobe para a frente até o guidão */
  const topoCaixa = baseCaixa + T.caixa_direcao_comprimento;
  tubo('garfo', 'aluminio', [naDirecao(topoCaixa - 2), naDirecao(topoCaixa + T.mesa_espacador)], [raioQ(T.caixa_direcao_diametro) - 0.5, raioQ(T.mesa_fixacao_diametro)], 32);
  const fixaBaixo = topoCaixa + T.mesa_espacador + T.mesa_folga_acima_caixa;
  const fixaCima = fixaBaixo + T.mesa_fixacao_comprimento;
  tubo('mesa', 'preto', [naDirecao(fixaBaixo), naDirecao(fixaCima)], raioQ(T.mesa_fixacao_diametro), 32);
  const centroFixa = naDirecao(fixaCima - 14);
  const mesaA = rad(T.mesa_angulo);
  const guidaoCentro = soma(centroFixa, [0, Math.sin(mesaA) * T.mesa_braco_comprimento, Math.cos(mesaA) * T.mesa_braco_comprimento]);
  tubo('mesa', 'preto', [centroFixa, soma(centroFixa, esc(menos(guidaoCentro, centroFixa), 0.5)), guidaoCentro], [raioQ(T.mesa_fixacao_diametro) - 2, raioQ(T.mesa_braco_diametro) + 1, raioQ(T.guidao_diametro) + 9], 32);

  /* GUIDÃO: caminho riser; x medido do centro, o trecho reto no meio, depois sobe e recua para as pontas */
  const meia = T.guidao_largura / 2 - T.guidao_recuo_da_ponta;
  const caminho = (de, ate, n) => Array.from({ length: n + 1 }, (_, i) => {
    const x = de + ((ate - de) * i) / n;
    const ax = Math.abs(x);
    const us = Math.min(1, Math.max(0, (ax - T.guidao_reto_meio) / T.guidao_subida_comprimento));
    const ur = Math.max(0, (ax - T.guidao_reto_meio) / (meia - T.guidao_reto_meio));
    const uc = Math.max(0, (ax - T.guidao_reto_meio - T.guidao_subida_comprimento) / (meia - T.guidao_reto_meio - T.guidao_subida_comprimento));
    return soma(guidaoCentro, [x, T.guidao_subida * us * us * (3 - 2 * us) + T.guidao_erguida_na_ponta * uc, -T.guidao_recuo * ur]);
  });
  const pedaco = (de, ate) => caminho(de, ate, T.guidao_secoes_por_lado * 2);
  tubo('guidao', 'preto', pedaco(-meia + 5, meia - 5), raioQ(T.guidao_diametro), 28);
  const manoplaInicio = meia - T.manopla_comprimento;
  tubo('manoplas', 'borracha', caminho(-meia, -manoplaInicio, 10), raioQ(T.manopla_diametro), 32);
  tubo('manoplas', 'borracha', caminho(manoplaInicio, meia, 10), raioQ(T.manopla_diametro), 32);

  /* CANOTE e SELIM */
  const baseCanote = T.tubo_selim_comprimento - T.canote_dentro;
  const topoCanote = baseCanote + T.canote_total;
  tubo('canote', 'preto', [noSelim(baseCanote), noSelim(topoCanote)], raioQ(T.canote_diametro), 16);
  const apoio = noSelim(topoCanote);
  /* o assento fica atrás da presilha do canote por selim_presilha_a_frente: a presilha cai um pouco à frente do centro dele */
  const centroSelim = [0, 0, apoio[2] - T.selim_presilha_a_frente];
  const secoes = [];
  const nSel = T.selim_secoes;
  /* perfil de lado: topo nivelado, casca fina que afina para o nariz; as pontas fecham em arco, sem ponta cônica */
  const perfilSelim = (t) => {
    const tr = T.selim_largura_traseira;
    let larg = t < 0.2 ? T.selim_largura * (tr + (1 - tr) * Math.sin((t / 0.2) * Math.PI / 2)) : T.selim_largura * ((1 - T.selim_largura_bico) * (1 - ((t - 0.2) / 0.8) ** 1.1) + T.selim_largura_bico);
    let esp = T.selim_espessura * (1 - 0.35 * t ** 1.3);
    const fecha = (u) => Math.sqrt(Math.max(0.02, 1 - u * u));
    if (t > 0.84) { const f = fecha((t - 0.8) / 0.2 * 0.72); larg *= f; esp *= f; }
    if (t < 0.06) { const f = fecha((0.06 - t) / 0.06 * 0.9); larg *= f; esp *= f; }
    const yrel = -esp / 2 + T.selim_cupula * (1 - t) ** 2; /* o topo fica na mesma altura; a barriga sobe para o nariz */
    const afunda = T.selim_afundamento * Math.sin(Math.PI * Math.min(1, Math.max(0, (t - 0.08) / 0.7))) ** 1.5;
    return { larg, esp, yrel, afunda };
  };
  for (let i = 0; i <= nSel; i++) {
    const t = i / nSel;
    secoes.push({ t, z: centroSelim[2] - 0.46 * T.selim_comprimento + T.selim_comprimento * t * 0.92, ...perfilSelim(t) });
  }
  /* trilhos: seguem a barriga do assento por fora dela, com uma barriga levemente curva entre as pontas */
  const trilhoRel = (q) => {
    const x = Math.min(T.selim_trilho_x, 0.7 * q.larg / 2);
    const barriga = (q.esp / 2) * (1 - (x / (q.larg / 2)) ** 2.5) ** 0.4;
    return { x, y: q.yrel - barriga - 1 - T.selim_trilho_curva * Math.sin(Math.PI * q.t) };
  };
  const doCanote = secoes.reduce((a, q) => (Math.abs(q.z - apoio[2]) < Math.abs(a.z - apoio[2]) ? q : a));
  const rBraco = T.selim_braco_raio;
  const yBase = apoio[1] + rBraco - 2 - trilhoRel(doCanote).y;
  for (const q of secoes) q.y = yBase + q.yrel;
  centroSelim[1] = yBase;
  itens.push({ k: 'selim', parte: 'selim', material: 'preto', secoes, base: centroSelim, apoioY: apoio[1] });
  for (const lado of [-1, 1]) {
    const trilho = secoes.slice(2, nSel - 1).map((q) => { const r = trilhoRel(q); return [lado * r.x, yBase + r.y, q.z]; });
    tubo('selim', 'aco', trilho, trilho.map(() => raioQ(T.selim_trilho_diametro)), 12);
  }
  /* braçadeira pequena e escura sob o assento, sobre o topo do canote */
  torno('selim', 'preto', [[0, -T.selim_trilho_x - 4], [rBraco, -T.selim_trilho_x - 4], [rBraco, T.selim_trilho_x + 4], [0, T.selim_trilho_x + 4]], [0, apoio[1] + rBraco - 2, apoio[2]], { lados: 20, liso: 40 });

  /* RODAS: cubo, aro, pneu e raios no mesmo corpo */
  const rodas = [['rodaDianteira', zEixoFrente, T.eixo_dianteiro_largura], ['rodaTraseira', zEixoTras, T.eixo_traseiro_largura]];
  const raioAssento = T.aro_assento_diametro / 2;
  const raioPneu = raioAssento + T.pneu_altura;
  const raioAroInterno = raioAssento - T.aro_altura;
  const meiaAro = T.aro_largura / 2;
  const meiaPneu = T.pneu_largura / 2;
  const nRaiosLado = T.raios_total / 2;
  const passoRaios = 360 / (nRaiosLado / 2);
  const delta = (T.raios_cruzamentos * 720) / T.raios_total; /* cruzamento em furos do cubo: 3 furos de 360/(raios/2) graus */
  for (const [parte, z, larguraEixo] of rodas) {
    const em = [0, yEixo, z];
    const xe = larguraEixo / 2;
    const f = T.cubo_flange_x;
    const e = T.cubo_flange_espessura;
    torno(parte, 'aco', [[0, -xe], [T.eixo_raio, -xe], [T.eixo_raio, -f - e], [T.cubo_flange_raio, -f - e], [T.cubo_flange_raio, -f], [T.cubo_corpo_raio, -f], [T.cubo_corpo_raio, f], [T.cubo_flange_raio, f], [T.cubo_flange_raio, f + e], [T.eixo_raio, f + e], [T.eixo_raio, xe], [0, xe]], em, { lados: 24, liso: 40 });
    /* porca de cada ponta do eixo, por fora da ponteira, e a ponteira (pé) que o quadro ou o garfo oferece ao eixo */
    const rPonta = parte === 'rodaDianteira' ? T.garfo_perna_diametro_ponta / 2 : T.base_diametro / 2;
    const parteDe = parte === 'rodaDianteira' ? 'garfo' : 'quadro';
    torno(parte, 'aco', [[0, -xe - rPonta - T.porca_espessura], [T.porca_raio, -xe - rPonta - T.porca_espessura], [T.porca_raio, -xe - rPonta], [T.eixo_raio, -xe - rPonta], [T.eixo_raio, -xe], [0, -xe]], em, { lados: 6, liso: 20 });
    torno(parte, 'aco', [[0, xe + rPonta + T.porca_espessura], [T.porca_raio, xe + rPonta + T.porca_espessura], [T.porca_raio, xe + rPonta], [T.eixo_raio, xe + rPonta], [T.eixo_raio, xe], [0, xe]], em, { lados: 6, liso: 20 });
    torno(parteDe, 'aluminio', [[0, -xe - 4], [T.ponteira_raio, -xe - 4], [T.ponteira_raio, -xe + 4], [0, -xe + 4]], em, { lados: 32, liso: 40 });
    torno(parteDe, 'aluminio', [[0, xe - 4], [T.ponteira_raio, xe - 4], [T.ponteira_raio, xe + 4], [0, xe + 4]], em, { lados: 32, liso: 40 });
    torno(parte, 'aroMetal', [[raioAroInterno, -meiaAro], [raioAssento, -meiaAro], [raioAssento, meiaAro], [raioAroInterno, meiaAro], [raioAroInterno, -meiaAro]], em, { liso: 30 });
    const topoPneu = raioPneu;
    const ombro = T.pneu_altura * 0.45;
    const parteDoPneu = parte === 'rodaDianteira' ? 'pneuDianteiro' : 'pneuTraseiro';
    const encaixe = T.pneu_encaixe_no_aro; /* o pneu assenta no aro com este tanto de sobreposição, para as duas superfícies se encostarem apesar do número de lados diferente */
    torno(parteDoPneu, 'borracha', [
      [raioAssento - encaixe, -meiaPneu + 2], [raioAssento + ombro * 0.5, -meiaPneu], [raioAssento + ombro * 1.2, -meiaPneu + 0.8], [topoPneu - 4, -meiaPneu * 0.7], [topoPneu, -meiaPneu * 0.5], [topoPneu, -meiaPneu * 0.3], [topoPneu - 1.4, -meiaPneu * 0.26], [topoPneu - 1.4, -meiaPneu * 0.14], [topoPneu, -meiaPneu * 0.1],
      [topoPneu, meiaPneu * 0.1], [topoPneu - 1.4, meiaPneu * 0.14], [topoPneu - 1.4, meiaPneu * 0.26], [topoPneu, meiaPneu * 0.3], [topoPneu, meiaPneu * 0.5], [topoPneu - 4, meiaPneu * 0.7], [raioAssento + ombro * 1.2, meiaPneu - 0.8], [raioAssento + ombro * 0.5, meiaPneu], [raioAssento - encaixe, meiaPneu - 2], [raioAssento - encaixe, -meiaPneu + 2],
    ], em, { lados: T.lados_roda * 2, liso: 40 });
    itens.push({ k: 'raios', parte, material: 'aco', em, flange: { r: T.cubo_flange_raio - 3, x: f + e / 2 }, aro: raioAroInterno + T.raio_encaixe_no_aro, delta, passo: passoRaios, quantos: nRaiosLado / 2, diametro: T.raio_diametro, xAro: T.raio_aro_x });
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

  /* coroa em aranha: aro dentado, cubo e cinco braços; o protetor é um anel solto no lado de fora, preso por pinos nos braços */
  const eW = T.corrente_elo_largura / 2 + 0.5;
  const rAroIn = rc - T.coroa_aro_radial;
  const rRaiz = rc - T.coroa_dente_fundo;
  torno('pedivela', 'preto', noLado([[rAroIn, xc - eW], [rRaiz, xc - eW], [rRaiz, xc + eW], [rAroIn, xc + eW], [rAroIn, xc - eW]]), bb, { lados: T.dentes_coroa * 2, liso: 25 });
  /* um dente por cubo, repetido em arranja radial em volta do movimento central */
  itens.push({ k: 'dentes', parte: 'pedivela', material: 'preto', xc: S * xc, larg: 2 * eW, alt: rc + T.coroa_altura_dente - rRaiz, prof: T.coroa_dente_largura, y: yBB + rRaiz - 0.3, z: 0, total: T.dentes_coroa, graus: 360 / T.dentes_coroa, pivo: [S * xc, yBB, 0] });
  torno('pedivela', 'preto', noLado([[0, xc - 3], [T.aranha_cubo_raio, xc - 3], [T.aranha_cubo_raio, xc + 3], [0, xc + 3]]), bb, { lados: 20, liso: 40 });
  const rIntAnel = T.protetor_raio - T.protetor_anel_largura;
  const ponto2 = (x, r, fi) => [x, yBB + r * Math.sin(fi), r * Math.cos(fi)];
  for (let k = 0; k < T.aranha_bracos; k++) {
    const fi = rad(T.pedivela_angulo) + (2 * Math.PI * k) / T.aranha_bracos;
    tubo('pedivela', 'preto', [ponto2(S * xc, T.aranha_cubo_raio - 6, fi), ponto2(S * xc, rAroIn + 3, fi)], [raioQ(T.aranha_braco_raio * 2), raioQ(T.aranha_braco_raio * 1.5)], 12);
    tubo('pedivela', 'preto', [ponto2(S * xc, rIntAnel + 1.5, fi), ponto2(S * T.protetor_x, rIntAnel + 1.5, fi)], raioQ(T.aranha_poste_raio * 2), 8);
  }
  /* protetor com janelas: anel externo com borda, cubo central e braços entre eles; os pinos dos braços da aranha chegam aos braços do protetor */
  const pa0 = T.protetor_x - T.protetor_espessura / 2;
  const pa1 = T.protetor_x + T.protetor_espessura / 2;
  /* protetor: anel escuro por fora da coroa, preso por pinos às pontas dos braços da aranha, que ficam à vista dentro dele */
  torno('pedivela', 'preto', noLado([[rIntAnel, pa0], [T.protetor_raio, pa0], [T.protetor_raio, pa1 + 3], [T.protetor_raio - 4, pa1 + 3], [T.protetor_raio - 4, pa1], [rIntAnel, pa1], [rIntAnel, pa0]]), bb, { lados: 96, liso: 30 });
  torno('pedivela', 'aco', noLado([[0, -T.pedivela_braco_x - 8], [T.pedivela_eixo_raio, -T.pedivela_braco_x - 8], [T.pedivela_eixo_raio, T.protetor_x + T.protetor_espessura / 2 + 4], [0, T.protetor_x + T.protetor_espessura / 2 + 4]]), bb, { lados: 16, liso: 40 });
  const pa = rad(T.pedivela_angulo);
  const pedalPts = {};
  for (const lado of [1, -1]) {
    const fase = lado === S ? pa : pa + Math.PI;
    const ponta = [lado * T.pedivela_braco_x, yBB + Math.sin(fase) * T.pedivela_comprimento, Math.cos(fase) * T.pedivela_comprimento];
    tubo('pedivela', 'aluminioEscuro', [[lado * T.pedivela_braco_x, yBB + Math.sin(fase) * 12, Math.cos(fase) * 12], ponta], [raioQ(T.pedivela_braco_diametro) * 1.25, raioQ(T.pedivela_braco_diametro) * 0.85], 16);
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

  /* os tubos e as peças de alumínio do quadro são unidos num sólido só e as costuras ganham o cordão arredondado da solda */
  const juntas = new Map(); /* junta -> sólidos que a compõem */
  const soldar = (it) => Boolean(it.junta);
  for (const it of itens) {
    if (it.k === 'tubo') {
      const oid = proximo();
      const n = it.pts.length;
      const polo = (fim, vizinho) => ({ pos: v(soma(fim, esc(unit(menos(fim, vizinho)), T.tampa_conica))), raio: 0 });
      passos.push(['loft', { origemId: oid, lados: it.lados, secoes: [polo(it.pts[0], it.pts[1]), ...it.pts.map((p, i) => ({ pos: v(p), raio: m(it.raios[i]) })), polo(it.pts[n - 1], it.pts[n - 2])] }]);
      if (soldar(it)) (juntas.get(it.junta) ?? juntas.set(it.junta, []).get(it.junta)).push({ origem: { op: 'loft', id: oid } });
      else {
        marca(it.parte, it.material, { origem: { op: 'loft', id: oid } });
        if (it.lados >= 16) passos.push(['liso', { angulo: 40, sel: { origem: { op: 'loft', id: oid } } }]);
      }
    } else if (it.k === 'torno') {
      const oid = proximo();
      passos.push(['lathe', { origemId: oid, eixo: it.eixo, lados: it.lados, perfil: it.perfil.map(([r, a]) => [m(r), m(a)]), em: v(it.em) }]);
      if (soldar(it)) (juntas.get(it.junta) ?? juntas.set(it.junta, []).get(it.junta)).push({ origem: { op: 'lathe', id: oid } });
      else {
        marca(it.parte, it.material, { origem: { op: 'lathe', id: oid } });
        passos.push(['liso', { angulo: it.liso, sel: { origem: { op: 'lathe', id: oid } } }]);
      }
    } else if (it.k === 'selim') {
      const oid = proximo();
      const sx = it.secoes;
      const secoes = sx.map((s) => {
        const meia = s.larg / 2;
        const pts = [];
        const n = T.selim_lados;
        for (let i = 0; i < n; i++) {
          const th = (2 * Math.PI * i) / n;
          const c = Math.cos(th); const sn = Math.sin(th);
          /* superelipse: acolchoado cheio e de cantos redondos */
          const xn = Math.sign(c) * Math.abs(c) ** 0.8; /* afundamento do topo: só na metade de cima, mais fundo no eixo do assento */
          pts.push([m(xn * meia), m(Math.sign(sn) * Math.abs(sn) ** 0.8 * (s.esp / 2) - (sn > 0 ? s.afunda * (1 - xn * xn) * Math.abs(sn) : 0))]);
        }
        return { pos: [0, m(s.y), m(s.z)], contorno: pts };
      });
      const polo = (z, y) => ({ pos: [0, m(y), m(z)], raio: 0 });
      passos.push(['loft', { origemId: oid, lados: T.selim_lados, secoes: [polo(sx[0].z - T.selim_tampa, sx[0].y), ...secoes, polo(sx[sx.length - 1].z + T.selim_tampa, sx[sx.length - 1].y)] }]);
      marca(it.parte, it.material, { origem: { op: 'loft', id: oid } });
      passos.push(['liso', { angulo: 50, sel: { origem: { op: 'loft', id: oid } } }]);
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
          const p1 = [lado * it.xAro, yc + it.aro * Math.sin(rimA), zc + it.aro * Math.cos(rimA)];
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
    } else if (it.k === 'dentes') {
      const oid = proximo();
      passos.push(['cubo', { origemId: oid, larg: m(it.larg), alt: m(it.alt), prof: m(it.prof), em: [m(it.xc), m(it.y), m(it.z)] }]);
      const sel = { origem: { op: 'cubo', id: oid } };
      marca(it.parte, it.material, sel);
      const copias = proximo();
      passos.push(['arranja', { modo: 'radial', total: it.total, graus: it.graus, eixo: 'x', pivo: v(it.pivo), origemId: copias, derivaDe: { op: 'cubo', id: oid }, sel }]);
      marca(it.parte, it.material, { origem: { op: 'arranja', id: copias, de: { op: 'cubo', id: oid } } });
    } else if (it.k === 'pedal') {
      /* pedal de plataforma: placa maciça com borda levantada e seis pinos, igual nos dois lados */
      const larg = it.x1 - it.x0;
      const bar = 14;
      const barra = (cx, cz, lx, lz, alt = it.alt, dy = 0) => {
        const oid = proximo();
        passos.push(['cubo', { origemId: oid, larg: m(lx), alt: m(alt), prof: m(lz), em: [m(cx), m(it.y - it.alt / 2 + dy), m(cz)] }]);
        marca('pedais', it.material, { origem: { op: 'cubo', id: oid } });
      };
      barra((it.x0 + it.x1) / 2, it.z, larg, it.prof, it.alt * 0.55);
      barra(it.x0 + bar / 2, it.z, bar, it.prof);
      barra(it.x1 - bar / 2, it.z, bar, it.prof);
      barra((it.x0 + it.x1) / 2, it.z - it.prof / 2 + bar / 2, larg - 2 * bar, bar);
      barra((it.x0 + it.x1) / 2, it.z + it.prof / 2 - bar / 2, larg - 2 * bar, bar);
      for (const px of [it.x0 + bar / 2, it.x1 - bar / 2]) for (const pz of [-0.32, 0, 0.32]) barra(px, it.z + pz * it.prof, 4, 4, 4, it.alt - 0.5);
      const eid = proximo();
      passos.push(['lathe', { origemId: eid, eixo: 'x', lados: 12, perfil: [[0, m(Math.min(it.eixoDe, it.eixoAte))], [m(it.eixoRaio), m(Math.min(it.eixoDe, it.eixoAte))], [m(it.eixoRaio), m(Math.max(it.eixoDe, it.eixoAte))], [0, m(Math.max(it.eixoDe, it.eixoAte))]], em: [0, m(it.y), m(it.z)] }]);
      marca('pedais', 'aco', { origem: { op: 'lathe', id: eid } });
    }
  }
  for (const [junta, solidos] of juntas) {
    const idTubos = proximo(), idCordao = proximo(), idUniao = proximo();
    passos.push(['unir', { origemId: idTubos, solidos }]);
    passos.push(['friso', { origemId: idCordao, linha: { nome: `solda-${junta}` }, costura: { de: { op: 'unir', id: idTubos } }, perfil: { cordao: { largura: m(T.solda_largura) } } }]);
    passos.push(['unir', { origemId: idUniao, vincarCostura: true, solidos: [{ origem: { op: 'unir', id: idTubos } }, { origem: { op: 'friso', id: idCordao } }] }]);
    const selUniao = { origem: { op: 'unir', id: idUniao } };
    passos.push(['liso', { angulo: 40, sel: selUniao }]);
    marca('quadro', 'aluminio', selUniao);
  }
  for (const [nome, lista] of partes) {
    for (const { sel, material } of lista) {
      passos.push(['parte', { nome, sel }]);
      passos.push(['material', { sel, usa: material }]);
    }
  }
  return passos;
}

/* O que não pode se tocar: o pneu e o quadro ou o garfo (folga de 5 mm medida pela malha), e a corrente e a roda traseira. */
export const SEPARADOS = [
  { par: ['pneuDianteiro', 'garfo'], folgaMinima: 0.005, motivo: 'o pneu dianteiro passa entre as lâminas do garfo e sob a coroa dele sem encostar' },
  { par: ['pneuDianteiro', 'quadro'], folgaMinima: 0.005, motivo: 'o pneu dianteiro passa abaixo da caixa de direção e do tubo inferior sem encostar' },
  { par: ['pneuTraseiro', 'quadro'], folgaMinima: 0.005, motivo: 'o pneu traseiro passa entre os estais e na frente do tubo do selim sem encostar' },
  { par: ['rodaTraseira', 'corrente'], folgaMinima: 0.005, motivo: 'a corrente passa por dentro das gancheiras, ao lado da roda traseira, sem encostar no cubo, nos raios ou nas porcas' },
  { par: ['pneuTraseiro', 'corrente'], folgaMinima: 0.005, motivo: 'a corrente passa por dentro das gancheiras, ao lado do pneu traseiro, sem encostar nele' },
];

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
  { par: ['rodaDianteira', 'pneuDianteiro'], motivo: 'o pneu assenta no aro da roda dianteira, com 0,6 mm de sobreposição na base do pneu', penetracaoMaxima: 0.0015 },
  { par: ['rodaTraseira', 'pneuTraseiro'], motivo: 'o pneu assenta no aro da roda traseira, com 0,6 mm de sobreposição na base do pneu', penetracaoMaxima: 0.0015 },
  { par: ['pedivela', 'pedais'], motivo: 'cada pedal gira no eixo na ponta do braço do pedivela' },
  { par: ['rodaTraseira', 'catraca'], motivo: 'a catraca assenta na face externa da flange direita do cubo traseiro' },
  { par: ['pedivela', 'corrente'], motivo: 'a corrente enrola os dentes da coroa, no mesmo plano x da coroa' },
  { par: ['catraca', 'corrente'], motivo: 'a corrente enrola os dentes da catraca, no mesmo plano x da coroa' },
];

const receita = {
  meta: { nome: 'bicicleta-urbana', desc: 'bicicleta urbana de marcha única, rodas de 670 mm com 36 raios, quadro de tubos redondos, guidão riser e corrente de elos' },
  PARAMS: TABELA,
  MATERIAIS: {
    aluminio: { cor: '#5b6a7a', metalicidade: 0.7, aspereza: 0.4 },
    aluminioEscuro: { cor: '#2b2e33', metalicidade: 0.6, aspereza: 0.45 },
    aroMetal: { cor: '#3a3d42', metalicidade: 0.7, aspereza: 0.4 },
    preto: { cor: '#1c1d20', metalicidade: 0.1, aspereza: 0.6 },
    borracha: { cor: '#161616', metalicidade: 0, aspereza: 0.9 },
    aco: { cor: '#9aa0a6', metalicidade: 0.85, aspereza: 0.35 },
  },
  TOPO: { origem: 'chão sob o eixo do movimento central; y para cima, a frente da bicicleta em +z, o lado da corrente (direita da bicicleta) em -x' },
  PLANO: {
    objeto: 'bicicleta urbana de marcha única, rodas de 670 mm, entre-eixos de 1000 mm, quadro médio de alumínio, guidão riser de 680 mm',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'diâmetro externo do pneu', milimetros: 670 },
    partes: [
      { nome: 'quadro', forma: 'tubos redondos: superior, inferior (mais grosso), do selim, caixa de direção grossa, 2 gancheiras superiores que chegam à luva do tubo do selim logo abaixo da braçadeira, 2 inferiores, abraçadeira do canote, movimento central', tecnica: 'loft de seções circulares entre nós derivados; lathe no movimento central' },
      { nome: 'garfo', forma: 'garfo reto: cabeça larga e arredondada, duas pernas que afinam e convergem até as pontas do eixo, e coluna coaxial à caixa de direção', tecnica: 'loft circular por perna, ponte e coluna' },
      { nome: 'rodaDianteira', forma: 'cubo com porcas, 36 raios cruzados e aro, centrados entre as pernas do garfo', tecnica: 'lathe de aro e cubo; raios por loft e arranja radial' },
      { nome: 'pneuDianteiro', forma: 'pneu de 48 mm de largura e 42 mm de altura, com sulcos, assentado no aro da roda dianteira', tecnica: 'lathe do perfil do pneu' },
      { nome: 'pneuTraseiro', forma: 'pneu de 48 mm de largura e 42 mm de altura, com sulcos, assentado no aro da roda traseira', tecnica: 'lathe do perfil do pneu' },
      { nome: 'rodaTraseira', forma: 'cubo com porcas, 36 raios cruzados e aro, centrados entre as gancheiras', tecnica: 'lathe de aro e cubo; raios por loft e arranja radial' },
      { nome: 'mesa', forma: 'braçadeira na coluna, pescoço curto inclinado para a frente e para cima e braçadeira que segura o guidão pelo centro', tecnica: 'loft circular' },
      { nome: 'guidao', forma: 'guidão riser de 680 mm: centro reto, subida suave junto da mesa, pontas quase horizontais recuando levemente', tecnica: 'loft circular ao longo de caminho calculado' },
      { nome: 'manoplas', forma: 'duas manoplas cilíndricas nas pontas do guidão', tecnica: 'loft circular sobre o mesmo caminho das pontas' },
      { nome: 'canote', forma: 'tubo fino dentro do tubo do selim, coaxial, saindo acima dele', tecnica: 'loft circular coaxial ao tubo do selim' },
      { nome: 'selim', forma: 'assento acolchoado arredondado, bico estreito e traseira larga, dois trilhos e braçadeira', tecnica: 'loft de seções elípticas; trilhos em loft; lathe da braçadeira' },
      { nome: 'pedivela', forma: 'coroa de 40 dentes (um cubo por dente) sobre aro, aranha de cinco braços à vista dentro de um anel protetor escuro, eixo e dois braços opostos no movimento central', tecnica: 'dentes por cubo e arranja radial; aro, cubo e anel do protetor em lathe; braços em loft' },
      { nome: 'pedais', forma: 'dois pedais de plataforma iguais, corpo cheio com borda levantada e pinos, cada um num eixo na ponta do braço', tecnica: 'cubos (placa e borda) por pedal e lathe do eixo' },
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
  separados: SEPARADOS,
  get PONTOS() {
    const T = this.PARAMS;
    const { g } = derivar(T);
    const topo = g.yEixo + g.raioPneu;
    return [
      { nome: 'eixo traseiro', parte: 'rodaTraseira', medida: 'centro', em: [0, g.yEixo, g.zEixoTras], toleranciaMm: 1 },
      { nome: 'eixo dianteiro', parte: 'rodaDianteira', medida: 'centro', em: [0, g.yEixo, g.zEixoFrente], toleranciaMm: 1 },
      { nome: 'topo do pneu dianteiro', parte: 'pneuDianteiro', medida: 'maximo', em: [T.pneu_largura / 2, topo, g.zEixoFrente + g.raioPneu], toleranciaMm: 1 },
      { nome: 'chão sob o pneu traseiro', parte: 'pneuTraseiro', medida: 'minimo', em: [-T.pneu_largura / 2, topo - 2 * g.raioPneu, g.zEixoTras - g.raioPneu], toleranciaMm: 1 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;

/* furgao-realista, receita/forma.js — a forma da chapa em milímetro: os perfis da frente, de trás, a seção frontal e a
 * planta (`forma`), os anéis horizontais e os do ombro, e os pontos na seção de um anel.
 */

import { acumulado, alturasDoPerfil, aPartirDe, contornoComRaios, grau, lerp, pontoNaDistancia, suave, trechoEntre, uNaAltura } from './geometria.js';

/* ---------- a forma, em milímetro ---------- */

/** Os perfis, as funções de fatia e as medidas derivadas, tudo da TABELA. */
export function forma(T) {
  const zFrente = T.comprimento / 2;
  const zTras = -T.comprimento / 2;
  const xMax = T.meia_largura;
  const ys = T.soleira_y;
  const zD = zFrente - T.balanco_dianteiro;
  const zT = zD - T.entre_eixos;
  const rPneu = T.pneu_diametro / 2;

  /* perfil da frente, [z, y], do pé do nariz ao teto */
  const baseVidro = [zFrente - T.base_vidro_recuo, T.base_vidro_y];
  const boca = [baseVidro[0] + T.capo_comprimento, T.boca_y];
  const topoVidro = [baseVidro[0] - (T.topo_vidro_y - baseVidro[1]) / Math.tan(T.para_brisa_angulo * grau), T.topo_vidro_y];
  const anguloCapo = Math.atan2(baseVidro[1] - boca[1], boca[0] - baseVidro[0]) / grau;
  const frenteDensa = contornoComRaios([
    [zFrente - 4 * T.raio_nariz_base, ys], [zFrente, ys, T.raio_nariz_base], [zFrente, T.parachoque_topo_y, T.raio_parachoque_topo],
    [zFrente - T.degrau_frente_recuo, T.degrau_frente_y, T.raio_degrau_frente], [...boca, T.raio_boca], [...baseVidro, T.raio_base_vidro],
    [...topoVidro],
  ]);
  /* o perfil começa no pé do raio do nariz (o trecho reto da soleira fica de fora) */
  const frenteAteVidro = frenteDensa.slice(frenteDensa.findIndex((p) => p[0] > zFrente - T.raio_nariz_base - 1e-6));
  /* A curva do teto sobre o para-brisa: dois arcos tangentes, o de raio_arco_vidro saindo do para-brisa no topo do vidro e o de
     raio_arco_testa chegando ao teto plano, que somam os 55 graus do para-brisa. O filete não desenha dois raios emendados, então os
     arcos são calculados aqui: o ângulo da emenda sai da subida que falta até o teto. Uma direção é o ângulo do trecho, de 0 (para a
     frente) a 180 graus (para trás); no para-brisa ela é 180 menos o ângulo do vidro. */
  const dirVidro = Math.PI - T.para_brisa_angulo * grau;
  const cosEmenda = ((T.altura - T.topo_vidro_y) - T.raio_arco_testa - T.raio_arco_vidro * Math.cos(dirVidro)) / (T.raio_arco_testa - T.raio_arco_vidro);
  if (!(Math.abs(cosEmenda) <= 1)) throw new Error('furgao-realista: os dois raios da curva do teto não fecham a subida até o teto');
  const dirEmenda = Math.acos(cosEmenda);
  if (dirEmenda <= dirVidro || dirEmenda >= Math.PI) throw new Error('furgao-realista: a emenda dos dois raios da curva do teto sai fora da curva');
  const arcoTangente = (inicio, r, a, b) => {
    const n = Math.max(2, Math.ceil(Math.abs(b - a) / grau));
    return Array.from({ length: n }, (_, k) => {
      const t = a + ((b - a) * (k + 1)) / n;
      return [inicio[0] + r * (Math.sin(t) - Math.sin(a)), inicio[1] + r * (Math.cos(a) - Math.cos(t))];
    });
  };
  const arcoVidro = arcoTangente(topoVidro, T.raio_arco_vidro, dirVidro, dirEmenda);
  const arcoTesta = arcoTangente(arcoVidro.at(-1), T.raio_arco_testa, dirEmenda, Math.PI);
  const testa = arcoTesta.at(-1);
  if (Math.abs(testa[1] - T.altura) > 0.5) throw new Error(`furgao-realista: a curva do teto chega em ${testa[1].toFixed(1)}, e não no teto`);
  testa[1] = T.altura;
  const perfilFrente = [...frenteAteVidro, ...arcoVidro, ...arcoTesta.slice(0, -1), testa];
  const zTetoFrente = testa[0];

  /* perfil de trás, [z, y], do pé da traseira ao teto */
  const zTraseira = zTras + T.traseira_recuo;
  const trasDensa = contornoComRaios([
    [zTras + 4 * T.raio_traseira_base, ys], [zTras, ys, T.raio_traseira_base], [zTras, T.degrau_tras_y - T.degrau_tras_rampa / 2],
    [zTraseira, T.degrau_tras_y + T.degrau_tras_rampa / 2], [zTraseira, T.altura, T.raio_quina_traseira],
    [zTraseira + 4 * T.raio_quina_traseira, T.altura],
  ]);
  const tras = trasDensa.slice(trasDensa.findIndex((p) => p[0] < zTras + T.raio_traseira_base + 1e-6));
  const zTetoTras = tras.find((p) => p[1] >= T.altura - 1e-9)[0];
  const perfilTras = tras.slice(0, tras.findIndex((p) => p[1] >= T.altura - 1e-9) + 1);

  /* seção frontal, [x, y], da soleira ao teto */
  const lateralDensa = contornoComRaios([
    [xMax, ys], [xMax, T.lateral_reta_ate_y, T.raio_lateral], [T.meia_largura_no_teto, T.altura, T.raio_ombro], [0, T.altura],
  ]);
  const xTetoLado = lateralDensa.find((p) => p[1] >= T.altura - 1e-9)[0];
  const perfilLado = lateralDensa.slice(0, lateralDensa.findIndex((p) => p[1] >= T.altura - 1e-9) + 1);

  /* A borda de fora das portas traseiras, que é o começo da quina de trás: 900 até o vinco de cintura, e daí a lateral prolongada
     (reta do vinco ao teto, sem o raio de 3000 que tira menos de 2 mm dela) menos o raio da quina de trás vista de cima, sempre
     100 mm para dentro dela. */
  const xLinhaDaLateral = (y) => (y <= T.lateral_reta_ate_y ? xMax : xMax - ((xMax - T.meia_largura_no_teto) * (y - T.lateral_reta_ate_y)) / (T.altura - T.lateral_reta_ate_y));
  const xBordaTraseira = (y) => xLinhaDaLateral(y) - T.raio_planta_tras;

  /* raio da quina da frente na planta, por altura: o do para-choque até a boca, fechando até a coluna do para-brisa */
  const raioFrente = (y) => {
    if (y <= boca[1]) return T.raio_planta_frente;
    if (y <= baseVidro[1]) return lerp(T.raio_planta_frente, T.raio_coluna_base, (y - boca[1]) / (baseVidro[1] - boca[1]));
    if (y <= topoVidro[1]) return lerp(T.raio_coluna_base, T.raio_coluna_topo, (y - baseVidro[1]) / (topoVidro[1] - baseVidro[1]));
    return lerp(T.raio_coluna_topo, T.raio_teto_frente, Math.min(1, (y - topoVidro[1]) / (T.altura - topoVidro[1])));
  };

  /* os arcos das rodas cortam a soleira onde o círculo de raio arco_raio, no centro da roda, cruza y = soleira */
  const dzArco = Math.sqrt(T.arco_raio ** 2 - (ys - rPneu) ** 2);

  /* A fresta da frente da porta da cabine, vista de lado: paralela ao para-brisa e porta_fresta_coluna atrás dele, medida na
     perpendicular à coluna, até o pé da coluna; dali desce vertical até o arco. */
  const pb = T.para_brisa_angulo * grau;
  const zLinhaVidro = (y) => baseVidro[0] - (y - baseVidro[1]) / Math.tan(pb);
  const pePorta = [baseVidro[0] - T.porta_fresta_coluna * Math.sin(pb), baseVidro[1] - T.porta_fresta_coluna * Math.cos(pb)];
  const zFrestaFrente = (y) => (y <= pePorta[1] ? pePorta[0] : zLinhaVidro(y) - T.porta_fresta_coluna / Math.sin(pb));
  /* A mesma linha a quina_fresta_ref atrás do perfil, que ordena as colunas q1 a q3 e E da quina da frente (e com elas as pontas do vão do para-brisa): ela ficou onde a fresta da porta corria na etapa 2, e a fresta da porta recuou sem levar o para-brisa. */
  const pePortaQuina = [baseVidro[0] - T.quina_fresta_ref * Math.sin(pb), baseVidro[1] - T.quina_fresta_ref * Math.cos(pb)];
  const zFrestaQuina = (y) => (y <= pePortaQuina[1] ? pePortaQuina[0] : zLinhaVidro(y) - T.quina_fresta_ref / Math.sin(pb));
  return {
    zFrente, zTras, xMax, ys, zD, zT, rPneu, dzArco, boca, baseVidro, topoVidro, testa, pePorta, pePortaQuina, zFrestaQuina, anguloCapo,
    perfilFrente, perfilTras, perfilLado, zTetoFrente, zTetoTras, xTetoLado, raioFrente, zFrestaFrente, xBordaTraseira,
    zF: (y) => uNaAltura(perfilFrente, y),
    zR: (y) => uNaAltura(perfilTras, y),
    xs: (y) => uNaAltura(perfilLado, y),
  };
}

/* ---------- os anéis ---------- */

/* As alturas dos anéis horizontais, com o nome de cada um: as alturas-chave com nome (as do perfil e as das portas, dos vãos e do
   vinco), as dos perfis e a grade de passo_anel, fundidas a menos de folga_entre_aneis e graduadas para nenhum intervalo passar do
   dobro de um vizinho. */
export function aneisHorizontais(T, f) {
  const c = T.cintura_y; const h = T.cintura_meia_largura;
  const chaves = [
    ['soleira', f.ys], ['portaBase', T.porta_base_y], ['faixaTopo', T.faixa_topo_y], ['degrauTras', T.degrau_tras_y - T.degrau_tras_rampa / 2],
    ['degrauTrasTopo', T.degrau_tras_y + T.degrau_tras_rampa / 2], ['portaTraseiraBase', T.porta_traseira_base_y],
    ['parachoque', T.parachoque_topo_y], ['degrauFrente', T.degrau_frente_y], ['boca', f.boca[1]],
    ['cinturaBaixo', c - h], ['cintura', c], ['cinturaCima', c + h],
    ['paraBrisaBase', T.para_brisa_base_y], ['vidroCabineBase', T.vidro_cabine_base_y],
    ['retaLateral', T.lateral_reta_ate_y], ['vidroTraseiroBase', T.vidro_traseiro_base_y], ['vidroCabineTopo', T.vidro_cabine_topo_y],
    ['portaCabineTopo', T.porta_cabine_topo_y], ['paraBrisaTopo', T.para_brisa_topo_y], ['topoVidro', f.topoVidro[1]], ['portaCorrerTopo', T.porta_correr_topo_y],
    ['ombro', T.ombro_y],
  ];
  const nomeDe = new Map();
  for (const [n, y] of chaves) if (!nomeDe.has(y)) nomeDe.set(y, n);
  const fixas = [...nomeDe.keys()].sort((a, b) => a - b);
  for (let k = 1; k < fixas.length; k += 1) {
    if (fixas[k] - fixas[k - 1] < T.folga_entre_aneis) throw new Error(`furgao-realista: os anéis ${nomeDe.get(fixas[k - 1])} e ${nomeDe.get(fixas[k])} ficam a menos de ${T.folga_entre_aneis} mm`);
  }
  const candidatos = [
    ...alturasDoPerfil(trechoEntre(f.perfilFrente, f.ys, T.ombro_y), T.passo_perfil, T.giro_max),
    ...alturasDoPerfil(trechoEntre(f.perfilTras, f.ys, T.ombro_y), T.passo_perfil, T.giro_max),
  ];
  /* Nenhum anel de enchimento cai perto de uma linha de porta horizontal (onde a tira da fresta dobra) nem do alto do arco da porta
     da cabine: o anel que cairia ali vai para a beira da faixa. */
  const meiaTira = T.fresta / 2 + T.fresta_borda_largura + T.folga_entre_aneis;
  const yAltoArco = f.rPneu + T.arco_raio + T.porta_folga_arco;
  const faixas = [
    ...[T.porta_base_y, T.porta_traseira_base_y, T.porta_cabine_topo_y, T.porta_correr_topo_y].map((y) => [y - meiaTira - 1e-6, y + meiaTira + 1e-6]),
    [yAltoArco - 1.5 * meiaTira, yAltoArco + 1.5 * meiaTira],
  ];
  for (const [a, b] of faixas) {
    for (const y of fixas) if (y > a && y < b && !faixas.some(([c, d]) => Math.abs((c + d) / 2 - y) < 1e-6)) throw new Error(`furgao-realista: o anel ${nomeDe.get(y)} cai na faixa da fresta entre ${a.toFixed(0)} e ${b.toFixed(0)}`);
  }
  const foraDasFaixas = (y) => { for (const [a, b] of faixas) if (y > a && y < b) return y - a < b - y ? a : b; return y; };
  const alturas = [...fixas];
  const aceitar = (y) => { const v = foraDasFaixas(y); if (alturas.every((a) => Math.abs(a - v) >= T.folga_entre_aneis) && Math.abs(v - T.faixa_topo_y) >= T.folga_faixa_topo) alturas.push(v); };
  for (const y of candidatos.filter((v) => v > f.ys && v < T.ombro_y).sort((a, b) => a - b)) aceitar(y);
  alturas.sort((a, b) => a - b);
  for (let k = alturas.length - 2; k >= 0; k -= 1) {
    const n = Math.ceil((alturas[k + 1] - alturas[k]) / T.passo_anel - 1e-9);
    for (let i = n - 1; i >= 1; i -= 1) alturas.splice(k + 1, 0, foraDasFaixas(lerp(alturas[k], alturas[k + 1], i / n)));
  }
  for (let dividiu = true; dividiu;) {
    dividiu = false;
    for (let k = 0; k + 1 < alturas.length && !dividiu; k += 1) {
      const vizinhos = [k > 0 ? alturas[k] - alturas[k - 1] : Infinity, k + 2 < alturas.length ? alturas[k + 2] - alturas[k + 1] : Infinity];
      if (alturas[k + 1] - alturas[k] > 2 * Math.min(...vizinhos) + 1e-9) { alturas.splice(k + 1, 0, (alturas[k] + alturas[k + 1]) / 2); dividiu = true; }
    }
  }
  /* a graduação pode ter posto anel de enchimento numa faixa: ele vai para a beira dela, e o que ficar perto de outro sai */
  for (let k = 0; k < alturas.length; k += 1) if (!nomeDe.has(alturas[k])) alturas[k] = foraDasFaixas(alturas[k]);
  alturas.sort((a, b) => a - b);
  for (let k = alturas.length - 1; k > 0; k -= 1) {
    if (alturas[k] - alturas[k - 1] < T.folga_entre_aneis) alturas.splice(nomeDe.has(alturas[k]) ? k - 1 : k, 1);
  }
  let ultima = 'soleira'; let ordem = 0;
  return alturas.map((y) => {
    if (nomeDe.has(y)) { ultima = nomeDe.get(y); ordem = 0; return { nome: ultima, y }; }
    ordem += 1;
    return { nome: `${ultima}${ordem}`, y };
  });
}

/* A seção de um anel horizontal: a frente, a lateral e a traseira na mesma altura, e os raios das quinas. */
export function secaoHorizontal(T, f, y) {
  return { yF: y, zF: f.zF(y), xS: f.xs(y), yS: y, yR: y, zR: f.zR(y), rF: f.raioFrente(y), rB: f.xs(y) - f.xBordaTraseira(y) };
}

/* Os anéis do ombro: cada trecho (frente, lateral e traseira) sobe o seu raio, da altura do ombro ao teto plano. A frente e a
   lateral andam frações iguais do arco; a traseira põe o anel `anel_porta_traseira` no topo das portas traseiras, ainda na parte
   vertical, e reparte o resto. */
export function aneisDoOmbro(T, f) {
  const trecho = (perfil) => { const { pl } = aPartirDe(perfil, T.ombro_y); const s = acumulado(pl); return { at: (d) => pontoNaDistancia(pl, s, d), L: s.at(-1) }; };
  const fr = trecho(f.perfilFrente); const tr = trecho(f.perfilTras); const la = trecho(f.perfilLado);
  const n = T.aneis_do_ombro; const kT = T.anel_porta_traseira;
  /* o topo das portas traseiras fica no começo da quina de trás, no máximo 12 mm para dentro da traseira vertical; a distância do
     anel do ombro até ele é medida ao longo do perfil */
  const dTopo = (() => {
    const { pl } = aPartirDe(f.perfilTras, T.ombro_y); const s = acumulado(pl);
    const k = pl.findIndex((p) => p[1] >= T.ombro_traseiro_y);
    if (k < 1) throw new Error('furgao-realista: o perfil de trás não chega ao topo das portas traseiras');
    const t = (T.ombro_traseiro_y - pl[k - 1][1]) / (pl[k][1] - pl[k - 1][1]);
    return lerp(s[k - 1], s[k], t);
  })();
  if (!(dTopo > 0 && f.zR(T.ombro_y) - f.zR(T.ombro_traseiro_y) < 12)) throw new Error('furgao-realista: o anel do ombro traseiro precisa ficar acima do ombro e a menos de 12 mm da traseira vertical');
  const rF0 = f.raioFrente(T.ombro_y);
  /* até o anel do topo das portas traseiras, o começo da quina de trás segue a lateral prolongada, para a fresta de fora das portas
     traseiras não entortar no alto; dali ao teto o raio fecha até o da borda do teto */
  const xTrasReta = (y) => f.xBordaTraseira(y);
  const aneis = [];
  let rBTopo = T.raio_planta_tras;
  for (let k = 1; k <= n; k += 1) {
    const t = k / n;
    const dTras = k <= kT ? (dTopo * k) / kT : dTopo + ((tr.L - dTopo) * (k - kT)) / (n - kT);
    const [zF, yF] = fr.at(t * fr.L); const [zR, yR] = tr.at(dTras); const [xS, yS] = la.at(t * la.L);
    const rB = k <= kT ? xS - xTrasReta(yR) : lerp(rBTopo, T.raio_teto_tras, (k - kT) / (n - kT));
    if (k === kT) rBTopo = rB;
    aneis.push({
      nome: k === n ? 'teto' : `ombro${k}`, t,
      sec: { yF, zF, xS, yS, yR, zR, rF: lerp(rF0, T.raio_teto_frente, t), rB },
    });
  }
  return aneis;
}

/* ---------- pontos na seção de um anel (metade x >= 0) ---------- */

export const pontoFrente = (s, x) => [x, s.yF, s.zF];
/* na quina da frente, pelo ângulo a: 0 na borda da frente, 90 graus no começo da lateral */
export const pontoQuinaFrente = (s, a) => [s.xS - s.rF + s.rF * Math.sin(a), lerp(s.yF, s.yS, suave(a / (Math.PI / 2))), s.zF - s.rF + s.rF * Math.cos(a)];
export const pontoLado = (s, z) => [s.xS, s.yS, z];
/* na quina de trás, pelo ângulo a: 0 no fim da lateral, 90 graus na borda da traseira */
export const pontoQuinaTras = (s, a) => [s.xS - s.rB + s.rB * Math.cos(a), lerp(s.yS, s.yR, suave(a / (Math.PI / 2))), s.zR + s.rB - s.rB * Math.sin(a)];
export const pontoTras = (s, x) => [x, s.yR, s.zR];
/* o caminho da quina da frente para a lateral: s = rF·a na quina, e depois anda para trás pela lateral */
export const pontoNoCaminho = (sec, s) => (s <= sec.rF * Math.PI / 2 + 1e-9 ? pontoQuinaFrente(sec, s / sec.rF) : pontoLado(sec, sec.zF - sec.rF - (s - sec.rF * Math.PI / 2)));

/* O ponto mais perto, na seção do anel, de um ponto deslocado, e a normal de fora ali (no plano xz). Serve para as frestas: o ponto
   que a fresta afasta meia largura volta para a superfície da seção na altura nova. */
export function projetarNaSecao(sec, p) {
  const sx = p[0] < 0 ? -1 : 1; const x = Math.abs(p[0]); const z = p[2];
  const xFim = sec.xS - sec.rF; const xTras = sec.xS - sec.rB;
  const cand = [];
  cand.push({ q: [Math.min(Math.max(x, 0), xFim), sec.zF], n: [0, 1] });
  { const c = [xFim, sec.zF - sec.rF]; let a = Math.atan2(x - c[0], z - c[1]); a = Math.min(Math.max(a, 0), Math.PI / 2); cand.push({ q: [c[0] + sec.rF * Math.sin(a), c[1] + sec.rF * Math.cos(a)], n: [Math.sin(a), Math.cos(a)] }); }
  cand.push({ q: [sec.xS, Math.min(Math.max(z, sec.zR + sec.rB), sec.zF - sec.rF)], n: [1, 0] });
  { const c = [xTras, sec.zR + sec.rB]; let a = Math.atan2(-(z - c[1]), x - c[0]); a = Math.min(Math.max(a, 0), Math.PI / 2); cand.push({ q: [c[0] + sec.rB * Math.cos(a), c[1] - sec.rB * Math.sin(a)], n: [Math.cos(a), -Math.sin(a)] }); }
  cand.push({ q: [Math.min(Math.max(x, 0), xTras), sec.zR], n: [0, -1] });
  let melhor = null; let dm = Infinity;
  for (const c of cand) { const d = Math.hypot(c.q[0] - x, c.q[1] - z); if (d < dm) { dm = d; melhor = c; } }
  return { p: [sx * melhor.q[0], p[1], melhor.q[1]], n: [sx * melhor.n[0], 0, melhor.n[1]] };
}

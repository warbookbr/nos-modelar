/* furgao-realista — furgão médio de teto alto com cabine de bico curto, na etapa 1 de 7 da modelagem (plano
 * docs/modelar/planos/2026-10-30-furgao-realista.md, alinhamento no banco de provas furgao-realista-2026-10-30): a lataria base,
 * uma chapa contínua só (cabine, carga e teto) com a silhueta lateral, frontal, traseira e de cima da prancha cotada
 * (referencias/quatro-vistas.prancha.png), os arcos das quatro rodas recortados e as quinas arredondadas, e quatro rodas
 * provisórias em cilindro para a pessoa julgar a proporção. A chapa ainda não tem vãos de janela, frestas de porta, vinco nem
 * nervuras (etapa 2); o corpo de baixo, os para-choques, as rodas da família, os vidros, as luzes e o acabamento vêm nas etapas 3 a 7.
 *
 * Origem: a peça nasceu como cópia do `furgao` do acervo, recriado em primitivas do núcleo a partir do modelo "van" do pacote A, de
 * autor A (pacote A, endereço omitido, endereço da página: endereço omitido), licença livre sem exigência de crédito (declarada no
 * License.txt do pacote). A malha de origem NÃO está no repositório. Da cópia não sobra forma: as medidas agora são as de classe do
 * alinhamento, desenhadas na prancha, e o `furgao` fica só como referência de caráter (referencias/fonte-vistas.png).
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente do furgão em +z, x para a direita de quem olha o furgão de frente
 * (o lado direito do furgão é o -x), centrado em x e em z no comprimento total. A TABELA é em milímetro e é a única fonte das
 * medidas; `derivar` calcula a gaiola e as rodas e `gerarPassos` escreve, por parte, a forma, a `parte` e o `material`. A conversão
 * para metro está em `m`, num lugar só. Nenhuma posição é digitada no passo.
 *
 * Como a chapa é feita. A carroceria é uma superfície por subdivisão (`subdivisao`) de uma gaiola de quadriláteros escrita aqui,
 * na metade x >= 0 com `simetria: 'x'`, e fechada numa chapa pela espessura. A gaiola tem duas grades costuradas: a das paredes,
 * em anéis horizontais que dão a volta na planta (da frente no plano de simetria, pela quina da frente, pela lateral, pela quina
 * de trás, até a traseira no plano de simetria), e a da cobertura, o teto plano entre o último anel e a costura. Cada anel é a
 * fatia da carroceria naquela altura: a frente segue o perfil lateral (nariz, degrau do para-choque, boca, capô, para-brisa,
 * testa), a traseira o perfil de trás, a lateral a seção frontal e as quinas o raio da planta. Perto do teto os anéis deixam de
 * ser horizontais e seguem os raios do ombro (lateral, testa e quina de trás) pela fração do arco de cada um. As alturas dos
 * anéis saem dos perfis, mais densas onde eles viram, e o passo entre anéis é graduado. A borda de baixo da lateral contorna os
 * dois arcos de roda, e a faixa da lateral entre a soleira e a altura em que ela deixa de ser vertical é plana: o miolo dela
 * sai da grade de Winslow, que leva as colunas em volta dos arcos sem dobrar a face junto da ponta deles. A superfície não
 * tem medidas: com todos os pontos medidos o ajuste das medidas, denso, levava minutos, e onde a chapa é plana a superfície
 * limite passa pelos pontos de qualquer jeito; nos raios ela fica para dentro da gaiola alguns milímetros, que a medida da
 * silhueta contra a prancha confere.
 * Os pontos da gaiola são derivados da TABELA e moram em `TOPO`, por um getter que lê `this.PARAMS`.
 */

export const TABELA = {
  // envelope da classe (prancha): 5400 de comprimento, 2000 de largura sem retrovisores, 2500 de altura, soleira em 300
  comprimento: 5400,
  meia_largura: 1000,
  altura: 2500,
  soleira_y: 300,

  // rodas e arcos: entre-eixos e balanço dianteiro (o traseiro sai da diferença), bitola, pneu 225/65 aro 16, arco com 65 mm de folga
  entre_eixos: 3300,
  balanco_dianteiro: 980,
  bitola: 1700,
  pneu_diametro: 710,
  pneu_largura: 225,
  arco_raio: 420,

  // perfil da frente, em [z, y]: nariz vertical até o topo do para-choque, degrau dele, boca do capô, capô curto, para-brisa e testa
  raio_nariz_base: 50,
  parachoque_topo_y: 720,
  raio_parachoque_topo: 30,
  degrau_frente_recuo: 40,
  degrau_frente_y: 760,
  raio_degrau_frente: 10,
  capo_comprimento: 860, // em z, da boca ao pé do para-brisa
  capo_angulo: 22.5,
  raio_boca: 20,
  base_vidro_recuo: 940, // do nariz ao pé do para-brisa, em z
  base_vidro_y: 1310,
  raio_base_vidro: 90,
  para_brisa_angulo: 55,
  topo_vidro_y: 1990,
  raio_topo_vidro: 300,
  testa_recuo: 200, // do topo do para-brisa ao canto da testa no teto, em z
  raio_testa: 200, // a prancha cota 300, mas o filete dela fica limitado à metade do trecho de antes e sai com 200

  // perfil de trás: traseira vertical recuada sobre o degrau do para-choque, quina do teto com raio
  traseira_recuo: 30,
  degrau_tras_y: 570,
  degrau_tras_rampa: 20, // o degrau horizontal da prancha vira uma rampa curta, porque cada anel é uma fatia horizontal
  raio_traseira_base: 40,
  raio_quina_traseira: 120,

  // seção frontal, em [x, y]: lateral vertical até 1450 e quase vertical até o teto, quina do teto com raio
  lateral_reta_ate_y: 1450,
  meia_largura_no_teto: 982,
  raio_lateral: 600,
  raio_ombro: 170,

  // planta: raio das quinas verticais na frente (do para-choque à coluna do para-brisa) e atrás, e na borda do teto plano
  raio_planta_frente: 280,
  raio_coluna_base: 160,
  raio_coluna_topo: 120,
  raio_teto_frente: 100,
  raio_planta_tras: 100,
  raio_teto_tras: 40,

  // chapa: espessura e níveis da subdivisão (com 2 níveis a chapa passa de 250 mil faces, que o adaptador da cena não carrega)
  espessura: 2,
  niveis: 1,
  nitidez_dobra_frente: 0.9, // o topo do para-choque e a boca do capô, de raio curto na prancha

  // gaiola: passo dos anéis ao longo dos perfis e giro máximo entre dois anéis; folga mínima entre anéis; passo das colunas;
  // a altura onde os anéis deixam de ser horizontais e quantos anéis sobem os raios do ombro; as iterações da grade da faixa dos arcos
  passo_perfil: 140,
  giro_max: 30,
  folga_entre_aneis: 8,
  passo_anel: 150,
  passo_frente: 120,
  passo_lado: 160,
  passo_arco: 130,
  colunas_quina_frente: 4,
  colunas_quina_tras: 4,
  ombro_y: 2280,
  aneis_do_ombro: 6,
  iteracoes_da_faixa: 400,
};

const m = (mm) => mm / 1000;
const grau = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const suave = (t) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };

/* ---------- curvas 2D em milímetro ---------- */

/* A poligonal com o raio de cada canto ([u, v, raio?]) virada em polilinha densa: cada canto com raio vira arco tangente aos dois
   trechos, amostrado a cada grau. O canto sem raio fica vivo. */
function contornoComRaios(pts) {
  const saida = [[pts[0][0], pts[0][1]]];
  for (let i = 1; i < pts.length - 1; i += 1) {
    const [px, py, r = 0] = pts[i];
    const a = pts[i - 1]; const b = pts[i + 1];
    const d1 = [px - a[0], py - a[1]]; const l1 = Math.hypot(...d1);
    const d2 = [b[0] - px, b[1] - py]; const l2 = Math.hypot(...d2);
    const u1 = [d1[0] / l1, d1[1] / l1]; const u2 = [d2[0] / l2, d2[1] / l2];
    const giro = Math.atan2(u1[0] * u2[1] - u1[1] * u2[0], u1[0] * u2[0] + u1[1] * u2[1]);
    if (!r || Math.abs(giro) < 1e-9) { saida.push([px, py]); continue; }
    const t = r * Math.tan(Math.abs(giro) / 2);
    if (t > l1 / 2 + 1e-6 || t > l2 / 2 + 1e-6) throw new Error(`furgao-realista: o raio ${r} no canto [${px}, ${py}] não cabe entre os vizinhos`);
    const t1 = [px - u1[0] * t, py - u1[1] * t];
    const sinal = Math.sign(giro);
    const n = [-u1[1] * sinal, u1[0] * sinal];
    const c = [t1[0] + n[0] * r, t1[1] + n[1] * r];
    const a0 = Math.atan2(t1[1] - c[1], t1[0] - c[0]);
    const passos = Math.max(2, Math.ceil(Math.abs(giro) / grau));
    for (let k = 0; k <= passos; k += 1) {
      const ang = a0 + (giro * k) / passos;
      saida.push([c[0] + r * Math.cos(ang), c[1] + r * Math.sin(ang)]);
    }
  }
  saida.push([pts.at(-1)[0], pts.at(-1)[1]]);
  return saida;
}

/* O comprimento acumulado de uma polilinha. */
function acumulado(pl) {
  const s = [0];
  for (let i = 1; i < pl.length; i += 1) s.push(s[i - 1] + Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]));
  return s;
}

/* O ponto da polilinha à distância `d` do começo. */
function pontoNaDistancia(pl, s, d) {
  let i = 1;
  while (i < pl.length - 1 && s[i] < d) i += 1;
  const t = s[i] === s[i - 1] ? 0 : Math.min(1, Math.max(0, (d - s[i - 1]) / (s[i] - s[i - 1])));
  return [lerp(pl[i - 1][0], pl[i][0], t), lerp(pl[i - 1][1], pl[i][1], t)];
}

/* O u da polilinha na altura v, pelo primeiro trecho que a atravessa (a polilinha sobe em v). */
function uNaAltura(pl, v) {
  for (let i = 1; i < pl.length; i += 1) {
    const [u0, v0] = pl[i - 1]; const [u1, v1] = pl[i];
    if ((v - v0) * (v - v1) <= 0 && v1 !== v0) return lerp(u0, u1, (v - v0) / (v1 - v0));
  }
  throw new Error(`furgao-realista: o perfil não chega à altura ${v}`);
}

/* O trecho da polilinha entre as alturas v0 e v1 (sobe em v), cortado nelas. */
function trechoEntre(pl, v0, v1) {
  const saida = [[uNaAltura(pl, v0), v0]];
  for (const p of pl) if (p[1] > v0 + 1e-9 && p[1] < v1 - 1e-9) saida.push(p);
  return saida;
}

/* O trecho da polilinha a partir do primeiro ponto em que ela atinge a altura v (o resto, até o fim). */
function aPartirDe(pl, v) {
  const s = acumulado(pl);
  for (let i = 1; i < pl.length; i += 1) {
    const [u0, v0] = pl[i - 1]; const [u1, v1] = pl[i];
    if ((v - v0) * (v - v1) <= 0 && v1 !== v0) {
      const p = [lerp(u0, u1, (v - v0) / (v1 - v0)), v];
      return { pl: [p, ...pl.slice(i)], s0: s[i - 1] + Math.hypot(p[0] - u0, p[1] - v0) };
    }
  }
  throw new Error(`furgao-realista: o perfil não chega à altura ${v}`);
}

/* As alturas em que o perfil pede anel: a cada `passo` de arco ou a cada `giroMax` graus de giro, o que vier antes. */
function alturasDoPerfil(polilinha, passo, giroMax) {
  /* os trechos retos longos (o capô, o para-brisa) se dividem antes, para o passo de arco valer dentro deles */
  const pl = [polilinha[0]];
  for (let i = 1; i < polilinha.length; i += 1) {
    const [a, b] = [polilinha[i - 1], polilinha[i]];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (passo / 8)));
    for (let k = 1; k <= n; k += 1) pl.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]);
  }
  const alturas = [pl[0][1]];
  let arco = 0; let giro = 0;
  for (let i = 1; i < pl.length; i += 1) {
    arco += Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]);
    if (i + 1 < pl.length) {
      const a = Math.atan2(pl[i][1] - pl[i - 1][1], pl[i][0] - pl[i - 1][0]);
      const b = Math.atan2(pl[i + 1][1] - pl[i][1], pl[i + 1][0] - pl[i][0]);
      let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      giro += Math.abs(d) / grau;
    }
    if (arco >= passo || giro >= giroMax) { alturas.push(pl[i][1]); arco = 0; giro = 0; }
  }
  return alturas;
}

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
  const boca = [baseVidro[0] + T.capo_comprimento, baseVidro[1] - T.capo_comprimento * Math.tan(T.capo_angulo * grau)];
  const topoVidro = [baseVidro[0] - (T.topo_vidro_y - baseVidro[1]) / Math.tan(T.para_brisa_angulo * grau), T.topo_vidro_y];
  const testa = [topoVidro[0] - T.testa_recuo, T.altura];
  const frenteDensa = contornoComRaios([
    [zFrente - 4 * T.raio_nariz_base, ys], [zFrente, ys, T.raio_nariz_base], [zFrente, T.parachoque_topo_y, T.raio_parachoque_topo],
    [zFrente - T.degrau_frente_recuo, T.degrau_frente_y, T.raio_degrau_frente], [...boca, T.raio_boca], [...baseVidro, T.raio_base_vidro],
    [...topoVidro, T.raio_topo_vidro], [...testa, T.raio_testa], [testa[0] - 4 * T.raio_testa, T.altura],
  ]);
  /* o perfil começa no pé do raio do nariz (o trecho reto da soleira fica de fora) e acaba no fim do raio da testa, onde o teto é plano */
  const frente = frenteDensa.slice(frenteDensa.findIndex((p) => p[0] > zFrente - T.raio_nariz_base - 1e-6));
  const zTetoFrente = frente.find((p) => p[1] >= T.altura - 1e-9)[0];
  const perfilFrente = frente.slice(0, frente.findIndex((p) => p[1] >= T.altura - 1e-9) + 1);

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

  /* raio da quina da frente na planta, por altura: o do para-choque até a boca, fechando até a coluna do para-brisa */
  const raioFrente = (y) => {
    if (y <= boca[1]) return T.raio_planta_frente;
    if (y <= baseVidro[1]) return lerp(T.raio_planta_frente, T.raio_coluna_base, (y - boca[1]) / (baseVidro[1] - boca[1]));
    if (y <= topoVidro[1]) return lerp(T.raio_coluna_base, T.raio_coluna_topo, (y - baseVidro[1]) / (topoVidro[1] - baseVidro[1]));
    return lerp(T.raio_coluna_topo, T.raio_teto_frente, Math.min(1, (y - topoVidro[1]) / (T.altura - topoVidro[1])));
  };

  /* os arcos das rodas cortam a soleira onde o círculo de raio arco_raio, no centro da roda, cruza y = soleira */
  const dzArco = Math.sqrt(T.arco_raio ** 2 - (ys - rPneu) ** 2);
  return {
    zFrente, zTras, xMax, ys, zD, zT, rPneu, dzArco, boca, baseVidro, topoVidro, testa,
    perfilFrente, perfilTras, perfilLado, zTetoFrente, zTetoTras, xTetoLado, raioFrente,
    zF: (y) => uNaAltura(perfilFrente, y),
    zR: (y) => uNaAltura(perfilTras, y),
    xs: (y) => uNaAltura(perfilLado, y),
  };
}

/* ---------- a gaiola ---------- */

/* As alturas dos anéis horizontais, com o nome de cada um: as alturas-chave com nome, as dos perfis e a grade de passo_anel,
   fundidas a menos de folga_entre_aneis e graduadas para nenhum intervalo passar do dobro de um vizinho. */
function aneisHorizontais(T, f) {
  const chaves = [
    ['soleira', f.ys], ['parachoque', T.parachoque_topo_y], ['degrauFrente', T.degrau_frente_y], ['degrauTras', T.degrau_tras_y - T.degrau_tras_rampa / 2], ['degrauTrasTopo', T.degrau_tras_y + T.degrau_tras_rampa / 2],
    ['boca', f.boca[1]], ['baseVidro', f.baseVidro[1]], ['retaLateral', T.lateral_reta_ate_y], ['topoVidro', f.topoVidro[1]], ['ombro', T.ombro_y],
  ];
  const nomeDe = new Map(chaves.map(([n, y]) => [y, n]));
  const candidatos = [
    ...alturasDoPerfil(trechoEntre(f.perfilFrente, f.ys, T.ombro_y), T.passo_perfil, T.giro_max),
    ...alturasDoPerfil(trechoEntre(f.perfilTras, f.ys, T.ombro_y), T.passo_perfil, T.giro_max),
  ];
  const fixas = [...nomeDe.keys()].sort((a, b) => a - b);
  const alturas = [...fixas];
  for (const y of candidatos.filter((v) => v > f.ys && v < T.ombro_y).sort((a, b) => a - b)) {
    if (alturas.every((h) => Math.abs(h - y) >= T.folga_entre_aneis)) alturas.push(y);
  }
  alturas.sort((a, b) => a - b);
  /* onde os perfis não pedem anel (a lateral e a traseira retas), o intervalo se divide em partes iguais de até passo_anel */
  for (let k = alturas.length - 2; k >= 0; k -= 1) {
    const n = Math.ceil((alturas[k + 1] - alturas[k]) / T.passo_anel - 1e-9);
    for (let i = n - 1; i >= 1; i -= 1) alturas.splice(k + 1, 0, lerp(alturas[k], alturas[k + 1], i / n));
  }
  for (let dividiu = true; dividiu;) {
    dividiu = false;
    for (let k = 0; k + 1 < alturas.length && !dividiu; k += 1) {
      const vizinhos = [k > 0 ? alturas[k] - alturas[k - 1] : Infinity, k + 2 < alturas.length ? alturas[k + 2] - alturas[k + 1] : Infinity];
      if (alturas[k + 1] - alturas[k] > 2 * Math.min(...vizinhos) + 1e-9) { alturas.splice(k + 1, 0, (alturas[k] + alturas[k + 1]) / 2); dividiu = true; }
    }
  }
  let ultima = 'soleira'; let ordem = 0;
  return alturas.map((y) => {
    if (nomeDe.has(y)) { ultima = nomeDe.get(y); ordem = 0; return { nome: ultima, y }; }
    ordem += 1;
    return { nome: `${ultima}${ordem}`, y };
  });
}

/* Os trechos da borda de baixo da lateral, da frente para trás: soleira, arco dianteiro, soleira do meio, arco traseiro, soleira de
   trás. Cada trecho dá pontos [z, y] e o número de divisões sai do passo. */
function trechosDaSoleira(T, f, zIni, zFim) {
  const arco = (zc) => (t) => {
    const a0 = Math.atan2(f.ys - f.rPneu, f.dzArco); // -7,5 graus: o arco passa um pouco abaixo do centro da roda
    const ang = lerp(a0, Math.PI - a0, t);
    return [zc + T.arco_raio * Math.cos(ang), f.rPneu + T.arco_raio * Math.sin(ang)];
  };
  const reta = (z0, z1) => (t) => [lerp(z0, z1, t), f.ys];
  const compArco = T.arco_raio * (Math.PI - 2 * Math.atan2(f.ys - f.rPneu, f.dzArco));
  return [
    { nome: 'soleiraFrente', ponto: reta(zIni, f.zD + f.dzArco), n: Math.max(1, Math.round((zIni - f.zD - f.dzArco) / T.passo_lado)) },
    { nome: 'arcoDianteiro', ponto: arco(f.zD), n: Math.round(compArco / T.passo_arco) },
    { nome: 'soleiraMeio', ponto: reta(f.zD - f.dzArco, f.zT + f.dzArco), n: Math.round((f.zD - f.zT - 2 * f.dzArco) / T.passo_lado) },
    { nome: 'arcoTraseiro', ponto: arco(f.zT), n: Math.round(compArco / T.passo_arco) },
    { nome: 'soleiraTras', ponto: reta(f.zT - f.dzArco, zFim), n: Math.max(1, Math.round((f.zT - f.dzArco - zFim) / T.passo_lado)) },
  ];
}

/**
 * derivar(T) -> a gaiola da chapa e as rodas provisórias, em milímetro e em metro.
 *   pontos: os pontos nomeados da gaiola, em metro, que entram em TOPO;
 *   passo: os campos do passo `subdivisao` (vertices, faces, cantos, medidas, simetria), só com nomes;
 *   aneis, colunas: os nomes, para o teste e para a etapa seguinte citarem a gaiola por nome;
 *   rodas: as quatro rodas provisórias, com o perfil do cilindro e a posição.
 */
export function derivar(T) {
  const f = forma(T);
  const nF = Math.max(2, Math.ceil((f.xMax - T.raio_planta_frente) / T.passo_frente));
  const nCF = T.colunas_quina_frente;
  const nCB = T.colunas_quina_tras;
  if (nCF % 2 || nCB % 2) throw new Error('furgao-realista: as colunas das quinas precisam ser em número par, porque a cobertura do teto toma metade de cada quina');
  const bc = nF + nCF / 2; // colunas da cobertura entre a costura e a lateral
  const nB = bc - nCB / 2;
  if (nB < 2) throw new Error('furgao-realista: a traseira ficou com menos de duas colunas; aumente as da frente ou diminua as da quina de trás');

  /* a borda de baixo da lateral e as colunas dela */
  const zIniLado = f.zF(f.ys) - f.raioFrente(f.ys);
  const zFimLado = f.zR(f.ys) + T.raio_planta_tras;
  const trechos = trechosDaSoleira(T, f, zIniLado, zFimLado);
  const colunasLado = [];
  const bordaDeBaixo = [];
  trechos.forEach((tr, k) => {
    const ate = k === trechos.length - 1 ? tr.n : tr.n - 1;
    for (let i = 0; i <= ate; i += 1) { colunasLado.push(`${tr.nome}${i}`); bordaDeBaixo.push(tr.ponto(i / tr.n)); }
  });
  const nS = colunasLado.length - 1;

  const colunas = [
    ...Array.from({ length: nF + 1 }, (_, k) => `frente${k}`),
    ...Array.from({ length: nCF - 1 }, (_, k) => `quinaFrente${k + 1}`),
    ...colunasLado,
    ...Array.from({ length: nCB - 1 }, (_, k) => `quinaTras${k + 1}`),
    ...Array.from({ length: nB + 1 }, (_, k) => `tras${nB - k}`),
  ];
  const M = colunas.length - 1;

  /* Um anel: as alturas e recuos de cada trecho, e o anel em [x, y, z] na ordem das colunas. `lado`, quando vem, dá os pontos
     [z, y] da lateral, que a grade da faixa dos arcos calcula; sem ele a lateral é a fatia regular da altura yS. */
  const anel = ({ yF, zF, yS, xS, yR, zR, rF, rB, lado = null }) => {
    const pts = [];
    const xFim = xS - rF;
    for (let k = 0; k <= nF; k += 1) pts.push([(xFim * k) / nF, yF, zF]);
    for (let k = 1; k < nCF; k += 1) {
      const a = (k / nCF) * 90 * grau;
      pts.push([xFim + rF * Math.sin(a), lerp(yF, yS, suave(k / nCF)), zF - rF + rF * Math.cos(a)]);
    }
    for (let j = 0; j <= nS; j += 1) {
      if (lado) { const [z, y] = lado[j]; pts.push([f.xs(y), y, z]); } else pts.push([xS, yS, lerp(zF - rF, zR + rB, j / nS)]);
    }
    const xTras = xS - rB;
    for (let k = 1; k < nCB; k += 1) {
      const a = (k / nCB) * 90 * grau;
      pts.push([xTras + rB * Math.cos(a), lerp(yS, yR, suave(k / nCB)), zR + rB - rB * Math.sin(a)]);
    }
    for (let k = nB; k >= 0; k -= 1) pts.push([(xTras * k) / nB, yR, zR]);
    return pts;
  };

  /* A faixa dos arcos: a lateral da soleira até a altura em que ela deixa de ser vertical, onde é plana. A borda de baixo contorna
     os arcos, a de cima é a fatia regular, e as pontas são as junções com as quinas em cada altura. O miolo sai da grade harmônica
     (cada ponto na média dos quatro vizinhos, por iterações de Gauss-Seidel em ordem fixa), que leva as colunas em leque em volta
     dos arcos sem dobrar a face junto da ponta do arco, onde a borda sobe quase na vertical. */
  const horizontais = aneisHorizontais(T, f);
  const ia = horizontais.findIndex((a) => a.y === T.lateral_reta_ate_y);
  const regular = (y, j) => [lerp(f.zF(y) - f.raioFrente(y), f.zR(y) + T.raio_planta_tras, j / nS), y];
  const faixa = horizontais.slice(0, ia + 1).map(({ y }, i) => Array.from({ length: nS + 1 }, (_, j) => {
    if (i === 0) return bordaDeBaixo[j];
    const reg = regular(y, j);
    const peso = 1 - (y - f.ys) / (T.lateral_reta_ate_y - f.ys);
    const reg0 = regular(f.ys, j);
    return [reg[0] + peso * (bordaDeBaixo[j][0] - reg0[0]), reg[1] + peso * (bordaDeBaixo[j][1] - reg0[1])];
  }));
  /* A grade da faixa pelas equações de Winslow (as coordenadas de índice são funções harmônicas da posição, e não o contrário):
     a grade harmônica direta dobrava junto da subida do arco, que deixa o domínio côncavo, e a de Winslow não dobra. Gauss-Seidel
     em ordem fixa, de modo que a gaiola sai igual a cada execução. */
  for (let it = 0; it < T.iteracoes_da_faixa; it += 1) {
    for (let i = 1; i < ia; i += 1) {
      for (let j = 1; j < nS; j += 1) {
        const [n, s, l, o] = [faixa[i + 1][j], faixa[i - 1][j], faixa[i][j + 1], faixa[i][j - 1]];
        const xi = [(l[0] - o[0]) / 2, (l[1] - o[1]) / 2];
        const eta = [(n[0] - s[0]) / 2, (n[1] - s[1]) / 2];
        const alfa = eta[0] ** 2 + eta[1] ** 2; const gama = xi[0] ** 2 + xi[1] ** 2; const beta = xi[0] * eta[0] + xi[1] * eta[1];
        const [ne, no, se, so] = [faixa[i + 1][j + 1], faixa[i + 1][j - 1], faixa[i - 1][j + 1], faixa[i - 1][j - 1]];
        for (const k of [0, 1]) {
          const cruzado = (ne[k] - no[k] - se[k] + so[k]) / 4;
          faixa[i][j][k] = (alfa * (l[k] + o[k]) + gama * (n[k] + s[k]) - 2 * beta * cruzado) / (2 * (alfa + gama));
        }
      }
    }
  }

  /* anéis horizontais, da soleira à altura do ombro */
  const aneis = horizontais.map(({ nome, y }, i) => ({
    nome,
    pts: anel({ yF: y, zF: f.zF(y), yS: y, xS: f.xs(y), yR: y, zR: f.zR(y), rF: f.raioFrente(y), rB: T.raio_planta_tras, lado: i <= ia ? faixa[i] : null }),
  }));

  /* anéis do ombro: cada trecho sobe o seu raio pela fração do arco, da altura do ombro ao teto plano */
  const trechoDoOmbro = (perfil) => { const { pl } = aPartirDe(perfil, T.ombro_y); const s = acumulado(pl); return (t) => pontoNaDistancia(pl, s, t * s.at(-1)); };
  const frenteOmbro = trechoDoOmbro(f.perfilFrente);
  const trasOmbro = trechoDoOmbro(f.perfilTras);
  const ladoOmbro = trechoDoOmbro(f.perfilLado);
  const rF0 = f.raioFrente(T.ombro_y);
  for (let k = 1; k <= T.aneis_do_ombro; k += 1) {
    const t = k / T.aneis_do_ombro;
    const [zF, yF] = frenteOmbro(t); const [zR, yR] = trasOmbro(t); const [xS, yS] = ladoOmbro(t);
    aneis.push({
      nome: k === T.aneis_do_ombro ? 'teto' : `ombro${k}`,
      pts: anel({ yF, zF, yS, xS, yR, zR, rF: lerp(rF0, T.raio_teto_frente, t), rB: lerp(T.raio_planta_tras, T.raio_teto_tras, t) }),
    });
  }

  /* os pontos e as faces das paredes */
  const pontosMm = new Map();
  const nomeDe = (anelNome, coluna) => `${anelNome}_${coluna}`;
  for (const a of aneis) a.pts.forEach((p, j) => pontosMm.set(nomeDe(a.nome, colunas[j]), p));
  const faces = [];
  for (let i = 0; i + 1 < aneis.length; i += 1) {
    for (let j = 0; j < M; j += 1) {
      faces.push([nomeDe(aneis[i].nome, colunas[j]), nomeDe(aneis[i].nome, colunas[j + 1]),
        nomeDe(aneis[i + 1].nome, colunas[j + 1]), nomeDe(aneis[i + 1].nome, colunas[j])]);
    }
  }

  /* a cobertura do teto plano: grade de Coons entre o último anel (frente, lateral e traseira) e a costura, toda em y = altura */
  const teto = aneis.at(-1);
  const A = M - 2 * bc;
  const nomeTeto = (a, b) => {
    if (a === 0) return nomeDe(teto.nome, colunas[b]);
    if (a === A) return nomeDe(teto.nome, colunas[M - b]);
    if (b === bc) return nomeDe(teto.nome, colunas[bc + a]);
    return `cobertura${a}_${b}`;
  };
  const F = (b) => teto.pts[b]; const R = (b) => teto.pts[M - b]; const O = (a) => teto.pts[bc + a];
  const zC0 = F(0)[2]; const zC1 = R(0)[2];
  const S = (a) => [0, T.altura, zC0 + ((O(a)[2] - O(0)[2]) / (O(A)[2] - O(0)[2])) * (zC1 - zC0)];
  for (let a = 1; a < A; a += 1) {
    for (let b = 0; b < bc; b += 1) {
      const u = b / bc; const v = a / A;
      const p = [0, 1, 2].map((k) => (1 - u) * S(a)[k] + u * O(a)[k] + (1 - v) * F(b)[k] + v * R(b)[k]
        - ((1 - u) * (1 - v) * F(0)[k] + u * (1 - v) * F(bc)[k] + (1 - u) * v * R(0)[k] + u * v * R(bc)[k]));
      p[0] = b === 0 ? 0 : p[0];
      p[1] = T.altura;
      pontosMm.set(nomeTeto(a, b), p);
    }
  }
  for (let a = 0; a < A; a += 1) {
    for (let b = 0; b < bc; b += 1) faces.push([nomeTeto(a, b), nomeTeto(a, b + 1), nomeTeto(a + 1, b + 1), nomeTeto(a + 1, b)]);
  }

  const vertices = [...pontosMm.keys()];
  const pontos = Object.fromEntries([...pontosMm].map(([n, p]) => [n, p.map(m)]));
  const cantos = ['arcoDianteiro0', 'soleiraMeio0', 'arcoTraseiro0', 'soleiraTras0'].map((c) => nomeDe('soleira', c));
  /* As dobras de raio curto da prancha viram vincos, porque a gaiola não tem anéis para o raio delas: o topo do para-choque e a
     boca do capô (raios de 30 e 20 mm, nitidez fracionária) e o degrau do para-choque na frente e atrás (vivos, como a prancha
     os desenha). Cada vinco segue o anel pela frente (ou pela traseira) e pela quina, e acaba no começo da lateral, que é plana. */
  const daFrente = colunas.slice(0, nF + nCF + 1);
  const deTras = colunas.slice(M - nB - nCB);
  const vincos = [
    ['parachoque', daFrente, T.nitidez_dobra_frente], ['boca', daFrente, T.nitidez_dobra_frente], ['degrauFrente', daFrente, 'viva'],
    ['degrauTras', deTras, 'viva'], ['degrauTrasTopo', deTras, 'viva'],
  ].map(([anelNome, cols, nitidez]) => ({ nome: `dobra_${anelNome}`, pontos: cols.map((c) => nomeDe(anelNome, c)), nitidez }));

  /* as rodas provisórias: cilindros no pneu da prancha, na bitola e no entre-eixos, apoiados no chão */
  const xDentro = T.bitola / 2 - T.pneu_largura / 2;
  const xFora = T.bitola / 2 + T.pneu_largura / 2;
  const rodas = [];
  for (const [eixo, zc] of [['Dianteira', f.zD], ['Traseira', f.zT]]) {
    for (const [lado, s] of [['Esquerda', 1], ['Direita', -1]]) {
      rodas.push({ nome: `rodaProvisoria${eixo}${lado}`, s, zc, xDentro, xFora, raio: f.rPneu });
    }
  }
  return {
    forma: f, aneis: aneis.map((a) => a.nome), colunas, pontos, pontosMm,
    passo: { vertices, faces, vincos, cantos, simetria: 'x' },
    rodas,
  };
}

/* ---------- passos ---------- */

const CHAPA = { origem: { op: 'subdivisao', id: 1 } };

/** Os PASSOS: a chapa subdividida com espessura, e as quatro rodas provisórias, cada uma com a parte e o material. */
export function gerarPassos(T) {
  const { passo, rodas } = derivar(T);
  const passos = [
    ['subdivisao', { origemId: 1, ...passo, borda: 'cantos', niveis: T.niveis, espessura: m(T.espessura) }],
    ['parte', { nome: 'carroceria', sel: CHAPA }],
    ['material', { sel: CHAPA, usa: 'azul' }],
  ];
  rodas.forEach((r, k) => {
    const sel = { origem: { op: 'lathe', id: 10 + k } };
    passos.push(['lathe', {
      origemId: 10 + k, eixo: 'x', lados: 48,
      perfil: [[0, 0], [m(r.raio), 0], [m(r.raio), m(r.xFora - r.xDentro)], [0, m(r.xFora - r.xDentro)]],
      em: [m(r.s > 0 ? r.xDentro : -r.xFora), m(r.raio), m(r.zc)],
    }]);
    passos.push(['parte', { nome: r.nome, sel }]);
    passos.push(['material', { sel, usa: 'pneu' }]);
    passos.push(['liso', { angulo: 30, sel }]);
  });
  return passos;
}

/* ---------- contatos, ilhas e pontos ---------- */

/* A chapa e as rodas não se tocam: o arco tem 65 mm de folga sobre o pneu e a face de fora do pneu fica 37,5 mm para dentro da lateral. */
export const CONTATOS = [];

const RODAS = ['rodaProvisoriaDianteiraEsquerda', 'rodaProvisoriaDianteiraDireita', 'rodaProvisoriaTraseiraEsquerda', 'rodaProvisoriaTraseiraDireita'];
export const ILHAS = RODAS.map((contem) => ({
  contem,
  motivo: 'roda provisória da etapa 1, apoiada no chão sob o arco e sem tocar a chapa; o cubo, o forro do arco e as rodas da família vêm na etapa 4',
}));

export function pontosDeclarados(T = TABELA) {
  const tol = 1;
  const f = forma(T);
  const xDentro = T.bitola / 2 - T.pneu_largura / 2;
  const xFora = T.bitola / 2 + T.pneu_largura / 2;
  const r = T.pneu_diametro / 2;
  return [
    { nome: 'canto de cima da caixa da carroceria: a lateral, o teto e o nariz', parte: 'carroceria', medida: 'maximo', em: [f.xMax, T.altura, f.zFrente], toleranciaMm: tol },
    { nome: 'canto de baixo da caixa da carroceria: a lateral direita, a soleira e o para-choque de trás', parte: 'carroceria', medida: 'minimo', em: [-f.xMax, T.soleira_y, f.zTras], toleranciaMm: tol },
    { nome: 'pneu dianteiro esquerdo, embaixo, por dentro e atrás', parte: 'rodaProvisoriaDianteiraEsquerda', medida: 'minimo', em: [xDentro, 0, f.zD - r], toleranciaMm: tol },
    { nome: 'pneu traseiro direito, em cima, por dentro e na frente', parte: 'rodaProvisoriaTraseiraDireita', medida: 'maximo', em: [-xDentro, 2 * r, f.zT + r], toleranciaMm: tol },
    { nome: 'pneu traseiro direito, embaixo, por fora e atrás', parte: 'rodaProvisoriaTraseiraDireita', medida: 'minimo', em: [-xFora, 0, f.zT - r], toleranciaMm: tol },
  ];
}

const receita = {
  meta: { nome: 'furgao-realista', desc: 'furgão médio de teto alto com cabine de bico curto, etapa 1: a lataria base em chapa contínua, com os arcos das rodas e as quinas arredondadas, e quatro rodas provisórias' },
  PARAMS: TABELA,
  MATERIAIS: {
    azul: { tipo: 'liso', cor: '#5d75c9' },
    pneu: { tipo: 'liso', cor: '#26262b' },
  },
  /* `origem` diz o referencial; os pontos da gaiola, derivados da TABELA atual, entram aqui pelo nome. */
  get TOPO() {
    return {
      origem: 'chão, no meio do furgão em x e em z; y para cima e a frente do furgão em +z',
      ...derivar(this.PARAMS).pontos,
    };
  },
  PLANO: {
    objeto: 'furgão médio de teto alto, etapa 1: lataria base de 5400 por 2000 por 2500 mm em chapa contínua, cabine de bico curto, laterais verticais, teto alto, arcos das rodas, e rodas provisórias',
    referencias: ['referencias/quatro-vistas.prancha.png', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total da carroceria, do nariz em z 2700 à traseira em z -2700', milimetros: 5400 },
    familia: 'veiculo',
    partes: [
      {
        nome: 'carroceria',
        forma: 'chapa contínua de 2 mm, cabine, carga e teto numa peça: nariz, capô curto a 22,5 graus, para-brisa a 55, teto plano a 2500, laterais verticais, traseira reta, arcos de raio 420 e quinas arredondadas, sem vãos nem frestas',
        tecnica: 'subdivisao de uma gaiola de anéis horizontais e da cobertura do teto, com simetria em x, todos os pontos medidos e espessura',
      },
      ...RODAS.map((nome) => ({
        nome,
        forma: `roda provisória da etapa 1: cilindro de 710 mm de diâmetro e 225 de largura, na bitola de 1700 e no ${nome.includes('Dianteira') ? 'eixo dianteiro' : 'eixo traseiro'}, apoiado no chão; sai na etapa 4`,
        tecnica: 'lathe em torno de x de um retângulo, com 48 lados e sombreamento liso',
      })),
    ],
    criteriosDeReprovacao: [
      'a silhueta lateral, frontal ou de cima se afasta da prancha cotada mais de 15 mm em média ou 40 mm em algum ponto',
      'a cabine não é de bico curto: o capô não emenda quase direto no para-brisa grande e inclinado, ou a coluna do para-brisa não fica sobre a roda dianteira',
      'as laterais não são verticais, ou o teto alto não é plano de ponta a ponta',
      'a chapa tem quina viva onde a prancha arredonda, furo, dobra sobre si ou face virada, ou mostra vão, fresta ou vinco que são da etapa 2',
      'a luz rasante ou a curvatura mostram amassado ou ondulação que a forma não pede',
      'um pneu não toca o chão, ou toca ou atravessa o arco da roda ou a lateral',
      'alguma peça fica solta no ar ou atravessa outra sem motivo',
      'o lado esquerdo e o direito diferem',
      'aparece marca, logotipo ou nome de fabricante',
    ],
    lataria: { partes: ['carroceria'] },
  },
  contatos: CONTATOS,
  ilhas: ILHAS,
  PONTOS: pontosDeclarados(TABELA),
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;

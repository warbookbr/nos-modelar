/* carro-fastback/lataria — o piloto do quarto traseiro: a chapa contínua de lataria do meio da porta (z 0) para trás, lado +x, com o para-lama
 * traseiro saliente, o rebaixo côncavo da lateral, a coluna que cai até a tampa, o arco da roda de trás, o vão do vidro lateral traseiro e o
 * vão da lanterna na quina. Fatia 2 de `docs/modelar/planos/2026-11-14-modelagem-de-carro.md`; as medidas vêm de `../../ALINHAMENTO.md`, do
 * `../../andaime.json` e das pranchas de `../../referencias/` (os pontos da TABELA são lidos delas, em mm, no referencial do carro: x para a
 * direita, y para cima com o chão em 0, z para a frente, o eixo traseiro em z -1375).
 *
 * A FORMA. A chapa é uma `subdivisao` de uma gaiola de `gaiolaPorRede`, e as arestas da gaiola SÃO as curvas planejadas: os cortes da seção em cada
 * estação (de baixo: soleira, base do rebaixo, meio do rebaixo, topo do rebaixo, ombro, quina do teto e eixo do carro) e as linhas ao comprimento por
 * esses mesmos níveis. Todo ponto-chave vem de uma pele analítica da TABELA: a meia largura da planta menos a queda do ombro (a seção traseira)
 * menos o rebaixo (um sino entre a base e o topo, que morre antes do arco), e o teto como uma coroa. A parte de trás da estação `traseira` é a calota
 * da traseira: os níveis dão a volta pela planta (a quina) até o eixo do carro. O arco, o vidro lateral e a lanterna são vãos abertos na chapa
 * pronta por `aberturaPorContorno`, porque a gaiola só precisa seguir as feições que a superfície carrega.
 *
 * NOTA PARA A PRÓXIMA ETAPA. O arco é `furoPassante` (cilindro de eixo x), e não borda livre da gaiola, porque `aberturaPorContorno` exige o vão inteiro dentro da chapa e o
 * arco abre pela soleira; o vidro lateral não corta com mais de seis estações (a grade de 9 estações fez o corte deixar borda que não fecha). A simetria em x está
 * declarada na rede (a chapa sai com os dois lados); as partes `paralamaTraseiro` e `rebaixoLateral` são regiões do lado +x. O degrau de 55 mm do ombro até a
 * base da coluna, que a seção traseira mostra, não entrou: um ponto-chave ali deu raio de 0,4 mm no vinco e a espessura inverteu faces. O spoiler fica fora desta etapa.
 *
 * A cadeia: a TABELA em mm; `derivar` calcula a pele, os nós, as curvas e os retalhos; `gerarPassos` converte para metro com `m()`. */
import { gaiolaPorRede } from '../../../../../nucleo/gaiola-por-rede.js';
import { furoPassante } from '../../../../../nucleo/furo-passante.js';

const m = (mm) => mm / 1000;

export const TABELA = {
  /* a chapa e a malha: espessura de chapa de aço, espaçamento da gaiola e níveis de subdivisão */
  chapa: { espessura: 2, passo: 70, niveis: 2, anguloMax: 15 },
  /* a planta: a meia largura máxima da lataria pelo comprimento, [z, x], lida da vista de cima (320 mm de porta a 912, o ombro do para-lama a 950 em z -1300, a quina da traseira) */
  planta: [[300, 912], [-750, 912], [-950, 940], [-1300, 950], [-1700, 930], [-1850, 893], [-2050, 840]],
  /* a quina da traseira em planta, [z, x], de z -2050 ao eixo do carro; a calota usa estes pontos em cada nível */
  quina: [[-1850, 893], [-2050, 840], [-2150, 770], [-2250, 690], [-2340, 400], [-2372, 120], [-2375, 0]],
  /* a queda do ombro: quanto a seção sai para dentro da meia largura da planta em cada altura, [y, mm], lida da seção traseira (952 a y 600, 795 a y 978) */
  queda: [[170, 30], [210, 22], [300, 0], [600, 0], [758, 12], [827, 47], [932, 107], [978, 157], [1010, 150]],
  /* as alturas dos níveis ao comprimento, [z, y]: a soleira (a borda de baixo), a base e o topo do rebaixo e o ombro (cintura na porta, ombro do para-lama atrás) */
  soleira: [[0, 170], [-1200, 170], [-1744, 250], [-1960, 256], [-2050, 262]],
  baseDoRebaixo: [[0, 395], [-618, 420], [-1000, 640], [-1250, 715], [-2050, 700]],
  topoDoRebaixo: [[0, 790], [-724, 811], [-1023, 836], [-1300, 860], [-2050, 900]],
  ombro: [[0, 955], [-657, 996], [-1000, 1000], [-1300, 1004], [-2050, 1008]],
  /* quanto a seção da porta cai mais para dentro que a do para-lama no ombro, mm */
  ombroDaPorta: 12,
  /* o rebaixo côncavo: a profundidade máxima na porta (mm), e de onde ela começa a morrer até onde some (z) */
  rebaixo: { profundidade: 20, cheioAte: -300, someEm: -1150 },
  /* a quina do teto e a coluna, [z, x, y]: do teto sobre a porta, o vidro lateral traseiro e a coluna caindo até a tampa */
  quinaDoTeto: [[0, 612, 1262], [-400, 600, 1288], [-800, 620, 1262], [-1200, 625, 1135], [-1600, 520, 1090], [-2050, 430, 1049]],
  /* o eixo do carro, a linha do teto à tampa, [z, y]: o teto sobre a porta, o pico, a queda do fastback e a tampa */
  teto: [[0, 1346], [-320, 1381], [-728, 1341], [-1000, 1300], [-1132, 1269], [-1500, 1168], [-1893, 1059], [-2000, 1049], [-2050, 1048], [-2170, 1041], [-2210, 1037]],
  /* o perfil da traseira no eixo do carro, [y, z]: de cima para baixo, da borda da tampa ao fundo; a calota desloca cada nível por ele */
  traseira: [[1037, -2210], [961, -2224], [881, -2241], [845, -2258], [760, -2321], [629, -2369], [570, -2375], [500, -2373], [416, -2350], [333, -2302]],
  /* a coroa do teto, expoente da seção entre a quina do teto e o eixo (a seção traseira: 3 mm a 300 de 590, 30 mm a 487) */
  coroa: 3.5,
  /* as estações ao comprimento, z; a última é a que fecha a calota da traseira */
  estacoes: [0, -400, -800, -1200, -1600, -1850],
  /* o vinco do ombro (a quina entre a lateral e a faixa do teto) e da quina do teto, nitidez de 0 a 1 */
  vincos: { ombro: 0.55, quinaDoTeto: 0.4, bordaDaTampa: 0.2 },
  /* o arco da roda traseira: centro no eixo traseiro, raio da prancha (pneu de 340 mais 40) */
  arco: { z: -1375, y: 340, raio: 380, lados: 96 },
  /* as partes por região da chapa, caixas [min, max] em mm: o para-lama saliente (atrás da porta, sobre o arco) e o rebaixo da lateral (do meio da porta até morrer no arco); o rebaixo vale onde as duas se sobrepõem */
  partes: { paralama: { min: [780, 250, -1950], max: [960, 1010, -900] }, rebaixo: { min: [780, 380, -1150], max: [960, 840, 1] } },
  /* o vão do vidro lateral traseiro, [z, y] do contorno da prancha lateral (a borda de fora da moldura) */
  vidroLateral: [[-703, 1001], [-692, 1009], [-702, 1247], [-712, 1258], [-719, 1258], [-910, 1218], [-1008, 1190], [-1199, 1121], [-1211, 1102], [-1205, 1091], [-1128, 1045], [-1084, 1031], [-911, 1013]],
  /* o vão da lanterna, [x, y] vistos de trás: do painel escuro à quina, na altura entre o refletor e a borda da tampa */
  lanterna: { x0: 466, x1: 760, y0: 694, y1: 905, raio: 24 },
};

/* ---------------------------------------------------------------- interpolação */

/** Interpolação cúbica monótona (Fritsch-Carlson) de uma tabela [x, y], em qualquer ordem de x; fora do intervalo, o valor da ponta. */
export function pchip(tabela) {
  const t = [...tabela].sort((a, b) => a[0] - b[0]);
  const n = t.length;
  const h = []; const d = [];
  for (let i = 0; i < n - 1; i += 1) { h.push(t[i + 1][0] - t[i][0]); d.push((t[i + 1][1] - t[i][1]) / h[i]); }
  const s = new Array(n).fill(0);
  if (n === 2) { s[0] = d[0]; s[1] = d[0]; } else {
    for (let i = 1; i < n - 1; i += 1) {
      if (d[i - 1] * d[i] <= 0) s[i] = 0;
      else { const w1 = 2 * h[i] + h[i - 1]; const w2 = h[i] + 2 * h[i - 1]; s[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
    }
    const ponta = (h0, h1, d0, d1) => { let v = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1); if (v * d0 <= 0) v = 0; else if (d0 * d1 <= 0 && Math.abs(v) > 3 * Math.abs(d0)) v = 3 * d0; return v; };
    s[0] = ponta(h[0], h[1], d[0], d[1]);
    s[n - 1] = ponta(h[n - 2], h[n - 3], d[n - 2], d[n - 3]);
  }
  return (x) => {
    if (x <= t[0][0]) return t[0][1];
    if (x >= t[n - 1][0]) return t[n - 1][1];
    let i = 0; while (x > t[i + 1][0]) i += 1;
    const u = (x - t[i][0]) / h[i]; const u2 = u * u; const u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * t[i][1] + (u3 - 2 * u2 + u) * h[i] * s[i] + (-2 * u3 + 3 * u2) * t[i + 1][1] + (u3 - u2) * h[i] * s[i + 1];
  };
}

const suave = (u) => { const s = Math.min(1, Math.max(0, u)); return s * s * (3 - 2 * s); };

/** A pele analítica da TABELA: as funções de que os pontos-chave das curvas saem. */
export function pele(T) {
  const W = pchip([[1000, 912], ...T.planta]);
  const quedaDe = pchip(T.queda);
  const yBase = pchip(T.baseDoRebaixo); const yTopo = pchip(T.topoDoRebaixo);
  const yOmbro = pchip(T.ombro); const ySoleira = pchip(T.soleira);
  const yTeto = pchip(T.teto);
  const zx = pchip(T.quinaDoTeto.map(([z, x]) => [z, x])); const zy = pchip(T.quinaDoTeto.map(([z, , y]) => [z, y]));
  const { profundidade, cheioAte, someEm } = T.rebaixo;
  const fundo = (z) => profundidade * suave((z - someEm) / (cheioAte - someEm));
  const rebaixo = (z, y) => {
    const b = yBase(z); const t = yTopo(z);
    if (y <= b || y >= t) return 0;
    const s = Math.sin((Math.PI * (y - b)) / (t - b));
    return fundo(z) * s * s;
  };
  /* a porta cai um pouco mais para dentro que o para-lama: a base da cabine (745 na seção traseira) fica 12 mm mais para dentro que a do ombro de trás, e o efeito some até z -1000 */
  const portaExtra = (z, y) => T.ombroDaPorta * suave((y - 850) / 150) * suave((z + 1000) / 300);
  const xLado = (z, y) => W(z) - quedaDe(y) - portaExtra(z, y) - rebaixo(z, y);
  const R = (z) => [zx(z), zy(z)];
  const coroa = (z, x) => { const [xr, yr] = R(z); return yTeto(z) - (yTeto(z) - yr) * (x / xr) ** T.coroa; };
  /* a calota: o ponto do nível em y0 (em z -2050) até y1 (no eixo), numa planta da quina, deslocado pelo perfil da traseira */
  const zEixo = pchip(T.traseira.map(([y, z]) => [y, z]));
  const quina = (y0, y1, f) => {
    const [zq0, xq0] = T.quina[0];
    return T.quina.map(([z, x]) => {
      const w = (zq0 - z) / (zq0 - T.quina[T.quina.length - 1][0]);
      const y = y0 + (y1 - y0) * w;
      return [x - (quedaDe(y) * x) / xq0 * f, y, z + (zEixo(y) + 2375) * w * f];
    });
  };
  return { W, quedaDe, yBase, yTopo, yOmbro, ySoleira, yTeto, R, fundo, rebaixo, xLado, coroa, zEixo, quina };
}

const NIVEIS = ['soleira', 'base', 'meio', 'topo', 'ombro', 'quina', 'eixo'];

/** A gaiola por rede de curvas: os nós em mm, as curvas ao comprimento e as seções, os retalhos. */
export function derivar(T) {
  const P = pele(T);
  const zs = T.estacoes;
  const zJ = zs[zs.length - 1];
  const yDe = (z) => ({ soleira: P.ySoleira(z), base: P.yBase(z), topo: P.yTopo(z), ombro: P.yOmbro(z) });
  /* o ponto de cada nível numa seção de z */
  const nivel = (z) => {
    const y = yDe(z); const ym = (y.base + y.topo) / 2;
    const lado = (yy) => [P.xLado(z, yy), yy, z];
    const [xr, yr] = P.R(z);
    return { soleira: lado(y.soleira), base: lado(y.base), meio: lado(ym), topo: lado(y.topo), ombro: lado(y.ombro), quina: [xr, yr, z], eixo: [0, P.yTeto(z), z] };
  };
  const nos = {};
  const nome = (i, j) => `e${i}_${NIVEIS[j]}`;
  zs.forEach((z, i) => { const n = nivel(z); NIVEIS.forEach((k, j) => { nos[nome(i, j)] = n[k].map((c) => +c.toFixed(4)); }); });

  /* a seção de uma estação: os pontos-chave intermediários entre os nós, na pele */
  const secao = (i) => {
    const z = zs[i]; const n = nivel(z); const pts = [];
    const lado = (a, b, k) => { for (let q = 1; q <= k; q += 1) { const yy = a + ((b - a) * q) / (k + 1); pts.push([P.xLado(z, yy), yy, z]); } };
    const ys = NIVEIS.slice(0, 5).map((k) => n[k][1]);
    for (let j = 0; j < 4; j += 1) { pts.push(nome(i, j)); lado(ys[j], ys[j + 1], 1); }
    pts.push(nome(i, 4));
    pts.push([(n.ombro[0] + n.quina[0]) / 2, (n.ombro[1] + n.quina[1]) / 2, z]);
    pts.push(nome(i, 5));
    for (const f of [0.75, 0.5, 0.25]) { const x = n.quina[0] * f; pts.push([x, P.coroa(z, x), z]); }
    pts.push(nome(i, 6));
    return pts;
  };
  const curvas = zs.map((z, i) => ({ nome: `S${i}`, pontos: secao(i) }));

  /* as linhas ao comprimento: um ponto-chave a cada ~100 mm entre as estações */
  const entreEstacoes = (j, ponto) => {
    const pts = [];
    zs.forEach((z, i) => {
      pts.push(nome(i, j));
      if (i < zs.length - 1) { const z1 = zs[i + 1]; const k = Math.max(1, Math.round((z - z1) / 130) - 1); for (let q = 1; q <= k; q += 1) pts.push(ponto(z + ((z1 - z) * q) / (k + 1), j)); }
    });
    return pts;
  };
  const ponto = (z, j) => {
    const y = yDe(z); const ym = (y.base + y.topo) / 2;
    const yy = [y.soleira, y.base, ym, y.topo, y.ombro][j];
    if (j < 5) return [P.xLado(z, yy), yy, z];
    if (j === 5) { const [xr, yr] = P.R(z); return [xr, yr, z]; }
    return [0, P.yTeto(z), z];
  };
  const vincosDe = { 4: T.vincos.ombro, 5: T.vincos.quinaDoTeto };
  NIVEIS.forEach((k, j) => curvas.push({ nome: `L${j}`, pontos: entreEstacoes(j, ponto), ...(vincosDe[j] ? { vinco: vincosDe[j] } : {}) }));

  /* a calota: cada nível dá a volta pela quina da estação da traseira até o eixo do carro */
  const yEixo = [T.traseira[9][0], 700, 800, 900, 1037];
  const yTras = [P.ySoleira(zJ), P.yBase(zJ), (P.yBase(zJ) + P.yTopo(zJ)) / 2, P.yTopo(zJ), P.yOmbro(zJ)];
  /* o perfil da traseira no eixo: de y 300 (o fundo) a 1037 (a borda da tampa) */
  const nosEixo = {};
  const yFundoEixo = 305;
  const yCalota = [yFundoEixo, 700, 800, 900, 1037];
  yCalota.forEach((y, j) => { nosEixo[`t_${NIVEIS[j]}`] = [0, y, P.zEixo(y)].map((c) => +c.toFixed(4)); });
  Object.assign(nos, nosEixo);
  for (let j = 0; j < 5; j += 1) {
    const pts = P.quina(yTras[j], yCalota[j], 1).map((p) => p.map((c) => +c.toFixed(4)));
    pts[0] = nome(zs.length - 1, j); pts[pts.length - 1] = `t_${NIVEIS[j]}`;
    curvas.push({ nome: `Q${j}`, pontos: pts, ...(j === 4 ? { vinco: T.vincos.bordaDaTampa } : {}) });
  }
  /* o perfil da traseira no eixo do carro, de cima para baixo pelos nós */
  const perfil = [`t_ombro`];
  for (const [y, z] of T.traseira.slice(1)) { if (y > 990 || y < 320) continue; if (Math.abs(y - 900) < 25 || Math.abs(y - 800) < 25 || Math.abs(y - 700) < 25) continue; perfil.push([0, y, z]); }
  const ordem = [['t_topo', 900], ['t_meio', 800], ['t_base', 700]];
  const perfilTodo = [];
  const eixoY = [['t_ombro', 1037], ...ordem, ['t_soleira', yFundoEixo]];
  for (let q = 0; q < eixoY.length; q += 1) {
    perfilTodo.push(eixoY[q][0]);
    if (q < eixoY.length - 1) { const a = eixoY[q][1]; const b = eixoY[q + 1][1]; const k = Math.max(0, Math.round((a - b) / 120) - 1); for (let s = 1; s <= k; s += 1) { const y = a + ((b - a) * s) / (k + 1); perfilTodo.push([0, y, P.zEixo(y)]); } }
  }
  curvas.push({ nome: 'perfilDaTraseira', pontos: perfilTodo });

  /* a tampa atrás da estação da traseira: a quina do teto vai ao eixo e o eixo segue até a borda */
  const iJ = zs.length - 1;
  curvas.push({ nome: 'Qeixo', pontos: [nome(iJ, 6), ...[0.4, 0.75].map((f) => { const z = zJ + (-2210 - zJ) * f; return [0, P.yTeto(z), z]; }), 't_ombro'] });

  const retalhos = [];
  const lado = (curva, de, ate) => ({ curva, de, ate });
  for (let i = 0; i < zs.length - 1; i += 1) {
    for (let j = 0; j < 6; j += 1) {
      retalhos.push({ nome: `r${i}_${NIVEIS[j]}`, borda: [lado(`L${j}`, nome(i, j), nome(i + 1, j)), lado(`S${i + 1}`, nome(i + 1, j), nome(i + 1, j + 1)), lado(`L${j + 1}`, nome(i + 1, j + 1), nome(i, j + 1)), lado(`S${i}`, nome(i, j + 1), nome(i, j))] });
    }
  }
  for (let j = 0; j < 4; j += 1) {
    retalhos.push({ nome: `c_${NIVEIS[j]}`, borda: [lado(`Q${j}`, nome(iJ, j), `t_${NIVEIS[j]}`), lado('perfilDaTraseira', `t_${NIVEIS[j]}`, `t_${NIVEIS[j + 1]}`), lado(`Q${j + 1}`, `t_${NIVEIS[j + 1]}`, nome(iJ, j + 1)), lado(`S${iJ}`, nome(iJ, j + 1), nome(iJ, j))] });
  }
  retalhos.push({ nome: 'c_tampa', borda: [lado(`S${iJ}`, nome(iJ, 4), nome(iJ, 6)), lado('Qeixo', nome(iJ, 6), 't_ombro'), lado('Q4', 't_ombro', nome(iJ, 4))] });

  const rede = gaiolaPorRede({ passo: T.chapa.passo, anguloMax: T.chapa.anguloMax, fora: [1, 0, 0], simetria: 'x', nos, curvas, retalhos });
  return { rede, P, zs };
}

/** O contorno de um vão em metro, escrito fechado, de uma lista de pontos [u, v] em mm: os cantos vivos ficam vivos. */
const contornoDe = (pontos) => ({ inicio: pontos[0].map(m), trechos: [...pontos.slice(1), pontos[0]].map((q) => ({ reto: q.map(m) })) });

/** O retângulo [x0, x1] por [y0, y1] com os quatro cantos arredondados em `raio`, em pontos, de 4 passos por canto. */
function retanguloArredondado(x0, x1, y0, y1, raio) {
  const pts = [];
  const canto = (cx, cy, a0) => { for (let k = 0; k <= 4; k += 1) { const a = ((a0 + 90 * (k / 4)) * Math.PI) / 180; pts.push([cx + raio * Math.cos(a), cy + raio * Math.sin(a)]); } };
  canto(x1 - raio, y1 - raio, 0); canto(x0 + raio, y1 - raio, 90); canto(x0 + raio, y0 + raio, 180); canto(x1 - raio, y0 + raio, 270);
  return pts;
}

/** Uma caixa [min, max] em mm vira a região de seleção em metro; a face entra se estiver inteira nela. */
const caixa = ({ min, max }) => ({ min: min.map(m), max: max.map(m), modo: 'contem' });

const ARCO = { origem: { op: 'subtrair', id: 3 } };
const VIDRO = { origem: { op: 'aberturaPorContorno', id: 4 } };
const LANTERNA = { origem: { op: 'aberturaPorContorno', id: 5 } };

const furoDoArco = (T) => furoPassante({ solido: { origem: { op: 'subdivisao', id: 1 } }, posicao: [0, T.arco.y, T.arco.z], direcao: 'x', raio: T.arco.raio, comprimento: 2 * T.planta[3][1] + 300, lados: T.arco.lados, ids: { cilindro: 2, subtrair: 3 }, nome: 'arco' });
export const ALIASES = furoDoArco(TABELA).aliases;

/** Os PASSOS, em metro: a chapa subdividida com espessura e os três vãos abertos nela, o arco, o vidro lateral e a lanterna. */
export function gerarPassos(T) {
  const { rede } = derivar(T);
  const L = T.lanterna;
  const arco = furoDoArco(T);
  return [
    ['subdivisao', { origemId: 1, ...rede.passo, borda: 'cantos', niveis: T.chapa.niveis, espessura: m(T.chapa.espessura) }],
    ...arco.passos,
    ['aberturaPorContorno', { origemId: 4, chapa: ARCO, vista: 'x', sentido: '+', contorno: contornoDe(T.vidroLateral) }],
    ['aberturaPorContorno', { origemId: 5, chapa: VIDRO, vista: 'z', contorno: contornoDe(retanguloArredondado(L.x0, L.x1, L.y0, L.y1, L.raio)) }],
    ['parte', { nome: 'chapa', sel: LANTERNA }],
    ['parte', { nome: 'paralamaTraseiro', substituir: true, sel: { regiao: caixa(T.partes.paralama) } }],
    ['parte', { nome: 'rebaixoLateral', substituir: true, sel: { regiao: caixa(T.partes.rebaixo) } }],
  ];
}

/* Os extremos da caixa da chapa (o lado de x negativo inteiro e o de x positivo sem as duas regiões de parte): o fundo de trás, a soleira e o teto. */
export const PONTOS = [
  { nome: 'canto de baixo de trás da chapa: o lado -x, a soleira e o fim da traseira', parte: 'chapa', medida: 'minimo', em: [-TABELA.planta[3][1], TABELA.soleira[0][1], TABELA.quina[TABELA.quina.length - 1][0]], toleranciaMm: 6 },
  { nome: 'canto de cima da frente da chapa: o teto sobre a porta, no corte de z 0', parte: 'chapa', medida: 'maximo', em: [TABELA.planta[2][1] - 10, TABELA.teto[1][1], 0], toleranciaMm: 6 },
];

const receita = {
  meta: { nome: 'carro-fastback/lataria', desc: 'o quarto traseiro do cupê fastback: chapa contínua do meio da porta para trás, com para-lama saliente, rebaixo, coluna, arco e vãos' },
  PARAMS: TABELA,
  ALIASES,
  get TOPO() { return { origem: 'o centro do carro no chão: x para a direita, y para cima, a frente em +z', ...derivar(this.PARAMS).rede.pontos }; },
  PLANO: {
    objeto: 'o quarto traseiro de um cupê fastback de 4750 mm, do meio da porta para trás, lado +x',
    referencias: ['../../referencias/lateral.prancha.svg', '../../referencias/traseira.prancha.svg', '../../referencias/superior.prancha.svg'],
    escala: { medida: 'comprimento total do carro, de z -2375 a 2375', milimetros: 4750 },
    partes: [
      { nome: 'chapa', forma: 'chapa contínua de 2 mm do meio da porta à traseira, lisa, com o teto, a coluna que cai até a tampa, a quina da traseira, o arco da roda de trás, o vão do vidro lateral traseiro e o vão da lanterna', tecnica: 'subdivisao de uma gaiolaPorRede cujas arestas seguem as curvas da prancha, com os vãos por furoPassante e aberturaPorContorno' },
      { nome: 'paralamaTraseiro', forma: 'a faixa da chapa do para-lama traseiro, que sai 38 mm sobre a linha da porta vista de cima, sem moldura de arco', tecnica: 'região da mesma chapa, da pele analítica da planta (meia largura 950 contra 912)' },
      { nome: 'rebaixoLateral', forma: 'o rebaixo côncavo em cunha da lateral, do meio da porta até morrer antes do arco, sob o vinco do ombro', tecnica: 'região da mesma chapa, com um sino de profundidade entre a base e o topo do rebaixo' },
    ],
    criteriosDeReprovacao: [
      'a chapa não vai de z 0 a -2375, ou a silhueta de lado, de cima ou de trás sai da prancha além da tolerância da rodada',
      'o para-lama traseiro não sai cerca de 40 mm sobre a linha da porta, ou ganha moldura de arco',
      'o rebaixo da lateral é convexo, ou continua além do arco traseiro, ou some antes da porta',
      'falha de ondulação fora das saliências declaradas, quina do ombro sem raio, ou aresta facetada',
      'o vão do vidro lateral, o arco da roda ou o vão da lanterna ausentes, ou a coluna sem cair até a tampa',
    ],
    lataria: { partes: ['chapa'] },
    saliencias: [
      { regiao: { min: [780, 250, -1950], max: [960, 1010, -700] }, sentido: 'fora', amplitudeMm: 38, motivo: 'o para-lama traseiro sai 38 mm sobre a linha da porta (950 contra 912 de meia largura, vista de cima), sem moldura, por desenho' },
      { regiao: { min: [780, 380, -1200], max: [960, 840, 1] }, sentido: 'dentro', amplitudeMm: 20, motivo: 'o rebaixo côncavo em cunha da lateral, da porta ao arco traseiro, sob o vinco do ombro, é feição de dupla curvatura desenhada' },
    ],
  },
  PONTOS,
  contatos: [],
  /* Os dois vãos por contorno ficam sem moldura nesta etapa: o vidro e a borracha são da etapa de vidros e a lanterna é peça de borda, que a fatia 5 põe atrás do vão. */
  vaos: [
    { nome: 'vidroLateralTraseiro', superficie: { op: 'aberturaPorContorno', id: 4 }, semMoldura: { motivo: 'o vidro e a borracha do lateral traseiro são da etapa de vidros, que assenta na borda deste vão' } },
    { nome: 'vaoDaLanterna', superficie: { op: 'aberturaPorContorno', id: 5 }, semMoldura: { motivo: 'a lanterna é peça de borda da etapa de frente e traseira, posta atrás deste vão' } },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;

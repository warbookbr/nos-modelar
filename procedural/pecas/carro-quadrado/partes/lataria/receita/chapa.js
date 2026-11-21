/* carro-quadrado/lataria/receita/chapa.js — gaiola da chapa contínua, arcos de roda e helpers de abertura. */
import { gaiolaPorRede } from '../../../../../nucleo/gaiola-por-rede.js';
import { furoPassante } from '../../../../../nucleo/furo-passante.js';

export const m = (mm) => mm / 1000;
const suave = (t) => { const u = Math.max(0, Math.min(1, t)); return u * u * u * (u * (6 * u - 15) + 10); };

const NIVEIS = ['soleira', 'baixo', 'meio', 'cintura', 'quina', 'eixo'];
const LADO = 4;

function pontoSecao(T, z, j) {
  const s = T.secoes[String(z)];
  if (j < 5) return [s[j][0], s[j][1], z];
  return [0, s[5], z];
}

function interpArco(a, b, f) {
  const t = suave(f);
  const ang = (Math.PI / 2) * f;
  const x = a[0] * Math.cos(ang) + b[0] * (1 - Math.cos(ang));
  const z = a[2] + (b[2] - a[2]) * Math.sin(ang);
  const y = a[1] + (b[1] - a[1]) * t;
  return [x, y, z];
}

export function derivarChapa(T) {
  const zs = T.estacoes;
  const iJ = zs.length - 1;
  const nos = {};
  const nome = (i, j) => `e${i}_${NIVEIS[j]}`;
  const fixo = (p) => p.map((c) => +c.toFixed(3));

  zs.forEach((z, i) => {
    NIVEIS.forEach((_, j) => { nos[nome(i, j)] = fixo(pontoSecao(T, z, j)); });
  });
  for (let j = 0; j < LADO; j += 1) {
    nos[`f_${NIVEIS[j]}`] = fixo(T.frente[j]);
    nos[`t_${NIVEIS[j]}`] = fixo(T.traseira[j]);
  }
  nos.f_quina = fixo([650, 775, 1962]);
  nos.t_quina = fixo([745, 955, -2005]);

  const curvas = [];
  zs.forEach((z, i) => {
    const p = i === 0 || i === iJ ? { peso: 0.05 } : {};
    curvas.push({ nome: `S${i}_baixo`, pontos: [0, 1, 2, 3].map((j) => nome(i, j)), ...p });
    curvas.push({ nome: `S${i}_pilar`, pontos: [nome(i, 3), nome(i, 4)], ...p });
    curvas.push({ nome: `S${i}_teto`, pontos: [nome(i, 4), nome(i, 5)], ...p });
  });
  const curvaS = (i, j) => (j < 3 ? `S${i}_baixo` : j === 3 ? `S${i}_pilar` : `S${i}_teto`);

  NIVEIS.forEach((_, j) => {
    const pts = zs.map((_, i) => nome(i, j));
    const vinco = j === 3 ? T.vincos.cintura : j === 4 ? T.vincos.quina : undefined;
    curvas.push({ nome: `L${j}`, pontos: pts, ...(vinco ? { vinco } : {}) });
  });

  for (let j = 0; j < LADO - 1; j += 1) {
    const a = nos[nome(0, j)];
    const b = nos[`f_${NIVEIS[j]}`];
    curvas.push({ nome: `F${j}`, pontos: [nome(0, j), fixo(interpArco(a, b, 0.33)), fixo(interpArco(a, b, 0.67)), `f_${NIVEIS[j]}`], peso: 0.05 });
  }
  curvas.push({ nome: 'F3', pontos: [nome(0, 3), fixo(interpArco(nos[nome(0, 3)], nos.f_quina, 0.5)), 'f_quina', fixo([220, nos.f_cintura[1], nos.f_cintura[2]]), 'f_cintura'], peso: 0.05 });
  curvas.push({ nome: 'Fquina', pontos: [nome(0, 4), 'f_quina'], peso: 0.05 });
  curvas.push({ nome: 'perfilFrente', pontos: Array.from({ length: LADO }, (_, k) => `f_${NIVEIS[LADO - 1 - k]}`), peso: 0.05 });
  const fe = nos[nome(0, 5)];
  const fc = nos.f_cintura;
  curvas.push({ nome: 'Feixo', pontos: [nome(0, 5), fixo([0, (fe[1] + fc[1]) / 2, (fe[2] + fc[2]) / 2]), 'f_cintura'], peso: 0.05 });

  for (let j = 0; j < LADO - 1; j += 1) {
    const a = nos[nome(iJ, j)];
    const b = nos[`t_${NIVEIS[j]}`];
    /* traseira quadrada: dobra firme no canto e chega reta até o centro x = 0 */
    const p1 = fixo([a[0] * 0.96, a[1] + (b[1] - a[1]) * 0.4, b[2] + 18]);
    const p2 = fixo([a[0] * 0.55, a[1] + (b[1] - a[1]) * 0.85, b[2] + 3]);
    curvas.push({ nome: `Q${j}`, pontos: [nome(iJ, j), p1, p2, `t_${NIVEIS[j]}`], peso: 0.05 });
  }
  curvas.push({ nome: 'Q3', pontos: [nome(iJ, 3), fixo([760, 952, -1985]), 't_quina', fixo([380, nos.t_cintura[1], nos.t_cintura[2]]), 't_cintura'], peso: 0.05 });
  curvas.push({ nome: 'Qquina', pontos: [nome(iJ, 4), 't_quina'], peso: 0.05 });
  curvas.push({ nome: 'perfilTraseira', pontos: Array.from({ length: LADO }, (_, k) => `t_${NIVEIS[LADO - 1 - k]}`), peso: 0.05 });
  const te = nos[nome(iJ, 5)];
  const tc = nos.t_cintura;
  curvas.push({ nome: 'Teixo', pontos: [nome(iJ, 5), fixo([0, (te[1] + tc[1]) / 2, (te[2] + tc[2]) / 2]), 't_cintura'], peso: 0.05 });

  const retalhos = [];
  const lado = (curva, de, ate) => ({ curva, de, ate });
  for (let i = 0; i < iJ; i += 1) {
    for (let j = 0; j < NIVEIS.length - 1; j += 1) {
      retalhos.push({
        nome: `r${i}_${NIVEIS[j]}`,
        borda: [
          lado(`L${j}`, nome(i, j), nome(i + 1, j)),
          lado(curvaS(i + 1, j), nome(i + 1, j), nome(i + 1, j + 1)),
          lado(`L${j + 1}`, nome(i + 1, j + 1), nome(i, j + 1)),
          lado(curvaS(i, j), nome(i, j + 1), nome(i, j)),
        ],
      });
    }
  }
  for (let j = 0; j < LADO - 1; j += 1) {
    retalhos.push({
      nome: `f_${NIVEIS[j]}`,
      borda: [
        lado(`F${j}`, nome(0, j), `f_${NIVEIS[j]}`),
        lado('perfilFrente', `f_${NIVEIS[j]}`, `f_${NIVEIS[j + 1]}`),
        lado(`F${j + 1}`, `f_${NIVEIS[j + 1]}`, nome(0, j + 1)),
        lado('S0_baixo', nome(0, j + 1), nome(0, j)),
      ],
    });
    retalhos.push({
      nome: `c_${NIVEIS[j]}`,
      borda: [
        lado(`Q${j}`, nome(iJ, j), `t_${NIVEIS[j]}`),
        lado('perfilTraseira', `t_${NIVEIS[j]}`, `t_${NIVEIS[j + 1]}`),
        lado(`Q${j + 1}`, `t_${NIVEIS[j + 1]}`, nome(iJ, j + 1)),
        lado(`S${iJ}_baixo`, nome(iJ, j + 1), nome(iJ, j)),
      ],
    });
  }
  retalhos.push({
    nome: 'f_capo_canto',
    borda: [lado('S0_pilar', nome(0, 3), nome(0, 4)), lado('Fquina', nome(0, 4), 'f_quina'), lado('F3', 'f_quina', nome(0, 3))],
  });
  retalhos.push({
    nome: 'f_capo_centro',
    borda: [lado('S0_teto', nome(0, 4), nome(0, 5)), lado('Feixo', nome(0, 5), 'f_cintura'), lado('F3', 'f_cintura', 'f_quina'), lado('Fquina', 'f_quina', nome(0, 4))],
  });
  retalhos.push({
    nome: 'c_tampa_canto',
    borda: [lado(`S${iJ}_pilar`, nome(iJ, 3), nome(iJ, 4)), lado('Qquina', nome(iJ, 4), 't_quina'), lado('Q3', 't_quina', nome(iJ, 3))],
  });
  retalhos.push({
    nome: 'c_tampa_centro',
    borda: [lado(`S${iJ}_teto`, nome(iJ, 4), nome(iJ, 5)), lado('Teixo', nome(iJ, 5), 't_cintura'), lado('Q3', 't_cintura', 't_quina'), lado('Qquina', 't_quina', nome(iJ, 4))],
  });

  const rede = gaiolaPorRede({
    passo: T.chapa.passo,
    anguloMax: T.chapa.anguloMax,
    fora: [1, 0, 0],
    simetria: 'x',
    nos,
    curvas,
    retalhos,
    interior: false,
    liso: T.chapa.liso,
  });
  return { rede, zs };
}

export function projetarVista(vista, pontos) {
  const l = Math.hypot(...vista);
  const d = vista.map((c) => c / l);
  let u = [d[2], 0, -d[0]];
  const lu = Math.hypot(...u);
  u = lu < 1e-9 ? [1, 0, 0] : u.map((c) => c / lu);
  const v = [
    d[1] * u[2] - d[2] * u[1],
    d[2] * u[0] - d[0] * u[2],
    d[0] * u[1] - d[1] * u[0],
  ];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return pontos.map(([x, y, z, r]) => [dot([x, y, z], u), dot([x, y, z], v), r]);
}

export function contornoComFilete(pontos) {
  const n = pontos.length;
  const raio = (i) => {
    const [p, a, b] = [pontos[i], pontos[(i + n - 1) % n], pontos[(i + 1) % n]];
    if (!p[2]) return 0;
    const ua = [a[0] - p[0], a[1] - p[1]];
    const ub = [b[0] - p[0], b[1] - p[1]];
    const la = Math.hypot(...ua);
    const lb = Math.hypot(...ub);
    const teta = Math.acos(Math.max(-1, Math.min(1, (ua[0] * ub[0] + ua[1] * ub[1]) / (la * lb))));
    return Math.min(p[2], (Math.min(la, lb) / 2) * Math.tan(teta / 2));
  };
  const trechos = [];
  if (raio(0)) trechos.push({ concordancia: m(raio(0)) });
  for (let i = 1; i < n; i += 1) {
    const [u, v] = pontos[i];
    trechos.push({ reto: [m(u), m(v)] });
    if (raio(i)) trechos.push({ concordancia: m(raio(i)) });
  }
  trechos.push({ reto: [m(pontos[0][0]), m(pontos[0][1])] });
  return { inicio: [m(pontos[0][0]), m(pontos[0][1])], trechos };
}

export const fazerArcoD = (T) => furoPassante({
  solido: { origem: { op: 'subdivisao', id: 1 } },
  posicao: [0, T.arcos.dianteiro.y, T.arcos.dianteiro.z],
  direcao: 'x',
  raio: T.arcos.dianteiro.raio,
  comprimento: 2000,
  lados: T.arcos.dianteiro.lados,
  ids: { cilindro: 2, subtrair: 3 },
  nome: 'arcoDianteiro',
});

export const fazerArcoT = (T) => furoPassante({
  solido: { origem: { op: 'subtrair', id: 3 } },
  posicao: [0, T.arcos.traseiro.y, T.arcos.traseiro.z],
  direcao: 'x',
  raio: T.arcos.traseiro.raio,
  comprimento: 2000,
  lados: T.arcos.traseiro.lados,
  ids: { cilindro: 4, subtrair: 5 },
  nome: 'arcoTraseiro',
});

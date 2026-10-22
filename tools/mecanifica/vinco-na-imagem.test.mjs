/* vinco-na-imagem.test.mjs — a dobra viva chega à imagem como aresta, nos dois caminhos de imagem: a cena da bancada
   (`adaptarThree`, que põe a normal de cada canto) e o rasterizador das vistas da receita (`vistas-de-passos.mjs`, uma
   luz por triângulo). A prova é a cintura da carenagem de prova, uma dobra de cerca de 42 graus.

   Medido em 2026-10-22 (fatia 10 do plano da carroceria por subdivisão): nenhum dos dois caminhos suaviza a normal por
   cima da dobra. A faixa borrada que se via na cintura é a forma da TABELA: a dobra é o alto de uma saliência de
   `cintura_saliencia` com `cintura_faixa` de cada lado, que sobe e desce por `vinco_rampa` nas pontas, e não sombreado.

   O complemento da fatia 10: o passo `subdivisao` marca as faces geradas lisas a 30 graus e põe quebra de sombra nas
   arestas que descendem do vinco vivo. A superfície sai sem as listras de triângulo que a luz chapada desenha onde ela
   curva muito, nas pontas da dobra, e a dobra continua aresta também ali, onde o diedro cai abaixo dos 30 graus. Este
   teste guarda a divisão de 42 graus no meio da dobra, nenhuma divisão no resto da chapa, a divisão nas pontas que só a
   quebra dá (sem ela a sombra passa por cima), o borrão do `liso` sem ângulo e sem quebra, as listras medidas numa
   imagem da normal da cena e o salto nas vistas da receita. */
import { describe, expect, it } from 'vitest';
import receita, { TABELA } from '../../procedural/pecas/carenagem-de-prova/receita.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { adaptarThree } from '../../src/autoria/adaptar-three.js';
import { poligonosDaReceita } from './vistas-da-receita.mjs';
import { rasterDaVista, VISTAS } from './vistas-de-passos.mjs';

/* A faixa da cintura onde a dobra tem o diedro inteiro, em metro: lado +x, z de 1,05 a 1,35 m, longe das rampas. */
const FAIXA = { x: 0.6, y: [0.3, 0.7], z: [1.05, 1.35] };
const LIMIAR = 30;

const graus = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180 / Math.PI;
const chave = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
function normalDaFace(V, vs) {
  let x = 0; let y = 0; let z = 0;
  for (let i = 0; i < vs.length; i += 1) {
    const a = V.get(vs[i]); const b = V.get(vs[(i + 1) % vs.length]);
    x += (a[1] - b[1]) * (a[2] + b[2]); y += (a[2] - b[2]) * (a[0] + b[0]); z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const m = Math.hypot(x, y, z);
  return [x / m, y / m, z / m];
}

/** Todas as arestas internas da malha: { a, b, faces: [f1, f2], diedro, meio }. */
function arestasInternas(neutro) {
  const porAresta = new Map();
  for (const f of neutro.F.values()) {
    const n = normalDaFace(neutro.V, f.vs);
    f.vs.forEach((a, k) => {
      const b = f.vs[(k + 1) % f.vs.length];
      if (!porAresta.has(chave(a, b))) porAresta.set(chave(a, b), { a: Math.min(a, b), b: Math.max(a, b), faces: [], normais: [] });
      porAresta.get(chave(a, b)).faces.push(f.id); porAresta.get(chave(a, b)).normais.push(n);
    });
  }
  return [...porAresta.values()].filter((e) => e.faces.length === 2).map((e) => {
    const pa = neutro.V.get(e.a); const pb = neutro.V.get(e.b);
    return { a: e.a, b: e.b, faces: e.faces, diedro: graus(e.normais[0], e.normais[1]), meio: [0, 1, 2].map((k) => (pa[k] + pb[k]) / 2) };
  });
}

/** As arestas da malha na faixa com diedro acima do limiar. */
function arestasDaDobra(internas) {
  return internas.filter(({ meio: m, diedro }) => m[0] > FAIXA.x && m[1] > FAIXA.y[0] && m[1] < FAIXA.y[1] && m[2] > FAIXA.z[0] && m[2] < FAIXA.z[1] && diedro > LIMIAR)
    .map((e) => ({ ...e, y: e.meio[1] }));
}

/** A normal que a cena dá a cada canto (face, vértice do núcleo). Os atributos `origemFace` e `origemVertice` são Float32
    e perdem os ids grandes do passo, então o canto se acha pela ordem: cada malha lista as faces na ordem em que foram
    trianguladas, cada face de n cantos vira n − 2 triângulos, e o vértice do canto é o da face na mesma posição. */
function normaisDaCena(neutro) {
  const { raiz } = adaptarThree(neutro);
  const porCanto = new Map();
  raiz.traverse((o) => {
    if (!o.isMesh) return;
    const p = o.geometry.getAttribute('position'); const n = o.geometry.getAttribute('normal');
    let i = 0;
    for (const id of o.userData.faces) {
      const vs = neutro.F.get(id).vs;
      for (let fim = i + 3 * (vs.length - 2); i < fim; i += 1) {
        const q = [p.getX(i), p.getY(i), p.getZ(i)];
        const v = vs.reduce((melhor, w) => { const c = neutro.V.get(w); const d = Math.hypot(c[0] - q[0], c[1] - q[1], c[2] - q[2]); return d < melhor.d ? { w, d } : melhor; }, { w: null, d: Infinity }).w;
        porCanto.set(`${id}:${v}`, [n.getX(i), n.getY(i), n.getZ(i)]);
      }
    }
    expect(i, `a malha ${o.name} tem mais cantos que as faces dela`).toBe(p.count);
  });
  return porCanto;
}

/** Em cada aresta, o ângulo entre a normal do canto de um lado e a do outro, em cada ponta: [[ponta a, ponta b], ...]. */
const divisoes = (cena, arestas) => arestas.map(({ a, b, faces: [f1, f2] }) => [a, b].map((v) => graus(cena.get(`${f1}:${v}`), cena.get(`${f2}:${v}`))));

/** Executa `medir` com as faces mudadas por `mudar` e devolve as faces como estavam. */
function comFaces(neutro, mudar, medir) {
  const salvo = [...neutro.F.values()].map((f) => [f, f.liso, f.quebras]);
  try {
    for (const f of neutro.F.values()) mudar(f);
    return medir();
  } finally {
    for (const [f, liso, quebras] of salvo) { f.liso = liso; if (quebras) f.quebras = quebras; else delete f.quebras; }
  }
}

/** A luminância da normal da cena na lateral direita, recortada em z0..z1 e y0..y1 (mm), a e px/mm: cada pixel
    interpola a normal dos três cantos do triângulo e a acende por uma luz direcional, como o sombreamento por pixel da
    bancada. Só desenha o que olha para +x. */
function luzDaCena(neutro, { e, z0, z1, y0, y1 }) {
  const { raiz } = adaptarThree(neutro);
  const W = Math.round((z1 - z0) * e); const H = Math.round((y1 - y0) * e);
  const prof = new Float64Array(W * H).fill(-Infinity); const L = new Float64Array(W * H).fill(NaN);
  const luz = [0.4, 0.9, 0.5].map((c, _, v) => c / Math.hypot(...v));
  raiz.traverse((o) => {
    if (!o.isMesh) return;
    const p = o.geometry.getAttribute('position').array; const n = o.geometry.getAttribute('normal').array;
    for (let t = 0; t < p.length; t += 9) {
      const P = [0, 1, 2].map((k) => [p[t + 3 * k], p[t + 3 * k + 1], p[t + 3 * k + 2]]);
      const N = [0, 1, 2].map((k) => [n[t + 3 * k], n[t + 3 * k + 1], n[t + 3 * k + 2]]);
      if ((P[1][1] - P[0][1]) * (P[2][2] - P[0][2]) - (P[1][2] - P[0][2]) * (P[2][1] - P[0][1]) <= 0) continue;
      const S = P.map((q) => [(z1 - q[2] * 1000) * e, (y1 - q[1] * 1000) * e, q[0]]);
      const den = (S[1][1] - S[2][1]) * (S[0][0] - S[2][0]) + (S[2][0] - S[1][0]) * (S[0][1] - S[2][1]);
      if (Math.abs(den) < 1e-12) continue;
      for (let py = Math.max(0, Math.floor(Math.min(S[0][1], S[1][1], S[2][1]))); py <= Math.min(H - 1, Math.ceil(Math.max(S[0][1], S[1][1], S[2][1]))); py += 1) {
        for (let px = Math.max(0, Math.floor(Math.min(S[0][0], S[1][0], S[2][0]))); px <= Math.min(W - 1, Math.ceil(Math.max(S[0][0], S[1][0], S[2][0]))); px += 1) {
          const X = px + 0.5; const Y = py + 0.5;
          const l1 = ((S[1][1] - S[2][1]) * (X - S[2][0]) + (S[2][0] - S[1][0]) * (Y - S[2][1])) / den;
          const l2 = ((S[2][1] - S[0][1]) * (X - S[2][0]) + (S[0][0] - S[2][0]) * (Y - S[2][1])) / den;
          const l3 = 1 - l1 - l2;
          if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
          const d = l1 * S[0][2] + l2 * S[1][2] + l3 * S[2][2]; const i = py * W + px;
          if (d <= prof[i]) continue;
          prof[i] = d;
          const m = [0, 1, 2].map((k) => l1 * N[0][k] + l2 * N[1][k] + l3 * N[2][k]);
          L[i] = 255 * (0.2 + 0.8 * Math.max(0, (m[0] * luz[0] + m[1] * luz[1] + m[2] * luz[2]) / Math.hypot(...m)));
        }
      }
    }
  });
  return { W, H, L, e, z1, y1 };
}

/** Os saltos de mais de `minimo` níveis entre pixels vizinhos, fora da faixa de ±6 mm da linha da cintura. */
function listras(r, minimo = 2) {
  const linha = (r.y1 - TABELA.cintura_altura) * r.e; let n = 0;
  for (let py = 0; py < r.H - 1; py += 1) {
    if (Math.abs(py + 0.5 - linha) < 6 * r.e) continue;
    for (let px = 0; px < r.W - 1; px += 1) {
      const i = py * r.W + px;
      for (const j of [i + 1, i + r.W]) if (Math.abs(r.L[i] - r.L[j]) > minimo) n += 1;
    }
  }
  return n;
}

/** O maior salto vertical de luminância a até 4 px da linha da cintura, na coluna de z (mm). */
function saltoNaLinha(r, z) {
  const px = Math.floor((r.z1 - z) * r.e); const linha = Math.round((r.y1 - TABELA.cintura_altura) * r.e); let maior = 0;
  for (let py = linha - 4; py < linha + 4; py += 1) maior = Math.max(maior, Math.abs(r.L[(py + 1) * r.W + px] - r.L[py * r.W + px]));
  return maior;
}

describe('a dobra viva chega à imagem como aresta', () => {
  const { neutro } = executarReceita(receita);
  const internas = arestasInternas(neutro);
  const dobra = arestasDaDobra(internas);
  const quebras = new Set([...neutro.F.values()].flatMap((f) => (f.quebras ?? []).map(([a, b]) => chave(a, b))));
  /* as arestas do vinco nas pontas, onde a rampa baixa o diedro abaixo do ângulo do liso, na face externa do lado +x */
  const pontas = internas.filter((e) => quebras.has(chave(e.a, e.b)) && e.diedro > 5 && e.diedro < LIMIAR && e.meio[0] > 0.7);

  it('a cintura é uma dobra de cerca de 42 graus na malha, na altura da TABELA', () => {
    expect(dobra.length).toBeGreaterThanOrEqual(40);
    for (const e of dobra) {
      expect(e.diedro).toBeGreaterThan(38);
      expect(e.diedro).toBeLessThan(46);
      expect(Math.abs(e.y * 1000 - TABELA.cintura_altura)).toBeLessThan(5);
    }
  });

  it('o passo marca toda face lisa a 30 graus e põe quebra de sombra só no vinco vivo da cintura', () => {
    expect([...neutro.F.values()].every((f) => f.liso === LIMIAR)).toBe(true);
    for (const e of dobra) expect(quebras.has(chave(e.a, e.b))).toBe(true);
    /* as 16 arestas de gaiola do vinco viram 64 em nível 2, por lado, na face externa e as mesmas na interna, todas na
       altura da cintura */
    expect(quebras.size).toBe(256);
    for (const c of quebras) for (const v of c.split('_').map(Number)) expect(Math.abs(neutro.V.get(v)[1] * 1000 - TABELA.cintura_altura)).toBeLessThan(TABELA.cintura_saliencia);
    expect(pontas.length).toBeGreaterThanOrEqual(8);
  });

  it('na cena da bancada a normal se divide na dobra e em nenhuma aresta lisa do resto da chapa', () => {
    const cena = normaisDaCena(neutro);
    expect(Math.min(...divisoes(cena, dobra).flat())).toBeGreaterThan(38);
    const lisas = internas.filter((e) => !quebras.has(chave(e.a, e.b)) && e.diedro < LIMIAR);
    expect(lisas.length).toBeGreaterThan(50000);
    /* o que sobra é o arredondamento do Float32 da cena */
    expect(Math.max(...divisoes(cena, lisas).flat())).toBeLessThan(0.1);
  });

  it('nas pontas do vinco a quebra mantém a divisão abaixo do ângulo, e as mutações a perdem', () => {
    /* a ponta em que o vinco termina não divide, porque uma quebra só não separa o leque; vale a maior das duas pontas */
    const naPonta = (cena) => divisoes(cena, pontas).map((d) => Math.max(...d));
    naPonta(normaisDaCena(neutro)).forEach((d, k) => expect(d).toBeGreaterThan(0.6 * pontas[k].diedro));
    /* sem a quebra, o ângulo sozinho deixa a sombra passar por cima da ponta do vinco */
    const semQuebra = comFaces(neutro, (f) => { delete f.quebras; }, () => naPonta(normaisDaCena(neutro)));
    expect(Math.max(...semQuebra)).toBeLessThan(0.1);
    /* liso sem ângulo e sem quebra: a média junta as duas normais no meio da dobra, e ela vira degradê */
    const borrada = comFaces(neutro, (f) => { f.liso = true; delete f.quebras; }, () => divisoes(normaisDaCena(neutro), dobra).flat());
    expect(Math.max(...borrada)).toBeLessThan(1);
  });

  it('as listras de triângulo das pontas da dobra somem da imagem, e a dobra continua um salto', () => {
    const medidas = [];
    for (const [rotulo, z0, z1, cheia, rampa] of [['frente', 650, 1050, 1020, 880], ['tras', 1350, 1750, 1380, 1520]]) {
      const quadro = { e: 1, z0, z1, y0: TABELA.cintura_altura - 150, y1: TABELA.cintura_altura + 150 };
      const lisa = luzDaCena(neutro, quadro);
      const chapada = comFaces(neutro, (f) => { f.liso = false; }, () => luzDaCena(neutro, quadro));
      const semQuebra = comFaces(neutro, (f) => { delete f.quebras; }, () => luzDaCena(neutro, quadro));
      medidas.push({ rotulo, lisa: listras(lisa), chapada: listras(chapada), cheia: saltoNaLinha(lisa, cheia), rampa: saltoNaLinha(lisa, rampa), rampaSemQuebra: saltoNaLinha(semQuebra, rampa) });
    }
    for (const m of medidas) {
      /* a luz chapada desenha cada triângulo: cerca de 8 mil saltos de mais de 2 níveis no recorte; a lisa, nenhum */
      expect(m.chapada, m.rotulo).toBeGreaterThan(5000);
      expect(m.lisa, m.rotulo).toBe(0);
      /* a dobra inteira continua salto (112 níveis), e na rampa a quebra o mantém (44 contra 2 sem ela) */
      expect(m.cheia, m.rotulo).toBeGreaterThan(40);
      expect(m.rampa, m.rotulo).toBeGreaterThan(10 * m.rampaSemQuebra);
    }
  });

  it('nas vistas da receita o salto de luminância perpendicular à cintura fica num pixel', () => {
    const dados = poligonosDaReceita(receita);
    /* lateral direita a 1 px/mm, centrada em z 1175 e na altura da cintura: a coluna px é z = (dx − px), a linha py é y = (dy − py) */
    const W = 500; const H = 240; const e = 1;
    const dx = W / 2 + 1175; const dy = H / 2 + TABELA.cintura_altura;
    const r = rasterDaVista(dados.polis, dados.indice, VISTAS[4], W, H, { enquadre: { e, dx, dy }, S: 1 });
    const L = (px, py) => { const i = (py * r.w + px) * 3; return 0.2126 * r.rgb[i] + 0.7152 * r.rgb[i + 1] + 0.0722 * r.rgb[i + 2]; };
    const medidas = [];
    for (let z = 1050; z <= 1350; z += 25) {
      const px = Math.round(dx - z);
      const saltos = [];
      for (let py = 0; py < r.h - 1; py += 1) saltos.push(Math.abs(L(px, py + 1) - L(px, py)));
      const maior = Math.max(...saltos); const onde = saltos.indexOf(maior);
      const resto = Math.max(...saltos.filter((_, k) => Math.abs(k - onde) > 1));
      const total = saltos.reduce((s, x) => s + x, 0);
      medidas.push({ z, maior, y: dy - onde, resto, parcela: maior / total });
    }
    for (const m of medidas) {
      expect(m.maior, `z ${m.z}`).toBeGreaterThan(25);
      expect(Math.abs(m.y - TABELA.cintura_altura), `z ${m.z}`).toBeLessThanOrEqual(3);
      expect(m.maior / m.resto, `z ${m.z}`).toBeGreaterThan(5);
      expect(m.parcela, `z ${m.z}`).toBeGreaterThan(0.4);
    }
  });
});

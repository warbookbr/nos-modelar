/* vinco-na-imagem.test.mjs — a dobra viva chega à imagem como aresta, nos dois caminhos de imagem: a cena da bancada
   (`adaptarThree`, que põe a normal de cada canto) e o rasterizador das vistas da receita (`vistas-de-passos.mjs`, uma
   luz por triângulo). A prova é a cintura da carenagem de prova, uma dobra de cerca de 42 graus.

   Medido em 2026-10-22 (fatia 10 do plano da carroceria por subdivisão): nenhum dos dois caminhos suaviza a normal por
   cima da dobra. A face sem `liso` sai com a normal do triângulo, e o `liso` com ângulo só soma as faces a menos do
   ângulo da face do canto, que é a divisão por diedro com limiar declarado. A faixa borrada que se via na cintura é a
   forma da TABELA: a dobra é o alto de uma saliência de `cintura_saliencia` com `cintura_faixa` de cada lado, que sobe e
   desce por `vinco_rampa` nas pontas, e não sombreado. Este teste guarda o estado medido: morre se a cena passar a somar
   a normal por cima da dobra (o `liso` sem ângulo é a mutação que mostra o borrão) ou se as vistas passarem a desenhar
   a dobra como degradê. */
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
function normalDaFace(V, vs) {
  let x = 0; let y = 0; let z = 0;
  for (let i = 0; i < vs.length; i += 1) {
    const a = V.get(vs[i]); const b = V.get(vs[(i + 1) % vs.length]);
    x += (a[1] - b[1]) * (a[2] + b[2]); y += (a[2] - b[2]) * (a[0] + b[0]); z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const m = Math.hypot(x, y, z);
  return [x / m, y / m, z / m];
}

/** As arestas da malha na faixa com diedro acima do limiar: { a, b, faces: [f1, f2], diedro }. */
function arestasDaDobra(neutro) {
  const porAresta = new Map();
  for (const f of neutro.F.values()) {
    const n = normalDaFace(neutro.V, f.vs);
    f.vs.forEach((a, k) => {
      const b = f.vs[(k + 1) % f.vs.length];
      const chave = a < b ? `${a}_${b}` : `${b}_${a}`;
      if (!porAresta.has(chave)) porAresta.set(chave, { a: Math.min(a, b), b: Math.max(a, b), faces: [], normais: [] });
      porAresta.get(chave).faces.push(f.id); porAresta.get(chave).normais.push(n);
    });
  }
  const dobra = [];
  for (const e of porAresta.values()) {
    if (e.faces.length !== 2) continue;
    const pa = neutro.V.get(e.a); const pb = neutro.V.get(e.b);
    const m = [0, 1, 2].map((k) => (pa[k] + pb[k]) / 2);
    if (!(m[0] > FAIXA.x && m[1] > FAIXA.y[0] && m[1] < FAIXA.y[1] && m[2] > FAIXA.z[0] && m[2] < FAIXA.z[1])) continue;
    const diedro = graus(e.normais[0], e.normais[1]);
    if (diedro > LIMIAR) dobra.push({ a: e.a, b: e.b, faces: e.faces, diedro, y: m[1] });
  }
  return dobra;
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

/** Em cada ponta de cada aresta da dobra, o ângulo entre a normal do canto de um lado e a do outro. */
function divisaoNaDobra(neutro, dobra) {
  const cena = normaisDaCena(neutro);
  return dobra.flatMap(({ a, b, faces: [f1, f2] }) => [a, b].map((v) => graus(cena.get(`${f1}:${v}`), cena.get(`${f2}:${v}`))));
}

describe('a dobra viva chega à imagem como aresta', () => {
  const { neutro } = executarReceita(receita);
  const dobra = arestasDaDobra(neutro);

  it('a cintura é uma dobra de cerca de 42 graus na malha, na altura da TABELA', () => {
    expect(dobra.length).toBeGreaterThanOrEqual(40);
    for (const e of dobra) {
      expect(e.diedro).toBeGreaterThan(38);
      expect(e.diedro).toBeLessThan(46);
      expect(Math.abs(e.y * 1000 - TABELA.cintura_altura)).toBeLessThan(5);
    }
  });

  it('na cena da bancada a normal se divide na dobra, e o liso sem ângulo é a mutação que a borra', () => {
    const chapada = divisaoNaDobra(neutro, dobra);
    expect(Math.min(...chapada)).toBeGreaterThan(LIMIAR);

    const lisos = (valor) => { for (const f of neutro.F.values()) f.liso = valor; return divisaoNaDobra(neutro, dobra); };
    const porAngulo = lisos(LIMIAR);
    const semAngulo = lisos(true);
    for (const f of neutro.F.values()) f.liso = false;
    /* liso com ângulo abaixo do diedro: liso por dentro, a dobra continua aresta */
    expect(Math.min(...porAngulo)).toBeGreaterThan(LIMIAR);
    /* liso sem ângulo: a média por cima da dobra junta as duas normais, e a dobra vira degradê */
    expect(Math.max(...semAngulo)).toBeLessThan(1);
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

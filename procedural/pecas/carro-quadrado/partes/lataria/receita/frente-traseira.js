/* carro-quadrado/lataria/receita/frente-traseira.js — grade, faróis, setas, lanternas, placas, puxador, fechadura e escapamento. */
import { m } from './chapa.js';

function caixa(op, id, x0, x1, y0, y1, z0, z1, chanfro) {
  const args = {
    origemId: id,
    larg: m(x1 - x0),
    alt: m(y1 - y0),
    prof: m(z1 - z0),
    em: [m((x0 + x1) / 2), m(y0), m((z0 + z1) / 2)],
  };
  if (op === 'chamferBox') args.chanfro = m(chanfro);
  return [op, args];
}

export const ID_FECHADURA = 900;
export const ID_ESCAPAMENTO = 901;

export const ALIASES_FRENTE_TRASEIRA = [
  ['fechaduraTampaInteiro', {
    unir: [
      { origem: { op: 'cilindro', id: ID_FECHADURA } },
      { origem: { op: 'cilindro', id: ID_FECHADURA, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: ID_FECHADURA, tampa: 'topo' } },
    ],
  }],
  ['escapamentoInteiro', {
    unir: [
      { origem: { op: 'cilindro', id: ID_ESCAPAMENTO } },
      { origem: { op: 'cilindro', id: ID_ESCAPAMENTO, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: ID_ESCAPAMENTO, tampa: 'topo' } },
    ],
  }],
];

export function passosFrenteTraseira(T, proxId) {
  const passos = [];
  const f = T.frentePecas;
  const t = T.traseiraPecas;
  const marcar = (nome, material, sel) => passos.push(['parte', { nome, material, sel }]);

  // --- GRADE FRONTAL (trapezoidal acompanhando a inclinação interna dos faróis, 7 lâminas finas sobre fundo escuro recuado) ---
  const fr = f.farol;
  const xIntFarol = (y) => fr.x0Base + (fr.x0Topo - fr.x0Base) * Math.max(0, Math.min(1, (y - fr.y0) / (fr.y1 - fr.y0)));
  const barraTrap = (id, y0, y1, z0, z1, folga = 0) => {
    const x0 = xIntFarol(y0) - folga;
    const x1 = xIntFarol(y1) - folga;
    const verts = [
      [m(-x0), m(y0), m(z0)], [m(x0), m(y0), m(z0)], [m(x1), m(y1), m(z0)], [m(-x1), m(y1), m(z0)],
      [m(-x0), m(y0), m(z1)], [m(x0), m(y0), m(z1)], [m(x1), m(y1), m(z1)], [m(-x1), m(y1), m(z1)],
    ];
    return ['subdivisao', {
      origemId: id, niveis: 0, vertices: verts,
      faces: [
        [0, 3, 2, 1], [4, 5, 6, 7],
        [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7],
      ],
    }];
  };
  const idGradeFundo = proxId();
  passos.push(barraTrap(idGradeFundo, f.grade.y0 - 6, f.grade.y1 + 6, f.grade.zFundo0, f.grade.zFundo1, -2));
  const idGradeTopo = proxId();
  passos.push(barraTrap(idGradeTopo, f.grade.y1 - 8, f.grade.y1 + 2, f.grade.zFundo1, f.grade.zMoldura, 1));
  const idGradeBase = proxId();
  passos.push(barraTrap(idGradeBase, f.grade.y0 - 2, f.grade.y0 + 8, f.grade.zFundo1, f.grade.zMoldura, 1));
  const origensGrade = [
    { op: 'subdivisao', id: idGradeFundo },
    { op: 'subdivisao', id: idGradeTopo },
    { op: 'subdivisao', id: idGradeBase },
  ];
  const passoLam = (f.grade.lamY1 - f.grade.lamY0) / (f.grade.laminas - 1);
  for (let k = 0; k < f.grade.laminas; k += 1) {
    const idL = proxId();
    const yL = f.grade.lamY0 + passoLam * k;
    passos.push(barraTrap(idL, yL, yL + f.grade.lamAlt, f.grade.zFundo1, f.grade.zLamina, 2));
    origensGrade.push({ op: 'subdivisao', id: idL });
  }
  for (const origem of origensGrade) {
    marcar('gradeFrontal', 'plasticoFosco', { origem });
  }

  /* helper para emitir par espelhado em X numa parte frontal */
  const emitirParFrente = (parte, passoFn, mat) => {
    const id = proxId();
    const passo = passoFn(id);
    const o = { op: passo[0], id };
    passos.push(passo);
    const idE = proxId();
    passos.push(['espelha', { eixo: 'x', origemId: idE, derivaDe: o, sel: { origem: o } }]);
    marcar(parte, mat, { origem: o });
    marcar(parte, mat, { origem: { op: 'espelha', id: idE, de: o } });
  };

  // --- FARÓIS PRINCIPAIS (trapézio inclinado na grade, máscara prata com recorte circular, parábola profunda, lâmpada maior e lente estriada vertical) ---
  const frCy = (fr.y0 + fr.y1) / 2;
  const frCx = ((fr.x0Base + fr.x0Topo) / 2 + fr.x1) / 2 + 2; // centro óptico da parábola circular
  const frRy = (fr.y1 - fr.y0) / 2;

  /* contorno trapezoidal com cantos arredondados (32 pontos anti-horários no plano XY):
     borda interna inclinada acompanhando a grade, borda externa vertical junto ao pisca */
  const pontosTrapezio = (inset, rCanto = 12) => {
    const y0 = fr.y0 + inset;
    const y1 = fr.y1 - inset;
    const x0b = fr.x0Base + inset;
    const x0t = fr.x0Topo + inset;
    const x1 = fr.x1 - inset;
    const cantos = [
      [x1, y0], [x1, y1], [x0t, y1], [x0b, y0],
    ];
    const segPorCanto = 8; // 4 * 8 = 32 pontos
    const pts = [];
    for (let k = 0; k < 4; k += 1) {
      const pPrev = cantos[(k + 3) % 4];
      const pCurr = cantos[k];
      const pNext = cantos[(k + 1) % 4];
      const d1x = pPrev[0] - pCurr[0]; const d1y = pPrev[1] - pCurr[1];
      const l1 = Math.hypot(d1x, d1y);
      const d2x = pNext[0] - pCurr[0]; const d2y = pNext[1] - pCurr[1];
      const l2 = Math.hypot(d2x, d2y);
      const r = Math.min(rCanto, l1 * 0.25, l2 * 0.25);
      const ax = pCurr[0] + (d1x / l1) * r; const ay = pCurr[1] + (d1y / l1) * r;
      const bx = pCurr[0] + (d2x / l2) * r; const by = pCurr[1] + (d2y / l2) * r;
      /* pontos distribuídos no arco quadrático do canto e metade da aresta seguinte */
      for (let s = 0; s < segPorCanto; s += 1) {
        if (s < 5) {
          const t = s / 4;
          const om = 1 - t;
          pts.push([om * om * ax + 2 * om * t * pCurr[0] + t * t * bx, om * om * ay + 2 * om * t * pCurr[1] + t * t * by]);
        } else {
          /* 3 pontos intermediários na reta até o próximo canto */
          const pNext2 = cantos[(k + 2) % 4];
          const e1x = pCurr[0] - pNext[0]; const e1y = pCurr[1] - pNext[1];
          const le1 = Math.hypot(e1x, e1y);
          const rNext = Math.min(rCanto, le1 * 0.25, Math.hypot(pNext2[0] - pNext[0], pNext2[1] - pNext[1]) * 0.25);
          const nx = pNext[0] + (e1x / le1) * rNext; const ny = pNext[1] + (e1y / le1) * rNext;
          const u = (s - 4) / 4;
          pts.push([bx + (nx - bx) * u, by + (ny - by) * u]);
        }
      }
    }
    return pts;
  };
  const N_FAROL = 32;
  const zFarolFrente = (x, y, extra = 0) => {
    const tY = (y - fr.y0) / (fr.y1 - fr.y0);
    const tX = Math.max(0, (x - fr.x0Base) / (fr.x1 - fr.x0Base));
    return fr.zLente1 - 6.0 * tY - 4.0 * tX * tX + extra;
  };

  /* 1. Fundo traseiro da carcaça preta (atrás da parábola, sem tampar o interior) */
  emitirParFrente('farol', (id) => caixa('cubo', id, fr.x0Base - 2, fr.x1 + 3, fr.y0 - 6, fr.y1 + 6, fr.zCarc0 - 4, fr.zCarc0 + 4), 'plasticoFosco');

  /* 2. Moldura/guarnição externa trapezoidal OCO (encaixa no vão frontal e acompanha a inclinação da grade) */
  emitirParFrente('farol', (id) => {
    const pExt = pontosTrapezio(-2, 13);
    const pInt = pontosTrapezio(5.5, 11);
    const zB = fr.zCarc0 + 2;
    const verts = [];
    for (const [x, y] of pExt) verts.push([m(x), m(y), m(zB)]);
    for (const [x, y] of pExt) verts.push([m(x), m(y), m(zFarolFrente(x, y, -1.5))]);
    for (const [x, y] of pInt) verts.push([m(x), m(y), m(zFarolFrente(x, y, -1.5))]);
    for (const [x, y] of pInt) verts.push([m(x), m(y), m(zB)]);
    const faces = [];
    for (let i = 0; i < N_FAROL; i += 1) {
      const j = (i + 1) % N_FAROL;
      faces.push([i, j, N_FAROL + j, N_FAROL + i]);
      faces.push([N_FAROL + i, N_FAROL + j, 2 * N_FAROL + j, 2 * N_FAROL + i]);
      faces.push([2 * N_FAROL + i, 2 * N_FAROL + j, 3 * N_FAROL + j, 3 * N_FAROL + i]);
      faces.push([3 * N_FAROL + i, 3 * N_FAROL + j, j, i]);
    }
    return ['subdivisao', { origemId: id, niveis: 0, vertices: verts, faces }];
  }, 'bordaVidroFarol');

  /* 3. Máscara prata interna com recorte CIRCULAR grande cortado no topo/base -> cria os dois arcos `( )` prateados nas laterais! */
  const pontosCirculo = (rx, ry, clampY = false) => {
    const pts = [];
    const yMinC = fr.y0 + 7.5;
    const yMaxC = fr.y1 - 7.5;
    for (let i = 0; i < N_FAROL; i += 1) {
      const a = -Math.PI / 4 + (2 * Math.PI * i) / N_FAROL;
      let y = frCy + ry * Math.sin(a);
      if (clampY) y = Math.max(yMinC, Math.min(yMaxC, y));
      pts.push([frCx + rx * Math.cos(a), y]);
    }
    return pts;
  };
  emitirParFrente('farol', (id) => {
    const pExt = pontosTrapezio(5.0, 11);
    const pCirc = pontosCirculo(110, 74, true);
    const zB = fr.zCarc0 + 4;
    const verts = [];
    /* 0: externo trás, 1: externo frente, 2: recorte circular frente (saliência), 3: recorte circular trás */
    for (const [x, y] of pExt) verts.push([m(x), m(y), m(zB)]);
    for (const [x, y] of pExt) verts.push([m(x), m(y), m(zFarolFrente(x, y, -5.5))]);
    for (const [x, y] of pCirc) verts.push([m(x), m(y), m(zFarolFrente(x, y, -8.5))]);
    for (const [x, y] of pCirc) verts.push([m(x), m(y), m(zB)]);
    const faces = [];
    for (let i = 0; i < N_FAROL; i += 1) {
      const j = (i + 1) % N_FAROL;
      faces.push([i, j, N_FAROL + j, N_FAROL + i]);
      faces.push([N_FAROL + i, N_FAROL + j, 2 * N_FAROL + j, 2 * N_FAROL + i]);
      faces.push([2 * N_FAROL + i, 2 * N_FAROL + j, 3 * N_FAROL + j, 3 * N_FAROL + i]);
      faces.push([3 * N_FAROL + i, 3 * N_FAROL + j, j, i]);
    }
    return ['subdivisao', { origemId: id, niveis: 0, vertices: verts, faces }];
  }, 'mascaraPrataFarol');

  /* 4. Parábola refletora circular profunda atrás da máscara prata (dá o contraste escuro/espelhado interno) */
  emitirParFrente('farol', (id) => {
    const aneis = [
      { pts: pontosCirculo(110, 74, true), z: fr.zLente1 - 11 },
      { pts: pontosCirculo(74, 46, false), z: fr.zCarc0 + 25 },
      { pts: pontosCirculo(36, 26, false), z: fr.zCarc0 + 10 },
    ];
    const verts = [];
    for (const an of aneis) {
      for (const [x, y] of an.pts) {
        const dzTopo = ((y - frCy) / frRy) * -2.5;
        verts.push([m(x), m(y), m(an.z + dzTopo)]);
      }
    }
    const zTras = fr.zCarc0 + 4;
    for (const [x, y] of aneis[0].pts) verts.push([m(x), m(y), m(zTras)]);
    const idxFundo = verts.length;
    verts.push([m(frCx), m(frCy), m(fr.zCarc0 + 7)]);
    const idxTras = verts.length;
    verts.push([m(frCx), m(frCy), m(zTras)]);

    const faces = [];
    for (let i = 0; i < N_FAROL; i += 1) {
      const j = (i + 1) % N_FAROL;
      faces.push([i, j, N_FAROL + j, N_FAROL + i]);
      faces.push([N_FAROL + i, N_FAROL + j, 2 * N_FAROL + j, 2 * N_FAROL + i]);
      faces.push([2 * N_FAROL + i, 2 * N_FAROL + j, idxFundo]);
      faces.push([i, 3 * N_FAROL + i, 3 * N_FAROL + j, j]);
      faces.push([3 * N_FAROL + j, 3 * N_FAROL + i, idxTras]);
    }
    return ['subdivisao', { origemId: id, niveis: 0, vertices: verts, faces }];
  }, 'refletorFarol');

  /* 5. Conjunto óptico central da lâmpada H4 com diâmetro MAIOR (coroa refletora clara + bulbo central + farolete lateral) */
  emitirParFrente('farol', (id) => {
    const N = 20;
    const rBase = 34; const rFrente = 24;
    const z0 = fr.zCarc0 + 9; const z1 = fr.zCarc0 + 30;
    const verts = [];
    for (let i = 0; i < N; i += 1) {
      const a = (2 * Math.PI * i) / N;
      verts.push([m(frCx + rBase * Math.cos(a)), m(frCy + rBase * Math.sin(a)), m(z0)]);
    }
    for (let i = 0; i < N; i += 1) {
      const a = (2 * Math.PI * i) / N;
      verts.push([m(frCx + rFrente * Math.cos(a)), m(frCy + rFrente * Math.sin(a)), m(z1)]);
    }
    const idxB = verts.length; verts.push([m(frCx), m(frCy), m(z0)]);
    const idxF = verts.length; verts.push([m(frCx), m(frCy), m(z1 + 5)]);
    const faces = [];
    for (let i = 0; i < N; i += 1) {
      const j = (i + 1) % N;
      faces.push([j, i, idxB]);
      faces.push([i, j, N + j, N + i]);
      faces.push([N + i, N + j, idxF]);
    }
    return ['subdivisao', { origemId: id, niveis: 0, vertices: verts, faces }];
  }, 'refletorNucleo');

  emitirParFrente('farol', (id) => {
    const N = 16;
    const r = 15;
    const z0 = fr.zCarc0 + 26; const z1 = fr.zCarc0 + 42;
    const verts = [];
    for (let i = 0; i < N; i += 1) {
      const a = (2 * Math.PI * i) / N;
      verts.push([m(frCx + r * Math.cos(a)), m(frCy - 2 + r * Math.sin(a)), m(z0)]);
    }
    for (let i = 0; i < N; i += 1) {
      const a = (2 * Math.PI * i) / N;
      verts.push([m(frCx + r * 0.78 * Math.cos(a)), m(frCy - 2 + r * 0.78 * Math.sin(a)), m(z1)]);
    }
    const idxB = verts.length; verts.push([m(frCx), m(frCy - 2), m(z0)]);
    const idxF = verts.length; verts.push([m(frCx), m(frCy - 2), m(z1 + 4)]);
    const faces = [];
    for (let i = 0; i < N; i += 1) {
      const j = (i + 1) % N;
      faces.push([j, i, idxB]);
      faces.push([i, j, N + j, N + i]);
      faces.push([N + i, N + j, idxF]);
    }
    return ['subdivisao', { origemId: id, niveis: 0, vertices: verts, faces }];
  }, 'calotaLampada');

  /* 6. Lente de vidro trapezoidal com ESTRIAS VERTICAIS REAIS em relevo (fluted glass) + transparência prismática */
  emitirParFrente('farol', (id) => {
    const COLS = 44; // 22 caneluras verticais nítidas ao longo da largura do farol!
    const ROWS = 6;
    const yMin = fr.y0 + 5.5;
    const yMax = fr.y1 - 5.5;
    const ptGrade = (c, r, frente) => {
      const v = r / ROWS;
      const u = c / COLS;
      const y = yMin + (yMax - yMin) * v;
      const xL = xIntFarol(y) + 5.5;
      const xR = fr.x1 - 5.5;
      const x = xL + (xR - xL) * u;
      /* chanfro suave nas bordas superior/inferior e laterais */
      const bordaU = Math.min(u, 1 - u);
      const bordaV = Math.min(v, 1 - v);
      const domo = Math.min(1, bordaU * 14) * Math.min(1, bordaV * 6);
      /* estria vertical bem marcada (fluted glass clássico) */
      const estria = frente ? (c % 2 === 1 ? 1.9 : -0.8) * domo : 0;
      const dz = frente ? (1.4 * domo + estria) : -3.2;
      return [m(x), m(y), m(zFarolFrente(x, y, dz))];
    };
    const verts = [];
    /* camada 0: face traseira (-z); camada 1: face frontal estriada (+z) */
    for (let k = 0; k < 2; k += 1) {
      for (let r = 0; r <= ROWS; r += 1) {
        for (let c = 0; c <= COLS; c += 1) {
          verts.push(ptGrade(c, r, k === 1));
        }
      }
    }
    const stride = COLS + 1;
    const camadaSize = (ROWS + 1) * stride;
    const idV = (k, r, c) => k * camadaSize + r * stride + c;
    const faces = [];
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        /* face traseira (-z) */
        faces.push([idV(0, r, c), idV(0, r + 1, c), idV(0, r + 1, c + 1), idV(0, r, c + 1)]);
        /* face frontal estriada (+z) */
        faces.push([idV(1, r, c), idV(1, r, c + 1), idV(1, r + 1, c + 1), idV(1, r + 1, c)]);
      }
    }
    /* 4 bordas laterais fechando o vidro */
    for (let c = 0; c < COLS; c += 1) {
      faces.push([idV(0, 0, c), idV(0, 0, c + 1), idV(1, 0, c + 1), idV(1, 0, c)]); // base (-y)
      faces.push([idV(0, ROWS, c), idV(1, ROWS, c), idV(1, ROWS, c + 1), idV(0, ROWS, c + 1)]); // topo (+y)
    }
    for (let r = 0; r < ROWS; r += 1) {
      faces.push([idV(0, r, 0), idV(1, r, 0), idV(1, r + 1, 0), idV(0, r + 1, 0)]); // interno (-x)
      faces.push([idV(0, r, COLS), idV(0, r + 1, COLS), idV(1, r + 1, COLS), idV(1, r, COLS)]); // externo (+x)
    }
    return ['subdivisao', { origemId: id, niveis: 0, vertices: verts, faces }];
  }, 'lenteFarol');

  // --- SETAS DIANTEIRAS (rentes à curvatura real do para-lama com perfil externo em "D", sem sobressair nem ser mordidas pela chapa) ---
  const stD = f.seta;
  const amostrarPeleFrente = (u, y, offsetMm = 0) => {
    const tY = Math.max(0, Math.min(1, (y - stD.y0) / (stD.y1 - stD.y0)));
    const curvY = Math.sin(Math.PI * tY); // 0 nos extremos, 1 no meio
    const zF = 2007 - 6.5 * tY;
    /* casa ao milímetro com a chapa real medida em z=1950 (784 em y=570, 790 em y=636, 786 em y=702) */
    const xS = 784 + 6.5 * curvY + 1.5 * tY;
    const zS = 1944 + 6 * tY;
    const x0 = stD.x0;
    const xC = xS - 44;
    const zC = zF - 40;
    let x; let z; let nx; let nz;
    if (u <= 0.30) {
      const s = u / 0.30;
      x = x0 + (xC - x0) * s;
      z = zF - 8 * s * s;
      const len = Math.hypot(0.20 * s, 1);
      nx = (0.20 * s) / len;
      nz = 1 / len;
    } else if (u <= 0.82) {
      const a = ((u - 0.30) / 0.52) * (Math.PI / 2);
      x = xC + (xS - xC) * Math.sin(a);
      z = zC + (zF - 8 - zC) * Math.cos(a);
      nx = Math.sin(a);
      nz = Math.cos(a);
    } else {
      const s = (u - 0.82) / 0.18;
      x = xS;
      z = zC - (zC - zS) * s;
      nx = 1;
      nz = 0;
    }
    const taper = offsetMm > 0 && u > 0.78 ? 1 - 0.45 * ((u - 0.78) / 0.22) : 1;
    const off = offsetMm * taper;
    return [m(x + nx * off), m(y), m(z + nz * off)];
  };

  /* gera a seta dianteira com 2 camadas limpas e cantos externos suavemente arredondados */
  const faixaCurvaFrente = (id, u0, u1, y0, y1, offFora, offTras, chanfroU = 0.015, chanfroY = 2.2, cols = 12, rows = 8) => {
    const verts = [];
    const arred = (u, dy) => {
      if (u <= 0.62) return 0;
      const k = (u - 0.62) / 0.38;
      return dy * k * k;
    };
    const stride = cols + 1;
    const camadaSize = (rows + 1) * stride;
    const idx = (camada, r, c) => camada * camadaSize + r * stride + c;
    for (let cam = 0; cam < 2; cam += 1) {
      const frente = cam === 1;
      for (let r = 0; r <= rows; r += 1) {
        const vr = r / rows;
        const bordaV = Math.min(vr, 1 - vr);
        for (let i = 0; i <= cols; i += 1) {
          const g = i / cols;
          const bordaU = Math.min(g, 1 - g);
          const u = u0 + (u1 - u0) * g;
          const dy = frente ? chanfroY * (1 - Math.min(1, bordaV * 4)) : 0;
          const yBot = y0 + dy + arred(u, 6);
          const yTop = y1 - dy - arred(u, 7);
          const y = yBot + (yTop - yBot) * vr;
          const domo = Math.min(1, bordaU * 5) * Math.min(1, bordaV * 4);
          const off = frente ? (offFora * (0.65 + 0.35 * domo)) : offTras;
          verts.push(amostrarPeleFrente(u, y, off));
        }
      }
    }
    const faces = [];
    for (let r = 0; r < rows; r += 1) {
      for (let i = 0; i < cols; i += 1) {
        faces.push([idx(0, r, i), idx(0, r + 1, i), idx(0, r + 1, i + 1), idx(0, r, i + 1)]);
        faces.push([idx(1, r, i), idx(1, r, i + 1), idx(1, r + 1, i + 1), idx(1, r + 1, i)]);
      }
    }
    for (let i = 0; i < cols; i += 1) {
      faces.push([idx(0, 0, i), idx(0, 0, i + 1), idx(1, 0, i + 1), idx(1, 0, i)]);
      faces.push([idx(0, rows, i), idx(1, rows, i), idx(1, rows, i + 1), idx(0, rows, i + 1)]);
    }
    for (let r = 0; r < rows; r += 1) {
      faces.push([idx(0, r, 0), idx(1, r, 0), idx(1, r + 1, 0), idx(0, r + 1, 0)]);
      faces.push([idx(0, r, cols), idx(0, r + 1, cols), idx(1, r + 1, cols), idx(1, r, cols)]);
    }
    return ['subdivisao', { origemId: id, niveis: 0, vertices: verts, faces }];
  };

  /* 1. Vedação/carcaça fina preta do pisca (recuada atrás da lente para nunca vazar pela frente!) */
  emitirParFrente('setaDianteira', (id) => faixaCurvaFrente(id, 0.0, 0.96, stD.y0 - 2, stD.y1 + 2, 0.4, -24, 0.01, 0.5, 10, 6), 'plasticoFosco');
  /* 2. Refletor cromado interno atrás da lente âmbar */
  emitirParFrente('setaDianteira', (id) => faixaCurvaFrente(id, 0.04, 0.80, stD.y0 + 5, stD.y1 - 5, 1.0, -6, 0.015, 1.0, 8, 4), 'refletorFarol');
  /* 3. Lente âmbar prismática translúcida rente ao para-lama e curva em "D" */
  emitirParFrente('setaDianteira', (id) => faixaCurvaFrente(id, 0.012, 1.0, stD.y0 + 0.5, stD.y1 - 0.5, 3.4, -5, 0.018, 2.5, 14, 8), 'setaAmbar');

  // --- PLACA DIANTEIRA ---
  const idPlacaD = proxId();
  const pD = f.placa;
  passos.push(caixa('chamferBox', idPlacaD, -pD.larg / 2, pD.larg / 2, pD.yCentro - pD.alt / 2, pD.yCentro + pD.alt / 2, pD.z0, pD.z1, 3));
  marcar('placaDianteira', 'placa', { origem: { op: 'chamferBox', id: idPlacaD } });

  // --- FARÓIS DE NEBLINA (moldura escura + refletor cromado + lente prismática translúcida) + ENTRADA DE AR INFERIOR ---
  const neb = f.neblina;
  emitirParFrente('farolNeblina', (id) => caixa('cubo', id, neb.xCentro - neb.larg / 2 - 4, neb.xCentro + neb.larg / 2 + 4, neb.yCentro - neb.alt / 2 - 4, neb.yCentro + neb.alt / 2 + 4, neb.z0 - 6, neb.z1 - 8), 'plasticoFosco');
  emitirParFrente('farolNeblina', (id) => caixa('cubo', id, neb.xCentro - neb.larg / 2 + 4, neb.xCentro + neb.larg / 2 - 4, neb.yCentro - neb.alt / 2 + 4, neb.yCentro + neb.alt / 2 - 4, neb.z0, neb.z1 - 6), 'refletorFarol');
  emitirParFrente('farolNeblina', (id) => caixa('chamferBox', id, neb.xCentro - neb.larg / 2, neb.xCentro + neb.larg / 2, neb.yCentro - neb.alt / 2, neb.yCentro + neb.alt / 2, neb.z1 - 7, neb.z1 + 2, 3), 'lenteNeblina');

  const idEntFundo = proxId();
  passos.push(caixa('cubo', idEntFundo, -(neb.xCentro - neb.larg / 2 - 4), neb.xCentro - neb.larg / 2 - 4, neb.yCentro - 25, neb.yCentro + 25, neb.z0 - 6, neb.z1 - 4));
  marcar('parachoqueDianteiro', 'plasticoFosco', { origem: { op: 'cubo', id: idEntFundo } });
  const idEntLam = proxId();
  const oEntLam = { op: 'cubo', id: idEntLam };
  passos.push(caixa('cubo', idEntLam, -(neb.xCentro - neb.larg / 2 - 10), neb.xCentro - neb.larg / 2 - 10, neb.yCentro - 16, neb.yCentro - 11, neb.z1 - 6, neb.z1));
  const idEntLams = proxId();
  passos.push(['arranja', { modo: 'linear', total: 3, d: [0, m(13), 0], origemId: idEntLams, derivaDe: oEntLam, sel: { origem: oEntLam } }]);
  marcar('parachoqueDianteiro', 'plasticoPreto', { origem: oEntLam });
  marcar('parachoqueDianteiro', 'plasticoPreto', { origem: { op: 'arranja', id: idEntLams, de: oEntLam } });

  // --- LANTERNAS TRASEIRAS (envolventes 3D na lateral, sem moldura preta grossa, 2 faixas âmbar + sulco em V + rubi + ré embutida) ---
  const interpTabela = (tab, y) => {
    if (y <= tab[0][0]) return tab[0][1];
    for (let i = 1; i < tab.length; i += 1) {
      if (y <= tab[i][0]) {
        const f = (y - tab[i - 1][0]) / (tab[i][0] - tab[i - 1][0]);
        return tab[i - 1][1] + (tab[i][1] - tab[i - 1][1]) * f;
      }
    }
    return tab[tab.length - 1][1];
  };
  /* curvas reais medidas na pele da chapa (Curva 1 traseira, Curva 3 bojo lateral, Curva 4 inclinação interna) */
  const tabZRear = [[526, -1996.5], [620, -2011.6], [735, -2021.1], [795, -2022.4], [848, -2019.0]];
  const tabXSide = [[526, 792.0], [620, 799.0], [735, 802.0], [795, 797.0], [848, 785.0]];
  const tabZSide = [[526, -1928.0], [620, -1941.0], [735, -1954.0], [795, -1961.0], [848, -1968.0]];
  const xInt = (y) => 632 + 32 * Math.max(0, Math.min(1, (y - 526) / (848 - 526)));

  const amostrarPele = (u, y, offsetMm = 0) => {
    const zR = interpTabela(tabZRear, y);
    const xS = interpTabela(tabXSide, y);
    const zS = interpTabela(tabZSide, y);
    const x0 = xInt(y);
    const xC = xS - 54;
    const zC = zR + 42;
    let x; let z; let nx; let nz;
    if (u <= 0.50) {
      const s = u / 0.50;
      x = x0 + (xC - x0) * s;
      z = zR + 10 * s * s;
      const len = Math.hypot(0.14 * s, -1);
      nx = (0.14 * s) / len;
      nz = -1 / len;
    } else if (u <= 0.80) {
      const a = ((u - 0.50) / 0.30) * (Math.PI / 2);
      x = xC + (xS - xC) * Math.sin(a);
      z = zC - (zC - (zR + 10)) * Math.cos(a);
      nx = Math.sin(a);
      nz = -Math.cos(a);
    } else {
      const s = (u - 0.80) / 0.20;
      x = xS;
      z = zC + (zS - zC) * s;
      nx = 1;
      nz = 0;
    }
    /* na borda dianteira da lateral (u -> 1), suaviza o offset para a lente morrer rente à lataria */
    const taper = offsetMm > 0 && u > 0.86 ? 1 - 0.45 * ((u - 0.86) / 0.14) : 1;
    const off = offsetMm * taper;
    return [m(x + nx * off), m(y), m(z + nz * off)];
  };

  /* gera uma faixa curva fechada em 3 camadas (trás, ombro, frente chanfrada), 100% quad e manifold */
  const faixaCurva = (id, u0, u1, y0, y1, offFora, offTras, chanfroU = 0.015, chanfroY = 2.0, cols = 8, curvaTopo = false) => {
    const verts = [];
    const usBase = [];
    const usFrente = [];
    for (let i = 0; i <= cols; i += 1) {
      const f = i / cols;
      usBase.push(u0 + (u1 - u0) * f);
      const uF0 = u0 + chanfroU;
      const uF1 = u1 - chanfroU;
      usFrente.push(uF0 + (uF1 - uF0) * f);
    }
    const yTopo = (u, yBase) => {
      if (!curvaTopo || u <= 0.72) return yBase;
      const k = (u - 0.72) / 0.28;
      return yBase - 14 * k * k;
    };
    const offBase = offFora > 0 ? Math.max(0.6, offFora - 2.4) : offFora;
    const idx = (camada, linha, col) => (camada * 2 + linha) * (cols + 1) + col;
    const camadas = [
      { us: usBase, dy0: 0, dy1: 0, off: offTras },
      { us: usBase, dy0: 0, dy1: 0, off: offBase },
      { us: usFrente, dy0: chanfroY, dy1: -chanfroY, off: offFora },
    ];
    for (const c of camadas) {
      for (let linha = 0; linha < 2; linha += 1) {
        for (let i = 0; i <= cols; i += 1) {
          const u = c.us[i];
          const y = linha === 0 ? y0 + c.dy0 : yTopo(u, y1) + c.dy1;
          verts.push(amostrarPele(u, y, c.off));
        }
      }
    }
    const faces = [];
    for (let i = 0; i < cols; i += 1) {
      /* face traseira (enterrada) */
      faces.push([idx(0, 0, i), idx(0, 0, i + 1), idx(0, 1, i + 1), idx(0, 1, i)]);
      /* face frontal/externa (visível) */
      faces.push([idx(2, 0, i), idx(2, 1, i), idx(2, 1, i + 1), idx(2, 0, i + 1)]);
      /* bordas inferior e superior entre camadas 0->1 e 1->2 */
      for (let k = 0; k < 2; k += 1) {
        faces.push([idx(k, 0, i), idx(k + 1, 0, i), idx(k + 1, 0, i + 1), idx(k, 0, i + 1)]);
        faces.push([idx(k, 1, i), idx(k, 1, i + 1), idx(k + 1, 1, i + 1), idx(k + 1, 1, i)]);
      }
    }
    /* borda interna (i = 0) e borda lateral dianteira (i = cols) */
    for (let k = 0; k < 2; k += 1) {
      faces.push([idx(k, 0, 0), idx(k, 1, 0), idx(k + 1, 1, 0), idx(k + 1, 0, 0)]);
      faces.push([idx(k, 0, cols), idx(k + 1, 0, cols), idx(k + 1, 1, cols), idx(k, 1, cols)]);
    }
    return ['subdivisao', { origemId: id, niveis: 0, vertices: verts, faces }];
  };

  const emitirPar = (passoFn, mat) => {
    const id = proxId();
    const passo = passoFn(id);
    const o = { op: passo[0], id };
    passos.push(passo);
    const idE = proxId();
    passos.push(['espelha', { eixo: 'x', origemId: idE, derivaDe: o, sel: { origem: o } }]);
    marcar('lanternaTraseira', mat, { origem: o });
    marcar('lanternaTraseira', mat, { origem: { op: 'espelha', id: idE, de: o } });
  };

  /* 1. Carcaça interna preta e vedação perimetral ultrafina (sem moldura grossa na lateral) */
  emitirPar((id) => faixaCurva(id, 0.0, 0.995, 526, 847, 1.8, -24, 0.008, 1.0, 10, true), 'plasticoPreto');

  /* 2. Refletor metálico cromado atrás das lentes translúcidas (dá profundidade óptica real através dos prismas) */
  emitirPar((id) => faixaCurva(id, 0.04, 0.72, 534, 839, 1.9, -4, 0.01, 1.0, 6, true), 'refletorLanterna');

  /* 3. Duas faixas âmbar no topo separadas pelo sulco contínuo em V alinhado ao vinco horizontal da lateral (y = 794..800) */
  emitirPar((id) => faixaCurva(id, 0.012, 1.0, 800, 845, 5.2, -6, 0.014, 2.2, 14, true), 'lanternaSeta');
  emitirPar((id) => faixaCurva(id, 0.012, 1.0, 793.5, 800.5, 2.8, -6, 0.008, 0.5, 10, false), 'lanternaSulco');
  emitirPar((id) => faixaCurva(id, 0.012, 1.0, 736, 794, 5.2, -6, 0.014, 2.0, 10, false), 'lanternaSeta');

  /* 4. Faixa vermelha central (freio/posição) envolvendo todo o canto até a lateral */
  emitirPar((id) => faixaCurva(id, 0.012, 1.0, 621, 734, 5.2, -6, 0.014, 2.0, 10, false), 'lanternaFreio');

  /* 5. Faixa inferior: vermelho envolvendo a lateral, a base sob a ré e a borda interna, com a luz de ré cristal embutida */
  emitirPar((id) => faixaCurva(id, 0.012, 1.0, 528, 543, 5.2, -6, 0.014, 1.6, 10, false), 'lanternaFreio');
  emitirPar((id) => faixaCurva(id, 0.012, 0.095, 542, 619, 5.2, -6, 0.008, 1.6, 2, false), 'lanternaFreio');
  emitirPar((id) => faixaCurva(id, 0.44, 1.0, 542, 619, 5.2, -6, 0.014, 1.8, 7, false), 'lanternaFreio');
  emitirPar((id) => faixaCurva(id, 0.10, 0.435, 544, 617, 5.1, -6, 0.010, 1.8, 4, false), 'lanternaRe');

  // --- PLACA TRASEIRA ---
  const idPlacaT = proxId();
  const pT = t.placa;
  passos.push(caixa('chamferBox', idPlacaT, -pT.larg / 2, pT.larg / 2, pT.yCentro - pT.alt / 2, pT.yCentro + pT.alt / 2, pT.z0, pT.z1, 3));
  marcar('placaTraseira', 'placa', { origem: { op: 'chamferBox', id: idPlacaT } });

  // --- PUXADOR DA TAMPA ---
  const idPux = proxId();
  const pux = t.puxador;
  passos.push(caixa('chamferBox', idPux, -pux.larg / 2, pux.larg / 2, pux.yCentro - pux.alt / 2, pux.yCentro + pux.alt / 2, pux.z0, pux.z1, 4));
  marcar('puxadorTampa', 'plasticoPreto', { origem: { op: 'chamferBox', id: idPux } });

  // --- FECHADURA DA TAMPA ---
  const fech = t.fechadura;
  passos.push(['cilindro', {
    origemId: ID_FECHADURA, raio: m(fech.raio), altura: m(fech.z1 - fech.z0), lados: 20, eixo: 'z',
    em: [0, m(fech.yCentro), m(fech.z0)],
  }]);
  marcar('fechaduraTampa', 'plasticoPreto', { alias: 'fechaduraTampaInteiro' });

  // --- ESCAPAMENTO ---
  const esc = t.escapamento;
  passos.push(['cilindro', {
    origemId: ID_ESCAPAMENTO, raio: m(esc.raio), altura: m(esc.z1 - esc.z0), lados: 20, eixo: 'z',
    em: [m(esc.x), m(esc.y), m(esc.z0)],
  }]);
  marcar('escapamento', 'escapamento', { alias: 'escapamentoInteiro' });

  return passos;
}

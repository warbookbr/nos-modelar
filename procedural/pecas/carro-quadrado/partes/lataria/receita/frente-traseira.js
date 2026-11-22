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

  // --- GRADE FRONTAL (7 lâminas finas sobre fundo escuro recuado) ---
  const idGradeFundo = proxId();
  passos.push(caixa('cubo', idGradeFundo, -f.grade.meiaLarg, f.grade.meiaLarg, f.grade.y0 - 6, f.grade.y1 + 6, f.grade.zFundo0, f.grade.zFundo1));
  const idGradeTopo = proxId();
  passos.push(caixa('cubo', idGradeTopo, -f.grade.meiaLarg, f.grade.meiaLarg, f.grade.y1 - 8, f.grade.y1 + 2, f.grade.zFundo1, f.grade.zMoldura));
  const idGradeBase = proxId();
  passos.push(caixa('cubo', idGradeBase, -f.grade.meiaLarg, f.grade.meiaLarg, f.grade.y0 - 2, f.grade.y0 + 8, f.grade.zFundo1, f.grade.zMoldura));
  const idLamina = proxId();
  const passoLam = (f.grade.lamY1 - f.grade.lamY0) / (f.grade.laminas - 1);
  passos.push(caixa('cubo', idLamina, -f.grade.meiaLarg + 4, f.grade.meiaLarg - 4, f.grade.lamY0, f.grade.lamY0 + f.grade.lamAlt, f.grade.zFundo1, f.grade.zLamina));
  const idLaminas = proxId();
  const oLamina = { op: 'cubo', id: idLamina };
  passos.push(['arranja', {
    modo: 'linear',
    total: f.grade.laminas,
    d: [0, m(passoLam), 0],
    origemId: idLaminas,
    derivaDe: oLamina,
    sel: { origem: oLamina },
  }]);
  for (const origem of [
    { op: 'cubo', id: idGradeFundo },
    { op: 'cubo', id: idGradeTopo },
    { op: 'cubo', id: idGradeBase },
    oLamina,
    { op: 'arranja', id: idLaminas, de: oLamina },
  ]) {
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

  // --- FARÓIS PRINCIPAIS (carcaça profunda + parábola refletora côncava 3D + bulbo H4 + lente prismática translúcida) ---
  const fr = f.farol;
  const frCx = (fr.x0 + fr.x1) / 2;
  const frCy = (fr.y0 + fr.y1) / 2;
  const frRx = (fr.x1 - fr.x0) / 2;
  const frRy = (fr.y1 - fr.y0) / 2;

  /* 1. Fundo traseiro da carcaça preta (atrás da parábola, sem tampar a bacia refletora nem o bulbo H4!) */
  emitirParFrente('farol', (id) => caixa('cubo', id, fr.x0 - 2, fr.x1 + 3, fr.y0 - 6, fr.y1 + 6, fr.zCarc0 - 4, fr.zCarc0 + 4), 'plasticoFosco');
  /* Moldura externa escura OCO perimetral do farol (veda o vão frontal sem tampar a parábola!) */
  emitirParFrente('farol', (id) => {
    const x0 = fr.x0 - 2; const x1 = fr.x1 + 3; const y0 = fr.y0 - 6; const y1 = fr.y1 + 6;
    const xi0 = fr.x0 + 4; const xi1 = fr.x1 - 3; const yi0 = fr.y0 + 4; const yi1 = fr.y1 - 4;
    const zB = fr.zCarc0 + 2; const zF = fr.zCarc1 - 1;
    const verts = [
      [m(x0), m(y0), m(zB)], [m(x1), m(y0), m(zB)], [m(x1), m(y1), m(zB)], [m(x0), m(y1), m(zB)],
      [m(x0), m(y0), m(zF)], [m(x1), m(y0), m(zF)], [m(x1), m(y1), m(zF)], [m(x0), m(y1), m(zF)],
      [m(xi0), m(yi0), m(zF)], [m(xi1), m(yi0), m(zF)], [m(xi1), m(yi1), m(zF)], [m(xi0), m(yi1), m(zF)],
      [m(xi0), m(yi0), m(zB)], [m(xi1), m(yi0), m(zB)], [m(xi1), m(yi1), m(zB)], [m(xi0), m(yi1), m(zB)],
    ];
    const faces = [];
    for (let i = 0; i < 4; i += 1) {
      const j = (i + 1) % 4;
      faces.push([i, j, 4 + j, 4 + i]);
      faces.push([4 + i, 4 + j, 8 + j, 8 + i]);
      faces.push([8 + i, 8 + j, 12 + j, 12 + i]);
      faces.push([12 + i, 12 + j, j, i]);
    }
    return ['subdivisao', { origemId: id, niveis: 0, vertices: verts, faces }];
  }, 'plasticoFosco');

  /* 2. Aro claro/selante OCO perimetral do vidro do farol (N=32 suave, retângulo bem definido com cantos suaves) */
  const supFarol = (a, rx, ry, p) => {
    const ca = Math.cos(a); const sa = Math.sin(a);
    const sx = Math.sign(ca) * (Math.abs(ca) ** (2 / p));
    const sy = Math.sign(sa) * (Math.abs(sa) ** (2 / p));
    return [frCx + rx * sx, frCy + ry * sy];
  };
  emitirParFrente('farol', (id) => {
    const N = 32;
    const zF = (y) => fr.zLente1 - 2.5 - 6.5 * ((y - fr.y0) / (fr.y1 - fr.y0));
    const zB = fr.zCarc1 - 4;
    const verts = [];
    const specs = [
      { rx: frRx - 1.5, ry: frRy - 1.5, p: 8.5, frente: false },
      { rx: frRx - 1.5, ry: frRy - 1.5, p: 8.5, frente: true },
      { rx: frRx - 5.5, ry: frRy - 5.5, p: 8.0, frente: true },
      { rx: frRx - 5.5, ry: frRy - 5.5, p: 8.0, frente: false },
    ];
    for (const sp of specs) {
      for (let i = 0; i < N; i += 1) {
        const a = (2 * Math.PI * i) / N;
        const [x, y] = supFarol(a, sp.rx, sp.ry, sp.p);
        verts.push([m(x), m(y), m(sp.frente ? zF(y) : zB)]);
      }
    }
    const faces = [];
    for (let i = 0; i < N; i += 1) {
      const j = (i + 1) % N;
      faces.push([i, j, N + j, N + i]);
      faces.push([N + i, N + j, 2 * N + j, 2 * N + i]);
      faces.push([2 * N + i, 2 * N + j, 3 * N + j, 3 * N + i]);
      faces.push([3 * N + i, 3 * N + j, j, i]);
    }
    return ['subdivisao', { origemId: id, niveis: 0, vertices: verts, faces }];
  }, 'bordaVidroFarol');

  /* 3. Parábola refletora metálica côncava 3D (N=32 suave, bem profunda para criar contraste claro/escuro sob a lente) */
  emitirParFrente('farol', (id) => {
    const N = 32;
    const aneis = [
      { rx: frRx - 6, ry: frRy - 6, p: 7.5, z: fr.zLente1 - 6.0 },
      { rx: frRx * 0.72, ry: frRy * 0.72, p: 3.4, z: fr.zCarc0 + 27 },
      { rx: frRx * 0.34, ry: frRy * 0.38, p: 2.0, z: fr.zCarc0 + 10 },
    ];
    const verts = [];
    for (const an of aneis) {
      for (let i = 0; i < N; i += 1) {
        const a = (2 * Math.PI * i) / N;
        const [x, y] = supFarol(a, an.rx, an.ry, an.p);
        const dzTopo = ((y - frCy) / frRy) * -3.0;
        verts.push([m(x), m(y), m(an.z + dzTopo)]);
      }
    }
    const zTras = fr.zCarc0 + 4;
    for (let i = 0; i < N; i += 1) {
      const a = (2 * Math.PI * i) / N;
      const [x, y] = supFarol(a, aneis[0].rx, aneis[0].ry, aneis[0].p);
      verts.push([m(x), m(y), m(zTras)]);
    }
    const idxFundo = verts.length;
    verts.push([m(frCx), m(frCy), m(fr.zCarc0 + 7)]);
    const idxTras = verts.length;
    verts.push([m(frCx), m(frCy), m(zTras)]);

    const faces = [];
    for (let i = 0; i < N; i += 1) {
      const j = (i + 1) % N;
      faces.push([i, j, N + j, N + i]);
      faces.push([N + i, N + j, 2 * N + j, 2 * N + i]);
      faces.push([2 * N + i, 2 * N + j, idxFundo]);
      faces.push([i, 3 * N + i, 3 * N + j, j]);
      faces.push([3 * N + j, 3 * N + i, idxTras]);
    }
    return ['subdivisao', { origemId: id, niveis: 0, vertices: verts, faces }];
  }, 'refletorFarol');

  /* 4. Defletor / calota central da lâmpada H4 em metal escurecido no foco da parábola */
  emitirParFrente('farol', (id) => {
    const N = 16;
    const r = 17;
    const z0 = fr.zCarc0 + 10;
    const z1 = fr.zCarc0 + 36;
    const verts = [];
    for (let i = 0; i < N; i += 1) {
      const a = (2 * Math.PI * i) / N;
      verts.push([m(frCx + r * Math.cos(a)), m(frCy + r * Math.sin(a)), m(z0)]);
    }
    for (let i = 0; i < N; i += 1) {
      const a = (2 * Math.PI * i) / N;
      verts.push([m(frCx + r * 0.82 * Math.cos(a)), m(frCy + r * 0.82 * Math.sin(a)), m(z1)]);
    }
    const idxB = verts.length;
    verts.push([m(frCx), m(frCy), m(z0)]);
    const idxF = verts.length;
    verts.push([m(frCx), m(frCy), m(z1 + 5)]);
    const faces = [];
    for (let i = 0; i < N; i += 1) {
      const j = (i + 1) % N;
      faces.push([j, i, idxB]);
      faces.push([i, j, N + j, N + i]);
      faces.push([N + i, N + j, idxF]);
    }
    return ['subdivisao', { origemId: id, niveis: 0, vertices: verts, faces }];
  }, 'calotaLampada');

  /* 5. Lente de vidro curva transparente/prismática (N=32 suave, revelando parábola + defletor H4 por dentro) */
  emitirParFrente('farol', (id) => {
    const N = 32;
    const zFrente = (x, y, extra) => {
      const tY = (y - fr.y0) / (fr.y1 - fr.y0);
      const tX = Math.max(0, (x - fr.x0) / (fr.x1 - fr.x0));
      return fr.zLente1 - 6.5 * tY - 4.0 * tX * tX + extra;
    };
    const verts = [];
    const camadas = [
      { rx: frRx - 4.5, ry: frRy - 4.5, p: 8.5, zFn: (x, y) => zFrente(x, y, -4.0) },
      { rx: frRx - 4.5, ry: frRy - 4.5, p: 8.5, zFn: (x, y) => zFrente(x, y, -1.5) },
      { rx: frRx - 8.5, ry: frRy - 8.5, p: 7.5, zFn: (x, y) => zFrente(x, y, 1.5) },
    ];
    for (const c of camadas) {
      for (let i = 0; i < N; i += 1) {
        const a = (2 * Math.PI * i) / N;
        const [x, y] = supFarol(a, c.rx, c.ry, c.p);
        verts.push([m(x), m(y), m(c.zFn(x, y))]);
      }
    }
    const idxTras = verts.length;
    verts.push([m(frCx), m(frCy), m(zFrente(frCx, frCy, -3.5))]);
    const idxFrente = verts.length;
    verts.push([m(frCx), m(frCy), m(zFrente(frCx, frCy, 2.5))]);

    const faces = [];
    for (let i = 0; i < N; i += 1) {
      const j = (i + 1) % N;
      faces.push([j, i, idxTras]);
      faces.push([i, j, N + j, N + i]);
      faces.push([N + i, N + j, 2 * N + j, 2 * N + i]);
      faces.push([2 * N + i, 2 * N + j, idxFrente]);
    }
    return ['subdivisao', { origemId: id, niveis: 0, vertices: verts, faces }];
  }, 'lenteFarol');

  // --- SETAS DIANTEIRAS (compactas e envolventes 3D no canto do para-lama, com refletor + lente âmbar prismática) ---
  const stD = f.seta;
  const amostrarPeleFrente = (u, y, offsetMm = 0) => {
    const tY = Math.max(0, Math.min(1, (y - stD.y0) / (stD.y1 - stD.y0)));
    /* frente levemente recuada no topo acompanhando o capô */
    const zF = 2008 - 7 * tY;
    const xS = 804 + 2 * Math.sin(Math.PI * tY);
    const zS = 1922 + 6 * tY; // borda traseira na lateral levemente inclinada
    const x0 = stD.x0;
    const xC = xS - 54;
    const zC = zF - 46;
    let x; let z; let nx; let nz;
    if (u <= 0.36) {
      const s = u / 0.36;
      x = x0 + (xC - x0) * s;
      z = zF - 9 * s * s;
      const len = Math.hypot(0.18 * s, 1);
      nx = (0.18 * s) / len;
      nz = 1 / len;
    } else if (u <= 0.78) {
      const a = ((u - 0.36) / 0.42) * (Math.PI / 2);
      x = xC + (xS - xC) * Math.sin(a);
      z = zC + (zF - 9 - zC) * Math.cos(a);
      nx = Math.sin(a);
      nz = Math.cos(a);
    } else {
      const s = (u - 0.78) / 0.22;
      x = xS;
      z = zC - (zC - zS) * s;
      nx = 1;
      nz = 0;
    }
    const taper = offsetMm > 0 && u > 0.84 ? 1 - 0.50 * ((u - 0.84) / 0.16) : 1;
    const off = offsetMm * taper;
    return [m(x + nx * off), m(y), m(z + nz * off)];
  };

  const faixaCurvaFrente = (id, u0, u1, y0, y1, offFora, offTras, chanfroU = 0.018, chanfroY = 3.5, cols = 10, arredondaLat = true) => {
    const verts = [];
    const usBase = [];
    const usFrente = [];
    for (let i = 0; i <= cols; i += 1) {
      const g = i / cols;
      usBase.push(u0 + (u1 - u0) * g);
      usFrente.push((u0 + chanfroU) + ((u1 - chanfroU) - (u0 + chanfroU)) * g);
    }
    const arred = (u, dy) => {
      if (!arredondaLat || u <= 0.78) return 0;
      const k = (u - 0.78) / 0.22;
      return dy * k * k;
    };
    const offBase = offFora > 0 ? Math.max(0.6, offFora - 2.6) : offFora;
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
          const y = linha === 0 ? y0 + c.dy0 + arred(u, 6) : y1 + c.dy1 - arred(u, 7);
          verts.push(amostrarPeleFrente(u, y, c.off));
        }
      }
    }
    const faces = [];
    for (let i = 0; i < cols; i += 1) {
      /* face traseira interna (-z / -x) */
      faces.push([idx(0, 0, i), idx(0, 1, i), idx(0, 1, i + 1), idx(0, 0, i + 1)]);
      /* face frontal/externa visível (+z / +x) */
      faces.push([idx(2, 0, i), idx(2, 0, i + 1), idx(2, 1, i + 1), idx(2, 1, i)]);
      /* bordas inferior (-y) e superior (+y) entre camadas */
      for (let k = 0; k < 2; k += 1) {
        faces.push([idx(k, 0, i), idx(k, 0, i + 1), idx(k + 1, 0, i + 1), idx(k + 1, 0, i)]);
        faces.push([idx(k, 1, i), idx(k + 1, 1, i), idx(k + 1, 1, i + 1), idx(k, 1, i + 1)]);
      }
    }
    /* borda interna junto ao farol (i = 0, normal -x) e borda lateral traseira (i = cols, normal -z) */
    for (let k = 0; k < 2; k += 1) {
      faces.push([idx(k, 0, 0), idx(k + 1, 0, 0), idx(k + 1, 1, 0), idx(k, 1, 0)]);
      faces.push([idx(k, 0, cols), idx(k, 1, cols), idx(k + 1, 1, cols), idx(k + 1, 0, cols)]);
    }
    return ['subdivisao', { origemId: id, niveis: 0, vertices: verts, faces }];
  };

  /* 1. Vedação/carcaça fina preta do pisca (encosta e fecha o canto) */
  emitirParFrente('setaDianteira', (id) => faixaCurvaFrente(id, 0.0, 0.99, stD.y0 - 2, stD.y1 + 2, 1.6, -24, 0.01, 1.5, 10, true), 'plasticoFosco');
  /* 2. Refletor cromado interno atrás da lente âmbar */
  emitirParFrente('setaDianteira', (id) => faixaCurvaFrente(id, 0.04, 0.82, stD.y0 + 4, stD.y1 - 4, 1.8, -6, 0.015, 2.0, 8, true), 'refletorFarol');
  /* 3. Lente âmbar prismática translúcida envolvente */
  emitirParFrente('setaDianteira', (id) => faixaCurvaFrente(id, 0.015, 1.0, stD.y0 + 1, stD.y1 - 1, 6.2, -5, 0.024, 4.5, 12, true), 'setaAmbar');

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

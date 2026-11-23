/* conformar-na-chapa.test.mjs — provas numéricas de conformação sobre chapa curva sintética (trilho aberto, contorno fechado,
 * adaptação automática à mudança de curvatura, simetria e recusas explícitas). */

import { describe, expect, it } from 'vitest';
import { conformarNaChapa, ErroConformarNaChapa, FICHA } from './conformar-na-chapa.js';
import { nucleo } from './entrada.js';
import { prepararPontoNaMalha } from './ponto-na-malha.js';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);

/**
 * Gera uma chapa curva sintética em mm (arco parabólico em Z ao longo de X, extrudado em Y)
 * usando apenas `subdivisao` do núcleo, sem dependência de domínio.
 * `flechaMm` controla a curvatura (deslocamento máximo em +Z no centro x = 0).
 */
function criarChapaCurvaSintetica(flechaMm, larguraX = 320, alturaY = 180) {
  const nx = 8;
  const ny = 4;
  const hx = larguraX / 2;
  const hy = alturaY / 2;
  const vertices = [];
  for (let iy = 0; iy <= ny; iy += 1) {
    const y = -hy + (alturaY * iy) / ny;
    for (let ix = 0; ix <= nx; ix += 1) {
      const x = -hx + (larguraX * ix) / nx;
      const u = x / hx; // [-1, 1]
      const z = flechaMm * (1 - u * u);
      vertices.push([x, y, z]);
    }
  }
  const faces = [];
  const stride = nx + 1;
  for (let iy = 0; iy < ny; iy += 1) {
    for (let ix = 0; ix < nx; ix += 1) {
      const a = iy * stride + ix;
      const b = a + 1;
      const c = a + stride + 1;
      const d = a + stride;
      faces.push([a, b, c, d]);
    }
  }
  const passos = [
    ['subdivisao', { origemId: 1, vertices, faces, niveis: 2, espessura: 2 }],
  ];
  return { passos, origem: { op: 'subdivisao', id: 1 } };
}

/** Confere que todas as arestas da malha são compartilhadas por exatamente 2 faces (1 em cada sentido). */
function conferirMalhaFechada(st, parte) {
  const dirigidas = new Map();
  let facesDaParte = 0;
  for (const f of st.F.values()) {
    if (parte && f.parte !== parte) continue;
    facesDaParte += 1;
    const vs = f.vs;
    for (let k = 0; k < vs.length; k += 1) {
      const a = vs[k];
      const b = vs[(k + 1) % vs.length];
      const ch = `${a}|${b}`;
      dirigidas.set(ch, (dirigidas.get(ch) ?? 0) + 1);
    }
  }
  expect(facesDaParte).toBeGreaterThan(0);
  for (const [ch, qtd] of dirigidas) {
    expect(qtd).toBe(1);
    const [a, b] = ch.split('|');
    expect(dirigidas.has(`${b}|${a}`)).toBe(true);
  }
}

const MATERIAIS_TESTE = {
  plastico: { cor: '#222222' },
  vidro: { cor: '#88ccff' },
};

/** Mede o erro máximo de aderência entre os vértices de uma parte e a superfície externa da chapa. */
function medirErroAderencia(chapa, res, deslocamentoEsperadoMm, espessuraOuAlturaMm, parteNome, chanfroMm = 0) {
  const st = nucleo([
    ...chapa.passos,
    ['parte', { nome: '__pele__', sel: { origem: { ...chapa.origem, parte: 'externa' } } }],
    ...res.passos,
  ], {}, res.pontos, MATERIAIS_TESTE);
  expect(st.orfaos).toEqual([]);

  const idsPele = [...st.F.values()].filter((f) => f.parte === '__pele__').map((f) => f.id);
  const grade = prepararPontoNaMalha(st.V, st.F, idsPele);

  const vertsPeca = new Set();
  for (const f of st.F.values()) {
    if (f.parte === parteNome) {
      for (const v of f.vs) vertsPeca.add(v);
    }
  }
  expect(vertsPeca.size).toBeGreaterThan(0);

  const alturasEsperadas = chanfroMm > 0
    ? [
        deslocamentoEsperadoMm,
        deslocamentoEsperadoMm + chanfroMm,
        deslocamentoEsperadoMm + espessuraOuAlturaMm - chanfroMm,
        deslocamentoEsperadoMm + espessuraOuAlturaMm,
      ]
    : [deslocamentoEsperadoMm, deslocamentoEsperadoMm + espessuraOuAlturaMm];

  let erroMaxInterna = 0;
  let distMin = Infinity;
  let distMax = -Infinity;
  const errosPorVertice = [];

  for (const vid of vertsPeca) {
    const p = st.V.get(vid);
    const r = grade.maisProximo(p);
    expect(r).not.toBeNull();
    const s = p[2] >= r.ponto[2] ? 1 : -1;
    const distAssinada = s * r.distancia;
    distMin = Math.min(distMin, distAssinada);
    distMax = Math.max(distMax, distAssinada);
    const erroVertice = Math.min(...alturasEsperadas.map((h) => Math.abs(distAssinada - h)));
    errosPorVertice.push(erroVertice);
    if (Math.abs(distAssinada - deslocamentoEsperadoMm) <= (chanfroMm > 0 ? chanfroMm * 0.5 : espessuraOuAlturaMm * 0.5)) {
      erroMaxInterna = Math.max(erroMaxInterna, Math.abs(distAssinada - deslocamentoEsperadoMm));
    }
  }

  const erroMaxGeral = Math.max(...errosPorVertice);
  return { st, erroMaxInterna, erroMaxGeral, distMin, distMax };
}

describe('conformarNaChapa — FICHA e validação', () => {
  it('exporta FICHA no padrão do núcleo', () => {
    expect(FICHA.nome).toBe('conformarNaChapa');
    expect(FICHA.campos).toContain('trilho');
    expect(FICHA.campos).toContain('contorno');
    expect(typeof conformarNaChapa).toBe('function');
  });

  it('recusa argumentos inválidos com mensagens explícitas', () => {
    const chapa = criarChapaCurvaSintetica(40);
    expect(() => conformarNaChapa(null)).toThrow(ErroConformarNaChapa);
    expect(() => conformarNaChapa({ malha: chapa, vista: 'z' })).toThrow(ErroConformarNaChapa);
    expect(() => conformarNaChapa({
      malha: chapa,
      vista: 'z',
      trilho: [[0, 0], [10, 0]],
      contorno: [[0, 0], [10, 0], [10, 10]],
      secao: { largura: 10, altura: 5 },
      espessuraMm: 3,
    })).toThrow(ErroConformarNaChapa);
    expect(() => conformarNaChapa({
      malha: chapa,
      vista: 'w',
      trilho: [[0, 0], [10, 0]],
      secao: { largura: 10, altura: 5 },
    })).toThrow(ErroConformarNaChapa);
    expect(() => conformarNaChapa({
      malha: chapa,
      vista: 'z',
      contorno: [[0, 0], [20, 20], [20, 0], [0, 20]],
      espessuraMm: 3,
    })).toThrow(ErroConformarNaChapa);
    expect(() => conformarNaChapa({
      malha: chapa,
      vista: 'z',
      trilho: [[900, 900], [950, 900]],
      secao: { largura: 10, altura: 5 },
    })).toThrow(ErroConformarNaChapa);
    expect(() => conformarNaChapa({
      malha: chapa,
      vista: 'z',
      sentido: '*',
      trilho: [[0, 0], [10, 0]],
      secao: { largura: 10, altura: 5 },
    })).toThrow(ErroConformarNaChapa);
    expect(() => conformarNaChapa({
      malha: chapa,
      vista: 'z',
      unidade: 'cm',
      trilho: [[0, 0], [10, 0]],
      secao: { largura: 10, altura: 5 },
    })).toThrow(ErroConformarNaChapa);
    expect(() => conformarNaChapa({
      malha: chapa,
      vista: 'z',
      simetria: 'y',
      trilho: [[10, 0], [50, 0]],
      secao: { largura: 10, altura: 5 },
    })).toThrow(ErroConformarNaChapa);
    expect(() => conformarNaChapa({
      malha: chapa,
      vista: 'z',
      simetria: 'x',
      trilho: [[-50, 0], [50, 0]],
      secao: { largura: 10, altura: 5 },
    })).toThrow(ErroConformarNaChapa);
    expect(() => conformarNaChapa({
      malha: chapa,
      vista: 'z',
      simetria: 'x',
      contorno: [[-20, -20], [40, -20], [40, 20], [-20, 20]],
      espessuraMm: 3,
    })).toThrow(ErroConformarNaChapa);
  });
});

describe('conformarNaChapa — modo trilho aberto', () => {
  it('conforma friso em trilho aberto sobre chapa curva com erro < 1 mm e malha fechada', () => {
    const chapa = criarChapaCurvaSintetica(45);
    const deslocamentoMm = 2.0;
    const secao = { largura: 16, altura: 8, chanfro: 2 };

    const res = conformarNaChapa({
      malha: chapa,
      vista: 'z',
      sentido: '+',
      trilho: [[-110, -20], [0, 0], [110, 20]],
      secao,
      deslocamentoMm,
      amostragemMm: 10,
      nome: 'frisoCurvo',
      material: 'plastico',
    });

    expect(res.modo).toBe('trilho');
    expect(res.passos.some((p) => p[0] === 'subdivisao')).toBe(true);
    expect(res.passos.some((p) => p[0] === 'parte' && p[1].nome === 'frisoCurvo')).toBe(true);
    expect(res.passos.some((p) => p[0] === 'material' && p[1].usa === 'plastico')).toBe(true);

    const med = medirErroAderencia(chapa, res, deslocamentoMm, secao.altura, 'frisoCurvo', secao.chanfro);
    conferirMalhaFechada(med.st, 'frisoCurvo');
    expect(Math.abs(med.distMin - deslocamentoMm)).toBeLessThan(1.0);
    expect(med.erroMaxInterna).toBeLessThan(1.0);
    expect(med.erroMaxGeral).toBeLessThan(1.0);
  });

  it('acompanha automaticamente quando a curvatura da chapa sintética muda, com os mesmos argumentos', () => {
    const deslocamentoMm = 1.5;
    const secao = { largura: 14, altura: 6 };
    const opcoesBase = {
      vista: 'z',
      sentido: '+',
      trilho: [[-120, 0], [0, 0], [120, 0]],
      secao,
      deslocamentoMm,
      amostragemMm: 8,
      nome: 'barra',
    };

    const chapa1 = criarChapaCurvaSintetica(25);
    const res1 = conformarNaChapa({ ...opcoesBase, malha: chapa1 });
    const med1 = medirErroAderencia(chapa1, res1, deslocamentoMm, secao.altura, 'barra');
    expect(med1.erroMaxGeral).toBeLessThan(1.0);

    // Altera a curvatura da chapa (flecha de 25 mm -> 85 mm) e reexecuta com os mesmos argumentos
    const chapa2 = criarChapaCurvaSintetica(85);
    const res2 = conformarNaChapa({ ...opcoesBase, malha: chapa2 });
    const med2 = medirErroAderencia(chapa2, res2, deslocamentoMm, secao.altura, 'barra');
    expect(med2.erroMaxGeral).toBeLessThan(1.0);

    // Garante que a peça realmente se deslocou em Z para acompanhar a nova curvatura
    expect(med2.distMax).toBeGreaterThan(med1.distMax - 1);
    const zCentro1 = Math.max(...Object.values(res1.pontos).map((p) => p[2]));
    const zCentro2 = Math.max(...Object.values(res2.pontos).map((p) => p[2]));
    expect(zCentro2 - zCentro1).toBeGreaterThan(40);
  });

  it('recusa explicitamente indicando o ponto quando o raio local é menor que a meia-seção e causa dobra', () => {
    // Chapa plana em XY para testar curva lateral fechada com raio < largura / 2
    const chapaPlana = criarChapaCurvaSintetica(0, 400, 400);
    expect(() => conformarNaChapa({
      malha: chapaPlana,
      vista: 'z',
      sentido: '+',
      trilho: [[-80, 0], [0, 0], [0, 80]],
      secao: { largura: 40, altura: 10 },
      deslocamentoMm: 1,
      amostragemMm: 5,
    })).toThrow(/meia-largura|dobra|auto-interseção/i);

    // Canto côncavo vivo em Z com raio menor que a meia-seção e sem suavização suficiente
    const chapaConcava = {
      passos: [
        ['subdivisao', {
          origemId: 1,
          vertices: [
            [-100, -100, 100], [0, -100, 0], [100, -100, 100],
            [-100, 100, 100], [0, 100, 0], [100, 100, 100],
          ],
          faces: [
            [0, 1, 4, 3],
            [1, 2, 5, 4],
          ],
          niveis: 0,
        }],
      ],
      origem: { op: 'subdivisao', id: 1 },
    };

    expect(() => conformarNaChapa({
      malha: chapaConcava,
      vista: 'z',
      sentido: '+',
      trilho: [[-60, 0], [60, 0]],
      secao: { largura: 12, altura: 30 },
      deslocamentoMm: 2,
      amostragemMm: 10,
      suavizarNormal: false,
    })).toThrow(/ponto \[|auto-interseção/i);
  });
});

describe('conformarNaChapa — modo contorno fechado', () => {
  it('conforma placa/lente recuada (deslocamentoMm negativo) sobre chapa curva com aderência < 1 mm e malha fechada', () => {
    const chapa = criarChapaCurvaSintetica(50);
    const deslocamentoMm = -4.0;
    const espessuraMm = 3.0;

    const res = conformarNaChapa({
      malha: chapa,
      vista: 'z',
      sentido: '+',
      contorno: [[-80, -35], [80, -35], [80, 35], [-80, 35]],
      deslocamentoMm,
      espessuraMm,
      amostragemMm: 12,
      gradeMm: 14,
      nome: 'lenteRecuada',
      material: 'vidro',
    });

    expect(res.modo).toBe('contorno');
    expect(res.estatisticas.pontosInternos).toBeGreaterThan(0);
    expect(res.passos.some((p) => p[0] === 'material' && p[1].usa === 'vidro')).toBe(true);

    const med = medirErroAderencia(chapa, res, deslocamentoMm, espessuraMm, 'lenteRecuada');
    conferirMalhaFechada(med.st, 'lenteRecuada');
    expect(med.erroMaxInterna).toBeLessThan(1.0);
    expect(med.erroMaxGeral).toBeLessThan(1.0);
    expect(med.distMin).toBeLessThan(-3.0);
    expect(med.distMax).toBeLessThan(0.0);
  });

  it('suporta simetria: "x" para espelhar peça gerada na metade x >= 0', () => {
    const chapa = criarChapaCurvaSintetica(40);
    const res = conformarNaChapa({
      malha: chapa,
      vista: 'z',
      sentido: '+',
      contorno: [[20, -25], [90, -25], [90, 25], [20, 25]],
      deslocamentoMm: 2.0,
      espessuraMm: 3.0,
      amostragemMm: 15,
      simetria: 'x',
      nome: 'placaSimetrica',
    });

    const st = nucleo(res.passos, {}, res.pontos);
    expect(st.orfaos).toEqual([]);
    const xs = [...st.V.values()].map((p) => p[0]);
    expect(Math.min(...xs)).toBeLessThan(-80);
    expect(Math.max(...xs)).toBeGreaterThan(80);
  });

  it('conforma contorno em sentido horário (CW) mantendo malha fechada e aderência < 1 mm', () => {
    const chapa = criarChapaCurvaSintetica(45);
    const deslocamentoMm = 2.5;
    const espessuraMm = 3.5;

    const res = conformarNaChapa({
      malha: chapa,
      vista: 'z',
      sentido: '+',
      // Ordem horária (CW):
      contorno: [[-70, -30], [-70, 30], [70, 30], [70, -30]],
      deslocamentoMm,
      espessuraMm,
      amostragemMm: 12,
      gradeMm: 14,
      nome: 'placaCW',
    });

    const med = medirErroAderencia(chapa, res, deslocamentoMm, espessuraMm, 'placaCW');
    conferirMalhaFechada(med.st, 'placaCW');
    expect(med.erroMaxInterna).toBeLessThan(1.0);
    expect(med.erroMaxGeral).toBeLessThan(1.0);
  });

  it('suporta unidade: "m" tanto no modo trilho quanto no modo contorno com erro < 1 mm (0,001 m)', () => {
    const chapaMm = criarChapaCurvaSintetica(40);
    const chapaM = {
      passos: chapaMm.passos.map(([op, a]) => [op, {
        ...a,
        vertices: a.vertices.map((p) => p.map((x) => x / 1000)),
        espessura: a.espessura / 1000,
      }]),
      origem: chapaMm.origem,
    };

    const resTrilho = conformarNaChapa({
      malha: chapaM,
      unidade: 'm',
      vista: 'z',
      sentido: '+',
      trilho: [[-0.1, 0], [0, 0], [0.1, 0]],
      secao: { largura: 14, altura: 6 },
      deslocamentoMm: 2,
      amostragemMm: 10,
      nome: 'frisoMetro',
    });

    const medT = medirErroAderencia(chapaM, resTrilho, 0.002, 0.006, 'frisoMetro');
    conferirMalhaFechada(medT.st, 'frisoMetro');
    expect(medT.erroMaxGeral).toBeLessThan(0.001);

    const resContorno = conformarNaChapa({
      malha: chapaM,
      unidade: 'm',
      vista: 'z',
      sentido: '+',
      contorno: [[-0.06, -0.025], [0.06, -0.025], [0.06, 0.025], [-0.06, 0.025]],
      deslocamentoMm: -3,
      espessuraMm: 2.5,
      amostragemMm: 12,
      gradeMm: 14,
      nome: 'lenteMetro',
    });

    const medC = medirErroAderencia(chapaM, resContorno, -0.003, 0.0025, 'lenteMetro');
    conferirMalhaFechada(medC.st, 'lenteMetro');
    expect(medC.erroMaxGeral).toBeLessThan(0.001);
  });

  it('suporta simetria: "x" no modo trilho tocando x = 0 sem faces internas duplicadas', () => {
    const chapa = criarChapaCurvaSintetica(40);
    const deslocamentoMm = 2.0;
    const secao = { largura: 12, altura: 6 };

    const res = conformarNaChapa({
      malha: chapa,
      vista: 'z',
      sentido: '+',
      trilho: [[0, 0], [60, 0], [110, 15]],
      secao,
      deslocamentoMm,
      amostragemMm: 10,
      simetria: 'x',
      nome: 'frisoSimetrico',
    });

    const med = medirErroAderencia(chapa, res, deslocamentoMm, secao.altura, 'frisoSimetrico');
    conferirMalhaFechada(med.st, 'frisoSimetrico');
    expect(med.erroMaxGeral).toBeLessThan(1.0);
    const xs = [...med.st.V.values()].filter((_, idx) => idx >= 0).map((p) => p[0]);
    expect(Math.min(...xs)).toBeLessThan(-100);
    expect(Math.max(...xs)).toBeGreaterThan(100);
  });

  it('suporta perfil 2D livre e modulação longitudinal no modo trilho', () => {
    const chapa = criarChapaCurvaSintetica(40);
    const perfil = [
      [0, -10],
      [12, -6],
      [14, 4],
      [4, 10],
      [-4, 8],
    ];
    const res = conformarNaChapa({
      malha: chapa,
      vista: 'z',
      sentido: '+',
      trilho: [[-100, 0], [0, 0], [100, 0]],
      perfil,
      modulacao: [[0, 0.3], [0.25, 1], [0.75, 1], [1, 0.3]],
      deslocamentoMm: 1,
      amostragemMm: 10,
      nome: 'molduraPerfil',
    });

    const st = nucleo(res.passos, {}, res.pontos);
    expect(st.orfaos).toHaveLength(0);
    conferirMalhaFechada(st, 'molduraPerfil');

    /* no centro (x ~ 0) a seção tem altura plena (~14 mm); nas pontas (x ~ ±100) encolhe para ~30% */
    const zsCentro = [...st.V.values()].filter((p) => Math.abs(p[0]) < 5).map((p) => p[2]);
    const zsPonta = [...st.V.values()].filter((p) => p[0] > 95).map((p) => p[2]);
    const ampCentro = Math.max(...zsCentro) - Math.min(...zsCentro);
    const ampPonta = Math.max(...zsPonta) - Math.min(...zsPonta);
    expect(ampCentro).toBeGreaterThan(ampPonta * 2);
  });

  it('projeta continuamente sobre múltiplas malhas-alvo (malhas) atravessando fresta dentro de frestaMaximaMm e recusa acima do teto', () => {
    /* dois painéis planos separados por uma fresta de 6 mm em x = [-3, +3] */
    const painelEsq = ([u, v]) => (u <= -3 ? { ponto: [u, v, 20], normal: [0, 0, 1] } : null);
    const painelDir = ([u, v]) => (u >= 3 ? { ponto: [u, v, 20], normal: [0, 0, 1] } : null);

    const res = conformarNaChapa({
      malhas: [painelEsq, painelDir],
      vista: 'z',
      sentido: '+',
      trilho: [[-60, 0], [60, 0]],
      secao: { largura: 16, altura: 8 },
      frestaMaximaMm: 15,
      amostragemMm: 4,
      nome: 'molduraMultipainel',
    });

    const st = nucleo(res.passos, {}, res.pontos);
    expect(st.orfaos).toHaveLength(0);
    conferirMalhaFechada(st, 'molduraMultipainel');

    /* recusa quando a fresta excede frestaMaximaMm */
    expect(() => conformarNaChapa({
      malhas: [painelEsq, painelDir],
      vista: 'z',
      sentido: '+',
      trilho: [[-60, 0], [60, 0]],
      secao: { largura: 16, altura: 8 },
      frestaMaximaMm: 5,
      amostragemMm: 4,
      nome: 'molduraFrestaGrande',
    })).toThrow(/frestaMaximaMm/);
  });
});

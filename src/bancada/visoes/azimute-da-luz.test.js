/* azimute-da-luz.test.js — a direção e a escolha do azimute da luz rasante da bancada contra as de `tools/blender/superficie.py`.
 *
 * A bancada passa outras amostras que o Blender (as normais dos triângulos, e não os pixels), mas a conta sobre as amostras tem
 * de ser a mesma: o teste roda o próprio `superficie.py` no python3 do sistema sobre as mesmas normais e compara a direção, os
 * azimutes e as frações. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ELEVACOES_DA_LUZ, amostrasDaVista, direcaoDaLuz, escolherAzimutes, escolherLuz, legibilidadeDaLuz } from './azimute-da-luz.js';

const BLENDER = fileURLToPath(new URL('../../../tools/blender/', import.meta.url));
const temNumpy = spawnSync('python3', ['-c', 'import numpy'], { encoding: 'utf8' }).status === 0;

/* Um gerador determinístico, para as normais saírem as mesmas a cada rodada. */
function sorteio(semente) {
  let s = semente >>> 0;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0;
    return s / 2 ** 32;
  };
}

function normaisDeUmaChapaOndulada(n, semente) {
  const r = sorteio(semente);
  const N = [];
  for (let i = 0; i < n; i++) {
    /* a maior parte voltada para +y, com inclinação de até 40 graus, e um quinto em qualquer direção */
    const v = i % 5 === 0 ? [r() - 0.5, r() - 0.5, r() - 0.5] : [(r() - 0.5) * 1.4, 1, (r() - 0.5) * 1.4];
    const l = Math.hypot(...v);
    N.push(...v.map((c) => c / l));
  }
  return N;
}

const unit = (v) => { const l = Math.hypot(...v); return v.map((c) => c / l); };
const VISTAS = {
  topo: { xCam: [1, 0, 0], yCam: [0, 0, -1], zCam: [0, 1, 0] },
  tresquartos: (() => {
    const z = unit([1, 1, 1]);
    const x = unit([1, 0, -1]);
    const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    return { xCam: x, yCam: y, zCam: z };
  })(),
};

function doPython(normais, vista, rasante, azimute) {
  const programa = `
import json, sys
sys.path.insert(0, ${JSON.stringify(BLENDER)})
import superficie as S
e = json.load(sys.stdin)
v = {'x_cam': e['x'], 'y_cam': e['y'], 'z_cam': e['z']}
az, est = S.escolher_azimutes(e['N'], v, e['rasante'])
d = S.direcao_da_luz(v, e['rasante'], e['azimute'])
print(json.dumps({'azimutes': az, 'estimativa': {str(k): v for k, v in est.items()}, 'direcao': [float(x) for x in d]}))
`;
  const r = spawnSync('python3', ['-c', programa], {
    input: JSON.stringify({ N: normais, x: vista.xCam, y: vista.yCam, z: vista.zCam, rasante, azimute }),
    encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error(r.stderr);
  return JSON.parse(r.stdout);
}

describe('azimute da luz rasante', () => {
  it('a luz viaja a 10 graus do plano da imagem, para dentro da cena', () => {
    const d = direcaoDaLuz(VISTAS.topo, 10, 0);
    expect(Math.hypot(...d)).toBeCloseTo(1, 12);
    /* a componente ao longo do olhar (-zCam) é sin(10°), e a do azimute 0 (xCam) é cos(10°) */
    expect(-d[1]).toBeCloseTo(Math.sin((10 * Math.PI) / 180), 12);
    expect(d[0]).toBeCloseTo(Math.cos((10 * Math.PI) / 180), 12);
  });

  it('as amostras da vista são os triângulos voltados para a câmera, pesados pela área projetada', () => {
    /* um triângulo de frente (área 0,5, normal +y) e um de costas */
    const tris = [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1];
    const { normais, pesos } = amostrasDaVista(tris, [0, 1, 0]);
    expect([...normais]).toEqual([0, 1, 0]);
    expect([...pesos]).toEqual([0.5]);
    /* só de costas: entram todos */
    expect(amostrasDaVista(tris.slice(0, 9), [0, -1, 0]).pesos).toHaveLength(1);
  });

  it.skipIf(!temNumpy)('a direção, os azimutes e as frações são os do superficie.py sobre as mesmas normais', () => {
    for (const [nome, vista] of Object.entries(VISTAS)) {
      for (const semente of [1, 7, 23]) {
        const normais = normaisDeUmaChapaOndulada(400, semente);
        const py = doPython(normais, vista, 10, 35);
        const js = escolherAzimutes(normais, vista, 10);
        expect(js.azimutes, `${nome}, semente ${semente}`).toEqual(py.azimutes);
        for (const a of js.azimutes) expect(js.estimativa[a]).toEqual(py.estimativa[a.toFixed(1)]); /* o Python escreve a chave em float */
        direcaoDaLuz(vista, 10, 35).forEach((c, k) => expect(c).toBeCloseTo(py.direcao[k], 12));
      }
    }
  });

  it('sem amostra, fica o azimute preferido', () => {
    expect(escolherAzimutes([], VISTAS.topo).azimutes).toEqual([30, 120]);
    expect(escolherLuz([], VISTAS.topo)).toMatchObject({ azimute: 30, elevacao: 10 });
  });
});

describe('a luz única da bancada', () => {
  const seno = (g) => Math.sin((g * Math.PI) / 180);

  it('a legibilidade é 1 até a superfície a 10 graus da luz, cai com a luz de frente e é 0 na sombra e no branco', () => {
    for (const g of [1, 5, 10]) expect(legibilidadeDaLuz(seno(g))).toBe(1);
    expect(legibilidadeDaLuz(seno(20))).toBeCloseTo(0.64, 2);
    expect(legibilidadeDaLuz(seno(45))).toBeCloseTo(0.32, 2);
    expect(legibilidadeDaLuz(seno(60))).toBeCloseTo(0.2, 2);
    /* o brilho 0,2 * sin(g) / sin(10°) passa de 1 a 60,3 graus */
    expect(legibilidadeDaLuz(seno(61))).toBe(0);
    expect(legibilidadeDaLuz(1)).toBe(0);
    expect(legibilidadeDaLuz(0)).toBe(0);
    expect(legibilidadeDaLuz(-0.5)).toBe(0);
  });

  it('na chapa vista de cima com uma parte caída 30 graus, a luz fica a 10 graus e corre ao longo da dobra', () => {
    /* a peça de prova com vinco: plana até o vinco e caindo 30 graus depois dele, com o dobro da área caída. A conta de antes
       (a fração rasante até 30 graus) via a parte caída igual a 0 e a 30 graus de azimute e ficava no preferido, 30, que a pega a
       23 graus da luz; a 0 grau ela fica a 9 graus, com o triplo do contraste do amassado na bancada e no Blender. */
    const k = Math.sqrt(3) / 2;
    const normais = [0, 1, 0, 0, k, 0.5, 0, k, 0.5];
    expect(escolherAzimutes(normais, VISTAS.topo, 10).azimutes[0]).toBe(30);
    expect(escolherLuz(normais, VISTAS.topo)).toEqual({ azimute: 0, elevacao: 10, nota: 1, legivel: 1, estourada: 0, sombra: 0 });
  });

  it('na quina de uma caixa vista de três quartos, a luz sobe do plano da imagem e deixa ler as três faces', () => {
    const normais = [0, 1, 0, 1, 0, 0, 0, 0, 1];
    const aDez = escolherLuz(normais, VISTAS.tresquartos, { elevacoes: [10] });
    const luz = escolherLuz(normais, VISTAS.tresquartos);
    /* a 10 graus a melhor luz deixa uma face na sombra; a de agora alcança as três, sem estourar nenhuma */
    expect(aDez.sombra).toBeCloseTo(1 / 3, 3);
    expect(luz.elevacao).toBeGreaterThan(10);
    expect(luz).toMatchObject({ estourada: 0, sombra: 0 });
    expect(luz.legivel).toBeGreaterThan(aDez.legivel + 0.1);
  });

  it('o estouro desconta: a luz que lê mais e estoura uma face perde para a que lê um pouco menos sem estourar', () => {
    const unit = (v) => { const l = Math.hypot(...v); return v.map((c) => c / l); };
    const normais = [...unit([0, 1, -1]), ...unit([-1, 1, 0]), ...unit([1, 1, 1])];
    /* só pela legibilidade, a melhor luz é a 30 graus de elevação e 30 de azimute, com a face (1, 1, 1) no branco */
    let soLegivel = null;
    for (const elevacao of ELEVACOES_DA_LUZ) {
      for (let azimute = 0; azimute < 360; azimute += 10) {
        const d = direcaoDaLuz(VISTAS.topo, elevacao, azimute);
        const c = [0, 1, 2].map((i) => -(normais[3 * i] * d[0] + normais[3 * i + 1] * d[1] + normais[3 * i + 2] * d[2]));
        const legivel = c.reduce((s, x) => s + legibilidadeDaLuz(x), 0) / 3;
        if (!soLegivel || legivel > soLegivel.legivel + 1e-9) soLegivel = { elevacao, azimute, legivel, estourada: c.filter((x) => (0.2 * x) / seno(10) >= 1).length / 3 };
      }
    }
    expect(soLegivel).toMatchObject({ elevacao: 30, azimute: 30, estourada: 1 / 3 });
    expect(escolherLuz(normais, VISTAS.topo)).toEqual({ azimute: 50, elevacao: 40, nota: 0.5976, legivel: 0.5976, estourada: 0, sombra: 0 });
  });
});

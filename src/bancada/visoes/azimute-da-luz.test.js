/* azimute-da-luz.test.js — a direção e a escolha do azimute da luz rasante da bancada contra as de `tools/blender/superficie.py`.
 *
 * A bancada passa outras amostras que o Blender (as normais dos triângulos, e não os pixels), mas a conta sobre as amostras tem
 * de ser a mesma: o teste roda o próprio `superficie.py` no python3 do sistema sobre as mesmas normais e compara a direção, os
 * azimutes e as frações. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { amostrasDaVista, direcaoDaLuz, escolherAzimutes } from './azimute-da-luz.js';

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
teto = S.math.sin(S.math.radians(S.RASA_ATE_GRAUS))
N = S.np.asarray(e['N'], float).reshape(-1, 3)
N = S.np.where((N @ S.np.asarray(e['z'], float))[:, None] < 0, -N, N)
fracoes = {}
for a in range(0, 360, 10):
    c = S.luz_nas_amostras(N, v, e['rasante'], float(a))
    fracoes[str(a)] = {'rasante': round(float(((c > 0) & (c <= teto)).mean()), 4), 'iluminada': round(float((c > 0).mean()), 4)}
print(json.dumps({'azimutes': az, 'estimativa': {str(k): v for k, v in est.items()}, 'direcao': [float(x) for x in d], 'fracoes': fracoes}))
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
        /* a luz só da bancada lê as mesmas frações de cada azimute */
        const unico = escolherAzimutes(normais, vista, 10, { unico: true });
        expect(unico.fracoes).toEqual(py.fracoes);
        const [a] = unico.azimutes;
        const melhor = Math.max(...Object.values(py.fracoes).map((f) => f.rasante));
        expect(py.fracoes[a].rasante).toBeGreaterThanOrEqual(melhor - 0.05);
        for (const f of Object.values(py.fracoes)) if (f.rasante >= melhor - 0.05) expect(py.fracoes[a].iluminada).toBeGreaterThanOrEqual(f.iluminada);
      }
    }
  });

  it('sem amostra, fica o azimute preferido', () => {
    expect(escolherAzimutes([], VISTAS.topo).azimutes).toEqual([30, 120]);
  });
});

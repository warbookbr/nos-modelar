/* arredondar-costura-placa-e-barril.test.ts — a costura de uma placa de janelas unida à parede de um barril, o caso que uma roda de liga leve revelou.

   A fixture é a roda reduzida ao essencial (medidas em metro): um barril de revolução com a parede de dentro inclinada, e uma placa extrudada em x com
   três janelas de canto redondo, cortada por um prato de revolução, cujo aro de fora entra na parede do barril. O arredondamento de raio 6 mm da costura
   media três defeitos da operação, e não da receita:
     - deixava 115 faces finas, quase todas nos pedaços das faces do barril e da placa que o tubo corta ao longo das duas tangências, e não nas do próprio
       tubo (a limpeza da receita só alcançava as do tubo);
     - recusava o passo conforme a parede inclinada avançava 1 mm (0,020 recusava, 0,018 e 0,022 passavam), porque o fundo do tubo, a um raio atrás do
       canto, atravessava a pele de 4 mm do barril e a casca saía com vértice não-manifold;
     - a parte do barril sumia quando o tubo cobria uma face inteira dele, porque a origem do barril ainda listava a face coberta. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo herdado em JavaScript.
import { nucleo, neutroCanonico } from '../entrada.js';
// @ts-expect-error — análise de topologia em JavaScript.
import { analisarTopologia } from '../topologia.js';
import { arestasSemPar, vinculosNaoManifold } from '../../../tools/oficina/conferir-malha';

const R = 0.12, RIN = 0.1, X1 = 0.06, ESP = 0.003, RAIO = 0.006;
const EM = [0, 0.2, 0];

const passos = ({ avanco = 0.015, extra = { limpar: true } as any, partes = false } = {}): any[] => {
  const rFace = 0.116;
  const barril = [[RIN, 0], [R, 0], [R, X1], [rFace, X1], [RIN, X1 - avanco], [RIN, 0]];
  const furos: number[][][] = [];
  const passoAngular = (2 * Math.PI) / 3;
  for (let k = 0; k < 3; k++) {
    const a0 = k * passoAngular + 0.12, a1 = (k + 1) * passoAngular - 0.12, pts: number[][] = [];
    for (let i = 0; i <= 6; i++) { const t = a0 + ((a1 - a0) * i) / 6; pts.push([0.055 * Math.cos(t), 0.055 * Math.sin(t)]); }
    for (let i = 6; i >= 0; i--) { const t = a0 + ((a1 - a0) * i) / 6; pts.push([0.1085 * Math.cos(t), 0.1085 * Math.sin(t)]); }
    furos.push(pts);
  }
  const prato = [[0, 0.02], [0.03, 0.02], [rFace, 0.026], [rFace, 0.052], [0.03, 0.034], [0, 0.034]];
  const lista: any[] = [
    ['lathe', { origemId: 10, lados: 72, eixo: 'x', em: EM, perfil: barril }],
    ['extrusao', { origemId: 20, eixo: 'x', em: [0.01, 0.2, 0], altura: 0.06, segmentosArco: 8, perfil: { circulo: { raio: rFace + ESP } }, furos, deslocar: { para: 'dentro', distancia: ESP, canto: 'redondo' } }],
    ['lathe', { origemId: 30, lados: 72, eixo: 'x', em: EM, perfil: prato }],
    ['intersectar', { origemId: 40, solidos: [{ origem: { op: 'extrusao', id: 20 } }, { origem: { op: 'lathe', id: 30 } }] }],
    ['unir', { origemId: 70, solidos: [{ origem: { op: 'lathe', id: 10 } }, { origem: { op: 'intersectar', id: 40 } }] }],
    ['arredondarCostura', { origemId: 71, de: { op: 'unir', id: 70 }, raio: RAIO, paineis: 8, raioMinimo: 0.0015, afinarPontas: 0.008, ...extra }],
  ];
  if (partes) lista.push(['parte', { nome: 'barril', sel: { origem: { op: 'lathe', id: 10 } } }]);
  return lista;
};

const finasDe = (n: any) => analisarTopologia({ vertices: n.V, faces: n.F }, {}).achados.filter((a: any) => a.codigo === 'face-fina').length;
const raioMaximo = (n: any) => Math.max(...[...n.V.values()].map((v: number[]) => Math.hypot(v[1] - EM[1], v[2] - EM[2])));
/* volume pelo teorema da divergência, com cada face em leque a partir do primeiro canto */
const volume = (n: any) => {
  let v = 0;
  for (const f of n.F.values()) {
    const P = f.vs.map((id: number) => n.V.get(id));
    for (let k = 1; k < P.length - 1; k++) {
      const [a, b, c] = [P[0], P[k], P[k + 1]];
      v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    }
  }
  return v;
};

describe('arredondarCostura numa placa com janelas unida a um barril', () => {
  const uniao = nucleo(passos().slice(0, -1));
  const arredondada = nucleo(passos());

  it('a união deixa faces finas, e o arredondamento com limpar as tira de todo o sólido, e não só do tubo', () => {
    expect(uniao.orfaos).toEqual([]);
    expect(finasDe(uniao)).toBeGreaterThan(0);
    expect(arredondada.orfaos).toEqual([]);
    expect(finasDe(arredondada)).toBe(0);
    const sem = nucleo(passos({ extra: {} }));
    expect(sem.orfaos).toEqual([]);
    expect(finasDe(sem)).toBeGreaterThan(50);
    expect(finasDe(nucleo(passos({ extra: { limpar: false } })))).toBe(finasDe(sem));
  });

  it('a casca sai fechada e manifold, o tubo enche a costura e não sai pela pele do barril', () => {
    expect(arestasSemPar(arredondada)).toEqual([]);
    expect(vinculosNaoManifold(arredondada)).toEqual([]);
    expect(volume(arredondada)).toBeGreaterThan(volume(uniao));
    expect(raioMaximo(arredondada)).toBeLessThanOrEqual(R + 1e-9);
  });

  it('a limpeza move a superfície menos que a tolerância: o volume muda menos que 0,5% do que o arredondamento acrescenta ao sólido', () => {
    const sem = nucleo(passos({ extra: {} }));
    const acrescimo = volume(sem) - volume(uniao);
    expect(Math.abs(volume(arredondada) - volume(sem))).toBeLessThan(0.005 * acrescimo);
  });

  it('é determinístico: a mesma receita dá o mesmo canon', () => {
    expect(JSON.stringify(neutroCanonico(nucleo(passos())))).toBe(JSON.stringify(neutroCanonico(arredondada)));
  });

  it('o avanço da parede não decide a recusa: de 14 a 25 mm a costura sai sem face fina nem casca aberta (20 mm saía aberta)', () => {
    for (const avanco of [0.014, 0.016, 0.018, 0.02, 0.022, 0.025]) {
      const n = nucleo(passos({ avanco }));
      expect(n.orfaos, `avanço ${avanco}`).toEqual([]);
      expect(finasDe(n), `avanço ${avanco}`).toBeLessThanOrEqual(1);
      expect(arestasSemPar(n), `avanço ${avanco}`).toEqual([]);
      expect(vinculosNaoManifold(n), `avanço ${avanco}`).toEqual([]);
      expect(raioMaximo(n), `avanço ${avanco}`).toBeLessThanOrEqual(R + 1e-9);
    }
  });

  it('o nome do barril continua valendo depois do arredondamento: a parte pega as faces dele', () => {
    const n = nucleo(passos({ partes: true }));
    expect(n.orfaos).toEqual([]);
    expect([...n.F.values()].filter((f: any) => f.parte === 'barril').length).toBeGreaterThan(100);
  });

  it('limpar aceita true, false ou uma tolerância, e recusa o resto com o valor recebido', () => {
    expect(nucleo(passos({ extra: { limpar: true } })).orfaos).toEqual([]);
    expect(nucleo(passos({ extra: { limpar: false } })).orfaos).toEqual([]);
    expect(nucleo(passos({ extra: { limpar: 0.00005 } })).orfaos).toEqual([]);
    for (const ruim of [-1, 0, 'x']) {
      const n = nucleo(passos({ extra: { limpar: ruim } }));
      const o = n.orfaos.find((q: any) => q.ref === 'limpar');
      expect(o, JSON.stringify(ruim)).toBeDefined();
      if (typeof ruim === 'number') expect(o.motivo).toMatch(new RegExp(`limpar é true, false ou a tolerância.*veio ${ruim}`));
    }
  });
});

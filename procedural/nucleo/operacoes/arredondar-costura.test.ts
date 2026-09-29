/* arredondar-costura.test.ts — fatia 4 do plano "União de sólidos": o
   encontro côncavo de uma união é arredondado com raio declarado, e o `liso`
   com ângulo não borra a sombra da costura. A fixture é uma coluna com um
   braço entrando de lado; a costura é o retângulo onde o braço entra, com
   quatro arestas côncavas. Os eixos dos quatro arcos são conhecidos de
   antemão, e o raio é medido em cada vértice do arredondamento. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo herdado em JavaScript.
import { nucleo, neutroCanonico } from '../entrada.js';
// @ts-expect-error — adaptador em JavaScript.
import { adaptarThree } from '../../../src/autoria/adaptar-three.js';
import { conferirMalha } from '../../../tools/oficina/conferir-malha';

const R = 0.1;
const base = (prof = 0.6): any[] => [
  ['cubo', { origemId: 1, larg: 0.4, alt: 1.2, prof }],                     // x ∈ [-0,2; 0,2], y ∈ [0; 1,2]
  ['cubo', { origemId: 2, larg: 1, alt: 0.3, prof: 0.3, em: [0.3, 0.6, 0] }], // x ∈ [-0,2; 0,8], y ∈ [0,6; 0,9], z ∈ [-0,15; 0,15]
  ['unir', { origemId: 9, solidos: [{ origem: { op: 'cubo', id: 1 } }, { origem: { op: 'cubo', id: 2 } }] }],
];
const arredondado = (extra: any = {}, prof = 0.6) => [...base(prof),
  ['parte', { nome: 'ombro', sel: { origem: { op: 'unir', id: 9 } } }],
  ['arredondarCostura', { origemId: 10, de: { op: 'unir', id: 9 }, raio: R, paineis: 8, ...extra }]];
const MARCA = ['pincel', { modo: 'face', sel: { origem: { op: 'arredondarCostura', id: 10 } }, cor: '#ff0000' }];

/* distância ao eixo do arco mais próximo: embaixo e em cima do braço (eixos
   em z), e dos dois lados (eixos em y). A meia-esquadria das pontas cai sobre
   os dois cilindros vizinhos ao mesmo tempo, então a regra vale nela também. */
const aoEixo = (p: number[]) => Math.min(
  Math.hypot(p[0] - 0.3, p[1] - 0.5), Math.hypot(p[0] - 0.3, p[1] - 1.0),
  Math.hypot(p[0] - 0.3, p[2] + 0.25), Math.hypot(p[0] - 0.3, p[2] - 0.25));

describe('arredondarCostura', () => {
  it('o raio medido em cada vértice do arredondamento é o declarado', () => {
    const n = nucleo([...arredondado(), MARCA]);
    expect(n.orfaos).toEqual([]);
    const marcadas = [...n.F.values()].filter((f: any) => f.cor === '#ff0000');
    expect(marcadas.length).toBeGreaterThanOrEqual(4 * 8);   // pedaço com canto colinear pode ser partido em dois
    const d = marcadas.flatMap((f: any) => f.vs.map((v: number) => aoEixo(n.V.get(v))));
    expect(Math.min(...d)).toBeGreaterThan(R - 1e-6);
    expect(Math.max(...d)).toBeLessThan(R + 1e-6);
  });

  it('a malha sai fechada, sem bico, e atravessa o adaptador', () => {
    conferirMalha(nucleo(arredondado()), { fechada: true, rotulo: 'costura arredondada' });
  });

  it('a mesma receita duas vezes dá a mesma malha', () => {
    expect(JSON.stringify(neutroCanonico(nucleo(arredondado())))).toBe(JSON.stringify(neutroCanonico(nucleo(arredondado()))));
  });

  it('as faces do arredondamento herdam a parte e saem lisas a 45°', () => {
    const n = nucleo([...arredondado(), MARCA]);
    for (const f of n.F.values()) if (f.cor === '#ff0000') { expect(f.parte).toBe('ombro'); expect(f.liso).toBe(45); }
  });

  it('as faces que o arredondamento não encosta mantêm id e cantos', () => {
    const antes = nucleo(base());
    const n = nucleo(arredondado());
    // fundo, trás e esquerda da coluna ficam longe da costura e do arredondamento
    for (const id of [0, 2, 5]) expect(n.F.get(id).vs).toEqual(antes.F.get(id).vs);
  });

  it('raio que não cabe na face vizinha grita e não muda a malha', () => {
    const n = nucleo(arredondado({}, 0.4));   // coluna de 0,4 deixa 0,05 de face ao lado do braço
    expect(n.orfaos.map((o: any) => o.motivo).join()).toMatch(/não cabe/);
    expect(n.F.size).toBe(nucleo(base(0.4)).F.size);
  });

  it('costura sem aresta côncava grita', () => {
    const P = [['cubo', { origemId: 1, lado: 1 }], ['cubo', { origemId: 2, lado: 1, em: [0.5, 0.5, 0.5] }],
      ['intersectar', { origemId: 9, solidos: [{ origem: { op: 'cubo', id: 1 } }, { origem: { op: 'cubo', id: 2 } }] }],
      ['arredondarCostura', { origemId: 10, de: { op: 'intersectar', id: 9 }, raio: 0.05 }]];
    expect(nucleo(P).orfaos.map((o: any) => o.motivo).join()).toMatch(/não tem aresta côncava/);
  });
});

describe('liso com ângulo na costura', () => {
  /* normais de cada canto de triângulo cujo vértice está sobre a costura */
  const normaisNaCostura = (liso: any) => {
    const n = nucleo([...base(), ['liso', { sel: { tudo: true }, ...liso }], ['parte', { nome: 'ombro', sel: { tudo: true } }]]);
    expect(n.orfaos).toEqual([]);
    const { partes } = adaptarThree(n, { nome: 'fixture' });
    const pares: number[][][] = [];
    for (const malha of partes.get('ombro').children) {
      const p = malha.geometry.getAttribute('position'), no = malha.geometry.getAttribute('normal');
      for (let t = 0; t < p.count; t += 3) {
        const P = [0, 1, 2].map((k) => [p.getX(t + k), p.getY(t + k), p.getZ(t + k)]);
        const e1 = [0, 1, 2].map((c) => P[1][c] - P[0][c]), e2 = [0, 1, 2].map((c) => P[2][c] - P[0][c]);
        const g = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
        const l = Math.hypot(g[0], g[1], g[2]);
        if (!(l > 1e-12)) continue;
        for (let k = 0; k < 3; k++) {
          const q = P[k];
          // vértice da costura: sobre a face x = 0,2 da coluna e no contorno do braço
          const naCostura = Math.abs(q[0] - 0.2) < 1e-6 && q[1] >= 0.6 - 1e-6 && q[1] <= 0.9 + 1e-6 && Math.abs(q[2]) <= 0.15 + 1e-6
            && (Math.abs(q[1] - 0.6) < 1e-6 || Math.abs(q[1] - 0.9) < 1e-6 || Math.abs(Math.abs(q[2]) - 0.15) < 1e-6);
          if (naCostura) pares.push([g.map((c) => c / l), [no.getX(t + k), no.getY(t + k), no.getZ(t + k)]]);
        }
      }
    }
    return pares;
  };

  it('com ângulo de 30°, a normal dos dois lados da costura a 90° é a da própria face, não a média', () => {
    const pares = normaisNaCostura({ angulo: 30 });
    expect(pares.length).toBeGreaterThan(0);
    for (const [g, n] of pares) expect(g[0] * n[0] + g[1] * n[1] + g[2] * n[2]).toBeGreaterThan(1 - 1e-9);
  });

  it('sem ângulo, a mesma costura sai com a normal média (o teste distingue)', () => {
    const pares = normaisNaCostura({});
    expect(pares.some(([g, n]) => g[0] * n[0] + g[1] * n[1] + g[2] * n[2] < 0.99)).toBe(true);
  });
});

/* Regressões da revisão adversarial de 2026-09-29: braço inclinado (canto
   que não é reto) e diagnósticos com a causa. */
describe('arredondarCostura com o braço inclinado', () => {
  const inclinado = (g: number, extra: any[] = []) => [
    ['cubo', { origemId: 1, larg: 0.4, alt: 1.2, prof: 0.6 }],
    ['cubo', { origemId: 2, larg: 0.8, alt: 0.3, prof: 0.3, em: [0.4, 0.6, 0] }],
    ['rotaciona', { sel: { origem: { op: 'cubo', id: 2 } }, eixo: 'z', graus: g, pivo: [0, 0.75, 0] }],
    ['unir', { origemId: 9, solidos: [{ origem: { op: 'cubo', id: 1 } }, { origem: { op: 'cubo', id: 2 } }] }],
    ...extra,
  ];
  const r = 0.05;
  /* eixos dos quatro arcos, de antemão: todos a r da face da coluna (x=0,2)
     e a r da face do braço que encontram */
  const aoEixoInclinado = (g: number, p: number[]) => {
    const s = Math.sin((g * Math.PI) / 180), c = Math.cos((g * Math.PI) / 180), ax = 0.2 + r;
    const yBaixo = ((s * 0.15 * s + (0.75 - 0.15 * c) * -c) + r - s * ax) / -c;       // nb=(s,-c), pb=(0,15s, 0,75-0,15c)
    const yCima = ((-s * -0.15 * s + c * (0.75 + 0.15 * c)) + r + s * ax) / c;          // nt=(-s,c), pt=(-0,15s, 0,75+0,15c)
    return Math.min(Math.hypot(p[0] - ax, p[1] - yBaixo), Math.hypot(p[0] - ax, p[1] - yCima),
      Math.hypot(p[0] - ax, p[2] + 0.15 + r), Math.hypot(p[0] - ax, p[2] - 0.15 - r));
  };
  for (const g of [10, 20, 35]) {
    it(`a ${g}°: fecha, atravessa o adaptador, raio medido e ids das faces longe da costura`, () => {
      const antes = nucleo(inclinado(g));
      const n = nucleo(inclinado(g, [['arredondarCostura', { origemId: 10, de: { op: 'unir', id: 9 }, raio: r }], MARCA]));
      conferirMalha(n, { fechada: true, rotulo: `braço a ${g}°` });
      /* cada vértice distinto do arredondamento: nenhum passa do cilindro (além da corda do arco
         vizinho no vinco, 1e-3·r), e
         pelo menos uma ponta de cada canto do arco (4 arestas × 9 cantos; na meia-esquadria os prismas vizinhos dividem cantos)
         estão no raio. Com o canto que não é reto, as tampas dos prismas
         vizinhos não coincidem, e o pedaço de tampa que aparece (o vinco da
         meia-esquadria) vai do cilindro até o canto da costura: medido de
         0,58·r a r·√2; o piso do teste é 0,5·r e o teto r·√2. */
      const vs = new Set<number>();
      for (const f of n.F.values()) if (f.cor === "#ff0000") for (const v of f.vs) if (v >= 4000) vs.add(v);   // só os cantos deste passo (o canto da costura é do unir)
      /* fora os cantos que caem nos planos das faces do sólido (a coluna em
         x = 0,2, os lados do braço em |z| = 0,15, o fundo e o topo do braço):
         ali ficam as tangências e a borda do vinco da meia-esquadria, que
         encosta na face plana e não é ponto do arco */
      const s = Math.sin((g * Math.PI) / 180), c = Math.cos((g * Math.PI) / 180);
      const noPlano = (p: number[]) => Math.abs(p[0] - 0.2) < 1e-9 || Math.abs(Math.abs(p[2]) - 0.15) < 1e-9
        || Math.abs(s * p[0] - c * p[1] - (s * 0.15 * s - c * (0.75 - 0.15 * c))) < 1e-9
        || Math.abs(-s * p[0] + c * p[1] - (s * 0.15 * s + c * (0.75 + 0.15 * c))) < 1e-9;
      const d = [...vs].map((v) => n.V.get(v)).filter((p: number[]) => !noPlano(p)).map((p: number[]) => aoEixoInclinado(g, p));
      expect(Math.max(...d)).toBeLessThan(r * Math.SQRT2 * (1 + 1e-3));   // o vinco da meia-esquadria chega até o canto da costura, a r·√2 do eixo
      expect(Math.min(...d)).toBeGreaterThan(0.5 * r);
      /* no raio: 1e-6 nos prismas; quando o portão manda para o modo por
         fatias (a 10°, os prismas deixavam lasca), o arco mergulha 1e-3·r */
      expect(d.filter((x) => Math.abs(x - r) < 2e-3 * r).length).toBeGreaterThanOrEqual(4 * 7);
      for (const id of [0, 2, 5]) expect(n.F.get(id).vs).toEqual(antes.F.get(id).vs);
    });
  }

  it('raio que não cabe no canto agudo (35°, raio 0,1) grita dizendo onde', () => {
    const n = nucleo(inclinado(35, [['arredondarCostura', { origemId: 10, de: { op: 'unir', id: 9 }, raio: 0.1 }]]));
    expect(n.orfaos.map((o: any) => o.motivo).join()).toMatch(/não cabe na aresta .* na ponta/);
  });

  it('raio abaixo de 1/64 da meia-caixa grita', () => {
    const n = nucleo(inclinado(10, [['arredondarCostura', { origemId: 10, de: { op: 'unir', id: 9 }, raio: 0.001 }]]));
    expect(n.orfaos.map((o: any) => o.motivo).join()).toMatch(/pequeno demais/);
  });
});

describe('arredondarCostura: diagnóstico com a causa', () => {
  it('arredondar duas vezes a mesma costura diz qual passo já arredondou', () => {
    const n = nucleo([...arredondado(), ['arredondarCostura', { origemId: 11, de: { op: 'unir', id: 9 }, raio: R }]]);
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/já foi arredondada pelo arredondarCostura do passo 4/);
  });

  it('arredondar depois de um passo que cortou a origem nomeia o passo e não dá o conselho do cilindro', () => {
    const n = nucleo([...base(),
      ['cubo', { origemId: 3, lado: 0.1, em: [0, 0.1, 0.3] }],
      ['subtrair', { origemId: 12, solidos: [{ origem: { op: 'unir', id: 9 } }, { origem: { op: 'cubo', id: 3 } }] }],
      ['arredondarCostura', { origemId: 10, de: { op: 'unir', id: 9 }, raio: R }]]);
    const motivo = n.orfaos.map((o: any) => o.motivo).join();
    expect(motivo).toMatch(/o subtrair:12 do passo 4 cortou faces dele/);
    expect(motivo).not.toMatch(/cilindro/);
  });
});

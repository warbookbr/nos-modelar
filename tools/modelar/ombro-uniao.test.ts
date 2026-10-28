/* ombro-uniao.test.ts — a rodada do ombro do plano "União de sólidos": a
   união e o arredondamento sobre superfícies CURVAS facetadas. A fixture
   (`fixtures/fixture-ombro-uniao.js`) é uma cópia neutra do ombro do braço
   robótico: uma coluna em loft (pé redondo de raio 105 mm que vira
   superelipse n=4) unida a um braço em loft ao longo de Z com a mesma
   superelipse, e o encontro de baixo arredondado com raio 15 mm. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — fixture JavaScript.
import receita, { TABELA, gerarPassos } from './fixtures/fixture-ombro-uniao.js';
// @ts-expect-error — núcleo herdado em JavaScript.
import { nucleo, neutroCanonico } from '../../procedural/nucleo/entrada.js';
// @ts-expect-error — adaptador em JavaScript.
import { adaptarThree } from '../../src/autoria/adaptar-three.js';
import { conferirMalha } from '../oficina/conferir-malha';

const passos = (raio: number) => gerarPassos({ ...TABELA, raioDoEncontro: raio });
const ate = (lista: any[], op: string) => lista.slice(0, lista.findIndex(([o]: any[]) => o === op) + 1);

describe('ombro unido: arredondamento sobre superfície curva', () => {
  const lista = passos(15);
  const n = nucleo(lista, TABELA, {}, receita.MATERIAIS);

  it('raio 15 mm fecha, sem órfão, sem lasca, e atravessa o adaptador', () => {
    conferirMalha(n, { fechada: true, rotulo: 'ombro com concordância de 15 mm' });
  });

  for (const raio of [8, 12, 20, 25, 30]) it(`raio ${raio} mm também fecha sem lasca`, () => {
    conferirMalha(nucleo(passos(raio), TABELA, {}, receita.MATERIAIS), { fechada: true, rotulo: `ombro com ${raio} mm` });
  });

  it('o teste de contato mede o ombro arredondado: a malha é fechada no sentido dele (vínculo de vértice em laço)', async () => {
    // @ts-expect-error — medida JavaScript.
    const { contatosDaPeca } = await import('../../src/autoria/contatos-da-peca.js');
    const r = contatosDaPeca(n, { ...receita, PASSOS: lista });
    expect(r.cobertura.inconclusivos).toEqual([]);
    expect(r.paresEmContato.map((p: any) => [p.par, p.estado])).toEqual([[['anel', 'pescoco'], 'encostam']]);
  });

  it('o raio medido no meio do encontro de baixo é o declarado', () => {
    /* em x ≈ 0 o braço tem a face de baixo em y = 35 mm e a coluna a face em
       z = 105 mm: o centro do arco está em (y, z) = (35 − r, 105 + r) */
    const r = 0.015;
    const marcado = nucleo([...ate(lista, 'arredondarCostura'), ['pincel', { modo: 'face', sel: { origem: { op: 'arredondarCostura', id: 500 } }, cor: '#ff0000' }]], TABELA);
    const vs = new Set<number>();
    for (const f of marcado.F.values()) if (f.cor === '#ff0000') for (const v of f.vs) if (v >= 3000) vs.add(v);
    /* o anel de seção do vértice da costura em x = 0: ali as duas facetas são
       as de simetria, e o centro é conhecido exatamente. Fora do meio o centro
       acompanha a curvatura da coluna, e a conta analítica não vale. */
    const d = [...vs].map((v) => marcado.V.get(v)).filter((p: number[]) => Math.abs(p[0]) < 1e-6 && p[2] > 0)
      .map((p: number[]) => Math.hypot(p[1] - (0.035 - r), p[2] - (0.105 + r)) / r);
    expect(d.length).toBeGreaterThanOrEqual(8);
    for (const x of d) expect(Math.abs(x - 1)).toBeLessThan(2e-3);   // o arco mergulha 1e-3 do raio na direção do canto
  });

  it('as faces do pé, longe da costura, mantêm id e cantos', () => {
    const antes = nucleo(ate(lista, 'unir'), TABELA);
    let conferidas = 0;
    for (const f of antes.F.values()) {
      if (!f.vs.every((v: number) => antes.V.get(v)[1] < 0.01)) continue;
      expect(n.F.get(f.id)?.vs).toEqual(f.vs);
      conferidas++;
    }
    expect(conferidas).toBeGreaterThan(40);
  });

  it('a mesma receita dá a mesma malha', () => {
    expect(JSON.stringify(neutroCanonico(nucleo(lista, TABELA)))).toBe(JSON.stringify(neutroCanonico(nucleo(lista, TABELA))));
  });

  it('regiao só vale na costura curva, e malformada grita', () => {
    const cubos = [['cubo', { origemId: 1, larg: 0.4, alt: 1.2, prof: 0.6 }], ['cubo', { origemId: 2, larg: 1, alt: 0.3, prof: 0.3, em: [0.3, 0.6, 0] }],
      ['unir', { origemId: 9, solidos: [{ origem: { op: 'cubo', id: 1 } }, { origem: { op: 'cubo', id: 2 } }] }]];
    const plana = nucleo([...cubos, ['arredondarCostura', { origemId: 10, de: { op: 'unir', id: 9 }, raio: 0.05, regiao: { min: [-1, -1, -1], max: [1, 1, 1] } }]]);
    expect(plana.orfaos.map((o: any) => o.motivo).join()).toMatch(/regiao só vale na costura curva/);
    const torta = nucleo([...cubos, ['arredondarCostura', { origemId: 10, de: { op: 'unir', id: 9 }, raio: 0.05, regiao: { min: [0, 0, 0] } }]]);
    expect(torta.orfaos.map((o: any) => o.motivo).join()).toMatch(/regiao precisa ser/);
  });
});

describe('ombro unido: liso', () => {
  /* a normal lisa (ângulo 45°) em cada canto das faces laterais que a união
     não tocou, e que não encostam em face tocada, é a mesma de antes da união */
  it('a normal lisa das faces não tocadas desvia menos de 1° da de antes da união', () => {
    const P = passos(0);
    const corpo = (comUnir: boolean) => {
      const sel = comUnir ? { origem: { op: 'unir', id: 400 } } : { tudo: true };
      return [P[0], P[1], ...(comUnir ? [P[2]] : []), ['parte', { nome: 'c', sel }], ['liso', { sel, angulo: 45 }]];
    };
    const a = nucleo(corpo(false)), b = nucleo(corpo(true));
    const normais = (m: any) => {
      const mapa = new Map<string, number[][]>();
      for (const malha of adaptarThree(m, { nome: 'x' }).partes.get('c').children) {
        const p = malha.geometry.getAttribute('position'), no = malha.geometry.getAttribute('normal');
        for (let k = 0; k < p.count; k++) {
          const chave = [p.getX(k), p.getY(k), p.getZ(k)].map((c: number) => c.toFixed(6)).join(',');
          if (!mapa.has(chave)) mapa.set(chave, []);
          mapa.get(chave)!.push([no.getX(k), no.getY(k), no.getZ(k)]);
        }
      }
      return mapa;
    };
    const na = normais(a), nb = normais(b);
    const intocada = (f: any) => a.F.has(f.id) && JSON.stringify(a.F.get(f.id).vs) === JSON.stringify(f.vs);
    const tocados = new Set<number>();
    for (const f of b.F.values()) if (!intocada(f)) for (const v of f.vs) tocados.add(v);
    let pior = 0, cantos = 0;
    for (const f of b.F.values()) {
      if (!intocada(f) || f.vs.some((v: number) => tocados.has(v))) continue;
      for (const v of f.vs) {
        const chave = b.V.get(v).map((c: number) => c.toFixed(6)).join(',');
        for (const x of nb.get(chave) ?? []) {
          let melhor = -1;
          for (const y of na.get(chave) ?? []) melhor = Math.max(melhor, x[0] * y[0] + x[1] * y[1] + x[2] * y[2]);
          pior = Math.max(pior, (Math.acos(Math.min(1, melhor)) * 180) / Math.PI);
          cantos++;
        }
      }
    }
    expect(cantos).toBeGreaterThan(5000);
    expect(pior).toBeLessThan(1);
  });
});

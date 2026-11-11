/* arranja-no-lugar.test.ts — `arranja` linear com `coincidente: true`: a cópia de um sólido no lugar, para um sólido construído uma vez servir de ferramenta
   a várias booleanas (cada uma consome o que recebe). Prova: cinco barras aparadas pelo mesmo sólido, com a malha igual à de cinco construções; a recusa de
   d nulo sem a declaração; e a cópia que se cita de novo depois de consumida. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo em JavaScript.
import { neutroCanonico, nucleo } from '../entrada.js';

const FERRAMENTA = { origemId: 1, larg: 40, alt: 30, prof: 30 };
const barra = (k: number) => ['cubo', { origemId: 10 + k, larg: 100, alt: 6, prof: 6, em: [0, 5 * k, 0] }];
const dentro = (k: number, ferramenta: any) => ['intersectar', { origemId: 20 + k, solidos: [{ origem: { op: 'cubo', id: 10 + k } }, { origem: ferramenta }] }];
const rodar = (passos: any[]) => nucleo(passos, {}, {}, {}, null, [], {});
const volume = (st: any) => {
  let v = 0;
  for (const f of st.F.values()) for (let k = 1; k + 1 < f.vs.length; k++) {
    const [a, b, c] = [f.vs[0], f.vs[k], f.vs[k + 1]].map((i: number) => st.V.get(i));
    v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  return Math.abs(v);
};

describe('arranja linear com coincidente: true', () => {
  const NOMES = ['u1', 'u2', 'u3', 'u4'];
  const comCopias = [
    ['cubo', FERRAMENTA],
    ['arranja', { modo: 'linear', total: 5, coincidente: true, origemId: 2, derivaDe: { op: 'cubo', id: 1 }, sel: { origem: { op: 'cubo', id: 1 } }, nomes: NOMES }],
    ...[0, 1, 2, 3, 4].map(barra),
    dentro(0, { op: 'cubo', id: 1 }),
    ...NOMES.map((n, k) => dentro(k + 1, { op: 'arranja', id: 2, de: { op: 'cubo', id: 1 }, nome: n })),
  ];

  it('cinco barras são aparadas pelo mesmo sólido construído uma vez, e a malha é a de cinco construções', () => {
    const st = rodar(comCopias);
    expect(st.orfaos).toEqual([]);
    const independentes = rodar([
      ...[0, 1, 2, 3, 4].flatMap((k) => [['cubo', { ...FERRAMENTA, origemId: 30 + k }], barra(k), dentro(k, { op: 'cubo', id: 30 + k })]),
    ]);
    expect(independentes.orfaos).toEqual([]);
    expect(st.F.size).toBe(independentes.F.size);
    expect(volume(st)).toBeCloseTo(5 * 40 * 6 * 6, 3);
    expect(volume(independentes)).toBeCloseTo(volume(st), 6);
    /* cada barra sobra com a largura da ferramenta, e nada da ferramenta sobra solto */
    const xs = [...st.V.values()].map((p: number[]) => p[0]);
    expect(Math.min(...xs)).toBeCloseTo(-20, 6);
    expect(Math.max(...xs)).toBeCloseTo(20, 6);
  });

  it('é determinístico', () => {
    expect(JSON.stringify(neutroCanonico(rodar(comCopias)))).toBe(JSON.stringify(neutroCanonico(rodar(comCopias))));
  });

  it('d nulo sem a declaração segue recusado, e a declaração mal feita ou com d não nulo também', () => {
    const arr = (extra: object) => rodar([['cubo', FERRAMENTA], ['arranja', { modo: 'linear', total: 2, origemId: 2, derivaDe: { op: 'cubo', id: 1 }, sel: { origem: { op: 'cubo', id: 1 } }, ...extra }]]).orfaos.map((o: any) => o.motivo).join('|');
    expect(arr({ d: [0, 0, 0] })).toMatch(/d nulo põe todas as cópias em cima da fonte.*declare coincidente: true/);
    expect(arr({ coincidente: 'sim' })).toMatch(/coincidente só aceita o literal true/);
    expect(arr({ coincidente: true, d: [1, 0, 0] })).toMatch(/não combina com d diferente de zero/);
    expect(arr({ coincidente: true })).toBe('');
  });

  it('cada cópia é um uso: citá-la depois de consumida grita como qualquer face consumida', () => {
    const st = rodar([...comCopias, barra(5), dentro(5, { op: 'arranja', id: 2, de: { op: 'cubo', id: 1 }, nome: 'u1' })]);
    expect(st.orfaos.length).toBeGreaterThan(0);
    expect(st.orfaos.map((o: any) => o.motivo).join('|')).toMatch(/consumida/);
  });

  describe('a citação de uma parte da cópia, a pertinência, o aviso da cópia sem uso e o modo radial', () => {
    const CUBO = ['cubo', { origemId: 1, larg: 40, alt: 30, prof: 30 }];
    const ARR = (extra: object = {}) => ['arranja', { modo: 'linear', total: 2, origemId: 2, derivaDe: { op: 'cubo', id: 1 }, sel: { origem: { op: 'cubo', id: 1 } }, nomes: ['u1'], coincidente: true, ...extra }];
    const sobe = (de: any) => ['transladar', { d: [0, 5, 0], sel: { origem: { op: 'arranja', id: 2, de, nome: 'u1' } } }];
    const movidos = (antes: any, depois: any) => [...depois.V.keys()].filter((k: number) => antes.V.has(k) && depois.V.get(k)[1] !== antes.V.get(k)[1]).length;

    it('citar só a face de cima da cópia move 4 vértices, com a fonte viva e com a fonte consumida; a cópia inteira move 8', () => {
      const base = rodar([CUBO, ARR()]);
      expect(movidos(base, rodar([CUBO, ARR(), sobe({ op: 'cubo', id: 1, face: 'topo' })]))).toBe(4);
      expect(movidos(base, rodar([CUBO, ARR(), sobe({ op: 'cubo', id: 1 })]))).toBe(8);
      /* a fonte consumida por uma booleana: a face de cima da cópia segue citável pelo registro do gerador */
      const consumida = [CUBO, ARR(), barra(0), dentro(0, { op: 'cubo', id: 1 })];
      const antes = rodar(consumida);
      const depois = rodar([...consumida, sobe({ op: 'cubo', id: 1, face: 'topo' })]);
      expect(depois.orfaos).toEqual([]);
      expect(movidos(antes, depois)).toBe(4);
    });

    it('um `de` de outra primitiva é recusado pela pertinência, com a fonte viva e consumida', () => {
      const cilindro = ['cilindro', { origemId: 7, raio: 5, altura: 5, lados: 8, em: [300, 0, 0] }];
      const alheio = { op: 'cilindro', id: 7 };
      for (const antes of [[], [barra(0), dentro(0, { op: 'cubo', id: 1 })]]) {
        const st = rodar([CUBO, cilindro, ARR(), ...antes, sobe(alheio)]);
        expect(st.orfaos.map((o: any) => o.motivo).join('|')).toMatch(/não pertence à fonte da origem arranja:2/);
      }
    });

    it('a cópia no lugar que nenhum passo usa avisa, e a usada não avisa', () => {
      const sem = rodar([CUBO, ARR()]);
      expect(sem.avisos.map((a: any) => a.ref)).toEqual(['copiaNoLugarSemUso']);
      expect(sem.avisos[0].texto).toMatch(/casca dupla em cima da fonte/);
      const usada = rodar([CUBO, ARR(), barra(0), dentro(0, { op: 'cubo', id: 1 }), barra(1), dentro(1, { op: 'arranja', id: 2, de: { op: 'cubo', id: 1 }, nome: 'u1' })]);
      expect(usada.avisos.map((a: any) => a.ref)).not.toContain('copiaNoLugarSemUso');
    });

    it("coincidente no modo radial é recusado, e o arranja deslocado não muda", () => {
      const st = rodar([CUBO, ['arranja', { modo: 'radial', total: 3, eixo: 'y', volta: 360, pivo: [100, 0, 0], coincidente: true, origemId: 2, derivaDe: { op: 'cubo', id: 1 }, sel: { origem: { op: 'cubo', id: 1 } } }]]);
      expect(st.orfaos.map((o: any) => o.motivo).join('|')).toMatch(/coincidente é do modo 'linear'/);
      const deslocado = rodar([CUBO, ARR({ coincidente: undefined, d: [100, 0, 0] })]);
      expect(deslocado.orfaos).toEqual([]);
      expect(deslocado.avisos).toEqual([]);
    });
  });
});

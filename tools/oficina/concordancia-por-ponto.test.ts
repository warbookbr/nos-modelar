/* concordancia-por-ponto.test.ts — A-35: cada curva de um mesmo passo pode
   declarar seu próprio custo sem obrigar todas as outras a usarem o maior. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { neutroCanonico, nucleo } from '../../prototipos/fps/v3/motor/oficina.js';

const canonico = (passos: any[]) => JSON.stringify(neutroCanonico(nucleo(passos, {}, {})));

describe('A-35 — discretização local da concordância', () => {
  it('a forma local equivalente conserva exatamente o neutro da forma antiga', () => {
    const antigo = [['lathe', {
      id: 0, lados: 6, segmentosCurva: 4,
      perfil: [[0, 0], [1, 0, 0.3], [1, 1], [0, 1]],
    }]];
    const local = [['lathe', {
      id: 0, lados: 6, segmentosCurva: 99,
      perfil: [[0, 0], [1, 0, { raio: 0.3, segmentos: 4 }], [1, 1], [0, 1]],
    }]];
    expect(canonico(local)).toBe(canonico(antigo));
  });

  it('duas concordâncias no mesmo lathe pagam exatamente suas contagens locais', () => {
    const n = nucleo([['lathe', {
      id: 0, lados: 4, segmentosCurva: 20,
      perfil: [
        [0, 0],
        [1, 0, { raio: 0.2, segmentos: 2 }],
        [1, 1],
        [2, 1, { raio: 0.1, segmentos: 4 }],
        [2, 2],
        [0, 2],
      ],
    }]], {}, {});
    expect(n.orfaos).toHaveLength(0);
    // 6 pontos - 2 cantos + (2+1) + (4+1) = 12; dois polos + 10 anéis.
    expect(n.V.size).toBe(42);
    expect(n.F.size).toBe(44);
  });

  it('o contorno do loft aceita a mesma forma local', () => {
    const contorno = [
      [-1, -1], [1, -1, { raio: 0.25, segmentos: 2 }], [1, 1], [-1, 1],
    ];
    const n = nucleo([['loft', {
      id: 0, lados: 6, segmentosCurva: 9,
      secoes: [
        { pos: [0, 0, 0], contorno },
        { pos: [0, 1, 0], contorno },
      ],
    }]], {}, {});
    expect(n.orfaos).toHaveLength(0);
    expect(n.V.size).toBe(12);
    expect(n.F.size).toBe(6);
  });

  it('os contornos do inflate aceitam a forma local sem alterar o resultado equivalente', () => {
    const base = [[-1, -1], [1, -1, 0.25], [1, 1], [-1, 1]];
    const local = [[-1, -1], [1, -1, { raio: 0.25, segmentos: 2 }], [1, 1], [-1, 1]];
    const passos = (contorno: any, segmentosCurva: number) => [['inflate', {
      id: 0, divisoes: 4, segmentosCurva,
      contornoLado: contorno,
      contornoTopo: contorno,
    }]];
    expect(canonico(passos(local, 9))).toBe(canonico(passos(base, 2)));
  });

  it.each([
    [{ raio: 0.2, segmentos: 0 }, /segmentos/i],
    [{ raio: 0.2, segmentos: 2.5 }, /segmentos/i],
    [{ raio: 0.2, segmentos: 1001 }, /orçamento/i],
    [{ raio: 0.2, segmentos: 2, extra: true }, /chave|forma/i],
  ])('forma local inválida grita e aborta antes da geometria: %j', (alca, motivo) => {
    const n = nucleo([['lathe', {
      id: 0, lados: 6,
      perfil: [[0, 0], [1, 0, alca], [1, 1], [0, 1]],
    }]], {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(motivo);
    expect(n.V.size).toBe(0);
    expect(n.F.size).toBe(0);
  });

  it('objeto sem raio preserva o throw histórico de valor dimensional inválido', () => {
    expect(() => nucleo([['lathe', {
      id: 0, lados: 6,
      perfil: [[0, 0], [1, 0, { segmentos: 2 }], [1, 1], [0, 1]],
    }]], {}, {})).toThrow(/valor numérico inválido/);
  });

  it('replay da forma local é determinístico', () => {
    const passos = [['lathe', {
      id: 0, lados: 8,
      perfil: [[0, 0], [1, 0, { raio: 0.3, segmentos: 3 }], [1, 1], [0, 1]],
    }]];
    expect(canonico(passos)).toBe(canonico(JSON.parse(JSON.stringify(passos))));
  });
});

/* lathe-aberto.test.ts — o `lathe` em modo polilinha cujo perfil não toca o eixo nas duas pontas nem volta ao primeiro ponto.

   O ATRITO. Um aro de quatro pontos fora do eixo, sem `furos`, revolucionava a linha aberta em silêncio: a malha saía com 32
   arestas de casca aberta, o `conferir-malha` reprovava e o `descrever-peca` saía com 0. Quem escreveu o aro queria um sólido,
   e a única pista era o `furos: []` que fecha a seção pelo eixo. Agora o passo grita, nomeia a ponta que está fora do eixo e
   diz as três saídas; quem quer a casca aberta de propósito declara `superficie: true` (decisão 2 do plano de 2026-10-21).

   As provas são topológicas: numa malha fechada toda aresta serve a exatamente duas faces. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../entrada.js';

const LADOS = 8;
type Malha = { V: Map<number, number[]>; F: Map<number, any>; orfaos: any[] };

const irregulares = (m: Malha) => {
  const uso = new Map<string, number>();
  for (const f of m.F.values()) {
    for (let k = 0; k < f.vs.length; k++) {
      const a = f.vs[k], b = f.vs[(k + 1) % f.vs.length];
      const chave = a < b ? `${a}-${b}` : `${b}-${a}`;
      uso.set(chave, (uso.get(chave) ?? 0) + 1);
    }
  }
  return [...uso.values()].filter((n) => n !== 2).length;
};
const rodar = (extra: Record<string, unknown>) => nucleo([['lathe', { origemId: 1, lados: LADOS, ...extra }]], {}) as Malha;
const gritos = (m: Malha) => m.orfaos.map((o) => `${o.ref}: ${o.motivo}`).join(' | ');

/* o aro de quatro pontos do caso 5: fora do eixo nas duas pontas */
const ARO = [[0.05, 0], [0.07, 0], [0.07, 0.02], [0.05, 0.02]];

describe('lathe aberto', () => {
  it('o aro fora do eixo, sem declaração, grita com as duas pontas e as três saídas, e não constrói nada', () => {
    const m = rodar({ perfil: ARO });
    expect(m.orfaos).toHaveLength(1);
    expect(m.orfaos[0].op).toBe('lathe');
    expect(m.orfaos[0].ref).toBe('perfil');
    const motivo = m.orfaos[0].motivo as string;
    expect(motivo).toMatch(/perfil aberto/);
    expect(motivo).toMatch(/o ponto 0 \(raio 0\.05, y 0\)/);
    expect(motivo).toMatch(/o último ponto \(raio 0\.05, y 0\.02\)/);
    expect(motivo).toMatch(/repita o primeiro ponto/);
    expect(motivo).toMatch(/furos: \[\]/);
    expect(motivo).toMatch(/superficie: true/);
    expect(m.F.size).toBe(0);
    expect(m.V.size).toBe(0);
  });

  it('com uma ponta no eixo e a outra fora, nomeia só a que está fora', () => {
    const m = rodar({ perfil: [[0, 0], [0.07, 0], [0.07, 0.02]] });
    const motivo = m.orfaos[0].motivo as string;
    expect(motivo).toMatch(/o último ponto \(raio 0\.07, y 0\.02\)/);
    expect(motivo).not.toMatch(/o ponto 0 \(/);
    expect(m.F.size).toBe(0);
  });

  it('superficie: true declara a casca aberta, que sai igual à de antes: com borda e sem grito', () => {
    const m = rodar({ perfil: ARO, superficie: true });
    expect(gritos(m)).toBe('');
    expect(m.F.size).toBe(3 * LADOS);
    expect(irregulares(m)).toBeGreaterThan(0);
  });

  it('furos: [] fecha a seção pelo eixo, e a casca fecha', () => {
    const m = rodar({ perfil: ARO, furos: [] });
    expect(gritos(m)).toBe('');
    expect(irregulares(m)).toBe(0);
  });

  it('o perfil com as duas pontas no eixo e o que volta ao primeiro ponto passam sem declaração e fecham', () => {
    const cilindro = rodar({ perfil: [[0, 0], [0.3, 0], [0.3, 1], [0, 1]] });
    expect(gritos(cilindro)).toBe('');
    expect(irregulares(cilindro)).toBe(0);
    const anel = rodar({ perfil: [...ARO, ARO[0]] });
    expect(gritos(anel)).toBe('');
    expect(irregulares(anel)).toBe(0);
  });

  it('superficie fora de true ou false, e superficie: true com furos, gritam', () => {
    expect(gritos(rodar({ perfil: ARO, superficie: 'sim' }))).toMatch(/superficie: superficie precisa ser true ou false/);
    const m = rodar({ perfil: ARO, superficie: true, furos: [] });
    expect(m.orfaos[0].ref).toBe('superficie');
    expect(m.orfaos[0].motivo).toMatch(/não vale com furos ou deslocar/);
  });

  it('a mesma entrada dá a mesma malha', () => {
    const a = rodar({ perfil: ARO, superficie: true });
    const b = rodar({ perfil: ARO, superficie: true });
    expect(JSON.stringify([...a.V])).toBe(JSON.stringify([...b.V]));
    expect(JSON.stringify([...a.F])).toBe(JSON.stringify([...b.F]));
  });
});

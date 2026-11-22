/* helice.test.mjs — o caminho helicoidal: raio, passo, voltas, sentido e pontas medidos nos pontos, e o friso que ele dá sai
 * sólido fechado, com o perfil girando com a hélice pelas normais por ponto. */
import { describe, expect, it } from 'vitest';
import { caminhoHelicoidal } from '../../../procedural/nucleo/caminho-helicoidal.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import receita, { TABELA } from './receita.js';

const mm = (p) => p.map((x) => x * 1000);

function arestasIrregulares(neutro, parte) {
  const uso = new Map();
  for (const f of neutro.F.values()) {
    if (parte && f.parte !== parte) continue;
    for (let k = 0; k < f.vs.length; k += 1) {
      const a = f.vs[k]; const b = f.vs[(k + 1) % f.vs.length];
      const chave = a < b ? `${a}-${b}` : `${b}-${a}`;
      uso.set(chave, (uso.get(chave) ?? 0) + 1);
    }
  }
  return [...uso.values()].filter((n) => n !== 2).length;
}

describe('caminhoHelicoidal', () => {
  it('põe cada ponto no raio, com a normal radial unitária, e avança o passo a cada volta', () => {
    const h = caminhoHelicoidal({ raio: 20, passo: 8, voltas: 3, pontosPorVolta: 16 });
    expect(h.pontos.length).toBe(49);
    for (const [k, p] of h.pontos.entries()) {
      const q = mm(p);
      expect(Math.hypot(q[0], q[2])).toBeCloseTo(20, 9);
      expect(q[1]).toBeCloseTo((8 * k) / 16, 9);
      const n = h.normais[k];
      expect(Math.hypot(...n)).toBeCloseTo(1, 12);
      expect(n[0] * q[0] + n[2] * q[2]).toBeCloseTo(20, 9);
      expect(n[1]).toBe(0);
    }
    expect(h.altura).toBeCloseTo(24, 9);
  });

  it('a direita gira no sentido da mão direita em volta do eixo, e a esquerda ao contrário', () => {
    for (const eixo of ['x', 'y', 'z']) {
      const giro = (sentido) => {
        const h = caminhoHelicoidal({ raio: 10, passo: 5, voltas: 1, eixo, sentido, pontosPorVolta: 8 });
        const [a, b] = [mm(h.pontos[0]), mm(h.pontos[1])];
        const k = 'xyz'.indexOf(eixo);
        const cruz = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
        return Math.sign(cruz[k]);
      };
      expect(giro('direita'), eixo).toBe(1);
      expect(giro('esquerda'), eixo).toBe(-1);
    }
  });

  it('as pontas avançam com o passo delas, e a mudança leva meia volta', () => {
    const h = caminhoHelicoidal({ raio: 20, passo: 8, voltas: 6, pontas: { voltas: 1, passo: 3 }, pontosPorVolta: 32 });
    expect(mm(h.pontos[32])[1]).toBeCloseTo(3, 6);
    expect(h.altura).toBeCloseTo(2 * 3 + 2 * 0.5 * ((3 + 8) / 2) + 3 * 8, 2);
    const y = h.pontos.map((p) => p[1]);
    for (let k = 1; k < y.length; k += 1) expect(y[k]).toBeGreaterThan(y[k - 1]);
  });

  it('é determinístico', () => {
    const d = { raio: 7, passo: 2, voltas: 4.5, pontas: { voltas: 1, passo: 1 }, sentido: 'esquerda', eixo: 'z', inicio: 30 };
    expect(JSON.stringify(caminhoHelicoidal(d))).toBe(JSON.stringify(caminhoHelicoidal(d)));
  });

  it('recusa com o campo e o valor', () => {
    const r = (d) => { try { caminhoHelicoidal(d); return null; } catch (e) { return e.message; } };
    expect(r({ passo: 1, voltas: 1 })).toMatch(/raio .*veio undefined/);
    expect(r({ raio: 1, passo: 1, voltas: 1, eixo: 'w' })).toMatch(/eixo/);
    expect(r({ raio: 1, passo: 1, voltas: 1, pontosPorVolta: 4 })).toMatch(/pontosPorVolta/);
    expect(r({ raio: 1, passo: 1, voltas: 2, pontas: { voltas: 1, passo: 0.5 } })).toMatch(/3 voltas ou mais/);
    expect(r({ raio: 1, passo: 1, voltas: 1, cor: 1 })).toMatch(/campo "cor"/);
  });
});

describe('o friso ao longo da hélice', () => {
  const { neutro } = executarReceita(receita);

  it('o fio, o núcleo e o filete saem sólidos fechados, sem órfão', () => {
    expect((neutro.orfaos ?? []).map((o) => o.motivo)).toEqual([]);
    for (const parte of ['fio', 'nucleo', 'filete']) expect(arestasIrregulares(neutro, parte), parte).toBe(0);
  });

  it('o filete gira com a hélice: a ponta do perfil fica sempre a raio mais altura do eixo', () => {
    const { raio, altura, centro } = TABELA.filete;
    let maior = 0;
    for (const f of neutro.F.values()) {
      if (f.parte !== 'filete') continue;
      for (const v of f.vs) { const p = mm(neutro.V.get(v)); maior = Math.max(maior, Math.hypot(p[0] - centro[0], p[2] - centro[2])); }
    }
    /* a normal é projetada no plano perpendicular à linha, que se inclina com o passo: a ponta fica até 0,005 mm além */
    expect(maior).toBeCloseTo(raio + altura, 2);
  });

  it('normal e normais juntas, e normais do tamanho errado, são recusadas com o campo', () => {
    const h = caminhoHelicoidal({ raio: 5, passo: 2, voltas: 1, pontosPorVolta: 8 });
    const [, args] = h.friso({ origemId: 1, perfil: { circulo: { raio: 0.5 } } });
    const motivo = (a) => (executarReceita({ meta: { nome: 'x' }, PASSOS: [['friso', a]] }).neutro.orfaos ?? []).map((o) => o.motivo).join(' ');
    expect(motivo({ ...args, normal: [0, 1, 0] })).toContain('declare normal (uma para a linha toda) ou normais (uma por ponto), não os dois');
    expect(motivo({ ...args, normais: args.normais.slice(1) })).toMatch(/uma normal por ponto da linha, 9 \(veio 8\)/);
  });
});

/* nomes-de-face.test.ts — os NOMES publicados por `origem` são formato salvo, e
   este arquivo é a única coisa que os prende à geometria.

   Por que existe: a revisão adversarial do ciclo "Endereços semânticos v1"
   trocou `frente` por `tras` no registro do `chamferBox` e a suíte inteira ficou
   VERDE — 502 de 502. O nome tinha entrado no formato salvo sem uma única
   afirmação. A mesma troca no `cubo` ficava vermelha, então a proteção existia
   para o gerador antigo e não para os que o ciclo acabou de estender.

   O que se prende aqui é a promessa, não a numeração: `topo` tem de ser a face
   de cima, `frente` a de +Z, `tampa fundo` a de baixo. Se alguém reordenar as
   faces do gerador e ajustar o registro junto, estes testes continuam verdes —
   é o comportamento certo, porque o contrato é o nome, não o índice. Se alguém
   trocar dois nomes entre si, fica vermelho, que é o defeito que passou. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — módulo .js do motor v3 (sem tipos)
import { nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';

type Neutro = { V: Map<number, number[]>; F: Map<number, any>; orfaos: any[] };

/* centro da face nomeada, medido no neutro. Cita a face pelo NOME, via
   `sel:{origem}`, que é exatamente o caminho que uma peça usa. */
function centroDaFace(passos: any[], origem: Record<string, unknown>, params: any = {}, topo: any = {}) {
  const lista = [...passos, ['parte', { nome: 'alvo', sel: { origem } }]];
  const neutro = nucleo(lista, params, topo, {}, null, []) as Neutro;
  expect(neutro.orfaos).toEqual([]);
  const vs = new Set<number>();
  for (const f of neutro.F.values()) if (f.parte === 'alvo') for (const v of f.vs) vs.add(v);
  expect(vs.size).toBeGreaterThan(0);
  const soma = [0, 0, 0];
  for (const v of vs) { const p = neutro.V.get(v)!; for (let k = 0; k < 3; k++) soma[k] += p[k]; }
  return soma.map((s) => s / vs.size) as [number, number, number];
}

/* a caixa inteira da peça, para saber onde ficam os extremos */
function caixaDaPeca(passos: any[], params: any = {}, topo: any = {}) {
  const neutro = nucleo(passos, params, topo, {}, null, []) as Neutro;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of neutro.V.values()) for (let k = 0; k < 3; k++) {
    if (p[k] < min[k]) min[k] = p[k];
    if (p[k] > max[k]) max[k] = p[k];
  }
  return { min, max };
}

/* eixo e sentido que cada nome PROMETE. Trocar dois nomes no gerador quebra
   aqui, que é o defeito que a revisão achou passando verde. */
const PROMESSA: Record<string, { eixo: 0 | 1 | 2; sentido: 1 | -1 }> = {
  topo: { eixo: 1, sentido: 1 },
  fundo: { eixo: 1, sentido: -1 },
  frente: { eixo: 2, sentido: 1 },
  tras: { eixo: 2, sentido: -1 },
  direita: { eixo: 0, sentido: 1 },
  esquerda: { eixo: 0, sentido: -1 },
};

const CAIXA = [['cubo', { origemId: 1, larg: 2, alt: 2, prof: 2 }]];
const CHANFRO = [['chamferBox', { origemId: 1, larg: 2, alt: 2, prof: 2, chanfro: 0.25 }]];

describe('os nomes de face do `cubo` e do `chamferBox` apontam para onde prometem', () => {
  for (const [rotulo, passos, op] of [
    ['cubo', CAIXA, 'cubo'],
    ['chamferBox', CHANFRO, 'chamferBox'],
  ] as const) {
    for (const [nome, { eixo, sentido }] of Object.entries(PROMESSA)) {
      it(`${rotulo}: '${nome}' fica no extremo ${sentido > 0 ? '+' : '−'}${'XYZ'[eixo]}`, () => {
        const centro = centroDaFace(passos as any[], { op, id: 1, face: nome });
        const { min, max } = caixaDaPeca(passos as any[]);
        const extremo = sentido > 0 ? max[eixo] : min[eixo];
        /* o centro da face nomeada tem de estar NO extremo do eixo prometido */
        expect([nome, Math.abs(centro[eixo] - extremo) < 1e-9]).toEqual([nome, true]);
        /* e os outros dois eixos ficam no meio, senão o nome pegou outra face */
        for (const outro of [0, 1, 2] as const) {
          if (outro === eixo) continue;
          const meio = (min[outro] + max[outro]) / 2;
          expect([nome, 'XYZ'[outro], Math.abs(centro[outro] - meio) < 1e-9]).toEqual([nome, 'XYZ'[outro], true]);
        }
      });
    }
  }
});

describe('as tampas do `cilindro` e do `cone` apontam para onde prometem', () => {
  const CIL = [['cilindro', { origemId: 1, raio: 1, altura: 2, lados: 8 }]];
  const CONE = [['cone', { origemId: 1, raio: 1, altura: 2, lados: 8 }]];

  it("cilindro: 'fundo' fica embaixo e 'topo' em cima", () => {
    const { min, max } = caixaDaPeca(CIL);
    const baixo = centroDaFace(CIL, { op: 'cilindro', id: 1, tampa: 'fundo' });
    const cima = centroDaFace(CIL, { op: 'cilindro', id: 1, tampa: 'topo' });
    expect(Math.abs(baixo[1] - min[1]) < 1e-9).toBe(true);
    expect(Math.abs(cima[1] - max[1]) < 1e-9).toBe(true);
    expect(baixo[1]).toBeLessThan(cima[1]);
  });

  it("cone: 'fundo' fica embaixo, e não existe 'topo' porque o ápice é vértice", () => {
    const { min } = caixaDaPeca(CONE);
    const baixo = centroDaFace(CONE, { op: 'cone', id: 1, tampa: 'fundo' });
    expect(Math.abs(baixo[1] - min[1]) < 1e-9).toBe(true);

    const comTopo = nucleo(
      [...CONE, ['parte', { nome: 'x', sel: { origem: { op: 'cone', id: 1, tampa: 'topo' } } }]],
      {}, {}, {}, null, [],
    ) as Neutro;
    expect(comTopo.orfaos.length).toBeGreaterThan(0);
  });
});

describe('a grade do `plano` acompanha a célula pedida', () => {
  const PLANO = (seg: number) => [['plano', { origemId: 1, largura: 3, profundidade: 3, seg }]];

  it('faixa e lado andam em Z e em X, na mesma ordem da grade', () => {
    const primeira = centroDaFace(PLANO(3), { op: 'plano', id: 1, faixa: 0, lado: 0 });
    const outraFaixa = centroDaFace(PLANO(3), { op: 'plano', id: 1, faixa: 2, lado: 0 });
    const outroLado = centroDaFace(PLANO(3), { op: 'plano', id: 1, faixa: 0, lado: 2 });

    /* mudar a faixa move em Z e não move em X; mudar o lado faz o contrário */
    expect(Math.abs(outraFaixa[0] - primeira[0]) < 1e-9).toBe(true);
    expect(outraFaixa[2]).not.toBeCloseTo(primeira[2], 9);
    expect(Math.abs(outroLado[2] - primeira[2]) < 1e-9).toBe(true);
    expect(outroLado[0]).not.toBeCloseTo(primeira[0], 9);
  });

  it("'ultima' segue a contagem real quando `seg` muda", () => {
    const com3 = centroDaFace(PLANO(3), { op: 'plano', id: 1, faixa: 'ultima', lado: 0 });
    const com5 = centroDaFace(PLANO(5), { op: 'plano', id: 1, faixa: 'ultima', lado: 0 });
    const caixa3 = caixaDaPeca(PLANO(3));
    const caixa5 = caixaDaPeca(PLANO(5));
    /* nos dois casos a última faixa encosta no mesmo extremo da peça */
    const fim3 = caixa3.max[2] - (caixa3.max[2] - caixa3.min[2]) / (2 * 3);
    const fim5 = caixa5.max[2] - (caixa5.max[2] - caixa5.min[2]) / (2 * 5);
    expect(com3[2]).toBeCloseTo(fim3, 9);
    expect(com5[2]).toBeCloseTo(fim5, 9);
  });
});

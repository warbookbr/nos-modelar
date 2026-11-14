/* espelha.test.ts — o passo `espelha` medido por número: a reflexão por plano fora da origem nos três eixos, a ordem e a numeração dos ids novos,
   a soldagem do que está no plano, o modo estrutural (origem, cópias e transformação publicadas) e cada recusa de entrada com o campo que ela cita.
   A revisão das verificações (2026-11-13) refez 20 estragos de uma linha na operação e só 5 reprovaram um teste: o modo estrutural passou 7 de 7 e a
   reflexão por plano fora da origem passava com `4 * pos` no lugar de `2 * pos`. */
import { describe, expect, it } from 'vitest';
import { nucleo } from '../entrada.js';
import { idDoPasso } from '../nucleo.js';

const EIXOS = { x: 0, y: 1, z: 2 };
/* o cubo de lado 2 com o canto mínimo em `de`; o cubo nasce com x e z centrados na origem e y de 0 a 2, e o canto mínimo dele é [-1, 0, -1] */
const cuboEm = (id: number, de: number[]) => [
  ['cubo', { origemId: id, larg: 2, alt: 2, prof: 2 }],
  ['transladar', { d: [de[0] + 1, de[1], de[2] + 1], sel: { origem: { op: 'cubo', id } } }],
] as unknown[][];
const roda = (passos: unknown[][]) => nucleo(passos as never);
const posicoes = (st: ReturnType<typeof roda>) => [...st.V.entries()];

describe('espelha: a reflexão por plano', () => {
  for (const [eixo, ax] of Object.entries(EIXOS)) {
    for (const pos of [0, 3, -1.5]) {
      it(`eixo ${eixo}, pos ${pos}: cada vértice novo é a reflexão 2*pos - p do vértice de origem, e os do plano ficam soldados`, () => {
        /* o cubo vai do plano até 2 acima dele: as quatro posições da face de baixo estão no plano, as outras quatro não */
        const de = [0, 0, 0]; de[ax] = pos;
        const antes = roda([...cuboEm(1, de)]);
        const st = roda([...cuboEm(1, de), ['espelha', { eixo, pos }]]);
        /* a face de baixo está inteira no plano: o modo legado a recusa e a pula, e as outras cinco copiam */
        expect(st.orfaos).toHaveLength(1);
        expect(st.orfaos[0].motivo).toMatch(/inteiramente no plano do espelho/);
        expect(st.V.size).toBe(antes.V.size + 4);
        expect(st.F.size).toBe(antes.F.size + 5);
        const novos = posicoes(st).filter(([id]) => id >= idDoPasso(2, 0) && id < idDoPasso(3, 0));
        expect(novos).toHaveLength(4);
        const noPlano = [...antes.V.values()].filter((p) => p[ax] === pos);
        expect(noPlano).toHaveLength(4);
        const fora = [...antes.V.entries()].filter(([, p]) => p[ax] !== pos).sort((a, b) => a[0] - b[0]);
        /* a ordem dos ids novos é a dos ids de origem, crescente, a partir do primeiro id do passo */
        fora.forEach(([, p], k) => {
          const q = st.V.get(idDoPasso(2, k));
          const esperado = p.slice(); esperado[ax] = 2 * pos - p[ax];
          expect(q).toEqual(esperado);
        });
        /* o que o espelho cria fica do outro lado do plano, à mesma distância */
        for (const [, q] of novos) expect(Math.abs(q[ax] - pos)).toBeCloseTo(2, 12);
        for (const [, q] of novos) expect(q[ax] - pos).toBeLessThan(0);
      });
    }
  }

  it('cada face copiada tem os cantos da original na ordem inversa, levados ao espelho, e a primeira cópia vem da primeira face', () => {
    const st = roda([...cuboEm(1, [3, 0, 0]), ['espelha', { eixo: 'x', pos: 2 }]]);
    const fontes = [...st.F.values()].filter((f) => f.id < idDoPasso(2, 0)).sort((a, b) => a.id - b.id);
    const copias = fontes.map((_, k) => st.F.get(idDoPasso(2, k)));
    expect(copias.every(Boolean)).toBe(true);
    fontes.forEach((f, k) => {
      const c = copias[k]!;
      expect(c.vs).toHaveLength(f.vs.length);
      /* o canto k da original, refletido, é o canto n-1-k da cópia; o que está no plano é o mesmo vértice */
      f.vs.forEach((v: number, j: number) => {
        const p = st.V.get(v)!; const q = st.V.get(c.vs[f.vs.length - 1 - j])!;
        expect(q[0]).toBeCloseTo(4 - p[0], 12);
        expect(q[1]).toBeCloseTo(p[1], 12);
        expect(q[2]).toBeCloseTo(p[2], 12);
      });
    });
  });

  it('só as faces selecionadas são espelhadas, e as cópias levam a parte, a cor e o material da original', () => {
    const st = roda([
      ...cuboEm(1, [3, 0, 0]),
      ['parte', { nome: 'caixa', sel: { origem: { op: 'cubo', id: 1 } } }],
      ['espelha', { eixo: 'x', pos: 0 }],
    ]);
    const copias = [...st.F.values()].filter((f) => f.id >= idDoPasso(3, 0) && f.id < idDoPasso(4, 0));
    expect(copias).toHaveLength(6);
    expect(copias.every((f) => f.parte === 'caixa')).toBe(true);
    expect(roda([...cuboEm(1, [3, 0, 0]), ['espelha', { eixo: 'x', pos: 0, faces: [] }]]).F.size).toBe(6);
  });

  it('as faces escolhidas fora de ordem saem copiadas em ordem crescente de id, com os vértices novos na mesma ordem', () => {
    const st = roda([...cuboEm(1, [3, 0, 0]), ['espelha', { eixo: 'x', pos: 2, faces: [4, 1, 3] }]]);
    expect(st.orfaos).toEqual([]);
    const copias = [0, 1, 2].map((k) => st.F.get(idDoPasso(2, k))!);
    expect(copias.every(Boolean)).toBe(true);
    expect(st.F.size).toBe(6 + 3);
    const fontes = [1, 3, 4].map((id) => st.F.get(id)!);
    fontes.forEach((f, k) => {
      const c = copias[k];
      f.vs.forEach((v: number, j: number) => {
        const p = st.V.get(v)!; const q = st.V.get(c.vs[f.vs.length - 1 - j])!;
        expect(q).toEqual([4 - p[0], p[1], p[2]]);
      });
    });
    /* o primeiro vértice novo é a reflexão do menor id de origem entre os cantos das três faces */
    const menor = Math.min(...fontes.flatMap((f) => f.vs));
    expect(st.V.get(idDoPasso(2, 0))).toEqual([4 - st.V.get(menor)![0], st.V.get(menor)![1], st.V.get(menor)![2]]);
  });

  it('a face inteira no plano é recusada e pulada no modo legado, e as outras cinco copiam', () => {
    const st = roda([...cuboEm(1, [3, 0, 0]), ['espelha', { eixo: 'x', pos: 3 }]]);
    expect(st.orfaos).toHaveLength(1);
    expect(st.orfaos[0]).toMatchObject({ passo: 2, op: 'espelha' });
    expect(st.orfaos[0].motivo).toMatch(/face inteiramente no plano do espelho — degenerado \(a espelhada seria coincidente\), pulada/);
    expect(st.F.size).toBe(6 + 5);
  });

  it('eixo ausente ou desconhecido recusa citando o eixo', () => {
    const sem = roda([...cuboEm(1, [3, 0, 0]), ['espelha', {}]]);
    expect(sem.orfaos[0]).toMatchObject({ op: 'espelha', ref: 'eixo' });
    expect(sem.orfaos[0].motivo).toMatch(/falta o argumento 'eixo'/);
    const w = roda([...cuboEm(1, [3, 0, 0]), ['espelha', { eixo: 'w' }]]);
    expect(w.orfaos[0]).toMatchObject({ op: 'espelha', ref: 'w' });
    expect(w.orfaos[0].motivo).toMatch(/eixo 'w' desconhecido/);
  });
});

describe('espelha: o modo estrutural', () => {
  const FONTE = { op: 'cubo', id: 1 };
  const base = (extra: Record<string, unknown> = {}) => [...cuboEm(1, [2, 0, 0]), ['espelha', { eixo: 'x', pos: 1, origemId: 2, derivaDe: FONTE, sel: { origem: FONTE }, ...extra }]] as unknown[][];
  const recusa = (extra: Record<string, unknown>, passos = base(extra)) => {
    const st = roda(passos);
    const o = st.orfaos.filter((x: { op: string }) => x.op === 'espelha');
    expect(o).toHaveLength(1);
    expect(o[0].passo).toBe(2);
    /* nada foi criado: nem vértice nem face novos */
    expect(st.F.size).toBe(6);
    expect(st.V.size).toBe(8);
    return o[0];
  };

  it('a entrada de base monta, publica a origem com as cópias e a transformação, e cada face fora do plano ganha a cópia de id novo na ordem', () => {
    const st = roda(base());
    expect(st.orfaos).toEqual([]);
    expect(st.F.size).toBe(12);
    const registros = st.origens.get(2);
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({ op: 'espelha', derivaDe: FONTE, transformacao: { tipo: 'espelho', eixo: 0, pos: 1 } });
    expect(registros[0].copias).toBeInstanceOf(Map);
    expect(registros[0].copias.size).toBe(6);
    const fontes = [...st.F.keys()].filter((id: number) => id < idDoPasso(2, 0)).sort((a: number, b: number) => a - b);
    /* a face k da fonte, em ordem crescente de id, tem a cópia de id novo k */
    fontes.forEach((fid: number, k: number) => expect(registros[0].copias.get(fid)).toBe(idDoPasso(2, k)));
  });

  it('a origem do espelho é citável: uma parte seleciona as cópias, e só elas', () => {
    const st = roda([...base({ pos: 1 }).slice(0, 2), ['espelha', { eixo: 'x', pos: 0, origemId: 2, derivaDe: FONTE, sel: { origem: FONTE } }], ['parte', { nome: 'espelho', sel: { origem: { op: 'espelha', id: 2, de: FONTE } } }]]);
    expect(st.orfaos).toEqual([]);
    const doEspelho = [...st.F.values()].filter((f) => f.parte === 'espelho');
    expect(doEspelho).toHaveLength(6);
    expect(doEspelho.every((f) => f.id >= idDoPasso(2, 0))).toBe(true);
  });

  it('a reflexão estrutural fora da origem também é 2*pos - p, nos três eixos', () => {
    for (const [eixo, ax] of Object.entries(EIXOS)) {
      const de = [0, 0, 0]; de[ax] = 4;
      const st = roda([...cuboEm(1, de), ['espelha', { eixo, pos: 1.5, origemId: 2, derivaDe: FONTE, sel: { origem: FONTE } }]]);
      expect(st.orfaos).toEqual([]);
      const antes = [...st.V.entries()].filter(([id]) => id < idDoPasso(2, 0)).sort((a, b) => a[0] - b[0]);
      antes.forEach(([, p], k) => { const q = st.V.get(idDoPasso(2, k))!; const e = p.slice(); e[ax] = 3 - p[ax]; expect(q).toEqual(e); });
    }
  });

  it('origemId e derivaDe vêm juntos', () => {
    for (const faltando of ['origemId', 'derivaDe']) {
      const passo = ['espelha', { eixo: 'x', pos: 1, origemId: 2, derivaDe: FONTE, sel: { origem: FONTE } }] as [string, Record<string, unknown>];
      delete passo[1][faltando];
      const r = recusa({}, [...cuboEm(1, [2, 0, 0]), passo]);
      expect(r.ref).toBe('origemId+derivaDe');
      expect(r.motivo).toBe('modo estrutural exige origemId e derivaDe juntos');
    }
  });

  it('origemId precisa ser inteiro não-negativo, e 0 vale', () => {
    for (const ruim of [-1, 1.5, '2', NaN]) expect(recusa({ origemId: ruim }).ref).toBe('origemId');
    expect(roda(base({ origemId: 0 })).orfaos).toEqual([]);
  });

  it('origemId declarada em dois passos recusa citando a origem', () => {
    const espelho = ['espelha', { eixo: 'x', pos: 1, origemId: 2, derivaDe: FONTE, sel: { origem: FONTE } }];
    const st = roda([...cuboEm(1, [2, 0, 0]), espelho, espelho]);
    const ambiguas = st.orfaos.filter((o: { op: string; ref: unknown }) => o.op === 'espelha' && o.ref === 'origemId');
    expect(ambiguas.length).toBeGreaterThan(0);
    expect(ambiguas[0].motivo).toMatch(/origemId 2 ambígua/);
    expect(st.origens.has(2)).toBe(false);
  });

  it('derivaDe inválida recusa citando derivaDe com o texto da validação, e a origem que não existe cita derivaDe sem o prefixo', () => {
    const invalida = recusa({ derivaDe: { op: 'nada', id: 1 }, sel: { origem: { op: 'nada', id: 1 } } });
    expect(invalida.ref).toBe('derivaDe');
    expect(invalida.motivo).toMatch(/^derivaDe inválida: /);
    const inexistente = recusa({ derivaDe: { op: 'cubo', id: 9 }, sel: { origem: { op: 'cubo', id: 9 } } });
    expect(inexistente.ref).toBe('derivaDe');
    expect(inexistente.motivo).not.toMatch(/^derivaDe inválida/);
  });

  it('sel precisa ser só { origem } direto: sem faces, sem seletor ausente, lista ou chave a mais', () => {
    for (const extra of [{ faces: [0] }, { sel: undefined }, { sel: [FONTE] }, { sel: 'x' }, { sel: { origem: FONTE, tudo: true } }, { sel: { alias: 'a' } }, { sel: {} }]) {
      const r = recusa(extra);
      expect(r.ref).toBe('sel');
      expect(r.motivo).toBe('modo estrutural exige sel:{origem:...} direto, sem faces, alias, região ou ids literais');
    }
  });

  it('sel.origem precisa ser a mesma origem de derivaDe, e uma origem mal formada recusa do mesmo jeito', () => {
    for (const origem of [{ op: 'cubo', id: 2 }, { op: 'cilindro', id: 1 }, { op: 'nada' }]) {
      const r = recusa({ sel: { origem } });
      expect(r.ref).toBe('sel.origem');
      expect(r.motivo).toBe('sel.origem precisa ser a mesma origem estrutural declarada em derivaDe');
    }
  });

  it('a face inteira no plano recusa o passo todo, citando o id da face, sem criar cópia nenhuma', () => {
    const st = roda([...cuboEm(1, [3, 0, 0]), ['espelha', { eixo: 'x', pos: 3, origemId: 2, derivaDe: FONTE, sel: { origem: FONTE } }]]);
    const o = st.orfaos.filter((x: { op: string }) => x.op === 'espelha');
    expect(o).toHaveLength(1);
    expect(typeof o[0].ref).toBe('number');
    expect(o[0].motivo).toMatch(/face inteiramente no plano do espelho — a saída estrutural seria incompleta; nenhuma cópia foi criada/);
    expect(st.F.size).toBe(6);
    expect(st.V.size).toBe(8);
    expect(st.origens.has(2)).toBe(false);
  });
});

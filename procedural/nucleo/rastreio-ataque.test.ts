/* rastreio-ataque.test.ts — casos de ataque ao rastreio declarado do retrato ('tocados'), trazidos da revisão adversarial de 2026-11-14: booleanas
   coincidentes e recusadas, três aberturas na mesma chapa, vão colado no anterior e a memória de execução, sempre comparando o completo, o rápido
   e o conferido e exigindo que os mapas saiam sem métodos remendados; mais a injeção de falha, que desliga as somas das operações (em
   `somas-do-rastreio.js`) e confere que a chapa de prova reprova quando faltam as da abertura e as da booleana juntas. */
import { describe, expect, it } from 'vitest';
import { nucleo } from './nucleo.js';
import { criarMemoriaDeExecucao } from './memoria-de-execucao.js';
// @ts-expect-error js
import { injecao } from './somas-do-rastreio.js';
// @ts-expect-error js
import { TABELA, derivar, passoDaChapa } from '../../tools/fixtures/abertura-de-prova/chapa.js';

type P = [string, Record<string, unknown>?];
const rodar = (PASSOS: P[], retrato?: string, extra: any = {}, TOPO: any = {}) => nucleo(PASSOS as any, {}, TOPO, { a: { cor: [1, 0, 0] } } as any, null as any, [] as any, { ...(retrato ? { retrato } : {}), ...extra });
const texto = (n: any) => JSON.stringify({ procedencia: n.procedencia, V: [...n.V], F: [...n.F], orfaos: n.orfaos, partes: n.partes });
function tres(PASSOS: P[], TOPO: any = {}) {
  const c = rodar(PASSOS, 'completo', {}, TOPO), r = rodar(PASSOS, 'rapido', {}, TOPO), k = rodar(PASSOS, 'conferido', {}, TOPO);
  expect(texto(r)).toBe(texto(c)); expect(texto(k)).toBe(texto(c));
  expect(Object.getOwnPropertyNames(r.V)).toEqual([]); expect(Object.getOwnPropertyNames(r.F)).toEqual([]);
  return c;
}
const o = (op: string, id: number) => ({ origem: { op, id } });
const TOPO = derivar(TABELA).pontos;
const vao = (id: number, chapa: any, dz: number, extra: any = {}) => {
  const c = TABELA.contorno, mv = (p: number[]) => [p[0], p[1] + dz];
  return ['aberturaPorContorno', { origemId: id, chapa, contorno: derivar({ ...TABELA, contorno: { ...c, bico: mv(c.bico), fimDoReto: mv(c.fimDoReto), fimDoArco: mv(c.fimDoArco) } }).trechos, vista: 'y', segmentosArco: 32, ...extra }] as P;
};
const chapa: P = ['subdivisao', { origemId: 1, ...passoDaChapa(TABELA, derivar(TABELA)) }];

describe('ataque ao rastreio tocados', () => {
  it('cubos coincidentes: unir de idênticos, unir de três, subtrair, limparLascas no tudo, intersectar de três', () => {
    const base: P[] = [['cubo', { origemId: 1, lado: 1 }], ['cubo', { origemId: 2, lado: 1 }], ['cubo', { origemId: 3, lado: 1, em: [1, 0, 0] }], ['cubo', { origemId: 4, lado: 0.5, em: [0.5, 0.5, 0] }], ['cubo', { origemId: 5, lado: 0.3, em: [-0.5, -0.5, -0.5] }]];
    tres([...base, ['unir', { origemId: 10, solidos: [o('cubo', 1), o('cubo', 2)] }], ['unir', { origemId: 11, solidos: [o('unir', 10), o('cubo', 3), o('cubo', 4)] }],
      ['subtrair', { origemId: 12, solidos: [o('unir', 11), o('cubo', 5)] }], ['limparLascas', { sel: { tudo: true }, tolerancia: 0.001 }], ['material', { usa: 'a', sel: { tudo: true } }]]);
    tres([...base, ['intersectar', { origemId: 10, solidos: [o('cubo', 1), o('cubo', 2), o('cubo', 4)] }], ['subtrair', { origemId: 11, solidos: [o('intersectar', 10), o('cubo', 3)] }]]);
  });
  it('booleanas recusadas (órfão, operando único, mesma face nos dois)', () => {
    tres([['cubo', { origemId: 1, lado: 1 }], ['subtrair', { origemId: 10, solidos: [o('cubo', 1), o('cubo', 99)] }], ['subtrair', { origemId: 11, solidos: [o('cubo', 1)] }], ['unir', { origemId: 12, solidos: [o('cubo', 1), o('cubo', 1)] }]]);
  });
  it('três aberturas na mesma chapa (lente, sobre a origem da anterior, sobre tudo), parte e limparLascas', () => {
    tres([chapa, vao(3, o('subdivisao', 1), 0, { lente: true }), vao(5, o('aberturaPorContorno', 3), -250), vao(6, { tudo: true }, 250),
      ['parte', { nome: 'chapa', sel: o('aberturaPorContorno', 6) }], ['limparLascas', { sel: { tudo: true }, tolerancia: 0.00001 }]], TOPO);
  }, 300_000);
  for (const dz of [-102, -110, -130, 104]) it(`vão colado no anterior (dz ${dz} mm)`, () => {
    tres([chapa, vao(3, o('subdivisao', 1), 0), vao(5, { tudo: true }, dz, { lente: true }), ['material', { usa: 'a', sel: { tudo: true } }]], TOPO);
  }, 300_000);
  it('memória de execução: o segundo run restaura do ponto e dá a procedência da conta completa', () => {
    const base: P[] = [['cubo', { origemId: 1, lado: 1 }], ['cubo', { origemId: 2, lado: 0.6, em: [0.5, 0.5, 0.5] }], ['cubo', { origemId: 3, lado: 0.3, em: [-0.5, 0, 0] }],
      ['subtrair', { origemId: 10, solidos: [o('cubo', 1), o('cubo', 2)] }], ['subtrair', { origemId: 11, solidos: [o('subtrair', 10), o('cubo', 3)] }]];
    const a: P[] = [...base, ['material', { usa: 'a', sel: o('subtrair', 11) }]];
    const b: P[] = [...base, ['liso', { angulo: 30, sel: o('subtrair', 11) }], ['transladar', { d: [0, 1, 0], sel: o('subtrair', 11) }]];
    for (const modo of ['rapido', 'conferido']) {
      const mem = criarMemoriaDeExecucao();
      rodar(a, modo, { memoria: mem }); const rb = rodar(b, modo, { memoria: mem });
      expect(mem.estatisticas.restaurados).toBeGreaterThan(0);
      expect(texto(rb)).toBe(texto(rodar(b, 'completo')));
      expect(texto(rodar(b, modo, { memoria: mem }))).toBe(texto(rb));
    }
  });
});

describe('injeção de falha: sem as somas, a chapa de prova reprova', () => {
  const comDesligadas = (quais: string[], fn: () => void) => {
    for (const q of quais) injecao.desligadas.add(q);
    try { fn(); } finally { injecao.desligadas.clear(); }
  };
  const conferido = () => rodar([chapa, vao(3, o('subdivisao', 1), 0, { lente: true }), vao(5, { tudo: true }, 104, { lente: true }), ['material', { usa: 'a', sel: { tudo: true } }]], 'conferido', {}, TOPO);

  it('com as somas ligadas passa', () => { expect(conferido).not.toThrow(); });
  it('sem só uma das duas somas ainda passa: elas se cobrem', () => {
    comDesligadas(['abertura'], () => expect(conferido).not.toThrow());
    comDesligadas(['booleana'], () => expect(conferido).not.toThrow());
  }, 300_000);
  it('sem as duas somas o conferido recusa a divergência', () => {
    comDesligadas(['abertura', 'booleana'], () => expect(conferido).toThrow(/divergiu da conta completa/));
  }, 300_000);
});

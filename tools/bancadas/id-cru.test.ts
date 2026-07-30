/* id-cru.test.ts — prova do gate do O-4: que ele ACHA id cru em peça nova, que
   a lista de exceções é uma dívida CONGELADA (não um teto para crescer) e que
   valor inesperado no arquivo salvo GRITA em vez de passar. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — gate em .mjs sem tipos.
import { contarIdCru, validarLista, conferir, medirPecas, lerLista, totalDe } from './id-cru.mjs';

const zero = { faces: 0, selV: 0, selF: 0 };

describe('contarIdCru', () => {
  it('conta as três formas de coleção, e só elas', () => {
    expect(contarIdCru([
      ['pincel', { modo: 'face', faces: [1, 2, 3], cor: '#fff' }],
      ['solido', { sel: { v: [4] } }],
      ['liso', { sel: { f: [5, 6] } }],
      ['transladar', { sel: { v: [7], f: [8] } }],
    ])).toEqual({ faces: 1, selV: 2, selF: 2 });
  });

  it('não conta caminho semântico — é isto que a peça nova deve usar', () => {
    expect(contarIdCru([
      ['pincel', { modo: 'face', sel: { grupo: 'disco' } }],
      ['solido', { sel: { alias: 'discoInteiro' } }],
      ['liso', { sel: { origem: { op: 'cilindro', id: 3, tampa: 'topo' } } }],
      ['parte', { nome: 'x', sel: { regiao: { min: [0, 0, 0], max: [1, 1, 1] } } }],
      ['espelha', { eixo: 'x', sel: { tudo: true } }],
    ])).toEqual(zero);
  });

  it('id cru MALFORMADO continua sendo id cru — o gate não é mais permissivo que o núcleo', () => {
    expect(contarIdCru([['pincel', { faces: 'nada' }], ['solido', { sel: { f: null } }]]))
      .toEqual({ faces: 1, selV: 0, selF: 1 });
  });

  it('a forma SINGULAR está declaradamente fora de escopo (vira não tem caminho semântico)', () => {
    expect(contarIdCru([['vira', { face: 0 }], ['moveV', { v: 2, d: [0, 1, 0] }], ['moveA', { a: 1, b: 2 }]]))
      .toEqual(zero);
  });
});

describe('conferir — dívida herdada é congelada, não permissão', () => {
  it('peça NOVA com id cru reprova', () => {
    const p = conferir({ nova: { faces: 2, selV: 0, selF: 0 } }, {});
    expect(p).toHaveLength(1);
    expect(p[0]).toMatch(/ID CRU em peça NOVA/);
  });

  it('peça que SAI da lista e continua usando id cru reprova como peça nova', () => {
    const herdadas = { antiga: { faces: 3, selV: 0, selF: 0 } };
    expect(conferir({ antiga: { faces: 3, selV: 0, selF: 0 } }, herdadas)).toEqual([]);
    expect(conferir({ antiga: { faces: 3, selV: 0, selF: 0 } }, {})[0]).toMatch(/ID CRU em peça NOVA/);
  });

  it('dívida herdada que CRESCE reprova', () => {
    const p = conferir({ antiga: { faces: 4, selV: 0, selF: 0 } }, { antiga: { faces: 3, selV: 0, selF: 0 } });
    expect(p[0]).toMatch(/NÃO cresce/);
  });

  it('dívida paga sem encolher a lista reprova — lista que mente vira teto', () => {
    expect(conferir({ antiga: { faces: 1, selV: 0, selF: 0 } }, { antiga: { faces: 3, selV: 0, selF: 0 } })[0])
      .toMatch(/dívida paga/);
    expect(conferir({}, { antiga: { faces: 3, selV: 0, selF: 0 } })[0]).toMatch(/mede 0 uso/);
  });
});

describe('validarLista — valor inesperado GRITA', () => {
  const base = () => ({ formato: 1, herdadas: { a: { faces: 1, selV: 0, selF: 0 } } });
  it('aceita a lista bem formada', () => expect(validarLista(base())).toEqual([]));
  it('recusa formato desconhecido', () => {
    const d = base(); (d as any).formato = 2;
    expect(validarLista(d)[0]).toMatch(/formato 2 desconhecido/);
  });
  it('recusa chave de topo extra', () => {
    const d = base(); (d as any).extra = true;
    expect(validarLista(d)[0]).toMatch(/chaves de topo inesperadas/);
  });
  it('recusa contagem que não é inteiro não-negativo', () => {
    const d = base(); (d as any).herdadas.a.faces = -1;
    expect(validarLista(d)[0]).toMatch(/não é inteiro não-negativo/);
    const e = base(); (e as any).herdadas.a.faces = 1.5;
    expect(validarLista(e)[0]).toMatch(/não é inteiro não-negativo/);
  });
  it('recusa chave de contagem faltando ou sobrando', () => {
    const d = base(); delete (d as any).herdadas.a.selF;
    expect(validarLista(d)[0]).toMatch(/precisa ter exatamente/);
  });
  it('recusa entrada zerada — peça sem dívida não é dívida herdada', () => {
    const d = base(); (d as any).herdadas.a.faces = 0;
    expect(validarLista(d)[0]).toMatch(/entrada zerada/);
  });
  it('recusa lista fora de ordem — o arquivo salvo é determinístico', () => {
    const d = { formato: 1, herdadas: { b: { faces: 1, selV: 0, selF: 0 }, a: { faces: 1, selV: 0, selF: 0 } } };
    expect(validarLista(d)[0]).toMatch(/fora de ordem/);
  });
});

describe('estado real do repositório', () => {
  it('o arquivo commitado é válido e bate com a medição — 0 id cru fora da lista', async () => {
    const { dados, erros, ausente } = lerLista();
    expect(ausente).toBe(false);
    expect(erros).toEqual([]);
    const { usos, falhas } = await medirPecas();
    expect(falhas).toEqual([]);
    expect(conferir(usos, dados.herdadas)).toEqual([]);
    expect(Object.keys(dados.herdadas)).toHaveLength(13);
    expect(Object.values(usos).reduce((s: number, u: any) => s + totalDe(u), 0)).toBe(131);
  });

  it('freio-disco e a peça de exercício do O-14 não têm id cru', async () => {
    const { usos } = await medirPecas();
    expect(usos['freio-disco']).toBeUndefined();
    expect(usos['_vao-e-anteparo']).toBeUndefined();
  });
});

/* contatos-separados.test.mjs — `separados` da receita: pares de partes que NÃO podem se tocar, com folga mínima cobrada pela malha. Cada recusa de lerSeparadosDeclarados
   tem a entrada ruim aqui, e a medida passa, reprova por folga e reprova por toque, por atravessamento e por contenção. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from './executar-receita.js';
import { contatosDaPeca, lerSeparadosDeclarados, lerContatosDeclarados } from './contatos-da-peca.js';

const MOTIVO = 'motivo suficientemente longo';
const PARTES = ['a', 'b'];
const cubo = (id, nome, lado, em = [0, 0, 0]) => [
  ['cubo', { origemId: id, larg: lado[0], alt: lado[1], prof: lado[2] }],
  ...(em.some((c) => c !== 0) ? [['transladar', { d: em, sel: { origem: { op: 'cubo', id } } }]] : []),
  ['parte', { nome, sel: { origem: { op: 'cubo', id } } }],
];
const neutroDe = (passos) => executarReceita({ meta: { nome: 'prova' }, PASSOS: passos.flat() }).neutro;
/* dois cubos de 10 com `vao` entre as faces que se olham, no eixo x */
const doisCubos = (vao) => neutroDe([cubo(1, 'a', [10, 10, 10]), cubo(2, 'b', [10, 10, 10], [10 + vao, 0, 0])]);
const sep = (folgaMinima, extra = {}) => ({ separados: [{ par: PARTES, folgaMinima, motivo: MOTIVO, ...extra }] });

describe('lerSeparadosDeclarados: recusas', () => {
  const ler = (separados, partes = PARTES, contatos = []) => {
    const receita = { separados, contatos };
    return lerSeparadosDeclarados(receita, partes, lerContatosDeclarados(receita, partes));
  };

  it("'separados' que não é lista recusa, e null ou ausente valem lista vazia", () => {
    for (const ruim of [{}, 'a', 3, true]) expect(() => ler(ruim)).toThrow(/'separados' precisa ser lista/);
    expect(ler(null).size).toBe(0);
    expect(ler(undefined).size).toBe(0);
    expect(lerSeparadosDeclarados(null, PARTES).size).toBe(0);
  });

  it('item que não é objeto, campo desconhecido e par malformado recusam nomeando o índice', () => {
    for (const ruim of [null, 'x', 3, [['a', 'b']]]) expect(() => ler([ruim])).toThrow('separados[0] precisa ser objeto.');
    expect(() => ler([{ par: PARTES, folgaMinima: 1, motivo: MOTIVO, tolera: 1 }])).toThrow(/campo desconhecido 'tolera'/);
    for (const par of [undefined, 'ab', ['a'], ['a', 'b', 'a'], ['a', ''], ['a', 3]]) {
      expect(() => ler([{ par, folgaMinima: 1, motivo: MOTIVO }])).toThrow(/'par' precisa ser \[nomeA, nomeB\], dois nomes de parte não vazios/);
    }
    expect(() => ler([{ par: ['a', 'a'], folgaMinima: 1, motivo: MOTIVO }])).toThrow("separados[0]: 'par' cita 'a' duas vezes; separação é entre partes diferentes.");
  });

  it('par com parte inexistente recusa nomeando as partes disponíveis', () => {
    expect(() => ler([{ par: ['a', 'z'], folgaMinima: 1, motivo: MOTIVO }])).toThrow("a peça não tem parte 'z'. Partes disponíveis: a, b.");
  });

  it("'folgaMinima' que não é número positivo recusa", () => {
    for (const ruim of [undefined, 0, -0.001, NaN, Infinity, '0.01', null]) {
      expect(() => ler([{ par: PARTES, folgaMinima: ruim, motivo: MOTIVO }])).toThrow(/'folgaMinima' precisa ser um número maior que zero/);
    }
  });

  it("o motivo curto recusa e o par repetido ou também em 'contatos' recusa", () => {
    expect(() => ler([{ par: PARTES, folgaMinima: 1, motivo: 'curto' }])).toThrow(/pelo menos 15 caracteres/);
    expect(() => ler([{ par: PARTES, folgaMinima: 1, motivo: MOTIVO }, { par: ['b', 'a'], folgaMinima: 2, motivo: MOTIVO }])).toThrow("separados[1]: o par 'b' ↔ 'a' já foi declarado em 'separados'.");
    expect(() => ler([{ par: PARTES, folgaMinima: 1, motivo: MOTIVO }], PARTES, [{ par: ['b', 'a'], motivo: MOTIVO }])).toThrow("também está em 'contatos'");
  });

  it('a saída ordena o par e apara o motivo', () => {
    const [d] = ler([{ par: ['b', 'a'], folgaMinima: 0.002, motivo: ` ${MOTIVO} ` }]).values();
    expect(d).toEqual({ par: ['a', 'b'], folgaMinima: 0.002, motivo: MOTIVO });
  });
});

describe('contatosDaPeca: separados medidos pela malha', () => {
  it('sem declaração não mede nada', () => {
    const r = contatosDaPeca(doisCubos(5), {});
    expect(r.separados).toEqual([]);
    expect(r.separadosReprovados).toEqual([]);
  });

  it('passa quando a distância é maior que a folga, e a recusa de contatos vizinha continua a mesma', () => {
    const r = contatosDaPeca(doisCubos(5), sep(3));
    expect(r.separadosReprovados).toEqual([]);
    expect(r.separados[0]).toMatchObject({ ok: true, estado: 'separados', maisLongeQue: 3 });
  });

  it('reprova por folga curta, com a distância medida e a folga pedida', () => {
    const r = contatosDaPeca(doisCubos(2), sep(3));
    expect(r.separadosReprovados).toHaveLength(1);
    expect(r.separadosReprovados[0]).toMatchObject({ ok: false, estado: 'folga-curta', folgaMinima: 3 });
    expect(r.separadosReprovados[0].distancia).toBeCloseTo(2, 6);
  });

  it('o par exatamente na folga passa', () => {
    expect(contatosDaPeca(doisCubos(3), sep(3)).separadosReprovados).toEqual([]);
  });

  it('reprova por toque, sem contar de novo em naoDeclarados', () => {
    const r = contatosDaPeca(doisCubos(0), sep(3));
    expect(r.separadosReprovados[0]).toMatchObject({ estado: 'tocam', distancia: 0 });
    expect(r.naoDeclarados).toEqual([]);
  });

  it('reprova por atravessamento e por contenção', () => {
    expect(contatosDaPeca(doisCubos(-3), sep(3)).separadosReprovados[0].estado).toBe('atravessam');
    const dentro = neutroDe([cubo(1, 'a', [10, 10, 10]), cubo(2, 'b', [2, 2, 2], [4, 4, 4])]);
    expect(contatosDaPeca(dentro, sep(0.5)).separadosReprovados[0].estado).toBe('atravessam');
  });

  it('o par fora de separados que se toca continua reprovando como não declarado', () => {
    const r = contatosDaPeca(doisCubos(0), {});
    expect(r.naoDeclarados).toHaveLength(1);
  });
});

/* A fatia 3 do plano "costuras e furos limpos" inverteu o defeito: o subtrair (e o intersectar) que não muda o sólido avisa (`semEfeito`), e o que muda não avisa. */
import { describe, expect, it } from 'vitest';
import receita, { gerarPassos, TABELA } from './receita.js';
import { medirPeca } from '../medir.mjs';
import { nucleo } from '../../../../procedural/nucleo/nucleo.js';

const m = (mm) => mm / 1000;
const semEfeito = (r) => medirPeca(r).avisos.filter((a) => a === 'semEfeito');
const com = (T) => ({ PASSOS: gerarPassos({ ...TABELA, ...T }), PARAMS: {} });

describe('subtrair que não corta nada', () => {
  it('a peça sai igual ao bloco (6 faces, 8 vértices), sem órfão, e o passo avisa semEfeito', () => {
    const r = medirPeca(receita);
    expect(r.faces).toBe(6);
    expect(r.neutro.V.size).toBe(8);
    expect(r.orfaos).toEqual([]);
    expect(r.avisos).toEqual(['semEfeito']);
    expect(r.neutro.avisos[0]).toMatchObject({ passo: 2, op: 'subtrair', ref: 'semEfeito' });
  });

  it('a ferramenta que entra no bloco corta, e o passo não avisa', () => {
    const r = medirPeca(com({ distancia: 0 }));
    expect(r.faces).toBeGreaterThan(6);
    expect(r.avisos).toEqual([]);
  });

  it('a ferramenta que só encosta na face também não muda o sólido, e avisa', () => {
    expect(semEfeito(com({ distancia: 10 }))).toEqual(['semEfeito']);
  });
});

describe('intersectar que não muda o sólido', () => {
  const passos = (T) => {
    const p = gerarPassos({ ...TABELA, ...T });
    p[2] = ['intersectar', { origemId: 3, solidos: [{ origem: { op: 'cubo', id: 1 } }, { origem: { op: 'cubo', id: 2 } }] }];
    p[3] = ['parte', { nome: 'bloco', sel: { origem: { op: 'intersectar', id: 3 } } }];
    return { PASSOS: p, PARAMS: {} };
  };
  it('a peça inteira dentro do outro sólido: o resultado é a peça, e avisa', () => {
    // o segundo bloco passa a ser maior que o primeiro e o contém
    const p = passos({ ferramenta: 200, distancia: -50 });
    p.PASSOS[1][1].em = [0, 0, 0];
    p.PASSOS[1][1].larg = m(200); p.PASSOS[1][1].alt = m(200); p.PASSOS[1][1].prof = m(200);
    expect(semEfeito(p)).toEqual(['semEfeito']);
  });
  it('a interseção que corta a peça não avisa', () => {
    const p = passos({ ferramenta: 20, distancia: -40 });
    expect(medirPeca(p).avisos).toEqual([]);
  });
});

/* O critério é a topologia (nenhuma face da peça cortada ou consumida, nenhum pedaço novo), e não o volume: o corte pequeno e real não avisa. */
describe('semEfeito pela topologia', () => {
  const sel = (op, id) => ({ origem: { op, id } });
  const cubo = (id, lado, em) => ['cubo', { origemId: id, lado, em }];
  const furo = (id, raio) => ['lathe', { origemId: id, lados: 24, perfil: [[0, 0], [raio, 0], [raio, 2], [0, 2]], em: [0, -0.5, 0] }];
  const avisos = (passos) => nucleo(passos, {}, {}, {}, null, []).avisos.filter((a) => a.ref === 'semEfeito');
  const sub = (...s) => ['subtrair', { origemId: 9, solidos: s }];

  it.each([['furo de 1 mm', 0.0005], ['furo de 0,1 mm', 0.00005]])('o %s atravessando um cubo de 1 m não avisa', (_, raio) => {
    expect(avisos([cubo(1, 1, [0, 0, 0]), furo(2, raio), sub(sel('cubo', 1), sel('lathe', 2))])).toEqual([]);
  });
  it('o entalhe de 5 mm no canto de um cubo de 1 m e o de 2 mm num cubo de 10 m não avisam', () => {
    expect(avisos([cubo(1, 1, [0, 0, 0]), cubo(2, 0.01, [0.5, 0.995, 0.5]), sub(sel('cubo', 1), sel('cubo', 2))])).toEqual([]);
    expect(avisos([cubo(1, 10, [0, 0, 0]), cubo(2, 0.004, [5, 9.998, 5]), sub(sel('cubo', 1), sel('cubo', 2))])).toEqual([]);
  });
  it('a ferramenta só encostada ou longe avisa que não toca, com a mensagem que diz isso', () => {
    for (const x of [1, 5]) {
      const [a] = avisos([cubo(1, 1, [0, 0, 0]), cubo(2, 1, [x, 0, 0]), sub(sel('cubo', 1), sel('cubo', 2))]);
      expect(a.motivo).toMatch(/não toca a peça ou só encosta/);
    }
  });
  it('o corte que some na precisão da grade tem a própria mensagem', () => {
    const [a] = avisos([cubo(1, 1, [0, 0, 0]), ['cubo', { origemId: 2, larg: 0.000001, alt: 2, prof: 2, em: [0, -0.5, 0] }], sub(sel('cubo', 1), sel('cubo', 2))]);
    expect(a.motivo).toMatch(/some na precisão da grade/);
  });
  it('com várias ferramentas o aviso é por ferramenta: a que corta não avisa e a que está longe sim', () => {
    const a = avisos([cubo(1, 1, [0, 0, 0]), cubo(2, 1, [0.5, 0, 0.5]), cubo(3, 1, [-5, 0, 0]), sub(sel('cubo', 1), sel('cubo', 3), sel('cubo', 2))]);
    expect(a.map((x) => x.ferramenta)).toEqual([1]);
  });
});

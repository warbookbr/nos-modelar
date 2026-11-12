/* A fatia 3 do plano "costuras e furos limpos" inverteu o defeito: o subtrair (e o intersectar) que não muda o sólido avisa (`semEfeito`), e o que muda não avisa. */
import { describe, expect, it } from 'vitest';
import receita, { gerarPassos, TABELA } from './receita.js';
import { medirPeca } from '../medir.mjs';

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

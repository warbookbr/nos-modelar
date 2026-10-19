/* A conversão do esboço em passos de receita: as onze cadeiras escolhidas (receitas do externo traduzidas em esboço) convertem sem recusa, e a
   malha que o núcleo executa tem a caixa envolvente do esboço; as formas rotadas, o cilindro deitado e a extrusão girada se reproduzem. */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { caixaDosPassos, passosDoEsboco } from './esboco-para-passos.mjs';
import { receitaParaEsboco } from './receita-externa.mjs';

const PASTA = join(fileURLToPath(new URL('.', import.meta.url)), 'fixtures', 'receita-externa-cadeiras');
const cadeiras = readdirSync(PASTA).filter((f) => f.endsWith('.receita.json')).sort().map((f) => [f.replace('.receita.json', ''), JSON.parse(readFileSync(join(PASTA, f), 'utf8'))]);

function caixaDoEsboco(dados) {
  const mn = [Infinity, Infinity, Infinity]; const mx = [-Infinity, -Infinity, -Infinity];
  for (const f of dados.formas) for (let k = 0; k < 3; k += 1) { mn[k] = Math.min(mn[k], f.geometria.caixa.min[k]); mx[k] = Math.max(mx[k], f.geometria.caixa.max[k]); }
  return { min: mn, max: mx };
}
const igual = (a, b, tol = 0.5) => [0, 1, 2].every((k) => Math.abs(a.min[k] - b.min[k]) <= tol && Math.abs(a.max[k] - b.max[k]) <= tol);

describe('esboço para passos de receita', () => {
  it('tem as onze cadeiras de prova', () => expect(cadeiras).toHaveLength(11));

  it.each(cadeiras)('%s: converte sem recusa e a caixa envolvente da malha é a do esboço', (_nome, receita) => {
    const { esboco } = receitaParaEsboco(receita);
    const { passos, partes, recusas, dados } = passosDoEsboco(esboco);
    expect(recusas).toEqual([]);
    expect(partes).toHaveLength(dados.formas.length);
    expect(new Set(partes).size).toBe(partes.length);
    expect(igual(caixaDosPassos(passos), caixaDoEsboco(dados))).toBe(true);
  });

  const esbocoDe = (formas) => ({ opcoes: [{ titulo: 't', formas }] });

  it('a caixa com chanfro usa chamferBox e a caixa sem chanfro usa cubo', () => {
    const { passos } = passosDoEsboco(esbocoDe([
      { id: 'a', tipo: 'caixa', largura: 100, altura: 40, profundidade: 60, centro: [0, 20, 0], chanfro: 4 },
      { id: 'b', tipo: 'caixa', largura: 50, altura: 20, profundidade: 30, centro: [200, 10, 0] },
    ]));
    expect(passos.map((p) => p[0]).filter((o) => o !== 'parte')).toEqual(['chamferBox', 'cubo']);
  });

  it('a caixa girada, o cilindro deitado e a extrusão girada reproduzem a caixa envolvente do esboço', () => {
    const esboco = esbocoDe([
      { id: 'g', tipo: 'caixa', largura: 200, altura: 50, profundidade: 80, centro: [0, 100, 0], rotacao: [15, 30, 20] },
      { id: 'c', tipo: 'cilindro', diametro: 40, comprimento: 300, eixo: 'x', centro: [500, 50, 0] },
      { id: 'e', tipo: 'extrusao', perfil: [[-50, -20], [60, -20], [60, 30], [0, 60], [-50, 30]], comprimento: 90, eixo: 'z', centro: [900, 60, 0], rotacao: [0, 25, 0] },
    ]);
    const { passos, recusas, dados } = passosDoEsboco(esboco);
    expect(recusas).toEqual([]);
    expect(igual(caixaDosPassos(passos), caixaDoEsboco(dados), 1)).toBe(true);
  });

  it('a forma sem conversão sai em recusas com o motivo', () => {
    const { recusas } = passosDoEsboco(esbocoDe([{ id: 'esf', tipo: 'esfera', diametro: 100, centro: [0, 50, 0] }]));
    expect(recusas).toEqual([{ forma: 'esf', motivo: 'forma esfera ainda não é convertida' }]);
  });
});

describe('ajustes da pessoa sobre as caixas', () => {
  const dados = (formas) => ({ opcoes: [{ titulo: 't', formas }] });
  const base = dados([
    { id: 'a', tipo: 'caixa', largura: 100, altura: 100, profundidade: 100, centro: [0, 50, 0] },
    { id: 'b', tipo: 'caixa', largura: 50, altura: 100, profundidade: 50, centro: [200, 50, 0] },
  ]);
  it('face leva uma face à posição, deslocar move a caixa e remover tira a forma', () => {
    const r = passosDoEsboco(base, { ajustes: [{ forma: 'a', face: { eixo: 'y', lado: 'max', para: 120 } }, { forma: 'b', deslocar: [10, 0, 0] }] });
    const c = caixaDosPassos(r.passos);
    expect(c.max[1]).toBeCloseTo(120, 3);
    expect(c.max[0]).toBeCloseTo(235, 3);
    expect(passosDoEsboco(base, { ajustes: [{ forma: 'b', remover: true }] }).partes).toEqual(['a']);
  });
  it('recusa a forma inexistente, a face inválida e a caixa que perde o volume', () => {
    expect(() => passosDoEsboco(base, { ajustes: [{ forma: 'z', deslocar: [0, 0, 0] }] })).toThrow(/não existe/);
    expect(() => passosDoEsboco(base, { ajustes: [{ forma: 'a', face: { eixo: 'w', lado: 'min', para: 0 } }] })).toThrow(/face inválida/);
    expect(() => passosDoEsboco(base, { ajustes: [{ forma: 'a', face: { eixo: 'y', lado: 'max', para: -5 } }] })).toThrow(/sem volume/);
  });
});

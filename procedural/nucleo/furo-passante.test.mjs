/* furo-passante.test.mjs — o furo passante num corpo de superfície curva subdividida, reto e oblíquo, medido pelas réguas de malha e pela distância da parede ao eixo. */
import { describe, expect, it } from 'vitest';
import { furoPassante, conferirFuroPassante } from './furo-passante.js';
import { corpoDeSecaoVariavel } from './corpo-de-secao-variavel.js';
import { medirPeca } from '../../tools/fixtures/costuras-e-furos/medir.mjs';
import { lascasDoNeutro } from '../../tools/modelar/lasca.mjs';

/* o sólido a furar: um corpo oval subdividido, de superfície curva (o caso em que `subtrair` sozinho deixa faces finas na boca) */
const corpo = corpoDeSecaoVariavel({
  nome: 'h', eixo: 'x', expoente: 2.4,
  estacoes: [{ em: 0, centro: [20, 0], semieixos: [14, 20] }, { em: 60, centro: [20, 3], semieixos: [14, 22] }, { em: 120, centro: [20, 6], semieixos: [12, 18] }],
});
const receitaCom = (opcoes, { lascas = true } = {}) => {
  const furo = furoPassante({ solido: { origem: { op: 'subdivisao', id: 1 } }, comprimento: 80, raio: 2.6, ids: { cilindro: 2, subtrair: 3 }, ...opcoes });
  const passos = [['subdivisao', { origemId: 1, ...corpo.passo, niveis: 2 }], ...furo.passos, ['parte', { nome: 'corpo', sel: { origem: furo.origem } }]];
  return { furo, passos, receita: { PASSOS: lascas ? passos : passos.filter((p) => p[0] !== 'limparLascas'), PARAMS: {}, TOPO: { ...corpo.pontos }, MATERIAIS: {}, ALIASES: furo.aliases } };
};
/* a distância de um ponto, em mm, à reta por `c` com a direção unitária `d` */
const aoEixo = (p, c, d) => {
  const v = p.map((x, k) => x * 1000 - c[k]);
  const t = v[0] * d[0] + v[1] * d[1] + v[2] * d[2];
  return Math.hypot(...v.map((x, k) => x - t * d[k]));
};

describe('furoPassante', () => {
  const eixo = receitaCom({ posicao: [17, 20, -1], direcao: 'y', lados: 16 });
  const m = medirPeca(eixo.receita);

  it('o furo passa dos dois lados da superfície curva e a malha fecha, sem face degenerada nem face fina', () => {
    expect(m.orfaos).toEqual([]);
    expect(m.arestasSoltas).toBe(0);
    expect(m.facesDegeneradas).toBe(0);
    expect(lascasDoNeutro(m.neutro, { passos: eixo.passos })).toEqual([]);
    const parede = [...m.neutro.V.values()].filter((p) => Math.abs(aoEixo(p, [17, 20, -1], [0, 1, 0]) - 2.6) < 1e-6 * 1000);
    expect(parede.length).toBeGreaterThanOrEqual(16 * 2);
    const ys = parede.map((p) => p[1] * 1000);
    expect(Math.min(...ys)).toBeLessThan(20 - 5);
    expect(Math.max(...ys)).toBeGreaterThan(20 + 5);
  });

  it('a limpeza das lascas é o que tira as faces finas da boca', () => {
    const sem = medirPeca(receitaCom({ posicao: [17, 20, -1], direcao: 'y', lados: 16 }, { lascas: false }).receita);
    const antes = lascasDoNeutro(sem.neutro).length;
    expect(antes).toBeGreaterThan(0);
    expect(m.faces).toBeLessThan(sem.faces);
  });

  it('o furo oblíquo tem o eixo na direção pedida', () => {
    const d = [0.3, 1, 0.4]; const n = Math.hypot(...d); const u = d.map((x) => x / n);
    const r = receitaCom({ posicao: [17, 20, -1], direcao: d, lados: 16 });
    const o = medirPeca(r.receita);
    expect(o.arestasSoltas).toBe(0);
    expect(o.facesDegeneradas).toBe(0);
    expect(lascasDoNeutro(o.neutro, { passos: r.passos })).toEqual([]);
    const parede = [...o.neutro.V.values()].filter((p) => Math.abs(aoEixo(p, [17, 20, -1], u) - 2.6) < 1e-6 * 1000);
    expect(parede.length).toBeGreaterThanOrEqual(16 * 2);
  });

  it('é determinístico e usa o eixo z e o x quando a direção os nomeia por vetor', () => {
    expect(JSON.stringify(receitaCom({ posicao: [17, 20, -1], direcao: 'y' }).passos)).toBe(JSON.stringify(eixo.passos));
    const z = receitaCom({ posicao: [17, 20, -1], direcao: [0, 0, -2] }).passos[1];
    expect(z[0]).toBe('cilindro');
    expect(z[1]).toMatchObject({ eixo: 'z', em: [0.017, 0.02, -0.041] });
  });

  it('o furo que atravessa tem duas bocas e um corpo, sem aviso; o oblíquo também', () => {
    const c = conferirFuroPassante(m.neutro, eixo.furo);
    expect(c).toMatchObject({ bocas: 2, componentes: 1, avisos: [] });
    expect(c.paredes).toBeGreaterThanOrEqual(16);
    const d = [0.3, 1, 0.4];
    const r = receitaCom({ posicao: [17, 20, -1], direcao: d, lados: 16 });
    expect(conferirFuroPassante(medirPeca(r.receita).neutro, r.furo)).toMatchObject({ bocas: 2, componentes: 1, avisos: [] });
  });

  it('avisa o furo que não atravessa (ferramenta toda dentro) e o que não toca o sólido', () => {
    const dentro = receitaCom({ posicao: [17, 20, -1], direcao: 'y', comprimento: 12 });
    const c = conferirFuroPassante(medirPeca(dentro.receita).neutro, dentro.furo);
    expect(c.bocas).toBe(0);
    expect(c.avisos.join(' ')).toMatch(/cavidade fechada|não deixou parede/);
    const fora = receitaCom({ posicao: [17, 20, 200], direcao: 'y' });
    const f = conferirFuroPassante(medirPeca(fora.receita).neutro, fora.furo);
    expect(f.paredes).toBe(0);
    expect(f.avisos.join(' ')).toMatch(/não deixou parede/);
  });

  it('diz a causa certa: ranhura na lateral, furo cego, cavidade fechada sem a mensagem de sólido partido, parte inexistente', () => {
    const avisos = (opcoes, extra) => { const r = receitaCom(opcoes); return conferirFuroPassante(medirPeca(r.receita).neutro, r.furo, extra).avisos.join(' | '); };
    expect(avisos({ posicao: [60, 33, 3], direcao: 'z' })).toMatch(/só raspa o sólido: uma ranhura aberta na lateral/);
    expect(avisos({ posicao: [60, 33, 3], direcao: 'z' })).not.toMatch(/cego/);
    expect(avisos({ posicao: [0, 20, 0], direcao: 'x', comprimento: 30 })).toMatch(/furo cego: a ponta do cilindro ficou dentro/);
    const cavidade = avisos({ posicao: [17, 20, -1], direcao: 'y', comprimento: 12 });
    expect(cavidade).toMatch(/cavidade fechada/);
    expect(cavidade).not.toMatch(/corpos/);
    expect(avisos({ posicao: [17, 20, -1], direcao: 'y' }, { parte: 'nao-existe' })).toMatch(/a parte "nao-existe" não tem face nenhuma/);
    expect(avisos({ posicao: [17, 20, -1], direcao: 'y' }, { parte: 'corpo' })).toBe('');
  });

  it('avisa o furo que parte o sólido em mais corpos do que ele tinha', () => {
    const parte = receitaCom({ posicao: [60, 20, 0], direcao: 'z', raio: 30, comprimento: 120, lados: 16 });
    const c = conferirFuroPassante(medirPeca(parte.receita).neutro, parte.furo);
    expect(c.componentes).toBeGreaterThan(1);
    expect(c.avisos.join(' ')).toMatch(/corpos/);
  });

  it('recusa a tolerância maior que o limite de cima, dizendo qual é', () => {
    const base = { solido: { origem: { op: 'subdivisao', id: 1 } }, posicao: [0, 0, 0], direcao: 'y', raio: 3, comprimento: 80, ids: { cilindro: 2, subtrair: 3 } };
    expect(() => furoPassante({ ...base, tolerancia: 5 })).toThrow(/no máximo 0,5/);
    expect(() => furoPassante({ ...base, tolerancia: 0.6 })).toThrow(/no máximo 0,5/);
    expect(() => furoPassante({ ...base, raio: 1, tolerancia: 0.3 })).toThrow(/no máximo 0,2/);
    expect(furoPassante({ ...base, tolerancia: 0.5 }).passos.at(-1)[1].tolerancia).toBe(0.0005);
  });

  it('recusa o que não define um furo, com o valor', () => {
    const base = { solido: { origem: { op: 'subdivisao', id: 1 } }, posicao: [0, 0, 0], direcao: 'y', raio: 3, comprimento: 80, ids: { cilindro: 2, subtrair: 3 } };
    expect(() => furoPassante({ ...base, raio: 0 })).toThrow(/raio é número positivo/);
    expect(() => furoPassante({ ...base, direcao: [0, 0, 0] })).toThrow(/não nulo/);
    expect(() => furoPassante({ ...base, direcao: 'w' })).toThrow(/direcao é/);
    expect(() => furoPassante({ ...base, ids: { cilindro: 2, subtrair: 2 } })).toThrow(/dois inteiros diferentes/);
    expect(() => furoPassante({ ...base, lados: 2 })).toThrow(/lados é inteiro/);
    expect(() => furoPassante({ ...base, solido: null })).toThrow(/solido é a seleção/);
  });
});

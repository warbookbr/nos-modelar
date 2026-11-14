import { describe, expect, it } from 'vitest';
import { analiseDoAcervo, analiseEstatica, medirExecucao, perfilarReceita, principal } from './perfil-da-execucao.mjs';

const o = (op, id) => ({ origem: { op, id } });
const receita = {
  PASSOS: [
    ['cubo', { origemId: 1, lado: 1 }],
    ['cubo', { origemId: 2, lado: 0.5, em: [0.5, 0.5, 0.5] }],
    ['cubo', { origemId: 3, lado: 0.2, em: [0.2, 0.2, 0.2] }],
    ['subtrair', { origemId: 10, solidos: [o('cubo', 1), o('cubo', 2)] }],
    ['subtrair', { origemId: 11, solidos: [o('subtrair', 10), o('cubo', 3)] }],
  ],
};

describe('perfil da execução', () => {
  it('mede a execução, o perfil e o grafo sem mudar a malha', async () => {
    const sem = medirExecucao(receita);
    const r = await perfilarReceita(receita, { topo: 3 });
    expect(r.faces).toBe(sem.faces);
    expect(r.cronometrado).toBe(true);
    expect(r.perfil.passos).toBe(5);
    expect(r.perfil.maisCaros).toHaveLength(3);
    expect(r.perfil.porOperacao.map((x) => x.op).sort()).toEqual(['cubo', 'subtrair']);
    expect(r.grafo.totais).toMatchObject({ passos: 5, criadoras: 3, leMalha: 2, leituraDeclarada: 0, barreiras: 2 });
    expect(r.estritas).toHaveLength(1);
    expect(r.estritas[0].ms).toBeGreaterThan(0);
  });

  it('a análise estática não executa nada e é a mesma a cada vez', () => {
    expect(analiseEstatica(receita)).toEqual(analiseEstatica(receita));
  });

  it('o acervo carrega cada peça de passos e conta as sequências', async () => {
    const linhas = await analiseDoAcervo();
    expect(linhas.length).toBeGreaterThan(40);
    expect(linhas.find((p) => p.peca === 'kukri')).toMatchObject({ totais: { leituraDeclarada: 0 } });
  });

  it('recusa argumento desconhecido e pede a peça', async () => {
    const saidas = [];
    const escrever = (t) => saidas.push(t);
    expect(await principal(['--executr'], { escrever })).toBe(2);
    expect(await principal([], { escrever })).toBe(2);
    expect(saidas.join('\n')).toMatch(/--executar/);
  });
});

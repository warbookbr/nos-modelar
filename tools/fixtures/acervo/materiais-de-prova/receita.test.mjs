/* receita.test.mjs — a peça de prova dos materiais declara os seis materiais do plano, passa pelo normalizador e abre na bancada. */
import { describe, expect, it } from 'vitest';
import receita, { MATERIAIS, TABELA, gerarPassos } from './receita.js';
import { executarReceita } from '../../../../src/autoria/executar-receita.js';
import { adaptarThree } from '../../../../src/autoria/adaptar-three.js';
import { descreverPeca } from '../../../../src/autoria/descrever-partes.js';
import { normalizarMateriais } from '../../../../src/autoria/material-da-receita.js';
import { listarAcervo, listarParaBancada } from '../../../../src/bancada/acervo-receitas.js';

const malha = () => executarReceita(receita).neutro;
/* o anteparo é a barra escura atrás do vidro, no mesmo x dele: fica fora da fila das seis peças */
const ANTEPARO = 'anteparoDoVidro';
const PARTES = ['placaDeTinta', 'placaDeVidro', 'calotaEspelhada', 'discoDeAcoPintado', 'pneuDeBorracha', 'blocoDePlastico'];

describe('peça de prova dos materiais', () => {
  it('declara os seis materiais do plano e o do anteparo do vidro, e o normalizador os aceita', () => {
    expect(Object.keys(MATERIAIS).sort()).toEqual(
      ['acoPintado', 'anteparoDoVidro', 'borrachaComRelevo', 'metalEspelhado', 'plasticoGranulado', 'tintaComVerniz', 'vidro'],
    );
    const n = normalizarMateriais(MATERIAIS);
    expect(n.tintaComVerniz.verniz).toBe(1);
    expect(n.vidro).toMatchObject({ transmissao: 1, indiceDeRefracao: 1.5, tomDoVidro: '#a8cdbd', mistura: 'transparente' });
    expect(n.metalEspelhado).toMatchObject({ metalicidade: 1, aspereza: 0.04 });
    expect(n.acoPintado.verniz).toBeGreaterThan(0);
    expect(n.borrachaComRelevo.relevo.tipo).toBe('bandaDeRodagem');
    expect(n.plasticoGranulado.relevo.tipo).toBe('granulado');
  });

  it('entrega as seis partes e o anteparo, cada uma com seu material, sem órfão nem face sem parte', () => {
    const neutro = malha();
    expect(neutro.orfaos ?? []).toEqual([]);
    const descricao = descreverPeca(neutro);
    expect(descricao.partes.map((p) => p.nome).sort()).toEqual([...PARTES, ANTEPARO].sort());
    expect(descricao.totais.facesSemParte).toBe(0);
    expect(descricao.aparencia.materiais.map((m) => m.nome).sort()).toEqual(Object.keys(MATERIAIS).sort());
  });

  it('a cena traz uma malha por material, sem fundir materiais diferentes', () => {
    const { partes } = adaptarThree(malha(), { materiais: MATERIAIS });
    expect([...partes.keys()].sort()).toEqual([...PARTES, ANTEPARO].sort());
    const cores = [...partes.values()].map((g) => g.children[0].material.color.getHexString());
    expect(new Set(cores).size).toBe(7);
  });

  it('é determinística: duas execuções dão a mesma malha', () => {
    const a = malha();
    const b = malha();
    expect(a.V.size).toBe(b.V.size);
    expect(a.F.size).toBe(b.F.size);
    for (const [id, p] of a.V) expect(b.V.get(id)).toEqual(p);
    expect(JSON.stringify(gerarPassos(TABELA))).toBe(JSON.stringify(gerarPassos(TABELA)));
  });

  it('assenta no chão e mantém as seis peças separadas em x', () => {
    const neutro = malha();
    const caixa = new Map();
    for (const f of neutro.F.values()) for (const v of f.vs) {
      const p = neutro.V.get(v);
      const c = caixa.get(f.parte) ?? { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
      for (let i = 0; i < 3; i++) { c.min[i] = Math.min(c.min[i], p[i]); c.max[i] = Math.max(c.max[i], p[i]); }
      caixa.set(f.parte, c);
    }
    for (const nome of PARTES) expect(caixa.get(nome).min[1], nome).toBeCloseTo(0, 6);
    const porX = PARTES.map((n) => caixa.get(n)).sort((a, b) => a.min[0] - b.min[0]);
    for (let i = 1; i < porX.length; i++) expect(porX[i].min[0]).toBeGreaterThan(porX[i - 1].max[0]);
  });

  it('a bancada a lista como ensaio e a abre pelo caminho de ENSAIOS, fora do acervo', async () => {
    const entrada = listarParaBancada().find((e) => e.id === 'materiais-de-prova');
    expect(entrada).toBeDefined();
    expect(entrada.ensaio).toBe(true);
    expect(listarAcervo().some((e) => e.id === 'materiais-de-prova')).toBe(false);
    const aberta = await entrada.carregar();
    expect(Array.isArray(aberta.PASSOS)).toBe(true);
    expect(aberta.MATERIAIS).toBe(MATERIAIS);
  });
});

/* receita.test.mjs — a carenagem de prova da superfície por subdivisão: a receita só endereça a gaiola por nome, cada
   cota medida da TABELA é vértice da malha (gate 2 do plano da carroceria por subdivisão), o sólido sai fechado com o
   volume igual à área externa vezes a espessura (gate 4), a gaiola adensa só perto do vinco, e os pontos da gaiola, que
   moram em TOPO, seguem a TABELA quando ela muda. */
import { describe, expect, it } from 'vitest';
import receita, { derivar, gerarPassos, TABELA } from './receita.js';
import { enderecosPorIndice } from '../../nucleo/operacoes/subdivisao.js';
import { neutroCanonico, nucleo } from '../../nucleo/entrada.js';
import { area, volume } from '../../nucleo/fixtures/medidas-de-malha.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { receitaComParametros } from '../../../src/autoria/parametros-vivos.js';
import { analisarTopologia } from '../../../modulos/topologia/src/analisar.js';

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const malha = (neutro) => {
  const ids = [...neutro.V.keys()]; const indice = new Map(ids.map((id, k) => [id, k]));
  return { vertices: ids.map((id) => neutro.V.get(id)), faces: [...neutro.F.values()].map((f) => f.vs.map((v) => indice.get(v))) };
};
const passoDaSubdivisao = (passos) => passos.find(([op]) => op === 'subdivisao')[1];

describe('carenagem de prova', () => {
  const { neutro } = executarReceita(receita);
  const M = malha(neutro);

  it('a receita só endereça a gaiola por nome, sem índice de vértice, face, vinco, canto ou medida', () => {
    const passo = passoDaSubdivisao(receita.PASSOS);
    expect(enderecosPorIndice(passo)).toEqual([]);
    expect(JSON.stringify([passo.vertices, passo.faces, passo.vincos.map((v) => v.pontos), passo.cantos, passo.medidas])).not.toMatch(/[[,]-?\d/);
    expect(passo.vincos.map((v) => [v.nome, v.nitidez])).toEqual([['linhaDeCintura', 'viva'], ['ombro', TABELA.ombro_nitidez]]);
  });

  it('a gaiola adensa só perto do vinco, com pentágonos e triângulos na transição', () => {
    const { passo } = derivar(TABELA);
    const lados = {};
    for (const f of passo.faces) lados[f.length] = (lados[f.length] ?? 0) + 1;
    expect(passo.vertices).toHaveLength(433);
    expect(lados).toEqual({ 3: 6, 4: 370, 5: 6 });
    expect(neutro.orfaos).toEqual([]);
    expect(M.vertices).toHaveLength(24990);
  });

  it('cada cota medida da TABELA é vértice da malha a menos de 1e-6 m, e a imagem espelhada também', () => {
    const { cotas, passo } = derivar(TABELA);
    expect(Object.keys(cotas).sort()).toEqual([...passo.medidas].sort());
    expect(cotas.meio_centro[1]).toBe(TABELA.teto_altura);
    expect(cotas.meio_ombro[1]).toBe(TABELA.ombro_altura);
    expect(cotas.meio_soleira).toEqual([TABELA.soleira_meia_largura, TABELA.borda_altura, TABELA.comprimento / 2]);
    expect(cotas.arcoTopo_soleira[1]).toBe(TABELA.borda_altura + TABELA.arco_altura);
    for (const cota of Object.values(cotas)) {
      const p = cota.map((x) => x / 1000);
      const imagem = [-p[0], p[1], p[2]];
      expect(Math.min(...M.vertices.map((v) => dist(v, p)))).toBeLessThan(1e-6);
      expect(Math.min(...M.vertices.map((v) => dist(v, imagem)))).toBeLessThan(1e-6);
    }
  });

  it('sai fechada, sem achado de topologia, com volume igual à área externa vezes a espessura a 2%', () => {
    const topologia = analisarTopologia({ vertices: neutro.V, faces: neutro.F });
    expect(topologia.veredito).toBe('aprova');
    expect(topologia.resumo.bordas).toBe(0);
    expect(topologia.resumo.componentes).toBe(1);
    const semEspessura = receita.PASSOS.map(([op, a]) => {
      if (op !== 'subdivisao') return [op, a];
      const { espessura, ...resto } = a;
      return [op, resto];
    });
    const S = malha(nucleo(semEspessura, receita.PARAMS, receita.TOPO));
    const A = area(S.vertices, S.faces); const V = volume(M.vertices, M.faces);
    expect(A).toBeGreaterThan(6.3);
    expect(Math.abs(V / (A * TABELA.espessura / 1000) - 1)).toBeLessThan(0.02);
  });

  it('a mesma receita dá a mesma malha, e os pontos da gaiola seguem a TABELA que muda', () => {
    expect(JSON.stringify(neutroCanonico(executarReceita(receita).neutro))).toBe(JSON.stringify(neutroCanonico(neutro)));
    const maisLonga = receitaComParametros(receita, { ...TABELA, comprimento: 2500 });
    const zs = [...executarReceita(maisLonga).neutro.V.values()].map((p) => p[2]);
    expect(Math.max(...zs)).toBeCloseTo(2.5, 9);
    expect(passoDaSubdivisao(maisLonga.PASSOS).medidas).toEqual(passoDaSubdivisao(receita.PASSOS).medidas);
  });

  it('a cintura fora da faixa das colunas finas e duas cotas na mesma estação gritam com os nomes', () => {
    expect(() => gerarPassos({ ...TABELA, cintura_altura: 700 })).toThrow(/cintura_altura 700 não deixa cinco colunas finas abaixo da cintura e três acima dela \(a cintura vai de 318\.75 a 668\.75 mm\)/);
    expect(() => gerarPassos({ ...TABELA, comprimento: 2600 })).toThrow(/as estações 'meio' e 'vaoInicio' caem na mesma posição, z 1300 mm/);
  });
});

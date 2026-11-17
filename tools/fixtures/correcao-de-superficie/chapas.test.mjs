/* chapas.test.mjs — as chapas de prova do plano das ferramentas de correção de superfície: cada uma monta sem órfão, com a forma e o defeito
 * declarados em `chapas.mjs`, e a chapa simétrica prova a fatia 2 (o vão nos dois lados e a costura em x 0 exato). */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { manifoldCarregada } from '../../../procedural/nucleo/manifold.js';
import { arestasSemPar, vinculosNaoManifold } from '../../oficina/conferir-malha';
import { AMPLITUDE_DO_RUIDO_MM, CHAPAS_DE_PROVA, EMENDAS, RUIDO, painel, pontoDaEmenda, receitaDeProva } from './chapas.mjs';

const rodar = (nome) => { const receita = receitaDeProva(nome); return { receita, neutro: executarReceita(receita).neutro }; };

describe.skipIf(!manifoldCarregada())('as chapas de prova da correção de superfície', () => {
  it('cada chapa monta sem órfão', () => {
    for (const nome of CHAPAS_DE_PROVA) expect(rodar(nome).neutro.orfaos, nome).toEqual([]);
  });

  it('a rede com ruído: o ruído declarado é o que separa as curvas das da rede sem ruído, e os nós ficam na superfície', () => {
    const com = receitaDeProva('rede-com-ruido').REDE; const sem = receitaDeProva('rede-sem-ruido').REDE;
    const todos = Object.values(RUIDO).flat();
    expect(Math.max(...todos.map(Math.abs))).toBeLessThanOrEqual(AMPLITUDE_DO_RUIDO_MM);
    expect(todos.filter((r) => r !== 0).length).toBe(36);
    for (const no of ['N00', 'N11', 'M', 'N22']) {
      const p = com.pontos[no].map((c) => c * 1000);
      expect(p[1]).toBeCloseTo(painel(p[0], p[2]), 9);
      expect(com.pontos[no]).toEqual(sem.pontos[no]);
    }
    expect(com.extraordinarios).toEqual([{ ponto: 'D.centro', valencia: 5, borda: false, retalho: 'D' }]);
  });

  it('as emendas: os pontos dos dois lados vêm da superfície declarada, e a G0 tem a curva da emenda em vinco', () => {
    for (const nome of Object.keys(EMENDAS)) {
      const g = receitaDeProva(nome).REDE;
      const p = g.pontos.B.map((c) => c * 1000);
      expect(p).toEqual(pontoDaEmenda(nome, 300, 0).map((c) => Math.round(c * 1e6) / 1e6).map((c) => expect.closeTo(c, 6)));
    }
    expect(receitaDeProva('emenda-g0').REDE.passo.vincos.map((v) => v.nome)).toContain('emenda');
  });

  it('a chapa simétrica sem as opções: o vão só no lado +x e a costura a menos de 1e-6 de x 0 sem ser 0; com elas, os dois lados e o plano exato', () => {
    const lados = (n) => n.aberturas.map((a) => Math.sign(n.V.get(a.borda.fora[0])[0]));
    const costura = (n) => { let z = 0, q = 0; for (const p of n.V.values()) { if (p[0] === 0) z++; else if (Math.abs(p[0]) < 1e-6) q++; } return [z, q]; };
    const antes = rodar('chapa-simetrica').neutro; const depois = rodar('chapa-simetrica-espelhada').neutro;
    expect(lados(antes)).toEqual([1]);
    expect(lados(depois)).toEqual([1, -1]);
    expect(costura(antes)[1]).toBeGreaterThan(100);
    expect(costura(depois)).toEqual([costura(antes)[0] + costura(antes)[1], 0]);
    expect(arestasSemPar(depois)).toHaveLength(0);
    expect(vinculosNaoManifold(depois)).toHaveLength(0);
  });
});

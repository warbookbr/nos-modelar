/* porta-confere-forma.test.js — a porta no lugar passa, a porta deslocada do
   plano e a de raio errado reprovam, e as portas das partes fixas do braço
   passam. */
import { describe, expect, it } from 'vitest';
import { nucleo } from '../../procedural/nucleo/nucleo.js';
import { conferirPortasNaForma } from './porta-confere-forma.js';

const cilindro = (interfaceDaPorta) => [
  ['lathe', { origemId: 1, lados: 24, perfil: [[0, 0], [0.05, 0], [0.05, 0.03], [0, 0.03]] }],
  ['publicarPorta', { nome: 'topo', de: { op: 'lathe', id: 1 }, interface: interfaceDaPorta }],
];
const anel = (y, raio) => ({ forma: 'anel', papel: 'recebe', eixo: [0, 1, 0], centro: [0, y, 0], raioInterno: 0, raioExterno: raio, inicio: -0.005, fim: 0 });
const codigos = (passos) => {
  const n = nucleo(passos, {}, {}, {}, null, []);
  expect(n.orfaos).toEqual([]);
  return conferirPortasNaForma(n).map((a) => a.codigo);
};

describe('a porta confere com a forma', () => {
  it('passa com a porta na face e no raio', () => {
    expect(codigos(cilindro(anel(0.03, 0.05)))).toEqual([]);
  });

  it('reprova a porta 3 mm fora do plano da face', () => {
    expect(codigos(cilindro(anel(0.033, 0.05)))).toEqual(['porta-fora-do-plano']);
  });

  it('reprova a porta com raio 2 mm maior que a peça', () => {
    expect(codigos(cilindro(anel(0.03, 0.052)))).toEqual(['porta-com-raio-errado']);
  });

  it('as portas das partes fixas do braço passam', async () => {
    for (const parte of ['base', 'anel-cintura', 'ombro']) {
      const receita = (await import(`../../procedural/pecas/braco-robotico/partes/${parte}/receita.js`)).default;
      const n = nucleo(receita.PASSOS, receita.PARAMS, {}, {}, null, []);
      expect(conferirPortasNaForma(n), parte).toEqual([]);
    }
  });
});

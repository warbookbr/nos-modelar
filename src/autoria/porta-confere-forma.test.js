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

  it('a face que uma booleana parte continua inteira para a porta: o pedaço novo entra nas faces dela, com a parte da face', () => {
    /* um friso de 2 cm abre a face da frente do cubo em duas; a face fica com o id no pedaço maior (empate: o primeiro) e o outro
       pedaço ganha id novo, que a origem do cubo não cita */
    const passos = [
      ['cubo', { origemId: 1, larg: 0.1, alt: 0.1, prof: 0.1 }],
      ['cubo', { origemId: 2, larg: 0.02, alt: 0.2, prof: 0.06, em: [0, -0.05, 0.05] }],
      ['parte', { nome: 'caixa', sel: { origem: { op: 'cubo', id: 1 } } }],
      ['subtrair', { origemId: 3, solidos: [{ origem: { op: 'cubo', id: 1 } }, { origem: { op: 'cubo', id: 2 } }] }],
      ['publicarPorta', { id: 'frente', de: { op: 'cubo', id: 1, face: 'frente' }, interface: { forma: 'plano', papel: 'apoia', ponto: [0, 0.05, 0.05], normal: [0, 0, 1], extensao: [0.1, 0.1] } }],
    ];
    const n = nucleo(passos, {}, {}, {}, null, []);
    expect(n.orfaos).toEqual([]);
    const daFrente = n.facesDasPortas.get('frente');
    expect(daFrente).toHaveLength(2);
    for (const f of daFrente) {
      expect(n.F.get(f).parte).toBe('caixa');
      expect(n.F.get(f).vs.every((v) => Math.abs(n.V.get(v)[2] - 0.05) < 1e-9)).toBe(true);
    }
    expect(conferirPortasNaForma(n)).toEqual([]);
  });

  it('as portas das partes fixas do braço passam', async () => {
    for (const parte of ['base', 'anel-cintura', 'ombro']) {
      const receita = (await import(`../../procedural/pecas/braco-robotico/partes/${parte}/receita.js`)).default;
      const n = nucleo(receita.PASSOS, receita.PARAMS, {}, {}, null, []);
      expect(conferirPortasNaForma(n), parte).toEqual([]);
    }
  });
});

/* portas-espelho-arranja.test.ts — prova adversarial de AUT-2026-15: uma
   interface não pode permanecer no espaço da fonte quando a sua geometria foi
   copiada. Cobre cópia radial, linear, espelho e a recusa antes de medir/posar. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';
// @ts-expect-error — módulo de autoria em JavaScript, exercitado pela API pública.
import { resolverPortasDeMontagem, validarEncaixeCilindrico, avaliarEstadoDeEncaixeCilindrico, derivarPreviaDeEncaixeCilindrico } from '../../src/autoria/interfaces-montagem.js';

const FONTE = { op: 'cubo', id: 101 };
const INTERFACE_EXTERNA = {
  forma: 'cilindro', papel: 'externa', eixo: [1, 0, 0], referencia: [0, 1, 0],
  centro: [1, 0, 0], raio: 0.1, inicio: -0.2, fim: 0.2,
};
const INTERFACE_INTERNA = { ...INTERFACE_EXTERNA, papel: 'interna' };

const receitaRadial = () => {
  const arranjo = { op: 'arranja', id: 102, de: FONTE };
  return [
    ['cubo', { id: 0, lado: 1, origemId: 101 }],
    ['arranja', { modo: 'radial', eixo: 'y', total: 4, volta: 360, origemId: 102, derivaDe: FONTE, sel: { origem: FONTE } }],
    ['publicarPorta', { id: 'bracoPrimeiro', rotulo: 'Braço radial inicial', de: { ...arranjo, copia: 'primeira' }, interface: INTERFACE_EXTERNA }],
    ['publicarPorta', { id: 'bracoUltimo', rotulo: 'Braço radial final', de: { ...arranjo, copia: 'ultima' }, interface: INTERFACE_EXTERNA }],
  ] as any;
};

describe('portas sob arranja — AUT-2026-15', () => {
  it('transporta quadro radial por cópia sem reutilizar a chave nem depender de ordem de array', () => {
    const uma = nucleo(receitaRadial());
    const outra = nucleo(receitaRadial());
    expect(uma.orfaos).toHaveLength(0);
    expect([...uma.portas.keys()]).toEqual(['bracoPrimeiro', 'bracoUltimo']);
    expect(JSON.stringify([...uma.portas])).toBe(JSON.stringify([...outra.portas]));
    expect(uma.portas.get('bracoPrimeiro')).toMatchObject({
      id: 'bracoPrimeiro',
      de: { op: 'arranja', id: 102, copia: 'primeira' },
      interface: { eixo: [0, 0, -1], referencia: [0, 1, 0], centro: [0, 0, -1] },
    });
    expect(uma.portas.get('bracoUltimo')).toMatchObject({
      id: 'bracoUltimo',
      de: { op: 'arranja', id: 102, copia: 'ultima' },
      interface: { eixo: [0, 0, 1], referencia: [0, 1, 0], centro: [0, 0, 1] },
    });
    const portas = resolverPortasDeMontagem([{ id: 'suporte', neutro: uma }]);
    expect(portas.get('suporte.bracoPrimeiro')).toMatchObject({ id: 'suporte.bracoPrimeiro', centro: [0, 0, -1] });
    expect(portas.get('suporte.bracoUltimo')).toMatchObject({ id: 'suporte.bracoUltimo', centro: [0, 0, 1] });
  });

  it('recusa interface em uma coleção de cópias: uma porta só pode ter um quadro efetivo', () => {
    const n = nucleo([
      ['cubo', { id: 0, lado: 1, origemId: 101 }],
      ['arranja', { modo: 'linear', d: [2, 0, 0], total: 3, origemId: 102, derivaDe: FONTE, sel: { origem: FONTE } }],
      ['publicarPorta', { id: 'colecaoAmbigua', de: { op: 'arranja', id: 102, de: FONTE }, interface: INTERFACE_EXTERNA }],
    ] as any);
    expect(n.portas.size).toBe(0);
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/exige copia única/);
  });

  it('transporta centro sob arranja linear pela identidade declarada da cópia', () => {
    const n = nucleo([
      ['cubo', { id: 0, lado: 1, origemId: 101 }],
      ['arranja', { modo: 'linear', d: [2, 0, 0], total: 3, origemId: 102, derivaDe: FONTE, sel: { origem: FONTE } }],
      ['publicarPorta', { id: 'segundaLinear', de: { op: 'arranja', id: 102, de: FONTE, copia: 'ultima' }, interface: INTERFACE_EXTERNA }],
    ] as any);
    expect(n.orfaos).toHaveLength(0);
    expect(n.portas.get('segundaLinear')?.interface).toMatchObject({ centro: [5, 0, 0], eixo: [1, 0, 0] });
  });
});

describe('portas sob espelho — AUT-2026-15', () => {
  it('compõe derivação espelhada e arranjo sem voltar a coordenada da fonte', () => {
    const espelhada = { op: 'espelha', id: 202, de: FONTE };
    const fileira = { op: 'arranja', id: 203, de: espelhada };
    const n = nucleo([
      ['cubo', { id: 0, lado: 1, origemId: 101 }],
      ['espelha', { eixo: 'x', pos: 0, origemId: 202, derivaDe: FONTE, sel: { origem: FONTE } }],
      ['arranja', { modo: 'linear', d: [0, 2, 0], total: 2, origemId: 203, derivaDe: espelhada, sel: { origem: espelhada } }],
      ['publicarPorta', { id: 'espelhoEmLinha', de: { ...fileira, copia: 'primeira' }, interface: INTERFACE_EXTERNA }],
    ] as any);
    expect(n.orfaos).toHaveLength(0);
    expect(n.portas.get('espelhoEmLinha')?.interface).toMatchObject({
      centro: [-1, 2, 0], eixo: [-1, 0, 0], referencia: [0, 1, 0], mao: 'espelhada',
    });
  });

  it('marca a mão espelhada e recusa medida e prévia antes de calcular', () => {
    const espelhada = { op: 'espelha', id: 202, de: FONTE };
    const neutro = nucleo([
      ['cubo', { id: 0, lado: 1, origemId: 101 }],
      ['espelha', { eixo: 'x', pos: 3, origemId: 202, derivaDe: FONTE, sel: { origem: FONTE } }],
      ['publicarPorta', { id: 'pilotoDireto', de: FONTE, interface: INTERFACE_EXTERNA }],
      ['publicarPorta', { id: 'cavidadeEspelhada', de: espelhada, interface: INTERFACE_INTERNA }],
    ] as any);
    expect(neutro.orfaos).toHaveLength(0);
    expect(neutro.portas.get('cavidadeEspelhada')?.interface).toMatchObject({
      centro: [5, 0, 0], eixo: [-1, 0, 0], referencia: [0, 1, 0], mao: 'espelhada',
    });
    const portas = resolverPortasDeMontagem([{ id: 'peca', neutro }]);
    const relacao = {
      id: 'naoMedirEspelho', tipo: 'encaixaCilindrico',
      referencia: 'peca.pilotoDireto', movel: 'peca.cavidadeEspelhada',
      folgaRadial: { min: 0, max: 1 }, tolerancia: 1,
      poseCanonica: { referenciaAxial: 'centro', movelAxial: 'centro', giro: 0 },
    };
    const medida = validarEncaixeCilindrico(relacao, portas);
    expect(medida.medidas.disponiveis).toBe(false);
    expect(medida.diagnosticos).toMatchObject([{ codigo: 'mao-espelhada', observado: ['peca.cavidadeEspelhada'] }]);
    expect(avaliarEstadoDeEncaixeCilindrico(relacao, portas)).toMatchObject({ estado: 'impossivel' });
    expect(derivarPreviaDeEncaixeCilindrico(relacao, portas)).toMatchObject({ aplicavel: false, diagnosticos: [{ codigo: 'mao-espelhada' }] });
  });
});

import { describe, expect, it } from 'vitest';
// @ts-expect-error — módulo neutro JavaScript, exercitado pelo contrato público.
import { identidadeTransformacaoRigida, validarTransformacaoRigida, comporTransformacoesRigidas, localDaTransformacaoRigida } from '../../src/autoria/transformacao-rigida.js';

describe('transformação rígida neutra', () => {
  it('cria identidades sem compartilhar arrays', () => {
    const a = identidadeTransformacaoRigida();
    const b = identidadeTransformacaoRigida();
    a.rotacao[0][0] = 9;
    a.deslocamento[0] = 9;
    expect(b).toEqual({ escala: 1, rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], deslocamento: [0, 0, 0] });
  });

  it('compõe e desfaz transformações na mesma ordem do contrato histórico', () => {
    const referencial = validarTransformacaoRigida({ escala: 2, deslocamento: [10, 0, 0] }, 'referencial');
    const local = validarTransformacaoRigida({ escala: 3, deslocamento: [1, 2, 0] }, 'local');
    const mundo = comporTransformacoesRigidas(referencial, local);
    expect(mundo).toEqual({ escala: 6, rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], deslocamento: [12, 4, 0] });
    expect(localDaTransformacaoRigida(referencial, mundo)).toEqual(local);
  });

  it('mantém escala histórica positiva e recusa escala na pose rígida', () => {
    expect(validarTransformacaoRigida({ escala: 2 }, 'pose').escala).toBe(2);
    expect(() => validarTransformacaoRigida({ escala: 2 }, 'pose', { aceitarEscala: false })).toThrow(/chave.*escala/);
  });

  it('recusa reflexão e valores não finitos', () => {
    expect(() => validarTransformacaoRigida({ rotacao: [[-1, 0, 0], [0, 1, 0], [0, 0, 1]] }, 'pose')).toThrow(/rotação própria/);
    expect(() => validarTransformacaoRigida({ deslocamento: [0, Infinity, 0] }, 'pose')).toThrow(/vetor finito/);
  });
});

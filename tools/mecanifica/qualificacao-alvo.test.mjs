/* qualificacao-alvo.test.mjs — contrato que separa intenção de medição 3D. */
import { describe, expect, it } from 'vitest';
import {
  FORMATO_QUALIFICACAO_ALVO, validarQualificacaoAlvo,
} from '../../src/autoria/qualificacao-alvo.js';
import { indiceSchemasAutoria3D } from '../../src/autoria/schemas-autoria-3d.js';

const base = {
  formato: FORMATO_QUALIFICACAO_ALVO,
  versao: 1,
  id: 'cupe-n6',
  origem: { tipo: 'prancha-gerada', hash: `sha256:${'a'.repeat(64)}` },
};

describe('qualificação de alvo', () => {
  it('publica o contrato no índice de schemas da autoria 3D', () => {
    expect(indiceSchemasAutoria3D().contratos.qualificacaoAlvo.$id).toBe(FORMATO_QUALIFICACAO_ALVO);
  });

  it('aceita direção estética, mas a declara não ajustável geometricamente', () => {
    const alvo = validarQualificacaoAlvo({
      ...base,
      classe: 'direcao-estetica',
      limitacoes: ['sem-cameras-calibradas', 'sem-correspondencias-3d'],
    });
    expect(alvo).toMatchObject({ classe: 'direcao-estetica', permiteFittingGeometrico: false });
  });

  it('exige câmera, escala, correspondências e identidade comum para alvo geométrico', () => {
    const geometrico = validarQualificacaoAlvo({
      ...base,
      classe: 'alvo-geometrico',
      origem: { tipo: 'canario-sintetico', hash: `sha256:${'b'.repeat(64)}` },
      geometria: {
        objeto: 'canario-cupe-conhecido',
        escala: { unidade: 'mm', fator: 1 },
        cameras: ['frontal', 'lateral'],
        correspondencias: ['nariz', 'teto', 'arco-dianteiro'],
      },
      limitacoes: [],
    });
    expect(geometrico).toMatchObject({ classe: 'alvo-geometrico', permiteFittingGeometrico: true });

    expect(() => validarQualificacaoAlvo({
      ...base, classe: 'alvo-geometrico', limitacoes: [],
      geometria: { objeto: 'canario', escala: { unidade: 'mm', fator: 1 }, cameras: [], correspondencias: [] },
    })).toThrow(/cameras|correspondencias/);
  });

  it('exige motivo explícito para alvo indeterminado', () => {
    expect(validarQualificacaoAlvo({
      ...base, classe: 'indeterminado', limitacoes: ['vistas-incompativeis'], motivo: 'As vistas não podem ser atribuídas ao mesmo objeto.',
    })).toMatchObject({ classe: 'indeterminado', permiteFittingGeometrico: false });
    expect(() => validarQualificacaoAlvo({ ...base, classe: 'indeterminado', limitacoes: ['vistas-incompativeis'] })).toThrow(/motivo/);
  });
});

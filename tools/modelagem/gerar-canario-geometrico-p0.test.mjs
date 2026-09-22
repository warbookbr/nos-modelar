/* Canário P0: prova o contrato calibrado, não qualidade de modelagem. */
import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import {
  gerarCanarioGeometricoP0,
  qualificarConjuntoDeVistasCanario,
} from './gerar-canario-geometrico-p0.mjs';
import { validarQualificacaoAlvo } from '../../src/autoria/qualificacao-alvo.js';

const pasta = mkdtempSync(join(tmpdir(), 'canario-p0-'));
const sha256 = (conteudo) => createHash('sha256').update(conteudo).digest('hex');

describe('canário geométrico P0', () => {
  it('gera vistas individuais, calibradas e byte-estáveis de uma peça sintética', () => {
    const primeiro = gerarCanarioGeometricoP0({ pasta });
    const segundo = gerarCanarioGeometricoP0({ pasta });
    expect(segundo).toEqual(primeiro);
    expect(validarQualificacaoAlvo(primeiro.qualificacao)).toMatchObject({
      classe: 'alvo-geometrico', permiteFittingGeometrico: true,
    });
    expect(primeiro.vistas.map(({ id }) => id)).toEqual(['frontal', 'lateral-direita', 'superior']);
    for (const vista of primeiro.vistas) {
      const arquivo = resolve(pasta, vista.arquivo);
      expect(existsSync(arquivo)).toBe(true);
      expect(sha256(readFileSync(arquivo))).toBe(vista.sha256);
      expect(vista.camera.matrizMundoParaCamera).toHaveLength(16);
      expect(vista.landmarks2d.length).toBeGreaterThan(1);
    }
  });

  it('rebaixa conjunto com identidade de objeto incompatível para indeterminado', () => {
    const manifesto = gerarCanarioGeometricoP0({ pasta });
    const qualificado = qualificarConjuntoDeVistasCanario({
      ...manifesto,
      vistas: [...manifesto.vistas, { ...manifesto.vistas[0], id: 'intrusa', objeto: 'outro-objeto' }],
    });
    expect(qualificado).toMatchObject({ classe: 'indeterminado', permiteFittingGeometrico: false });
  });
});

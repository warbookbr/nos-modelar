/* Provas N4: duas formas limpas obedecem o mesmo enunciado restrito. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analisarSuperficie } from '../../../tools/mecanifica/percepcao-superficie.mjs';
import { verificarProcedencia } from '../../../tools/mecanifica/procedencia-check.mjs';
import { ENUNCIADO_N4, resolverN4 } from './restricoes-secao.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const fonte = JSON.parse(readFileSync(resolve(aqui, 'fonte-n4.json'), 'utf8'));

describe('sonda N4 de autoria por restrição', () => {
  it('gera duas seções diferentes que satisfazem o mesmo enunciado de três restrições', () => {
    const secoes = resolverN4(fonte);
    expect(ENUNCIADO_N4).toHaveLength(3);
    expect(secoes).toHaveLength(2);
    expect(secoes.every((secao) => secao.passa)).toBe(true);
    expect(JSON.stringify(secoes[0].perfil)).not.toBe(JSON.stringify(secoes[1].perfil));
  });

  it('mantém C1 regular e procedência estrutural válida', () => {
    const secoes = resolverN4(fonte);
    expect(secoes.every((secao) => {
      const c1 = analisarSuperficie(secao.malha);
      return c1.leitura === 'regular-no-canal-c1' && c1.diedroMaximoGraus <= 19;
    })).toBe(true);
    expect(verificarProcedencia(fonte)).toMatchObject({ passa: true });
  });
});

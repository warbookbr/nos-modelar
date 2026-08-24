/* Provas N5: a busca usa uma liberdade real e não promove uma carroceria. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { verificarProcedencia } from '../../../tools/mecanifica/procedencia-check.mjs';
import { buscarBojoN5 } from './busca-bojo.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const fonte = JSON.parse(readFileSync(resolve(aqui, 'fonte-n5.json'), 'utf8'));

describe('sonda N5 de busca C3', () => {
  it('busca só o bojo residual e encontra o alvo medido dentro da tolerância', () => {
    const resultado = buscarBojoN5(fonte);
    expect(resultado.candidatos).toHaveLength(21);
    expect(resultado.vencedor.bojoRelativo).toBe(0.16);
    expect(resultado.vencedor.erroObjetivoMm).toBeLessThanOrEqual(fonte.objetivo.toleranciaMm);
  });

  it('mantém as três restrições, C1 e procedência antes de escolher', () => {
    const resultado = buscarBojoN5(fonte);
    expect(resultado.vencedor.elegivel).toBe(true);
    expect(resultado.vencedor.c1.leitura).toBe('regular-no-canal-c1');
    expect(verificarProcedencia(fonte)).toMatchObject({ passa: true });
  });
});

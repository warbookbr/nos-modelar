/* caminho-repositorio.test.mjs — confinamento de evidências repo:// portátil. */
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolverEvidenciaDoRepositorio } from './caminho-repositorio.mjs';
import { SYMLINK, avisarSymlinkAusente } from '../mecanifica/capacidade-symlink.mjs';

avisarSymlinkAusente();

function ambiente() {
  const pai = mkdtempSync(join(tmpdir(), 'mecanifica-caminho-'));
  const raiz = join(pai, 'repositorio');
  const irmao = join(pai, 'repositorio-externo');
  mkdirSync(raiz);
  mkdirSync(irmao);
  writeFileSync(join(pai, '.sentinela'), 'raiz-pai');
  writeFileSync(join(pai, 'fora.txt'), 'fora');
  return { pai, raiz, irmao };
}

describe('resolverEvidenciaDoRepositorio', () => {
  it('resolve arquivo regular sob uma raiz Windows sem depender de barra literal', () => {
    const { pai, raiz } = ambiente();
    try {
      writeFileSync(join(raiz, 'evidencia.svg'), 'imagem');
      expect(resolverEvidenciaDoRepositorio('repo://evidencia.svg', raiz)).toBe(join(raiz, 'evidencia.svg'));
    } finally { rmSync(pai, { recursive: true, force: true }); }
  });

  it('recusa travessia e caminho sob diretório de prefixo irmão', () => {
    const { pai, raiz, irmao } = ambiente();
    try {
      writeFileSync(join(raiz, 'interna.svg'), 'interna');
      writeFileSync(join(irmao, 'externa.svg'), 'externa');
      expect(() => resolverEvidenciaDoRepositorio('repo://../fora.txt', raiz)).toThrow(/canônico/);
      expect(() => resolverEvidenciaDoRepositorio('repo://../repositorio-externo/externa.svg', raiz)).toThrow(/canônico/);
    } finally { rmSync(pai, { recursive: true, force: true }); }
  });

  it.skipIf(!SYMLINK.disponivel)('recusa symlink que aponta para fora da raiz', () => {
    const { pai, raiz } = ambiente();
    try {
      const externo = join(pai, 'fora.txt');
      writeFileSync(externo, 'fora');
      symlinkSync(externo, join(raiz, 'atalho.svg'), 'file');
      expect(() => resolverEvidenciaDoRepositorio('repo://atalho.svg', raiz)).toThrow(/symlink|fora da raiz/);
    } finally { rmSync(pai, { recursive: true, force: true }); }
  });
});

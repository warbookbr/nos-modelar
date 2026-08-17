/* Contratos mínimos do parser compartilhado e recusas pré-navegador. */
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — CLI MJS exercitada pelo contrato público.
import { lerArgumentos } from './argumentos.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const BANCADA = resolve(REPO, 'tools/mecanifica/olhar-bancada.mjs');
const VOCABULARIO = {
  opcoes: ['partes', 'subarvore', 'casas'],
  bandeiras: ['listar', 'estrito'],
  posicional: { nome: 'a peça', obrigatorio: false },
};
const correr = (args: string[]) => {
  try { return { saida: execFileSync('node', [BANCADA, ...args], { encoding: 'utf8' }), codigo: 0 }; }
  catch (erro: any) { return { saida: `${erro.stdout ?? ''}${erro.stderr ?? ''}`, codigo: erro.status }; }
};

describe('vocabulário dos CLIs', () => {
  it('lê opções, bandeiras e argumento explícito', () => {
    const lido = lerArgumentos(['fixture', '--partes=corpo', '--estrito'], VOCABULARIO);
    expect(lido.posicional).toBe('fixture');
    expect(lido.opcao('partes')).toBe('corpo');
    expect(lido.bandeira('estrito')).toBe(true);
  });

  it('recusa typo, opção sem valor, repetição e argumento duplicado', () => {
    expect(() => lerArgumentos(['--estrit'], VOCABULARIO)).toThrow(/não conheço '--estrit'/);
    expect(() => lerArgumentos(['--partes'], VOCABULARIO)).toThrow(/precisa de valor/);
    expect(() => lerArgumentos(['--estrito', '--estrito'], VOCABULARIO)).toThrow(/mais de uma vez/);
    expect(() => lerArgumentos(['a', 'b'], VOCABULARIO)).toThrow(/recebi 2 valores/);
  });

  it('não deixa consultar opção ou bandeira não declarada', () => {
    const lido = lerArgumentos([], VOCABULARIO);
    expect(() => lido.opcao('vistas')).toThrow(/não foi declarado/);
    expect(() => lido.bandeira('focar')).toThrow(/não foi declarado/);
  });
});

describe('olhar-bancada — recusas antes do navegador', () => {
  it('recusa flags desconhecidas e formas incompletas', () => {
    expect(correr(['fixture', '--vista=frontal'])).toMatchObject({ codigo: 2 });
    expect(correr(['--lixo=1'])).toMatchObject({ codigo: 2 });
    expect(correr(['fixture', '--focar'])).toMatchObject({ codigo: 2 });
    expect(correr(['fixture', '--par=um'])).toMatchObject({ codigo: 2 });
    expect(correr(['fixture', '--par=um,dois', '--selecionadas=um,dois'])).toMatchObject({ codigo: 2 });
    expect(correr(['fixture', '--par=um,dois', '--explosao=0.2'])).toMatchObject({ codigo: 2 });
  });
});

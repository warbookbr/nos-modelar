/* caminho-confinado.test.ts — prova do confinamento sem precisar criar links. */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — guarda em JavaScript, com lstat injetável para teste puro.
import { ErroDeConfinamento, criarDiretorioConfinado, verificarCaminhoConfinado } from './caminho-confinado.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const caminho = (...partes: string[]) => resolve(RAIZ, ...partes);
const diretorio = () => ({ isDirectory: () => true, isSymbolicLink: () => false });
const arquivo = () => ({ isDirectory: () => false, isSymbolicLink: () => false });
const vinculo = () => ({ isDirectory: () => false, isSymbolicLink: () => true });
const reparse = () => ({ isDirectory: () => true, isSymbolicLink: () => false, isReparsePoint: () => true });

function lstatDe(entradas: Map<string, unknown>) {
  return (alvo: string) => {
    const entrada = entradas.get(alvo);
    if (entrada) return entrada;
    const erro = Object.assign(new Error('ausente'), { code: 'ENOENT' });
    throw erro;
  };
}

describe('confinamento de caminhos de artefato', () => {
  it('aceita ancestral novo sem tentar realpath do destino inexistente', () => {
    const entradas = new Map([[RAIZ, diretorio()], [caminho('autoria-assistida'), diretorio()]]);
    expect(() => verificarCaminhoConfinado(caminho('autoria-assistida', 'novo', 'relatorio.json'), {
      raiz: RAIZ, lstat: lstatDe(entradas),
    })).not.toThrow();
  });

  it('recusa link/junction em qualquer ancestral já existente', () => {
    const entradas = new Map([[RAIZ, diretorio()], [caminho('autoria-assistida'), diretorio()], [caminho('autoria-assistida', 'saidas'), vinculo()]]);
    expect(() => verificarCaminhoConfinado(caminho('autoria-assistida', 'saidas', 'foto.png'), {
      raiz: RAIZ, lstat: lstatDe(entradas),
    })).toThrow(ErroDeConfinamento);
  });

  it('recusa reparse point mesmo quando o runtime não o chama de symlink', () => {
    const entradas = new Map([[RAIZ, diretorio()], [caminho('autoria-assistida'), reparse()]]);
    expect(() => verificarCaminhoConfinado(caminho('autoria-assistida', 'relatorio.json'), {
      raiz: RAIZ, lstat: lstatDe(entradas),
    })).toThrow(/reparse point/);
  });

  it('não deixa mkdir recursivo atravessar vínculo: só cria segmentos normais', () => {
    const entradas = new Map([[RAIZ, diretorio()]]);
    const criados: string[] = [];
    criarDiretorioConfinado(caminho('novo', 'aninhado'), {
      raiz: RAIZ,
      lstat: lstatDe(entradas),
      mkdir: (alvo: string) => { criados.push(alvo); entradas.set(alvo, diretorio()); },
    });
    expect(criados).toEqual([caminho('novo'), caminho('novo', 'aninhado')]);
  });

  it('recusa arquivo no meio do caminho antes de criar qualquer descendente', () => {
    const entradas = new Map([[RAIZ, diretorio()], [caminho('novo'), arquivo()]]);
    expect(() => criarDiretorioConfinado(caminho('novo', 'aninhado'), {
      raiz: RAIZ, lstat: lstatDe(entradas), mkdir: () => { throw new Error('não deveria criar'); },
    })).toThrow(/não é diretório/);
  });
});

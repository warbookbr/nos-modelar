/* modulo.test.js — o módulo fica isolado (não importa Three.js, o núcleo de autoria nem outro módulo), o resolvedor está fixado em
   1.3.0 e a versão que o contorno grava é a instalada, e a ajuda cobre as relações do formato. */
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RESOLVEDOR, TIPOS_DE_RELACAO, textoDaAjuda } from '../src/index.js';

const pasta = new URL('../src/', import.meta.url);
const raiz = (caminho) => JSON.parse(readFileSync(new URL(`../../../${caminho}`, import.meta.url), 'utf8'));

describe('o módulo desenho-por-restricoes', () => {
  it('importa só ele mesmo, o Node, o planegcs e a Manifold: nada de Three.js, do núcleo de autoria nem de outro módulo', () => {
    const permitidos = [/^\.\/[\w-]+\.js$/, /^node:crypto$/, /^@salusoft89\/planegcs$/, /^manifold-3d$/];
    const arquivos = readdirSync(pasta).filter((f) => f.endsWith('.js'));
    expect(arquivos.length).toBeGreaterThan(8);
    for (const f of arquivos) {
      const texto = readFileSync(new URL(f, pasta), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      const origens = [...texto.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
      for (const o of origens) expect(permitidos.some((p) => p.test(o)), `${f} importa ${o}`).toBe(true);
    }
  });

  it('o planegcs está fixado em 1.3.0 no package.json da raiz, sem intervalo, e é o que o contorno grava como resolvedor', () => {
    expect(raiz('package.json').devDependencies['@salusoft89/planegcs']).toBe('1.3.0');
    expect(raiz('node_modules/@salusoft89/planegcs/package.json').version).toBe('1.3.0');
    expect(RESOLVEDOR).toBe('planegcs@1.3.0');
  });

  it('a ajuda do comando nomeia todos os tipos de relação do formato', () => {
    const ajuda = textoDaAjuda();
    for (const t of TIPOS_DE_RELACAO) expect(ajuda, t).toMatch(new RegExp(`^\\s+${t}\\b`, 'm'));
    expect(ajuda).toMatch(/mecanifica\.desenho@2/);
    expect(ajuda).toMatch(/raioDoCanto/);
    expect(ajuda).toMatch(/npm run desenho/);
  });
});

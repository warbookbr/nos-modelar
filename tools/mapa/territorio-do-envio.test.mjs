/* territorio-do-envio.test.mjs — o arquivo mudado sem plano dono nem declaração reprova; o do território, o compartilhado, o gerado
   e o declarado como defeito pontual passam. */
import { describe, expect, it } from 'vitest';
import { conferirTerritorio, declaracoesFora } from './territorio-do-envio.mjs';

const territorios = [{ plano: '2026-11-26-a.md', caminhos: ['tools/a/', 'docs/x.md'] }];

describe('território do envio', () => {
  it('passa o que tem dono, o compartilhado e o gerado', () => {
    const r = conferirTerritorio(['tools/a/um.mjs', 'docs/x.md', 'package.json', 'docs/MAPA.md', 'CLAUDE.md'], territorios);
    expect(r.fora).toEqual([]);
    expect(r.donos.get('tools/a/um.mjs')).toBe('2026-11-26-a.md');
  });

  it('reprova o arquivo sem dono, e a declaração de defeito pontual o libera', () => {
    expect(conferirTerritorio(['tools/b/dois.mjs', 'tools/a/um.mjs'], territorios).fora).toEqual(['tools/b/dois.mjs']);
    const declarados = declaracoesFora('Conserta o link\n\nFora-do-territorio: tools/b/dois.mjs, defeito pontual do link\n');
    expect(declarados).toEqual([{ caminho: 'tools/b/dois.mjs', motivo: 'defeito pontual do link' }]);
    expect(conferirTerritorio(['tools/b/dois.mjs'], territorios, declarados).fora).toEqual([]);
  });

  it('a declaração sem motivo não vale', () => {
    expect(declaracoesFora('Fora-do-territorio: tools/b/dois.mjs\n')).toEqual([]);
  });
});

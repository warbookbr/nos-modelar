/* lentos-ligados.test.mjs — que lentos o envio liga ao que mudou, e o teto da bateria local. */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TESTES_LENTOS } from '../testes-lentos.mjs';
import { arquivoDoRegistro, lerLeituras } from './leituras.mjs';
import { DURACAO_SEM_MEDIDA_MS, aplicarTeto, duracaoGuardada, lentosLigados, relatarLentosLigados } from './lentos-ligados.mjs';
import { fotografar } from './seletor.mjs';

const ACERVO = 'src/autoria/material-da-receita.acervo.test.js';

describe('lentos ligados ao que o envio mudou', () => {
  it('capacidade.mjs mudado liga o raio-da-aresta.test.mjs, pelo grafo de imports', () => {
    const ligados = lentosLigados({ lentos: TESTES_LENTOS, alterados: ['tools/modelar/capacidade.mjs'], foto: fotografar('.') });
    expect([...ligados.keys()]).toContain('tools/modelar/raio-da-aresta.test.mjs');
  });

  it('um arquivo que sai de procedural/pecas/*/rodadas/ liga o piso do acervo pelo registro de leituras, e uma edição não', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lentos-lig-'));
    try {
      const pasta = 'procedural/pecas/furgao-realista/rodadas';
      writeFileSync(arquivoDoRegistro(dir, ACERVO), `${JSON.stringify({ teste: ACERVO })}\n${JSON.stringify({ d: pasta })}\n`);
      const leituras = lerLeituras(dir);
      const foto = fotografar('.');
      const saiu = `${pasta}/receita-22.js`;
      const sem = (estruturais) => [...lentosLigados({ lentos: TESTES_LENTOS, alterados: [saiu], estruturais, foto, leituras }).keys()];
      expect(sem([saiu])).toContain(ACERVO);
      expect(sem([])).not.toContain(ACERVO);
      /* sem registro de leituras, o seletor não tem como saber: só o grafo de imports, que não alcança receita carregada pelo caminho */
      expect([...lentosLigados({ lentos: TESTES_LENTOS, alterados: [saiu], estruturais: [saiu], foto }).keys()]).not.toContain(ACERVO);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('a duração guardada vem do histórico, do peso medido, ou do piso', () => {
    expect(duracaoGuardada('a', { a: [10_000, 30_000, 20_000] }, { a: 99 })).toBe(20_000);
    expect(duracaoGuardada('a', {}, { a: 99 })).toBe(99_000);
    expect(duracaoGuardada('a', {}, {})).toBe(DURACAO_SEM_MEDIDA_MS);
  });
});

describe('o teto da bateria local', () => {
  const dur = (m) => (a) => m[a];
  it('dentro de 8 arquivos e 5 minutos, rodam todos', () => {
    const r = aplicarTeto(['a', 'b'], dur({ a: 100_000, b: 150_000 }));
    expect(r).toMatchObject({ rodam: ['a', 'b'], ficam: [], cortado: false });
  });

  it('acima de 5 minutos, rodam os mais curtos até o teto e o resto fica para o CI', () => {
    const r = aplicarTeto(['a', 'b', 'c'], dur({ a: 200_000, b: 60_000, c: 120_000 }));
    expect(r).toMatchObject({ rodam: ['b', 'c'], ficam: ['a'], somaMs: 180_000, cortado: true });
    expect(relatarLentosLigados(r)).toContain('ficam para o CI: a');
  });

  it('acima de 8 arquivos, rodam os 8 mais curtos', () => {
    const nomes = Array.from({ length: 10 }, (_, i) => `t${i}`);
    const r = aplicarTeto(nomes, (a) => 1000 * (Number(a.slice(1)) + 1));
    expect(r.rodam).toEqual(nomes.slice(0, 8).sort());
    expect(r.ficam).toEqual(['t8', 't9']);
  });

  it('um arquivo maior que o teto sozinho fica para o CI, e não trava os menores', () => {
    const r = aplicarTeto(['grande', 'a'], dur({ grande: 400_000, a: 10_000 }));
    expect(r).toMatchObject({ rodam: ['a'], ficam: ['grande'] });
  });
});

/* testes-lentos.test.mjs — a lista dos lentos aponta para arquivos que existem, e a bateria dos lentos roda todos onde precisa. */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { acimaDoTeto, ARQUIVO_DOS_PESOS, argumentosDoVitest, comParte, partesPorPeso, pesadosSozinhos, TESTES_LENTOS, TETO_DO_RAPIDO_MS, TETO_SOZINHO_MS } from './testes-lentos.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('a lista dos testes lentos', () => {
  it('só tem arquivos que existem, sem repetição', () => {
    expect(TESTES_LENTOS.filter((f) => !existsSync(join(RAIZ, f)))).toEqual([]);
    expect(new Set(TESTES_LENTOS).size).toBe(TESTES_LENTOS.length);
  });

  it('os lentos rodam todos no CI, com --completo e sem ramo remoto, e só os ligados ao que mudou fora disso', () => {
    const remoto = () => 'origin/ramo';
    expect(argumentosDoVitest('lentos', { ambiente: { CI: 'true' }, remoto }).args).toEqual(['run']);
    expect(argumentosDoVitest('lentos', { ambiente: { GATES_COMPLETO: '1' }, remoto }).args).toEqual(['run']);
    expect(argumentosDoVitest('lentos', { ambiente: {}, remoto: () => null }).args).toEqual(['run']);
    expect(argumentosDoVitest('lentos', { ambiente: {}, remoto }).args).toEqual(['run', '--changed', 'origin/ramo', '--passWithNoTests']);
    expect(argumentosDoVitest('rapidos', { ambiente: {}, remoto }).args).toEqual(['run']);
  });

  it('o teto reprova o rápido que passa dele e ignora o que já está na lista dos lentos', () => {
    const duracoes = [
      { arquivo: 'tools/x.test.mjs', ms: TETO_DO_RAPIDO_MS + 1 },
      { arquivo: 'tools/y.test.mjs', ms: TETO_DO_RAPIDO_MS },
      { arquivo: TESTES_LENTOS[0], ms: TETO_DO_RAPIDO_MS * 10 },
    ];
    expect(acimaDoTeto(duracoes).map((d) => d.arquivo)).toEqual(['tools/x.test.mjs']);
  });

  it('o arquivo acima do teto só reprova se continuar pesado rodando sozinho', () => {
    const lentos = [{ arquivo: 'a.test.mjs', ms: 35_000 }, { arquivo: 'b.test.mjs', ms: 40_000 }];
    const sozinho = { 'a.test.mjs': 5_000, 'b.test.mjs': TETO_SOZINHO_MS + 1 };
    expect(pesadosSozinhos(lentos, (f) => sozinho[f]).map((d) => [d.arquivo, d.sozinhoMs])).toEqual([['b.test.mjs', TETO_SOZINHO_MS + 1]]);
  });
});

describe('a parte dos lentos que cada máquina do CI roda', () => {
  it('cada lento cai em exatamente uma parte, e as partes ficam com peso parecido', () => {
    const pesos = { a: 10, b: 9, c: 1, d: 1, e: 1 };
    const partes = partesPorPeso(['a', 'b', 'c', 'd', 'e', 'f'], pesos, 2);
    expect(partes.flat().sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(partes).toEqual([['a', 'd', 'f'], ['b', 'c', 'e']]);
    const reais = partesPorPeso(TESTES_LENTOS, {}, 5);
    expect(reais.flat().sort()).toEqual([...TESTES_LENTOS].sort());
  });

  it('GATES_PARTE escolhe a parte pelo peso nos lentos e o --shard nos rápidos', () => {
    const args = comParte(['run'], { GATES_PARTE: '1/2' }, 'lentos', {});
    expect(args[0]).toBe('run');
    expect(args.length).toBeGreaterThan(1);
    expect(comParte(['run'], { GATES_PARTE: '2/5' }, 'rapidos')).toEqual(['run', '--shard=2/5']);
    expect(comParte(['run'], {}, 'lentos')).toEqual(['run']);
  });

  it('recusa a parte mal escrita', () => {
    expect(() => comParte(['run'], { GATES_PARTE: 'dois' })).toThrow(/parte\/total/);
    expect(() => comParte(['run'], { GATES_PARTE: '6/5' })).toThrow(/parte\/total/);
  });

  it('o nome de cada lento, como filtro do vitest, só pega ele mesmo', () => {
    const ambiguos = TESTES_LENTOS.filter((f) => TESTES_LENTOS.filter((g) => g.includes(f)).length !== 1);
    expect(ambiguos).toEqual([]);
  });

  it('os pesos só nomeiam arquivos da lista dos lentos', () => {
    const { segundos } = JSON.parse(readFileSync(ARQUIVO_DOS_PESOS, 'utf8'));
    expect(Object.keys(segundos).filter((a) => !TESTES_LENTOS.includes(a))).toEqual([]);
  });
});

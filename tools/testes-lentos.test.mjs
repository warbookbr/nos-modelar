/* testes-lentos.test.mjs — a lista dos lentos aponta para arquivos que existem, e a bateria dos lentos roda todos onde precisa. */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { anexarAoHistorico } from './vitest-duracoes.mjs';
import { acimaDoTeto, ARQUIVO_DOS_PESOS, avaliarTeto, FATOR_DO_TETO, relatarLentos, TETO_DO_LENTO_MS, argumentosDoVitest, comParte, maquinaOcupada, partesPorPeso, pesadosSozinhos, TESTES_LENTOS, TETO_DO_RAPIDO_MS, TETO_SOZINHO_MS, tetosDaBateria } from './testes-lentos.mjs';

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

  it('a bateria local roda só a lista dos lentos ligados que cabem no teto, e o CI e o --completo rodam todos', () => {
    const dir = mkdtempSync(join(tmpdir(), 'escolhidos-'));
    try {
      const lista = join(dir, 'e.json');
      writeFileSync(lista, JSON.stringify(['tools/modelar/raio-da-aresta.test.mjs']));
      const remoto = () => 'origin/ramo';
      expect(argumentosDoVitest('lentos', { ambiente: { GATES_TESTES_ESCOLHIDOS: lista }, remoto }).args).toEqual(['run', 'tools/modelar/raio-da-aresta.test.mjs']);
      expect(argumentosDoVitest('lentos', { ambiente: { GATES_TESTES_ESCOLHIDOS: lista, CI: 'true' }, remoto }).args).toEqual(['run']);
      expect(argumentosDoVitest('lentos', { ambiente: { GATES_TESTES_ESCOLHIDOS: lista, GATES_COMPLETO: '1' }, remoto }).args).toEqual(['run']);
    } finally { rmSync(dir, { recursive: true, force: true }); }
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

  it('fora do CI a bateria mede sozinho o arquivo de 12 s e cobra o teto sozinho com margem, como o que reprovou no CI em 2026-11-12', () => {
    const local = tetosDaBateria();
    expect(tetosDaBateria({ ci: true })).toEqual({ bateria: TETO_DO_RAPIDO_MS, sozinho: TETO_SOZINHO_MS });
    const lentos = acimaDoTeto([{ arquivo: 'apoio.test.ts', ms: 22_800 }, { arquivo: 'raio.test.mjs', ms: 14_300 }, { arquivo: 'leve.test.mjs', ms: 9_000 }], local.bateria);
    expect(lentos.map((d) => d.arquivo)).toEqual(['apoio.test.ts', 'raio.test.mjs']);
    const sozinho = { 'apoio.test.ts': 18_400, 'raio.test.mjs': 10_900 };
    expect(pesadosSozinhos(lentos, (f) => sozinho[f], local.sozinho).map((d) => d.arquivo)).toEqual(['apoio.test.ts', 'raio.test.mjs']);
  });

  it('com a carga acima dos processadores a medida sozinha não vale, salvo no CI, que cobra sempre', () => {
    expect(maquinaOcupada({ carga: 11.8, processadores: 4 })).toBe(true);
    expect(maquinaOcupada({ carga: 3.9, processadores: 4 })).toBe(false);
    expect(maquinaOcupada({ carga: 11.8, processadores: 16 })).toBe(false);
    expect(maquinaOcupada({ carga: 11.8, processadores: 4, ci: true })).toBe(false);
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

describe('a variável que escolhe a bateria (MODELAR_TESTES)', () => {
  const arquivoDasDuracoes = (env) => spawnSync(process.execPath, [
    '--input-type=module', '-e', "import { arquivoDasDuracoes } from './tools/vitest-duracoes.mjs'; console.log(arquivoDasDuracoes());",
  ], { cwd: RAIZ, encoding: 'utf8', env: { PATH: process.env.PATH, ...env } });

  it('o nome novo escolhe o arquivo das durações, e o nome antigo ainda vale com aviso do novo', () => {
    const novo = arquivoDasDuracoes({ MODELAR_TESTES: 'rapidos' });
    expect(novo.stdout.trim()).toBe(join('tmp', 'gates', 'duracoes-dos-testes-rapidos.json'));
    expect(novo.stderr).toBe('');
    const antigo = arquivoDasDuracoes({ MECANIFICA_TESTES: 'lentos' });
    expect(antigo.stdout.trim()).toBe(join('tmp', 'gates', 'duracoes-dos-testes-lentos.json'));
    expect(antigo.stderr).toContain('use MODELAR_TESTES');
  });
});

describe('o teto relativo à mediana das durações guardadas', () => {
  const NORMAL = [27_000, 26_000, 28_000, 27_000, 29_000, 27_000, 28_000];
  const opcoes = { fixo: TETO_DO_LENTO_MS, semHistorico: 'aviso' };

  it('o estouro isolado avisa: 80 s no CI de um arquivo que leva 27 s não reprova', () => {
    const r = avaliarTeto([...NORMAL, 80_000], opcoes);
    expect(r.relativo).toBe(true);
    expect(r.teto).toBe(FATOR_DO_TETO * 27_000);
    expect(r.acima).toBe(true);
    expect(r.seguidas).toBe(1);
    expect(r.veredito).toBe('aviso');
  });

  it('três execuções seguidas acima do teto reprovam, e a regressão não entra na própria referência', () => {
    expect(avaliarTeto([...NORMAL, 60_000, 61_000], opcoes).veredito).toBe('aviso');
    const r = avaliarTeto([...NORMAL, 60_000, 61_000, 62_000], opcoes);
    expect(r.teto).toBe(FATOR_DO_TETO * 27_000);
    expect(r.seguidas).toBe(3);
    expect(r.veredito).toBe('reprova');
    /* uma execução boa no meio zera a conta */
    expect(avaliarTeto([...NORMAL, 60_000, 27_000, 62_000], opcoes).veredito).toBe('aviso');
  });

  it('sem histórico vale o teto fixo: o rápido reprova como sempre e o lento só avisa', () => {
    const poucas = [20_000, 21_000, 22_000, 21_000];
    expect(avaliarTeto([...poucas, 70_000], opcoes)).toMatchObject({ relativo: false, teto: TETO_DO_LENTO_MS, veredito: 'aviso' });
    expect(avaliarTeto([70_000], { fixo: TETO_DO_LENTO_MS })).toMatchObject({ relativo: false, veredito: 'reprova' });
    expect(avaliarTeto([50_000], opcoes)).toMatchObject({ acima: false, veredito: 'ok' });
  });

  it('o arquivo que sempre foi lento ganha teto maior que o fixo', () => {
    expect(avaliarTeto([300_000, 310_000, 305_000, 300_000, 305_000, 337_000], opcoes)).toMatchObject({ teto: 610_000, veredito: 'ok' });
  });

  it('os lentos relatam o aviso e a reprovação, e o histórico dos rápidos só relaxa o teto fixo', () => {
    const historicos = { 'a.test.mjs': [...NORMAL, 80_000], 'b.test.mjs': [...NORMAL, 60_000, 61_000, 62_000] };
    const { linhas, reprovados } = relatarLentos([{ arquivo: 'a.test.mjs', ms: 80_000 }, { arquivo: 'b.test.mjs', ms: 62_000 }], historicos);
    expect(reprovados.map((r) => r.arquivo)).toEqual(['b.test.mjs']);
    expect(linhas.join('\n')).toMatch(/aviso, 1 arquivo.*a\.test\.mjs/);
    expect(relatarLentos([{ arquivo: 'c.test.mjs', ms: 10_000 }], {}).linhas).toEqual(['test:lentos — nenhum arquivo acima do teto.']);
    const rapidos = { 'x.test.mjs': [14_000, 15_000, 14_500, 15_000, 15_500, 15_000, 16_000] };
    expect(acimaDoTeto([{ arquivo: 'x.test.mjs', ms: 16_000 }], 12_000, rapidos)).toEqual([]);
    expect(acimaDoTeto([{ arquivo: 'x.test.mjs', ms: 16_000 }], 12_000).map((d) => d.arquivo)).toEqual(['x.test.mjs']);
  });

  it('o histórico guarda as últimas execuções de cada arquivo', () => {
    let h = {};
    for (let i = 1; i <= 12; i += 1) h = anexarAoHistorico(h, [{ arquivo: 'a', ms: i }]);
    expect(h.a).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});

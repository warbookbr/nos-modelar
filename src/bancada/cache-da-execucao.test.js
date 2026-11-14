import { describe, expect, it } from 'vitest';
import { isDeepStrictEqual } from 'node:util';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { executarReceita } from '../autoria/executar-receita.js';
import { adaptarThree } from '../autoria/adaptar-three.js';
import {
  chaveDaExecucao, criarArmazemEmMemoria, fatiarRegistro, juntarRegistro, ENTRADAS_POR_PEDACO, neutroComCache, textoDaExecucao, lerImpressaoDoServidor, criarArmazemIndexedDB,
} from './cache-da-execucao.js';
import { impressaoDaReceita, impressaoDoMotor, fechoDeImports } from '../../tools/bancadas/impressao-das-fontes.mjs';

/* hash FNV das posições da malha do Three, na ordem de saída */
function hashDasPosicoes(adaptado) {
  let hash = 2166136261;
  let vertices = 0;
  let faces = 0;
  adaptado.raiz.traverse((no) => {
    const posicoes = no.geometry?.getAttribute?.('position');
    if (!posicoes) return;
    vertices += posicoes.count;
    faces += no.geometry.index ? no.geometry.index.count / 3 : posicoes.count / 3;
    for (const valor of posicoes.array) {
      hash ^= Math.round(valor * 1e6) | 0;
      hash = Math.imul(hash, 16777619) >>> 0;
    }
  });
  return { hash, vertices, faces };
}

const RECEITA = {
  PASSOS: [
    ['cilindro', { origemId: 10, raio: 1.2, altura: 0.35, lados: 32 }],
    ['cilindro', { origemId: 20, raio: 0.7, altura: 0.7, lados: 32, em: [0, 0.35, 0] }],
    ['parte', { nome: 'coroa', sel: { origem: { op: 'cilindro', id: 10 } } }],
    ['parte', { nome: 'cubo', sel: { origem: { op: 'cilindro', id: 20 } } }],
  ],
};

describe('cache da execução: chave', () => {
  it('a mesma impressão e os mesmos extras dão a mesma chave; qualquer mudança troca', () => {
    const base = { motor: 'm1', receita: 'r1', extras: { a: 1, b: 2 } };
    expect(chaveDaExecucao(base)).toBe(chaveDaExecucao({ ...base, extras: { b: 2, a: 1 } }));
    expect(chaveDaExecucao(base)).not.toBe(chaveDaExecucao({ ...base, receita: 'r2' }));
    expect(chaveDaExecucao(base)).not.toBe(chaveDaExecucao({ ...base, motor: 'm2' }));
    expect(chaveDaExecucao(base)).not.toBe(chaveDaExecucao({ ...base, extras: { a: 1, b: 3 } }));
  });
});

describe('cache da execução: impressão das fontes', () => {
  function repositorio(arquivos) {
    const raiz = mkdtempSync(join(tmpdir(), 'cache-bancada-'));
    for (const [caminho, texto] of Object.entries(arquivos)) {
      mkdirSync(join(raiz, caminho, '..'), { recursive: true });
      writeFileSync(join(raiz, caminho), texto);
    }
    return raiz;
  }
  const BASE = {
    'src/autoria/executar-receita.js': "import { nucleo } from '../../procedural/nucleo/entrada.js';\nexport const x = nucleo;\n",
    'procedural/nucleo/entrada.js': "export * from './operacoes/a.js';\n",
    'procedural/nucleo/operacoes/a.js': 'export const a = 1;\n',
    'procedural/familias/f/familia.js': 'export const f = 1;\n',
    'procedural/pecas/p/auxiliar.js': 'export const aux = 1;\n',
    'procedural/pecas/p/receita.js': "import { f } from '../../familias/f/familia.js';\nimport { aux } from './auxiliar.js';\nexport default { PASSOS: [] };\n",
  };
  const impressoes = (raiz) => ({
    motor: impressaoDoMotor({ raiz, versaoDoManifold: '1' }),
    receita: impressaoDaReceita('procedural/pecas/p/receita.js', { raiz }),
  });

  it('o fecho segue os imports locais, a família inclusa; mudar receita, módulo importado, família ou núcleo troca a chave', () => {
    const raiz = repositorio(BASE);
    try {
      const fecho = fechoDeImports(join(raiz, 'procedural/pecas/p/receita.js')).map((c) => c.slice(raiz.length + 1).replaceAll('\\', '/'));
      expect(fecho).toEqual(['procedural/familias/f/familia.js', 'procedural/pecas/p/auxiliar.js', 'procedural/pecas/p/receita.js']);
      const antes = impressoes(raiz);
      expect(impressoes(raiz)).toEqual(antes);
      const chave = (i) => chaveDaExecucao(i);
      const mudar = (caminho, texto) => { writeFileSync(join(raiz, caminho), texto); };

      mudar('procedural/pecas/p/receita.js', `${BASE['procedural/pecas/p/receita.js']}// ajuste\n`);
      const aposReceita = impressoes(raiz);
      expect(chave(aposReceita)).not.toBe(chave(antes));
      expect(aposReceita.motor).toBe(antes.motor);
      mudar('procedural/pecas/p/receita.js', BASE['procedural/pecas/p/receita.js']);
      expect(chave(impressoes(raiz))).toBe(chave(antes));

      mudar('procedural/pecas/p/auxiliar.js', 'export const aux = 2;\n');
      expect(chave(impressoes(raiz))).not.toBe(chave(antes));
      mudar('procedural/pecas/p/auxiliar.js', BASE['procedural/pecas/p/auxiliar.js']);

      mudar('procedural/familias/f/familia.js', 'export const f = 2;\n');
      expect(chave(impressoes(raiz))).not.toBe(chave(antes));
      mudar('procedural/familias/f/familia.js', BASE['procedural/familias/f/familia.js']);

      mudar('procedural/nucleo/operacoes/a.js', 'export const a = 2;\n');
      const aposNucleo = impressoes(raiz);
      expect(chave(aposNucleo)).not.toBe(chave(antes));
      expect(aposNucleo.receita).toBe(antes.receita);

      expect(impressaoDoMotor({ raiz, versaoDoManifold: '2' })).not.toBe(impressaoDoMotor({ raiz, versaoDoManifold: '1' }));
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });
});

describe('cache da execução: reaproveitamento e fidelidade', () => {
  const impressao = { motor: 'motor-a', receita: 'receita-a' };

  it('a primeira carga executa e grava; a segunda, com a mesma chave, não executa e devolve a mesma malha', async () => {
    const armazem = criarArmazemEmMemoria();
    let execucoes = 0;
    const executar = () => { execucoes += 1; return executarReceita(RECEITA).neutro; };

    const primeira = await neutroComCache({ vaga: 'p', impressao, armazem, executar });
    await primeira.gravacao;
    expect(primeira.origem).toBe('executada');
    const segunda = await neutroComCache({ vaga: 'p', impressao, armazem, executar });
    expect(segunda.origem).toBe('cache');
    expect(execucoes).toBe(1);

    expect(isDeepStrictEqual(segunda.neutro, primeira.neutro)).toBe(true);
    const executada = hashDasPosicoes(adaptarThree(primeira.neutro, { nome: 'p', materiais: {} }));
    const doCache = hashDasPosicoes(adaptarThree(segunda.neutro, { nome: 'p', materiais: {} }));
    expect(doCache.vertices).toBeGreaterThan(0);
    expect(doCache).toEqual(executada);
  });

  it('chave nova (receita, módulo ou motor mudou) executa de novo e sobrescreve a vaga', async () => {
    const armazem = criarArmazemEmMemoria();
    let execucoes = 0;
    const executar = () => { execucoes += 1; return executarReceita(RECEITA).neutro; };
    await (await neutroComCache({ vaga: 'p', impressao, armazem, executar })).gravacao;
    for (const outra of [{ ...impressao, receita: 'receita-b' }, { ...impressao, motor: 'motor-b' }]) {
      const r = await neutroComCache({ vaga: 'p', impressao: outra, armazem, executar });
      await r.gravacao;
      expect(r.origem).toBe('executada');
    }
    expect(execucoes).toBe(3);
    expect(armazem.vagas.size).toBe(1);
  });

  it('sem impressão, ou com armazém que falha, executa sem quebrar', async () => {
    const executar = () => executarReceita(RECEITA).neutro;
    expect((await neutroComCache({ vaga: 'p', impressao: null, armazem: criarArmazemEmMemoria(), executar })).origem).toBe('executada');
    const quebrado = { ler: async () => { throw new Error('x'); }, gravar: async () => { throw new Error('y'); } };
    const r = await neutroComCache({ vaga: 'p', impressao, armazem: quebrado, executar });
    expect(r.origem).toBe('executada');
    expect(await r.gravacao).toBe(false);
  });

  it('sem IndexedDB o armazém devolve nulo; sem servidor a impressão é nula', async () => {
    const armazem = criarArmazemIndexedDB({ indexedDB: null });
    expect(await armazem.ler('p')).toBeNull();
    expect(await armazem.gravar('p', {})).toBeNull();
    expect(await lerImpressaoDoServidor('x.js', { buscar: async () => { throw new Error('fora'); } })).toBeNull();
    expect(await lerImpressaoDoServidor('x.js', { buscar: async () => ({ ok: false }) })).toBeNull();
    expect(await lerImpressaoDoServidor('x.js', { buscar: async () => ({ ok: true, json: async () => ({ motor: 'm', receitas: { 'x.js': 'r' } }) }) }))
      .toEqual({ motor: 'm', receita: 'r' });
  });

  it('o registro grande se parte em pedaços (o IndexedDB recusa valor acima de uns 128 MiB) e se junta idêntico', () => {
    const V = new Map(Array.from({ length: ENTRADAS_POR_PEDACO * 2 + 5 }, (_, i) => [i, [i, i + 1, i + 2]]));
    const neutro = { V, F: new Map([[1, [1, 2, 3]]]), orfaos: [], procedencia: { a: 1 } };
    const fatiado = fatiarRegistro({ chave: 'k', neutro });
    expect(fatiado.pedacos.length).toBe(3 + 3);
    const junto = juntarRegistro(structuredClone(fatiado));
    expect(junto.chave).toBe('k');
    expect(isDeepStrictEqual(junto.neutro, neutro)).toBe(true);
    expect([...junto.neutro.V.keys()].slice(0, 3)).toEqual([0, 1, 2]);
  });

  it('o texto mostrado diz a origem e o tempo', () => {
    expect(textoDaExecucao({ origem: 'cache', ms: 41.6 })).toBe('do cache, 42 ms');
    expect(textoDaExecucao({ origem: 'executada', ms: 3120 })).toBe('executada, 3,1 s');
  });
});

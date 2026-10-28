/* rodar-guardas.test.mjs — o gate `bancada:guardas` roda cada guarda no processo dela, diz o nome e o veredito de cada uma, e a
 * falha de uma não esconde as outras. Sem navegador: as guardas daqui são scripts de ensaio num repositório temporário. */
import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GUARDAS, poremSessaoDeLado, rodarGuardas } from './rodar-guardas.mjs';
import { VARIAVEL_DO_NAVEGADOR, VARIAVEL_DO_VITE, abrirNavegador, subirVite } from '../../bancadas/ambiente-das-guardas.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const temporarias = [];
afterEach(() => { while (temporarias.length) rmSync(temporarias.pop(), { recursive: true, force: true }); });

function repositorioDeEnsaio(scripts) {
  const raiz = mkdtempSync(join(tmpdir(), 'rodar-guardas-'));
  temporarias.push(raiz);
  for (const [nome, corpo] of Object.entries(scripts)) writeFileSync(join(raiz, nome), corpo);
  return raiz;
}

const guarda = (nome, script) => ({ nome, script, usa: null });

describe('rodarGuardas', () => {
  it('a falha de uma guarda não esconde as outras, e cada uma sai com o nome e o veredito dela', async () => {
    const repo = repositorioDeEnsaio({
      'a.mjs': "console.log('a conferiu');",
      'b.mjs': "console.error('b achou o defeito'); process.exit(1);",
      'c.mjs': "console.log('c conferiu');",
    });
    const saida = [];
    const { resultados, falhas } = await rodarGuardas({
      guardas: [guarda('guarda:a', 'a.mjs'), guarda('guarda:b', 'b.mjs'), guarda('guarda:c', 'c.mjs')],
      repo, escrever: (t) => saida.push(t),
    });
    const texto = saida.join('');
    expect(resultados.map((r) => [r.nome, r.codigo])).toEqual([['guarda:a', 0], ['guarda:b', 1], ['guarda:c', 0]]);
    expect(falhas.map((r) => r.nome)).toEqual(['guarda:b']);
    expect(texto).toMatch(/✓ guarda:a — ok/);
    expect(texto).toMatch(/✗ guarda:b — FALHOU \(código 1/);
    expect(texto).toMatch(/✓ guarda:c — ok/);
    expect(texto).toContain('b achou o defeito');
    expect(texto).toMatch(/2\/3 guardas verdes.*falharam: guarda:b/);
  });

  it('uma guarda que passa do tempo é interrompida e falha com o nome dela, sem travar as seguintes', async () => {
    const repo = repositorioDeEnsaio({
      'presa.mjs': 'setInterval(() => {}, 1000);',
      'depois.mjs': "console.log('rodou');",
    });
    const saida = [];
    const { resultados } = await rodarGuardas({
      guardas: [guarda('guarda:presa', 'presa.mjs'), guarda('guarda:depois', 'depois.mjs')],
      repo, escrever: (t) => saida.push(t), tempo: 400,
    });
    expect(resultados.find((r) => r.nome === 'guarda:presa')).toMatchObject({ vencido: true, codigo: 124 });
    expect(resultados.find((r) => r.nome === 'guarda:depois').codigo).toBe(0);
    expect(saida.join('')).toMatch(/✗ guarda:presa — FALHOU \(passou de/);
  });

  it('roda só as nomeadas e recusa nome que não existe', async () => {
    const repo = repositorioDeEnsaio({ 'a.mjs': '', 'b.mjs': '' });
    const guardas = [guarda('guarda:a', 'a.mjs'), guarda('guarda:b', 'b.mjs')];
    const { resultados } = await rodarGuardas({ guardas, selecionadas: ['guarda:b'], repo, escrever: () => {} });
    expect(resultados.map((r) => r.nome)).toEqual(['guarda:b']);
    await expect(rodarGuardas({ guardas, selecionadas: ['guarda:x'], repo, escrever: () => {} })).rejects.toThrow(/guarda desconhecida: guarda:x/);
  });

  it('com duas faixas, as duas rodam juntas e o resumo continua na ordem da lista', async () => {
    const repo = repositorioDeEnsaio({
      'lenta.mjs': 'setTimeout(() => {}, 900);',
      'rapida.mjs': '',
    });
    const inicio = Date.now();
    const { resultados } = await rodarGuardas({
      guardas: [guarda('guarda:rapida', 'rapida.mjs'), { ...guarda('guarda:lenta', 'lenta.mjs'), longa: true }, guarda('guarda:outra', 'rapida.mjs')],
      repo, escrever: () => {}, faixas: 2,
    });
    expect(resultados.map((r) => r.nome)).toEqual(['guarda:rapida', 'guarda:lenta', 'guarda:outra']);
    expect(Date.now() - inicio).toBeLessThan(900 + 800);
  });

  it('nenhum navegador sobe quando nenhuma guarda usa um', async () => {
    const repo = repositorioDeEnsaio({ 'amb.mjs': `console.log(JSON.stringify([process.env.${VARIAVEL_DO_VITE} ?? null, process.env.${VARIAVEL_DO_NAVEGADOR} ?? null]));` });
    const saida = [];
    await rodarGuardas({ guardas: [guarda('guarda:amb', 'amb.mjs')], repo, escrever: (t) => saida.push(t) });
    expect(saida.join('')).toContain('[null,null]');
  });
});

describe('a lista de guardas', () => {
  const pacote = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));

  it('cada guarda é um script do package.json que roda o arquivo dela, e o arquivo existe', () => {
    for (const g of GUARDAS) {
      expect(pacote.scripts[g.nome], `script '${g.nome}'`).toContain(g.script);
      expect(existsSync(join(REPO, g.script)), g.script).toBe(true);
    }
  });

  it('o gate é um script e não repete guarda', () => {
    expect(pacote.scripts['bancada:guardas']).toContain('rodar-guardas.mjs');
    expect(new Set(GUARDAS.map((g) => g.nome)).size).toBe(GUARDAS.length);
  });

  it('toda guarda de navegador do package.json está na lista, porque senão nenhum gate a roda', () => {
    const scriptsDeGuarda = Object.entries(pacote.scripts)
      .filter(([, comando]) => /node tools\/(modelar\/guardas\/guarda-|bancadas\/porteiro)/.test(comando))
      .map(([nome]) => nome);
    /* `guarda:acervo` e `guarda:referencial` não abrem navegador e têm gate próprio. */
    const semNavegador = ['guarda:acervo', 'guarda:referencial'];
    const faltando = scriptsDeGuarda.filter((n) => !semNavegador.includes(n) && !GUARDAS.some((g) => g.nome === n));
    expect(faltando, `guarda fora do bancada:guardas: ${faltando.join(', ')}`).toEqual([]);
  });
});

describe('o isolamento da sessão local', () => {
  it('põe de lado a sessão da raiz e de public/ e devolve os dois, e devolver de novo não faz nada', () => {
    const raiz = repositorioDeEnsaio({ 'sessao-ativa.json': '{"a":1}' });
    mkdirSync(join(raiz, 'public'));
    writeFileSync(join(raiz, 'public/sessao-ativa.json'), '{"b":2}');
    const restaurar = poremSessaoDeLado(raiz);
    expect(existsSync(join(raiz, 'sessao-ativa.json'))).toBe(false);
    expect(existsSync(join(raiz, 'public/sessao-ativa.json'))).toBe(false);
    restaurar();
    expect(readFileSync(join(raiz, 'sessao-ativa.json'), 'utf8')).toBe('{"a":1}');
    expect(readFileSync(join(raiz, 'public/sessao-ativa.json'), 'utf8')).toBe('{"b":2}');
    restaurar();
    expect(existsSync(join(raiz, 'sessao-ativa.json.guarda-bak'))).toBe(false);
  });

  it('sem sessão local não faz nada', () => {
    const raiz = repositorioDeEnsaio({});
    expect(() => poremSessaoDeLado(raiz)()).not.toThrow();
  });
});

describe('o ambiente que as guardas dividem', () => {
  const guardar = (variavel, valor) => { const antes = process.env[variavel]; if (valor === undefined) delete process.env[variavel]; else process.env[variavel] = valor; return () => { if (antes === undefined) delete process.env[variavel]; else process.env[variavel] = antes; }; };

  it('com o servidor do gate no ambiente, a guarda usa a porta dele e não fecha o que não abriu', async () => {
    const volta = guardar(VARIAVEL_DO_VITE, '4321');
    try {
      const vite = await subirVite(REPO, { importar: () => { throw new Error('não devia importar o vite'); } });
      expect(vite.port).toBe(4321);
      await expect(vite.close()).resolves.toBeUndefined();
    } finally { volta(); }
  });

  it('com o navegador do gate no ambiente, a guarda se conecta a ele; sem, abre o próprio', async () => {
    const chamadas = [];
    const playwright = { chromium: { connect: async (ws) => { chamadas.push(['connect', ws]); return 'conectado'; }, launch: async (o) => { chamadas.push(['launch', o]); return 'proprio'; } } };
    const volta = guardar(VARIAVEL_DO_NAVEGADOR, 'ws://127.0.0.1:1/x');
    try {
      expect(await abrirNavegador(playwright, { args: ['--a'] })).toBe('conectado');
    } finally { volta(); }
    const sem = guardar(VARIAVEL_DO_NAVEGADOR, undefined);
    try {
      expect(await abrirNavegador(playwright, { args: ['--a'] })).toBe('proprio');
    } finally { sem(); }
    expect(chamadas).toEqual([['connect', 'ws://127.0.0.1:1/x'], ['launch', { args: ['--a'] }]]);
  });
});

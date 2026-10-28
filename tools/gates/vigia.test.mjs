/* vigia.test.mjs — o vigia junta uma rajada de gravações numa rodada, cancela e recomeça quando um arquivo muda no meio, e o verde
   que ele grava faz o seletor decidir "não roda". Repositório temporário e gate de ensaio; nenhum gate real roda. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decidir, fotografar, lerVerdes } from './seletor.mjs';
import { ARQUIVO_DO_ESTADO, criarVigia, ignorado, linhaDaRodada } from './vigia.mjs';

const GATES = ['typecheck', 'build'];
const espera = (ms) => new Promise((r) => { setTimeout(r, ms); });

function repositorio() {
  const raiz = mkdtempSync(join(tmpdir(), 'vigia-'));
  const git = (...a) => execFileSync('git', a, { cwd: raiz });
  git('init', '-q'); git('config', 'user.email', 'x@x'); git('config', 'user.name', 'x');
  mkdirSync(join(raiz, 'src'));
  writeFileSync(join(raiz, 'src', 'a.js'), 'export const a = 1;\n');
  git('add', '-A'); git('commit', '-qm', 'base');
  return raiz;
}

/* O gate de ensaio: anota quem rodou, termina logo e, se `demora` o segura, devolve cancelado assim que o sinal dispara. */
function ensaio({ demora = null } = {}) {
  const chamadas = [];
  const rodar = (gate, { sinal }) => {
    chamadas.push(gate);
    if (demora !== gate || chamadas.filter((c) => c === gate).length > 1) return Promise.resolve({ gate, codigo: 0, arquivo: null });
    return new Promise((resolver) => {
      sinal.addEventListener('abort', () => resolver({ gate, codigo: 143, cancelado: true }), { once: true });
      setTimeout(() => resolver({ gate, codigo: 0, arquivo: null }), 5000);
    });
  };
  return { chamadas, rodar };
}

describe('vigia contínuo', () => {
  it('ignora as pastas de saída e os repositórios de trabalho isolados', () => {
    expect(ignorado('node_modules/x/y.js')).toBe(true);
    expect(ignorado('.git/index')).toBe(true);
    expect(ignorado('tmp/gates/verdes.json')).toBe(true);
    expect(ignorado('dist/a.js')).toBe(true);
    expect(ignorado('.claude/worktrees/agent-1/src/a.js')).toBe(true);
    expect(ignorado('src/a.js')).toBe(false);
    expect(ignorado(['docs', 'x.md'].join('/'))).toBe(false);
  });

  it('uma rajada de gravações vira uma rodada só, depois do silêncio', async () => {
    const raiz = repositorio();
    const { chamadas, rodar } = ensaio();
    const rodadas = [];
    const vigia = criarVigia({ raiz, gates: GATES, silencioMs: 80, rodar, aoTerminar: (r) => rodadas.push(r) });
    for (let i = 0; i < 6; i++) { vigia.mudou('src/a.js'); await espera(20); }
    expect(chamadas).toEqual([]); // ainda dentro do silêncio: 120 ms de rajada, 80 de espera contados da última
    await vigia.ocioso();
    expect(rodadas).toHaveLength(1);
    expect(chamadas).toEqual(GATES);
    const estado = JSON.parse(readFileSync(join(raiz, ARQUIVO_DO_ESTADO), 'utf8'));
    expect(estado).toMatchObject({ rodada: 1, estado: 'ocioso', rodaram: GATES, passaram: GATES, falharam: [], cancelada: false });
    expect(linhaDaRodada(rodadas[0])).toContain('2/2 passaram');
    vigia.parar();
  });

  it('uma mudança durante a rodada cancela o gate em curso e recomeça do começo', async () => {
    const raiz = repositorio();
    const { chamadas, rodar } = ensaio({ demora: 'build' });
    const rodadas = [];
    const vigia = criarVigia({ raiz, gates: GATES, silencioMs: 50, rodar, aoTerminar: (r) => rodadas.push(r) });
    vigia.mudou('src/a.js');
    while (!chamadas.includes('build')) await espera(10); // a primeira rodada está no build, que não termina sozinho
    writeFileSync(join(raiz, 'src', 'a.js'), 'export const a = 2;\n');
    vigia.mudou('src/a.js');
    await vigia.ocioso();
    expect(rodadas.map((r) => [r.rodada, r.cancelada])).toEqual([[1, true], [2, false]]);
    expect(rodadas[0].passaram).toEqual(['typecheck']);
    expect(chamadas).toEqual(['typecheck', 'build', 'typecheck', 'build']);
    // só a foto da segunda rodada ficou guardada: a do arquivo já editado
    expect(lerVerdes(raiz).build.impressao).toBeTruthy();
    expect(decidir('build', fotografar(raiz), lerVerdes(raiz)).rodar).toBe(false);
    vigia.parar();
  });

  it('o verde que o vigia grava faz o seletor decidir que não roda, até o arquivo mudar de novo', async () => {
    const raiz = repositorio();
    const { rodar } = ensaio();
    const vigia = criarVigia({ raiz, gates: GATES, silencioMs: 20, rodar });
    expect(existsSync(join(raiz, 'tmp'))).toBe(false);
    vigia.mudou('src/a.js');
    await vigia.ocioso();
    const verdes = lerVerdes(raiz);
    for (const gate of GATES) expect(decidir(gate, fotografar(raiz), verdes)).toMatchObject({ rodar: false });
    writeFileSync(join(raiz, 'src', 'a.js'), 'export const a = 3;\n');
    for (const gate of GATES) expect(decidir(gate, fotografar(raiz), verdes)).toMatchObject({ rodar: true, motivo: 'algo do que ele lê mudou' });
    // a segunda rodada do vigia roda tudo de novo, e uma terceira sem mudança não roda nada
    const { chamadas, rodar: segundo } = ensaio();
    const outro = criarVigia({ raiz, gates: GATES, silencioMs: 20, rodar: segundo });
    outro.mudou('src/a.js');
    await outro.ocioso();
    expect(chamadas).toEqual(GATES);
    outro.mudou('src/a.js');
    await outro.ocioso();
    expect(chamadas).toEqual(GATES);
    vigia.parar(); outro.parar();
  });

  it('o gate que falha entra no resumo com o caminho da saída, e o que depende do build não roda', async () => {
    const raiz = repositorio();
    const chamadas = [];
    const rodar = async (gate) => { chamadas.push(gate); return gate === 'build' ? { gate, codigo: 1, arquivo: 'tmp/gates/build.log' } : { gate, codigo: 0, arquivo: null }; };
    const rodadas = [];
    const vigia = criarVigia({ raiz, gates: ['build', 'guarda:gesto', 'typecheck'], silencioMs: 10, rodar, aoTerminar: (r) => rodadas.push(r) });
    vigia.mudou('src/a.js');
    await vigia.ocioso();
    expect(chamadas).toEqual(['build', 'typecheck']);
    expect(rodadas[0].falharam).toEqual([{ gate: 'build', saida: 'tmp/gates/build.log' }]);
    expect(linhaDaRodada(rodadas[0])).toContain('FALHARAM: build (tmp/gates/build.log)');
    expect(lerVerdes(raiz).build).toBeUndefined();
    vigia.parar();
  });
});

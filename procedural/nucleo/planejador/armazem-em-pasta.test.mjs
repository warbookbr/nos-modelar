/* armazem-em-pasta.test.mjs — o armazém em disco do cache por prefixo e a memória do host (plano do cache por passo, fatia 4): a
 * gravação ao lado e renomeada, a trava do índice, a memória que só lê quando o código do disco mudou depois da importação, a limpeza
 * das versões velhas e o `descrever` com o cache, que dá a mesma saída e recomeça do estado guardado pelo comando anterior. */
import { existsSync, mkdtempSync, readdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { nucleo } from '../entrada.js';
import { VERSAO_NA_IMPORTACAO, criarArmazemEmPasta, memoriaDoHost } from './armazem-em-pasta.mjs';
import { marcaDaVersao } from './memoria-em-armazem.js';
import { versaoDoCodigoNoDisco } from './versao-do-codigo.mjs';
import { divergenciaDaImpressao } from './impressao-do-neutro.js';
import { descreverPecaReutilizavel } from '../../../tools/modelar/descrever-peca.mjs';

const pastas = [];
const pastaNova = () => { const p = mkdtempSync(join(tmpdir(), 'armazem-em-pasta-')); pastas.push(p); return p; };
afterEach(() => { while (pastas.length) rmSync(pastas.pop(), { recursive: true, force: true }); });
const cubos = (lado2) => Array.from({ length: 6 }, (_, k) => ['cubo', { origemId: k + 1, lado: k === 2 ? lado2 : 1, em: [k * 2, 0, 0] }]);
const rodar = (passos, memoria) => { let executados = 0; const n = nucleo(passos, {}, {}, {}, null, [], { memoria, aoRastrear: () => { executados += 1; } }); return { n, executados }; };

describe('o armazém em pasta', () => {
  it('grava ao lado e renomeia, lê o que gravou e devolve null para o que não existe', () => {
    const a = criarArmazemEmPasta(pastaNova());
    a.gravar('x', Buffer.from('abc'));
    expect(String(a.ler('x'))).toBe('abc');
    expect(a.ler('y')).toBeNull();
    expect(a.listar()).toEqual(['x']);
    a.apagar('x'); a.apagar('x');
    expect(a.listar()).toEqual([]);
  });

  it('a trava roda fn e solta; a trava de outro processo que não solta faz desistir, e a abandonada é tomada', () => {
    const pasta = pastaNova();
    const a = criarArmazemEmPasta(pasta, { esperaDaTravaMs: 100, travaAbandonadaMs: 60_000 });
    let rodou = false;
    a.trancar('i', () => { rodou = true; expect(existsSync(join(pasta, 'i.trava'))).toBe(true); });
    expect(rodou).toBe(true);
    expect(existsSync(join(pasta, 'i.trava'))).toBe(false);
    writeFileSync(join(pasta, 'i.trava'), '');
    expect(() => a.trancar('i', () => {})).toThrow(/não soltou em 100 ms/);
    const velho = (Date.now() - 120_000) / 1000;
    utimesSync(join(pasta, 'i.trava'), velho, velho);
    let tomou = false;
    a.trancar('i', () => { tomou = true; });
    expect(tomou).toBe(true);
  });
});

describe('a memória do host', () => {
  it('a versão é a do código do disco na importação', () => {
    expect(VERSAO_NA_IMPORTACAO).toBe(versaoDoCodigoNoDisco());
  });

  it('entre dois comandos a segunda execução recomeça, e a limpeza apaga o que é de outra versão', () => {
    const pasta = pastaNova();
    writeFileSync(join(pasta, `${marcaDaVersao('outra')}-ponto-velho`), '');
    const primeira = memoriaDoHost({ rotulo: 'r', pasta });
    expect(primeira).toMatchObject({ somenteLeitura: false, limpos: 1 });
    expect(rodar(cubos(1), primeira.memoria).executados).toBe(6);
    const segunda = memoriaDoHost({ rotulo: 'r', pasta });
    const r = rodar(cubos(1), segunda.memoria);
    expect(r.executados).toBe(0);
    expect(divergenciaDaImpressao(r.n, nucleo(cubos(1)))).toBeNull();
    expect(readdirSync(pasta).every((n) => n.startsWith(marcaDaVersao(VERSAO_NA_IMPORTACAO)))).toBe(true);
  });

  it('o processo cujo código no disco mudou depois da importação só lê: recomeça, não guarda e não limpa', () => {
    const pasta = pastaNova();
    rodar(cubos(1), memoriaDoHost({ rotulo: 'r', pasta }).memoria);
    const antes = readdirSync(pasta).sort().join();
    writeFileSync(join(pasta, `${marcaDaVersao('do-disco-novo')}-ponto-x`), '');
    const velho = memoriaDoHost({ rotulo: 'r', pasta, versaoNoDisco: () => 'do-disco-novo' });
    expect(velho).toMatchObject({ somenteLeitura: true, limpos: 0 });
    expect(rodar(cubos(1), velho.memoria).executados).toBe(0);
    /* a edição não guarda o ponto antes da divergência, que a memória que escreve guardaria */
    expect(rodar(cubos(2), velho.memoria).executados).toBe(6);
    const doNovo = `${marcaDaVersao('do-disco-novo')}-ponto-x`;
    expect(readdirSync(pasta).filter((n) => n !== doNovo).sort().join()).toBe(antes);
    expect(readdirSync(pasta).some((n) => n.startsWith(marcaDaVersao('do-disco-novo')))).toBe(true);
  });
});

describe('o descrever com o cache por prefixo', () => {
  it('a segunda descrição recomeça do estado guardado pela primeira e dá a mesma saída; sem o cache, também', async () => {
    const pasta = pastaNova();
    const linhas = [];
    const descrever = (cachePorPrefixo) => descreverPecaReutilizavel({ peca: 'braco-robotico/elo-punho-4', cachePorPrefixo, pastaDoCachePorPrefixo: pasta, aoProgredir: (l) => linhas.push(l), intervaloDoProgressoMs: 0 });
    const fria = await descrever(true);
    expect(fria.codigo).toBe(0);
    expect(readdirSync(pasta).some((n) => n.includes('-ponto-'))).toBe(true);
    const quente = await descrever(true);
    expect(quente.stdout).toBe(fria.stdout);
    expect(linhas.some((l) => /cache por prefixo: recomeçou de um estado guardado/.test(l))).toBe(true);
    const sem = await descrever(false);
    expect(sem.stdout).toBe(fria.stdout);
  }, 120_000);
});

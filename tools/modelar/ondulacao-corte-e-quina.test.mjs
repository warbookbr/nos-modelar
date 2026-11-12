/* ondulacao-corte-e-quina.test.mjs — a ondulação sobre a chapa depois do corte em painéis (a superfície é lida no último passo que ainda tem a
 * gaiola, dito na saída, ou no passo escolhido) e sobre a quina por colunas de apoio (o vinco de nitidez 0 é feição, e não defeito). Sem domínio. */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ondulacaoDaReceita, superficiesDaReceita } from './ondulacao-da-superficie.mjs';
import { receitaDaDobra } from './fixtures/dobra-por-apoio.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const area = mkdtempSync(join(tmpdir(), 'ondulacao-corte-'));

describe('a quina por colunas de apoio', () => {
  it('sem declaração a quina é desvio de milímetros; com o vinco de nitidez 0 ela é feição e a chapa sai sem falha', () => {
    const sem = ondulacaoDaReceita(receitaDaDobra({ declarar: 'nenhum' })).superficies[0];
    expect(sem.desvioMm.maximo).toBeGreaterThan(5);
    expect(sem.desvioMm.vertices).toBeGreaterThan(2000);
    expect(sem.arestasDeQuinaDeclarada).toBe(0);
    const com = ondulacaoDaReceita(receitaDaDobra({ declarar: 'nitidez0' }));
    const s = com.superficies[0];
    expect(s.arestasDeQuinaDeclarada).toBe(64);
    expect(s.falhas).toEqual([]);
    expect(s.desvioMm.maximo).toBeLessThan(0.3);
    expect(com.foraDasFeicoes).toBe(0);
    expect(com.juntoDasFeicoes).toBe(s.junto.length);
    expect(com.leitura.join(' ')).toMatch(/64 aresta\(s\) de quina por colunas de apoio \(vinco de nitidez 0\) tratadas como feição/);
    expect(com.leitura.at(-1)).toBe(`0 falha(s) fora das feições e ${s.junto.length} junto delas`);
  });

  it('o vinco vivo declarado continua como era, e o de nitidez 0 não muda a malha que a receita entrega', () => {
    const viva = ondulacaoDaReceita(receitaDaDobra({ declarar: 'viva' })).superficies[0];
    expect(viva.arestasDeQuinaDeclarada).toBe(0);
    const [a] = superficiesDaReceita(receitaDaDobra({ declarar: 'nitidez0' }));
    const [b] = superficiesDaReceita(receitaDaDobra({ declarar: 'nenhum' }));
    expect(a.vertices).toEqual(b.vertices);
    expect(a.faces).toEqual(b.faces);
  });
});

describe('a chapa depois do corte', () => {
  const comCorte = (extra = {}) => receitaDaDobra({ declarar: 'nitidez0', corte: true, ...extra });

  it('lê a superfície no último passo que ainda tem a gaiola e diz qual passo a tirou', () => {
    const r = ondulacaoDaReceita(comCorte());
    const [s] = r.superficies;
    expect(s).toMatchObject({ passo: 0, medidoNoPasso: 2, escolhaDoPasso: 'padrão', tiradoPeloPasso: { passo: 3, op: 'subtrair' } });
    expect(r.falhas).toBe(0);
    expect(r.leitura[0]).toMatch(/superfície do passo 0, lida no passo 2 \(o último passo que ainda tem a gaiola; o passo 3, subtrair, tira vértices dela; escolha outro com --passo=<n>\)/);
    /* é a mesma superfície da chapa sem o corte */
    const sem = ondulacaoDaReceita(receitaDaDobra({ declarar: 'nitidez0' })).superficies[0];
    expect(s.vertices).toBe(sem.vertices);
    expect(s.desvioMm).toEqual(sem.desvioMm);
  });

  it('a escolha explícita do passo vale, e o passo depois do corte é recusado com o vértice', () => {
    const [s] = superficiesDaReceita(comCorte(), { passo: 1 });
    expect(s).toMatchObject({ medidoNoPasso: 1, escolhaDoPasso: 'explícita', tiradoPeloPasso: null });
    expect(ondulacaoDaReceita(comCorte(), { passo: 1 }).leitura[0]).toMatch(/lida no passo 1 \(escolha explícita\)/);
    expect(() => superficiesDaReceita(comCorte(), { passo: 3 })).toThrow(/não está na malha depois do passo 3; um passo até ele o tirou/);
    expect(() => superficiesDaReceita(comCorte(), { passo: 99 })).toThrow(/depois do passo 99/);
  });

  it('a lâmina de gaiola sem subdivisão que o corte consumiu fica fora da leitura, dita', () => {
    const r = ondulacaoDaReceita(comCorte({ lamina: true }));
    expect(r.superficies.map((s) => s.passo)).toEqual([0]);
    expect(r.puladas).toEqual([{ passo: 1, motivo: 'gaiola sem subdivisão (niveis 0): a faceta é a forma, e não superfície a medir' }]);
    expect(r.leitura.join(' ')).toMatch(/fora da leitura: passo 1 \(gaiola sem subdivisão/);
    expect(r.superficies[0]).toMatchObject({ passo: 0, medidoNoPasso: 3, tiradoPeloPasso: { passo: 4, op: 'subtrair' } });
  });

  it('o comando diz a leitura no stderr e traz o JSON, com --passo', () => {
    const arquivo = join(area, 'corte.mjs');
    writeFileSync(arquivo, `export default ${JSON.stringify(comCorte())};\n`);
    const r = spawnSync(process.execPath, [join(AQUI, 'ondulacao-da-superficie.mjs'), arquivo], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/lida no passo 2 \(o último passo que ainda tem a gaiola/);
    expect(JSON.parse(r.stdout)).toMatchObject({ falhas: 0, foraDasFeicoes: 0 });
    const e = spawnSync(process.execPath, [join(AQUI, 'ondulacao-da-superficie.mjs'), arquivo, '--passo=1'], { encoding: 'utf8' });
    expect(JSON.parse(e.stdout).superficies[0].escolhaDoPasso).toBe('explícita');
    expect(spawnSync(process.execPath, [join(AQUI, 'ondulacao-da-superficie.mjs'), arquivo, '--passo=x'], { encoding: 'utf8' }).status).toBe(1);
  });
});

describe('a gaiola de niveis 0 que a união consome', () => {
  /* a faixa do forro de um vão: um prisma de faces planas e aresta viva, posto como está e unido a outro. A união não tira os vértices dela da malha, e a leitura as lia
     como superfície (204 falhas nas arestas vivas das dez faixas do forro do sedã, atrito 10 do RECEITA.md). */
  const prisma = (dx) => ({
    vertices: Array.from({ length: 8 }, (_, k) => [dx + (k & 1 ? 0.1 : 0), k & 2 ? 0.05 : 0, k & 4 ? 0.01 : 0]),
    faces: [[0, 2, 3, 1], [4, 5, 7, 6], [0, 1, 5, 4], [2, 6, 7, 3], [0, 4, 6, 2], [1, 3, 7, 5]],
  });
  const receita = () => {
    const [a, b] = [prisma(0), prisma(0.3)];
    const nome = (id, k) => `f${id}_${k}`;
    const topo = {}; const passos = [];
    [[1, a], [2, b]].forEach(([id, g]) => {
      g.vertices.forEach((v, k) => { topo[nome(id, k)] = v; });
      passos.push(['subdivisao', { origemId: id, vertices: g.vertices.map((_, k) => nome(id, k)), faces: g.faces.map((f) => f.map((k) => nome(id, k))), niveis: 0 }]);
    });
    passos.push(['unir', { origemId: 3, solidos: [{ origem: { op: 'subdivisao', id: 1 } }, { origem: { op: 'subdivisao', id: 2 } }] }]);
    return { PARAMS: {}, TOPO: topo, PASSOS: passos };
  };

  it('fica fora da leitura mesmo com os vértices na malha final, dita, e a peça não ganha falha', () => {
    const r = ondulacaoDaReceita(receita());
    expect(r.superficies).toEqual([]);
    expect(r.puladas.map((x) => x.passo)).toEqual([0, 1]);
    expect(r.falhas).toBe(0);
    expect(r.leitura.join(' ')).toMatch(/fora da leitura: passo 0 \(gaiola sem subdivisão \(niveis 0\)/);
  });
});

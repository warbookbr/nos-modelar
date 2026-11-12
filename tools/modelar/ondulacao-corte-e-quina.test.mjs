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
    expect(r.puladas).toEqual([{ passo: 1, motivo: 'gaiola sem subdivisão (niveis 0) que um passo posterior consumiu' }]);
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

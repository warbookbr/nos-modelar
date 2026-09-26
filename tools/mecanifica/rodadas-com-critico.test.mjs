/* rodadas-com-critico.test.mjs — o aceite humano grava quem, quando, a última
   nota, os defeitos abertos e as pendências, fecha a série, recusa aceite sem
   autor ou sem rodada e vai junto para o arquivo na nova série. */
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { acaoDaPasta, aceitar, lerAceite, novaSerie, registrarRodada } from './rodadas-com-critico.mjs';

let pasta;
const nova = () => { pasta = join(mkdtempSync(join(tmpdir(), 'rodadas-')), 'x.rodadas'); return pasta; };
afterEach(() => { if (pasta) rmSync(join(pasta, '..'), { recursive: true, force: true }); });
const defeito = [{ parte: 'antebraco', problema: 'borda serrilhada' }];
const registrar = (p, nota) => registrarRodada(p, { campo: 'regioes', julgado: {} }, { nota, defeitos: nota < 9 ? defeito : [] });

describe('aceite humano', () => {
  it('recusa sem --por e sem rodada registrada', () => {
    const p = nova();
    expect(() => aceitar(p, { por: 'pessoa' })).toThrow(/ao menos uma rodada/);
    registrar(p, 7);
    expect(() => aceitar(p, { por: '  ' })).toThrow(/--por/);
    expect(lerAceite(p)).toBeNull();
  });

  it('grava o aceite e fecha a série com defeito aberto', () => {
    const p = nova();
    registrar(p, 7);
    expect(acaoDaPasta(p).acao).toBe('desenhar');
    const { aceite, proxima } = aceitar(p, { por: 'pessoa, 2026-09-26: aceita', pendencias: 'borda', quando: '2026-09-26' });
    expect(aceite).toEqual({ por: 'pessoa, 2026-09-26: aceita', quando: '2026-09-26', rodada: 1, nota: 7, defeitos: defeito, pendencias: 'borda' });
    expect(proxima).toMatchObject({ acao: 'fechou', aceite: true });
    expect(acaoDaPasta(p).motivo).toMatch(/aceite humano/);
    expect(() => registrar(p, 8)).toThrow(/não cabe rodada nova/);
    expect(() => aceitar(p, { por: 'outra' })).toThrow(/já tem aceite/);
  });

  it('vale sobre série já fechada e vai junto na nova série', () => {
    const p = nova();
    registrar(p, 9);
    aceitar(p, { por: 'pessoa', pendencias: 'punho', quando: 'q' });
    expect(lerAceite(p)).toMatchObject({ nota: 9, defeitos: [], pendencias: 'punho' });
    const destino = novaSerie(p, 'pessoa');
    expect(JSON.parse(readFileSync(join(destino, 'aceite.json'), 'utf8')).pendencias).toBe('punho');
    expect(existsSync(join(p, 'aceite.json'))).toBe(false);
    expect(acaoDaPasta(p).acao).toBe('desenhar');
  });
});

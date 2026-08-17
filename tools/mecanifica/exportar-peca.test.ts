/* Exportação: contrato do artefato e estado sem catálogo publicado. */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
// @ts-expect-error — serviço MJS exercitado pelo contrato de exportação.
import { conferirPublicadas, exportarPeca, gravarPublicadas, lerPecaResolvida, FORMATO, VERSAO } from './exportar-peca.mjs';

const receita = {
  meta: { nome: 'fixture-exportacao', tipo: 'objeto', desc: 'fixture privada', fechada: true },
  PASSOS: [
    ['cubo', { origemId: 1, lado: 1 }],
    ['parte', { nome: 'corpo', sel: { origem: { op: 'cubo', id: 1 } } }],
  ],
};

describe('exportação e manifesto vazio', () => {
  it('exporta uma receita explícita de forma determinística e reexecutável', async () => {
    const a = await exportarPeca('fixture-exportacao', { modulo: receita });
    const b = await exportarPeca('fixture-exportacao', { modulo: receita });
    expect(a.texto).toBe(b.texto);
    expect(a.dado).toMatchObject({ formato: FORMATO, versao: VERSAO, peca: 'fixture-exportacao' });
    expect(a.dado.meta).toEqual({ nome: 'fixture-exportacao' });
    expect(a.dado.partes).toEqual(['corpo']);
    expect(a.dado.V).toEqual(a.doNucleo.V);
    expect(a.dado.F).toEqual(a.doNucleo.F);
    expect(Object.keys(lerPecaResolvida(a.dado).partes)).toEqual([]);
  });

  it('recusa receita com órfão e capacidade não transportável', async () => {
    await expect(exportarPeca('fixture-invalida', {
      modulo: { ...receita, PASSOS: [...receita.PASSOS, ['moveV', { v: 999, d: [1, 0, 0] }]] },
    })).rejects.toThrow(/órfão/);
  });

  it('grava catálogo vazio sem apagar nem inventar artefatos', async () => {
    const destino = mkdtempSync(`${tmpdir()}/mecanifica-exportacao-`);
    try {
      await gravarPublicadas([], destino);
      expect(readdirSync(destino)).toEqual(['manifesto.json']);
      const manifesto = JSON.parse(readFileSync(`${destino}/manifesto.json`, 'utf8'));
      expect(manifesto.pecas).toEqual([]);
      expect(await conferirPublicadas([], destino)).toEqual([]);
    } finally {
      rmSync(destino, { recursive: true, force: true });
    }
  });
});

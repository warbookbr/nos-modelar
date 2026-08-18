/* Exportação: contrato do artefato e estado sem catálogo publicado. */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
// @ts-expect-error — serviço MJS exercitado pelo contrato de exportação.
import { conferirPublicadas, exportarPeca, gravarPublicadas, lerPecaResolvida, FORMATO, VERSAO } from './exportar-peca.mjs';
// @ts-expect-error — SDK nativo de prova exercitado pela porta oficial.
import { REGISTRO_OPERACOES, criarRegistroComExtensoes } from '../../prototipos/procedural/v3/motor/oficina.js';
// @ts-expect-error — extensão nativa de prova.
import { MANIFESTO } from '../../prototipos/procedural/v3/extensoes/prisma-triangular/manifesto.js';
// @ts-expect-error — extensão nativa de prova.
import { implementar } from '../../prototipos/procedural/v3/extensoes/prisma-triangular/implementacao.js';

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

  it('exporta extensão pelo registro explícito e distingue sua configuração na impressão da receita', async () => {
    const registroOperacoes = criarRegistroComExtensoes({
      registroBase: REGISTRO_OPERACOES,
      extensoes: [{ manifesto: MANIFESTO, implementacao: implementar }],
    });
    const prisma = {
      meta: { nome: 'prisma privado', tipo: 'objeto', fechada: true },
      PASSOS: [
        ['prismaTriangular', { raio: 0.5, altura: 1 }],
        ['parte', { nome: 'cunha', sel: { tudo: true } }],
      ],
    };
    const comExtensao = await exportarPeca('prisma-privado', { modulo: prisma, registroOperacoes });
    await expect(exportarPeca('prisma-privado', { modulo: prisma })).rejects.toThrow(/órfão/);
    expect(comExtensao.dado.partes).toEqual(['cunha']);
    expect(comExtensao.dado.receita).not.toBe((await exportarPeca('fixture-exportacao', { modulo: receita })).dado.receita);
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

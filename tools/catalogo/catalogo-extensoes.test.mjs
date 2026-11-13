/* catalogo-extensoes.test.mjs — o catálogo gerado traz as cinco extensões de procedural/extensoes/, marcadas como extensão e com a ligação, e o schema do catálogo as aceita. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { REGISTRO_OPERACOES } from '../../procedural/nucleo/entrada.js';

const GERADO = join(fileURLToPath(new URL('../..', import.meta.url)), 'docs/modelar/gerado');
const ler = (nome) => JSON.parse(readFileSync(join(GERADO, nome), 'utf8'));
const NOMES = ['articulacao', 'casca', 'chapaDobrada', 'estruturaDeBarras', 'prismaTriangular'];

describe('catálogo gerado: extensões', () => {
  const catalogo = ler('catalogo-capacidades.json');

  it('traz as cinco extensões, marcadas, com intenção, schema, obrigatórios e a ligação', () => {
    expect(catalogo.extensoes.map((e) => e.nome).sort()).toEqual(NOMES);
    for (const e of catalogo.extensoes) {
      expect(e.extensao).toBe(true);
      expect(e.uso.intencao.length).toBeGreaterThan(10);
      expect(e.uso.schema).toBe(`mecanifica.argumentos.${e.nome}@1`);
      expect(Array.isArray(e.uso.obrigatorios)).toBe(true);
      expect(e.ligacao.como).toContain('criarRegistroComExtensoes');
      expect(e.ligacao.manifesto).toMatch(/^procedural\/extensoes\/[a-z-]+\/manifesto\.js$/);
    }
  });

  it('mantém as operações do registro base, sem misturar as extensões', () => {
    expect(catalogo.operacoes).toHaveLength(REGISTRO_OPERACOES.listar().length);
    expect(catalogo.operacoes.map((o) => o.nome)).not.toEqual(expect.arrayContaining(['casca']));
    expect(catalogo.assinatura).toBe(REGISTRO_OPERACOES.assinatura);
    expect(catalogo.assinaturaComExtensoes).not.toBe(catalogo.assinatura);
  });

  it('o schema do catálogo valida o catálogo, extensões incluídas', () => {
    const validar = new Ajv2020({ strict: false }).compile(ler('catalogo-capacidades.schema.json'));
    expect(validar(catalogo), JSON.stringify(validar.errors)).toBe(true);
  });

  it('schemas-operacoes.json traz as mesmas cinco extensões, sem mudar o total do registro base', () => {
    const usos = ler('schemas-operacoes.json');
    expect(usos.total).toBe(REGISTRO_OPERACOES.listar().length);
    expect(usos.extensoes.map((e) => e.nome).sort()).toEqual(NOMES);
    expect(usos.totalExtensoes).toBe(5);
  });
});

/* Provas da autoria declarativa de receita sem JavaScript do agente. */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  aplicarAutoriaReceita, confirmarAutoriaReceita, executarReceitaDeclarativa,
  observarAutoriaReceita, planejarAutoriaReceita,
// @ts-ignore — serviço JavaScript exercitado pelo contrato.
} from './autoria-receita.mjs';
// @ts-expect-error — fixture experimental JavaScript.
import * as eixo from '../../autoria-assistida/experimentos/autoria-geometrica-do-zero/receitas/eixo-guia.js';

function receita(fim = 0.015) {
  return {
    formato: 'mecanifica.receita-declarativa', versao: 1, id: 'eixo-guia',
    params: { ...eixo.PARAMS, fim, comprimento: fim - eixo.PARAMS.inicio },
    topo: eixo.TOPO, passos: eixo.PASSOS, materiais: eixo.MATERIAIS,
    aliases: eixo.ALIASES, meta: { nome: 'eixo-guia', desc: 'eixo declarativo' },
  };
}
const capturar = async ({ montagem }: any) => ({ ok: true, resultado: { capturas: ['isometrica', 'direita'].map((nome) => ({ nome, enquadramento: { valida: true, cortado: false }, instancias: montagem.instancias.map((i: any) => i.caminho) })) } });
const revalidar = async () => ({ cobertura: 'catalogo-explicito', raizes: [{ id: 'conjunto', estado: 'aprovada' }] });

describe('autoria declarativa de receita', () => {
  it('executa dado puro e preserva identidades e portas', () => {
    const resultado = executarReceitaDeclarativa(receita());
    expect(resultado.resumo.partes).toEqual(['ombro']);
    expect(resultado.resumo.portas).toEqual(['hasteNoSuporte']);
    expect(resultado.resumo.faces).toBeGreaterThan(0);
  });

  it('planeja sem escrita, confirma, inspeciona e aplica revisão imutável', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'mecanifica-receita-'));
    try {
      const plano = planejarAutoriaReceita({ receita: receita() });
      expect(await observarAutoriaReceita({ raiz, id: 'eixo-guia' })).toEqual({ revisao: null, receita: null });
      const confirmado = confirmarAutoriaReceita(plano);
      const aplicado = await aplicarAutoriaReceita({ raiz, plano: confirmado, capturar, revalidar });
      expect(aplicado.estado).toBe('aplicado');
      expect(aplicado.visual.map((v: any) => v.nome)).toEqual(['isometrica', 'direita']);
      expect((await observarAutoriaReceita({ raiz, id: 'eixo-guia' })).revisao).toBe(aplicado.revisao);
    } finally { rmSync(raiz, { recursive: true, force: true }); }
  });

  it('recusa função, confirmação divergente e órfão', () => {
    expect(() => executarReceitaDeclarativa({ ...receita(), meta: { nome: 'eixo-guia', executar() {} } })).toThrow(/valores JSON/);
    const plano = planejarAutoriaReceita({ receita: receita() });
    expect(() => confirmarAutoriaReceita(plano, { formato: 'mecanifica.plano-autoria-receita', versao: 1, id: 'eixo-guia', pai: null, objeto: '0'.repeat(64), commit: '0'.repeat(64) })).toThrow(/confirmação/);
    expect(() => executarReceitaDeclarativa({ ...receita(), passos: [...receita().passos, ['parte', { nome: 'ausente', sel: { origem: { op: 'cilindro', id: 999999 } } }]] })).toThrow(/órfão/);
  });

  it('bloqueia publicação quando dependente falha', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'mecanifica-receita-'));
    try {
      const plano = confirmarAutoriaReceita(planejarAutoriaReceita({ receita: receita(0.035) }));
      await expect(aplicarAutoriaReceita({ raiz, plano, capturar, revalidar: async () => ({ cobertura: 'catalogo-explicito', raizes: [{ id: 'conjunto', estado: 'falhou' }] }) })).rejects.toMatchObject({ codigo: 'revalidacao-recusada' });
      expect((await observarAutoriaReceita({ raiz, id: 'eixo-guia' })).revisao).toBeNull();
    } finally { rmSync(raiz, { recursive: true, force: true }); }
  });
});

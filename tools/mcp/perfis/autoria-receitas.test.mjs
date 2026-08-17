/* Contrato fino da porta MCP de autoria declarativa. */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as eixo from '../../../autoria-assistida/experimentos/autoria-geometrica-do-zero/receitas/eixo-guia.js';
import { observarReceita, planejarReceita } from './autoria-receitas.mjs';

const documento = {
  formato: 'mecanifica.receita-declarativa', versao: 1, id: 'eixo-guia',
  params: eixo.PARAMS, topo: eixo.TOPO, passos: eixo.PASSOS,
  materiais: eixo.MATERIAIS, aliases: eixo.ALIASES,
  meta: { nome: 'eixo-guia', desc: 'eixo declarativo' },
};
function contexto(raiz, autorizadas = ['eixo-guia']) {
  return { autoria: { configurado: true, raizRepositorio: raiz, receitasAutorizadas: new Set(autorizadas) } };
}

describe('perfil MCP de autoria de receitas', () => {
  it('observa e planeja sem expor bytes privados ou caminhos', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'mecanifica-mcp-receita-'));
    try {
      expect(await observarReceita({ id: 'eixo-guia' }, contexto(raiz))).toMatchObject({ ok: true, resultado: { revisao: null } });
      const resultado = await planejarReceita({ id: 'eixo-guia', revisaoObservada: null, receita: documento }, contexto(raiz));
      expect(resultado).toMatchObject({ ok: true, resultado: { plano: { id: 'eixo-guia' } } });
      expect(JSON.stringify(resultado)).not.toContain('objetoBytes');
      expect(JSON.stringify(resultado)).not.toContain(raiz);
    } finally { rmSync(raiz, { recursive: true, force: true }); }
  });

  it('recusa id não autorizado e documento com identidade divergente', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'mecanifica-mcp-receita-'));
    try {
      expect(await observarReceita({ id: 'eixo-guia' }, contexto(raiz, []))).toMatchObject({ ok: false, erro: { codigo: 'receita_nao_autorizada' } });
      expect(await planejarReceita({ id: 'outra', revisaoObservada: null, receita: documento }, contexto(raiz, ['outra']))).toMatchObject({ ok: false, erro: { codigo: 'identidade_divergente' } });
    } finally { rmSync(raiz, { recursive: true, force: true }); }
  });
});

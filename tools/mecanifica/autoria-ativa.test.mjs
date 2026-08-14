import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as eixo from '../../autoria-assistida/experimentos/autoria-geometrica-do-zero/receitas/eixo-guia.js';
import { planejarAutoriaMontagem } from './autoria-montagem.mjs';
import { planejarAutoriaReceita } from './autoria-receita.mjs';
import { criarProvedoresAutoriaAtiva } from './autoria-ativa.mjs';
import { materializarRevisaoAutoria, planejarRevisaoAutoria } from './repositorio-autoria.mjs';

const receita = {
  formato: 'mecanifica.receita-declarativa', versao: 1, id: 'eixo-guia',
  params: eixo.PARAMS, topo: eixo.TOPO, passos: eixo.PASSOS,
  materiais: eixo.MATERIAIS, aliases: eixo.ALIASES,
  meta: { nome: 'eixo-guia', desc: 'fixture de autoria ativa' },
};
const montagem = {
  formato: 'mecanifica.montagem', versao: 1, id: 'conjunto-eixo',
  instancias: [{ id: 'eixo', alvo: { tipo: 'peca', ref: 'eixo-guia' } }],
};

describe('provedores de autoria ativa', () => {
  it('entregam somente revisões autorizadas e anunciam sua origem', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'mecanifica-autoria-ativa-'));
    try {
      const planoReceita = planejarAutoriaReceita({ receita });
      const planoMontagem = planejarAutoriaMontagem({ entidade: 'conjunto-eixo', montagem });
      await materializarRevisaoAutoria({ raiz, plano: planoReceita.repositorio });
      await materializarRevisaoAutoria({ raiz, plano: planoMontagem.repositorio });
      const provedores = criarProvedoresAutoriaAtiva({
        raizRepositorio: raiz,
        montagensAutorizadas: ['conjunto-eixo'],
        receitasAutorizadas: ['eixo-guia'],
      });

      await expect(provedores.carregarMontagem('conjunto-eixo')).resolves.toMatchObject({ id: 'conjunto-eixo' });
      await expect(provedores.carregarPeca('eixo-guia')).resolves.toMatchObject({ peca: 'eixo-guia' });
      await expect(provedores.carregarMontagem('outra')).resolves.toBeNull();
      await expect(provedores.carregarPeca('outra')).resolves.toBeNull();
      await expect(provedores.estado()).resolves.toMatchObject({
        formato: 'mecanifica.autoria-ativa', versao: 1,
        montagens: [{ id: 'conjunto-eixo', fonte: 'revisao-ativa' }],
        receitas: [{ id: 'eixo-guia', fonte: 'revisao-ativa' }],
      });
    } finally { rmSync(raiz, { recursive: true, force: true }); }
  });

  it('não mascara snapshot ativo inválido com ausência de revisão', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'mecanifica-autoria-ativa-'));
    try {
      const invalido = planejarRevisaoAutoria({
        entidade: 'receita-eixo-guia',
        conteudo: { 'receita.json': '{"formato":"invalido"}\n' },
      });
      await materializarRevisaoAutoria({ raiz, plano: invalido });
      const provedores = criarProvedoresAutoriaAtiva({
        raizRepositorio: raiz,
        receitasAutorizadas: ['eixo-guia'],
      });
      await expect(provedores.carregarPeca('eixo-guia')).rejects.toMatchObject({ codigo: 'snapshot-invalido' });
    } finally { rmSync(raiz, { recursive: true, force: true }); }
  });
});

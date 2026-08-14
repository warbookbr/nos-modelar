/* Prova R04: consumidor caixa-preta, nova sessão e escrita segura por IDs. */

import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { criarCampanhaRevalidacao } from '../../../src/autoria/protocolo-revalidacao.js';
import { persistirCampanhaRevalidacao } from '../../mecanifica/repositorio-revalidacao.mjs';
import { criarFerramentasRevalidacao } from './revalidacao.mjs';

const hash = (letra) => `sha256:${letra.repeat(64)}`;
const commit = (letra) => letra.repeat(64);

function campanha() {
  const mapa = {
    formato: 'mecanifica.mapa-dependencias', versao: 1, universo: { id: 'universo-r04' },
    cobertura: { completa: true }, entidades: [
      { tipo: 'peca', id: 'causa-r04', proveniencia: { fonte: 'base-estatica', revisao: null, sha256: hash('a') } },
      { tipo: 'montagem', id: 'montagem-r04', proveniencia: { fonte: 'revisao-ativa', revisao: commit('b'), sha256: hash('c') } },
    ],
  };
  return criarCampanhaRevalidacao({
    mapa,
    impacto: {
      formato: 'mecanifica.impacto-global', versao: 1, alvo: { tipo: 'peca', id: 'causa-r04' },
      roteiroRevalidacao: [{ ordem: 1, tipo: 'montagem', id: 'montagem-r04', caminhos: [] }],
      raizesAfetadas: ['montagem-r04'], raizesNaoAfetadas: [], cobertura: { completa: true, universo: 'universo-r04' },
    },
    causa: { tipo: 'peca', id: 'causa-r04', revisao: null, sha256: hash('a') }, mapaSha256: hash('d'),
  });
}

const identidade = (documento) => documento.identidade;

describe('perfil MCP de revalidação — R04', () => {
  it('retoma resumo em nova sessão, sem expor raiz ou caminhos internos', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'mecanifica-mcp-r04-'));
    try {
      const documento = campanha();
      await persistirCampanhaRevalidacao({ raiz, campanha: documento });
      const primeira = criarFerramentasRevalidacao({ raizRepositorio: raiz, podeEscrever: false });
      const segunda = criarFerramentasRevalidacao({ raizRepositorio: raiz, podeEscrever: false });
      expect(primeira.map(({ nome }) => nome)).toEqual(['consultar_campanha_revalidacao', 'consultar_item_revalidacao']);
      const uma = await primeira[0].executar(identidade(documento));
      const outra = await segunda[0].executar(identidade(documento));
      primeira[0].outputSchema.parse(uma);
      expect(outra).toEqual(uma);
      expect(JSON.stringify(uma)).not.toContain(raiz);
      expect(JSON.stringify(uma)).not.toContain('caminhos');
      expect(uma.resultado.totais).toMatchObject({ total: 1, pendentes: 1 });
    } finally { await rm(raiz, { recursive: true, force: true }); }
  });

  it('mantém escrita opt-in e registra resultado usando identidade e CAS', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'mecanifica-mcp-r04-escrita-'));
    try {
      const documento = campanha();
      await persistirCampanhaRevalidacao({ raiz, campanha: documento });
      const ferramentas = criarFerramentasRevalidacao({ raizRepositorio: raiz, podeEscrever: true });
      const registrar = ferramentas.find(({ nome }) => nome === 'registrar_resultado_revalidacao');
      const resposta = await registrar.executar({
        identidade: identidade(documento), versaoEsperada: 0,
        resultado: {
          formato: 'mecanifica.resultado-revalidacao', versao: 1,
          item: { tipo: 'montagem', id: 'montagem-r04' },
          revisaoValidada: { fonte: 'revisao-ativa', revisao: commit('b'), sha256: hash('c') },
          estado: 'aprovado', gates: ['mcp-r04'], diagnostico: null,
        },
      });
      registrar.outputSchema.parse(resposta);
      expect(resposta.ok).toBe(true);
      const leituraNova = criarFerramentasRevalidacao({ raizRepositorio: raiz, podeEscrever: false });
      const resumo = await leituraNova[0].executar(identidade(documento));
      expect(resumo.resultado.itens[0]).toMatchObject({ estado: 'aprovado', versao: 2 });
      expect(JSON.stringify(resposta)).not.toContain(raiz);
    } finally { await rm(raiz, { recursive: true, force: true }); }
  });
});

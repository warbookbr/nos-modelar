/* Provas R04: MCP de autoria só atua com escopo do host e sem paths públicos. */
import { mkdtemp } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { aplicarAutoria, inspecionarAutoria, observarAutoria, planejarAutoria } from './autoria-montagens.mjs';

const montagem = JSON.parse(readFileSync(new URL('../../mecanifica/fixtures/montagens-persistidas/v3-separacao-direcional.json', import.meta.url), 'utf8'));
const peca = JSON.parse(readFileSync(new URL('../../mecanifica/fixtures/pecas-resolvidas/bloco-gabarito.json', import.meta.url), 'utf8'));

describe('perfil MCP opt-in de autoria', () => {
  it('planeja, inspeciona e aplica por ID sem expor o caminho do host', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'mecanifica-mcp-autoria-'));
    const autoria = {
      configurado: true, raizRepositorio: raiz,
      catalogo: { tem: (id) => id === 'gabarito-separacao-direcional', carregadores: () => ({ carregarPeca: async () => peca }) },
    };
    const antes = await observarAutoria({ id: 'gabarito-separacao-direcional' }, { autoria });
    expect(antes).toMatchObject({ ok: true, resultado: { revisao: null } });
    const planejada = await planejarAutoria({ id: 'gabarito-separacao-direcional', revisaoObservada: null, montagem }, { autoria });
    expect(planejada).toMatchObject({ ok: true, resultado: { id: 'gabarito-separacao-direcional' } });
    expect(JSON.stringify(planejada)).not.toContain(raiz);
    const { plano, confirmacao } = planejada.resultado;
    const capturar = async () => ({ ok: true, resultado: { capturas: [
      { nome: 'isometrica', instancias: [['movel'], ['referencia']] },
      { nome: 'direita', instancias: [['referencia'], ['movel']] },
    ] } });
    const inspecionada = await inspecionarAutoria({ plano, confirmacao, alvo: ['movel'] }, { autoria, capturar });
    expect(inspecionada).toMatchObject({ ok: true, resultado: { promocao: { estado: 'aprovado' } } });
    const aplicada = await aplicarAutoria({ plano, confirmacao, alvo: ['movel'] }, { autoria, capturar });
    expect(aplicada).toMatchObject({ ok: true, resultado: { promocao: 'aprovado' } });
    const depois = await observarAutoria({ id: 'gabarito-separacao-direcional' }, { autoria });
    expect(depois.resultado.revisao).toBe(aplicada.resultado.revisao);
  });

  it('recusa ID fora do catálogo e revisão observada velha sem escrever', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'mecanifica-mcp-autoria-'));
    const autoria = { configurado: true, raizRepositorio: raiz, catalogo: { tem: () => false, carregadores: () => ({ carregarPeca: async () => peca }) } };
    await expect(observarAutoria({ id: 'nao-autorizada' }, { autoria })).resolves.toMatchObject({ ok: false, erro: { codigo: 'montagem_nao_encontrada' } });
    const permitida = { ...autoria, catalogo: { ...autoria.catalogo, tem: () => true } };
    await expect(planejarAutoria({ id: 'gabarito-separacao-direcional', revisaoObservada: '0'.repeat(64), montagem }, { autoria: permitida })).resolves.toMatchObject({ ok: false, erro: { codigo: 'revisao_desatualizada' } });
  });
});

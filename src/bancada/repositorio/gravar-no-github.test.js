/* gravar-no-github.test.js — a gravação pela API confere antes de publicar.
 *
 * Os casos guardados são os três jeitos de isto estragar o repositório em
 * silêncio: publicar uma peça que não executa, publicar por cima do commit de
 * outra pessoa, e publicar uma troca que mexeu no número errado. */
import { describe, expect, it, vi } from 'vitest';
import {
  deBase64, gravarParametroNoGitHub, lerConfiguracaoRepositorio,
  paraBase64, salvarConfiguracaoRepositorio,
} from './gravar-no-github.js';

const CONFIG = { dono: 'alguem', repo: 'peca', ramo: 'main', token: 'tok' };
const CAMINHO = 'prototipos/procedural/v3/pecas/prova.js';

const RECEITA = `export const TABELA = {
  /* comentário que precisa sobreviver */
  comprimento: 480,
  raio: 17,
};
export default {
  meta: { nome: 'prova' },
  PARAMS: TABELA,
  TOPO: { origem: 'centro' },
  get PASSOS() { return []; },
};
`;

/* O import de verdade lê um blob, que não existe fora do navegador. Aqui o
   módulo é montado avaliando o texto, que é o que interessa ao teste: se o
   texto novo não for JavaScript válido, isto falha do mesmo jeito. */
function importadorDeTexto(textos) {
  return async (url) => {
    const texto = textos.get(url);
    const params = {};
    const tabela = texto.match(/export const TABELA = \{([\s\S]*?)\n\};/)[1];
    for (const [, chave, valor] of tabela.matchAll(/^\s*(\w+):\s*(-?[\d.]+),/gm)) {
      params[chave] = Number(valor);
    }
    return { default: { meta: { nome: 'prova' }, PARAMS: params, TOPO: {}, PASSOS: [] } };
  };
}

function ambiente(RECEITA_ATUAL = RECEITA, { publicacao } = {}) {
  const textos = new Map();
  const original = globalThis.URL.createObjectURL;
  globalThis.URL.createObjectURL = (blob) => {
    const url = `blob:${Math.random()}`;
    textos.set(url, blob.__texto);
    return url;
  };
  globalThis.URL.revokeObjectURL = () => {};
  const BlobOriginal = globalThis.Blob;
  globalThis.Blob = class {
    constructor(partes) { this.__texto = partes.join(''); }
  };

  const enviados = [];
  const buscar = vi.fn(async (url, opcoes = {}) => {
    if (opcoes.method === 'PUT') {
      enviados.push(JSON.parse(opcoes.body));
      return publicacao ?? { ok: true, status: 200, json: async () => ({ commit: { html_url: 'https://commit' } }) };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ content: paraBase64(RECEITA_ATUAL), sha: 'sha-lido' }),
    };
  });

  return {
    buscar,
    enviados,
    importar: importadorDeTexto(textos),
    restaurar: () => { globalThis.URL.createObjectURL = original; globalThis.Blob = BlobOriginal; },
  };
}

describe('gravar parâmetro pela API do GitHub', () => {
  it('lê, troca, executa a candidata e publica com o sha lido', async () => {
    const a = ambiente();
    const r = await gravarParametroNoGitHub({
      config: CONFIG, caminhoNoRepo: CAMINHO, id: 'comprimento', valor: 540,
      buscar: a.buscar, importar: a.importar,
    });
    a.restaurar();

    expect(r).toMatchObject({ estado: 'aplicado', de: 480, para: 540, commit: 'https://commit' });
    expect(a.enviados).toHaveLength(1);
    /* O `sha` é o do arquivo LIDO: é ele que faz o GitHub recusar se alguém
       commitou no meio. */
    expect(a.enviados[0].sha).toBe('sha-lido');
    expect(a.enviados[0].branch).toBe('main');
    const publicado = deBase64(a.enviados[0].content);
    expect(publicado).toContain('comprimento: 540,');
    expect(publicado).toContain('comentário que precisa sobreviver');
  });

  it('RECUSA quando o arquivo mudou no repositório, e não publica de novo', async () => {
    const a = ambiente(RECEITA, {
      publicacao: { ok: false, status: 409, json: async () => ({ message: 'conflict' }) },
    });
    const r = await gravarParametroNoGitHub({
      config: CONFIG, caminhoNoRepo: CAMINHO, id: 'comprimento', valor: 540,
      buscar: a.buscar, importar: a.importar,
    });
    a.restaurar();
    expect(r.estado).toBe('falha-recuperavel');
    expect(r.motivo).toMatch(/mudou no repositório/);
  });

  it('RECUSA parâmetro não declarado sem chegar a publicar', async () => {
    const a = ambiente();
    const r = await gravarParametroNoGitHub({
      config: CONFIG, caminhoNoRepo: CAMINHO, id: 'espessura', valor: 3,
      buscar: a.buscar, importar: a.importar,
    });
    a.restaurar();
    expect(r.estado).toBe('falha-recuperavel');
    expect(r.declarados).toContain('comprimento');
    expect(a.enviados).toHaveLength(0);
  });

  it('RECUSA sem configuração e valor não numérico', async () => {
    expect((await gravarParametroNoGitHub({ config: null, id: 'x', valor: 1 })).motivo)
      .toMatch(/sem repositório/);
    expect((await gravarParametroNoGitHub({ config: CONFIG, id: 'x', valor: 'dez' })).motivo)
      .toMatch(/número finito/);
  });

  it('guarda e lê a configuração, e trata ausência como não configurado', () => {
    const dados = new Map();
    const armazenamento = {
      getItem: (c) => dados.get(c) ?? null,
      setItem: (c, v) => dados.set(c, v),
    };
    expect(lerConfiguracaoRepositorio({ armazenamento })).toBe(null);
    salvarConfiguracaoRepositorio({ dono: 'a', repo: 'b', token: 't' }, { armazenamento });
    expect(lerConfiguracaoRepositorio({ armazenamento })).toEqual({ dono: 'a', repo: 'b', ramo: 'main', token: 't' });
    /* Sem token não é configuração pela metade, é não configurado: tentar
       gravar assim daria erro do GitHub em vez de aviso claro. */
    salvarConfiguracaoRepositorio({ dono: 'a', repo: 'b' }, { armazenamento });
    expect(lerConfiguracaoRepositorio({ armazenamento })).toBe(null);
  });

  it('sobrevive a acento no texto da receita', () => {
    const texto = 'const avanço = "direção";';
    expect(deBase64(paraBase64(texto))).toBe(texto);
  });
});

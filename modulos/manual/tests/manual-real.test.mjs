/* manual-real.test.mjs — o manual sobre uma montagem do acervo: a lista confere com a contagem independente das instâncias, a saída é igual byte a byte e a opção errada é recusada. */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { listaEmJson, listarPecas } from '../src/lista-de-pecas.js';
import { comoCLI, resolverArquivo } from '../src/manual.mjs';
import { montagemDoPasso, passosDaMontagem } from '../src/passos.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const ARQUIVO = join(AQUI, '../../../procedural/pecas/aviao/montagem.json');

describe('manual sobre uma montagem do acervo', () => {
  it('a lista confere com a contagem independente das instâncias, e a saída é a mesma byte a byte', async () => {
    const { persistida, resolvida } = await resolverArquivo(ARQUIVO);
    const lista = listarPecas(resolvida);
    const dado = JSON.parse(readFileSync(ARQUIVO, 'utf8'));
    const contagemPorReceita = {};
    for (const { alvo } of dado.instancias) contagemPorReceita[alvo.ref] = (contagemPorReceita[alvo.ref] ?? 0) + 1;
    const somaPorReceita = {};
    for (const linha of lista.pecas) somaPorReceita[linha.nome] = (somaPorReceita[linha.nome] ?? 0) + linha.quantidade;
    expect(somaPorReceita).toEqual(contagemPorReceita);
    expect(lista.totalDeInstancias).toBe(dado.instancias.length);
    expect(lista.pecas.every((l) => l.quantidade === l.instancias.length && l.caixaMm.largura > 0)).toBe(true);
    expect(listaEmJson(listarPecas(resolvida))).toBe(listaEmJson(lista));
    const { passos, foraDasEtapas } = passosDaMontagem(resolvida, persistida.etapas);
    expect(passos.flatMap((p) => p.etapas)).toEqual(persistida.etapas);
    expect(passosDaMontagem(resolvida, persistida.etapas, { agrupar: false }).passos.map((p) => p.etapas[0])).toEqual(persistida.etapas);
    expect(foraDasEtapas).toEqual([]);
    const ultimo = montagemDoPasso(resolvida, passos, passos.length - 1);
    expect(ultimo.instancias).toHaveLength(persistida.etapas.length);
    /* a malha original não é pintada */
    const original = resolvida.instancias[0].definicao.neutro;
    expect([...original.F.values()].some((f) => f.cor === '#e8590c')).toBe(false);
  }, 60000);

  it('responde a --ajuda e recusa opção desconhecida com o que era esperado', async () => {
    expect((await comoCLI(['--ajuda'])).texto).toMatch(/--saida=/);
    await expect(comoCLI(['x.json', '--foo'])).rejects.toThrow(/Esperado/);
  });
});

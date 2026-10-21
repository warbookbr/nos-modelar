/* termos-proibidos.test.mjs — o repositório não recebe menção aos termos da lista de hashes.
   A lista (`termos-proibidos.hashes.json`) guarda só sha256, e a mensagem de falha traz caminho e linha, nunca o trecho. */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { carregarHashes, hashesDoTermo, linhasProibidas, palavras, varrerRepositorio } from './termos-proibidos.mjs';

const AQUI = fileURLToPath(new URL('.', import.meta.url));
const REPO = resolve(AQUI, '../..');
const proibidos = carregarHashes(resolve(AQUI, 'termos-proibidos.hashes.json'));

function conjuntos(termo) {
  const h = hashesDoTermo(termo);
  return { separados: new Set(h.separados), unidos: new Set(h.unidos), iniciais: new Set(h.iniciais) };
}

describe('gate de termos proibidos', () => {
  it('a normalização separa por espaço, hífen, sublinhado, ponto e barra e ignora acento e caixa', () => {
    expect(palavras('Água-Viva_do  Mar/arquivo.json')).toEqual(['agua', 'viva', 'do', 'mar', 'arquivo', 'json']);
  });

  it('a varredura reconhece todas as grafias de um termo e ignora palavra parecida e hash longo', () => {
    const exemplo = conjuntos('Alfa Beta');
    expect(linhasProibidas('x\nalfa beta\nAlfa-Beta\nalfa_beta\nALFABETA\nalfabeto\nabcdef0123456789abcdef0123456789alfa', exemplo)).toEqual([2, 3, 4, 5]);
    expect(linhasProibidas('alfa\ngama\nbeta', exemplo)).toEqual([]);
    expect(linhasProibidas('x y 9', conjuntos('xy9'))).toEqual([]);
  });

  it('a lista traz hashes e nenhum termo', () => {
    expect(proibidos.separados.size).toBeGreaterThan(0);
    for (const h of [...proibidos.separados, ...proibidos.unidos, ...proibidos.iniciais]) expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('nenhum arquivo rastreado nem caminho menciona um termo proibido', () => {
    const achados = varrerRepositorio(REPO, proibidos);
    const relato = achados.map(({ caminho, linha }) => (linha ? `${caminho}:${linha}` : `${caminho} (no caminho)`));
    expect(relato, 'menção a termo proibido (caminho:linha)').toEqual([]);
  });
});

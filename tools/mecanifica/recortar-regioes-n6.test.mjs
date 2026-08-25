/* Prova que toda referência regional N6 permanece vinculada à vista completa aprovada. */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recortarRegioesN6 } from './recortar-regioes-n6.mjs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const hash = (conteudo) => createHash('sha256').update(conteudo).digest('hex');

describe('referências regionais N6', () => {
  it('produz oito recortes rastreáveis de quatro regiões da mesma carroceria', () => {
    const manifesto = recortarRegioesN6();
    expect(manifesto.recortes).toHaveLength(8);
    expect(new Set(manifesto.recortes.map((item) => item.regiao))).toEqual(new Set(['dianteira-capô-paralamas', 'cabine-cintura', 'lateral-entrada', 'ombros-deck-traseiro']));
    expect(manifesto.sobreposicoes).toHaveLength(3);
    for (const faixa of manifesto.sobreposicoes) expect(faixa.recortes.every((id) => manifesto.recortes.some((item) => item.id === id))).toBe(true);
    for (const item of manifesto.recortes) {
      const origem = resolve(raiz, 'autoria-assistida', 'alvos', 'n6-cupe-esportivo', item.origem);
      const arquivo = resolve(raiz, 'autoria-assistida', 'alvos', 'n6-cupe-esportivo', item.arquivo);
      expect(hash(readFileSync(origem))).toBe(item.sha256Origem);
      expect(existsSync(arquivo)).toBe(true);
      expect(hash(readFileSync(arquivo))).toBe(item.sha256);
      expect(item.pergunta.length).toBeGreaterThan(20);
    }
  });
});

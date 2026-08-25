/* Evidência do experimento N6.1 reprovado: rastreia os arquivos, não aprova a forma. */
import { describe, expect, it } from 'vitest';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const raiz = new URL('./', import.meta.url);
const alvo = new URL('../../alvos/n6-cupe-esportivo/', raiz);
const manifesto = JSON.parse(await readFile(new URL('manifesto.json', raiz), 'utf8'));
const sha = (b) => createHash('sha256').update(b).digest('hex');

describe('N6.1 blocagem multivista', () => {
  it('mantém cinco comparações pareadas, individuais e vinculadas ao alvo aprovado', async () => {
    expect(manifesto.regra).toMatch(/individualmente/);
    expect(manifesto.carroceria).toMatch(/continua/);
    expect(Object.keys(manifesto.vistas)).toHaveLength(5);
    for (const [nome, vista] of Object.entries(manifesto.vistas)) {
      expect(sha(await readFile(new URL(`vistas/${vista.referencia}`, alvo)))).toBe(vista.hashReferencia);
      expect(vista.iouSilhueta).toBeGreaterThan(.20);
      for (const tipo of ['referencia','render','sobreposicao']) expect((await stat(new URL(`evidencias/${tipo}-${nome}.png`,raiz))).size).toBeGreaterThan(100);
    }
  });
  it('tem carroceria fechada e malha suficiente para não ser uma montagem de caixas', () => {
    expect(manifesto.geometria.vertices).toBeGreaterThan(300);
    expect(manifesto.geometria.triangulos).toBeGreaterThan(450);
    expect(manifesto.geometria.estacoes).toHaveLength(9);
  });
});

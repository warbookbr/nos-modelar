/* partes-de-objeto.test.mjs — um objeto de várias partes é uma pasta com as
   partes dentro de `partes/`, e cada ferramenta acha a parte pelo nome curto
   `objeto/parte`. O teste monta um objeto de duas partes numa raiz temporária e
   prova o resolvedor, a pasta de rodadas e a lista do acervo. */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';
import { lerRodadas, pastaDeRodadas } from './rodada-de-modelagem.mjs';
import { pecasDoAcervo } from './guardas/guarda-acervo.mjs';

let raiz;
let pecas;

beforeAll(() => {
  raiz = mkdtempSync(join(tmpdir(), 'objeto-com-partes-'));
  pecas = join(raiz, 'procedural/pecas');
  for (const parte of ['base', 'anel-cintura']) {
    mkdirSync(join(pecas, 'objeto-de-prova/partes', parte), { recursive: true });
    writeFileSync(join(pecas, 'objeto-de-prova/partes', parte, 'receita.js'), 'export default { PASSOS: [] };\n');
  }
  writeFileSync(join(pecas, 'objeto-de-prova/montagem.json'), '{}\n');
});

afterAll(() => rmSync(raiz, { recursive: true, force: true }));

describe('parte de objeto', () => {
  it('o resolvedor acha a parte pelo nome curto, sem partes/', () => {
    expect(resolverCaminhoReceita('objeto-de-prova/base', { raiz }))
      .toBe(join(pecas, 'objeto-de-prova/partes/base/receita.js'));
  });

  it('as rodadas da parte moram na pasta da parte', () => {
    expect(pastaDeRodadas('objeto-de-prova/anel-cintura', { raiz }))
      .toBe(join(pecas, 'objeto-de-prova/partes/anel-cintura/rodadas'));
  });

  it('o nome com segunda barra ou com .. continua recusado', () => {
    expect(() => pastaDeRodadas('objeto-de-prova/partes/base', { raiz })).toThrow(/não é nome de peça/);
    expect(() => lerRodadas('objeto-de-prova/..', { pasta: raiz })).toThrow(/não é nome de peça/);
    expect(() => lerRodadas('../base', { pasta: raiz })).toThrow(/não é nome de peça/);
  });

  it('o acervo lista a parte pelo mesmo nome curto', () => {
    expect(pecasDoAcervo(pecas)).toEqual(['objeto-de-prova/anel-cintura', 'objeto-de-prova/base']);
  });
});

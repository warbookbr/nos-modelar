/* objeto.test.mjs — a ferramenta lê cada etapa do fluxo no disco e aponta a
   primeira que falta. */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { estadoDoObjeto } from './objeto.mjs';

let acervo;
beforeEach(() => { acervo = mkdtempSync(join(tmpdir(), 'objeto-')); });
afterEach(() => rmSync(acervo, { recursive: true, force: true }));

const rodada = (numero, nota) => ({ numero, regioes: {}, veredito: { nota, defeitos: nota < 9 ? [{ parte: 'a' }] : [] } });

describe('estado do objeto', () => {
  it('sem alinhamento, a próxima etapa é o alinhamento', () => {
    mkdirSync(join(acervo, 'coisa'));
    expect(estadoDoObjeto('coisa', { acervo }).proxima.etapa).toBe('alinhamento');
  });

  it('segue a ordem: mapear as partes, prancha e modelagem', () => {
    const pasta = join(acervo, 'coisa'); const refs = join(pasta, 'referencias');
    mkdirSync(join(refs, 'lateral.regioes.rodadas'), { recursive: true });
    writeFileSync(join(pasta, 'ALINHAMENTO.md'), '# coisa\n');
    writeFileSync(join(pasta, 'montagem.json'), JSON.stringify({ etapas: ['a', 'b'] }));
    writeFileSync(join(refs, 'lateral.regioes.json'), '{}');
    writeFileSync(join(refs, 'lateral.regioes.rodadas', 'rodada-01.json'), JSON.stringify(rodada(1, 7)));
    expect(estadoDoObjeto('coisa', { acervo }).proxima.etapa).toBe('mapear as partes de lateral');

    writeFileSync(join(refs, 'lateral.regioes.rodadas', 'rodada-02.json'), JSON.stringify(rodada(2, 9)));
    expect(estadoDoObjeto('coisa', { acervo }).proxima.etapa).toBe('prancha de lateral');

    writeFileSync(join(refs, 'lateral.prancha.png'), '');
    mkdirSync(join(refs, 'lateral.prancha.rodadas'));
    writeFileSync(join(refs, 'lateral.prancha.rodadas', 'rodada-01.json'), JSON.stringify({ ...rodada(1, 9), regioes: undefined, julgado: {} }));
    writeFileSync(join(pasta, 'montagem.etapas.json'), JSON.stringify({ etapas: [{ instancia: 'a', estado: 'fixa' }, { instancia: 'b', estado: 'aberta' }] }));
    const estado = estadoDoObjeto('coisa', { acervo });
    expect(estado.proxima.etapa).toBe('modelagem por etapa');
    expect(estado.proxima.estado).toMatch(/próxima b/);
    expect(estado.pacotes[0].pronto).toBe(true);
  });
});

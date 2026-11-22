/* ferramentas-por-objeto.test.mjs — a conferência do mapa de ferramentas recusa o estado fora de não, parcial e tem. */
import { describe, expect, it } from 'vitest';
import { conferir } from './ferramentas-por-objeto.mjs';

const dados = (aqui) => ({ ferramentas: { x: { aqui } }, objetos: { Grupo: { objeto: ['x'] } } });
const familias = { Grupo: ['objeto'] };

describe('o estado "aqui" de cada ferramenta', () => {
  it('aceita não, parcial e tem', () => {
    for (const aqui of ['não', 'parcial', 'tem']) expect(conferir(dados(aqui), familias)).toEqual([]);
  });
  it('recusa outro valor, dizendo a ferramenta e o que veio', () => {
    expect(conferir(dados('sim'), familias)).toEqual(['ferramenta x: "aqui" é não, parcial, tem (veio "sim")']);
  });
});

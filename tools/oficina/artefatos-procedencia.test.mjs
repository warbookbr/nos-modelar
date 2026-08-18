/* artefatos-procedencia.test.mjs — prova o artefato neutro e a origem das entidades finais. */
import { describe, expect, it } from 'vitest';
import { TIPO_MALHA_POLIGONAL, grafoDaProcedencia, nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';

describe('artefato neutro e procedência — R04', () => {
  it('tipa a malha sem mudar sua representação compatível', () => {
    const n = nucleo([['cubo', { origemId: 1 }]], {}, {});
    expect(n.artefato).toEqual({ tipo: TIPO_MALHA_POLIGONAL, versao: 1, entidade: 'malha-neutra' });
    expect(n.V.size).toBe(8); expect(n.F.size).toBe(6);
  });

  it('liga vértices e faces finais às operações que os criaram ou alteraram', () => {
    const n = nucleo([['cubo', {}], ['moveV', { v: 0, d: [0, 1, 0] }], ['parte', { faces: [1], nome: 'corpo' }]], {}, {});
    expect(n.procedencia.vertices.find(([id]) => id === 0)[1].map((x) => x.operacao)).toEqual(['mecanifica.operacao.cubo', 'mecanifica.operacao.moveV']);
    expect(n.procedencia.faces.find(([id]) => id === 1)[1].map((x) => x.operacao)).toContain('mecanifica.operacao.parte');
    expect(n.procedencia.partes).toEqual([['corpo', [{ passo: 2, operacao: 'mecanifica.operacao.parte' }]]]);
    expect(grafoDaProcedencia(n.procedencia).arestas).toContainEqual({ de: 0, para: 1 });
  });
});

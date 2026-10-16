/* gates-bateria-curta.test.mjs — a bateria curta só roda quando tudo o que
   mudou é peça ou documento; qualquer outro arquivo, ou não saber o que mudou,
   roda todos os gates. */
import { describe, expect, it } from 'vitest';
import { GATES, GATES_CURTOS, escolherBateria } from '../gates.mjs';

describe('escolha da bateria de gates', () => {
  it('a curta é parte da completa e mantém build e testes', () => {
    expect(GATES_CURTOS.every((g) => GATES.includes(g))).toBe(true);
    expect(GATES_CURTOS).toEqual(expect.arrayContaining(['build', 'test:rapidos', 'test:lentos']));
  });

  it('receita e documento rodam a curta', () => {
    expect(escolherBateria(['procedural/pecas/braco-robotico/partes/ombro/receita.js', 'docs/MAPA.md', 'CLAUDE.md']).bateria).toBe(GATES_CURTOS);
  });

  it('núcleo, ferramenta ou não saber o que mudou rodam tudo', () => {
    expect(escolherBateria(['docs/mecanifica/INDEX.md', 'procedural/nucleo/nucleo.js']).bateria).toBe(GATES);
    expect(escolherBateria(['tools/gates.mjs']).bateria).toBe(GATES);
    expect(escolherBateria(null).bateria).toBe(GATES);
    expect(escolherBateria([]).bateria).toBe(GATES);
  });
});

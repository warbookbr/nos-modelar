/* onde-ondula.test.mjs — a régua de onde a curvatura da superfície limite oscila (fatia 5): o ruído das curvas digitadas sobe as viradas do
 * miolo sobre as da rede sem ruído, a curva declarada lisa vira mais por metro que o miolo, e as classes somam as fileiras inteiras. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { receitaDeProva } from './chapas.mjs';
import { ondeOndula } from './onde-ondula.mjs';

const medir = (nome) => {
  const r = receitaDeProva(nome, { marcarCurvas: true });
  return ondeOndula(executarReceita({ ...r, PASSOS: r.PASSOS.filter(([op]) => op === 'subdivisao') }).neutro.chapas[0]);
};

describe('onde a curvatura oscila', () => {
  it('o ruído sobe as viradas do miolo e da curva, e a curva vira mais por metro que o miolo', () => {
    const sem = medir('rede-sem-ruido'); const com = medir('rede-com-ruido');
    expect(com.classes.miolo.viradasPorM).toBeGreaterThan(sem.classes.miolo.viradasPorM);
    expect(com.classes.curva.viradasPorM).toBeGreaterThan(sem.classes.curva.viradasPorM);
    expect(sem.classes.curva.viradasPorM).toBeGreaterThan(sem.classes.miolo.viradasPorM);
    expect(sem.classes.vinco.comprimentoM).toBe(0);
    const total = Object.values(sem.classes).reduce((t, c) => t + c.comprimentoM, 0);
    /* as fileiras das duas direções do painel de 1 por 0,5 m, a meio de cada face: duas vezes a área sobre o espaçamento, de 1/4 do da gaiola */
    expect(total).toBeGreaterThan(40);
    expect(Object.values(sem.classes).reduce((t, c) => t + (c.parteForaDoVinco ?? 0), 0)).toBeCloseTo(1, 2);
  });
});

/* junta-com-cabo-curso-fino.test.mjs — o curso amostrado mais fino perto das peças: o cabo de 200 mm atravessa a carcaça A só de 157° a 203° (curso de 100° a 260°), e três passos grossos (a 100°, 153,3°, 206,7° e 260°) caem todos fora dessa faixa.
 * Sem o refinamento a conferência dá o curso por livre; com ele, a folga pequena a A nos passos vizinhos divide o intervalo até o passo mínimo e acha a faixa. */
import { describe, expect, it } from 'vitest';
import { conferirCursoDoCabo } from '../../../procedural/familias/cabo/montagem.js';
import { ARRANJOS, prepararJuntaComCabo } from './junta-com-cabo.mjs';

const { execucao, resolvida, declaracao } = prepararJuntaComCabo({ curso: { minimo: 100, maximo: 260 }, passos: 3 });
const pedido = ARRANJOS.atravessa.pedido;

describe('o curso fino perto das peças', () => {
  it('sem refinamento, os quatro passos grossos passam e o cabo que atravessa entre eles não é visto', () => {
    const r = conferirCursoDoCabo(resolvida, declaracao, pedido, execucao, { limiarDeFolga: 0 });
    expect(r.posicoes).toHaveLength(4);
    expect(r.ok).toBe(true);
    expect(r.refino.passosAcrescentados).toBe(0);
  }, 60000);

  it('com o refinamento padrão (2 diâmetros), os passos acrescentados acham a faixa, entre 153,3° e 206,7°', () => {
    const r = conferirCursoDoCabo(resolvida, declaracao, pedido, execucao);
    expect(r.ok).toBe(false);
    const grossos = r.posicoes.filter((p) => !p.fina);
    expect(grossos).toHaveLength(4);
    expect(grossos.every((p) => p.ok)).toBe(true);
    expect(grossos.slice(1, 3).every((p) => p.folgaMinima.valor < 6)).toBe(true);
    expect(r.refino.limiarDeFolga).toBe(6);
    expect(r.refino.passosAcrescentados).toBeGreaterThan(0);
    const achados = r.falhas.map((f) => f.valor);
    expect(achados.length).toBeGreaterThan(0);
    for (const v of achados) { expect(v).toBeGreaterThan(153.4); expect(v).toBeLessThan(206.6); }
    expect(r.falhas.every((f) => f.motivo === 'atravessa' && f.contra === 'carcacaA')).toBe(true);
    /* os passos acrescentados trazem índice fracionário entre os da declaração e o valor do curso na ordem */
    const ordem = r.posicoes.map((p) => p.valor);
    expect([...ordem].sort((a, b) => a - b)).toEqual(ordem);
    expect(r.posicoes.filter((p) => p.fina).every((p) => !Number.isInteger(p.indice))).toBe(true);
    /* a subdivisão pára no passo mínimo (um oitavo do passo da declaração) */
    for (let i = 1; i < ordem.length; i += 1) expect(ordem[i] - ordem[i - 1]).toBeGreaterThanOrEqual(r.refino.passoMinimo - 1e-4);
    expect(r.legivel.some((l) => /atravessa 'carcacaA' a 1[6-9]\d(\.\d+)? graus/.test(l))).toBe(true);
  }, 120000);

  it('recusa o passo mínimo que não é positivo', () => {
    expect(() => conferirCursoDoCabo(resolvida, declaracao, pedido, execucao, { passoMinimo: 0 })).toThrow(/passoMinimo precisa ser positivo/);
  });
});

/* alisar-curvas.test.mjs — a curva de variação mínima linearizada: não mexe no arco, no círculo nem na parábola, tira o ruído, deixa os pontos
 * duros onde estão bit a bit, não passa do limite nem da silhueta, e dá a mesma saída sempre. */
import { describe, expect, it } from 'vitest';
import { alisarPontosDaCurva } from './alisar-curvas.js';

const ANGULO_AUREO = Math.PI * (3 - Math.sqrt(5));
const ruido = (k, amplitude = 2) => amplitude * Math.sin(ANGULO_AUREO * k * 7);
const parabola = (x) => 40 * (1 - ((x - 500) / 500) ** 2);

describe('alisarPontosDaCurva', () => {
  it('o arco de círculo, o círculo fechado e a reta ficam onde estão', () => {
    const arco = Array.from({ length: 11 }, (_, i) => { const t = (i / 10) * (Math.PI / 2); return [1000 * Math.cos(t), 1000 * Math.sin(t), 0]; });
    expect(alisarPontosDaCurva(arco, { tolerancia: 100 }).maiorDeslocamento).toBeLessThan(1e-6);
    for (const n of [12, 24]) {
      const circulo = Array.from({ length: n }, (_, i) => { const t = (i / n) * 2 * Math.PI; return [100 * Math.cos(t), 0, 100 * Math.sin(t)]; });
      expect(alisarPontosDaCurva(circulo, { fechada: true, tolerancia: 100 }).maiorDeslocamento).toBeLessThan(1e-6);
    }
    const reta = Array.from({ length: 8 }, (_, i) => [i * 30, i * 10, -i * 5]);
    expect(alisarPontosDaCurva(reta).maiorDeslocamento).toBeLessThan(1e-9);
  });

  it('a parábola com ruído de 2 mm volta a menos de 0,1 mm da parábola, com o nó do meio fixo bit a bit', () => {
    const dados = Array.from({ length: 11 }, (_, i) => [i * 100, parabola(i * 100) + (i === 0 || i === 5 || i === 10 ? 0 : ruido(i)), 0]);
    const r = alisarPontosDaCurva(dados, { duros: [5], tolerancia: 2.5 });
    expect(r.duros).toEqual([0, 5, 10]);
    for (const i of r.duros) expect(r.pontos[i]).toEqual(dados[i]);
    const antes = Math.max(...dados.map((p) => Math.abs(p[1] - parabola(p[0]))));
    const depois = Math.max(...r.pontos.map((p) => Math.abs(p[1] - parabola(p[0]))));
    expect(antes).toBeGreaterThan(1.5);
    expect(depois).toBeLessThan(0.1);
    expect(r.variacaoDepois).toBeLessThan(r.variacaoAntes / 100);
    expect(r.limitados).toEqual([]);
    expect(r.deslocamentos).toHaveLength(11);
  });

  it('a tolerância e a silhueta não passam, e o ponto preso sai em limitados', () => {
    const dados = Array.from({ length: 11 }, (_, i) => [i * 100, parabola(i * 100) + (i === 0 || i === 10 ? 0 : ruido(i)), 0]);
    const r = alisarPontosDaCurva(dados, { tolerancia: 1 });
    expect(r.maiorDeslocamento).toBeLessThanOrEqual(1 + 1e-12);
    expect(r.limitados.length).toBeGreaterThan(0);
    const s = alisarPontosDaCurva(dados, { tolerancia: 5, silhueta: { vista: 'z', tolerancia: 0.5 } });
    for (let i = 0; i < dados.length; i++) expect(Math.hypot(s.pontos[i][0] - dados[i][0], s.pontos[i][1] - dados[i][1])).toBeLessThanOrEqual(0.5 + 1e-12);
  });

  it('o corte parte a curva: o canto fica vivo, e a energia não atravessa', () => {
    const v = [[0, 0, 0], [100, 0, 0], [200, 0, 0], [300, 0, 0], [300, 100, 0], [300, 200, 0], [300, 300, 0]];
    const r = alisarPontosDaCurva(v, { partir: [3], tolerancia: 50 });
    expect(r.maiorDeslocamento).toBeLessThan(1e-9);
    const sem = alisarPontosDaCurva(v, { tolerancia: 50 });
    expect(sem.maiorDeslocamento).toBeGreaterThan(1);
  });

  it('a mesma curva dá a mesma saída, bit a bit, e a dada não muda', () => {
    const dados = Array.from({ length: 9 }, (_, i) => [i * 70, 10 * Math.sin(i / 3) + ruido(i, 1), ruido(i + 20, 0.5)]);
    const copia = JSON.stringify(dados);
    const a = alisarPontosDaCurva(dados, { fechada: true, tolerancia: 3 });
    const b = alisarPontosDaCurva(dados, { fechada: true, tolerancia: 3 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(dados)).toBe(copia);
  });

  it('recusa a opção fora do contrato, com o campo, o valor e o limite', () => {
    const p = [[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0]];
    expect(() => alisarPontosDaCurva(p, { energia: 'placa' })).toThrow(/energia "placa"; use 'variacao'/);
    expect(() => alisarPontosDaCurva(p, { tolerancia: 0 })).toThrow(/tolerancia 0; .*maior que zero, em mm/);
    expect(() => alisarPontosDaCurva(p, { silhueta: { vista: 'w', tolerancia: 1 } })).toThrow(/silhueta/);
    expect(() => alisarPontosDaCurva(p, { duros: [7] })).toThrow(/ponto 7 .* de 0 a 3/);
  });
});

/* alisar-curvas.test.mjs — o alisamento pelo resíduo do ajuste polinomial local: não mexe no arco, no círculo nem na parábola, tira o ruído,
 * deixa os pontos duros onde estão bit a bit, não passa do limite, da silhueta nem do plano de simetria, recusa a corda nula, nunca sobe a
 * variação em nenhum número de voltas, e dá a mesma saída sempre. Os controles de curvatura variável (elipse, clotoide, senoide, hélice e
 * a chapa simétrica) estão no gate do plano, `tools/fixtures/correcao-de-superficie/alisamento.test.mjs`. */
import { describe, expect, it } from 'vitest';
import { alisarPontosDaCurva } from './alisar-curvas.js';

const ANGULO_AUREO = Math.PI * (3 - Math.sqrt(5));
const ruido = (k, amplitude = 2) => amplitude * Math.sin(ANGULO_AUREO * k * 7);
const parabola = (x) => 40 * (1 - ((x - 500) / 500) ** 2);
const helice = Array.from({ length: 21 }, (_, i) => { const t = (i / 20) * 2 * Math.PI; return [300 * Math.cos(t), 300 * Math.sin(t), (400 * t) / (2 * Math.PI)]; });
const clotoide = (() => { const p = []; let x = 0; let y = 0; let th = 0; for (let i = 0; i <= 20; i++) { p.push([x, y, 0]); th += i * 0.01; x += 100 * Math.cos(th); y += 100 * Math.sin(th); } return p; })();

describe('alisarPontosDaCurva', () => {
  it('o arco de círculo, o círculo fechado e a reta ficam onde estão', () => {
    const arco = Array.from({ length: 11 }, (_, i) => { const t = (i / 10) * (Math.PI / 2); return [1000 * Math.cos(t), 1000 * Math.sin(t), 0]; });
    expect(alisarPontosDaCurva(arco, { tolerancia: 100 }).maiorDeslocamento).toBeLessThan(0.1);
    /* o círculo amostrado por igual encolhe pelo fator λ (2 sen(π/n))^10 / (1 + λ (2 sen(π/n))^10): 0,14 mm no de 12 pontos de raio 100
       (0,52 rad por trecho), 1,5e-4 mm no de 24 */
    for (const [n, limite] of [[12, 0.15], [24, 1e-3]]) {
      const circulo = Array.from({ length: n }, (_, i) => { const t = (i / n) * 2 * Math.PI; return [100 * Math.cos(t), 0, 100 * Math.sin(t)]; });
      expect(alisarPontosDaCurva(circulo, { fechada: true, tolerancia: 100 }).maiorDeslocamento).toBeLessThan(limite);
    }
    const reta = Array.from({ length: 8 }, (_, i) => [i * 30, i * 10, -i * 5]);
    expect(alisarPontosDaCurva(reta).maiorDeslocamento).toBeLessThan(1e-9);
  });

  /* o ponto vizinho da ponta dura da curva aberta está em duas janelas só e guarda parte do ruído (aqui, o penúltimo fica com os 0,78 mm
     que tinha); os de dentro voltam a menos de 0,4 mm */
  it('a parábola com ruído de 2 mm volta a menos de 0,4 mm da parábola por dentro, com o nó do meio fixo bit a bit', () => {
    const dados = Array.from({ length: 11 }, (_, i) => [i * 100, parabola(i * 100) + (i === 0 || i === 5 || i === 10 ? 0 : ruido(i)), 0]);
    const r = alisarPontosDaCurva(dados, { duros: [5], tolerancia: 2.5 });
    expect(r.duros).toEqual([0, 5, 10]);
    for (const i of r.duros) expect(r.pontos[i]).toEqual(dados[i]);
    const antes = Math.max(...dados.map((p) => Math.abs(p[1] - parabola(p[0]))));
    const erro = r.pontos.map((p) => Math.abs(p[1] - parabola(p[0])));
    expect(antes).toBeGreaterThan(1.5);
    expect(Math.max(...erro.slice(2, -2))).toBeLessThan(0.4);
    expect(Math.max(...erro)).toBeLessThan(0.8);
    expect(r.variacaoDepois).toBeLessThan(r.variacaoAntes / 20);
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
    const v = [[0, 0, 0], [100, 0, 0], [200, 0, 0], [300, 0, 0], [400, 0, 0], [400, 100, 0], [400, 200, 0], [400, 300, 0], [400, 400, 0]];
    const r = alisarPontosDaCurva(v, { partir: [4], tolerancia: 50 });
    expect(r.maiorDeslocamento).toBeLessThan(1e-9);
    const sem = alisarPontosDaCurva(v, { tolerancia: 50 });
    expect(sem.maiorDeslocamento).toBeGreaterThan(1);
  });

  it('recusa o ponto-chave repetido dizendo os índices, em vez de devolver NaN', () => {
    expect(() => alisarPontosDaCurva([[0, 0, 0], [100, 0, 0], [100, 0, 0], [200, 5, 0], [300, 0, 0], [400, 0, 0]])).toThrow(/repete o ponto-chave: o de índice 1 e o de índice 2 são iguais/);
    expect(() => alisarPontosDaCurva([[0, 0, 0], [100, 0, 0], [100, 100, 0], [0, 0, 0]], { fechada: true })).toThrow(/o de índice 3 e o de índice 0 são iguais/);
  });

  it('com simetria x, o ponto no plano fica com x = 0 bit a bit e nenhum vai a x < 0', () => {
    /* a curva corre no plano x = 0 e sai dele: sem a simetria, o alisamento a tirava a x = -0,73 */
    const pts = [[0, 0, 0], [0, 100, 1.5], [0, 200, -1], [0, 300, 0.8], [30, 400, 0], [120, 480, 0], [250, 520, 0]];
    const sem = alisarPontosDaCurva(pts, { tolerancia: 2.5 });
    expect(Math.min(...sem.pontos.map((p) => p[0]))).toBeLessThan(-0.1);
    const r = alisarPontosDaCurva(pts, { tolerancia: 2.5, simetria: 'x' });
    pts.forEach((p, i) => { if (p[0] === 0) expect(Object.is(r.pontos[i][0], 0)).toBe(true); });
    for (const p of r.pontos) expect(p[0]).toBeGreaterThanOrEqual(0);
    expect(r.variacaoDepois).toBeLessThan(r.variacaoAntes);
    expect(() => alisarPontosDaCurva([[0, 0, 0], [-1, 100, 0], [0, 200, 0]], { simetria: 'x' })).toThrow(/ponto de índice 1 em x -1 < 0/);
  });

  it('em qualquer número de voltas a variação nunca sobe, e variacaoDepois é a energia da curva devolvida', () => {
    const casos = [
      ['hélice com ruído', helice.map((p, i) => (i === 0 || i === 20 ? p : [p[0] + ruido(i), p[1] - ruido(i + 3), p[2] + ruido(i + 7, 1)])), {}],
      ['clotoide com ruído', clotoide.map((p, i) => (i === 0 || i === 20 ? p : [p[0], p[1] + ruido(i), p[2]])), {}],
      ['hélice limpa', helice, {}],
      ['fechada', Array.from({ length: 16 }, (_, i) => { const t = (i / 16) * 2 * Math.PI; return [800 * Math.cos(t) + ruido(i), 300 * Math.sin(t), ruido(i + 2, 1)]; }), { fechada: true }],
    ];
    for (const [nome, p, o] of casos) for (const iteracoes of [1, 2, 3, 5, 10]) for (const tolerancia of [1, 2.5, 1000]) {
      const r = alisarPontosDaCurva(p, { ...o, iteracoes, tolerancia });
      expect(r.variacaoDepois, `${nome} ${iteracoes} ${tolerancia}`).toBeLessThanOrEqual(r.variacaoAntes);
      /* a energia da curva devolvida, com a parametrização dela mesma: a de uma chamada nova sobre ela */
      expect(r.variacaoDepois, `${nome} ${iteracoes} ${tolerancia}`).toBe(alisarPontosDaCurva(r.pontos, { ...o, tolerancia: 1e-12 }).variacaoAntes);
      expect(r.voltas).toBeLessThanOrEqual(iteracoes);
    }
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
    expect(() => alisarPontosDaCurva(p, { energia: 'placa' })).toThrow(/energia "placa"; use 'quartica'/);
    expect(() => alisarPontosDaCurva(p, { tolerancia: 0 })).toThrow(/tolerancia 0; .*maior que zero, em mm/);
    expect(() => alisarPontosDaCurva(p, { tolerancia: NaN })).toThrow(/tolerancia NaN;/);
    expect(() => alisarPontosDaCurva(p, { tolerancia: Infinity })).toThrow(/tolerancia Infinity;/);
    expect(() => alisarPontosDaCurva(p, { silhueta: { vista: 'w', tolerancia: 1 } })).toThrow(/silhueta/);
    expect(() => alisarPontosDaCurva(p, { simetria: 'y' })).toThrow(/simetria "y"/);
    expect(() => alisarPontosDaCurva(p, { duros: [7] })).toThrow(/ponto 7 .* de 0 a 3/);
  });
});

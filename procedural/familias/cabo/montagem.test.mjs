/* montagem.test.mjs — o pedido por portas do cabo na montagem: as recusas dizem o recebido e o aceito, e a ponta sai do centro e do eixo da porta. */
import { describe, expect, it } from 'vitest';
import { lerPedidoPorPortas, pedidoNaPose, pontaDaPorta } from './montagem.js';

const portas = new Map([
  ['a.cabo', { eixo: [0, 1, 0], centro: [0.044, 0.065, 0] }],
  ['b.cabo', { eixo: [1, 0, 0], centro: [0.0224, 0.088, 0] }],
  ['b.outra', { eixo: [0, 0, 1], centro: [0, 0, 0] }],
]);
const base = { de: { instancia: 'a', porta: 'cabo' }, para: { instancia: 'b', porta: 'cabo' }, comprimento: 110, diametro: 3 };

describe('cabo por portas', () => {
  it('a ponta é o centro da porta em milímetro e a direção é o eixo, ao contrário com sentido -1, deslocada pelo afastamento', () => {
    expect(pontaDaPorta(portas, base.de)).toEqual({ ponto: [44, 65, 0], direcao: [0, 1, 0] });
    expect(pontaDaPorta(portas, { instancia: 'b', porta: 'cabo', sentido: -1, afastamento: 2 })).toEqual({ ponto: [20.4, 88, 0], direcao: [-1, -0, -0] });
    const abs = pedidoNaPose(base, portas);
    expect(abs.de).toEqual({ ponto: [44, 65, 0], direcao: [0, 1, 0] });
    expect(abs.para.ponto[0]).toBeCloseTo(22.4, 9);
    expect(abs.comprimento).toBe(110);
  });

  it('recusa a porta que a instância não publica, dizendo as que ela publica', () => {
    expect(() => pedidoNaPose({ ...base, para: { instancia: 'b', porta: 'nada' } }, portas)).toThrow(/pedido\.para recebeu "b\.nada".*a instância 'b' publica cabo, outra/);
    expect(() => pedidoNaPose({ ...base, de: { instancia: 'x', porta: 'cabo' } }, portas)).toThrow(/a montagem não tem a instância 'x' com portas/);
  });

  it('recusa campo desconhecido, passagens (ponto absoluto), ponta sem instância e sentido fora de 1 e -1', () => {
    expect(() => lerPedidoPorPortas({ ...base, passagens: [] })).toThrow(/pedido\.passagens.*não acompanha a peça/);
    expect(() => lerPedidoPorPortas({ ...base, cor: 'x' })).toThrow(/pedido\.cor.*um campo do pedido por portas/);
    expect(() => lerPedidoPorPortas({ ...base, de: { porta: 'cabo' } })).toThrow(/pedido\.de.*instancia/);
    expect(() => lerPedidoPorPortas({ ...base, de: { instancia: 'a', porta: 'cabo', sentido: 2 } })).toThrow(/pedido\.de\.sentido recebeu 2.*1 \(o cabo sai/);
  });
});

/* processos-da-maquina.test.mjs — a conta do número de processos pelos núcleos e pela memória, e o pedido em MODELAR_PROCESSOS. */
import { describe, expect, it } from 'vitest';
import { processosDaMaquina } from './processos-da-maquina.mjs';

const GB = 1024 ** 3;

describe('processosDaMaquina', () => {
  it('na máquina de quatro núcleos e 16 GB continua quatro', () => {
    expect(processosDaMaquina({ ambiente: {}, nucleos: 4, memoriaBytes: 16087 * 1024 ** 2 })).toBe(4);
  });
  it('acompanha os núcleos quando a memória sobra', () => {
    expect(processosDaMaquina({ ambiente: {}, nucleos: 16, memoriaBytes: 128 * GB })).toBe(16);
  });
  it('a memória limita quando falta', () => {
    expect(processosDaMaquina({ ambiente: {}, nucleos: 32, memoriaBytes: 32 * GB })).toBe(9);
    expect(processosDaMaquina({ ambiente: {}, nucleos: 8, memoriaBytes: 2 * GB })).toBe(1);
  });
  it('o pedido em MODELAR_PROCESSOS vale, para mais ou para menos', () => {
    expect(processosDaMaquina({ ambiente: { MODELAR_PROCESSOS: '2' }, nucleos: 16, memoriaBytes: 128 * GB })).toBe(2);
    expect(processosDaMaquina({ ambiente: { MODELAR_PROCESSOS: '12' }, nucleos: 4, memoriaBytes: 16 * GB })).toBe(12);
  });
  it('recusa o pedido que não é inteiro positivo, dizendo o recebido', () => {
    for (const v of ['0', '-1', '2.5', 'muitos']) expect(() => processosDaMaquina({ ambiente: { MODELAR_PROCESSOS: v } })).toThrow(`MODELAR_PROCESSOS='${v}'`);
  });
});

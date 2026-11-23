/* portas-eletricas.test.js — o tipo elétrico dos terminais dos componentes da placa de prova: os passivos pela natureza, o driver
   de passo pela pinagem padrão do perfil, o dissipador sem porta, o que o componente não fixa sem tipo até a ponte declarar, e a
   declaração que cita terminal inexistente recusada. */
import { describe, expect, it } from 'vitest';
import { placaDeclarada } from './placa.js';
import { PLACA_DE_PROVA } from './placa-de-prova.js';
import { portasDoComponente, tipoFixo } from './portas-eletricas.js';

const pecas = placaDeclarada(PLACA_DE_PROVA).pecas.filter((p) => p.id !== 'placa');
const porTipo = (tipo) => pecas.find((p) => p.tipo === tipo);

describe('portasDoComponente', () => {
  it('dá passivo com a tensão ausente aos terminais de resistor, cerâmico, eletrolítico e LED', () => {
    for (const tipo of ['resistor-axial', 'eletrolitico-radial', 'led']) {
      const c = porTipo(tipo);
      if (!c) continue;
      const { portas, semTipo } = portasDoComponente(c);
      expect(semTipo, tipo).toEqual([]);
      expect(portas.map((p) => p.id)).toEqual(c.terminais.map((t) => t.id));
      expect(portas.every((p) => p.tipo === 'passivo' && p.tensao.ausente)).toBe(true);
    }
  });

  it('dá a pinagem padrão ao driver de passo de 16 pinos', () => {
    const driver = { id: 'a1', tipo: 'modulo-de-placa', variante: 'modulo-driver-de-passo', terminais: Array.from({ length: 16 }, (_, k) => ({ id: String(k + 1), posicao: [k, 0, 0] })) };
    const { portas, semTipo } = portasDoComponente(driver);
    expect(semTipo).toEqual([]);
    const tipo = Object.fromEntries(portas.map((p) => [p.id, p.tipo]));
    expect([tipo[9], tipo[15], tipo[16], tipo[10], tipo[7], tipo[11]]).toEqual(['terra', 'terra', 'alimentacao', 'alimentacao', 'sinal-digital', 'fase-de-motor']);
  });

  it('não dá porta ao dissipador, e deixa sem tipo o que o componente não fixa', () => {
    expect(tipoFixo({ tipo: 'dissipador-to-220', variante: 'dissipador-to-220' }, '1')).toBe(false);
    const regulador = { id: 'u2', tipo: 'to-220', variante: 'to-220', terminais: ['1', '2', '3'].map((id) => ({ id, posicao: [0, 0, 0] })) };
    expect(portasDoComponente(regulador)).toEqual({ portas: [], semTipo: ['1', '2', '3'] });
  });

  it('a declaração da ponte vale acima da tabela, com a tensão e a origem', () => {
    const regulador = { id: 'u2', tipo: 'to-220', variante: 'to-220', terminais: ['1', '2', '3'].map((id) => ({ id, posicao: [0, 0, 0] })) };
    const { portas, semTipo } = portasDoComponente(regulador, [
      { terminais: ['1'], tipo: 'alimentacao', tensao: 12, origem: 'estimativa' },
      { terminais: ['2'], tipo: 'terra', tensao: 0 },
    ]);
    expect(semTipo).toEqual(['3']);
    expect(portas[0]).toMatchObject({ peca: 'u2', id: '1', tipo: 'alimentacao', tensao: { valor: 12, origem: 'estimativa' } });
    expect(portas[1].tensao).toEqual({ valor: 0, origem: 'declarado' });
  });

  it('recusa terminal que o componente não tem, tipo desconhecido e terminal declarado duas vezes', () => {
    const r = porTipo('resistor-axial');
    expect(() => portasDoComponente(r, [{ terminais: ['9'], tipo: 'passivo' }])).toThrow(/o terminal 9 não existe/);
    expect(() => portasDoComponente(r, [{ terminais: ['1'], tipo: 'fio' }])).toThrow(/aceito alimentacao/);
    expect(() => portasDoComponente(r, [{ terminais: ['1'], tipo: 'passivo' }, { terminais: ['1'], tipo: 'terra' }])).toThrow(/já foi declarado/);
  });
});

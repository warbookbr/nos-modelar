/* adaptar-three.test.ts — prova headless da fronteira entre o núcleo procedural herdado e Three.js. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';
// @ts-expect-error — adaptador novo em JavaScript, exercitado em runtime pelo Vitest.
import { adaptarThree } from '../../src/autoria/adaptar-three.js';

describe('adaptador Three.js', () => {
  it('preserva partes semânticas sem persistir UUID do renderizador', () => {
    const passos = [
      ['cubo', { origemId: 10, lado: 1 }],
      ['parte', { nome: 'corpo', sel: { origem: { op: 'cubo', id: 10 } } }],
      ['pincel', { modo: 'face', sel: { grupo: 'corpo' }, cor: '#334455' }],
    ];
    const neutro = nucleo(passos, {}, {});
    const resultado = adaptarThree(neutro, { nome: 'fixture' });

    expect(resultado.partes.has('corpo')).toBe(true);
    expect(resultado.raiz.userData).toMatchObject({
      tipo: 'peca-procedural',
      nome: 'fixture',
      partes: ['corpo'],
    });
    expect(resultado.partes.get('corpo').userData.identidadeParte).toBe('corpo');
    expect(JSON.stringify(resultado.raiz.userData)).not.toContain('uuid');
    expect(resultado.estatisticas).toMatchObject({
      verticesNeutros: 8,
      facesNeutras: 6,
      triangulos: 12,
      partes: 1,
    });
  });

  it('falha antes de renderizar quando o núcleo contém referência órfã', () => {
    const neutro = nucleo([
      ['cubo', { lado: 1 }],
      ['pincel', { modo: 'face', faces: [999], cor: '#ffffff' }],
    ], {}, {});

    expect(() => adaptarThree(neutro)).toThrow(/referência\(s\) inválida\(s\)/);
  });
});

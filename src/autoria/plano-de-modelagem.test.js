/* plano-de-modelagem.test.js — o contrato do que a peça promete ser.
 *
 * O defeito que este arquivo guarda é a parte prometida e não entregue. Numa
 * bicicleta anterior o pneu saiu maciço: aro, cubo e raios não chegaram a
 * existir, e como não havia segunda parte para acusar contato, a peça passou
 * limpa em todas as medidas. Ausência só vira mensurável se a lista tiver sido
 * escrita antes. */
import { describe, expect, it } from 'vitest';
import {
  conferirPartesContraPlano,
  normalizarPlanoDeModelagem,
} from './plano-de-modelagem.js';

const PLANO = {
  objeto: 'quadro de bicicleta de estrada, modulo 1 de 5',
  referencias: ['docs/referencias/bicicleta-lateral.png'],
  escala: { medida: 'diametro da roda montada', milimetros: 734 },
  partes: [
    { nome: 'tuboInferior', forma: 'tubo achatado do movimento central ao tubo de direcao', tecnica: 'loft de superelipse' },
    { nome: 'tuboSelim', forma: 'tubo quase vertical, da caixa ao topo do selim', tecnica: 'loft de superelipse' },
  ],
  criteriosDeReprovacao: ['tubo do selim com angulo diferente do da referencia'],
};

const com = (mudanca) => normalizarPlanoDeModelagem({ ...PLANO, ...mudanca });

describe('plano de modelagem', () => {
  it('aceita um plano completo e devolve forma canônica, ordenada por nome', () => {
    const plano = normalizarPlanoDeModelagem(PLANO);
    expect(plano.formato).toBe('mecanifica.plano-de-modelagem');
    expect(plano.partes.map((p) => p.nome)).toEqual(['tuboInferior', 'tuboSelim']);
    expect(plano.escala).toEqual({ medida: 'diametro da roda montada', milimetros: 734 });
    /* A ordem da declaração não pode mudar a entrada: plano igual, diff vazio. */
    const invertido = normalizarPlanoDeModelagem({ ...PLANO, partes: [...PLANO.partes].reverse() });
    expect(invertido).toEqual(plano);
  });

  it('ausência é ausência, e não invalidez: quem exige plano é o gate', () => {
    expect(normalizarPlanoDeModelagem(undefined)).toBe(null);
    expect(normalizarPlanoDeModelagem(null)).toBe(null);
  });

  it('RECUSA plano sem escala, porque sem ela a referência não tem tamanho', () => {
    expect(() => com({ escala: undefined })).toThrow(/escala/);
    expect(() => com({ escala: { medida: 'diametro da roda', milimetros: 0 } })).toThrow(/maior que zero/);
    expect(() => com({ escala: { medida: 'diametro da roda' } })).toThrow(/milimetros/);
  });

  it('RECUSA critério curto demais, que é o campo que some', () => {
    expect(() => com({ criteriosDeReprovacao: ['ok'] })).toThrow(/pelo menos 15/);
    expect(() => com({ criteriosDeReprovacao: [] })).toThrow(/não vazia/);
  });

  it('RECUSA chave desconhecida e campo de runtime', () => {
    expect(() => normalizarPlanoDeModelagem({ ...PLANO, cor: 'azul' })).toThrow(/não é permitido/);
    expect(() => normalizarPlanoDeModelagem({ ...PLANO, timestamp: '2026' })).toThrow(/não é permitido/);
  });

  it('RECUSA nome de parte que não serve de endereço no passo `parte`', () => {
    const parte = { nome: 'tubo do selim', forma: 'tubo quase vertical da caixa ao topo', tecnica: 'loft' };
    expect(() => com({ partes: [parte] })).toThrow(/sem espaço/);
  });

  it('RECUSA repetição de parte e caminho absoluto na referência', () => {
    expect(() => com({ partes: [PLANO.partes[0], PLANO.partes[0]] })).toThrow(/repetir nome/);
    expect(() => com({ referencias: ['/home/alguem/foto.png'] })).toThrow(/caminho absoluto/);
  });

  it('acusa parte prometida e não entregue, e parte entregue sem promessa', () => {
    const plano = normalizarPlanoDeModelagem(PLANO);
    expect(conferirPartesContraPlano(plano, ['tuboInferior', 'tuboSelim']))
      .toMatchObject({ faltando: [], naoPrometidas: [] });
    expect(conferirPartesContraPlano(plano, ['tuboSelim']).faltando).toEqual(['tuboInferior']);
    expect(conferirPartesContraPlano(plano, ['tuboInferior', 'tuboSelim', 'selim']).naoPrometidas)
      .toEqual(['selim']);
  });

  it('sem plano não há conferência, e isso não é aprovação', () => {
    expect(conferirPartesContraPlano(null, ['qualquer']))
      .toEqual({ faltando: [], naoPrometidas: [], prometidas: [] });
  });
});

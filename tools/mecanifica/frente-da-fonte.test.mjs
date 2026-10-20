/* Testes de frente-da-fonte.mjs: a frente lida pelas rodas, faróis e para-brisa nomeados, a declaração obrigatória quando a malha é uma peça só, a recusa da frente fora de +z e do partes.json sem o campo. */
import { describe, it, expect } from 'vitest';
import { decidirFrente, detectarFrente, exigirFrente } from './frente-da-fonte.mjs';

const parte = (nome, z) => ({ nome, minimo: [0, 0, z - 0.2], maximo: [0.3, 0.7, z + 0.2] });
const pacoteA = [parte('body', 0), parte('wheel-front-left', 1.2), parte('wheel-front-right', 1.2), parte('wheel-back-left', -1.1), parte('wheel-back-right', -1.1)];
const onibus = [parte('Bus_Body_Plane.003', 0), parte('wheelFL_Cylinder.003', 4), parte('wheelFR_Cylinder', 4), parte('wheelLR_Cylinder.002', -4), parte('wheelRR_Cylinder.001', -4)];

describe('frente da fonte', () => {
  it('lê a frente pelas rodas nomeadas, nos dois estilos de nome', () => {
    expect(detectarFrente(pacoteA)).toMatchObject({ lado: '+z', origem: 'rodas' });
    expect(detectarFrente(onibus)).toMatchObject({ lado: '+z', origem: 'rodas' });
  });
  it('vê a frente em -z quando as rodas da frente ficam em z negativo', () => {
    expect(detectarFrente(pacoteA.map((p) => ({ ...p, minimo: [0, 0, -p.maximo[2]], maximo: [0.3, 0.7, -p.minimo[2]] })))).toMatchObject({ lado: '-z' });
  });
  it('cai nos faróis e no para-brisa quando não há roda nomeada', () => {
    expect(detectarFrente([parte('headlight', 2), parte('taillight', -2)])).toMatchObject({ lado: '+z', origem: 'faróis' });
    expect(detectarFrente([parte('windshield', 0.5), parte('rear-window', -0.8)])).toMatchObject({ lado: '+z', origem: 'para-brisa' });
  });
  it('devolve null quando a malha é uma peça só', () => {
    expect(detectarFrente([parte('Wagon', 0)])).toBeNull();
    expect(detectarFrente([parte('Cylinder', 0), parte('Cube', 0)])).toBeNull();
  });
  it('exige a declaração quando o nome não diz, e a aceita em +z', () => {
    expect(() => decidirFrente([parte('Wagon', 0)])).toThrow(/declare --frente/);
    expect(decidirFrente([parte('Wagon', 0)], { declarada: '+z' })).toMatchObject({ lado: '+z', origem: 'declarada', girarGraus: 0 });
  });
  it('recusa a frente em -z e diz o giro que falta; com --girar 180 ela fecha', () => {
    expect(() => decidirFrente([parte('Wagon', 0)], { declarada: '-z' })).toThrow(/some 180 graus/);
    expect(decidirFrente([parte('Wagon', 0)], { declarada: '-z', girar: 180 })).toMatchObject({ lado: '+z', girarGraus: 180 });
  });
  it('recusa a declaração que a evidência contradiz', () => {
    const invertido = pacoteA.map((p) => ({ ...p, minimo: [0, 0, -p.maximo[2]], maximo: [0.3, 0.7, -p.minimo[2]] }));
    expect(() => decidirFrente(invertido, { declarada: '+z' })).toThrow(/contradiz/);
    expect(() => decidirFrente(invertido)).toThrow(/some 180 graus/);
  });
  it('recusa valor de --frente que não é +z nem -z, e giro que não é 0 nem 180 com a declaração', () => {
    expect(() => decidirFrente(pacoteA, { declarada: 'x' })).toThrow(/aceita \+z ou -z/);
    expect(() => decidirFrente(pacoteA, { declarada: '+z', girar: 90 })).toThrow(/0 e 180/);
  });
  it('exigirFrente recusa o partes.json sem o campo', () => {
    expect(() => exigirFrente({}, 'f.json')).toThrow(/não registra a frente/);
    expect(() => exigirFrente({ frente: { lado: '-z', origem: 'rodas' } }, 'f.json')).toThrow(/não registra a frente/);
    expect(exigirFrente({ frente: { lado: '+z', origem: 'rodas' } }, 'f.json').lado).toBe('+z');
  });
});

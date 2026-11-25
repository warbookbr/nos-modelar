/* Encaixe cilíndrico parcial: o eixo que atravessa uma parede e só depois entra num cubo curto. Sem `encaixeAxial`, o
   interno precisa cobrir o externo de ponta a ponta; com o modo parcial, basta a sobreposição alcançar o mínimo
   declarado, e qualquer um dos dois pode passar da ponta do outro. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validarEncaixeCilindrico } from './interfaces-montagem.js';
import { lerMontagemPersistida } from './ler-montagem-persistida.js';

const eixo = { id: 'motor.eixo', forma: 'cilindro', papel: 'externa', centro: [0, 0, 0], eixo: [0, 0, 1], referencia: [1, 0, 0], raio: 0.007, inicio: 0, fim: 0.025 };
const cubo = (inicio, fim) => ({ id: 'elo.cubo', forma: 'cilindro', papel: 'interna', centro: [0, 0, 0], eixo: [0, 0, 1], referencia: [1, 0, 0], raio: 0.00705, inicio, fim });
const portas = (movel) => new Map([['motor.eixo', eixo], ['elo.cubo', movel]]);
const relacao = (extra = {}) => ({
  id: 'eixoNoCubo', tipo: 'encaixaCilindrico', referencia: 'motor.eixo', movel: 'elo.cubo',
  folgaRadial: { nominal: 0.00005, toleranciaFabricacao: { menos: 0, mais: 0 } }, toleranciaNumerica: 1e-6, ...extra,
});
const parcial = (minimo) => ({ encaixeAxial: { modo: 'parcial', sobreposicaoMinima: minimo } });
const codigos = (r) => r.diagnosticos.map((d) => d.codigo);

describe('encaixe cilíndrico parcial', () => {
  it('sem o campo, o cubo curto reprova como antes', () => {
    const r = validarEncaixeCilindrico(relacao(), portas(cubo(0.013, 0.025)));
    expect(r.satisfeita).toBe(false);
    expect(codigos(r)).toEqual(['intervalo-axial-fora']);
  });
  it('com o modo parcial, o cubo de 12 mm na ponta do eixo passa', () => {
    const r = validarEncaixeCilindrico(relacao(parcial(0.012)), portas(cubo(0.013, 0.025)));
    expect(r.satisfeita).toBe(true);
    expect(r.medidas.sobreposicaoAxial).toBeCloseTo(0.012, 9);
    expect(r.medidas.encaixeAxial).toEqual({ modo: 'parcial', sobreposicaoMinima: 0.012 });
  });
  it('reprova a sobreposição menor que a mínima', () => {
    const r = validarEncaixeCilindrico(relacao(parcial(0.012)), portas(cubo(0.017, 0.025)));
    expect(codigos(r)).toEqual(['sobreposicao-insuficiente']);
    expect(r.diagnosticos[0]).toMatchObject({ minimo: 0.012 });
  });
  it('aceita o furo que passa da ponta do eixo, com a sobreposição no mínimo', () => {
    expect(validarEncaixeCilindrico(relacao(parcial(0.0095)), portas(cubo(0.0155, 0.0315))).satisfeita).toBe(true);
    expect(codigos(validarEncaixeCilindrico(relacao(parcial(0.012)), portas(cubo(0.0155, 0.0315))))).toEqual(['sobreposicao-insuficiente']);
  });
  it('o cubo que cobre o eixo inteiro continua passando sem o campo', () => {
    expect(validarEncaixeCilindrico(relacao(), portas(cubo(-0.001, 0.026))).satisfeita).toBe(true);
  });
});

describe('leitura do campo na montagem persistida', () => {
  const base = { folgaRadial: { nominal: 0.00005, toleranciaFabricacao: { menos: 0, mais: 0 } }, toleranciaNumerica: 1e-6 };
  const fixture = JSON.parse(readFileSync(new URL('../../tools/fixtures/conjunto-do-eixo/montagem.json', import.meta.url), 'utf8'));
  const montagem = (especificacao) => {
    const dado = structuredClone(fixture);
    dado.relacoes[0].especificacao = especificacao;
    return dado;
  };
  it('aceita o modo parcial e o guarda na especificação', () => {
    const lida = lerMontagemPersistida(montagem({ ...base, encaixeAxial: { modo: 'parcial', sobreposicaoMinima: 0.01 } }));
    expect(lida.relacoes[0].especificacao.encaixeAxial).toEqual({ modo: 'parcial', sobreposicaoMinima: 0.01 });
  });
  const erro = (especificacao) => { try { lerMontagemPersistida(montagem(especificacao)); return null; } catch (e) { return e.message; } };
  it('recusa modo desconhecido e mínimo zero', () => {
    expect(erro({ ...base, encaixeAxial: { modo: 'total', sobreposicaoMinima: 0.01 } })).toMatch(/modo/);
    expect(erro({ ...base, encaixeAxial: { modo: 'parcial', sobreposicaoMinima: 0 } })).toMatch(/sobreposicaoMinima/);
    expect(erro({ ...base, encaixeAxial: { modo: 'parcial', sobreposicaoMinima: 0.01, extra: 1 } })).toMatch(/extra/);
  });
});

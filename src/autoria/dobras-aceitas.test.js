/* dobras-aceitas.test.js — `PLANO.dobrasAceitas`: o normalizador recusa o que o campo não admite, o plano sem o campo mantém a forma canônica de antes, e a
 * aceitação cobre o achado pela parte, pela região e pelo tipo. */
import { describe, expect, it } from 'vitest';
import { aceitacaoDe, aceitasDaReceita, normalizarDobrasAceitas, separarAceitos } from './dobras-aceitas.js';
import { normalizarPlanoDeModelagem } from './plano-de-modelagem.js';

const PARTES = ['refletor', 'carroceria'];
const MOTIVO = 'facetas do refletor aprovadas de propósito';
const aceita = { parte: 'refletor', motivo: MOTIVO, regiao: { min: [-50, -50, -50], max: [50, 50, 50] } };
const recusa = (valor) => { try { normalizarDobrasAceitas(valor, PARTES); } catch (e) { return e.message; } throw new Error('não recusou'); };

const PLANO = {
  objeto: 'peça de prova com um refletor facetado de propósito',
  referencias: ['referencias/alvo.md'],
  escala: { medida: 'diâmetro do refletor', milimetros: 100 },
  partes: PARTES.map((nome) => ({ nome, forma: 'forma de prova com o que precisa para o teste', tecnica: 'gaiola' })),
  criteriosDeReprovacao: ['faceta fora do refletor, ou dobra que ninguém pediu'],
};

describe('PLANO.dobrasAceitas: o normalizador', () => {
  it('aceita parte e motivo, com região e tipos opcionais, e devolve a forma canônica ordenada', () => {
    const lista = normalizarDobrasAceitas([
      { parte: 'refletor', motivo: 'segunda faceta do refletor, de propósito', tipos: ['vinco', 'dobra'], regiao: { min: [0, 0, 0], max: [10, 10, 10] } },
      aceita,
    ], PARTES);
    expect(lista.map((a) => a.motivo)).toEqual([MOTIVO, 'segunda faceta do refletor, de propósito']);
    expect(lista[1]).toEqual({ parte: 'refletor', motivo: 'segunda faceta do refletor, de propósito', regiao: { min: [0, 0, 0], max: [10, 10, 10] }, tipos: ['dobra', 'vinco'] });
  });

  it('recusa lista vazia, parte fora do plano, motivo curto, região sem volume, tipo desconhecido, chave alheia e item repetido', () => {
    expect(recusa([])).toMatch(/lista não vazia/);
    expect(recusa([{ ...aceita, parte: 'farol' }])).toMatch(/'dobrasAceitas\[0\]\.parte' cita "farol", que não está em 'partes' do plano \(refletor, carroceria\)/);
    expect(recusa([{ ...aceita, motivo: 'ok' }])).toMatch(/motivo' precisa dizer, em pelo menos 15 caracteres/);
    expect(recusa([{ parte: 'refletor', motivo: MOTIVO }])).toMatch(/'dobrasAceitas\[0\]\.regiao' é obrigatória/);
    expect(recusa([{ ...aceita, regiao: { min: [0, 0, 0], max: [0, 5, 5] } }])).toMatch(/min não menor que max em algum eixo/);
    expect(recusa([{ ...aceita, regiao: { min: [0, 0], max: [1, 1, 1] } }])).toMatch(/precisa ser \[x, y, z\]/);
    expect(recusa([{ ...aceita, tipos: ['quina'] }])).toMatch(/traz "quina"; os tipos são dobra, vinco, chanfro/);
    expect(recusa([{ ...aceita, tipos: ['dobra', 'dobra'] }])).toMatch(/não pode repetir tipo/);
    expect(recusa([{ ...aceita, cor: 'azul' }])).toMatch(/'dobrasAceitas\[0\]\.cor' não é permitido/);
    expect(recusa([aceita, aceita])).toMatch(/não pode repetir item/);
    expect(recusa([{ ...aceita, motivo: '/home/pessoa/notas.txt aprovado de propósito' }])).toMatch(/UUID, caminho absoluto/);
  });

  it('o plano sem o campo mantém a forma canônica de antes, e com ele o campo entra no plano normalizado', () => {
    const sem = normalizarPlanoDeModelagem(PLANO);
    expect('dobrasAceitas' in sem).toBe(false);
    const com = normalizarPlanoDeModelagem({ ...PLANO, dobrasAceitas: [aceita] });
    expect(com.dobrasAceitas).toEqual([aceita]);
    expect(() => normalizarPlanoDeModelagem({ ...PLANO, dobrasAceitas: [{ ...aceita, parte: 'farol' }] })).toThrow(/dobrasAceitas\[0\]\.parte/);
  });
});

describe('PLANO.dobrasAceitas: o que a aceitação cobre', () => {
  const lista = normalizarDobrasAceitas([
    { parte: 'refletor', motivo: MOTIVO, regiao: { min: [800, -10, -10], max: [1000, 10, 10] } },
    { parte: 'carroceria', tipos: ['vinco'], regiao: { min: [0, 0, 0], max: [100, 100, 100] }, motivo: 'a quina do para-choque é desenho' },
  ], PARTES);

  it('cobre pela parte (também a que o achado junta com outras), pela região e pelo tipo', () => {
    expect(aceitacaoDe(lista, { tipo: 'dobra', parte: 'refletor', posicaoMm: [900, 0, 0] })?.motivo).toBe(MOTIVO);
    expect(aceitacaoDe(lista, { tipo: 'dobra', parte: 'refletor+carroceria', posicaoMm: [900, 0, 0] })?.motivo).toBe(MOTIVO);
    expect(aceitacaoDe(lista, { tipo: 'vinco', parte: 'carroceria', posicaoMm: [50, 50, 50] })?.parte).toBe('carroceria');
    expect(aceitacaoDe(lista, { tipo: 'vinco', parte: 'carroceria', posicaoMm: [150, 50, 50] })).toBeNull();
    expect(aceitacaoDe(lista, { tipo: 'dobra', parte: 'carroceria', posicaoMm: [50, 50, 50] })).toBeNull();
    expect(aceitacaoDe(lista, { tipo: 'dobra', parte: 'outra', posicaoMm: [0, 0, 0] })).toBeNull();
  });

  it('separa os achados em aceitos, com o motivo, e restantes; e uma receita sem o campo não aceita nada', () => {
    const achados = [{ tipo: 'dobra', parte: 'refletor', posicaoMm: [900, 0, 0] }, { tipo: 'dobra', parte: 'carroceria', posicaoMm: [0, 0, 0] }];
    const { aceitos, restantes } = separarAceitos(lista, achados);
    expect(aceitos).toEqual([{ ...achados[0], motivo: MOTIVO }]);
    expect(restantes).toEqual([achados[1]]);
    expect(aceitasDaReceita({ PLANO })).toEqual([]);
    expect(aceitasDaReceita({})).toEqual([]);
    expect(aceitasDaReceita({ PLANO: { ...PLANO, dobrasAceitas: [aceita] } })).toEqual([aceita]);
  });
});

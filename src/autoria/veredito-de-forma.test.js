/* veredito-de-forma.test.js — o veredito que não deixa a correção para o chute.
 *
 * O caso guardado é o da tradução perdida: um revisor escreveu que um trecho
 * "precisava ir para a frente", o erro era de inclinação, e quem corrigiu
 * transladou. Enquanto o parecer for prosa, quem modela escolhe a operação — e
 * quem modela é exatamente quem não pode escolher sozinho. */
import { describe, expect, it } from 'vitest';
import { TIPOS_DE_DEFEITO, normalizarVeredito, rodadaFechou } from './veredito-de-forma.js';

const DEFEITO = {
  parte: 'tuboSelim',
  tipo: 'angulo',
  onde: 'extremidade superior',
  sentido: 'menor',
  evidencia: 'na vista lateral a linha do alvo sobe mais que a do modelo',
};
const VEREDITO = {
  alvo: 'referencias/lateral.png',
  nota: 6,
  defeitos: [DEFEITO],
  observacao: 'a silhueta geral bate, e dois trechos saem da linha do alvo',
};
const comDefeito = (mudanca) => normalizarVeredito({ ...VEREDITO, defeitos: [{ ...DEFEITO, ...mudanca }] });

describe('veredito de forma', () => {
  it('aceita veredito completo e ordena os defeitos por parte e tipo', () => {
    const v = normalizarVeredito({
      ...VEREDITO,
      defeitos: [
        { ...DEFEITO, parte: 'tuboSuperior' },
        DEFEITO,
      ],
    });
    expect(v.defeitos.map((d) => d.parte)).toEqual(['tuboSelim', 'tuboSuperior']);
    expect(v.formato).toBe('mecanifica.veredito-de-forma');
  });

  it('RECUSA prosa no lugar de veredito e no lugar de defeito', () => {
    expect(() => normalizarVeredito('o tubo está torto, precisa ir para a frente'))
      .toThrow(/texto corrido não é veredito/);
    expect(() => normalizarVeredito({ ...VEREDITO, defeitos: ['o tubo está torto'] }))
      .toThrow(/prosa não é veredito/);
  });

  it('ÂNGULO e POSIÇÃO não compartilham sentido: apontar um não permite corrigir o outro', () => {
    expect(TIPOS_DE_DEFEITO.angulo).toEqual(['maior', 'menor']);
    expect(TIPOS_DE_DEFEITO.posicao).not.toContain('maior');
    expect(() => comDefeito({ tipo: 'angulo', sentido: 'adiantada' }))
      .toThrow(/para tipo 'angulo' precisa ser um de: maior, menor/);
    expect(() => comDefeito({ tipo: 'posicao', sentido: 'menor' }))
      .toThrow(/para tipo 'posicao'/);
    expect(comDefeito({ tipo: 'posicao', sentido: 'adiantada' }).defeitos[0].tipo).toBe('posicao');
  });

  it('RECUSA tipo fora do vocabulário, em vez de aceitar um nome novo calado', () => {
    expect(() => comDefeito({ tipo: 'torto', sentido: 'maior' })).toThrow(/precisa ser um de/);
    expect(() => comDefeito({ tipo: 'cor', sentido: 'maior' })).toThrow(/precisa ser um de/);
  });

  it('RECUSA evidência curta e observação curta, que são os campos que somem', () => {
    expect(() => comDefeito({ evidencia: 'torto' })).toThrow(/pelo menos 15/);
    expect(() => normalizarVeredito({ ...VEREDITO, observacao: 'ok' })).toThrow(/pelo menos 15/);
  });

  it('RECUSA defeito em parte que ninguém prometeu nem entregou', () => {
    const partesConhecidas = ['tuboSelim', 'tuboInferior'];
    expect(normalizarVeredito(VEREDITO, { partesConhecidas }).defeitos).toHaveLength(1);
    expect(() => normalizarVeredito(
      { ...VEREDITO, defeitos: [{ ...DEFEITO, parte: 'bagageiro' }] },
      { partesConhecidas },
    )).toThrow(/o plano não promete nem a peça entrega/);
  });

  it('RECUSA nota fora da escala e chave desconhecida', () => {
    expect(() => normalizarVeredito({ ...VEREDITO, nota: 12 })).toThrow(/de 0 a 10/);
    expect(() => normalizarVeredito({ ...VEREDITO, aprovado: true })).toThrow(/não é permitido/);
  });

  it('lista vazia com nota alta fecha a rodada; lista vazia com nota baixa não', () => {
    const semDefeito = { ...VEREDITO, defeitos: [], nota: 9 };
    expect(rodadaFechou(semDefeito)).toMatchObject({ fechou: true, defeitos: 0 });
    expect(rodadaFechou({ ...semDefeito, nota: 5 }).fechou).toBe(false);
    expect(rodadaFechou(VEREDITO).fechou).toBe(false);
  });
});

/* elo-entre-atuadores.test.mjs — a peça de prova do elo reto: o elo de antebraço (230 mm) entre dois atuadores de junta de
 * 100 mm assenta na porta de saída do primeiro e leva a fixação do segundo na boca B, com a furação casando nas duas pontas,
 * as peças só encostando onde assentam, nada atravessado e o curso de cada junta livre. */
import { describe, expect, it } from 'vitest';
import { criarRegistroDeFamilias } from '../../../procedural/familias/index.js';
import { auditarIntersecoesMontagem } from '../../../src/autoria/auditar-intersecoes-montagem.js';
import { conferirArticulacao } from '../../../src/autoria/conferir-articulacao.js';
import { resolverPortasDeMontagem, validarEncaixePadraoFuros } from '../../../src/autoria/interfaces-montagem.js';
import { resolverMontagemDaFamilia } from '../../modelar/montagem-da-familia.mjs';
import { montarEloEntreAtuadores } from './elo-entre-atuadores.mjs';

const registro = criarRegistroDeFamilias();
const execucao = { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes };
const gerada = montarEloEntreAtuadores(registro.obter('atuador-de-junta'), registro.obter('elo-entre-juntas'));
const comoFamilia = { montar: () => gerada };

describe('elo reto entre dois atuadores de junta', () => {
  it('o elo assenta na saída do primeiro e leva o segundo, com os furos casando nas duas bocas e só os encostos que assentam', () => {
    const inicio = performance.now();
    const { problemas, resolvida } = resolverMontagemDaFamilia(comoFamilia, {}, execucao);
    expect((performance.now() - inicio) / 1000).toBeLessThan(10);
    expect(problemas).toEqual([]);
    const instancias = resolvida.instancias.map((i) => ({ id: i.id, neutro: i.definicao.neutro, escala: 1, rotacao: i.poseMundo.rotacao, deslocamento: i.poseMundo.deslocamento }));
    const portas = resolverPortasDeMontagem(instancias);
    for (const [referencia, movel] of [['saidaA.saida', 'elo.boca-a'], ['elo.boca-b', 'carcacaB.fixacao']]) {
      const encaixe = validarEncaixePadraoFuros({ id: movel, tipo: 'encaixaPadraoFuros', referencia, movel }, portas);
      expect(encaixe.diagnosticos, movel).toEqual([]);
      expect(encaixe.satisfeita, movel).toBe(true);
    }
    const pares = auditarIntersecoesMontagem(resolvida).pares.filter((p) => p.estado !== 'separadas').map((p) => `${p.a.join('/')}+${p.b.join('/')}:${p.estado}`).sort();
    expect(pares).toEqual(['carcacaA+saidaA:encostam', 'carcacaB+elo:encostam', 'carcacaB+saidaB:encostam', 'elo+saidaA:encostam']);
    const y = (id) => resolvida.instancias.find((i) => i.id === id).poseMundo.deslocamento[1] * 1000;
    expect(y('elo')).toBeCloseTo(73, 3);
    expect(y('carcacaB') - y('elo')).toBeCloseTo(230, 3);
  });

  for (const declaracao of gerada.articulacoes) it(`o curso da ${declaracao.id}, de −180° a 180°, passa sem colisão`, () => {
    const { resolvida } = resolverMontagemDaFamilia(comoFamilia, {}, execucao);
    const r = conferirArticulacao(resolvida, declaracao);
    expect(r.recusa).toEqual([]);
    expect(r.ok).toBe(true);
  }, 90000);
});

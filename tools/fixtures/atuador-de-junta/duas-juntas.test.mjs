/* duas-juntas.test.mjs — a montagem de prova de duas juntas do atuador de junta: a furação de B casa com a da saída de A,
 * as peças só encostam onde assentam, e o curso de cada junta passa sem colisão. */
import { describe, expect, it } from 'vitest';
import { criarRegistroDeFamilias } from '../../../procedural/familias/index.js';
import { auditarIntersecoesMontagem } from '../../../src/autoria/auditar-intersecoes-montagem.js';
import { conferirArticulacao } from '../../../src/autoria/conferir-articulacao.js';
import { resolverPortasDeMontagem, validarEncaixePadraoFuros } from '../../../src/autoria/interfaces-montagem.js';
import { resolverMontagemDaFamilia } from '../../modelar/montagem-da-familia.mjs';
import { montarDuasJuntas } from './duas-juntas.mjs';

const registro = criarRegistroDeFamilias();
const F = registro.obter('atuador-de-junta');
const execucao = { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes };
const gerada = montarDuasJuntas(F);
const comoFamilia = { montar: () => gerada };

describe('montagem de prova de duas juntas', () => {
  it('B assenta na saída de A com os furos casando, e as peças só encostam onde assentam', () => {
    const { problemas, resolvida } = resolverMontagemDaFamilia(comoFamilia, {}, execucao);
    expect(problemas).toEqual([]);
    const instancias = resolvida.instancias.filter((i) => ['saidaA', 'carcacaB'].includes(i.id))
      .map((i) => ({ id: i.id, neutro: i.definicao.neutro, escala: 1, rotacao: i.poseMundo.rotacao, deslocamento: i.poseMundo.deslocamento }));
    const encaixe = validarEncaixePadraoFuros({ id: 'b-em-a', tipo: 'encaixaPadraoFuros', referencia: 'saidaA.saida', movel: 'carcacaB.fixacao' }, resolverPortasDeMontagem(instancias));
    expect(encaixe.diagnosticos).toEqual([]);
    expect(encaixe.satisfeita).toBe(true);
    const pares = auditarIntersecoesMontagem(resolvida).pares.filter((p) => p.estado !== 'separadas').map((p) => `${p.a.join('/')}+${p.b.join('/')}:${p.estado}`).sort();
    expect(pares).toEqual(['carcacaA+saidaA:encostam', 'carcacaB+saidaA:encostam', 'carcacaB+saidaB:encostam']);
  });

  /* a cadeia se confere uma junta por vez (`conferirArticulacao`): a conferência simultânea das aberturas pede juntas que
     movam peças diferentes, e a junta de A move a de B */
  for (const declaracao of gerada.articulacoes) it(`o curso da ${declaracao.id}, de −180° a 180°, passa sem colisão`, () => {
    const { resolvida } = resolverMontagemDaFamilia(comoFamilia, {}, execucao);
    const r = conferirArticulacao(resolvida, declaracao);
    expect(r.recusa).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.posicoes).toHaveLength(declaracao.passos + 1);
  }, 60000);
});

/* elo-com-desvio.test.mjs — as peças de prova do elo com desvio: a canela com o joelho a 25 graus, a canela no teto de 90 graus e o
 * elo curto no desvio máximo que a restrição da curva aceita, cada uma entre dois atuadores de 100 mm postos só pelas portas: a
 * boca B leva a fixação do atuador seguinte à posição e ao eixo que a família calcula, os furos casam nas duas bocas, as peças só
 * encostam onde assentam, nada atravessa e o curso das duas juntas, de −180° a 180°, passa sem colisão. */
import { describe, expect, it } from 'vitest';
import { criarRegistroDeFamilias } from '../../../procedural/familias/index.js';
import { caminhoDoElo } from '../../../procedural/familias/elo-entre-juntas/geometria.js';
import { auditarIntersecoesMontagem } from '../../../src/autoria/auditar-intersecoes-montagem.js';
import { resolverPortasDeMontagem, validarEncaixePadraoFuros } from '../../../src/autoria/interfaces-montagem.js';
import { resolverMontagemDaFamilia } from '../../modelar/montagem-da-familia.mjs';
import { ELO_CURTO, ELO_CURTO_NO_MAXIMO, ELO_DA_CANELA_COM_JOELHO, ELO_DA_CANELA_NO_TETO, desvioMaximoAceito } from './elo-com-desvio.mjs';
import { montarEloEntreAtuadores } from './elo-entre-atuadores.mjs';

const registro = criarRegistroDeFamilias();
const execucao = { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes };
const familiaDoElo = registro.obter('elo-entre-juntas');
const PECAS = [['a canela com o joelho a 25°', ELO_DA_CANELA_COM_JOELHO], ['a canela no teto de 90°', ELO_DA_CANELA_NO_TETO], ['o elo curto no desvio máximo aceito', ELO_CURTO_NO_MAXIMO]];

describe('elo com desvio entre dois atuadores de junta', () => {
  it('o desvio máximo aceito do elo curto é o de ELO_CURTO_NO_MAXIMO, e a canela chega ao teto do contrato', () => {
    expect(desvioMaximoAceito(familiaDoElo, ELO_CURTO)).toBe(ELO_CURTO_NO_MAXIMO.desvio);
    expect(desvioMaximoAceito(familiaDoElo, ELO_DA_CANELA_COM_JOELHO)).toBe(familiaDoElo.contrato.parametros.desvio.maximo);
  });

  for (const [nome, elo] of PECAS) {
    const gerada = montarEloEntreAtuadores(registro.obter('atuador-de-junta'), familiaDoElo, elo);
    const comoFamilia = { montar: () => gerada };

    it(`${nome}: o elo assenta na saída do primeiro e leva o segundo na boca B, com os furos casando e só os encostos que assentam`, () => {
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
      /* a carcaça B fica no ponto da boca B que o caminho do eixo calcula, a partir da boca A */
      const posicao = (id) => resolvida.instancias.find((i) => i.id === id).poseMundo.deslocamento.map((v) => v * 1000);
      const [ex, ey, ez] = posicao('elo'); const [bx, by, bz] = posicao('carcacaB');
      const ponto = caminhoDoElo({ ...Object.fromEntries(Object.entries(familiaDoElo.contrato.parametros).map(([k, v]) => [k, v.padrao])), ...elo }).pontoB;
      for (const [i, v] of [bx - ex, by - ey, bz - ez].entries()) expect(Math.abs(v - ponto[i]), `eixo ${'xyz'[i]}`).toBeLessThan(1e-3);
    });

  }
});

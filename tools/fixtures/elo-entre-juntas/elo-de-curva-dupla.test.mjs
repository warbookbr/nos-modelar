/* elo-de-curva-dupla.test.mjs — a coxa de curva dupla (431 mm, a do esqueleto humanoide aprovado) entre dois atuadores de junta de 100 mm
 * de eixos paralelos, em U e em S: as duas flanges assentam só pelas portas, os furos casam nas duas bocas, as peças só encostam onde
 * assentam, os dois eixos ficam paralelos e a 431 mm um do outro, a montagem resolve em menos de 10 s e os cursos passam sem colisão (o
 * de −180° a 180° das duas juntas e o do joelho do esqueleto, de 0° a 140°). */
import { describe, expect, it } from 'vitest';
import { criarRegistroDeFamilias } from '../../../procedural/familias/index.js';
import { auditarIntersecoesMontagem } from '../../../src/autoria/auditar-intersecoes-montagem.js';
import { conferirArticulacao } from '../../../src/autoria/conferir-articulacao.js';
import { resolverPortasDeMontagem, validarEncaixePadraoFuros } from '../../../src/autoria/interfaces-montagem.js';
import { resolverMontagemDaFamilia } from '../../modelar/montagem-da-familia.mjs';
import { CURSO_DO_JOELHO, ELO_DA_COXA_EM_S, ELO_DA_COXA_EM_U } from './elo-de-curva-dupla.mjs';
import { montarEloEntreAtuadores } from './elo-entre-atuadores.mjs';

const registro = criarRegistroDeFamilias();
const execucao = { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes };
const PECAS = [['em U', ELO_DA_COXA_EM_U, -1], ['em S', ELO_DA_COXA_EM_S, 1]];
const ENCOSTOS = ['carcacaA+saidaA:encostam', 'carcacaB+elo:encostam', 'carcacaB+saidaB:encostam', 'elo+saidaA:encostam'];

describe('a coxa de curva dupla entre dois atuadores de eixos paralelos', () => {
  for (const [nome, elo, sentido] of PECAS) {
    const gerada = montarEloEntreAtuadores(registro.obter('atuador-de-junta'), registro.obter('elo-entre-juntas'), elo);
    const comoFamilia = { montar: () => gerada };
    let guardada = null;
    const resolver = () => { guardada ??= (() => { const inicio = performance.now(); const r = resolverMontagemDaFamilia(comoFamilia, {}, execucao); return { ...r, segundos: (performance.now() - inicio) / 1000 }; })(); return guardada; };

    it(`${nome}: monta em menos de 10 s, só pelas portas, com os furos casando nas duas bocas e só os encostos que assentam`, () => {
      const { problemas, resolvida, segundos } = resolver();
      expect(segundos).toBeLessThan(10);
      expect(problemas).toEqual([]);
      const instancias = resolvida.instancias.map((i) => ({ id: i.id, neutro: i.definicao.neutro, escala: 1, rotacao: i.poseMundo.rotacao, deslocamento: i.poseMundo.deslocamento }));
      const portas = resolverPortasDeMontagem(instancias);
      for (const [referencia, movel] of [['saidaA.saida', 'elo.boca-a'], ['elo.boca-b', 'carcacaB.fixacao']]) {
        const encaixe = validarEncaixePadraoFuros({ id: movel, tipo: 'encaixaPadraoFuros', referencia, movel }, portas);
        expect(encaixe.diagnosticos, movel).toEqual([]);
        expect(encaixe.satisfeita, movel).toBe(true);
      }
      expect(auditarIntersecoesMontagem(resolvida).pares.filter((p) => p.estado !== 'separadas').map((p) => `${p.a.join('/')}+${p.b.join('/')}:${p.estado}`).sort()).toEqual(ENCOSTOS);
    }, 60000);

    it(`${nome}: os dois eixos de junta ficam paralelos e a 431 mm um do outro, ${nome === 'em U' ? 'em sentidos opostos' : 'no mesmo sentido'}`, () => {
      const { resolvida } = resolver();
      const pose = (id) => resolvida.instancias.find((i) => i.id === id).poseMundo;
      const eixo = (id) => [0, 1, 2].map((i) => pose(id).rotacao[i][1]);
      const a = eixo('carcacaA'); const b = eixo('carcacaB');
      expect(a.reduce((s, v, i) => s + v * b[i], 0)).toBeCloseTo(sentido, 9);
      const d = [0, 1, 2].map((i) => (pose('carcacaB').deslocamento[i] - pose('carcacaA').deslocamento[i]) * 1000);
      const ao = d.reduce((s, v, i) => s + v * a[i], 0);
      const perpendicular = Math.hypot(...d.map((v, i) => v - ao * a[i]));
      expect(perpendicular).toBeCloseTo(431, 3);
    }, 60000);

    for (const declaracao of gerada.articulacoes) {
      it(`${nome}: o curso da ${declaracao.id}, de −180° a 180°, passa sem colisão`, () => {
        const r = conferirArticulacao(resolver().resolvida, declaracao);
        expect(r.recusa).toEqual([]);
        expect(r.ok).toBe(true);
      }, 120000);
    }
    it(`${nome}: o curso do joelho do esqueleto (${CURSO_DO_JOELHO.minimo}° a ${CURSO_DO_JOELHO.maximo}°) passa sem colisão`, () => {
      const juntaB = gerada.articulacoes.find((d) => d.id === 'juntaB');
      const r = conferirArticulacao(resolver().resolvida, { ...juntaB, curso: { ...CURSO_DO_JOELHO }, passos: 28 });
      expect(r.recusa).toEqual([]);
      expect(r.ok).toBe(true);
    }, 120000);
  }
});

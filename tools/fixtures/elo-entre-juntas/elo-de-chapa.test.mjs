/* elo-de-chapa.test.mjs — a coxa em chapa (431 mm, a do esqueleto humanoide aprovado, 6 mm de espessura) entre o atuador do quadril e o do joelho (os dois de 100 mm), postos só
 * pelas portas: as duas flanges assentam na face da chapa e os furos casam nas duas bocas, só encostam as peças que assentam, os eixos ficam antiparalelos e a 431 mm um
 * do outro, as faces de apoio caem no mesmo plano (os dois atuadores ocupam o mesmo intervalo ao longo do eixo e a chapa soma só a espessura dela), a montagem
 * resolve, e os cursos passam sem colisão (o de −180° a 180° das duas juntas e o do joelho do esqueleto, de 0° a 140°, que é onde a chapa poderia bater na carcaça). */
import { describe, expect, it } from 'vitest';
import { criarRegistroDeFamilias } from '../../../procedural/familias/index.js';
import { auditarIntersecoesMontagem } from '../../../src/autoria/auditar-intersecoes-montagem.js';
import { conferirArticulacao } from '../../../src/autoria/conferir-articulacao.js';
import { resolverPortasDeMontagem, validarEncaixePadraoFuros } from '../../../src/autoria/interfaces-montagem.js';
import { resolverMontagemDaFamilia } from '../../modelar/montagem-da-familia.mjs';
import { CHAPA_DA_COXA, CURSO_DO_JOELHO } from './elo-de-chapa.mjs';
import { montarEloEntreAtuadores } from './elo-entre-atuadores.mjs';

const registro = criarRegistroDeFamilias();
const execucao = { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes };
const ENCOSTOS = ['carcacaA+saidaA:encostam', 'carcacaB+elo:encostam', 'carcacaB+saidaB:encostam', 'elo+saidaA:encostam'];
const gerada = montarEloEntreAtuadores(registro.obter('atuador-de-junta'), registro.obter('elo-entre-juntas'), CHAPA_DA_COXA);
let guardada = null;
/* resolve uma vez; o relógio mede só a resolução (guarda contra travamento, 60 s, e não medida de lentidão) */
const resolver = () => { guardada ??= (() => { const inicio = performance.now(); const r = resolverMontagemDaFamilia({ montar: () => gerada }, {}, execucao); return { ...r, segundos: (performance.now() - inicio) / 1000 }; })(); return guardada; };
const pose = (id) => resolver().resolvida.instancias.find((i) => i.id === id).poseMundo;
const caixaDe = (id) => {
  const i = resolver().resolvida.instancias.find((x) => x.id === id); const { rotacao, deslocamento } = i.poseMundo;
  const lo = [Infinity, Infinity, Infinity]; const hi = [-Infinity, -Infinity, -Infinity];
  for (const p of i.definicao.neutro.V.values()) for (let k = 0; k < 3; k += 1) { const v = (rotacao[k][0] * p[0] + rotacao[k][1] * p[1] + rotacao[k][2] * p[2] + deslocamento[k]) * 1000; lo[k] = Math.min(lo[k], v); hi[k] = Math.max(hi[k], v); }
  return { lo, hi };
};

describe('a coxa em chapa entre o atuador do quadril e o do joelho', () => {
  it('monta só pelas portas, com os furos casando nas duas bocas e só os encostos que assentam', () => {
    const { problemas, resolvida, segundos } = resolver();
    expect(segundos).toBeLessThan(60);
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

  it('os dois eixos ficam antiparalelos e a 431 mm um do outro, e as faces de apoio caem no mesmo plano da chapa', () => {
    const eixo = (id) => [0, 1, 2].map((i) => pose(id).rotacao[i][1]);
    const a = eixo('carcacaA'); const b = eixo('carcacaB');
    expect(a.reduce((s, v, i) => s + v * b[i], 0)).toBeCloseTo(-1, 9);
    const d = [0, 1, 2].map((i) => (pose('carcacaB').deslocamento[i] - pose('carcacaA').deslocamento[i]) * 1000);
    const ao = d.reduce((s, v, i) => s + v * a[i], 0);
    expect(Math.hypot(...d.map((v, i) => v - ao * a[i]))).toBeCloseTo(431, 3);
    /* na montagem o eixo de A é y: a chapa fica de 73 a 79 (a saída do quadril e a face de trás do joelho acabam em 73), e os dois atuadores ocupam de 0 a 73 */
    const [ca, sa, el, cb, sb] = ['carcacaA', 'saidaA', 'elo', 'carcacaB', 'saidaB'].map(caixaDe);
    expect(sa.hi[1]).toBeCloseTo(73, 6); expect(cb.hi[1]).toBeCloseTo(73, 6); expect(el.lo[1]).toBeCloseTo(73, 6); expect(el.hi[1]).toBeCloseTo(79, 6);
    expect(Math.min(ca.lo[1], sb.lo[1])).toBeCloseTo(0, 6);
    /* a largura da coxa em chapa, ao longo do eixo, é a dos atuadores mais a espessura da chapa */
    expect(Math.max(...[ca, sa, el, cb, sb].map((c) => c.hi[1])) - Math.min(...[ca, sa, el, cb, sb].map((c) => c.lo[1]))).toBeCloseTo(73 + 6, 6);
  }, 60000);

  for (const declaracao of gerada.articulacoes) {
    it(`o curso da ${declaracao.id}, de −180° a 180°, passa sem colisão`, () => {
      const r = conferirArticulacao(resolver().resolvida, declaracao);
      expect(r.recusa).toEqual([]);
      expect(r.ok).toBe(true);
    }, 120000);
  }
  it(`o curso do joelho do esqueleto (${CURSO_DO_JOELHO.minimo}° a ${CURSO_DO_JOELHO.maximo}°) passa sem colisão`, () => {
    const juntaB = gerada.articulacoes.find((d) => d.id === 'juntaB');
    const r = conferirArticulacao(resolver().resolvida, { ...juntaB, curso: { ...CURSO_DO_JOELHO }, passos: 28 });
    expect(r.recusa).toEqual([]);
    expect(r.ok).toBe(true);
  }, 120000);
});

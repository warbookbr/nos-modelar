/* perna-estreita.test.mjs — o gate de saída 1 e 2 do plano perna estreita: a perna com a coxa e a canela em chapa (431 mm cada, do esqueleto humanoide aprovado) e os três
 * atuadores de 100 mm monta só pelas portas, com as quatro bocas casando e só as flanges encostando (a chapa na flange), as juntas com o eixo e a altura do esqueleto, no máximo
 * 180 mm de largura e nada a menos de 20 mm da linha do meio na pose zero e dobrada (quadril e joelho a 90°), o curso de cada junta do esqueleto sem colisão. A exportação está em
 * perna-estreita-exportacao.test.mjs. */
import { describe, expect, it } from 'vitest';
import { auditarIntersecoesMontagem } from '../../../src/autoria/auditar-intersecoes-montagem.js';
import { conferirArticulacao } from '../../../src/autoria/conferir-articulacao.js';
import { validarEncaixePadraoFuros } from '../../../src/autoria/interfaces-montagem.js';
import { COMPRIMENTOS, JUNTAS_DA_PERNA, caixaNoEsqueleto, eixosDasJuntas, paraOEsqueleto, resolvidaNaPose } from './perna-de-prova.mjs';
import { FOLGA_MINIMA, LARGURA_MAXIMA, larguraEmX, resolverPernaEstreita } from './perna-estreita.mjs';

const { gerada } = resolverPernaEstreita();
const ENCOSTOS = ['canela+carcacaTornozelo:encostam', 'canela+saidaJoelho:encostam', 'carcacaJoelho+coxa:encostam', 'carcacaJoelho+saidaJoelho:encostam', 'carcacaQuadril+saidaQuadril:encostam', 'carcacaTornozelo+saidaTornozelo:encostam', 'coxa+saidaQuadril:encostam'];
const pares = (r) => auditarIntersecoesMontagem(r).pares.filter((p) => p.estado !== 'separadas').map((p) => `${p.a.join('/')}+${p.b.join('/')}:${p.estado}`).sort();
const montar = resolverPernaEstreita;

describe('a perna estreita', () => {
  it('os comprimentos da coxa e da canela saem do esqueleto (431 mm cada)', () => {
    expect(COMPRIMENTOS).toEqual({ coxa: 431, canela: 431 });
  });

  it('monta só pelas portas, com os quatro furos casando e só os encostos das flanges, sem peça atravessada', () => {
    const { problemas, resolvida, segundos, portas } = montar();
    /* guarda contra travamento (60 s), e não medida de lentidão */
    expect(segundos).toBeLessThan(60);
    expect(problemas).toEqual([]);
    for (const [referencia, movel] of [['saidaQuadril.saida', 'coxa.boca-a'], ['coxa.boca-b', 'carcacaJoelho.fixacao'], ['saidaJoelho.saida', 'canela.boca-a'], ['canela.boca-b', 'carcacaTornozelo.fixacao']]) {
      const encaixe = validarEncaixePadraoFuros({ id: movel, tipo: 'encaixaPadraoFuros', referencia, movel }, portas);
      expect(encaixe.diagnosticos, movel).toEqual([]);
      expect(encaixe.satisfeita, movel).toBe(true);
    }
    expect(pares(resolvida)).toEqual(ENCOSTOS);
  }, 60000);

  it('o eixo e a altura das três juntas são os do esqueleto aprovado, e o quadril está no x dele', () => {
    const { portas, paraEsqueleto: T } = montar();
    eixosDasJuntas(portas).forEach((e, i) => {
      const j = JUNTAS_DA_PERNA[i]; const c = T.aplicar(e.centro);
      const d = T.rotacao.map((l) => l[0] * e.direcao[0] + l[1] * e.direcao[1] + l[2] * e.direcao[2]);
      expect(d[1], j.id).toBeCloseTo(0, 9); expect(d[2], j.id).toBeCloseTo(0, 9); expect(d[0], j.id).toBeCloseTo(j.eixo[0], 9);
      expect(c[1], j.id).toBeCloseTo(j.posicao[1], 3);
      expect(c[2], j.id).toBeCloseTo(j.posicao[2], 3);
    });
    expect(T.aplicar(eixosDasJuntas(portas)[0].centro)[0]).toBeCloseTo(JUNTAS_DA_PERNA[0].posicao[0], 3);
  }, 60000);

  it('o joelho desliza ao longo do eixo: os três atuadores ocupam o mesmo intervalo em x (73 mm), a coxa fica de um lado dele e a canela do outro, com 6 mm cada', () => {
    const { resolvida, paraEsqueleto } = montar();
    const x = (...ids) => { const c = ids.map((id) => caixaNoEsqueleto(resolvida, paraEsqueleto, id)); return [Math.min(...c.map((k) => k.minimo[0])), Math.max(...c.map((k) => k.maximo[0]))]; };
    const quadril = x('carcacaQuadril', 'saidaQuadril'); const joelho = x('carcacaJoelho', 'saidaJoelho'); const tornozelo = x('carcacaTornozelo', 'saidaTornozelo');
    expect(quadril[1] - quadril[0]).toBeCloseTo(73, 3);
    for (const outro of [joelho, tornozelo]) { expect(outro[0]).toBeCloseTo(quadril[0], 3); expect(outro[1]).toBeCloseTo(quadril[1], 3); }
    const [coxa, canela] = [x('coxa'), x('canela')];
    expect(coxa[1]).toBeCloseTo(quadril[0], 3); expect(coxa[1] - coxa[0]).toBeCloseTo(6, 3);
    expect(canela[0]).toBeCloseTo(quadril[1], 3); expect(canela[1] - canela[0]).toBeCloseTo(6, 3);
  }, 60000);

  it(`a perna tem no máximo ${LARGURA_MAXIMA} mm de largura e nada a menos de ${FOLGA_MINIMA} mm da linha do meio, na pose zero e dobrada`, () => {
    const { resolvida, portas, paraEsqueleto } = montar();
    const poses = [{}, { quadril: 90, joelho: 90 }, { quadril: 125, joelho: 140, tornozelo: 25 }, { quadril: -30, tornozelo: -45 }];
    for (const graus of poses) {
      const m = larguraEmX(resolvidaNaPose(resolvida, portas, graus), paraEsqueleto);
      expect(m.largura, JSON.stringify(graus)).toBeLessThanOrEqual(LARGURA_MAXIMA);
      expect(m.minimo, JSON.stringify(graus)).toBeGreaterThanOrEqual(FOLGA_MINIMA);
      expect(m.largura, JSON.stringify(graus)).toBeCloseTo(85, 1);
    }
  }, 60000);

  it('a transformação que desliza a perna até a folga mínima também a deixa a 20 mm do meio', () => {
    const { resolvida, portas } = montar();
    const T = paraOEsqueleto(portas, resolvida);
    expect(larguraEmX(resolvida, T).minimo).toBeCloseTo(FOLGA_MINIMA, 3);
  }, 60000);

  for (const junta of ['quadril', 'joelho', 'tornozelo']) {
    const esq = JUNTAS_DA_PERNA.find((j) => j.id.startsWith(junta));
    it(`o curso do ${junta} no esqueleto (${esq.curso.minimo}° a ${esq.curso.maximo}°) passa sem colisão`, () => {
      const declaracao = gerada.articulacoes.find((a) => a.id === junta);
      expect(declaracao.curso).toEqual(esq.curso);
      const r = conferirArticulacao(montar().resolvida, declaracao);
      expect(r.recusa).toEqual([]);
      expect(r.ok).toBe(true);
    }, 120000);
  }

  it('a perna dobrada (quadril e joelho a 90°, o sentado) e nos extremos dos cursos não tem peça atravessada nem contato novo', () => {
    const { resolvida, portas } = montar();
    const poses = [{ quadril: 90, joelho: 90 }, { quadril: 90, joelho: 90, tornozelo: 25 }, { quadril: 125, joelho: 140, tornozelo: 25 }, { quadril: -30, joelho: 0, tornozelo: -45 }];
    for (const graus of poses) expect(pares(resolvidaNaPose(resolvida, portas, graus)), JSON.stringify(graus)).toEqual(ENCOSTOS);
  }, 120000);

  it('a perna dobrada leva o joelho à frente do quadril e o tornozelo sob o joelho, como o sentado do esqueleto', () => {
    const { resolvida, portas, paraEsqueleto: T } = montar();
    const dobrada = resolvidaNaPose(resolvida, portas, { quadril: 90, joelho: 90 });
    const em = (id) => T.aplicar(dobrada.instancias.find((i) => i.id === id).poseMundo.deslocamento.map((v) => v * 1000));
    expect(em('carcacaJoelho')[1]).toBeCloseTo(930, 2); expect(em('carcacaJoelho')[2]).toBeCloseTo(431, 2);
    expect(em('carcacaTornozelo')[1]).toBeCloseTo(499, 2); expect(em('carcacaTornozelo')[2]).toBeCloseTo(431, 2);
  }, 60000);
});

/* perna-de-prova.test.mjs — o gate 3 e a montagem do gate 4 do plano elo entre juntas: a perna de prova (quadril, joelho, tornozelo, a coxa e a canela em U, de 431 mm
 * lidos do esqueleto humanoide aprovado) monta só pelas portas em menos de 10 s, com as bocas casando nas flanges e só encostando nelas, as juntas
 * com o eixo e a posição do esqueleto, o curso de cada junta (o do esqueleto) livre de colisão, a perna dobrada (quadril e joelho a 90°, como o sentado
 * do esqueleto) e nos extremos sem peça atravessada. A exportação está em perna-de-prova-exportacao.test.mjs. */
import { describe, expect, it } from 'vitest';
import { auditarIntersecoesMontagem } from '../../../src/autoria/auditar-intersecoes-montagem.js';
import { conferirArticulacao } from '../../../src/autoria/conferir-articulacao.js';
import { validarEncaixePadraoFuros } from '../../../src/autoria/interfaces-montagem.js';
import { COMPRIMENTOS, FOLGA_DA_LINHA_DO_MEIO, JUNTAS_DA_PERNA, caixaNoEsqueleto, eixosDasJuntas, paraOEsqueleto, resolverPerna, resolvidaNaPose } from './perna-de-prova.mjs';

const { gerada } = resolverPerna();
const ENCOSTOS = ['canela+carcacaTornozelo:encostam', 'canela+saidaJoelho:encostam', 'carcacaJoelho+coxa:encostam', 'carcacaJoelho+saidaJoelho:encostam', 'carcacaQuadril+saidaQuadril:encostam', 'carcacaTornozelo+saidaTornozelo:encostam', 'coxa+saidaQuadril:encostam'];
const pares = (r) => auditarIntersecoesMontagem(r).pares.filter((p) => p.estado !== 'separadas').map((p) => `${p.a.join('/')}+${p.b.join('/')}:${p.estado}`).sort();

const montar = resolverPerna;

describe('a perna de prova do elo entre juntas', () => {
  it('os comprimentos da coxa e da canela saem do esqueleto (431 mm cada)', () => {
    expect(COMPRIMENTOS).toEqual({ coxa: 431, canela: 431 });
  });

  it('monta só pelas portas, com os quatro furos casando e só os encostos das flanges, sem peça atravessada', () => {
    const { problemas, resolvida, segundos, portas } = montar();
    /* guarda contra travamento: a máquina do CI levou 11,7 s onde a local leva 5; a lentidão se julga pelo teto relativo dos testes lentos */
    expect(segundos).toBeLessThan(60);
    expect(problemas).toEqual([]);
    for (const [referencia, movel] of [['saidaQuadril.saida', 'coxa.boca-a'], ['coxa.boca-b', 'carcacaJoelho.fixacao'], ['saidaJoelho.saida', 'canela.boca-a'], ['canela.boca-b', 'carcacaTornozelo.fixacao']]) {
      const encaixe = validarEncaixePadraoFuros({ id: movel, tipo: 'encaixaPadraoFuros', referencia, movel }, portas);
      expect(encaixe.diagnosticos, movel).toEqual([]);
      expect(encaixe.satisfeita, movel).toBe(true);
    }
    expect(pares(resolvida)).toEqual(ENCOSTOS);
  }, 60000);

  it('o eixo e a posição das três juntas são os do esqueleto aprovado (direção, altura e plano sagital, a menos da posição ao longo do eixo)', () => {
    const { portas } = montar();
    const T = paraOEsqueleto(portas);
    eixosDasJuntas(portas).forEach((e, i) => {
      const j = JUNTAS_DA_PERNA[i]; const c = T.aplicar(e.centro);
      const d = T.rotacao.map((l) => l[0] * e.direcao[0] + l[1] * e.direcao[1] + l[2] * e.direcao[2]);
      expect(d[1], j.id).toBeCloseTo(0, 9); expect(d[2], j.id).toBeCloseTo(0, 9); expect(d[0], j.id).toBeCloseTo(j.eixo[0], 9);
      expect(c[1], j.id).toBeCloseTo(j.posicao[1], 3);
      expect(c[2], j.id).toBeCloseTo(j.posicao[2], 3);
    });
  }, 60000);

  it('o pé fica sob o quadril: o atuador do tornozelo ocupa o mesmo intervalo lateral do quadril e o do joelho fica 59,5 mm para fora', () => {
    const { resolvida, paraEsqueleto } = montar();
    const x = (id) => caixaNoEsqueleto(resolvida, paraEsqueleto, id);
    for (const k of ['minimo', 'maximo']) expect(x('carcacaTornozelo')[k][0]).toBeCloseTo(x('carcacaQuadril')[k][0], 3);
    expect(x('carcacaQuadril').maximo[0] - x('carcacaQuadril').minimo[0]).toBeCloseTo(65, 3);
    expect(x('carcacaJoelho').minimo[0] - x('carcacaQuadril').minimo[0]).toBeCloseTo(59.5, 3);
    for (const id of ['carcacaQuadril', 'carcacaJoelho', 'carcacaTornozelo']) { expect(x(id).minimo[2], id).toBeCloseTo(-62, 3); expect(x(id).maximo[2], id).toBeCloseTo(62, 3); }
  }, 60000);

  it('nenhuma peça passa da linha do meio do corpo (folga de 20 mm) e a perna ocupa 387 mm de largura, que é o que os dois U deixam', () => {
    const { resolvida, paraEsqueleto } = montar();
    const caixas = resolvida.instancias.map((i) => caixaNoEsqueleto(resolvida, paraEsqueleto, i.id));
    const minimo = Math.min(...caixas.map((c) => c.minimo[0])); const maximo = Math.max(...caixas.map((c) => c.maximo[0]));
    expect(minimo).toBeCloseTo(FOLGA_DA_LINHA_DO_MEIO, 3);
    expect(maximo - minimo).toBeCloseTo(387.23, 1);
    const dobrada = resolvidaNaPose(resolvida, montar().portas, { quadril: 90, joelho: 90 });
    expect(Math.min(...dobrada.instancias.map((i) => caixaNoEsqueleto(dobrada, paraEsqueleto, i.id).minimo[0]))).toBeCloseTo(FOLGA_DA_LINHA_DO_MEIO, 3);
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

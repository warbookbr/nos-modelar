/* laco-de-modelagem.test.js — a decisão de parar sai dos números, não de quem
 * modelou.
 *
 * Dois casos importam aqui. O primeiro é a peça que reprova nas medidas e mesmo
 * assim segue para revisão: gasta uma rodada de olho em algo que já falhou no
 * que é contável. O segundo é o laço que não fecha — defeitos que não caem
 * rodada após rodada não são geometria a corrigir, são plano ou revisor fora do
 * lugar, e insistir ensina que o veredito é ruído. */
import { describe, expect, it } from 'vitest';
import { defeitosAbertos, proximaAcao, registrarRodada } from './laco-de-modelagem.js';

const defeito = (parte, tipo = 'angulo', sentido = 'menor') => ({
  parte, tipo, onde: 'extremidade superior', sentido,
  evidencia: 'na vista lateral a linha do alvo nao coincide com a do modelo',
});

const veredito = (quantos, nota = 6) => ({
  alvo: 'referencias/lateral.png',
  nota,
  defeitos: Array.from({ length: quantos }, (_, i) => defeito(`parte${i}`)),
  observacao: 'a silhueta geral bate e alguns trechos saem da linha do alvo',
});

const rodada = (numero, { passou = true, quantos = null, nota = 6 } = {}) => registrarRodada({
  peca: 'peca-de-ensaio',
  numero,
  medidas: { passou, relatorio: passou ? 'guarda:acervo ok' : 'contato declarado que nao acontece' },
  veredito: quantos === null ? null : veredito(quantos, nota),
});

describe('laço de modelagem', () => {
  it('sem rodada nenhuma, a ação é modelar', () => {
    expect(proximaAcao([]).acao).toBe('modelar');
  });

  it('medida reprovada volta a modelar SEM gastar revisão', () => {
    const decisao = proximaAcao([rodada(1, { passou: false })]);
    expect(decisao.acao).toBe('modelar');
    expect(decisao.motivo).toMatch(/gastar rodada/);
  });

  it('peça que passou nas medidas e não foi julgada vai para revisão', () => {
    expect(proximaAcao([rodada(1)]).acao).toBe('revisar');
  });

  it('fecha quando não há defeito apontado e a nota alcança o mínimo', () => {
    expect(proximaAcao([rodada(1, { quantos: 0, nota: 9 })]).acao).toBe('parar-fechou');
    /* Nota baixa sem defeito listado não fecha: o revisor viu algo que não
       soube nomear, e parar aí seria aprovar pelo silêncio. */
    expect(proximaAcao([rodada(1, { quantos: 0, nota: 5 })]).acao).toBe('modelar');
  });

  it('PARA quando os defeitos não caem em três rodadas julgadas', () => {
    const historia = [rodada(1, { quantos: 4 }), rodada(2, { quantos: 4 }), rodada(3, { quantos: 5 })];
    const decisao = proximaAcao(historia);
    expect(decisao.acao).toBe('parar-sem-convergencia');
    expect(decisao.motivo).toMatch(/4, 4, 5/);
  });

  it('continua enquanto os defeitos estão caindo, mesmo com muitas rodadas julgadas', () => {
    const historia = [rodada(1, { quantos: 5 }), rodada(2, { quantos: 3 }), rodada(3, { quantos: 1 })];
    expect(proximaAcao(historia).acao).toBe('modelar');
  });

  it('PARA no limite combinado de rodadas, dizendo quantos defeitos ficaram', () => {
    const historia = [5, 4, 3, 2, 2, 1].map((quantos, i) => rodada(i + 1, { quantos }));
    const decisao = proximaAcao(historia, { limite: 6 });
    expect(decisao.acao).toBe('parar-limite');
    expect(decisao.motivo).toMatch(/1 defeito\(s\) em aberto/);
  });

  it('a rodada guarda o veredito que a motivou, e recusa registro sem medida', () => {
    const r = rodada(1, { quantos: 2 });
    expect(r.formato).toBe('mecanifica.rodada-de-modelagem');
    expect(r.veredito.defeitos).toHaveLength(2);
    expect(defeitosAbertos([r])).toHaveLength(2);
    expect(() => registrarRodada({ peca: 'x', numero: 1 })).toThrow(/medidas/);
    expect(() => registrarRodada({ peca: 'x', numero: 0, medidas: { passou: true } })).toThrow(/começa em 1/);
  });

  it('rodada com medida reprovada não carrega veredito, e a próxima lê os defeitos da última julgada', () => {
    const historia = [rodada(1, { quantos: 3 }), rodada(2, { passou: false })];
    expect(historia[1].veredito).toBe(null);
    expect(defeitosAbertos(historia)).toHaveLength(3);
  });
});

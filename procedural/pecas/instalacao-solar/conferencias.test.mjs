/* instalacao-solar/conferencias.test — fixa, com os valores provisórios do telhado e do kit, o que a montagem da instalação solar mede.
 *
 * Os valores que dependem da medida da pessoa (a distância entre vigas, a posição do trilho, o furo do suporte) estão marcados "a
 * confirmar" nas receitas; este teste os lê como estão e prova que a conta da montagem os trata como o plano manda: o que não fecha
 * (trilho de cima fora da viga, haste que passa do painel) aparece como número, e não some. Quando a pessoa trouxer as medidas, o que
 * mudar aqui muda por causa da tabela, e a comparação é entre o novo relato e este.
 */
import { describe, expect, it } from 'vitest';
import { conferirInstalacaoSolar, relato } from './conferencias.mjs';

describe('instalação solar: conferências da obra', () => {
  it('mede trilho, hastes, vigas, folgas e a haste contra o painel', async () => {
    const m = await conferirInstalacaoSolar();
    /* Trilho: quatro perfis por linha, o último cortado para fechar 4550 mm. */
    expect(m.trilhos.A.pedacos).toEqual([1350, 1350, 1350, 500]);
    expect(m.comprimentoDeTrilho).toBe(4550);
    expect(m.trilhos.B.fimE - m.trilhos.B.inicioE).toBeCloseTo(4550, 1);
    /* Os dois trilhos a 900 mm um do outro ao longo da água. */
    expect(m.distanciaEntreTrilhos).toBeCloseTo(900, 1);
    /* As quatro hastes de baixo estão sobre a viga da sobreposição; as de cima, a cerca de 79 cm da viga da cumeeira. */
    for (const h of m.hastes.filter((x) => x.id.startsWith('hasteA'))) expect(h.sobreViga).toBe(true);
    for (const h of m.hastes.filter((x) => x.id.startsWith('hasteB'))) {
      expect(h.sobreViga).toBe(false);
      expect(h.distanciaAoCentroDaViga).toBeCloseTo(790, 0);
    }
    /* Os trilhos ficam ao lado da viga, e não sobre ela: o furo do suporte põe o centro do trilho a 58 mm da haste. */
    expect(m.trilhos.A.distanciaAoCentroDaViga).toBeCloseTo(58, 0);
    expect(m.trilhos.A.sobreposicaoComAViga).toBe(0);
    expect(m.trilhos.B.sobreposicaoComAViga).toBe(0);
    /* Espaçamento: quatro iguais no trilho de 4550 dá 1316,67; a regra de 1400 pede 4800. */
    for (const e of m.espacamentoDasHastes.daMontagem) expect(e).toBeCloseTo(1316.67, 0);
    expect(m.espacamentoDasHastes.regraDe1400.trilhoNecessario).toBe(4800);
    /* Folgas entre painéis: 60 entre o de 30 e o de 40 (dois grampos de ponta de frente), 20 nas duas junções com intermediário. */
    expect(m.folgaEntrePaineis[0]).toBeCloseTo(60, 1);
    expect(m.folgaEntrePaineis[1]).toBeCloseTo(20, 1);
    expect(m.folgaEntrePaineis[2]).toBeCloseTo(20, 1);
    expect(m.fileiraDePaineis).toBeCloseTo(4372, 1);
    /* O trilho a partir da ponta de cada painel: centrado, 411 no de 30 mm e 456 nos de 40 mm. */
    expect(m.trilhoNaPonta[0].trilhoBAPontaDeCima).toBeCloseTo(411, 1);
    expect(m.trilhoNaPonta[0].trilhoAAPontaDeBaixo).toBeCloseTo(411, 1);
    for (const p of m.trilhoNaPonta.slice(1)) expect(p.trilhoBAPontaDeCima).toBeCloseTo(456, 1);
    /* A haste de 250 mm, com o assento a 100 mm da ponta, passa 61 mm do plano de baixo do painel. */
    for (const h of m.hasteContraOPainel) expect(h.passaDoPainel).toBeCloseTo(61, 0);
    expect(relato(m)).toContain('Haste contra o painel');
  }, 60000);
});

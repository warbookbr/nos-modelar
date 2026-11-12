/* instalacao-solar/conferencias.test — fixa, com os valores provisórios do telhado e do kit, o que a montagem da instalação solar mede.
 *
 * Os valores que dependem da medida da pessoa (a distância entre vigas, a profundidade da haste, o furo do suporte) estão marcados "a
 * confirmar" nas receitas; este teste os lê como estão e prova que a conta da montagem os trata como o plano manda: o que não fecha
 * (a linha de cima de hastes sem viga embaixo, as regras de espaçamento fora da crista) aparece como número, e não some. Quando a pessoa
 * trouxer as medidas, o que mudar aqui muda por causa da tabela, e a comparação é entre o novo relato e este.
 */
import { describe, expect, it } from 'vitest';
import { conferirInstalacaoSolar, relato } from './conferencias.mjs';

describe('instalação solar: conferências da obra', () => {
  it('mede trilho, hastes, vigas, cristas, folgas e a altura da cadeia haste, suporte, trilho e painel', async () => {
    const m = await conferirInstalacaoSolar();
    /* Trilho: quatro perfis por linha, o último cortado para fechar 4550 mm; os dois trilhos a 900 mm um do outro ao longo da água. */
    expect(m.trilhos.A.pedacos).toEqual([1350, 1350, 1350, 500]);
    expect(m.comprimentoDeTrilho).toBe(4550);
    expect(m.trilhos.B.fimE - m.trilhos.B.inicioE).toBeCloseTo(4550, 1);
    expect(m.distanciaEntreTrilhos).toBeCloseTo(900, 1);
    /* As quatro hastes de baixo entram na viga da sobreposição; as de cima ficam a cerca de 79 cm da viga da cumeeira: não entram. */
    for (const h of m.hastes.filter((x) => x.id.startsWith('hasteA'))) expect(h.entraNaViga).toBe(true);
    for (const h of m.hastes.filter((x) => x.id.startsWith('hasteB'))) {
      expect(h.entraNaViga).toBe(false);
      expect(h.distanciaAoCentroDaViga).toBeCloseTo(790, 0);
    }
    /* O espaçamento é de 8 gomos (1416 mm), e as oito hastes caem na crista. */
    for (const e of m.espacamentoDasHastes.daMontagem) expect(e).toBeCloseTo(1416, 0);
    for (const h of m.hastes) expect(h.naCrista).toBe(true);
    /* As regras do documento não caem na crista (só a primeira haste), e as de 8 gomos caem todas; a de 8 gomos com a primeira a 30 cm pede 4848 mm. */
    const [r140, rIguais, centrada, aTrinta] = m.espacamentoDasHastes.opcoes;
    expect(r140.trilhoPedido).toBe(4800);
    expect(rIguais.hastes.filter((h) => h.naCrista)).toHaveLength(1);
    expect(centrada.hastes.every((h) => h.naCrista)).toBe(true);
    expect(centrada.primeiraHaste).toBeCloseTo(151, 0);
    expect(aTrinta.hastes.every((h) => h.naCrista)).toBe(true);
    expect(aTrinta.trilhoPedido).toBe(4848);
    /* Folgas entre painéis: 60 entre o de 30 e o de 40 (dois grampos de ponta de frente), 20 nas duas junções com intermediário. */
    expect(m.folgaEntrePaineis[0]).toBeCloseTo(60, 1);
    expect(m.folgaEntrePaineis[1]).toBeCloseTo(20, 1);
    expect(m.folgaEntrePaineis[2]).toBeCloseTo(20, 1);
    expect(m.fileiraDePaineis).toBeCloseTo(4372, 1);
    /* O trilho a partir da ponta de cada painel: centrado, 411 no de 30 mm e 456 nos de 40 mm. */
    expect(m.trilhoNaPonta[0].trilhoBAPontaDeCima).toBeCloseTo(411, 1);
    expect(m.trilhoNaPonta[0].trilhoAAPontaDeBaixo).toBeCloseTo(411, 1);
    for (const p of m.trilhoNaPonta.slice(1)) expect(p.trilhoBAPontaDeCima).toBeCloseTo(456, 1);
    /* A cadeia haste, suporte, trilho, painel: o assento na crista, a perna do suporte a 42, o trilho de 64 a 104, o painel assentado nele e o vidro a 144 (134 no de 30). */
    const a = m.alturasSobreACrista;
    expect(a.assentoDaHaste).toBeCloseTo(0, 1);
    expect(a.pernaDoSuporte).toBeCloseTo(42, 1);
    expect(a.fundoDoTrilho).toBeCloseTo(64, 1);
    expect(a.topoDoTrilho).toBeCloseTo(104, 1);
    for (const p of a.paineis) expect(p.fundoDoPainel).toBeCloseTo(a.topoDoTrilho, 1);
    expect(a.paineis[0].vidro).toBeCloseTo(134, 1);
    for (const p of a.paineis.slice(1)) expect(p.vidro).toBeCloseTo(144, 1);
    /* A ponta de cima da haste fica abaixo do painel que está sobre ela. */
    expect(a.pontaDeCimaDaHaste).toBeLessThan(a.topoDoTrilho);
    for (const h of m.hasteContraOPainel) expect(h.folgaAteOPainel).toBeCloseTo(31.5, 1);
    expect(relato(m)).toContain('Alturas sobre o plano das cristas');
  }, 60000);
});

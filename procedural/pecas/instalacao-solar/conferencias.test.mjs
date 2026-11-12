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
    /* As quatro hastes de baixo entram na viga da sobreposição; as de cima ficam a 32 cm da viga do meio da fileira de cima: não entram. */
    for (const h of m.hastes.filter((x) => x.id.startsWith('hasteA'))) expect(h.entraNaViga).toBe(true);
    for (const h of m.hastes.filter((x) => x.id.startsWith('hasteB'))) {
      expect(h.entraNaViga).toBe(false);
      expect(h.distanciaAoCentroDaViga).toBeCloseTo(320, 0);
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
    /* O trilho (o eixo do canal) a partir da ponta de cada painel: centrado, 411 no de 30 mm e 456 nos de 40 mm. */
    expect(m.trilhoNaPonta[0].trilhoBAPontaDeCima).toBeCloseTo(411, 1);
    expect(m.trilhoNaPonta[0].trilhoAAPontaDeBaixo).toBeCloseTo(411, 1);
    for (const p of m.trilhoNaPonta.slice(1)) expect(p.trilhoBAPontaDeCima).toBeCloseTo(456, 1);
    /* A cadeia haste, suporte, trilho, painel: o assento na crista, o pé do suporte a 38, o trilho de 90,5 a 135,5 (45 mm de seção), o painel assentado nele e o vidro a 175,5 (165,5 no de 30). */
    const a = m.alturasSobreACrista;
    expect(a.assentoDaHaste).toBeCloseTo(0, 1);
    expect(a.pernaDoSuporte).toBeCloseTo(38, 1);
    expect(a.fundoDoTrilho).toBeCloseTo(90.5, 1);
    expect(a.topoDoTrilho).toBeCloseTo(135.5, 1);
    for (const p of a.paineis) expect(p.fundoDoPainel).toBeCloseTo(a.topoDoTrilho, 1);
    expect(a.paineis[0].vidro).toBeCloseTo(165.5, 1);
    for (const p of a.paineis.slice(1)) expect(p.vidro).toBeCloseTo(175.5, 1);
    /* A ponta de cima da haste fica abaixo do painel que está sobre ela. */
    expect(a.pontaDeCimaDaHaste).toBeLessThan(a.topoDoTrilho);
    for (const h of m.hasteContraOPainel) expect(h.folgaAteOPainel).toBeCloseTo(63, 1);
    /* A ponta da haste passa 15 mm da porca de cima (de 15 a 20 nas fotos), o trilho passa 63 mm da ponta e o parafuso do L cai na metade de cima do rasgo. */
    expect(m.cadeia.pontaDaHasteAcimaDaPorcaDeCima).toBeGreaterThanOrEqual(15);
    expect(m.cadeia.pontaDaHasteAcimaDaPorcaDeCima).toBeLessThanOrEqual(20);
    expect(m.cadeia.topoDoTrilhoAcimaDaPontaDaHaste).toBeCloseTo(63, 1);
    expect(m.cadeia.parafusoDoLNoRasgo).toBeGreaterThan(0.5);
    expect(m.cadeia.parafusoDoLNoRasgo).toBeLessThanOrEqual(1);
    /* O madeiramento: cinco terças, a 1220 e 1240 mm uma da outra; a linha A cai na terça da sobreposição, a B a 320 mm da do meio da fileira de cima, e a
       alternativa de uma linha sobre cada terça vizinha põe os trilhos a 1220 ou 1240 mm, a 296 ou 286 mm das pontas dos painéis de 1812 mm. */
    expect(m.madeiramento.tercas.map((t) => t.s)).toEqual([80, 1300, 2540, 3760, 5000]);
    expect(m.madeiramento.entreTercas).toEqual([1220, 1240, 1220, 1240]);
    expect(m.madeiramento.linhasDeHastes.A).toMatchObject({ terca: 3, distancia: 0 });
    expect(m.madeiramento.linhasDeHastes.B).toMatchObject({ terca: 4, distancia: 320 });
    const alt = m.madeiramento.alternativaUmaLinhaEmCadaTerca;
    expect(alt[0].trilhoAPontaDoPainel.find((p) => p.id === 'painel2').ate).toBeCloseTo(296, 0);
    expect(alt[1].trilhoAPontaDoPainel.find((p) => p.id === 'painel1').ate).toBeCloseTo(241, 0);
    /* A casa: a largura sai das duas fileiras de 2,60 m (8775 mm, dentro dos 8 a 9 m da pessoa), a extensão passa 100 mm por baixo da beirada, e o telhado
       assenta na porta da água esquerda só por translação. */
    expect(m.casa.larguraDaCasaMaior).toBeGreaterThan(8000);
    expect(m.casa.larguraDaCasaMaior).toBeLessThan(9000);
    expect(m.casa.comprimentoDaAguaAoLongoDaInclinacao).toBe(5060);
    expect(m.casa.extensao.pontaDeCimaPassaDaBeiradaDaCasaMaior).toBeGreaterThan(0);
    expect(m.casa.telhadoNaPortaDaCasa.desvioDaOrigemEmRelacaoAPorta).toBeLessThan(0.01);
    expect(m.casa.telhadoNaPortaDaCasa.giroDoTelhado).toEqual([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
    expect(relato(m)).toContain('Alturas sobre o plano das cristas');
  }, 60000);
});

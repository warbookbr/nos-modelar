/* O recorte (`subtrai`) na blocagem do nível zero: a N2 não subtrai um volume de outro, então a forma recortada vai ao andaime
   inteira e a perda entra no relatório com o volume do vão, medido na blocagem (`recorte-ignorado`, ou a perda `recorte` somada à
   da aproximação do tipo). O molde (`cortador`) é oculto por natureza e fica fora do andaime. */
import { describe, expect, it } from 'vitest';
import { andaimeDoEsboco, descreverTraducao } from './esboco-para-andaime.mjs';
import { formasResolvidas } from '../../modulos/esboco/src/formas-resolvidas.js';

const caixa = (id, centro, [l, a, p], extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro, ...extra });
const doBloco = (extra = {}) => ({ opcoes: [{ titulo: 'T', formas: [caixa('bloco', [0, 0, 0], [400, 100, 300], { subtrai: ['vao'], ...extra }), caixa('vao', [0, 0, 0], [100, 60, 80], { cortador: true })] }] });

describe('o recorte no andaime do nível zero', () => {
  it('a caixa recortada vai inteira ao andaime e a perda traz o volume do vão, medido na blocagem', () => {
    const r = andaimeDoEsboco(doBloco());
    expect(r.andaime.volumes.map((v) => v.id)).toEqual(['bloco']);
    expect(r.ocultas).toEqual(['vao']);
    expect(r.naoTraduzidas).toEqual([]);
    expect(r.perdas).toHaveLength(1);
    const p = r.perdas[0];
    expect(p).toMatchObject({ id: 'bloco', aproximacao: 'recorte-ignorado' });
    expect(p.perdido).toEqual([{ codigo: 'recorte', descricao: expect.stringMatching(/o recorte por vao \(480000 mm3 retirados\) não tem equivalente na N2, que não subtrai um volume de outro/) }]);
    expect(p.volumeEsboco).toBeCloseTo(400 * 100 * 300 - 480000, 3);
    expect(p.erroVolume.mm3).toBeCloseTo(480000, 3);
    expect(p.erroEnvelope.mm).toBe(0);
    expect(descreverTraducao(r)).toContain('aproximado bloco (caixa, recorte-ignorado): volume +4.167% (480000 mm3)');
  });

  it('o recorte no loft soma a perda do vão à da aproximação do tipo, e o volume do esboço é o recortado', () => {
    const loft = { id: 'asa', tipo: 'loft', eixo: 'x', centro: [0, 0, 0], secoes: [{ pos: -500, forma: 'retangulo', tamanho: [300, 100] }, { pos: 500, forma: 'retangulo', tamanho: [300, 100] }], subtrai: ['vao'] };
    const r = andaimeDoEsboco({ opcoes: [{ titulo: 'T', formas: [loft, caixa('vao', [0, 0, 0], [100, 60, 80], { cortador: true })] }] });
    const p = r.perdas.find((x) => x.id === 'asa');
    expect(p.aproximacao).toBe('loft-como-casco');
    expect(p.perdido.map((d) => d.codigo)).toEqual(['recorte']);
    expect(p.volumeEsboco).toBeCloseTo(1000 * 300 * 100 - 480000, 3);
    expect(p.erroVolume.mm3).toBeCloseTo(480000, 3);
  });

  it('as formas resolvidas levam a caixa da forma recortada, e o envelope perdido aparece quando o recorte encolhe a forma', () => {
    const bruto = { opcoes: [{ titulo: 'T', formas: [caixa('barra', [0, 0, 0], [1000, 50, 100], { subtrai: ['corte'] }), caixa('corte', [500, 0, 0], [200, 80, 120], { cortador: true })] }] };
    expect(formasResolvidas(bruto).formas.find((f) => f.id === 'barra').geometria.caixa.max[0]).toBeCloseTo(400, 6);
    const p = andaimeDoEsboco(bruto).perdas[0];
    expect(p.erroEnvelope.mm).toBeCloseTo(100, 6);
    expect(p.envelopeEsboco.max[0]).toBeCloseTo(400, 6);
    expect(p.envelopeAndaime.max[0]).toBeCloseTo(500, 6);
  });
});

/* pente-de-curvatura.test.mjs — o pente de curvatura na chapa abaulada de prova. A seção x:400 passa pelo centro do amassado (y 300, raio de 80 mm):
 * a curvatura troca de sinal dentro dele e salta de um lado e do outro do centro (a cova tem curvatura de +0,75 1/m no centro, -1,5 1/m perto da borda e zero fora); a da chapa lisa é
 * constante (zero em x:400, o abaulamento de 6 m, 0,167 1/m, em y:300) e não tem salto nem troca de sinal. Tudo conferido nos números. */
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { AMASSADO } from '../blender/chapa-com-amassado-de-prova.mjs';
import { lerEntradaDeMedida } from './entrada-de-medida.mjs';
import { penteDeCurvatura } from './pente-de-curvatura.mjs';

const neutroDe = async (peca) => (await lerEntradaDeMedida(peca, { montagem: false })).executar().neutro;
const corte = (eixo, posicao) => ({ eixo, posicao });

describe('pente de curvatura', () => {
  it('na chapa com amassado a seção pelo centro mostra o salto nas bordas e a troca de sinal', async () => {
    const { json, png } = penteDeCurvatura(await neutroDe('chapa-de-reflexo-de-prova'), { corte: corte('x', AMASSADO.x * 1000), lado: '+z', nome: 'chapa' });
    expect(json.curvas).toHaveLength(1);
    const [c] = json.curvas;
    /* os saltos de curvatura ficam dentro do amassado (|y - 300| < 80), um de cada lado do centro, onde a curvatura cai de +0,75 a -1,5 1/m */
    const dentro = c.saltos.filter((s) => Math.abs(s.ponto[1] - AMASSADO.y * 1000) < AMASSADO.raio * 1000 && Math.abs(s.variacao) > 0.4);
    expect(dentro.length).toBeGreaterThanOrEqual(2);
    expect(dentro.some((s) => s.ponto[1] < AMASSADO.y * 1000) && dentro.some((s) => s.ponto[1] > AMASSADO.y * 1000)).toBe(true);
    expect(c.saltos.length).toBe(dentro.length);
    expect(c.mudancasDeSinal.length).toBeGreaterThanOrEqual(2);
    expect(c.mudancasDeSinal.every((m) => Math.abs(m.ponto[1] - AMASSADO.y * 1000) < AMASSADO.raio * 1000)).toBe(true);
    expect(c.resumo.maximo).toBeGreaterThan(0.4);
    expect(c.resumo.minimo).toBeLessThan(-0.4);
    const img = PNG.sync.read(png);
    expect([img.width, img.height]).toEqual([1280, 720]);
  });

  it('na chapa lisa as duas seções não têm salto nem troca de sinal', async () => {
    const neutro = await neutroDe('chapa-lisa-de-reflexo-de-prova');
    const transversal = penteDeCurvatura(neutro, { corte: corte('x', 400), lado: '+z' }).json;
    const longitudinal = penteDeCurvatura(neutro, { corte: corte('y', 300), lado: '+z' }).json;
    for (const j of [transversal, longitudinal]) { expect(j.saltos).toBe(0); expect(j.mudancasDeSinal).toBe(0); }
    expect(Math.abs(transversal.curvas[0].resumo.maximo)).toBeLessThan(0.02);
    expect(longitudinal.curvas[0].resumo.mediana).toBeGreaterThan(0.15); /* 1/6 m = 0,167 1/m */
    expect(longitudinal.curvas[0].resumo.mediana).toBeLessThan(0.18);
  });

  it('sem --lado a seção dá a volta pelas duas peles, e recusa corte ausente ou fora da peça', async () => {
    const neutro = await neutroDe('chapa-lisa-de-reflexo-de-prova');
    const volta = penteDeCurvatura(neutro, { corte: corte('x', 400) }).json.curvas;
    expect(volta).toHaveLength(1);
    expect(volta[0].fechada).toBe(true);
    expect(volta[0].comprimentoMm).toBeGreaterThan(1200); /* as duas peles de 600 mm e as paredes da borda */
    expect(() => penteDeCurvatura(neutro, {})).toThrow(/--corte/);
    expect(() => penteDeCurvatura(neutro, { corte: corte('x', 5000), lado: '+z' })).toThrow(/não corta a peça/);
  });
});

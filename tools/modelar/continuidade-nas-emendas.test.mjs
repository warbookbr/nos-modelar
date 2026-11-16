/* continuidade-nas-emendas.test.mjs — a continuidade nas emendas nas chapas de calibração do reflexo (`tools/fixtures/reflexo-calibracao/`):
 * acha o degrau (G0), o vinco (G1) e a quebra de curvatura (G2) na emenda declarada (x = 300 mm), com a fresta, o ângulo e a razão de
 * curvatura dentro de 10% do declarado em `CHAPAS[nome].defeito`, e não acusa nada na chapa lisa, que tem a mesma emenda sem defeito. */
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { CHAPAS } from '../fixtures/reflexo-calibracao/chapas.mjs';
import { continuidadeNasEmendas } from './continuidade-nas-emendas.mjs';
import { lerEntradaDeMedida } from './entrada-de-medida.mjs';

const neutroDe = async (nome) => (await lerEntradaDeMedida(`tools/fixtures/reflexo-calibracao/${nome}`, { montagem: false })).executar().neutro;
const medir = async (nome, opcoes = {}) => continuidadeNasEmendas(await neutroDe(nome), { nome, lado: '+z', vista: 'frontal', ...opcoes });
const dentro10 = (medido, declarado) => expect(Math.abs(medido - declarado) / declarado).toBeLessThanOrEqual(0.1);

/** A única emenda da chapa: as folhas `direita` e `esquerda`, ao longo de toda a linha x = 300. */
function aEmenda(json) {
  expect(json.emendas).toHaveLength(1);
  const [e] = json.emendas;
  expect(e.lados).toEqual(['direita', 'esquerda']);
  expect(e.comprimentoMm).toBeCloseTo(400, 0);
  expect(e.amostras.every((a) => Math.abs(a[1] - CHAPAS.lisa.defeito.emendaXMm) < 1)).toBe(true);
  return e;
}

describe('continuidade nas emendas', () => {
  it('na chapa lisa a emenda existe e não acusa nada: fresta 0, ângulo 0, razão 1', async () => {
    const { json } = await medir('lisa');
    const e = aEmenda(json);
    expect(e.acusa).toEqual({ fresta: 0, angulo: 0, curvatura: 0 });
    expect(json.resumo.acusam).toBe(0);
    expect(e.maximos.frestaMm.valor).toBeLessThan(0.01);
    expect(e.maximos.anguloGraus.valor).toBeLessThan(0.1);
    expect(e.maximos.razaoDeCurvatura.valor).toBeLessThan(1.05);
    expect(e.medianas.curvaturaA).toBeCloseTo(1000 / 1500, 2);
  });

  it('acha o degrau na emenda, com a fresta e o desnível declarados', async () => {
    const d = CHAPAS.degrau.defeito;
    const e = aEmenda((await medir('degrau')).json);
    dentro10(e.maximos.frestaMm.valor, d.frestaMm);
    dentro10(e.medianas.frestaMm, d.frestaMm);
    dentro10(e.medianas.desnivelMm, d.desnivelMm); /* A é a direita, que desce: B (a esquerda) fica para fora dela */
    expect(Math.abs(e.maximos.frestaMm.ponto[0] - d.emendaXMm)).toBeLessThan(1);
    expect(e.acusa.fresta).toBe(e.amostras.length);
    expect(e.acusa.angulo + e.acusa.curvatura).toBe(0);
  });

  it('acha o vinco na emenda, com o ângulo declarado', async () => {
    const d = CHAPAS.vinco.defeito;
    const { json, png } = await medir('vinco');
    const e = aEmenda(json);
    dentro10(e.maximos.anguloGraus.valor, d.anguloGraus);
    dentro10(e.medianas.anguloGraus, d.anguloGraus);
    expect(Math.abs(e.maximos.anguloGraus.ponto[0] - d.emendaXMm)).toBeLessThan(1);
    expect(e.acusa.angulo).toBe(e.amostras.length);
    expect(e.acusa.fresta + e.acusa.curvatura).toBe(0);
    const img = PNG.sync.read(png);
    expect([img.width, img.height]).toEqual([1280, 720]);
    /* a emenda pintada na cor do ângulo de 6 graus na escala de 10: laranja, ao longo da linha */
    let laranja = 0;
    for (let i = 0; i < img.width * img.height; i++) if (img.data[4 * i] > 200 && img.data[4 * i + 1] > 120 && img.data[4 * i + 1] < 190 && img.data[4 * i + 2] < 80) laranja++;
    expect(laranja).toBeGreaterThan(1500);
  });

  it('acha a quebra de curvatura na emenda, com a razão declarada e a tangente contínua', async () => {
    const d = CHAPAS['quebra-de-curvatura'].defeito;
    const e = aEmenda((await medir('quebra-de-curvatura', { cor: 'razao' })).json);
    dentro10(e.maximos.razaoDeCurvatura.valor, d.razaoDeCurvatura);
    dentro10(e.medianas.razaoDeCurvatura, d.razaoDeCurvatura);
    dentro10(e.medianas.curvaturaB, d.curvaturaEsquerda); /* B é a esquerda */
    dentro10(e.medianas.curvaturaA, d.curvaturaDireita);
    expect(e.maximos.anguloGraus.valor).toBeLessThan(0.1);
    expect(e.acusa.curvatura).toBe(e.amostras.length);
    expect(e.acusa.fresta + e.acusa.angulo).toBe(0);
  });

  it('sem --lado a casca dá a volta pelas duas peles; recusa opção inválida', async () => {
    const neutro = await neutroDe('vinco');
    const { json } = continuidadeNasEmendas(neutro, { vista: 'frontal' });
    expect(json.emendas[0].comprimentoMm).toBeGreaterThan(800); /* a pele de fora, a quina e a de dentro */
    expect(json.emendas[0].maximos.anguloGraus.valor).toBeGreaterThan(5.4);
    expect(() => continuidadeNasEmendas(neutro, { por: 'cor' })).toThrow(/--por/);
    expect(() => continuidadeNasEmendas(neutro, { cor: 'azul' })).toThrow(/--cor/);
    expect(() => continuidadeNasEmendas(neutro, { lado: '+w' })).toThrow(/--lado/);
    expect(() => continuidadeNasEmendas(neutro, { raioMm: 0 })).toThrow(/--raio/);
  });
});

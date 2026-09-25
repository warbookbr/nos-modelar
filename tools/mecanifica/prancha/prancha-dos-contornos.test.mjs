/* prancha-dos-contornos.test.mjs — a prancha da lateral do braço sai dos
   contornos gravados, sem parte fora da silhueta e sem a parte fora do modelo. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { prancha, colisoesDoDesenho } from './prancha.mjs';
import { specDosContornos } from './prancha-dos-contornos.mjs';

const escolhasDoBraco = JSON.parse(readFileSync(new URL('../../../procedural/pecas/braco-robotico/referencias/lateral.prancha.json', import.meta.url), 'utf8'));
const contornos = JSON.parse(readFileSync(new URL('../../../procedural/pecas/braco-robotico/referencias/lateral.contornos.json', import.meta.url), 'utf8'));

describe('prancha dos contornos', () => {
  it('desenha as partes do modelo dentro da silhueta e deixa o cabo de fora', () => {
    const spec = specDosContornos(contornos);
    const nomes = spec.camadas.map((c) => c.nome);
    expect(nomes).toContain('ombro');
    expect(nomes).not.toContain('cabo');
    const { relatorio } = prancha(spec);
    expect(relatorio.alertas.filter((a) => /fora do contorno/.test(a))).toEqual([]);
  });

  it('recusa arquivo sem silhueta', () => {
    expect(() => specDosContornos({ ...contornos, silhueta: undefined })).toThrow(/silhueta/);
  });

  it('sem declaração a cota segue a regra antiga: largura a um terço da altura da parte, dentro dela', () => {
    const spec = specDosContornos(contornos, { escolhas: { cotas: [{ parte: 'base', medida: 'largura' }] } });
    const c = spec.cotas.find((x) => x.dono === 'base.largura');
    const ys = contornos.regioes.base.contornoMm.map(([, y]) => y);
    expect(c.de[1]).toBeCloseTo(Math.min(...ys) + 0.33 * (Math.max(...ys) - Math.min(...ys)), 6);
    expect(c.desloca).toEqual([0, 0]);
  });

  it('respeita onde medir, os dois pontos, o afastamento e a posição do número declarados', () => {
    const spec = specDosContornos(contornos, { escolhas: { cotas: [
      { parte: 'base', medida: 'largura', em: 60, numero: [0, -20] },
      { parte: 'base', medida: 'altura', em: 60 },
      { parte: 'flange', medida: 'altura', em: 770, afasta: 45 },
      { parte: 'braco', medida: 'distancia', de: [0, 400], ate: [0, 700] },
    ] } });
    const [larg, alt, fl, dist] = spec.cotas.slice(2);
    expect(larg.de[1]).toBe(60);
    expect(larg.numero).toEqual([0, 20 * spec.escala]);
    expect(alt.de[0]).toBe(60);
    expect(alt.desloca).toEqual([0, 0]);
    expect(fl.desloca[0]).toBeCloseTo(45 * spec.escala, 6);
    expect(dist.texto).toBe('300');
  });

  it('cota não medível vira nota com o motivo e não desenha número', () => {
    const spec = specDosContornos(contornos, { escolhas: { cotas: [{ parte: 'ombro', medida: 'altura', medivel: false, motivo: 'o topo some atrás do braço' }] } });
    expect(spec.cotas.filter((c) => c.dono === 'ombro.altura')).toEqual([]);
    expect(spec.anotacoes).toHaveLength(1);
    expect(spec.anotacoes[0].texto).toMatch(/ombro altura: o topo some/);
    expect(() => specDosContornos(contornos, { escolhas: { cotas: [{ parte: 'ombro', medida: 'altura', medivel: false }] } })).toThrow(/motivo/);
  });

  it('põe o nome declarado fora da parte com linha de chamada', () => {
    const { desenho } = prancha(specDosContornos(contornos, { escolhas: { nomes: { base: { em: [300, 100] } } } }));
    expect(desenho.linhas.some((l) => l.dono === 'base' && l.tipo === 'chamada')).toBe(true);
  });

  it('acusa texto sobre texto e linha alheia sobre texto', () => {
    const { desenho } = prancha(specDosContornos(contornos, { escolhas: { cotas: [
      { parte: 'antebraco', medida: 'altura', em: 300 },
      { parte: 'antebraco', medida: 'largura', em: 960 },
    ], nomes: { antebraco: { em: [290, 955] } } } }));
    const col = colisoesDoDesenho(desenho);
    expect(col.some((c) => c.tipo === 'texto sobre texto')).toBe(true);
    expect(col.some((c) => c.tipo === 'linha sobre texto')).toBe(true);
  });

  it('a prancha declarada do braço sai com zero colisões', () => {
    const { desenho } = prancha(specDosContornos(contornos, { escolhas: escolhasDoBraco }));
    expect(colisoesDoDesenho(desenho)).toEqual([]);
  });
});

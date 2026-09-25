/* prancha-dos-contornos.test.mjs — a prancha da lateral do braço sai dos
   contornos gravados, sem parte fora da silhueta e sem a parte fora do modelo. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { prancha, colisoesDoDesenho } from './prancha.mjs';
import { specDosContornos, roteiroDaPrancha } from './prancha-dos-contornos.mjs';

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

  it('acusa texto sobre texto e linha alheia sobre número', () => {
    const { desenho } = prancha(specDosContornos(contornos, { escolhas: { cotas: [
      { parte: 'antebraco', medida: 'largura', em: 960 },
      { parte: 'carcacaPunho', medida: 'largura', em: 960, numero: [-250, 0] },
      { parte: 'antebraco', medida: 'altura', em: 330 },
    ] } }));
    const col = colisoesDoDesenho(desenho);
    expect(col.some((c) => c.tipo === 'texto sobre texto')).toBe(true);
    expect(col.some((c) => c.tipo === 'linha sobre número')).toBe(true);
  });

  it('acusa linha contra linha: cota de outra parte sobre chamada e cotas de partes diferentes cruzadas', () => {
    const { desenho } = prancha(specDosContornos(contornos, { escolhas: { cotas: [
      { parte: 'antebraco', medida: 'altura', em: 300 },
      { parte: 'carcacaPunho', medida: 'largura', de: [250, 950], ate: [700, 950] },
    ], nomes: { anelAntebraco: { marca: [155, 950], coluna: 'direita' } } } }));
    const col = colisoesDoDesenho(desenho);
    expect(col.some((c) => c.tipo === 'linha sobre linha' && /chamada de anelAntebraco/.test(c.b) && /antebraco\.altura/.test(c.a))).toBe(true);
    expect(col.some((c) => c.tipo === 'linha sobre linha' && /carcacaPunho\.largura/.test(c.a + c.b) && /antebraco\.altura/.test(c.a + c.b))).toBe(true);
  });

  it('não acusa largura e altura da mesma parte cruzadas dentro dela', () => {
    const { desenho } = prancha(specDosContornos(contornos, { escolhas: { cotas: [
      { parte: 'base', medida: 'largura', em: 60 }, { parte: 'base', medida: 'altura', em: 60 },
    ] } }));
    expect(colisoesDoDesenho(desenho).filter((c) => /base\.largura/.test(c.a + c.b) && /base\.altura/.test(c.a + c.b))).toEqual([]);
  });

  it('põe os nomes em duas colunas fora da silhueta e das cotas, sem chamada cruzada', () => {
    const spec = specDosContornos(contornos);
    const zs = contornos.silhueta.contornoMm.map(([z]) => z);
    const colunas = new Set(spec.landmarks.map((l) => l.rotuloEm[0]));
    expect(colunas.size).toBe(2);
    for (const l of spec.landmarks) expect(l.rotuloEm[0] < Math.min(...zs) || l.rotuloEm[0] > Math.max(...zs)).toBe(true);
    const { desenho } = prancha(spec);
    expect(colisoesDoDesenho(desenho).filter((c) => c.tipo === 'chamada sobre chamada')).toEqual([]);
    /* Na mesma coluna, quem tem a marca mais alta tem o nome mais alto. */
    for (const lado of [(l) => l.rotuloAncora === 'end', (l) => l.rotuloAncora !== 'end']) {
      const col = spec.landmarks.filter(lado).sort((a, b) => b.em[1] - a.em[1]);
      for (let i = 1; i < col.length; i += 1) expect(col[i].rotuloEm[1]).toBeLessThan(col[i - 1].rotuloEm[1]);
    }
  });

  it('a coluna declarada e o nível mandam no lugar do nome', () => {
    const spec = specDosContornos(contornos, { escolhas: { nomes: { base: { coluna: 'direita', nivel: 100 } } } });
    const base = spec.landmarks.find((l) => l.id === 'base');
    expect(base.rotuloAncora).toBeUndefined();
    expect(base.rotuloEm[1]).toBeCloseTo(100 - 3 / spec.escala, 6);
    expect(() => specDosContornos(contornos, { escolhas: { nomes: { base: { coluna: 'meio' } } } })).toThrow(/coluna/);
  });

  it('medida de outra vista vira cota com a origem, e a nota sem medida fica em falta', () => {
    const frontal = { regioes: { ombro: { contornoMm: [[-50, 280], [50, 280], [50, 470], [-50, 470]] } } };
    const spec = specDosContornos(contornos, { escolhas: { cotas: [
      { parte: 'ombro', medida: 'altura', origem: { imagem: 'frontal' } },
      { parte: 'braco', medida: 'altura', medivel: false, motivo: 'escondido' },
    ] }, lerVista: (n) => (n === 'frontal' ? frontal : null) });
    const c = spec.cotas.find((x) => x.dono === 'ombro.altura');
    expect(c.texto).toBe('190 (frontal)');
    expect(c.ate[1] - c.de[1]).toBeCloseTo(190, 6);
    expect(spec.resumo.faltas).toEqual([{ dono: 'braco.altura', motivo: 'escondido' }]);
  });

  it('diz com clareza quando a outra vista ainda não tem contornos', () => {
    expect(() => specDosContornos(contornos, { escolhas: { cotas: [{ parte: 'ombro', medida: 'altura', origem: { imagem: 'frontal' } }] }, lerVista: () => null }))
      .toThrow(/vista 'frontal', que ainda não tem contornos/);
  });

  it('o roteiro do crítico tem uma etapa por parte com largura, altura, nome e linhas', () => {
    const spec = specDosContornos(contornos, { escolhas: escolhasDoBraco });
    const r = roteiroDaPrancha({ alvo: 'a.png', prancha: 'p.png', spec });
    expect((r.match(/^## Etapa /gm) ?? []).length).toBe(spec.resumo.partes.length + 2);
    for (const parte of spec.resumo.partes) expect(r).toContain(`— ${parte}\n`);
    expect(r).toMatch(/- largura: cota \d+/);
    expect(r).toMatch(/ombro[\s\S]*altura: EM FALTA/);
    expect(r).toMatch(/linhas livres/);
  });

  it('a prancha declarada do braço sai com zero colisões', () => {
    const { desenho } = prancha(specDosContornos(contornos, { escolhas: escolhasDoBraco }));
    expect(colisoesDoDesenho(desenho)).toEqual([]);
  });
});

/* prancha-dos-contornos.test.mjs — a prancha da lateral do braço sai dos
   contornos gravados, sem parte fora da silhueta e sem a parte fora do modelo. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { prancha, colisoesDoDesenho, examinarDesenho } from './prancha.mjs';
import { specDosContornos, roteiroDaPrancha, linhasDePrevalencia, PASSO_DOS_NOMES_PROXIMOS } from './prancha-dos-contornos.mjs';

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
    const frontal = { regioes: { ombro: { contornoMm: [[-50, 280], [50, 280], [50, 460], [-50, 460]] } } };
    const spec = specDosContornos(contornos, { escolhas: { cotas: [
      { parte: 'ombro', medida: 'altura', em: 150, origem: { imagem: 'frontal' } },
      { parte: 'braco', medida: 'altura', medivel: false, motivo: 'escondido' },
    ] }, lerVista: (n) => (n === 'frontal' ? frontal : null) });
    const c = spec.cotas.find((x) => x.dono === 'ombro.altura');
    expect(c.texto).toBe('180 (frontal)');
    expect(c.ate[1] - c.de[1]).toBeCloseTo(180, 6);
    /* Cota externa (em fora da parte) começa no pé da parte visível. */
    expect(c.de[1]).toBeCloseTo(Math.min(...contornos.regioes.ombro.contornoMm.map(([, y]) => y)), 6);
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

  it('recusa a medida de outra vista que discorda desta além da tolerância', () => {
    const alt = (h) => ({ regioes: { ombro: { contornoMm: [[-50, 0], [50, 0], [50, h], [-50, h]] } } });
    const cota = (extra) => specDosContornos(contornos, { escolhas: { cotas: [{ parte: 'ombro', medida: 'altura', origem: { imagem: 'frontal' }, ...extra }] }, lerVista: () => alt(200) });
    /* 200 contra os 183 da lateral, como os 477 contra 456 do braço: externa ou na seção, a linha sairia da parte. */
    expect(() => cota({ em: 150 })).toThrow(/dá 200 mm e esta mostra 183 mm de 'ombro' de ponta a ponta.*vistas discordam/);
    expect(() => cota({ em: 0 })).toThrow(/sairia da parte e cobriria a vizinha/);
    /* Menor que a parte inteira ao lado dela também engana: não diz onde começa. */
    expect(() => specDosContornos(contornos, { escolhas: { cotas: [{ parte: 'ombro', medida: 'altura', em: 150, origem: { imagem: 'frontal' } }] }, lerVista: () => alt(160) })).toThrow(/não bate com a parte/);
  });

  it('prevalece com motivo aceita a medida da outra vista que discorda, e sem motivo recusa', () => {
    const alt = (h) => ({ regioes: { ombro: { contornoMm: [[-50, 0], [50, 0], [50, h], [-50, h]] } } });
    const faz = (extra) => specDosContornos(contornos, { escolhas: { cotas: [{ parte: 'ombro', medida: 'altura', em: 0, origem: { imagem: 'frontal' }, ...extra }] }, lerVista: () => alt(200) });
    expect(() => faz({})).toThrow(/vistas discordam/);
    expect(() => faz({ prevalece: '' })).toThrow(/prevalece sem motivo/);
    expect(() => faz({ prevalece: '   ' })).toThrow(/prevalece sem motivo/);
    const spec = faz({ prevalece: 'a pessoa decidiu em 2026-09-26 que a frontal vale para a altura do ombro' });
    const c = spec.cotas.find((x) => x.dono === 'ombro.altura');
    expect(c.ate[1] - c.de[1]).toBeCloseTo(200, 6);
    expect(c.texto).toBe('200 (frontal, prevalece)');
    /* A linha vai por fora da parte, depois da borda direita, sem cruzar a vizinha. */
    const xs = contornos.regioes.ombro.contornoMm.map((q) => q[0]);
    expect(c.de[0]).toBeGreaterThan(Math.max(...xs));
    expect(spec.resumo.prevalencias).toHaveLength(1);
    expect(linhasDePrevalencia(spec.resumo.prevalencias)).toEqual(['  PREVALECE ombro.altura: vista frontal dá 200 mm e esta mostra 183 mm; motivo: a pessoa decidiu em 2026-09-26 que a frontal vale para a altura do ombro']);
  });

  it('de escolhe onde a cota de outra vista começa, e recusa a linha que não cabe', () => {
    const frontal = { regioes: { ombro: { contornoMm: [[-50, 0], [50, 0], [50, 100], [-50, 100]] } } };
    /* Em z = 90 a lateral mostra o ombro de 276 a 457 mm. */
    const y1 = 457;
    const faz = (de) => specDosContornos(contornos, { escolhas: { cotas: [{ parte: 'ombro', medida: 'altura', em: 90, de, origem: { imagem: 'frontal' } }] }, lerVista: () => frontal }).cotas.find((x) => x.dono === 'ombro.altura');
    const fim = faz('fim');
    expect(fim.ate[1] - fim.de[1]).toBeCloseTo(100, 6);
    expect(fim.ate[1]).toBeCloseTo(y1, 0);
    expect(faz(330).de[1]).toBe(330);
    expect(() => faz(420)).toThrow(/sairia da parte: a linha iria de 420 a 520/);
  });

  it('acusa chamadas coladas, número sobre contorno, cota sobre outra parte, marca na borda e chamada que atravessa parte', () => {
    const quad = (dono, x0, y0, x1, y1) => ({ dono, tipo: 'contorno', parte: true, pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]] });
    const desenho = {
      textos: [{ dono: 'a.largura', tipo: 'cota', texto: '24', caixa: [96, 40, 104, 49] }],
      linhas: [
        quad('a', 0, 0, 100, 100), quad('b', 100, 0, 200, 100), quad('c', 0, 100, 200, 200),
        { dono: 'x', tipo: 'chamada', pts: [[300, 10], [500, 20]] },
        { dono: 'y', tipo: 'chamada', pts: [[300, 20], [500, 32]] },
        { dono: 'a.altura', tipo: 'cota', pts: [[50, 10], [50, 150]] },
        { dono: 'a', tipo: 'chamada', pts: [[50, 1], [-60, 1]] },
        { dono: 'b', tipo: 'chamada', pts: [[150, 50], [-60, 50]] },
      ],
    };
    const { colisoes } = examinarDesenho(desenho);
    const tipos = colisoes.map((c) => c.tipo);
    expect(tipos).toContain('chamadas coladas');
    expect(tipos).toContain('número sobre contorno');
    expect(colisoes.find((c) => c.tipo === 'cota sobre outra parte')).toMatchObject({ a: 'cota de a.altura', b: 'c' });
    expect(colisoes.find((c) => c.tipo === 'marca fora da parte')).toMatchObject({ a: 'chamada de a' });
    /* b tem saída livre pela direita, então atravessar a é colisão. */
    expect(colisoes.find((c) => c.tipo === 'chamada atravessa parte')).toMatchObject({ a: 'chamada de b', b: 'a' });
  });

  it('chamada de parte cercada dos dois lados fica como aviso, e largura com altura da mesma parte segue permitida', () => {
    const quad = (dono, x0, x1) => ({ dono, tipo: 'contorno', parte: true, pts: [[x0, 0], [x1, 0], [x1, 100], [x0, 100], [x0, 0]] });
    const desenho = {
      textos: [],
      linhas: [
        quad('esq', 0, 100), quad('meio', 100, 200), quad('dir', 200, 300),
        { dono: 'meio', tipo: 'chamada', pts: [[150, 50], [-40, 20]] },
        { dono: 'meio.largura', tipo: 'cota', pts: [[110, 30], [190, 30]] },
        { dono: 'meio.altura', tipo: 'cota', pts: [[170, 5], [170, 95]] },
      ],
    };
    const { colisoes, avisos } = examinarDesenho(desenho);
    expect(colisoes).toEqual([]);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({ tipo: 'chamada atravessa parte', a: 'chamada de meio', b: 'esq' });
  });

  it('abre o passo da coluna quando as marcas estão próximas', () => {
    const spec = specDosContornos(contornos, { escolhas: { nomes: {
      anelAntebraco: { marca: [155, 950], coluna: 'esquerda', nivel: 1000 },
      antebraco: { marca: [170, 945], coluna: 'esquerda', nivel: 1000 },
    } } });
    const ys = ['anelAntebraco', 'antebraco'].map((id) => spec.landmarks.find((l) => l.id === id).rotuloEm[1]);
    expect(Math.abs(ys[0] - ys[1]) * spec.escala).toBeGreaterThanOrEqual(PASSO_DOS_NOMES_PROXIMOS - 1e-6);
  });

  /* A prancha da série anterior do braço saía com zero colisões e o crítico
     achava defeitos nela; o detector agora acusa esses defeitos sozinho. Ela
     não é consertada aqui: será refeita numa série nova. */
  it('a prancha declarada do braço da série anterior agora acusa os defeitos que só o crítico achava', () => {
    const { desenho } = prancha(specDosContornos(contornos, { escolhas: escolhasDoBraco }));
    const tipos = new Set(colisoesDoDesenho(desenho).map((c) => c.tipo));
    for (const t of ['cota sobre outra parte', 'chamada atravessa parte', 'marca fora da parte', 'chamadas coladas']) expect(tipos).toContain(t);
    expect([...tipos].filter((t) => t === 'texto sobre texto')).toEqual([]);
  });
});

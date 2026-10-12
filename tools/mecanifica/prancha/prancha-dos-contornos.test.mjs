/* prancha-dos-contornos.test.mjs — a prancha da lateral do braço sai dos
   contornos gravados, sem parte fora da silhueta e sem a parte fora do modelo. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { prancha, colisoesDoDesenho, examinarDesenho } from './prancha.mjs';
import { specDosContornos, vistaDasEscolhas, VISTAS_DA_PRANCHA, roteiroDaPrancha, cotasDaPrancha, linhasDeCotasEmFalta, linhasDePrevalencia, PASSO_DOS_NOMES_PROXIMOS } from './prancha-dos-contornos.mjs';

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
    expect(r).toMatch(/- comprimento: cota \d+/);
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

  it('toda parte tem largura e altura obrigatórias, cada uma num estado, e a falta sai listada por parte', () => {
    const escolhas = { cotas: [
      { parte: 'a', medida: 'largura' },
      { parte: 'a', medida: 'altura', origem: { imagem: 'frontal' } },
      { parte: 'b', medida: 'largura', origem: { imagem: 'frontal' }, prevalece: 'pessoa decidiu' },
      { parte: 'b', medida: 'altura', medivel: false, motivo: 'escondida' },
      { parte: 'c', medida: 'altura', medivel: false },
    ] };
    const { lista, faltas } = cotasDaPrancha(['a', 'b', 'c'], escolhas);
    expect(lista.map((x) => x.estado)).toEqual(['medida aqui', 'da vista frontal', 'da vista frontal, prevalece', 'não medível: escondida', 'em falta', 'em falta (medivel: false sem motivo)']);
    expect(linhasDeCotasEmFalta(faltas)).toEqual(['  FALTA COTA c: largura e altura']);
  });

  it('o roteiro lista por parte as duas cotas esperadas e o estado de cada uma', () => {
    const spec = specDosContornos(contornos, { escolhas: escolhasDoBraco });
    const r = roteiroDaPrancha({ alvo: 'a.png', prancha: 'p.png', spec });
    expect((r.match(/- cotas esperadas: comprimento \(.+\) e altura \(.+\)/g) ?? []).length).toBe(spec.resumo.partes.length);
    expect(r).toMatch(/— ombro\n\n- cotas esperadas: comprimento \([^)]*\) e altura \(não medível/);
  });

  /* A hélice do avião vista de lado: o cone cobre o meio e sobram duas pás, uma
     acima e outra abaixo dele. O maior pedaço (300 mm) mede só uma pá. */
  describe('parte em vários pedaços', () => {
    const ret = (z0, y0, z1, y1) => [[z0, y0], [z1, y0], [z1, y1], [z0, y1]];
    const pa = (z0, y0, z1, y1) => ({ areaMm2: (z1 - z0) * (y1 - y0), contornoMm: ret(z0, y0, z1, y1) });
    const aviao = {
      mmPorPx: 1,
      silhueta: { contornoMm: ret(0, 0, 400, 1000), linhaDeForaMm: ret(-1, -1, 401, 1001) },
      regioes: {
        helice: { contornoMm: ret(20, 0, 60, 300), pedacos: [pa(20, 0, 60, 300), pa(20, 700, 60, 1000)] },
        cone: { contornoMm: ret(20, 300, 60, 700), pedacos: [pa(20, 300, 60, 700)] },
        corpo: { contornoMm: ret(60, 0, 400, 1000), pedacos: [pa(60, 0, 400, 1000)] },
      },
    };
    const cotar = (extra = {}, base = aviao, lerVista) => specDosContornos(base, { escolhas: { cotas: [{ parte: 'helice', medida: 'altura', ...extra }] }, lerVista });

    it('a altura e a largura medidas são as da união dos pedaços, e não as do maior', () => {
      const alt = cotar().cotas.find((x) => x.dono === 'helice.altura');
      expect(alt.texto).toBe('1000');
      expect([alt.de[1], alt.ate[1]]).toEqual([0, 1000]);
      /* Sem `pedacos`, o arquivo gravado antes do campo existir, vale o contornoMm: uma pá. */
      const antigo = { ...aviao, regioes: { ...aviao.regioes, helice: { contornoMm: aviao.regioes.helice.contornoMm } } };
      expect(cotar({}, antigo).cotas.find((x) => x.dono === 'helice.altura').texto).toBe('300');
      /* A largura a um terço da altura da união cai no vão (y = 330), onde só há o cone: cai na caixa da união. */
      const larg = specDosContornos(aviao, { escolhas: { cotas: [{ parte: 'helice', medida: 'largura' }] } }).cotas.find((x) => x.dono === 'helice.largura');
      expect(larg.texto).toBe('40');
      expect(larg.de[1]).toBeCloseTo(330, 6);
    });

    it('desenha todos os pedaços da parte, o segundo em diante marcados, e mede a forma uma vez', () => {
      const spec = cotar();
      const camadas = spec.camadas.filter((c) => c.nome === 'helice');
      expect(camadas.map((c) => c.pts)).toEqual(aviao.regioes.helice.pedacos.map((p) => p.contornoMm));
      expect(camadas.map((c) => c.pedaco)).toEqual([undefined, 2]);
      const { relatorio } = prancha(spec);
      expect(relatorio.alertas.filter((a) => /fora do contorno/.test(a))).toEqual([]);
      /* A forma da parte é medida uma vez, no maior pedaço: o mesmo número de quando a parte só tinha esse pedaço. */
      const so = { ...aviao, regioes: { ...aviao.regioes, helice: { contornoMm: aviao.regioes.helice.contornoMm } } };
      expect(relatorio.porCamada.helice).toEqual(prancha(cotar({}, so)).relatorio.porCamada.helice);
    });

    it('o nome da parte fica dentro do maior pedaço, e não no centro da união, que cai no cone', () => {
      const marca = cotar().landmarks.find((l) => l.id === 'helice').em;
      expect(marca[1]).toBeGreaterThan(0);
      expect(marca[1]).toBeLessThan(300);
    });

    it('a cota que passa por outro pedaço da mesma parte não o acusa como invasão, só o cone', () => {
      const { desenho } = prancha(cotar({ em: 40, afasta: 0 }));
      const invadidas = colisoesDoDesenho(desenho).filter((c) => c.tipo === 'cota sobre outra parte' && c.a === 'cota de helice.altura');
      expect(invadidas.map((c) => c.b)).toEqual(['cone']);
    });

    it('a medida tirada de outra vista também é a da união dos pedaços dela', () => {
      const frontal = { regioes: { helice: { contornoMm: ret(0, 0, 40, 300), pedacos: [pa(0, 0, 40, 300), pa(0, 700, 40, 1000)] } } };
      const c = cotar({ em: 40, origem: { imagem: 'frontal' } }, aviao, () => frontal).cotas.find((x) => x.dono === 'helice.altura');
      expect(c.texto).toBe('1000 (frontal)');
    });
  });

  /* A planta do avião: a envergadura na horizontal e o comprimento na vertical. */
  describe('vista da prancha', () => {
    const ret = (x0, v0, x1, v1) => [[x0, v0], [x1, v0], [x1, v1], [x0, v1]];
    const topo = {
      mmPorPx: 1,
      silhueta: { contornoMm: ret(-600, -100, 600, 1000), linhaDeForaMm: ret(-601, -101, 601, 1001) },
      regioes: {
        asa: { contornoMm: ret(-600, 300, 600, 500) },
        fuselagem: { contornoMm: ret(-60, -100, 60, 1000) },
      },
    };
    const escolhas = { vista: 'topo', cotas: [{ parte: 'asa', medida: 'largura' }, { parte: 'asa', medida: 'altura' }, { parte: 'fuselagem', medida: 'altura', medivel: false, motivo: 'a asa a esconde' }] };

    it('a lateral é a vista de quando nada é declarado, e uma vista que não existe é recusada', () => {
      expect(vistaDasEscolhas({})).toBe('lateral');
      const spec = specDosContornos(contornos);
      expect(Object.keys(spec.vistas)).toEqual(['lateral']);
      expect(spec.vistas.lateral.rotulo).toBe('LATERAL — projeção');
      expect(spec.titulo).toBe('Prancha lateral pelos contornos da imagem');
      expect(spec.cotas.find((c) => c.dono === 'geral.largura').texto).toMatch(/^comprimento \d+$/);
      expect(spec.cotas.find((c) => c.dono === 'geral.altura').texto).toMatch(/^altura \d+$/);
      expect(() => vistaDasEscolhas({ vista: 'planta' })).toThrow(/lateral, topo, frontal.*'planta'/);
    });

    it('a prancha de topo sai com o rótulo de topo e o comprimento na vertical, e não "altura"', () => {
      const spec = specDosContornos(topo, { escolhas });
      expect(Object.keys(spec.vistas)).toEqual(['topo']);
      expect(spec.vistas.topo.rotulo).toBe('TOPO — projeção');
      expect(spec.titulo).toBe('Prancha de topo pelos contornos da imagem');
      expect(spec.cotas.find((c) => c.dono === 'geral.largura').texto).toBe('largura 1200');
      expect(spec.cotas.find((c) => c.dono === 'geral.altura').texto).toBe('comprimento 1100');
      expect(spec.cotas.every((c) => c.vista === 'topo')).toBe(true);
      expect(spec.anotacoes[0].texto).toBe('fuselagem comprimento: a asa a esconde');
      expect(spec.camadas.map((c) => c.nome)).toEqual(['silhuetaTopo', 'asa', 'fuselagem']);
    });

    it('a prancha de topo é desenhada e medida sem alerta, e o relatório e o SVG falam de topo', () => {
      const { svg, relatorio } = prancha(specDosContornos(topo, { escolhas }));
      expect(relatorio.alertas).toEqual([]);
      expect(Object.keys(relatorio.porVista)).toEqual(['topo']);
      expect(relatorio.porVista.topo).toMatchObject({ contornoFechado: true, pontosForaDoContorno: 0 });
      expect(Math.round(relatorio.porVista.topo.caixa.xMax - relatorio.porVista.topo.caixa.xMin)).toBe(1202);
      expect(Math.round(relatorio.porVista.topo.caixa.yMax - relatorio.porVista.topo.caixa.yMin)).toBe(1102);
      expect(svg).toContain('TOPO — projeção');
      expect(svg).not.toContain('LATERAL');
    });

    it('a cota de comprimento mede na vertical e a de largura na horizontal', () => {
      const spec = specDosContornos(topo, { escolhas: { vista: 'topo', cotas: [{ parte: 'fuselagem', medida: 'altura', em: 0 }, { parte: 'asa', medida: 'largura' }] } });
      const comp = spec.cotas.find((c) => c.dono === 'fuselagem.altura');
      expect([comp.de[0], comp.de[1], comp.ate[1], comp.texto]).toEqual([0, -100, 1000, '1100']);
      const larg = spec.cotas.find((c) => c.dono === 'asa.largura');
      expect([larg.de[0], larg.ate[0], larg.texto]).toEqual([-600, 600, '1200']);
    });

    it('o roteiro do crítico diz a vista e usa as palavras dela', () => {
      const spec = specDosContornos(topo, { escolhas });
      const r = roteiroDaPrancha({ alvo: 'topo.png', prancha: 'topo.prancha.png', spec });
      expect(r).toContain('A vista é topo: na horizontal a prancha mede largura e na vertical comprimento.');
      expect(r).toMatch(/— asa\n\n- cotas esperadas: largura \(medida aqui\) e comprimento \(medida aqui\)/);
      expect(r).toMatch(/- comprimento: cota \d+\. A linha mede asa de ponta a ponta na vertical/);
      expect(r).not.toMatch(/- altura:/);
      expect(Object.keys(VISTAS_DA_PRANCHA)).toEqual(['lateral', 'topo', 'frontal']);
    });

    it('a frontal mede largura na horizontal e altura na vertical', () => {
      const spec = specDosContornos(topo, { escolhas: { vista: 'frontal', cotas: [] } });
      expect(spec.cotas.find((c) => c.dono === 'geral.largura').texto).toBe('largura 1200');
      expect(spec.cotas.find((c) => c.dono === 'geral.altura').texto).toBe('altura 1100');
      expect(prancha(spec).relatorio.porVista.frontal.contornoFechado).toBe(true);
    });
  });
});

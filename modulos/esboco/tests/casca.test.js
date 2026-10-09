/* O loft com seção "arredondado" e com "casca": a caçamba de um carrinho de mão (bacia oca de parede inclinada, boca em D com
   cantos arredondados, fundo menor que a boca, aberta em cima). As provas são medidas: o contorno contra `retanguloArredondado`
   do núcleo, a superfície fechada (toda aresta em duas faces), a espessura entre as superfícies, a área da seção de corte contra
   a analítica, as recusas e o gate de contato, em que o que está dentro da bacia não atravessa a parede. */
import { describe, expect, it } from 'vitest';
import { ancorasDe, desenharEsboco, ErroDeEsboco, fatiarForma, resolverOpcao } from '../src/index.js';
import { expandirEsboco } from '../src/expandir.js';
import { medirPar, pecasDe, verificarContato } from '../src/contato.js';
import { descreverEsboco, formatarDescricao } from '../src/descrever.js';
import { retanguloArredondado } from '../../../procedural/nucleo/contorno.js';
import { ajuda, TETO_DO_TOPICO } from '../../../tools/mecanifica/esboco-ajuda.mjs';
import { textoDaRecusa, topicoDaRecusa } from '../../../tools/mecanifica/esboco-recusa.mjs';

const resolver = (formas) => Object.fromEntries(resolverOpcao({ formas }).map((r) => [r.id, r]));
/* resolve as formas de um esboço com parâmetros e expressões, como o desenho as lê */
const resolverEsboco = (e) => { const x = expandirEsboco(e); return Object.fromEntries(resolverOpcao(x.opcoes[0], 'opção', x.pontos).map((r) => [r.id, r])); };
const caixa = (id, centro, l = 20, a = 20, p = 20, extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro, ...extra });
const esboco = (formas, extra = {}) => ({ opcoes: [{ titulo: 'T', formas }], ...extra });
/* a recusa de `resolverOpcao`: confere o tipo e o trecho e devolve a mensagem */
const recusa = (formas, trecho) => {
  expect(() => resolverOpcao({ formas })).toThrow(ErroDeEsboco);
  expect(() => resolverOpcao({ formas })).toThrow(trecho);
  try { resolverOpcao({ formas }); } catch (e) { return e.message; }
  return '';
};
const area = (poli) => poli.reduce((acc, q, i) => acc + q[0] * poli[(i + 1) % poli.length][1] - poli[(i + 1) % poli.length][0] * q[1], 0) / 2;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const perto = (v, esperado, casas = 9) => { expect(v).toHaveLength(esperado.length); v.forEach((x, i) => expect(x).toBeCloseTo(esperado[i], casas)); };
const aresta = (a, b) => [a, b].map((p) => p.map((x) => Math.round(x * 1e4) / 1e4).join(',')).sort().join('|');
const distanciaAoContorno = (p, poli) => Math.min(...poli.map((q, i) => {
  const r = poli[(i + 1) % poli.length];
  const dx = r[0] - q[0]; const dy = r[1] - q[1];
  const t = Math.max(0, Math.min(1, ((p[0] - q[0]) * dx + (p[1] - q[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p[0] - q[0] - t * dx, p[1] - q[1] - t * dy);
}));

/* Tronco retangular ao longo de z: 200 x 120 na ponta, 300 x 180 na outra, 100 mm de comprimento, com casca de 10 mm. */
const tronco = (casca = { espessura: 10, aberta: 'fim' }, extra = {}) => ({
  id: 'b', tipo: 'loft', eixo: 'z', centro: [0, 0, 0], casca,
  secoes: [{ pos: 0, tamanho: [200, 120] }, { pos: 100, tamanho: [300, 180] }], ...extra,
});

/* A caçamba, tudo por parâmetro e expressão: boca em D (arco inteiro em +v, cantos de trás de 40 mm em -v) e fundo menor,
   também em D. A boca vai de 560 por 440 mm e o fundo de 440 por 320 mm. */
const PARAMETROS = { larg: 560, prof: 440, alt: 220, esp: 6, recuoFundo: 120, raioTras: 40, fracaoArco: 0.8 };
const bacia = (extra = {}) => ({
  id: 'bacia', tipo: 'loft', eixo: 'y', centro: [0, 0, 0], casca: { espessura: '=esp', aberta: 'fim' },
  secoes: [
    { pos: 0, forma: 'arredondado', tamanho: ['=larg-recuoFundo', '=prof-recuoFundo'], cantos: [['=(larg-recuoFundo)/2', '=(prof-recuoFundo)*fracaoArco'], ['=(larg-recuoFundo)/2', '=(prof-recuoFundo)*fracaoArco'], 'raioTras', 'raioTras'], nome: 'fundo' },
    { pos: '=alt', forma: 'arredondado', tamanho: ['larg', 'prof'], cantos: [['=larg/2', '=prof*fracaoArco'], ['=larg/2', '=prof*fracaoArco'], 'raioTras', 'raioTras'], nome: 'boca' },
  ],
  ...extra,
});
const semCasca = () => { const { casca, ...forma } = bacia(); return forma; }; // eslint-disable-line no-unused-vars

describe('a seção "arredondado" do loft', () => {
  it('é o retângulo arredondado do núcleo: os pontos saem iguais, com a medida e os cantos por expressão', () => {
    const { bacia: r } = resolverEsboco(esboco([semCasca()], { parametros: PARAMETROS }));
    const [fundo, boca] = r.prisma.secoes;
    const dBoca = retanguloArredondado({ largura: 560, profundidade: 440, cantos: [[280, 352], [280, 352], 40, 40] });
    const dFundo = retanguloArredondado({ largura: 440, profundidade: 320, cantos: [[220, 256], [220, 256], 40, 40] });
    expect(boca.perfil).toHaveLength(dBoca.length);
    expect(fundo.perfil).toHaveLength(dFundo.length);
    dBoca.forEach((p, i) => perto(boca.perfil[i], p));
    dFundo.forEach((p, i) => perto(fundo.perfil[i], p));
    /* a boca tem 560 por 440 mm, e o arco inteiro de +v dá o D: a área é a do retângulo menos os cantos tirados */
    const u = boca.perfil.map((q) => q[0]);
    const v = boca.perfil.map((q) => q[1]);
    expect(Math.max(...u) - Math.min(...u)).toBeCloseTo(560, 9);
    expect(Math.max(...v) - Math.min(...v)).toBeCloseTo(440, 9);
    expect(area(boca.perfil)).toBeGreaterThan(0);
    expect(area(boca.perfil)).toBeLessThan(560 * 440);
    expect(boca.perfil.some((q) => Math.abs(q[0]) < 1e-9 && Math.abs(q[1] - 220) < 1e-9)).toBe(true);
    /* as duas seções têm o mesmo número de pontos: o loft liga ponto a ponto, sem reamostrar */
    expect(r.prisma.secoes.every((sc) => sc.perfil.length === dBoca.length)).toBe(true);
  });

  it('aceita expressão em cada número dos cantos e segmentosPorCanto, e dá o mesmo desenho que os números escritos', () => {
    const porExpressao = esboco([semCasca()], { parametros: PARAMETROS });
    const escrito = esboco([{
      ...semCasca(),
      secoes: [
        { pos: 0, forma: 'arredondado', tamanho: [440, 320], cantos: [[220, 256], [220, 256], 40, 40], nome: 'fundo' },
        { pos: 220, forma: 'arredondado', tamanho: [560, 440], cantos: [[280, 352], [280, 352], 40, 40], nome: 'boca' },
      ],
    }]);
    expect(desenharEsboco(porExpressao).svg).toBe(desenharEsboco(escrito).svg);
    const mais = { id: 'f', tipo: 'loft', eixo: 'z', centro: [0, 0, 0], secoes: [{ pos: 0, forma: 'arredondado', tamanho: [100, 60], cantos: 12, segmentosPorCanto: '=2*3' }, { pos: 50, forma: 'arredondado', tamanho: [80, 40], cantos: 12, segmentosPorCanto: 6 }] };
    const { f } = resolverEsboco(esboco([mais]));
    expect(f.prisma.secoes[0].perfil).toHaveLength(4 * 7);
    expect(f.prisma.secoes[1].perfil).toHaveLength(4 * 7);
  });

  it('entra onde as outras seções entram: âncora pelo nome, as quatro vistas, a camada e a leitura em texto', () => {
    const e = esboco([semCasca()], { parametros: PARAMETROS });
    const { bacia: r } = resolverEsboco(e);
    const a = ancorasDe(r);
    expect(a.fundo[1] - a.boca[1]).toBeCloseTo(-220, 9);
    for (const vista of ['isometrica', 'frontal', 'lateral', 'superior']) expect(desenharEsboco({ ...e, vista }).svg).toContain('<svg');
    expect(desenharEsboco(e, { camada: true }).camada.formas.map((f) => f.id)).toEqual(['bacia']);
    const texto = formatarDescricao(descreverEsboco(e));
    expect(texto).toContain('forma bacia: loft');
    expect(texto).toContain('loft de 2 seções');
    /* misturada com outras seções, a contagem de pontos diferente reamostra em 48 raios, como no resto do loft */
    const mista = { id: 'm', tipo: 'loft', eixo: 'z', centro: [0, 0, 0], secoes: [{ pos: 0, forma: 'arredondado', tamanho: [100, 60], cantos: 10 }, { pos: 50, tamanho: [80, 40] }] };
    expect(resolver([mista]).m.prisma.secoes[0].perfil).toHaveLength(48);
  });

  it('recusa cantos que não cabem, raio negativo, campo fora da seção e tamanho nulo, apontando o tópico loft', () => {
    const loft = (extra) => ({ id: 'f', tipo: 'loft', eixo: 'z', secoes: [{ pos: 0, forma: 'arredondado', tamanho: [100, 60], ...extra }, { pos: 50, forma: 'arredondado', tamanho: [80, 40] }] });
    const mensagens = [
      recusa([loft({ cantos: [[60, 10], [60, 10], 0, 0] })], /seção "arredondado": no lado \+v .* a soma dos raios \(120\) passa da largura \(100\)/),
      recusa([loft({ cantos: -5 })], /seção "arredondado": o canto 0 tem raio negativo/),
      recusa([loft({ cantos: [1, 2, 3] })], /seção "arredondado": "cantos" é um número ou uma lista de 4 cantos/),
      recusa([loft({ segmentosPorCanto: 0 })], /"segmentosPorCanto" deve ser um inteiro de 1 a 32/),
      recusa([loft({ tamanho: [100, 0] })], /a seção "arredondado" precisa de "tamanho": \[u, v\] em mm, as duas medidas maiores que zero/),
      recusa([loft({ raio: 4 })], /retire "perfil" e "raio"/),
      recusa([{ id: 'f', tipo: 'loft', eixo: 'z', secoes: [{ pos: 0, tamanho: [10, 10], cantos: 3 }, { pos: 5, tamanho: [10, 10] }] }], /"cantos" e "segmentosPorCanto" só valem na seção "arredondado"/),
    ];
    for (const m of mensagens) expect(topicoDaRecusa(m), m).toBe('loft');
  });
});

describe('o loft com "casca"', () => {
  /* as faces do sólido inteiro, vistas por dois olhos opostos e oblíquos (nenhuma face lateral fica de perfil nos dois) */
  const OLHO = [0.5412, 0.3377, 0.7697];
  const facesDe = (r) => [OLHO, OLHO.map((x) => -x)].flatMap((olho) => fatiarForma(r, olho, { semFatias: true }).flatMap((ch) => [...ch.lados, ...ch.dentro, ...ch.tampas]));
  const arestasUsadas = (faces) => {
    const usos = new Map();
    for (const f of faces) {
      for (const anel of [f.pts, ...(f.furos ?? [])]) anel.forEach((p, i) => { const k = aresta(p, anel[(i + 1) % anel.length]); usos.set(k, (usos.get(k) ?? 0) + 1); });
    }
    return usos;
  };

  it('a superfície é fechada: 2 faces por lado e por faixa, o fundo de fora, o fundo de dentro e a borda, e toda aresta em duas faces', () => {
    const { b } = resolver([tronco()]);
    const N = b.prisma.secoes[0].perfil.length;
    const faces = facesDe(b);
    expect(N).toBe(4);
    /* a face de dentro tem uma faixa só (do fim do fundo à boca), como a de fora */
    expect(faces).toHaveLength(2 * N * 1 + 3);
    expect(faces.filter((f) => f.papel === 'tampa')).toHaveLength(3);
    const usos = arestasUsadas(faces);
    const soltas = [...usos].filter(([, n]) => n !== 2).map(([k, n]) => `${k} x${n}`);
    expect(soltas).toEqual([]);
    /* com uma seção a mais, e aberta no início: duas faixas de cada lado, e a superfície continua fechada */
    const { m } = resolver([{ id: 'm', tipo: 'loft', eixo: 'z', centro: [0, 0, 0], casca: { espessura: 5, aberta: 'inicio' }, secoes: [{ pos: 0, tamanho: [300, 180] }, { pos: 60, tamanho: [220, 130] }, { pos: 100, tamanho: [200, 120] }] }]);
    const fm = facesDe(m);
    expect(fm).toHaveLength(2 * N * 2 + 3 + N * 0);
    expect([...arestasUsadas(fm)].filter(([, n]) => n !== 2)).toEqual([]);
    expect(fm.filter((f) => f.papel === 'tampa')).toHaveLength(3);
  });

  it('mede a espessura entre as superfícies: o contorno de dentro está à espessura do de fora, e o fundo tem a espessura', () => {
    const { b } = resolver([tronco({ espessura: 10, aberta: 'fim' })]);
    const { secoes, casca } = b.prisma;
    const boca = secoes[1];
    const dentroDaBoca = casca.cavidade[casca.cavidade.length - 1];
    expect(dentroDaBoca.w).toBeCloseTo(boca.w, 9);
    for (const q of dentroDaBoca.perfil) expect(distanciaAoContorno(q, boca.perfil)).toBeCloseTo(10, 9);
    expect(casca.wc - secoes[0].w).toBeCloseTo(10, 9);
    expect(casca.cavidade[0].w).toBeCloseTo(casca.wc, 9);
    expect(casca.fechadaNoInicio).toBe(true);
    /* no plano em que o fundo termina (a 10% do comprimento) o contorno de dentro está a cerca de 10 mm do externo */
    const fora = secoes[0].perfil.map((q, i) => [q[0] + 0.1 * (boca.perfil[i][0] - q[0]), q[1] + 0.1 * (boca.perfil[i][1] - q[1])]);
    for (const q of casca.cavidade[0].perfil) expect(distanciaAoContorno(q, fora)).toBeCloseTo(10, 9);
    /* aberta no início: o fundo fica na última seção, e a espessura se conta de lá */
    const { i } = resolver([tronco({ espessura: 10, aberta: 'inicio' }, { id: 'i' })]);
    expect(i.prisma.casca.fechadaNoInicio).toBe(false);
    expect(i.prisma.secoes[1].w - i.prisma.casca.wc).toBeCloseTo(10, 9);
    expect(i.prisma.casca.cavidade[i.prisma.casca.cavidade.length - 1].w).toBeCloseTo(i.prisma.casca.wc, 9);
    /* a espessura medida na caçamba de verdade: cada ponto da boca de dentro está a 6 mm do contorno da boca de fora, no plano */
    const { bacia: c } = resolverEsboco(esboco([bacia()], { parametros: PARAMETROS }));
    const bocaFora = c.prisma.secoes[1];
    const bocaDentro = c.prisma.casca.cavidade[c.prisma.casca.cavidade.length - 1];
    for (const q of bocaDentro.perfil) expect(distanciaAoContorno(q, bocaFora.perfil)).toBeCloseTo(6, 6);
    expect(c.prisma.casca.wc - c.prisma.secoes[0].w).toBeCloseTo(6, 9);
  });

  it('a seção de corte é a oca: a área da parede e a do fundo contra a analítica', () => {
    const medir = (corte) => {
      const { svg, escala } = desenharEsboco(esboco([tronco()], { vista: 'frontal', corte }));
      const d = /<path class="corte" data-forma="b" d="([^"]+)"/.exec(svg)[1];
      const aneis = d.split('M').filter(Boolean).map((s) => s.replace(/Z\s*$/, '').split('L').map((q) => q.split(',').map(Number)));
      /* par-ímpar: o maior anel é o contorno de fora, e o que está dentro dele é furo */
      const ordenados = [...aneis].sort((x, y) => Math.abs(area(y)) - Math.abs(area(x)));
      return { aneis: aneis.length, mm2: ordenados.reduce((s, a, k) => s + (k === 0 ? 1 : -1) * Math.abs(area(a)), 0) / (escala * escala) };
    };
    /* o tronco vai de z = -50 a 50. Em z = 10 (60% do comprimento): de fora 260 x 156, de dentro (recuado de 10 nas duas seções
       e interpolado) 240 x 136 */
    const parede = medir({ eixo: 'z', valor: 10 });
    expect(parede.aneis).toBe(2);
    expect(Math.abs(parede.mm2 - (260 * 156 - 240 * 136)) / (260 * 156 - 240 * 136)).toBeLessThan(0.01);
    /* z = -45 (5% do comprimento) está no fundo, de 10 mm: a seção é cheia, 205 x 123 */
    const fundo = medir({ eixo: 'z', valor: -45 });
    expect(fundo.aneis).toBe(1);
    expect(Math.abs(fundo.mm2 - 205 * 123) / (205 * 123)).toBeLessThan(0.01);
  });

  it('o desenho é o da forma oca: de cima se vê o fundo de dentro, a parede de dentro e a borda; de baixo só o fundo de fora', () => {
    const { b } = resolver([tronco()]);
    const doChunks = (chunks, k) => chunks.flatMap((ch) => ch[k]);
    const cima = fatiarForma(b, [0, 0, 1], {});
    const baixo = fatiarForma(b, [0, 0, -1], {});
    expect(doChunks(cima, 'dentro')).toHaveLength(4);
    expect(doChunks(cima, 'lados')).toHaveLength(0);
    const tampasDeCima = doChunks(cima, 'tampas');
    expect(tampasDeCima).toHaveLength(2);
    for (const f of [...doChunks(cima, 'dentro'), ...tampasDeCima]) expect(dot(f.n, [0, 0, 1])).toBeGreaterThan(0);
    const borda = tampasDeCima.filter((t) => t.furos.length === 1);
    expect(borda).toHaveLength(1);
    /* o anel da borda cobre a área entre o contorno de fora e o de dentro da boca: 300 x 180 menos 280 x 160 */
    const plano = (anel) => anel.map((p) => [p[0], p[1]]);
    expect(Math.abs(area(plano(borda[0].pts))) - Math.abs(area(plano(borda[0].furos[0])))).toBeCloseTo(300 * 180 - 280 * 160, 6);
    /* o fundo de dentro é o contorno recuado no plano do fundo, mais fundo que a borda */
    const fundoDeDentro = tampasDeCima.find((t) => t.furos.length === 0);
    expect(fundoDeDentro.pts.every((p) => Math.abs(p[2] - (-50 + 10)) < 1e-9)).toBe(true);
    expect(borda[0].pts.every((p) => Math.abs(p[2] - 50) < 1e-9)).toBe(true);
    /* de baixo: as paredes de fora e o fundo de fora, e nada de dentro */
    expect(doChunks(baixo, 'dentro')).toHaveLength(0);
    expect(doChunks(baixo, 'lados')).toHaveLength(4);
    const tampasDeBaixo = doChunks(baixo, 'tampas');
    expect(tampasDeBaixo).toHaveLength(1);
    expect(dot(tampasDeBaixo[0].n, [0, 0, -1])).toBeCloseTo(1, 9);
    expect(tampasDeBaixo[0].pts.every((p) => Math.abs(p[2] + 50) < 1e-9)).toBe(true);
    /* a camada de profundidade por pixel leva a borda com o furo */
    const camada = desenharEsboco(esboco([tronco()], { vista: 'isometrica' }), { camada: true }).camada;
    expect(camada.formas.find((f) => f.id === 'b').faces.filter((f) => f.h)).toHaveLength(1);
  });

  it('o gate vê o fundo e a parede, e não a cavidade: o que está dentro da bacia não atravessa a parede', () => {
    const e = (forma, carga) => esboco([forma, carga], { contato: { usar: true, tolerancia: 1, folga: 60 } });
    /* o tronco vai de z = -50 a 50, e o fundo de dentro está em z = -40: 100 x 100 x 60 com a base nele, longe das paredes */
    const carga = caixa('carga', [0, 0, -10], 100, 100, 60);
    const dentro = verificarContato(e(tronco(), carga));
    expect(dentro.achados).toEqual([]);
    expect(dentro.resultado).toBe('aprovado');
    /* o mesmo tronco sem casca é cheio, e a carga o atravessa */
    const cheio = verificarContato(e({ ...tronco(), casca: undefined }, carga));
    expect(cheio.achados.map((a) => a.tipo)).toEqual(['colisao']);
    /* medido por pares: encosta no fundo (folga 0, penetração 0) */
    const { b, carga: c } = resolver([tronco(), carga]);
    expect(medirPar(pecasDe(b), pecasDe(c))).toEqual({ folga: 0, penetracao: 0 });
    /* a carga no ar, dentro da cavidade, tem folga até o fundo e nenhuma penetração */
    const ar = resolver([tronco(), caixa('carga', [0, 0, 10], 40, 40, 20)]);
    const parAr = medirPar(pecasDe(ar.b), pecasDe(ar.carga));
    expect(parAr.penetracao).toBe(0);
    expect(parAr.folga).toBeCloseTo(40, 6);
    /* a carga que atravessa a parede (de x = 115 a 125 no meio do comprimento) a penetra */
    const cruza = resolver([tronco(), caixa('carga', [120, 0, 0], 50, 50, 50)]);
    expect(medirPar(pecasDe(cruza.b), pecasDe(cruza.carga)).penetracao).toBeGreaterThan(5);
  });

  it('as peças do gate: o fundo por faixa e uma peça por faixa e por lado da parede', () => {
    const { m } = resolver([{ id: 'm', tipo: 'loft', eixo: 'z', centro: [0, 0, 0], casca: { espessura: 5, aberta: 'fim' }, secoes: [{ pos: 0, tamanho: [200, 120] }, { pos: 40, tamanho: [220, 130] }, { pos: 100, tamanho: [300, 180] }] }]);
    /* o fundo (0 a 5) é um tronco; a parede (5 a 100) tem duas faixas de 4 lados */
    expect(pecasDe(m)).toHaveLength(1 + 2 * 4);
    expect(pecasDe(resolver([tronco()]).b)).toHaveLength(1 + 4);
  });

  it('a espessura aceita parâmetro e expressão, e dá o mesmo desenho que o número escrito', () => {
    const porParametro = esboco([tronco({ espessura: '=esp*2', aberta: 'fim' })], { parametros: { esp: 5 } });
    const escrito = esboco([tronco({ espessura: 10, aberta: 'fim' })]);
    expect(desenharEsboco(porParametro).svg).toBe(desenharEsboco(escrito).svg);
    expect(() => descreverEsboco(esboco([tronco({ espessura: 'nada', aberta: 'fim' })]))).toThrow(/usa o parâmetro "nada", que não existe/);
  });
});

describe('a caçamba do carrinho de mão sobre a travessa (atrito de 2026-10-08)', () => {
  const esb = (casca = true, extra = []) => ({
    vista: 'isometrica',
    parametros: PARAMETROS,
    contato: { usar: true, tolerancia: 1, folga: 60 },
    opcoes: [{ titulo: 'caçamba', formas: [
      caixa('travessa', [0, 0, 0], 600, 14, 60, { cor: 'cinza' }),
      { ...(({ centro, ...f }) => f)(casca ? bacia() : semCasca()), sobre: 'travessa', cor: 'verde' }, // eslint-disable-line no-unused-vars
      ...extra,
    ] }],
  });

  it('a bacia oca em D sobre a travessa passa no gate, e a leitura em texto diz a casca', () => {
    const e = esb();
    const c = verificarContato(e);
    expect(c.achados).toEqual([]);
    expect(c.resultado).toBe('aprovado');
    const texto = formatarDescricao(descreverEsboco(e));
    expect(texto).toContain('forma bacia: loft');
    expect(texto).toContain('casca de 6 mm aberta no fim');
    /* ligar o gate não muda o desenho, e a camada leva as duas formas na ordem da opção */
    const { contato, ...sem } = e; // eslint-disable-line no-unused-vars
    expect(desenharEsboco(e).svg).toBe(desenharEsboco(sem).svg);
    expect(desenharEsboco(e, { camada: true }).camada.formas.map((f) => f.id)).toEqual(['travessa', 'bacia']);
  });

  it('uma carga no fundo da bacia fica ligada ao conjunto sem atravessar a parede, e no mesmo lugar a bacia cheia a atravessaria', () => {
    /* o fundo de dentro está a 6 mm da base da bacia, que está sobre a travessa de 14 mm: z do topo da travessa = 7 */
    const { bacia: b, travessa } = resolverEsboco(esb());
    const baseDaBacia = b.min[1];
    expect(baseDaBacia).toBeCloseTo(travessa.max[1], 6);
    const carga = caixa('carga', [0, baseDaBacia + 6 + 50, 0], 200, 100, 150);
    const comCasca = verificarContato(esb(true, [carga]));
    expect(comCasca.achados).toEqual([]);
    expect(comCasca.resultado).toBe('aprovado');
    expect(verificarContato(esb(false, [carga])).achados.map((a) => a.tipo)).toEqual(['colisao']);
  });

  it('a travessa que entra na parede da bacia é achada como colisão: o gate continua medindo a parede', () => {
    const fundo = esb();
    const { sobre, ...mais } = fundo.opcoes[0].formas[1]; // eslint-disable-line no-unused-vars
    fundo.opcoes[0].formas[1] = { ...mais, centro: [0, 100, 0] };
    const ao = verificarContato(fundo);
    expect(ao.achados.map((a) => a.tipo)).toContain('colisao');
  });
});

describe('as recusas da casca, com o tópico loft', () => {
  const casos = [
    ['espessura zero', tronco({ espessura: 0, aberta: 'fim' }), /a "casca" precisa de "espessura" maior que zero em mm \(veio 0\)/],
    ['espessura negativa', tronco({ espessura: -3, aberta: 'fim' }), /a "casca" precisa de "espessura" maior que zero em mm \(veio -3\)/],
    ['espessura que não é número', tronco({ espessura: 'x', aberta: 'fim' }), /a "casca" precisa de "espessura" maior que zero/],
    ['espessura além do recuo máximo da seção', tronco({ espessura: 70, aberta: 'fim' }), /secoes\[0\]: a "casca" de 70 mm passa do recuo máximo da seção \(cerca de 60\.000 mm/],
    ['espessura além do comprimento', tronco({ espessura: 25, aberta: 'fim' }, { secoes: [{ pos: 0, tamanho: [200, 200] }, { pos: 20, tamanho: [300, 300] }] }), /a "casca" de 25 mm não cabe no loft de 20 mm de comprimento/],
    ['sem "aberta"', tronco({ espessura: 5 }), /a "casca" precisa de "aberta": "fim" ou "inicio"/],
    ['"aberta" com outro valor', tronco({ espessura: 5, aberta: 'topo' }), /a "casca" precisa de "aberta": "fim" ou "inicio".*veio "topo"/],
    ['campo que não existe', tronco({ espessura: 5, aberta: 'fim', fundo: 3 }), /a "casca" não tem o campo "fundo" \(campos: espessura, aberta\)/],
    ['"casca" que não é objeto', tronco(7), /a "casca" do loft deve ser/],
    ['seção elipse', tronco({ espessura: 5, aberta: 'fim' }, { secoes: [{ pos: 0, forma: 'elipse', tamanho: [100, 60] }, { pos: 50, forma: 'retangulo', tamanho: [100, 60] }] }), /secoes\[0\]: o loft com "casca" não aceita a seção "elipse"/],
    ['seção ponto', tronco({ espessura: 5, aberta: 'fim' }, { secoes: [{ pos: 0, tamanho: [0, 0] }, { pos: 50, tamanho: [100, 60] }] }), /secoes\[0\]: o loft com "casca" não aceita a seção ponto/],
  ];
  for (const [nome, forma, trecho] of casos) {
    it(`${nome}: diz o campo e o valor, e aponta o tópico loft`, () => {
      const mensagem = recusa([forma], trecho);
      expect(topicoDaRecusa(mensagem), mensagem).toBe('loft');
      expect(textoDaRecusa(mensagem).texto).toMatch(/veja npm run esboco -- --ajuda loft\n$/);
    });
  }

  it('"casca" não existe em outro tipo de forma, e o esquema a aceita no loft', () => {
    expect(() => desenharEsboco(esboco([{ id: 'c', tipo: 'cilindro', diametro: 20, comprimento: 30, centro: [0, 0, 0], casca: { espessura: 2, aberta: 'fim' } }]))).toThrow(/o campo "casca" não existe em cilindro.*o campo "casca" vale em loft/);
  });

  it('o tópico loft do --ajuda traz a seção e a casca e cabe no teto', () => {
    const r = ajuda('loft');
    expect(r.codigo).toBe(0);
    for (const termo of ['arredondado', 'cantos', 'segmentosPorCanto', 'casca', 'espessura', 'aberta']) expect(r.texto, termo).toContain(termo);
    expect(r.texto.length).toBeLessThanOrEqual(TETO_DO_TOPICO);
  });
});

/* A seção inclinada do loft ("inclinacao": [au, av], em graus): a boca horizontal e o fundo inclinado de uma cacamba, com seções
   de transição. As provas são medidas: os pontos da seção no plano girado, a espessura da casca no plano de cada seção, o fundo
   paralelo à seção da ponta, a superfície fechada, as recusas e o gate de contato de uma bacia sobre uma barra inclinada. */
import { describe, expect, it } from 'vitest';
import { ancorasDe, desenharEsboco, ErroDeEsboco, fatiarForma, resolverOpcao } from '../src/index.js';
import { expandirEsboco } from '../src/expandir.js';
import { medirPar, pecasDe, verificarContato } from '../src/contato.js';
import { descreverEsboco, formatarDescricao } from '../src/descrever.js';
import { ajuda, TETO_DO_TOPICO } from '../../../tools/mecanifica/esboco-ajuda.mjs';
import { textoDaRecusa, topicoDaRecusa } from '../../../tools/mecanifica/esboco-recusa.mjs';

const resolver = (formas) => Object.fromEntries(resolverOpcao({ formas }).map((r) => [r.id, r]));
const resolverEsboco = (e) => { const x = expandirEsboco(e); return Object.fromEntries(resolverOpcao(x.opcoes[0], 'opção', x.pontos).map((r) => [r.id, r])); };
const esboco = (formas, extra = {}) => ({ opcoes: [{ titulo: 'T', formas }], ...extra });
const recusa = (formas, trecho) => {
  expect(() => resolverOpcao({ formas })).toThrow(ErroDeEsboco);
  expect(() => resolverOpcao({ formas })).toThrow(trecho);
  try { resolverOpcao({ formas }); } catch (e) { return e.message; }
  return '';
};
const RAD = Math.PI / 180;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const centroide = (pts) => [0, 1, 2].map((i) => pts.reduce((s, p) => s + p[i], 0) / pts.length);
const aresta = (a, b) => [a, b].map((p) => p.map((x) => Math.round(x * 1e4) / 1e4).join(',')).sort().join('|');
/* distância, no espaço, de um ponto ao contorno (poligonal fechada) de uma seção: no plano da seção é a distância no plano */
const distanciaAoContorno3D = (p, anel) => Math.min(...anel.map((q, i) => {
  const r = anel[(i + 1) % anel.length];
  const d = sub(r, q);
  const t = Math.max(0, Math.min(1, dot(sub(p, q), d) / dot(d, d)));
  return Math.hypot(...sub(p, [q[0] + t * d[0], q[1] + t * d[1], q[2] + t * d[2]]));
}));
const w3 = (sc) => sc.perfil.map((q) => [q[0], q[1], q.length > 2 ? q[2] : sc.w]);

/* Duas seções retangulares ao longo de z (u = x, v = y), a segunda inclinada. */
const barra2 = (inclinacao, extra = {}) => ({
  id: 'b', tipo: 'loft', eixo: 'z', centro: [0, 0, 0],
  secoes: [{ pos: 0, tamanho: [100, 60] }, { pos: 50, tamanho: [100, 60], inclinacao, ...extra }],
});

describe('a seção inclinada do loft', () => {
  it('au gira em torno de u e av em torno de v: os pontos ficam no plano girado, com a distância ao centro e a contagem de antes', () => {
    const plana = resolver([barra2(undefined)]).b.prisma.secoes[1];
    for (const [inclinacao, eixoDoLado, lado] of [[[10, 0], 1, 'v'], [[0, 10], 0, 'u']]) {
      const sc = resolver([barra2(inclinacao)]).b.prisma.secoes[1];
      expect(sc.perfil).toHaveLength(plana.perfil.length);
      const pts = w3(sc);
      const c = centroide(pts);
      /* o centro não sai do lugar e cada ponto está no plano da normal da seção */
      const angulo = Math.acos(sc.n[2]) / RAD;
      expect(angulo).toBeCloseTo(10, 9);
      for (const p of pts) expect(dot(sub(p, c), sc.n)).toBeCloseTo(0, 9);
      /* a distância ao centro é a do retângulo plano, e o deslocamento em w de cada ponto é (a medida no próprio eixo) x tan do ângulo */
      const planas = w3(plana);
      const cp = centroide(planas);
      pts.forEach((p, i) => {
        expect(Math.hypot(...sub(p, c))).toBeCloseTo(Math.hypot(...sub(planas[i], cp)), 9);
        const d = sub(p, c);
        const medida = planas[i][eixoDoLado] - cp[eixoDoLado];
        const projetada = lado === 'v' ? d[1] : d[0];
        expect(d[2]).toBeCloseTo(projetada * Math.tan(10 * RAD), 9);
        expect(Math.abs(projetada)).toBeCloseTo(Math.abs(medida) * Math.cos(10 * RAD), 9);
      });
    }
    /* au positivo ergue o lado +v e av positivo ergue o lado +u */
    const au = w3(resolver([barra2([10, 0])]).b.prisma.secoes[1]);
    expect(Math.max(...au.filter((p) => p[1] > 0).map((p) => p[2]))).toBeGreaterThan(Math.max(...au.filter((p) => p[1] < 0).map((p) => p[2])));
    const av = w3(resolver([barra2([0, 10])]).b.prisma.secoes[1]);
    expect(Math.max(...av.filter((p) => p[0] > 0).map((p) => p[2]))).toBeGreaterThan(Math.max(...av.filter((p) => p[0] < 0).map((p) => p[2])));
  });

  it('as duas rotações juntas continuam sendo uma rotação em torno do centro: os pontos ficam no plano da normal e a normal tem comprimento 1', () => {
    const sc = resolver([barra2([7, -4], { centro: [5, 3] })]).b.prisma.secoes[1];
    const pts = w3(sc);
    const c = centroide(pts);
    expect(Math.hypot(...sc.n)).toBeCloseTo(1, 12);
    for (const p of pts) expect(dot(sub(p, c), sc.n)).toBeCloseTo(0, 9);
    /* as arestas continuam perpendiculares entre si (o retângulo continua retângulo) e com as medidas dele */
    const a = sub(pts[1], pts[0]); const b = sub(pts[2], pts[1]);
    expect(dot(a, b)).toBeCloseTo(0, 9);
    expect(Math.hypot(...a)).toBeCloseTo(100, 9);
    expect(Math.hypot(...b)).toBeCloseTo(60, 9);
  });

  it('as âncoras ficam no centro da seção, e o ângulo aceita expressão com atan2 em graus', () => {
    const { b } = resolver([barra2([10, 0], { centro: [5, 3], nome: 'topo' })]);
    const a = ancorasDe(b);
    const d = sub(a.topo, a.inicio);
    expect(d[0]).toBeCloseTo(5, 9);
    expect(d[1]).toBeCloseTo(3, 9);
    expect(d[2]).toBeCloseTo(50, 9);
    const porExpressao = resolverEsboco(esboco([barra2(['=atan2(1, 10)', '=2*a'])], { parametros: { a: 1.5 } })).b.prisma.secoes[1];
    const escrito = resolver([barra2([Math.atan2(1, 10) / RAD, 3])]).b.prisma.secoes[1];
    porExpressao.perfil.forEach((q, i) => q.forEach((x, k) => expect(x).toBeCloseTo(escrito.perfil[i][k], 9)));
  });

  it('sem o campo, ou com [0, 0], nada muda: o desenho sai byte a byte igual e a seção não ganha normal', () => {
    const sem = esboco([barra2(undefined)]);
    const zero = esboco([barra2([0, 0])]);
    for (const vista of ['isometrica', 'frontal', 'lateral', 'superior']) {
      expect(desenharEsboco({ ...zero, vista }).svg, vista).toBe(desenharEsboco({ ...sem, vista }).svg);
    }
    expect(resolver([barra2([0, 0])]).b.prisma.secoes.some((sc) => sc.n)).toBe(false);
    expect(desenharEsboco({ ...esboco([barra2([8, 0])]), vista: 'isometrica' }).svg).not.toBe(desenharEsboco({ ...sem, vista: 'isometrica' }).svg);
  });

  it('o desenho, a leitura em texto e o gate tratam a seção girada', () => {
    const e = esboco([barra2([10, 0], { nome: 'topo' })], { contato: { usar: true, tolerancia: 1, folga: 60 } });
    for (const vista of ['isometrica', 'frontal', 'lateral', 'superior']) expect(() => desenharEsboco({ ...e, vista }), vista).not.toThrow();
    const texto = formatarDescricao(descreverEsboco(e));
    expect(texto).toContain('seção topo inclinada [10 0] graus');
    /* o casco da faixa inclui o canto girado: a caixa do sólido cresce em z com o ângulo (30 mm de meia-medida em v vezes sen 10 graus) */
    const { b } = resolver([barra2([10, 0])]);
    const plana = resolver([barra2(undefined)]).b;
    expect(b.max[2] - b.min[2]).toBeCloseTo(50 + 30 * Math.sin(10 * RAD), 9);
    expect(plana.max[2] - plana.min[2]).toBeCloseTo(50, 9);
    expect(pecasDe(b)).toHaveLength(1);
    expect(verificarContato(e).achados).toEqual([]);
  });
});

/* A cacamba: o fundo inclinado, uma seção de transição e a boca horizontal, eixo y (u = x, v = z). */
const bacia = (secoes, extra = {}) => ({
  id: 'bacia', tipo: 'loft', eixo: 'y', centro: [0, 0, 0], casca: { espessura: 5, aberta: 'fim' },
  secoes: secoes ?? [
    { pos: 0, forma: 'arredondado', tamanho: [400, 300], cantos: 40, inclinacao: [2.5, 3], nome: 'fundo' },
    { pos: 40, forma: 'arredondado', tamanho: [470, 360], cantos: 40, inclinacao: [1.25, 1.5] },
    { pos: 200, forma: 'arredondado', tamanho: [600, 460], cantos: 40, nome: 'boca' },
  ],
  ...extra,
});

describe('a casca de um loft com o fundo inclinado e a boca horizontal', () => {
  const OLHO = [0.5412, 0.3377, 0.7697];
  const facesDe = (r) => [OLHO, OLHO.map((x) => -x)].flatMap((olho) => fatiarForma(r, olho, { semFatias: true }).flatMap((ch) => [...ch.lados, ...ch.dentro, ...ch.tampas]));
  const usosDasArestas = (faces) => {
    const usos = new Map();
    for (const f of faces) for (const anel of [f.pts, ...(f.furos ?? [])]) anel.forEach((p, i) => { const k = aresta(p, anel[(i + 1) % anel.length]); usos.set(k, (usos.get(k) ?? 0) + 1); });
    return usos;
  };

  it('a espessura é medida no plano de cada seção: o contorno de dentro está a 5 mm do de fora, na seção inclinada e na boca', () => {
    const { bacia: r } = resolver([bacia()]);
    const { secoes, casca } = r.prisma;
    const dentroDasSecoes = casca.cavidade.slice(1);
    expect(dentroDasSecoes).toHaveLength(2);
    /* as seções de dentro são as duas últimas: a transição (inclinada) e a boca (horizontal) */
    dentroDasSecoes.forEach((dentro, j) => {
      const fora = secoes[secoes.length - dentroDasSecoes.length + j];
      expect(dentro.perfil).toHaveLength(fora.perfil.length);
      for (const q of w3(dentro)) expect(distanciaAoContorno3D(q, w3(fora)), `seção ${j}`).toBeCloseTo(5, 6);
    });
    /* a boca é horizontal: todos os pontos de fora e de dentro no mesmo w, e a seção do fundo não */
    const boca = secoes[2];
    expect(new Set(w3(boca).map((p) => p[2].toFixed(9))).size).toBe(1);
    expect(new Set(w3(dentroDasSecoes[1]).map((p) => p[2].toFixed(9))).size).toBe(1);
    const alturas = w3(secoes[0]).map((p) => p[2]);
    expect(Math.max(...alturas) - Math.min(...alturas)).toBeGreaterThan(10);
    expect(boca.n).toBeUndefined();
  });

  it('o fundo acompanha a seção da ponta: o fundo de dentro e o corte de fora estão a 5 mm do plano dela, perpendicular a ele', () => {
    const { bacia: r } = resolver([bacia()]);
    const { secoes, casca } = r.prisma;
    const fundo = secoes[0];
    const c0 = centroide(w3(fundo));
    const distancia = (p) => dot(sub(p, c0), fundo.n);
    const { fundo: listaFundo, parede, cavidade } = { fundo: casca.listas.fundo, parede: casca.listas.parede, cavidade: casca.cavidade };
    const corteFora = listaFundo[listaFundo.length - 1];
    for (const p of w3(corteFora)) expect(distancia(p)).toBeCloseTo(5, 9);
    for (const p of w3(cavidade[0])) expect(distancia(p)).toBeCloseTo(5, 9);
    /* o fundo de dentro é paralelo ao de fora (inclinado, e não horizontal) e a parede começa no mesmo corte */
    const dentro = w3(cavidade[0]);
    expect(Math.max(...dentro.map((p) => p[2])) - Math.min(...dentro.map((p) => p[2]))).toBeGreaterThan(10);
    expect(parede[0]).toEqual(corteFora);
    /* a cavidade e a parede têm as mesmas seções, uma a uma */
    expect(cavidade).toHaveLength(parede.length);
    /* a espessura do fundo medida entre os dois planos paralelos, no centro de cada um */
    const centroDentro = centroide(dentro);
    expect(distancia(centroDentro)).toBeCloseTo(5, 9);
  });

  it('a superfície é fechada (toda aresta em duas faces), com a casca aberta no fim e aberta no início', () => {
    for (const aberta of ['fim', 'inicio']) {
      const secoes = aberta === 'fim' ? undefined : [
        { pos: 0, forma: 'arredondado', tamanho: [600, 460], cantos: 40 },
        { pos: 160, forma: 'arredondado', tamanho: [470, 360], cantos: 40, inclinacao: [1.25, 1.5] },
        { pos: 200, forma: 'arredondado', tamanho: [400, 300], cantos: 40, inclinacao: [2.5, 3] },
      ];
      const { bacia: r } = resolver([bacia(secoes, { casca: { espessura: 5, aberta } })]);
      const faces = facesDe(r);
      const soltas = [...usosDasArestas(faces)].filter(([, n]) => n !== 2).map(([k, n]) => `${k} x${n}`);
      expect(soltas, aberta).toEqual([]);
      expect(faces.filter((f) => f.papel === 'tampa'), aberta).toHaveLength(3);
      /* a espessura no plano de cada seção também vale com o fundo na outra ponta */
      const { secoes: fora, casca } = r.prisma;
      const dentro = aberta === 'fim' ? casca.cavidade.slice(1) : casca.cavidade.slice(0, -1);
      const primeiraFora = aberta === 'fim' ? fora.length - dentro.length : 0;
      dentro.forEach((d, j) => { for (const q of w3(d)) expect(distanciaAoContorno3D(q, w3(fora[primeiraFora + j])), `${aberta} ${j}`).toBeCloseTo(5, 6); });
    }
  });

  it('a boca horizontal tem a borda no mesmo plano, e de cima se vê o fundo de dentro inclinado', () => {
    const { bacia: r } = resolver([bacia()]);
    const cima = fatiarForma(r, [0, 1, 0], {});
    const tampas = cima.flatMap((ch) => ch.tampas);
    const borda = tampas.filter((t) => t.furos.length === 1);
    expect(borda).toHaveLength(1);
    expect(new Set(borda[0].pts.map((p) => p[1].toFixed(9))).size).toBe(1);
    expect(new Set(borda[0].furos[0].map((p) => p[1].toFixed(9))).size).toBe(1);
    const fundoDeDentro = tampas.find((t) => t.furos.length === 0);
    expect(fundoDeDentro.n[1]).toBeGreaterThan(0.99);
    expect(fundoDeDentro.n[1]).toBeLessThan(1 - 1e-6);
    expect(dot(fundoDeDentro.n, fundoDeDentro.n)).toBeCloseTo(1, 9);
    /* o desenho da bacia inteira sai em todas as vistas */
    for (const vista of ['isometrica', 'frontal', 'lateral', 'superior']) expect(() => desenharEsboco({ ...esboco([bacia()]), vista }), vista).not.toThrow();
  });

  it('a casca sem inclinação continua igual: o desenho da bacia de seções planas não muda com "inclinacao": [0, 0]', () => {
    const planas = bacia([{ pos: 0, forma: 'arredondado', tamanho: [400, 300], cantos: 40 }, { pos: 200, forma: 'arredondado', tamanho: [600, 460], cantos: 40 }]);
    const zeradas = bacia([{ pos: 0, forma: 'arredondado', tamanho: [400, 300], cantos: 40, inclinacao: [0, 0] }, { pos: 200, forma: 'arredondado', tamanho: [600, 460], cantos: 40 }]);
    expect(desenharEsboco(esboco([zeradas])).svg).toBe(desenharEsboco(esboco([planas])).svg);
  });
});

describe('as recusas da inclinação, com o tópico loft', () => {
  /* 10 mm entre as seções: a meia-medida de 30 mm em v vezes sen 30 graus (15 mm) passa do plano da seguinte */
  const curta = (inclinacao) => ({ id: 'b', tipo: 'loft', eixo: 'z', secoes: [{ pos: 0, tamanho: [100, 60] }, { pos: 10, tamanho: [100, 60], inclinacao }] });
  const casos = [
    ['seções vizinhas que se cruzam', curta([30, 0]), /secoes\[0\] e secoes\[1\]: a "inclinacao" faz as duas seções vizinhas se cruzarem/],
    ['cruzamento pelo av', curta([0, -35]), /a "inclinacao" faz as duas seções vizinhas se cruzarem/],
    ['seção ponto', { id: 'b', tipo: 'loft', eixo: 'z', secoes: [{ pos: 0, tamanho: [0, 0], inclinacao: [3, 0] }, { pos: 50, tamanho: [100, 60] }] }, /secoes\[0\]: a seção ponto \(\[0, 0\]\) não aceita "inclinacao"/],
    ['um número só', barra2([3]), /"inclinacao" deve ser \[au, av\] em graus.*veio \[3\]/],
    ['texto', barra2('3'), /"inclinacao" deve ser \[au, av\] em graus.*veio "3"/],
    ['90 graus ou mais', barra2([0, 90]), /"inclinacao" \[0,90\] passa de 90 graus/],
    ['o fundo da casca cruzando uma seção', bacia([
      { pos: 0, forma: 'arredondado', tamanho: [100, 100], cantos: 10, inclinacao: [10, 0] },
      { pos: 12, forma: 'arredondado', tamanho: [100, 100], cantos: 10 },
      { pos: 80, forma: 'arredondado', tamanho: [100, 100], cantos: 10 },
    ], { casca: { espessura: 6, aberta: 'fim' } }), /a "casca" de 6 mm tem o plano do fundo .* cruzando a seção secoes\[1\]/],
  ];
  for (const [nome, forma, trecho] of casos) {
    it(`${nome}: diz o campo e o valor, e aponta o tópico loft`, () => {
      const mensagem = recusa([forma], trecho);
      expect(topicoDaRecusa(mensagem), mensagem).toBe('loft');
      expect(textoDaRecusa(mensagem).texto).toMatch(/veja npm run esboco -- --ajuda loft\n$/);
    });
  }

  it('o campo vale na seção e não na forma, e o tópico loft do --ajuda traz a inclinação e cabe no teto', () => {
    expect(() => desenharEsboco(esboco([{ id: 'b', tipo: 'loft', eixo: 'z', inclinacao: [3, 0], secoes: [{ pos: 0, tamanho: [10, 10] }, { pos: 5, tamanho: [10, 10] }] }]))).toThrow(/o campo "inclinacao" não existe em loft/);
    const r = ajuda('loft');
    expect(r.codigo).toBe(0);
    for (const termo of ['inclinacao', 'au', 'av', 'casca']) expect(r.texto, termo).toContain(termo);
    expect(r.texto.length).toBeLessThanOrEqual(TETO_DO_TOPICO);
  });
});

describe('a bacia de fundo inclinado sobre uma barra inclinada', () => {
  const grau = 3;
  const rad = grau * RAD;
  const barra = { id: 'barra', tipo: 'caixa', largura: 700, altura: 20, profundidade: 60, centro: [0, 0, 0], rotacao: [0, 0, grau] };
  const cacamba = {
    id: 'bacia', tipo: 'loft', eixo: 'y', casca: { espessura: 5, aberta: 'fim' },
    encosta: { referencia: 'barra', direcao: [Math.sin(rad), -Math.cos(rad), 0] },
    secoes: [
      { pos: 0, forma: 'arredondado', tamanho: [400, 300], cantos: 40, inclinacao: [0, grau], nome: 'fundo' },
      { pos: 40, forma: 'arredondado', tamanho: [470, 360], cantos: 40, inclinacao: [0, grau / 2] },
      { pos: 200, forma: 'arredondado', tamanho: [600, 460], cantos: 40, nome: 'boca' },
    ],
  };
  const e = esboco([barra, cacamba], { contato: { usar: true, tolerancia: 1, folga: 60 } });

  it('passa no gate: o fundo encosta na barra, sem folga e sem penetração', () => {
    const c = verificarContato(e);
    expect(c.achados).toEqual([]);
    expect(c.resultado).toBe('aprovado');
    const { barra: b, bacia: r } = resolverEsboco(e);
    const par = medirPar(pecasDe(b), pecasDe(r));
    expect(par.folga).toBeCloseTo(0, 6);
    expect(par.penetracao).toBeLessThan(1e-6);
  });

  it('o fundo de fora está no plano do topo da barra inclinada, e a boca está horizontal', () => {
    const { bacia: r } = resolverEsboco(e);
    /* de baixo se vê só o fundo de fora: a tampa dele no mundo, todos os pontos no plano do topo da barra (normal (-sen, cos, 0) a 10 mm do centro) */
    const baixo = fatiarForma(r, [0, -1, 0], {}).flatMap((ch) => ch.tampas);
    expect(baixo).toHaveLength(1);
    const normal = [-Math.sin(rad), Math.cos(rad), 0];
    const topo = normal.map((x) => x * 10);
    for (const p of baixo[0].pts) expect(dot(sub(p, topo), normal)).toBeCloseTo(0, 6);
    const cima = fatiarForma(r, [0, 1, 0], {}).flatMap((ch) => ch.tampas).filter((t) => t.furos.length === 1);
    expect(new Set(cima[0].pts.map((p) => p[1].toFixed(6))).size).toBe(1);
  });

  it('uma carga no fundo inclinado da bacia fica dentro dela sem atravessar a parede, e a barra que entra na parede é achada', () => {
    const { bacia: r } = resolverEsboco(e);
    const fundoDeDentro = r.prisma.casca.cavidade[0];
    expect(fundoDeDentro.perfil[0]).toHaveLength(3);
    const carga = { id: 'carga', tipo: 'caixa', largura: 80, altura: 40, profundidade: 80, centro: [-5, 120, 0] };
    const dentro = verificarContato(esboco([barra, cacamba, carga], { contato: { usar: true, tolerancia: 1, folga: 120 } }));
    expect(dentro.achados.filter((a) => a.tipo === 'colisao')).toEqual([]);
    const batendo = verificarContato(esboco([barra, cacamba, { ...carga, centro: [300, 120, 0] }], { contato: { usar: true, tolerancia: 1, folga: 120 } }));
    expect(batendo.achados.map((a) => a.tipo)).toContain('colisao');
  });
});

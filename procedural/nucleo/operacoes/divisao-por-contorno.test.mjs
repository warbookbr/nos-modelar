/* divisao-por-contorno.test.mjs — a operação `divisaoPorContorno` numa chapa de teste (a chapa por grade de
   `tools/fixtures/aberturas-em-teste/chapas.js`, de dupla curvatura, com 2 mm de espessura e 880 faces), pelas provas da fatia 1 do
   plano `docs/modelar/planos/2026-11-18-divisao-por-contorno.md`:
     - a área somada das partes é a da chapa de antes, e a da parte nova, vista do eixo, é a do contorno nas duas peles;
     - nenhuma aresta livre nova, nenhum vértice no meio de aresta, nenhuma dobra e nenhuma face fina (`analisarTopologia`);
     - a borda da parte a menos de uma tolerância da curva desenhada, nos dois sentidos da medida;
     - a superfície igual: os vértices e as faces que o contorno não toca ficam como estavam, bit a bit, e todo vértice novo e todo
       triângulo das faces cortadas fica sobre a superfície de antes;
     - a mesma receita dá a mesma malha, o contorno desenhado nos dois sentidos dá a mesma parte, e `sentido` escolhe a camada;
     - o contorno de cotas redondas, que passa exatamente por vértices e arestas da malha, o bico mais estreito que o encaixe e a
       seleção pela origem depois da divisão (os ataques da revisão de 2026-11-19);
     - cada recusa, com a mensagem.
   O primeiro teste imprime os números que o README de `docs/modelar/banco-de-provas/divisao-por-contorno-2026-11-18/` registra. */
import { describe, expect, it } from 'vitest';
import { nucleo } from '../nucleo.js';
import { furoPassante } from '../furo-passante.js';
import { analisarTopologia, LIMITE_DE_FACE_FINA } from '../topologia.js';
import { triangularFace } from '../triangulacao-face.js';
import { contornoPorTrechos } from '../curva2d.js';
import { quadroDaVista } from './abertura-por-contorno.js';
import { dividirMalhaPorContorno, razaoDaFace } from './divisao-por-contorno.js';
import { chapaDeGrade, estrela, m, poligonoDeRetas, retangulo } from '../../../tools/fixtures/aberturas-em-teste/chapas.js';

const altura = (x, z) => 30 * Math.sin(x / 150) * Math.cos(z / 180);
const GRADE = chapaDeGrade({ nx: 6, nz: 6, passo: 80, altura, espessura: 2, niveis: 2 });
const CHAPA = { origem: { op: 'subdivisao', id: 1 } };
const BASE = [['subdivisao', { origemId: 1, ...GRADE.passo }]];
/* o contorno de prova: dois retos, dois cantos arredondados (raios de 40 e 60 mm) e dois cantos vivos, em [x, z] */
const contornoDeProva = (dx = 0, dz = 0) => ({ inicio: [m(120 + dx), m(95 + dz)], trechos: [{ reto: [m(290 + dx), m(95 + dz)] }, { concordancia: m(40) }, { reto: [m(310 + dx), m(300 + dz)] }, { concordancia: m(60) }, { reto: [m(105 + dx), m(280 + dz)] }, { reto: [m(120 + dx), m(95 + dz)] }] });
const dividir = (campos = {}, base = BASE, topo = GRADE.TOPO, materiais = undefined) => nucleo([...base, ['divisaoPorContorno', { chapa: CHAPA, vista: 'y', nome: 'painel', contorno: contornoDeProva(), segmentosArco: 16, ...campos }]], {}, topo, materiais);
const antes = () => nucleo(BASE, {}, GRADE.TOPO);

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const ponto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const triangulos = (r, filtro = () => true) => [...r.F.values()].filter(filtro).flatMap((f) => { const pts = f.vs.map((v) => r.V.get(v)); return triangularFace(pts).map((t) => t.map((k) => pts[k])); });
const area = (tris) => tris.reduce((s, [a, b, c]) => s + Math.hypot(...cruz(sub(b, a), sub(c, a))) / 2, 0);
/* a área vista do eixo y, em [x, z], sem sinal */
const areaNaVista = (tris) => tris.reduce((s, [a, b, c]) => s + Math.abs((b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0])) / 2, 0);

function distanciaAoTriangulo(p, [a, b, c]) {
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const d1 = ponto(ab, ap), d2 = ponto(ac, ap);
  if (d1 <= 0 && d2 <= 0) return Math.hypot(...ap);
  const bp = sub(p, b); const d3 = ponto(ab, bp), d4 = ponto(ac, bp);
  if (d3 >= 0 && d4 <= d3) return Math.hypot(...bp);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return Math.hypot(...sub(ap, ab.map((x) => x * v))); }
  const cp = sub(p, c); const d5 = ponto(ab, cp), d6 = ponto(ac, cp);
  if (d6 >= 0 && d5 <= d6) return Math.hypot(...cp);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return Math.hypot(...sub(ap, ac.map((x) => x * w))); }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / (d4 - d3 + d5 - d6); return Math.hypot(...sub(bp, sub(c, b).map((x) => x * w))); }
  const n = cruz(ab, ac);
  return Math.abs(ponto(ap, n)) / Math.hypot(...n);
}
const distanciaASuperficie = (p, tris) => tris.reduce((d, t) => Math.min(d, distanciaAoTriangulo(p, t)), Infinity);

const aoSegmento = (p, a, b) => { const l2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2; const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / l2)) : 0; return Math.hypot(p[0] - a[0] - (b[0] - a[0]) * t, p[1] - a[1] - (b[1] - a[1]) * t); };
const aoPoligono = (p, P) => P.reduce((d, a, k) => Math.min(d, aoSegmento(p, a, P[(k + 1) % P.length])), Infinity);

/** As arestas entre uma face da parte e uma face fora dela, como pares de pontos [x, z]. */
function bordaDaParte(r, nome) {
  const donos = new Map();
  for (const f of r.F.values()) f.vs.forEach((v, k) => { const w = f.vs[(k + 1) % f.vs.length]; const ch = v < w ? `${v}:${w}` : `${w}:${v}`; if (!donos.has(ch)) donos.set(ch, []); donos.get(ch).push(f.parte === nome); });
  const xz = (v) => { const p = r.V.get(Number(v)); return [p[0], p[2]]; };
  return [...donos].filter(([, d]) => d.includes(true) && d.includes(false)).map(([ch]) => ch.split(':').map(xz));
}

/** A borda contra a curva desenhada (o contorno com 256 segmentos por quarto de arco), nos dois sentidos, em metro. */
function desvioDaBorda(r, contorno, nome = 'painel') {
  const curva = contornoPorTrechos(contorno, { segmentosArco: 256 });
  const borda = bordaDaParte(r, nome);
  let daBorda = 0; let daCurva = 0;
  for (const [a, b] of borda) for (const t of [0, 0.25, 0.5, 0.75, 1]) daBorda = Math.max(daBorda, aoPoligono([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], curva));
  for (const p of curva) daCurva = Math.max(daCurva, borda.reduce((d, [a, b]) => Math.min(d, aoSegmento(p, a, b)), Infinity));
  return { daBorda, daCurva, arestas: borda.length };
}

const reprovas = (r) => analisarTopologia({ vertices: r.V, faces: r.F }, { triangulacao: true }).achados.filter((a) => a.severidade === 'reprova');
const menorRazao = (r) => Math.min(...[...r.F.values()].map((f) => razaoDaFace(f.vs.map((v) => r.V.get(v)))));
const canonico = (r) => JSON.stringify([[...r.V].sort((a, b) => a[0] - b[0]), [...r.F.values()].sort((a, b) => a.id - b.id).map((f) => [f.id, f.vs, f.parte, f.material])]);
const mm = (x) => x * 1000;

describe('divisaoPorContorno: a chapa dividida pelo contorno', () => {
  it('as provas da fatia 1 na chapa de teste, com os números do README', () => {
    const a = antes(); const r = dividir();
    expect(r.orfaos).toEqual([]);
    expect(reprovas(a)).toEqual([]);
    const contorno = contornoDeProva();
    const linhas = [];

    /* a área: a soma das partes é a da chapa, e a parte nova, vista do eixo, é o contorno nas duas peles */
    const areaAntes = area(triangulos(a)); const areaDepois = area(triangulos(r));
    const daParte = area(triangulos(r, (f) => f.parte === 'painel')); const doResto = area(triangulos(r, (f) => f.parte !== 'painel'));
    expect(Math.abs(areaDepois - areaAntes) / areaAntes).toBeLessThan(1e-12);
    expect(Math.abs(daParte + doResto - areaAntes) / areaAntes).toBeLessThan(1e-12);
    const P = contornoPorTrechos(contorno, { segmentosArco: 256 });
    const doContorno = Math.abs(P.reduce((s, p, k) => s + p[0] * P[(k + 1) % P.length][1] - P[(k + 1) % P.length][0] * p[1], 0)) / 2;
    const vista = areaNaVista(triangulos(r, (f) => f.parte === 'painel'));
    expect(Math.abs(vista - 2 * doContorno) / (2 * doContorno)).toBeLessThan(0.005);
    linhas.push(`área da chapa antes ${(areaAntes * 1e6).toFixed(6)} mm², depois ${(areaDepois * 1e6).toFixed(6)} mm² (diferença relativa ${(Math.abs(areaDepois - areaAntes) / areaAntes).toExponential(1)})`);
    linhas.push(`área da parte ${(daParte * 1e6).toFixed(3)} mm² + resto ${(doResto * 1e6).toFixed(3)} mm²; a parte vista do eixo ${(vista * 1e6).toFixed(1)} mm² contra ${(2 * doContorno * 1e6).toFixed(1)} mm² do contorno nas duas peles (${(100 * (vista - 2 * doContorno) / (2 * doContorno)).toFixed(3)} %)`);

    /* a malha: nenhuma aresta livre, vértice em aresta, dobra nem face fina, antes e depois */
    expect(reprovas(r)).toEqual([]);
    expect(menorRazao(r)).toBeGreaterThanOrEqual(LIMITE_DE_FACE_FINA);
    linhas.push(`faces ${a.F.size} antes, ${r.F.size} depois (${[...r.F.values()].filter((f) => f.parte === 'painel').length} na parte); vértices ${a.V.size} antes, ${r.V.size} depois; reprovas da topologia 0; menor área / maior aresta² ${menorRazao(r).toFixed(4)} (limite ${LIMITE_DE_FACE_FINA}; a chapa antes ${menorRazao(a).toFixed(4)})`);

    /* a borda sobre a curva: o encaixe de 5 % da maior aresta de um triângulo (a diagonal da face, de 28,3 mm) é 1,41 mm */
    const desvio = desvioDaBorda(r, contorno);
    expect(desvio.arestas).toBeGreaterThan(100);
    expect(mm(desvio.daBorda)).toBeLessThan(1.45);
    expect(mm(desvio.daCurva)).toBeLessThan(1.45);
    linhas.push(`borda da parte: ${desvio.arestas} arestas; a borda a no máximo ${mm(desvio.daBorda).toFixed(3)} mm da curva e a curva a no máximo ${mm(desvio.daCurva).toFixed(3)} mm da borda (encaixe 0,05; arestas de 20 mm e diagonais de 28,3 mm, limite de 1,41 mm)`);

    /* a superfície: o que o contorno não toca fica bit a bit, e o que é novo fica sobre a superfície de antes */
    for (const [id, p] of a.V) expect(r.V.get(id)).toEqual(p);
    let intactas = 0;
    for (const [id, f] of a.F) if (r.F.get(id).vs.length === f.vs.length && r.F.get(id).vs.every((v, k) => v === f.vs[k])) intactas++;
    const cortadas = a.F.size - intactas;
    expect(cortadas).toBeGreaterThan(50);
    const superficie = triangulos(a);
    let doVertice = 0; let doTriangulo = 0; let novosV = 0;
    for (const [id, p] of r.V) if (!a.V.has(id)) { novosV++; doVertice = Math.max(doVertice, distanciaASuperficie(p, superficie)); }
    for (const [x, y, z] of triangulos(r, (f) => !a.F.has(f.id) || r.F.get(f.id).vs.length !== a.F.get(f.id).vs.length || r.F.get(f.id).vs.some((v, k) => v !== a.F.get(f.id).vs[k]))) {
      doTriangulo = Math.max(doTriangulo, distanciaASuperficie([0, 1, 2].map((e) => (x[e] + y[e] + z[e]) / 3), superficie));
    }
    expect(doVertice).toBeLessThan(1e-12);
    expect(doTriangulo).toBeLessThan(1e-12);
    linhas.push(`superfície: ${a.V.size} vértices de antes na mesma posição, ${intactas} faces de antes com os mesmos cantos e ${cortadas} cortadas; ${novosV} vértices novos a no máximo ${doVertice.toExponential(1)} m da superfície de antes, e o centro de cada triângulo das faces cortadas a no máximo ${doTriangulo.toExponential(1)} m`);

    console.log(`divisaoPorContorno, chapa de teste:\n  ${linhas.join('\n  ')}`);
  });

  it('a mesma receita dá a mesma malha, e o contorno desenhado ao contrário dá a mesma parte', () => {
    const r = dividir();
    expect(canonico(dividir())).toBe(canonico(r));
    const c = contornoDeProva();
    const P = contornoPorTrechos(c, { segmentosArco: 16 });
    const ida = nucleo([...BASE, ['divisaoPorContorno', { chapa: CHAPA, vista: 'y', nome: 'painel', contorno: { inicio: P[0], trechos: [...P.slice(1), P[0]].map((p) => ({ reto: p })) } }]], {}, GRADE.TOPO);
    const volta = nucleo([...BASE, ['divisaoPorContorno', { chapa: CHAPA, vista: 'y', nome: 'painel', contorno: { inicio: P[0], trechos: [...P.slice(1).reverse(), P[0]].map((p) => ({ reto: p })) } }]], {}, GRADE.TOPO);
    expect(ida.orfaos).toEqual([]);
    expect(volta.orfaos).toEqual([]);
    expect(canonico(volta)).toBe(canonico(ida));
    expect(area(triangulos(ida, (f) => f.parte === 'painel'))).toBeCloseTo(area(triangulos(r, (f) => f.parte === 'painel')), 12);
  });

  it('em 12 posições do contorno e três discretizações, nenhuma recusa, nenhuma reprova de topologia e nenhuma face fina', () => {
    let pior = Infinity; let piorBorda = 0;
    for (let n = 0; n < 60; n += 5) for (const segmentosArco of [4, 16, 64]) {
      const contorno = contornoDeProva(n * 0.37, n * 0.61);
      const r = dividir({ contorno, segmentosArco });
      expect(r.orfaos, `posição ${n}, ${segmentosArco} segmentos`).toEqual([]);
      expect(reprovas(r), `posição ${n}, ${segmentosArco} segmentos`).toEqual([]);
      pior = Math.min(pior, menorRazao(r));
      if (segmentosArco === 64) piorBorda = Math.max(piorBorda, desvioDaBorda(r, contorno).daBorda);
    }
    expect(pior).toBeGreaterThanOrEqual(LIMITE_DE_FACE_FINA);
    /* o encaixe vale também na diagonal da face, de 28,3 mm: 5 % dela são 1,41 mm */
    expect(mm(piorBorda)).toBeLessThan(1.45);
    console.log(`divisaoPorContorno, 36 divisões: menor área / maior aresta² ${pior.toFixed(4)}; a borda a no máximo ${mm(piorBorda).toFixed(3)} mm da curva (64 segmentos por quarto de arco)`);
  });

  it('o encaixe menor aproxima a borda da curva, e a parte nova leva o material', () => {
    const contorno = contornoDeProva();
    const r = dividir({ encaixe: 0.02, material: 'tinta' }, BASE, GRADE.TOPO, { tinta: { cor: '#335577' } });
    expect(r.orfaos).toEqual([]);
    expect(reprovas(r)).toEqual([]);
    expect(mm(desvioDaBorda(r, contorno).daBorda)).toBeLessThan(0.5);
    const daParte = [...r.F.values()].filter((f) => f.parte === 'painel');
    expect(daParte.length).toBeGreaterThan(100);
    expect(daParte.every((f) => f.material === 'tinta')).toBe(true);
    expect([...r.F.values()].filter((f) => f.parte !== 'painel').every((f) => f.material !== 'tinta')).toBe(true);
    expect(Object.keys(r.partes)).toContain('painel');
  });

  it('o contorno sobre as linhas da malha não corta face nenhuma: a borda são as arestas que já existem', () => {
    /* na chapa plana as duas peles têm as linhas da malha no mesmo lugar da vista, a cada 20 mm */
    const plana = chapaDeGrade({ nx: 6, nz: 6, passo: 80, altura: () => 0, espessura: 2, niveis: 2 });
    const base = [['subdivisao', { origemId: 1, ...plana.passo }]];
    const a = nucleo(base, {}, plana.TOPO);
    const r = dividir({ contorno: retangulo(120.3, 99.8, 240.2, 220.4) }, base, plana.TOPO);
    expect(r.orfaos).toEqual([]);
    expect(reprovas(r)).toEqual([]);
    expect(r.F.size).toBe(a.F.size);
    expect(r.V.size).toBe(a.V.size);
    /* 6 por 6 faces de 20 mm em cada pele */
    expect([...r.F.values()].filter((f) => f.parte === 'painel').length).toBe(72);
  });

  it('a chapa que já tem parte só cede a região com substituir: true', () => {
    const base = [...BASE, ['parte', { nome: 'chapa', sel: CHAPA }]];
    const recusa = dividir({}, base);
    expect(recusa.orfaos[0].motivo).toMatch(/já pertence à parte 'chapa'/);
    expect(recusa.F.size).toBe(antes().F.size);
    const r = dividir({ substituir: true }, base);
    expect(r.orfaos).toEqual([]);
    const nomes = new Set([...r.F.values()].map((f) => f.parte));
    expect([...nomes].sort()).toEqual(['chapa', 'painel']);
  });

  it('com duas chapas na reta do eixo, sentido escolhe a camada que se divide', () => {
    const baixo = chapaDeGrade({ prefixo: 'q', nx: 6, nz: 6, passo: 80, altura: (x, z) => altura(x, z) - 60, espessura: 2, niveis: 2 });
    const base = [...BASE, ['subdivisao', { origemId: 2, ...baixo.passo }]];
    const topo = { ...GRADE.TOPO, ...baixo.TOPO };
    const semSentido = dividir({ chapa: { tudo: true } }, base, topo);
    expect(semSentido.orfaos[0].motivo).toMatch(/fura a chapa 4 vezes/);
    const yDaParte = (r) => { const ys = [...r.F.values()].filter((f) => f.parte === 'painel').flatMap((f) => f.vs.map((v) => r.V.get(v)[1])); return [Math.min(...ys), Math.max(...ys)]; };
    const deCima = dividir({ chapa: { tudo: true }, sentido: '+' }, base, topo);
    const deBaixo = dividir({ chapa: { tudo: true }, sentido: '-' }, base, topo);
    expect(deCima.orfaos).toEqual([]);
    expect(deBaixo.orfaos).toEqual([]);
    expect(reprovas(deCima)).toEqual([]);
    expect(reprovas(deBaixo)).toEqual([]);
    expect(yDaParte(deCima)[0]).toBeGreaterThan(m(-35));
    expect(yDaParte(deBaixo)[1]).toBeLessThan(m(-25));
    expect(area(triangulos(deBaixo, (f) => f.parte === 'painel'))).toBeCloseTo(area(triangulos(deCima, (f) => f.parte === 'painel')), 9);
  });
});

describe('divisaoPorContorno: o contorno de cotas redondas, sobre vértices e arestas da malha (revisão de 2026-11-19)', () => {
  const PLANA = chapaDeGrade({ nx: 6, nz: 6, passo: 80, altura: () => 0, espessura: 2, niveis: 2 });
  const basePlana = [['subdivisao', { origemId: 1, ...PLANA.passo }]];
  const naPlana = (contorno, campos = {}) => dividir({ contorno, ...campos }, basePlana, PLANA.TOPO);
  const sa = (r) => { expect(r.orfaos).toEqual([]); expect(reprovas(r)).toEqual([]); expect(menorRazao(r)).toBeGreaterThanOrEqual(LIMITE_DE_FACE_FINA); return r; };
  const daParte = (r, nome = 'painel') => [...r.F.values()].filter((f) => f.parte === nome).length;

  it('o retângulo exatamente sobre as linhas da malha não corta nada, na chapa plana, e divide a curva', () => {
    const a = nucleo(basePlana, {}, PLANA.TOPO);
    const r = sa(naPlana(retangulo(120, 100, 240, 220)));
    expect(r.F.size).toBe(a.F.size);
    expect(r.V.size).toBe(a.V.size);
    expect(daParte(r)).toBe(72);
    const c = sa(dividir({ contorno: retangulo(120, 100, 240, 220) }));
    expect(mm(desvioDaBorda(c, retangulo(120, 100, 240, 220)).daBorda)).toBeLessThan(1.45);
  });

  it('o losango pelos vértices, o canto num vértice, o lado ao longo de uma aresta e o quase tangente dividem sem recusa', () => {
    /* o losango pelas diagonais das faces: 100 faces inteiras e 40 metades em cada pele, sem vértice novo */
    const a = nucleo(basePlana, {}, PLANA.TOPO);
    const losango = sa(naPlana(poligonoDeRetas([[200, 100], [300, 200], [200, 300], [100, 200]])));
    expect(losango.V.size).toBe(a.V.size);
    /* as diagonais do losango medem 200 mm: 0,02 m² em cada pele */
    expect(area(triangulos(losango, (f) => f.parte === 'painel'))).toBeCloseTo(0.04, 12);
    for (const [nome, contorno] of Object.entries({
      'losango pela outra diagonal': poligonoDeRetas([[200, 120], [280, 200], [200, 280], [120, 200]]),
      'canto num vértice': poligonoDeRetas([[140, 140], [260, 141], [250, 260]]),
      'toca um vértice por fora': poligonoDeRetas([[130, 130], [200, 130], [200, 140], [130, 140]]),
      'lado ao longo de uma linha da malha': poligonoDeRetas([[100.37, 140], [300.37, 140], [200.37, 260.61]]),
      'quase tangente a uma aresta': poligonoDeRetas([[130, 100.001], [270, 100.0], [270, 270], [130, 270]]),
      'rente à borda da chapa': retangulo(0.5, 0.5, 399.5, 399.5),
    })) for (const chapa of ['plana', 'curva']) {
      const r = chapa === 'plana' ? naPlana(contorno) : dividir({ contorno });
      expect(r.orfaos, `${nome}, ${chapa}`).toEqual([]);
      expect(reprovas(r), `${nome}, ${chapa}`).toEqual([]);
      expect(menorRazao(r), `${nome}, ${chapa}`).toBeGreaterThanOrEqual(LIMITE_DE_FACE_FINA);
    }
  });

  it('o canto do contorno exatamente sobre a diagonal de uma face vira um vértice só', () => {
    /* o canto [130, 130] cai sobre a diagonal da face de [120, 120] a [140, 140] */
    const r = sa(naPlana(poligonoDeRetas([[130, 130], [300.37, 150.61], [130.37, 252.61]])));
    const lugares = new Map();
    for (const [id, p] of r.V) { const ch = p.map((x) => x.toFixed(9)).join(','); expect(lugares.has(ch), `vértices ${lugares.get(ch)} e ${id} no mesmo ponto`).toBe(false); lugares.set(ch, id); }
    sa(dividir({ contorno: poligonoDeRetas([[300, 230], [240, 270], [180, 230], [220, 150], [280, 130]]) }));
  });

  it('40 contornos de cotas múltiplas de 10 mm sobre a chapa curva dividem todos, com a área somada igual', () => {
    const a = antes(); const total = area(triangulos(a));
    let semente = 12345; const sorteio = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648; };
    for (let k = 0; k < 40; k++) {
      const cx = 150 + Math.round(sorteio() * 10) * 10, cz = 150 + Math.round(sorteio() * 10) * 10;
      const pontos = [0, 1, 2, 3, 4].map((j) => { const t = (j / 5) * 2 * Math.PI + sorteio() * 0.5; const raio = 40 + sorteio() * 60; return [Math.round((cx + raio * Math.cos(t)) / 10) * 10, Math.round((cz + raio * Math.sin(t)) / 10) * 10]; });
      const r = dividir({ contorno: poligonoDeRetas(pontos) });
      expect(r.orfaos, JSON.stringify(pontos)).toEqual([]);
      expect(reprovas(r), JSON.stringify(pontos)).toEqual([]);
      expect(menorRazao(r), JSON.stringify(pontos)).toBeGreaterThanOrEqual(LIMITE_DE_FACE_FINA);
      expect(Math.abs(area(triangulos(r)) - total) / total).toBeLessThan(1e-12);
    }
  });

  it('o bico mais estreito que o encaixe recusa com o lugar, e a ponta curta dele é aparada', () => {
    /* o triângulo de 3,3 graus: os dois lados caem sobre a mesma linha da malha por 10 mm */
    const agulha = naPlana(poligonoDeRetas([[130.37, 130.61], [300.37, 140.61], [130.37, 141.61]]));
    expect(agulha.orfaos[0].motivo).toMatch(/o contorno tem um bico ou uma faixa mais estreita que o encaixe perto de \[[\d.]+, [\d.]+\] mm, vista do eixo y: os dois lados dele caem sobre a mesma aresta da chapa \(de [\d.]+ mm na vista\)/);
    expect(agulha.F.size).toBe(nucleo(basePlana, {}, PLANA.TOPO).F.size);
    /* a estrela na vista inclinada: a ponta de uma das pontas passa 1,8 mm de um vértice e é aparada, sem recusa */
    const vista = [0.9, 1, 0]; const quadro = quadroDaVista(vista);
    const centro = quadro.local([0.2, 0, 0.2]);
    const r = dividir({ vista, segmentosArco: 4, contorno: estrela([centro[0] * 1000 + 0.31, centro[1] * 1000 + 0.17], 5, 80, 40) });
    sa(r);
    expect(daParte(r)).toBeGreaterThan(100);
  });

  it('depois da divisão a seleção pela origem cobre a chapa inteira, e uma segunda divisão funciona', () => {
    const d1 = ['divisaoPorContorno', { chapa: CHAPA, vista: 'y', nome: 'painel', contorno: retangulo(110.3, 110.7, 250.1, 250.9) }];
    const r1 = nucleo([...BASE, d1], {}, GRADE.TOPO);
    expect(r1.F.size).toBeGreaterThan(antes().F.size + 100);
    const marcadas = (sel) => { const r = nucleo([...BASE, d1, ['parte', { sel, nome: 'marca', substituir: true }]], {}, GRADE.TOPO); expect(r.orfaos).toEqual([]); return new Set([...r.F.values()].filter((f) => f.parte === 'marca').map((f) => f.id)); };
    expect(marcadas(CHAPA).size).toBe(r1.F.size);
    const peles = ['externa', 'interna', 'borda'].map((parte) => marcadas({ origem: { op: 'subdivisao', id: 1, parte } }));
    expect(peles[0].size + peles[1].size + peles[2].size).toBe(r1.F.size);
    expect(new Set(peles.flatMap((p) => [...p])).size).toBe(r1.F.size);
    /* cada pele tem a sua parte do painel: os pedaços novos entraram na lista da pele da face de que saíram */
    const doPainel = new Set([...r1.F.values()].filter((f) => f.parte === 'painel').map((f) => f.id));
    expect([...peles[0]].filter((f) => doPainel.has(f)).length).toBeGreaterThan(40);
    expect([...peles[1]].filter((f) => doPainel.has(f)).length).toBeGreaterThan(40);
    expect([...peles[2]].filter((f) => doPainel.has(f)).length).toBe(0);
    const r2 = nucleo([...BASE, d1, ['divisaoPorContorno', { chapa: CHAPA, vista: 'y', nome: 'estrela', contorno: estrela([250.3, 250.1], 5, 70, 35), substituir: true }]], {}, GRADE.TOPO);
    expect(r2.orfaos).toEqual([]);
    expect(reprovas(r2)).toEqual([]);
    expect(daParte(r2, 'estrela')).toBeGreaterThan(80);
    expect(daParte(r2, 'painel')).toBeGreaterThan(80);
    expect(Math.abs(area(triangulos(r2)) - area(triangulos(antes()))) / area(triangulos(antes()))).toBeLessThan(1e-12);
  });

  it('o número que a receita não resolve recusa pelo campo em que veio, sem lançar', () => {
    const semNumero = dividir({ encaixe: NaN });
    expect(semNumero.orfaos[0]).toMatchObject({ ref: 'encaixe' });
    expect(semNumero.orfaos[0].motivo).toMatch(/encaixe da divisão não é um número que a receita resolva \(veio NaN\)/);
    const contorno = dividir({ contorno: { inicio: [NaN, 0.1], trechos: [{ reto: [0.2, 0.1] }, { reto: [0.2, 0.2] }, { reto: [NaN, 0.1] }] } });
    expect(contorno.orfaos[0]).toMatchObject({ ref: 'contorno' });
    expect(contorno.orfaos[0].motivo).toMatch(/o contorno da divisão tem um valor que a receita não resolve/);
  });
});

describe('divisaoPorContorno: o contorno sobre as arestas não muda as faces que só encosta (segunda revisão de 2026-11-19)', () => {
  it('o contorno pelas arestas de um bloco de faces da pele de fora deixa todas as faces de antes com o id e os cantos', () => {
    for (const alturaDaChapa of [altura, () => 0]) {
      const grade = chapaDeGrade({ nx: 6, nz: 6, passo: 80, altura: alturaDaChapa, espessura: 2, niveis: 2 });
      const base = [['subdivisao', { origemId: 1, ...grade.passo }]];
      const a = nucleo(base, {}, grade.TOPO);
      /* a volta das arestas de fora do bloco de faces da pele de fora com o centro de 110 a 250 mm em x e de 110 a 210 mm em z */
      const pele = nucleo([...base, ['parte', { sel: { origem: { op: 'subdivisao', id: 1, parte: 'externa' } }, nome: 'x' }]], {}, grade.TOPO);
      const bloco = [...pele.F.values()].filter((f) => { if (f.parte !== 'x') return false; const c = f.vs.map((v) => a.V.get(v)).reduce((s, p) => [s[0] + p[0] / f.vs.length, s[1] + p[2] / f.vs.length], [0, 0]); return c[0] > 0.11 && c[0] < 0.25 && c[1] > 0.11 && c[1] < 0.21; });
      expect(bloco.length).toBeGreaterThan(30);
      const usos = new Map();
      for (const f of bloco) f.vs.forEach((v, k) => { const w = f.vs[(k + 1) % f.vs.length]; const ch = v < w ? `${v}:${w}` : `${w}:${v}`; usos.set(ch, (usos.get(ch) ?? 0) + 1); });
      const seguinte = new Map();
      for (const f of bloco) f.vs.forEach((v, k) => { const w = f.vs[(k + 1) % f.vs.length]; if (usos.get(v < w ? `${v}:${w}` : `${w}:${v}`) === 1) seguinte.set(v, w); });
      const volta = [seguinte.keys().next().value];
      while (seguinte.get(volta[volta.length - 1]) !== volta[0]) volta.push(seguinte.get(volta[volta.length - 1]));
      expect(volta.length).toBeGreaterThan(20);
      const pontos = volta.map((v) => [a.V.get(v)[0], a.V.get(v)[2]]);
      const r = nucleo([...base, ['divisaoPorContorno', { chapa: CHAPA, vista: 'y', nome: 'painel', contorno: { inicio: pontos[0], trechos: [...pontos.slice(1), pontos[0]].map((p) => ({ reto: p })) } }]], {}, grade.TOPO);
      expect(r.orfaos).toEqual([]);
      /* nenhuma face nem vértice novo, e cada face de antes com os mesmos cantos na mesma ordem (o mesmo texto canônico sem as partes) */
      const semPartes = (x) => JSON.stringify([[...x.V].sort((p, q) => p[0] - q[0]), [...x.F.values()].sort((p, q) => p.id - q.id).map((f) => [f.id, f.vs])]);
      expect(semPartes(r)).toBe(semPartes(a));
      const daParte = new Set([...r.F.values()].filter((f) => f.parte === 'painel').map((f) => f.id));
      for (const f of bloco) expect(daParte.has(f.id)).toBe(true);
      /* a pele de dentro, sob o bloco, entra com o mesmo número de faces inteiras */
      expect(daParte.size).toBe(2 * bloco.length);
    }
  });
});

describe('divisaoPorContorno: as recusas', () => {
  const motivo = (campos, base, topo) => { const r = dividir(campos, base, topo); expect(r.orfaos.length, JSON.stringify(campos)).toBeGreaterThan(0); expect(r.F.size).toBe((base ? nucleo(base, {}, topo ?? GRADE.TOPO) : antes()).F.size); return `${r.orfaos[0].ref}: ${r.orfaos[0].motivo}`; };

  it('os argumentos', () => {
    expect(motivo({ chapa: undefined })).toMatch(/chapa é a seleção das faces que a divisão corta/);
    expect(motivo({ vista: 'w' })).toMatch(/vista precisa ser 'x', 'y' ou 'z', o eixo ao longo do qual o contorno é projetado na chapa/);
    expect(motivo({ nome: '' })).toMatch(/nome é o da parte nova, a região de dentro do contorno/);
    expect(motivo({ material: 'vidro' })).toMatch(/o material 'vidro' da parte nova não existe em MATERIAIS/);
    expect(motivo({ substituir: 'sim' })).toMatch(/substituir só aceita o literal true \(a região de dentro sai da parte que já tinha/);
    expect(motivo({ sentido: 'cima' })).toMatch(/o lado do eixo da vista de onde se olha a camada que se divide/);
    expect(motivo({ segmentosArco: 0 })).toMatch(/segmentosArco da divisão precisa ser inteiro de 1 a 4096, e veio 0/);
    expect(motivo({ encaixe: 0.4 })).toMatch(/encaixe é a fração da aresta, de 0 a 0.25/);
    expect(motivo({ contorno: [[0, 0]] })).toMatch(/contorno da divisão precisa ser \{ inicio: \[u, v\], trechos/);
    expect(motivo({ contorno: { inicio: [0.1, 0.1], trechos: [{ curva: [0.2, 0.2] }] } })).toMatch(/contorno/);
    expect(motivo({ chapa: { origem: { op: 'subdivisao', id: 7 } } })).toMatch(/origem/);
  });

  it('o contorno que se cruza', () => {
    expect(motivo({ contorno: poligonoDeRetas([[120, 100], [300, 300], [300, 100], [120, 300]]) })).toMatch(/o contorno da divisão se cruza/);
  });

  it('o contorno que não cai na chapa, o que envolve a chapa inteira e o que encosta na borda', () => {
    expect(motivo({ contorno: retangulo(900, 900, 950, 950) })).toMatch(/o contorno fica fora da chapa vista do eixo y: a reta do eixo não toca nenhuma face da seleção/);
    expect(motivo({ contorno: retangulo(-50, -50, 450, 450) })).toMatch(/o contorno envolve a chapa inteira vista do eixo y sem cruzar nenhuma aresta dela/);
    /* lado ou canto exatamente sobre a borda da chapa (plana e curva): encosta sem atravessar */
    const plana = chapaDeGrade({ nx: 6, nz: 6, passo: 80, altura: () => 0, espessura: 2, niveis: 2 });
    const basePlana = [['subdivisao', { origemId: 1, ...plana.passo }]];
    expect(motivo({ contorno: retangulo(200, 100, 400, 300) }, basePlana, plana.TOPO)).toMatch(/o contorno encosta na borda da chapa ou na parede de um vão em \[400\.00, 100\.00\] mm, vista do eixo y/);
    expect(motivo({ contorno: poligonoDeRetas([[0, 200], [150, 100], [150, 300]]) }, basePlana, plana.TOPO)).toMatch(/o contorno encosta na borda da chapa ou na parede de um vão em \[0\.00, 200\.00\] mm, vista do eixo y/);
    expect(motivo({ contorno: retangulo(200, 100, 400, 300) })).toMatch(/o contorno encosta na borda da chapa ou na parede de um vão em \[400\.00, 100\.00\] mm, vista do eixo y/);
  });

  it('o contorno que cabe inteiro numa face', () => {
    expect(motivo({ contorno: retangulo(133, 123, 137, 126) })).toMatch(/o contorno não cruza aresta nenhuma da chapa em volta de \[[\d.]+, [\d.]+\] mm, vista do eixo y: ou ele cabe inteiro dentro de um triângulo de uma face/);
  });

  it('o espinho que entra e sai pelo mesmo vértice', () => {
    /* a boca do espinho, de 0,4 mm, fica sobre o vértice [200, 200] da malha, e a ponta dele 10 mm dentro da face */
    const espinho = poligonoDeRetas([[130, 130], [270, 130], [270, 270], [200.3, 200.1], [192, 194], [200.1, 200.3], [130, 270]]);
    expect(motivo({ contorno: espinho })).toMatch(/o contorno faz um espinho em/);
  });

  it('o pedaço fino, com a medida, quando o encaixe é zero', () => {
    const texto = motivo({ contorno: retangulo(120.02, 100.01, 240.03, 220.02), encaixe: 0 });
    expect(texto).toMatch(/o corte deixaria um pedaço fino na face \d+, em \[[\d.]+, [\d.]+\] mm, vista do eixo y: área \/ maior aresta² = [\d.e-]+, abaixo do limite de face fina 0.003/);
    expect(texto).toMatch(/aumente o encaixe \(0\) ou desloque o contorno/);
  });

  it('o contorno que cruza uma face de perfil fora da borda da chapa (degrau interno)', () => {
    const quadro = quadroDaVista('y');
    /* um degrau: dois patamares ligados por uma face vertical, que a vista de cima vê de perfil entre faces do mesmo sinal */
    const V = new Map([[0, [0, 0, 0]], [1, [0.1, 0, 0]], [2, [0.1, 0, 0.1]], [3, [0, 0, 0.1]], [4, [0.1, 0.05, 0]], [5, [0.2, 0.05, 0]], [6, [0.2, 0.05, 0.1]], [7, [0.1, 0.05, 0.1]]]);
    const F = new Map([[0, { vs: [0, 3, 2, 1] }], [1, { vs: [4, 7, 6, 5] }], [2, { vs: [1, 2, 7, 4] }]]);
    const degrau = dividirMalhaPorContorno({ V, F, ids: [0, 1, 2], quadro, poligono: [[0.03, 0.03], [0.17, 0.03], [0.17, 0.07], [0.03, 0.07]] });
    expect(degrau.erro).toMatch(/o contorno toca ou cruza uma face de perfil fora da borda da chapa/);
  });

  it('as duas camadas que se sobrepõem em profundidade', () => {
    /* duas folhas abertas, paralelas e inclinadas: a de trás num ponto do contorno fica à frente da da frente noutro */
    const V = new Map([[0, [0, 0, 0]], [1, [0.2, 0.2, 0]], [2, [0.2, 0.2, 0.1]], [3, [0, 0, 0.1]], [4, [0, -0.05, 0]], [5, [0.2, 0.15, 0]], [6, [0.2, 0.15, 0.1]], [7, [0, -0.05, 0.1]]]);
    const F = new Map([[0, { vs: [0, 3, 2, 1] }], [1, { vs: [4, 7, 6, 5] }]]);
    const r = dividirMalhaPorContorno({ V, F, ids: [0, 1], quadro: quadroDaVista('y'), poligono: [[0.03, 0.03], [0.17, 0.03], [0.17, 0.07], [0.03, 0.07]], sentido: '+' });
    expect(r.erro).toMatch(/as duas camadas da chapa se sobrepõem em profundidade nos pontos do contorno/);
  });

  it('a região de dentro que se liga à de fora por trás da camada', () => {
    /* duas folhas de 3 por 3 faces, sem a face do meio, ligadas por um tubo no furo do meio e por uma parede num lado de fora: a
       seleção é aberta, a divisão corta só a folha de cima, e a região de dentro alcança a de fora pelo tubo e pela folha de baixo */
    const V = new Map(); const F = new Map(); let f = 0;
    const id = (i, j, camada) => camada * 16 + i * 4 + j;
    for (const camada of [0, 1]) for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) V.set(id(i, j, camada), [0.1 * i, camada ? 0 : 0.05, 0.1 * j]);
    for (const camada of [0, 1]) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (i !== 1 || j !== 1) F.set(f++, { vs: [id(i, j, camada), id(i, j + 1, camada), id(i + 1, j + 1, camada), id(i + 1, j, camada)] });
    for (const [[a, b], [c, d]] of [[[1, 1], [1, 2]], [[1, 2], [2, 2]], [[2, 2], [2, 1]], [[2, 1], [1, 1]]]) F.set(f++, { vs: [id(a, b, 0), id(c, d, 0), id(c, d, 1), id(a, b, 1)] });
    for (let j = 0; j < 3; j++) F.set(f++, { vs: [id(3, j, 0), id(3, j + 1, 0), id(3, j + 1, 1), id(3, j, 1)] });
    const poligono = [[0.05, 0.05], [0.25, 0.05], [0.25, 0.25], [0.05, 0.25]];
    const r = dividirMalhaPorContorno({ V, F, ids: [...F.keys()], quadro: quadroDaVista('y'), poligono, sentido: '+' });
    expect(r.erro).toMatch(/a região de dentro do contorno se liga à de fora por outro caminho da chapa, sem passar pela borda nova/);
    /* só a folha de cima: a divisão fecha, com os oito pedaços de dentro em volta do furo */
    const soCima = dividirMalhaPorContorno({ V, F, ids: [...F.keys()].slice(0, 8), quadro: quadroDaVista('y'), poligono });
    expect(soCima.erro).toBeUndefined();
    expect(soCima.faces.size).toBe(8);
  });

  it('o contorno sem forma, na conta direta', () => {
    const a = antes();
    const r = dividirMalhaPorContorno({ V: a.V, F: a.F, ids: [...a.F.keys()], quadro: quadroDaVista('y'), poligono: [[0.1, 0.1], [0.2, 0.1]] });
    expect(r.erro).toMatch(/o contorno não tem forma/);
  });
});

describe('divisaoPorContorno: parte fechada pela borda da chapa ou pela boca do vão (fatia 2)', () => {
  const conferir = (r, a, rotulo) => {
    expect(r.orfaos, rotulo).toEqual([]);
    expect(reprovas(r), rotulo).toEqual([]);
    expect(menorRazao(r), rotulo).toBeGreaterThanOrEqual(LIMITE_DE_FACE_FINA);
    const areaAntes = area(triangulos(a));
    const areaDepois = area(triangulos(r));
    expect(Math.abs(areaDepois - areaAntes) / areaAntes, rotulo).toBeLessThan(1e-12);
    const daParte = area(triangulos(r, (f) => f.parte === 'painel'));
    const doResto = area(triangulos(r, (f) => f.parte !== 'painel'));
    expect(daParte, rotulo).toBeGreaterThan(0);
    expect(doResto, rotulo).toBeGreaterThan(0);
    expect(Math.abs(daParte + doResto - areaAntes) / areaAntes, rotulo).toBeLessThan(1e-12);
    /* todo vértice novo fica sobre a superfície de antes */
    const sup = triangulos(a);
    for (const [id, p] of r.V) if (!a.V.has(id)) expect(distanciaASuperficie(p, sup), rotulo).toBeLessThan(1e-12);
  };

  it('parte fechada pela borda da chapa (1 borda, canto e faixa com 4 cantos fora) divide a parede de espessura no cruzamento', () => {
    const plana = chapaDeGrade({ nx: 6, nz: 6, passo: 80, altura: () => 0, espessura: 2, niveis: 2 });
    const basePlana = [['subdivisao', { origemId: 1, ...plana.passo }]];
    for (const [nomeChapa, base, topo] of [['plana', basePlana, plana.TOPO], ['curva', BASE, GRADE.TOPO]]) {
      const a = nucleo(base, {}, topo);
      for (const [caso, contorno] of [
        ['1 borda', retangulo(280.3, 107.7, 460, 273.4)],
        ['canto', retangulo(290.3, 290.7, 460, 460)],
        ['faixa (4 cantos fora)', retangulo(-50, 127.3, 450, 253.7)],
      ]) {
        const r = dividir({ contorno }, base, topo);
        conferir(r, a, `${nomeChapa} / ${caso}`);
        /* a parede de espessura da borda (origem parte: 'borda') foi dividida entre a parte nova e o resto */
        const borda = nucleo([...base, ['divisaoPorContorno', { chapa: CHAPA, vista: 'y', nome: 'painel', contorno }], ['parte', { sel: { origem: { op: 'subdivisao', id: 1, parte: 'borda' } }, nome: 'soBorda', substituir: true }]], {}, topo);
        const idsBorda = new Set([...borda.F.values()].filter((f) => f.parte === 'soBorda').map((f) => f.id));
        const bordaNaParte = [...r.F.values()].filter((f) => idsBorda.has(f.id) && f.parte === 'painel').length;
        const bordaNoResto = [...r.F.values()].filter((f) => idsBorda.has(f.id) && f.parte !== 'painel').length;
        expect(bordaNaParte, `${nomeChapa} / ${caso}: parede na parte`).toBeGreaterThan(0);
        expect(bordaNoResto, `${nomeChapa} / ${caso}: parede no resto`).toBeGreaterThan(0);
      }
    }
  });

  it('parte fechada pela boca de um vão (abertura por contorno e furo circular) divide a parede do vão', () => {
    const baseAb = [...BASE, ['aberturaPorContorno', { origemId: 2, chapa: CHAPA, vista: 'y', contorno: retangulo(150, 150, 250, 250) }]];
    const chAb = { origem: { op: 'aberturaPorContorno', id: 2 } };
    const aAb = nucleo(baseAb, {}, GRADE.TOPO);
    for (const [caso, contorno] of [
      ['canto no vão', retangulo(200.3, 200.7, 330.4, 330.2)],
      ['abraça metade do vão', retangulo(120.3, 200.7, 280.4, 330.2)],
      ['sai pelo vão e pela borda', retangulo(200.3, 200.7, 460, 330.2)],
    ]) {
      const r = dividir({ chapa: chAb, contorno }, baseAb, GRADE.TOPO);
      conferir(r, aAb, `abertura / ${caso}`);
    }
    const furo = furoPassante({ solido: CHAPA, posicao: [m(200), 0, m(200)], direcao: 'y', raio: m(70), comprimento: m(200), lados: 32, ids: { cilindro: 2, subtrair: 3 }, nome: 'furo' });
    const baseFuro = [...BASE, ...furo.passos];
    const chFuro = { origem: { op: 'subtrair', id: 3 } };
    const aFuro = nucleo(baseFuro, {}, GRADE.TOPO, undefined, null, furo.aliases);
    const rFuro = nucleo([...baseFuro, ['divisaoPorContorno', { chapa: chFuro, vista: 'y', nome: 'painel', contorno: retangulo(185.3, 185.7, 335.4, 335.2) }]], {}, GRADE.TOPO, undefined, null, furo.aliases);
    conferir(rFuro, aFuro, 'furo circular');
  });

  it('bateria de posições deslocadas na borda e no furo circular da chapa curva, sem recusa nem face fina', () => {
    const furo = furoPassante({ solido: CHAPA, posicao: [m(200), 0, m(200)], direcao: 'y', raio: m(70), comprimento: m(200), lados: 32, ids: { cilindro: 2, subtrair: 3 }, nome: 'furo' });
    const baseFuro = [...BASE, ...furo.passos];
    const chFuro = { origem: { op: 'subtrair', id: 3 } };
    let pior = Infinity;
    for (let k = 0; k < 10; k++) {
      const rB = dividir({ contorno: retangulo(270 + k * 1.42, 90 + k * 2.26, 460, 270 + k * 2.26) });
      expect(rB.orfaos, `borda ${k}`).toEqual([]);
      expect(reprovas(rB), `borda ${k}`).toEqual([]);
      pior = Math.min(pior, menorRazao(rB));
      const rF = nucleo([...baseFuro, ['divisaoPorContorno', { chapa: chFuro, vista: 'y', nome: 'painel', contorno: retangulo(180 + k * 2.74, 180 + k * 3.46, 330 + k * 1.1, 330 + k * 1.1) }]], {}, GRADE.TOPO, undefined, null, furo.aliases);
      expect(rF.orfaos, `furo ${k}`).toEqual([]);
      expect(reprovas(rF), `furo ${k}`).toEqual([]);
      pior = Math.min(pior, menorRazao(rF));
    }
    expect(pior).toBeGreaterThanOrEqual(LIMITE_DE_FACE_FINA);
  });

  it('com duas camadas na reta do eixo, sentido escolhe a camada mesmo quando todos os cantos saem da chapa', () => {
    const baixo = chapaDeGrade({ prefixo: 'q', nx: 6, nz: 6, passo: 80, altura: (x, z) => altura(x, z) - 60, espessura: 2, niveis: 2 });
    const base = [...BASE, ['subdivisao', { origemId: 2, ...baixo.passo }]];
    const topo = { ...GRADE.TOPO, ...baixo.TOPO };
    const faixa = retangulo(-50, 127.3, 450, 253.7);
    const semSentido = dividir({ chapa: { tudo: true }, contorno: faixa }, base, topo);
    expect(semSentido.orfaos[0].motivo).toMatch(/fura a chapa 4 vezes/);
    const deCima = dividir({ chapa: { tudo: true }, sentido: '+', contorno: faixa }, base, topo);
    const deBaixo = dividir({ chapa: { tudo: true }, sentido: '-', contorno: faixa }, base, topo);
    expect(deCima.orfaos).toEqual([]);
    expect(deBaixo.orfaos).toEqual([]);
    expect(reprovas(deCima)).toEqual([]);
    expect(reprovas(deBaixo)).toEqual([]);
    const ys = (r) => [...r.F.values()].filter((f) => f.parte === 'painel').flatMap((f) => f.vs.map((v) => r.V.get(v)[1]));
    expect(Math.min(...ys(deCima))).toBeGreaterThan(m(-35));
    expect(Math.max(...ys(deBaixo))).toBeLessThan(m(-25));
  });

  it('regressões da revisão adversarial da fatia 2 (seleção parcial, borda inclinada x=0, camadas escalonadas, jitter de vão, flanco 68°, encaixe na borda e lado colinear)', () => {
    const plana = chapaDeGrade({ nx: 6, nz: 6, passo: 80, altura: () => 0, espessura: 2, niveis: 2 });
    const basePlana = [['subdivisao', { origemId: 1, ...plana.passo }]];
    /* B1: seleção parcial da pele externa de chapa fechada saindo pela borda recusa sem corromper a malha */
    const b1 = dividir({ chapa: { origem: { op: 'subdivisao', id: 1, parte: 'externa' } }, contorno: retangulo(253.1, 107.3, 450, 293.7) });
    expect(b1.orfaos[0].motivo).toMatch(/fronteira de uma seleção parcial/);
    expect(reprovas(b1)).toEqual([]);
    /* B2: borda inclinada x=0 na chapa curva divide sem deadlock (com e sem sentido) */
    const cB2 = retangulo(-50, 203.3, 130.3, 343.7);
    for (const sentido of [undefined, '+', '-']) {
      const r = dividir({ ...(sentido ? { sentido } : {}), contorno: cB2 });
      expect(r.orfaos, `B2 sentido=${sentido}`).toEqual([]);
      expect(reprovas(r), `B2 sentido=${sentido}`).toEqual([]);
    }
    /* B2b: duas camadas escalonadas com contorno saindo pela borda da camada superior sobre a inferior */
    const g1 = chapaDeGrade({ prefixo: 'e1', nx: 4, nz: 4, passo: 100, altura: () => 0, espessura: 2, niveis: 1 });
    const g2 = chapaDeGrade({ prefixo: 'e2', nx: 4, nz: 4, passo: 100, altura: () => -60, espessura: 2, niveis: 1 });
    const topoEsc = { ...g1.TOPO, ...Object.fromEntries(Object.entries(g2.TOPO).map(([k, p]) => [k, [p[0] + 0.1, p[1], p[2]]])) };
    const b2b = dividir({ chapa: { tudo: true }, sentido: '+', contorno: retangulo(250.3, 100.3, 450, 300.7) }, [['subdivisao', { origemId: 1, ...g1.passo }], ['subdivisao', { origemId: 2, ...g2.passo }]], topoEsc);
    expect(b2b.orfaos).toEqual([]);
    expect(reprovas(b2b)).toEqual([]);
    /* B3: vão de aberturaPorContorno com jitter numérico na parede sul divide sem falsa recusa */
    const baseAb = [...BASE, ['aberturaPorContorno', { origemId: 2, chapa: CHAPA, vista: 'y', contorno: retangulo(150, 150, 250, 250) }]];
    const chAb = { origem: { op: 'aberturaPorContorno', id: 2 } };
    const b3 = dividir({ chapa: chAb, contorno: retangulo(155.3, 80.3, 205.3, 200.7) }, baseAb, GRADE.TOPO);
    expect(b3.orfaos).toEqual([]);
    expect(reprovas(b3)).toEqual([]);
    /* B4: flanco inclinado a 68,2° com contorno 100% interno não é confundido com parede de borda */
    const gf = chapaDeGrade({ nx: 6, nz: 6, passo: 80, altura: (x) => (x <= 160 ? 0 : -(x - 160) * 2.5), espessura: 2, niveis: 1 });
    const b4 = dividir({ contorno: retangulo(120, 80, 360, 320) }, [['subdivisao', { origemId: 1, ...gf.passo }]], gf.TOPO);
    expect(b4.orfaos).toEqual([]);
    expect(reprovas(b4)).toEqual([]);
    /* B5: faixa estreita encaixada na borda não gera falso túnel no voto da parede */
    const b5 = dividir({ contorno: retangulo(382, 100.95, 460, 101.85) }, basePlana, plana.TOPO);
    expect(b5.orfaos).toEqual([]);
    expect(reprovas(b5)).toEqual([]);
    /* B6: lado colinear à borda (nos dois extremos, com cantos fora) e canto sobre vão com jitter recusam com encostaNaBorda */
    expect(dividir({ contorno: retangulo(-50, 200, 450, 400) }, basePlana, plana.TOPO).orfaos[0].motivo).toMatch(/o contorno encosta na borda da chapa ou na parede de um vão/);
    expect(dividir({ contorno: retangulo(-50, 0, 450, 200) }, basePlana, plana.TOPO).orfaos[0].motivo).toMatch(/o contorno encosta na borda da chapa ou na parede de um vão/);
    expect(dividir({ chapa: chAb, contorno: retangulo(150, 200, 320.4, 320.2) }, baseAb, GRADE.TOPO).orfaos[0].motivo).toMatch(/o contorno encosta na borda da chapa ou na parede de um vão/);
    /* R2-1: vão de aberturaPorContorno em chapa inclinada a 45° divide sem falsa recusa */
    const gInc = chapaDeGrade({ nx: 6, nz: 6, passo: 80, altura: (x) => -x, espessura: 2, niveis: 1 });
    const baseInc = [['subdivisao', { origemId: 1, ...gInc.passo }], ['aberturaPorContorno', { origemId: 2, chapa: CHAPA, vista: 'y', contorno: retangulo(150, 150, 250, 250) }]];
    const r21 = dividir({ chapa: chAb, contorno: retangulo(200.3, 200.7, 330.4, 330.2) }, baseInc, gInc.TOPO);
    expect(r21.orfaos).toEqual([]);
    expect(reprovas(r21)).toEqual([]);
    /* R2-2: cruzamento perpendicular (90°) em borda levemente curva não acusa encostaNaBorda */
    const gLeve = chapaDeGrade({ nx: 6, nz: 6, passo: 80, altura: (x) => 0.1 * Math.sin(x / 100), espessura: 2, niveis: 1 });
    const r22 = dividir({ contorno: retangulo(280.3, 100.7, 460, 200) }, [['subdivisao', { origemId: 1, ...gLeve.passo }]], gLeve.TOPO);
    expect(r22.orfaos).toEqual([]);
    expect(reprovas(r22)).toEqual([]);
    /* R2-3: camada superior inclinada sobre camada inferior menor separa corretamente com sentido '+' */
    const gSup = chapaDeGrade({ nx: 6, nz: 6, passo: 80, altura: (x) => -16 + x * 0.04, espessura: 2, niveis: 1 });
    const gInf = chapaDeGrade({ prefixo: 'q', nx: 4, nz: 4, passo: 60, altura: () => -20, espessura: 2, niveis: 1 });
    const topoR23 = { ...gSup.TOPO, ...Object.fromEntries(Object.entries(gInf.TOPO).map(([k, p]) => [k, [p[0] + m(240), p[1], p[2] + m(80)]])) };
    const r23 = dividir({ chapa: { tudo: true }, sentido: '+', contorno: retangulo(50.3, 100.7, 350.4, 300.2) }, [['subdivisao', { origemId: 1, ...gSup.passo }], ['subdivisao', { origemId: 2, ...gInf.passo }]], topoR23);
    expect(r23.orfaos).toEqual([]);
    expect(reprovas(r23)).toEqual([]);
    /* R2-4: duas camadas abertas inclinadas a 65° com canto fora da chapa recusam sem sentido */
    const slope65 = Math.tan((65 * Math.PI) / 180);
    const g65a = chapaDeGrade({ nx: 6, nz: 6, passo: 80, altura: (x) => -x * slope65, espessura: 2, niveis: 1 });
    const g65b = chapaDeGrade({ prefixo: 'r', nx: 6, nz: 6, passo: 80, altura: (x) => -x * slope65 - 50, espessura: 2, niveis: 1 });
    const p65a = { ...g65a.passo }; delete p65a.espessura;
    const p65b = { ...g65b.passo }; delete p65b.espessura;
    const topoR24 = { ...g65a.TOPO, ...Object.fromEntries(Object.entries(g65b.TOPO).map(([k, p]) => [k, [p[0] + m(100), p[1], p[2]]])) };
    const r24 = dividir({ chapa: { tudo: true }, contorno: retangulo(40.3, 80.7, 520, 220.2) }, [['subdivisao', { origemId: 1, ...p65a }], ['subdivisao', { origemId: 2, ...p65b }]], topoR24);
    expect(r24.orfaos[0].ref).toBe('sentido');
    /* R2-5: parede de espessura em 2 faixas (vértice intermediário na borda) divide sem recusa */
    const V2 = new Map(); const F2 = new Map(); let fid2 = 0;
    const id2 = (i, j, c) => c * 25 + i * 5 + j; const mid2 = (j) => 100 + j;
    for (const c of [0, 1]) for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) V2.set(id2(i, j, c), [0.1 * i, c ? -0.002 : 0.002, 0.1 * j]);
    for (let j = 0; j < 5; j++) V2.set(mid2(j), [0.4, 0, 0.1 * j]);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      F2.set(fid2++, { vs: [id2(i, j, 0), id2(i, j + 1, 0), id2(i + 1, j + 1, 0), id2(i + 1, j, 0)] });
      F2.set(fid2++, { vs: [id2(i, j, 1), id2(i + 1, j, 1), id2(i + 1, j + 1, 1), id2(i, j + 1, 1)] });
    }
    for (let j = 0; j < 4; j++) {
      F2.set(fid2++, { vs: [id2(0, j, 0), id2(0, j, 1), id2(0, j + 1, 1), id2(0, j + 1, 0)] });
      F2.set(fid2++, { vs: [id2(4, j, 0), id2(4, j + 1, 0), mid2(j + 1), mid2(j)] });
      F2.set(fid2++, { vs: [mid2(j), mid2(j + 1), id2(4, j + 1, 1), id2(4, j, 1)] });
    }
    for (let i = 0; i < 4; i++) {
      F2.set(fid2++, { vs: i === 3 ? [id2(i, 0, 0), id2(i + 1, 0, 0), mid2(0), id2(i + 1, 0, 1), id2(i, 0, 1)] : [id2(i, 0, 0), id2(i + 1, 0, 0), id2(i + 1, 0, 1), id2(i, 0, 1)] });
      F2.set(fid2++, { vs: i === 3 ? [id2(i, 4, 0), id2(i, 4, 1), id2(i + 1, 4, 1), mid2(4), id2(i + 1, 4, 0)] : [id2(i, 4, 0), id2(i, 4, 1), id2(i + 1, 4, 1), id2(i + 1, 4, 0)] });
    }
    expect(dividirMalhaPorContorno({ V: V2, F: F2, ids: [...F2.keys()], quadro: quadroDaVista('y'), poligono: [[0.25, 0.15], [0.45, 0.15], [0.45, 0.25], [0.25, 0.25]] }).erro).toBeUndefined();
    /* R3-1: flanco inclinado a 75° com vinco vivo não entra em paredeDeBorda */
    const slope75 = Math.tan((75 * Math.PI) / 180);
    const gf75 = chapaDeGrade({ nx: 6, nz: 6, passo: 80, altura: (x) => (x <= 160 ? 0 : -(x - 160) * slope75), espessura: 2, niveis: 1 });
    const ptsVinco = Object.entries(gf75.TOPO).filter(([, p]) => Math.abs(p[0] - m(160)) < 1e-6).sort((a, b) => a[1][2] - b[1][2]).map(([k]) => k);
    const r31 = dividir({ contorno: retangulo(120, 80, 360, 320) }, [['subdivisao', { origemId: 1, ...gf75.passo, vincos: [{ nome: 'dobra', pontos: ptsVinco, nitidez: 'viva' }] }]], gf75.TOPO);
    expect(r31.orfaos).toEqual([]);
    expect(reprovas(r31)).toEqual([]);
  });
});

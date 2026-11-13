/* casos-medidos.test.mjs — os três casos do estudo do método (plano "forma exata antes da malha", fatia 3), cada um medido no
   método atual do núcleo e no protótipo pelas mesmas réguas: face degenerada e triângulo fino de `tools/modelar/reguas-de-malha/`,
   contagem de faces, faces de menos de 1e-9 m² (a medida da peça de prova da agulha), menor área, volume e estanqueidade.

   Os números fixados aqui são os do relatório `docs/modelar/banco-de-provas/forma-exata-2026-11-13/ESTUDO-DO-METODO.md`. Com a variável
   MEDIR=1 o teste imprime a tabela inteira: `MEDIR=1 npx vitest run procedural/nucleo/forma-exata/casos-medidos.test.mjs`. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { medirFaceDegenerada } from '../../../tools/modelar/reguas-de-malha/face-degenerada.mjs';
import { medirTrianguloFino, razaoDoTriangulo } from '../../../tools/modelar/reguas-de-malha/triangulo-fino.mjs';
import receitaDaChapaPorLacos from '../../../tools/fixtures/forma-exata/chapa-por-lacos.js';
import receitaDaAgulha from '../../../tools/fixtures/costuras-e-furos/agulha-na-faceta-do-tubo/receita.js';
import receitaDoFuro, { TABELA as FURO } from '../../../tools/fixtures/costuras-e-furos/furo-em-face-plana/receita.js';
import { chanfrarAresta, facesExatas, furoPassante, malhaDaForma, prismaExato, volumeExato } from './forma-exata.js';
import { juncaoDeTubos } from './juncao-de-tubos.js';
import { estanqueidade, menorAreaDeFace, volumeDaMalha } from './medir-malha.js';

const m = (mm) => mm / 1000;
const P = (u, v) => [m(u), m(v)];
const TABELA = [];

function medir(caso, metodo, malha, ms, extra = {}) {
  const neutro = { V: new Map(malha.V.map((p, i) => [i, p])), F: new Map(malha.F.map((vs, i) => [i, { id: i, vs, parte: 'p' }])), orfaos: [] };
  const fino = medirTrianguloFino(neutro);
  let pequenas = 0;
  for (const f of malha.F) if (menorAreaDeFace({ V: malha.V, F: [f] }) < 1e-9) pequenas++;
  /* a razão de todo triângulo da malha, com cada face cortada em leque: a régua só marca o fino de região plana, e esta conta não escolhe */
  let acimaDe10 = 0, piorDaMalha = 0;
  for (const f of malha.F) for (let k = 1; k + 1 < f.length; k++) { const r = razaoDoTriangulo(malha.V[f[0]], malha.V[f[k]], malha.V[f[k + 1]]); if (r > 10) acimaDe10++; piorDaMalha = Math.max(piorDaMalha, r); }
  const e = estanqueidade(malha);
  const linha = {
    caso, metodo, faces: malha.F.length, triangulos: fino.triangulos, degeneradas: medirFaceDegenerada(neutro).total, finos: fino.finos, piorRazaoDosFinos: Math.round(fino.pior), razaoAcimaDe10: acimaDe10, piorRazaoDaMalha: Math.round(piorDaMalha),
    abaixoDe1e9: pequenas, menorAreaMm2: Number((menorAreaDeFace(malha) * 1e6).toPrecision(3)), volumeMm3: Math.round(volumeDaMalha(malha) * 1e9 * 10) / 10,
    fechada: e.fechada, ms: Math.round(ms), ...extra,
  };
  TABELA.push(linha);
  return linha;
}

/* a receita pelo método atual: executa, confere que nenhum passo foi recusado e mede a malha (de uma parte só, se pedida) */
function atual(caso, metodo, receita, parte = null) {
  const t = performance.now();
  const { neutro } = executarReceita(receita);
  const ms = performance.now() - t;
  if (neutro.orfaos.length) throw new Error(neutro.orfaos.map((o) => o.motivo).join('; '));
  const faces = [...neutro.F.values()].filter((f) => !parte || f.parte === parte);
  const ids = new Map();
  const V = [];
  const F = faces.map((f) => f.vs.map((v) => { if (!ids.has(v)) { ids.set(v, V.length); V.push(neutro.V.get(v)); } return ids.get(v); }));
  return medir(caso, metodo, { V, F }, ms, { avisos: neutro.avisos.map((a) => a.ref).join(',') });
}
const recusaDoAtual = (passos) => executarReceita(receita(passos)).neutro.orfaos.map((o) => o.motivo).join('; ');
const receita = (PASSOS) => ({ meta: { nome: 'caso', desc: 'caso do estudo do método' }, TABELA: {}, PARAMS: {}, TOPO: {}, PASSOS });
function prototipo(caso, metodo, gerar) {
  const t = performance.now();
  const malha = gerar();
  return medir(caso, metodo, malha, performance.now() - t, { naoRefinados: malha.naoRefinados });
}

/* ---- caso A: a chapa de contorno curvo, 290 por 78 por 5 mm, com gume num trecho e quinas quebradas no outro ---- */
const CONTORNO = { inicio: P(0, 0), trechos: [{ reto: P(12, 0) }, { reto: P(14.5, 1.6) }, { arco: { por: P(40, 6.4), ate: P(70, 5.4) } }, { arcoTangente: P(200, -19) }, { arcoTangente: P(290, 1) }, { arco: { por: P(215, 31), ate: P(140, 56.4) } }, { reto: P(0, 34) }] };
function chapa() {
  let f = prismaExato({ contorno: CONTORNO, altura: m(5) });
  f = chanfrarAresta(f, { trechos: [2, 3, 4], lado: 'ambos', largura: m(16), altura: m(2.5) });
  return chanfrarAresta(f, { trechos: [0, 1, 5, 6], lado: 'ambos', largura: m(0.8), altura: m(0.8) });
}
const EXTRUSAO = ['extrusao', { origemId: 1, perfil: { contorno: CONTORNO }, altura: m(5), segmentosArco: 64 }];

describe('caso A: chapa de contorno curvo com gume e quinas quebradas', () => {
  it('método atual: a chapa por cinco laços empilhados (a forma de uma peça do acervo em 2026-11-13, guardada em fixture) fecha com 47 triângulos finos', () => {
    expect(atual('A', 'atual: chapa por 5 laços empilhados (fixture)', receitaDaChapaPorLacos)).toMatchObject({ faces: 628, degeneradas: 0, finos: 47, piorRazaoDosFinos: 866, fechada: true });
  });

  it('método atual: a extrusão do mesmo contorno sai sem borda, com 38 triângulos finos, e a operação de aresta recusa a tampa', () => {
    expect(atual('A', 'atual: extrusão do contorno, sem borda', receita([EXTRUSAO, ['parte', { nome: 'chapa', sel: { tudo: true } }]]))).toMatchObject({ faces: 110, degeneradas: 0, finos: 38, piorRazaoDosFinos: 27537, fechada: true });
    const recusa = recusaDoAtual([EXTRUSAO, ['arredondarAresta', { origemId: 2, de: { op: 'extrusao', id: 1, tampa: 'topo' }, aresta: 0, raio: m(0.8), paineis: 2, cadeia: true }]]);
    expect(recusa).toMatch(/de precisa resolver para EXATAMENTE uma face: .* resolveu para 22/);
  });

  it('protótipo: a chapa com as duas bordas fecha sem face degenerada nem triângulo fino, com o volume exato a 0,03%', () => {
    const forma = chapa();
    /* topo e fundo; dois chanfros em cada um dos três trechos do gume; parede e dois chanfros nos quatro de quina quebrada; a parede da base */
    expect(facesExatas(forma)).toHaveLength(2 + 3 * 2 + 4 * 3 + 1);
    const linha = prototipo('A', 'protótipo: prisma exato, 2 chanfros', () => malhaDaForma(forma, { passo: m(6), desvio: m(0.02) }));
    expect(linha).toMatchObject({ faces: 1190, degeneradas: 0, finos: 0, abaixoDe1e9: 0, fechada: true });
    const exato = volumeExato(forma) * 1e9;
    TABELA.push({ caso: 'A', metodo: 'protótipo: volume exato da forma', volumeMm3: Math.round(exato * 10) / 10 });
    expect(exato).toBeCloseTo(53149.7, 1);
    expect(Math.abs(linha.volumeMm3 - exato) / exato).toBeLessThan(3e-4);
  });
});

/* ---- caso B: um tubo que encontra outro, com arredondamento na costura ---- */
const secao = (r, h) => [[0, 0], [r, 0], [r, h], [0, h]];
const T_ATUAL = (Rr) => receita([
  ['lathe', { origemId: 1, lados: 144, eixo: 'x', em: [m(-200), 0, 0], perfil: secao(m(95), m(400)) }],
  ['lathe', { origemId: 2, lados: 144, eixo: 'z', perfil: secao(m(Rr), m(250)) }],
  ['unir', { origemId: 3, solidos: [{ origem: { op: 'lathe', id: 1 } }, { origem: { op: 'lathe', id: 2 } }] }],
  ['arredondarCostura', { origemId: 4, de: { op: 'unir', id: 3 }, raio: m(10), raioMinimo: m(3), afinarPontas: m(40) }],
  ['parte', { nome: 't', sel: { tudo: true } }],
]);
const T_EXATO = (Rr, tronco = 400) => juncaoDeTubos({ raioDoTronco: m(95), comprimentoDoTronco: m(tronco), raioDoRamo: m(Rr), alturaDoRamo: m(250), raio: m(10), lados: 144 });

describe('caso B: tubo que encontra tubo, com arredondamento na costura', () => {
  it('método atual, peça de prova da agulha: fecha, com 40 faces de menos de 1e-9 m² e a menor com 1e-11 m²', () => {
    expect(atual('B', 'atual: peça de prova da agulha (3 tubos rentes)', receitaDaAgulha)).toMatchObject({ faces: 6540, degeneradas: 0, abaixoDe1e9: 40, fechada: true });
  });

  it('protótipo, substituto da peça de prova da agulha (só o T 95/95 sobre um tronco de 190 mm, sem a carcaça nem o chanfro de 2 mm): NÃO COBRE, e recusa', () => {
    expect(() => T_EXATO(95, 190)).toThrow(/o arredondamento alcança 0.105 .* veio 0.19 \(o ramo na ponta do tronco fica fora do protótipo\)/);
  });

  it('T simples, ramo de 60 no meio de um tronco de 95: o atual deixa a menor face com 0,004 mm², o protótipo com 4 mm²', () => {
    expect(atual('B', 'atual: T 95/60, unir e arredondarCostura', T_ATUAL(60))).toMatchObject({ faces: 4326, degeneradas: 0, finos: 1352, abaixoDe1e9: 0, menorAreaMm2: 0.00415, fechada: true });
    expect(prototipo('B', 'protótipo: T 95/60, construção direta', () => T_EXATO(60))).toMatchObject({ faces: 8828, degeneradas: 0, finos: 0, abaixoDe1e9: 0, menorAreaMm2: 4.32, fechada: true });
  });

  it('T de raios iguais, onde o arredondamento some em dois pontos: o atual deixa 9 faces de menos de 1e-9 m², o protótipo nenhuma', () => {
    expect(atual('B', 'atual: T 95/95, unir e arredondarCostura', T_ATUAL(95))).toMatchObject({ faces: 2874, degeneradas: 0, abaixoDe1e9: 9, fechada: true });
    expect(prototipo('B', 'protótipo: T 95/95, construção direta', () => T_EXATO(95))).toMatchObject({ faces: 11672, degeneradas: 0, finos: 0, abaixoDe1e9: 0, menorAreaMm2: 0.475, fechada: true });
  });
});

/* ---- caso C: o furo passante em face plana, com a boca arredondada ou chanfrada ---- */
const E = m(FURO.espessura);
const DISCO = ['cilindro', { origemId: 1, raio: m(FURO.raio), altura: E, lados: FURO.lados, eixo: 'x' }];
const FUROS = ['furo', {
  origemId: 2, de: { op: 'cilindro', id: 1, tampa: 'topo' }, saida: { op: 'cilindro', id: 1, tampa: 'fundo' }, lados: FURO.ladosDoFuro,
  centros: [{ nome: 'central', centro: [E, 0, 0], raio: m(FURO.raioDoFuroCentral) }, { nome: 'circulo', pivo: [E, 0, 0], distancia: m(FURO.raioDoCirculoDeFuracao), total: FURO.furosEmCirculo, volta: 360, raio: m(FURO.raioDoFuro) }],
}];
const boca = (origemId, de) => ['arredondarAresta', { origemId, de, aresta: 0, raio: m(1), paineis: 3, cadeia: true }];
const BOCAS = [boca(10, { op: 'furo', id: 2, grupo: 'central', parede: 0 }), ...Array.from({ length: FURO.furosEmCirculo }, (_, k) => boca(11 + k, { op: 'furo', id: 2, grupo: 'circulo', furo: k, parede: 0 }))];
const PARTE = ['parte', { nome: 'disco', sel: { tudo: true } }];
function disco(bocaDoFuro) {
  let f = prismaExato({ contorno: { circulo: { centro: [0, 0], raio: m(FURO.raio), lados: FURO.lados } }, altura: E });
  f = furoPassante(f, { centro: [0, 0], raio: m(FURO.raioDoFuroCentral), lados: FURO.ladosDoFuro, boca: bocaDoFuro });
  for (let k = 0; k < FURO.furosEmCirculo; k++) {
    const a = (2 * Math.PI * k) / FURO.furosEmCirculo;
    f = furoPassante(f, { centro: [m(FURO.raioDoCirculoDeFuracao) * Math.cos(a), m(FURO.raioDoCirculoDeFuracao) * Math.sin(a)], raio: m(FURO.raioDoFuro), lados: FURO.ladosDoFuro, boca: bocaDoFuro });
  }
  return f;
}
const malhaDoDisco = (bocaDoFuro) => malhaDaForma(disco(bocaDoFuro), { passo: m(10), desvio: m(0.02) });

describe('caso C: furo passante em face plana, com a boca tratada', () => {
  it('método atual: a peça de prova (furos cegos) e os mesmos nove furos passantes saem sem face degenerada', () => {
    expect(atual('C', 'atual: peça de prova, 9 furos cegos', receitaDoFuro)).toMatchObject({ faces: 1032, degeneradas: 0, finos: 52, fechada: true });
    expect(atual('C', 'atual: 9 furos passantes, boca viva', receita([DISCO, FUROS, PARTE]))).toMatchObject({ faces: 1738, degeneradas: 0, finos: 0, fechada: true });
  });

  it('método atual: as nove bocas arredondadas pedem nove passos e saem limpas; o chanfro da boca é recusado', () => {
    expect(atual('C', 'atual: 9 passantes, boca de raio 1 (9 passos)', receita([DISCO, FUROS, ...BOCAS, PARTE]))).toMatchObject({ faces: 2224, degeneradas: 0, finos: 0, abaixoDe1e9: 0, fechada: true });
    expect(recusaDoAtual([DISCO, FUROS, ['filete', { origemId: 3, de: { op: 'furo', id: 2, grupo: 'central', parede: 0 }, aresta: 0, raio: m(1) }]])).toMatch(/o raio não cabe: a face \d+ ficaria côncava/);
  });

  it('protótipo: os nove furos passantes com a boca viva, arredondada e chanfrada fecham sem face degenerada nem triângulo fino', () => {
    const viva = prototipo('C', 'protótipo: 9 passantes, boca viva', () => malhaDoDisco(null));
    expect(viva).toMatchObject({ faces: 2582, degeneradas: 0, finos: 0, abaixoDe1e9: 0, fechada: true });
    expect(prototipo('C', 'protótipo: 9 passantes, boca de raio 1', () => malhaDoDisco({ lado: 'topo', raio: m(1), paineis: 3 }))).toMatchObject({ faces: 3006, degeneradas: 0, finos: 0, abaixoDe1e9: 0, fechada: true });
    expect(prototipo('C', 'protótipo: 9 passantes, boca chanfrada de 1', () => malhaDoDisco({ lado: 'topo', chanfro: { largura: m(1), altura: m(1) } }))).toMatchObject({ faces: 2682, degeneradas: 0, finos: 0, abaixoDe1e9: 0, fechada: true });
    /* com os mesmos lados, o volume da boca viva é o do método atual até a nona casa */
    const doAtual = TABELA.find((l) => l.metodo === 'atual: 9 furos passantes, boca viva');
    expect(viva.volumeMm3).toBeCloseTo(doAtual.volumeMm3, 1);
    TABELA.push({ caso: 'C', metodo: 'protótipo: volume exato, boca de raio 1', volumeMm3: Math.round(volumeExato(disco({ lado: 'topo', raio: m(1) })) * 1e10) / 10 });
  });

  it('imprime a tabela quando MEDIR=1', () => {
    if (process.env.MEDIR) console.log(TABELA.map((l) => JSON.stringify(l)).join('\n'));
    expect(TABELA.length).toBe(16);
  });
});

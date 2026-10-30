/* friso-largura-variavel.test.mjs — o friso com a largura (e o ângulo da aba) como função da posição ao longo da linha,
   por pontos nomeados, e o canto vivo em meia-esquadria (fatia 11 do plano de ajustes no núcleo dos veículos).

   O defeito que a fatia fecha: uma moldura que contorna um vão com largura diferente em cima e nos lados saía em faixas
   que não se encontravam, com entalhe nos cantos, ou abria furos e faces côncavas quando se tentava fechá-la. Com
   `variacao`, a largura muda em degrau num canto vivo, as duas faixas se cortam num mesmo plano (o que passa pelo ponto da
   linha, pela normal e pelo encontro das duas bordas de fora) e a junta é um anel só, soldado às duas.

   A prova é o vão de `fixtures/friso-prova.js`: a volta de cantos vivos de 90 graus ao redor do vão, com a travessa de
   14 mm e o montante de 7 mm. A moldura sai fechada (nenhuma aresta de uma face só), em um corpo, com volume positivo, sem
   face côncava e sem reprova da topologia, e o friso sem a opção nova sai bit a bit igual ao de antes da fatia (os
   hashes abaixo foram tirados do passo antes da mudança). O contato com a chapa, que leva alguns segundos, fica em
   `friso-contato.test.mjs`. */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ErroDoFriso, GIRO_MINIMO_DO_DEGRAU, posicoesDaLinha, varrerPerfil } from './friso.js';
import { neutroCanonico, nucleo } from './entrada.js';
import { cruzamentos, volume } from './fixtures/medidas-de-malha.js';
import * as prova from './fixtures/friso-prova.js';
import * as abaProva from './fixtures/aba-prova.js';
import { analisarTopologia } from './topologia.js';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dist = (a, b) => Math.hypot(...sub(a, b));
const up = [0, 1, 0];
const grito = (fn) => { try { fn(); } catch (e) { return e; } throw new Error('não gritou'); };
const hash = (neutro) => createHash('sha256').update(JSON.stringify(neutroCanonico(neutro))).digest('hex');

/* Os hashes do neutro canônico dos três passos de prova do friso, tirados antes da fatia 11. */
const HASH_DE_ANTES = {
  friso: '71f01fdb068116e8e1e33f95b55d9b98df740c2026d1a7e00c0fdec8f3a321ff',
  aba: '71bbb22795977bed06dc9d4bf702f25f85dbe5c43b9dc57740747188849cab94',
  pele: '5251ac89de3b5e9e39dfda724b10538e1a7b76f31935aa134f72c0c311005b03',
};

/* As faces e os vértices de uma parte do neutro, por índice local, na ordem dos ids. */
function malhaDaParte(neutro, parte) {
  const faces = [...neutro.F.values()].filter((f) => f.parte === parte);
  const ids = [...new Set(faces.flatMap((f) => f.vs))].sort((a, b) => a - b);
  const indice = new Map(ids.map((id, k) => [id, k]));
  return { ids, vertices: ids.map((id) => neutro.V.get(id)), faces: faces.map((f) => f.vs.map((v) => indice.get(v))) };
}

/* As faces côncavas da malha: um canto da face em que o giro vai contra a normal de Newell dela. A face torta (que sai
   do plano por décimos de milímetro) é medida projetada nesse plano, de modo que o desvio do plano não conta como concavidade. */
function facesConcavas(malha) {
  const achadas = [];
  malha.faces.forEach((f, k) => {
    if (f.length < 4) return;
    const P = f.map((v) => malha.vertices[v]);
    const n = [0, 0, 0];
    P.forEach((a, i) => { const b = P[(i + 1) % P.length]; n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); });
    const ln = Math.hypot(...n);
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length], c = P[(i + 2) % P.length];
      const ab = sub(b, a), bc = sub(c, b);
      if (dot(cruz(ab, bc), n) / ln < -1e-9 * Math.hypot(...ab) * Math.hypot(...bc)) { achadas.push(k); break; }
    }
  });
  return achadas;
}

describe('varrerPerfil com degrau de largura num canto vivo', () => {
  /* a volta quadrada de 0,4 m no plano xz, com o perfil retangular de 1 de largura (a escala em u é a largura em metro) */
  const L = 0.4; const wx = 0.012; const wz = 0.006; const esp = 0.01;
  const quadrado = [[0, 0, 0], [L, 0, 0], [L, 0, L], [0, 0, L]];
  const perfil = [[-0.5, -0.002], [0.5, -0.002], [0.5, 0.008], [-0.5, 0.008]];
  /* os trechos 0 e 2 correm ao longo de x (largura wx), os trechos 1 e 3 ao longo de z (largura wz) */
  const variacao = (s, k, lado) => {
    const trecho = k == null ? Math.min(3, Math.floor((s + 1e-12) / L)) : (lado === 'antes' ? (k + 3) % 4 : k);
    return { escalaU: trecho % 2 === 0 ? wx : wz, perfil: null };
  };
  const volta = () => varrerPerfil({ pontos: quadrado, normais: quadrado.map(() => up), perfil, fechada: true, variacao });

  it('sai fechada, de um corpo, e o volume é o da região entre os dois retângulos de fora e de dentro', () => {
    const r = volta();
    /* um anel de quatro pontos por canto, soldado às duas faixas: 16 vértices e 16 faces, sem tampa */
    expect(r.vertices).toHaveLength(16);
    expect(r.faces).toHaveLength(16);
    const top = analisarTopologia(r, { triangulacao: true });
    expect(top.veredito).toBe('aprova');
    expect(top.achados).toEqual([]);
    expect(top.resumo.componentes).toBe(1);
    expect(top.resumo.bordas).toBe(0);
    expect(facesConcavas(r)).toEqual([]);
    const esperado = esp * ((L + wz) * (L + wx) - (L - wz) * (L - wx));
    expect(Math.abs(volume(r.vertices, r.faces) / esperado - 1)).toBeLessThan(1e-12);
    expect(cruzamentos(r.vertices, r.faces)).toEqual([]);
  });

  it('cada canto é a meia-esquadria de duas faixas de larguras diferentes: as quatro pontas do anel ficam a metade de cada largura dos dois eixos', () => {
    const r = volta();
    quadrado.forEach(([cx, , cz], j) => {
      const anel = r.vertices.slice(4 * j, 4 * j + 4);
      /* o anel de cada canto tem as quatro pontas do perfil, duas de cada lado, e todas a wz/2 do eixo do montante e a wx/2 do eixo da travessa */
      for (const p of anel) {
        expect(Math.abs(Math.abs(p[0] - cx) - wz / 2)).toBeLessThan(1e-12);
        expect(Math.abs(Math.abs(p[2] - cz) - wx / 2)).toBeLessThan(1e-12);
      }
    });
  });

  it('com a mesma largura dos dois lados a junta é a esquadria bissetora de sempre, bit a bit', () => {
    const estreito = perfil.map(([u, v]) => [u * 0.01, v]);
    const sem = varrerPerfil({ pontos: quadrado, normais: quadrado.map(() => up), perfil: estreito, fechada: true });
    const com = varrerPerfil({ pontos: quadrado, normais: quadrado.map(() => up), perfil: estreito, fechada: true, variacao: () => ({ escalaU: 1, perfil: null }) });
    expect(com.vertices).toEqual(sem.vertices);
    expect(com.faces).toEqual(sem.faces);
  });

  it('a largura que muda por rampa, sem degrau, também sai fechada e sem face côncava', () => {
    const { acumulado } = posicoesDaLinha(quadrado, true);
    const rampa = (s) => ({ escalaU: 0.006 + (0.012 - 0.006) * Math.abs(Math.sin((Math.PI * s) / acumulado[4])), perfil: null });
    const r = varrerPerfil({ pontos: quadrado, normais: quadrado.map(() => up), perfil, fechada: true, trechoMaximo: 0.05, variacao: rampa });
    expect(analisarTopologia(r, { triangulacao: true }).achados).toEqual([]);
    expect(facesConcavas(r)).toEqual([]);
    expect(volume(r.vertices, r.faces)).toBeGreaterThan(0);
  });

  it('o degrau num ponto que não é canto vivo grita com o ponto, e o limite é o giro de 10 graus', () => {
    const reta = [[0, 0, 0], [0.2, 0, 0], [0.4, 0, 0]];
    const degrau = (s, k, lado) => ({ escalaU: k === 1 && lado === 'depois' ? 0.006 : 0.012, perfil: null });
    const e = grito(() => varrerPerfil({ pontos: reta, normais: reta.map(() => up), perfil, variacao: degrau }));
    expect(e).toBeInstanceOf(ErroDoFriso);
    expect(e.indice).toBe(1);
    expect(e.motivo).toMatch(/^a largura muda em degrau neste ponto, e a linha segue reta: o degrau vale num canto vivo, a partir de 10 graus de giro/);
    /* 8 graus de giro ainda não é canto vivo; 12 é */
    const giro = (graus) => { const t = (graus * Math.PI) / 180; return [[0, 0, 0], [0.2, 0, 0], [0.2 + 0.2 * Math.cos(t), 0, 0.2 * Math.sin(t)]]; };
    const comGiro = (graus) => () => varrerPerfil({ pontos: giro(graus), normais: giro(graus).map(() => up), perfil, variacao: degrau });
    expect(grito(comGiro(8)).motivo).toMatch(/só vira 8 graus/);
    expect(comGiro(12)).not.toThrow();
    expect(GIRO_MINIMO_DO_DEGRAU).toBe(10);
  });

  it('o perfil que muda em degrau, em vez da largura, grita', () => {
    const outro = [[-0.5, -0.002], [0.5, -0.002], [0.5, 0.009], [-0.5, 0.009]];
    const e = grito(() => varrerPerfil({ pontos: quadrado, normais: quadrado.map(() => up), perfil, fechada: true, variacao: (s, k, lado) => ({ escalaU: 1, perfil: k === 1 && lado === 'depois' ? outro : perfil }) }));
    expect(e.motivo).toMatch(/^o perfil muda em degrau neste ponto/);
    expect(e.indice).toBe(1);
  });
});

describe('a moldura de largura variável em volta do vão', () => {
  const P = prova.pontos();
  const neutro = nucleo(prova.passosDaMoldura(), P);
  const moldura = malhaDaParte(neutro, 'moldura');

  it('sai sem grito, em um anel de quatro pontos por estação, e as estações da travessa e do montante têm a largura declarada', () => {
    expect(neutro.orfaos).toEqual([]);
    /* 16 trechos de 4 estações em volta do vão: 64 estações de 4 pontos, sem ponta nem tampa */
    expect(moldura.vertices).toHaveLength(256);
    expect(moldura.faces).toHaveLength(256);
    const largura = (j) => dist(moldura.vertices[4 * j + 1], moldura.vertices[4 * j]);
    /* os cantos são as estações 0, 16, 32 e 48; nas outras o par de pontos de baixo do perfil está a uma largura dele */
    const cantos = [0, 16, 32, 48];
    const travessas = []; const montantes = [];
    for (let j = 0; j < 64; j++) {
      if (cantos.includes(j)) continue;
      (Math.floor(j / 16) % 2 === 0 ? travessas : montantes).push(largura(j));
    }
    expect(travessas).toHaveLength(30);
    expect(montantes).toHaveLength(30);
    /* a linha sobre a chapa curva vira um pouco a cada vértice, e a esquadria de cada um estica o anel em menos de 1 micrômetro */
    for (const w of travessas) expect(Math.abs(w - prova.MOLDURA.travessa)).toBeLessThan(1e-6);
    for (const w of montantes) expect(Math.abs(w - prova.MOLDURA.montante)).toBeLessThan(1e-6);
  });

  it('fecha: nenhuma aresta de uma face só, um corpo, orientação coerente, sem reprova da topologia nem da conferência de malha', () => {
    const topologia = analisarTopologia(moldura);
    expect(topologia.achados).toEqual([]);
    expect(topologia.resumo.componentes).toBe(1);
    expect(topologia.resumo.bordas).toBe(0);
    expect(topologia.resumo.arestas).toBe(512);
    /* a conferência de malha pede também a triangulação sem triângulo de área nula; o friso sobre uma chapa curva só
       acusa face torta (alerta), como o tubo e a nervura da chapa de prova, e nunca reprova */
    const conferencia = analisarTopologia(moldura, { triangulacao: true });
    expect(conferencia.resumo.reprovas).toBe(0);
    expect(conferencia.veredito).not.toBe('reprova');
    expect([...new Set(conferencia.achados.map((a) => a.codigo))]).toEqual(['face-torta']);
  });

  it('é sólido: o volume é positivo e fica a 2% da soma largura × espessura × comprimento de cada trecho, e as faces não são côncavas', () => {
    expect(facesConcavas(moldura)).toEqual([]);
    const V = volume(moldura.vertices, moldura.faces);
    expect(V).toBeGreaterThan(0);
    /* o eixo da moldura: o centro de cada anel de quatro pontos no meio do perfil, sem os cantos */
    let esperado = 0;
    const eixo = (j) => { const a = moldura.vertices[4 * j], b = moldura.vertices[4 * j + 1]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]; };
    const cantos = [0, 16, 32, 48];
    for (let t = 0; t < 4; t++) {
      const w = t % 2 === 0 ? prova.MOLDURA.travessa : prova.MOLDURA.montante;
      let comprimento = 0;
      for (let j = 16 * t; j < 16 * t + 16; j++) comprimento += dist(eixo(j), eixo((j + 1) % 64));
      esperado += w * prova.MOLDURA.profundidade * comprimento;
    }
    expect(cantos).toHaveLength(4);
    expect(Math.abs(V / esperado - 1)).toBeLessThan(0.02);
  });

  it('o degrau nos quatro cantos fica soldado: cada anel de canto é compartilhado pelas faces das duas faixas, e a emenda não deixa fresta', () => {
    for (const j of [0, 16, 32, 48]) {
      const anel = [4 * j, 4 * j + 1, 4 * j + 2, 4 * j + 3];
      const antes = moldura.faces.filter((f) => f.some((v) => anel.includes(v)) && f.some((v) => v >= 4 * ((j + 63) % 64) && v < 4 * ((j + 63) % 64) + 4));
      const depois = moldura.faces.filter((f) => f.some((v) => anel.includes(v)) && f.some((v) => v >= 4 * (j + 1) && v < 4 * (j + 1) + 4));
      /* as quatro faces laterais da faixa que chega e as quatro da que sai tocam o mesmo anel */
      expect(antes).toHaveLength(4);
      expect(depois).toHaveLength(4);
    }
  });

  it('a borda de cada faixa chega ao canto em linha reta e sai dele em linha reta: o anel do canto cai onde as duas bordas se encontram', () => {
    const graus = (a, b) => (Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (Math.hypot(...a) * Math.hypot(...b))))) * 180) / Math.PI;
    /* o desvio de cada borda ao entrar e ao sair de cada canto, em graus, para as quatro bordas do perfil (os pontos 0 a 3 do anel) */
    const desvios = (m) => {
      const ponto = (j, k) => m.vertices[4 * (((j % 64) + 64) % 64) + k];
      return [0, 16, 32, 48].flatMap((c) => [0, 1, 2, 3].flatMap((k) => [
        graus(sub(ponto(c - 1, k), ponto(c - 2, k)), sub(ponto(c, k), ponto(c - 1, k))),
        graus(sub(ponto(c + 1, k), ponto(c, k)), sub(ponto(c + 2, k), ponto(c + 1, k))),
      ]));
    };
    const igual = malhaDaParte(nucleo(prova.passosDaMoldura({ extra: { variacao: prova.variacaoDaMoldura({ travessa: 0.01, montante: 0.01 }) } }), P), 'moldura');
    const comDegrau = desvios(moldura); const deReferencia = desvios(igual);
    /* a moldura de largura igual (a esquadria bissetora de sempre) já desvia uns 2 graus, da curvatura da chapa e do vértice
       da linha, e a de larguras diferentes desvia o mesmo, a 0,3 grau; o anel do canto fora do lugar desviaria uns 3,5 graus a mais */
    expect(Math.max(...deReferencia)).toBeLessThan(2.5);
    comDegrau.forEach((x, k) => expect(Math.abs(x - deReferencia[k])).toBeLessThan(0.3));
  });

  it('entra na chapa sem atravessar a face de dentro, e acompanha a linha pela normal', () => {
    const chapa = nucleo([prova.passos()[0], ['parte', { nome: 'interna', sel: { origem: { op: 'subdivisao', id: 1, parte: 'interna' } } }]], P);
    const interna = malhaDaParte(chapa, 'interna');
    const juntos = { vertices: [...moldura.vertices, ...interna.vertices], faces: [...moldura.faces, ...interna.faces.map((f) => f.map((k) => k + moldura.vertices.length))] };
    expect(cruzamentos(juntos.vertices, juntos.faces, 0.01)).toEqual([]);
    expect(cruzamentos(moldura.vertices, moldura.faces, 0.01)).toEqual([]);
  });

  it('é bit a bit: duas execuções dão o mesmo neutro', () => {
    expect(hash(nucleo(prova.passosDaMoldura(), P))).toBe(hash(neutro));
  });

  it('a mesma moldura com a largura igual nos dois lados é a de sempre: o degrau some e a largura é uma só', () => {
    const igual = nucleo(prova.passosDaMoldura({ extra: { variacao: prova.variacaoDaMoldura({ travessa: 0.01, montante: 0.01 }) } }), P);
    const sem = nucleo(prova.passosDaMoldura({ extra: { variacao: undefined } }), P);
    expect(igual.orfaos).toEqual([]);
    const a = malhaDaParte(igual, 'moldura'); const b = malhaDaParte(sem, 'moldura');
    expect(a.faces).toEqual(b.faces);
    a.vertices.forEach((p, k) => expect(dist(p, b.vertices[k])).toBeLessThan(1e-12));
  });
});

describe('sem a opção nova o friso sai bit a bit igual ao de antes', () => {
  it('a chapa de prova com os três frisos, a aba sólida e a aba em pele têm o neutro de antes da fatia', () => {
    expect(hash(nucleo(prova.passos(), prova.pontos()))).toBe(HASH_DE_ANTES.friso);
    const sólida = abaProva.passos();
    expect(hash(nucleo(sólida.passos, sólida.pontos))).toBe(HASH_DE_ANTES.aba);
    const pele = abaProva.passos({ espessura: null });
    expect(hash(nucleo(pele.passos, pele.pontos))).toBe(HASH_DE_ANTES.pele);
  });
});

describe('a aba com largura e ângulo que mudam por rampa ao longo da borda do vão', () => {
  const montagem = abaProva.passos();
  const borda = montagem.gaiola.bordaDoVao('janela');
  /* o ponto 1 é o meio de um lado do vão, e o 5 o do lado oposto; a perna vai de 12 a 24 mm e o ângulo de 90 a 60 graus */
  const variacao = {
    largura: [{ ponto: borda[1], valor: 0.012 }, { ponto: borda[5], valor: 0.024 }],
    angulo: [{ ponto: borda[1], valor: 90 }, { ponto: borda[5], valor: 60 }],
  };
  const roda = (espessura, extra = { variacao }) => {
    const p = abaProva.passos({ espessura, extra });
    return nucleo(p.passos, p.pontos);
  };

  it('sai fechada e sólida, e a perna e o ângulo valem o declarado nos dois pontos', () => {
    const n = roda(abaProva.ESPESSURA);
    expect(n.orfaos).toEqual([]);
    const aba = malhaDaParte(n, 'aba');
    const topologia = analisarTopologia(aba);
    expect(topologia.achados).toEqual([]);
    expect(topologia.resumo.componentes).toBe(1);
    expect(facesConcavas(aba)).toEqual([]);
    /* 32 estações de 12 pontos (o arco do maior ângulo, 90 graus, tem 4 segmentos), a do ponto 1 é a 4 e a do ponto 5 a 20 */
    expect(aba.vertices).toHaveLength(32 * 12);
    const perna = (j) => dist(aba.vertices[12 * j + 5], aba.vertices[12 * j + 4]);
    const angulo = (j) => {
      const normal = sub(aba.vertices[12 * j], aba.vertices[12 * j + 11]);
      const n_ = normal.map((c) => c / Math.hypot(...normal));
      const l = sub(aba.vertices[12 * j + 5], aba.vertices[12 * j + 4]);
      return (Math.asin(Math.max(-1, Math.min(1, -dot(l, n_) / Math.hypot(...l)))) * 180) / Math.PI;
    };
    expect(perna(4)).toBeCloseTo(0.012, 4);
    expect(perna(20)).toBeCloseTo(0.024, 4);
    expect(angulo(4)).toBeCloseTo(90, 0);
    expect(angulo(20)).toBeCloseTo(60, 0);
    /* entre os dois pontos a perna cresce sem voltar, fora das estações dos cantos do vão (8 e 16), onde a esquadria estica o anel */
    for (const j of [4, 5, 6, 7, 9, 10, 11, 12, 13, 14]) expect(perna(j + 1)).toBeGreaterThan(perna(j));
  });

  it('na chapa sem espessura a aba em pele também varia, com as mesmas faces', () => {
    const n = roda(null);
    expect(n.orfaos).toEqual([]);
    const constante = roda(null, {});
    expect(malhaDaParte(n, 'aba').faces).toEqual(malhaDaParte(constante, 'aba').faces);
    expect(analisarTopologia(malhaDaParte(n, 'aba')).achados.map((a) => a.codigo)).toEqual(analisarTopologia(malhaDaParte(constante, 'aba')).achados.map((a) => a.codigo));
  });

  it('o degrau na aba grita com o nome, porque a perna e a dobra de dois trechos não se soldam', () => {
    const motivo = roda(abaProva.ESPESSURA, { variacao: { largura: [{ ponto: borda[1], antes: 0.012, depois: 0.024 }] } }).orfaos[0].motivo;
    expect(motivo).toMatch(/^variacao\.largura no ponto '.*' muda em degrau, e na aba a largura e o ângulo mudam por rampa/);
  });
});

describe('os gritos da variacao dizem o campo e o ponto', () => {
  const P = prova.pontos();
  const motivo = (variacao, extra = {}) => nucleo(prova.passosDaMoldura({ extra: { variacao, ...extra } }), P).orfaos.map((o) => o.motivo)[0];
  const a = prova.nome(2, 2); const b = prova.nome(6, 2);

  it('recusa o campo, o ponto e o valor que não servem', () => {
    expect(motivo(5)).toMatch(/^variacao precisa ser as medidas por ponto, como variacao: \{ largura:/);
    expect(motivo({ cor: [] })).toBe("a variacao tem campo desconhecido 'cor'; os campos são largura e angulo");
    expect(motivo({})).toMatch(/^variacao precisa de largura ou de angulo/);
    expect(motivo({ angulo: [{ ponto: a, valor: 90 }] })).toBe('variacao.angulo só vale com aba: o ângulo é o da dobra da aba, e o perfil desenhado não tem ângulo');
    expect(motivo({ largura: [] })).toMatch(/^variacao\.largura precisa ser a lista dos pontos/);
    expect(motivo({ largura: [{ ponto: 'p9_9', valor: 0.01 }] })).toBe("variacao.largura cita o ponto 'p9_9', que não está na linha 'molduraDoVao'");
    expect(motivo({ largura: [{ ponto: a, valor: 0.01 }, { ponto: a, valor: 0.02 }] })).toBe("variacao.largura cita o ponto 'p2_2' duas vezes");
    expect(motivo({ largura: [{ ponto: a, valor: 0.01, antes: 0.02, depois: 0.03 }] })).toMatch(/tem valor e também antes e depois/);
    expect(motivo({ largura: [{ ponto: a, antes: 0.01 }] })).toMatch(/precisa de valor, ou de antes e depois juntos/);
    expect(motivo({ largura: [{ ponto: a, valor: 0 }] })).toBe("variacao.largura no ponto 'p2_2' precisa ser maior que zero, e veio 0");
    expect(motivo({ largura: [{ ponto: a, valor: 0.01, cor: 1 }] })).toMatch(/tem campo desconhecido 'cor'/);
  });

  it('recusa o degrau fora de um canto vivo e na ponta da linha aberta, com o ponto', () => {
    /* o ponto do meio de uma travessa: a linha segue reta por ele */
    const meio = prova.nome(4, 2);
    expect(motivo({ largura: [{ ponto: meio, antes: 0.01, depois: 0.02 }] })).toMatch(/^na linha 'molduraDoVao', perto de 'p4_2': a largura muda em degrau neste ponto, e a linha (segue reta|só vira [\d.]+ graus): o degrau vale num canto vivo, a partir de 10 graus de giro/);
    const aberta = nucleo(prova.passosDaMoldura({ extra: { linha: { nome: 'trecho', pontos: [a, b, prova.nome(6, 3)] }, variacao: { largura: [{ ponto: a, antes: 0.01, depois: 0.02 }] } } }), P).orfaos[0].motivo;
    expect(aberta).toMatch(/^variacao\.largura no ponto 'p2_2' muda em degrau na ponta da linha aberta, que não tem canto: ponha valor/);
  });
});

describe('a variacao na simetria em x', () => {
  /* a chapa curva de 3 × 3 faces na metade x >= 0, espelhada, da prova do friso na simetria */
  const pontos = {};
  const vertices = []; const faces = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const x = 0.1 * i, z = 0.1 * j; pontos[`c${i}_${j}`] = [x, 0.2 - x * x - (z - 0.15) ** 2, z]; vertices.push(`c${i}_${j}`); }
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) faces.push([`c${i}_${j}`, `c${i}_${j + 1}`, `c${i + 1}_${j + 1}`, `c${i + 1}_${j}`]);
  const chapa = ['subdivisao', { origemId: 1, vertices, faces, simetria: 'x', medidas: [...vertices], espessura: 0.002, niveis: 2 }];
  const friso = (pts, variacao) => ['friso', { origemId: 2, superficie: { op: 'subdivisao', id: 1 }, linha: { nome: 'l', pontos: pts }, perfil: { retangulo: { largura: 0.01, profundidade: 0.004, centro: [0, 0.001] } }, variacao }];
  const so = (passos) => { const n = nucleo([...passos, ['parte', { nome: 'f', sel: { origem: { op: 'friso', id: 2 } } }]], pontos); expect(n.orfaos).toEqual([]); return malhaDaParte(n, 'f'); };
  const espelhado = (m) => m.vertices.every(([x, y, z]) => m.vertices.some((q) => Math.hypot(q[0] + x, q[1] - y, q[2] - z) < 1e-9));

  it('a volta que toca o plano nas duas pontas, com o degrau dos cantos, sai fechada e simétrica', () => {
    /* a volta c0_0, c1_0, c1_1, c1_2, c0_2 e a imagem dela: os cantos c1_0 e c1_2 e os espelhados; a faixa de baixo é larga e o montante é estreito */
    const m = so([chapa, friso(['c0_0', 'c1_0', 'c1_1', 'c1_2', 'c0_2'], { largura: [{ ponto: 'c1_0', antes: 0.012, depois: 0.006 }, { ponto: 'c1_2', antes: 0.006, depois: 0.012 }] })]);
    const topologia = analisarTopologia(m);
    expect(topologia.achados).toEqual([]);
    expect(topologia.resumo.componentes).toBe(1);
    expect(facesConcavas(m)).toEqual([]);
    expect(espelhado(m)).toBe(true);
    expect(volume(m.vertices, m.faces)).toBeGreaterThan(0);
  });

  it('a linha que não toca o plano ganha a cópia espelhada com a mesma variação, e o degrau na ponta da linha é recusado', () => {
    const m = so([chapa, friso(['c1_0', 'c2_0', 'c2_1', 'c2_2'], { largura: [{ ponto: 'c2_0', antes: 0.012, depois: 0.006 }] })]);
    expect(analisarTopologia(m).achados.map((a) => a.codigo)).toEqual(['ilhas']);
    expect(espelhado(m)).toBe(true);
    const n = nucleo([chapa, friso(['c0_1', 'c1_1', 'c2_1'], { largura: [{ ponto: 'c0_1', antes: 0.012, depois: 0.006 }] }), ['parte', { nome: 'f', sel: { origem: { op: 'friso', id: 2 } } }]], pontos);
    expect(n.orfaos[0].motivo).toMatch(/muda em degrau na ponta da linha aberta/);
  });
});

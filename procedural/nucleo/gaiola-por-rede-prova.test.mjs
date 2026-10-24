/* gaiola-por-rede-prova.test.mjs — o gate da fatia 2 do plano da carroceria por rede de curvas: a chapa lateral de 1000 × 600 mm
 *
 * A forma é desenhada por código (`fixtures/gaiola-por-rede-prova.js`), na escala real: uma chapa lateral de 1000 por 600 mm, abaulada
 * e com uma dobra viva na cintura, com a janela em gota (230 mm na parte larga, ponta de raio 20 mm), o arco de roda de raio 140 mm e a
 * coluna inclinada, declarada por 19 curvas e 10 retalhos, dois deles de cinco lados. A superfície passa pelas curvas a menos de 0,5 mm,
 * sai só de quadriláteros, a borda da janela é um laço de arestas da malha, a tangente não quebra nas curvas compartilhadas que não são
 * vinco e a moldura de 10 mm como `friso` sobre a curva da janela fecha sólida. A leitura de ondulação da mesma chapa, sem falha fora de
 * `junto` e sem face virada, está em `tools/mecanifica/ondulacao-rede.test.mjs`, e o contato da moldura com a chapa, medido em
 * `gaiola-por-rede-contato.test.mjs`. Nenhum número vem de referência externa. */
import { describe, expect, it } from 'vitest';
import { gaiolaPorRede } from './gaiola-por-rede.js';
import { extraordinarios } from './gaiola-aneis.js';
import { cadeiaRefinada } from './friso.js';
import { enderecosPorIndice, gaiolaDoPasso } from './operacoes/subdivisao.js';
import { subdividirCatmullClark } from './subdivisao.js';
import { nucleo } from './entrada.js';
import { distancias, triangulos, volume } from './fixtures/medidas-de-malha.js';
import { sha256Hex } from './sha256.js';
import { COMPRIMENTO, GOTA, altura, contornoDaGota, definicao, montagem, receitaComMoldura } from './fixtures/gaiola-por-rede-prova.js';
import { analisarTopologia } from '../../modulos/topologia/src/analisar.js';

const MM = 1000;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (n) => { const l = Math.hypot(...n); return n.map((x) => x / l); };
const newell = (P) => {
  const n = [0, 0, 0];
  for (let k = 0; k < P.length; k++) { const a = P[k], b = P[(k + 1) % P.length]; n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); }
  return n;
};
const graus = (a, b) => (Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) * 180) / Math.PI;

const g = montagem({});
const NIVEIS = 2;
const indiceDoNome = new Map(g.passo.vertices.map((n, i) => [n, i]));
const facesDaGaiola = g.passo.faces.map((f) => f.map((n) => indiceDoNome.get(n)));

/* a malha entregue pelo passo: a gaiola ajustada às medidas, subdividida e levada ao limite, em metro */
function malhaDoPasso(rede, niveis = NIVEIS) {
  const vec = (p) => (typeof p === 'string' ? rede.pontos[p] : p);
  const r = gaiolaDoPasso({ ...rede.passo, niveis }, { vec, num: (x) => x });
  expect(r.erro).toBeUndefined();
  return subdividirCatmullClark({ ...r.gaiola, niveis, borda: 'suave', aoLimite: true, comVincos: true });
}
const malha = malhaDoPasso(g);
const V = malha.vertices;
const F = malha.faces;
const arestasDaMalha = new Map();
for (const f of F) for (let k = 0; k < f.length; k++) { const a = f[k], b = f[(k + 1) % f.length]; const c = a < b ? `${a}|${b}` : `${b}|${a}`; arestasDaMalha.set(c, (arestasDaMalha.get(c) ?? 0) + 1); }
const temAresta = (a, b) => arestasDaMalha.has(a < b ? `${a}|${b}` : `${b}|${a}`);

describe('a chapa desenhada: 1000 × 600 mm, com janela em gota, arco de roda e coluna inclinada', () => {
  const d = definicao();

  it('tem a escala de uma lateral, a janela de 230 mm na parte larga e a ponta de raio 20 mm', () => {
    const xs = g.passo.vertices.map((n) => g.pontos[n][0] * MM), zs = g.passo.vertices.map((n) => g.pontos[n][2] * MM), ys = g.passo.vertices.map((n) => g.pontos[n][1] * MM);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(COMPRIMENTO, 6);
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(595);
    expect(Math.max(...zs) - Math.min(...zs)).toBeLessThan(605);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(40);
    /* a janela, medida na própria curva: 230 mm de altura na parte larga, e a ponta arredondada de raio 20 mm (a curva passa a 0,1 mm do círculo) */
    const janela = Array.from({ length: 4000 }, (_, k) => g.pontoDaCurva('janela', k / 4000).map((x) => x * MM));
    expect(Math.max(...janela.map((p) => p[2])) - Math.min(...janela.map((p) => p[2]))).toBeGreaterThan(229.8);
    expect(Math.max(...janela.map((p) => p[2])) - Math.min(...janela.map((p) => p[2]))).toBeLessThan(230.2);
    const [cx, cz] = GOTA.ponta.centro;
    const naPonta = janela.filter((p) => p[0] > cx + 0.3 * GOTA.ponta.raio);
    expect(naPonta.length).toBeGreaterThan(20);
    for (const p of naPonta) expect(Math.abs(Math.hypot(p[0] - cx, p[2] - cz) - GOTA.ponta.raio)).toBeLessThan(0.1);
    expect(Math.max(...janela.map((p) => p[0]))).toBeCloseTo(cx + GOTA.ponta.raio, 0);
    expect(2 * GOTA.larga.raio).toBe(230);
    expect(contornoDaGota().caminho.length).toBeGreaterThan(20);
  });

  it('é declarada por 19 curvas e 10 retalhos, dois deles de cinco lados, e o arco de roda mede 140 mm de raio', () => {
    expect(d.curvas.length).toBeGreaterThanOrEqual(15);
    expect(d.curvas.length).toBeLessThanOrEqual(20);
    expect(d.retalhos).toHaveLength(10);
    expect(Object.values(g.retalhos).filter((r) => r.lados === 5)).toHaveLength(2);
    expect(Object.values(g.retalhos).filter((r) => r.lados === 4)).toHaveLength(8);
    expect(g.curvas.arco.comprimentoMm).toBeGreaterThan(Math.PI * 140 * 0.99);
    expect(g.curvas.arco.comprimentoMm).toBeLessThan(Math.PI * 140 * 1.01);
  });

  it('a receita pede uma decisão por retalho além das curvas: a lista de curvas que o fecham, sem divisoes, sem cantos e sem índice', () => {
    for (const r of d.retalhos) expect(Object.keys(r).sort()).toEqual(['borda', 'nome']);
    expect(d.cantos).toBeUndefined();
    expect(d.leitura).toBeUndefined();
    /* o que resta de decisão da rede inteira: o passo e o sentido de fora */
    expect(Object.keys(d).sort()).toEqual(['curvas', 'fora', 'nos', 'passo', 'retalhos']);
    expect(enderecosPorIndice(g.passo)).toEqual([]);
    expect(g.avisos).toEqual([]);
  });
});

describe('a gaiola e a malha: só quadriláteros, com os vértices extraordinários declarados', () => {
  it('a gaiola e a malha de nível 2 saem só de quadriláteros', () => {
    expect(g.passo.faces.every((f) => f.length === 4)).toBe(true);
    expect(F.every((f) => f.length === 4)).toBe(true);
    expect(g.passo.faces).toHaveLength(Object.values(g.retalhos).reduce((s, r) => s + r.faces, 0));
  });

  it('os vértices extraordinários são os nós e os centros declarados, e a malha não ganha outros', () => {
    const dentro = g.extraordinarios.filter((e) => !e.borda);
    expect(dentro.length).toBeGreaterThanOrEqual(3);
    for (const e of g.extraordinarios) expect(e.ponto in g.nos || e.ponto.endsWith('.centro')).toBe(true);
    expect(dentro.every((e) => e.valencia === 3 || e.valencia === 5)).toBe(true);
    expect(dentro.filter((e) => e.retalho).map((e) => e.ponto).sort()).toEqual(['antesDoArco.centro', 'depoisDoArco.centro']);
    const naMalha = extraordinarios(V.map((_, i) => i), F);
    expect(naMalha.filter((e) => !e.borda)).toHaveLength(dentro.length);
  });

  it('cada face da gaiola olha para fora, e a malha não tem aresta com mais de duas faces', () => {
    for (const f of g.passo.faces) expect(newell(f.map((n) => g.pontos[n]))[1]).toBeGreaterThan(0);
    expect([...arestasDaMalha.values()].every((n) => n === 1 || n === 2)).toBe(true);
  });
});

describe('a superfície passa pelas curvas', () => {
  const tris = triangulos(F).map((t) => t.map((i) => V[i]));
  const amostras = (nome, n = 400) => Array.from({ length: n }, (_, k) => g.pontoDaCurva(nome, k / (g.curvas[nome].fechada ? n : n - 1)));

  it('a menos de 0,5 mm em cada uma das 19 curvas, medida em 400 pontos de cada', () => {
    let pior = 0;
    for (const nome of Object.keys(g.curvas)) {
      const dist = distancias(amostras(nome), tris, 0.02);
      const maximo = Math.max(...dist) * MM;
      expect(maximo, nome).toBeLessThan(0.5);
      pior = Math.max(pior, maximo);
    }
    expect(pior).toBeGreaterThan(0);
  });

  it('os pontos da gaiola nas curvas são vértices da malha, a menos de 1e-6 m (cota exata)', () => {
    const medidos = g.passo.medidas.filter((m) => typeof m === 'string');
    expect(medidos.length).toBeGreaterThan(200);
    for (const nome of medidos) {
      const k = indiceDoNome.get(nome);
      expect(Math.hypot(...sub(V[k], g.pontos[nome]))).toBeLessThan(1e-6);
    }
  });

  it('o interior da chapa fica perto da forma desenhada: a menos de 1,5 mm da altura, 0,35 mm em média', () => {
    let maior = 0, soma = 0;
    for (const v of V) { const e = Math.abs(v[1] * MM - altura(v[0] * MM, v[2] * MM)); maior = Math.max(maior, e); soma += e; }
    expect(maior).toBeLessThan(1.5);
    expect(soma / V.length).toBeLessThan(0.35);
  });
});

describe('as arestas seguem as curvas: a borda da janela é um laço de arestas da malha', () => {
  const linha = g.linha('janela');
  const cadeia = cadeiaRefinada(facesDaGaiola, g.passo.vertices.length, NIVEIS, linha.map((n) => indiceDoNome.get(n))).cadeia;

  it('a linha da janela repete o primeiro ponto no fim, e a cadeia refinada é um laço em que cada par é aresta da malha', () => {
    expect(linha[0]).toBe(linha[linha.length - 1]);
    expect(cadeia[0]).toBe(cadeia[cadeia.length - 1]);
    expect(cadeia.length - 1).toBe((linha.length - 1) * 2 ** NIVEIS);
    for (let k = 0; k + 1 < cadeia.length; k++) expect(temAresta(cadeia[k], cadeia[k + 1])).toBe(true);
    expect(new Set(cadeia).size).toBe(cadeia.length - 1);
  });

  it('o laço é a borda livre da malha em volta da janela, inteira, e todos os vértices dele ficam a menos de 0,5 mm da curva', () => {
    const livres = [...arestasDaMalha].filter(([, n]) => n === 1).map(([c]) => c.split('|').map(Number));
    const dosDoLaco = new Set(cadeia);
    const naBordaDoLaco = livres.filter(([a, b]) => dosDoLaco.has(a) && dosDoLaco.has(b));
    expect(naBordaDoLaco).toHaveLength(cadeia.length - 1);
    const poli = Array.from({ length: 2000 }, (_, k) => g.pontoDaCurva('janela', k / 2000));
    const dist = (p) => { let m = Infinity; for (let i = 0; i < poli.length; i++) { const a = poli[i], b = poli[(i + 1) % poli.length]; const ab = sub(b, a); const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / dot(ab, ab))); m = Math.min(m, Math.hypot(...sub(p, [a[0] + t * ab[0], a[1] + t * ab[1], a[2] + t * ab[2]]))); } return m; };
    expect(Math.max(...cadeia.slice(0, -1).map((k) => dist(V[k]))) * MM).toBeLessThan(0.5);
  });

  it('as outras curvas também: a linha de cada uma é uma cadeia de arestas da malha refinada', () => {
    for (const [nome, nomes] of Object.entries(g.linhas)) {
      const c = cadeiaRefinada(facesDaGaiola, g.passo.vertices.length, NIVEIS, nomes.map((n) => indiceDoNome.get(n))).cadeia;
      for (let k = 0; k + 1 < c.length; k++) expect(temAresta(c[k], c[k + 1]), nome).toBe(true);
    }
    expect(Object.keys(g.linhas)).toHaveLength(Object.keys(g.curvas).length);
  });
});

describe('a tangente não quebra nas curvas compartilhadas, salvo no vinco', () => {
  const normaisDasFaces = F.map((f) => unit(newell(f.map((v) => V[v]))));
  const facesDoV = new Map();
  F.forEach((f, i) => f.forEach((v) => { if (!facesDoV.has(v)) facesDoV.set(v, []); facesDoV.get(v).push(i); }));
  /* o maior ângulo entre a normal média das faces de um lado da curva e a do outro, nos vértices da curva refinada */
  function saltoDaCurva(nome) {
    const nomes = g.linhas[nome];
    const cadeia = cadeiaRefinada(facesDaGaiola, g.passo.vertices.length, NIVEIS, nomes.map((n) => indiceDoNome.get(n))).cadeia;
    let maximo = 0;
    for (let k = 1; k + 1 < cadeia.length; k++) {
      const v = cadeia[k];
      const t = unit(sub(V[cadeia[k + 1]], V[cadeia[k - 1]]));
      const nv = unit(facesDoV.get(v).reduce((s, fi) => s.map((x, q) => x + normaisDasFaces[fi][q]), [0, 0, 0]));
      const lateral = unit([nv[1] * t[2] - nv[2] * t[1], nv[2] * t[0] - nv[0] * t[2], nv[0] * t[1] - nv[1] * t[0]]);
      const lados = [[0, 0, 0], [0, 0, 0]];
      for (const fi of facesDoV.get(v)) {
        const c = F[fi].reduce((s, w) => s.map((x, q) => x + V[w][q] / 4), [0, 0, 0]);
        const lado = dot(sub(c, V[v]), lateral) > 0 ? 0 : 1;
        lados[lado] = lados[lado].map((x, q) => x + normaisDasFaces[fi][q]);
      }
      if (Math.hypot(...lados[0]) === 0 || Math.hypot(...lados[1]) === 0) continue;
      maximo = Math.max(maximo, graus(unit(lados[0]), unit(lados[1])));
    }
    return maximo;
  }
  const compartilhadas = Object.keys(g.curvas).filter((n) => g.curvas[n].arcos.every((a) => a.retalhos.length === 2));

  it('nas curvas compartilhadas que não são vinco, o salto de normal da superfície é menor que 1,5 grau', () => {
    const lisas = compartilhadas.filter((n) => definicao().curvas.find((c) => c.nome === n).vinco == null);
    expect(lisas.length).toBeGreaterThanOrEqual(6);
    for (const nome of lisas) expect(saltoDaCurva(nome), nome).toBeLessThan(1.5);
  });

  it('nas curvas declaradas vinco a dobra continua dobra: 12 graus na cintura e 4 na aresta da coluna', () => {
    expect(saltoDaCurva('cintura')).toBeGreaterThan(9);
    expect(saltoDaCurva('colunaB')).toBeGreaterThan(3);
  });

  it('sem o alisamento do miolo o preenchimento de Coons quebra mais a tangente: o salto na gaiola cai em ligL2 e em ligU2', () => {
    const crua = montagem({ extra: { liso: false } });
    for (const nome of ['ligL2', 'ligU2']) expect(crua.continuidade[nome].saltoMaximoGraus).toBeGreaterThan(g.continuidade[nome].saltoMaximoGraus);
    expect(g.alisamento.deslocamentoMaximoMm).toBeLessThan(3);
  });
});

describe('a moldura de 10 mm como friso sobre a curva da janela', () => {
  const r = receitaComMoldura({}, 1);
  const neutro = nucleo(r.PASSOS, r.TOPO);
  const malhaDaParte = (parte) => {
    const faces = [...neutro.F.values()].filter((f) => f.parte === parte);
    const ids = [...new Set(faces.flatMap((f) => f.vs))];
    return { vertices: new Map(ids.map((id) => [id, neutro.V.get(id)])), faces: new Map(faces.map((f) => [f.id, f])) };
  };

  it('sai sem grito e fecha sólida, uma peça só e sem borda aberta, como a chapa de 1,5 mm', () => {
    expect(neutro.orfaos).toEqual([]);
    const moldura = analisarTopologia(malhaDaParte('moldura'));
    expect(moldura.achados).toEqual([]);
    expect(moldura.resumo).toMatchObject({ componentes: 1, bordas: 0, reprovas: 0 });
    const chapa = analisarTopologia(malhaDaParte('chapa'));
    expect(chapa.achados).toEqual([]);
    expect(chapa.resumo).toMatchObject({ componentes: 1, bordas: 0, reprovas: 0 });
  });

  it('tem 10 mm de largura: os cantos de baixo do perfil ficam a 5 mm da curva da janela e os de cima, a 3 mm mais para cima', () => {
    const m = malhaDaParte('moldura');
    const poli = Array.from({ length: 2000 }, (_, k) => g.pontoDaCurva('janela', k / 2000)).map((p) => p.map((x) => x * MM));
    const dist = (p) => { let best = Infinity; for (let i = 0; i < poli.length; i++) { const a = poli[i], b = poli[(i + 1) % poli.length]; const ab = sub(b, a); const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / dot(ab, ab))); best = Math.min(best, Math.hypot(...sub(p, [a[0] + t * ab[0], a[1] + t * ab[1], a[2] + t * ab[2]]))); } return best; };
    const ds = [...m.vertices.values()].map((p) => dist(p.map((x) => x * MM)));
    /* embaixo, a raiz de 5² + 0,5²; em cima, a raiz de 5² + 3²; a esquadria da volta fechada alarga o perfil na curva */
    const embaixo = ds.filter((x) => x < 5.4); const emCima = ds.filter((x) => x >= 5.4);
    expect(Math.min(...ds)).toBeGreaterThan(4.5);
    expect(Math.max(...ds)).toBeLessThan(6.4);
    expect(embaixo.length).toBe(emCima.length);
    expect(embaixo.reduce((x, y) => x + y, 0) / embaixo.length).toBeGreaterThan(5.0);
    expect(embaixo.reduce((x, y) => x + y, 0) / embaixo.length).toBeLessThan(5.2);
    expect(emCima.reduce((x, y) => x + y, 0) / emCima.length).toBeGreaterThan(5.8);
    expect(emCima.reduce((x, y) => x + y, 0) / emCima.length).toBeLessThan(6.0);
  });

  it('o volume é a área do perfil (10 × 3,5 mm) vezes o comprimento da volta, a 3%', () => {
    const m = malhaDaParte('moldura');
    const ids = [...m.vertices.keys()]; const indice = new Map(ids.map((id, k) => [id, k]));
    const vertices = ids.map((id) => m.vertices.get(id));
    const faces = [...m.faces.values()].map((f) => f.vs.map((v) => indice.get(v)));
    const esperado = (10 * 3.5 * g.curvas.janela.comprimentoMm) / (MM ** 3);
    const v = volume(vertices, faces);
    expect(v).toBeGreaterThan(0);
    expect(Math.abs(v - esperado) / esperado).toBeLessThan(0.03);
  });
});

describe('é bit a bit', () => {
  it('duas execuções dão a mesma gaiola, a mesma malha e as mesmas faces', () => {
    const outra = montagem({});
    const impressao = (rede) => sha256Hex(JSON.stringify([rede.pontos, rede.passo, rede.extraordinarios, rede.densidades, rede.continuidade, rede.alisamento]));
    expect(impressao(outra)).toBe(impressao(g));
    const m2 = malhaDoPasso(outra);
    expect(sha256Hex(JSON.stringify([m2.vertices, m2.faces]))).toBe(sha256Hex(JSON.stringify([V, F])));
  });

  it('o passo e os frisos usam só nomes de ponto, e a gaiola de uma definição reescrita com as curvas em outra ordem tem os mesmos pontos', () => {
    const d = definicao();
    const invertida = gaiolaPorRede({ ...d, curvas: [...d.curvas].reverse() });
    const por = (rede) => Object.entries(rede.pontos).map(([k, v]) => `${k}:${v.map((x) => x.toFixed(9)).join(',')}`).sort();
    expect(por(invertida)).toEqual(por(g));
  });
});

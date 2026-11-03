/* contato-de-solidos-arvore.test.mjs — a árvore de caixas como fase ampla da contenção e do cruzamento NÃO muda nenhuma resposta.
 *
 * `pontoDentroMalha` e `malhasSeInterseccionam` consultam uma árvore de caixas e passam cada candidato pela conta exata de
 * antes. `pontoDentroMalhaPorForcaBruta` e `malhasSeInterseccionamPorForcaBruta` percorrem todos os triângulos e ficam no
 * módulo SÓ como referência deste teste (e como resposta quando a margem da árvore não vale). Aqui o veredito da versão com
 * árvore é comparado, ponto a ponto e par a par, com o da força bruta, em quatro famílias: uma fixture pequena (esfera e cubo
 * subdividido, com pontos sobre a superfície, a uma fração da tolerância dela, dentro e fora), malhas sorteadas em grade
 * inteira (empates, triângulos agudos, degenerados e coplanares), uma peça média do acervo e a própria árvore.
 *
 * Todas as malhas passam de `LIMITE_PARA_ARVORE` triângulos, senão a consulta cairia na força bruta e o teste compararia a
 * função com ela mesma; cada família confere isso e que os três vereditos (dentro, fora, na superfície) aparecem. */
import { describe, expect, it } from 'vitest';
import {
  LIMITE_PARA_ARVORE,
  malhasSeInterseccionam,
  malhasSeInterseccionamPorForcaBruta,
  pontoDentroMalha,
  pontoDentroMalhaPorForcaBruta,
  prepararSolido,
} from './contato-de-solidos.js';
import { construirArvore, visitarPorCaixa, visitarPorRaio } from './arvore-de-caixas.js';
import { executarReceita } from './executar-receita.js';
import { solidosPorParte } from './contatos-da-peca.js';
import { importarReceita, receitaDoModulo } from '../../tools/modelar/importar-receita.mjs';
import { resolverCaminhoReceita } from '../../tools/modelar/resolver-caminho-receita.mjs';

const REPO = new URL('../..', import.meta.url).pathname;
const TOLERANCIAS = [0, 1e-9, 1e-8, 1e-7];

function gerador(semente) {
  let e = semente >>> 0;
  return () => {
    e = (e + 0x6D2B79F5) >>> 0;
    let t = e;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const centroide = (t) => [0, 1, 2].map((i) => (t[0][i] + t[1][i] + t[2][i]) / 3);
function unitaria(n) { const m = Math.hypot(...n); return m > 0 ? n.map((x) => x / m) : [0, 0, 0]; }

function neutroDe(vertices, faces) {
  return {
    V: new Map(vertices.map((p, i) => [`v${i}`, p])),
    F: new Map(faces.map((vs, i) => [`f${String(i).padStart(5, '0')}`, { id: `f${String(i).padStart(5, '0')}`, vs: vs.map((k) => `v${k}`) }])),
  };
}

/* esfera de paralelos e meridianos: fechada, com triângulos nos polos e quadriláteros no resto */
function esfera(raio, meridianos, paralelos, centro = [0, 0, 0]) {
  const vertices = [[0, 0, raio], [0, 0, -raio]];
  for (let p = 1; p < paralelos; p += 1) for (let m = 0; m < meridianos; m += 1) {
    const phi = (Math.PI * p) / paralelos; const theta = (2 * Math.PI * m) / meridianos;
    vertices.push([raio * Math.sin(phi) * Math.cos(theta), raio * Math.sin(phi) * Math.sin(theta), raio * Math.cos(phi)]);
  }
  const indice = (p, m) => 2 + (p - 1) * meridianos + (m % meridianos);
  const faces = [];
  for (let m = 0; m < meridianos; m += 1) faces.push([0, indice(1, m), indice(1, m + 1)]);
  for (let p = 1; p < paralelos - 1; p += 1) for (let m = 0; m < meridianos; m += 1) {
    faces.push([indice(p, m), indice(p + 1, m), indice(p + 1, m + 1), indice(p, m + 1)]);
  }
  for (let m = 0; m < meridianos; m += 1) faces.push([1, indice(paralelos - 1, m + 1), indice(paralelos - 1, m)]);
  return prepararSolido(neutroDe(vertices.map((v) => [v[0] + centro[0], v[1] + centro[1], v[2] + centro[2]]), faces), undefined, 'esfera');
}

/* cubo de aresta `lado` com cada face em n×n quadriláteros: milhares de pontos coplanares e arestas retas */
function cuboSubdividido(lado, n, deslocamento = [0, 0, 0]) {
  const vertices = []; const faces = []; const chave = new Map();
  const vertice = (x, y, z) => {
    const k = `${x},${y},${z}`;
    if (!chave.has(k)) { chave.set(k, vertices.length); vertices.push([deslocamento[0] + (x / n) * lado, deslocamento[1] + (y / n) * lado, deslocamento[2] + (z / n) * lado]); }
    return chave.get(k);
  };
  for (let u = 0; u < n; u += 1) for (let v = 0; v < n; v += 1) {
    faces.push([vertice(u, v, 0), vertice(u, v + 1, 0), vertice(u + 1, v + 1, 0), vertice(u + 1, v, 0)]);
    faces.push([vertice(u, v, n), vertice(u + 1, v, n), vertice(u + 1, v + 1, n), vertice(u, v + 1, n)]);
    faces.push([vertice(0, u, v), vertice(0, u + 1, v), vertice(0, u + 1, v + 1), vertice(0, u, v + 1)]);
    faces.push([vertice(n, u, v), vertice(n, u, v + 1), vertice(n, u + 1, v + 1), vertice(n, u + 1, v)]);
    faces.push([vertice(u, 0, v), vertice(u + 1, 0, v), vertice(u + 1, 0, v + 1), vertice(u, 0, v + 1)]);
    faces.push([vertice(u, n, v), vertice(u, n, v + 1), vertice(u + 1, n, v + 1), vertice(u + 1, n, v)]);
  }
  return prepararSolido(neutroDe(vertices, faces), undefined, 'cubo');
}

/* pontos para exercitar a contenção de `alvo`: os vértices e os centroides de `fonte`, os centroides de `alvo` e a uma fração
   da tolerância deles (sobre a superfície, logo dentro e logo fora dela), e uma nuvem no volume */
function pontosDeProva(fonte, alvo, aleatorio, nuvem = 200) {
  const pontos = [];
  for (const t of fonte.triangulos) { pontos.push(...t, centroide(t)); }
  alvo.triangulos.forEach((t, i) => {
    if (i % 3 !== 0) return;
    const c = centroide(t); const n = unitaria(cross(sub(t[1], t[0]), sub(t[2], t[0])));
    pontos.push(c, [(t[0][0] + t[1][0]) / 2, (t[0][1] + t[1][1]) / 2, (t[0][2] + t[1][2]) / 2]);
    for (const passo of [1e-10, 5e-10, 1e-9, 2e-9, 1e-8, 5e-8, 1e-7, 3e-7, 1e-4]) {
      pontos.push([c[0] + n[0] * passo, c[1] + n[1] * passo, c[2] + n[2] * passo], [c[0] - n[0] * passo, c[1] - n[1] * passo, c[2] - n[2] * passo]);
    }
  });
  const { min, max } = alvo.caixa;
  for (let k = 0; k < nuvem; k += 1) pontos.push([0, 1, 2].map((e) => min[e] + (max[e] - min[e]) * (1.4 * aleatorio() - 0.2)));
  return pontos;
}

function compararPontos(pontos, malha, mensagem) {
  const contagem = { dentro: 0, fora: 0, superficie: 0 };
  for (const tolerancia of TOLERANCIAS) {
    for (const [k, ponto] of pontos.entries()) {
      const novo = pontoDentroMalha(ponto, malha, tolerancia);
      const referencia = pontoDentroMalhaPorForcaBruta(ponto, malha, tolerancia);
      if (novo !== referencia) expect(novo, `${mensagem}: ponto ${k} ${JSON.stringify(ponto)} tolerância ${tolerancia}`).toBe(referencia);
      if (referencia === null) contagem.superficie += 1; else if (referencia) contagem.dentro += 1; else contagem.fora += 1;
    }
  }
  return contagem;
}

describe('árvore de caixas: a contenção de ponto é igual à força bruta', () => {
  it('na esfera e no cubo subdividido, sobre a superfície, perto dela, dentro e fora', () => {
    const aleatorio = gerador(7);
    for (const malha of [esfera(1, 24, 14), cuboSubdividido(2, 6, [-1, -1, -1]), esfera(3e-3, 20, 12, [1e-3, 0, 0])]) {
      expect(malha.fechada).toBe(true);
      expect(malha.triangulos.length).toBeGreaterThan(LIMITE_PARA_ARVORE);
      const outra = esfera(0.8 * (malha.caixa.max[0] - malha.caixa.min[0]) / 2, 10, 8, malha.caixa.min.map((m, e) => (m + malha.caixa.max[e]) / 2));
      const contagem = compararPontos(pontosDeProva(outra, malha, aleatorio), malha, 'fixture');
      expect(contagem.superficie).toBeGreaterThan(100);
      expect(contagem.dentro).toBeGreaterThan(100);
      expect(contagem.fora).toBeGreaterThan(100);
    }
  });

  it('em malhas sorteadas em grade inteira, com empates, triângulos agudos e degenerados', () => {
    let nulos = 0; let dentro = 0; let fora = 0;
    for (let semente = 1; semente <= 60; semente += 1) {
      const aleatorio = gerador(semente);
      const grade = [3, 6, 12][semente % 3]; const escala = [1, 1e-3, 40][semente % 3];
      const triangulos = [];
      const quantidade = LIMITE_PARA_ARVORE + 8 + Math.floor(aleatorio() * 90);
      const ponto = () => [0, 1, 2].map(() => Math.floor(aleatorio() * (grade + 1)) * escala);
      for (let i = 0; i < quantidade; i += 1) triangulos.push([ponto(), ponto(), ponto()]);
      const malha = { triangulos, fechada: semente % 2 === 0, ...(semente % 2 === 0 ? { caixa: { min: [0, 0, 0], max: [grade * escala, grade * escala, grade * escala] } } : {}) };
      const pontos = [];
      for (const t of triangulos) pontos.push(...t, centroide(t));
      for (let k = 0; k < 120; k += 1) pontos.push([0, 1, 2].map(() => (Math.floor(aleatorio() * (2 * grade + 3)) / 2 - 0.5) * escala));
      const contagem = compararPontos(pontos, malha, `semente ${semente}`);
      nulos += contagem.superficie; dentro += contagem.dentro; fora += contagem.fora;
    }
    expect(nulos).toBeGreaterThan(1000);
    expect(dentro).toBeGreaterThan(1000);
    expect(fora).toBeGreaterThan(1000);
  });

  it('numa peça média do acervo (o furgão), de cada parte contra cada parte', async () => {
    const receita = receitaDoModulo(await importarReceita(resolverCaminhoReceita('furgao', { raiz: REPO })));
    const { neutro } = executarReceita(receita, {});
    const { solidos } = solidosPorParte(neutro);
    const grandes = solidos.filter((s) => s.triangulos && s.triangulos.length > LIMITE_PARA_ARVORE);
    expect(grandes.length).toBeGreaterThan(5);
    const aleatorio = gerador(11);
    const total = { dentro: 0, fora: 0, superficie: 0 };
    let pares = 0;
    for (const alvo of grandes) for (const fonte of solidos) {
      if (fonte === alvo || !fonte.triangulos) continue;
      const proximos = [0, 1, 2].every((e) => fonte.caixa.min[e] <= alvo.caixa.max[e] + 1e-3 && alvo.caixa.min[e] <= fonte.caixa.max[e] + 1e-3);
      if (!proximos) continue;
      pares += 1;
      const c = compararPontos(pontosDeProva(fonte, alvo, aleatorio, 20), alvo, `${fonte.nome} em ${alvo.nome}`);
      total.dentro += c.dentro; total.fora += c.fora; total.superficie += c.superficie;
    }
    expect(pares).toBeGreaterThan(20);
    expect(total.dentro).toBeGreaterThan(100);
    expect(total.fora).toBeGreaterThan(100);
    expect(total.superficie).toBeGreaterThan(100);
  });
});

describe('árvore de caixas: o cruzamento de malhas é igual à força bruta', () => {
  it('em malhas sorteadas em grade inteira, afastadas e sobrepostas', () => {
    let cruzam = 0; let separadas = 0;
    for (let semente = 1; semente <= 200; semente += 1) {
      const aleatorio = gerador(5000 + semente);
      const grade = [3, 6, 12][semente % 3]; const escala = [1, 1e-3, 40][semente % 3];
      const sortear = (quantidade, deslocamento) => {
        const ponto = () => [0, 1, 2].map((e) => (Math.floor(aleatorio() * (grade + 1)) + deslocamento[e]) * escala);
        return { triangulos: Array.from({ length: quantidade }, () => [ponto(), ponto(), ponto()]), fechada: false };
      };
      const a = sortear(1 + Math.floor(aleatorio() * 40), [0, 0, 0]);
      const b = sortear(LIMITE_PARA_ARVORE + 1 + Math.floor(aleatorio() * 60), [semente % 4 === 0 ? 0 : (semente % 4) * grade, semente % 5 === 0 ? grade + 1 : 0, 0]);
      for (const tolerancia of [1e-9, 0, 1e-3 * escala]) {
        const novo = malhasSeInterseccionam(a, b, tolerancia);
        const referencia = malhasSeInterseccionamPorForcaBruta(a, b, tolerancia);
        expect(novo, `semente ${semente} tolerância ${tolerancia}`).toBe(referencia);
        if (referencia) cruzam += 1; else separadas += 1;
      }
    }
    expect(cruzam).toBeGreaterThan(100);
    expect(separadas).toBeGreaterThan(100);
  });

  it('em esferas e cubos que se tocam, se cruzam e se afastam', () => {
    const casos = [];
    for (const deslocamento of [0, 0.5, 0.999999999, 1, 1.000000001, 1.5, 2, 2.0000001, 3]) {
      casos.push([esfera(1, 20, 12), esfera(1, 18, 10, [deslocamento, 0, 0])]);
      casos.push([cuboSubdividido(2, 5), cuboSubdividido(2, 4, [deslocamento, 0, 0])]);
      casos.push([cuboSubdividido(2, 5), esfera(1, 18, 10, [deslocamento + 1, 1, 1])]);
    }
    let cruzam = 0; let separadas = 0;
    for (const [a, b] of casos) for (const tolerancia of TOLERANCIAS) {
      const referencia = malhasSeInterseccionamPorForcaBruta(a, b, tolerancia);
      expect(malhasSeInterseccionam(a, b, tolerancia)).toBe(referencia);
      expect(malhasSeInterseccionam(b, a, tolerancia)).toBe(malhasSeInterseccionamPorForcaBruta(b, a, tolerancia));
      if (referencia) cruzam += 1; else separadas += 1;
    }
    expect(cruzam).toBeGreaterThan(20);
    expect(separadas).toBeGreaterThan(20);
  });

  it('nas partes de uma peça média do acervo, par a par', async () => {
    const receita = receitaDoModulo(await importarReceita(resolverCaminhoReceita('furgao', { raiz: REPO })));
    const { neutro } = executarReceita(receita, {});
    const { solidos } = solidosPorParte(neutro);
    const validos = solidos.filter((s) => s.triangulos);
    let pares = 0; let cruzam = 0;
    for (let i = 0; i < validos.length; i += 1) for (let j = 0; j < validos.length; j += 1) {
      if (i === j) continue;
      const a = validos[i]; const b = validos[j];
      const proximos = [0, 1, 2].every((e) => a.caixa.min[e] <= b.caixa.max[e] + 1e-3 && b.caixa.min[e] <= a.caixa.max[e] + 1e-3);
      if (!proximos) continue;
      pares += 1;
      for (const tolerancia of [1e-9, 1e-7]) {
        const referencia = malhasSeInterseccionamPorForcaBruta(a, b, tolerancia);
        expect(malhasSeInterseccionam(a, b, tolerancia), `${a.nome} x ${b.nome}`).toBe(referencia);
        if (referencia) cruzam += 1;
      }
    }
    expect(pares).toBeGreaterThan(40);
    expect(cruzam).toBeGreaterThan(10);
  });
});

describe('árvore de caixas: os candidatos cobrem tudo o que a consulta toca', () => {
  it('a visita por caixa e por raio devolve ao menos os itens que a conta direta acusa', () => {
    const aleatorio = gerador(99);
    const quantidade = 700;
    const caixas = new Float64Array(quantidade * 6);
    for (let i = 0; i < quantidade; i += 1) {
      const c = [aleatorio() * 10, aleatorio() * 10, aleatorio() * 10]; const m = [aleatorio(), aleatorio(), aleatorio()];
      for (let e = 0; e < 3; e += 1) { caixas[i * 6 + e] = c[e] - m[e] * 0.3; caixas[i * 6 + 3 + e] = c[e] + m[e] * 0.3; }
    }
    const arvore = construirArvore(caixas, quantidade);
    const ordem = [...arvore.ordem].sort((x, y) => x - y);
    expect(ordem).toEqual(Array.from({ length: quantidade }, (_, i) => i));
    for (let k = 0; k < 60; k += 1) {
      const q = [aleatorio() * 10, aleatorio() * 10, aleatorio() * 10]; const r = aleatorio() * 2;
      const achados = new Set();
      visitarPorCaixa(arvore, q[0] - r, q[1] - r, q[2] - r, q[0] + r, q[1] + r, q[2] + r, (i) => { achados.add(i); return false; });
      for (let i = 0; i < quantidade; i += 1) {
        const toca = [0, 1, 2].every((e) => caixas[i * 6 + e] <= q[e] + r && caixas[i * 6 + 3 + e] >= q[e] - r);
        if (toca) expect(achados.has(i)).toBe(true);
      }
      const direcao = [1, 0.3713906763541037, 0.1932731453127433];
      const pelRaio = new Set();
      visitarPorRaio(arvore, q[0], q[1], q[2], direcao[0], direcao[1], direcao[2], 0.05, (i) => { pelRaio.add(i); return false; });
      for (let i = 0; i < quantidade; i += 1) {
        /* o item que o raio atravessa de fato: algum ponto da semirreta cai na caixa */
        let atravessa = false;
        for (let t = 0; t <= 30 && !atravessa; t += 0.01) {
          atravessa = [0, 1, 2].every((e) => { const x = q[e] + t * direcao[e]; return x >= caixas[i * 6 + e] && x <= caixas[i * 6 + 3 + e]; });
        }
        if (atravessa) expect(pelRaio.has(i)).toBe(true);
      }
    }
  });

  it('a mesma lista de caixas dá a mesma árvore', () => {
    const aleatorio = gerador(3);
    const caixas = Float64Array.from({ length: 300 * 6 }, (_, k) => (k % 6 < 3 ? aleatorio() : 1 + aleatorio()));
    const a = construirArvore(caixas, 300); const b = construirArvore(caixas, 300);
    expect([...a.ordem]).toEqual([...b.ordem]);
    expect([...a.nos]).toEqual([...b.nos]);
  });
});

/* medida-do-desenho-casos.mjs — os casos montados à mão que provam a medida do desenho antes de ela medir o conjunto.
 *
 * Uma medida que dá zero em tudo não prova nada, e uma que acusa tudo também não. Cada caso aqui é uma malha pequena, de forma
 * conhecida, desenhada pelo desenhista da blocagem nas quatro vistas, e a prova tem três partes: a medida dá zero no desenho certo; acusa,
 * com grupo e posição, um traço plantado a mais na camada (uma fita que não cobre aresta nenhuma); e acusa um traço tirado da camada (uma
 * aresta que ficou sem fita). Os casos: uma caixa, uma caixa com furo (de 24 lados, cuja parede não tem vinco, e de 12, cuja parede tem
 * o ângulo exato do limite do vinco), duas caixas encostadas no mesmo plano (a divisão entre elas não é aresta), duas de alturas
 * diferentes (o degrau é) e um cilindro fino (o desenho de uma peça de poucos pixels). Planta e tira na camada e não no PNG, de modo
 * que a prova passa pela rasterização como o desenho de verdade. */
import earcut from 'earcut';
import { desenharBlocagem } from '../../modulos/esboco/src/desenho-da-blocagem.js';
import { LARGURA_DAS_VISTAS, VISTAS_DO_CONJUNTO } from '../../src/autoria/calibracao-do-critico.js';
import { medirDesenho, triangulosDaBlocagem } from './medida-do-desenho.mjs';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/* Uma malha a montar: vértices e triângulos, com a orientação conferida contra a normal que quem monta diz que a face tem. */
class Malha {
  constructor() { this.vertices = []; this.faces = []; this.indice = new Map(); }

  /* o vértice, o mesmo índice para o mesmo ponto (como a malha de uma peça, que divide vértice entre as partes) */
  v(p) {
    const k = p.map((c) => Math.round(c * 1e6)).join(',');
    if (!this.indice.has(k)) { this.indice.set(k, this.vertices.length); this.vertices.push(p); }
    return this.indice.get(k);
  }

  /* um triângulo de normal para o lado de `fora` */
  tri(a, b, c, volume, fora) {
    const n = cruz(sub(b, a), sub(c, a));
    const t = dot(n, fora) >= 0 ? [a, b, c] : [a, c, b];
    this.faces.push({ vertices: t.map((p) => this.v(p)), volume });
  }

  /* o polígono plano `anel` (com `furos`), triangulado, de normal para o lado de `fora` */
  plano(anel, furos, volume, fora) {
    const eixo = [0, 1, 2].sort((i, j) => Math.abs(fora[j]) - Math.abs(fora[i]))[0];
    const [i, j] = [0, 1, 2].filter((e) => e !== eixo);
    const todos = [...anel, ...furos.flat()];
    const buracos = []; let n = anel.length;
    for (const f of furos) { buracos.push(n); n += f.length; }
    const idx = earcut(todos.flatMap((p) => [p[i], p[j]]), buracos, 2);
    for (let k = 0; k < idx.length; k += 3) this.tri(todos[idx[k]], todos[idx[k + 1]], todos[idx[k + 2]], volume, fora);
  }

  caixa([x0, y0, z0], [x1, y1, z1], volume) {
    const p = (x, y, z) => [x ? x1 : x0, y ? y1 : y0, z ? z1 : z0];
    const lados = [
      [[p(0, 0, 0), p(0, 1, 0), p(0, 1, 1), p(0, 0, 1)], [-1, 0, 0]], [[p(1, 0, 0), p(1, 1, 0), p(1, 1, 1), p(1, 0, 1)], [1, 0, 0]],
      [[p(0, 0, 0), p(1, 0, 0), p(1, 0, 1), p(0, 0, 1)], [0, -1, 0]], [[p(0, 1, 0), p(1, 1, 0), p(1, 1, 1), p(0, 1, 1)], [0, 1, 0]],
      [[p(0, 0, 0), p(1, 0, 0), p(1, 1, 0), p(0, 1, 0)], [0, 0, -1]], [[p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1)], [0, 0, 1]],
    ];
    for (const [anel, fora] of lados) this.plano(anel, [], volume, fora);
  }

  /* o cilindro de eixo `eixo` (0, 1 ou 2), de `a` a `b` ao longo dele, no centro `c` dos outros dois eixos, com `n` lados */
  cilindro(eixo, a, b, c, raio, n, volume) {
    const [i, j] = [0, 1, 2].filter((e) => e !== eixo);
    const ponto = (k, t) => { const p = [0, 0, 0]; p[eixo] = t; p[i] = c[0] + raio * Math.cos((2 * Math.PI * k) / n); p[j] = c[1] + raio * Math.sin((2 * Math.PI * k) / n); return p; };
    const eixoV = [0, 0, 0];
    const centro = (t) => { const p = [0, 0, 0]; p[eixo] = t; p[i] = c[0]; p[j] = c[1]; return p; };
    for (let k = 0; k < n; k++) {
      const m = (k + 1) % n;
      const meio = ponto(k + 0.5, 0); const f = sub(meio, centro(0));
      this.tri(ponto(k, a), ponto(m, a), ponto(k, b), volume, f);
      this.tri(ponto(m, a), ponto(m, b), ponto(k, b), volume, f);
      eixoV[eixo] = 1;
      this.tri(centro(a), ponto(k, a), ponto(m, a), volume, eixoV.map((x) => -x));
      this.tri(centro(b), ponto(k, b), ponto(m, b), volume, eixoV);
    }
  }
}

const quadro = (malha, volumes) => ({ titulo: 'Caso', nota: '', ocultar: ['titulo', 'nota'], malha: { vertices: malha.vertices, faces: malha.faces }, volumes });
const cores = ['#c9d6e8', '#e8d2c9', '#cfe8c9'];

/** Os casos: `{ nome, painel }`, cada um uma peça pequena em milímetro. */
export function casosDaMedida() {
  const casos = [];
  {
    const m = new Malha(); m.caixa([0, 0, 0], [60, 40, 30], 'caixa');
    casos.push({ nome: 'caixa', painel: quadro(m, [{ id: 'caixa', cor: cores[0] }]) });
  }
  for (const lados of [24, 12]) {
    const m = new Malha();
    const [L, A, E] = [70, 56, 14];
    const furo = (z) => Array.from({ length: lados }, (_, k) => [35 + 10 * Math.cos((2 * Math.PI * k) / lados), 28 + 10 * Math.sin((2 * Math.PI * k) / lados), z]);
    m.plano([[0, 0, 0], [L, 0, 0], [L, A, 0], [0, A, 0]], [furo(0)], 'placa', [0, 0, -1]);
    m.plano([[0, 0, E], [L, 0, E], [L, A, E], [0, A, E]], [furo(E)], 'placa', [0, 0, 1]);
    for (const [anel, fora] of [
      [[[0, 0, 0], [L, 0, 0], [L, 0, E], [0, 0, E]], [0, -1, 0]], [[[0, A, 0], [L, A, 0], [L, A, E], [0, A, E]], [0, 1, 0]],
      [[[0, 0, 0], [0, A, 0], [0, A, E], [0, 0, E]], [-1, 0, 0]], [[[L, 0, 0], [L, A, 0], [L, A, E], [L, 0, E]], [1, 0, 0]],
    ]) m.plano(anel, [], 'placa', fora);
    for (let k = 0; k < lados; k++) {
      const [a, b] = [furo(0)[k], furo(0)[(k + 1) % lados]];
      const dentro = [35 - (a[0] + b[0]) / 2, 28 - (a[1] + b[1]) / 2, 0];
      m.tri(a, b, [a[0], a[1], E], 'placa', dentro);
      m.tri(b, [b[0], b[1], E], [a[0], a[1], E], 'placa', dentro);
    }
    casos.push({ nome: `caixa com furo de ${lados} lados`, painel: quadro(m, [{ id: 'placa', cor: cores[0] }]) });
  }
  {
    const m = new Malha(); m.caixa([0, 0, 0], [30, 20, 20], 'a'); m.caixa([30, 0, 0], [60, 20, 20], 'b');
    casos.push({ nome: 'duas caixas encostadas', painel: quadro(m, [{ id: 'a', cor: cores[0] }, { id: 'b', cor: cores[1] }]) });
  }
  {
    const m = new Malha(); m.caixa([0, 0, 0], [30, 20, 20], 'a'); m.caixa([30, 0, 0], [60, 20, 10], 'b');
    casos.push({ nome: 'duas caixas com degrau', painel: quadro(m, [{ id: 'a', cor: cores[0] }, { id: 'b', cor: cores[1] }]) });
  }
  {
    const m = new Malha(); m.cilindro(0, 0, 120, [0, 0], 0.6, 16, 'fio');
    casos.push({ nome: 'cilindro fino', painel: quadro(m, [{ id: 'fio', cor: cores[2] }]) });
  }
  return casos;
}

/* A camada copiada, para plantar e tirar traço sem mexer na do desenho que outra prova ainda usa. */
const copiar = (v) => JSON.parse(JSON.stringify(v));

/** O desenho do caso numa vista: `{ entrada, r, triangulos }`. */
export function desenharCaso(caso, vista) {
  const entrada = { vista, paineis: [caso.painel] };
  const r = desenharBlocagem(entrada, { camada: true });
  return { entrada, r, triangulos: triangulosDaBlocagem(entrada, r) };
}

/* O traço mais comprido da camada (em pixels do quadro), para tirar. */
function tracoMaisLongo(camada) {
  let melhor = null;
  camada.formas.forEach((f, fi) => f.tracos.forEach((t, ti) => {
    for (let i = 0; i + 1 < t.length; i++) {
      const c = Math.hypot(t[i + 1][0] - t[i][0], t[i + 1][1] - t[i][1]);
      if (!melhor || c > melhor.comprimento) melhor = { fi, ti, comprimento: c, a: t[i], b: t[i + 1], segmentos: t.length - 1 };
    }
  }));
  return melhor;
}

/** O desenho com o traço mais comprido tirado, e com ele os que passam a menos de um pixel dele nas duas pontas (o que a vista de
 *  frente de duas caixas faz coincidir): a aresta inteira fica sem fita. */
export function comTracoTirado(r) {
  const c = copiar(r.camada);
  const t = tracoMaisLongo(c);
  const dx = t.b[0] - t.a[0]; const dy = t.b[1] - t.a[1]; const n2 = dx * dx + dy * dy;
  const distancia = (p) => {
    const u = Math.max(0, Math.min(1, ((p[0] - t.a[0]) * dx + (p[1] - t.a[1]) * dy) / n2));
    return Math.hypot(p[0] - (t.a[0] + u * dx), p[1] - (t.a[1] + u * dy));
  };
  for (const forma of c.formas) {
    const tracos = []; const inclinacoes = [];
    forma.tracos.forEach((tr, ti) => {
      for (let i = 0; i + 1 < tr.length; i++) {
        if (distancia(tr[i]) < 1 && distancia(tr[i + 1]) < 1) continue;
        tracos.push([tr[i], tr[i + 1]]);
        if (forma.inclinacoes) inclinacoes.push([forma.inclinacoes[ti][i]]);
      }
    });
    forma.tracos = tracos;
    if (forma.inclinacoes) forma.inclinacoes = inclinacoes;
  }
  return { r: { ...r, camada: c }, tirado: t };
}

/** O desenho com um traço a mais: `afastamento` pixels do quadro ao lado do traço mais comprido, e do mesmo comprimento. */
export function comTracoPlantado(r, afastamento) {
  const c = copiar(r.camada);
  const t = tracoMaisLongo(c);
  const dx = t.b[0] - t.a[0]; const dy = t.b[1] - t.a[1]; const n = Math.hypot(dx, dy);
  const nx = -dy / n; const ny = dx / n;
  const forma = c.formas[t.fi];
  const z = c.zMax;
  forma.tracos.push([[t.a[0] + nx * afastamento, t.a[1] + ny * afastamento, z], [t.b[0] + nx * afastamento, t.b[1] + ny * afastamento, z]]);
  forma.inclinacoes?.push([[Array(16).fill(0), 0, 0]]);
  return { r: { ...r, camada: c }, plantado: { de: [t.a[0] + nx * afastamento, t.a[1] + ny * afastamento], ate: [t.b[0] + nx * afastamento, t.b[1] + ny * afastamento], comprimento: n } };
}

/** As provas da medida: devolve a lista `{ nome, ok, texto }`. Cada caso, em cada vista: zero no desenho certo; o traço plantado a mais
 *  longe da aresta (quatro tolerâncias) é vazamento, em grupos que ficam sobre o traço plantado, e o plantado a um quarto da tolerância dela não
 *  é; o traço tirado é falha, em grupos sobre a aresta tirada. */
export async function provarAMedida({ navegador, vistas = VISTAS_DO_CONJUNTO, aoProvar = null } = {}) {
  const resultados = [];
  const registrar = (nome, ok, texto) => { const x = { nome, ok, texto }; resultados.push(x); aoProvar?.(x); };
  for (const caso of casosDaMedida()) {
    for (const vista of vistas) {
      const { r, triangulos } = desenharCaso(caso, vista);
      const onde = `${caso.nome}, ${vista}`;
      const fator = LARGURA_DAS_VISTAS / r.largura;
      const certo = await medirDesenho({ r, triangulos, navegador });
      registrar(`${onde}: desenho certo`, certo.vazamento.pixels === 0 && certo.falha.pixels === 0 && certo.tracos > 0 && certo.arestas > 0, `vazamento ${certo.vazamento.pixels} px, falha ${certo.falha.pixels} px (traços ${certo.tracos} px, arestas ${certo.arestas} px)`);
      /* a caixa do segmento no PNG, com a folga da fita e da tolerância, onde os grupos acusados têm de ficar */
      const sobre = (g, de, ate) => {
        const f = (v) => v * fator; const m = 2 + certo.tolerancia;
        return g.centro[0] >= Math.min(f(de[0]), f(ate[0])) - m && g.centro[0] <= Math.max(f(de[0]), f(ate[0])) + m
          && g.centro[1] >= Math.min(f(de[1]), f(ate[1])) - m && g.centro[1] <= Math.max(f(de[1]), f(ate[1])) + m;
      };

      const longe = comTracoPlantado(r, (4 * certo.tolerancia) / fator);
      const a = await medirDesenho({ r: longe.r, triangulos, navegador, reaproveitar: certo });
      registrar(`${onde}: traço plantado a ${4 * certo.tolerancia} px da aresta`,
        a.vazamento.pixels > 0 && a.falha.pixels === 0 && a.vazamento.grupos.every((g) => sobre(g, longe.plantado.de, longe.plantado.ate)),
        `vazamento ${a.vazamento.pixels} px em ${a.vazamento.grupos.length} grupos, falha ${a.falha.pixels} px`);

      const perto = comTracoPlantado(r, (0.25 * certo.tolerancia) / fator);
      const b = await medirDesenho({ r: perto.r, triangulos, navegador, reaproveitar: certo });
      registrar(`${onde}: traço plantado a ${0.25 * certo.tolerancia} px da aresta, dentro da tolerância`, b.vazamento.pixels === 0 && b.falha.pixels === 0, `vazamento ${b.vazamento.pixels} px, falha ${b.falha.pixels} px`);

      const tirado = comTracoTirado(r);
      const c = await medirDesenho({ r: tirado.r, triangulos, navegador, reaproveitar: certo });
      registrar(`${onde}: traço tirado`,
        c.falha.pixels > 0 && c.vazamento.pixels === 0 && c.falha.grupos.every((g) => sobre(g, tirado.tirado.a, tirado.tirado.b)),
        `falha ${c.falha.pixels} px em ${c.falha.grupos.length} grupos, vazamento ${c.vazamento.pixels} px`);
    }
  }
  return resultados;
}

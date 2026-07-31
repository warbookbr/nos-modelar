/* normais-lisas.test.ts — a borda do furo serrilhava na bancada, e a peça não
   tinha culpa: o `freio-disco` já usa 12 lados no furo do prisioneiro e já marca
   a parede como `liso`. A culpa era do ADAPTADOR, em duas causas medidas, e este
   arquivo é a afirmação de cada uma.

   CAUSA 1 — `liso` nunca chegava ao renderizador. Das 540 faces do freio, 172
   estão marcadas `liso`, e ainda assim 100% dos triângulos saíam com normal
   CHAPADA: `computeVertexNormals()` numa geometria NÃO INDEXADA devolve, por
   definição, a normal do triângulo repetida nos três cantos. O adaptador nunca
   leu `face.liso`. Isso é SOMBREADO.

   CAUSA 2 — a borda saía com triângulo virado. O adaptador triangulava todo
   n-gon em LEQUE a partir do canto 0, e leque só vale em polígono convexo. Numa
   placa com um furo de 12 lados, 4 das 12 faces da borda são quads CÔNCAVOS: o
   leque produzia neles um triângulo de área negativa (normal invertida, com
   `DoubleSide` iluminado pelo lado errado) que ainda por cima cobria área FORA
   do polígono e deixava o reflexo descoberto. Isso é GEOMETRIA, não sombreado.

   As afirmações e a mutação que mata cada uma:
   - `liso` suaviza — morre se o adaptador voltar a ignorar a marca;
   - face CHAPADA não entra na soma — morre se a soma varrer todas as faces (a
     tampa do cilindro entortaria a normal da lateral, e a borda do furo borraria
     a quina contra a parede);
   - a borda é triangulada em ORELHAS — morre se a triangulação voltar a ser
     leque, pela normal virada e pela área que passa da área do anel.

   O que este arquivo NÃO afirma, porque não é verdade: que a SILHUETA do furo
   fique redonda. O contorno continua o polígono de `lados` arestas que a malha
   tem, e quem quiser mais volta pede mais `lados`. */
import { describe, it, expect } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/fps/v3/motor/oficina.js';
// @ts-expect-error — adaptador em JavaScript, exercitado em runtime pelo Vitest.
import { adaptarThree } from '../../src/autoria/adaptar-three.js';

const LADOS = 12;

/** normais da malha de uma parte, agrupadas em trios (um trio = um triângulo). */
function trianguloseNormais(neutro: any, parte: string) {
  const { partes } = adaptarThree(neutro, { nome: 'fixture' });
  const grupo = partes.get(parte);
  expect(grupo, `a parte '${parte}' não existe na peça`).toBeTruthy();
  const trios: number[][][] = [];
  for (const malha of grupo.children) {
    const n = malha.geometry.getAttribute('normal');
    expect(n, 'a malha saiu sem atributo normal').toBeTruthy();
    for (let t = 0; t < n.count; t += 3) {
      trios.push([0, 1, 2].map((k) => [n.getX(t + k), n.getY(t + k), n.getZ(t + k)]));
    }
  }
  return trios;
}

const chapado = (tri: number[][]) =>
  [1, 2].every((k) => tri[k].every((c, i) => Math.abs(c - tri[0][i]) < 1e-6));

const unitario = (v: number[]) => Math.hypot(v[0], v[1], v[2]);

/* um cilindro com a LATERAL lisa e as TAMPAS chapadas: o caso mínimo em que as
   duas metades da regra se contradizem se a soma for indiscriminada. */
const TODOS = { passo: 1, fase: 0 };   // "todos os índices desta família"
const CILINDRO = 40;
const cilindro = (comLiso: boolean) => nucleo([
  ['cilindro', { origemId: CILINDRO, raio: 1, altura: 2, lados: LADOS }],
  ['parte', { nome: 'tubo', sel: { origem: { op: 'cilindro', id: CILINDRO } } }],
  /* `{op:'cilindro', id}` sem família é a LATERAL; as tampas se citam por
     `tampa`, e aqui elas precisam de nome para entrar na medição. */
  ['parte', { nome: 'tampas', sel: { origem: { op: 'cilindro', id: CILINDRO, tampa: 'topo' } } }],
  ['parte', { nome: 'tampas', sel: { origem: { op: 'cilindro', id: CILINDRO, tampa: 'fundo' } } }],
  ...(comLiso ? [['liso', { sel: { origem: { op: 'cilindro', id: CILINDRO, lado: TODOS } } }]] : []),
], {}, {});

/* uma placa com UM furo passante de 12 lados: a PAREDE fica lisa, a BORDA (o
   anel coplanar com a face de entrada) fica chapada. É o desenho do assento de
   prisioneiro do freio, reduzido ao osso. */
const CUBO = 10;
const FURO = 20;
const placa = (comLiso: boolean) => nucleo([
  ['cubo', { origemId: CUBO, lado: 2 }],
  /* a identidade vem ANTES do corte: o que o furo criar herda `parte` da face
     de entrada, e depois a parede e a borda ganham nome próprio. */
  ['parte', { nome: 'resto', sel: { origem: { op: 'cubo', id: CUBO } } }],
  ['furo', {
    origemId: FURO,
    de: { op: 'cubo', id: CUBO, face: 'topo' },
    saida: { op: 'cubo', id: CUBO, face: 'fundo' },
    centro: [0, 0, 0],
    raio: 0.5,
    lados: LADOS,
  }],
  ['parte', { nome: 'parede', substituir: true, sel: { origem: { op: 'furo', id: FURO, parede: TODOS } } }],
  ['parte', { nome: 'borda', substituir: true, sel: { origem: { op: 'furo', id: FURO, borda: TODOS } } }],
  ...(comLiso ? [['liso', { sel: { origem: { op: 'furo', id: FURO, parede: TODOS } } }]] : []),
], {}, {});

describe('a marca `liso` chega à normal do renderizador', () => {
  it('sem `liso` nenhum triângulo é suave — o comportamento antigo, byte por byte', () => {
    const neutro = cilindro(false);
    const trios = [...trianguloseNormais(neutro, 'tubo'), ...trianguloseNormais(neutro, 'tampas')];
    expect(trios.length).toBe(2 * LADOS + 2 * (LADOS - 2));
    expect(trios.filter(chapado).length).toBe(trios.length);
  });

  it('com `liso` na lateral, a lateral vira suave e as tampas continuam chapadas', () => {
    const neutro = cilindro(true);
    const trios = [...trianguloseNormais(neutro, 'tubo'), ...trianguloseNormais(neutro, 'tampas')];
    const suaves = trios.filter((t) => !chapado(t));
    /* a lateral do cilindro são LADOS quadriláteros = 2·LADOS triângulos, e
       todos eles têm os três cantos com normais diferentes entre si. */
    expect(suaves.length).toBe(2 * LADOS);
    /* as tampas são dois leques de LADOS−2 triângulos cada, e continuam chapadas
       porque `liso` não as tocou. */
    expect(trios.length - suaves.length).toBe(2 * (LADOS - 2));
  });

  it('a normal suave da lateral é RADIAL: a tampa chapada não entra na soma', () => {
    const trios = trianguloseNormais(cilindro(true), 'tubo');
    const cantosSuaves = trios.filter((t) => !chapado(t)).flat();
    expect(cantosSuaves.length).toBe(3 * 2 * LADOS);
    for (const v of cantosSuaves) {
      /* radial = sem componente no eixo do cilindro (Y). Se a soma varresse
         todas as faces, a tampa (normal ±Y) puxaria isto para longe de zero. */
      expect(Math.abs(v[1])).toBeLessThan(1e-6);
      expect(unitario(v)).toBeCloseTo(1, 6);
    }
  });

  it('as tampas guardam a normal exata ±Y mesmo com a lateral lisa ao lado', () => {
    const chapados = trianguloseNormais(cilindro(true), 'tampas').filter(chapado);
    expect(chapados.length).toBe(2 * (LADOS - 2));
    for (const t of chapados) {
      expect(Math.abs(t[0][0])).toBeLessThan(1e-6);
      expect(Math.abs(t[0][2])).toBeLessThan(1e-6);
      expect(Math.abs(Math.abs(t[0][1]) - 1)).toBeLessThan(1e-6);
    }
  });

  it('a parede do furo suaviza e a borda do furo NÃO — a quina do contorno sobrevive', () => {
    const neutro = placa(true);
    const parede = trianguloseNormais(neutro, 'parede');
    expect(parede.length).toBe(2 * LADOS);
    expect(parede.filter(chapado).length).toBe(0);

    const borda = trianguloseNormais(neutro, 'borda');
    expect(borda.length).toBeGreaterThan(0);
    expect(borda.filter(chapado).length).toBe(borda.length);
    /* a borda é coplanar com a face de entrada (topo, +Y). Se a parede lisa
       vazasse para ela, esta normal deixaria de ser exatamente +Y. */
    for (const t of borda) {
      expect(t[0][0]).toBeCloseTo(0, 9);
      expect(t[0][1]).toBeCloseTo(1, 9);
      expect(t[0][2]).toBeCloseTo(0, 9);
    }
  });

  it('a borda do furo é triangulada em ORELHAS: a área dos triângulos é a área do polígono', () => {
    const neutro = placa(true);
    /* soma das áreas dos triângulos que o adaptador emite para a borda… */
    const { partes } = adaptarThree(neutro, { nome: 'fixture' });
    let areaTriangulos = 0;
    for (const malha of partes.get('borda').children) {
      const p = malha.geometry.getAttribute('position');
      for (let t = 0; t < p.count; t += 3) {
        const c = [0, 1, 2].map((k) => [p.getX(t + k), p.getY(t + k), p.getZ(t + k)]);
        const u = [c[1][0] - c[0][0], c[1][1] - c[0][1], c[1][2] - c[0][2]];
        const v = [c[2][0] - c[0][0], c[2][1] - c[0][1], c[2][2] - c[0][2]];
        areaTriangulos += unitario([
          u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0],
        ]) / 2;
      }
    }
    /* …contra a área do anel, que é a face de entrada menos o disco de 12 lados
       do furo, os dois em conta fechada e não em amostra. */
    const raio = 0.5, ladoDoCubo = 2;
    const areaDoAnel = ladoDoCubo * ladoDoCubo - (LADOS / 2) * raio * raio * Math.sin((2 * Math.PI) / LADOS);
    /* o leque a partir do canto 0 emitia, nos 4 quads CÔNCAVOS da borda, um
       triângulo de área NEGATIVA contado como positivo: a soma passava da área
       do anel. Se a triangulação voltar a ser leque, esta igualdade morre. */
    expect(areaTriangulos).toBeCloseTo(areaDoAnel, 6);
  });

  it('sem `liso` a parede do furo é 100% chapada — a serrilha medida antes do conserto', () => {
    const parede = trianguloseNormais(placa(false), 'parede');
    expect(parede.length).toBe(2 * LADOS);
    expect(parede.filter(chapado).length).toBe(parede.length);
  });

  it('a normal suave da parede é radial ao eixo do furo, e o furo desce em −Y', () => {
    const parede = trianguloseNormais(placa(true), 'parede');
    for (const v of parede.flat()) {
      expect(Math.abs(v[1])).toBeLessThan(1e-6);
      expect(unitario(v)).toBeCloseTo(1, 6);
    }
  });
});

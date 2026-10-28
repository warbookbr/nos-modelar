/* recortar-arco.test.mjs — `recortarArcoNoPerfil`: o arco poligonal recortado na borda de baixo do contorno, com a fusão do corte que
   cai perto de um vértice.

   O ATRITO. A perua recortava o arco da roda com um auxiliar copiado de receita em receita (`arcoNoPerfil`). Ele é correto, mas o
   corte que cai a 0,5 mm de um vértice do perfil deixa uma aresta de 0,5 mm, e a extrusão de 2010 mm vira uma lateral de razão
   2,5e-4 que o `conferir-malha` reprova (a 5 mm, ainda 2,5e-3). A geometria é verdadeira, a aresta curta existe no perfil, e o que
   faltava era uma função geral que funda o corte com o vértice abaixo de uma distância declarada. */
import { describe, expect, it } from 'vitest';
import { diagnosticarContorno, areaDoContorno } from './contorno.js';
import { recortarArcoNoPerfil } from './curva2d.js';
import { nucleo } from './entrada.js';
import { analisarTopologia } from './topologia.js';

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const arestas = (c) => c.map((p, k) => dist(p, c[(k + 1) % c.length]));
const menorAresta = (c) => Math.min(...arestas(c));

/* Cópia do auxiliar que as receitas tinham, só para provar que a função geral dá os mesmos pontos quando não há lasca. */
function arcoNoPerfilAntigo(zc, yc, r, yBase, lados) {
  const ang = (k) => Math.PI - (k * 2 * Math.PI) / lados - Math.PI / lados;
  const V = [];
  for (let k = -1; k <= lados / 2; k += 1) { const a = ang(k); V.push([zc + r * Math.cos(a), yc + r * Math.sin(a)]); }
  const pts = [];
  for (let i = 0; i + 1 < V.length; i += 1) {
    const [z0, y0] = V[i]; const [z1, y1] = V[i + 1];
    const corta = (z0 + ((yBase - y0) * (z1 - z0)) / (y1 - y0));
    if (y0 < yBase && y1 >= yBase) pts.push([corta, yBase]);
    if (y1 >= yBase) pts.push([z1, y1]);
    if (y0 >= yBase && y1 < yBase) pts.push([corta, yBase]);
  }
  return pts;
}

/* O perfil lateral (z, y) da perua, da frente pelo topo até a traseira; o fundo fecha em y 198. */
const LADO = [[2282, 198], [2342, 724], [2342, 980], [1180, 1110], [470, 1580], [-1900, 1580], [-2342, 1190], [-2342, 724], [-2292, 198]];
const ARCO = { raio: 445, lados: 8, base: 198 };

describe('recortarArcoNoPerfil', () => {
  it('dá os pontos do auxiliar antigo da perua, na mesma ordem, quando o corte não cai perto de vértice nenhum', () => {
    const tras = recortarArcoNoPerfil(LADO, { ...ARCO, centro: [-1322, 345] });
    const dois = recortarArcoNoPerfil(tras, { ...ARCO, centro: [1322, 345] });
    const esperado = [...LADO, ...arcoNoPerfilAntigo(-1322, 345, 445, 198, 8), ...arcoNoPerfilAntigo(1322, 345, 445, 198, 8)];
    expect(dois).toHaveLength(esperado.length);
    dois.forEach((p, k) => { expect(dist(p, esperado[k])).toBeLessThan(1e-6); });
    expect(diagnosticarContorno(dois)).toBeNull();
    expect(areaDoContorno(dois)).toBeGreaterThan(0);
  });

  it('o recorte tira exatamente a área do arco acima da base', () => {
    const corpo = [[0, 198], [4000, 198], [4000, 1400], [0, 1400]];
    const cortado = recortarArcoNoPerfil(corpo, { centro: [2000, 345], raio: 445, lados: 8, base: 198 });
    const cadeia = arcoNoPerfilAntigo(2000, 345, 445, 198, 8);
    /* a cadeia, fechada pela corda na base, é o arco acima da base (percorrida da esquerda para a direita por cima, ela é horária) */
    expect(areaDoContorno(corpo) - areaDoContorno(cortado)).toBeCloseTo(-areaDoContorno(cadeia), 4);
    expect(cortado).toHaveLength(4 + cadeia.length);
  });

  it('aceita o contorno horário, devolve anti-horário e não altera a entrada', () => {
    const corpo = [[0, 0], [4000, 0], [4000, 1200], [0, 1200]];
    const horario = [...corpo].reverse().map((p) => [...p]);
    const copia = JSON.stringify(horario);
    const dele = recortarArcoNoPerfil(horario, { centro: [2000, 345], raio: 445, lados: 8, base: 0 });
    expect(JSON.stringify(horario)).toBe(copia);
    expect(areaDoContorno(dele)).toBeGreaterThan(0);
    const doAntiHorario = recortarArcoNoPerfil(corpo, { centro: [2000, 345], raio: 445, lados: 8, base: 0 });
    expect(areaDoContorno(dele)).toBeCloseTo(areaDoContorno(doAntiHorario), 9);
    expect(dele).toHaveLength(doAntiHorario.length);
  });

  it('é determinística: a mesma entrada dá a mesma lista', () => {
    const corpo = [[0, 0], [4000, 0], [4000, 1200], [0, 1200]];
    const f = () => JSON.stringify(recortarArcoNoPerfil(corpo, { centro: [2000, 345], raio: 445, lados: 8, base: 0, fundirAbaixoDe: 2 }));
    expect(f()).toBe(f());
  });
});

describe('o caso 7: o corte a 0,5 mm de um vértice do perfil', () => {
  /* O corte esquerdo do arco, sem fusão, cai em xCorte; o perfil ganha um vértice na base a 0,5 mm dele. */
  const corpo = [[0, 0], [4000, 0], [4000, 1200], [0, 1200]];
  const arco = { centro: [2000, 345], raio: 445, lados: 8, base: 0 };
  const xCorte = recortarArcoNoPerfil(corpo, arco)[1][0];
  const comVertice = [[0, 0], [xCorte - 0.5, 0], [4000, 0], [4000, 1200], [0, 1200]];
  const extrudar = (perfil) => {
    const m = nucleo([['extrusao', { origemId: 1, perfil: perfil.map(([x, y]) => [x / 1000, y / 1000]), altura: 2.01 }]], {});
    expect(m.orfaos).toEqual([]);
    return analisarTopologia({ vertices: m.V, faces: m.F });
  };
  const codigos = (t) => (t.achados ?? t.problemas ?? t.itens ?? []).map((a) => a.codigo);

  it('sem fusão a aresta de 0,5 mm fica no contorno, e a extrusão vira lateral de lasca que a topologia reprova', () => {
    const cru = recortarArcoNoPerfil(comVertice, arco);
    expect(menorAresta(cru)).toBeCloseTo(0.5, 6);
    expect(codigos(extrudar(cru))).toContain('face-fina');
  });

  it('com fundirAbaixoDe de 1 mm nenhuma aresta fica abaixo de 1 mm, e a extrusão não tem face fina', () => {
    const fundido = recortarArcoNoPerfil(comVertice, { ...arco, fundirAbaixoDe: 1 });
    expect(menorAresta(fundido)).toBeGreaterThanOrEqual(1);
    expect(diagnosticarContorno(fundido)).toBeNull();
    expect(codigos(extrudar(fundido))).not.toContain('face-fina');
    /* o corte funde com o vértice: o contorno perdeu o ponto de corte, e a forma mudou menos que 1 mm */
    expect(fundido).toHaveLength(recortarArcoNoPerfil(comVertice, arco).length - 1);
    const sem = recortarArcoNoPerfil(comVertice, arco);
    const diferenca = Math.abs(areaDoContorno(fundido) - areaDoContorno(sem));
    expect(diferenca).toBeLessThan(1 * 445);
  });

  it('a fusão vale também do lado direito', () => {
    const xDireito = recortarArcoNoPerfil(corpo, arco).at(-4)[0];
    const perfil = [[0, 0], [xDireito + 0.5, 0], [4000, 0], [4000, 1200], [0, 1200]];
    expect(menorAresta(recortarArcoNoPerfil(perfil, arco))).toBeCloseTo(0.5, 6);
    const fundido = recortarArcoNoPerfil(perfil, { ...arco, fundirAbaixoDe: 1 });
    expect(menorAresta(fundido)).toBeGreaterThanOrEqual(1);
    expect(diagnosticarContorno(fundido)).toBeNull();
  });

  it('o vértice do arco a menos de fundirAbaixoDe da base sai, e o arco parte do ponto de corte', () => {
    /* a base 0,3 mm abaixo dos dois vértices mais baixos do arco, que ficam a 0,42 mm de cada ponto de corte ao longo da aresta */
    const yVertice = 345 + 445 * Math.sin(Math.PI - 7 * (Math.PI / 4) - Math.PI / 8);
    const base = yVertice - 0.3;
    const baixo = [[0, base], [4000, base], [4000, 1400], [0, 1400]];
    const rente = recortarArcoNoPerfil(baixo, { ...arco, base });
    expect(menorAresta(rente)).toBeCloseTo(0.3 * Math.SQRT2, 6);
    const fundido = recortarArcoNoPerfil(baixo, { ...arco, base, fundirAbaixoDe: 1 });
    expect(menorAresta(fundido)).toBeGreaterThanOrEqual(1);
    expect(fundido).toHaveLength(rente.length - 2);
    expect(diagnosticarContorno(fundido)).toBeNull();
    /* os pontos de corte continuam na base, e a fusão não mexe neles */
    expect(fundido.filter((p) => Math.abs(p[1] - base) < 1e-6)).toHaveLength(2 + 2);
  });

  it('o corte sobre o vértice, a 1e-12, funde sem declaração: não sobra aresta de comprimento zero', () => {
    const exato = [[0, 0], [xCorte + 1e-12, 0], [4000, 0], [4000, 1200], [0, 1200]];
    const r = recortarArcoNoPerfil(exato, arco);
    expect(diagnosticarContorno(r)).toBeNull();
    expect(menorAresta(r)).toBeGreaterThan(1);
  });
});

describe('recusas', () => {
  const corpo = [[0, 0], [4000, 0], [4000, 1200], [0, 1200]];
  const arco = { centro: [2000, 345], raio: 445, lados: 8, base: 0 };

  it('o arco que não cruza a base diz o intervalo de y dele', () => {
    expect(() => recortarArcoNoPerfil(corpo, { ...arco, base: -1000 })).toThrow(/não cruza a linha da base y = -1000/);
    expect(() => recortarArcoNoPerfil(corpo, { ...arco, centro: [2000, 5000] })).toThrow(/não cruza a linha da base/);
  });

  it('o corte fora da aresta de base diz as arestas de base que existem', () => {
    expect(() => recortarArcoNoPerfil(corpo, { ...arco, centro: [100, 345] })).toThrow(/nenhuma aresta horizontal do perfil em y = 0 contém o trecho cortado.*as arestas de base são x 0 a 4000/);
    expect(() => recortarArcoNoPerfil(corpo, { ...arco, base: 300 })).toThrow(/nenhuma aresta horizontal do perfil em y = 300/);
  });

  it('o arco que atravessa o topo do perfil deixa de ser polígono simples e é recusado com o diagnóstico', () => {
    const baixo = [[0, 0], [4000, 0], [4000, 300], [0, 300]];
    expect(() => recortarArcoNoPerfil(baixo, arco)).toThrow(/não deixa um polígono simples/);
  });

  it('o arco inteiro que some na fusão é recusado', () => {
    expect(() => recortarArcoNoPerfil(corpo, { ...arco, fundirAbaixoDe: 2000 })).toThrow(/some na fusão/);
  });

  it('valida os argumentos', () => {
    expect(() => recortarArcoNoPerfil([[0, 0], [1, 0]], arco)).toThrow(/3 pontos/);
    expect(() => recortarArcoNoPerfil(corpo, { ...arco, centro: [1] })).toThrow(/"centro"/);
    expect(() => recortarArcoNoPerfil(corpo, { ...arco, raio: 0 })).toThrow(/"raio"/);
    expect(() => recortarArcoNoPerfil(corpo, { ...arco, lados: 2 })).toThrow(/"lados"/);
    expect(() => recortarArcoNoPerfil(corpo, { ...arco, base: NaN })).toThrow(/"base"/);
    expect(() => recortarArcoNoPerfil(corpo, { ...arco, fundirAbaixoDe: -1 })).toThrow(/"fundirAbaixoDe"/);
    expect(() => recortarArcoNoPerfil(corpo)).toThrow(/"centro"|"perfil"/);
  });
});

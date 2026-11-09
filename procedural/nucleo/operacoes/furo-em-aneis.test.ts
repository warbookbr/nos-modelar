/* furo-em-aneis.test.ts — a fatia 4 do plano "costuras e furos limpos": o `furo` lê uma região plana de várias faces (a tampa em leque do `lathe`)
   como face de entrada ou de saída, e refaz em anéis a face furada de contorno denso (48 cantos ou mais). */
import { describe, it, expect } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../entrada.js';
import { conferirMalha } from '../../../tools/oficina/conferir-malha.js';
// @ts-expect-error — adaptador em JavaScript.
import { adaptarThree } from '../../../src/autoria/adaptar-three.js';
// @ts-expect-error — régua de malha em JavaScript.
import { medirTrianguloFino } from '../../../tools/modelar/reguas-de-malha/triangulo-fino.mjs';

const m = (mm: number) => mm / 1000;
const R = m(77), E = m(43);
const PERFIL = [[0, 0], [R, 0], [R, E], [0, E]];
const lathe = (lados = 96, perfil: number[][] = PERFIL) => ['lathe', { origemId: 1, lados, eixo: 'x', perfil }];
const furo = (extra: any) => ['furo', { origemId: 2, lados: 18, ...extra }];
const CEGO = { de: { op: 'lathe', id: 1, faixa: 2 }, centros: [{ centro: [E, 0, 0], raio: m(15), profundidade: m(6) }] };
const PASSANTE = {
  de: { op: 'lathe', id: 1, faixa: 2 }, saida: { op: 'lathe', id: 1, faixa: 0 },
  centros: [{ centro: [E, 0, 0], raio: m(15) }, { pivo: [E, 0, 0], distancia: m(55), total: 4, volta: 360, raio: m(4) }],
};

const tampaDe = (n: any) => [...n.F.values()].filter((f: any) => f.vs.every((v: number) => Math.abs(n.V.get(v)[0] - E) < 1e-12)).map((f: any) => f.id).sort((a: number, b: number) => a - b);
const motivos = (n: any) => n.orfaos.map((o: any) => o.motivo);

describe('furo: região plana como entrada', () => {
  it('a tampa em leque do lathe (96 faces) é a entrada de um furo cego: casca fechada, sem órfão, sem vértice solto', () => {
    const n = nucleo([lathe(), furo(CEGO)] as any, {}, {});
    expect(n.orfaos).toEqual([]);
    conferirMalha(n, { fechada: true, rotulo: 'furo cego na tampa em leque' });
    const usados = new Set();
    for (const f of n.F.values()) for (const v of f.vs) usados.add(v);
    expect([...n.V.keys()].filter((v) => !usados.has(v))).toEqual([]);
  });

  it('o furo passante entre as duas tampas em leque fecha a casca, com cinco furos', () => {
    const n = nucleo([lathe(), furo(PASSANTE)] as any, {}, {});
    expect(n.orfaos).toEqual([]);
    conferirMalha(n, { fechada: true, rotulo: 'furo passante entre duas tampas em leque' });
  });

  it('um conjunto que não é região plana continua recusado, com a contagem das faces vivas', () => {
    const n = nucleo([lathe(), furo({ ...CEGO, de: { op: 'lathe', id: 1, faixa: 1 } })] as any, {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(motivos(n)[0]).toMatch(/EXATAMENTE uma face, ou para uma região plana.*resolveu para 96 face\(s\) viva\(s\)/);
  });

  it('o resultado é determinístico: duas execuções dão a mesma malha', () => {
    const a = nucleo([lathe(), furo(PASSANTE)] as any, {}, {});
    const b = nucleo([lathe(), furo(PASSANTE)] as any, {}, {});
    expect(JSON.stringify([...a.V])).toBe(JSON.stringify([...b.V]));
    expect(JSON.stringify([...a.F].map(([id, f]: any) => [id, f.vs]))).toBe(JSON.stringify([...b.F].map(([id, f]: any) => [id, f.vs])));
  });
});

describe('furo: o que a região recusa', () => {
  const tampa = tampaDe(nucleo([lathe()] as any, {}, {}));

  it('face da tampa já apagada: sem exceção, e a mensagem não conta a face apagada', () => {
    const faceDoMeio = tampa[5];
    let n: any;
    expect(() => { n = nucleo([lathe(), ['apagaFace', { sel: { f: [faceDoMeio] } }], furo(CEGO)] as any, {}, {}); }).not.toThrow();
    expect(n.orfaos).toHaveLength(1);
    expect(motivos(n)[0]).toMatch(/^entrada: .*CÔNCAVO/);
  });

  it('a face de menor id apagada (o furo cita a origem inteira): sem exceção', () => {
    let n: any;
    expect(() => { n = nucleo([lathe(), ['apagaFace', { sel: { f: [tampa[0]] } }], furo(CEGO)] as any, {}, {}); }).not.toThrow();
    expect(n.orfaos).toHaveLength(1);
  });

  it('a tampa inteira apagada: a origem não resolve e o furo grita, sem exceção', () => {
    let n: any;
    expect(() => { n = nucleo([lathe(), ['apagaFace', { sel: { origem: { op: 'lathe', id: 1, faixa: 2 } } }], furo(CEGO)] as any, {}, {}); }).not.toThrow();
    expect(n.orfaos.length).toBeGreaterThan(0);
  });

  it('cor misturada na região: recusa, e nomeia o atributo', () => {
    const impares = tampa.filter((_: number, k: number) => k % 2 === 1);
    const n = nucleo([lathe(), ['pincel', { cor: '#ff0000', sel: { f: impares } }], furo(CEGO)] as any, {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(motivos(n)[0]).toMatch(/mistura cor/);
  });

  it('cor só na face de menor id: recusa (as faces novas herdariam a cor dela e pintariam a tampa inteira)', () => {
    const n = nucleo([lathe(), ['pincel', { cor: '#ff0000', sel: { f: [tampa[0]] } }], furo(CEGO)] as any, {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(motivos(n)[0]).toMatch(/mistura cor/);
  });

  it('partes diferentes na região: recusa, e nomeia o atributo', () => {
    const n = nucleo([lathe(), ['parte', { nome: 'a', sel: { f: tampa.filter((_: number, k: number) => k % 2 === 0) } }], ['parte', { nome: 'b', sel: { f: tampa.filter((_: number, k: number) => k % 2 === 1) } }], furo(CEGO)] as any, {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(motivos(n)[0]).toMatch(/mistura parte/);
  });

  it('região com buraco (a tampa de um tubo): recusa, sem abrir a casca', () => {
    const tubo = [[m(10), 0], [R, 0], [R, E], [m(10), E], [m(10), 0]];
    const n = nucleo([lathe(96, tubo), furo({ ...CEGO, centros: [{ centro: [E, m(40), 0], raio: m(5), profundidade: m(6) }] })] as any, {}, {});
    expect(motivos(n).join('|')).toMatch(/mais de uma volta .*região com buraco/);
    expect(n.F.size).toBeGreaterThan(0);
  });

  it('duas metades do leque (uma face apagada de cada lado): recusa, porque as faces que sobram não formam o grupo coplanar ligado', () => {
    const n = nucleo([lathe(), ['apagaFace', { sel: { f: [tampa[5]] } }], ['apagaFace', { sel: { f: [tampa[53]] } }], furo(CEGO)] as any, {}, {});
    expect(motivos(n).join('|')).toMatch(/não estão no grupo coplanar ligado à de menor id/);
  });

  it('região ligada por aresta que toca a si mesma num vértice (grade 3x3 sem o centro e sem um canto): recusa', () => {
    const plano = nucleo([['plano', { origemId: 1, largura: m(90), profundidade: m(90), seg: 3 }]] as any, {}, {});
    const ids = [...plano.F.keys()].sort((a: number, b: number) => a - b);
    const n = nucleo([['plano', { origemId: 1, largura: m(90), profundidade: m(90), seg: 3 }], ['apagaFace', { sel: { f: [ids[4]] } }], ['apagaFace', { sel: { f: [ids[8]] } }],
      ['furo', { origemId: 2, lados: 18, de: { op: 'plano', id: 1 }, centro: [m(-30), 0, m(-30)], raio: m(5), profundidade: m(3), orientacao: [1, 0, 0] }]] as any, {}, {});
    expect(motivos(n).join('|')).toMatch(/a região de 7 faces de de .* toca a si mesma no vértice \d+: a borda não é uma volta só/);
  });

  it('setores alternados de um furo anterior (do mesmo plano, mas sem ligação entre si): recusa, porque não é ligada por aresta', () => {
    const n = nucleo([['cilindro', { origemId: 1, raio: R, altura: m(20), lados: 144 }],
      ['furo', { origemId: 2, lados: 18, de: { op: 'cilindro', id: 1, tampa: 'topo' }, centro: [0, m(20), 0], raio: m(5), profundidade: m(3), orientacao: [1, 0, 0] }],
      ['furo', { origemId: 3, lados: 10, de: { op: 'furo', id: 2, borda: { passo: 2, fase: 0 } }, centro: [m(40), m(20), 0], raio: m(2), profundidade: m(2), orientacao: [1, 0, 0] }]] as any, {}, {});
    expect(motivos(n).join('|')).toMatch(/não é ligada por aresta: só \d+ das \d+ faces/);
  });
});

describe('furo: a face furada refeita em anéis', () => {
  const n = nucleo([lathe(), furo(CEGO)] as any, {}, {});

  it('nenhum vértice novo cai sobre o contorno da tampa: as faces vizinhas da peça seguem sem junção em T', () => {
    const noContorno = [...n.V.values()].filter((p: any) => Math.abs(p[0] - E) < 1e-9 && Math.abs(Math.hypot(p[1], p[2]) - R) < 1e-9);
    expect(noContorno).toHaveLength(96);
  });

  it('a tampa da frente não tem triângulo fino pela régua; sobra só a de trás, o leque do lathe que o furo não toca', () => {
    const { porRegiao } = medirTrianguloFino(n);
    expect(porRegiao.map((r: any) => r.faces)).toEqual([96]);
  });

  it('uma face de contorno ralo (16 cantos) não é refeita: a malha segue como era, e sem aviso', () => {
    const p = [['cilindro', { id: 0, origemId: 1, raio: 0.052, altura: 0.012, lados: 16 }],
      ['furo', { origemId: 9, de: { op: 'cilindro', id: 1, tampa: 'topo' }, saida: { op: 'cilindro', id: 1, tampa: 'fundo' }, centros: { distancia: 0.038, total: 4, volta: 360 }, raio: 0.0065, lados: 12, orientacao: [1, 0, 0] }]];
    const q = nucleo(p as any, {}, {});
    expect(q.V.size).toBe(128);
    expect(q.F.size).toBe(204);
    expect(q.avisos).toEqual([]);
  });

  it('com um furo, a `borda j` leva o setor inteiro que a repartição antiga dava a ela, e o segundo furo abre dentro dele', () => {
    const base = [['cilindro', { origemId: 1, raio: R, altura: m(20), lados: 144 }],
      ['furo', { origemId: 2, lados: 18, de: { op: 'cilindro', id: 1, tampa: 'topo' }, saida: { op: 'cilindro', id: 1, tampa: 'fundo' }, centro: [0, 0, 0], raio: m(5), orientacao: [1, 0, 0] }]];
    const a = (10 * Math.PI) / 180;
    const dentro = [m(50) * Math.cos(a), 0, -m(50) * Math.sin(a)];
    const p = nucleo([...base, ['furo', { origemId: 3, lados: 10, de: { op: 'furo', id: 2, borda: 0 }, centro: dentro, raio: m(3), profundidade: m(2), orientacao: [1, 0, 0] }]] as any, {}, {});
    expect(p.orfaos).toEqual([]);
    // os cantos colineares que o segundo furo herda do setor não viram triângulo de área nula no adaptador
    expect(() => adaptarThree(p, { nome: 'segundo-furo' })).not.toThrow();
    const sel = nucleo([...base, ['parte', { nome: 'x', sel: { origem: { op: 'furo', id: 2, borda: 0 } } }]] as any, {}, {});
    const doSetor = [...sel.F.values()].filter((f: any) => f.parte === 'x');
    expect(doSetor.length).toBeGreaterThan(1);
    // os setores de todas as bordas cobrem a tampa inteira: nenhuma face dela fica só no preenchimento
    const todas = nucleo([...base, ['parte', { nome: 'y', sel: { origem: { op: 'furo', id: 2, borda: { passo: 1, fase: 0 } } } }]] as any, {}, {});
    const yTopo = Math.max(...[...todas.V.values()].map((v: any) => v[1]));
    const tampaNova = [...todas.F.values()].filter((f: any) => f.vs.every((v: number) => Math.abs(todas.V.get(v)[1] - yTopo) < 1e-9));
    expect(tampaNova.length).toBeGreaterThan(100);
    expect(tampaNova.every((f: any) => f.parte === 'y')).toBe(true);
  });
});

describe('furo: o limite da refeitura e a volta à repartição antiga', () => {
  it('1.500 lados com um furo: a refeitura passaria de 4 vezes a repartição antiga, e o furo avisa e fica com a antiga', () => {
    const n = nucleo([['cilindro', { origemId: 1, raio: R, altura: m(20), lados: 1500 }],
      ['furo', { origemId: 2, lados: 18, de: { op: 'cilindro', id: 1, tampa: 'topo' }, centro: [0, m(20), 0], raio: m(5), profundidade: m(3) }]] as any, {}, {});
    expect(n.orfaos).toEqual([]);
    expect(n.avisos).toHaveLength(1);
    expect(n.avisos[0]).toMatchObject({ op: 'furo', ref: 'repartiçãoAntiga', lado: 'entrada' });
    expect(n.avisos[0].motivo).toMatch(/vezes/);
  });

  it('um rasgo de 100 por 3 mm numa tampa de 144 lados: refeito, com aviso do que sobrou, e com 4 triângulos finos no total, contra 96 antes', () => {
    const H = m(20);
    const base = [['cilindro', { origemId: 1, raio: R, altura: H, lados: 144 }]];
    const yTopo = Math.max(...[...nucleo(base as any, {}, {}).V.values()].map((p: any) => p[1]));
    const n = nucleo([...base, ['furo', { origemId: 2, de: { op: 'cilindro', id: 1, tampa: 'topo' }, saida: { op: 'cilindro', id: 1, tampa: 'fundo' }, lados: 18, orientacao: [1, 0, 0], centro: [m(-50), yTopo, 0], ate: [m(50), yTopo, 0], raio: m(3) }]] as any, {}, {});
    expect(n.orfaos).toEqual([]);
    conferirMalha(n, { fechada: true, rotulo: 'rasgo 100x3' });
    // antes: 48 por face em 162 triângulos; agora 4 no total, e o furo avisa que sobraram (trianguloFino) em cada lado
    const { porRegiao } = medirTrianguloFino(n);
    expect(porRegiao.reduce((t: number, r: any) => t + r.finos, 0)).toBeLessThanOrEqual(4);
    expect(n.avisos.map((a: any) => a.ref)).toEqual(['trianguloFino', 'trianguloFino']);
  });
});

describe('furo: a refeitura nunca termina pior que a repartição antiga, e os dois lados saem iguais', () => {
  const H = m(20);
  const cil = (lados: number) => ['cilindro', { origemId: 1, raio: R, altura: H, lados }];
  const yTopo = (lados: number) => Math.max(...[...nucleo([cil(lados)] as any, {}, {}).V.values()].map((p: any) => p[1]));

  it('um furo, varrendo raio e afastamento (144 lados): ou sem triângulo fino, ou com aviso (trianguloFino ou repartiçãoAntiga)', () => {
    const y = yTopo(144);
    for (const r of [2, 5, 10, 20]) for (const off of [0, 20, 40, 60, 70]) {
      if (off + r >= 76 || (r === 5 && off === 70)) continue;
      const n = nucleo([cil(144), ['furo', { origemId: 2, de: { op: 'cilindro', id: 1, tampa: 'topo' }, profundidade: m(3), lados: 18, orientacao: [1, 0, 0], centro: [m(off), y, m(off / 3)], raio: m(r) }]] as any, {}, {});
      expect(n.orfaos, `r${r} off${off}`).toEqual([]);
      // a região do tampo furado: tudo que não é a tampa de trás (1 face de 142 triângulos)
      const finos = medirTrianguloFino(n).porRegiao.filter((x: any) => !(x.faces === 1 && x.triangulos === 142)).reduce((t: number, x: any) => t + x.finos, 0);
      if (finos > 0) expect(n.avisos.map((a: any) => a.ref).some((ref: string) => ref === 'trianguloFino' || ref === 'repartiçãoAntiga'), `r${r} off${off}: ${finos} finos sem aviso`).toBe(true);
      // e nunca mais que a repartição antiga (66 a 75 nos casos de furo de 2 mm, 69 nos de 5 mm)
      expect(finos, `r${r} off${off}`).toBeLessThanOrEqual(75);
    }
  });

  it('um furo passante simétrico (600 lados, raios de 40 e 60 mm): os dois lados saem refeitos e iguais, sem aviso', () => {
    for (const r of [40, 60]) {
      const y = yTopo(600);
      const n = nucleo([cil(600), ['furo', { origemId: 2, lados: 18, de: { op: 'cilindro', id: 1, tampa: 'topo' }, saida: { op: 'cilindro', id: 1, tampa: 'fundo' }, orientacao: [1, 0, 0], centro: [0, y, 0], raio: m(r) }]] as any, {}, {});
      expect(n.orfaos).toEqual([]);
      expect(n.avisos, `raio ${r}`).toEqual([]);
      const emY = (alvo: number) => [...n.F.values()].filter((f: any) => f.vs.every((v: number) => Math.abs(n.V.get(v)[1] - alvo) < 1e-9)).length;
      expect(emY(y)).toBe(emY(Math.min(...[...n.V.values()].map((p: any) => p[1]))));
    }
  });

  it('as famílias não se sobrepõem: nenhuma face é da `borda` e do `preenchimento` ao mesmo tempo, com um furo, com três e com um rasgo e um furo', () => {
    const y = yTopo(144);
    const casos: any = {
      um: { centro: [0, y, 0], raio: m(5) },
      rasgo: { centro: [m(-50), y, 0], ate: [m(50), y, 0], raio: m(3) },
      tres: { centros: [{ centro: [m(-40), y, 0], raio: m(6) }, { centro: [m(40), y, 0], raio: m(6) }, { centro: [0, y, m(40)], raio: m(4) }] },
      rasgoEFuro: { centros: [{ centro: [m(-50), y, m(-20)], ate: [m(50), y, m(-20)], raio: m(3) }, { centro: [0, y, m(30)], raio: m(6) }] },
    };
    for (const [nome, f] of Object.entries(casos)) {
      const F = ['furo', { origemId: 2, lados: 18, de: { op: 'cilindro', id: 1, tampa: 'topo' }, saida: { op: 'cilindro', id: 1, tampa: 'fundo' }, orientacao: [1, 0, 0], ...(f as any) }];
      const n = nucleo([cil(144), F, ['parte', { nome: 'b', sel: { origem: { op: 'furo', id: 2, borda: { passo: 1, fase: 0 } } } }]] as any, {}, {});
      const q = nucleo([cil(144), F, ['parte', { nome: 'b', sel: { origem: { op: 'furo', id: 2, borda: { passo: 1, fase: 0 } } } }], ['pincel', { cor: '#ff0000', sel: { origem: { op: 'furo', id: 2, preenchimento: { passo: 1, fase: 0 } } } }]] as any, {}, {});
      const ambos = [...q.F.values()].filter((g: any) => g.parte === 'b' && g.cor === '#ff0000').length;
      expect(n.orfaos, nome).toEqual([]);
      expect(ambos, nome).toBe(0);
      if (nome === 'um' || nome === 'rasgo') {
        // com um furo o preenchimento não existe, como antes: citá-lo grita
        const c = nucleo([cil(144), F, ['pincel', { cor: '#ff0000', sel: { origem: { op: 'furo', id: 2, preenchimento: 0 } } }]] as any, {}, {});
        expect(motivos(c).join('|'), nome).toMatch(/abriu UM anel só/);
      }
    }
  });
});

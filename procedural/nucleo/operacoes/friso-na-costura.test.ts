/* friso-na-costura.test.ts — o `friso` que segue a costura de uma união e o perfil `cordao`, o chanfro de solda posto a cada
   ponto no canto entre os dois sólidos (plano do cordão de solda na costura de tubos, 2026-11-15). Os casos são os da fixture
   do nó de tubos; a meta de faces e a forma (o chanfro) foram escolhidas pela pessoa por imagem. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo herdado em JavaScript.
import { nucleo, neutroCanonico } from '../entrada.js';
// @ts-expect-error — fixture em JavaScript.
import { passosDoCordao, passosDoNo, tubo } from '../fixtures/no-de-tubos.js';
import { arestasSemPar, vinculosNaoManifold } from '../../../tools/oficina/conferir-malha';
// @ts-expect-error — núcleo herdado em JavaScript.
import { triangularFace } from '../triangulacao-face.js';
// @ts-expect-error — receita em JavaScript.
import { TABELA, gerarPassos } from '../../pecas/bicicleta-urbana/receita.js';

const m = (v: number) => v / 1000;
const recusa = (passos: any[]) => { const n = nucleo(passos); return n.orfaos.map((o: any) => o.motivo).join(' | '); };
const doisTubos = () => passosDoNo('obliquo 60 17/16', 3).slice(0, 3);
const friso = (extra: any) => ['friso', { origemId: 200, linha: { nome: 'solda' }, costura: { de: { op: 'unir', id: 100 } }, perfil: { cordao: { largura: m(7) } }, ...extra }];

describe('friso na costura de uma união', () => {
  it('com perfil circular, o tubo que segue a costura fecha com os dois tubos', () => {
    const n = nucleo([...doisTubos(),
      ['friso', { origemId: 200, linha: { nome: 'solda' }, costura: { de: { op: 'unir', id: 100 } }, perfil: { circulo: { raio: m(2) } } }],
      ['unir', { origemId: 201, solidos: [{ origem: { op: 'unir', id: 100 } }, { origem: { op: 'friso', id: 200 } }] }]]);
    expect(n.orfaos).toEqual([]);
    expect(arestasSemPar(n)).toEqual([]);
  });

  for (const [caso, teto] of [['T reto 17/8', 300], ['obliquo 35 17/8', 400], ['obliquo 60 17/16', 600]] as const) {
    it(`${caso}: o cordão fecha a malha com os tubos e acrescenta no máximo ${teto} faces`, () => {
      const p = passosDoCordao(caso, 7);
      const n = nucleo(p);
      expect(n.orfaos).toEqual([]);
      expect(arestasSemPar(n)).toEqual([]);
      expect(vinculosNaoManifold(n)).toEqual([]);
      const soTubos = nucleo(p.slice(0, -2));
      /* o teto é do cordão e dos cortes da união; as faces a mais do refino da faixa (que trocou os anéis finos da receita) contam à parte */
      const refino = n.origens.get(201)[0].refinoDaCostura?.faces ?? 0;
      expect(n.F.size - soTubos.F.size - refino).toBeLessThanOrEqual(teto);
    });
  }

  it('os dois estais a 22° que nascem do mesmo ponto: o cordão fecha, cortado no canto e sem o laço curto da costura perto do ponto', () => {
    const n = nucleo(passosDoCordao('estais sozinhos 22', 4));
    expect(n.orfaos).toEqual([]);
    expect(arestasSemPar(n)).toEqual([]);
  });

  it('a curva da costura fechada demais para o cordão recusa dizendo que ela não se abre e qual é a largura', () => {
    const n = nucleo(passosDoCordao('T reto 17/8', 20));
    expect(n.orfaos[0].motivo).toMatch(/a curva é a do encontro dos sólidos e não se abre; mude a largura do perfil \(o cordao tem largura 0.02\)/);
  });

  it('sem entre, a costura de três tubos e do nó de quatro tubos leva um cordão por par, e a união das cascas sobrepostas fecha', () => {
    for (const caso of ['tubo e dois estais', 'no de 4 tubos']) {
      const n = nucleo(passosDoCordao(caso, 5));
      expect(n.orfaos).toEqual([]);
      expect(arestasSemPar(n)).toEqual([]);
      expect(vinculosNaoManifold(n)).toEqual([]);
    }
  });

  it('vincarCostura põe as arestas da costura como quebra de sombra nas faces dos dois lados', () => {
    const n = nucleo(passosDoCordao('T reto 17/8', 7));
    const costura = n.origens.get(201)[0].arestas.map(([x, y]: number[]) => `${x}-${y}`);
    const quebras = new Set<string>();
    for (const f of n.F.values()) for (const [x, y] of f.quebras ?? []) quebras.add(x < y ? `${x}-${y}` : `${y}-${x}`);
    expect(costura.length).toBeGreaterThan(0);
    expect(costura.every((c: string) => quebras.has(c))).toBe(true);
    const sem = nucleo(passosDoCordao('T reto 17/8', 7, { vincar: false }));
    expect([...sem.F.values()].some((f: any) => f.quebras?.length)).toBe(false);
  });

  it('o refino da faixa: com anéis de 10 mm nos tubos, o refino acrescenta faces, nenhum ponto novo cai dentro de uma faceta, a malha fecha e o resultado é o mesmo duas vezes', () => {
    const p = passosDoCordao('obliquo 60 17/16', 7, { passoDoAnel: 0.01 });
    const n = nucleo(p);
    expect(n.orfaos).toEqual([]);
    expect(arestasSemPar(n)).toEqual([]);
    expect(vinculosNaoManifold(n)).toEqual([]);
    expect(n.avisos.filter((a: any) => a.ref === 'refinoDaCostura')).toEqual([]);
    const refino = n.origens.get(201)[0].refinoDaCostura;
    expect(refino.faces).toBeGreaterThan(0);
    const costura = [...new Set(n.origens.get(201)[0].arestas.flat())].map((v: any) => n.V.get(v));
    const perto = (q: number[]) => costura.some((c: number[]) => Math.hypot(q[0] - c[0], q[1] - c[1], q[2] - c[2]) < m(7));
    const normal = new Map<number, number[]>();
    const facesDoVertice = new Map<number, number[]>();
    for (const f of n.F.values()) {
      const P = f.vs.map((v: number) => n.V.get(v));
      const s = [0, 0, 0];
      P.forEach((a: number[], k: number) => { const b = P[(k + 1) % P.length]; s[0] += (a[1] - b[1]) * (a[2] + b[2]); s[1] += (a[2] - b[2]) * (a[0] + b[0]); s[2] += (a[0] - b[0]) * (a[1] + b[1]); });
      const t = Math.hypot(s[0], s[1], s[2]);
      normal.set(f.id, s.map((x) => x / t));
      for (const v of f.vs) facesDoVertice.set(v, [...(facesDoVertice.get(v) ?? []), f.id]);
    }
    const mesmoPlano = (fs: number[]) => fs.every((g) => { const a = normal.get(fs[0])!, b = normal.get(g)!; return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] > Math.cos((0.01 * Math.PI) / 180); });
    const dentroDaFaceta = [...facesDoVertice].filter(([v, fs]) => perto(n.V.get(v)) && mesmoPlano(fs));
    expect(dentroDaFaceta).toEqual([]);
    expect(JSON.stringify(neutroCanonico(nucleo(p)))).toBe(JSON.stringify(neutroCanonico(n)));
  });

  it('o refino sai só do pé do cordão: o terceiro tubo da mesma união, sem cordão, fica como numa união à parte', () => {
    const t1 = tubo(1, [0, 0, 0], [0, m(400), 0], m(17), 48, 0.01);
    const t2 = tubo(2, [0, m(300), 0], [m(250), m(320), 0], m(16), 48, 0.01);
    const t3 = tubo(3, [0, m(100), 0], [m(-200), m(60), 0], m(8), 48, 0.01);
    const base = [t1, t2, t3, ['unir', { origemId: 100, solidos: [{ origem: { op: 'loft', id: 1 } }, { origem: { op: 'loft', id: 2 } }] }], friso({})];
    const junto = nucleo([...base, ['unir', { origemId: 201, solidos: [{ origem: { op: 'unir', id: 100 } }, { origem: { op: 'friso', id: 200 } }, { origem: { op: 'loft', id: 3 } }], vincarCostura: true }]]);
    const aParte = nucleo([...base, ['unir', { origemId: 201, solidos: [{ origem: { op: 'unir', id: 100 } }, { origem: { op: 'friso', id: 200 } }], vincarCostura: true }], ['unir', { origemId: 202, solidos: [{ origem: { op: 'unir', id: 201 } }, { origem: { op: 'loft', id: 3 } }] }]]);
    /* as arestas a menos de 25 mm da junta do terceiro tubo: com a faixa saindo de toda a costura da união, eram 2067 contra 510 */
    const perto = (n: any) => {
      const c = [m(-15), m(97), 0]; const vistas = new Set<string>(); let conta = 0; let maior = 0;
      for (const f of n.F.values()) f.vs.forEach((v: number, k: number) => {
        const w = f.vs[(k + 1) % f.vs.length]; const ch = v < w ? `${v}-${w}` : `${w}-${v}`; if (vistas.has(ch)) return; vistas.add(ch);
        const a = n.V.get(v), b = n.V.get(w); if (Math.hypot((a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]) >= m(25)) return;
        conta++; maior = Math.max(maior, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
      });
      return { conta, maior };
    };
    for (const n of [junto, aParte]) { expect(n.orfaos).toEqual([]); expect(arestasSemPar(n)).toEqual([]); }
    expect(perto(junto)).toEqual(perto(aParte));
  });

  /* GATE 9 DO PLANO: a bicicleta sem os anéis próprios nas pontas dos tubos, com o refino da união do cordão, contra a régua da fatia 3
     sobre todo triângulo que toca o pé do cordão (o polígono que fica entra pela triangulação do núcleo). A base é a receita com os
     anéis de 4 mm, medida em 2026-11-16 com o mesmo cálculo: 145 triângulos longos (razão acima de 8) de mais de 40 mm, 1223 de mais de
     15 mm, 5281 longos de mais de 4,5 mm e o maior lado de 144 mm. O commit anterior do refino deixava 1161 acima de 40 mm. */
  it('gate 9: nas juntas soldadas da bicicleta, nenhum triângulo do pé do cordão fica pior que na base com anéis', () => {
    const p = gerarPassos(TABELA);
    const ini = p.findIndex((s: any, i: number) => s[0] === 'unir' && p[i + 1]?.[0] === 'friso' && p[i + 1][1].costura);
    const passos: any[] = [];
    for (let i = ini; i < p.length; i++) if (['unir', 'friso'].includes(p[i][0])) passos.push(p[i]); else if (p[i][0] !== 'liso') break;
    const ids = new Set(passos.filter((s) => s[0] === 'unir' && !s[1].vincarCostura).flatMap((s) => s[1].solidos.map((x: any) => `${x.origem.op}:${x.origem.id}`)));
    const todos = [...p.filter((s: any) => ids.has(`${s[0]}:${s[1].origemId}`)), ...passos];
    const n = nucleo(todos);
    expect(n.orfaos).toEqual([]);
    expect(arestasSemPar(n)).toEqual([]);
    expect(n.avisos.filter((a: any) => a.ref === 'refinoDaCostura')).toEqual([]);
    const pe = new Set<number>();
    for (const s of passos) if (s[0] === 'unir' && s[1].vincarCostura) for (const r of n.origens.get(s[1].origemId) ?? []) for (const a of r.arestas ?? []) for (const v of a) pe.add(v);
    const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    let maior = 0; let longos = 0; let acima15 = 0; let acima40 = 0;
    for (const f of n.F.values()) {
      if (!f.vs.some((v: number) => pe.has(v))) continue;
      const P = f.vs.map((v: number) => n.V.get(v));
      for (const t of P.length === 3 ? [[0, 1, 2]] : triangularFace(P)) {
        if (!t.some((i: number) => pe.has(f.vs[i]))) continue;
        const Q = t.map((i: number) => P[i]);
        const L = Math.max(...[0, 1, 2].map((k) => Math.hypot(...sub(Q[(k + 1) % 3], Q[k]))));
        const u = sub(Q[1], Q[0]), w = sub(Q[2], Q[0]);
        const A = Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]);
        maior = Math.max(maior, L);
        if (L > m(4.5) && (L * L) / A > 8) { longos++; if (L > m(15)) acima15++; if (L > m(40)) acima40++; }
      }
    }
    expect(acima40).toBeLessThanOrEqual(145);
    expect(acima15).toBeLessThanOrEqual(1223);
    expect(longos).toBeLessThanOrEqual(5281);
    expect(maior).toBeLessThanOrEqual(m(144));
  }, 120000);

  it('o cordão de tubos de raio igual termina onde as superfícies ficam tangentes, e a malha fecha', () => {
    const p = passosDoCordao('T reto 17/8', 7);
    p[1] = tubo(2, [0, m(200), 0], [m(200), m(200), 0], m(17), 48, 0.004);
    const n = nucleo(p);
    expect(n.orfaos).toEqual([]);
    expect(arestasSemPar(n)).toEqual([]);
  });

  it('o cordão marca o próprio sombreado e é determinístico', () => {
    const a = nucleo(passosDoCordao('T reto 17/8', 7)), b = nucleo(passosDoCordao('T reto 17/8', 7));
    expect(JSON.stringify(neutroCanonico(a))).toBe(JSON.stringify(neutroCanonico(b)));
    const doCordao = [...a.F.values()].filter((f: any) => a.origens.get(201)[0].donos[f.id] === 1);
    expect(doCordao.length).toBeGreaterThan(0);
  });
});

describe('recusas do friso na costura e do cordão', () => {
  const casos: [string, any[], RegExp][] = [
    ['cordão sem costura', [...doisTubos(), ['friso', { origemId: 200, linha: { nome: 's', pontos: [[0, 0, 0], [1, 0, 0]] }, normal: [0, 1, 0], perfil: { cordao: { largura: m(7) } } }]], /o perfil cordao se põe no canto entre dois sólidos/],
    ['costura com superfície', [...doisTubos(), friso({ superficie: { op: 'subdivisao', id: 1 } })], /costura e superficie são duas fontes de linha/],
    ['costura com normal', [...doisTubos(), friso({ normal: [0, 1, 0] })], /sobre a costura a normal é a bissetriz/],
    ['costura com pontos', [...doisTubos(), friso({ linha: { nome: 'solda', pontos: [[0, 0, 0], [1, 0, 0]] } })], /é a costura inteira, e não leva pontos/],
    ['costura com variação', [...doisTubos(), friso({ variacao: { largura: [] } })], /a costura não tem nomes; tire variacao/],
    ['costura com ponta', [...doisTubos(), friso({ ponta: 'aberta' })], /as pontas do friso são as da costura/],
    ['costura com aba', [...doisTubos(), friso({ perfil: undefined, aba: { largura: 0.02, angulo: 90, raio: 0.003 } })], /a costura não é borda: tire aba/],
    ['cordão com outra forma', [...doisTubos(), friso({ perfil: { cordao: { largura: m(7) }, circulo: { raio: 1 } } })], /o perfil cordao não se mistura com outra forma/],
    ['cordão com altura', [...doisTubos(), friso({ perfil: { cordao: { largura: m(7), altura: m(1) } } })], /o cordao é um chanfro e leva só a largura/],
    ['cordão de largura zero', [...doisTubos(), friso({ perfil: { cordao: { largura: 0 } } })], /a largura do cordao precisa ser maior que zero/],
    ['costura que não é objeto', [...doisTubos(), friso({ costura: 3 })], /costura precisa ser a costura de um unir/],
    ['costura com campo a mais', [...doisTubos(), friso({ costura: { de: { op: 'unir', id: 100 }, raio: 1 } })], /a costura tem campo desconhecido 'raio'/],
    ['costura de outra operação', [...doisTubos(), friso({ costura: { de: { op: 'subtrair', id: 100 } } })], /costura.de precisa ser a origem de um unir/],
    ['costura de origem inexistente', [...doisTubos(), friso({ costura: { de: { op: 'unir', id: 7 } } })], /a origem unir:7 da costura não existe/],
    ['entre inválido', [...doisTubos(), friso({ costura: { de: { op: 'unir', id: 100 }, entre: [0, 0] } })], /costura.entre precisa ser dois índices diferentes/],
    ['entre sem costura', [...doisTubos(), friso({ costura: { de: { op: 'unir', id: 100 }, entre: [0, 5] } })], /não tem aresta entre os sólidos 0 e 5; os pares que se tocam são \[0, 1\]/],
    ['vincarCostura com valor', [...doisTubos().slice(0, 2), ['unir', { origemId: 100, solidos: [{ origem: { op: 'loft', id: 1 } }, { origem: { op: 'loft', id: 2 } }], vincarCostura: 1 }]], /vincarCostura só aceita o literal true/],
  ];
  for (const [nome, passos, motivo] of casos) it(nome, () => { expect(recusa(passos)).toMatch(motivo); });


  it('costura cortada por um passo depois do unir', () => {
    const p = [...doisTubos(), ['cubo', { origemId: 50, lado: 0.06, em: [0, 0.27, 0] }],
      ['subtrair', { origemId: 51, solidos: [{ origem: { op: 'unir', id: 100 } }, { origem: { op: 'cubo', id: 50 } }] }], friso({})];
    expect(recusa(p)).toMatch(/foram removidas ou consumidas por um passo posterior; ponha o friso logo depois do unir/);
  });
});

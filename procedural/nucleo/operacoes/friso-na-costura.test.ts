/* friso-na-costura.test.ts — o `friso` que segue a costura de uma união e o perfil `cordao`, o chanfro de solda posto a cada
   ponto no canto entre os dois sólidos (plano do cordão de solda na costura de tubos, 2026-11-15). Os casos são os da fixture
   do nó de tubos; a meta de faces e a forma (o chanfro) foram escolhidas pela pessoa por imagem. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo herdado em JavaScript.
import { nucleo, neutroCanonico } from '../entrada.js';
// @ts-expect-error — fixture em JavaScript.
import { passosDoCordao, passosDoNo, tubo } from '../fixtures/no-de-tubos.js';
import { arestasSemPar, vinculosNaoManifold } from '../../../tools/oficina/conferir-malha';

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
      expect(n.F.size - soTubos.F.size).toBeLessThanOrEqual(teto);
    });
  }

  it('os dois estais a 22° que nascem do mesmo ponto: o cordão fecha, sem o laço curto da costura perto do ponto', () => {
    const n = nucleo(passosDoCordao('estais sozinhos 22', 5));
    expect(n.orfaos).toEqual([]);
    expect(arestasSemPar(n)).toEqual([]);
  });

  it('a curva da costura fechada demais para o cordão recusa dizendo que ela não se abre e qual é a largura', () => {
    const n = nucleo(passosDoCordao('estais sozinhos 22', 4));
    expect(n.orfaos[0].motivo).toMatch(/a curva é a do encontro dos sólidos e não se abre; mude a largura do perfil \(o cordao tem largura 0.004\)/);
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

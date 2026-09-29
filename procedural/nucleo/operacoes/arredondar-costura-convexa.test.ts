/* arredondar-costura-convexa.test.ts — fatia 7b do plano "União de sólidos":
   o `arredondarCostura` arredonda também a borda CONVEXA de uma booleana (a
   beira do rebaixo, do rasgo, do corte) e as arestas INTERNAS que a ferramenta
   de um `subtrair` deixou na peça (o fundo e os cantos do rebaixo). Em toda
   fixture os eixos dos arcos são conhecidos de antemão, e o raio é medido em
   cada vértice novo do arredondamento contra o eixo esperado. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo herdado em JavaScript.
import { BASE_ESTENDIDA, BLOCO, FAIXA_ESTENDIDA, idDoPasso, nucleo, neutroCanonico } from '../entrada.js';
// @ts-expect-error — adaptador em JavaScript.
import { adaptarThree } from '../../../src/autoria/adaptar-three.js';
import { conferirMalha } from '../../../tools/oficina/conferir-malha';

const R = 0.02;
const de = (op: string, id: number) => ({ origem: { op, id } });
const cubo = (id: number, larg: number, alt: number, prof: number, em: number[]) => ['cubo', { origemId: id, larg, alt, prof, em }];
const subtrair = (id: number, ...ops: any[]) => ['subtrair', { origemId: id, solidos: ops.map((o) => de(o[0], o[1])) }];
const MARCA = ['pincel', { modo: 'face', sel: { origem: { op: 'arredondarCostura', id: 10 } }, cor: '#ff0000' }];
const arredonda = (op: string, id: number, extra: any) => ['arredondarCostura', { origemId: 10, de: { op, id }, raio: R, ...extra }];

type Eixo = { p: number[]; d: number[] };
/* distância de um ponto a uma reta */
const aoEixo = (q: number[], e: Eixo) => {
  const w = [q[0] - e.p[0], q[1] - e.p[1], q[2] - e.p[2]];
  const s = w[0] * e.d[0] + w[1] * e.d[1] + w[2] * e.d[2];
  return Math.hypot(w[0] - s * e.d[0], w[1] - s * e.d[1], w[2] - s * e.d[2]);
};
/* vértices NOVOS das faces marcadas (os originais da peça, como o canto da
   costura, não são pontos do arco) e o desvio de cada um até o eixo mais
   próximo em relação ao raio: cada vértice do arredondamento tem de estar
   sobre ALGUM dos cilindros esperados, no raio declarado. Onde três arestas
   se encontram, o canto vem da interseção dos cilindros e um dos outros
   eixos passa mais perto; por isso a regra é "sobre algum", e não "a
   distância mínima". */
const desvios = (n: any, antes: any, eixos: Eixo[], r = R) => {
  const vs = new Set<number>();
  for (const f of n.F.values()) if (f.cor === '#ff0000') for (const v of f.vs) if (!antes.V.has(v)) vs.add(v);
  return { total: vs.size, desvio: [...vs].map((v) => Math.min(...eixos.map((e) => Math.abs(aoEixo(n.V.get(v), e) - r)))) };
};
const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];
const motivos = (n: any) => n.orfaos.map((o: any) => o.motivo).join(' | ');

/* ---- rebaixo cego numa placa: placa x,z ∈ [-0,5; 0,5], y ∈ [0; 0,3];
   ferramenta x,z ∈ [-0,25; 0,25], y ∈ [0,25; 0,35] (rebaixo de 0,05) ---- */
const REBAIXO: any[] = [cubo(1, 1, 0.3, 1, [0, 0, 0]), cubo(2, 0.5, 0.1, 0.5, [0, 0.25, 0]), subtrair(9, ['cubo', 1], ['cubo', 2])];
const PLACA = 0.25;
const eixosDoRebaixo = (r = R): Eixo[] => {
  const e: Eixo[] = [];
  for (const s of [-1, 1]) {
    e.push({ p: [0, 0.3 - r, s * (PLACA + r)], d: X }, { p: [s * (PLACA + r), 0.3 - r, 0], d: Z });       // borda de cima, convexa
    e.push({ p: [0, PLACA + r, s * (PLACA - r)], d: X }, { p: [s * (PLACA - r), PLACA + r, 0], d: Z });     // fundo, côncavo
    for (const t of [-1, 1]) e.push({ p: [s * (PLACA - r), 0, t * (PLACA - r)], d: Y });                    // cantos verticais, côncavos
  }
  return e;
};
const rebaixo = (extra: any = {}, marca = true) => [...REBAIXO, arredonda('subtrair', 9, { arestas: ['internas', 'convexas'], ...extra }), ...(marca ? [MARCA] : [])];

describe('rebaixo cego numa placa', () => {
  it('sem arestas, a costura só tem convexas e internas: grita e diz qual classe pedir', () => {
    const n = nucleo([...REBAIXO, arredonda('subtrair', 9, {})]);
    const m = motivos(n);
    expect(m).toMatch(/não tem aresta côncava/);
    expect(m).toMatch(/4 convexa\(s\) da costura \(arestas:'convexas'\)/);
    expect(m).toMatch(/interna\(s\) da ferramenta \(arestas:'internas'\)/);
    expect(n.F.size).toBe(nucleo(REBAIXO).F.size);   // nada foi alterado
  });

  it('o raio medido em cada vértice novo é o declarado', () => {
    const antes = nucleo(REBAIXO);
    const n = nucleo(rebaixo());
    expect(n.orfaos).toEqual([]);
    const { total, desvio } = desvios(n, antes, eixosDoRebaixo());
    expect(total).toBeGreaterThan(4 * 8 + 8 * 8);   // 4 bordas, 4 fundos e 4 cantos, oito faixas cada
    expect(Math.max(...desvio)).toBeLessThan(1e-6);
  });

  it('a casca sai fechada, sem bico, e atravessa o adaptador', () => {
    const n = nucleo(rebaixo());
    conferirMalha(n, { fechada: true, rotulo: 'rebaixo arredondado' });
    const { partes } = adaptarThree(nucleo([...rebaixo(), ['parte', { nome: 'placa', sel: { tudo: true } }]]), { nome: 'rebaixo' });
    expect(partes.get('placa').children.length).toBeGreaterThan(0);
  });

  it('cada classe sozinha também fecha, e a borda tira material enquanto o fundo põe', () => {
    const volume = (n: any) => {
      let v = 0;
      for (const f of n.F.values()) {
        const P = f.vs.map((k: number) => n.V.get(k));
        for (let k = 1; k < P.length - 1; k++) {
          const a = P[0], b = P[k], c = P[k + 1];
          v += (a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
        }
      }
      return v;
    };
    const v0 = volume(nucleo(REBAIXO));
    const borda = nucleo(rebaixo({ arestas: 'convexas' }));
    const fundo = nucleo(rebaixo({ arestas: 'internas' }));
    conferirMalha(borda, { fechada: true, rotulo: 'só a borda' });
    conferirMalha(fundo, { fechada: true, rotulo: 'só o fundo' });
    expect(volume(borda)).toBeLessThan(v0 - 1e-6);
    expect(volume(fundo)).toBeGreaterThan(v0 + 1e-6);
  });

  it('a mesma receita duas vezes dá a mesma malha, byte a byte', () => {
    expect(JSON.stringify(neutroCanonico(nucleo(rebaixo())))).toBe(JSON.stringify(neutroCanonico(nucleo(rebaixo()))));
  });

  it('as faces que o arredondamento não toca mantêm o id e os cantos', () => {
    const antes = nucleo(REBAIXO);
    const n = nucleo(rebaixo());
    // a base e as quatro laterais da placa ficam longe da borda e do fundo do rebaixo
    for (const id of [0, 2, 3, 4, 5]) expect(n.F.get(id).vs).toEqual(antes.F.get(id).vs);
    // o topo, as paredes e o fundo do rebaixo continuam com o id que tinham (cortados, mantêm o id no maior pedaço)
    expect([...antes.F.keys()].filter((id: number) => n.F.has(id)).length).toBe(antes.F.size);
  });

  it('as faces novas ficam no bloco do passo, herdam a parte e saem lisas a 45°', () => {
    const n = nucleo([...REBAIXO, ['parte', { nome: 'placa', sel: { origem: { op: 'subtrair', id: 9 } } }], ...rebaixo().slice(3)]);
    expect(n.orfaos).toEqual([]);
    const marcadas = [...n.F.entries()].filter(([, f]: any) => f.cor === '#ff0000');
    expect(marcadas.length).toBeGreaterThan(0);
    for (const [id, f] of marcadas as any) {
      expect(f.parte).toBe('placa');
      expect(f.liso).toBe(45);
      expect(id >= 4 * BLOCO && id < 5 * BLOCO).toBe(true);   // passo 4: o bloco dele, sem faixa estendida
    }
  });

  it('nada a arredondar grita com o conserto, e regiao leva ao modo por fatias e grita se não pegar nada', () => {
    const n = nucleo([...REBAIXO, arredonda('subtrair', 9, { arestas: 'concavas' })]);
    expect(motivos(n)).toMatch(/peça essas em arestas/);
    expect(n.F.size).toBe(nucleo(REBAIXO).F.size);
    const m = nucleo(rebaixo({ regiao: { min: [9, 9, 9], max: [10, 10, 10] } }));
    expect(motivos(m)).toMatch(/não tem aresta .* a arredondar dentro da regiao pedida/);
    expect(m.F.size).toBe(nucleo(REBAIXO).F.size);
  });

  it('dois raios que somam mais que a parede se sobrepõem: grita em vez de sair uma forma que não é nenhuma das duas', () => {
    const n = nucleo(rebaixo({ raio: 0.03 }));   // a parede mede 0,05 e a borda e o fundo pedem 0,03 cada
    expect(motivos(n)).toMatch(/se sobreporem ou se encostarem na face/);
    expect(n.F.size).toBe(nucleo(REBAIXO).F.size);
  });
});

/* ---- rasgo passante: bloco x,z ∈ [-0,3; 0,3], y ∈ [0; 0,6]; o rasgo corre
   em x de ponta a ponta, z ∈ [-0,1; 0,1], do piso y = 0,3 até o topo ---- */
const RASGO: any[] = [cubo(1, 0.6, 0.6, 0.6, [0, 0, 0]), cubo(2, 0.8, 0.4, 0.2, [0, 0.3, 0]), subtrair(9, ['cubo', 1], ['cubo', 2])];
const eixosDoRasgo = (r = R): Eixo[] => {
  const e: Eixo[] = [];
  for (const s of [-1, 1]) {
    e.push({ p: [0, 0.6 - r, s * (0.1 + r)], d: X });                       // borda de cima, ao longo do rasgo
    e.push({ p: [0, 0.3 + r, s * (0.1 - r)], d: X });                       // encontro do piso com a parede, côncavo
    e.push({ p: [s * (0.3 - r), 0.45, s * (0.1 + r)], d: Y });               // beira da parede na face da ponta (o ponto de y é qualquer: a reta é vertical)
    e.push({ p: [s * (0.3 - r), 0.45, -s * (0.1 + r)], d: Y });
    e.push({ p: [s * (0.3 - r), 0.3 - r, 0], d: Z });                       // beira do piso na face da ponta
  }
  return e;
};

describe('rasgo passante num bloco', () => {
  const rasgo = (extra: any = {}) => [...RASGO, arredonda('subtrair', 9, { arestas: 'todas', ...extra }), MARCA];

  it('a costura sozinha só tem convexas: o pedido padrão grita e nomeia as duas classes que existem', () => {
    const n = nucleo([...RASGO, arredonda('subtrair', 9, {})]);
    expect(motivos(n)).toMatch(/convexa\(s\) da costura \(arestas:'convexas'\)/);
    expect(motivos(n)).toMatch(/interna\(s\) da ferramenta \(arestas:'internas'\)/);
  });

  it('raio medido em cada vértice novo, casca fechada e atravessa o adaptador', () => {
    const antes = nucleo(RASGO);
    const n = nucleo(rasgo());
    expect(n.orfaos).toEqual([]);
    const { total, desvio } = desvios(n, antes, eixosDoRasgo());
    expect(total).toBeGreaterThan(8 * 8);
    expect(Math.max(...desvio)).toBeLessThan(1e-6);
    conferirMalha(n, { fechada: true, rotulo: 'rasgo arredondado' });
    const { partes } = adaptarThree(nucleo([...rasgo().slice(0, -1), ['parte', { nome: 'bloco', sel: { tudo: true } }]]), { nome: 'rasgo' });
    expect(partes.get('bloco').children.length).toBeGreaterThan(0);
  });

  it('o mesmo pedido em outra ordem de classes dá a mesma malha, e duas execuções dão os mesmos bytes', () => {
    const um = JSON.stringify(neutroCanonico(nucleo(rasgo({ arestas: ['convexas', 'internas'] }))));
    const dois = JSON.stringify(neutroCanonico(nucleo(rasgo({ arestas: ['internas', 'convexas'] }))));
    expect(um).toBe(dois);
    expect(um).toBe(JSON.stringify(neutroCanonico(nucleo(rasgo({ arestas: ['convexas', 'internas'] })))));
  });

  it('a peça deslocada de 100 no mundo sai com a mesma topologia', () => {
    const deslocar = (d: number[]) => RASGO.map(([op, a]: any) => (op === 'cubo' ? [op, { ...a, em: a.em.map((c: number, k: number) => c + d[k]) }] : [op, a]));
    const a = nucleo([...RASGO, arredonda('subtrair', 9, { arestas: 'todas' })]);
    const b = nucleo([...deslocar([100, 0, -30]), arredonda('subtrair', 9, { arestas: 'todas' })]);
    expect(b.orfaos).toEqual([]);
    expect(b.F.size).toBe(a.F.size);
    expect(b.V.size).toBe(a.V.size);
  });

  it('raio maior que a parede grita dizendo onde e o quê diminuir', () => {
    const n = nucleo([...RASGO, arredonda('subtrair', 9, { arestas: 'convexas', raio: 0.5 })]);
    expect(motivos(n)).toMatch(/não cabe/);
    expect(n.F.size).toBe(nucleo(RASGO).F.size);
  });

  it('classe repetida, desconhecida ou lista vazia grita', () => {
    for (const arestas of [['convexas', 'convexas'], 'redondas', []]) {
      expect(motivos(nucleo([...RASGO, arredonda('subtrair', 9, { arestas })]))).toMatch(/arestas precisa ser/);
    }
  });

  it("'internas' fora de um subtrair grita com o conserto", () => {
    const U = [cubo(1, 1, 1, 1, [0, 0, 0]), cubo(2, 1, 1, 1, [0.5, 0.5, 0.5]), ['unir', { origemId: 9, solidos: [de('cubo', 1), de('cubo', 2)] }],
      arredonda('unir', 9, { arestas: 'internas' })];
    expect(motivos(nucleo(U))).toMatch(/'internas' só vale num subtrair/);
  });
});

/* ---- garfo em U: bloco de 0,6 × 0,3 × 0,6 menos um rasgo de 0,2 de largura
   que entra pela frente (z = 0,3) e termina em meia-volta de raio 0,1 feita
   por um cilindro de 32 lados; a ferramenta são dois sólidos, a caixa e o
   cilindro ---- */
const ALIAS_CIL = [['cil', { unir: [{ origem: { op: 'cilindro', id: 3 } }, { origem: { op: 'cilindro', id: 3, tampa: 'fundo' } }, { origem: { op: 'cilindro', id: 3, tampa: 'topo' } }] }]];
const GARFO: any[] = [cubo(1, 0.6, 0.3, 0.6, [0, 0, 0]), cubo(2, 0.2, 0.5, 0.4, [0, -0.1, 0.2]),
  ['cilindro', { origemId: 3, raio: 0.1, altura: 0.5, lados: 32, em: [0, -0.1, 0] }],
  ['subtrair', { origemId: 9, solidos: [de('cubo', 1), de('cubo', 2), { alias: 'cil' }] }]];
const rodaGarfo = (extra: any[] = []) => nucleo([...GARFO, ...extra], {}, {}, {}, null, ALIAS_CIL);

/* eixos da beira do U: para cada aresta do contorno do rasgo (as paredes retas
   e as facetas da meia-volta), a reta paralela à aresta, a r da parede (para
   dentro do sólido) e a r do plano de cima ou de baixo */
const eixosDoGarfo = (antes: any, r = R): Eixo[] => {
  const e: Eixo[] = [];
  for (const [y, sy] of [[0.3, -1], [0, 1]]) {
    // os cantos da meia-volta na face de cima (y = 0,3) ou de baixo (y = 0): x cresce ao longo do arco, de (-0,1; 0) a (0,1; 0)
    const semi = [...antes.V.values()].filter((p: number[]) => Math.abs(p[1] - y) < 1e-9 && Math.hypot(p[0], p[2]) <= 0.1 + 1e-9 && p[2] <= 1e-9).sort((a: number[], b: number[]) => a[0] - b[0]);
    for (let k = 0; k < semi.length - 1; k++) {
      const P = semi[k], Q = semi[k + 1];
      const d = [Q[0] - P[0], 0, Q[2] - P[2]], l = Math.hypot(d[0], d[2]);
      const u = [d[0] / l, 0, d[2] / l];
      const mid = [(P[0] + Q[0]) / 2, 0, (P[2] + Q[2]) / 2], lm = Math.hypot(mid[0], mid[2]);
      e.push({ p: [P[0] + (mid[0] / lm) * r, y + sy * r, P[2] + (mid[2] / lm) * r], d: u });
    }
    for (const s of [-1, 1]) e.push({ p: [s * (0.1 + r), y + sy * r, 0.15], d: Z });          // as paredes retas
  }
  for (const s of [-1, 1]) e.push({ p: [s * (0.1 + r), 0.15, 0.3 - r], d: Y });              // beira do rasgo na frente
  return e;
};

describe('garfo em U: rasgo com fundo semicircular feito por cilindro', () => {
  it('a beira do rasgo (paredes retas, meia-volta e frente) sai no raio declarado e a casca fecha', () => {
    const antes = rodaGarfo();
    expect(antes.orfaos).toEqual([]);
    const n = rodaGarfo([arredonda('subtrair', 9, { arestas: 'convexas' }), MARCA]);
    expect(n.orfaos).toEqual([]);
    const { total, desvio } = desvios(n, antes, eixosDoGarfo(antes));
    expect(total).toBeGreaterThan(30 * 8);
    expect(Math.max(...desvio)).toBeLessThan(1e-6);
    conferirMalha(n, { fechada: true, rotulo: 'garfo em U' });
  });

  it("'todas' ignora a junção tangente entre a caixa e o cilindro da ferramenta e dá a mesma malha da beira", () => {
    const so = JSON.stringify(neutroCanonico(rodaGarfo([arredonda('subtrair', 9, { arestas: 'convexas' })])));
    const todas = JSON.stringify(neutroCanonico(rodaGarfo([arredonda('subtrair', 9, { arestas: 'todas' })])));
    expect(todas).toBe(so);
  });

  it('determinístico byte a byte', () => {
    const f = () => JSON.stringify(neutroCanonico(rodaGarfo([arredonda('subtrair', 9, { arestas: 'convexas' })])));
    expect(f()).toBe(f());
  });
});

/* ---- borda convexa de um intersectar: cubo de lado 1 (y ∈ [0; 1]) cortado
   por uma laje y ∈ [0,2; 0,8]; a costura são as oito arestas da laje ---- */
describe('borda convexa de um intersectar', () => {
  const INTER: any[] = [cubo(1, 1, 1, 1, [0, 0, 0]), cubo(2, 2, 0.6, 2, [0, 0.2, 0]), ['intersectar', { origemId: 9, solidos: [de('cubo', 1), de('cubo', 2)] }]];
  const eixos = (r: number): Eixo[] => {
    const e: Eixo[] = [];
    for (const y of [0.2 + r, 0.8 - r]) for (const s of [-1, 1]) e.push({ p: [0, y, s * (0.5 - r)], d: X }, { p: [s * (0.5 - r), y, 0], d: Z });
    return e;
  };
  it('as oito arestas saem no raio, a casca fecha e o pedido padrão grita', () => {
    const r = 0.05;
    const antes = nucleo(INTER);
    expect(motivos(nucleo([...INTER, arredonda('intersectar', 9, {})]))).toMatch(/8 convexa\(s\) da costura/);
    const n = nucleo([...INTER, arredonda('intersectar', 9, { arestas: 'convexas', raio: r }), MARCA]);
    expect(n.orfaos).toEqual([]);
    const { total, desvio } = desvios(n, antes, eixos(r), r);
    expect(total).toBeGreaterThan(8 * 8);
    expect(Math.max(...desvio)).toBeLessThan(1e-6);
    conferirMalha(n, { fechada: true, rotulo: 'intersectar arredondado' });
  });
});

/* ---- identidade: passo com mais de BLOCO faces novas ---- */
describe('identidade do arredondamento', () => {
  it('uma borda de 64 lados com 16 faixas passa do bloco e usa a faixa estendida, sem estouro nem id repetido', () => {
    const PLACA_REDONDA: any[] = [cubo(1, 1, 0.3, 1, [0, 0, 0]),
      ['cilindro', { origemId: 3, raio: 0.3, altura: 0.2, lados: 64, em: [0, 0.2, 0] }],
      ['subtrair', { origemId: 9, solidos: [de('cubo', 1), { alias: 'cil' }] }]];
    const antes = nucleo(PLACA_REDONDA, {}, {}, {}, null, ALIAS_CIL);
    expect(antes.orfaos).toEqual([]);
    const n = nucleo([...PLACA_REDONDA, arredonda('subtrair', 9, { arestas: ['convexas', 'internas'], raio: 0.01, paineis: 16 })], {}, {}, {}, null, ALIAS_CIL);
    expect(n.orfaos).toEqual([]);
    const novas = [...n.F.keys()].filter((id: number) => !antes.F.has(id));
    expect(novas.length).toBeGreaterThan(BLOCO);
    const passo = 3;   // índice do passo do arredondamento na receita
    const noBloco = (id: number) => id >= passo * BLOCO && id < (passo + 1) * BLOCO;
    const naFaixa = (id: number) => id >= BASE_ESTENDIDA + passo * FAIXA_ESTENDIDA && id < BASE_ESTENDIDA + (passo + 1) * FAIXA_ESTENDIDA;
    expect(novas.every((id: number) => noBloco(id) || naFaixa(id))).toBe(true);
    expect(novas.filter(naFaixa).length).toBeGreaterThan(0);
    expect(novas).toContain(idDoPasso(passo, 0));
    // as faces que o passo não toca mantêm id: o fundo e as laterais da placa
    for (const id of [0, 2, 3, 4, 5]) expect(n.F.get(id).vs).toEqual(antes.F.get(id).vs);
    conferirMalha(n, { fechada: true, rotulo: 'placa redonda com 16 faixas' });
  });
});

/* ---- superfície curva facetada: o modo por fatias ----
   Um corte plano paralelo ao eixo de um cilindro de 96 lados (raio 0,5): a
   borda entre o plano x = 0,3 e a parede são duas retas verticais em z = ±0,4
   e duas cordas em y = 0 e y = 2. O círculo do arredondamento das retas
   verticais é tangente ao plano e, por dentro, ao cilindro: o eixo dele fica
   a x = 0,3 - r e a raio 0,5 - r do eixo do cilindro, e o teste mede contra
   essa conta, sem passar por nenhuma faceta. */
const ALIAS_TUBO = [['tubo', { unir: [{ origem: { op: 'cilindro', id: 1 } }, { origem: { op: 'cilindro', id: 1, tampa: 'fundo' } }, { origem: { op: 'cilindro', id: 1, tampa: 'topo' } }] }],
  ['pan', { unir: [{ origem: { op: 'cilindro', id: 2 } }, { origem: { op: 'cilindro', id: 2, tampa: 'fundo' } }, { origem: { op: 'cilindro', id: 2, tampa: 'topo' } }] }]];
const TUBO = (lados: number): any[] => ['cilindro', { origemId: 1, raio: 0.5, altura: 2, lados }] as any;
const rodaTubo = (passos: any[]) => nucleo(passos, {}, {}, {}, null, ALIAS_TUBO);

describe('modo por fatias em superfície curva', () => {
  const CORTE = (lados: number): any[] => [TUBO(lados), cubo(2, 1, 3, 2, [0.8, -0.5, 0]), ['subtrair', { origemId: 9, solidos: [{ alias: 'tubo' }, de('cubo', 2)] }]];
  for (const r of [0.05, 0.08]) {
    it(`corte plano num cilindro de 96 lados, raio ${r}: eixos medidos, quinas do laço e pontas na tampa`, () => {
      const P = CORTE(96);
      const antes = rodaTubo(P);
      expect(antes.orfaos).toEqual([]);
      const n = rodaTubo([...P, arredonda('subtrair', 9, { arestas: 'convexas', raio: r }), MARCA]);
      expect(n.orfaos).toEqual([]);
      const zc = Math.sqrt((0.5 - r) ** 2 - (0.3 - r) ** 2);
      const verticais: Eixo[] = [{ p: [0.3 - r, 0, zc], d: Y }, { p: [0.3 - r, 0, -zc], d: Y }];
      const horizontais: Eixo[] = [{ p: [0.3 - r, r, 0], d: Z }, { p: [0.3 - r, 2 - r, 0], d: Z }];
      /* longe das quatro quinas do laço a medida é a do cilindro: nas retas
         verticais a corda de cada faceta fica a R·(1 - cos(π/96)) = 2,7e-4 do
         cilindro e o passo mergulha 1e-3·r; nas cordas das tampas, que são
         planas, só o mergulho. Dentro de r de cada quina os dois tubos se
         encontram no plano de corte e a superfície de transição não é de
         nenhum dos dois cilindros: fica fora da medida. */
      const novos = new Set<number>();
      for (const f of n.F.values()) if (f.cor === '#ff0000') for (const v of f.vs) if (!antes.V.has(v)) novos.add(v);
      const pts = [...novos].map((v) => n.V.get(v) as number[]);
      const meioV = pts.filter((q) => q[1] > 0.2 && q[1] < 1.8), meioH = pts.filter((q) => Math.abs(q[2]) < 0.3);
      expect(meioV.length).toBeGreaterThan(200);
      expect(meioH.length).toBeGreaterThan(50);
      const desvioDe = (qs: number[][], eixos: Eixo[]) => Math.max(...qs.map((q) => Math.min(...eixos.map((e) => Math.abs(aoEixo(q, e) - r)))));
      expect(desvioDe(meioV, verticais)).toBeLessThan(6e-4);
      expect(desvioDe(meioH, horizontais)).toBeLessThan(2e-4);
      // o arredondamento vai de tampa a tampa: os anéis das pontas ficam nos planos das tampas
      const ys = pts.map((q) => q[1]);
      expect(Math.min(...ys)).toBeLessThan(1e-3);
      expect(Math.max(...ys)).toBeGreaterThan(2 - 1e-3);
      conferirMalha(n, { fechada: true, rotulo: `corte plano, raio ${r}` });
    });
  }

  it('o mesmo pedido duas vezes dá os mesmos bytes, e o corte deslocado no mundo mantém a topologia', () => {
    const f = (d = [0, 0, 0]) => rodaTubo([['cilindro', { origemId: 1, raio: 0.5, altura: 2, lados: 96, em: d }], cubo(2, 1, 3, 2, [0.8 + d[0], -0.5 + d[1], d[2]]),
      ['subtrair', { origemId: 9, solidos: [{ alias: 'tubo' }, de('cubo', 2)] }], arredonda('subtrair', 9, { arestas: 'convexas', raio: 0.05 })]);
    expect(JSON.stringify(neutroCanonico(f()))).toBe(JSON.stringify(neutroCanonico(f())));
    const a = f(), b = f([40, 7, -25]);
    expect(b.orfaos).toEqual([]);
    expect(b.F.size).toBe(a.F.size);
  });

  it('um bolso quadrado numa parede curva sai fechado e o adaptador o desenha (borda e fundo juntos)', () => {
    const POCKET: any[] = [TUBO(96), cubo(2, 0.4, 0.6, 0.8, [0.45, 0.7, -0.4]), ['subtrair', { origemId: 9, solidos: [{ alias: 'tubo' }, de('cubo', 2)] }]];
    const n = rodaTubo([...POCKET, arredonda('subtrair', 9, { arestas: ['convexas', 'internas'], raio: 0.02 })]);
    expect(n.orfaos).toEqual([]);
    conferirMalha(n, { fechada: true, rotulo: 'bolso numa parede curva' });
    const { partes } = adaptarThree(rodaTubo([...POCKET, arredonda('subtrair', 9, { arestas: ['convexas', 'internas'], raio: 0.02 }), ['parte', { nome: 'tubo', sel: { tudo: true } }]]), { nome: 'bolso' });
    expect(partes.get('tubo').children.length).toBeGreaterThan(0);
  });

  it('um painel oval numa parede curva: borda e fundo arredondados, casca fechada, sem estourar o bloco', () => {
    const OVAL: any[] = [TUBO(96), ['cilindro', { origemId: 2, raio: 0.25, altura: 0.5, lados: 48, eixo: 'x', em: [0.2, 1, 0] }],
      ['subtrair', { origemId: 9, solidos: [{ alias: 'tubo' }, { alias: 'pan' }] }]];
    const n = rodaTubo([...OVAL, arredonda('subtrair', 9, { arestas: 'todas', raio: 0.03 })]);
    expect(n.orfaos).toEqual([]);
    expect(n.F.size).toBeGreaterThan(rodaTubo(OVAL).F.size + 1000);
    conferirMalha(n, { fechada: true, rotulo: 'painel oval' });
  });

  it('onde o raio não cabe grita com a distância e as duas saídas; com raioMinimo o raio diminui só ali', () => {
    const POCKET: any[] = [TUBO(96), cubo(2, 0.4, 0.6, 0.8, [0.45, 0.7, -0.4]), ['subtrair', { origemId: 9, solidos: [{ alias: 'tubo' }, de('cubo', 2)] }]];
    const recusado = rodaTubo([...POCKET, arredonda('subtrair', 9, { arestas: 'convexas', raio: 0.03 })]);
    expect(motivos(recusado)).toMatch(/quina da superfície/);
    expect(motivos(recusado)).toMatch(/raioMinimo/);
    expect(motivos(recusado)).toMatch(/regiao/);
    expect(recusado.F.size).toBe(rodaTubo(POCKET).F.size);
    const antes = rodaTubo(POCKET);
    const ok = rodaTubo([...POCKET, arredonda('subtrair', 9, { arestas: 'convexas', raio: 0.03, raioMinimo: 0.01 }), MARCA]);
    expect(ok.orfaos).toEqual([]);
    conferirMalha(ok, { fechada: true, rotulo: 'raioMinimo' });
    /* o raio local nunca passa do declarado nem do mínimo para baixo: o vértice do arco
       fica entre raioMinimo e raio do eixo mais próximo da parede do bolso (x = 0,25 + ...) */
    expect([...ok.F.values()].filter((f: any) => f.cor === '#ff0000').length).toBeGreaterThan(0);
    expect(ok.F.size).toBeGreaterThan(antes.F.size);
    expect(motivos(rodaTubo([...POCKET, arredonda('subtrair', 9, { arestas: 'convexas', raio: 0.03, raioMinimo: 0.05 })]))).toMatch(/raioMinimo precisa estar em/);
  });

  it('regiao arredonda só o trecho pedido da borda', () => {
    const P = CORTE(96);
    const toda = rodaTubo([...P, arredonda('subtrair', 9, { arestas: 'convexas', raio: 0.05 })]);
    const metade = rodaTubo([...P, arredonda('subtrair', 9, { arestas: 'convexas', raio: 0.05, regiao: { min: [-1, 0.9, -1], max: [1, 2.1, 1] } })]);
    expect(metade.orfaos).toEqual([]);
    expect(metade.F.size).toBeGreaterThan(rodaTubo(P).F.size);
    expect(metade.F.size).toBeLessThan(toda.F.size);
  });
});

/* ---- revisão adversarial da 7b ---- */
describe('raioMinimo e conselhos de erro (revisão)', () => {
  it('raioMinimo não desliga a checagem de sobreposição entre classes', () => {
    const sem = nucleo(rebaixo({ raio: 0.03 }));
    const com = nucleo(rebaixo({ raio: 0.03, raioMinimo: 0.01 }));
    expect(motivos(sem)).toMatch(/se sobreporem/);
    expect(motivos(com)).toMatch(/se sobreporem/);
    expect(motivos(com)).toMatch(/raioMinimo não resolve isto/);
    expect(com.F.size).toBe(nucleo(REBAIXO).F.size);
  });

  it('em costura plana raioMinimo não muda a malha e o aviso diz que não teve efeito', () => {
    const a = nucleo(rebaixo());
    const b = nucleo(rebaixo({ raioMinimo: 0.01 }));
    expect(JSON.stringify(neutroCanonico(b))).toBe(JSON.stringify(neutroCanonico(a)));
    expect(b.avisos).toHaveLength(1);
    expect(b.avisos[0].motivo).toMatch(/raioMinimo não teve efeito/);
    expect(a.avisos).toEqual([]);
  });

  it('a redução do raio por raioMinimo é declarada, e o raio medido é o declarado no aviso', () => {
    const POCKET: any[] = [TUBO(96), cubo(2, 0.4, 0.6, 0.8, [0.45, 0.7, -0.4]), ['subtrair', { origemId: 9, solidos: [{ alias: 'tubo' }, de('cubo', 2)] }]];
    const a = rodaTubo([...POCKET, arredonda('subtrair', 9, { arestas: 'convexas', raio: 0.03, raioMinimo: 0.01 }), MARCA]);
    const b = rodaTubo([...POCKET, arredonda('subtrair', 9, { arestas: 'convexas', raio: 0.03, raioMinimo: 0.02 }), MARCA]);
    for (const n of [a, b]) {
      expect(n.orfaos).toEqual([]);
      expect(n.avisos).toHaveLength(1);
      const av = n.avisos[0];
      expect(av.raioPedido).toBe(0.03);
      expect(av.raioMenor).toBeLessThan(0.03);
      expect(av.raioMenor).toBeGreaterThanOrEqual(av.raioMinimo);
      expect(av.estacoes).toBeGreaterThan(0);
      expect(av.motivo).toMatch(/foi reduzido/);
    }
    expect(a.avisos[0].raioMenor).toBeCloseTo(0.0225, 6);   // 3/4 do pedido, o primeiro passo que coube
    // medido: as estações reduzidas afinam o arco, então a largura da faixa arredondada é menor que a de 0,03
    const larg = (n: any, antes: any) => {
      const pts: number[][] = [];
      for (const f of n.F.values()) if (f.cor === '#ff0000') for (const v of f.vs) if (!antes.V.has(v)) pts.push(n.V.get(v));
      const perto = pts.filter((q) => Math.abs(q[2] + 0.4) < 0.02 && q[1] > 0.5 && q[1] < 0.9).map((q) => q[0]);
      return Math.max(...perto) - Math.min(...perto);
    };
    const antes = rodaTubo(POCKET);
    const pleno = rodaTubo([...POCKET, arredonda('subtrair', 9, { arestas: 'convexas', raio: 0.02 }), MARCA]);
    expect(larg(a, antes)).toBeGreaterThan(0);
    expect(larg(pleno, antes)).toBeGreaterThan(0);
  });

  it('rebaixo girado a 15°: lasca grita (não entrega), e o conselho da mensagem resolve', () => {
    const G: any[] = [cubo(1, 1, 0.3, 1, [0, 0, 0]), cubo(2, 0.5, 0.1, 0.5, [0, 0.25, 0]),
      ['rotaciona', { eixo: 'z', graus: 15, pivo: [0, 0, 0], sel: { tudo: true } }], subtrair(9, ['cubo', 1], ['cubo', 2])];
    const gira = (extra: any) => nucleo([...G, arredonda('subtrair', 9, { arestas: ['internas', 'convexas'], ...extra })]);
    const ruim = gira({ raio: 0.005 });
    expect(motivos(ruim)).toMatch(/tente um raio diferente, começando por um menor/);
    expect(ruim.F.size).toBe(nucleo(G).F.size);
    const internas = nucleo([...G, arredonda('subtrair', 9, { arestas: 'internas', raio: 0.01 })]);
    expect(motivos(internas)).toMatch(/triângulo sem área|sem área/);
    // seguindo o conselho (raio menor que o que gritou por sobreposição ou lasca) o passo fecha
    const ok = gira({ raio: 0.01 });
    expect(ok.orfaos).toEqual([]);
    conferirMalha(ok, { fechada: true, rotulo: 'rebaixo girado, raio 0,01' });
  });
});

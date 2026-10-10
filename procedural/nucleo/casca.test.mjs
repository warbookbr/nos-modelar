/* casca.test.mjs — a extensão `casca` medida sobre a malha que ela devolve, não sobre a conta que a produz.
   A espessura é conferida por uma medida independente do código da extensão: raio lançado do centro de cada triângulo da
   parede interna, no sentido da parede, até a primeira face externa fechada. O volume da caixa e do cilindro é conferido
   contra a fórmula analítica. Fechamento é a contagem de arestas dirigidas sem par oposto. */
import { describe, expect, it } from 'vitest';
import { FORMATO_COMPOSICAO_PROCEDURAL, REGISTRO_OPERACOES, criarRegistroComExtensoes, criarRegistroComposicoes, expandirComposicao, neutroCanonico, nucleo } from './entrada.js';
import { TOLERANCIA_CASCA, calcularCasca } from './casca.js';
import { sha256Hex } from './sha256.js';
import { MANIFESTO } from '../extensoes/casca/manifesto.js';
import { implementar } from '../extensoes/casca/implementacao.js';
import { PASSOS } from '../extensoes/casca/fixture.js';

const registro = criarRegistroComExtensoes({ registroBase: REGISTRO_OPERACOES, extensoes: [{ manifesto: MANIFESTO, implementacao: implementar }] });
/* caso: a receita inteira, para a medida poder reexecutá-la com um passo a mais que lê os grupos publicados */
const caso = (passos, { params = {}, aliases = [] } = {}) => {
  const executar = (extra = []) => nucleo([...passos, ...extra], params, {}, {}, null, aliases, { registroOperacoes: registro });
  return { passos, executar, n: executar() };
};

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(...a); return a.map((x) => x / l); };

function volume(n) {
  let v = 0;
  for (const f of n.F.values()) for (let k = 1; k < f.vs.length - 1; k++) v += dot(n.V.get(f.vs[0]), cruz(n.V.get(f.vs[k]), n.V.get(f.vs[k + 1]))) / 6;
  return v;
}
function arestasSemPar(n) {
  const dir = new Map();
  for (const f of n.F.values()) for (let k = 0; k < f.vs.length; k++) { const c = `${f.vs[k]}>${f.vs[(k + 1) % f.vs.length]}`; dir.set(c, (dir.get(c) ?? 0) + 1); }
  let ruins = 0;
  for (const [c, q] of dir) { const [a, b] = c.split('>'); if (q !== 1 || dir.get(`${b}>${a}`) !== 1) ruins++; }
  return ruins;
}
/* Möller–Trumbore: distância ao longo de `d` até o triângulo, ou Infinity */
function raio(o, d, a, b, c) {
  const e1 = sub(b, a), e2 = sub(c, a), p = cruz(d, e2), det = dot(e1, p);
  if (Math.abs(det) < 1e-14) return Infinity;
  const inv = 1 / det, s = sub(o, a), u = dot(s, p) * inv;
  if (u < -1e-9 || u > 1 + 1e-9) return Infinity;
  const q = cruz(s, e1), v = dot(d, q) * inv;
  if (v < -1e-9 || u + v > 1 + 1e-9) return Infinity;
  const t = dot(e2, q) * inv;
  return t > 1e-9 ? t : Infinity;
}
const COR = { externa: '#e00000', interna: '#00e000', borda: '#0000e0' };
/* as faces de um grupo da origem `casca`, lidas pelo próprio núcleo: um passo que pinta o grupo e recolhe as pintadas */
function faces(c, parte, origemId = 9) {
  const r = c.executar([['pincel', { modo: 'face', sel: { origem: { op: 'casca', id: origemId, parte } }, cor: COR[parte] }]]);
  expect(r.orfaos).toEqual([]);
  return [...r.F.values()].filter((f) => f.cor === COR[parte]).map((f) => f.id);
}
/* espessura medida: do centro de cada triângulo da parede interna, no sentido oposto à normal dele (que aponta para a
   cavidade), até a primeira face externa fechada */
function espessuras(c) {
  const { n } = c;
  const tris = [];
  for (const id of faces(c, 'externa')) { const vs = n.F.get(id).vs; for (let k = 1; k < vs.length - 1; k++) tris.push([n.V.get(vs[0]), n.V.get(vs[k]), n.V.get(vs[k + 1])]); }
  const medidas = [];
  for (const id of faces(c, 'interna')) {
    const vs = n.F.get(id).vs;
    for (let k = 1; k < vs.length - 1; k++) {
      const a = n.V.get(vs[0]), b = n.V.get(vs[k]), cc = n.V.get(vs[k + 1]);
      const centro = [0, 1, 2].map((x) => (a[x] + b[x] + cc[x]) / 3);
      const d = unit(cruz(sub(b, a), sub(cc, a))).map((x) => -x);
      medidas.push(Math.min(...tris.map(([ta, tb, tc]) => raio(centro, d, ta, tb, tc))));
    }
  }
  return medidas;
}
const topo = { origem: { op: 'cubo', id: 1, face: 'topo' } };
const caixa = (extra = {}) => [['cubo', { origemId: 1, larg: 2, alt: 1, prof: 3 }], ['casca', { origemId: 9, solido: { origem: { op: 'cubo', id: 1 } }, espessura: 0.1, ...extra }]];

describe('casca — caixa', () => {
  const aberta = caso(caixa({ abertas: topo }));

  it('devolve malha fechada com a contagem esperada e sem órfãos', () => {
    expect(aberta.n.orfaos).toEqual([]);
    expect(aberta.n.V.size).toBe(16);
    expect(aberta.n.F.size).toBe(14);
    expect(arestasSemPar(aberta.n)).toBe(0);
  });

  it('tem o volume analítico da caixa oca aberta em cima', () => {
    expect(volume(aberta.n)).toBeCloseTo(2 * 1 * 3 - 1.8 * 0.9 * 2.8, 9);
  });

  it('mede a espessura 0,1 em todos os triângulos da parede interna', () => {
    const medidas = espessuras(aberta);
    expect(faces(aberta, 'interna')).toHaveLength(5);
    expect(faces(aberta, 'externa')).toHaveLength(5);
    expect(medidas.length).toBe(10);
    for (const m of medidas) expect(Math.abs(m - 0.1)).toBeLessThan(1e-9);
  });

  it('publica a borda e consome a face aberta, que depois grita se citada', () => {
    expect(faces(aberta, 'borda')).toHaveLength(4);
    const cita = aberta.executar([['pincel', { modo: 'face', sel: topo, cor: '#ff0000' }]]);
    expect(cita.orfaos.map((o) => o.motivo).join(' ')).toMatch(/consumida pelo casca do passo 1/);
  });

  it('mantém id, vértices e parte das faces externas; a parede e a borda herdam a parte', () => {
    const base = [['cubo', { origemId: 1, larg: 2, alt: 1, prof: 3 }], ['parte', { nome: 'corpo', sel: { origem: { op: 'cubo', id: 1 } } }]];
    const sem = caso(base).n;
    const com = caso([...base, caixa({ abertas: topo })[1]]).n;
    expect(com.orfaos).toEqual([]);
    for (const [id, f] of sem.F) if (com.F.has(id)) expect(com.F.get(id).vs).toEqual(f.vs);
    expect(com.F.size - sem.F.size).toBe(8);
    expect([...com.F.values()].every((f) => f.parte === 'corpo')).toBe(true);
    for (const [id, p] of sem.V) expect(com.V.get(id)).toEqual(p);
  });

  it('aceita a espessura por nome de parâmetro', () => {
    const c = caso(caixa({ abertas: topo, espessura: 'e' }), { params: { e: 0.1 } });
    expect(c.n.orfaos).toEqual([]);
    expect(volume(c.n)).toBeCloseTo(volume(aberta.n), 12);
  });

  it('sem face aberta devolve duas cascas fechadas (oco selado) com o volume analítico', () => {
    const { n } = caso(caixa());
    expect(n.orfaos).toEqual([]);
    expect(n.F.size).toBe(12); expect(n.V.size).toBe(16);
    expect(arestasSemPar(n)).toBe(0);
    expect(volume(n)).toBeCloseTo(6 - 1.8 * 0.8 * 2.8, 9);
  });

  it('com topo e fundo abertos (união por alias) o volume é o do tubo', () => {
    const c = caso(caixa({ abertas: { alias: 'duas' } }), { aliases: [['duas', { unir: [{ origem: { op: 'cubo', id: 1, face: 'topo' } }, { origem: { op: 'cubo', id: 1, face: 'fundo' } }] }]] });
    expect(c.n.orfaos).toEqual([]);
    expect(arestasSemPar(c.n)).toBe(0);
    expect(volume(c.n)).toBeCloseTo(6 - 1.8 * 1 * 2.8, 9);
    for (const m of espessuras(c)) expect(Math.abs(m - 0.1)).toBeLessThan(1e-9);
  });

  it('a espessura é a mesma medida de 0,01 a 0,49 (sempre menor que a metade da menor medida, 0,5)', () => {
    for (const t of [0.01, 0.1, 0.25, 0.49]) {
      const c = caso(caixa({ abertas: topo, espessura: t }));
      expect(c.n.orfaos).toEqual([]);
      expect(arestasSemPar(c.n)).toBe(0);
      for (const m of espessuras(c)) expect(Math.abs(m - t)).toBeLessThan(1e-9);
    }
  });
});

describe('casca — cilindro', () => {
  const R = 1, H = 2, L = 12, T = 0.1;
  const cilindro = (abertas) => [
    ['cilindro', { origemId: 1, raio: R, altura: H, lados: L }],
    ['casca', { origemId: 9, solido: { tudo: true }, espessura: T, ...(abertas ? { abertas } : {}) }],
  ];
  const apotema = R * Math.cos(Math.PI / L);
  const area = (a) => L * a * a * Math.tan(Math.PI / L);

  it('aberto em cima: volume analítico, fechado, espessura medida e contagem de faces', () => {
    const c = caso(cilindro({ origem: { op: 'cilindro', id: 1, tampa: 'topo' } }));
    expect(c.n.orfaos).toEqual([]);
    expect(arestasSemPar(c.n)).toBe(0);
    expect(volume(c.n)).toBeCloseTo(area(apotema) * H - area(apotema - T) * (H - T), 9);
    expect(c.n.F.size).toBe(13 + 13 + 12);   // 13 externas fechadas, 13 internas e 12 de borda
    const medidas = espessuras(c);
    expect(medidas.length).toBeGreaterThan(0);
    for (const m of medidas) expect(Math.abs(m - T)).toBeLessThan(1e-9);
  });

  it('aberto dos dois lados: tubo de volume analítico e espessura medida', () => {
    const c = caso(cilindro({ alias: 'tampas' }), { aliases: [['tampas', { unir: [{ origem: { op: 'cilindro', id: 1, tampa: 'topo' } }, { origem: { op: 'cilindro', id: 1, tampa: 'fundo' } }] }]] });
    expect(c.n.orfaos).toEqual([]);
    expect(arestasSemPar(c.n)).toBe(0);
    expect(volume(c.n)).toBeCloseTo((area(apotema) - area(apotema - T)) * H, 9);
    for (const m of espessuras(c)) expect(Math.abs(m - T)).toBeLessThan(1e-9);
  });
});

describe('casca — loft', () => {
  const retangulo = (u, w) => [[u, w], [-u, w], [-u, -w], [u, -w]];
  const fuso = (abertas) => [
    ['loft', { origemId: 1, lados: 4, secoes: [
      { pos: [0, 0, 0], raio: 0 },
      { pos: [0, 2, 0], contorno: retangulo(2, 2) },
      { pos: [0, 4, 0], contorno: retangulo(1.2, 1.2) },
      { pos: [0, 6, 0], raio: 0 },
    ] }],
    ['casca', { origemId: 9, solido: { origem: { op: 'loft', id: 1 } }, espessura: 0.2, ...(abertas ? { abertas } : {}) }],
  ];
  const lateral = (lado) => ({ origem: { op: 'loft', id: 1, faixa: 1, lado } });
  const medidoDentroDaTolerancia = (c, t) => {
    /* o raio perpendicular de um triângulo perto da abertura sai pela abertura e não encontra parede: esses ficam fora, e
       o resto, que é a maioria, precisa medir t */
    const todas = espessuras(c), medidas = todas.filter(Number.isFinite);
    expect(medidas.length).toBeGreaterThan(todas.length / 2);
    for (const m of medidas) expect(Math.abs(m - t)).toBeLessThan(TOLERANCIA_CASCA * t);
  };

  it('fechado, sem face aberta: espessura 0,2 medida e volume menor que o do sólido', () => {
    const c = caso(fuso());
    const cheio = caso([fuso()[0]]).n;
    expect(c.n.orfaos).toEqual([]);
    expect(arestasSemPar(c.n)).toBe(0);
    expect(volume(c.n)).toBeGreaterThan(0);
    expect(volume(c.n)).toBeLessThan(volume(cheio));
    medidoDentroDaTolerancia(c, 0.2);
  });

  it('com uma face aberta: fechado, espessura 0,2 medida, uma face a menos e uma borda de 4 arestas', () => {
    const c = caso(fuso(lateral(0)));
    expect(c.n.orfaos).toEqual([]);
    expect(arestasSemPar(c.n)).toBe(0);
    expect(faces(c, 'borda')).toHaveLength(4);
    expect(faces(c, 'externa')).toHaveLength(11);
    medidoDentroDaTolerancia(c, 0.2);
  });

  it('a espessura medida acompanha o pedido de 0,05 a 0,2', () => {
    for (const t of [0.05, 0.1, 0.2]) {
      const c = caso([fuso()[0], ['casca', { origemId: 9, solido: { origem: { op: 'loft', id: 1 } }, abertas: lateral(0), espessura: t }]]);
      expect(c.n.orfaos).toEqual([]);
      expect(arestasSemPar(c.n)).toBe(0);
      medidoDentroDaTolerancia(c, t);
    }
  });

  it('abertura oblíqua cercada de faces em ângulo agudo: a parede que a cobriria é recusada com a distância', () => {
    const c = caso(fuso(lateral(0)).map((p, i) => (i === 1 ? ['casca', { ...p[1], espessura: 0.4 }] : p)));
    expect(c.n.orfaos.map((o) => o.motivo).join(' ')).toMatch(/abertas: com espessura 0\.4 as paredes das faces vizinhas se encontram antes de chegar ao plano da face aberta \d+ \(a cavidade para a [\d.]+ dele\)/);
  });

  it('com duas faces abertas: fechado, espessura 0,2 medida e duas bordas de 4 arestas', () => {
    const c = caso(fuso({ alias: 'duasLaterais' }), { aliases: [['duasLaterais', { unir: [lateral(0), lateral(2)] }]] });
    expect(c.n.orfaos).toEqual([]);
    expect(arestasSemPar(c.n)).toBe(0);
    expect(faces(c, 'borda')).toHaveLength(8);
    expect(faces(c, 'externa')).toHaveLength(10);
    medidoDentroDaTolerancia(c, 0.2);
  });
});

describe('casca — composição', () => {
  it('funciona como operação registrada numa composição procedural, com a espessura como parâmetro', () => {
    const MESH = 'mecanifica.malha-poligonal@1';
    const composicoes = criarRegistroComposicoes({ resolverOperacao: registro.resolver, composicoes: [{
      formato: FORMATO_COMPOSICAO_PROCEDURAL, id: 'mecanifica.composicao.gaveta', versao: '1.0.0', parametros: { espessura: { tipo: 'numero' } }, artefatos: { entra: [], sai: [MESH] },
      nos: [
        { id: 'corpo', operacao: 'cubo', argumentos: { origemId: 1, larg: 2, alt: 1, prof: 3 } },
        { id: 'oco', operacao: 'casca', argumentos: { origemId: 9, solido: { origem: { op: 'cubo', id: 1 } }, abertas: topo, espessura: { parametro: 'espessura' } } },
      ],
    }] });
    const passos = expandirComposicao(composicoes, 'mecanifica.composicao.gaveta', { espessura: 0.1 }).passos;
    const n = nucleo(passos, {}, {}, {}, null, [], { registroOperacoes: registro });
    expect(n.orfaos).toEqual([]);
    expect(volume(n)).toBeCloseTo(2 * 1 * 3 - 1.8 * 0.9 * 2.8, 9);
  });
});

describe('casca — determinismo', () => {
  it('a mesma receita dá a mesma malha, byte a byte, em execuções repetidas', () => {
    const hashes = new Set();
    for (let k = 0; k < 3; k++) hashes.add(sha256Hex(JSON.stringify(neutroCanonico(caso(PASSOS).n))));
    expect(hashes.size).toBe(1);
  });

  it('o loft com abertura sai igual byte a byte em execuções repetidas e entre registros novos', () => {
    const passos = [
      ['loft', { origemId: 1, lados: 4, secoes: [{ pos: [0, 0, 0], raio: 0 }, { pos: [0, 2, 0], contorno: [[2, 2], [-2, 2], [-2, -2], [2, -2]] }, { pos: [0, 4, 0], contorno: [[1.2, 1.2], [-1.2, 1.2], [-1.2, -1.2], [1.2, -1.2]] }, { pos: [0, 6, 0], raio: 0 }] }],
      ['casca', { origemId: 9, solido: { origem: { op: 'loft', id: 1 } }, abertas: { origem: { op: 'loft', id: 1, faixa: 1, lado: 0 } }, espessura: 0.2 }],
    ];
    const hashes = new Set();
    for (let k = 0; k < 3; k++) {
      const novo = criarRegistroComExtensoes({ registroBase: REGISTRO_OPERACOES, extensoes: [{ manifesto: MANIFESTO, implementacao: implementar }] });
      hashes.add(sha256Hex(JSON.stringify(neutroCanonico(nucleo(passos, {}, {}, {}, null, [], { registroOperacoes: novo })))));
    }
    expect(hashes.size).toBe(1);
  });

  it('o contrato de uso é descobrível e o exemplo executa sem órfãos', () => {
    const uso = registro.resolver('casca').uso;
    expect(uso).toMatchObject({ formato: 'mecanifica.uso-operacao@1', schemaArgumentos: { $id: 'mecanifica.argumentos.casca@1', required: ['origemId', 'solido', 'espessura'] }, exemplo: { PASSOS } });
    expect(caso(uso.exemplo.PASSOS).n.orfaos).toEqual([]);
  });
});

describe('casca — recusas', () => {
  const motivos = (c) => c.n.orfaos.map((o) => o.motivo).join(' | ');
  const intacta = (passos) => {
    const antes = neutroCanonico(caso(passos.slice(0, 1)).n);
    const depois = neutroCanonico(caso(passos).n);
    expect({ ...depois, orfaos: [] }).toEqual({ ...antes, orfaos: [] });
  };

  it('espessura de metade da menor medida ou mais diz o campo, o valor e o que é aceito', () => {
    const c = caso(caixa({ espessura: 0.5 }));
    expect(motivos(c)).toMatch(/espessura 0\.5 não cabe no sólido.*menor medida entre paredes é 1.*aceito: maior que 0 e menor que 0\.5/);
    intacta(c.passos);
  });

  it('com a face oposta aberta o limite sobe: a cavidade vai até ela', () => {
    expect(motivos(caso(caixa({ abertas: topo, espessura: 1 })))).toMatch(/espessura 1 não cabe.*aceito: maior que 0 e menor que 1$/);
    expect(caso(caixa({ abertas: topo, espessura: 0.99 })).n.orfaos).toEqual([]);
  });

  it('com a face oposta aberta a cavidade vai até ela e a espessura aceita chega à largura inteira', () => {
    const c = caso([['cubo', { origemId: 1, larg: 4, alt: 1, prof: 4 }], ['casca', { origemId: 9, solido: { origem: { op: 'cubo', id: 1 } }, abertas: topo, espessura: 0.9 }]]);
    expect(c.n.orfaos).toEqual([]);
    expect(volume(c.n)).toBeCloseTo(16 - 2.2 * 2.2 * 0.1, 9);
  });

  it.each([
    ['zero', 0, /espessura precisa ser um número finito maior que zero \(veio 0\)/],
    ['negativa', -1, /veio -1/],
  ])('espessura %s', (_, valor, msg) => {
    const c = caso(caixa({ abertas: topo, espessura: valor }));
    expect(motivos(c)).toMatch(msg);
    intacta(c.passos);
  });

  it('espessura, solido e origemId ausentes dizem qual campo falta', () => {
    expect(motivos(caso([caixa()[0], ['casca', { origemId: 9, solido: { tudo: true } }]]))).toMatch(/espessura: obrigatória/);
    expect(motivos(caso([caixa()[0], ['casca', { origemId: 9, espessura: 0.1 }]]))).toMatch(/solido: obrigatório/);
    expect(motivos(caso([caixa()[0], ['casca', { solido: { tudo: true }, espessura: 0.1 }]]))).toMatch(/origemId: obrigatório/);
  });

  it('argumento desconhecido é recusado pelo contrato com sugestão', () => {
    expect(motivos(caso(caixa({ aberta: topo })))).toMatch(/argumento desconhecido 'aberta'.*Você quis dizer 'abertas'/);
  });

  it('abertas fora do sólido', () => {
    const c = caso([...caixa().slice(0, 1), ['cubo', { origemId: 2, lado: 1, em: [5, 0.5, 0] }], ['casca', { origemId: 9, solido: { origem: { op: 'cubo', id: 1 } }, abertas: { origem: { op: 'cubo', id: 2, face: 'topo' } }, espessura: 0.1 }]]);
    expect(motivos(c)).toMatch(/abertas: a\(s\) face\(s\) \d+ não está\(ão\) no sólido/);
  });

  it('todas as faces abertas', () => {
    expect(motivos(caso(caixa({ abertas: { tudo: true } })))).toMatch(/abertas: todas as faces do sólido estão abertas/);
  });

  it('seleção de abertas vazia ou inexistente grita com o campo', () => {
    expect(motivos(caso(caixa({ abertas: { grupo: 'nada' } })))).toMatch(/abertas: .*grupo 'nada' não tem nenhuma face/);
  });

  it('sólido aberto (só as laterais do cilindro)', () => {
    const c = caso([['cilindro', { origemId: 1, raio: 1, altura: 2, lados: 8 }], ['casca', { origemId: 9, solido: { origem: { op: 'cilindro', id: 1 } }, espessura: 0.1 }]]);
    expect(motivos(c)).toMatch(/solido: o sólido não é fechado/);
    intacta(c.passos);
  });

  it('sólido de normais para dentro', () => {
    const c = caso([['cubo', { origemId: 1, lado: 1 }], ['vira', { face: 0 }], ['vira', { face: 1 }], ['vira', { face: 2 }], ['vira', { face: 3 }], ['vira', { face: 4 }], ['vira', { face: 5 }], ['casca', { origemId: 9, solido: { tudo: true }, espessura: 0.1 }]]);
    expect(motivos(c)).toMatch(/solido: o volume com sinal é nulo ou negativo/);
  });

  it('origemId duplicado é recusado como nas booleanas', () => {
    const c = caso([...caixa({ abertas: topo }), ['cubo', { origemId: 9, lado: 1 }]]);
    expect(motivos(c)).toMatch(/origemId 9 ambígua/);
  });

  it('o bloco do passo comporta 1000 faces: sólido grande demais é recusado com a conta', () => {
    const c = caso([['cilindro', { origemId: 1, raio: 1, altura: 2, lados: 500 }], ['casca', { origemId: 9, solido: { tudo: true }, espessura: 0.01, abertas: { origem: { op: 'cilindro', id: 1, tampa: 'topo' } } }]]);
    expect(motivos(c)).toMatch(/a casca precisa de \d+ vértices e \d+ faces novos e o bloco do passo comporta 1000/);
  });

  it('a extensão ausente do registro vira a recusa de operação desconhecida, sem estado parcial', () => {
    const n = nucleo(caixa({ abertas: topo }));
    expect(n.orfaos.map((o) => o.motivo).join(' ')).toMatch(/operação desconhecida 'casca'/);
    expect(n.F.size).toBe(6);
  });
});

describe('casca — função pura', () => {
  const cuboPuro = () => {
    const n = nucleo([['cubo', { origemId: 1, lado: 2 }]]);
    return { vertices: [...n.V].map(([id, p]) => [id, [...p]]), faces: [...n.F.values()].map((f) => [f.id, [...f.vs]]) };
  };

  it('recua por vértice quando cada vértice tem três faces, e por semiespaços quando os planos recuados não concorrem', () => {
    const { vertices, faces } = cuboPuro();
    expect(calcularCasca({ vertices, faces, abertas: [], espessura: 0.1 }).medidas.metodo).toBe('vertice');
    const n = nucleo([['loft', { origemId: 1, lados: 4, secoes: [{ pos: [0, 0, 0], raio: 0 }, { pos: [0, 2, 0], contorno: [[2, 2], [-2, 2], [-2, -2], [2, -2]] }, { pos: [0, 4, 0], contorno: [[1.2, 1.2], [-1.2, 1.2], [-1.2, -1.2], [1.2, -1.2]] }, { pos: [0, 6, 0], raio: 0 }] }]]);
    const v = [...n.V].map(([id, p]) => [id, [...p]]), f = [...n.F.values()].map((x) => [x.id, [...x.vs]]);
    expect(calcularCasca({ vertices: v, faces: f, abertas: [], espessura: 0.2 }).medidas.metodo).toBe('vertice');
    const aberto = calcularCasca({ vertices: v, faces: f, abertas: [4], espessura: 0.2 });
    expect(aberto.medidas.metodo).toBe('planos');
    expect(aberto.medidas.espessuraMinima).toBeGreaterThanOrEqual(0.2 * (1 - TOLERANCIA_CASCA));
    expect(aberto.medidas.desvioDePlano).toBeLessThan(1e-9);
  });

  it('face não plana acima da tolerância é recusada com o desvio', () => {
    const { vertices, faces } = cuboPuro();
    vertices[0][1][1] += 0.1;
    expect(() => calcularCasca({ vertices, faces, abertas: [], espessura: 0.1 })).toThrow(/há face não plana, que desvia .* acima da tolerância/);
  });

  it('as medidas devolvidas trazem a tolerância declarada e o número de amostras', () => {
    const { vertices, faces } = cuboPuro();
    const { medidas } = calcularCasca({ vertices, faces, abertas: [5], espessura: 0.1 });
    expect(medidas).toMatchObject({ espessura: 0.1, tolerancia: 0.1 * TOLERANCIA_CASCA });
    expect(medidas.amostras).toBeGreaterThan(0);
    expect(Math.abs(medidas.espessuraMinima - 0.1)).toBeLessThan(1e-9);
    expect(Math.abs(medidas.espessuraMaxima - 0.1)).toBeLessThan(1e-9);
  });

  const prismaL = () => {
    // L extrudado em y por 4: contorno em x/z com a quina reentrante em (1,1)
    const L = [[0, 0], [3, 0], [3, 1], [1, 1], [1, 3], [0, 3]];
    const vertices = [];
    L.forEach(([x, z], k) => { vertices.push([k, [x, 0, z]]); vertices.push([k + 6, [x, 4, z]]); });
    const faces = [];
    L.forEach((_, k) => { const m = (k + 1) % 6; faces.push([k, [k, m, m + 6, k + 6]]); });
    // o enrolamento vem do conferido abaixo: a normal precisa apontar para fora
    return { vertices, faces, L };
  };

  it('numa quina reentrante a parede nunca fica abaixo de t e engrossa até t√2 só perto dela', () => {
    const { vertices, faces } = prismaL();
    // tampas: o contorno visto de baixo (y=0) e de cima; a ordem do contorno é anti-horária visto de +y para o L acima
    const base = [0, 1, 2, 3, 4, 5], topoL = base.map((k) => k + 6);
    const todas = [...faces, [10, base.slice().reverse()], [11, topoL]];
    const fixa = todas.map(([id, vs]) => [id, vs]);
    let r;
    try { r = calcularCasca({ vertices, faces: fixa, abertas: [11], espessura: 0.2 }); } catch (e) { r = calcularCasca({ vertices, faces: fixa.map(([id, vs]) => [id, vs.slice().reverse()]), abertas: [11], espessura: 0.2 }); }
    expect(r.medidas.espessuraMinima).toBeGreaterThanOrEqual(0.2 * (1 - TOLERANCIA_CASCA));
    expect(r.medidas.espessuraMaxima).toBeLessThanOrEqual(0.2 * Math.SQRT2 + 1e-9);
    expect(r.medidas.espessuraMaxima).toBeGreaterThan(0.2 + 1e-6);
    expect(r.medidas.desvioDePlano).toBeLessThan(1e-9);
  });

  it('espessura grande que inverte a parede é recusada com a medida', () => {
    const { vertices, faces } = prismaL();
    const base = [0, 1, 2, 3, 4, 5], topoL = base.map((k) => k + 6);
    const todas = [...faces, [10, base.slice().reverse()], [11, topoL]];
    const orientar = (fs) => { try { calcularCasca({ vertices, faces: fs, espessura: 0.01 }); return fs; } catch { return fs.map(([id, vs]) => [id, vs.slice().reverse()]); } };
    expect(() => calcularCasca({ vertices, faces: orientar(todas), espessura: 0.45 })).toThrow(/espessura 0\.45 (não cabe|inverte|faz a parede invadir)/);
  });
});

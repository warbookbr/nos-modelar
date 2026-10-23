/* gaiola-leitura.test.mjs — a leitura de imagem declarada na gaiola por estações e o peso padrão do passo `subdivisao`
 * (fatia 2 do plano da gaiola que segue as feições).
 *
 * A cota lida de imagem que passa exata por cada ponto copia o erro de leitura em rugas, então a gaiola que declara `leitura`
 * mede por peso o que não declara `exata`, e o passo aceita `pesoPadrao` com a mesma regra. Sem a declaração, o nome sozinho
 * continua cota exata, e a receita salva antes dela tem a mesma saída. A leitura também avisa, pelo nome, quando duas estações-chave
 * vizinhas ficam mais perto do que o erro de leitura sustenta. A chapa é uma grade de 5 estações em z e 5 colunas em x, a cada
 * 100 mm, desenhada por código. */
import { describe, expect, it } from 'vitest';
import { gaiolaPorEstacoes, LEITURA_PADRAO } from './gaiola-por-estacoes.js';
import { gaiolaDoPasso } from './operacoes/subdivisao.js';

const altura = (x, z) => 0.1 - ((x - 0.2) ** 2) / 4 - ((z - 0.2) ** 2) / 6;
const estacoesEm = (zs, colunas = 5) => zs.map((z, e) => ({
  nome: `e${e}`, em: z,
  colunas: Array.from({ length: colunas }, (_, c) => ({ nome: `c${c}`, em: [0.1 * c, altura(0.1 * c, z)] })),
}));
const PASSOS_EM_Z = [0, 0.1, 0.2, 0.3, 0.4];
const gaiola = (extra = {}, zs = PASSOS_EM_Z) => gaiolaPorEstacoes({ eixo: 'z', estacoes: estacoesEm(zs), ...extra });
const grito = (fn) => { try { fn(); } catch (e) { return String(e.message); } return null; };
const pesoDe = (g, ponto) => { const m = g.passo.medidas.find((x) => (typeof x === 'string' ? x : x.ponto) === ponto); return m === undefined ? undefined : (typeof m === 'string' ? Infinity : m.peso); };

describe('a medida da gaiola que declara leitura', () => {
  it('sem leitura a medida sem peso é exata, e leitura ausente ou nula dá a mesma saída byte a byte', () => {
    const base = gaiola({ medidas: [{ estacao: 'e2' }] });
    expect(base.passo.medidas).toEqual(['e2_c0', 'e2_c1', 'e2_c2', 'e2_c3', 'e2_c4']);
    expect(base.avisos).toBeUndefined();
    expect(JSON.stringify(gaiola({ medidas: [{ estacao: 'e2' }], leitura: undefined }).passo)).toBe(JSON.stringify(base.passo));
    expect(JSON.stringify(gaiola({ medidas: [{ estacao: 'e2' }], leitura: null }).passo)).toBe(JSON.stringify(base.passo));
    expect(JSON.stringify(gaiola({ medidas: [{ estacao: 'e2' }], leitura: false }).passo)).toBe(JSON.stringify(base.passo));
  });

  it('com leitura, a medida sem peso ganha o peso da leitura, 1 por padrão, e os cantos não mudam', () => {
    expect(LEITURA_PADRAO.peso).toBe(1);
    const g = gaiola({ leitura: true, medidas: [{ estacao: 'e2' }], cantos: [{ estacao: 'e0', coluna: 'c0' }] });
    expect(g.passo.medidas).toEqual(['c0', 'c1', 'c2', 'c3', 'c4'].map((c) => ({ ponto: `e2_${c}`, peso: 1 })));
    expect(g.passo.cantos).toEqual(['e0_c0']);
    expect(gaiola({ leitura: { peso: 4 }, medidas: [{ estacao: 'e2', coluna: 'c1' }] }).passo.medidas).toEqual([{ ponto: 'e2_c1', peso: 4 }]);
    expect(gaiola({ leitura: { peso: 'pesoLido' }, medidas: [{ estacao: 'e2', coluna: 'c1' }] }).passo.medidas).toEqual([{ ponto: 'e2_c1', peso: 'pesoLido' }]);
  });

  it('a cota de projeto se declara exata, o peso próprio vale mais que o da leitura, e a declaração vence o padrão sobre o mesmo ponto', () => {
    const g = gaiola({
      leitura: true,
      medidas: [{ estacao: 'e1' }, { estacao: 'e1', coluna: 'c2', exata: true }, { estacao: 'e1', coluna: 'c3', peso: 8 }, { estacao: 'e1' }],
    });
    expect(pesoDe(g, 'e1_c0')).toBe(1);
    expect(pesoDe(g, 'e1_c2')).toBe(Infinity);
    expect(pesoDe(g, 'e1_c3')).toBe(8);
    expect(g.passo.medidas).toContain('e1_c2');
    /* a mesma exata declarada antes do padrão também vence */
    const antes = gaiola({ leitura: true, medidas: [{ estacao: 'e1', coluna: 'c2', exata: true }, { estacao: 'e1' }] });
    expect(pesoDe(antes, 'e1_c2')).toBe(Infinity);
    /* sem leitura, exata: true é o que a medida sem peso já era */
    expect(gaiola({ medidas: [{ estacao: 'e1', exata: true }] }).passo.medidas).toEqual(['e1_c0', 'e1_c1', 'e1_c2', 'e1_c3', 'e1_c4']);
  });

  it('duas declarações de pesos diferentes sobre o ponto gritam, e exata com peso e valores soltos também', () => {
    expect(grito(() => gaiola({ leitura: true, medidas: [{ estacao: 'e1', peso: 5 }, { estacao: 'e1', coluna: 'c2', exata: true }] }))).toMatch(/medidas\[1\] marca 'e1_c2' com outro peso que uma medida anterior/);
    expect(grito(() => gaiola({ leitura: true, medidas: [{ estacao: 'e1', peso: 5 }, { estacao: 'e1', coluna: 'c2', peso: 6 }] }))).toMatch(/com outro peso/);
    expect(grito(() => gaiola({ medidas: [{ estacao: 'e1' }, { estacao: 'e1', coluna: 'c2', peso: 6 }] }))).toMatch(/com outro peso/);
    expect(grito(() => gaiola({ medidas: [{ estacao: 'e1', exata: true, peso: 4 }] }))).toMatch(/declara exata e peso/);
    expect(grito(() => gaiola({ medidas: [{ estacao: 'e1', exata: 'sim' }] }))).toMatch(/exata só como true ou false/);
    expect(grito(() => gaiola({ cantos: [{ estacao: 'e1', exata: true }] }))).toMatch(/campo desconhecido 'exata'/);
    expect(grito(() => gaiola({ leitura: { peso: 0 }, medidas: [{ estacao: 'e1' }] }))).toMatch(/a leitura tem peso 0/);
    expect(grito(() => gaiola({ leitura: { erro: -1 } }))).toMatch(/a leitura tem erro -1/);
    expect(grito(() => gaiola({ leitura: { inclinacao: 0 } }))).toMatch(/a leitura tem inclinacao 0/);
    expect(grito(() => gaiola({ leitura: { estrito: 'sim' } }))).toMatch(/estrito: true ou false/);
    expect(grito(() => gaiola({ leitura: { peso: 1, extra: 3 } }))).toMatch(/campo desconhecido 'extra'/);
  });

  it('o peso da leitura chega ao ajuste: a superfície com leitura é a das medidas com peso, e a exata é a de antes', () => {
    const gl = gaiola({ leitura: true, medidas: [{ estacao: 'e2' }] }); const gp = gaiola({ medidas: [{ estacao: 'e2', peso: 1 }] });
    const resolver = (g) => gaiolaDoPasso({ ...g.passo, borda: 'cantos' }, { vec: (p) => g.pontos[p], num: (x) => x });
    const comLeitura = resolver(gl); const comPeso = resolver(gp);
    expect(comLeitura.erro).toBeUndefined();
    expect(comLeitura.medidas.every((m) => m.peso === 1)).toBe(true);
    expect(JSON.stringify(comLeitura.gaiola.vertices)).toBe(JSON.stringify(comPeso.gaiola.vertices));
  });
});

describe('o aviso de estações-chave mais perto do que o erro de leitura sustenta', () => {
  it('com 100 mm entre as estações não há aviso, e a gaiola sem leitura não tem o campo', () => {
    expect(gaiola({ leitura: true }).avisos).toEqual([]);
    expect(gaiola({}).avisos).toBeUndefined();
  });

  it('duas estações a 4 mm avisam pelo nome, com o espaçamento e o mínimo recomendado', () => {
    const g = gaiola({ leitura: true }, [0, 0.1, 0.2, 0.204, 0.3]);
    expect(g.avisos).toHaveLength(1);
    expect(g.avisos[0]).toMatchObject({ ref: 'estacoesProximas', estacoes: ['e2', 'e3'], espacamentoMm: 4, minimoRecomendadoMm: 40, inclinacao: 1 });
    expect(g.avisos[0].texto).toMatch(/estações-chave 'e2' e 'e3' ficam a 4 mm uma da outra/);
    expect(g.avisos[0].texto).toMatch(/espaçamento mínimo recomendado é 40 mm/);
  });

  it('o limiar vem do erro e da inclinação declarados: o mínimo é 2 × erro / inclinação, e no mínimo exato não avisa', () => {
    const zs = [0, 0.1, 0.2, 0.212, 0.3];
    expect(gaiola({ leitura: true }, zs).avisos.map((a) => a.estacoes)).toEqual([['e2', 'e3']]);
    const frouxa = gaiola({ leitura: { erro: 1, inclinacao: 0.2 } }, zs);
    expect(frouxa.avisos).toEqual([]);
    const justa = gaiola({ leitura: { erro: 1, inclinacao: 0.2 } }, [0, 0.1, 0.2, 0.209, 0.3]);
    expect(justa.avisos[0]).toMatchObject({ estacoes: ['e2', 'e3'], espacamentoMm: 9, minimoRecomendadoMm: 10 });
    expect(gaiola({ leitura: { erro: 1, inclinacao: 0.2 } }, [0, 0.1, 0.2, 0.21, 0.3]).avisos).toEqual([]);
  });

  it('seis estações amontoadas dão um aviso por par vizinho, cada um com os nomes', () => {
    const g = gaiola({ leitura: true }, [0, 0.1, 0.2, 0.204, 0.208, 0.212, 0.216, 0.22, 0.3]);
    expect(g.avisos.map((a) => a.estacoes)).toEqual([['e2', 'e3'], ['e3', 'e4'], ['e4', 'e5'], ['e5', 'e6'], ['e6', 'e7']]);
  });

  it('com estrito o aviso vira erro que cita todos os pares', () => {
    const msg = grito(() => gaiola({ leitura: { estrito: true } }, [0, 0.1, 0.2, 0.204, 0.208, 0.3]));
    expect(msg).toMatch(/a leitura é estrita e 2 pares de estações-chave estão mais perto/);
    expect(msg).toMatch(/'e2' e 'e3'/);
    expect(msg).toMatch(/'e3' e 'e4'/);
    expect(grito(() => gaiola({ leitura: { estrito: true } }))).toBeNull();
  });

  it('só as estações-chave contam: a estação que a interpolação gera, a 5 mm, não avisa', () => {
    const estacoes = [
      { nome: 'a', em: 0, colunas: estacoesEm([0])[0].colunas },
      { nome: 'm', em: 0.2 },
      { nome: 'b', em: 0.4, colunas: estacoesEm([0.4])[0].colunas },
    ];
    const g = gaiolaPorEstacoes({ eixo: 'z', estacoes, interpolar: { passo: 0.005 }, leitura: true });
    expect(g.estacoes.filter((e) => e.tipo === 'gerada').length).toBeGreaterThan(10);
    expect(g.avisos).toEqual([]);
    /* a chave que ficou a 4 mm da outra avisa */
    const apertada = [{ nome: 'a', em: 0, colunas: estacoesEm([0])[0].colunas }, { nome: 'b', em: 0.004, colunas: estacoesEm([0.004])[0].colunas }];
    expect(gaiolaPorEstacoes({ eixo: 'z', estacoes: apertada, leitura: true }).avisos[0].estacoes).toEqual(['a', 'b']);
  });

  it('na curva, o espaçamento é o do comprimento: a fração vezes a poligonal', () => {
    const colunas = (v) => [{ nome: 'p', em: [0, 0] }, { nome: 'q', em: [0.1, v] }];
    const curva = { curva: 'trilho', pontos: [[0, 0, 0], [0, 0, 1], [0, 0, 2]], normal: [0, 1, 0] };
    const g = gaiolaPorEstacoes({ eixo: curva, leitura: true, estacoes: [{ nome: 's0', em: 0, colunas: colunas(0) }, { nome: 's1', em: 0.002, colunas: colunas(0) }, { nome: 's2', em: 0.5, colunas: colunas(0) }] });
    expect(g.avisos).toHaveLength(1);
    expect(g.avisos[0]).toMatchObject({ estacoes: ['s0', 's1'], espacamentoMm: 4 });
  });
});

describe('o peso padrão do passo subdivisao', () => {
  const grade = () => {
    const vertices = []; const faces = [];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) vertices.push(`p${i}${j}`);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) faces.push([`p${i}${j}`, `p${i + 1}${j}`, `p${i + 1}${j + 1}`, `p${i}${j + 1}`]);
    const pos = Object.fromEntries(vertices.map((n) => [n, [Number(n[1]) * 0.1, 0.01 * ((Number(n[1]) + Number(n[2])) % 2), Number(n[2]) * 0.1]]));
    return { vertices, faces, pos };
  };
  const rodar = (extra) => {
    const g = grade();
    return gaiolaDoPasso({ vertices: g.vertices, faces: g.faces, borda: 'cantos', ...extra }, { vec: (p) => g.pos[p], num: (x) => (typeof x === 'string' ? { lido: 2 }[x] : x) });
  };

  it('sem pesoPadrao o nome sozinho é cota exata, como sempre foi', () => {
    const r = rodar({ medidas: ['p11', 'p12'] });
    expect(r.erro).toBeUndefined();
    expect(r.medidas.map((m) => m.peso)).toEqual([Infinity, Infinity]);
  });

  it('com pesoPadrao o nome sozinho ganha o peso, a exata se escreve { ponto, exata: true } e o peso próprio vale mais', () => {
    const r = rodar({ pesoPadrao: 1, medidas: ['p11', 'p12', { ponto: 'p21', exata: true }, { ponto: 'p22', peso: 8 }] });
    expect(r.erro).toBeUndefined();
    const peso = Object.fromEntries(r.medidas.map((m) => [m.indice, m.peso]));
    const indice = (n) => grade().vertices.indexOf(n);
    expect([peso[indice('p11')], peso[indice('p12')], peso[indice('p21')], peso[indice('p22')]]).toEqual([1, 1, Infinity, 8]);
    /* o peso por nome de PARAMS */
    expect(rodar({ pesoPadrao: 'lido', medidas: ['p11'] }).medidas[0].peso).toBe(2);
  });

  it('a declaração do ponto vence o padrão, e duas declarações diferentes gritam', () => {
    const r = rodar({ pesoPadrao: 1, medidas: ['p11', { ponto: 'p11', exata: true }, 'p11'] });
    expect(r.erro).toBeUndefined();
    expect(r.medidas).toHaveLength(1);
    expect(r.medidas[0].peso).toBe(Infinity);
    expect(rodar({ pesoPadrao: 1, medidas: [{ ponto: 'p11', exata: true }, { ponto: 'p11', peso: 3 }] }).erro[1]).toMatch(/pesos diferentes/);
  });

  it('os gritos dizem o que escrever', () => {
    expect(rodar({ pesoPadrao: 0, medidas: ['p11'] }).erro[1]).toMatch(/pesoPadrao precisa ser número finito maior que zero/);
    expect(rodar({ pesoPadrao: 1, medidas: [{ ponto: 'p11' }] }).erro[1]).toMatch(/\{ ponto, exata: true \}/);
    expect(rodar({ medidas: [{ ponto: 'p11', exata: true, peso: 2 }] }).erro[1]).toMatch(/declara exata e peso/);
    expect(rodar({ medidas: [{ ponto: 'p11', exata: 1 }] }).erro[1]).toMatch(/exata só como true/);
    expect(rodar({ medidas: [{ ponto: 'p11', outro: 1 }] }).erro[1]).toMatch(/campo desconhecido 'outro'/);
  });
});

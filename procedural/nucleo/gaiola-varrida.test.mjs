/* gaiola-varrida.test.mjs — a gaiola varrida: uma régua em reta, um friso em arco com as pontas cortadas numa altura, uma seção com
 * borda rolada e alargamento, os recortes e os vincos, a entrega ao passo `subdivisao` e os gritos de dado ruim com o campo.
 *
 * A prova é numérica: posição de cada ponto contra a conta feita à mão, raio a cada ponto do arco, altura das pontas, o máximo e o limite
 * da borda rolada contra a fórmula escrita no teste, normais para fora e mesma saída byte a byte. As peças são as de
 * `fixtures/varredura-prova.js`. */
import { describe, expect, it } from 'vitest';
import { ErroGaiolaVarrida, gaiolaVarrida } from './gaiola-varrida.js';
import { nucleo } from './entrada.js';
import { ARCO, SAIA, friso, regua, saia } from './fixtures/varredura-prova.js';

const MM = 1000;
const perto = (a, b, tol = 1e-9) => a.every((x, k) => Math.abs(x - b[k]) <= tol);
const grito = (fn) => { try { fn(); } catch (e) { return e; } throw new Error('não gritou'); };
const distAoEixoX = (p, c) => Math.hypot(p[1] - c[1], p[2] - c[2]);
const normal = (g, f) => {
  const ps = f.map((n) => g.posicoes.get(n)); let n = [0, 0, 0];
  ps.forEach((p, k) => { const q = ps[(k + 1) % ps.length]; n = [n[0] + (p[1] - q[1]) * (p[2] + q[2]), n[1] + (p[2] - q[2]) * (p[0] + q[0]), n[2] + (p[0] - q[0]) * (p[1] + q[1])]; });
  const c = ps.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]);
  return { n, c };
};
const entrega = (g, extra = {}) => nucleo([['subdivisao', { vertices: g.vertices, faces: g.faces, vincos: g.vincos, cantos: g.cantos, niveis: 1, ...extra }]], {}, g.pontos);

describe('a régua varrida em reta', () => {
  const g = gaiolaVarrida(regua());

  it('tem uma estação a cada 100 mm e cada ponto na conta feita à mão', () => {
    expect(g.estacoes).toHaveLength(11);
    expect(g.vertices).toHaveLength(33);
    expect(g.faces).toHaveLength(20);
    expect(g.comprimento).toBeCloseTo(1000, 9);
    for (let i = 0; i <= 10; i++) {
      [0, 50, 100].forEach((v, j) => expect(perto(g.posicoes.get(g.nomeDe(i, j)), [0, v, 100 * i])).toBe(true));
    }
  });

  it('sai em metro nos pontos, em mm nas posições, e as faces olham para o lado de fora', () => {
    expect(g.pontos[g.nomeDe(10, 2)]).toEqual([0, 0.1, 1]);
    for (const f of g.faces) expect(normal(g, f).n[0]).toBeGreaterThan(0);
    const contra = gaiolaVarrida(regua({ fora: [-1, 0, 0] }));
    for (const f of contra.faces) expect(normal(contra, f).n[0]).toBeLessThan(0);
  });

  it('o passo subdivisao aceita a gaiola e devolve a superfície sobre a faixa', () => {
    const neutro = entrega(g);
    const ys = [...neutro.V.values()].map((p) => p[1]);
    expect(Math.min(...ys)).toBeCloseTo(0, 9);
    expect(Math.max(...ys)).toBeCloseTo(0.1, 9);
    expect(neutro.F.size).toBe(g.faces.length * 4);
  });

  it('mesma definição, mesma saída, byte a byte', () => {
    expect(JSON.stringify(gaiolaVarrida(regua()))).toBe(JSON.stringify(g));
  });

  it('um marco em mm, uma divisão em n partes e um trilho em polilinha dão a mesma régua', () => {
    const b = gaiolaVarrida(regua({ trilho: { pontos: [[0, 0, 0], [0, 0, 1000]] }, estacoes: [{ em: 0 }, { entre: 10 }, { em: 1000 }] }));
    expect(b.vertices).toEqual(g.vertices);
    for (const n of g.vertices) expect(perto(b.posicoes.get(n), g.posicoes.get(n), 1e-9)).toBe(true);
  });
});

describe('o friso em arco com as pontas cortadas', () => {
  const g = gaiolaVarrida(friso());

  it('cada linha fica no raio da seção em torno do eixo, em todas as estações', () => {
    const raios = [ARCO.raio, ARCO.raio + 20, ARCO.raio + 60];
    g.estacoes.forEach((_, i) => raios.forEach((r, j) => expect(distAoEixoX(g.posicoes.get(g.nomeDe(i, j)), ARCO.centro)).toBeCloseTo(r, 6)));
  });

  it('as pontas acabam na altura pedida em todas as linhas, uma subindo e a outra descendo', () => {
    const ult = g.estacoes.length - 1;
    for (let j = 0; j < 3; j++) {
      const a = g.posicoes.get(g.nomeDe(0, j)); const b = g.posicoes.get(g.nomeDe(ult, j));
      expect(a[1]).toBeCloseTo(ARCO.corteDeFrente, 6);
      expect(b[1]).toBeCloseTo(ARCO.corteDeTras, 6);
      expect(a[2]).toBeGreaterThan(0); // a frente do arco
      expect(b[2]).toBeLessThan(0); // a traseira
    }
  });

  it('a seção sai em x pela aresta u, e as faces olham para o lado de fora', () => {
    expect(g.posicoes.get(g.nomeDe(3, 1))[0]).toBeCloseTo(525, 9);
    expect(g.posicoes.get(g.nomeDe(3, 0))[0]).toBeCloseTo(500, 9);
    for (const f of g.faces) expect(normal(g, f).n[0]).toBeGreaterThan(0);
  });

  it('as estações andam em ângulo igual entre as pontas, e a superfície subdivide', () => {
    expect(g.estacoes).toHaveLength(13);
    const ang = (i) => Math.atan2(g.posicoes.get(g.nomeDe(i, 0))[1] - 300, g.posicoes.get(g.nomeDe(i, 0))[2]);
    const passo = ang(1) - ang(0);
    for (let i = 1; i < 12; i++) expect(ang(i + 1) - ang(i)).toBeCloseTo(passo, 9);
    const neutro = entrega(g);
    expect(neutro.F.size).toBe(g.faces.length * 4);
    const ys = [...neutro.V.values()].map((p) => p[1] * MM);
    expect(Math.max(...ys)).toBeLessThanOrEqual(300 + ARCO.raio + 60 + 1e-6);
  });

  it('um marco que a linha não cruza grita com o marco e a linha', () => {
    const e = grito(() => gaiolaVarrida(friso({ estacoes: [{ plano: { eixo: 'y', valor: 400 }, cruzando: 'subindo' }, { plano: { eixo: 'y', valor: 5000 }, nome: 'alto' }] })));
    expect(e).toBeInstanceOf(ErroGaiolaVarrida);
    expect(e.message).toMatch(/linha 'boca' da seção não cruza o corte 'alto'/);
  });
});

describe('a seção com borda rolada e alargamento', () => {
  const g = gaiolaVarrida(saia());
  const perfil = (d) => {
    const p = SAIA.perfil;
    if (d <= p[0][0] || d >= p.at(-1)[0]) return 0;
    let k = 1; while (p[k][0] < d) k++;
    return p[k - 1][1] + ((p[k][1] - p[k - 1][1]) * (d - p[k - 1][0])) / (p[k][0] - p[k - 1][0]);
  };
  const dFora = (z, y) => Math.hypot(y - SAIA.cilindro.por[1], z - SAIA.cilindro.por[2]) - SAIA.cilindro.raio;
  const proprio = { borda: 10, rolo: 20, face: 20, topo: -1 };
  const vs = { borda: 0, rolo: 10, face: 80, topo: 150 };

  it('cada linha sai pelo maior entre a seção e o perfil, e a borda de baixo fica limitada à razão', () => {
    let tocouNoAlargamento = 0; let tocouNoLimite = 0;
    g.estacoes.forEach((_, i) => ['borda', 'rolo', 'face'].forEach((nome, j) => {
      const p = g.posicoes.get(g.nomeDe(i, j));
      const s = perfil(dFora(p[2], vs[nome]));
      let esperado = s > 0 ? Math.max(s, proprio[nome]) : proprio[nome];
      if (s > 0 && vs[nome] < SAIA.rolada.abaixoDe) esperado = Math.min(esperado, SAIA.rolada.razao * proprio[nome]);
      expect(p[0]).toBeCloseTo(esperado, 9);
      expect(p[1]).toBeCloseTo(vs[nome], 9);
      if (s > proprio[nome]) tocouNoAlargamento += 1;
      if (s > 0 && vs[nome] < SAIA.rolada.abaixoDe && SAIA.rolada.razao * proprio[nome] < Math.max(s, proprio[nome])) tocouNoLimite += 1;
    }));
    expect(tocouNoAlargamento).toBeGreaterThan(0);
    expect(tocouNoLimite).toBeGreaterThan(0);
  });

  it('a linha que encosta na chapa fica nela, e com topoAberto sobe com o alargamento', () => {
    g.estacoes.forEach((_, i) => expect(g.posicoes.get(g.nomeDe(i, 3))[0]).toBeCloseTo(-1, 9));
    const aberto = gaiolaVarrida(saia({}, { topoAberto: true }));
    let subiu = 0;
    aberto.estacoes.forEach((_, i) => {
      const p = aberto.posicoes.get(aberto.nomeDe(i, 3));
      const s = perfil(dFora(p[2], 150));
      expect(p[0]).toBeCloseTo(s > 0 ? Math.max(s, proprio.topo) : proprio.topo, 9);
      if (s > 0) subiu += 1;
    });
    expect(subiu).toBeGreaterThan(0);
  });

  it('sem o limite rolado a borda de baixo acompanha o perfil inteiro', () => {
    const livre = gaiolaVarrida(saia({}, { rolada: undefined }));
    const maior = (gg) => Math.max(...gg.estacoes.map((_, i) => gg.posicoes.get(gg.nomeDe(i, 0))[0]));
    expect(maior(livre)).toBeGreaterThan(maior(g) + 1);
    expect(maior(g)).toBeCloseTo(SAIA.rolada.razao * proprio.borda, 9);
  });

  it('uma lista de alargamentos dá a cada ponto o maior entre as suas saídas', () => {
    const outro = { campo: { cilindro: { ...SAIA.cilindro, por: [0, 100, 900] } }, perfil: SAIA.perfil, rolada: SAIA.rolada };
    const um = gaiolaVarrida(saia());
    const dois = gaiolaVarrida(saia({ alargamento: [saia().alargamento, outro] }));
    const so = gaiolaVarrida(saia({ alargamento: outro }));
    let maisLargo = 0;
    um.estacoes.forEach((_, i) => ['borda', 'rolo', 'face'].forEach((nome, j) => {
      const x = (gg) => gg.posicoes.get(gg.nomeDe(i, j))[0];
      expect(x(dois)).toBeCloseTo(Math.max(x(um), x(so)), 9);
      if (x(dois) > x(um) + 1e-9) maisLargo += 1;
    }));
    expect(maisLargo).toBeGreaterThan(0);
  });

  it('o passo medido na linha citada põe o mesmo número de estações em todas as linhas', () => {
    const base = friso({ estacoes: [{ plano: { eixo: 'y', valor: 400 }, cruzando: 'subindo' }, { passo: 5 * Math.PI / 180 * ARCO.raio, linha: 'boca' }, { plano: { eixo: 'y', valor: 420 }, cruzando: 'descendo' }] });
    const g = gaiolaVarrida(base);
    const alcance = (nome) => { const s = g.estacoes; const j = g.linhas.indexOf(nome); return s.at(-1).s[j] - s[0].s[j]; };
    expect(g.estacoes).toHaveLength(Math.ceil(alcance('boca') / (5 * Math.PI / 180 * ARCO.raio) - 1e-9) + 1);
    const e = grito(() => gaiolaVarrida(friso({ estacoes: [base.estacoes[0], { passo: 5, linha: 'nada' }, base.estacoes[2]] })));
    expect(e.message).toMatch(/estacoes\[1\]\.linha cita 'nada', que não é nome de linha da seção/);
  });

  it('o passo subdivisao aceita a malha com o alargamento', () => {
    const neutro = entrega(g, { liso: false });
    expect(neutro.F.size).toBe(g.faces.length * 4);
  });
});

describe('os recortes, os vincos e a escala', () => {
  it('remover tira só as células entre os marcos e as linhas citadas, e o vinco para onde a aresta perde a vizinha', () => {
    const base = regua({ estacoes: [{ fracao: 0, nome: 'a' }, { entre: 4 }, { em: 500, nome: 'b' }, { entre: 4 }, { fracao: 1, nome: 'c' }], vincos: [{ linha: 'meio', nitidez: 'viva' }] });
    const inteira = gaiolaVarrida(base);
    const recortada = gaiolaVarrida({ ...base, remover: [{ estacoes: ['b', 'c'], linhas: ['baixo', 'cima'] }] });
    expect(inteira.faces).toHaveLength(16);
    expect(recortada.faces).toHaveLength(8);
    expect(recortada.vertices.every((n) => n.startsWith('regua_'))).toBe(true);
    expect(inteira.vincos).toHaveLength(1);
    expect(inteira.vincos[0].pontos).toHaveLength(9);
    expect(recortada.vincos[0].pontos).toHaveLength(5);
    const so = gaiolaVarrida({ ...base, remover: [{ estacoes: ['b', 'c'], linhas: ['baixo', 'cima'] }] });
    expect(so.vertices).toEqual(recortada.vertices);
    expect(entrega(recortada).F.size).toBe(recortada.faces.length * 4);
  });

  it('a escala dos marcos faz a seção sair menos numa ponta e anda em linha reta entre eles', () => {
    const g = gaiolaVarrida(regua({
      secao: [{ u: 0, v: 0 }, { u: 40, v: 100 }],
      estacoes: [{ fracao: 0, escala: 1 }, { entre: 5 }, { fracao: 1, escala: 0.5 }],
    }));
    const xs = g.estacoes.map((_, i) => g.posicoes.get(g.nomeDe(i, 1))[0]);
    expect(xs[0]).toBeCloseTo(40, 9);
    expect(xs[5]).toBeCloseTo(20, 9);
    expect(xs[2]).toBeCloseTo(32, 9);
  });

  it('o trilho em segmentos de reta e arco se emenda: uma planta de reta, quina e reta', () => {
    const g = gaiolaVarrida({
      nome: 'planta',
      trilho: [{ reta: { de: [-300, 0, 0], ate: [0, 0, 0] } }, { arco: { centro: [0, 0, 100], eixo: [0, 1, 0], de: [0, 0, 0], graus: -90 } }, { reta: { de: [100, 0, 100], ate: [100, 0, 400] } }],
      quadro: { v: [0, 1, 0], virar: true },
      secao: [{ u: 0, v: 0 }, { u: 20, v: 0 }, { u: 20, v: 50 }],
      estacoes: [{ fracao: 0 }, { passo: 50 }, { fracao: 1 }],
      fora: { centro: [0, 0, 100], semEixo: 'y' },
    });
    expect(g.comprimento).toBeCloseTo(300 + (Math.PI / 2) * 100 + 300, 6);
    const ultimo = g.estacoes.length - 1;
    expect(perto(g.posicoes.get(g.nomeDe(0, 0)), [-300, 0, 0], 1e-6)).toBe(true);
    expect(perto(g.posicoes.get(g.nomeDe(ultimo, 0)), [100, 0, 400], 1e-6)).toBe(true);
    const ponta = g.posicoes.get(g.nomeDe(ultimo, 1));
    expect(Math.abs(ponta[0] - 100)).toBeCloseTo(20, 6);
    // o v fixo é a vertical e o u sai pelo lado do centro da quina: nenhuma face olha para o centro (as da aba plana olham para cima ou para baixo)
    for (const f of g.faces) {
      const { n, c } = normal(g, f);
      expect(n[0] * (c[0] - 0) + n[2] * (c[2] - 100)).toBeGreaterThanOrEqual(-1e-3);
    }
  });
});

describe('o dado ruim grita com o campo', () => {
  const diz = (def, trecho) => {
    const e = grito(() => gaiolaVarrida(def));
    expect(e).toBeInstanceOf(ErroGaiolaVarrida);
    expect(e.message).toMatch(trecho);
  };

  it('campos que faltam ou sobram', () => {
    const { fora, ...semFora } = regua();
    diz(semFora, /fora é obrigatório/);
    diz(regua({ cor: 'azul' }), /a definição tem campo desconhecido 'cor'/);
    diz(regua({ nome: '' }), /nome precisa ser texto/);
    const { secao, ...semSecao } = regua();
    diz(semSecao, /secao é obrigatória/);
  });

  it('trilho', () => {
    diz(regua({ trilho: [] }), /trilho precisa ser lista/);
    diz(regua({ trilho: [{ reta: { de: [0, 0, 0], ate: [0, 0, 0] } }] }), /trilho\[0\]\.reta tem a ponta igual ao começo/);
    diz(regua({ trilho: [{ reta: { de: [0, 0, 0], ate: [0, 0, 10] } }, { reta: { de: [5, 0, 10], ate: [5, 0, 20] } }] }), /trilho\[1\] começa em \[5,0,10\]/);
    diz(regua({ trilho: [{ arco: { centro: [0, 0, 0], eixo: [1, 0, 0], de: [0, 0, 5], graus: 0 } }] }), /trilho\[0\]\.arco\.graus/);
    diz(regua({ trilho: [{ arco: { centro: [0, 0, 0], eixo: [0, 0, 0], de: [0, 0, 5], graus: 90 } }] }), /trilho\[0\]\.arco\.eixo é o vetor nulo/);
    diz(regua({ trilho: [{ reta: { de: [0, 0, 0], ate: [0, 0, 'x'] } }] }), /trilho\[0\]\.reta\.ate precisa ser \[x, y, z\]/);
    diz(regua({ trilho: [{ reta: { de: [0, 0, 0], ate: [0, 0, 1] }, arco: {} }] }), /trilho\[0\] precisa ter reta ou arco, um só/);
  });

  it('quadro e seção', () => {
    diz(regua({ quadro: { u: [1, 0, 0], v: [0, 1, 0] } }), /quadro precisa ter u ou v, um só/);
    diz(regua({ quadro: { u: [0, 0, 1] } }), /quadro é paralelo ao trilho/);
    diz(regua({ secao: [[0, 0]] }), /secao precisa ser lista de pelo menos duas linhas/);
    diz(regua({ secao: [[0, 0], [0, 0]] }), /secao\[1\] repete o ponto de secao\[0\]/);
    diz(regua({ secao: [{ u: 0, v: 0, nome: 'a' }, { u: 0, v: 1, nome: 'a' }] }), /o nome de linha 'a' aparece mais de uma vez/);
    diz(regua({ secao: [[0, 0], [0, 'alto']] }), /secao\[1\]\.v precisa ser número finito/);
  });

  it('estações', () => {
    diz(regua({ estacoes: [{ fracao: 0 }] }), /estacoes precisa ser lista com pelo menos dois marcos/);
    diz(regua({ estacoes: [{ entre: 3 }, { fracao: 1 }] }), /estacoes\[0\] divide um trecho e precisa ficar entre dois marcos/);
    diz(regua({ estacoes: [{ fracao: 0 }, { entre: 0 }, { fracao: 1 }] }), /estacoes\[1\]\.entre precisa ser maior que 0/);
    diz(regua({ estacoes: [{ fracao: 0 }, { entre: 2 }, { passo: 3 }, { fracao: 1 }] }), /estacoes\[2\] vem logo depois de outra divisão/);
    diz(regua({ estacoes: [{ fracao: 0, em: 1 }, { fracao: 1 }] }), /estacoes\[0\] precisa ter um só corte/);
    diz(regua({ estacoes: [{ fracao: 2 }, { fracao: 1 }] }), /estacoes\[0\]\.fracao precisa estar entre 0 e 1/);
    diz(regua({ estacoes: [{ em: 5000 }, { fracao: 1 }] }), /estacoes\[0\] está em 5000 mm, fora do trilho/);
    diz(regua({ estacoes: [{ fracao: 0.6, nome: 'x' }, { fracao: 0.4, nome: 'y' }] }), /os cortes 'x' e 'y' caem no mesmo lugar ou fora de ordem/);
    diz(regua({ estacoes: [{ fracao: 0, nome: 'x' }, { fracao: 1, nome: 'x' }] }), /o nome de estação 'x' aparece mais de uma vez/);
    diz(regua({ estacoes: [{ plano: { eixo: 'w', valor: 1 } }, { fracao: 1 }] }), /estacoes\[0\]\.plano\.eixo precisa ser 'x', 'y' ou 'z'/);
    diz(regua({ estacoes: [{ fracao: 0, cruzando: 'subindo' }, { fracao: 1 }] }), /estacoes\[0\]\.cruzando só vale com plano ou cilindro/);
  });

  it('alargamento, recortes e vincos', () => {
    diz(saia({}, { perfil: [[0, 0], [0, 5]] }), /alargamento\.perfil\[1\] tem d = 0, que não passa do anterior/);
    diz(saia({}, { perfil: [[0, 0]] }), /alargamento\.perfil precisa ser lista de pelo menos dois pontos/);
    diz(saia({}, { rolada: { abaixoDe: -5, razao: 1.5 } }), /alargamento\.rolada\.abaixoDe = -5 fica abaixo de todas as linhas/);
    diz(saia({}, { rolada: { abaixoDe: 5, razao: 0 } }), /alargamento\.rolada\.razao precisa ser maior que 0/);
    diz(saia({}, { campo: { cilindro: { eixo: [1, 0, 0], por: [0, 0, 0] } } }), /alargamento\.campo\.cilindro\.raio precisa ser número finito/);
    diz(regua({ remover: [{ estacoes: ['inicio', 'fim'], linhas: ['baixo', 'nao'] }] }), /remover\[0\]\.linhas cita 'nao', que não é nome de linha declarado/);
    diz(regua({ remover: [{ estacoes: ['fim', 'inicio'], linhas: ['baixo', 'cima'] }] }), /remover\[0\]\.estacoes vai de 'fim' a 'inicio', que não está depois dele/);
    diz(regua({ remover: [{ estacoes: ['inicio', 'fim'], linhas: ['baixo', 'cima'] }] }), /os recortes tiram todas as faces/);
    diz(regua({ vincos: [{ linha: 'topo', nitidez: 1 }] }), /vincos\[0\]\.linha precisa ser o nome de uma linha da seção/);
    diz(regua({ vincos: [{ linha: 'baixo', nitidez: 2 }] }), /vincos\[0\]\.nitidez precisa ser de 0 a 1, ou 'viva'/);
    diz(regua({ fora: { centro: [0, 0, 0], semEixo: 'q' } }), /fora\.semEixo precisa ser/);
  });
});

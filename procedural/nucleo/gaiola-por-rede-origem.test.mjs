/* gaiola-por-rede-origem.test.mjs — a gaiola por rede de curvas publica de onde vem cada ponto, as entradas editáveis e a estrutura.
 *
 * Informação a mais e determinística, endereçada por nome, como a da gaiola por estações: o ponto-chave declarado (a coordenada escrita
 * numa curva ou num nó), o ponto amostrado dentro de um arco de curva (com a curva, a fração e os dois pontos-chave que o cercam), o nó
 * dado por { curva, fracao } e o ponto de dentro de um retalho. A prova é mexer em cada entrada editável e conferir que os pontos que se
 * movem são os que a origem diz depender dela; a gaiola, a malha e o passo que já existiam não mudam. A chapa é a de
 * `fixtures/gaiola-por-rede-prova.js` (19 curvas, 10 retalhos); a rede de nó em curva é a pequena do teste do ajudante. */
import { describe, expect, it } from 'vitest';
import { capturarGaiolas as capturarPorEstacoes } from './gaiola-por-estacoes.js';
import { capturarGaiolas, comDivisoesFixas, divisoesDasRedes } from './gaiola-captura.js';
import { gaiolaPorRede } from './gaiola-por-rede.js';
import { definicao } from './fixtures/gaiola-por-rede-prova.js';

const MM = 1000;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * MM;
const base = gaiolaPorRede(definicao());
const fixas = divisoesDasRedes([base]);

/* a chapa com o k-ésimo ponto-chave de uma curva movido `delta` mm no eixo; sem `fixar`, a rede refaz as divisões */
function movida(curva, k, eixo, delta, extra = {}, fixar = true) {
  const d = definicao({ extra });
  const c = d.curvas.find((x) => x.nome === curva);
  c.pontos[k] = [...c.pontos[k]]; c.pontos[k][eixo] += delta;
  return fixar ? comDivisoesFixas(divisoesDasRedes([gaiolaPorRede(definicao({ extra }))]), () => gaiolaPorRede(d)) : gaiolaPorRede(d);
}
/* a maior distância (mm) entre os pontos de duas gaiolas de mesmos nomes */
const maiorDistancia = (a, b) => Math.max(...a.passo.vertices.map((n) => dist(a.pontos[n], b.pontos[n])));
const dependem = (g, entrada) => new Set(g.passo.vertices.filter((n) => {
  const o = g.origens[n];
  return o.tipo === 'chave' ? o.entrada === entrada : o.pontosChave.includes(entrada);
}));

describe('as origens dos pontos da rede', () => {
  it('há uma origem para cada ponto da gaiola, na ordem dos pontos, e as quatro espécies aparecem', () => {
    expect(Object.keys(base.origens)).toEqual(base.passo.vertices);
    const tipos = new Map();
    for (const o of Object.values(base.origens)) tipos.set(o.tipo, (tipos.get(o.tipo) ?? 0) + 1);
    expect([...tipos.keys()].sort()).toEqual(['chave', 'curva', 'retalho']);
    expect(tipos.get('chave')).toBe(Object.keys(base.nos).length);
    expect(tipos.get('retalho')).toBeGreaterThan(300);
  });

  it('o nó dado por coordenada é ponto-chave de toda curva que o cita, com a entrada dele', () => {
    expect(base.origens.cL).toEqual({ tipo: 'chave', no: 'cL', entrada: 'no:cL', curvas: [{ curva: 'cintura', pontoChave: 2 }, { curva: 'ligA1', pontoChave: 0 }] });
  });

  it('o ponto de dentro de um arco traz a curva, a fração do comprimento e os dois pontos-chave que o cercam', () => {
    const o = base.origens['cintura.3'];
    expect(o).toMatchObject({ tipo: 'curva', curva: 'cintura', entre: ['no:FB', 'cintura[1]'] });
    expect(o.fracao).toBeGreaterThan(0);
    expect(o.fracao).toBeLessThan(0.1);
    expect(o.pontosChave).toEqual(['no:FB', 'cintura[1]', 'no:cL', 'cintura[3]', 'no:cR', 'cintura[5]', 'no:c7', 'cintura[7]', 'no:b1', 'no:b2', 'no:BR']);
  });

  it('o ponto de dentro de um retalho traz o retalho, as curvas da borda e as entradas delas', () => {
    expect(base.origens['topo.2.2']).toMatchObject({ tipo: 'retalho', retalho: 'topo', curvas: ['teto', 'ligU2', 'janela', 'ligU1'] });
    expect(base.origens['topo.2.2'].pontosChave).toContain('teto[3]');
    expect(base.origens['topo.2.2'].pontosChave).toContain('no:U1');
  });

  it('o nó dado por { curva, fracao } traz a curva e a fração, e não tem entrada própria', () => {
    const g = gaiolaPorRede({
      passo: 50, fora: [0, 1, 0],
      nos: { A: [0, 0, 0], B: [400, 0, 0], M: { curva: 'base', fracao: 0.5 }, Ax: [0, 0, -200], Bx: [400, 0, -200], Mx: [200, 0, -200], F: [400, 0, 200], D: [0, 0, 200] },
      curvas: [
        { nome: 'base', pontos: ['A', 'B'] }, { nome: 'div', pontos: ['M', 'Mx'] }, { nome: 'fundoE', pontos: ['Mx', 'Ax'] }, { nome: 'fundoD', pontos: ['Bx', 'Mx'] },
        { nome: 'ladoE', pontos: ['Ax', 'A'] }, { nome: 'ladoD', pontos: ['B', 'Bx'] }, { nome: 'dirSup', pontos: ['B', 'F'] }, { nome: 'topo', pontos: ['F', 'D'] }, { nome: 'esqSup', pontos: ['D', 'A'] },
      ],
      retalhos: [
        { nome: 'esq', borda: [{ curva: 'base', de: 'A', ate: 'M' }, 'div', 'fundoE', 'ladoE'] },
        { nome: 'dir', borda: [{ curva: 'base', de: 'M', ate: 'B' }, 'ladoD', 'fundoD', 'div'] },
        { nome: 'cima', borda: ['base', 'dirSup', 'topo', 'esqSup'] },
      ],
    });
    expect(g.origens.M).toEqual({ tipo: 'noNaCurva', no: 'M', curva: 'base', fracao: 0.5, pontosChave: ['no:A', 'no:B'] });
    expect(g.entradas.some((e) => e.no === 'M')).toBe(false);
    expect(g.entradas).toHaveLength(7 * 3);
  });

  it('com prefixo, as origens e as entradas citam os nomes dos pontos e os nomes das curvas', () => {
    const g = gaiolaPorRede(definicao({ extra: { prefixo: 'p_' } }));
    expect(Object.keys(g.origens)).toEqual(g.passo.vertices);
    expect(g.origens.p_cL).toMatchObject({ tipo: 'chave', no: 'cL', entrada: 'no:cL' });
    expect(g.origens['p_cintura.3']).toMatchObject({ tipo: 'curva', curva: 'cintura' });
  });
});

describe('as entradas editáveis da rede', () => {
  it('há uma por coordenada de ponto-chave escrito em coordenada e por coordenada de nó, em metro, com id único', () => {
    const d = definicao();
    const literais = d.curvas.reduce((s, c) => s + c.pontos.filter((p) => typeof p !== 'string').length, 0);
    const nos = Object.values(d.nos).filter(Array.isArray).length;
    expect(base.entradas).toHaveLength(3 * (literais + nos));
    expect(new Set(base.entradas.map((e) => e.id)).size).toBe(base.entradas.length);
    expect(base.entradas[0]).toMatchObject({ id: 'frenteBaixa[1].x', tipo: 'chave', curva: 'frenteBaixa', pontoChave: 1, eixo: 'x', valor: 0 });
    const cL = base.entradas.filter((e) => e.no === 'cL');
    expect(cL.map((e) => e.id)).toEqual(['no:cL.x', 'no:cL.y', 'no:cL.z']);
    expect(cL.map((e) => e.valor * MM)).toEqual(d.nos.cL);
    /* nenhuma entrada é de nó dado por { curva, fracao } nem de ponto-chave escrito como nome de nó */
    expect(base.entradas.some((e) => e.tipo === 'chave' && typeof d.curvas.find((c) => c.nome === e.curva).pontos[e.pontoChave] === 'string')).toBe(false);
  });

  it('sem liso, mexer numa entrada move exatamente os pontos que a origem diz depender dela', () => {
    const sem = gaiolaPorRede(definicao({ extra: { liso: false } }));
    for (const [curva, k, eixo] of [['cintura', 3, 1], ['teto', 2, 1], ['arco', 5, 1], ['ligA2', 1, 1], ['janela', 2, 0]]) {
      const g = movida(curva, k, eixo, 2, { liso: false });
      expect(g.passo.vertices).toEqual(sem.passo.vertices);
      const dep = dependem(sem, `${curva}[${k}]`);
      const moveu = sem.passo.vertices.filter((n) => dist(sem.pontos[n], g.pontos[n]) > 1e-9);
      expect(moveu.length, `${curva}[${k}]`).toBeGreaterThan(20);
      for (const n of moveu) expect(dep.has(n), `${n} depende de ${curva}[${k}]`).toBe(true);
    }
  });

  it('com o alisamento do miolo, quem não depende da entrada anda menos de um quinto do que ela andou', () => {
    for (const [curva, k, eixo] of [['cintura', 3, 1], ['teto', 2, 1], ['ligA2', 1, 1]]) {
      const g = movida(curva, k, eixo, 2);
      const dep = dependem(base, `${curva}[${k}]`);
      let fora = 0; let dentro = 0;
      for (const n of base.passo.vertices) {
        const m = dist(base.pontos[n], g.pontos[n]);
        if (dep.has(n)) dentro = Math.max(dentro, m); else fora = Math.max(fora, m);
      }
      expect(dentro, `${curva}[${k}]`).toBeGreaterThan(1.5);
      expect(fora, `${curva}[${k}]`).toBeLessThan(0.4);
    }
  });

  it('mexer num nó dado por coordenada move as curvas que passam por ele', () => {
    const d = definicao({ extra: { liso: false } });
    d.nos.cL = [...d.nos.cL]; d.nos.cL[1] += 2;
    const g = comDivisoesFixas(divisoesDasRedes([gaiolaPorRede(definicao({ extra: { liso: false } }))]), () => gaiolaPorRede(d));
    const sem = gaiolaPorRede(definicao({ extra: { liso: false } }));
    const dep = dependem(sem, 'no:cL');
    const moveu = sem.passo.vertices.filter((n) => dist(sem.pontos[n], g.pontos[n]) > 1e-9);
    expect(moveu.length).toBeGreaterThan(20);
    for (const n of moveu) expect(dep.has(n)).toBe(true);
    expect(dist(sem.pontos.cL, g.pontos.cL)).toBeCloseTo(2, 6);
  });
});

describe('a estrutura e a fixação das divisões', () => {
  it('a estrutura não muda com o valor de uma entrada, e muda com o nome, o vinco ou a curva de um nó', () => {
    expect(JSON.stringify(movida('cintura', 3, 1, 1.5).estrutura)).toBe(JSON.stringify(base.estrutura));
    const vinco = definicao(); delete vinco.curvas.find((c) => c.nome === 'cintura').vinco;
    expect(JSON.stringify(gaiolaPorRede(vinco).estrutura)).not.toBe(JSON.stringify(base.estrutura));
    const renomeada = definicao(); renomeada.curvas.find((c) => c.nome === 'teto').nome = 'teto2';
    for (const r of renomeada.retalhos) r.borda = r.borda.map((l) => (l === 'teto' ? 'teto2' : (l.curva === 'teto' ? { ...l, curva: 'teto2' } : l)));
    expect(JSON.stringify(gaiolaPorRede(renomeada).estrutura)).not.toBe(JSON.stringify(base.estrutura));
    expect(JSON.stringify(gaiolaPorRede(definicao({ passo: 60 })).estrutura)).not.toBe(JSON.stringify(base.estrutura));
  });

  it('mexer num ponto-chave por alguns milímetros pode dar outra divisão a um arco; fixada, a malha é a mesma', () => {
    /* o ponto-chave 2 da janela, 6 mm para trás: o comprimento de dois arcos passa do ponto em que a divisão inteira muda */
    const livre = movida('janela', 2, 0, -6, {}, false);
    expect(JSON.stringify(livre.estrutura.divisoes)).not.toBe(JSON.stringify(base.estrutura.divisoes));
    const fixada = movida('janela', 2, 0, -6);
    expect(fixada.passo.vertices).toEqual(base.passo.vertices);
    expect(fixada.passo.faces).toEqual(base.passo.faces);
    expect(JSON.stringify(fixada.estrutura)).toBe(JSON.stringify(base.estrutura));
    expect(fixada.fixacao.divisoes).toEqual(base.fixacao.divisoes);
  });

  it('com as divisões e as posições fixadas de uma gaiola, a mesma definição sai igual a menos de um nanômetro, e fora da fixação nada muda', () => {
    const outra = comDivisoesFixas(fixas, () => gaiolaPorRede(definicao()));
    expect(maiorDistancia(outra, base)).toBeLessThan(1e-6);
    expect(JSON.stringify(outra.passo.faces)).toBe(JSON.stringify(base.passo.faces));
    expect(JSON.stringify(outra.passo.vertices)).toBe(JSON.stringify(base.passo.vertices));
    expect(JSON.stringify(gaiolaPorRede(definicao()).pontos)).toBe(JSON.stringify(base.pontos));
    /* a fixação de outra rede não se aplica a esta */
    const alheia = comDivisoesFixas(divisoesDasRedes([gaiolaPorRede(definicao({ passo: 60 }))]), () => gaiolaPorRede(definicao()));
    expect(JSON.stringify(alheia.pontos)).toBe(JSON.stringify(base.pontos));
    expect(JSON.stringify(gaiolaPorRede(definicao()).pontos)).toBe(JSON.stringify(base.pontos));
  });

  it('os pontos fixados seguem a curva: o ponto-chave movido não faz os pontos do arco deslizarem pelo espaçamento', () => {
    /* a posição de cada ponto dentro do arco é a mesma, de modo que o ponto anda com a curva e não ao longo dela */
    const g = movida('arco', 5, 1, 3);
    const a = base.fixacao.fracoes; const b = g.fixacao.fracoes;
    expect(Object.keys(b)).toEqual(Object.keys(a));
    for (const n of Object.keys(a)) expect(Math.abs(a[n] - b[n]), n).toBeLessThan(1e-9);
    /* sem fixar, o espaçamento por curvatura desliza os pontos do arco quando o ponto-chave anda */
    const livre = movida('arco', 5, 1, 3, {}, false);
    expect(Math.max(...Object.keys(a).map((n) => Math.abs(a[n] - livre.fixacao.fracoes[n])))).toBeGreaterThan(1e-2);
  });

  it('mexer na entrada e na malha não muda o formato do passo: vértices, faces, vincos, cantos e medidas', () => {
    const g = movida('teto', 2, 1, 1);
    expect(Object.keys(g.passo)).toEqual(Object.keys(base.passo));
    expect(g.passo.faces).toEqual(base.passo.faces);
    expect(g.passo.vincos.map((v) => v.nome)).toEqual(base.passo.vincos.map((v) => v.nome));
    expect(g.passo.medidas).toEqual(base.passo.medidas);
  });
});

describe('a captura das gaiolas por rede', () => {
  it('capturarGaiolas devolve as redes montadas por uma função, e não vaza para fora dela', () => {
    const { resultado, gaiolas } = capturarGaiolas(() => gaiolaPorRede(definicao()));
    expect(gaiolas).toHaveLength(1);
    expect(gaiolas[0]).toBe(resultado);
    expect(Object.keys(gaiolas[0].origens)).toEqual(gaiolas[0].passo.vertices);
    const depois = capturarGaiolas(() => 1);
    expect(depois.gaiolas).toEqual([]);
    gaiolaPorRede(definicao());
    expect(capturarGaiolas(() => 1).gaiolas).toEqual([]);
  });

  it('a captura que as gaiolas por estações usam é a mesma', () => {
    expect(capturarPorEstacoes).toBe(capturarGaiolas);
  });

  it('as capturas aninhadas guardam cada uma as suas', () => {
    const { gaiolas } = capturarGaiolas(() => {
      gaiolaPorRede(definicao());
      const interna = capturarGaiolas(() => gaiolaPorRede(definicao({ passo: 60 })));
      expect(interna.gaiolas).toHaveLength(1);
      return 1;
    });
    expect(gaiolas).toHaveLength(1);
  });
});

describe('as curvas e os retalhos publicados para quem lê a rede', () => {
  it('cada arco usado traz os pontos, e cada lado de retalho traz os pontos e a fração do comprimento em cada um', () => {
    const arco = base.curvas.cintura.arcos[0];
    expect(arco.pontos[0]).toBe('FB');
    expect(arco.pontos.at(-1)).toBe('cL');
    expect(arco.pontos).toHaveLength(arco.divisoes + 1);
    expect(base.curvas.cintura.nosPontos).toEqual(base.curvas.cintura.nos);
    const lado = base.retalhos.topo.bordas[0];
    expect(lado).toMatchObject({ curva: 'teto', de: 'D', ate: 'tP1' });
    expect(lado.pontos[0]).toBe('D');
    expect(lado.pontos.at(-1)).toBe('tP1');
    expect(lado.fracoes).toHaveLength(lado.pontos.length);
    expect(lado.fracoes[0]).toBe(0);
    for (let k = 1; k < lado.fracoes.length; k++) expect(lado.fracoes[k]).toBeGreaterThan(lado.fracoes[k - 1]);
    /* a face inicial de cada retalho soma as faces dos anteriores */
    let soma = 0;
    for (const r of Object.values(base.retalhos)) { expect(r.faceInicial).toBe(soma); soma += r.faces; }
    expect(soma).toBe(base.passo.faces.length);
  });
});

/* A instância de componente com `rotacao` (atrito 43 do avião): o trem principal recolhe girando em torno de z, a instância da
   `roda` não girava, e foi preciso escrever o módulo `rodaGira` (pneu de revolução e dois cubos com `rotacao: [0, 0, "=ang"]`, o
   centro dos cubos calculado com seno e cosseno de `ang`) que repetia o desenho do componente. Cada medida é de número: a roda
   girada pela instância tem o centro e a caixa de cada parte iguais aos do módulo à mão, em cada ângulo. */
import { describe, expect, it } from 'vitest';
import { expandirEsboco } from '../src/expandir.js';
import { desenharEsboco, ErroDeEsboco, resolverOpcao } from '../src/index.js';
import { medirEsboco } from '../src/descrever.js';
import { angulosDaMatriz, angulosDaRotacao } from '../src/giro.js';

/* o módulo à mão do avião: a mesma roda do componente, com o eixo girado em z por `ang` e os cubos pelo seno e cosseno */
const RODA_GIRA = {
  principal: 'pneu',
  parametros: { diametro: 480, aro: 270, largura: 190, ombro: 35, diametroCubo: 90, salienciaCubo: 22, ang: 0 },
  entradas: { centro: null },
  formas: [
    { id: 'pneu', tipo: 'revolucao', eixo: 'x', rotacao: [0, 0, '=ang'], perfil: { gerar: 'pneu', raio: '=diametro/2', raioAro: '=aro/2', largura: 'largura', ombro: 'ombro' }, centro: '@centro', cor: 'preto' },
    { id: 'cuboE', tipo: 'cilindro', diametro: 'diametroCubo', comprimento: 'salienciaCubo', eixo: 'x', rotacao: [0, 0, '=ang'], centro: { ancora: 'pneu.centro', mm: ['=-(largura+salienciaCubo)/2*cos(ang)', '=-(largura+salienciaCubo)/2*sin(ang)', 0] }, cor: 'cinza' },
    { id: 'cuboD', tipo: 'cilindro', diametro: 'diametroCubo', comprimento: 'salienciaCubo', eixo: 'x', rotacao: [0, 0, '=ang'], centro: { ancora: 'pneu.centro', mm: ['=(largura+salienciaCubo)/2*cos(ang)', '=(largura+salienciaCubo)/2*sin(ang)', 0] }, cor: 'cinza' },
  ],
};
const PARAMETROS = { diametro: 480, aro: 270, largura: 190, ombro: 35, diametroCubo: 90, salienciaCubo: 22 };
const esboco = (formas, modulos) => ({ ...(modulos ? { modulos } : {}), opcoes: [{ titulo: 'T', formas }] });
const partes = ['pneu', 'cuboE', 'cuboD'];
const achar = (rs, id) => rs.find((r) => r.id === id);
const perto = (a, b, tol = 1e-6) => a.every((v, i) => Math.abs(v - b[i]) <= tol);

describe('a instância com `rotacao` gira o componente como o módulo à mão', () => {
  for (const ang of [0, 30, 83, 90, -45]) {
    it(`a ${ang} graus em z: o centro e a caixa de pneu, cuboE e cuboD coincidem com os de rodaGira`, () => {
      const a = expandirEsboco(esboco([{ id: 'r', usa: 'rodaGira', parametros: { ...PARAMETROS, ang }, centro: [100, 200, 300] }], { rodaGira: RODA_GIRA }));
      const b = expandirEsboco(esboco([{ id: 'r', usa: 'roda', parametros: PARAMETROS, centro: [100, 200, 300], rotacao: [0, 0, ang] }]));
      const ra = resolverOpcao(a.opcoes[0]);
      const rb = resolverOpcao(b.opcoes[0]);
      for (const p of partes) {
        const x = achar(ra, `r.${p}`);
        const y = achar(rb, `r.${p}`);
        expect(perto(x.centro, y.centro), `${p}: centro ${x.centro} contra ${y.centro}`).toBe(true);
        expect(perto(x.min, y.min, 1e-4) && perto(x.max, y.max, 1e-4), `${p}: caixa`).toBe(true);
      }
    });
  }

  it('o pivô é o centro da forma principal: com o pneu deslocado a rotação não o move', () => {
    const e = expandirEsboco(esboco([{ id: 'r', usa: 'roda', parametros: PARAMETROS, centro: [100, 200, 300], rotacao: [0, 0, 83] }]));
    expect(e.opcoes[0].giros).toEqual([{ formas: ['r.pneu', 'r.cuboE', 'r.cuboD'], pivo: { forma: 'r.pneu' }, rotacao: [0, 0, 83] }]);
    const rs = resolverOpcao(e.opcoes[0]);
    expect(achar(rs, 'r.pneu').centro).toEqual([100, 200, 300]);
    /* os cubos ficam a meia largura mais a saliência do pneu, no eixo girado: a distância ao centro não muda com o ângulo */
    const sem = resolverOpcao(expandirEsboco(esboco([{ id: 'r', usa: 'roda', parametros: PARAMETROS, centro: [100, 200, 300] }])).opcoes[0]);
    for (const p of ['cuboE', 'cuboD']) {
      const d = (rs2) => Math.hypot(...achar(rs2, `r.${p}`).centro.map((c, i) => c - [100, 200, 300][i]));
      expect(d(rs)).toBeCloseTo(d(sem), 6);
    }
  });

  it('uma forma de fora que cita a âncora de um cubo girado vê a pose girada', () => {
    const formas = (extra) => [{ id: 'r', usa: 'roda', parametros: PARAMETROS, centro: [0, 0, 0], rotacao: [0, 0, 90] }, ...extra];
    /* uma forma de fora que se prende ao centro do cubo girado pela âncora vê a pose girada: o cubo D, girado 90 graus em z, está acima do pneu (+y) */
    const fora = resolverOpcao(expandirEsboco(esboco(formas([{ id: 'pino', tipo: 'esfera', diametro: 10, centro: 'r.cuboD.centro' }]))).opcoes[0]);
    expect(perto(achar(fora, 'pino').centro, achar(fora, 'r.cuboD').centro)).toBe(true);
    expect(achar(fora, 'r.cuboD').centro[1]).toBeGreaterThan(100);
    expect(Math.abs(achar(fora, 'r.cuboD').centro[0])).toBeLessThan(1e-6);
  });

  it('o componente que declara a entrada `rotacao` a recebe como entrada, como antes', () => {
    const modulo = { parametros: {}, entradas: { centro: null, rotacao: null }, formas: [{ id: 'barra', tipo: 'cilindro', diametro: 10, comprimento: 100, eixo: 'x', centro: '@centro', rotacao: '@rotacao' }] };
    const e = expandirEsboco(esboco([{ id: 'm', usa: 'barra', centro: [0, 0, 0], rotacao: [0, 0, 90] }], { barra: modulo }));
    expect(e.opcoes[0].giros).toBeUndefined();
    expect(e.opcoes[0].formas[0].rotacao).toEqual([0, 0, 90]);
  });

  it('a rotação aceita parâmetro e expressão, como a das formas, e o zero não gera giro', () => {
    const e = expandirEsboco({ parametros: { recolhe: 40 }, ...esboco([{ id: 'r', usa: 'roda', parametros: PARAMETROS, centro: [0, 0, 0], rotacao: [0, 0, '=recolhe*2'] }]) });
    expect(e.opcoes[0].giros[0].rotacao).toEqual([0, 0, 80]);
    const zero = expandirEsboco({ parametros: { recolhe: 0 }, ...esboco([{ id: 'r', usa: 'roda', parametros: PARAMETROS, centro: [0, 0, 0], rotacao: [0, 0, 'recolhe'] }]) });
    expect(zero.opcoes[0].giros).toBeUndefined();
    expect(angulosDaRotacao(30)).toEqual([0, 30, 0]);
    expect(angulosDaRotacao({ eixo: 'x', angulo: 12 })).toEqual([12, 0, 0]);
    expect(angulosDaRotacao({ x: 1, z: 3 })).toEqual([1, 0, 3]);
  });

  it('as formas do grupo giram juntas no desenho e no gate: o contato do componente continua valendo girado', () => {
    const e = {
      contato: { usar: true, tolerancia: 1, penetracao: 1 },
      ...esboco([{ id: 'r', usa: 'roda', parametros: PARAMETROS, centro: [0, 0, 0], rotacao: [0, 0, 83] }]),
    };
    const { divergencias } = medirEsboco(e, { projecao: false });
    expect(divergencias.filter((d) => d.classe === 'solto' || d.classe === 'atravessa')).toEqual([]);
    expect(() => desenharEsboco(expandirEsboco(e))).not.toThrow();
  });

  it('o espelho de uma instância girada espelha a pose girada', () => {
    const e = expandirEsboco(esboco([
      { id: 'rE', usa: 'roda', parametros: PARAMETROS, centro: [-500, 0, 0], rotacao: [0, 0, 83] },
      { id: 'rD', espelha: { forma: 'rE', eixo: 'x' } },
    ]));
    const rs = resolverOpcao(e.opcoes[0]);
    const E = achar(rs, 'rE.cuboD').centro;
    const D = achar(rs, 'rD.cuboD').centro;
    expect(perto([-E[0], E[1], E[2]], D)).toBe(true);
  });

  it('a mesma forma em dois giros é recusada, com o número do giro', () => {
    const e = expandirEsboco(esboco([{ id: 'r', usa: 'roda', parametros: PARAMETROS, centro: [0, 0, 0], rotacao: [0, 0, 30] }]));
    e.opcoes[0].giros.push({ formas: ['r.pneu'], pivo: { forma: 'r.pneu' }, rotacao: [0, 0, 10] });
    expect(() => resolverOpcao(e.opcoes[0])).toThrow(ErroDeEsboco);
    expect(() => resolverOpcao(e.opcoes[0])).toThrow(/a forma "r.pneu" já gira no giro 1/);
  });
});

describe('os ângulos de uma matriz de rotação voltam ao campo `rotacao`', () => {
  it('ida e volta em varias rotações, inclusive com os eixos compostos e no limite do ângulo em y', () => {
    const ca = (rx, ry, rz) => {
      const [x, y, z] = [rx, ry, rz].map((g) => (g * Math.PI) / 180);
      return [
        [Math.cos(z) * Math.cos(y), Math.cos(z) * Math.sin(y) * Math.sin(x) - Math.sin(z) * Math.cos(x), Math.cos(z) * Math.sin(y) * Math.cos(x) + Math.sin(z) * Math.sin(x)],
        [Math.sin(z) * Math.cos(y), Math.sin(z) * Math.sin(y) * Math.sin(x) + Math.cos(z) * Math.cos(x), Math.sin(z) * Math.sin(y) * Math.cos(x) - Math.cos(z) * Math.sin(x)],
        [-Math.sin(y), Math.cos(y) * Math.sin(x), Math.cos(y) * Math.cos(x)],
      ];
    };
    for (const r of [[0, 0, 83], [20, 30, 40], [-35, 10, 170], [0, 90, 0], [15, -90, 0]]) {
      const volta = angulosDaMatriz(ca(...r));
      const M0 = ca(...r);
      const M1 = ca(...volta);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) expect(M1[i][j]).toBeCloseTo(M0[i][j], 6);
    }
  });
});

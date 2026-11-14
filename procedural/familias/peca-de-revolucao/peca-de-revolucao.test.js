/* peca-de-revolucao.test.js — a família `peca-de-revolucao` medida na malha e no perfil: o sentido do deslocamento da parede, o perfil de
   cada objeto contra a conta à mão, a malha dos oito perfis (parte com o nome da forma, faces, caixa e volume contra a fórmula), a
   quantidade de pontos contra as composições, as recusas por restrição e a aprovação mecânica, que roda uma vez no fim. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { aprovarFamilia, pontosDaFamilia } from '../../../tools/modelar/aprovacao-da-familia.mjs';
import { ErroChamadaDeFamilia, chamar, criarRegistroDeFamilias } from '../index.js';
import { PECA_DE_REVOLUCAO } from './index.js';
import { MAXIMO_DE_PONTOS, MINIMO_DE_PONTOS } from './composicoes.js';
import { FORMAS, casca, deslocarPerfil, perfilDaForma } from './perfis.js';

const registro = criarRegistroDeFamilias({ familias: [PECA_DE_REVOLUCAO] });
const MM = 0.001;
const P = PECA_DE_REVOLUCAO.contrato.parametros;
const PERFIS = PECA_DE_REVOLUCAO.contrato.perfis;
const NOMES_DOS_PERFIS = ['abajur-base', 'abajur-cupula', 'abajur-haste', 'abajur-soquete', 'copo', 'garrafa', 'prato', 'vaso'];
const completo = (parametros = {}) => ({
  ...Object.fromEntries(Object.entries(P).map(([chave, def]) => [chave, def.padrao])),
  ...(parametros.perfil ? PERFIS[parametros.perfil].parametros : {}),
  ...Object.fromEntries(Object.entries(parametros).filter(([chave]) => chave !== 'perfil')),
});
const rodar = (parametros = {}) => executarReceita({
  get CHAMADAS_COMPOSICOES() { return [chamar(PECA_DE_REVOLUCAO, 'x', parametros)]; },
  PARAMS: {}, TOPO: {}, ALIASES: [], MATERIAIS: {},
}, registro);

function partesDoNeutro(neutro) {
  const partes = new Map();
  for (const face of neutro.F.values()) {
    const p = partes.get(face.parte) ?? { faces: 0, vertices: new Set(), volume: 0 };
    p.faces += 1;
    face.vs.forEach((v) => p.vertices.add(v));
    const a = neutro.V.get(face.vs[0]);
    for (let k = 1; k < face.vs.length - 1; k++) {
      const b = neutro.V.get(face.vs[k]);
      const c = neutro.V.get(face.vs[k + 1]);
      p.volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    }
    partes.set(face.parte, p);
  }
  for (const p of partes.values()) {
    const pts = [...p.vertices].map((v) => neutro.V.get(v).map((c) => c / MM));
    p.min = [0, 1, 2].map((i) => Math.min(...pts.map((q) => q[i])));
    p.max = [0, 1, 2].map((i) => Math.max(...pts.map((q) => q[i])));
    p.volume /= MM ** 3;
  }
  return partes;
}

/* o volume da revolução em n facetas de uma seção fechada [r, y]: n sen(2pi/n) vezes o primeiro momento da seção em relação ao eixo */
function volumeDaRevolucao(perfil, n) {
  let area = 0;
  let momento = 0;
  for (let i = 0; i < perfil.length; i++) {
    const [r0, y0] = perfil[i];
    const [r1, y1] = perfil[(i + 1) % perfil.length];
    const cruz = r0 * y1 - r1 * y0;
    area += cruz / 2;
    momento += ((r0 + r1) * cruz) / 6;
  }
  return Math.abs(n * Math.sin((2 * Math.PI) / n) * momento);
}

describe('o deslocamento da parede', () => {
  it('d positivo leva para a esquerda de quem anda e d negativo para a direita', () => {
    const sobe = [[10, 0, 0], [10, 50, 0]];
    expect(deslocarPerfil(sobe, 3).map(([r]) => r)).toEqual([7, 7]);
    expect(deslocarPerfil(sobe, -3).map(([r]) => r)).toEqual([13, 13]);
    const vai = [[0, 5, 0], [40, 5, 0]];
    expect(deslocarPerfil(vai, 2).map(([, y]) => y)).toEqual([7, 7]);
  });

  it('a concordância encolhe numa curva para o lado do deslocamento e cresce na curva para o outro', () => {
    /* sobe e vira à esquerda (para o eixo): o lado esquerdo é o de dentro da curva */
    const paraEsquerda = [[20, 0, 0], [20, 30, 5], [0, 30, 0]];
    expect(deslocarPerfil(paraEsquerda, 2)[1][2]).toBeCloseTo(3, 9);
    expect(deslocarPerfil(paraEsquerda, -2)[1][2]).toBeCloseTo(7, 9);
    expect(deslocarPerfil(paraEsquerda, 6)[1][2]).toBe(0);
  });

  it('a casca do copo fica do lado do eixo, a parede mede a pedida e o fundo de dentro está na altura do fundo', () => {
    const p = completo({ perfil: 'copo' });
    const { externo, interno } = casca([[0, 0, 0], [35, 0, 2], [40, 90, 1.4]], { parede: 3, raioBoca: 1.4, fundo: 12, raioFundoInterno: 6 });
    expect(interno.at(-1)).toEqual([0, 12, 0]);
    expect(interno[0][1]).toBe(90);
    for (const [r, y] of interno.slice(0, -1)) {
      const raioDeFora = 35 + ((40 - 35) * y) / 90;
      expect(r).toBeLessThan(raioDeFora);
      expect(raioDeFora - r).toBeCloseTo(3, 1); /* a parede reta, medida na horizontal, difere da normal de 3 mm por menos de 5 micra */
    }
    expect(externo.at(-1)[2]).toBe(1.4);
    expect(perfilDaForma(p).perfil.length).toBe(6);
  });

  it('recusa parede que não é positiva', () => {
    expect(() => casca([[0, 0, 0], [10, 0, 0], [10, 20, 0]], { parede: 0 })).toThrow(/parede/);
  });
});

describe('o perfil de cada objeto', () => {
  it('o copo tem os seis pontos do alvo, com a parede de dentro 3 mm (na horizontal, 3,0046 pela normal) para o eixo e o fundo em y 12', () => {
    const { perfil } = perfilDaForma(completo({ perfil: 'copo' }));
    expect(perfil.map(([r, y]) => [+r.toFixed(2), +y.toFixed(2)])).toEqual([[0, 0], [35, 0], [40, 90], [37, 90], [32.66, 12], [0, 12]]);
  });

  it('a garrafa fecha no eixo nas duas pontas, com o colar só por fora e o furo da boca de 40 mm', () => {
    const { perfil } = perfilDaForma(completo({ perfil: 'garrafa' }));
    expect(perfil[0][0]).toBe(0);
    expect(perfil.at(-1)[0]).toBe(0);
    const alturaDaBoca = Math.max(...perfil.map(([, y]) => y));
    expect(alturaDaBoca).toBe(160);
    const naBoca = perfil.filter(([, y]) => y === 160).map(([r]) => r);
    expect(Math.max(...naBoca)).toBeCloseTo(22.5, 9);
    expect(Math.min(...naBoca)).toBeCloseTo(20, 9);
    expect(Math.max(...perfil.map(([r]) => r))).toBe(37.5);
    expect(perfil.some(([r, y]) => r === 26.5 && y === 128)).toBe(true);
  });

  it('o vaso é oco até a boca: a parede de dentro fica 6 mm para o eixo e o piso fica acima do teto do rebaixo', () => {
    const { perfil } = perfilDaForma(completo({ perfil: 'vaso' }));
    expect(perfil[0]).toEqual([0, 26, 0]);
    expect(Math.max(...perfil.map(([r]) => r))).toBeCloseTo(95, 9);
    const boca = perfil.filter(([, y]) => y === 200).map(([r]) => r);
    expect(boca.sort((a, b) => a - b)).toEqual([31.5, 37.5]);
    expect(perfil.at(-1)[1]).toBeGreaterThan(26);
  });

  it('o prato tem a face de baixo 5 mm abaixo da de cima, o anel por baixo e nada abaixo de y 0', () => {
    const { perfil } = perfilDaForma(completo({ perfil: 'prato' }));
    expect(Math.min(...perfil.map(([, y]) => y))).toBeCloseTo(0, 9);
    expect(Math.max(...perfil.map(([, y]) => y))).toBeCloseTo(45, 1); /* o ponto mais alto da borda inclinada fica 24 micra abaixo da altura total */
    expect(Math.max(...perfil.map(([r]) => r))).toBeCloseTo(115, 1);
    expect(perfil.some(([r, y]) => r === 0 && y === 10)).toBe(true);
    expect(perfil.some(([r, y]) => r === 0 && y === 5)).toBe(true);
  });

  it('a cúpula é uma casca aberta, mais larga embaixo, com as bordas planas e a parede de 2 mm', () => {
    const { perfil, anel } = perfilDaForma(completo({ perfil: 'abajur-cupula' }));
    expect(anel).toBe(true);
    expect(perfil.every(([r]) => r > 100)).toBe(true);
    expect(perfil.map(([, y]) => y)).toEqual([255, 445, 445, 255]);
    expect(perfil[0][0] - perfil[3][0]).toBeCloseTo(2, 1);
    expect(perfil[1][0] - perfil[2][0]).toBeCloseTo(2, 1);
  });

  it('a base, a haste e o soquete são os perfis do abajur', () => {
    expect(perfilDaForma(completo({ perfil: 'abajur-base' })).perfil).toHaveLength(10);
    expect(perfilDaForma(completo({ perfil: 'abajur-haste' })).perfil).toEqual([[0, 30, 0], [6, 30, 0], [6, 330, 0], [0, 330, 0]]);
    expect(perfilDaForma(completo({ perfil: 'abajur-soquete' })).perfil).toEqual([[0, 330, 0], [15, 330, 0], [15, 380, 0], [0, 380, 0]]);
  });
});

describe('a malha dos perfis', () => {
  for (const nome of NOMES_DOS_PERFIS) {
    it(`o perfil '${nome}' gera uma parte com o nome da forma, o volume da revolução do perfil e nada abaixo de y 0 (exceto a cúpula acima do chão)`, () => {
      const v = completo({ perfil: nome });
      const { neutro } = rodar({ perfil: nome });
      const partes = partesDoNeutro(neutro);
      expect([...partes.keys()]).toEqual([FORMAS[v.forma]]);
      const parte = partes.get(FORMAS[v.forma]);
      const { perfil } = perfilDaForma(v);
      expect(parte.min[1]).toBeGreaterThanOrEqual(-1e-6);
      /* a fórmula é a da seção em polígono, sem as concordâncias dos cantos, que mudam o volume em até 2% */
      const esperado = volumeDaRevolucao(perfil, v.lados);
      expect(Math.abs(Math.abs(parte.volume) - esperado) / esperado).toBeLessThan(0.02);
      /* a caixa em x e z é a do maior raio, em lados facetas */
      const raioMaximo = Math.max(...perfil.map(([r]) => r));
      expect(parte.max[1] - parte.min[1]).toBeCloseTo(Math.max(...perfil.map(([, y]) => y)) - Math.min(...perfil.map(([, y]) => y)), 5);
      expect(parte.max[0]).toBeLessThanOrEqual(raioMaximo + 1e-6);
      expect(parte.max[0]).toBeGreaterThan(raioMaximo * 0.99);
    });
  }

  it('o número de faces de cada perfil é o das receitas aprovadas', () => {
    const faces = Object.fromEntries(NOMES_DOS_PERFIS.map((nome) => [nome, rodar({ perfil: nome }).neutro.F.size]));
    expect(faces).toEqual({
      'abajur-base': 432, 'abajur-cupula': 192, 'abajur-haste': 144, 'abajur-soquete': 144, copo: 2368, garrafa: 2928, prato: 3600, vaso: 2352,
    });
  });

  it('a mesma chamada dá a mesma chamada de composição, e o `origem` escolhe a identidade do lathe', () => {
    expect(JSON.stringify(chamar(PECA_DE_REVOLUCAO, 'a', { perfil: 'copo' }))).toBe(JSON.stringify(chamar(PECA_DE_REVOLUCAO, 'a', { perfil: 'copo' })));
    const chamada = chamar(PECA_DE_REVOLUCAO, 'a', { perfil: 'copo', origem: 7 });
    expect(chamada.argumentos.origem).toBe(7);
  });

  it('o perfil mais longo cabe nas composições, nos extremos dos passos dos arcos', () => {
    const tamanhos = [];
    for (const [forma, nome, passos] of [[3, 'prato', 'pratoPassosArco'], [2, 'vaso', 'vasoPassosBarriga']]) {
      for (const valor of [P[passos].minimo, P[passos].maximo]) {
        const n = perfilDaForma(completo({ perfil: nome, forma, [passos]: valor })).perfil.length;
        tamanhos.push(n);
        const chamada = chamar(PECA_DE_REVOLUCAO, 'x', { perfil: nome, [passos]: valor });
        expect(chamada.composicao).toBe(`revolucao.pontos-${n}`);
      }
    }
    expect(Math.min(...tamanhos)).toBeGreaterThanOrEqual(MINIMO_DE_PONTOS);
    expect(Math.max(...tamanhos)).toBeLessThanOrEqual(MAXIMO_DE_PONTOS);
  });
});

describe('as restrições', () => {
  const recusa = (parametros) => { try { chamar(PECA_DE_REVOLUCAO, 'x', parametros); } catch (erro) { return erro; } return null; };

  it('recusa o copo com a boca menor que a base, o fundo mais fino que a parede e a borda que não cabe na parede', () => {
    for (const [parametros, id] of [
      [{ perfil: 'copo', copoDiametroBoca: 60, copoDiametroBase: 90 }, 'copo-boca-nao-menor-que-a-base'],
      [{ perfil: 'copo', parede: 6, copoFundo: 4 }, 'copo-fundo-nao-menor-que-a-parede'],
      [{ perfil: 'copo', parede: 1 }, 'copo-borda-cabe-na-parede'],
    ]) {
      const erro = recusa(parametros);
      expect(erro).toBeInstanceOf(ErroChamadaDeFamilia);
      expect(erro.restricao).toBe(id);
    }
  });

  it('recusa o prato cujo anel passaria do chão, a garrafa com colar abaixo do ombro e a cúpula mais larga em cima', () => {
    expect(recusa({ perfil: 'prato', pratoAltura: 30 }).restricao).toBe('prato-poco-cabe-na-altura');
    expect(recusa({ perfil: 'garrafa', garrafaColarY: 110 }).restricao).toBe('garrafa-colar-acima-do-ombro');
    expect(recusa({ perfil: 'abajur-cupula', cupulaRaioCima: 150, cupulaRaioBaixo: 140 }).restricao).toBe('cupula-mais-larga-embaixo');
  });

  it('a restrição de uma forma não recusa os parâmetros das outras: o vaso aceita o copo com valores absurdos', () => {
    expect(recusa({ perfil: 'vaso', copoDiametroBoca: 50, copoDiametroBase: 110 })).toBeNull();
  });
});

describe('a aprovação mecânica', () => {
  it('passa nos três pontos, nos oito perfis, na varredura e na escala dos perfis', () => {
    const resultado = aprovarFamilia(PECA_DE_REVOLUCAO, { gravar: false });
    expect(resultado.problemas).toEqual([]);
    expect(resultado.aprovada).toBe(true);
    expect(Object.keys(resultado.perfis).sort()).toEqual(NOMES_DOS_PERFIS);
    expect(Object.values(resultado.pontos).map(({ estado }) => estado)).toEqual(['ok', 'ok', 'ok']);
    expect(Object.keys(pontosDaFamilia(PECA_DE_REVOLUCAO.contrato))).toEqual(['minimo', 'medio', 'maximo']);
    /* o mínimo é o copo, o médio é o vaso e o máximo é a cúpula */
    expect(resultado.pontos.minimo.parametros.forma).toBe(0);
    expect(resultado.pontos.medio.parametros.forma).toBe(2);
    expect(resultado.pontos.maximo.parametros.forma).toBe(7);
  }, 300_000);
});

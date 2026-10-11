/* roda-pneu.test.js — a família `roda-pneu` (variante de disco) medida na malha: as três partes, o volume contra a fórmula,
   os furos de fixação (contagem, posição e diâmetro), o desvio do disco, as portas publicadas, cada restrição do contrato, o
   determinismo e a conferência com o componente `roda` do esboço nos três pontos. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { caixasPorParte, portasPublicadas } from '../../../src/autoria/descrever-partes.js';
import { conferirPortasNaForma } from '../../../src/autoria/porta-confere-forma.js';
import { aprovarFamilia } from '../../../tools/mecanifica/aprovacao-da-familia.mjs';
import { conferirFamiliaNosTresPontos } from '../../../tools/mecanifica/familia-com-esboco.mjs';
import { neutroCanonico } from '../../nucleo/entrada.js';
import { sha256Hex } from '../../nucleo/sha256.js';
import { FAMILIAS, ErroChamadaDeFamilia, chamar, criarRegistroDeFamilias } from '../index.js';
import { RODA_PNEU } from './index.js';
import { ALTURA_DO_BOJO, CHANFRO_MAXIMO_DO_OMBRO, FRACAO_DO_CHANFRO, PAREDE_DO_ARO, SALIENCIA_DO_CUBO } from './derivar.js';

const registro = criarRegistroDeFamilias({ familias: [RODA_PNEU] });
const MATERIAIS = {
  borracha: { cor: '#1f1f22', aspereza: 0.9, metalicidade: 0 },
  aco: { cor: '#b9bec4', aspereza: 0.35, metalicidade: 0.85 },
};
const MM = 0.001;
const rodar = (parametros = {}) => executarReceita({
  get CHAMADAS_COMPOSICOES() { return [chamar(RODA_PNEU, 'roda', parametros)]; },
  PARAMS: {}, TOPO: {}, ALIASES: [], MATERIAIS,
}, registro);
const P = RODA_PNEU.contrato.parametros;
const ponto = (nome) => Object.fromEntries(Object.entries(P).map(([chave, def]) => [chave, def[nome]]));
const hash = (neutro) => sha256Hex(JSON.stringify(neutroCanonico(neutro)));
const PONTOS = { padrao: {}, minimo: ponto('minimo'), medio: ponto('medio'), maximo: ponto('maximo') };
const completo = (parametros) => ({ ...Object.fromEntries(Object.entries(P).map(([chave, def]) => [chave, def.padrao])), ...parametros });

/* os vértices de uma parte, em mm */
function verticesDaParte(neutro, nome) {
  const ids = new Set();
  for (const face of neutro.F.values()) if (face.parte === nome) for (const v of face.vs) ids.add(v);
  return [...ids].map((v) => neutro.V.get(v).map((c) => c / MM));
}

/* a área do polígono regular de n lados e raio circunscrito r, e o volume de um perfil [r, x] revolvido em n facetas:
   n sen(2pi/n) vezes o primeiro momento da seção em relação ao eixo */
const areaRegular = (n, r) => 0.5 * n * r * r * Math.sin((2 * Math.PI) / n);
function volumeDaRevolucao(perfil, n) {
  let area = 0;
  let momento = 0;
  for (let i = 0; i < perfil.length; i++) {
    const [r0, x0] = perfil[i];
    const [r1, x1] = perfil[(i + 1) % perfil.length];
    const cruz = r0 * x1 - r1 * x0;
    area += cruz / 2;
    momento += ((r0 + r1) * cruz) / 6;
  }
  return Math.abs(n * Math.sin((2 * Math.PI) / n) * momento) * Math.sign(area || 1);
}
function volumeDoPneu(v) {
  const R = v.diametroPneu / 2;
  const ri = v.diametroAro / 2;
  const h = R - ri;
  const k = Math.min(CHANFRO_MAXIMO_DO_OMBRO, FRACAO_DO_CHANFRO * h);
  const xm = v.larguraPneu / 2;
  const xb = v.larguraAro / 2;
  const bojo = ri + ALTURA_DO_BOJO * h;
  return Math.abs(volumeDaRevolucao([[ri, -xb], [bojo, -xm], [R - k, -xm], [R, -xm + k], [R, xm - k], [R - k, xm], [bojo, xm], [ri, xb]], 96));
}
function volumeDoAro(v) {
  const ri = v.diametroAro / 2;
  return (areaRegular(96, ri) - areaRegular(96, ri - PAREDE_DO_ARO)) * v.larguraAro;
}
function volumeDoDisco(v) {
  const rb = v.diametroFuroCentral / 2;
  const rc = v.diametroCubo / 2;
  const rChapa = v.diametroAro / 2 - PAREDE_DO_ARO;
  const cubo = (areaRegular(96, rc) - areaRegular(96, rb)) * SALIENCIA_DO_CUBO;
  const chapa = (areaRegular(96, rChapa) - areaRegular(96, rb)) * v.espessuraDisco;
  const furos = v.furosDeFixacao * areaRegular(24, v.diametroFuro / 2) * (SALIENCIA_DO_CUBO + v.espessuraDisco);
  return cubo + chapa - furos;
}
function volumeDaParte(neutro, nome) {
  let volume = 0;
  for (const face of neutro.F.values()) {
    if (face.parte !== nome) continue;
    const a = neutro.V.get(face.vs[0]);
    for (let k = 1; k < face.vs.length - 1; k++) {
      const b = neutro.V.get(face.vs[k]);
      const c = neutro.V.get(face.vs[k + 1]);
      volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    }
  }
  return volume / MM ** 3;
}

describe('a família roda-pneu no registro do produto', () => {
  it('está em FAMILIAS, com a pasta que leva o seu nome, e declara o vínculo com o componente roda', () => {
    expect(FAMILIAS).toContain(RODA_PNEU);
    expect(RODA_PNEU.contrato.id).toBe('roda-pneu');
    expect(RODA_PNEU.contrato.esboco.componente).toBe('roda');
    expect(RODA_PNEU.contrato.portas.map(({ id }) => id)).toEqual(['assento-do-pneu', 'eixo', 'furos-de-fixacao']);
    expect(Object.keys(RODA_PNEU.contrato.perguntas)).toEqual(['aro', 'disco', 'pneu']);
  });

  it('chamada com os padrões entrega três partes, nenhuma face sem parte e nenhum passo sem efeito', () => {
    const { neutro } = rodar();
    expect(neutro.orfaos ?? []).toEqual([]);
    const { caixas, facesSemParte } = caixasPorParte(neutro);
    expect([...caixas.keys()]).toEqual(['aro', 'disco', 'pneu']);
    expect(facesSemParte).toEqual([]);
    for (const nome of ['aro', 'disco', 'pneu']) expect(caixas.get(nome).corpos).toBe(1);
  });
});

describe('a geometria medida na malha', () => {
  for (const [rotulo, parametros] of Object.entries(PONTOS)) {
    it(`no ponto ${rotulo}: o volume de cada parte bate com a fórmula e a roda tem o diâmetro e a largura pedidos`, () => {
      const v = completo(parametros);
      const { neutro } = rodar(parametros);
      expect(volumeDaParte(neutro, 'pneu')).toBeCloseTo(volumeDoPneu(v), 0);
      expect(volumeDaParte(neutro, 'aro')).toBeCloseTo(volumeDoAro(v), 0);
      expect(volumeDaParte(neutro, 'disco')).toBeCloseTo(volumeDoDisco(v), 0);
      const pneu = verticesDaParte(neutro, 'pneu');
      expect(Math.max(...pneu.map(([, y, z]) => Math.hypot(y, z)))).toBeCloseTo(v.diametroPneu / 2, 6);
      expect(Math.min(...pneu.map(([x]) => x))).toBeCloseTo(-v.larguraPneu / 2, 6);
      expect(Math.max(...pneu.map(([x]) => x))).toBeCloseTo(v.larguraPneu / 2, 6);
      expect(Math.min(...pneu.map(([, y, z]) => Math.hypot(y, z)))).toBeCloseTo(v.diametroAro / 2, 6);
    });
  }

  it('o disco fica no desvio pedido: a chapa em desvio + metade da espessura e o cubo 12 mm para dentro', () => {
    for (const desvio of [-25, 0, 35, 70]) {
      const v = completo({ desvio, larguraAro: 240, larguraPneu: 300 });
      const xs = verticesDaParte(rodar({ desvio, larguraAro: 240, larguraPneu: 300 }).neutro, 'disco').map(([x]) => x);
      expect(Math.max(...xs)).toBeCloseTo(desvio + v.espessuraDisco / 2, 6);
      expect(Math.min(...xs)).toBeCloseTo(desvio - v.espessuraDisco / 2 - SALIENCIA_DO_CUBO, 6);
    }
  });

  it('os furos de fixação são n, do diâmetro pedido, equidistantes no círculo, com o primeiro em +y', () => {
    for (const furos of [3, 4, 5, 6, 8, 10]) {
      const v = completo({ furosDeFixacao: furos, diametroCirculoFuros: 120, diametroCubo: 180, diametroFuro: 12 });
      const { neutro } = rodar({ furosDeFixacao: furos, diametroCirculoFuros: 120, diametroCubo: 180, diametroFuro: 12 });
      const xInicio = v.desvio - v.espessuraDisco / 2 - SALIENCIA_DO_CUBO;
      const naFace = verticesDaParte(neutro, 'disco').filter(([x]) => Math.abs(x - xInicio) < 1e-6);
      const centros = Array.from({ length: furos }, (_, k) => {
        const angulo = (2 * Math.PI * k) / furos;
        return [60 * Math.cos(angulo), 60 * Math.sin(angulo)];
      });
      /* vértices de furo: os que não estão no furo central nem na borda do cubo. A booleana pode pôr vértices extras no meio
         de uma aresta do polígono do furo, de modo que a contagem é a dos vértices sobre o círculo de 6 mm de raio */
      const dosFuros = naFace.filter(([, y, z]) => Math.hypot(y, z) > v.diametroFuroCentral / 2 + 1 && Math.hypot(y, z) < v.diametroCubo / 2 - 1);
      const distancias = dosFuros.map(([, y, z]) => centros.map(([cy, cz]) => Math.hypot(y - cy, z - cz)));
      centros.forEach((_, k) => {
        expect(distancias.filter((d) => Math.abs(d[k] - 6) < 1e-4)).toHaveLength(24);
      });
      for (const d of distancias) {
        const proximo = Math.min(...d);
        expect(proximo).toBeLessThanOrEqual(6 + 1e-4);
        expect(proximo).toBeGreaterThanOrEqual(6 * Math.cos(Math.PI / 24) - 1e-4);
      }
      expect(distancias.some((d) => Math.abs(d[0] - 6) < 1e-4)).toBe(true);
    }
  });

  it('é determinística: o mesmo ponto dá o mesmo hash, e outro parâmetro dá outro', () => {
    const a = hash(rodar(PONTOS.medio).neutro);
    expect(hash(rodar(PONTOS.medio).neutro)).toBe(a);
    expect(hash(rodar({ ...PONTOS.medio, desvio: 26 }).neutro)).not.toBe(a);
    expect(hash(rodar({ ...PONTOS.medio, furosDeFixacao: 5 }).neutro)).not.toBe(a);
  });
});

describe('as portas', () => {
  it('as três portas saem publicadas com a forma e o papel do contrato, e a malha confere o plano e o raio de cada uma', () => {
    for (const parametros of Object.values(PONTOS)) {
      const { neutro } = rodar(parametros);
      const portas = portasPublicadas(neutro);
      expect(portas.map(({ id, interface: i }) => [id, i.forma, i.papel])).toEqual([
        ['assento-do-pneu', 'anel', 'ocupa'],
        ['eixo', 'anel', 'recebe'],
        ['furos-de-fixacao', 'padraoFuros', 'recebe'],
      ]);
      expect(conferirPortasNaForma(neutro)).toEqual([]);
    }
  });

  it('o eixo é o anel do furo central na face de dentro do cubo, e o padrão de furos usa o diâmetro e a contagem pedidos', () => {
    const mudancas = { furosDeFixacao: 5, diametroFuro: 16, diametroCirculoFuros: 114, diametroCubo: 160 };
    const v = completo(mudancas);
    const portas = portasPublicadas(rodar(mudancas).neutro);
    const eixo = portas.find(({ id }) => id === 'eixo').interface;
    const xFace = (v.desvio - v.espessuraDisco / 2 - SALIENCIA_DO_CUBO) * MM;
    expect(eixo.eixo).toEqual([-1, 0, 0]);
    expect(eixo.centro[0]).toBeCloseTo(xFace, 12);
    expect(eixo.raioInterno).toBeCloseTo(v.diametroFuroCentral / 2 * MM, 12);
    expect(eixo.raioExterno).toBeCloseTo(v.diametroCubo / 2 * MM, 12);
    const furos = portas.find(({ id }) => id === 'furos-de-fixacao').interface;
    expect(furos.diametro).toBeCloseTo(16 * MM, 12);
    expect(furos.centros).toHaveLength(5);
    /* o gerador da interface e o `arranja` giram em sentidos opostos; o conjunto de centros é o mesmo */
    for (const [x, y, z] of furos.centros) {
      expect(x).toBeCloseTo(xFace, 12);
      expect(Math.hypot(y, z)).toBeCloseTo(57 * MM, 12);
    }
    const angulos = furos.centros.map(([, y, z]) => ((Math.atan2(z, y) + 2 * Math.PI) % (2 * Math.PI))).sort((a, b) => a - b);
    angulos.forEach((angulo, k) => expect(Math.min(Math.abs(angulo - (2 * Math.PI * k) / 5), 2 * Math.PI - Math.abs(angulo - (2 * Math.PI * k) / 5))).toBeLessThan(1e-9));
    expect(furos.plano.normal).toEqual([-1, 0, 0]);
  });
});

describe('o contrato recusa combinação impossível', () => {
  const recusa = (parametros) => {
    try { rodar(parametros); } catch (erro) { return erro; }
    throw new Error('a chamada devia ser recusada');
  };
  const CASOS = {
    'flanco-minimo-do-pneu': { diametroPneu: 500, diametroAro: 450 },
    'aro-mais-estreito-que-o-pneu': { larguraAro: 120, larguraPneu: 125 },
    'pneu-ate-o-dobro-do-aro': { larguraAro: 80, larguraPneu: 200 },
    'chapa-dentro-do-aro-por-fora': { desvio: 70, larguraAro: 100 },
    'cubo-dentro-do-aro-por-dentro': { desvio: -25, larguraAro: 80, larguraPneu: 100, espessuraDisco: 12 },
    'cubo-cabe-no-aro': { diametroCubo: 260, diametroAro: 300 },
    'furos-dentro-do-cubo': { diametroCirculoFuros: 200, diametroCubo: 140 },
    'furo-central-afastado-dos-furos': { diametroFuroCentral: 100, diametroCirculoFuros: 100 },
    'furos-vizinhos-separados': { furosDeFixacao: 10, diametroCirculoFuros: 70, diametroFuro: 20, diametroFuroCentral: 40 },
  };
  it('há um caso para cada restrição do contrato', () => {
    expect(Object.keys(CASOS).sort()).toEqual(RODA_PNEU.contrato.restricoes.map(({ id }) => id).sort());
  });
  for (const [id, parametros] of Object.entries(CASOS)) {
    it(`recusa pela restrição '${id}', dizendo o motivo`, () => {
      const erro = recusa(parametros);
      expect(erro).toBeInstanceOf(ErroChamadaDeFamilia);
      expect(erro.restricao).toBe(id);
      expect(erro.motivo).toBe(RODA_PNEU.contrato.restricoes.find((r) => r.id === id).motivo);
    });
  }

  it('recusa o valor fora da faixa e a contagem que não é inteira, sem gerar malha', () => {
    expect(() => rodar({ diametroPneu: 1200 })).toThrow(/parametros\.diametroPneu/);
    expect(() => rodar({ furosDeFixacao: 11 })).toThrow(/parametros\.furosDeFixacao/);
    expect(() => rodar({ furosDeFixacao: 4.5 })).toThrow(/parametros\.furosDeFixacao/);
    expect(() => rodar({ desvio: -26 })).toThrow(/parametros\.desvio/);
  });
});

describe('a camada mecânica da aprovação e a conferência com o esboço', () => {
  it('a aprovação mecânica passa nos três pontos e na varredura, com as três portas', () => {
    const resultado = aprovarFamilia(RODA_PNEU, { gravar: false });
    expect(resultado.problemas).toEqual([]);
    expect(resultado.aprovada).toBe(true);
  });

  it('a conferência com o componente roda passa no mínimo, no médio e no máximo, com o pneu rente ao volume do esboço', () => {
    const conferencia = conferirFamiliaNosTresPontos({ familia: RODA_PNEU, registro, materiais: MATERIAIS });
    expect(conferencia.estado).toBe('conferida');
    expect(conferencia.pontos.map(({ ponto }) => ponto)).toEqual(['minimo', 'medio', 'maximo']);
    for (const pt of conferencia.pontos) {
      expect(pt.achados).toEqual([]);
      expect(pt.partes.map(({ parte }) => parte)).toEqual(['aro', 'disco', 'pneu']);
      expect(pt.portas).toEqual([{ id: 'assento-do-pneu', estado: 'no-lugar' }]);
      expect(pt.portasSemVinculo).toEqual(['eixo', 'furos-de-fixacao']);
      expect(pt.partes.find(({ parte }) => parte === 'pneu').excessoMm).toBeCloseTo(0, 6);
    }
  });
});

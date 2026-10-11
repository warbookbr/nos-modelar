/* roda-pneu.test.js — a família `roda-pneu` medida na malha. Variante de disco: as três partes, o volume contra a fórmula,
   os furos de fixação (contagem, posição e diâmetro), o desvio do disco, as portas publicadas, cada restrição do contrato, o
   determinismo e a conferência com o componente `roda` do esboço nos três pontos. Variante raiada (`tipo` 1): os raios da
   estrutura de barras, o corte de cada barra contra a conta à mão, a massa, o cruzamento, as restrições dos raios e os hashes
   dos pontos de disco, que não mudam com os parâmetros novos. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { caixasPorParte, portasPublicadas } from '../../../src/autoria/descrever-partes.js';
import { conferirPortasNaForma } from '../../../src/autoria/porta-confere-forma.js';
import { aprovarFamilia, medirPonto } from '../../../tools/mecanifica/aprovacao-da-familia.mjs';
import { conferirFamiliaComEsboco, conferirFamiliaNosTresPontos } from '../../../tools/mecanifica/familia-com-esboco.mjs';
import { descreverEstrutura } from '../../extensoes/estrutura-de-barras/estrutura.js';
import { neutroCanonico } from '../../nucleo/entrada.js';
import { sha256Hex } from '../../nucleo/sha256.js';
import { FAMILIAS, ErroChamadaDeFamilia, chamar, criarRegistroDeFamilias } from '../index.js';
import { RODA_PNEU } from './index.js';
import { ALTURA_DO_BOJO, CHANFRO_MAXIMO_DO_OMBRO, ENTRADA_DO_RAIO_NO_CUBO, FRACAO_DO_CHANFRO, PAREDE_DO_ARO, SALIENCIA_DO_CUBO } from './derivar.js';
import { DENSIDADE_DO_ACO, LADOS_DO_RAIO, MAXIMO_DE_RAIOS, MINIMO_DE_RAIOS } from './composicoes.js';

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
/* Os pontos de disco: o contrato leva `tipo` ao máximo (1, raiada) no ponto máximo, e estes são os pontos do disco que a
   aprovação anterior à variante raiada guardou, com `tipo` 0. */
const PONTOS = { padrao: {}, minimo: { ...ponto('minimo'), tipo: 0 }, medio: { ...ponto('medio'), tipo: 0 }, maximo: { ...ponto('maximo'), tipo: 0 } };
/* Os três pontos da variante raiada: todos os parâmetros no mesmo extremo e `tipo` 1. O máximo é o ponto máximo do contrato. */
const PONTOS_RAIADOS = { minimo: { ...ponto('minimo'), tipo: 1 }, medio: { ...ponto('medio'), tipo: 1 }, maximo: ponto('maximo') };
/* os hashes da geometria dos três pontos da variante raiada, presos aqui porque só o máximo entra no aprovacao.json */
const HASH_DO_RAIADO = {
  minimo: '8bdbb22f8fc47b69d5c91f1cdee8401eb1a72c913eb35a26c565f606d656b8e6',
  medio: '831a744526c1c26eecc8b7c7ab51a3a425112600358f2b1fc7712a7934970869',
  maximo: 'eb6b1a3d55a4d73b17f73fae9ec4028b5d85f21034e5d1f19d38971a0665c036',
};
/* os hashes da geometria dos pontos de disco aprovados em 2026-10-11, antes de a variante raiada existir */
const HASH_DO_DISCO_APROVADO = {
  minimo: 'e411d1c6caf238f1e0bcacd01641688284bf3c9f4d325d7bcfa95e47ee06f739',
  medio: 'f58937d99ead0efafd897116430800827cec7fa525a8e00b86a0357408b42653',
  maximo: 'd4abcbf084d7d361a7f8f8e806fbb4d606752118c90081bfcc784c000b9eb770',
};
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
    expect(Object.keys(RODA_PNEU.contrato.perguntas)).toEqual(['aro', 'disco', 'pneu', 'raios']);
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
    'raios-cabem-no-cubo': { tipo: 1, raios: 32, diametroRaio: 11, espessuraDisco: 12, diametroCubo: 130 },
    'raio-cabe-na-flange': { tipo: 1, diametroRaio: 8, espessuraDisco: 8 },
    'parede-do-raio-abaixo-do-raio': { tipo: 1, diametroRaio: 6, paredeDoRaio: 3 },
    'cruzamento-com-numero-par': { tipo: 1, raios: 11, cruzamento: 1 },
    'raio-sai-do-cubo-para-fora': { tipo: 1, raios: 4, cruzamento: 1 },
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

/* ---------- a variante raiada ---------- */

/* a conta à mão de um raio: o nó do cubo a ENTRADA abaixo da superfície do cubo, o nó do aro na parede interna do aro, e o
   corte reto entre os dois nós (o comprimento de corte da barra), com o avanço angular do cruzamento */
function contaDoRaio(v) {
  const aro = v.diametroAro / 2 - PAREDE_DO_ARO;
  const cubo = v.diametroCubo / 2 - ENTRADA_DO_RAIO_NO_CUBO;
  const avanco = (v.cruzamento * 360) / v.raios;
  const corte = Math.sqrt(aro * aro + cubo * cubo - 2 * aro * cubo * Math.cos((avanco * Math.PI) / 180));
  return { aro, cubo, avanco, corte };
}
/* a estrutura de barras dos raios de uma chamada, medida pela função pública da extensão */
function estruturaDosRaios(parametros, extra = {}) {
  const v = completo(parametros);
  const { argumentos } = chamar(RODA_PNEU, 'roda', parametros);
  const indices = Array.from({ length: v.raios }, (_, k) => k);
  const perfil = { tipo: 'tubo-redondo', diametro: argumentos.diametroDoRaio, lados: LADOS_DO_RAIO, ...(v.paredeDoRaio > 0 ? { parede: argumentos.paredeDoRaio } : {}) };
  return descreverEstrutura({
    unidade: 'm', perfil, ...extra,
    nos: [...indices.map((k) => ({ nome: `c${k}`, posicao: argumentos[`noDoCubo${k}`] })), ...indices.map((k) => ({ nome: `a${k}`, posicao: argumentos[`noDoAro${k}`] }))],
    barras: indices.map((k) => ({ nome: `r${k}`, de: `c${k}`, para: `a${k}` })),
  });
}

describe('a variante raiada: o tipo escolhe a composição e o disco não muda', () => {
  it('tipo 0 chama a composição de disco, e tipo 1 a raiada com o perfil do raio: tubo com parede, maciço sem ela', () => {
    expect(chamar(RODA_PNEU, 'roda', {}).composicao).toBe('roda-pneu.disco');
    expect(chamar(RODA_PNEU, 'roda', { tipo: 1 }).composicao).toBe('roda-pneu.raiada-tubo-12');
    expect(chamar(RODA_PNEU, 'roda', { tipo: 1, paredeDoRaio: 0, raios: 20 }).composicao).toBe('roda-pneu.raiada-macico-20');
    expect(chamar(RODA_PNEU, 'roda', { tipo: 1, raios: 7 }).composicao).toBe('roda-pneu.raiada-tubo-7');
  });

  it('os hashes dos pontos de disco são os da aprovação anterior à variante raiada, com qualquer valor dos parâmetros do raio', () => {
    for (const nome of ['minimo', 'medio', 'maximo']) expect(hash(rodar(PONTOS[nome]).neutro)).toBe(HASH_DO_DISCO_APROVADO[nome]);
    const base = hash(rodar(PONTOS.medio).neutro);
    expect(hash(rodar({ ...PONTOS.medio, raios: 24, diametroRaio: 10, paredeDoRaio: 0, cruzamento: 2 }).neutro)).toBe(base);
    expect(hash(rodar({ ...PONTOS.medio, raios: 3, diametroRaio: 4, paredeDoRaio: 3, cruzamento: 3 }).neutro)).toBe(base);
  });

  it('o número de raios cabe nos 64 nós da extensão (dois por raio) e o contrato recusa 33', () => {
    expect(P.raios.minimo).toBe(MINIMO_DE_RAIOS);
    expect(P.raios.maximo).toBe(MAXIMO_DE_RAIOS);
    expect(2 * MAXIMO_DE_RAIOS).toBeLessThanOrEqual(64);
    expect(() => rodar({ tipo: 1, raios: MAXIMO_DE_RAIOS + 1 })).toThrow(/parametros\.raios/);
    expect(() => rodar({ tipo: 1, raios: MINIMO_DE_RAIOS - 1 })).toThrow(/parametros\.raios/);
    expect(() => rodar({ tipo: 2 })).toThrow(/parametros\.tipo/);
    expect(rodar({ tipo: 1, raios: MAXIMO_DE_RAIOS }).neutro.orfaos ?? []).toEqual([]);
  });
});

describe('a variante raiada medida na malha', () => {
  it('a roda raiada de raios radiais tem as três partes, um corpo por raio, o volume dos raios contra a fórmula e o pneu e o aro intactos', () => {
    const parametros = { tipo: 1 };
    const v = completo(parametros);
    const { neutro } = rodar(parametros);
    expect(neutro.orfaos ?? []).toEqual([]);
    const { caixas, facesSemParte } = caixasPorParte(neutro);
    expect([...caixas.keys()]).toEqual(['aro', 'disco', 'pneu']);
    expect(facesSemParte).toEqual([]);
    expect(caixas.get('aro').corpos).toBe(1);
    expect(caixas.get('pneu').corpos).toBe(1);
    expect(caixas.get('disco').corpos).toBe(1 + v.raios);
    expect(volumeDaParte(neutro, 'pneu')).toBeCloseTo(volumeDoPneu(v), 0);
    expect(volumeDaParte(neutro, 'aro')).toBeCloseTo(volumeDoAro(v), 0);
    const { aro, cubo, corte } = contaDoRaio(v);
    expect(corte).toBeCloseTo(aro - cubo, 9);
    const R = v.diametroRaio / 2;
    const secaoDoRaio = areaRegular(LADOS_DO_RAIO, R) - areaRegular(LADOS_DO_RAIO, R - v.paredeDoRaio);
    const rb = v.diametroFuroCentral / 2;
    const rc = v.diametroCubo / 2;
    const comprimentoDoCubo = SALIENCIA_DO_CUBO + v.espessuraDisco;
    const volumeDoCubo = (areaRegular(96, rc) - areaRegular(96, rb)) * comprimentoDoCubo - v.furosDeFixacao * areaRegular(24, v.diametroFuro / 2) * comprimentoDoCubo;
    const esperado = volumeDoCubo + v.raios * secaoDoRaio * corte;
    expect(Math.abs(volumeDaParte(neutro, 'disco') - esperado) / esperado).toBeLessThan(1e-5);
  });

  it('os raios terminam na parede interna do aro e ficam no plano da chapa do disco, entre as faces da flange', () => {
    const v = completo({ tipo: 1 });
    const { neutro } = rodar({ tipo: 1 });
    const { aro } = contaDoRaio(v);
    const doRaio = verticesDaParte(neutro, 'disco').filter(([, y, z]) => Math.hypot(y, z) > v.diametroCubo / 2 + 1e-3);
    expect(doRaio.length).toBeGreaterThan(0);
    const R = v.diametroRaio / 2;
    for (const [x] of doRaio) {
      expect(x).toBeGreaterThanOrEqual(v.desvio - R - 1e-5);
      expect(x).toBeLessThanOrEqual(v.desvio + R + 1e-5);
    }
    const maior = Math.max(...doRaio.map(([, y, z]) => Math.hypot(y, z)));
    expect(maior).toBeGreaterThanOrEqual(aro - 1e-5);
    expect(maior).toBeLessThanOrEqual(Math.hypot(aro, R) + 1e-5);
    expect(Math.max(...verticesDaParte(neutro, 'aro').map(([, y, z]) => Math.hypot(y, z)))).toBeCloseTo(v.diametroAro / 2, 6);
  });

  it('o cruzamento junta os raios que se cruzam: c = 0 deixa um corpo por raio, c = 1 junta pares, c >= 2 junta todos', () => {
    expect(estruturaDosRaios({ tipo: 1, raios: 16 }).componentes).toBe(16);
    expect(estruturaDosRaios({ tipo: 1, raios: 16, cruzamento: 1 }).componentes).toBe(8);
    expect(estruturaDosRaios({ tipo: 1, raios: 16, cruzamento: 2 }).componentes).toBe(1);
    expect(estruturaDosRaios({ tipo: 1, raios: 24, cruzamento: 3 }).componentes).toBe(1);
  });

  it('as barras da estrutura têm o comprimento de corte da conta à mão e o peso do aço: tubo com parede e barra maciça', () => {
    for (const parametros of [{ tipo: 1, raios: 16, cruzamento: 2 }, { tipo: 1, raios: 6, paredeDoRaio: 0, diametroRaio: 7 }]) {
      const v = completo(parametros);
      const medidas = estruturaDosRaios(parametros, { densidade: DENSIDADE_DO_ACO });
      const { corte } = contaDoRaio(v);
      expect(medidas.barras).toHaveLength(v.raios);
      for (const barra of medidas.barras) {
        expect(barra.comprimentoDeCorte / MM).toBeCloseTo(corte, 5);
        expect(barra.perfil.parede).toBe(v.paredeDoRaio > 0 ? v.paredeDoRaio * MM : null);
        const R = v.diametroRaio / 2;
        const area = Math.PI * (R * R - (v.paredeDoRaio > 0 ? (R - v.paredeDoRaio) ** 2 : 0));
        expect(barra.pesoPorMetro).toBeCloseTo(area * MM * MM * DENSIDADE_DO_ACO, 9);
      }
    }
  });

  it('as portas da roda raiada saem como as da roda de disco, e a malha confere o plano e o raio de cada uma', () => {
    for (const parametros of Object.values(PONTOS_RAIADOS)) {
      const { neutro } = rodar(parametros);
      expect(portasPublicadas(neutro).map(({ id, interface: i }) => [id, i.forma, i.papel])).toEqual([
        ['assento-do-pneu', 'anel', 'ocupa'],
        ['eixo', 'anel', 'recebe'],
        ['furos-de-fixacao', 'padraoFuros', 'recebe'],
      ]);
      expect(conferirPortasNaForma(neutro)).toEqual([]);
    }
  });
});

describe('a camada mecânica da variante raiada nos três pontos dela', () => {
  it('cada ponto raiado passa na medição da aprovação, com o hash preso e as medidas de corte de todas as barras', () => {
    for (const [nome, parametros] of Object.entries(PONTOS_RAIADOS)) {
      const resultado = medirPonto(RODA_PNEU, parametros, nome);
      expect(resultado.problemas).toEqual([]);
      expect(resultado.estado).toBe('ok');
      expect(resultado.hash).toBe(`sha256:${HASH_DO_RAIADO[nome]}`);
      const [estrutura] = resultado.medidas;
      expect(estrutura.ferramenta).toBe('estruturaDeBarras');
      expect(estrutura.cortes).toHaveLength(parametros.raios);
      const { corte } = contaDoRaio(parametros);
      for (const barra of estrutura.cortes) expect(barra.comprimentoDeCorte / MM).toBeCloseTo(corte, 5);
    }
  }, 120_000);

  it('a conferência com o componente roda passa nos pontos raiados, com as mesmas três partes', () => {
    for (const parametros of Object.values(PONTOS_RAIADOS)) {
      const conferencia = conferirFamiliaComEsboco({ familia: RODA_PNEU, parametros, registro, materiais: MATERIAIS });
      expect(conferencia.estado).toBe('conferida');
      expect(conferencia.achados).toEqual([]);
      expect(conferencia.partes.map(({ parte }) => parte)).toEqual(['aro', 'disco', 'pneu']);
    }
  });
});

describe('a camada mecânica da aprovação e a conferência com o esboço', () => {
  it('a aprovação mecânica passa nos três pontos e na varredura, com as três portas; o máximo é raiado e os outros dois são de disco', () => {
    const resultado = aprovarFamilia(RODA_PNEU, { gravar: false });
    expect(resultado.problemas).toEqual([]);
    expect(resultado.aprovada).toBe(true);
    expect(resultado.pontos.minimo.hash).toBe(`sha256:${HASH_DO_DISCO_APROVADO.minimo}`);
    expect(resultado.pontos.medio.hash).toBe(`sha256:${HASH_DO_DISCO_APROVADO.medio}`);
    expect(resultado.pontos.maximo.hash).toBe(`sha256:${HASH_DO_RAIADO.maximo}`);
  }, 180_000);

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

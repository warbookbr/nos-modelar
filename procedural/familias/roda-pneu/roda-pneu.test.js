/* roda-pneu.test.js — a família `roda-pneu` medida na malha. As quatro partes (pneu, aro, cubo, disco) e o volume de cada uma
   contra a fórmula; a banda (pneumática, maciça, sem pneu com friso, com relevo); o cubo de disco, os raios de um plano e os
   raios de duas flanges, com o corte de cada barra contra a conta à mão; a escala (a malha cresce na proporção do diâmetro); as
   três portas; o ombro largo, que sem o parâmetro deixa cada roda com a assinatura de antes dele; cada restrição do contrato; e os nove
   perfis chamados só pelo nome. A camada mecânica da aprovação, que mede os pontos, os perfis e a escala deles, roda uma vez no fim. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { caixasPorParte, portasPublicadas } from '../../../src/autoria/descrever-partes.js';
import { conferirPortasNaForma } from '../../../src/autoria/porta-confere-forma.js';
import { aprovarFamilia, medirPonto, pontosDaFamilia, pontosDosPerfis } from '../../../tools/modelar/aprovacao-da-familia.mjs';
import { descreverEstrutura } from '../../extensoes/estrutura-de-barras/estrutura.js';
import { neutroCanonico } from '../../nucleo/entrada.js';
import { sha256Hex } from '../../nucleo/sha256.js';
import { FAMILIAS, ErroChamadaDeFamilia, chamar, criarRegistroDeFamilias } from '../index.js';
import { RODA_PNEU } from './index.js';
import {
  ALTURA_DO_BOJO, CHANFRO_MAXIMO_DO_OMBRO_MM, ESPESSURA_DO_FRISO, FRACAO_DO_CHANFRO, FRACAO_DO_CHANFRO_DA_RODA_SEM_PNEU, FRACAO_DO_CHANFRO_NA_LARGURA,
  TALUDE_DO_FRISO, FAIXA_DA_PORTA_MM,
} from './derivar.js';
import { DENSIDADE_DO_ACO, LADOS_DA_RODA, LADOS_DO_FURO, LADOS_DO_RAIO, MAXIMO_DE_RAIOS, MINIMO_DE_RAIOS, EXPOENTE_DO_OMBRO_LARGO, PONTOS_DO_FLANCO, SEGMENTOS_DO_OMBRO_LARGO, faixasDoPneu } from './composicoes.js';

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
const PERFIS = RODA_PNEU.contrato.perfis;
const NOMES_DOS_PERFIS = ['bicicleta', 'carrinho-de-mao', 'carro', 'carroca', 'empilhadeira-700-12', 'furgao-235-65-r16', 'rodizio', 'trator', 'trem'];
const ponto = (nome) => Object.fromEntries(Object.entries(P).map(([chave, def]) => [chave, def[nome]]));
const hash = (neutro) => sha256Hex(JSON.stringify(neutroCanonico(neutro)));
/* os valores completos de uma chamada: o padrão, o perfil e o que o chamador escreve, nessa ordem */
const completo = (parametros = {}) => ({
  ...Object.fromEntries(Object.entries(P).map(([chave, def]) => [chave, def.padrao])),
  ...(parametros.perfil ? PERFIS[parametros.perfil].parametros : {}),
  ...Object.fromEntries(Object.entries(parametros).filter(([chave]) => chave !== 'perfil')),
});

/* os vértices de uma parte, em mm */
function verticesDaParte(neutro, nome) {
  const ids = new Set();
  for (const face of neutro.F.values()) if (face.parte === nome) for (const v of face.vs) ids.add(v);
  return [...ids].map((v) => neutro.V.get(v).map((c) => c / MM));
}
const raioDe = ([, y, z]) => Math.hypot(y, z);

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

/* a seção do pneu em mm, escrita aqui outra vez a partir do que o contrato diz da banda (sem o relevo) */
function medidasDoPneu(v) {
  const D = v.diametroPneu;
  const hf = v.alturaDoFriso * D;
  const R = D / 2 - hf;
  const rA = (v.diametroAro * D) / 2;
  const flanco = R - rA;
  const w = v.larguraPneu * D;
  const xm = w / 2;
  const xb = (v.banda === 0 || v.banda === 3 ? v.larguraAro * w : w) / 2;
  const ch = v.ombroDoPneu > 0
    ? v.ombroDoPneu * flanco
    : Math.min((v.banda === 2 ? FRACAO_DO_CHANFRO_DA_RODA_SEM_PNEU : FRACAO_DO_CHANFRO) * flanco, CHANFRO_MAXIMO_DO_OMBRO_MM, FRACAO_DO_CHANFRO_NA_LARGURA * w);
  return { D, hf, R, rA, flanco, w, xm, xb, ch };
}
function volumeDoPneu(v) {
  const { hf, R, rA, flanco, xm, xb, ch, w } = medidasDoPneu(v);
  const bojo = rA + ALTURA_DO_BOJO * flanco;
  const esquerda = hf > 0
    ? [[R + hf, -xm], [R + hf, -xm + ESPESSURA_DO_FRISO * hf], [R, -xm + ESPESSURA_DO_FRISO * hf + TALUDE_DO_FRISO * hf]]
    : [[R, -xm + ch], [R, -xm + ch + (w - 2 * ch) / 6], [R, -xm + ch + (2 * (w - 2 * ch)) / 6]];
  return Math.abs(volumeDaRevolucao([
    [rA, -xb], [bojo, -xm], [R - ch, -xm], ...esquerda, [R, xm - ch], [R - ch, xm], [bojo, xm], [rA, xb],
  ], LADOS_DA_RODA));
}
const volumeDoAro = (v) => {
  const rA = (v.diametroAro * v.diametroPneu) / 2;
  const { xb } = medidasDoPneu(v);
  return (areaRegular(LADOS_DA_RODA, rA) - areaRegular(LADOS_DA_RODA, rA - v.paredeDoAro * v.diametroPneu)) * 2 * xb;
};

describe('a família roda-pneu no registro do produto', () => {
  it('está em FAMILIAS, sem vínculo com o esboço, e com a faixa de 50 a 2000 mm de diâmetro', () => {
    expect(FAMILIAS).toContain(RODA_PNEU);
    expect(RODA_PNEU.contrato.id).toBe('roda-pneu');
    expect(RODA_PNEU.contrato.esboco).toBeUndefined();
    expect(RODA_PNEU.contrato.portas.map(({ id }) => id)).toEqual(['assento-do-pneu', 'eixo', 'furos-de-fixacao']);
    expect(Object.keys(RODA_PNEU.contrato.perguntas)).toEqual(['aro', 'cubo', 'disco', 'pneu', 'raios']);
    expect(P.diametroPneu).toMatchObject({ unidade: 'mm', minimo: 50, maximo: 2000 });
  });

  it('só o diâmetro do pneu é medida absoluta: as outras são proporções ou contagens', () => {
    const emMm = Object.entries(P).filter(([, { unidade }]) => unidade === 'mm').map(([nome]) => nome);
    expect(emMm).toEqual(['diametroPneu']);
    for (const [nome, def] of Object.entries(P)) {
      if (def.unidade === 'razao') {
        expect(def.maximo, nome).toBeLessThanOrEqual(1);
        expect(def.minimo, nome).toBeGreaterThanOrEqual(nome === 'desvio' ? -1 : 0);
      }
    }
  });

  it('chamada com os padrões entrega as quatro partes, nenhuma face sem parte e nenhum passo sem efeito', () => {
    const { neutro } = rodar();
    expect(neutro.orfaos ?? []).toEqual([]);
    const { caixas, facesSemParte } = caixasPorParte(neutro);
    expect([...caixas.keys()]).toEqual(['aro', 'cubo', 'disco', 'pneu']);
    expect(facesSemParte).toEqual([]);
    for (const nome of ['aro', 'cubo', 'disco', 'pneu']) expect(caixas.get(nome).corpos).toBe(1);
  });
});

describe('o padrão aceita as três formas de cubo e as quatro bandas', () => {
  for (const [rotulo, parametros] of [
    ['a raiada de um plano', { tipo: 1 }], ['a raiada de duas flanges', { tipo: 2 }], ['o pneu maciço', { banda: 1 }],
    ['a roda sem pneu', { banda: 2 }], ['o pneu com relevo', { banda: 3, sulcos: 16 }],
  ]) {
    it(`${rotulo}: só o parâmetro que a escolhe basta, e a malha sai sem passo perdido`, () => {
      const { neutro } = rodar(parametros);
      expect(neutro.orfaos ?? []).toEqual([]);
      expect(caixasPorParte(neutro).facesSemParte).toEqual([]);
    });
  }
});

describe('a geometria medida na malha: a roda de disco e a banda', () => {
  for (const nome of ['carro', 'carrinho-de-mao', 'rodizio', 'trem', 'trator']) {
    it(`o perfil ${nome}: o diâmetro, a largura e o aro pedidos, e o volume do pneu, do aro, do cubo e da chapa contra a fórmula`, () => {
      const v = completo({ perfil: nome });
      const { neutro } = rodar({ perfil: nome });
      const { D, R, rA, xm, hf } = medidasDoPneu(v);
      const pneu = verticesDaParte(neutro, 'pneu');
      expect(Math.max(...pneu.map(raioDe))).toBeCloseTo(D / 2, 6);
      expect(Math.min(...pneu.map(([x]) => x))).toBeCloseTo(-xm, 6);
      expect(Math.max(...pneu.map(([x]) => x))).toBeCloseTo(xm, 6);
      expect(Math.min(...pneu.map(raioDe))).toBeCloseTo(rA, 6);
      /* a banda de rodagem fica no raio R e o friso, se há, passa dela */
      expect(D / 2 - R).toBeCloseTo(hf, 9);
      if (v.banda !== 3) expect(volumeDaParte(neutro, 'pneu')).toBeCloseTo(volumeDoPneu(v), 0);
      else expect(volumeDaParte(neutro, 'pneu')).toBeLessThan(volumeDoPneu(v));
      expect(volumeDaParte(neutro, 'aro')).toBeCloseTo(volumeDoAro(v), 0);
      const rb = (v.diametroFuroCentral * D) / 2;
      const rc = (v.diametroCubo * D) / 2;
      const comprimento = v.larguraCubo * D;
      const cubo = (areaRegular(LADOS_DA_RODA, rc) - areaRegular(LADOS_DA_RODA, rb)) * comprimento
        - v.furosDeFixacao * areaRegular(LADOS_DO_FURO, (v.diametroFuro * D) / 2) * comprimento;
      expect(volumeDaParte(neutro, 'cubo')).toBeCloseTo(cubo, 0);
      const rPlaca = rA - v.paredeDoAro * D + (v.paredeDoAro * D) / 2;
      const rInterno = (rb + rc) / 2;
      expect(volumeDaParte(neutro, 'disco')).toBeCloseTo((areaRegular(LADOS_DA_RODA, rPlaca) - areaRegular(LADOS_DA_RODA, rInterno)) * v.espessuraDisco * D, 0);
    });
  }

  it('o desvio leva a chapa e o cubo para o lado pedido, e nunca para fora do barril do aro', () => {
    for (const desvio of [-0.6, -0.3, 0, 0.3, 0.6]) {
      const v = completo({ perfil: 'carro', desvio });
      const { neutro } = rodar({ perfil: 'carro', desvio });
      const aro = verticesDaParte(neutro, 'aro').map(([x]) => x);
      const chapa = verticesDaParte(neutro, 'disco').map(([x]) => x);
      const { xb } = medidasDoPneu(v);
      const esperado = (desvio * (2 * xb - v.espessuraDisco * v.diametroPneu)) / 2;
      expect((Math.max(...chapa) + Math.min(...chapa)) / 2).toBeCloseTo(esperado, 6);
      expect(Math.max(...chapa)).toBeLessThanOrEqual(Math.max(...aro) + 1e-9);
      expect(Math.min(...chapa)).toBeGreaterThanOrEqual(Math.min(...aro) - 1e-9);
      const cubo = verticesDaParte(neutro, 'cubo').map(([x]) => x);
      expect((Math.max(...cubo) + Math.min(...cubo)) / 2).toBeCloseTo(esperado, 6);
    }
  });

  it('os furos de fixação são n, do diâmetro pedido, equidistantes no círculo, com o primeiro em +y', () => {
    for (const furos of [3, 4, 5, 6, 8, 10]) {
      const parametros = { perfil: 'trator', furosDeFixacao: furos };
      const v = completo(parametros);
      const { neutro } = rodar(parametros);
      const D = v.diametroPneu;
      const xInicio = (v.desvio * (2 * medidasDoPneu(v).xb - v.espessuraDisco * D)) / 2 - (v.larguraCubo * D) / 2;
      const raioDoFuro = (v.diametroFuro * D) / 2;
      const raioDoCirculo = (v.diametroCirculoFuros * D) / 2;
      const naFace = verticesDaParte(neutro, 'cubo').filter(([x]) => Math.abs(x - xInicio) < 1e-6);
      const centros = Array.from({ length: furos }, (_, k) => [raioDoCirculo * Math.cos((2 * Math.PI * k) / furos), raioDoCirculo * Math.sin((2 * Math.PI * k) / furos)]);
      /* vértices de furo: os que não estão no furo central nem na borda do cubo */
      const dosFuros = naFace.filter((p) => raioDe(p) > (v.diametroFuroCentral * D) / 2 + 1 && raioDe(p) < (v.diametroCubo * D) / 2 - 1);
      const distancias = dosFuros.map(([, y, z]) => centros.map(([cy, cz]) => Math.hypot(y - cy, z - cz)));
      centros.forEach((_, k) => {
        expect(distancias.filter((d) => Math.abs(d[k] - raioDoFuro) < 1e-4)).toHaveLength(LADOS_DO_FURO);
      });
      expect(distancias.some((d) => Math.abs(d[0] - raioDoFuro) < 1e-4)).toBe(true);
    }
  });

  it('é determinística: o mesmo perfil dá o mesmo hash, e outro parâmetro dá outro', () => {
    const a = hash(rodar({ perfil: 'carro' }).neutro);
    expect(hash(rodar({ perfil: 'carro' }).neutro)).toBe(a);
    expect(hash(rodar({ perfil: 'carro', desvio: 0.4 }).neutro)).not.toBe(a);
    expect(hash(rodar({ perfil: 'carro', furosDeFixacao: 4 }).neutro)).not.toBe(a);
  });
});

describe('a banda: pneumática, maciça, sem pneu e com relevo', () => {
  const pneu = (parametros) => verticesDaParte(rodar(parametros).neutro, 'pneu');

  it('o pneumático abaula o flanco além da largura do aro; o maciço e a roda sem pneu têm o aro da largura da banda, de lados retos', () => {
    const base = { perfil: 'carro', larguraAro: 0.7 };
    const aroDoPneumatico = verticesDaParte(rodar({ ...base, banda: 0 }).neutro, 'aro').map(([x]) => x);
    const largura = completo(base).larguraPneu * completo(base).diametroPneu;
    expect(Math.max(...aroDoPneumatico)).toBeCloseTo(0.35 * largura, 6);
    for (const banda of [1, 2]) {
      const aro = verticesDaParte(rodar({ ...base, banda }).neutro, 'aro').map(([x]) => x);
      expect(Math.max(...aro)).toBeCloseTo(largura / 2, 6);
      expect(Math.min(...aro)).toBeCloseTo(-largura / 2, 6);
    }
  });

  it('o material do pneu é a borracha nas bandas pneumática, maciça e com relevo, e o aço na roda sem pneu', () => {
    const material = (parametros) => chamar(RODA_PNEU, 'roda', parametros).argumentos.materialDoPneu;
    expect([0, 1, 3].map((banda) => material({ banda, sulcos: 12 }))).toEqual(['borracha', 'borracha', 'borracha']);
    expect(material({ banda: 2 })).toBe('aco');
    const { neutro } = rodar({ perfil: 'trem' });
    const facesDoPneu = [...neutro.F.values()].filter((f) => f.parte === 'pneu');
    expect(new Set(facesDoPneu.map((f) => f.material))).toEqual(new Set(['aco']));
  });

  it('o friso fica do lado de dentro (-x), passa da banda por sua altura e o diâmetro do pneu é o externo, com o friso', () => {
    const v = completo({ perfil: 'trem' });
    const { D, hf, xm, R } = medidasDoPneu(v);
    expect(hf).toBeGreaterThan(0);
    const vertices = pneu({ perfil: 'trem' });
    expect(Math.max(...vertices.map(raioDe))).toBeCloseTo(D / 2, 6);
    const doFriso = vertices.filter((p) => raioDe(p) > R + 1e-6);
    expect(doFriso.length).toBeGreaterThan(0);
    for (const [x] of doFriso) {
      expect(x).toBeLessThanOrEqual(-xm + (ESPESSURA_DO_FRISO + 1e-9) * hf + 1e-6);
      expect(x).toBeGreaterThanOrEqual(-xm - 1e-6);
    }
    /* sem friso, o pneu é o mesmo anel e o raio da banda é o do diâmetro */
    const semFriso = pneu({ perfil: 'trem', alturaDoFriso: 0 });
    expect(Math.max(...semFriso.map(raioDe))).toBeCloseTo(D / 2, 6);
  });

  it('o relevo corta n prismas da banda de lado a lado, sem tocar o talão, e a banda continua um corpo só', () => {
    const lisa = rodar({ perfil: 'trator', banda: 0 }).neutro;
    for (const sulcos of [12, 24, 37]) {
      const parametros = { perfil: 'trator', sulcos };
      const v = completo(parametros);
      const { neutro } = rodar(parametros);
      expect(neutro.orfaos ?? []).toEqual([]);
      const { caixas, facesSemParte } = caixasPorParte(neutro);
      expect(facesSemParte).toEqual([]);
      expect(caixas.get('pneu').corpos).toBe(1);
      const { R, flanco, rA } = medidasDoPneu(v);
      const fundo = R - v.profundidadeDoSulco * flanco;
      /* o fundo de cada sulco é plano e as duas arestas dele estão no mesmo raio: 2n posições angulares distintas */
      const passo = (2 * Math.PI * R) / sulcos;
      const naQuina = Math.hypot(fundo, (v.larguraDoSulco * passo) / 2);
      const quinas = verticesDaParte(neutro, 'pneu').filter((p) => Math.abs(raioDe(p) - naQuina) < 1e-5);
      const angulos = new Set(quinas.map(([, y, z]) => Math.round((Math.atan2(z, y) * 1e6) / 1) / 1e6));
      expect(angulos.size).toBe(2 * sulcos);
      expect(Math.min(...verticesDaParte(neutro, 'pneu').map(raioDe))).toBeCloseTo(rA, 6);
      expect(volumeDaParte(neutro, 'pneu')).toBeLessThan(volumeDaParte(lisa, 'pneu'));
    }
  });

  it('o volume que o corte tira da banda cresce com a largura do sulco: sulcos duas vezes mais largos tiram o dobro', () => {
    const volume = (larguraDoSulco) => volumeDaParte(rodar({ perfil: 'trator', larguraDoSulco }).neutro, 'pneu');
    const lisa = volumeDaParte(rodar({ perfil: 'trator', banda: 0 }).neutro, 'pneu');
    const razao = (lisa - volume(0.3)) / (lisa - volume(0.15));
    expect(razao).toBeGreaterThan(1.9);
    expect(razao).toBeLessThan(2.1);
  });
});

/* a conta à mão de um raio: os dois nós e o corte reto entre eles (o comprimento de corte da barra) */
function contaDosRaios(parametros) {
  const v = completo(parametros);
  const { argumentos } = chamar(RODA_PNEU, 'roda', parametros);
  const barras = Array.from({ length: v.raios }, (_, k) => {
    const a = argumentos[`noDoCubo${k}`];
    const b = argumentos[`noDoAro${k}`];
    return { k, a, b, corte: Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / MM };
  });
  return { v, argumentos, barras };
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

describe('as duas melhorias gerais: os sulcos ao longo da volta da banda e a volta de furos de ventilação da chapa', () => {
  const DESLIGADAS = { sulcosCirculares: 0, furosDeVentilacao: 0 };
  const LIGADAS = {
    larguraDoSulcoCircular: 0.35, profundidadeDoSulcoCircular: 0.12, diametroCirculoDeVentilacao: 0.42, diametroFuroDeVentilacao: 0.05,
  };

  it('desligadas (a contagem em zero) dão a malha de antes, com qualquer valor dos parâmetros que elas trazem', () => {
    for (const nome of ['carro', 'trator', 'trem', 'rodizio', 'carroca', 'bicicleta']) {
      const base = hash(rodar({ perfil: nome }).neutro);
      expect(chamar(RODA_PNEU, 'roda', { perfil: nome }).composicao).not.toMatch(/-circ|-vent/);
      expect(hash(rodar({ perfil: nome, ...DESLIGADAS, ...LIGADAS }).neutro), nome).toBe(base);
    }
  });

  it('os sulcos ao longo da volta só valem nas bandas pneumáticas, e a ventilação só na roda de disco', () => {
    for (const banda of [1, 2]) {
      const base = hash(rodar({ perfil: 'rodizio', banda }).neutro);
      expect(hash(rodar({ perfil: 'rodizio', banda, sulcosCirculares: 3 }).neutro)).toBe(base);
    }
    const raiada = hash(rodar({ perfil: 'carroca' }).neutro);
    expect(hash(rodar({ perfil: 'carroca', furosDeVentilacao: 6 }).neutro)).toBe(raiada);
    expect(chamar(RODA_PNEU, 'roda', { perfil: 'carro', sulcosCirculares: 3 }).composicao).toBe('roda-pneu.disco-lisa-circ');
    expect(chamar(RODA_PNEU, 'roda', { perfil: 'carro', furosDeVentilacao: 6, diametroFuroDeVentilacao: 0.05 }).composicao).toBe('roda-pneu.disco-lisa-vent');
    expect(chamar(RODA_PNEU, 'roda', { perfil: 'trator', sulcosCirculares: 3 }).composicao).toBe('roda-pneu.disco-sulcada-circ');
    expect(chamar(RODA_PNEU, 'roda', { perfil: 'bicicleta', banda: 0, sulcosCirculares: 2 }).composicao).toBe('roda-pneu.flanges-macico-32-lisa-circ');
  });

  it('n sulcos circulares tiram da banda n anéis do fundo ao raio, igualmente espaçados e centrados no passo, e a banda continua um corpo só', () => {
    for (const sulcosCirculares of [2, 3, 6]) {
      const parametros = { perfil: 'furgao-235-65-r16', furosDeVentilacao: 0, sulcosCirculares };
      const v = completo(parametros);
      const lisa = rodar({ ...parametros, sulcosCirculares: 0 }).neutro;
      const { neutro } = rodar(parametros);
      expect(neutro.orfaos ?? []).toEqual([]);
      const { caixas, facesSemParte } = caixasPorParte(neutro);
      expect(facesSemParte).toEqual([]);
      expect(caixas.get('pneu').corpos).toBe(1);
      const { R, flanco, xm, ch } = medidasDoPneu(v);
      const fundo = R - v.profundidadeDoSulcoCircular * flanco;
      const passo = (2 * xm - 2 * ch) / sulcosCirculares;
      const largura = v.larguraDoSulcoCircular * passo;
      const esperados = [];
      for (let i = 0; i < sulcosCirculares; i++) {
        const inicio = -xm + ch + i * passo + (passo - largura) / 2;
        esperados.push(inicio, inicio + largura);
      }
      const xs = [...new Set(verticesDaParte(neutro, 'pneu').filter((q) => Math.abs(raioDe(q) - fundo) < 1e-6).map(([x]) => Math.round(x * 1e6) / 1e6))].sort((a, b) => a - b);
      expect(xs).toHaveLength(2 * sulcosCirculares);
      xs.forEach((x, k) => expect(x).toBeCloseTo(esperados[k], 5));
      /* o volume tirado é o de n anéis do fundo ao raio, com as facetas da própria banda */
      const tirado = sulcosCirculares * largura * (areaRegular(LADOS_DA_RODA, R) - areaRegular(LADOS_DA_RODA, fundo));
      expect((volumeDaParte(lisa, 'pneu') - volumeDaParte(neutro, 'pneu')) / tirado).toBeCloseTo(1, 6);
      expect(Math.min(...verticesDaParte(neutro, 'pneu').map(raioDe))).toBeCloseTo(medidasDoPneu(v).rA, 6);
    }
  });

  it('os sulcos circulares convivem com o relevo transversal: os dois cortes saem da banda e ela segue um corpo só', () => {
    const base = { perfil: 'trator', sulcosCirculares: 3, larguraDoSulcoCircular: 0.2 };
    const so = rodar({ perfil: 'trator' }).neutro;
    const ambos = rodar(base).neutro;
    expect(chamar(RODA_PNEU, 'roda', base).composicao).toBe('roda-pneu.disco-sulcada-circ');
    expect(ambos.orfaos ?? []).toEqual([]);
    expect(caixasPorParte(ambos).caixas.get('pneu').corpos).toBe(1);
    expect(volumeDaParte(ambos, 'pneu')).toBeLessThan(volumeDaParte(so, 'pneu'));
  });

  it('n furos de ventilação furam a chapa, no raio da volta, com o diâmetro pedido, e não mexem no cubo, no aro nem no pneu', () => {
    for (const furosDeVentilacao of [3, 5, 8]) {
      const parametros = { perfil: 'furgao-235-65-r16', sulcosCirculares: 0, furosDeVentilacao };
      const v = completo(parametros);
      const sem = rodar({ ...parametros, furosDeVentilacao: 0 }).neutro;
      const { neutro } = rodar(parametros);
      expect(neutro.orfaos ?? []).toEqual([]);
      const { caixas, facesSemParte } = caixasPorParte(neutro);
      expect(facesSemParte).toEqual([]);
      for (const parte of ['pneu', 'aro', 'cubo']) expect(volumeDaParte(neutro, parte)).toBeCloseTo(volumeDaParte(sem, parte), 3);
      expect(caixas.get('disco').corpos).toBe(1);
      const D = v.diametroPneu;
      const volta = (v.diametroCirculoDeVentilacao * D) / 2;
      const raioDoFuro = (v.diametroFuroDeVentilacao * D) / 2;
      const centros = Array.from({ length: furosDeVentilacao }, (_, k) => {
        const angulo = Math.PI / furosDeVentilacao + (2 * Math.PI * k) / furosDeVentilacao;
        return [volta * Math.cos(angulo), volta * Math.sin(angulo)];
      });
      const naParede = verticesDaParte(neutro, 'disco').filter(([, y, z]) => Math.min(...centros.map(([cy, cz]) => Math.abs(Math.hypot(y - cy, z - cz) - raioDoFuro))) < 1e-5);
      expect(naParede).toHaveLength(furosDeVentilacao * LADOS_DO_FURO * 2);
      const tirado = furosDeVentilacao * areaRegular(LADOS_DO_FURO, raioDoFuro) * v.espessuraDisco * D;
      expect((volumeDaParte(sem, 'disco') - volumeDaParte(neutro, 'disco')) / tirado).toBeCloseTo(1, 6);
      /* a volta fica entre o cubo e o aro, e longe do círculo dos furos de fixação */
      const noFuro = verticesDaParte(neutro, 'disco').filter(([, y, z]) => centros.some(([cy, cz]) => Math.abs(Math.hypot(y - cy, z - cz) - raioDoFuro) < 1e-5));
      expect(Math.min(...noFuro.map(raioDe))).toBeGreaterThan((v.diametroCubo * D) / 2);
      expect(Math.max(...noFuro.map(raioDe))).toBeLessThan((v.diametroAro * D) / 2 - v.paredeDoAro * D);
      expect(Math.min(...noFuro.map(raioDe))).toBeGreaterThan(((v.diametroCirculoFuros + v.diametroFuro) * D) / 2);
    }
  });

  it('o perfil do furgão liga as duas, 235/65 R16, e a malha fecha com a aprovação inteira', () => {
    const v = completo({ perfil: 'furgao-235-65-r16' });
    expect(v.diametroPneu).toBeCloseTo(2 * 0.65 * 235 + 16 * 25.4, 0);
    expect(v.larguraPneu * v.diametroPneu).toBeCloseTo(235, 0);
    expect(v.diametroAro * v.diametroPneu).toBeCloseTo(16 * 25.4, 0);
    expect(v).toMatchObject({ tipo: 0, banda: 0, furosDeFixacao: 5, sulcosCirculares: 4, furosDeVentilacao: 5 });
    const { neutro } = rodar({ perfil: 'furgao-235-65-r16' });
    expect(portasPublicadas(neutro).find(({ id }) => id === 'furos-de-fixacao').interface.centros).toHaveLength(5);
  });
});

describe('a forma do pneu: os lados em volta e o ombro redondo', () => {
  const base = { perfil: 'furgao-235-65-r16', sulcosCirculares: 0, furosDeVentilacao: 0 };
  const aneis = (neutro, nome) => new Set([...neutro.F.values()].filter((f) => f.parte === nome).flatMap((f) => f.vs).map((v) => {
    const [, y, z] = neutro.V.get(v);
    return `${Math.round(Math.hypot(y, z) / MM * 1e3)}|${Math.round(neutro.V.get(v)[0] / MM * 1e3)}`;
  }));

  it('com 96 lados e sem o ombro redondo a malha é a de antes, e a composição não ganha sufixo', () => {
    const antes = hash(rodar(base).neutro);
    expect(hash(rodar({ ...base, ladosDoPneu: 96, ombroRedondo: 0 }).neutro)).toBe(antes);
    expect(chamar(RODA_PNEU, 'roda', { ...base, ladosDoPneu: 96 }).composicao).toBe('roda-pneu.disco-lisa');
    expect(chamar(RODA_PNEU, 'roda', { ...base, ombroRedondo: 1 }).composicao).toBe('roda-pneu.disco-lisa-ombro');
  });

  it('mais lados em volta valem para o pneu e para o aro que ele abraça, e o cubo e a chapa seguem com os 96', () => {
    const v = completo(base);
    const { rA, xb, xm, R, ch, flanco } = medidasDoPneu(v);
    const antes = rodar(base).neutro;
    const { neutro } = rodar({ ...base, ladosDoPneu: 128 });
    const faces = (n, nome) => [...n.F.values()].filter((f) => f.parte === nome).length;
    expect(faces(neutro, 'pneu')).toBe(10 * 128);
    expect(faces(neutro, 'aro')).toBe(4 * 128);
    expect(faces(neutro, 'cubo')).toBe(faces(antes, 'cubo'));
    expect(faces(neutro, 'disco')).toBe(faces(antes, 'disco'));
    const bojo = rA + ALTURA_DO_BOJO * flanco;
    const passo = (2 * xm - 2 * ch) / 6;
    const secao = [[rA, -xb], [bojo, -xm], [R - ch, -xm], [R, -xm + ch], [R, -xm + ch + passo], [R, -xm + ch + 2 * passo], [R, xm - ch], [R - ch, xm], [bojo, xm], [rA, xb]];
    expect(volumeDaParte(neutro, 'pneu')).toBeCloseTo(volumeDaRevolucao(secao, 128), 0);
  });

  it('o ombro redondo troca o chanfro por um arco de quarto de círculo em três segmentos: dois anéis a mais por ombro, sobre o círculo do chanfro', () => {
    const v = completo(base);
    const { R, xm, ch } = medidasDoPneu(v);
    const reto = rodar(base).neutro;
    const { neutro } = rodar({ ...base, ombroRedondo: 1 });
    expect(neutro.orfaos ?? []).toEqual([]);
    expect(caixasPorParte(neutro).caixas.get('pneu').corpos).toBe(1);
    expect(aneis(neutro, 'pneu').size - aneis(reto, 'pneu').size).toBe(4 * 1);
    const contagem = (n, nome) => [...n.F.values()].filter((f) => f.parte === nome).length;
    expect(contagem(neutro, 'pneu') - contagem(reto, 'pneu')).toBe(4 * LADOS_DA_RODA);
    /* os pontos do arco estão a `ch` do centro do arco, que fica em (R - ch, -xm + ch) à esquerda */
    const noArco = verticesDaParte(neutro, 'pneu').filter(([x, ...yz]) => x < -xm + ch + 1e-6 && Math.hypot(...yz) > R - ch + 1e-6 && Math.hypot(...yz) < R - 1e-6);
    expect(noArco.length).toBeGreaterThan(0);
    for (const [x, y, z] of noArco) expect(Math.hypot(x + xm - ch, Math.hypot(y, z) - (R - ch))).toBeCloseTo(ch, 5);
    /* o volume cresce em relação ao chanfro reto: o arco abaula para fora da corda */
    expect(volumeDaParte(neutro, 'pneu')).toBeGreaterThan(volumeDaParte(reto, 'pneu'));
  });

  it('as faixas do pneu: o flanco são cinco segmentos e a banda o resto, com ou sem o ombro redondo', () => {
    expect(faixasDoPneu()).toEqual({ flancos: [0, 1, 7, 8, 9], banda: [2, 3, 4, 5, 6] });
    expect(faixasDoPneu({ ombroRedondo: true })).toEqual({ flancos: [0, 1, 11, 12, 13], banda: [2, 3, 4, 5, 6, 7, 8, 9, 10] });
    expect(faixasDoPneu({ ombroRedondo: true, ombroLargo: true })).toEqual({ flancos: [0, 1, 2, 3, 31, 32, 33, 34, 35], banda: Array.from({ length: 27 }, (_, k) => k + 4) });
  });
});

describe('o ombro largo: a fração do flanco sem o teto de 9 mm, para o pneu industrial', () => {
  /* As assinaturas da malha antes do ombro largo (2026-11-10): os três pontos (o máximo sem o ombro largo, que o máximo do contrato agora
     liga), os oito perfis de antes, os mesmos com o ombro redondo e com 128 lados. Os 16 primeiros algarismos do sha256 do neutro canônico. */
  const ANTES = {
    minimo: [ponto('minimo'), '5ef1b731d02d951c'],
    medio: [ponto('medio'), '1e8029e3be4d82be'],
    'maximo sem o ombro largo': [{ ...ponto('maximo'), ombroDoPneu: 0 }, '61c6e2b8df3c3351'],
    bicicleta: [{ perfil: 'bicicleta' }, '27cabd8eefc1768e'],
    'bicicleta redonda': [{ perfil: 'bicicleta', ladosDoPneu: 128, ombroRedondo: 1 }, '4c7bf5413bcebe47'],
    'carrinho-de-mao': [{ perfil: 'carrinho-de-mao' }, 'bac8fc2875651446'],
    'carrinho-de-mao redondo': [{ perfil: 'carrinho-de-mao', ombroRedondo: 1 }, '3b9b7c70841c9784'],
    carro: [{ perfil: 'carro' }, '8bc2bf8d2f2d7214'],
    'carro redondo': [{ perfil: 'carro', ombroRedondo: 1 }, 'aabac4c9b7516a88'],
    carroca: [{ perfil: 'carroca' }, '4f3dbb19889dc6be'],
    furgao: [{ perfil: 'furgao-235-65-r16' }, '7d6e175823d0f56e'],
    'furgao redondo': [{ perfil: 'furgao-235-65-r16', ombroRedondo: 1 }, '44d90b3383d339f4'],
    rodizio: [{ perfil: 'rodizio' }, 'bdd200b9ff364b0d'],
    'rodizio redondo': [{ perfil: 'rodizio', ombroRedondo: 1 }, 'a4abce8d4e4bed40'],
    trator: [{ perfil: 'trator' }, 'c839c93322a6cc88'],
    'trator redondo': [{ perfil: 'trator', ombroRedondo: 1 }, '693369ff0951bce9'],
    trem: [{ perfil: 'trem' }, 'b5671dbb1cf6a7d5'],
    'trem redondo': [{ perfil: 'trem', ombroRedondo: 1 }, '9b62a1ae9b721954'],
  };
  const largo = { perfil: 'empilhadeira-700-12', ombroRedondo: 0 };

  it('sem o ombro largo (o padrão 0), cada roda sai com a assinatura da malha de antes dele', () => {
    for (const [nome, [parametros, assinatura]] of Object.entries(ANTES)) expect(hash(rodar(parametros).neutro).slice(0, 16), nome).toBe(assinatura);
  });

  it('o ombro é a fração pedida do flanco, sem o teto de 9 mm: o chanfro vai de (R - c, -xm) a (R, -xm + c), e o volume é o da seção', () => {
    const v = completo(largo);
    const { R, rA, flanco, xm, xb } = medidasDoPneu(v);
    const c = v.ombroDoPneu * flanco;
    expect(c).toBeGreaterThan(5 * CHANFRO_MAXIMO_DO_OMBRO_MM);
    const { neutro } = rodar(largo);
    expect(neutro.orfaos ?? []).toEqual([]);
    expect(caixasPorParte(neutro).caixas.get('pneu').corpos).toBe(1);
    const vs = verticesDaParte(neutro, 'pneu');
    const ha = (r, x) => vs.some(([vx, ...yz]) => Math.abs(vx - x) < 1e-6 && Math.abs(raioDe([0, ...yz]) - r) < 1e-6);
    for (const lado of [-1, 1]) {
      expect(ha(R - c, lado * xm), `ombro em ${lado}`).toBe(true);
      expect(ha(R, lado * (xm - c)), `banda em ${lado}`).toBe(true);
    }
    const bojo = rA + ALTURA_DO_BOJO * flanco;
    const passo = (2 * xm - 2 * c) / 6;
    const secao = [[rA, -xb], [bojo, -xm], [R - c, -xm], [R, -xm + c], [R, -xm + c + passo], [R, -xm + c + 2 * passo], [R, xm - c], [R - c, xm], [bojo, xm], [rA, xb]];
    expect(volumeDaParte(neutro, 'pneu')).toBeCloseTo(volumeDaRevolucao(secao, v.ladosDoPneu), 0);
  });

  it('a porta do assento declara o raio que a face plana de dentro alcança, o do ombro, e a malha a confere; com friso segue o do friso', () => {
    const v = completo(largo);
    const { R, flanco } = medidasDoPneu(v);
    for (const parametros of [largo, { ...largo, ombroRedondo: 1 }]) {
      const { neutro } = rodar(parametros);
      const assento = portasPublicadas(neutro).find(({ id }) => id === 'assento-do-pneu').interface;
      /* sem o arco, a face plana vai do bojo ao ombro; com a curva, vale o maior raio da seção a até 10 mm do plano */
      const naFaixa = verticesDaParte(neutro, 'pneu').filter(([x]) => x - assento.centro[0] / MM <= FAIXA_DA_PORTA_MM + 1e-9);
      const esperado = parametros.ombroRedondo ? Math.max(...naFaixa.map(raioDe)) : R - v.ombroDoPneu * flanco;
      expect(assento.raioExterno / MM).toBeCloseTo(esperado, 6);
      expect(conferirPortasNaForma(neutro)).toEqual([]);
    }
    const trem = { perfil: 'trem', ombroDoPneu: 0.3 };
    const { neutro } = rodar(trem);
    expect(portasPublicadas(neutro).find(({ id }) => id === 'assento-do-pneu').interface.raioExterno / MM).toBeCloseTo(completo(trem).diametroPneu / 2, 9);
    expect(conferirPortasNaForma(neutro)).toEqual([]);
  });

  it('com o ombro redondo, o lado é uma curva só: o flanco em parábola do talão ao bojo e um quarto de superelipse do bojo à banda, sem quina', () => {
    const v = completo({ perfil: 'empilhadeira-700-12' });
    const { R, rA, xm, xb, flanco } = medidasDoPneu(v);
    const c = v.ombroDoPneu * flanco;
    const rb = rA + ALTURA_DO_BOJO * flanco;
    const { neutro } = rodar({ perfil: 'empilhadeira-700-12' });
    expect(chamar(RODA_PNEU, 'roda', { perfil: 'empilhadeira-700-12' }).composicao).toBe('roda-pneu.disco-lisa-ombro-largo');
    expect(caixasPorParte(neutro).caixas.get('pneu').corpos).toBe(1);
    const vs = verticesDaParte(neutro, 'pneu');
    /* a superelipse: os pontos entre o bojo e a banda, dos dois lados, satisfazem |(r - rb) / (R - rb)|^n + |(|x| - (xm - c)) / c|^n = 1 */
    const naElipse = vs.filter(([x, ...yz]) => Math.abs(x) > xm - c + 1e-6 && raioDe([0, ...yz]) > rb + 1e-6 && raioDe([0, ...yz]) < R - 1e-6);
    expect(naElipse.length).toBe(2 * (SEGMENTOS_DO_OMBRO_LARGO - 1) * v.ladosDoPneu);
    const n = EXPOENTE_DO_OMBRO_LARGO;
    for (const [x, ...yz] of naElipse) expect(((raioDe([0, ...yz]) - rb) / (R - rb)) ** n + Math.abs((Math.abs(x) - (xm - c)) / c) ** n).toBeCloseTo(1, 9);
    /* o flanco: os pontos entre o talão e o bojo ficam por dentro da largura máxima, na parábola que chega ao bojo na vertical */
    const noFlanco = vs.filter(([, ...yz]) => raioDe([0, ...yz]) > rA + 1e-6 && raioDe([0, ...yz]) < rb - 1e-6);
    expect(noFlanco.length).toBe(2 * PONTOS_DO_FLANCO * v.ladosDoPneu);
    for (const [x, ...yz] of noFlanco) {
      const t = (raioDe([0, ...yz]) - rA) / (rb - rA);
      expect(xm - Math.abs(x)).toBeCloseTo((xm - xb) * (1 - t) ** 2, 9);
    }
    /* sem quina: o maior ângulo entre dois segmentos vizinhos da seção, do talão à banda */
    const secao = [...new Map(vs.filter(([x, y, z]) => x < 0 && Math.abs(z) < 1e-9 && y > 0).map(([x, y]) => [`${x.toFixed(6)}`, [y, x]])).values()]
      .filter(([r]) => r <= R + 1e-9 && r >= rA - 1e-9).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let maior = 0;
    for (let k = 1; k < secao.length - 1; k++) {
      const u = [secao[k][0] - secao[k - 1][0], secao[k][1] - secao[k - 1][1]];
      const w = [secao[k + 1][0] - secao[k][0], secao[k + 1][1] - secao[k][1]];
      maior = Math.max(maior, Math.abs(Math.atan2(u[0] * w[1] - u[1] * w[0], u[0] * w[0] + u[1] * w[1])) * 180 / Math.PI);
    }
    expect(maior).toBeLessThan(15);
  });

  it('o ombro que passa de 30% da banda é recusado com as duas medidas em mm, e o que passa de 0,6 do flanco pela faixa', () => {
    const v = completo({ perfil: 'empilhadeira-700-12', larguraPneu: 0.2 });
    const c = v.ombroDoPneu * medidasDoPneu(v).flanco;
    const banda = 0.3 * v.larguraPneu * v.diametroPneu;
    let erro = null;
    try { rodar({ perfil: 'empilhadeira-700-12', larguraPneu: 0.2 }); } catch (e) { erro = e; }
    expect(erro?.restricao).toBe('ombro-cabe-na-banda');
    const [, esquerda, direita] = erro.message.match(/o lado esquerdo vale ([\d.]+) e o direito ([\d.]+)/);
    expect(Number(esquerda)).toBeCloseTo(c, 6);
    expect(Number(direita)).toBeCloseTo(banda, 6);
    expect(() => rodar({ perfil: 'empilhadeira-700-12', ombroDoPneu: 0.7 })).toThrow(/parametros\.ombroDoPneu/);
  });
});

describe('os raios: o tipo escolhe a composição e o número de raios cabe nos 64 nós da extensão', () => {
  it('o tipo 0 é a roda de disco, o 1 a raiada de um plano e o 2 a de duas flanges, com o perfil do raio: tubo com parede, maciço sem ela', () => {
    expect(chamar(RODA_PNEU, 'roda', {}).composicao).toBe('roda-pneu.disco-lisa');
    expect(chamar(RODA_PNEU, 'roda', { perfil: 'trator' }).composicao).toBe('roda-pneu.disco-sulcada');
    expect(chamar(RODA_PNEU, 'roda', { perfil: 'carroca' }).composicao).toBe('roda-pneu.raiada-macico-12-lisa');
    expect(chamar(RODA_PNEU, 'roda', { perfil: 'carroca', paredeDoRaio: 0.3, raios: 8 }).composicao).toBe('roda-pneu.raiada-tubo-8-lisa');
    expect(chamar(RODA_PNEU, 'roda', { perfil: 'bicicleta' }).composicao).toBe('roda-pneu.flanges-macico-32-lisa');
    expect(chamar(RODA_PNEU, 'roda', { perfil: 'bicicleta', paredeDoRaio: 0.3, raios: 16, banda: 3, sulcos: 20 }).composicao).toBe('roda-pneu.flanges-tubo-16-sulcada');
  });

  it('o disco não depende dos parâmetros do raio: o hash é o mesmo com qualquer valor deles', () => {
    const base = hash(rodar({ perfil: 'carro' }).neutro);
    expect(hash(rodar({ perfil: 'carro', raios: 24, diametroRaio: 0.01, paredeDoRaio: 0.2, cruzamento: 2 }).neutro)).toBe(base);
    expect(hash(rodar({ perfil: 'carro', raios: 3, diametroRaio: 0.005, diametroFlange: 0.4 }).neutro)).toBe(base);
  });

  it('o número de raios cabe nos 64 nós da extensão (dois por raio) e o contrato recusa 33', () => {
    expect(P.raios.minimo).toBe(MINIMO_DE_RAIOS);
    expect(P.raios.maximo).toBe(MAXIMO_DE_RAIOS);
    expect(2 * MAXIMO_DE_RAIOS).toBeLessThanOrEqual(64);
    expect(() => rodar({ perfil: 'carroca', raios: MAXIMO_DE_RAIOS + 1 })).toThrow(/parametros\.raios/);
    expect(() => rodar({ perfil: 'carroca', raios: MINIMO_DE_RAIOS - 1 })).toThrow(/parametros\.raios/);
    expect(() => rodar({ tipo: 3 })).toThrow(/parametros\.tipo/);
    expect(rodar({ perfil: 'bicicleta', raios: MAXIMO_DE_RAIOS }).neutro.orfaos ?? []).toEqual([]);
  });
});

describe('a raiada de um plano medida na malha (carroça)', () => {
  it('um raio por corpo, nenhuma face sem parte, o cubo à parte, o volume dos raios contra a fórmula e o pneu e o aro intactos', () => {
    const parametros = { perfil: 'carroca' };
    const { v, barras } = contaDosRaios(parametros);
    const { neutro } = rodar(parametros);
    expect(neutro.orfaos ?? []).toEqual([]);
    const { caixas, facesSemParte } = caixasPorParte(neutro);
    expect([...caixas.keys()]).toEqual(['aro', 'cubo', 'disco', 'pneu']);
    expect(facesSemParte).toEqual([]);
    expect(caixas.get('cubo').corpos).toBe(1);
    expect(caixas.get('disco').corpos).toBe(v.raios);
    expect(volumeDaParte(neutro, 'pneu')).toBeCloseTo(volumeDoPneu(v), 0);
    expect(volumeDaParte(neutro, 'aro')).toBeCloseTo(volumeDoAro(v), 0);
    const secao = areaRegular(LADOS_DO_RAIO, (v.diametroRaio * v.diametroPneu) / 2);
    const esperado = barras.reduce((soma, { corte }) => soma + secao * corte, 0);
    expect(Math.abs(volumeDaParte(neutro, 'disco') - esperado) / esperado).toBeLessThan(1e-5);
  });

  it('os nós dos raios ficam no plano do desvio, o do cubo na parede do cubo e o do aro na parede do aro, e o raio termina no barril', () => {
    const { v, barras } = contaDosRaios({ perfil: 'carroca', desvio: 0.5 });
    const D = v.diametroPneu;
    const { xb } = medidasDoPneu(v);
    const x = (0.5 * (2 * xb - v.diametroRaio * D)) / 2;
    const rb = (v.diametroFuroCentral * D) / 2;
    const rc = (v.diametroCubo * D) / 2;
    const rAro = (v.diametroAro * D) / 2 - (v.paredeDoAro * D) / 2;
    for (const { a, b } of barras) {
      expect(a[0] / MM).toBeCloseTo(x, 6);
      expect(b[0] / MM).toBeCloseTo(x, 6);
      expect(Math.hypot(a[1], a[2]) / MM).toBeCloseTo(0.75 * rc + 0.25 * rb, 6);
      expect(Math.hypot(b[1], b[2]) / MM).toBeCloseTo(rAro, 6);
    }
    const { neutro } = rodar({ perfil: 'carroca', desvio: 0.5 });
    const doRaio = verticesDaParte(neutro, 'disco');
    expect(Math.max(...doRaio.map(raioDe))).toBeLessThan((v.diametroAro * D) / 2);
    expect(Math.max(...doRaio.map(raioDe))).toBeGreaterThan(rAro);
  });

  it('o cruzamento junta os raios que se cruzam: c = 0 deixa um corpo por raio, c = 1 junta pares, c >= 2 junta todos', () => {
    const base = { perfil: 'carroca', raios: 16, diametroRaio: 0.02 };
    expect(estruturaDosRaios({ ...base, cruzamento: 0 }).componentes).toBe(16);
    expect(estruturaDosRaios({ ...base, cruzamento: 1 }).componentes).toBe(8);
    expect(estruturaDosRaios({ ...base, cruzamento: 2 }).componentes).toBe(1);
  });

  it('as barras têm o comprimento de corte da conta à mão e o peso do aço: barra maciça e tubo com parede', () => {
    for (const parametros of [{ perfil: 'carroca', raios: 8 }, { perfil: 'carroca', raios: 6, paredeDoRaio: 0.3, cruzamento: 1 }]) {
      const { v, barras } = contaDosRaios(parametros);
      const medidas = estruturaDosRaios(parametros, { densidade: DENSIDADE_DO_ACO });
      expect(medidas.barras).toHaveLength(v.raios);
      const d = v.diametroRaio * v.diametroPneu;
      for (const [k, barra] of medidas.barras.entries()) {
        expect(barra.comprimentoDeCorte / MM).toBeCloseTo(barras[k].corte, 5);
        expect(barra.perfil.parede).toBe(v.paredeDoRaio > 0 ? v.paredeDoRaio * d * MM : null);
        const R = d / 2;
        const area = Math.PI * (R * R - (v.paredeDoRaio > 0 ? (R - v.paredeDoRaio * d) ** 2 : 0));
        expect(barra.pesoPorMetro).toBeCloseTo(area * MM * MM * DENSIDADE_DO_ACO, 9);
      }
    }
  });
});

describe('a raiada de duas flanges medida na malha (bicicleta)', () => {
  const sem = { perfil: 'bicicleta', cruzamento: 0 };

  it('o cubo é um tubo com uma flange em cada ponta e os raios são um corpo cada, na parte disco', () => {
    const v = completo(sem);
    const { neutro } = rodar(sem);
    expect(neutro.orfaos ?? []).toEqual([]);
    const { caixas, facesSemParte } = caixasPorParte(neutro);
    expect(facesSemParte).toEqual([]);
    expect(caixas.get('disco').corpos).toBe(v.raios);
    expect(caixas.get('cubo').corpos).toBe(1);
    const D = v.diametroPneu;
    const cubo = verticesDaParte(neutro, 'cubo');
    expect(Math.max(...cubo.map(raioDe))).toBeCloseTo((v.diametroFlange * D) / 2, 6);
    expect(Math.max(...cubo.map(([x]) => x)) - Math.min(...cubo.map(([x]) => x))).toBeCloseTo(v.larguraCubo * D, 6);
    /* a flange é uma coroa de espessura `espessuraDisco` em cada ponta; o tubo entre elas tem o diâmetro do cubo */
    const xs = [...new Set(cubo.map(([x]) => Number(x.toFixed(6))))].sort((a, b) => a - b);
    const e = v.espessuraDisco * D;
    expect(xs[1] - xs[0]).toBeCloseTo(e, 5);
    expect(xs.at(-1) - xs.at(-2)).toBeCloseTo(e, 5);
    const doTubo = cubo.filter(([x]) => x > xs[1] + 1e-6 && x < xs.at(-2) - 1e-6);
    expect(doTubo.length).toBe(0);
    const noMiolo = cubo.filter(([x]) => Math.abs(x - xs[1]) < 1e-6 && raioDe([x, ...[0, 0]]) === 0);
    expect(noMiolo.length).toBeGreaterThan(0);
  });

  it('os raios saem alternados da flange de fora (índice par) e da de dentro (ímpar) e chegam ao plano do meio do aro', () => {
    const { v, barras } = contaDosRaios(sem);
    const D = v.diametroPneu;
    const e = v.espessuraDisco * D;
    const metade = (v.larguraCubo * D) / 2;
    for (const { k, a, b } of barras) {
      expect(a[0] / MM).toBeCloseTo(k % 2 === 0 ? metade - e / 2 : -metade + e / 2, 6);
      expect(b[0]).toBeCloseTo(0, 12);
      expect(Math.hypot(a[1], a[2]) / MM).toBeCloseTo(((v.diametroCubo + v.diametroFlange) * D) / 4, 6);
    }
    const noAro = new Set(barras.map(({ b }) => Number((Math.hypot(b[1], b[2]) / MM).toFixed(6))));
    expect(noAro.size).toBe(1);
  });

  it('o volume dos raios é o de n barras entre os nós, e a flange com os furos de fixação tem o volume da fórmula', () => {
    const { v, barras } = contaDosRaios(sem);
    const D = v.diametroPneu;
    const { neutro } = rodar(sem);
    const secao = areaRegular(LADOS_DO_RAIO, (v.diametroRaio * D) / 2);
    const esperado = barras.reduce((soma, { corte }) => soma + secao * corte, 0);
    expect(Math.abs(volumeDaParte(neutro, 'disco') - esperado) / esperado).toBeLessThan(1e-5);
    const rb = (v.diametroFuroCentral * D) / 2;
    const rc = (v.diametroCubo * D) / 2;
    const rf = (v.diametroFlange * D) / 2;
    const e = v.espessuraDisco * D;
    const l = v.larguraCubo * D;
    const perfil = [[rb, 0], [rf, 0], [rf, e], [rc, e], [rc, l - e], [rf, l - e], [rf, l], [rb, l]];
    const furos = v.furosDeFixacao * areaRegular(LADOS_DO_FURO, (v.diametroFuro * D) / 2) * 2 * e;
    expect(volumeDaParte(neutro, 'cubo')).toBeCloseTo(volumeDaRevolucao(perfil, LADOS_DA_RODA) - furos, 0);
  });

  it('com cruzamento 3 os raios das duas flanges se cruzam em planos diferentes e continuam 32 corpos, do tamanho da conta à mão', () => {
    expect(estruturaDosRaios({ perfil: 'bicicleta' }).componentes).toBe(32);
    const { barras } = contaDosRaios({ perfil: 'bicicleta' });
    const medidas = estruturaDosRaios({ perfil: 'bicicleta' });
    for (const [k, barra] of medidas.barras.entries()) expect(barra.comprimentoDeCorte / MM).toBeCloseTo(barras[k].corte, 5);
  });
});
describe('a escala: a mesma chamada em outro diâmetro é a mesma roda em outro tamanho', () => {
  /* a subtração das garras e dos furos decide as soldas dos vértices por uma tolerância, de modo que a contagem de vértices pode
     variar com o tamanho; o que se mede é a caixa e o volume de cada parte, que crescem com o diâmetro e o seu cubo */
  const medidasDe = (neutro) => Object.fromEntries(['pneu', 'aro', 'cubo', 'disco'].map((parte) => {
    const v = verticesDaParte(neutro, parte);
    return [parte, { caixa: [0, 1, 2].flatMap((i) => [Math.min(...v.map((p) => p[i])), Math.max(...v.map((p) => p[i]))]), volume: volumeDaParte(neutro, parte) }];
  }));
  for (const nome of NOMES_DOS_PERFIS) {
    it(`o perfil ${nome} na metade e a mais 10% do diâmetro tem a caixa na proporção e o volume na proporção do cubo, e o diâmetro externo é o pedido`, () => {
      const D = PERFIS[nome].parametros.diametroPneu;
      const referencia = rodar({ perfil: nome }).neutro;
      const base = medidasDe(referencia);
      for (const fator of [0.5, 1.1]) {
        const outro = rodar({ perfil: nome, diametroPneu: D * fator }).neutro;
        expect(outro.orfaos ?? []).toEqual([]);
        const medidas = medidasDe(outro);
        for (const parte of Object.keys(base)) {
          base[parte].caixa.forEach((valor, i) => expect(medidas[parte].caixa[i], `${parte} ${i}`).toBeCloseTo(valor * fator, 4));
          /* o chanfro do ombro não passa de 9 mm (a conferência da porta do assento), de modo que o pneu cresce um pouco menos que o cubo */
          expect(Math.abs(medidas[parte].volume / (base[parte].volume * fator ** 3) - 1), parte).toBeLessThan(parte === 'pneu' ? 0.02 : 0.002);
        }
        /* a soldagem dos vértices das subtrações move um vértice por nanômetros: 5 casas decimais de milímetro são 10 nm */
        expect(Math.max(...verticesDaParte(outro, 'pneu').map(raioDe))).toBeCloseTo((D * fator) / 2, 5);
      }
    });
  }

  it('a faixa vai de 50 a 2000 mm: a roda de 50 e a de 2000 saem sem passo perdido e com as três portas, e fora dela a chamada é recusada', () => {
    for (const diametroPneu of [50, 2000]) {
      const { neutro } = rodar({ perfil: 'carro', diametroPneu });
      expect(neutro.orfaos ?? []).toEqual([]);
      expect(portasPublicadas(neutro)).toHaveLength(3);
      expect(conferirPortasNaForma(neutro)).toEqual([]);
      expect(Math.max(...verticesDaParte(neutro, 'pneu').map(raioDe))).toBeCloseTo(diametroPneu / 2, 6);
    }
    expect(() => rodar({ diametroPneu: 49 })).toThrow(/parametros\.diametroPneu/);
    expect(() => rodar({ diametroPneu: 2001 })).toThrow(/parametros\.diametroPneu/);
  });
});

describe('as portas', () => {
  const FORMAS = [
    ['assento-do-pneu', 'anel', 'ocupa'],
    ['eixo', 'anel', 'recebe'],
    ['furos-de-fixacao', 'padraoFuros', 'recebe'],
  ];
  const casos = [
    ...['minimo', 'medio', 'maximo'].map((nome) => [`o ponto ${nome}`, ponto(nome)]),
    ...NOMES_DOS_PERFIS.map((nome) => [`o perfil ${nome}`, { perfil: nome }]),
    ['o carro em 50 mm', { perfil: 'carro', diametroPneu: 50 }],
    ['o trem em 2000 mm sem o cubo largo', { perfil: 'trem', diametroPneu: 2000, larguraCubo: 0.08 }],
  ];
  for (const [rotulo, parametros] of casos) {
    it(`${rotulo}: as três portas saem com a forma e o papel do contrato, e a malha confere o plano e o raio de cada uma`, () => {
      const { neutro } = rodar(parametros);
      expect(portasPublicadas(neutro).map(({ id, interface: i }) => [id, i.forma, i.papel])).toEqual(FORMAS);
      expect(conferirPortasNaForma(neutro)).toEqual([]);
    });
  }

  it('o assento é o anel do pneu na face de dentro (-x), do raio do assento ao raio externo, o eixo o anel do furo central e os furos o círculo pedido', () => {
    for (const nome of ['carro', 'trem', 'bicicleta']) {
      const v = completo({ perfil: nome });
      const D = v.diametroPneu;
      const portas = portasPublicadas(rodar({ perfil: nome }).neutro);
      const { xm } = medidasDoPneu(v);
      const assento = portas.find(({ id }) => id === 'assento-do-pneu').interface;
      expect(assento.eixo).toEqual([-1, 0, 0]);
      expect(assento.centro[0] / MM).toBeCloseTo(-xm, 9);
      expect(assento.raioInterno / MM).toBeCloseTo((v.diametroAro * D) / 2, 9);
      expect(assento.raioExterno / MM).toBeCloseTo(D / 2, 9);
      const eixo = portas.find(({ id }) => id === 'eixo').interface;
      const xFace = (v.desvio * (2 * medidasDoPneu(v).xb - (v.tipo === 0 ? v.espessuraDisco : v.tipo === 1 ? v.diametroRaio : 0) * D)) / 2 - (v.larguraCubo * D) / 2;
      expect(eixo.eixo).toEqual([-1, 0, 0]);
      expect(eixo.centro[0] / MM).toBeCloseTo(xFace, 9);
      expect(eixo.raioInterno / MM).toBeCloseTo((v.diametroFuroCentral * D) / 2, 9);
      expect(eixo.raioExterno / MM).toBeCloseTo(((v.tipo === 2 ? v.diametroFlange : v.diametroCubo) * D) / 2, 9);
      const furos = portas.find(({ id }) => id === 'furos-de-fixacao').interface;
      expect(furos.diametro / MM).toBeCloseTo(v.diametroFuro * D, 9);
      expect(furos.centros).toHaveLength(v.furosDeFixacao);
      for (const [x, y, z] of furos.centros) {
        expect(x / MM).toBeCloseTo(xFace, 9);
        expect(Math.hypot(y, z) / MM).toBeCloseTo((v.diametroCirculoFuros * D) / 2, 9);
      }
      expect(furos.plano.normal).toEqual([-1, 0, 0]);
    }
  });
});

describe('o contrato recusa combinação impossível', () => {
  const recusa = (parametros) => {
    try { rodar(parametros); } catch (erro) { return erro; }
    throw new Error('a chamada devia ser recusada');
  };
  const CASOS = {
    'friso-cabe-na-banda': { perfil: 'trem', larguraPneu: 0.05, larguraCubo: 0.1 },
    'cubo-dentro-da-tolerancia-do-esboco': { perfil: 'trem', larguraCubo: 0.3 },
    'cubo-cabe-no-aro': { perfil: 'carro', diametroAro: 0.35 },
    'flange-cabe-no-aro': { perfil: 'bicicleta', diametroAro: 0.5, diametroFlange: 0.4 },
    'furo-central-dentro-do-cubo': { perfil: 'carro', diametroCubo: 0.15, diametroFuroCentral: 0.14 },
    'flange-maior-que-o-cubo': { perfil: 'bicicleta', diametroCubo: 0.09 },
    'furos-dentro-do-cubo': { perfil: 'carro', diametroCirculoFuros: 0.25 },
    'furo-central-afastado-dos-furos': { perfil: 'carro', diametroFuroCentral: 0.16 },
    'furos-vizinhos-separados': { perfil: 'carro', furosDeFixacao: 12, diametroFuro: 0.04 },
    'chapa-cabe-no-aro': { perfil: 'carro', larguraPneu: 0.08, larguraAro: 0.4, espessuraDisco: 0.04 },
    'cubo-mais-longo-que-a-chapa': { perfil: 'carro', espessuraDisco: 0.045 },
    'flanges-cabem-no-cubo': { perfil: 'bicicleta', espessuraDisco: 0.01, larguraCubo: 0.02 },
    'raio-cabe-no-aro': { perfil: 'carroca', diametroRaio: 0.05, larguraAro: 0.8 },
    'raio-mais-fino-que-o-cubo': { perfil: 'carroca', larguraCubo: 0.03 },
    'raio-cabe-na-flange': { perfil: 'bicicleta', espessuraDisco: 0.004 },
    'raio-cabe-na-parede-da-flange': { perfil: 'bicicleta', diametroRaio: 0.03, espessuraDisco: 0.04, paredeDoAro: 0.04 },
    'raio-cabe-na-parede-do-cubo': { perfil: 'carroca', diametroCubo: 0.07, diametroCirculoFuros: 0.06, diametroFuro: 0.005 },
    'raios-cabem-no-cubo': { perfil: 'carroca', raios: 20 },
    'raios-cabem-nas-flanges': { perfil: 'bicicleta', diametroRaio: 0.012, espessuraDisco: 0.02 },
    'raio-minimo': { perfil: 'bicicleta', diametroPneu: 200 },
    'aro-segura-o-raio': { perfil: 'carroca', paredeDoAro: 0.02 },
    'cruzamento-com-numero-par': { perfil: 'carroca', raios: 11, cruzamento: 1 },
    'raios-pares-nas-duas-flanges': { perfil: 'bicicleta', raios: 31, cruzamento: 0 },
    'raio-sai-do-cubo-para-fora': { perfil: 'carroca', raios: 4, cruzamento: 1 },
    'raio-sai-da-flange-para-fora': { perfil: 'bicicleta', raios: 4, cruzamento: 1 },
    'sulcos-so-com-relevo': { perfil: 'trator', sulcos: 0 },
    'sulco-minimo': { perfil: 'trator', diametroPneu: 50, sulcos: 60, larguraDoSulco: 0.15 },
    'sulco-circular-minimo': { perfil: 'furgao-235-65-r16', diametroPneu: 50, sulcosCirculares: 8, larguraDoSulcoCircular: 0.1 },
    'sulcos-circulares-ao-menos-dois': { perfil: 'furgao-235-65-r16', sulcosCirculares: 1 },
    'sulco-circular-fundo': { perfil: 'furgao-235-65-r16', diametroPneu: 50, diametroAro: 0.93, profundidadeDoSulcoCircular: 0.05 },
    'ventilacao-so-com-tres': { perfil: 'furgao-235-65-r16', furosDeVentilacao: 2 },
    'ventilacao-furo-minimo': { perfil: 'furgao-235-65-r16', diametroPneu: 50, diametroFuroDeVentilacao: 0.01 },
    'ventilacao-fora-do-cubo': { perfil: 'furgao-235-65-r16', diametroCirculoDeVentilacao: 0.32 },
    'ventilacao-afastada-dos-furos-de-fixacao': { perfil: 'furgao-235-65-r16', diametroCirculoDeVentilacao: 0.3 },
    'ventilacao-dentro-da-borda': { perfil: 'furgao-235-65-r16', diametroCirculoDeVentilacao: 0.5 },
    'ventilacao-furos-vizinhos-separados': { perfil: 'furgao-235-65-r16', furosDeVentilacao: 12 },
    'ombro-cabe-na-banda': { perfil: 'empilhadeira-700-12', larguraPneu: 0.2 },
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
    expect(() => rodar({ diametroPneu: 3000 })).toThrow(/parametros\.diametroPneu/);
    expect(() => rodar({ furosDeFixacao: 13 })).toThrow(/parametros\.furosDeFixacao/);
    expect(() => rodar({ furosDeFixacao: 4.5 })).toThrow(/parametros\.furosDeFixacao/);
    expect(() => rodar({ banda: 4 })).toThrow(/parametros\.banda/);
    expect(() => rodar({ perfil: 'moto' })).toThrow(/parametros\.perfil.*bicicleta, carrinho-de-mao, carro, carroca, empilhadeira-700-12, furgao-235-65-r16, rodizio, trator, trem/);
  });
});

describe('os perfis: o nome e o diâmetro bastam, e o chamador sobrescreve só o que quiser', () => {
  it('a família declara os nove perfis, e cada um é uma chamada que ela aceita, com a composição que o objeto pede', () => {
    expect(Object.keys(PERFIS).sort()).toEqual(NOMES_DOS_PERFIS);
    const esperadas = {
      carro: 'roda-pneu.disco-lisa', bicicleta: 'roda-pneu.flanges-macico-32-lisa', 'carrinho-de-mao': 'roda-pneu.disco-lisa', rodizio: 'roda-pneu.disco-lisa',
      trator: 'roda-pneu.disco-sulcada', trem: 'roda-pneu.disco-lisa', carroca: 'roda-pneu.raiada-macico-12-lisa',
      'furgao-235-65-r16': 'roda-pneu.disco-lisa-circ-vent', 'empilhadeira-700-12': 'roda-pneu.disco-lisa-ombro-largo',
    };
    for (const nome of NOMES_DOS_PERFIS) {
      expect(chamar(RODA_PNEU, 'roda', { perfil: nome }).composicao).toBe(esperadas[nome]);
      expect(PERFIS[nome].descricao.length).toBeGreaterThan(20);
    }
  });

  it('o perfil sozinho é o perfil com o diâmetro dele, e o diâmetro escrito troca só o tamanho', () => {
    for (const nome of NOMES_DOS_PERFIS) {
      const D = PERFIS[nome].parametros.diametroPneu;
      expect(chamar(RODA_PNEU, 'roda', { perfil: nome })).toEqual(chamar(RODA_PNEU, 'roda', { perfil: nome, diametroPneu: D }));
      const maior = chamar(RODA_PNEU, 'roda', { perfil: nome, diametroPneu: D * 1.1 });
      expect(maior.composicao).toBe(chamar(RODA_PNEU, 'roda', { perfil: nome }).composicao);
      expect(maior.argumentos.raioDoFriso).toBeCloseTo(chamar(RODA_PNEU, 'roda', { perfil: nome }).argumentos.raioDoFriso * 1.1, 12);
    }
  });

  it('o que o chamador escreve vale mais que o perfil, e o que ele não escreve vem do perfil', () => {
    const v = completo({ perfil: 'carro', furosDeFixacao: 6, banda: 3, sulcos: 16 });
    expect(v).toMatchObject({ diametroPneu: 632, furosDeFixacao: 6, banda: 3, sulcos: 16, diametroAro: 0.642 });
    const { neutro } = rodar({ perfil: 'carro', furosDeFixacao: 6, banda: 3, sulcos: 16 });
    expect(portasPublicadas(neutro).find(({ id }) => id === 'furos-de-fixacao').interface.centros).toHaveLength(6);
    expect(neutro.orfaos ?? []).toEqual([]);
  });

  it('o perfil é um ponto da aprovação: os pontos dos perfis completam o perfil com o padrão', () => {
    const pontos = pontosDosPerfis(RODA_PNEU.contrato);
    expect(Object.keys(pontos).sort()).toEqual(NOMES_DOS_PERFIS);
    expect(pontos.trem).toEqual(completo({ perfil: 'trem' }));
  });
});

describe('a camada mecânica da aprovação', () => {
  it('cada perfil passa na medição da aprovação (malha fechada, portas, determinismo, corte positivo de cada barra)', () => {
    for (const nome of NOMES_DOS_PERFIS) {
      const parametros = completo({ perfil: nome });
      const resultado = medirPonto(RODA_PNEU, parametros, `perfil ${nome}`);
      expect(resultado.problemas, nome).toEqual([]);
      expect(resultado.estado).toBe('ok');
      if (parametros.tipo > 0) {
        const estrutura = resultado.medidas.find(({ ferramenta }) => ferramenta === 'estruturaDeBarras');
        expect(estrutura.cortes).toHaveLength(parametros.raios);
      }
    }
  }, 180_000);

  it('a aprovação mecânica passa nos três pontos, nos nove perfis, na varredura e na escala dos perfis', () => {
    const resultado = aprovarFamilia(RODA_PNEU, { gravar: false });
    expect(resultado.problemas).toEqual([]);
    expect(resultado.aprovada).toBe(true);
    expect(Object.keys(resultado.perfis).sort()).toEqual(NOMES_DOS_PERFIS);
    expect(Object.values(resultado.pontos).map(({ estado }) => estado)).toEqual(['ok', 'ok', 'ok']);
    expect(resultado.escalas.length).toBe(NOMES_DOS_PERFIS.length * 2);
    expect(Object.keys(pontosDaFamilia(RODA_PNEU.contrato))).toEqual(['minimo', 'medio', 'maximo']);
    /* o ponto máximo é a roda de duas flanges com relevo, e o mínimo e o médio cobrem o disco e os raios de um plano */
    expect(resultado.pontos.minimo.parametros).toMatchObject({ tipo: 0, banda: 0 });
    expect(resultado.pontos.medio.parametros).toMatchObject({ tipo: 1, banda: 2 });
    expect(resultado.pontos.maximo.parametros).toMatchObject({ tipo: 2, banda: 3 });
  }, 300_000);
});

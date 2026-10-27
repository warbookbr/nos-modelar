/* superficie-aerodinamica.test.js — a família `superficie-aerodinamica` medida na malha e nos argumentos que o `derivar` entrega.
   O perfil NACA (o bordo de fuga com a espessura pedida, o raio do nariz, o giro do nariz, o intradorso côncavo); o volume da
   deriva e da asa contra a integral da área da seção; a ponta levantada (a inclinação contínua, o fechamento numa corda, os 72 graus
   do teto, a tampa declarada, os cantos arredondados e a malha que não se atravessa); o
   comando (a fresta, o giro em torno do eixo da dobradiça, o curso sem tocar a parte fixa, o aileron diferencial); a hélice (as
   pás equiespaçadas, a raiz dentro do cubo, o cone de ogiva); as portas; cada restrição do contrato e os cinco perfis chamados só
   pelo nome. A camada mecânica da aprovação, que mede os três pontos, os perfis e a escala deles, roda uma vez no fim. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { caixasPorParte, portasPublicadas } from '../../../src/autoria/descrever-partes.js';
import { conferirPortasNaForma } from '../../../src/autoria/porta-confere-forma.js';
import { auditarParDeSolidos, prepararSolido } from '../../../src/autoria/contato-de-solidos.js';
import { aprovarFamilia, medirPonto, pontosDaFamilia, pontosDosPerfis } from '../../../tools/mecanifica/aprovacao-da-familia.mjs';
import { analisarTopologia } from '../../nucleo/topologia.js';
import { neutroCanonico } from '../../nucleo/entrada.js';
import { sha256Hex } from '../../nucleo/sha256.js';
import { FAMILIAS, ErroChamadaDeFamilia, chamar, criarRegistroDeFamilias } from '../index.js';
import { SUPERFICIE_AERODINAMICA as F } from './index.js';
import { derivar } from './derivar.js';
import {
  EXPOENTE_DAS_ESTACOES, GRAUS, LADOS_DA_SECAO, PONTOS_POR_FACE, contornoDoPerfil, linhaDeCurvatura, meiaEspessura, plantaDa, pontoDaSecao, quadrosDoLoft,
} from './geometria.js';
import { ANGULO_DO_LISO, LADOS_DO_CUBO, PONTOS_DA_OGIVA } from './composicoes.js';

const registro = criarRegistroDeFamilias({ familias: [F] });
const MM = 0.001;
const MATERIAIS = {
  aluminio: { cor: '#b9bec4', aspereza: 0.4, metalicidade: 0.8 },
  aco: { cor: '#7d8288', aspereza: 0.35, metalicidade: 0.85 },
};
const rodar = (parametros = {}) => executarReceita({
  get CHAMADAS_COMPOSICOES() { return [chamar(F, 'superficie', parametros)]; },
  PARAMS: {}, TOPO: {}, ALIASES: [], MATERIAIS,
}, registro);
const P = F.contrato.parametros;
const PERFIS = F.contrato.perfis;
const NOMES_DOS_PERFIS = ['asa', 'deriva', 'estabilizador', 'helice', 'pa-de-helice'];
const ponto = (nome) => Object.fromEntries(Object.entries(P).map(([chave, def]) => [chave, def[nome]]));
const hash = (neutro) => sha256Hex(JSON.stringify(neutroCanonico(neutro)));
const completo = (parametros = {}) => ({
  ...Object.fromEntries(Object.entries(P).map(([chave, def]) => [chave, def.padrao])),
  ...(parametros.perfil ? PERFIS[parametros.perfil].parametros : {}),
  ...Object.fromEntries(Object.entries(parametros).filter(([chave]) => chave !== 'perfil')),
});

/* os vértices de uma parte, em mm, com o id */
function verticesDaParte(neutro, nome) {
  const ids = new Set();
  for (const face of neutro.F.values()) if (face.parte === nome) for (const v of face.vs) ids.add(v);
  return [...ids].sort((a, b) => a - b).map((v) => ({ id: v, p: neutro.V.get(v).map((c) => c / MM) }));
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
/* as componentes conexas de uma parte (uma por pá), com os vértices de cada uma */
function corpos(neutro, nome) {
  const pai = new Map();
  const raiz = (v) => { while (pai.get(v) !== v) { pai.set(v, pai.get(pai.get(v))); v = pai.get(v); } return v; };
  for (const face of neutro.F.values()) {
    if (face.parte !== nome) continue;
    for (const v of face.vs) if (!pai.has(v)) pai.set(v, v);
    for (const v of face.vs.slice(1)) pai.set(raiz(v), raiz(face.vs[0]));
  }
  const grupos = new Map();
  for (const v of pai.keys()) { const r = raiz(v); grupos.set(r, [...(grupos.get(r) ?? []), neutro.V.get(v).map((c) => c / MM)]); }
  return [...grupos.values()];
}
const caixaDe = (pontos) => [0, 1, 2].map((e) => [Math.min(...pontos.map((p) => p[e])), Math.max(...pontos.map((p) => p[e]))]);
const solidoDa = (neutro, nome) => {
  const faces = new Map([...neutro.F].filter(([, f]) => f.parte === nome));
  const usados = new Set([...faces.values()].flatMap((f) => f.vs));
  return prepararSolido({ V: new Map([...neutro.V].filter(([id]) => usados.has(id))), F: faces }, null, nome);
};
const porta = (neutro, id) => portasPublicadas(neutro).find((p) => p.id === id).interface;
const recusa = (parametros) => {
  try { rodar(parametros); } catch (erro) { return erro; }
  throw new Error('a chamada devia ser recusada');
};
const norma3 = (v) => Math.hypot(...v);
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub3 = (a, b) => a.map((c, k) => c - b[k]);

/* a área normalizada do perfil (a corda 1): 2 vezes a integral da meia espessura, por Simpson em s com x = s ao quadrado */
function areaDoPerfil(espessura, bordoDeFuga) {
  const passos = 400;
  const f = (s) => 2 * meiaEspessura(s * s, espessura, bordoDeFuga) * 2 * s;
  let soma = f(0) + f(1);
  for (let k = 1; k < passos; k++) soma += (k % 2 ? 4 : 2) * f(k / passos);
  return soma / (3 * passos);
}
/* o volume de uma semi-superfície: a integral da área da seção (perpendicular ao caminho) pelo comprimento do caminho */
function volumeEsperado(v, semi) {
  const b = v.envergadura * MM;
  const planta = plantaDa({
    semi, cordaNaRaiz: v.cordaNaRaiz * b, cordaNaPonta: v.cordaNaPonta * b, abaulamentoDaCorda: v.abaulamentoDaCorda, espessuraNaRaiz: v.espessuraNaRaiz,
    espessuraNaPonta: v.espessuraNaPonta, incidenciaNaRaiz: v.incidenciaNaRaiz, torcao: v.torcao, enflechamento: v.enflechamento, diedro: v.diedro,
    pontaLevantada: v.pontaLevantada, extensaoDaPonta: v.extensaoDaPonta, bordoDeFuga: v.bordoDeFuga,
  });
  const passos = 2000;
  const integrando = (x) => {
    const h = 1e-6;
    const dy = (planta.y(Math.min(x + h, semi)) - planta.y(Math.max(x - h, 0))) / (Math.min(x + h, semi) - Math.max(x - h, 0));
    return areaDoPerfil(planta.espessura(x), v.bordoDeFuga) * planta.corda(x) ** 2 * Math.sqrt(1 + dy * dy);
  };
  let soma = integrando(0) + integrando(semi);
  for (let k = 1; k < passos; k++) soma += (k % 2 ? 4 : 2) * integrando((semi * k) / passos);
  return (soma * semi) / (3 * passos) / MM ** 3;
}

describe('a família superficie-aerodinamica no registro do produto', () => {
  it('está em FAMILIAS, declara as duas portas, as quatro ferramentas e os cinco perfis', () => {
    expect(FAMILIAS).toContain(F);
    expect(F.contrato.id).toBe('superficie-aerodinamica');
    expect(F.contrato.portas.map(({ id }) => id)).toEqual(['eixo-da-dobradica', 'raiz']);
    expect(F.contrato.ferramentas).toEqual(['aerofolio', 'articula', 'helice', 'repete']);
    expect(Object.keys(PERFIS).sort()).toEqual(NOMES_DOS_PERFIS);
    expect(Object.keys(F.contrato.perguntas).sort()).toEqual(['comando', 'cubo', 'fixa', 'pas']);
  });

  it('só a envergadura é medida absoluta: as outras são razões, graus ou contagens', () => {
    expect(Object.entries(P).filter(([, { unidade }]) => unidade === 'mm').map(([nome]) => nome)).toEqual(['envergadura']);
    expect(P.envergadura).toMatchObject({ unidade: 'mm', minimo: 200, maximo: 40000 });
  });

  it('o ponto máximo é a hélice de nove pás, o médio a superfície inteira com comando e o mínimo a semi-superfície sem comando', () => {
    expect(chamar(F, 'a', ponto('maximo')).composicao).toBe('superficie-aerodinamica.helice');
    expect(chamar(F, 'a', ponto('medio')).composicao).toBe('superficie-aerodinamica.inteira-com-comando');
    expect(chamar(F, 'a', ponto('minimo')).composicao).toBe('superficie-aerodinamica.semi');
  });
});

describe('o perfil NACA do contorno de cada seção', () => {
  const asa = { curvatura: 0.02, posicaoDaCurvatura: 0.4, espessura: 0.15, bordoDeFuga: 0.004 };
  const turnos = (pontos) => pontos.map((p, i) => {
    const a = pontos[(i + pontos.length - 1) % pontos.length];
    const b = pontos[(i + 1) % pontos.length];
    return Math.atan2((p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]), (p[0] - a[0]) * (b[0] - p[0]) + (p[1] - a[1]) * (b[1] - p[1])) / GRAUS;
  });
  const INDICE_DO_NARIZ = PONTOS_POR_FACE + 1;

  it('tem 2 n + 2 pontos, o primeiro no meio do bordo de fuga, e o bordo de fuga tem a espessura pedida, sem quina viva', () => {
    const pontos = contornoDoPerfil(asa);
    expect(pontos).toHaveLength(LADOS_DA_SECAO);
    expect(pontos[0]).toEqual([1, 0]);
    expect(pontos[1][1] - pontos.at(-1)[1]).toBeCloseTo(asa.bordoDeFuga, 12);
    expect(pontos[INDICE_DO_NARIZ]).toEqual([0, 0]);
    for (const bordoDeFuga of [0.002, 0.01, 0.02]) {
      const p = contornoDoPerfil({ ...asa, bordoDeFuga });
      expect(p[1][1] - p.at(-1)[1]).toBeCloseTo(bordoDeFuga, 12);
    }
  });

  it('a espessura máxima é a pedida (a menos do termo do bordo de fuga) e o nariz tem o raio da fórmula NACA, 1,1019 t ao quadrado', () => {
    for (const espessura of [0.06, 0.12, 0.25]) {
      const largura = Array.from({ length: 2001 }, (_, i) => 2 * meiaEspessura(i / 2000, espessura, 0.002));
      expect(Math.max(...largura)).toBeCloseTo(espessura, 2);
      const x = 1e-9;
      expect(meiaEspessura(x, espessura, 0) ** 2 / (2 * x)).toBeCloseTo(1.1019 * espessura * espessura, 3);
    }
  });

  it('o contorno gira menos de 20 graus no nariz e menos de 30 em qualquer ponto fora do bordo de fuga nos perfis do contrato, contra 42 e 60 no nariz da distribuição em cosseno pura', () => {
    expect(EXPOENTE_DAS_ESTACOES).toBeGreaterThan(1);
    for (const [nome, perfil] of Object.entries(PERFIS)) {
      const v = completo({ perfil: nome });
      for (const espessura of [v.espessuraNaRaiz, v.espessuraNaPonta]) {
        const giros = turnos(contornoDoPerfil({ curvatura: v.curvatura, posicaoDaCurvatura: v.posicaoDaCurvatura, espessura, bordoDeFuga: v.bordoDeFuga }));
        expect(Math.abs(giros[INDICE_DO_NARIZ]), `${nome} ${espessura}`).toBeLessThan(20);
        expect(Math.max(...giros.filter((_, i) => i > 1 && i < giros.length - 1).map(Math.abs)), `${nome} ${espessura}`).toBeLessThan(30);
      }
      expect(perfil.descricao.length).toBeGreaterThan(40);
    }
  });

  it('o intradorso é côncavo onde a curvatura pede (a pá de 4% de curvatura, a asa de 6%) e convexo no perfil simétrico e no quase plano da asa de 2%', () => {
    const intradorso = (perfil) => turnos(contornoDoPerfil(perfil)).slice(PONTOS_POR_FACE + 2, 2 * PONTOS_POR_FACE + 1);
    expect(Math.min(...intradorso({ ...asa, curvatura: 0.04, espessura: 0.06 }))).toBeLessThan(-1);
    expect(Math.min(...intradorso({ ...asa, curvatura: 0.06, espessura: 0.12 }))).toBeLessThan(-1);
    expect(Math.min(...intradorso({ ...asa, curvatura: 0.09 }))).toBeLessThan(Math.min(...intradorso({ ...asa, curvatura: 0.06 })));
    expect(Math.min(...intradorso(asa))).toBeGreaterThan(0);
    expect(Math.min(...intradorso({ ...asa, curvatura: 0 }))).toBeGreaterThan(0);
    expect(linhaDeCurvatura(0.4, 0.02, 0.4)).toBeCloseTo(0.02, 12);
    expect(linhaDeCurvatura(1, 0.02, 0.4)).toBeCloseTo(0, 12);
  });
});

describe('a deriva com leme medida na malha (perfil deriva)', () => {
  const v = completo({ perfil: 'deriva' });
  const { neutro } = rodar({ perfil: 'deriva' });
  const { caixas, facesSemParte } = caixasPorParte(neutro);

  it('tem a parte fixa e o leme, sem órfão nem face sem parte, e sobe em y a altura pedida, de 1.900 mm', () => {
    expect([...caixas.keys()]).toEqual(['comando', 'fixa']);
    expect(neutro.orfaos ?? []).toEqual([]);
    expect(facesSemParte).toEqual([]);
    const fixa = caixas.get('fixa');
    expect(fixa.min[1] / MM).toBeCloseTo(0, 6);
    expect(fixa.max[1] / MM).toBeCloseTo(1900, 6);
    expect(fixa.corpos).toBe(1);
    expect(caixas.get('comando').corpos).toBe(1);
  });

  it('a corda da base é a pedida e a espessura da base é a fração dela: a caixa em z e em x', () => {
    const base = verticesDaParte(neutro, 'fixa').filter(({ p }) => p[1] < 1);
    const [, , [zMin, zMax]] = [0, 1, 2].map((e) => [Math.min(...base.map(({ p }) => p[e])), Math.max(...base.map(({ p }) => p[e]))]);
    const corda = v.cordaNaRaiz * v.envergadura;
    expect(zMax - zMin).toBeCloseTo(corda, 0);
    const [xMin, xMax] = [Math.min(...base.map(({ p }) => p[0])), Math.max(...base.map(({ p }) => p[0]))];
    expect(xMax - xMin).toBeGreaterThan(0.95 * v.espessuraNaRaiz * corda);
    expect(xMax - xMin).toBeLessThan(1.05 * v.espessuraNaRaiz * corda);
  });

  it('o volume da fixa e do leme é a integral da área da seção ao longo da altura, menos a fresta', () => {
    const esperado = volumeEsperado(v, v.envergadura * MM);
    const medido = volumeDaParte(neutro, 'fixa') + volumeDaParte(neutro, 'comando');
    expect(medido / esperado).toBeGreaterThan(0.97);
    expect(medido / esperado).toBeLessThan(1.0);
  });

  it('o enflechamento desloca o topo para a cauda sem mudar o volume: a mesma deriva sem enflechamento tem o mesmo volume', () => {
    const reta = rodar({ perfil: 'deriva', enflechamento: 0 }).neutro;
    const soma = (n) => volumeDaParte(n, 'fixa') + volumeDaParte(n, 'comando');
    expect(soma(reta) / soma(neutro)).toBeCloseTo(1, 3);
    const zTopo = (n) => Math.max(...verticesDaParte(n, 'fixa').filter(({ p }) => p[1] > 1890).map(({ p }) => p[2]));
    const zTopoReto = zTopo(reta);
    expect(zTopo(neutro) - zTopoReto).toBeGreaterThan(1900 * Math.tan(19 * GRAUS) * 0.97);
  });
});

describe('a asa de avião leve medida na malha (perfil asa)', () => {
  const v = completo({ perfil: 'asa' });
  const { neutro } = rodar({ perfil: 'asa' });
  const { caixas, facesSemParte } = caixasPorParte(neutro);
  const semi = 6.4;

  it('é inteira, de 12.800 mm de ponta a ponta com no máximo 0,1% a mais (a espessura da seção inclinada da ponta), com a fixa e um aileron de cada lado', () => {
    expect([...caixas.keys()]).toEqual(['comando', 'comandoE', 'fixa']);
    expect(neutro.orfaos ?? []).toEqual([]);
    expect(facesSemParte).toEqual([]);
    const fixa = caixas.get('fixa');
    const envergadura = (fixa.max[0] - fixa.min[0]) / MM;
    expect(envergadura).toBeGreaterThanOrEqual(12800);
    expect(envergadura).toBeLessThan(12800 * 1.001);
    expect(fixa.centro[0]).toBeCloseTo(0, 9);
  });

  it('a corda da raiz e o aileron de 25% da corda, entre 62% e 90% da semi-envergadura, de cada lado', () => {
    const raiz = verticesDaParte(neutro, 'fixa').filter(({ p }) => Math.abs(p[0]) < 1);
    const [zMin, zMax] = [Math.min(...raiz.map(({ p }) => p[2])), Math.max(...raiz.map(({ p }) => p[2]))];
    expect(zMax - zMin).toBeCloseTo(v.cordaNaRaiz * v.envergadura, -1);
    const direito = caixas.get('comando');
    const esquerdo = caixas.get('comandoE');
    expect(direito.min[0] / MM).toBeGreaterThan(0.62 * 6400);
    expect(direito.min[0] / MM).toBeLessThan(0.62 * 6400 + 16);
    expect(direito.max[0] / MM).toBeLessThan(0.9 * 6400 + 1);
    expect(direito.max[0] / MM).toBeGreaterThan(0.9 * 6400 - 16);
    expect(esquerdo.min[0]).toBeCloseTo(-direito.max[0], 9);
    expect(esquerdo.max[0]).toBeCloseTo(-direito.min[0], 9);
    /* a malha da esquerda é a da direita espelhada, e os quadriláteros torcidos entre seções triangulam por outra diagonal */
    expect(volumeDaParte(neutro, 'comando') / volumeDaParte(neutro, 'comandoE')).toBeCloseTo(1, 2);
  });

  it('o volume de tudo é a integral da área da seção ao longo do caminho (com diedro e ponta levantada), duas vezes a semi-asa, menos a fresta', () => {
    const esperado = 2 * volumeEsperado(v, semi);
    const medido = ['fixa', 'comando', 'comandoE'].reduce((soma, nome) => soma + volumeDaParte(neutro, nome), 0);
    expect(medido / esperado).toBeGreaterThan(0.97);
    expect(medido / esperado).toBeLessThan(1.0);
  });

  it('a ponta levantada sai do diedro por uma curva suave e as seções acompanham: inclinação contínua, giro por seção de no máximo 9 graus', () => {
    const { argumentos } = chamar(F, 'a', { perfil: 'asa' });
    const posicoes = Object.keys(argumentos).filter((nome) => /^fPos\d+$/.test(nome)).sort((a, b) => Number(a.slice(4)) - Number(b.slice(4))).map((nome) => argumentos[nome]);
    const inclinacoes = posicoes.slice(1).map((q, i) => Math.atan2(q[1] - posicoes[i][1], q[0] - posicoes[i][0]) / GRAUS);
    const apos = inclinacoes.filter((_, i) => posicoes[i][0] >= 0 && posicoes[i + 1][0] > posicoes[i][0]);
    expect(apos.slice(0, 6).every((g) => Math.abs(g - 5) < 1e-6 || g === 0)).toBe(true);
    const giros = apos.slice(1).map((g, i) => g - apos[i]);
    expect(Math.max(...giros.map(Math.abs))).toBeLessThan(9);
    expect(Math.max(...apos)).toBeGreaterThan(5 + 40 * 0.9);
    expect(Math.max(...apos)).toBeLessThan(5 + 40 + 1e-3);
    /* a curva só cresce: a inclinação nunca volta */
    for (let i = 1; i < apos.length; i++) expect(apos[i]).toBeGreaterThanOrEqual(apos[i - 1] - 1e-2);
  });

  it('a ponta fecha numa corda por seções cada vez mais finas: a espessura relativa vezes o cosseno de 30, 55 e 75 graus, sem faceta', () => {
    const { argumentos } = chamar(F, 'a', { perfil: 'asa' });
    const secoes = Object.keys(argumentos).filter((nome) => /^fPos\d+$/.test(nome)).length;
    /* a espessura da seção na estação 8: a distância entre o ponto do extradorso e o do intradorso da mesma abscissa */
    const espessura = (i) => norma3(sub3(argumentos[`fS${i}P${PONTOS_POR_FACE + 1 - 8}`], argumentos[`fS${i}P${PONTOS_POR_FACE + 1 + 8}`]))
      / norma3(sub3(argumentos[`fS${i}P0`], argumentos[`fS${i}P${PONTOS_POR_FACE + 1}`]));
    const cheia = espessura(secoes - 5);
    [30, 55, 75].forEach((angulo, k) => expect(espessura(secoes - 4 + k) / cheia).toBeCloseTo(Math.cos(angulo * GRAUS), 2));
    expect(argumentos[`fS${secoes - 1}E0`]).toBeTypeOf('number');
    expect(argumentos[`fS${secoes - 1}P0`]).toBeUndefined();
  });

  it('a diedro e a ponta levantada sobem a asa: o ponto mais alto passa de 0,5 m sobre a raiz e sem a ponta levantada fica abaixo de 0,6 m', () => {
    const alto = (n) => caixasPorParte(n).caixas.get('fixa').max[1] / MM;
    expect(alto(neutro)).toBeGreaterThan(500);
    const sem = alto(rodar({ perfil: 'asa', pontaLevantada: 0 }).neutro);
    expect(sem).toBeLessThan(alto(neutro) - 100);
    expect(sem).toBeGreaterThan(Math.tan(5 * GRAUS) * 6000);
  });
});

/* ---------- a ponta muito levantada: a tampa declarada, os cantos arredondados e a malha que não se atravessa ---------- */

const CODIGOS_DE_MALHA_ABERTA = ['casca-aberta', 'aresta-nao-manifold', 'orientacao-incoerente'];
/* a malha fechada: nenhum achado de casca aberta, aresta com mais de duas faces ou orientação incoerente */
const malhaAberta = (neutro) => analisarTopologia({ vertices: neutro.V, faces: neutro.F }).achados.filter((a) => CODIGOS_DE_MALHA_ABERTA.includes(a.codigo));
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/* a interseção de dois triângulos que não dividem vértice: cada um contra o plano do outro, e os dois trechos da reta comum se sobrepondo */
function triangulosSeCortam(a, b, folga) {
  const normal = ([p, q, r]) => { const n = cross3(sub3(q, p), sub3(r, p)); const l = norma3(n); return [n.map((c) => c / l), l]; };
  const [na, la] = normal(a);
  const [nb, lb] = normal(b);
  if (la < 1e-18 || lb < 1e-18) return false;
  const da = a.map((p) => dot3(nb, sub3(p, b[0])));
  const db = b.map((p) => dot3(na, sub3(p, a[0])));
  if (da.every((d) => d > folga) || da.every((d) => d < -folga) || db.every((d) => d > folga) || db.every((d) => d < -folga)) return false;
  const reta = cross3(na, nb);
  if (norma3(reta) < 1e-9) return false;
  const eixo = [0, 1, 2].reduce((m, i) => (Math.abs(reta[i]) > Math.abs(reta[m]) ? i : m), 0);
  const trecho = (t, d) => {
    const cortes = [];
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      if ((d[i] > 0) !== (d[j] > 0) && d[i] !== d[j]) cortes.push(t[i][eixo] + (d[i] / (d[i] - d[j])) * (t[j][eixo] - t[i][eixo]));
    }
    return cortes.length < 2 ? null : [Math.min(...cortes), Math.max(...cortes)];
  };
  const [ta, tb] = [trecho(a, da), trecho(b, db)];
  return Boolean(ta && tb) && Math.min(ta[1], tb[1]) - Math.max(ta[0], tb[0]) > folga;
}

/** Quantos pares de triângulos da parte, sem vértice em comum, se cortam (a malha atravessa a si mesma). Para na `maximo`-ésima. */
function atravessamentos(neutro, nome, maximo = 1) {
  const triangulos = [];
  for (const face of neutro.F.values()) {
    if (face.parte !== nome) continue;
    for (let k = 1; k < face.vs.length - 1; k++) triangulos.push([face.vs[0], face.vs[k], face.vs[k + 1]]);
  }
  const pontos = triangulos.map((t) => t.map((id) => neutro.V.get(id)));
  const caixas = pontos.map((t) => [0, 1, 2].map((e) => [Math.min(...t.map((p) => p[e])), Math.max(...t.map((p) => p[e]))]));
  const folga = 1e-7;
  let achados = 0;
  for (let i = 0; i < triangulos.length && achados < maximo; i++) {
    for (let j = i + 1; j < triangulos.length && achados < maximo; j++) {
      if (caixas[i].some(([min, max], e) => max < caixas[j][e][0] - folga || caixas[j][e][1] < min - folga)) continue;
      if (triangulos[i].some((id) => triangulos[j].includes(id))) continue;
      if (triangulosSeCortam(pontos[i], pontos[j], folga)) achados += 1;
    }
  }
  return achados;
}
/* a mesma superfície, mas pelo `derivar`, sem a faixa nem as restrições do contrato: para medir o que o contrato recusa */
function rodarSemContrato(parametros) {
  const { composicao, argumentos } = derivar(completo(parametros));
  return executarReceita({ CHAMADAS_COMPOSICOES: [{ id: 'superficie', composicao, argumentos }], PARAMS: {}, TOPO: {}, ALIASES: [], MATERIAIS }, registro);
}

/* a ponta da asa do avião, como a receita das asas a faz à mão: 72 graus de ponta levantada sobre 5,93 de diedro, a tampa de 130 mm ao
   longo da tangente e os cantos de 170 mm no bordo de ataque e 120 mm no de fuga. A envergadura é o x da ponta, e a corda e a espessura
   são as da reta da asa ali. */
const E_DA_PONTA = 5622.668853851386;
const PONTA_DO_AVIAO = {
  perfil: 'asa', simetria: 0, comando: 0, comandoDiferencial: 0, enflechamento: 0.86, diedro: 5.93, torcao: 0, incidenciaNaRaiz: 0, espessuraNaRaiz: 0.15,
  extensaoDaPonta: 0.05, envergadura: E_DA_PONTA, cordaNaRaiz: 1762 / E_DA_PONTA, cordaNaPonta: 935.8971326820188 / E_DA_PONTA, espessuraNaPonta: 0.13011786119571644,
  pontaLevantada: 72, comprimentoDaTampa: 130 / E_DA_PONTA, raioDoCantoDeAtaque: 170 / E_DA_PONTA, raioDoCantoDeFuga: 120 / E_DA_PONTA,
};
/* as seções de uma chamada, em metro: posição, contorno ou corda */
function secoesDe(parametros) {
  const { argumentos: a } = chamar(F, 'ponta', parametros);
  const n = Object.keys(a).filter((nome) => /^fPos\d+$/.test(nome)).length;
  return Array.from({ length: n }, (_, i) => ({
    pos: a[`fPos${i}`],
    contorno: Array.isArray(a[`fS${i}P0`]) ? Array.from({ length: LADOS_DA_SECAO }, (__, k) => a[`fS${i}P${k}`]) : null,
    corda: Array.isArray(a[`fS${i}P0`]) ? null : [[a[`fS${i}E0`], a[`fS${i}E1`]], [a[`fS${i}E2`], a[`fS${i}E3`]]],
  }));
}
const extensaoEmU = (s) => { const us = (s.contorno ?? s.corda).map(([u]) => u); return [Math.min(...us), Math.max(...us)]; };

describe('a ponta levantada acima de 60 graus', () => {
  it('a faixa vai a 72 graus, e com o diedro máximo o caminho ainda fica abaixo de 90 graus, onde a tangente do caminho em X diverge', () => {
    expect(P.pontaLevantada.maximo).toBe(72);
    expect(P.diedro.maximo + P.pontaLevantada.maximo).toBeLessThan(90);
    expect(() => chamar(F, 'a', { perfil: 'asa', pontaLevantada: 72 })).not.toThrow();
    expect(recusa({ perfil: 'asa', pontaLevantada: 73 }).message).toMatch(/parametros\.pontaLevantada recebeu 73/);
  });

  it('a subida da curva cresce devagar até 84 graus de inclinação total e depressa depois, o que fixa o teto: a 78 graus ela é 7,5% da semi-asa do avião, a 88 graus 25%', () => {
    const subida = (total) => {
      const planta = plantaDa({
        semi: 5.656, cordaNaRaiz: 1.762, cordaNaPonta: 0.931, abaulamentoDaCorda: 0, espessuraNaRaiz: 0.15, espessuraNaPonta: 0.13, incidenciaNaRaiz: 0, torcao: 0,
        enflechamento: 0.86, diedro: 5.93, pontaLevantada: total - 5.93, extensaoDaPonta: 0.05, bordoDeFuga: 0,
      });
      return (planta.y(planta.xDoCorte) - planta.y(planta.xDaCurva) - (planta.xDoCorte - planta.xDaCurva) * Math.tan(5.93 * GRAUS)) / 5.656;
    };
    expect(subida(60)).toBeLessThan(0.035);
    expect(subida(78)).toBeCloseTo(0.075, 2);
    expect(subida(88)).toBeGreaterThan(3 * subida(78));
    expect(subida(88)).toBeLessThan(0.3);
  });

  it('a tampa automática, medida em X, se alonga no caminho pelo inverso do cosseno da inclinação: a 78 graus ela é cinco vezes a que o perfil pede', () => {
    const s = secoesDe({ ...PONTA_DO_AVIAO, comprimentoDaTampa: 0, raioDoCantoDeAtaque: 0, raioDoCantoDeFuga: 0 });
    const n = s.length;
    const noCaminho = Math.hypot(s[n - 1].pos[0] - s[n - 5].pos[0], s[n - 1].pos[1] - s[n - 5].pos[1]);
    const emX = s[n - 1].pos[0] - s[n - 5].pos[0];
    expect(noCaminho / emX).toBeCloseTo(1 / Math.cos((5.93 + 72) * GRAUS), 3);
    expect(noCaminho / emX).toBeGreaterThan(4.7);
  });

  it('com a tampa declarada, a tampa mede o comprimento pedido ao longo da tangente final, nas posições de seno de 30, 55, 75 e 90 graus, e a superfície termina em X = semi-envergadura', () => {
    const s = secoesDe(PONTA_DO_AVIAO);
    const n = s.length;
    expect(n).toBe(25);
    const fimDaCurva = s[n - 5].pos;
    const tangente = (5.93 + 72) * GRAUS;
    [30, 55, 75, 90].forEach((angulo, k) => {
      const p = s[n - 4 + k].pos;
      /* a última seção da curva fica 2 micrômetros aquém do fim dela, porque a bisseção que inverte a curva de quinto grau para antes de 1 */
      expect(Math.hypot(p[0] - fimDaCurva[0], p[1] - fimDaCurva[1])).toBeCloseTo(0.130 * Math.sin(angulo * GRAUS), 5);
      expect(Math.atan2(p[1] - fimDaCurva[1], p[0] - fimDaCurva[0])).toBeCloseTo(tangente, 6);
    });
    expect(s[n - 1].pos[0]).toBeCloseTo(E_DA_PONTA * MM, 9);
    expect(s[n - 1].corda).not.toBeNull();
  });

  it('a espessura das três seções da tampa declarada é a da seção cheia vezes o cosseno de 30, 55 e 75 graus, como na tampa automática', () => {
    const { argumentos } = chamar(F, 'ponta', { ...PONTA_DO_AVIAO, raioDoCantoDeAtaque: 0, raioDoCantoDeFuga: 0 });
    const secoes = Object.keys(argumentos).filter((nome) => /^fPos\d+$/.test(nome)).length;
    const espessura = (i) => norma3(sub3(argumentos[`fS${i}P${PONTOS_POR_FACE + 1 - 8}`], argumentos[`fS${i}P${PONTOS_POR_FACE + 1 + 8}`]))
      / norma3(sub3(argumentos[`fS${i}P0`], argumentos[`fS${i}P${PONTOS_POR_FACE + 1}`]));
    const cheia = espessura(secoes - 5);
    [30, 55, 75].forEach((angulo, k) => expect(espessura(secoes - 4 + k) / cheia).toBeCloseTo(Math.cos(angulo * GRAUS), 2));
  });

  it('a tampa declarada tem o piso da automática (0,4% da semi-envergadura), e a curva termina antes o que a tampa avança em X', () => {
    const s = secoesDe({ ...PONTA_DO_AVIAO, comprimentoDaTampa: 0.0005, raioDoCantoDeAtaque: 0, raioDoCantoDeFuga: 0 });
    const n = s.length;
    expect(Math.hypot(s[n - 1].pos[0] - s[n - 5].pos[0], s[n - 1].pos[1] - s[n - 5].pos[1])).toBeCloseTo(0.004 * E_DA_PONTA * MM, 5);
    const longa = secoesDe(PONTA_DO_AVIAO);
    expect(longa[longa.length - 5].pos[0]).toBeCloseTo((E_DA_PONTA - 130 * Math.cos((5.93 + 72) * GRAUS)) * MM, 5);
  });

  it('sem as opções declaradas a ponta é a de sempre: a tampa em X termina em X = semi-envergadura e nenhuma seção perde corda', () => {
    const padrao = secoesDe({ perfil: 'asa' });
    const zeradas = secoesDe({ perfil: 'asa', comprimentoDaTampa: 0, raioDoCantoDeAtaque: 0, raioDoCantoDeFuga: 0 });
    expect(JSON.stringify(zeradas)).toBe(JSON.stringify(padrao));
    expect(padrao[padrao.length - 1].pos[0]).toBeCloseTo(6.4, 9);
  });

  it('os cantos: cada seção a menos de um raio da ponta perde, em u, o quarto de círculo do raio de cada bordo, e as de antes ficam como estavam', () => {
    const com = secoesDe(PONTA_DO_AVIAO);
    const sem = secoesDe({ ...PONTA_DO_AVIAO, raioDoCantoDeAtaque: 0, raioDoCantoDeFuga: 0 });
    const semi = E_DA_PONTA * MM;
    const [rA, rF] = [0.170, 0.120];
    const recuo = (x, raio) => { const r = x - (semi - raio); return r <= 0 ? 0 : raio - Math.sqrt(Math.max(0, raio * raio - r * r)); };
    let aparadas = 0;
    com.forEach((s, i) => {
      const x = s.pos[0];
      const [minCom, maxCom] = extensaoEmU(s);
      const [minSem, maxSem] = extensaoEmU(sem[i]);
      expect(minCom - minSem, `seção ${i}, bordo de ataque`).toBeCloseTo(recuo(x, rA), 6);
      expect(maxSem - maxCom, `seção ${i}, bordo de fuga`).toBeCloseTo(recuo(x, rF), 6);
      if (recuo(x, rA) > 0 || recuo(x, rF) > 0) aparadas += 1; else expect(JSON.stringify(s)).toBe(JSON.stringify(sem[i]));
    });
    expect(aparadas).toBeGreaterThanOrEqual(8);
    const [minCom, maxCom] = extensaoEmU(com[com.length - 1]);
    const [minSem, maxSem] = extensaoEmU(sem[sem.length - 1]);
    expect(minCom - minSem).toBeCloseTo(rA, 7);
    expect(maxSem - maxCom).toBeCloseTo(rF, 7);
  });

  it('a espessura (w) das seções não muda com os cantos: só a corda se estreita', () => {
    const com = secoesDe(PONTA_DO_AVIAO);
    const sem = secoesDe({ ...PONTA_DO_AVIAO, raioDoCantoDeAtaque: 0, raioDoCantoDeFuga: 0 });
    com.forEach((s, i) => (s.contorno ?? s.corda).forEach(([, w], k) => expect(w).toBe((sem[i].contorno ?? sem[i].corda)[k][1])));
  });

  it('a ponta do avião a 72 graus com a tampa e os cantos é uma malha fechada, sem órfão e que não se atravessa, e sobe uns 9% da semi-envergadura acima do diedro', () => {
    const { neutro } = rodar(PONTA_DO_AVIAO);
    expect(neutro.orfaos ?? []).toEqual([]);
    expect(malhaAberta(neutro)).toEqual([]);
    expect(caixasPorParte(neutro).facesSemParte).toEqual([]);
    expect(atravessamentos(neutro, 'fixa')).toBe(0);
    const topo = caixasPorParte(neutro).caixas.get('fixa').max[1];
    const alturaDoDiedro = Math.tan(5.93 * GRAUS) * E_DA_PONTA * MM;
    expect((topo - alturaDoDiedro) / (E_DA_PONTA * MM)).toBeGreaterThan(0.08);
    expect((topo - alturaDoDiedro) / (E_DA_PONTA * MM)).toBeLessThan(0.10);
  });

  it('no teto da faixa o perfil asa (inteira, com aileron), com e sem a tampa e os cantos declarados, continua fechado e sem atravessar', () => {
    for (const parametros of [{ perfil: 'asa', pontaLevantada: 72 }, { perfil: 'asa', pontaLevantada: 72, comprimentoDaTampa: 0.02, raioDoCantoDeAtaque: 0.04, raioDoCantoDeFuga: 0.03 }]) {
      const { neutro } = rodar(parametros);
      expect(neutro.orfaos ?? [], JSON.stringify(parametros)).toEqual([]);
      expect(malhaAberta(neutro), JSON.stringify(parametros)).toEqual([]);
      expect(atravessamentos(neutro, 'fixa'), JSON.stringify(parametros)).toBe(0);
      expect(atravessamentos(neutro, 'comando'), JSON.stringify(parametros)).toBe(0);
    }
  });

  it('a restrição ponta-nao-dobra só deixa passar o que não se atravessa: amostras sorteadas de asas, aceitas, ficam fechadas e sem atravessar, e o que ela recusa e se atravessa de fato existe', () => {
    let semente = 20261015;
    const sorteio = () => { semente = (semente + 0x6D2B79F5) | 0; let t = Math.imul(semente ^ (semente >>> 15), 1 | semente); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const entre = (a, b) => a + (b - a) * sorteio();
    let aceitas = 0;
    let recusadasQueSeAtravessam = 0;
    for (let k = 0; k < 36; k += 1) {
      const raiz = entre(0.05, 0.3);
      const ponta = entre(0.02, raiz);
      const parametros = {
        perfil: 'asa', simetria: Math.round(sorteio()), comando: Math.round(sorteio()), cordaNaRaiz: raiz, cordaNaPonta: ponta, espessuraNaRaiz: entre(0.08, 0.2), espessuraNaPonta: entre(0.06, 0.3),
        curvatura: entre(0, 0.06), torcao: entre(-10, 5), incidenciaNaRaiz: entre(-2, 6), diedro: entre(-5, 10), enflechamento: entre(-10, 30),
        pontaLevantada: entre(20, 72), extensaoDaPonta: entre(0.02, 0.05), comprimentoDaTampa: sorteio() < 0.5 ? 0 : entre(0.004, 0.03),
      };
      const raio = sorteio() < 0.5 ? 0 : Math.min(parametros.extensaoDaPonta, 0.4 * ponta);
      parametros.raioDoCantoDeAtaque = raio;
      parametros.raioDoCantoDeFuga = raio / 2;
      let erro = null;
      try { rodar(parametros); } catch (e) { erro = e; }
      /* o encontro das duas metades na raiz de uma asa torcida e enflechada pode se atravessar sem ponta levantada nenhuma: essas amostras não medem a ponta */
      if (atravessamentos(rodarSemContrato({ ...parametros, pontaLevantada: 0, comprimentoDaTampa: 0, raioDoCantoDeAtaque: 0, raioDoCantoDeFuga: 0 }).neutro, 'fixa') > 0) continue;
      if (!erro) {
        const { neutro } = rodar(parametros);
        expect(malhaAberta(neutro), JSON.stringify(parametros)).toEqual([]);
        expect(atravessamentos(neutro, 'fixa'), JSON.stringify(parametros)).toBe(0);
        aceitas += 1;
      } else if (erro.restricao === 'ponta-nao-dobra' && atravessamentos(rodarSemContrato(parametros).neutro, 'fixa') > 0) recusadasQueSeAtravessam += 1;
    }
    expect(aceitas).toBeGreaterThanOrEqual(20);
    expect(recusadasQueSeAtravessam).toBeGreaterThanOrEqual(3);
  }, 120_000);

  it('uma ponta de 72 graus numa curva de 2% da semi-envergadura com a espessura de 20% se atravessa, e o contrato a recusa', () => {
    const parametros = { perfil: 'asa', pontaLevantada: 72, extensaoDaPonta: 0.02, espessuraNaPonta: 0.2 };
    expect(atravessamentos(rodarSemContrato(parametros).neutro, 'fixa')).toBeGreaterThan(0);
    expect(recusa(parametros).restricao).toBe('ponta-nao-dobra');
    expect(atravessamentos(rodarSemContrato({ ...parametros, pontaLevantada: 20 }).neutro, 'fixa')).toBe(0);
  });
});

/* a incidência de cada seção cheia e o giro do bordo de ataque entre seções vizinhas, medidos nos argumentos que o `derivar` entrega */
function secoesCheias(parametros) {
  const { argumentos: a } = chamar(F, 'x', parametros);
  const n = Object.keys(a).filter((nome) => /^fPos\d+$/.test(nome)).length;
  const posicoes = Array.from({ length: n }, (_, i) => a[`fPos${i}`]);
  const quadros = quadrosDoLoft(posicoes, a.orientacaoDoMundo);
  const cheias = [];
  for (let i = 0; i < n; i++) if (Array.isArray(a[`fS${i}P0`])) cheias.push(i);
  const contorno = (i) => Array.from({ length: LADOS_DA_SECAO }, (_, k) => a[`fS${i}P${k}`]);
  const area = (pontos) => pontos.reduce((t, p, k) => { const q = pontos[(k + 1) % pontos.length]; return t + (p[0] * q[1] - q[0] * p[1]) / 2; }, 0);
  const incidencia = (i) => {
    const bordoDeFuga = a[`fS${i}P0`]; const bordoDeAtaque = a[`fS${i}P${PONTOS_POR_FACE + 1}`];
    return Math.atan2(bordoDeAtaque[1] - bordoDeFuga[1], -(bordoDeAtaque[0] - bordoDeFuga[0])) / GRAUS;
  };
  const bordo = (k) => cheias.map((i) => pontoDaSecao(posicoes[i], quadros[i], a[`fS${i}P${k}`].slice(0, 2)));
  const giros = (pts) => pts.slice(1, -1).map((p, i) => {
    const d1 = p.map((c, m) => c - pts[i][m]); const d2 = pts[i + 2].map((c, m) => c - p[m]);
    return (Math.acos(Math.max(-1, Math.min(1, dot3(d1, d2) / (norma3(d1) * norma3(d2))))) / GRAUS);
  });
  return { cheias, area: (i) => area(contorno(i)), incidencia, giroDoBordoDeAtaque: giros(bordo(PONTOS_POR_FACE + 1)) };
}

describe('a incidência e o bordo de ataque entre as seções', () => {
  it('a incidência é a da raiz mais a torção vezes a fração da envergadura, com o sinal da torção, e a seção não vira acima de 90 graus', () => {
    const casos = [[70, 60], [70, -60], [-10, -60], [-10, 60], [0, 45]];
    for (const [incidenciaNaRaiz, torcao] of casos) {
      const parametros = { perfil: 'pa-de-helice', incidenciaNaRaiz, torcao };
      const { cheias, incidencia, area } = secoesCheias(parametros);
      const v = completo(parametros);
      const semi = v.envergadura * MM;
      expect(incidencia(cheias[0]), `${incidenciaNaRaiz} ${torcao}`).toBeCloseTo(incidenciaNaRaiz, 0);
      const tampa = Math.min(Math.max(0.5 * v.espessuraNaPonta * v.cordaNaPonta * semi, 0.004 * semi), 0.03 * semi);
      expect(incidencia(cheias.at(-4)), `${incidenciaNaRaiz} ${torcao}`).toBeCloseTo(incidenciaNaRaiz + torcao * (1 - tampa / semi), 0);
      for (const i of cheias) expect(area(i), `seção ${i} de ${incidenciaNaRaiz} ${torcao}`).toBeGreaterThan(0);
    }
  });

  it('no ponto máximo (incidência 70, torção +60) a incidência passa de 70 a 128 graus, a convenção de todos os pontos: a torção positiva soma', () => {
    const { cheias, incidencia, area } = secoesCheias(ponto('maximo'));
    expect(ponto('maximo')).toMatchObject({ incidenciaNaRaiz: 70, torcao: 60 });
    expect(incidencia(cheias[0])).toBeCloseTo(70, 0);
    /* a última seção cheia, antes da tampa, está onde a curva termina: a tampa do ponto máximo mede 3% da semi-envergadura de 14 m ao longo da
       tangente de 87 graus (15 de diedro e 72 de ponta) e avança em X só o cosseno disso, 22 mm, e a seção fica a 99,8% da envergadura: 70 + 60 x 0,998 */
    expect(incidencia(cheias.at(-4))).toBeCloseTo(70 + 60 * (1 - (0.03 * Math.cos(87 * GRAUS) * 14) / 14), 0);
    for (let k = 1; k < cheias.length - 3; k++) expect(incidencia(cheias[k])).toBeGreaterThanOrEqual(incidencia(cheias[k - 1]) - 0.1);
    for (const i of cheias) expect(area(i)).toBeGreaterThan(0);
    /* e a pá do avião, com torção negativa, vai de 52 a 18 graus: a torção negativa subtrai */
    const pa = secoesCheias({ perfil: 'pa-de-helice' });
    expect(pa.incidencia(pa.cheias.at(-4))).toBeLessThan(pa.incidencia(pa.cheias[0]));
  });

  it('o bordo de ataque gira pouco entre seções vizinhas: 3 graus na pá, 9 na asa e 13 na asa de ponta de 60 graus; no ponto máximo (87 graus de inclinação total), 11 no trecho reto e 13 na curva', () => {
    expect(Math.max(...secoesCheias({ perfil: 'pa-de-helice' }).giroDoBordoDeAtaque)).toBeLessThan(3.2);
    expect(Math.max(...secoesCheias({ perfil: 'helice' }).giroDoBordoDeAtaque)).toBeLessThan(3.2);
    expect(Math.max(...secoesCheias({ perfil: 'asa' }).giroDoBordoDeAtaque.slice(1, -2))).toBeLessThan(9);
    expect(Math.max(...secoesCheias({ perfil: 'asa', pontaLevantada: 60 }).giroDoBordoDeAtaque.slice(1, -2))).toBeLessThan(13);
    const { giroDoBordoDeAtaque: g } = secoesCheias(ponto('maximo'));
    /* a raiz (o degrau do diedro dentro do cubo), o começo da curva (a corda de 3 m contra uma curva de 0,7 m) e a tampa são as exceções medidas;
       com os 72 graus de ponta do teto (eram 60, e 10, 11 e 38 graus neste ponto) o começo da curva chega a 42 graus e o resto sobe um pouco */
    expect(Math.max(...g.slice(1, 7))).toBeLessThan(11);
    expect(Math.max(...g.slice(10, 17))).toBeLessThan(13);
    expect(Math.max(...g.slice(7, 10))).toBeLessThan(43);
  });
});

describe('o sombreamento liso e a ogiva do cone', () => {
  it('a pele das superfícies e da hélice vem marcada lisa pelo ângulo limite, e o cone tem uma ogiva de 14 pontos de perfil', () => {
    const { neutro } = rodar({ perfil: 'helice' });
    for (const parte of ['pas', 'cone', 'cubo']) {
      const faces = [...neutro.F.values()].filter((f) => f.parte === parte);
      expect(faces.length, parte).toBeGreaterThan(0);
      expect(faces.every((f) => f.liso === ANGULO_DO_LISO), parte).toBe(true);
    }
    const asa = rodar({ perfil: 'asa' }).neutro;
    expect([...asa.F.values()].every((f) => f.liso === ANGULO_DO_LISO)).toBe(true);
    expect(PONTOS_DA_OGIVA).toBe(14);
    const raios = new Set(verticesDaParte(neutro, 'cone').map(({ p }) => Math.round(Math.hypot(p[0], p[1]) * 1e3)));
    expect(raios.size).toBeGreaterThanOrEqual(PONTOS_DA_OGIVA);
  });
});

describe('o comando: fresta, eixo da dobradiça e curso', () => {
  const base = { perfil: 'estabilizador' };
  const deflexionado = (graus, extra = {}) => rodar({ ...base, deflexao: graus, ...extra }).neutro;
  const neutro0 = deflexionado(0);

  it('a fresta é a pedida: nenhum vértice do comando fica a menos que ela de um da parte fixa', () => {
    const v = completo(base);
    const semi = (v.envergadura * MM) / 2;
    const corda = (x) => (v.cordaNaRaiz + (v.cordaNaPonta - v.cordaNaRaiz) * (x / semi)) * v.envergadura * MM;
    const fresta = Math.min(v.fresta * corda(((v.inicioDoComando + v.fimDoComando) / 2) * semi), 0.1 * (v.fimDoComando - v.inicioDoComando) * semi) / MM;
    const fixa = verticesDaParte(neutro0, 'fixa');
    let menor = Infinity;
    for (const { p } of verticesDaParte(neutro0, 'comando')) for (const q of fixa) menor = Math.min(menor, norma3(sub3(p, q.p)));
    expect(menor).toBeGreaterThanOrEqual(fresta * 0.99);
    expect(menor).toBeLessThan(fresta * 2);
  });

  it('o giro é em torno do eixo da dobradiça publicado: cada vértice mantém a distância ao eixo e o bordo de fuga gira o ângulo pedido, para baixo se positivo', () => {
    const { eixo, centro } = porta(neutro0, 'eixo-da-dobradica');
    const perpendicular = (p) => { const r = sub3(p, centro); const t = dot3(r, eixo); return r.map((c, k) => c - t * eixo[k]); };
    for (const graus of [25, -35]) {
      const girado = deflexionado(graus);
      const antes = new Map(verticesDaParte(neutro0, 'comando').map(({ id, p }) => [id, p.map((c) => c * MM)]));
      let maior = null;
      for (const { id, p } of verticesDaParte(girado, 'comando')) {
        const depois = p.map((c) => c * MM);
        expect(norma3(perpendicular(depois))).toBeCloseTo(norma3(perpendicular(antes.get(id))), 9);
        if (!maior || norma3(perpendicular(antes.get(id))) > maior.r) maior = { id, r: norma3(perpendicular(antes.get(id))), antes: antes.get(id), depois };
      }
      const a = perpendicular(maior.antes);
      const b = perpendicular(maior.depois);
      expect(Math.acos(dot3(a, b) / (norma3(a) * norma3(b))) / GRAUS).toBeCloseTo(Math.abs(graus), 6);
      expect(Math.sign(maior.depois[1] - maior.antes[1])).toBe(-Math.sign(graus));
    }
  });

  it('o comando gira rígido: o volume dele e a parte fixa não mudam com a deflexão', () => {
    const girado = deflexionado(30);
    expect(Math.abs(volumeDaParte(girado, 'comando') / volumeDaParte(neutro0, 'comando') - 1)).toBeLessThan(1e-12);
    expect(volumeDaParte(girado, 'fixa')).toBe(volumeDaParte(neutro0, 'fixa'));
    expect(hash(girado)).not.toBe(hash(neutro0));
  });

  it('o aileron é diferencial (um sobe, o outro desce) e o profundor desce dos dois lados', () => {
    const topo = (n, parte) => caixasPorParte(n).caixas.get(parte);
    const aileron = rodar({ perfil: 'asa', deflexao: 20 }).neutro;
    const zero = rodar({ perfil: 'asa', deflexao: 0 }).neutro;
    expect(topo(aileron, 'comando').min[1]).toBeLessThan(topo(zero, 'comando').min[1] - 1e-3);
    expect(topo(aileron, 'comandoE').max[1]).toBeGreaterThan(topo(zero, 'comandoE').max[1] + 1e-3);
    const profundor = deflexionado(20);
    expect(topo(profundor, 'comando').min[1]).toBeLessThan(topo(neutro0, 'comando').min[1] - 1e-3);
    expect(topo(profundor, 'comandoE').min[1]).toBeLessThan(topo(neutro0, 'comandoE').min[1] - 1e-3);
  });

  it('o leme positivo vai para +x e o curso de -35 a 35 graus não toca a parte fixa nem no estabilizador nem na deriva', () => {
    const leme = rodar({ perfil: 'deriva', deflexao: 35 }).neutro;
    expect(caixasPorParte(leme).caixas.get('comando').max[0]).toBeGreaterThan(caixasPorParte(rodar({ perfil: 'deriva' }).neutro).caixas.get('comando').max[0] + 0.1);
    for (const [perfil, graus] of [['deriva', 35], ['deriva', -35], ['estabilizador', 35], ['estabilizador', -35]]) {
      const n = rodar({ perfil, deflexao: graus }).neutro;
      const fixa = solidoDa(n, 'fixa');
      for (const parte of ['comando', 'comandoE'].filter((nome) => caixasPorParte(n).caixas.has(nome))) {
        const s = solidoDa(n, parte);
        expect(fixa.fechada && s.fechada, `${perfil} ${parte}`).toBe(true);
        expect(auditarParDeSolidos(fixa, s, 1e-9).estado, `${perfil} ${graus} ${parte}`).toBe('separadas');
      }
    }
  });

  it('o bordo de fuga da deriva segue uma linha só: a fixa abaixo do leme, o leme e a fixa acima dele ficam na mesma reta em z, a menos de 0,05 mm', () => {
    const n = rodar({ perfil: 'deriva' }).neutro;
    /* o z mais atrás de uma parte no plano y = const, em mm */
    const zDeFuga = (parte, y) => {
      let maior = -Infinity;
      for (const f of n.F.values()) {
        if (f.parte !== parte) continue;
        for (let k = 1; k < f.vs.length - 1; k++) {
          const tri = [n.V.get(f.vs[0]), n.V.get(f.vs[k]), n.V.get(f.vs[k + 1])];
          for (let i = 0; i < 3; i++) {
            const a = tri[i]; const b = tri[(i + 1) % 3];
            if ((a[1] - y) * (b[1] - y) < 0) maior = Math.max(maior, a[2] + ((y - a[1]) / (b[1] - a[1])) * (b[2] - a[2]));
          }
        }
      }
      return maior / MM;
    };
    const abaixo = [0.1, 0.3].map((y) => [y, zDeFuga('fixa', y)]);
    const inclinacao = (abaixo[1][1] - abaixo[0][1]) / (abaixo[1][0] - abaixo[0][0]);
    const reta = (y) => abaixo[0][1] + inclinacao * (y - abaixo[0][0]);
    /* a altura do leme vai de 20% a 90% da envergadura (1.900 mm), e a fresta é de 10,6 mm em cada ponta */
    for (const [parte, y] of [['fixa', 0.379], ['comando', 0.4], ['comando', 1.0], ['comando', 1.69], ['fixa', 1.711], ['fixa', 1.8]]) {
      expect(Math.abs(zDeFuga(parte, y) - reta(y)), `${parte} em y = ${y}`).toBeLessThan(0.05);
    }
  });

  it('com comando 0 a superfície é uma parte só e a porta do eixo marca onde a dobradiça ficaria', () => {
    const { neutro } = rodar({ perfil: 'estabilizador', comando: 0 });
    expect([...caixasPorParte(neutro).caixas.keys()]).toEqual(['fixa']);
    expect(portasPublicadas(neutro).map(({ id }) => id)).toEqual(['eixo-da-dobradica', 'raiz']);
    expect(conferirPortasNaForma(neutro)).toEqual([]);
  });
});

describe('a pá de hélice e a hélice de cinco pás', () => {
  const v = completo({ perfil: 'helice' });
  const { neutro } = rodar({ perfil: 'helice' });
  const { caixas, facesSemParte } = caixasPorParte(neutro);

  it('a pá sozinha tem a torção da raiz à ponta: 52 graus na raiz e 18 na ponta, medida nas seções', () => {
    const { argumentos } = chamar(F, 'a', { perfil: 'pa-de-helice' });
    const secoes = Object.keys(argumentos).filter((nome) => /^fPos\d+$/.test(nome)).length;
    const incidencia = (i) => {
      const bordoDeFuga = argumentos[`fS${i}P0`];
      const bordoDeAtaque = argumentos[`fS${i}P${PONTOS_POR_FACE + 1}`];
      return Math.atan2(bordoDeAtaque[1] - bordoDeFuga[1], -(bordoDeAtaque[0] - bordoDeFuga[0])) / GRAUS;
    };
    expect(incidencia(1)).toBeCloseTo(52, 0);
    expect(incidencia(secoes - 5)).toBeCloseTo(18, 0);
    const meio = incidencia(Math.floor(secoes / 2));
    expect(meio).toBeLessThan(52);
    expect(meio).toBeGreaterThan(18);
    const { neutro: pa } = rodar({ perfil: 'pa-de-helice' });
    const { caixas: c } = caixasPorParte(pa);
    expect([...c.keys()]).toEqual(['fixa']);
    expect(c.get('fixa').max[1] / MM).toBeCloseTo(800, 6);
  });

  it('tem o cubo, o cone e cinco pás, uma por corpo, sem face sem parte', () => {
    expect([...caixas.keys()]).toEqual(['cone', 'cubo', 'pas']);
    expect(caixas.get('pas').corpos).toBe(5);
    expect(caixas.get('cubo').corpos).toBe(1);
    expect(caixas.get('cone').corpos).toBe(1);
    expect(neutro.orfaos ?? []).toEqual([]);
    expect(facesSemParte).toEqual([]);
  });

  it('as pás estão igualmente espaçadas, de 72 graus, e são o mesmo corpo girado: mesmo volume', () => {
    const angulos = corpos(neutro, 'pas').map((vs) => {
      const c = [0, 1].map((e) => vs.reduce((s, p) => s + p[e], 0) / vs.length);
      return Math.atan2(c[1], c[0]) / GRAUS;
    }).sort((a, b) => a - b);
    const passos = angulos.map((a, i) => (i ? a - angulos[i - 1] : angulos[0] + 360 - angulos.at(-1)));
    for (const passo of passos) expect(passo).toBeCloseTo(72, 6);
    const raios = corpos(neutro, 'pas').map((vs) => Math.max(...vs.map(([x, y]) => Math.hypot(x, y))));
    expect(raios).toHaveLength(5);
    for (const r of raios) expect(r).toBeCloseTo(raios[0], 9);
    expect(new Set(corpos(neutro, 'pas').map((vs) => vs.length)).size).toBe(1);
  });

  it('a ponta de cada pá chega ao raio, de 1.000 mm, e a raiz entra no cubo sem sair do outro lado', () => {
    const vs = verticesDaParte(neutro, 'pas').map(({ p }) => p);
    expect(Math.max(...vs.map(([x, y]) => Math.hypot(x, y)))).toBeCloseTo(1000, 0);
    const raioDoCubo = (v.cubo * v.envergadura) / 2;
    expect(raioDoCubo).toBe(200);
    expect(Math.min(...vs.map(([x, y]) => Math.hypot(x, y)))).toBeLessThan(raioDoCubo);
    const comprimentoDoCubo = v.comprimentoDoCubo * v.envergadura;
    const dentro = vs.filter(([x, y]) => Math.hypot(x, y) < raioDoCubo);
    expect(dentro.length).toBeGreaterThan(0);
    for (const p of dentro) expect(Math.abs(p[2])).toBeLessThan(comprimentoDoCubo / 2);
  });

  it('o cubo é um tambor de 400 mm por 240 mm e o cone é uma ogiva de 480 mm que continua o diâmetro do cubo, concêntrica com o eixo', () => {
    const cubo = caixas.get('cubo');
    expect(cubo.dimensoes.map((d) => d / MM)).toEqual([expect.closeTo(400, 6), expect.closeTo(400, 6), expect.closeTo(240, 6)]);
    expect(cubo.centro.map((c) => c / MM)).toEqual([expect.closeTo(0, 6), expect.closeTo(0, 6), expect.closeTo(0, 6)]);
    const cone = caixas.get('cone');
    expect(cone.dimensoes[2] / MM).toBeCloseTo(480, 6);
    expect(cone.max[2] / MM).toBeCloseTo(-120, 6);
    expect(cone.min[2] / MM).toBeCloseTo(-600, 6);
    expect(cone.dimensoes[0] / MM).toBeCloseTo(400, 6);
    expect(volumeDaParte(neutro, 'cubo')).toBeCloseTo(0.5 * LADOS_DO_CUBO * 0.2 * 0.2 * Math.sin((2 * Math.PI) / LADOS_DO_CUBO) * 0.24 / MM ** 3, 3);
    const verticesDoCone = verticesDaParte(neutro, 'cone').map(({ p }) => p);
    const doBordoDoCubo = verticesDoCone.filter((p) => Math.abs(p[2] + 120) < 1e-6);
    const doCubo = verticesDaParte(neutro, 'cubo').map(({ p }) => p).filter((p) => Math.abs(p[2] + 120) < 1e-6);
    expect(Math.max(...doBordoDoCubo.map(([x, y]) => Math.hypot(x, y)))).toBeCloseTo(Math.max(...doCubo.map(([x, y]) => Math.hypot(x, y))), 9);
  });

  it('de 2 a 9 pás, o espaçamento é 360 por n; o contrato recusa uma pá só; os parâmetros de superfície não valem na hélice', () => {
    for (const pas of [2, 3, 9]) expect(caixasPorParte(rodar({ perfil: 'helice', pas, cordaDaPaNaRaiz: 0.03 }).neutro).caixas.get('pas').corpos).toBe(pas);
    expect(hash(rodar({ perfil: 'helice', comando: 1, simetria: 1, orientacao: 0, deflexao: 20, cordaNaRaiz: 0.3, cordaNaPonta: 0.2 }).neutro)).toBe(hash(neutro));
    expect(recusa({ perfil: 'helice', pas: 1 }).restricao).toBe('pas-ou-nenhuma');
  });

  it('as portas são o plano traseiro do cubo e o eixo de giro, ao longo de z', () => {
    const raiz = porta(neutro, 'raiz');
    expect(raiz.normal).toEqual([0, 0, 1]);
    expect(raiz.ponto[2] / MM).toBeCloseTo(120, 6);
    const eixo = porta(neutro, 'eixo-da-dobradica');
    expect(eixo.eixo).toEqual([0, 0, 1]);
    expect(eixo.raio / MM).toBeCloseTo(200, 6);
    expect(conferirPortasNaForma(neutro)).toEqual([]);
  });
});

describe('a solidez da hélice: nenhuma combinação das faixas faz as pás se tocarem nem a raiz sair do cubo', () => {
  /* os corpos de uma parte como peças soltas, para auditar as pás duas a duas */
  function pecasDaParte(neutro, nome) {
    const pai = new Map();
    const raiz = (v) => { while (pai.get(v) !== v) { pai.set(v, pai.get(pai.get(v))); v = pai.get(v); } return v; };
    const faces = [...neutro.F.values()].filter((f) => f.parte === nome);
    for (const f of faces) { for (const v of f.vs) if (!pai.has(v)) pai.set(v, v); for (const v of f.vs.slice(1)) pai.set(raiz(v), raiz(f.vs[0])); }
    const grupos = new Map();
    for (const f of faces) { const r = raiz(f.vs[0]); grupos.set(r, [...(grupos.get(r) ?? []), f]); }
    return [...grupos.values()].map((fs) => ({ V: new Map([...new Set(fs.flatMap((f) => f.vs))].map((v) => [v, neutro.V.get(v)])), F: new Map(fs.map((f) => [f.id, f])) }));
  }
  const centroAngular = (peca) => { const vs = [...peca.V.values()]; return Math.atan2(vs.reduce((t, q) => t + q[1], 0), vs.reduce((t, q) => t + q[0], 0)); };
  /* as pás vizinhas separadas, e a raiz dentro do raio do cubo entre as duas faces dele (o cone e o fundo) */
  function pasSeparadas(neutro, v) {
    const pecas = pecasDaParte(neutro, 'pas');
    expect(pecas).toHaveLength(v.pas);
    const ordem = pecas.map((_, i) => i).sort((a, b) => centroAngular(pecas[a]) - centroAngular(pecas[b]));
    const solidos = pecas.map((peca, i) => prepararSolido(peca, null, `pa${i}`));
    for (const s of solidos) expect(s.fechada).toBe(true);
    const estados = ordem.map((_, i) => auditarParDeSolidos(solidos[ordem[i]], solidos[ordem[(i + 1) % v.pas]], 1e-9).estado);
    const raioDoCubo = (v.cubo * v.envergadura * MM) / 2;
    const meiaDoCubo = (v.comprimentoDoCubo * v.envergadura * MM) / 2;
    const dentro = [...neutro.F.values()].filter((f) => f.parte === 'pas').flatMap((f) => f.vs).map((id) => neutro.V.get(id)).filter((q) => Math.hypot(q[0], q[1]) < raioDoCubo * 0.9999);
    return { estados, foraDoCubo: Math.max(0, ...dentro.map((q) => Math.abs(q[2]) - meiaDoCubo)) / (v.envergadura * MM) };
  }
  /* a maior corda da raiz que as duas restrições deixam passar (a conta das restrições, escrita aqui outra vez) */
  function cordaLimite(v) {
    const a = v.incidenciaNaRaiz * GRAUS;
    const larguraNoPlano = Math.abs(Math.cos(a)) + (v.espessuraNaRaiz + v.curvatura) * Math.abs(Math.sin(a));
    const alturaNoEixo = Math.max(v.eixoDeTorcao, 1 - v.eixoDeTorcao) * Math.abs(Math.sin(a)) + (v.espessuraNaRaiz / 2 + v.curvatura) * Math.abs(Math.cos(a));
    const folgaDoDiedro = (0.85 * v.comprimentoDoCubo) / 2 - 0.125 * v.cubo * Math.abs(Math.tan(v.diedro * GRAUS));
    return Math.min((2.2 * v.cubo) / (v.pas * (1 + v.abaulamentoDaCorda) * larguraNoPlano), Math.max(0, folgaDoDiedro) / (alturaNoEixo * (1 + 0.5 * v.abaulamentoDaCorda)));
  }

  it('o ponto máximo da faixa é uma hélice de nove pás que se separam, com a raiz dentro do cubo', () => {
    const v = completo(ponto('maximo'));
    expect(v.pas).toBe(9);
    const { neutro } = rodar(ponto('maximo'));
    const r = pasSeparadas(neutro, v);
    expect(r.estados).toEqual(Array(9).fill('separadas'));
    expect(r.foraDoCubo).toBeLessThanOrEqual(0);
    expect(neutro.orfaos ?? []).toEqual([]);
  }, 120_000);

  it('o perfil helice, de cinco pás, tem a corda da raiz abaixo de 95% do limite das duas restrições', () => {
    const v = completo({ perfil: 'helice' });
    expect(v.cordaDaPaNaRaiz).toBeLessThan(cordaLimite(v) * 0.95);
    expect(pasSeparadas(rodar({ perfil: 'helice' }).neutro, v).estados).toEqual(Array(5).fill('separadas'));
  });

  it('nos cantos e em amostras da faixa (com enflechamento, diedro e ponta levantada), a corda no limite das restrições é aceita e as pás se separam; 5% acima do limite é recusada', () => {
    let semente = 20261012;
    const sorteio = () => { semente = (semente + 0x6D2B79F5) | 0; let t = Math.imul(semente ^ (semente >>> 15), 1 | semente); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const entre = (a, b) => a + (b - a) * sorteio();
    const casos = [];
    for (const pas of [2, 9]) for (const cubo of [0.05, 0.4]) for (const incidenciaNaRaiz of [0, 70]) casos.push({ pas, cubo, incidenciaNaRaiz, torcao: 60, abaulamentoDaCorda: 0.6, espessuraNaRaiz: 0.3, curvatura: 0.09, eixoDeTorcao: 1, comprimentoDoCubo: 0.3, enflechamento: 60, diedro: 15, pontaLevantada: 60 });
    for (let k = 0; k < 8; k += 1) {
      casos.push({
        pas: 2 + Math.floor(sorteio() * 8), cubo: entre(0.05, 0.4), incidenciaNaRaiz: entre(-10, 70), torcao: entre(-60, 60), abaulamentoDaCorda: entre(0, 0.6),
        espessuraNaRaiz: entre(0.04, 0.3), curvatura: entre(0, 0.09), eixoDeTorcao: entre(0, 1), comprimentoDoCubo: entre(0.02, 0.3),
        enflechamento: entre(-30, 60), diedro: entre(-15, 15), pontaLevantada: entre(0, 60), extensaoDaPonta: entre(0.02, 0.05),
      });
    }
    let aceitos = 0;
    for (const caso of casos) {
      const limite = cordaLimite({ ...completo(), ...caso });
      const corda = Math.min(P.cordaDaPaNaRaiz.maximo, limite * 0.995);
      if (corda < P.cordaDaPaNaRaiz.minimo) {
        expect(recusa({ ...caso, cordaDaPaNaRaiz: P.cordaDaPaNaRaiz.minimo, cordaDaPaNaPonta: P.cordaDaPaNaPonta.minimo }).restricao, JSON.stringify(caso)).toMatch(/pas-nao-se-tocam|raiz-da-pa-cabe-no-cubo/);
        continue;
      }
      const parametros = { ...caso, cordaDaPaNaRaiz: corda, cordaDaPaNaPonta: Math.max(P.cordaDaPaNaPonta.minimo, corda / 2) };
      const { neutro } = rodar(parametros);
      const r = pasSeparadas(neutro, completo(parametros));
      expect(r.estados, JSON.stringify(parametros)).toEqual(Array(caso.pas).fill('separadas'));
      expect(r.foraDoCubo, JSON.stringify(parametros)).toBeLessThanOrEqual(0);
      if (limite * 1.05 <= P.cordaDaPaNaRaiz.maximo) expect(recusa({ ...caso, cordaDaPaNaRaiz: limite * 1.05, cordaDaPaNaPonta: P.cordaDaPaNaPonta.minimo }).restricao).toMatch(/pas-nao-se-tocam|raiz-da-pa-cabe-no-cubo/);
      aceitos += 1;
    }
    expect(aceitos).toBeGreaterThan(8);
  }, 600_000);
});

describe('as portas das superfícies', () => {
  for (const nome of ['asa', 'deriva', 'estabilizador', 'pa-de-helice']) {
    it(`o perfil ${nome}: raiz e eixo da dobradiça saem com a forma e o papel do contrato, e a malha confere os dois`, () => {
      const { neutro } = rodar({ perfil: nome });
      expect(portasPublicadas(neutro).map(({ id, interface: i }) => [id, i.forma, i.papel])).toEqual([['eixo-da-dobradica', 'cilindro', 'externa'], ['raiz', 'plano', 'apoia']]);
      expect(conferirPortasNaForma(neutro)).toEqual([]);
    });
  }

  it('o eixo da dobradiça do aileron segue o aileron, com o diedro de 5 graus, e o raio é o do nariz do comando', () => {
    const { neutro } = rodar({ perfil: 'asa' });
    const eixo = porta(neutro, 'eixo-da-dobradica');
    expect(Math.atan2(eixo.eixo[1], eixo.eixo[0]) / GRAUS).toBeGreaterThan(5);
    expect(Math.atan2(eixo.eixo[1], eixo.eixo[0]) / GRAUS).toBeLessThan(5.5);
    expect(eixo.fim - eixo.inicio).toBeCloseTo(0.9 * 6.4 * 0.98 - 0.62 * 6.4 * 1.02, 0);
    /* o raio é o maior, em torno do eixo, dos vértices do comando a até 10 mm do plano: o bordo de fuga, a 25% da corda do eixo */
    const corda = (0.114 + (0.0484 - 0.114) * 0.62) * 12.8;
    expect(eixo.raio).toBeGreaterThan(0.9 * 0.25 * corda);
    expect(eixo.raio).toBeLessThan(1.02 * 0.25 * corda);
  });

  it('a raiz da asa é o plano de simetria, de normal ao longo de x, e a da deriva é o plano da base, de normal para baixo', () => {
    const asa = porta(rodar({ perfil: 'asa' }).neutro, 'raiz');
    expect(Math.abs(asa.normal[0])).toBeCloseTo(1, 6);
    expect(asa.ponto[0]).toBeCloseTo(0, 9);
    const deriva = porta(rodar({ perfil: 'deriva' }).neutro, 'raiz');
    expect(deriva.normal[1]).toBeCloseTo(-1, 6);
    expect(deriva.ponto[1]).toBeCloseTo(0, 9);
  });
});

describe('o contrato recusa combinação impossível e valor fora da faixa', () => {
  const CASOS = {
    'comando-com-extensao': { perfil: 'asa', inicioDoComando: 0.85, fimDoComando: 0.85 },
    'pas-ou-nenhuma': { perfil: 'helice', pas: 1 },
    'pas-nao-se-tocam': { perfil: 'helice', pas: 9 },
    'raiz-da-pa-cabe-no-cubo': { perfil: 'helice', comprimentoDoCubo: 0.08 },
    'pa-nao-alarga-para-a-ponta': { perfil: 'helice', cordaDaPaNaPonta: 0.07 },
    'ponta-nao-dobra': { perfil: 'asa', pontaLevantada: 72, extensaoDaPonta: 0.02, espessuraNaPonta: 0.2 },
    'canto-cabe-na-ponta': { perfil: 'asa', extensaoDaPonta: 0.03, raioDoCantoDeAtaque: 0.04 },
    'cantos-cabem-na-corda': { perfil: 'asa', raioDoCantoDeAtaque: 0.05, raioDoCantoDeFuga: 0.05, cordaNaPonta: 0.04 },
  };
  it('há um caso para cada restrição do contrato', () => {
    expect(Object.keys(CASOS).sort()).toEqual(F.contrato.restricoes.map(({ id }) => id).sort());
  });
  for (const [id, parametros] of Object.entries(CASOS)) {
    it(`recusa pela restrição '${id}', dizendo o motivo`, () => {
      const erro = recusa(parametros);
      expect(erro).toBeInstanceOf(ErroChamadaDeFamilia);
      expect(erro.restricao).toBe(id);
      expect(erro.motivo).toBe(F.contrato.restricoes.find((r) => r.id === id).motivo);
    });
  }

  it('o comando termina antes da curva da ponta levantada em qualquer ponto das faixas, e o ponto máximo da faixa ainda gera malha', () => {
    expect(P.fimDoComando.maximo + P.extensaoDaPonta.maximo).toBeLessThan(0.951);
    expect(rodar({ perfil: 'asa', fimDoComando: P.fimDoComando.maximo, extensaoDaPonta: P.extensaoDaPonta.maximo }).neutro.orfaos ?? []).toEqual([]);
  });

  it('recusa o valor fora da faixa e a contagem que não é inteira, sem gerar malha', () => {
    expect(recusa({ perfil: 'asa', envergadura: 100 }).message).toMatch(/parametros\.envergadura recebeu 100/);
    expect(recusa({ perfil: 'asa', envergadura: 41000 }).message).toMatch(/parametros\.envergadura recebeu 41000/);
    expect(recusa({ perfil: 'helice', pas: 2.5 }).message).toMatch(/parametros\.pas recebeu 2\.5/);
    expect(recusa({ perfil: 'asa', deflexao: 40 }).message).toMatch(/parametros\.deflexao recebeu 40/);
    expect(recusa({ perfil: 'asa', espessuraNaRaiz: 0.5 }).message).toMatch(/parametros\.espessuraNaRaiz recebeu 0\.5/);
  });
});

describe('os perfis: o nome basta, e o chamador sobrescreve só o que quiser', () => {
  it('cada perfil escolhe a composição que o objeto pede', () => {
    const esperadas = {
      asa: 'superficie-aerodinamica.inteira-com-comando', estabilizador: 'superficie-aerodinamica.inteira-com-comando',
      deriva: 'superficie-aerodinamica.semi-com-comando', 'pa-de-helice': 'superficie-aerodinamica.semi', helice: 'superficie-aerodinamica.helice',
    };
    for (const nome of NOMES_DOS_PERFIS) expect(chamar(F, 'a', { perfil: nome }).composicao).toBe(esperadas[nome]);
  });

  it('as medidas do avião de referência: envergadura de 12.800 mm, hélice de 5 pás e 2.000 mm, estabilizador de 4.250 mm e deriva de 1.900 mm', () => {
    expect(PERFIS.asa.parametros.envergadura).toBe(12800);
    expect(PERFIS.helice.parametros).toMatchObject({ envergadura: 2000, pas: 5 });
    expect(PERFIS.estabilizador.parametros.envergadura).toBe(4250);
    expect(PERFIS.deriva.parametros.envergadura).toBe(1900);
    expect(PERFIS.asa.parametros.cordaNaRaiz * 12800).toBeGreaterThan(1300);
    expect(PERFIS.asa.parametros.cordaNaRaiz * 12800).toBeLessThan(1600);
  });

  it('é determinística: o mesmo perfil dá o mesmo hash em duas execuções e em duas receitas novas, e outro parâmetro dá outro', () => {
    const a = hash(rodar({ perfil: 'asa' }).neutro);
    expect(hash(rodar({ perfil: 'asa' }).neutro)).toBe(a);
    expect(hash(executarReceita({ get CHAMADAS_COMPOSICOES() { return [chamar(F, 'superficie', { perfil: 'asa' })]; }, PARAMS: {}, TOPO: {}, ALIASES: [], MATERIAIS }, criarRegistroDeFamilias({ familias: [F] })).neutro)).toBe(a);
    expect(hash(rodar({ perfil: 'asa', curvatura: 0.03 }).neutro)).not.toBe(a);
  });

  it('o que o chamador escreve vale mais que o perfil: a asa de 8.000 mm tem a metade do volume em cada medida ao cubo', () => {
    const grande = volumeDaParte(rodar({ perfil: 'asa' }).neutro, 'fixa');
    const pequena = volumeDaParte(rodar({ perfil: 'asa', envergadura: 6400 }).neutro, 'fixa');
    expect(pequena / grande).toBeCloseTo(1 / 8, 3);
  });

  it('o perfil é um ponto da aprovação: os pontos dos perfis completam o perfil com o padrão', () => {
    const pontos = pontosDosPerfis(F.contrato);
    expect(Object.keys(pontos).sort()).toEqual(NOMES_DOS_PERFIS);
    expect(pontos.deriva).toEqual(completo({ perfil: 'deriva' }));
  });
});

describe('as faces menores', () => {
  /* a normal de cada face, pela soma de Newell, tem de passar de 1e-12 para o adaptador da bancada a aceitar a malha */
  const menorNormal = (neutro) => Math.min(...[...neutro.F.values()].map((face) => {
    const pts = face.vs.map((v) => neutro.V.get(v));
    let x = 0; let y = 0; let z = 0;
    pts.forEach((a, i) => {
      const b = pts[(i + 1) % pts.length];
      x += (a[1] - b[1]) * (a[2] + b[2]); y += (a[2] - b[2]) * (a[0] + b[0]); z += (a[0] - b[0]) * (a[1] + b[1]);
    });
    return Math.hypot(x, y, z);
  }));

  it('o ponto mínimo (200 mm de envergadura) e os perfis em 200 mm não têm face degenerada para o adaptador, mesmo com a ponta de 2 mm de corda', () => {
    for (const parametros of [ponto('minimo'), { perfil: 'helice', envergadura: 200 }, { perfil: 'pa-de-helice', envergadura: 200 }, { perfil: 'asa', envergadura: 200 }]) {
      expect(menorNormal(rodar(parametros).neutro)).toBeGreaterThan(1e-11);
    }
  });
});

describe('a camada mecânica da aprovação', () => {
  it('cada perfil passa na medição da aprovação (malha fechada, portas, determinismo)', () => {
    for (const nome of NOMES_DOS_PERFIS) {
      const resultado = medirPonto(F, completo({ perfil: nome }), `perfil ${nome}`);
      expect(resultado.problemas, nome).toEqual([]);
      expect(resultado.estado).toBe('ok');
    }
  }, 180_000);

  it('a aprovação mecânica passa nos três pontos, nos cinco perfis, na varredura e na escala dos perfis', () => {
    const resultado = aprovarFamilia(F, { gravar: false });
    expect(resultado.problemas).toEqual([]);
    expect(resultado.aprovada).toBe(true);
    expect(Object.keys(resultado.perfis).sort()).toEqual(NOMES_DOS_PERFIS);
    expect(Object.values(resultado.pontos).map(({ estado }) => estado)).toEqual(['ok', 'ok', 'ok']);
    expect(resultado.escalas.length).toBe(NOMES_DOS_PERFIS.length * 2);
    expect(Object.keys(pontosDaFamilia(F.contrato))).toEqual(['minimo', 'medio', 'maximo']);
    expect(resultado.pontos.minimo.parametros).toMatchObject({ pas: 0, simetria: 0, comando: 0 });
    expect(resultado.pontos.medio.parametros).toMatchObject({ pas: 0, simetria: 1, comando: 1 });
    expect(resultado.pontos.maximo.parametros).toMatchObject({ pas: 9 });
  }, 300_000);
});

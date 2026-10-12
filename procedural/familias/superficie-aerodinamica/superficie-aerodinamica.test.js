/* superficie-aerodinamica.test.js — a família `superficie-aerodinamica` medida na malha e nos argumentos que o `derivar` entrega.
   O perfil NACA (o bordo de fuga com a espessura pedida, o raio do nariz, o giro do nariz, o intradorso côncavo); o volume da
   deriva e da asa contra a integral da área da seção; a ponta levantada (a inclinação contínua, o fechamento numa corda); o
   comando (a fresta, o giro em torno do eixo da dobradiça, o curso sem tocar a parte fixa, o aileron diferencial); a hélice (as
   pás equiespaçadas, a raiz dentro do cubo, o cone de ogiva); as portas; cada restrição do contrato e os cinco perfis chamados só
   pelo nome. A camada mecânica da aprovação, que mede os três pontos, os perfis e a escala deles, roda uma vez no fim. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { caixasPorParte, portasPublicadas } from '../../../src/autoria/descrever-partes.js';
import { conferirPortasNaForma } from '../../../src/autoria/porta-confere-forma.js';
import { auditarParDeSolidos, prepararSolido } from '../../../src/autoria/contato-de-solidos.js';
import { aprovarFamilia, medirPonto, pontosDaFamilia, pontosDosPerfis } from '../../../tools/mecanifica/aprovacao-da-familia.mjs';
import { neutroCanonico } from '../../nucleo/entrada.js';
import { sha256Hex } from '../../nucleo/sha256.js';
import { FAMILIAS, ErroChamadaDeFamilia, chamar, criarRegistroDeFamilias } from '../index.js';
import { SUPERFICIE_AERODINAMICA as F } from './index.js';
import {
  EXPOENTE_DAS_ESTACOES, GRAUS, LADOS_DA_SECAO, PONTOS_POR_FACE, contornoDoPerfil, linhaDeCurvatura, meiaEspessura, plantaDa,
} from './geometria.js';
import { LADOS_DO_CUBO } from './composicoes.js';

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

  it('a ponta levantada sai do diedro por uma curva suave e as seções acompanham: inclinação contínua, giro por seção de no máximo 13 graus', () => {
    const { argumentos } = chamar(F, 'a', { perfil: 'asa' });
    const posicoes = Object.keys(argumentos).filter((nome) => /^fPos\d+$/.test(nome)).sort((a, b) => Number(a.slice(4)) - Number(b.slice(4))).map((nome) => argumentos[nome]);
    const inclinacoes = posicoes.slice(1).map((q, i) => Math.atan2(q[1] - posicoes[i][1], q[0] - posicoes[i][0]) / GRAUS);
    const apos = inclinacoes.filter((_, i) => posicoes[i][0] >= 0 && posicoes[i + 1][0] > posicoes[i][0]);
    expect(apos.slice(0, 6).every((g) => Math.abs(g - 5) < 1e-6 || g === 0)).toBe(true);
    const giros = apos.slice(1).map((g, i) => g - apos[i]);
    expect(Math.max(...giros.map(Math.abs))).toBeLessThan(13);
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

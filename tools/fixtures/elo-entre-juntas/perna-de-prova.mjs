/* perna-de-prova.mjs — a perna de prova do plano elo entre juntas: o quadril, o joelho e o tornozelo (três atuadores de junta de 100 mm) e os
 * dois elos em U, a coxa entre o quadril e o joelho e a canela entre o joelho e o tornozelo, postos só pelas portas das flanges e ligados pelas
 * três articulações. Os comprimentos da coxa e da canela, os cursos e a posição de cada junta saem do esqueleto humanoide aprovado
 * (procedural/pecas/esqueleto-humanoide/: proporcoes.json, esqueleto.json e articulacoes.json), e não de números escritos aqui.
 *
 * O U liga dois eixos antiparalelos (o eixo do atuador seguinte aponta ao contrário), que é o que o esqueleto tem: o quadril e o tornozelo giram
 * em torno de −x e o joelho em torno de +x. Cada U desloca a boca B da A de um lado (67,5 mm na coxa, na direção do eixo), e como o atuador do joelho
 * gira meia volta o deslocamento da canela volta ao outro lado: o tornozelo fica na mesma coluna do quadril e o joelho a uns 6 mm dela.
 *
 * `montarPerna` devolve a montagem no formato de `montar` de uma família; `paraOEsqueleto` dá a transformação rígida da montagem (onde o primeiro
 * atuador está na origem, com o eixo ao longo de y) ao referencial do esqueleto (y para cima, o membro em −y, o eixo do quadril em −x). */
import { criarRegistroDeFamilias } from '../../../procedural/familias/index.js';
import { chamar } from '../../../src/autoria/chamar-familia.js';
import { resolverPortasDeMontagem } from '../../../src/autoria/interfaces-montagem.js';
import { resolverMontagemDaFamilia } from '../../modelar/montagem-da-familia.mjs';
import { declaracaoDaJunta, pecasDoAtuador } from '../../../procedural/familias/atuador-de-junta/montagem.js';
import { derivar } from '../../../procedural/familias/elo-entre-juntas/derivar.js';
import articulacoes from '../../../procedural/pecas/esqueleto-humanoide/articulacoes.json' with { type: 'json' };
import esqueleto from '../../../procedural/pecas/esqueleto-humanoide/esqueleto.json' with { type: 'json' };
import proporcoes from '../../../procedural/pecas/esqueleto-humanoide/proporcoes.json' with { type: 'json' };
import { ATUADOR, eloEmU } from './elo-de-curva-dupla.mjs';

const completar = (contrato, parametros) => Object.fromEntries(Object.entries(contrato.parametros).map(([nome, { padrao }]) => [nome, parametros[nome] ?? padrao]));
const juntaDoEsqueleto = (id) => esqueleto.juntas.find((j) => j.id === id);
const articulacaoDoEsqueleto = (id) => articulacoes.articulacoes.find((a) => a.id === id);

/** As três juntas da perna direita, na ordem do membro, com o eixo, a posição e o curso do esqueleto aprovado. */
export const JUNTAS_DA_PERNA = Object.freeze(['quadril-direito', 'joelho-direito', 'tornozelo-direito'].map((id) => {
  const j = juntaDoEsqueleto(id); const curso = articulacaoDoEsqueleto(id).curso;
  return Object.freeze({ id, eixo: j.eixo, posicao: j.posicao, curso: Object.freeze({ ...curso }) });
}));
export const COMPRIMENTOS = Object.freeze({ coxa: proporcoes.medidas.comprimentoDaCoxa, canela: proporcoes.medidas.comprimentoDaCanela });
export const ELO_DA_COXA = eloEmU(COMPRIMENTOS.coxa);
export const ELO_DA_CANELA = eloEmU(COMPRIMENTOS.canela);

const receitaDoElo = (ref, familia, parametros) => {
  const { composicao, argumentos } = derivar(completar(familia.contrato, parametros));
  return { meta: { nome: ref }, CHAMADAS_COMPOSICOES: [{ id: 'elo', composicao, argumentos }], PARAMS: {}, TOPO: {}, ALIASES: [], MATERIAIS: {} };
};

/** A montagem da perna: carcaça e saída de cada atuador, a coxa e a canela, todos posicionados pelas portas, e as articulações do quadril, do joelho e do tornozelo. */
export function montarPerna(familiaAtuador, familiaElo, { coxa = ELO_DA_COXA, canela = ELO_DA_CANELA, atuador = ATUADOR } = {}) {
  chamar(familiaAtuador, 'atuador', atuador); chamar(familiaElo, 'coxa', coxa); chamar(familiaElo, 'canela', canela);
  const [q, j, t] = ['quadril', 'joelho', 'tornozelo'].map((nome) => pecasDoAtuador(completar(familiaAtuador.contrato, atuador), `perna.${nome}`));
  const refs = { coxa: 'perna.coxa', canela: 'perna.canela' };
  const instancia = (id, ref) => ({ id, alvo: { tipo: 'peca', ref } });
  const posicao = (id, instanciaId, porta, emInstancia, emPorta) => ({ id, instancia: instanciaId, porta, em: { instancia: emInstancia, porta: emPorta }, unidade: 'mm', afastamento: 0 });
  const resto = { quadril: ['coxa', 'carcacaJoelho', 'saidaJoelho', 'canela', 'carcacaTornozelo', 'saidaTornozelo'], joelho: ['canela', 'carcacaTornozelo', 'saidaTornozelo'], tornozelo: [] };
  return {
    montagem: {
      formato: 'mecanifica.montagem', versao: 5, id: 'perna-de-prova',
      instancias: [
        instancia('carcacaQuadril', q.refs.carcaca), instancia('saidaQuadril', q.refs.saida), instancia('coxa', refs.coxa),
        instancia('carcacaJoelho', j.refs.carcaca), instancia('saidaJoelho', j.refs.saida), instancia('canela', refs.canela),
        instancia('carcacaTornozelo', t.refs.carcaca), instancia('saidaTornozelo', t.refs.saida),
      ],
      relacoes: [],
      etapas: ['carcacaQuadril', 'saidaQuadril', 'coxa', 'carcacaJoelho', 'saidaJoelho', 'canela', 'carcacaTornozelo', 'saidaTornozelo'],
      vinculos: [],
      posicoes: [
        posicao('saidaQuadrilNoEixo', 'saidaQuadril', 'eixo-da-saida', 'carcacaQuadril', 'eixo'),
        posicao('coxaNaSaidaDoQuadril', 'coxa', 'boca-a', 'saidaQuadril', 'saida'),
        posicao('joelhoNaCoxa', 'carcacaJoelho', 'fixacao', 'coxa', 'boca-b'),
        posicao('saidaJoelhoNoEixo', 'saidaJoelho', 'eixo-da-saida', 'carcacaJoelho', 'eixo'),
        posicao('canelaNaSaidaDoJoelho', 'canela', 'boca-a', 'saidaJoelho', 'saida'),
        posicao('tornozeloNaCanela', 'carcacaTornozelo', 'fixacao', 'canela', 'boca-b'),
        posicao('saidaTornozeloNoEixo', 'saidaTornozelo', 'eixo-da-saida', 'carcacaTornozelo', 'eixo'),
      ],
    },
    receitas: { ...q.receitas, ...j.receitas, ...t.receitas, [refs.coxa]: receitaDoElo(refs.coxa, familiaElo, coxa), [refs.canela]: receitaDoElo(refs.canela, familiaElo, canela) },
    articulacoes: [
      { ...declaracaoDaJunta('quadril', 'carcacaQuadril', 'saidaQuadril', resto.quadril), curso: { ...JUNTAS_DA_PERNA[0].curso } },
      { ...declaracaoDaJunta('joelho', 'carcacaJoelho', 'saidaJoelho', resto.joelho), curso: { ...JUNTAS_DA_PERNA[1].curso } },
      { ...declaracaoDaJunta('tornozelo', 'carcacaTornozelo', 'saidaTornozelo'), curso: { ...JUNTAS_DA_PERNA[2].curso } },
    ],
  };
}

const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const n = Math.hypot(...a); return a.map((v) => v / n); };

/** O eixo (direção e centro, em mm) da porta `eixo` do atuador de cada junta, no referencial da montagem resolvida. */
export function eixosDasJuntas(portas) {
  return ['carcacaQuadril', 'carcacaJoelho', 'carcacaTornozelo'].map((id) => { const p = portas.get(`${id}.eixo`); return { direcao: p.eixo, centro: p.centro.map((v) => v * 1000) }; });
}

/**
 * A transformação rígida da montagem ao esqueleto: a direção do eixo do quadril vai a −x (o do esqueleto), o membro (do quadril ao tornozelo,
 * sem a parte ao longo do eixo) vai a −y e o centro do eixo do quadril vai à posição do quadril do esqueleto. Devolve `{ rotacao, deslocamento }` em mm.
 */
export function paraOEsqueleto(portas) {
  const [q, , t] = eixosDasJuntas(portas);
  const e1 = unit(q.direcao); const d = sub(t.centro, q.centro); const e2 = unit(sub(d, e1.map((v) => v * dot(d, e1)))); const e3 = cruz(e1, e2);
  const rotacao = [e1.map((v) => -v), e2.map((v) => -v), e3];
  const alvo = JUNTAS_DA_PERNA[0].posicao; const girado = rotacao.map((l) => dot(l, q.centro));
  return { rotacao, deslocamento: alvo.map((v, i) => v - girado[i]), aplicar: (p) => rotacao.map((l, i) => dot(l, p) + alvo[i] - girado[i]) };
}

const matVec = (m, v) => m.map((l) => dot(l, v));
const matMat = (a, b) => a.map((l) => [0, 1, 2].map((j) => l[0] * b[0][j] + l[1] * b[1][j] + l[2] * b[2][j]));
function giroEmTorno(k, graus) {
  const a = (graus * Math.PI) / 180; const c = Math.cos(a); const s = Math.sin(a); const [x, y, z] = k; const t = 1 - c;
  return [[t * x * x + c, t * x * y - s * z, t * x * z + s * y], [t * x * y + s * z, t * y * y + c, t * y * z - s * x], [t * x * z - s * y, t * y * z + s * x, t * z * z + c]];
}
/* as instâncias que cada junta leva consigo, da fixa para a ponta */
const MOVEIS = { quadril: ['saidaQuadril', 'coxa', 'carcacaJoelho', 'saidaJoelho', 'canela', 'carcacaTornozelo', 'saidaTornozelo'], joelho: ['saidaJoelho', 'canela', 'carcacaTornozelo', 'saidaTornozelo'], tornozelo: ['saidaTornozelo'] };

/**
 * A montagem resolvida com cada junta girada `graus` (do quadril, do joelho e do tornozelo, a pose zero é 0), pelo mesmo giro em torno do eixo da
 * porta `eixo` do atuador que a conferência do curso usa: a junta de fora gira primeiro (em torno do eixo da pose zero) e a de dentro depois, sobre o
 * que a de fora já moveu. `portas` são as portas da montagem na pose zero (`resolverPortasDeMontagem`); o resultado serve a `auditarIntersecoesMontagem`.
 */
export function resolvidaNaPose(resolvida, portas, graus) {
  const poses = new Map(resolvida.instancias.map((i) => [i.id, { rotacao: i.poseMundo.rotacao.map((l) => [...l]), deslocamento: [...i.poseMundo.deslocamento] }]));
  const eixos = { quadril: portas.get('carcacaQuadril.eixo'), joelho: portas.get('carcacaJoelho.eixo'), tornozelo: portas.get('carcacaTornozelo.eixo') };
  for (const junta of ['tornozelo', 'joelho', 'quadril']) {
    const G = giroEmTorno(eixos[junta].eixo, graus[junta] ?? 0); const c = eixos[junta].centro;
    for (const id of MOVEIS[junta]) {
      const p = poses.get(id);
      poses.set(id, { rotacao: matMat(G, p.rotacao), deslocamento: matVec(G, sub(p.deslocamento, c)).map((v, i) => v + c[i]) });
    }
  }
  return { ...resolvida, instancias: resolvida.instancias.map((i) => ({ ...i, poseMundo: { ...i.poseMundo, ...poses.get(i.id) } })) };
}

/**
 * Um neutro só com a perna toda no referencial do esqueleto (metros), para exportar: os vértices de cada instância levados pela pose dela e depois
 * pela transformação ao esqueleto, e cada face com `parte` igual ao id da instância (carcacaQuadril, coxa, saidaJoelho, canela, ...).
 */
export function neutroDaPerna(resolvida, paraEsq) {
  const V = new Map(); const F = new Map(); let proximoV = 1; let proximaF = 1;
  for (const i of resolvida.instancias) {
    const { rotacao, deslocamento } = i.poseMundo; const neutro = i.definicao.neutro; const novos = new Map();
    for (const [id, p] of neutro.V) {
      const mundo = matVec(rotacao, p).map((v, k) => v + deslocamento[k]);
      novos.set(id, proximoV); V.set(proximoV, paraEsq.aplicar(mundo.map((v) => v * 1000)).map((v) => v / 1000)); proximoV += 1;
    }
    for (const f of neutro.F.values()) { F.set(proximaF, { ...f, id: proximaF, vs: f.vs.map((v) => novos.get(v)), parte: i.id }); proximaF += 1; }
  }
  return { V, F, orfaos: [], merges: [], partes: new Map(), esqueleto: null, pesos: null, portas: new Map(), materiais: new Map(), artefato: null, procedencia: null };
}

let guardada = null;
/** A perna montada e resolvida (uma vez por processo): a montagem gerada, os problemas, a montagem resolvida, o tempo de resolver em segundos e as portas na pose zero. */
export function resolverPerna() {
  guardada ??= (() => {
    const registro = criarRegistroDeFamilias();
    const execucao = { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes };
    const gerada = montarPerna(registro.obter('atuador-de-junta'), registro.obter('elo-entre-juntas'));
    const inicio = performance.now();
    const { problemas, resolvida } = resolverMontagemDaFamilia({ montar: () => gerada }, {}, execucao);
    const segundos = (performance.now() - inicio) / 1000;
    const instancias = resolvida ? resolvida.instancias.map((i) => ({ id: i.id, neutro: i.definicao.neutro, escala: 1, rotacao: i.poseMundo.rotacao, deslocamento: i.poseMundo.deslocamento })) : [];
    return { gerada, problemas, resolvida, segundos, portas: instancias.length ? resolverPortasDeMontagem(instancias) : null };
  })();
  return guardada;
}

/** A caixa (mínimo e máximo, em mm, no referencial do esqueleto) de uma instância da perna na pose dela. */
export function caixaNoEsqueleto(resolvida, paraEsq, id) {
  const i = resolvida.instancias.find((x) => x.id === id); const { rotacao, deslocamento } = i.poseMundo;
  const minimo = [Infinity, Infinity, Infinity]; const maximo = [-Infinity, -Infinity, -Infinity];
  for (const p of i.definicao.neutro.V.values()) {
    const e = paraEsq.aplicar(matVec(rotacao, p).map((v, k) => (v + deslocamento[k]) * 1000));
    for (let k = 0; k < 3; k += 1) { minimo[k] = Math.min(minimo[k], e[k]); maximo[k] = Math.max(maximo[k], e[k]); }
  }
  return { minimo, maximo };
}

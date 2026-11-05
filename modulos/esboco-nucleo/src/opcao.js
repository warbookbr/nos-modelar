/* opcao.js — o esboço 2.0: cada opção de forma é uma pequena receita do núcleo, montada em memória, e este arquivo a monta.
 *
 * Uma opção tem `titulo`, `nota` e o corpo, que é receita do núcleo em metro, como os PASSOS de qualquer peça:
 *   passos: [[op, args], ...]   passos crus do núcleo, executados primeiro, com tudo o que o catálogo oferece (gaiolas pelo
 *                               `subdivisao`, `aberturaPorContorno`, `friso`, booleanas, `chamar` de família, `parte`, ...);
 *   topo: { nome: [x, y, z] }   os pontos nomeados que os passos citam (vão ao TOPO da receita), e `aliases`, os ALIASES;
 *   formas: [...]               o atalho: formas simples posicionadas por relação, depois dos passos crus.
 *
 * O ATALHO. Cada forma tem `id` (vira o nome da parte) e o gerador: `op` e `args` de uma operação geradora do catálogo (`cubo`,
 * `chamferBox`, `cilindro`, `cone`, `esfera`, `extrusao`, `lathe`, `loft`, `plano`, `inflate`, `subdivisao`, ...), com o
 * `origemId` posto aqui quando não vem; ou `ajudante` (`gaiolaPorLacos`, `gaiolaPorEstacoes`, `gaiolaPorRede`, `gaiolaVarrida`) e
 * `args`, cujo resultado vira um passo `subdivisao` com os pontos no TOPO (`subdivisao` acrescenta campos ao passo, como `niveis`
 * e `espessura`). A posição é uma só entre `centro: [x, y, z]`, `sobre: '<id>'` (a base no topo daquela forma, centrada nela em x e
 * z) e `ponta: { id, lado }` ou `[id, lado]` (encostada na face `lado` daquela forma, centrada nos outros dois eixos); depois dela,
 * `desloca: [dx, dy, dz]` soma. `rotacao: [rx, ry, rz]` em graus (aplicadas em x, depois y, depois z, na regra da mão direita do
 * núcleo) ou `{ eixo, graus }` gira a forma em torno do centro da caixa dela antes de posicionar. Sem posição a forma fica onde o
 * gerador a pôs. `oculto: true` posiciona e serve de referência sem entrar na receita.
 *
 * TUDO PELA CAIXA DA MALHA QUE O NÚCLEO GEROU. A forma é executada sozinha pelo executor, já girada, e a caixa dos vértices dela é
 * a que `centro` (o centro da caixa vai ao ponto), `sobre` e `ponta` leem, nela e nas formas que ela cita. A forma que o atalho
 * posiciona é a que a peça daria, porque é a mesma malha. A forma vira parte por `parte` com a seleção da origem do gerador (no
 * cilindro, as laterais e as duas tampas), gira por `rotaciona` e anda por `transladar`, as duas com `sel: { grupo: id }`. Uma
 * forma cujas faces não ficam todas na parte é recusada, como a que cita forma inexistente, a referência circular e o gerador que
 * o núcleo recusa: o que o núcleo não faz volta com o motivo, e não é desenhado de outro jeito.
 *
 * Núcleo puro: nenhum relógio, nenhum sorteio, nenhuma leitura de arquivo. `receitaDaOpcao(opcao)` devolve `{ receita, formas,
 * recusas }`, com a receita pronta para o executor e para a bancada. */
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { gaiolaPorLacos } from '../../../procedural/nucleo/gaiola-por-lacos.js';
import { gaiolaPorEstacoes } from '../../../procedural/nucleo/gaiola-por-estacoes.js';
import { gaiolaPorRede } from '../../../procedural/nucleo/gaiola-por-rede.js';
import { gaiolaVarrida } from '../../../procedural/nucleo/gaiola-varrida.js';

export const AJUDANTES = Object.freeze({ gaiolaPorLacos, gaiolaPorEstacoes, gaiolaPorRede, gaiolaVarrida });
export const LADOS = Object.freeze(['+x', '-x', '+y', '-y', '+z', '-z']);
const EIXOS = ['x', 'y', 'z'];
const CHAVES_DA_FORMA = new Set(['id', 'op', 'args', 'ajudante', 'subdivisao', 'centro', 'sobre', 'ponta', 'desloca', 'rotacao', 'oculto', 'cor', 'rotulo']);
const CHAVES_DA_OPCAO = new Set(['titulo', 'nota', 'passos', 'topo', 'aliases', 'formas', 'legendas']);
/* a primeira origem livre do atalho: os passos crus usam as menores, e o atalho conta daqui para cima */
const ORIGEM_DO_ATALHO = 1000;

export class RecusaDoEsboco extends Error {
  constructor(motivo, onde = null) { super(onde ? `${onde}: ${motivo}` : motivo); this.name = 'RecusaDoEsboco'; this.motivo = motivo; this.onde = onde; }
}
const recusar = (motivo, onde) => { throw new RecusaDoEsboco(motivo, onde); };

const vetor3 = (v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);

/** A caixa dos vértices de um neutro, ou só das faces de uma parte. */
export function caixaDaMalha(neutro, parte = null) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const usar = (p) => { for (let k = 0; k < 3; k += 1) { if (p[k] < min[k]) min[k] = p[k]; if (p[k] > max[k]) max[k] = p[k]; } };
  if (parte === null) for (const p of neutro.V.values()) usar(p);
  else for (const f of neutro.F.values()) if (f.parte === parte) for (const v of f.vs) usar(neutro.V.get(v));
  if (!Number.isFinite(min[0])) return null;
  return { min, max, centro: min.map((m, k) => (m + max[k]) / 2), tamanho: min.map((m, k) => max[k] - m) };
}

const transladarCaixa = (c, d) => ({ min: c.min.map((x, k) => x + d[k]), max: c.max.map((x, k) => x + d[k]), centro: c.centro.map((x, k) => x + d[k]), tamanho: c.tamanho });

/** Executa uma receita pequena e devolve o neutro, ou recusa com os gritos do núcleo. */
function executar(receita, onde) {
  let neutro;
  try { ({ neutro } = executarReceita(receita)); } catch (erro) { recusar(`o núcleo recusou: ${String(erro.message).split('\n')[0]}`, onde); }
  if (neutro.orfaos?.length) recusar(`o núcleo recusou: ${neutro.orfaos.slice(0, 3).map((o) => `${o.op} ${o.ref ?? ''}: ${o.motivo}`.replace(/ +/g, ' ')).join('; ')}`, onde);
  return neutro;
}

/** As rotações declaradas como lista de { eixo, graus }, na ordem em que se aplicam. */
export function lerRotacao(r, onde) {
  if (r === undefined || r === null) return [];
  if (Array.isArray(r)) {
    if (!vetor3(r)) recusar('"rotacao" é [rx, ry, rz] em graus', onde);
    return EIXOS.map((eixo, k) => ({ eixo, graus: r[k] })).filter((g) => g.graus !== 0);
  }
  if (typeof r === 'object' && EIXOS.includes(r.eixo) && Number.isFinite(r.graus ?? r.angulo)) return [{ eixo: r.eixo, graus: r.graus ?? r.angulo }];
  return recusar('"rotacao" é [rx, ry, rz] em graus ou { eixo, graus }', onde);
}

function lerPonta(p, onde) {
  const [id, lado] = Array.isArray(p) ? p : [p?.id, p?.lado];
  if (typeof id !== 'string' || !LADOS.includes(lado)) recusar(`"ponta" é { id, lado } ou [id, lado], com o lado em ${LADOS.join(', ')}`, onde);
  return { id, lado };
}

/** Os passos que geram a forma, na origem do gerador, com a parte de nome `id`, e o TOPO que ela acrescenta. */
function geradorDaForma(f, origemId, onde) {
  if (f.ajudante !== undefined) {
    const ajudante = AJUDANTES[f.ajudante];
    if (!ajudante) recusar(`ajudante "${f.ajudante}" não existe; os ajudantes são ${Object.keys(AJUDANTES).join(', ')}`, onde);
    let r;
    try { r = ajudante(f.args ?? {}); } catch (erro) { recusar(`${f.ajudante} recusou: ${String(erro.message).split('\n')[0]}`, onde); }
    const passo = r.passo ?? Object.fromEntries(['vertices', 'faces', 'vincos', 'cantos', 'medidas'].filter((k) => r[k] !== undefined).map((k) => [k, r[k]]));
    if (!passo.vertices || !passo.faces) recusar(`${f.ajudante} não devolveu um passo de subdivisão (vertices e faces)`, onde);
    return { passos: [['subdivisao', { origemId, ...passo, ...(f.subdivisao ?? {}) }]], op: 'subdivisao', topo: r.pontos ?? {} };
  }
  if (typeof f.op !== 'string') recusar('a forma precisa de "op" (uma operação geradora do catálogo) ou de "ajudante"', onde);
  const args = { ...(f.args ?? {}) };
  if (args.origemId === undefined) args.origemId = origemId;
  return { passos: [[f.op, args]], op: f.op, topo: {}, origemId: args.origemId };
}

function selecoesDaParte(op, origemId) {
  const base = { origem: { op, id: origemId } };
  /* `{ op: 'cilindro', id }` sem tampa seleciona só as laterais (catálogo, limites do cilindro) */
  if (op === 'cilindro') return [base, { origem: { op, id: origemId, tampa: 'fundo' } }, { origem: { op, id: origemId, tampa: 'topo' } }];
  return [base];
}

/**
 * Monta a receita de uma opção.
 * @param {object} opcao  { titulo, nota, passos?, topo?, aliases?, formas? }, em metro.
 * @param {object} [o]    { nome }: o nome da receita (meta.nome).
 * @returns {{ receita, formas: Array<{id, caixa, oculto}>, partes: string[] }}
 */
export function receitaDaOpcao(opcao, { nome = null } = {}) {
  const rotulo = `opção "${opcao?.titulo ?? '?'}"`;
  if (!opcao || typeof opcao !== 'object') recusar('a opção precisa ser um objeto', rotulo);
  for (const k of Object.keys(opcao)) if (!CHAVES_DA_OPCAO.has(k)) recusar(`campo "${k}" não existe na opção do esboço 2.0 (aceitos: ${[...CHAVES_DA_OPCAO].join(', ')})`, rotulo);
  const crus = opcao.passos ?? [];
  if (!Array.isArray(crus)) recusar('"passos" é uma lista de passos do núcleo', rotulo);
  const formas = opcao.formas ?? [];
  if (!Array.isArray(formas)) recusar('"formas" é uma lista', rotulo);
  if (!crus.length && !formas.length) recusar('a opção não tem passos nem formas', rotulo);
  const topo = { ...(opcao.topo ?? {}) };
  const aliases = opcao.aliases ?? [];

  const porId = new Map();
  for (const f of formas) {
    const onde = `${rotulo}, forma "${f?.id ?? '?'}"`;
    if (!f || typeof f.id !== 'string' || !f.id.trim()) recusar('toda forma precisa de "id"', onde);
    if (porId.has(f.id)) recusar('id repetido', onde);
    for (const k of Object.keys(f)) if (!CHAVES_DA_FORMA.has(k)) recusar(`campo "${k}" não existe na forma do esboço 2.0 (aceitos: ${[...CHAVES_DA_FORMA].join(', ')})`, onde);
    porId.set(f.id, f);
  }

  /* cada forma, uma vez: o gerador, a parte, a rotação, e a caixa local medida na malha do núcleo */
  const locais = new Map();
  let proximaOrigem = ORIGEM_DO_ATALHO;
  for (const f of formas) {
    const onde = `${rotulo}, forma "${f.id}"`;
    const g = geradorDaForma(f, proximaOrigem, onde);
    proximaOrigem += 1;
    for (const nome of Object.keys(g.topo)) {
      if (topo[nome] !== undefined) recusar(`o ponto "${nome}" do ${f.ajudante} já existe no TOPO da opção`, onde);
      topo[nome] = g.topo[nome];
    }
    const idDaOrigem = g.passos[0][1].origemId;
    const passos = [...g.passos, ...selecoesDaParte(g.op, idDaOrigem).map((sel) => ['parte', { nome: f.id, sel }])];
    const rotacoes = lerRotacao(f.rotacao, onde);
    let local = null;
    const neutro0 = executar({ meta: { nome: 'forma' }, PASSOS: passos, TOPO: g.topo, ALIASES: aliases }, onde);
    const semParte = [...neutro0.F.values()].filter((face) => face.parte !== f.id).length;
    if (semParte) recusar(`${semParte} face(s) do ${g.op} ficam fora da seleção da origem; escreva a forma em "passos" com as partes declaradas`, onde);
    local = caixaDaMalha(neutro0);
    if (rotacoes.length) {
      const pivo = local.centro;
      for (const r of rotacoes) passos.push(['rotaciona', { eixo: r.eixo, graus: r.graus, pivo, sel: { grupo: f.id } }]);
      local = caixaDaMalha(executar({ meta: { nome: 'forma' }, PASSOS: passos, TOPO: g.topo, ALIASES: aliases }, onde));
    }
    locais.set(f.id, { passos, local, topoDaForma: g.topo });
  }

  /* a posição de cada forma pela caixa das que ela cita, com a referência resolvida antes e o ciclo recusado */
  const prontas = new Map();
  const visitando = new Set();
  const resolver = (id, quem) => {
    if (prontas.has(id)) return prontas.get(id);
    const f = porId.get(id);
    if (!f) recusar(`cita a forma "${id}", que não existe nesta opção (formas: ${[...porId.keys()].join(', ')})`, `${rotulo}, forma "${quem}"`);
    const onde = `${rotulo}, forma "${id}"`;
    if (visitando.has(id)) recusar('referência circular de posição', onde);
    visitando.add(id);
    const { local } = locais.get(id);
    const modos = ['centro', 'sobre', 'ponta'].filter((k) => f[k] !== undefined);
    if (modos.length > 1) recusar('use só um entre "centro", "sobre" e "ponta"', onde);
    let alvo = null; // onde vai o centro da caixa
    if (f.centro !== undefined) {
      if (!vetor3(f.centro)) recusar('"centro" é [x, y, z] em metro (o esboço 2.0 não tem âncora: cite a forma por "sobre" ou "ponta")', onde);
      alvo = [...f.centro];
    } else if (f.sobre !== undefined) {
      if (typeof f.sobre !== 'string') recusar('"sobre" é o id de outra forma', onde);
      const c = resolver(f.sobre, id).caixa;
      alvo = [c.centro[0], c.max[1] + local.tamanho[1] / 2, c.centro[2]];
    } else if (f.ponta !== undefined) {
      const { id: idAlvo, lado } = lerPonta(f.ponta, onde);
      const c = resolver(idAlvo, id).caixa;
      const k = EIXOS.indexOf(lado[1]);
      alvo = [...c.centro];
      alvo[k] = lado[0] === '+' ? c.max[k] + local.tamanho[k] / 2 : c.min[k] - local.tamanho[k] / 2;
    }
    if (f.desloca !== undefined) {
      if (!vetor3(f.desloca)) recusar('"desloca" é [dx, dy, dz] em metro', onde);
      alvo = (alvo ?? local.centro).map((x, k) => x + f.desloca[k]);
    }
    const d = alvo ? alvo.map((x, k) => x - local.centro[k]) : [0, 0, 0];
    const r = { id, d, caixa: transladarCaixa(local, d) };
    visitando.delete(id);
    prontas.set(id, r);
    return r;
  };
  for (const f of formas) resolver(f.id, f.id);

  const PASSOS = [...crus];
  const partes = [];
  for (const f of formas) {
    if (f.oculto === true) continue;
    const { passos } = locais.get(f.id);
    const { d } = prontas.get(f.id);
    PASSOS.push(...passos);
    if (d.some((x) => Math.abs(x) > 1e-12)) PASSOS.push(['transladar', { d, sel: { grupo: f.id } }]);
    partes.push(f.id);
  }
  const receita = { meta: { nome: nome ?? (opcao.titulo ?? 'opcao') }, PASSOS, ...(Object.keys(topo).length ? { TOPO: topo } : {}), ...(aliases.length ? { ALIASES: aliases } : {}) };
  /* a receita inteira passa pelo executor, que é a conferência final: o que o núcleo não faz volta aqui com o motivo */
  const neutro = executar(receita, rotulo);
  const nomes = new Set(partes);
  let facesSemParte = 0;
  for (const face of neutro.F.values()) { if (face.parte) nomes.add(face.parte); else facesSemParte += 1; }
  return {
    receita, neutro, partes: [...nomes], facesSemParte,
    formas: formas.map((f) => ({ id: f.id, oculto: f.oculto === true, caixa: prontas.get(f.id).caixa, cor: f.cor ?? null, rotulo: f.rotulo ?? null })),
  };
}

/* opcao.js — o esboço 2.0: cada opção de forma é uma pequena receita do núcleo, montada em memória, e este arquivo a monta.
 *
 * O 2.0 é escrito em MILÍMETRO, como o esboço antigo; a receita que sai é a do núcleo, em metro, pela conversão por tabela de
 * `milimetro.js`. Uma opção tem `titulo`, `nota` e o corpo:
 *   passos: [[op, args], ...]   passos crus do núcleo, executados primeiro, com tudo o que o catálogo oferece (gaiolas pelo
 *                               `subdivisao`, `aberturaPorContorno`, `friso`, booleanas, `parte`, ...), em mm;
 *   topo: { nome: [x, y, z] }   os pontos nomeados que os passos citam (vão ao TOPO da receita), em mm, e `aliases`, os ALIASES;
 *   formas: [...]               o atalho: formas simples posicionadas por relação, depois dos passos crus.
 * As partes dos passos crus também podem ser citadas pelo atalho, pelo nome.
 *
 * O GERADOR. Cada forma tem `id` (vira o nome da parte) e `op` e `args` de uma operação geradora do catálogo (`cubo`, `chamferBox`,
 * `cilindro`, `cone`, `esfera`, `extrusao`, `lathe`, `loft`, `plano`, ...), com o `origemId` posto aqui; ou `ajudante`
 * (`gaiolaPorLacos`, `gaiolaPorEstacoes`, `gaiolaPorRede`, `gaiolaVarrida`, que já recebem mm) e `args`, cujo resultado vira um passo
 * `subdivisao` com os pontos no TOPO (`subdivisao` acrescenta campos ao passo, como `niveis` e `espessura`).
 *
 * A POSIÇÃO, sem conta. Uma só entre:
 *   centro: [x, y, z] ou "<id>.<âncora>"   o centro da caixa vai ao ponto; com `por: "<âncora>"`, vai a âncora da própria forma;
 *   sobre: "<id>"                          a base no topo da caixa daquela forma, centrada nela em x e z;
 *   ponta: { id, lado } ou [id, lado]      encostada na face `lado` da caixa daquela forma, centrada nos outros dois eixos;
 *   encosta: { id, lado } ou [id, lado]    centrada nos outros dois eixos e levada, pelo eixo do lado, até a malha tocar a malha
 *                                          da outra (`distanciaAteTocar`): o toque é da superfície, e não da caixa.
 * A âncora é `centro` ou de um a três lados de eixos distintos da caixa (`+y`, `+y-z`, `-x+y+z`): `corpo.+z` é o centro da face da
 * frente da caixa do corpo, e `corpo.+y-z`, o meio da aresta de cima e de trás. Depois, `alinha: { "<lado>": "<id>" | "<id>.<âncora>" }`
 * põe a face `lado` da forma rente à mesma face da outra (ou à coordenada da âncora citada), e `alinha: { x: "<id>" }` centra no
 * eixo; com `encosta`, o alinhamento e o `desloca` dos outros eixos valem antes do toque, e o `desloca` no eixo do toque, depois,
 * como folga. `desloca: [dx, dy, dz]` soma no fim.
 *
 * O GIRO. `rotacao: [rx, ry, rz]` em graus (x, depois y, depois z) ou `{ eixo, graus }` gira a forma em torno do centro da caixa dela
 * antes de posicionar. Com `pivo` (`{ eixo, graus, pivo: "<id>.<âncora>" | [x, y, z] }`) o giro vem depois da posição, em torno
 * daquele ponto: a cabeça gira na junta com o braço. O pivô na própria forma é lido na caixa dela já posicionada, antes do giro.
 *
 * A CÓPIA. `repete: { total, d: [dx, dy, dz] }` ou `{ total, eixo, graus | volta, pivo? }` é o `arranja` do núcleo, linear ou radial,
 * e `espelha: "x"` ou `{ eixo, pos | em: "<id>" | "<id>.<âncora>" }` é o `espelha` do núcleo pelo plano do eixo naquela coordenada
 * (0 sem `pos` nem `em`); os dois depois da posição e do giro, o espelho por último, e as cópias ficam na parte da forma. O `arranja`
 * cita a origem do gerador, e a do `cilindro` são só as laterais: o cilindro repetido é a `extrusao` de `{ circulo }`.
 *
 * O CONTATO ESPERADO. `contato: { "<id>": "encosta" | "atravessa" | "folga" }` declara a relação esperada com outra forma, que o
 * relato de contatos (`contatos.js`) confere; `encosta` declara a dele. A parte de passo cru não tem onde declarar, e por isso a opção
 * aceita `contatos: [{ par: ["capo", "tampa"], relacao: "encosta" | "atravessa" | "folga", motivo: "..." }]`, o mesmo vocabulário,
 * para qualquer par de partes da malha, de passo cru ou de forma: o relato o confere como confere o `contato` da forma, e mostra o
 * motivo. O par cuja parte não existe na malha da opção é recusado.
 *
 * TUDO PELA MALHA QUE O NÚCLEO GEROU. A forma é executada sozinha pelo executor, já girada, e a caixa e a malha dela são as que o
 * atalho lê. A forma vira parte por `parte` com a seleção da origem do gerador, e anda por `transladar`, gira por `rotaciona`, se
 * repete por `arranja` e se espelha por `espelha`, todos com a seleção da forma. No fim a receita inteira passa pelo executor, e a
 * caixa de cada forma na malha final é conferida contra a que o atalho previu. O que o núcleo não faz volta com o motivo: a forma
 * cujas faces não ficam todas na parte, a que cita forma inexistente, a referência circular, os dois modos de posição juntos, o
 * campo desconhecido, a forma que não toca a outra e o gerador que o núcleo recusa.
 *
 * A OPÇÃO SÓ DE PASSOS CRUS é executada uma vez: sem formas, a receita final é a dos próprios passos crus, e a execução que acha as
 * partes dos crus para o atalho não tem a quem servir.
 *
 * Núcleo puro: nenhum relógio, nenhum sorteio, nenhuma leitura de arquivo. `receitaDaOpcao(opcao)` devolve `{ receita, neutro,
 * partes, facesSemParte, formas, contatos }`, com a receita pronta para o executor e a bancada, a caixa de cada forma em mm e os
 * contatos declarados na opção. */
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { gaiolaPorLacos } from '../../../procedural/nucleo/gaiola-por-lacos.js';
import { gaiolaPorEstacoes } from '../../../procedural/nucleo/gaiola-por-estacoes.js';
import { gaiolaPorRede } from '../../../procedural/nucleo/gaiola-por-rede.js';
import { gaiolaVarrida } from '../../../procedural/nucleo/gaiola-varrida.js';
import { RecusaDoEsboco, recusar } from './erros.js';
import { argsEmMetro, MM, passoEmMetro, pontoEmMetro } from './milimetro.js';
import {
  caixaDosPontos, distanciaAteTocar, EIXOS, girarPonto, juntarMalhas, LADOS, lerSufixo, malhaDoNeutro, pontoDaAncora, transformarMalha,
} from './geometria.js';

export { RecusaDoEsboco, LADOS };
export const AJUDANTES = Object.freeze({ gaiolaPorLacos, gaiolaPorEstacoes, gaiolaPorRede, gaiolaVarrida });
/* Os nomes de cor que os esboços guardados usam (2026-11-09), cada um num tom de bancada; o mais é '#rrggbb'. */
const CORES_POR_NOME = Object.freeze({
  cinza: '#8a9096', preto: '#1c1d20', branco: '#e8eae6', azul: '#3f63b8', verde: '#4f8a52', vermelho: '#b8433b',
  amarelo: '#d8b43a', laranja: '#d97a2b', roxo: '#7a55a8',
});
const CHAVES_DA_FORMA = new Set(['id', 'op', 'args', 'ajudante', 'subdivisao', 'centro', 'por', 'sobre', 'ponta', 'encosta', 'alinha', 'desloca', 'rotacao', 'repete', 'espelha', 'contato', 'oculto', 'cor', 'rotulo']);
const CHAVES_DA_OPCAO = new Set(['titulo', 'nota', 'passos', 'topo', 'aliases', 'formas', 'legendas', 'contatos']);
const CHAVES_DO_CONTATO = new Set(['par', 'relacao', 'motivo']);
export const RELACOES = Object.freeze(['encosta', 'atravessa', 'folga']);
/* a primeira origem livre do atalho: os passos crus usam as menores, e o atalho conta daqui para cima */
const ORIGEM_DO_ATALHO = 1000;
/* a diferença aceita entre a caixa que o atalho previu e a da malha final, em metro */
const CONFERENCIA_DA_CAIXA = 1e-9;

const vetor3 = (v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
const emMm = (c) => c && { min: c.min.map((x) => x * MM), max: c.max.map((x) => x * MM), centro: c.centro.map((x) => x * MM), tamanho: c.tamanho.map((x) => x * MM) };

/** A caixa dos vértices de um neutro, ou só das faces de uma parte, na unidade do neutro. */
export function caixaDaMalha(neutro, parte = null) {
  return caixaDosPontos(malhaDoNeutro(neutro, parte).pts);
}

/* quantas vezes o executor rodou, só para o teste contar as execuções de uma opção */
let execucoes = 0;
export const execucoesDoNucleo = () => execucoes;

/** Executa uma receita pequena e devolve o neutro, ou recusa com os gritos do núcleo. */
function executar(receita, onde) {
  let neutro;
  execucoes += 1;
  try { ({ neutro } = executarReceita(receita)); } catch (erro) { recusar(`o núcleo recusou: ${String(erro.message).split('\n')[0]}`, onde); }
  if (neutro.orfaos?.length) recusar(`o núcleo recusou: ${neutro.orfaos.slice(0, 3).map((o) => `${o.op} ${o.ref ?? ''}: ${o.motivo}`.replace(/ +/g, ' ')).join('; ')}`, onde);
  return neutro;
}

/** As rotações declaradas como lista de { eixo, graus }, na ordem em que se aplicam, e o pivô quando há. */
export function lerRotacao(r, onde) {
  if (r === undefined || r === null) return { giros: [], pivo: null };
  if (Array.isArray(r)) {
    if (!vetor3(r)) recusar('"rotacao" é [rx, ry, rz] em graus', onde);
    return { giros: EIXOS.map((eixo, k) => ({ eixo, graus: r[k] })).filter((g) => g.graus !== 0), pivo: null };
  }
  if (typeof r === 'object' && EIXOS.includes(r.eixo) && Number.isFinite(r.graus ?? r.angulo)) {
    for (const k of Object.keys(r)) if (!['eixo', 'graus', 'angulo', 'pivo'].includes(k)) recusar(`campo "${k}" não existe em "rotacao" (eixo, graus, pivo)`, onde);
    return { giros: [{ eixo: r.eixo, graus: r.graus ?? r.angulo }], pivo: r.pivo ?? null };
  }
  return recusar('"rotacao" é [rx, ry, rz] em graus ou { eixo, graus, pivo? }', onde);
}

const lerLado = (p, campo, onde) => {
  const [id, lado] = Array.isArray(p) ? p : [p?.id, p?.lado];
  if (typeof id !== 'string' || !LADOS.includes(lado)) recusar(`"${campo}" é { id, lado } ou [id, lado], com o lado em ${LADOS.join(', ')}`, onde);
  return { id, lado, k: EIXOS.indexOf(lado[1]), s: lado[0] === '+' ? 1 : -1 };
};

/** "<id>.<âncora>" ou "<id>" (com a âncora padrão) em { id, lados }. */
function lerReferencia(texto, padrao, onde) {
  if (typeof texto !== 'string' || !texto) recusar(`a referência é "<id>" ou "<id>.<âncora>" (veio ${JSON.stringify(texto)})`, onde);
  const i = texto.lastIndexOf('.');
  const [id, sufixo] = i > 0 ? [texto.slice(0, i), texto.slice(i + 1)] : [texto, padrao];
  const lados = lerSufixo(sufixo);
  if (!lados) recusar(`a âncora "${sufixo}" de "${texto}" não existe: é "centro" ou de um a três lados de eixos distintos, como "+y" ou "+y-z"`, onde);
  return { id, lados, sufixo };
}

/** Os contatos declarados na opção, conferidos no formato: `[{ par: [a, b], relacao, motivo }]`, com o par uma vez só. */
function lerContatosDaOpcao(lista, rotulo) {
  if (lista === undefined) return [];
  if (!Array.isArray(lista)) recusar('"contatos" é uma lista de { par: ["<parte>", "<parte>"], relacao, motivo }', rotulo);
  const vistos = new Set();
  return lista.map((c, i) => {
    const onde = `${rotulo}, contatos[${i}]`;
    if (!c || typeof c !== 'object' || Array.isArray(c)) recusar('o contato é { par: ["<parte>", "<parte>"], relacao, motivo }', onde);
    for (const k of Object.keys(c)) if (!CHAVES_DO_CONTATO.has(k)) recusar(`campo "${k}" não existe no contato (aceitos: ${[...CHAVES_DO_CONTATO].join(', ')})`, onde);
    const { par, relacao, motivo } = c;
    if (!Array.isArray(par) || par.length !== 2 || !par.every((n) => typeof n === 'string' && n) || par[0] === par[1]) recusar('"par" são os nomes de duas partes diferentes', onde);
    if (!RELACOES.includes(relacao)) recusar(`"relacao" é ${RELACOES.join(', ')} (veio ${JSON.stringify(relacao)})`, onde);
    if (typeof motivo !== 'string' || !motivo.trim()) recusar('"motivo" é o texto que diz por que as duas partes têm essa relação', onde);
    const chave = [...par].sort().join('|');
    if (vistos.has(chave)) recusar(`o par ${par[0]} e ${par[1]} já foi declarado`, onde);
    vistos.add(chave);
    return { par: [...par], relacao, motivo };
  });
}

/** Os passos que geram a forma (em metro), na origem do gerador, e o TOPO que ela acrescenta. */
function geradorDaForma(f, origemId, onde) {
  if (f.ajudante !== undefined) {
    const ajudante = AJUDANTES[f.ajudante];
    if (!ajudante) recusar(`ajudante "${f.ajudante}" não existe; os ajudantes são ${Object.keys(AJUDANTES).join(', ')}`, onde);
    let r;
    try { r = ajudante(f.args ?? {}); } catch (erro) { recusar(`${f.ajudante} recusou: ${String(erro.message).split('\n')[0]}`, onde); }
    const passo = r.passo ?? Object.fromEntries(['vertices', 'faces', 'vincos', 'cantos', 'medidas'].filter((k) => r[k] !== undefined).map((k) => [k, r[k]]));
    if (!passo.vertices || !passo.faces) recusar(`${f.ajudante} não devolveu um passo de subdivisão (vertices e faces)`, onde);
    /* o ajudante recebe mm e devolve metro; o que a forma acrescenta ao passo é do 2.0, em mm */
    return { passos: [['subdivisao', { origemId, ...passo, ...argsEmMetro('subdivisao', f.subdivisao ?? {}, `${onde}, subdivisao`) }]], op: 'subdivisao', topo: r.pontos ?? {}, origemId };
  }
  if (typeof f.op !== 'string') recusar('a forma precisa de "op" (uma operação geradora do catálogo) ou de "ajudante"', onde);
  const args = argsEmMetro(f.op, { ...(f.args ?? {}) }, `${onde}, ${f.op}`);
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
 * @param {object} opcao  { titulo, nota, passos?, topo?, aliases?, formas? }, em mm.
 * @param {object} [o]    { nome }: o nome da receita (meta.nome).
 * @returns {{ receita, neutro, partes: string[], facesSemParte: number, formas: Array<{id, oculto, caixa, cor, rotulo, contato}> }}
 */
export function receitaDaOpcao(opcao, { nome = null } = {}) {
  const rotulo = `opção "${opcao?.titulo ?? '?'}"`;
  if (!opcao || typeof opcao !== 'object') recusar('a opção precisa ser um objeto', rotulo);
  for (const k of Object.keys(opcao)) if (!CHAVES_DA_OPCAO.has(k)) recusar(`campo "${k}" não existe na opção do esboço 2.0 (aceitos: ${[...CHAVES_DA_OPCAO].join(', ')})`, rotulo);
  const crusMm = opcao.passos ?? [];
  if (!Array.isArray(crusMm)) recusar('"passos" é uma lista de passos do núcleo', rotulo);
  const formas = opcao.formas ?? [];
  if (!Array.isArray(formas)) recusar('"formas" é uma lista', rotulo);
  if (!crusMm.length && !formas.length) recusar('a opção não tem passos nem formas', rotulo);
  const crus = crusMm.map((p, i) => {
    if (!Array.isArray(p) || typeof p[0] !== 'string') recusar(`o passo cru ${i} é [op, args]`, rotulo);
    return passoEmMetro(p, `${rotulo}, passo ${i} "${p[0]}"`);
  });
  const topo = Object.fromEntries(Object.entries(opcao.topo ?? {}).map(([k, p]) => [k, pontoEmMetro(p)]));
  const aliases = opcao.aliases ?? [];
  const contatos = lerContatosDaOpcao(opcao.contatos, rotulo);

  const porId = new Map();
  for (const f of formas) {
    const onde = `${rotulo}, forma "${f?.id ?? '?'}"`;
    if (!f || typeof f.id !== 'string' || !f.id.trim()) recusar('toda forma precisa de "id"', onde);
    if (porId.has(f.id)) recusar('id repetido', onde);
    for (const k of Object.keys(f)) if (!CHAVES_DA_FORMA.has(k)) recusar(`campo "${k}" não existe na forma do esboço 2.0 (aceitos: ${[...CHAVES_DA_FORMA].join(', ')})`, onde);
    if (f.contato !== undefined) {
      if (!f.contato || typeof f.contato !== 'object' || Array.isArray(f.contato)) recusar('"contato" é { "<id>": "encosta" | "atravessa" | "folga" }', onde);
      for (const [outra, rel] of Object.entries(f.contato)) if (!RELACOES.includes(rel)) recusar(`"contato.${outra}" é ${RELACOES.join(', ')} (veio ${JSON.stringify(rel)})`, onde);
    }
    porId.set(f.id, f);
  }

  /* as partes dos passos crus, citáveis pelo nome */
  const doCru = new Map();
  /* sem formas, ninguém cita parte de passo cru, e a execução final, que é a dos mesmos passos, basta */
  if (crus.length && formas.length) {
    const n = executar({ meta: { nome: 'passos-crus' }, PASSOS: crus, ...(Object.keys(topo).length ? { TOPO: topo } : {}), ...(aliases.length ? { ALIASES: aliases } : {}) }, `${rotulo}, passos crus`);
    for (const parte of new Set([...n.F.values()].map((face) => face.parte).filter(Boolean))) {
      if (porId.has(parte)) recusar(`a forma "${parte}" tem o nome de uma parte dos passos crus`, rotulo);
      const malha = malhaDoNeutro(n, parte);
      doCru.set(parte, { malha, caixa: caixaDosPontos(malha.pts), base: malha });
    }
  }

  /* cada forma, uma vez: o gerador, a parte, o giro sem pivô, e a malha local medida no núcleo */
  const locais = new Map();
  let proximaOrigem = ORIGEM_DO_ATALHO;
  for (const f of formas) {
    const onde = `${rotulo}, forma "${f.id}"`;
    const g = geradorDaForma(f, proximaOrigem, onde);
    proximaOrigem += 1;
    for (const nomeDoPonto of Object.keys(g.topo)) {
      if (topo[nomeDoPonto] !== undefined) recusar(`o ponto "${nomeDoPonto}" do ${f.ajudante} já existe no TOPO da opção`, onde);
      topo[nomeDoPonto] = g.topo[nomeDoPonto];
    }
    const passos = [...g.passos, ...selecoesDaParte(g.op, g.origemId).map((sel) => ['parte', { nome: f.id, sel }])];
    const rot = lerRotacao(f.rotacao, onde);
    const executarSo = () => executar({ meta: { nome: 'forma' }, PASSOS: passos, TOPO: g.topo, ALIASES: aliases }, onde);
    let neutro0 = executarSo();
    const semParte = [...neutro0.F.values()].filter((face) => face.parte !== f.id).length;
    if (semParte) recusar(`${semParte} face(s) do ${g.op} ficam fora da seleção da origem; escreva a forma em "passos" com as partes declaradas`, onde);
    if (rot.giros.length && rot.pivo === null) {
      const pivo = caixaDaMalha(neutro0).centro;
      for (const r of rot.giros) passos.push(['rotaciona', { eixo: r.eixo, graus: r.graus, pivo, sel: { grupo: f.id } }]);
      neutro0 = executarSo();
    }
    const malha = malhaDoNeutro(neutro0);
    locais.set(f.id, { passos, malha, local: caixaDosPontos(malha.pts), op: g.op, origemId: g.origemId, rot });
  }

  /* a posição de cada forma pelas que ela cita, com a referência resolvida antes e o ciclo recusado */
  const prontas = new Map();
  const visitando = new Set();
  const resolver = (id, quem) => {
    if (prontas.has(id)) return prontas.get(id);
    if (doCru.has(id)) return doCru.get(id);
    const f = porId.get(id);
    if (!f) recusar(`cita a forma "${id}", que não existe nesta opção (formas: ${[...porId.keys(), ...doCru.keys()].join(', ')})`, `${rotulo}, forma "${quem}"`);
    const onde = `${rotulo}, forma "${id}"`;
    if (visitando.has(id)) recusar('referência circular de posição', onde);
    visitando.add(id);
    const L = locais.get(id);
    const { local } = L;
    const pontoDe = (texto, padrao, campo) => {
      const ref = lerReferencia(texto, padrao, `${onde}, ${campo}`);
      return pontoDaAncora(resolver(ref.id, id).caixa, ref.lados);
    };
    const modos = ['centro', 'sobre', 'ponta', 'encosta'].filter((k) => f[k] !== undefined);
    if (modos.length > 1) recusar('use só um entre "centro", "sobre", "ponta" e "encosta"', onde);
    if (f.por !== undefined && f.centro === undefined) recusar('"por" acompanha "centro": é a âncora da própria forma que vai ao ponto', onde);
    let alvo = [...local.centro]; // onde vai o centro da caixa
    let toque = null;
    if (f.centro !== undefined) {
      const ponto = typeof f.centro === 'string' ? pontoDe(f.centro, 'centro', 'centro') : (vetor3(f.centro) ? pontoEmMetro(f.centro) : recusar('"centro" é [x, y, z] em mm ou "<id>.<âncora>"', onde));
      const por = f.por === undefined ? {} : lerSufixo(f.por);
      if (!por) recusar(`"por" é uma âncora da própria forma ("centro", "+y", "-y+z", ...); veio ${JSON.stringify(f.por)}`, onde);
      const desvio = pontoDaAncora(local, por).map((x, k) => x - local.centro[k]);
      alvo = ponto.map((x, k) => x - desvio[k]);
    } else if (f.sobre !== undefined) {
      if (typeof f.sobre !== 'string') recusar('"sobre" é o id de outra forma', onde);
      const c = resolver(f.sobre, id).caixa;
      alvo = [c.centro[0], c.max[1] + local.tamanho[1] / 2, c.centro[2]];
    } else if (f.ponta !== undefined || f.encosta !== undefined) {
      const campo = f.ponta !== undefined ? 'ponta' : 'encosta';
      const { id: idAlvo, k, s } = lerLado(f[campo], campo, onde);
      const c = resolver(idAlvo, id).caixa;
      alvo = [...c.centro];
      alvo[k] = s > 0 ? c.max[k] + local.tamanho[k] / 2 : c.min[k] - local.tamanho[k] / 2;
      if (campo === 'encosta') toque = { idAlvo, k, s };
    }
    if (f.alinha !== undefined) {
      if (!f.alinha || typeof f.alinha !== 'object' || Array.isArray(f.alinha)) recusar('"alinha" é { "<lado>": "<id>" | "<id>.<âncora>" }, com o lado em +x, -x, ... ou x, y, z para o centro', onde);
      const usados = new Set();
      for (const [lado, ref] of Object.entries(f.alinha)) {
        const centro = EIXOS.includes(lado);
        if (!centro && !LADOS.includes(lado)) recusar(`"alinha.${lado}": o lado é ${LADOS.join(', ')} ou x, y, z (o centro)`, onde);
        const k = EIXOS.indexOf(centro ? lado : lado[1]);
        if (usados.has(k)) recusar(`"alinha" cita o eixo ${EIXOS[k]} duas vezes`, onde);
        if (toque && toque.k === k) recusar(`"alinha" no eixo ${EIXOS[k]}, que é o do "encosta": o toque decide esse eixo`, onde);
        usados.add(k);
        const coord = pontoDe(ref, centro ? 'centro' : lado, `alinha.${lado}`)[k];
        alvo[k] = centro ? coord : lado[0] === '+' ? coord - local.tamanho[k] / 2 : coord + local.tamanho[k] / 2;
      }
    }
    let desloca = [0, 0, 0];
    if (f.desloca !== undefined) {
      if (!vetor3(f.desloca)) recusar('"desloca" é [dx, dy, dz] em mm', onde);
      desloca = pontoEmMetro(f.desloca);
    }
    if (toque) {
      /* o alinhamento e o desloca dos outros eixos antes do toque; o desloca no eixo do toque depois, como folga */
      const antes = alvo.map((x, k) => (k === toque.k ? x : x + desloca[k]));
      const d0 = antes.map((x, k) => x - local.centro[k]);
      const movel = transformarMalha(L.malha, (p) => p.map((x, k) => x + d0[k]));
      const outra = resolver(toque.idAlvo, id).malha;
      const anda = distanciaAteTocar(movel, outra, EIXOS[toque.k], -toque.s);
      if (anda === null) recusar(`"encosta" em "${toque.idAlvo}" pelo lado ${toque.s > 0 ? '+' : '-'}${EIXOS[toque.k]}: a forma passa ao lado dela e não toca (as duas não se cruzam na projeção do eixo ${EIXOS[toque.k]})`, onde);
      alvo = antes.map((x, k) => (k === toque.k ? x - toque.s * anda + desloca[k] : x));
    } else {
      alvo = alvo.map((x, k) => x + desloca[k]);
    }
    const d = alvo.map((x, k) => x - local.centro[k]);
    let malha = transformarMalha(L.malha, (p) => p.map((x, k) => x + d[k]));
    /* o giro com pivô, depois da posição */
    let pivo = null;
    if (L.rot.pivo !== null) {
      const caixaPosta = caixaDosPontos(malha.pts);
      if (typeof L.rot.pivo === 'string') {
        const ref = lerReferencia(L.rot.pivo, 'centro', `${onde}, rotacao.pivo`);
        pivo = pontoDaAncora(ref.id === id ? caixaPosta : resolver(ref.id, id).caixa, ref.lados);
      } else if (vetor3(L.rot.pivo)) pivo = pontoEmMetro(L.rot.pivo);
      else recusar('"rotacao.pivo" é "<id>.<âncora>" ou [x, y, z] em mm', onde);
      for (const r of L.rot.giros) malha = transformarMalha(malha, (p) => girarPonto(p, pivo, r.eixo, r.graus));
    }
    const base = malha;
    /* as cópias: o arranjo e depois o espelho */
    const extras = [];
    let repete = null;
    if (f.repete !== undefined) {
      const r = f.repete;
      if (!r || typeof r !== 'object' || !Number.isInteger(r.total) || r.total < 2) recusar('"repete" é { total, d } ou { total, eixo, graus | volta, pivo? }, com total inteiro >= 2 contando a forma', onde);
      if (L.op === 'cilindro') recusar('o "repete" é o arranja do núcleo, que cita a origem do gerador, e a origem do cilindro são só as laterais: repita a extrusao de { circulo }', onde);
      if (r.d !== undefined) {
        if (!vetor3(r.d) || r.eixo !== undefined || r.graus !== undefined || r.volta !== undefined || r.pivo !== undefined) recusar('o "repete" linear é { total, d: [dx, dy, dz] } em mm, sem eixo, graus, volta nem pivo', onde);
        const dm = pontoEmMetro(r.d);
        repete = { modo: 'linear', total: r.total, d: dm };
        for (let c = 1; c < r.total; c += 1) extras.push(transformarMalha(base, (p) => p.map((x, k) => x + c * dm[k])));
      } else {
        if (!EIXOS.includes(r.eixo) || (r.graus === undefined) === (r.volta === undefined)) recusar('o "repete" radial é { total, eixo, graus | volta, pivo? }, com exatamente um entre graus e volta', onde);
        const passo = r.volta !== undefined ? r.volta / r.total : r.graus;
        const pv = r.pivo === undefined ? [0, 0, 0] : typeof r.pivo === 'string' ? pontoDe(r.pivo, 'centro', 'repete.pivo') : vetor3(r.pivo) ? pontoEmMetro(r.pivo) : recusar('"repete.pivo" é "<id>.<âncora>" ou [x, y, z] em mm', onde);
        repete = { modo: 'radial', total: r.total, eixo: r.eixo, ...(r.volta !== undefined ? { volta: r.volta } : { graus: r.graus }), pivo: pv };
        for (let c = 1; c < r.total; c += 1) extras.push(transformarMalha(base, (p) => girarPonto(p, pv, r.eixo, c * passo)));
      }
    }
    let espelho = null;
    if (f.espelha !== undefined) {
      const e = typeof f.espelha === 'string' ? { eixo: f.espelha } : f.espelha;
      if (!e || !EIXOS.includes(e.eixo) || (e.pos !== undefined && e.em !== undefined)) recusar('"espelha" é "x" | "y" | "z" ou { eixo, pos } (mm) ou { eixo, em: "<id>" | "<id>.<âncora>" }', onde);
      const k = EIXOS.indexOf(e.eixo);
      const pos = e.em !== undefined ? pontoDe(e.em, 'centro', 'espelha.em')[k] : e.pos !== undefined ? (Number.isFinite(e.pos) ? e.pos / MM : recusar('"espelha.pos" é um número em mm', onde)) : 0;
      espelho = { eixo: e.eixo, pos };
      const ate = juntarMalhas([base, ...extras]);
      extras.push(transformarMalha(ate, (p) => { const q = [...p]; q[k] = 2 * pos - q[k]; return q; }));
    }
    const final = juntarMalhas([base, ...extras]);
    const r = { id, d, pivo, repete, espelho, malha: final, caixa: caixaDosPontos(final.pts) };
    visitando.delete(id);
    prontas.set(id, r);
    return r;
  };
  for (const f of formas) resolver(f.id, f.id);

  const PASSOS = [...crus];
  const partes = [];
  for (const f of formas) {
    if (f.oculto === true) continue;
    const L = locais.get(f.id);
    const { d, pivo, repete, espelho } = prontas.get(f.id);
    const sel = { grupo: f.id };
    PASSOS.push(...L.passos);
    if (d.some((x) => Math.abs(x) > 1e-15)) PASSOS.push(['transladar', { d, sel }]);
    if (pivo) for (const r of L.rot.giros) PASSOS.push(['rotaciona', { eixo: r.eixo, graus: r.graus, pivo, sel }]);
    if (repete) {
      const origem = { op: L.op, id: L.origemId };
      PASSOS.push(['arranja', { origemId: proximaOrigem, ...repete, derivaDe: origem, sel: { origem } }]);
      proximaOrigem += 1;
    }
    if (espelho) PASSOS.push(['espelha', { eixo: espelho.eixo, pos: espelho.pos, sel }]);
    partes.push(f.id);
  }
  /* A COR DA FORMA VIRA MATERIAL. O campo `cor` era aceito e só seguia para o relato, e a captura sorteava uma cor por parte que
     mudava entre opções (2026-11-09, esboço do retrovisor do furgão). Agora a forma com `cor` ganha um material liso dessa cor, e a
     captura com cor de material (`--sem-cores`, ou sozinha quando alguma forma declara cor) a mostra igual em todas as opções. */
  const MATERIAIS = {};
  for (const f of formas) {
    if (f.cor === undefined || f.cor === null) continue;
    const hex = typeof f.cor === 'string' ? (CORES_POR_NOME[f.cor] ?? f.cor) : null;
    if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) recusar(`'cor' precisa ser '#rrggbb' ou um de ${Object.keys(CORES_POR_NOME).join(', ')}; veio ${JSON.stringify(f.cor)}`, `${rotulo}, forma "${f.id}"`);
    MATERIAIS[`cor-${f.id}`] = { cor: hex.toLowerCase() };
    PASSOS.push(['material', { sel: { grupo: f.id }, usa: `cor-${f.id}` }]);
  }
  const receita = { meta: { nome: nome ?? (opcao.titulo ?? 'opcao') }, PASSOS, ...(Object.keys(MATERIAIS).length ? { MATERIAIS } : {}), ...(Object.keys(topo).length ? { TOPO: topo } : {}), ...(aliases.length ? { ALIASES: aliases } : {}) };
  /* a receita inteira passa pelo executor, que é a conferência final: o que o núcleo não faz volta aqui com o motivo */
  const neutro = executar(receita, formas.length ? rotulo : `${rotulo}, passos crus`);
  for (const id of partes) {
    const prevista = prontas.get(id).caixa; const naMalha = caixaDaMalha(neutro, id);
    const dif = naMalha ? Math.max(...[0, 1, 2].flatMap((k) => [Math.abs(prevista.min[k] - naMalha.min[k]), Math.abs(prevista.max[k] - naMalha.max[k])])) : Infinity;
    if (!(dif <= CONFERENCIA_DA_CAIXA)) recusar(`a caixa que o atalho previu não confere com a da malha final (diferença de ${(dif * MM).toFixed(6)} mm); uma forma posterior mexeu nesta ou o atalho errou`, `${rotulo}, forma "${id}"`);
  }
  const nomes = new Set(partes);
  let facesSemParte = 0;
  for (const face of neutro.F.values()) { if (face.parte) nomes.add(face.parte); else facesSemParte += 1; }
  for (const c of contatos) for (const n of c.par) if (!nomes.has(n)) recusar(`"contatos" cita a parte "${n}", que não está na malha desta opção (partes: ${[...nomes].join(', ')})`, rotulo);
  return {
    receita, neutro, partes: [...nomes], facesSemParte, contatos,
    formas: formas.map((f) => ({ id: f.id, oculto: f.oculto === true, caixa: emMm(prontas.get(f.id).caixa), cor: f.cor ?? null, rotulo: f.rotulo ?? null, contato: { ...(f.contato ?? {}), ...(f.encosta !== undefined ? { [lerLado(f.encosta, 'encosta', '').id]: 'encosta' } : {}) } })),
  };
}

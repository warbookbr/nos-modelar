/* arvore.js — a hierarquia de uma montagem com articulação, em dados puros: cada junta vira um nó vazio posto no pivô dela, com o
   eixo dela como o eixo +Y local do nó (o eixo "para cima" do glTF, que o Blender importa como o +Z do objeto), e cada peça que a
   junta move fica filha desse nó. Girar o nó em torno do +Y local gira a peça, e o que ela carrega, em torno do eixo da junta.
   Sem a malha, sem o resolvedor da montagem: recebe as poses de mundo (rotacao 3x3, deslocamento em metro) e devolve as locais. */
import { ErroExportacaoGltf } from './gerar-gltf.js';

const IDENTIDADE = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const norma = (v) => Math.hypot(v[0], v[1], v[2]);
const aplicar = (m, v) => [0, 1, 2].map((i) => m[i][0] * v[0] + m[i][1] * v[1] + m[i][2] * v[2]);
const transposta = (m) => [0, 1, 2].map((i) => [0, 1, 2].map((j) => m[j][i]));
const multiplicar = (a, b) => [0, 1, 2].map((i) => [0, 1, 2].map((j) => a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j]));

export const compor = (a, b) => ({ rotacao: multiplicar(a.rotacao, b.rotacao), deslocamento: aplicar(a.rotacao, b.deslocamento).map((x, i) => x + a.deslocamento[i]) });
export const inverter = (p) => { const t = transposta(p.rotacao); return { rotacao: t, deslocamento: aplicar(t, p.deslocamento).map((x) => -x) }; };

/** A rotação que leva o +Y ao vetor dado (unitário ou não), pelo menor giro; o oposto de +Y gira 180° em torno de +X. */
export function rotacaoDeYPara(vetor) {
  const n = norma(vetor);
  if (!(n > 1e-12)) throw new ErroExportacaoGltf('eixo-nulo', 'O eixo da junta é o vetor nulo.', { eixo: vetor });
  const [x, y, z] = vetor.map((c) => c / n);
  if (y < -1 + 1e-9) return [[1, 0, 0], [0, -1, 0], [0, 0, -1]];
  /* Rodrigues de a = +Y para b: v = a×b = (z, 0, -x), cosseno y, R = I + [v]x + [v]x² / (1 + y) */
  const k = 1 / (1 + y);
  return [
    [1 - x * x * k, x, -x * z * k],
    [-x, 1 - (x * x + z * z) * k, -z],
    [-x * z * k, z, 1 - z * z * k],
  ];
}

/** O quaternião [x, y, z, w] (unitário, w ≥ 0) da rotação 3x3. */
export function quaternioDe(r) {
  const tr = r[0][0] + r[1][1] + r[2][2];
  let q;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; q = [(r[2][1] - r[1][2]) / s, (r[0][2] - r[2][0]) / s, (r[1][0] - r[0][1]) / s, s / 4]; }
  else if (r[0][0] > r[1][1] && r[0][0] > r[2][2]) { const s = Math.sqrt(1 + r[0][0] - r[1][1] - r[2][2]) * 2; q = [s / 4, (r[0][1] + r[1][0]) / s, (r[0][2] + r[2][0]) / s, (r[2][1] - r[1][2]) / s]; }
  else if (r[1][1] > r[2][2]) { const s = Math.sqrt(1 + r[1][1] - r[0][0] - r[2][2]) * 2; q = [(r[0][1] + r[1][0]) / s, s / 4, (r[1][2] + r[2][1]) / s, (r[0][2] - r[2][0]) / s]; }
  else { const s = Math.sqrt(1 + r[2][2] - r[0][0] - r[1][1]) * 2; q = [(r[0][2] + r[2][0]) / s, (r[1][2] + r[2][1]) / s, s / 4, (r[1][0] - r[0][1]) / s]; }
  const m = Math.hypot(...q);
  const sinal = q[3] < 0 ? -1 : 1;
  return q.map((c) => (sinal * c) / m);
}

const arredonda = (v, casas = 9) => { const f = 10 ** casas; return Math.round(v * f) / f + 0; };

/** O TRS do nó (translation e rotation, sem o que é identidade) de uma pose local. */
export function trsDaPose(pose) {
  const q = quaternioDe(pose.rotacao).map((c) => arredonda(c));
  const t = pose.deslocamento.map((c) => arredonda(c));
  const identidade = q[0] === 0 && q[1] === 0 && q[2] === 0 && q[3] === 1;
  return { ...(t.some((c) => c !== 0) ? { translation: t } : {}), ...(identidade ? {} : { rotation: q }) };
}

const pertence = (conjunto, nome) => conjunto.includes(nome);

/**
 * As juntas lidas: `[{ id, tipo, eixo, centro, fixo, moveis, curso? }]`, com o eixo e o centro no mundo (metro) na pose de repouso. Devolve, por nó de junta
 * (`junta-<id>`), a pose de mundo, o pai (outro nó de junta ou a raiz) e, por instância, a junta que a leva (a menor das que a movem), mais as poses locais.
 */
export function arvoreDasJuntas(juntas, instancias) {
  const nomes = new Set(instancias.map((i) => i.nome));
  const ids = new Set();
  const lidas = juntas.map((j) => {
    if (!j || typeof j.id !== 'string' || !j.id) throw new ErroExportacaoGltf('junta-invalida', 'Toda junta precisa de um id em texto.', { junta: j });
    if (ids.has(j.id)) throw new ErroExportacaoGltf('junta-duplicada', `Duas juntas se chamam '${j.id}'.`, { id: j.id });
    ids.add(j.id);
    if (j.tipo !== 'revolucao' && j.tipo !== 'prismatica') throw new ErroExportacaoGltf('junta-invalida', `A junta '${j.id}' tem tipo '${j.tipo}'; aceitos: revolucao, prismatica.`, { id: j.id });
    for (const campo of ['eixo', 'centro']) {
      if (!Array.isArray(j[campo]) || j[campo].length !== 3 || j[campo].some((c) => !Number.isFinite(c))) throw new ErroExportacaoGltf('junta-invalida', `A junta '${j.id}' precisa de ${campo} com três números (no mundo, em metro).`, { id: j.id });
    }
    for (const nome of [j.fixo, ...j.moveis]) if (!nomes.has(nome)) throw new ErroExportacaoGltf('junta-invalida', `A junta '${j.id}' cita a instância '${nome}', que a montagem não tem.`, { id: j.id, instancia: nome });
    const eixo = j.eixo.map((c) => c / norma(j.eixo));
    return { ...j, eixo, no: `junta-${j.id}`, mundo: { rotacao: rotacaoDeYPara(eixo), deslocamento: j.centro } };
  });
  for (const j of lidas) if (nomes.has(j.no)) throw new ErroExportacaoGltf('no-duplicado', `Uma instância se chama '${j.no}', nome do nó da junta '${j.id}'.`, { nome: j.no });

  const menorQue = (candidatas) => {
    const ordenadas = [...candidatas].sort((a, b) => a.moveis.length - b.moveis.length);
    if (ordenadas.length > 1 && ordenadas[0].moveis.length === ordenadas[1].moveis.length) {
      throw new ErroExportacaoGltf('juntas-ambiguas', `As juntas '${ordenadas[0].id}' e '${ordenadas[1].id}' movem as mesmas peças; a hierarquia não diz qual leva qual.`, { juntas: [ordenadas[0].id, ordenadas[1].id] });
    }
    return ordenadas[0] ?? null;
  };
  const paiDaInstancia = new Map(instancias.map((i) => [i.nome, menorQue(lidas.filter((j) => pertence(j.moveis, i.nome)))]));
  const paiDaJunta = new Map(lidas.map((j) => [j.id, menorQue(lidas.filter((k) => k !== j && pertence(k.moveis, j.fixo)))]));
  const mundoDoNo = new Map([...instancias.map((i) => [i.nome, i.pose]), ...lidas.map((j) => [j.no, j.mundo])]);
  const local = (nome, pai) => (pai ? compor(inverter(mundoDoNo.get(pai.no)), mundoDoNo.get(nome)) : mundoDoNo.get(nome));
  return {
    juntas: lidas,
    pais: new Map([...paiDaInstancia].filter(([, p]) => p).map(([nome, p]) => [nome, p.no]).concat(lidas.filter((j) => paiDaJunta.get(j.id)).map((j) => [j.no, paiDaJunta.get(j.id).no]))),
    posesLocais: new Map([...instancias.map((i) => [i.nome, local(i.nome, paiDaInstancia.get(i.nome))]), ...lidas.map((j) => [j.no, local(j.no, paiDaJunta.get(j.id))])]),
  };
}

export { IDENTIDADE };

/* vincos-da-malha.js — os vincos nomeados que os passos `subdivisao` declaram, onde eles ficaram na malha entregue.
 *
 * São a dobra que a forma pede, e a curvatura da lataria tira a lataria junto deles da escala da cor: no Blender pelo `--vincos` de
 * `tools/blender/curvatura-da-lataria.py`, que as vistas obrigatórias do pacote do crítico recebem de `tools/modelar/vistas-de-superficie.mjs`,
 * e na bancada por `curvaturaDaLataria` (`curvatura-da-lataria.js`). Mora aqui, e não junto das vistas do Blender, porque a bancada
 * roda no navegador e precisa da mesma lista; não lê disco nem conhece a bancada. */
import { executarReceita } from './executar-receita.js';
import { criarResolverNumerico } from '../../procedural/nucleo/expressoes.js';
import { idDoPasso } from '../../procedural/nucleo/nucleo.js';
import { gaiolaDoPasso } from '../../procedural/nucleo/operacoes/subdivisao.js';
import { subdividirCatmullClark } from '../../procedural/nucleo/subdivisao.js';

const chaveDaAresta = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);
const operacaoDe = (passo) => (Array.isArray(passo) ? passo[0] : passo?.op);
const argumentosDe = (passo) => (Array.isArray(passo) ? passo[1] ?? {} : passo ?? {});

function distanciaAoSegmento(p, a, b) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const L = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
  const t = L > 0 ? Math.min(1, Math.max(0, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / L)) : 0;
  return Math.hypot(ap[0] - t * ab[0], ap[1] - t * ab[1], ap[2] - t * ab[2]);
}

/**
 * Os vincos nomeados dos passos `subdivisao` (os da gaiola declarada e os que a rede ou as estações escrevem no passo), onde eles
 * ficaram na malha entregue: `[{ passo, nome, viva, segmentos: [[p, q], ...] }]`, em metro, ordenados por passo e nome. Os
 * segmentos são as arestas da malha final que descendem de um vinco de nitidez maior que zero (`subdividirCatmullClark` com
 * `comVincos`), com a posição que o estado da receita deu aos vértices, de modo que um passo posterior que mova a chapa os leva
 * junto; a aresta cujo vértice um passo posterior tirou fica de fora. Cada aresta leva o nome do vinco declarado cujo trecho da
 * gaiola fica mais perto do meio dela (na simetria em x, a imagem espelhada leva o mesmo nome). É a feição que a forma pede, e a
 * curvatura da lataria a tira da escala dela (`curvatura-da-lataria.py --vincos`).
 *
 * Com `comIds`, cada item leva também `ids: [[a, b], ...]`, os ids dos vértices do estado neutro nas pontas de cada segmento, na
 * ordem de `segmentos`: a bancada refaz a curvatura depois de cada edição, que move os vértices sem mudar os ids, e com eles tira
 * os segmentos da malha editada sem subdividir a gaiola de novo.
 */
export function vincosDaMalha(receita, executada = executarReceita(receita), { comIds = false } = {}) {
  const { entrada, neutro } = executada;
  const dict = { ...entrada.PARAMS, ...entrada.TOPO };
  const { num } = criarResolverNumerico(dict);
  const vec = (a) => (typeof a === 'string' ? dict[a] : a).map(num);
  const saida = [];
  (entrada.PASSOS ?? []).forEach((passo, i) => {
    const args = argumentosDe(passo);
    if (operacaoDe(passo) !== 'subdivisao' || !Array.isArray(args.vincos) || !args.vincos.length) return;
    const resolvida = gaiolaDoPasso(args, { vec, num });
    if (resolvida.erro) throw new Error(`vincosDaMalha: o passo ${i} (subdivisao) não resolve a gaiola: ${resolvida.erro[1]}`);
    const { gaiola, declarados } = resolvida;
    /* os trechos da gaiola de cada vinco nomeado, com as imagens espelhadas */
    const indiceDoNome = new Map(declarados.map((d, k) => [d, k]).filter(([d]) => typeof d === 'string'));
    const trechos = [];
    for (const v of args.vincos) {
      if (!v || typeof v !== 'object' || !Array.isArray(v.pontos)) continue;
      const ids = v.pontos.map((p) => indiceDoNome.get(p));
      for (let k = 0; k + 1 < ids.length; k++) {
        const pares = [[ids[k], ids[k + 1]]];
        if (gaiola.imagem) pares.push([gaiola.imagem[ids[k]], gaiola.imagem[ids[k + 1]]]);
        for (const [a, b] of pares) trechos.push({ nome: v.nome, a: gaiola.vertices[a], b: gaiola.vertices[b] });
      }
    }
    const r = subdividirCatmullClark({ ...gaiola, niveis: Math.trunc(num(args.niveis ?? 2)), borda: args.borda ?? 'suave', aoLimite: args.medidas != null, comVincos: true });
    const porNome = new Map();
    const vistas = new Set();
    for (const [a, b, viva] of r.vincos) {
      const chave = chaveDaAresta(a, b);
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      const p = neutro.V.get(idDoPasso(i, a));
      const q = neutro.V.get(idDoPasso(i, b));
      if (!p || !q) continue;
      const meio = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
      let nome = null;
      let perto = Infinity;
      for (const t of trechos) {
        const d = distanciaAoSegmento(meio, t.a, t.b);
        if (d < perto) { perto = d; nome = t.nome; }
      }
      if (!porNome.has(nome)) porNome.set(nome, { passo: i, nome, viva: true, segmentos: [], ...(comIds ? { ids: [] } : {}) });
      const item = porNome.get(nome);
      item.viva &&= Boolean(viva);
      item.segmentos.push([[...p], [...q]]);
      if (comIds) item.ids.push([idDoPasso(i, a), idDoPasso(i, b)]);
    }
    saida.push(...[...porNome.values()].sort((x, y) => (x.nome < y.nome ? -1 : x.nome > y.nome ? 1 : 0)));
  });
  return saida;
}

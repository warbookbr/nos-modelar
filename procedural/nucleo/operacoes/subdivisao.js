/* subdivisao.js (operação) — gera uma superfície Catmull-Clark com vincos a partir de uma gaiola declarada.
   A geometria sai de `procedural/nucleo/subdivisao.js`, função pura. */
import { subdividirCatmullClark, espelharGaiolaEmX, NITIDEZ_INFINITA } from '../subdivisao.js';

export function criarOperacoesSubdivisao({ BLOCO, FAIXA_ESTENDIDA, idDoPasso, confereId, grita, addV, addF, registraOrigem }) {
  return {
  subdivisao(st, a, i) {
    confereId(st, i, 'subdivisao', a);
    if (a.origemId != null && (!Number.isSafeInteger(a.origemId) || a.origemId < 0)) return grita(st, i, 'subdivisao', 'origemId', 'origemId precisa ser inteiro não-negativo');
    let gaiola; let soltos = [];
    try {
      const vertices = (a.vertices ?? []).map((p) => st.vec(p));
      const faces = a.faces ?? [];
      /* vinco: [a, b] é vivo (nitidez infinita); [a, b, nitidez] é semiagudo, em níveis (OpenSubdiv). */
      const vincos = (a.vincos ?? []).map((v) => (Array.isArray(v) && v.length === 2 ? [v[0], v[1], NITIDEZ_INFINITA] : [v[0], v[1], st.num(v[2])]));
      gaiola = { vertices, faces, vincos, cantos: a.cantos ?? [] };
      const usados = new Set(faces.flatMap((f) => (Array.isArray(f) ? f : [])));
      soltos = vertices.map((p, k) => (usados.has(k) ? null : (typeof a.vertices[k] === 'string' ? `'${a.vertices[k]}'` : `[${p.join(', ')}]`))).filter((x) => x !== null);
      if (a.simetria === 'x') gaiola = espelharGaiolaEmX(gaiola);
      else if (a.simetria != null) return grita(st, i, 'subdivisao', 'simetria', "simetria só aceita 'x'");
    } catch (e) { return grita(st, i, 'subdivisao', 'vertices', String(e.message)); }
    /* Vértice sem face não pertence a nenhuma superfície: grita com o nome do ponto (ou a posição, se foi escrito como
       número), em vez de sair como vértice solto na malha. */
    if (soltos.length) return grita(st, i, 'subdivisao', 'vertices', `${soltos.length === 1 ? 'o vértice' : 'os vértices'} ${soltos.join(', ')} da gaiola ${soltos.length === 1 ? 'não pertence' : 'não pertencem'} a nenhuma face`);
    let r;
    try {
      r = subdividirCatmullClark({ ...gaiola, niveis: Math.trunc(st.num(a.niveis ?? 2)), borda: a.borda ?? 'suave' });
    } catch (e) { return grita(st, i, 'subdivisao', 'gaiola', String(e.message)); }
    const limite = BLOCO + FAIXA_ESTENDIDA;
    if (r.vertices.length > limite || r.faces.length > limite) return grita(st, i, 'subdivisao', 'niveis', `a subdivisão gera ${r.vertices.length} vértices e ${r.faces.length} faces, acima do limite do passo (${limite})`);
    r.vertices.forEach((p, k) => addV(st, idDoPasso(i, k), p));
    const faces = r.faces.map((f, k) => { const id = idDoPasso(i, k); addF(st, id, f.map((v) => idDoPasso(i, v))); return id; });
    if (a.origemId != null) registraOrigem(st, i, 'subdivisao', a.origemId, { faces });
  },
  };
}

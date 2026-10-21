/* subdivisao.js (operação) — gera uma superfície Catmull-Clark com vincos a partir de uma gaiola declarada.
   A geometria sai de `procedural/nucleo/subdivisao.js`, função pura. */
import { subdividirCatmullClark, espelharGaiolaEmX, ajustarGaiolaAsMedidas, NITIDEZ_INFINITA } from '../subdivisao.js';

export function criarOperacoesSubdivisao({ BLOCO, FAIXA_ESTENDIDA, idDoPasso, confereId, grita, addV, addF, registraOrigem }) {
  return {
  subdivisao(st, a, i) {
    confereId(st, i, 'subdivisao', a);
    if (a.origemId != null && (!Number.isSafeInteger(a.origemId) || a.origemId < 0)) return grita(st, i, 'subdivisao', 'origemId', 'origemId precisa ser inteiro não-negativo');
    let gaiola; let soltos = [];
    const declarados = a.vertices ?? [];
    try {
      const vertices = declarados.map((p) => st.vec(p));
      const faces = a.faces ?? [];
      /* vinco: [a, b] é vivo (nitidez infinita); [a, b, nitidez] é semiagudo, em níveis (OpenSubdiv). */
      const vincos = (a.vincos ?? []).map((v) => (Array.isArray(v) && v.length === 2 ? [v[0], v[1], NITIDEZ_INFINITA] : [v[0], v[1], st.num(v[2])]));
      gaiola = { vertices, faces, vincos, cantos: a.cantos ?? [] };
      const usados = new Set(faces.flatMap((f) => (Array.isArray(f) ? f : [])));
      soltos = vertices.map((p, k) => (usados.has(k) ? null : (typeof declarados[k] === 'string' ? `'${declarados[k]}'` : `[${p.join(', ')}]`))).filter((x) => x !== null);
      if (a.simetria === 'x') gaiola = espelharGaiolaEmX(gaiola);
      else if (a.simetria != null) return grita(st, i, 'subdivisao', 'simetria', "simetria só aceita 'x'");
    } catch (e) { return grita(st, i, 'subdivisao', 'vertices', String(e.message)); }
    /* Vértice sem face não pertence a nenhuma superfície: grita com o nome do ponto (ou a posição, se foi escrito como
       número), em vez de sair como vértice solto na malha. */
    if (soltos.length) return grita(st, i, 'subdivisao', 'vertices', `${soltos.length === 1 ? 'o vértice' : 'os vértices'} ${soltos.join(', ')} da gaiola ${soltos.length === 1 ? 'não pertence' : 'não pertencem'} a nenhuma face`);
    /* medidas: nomes de ponto da gaiola que a superfície limite atravessa; os outros pontos ficam onde foram declarados.
       Na simetria em x, a imagem espelhada de um ponto medido também é medida. */
    if (a.medidas != null) {
      if (!Array.isArray(a.medidas) || !a.medidas.length || a.medidas.some((m) => typeof m !== 'string')) return grita(st, i, 'subdivisao', 'medidas', 'medidas precisa ser lista não vazia de nomes de ponto da gaiola');
      const indices = [];
      for (const nome of a.medidas) {
        const achados = declarados.flatMap((v, k) => (v === nome ? [k] : []));
        if (!achados.length) return grita(st, i, 'subdivisao', 'medidas', `a medida '${nome}' não é ponto declarado da gaiola`);
        indices.push(...achados);
      }
      const origem = gaiola.vertices.map((_, k) => k);
      if (gaiola.imagem) gaiola.imagem.forEach((k, j) => { origem[k] = j; });
      const marcados = gaiola.imagem ? [...indices, ...indices.map((k) => gaiola.imagem[k])] : indices;
      try {
        gaiola = { ...gaiola, vertices: ajustarGaiolaAsMedidas({ ...gaiola, borda: a.borda ?? 'suave' }, marcados).vertices };
      } catch (e) {
        if (!e.indices) return grita(st, i, 'subdivisao', 'medidas', String(e.message));
        const nomes = [...new Set(e.indices.map((k) => origem[k]))].map((k) => (typeof declarados[k] === 'string' ? `'${declarados[k]}'` : `[${gaiola.vertices[k].join(', ')}]`));
        return grita(st, i, 'subdivisao', 'medidas', `${e.motivo}: ${nomes.join(', ')}`);
      }
    }
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

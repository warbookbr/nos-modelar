/* limpar-lascas.js (operação) — `limparLascas`: tira de uma seleção as faces finas que uma booleana deixou, sem criar vértice nem face
   e sem mover a superfície além de `tolerancia`. O cálculo é de `../limpar-lascas.js` (função pura); aqui só se lê a seleção, se
   confere o argumento, se aplica o resultado ao estado e se corrigem as referências que apontavam para o que sumiu.

   QUANDO USAR. Logo depois de um `subtrair`, `unir`, `intersectar` ou `arredondarCostura` de chapa subdividida, com a origem da
   booleana como seleção: `['limparLascas', { sel: { origem: { op: 'subtrair', id: 3 } }, tolerancia: 0.00001 }]`. A tolerância é na
   unidade da peça (10 µm são 0,00001 numa receita em metro, 0,01 num esboço em mm). Os passos que citam a origem da booleana depois
   continuam valendo: a face que sumiu sai das listas da origem e o par de vértices da costura (`arestas`) acompanha a fusão.

   O QUE ELE FAZ, em ordem: troca a diagonal do par de triângulos em volta de uma lasca quando isso a desfaz, colapsa a aresta curta
   dela (o vértice de menor id fica, na posição que menos sai dos planos das faces boas que o vértice tinha), e junta a lasca à face
   vizinha quando o resultado continua convexo. Cada uma só vale com a malha fechada, sem face virada, sem lasca nova, com a parte
   ainda tendo face e a posição a no máximo `tolerancia` dos planos de ENTRADA (as fusões em cadeia não somam desvio).

   O QUE FICA. A lasca que já vinha da entrada (a tira de 0,2 mm de uma concordância de raio 3 na chapa) e a que só sairia movendo a
   superfície mais que a tolerância. Elas ficam como estão, e o passo avisa quantas e o motivo (`lascasRestantes` em `st.avisos`). */

import { LIMITE_DE_FACE_FINA } from '../topologia.js';
import { limparLascas } from '../limpar-lascas.js';

const OP = 'limparLascas';


/** A área abaixo da qual uma face é lasca mesmo bem proporcionada: o piso de área da medida de contatos (`contato-de-solidos.js`, 1e-9 vezes o quadrado da meia
 *  diagonal da caixa do sólido) com margem de 4. A caixa é a da PEÇA inteira no estado do passo (todo vértice que existe), e não a das faces da seleção: a medida que
 *  audita uma montagem tria o sólido da instância, e o piso dela cresce com a diagonal da peça (4,8 m no sedã, contra 1,7 m da travessa que o `aparar` limpava), de modo
 *  que a face de 4,9e-9 m² que a limpeza deixava (piso de 3,0e-9) era recusada pela auditoria (piso de 6e-9) e passava pelo relato por parte (atrito 11 do RECEITA.md do
 *  sedã). `faces` fica na assinatura porque os dois chamadores a passam, e já não entra na conta. */
export function areaMinimaDe(st, faces) {
  void faces;
  const meia = diagonalDaPeca(st) / 2;
  return 4e-9 * meia * meia;
}

/** A diagonal da caixa de todo vértice que existe no estado: a escala da peça, que a medida de contatos usa para o piso de área da instância. 0 sem vértice. */
export function diagonalDaPeca(st) {
  const lo = [Infinity, Infinity, Infinity]; const hi = [-Infinity, -Infinity, -Infinity];
  for (const p of st.V.values()) for (let k = 0; k < 3; k += 1) { if (p[k] < lo[k]) lo[k] = p[k]; if (p[k] > hi[k]) hi[k] = p[k]; }
  return Number.isFinite(lo[0]) ? Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) : 0;
}

/** A tolerância do `aparar` é 6e-6 da diagonal do sólido aparado, e a de uma peça de membros pequenos (a travessa de 1,7 m numa lataria de 4,8 m) ficava em 10 µm quando o piso de área já
 *  era o da peça de 4,8 m: o triângulo de 0,15 mm de aresta (área 3e-9 m², abaixo do piso de 5,7e-9 da instância) não saía sem 29 µm (atrito 11 do RECEITA.md do sedã). O `aparar` limpa com
 *  o maior dos dois, e a medida da fatia é a mesma: no máximo 6e-6 da diagonal da peça. */
const TOLERANCIA_RELATIVA_DO_APARAR = 6e-6;

/** Limpa as faces `faces` do estado e aplica o resultado: o que `limparLascas` faz depois de ler a seleção, para a operação e para quem limpa dentro da sua
 *  (`aparar`). `op` é o nome do passo no aviso e na face consumida. */
export function limparNoEstado(st, faces, { tolerancia, limite = LIMITE_DE_FACE_FINA, areaMinima = 0, i, op }) {
  if (op === 'aparar') tolerancia = Math.max(tolerancia, TOLERANCIA_RELATIVA_DO_APARAR * diagonalDaPeca(st));
  const res = limparLascas({ V: st.V, F: st.F }, { selecao: faces, tolerancia, limite, areaMinima });
  const { relatorio } = res;
  if (process.env.DBG_LL) console.error('LL', op, 'sel', faces.size ?? faces.length, 'tol', tolerancia, JSON.stringify({...relatorio, restantes: relatorio.restantes.length}), JSON.stringify(relatorio.restantes.slice(0,3).map(r=>r.recusas.join('/'))));
  if (relatorio.finasAntes === 0) return undefined;

  for (const [v, p] of res.vertices) st.V.set(v, p);
  const remapear = (v) => res.fusoes.get(v) ?? v;
  for (const [fid, vs] of res.faces) {
    const f = st.F.get(fid);
    f.vs = vs;
    if (Array.isArray(f.quebras)) {
      const pares = f.quebras.map(([x, y]) => [remapear(x), remapear(y)]).filter(([x, y]) => x !== y && vs.includes(x) && vs.includes(y));
      if (pares.length) f.quebras = pares; else delete f.quebras;
    }
  }
  /* a face que sai fica registrada como consumida por este passo: a citação posterior pela origem do gerador diz que o passo a desfez, e não que ela "foi removida" */
  for (const fid of res.facesRemovidas) { st.F.delete(fid); st.consumidas.set(fid, { passo: i, op }); }
  /* o vértice que some deixa o que tinha no que fica: o peso de esqueleto (por osso, o maior dos dois) e o registro de fusão, que o replay e a conferência de pesos leem */
  const fundidos = new Map();
  for (const v of res.verticesRemovidos) {
    let para = res.fusoes.get(v);
    while (para != null && res.fusoes.has(para)) para = res.fusoes.get(para);
    if (para == null) continue;
    if (!fundidos.has(para)) fundidos.set(para, []);
    fundidos.get(para).push(v);
    const pv = st.pesos.get(v);
    if (pv?.size) {
      let pk = st.pesos.get(para);
      if (!pk) { pk = new Map(); st.pesos.set(para, pk); }
      for (const [osso, peso] of [...pv].sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0))) pk.set(osso, Math.max(pk.get(osso) ?? 0, peso));
    }
    st.pesos.delete(v);
  }
  for (const [para, de] of [...fundidos].sort((x, y) => x[0] - y[0])) st.merges.push({ de: de.sort((x, y) => x - y), para });
  for (const v of res.verticesRemovidos) st.V.delete(v);
  /* as origens que citam o que sumiu: o par de vértices da costura segue a fusão, e o dono da face que saiu deixa a lista */
  for (const registros of st.origens.values()) {
    for (const reg of registros) {
      if (Array.isArray(reg.arestas) && reg.arestas.every((p) => Array.isArray(p) && p.length === 2)) {
        const vistos = new Set(); const novas = [];
        for (const [x, y] of reg.arestas) {
          const p = [remapear(x), remapear(y)];
          if (p[0] === p[1] || !st.V.has(p[0]) || !st.V.has(p[1])) continue;
          if (p[0] > p[1]) p.reverse();
          const chave = `${p[0]}-${p[1]}`;
          if (!vistos.has(chave)) { vistos.add(chave); novas.push(p); }
        }
        reg.arestas = novas.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
      }
      if (reg.donos && typeof reg.donos === 'object') for (const fid of res.facesRemovidas) delete reg.donos[fid];
      /* a lista de faces do gerador deixa de ter a que sumiu: a citação da origem inteira (a união) segue valendo sem a lasca, e só a citação explícita da face diz que o passo a desfez */
      const tira = (lista) => lista.filter((x) => !(Number.isSafeInteger(x) && res.facesRemovidas.has(x)));
      for (const [k, v] of Object.entries(reg)) {
        if (Array.isArray(v) && v.length && v.every(Number.isSafeInteger)) reg[k] = tira(v);
        else if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Map) && k !== 'donos') for (const [k2, w] of Object.entries(v)) if (Array.isArray(w) && w.length && w.every(Number.isSafeInteger)) v[k2] = tira(w);
      }
    }
  }
  if (relatorio.finasDepois > 0) {
    const maiorCurta = Math.max(...relatorio.restantes.map((x) => x.arestaCurta));
    st.avisos.push({
      passo: i, op, ref: 'lascasRestantes', restantes: relatorio.finasDepois, antes: relatorio.finasAntes, faces: relatorio.restantes.slice(0, 20).map((x) => x.face),
      texto: `limparLascas desfez ${relatorio.finasAntes - relatorio.finasDepois} de ${relatorio.finasAntes} faces finas e deixou ${relatorio.finasDepois}: a aresta curta delas mede até ${maiorCurta} (unidade da peça) e desfazê-las pediria mover a superfície mais que a tolerância ${tolerancia}, ou virar a vizinhança; as que já vinham finas da entrada (chapa de tira estreita) só mudam na peça que as gerou`,
    });
  }
}

export function criarOperacoesLimparLascas({ grita, resolverSelecao }) {
  return {
  limparLascas(st, a, i) {
    if (a.sel == null) return grita(st, i, OP, 'sel', "limparLascas exige sel, as faces a limpar (por exemplo { origem: { op: 'subtrair', id } } depois de uma booleana, ou { tudo: true })");
    if (a.tolerancia == null) return grita(st, i, OP, 'tolerancia', 'limparLascas exige tolerancia, o quanto a superfície pode sair do lugar, na unidade da peça (0,00001 em metro são 10 µm)');
    const tolerancia = st.num(a.tolerancia);
    if (!(Number.isFinite(tolerancia) && tolerancia > 0)) return grita(st, i, OP, 'tolerancia', `tolerancia precisa ser um número positivo, recebi ${JSON.stringify(a.tolerancia)}`);
    const limite = a.limite == null ? LIMITE_DE_FACE_FINA : st.num(a.limite);
    if (!(Number.isFinite(limite) && limite > 0 && limite < 0.5)) return grita(st, i, OP, 'limite', `limite precisa ser um número entre 0 e 0,5 (padrão ${LIMITE_DE_FACE_FINA}), recebi ${JSON.stringify(a.limite)}`);
    const antes = st.orfaos.length;
    const r = resolverSelecao(st, a.sel, OP, i);
    if (st.orfaos.length > antes) return undefined;
    if (!r.faces.size) return grita(st, i, OP, 'sel', 'a seleção não tem face nenhuma');

    const areaMinima = a.areaMinima == null ? areaMinimaDe(st, r.faces) : st.num(a.areaMinima);
    if (!(Number.isFinite(areaMinima) && areaMinima >= 0)) return grita(st, i, OP, 'areaMinima', `areaMinima precisa ser um número a partir de zero, na unidade da peça ao quadrado (padrão ${areaMinimaDe(st, r.faces)}), recebi ${JSON.stringify(a.areaMinima)}`);
    limparNoEstado(st, r.faces, { tolerancia, limite, areaMinima, i, op: OP });
    return undefined;
  },
  };
}

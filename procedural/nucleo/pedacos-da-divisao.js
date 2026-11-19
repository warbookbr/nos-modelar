/* pedacos-da-divisao.js — os pedaços que a `divisaoPorContorno` deixa de cada face que corta, para quem lê faces por origem.
 *
 * A face cortada continua sendo a mesma superfície, em pedaços: o passo da divisão anota em `st.pedacosDaDivisao` (face -> pedaços novos,
 * e o pedaço cortado de novo -> os dele) o que criou, sem mexer no registro de origem de nenhum gerador. A resolução de origem do núcleo
 * (`comPedacosDaDivisao`, em `nucleo.js`) e os leitores que leem o registro direto (a borda de uma abertura, a costura de uma booleana)
 * passam a lista de faces por `comOsPedacosDaDivisao`, e os geradores de cópia (`espelha`, `arranja`) usam `ehPedacoDaDivisao` para pular
 * o pedaço que nasceu depois da cópia. Funções puras sobre o estado: a mesma entrada dá a mesma lista. */

/** A lista com os pedaços de cada face logo depois dela (os dos pedaços também), sem repetir face. Devolve a própria lista quando nenhuma
 *  face dela foi dividida. Os pedaços entram mesmo que já não vivam: quem chama decide o que fazer com a face que saiu da malha. */
export function comOsPedacosDaDivisao(st, lista) {
  const pedacos = st.pedacosDaDivisao;
  if (!pedacos?.size || !lista.some((f) => pedacos.has(f))) return lista;
  const faces = []; const postas = new Set();
  const poe = (f) => { if (postas.has(f)) return; postas.add(f); faces.push(f); for (const p of pedacos.get(f) ?? []) poe(p); };
  for (const f of lista) poe(f);
  return faces;
}

/** A face é um pedaço que a divisão criou (e não a face cortada, que fica com o id). */
export function ehPedacoDaDivisao(st, f) {
  const pai = st.pedacosDe?.get(f);
  return pai != null && (st.pedacosDaDivisao?.get(pai)?.includes(f) ?? false);
}

/**
 * tirarDosPedacosDaDivisao(st, saidas) -> (face) => pedaços que ficam
 * Para a operação que tira faces da malha e reescreve as listas de faces das origens (`limparLascas`, `arredondarCostura`): as faces de
 * `saidas` saem do mapa de pedaços. O pedaço que saiu deixa a lista da face de que veio, e os pedaços dele (de uma segunda divisão) sobem
 * para o lugar dele. Quando quem saiu foi a própria face cortada, os pedaços vivos dela deixam de ter a quem pertencer: a função devolvida
 * diz quais são, e a operação os põe na lista da origem no lugar da face, onde passam a valer como faces comuns. Sem isso, a citação da
 * origem gritaria por um pedaço que a operação tirou de propósito, ou perderia calada os pedaços vivos de uma face que saiu inteira.
 */
export function tirarDosPedacosDaDivisao(st, saidas) {
  const mapa = st.pedacosDaDivisao;
  const fora = saidas instanceof Set ? saidas : new Set(saidas);
  const soltos = new Map();
  if (mapa?.size) {
    for (const x of [...fora].sort((a, b) => a - b)) {
      const filhos = mapa.get(x) ?? [];
      const pai = st.pedacosDe?.get(x);
      const irmaos = pai != null ? mapa.get(pai) : undefined;
      const k = irmaos ? irmaos.indexOf(x) : -1;
      if (k >= 0) {
        irmaos.splice(k, 1, ...filhos);
        for (const f of filhos) st.pedacosDe.set(f, pai);
        if (!irmaos.length) mapa.delete(pai);
      } else if (filhos.length) soltos.set(x, filhos);
      mapa.delete(x);
    }
  }
  const ficam = (x) => (soltos.get(x) ?? []).flatMap((f) => (fora.has(f) ? ficam(f) : [f]));
  return ficam;
}

/** A face de antes de todas as divisões de que este pedaço descende; a própria face, se ela não é pedaço. */
export function faceDeAntesDaDivisao(st, f) {
  let x = f;
  while (ehPedacoDaDivisao(st, x)) x = st.pedacosDe.get(x);
  return x;
}

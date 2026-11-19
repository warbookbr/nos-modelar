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

/** A face de antes de todas as divisões de que este pedaço descende; a própria face, se ela não é pedaço. */
export function faceDeAntesDaDivisao(st, f) {
  let x = f;
  while (ehPedacoDaDivisao(st, x)) x = st.pedacosDe.get(x);
  return x;
}

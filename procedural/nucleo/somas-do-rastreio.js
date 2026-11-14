/* somas-do-rastreio.js — a soma que uma operação faz ao conjunto de ids "tocados" do passo, para o rastreio declarado do retrato (nível
 * 'tocados' em `ESCRITA_DAS_OPERACOES`). Cada operação soma as faces e os vértices que ela altera no lugar sem passar pelo mapa, e o despacho
 * confere só esse conjunto mais o que o mapa registrou.
 *
 * `injecao.desligadas` é só para teste: um conjunto de nomes de soma (`booleana`, `abertura`, `limparLascas`) que deixam de somar, para provar
 * que o teste reprova quando a soma falta. Vazio por padrão; nada de produção o preenche. */
export const injecao = { desligadas: new Set() };

/** Soma `ids` às faces tocadas do passo (se o passo declara 'tocados') e devolve nada. `quem` nomeia a soma. */
export function somarFacesTocadas(st, quem, ids) {
  if (!st.tocadosF || injecao.desligadas.has(quem)) return;
  for (const id of ids) st.tocadosF.add(id);
}

/** Soma `ids` aos vértices tocados do passo (se o passo declara 'tocados'). */
export function somarVerticesTocados(st, quem, ids) {
  if (!st.tocadosV || injecao.desligadas.has(quem)) return;
  for (const id of ids) st.tocadosV.add(id);
}

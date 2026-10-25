/* gaiola-captura.js — a captura das gaiolas montadas durante uma chamada
 *
 * Função pura, sem Three.js e sem domínio. As ajudantes de gaiola (`gaiolaPorEstacoes`, `gaiolaPorRede`) registram aqui a saída que
 * montaram, e `capturarGaiolas(fn)` devolve as saídas montadas enquanto `fn` roda, para quem edita a receita por nome (as
 * ferramentas de ondulação, alisamento e vincos) ler a origem e as entradas de cada ponto. Fora de uma captura, registrar não faz nada. */

let capturando = null;

/** capturarGaiolas(fn) -> { resultado, gaiolas }: as saídas das ajudantes de gaiola chamadas por `fn`, na ordem. */
export function capturarGaiolas(fn) {
  const anterior = capturando; const gaiolas = [];
  capturando = gaiolas;
  try { return { resultado: fn(), gaiolas }; } finally { capturando = anterior; }
}

/** registrarGaiola(saida): põe a saída de uma ajudante na captura em curso, se houver. */
export function registrarGaiola(saida) {
  if (capturando) capturando.push(saida);
}

/* As divisões fixadas. A rede de curvas decide quantas divisões cada arco leva pelo comprimento dele, de modo que mover um ponto-chave
   por um décimo de milímetro pode dar uma divisão a mais num arco e mudar toda a malha. A ferramenta que mede o que um ponto-chave
   move (o alisamento) precisa da mesma malha antes e depois de mexer, e por isso fixa as divisões que a receita tinha. As divisões
   se dão por assinatura da rede (a definição sem as coordenadas); dentro dela, `divisoes` por arco (`curva:de>ate`) e `fracoes` por ponto,
   a posição relativa do ponto dentro do arco (de 0 a 1). */
let fixadas = null;

/** assinaturaDaRede(definicaoSemCoordenadas) -> o texto que identifica uma rede pela definição sem as coordenadas. */
export const assinaturaDaRede = (definicaoSemCoordenadas) => JSON.stringify(definicaoSemCoordenadas);

/** divisoesDasRedes(gaiolas) -> Map assinatura -> { divisoes, fracoes } das saídas de `gaiolaPorRede` capturadas (o campo `fixacao`). */
export function divisoesDasRedes(gaiolas) {
  const mapa = new Map();
  for (const g of gaiolas) if (g?.fixacao && g.estrutura?.definicao) mapa.set(assinaturaDaRede(g.estrutura.definicao), g.fixacao);
  return mapa;
}

/** comDivisoesFixas(mapa, fn) -> o que `fn` devolve, com as redes de `mapa` (de `divisoesDasRedes`) montadas com as divisões dele. */
export function comDivisoesFixas(mapa, fn) {
  const anterior = fixadas;
  fixadas = mapa;
  try { return fn(); } finally { fixadas = anterior; }
}

/** divisoesFixadas(assinatura) -> { divisoes, fracoes } fixadas para a rede, ou null. */
export function divisoesFixadas(assinatura) {
  return fixadas?.get(assinatura) ?? null;
}

/* As alterações de teste. A ferramenta que sugere vincos precisa saber como a rede sairia com um vinco a mais numa curva (o alisamento do
   miolo deixa de alisar através dela, e a dobra do preenchimento passa a valer) e com um nó a mais como canto, sem escrever na receita. */
let alteracoes = null;

/** comAlteracoesNaRede(alt, fn) -> o que `fn` devolve, com toda rede montada durante `fn` alterada por `alt`:
 *  { vincos: { curva: nitidez }, cantos: [nó], acrescentar: { nos, curvas, retalhos: { retalho: [retalhos que o substituem] } } }.
 *  A curva ou o nó que a rede não tem fica de fora do vinco e do canto; `acrescentar` junta nós e curvas e troca os retalhos citados. */
export function comAlteracoesNaRede(alt, fn) {
  const anterior = alteracoes;
  alteracoes = alt;
  try { return fn(); } finally { alteracoes = anterior; }
}

/** alteracoesDaRede() -> as alterações em curso, ou null. */
export function alteracoesDaRede() {
  return alteracoes;
}

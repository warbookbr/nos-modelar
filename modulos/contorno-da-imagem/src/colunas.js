/* colunas.js — nomes em duas colunas fora do desenho, com chamada até a parte.
 *
 * Serve ao mapa de partes (em pixel) e à prancha dos contornos (em
 * pixel de tela). Em cada coluna os nomes seguem a ordem da altura do alvo,
 * com passo mínimo entre eles, e depois qualquer par de chamadas que se cruze
 * troca de lugar: a troca encurta a soma das chamadas, então o laço termina, e
 * termina sem chamada cruzada na mesma coluna. Como as trocas só permutam as
 * alturas já espaçadas, nenhuma etiqueta passa a cobrir outra. */

/* Cruzamento próprio de dois segmentos; tocar na ponta não conta. */
export function segmentosSeCruzam(a, b, c, d) {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const e = 1e-9;
  const d1 = o(c, d, a); const d2 = o(c, d, b); const d3 = o(a, b, c); const d4 = o(a, b, d);
  return ((d1 > e && d2 < -e) || (d1 < -e && d2 > e)) && ((d3 > e && d4 < -e) || (d3 < -e && d4 > e));
}

/* `lista`: itens com `nome`, `marca` [x, y] e `alvo` (y desejado do nome).
   Grava `ty` em cada item e devolve a lista na ordem de cima para baixo. A
   chamada vai de `ponto(item)`, a marca por padrão, a [xColuna, ty + desvio]. */
export function empilharColuna(lista, xColuna, { passo, desvio = 0, ponto = (i) => i.marca }) {
  const ordem = lista.slice().sort((a, b) => a.alvo - b.alvo || a.nome.localeCompare(b.nome));
  let ultimo = -Infinity;
  for (const i of ordem) { i.ty = Math.max(i.alvo, ultimo + passo); ultimo = i.ty; }
  const seg = (i) => [ponto(i), [xColuna, i.ty + desvio]];
  for (let volta = 0; volta < 10000; volta += 1) {
    let trocou = false;
    for (let a = 0; a < ordem.length && !trocou; a += 1) {
      for (let b = a + 1; b < ordem.length && !trocou; b += 1) {
        if (segmentosSeCruzam(...seg(ordem[a]), ...seg(ordem[b]))) { [ordem[a].ty, ordem[b].ty] = [ordem[b].ty, ordem[a].ty]; trocou = true; }
      }
    }
    if (!trocou) break;
  }
  return ordem.sort((a, b) => a.ty - b.ty);
}

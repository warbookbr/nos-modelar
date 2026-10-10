/* pedacos-convexos.js — de triângulos coplanares a faces convexas.

   O adaptador desenha cada face em leque a partir do primeiro canto, então uma face côncava sairia errada na tela.
   Os triângulos são fundidos dois a dois pela aresta comum enquanto o resultado continua convexo (Hertel e Mehlhorn).
   Saiu de booleanas.js sem mudar uma linha para que a extrusão de perfil com furo (perfil2d.js, operacoes/perfis.js)
   use a mesma conta. `pos(id)` devolve a posição [x, y, z] do canto `id` e `n` é a normal da face. */

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const ponto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const tamanho = (a) => Math.hypot(a[0], a[1], a[2]);

export function areaDe(pos, P) {
  let s = [0, 0, 0];
  const o = pos(P[0]);
  for (let k = 1; k < P.length - 1; k++) {
    const c = cruz(sub(pos(P[k]), o), sub(pos(P[k + 1]), o));
    s = [s[0] + c[0], s[1] + c[1], s[2] + c[2]];
  }
  return tamanho(s) / 2;
}

/* convexo em relação à normal da face de origem: nenhuma curva para o lado
   de dentro. Cantos colineares (curva zero) são aceitos — são os cantos que
   a face vizinha usa, e tirá-los abriria fenda. */
export function convexo(pos, P, n) {
  for (let k = 0; k < P.length; k++) {
    const a = pos(P[k]), b = pos(P[(k + 1) % P.length]), c = pos(P[(k + 2) % P.length]);
    const e1 = sub(b, a), e2 = sub(c, b);
    const tol = 1e-7 * tamanho(e1) * tamanho(e2);
    if (ponto(cruz(e1, e2), n) < -tol) return false;
  }
  return true;
}

/* funde P e Q pela aresta comum (u→v em P, v→u em Q). Devolve null se não
   houver exatamente uma aresta comum com só os dois cantos em comum. */
export function fundir(P, Q) {
  const comuns = P.filter((v) => Q.includes(v));
  if (comuns.length !== 2) return null;
  for (let k = 0; k < P.length; k++) {
    const u = P[k], v = P[(k + 1) % P.length];
    const j = Q.indexOf(v);
    if (j < 0 || Q[(j + 1) % Q.length] !== u) continue;
    const Pr = [], Qr = [];
    for (let t = 0; t < P.length; t++) Pr.push(P[(k + 1 + t) % P.length]);   // v … u
    for (let t = 0; t < Q.length; t++) Qr.push(Q[(j + 1 + t) % Q.length]);   // u … v
    return [...Pr, ...Qr.slice(1, -1)];
  }
  return null;
}

/* O adaptador desenha a face em leque a partir do canto 0. Com canto
   colinear (o que a costura deixa na borda de um pedaço), um leque que
   começa ao lado dele gera triângulo sem área. O pedaço começa pelo canto
   cujo leque tem o MAIOR menor triângulo; empate fica com o primeiro. */
export function melhorInicio(pos, P) {
  const notas = P.map((_, s) => {
    let menor = Infinity;
    const o = pos(P[s]);
    for (let k = 1; k < P.length - 1; k++) {
      const a = pos(P[(s + k) % P.length]), b = pos(P[(s + k + 1) % P.length]);
      menor = Math.min(menor, tamanho(cruz(sub(a, o), sub(b, o))));
    }
    return menor;
  });
  /* notas a menos de 1e-6 da melhor empatam, e o empate vai para o menor
     id: a conta em ponto flutuante muda na última casa quando a peça é
     transladada, e o canto de partida não pode mudar com isso */
  const melhorNota = Math.max(...notas);
  let melhor = -1;
  notas.forEach((nt, s) => { if (nt >= melhorNota * (1 - 1e-6) && (melhor < 0 || P[s] < P[melhor])) melhor = s; });
  return [...P.slice(melhor), ...P.slice(0, melhor)];
}

export function pedacosConvexos(pos, triangulos, n, piso = 0) {
  const pecas = triangulos.map((t) => t.slice());
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (let p = 0; p < pecas.length && !mudou; p++) {
      for (let q = p + 1; q < pecas.length; q++) {
        const m = fundir(pecas[p], pecas[q]);
        /* pedaço sem área (lasca) se funde mesmo sem convexidade exata: ele não
           ocupa área, e sozinho sairia degenerado na tela */
        if (m && (convexo(pos, m, n) || areaDe(pos, pecas[p]) < piso || areaDe(pos, pecas[q]) < piso)) { pecas[p] = m; pecas.splice(q, 1); mudou = true; break; }
      }
    }
  }
  return pecas.map((P) => melhorInicio(pos, P));
}


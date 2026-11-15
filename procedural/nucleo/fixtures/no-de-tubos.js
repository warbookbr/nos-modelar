/* no-de-tubos.js — a fixture geral do nó de tubos: tubos de seção circular, fechados nas pontas por um polo, que saem de um ponto
 * comum ou nascem na lateral de um tubo receptor, unidos num sólido só e arredondados na costura. Serve ao teste de
 * `arredondarCostura` no nó (plano da costura em nó de tubos, 2026-11-15); nenhuma receita a usa. Medidas em metro. */

const m = (v) => v / 1000;

/** tubo(id, a, b, raio, lados) -> o passo `loft` de um tubo de raio constante de `a` a `b`, com polo de 1 mm em cada ponta e
 *  um anel a cada 10 mm, mais ou menos: sem os anéis, a booleana corta as faces de comprimento inteiro em triângulos longos e finos, e o
 *  sombreado liso risca o tubo ao longo deles. */
export function tubo(id, a, b, raio, lados = 48) {
  const polo = (f, v) => {
    const d = f.map((x, i) => x - v[i]);
    const l = Math.hypot(...d);
    return { pos: f.map((x, i) => x + (d[i] / l) * 0.001), raio: 0 };
  };
  const n = Math.max(1, Math.round(Math.hypot(...b.map((x, i) => x - a[i])) / 0.01));
  /* os anéis do meio ficam a 0,37 de um passo das posições redondas, para não coincidirem com a junção de outro tubo */
  const em = (t) => ({ pos: a.map((x, i) => x + (b[i] - x) * t), raio });
  const aneis = Array.from({ length: n }, (_, k) => em((k + 0.37) / n));
  return ['loft', { origemId: id, lados, secoes: [polo(a, b), em(0), ...aneis, em(1), polo(b, a)] }];
}

/** Os casos, cada um com os tubos (pontas em mm, raio em mm). O receptor é o primeiro tubo; os outros nascem nele. */
export const CASOS = {
  /* dois tubos: o caso que já fecha, provado na sonda de 2026-11-15 */
  'T reto 17/8': [[[0, 0, 0], [0, 400, 0], 17], [[0, 200, 0], [200, 200, 0], 8]],
  'obliquo 35 17/8': [[[0, 0, 0], [0, 400, 0], 17], [[0, 300, 0], [140, 100, 0], 8]],
  'obliquo 60 17/16': [[[0, 0, 0], [0, 400, 0], 17], [[0, 300, 0], [250, 160, 0], 16]],
  /* três tubos cujas costuras no receptor não se tocam (um sai para a frente, o outro para trás): fecha */
  'no de 3 tubos afastados': [[[0, 0, 0], [0, 400, 0], 17], [[0, 300, 0], [250, 320, 0], 16], [[0, 300, 0], [-200, 60, 0], 8]],
  /* dois tubos sozinhos que saem do mesmo ponto a 22°: a costura entre eles fecha */
  'estais sozinhos 22': [[[0, 300, 0], [-200, 60, 60], 8], [[0, 300, 0], [-200, 60, -60], 8]],
  /* o ponto triplo: dois tubos a 22° que nascem no mesmo ponto de um receptor, com as costuras deles no receptor encostadas
     uma na outra entre os dois; é o que recusa */
  'tubo e dois estais': [[[0, 0, 0], [0, 400, 0], 17], [[0, 300, 0], [-200, 60, 60], 8], [[0, 300, 0], [-200, 60, -60], 8]],
  /* o nó do selim de um quadro (tubo do selim, tubo de cima e dois estais), com o mesmo ponto triplo */
  'no de 4 tubos': [[[0, 0, 0], [0, 400, 0], 17], [[0, 300, 0], [250, 320, 0], 16], [[0, 300, 0], [-200, 60, 60], 8], [[0, 300, 0], [-200, 60, -60], 8]],
};

/** passosDoNo(caso, raioMm, extra) -> os tubos, o `unir` deles (id 100) e o `arredondarCostura` (id 101) com o raio em mm. */
export function passosDoNo(caso, raioMm, extra = {}) {
  const tubos = CASOS[caso].map(([a, b, r], k) => tubo(k + 1, a.map(m), b.map(m), m(r)));
  return [
    ...tubos,
    ['unir', { origemId: 100, solidos: tubos.map((_, k) => ({ origem: { op: 'loft', id: k + 1 } })) }],
    ['arredondarCostura', { origemId: 101, de: { op: 'unir', id: 100 }, raio: m(raioMm), ...extra }],
  ];
}

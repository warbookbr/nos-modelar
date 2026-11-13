/* medir-malha.js — as medidas de uma malha {V, F} que o estudo do método compara: volume, estanqueidade e a menor área de face
   (protótipo do plano "forma exata antes da malha", fatia 3). Lê só os vértices e as faces; serve à malha da forma exata e, pelo
   teste, ao estado neutro do núcleo. */

/** O volume com sinal (positivo com as faces voltadas para fora), pela soma dos tetraedros de cada face em leque. */
export function volumeDaMalha({ V, F }) {
  let soma = 0;
  for (const f of F) {
    const a = V[f[0]];
    for (let k = 1; k + 1 < f.length; k++) {
      const b = V[f[k]], c = V[f[k + 1]];
      soma += a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
    }
  }
  return soma / 6;
}

/** { arestasSoltas, arestasDeMaisDeDuasFaces, arestasNoMesmoSentido, verticesSemFace, fechada }: a malha fecha quando toda aresta é de duas faces, uma em cada sentido. */
export function estanqueidade({ V, F }) {
  const usos = new Map();
  const usado = new Uint8Array(V.length);
  for (const f of F) {
    for (let i = 0; i < f.length; i++) {
      const a = f[i], b = f[(i + 1) % f.length];
      usado[a] = 1;
      const k = a < b ? `${a}|${b}` : `${b}|${a}`;
      const e = usos.get(k) ?? { ida: 0, volta: 0 };
      if (a < b) e.ida++; else e.volta++;
      usos.set(k, e);
    }
  }
  let arestasSoltas = 0, arestasDeMaisDeDuasFaces = 0, arestasNoMesmoSentido = 0;
  for (const e of usos.values()) {
    const n = e.ida + e.volta;
    if (n === 1) arestasSoltas++;
    else if (n > 2) arestasDeMaisDeDuasFaces++;
    else if (e.ida !== 1) arestasNoMesmoSentido++;
  }
  const verticesSemFace = V.length - usado.reduce((s, x) => s + x, 0);
  return { arestasSoltas, arestasDeMaisDeDuasFaces, arestasNoMesmoSentido, verticesSemFace, fechada: arestasSoltas + arestasDeMaisDeDuasFaces + arestasNoMesmoSentido === 0 };
}

/** A menor área de face da malha (metade do módulo da normal de Newell), na unidade da malha ao quadrado. */
export function menorAreaDeFace({ V, F }) {
  let menor = Infinity;
  for (const f of F) {
    let x = 0, y = 0, z = 0;
    for (let i = 0; i < f.length; i++) {
      const a = V[f[i]], b = V[f[(i + 1) % f.length]];
      x += (a[1] - b[1]) * (a[2] + b[2]); y += (a[2] - b[2]) * (a[0] + b[0]); z += (a[0] - b[0]) * (a[1] + b[1]);
    }
    menor = Math.min(menor, Math.hypot(x, y, z) / 2);
  }
  return menor;
}

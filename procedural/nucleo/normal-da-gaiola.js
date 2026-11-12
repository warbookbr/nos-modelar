/* normal-da-gaiola.js — confere para onde olha a normal das faces de uma gaiola, e avisa quando ela olha para dentro
 *
 * FICHA normalDaGaiola
 * serve: avisar, ao montar a gaiola, que a normal ficou para dentro do volume que ela fecha, ou para o lado contrário do `fora` que a receita declarou, em vez de
 *   deixar a chapa crescer para o lado errado e o relato de contatos acusar depois.
 * quando: os ajudantes de gaiola chamam este conferidor sozinhos. Numa gaiola de estações, `fora: [x, y, z]` declara o lado para onde a chapa olha; sem ele só a gaiola
 *   fechada (sem aresta de borda) é conferida, pelo volume. A gaiola de laços orienta as faces pelo volume e a de rede e a varrida pelo `fora` delas, e não passam por aqui.
 * unidades: as da gaiola (metro ou mm); a direção `fora` não tem unidade.
 * campos:
 *   pontos: nome -> [x, y, z].
 *   faces: listas de nomes, na ordem da volta (a normal sai da regra da mão direita).
 *   fora: [x, y, z], o lado para onde a chapa olha (opcional).
 *   corrige: o que fazer quando a normal está ao contrário, escrito para o ajudante que chama (por exemplo, "ponha `virar: true`").
 * devolve: { avisos, normalMedia, volume }; `avisos` é a lista de { ref: 'normalContrariaAoFora' | 'normalParaDentro', texto, ... }.
 * exemplo:
 *   conferirNormalDaGaiola({ pontos: { a: [0, 0, 0], b: [1, 0, 0], c: [1, 1, 0], d: [0, 1, 0] }, faces: [['a', 'b', 'c', 'd']], fora: [0, 0, -1] }).avisos
 * peça: procedural/nucleo/normal-da-gaiola.test.ts
 * FIM DA FICHA
 *
 * Função pura. A NORMAL MÉDIA é a das faces ponderada pela área: a soma de cada normal unitária vezes a área, sobre a área total, projetada na direção `fora`. Ela dá o
 * cosseno médio entre a normal e o `fora`: perto de 1, a chapa olha para onde se declarou; perto de -1, está ao contrário, e o aviso sai abaixo de zero. A chapa curva
 * (o capô, uma cabine) tem normais que se afastam do `fora` e a média fica abaixo de 1, sem avisar; o aviso é só da chapa que olha, em média, para o lado oposto.
 * O VOLUME é o da gaiola fechada (cada aresta em duas faces, uma em cada sentido): a soma dos tetraedros das faces contra a origem. Com volume negativo as normais estão
 * para dentro. A gaiola aberta (uma chapa, um tubo sem tampa) não fecha volume, e fechá-la com um leque na boca daria o sinal contrário na chapa côncava, então não é conferida
 * por ele: para ela vale o `fora`. */

const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);
const br = (x, d = 2) => String(Number(x.toFixed(d))).replace('.', ',');

/** O vetor de área da face (Newell, metade): normal pela regra da mão direita, módulo igual à área. */
function vetorDeArea(f, P) {
  let s = [0, 0, 0];
  for (let k = 0; k < f.length; k += 1) { const a = P[f[k]]; const b = P[f[(k + 1) % f.length]]; s = [s[0] + (a[1] - b[1]) * (a[2] + b[2]), s[1] + (a[2] - b[2]) * (a[0] + b[0]), s[2] + (a[0] - b[0]) * (a[1] + b[1])]; }
  return [s[0] / 2, s[1] / 2, s[2] / 2];
}

export function conferirNormalDaGaiola({ pontos, faces, fora = null, corrige = 'inverta a ordem dos vértices das faces' }) {
  const avisos = [];
  const lidas = faces.filter((f) => f.length >= 3 && f.every((n) => pontos[n]));
  if (!lidas.length) return { avisos, normalMedia: null, volume: null };
  let areaTotal = 0; let soma = 0; let contra = 0; let area = [0, 0, 0];
  const direcao = fora ? (norma(fora) > 0 ? fora.map((x) => x / norma(fora)) : null) : null;
  for (const f of lidas) {
    const a = vetorDeArea(f, pontos); const m = norma(a);
    areaTotal += m; area = [area[0] + a[0], area[1] + a[1], area[2] + a[2]];
    if (direcao && m > 0) { const c = dot(a, direcao); soma += c; if (c < 0) contra += m; }
  }
  const normalMedia = direcao && areaTotal > 0 ? soma / areaTotal : null;
  if (normalMedia != null && normalMedia < 0) {
    avisos.push({
      ref: 'normalContrariaAoFora', cosseno: Number(normalMedia.toFixed(3)), areaContraria: Number((contra / areaTotal).toFixed(3)), fora: [...fora],
      texto: `a normal da gaiola olha para o lado contrário do \`fora\` declarado [${fora.map((x) => br(x)).join(', ')}]: o cosseno médio entre as normais das faces e o \`fora\` é ${br(normalMedia)} (${br((100 * contra) / areaTotal, 0)}% da área está contra ele), e a chapa cresceria para dentro; ${corrige}`,
    });
  }
  /* a gaiola fechada: cada aresta aparece uma vez em cada sentido */
  const dirigidas = new Map();
  for (const f of lidas) for (let k = 0; k < f.length; k += 1) { const c = `${f[k]}\u0000${f[(k + 1) % f.length]}`; dirigidas.set(c, (dirigidas.get(c) ?? 0) + 1); }
  let fechada = dirigidas.size > 0;
  for (const [c, n] of dirigidas) { const [a, b] = c.split('\u0000'); if (n !== 1 || !dirigidas.has(`${b}\u0000${a}`)) { fechada = false; break; } }
  let volume = null;
  if (fechada) {
    volume = 0;
    for (const f of lidas) { const p0 = pontos[f[0]]; for (let k = 1; k + 1 < f.length; k += 1) volume += dot(p0, cruz(pontos[f[k]], pontos[f[k + 1]])) / 6; }
    if (volume < 0) {
      avisos.push({
        ref: 'normalParaDentro', volume: Number(volume.toPrecision(6)),
        texto: `a normal da gaiola fechada olha para dentro do volume que ela fecha (o volume com sinal das faces é ${br(volume, 4)}, e fora é positivo), e a chapa cresceria para dentro; ${corrige}`,
      });
    }
  }
  return { avisos, normalMedia, volume };
}

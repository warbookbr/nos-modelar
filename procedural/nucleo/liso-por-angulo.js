/* liso-por-angulo.js — a normal suave de um canto de face, com ângulo limite.

   `liso` sem ângulo faz a média das normais de TODAS as faces lisas que tocam
   o vértice. Numa quina de quase 90° entre duas faces lisas, a média entorta
   a normal das duas e a sombra vira um degradê escuro: foi o que apareceu nas
   costas do ombro do braço robótico, e o modelador precisou inventar uma tira
   de 0,3 mm na quina do "V" para separar vértices só por causa da sombra.

   `liso` com `angulo` (graus) é o "smooth by angle" do Blender: no canto de
   uma face, entram na média só as faces lisas cuja normal fica a menos de
   `angulo` graus da normal dessa face. A quina mais fechada que o limite fica
   nítida, e cada lado continua liso por dentro. A malha não muda; só a sombra.

   `entradas` é a lista das faces lisas que tocam o vértice, cada uma com a
   normal unitária `u` e o peso `n` (a normal já multiplicada pelo que o
   adaptador usa como peso). Devolve a normal unitária, ou null. */
export function normalLisaDoCanto(uFace, liso, entradas) {
  const limite = typeof liso === 'number' ? Math.cos((liso * Math.PI) / 180) : -Infinity;
  let x = 0; let y = 0; let z = 0;
  for (const { u, n } of entradas) {
    if (u[0] * uFace[0] + u[1] * uFace[1] + u[2] * uFace[2] < limite) continue;
    x += n[0]; y += n[1]; z += n[2];
  }
  const t = Math.hypot(x, y, z);
  return t > 1e-12 ? [x / t, y / t, z / t] : null;
}

/* O valor gravado em `face.liso`: `true` sem ângulo, o número com ângulo. */
export function valorDoLiso(angulo) {
  if (angulo === undefined || angulo === null) return true;
  if (typeof angulo !== 'number' || !Number.isFinite(angulo) || angulo <= 0 || angulo >= 180) {
    throw new TypeError(`liso: 'angulo' precisa ser número de graus entre 0 e 180, recebeu ${angulo}.`);
  }
  return angulo;
}

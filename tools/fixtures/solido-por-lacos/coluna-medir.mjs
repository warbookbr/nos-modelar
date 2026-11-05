/* coluna-medir — as medidas da peça de teste "coluna sobre disco" sobre a malha que o núcleo entrega, cada uma contra o número declarado
 * em `coluna-forma.js`: o chanfro de 2 mm da borda do disco e o do topo, o filete do encontro, o raio do cilindro e do disco, a altura
 * e a extensão da peça. Os cortes são os de `medir.mjs`; entra em metro e as medidas saem em milímetro. */
import { cortePorPlano } from './medir.mjs';
import { TABELA } from './coluna-forma.js';

const MM = 1000;
const mediana = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const arred = (x, c = 3) => Number(x.toFixed(c));

/** extensaoDaMalha(malha) -> [[min, max], ...] em x, y e z, em mm. */
export function extensaoDaMalha(malha) {
  return [0, 1, 2].map((e) => {
    const v = malha.pontos.map((p) => p[e] * MM);
    return [arred(Math.min(...v)), arred(Math.max(...v))];
  });
}

/** raioDoCilindro(malha, y) -> { minimo, maximo }: no corte y, a distância dos pontos ao eixo do cilindro (x = 0, z = raio). */
export function raioDoCilindro(malha, y, t = TABELA) {
  const rs = cortePorPlano(malha, 'y', y).map(([x, z]) => Math.hypot(x, z - t.raio));
  return { minimo: arred(Math.min(...rs)), maximo: arred(Math.max(...rs)) };
}

/** raioDoDisco(malha, z, yAte) -> { minimo, maximo }: no corte z, a distância ao eixo do disco dos pontos com y abaixo de yAte (fora do cilindro). */
export function raioDoDisco(malha, z, yAte = -5) {
  const rs = cortePorPlano(malha, 'z', z).filter(([, y]) => y < yAte).map(([x, y]) => Math.hypot(x, y));
  return { minimo: arred(Math.min(...rs)), maximo: arred(Math.max(...rs)) };
}

/** chanfroDoDisco(malha, y) -> { raioNaFace, raioNaParede, radialMm, axialMm }: no corte y do disco, o chanfro da borda da face z = 0.
 *  O raio é o do ponto ao eixo do disco: na face é o maior raio dos pontos de z ≈ 0, na parede a mediana dos pontos de z de 20 a 60, e o
 *  chanfro vai da face ao menor z em que o raio chega à parede menos 0,2 mm. Declarado: 2 mm nos dois sentidos. */
export function chanfroDoDisco(malha, y, t = TABELA) {
  const pts = cortePorPlano(malha, 'y', y).filter(([x]) => x > 0).map(([x, z]) => ({ z, r: Math.hypot(x, y) }));
  const raioNaFace = Math.max(...pts.filter((p) => p.z < 0.02).map((p) => p.r));
  const raioNaParede = mediana(pts.filter((p) => p.z > 20 && p.z < 60).map((p) => p.r));
  const zFim = Math.min(...pts.filter((p) => p.z > 0.02 && p.r >= raioNaParede - 0.2).map((p) => p.z));
  return { raioNaFace: arred(raioNaFace), raioNaParede: arred(raioNaParede), radialMm: arred(raioNaParede - raioNaFace), axialMm: arred(zFim), declaradoMm: t.chanfro };
}

/** chanfroDoTopo(malha) -> { topoMm, raioNoTopo, raioNaParede, radialMm, axialMm }: no corte z = raio (pelo eixo do cilindro), o chanfro do topo.
 *  Declarado: topo a `alturaTotal - raio`, chanfro de 2 mm nos dois sentidos. */
export function chanfroDoTopo(malha, t = TABELA) {
  const pts = cortePorPlano(malha, 'z', t.raio).filter(([x]) => x > 0).map(([x, y]) => ({ x, y }));
  const topoMm = Math.max(...pts.map((p) => p.y));
  const raioNoTopo = Math.max(...pts.filter((p) => p.y > topoMm - 0.02).map((p) => p.x));
  const raioNaParede = mediana(pts.filter((p) => p.y > 300 && p.y < 380).map((p) => p.x));
  const yFim = Math.max(...pts.filter((p) => p.y > 380 && p.x >= raioNaParede - 0.2).map((p) => p.y));
  return { topoMm: arred(topoMm), raioNoTopo: arred(raioNoTopo), raioNaParede: arred(raioNaParede), radialMm: arred(raioNaParede - raioNoTopo), axialMm: arred(topoMm - yFim), declaradoMm: t.chanfro };
}

/** recuoDoFilete(malha, y) -> { recuoMm, esperadoMm }: no corte y, quanto a superfície fica da quina viva do encontro, a parede do disco
 *  (x = raiz de raio² - y²) com o círculo do cilindro, em [x, z] = [w, raio - y]. O esperado é o de um filete de raio nominal no plano,
 *  raio * (1 / cos(dobra / 2) - 1), com a dobra asin(y / raio) do plano de corte. */
export function recuoDoFilete(malha, y, t = TABELA) {
  const w = Math.sqrt(t.raio * t.raio - y * y);
  const quina = [w, t.raio - y];
  const corte = cortePorPlano(malha, 'y', y).filter(([x, z]) => Math.hypot(x - quina[0], z - quina[1]) < 25);
  const recuo = Math.min(...corte.map(([x, z]) => Math.hypot(x - quina[0], z - quina[1])));
  const dobra = Math.asin(y / t.raio);
  return { y, recuoMm: arred(recuo), esperadoMm: arred(t.raioDoEncontro * (1 / Math.cos(dobra / 2) - 1)), dobraGraus: arred((dobra * 180) / Math.PI, 1) };
}

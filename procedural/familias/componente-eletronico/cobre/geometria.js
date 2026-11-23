/* geometria.js — o cobre traçado de uma placa declarada, em mm, no plano [x, z] da placa: os polígonos de cada trecho e de
   cada via, e a união de polígonos de uma face pela CrossSection da Manifold.

   O TRAÇADO SALVO. `{ versao: 1, placa, chave?, redes: [{ id, trechos: [{ face, largura, pontos: [[x, z], ...], origem? }],
   vias: [{ centro: [x, z], furo, anel }] }] }`, em mm. O trecho é a linha de centro da trilha numa face ('cima' ou 'baixo'),
   com a largura dela; cada segmento vira uma cápsula (retângulo com meio círculo nas pontas), e as cápsulas de segmentos
   seguidos se sobrepõem na junta, que fica redonda. A via é o furo metalizado que liga as duas faces: o furo atravessa o
   laminado e o anel de cobre fica nas duas faces. O rótulo de rede do traçado serve ao traçador e ao mapa; o conferidor não o
   lê, e mede a ligação pelo cobre.

   Puro e determinístico: as cápsulas e os círculos têm número fixo de lados, e a união sai canônica (cada contorno começa pelo
   menor ponto, na grade de 1e-6 mm, os componentes e os furos ordenados). */
import { manifoldCarregada } from '../../../nucleo/manifold.js';

export const LADOS_DO_ARCO = 8;
export const LADOS_DA_VIA = 16;
const GRADE = 1e6;
const arredondar = (x) => Math.round(x * GRADE) / GRADE + 0;
const comparar = (a, b) => (a[0] - b[0]) || (a[1] - b[1]);

/** O polígono convexo, anti-horário em [x, z], da cápsula de largura `largura` em volta do segmento de `a` a `b`. */
export function capsula(a, b, largura, lados = LADOS_DO_ARCO) {
  const r = largura / 2;
  const d = [b[0] - a[0], b[1] - a[1]];
  const L = Math.hypot(...d);
  const angulo = L > 0 ? Math.atan2(d[1], d[0]) : 0;
  const pontos = [];
  /* o meio círculo de b, de -90 a +90 graus em volta da direção, e o de a, de +90 a +270 */
  for (const [centro, inicio] of [[b, -Math.PI / 2], [a, Math.PI / 2]]) {
    for (let k = 0; k <= lados; k += 1) {
      const t = inicio + angulo + (Math.PI * k) / lados;
      pontos.push([centro[0] + r * Math.cos(t), centro[1] + r * Math.sin(t)]);
    }
  }
  return pontos;
}

/** O círculo anti-horário de raio `raio` em volta de `centro`, com `lados` lados. */
export function circulo(centro, raio, lados = LADOS_DA_VIA) {
  return Array.from({ length: lados }, (_, k) => {
    const t = (2 * Math.PI * k) / lados;
    return [centro[0] + raio * Math.cos(t), centro[1] + raio * Math.sin(t)];
  });
}

/** As peças do cobre traçado, cada uma um polígono convexo numa face: `{ rede, face, tipo: 'trilha' | 'via', poligono, largura?,
 *  trecho?, segmento?, via?, furo? }`. A via dá uma peça em cada face, com o furo dela. */
export function pecasDoTracado(tracado) {
  const pecas = [];
  for (const rede of tracado.redes) {
    rede.trechos.forEach((trecho, t) => {
      for (let s = 0; s + 1 < trecho.pontos.length; s += 1) {
        pecas.push({ rede: rede.id, face: trecho.face, tipo: 'trilha', largura: trecho.largura, trecho: t, segmento: s, poligono: capsula(trecho.pontos[s], trecho.pontos[s + 1], trecho.largura) });
      }
    });
    (rede.vias ?? []).forEach((via, v) => {
      const raioDoFuro = via.furo / 2;
      for (const face of ['cima', 'baixo']) {
        pecas.push({ rede: rede.id, face, tipo: 'via', via: v, centro: via.centro, furoDaVia: via.furo, anel: via.anel, poligono: circulo(via.centro, raioDoFuro + via.anel), furo: circulo(via.centro, raioDoFuro) });
      }
    });
  }
  return pecas;
}

const area = (p) => p.reduce((s, q, k) => s + q[0] * p[(k + 1) % p.length][1] - p[(k + 1) % p.length][0] * q[1], 0) / 2;
function iniciarNoMenor(pontos) {
  let i = 0;
  for (let k = 1; k < pontos.length; k += 1) if (comparar(pontos[k], pontos[i]) < 0) i = k;
  return [...pontos.slice(i), ...pontos.slice(0, i)];
}

/* A união devolve pontos a ~1 µm um do outro onde uma cápsula cruza a borda de uma ilha, e a tampa da extrusão não distingue
   pontos a menos de 4 µm. O ponto a menos de `COLADO` do último que ficou sai (também na volta do fim ao começo): a borda
   muda no máximo isso, abaixo da precisão que as regras medem. */
const COLADO = 0.005;
function semPontosColados(pontos) {
  const saida = [];
  for (const p of pontos) if (!saida.length || Math.hypot(p[0] - saida.at(-1)[0], p[1] - saida.at(-1)[1]) >= COLADO) saida.push(p);
  while (saida.length > 3 && Math.hypot(saida[0][0] - saida.at(-1)[0], saida[0][1] - saida.at(-1)[1]) < COLADO) saida.pop();
  return saida;
}

/** A união dos polígonos simples `poligonos` (qualquer orientação), em componentes `{ externo, furos }` canônicos: o externo
 *  anti-horário, os furos horários. */
export function uniaoDePoligonos(poligonos) {
  const wasm = manifoldCarregada();
  if (!wasm) throw new Error('cobre: a união dos polígonos precisa da biblioteca Manifold, que não carregou');
  const ccw = poligonos.map((p) => (area(p) < 0 ? [...p].reverse() : p));
  const secao = new wasm.CrossSection(ccw, 'Positive');
  const componentes = [];
  try {
    for (const parte of secao.decompose()) {
      const externos = []; const furos = [];
      for (const poligono of parte.toPolygons()) {
        const pontos = semPontosColados(poligono.map(([x, z]) => [arredondar(x), arredondar(z)]));
        const a = area(pontos);
        if (a > 0) externos.push(iniciarNoMenor(pontos)); else if (a < 0) furos.push(iniciarNoMenor(pontos));
      }
      parte.delete();
      for (const externo of externos) componentes.push({ externo, furos: furos.sort((a, b) => comparar(a[0], b[0])) });
    }
  } finally { secao.delete(); }
  return componentes.sort((a, b) => comparar(a.externo[0], b.externo[0]));
}

/** A camada de uma face com o cobre traçado, em faixas: o contorno menos os furos (o cobre e os furos de fixação), cortado em
 *  faixas de x de até `largura` mm. A trilha atravessa a placa e não deixa vão entre os furos para a faixa passar, então a faixa
 *  recorta o que cruza a borda dela: cada pedaço é `{ externo, furos }`, com o externo côncavo onde o cobre entra. Cada pedaço
 *  vira uma extrusão pequena; a camada inteira numa extrusão só, com centenas de furos, levava 100 s na placa do braço. */
export function camadaEmFaixas(contorno, furos, largura = 10) {
  const wasm = manifoldCarregada();
  if (!wasm) throw new Error('cobre: a camada em faixas precisa da biblioteca Manifold, que não carregou');
  const ccw = (p) => (area(p) < 0 ? [...p].reverse() : p);
  const xs = contorno.map((p) => p[0]); const zs = contorno.map((p) => p[1]);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs) - 1, Math.max(...zs) + 1];
  const placa = new wasm.CrossSection([ccw(contorno)], 'Positive');
  const buracos = new wasm.CrossSection(furos.map(ccw), 'Positive');
  const resto = placa.subtract(buracos);
  const pecas = [];
  try {
    const n = Math.max(1, Math.ceil((x1 - x0) / largura));
    for (let k = 0; k < n; k += 1) {
      const a = x0 + ((x1 - x0) * k) / n - (k === 0 ? 1 : 0); const b = x0 + ((x1 - x0) * (k + 1)) / n + (k === n - 1 ? 1 : 0);
      const faixa = new wasm.CrossSection([[[a, z0], [b, z0], [b, z1], [a, z1]]], 'Positive');
      const corte = resto.intersect(faixa);
      for (const parte of corte.decompose()) {
        const externos = []; const internos = [];
        for (const poligono of parte.toPolygons()) {
          const pontos = semPontosColados(poligono.map(([x, z]) => [arredondar(x), arredondar(z)]));
          if (pontos.length < 3) continue;
          const s = area(pontos);
          if (s > 0) externos.push(iniciarNoMenor(pontos)); else if (s < 0) internos.push(iniciarNoMenor(pontos));
        }
        parte.delete();
        for (const externo of externos) pecas.push({ externo, furos: internos.sort((p, q) => comparar(p[0], q[0])) });
      }
      corte.delete(); faixa.delete();
    }
  } finally { placa.delete(); buracos.delete(); resto.delete(); }
  return pecas.sort((p, q) => comparar(p.externo[0], q.externo[0]));
}

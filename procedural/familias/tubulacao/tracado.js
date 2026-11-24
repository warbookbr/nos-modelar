/* tracado.js — a leitura e a conferência do traçado de uma rede de tubos, em milímetro.

   O traçado tem o material, os nós (nome e posição) e os trechos (de um nó a outro, com a bitola). Cada nó ganha a conexão
   que o número de trechos e o ângulo entre eles pedem: a ponta (um trecho), a curva (dois trechos com desvio de 15° a 90°, a
   mesma bitola), a continuação (dois trechos alinhados, a mesma bitola), a redução (dois trechos alinhados de bitolas
   diferentes) e o tê (três trechos, dois alinhados e o terceiro a 90°, a mesma bitola). Cada conexão avança sobre o trecho
   (a curva R·tan(desvio/2), com R o centro à boca da curva de 90°; o tê o centro à boca; a redução metade do comprimento
   dela), e o comprimento de corte de cada trecho é a distância entre os nós menos os dois avanços.

   A recusa diz o nó ou o trecho e o motivo: nome repetido ou que não existe, bitola fora da tabela, trecho curto demais
   para as conexões das pontas, dois trechos que se cruzam, nó com mais de três trechos, desvio entre 1° e 15° (sem conexão),
   curva acima de 90°, curva ou tê entre bitolas diferentes e tê que não é reto. */
import { MATERIAIS, bitola } from './tabela.js';

export const ALINHADO = 1;
export const DESVIO_MINIMO = 15;
export const DESVIO_MAXIMO = 90;

export class ErroDoTracado extends Error {
  constructor(mensagem) { super(`traçado: ${mensagem}`); this.name = 'ErroDoTracado'; }
}
const recusar = (mensagem) => { throw new ErroDoTracado(mensagem); };

const sub = (a, b) => a.map((x, k) => x - b[k]);
const comprimento = (v) => Math.hypot(...v);
const unitario = (v) => { const n = comprimento(v); return v.map((x) => x / n); };
const graus = (a, b) => (Math.acos(Math.max(-1, Math.min(1, a.reduce((s, x, k) => s + x * b[k], 0)))) * 180) / Math.PI;

/* a menor distância entre dois segmentos de reta */
function distanciaEntreSegmentos(p1, q1, p2, q2) {
  const d1 = sub(q1, p1); const d2 = sub(q2, p2); const r = sub(p1, p2);
  const dot = (a, b) => a.reduce((s, x, k) => s + x * b[k], 0);
  const a = dot(d1, d1); const e = dot(d2, d2); const f = dot(d2, r);
  let s; let t;
  const c = dot(d1, r); const b = dot(d1, d2); const den = a * e - b * b;
  s = den > 1e-12 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0;
  t = (b * s + f) / e;
  if (t < 0) { t = 0; s = Math.min(1, Math.max(0, -c / a)); } else if (t > 1) { t = 1; s = Math.min(1, Math.max(0, (b - c) / a)); }
  return comprimento(sub(p1.map((x, k) => x + d1[k] * s), p2.map((x, k) => x + d2[k] * t)));
}

/** Lê o traçado `{ material, nos: [{ nome, posicao }], trechos: [{ de, para, bitola }] }` e devolve os nós com a conexão e os trechos com o corte. */
export function lerTracado({ material, nos, trechos } = {}) {
  if (!MATERIAIS.includes(material)) recusar(`material '${material}' não existe; aceitos: ${MATERIAIS.join(', ')}`);
  if (!Array.isArray(nos) || nos.length < 2) recusar('são precisos ao menos dois nós');
  if (!Array.isArray(trechos) || !trechos.length) recusar('é preciso ao menos um trecho');
  const porNome = new Map();
  for (const no of nos) {
    if (typeof no?.nome !== 'string' || !no.nome) recusar(`nó sem nome: ${JSON.stringify(no)}`);
    if (porNome.has(no.nome)) recusar(`o nó '${no.nome}' aparece duas vezes`);
    if (!Array.isArray(no.posicao) || no.posicao.length !== 3 || !no.posicao.every(Number.isFinite)) recusar(`o nó '${no.nome}' precisa de posicao [x, y, z] em mm`);
    if (no.fim !== undefined && !['aberta', 'tampao'].includes(no.fim)) recusar(`o nó '${no.nome}' tem fim '${no.fim}'; aceitos: aberta, tampao`);
    porNome.set(no.nome, { nome: no.nome, posicao: no.posicao, fim: no.fim ?? 'aberta', trechos: [] });
  }
  const lidos = trechos.map((t, i) => {
    const onde = `o trecho ${i} (${t?.de} → ${t?.para})`;
    for (const ponta of ['de', 'para']) if (!porNome.has(t?.[ponta])) recusar(`${onde} cita o nó '${t?.[ponta]}', que não existe`);
    if (t.de === t.para) recusar(`${onde} começa e termina no mesmo nó`);
    let b; try { b = bitola(material, t.bitola); } catch (erro) { recusar(`${onde}: ${erro.message.replace('tubulação: ', '')}`); }
    const p = porNome.get(t.de).posicao; const q = porNome.get(t.para).posicao;
    const distancia = comprimento(sub(q, p));
    if (distancia < 1e-6) recusar(`${onde} tem comprimento zero`);
    const lido = { indice: i, de: t.de, para: t.para, bitola: String(t.bitola), medidas: b, distancia, avancos: { de: 0, para: 0 } };
    porNome.get(t.de).trechos.push({ trecho: lido, ponta: 'de', direcao: unitario(sub(q, p)) });
    porNome.get(t.para).trechos.push({ trecho: lido, ponta: 'para', direcao: unitario(sub(p, q)) });
    return lido;
  });
  for (let i = 0; i < lidos.length; i += 1) for (let j = i + 1; j < lidos.length; j += 1) {
    const [a, b] = [lidos[i], lidos[j]];
    if ([a.de, a.para].some((n) => n === b.de || n === b.para)) { if ((a.de === b.de && a.para === b.para) || (a.de === b.para && a.para === b.de)) recusar(`os trechos ${i} e ${j} ligam os mesmos nós`); continue; }
    const d = distanciaEntreSegmentos(porNome.get(a.de).posicao, porNome.get(a.para).posicao, porNome.get(b.de).posicao, porNome.get(b.para).posicao);
    if (d < (a.medidas.de + b.medidas.de) / 2) recusar(`os trechos ${i} (${a.de} → ${a.para}) e ${j} (${b.de} → ${b.para}) se cruzam: ficam a ${d.toFixed(1)} mm, menos que a soma dos raios (${((a.medidas.de + b.medidas.de) / 2).toFixed(1)} mm)`);
  }
  const conexoes = new Map();
  for (const no of porNome.values()) {
    const ts = no.trechos;
    const onde = `o nó '${no.nome}'`;
    if (ts.length === 0) recusar(`${onde} não tem trecho`);
    if (ts.length > 3) recusar(`${onde} tem ${ts.length} trechos; a cruzeta fica fora, e o nó aceita até três`);
    if (no.fim === 'tampao' && ts.length !== 1) recusar(`${onde} tem tampão e ${ts.length} trechos; o tampão vai só na ponta`);
    if (ts.length === 1) { conexoes.set(no.nome, { tipo: 'ponta', fim: no.fim }); continue; }
    if (ts.length === 2) {
      const [a, b] = ts;
      const desvio = 180 - graus(a.direcao, b.direcao);
      const mesma = a.trecho.bitola === b.trecho.bitola;
      if (desvio < ALINHADO) {
        if (mesma) { conexoes.set(no.nome, { tipo: 'continuacao' }); continue; }
        const [maior, menor] = a.trecho.medidas.de > b.trecho.medidas.de ? [a, b] : [b, a];
        const h = maior.trecho.medidas.reducao;
        maior.trecho.avancos[maior.ponta] = h / 2; menor.trecho.avancos[menor.ponta] = h / 2;
        conexoes.set(no.nome, { tipo: 'reducao', maior: maior.trecho.bitola, menor: menor.trecho.bitola, comprimento: h });
        continue;
      }
      if (desvio < DESVIO_MINIMO) recusar(`${onde} desvia ${desvio.toFixed(1)}°: entre ${ALINHADO}° e ${DESVIO_MINIMO}° não há conexão; alinhe os trechos ou desvie mais`);
      if (desvio > DESVIO_MAXIMO + 1e-9) recusar(`${onde} desvia ${desvio.toFixed(1)}°: a curva vai até ${DESVIO_MAXIMO}°; use dois nós`);
      if (!mesma) recusar(`${onde} faz curva entre as bitolas ${a.trecho.bitola} e ${b.trecho.bitola}; a curva de redução fica fora`);
      const raio = a.trecho.medidas.curva;
      const avanco = raio * Math.tan(((desvio / 2) * Math.PI) / 180);
      a.trecho.avancos[a.ponta] = avanco; b.trecho.avancos[b.ponta] = avanco;
      conexoes.set(no.nome, { tipo: 'curva', desvio, raio, avanco });
      continue;
    }
    if (new Set(ts.map((t) => t.trecho.bitola)).size > 1) recusar(`${onde} é um tê entre bitolas diferentes; o tê de redução fica fora`);
    const pares = [[0, 1, 2], [0, 2, 1], [1, 2, 0]].find(([i, j]) => 180 - graus(ts[i].direcao, ts[j].direcao) < ALINHADO);
    if (!pares) recusar(`${onde} tem três trechos sem dois alinhados; o tê precisa da passagem reta`);
    const [, , k] = pares;
    const angulo = graus(ts[k].direcao, ts[pares[0]].direcao);
    if (Math.abs(angulo - 90) > ALINHADO) recusar(`${onde} tem a derivação a ${angulo.toFixed(1)}° da passagem; o tê inclinado fica fora`);
    const c = ts[0].trecho.medidas.te;
    for (const t of ts) t.trecho.avancos[t.ponta] = c;
    conexoes.set(no.nome, { tipo: 'te', derivacao: ts[k].trecho.indice, centroABoca: c });
  }
  for (const t of lidos) {
    t.corte = t.distancia - t.avancos.de - t.avancos.para;
    if (t.corte <= 0) recusar(`o trecho ${t.indice} (${t.de} → ${t.para}) tem ${t.distancia.toFixed(1)} mm e as conexões das pontas avançam ${(t.avancos.de + t.avancos.para).toFixed(1)} mm: é curto demais`);
  }
  return {
    material,
    nos: [...porNome.values()].map((n) => ({ nome: n.nome, posicao: n.posicao, ...conexoes.get(n.nome) })),
    trechos: lidos.map(({ indice, de, para, bitola: b, medidas, distancia, avancos, corte }) => ({ indice, de, para, bitola: b, diametroExterno: medidas.de, parede: medidas.parede, distancia, avancos, corte })),
  };
}

/* correia.js — a correia dentada fechada em volta de duas polias dentadas da família, em milímetro, e os passos que a
   desenham, em metro.

   As duas polias ficam no plano xz, com o eixo em y: a primeira no centro, a segunda em x = distância entre centros. O
   comprimento primitivo da correia aberta é 2·√(C² − (R2 − R1)²) + R1·(π − 2β) + R2·(π + 2β), com sen β = (R2 − R1)/C e
   R o raio primitivo. A correia tem um número inteiro de dentes, então o comprimento é o número de dentes vezes o passo:
   pedida uma distância, a correia fica com o número de dentes mais próximo, e a distância é recalculada até 1 nm.

   A correia é feita de `extrusao` ao longo de y: o corpo em trechos de 16 dentes, do dorso à face de dentro (um pouco acima
   do externo da polia), e cada dente um sólido à parte com a base encostada na face de dentro, voltado para a polia. Cada dente é o vão do dente
   da polia estreitado em 0,05 mm de cada lado e com o fundo a 0,05 mm do fundo do vão, de modo que a correia não toca a
   polia. As duas polias giram em volta do próprio eixo até um vão ficar sob um dente da correia, e a segunda sobe ou desce
   em y até a faixa dela ficar na altura da faixa da primeira.

   A altura da correia e a do dente vêm da tabela "Timing Belt Tooth Profiles and Pitches" da Pfeifer Industries (GT2 2 mm,
   HTD 3M e 5M e T5); a GT2 é perfil do fabricante, sem norma pública. */
import { CORREIAS_DENTADAS, geometriaDaPolia } from './geometria.js';

/* altura total da correia e altura do dente, em mm, por correia da família */
export const CORREIAS = Object.freeze({
  1: Object.freeze({ altura: 1.52, dente: 0.76 }),
  2: Object.freeze({ altura: 2.41, dente: 1.22 }),
  3: Object.freeze({ altura: 3.81, dente: 2.08 }),
  4: Object.freeze({ altura: 2.2, dente: 1.2 }),
});
/* folga entre a correia e a polia: a face de dentro fica esta distância acima do externo, e o dente esta distância dentro do vão */
export const FOLGA = 0.05;
/* graus por segmento nos arcos do dorso e da face de dentro */
const GRAUS_POR_SEGMENTO = 5;
/* dentes por trecho da correia */
export const DENTES_POR_TRECHO = 16;

export class ErroDaCorreia extends Error {
  constructor(mensagem) { super(`correia: ${mensagem}`); this.name = 'ErroDaCorreia'; }
}

export function comprimentoPrimitivo(r1, r2, c) {
  const beta = Math.asin((r2 - r1) / c);
  return 2 * Math.sqrt(c * c - (r2 - r1) ** 2) + r1 * (Math.PI - 2 * beta) + r2 * (Math.PI + 2 * beta);
}

/** A transmissão de duas polias dentadas (parâmetros completos da família, em mm) com a distância pedida, em mm. */
export function transmissaoDentada(parametros1, parametros2, distancia) {
  const g1 = geometriaDaPolia(parametros1);
  const g2 = geometriaDaPolia(parametros2);
  if (g1.tipo !== 1 || g2.tipo !== 1) throw new ErroDaCorreia('as duas polias precisam ser dentadas (tipo 1)');
  if (parametros1.correia !== parametros2.correia) throw new ErroDaCorreia(`as duas polias precisam da mesma correia (vieram ${g1.correia} e ${g2.correia})`);
  if (parametros1.largura !== parametros2.largura) throw new ErroDaCorreia(`as duas polias precisam da mesma largura de correia (vieram ${parametros1.largura} e ${parametros2.largura} mm)`);
  const troca = g2.diametroPrimitivo < g1.diametroPrimitivo;
  if (troca) throw new ErroDaCorreia('a primeira polia é a menor: passe a de menos dentes primeiro');
  const r1 = g1.diametroPrimitivo / 2;
  const r2 = g2.diametroPrimitivo / 2;
  const minima = r1 + r2 + 2 * CORREIAS[parametros1.correia].altura;
  if (!(distancia > minima)) throw new ErroDaCorreia(`a distância entre centros ${distancia} mm não passa da soma dos raios com a correia (${minima.toFixed(2)} mm)`);
  const passo = g1.passo;
  const dentesDaCorreia = Math.round(comprimentoPrimitivo(r1, r2, distancia) / passo);
  const alvo = dentesDaCorreia * passo;
  let baixo = Math.max(r2 - r1 + 1e-9, minima * 0.5);
  let alto = distancia * 2 + alvo;
  for (let k = 0; k < 200; k += 1) {
    const meio = (baixo + alto) / 2;
    if (comprimentoPrimitivo(r1, r2, meio) < alvo) baixo = meio; else alto = meio;
  }
  const c = (baixo + alto) / 2;
  return { g1, g2, r1, r2, distanciaEntreCentros: c, distanciaPedida: distancia, dentesDaCorreia, comprimento: alvo, passo, relacao: g2.dentes / g1.dentes, correia: parametros1.correia, largura: parametros1.largura };
}

/* o laço a uma distância d da linha primitiva (d > 0 para fora): ponto e normal para fora por comprimento de arco s da linha primitiva */
function laco(t) {
  const { r1, r2, distanciaEntreCentros: c } = t;
  const beta = Math.asin((r2 - r1) / c);
  const arco1 = r1 * (Math.PI - 2 * beta);
  const reta = Math.sqrt(c * c - (r2 - r1) ** 2);
  const arco2 = r2 * (Math.PI + 2 * beta);
  const total = arco1 + reta + arco2 + reta;
  const a1 = Math.PI / 2 + beta;
  const a2 = (3 * Math.PI) / 2 - beta;
  const emCirculo = (cx, r, a, d) => ({ p: [cx + (r + d) * Math.cos(a), (r + d) * Math.sin(a)], n: [Math.cos(a), Math.sin(a)] });
  const ponto = (s0, d) => {
    let s = ((s0 % total) + total) % total;
    if (s <= arco1) return emCirculo(0, r1, a1 + s / r1, d);
    s -= arco1;
    if (s <= reta) {
      const ini = emCirculo(0, r1, a2, 0); const fim = emCirculo(c, r2, a2, 0); const f = s / reta;
      return { p: [ini.p[0] + f * (fim.p[0] - ini.p[0]) + d * ini.n[0], ini.p[1] + f * (fim.p[1] - ini.p[1]) + d * ini.n[1]], n: ini.n };
    }
    s -= reta;
    if (s <= arco2) return emCirculo(c, r2, a2 + s / r2, d);
    s -= arco2;
    const ini = emCirculo(c, r2, a1 + 2 * Math.PI, 0); const fim = emCirculo(0, r1, a1, 0); const f = s / reta;
    return { p: [ini.p[0] + f * (fim.p[0] - ini.p[0]) + d * ini.n[0], ini.p[1] + f * (fim.p[1] - ini.p[1]) + d * ini.n[1]], n: ini.n };
  };
  /* os pontos de quebra do laço (fim de cada trecho) e o meio de cada arco */
  return { ponto, total, arco1, reta, arco2, a1, a2 };
}

/* amostras de s ao longo do laço: as quebras dos trechos e os arcos a cada GRAUS_POR_SEGMENTO */
function amostras(l, t) {
  const s = [];
  const nArco = (comprimento, r) => Math.max(2, Math.ceil(((comprimento / r) * 180) / Math.PI / GRAUS_POR_SEGMENTO));
  const n1 = nArco(l.arco1, t.r1); for (let k = 0; k < n1; k += 1) s.push((l.arco1 * k) / n1);
  s.push(l.arco1);
  const n2 = nArco(l.arco2, t.r2); for (let k = 0; k < n2; k += 1) s.push(l.arco1 + l.reta + (l.arco2 * k) / n2);
  s.push(l.arco1 + l.reta + l.arco2);
  return s;
}

/* tira o ponto que fica a menos de ALINHADO da reta entre o anterior e o seguinte: uma amostra do arco junto da reta deixa
   pontos quase alinhados, e a tampa da extrusão sai com triângulo de área nula, que a medida de contatos não aceita */
const ALINHADO = 0.001;
function semAlinhados(pontos) {
  const saida = [];
  for (let i = 0; i < pontos.length; i += 1) {
    const a = saida.length ? saida[saida.length - 1] : pontos[pontos.length - 1];
    const b = pontos[i];
    const c = pontos[(i + 1) % pontos.length];
    const dx = c[0] - a[0]; const dz = c[1] - a[1];
    const comprimento = Math.hypot(dx, dz);
    const distancia = comprimento > 0 ? Math.abs((b[0] - a[0]) * dz - (b[1] - a[1]) * dx) / comprimento : 0;
    if (distancia >= ALINHADO) saida.push(b);
  }
  return saida;
}

/** A geometria da correia: o dorso, a face de dentro com os dentes, o giro de cada polia e a altura da segunda, em mm. */
export function geometriaDaCorreia(t) {
  const perfil = CORREIAS_DENTADAS[t.correia];
  const correia = CORREIAS[t.correia];
  const pld = (t.g1.diametroPrimitivo - t.g1.diametroExterno) / 2;
  const dentro0 = -pld + FOLGA;
  const dorso = dentro0 + correia.altura - correia.dente;
  const l = laco(t);
  /* o primeiro dente no meio do arco da primeira polia (ângulo π) */
  const meio1 = l.arco1 / 2;
  const s0 = meio1 % t.passo;
  const centros = Array.from({ length: t.dentesDaCorreia }, (_, k) => s0 + k * t.passo);
  /* o dente: meia largura na base e a altura, dentro do vão da polia */
  const meia = perfil.largura / 2 - FOLGA;
  const altura = Math.min(correia.dente, perfil.profundidade + FOLGA - FOLGA);
  const pontosDoDente = (centro) => {
    const { p, n } = l.ponto(centro, dentro0);
    const tg = [-n[1], n[0]];
    const local = (u, v) => [p[0] + u * tg[0] - v * n[0], p[1] + u * tg[1] - v * n[1]];
    if (perfil.forma === 'trapezio') {
      const fundo = meia - altura * Math.tan((perfil.angulo / 2) * (Math.PI / 180));
      return [local(-fundo, altura), local(fundo, altura)];
    }
    const rr = Math.min(meia, altura);
    const reto = altura - rr;
    const pts = [local(-meia, reto)];
    for (let k = 1; k < 4; k += 1) { const a = Math.PI + (Math.PI * k) / 4; pts.push(local(rr * Math.cos(a), reto - rr * Math.sin(a))); }
    pts.push(local(meia, reto));
    return pts;
  };
  /* a correia sai em trechos de DENTES_POR_TRECHO dentes, cortados no meio da face lisa entre dois dentes: um contorno de
     mil pontos com furo custa dezenas de segundos na divisão da tampa em pedaços convexos, e trechos pequenos custam pouco */
  const quebras = amostras(l, t);
  const entre = (a, b) => quebras.flatMap((q) => [q, q + l.total, q - l.total]).filter((q) => q > a + 1e-6 && q < b - 1e-6).sort((x, y) => x - y);
  const trechos = [];
  for (let k0 = 0; k0 < centros.length; k0 += DENTES_POR_TRECHO) {
    const k1 = Math.min(centros.length, k0 + DENTES_POR_TRECHO);
    const ini = centros[k0] - t.passo / 2;
    const fim = centros[k1 - 1] + t.passo / 2;
    const meio = entre(ini, fim);
    const dentro = [ini, ...meio, fim].map((q) => l.ponto(q, dentro0).p);
    const fora = [fim, ...meio.reverse(), ini].map((q) => l.ponto(q, dorso).p);
    trechos.push(semAlinhados([...dentro, ...fora]));
  }
  /* cada dente é um sólido à parte, com a base na face de dentro do corpo: na tampa de um contorno só, as bases dos dentes
     de um trecho reto ficam na mesma reta e a divisão em pedaços convexos deixa pedaços de área nula entre elas */
  const dentesDaCorreia = centros.map((centro) => [l.ponto(centro + meia, dentro0).p, ...pontosDoDente(centro).reverse(), l.ponto(centro - meia, dentro0).p]);
  /* giro de cada polia para um vão ficar sob um dente: o vão 0 está no ângulo 0, e girar θ em y leva o ângulo a para a − θ */
  const anguloNoArco = (s, cx) => { const { p } = l.ponto(s, 0); return Math.atan2(p[1], p[0] - cx); };
  const meio2 = l.arco1 + l.reta + l.arco2 / 2;
  const dente2 = centros.reduce((melhor, s) => (Math.abs(s - meio2) < Math.abs(melhor - meio2) ? s : melhor), centros[0]);
  const graus = (a) => (a * 180) / Math.PI;
  return {
    trechos, contornosDosDentes: dentesDaCorreia, dentes: centros.length, larguraDaCorreia: t.largura,
    giro1: -graus(anguloNoArco(centros[0] + Math.round((meio1 - s0) / t.passo) * t.passo, 0)),
    giro2: -graus(anguloNoArco(dente2, t.distanciaEntreCentros)),
    alturaDaSegunda: t.g1.centroDaFaixa - t.g2.centroDaFaixa,
    baseDaCorreia: t.g1.centroDaFaixa - t.largura / 2,
    altura,
  };
}

/** Os passos da correia (metro), com o `origemId` dado e a parte `nome`. */
export function passosDaCorreia(geometria, { origemId, nome = 'correia' }) {
  const m = (mm) => mm / 1000;
  const xz = (pts) => pts.map(([x, z]) => [m(x), m(z)]);
  const contornos = [...geometria.trechos, ...geometria.contornosDosDentes];
  return contornos.flatMap((contorno, k) => [
    ['extrusao', { origemId: origemId + k, perfil: xz(contorno), altura: m(geometria.larguraDaCorreia), em: [0, m(geometria.baseDaCorreia), 0] }],
    ['parte', { nome, sel: { origem: { op: 'extrusao', id: origemId + k } } }],
  ]);
}

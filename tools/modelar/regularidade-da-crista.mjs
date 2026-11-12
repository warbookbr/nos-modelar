#!/usr/bin/env node
/* regularidade-da-crista.mjs — percorre cada crista da superfície de subdivisão e acusa onde o que ela mede varia de repente, com a posição em mm.
 *
 * POR QUE ELE EXISTE. A `vinco-oculto` dá, por cadeia de cristas, a posição média e o ângulo médio. No canto de cima da coluna do para-brisa do furgão
 * realista (2026-11-09) o realce da crista faz um gancho que a pessoa vê na imagem, no nó onde uma coluna da gaiola morre, e nenhum número da cadeia
 * inteira o acusa: a média de 53 arestas não muda por causa de uma. Esta régua mede ao longo da cadeia, aresta a aresta, e diz onde.
 *
 * O QUE MEDE. As cadeias são as de `vinco-oculto.mjs` (as cristas que se tocam), todas, aceitas ou não pela receita: a região aceita diz que a crista
 * é desenho, e não que o gancho dela também é. Cada cadeia vira o caminho mais longo entre as pontas (as arestas laterais ficam de fora), e sobre ele:
 *   diedro   o ângulo entre as normais das duas faces de cada aresta, contra a mediana das `vizinhosDoDiedro` arestas de cada lado (as últimas
 *            `vizinhosDoDiedro` de cada ponta ficam de fora, porque a crista afina até sumir); acusa o trecho em que a aresta passa `saltoDiedroGraus` da vizinhança (valor, vizinhança e posição são os da pior aresta do trecho);
 *   virada   a direção do caminho antes e depois de cada vértice, em janelas de `janelaMm` mm (menores nas pontas, até uma aresta): o ângulo entre
 *            as duas; acusa o vértice com `viradaMinimaGraus` ou mais, com a mediana das viradas de 4 janelas para trás de cada lado como vizinhança;
 *   lacuna   a ponta de uma cadeia a no máximo `lacunaMaximaMm` da ponta de OUTRA cadeia, com a segunda adiante da primeira (a até
 *            `anguloMaximoGraus` da direção com que a primeira chega): a crista que acaba e recomeça ao lado, que é o nó da coluna que morre. Diz a
 *            distância, o desvio de lado e o ângulo entre as direções das duas cadeias; a vizinhança é o comprimento médio das arestas da ponta.
 * REBAIXAMENTOS. Um achado que cumpre uma destas regras gerais (nenhuma olha o nome de peça ou de parte) sai da lista dos acusados e vai para a dos
 * "prováveis desenho", com o motivo, e nada some em silêncio; só os acusados contam no resumo:
 *   canto            virada de `cantoMinimoGraus` ou mais com a direção reta (menos de `retaMaximaGraus` de virada mediana) dos lados que têm crista adiante: canto de propósito;
 *   dobra na ponta   virada de `dobraNaPontaGraus` ou mais a no máximo duas janelas da ponta do caminho: a cadeia volta sobre si, artefato do percurso;
 *   ponta curta      virada a menos de um terço de janela da ponta do caminho, onde a crista afina e a aresta é curta demais para dar uma direção;
 *   curva suave      o ângulo (virada ou diedro) se reparte por vários vértices ou arestas: a virada de uma aresta só chega a `curvaFracao` da virada em janela, ou o diedro
 *                    das duas arestas vizinhas guarda de `inchacoMinimo` a `inchacoMaximo` do desvio (um inchaço, e não um degrau nem um patamar);
 *   repetição        outra variação do mesmo tipo e de valor parecido (`repeticaoTolerancia`) na mesma cadeia, as duas longe das pontas: faceta regular repetida;
 *   lacuna colinear  menos de `lacunaColinearLadoMm` de lado e `lacunaColinearGraus` entre as direções: a crista continua na mesma linha, interrompida por um vão;
 *   lacuna curta     a menor das duas cadeias tem menos de `lacunaCurtaFator` vezes a folga: duas feições pequenas, e não uma crista interrompida.
 * Cada achado leva a parte, a posição em mm do referencial da peça, a distância ao começo da cadeia, o valor e o da vizinhança.
 *
 * O LIMITE. A régua aponta onde olhar; ela não diz se o que achou é defeito. Uma crista que faz a volta de um canto, ou que acaba onde uma abertura a
 * corta, tem viradas e lacunas de propósito, e quem aprova a forma é a pessoa, olhando a imagem de perto (`--imagem`). Não é gate.
 *
 *   node tools/modelar/regularidade-da-crista.mjs <peça> [--ate-passo=N | --ate-subdivisao=K] [--imagem=<png>] [--achado=1] [--raio=120]
 *        [--vista=auto|<vista>] [--largura=900] [--janela=15] [--salto-diedro=4] [--virada=30] [--lacuna=60] [--angulo-minimo=12] [--completo]
 * `--ate-passo` (ou `--ate-subdivisao`, a K-ésima subdivisão da receita) executa só os passos até a chapa, sem frisos, vãos e rodas que vêm depois: o que um
 * passo seguinte corta da chapa não entra. `--imagem` grava a vista de perto só da chapa em volta do achado (`--achado`, 1 é o primeiro da lista), com o
 * caminho da cadeia em vermelho e o ponto em amarelo; sem `--vista` a câmera olha de fora, ao longo da normal média das faces ali. */
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { PADROES as PADROES_DA_CRISTA, vincoOcultoDaSuperficie } from './vinco-oculto.mjs';
import { superficiesDaReceita } from './dobra-da-superficie.mjs';
import { ErroDoModelo, abrirModelo, resumoDaAbertura } from './modelo-aberto.mjs';
import { camera, rasterSombreado } from './vista-rapida.mjs';
import { paraPng } from './leitura-por-regioes.mjs';

export const PADROES = Object.freeze({
  janelaMm: 15, vizinhosDoDiedro: 3, saltoDiedroGraus: 4, viradaMinimaGraus: 30, lacunaMaximaMm: 60, anguloMaximoGraus: 60,
  /* o que rebaixa um achado a "provável desenho" (ver REBAIXAMENTOS no cabeçalho) */
  cantoMinimoGraus: 80, retaMaximaGraus: 10, dobraNaPontaGraus: 150, lacunaColinearLadoMm: 2, lacunaColinearGraus: 10, lacunaCurtaFator: 3,
  repeticaoTolerancia: 0.15, curvaFracao: 0.6, inchacoMinimo: 0.5, inchacoMaximo: 0.9,
});
const MM = 1000;
const arred = (x, casas = 1) => { const f = 10 ** casas; const r = Math.round(x * f) / f; return Object.is(r, -0) ? 0 : r; };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => { const n = norma(a) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
const angulo = (a, b) => (Math.acos(Math.max(-1, Math.min(1, dot(a, b) / ((norma(a) * norma(b)) || 1)))) * 180) / Math.PI;
const mediana = (v) => { if (!v.length) return 0; const o = [...v].sort((x, y) => x - y); const m = o.length >> 1; return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2; };
const n1 = (x) => String(arred(x, 1)).replace('.', ',');

/** O caminho mais longo entre as pontas de uma cadeia: `{ vertices, pontos (mm), s (mm desde a primeira ponta), diedros (de cada aresta do caminho), foraDoCaminho }`. */
export function caminhoDaCadeia(cadeia, V) {
  const adj = new Map(); const turno = new Map();
  const chave = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  for (const x of cadeia.itens) {
    for (const [p, q] of [[x.e.a, x.e.b], [x.e.b, x.e.a]]) { if (!adj.has(p)) adj.set(p, []); adj.get(p).push({ q, l: dist(V[p], V[q]) * MM }); }
    turno.set(chave(x.e.a, x.e.b), x.t);
  }
  /* a ponta mais longe de um vértice qualquer, e depois a mais longe dela: o diâmetro; a ordem de visita é a dos vértices, então a saída é a mesma sempre */
  const longe = (de) => {
    const d = new Map([[de, 0]]); const veio = new Map(); const fila = [de];
    for (let i = 0; i < fila.length; i += 1) {
      const u = fila[i];
      for (const { q, l } of adj.get(u)) { const nd = d.get(u) + l; if (!d.has(q) || nd < d.get(q) - 1e-9) { d.set(q, nd); veio.set(q, u); fila.push(q); } }
    }
    let b = de;
    for (const [k, v] of d) if (v > d.get(b) + 1e-9 || (Math.abs(v - d.get(b)) <= 1e-9 && k < b)) b = k;
    return { b, veio };
  };
  const inicio = [...adj.keys()].sort((a, b) => a - b)[0];
  const A = longe(inicio).b; const { b: B, veio } = longe(A);
  const vertices = [B]; while (vertices[vertices.length - 1] !== A) vertices.push(veio.get(vertices[vertices.length - 1]));
  vertices.reverse();
  const pontos = vertices.map((v) => V[v].map((x) => x * MM));
  const s = [0]; for (let i = 1; i < pontos.length; i += 1) s.push(s[i - 1] + dist(pontos[i], pontos[i - 1]));
  const diedros = []; for (let i = 0; i + 1 < vertices.length; i += 1) diedros.push(turno.get(chave(vertices[i], vertices[i + 1])));
  return { vertices, pontos, s, diedros, foraDoCaminho: cadeia.itens.length - diedros.length };
}

/** O salto do diedro: as arestas do caminho cujo ângulo passa `saltoDiedroGraus` da mediana das vizinhas, agrupadas em trechos. */
function saltosDoDiedro(c, o) {
  const n = c.diedros.length; const marcadas = [];
  for (let i = 0; i < n; i += 1) {
    const viz = []; for (let k = Math.max(0, i - o.vizinhosDoDiedro); k <= Math.min(n - 1, i + o.vizinhosDoDiedro); k += 1) if (k !== i) viz.push(c.diedros[k]);
    /* a vizinhança tem de estar inteira dos dois lados: nas últimas arestas a crista afina até sumir, e o diedro cai ali em toda cadeia */
    if (viz.length < 2 * o.vizinhosDoDiedro) continue;
    const m = mediana(viz); const desvio = c.diedros[i] - m;
    if (Math.abs(desvio) >= o.saltoDiedroGraus) marcadas.push({ i, desvio, vizinhanca: m });
  }
  const trechos = [];
  for (const m of marcadas) {
    const ultimo = trechos[trechos.length - 1];
    if (ultimo && m.i - ultimo[ultimo.length - 1].i <= 2) ultimo.push(m); else trechos.push([m]);
  }
  return trechos.map((t) => {
    const pior = t.reduce((a, b) => (Math.abs(b.desvio) > Math.abs(a.desvio) ? b : a));
    const meio = [0, 1, 2].map((k) => (c.pontos[pior.i][k] + c.pontos[pior.i + 1][k]) / 2);
    const sMeio = (c.s[pior.i] + c.s[pior.i + 1]) / 2;
    /* quanto do desvio as duas arestas vizinhas guardam: perto de 0 é um degrau, perto de 1 um patamar, no meio um inchaço (uma curva de várias arestas) */
    const guarda = [-1, 1].map((d) => ((c.diedros[pior.i + d] - pior.vizinhanca) * Math.sign(pior.desvio)) / Math.abs(pior.desvio));
    const inchaco = guarda.every((g) => g >= o.inchacoMinimo && g <= o.inchacoMaximo);
    return {
      tipo: 'diedro', posicaoMm: meio.map((x) => arred(x)), sMm: arred(sMeio), distanciaAoFimMm: arred(c.s[c.s.length - 1] - sMeio), valor: arred(c.diedros[pior.i]), vizinhanca: arred(pior.vizinhanca),
      desvio: arred(pior.desvio), arestas: t.length, nota: `a aresta tem ${n1(c.diedros[pior.i])} graus de diedro contra ${n1(pior.vizinhanca)} nas vizinhas`,
      ...(inchaco ? { regra: 'curva-suave', motivo: `um inchaço do diedro, e não um salto: as duas arestas vizinhas guardam ${guarda.map((g) => `${Math.round(g * 100)}%`).join(' e ')} do desvio` } : {}),
    };
  });
}

/** A virada da direção do caminho em cada vértice, em janelas de `janelaMm`, e os vértices que passam `viradaMinimaGraus`, agrupados em trechos. */
function viradasDoCaminho(c, o) {
  const n = c.pontos.length; const viradas = new Array(n).fill(null);
  for (let i = 1; i < n - 1; i += 1) {
    let a = i; while (a > 0 && c.s[i] - c.s[a] < o.janelaMm) a -= 1;
    let b = i; while (b < n - 1 && c.s[b] - c.s[i] < o.janelaMm) b += 1;
    viradas[i] = angulo(sub(c.pontos[i], c.pontos[a]), sub(c.pontos[b], c.pontos[i]));
  }
  const marcadas = [];
  for (let i = 1; i < n - 1; i += 1) if (viradas[i] >= o.viradaMinimaGraus) marcadas.push(i);
  const trechos = [];
  for (const i of marcadas) {
    const ultimo = trechos[trechos.length - 1];
    if (ultimo && i - ultimo[ultimo.length - 1] <= 2) ultimo.push(i); else trechos.push([i]);
  }
  return trechos.map((t) => {
    const pior = t.reduce((a, b) => (viradas[b] > viradas[a] ? b : a));
    const antes = []; const depois = [];
    for (let k = 1; k < n - 1; k += 1) {
      const d = c.s[k] - c.s[pior];
      if (d < -o.janelaMm && d >= -5 * o.janelaMm) antes.push(viradas[k]); else if (d > o.janelaMm && d <= 5 * o.janelaMm) depois.push(viradas[k]);
    }
    const viz = mediana([...antes, ...depois]);
    const aoFim = c.s[n - 1] - c.s[pior];
    const umaAresta = angulo(sub(c.pontos[pior], c.pontos[pior - 1]), sub(c.pontos[pior + 1], c.pontos[pior]));
    const reta = (lado) => !lado.length || mediana(lado) < o.retaMaximaGraus;
    let rebaixo = null;
    if (viradas[pior] >= o.dobraNaPontaGraus && Math.min(c.s[pior], aoFim) <= 2 * o.janelaMm) {
      rebaixo = ['dobra-na-ponta', `a cadeia dobra sobre si ${n1(viradas[pior])} graus a ${n1(Math.min(c.s[pior], aoFim))} mm da ponta do caminho, artefato do percurso e não crista`];
    } else if (viradas[pior] >= o.cantoMinimoGraus && (antes.length || depois.length) && reta(antes) && reta(depois)) {
      rebaixo = ['canto', `canto de ${n1(viradas[pior])} graus com a crista reta dos lados que a têm (virada mediana de ${n1(antes.length ? mediana(antes) : 0)} antes e ${n1(depois.length ? mediana(depois) : 0)} depois)`];
    } else if (Math.min(c.s[pior], aoFim) < o.janelaMm / 3) {
      rebaixo = ['ponta-curta', `o vértice está a ${n1(Math.min(c.s[pior], aoFim))} mm da ponta do caminho, onde a crista afina até sumir e a direção de uma aresta tão curta não vale`];
    } else if (umaAresta <= o.curvaFracao * viradas[pior]) {
      rebaixo = ['curva-suave', `a mudança de direção se reparte por vários vértices: ${n1(umaAresta)} graus numa aresta contra ${n1(viradas[pior])} em ${o.janelaMm} mm`];
    }
    return {
      tipo: 'virada', posicaoMm: c.pontos[pior].map((x) => arred(x)), sMm: arred(c.s[pior]), distanciaAoFimMm: arred(aoFim), valor: arred(viradas[pior]), vizinhanca: arred(viz), vertices: t.length,
      nota: `a direção da crista muda ${n1(viradas[pior])} graus em ${o.janelaMm} mm de cada lado, contra ${n1(viz)} nas vizinhas`, ...(rebaixo ? { regra: rebaixo[0], motivo: rebaixo[1] } : {}),
    };
  });
}

/** Cada cadeia com o caminho e as pontas: `{ parte, comprimentoMm, caminho, pontas: [{ ponto, saindo, comprimentoDaAresta }] }`. */
function cadeiasMedidas(cadeias, V, o) {
  return cadeias.map((cadeia) => {
    const c = caminhoDaCadeia(cadeia, V);
    const n = c.pontos.length;
    const ponta = (fim) => {
      const i = fim === 0 ? 0 : n - 1; const passo = fim === 0 ? 1 : -1;
      let j = i; while (j + passo >= 0 && j + passo < n && Math.abs(c.s[j] - c.s[i]) < o.janelaMm) j += passo;
      return { ponto: c.pontos[i], saindo: unit(sub(c.pontos[i], c.pontos[j])), aresta: dist(c.pontos[i], c.pontos[i + passo]), s: c.s[i] };
    };
    return { cadeia, c, pontas: [ponta(0), ponta(n - 1)] };
  });
}

/** As lacunas: a ponta de uma cadeia perto da ponta de outra, com a outra adiante. Cada par sai uma vez, pela ponta de cima na ordem das cadeias. */
function lacunas(medidas, o) {
  const achadas = [];
  for (let i = 0; i < medidas.length; i += 1) for (let j = i + 1; j < medidas.length; j += 1) {
    for (let a = 0; a < 2; a += 1) for (let b = 0; b < 2; b += 1) {
      const A = medidas[i].pontas[a]; const B = medidas[j].pontas[b];
      const folga = dist(A.ponto, B.ponto);
      if (folga > o.lacunaMaximaMm || folga < 1e-6) continue;
      const de = sub(B.ponto, A.ponto); const volta = sub(A.ponto, B.ponto);
      if (angulo(A.saindo, de) > o.anguloMaximoGraus || angulo(B.saindo, volta) > o.anguloMaximoGraus) continue;
      const lado = norma(sub(de, A.saindo.map((x) => x * dot(de, A.saindo))));
      /* o ângulo entre as duas cadeias: 0 quando uma continua a outra (as direções de saída são opostas) */
      const entre = angulo(A.saindo, B.saindo.map((x) => -x));
      const media = (A.aresta + B.aresta) / 2;
      const menor = Math.min(medidas[i].c.s[medidas[i].c.s.length - 1], medidas[j].c.s[medidas[j].c.s.length - 1]);
      let rebaixo = null;
      if (lado < o.lacunaColinearLadoMm && entre < o.lacunaColinearGraus) {
        rebaixo = ['lacuna-colinear', `a crista continua na mesma linha depois do vão (${n1(lado)} mm de lado, ${n1(entre)} graus entre as direções)`];
      } else if (menor < o.lacunaCurtaFator * folga) {
        rebaixo = ['lacuna-curta', `a menor das duas cadeias tem ${n1(menor)} mm contra a folga de ${n1(folga)} mm: duas feições pequenas, e não uma crista interrompida`];
      }
      achadas.push({
        tipo: 'lacuna', parte: medidas[i].cadeia.parte, posicaoMm: A.ponto.map((x, k) => arred((x + B.ponto[k]) / 2)), sMm: arred(A.s), valor: arred(folga), vizinhanca: arred(media),
        desvioDeLadoMm: arred(lado), anguloEntreCadeiasGraus: arred(entre), pontaMm: A.ponto.map((x) => arred(x)), outraPontaMm: B.ponto.map((x) => arred(x)),
        cadeias: [i, j], ...(rebaixo ? { regra: rebaixo[0], motivo: rebaixo[1] } : {}),
        nota: `a crista acaba a ${n1(folga)} mm de outra cadeia (${n1(lado)} mm de lado, ${n1(entre)} graus entre as direções), contra arestas de ${n1(media)} mm`,
      });
    }
  }
  return achadas;
}

/** A repetição: um achado de virada ou de diedro (do mesmo sinal) com outro de valor parecido na mesma cadeia, os dois a mais de duas janelas das pontas, é faceta regular. */
function marcarRepeticoes(c, o) {
  const longe = (a) => a.sMm > 2 * o.janelaMm && a.distanciaAoFimMm > 2 * o.janelaMm;
  const candidatos = c.achados.filter((a) => !a.regra && (a.tipo === 'virada' || a.tipo === 'diedro') && longe(a));
  for (const a of candidatos) {
    const par = candidatos.find((b) => b !== a && b.tipo === a.tipo && Math.sign(b.desvio ?? 1) === Math.sign(a.desvio ?? 1) && Math.abs(b.valor - a.valor) <= o.repeticaoTolerancia * Math.max(a.valor, b.valor));
    if (par) { a.regra = 'repeticao'; a.motivo = `faceta repetida: outra variação do mesmo tipo e de valor parecido (${n1(par.valor)} graus) na mesma cadeia, a ${n1(Math.abs(par.sMm - a.sMm))} mm`; }
  }
}

/**
 * regularidadeDaSuperficie(sup, opcoes) -> { cadeias, achados (os acusados), rebaixados (os prováveis desenho, com `regra` e `motivo`) }
 * `opcoes` leva as de `vinco-oculto` (que cristas contam) e as de `PADROES` (o que a régua acusa).
 */
export function regularidadeDaSuperficie(sup, opcoes = {}) {
  const o = { ...PADROES_DA_CRISTA, ...PADROES, ...opcoes };
  const { _cadeias } = vincoOcultoDaSuperficie(sup, o);
  const V = sup.vertices;
  const medidas = cadeiasMedidas(_cadeias, V, o);
  const cadeias = medidas.map(({ cadeia, c }, indice) => {
    const achados = [...saltosDoDiedro(c, o), ...viradasDoCaminho(c, o)].map((a) => ({ ...a, parte: cadeia.parte }));
    return {
      indice, parte: cadeia.parte, arestas: cadeia.itens.length, comprimentoMm: arred(c.s[c.s.length - 1]), pontasMm: [c.pontos[0], c.pontos[c.pontos.length - 1]].map((p) => p.map((x) => arred(x))),
      diedroGraus: { min: arred(Math.min(...c.diedros)), max: arred(Math.max(...c.diedros)) }, foraDoCaminho: c.foraDoCaminho, achados, _caminho: c,
    };
  });
  for (const c of cadeias) marcarRepeticoes(c, o);
  const todos = [
    ...lacunas(medidas, o),
    ...cadeias.flatMap((c) => c.achados.map((a) => ({ ...a, cadeia: c.indice }))),
  ].map((a) => (a.regra ? { ...a, classe: 'provável desenho' } : { ...a, classe: 'acusado' }));
  /* cada cadeia guarda os seus acusados em `achados` e os rebaixados em `rebaixados`, e a superfície, os dois juntos, acusados primeiro */
  for (const c of cadeias) { c.rebaixados = c.achados.filter((a) => a.regra); c.achados = c.achados.filter((a) => !a.regra); }
  const achados = todos.filter((a) => a.classe === 'acusado');
  const rebaixados = todos.filter((a) => a.classe !== 'acusado');
  /* o pior primeiro: a lacuna, depois a virada, depois o diedro; dentro de cada tipo o valor maior, e a posição desempata */
  const ordemDoTipo = { lacuna: 0, virada: 1, diedro: 2 };
  const ordem = (a, b) => ordemDoTipo[a.tipo] - ordemDoTipo[b.tipo] || (b.tipo === 'lacuna' ? a.valor - b.valor : (b.desvio ?? b.valor) - (a.desvio ?? a.valor)) || a.posicaoMm[0] - b.posicaoMm[0] || a.posicaoMm[1] - b.posicaoMm[1] || a.posicaoMm[2] - b.posicaoMm[2];
  achados.sort(ordem); rebaixados.sort(ordem);
  return { opcoes: o, cadeias, achados, rebaixados };
}
/** A superfície de cada passo `subdivisao` da receita, com a régua rodada nela: `{ passo, cadeias, achados, _sup }`. `executada` é `{ entrada, neutro }`. */
export const MOTIVO_DO_NIVEL_ZERO = 'gaiola sem subdivisão (niveis 0): a aresta viva é a forma, e não crista de superfície a medir';
/** A gaiola de `niveis` 0 (a faixa do forro de um vão, a lâmina de um corte) sai com `pulado` e sem cadeia: a ondulação da superfície pula a mesma gaiola pelo mesmo motivo. */
export function regularidadeDaReceita(receita, opcoes = {}, executada = null) {
  return superficiesDaReceita(receita, executada).map((sup) => (sup.niveis === 0
    ? { passo: sup.passo, pulado: MOTIVO_DO_NIVEL_ZERO, opcoes, cadeias: [], achados: [], rebaixados: [], _sup: sup }
    : { passo: sup.passo, ...regularidadeDaSuperficie(sup, opcoes), _sup: sup }));
}

export function textoDoAchado(a) {
  if (a.motivo) return `${textoBase(a)} [provável desenho (${a.regra}): ${a.motivo}]`;
  return textoBase(a);
}
function textoBase(a) {
  const pos = `[${a.posicaoMm.join('; ')}] mm`;
  const parte = `na parte ${a.parte ?? 'sem parte'}, em ${pos}, a ${n1(a.sMm)} mm do começo da cadeia`;
  if (a.tipo === 'lacuna') return `crista interrompida ${parte}: ${a.nota}; olhe a imagem, a régua só aponta o lugar`;
  if (a.tipo === 'virada') return `virada brusca da crista ${parte}: ${a.nota}; olhe a imagem, a régua só aponta o lugar`;
  return `salto do diedro da crista ${parte}: ${a.nota}${a.arestas > 1 ? ` (${a.arestas} arestas no trecho)` : ''}; olhe a imagem, a régua só aponta o lugar`;
}

/* ---------- a vista de perto da chapa ---------- */
const COR = { caminho: [220, 30, 30], achado: [255, 215, 0] };
function pintar(im, x, y, raio, cor) {
  for (let dy = -raio; dy <= raio; dy += 1) for (let dx = -raio; dx <= raio; dx += 1) {
    const xi = Math.round(x) + dx; const yi = Math.round(y) + dy;
    if (xi < 0 || yi < 0 || xi >= im.largura || yi >= im.altura) continue;
    const o = (yi * im.largura + xi) * 3; im.dados[o] = cor[0]; im.dados[o + 1] = cor[1]; im.dados[o + 2] = cor[2];
  }
}

/**
 * A vista de perto só da chapa (as faces da subdivisão, sem o resto da peça) em volta do achado: a caixa de `raioMm` de cada lado do ponto, o
 * caminho de cada cadeia em vermelho e o ponto do achado em amarelo. Sem `vista` a câmera olha de fora, ao longo da normal média das faces da caixa.
 * @returns {{ imagem, mmPorPx, recorteMm, direcao, faces }}
 */
export function imagemDoAchado(sup, cadeias, achado, { vista = 'auto', largura = 900, raioMm = 120 } = {}) {
  const centro = achado.posicaoMm;
  const recorte = { min: centro.map((x) => x - raioMm), max: centro.map((x) => x + raioMm) };
  const faces = sup.faces.filter((f) => f.every((v) => sup.vertices[v])).map((f) => ({ pts: f.map((v) => sup.vertices[v].map((x) => x * MM)), parte: '', cor: '#9aa3a6' }));
  const dentro = faces.filter((f) => f.pts.some((p) => [0, 1, 2].every((k) => p[k] >= recorte.min[k] && p[k] <= recorte.max[k])));
  if (!dentro.length) throw new ErroDoModelo('a chapa não tem faces em volta do achado');
  let direcao;
  if (vista === 'auto') {
    const soma = [0, 0, 0];
    for (const f of dentro) {
      const n = [0, 0, 0];
      for (let k = 0; k < f.pts.length; k += 1) { const a = f.pts[k]; const b = f.pts[(k + 1) % f.pts.length]; n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); }
      /* de fora: a normal que se afasta do centro da chapa */
      const c = f.pts[0]; const ac = sub(c, centroDaChapa(faces));
      const s = dot(n, ac) >= 0 ? 1 : -1; const u = unit(n);
      for (let k = 0; k < 3; k += 1) soma[k] += s * u[k];
    }
    direcao = unit(soma);
    if (norma(soma) < 1e-9) direcao = [0, 0, 1];
  } else direcao = null;
  const o = { largura, margem: 0, recorte, liso: 35 };
  const r = rasterSombreado(faces, direcao ? { ...o, direcao } : { ...o, vista });
  const base = r.base ?? camera(direcao ?? vista);
  const px = (p) => [(dot(p, base.direita) - r.caixa.u0) / r.mmPorPx, (r.caixa.v1 - dot(p, base.cima)) / r.mmPorPx];
  for (const { _caminho: c } of cadeias) {
    for (let i = 0; i + 1 < c.pontos.length; i += 1) {
      const a = px(c.pontos[i]); const b = px(c.pontos[i + 1]);
      const passos = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
      for (let k = 0; k <= passos; k += 1) pintar(r.imagem, a[0] + ((b[0] - a[0]) * k) / passos, a[1] + ((b[1] - a[1]) * k) / passos, 1, COR.caminho);
    }
  }
  const [cx, cy] = px(centro);
  for (let d = -9; d <= 9; d += 1) { pintar(r.imagem, cx + d, cy, 1, COR.achado); pintar(r.imagem, cx, cy + d, 1, COR.achado); }
  return { imagem: r.imagem, mmPorPx: r.mmPorPx, recorteMm: recorte, direcao: direcao ?? camera(vista).olhar.map((x) => -x), faces: dentro.length };
}
const centroDaChapa = (() => {
  let ultimo = null; let valor = null;
  return (faces) => {
    if (ultimo === faces) return valor;
    const s = [0, 0, 0]; let n = 0;
    for (const f of faces) for (const p of f.pts) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; n += 1; }
    ultimo = faces; valor = s.map((x) => x / (n || 1));
    return valor;
  };
})();

/* ---------- a linha de comando ---------- */
const NUMERICAS = { janela: 'janelaMm', 'salto-diedro': 'saltoDiedroGraus', virada: 'viradaMinimaGraus', lacuna: 'lacunaMaximaMm', 'angulo-minimo': 'anguloMinimoGraus' };

export function lerArgumentos(argv) {
  const alvo = argv.find((a) => !a.startsWith('--'));
  if (!alvo) throw new ErroDoModelo('falta a peça (nome ou caminho da receita)');
  const o = {}; const sai = { alvo, opcoes: o, completo: false, imagem: null, achado: 1, raio: 120, vista: 'auto', largura: 900, atePasso: null, ateSubdivisao: null, composicoes: null };
  for (const a of argv.filter((x) => x.startsWith('--'))) {
    if (a === '--completo') { sai.completo = true; continue; }
    const m = /^--([a-z-]+)=(.+)$/.exec(a);
    if (!m) throw new ErroDoModelo(`argumento desconhecido: ${a}`);
    const num = Number(m[2]);
    if (NUMERICAS[m[1]]) { if (!Number.isFinite(num)) throw new ErroDoModelo(`--${m[1]} espera um número`); o[NUMERICAS[m[1]]] = num; }
    else if (m[1] === 'imagem') sai.imagem = m[2];
    else if (m[1] === 'vista') sai.vista = m[2];
    else if (m[1] === 'composicoes') sai.composicoes = m[2];
    else if (['achado', 'largura', 'ate-passo', 'ate-subdivisao'].includes(m[1])) {
      if (!Number.isInteger(num) || num < (m[1] === 'achado' || m[1] === 'ate-subdivisao' ? 1 : 0)) throw new ErroDoModelo(`--${m[1]} espera um inteiro${m[1] === 'ate-passo' ? ' de 0 em diante' : ' de 1 em diante'}`);
      sai[{ achado: 'achado', largura: 'largura', 'ate-passo': 'atePasso', 'ate-subdivisao': 'ateSubdivisao' }[m[1]]] = num;
    } else if (m[1] === 'raio') { if (!(num > 0)) throw new ErroDoModelo('--raio espera mm maiores que zero'); sai.raio = num; }
    else throw new ErroDoModelo(`argumento desconhecido: ${a}`);
  }
  if (sai.atePasso !== null && sai.ateSubdivisao !== null) throw new ErroDoModelo('--ate-passo e --ate-subdivisao são o mesmo pedido de dois jeitos; passe um só');
  return sai;
}

const opDoPasso = (p) => (Array.isArray(p) ? p[0] : p?.op);

export async function executar(argv) {
  let a;
  try { a = lerArgumentos(argv); } catch (e) { if (e instanceof ErroDoModelo) return { codigo: 2, stdout: '', stderr: `regularidade-da-crista: ${e.message}\n` }; throw e; }
  try {
    let atePasso = a.atePasso;
    if (a.ateSubdivisao !== null) {
      const { acharReceita } = await import('./modelo-aberto.mjs');
      const achada = await acharReceita(a.alvo);
      if (!achada) throw new ErroDoModelo(`não achei a receita '${a.alvo}'`);
      const indices = (achada.receita.PASSOS ?? []).map((p, i) => [opDoPasso(p), i]).filter(([op]) => op === 'subdivisao').map(([, i]) => i);
      if (a.ateSubdivisao > indices.length) throw new ErroDoModelo(`a receita tem ${indices.length} passo(s) de subdivisão e veio --ate-subdivisao=${a.ateSubdivisao}`);
      atePasso = indices[a.ateSubdivisao - 1];
    }
    const t0 = performance.now();
    const m = await abrirModelo(a.alvo, { ateOPasso: atePasso, composicoes: a.composicoes });
    if (m.origem !== 'receita') throw new ErroDoModelo('a régua mede a superfície de subdivisão de uma receita de peça; o alvo é um esboço');
    const p = m.paineis[0];
    const t1 = performance.now();
    const resultados = regularidadeDaReceita(p.receita, a.opcoes, { entrada: p.entrada, neutro: p.neutro });
    const t2 = performance.now();
    const linhas = [];
    const abertura = resumoDaAbertura(m); if (abertura) linhas.push(abertura);
    linhas.push('regularidade da crista: a régua aponta onde olhar; quem diz se é defeito é a pessoa, pela imagem.');
    const todos = []; const rebaixados = [];
    for (const r of resultados) {
      if (r.pulado) { linhas.push(`passo ${r.passo} (subdivisao): não medido, ${r.pulado}`); continue; }
      linhas.push(`passo ${r.passo} (subdivisao): ${r.cadeias.length} cadeia(s) de crista, ${r.achados.length} ponto(s) de variação brusca acusado(s)${r.rebaixados.length ? `, ${r.rebaixados.length} rebaixado(s) a provável desenho` : ''}`);
      for (const c of r.cadeias) linhas.push(`  cadeia ${c.indice + 1} da parte ${c.parte ?? 'sem parte'}: ${n1(c.comprimentoMm)} mm, ${c.arestas} arestas, de [${c.pontasMm[0].join('; ')}] a [${c.pontasMm[1].join('; ')}] mm, diedro de ${n1(c.diedroGraus.min)} a ${n1(c.diedroGraus.max)} graus`);
      r.achados.forEach((x) => todos.push({ passo: r.passo, achado: x, r }));
      r.rebaixados.forEach((x) => rebaixados.push({ passo: r.passo, achado: x, r }));
    }
    const corte = a.completo ? Infinity : 20;
    todos.slice(0, corte).forEach((t, i) => linhas.push(`${i + 1}. ${textoDoAchado(t.achado)}`));
    if (todos.length > corte) linhas.push(`... e mais ${todos.length - corte} (--completo lista todos)`);
    if (!todos.length) linhas.push('nenhuma variação brusca acusada acima dos limiares.');
    if (rebaixados.length) {
      const porRegra = {}; for (const t of rebaixados) porRegra[t.achado.regra] = (porRegra[t.achado.regra] ?? 0) + 1;
      linhas.push(`provável desenho (${rebaixados.length}, rebaixados por regra geral, a pessoa confere se quiser): ${Object.entries(porRegra).map(([k, v]) => `${k} ${v}`).join(', ')}`);
      if (a.completo) rebaixados.forEach((t, i) => linhas.push(`${todos.length + i + 1}. ${textoDoAchado(t.achado)}`));
      else linhas.push('(--completo lista cada um, com o motivo; --achado=N numera os acusados e depois os rebaixados)');
    }
    linhas.push(`resumo: ${todos.length} acusado(s), ${rebaixados.length} provável(is) desenho`);
    todos.push(...rebaixados);
    if (a.imagem) {
      const escolhido = todos[a.achado - 1];
      if (!escolhido) throw new ErroDoModelo(`--achado=${a.achado}: a régua achou ${todos.length}`);
      const im = imagemDoAchado(escolhido.r._sup, escolhido.r.cadeias, escolhido.achado, { vista: a.vista, largura: a.largura, raioMm: a.raio });
      writeFileSync(a.imagem, paraPng(im.imagem));
      linhas.push(`imagem do achado ${a.achado}, só a chapa (${im.faces} faces), ${im.mmPorPx.toFixed(2)} mm por px, caixa de ${a.raio} mm em volta do ponto: ${a.imagem}`);
    }
    linhas.push(`tempo: ${((t1 - t0) / 1000).toFixed(1)} s para executar a receita${atePasso !== null ? ` até o passo ${atePasso}` : ''}, ${((t2 - t1) / 1000).toFixed(1)} s para a régua`);
    return { codigo: 0, stdout: `${linhas.join('\n')}\n`, stderr: '', resultados };
  } catch (e) {
    if (e instanceof ErroDoModelo || e?.name === 'ErroDeConfiguracao') return { codigo: 2, stdout: '', stderr: `regularidade-da-crista: ${e.message}\n` };
    throw e;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  executar(process.argv.slice(2)).then((r) => { process.stdout.write(r.stdout); process.stderr.write(r.stderr); process.exitCode = r.codigo; }, (erro) => { process.stderr.write(`${erro.stack ?? erro.message}\n`); process.exitCode = 1; });
}

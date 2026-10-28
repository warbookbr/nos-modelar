#!/usr/bin/env node
/* vincos-das-linhas.mjs — casa as linhas 3D lidas do pacote cego com as colunas e as estações nomeadas da gaiola de uma
 * receita de subdivisão (ou com as curvas da rede, se a gaiola sai de `gaiolaPorRede`), e devolve a declaração de vinco de cada
 * linha, em nomes, e onde falta coluna ou curva.
 *
 * POR QUE ELE EXISTE. `ler-linhas --3d` dá os vincos da referência como polilinhas em milímetro, mas a receita declara o
 * vinco por pontos nomeados da gaiola. Sem esta ferramenta o modelador escolhia a coluna do vinco a olho, e a linha que
 * caía entre duas colunas ficava sem vinco nenhum. Aqui cada linha sai com a coluna ou a estação que a acompanha, a
 * distância das duas, a declaração `{ nome, pontos, nitidez }` pronta para o passo e, quando nenhuma acompanha, entre que
 * colunas (ou estações) e a que fração pôr uma nova.
 *
 * COMO MEDE. A receita se lê como nas ferramentas oficiais (`entradaDaReceita`, com `TOPO`), e cada passo `subdivisao` tem a
 * gaiola resolvida por `gaiolaDoPasso` (com as medidas já ajustadas e a imagem espelhada da simetria). As cadeias são as
 * colunas e as estações: os nomes `estacao_coluna` da `gaiolaPorEstacoes` se separam pelas arestas da gaiola (o corte do
 * nome que divide a estação com um vizinho e a coluna com outro), e cada coluna e cada estação é o caminho dos pontos
 * dela pelas arestas; sem nomes nesse formato, as cadeias são os laços de arestas que atravessam os vértices regulares.
 * Cada cadeia é avaliada na superfície limite, e não na gaiola crua: a gaiola é refinada `NIVEL_DA_AMOSTRA` níveis com
 * todo vértice levado ao ponto limite, e a cadeia segue as arestas pelos níveis com a numeração da subdivisão, de modo que
 * cada aresta da gaiola vira oito pontos da curva limite dela.
 *
 * Cada linha é reamostrada a `passoMm`; na simetria em x, o trecho com x < 0 é espelhado, e o pedaço que repete o
 * espelho de outro já lido sai como `espelhoDe`. Cada amostra fica com a cadeia mais perto a até `limiarMm` cuja
 * direção difere da da linha em menos de `alinhamentoGraus` (a estação que cruza uma linha ao longo da coluna não a
 * acompanha), e os trechos de mesma cadeia mais curtos que `minimoMm` se juntam ao vizinho mais longo. O trecho
 * acompanhado dá o intervalo de pontos da cadeia (o ponto da gaiola mais perto de cada ponta da linha), a distância
 * média e máxima da linha à curva limite da cadeia, e a declaração de vinco; o trecho sobre uma borda da gaiola é
 * `borda`, sem vinco, e o que já é vinco declarado sai como `jaDeclarado`. O trecho sem cadeia é faltante: as duas
 * cadeias alinhadas mais perto, uma de cada lado da linha, dizem entre que colunas pôr a nova, a fração do caminho de uma
 * à outra e, em cada estação comum, o ponto da linha e a fração ali.
 *
 * A nitidez é 'viva' quando a linha não traz o ângulo da dobra. Com `angulo_graus` na linha, a nitidez é a menor da
 * escada 0,5, 0,6, 0,7, 0,8, 0,9 e 'viva' cuja dobra na malha da receita, no nível dela, chega a 90% do ângulo lido.
 * Por fim a receita é refeita com todos os vincos sugeridos: `comVincos` diz se o passo os aceita, a distância de cada
 * trecho ao vinco na superfície limite nova, a cobertura de cada linha a até `coberturaMm` e o diedro na malha ao longo
 * de cada vinco.
 *
 * A REDE DE CURVAS. Quando a receita monta a gaiola com `gaiolaPorRede` ao ser lida (o `capturarGaiolas` de `gaiola-captura.js` a capta),
 * as cadeias são as curvas da rede (`vincos-da-rede.mjs`), e a saída muda assim. O trecho acompanhado diz a curva e os nós entre os quais
 * ela o acompanha (`acompanha: { curva, de, ate }`). O vinco sai na curva, `{ nome, curva, vinco }` em `vincos` e em `vincosNaRede`, porque o
 * vinco da rede é da curva inteira, com a nitidez medida na rede refeita com o vinco na curva (o alisamento do miolo deixa de passar por
 * ela); o trecho que cobre só parte da curva sai com `parcial: true` e os nós, e pede a curva partida neles. O canto só se declara num nó,
 * e fora de um nó sai em `cantosSemChave` com a posição. O trecho que nenhuma curva acompanha sai em `faltantes` com a curva nova a declarar:
 * os pontos-chave, os nós nas curvas que ela encontra (`{ curva, fracao }`), os retalhos que ela atravessa e, para cada um, os dois retalhos
 * em que ele se parte, com a lista de lados na sintaxe de `borda`. `verificada` diz se a rede monta com a sugestão: `monta: false` traz o
 * erro da rede, em geral um sistema de divisões que pede `divisoes` nos retalhos em volta. A receita cuja rede é montada ao importar o
 * módulo, e não ao ser lida, não se refaz, e a ferramenta devolve a sugestão sem a verificação.
 *
 * Mesma receita e mesmas linhas, mesma saída: nenhuma conta depende de relógio, acaso ou ordem de mapa.
 *
 *   node tools/modelar/vincos-das-linhas.mjs <peça> --linhas=<linhas.json> [--limiar-mm=5] [--passo-mm=2]
 *       [--alinhamento-graus=30] [--minimo-mm=15] [--cobertura-mm=2] [--passo-da-curva-mm=60] [--fundir-mm=10]
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { entradaDaReceita } from '../../src/autoria/executar-receita.js';
import { criarResolverNumerico } from '../../procedural/nucleo/expressoes.js';
import { capturarGaiolas } from '../../procedural/nucleo/gaiola-captura.js';
import { gaiolaDoPasso } from '../../procedural/nucleo/operacoes/subdivisao.js';
import { subdividirCatmullClark } from '../../procedural/nucleo/subdivisao.js';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';
import { PADROES_DA_REDE, achaRede, cadeiasDaRede, idsDosNos, resolverDaRede, sugerirCurvaNova, verificarSugestao } from './vincos-da-rede.mjs';

export const PADROES = Object.freeze({ limiarMm: 5, passoMm: 2, alinhamentoGraus: 30, minimoMm: 15, coberturaMm: 2, ...PADROES_DA_REDE });
export const NIVEL_DA_AMOSTRA = 3;
export const ESCADA_DE_NITIDEZ = Object.freeze([0.5, 0.6, 0.7, 0.8, 0.9, 'viva']);
const FRACAO_DO_ANGULO = 0.9;
const FRACAO_DO_ESPELHO = 0.8;
/* o canto: a linha muda de direção ao menos ANGULO_DO_CANTO graus entre os dois lados do ponto da gaiola, medidos a
   JANELA_DO_CANTO_MM dele, onde o ruído de ±1 mm da leitura mexe a direção em menos de 3 graus */
const ANGULO_DO_CANTO = 10;
const JANELA_DO_CANTO_MM = 40;
const JANELA_DA_TANGENTE = 3;
const MM = 1000;
const TEXTO_DA_BORDA = 'borda livre da gaiola: a chapa termina ali, na borda da peça ou na de um vão, e não dobra; a ferramenta não sugere vinco';
const TEXTO_DA_BORDA_PARCIAL = 'parte do trecho segue a borda livre da gaiola, onde a chapa termina e não dobra; o vinco sugerido cobre só o resto';

const arred = (x, casas = 2) => { const f = 10 ** casas; const r = Math.round(x * f) / f; return Object.is(r, -0) ? 0 : r; };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => { const l = norma(a); return l > 0 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0]; };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lerp = (a, b, t) => [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])];
const emMm = (p) => p.map((x) => arred(x * MM, 1));
const citar = (n) => `'${n}'`;
const chave = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);

function newell(pts) {
  const n = [0, 0, 0];
  for (let k = 0; k < pts.length; k++) {
    const a = pts[k], b = pts[(k + 1) % pts.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return n;
}

/* ---- as linhas ---- */

/** lerLinhas3d(json) -> [{ indice, confianca, angulo, pontos (m) }] do JSON de `ler-linhas --3d` (linhas_3d.polilinhas_3d),
 *  de { polilinhas_3d } ou de uma lista de { pontos_mm }. */
export function lerLinhas3d(json) {
  const lista = Array.isArray(json) ? json : (json?.linhas_3d?.polilinhas_3d ?? json?.polilinhas_3d);
  if (!Array.isArray(lista)) throw new Error('vincos-das-linhas: as linhas vêm do JSON de ler-linhas --3d (linhas_3d.polilinhas_3d), de { polilinhas_3d } ou de uma lista de { pontos_mm }');
  return lista.map((l, k) => {
    const pts = l?.pontos_mm;
    if (!Array.isArray(pts) || pts.length < 2 || !pts.every((p) => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite))) {
      throw new Error(`vincos-das-linhas: a linha ${k} precisa de pontos_mm, dois ou mais [x, y, z] finitos`);
    }
    const angulo = l.angulo_graus ?? null;
    if (angulo !== null && !(Number.isFinite(angulo) && angulo > 0 && angulo < 180)) throw new Error(`vincos-das-linhas: a linha ${k} tem angulo_graus ${angulo}; o ângulo da dobra fica entre 0 e 180 graus`);
    return { indice: k, confianca: l.confianca ?? null, angulo, pontos: pts.map((p) => p.map((x) => x / MM)) };
  });
}

function somaDosTrechos(P) { let s = 0; for (let k = 1; k < P.length; k++) s += dist(P[k - 1], P[k]); return s; }
/* O comprimento de uma linha lida, sobre ela reamostrada a cada 10 mm: somado ponto a ponto, o ruído de ±1 mm numa linha
   a cada 1 mm conta quase o dobro do comprimento. */
function comprimento(P) { return somaDosTrechos(reamostrar(P, 0.01)); }

function reamostrar(P, passo) {
  const s = [0]; for (let k = 1; k < P.length; k++) s.push(s[k - 1] + dist(P[k - 1], P[k]));
  const total = s[s.length - 1];
  if (!(total > 0)) return [P[0]];
  const n = Math.max(1, Math.round(total / passo)); const out = []; let j = 0;
  for (let i = 0; i <= n; i++) {
    const alvo = (total * i) / n;
    while (j < P.length - 2 && s[j + 1] < alvo) j++;
    const l = s[j + 1] - s[j];
    out.push(lerp(P[j], P[j + 1], l > 0 ? Math.min(1, Math.max(0, (alvo - s[j]) / l)) : 0));
  }
  return out;
}

function tangentes(A) {
  return A.map((_, i) => unit(sub(A[Math.min(A.length - 1, i + JANELA_DA_TANGENTE)], A[Math.max(0, i - JANELA_DA_TANGENTE)])));
}

/* Na simetria em x: a linha se corta onde passa de um lado a outro do plano (fora da faixa de `folga` em volta dele, para
   que o ruído de uma linha sobre a costura não a pique), e o pedaço do lado x < 0 vai ao espelho. */
function pecasNaMetade(P, folga) {
  const lado = (p) => (p[0] < -folga ? -1 : p[0] > folga ? 1 : 0);
  /* onde cortar: entre o último ponto de um lado e o primeiro do outro, no trecho em que x troca de sinal */
  const cortes = []; let ultimo = null;
  for (let k = 0; k < P.length; k++) {
    const l = lado(P[k]); if (!l) continue;
    if (ultimo && l !== ultimo.lado) {
      let j = ultimo.k; while (j < k - 1 && P[j + 1][0] * ultimo.lado > 0) j++;
      const a = P[j], b = P[j + 1]; const t = a[0] === b[0] ? 0 : a[0] / (a[0] - b[0]);
      const ponto = lerp(a, b, Math.min(1, Math.max(0, t))); ponto[0] = 0;
      cortes.push({ j, ponto });
    }
    ultimo = { lado: l, k };
  }
  const pecas = []; let atual = [P[0]]; let ci = 0;
  for (let k = 1; k < P.length; k++) {
    while (ci < cortes.length && cortes[ci].j === k - 1) { atual.push(cortes[ci].ponto); pecas.push(atual); atual = [cortes[ci].ponto]; ci += 1; }
    atual.push(P[k]);
  }
  pecas.push(atual);
  return pecas.filter((p) => p.length >= 2).map((p) => {
    const mediaX = p.reduce((s, q) => s + q[0], 0) / p.length;
    return { espelhada: mediaX < 0, pontos: p.map((q) => [Math.abs(q[0]), q[1], q[2]]) };
  });
}

/* ---- as cadeias da gaiola ---- */

/* Os nomes `estacao_coluna`: em cada ponto, o corte do nome no '_' que mais divide a estação com um vizinho (pela aresta)
   e a coluna com outro. Devolve null se algum ponto não tem nome ou não tem corte que algum vizinho confirme. */
function separarNomes(nomes, viz) {
  if (!nomes.every((n) => typeof n === 'string')) return null;
  const cortes = nomes.map((n) => { const r = []; let i = n.indexOf('_'); while (i >= 0) { if (i > 0 && i < n.length - 1) r.push([n.slice(0, i), n.slice(i + 1)]); i = n.indexOf('_', i + 1); } return r; });
  const partes = [];
  for (let p = 0; p < nomes.length; p++) {
    let melhor = null;
    for (const [s, c] of cortes[p]) {
      let est = 0, col = 0;
      for (const q of viz[p]) for (const [s2, c2] of cortes[q]) { if (s2 === s && c2 !== c) est += 1; else if (c2 === c && s2 !== s) col += 1; }
      const nota = [(est > 0 ? 1 : 0) + (col > 0 ? 1 : 0), est + col];
      if (!melhor || nota[0] > melhor.nota[0] || (nota[0] === melhor.nota[0] && nota[1] > melhor.nota[1])) melhor = { estacao: s, coluna: c, nota };
    }
    if (!melhor || !melhor.nota[1]) return null;
    partes.push({ estacao: melhor.estacao, coluna: melhor.coluna });
  }
  return partes;
}

/* Os caminhos de um grafo dado pelos vizinhos de cada ponto, do ponto de menor índice com um vizinho só (ou, na volta
   fechada, do menor índice, repetido no fim). Componente com ponto de três ou mais vizinhos não é caminho e fica de fora. */
function caminhos(membros, vizinhosDe) {
  const visto = new Set(); const saida = [];
  for (const p0 of membros) {
    if (visto.has(p0)) continue;
    const comp = []; const fila = [p0]; visto.add(p0);
    while (fila.length) { const p = fila.shift(); comp.push(p); for (const q of vizinhosDe(p)) if (!visto.has(q)) { visto.add(q); fila.push(q); } }
    comp.sort((a, b) => a - b);
    if (comp.length < 2 || comp.some((p) => vizinhosDe(p).length > 2)) continue;
    const pontas = comp.filter((p) => vizinhosDe(p).length === 1);
    const fechada = pontas.length === 0;
    const inicio = fechada ? comp[0] : pontas[0];
    const ordem = [inicio]; const usados = new Set([inicio]);
    for (;;) { const prox = vizinhosDe(ordem[ordem.length - 1]).filter((q) => !usados.has(q)).sort((a, b) => a - b)[0]; if (prox === undefined) break; ordem.push(prox); usados.add(prox); }
    if (fechada) ordem.push(inicio);
    saida.push({ pontos: ordem, fechada });
  }
  return saida;
}

/* Os laços de arestas da metade declarada que atravessam os vértices regulares (quatro quads e nenhuma borda), para a
   gaiola sem nomes `estacao_coluna`. */
function lacosDeArestas(faces, n0, nV) {
  const facesDaAresta = new Map();
  faces.forEach((f, fi) => { for (let k = 0; k < f.length; k++) { const c = chave(f[k], f[(k + 1) % f.length]); if (!facesDaAresta.has(c)) facesDaAresta.set(c, []); facesDaAresta.get(c).push(fi); } });
  const facesDoV = Array.from({ length: nV }, () => []); faces.forEach((f, fi) => { for (const v of f) facesDoV[v].push(fi); });
  const viz = Array.from({ length: nV }, () => new Set());
  for (const c of facesDaAresta.keys()) { const [a, b] = c.split(',').map(Number); viz[a].add(b); viz[b].add(a); }
  const regular = (v) => facesDoV[v].length === 4 && facesDoV[v].every((fi) => faces[fi].length === 4) && [...viz[v]].every((w) => facesDaAresta.get(chave(v, w)).length === 2);
  const seguir = (u, v) => {
    if (!regular(v)) return null;
    const deUV = new Set(facesDaAresta.get(chave(u, v)));
    const opostos = [...viz[v]].filter((w) => w !== u && !facesDaAresta.get(chave(v, w)).some((fi) => deUV.has(fi)));
    return opostos.length === 1 ? opostos[0] : null;
  };
  const usadas = new Set(); const saida = [];
  for (const c of facesDaAresta.keys()) {
    const [a, b] = c.split(',').map(Number);
    if (a >= n0 || b >= n0 || usadas.has(c)) continue;
    const linha = [a, b]; usadas.add(c);
    let fechada = false;
    for (let lado = 0; lado < 2; lado++) {
      for (;;) {
        const u = linha[linha.length - 2], v = linha[linha.length - 1];
        const w = seguir(u, v);
        if (w === null || w >= n0 || usadas.has(chave(v, w))) { if (w !== null && w === linha[0] && lado === 0) { linha.push(w); usadas.add(chave(v, w)); fechada = true; } break; }
        linha.push(w); usadas.add(chave(v, w));
      }
      if (fechada) break;
      linha.reverse();
    }
    if (!fechada && linha[0] > linha[linha.length - 1]) linha.reverse();
    saida.push({ pontos: linha, fechada });
  }
  return saida;
}

/** classificarEstacoes(estacoes, vertices) -> { chaves, geradas }: das estações da gaiola, na ordem do eixo ({ nome, pontos }),
 *  quais a receita declara (as chaves) e quais a interpolação gerou. A estação gerada se chama `${dono}_${k}`, com o dono a
 *  última estação declarada antes dela e k a ordem a partir dali (`gaiola-interpolada.js`), e só existe entre duas
 *  declaradas, de modo que a que vem depois da última chave é uma declarada de nome parecido. Cada gerada traz a chave de
 *  antes, a de depois e a fração entre elas: a posição da estação no eixo, que é a coordenada em que todos os pontos dela
 *  concordam (a de maior variação entre as estações sobre a de dentro de cada uma) ou, sem eixo reto, a projeção do centro
 *  dela na reta dos centros das duas chaves. */
export function classificarEstacoes(estacoes, vertices) {
  const marcada = estacoes.map(() => false);
  let dono = null, k = 0;
  estacoes.forEach((e, i) => {
    if (dono !== null && e.nome === `${dono}_${k + 1}`) { k += 1; marcada[i] = true; } else { dono = e.nome; k = 0; }
  });
  for (let i = estacoes.length - 1; i >= 0 && marcada[i]; i--) marcada[i] = false;
  const media = estacoes.map((e) => [0, 1, 2].map((a) => e.pontos.reduce((s, p) => s + vertices[p][a], 0) / e.pontos.length));
  const global = [0, 1, 2].map((a) => media.reduce((s, m) => s + m[a], 0) / Math.max(1, media.length));
  const razao = [0, 1, 2].map((a) => {
    const entre = media.reduce((s, m) => s + (m[a] - global[a]) ** 2, 0) / Math.max(1, media.length);
    const dentro = estacoes.reduce((s, e, i) => s + e.pontos.reduce((t, p) => t + (vertices[p][a] - media[i][a]) ** 2, 0) / e.pontos.length, 0) / Math.max(1, estacoes.length);
    return entre / (dentro + 1e-18);
  });
  const eixo = razao.indexOf(Math.max(...razao));
  const eixoReto = razao[eixo] >= 4;
  const corda = media.length ? sub(media[media.length - 1], media[0]) : [0, 0, 0];
  const em = media.map((m) => (eixoReto ? m[eixo] : dot(sub(m, media[0]), corda) / Math.max(dot(corda, corda), 1e-18)));
  const chaves = estacoes.filter((_, i) => !marcada[i]).map((e) => e.nome);
  const geradas = new Map();
  estacoes.forEach((e, i) => {
    if (!marcada[i]) return;
    let a = i, b = i;
    while (marcada[a]) a--;
    while (marcada[b]) b++;
    geradas.set(e.nome, { antes: estacoes[a].nome, depois: estacoes[b].nome, fracao: (em[i] - em[a]) / (em[b] - em[a]) });
  });
  return { chaves, geradas };
}

/** cadeiasDaGaiola(declarados, faces, nV) -> as colunas e as estações nomeadas da metade declarada da gaiola, ou os laços
 *  de arestas quando os nomes não seguem `estacao_coluna`; `estacoes` traz as estações na ordem dos pontos, cada uma com os
 *  pontos dela. */
export function cadeiasDaGaiola(declarados, faces, nV) {
  const n0 = declarados.length;
  const nomeDe = (p) => (typeof declarados[p] === 'string' ? declarados[p] : `#${p}`);
  const viz = Array.from({ length: n0 }, () => new Set());
  for (const f of faces) for (let k = 0; k < f.length; k++) { const a = f[k], b = f[(k + 1) % f.length]; if (a < n0 && b < n0) { viz[a].add(b); viz[b].add(a); } }
  const vizL = viz.map((s) => [...s].sort((a, b) => a - b));
  const partes = separarNomes(declarados, vizL);
  const cadeias = [];
  if (partes) {
    for (const tipo of ['coluna', 'estacao']) {
      const outro = tipo === 'coluna' ? 'estacao' : 'coluna';
      const grupos = new Map();
      partes.forEach((pt, p) => { if (!grupos.has(pt[tipo])) grupos.set(pt[tipo], []); grupos.get(pt[tipo]).push(p); });
      for (const [nome, membros] of grupos) {
        const vizinhosDe = (p) => vizL[p].filter((q) => partes[q][tipo] === nome && partes[q][outro] !== partes[p][outro]);
        for (const c of caminhos(membros, vizinhosDe)) cadeias.push({ tipo, nome, ...c, rotulos: c.pontos.map((p) => partes[p][outro]) });
      }
    }
  } else {
    for (const c of lacosDeArestas(faces, n0, nV)) cadeias.push({ tipo: 'aresta', nome: `${nomeDe(c.pontos[0])}…${nomeDe(c.pontos[c.pontos.length - 1])}`, ...c, rotulos: c.pontos.map(nomeDe) });
  }
  const estacoes = [];
  if (partes) {
    const porNome = new Map();
    partes.forEach((pt, p) => { if (!porNome.has(pt.estacao)) { const e = { nome: pt.estacao, pontos: [] }; porNome.set(pt.estacao, e); estacoes.push(e); } porNome.get(pt.estacao).pontos.push(p); });
  }
  return { porNome: Boolean(partes), estacoes, cadeias: cadeias.map((c, indice) => ({ indice, ...c, nomes: c.pontos.map(nomeDe) })) };
}

/* As cadeias seguidas pelos níveis de Catmull-Clark, todas de uma vez, com a numeração de `subdividirCatmullClark` (pontos
   de vértice, de aresta na ordem em que as arestas aparecem varrendo as faces, de face), como `cadeiaRefinada` em
   `procedural/nucleo/friso.js` faz para uma cadeia só. */
export function refinarCadeias(faces, nVertices, niveis, cadeias) {
  let F = faces; let nV = nVertices; let cs = cadeias.map((c) => [...c]);
  for (let n = 0; n < niveis; n++) {
    const indice = new Map();
    for (const f of F) for (let k = 0; k < f.length; k++) { const c = chave(f[k], f[(k + 1) % f.length]); if (!indice.has(c)) indice.set(c, indice.size); }
    const nE = indice.size;
    const iE = (a, b) => { const e = indice.get(chave(a, b)); if (e === undefined) throw new Error(`vincos-das-linhas: os pontos ${a} e ${b} da cadeia não formam aresta`); return nV + e; };
    cs = cs.map((c) => { const nova = [c[0]]; for (let k = 0; k + 1 < c.length; k++) nova.push(iE(c[k], c[k + 1]), c[k + 1]); return nova; });
    const Fn = [];
    F.forEach((f, fi) => { for (let k = 0; k < f.length; k++) { const v = f[k], prox = f[(k + 1) % f.length], ant = f[(k - 1 + f.length) % f.length]; Fn.push([v, iE(v, prox), nV + nE + fi, iE(ant, v)]); } });
    nV = nV + nE + F.length; F = Fn;
  }
  return cs;
}

/* A curva limite de cada cadeia, com o comprimento acumulado e a caixa. */
function curvasNoLimite(gaiola, borda, refinadas) {
  const r = subdividirCatmullClark({ vertices: gaiola.vertices, faces: gaiola.faces, vincos: gaiola.vincos, cantos: gaiola.cantos, niveis: NIVEL_DA_AMOSTRA, borda, aoLimite: true });
  return refinadas.map((idx) => curva(idx.map((i) => r.vertices[i])));
}

function curva(P) {
  const acum = [0]; for (let k = 1; k < P.length; k++) acum.push(acum[k - 1] + dist(P[k - 1], P[k]));
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const p of P) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); }
  return { P, acum, lo, hi };
}

const distanciaACaixa = (q, C) => Math.hypot(...[0, 1, 2].map((i) => Math.max(C.lo[i] - q[i], 0, q[i] - C.hi[i])));

/* O ponto da curva mais perto de q: distância, parâmetro (índice do trecho mais a fração) e tangente do trecho. */
function maisPerto(q, C, alem = Infinity) {
  if (distanciaACaixa(q, C) > alem) return null;
  const { P } = C; let melhor = null;
  for (let k = 0; k + 1 < P.length; k++) {
    const a = P[k], ab = sub(P[k + 1], a); const l2 = dot(ab, ab);
    const u = l2 > 0 ? Math.min(1, Math.max(0, dot(sub(q, a), ab) / l2)) : 0;
    const c = [a[0] + u * ab[0], a[1] + u * ab[1], a[2] + u * ab[2]]; const d = dist(q, c);
    if (!melhor || d < melhor.d) melhor = { d, t: k + u, ponto: c, k };
  }
  if (!melhor) return null;
  melhor.tangente = unit(sub(P[melhor.k + 1], P[melhor.k]));
  return melhor;
}

const arco = (C, t) => { const k = Math.min(C.P.length - 2, Math.max(0, Math.floor(t))); return C.acum[k] + (t - k) * (C.acum[k + 1] - C.acum[k]); };

/* ---- a superfície do passo ---- */

function prepararPasso(entrada, i, args) {
  const dict = { ...entrada.PARAMS, ...entrada.TOPO };
  const { num } = criarResolverNumerico(dict);
  const vec = (a) => (typeof a === 'string' ? dict[a] : a).map(num);
  const resolver = (troca) => gaiolaDoPasso(troca ? { ...args, ...troca } : args, { vec, num });
  const r = resolver(null);
  if (r.erro) throw new Error(`vincos-das-linhas: o passo ${i} (subdivisao) não resolve a gaiola: ${r.erro[1]}`);
  /* as posições declaradas dos pontos, antes de a medida as ajustar: o que a receita escreveu, sem o deslocamento da superfície
     limite, que desloca os pontos de uma estação por igual e mexe a posição dela no eixo */
  const declaradas = r.declarados.map((n) => (typeof n === 'string' && Array.isArray(dict[n]) ? dict[n].map(num) : null));
  return { resolver, gaiola: r.gaiola, declarados: r.declarados, declaradas: declaradas.every(Boolean) ? declaradas : null, niveis: Math.trunc(num(args.niveis ?? 2)), borda: args.borda ?? 'suave', aoLimite: args.medidas != null };
}

/* O diedro em graus de cada aresta descendente de vinco da malha que o passo entrega, com a reta da aresta. */
function arestasDeVinco(gaiola, niveis, borda, aoLimite) {
  const r = subdividirCatmullClark({ ...gaiola, niveis, borda, aoLimite, comVincos: true });
  const alvo = new Set(r.vincos.map(([a, b]) => chave(a, b)));
  const faces = new Map();
  r.faces.forEach((f, fi) => { for (let k = 0; k < f.length; k++) { const c = chave(f[k], f[(k + 1) % f.length]); if (alvo.has(c)) { if (!faces.has(c)) faces.set(c, []); faces.get(c).push(fi); } } });
  const normal = (fi) => unit(newell(r.faces[fi].map((v) => r.vertices[v])));
  return r.vincos.map(([a, b]) => {
    const fs = faces.get(chave(a, b));
    const graus = fs.length === 2 ? Math.acos(Math.max(-1, Math.min(1, dot(normal(fs[0]), normal(fs[1]))))) * 180 / Math.PI : 0;
    return { a: r.vertices[a], b: r.vertices[b], graus };
  });
}

/* O diedro ao longo de amostras: em cada uma, o da aresta de vinco mais perto, se ela fica a até `alcance`. */
function diedroAoLongo(arestas, amostras, alcance) {
  const lidos = [];
  for (const q of amostras) {
    let melhor = null;
    for (const e of arestas) {
      const ab = sub(e.b, e.a); const l2 = dot(ab, ab); const u = l2 > 0 ? Math.min(1, Math.max(0, dot(sub(q, e.a), ab) / l2)) : 0;
      const d = dist(q, lerp(e.a, e.b, u)); if (!melhor || d < melhor.d) melhor = { d, graus: e.graus };
    }
    lidos.push(melhor && melhor.d <= alcance ? melhor.graus : 0);
  }
  const ordem = [...lidos].sort((x, y) => x - y);
  return { mediana: ordem.length ? ordem[Math.floor((ordem.length - 1) / 2)] : 0, minimo: ordem.length ? ordem[0] : 0, lidos };
}

/* ---- a leitura de um passo ---- */

function rodadas(rotulos, minimo) {
  let runs = [];
  for (let i = 0; i < rotulos.length; i++) { const c = rotulos[i]; if (runs.length && runs[runs.length - 1].c === c) runs[runs.length - 1].n += 1; else runs.push({ c, i, n: 1 }); }
  const juntar = () => { const r = []; for (const x of runs) { if (r.length && r[r.length - 1].c === x.c) r[r.length - 1].n += x.n; else r.push({ ...x }); } runs = r; };
  for (;;) {
    if (runs.length < 2) break;
    let k = -1; for (let j = 0; j < runs.length; j++) if (runs[j].n < minimo && (k < 0 || runs[j].n < runs[k].n)) k = j;
    if (k < 0) break;
    const antes = runs[k - 1], depois = runs[k + 1];
    runs[k].c = !depois || (antes && antes.n >= depois.n) ? antes.c : depois.c;
    juntar();
  }
  return runs;
}

/** vincosDoPasso(entrada, i, linhas, opcoes) -> a leitura das linhas contra o passo `subdivisao` i da receita executada. */
export function vincosDoPasso(entrada, i, linhas, opcoes = {}, contexto = {}) {
  const o = { ...PADROES, ...opcoes };
  const args = entrada.PASSOS[i][1];
  const sup = prepararPasso(entrada, i, args);
  const { gaiola, declarados } = sup;
  /* a gaiola que saiu de `gaiolaPorRede` se lê por curvas, e não por colunas e estações: `vincos-da-rede.mjs` */
  const rede = contexto.rede ?? achaRede(contexto.gaiolas ?? [], declarados);
  const REDE = rede !== null;
  const idDoNo = REDE ? idsDosNos(rede) : new Map();
  if (REDE) {
    const base = sup.resolver;
    const refeita = contexto.receita ? resolverDaRede({ receita: contexto.receita, i, rede }) : null;
    sup.resolver = (troca) => {
      const algo = troca && ((troca.vincos ?? []).length || (troca.cantos ?? []).some((c) => idDoNo.has(c)));
      if (!algo) return base(null);
      return refeita ? refeita(troca) : { erro: ['rede', 'a ferramenta não recebeu a receita, e não pode refazer a rede com o vinco'] };
    };
  }
  const limiar = o.limiarMm / MM, passo = o.passoMm / MM, minimo = Math.max(1, Math.round(o.minimoMm / o.passoMm));
  const cosAlinhado = Math.cos((o.alinhamentoGraus * Math.PI) / 180);
  const simetria = args.simetria === 'x';
  const R = 2 ** NIVEL_DA_AMOSTRA;

  /* as cadeias e a curva limite de cada uma */
  const { porNome, cadeias, estacoes } = REDE ? cadeiasDaRede(rede, declarados) : cadeiasDaGaiola(declarados, gaiola.faces, gaiola.vertices.length);
  const facesDaAresta = new Map();
  for (const f of gaiola.faces) for (let k = 0; k < f.length; k++) { const c = chave(f[k], f[(k + 1) % f.length]); facesDaAresta.set(c, (facesDaAresta.get(c) ?? 0) + 1); }
  const refinadas = refinarCadeias(gaiola.faces, gaiola.vertices.length, NIVEL_DA_AMOSTRA, cadeias.map((c) => c.pontos));
  const curvas = curvasNoLimite(gaiola, sup.borda, refinadas);
  /* a aresta da cadeia com uma face só é borda: a chapa termina ali, na borda da gaiola ou na de um vão, e não dobra */
  const ehBorda = (c, k) => facesDaAresta.get(chave(c.pontos[k], c.pontos[k + 1])) === 1;
  cadeias.forEach((c, k) => {
    c.curva = curvas[k];
    c.borda = c.pontos.slice(1).every((p, j) => facesDaAresta.get(chave(c.pontos[j], p)) === 1);
  });
  /* as estações que a interpolação gerou não se citam na receita: o nome muda com o passo. A cadeia de uma estação gerada
     não acompanha linha nenhuma (a linha ao longo dela é estação nova entre as duas chaves), e onde a linha acaba ou
     dobra numa estação gerada a saída diz entre que chaves e a que fração. */
  const est = REDE ? { chaves: [], geradas: new Map() } : classificarEstacoes(estacoes, sup.declaradas ?? gaiola.vertices);
  const ehGerada = (nome) => est.geradas.has(nome);
  const emChaves = (nome) => { const g = est.geradas.get(nome); return { chaves: [g.antes, g.depois], fracao: arred(g.fracao, 3) }; };
  /* o índice da chave mais perto de k ao longo da coluna, para trás (sentido -1) ou para a frente (+1); sem chave nesse
     sentido, no outro */
  const kChave = (c, k, sentido) => {
    /* na curva da rede, o ponto-chave do vinco é o nó: o mais perto de k no sentido pedido */
    if (c.tipo === 'curva') {
      for (const s of [sentido, -sentido]) { let j = k; while (j >= 0 && j < c.pontos.length && c.rotulos[j] === null) j += s; if (j >= 0 && j < c.pontos.length) return j; }
      return k;
    }
    if (c.tipo !== 'coluna' || !ehGerada(c.rotulos[k])) return k;
    for (const s of [sentido, -sentido]) { let j = k; while (j >= 0 && j < c.pontos.length && ehGerada(c.rotulos[j])) j += s; if (j >= 0 && j < c.pontos.length) return j; }
    return k;
  };
  const ativas = cadeias.filter((c) => !(c.tipo === 'estacao' && ehGerada(c.nome)));
  const temGerada = (c, k0, k1) => c.tipo === 'coluna' && c.rotulos.slice(k0, k1 + 1).some(ehGerada);
  /* os vincos já declarados no passo, por aresta da gaiola, com o nome */
  const indiceDoNome = new Map(declarados.map((d, k) => [d, k]));
  const declaradoEm = new Map();
  for (const v of args.vincos ?? []) {
    const idx = (v.pontos ?? []).map((n) => indiceDoNome.get(n));
    for (let k = 0; k + 1 < idx.length; k++) if (idx[k] !== undefined && idx[k + 1] !== undefined) declaradoEm.set(chave(idx[k], idx[k + 1]), v.nome);
  }

  /* o trecho da cadeia em nomes da receita: da estação-chave de antes do começo à de depois do fim, e, onde o começo ou o
     fim cai numa estação gerada, a fração entre as duas chaves em que ele cai */
  const descrever = (c, k0, k1) => {
    if (c.tipo === 'curva') return { curva: c.nome, de: c.rotulos[kChave(c, k0, -1)], ate: c.rotulos[kChave(c, k1, 1)] };
    if (c.tipo === 'coluna') {
      return {
        coluna: c.nome, de: c.rotulos[kChave(c, k0, -1)], ate: c.rotulos[kChave(c, k1, 1)],
        ...(ehGerada(c.rotulos[k0]) ? { deEntreChaves: emChaves(c.rotulos[k0]) } : {}),
        ...(ehGerada(c.rotulos[k1]) ? { ateEntreChaves: emChaves(c.rotulos[k1]) } : {}),
      };
    }
    return c.tipo === 'estacao' ? { estacao: c.nome, de: c.rotulos[k0], ate: c.rotulos[k1] } : { pontos: [c.nomes[k0], c.nomes[k1]] };
  };

  /* as peças das linhas, com o espelho na simetria */
  const pecas = [];
  for (const L of linhas) {
    const brutas = simetria ? pecasNaMetade(L.pontos, limiar) : [{ espelhada: false, pontos: L.pontos }];
    brutas.forEach((b, j) => {
      const amostras = reamostrar(b.pontos, passo);
      pecas.push({ linha: L.indice, peca: j, espelhada: b.espelhada, comprimento: comprimento(b.pontos), amostras, tangentes: tangentes(amostras), angulo: L.angulo });
    });
  }
  /* o pedaço que repete o espelho de um pedaço já lido do outro lado não se lê de novo */
  for (const [k, p] of pecas.entries()) {
    for (const q of pecas.slice(0, k)) {
      if (q.espelhoDe || q.espelhada === p.espelhada) continue;
      const C = curva(q.amostras);
      const perto = p.amostras.filter((a) => maisPerto(a, C, limiar)?.d <= limiar).length;
      if (perto >= FRACAO_DO_ESPELHO * p.amostras.length) { p.espelhoDe = { linha: q.linha, peca: q.peca }; break; }
    }
  }

  /* cada amostra com a cadeia alinhada mais perto a até o limiar */
  const alinhada = (t, c) => Math.abs(dot(t, c.tangente)) >= cosAlinhado;
  for (const p of pecas) {
    if (p.espelhoDe) continue;
    const rotulos = p.amostras.map((q, s) => {
      let melhor = -1, dm = Infinity;
      for (const c of ativas) { const m = maisPerto(q, c.curva, limiar); if (m && m.d <= limiar && m.d < dm && alinhada(p.tangentes[s], m)) { dm = m.d; melhor = c.indice; } }
      return melhor;
    });
    p.trechos = rodadas(rotulos, minimo).map(({ c, i: s0, n }) => ({ cadeia: c, s0, s1: s0 + n - 1 }));
  }

  /* trechos acompanhados: o intervalo de pontos da cadeia e a distância */
  const intervalos = new Map();
  for (const p of pecas) {
    if (p.espelhoDe) continue;
    for (const tr of p.trechos) {
      if (tr.cadeia < 0) continue;
      const c = cadeias[tr.cadeia]; const m = c.pontos.length - 1;
      const proj = p.amostras.slice(tr.s0, tr.s1 + 1).map((q) => maisPerto(q, c.curva));
      const ts = proj.map((x) => x.t); const tmin = Math.min(...ts), tmax = Math.max(...ts);
      let k0 = Math.round(tmin / R), k1 = Math.round(tmax / R);
      if (k0 === k1) { if ((k1 < m && tmax - k0 * R >= k0 * R - tmin) || k0 === 0) k1 = Math.min(m, k1 + 1); else k0 = Math.max(0, k0 - 1); }
      const ds = proj.map((x) => x.d);
      Object.assign(tr, {
        k0, k1,
        distancia: { media: ds.reduce((s, x) => s + x, 0) / ds.length, maxima: Math.max(...ds) },
        sobra: { antes: arco(c.curva, tmin) - arco(c.curva, k0 * R), depois: arco(c.curva, k1 * R) - arco(c.curva, tmax) },
      });
      if (!intervalos.has(c.indice)) intervalos.set(c.indice, []);
      /* o vinco de coluna vai de estação-chave a estação-chave: o intervalo sobe à chave de antes e à de depois */
      intervalos.get(c.indice).push({ k0: kChave(c, k0, -1), k1: kChave(c, k1, 1), angulo: p.angulo });
    }
  }

  /* os vincos sugeridos: os intervalos de cada cadeia juntos quando se tocam, sem as arestas já declaradas e sem as de
     borda, onde a chapa termina (a borda da gaiola e a de um vão) e não dobra */
  const nomesUsados = new Set((args.vincos ?? []).map((v) => v.nome));
  const vincos = [];
  const semVinco = (c, k) => declaradoEm.has(chave(c.pontos[k], c.pontos[k + 1])) || ehBorda(c, k);
  for (const c of ativas) {
    const lista = (intervalos.get(c.indice) ?? []).sort((a, b) => a.k0 - b.k0 || a.k1 - b.k1);
    const juntos = [];
    for (const x of lista) { const u = juntos[juntos.length - 1]; if (u && x.k0 <= u.k1) { u.k1 = Math.max(u.k1, x.k1); if (x.angulo !== null) u.angulo = Math.max(u.angulo ?? 0, x.angulo); } else juntos.push({ ...x }); }
    const partes = [];
    for (const x of juntos) {
      let k = x.k0;
      while (k < x.k1) {
        while (k < x.k1 && semVinco(c, k)) k++;
        let j = k; while (j < x.k1 && !semVinco(c, j)) j++;
        if (j > k) partes.push({ k0: k, k1: j, angulo: x.angulo });
        k = j;
      }
    }
    for (const x of partes) {
      let nome = `vinco_${c.tipo === 'aresta' ? c.nomes[0] : c.nome}${partes.length > 1 ? `_${c.rotulos[x.k0]}` : ''}`;
      if (nomesUsados.has(nome)) { let n = 2; while (nomesUsados.has(`${nome}_${n}`)) n++; nome = `${nome}_${n}`; }
      nomesUsados.add(nome);
      vincos.push({
        nome, cadeia: c.indice, k0: x.k0, k1: x.k1, angulo: x.angulo, nitidez: 'viva', nitidezPorque: 'sem ângulo lido na linha: a linha de feição do pacote já é dobra acima do limiar do pacote',
        ...(REDE ? { curva: c.nome, toda: c.toda && x.k0 === 0 && x.k1 === c.pontos.length - 1 } : {}),
      });
    }
  }
  const declaracao = (v, nitidez = v.nitidez) => (REDE ? { nome: v.nome, curva: v.curva, nitidez } : { nome: v.nome, pontos: cadeias[v.cadeia].nomes.slice(v.k0, v.k1 + 1), nitidez });
  /* a declaração do vinco em pontos, para o passo, só se cita quando todos os pontos são da receita: a coluna que passa por
     estação gerada tem pontos que a receita não nomeia, e ali vale a declaração por coluna e estação-chave */
  const declaracaoPublica = (v) => {
    const c = cadeias[v.cadeia];
    /* o vinco da rede é da curva inteira; a linha que acompanha só um trecho dela pede a curva partida nos nós */
    if (REDE) {
      if (v.toda) return { nome: v.nome, curva: v.curva, vinco: v.nitidez };
      const de = c.rotulos[v.k0]; const ate = c.rotulos[v.k1];
      return {
        nome: v.nome, curva: v.curva, vinco: v.nitidez, parcial: true, de, ate,
        texto: `a linha acompanha só o trecho de ${citar(de)} a ${citar(ate)} da curva ${citar(v.curva)}, e o vinco da rede é da curva inteira: parta a curva nesses nós em duas ou três e declare o vinco na que a linha acompanha`,
      };
    }
    if (!temGerada(c, v.k0, v.k1)) return declaracao(v);
    return { nome: v.nome, nitidez: v.nitidez, semPontosNoPasso: 'a coluna passa por estações que a interpolação gerou, e os pontos delas não são da receita; declare o vinco por coluna e estação-chave (vincosNaGaiola)' };
  };
  const pontosDoVinco = (v) => cadeias[v.cadeia].pontos.slice(v.k0, v.k1 + 1);
  const trechosDoVinco = (v) => pecas.flatMap((p) => (p.espelhoDe ? [] : p.trechos.filter((tr) => tr.cadeia === v.cadeia && tr.k1 > v.k0 && tr.k0 < v.k1).map((tr) => ({ p, s0: tr.s0, s1: tr.s1 }))));
  const amostrasDoVinco = (v) => trechosDoVinco(v).flatMap(({ p, s0, s1 }) => p.amostras.slice(s0, s1 + 1));
  const comTodos = (troca = null) => [...(REDE ? [] : (args.vincos ?? [])), ...vincos.filter((v) => !REDE || v.toda).map((v) => declaracao(v, troca && troca.nome === v.nome ? troca.nitidez : v.nitidez))];
  const alcance = Math.max(limiar, 0.5 * passo);

  /* a nitidez pelo ângulo lido: a menor da escada cuja dobra na malha chega a 90% dele */
  for (const v of vincos) {
    if (v.angulo === null) continue;
    if (REDE && !v.toda) { v.nitidezPorque = `ângulo lido de ${arred(v.angulo, 1)} graus, mas o vinco acompanha só um trecho da curva: a nitidez se mede com a curva partida nos nós, e fica 'viva' até lá`; continue; }
    const amostras = amostrasDoVinco(v); let escolhida = null;
    const medidos = [];
    for (const s of ESCADA_DE_NITIDEZ) {
      const r = sup.resolver({ vincos: comTodos({ nome: v.nome, nitidez: s }) });
      if (r.erro) { medidos.push({ nitidez: s, erro: r.erro[1] }); continue; }
      const d = diedroAoLongo(arestasDeVinco(r.gaiola, sup.niveis, sup.borda, sup.aoLimite), amostras, alcance);
      medidos.push({ nitidez: s, diedroGraus: arred(d.mediana, 1) });
      if (d.mediana >= FRACAO_DO_ANGULO * v.angulo) { escolhida = s; break; }
    }
    v.nitidez = escolhida ?? 'viva';
    v.escada = medidos;
    v.nitidezPorque = escolhida !== null
      ? `ângulo lido de ${arred(v.angulo, 1)} graus: a menor nitidez da escada com a dobra na malha, no nível ${sup.niveis}, a ${Math.round(FRACAO_DO_ANGULO * 100)}% dele`
      : `ângulo lido de ${arred(v.angulo, 1)} graus, e nem a 'viva' dobra a malha a ${Math.round(FRACAO_DO_ANGULO * 100)}% dele: a gaiola mal dobra ali, aproxime da linha as colunas dos dois lados`;
  }

  /* faltantes: entre que cadeias e a que fração */
  const nomesDasNovas = new Map();
  const sugerirNaRede = (p, tr) => {
    const k = nomesDasNovas.get(p.linha) ?? 0; nomesDasNovas.set(p.linha, k + 1);
    const r = sugerirCurvaNova({ rede, declarados, posicoes: gaiola.vertices, amostras: p.amostras.slice(tr.s0, tr.s1 + 1), nome: `linha${p.linha}${k ? `_${k + 1}` : ''}`, rodadas, minimo, limiarMm: o.limiarMm, opcoes: o });
    if (!r.sugestao) return r;
    /* a sugestão se declara na rede lida de novo; a rede que não fecha as divisões com ela pede `divisoes` nos retalhos em volta */
    const verificada = verificarSugestao({ receita: contexto.receita, sugestao: r.sugestao });
    return {
      ...r, sugestao: { ...r.sugestao, verificada },
      ...(verificada.monta === false ? { texto: `${r.texto}; a rede não monta com ela (${verificada.erro})` } : {}),
    };
  };
  const sugerir = (p, tr) => {
    if (REDE) return sugerirNaRede(p, tr);
    const amostras = p.amostras.slice(tr.s0, tr.s1 + 1); const tangs = p.tangentes.slice(tr.s0, tr.s1 + 1);
    const lados = amostras.map((q, s) => {
      const alinhadas = ativas.map((c) => ({ c, m: maisPerto(q, c.curva) })).filter(({ m }) => m && alinhada(tangs[s], m));
      if (!alinhadas.length) return null;
      const A = alinhadas.reduce((x, y) => (y.m.d < x.m.d ? y : x));
      const perp = (m) => { const v = sub(m.ponto, q); return sub(v, tangs[s].map((x) => x * dot(v, tangs[s]))); };
      const dirA = unit(perp(A.m));
      const outros = alinhadas.filter(({ c, m }) => c.tipo === A.c.tipo && dot(perp(m), dirA) < 0);
      const B = outros.length ? outros.reduce((x, y) => (y.m.d < x.m.d ? y : x)) : null;
      return { A, B };
    });
    const validos = lados.filter(Boolean);
    const distancias = validos.map((x) => x.A.m.d);
    const base = { distanciaMm: distancias.length ? { media: arred((distancias.reduce((s, x) => s + x, 0) / distancias.length) * MM), maxima: arred(Math.max(...distancias) * MM) } : null };
    if (!validos.length) return { ...base, sugestao: null, texto: 'nenhuma coluna nem estação corre na direção da linha perto dela' };
    /* o par de cadeias mais frequente, em ordem na gaiola */
    const ordemNaGaiola = (a, b) => {
      if (a.tipo === 'coluna' && b.tipo === 'coluna') { const s = a.rotulos.find((r) => b.rotulos.includes(r)); if (s !== undefined) return a.pontos[a.rotulos.indexOf(s)] - b.pontos[b.rotulos.indexOf(s)]; }
      return a.pontos[0] - b.pontos[0] || a.indice - b.indice;
    };
    const contagem = new Map();
    for (const x of validos) { const par = x.B ? [x.A.c, x.B.c].sort(ordemNaGaiola) : [x.A.c]; const k = par.map((c) => c.indice).join(','); if (!contagem.has(k)) contagem.set(k, { par, n: 0 }); contagem.get(k).n += 1; }
    const { par } = [...contagem.values()].reduce((x, y) => (y.n > x.n ? y : x));
    const [C1, C2] = par; const tipo = C1.tipo;
    const fracoes = [];
    validos.forEach((x) => {
      if (!C2) return;
      const ids = [x.A.c.indice, x.B?.c.indice];
      if (!ids.includes(C1.indice) || !ids.includes(C2.indice)) return;
      const d1 = x.A.c === C1 ? x.A.m.d : x.B.m.d, d2 = x.A.c === C1 ? x.B.m.d : x.A.m.d;
      fracoes.push(d1 / (d1 + d2));
    });
    /* o vão ao longo da cadeia de referência: de que ponto a que ponto da cadeia a linha corre */
    const ts = amostras.map((q) => maisPerto(q, C1.curva).t); const m = C1.pontos.length - 1;
    const ka = kChave(C1, Math.max(0, Math.floor(Math.min(...ts) / R)), -1), kb = kChave(C1, Math.min(m, Math.ceil(Math.max(...ts) / R)), 1);
    const rotuloDoOutro = tipo === 'coluna' ? 'estacoes' : tipo === 'estacao' ? 'colunas' : 'pontos';
    if (!C2) {
      return { ...base, sugestao: { tipo, alem: C1.nome, [rotuloDoOutro]: [C1.rotulos[ka], C1.rotulos[kb]] }, texto: `a linha passa além de ${citar(C1.nome)}, onde a gaiola acaba, a ${base.distanciaMm.media} mm dela em média: estenda a gaiola até a linha` };
    }
    const media = fracoes.reduce((s, x) => s + x, 0) / fracoes.length;
    /* em cada ponto comum das duas cadeias no vão (a estação, para colunas), onde a linha atravessa o plano da cadeia
       transversal (a estação que passa pelos dois pontos, pelo ponto dela no meio do caminho entre eles) */
    const porPonto = [];
    for (let k = ka; k <= kb; k++) {
      const r = C1.rotulos[k]; if (tipo === 'aresta') break;
      if (tipo === 'coluna' && ehGerada(r)) continue; // a estação gerada não se cita: a coluna nova só se mede nas chaves
      const j = C2.rotulos.indexOf(r); if (j < 0) continue;
      const a = C1.curva.P[k * R], b = C2.curva.P[j * R]; const ab = sub(b, a); const l2 = dot(ab, ab);
      const S = ativas.find((x) => x.tipo !== tipo && x.nome === r && x.pontos.includes(C1.pontos[k]) && x.pontos.includes(C2.pontos[j]));
      if (!S) continue;
      const ia = S.pontos.indexOf(C1.pontos[k]), ib = S.pontos.indexOf(C2.pontos[j]);
      const meio = S.curva.P[Math.round(((ia + ib) / 2) * R)];
      const n = unit([ab[1] * (meio[2] - a[2]) - ab[2] * (meio[1] - a[1]), ab[2] * (meio[0] - a[0]) - ab[0] * (meio[2] - a[2]), ab[0] * (meio[1] - a[1]) - ab[1] * (meio[0] - a[0])]);
      if (!(norma(n) > 0)) continue;
      /* o cruzamento da linha com o plano, interpolado entre as duas amostras dos dois lados, mais perto do segmento; na
         ponta da linha, que o ruído pode deixar aquém do plano, a amostra a até o limiar dele */
      let melhor = null;
      const candidato = (q) => {
        const u = l2 > 0 ? dot(sub(q, a), ab) / l2 : 0; const d = dist(q, lerp(a, b, Math.min(1, Math.max(0, u))));
        if (!melhor || d < melhor.d) melhor = { d, u, q };
      };
      for (let s = 0; s + 1 < amostras.length; s++) {
        const d0 = dot(sub(amostras[s], a), n), d1 = dot(sub(amostras[s + 1], a), n);
        if ((d0 > 0) === (d1 > 0) && d0 !== 0) continue;
        candidato(lerp(amostras[s], amostras[s + 1], d0 === d1 ? 0 : d0 / (d0 - d1)));
      }
      if (!melhor) for (const q of [amostras[0], amostras[amostras.length - 1]]) if (Math.abs(dot(sub(q, a), n)) <= limiar) candidato(q);
      if (!melhor || melhor.u <= 0 || melhor.u >= 1 || melhor.d > 0.5 * Math.sqrt(l2)) continue;
      porPonto.push({ [tipo === 'coluna' ? 'estacao' : 'coluna']: r, fracao: arred(melhor.u, 3), emMm: emMm(melhor.q), distanciaMm: arred(melhor.d * MM) });
    }
    const nomeTipo = tipo === 'coluna' ? 'coluna' : tipo === 'estacao' ? 'estação' : 'cadeia';
    const doVao = tipo === 'coluna' ? `das estações ${citar(C1.rotulos[ka])} a ${citar(C1.rotulos[kb])}` : tipo === 'estacao' ? `das colunas ${citar(C1.rotulos[ka])} a ${citar(C1.rotulos[kb])}` : `de ${citar(C1.rotulos[ka])} a ${citar(C1.rotulos[kb])}`;
    return {
      ...base,
      sugestao: {
        tipo, entre: [C1.nome, C2.nome], fracao: arred(media, 3), fracaoMinima: arred(Math.min(...fracoes), 3), fracaoMaxima: arred(Math.max(...fracoes), 3),
        [rotuloDoOutro]: [C1.rotulos[ka], C1.rotulos[kb]], [tipo === 'coluna' ? 'porEstacao' : tipo === 'estacao' ? 'porColuna' : 'porPonto']: porPonto,
      },
      texto: `${nomeTipo} nova entre ${citar(C1.nome)} e ${citar(C2.nome)}, a ${String(arred(media, 2)).replace('.', ',')} do caminho de ${citar(C1.nome)} a ${citar(C2.nome)}, ${doVao}`,
    };
  };

  /* os trechos de aresta de borda dentro de [k0, k1] da cadeia, como pares de índices */
  const corridasDeBorda = (c, k0, k1) => {
    const r = []; let k = k0;
    while (k < k1) {
      while (k < k1 && !ehBorda(c, k)) k++;
      let j = k; while (j < k1 && ehBorda(c, j)) j++;
      if (j > k) r.push([k, j]);
      k = j;
    }
    return r;
  };

  /* a receita com todos os vincos sugeridos (e os cantos, na segunda volta) */
  const jaVincados = [];
  for (const c of cadeias) {
    let k = 0;
    while (k < c.pontos.length - 1) {
      while (k < c.pontos.length - 1 && !semVinco(c, k)) k++;
      let j = k; while (j < c.pontos.length - 1 && semVinco(c, j)) j++;
      if (j > k) jaVincados.push(c.pontos.slice(k, j + 1));
      k = j;
    }
  }
  const cobertura = o.coberturaMm / MM;
  const avaliar = (cantosNovos) => {
    const r = sup.resolver({ vincos: comTodos(), ...(cantosNovos.length ? { cantos: [...(args.cantos ?? []), ...cantosNovos] } : {}) });
    if (r.erro) return { erro: r.erro[1] };
    /* as curvas limite dos vincos sugeridos e, para a cobertura, das bordas e dos trechos de vinco já declarados */
    const todas = curvasNoLimite(r.gaiola, sup.borda, refinarCadeias(r.gaiola.faces, r.gaiola.vertices.length, NIVEL_DA_AMOSTRA, [...vincos.map(pontosDoVinco), ...jaVincados]));
    const arestas = arestasDeVinco(r.gaiola, sup.niveis, sup.borda, sup.aoLimite);
    const porVinco = vincos.map((v, k) => {
      const trechos = trechosDoVinco(v).map((t) => ({ ...t, ds: t.p.amostras.slice(t.s0, t.s1 + 1).map((q) => maisPerto(q, todas[k]).d) }));
      const ds = trechos.flatMap((t) => t.ds);
      const d = diedroAoLongo(arestas, amostrasDoVinco(v), alcance);
      return { curva: todas[k], trechos, resumo: { distanciaMm: { media: arred((ds.reduce((s, x) => s + x, 0) / Math.max(1, ds.length)) * MM), maxima: arred(Math.max(0, ...ds) * MM) }, diedroGraus: { mediana: arred(d.mediana, 1), minimo: arred(d.minimo, 1) } } };
    });
    const coberturas = new Map();
    for (const p of pecas) {
      if (p.espelhoDe) continue;
      const ds = p.amostras.map((q) => Math.min(...todas.map((C) => maisPerto(q, C, cobertura)?.d ?? Infinity)));
      coberturas.set(p, ds.filter((x) => x <= cobertura).length / ds.length);
    }
    return { porVinco, coberturas };
  };
  /* Canto: o vinco segue a curva limite da cadeia, que é lisa nos pontos do meio dela; onde a linha dobra num ponto da
     gaiola (a dobra muda de direção) e passa longe da curva, só o canto declarado ali deixa a curva fazer a quina. */
  const cantosDe = (v, aval) => {
    const c = cadeias[v.cadeia]; const janela = Math.max(1, Math.round(JANELA_DO_CANTO_MM / o.passoMm));
    const achados = new Map();
    for (const t of aval.trechos) {
      t.ds.forEach((d, s) => {
        if (d <= cobertura) return;
        const q = t.p.amostras[t.s0 + s];
        let j = -1, dj = Infinity;
        for (let k = v.k0 + 1; k < v.k1; k++) { const e = dist(q, aval.curva.P[(k - v.k0) * R]); if (e < dj) { dj = e; j = k; } }
        if (j < 0) return;
        if (!achados.has(j) || achados.get(j).d < d) achados.set(j, { d, t });
      });
    }
    const saida = [];
    for (const [j, { d, t }] of [...achados].sort((a, b) => a[0] - b[0])) {
      if ((args.cantos ?? []).includes(c.nomes[j])) continue;
      const alvo = aval.curva.P[(j - v.k0) * R]; const A = t.p.amostras;
      let sj = 0; for (let s = 1; s < A.length; s++) if (dist(A[s], alvo) < dist(A[sj], alvo)) sj = s;
      if (sj - janela < 0 || sj + janela >= A.length) continue;
      const a = unit(sub(A[sj], A[sj - janela])), b = unit(sub(A[sj + janela], A[sj]));
      const graus = (Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) * 180) / Math.PI;
      if (graus >= ANGULO_DO_CANTO) saida.push({ ponto: c.nomes[j], k: j, anguloGraus: arred(graus, 1), distanciaMm: arred(d * MM), perto: emMm(alvo), gerada: (c.tipo === 'coluna' && ehGerada(c.rotulos[j])) || (c.tipo === 'curva' && c.rotulos[j] === null) });
    }
    return saida;
  };
  let comVincos;
  let aval = avaliar([]);
  if (aval.erro) comVincos = { aceitos: false, erro: aval.erro };
  else {
    /* o canto numa estação gerada não se declara: a saída diz entre que chaves e a que fração, para pôr ali uma estação-chave */
    vincos.forEach((v, k) => {
      const todos = cantosDe(v, aval.porVinco[k]);
      v.cantos = todos.filter((x) => !x.gerada).map(({ gerada, perto, ...x }) => x);
      /* o canto fora de um nó não se declara: a saída diz onde ele fica, para pôr ali um nó entre as curvas */
      v.cantosSemChave = todos.filter((x) => x.gerada).map((x) => (REDE
        ? { curva: cadeias[v.cadeia].nome, perto: x.perto, anguloGraus: x.anguloGraus, distanciaMm: x.distanciaMm }
        : { coluna: cadeias[v.cadeia].nome, ...emChaves(cadeias[v.cadeia].rotulos[x.k]), anguloGraus: x.anguloGraus, distanciaMm: x.distanciaMm }));
    });
    const cantosNovos = [...new Set(vincos.flatMap((v) => v.cantos.map((x) => x.ponto)))];
    if (cantosNovos.length) {
      const semCantos = aval;
      aval = avaliar(cantosNovos);
      if (aval.erro) comVincos = { aceitos: false, erro: aval.erro, cantos: cantosNovos };
      else vincos.forEach((v, k) => { v.semCantos = semCantos.porVinco[k].resumo.distanciaMm; });
    }
    if (!comVincos) {
      comVincos = { aceitos: true, ...(cantosNovos.length ? { cantos: cantosNovos } : {}) };
      vincos.forEach((v, k) => {
        v.comVinco = { ...aval.porVinco[k].resumo, ...(v.semCantos ? { semCantosDistanciaMm: v.semCantos } : {}) };
        /* o vinco do trecho de uma curva só vale com a curva partida nos nós, e a rede lida com ele não dobra: a dobra não se mede */
        if (REDE && !v.toda) v.comVinco = { distanciaMm: v.comVinco.distanciaMm, diedroGraus: null, diedroNaoMedido: 'o vinco da rede é da curva inteira; com a curva partida nos nós a dobra do trecho se mede' };
      });
      for (const [p, x] of aval.coberturas) p.cobertura = x;
    }
  }

  /* a saída, por linha e pedaço */
  const nomeDoVinco = new Map(vincos.map((v) => [v.nome, v]));
  const saidaDasLinhas = linhas.map((L) => ({
    linha: L.indice, confianca: L.confianca, ...(L.angulo !== null ? { anguloGraus: L.angulo } : {}), comprimentoMm: arred(comprimento(L.pontos) * MM, 1),
    pecas: pecas.filter((p) => p.linha === L.indice).map((p) => {
      const base = { peca: p.peca, espelhada: p.espelhada, comprimentoMm: arred(p.comprimento * MM, 1) };
      if (p.espelhoDe) return { ...base, espelhoDe: p.espelhoDe };
      return {
        ...base,
        ...(p.cobertura !== undefined ? { coberturaComVincos: arred(p.cobertura, 3) } : {}),
        trechos: p.trechos.map((tr) => {
          const comp = { comprimentoMm: arred(comprimento(p.amostras.slice(tr.s0, tr.s1 + 1)) * MM, 1), deMm: emMm(p.amostras[tr.s0]), ateMm: emMm(p.amostras[tr.s1]) };
          if (tr.cadeia < 0) return { faltante: true, ...comp, ...sugerir(p, tr) };
          const c = cadeias[tr.cadeia];
          const corridas = corridasDeBorda(c, tr.k0, tr.k1);
          const toda = corridas.length === 1 && corridas[0][0] === tr.k0 && corridas[0][1] === tr.k1;
          const out = {
            ...comp, tipo: toda ? 'borda' : c.tipo, acompanha: descrever(c, tr.k0, tr.k1),
            distanciaMm: { media: arred(tr.distancia.media * MM), maxima: arred(tr.distancia.maxima * MM) },
            sobraMm: { antes: arred(tr.sobra.antes * MM, 1), depois: arred(tr.sobra.depois * MM, 1) },
          };
          if (toda) return { ...out, texto: TEXTO_DA_BORDA };
          if (corridas.length) out.emBorda = corridas.map(([a, b]) => descrever(c, a, b));
          const ja = [...new Set(c.pontos.slice(tr.k0 + 1, tr.k1 + 1).map((q, j) => declaradoEm.get(chave(c.pontos[tr.k0 + j], q))).filter(Boolean))];
          const meus = vincos.filter((v) => v.cadeia === c.indice && v.k1 > tr.k0 && v.k0 < tr.k1).map((v) => nomeDoVinco.get(v.nome));
          if (ja.length) out.jaDeclarado = ja;
          if (meus.length) out.vincos = meus.map((v) => declaracaoPublica(v));
          return out;
        }),
      };
    }),
  }));

  const naRede = (v) => (v.toda ? { nome: v.nome, curva: v.curva, vinco: v.nitidez } : { nome: v.nome, curva: v.curva, vinco: v.nitidez, parcial: true, de: cadeias[v.cadeia].rotulos[v.k0], ate: cadeias[v.cadeia].rotulos[v.k1] });
  const noDoCanto = (nome) => idDoNo.get(nome) ?? nome;
  const naGaiola = (v) => {
    const c = cadeias[v.cadeia];
    if (c.tipo === 'coluna') return { nome: v.nome, coluna: c.nome, de: c.rotulos[v.k0], ate: c.rotulos[v.k1], nitidez: v.nitidez };
    if (c.tipo === 'estacao') return { nome: v.nome, estacao: c.nome, de: c.rotulos[v.k0], ate: c.rotulos[v.k1], nitidez: v.nitidez };
    return null;
  };
  const bordas = saidaDasLinhas.flatMap((L) => L.pecas.flatMap((p) => (p.trechos ?? []).filter((t) => t.tipo === 'borda' || t.emBorda).map((t) => ({
    linha: L.linha, peca: p.peca, comprimentoMm: t.comprimentoMm, acompanha: t.acompanha,
    ...(t.tipo === 'borda' ? {} : { parcial: true, emBorda: t.emBorda }), texto: t.tipo === 'borda' ? TEXTO_DA_BORDA : TEXTO_DA_BORDA_PARCIAL,
  }))));
  const cantosSemChave = vincos.flatMap((v) => v.cantosSemChave ?? []).filter((x, k, todos) => todos.findIndex((y) => (REDE ? y.curva === x.curva && y.perto.join() === x.perto.join() : y.coluna === x.coluna && y.chaves.join() === x.chaves.join() && y.fracao === x.fracao)) === k);
  const faltantes = saidaDasLinhas.flatMap((L) => L.pecas.flatMap((p) => (p.trechos ?? []).filter((t) => t.faltante).map((t) => ({ linha: L.linha, peca: p.peca, comprimentoMm: t.comprimentoMm, texto: t.texto, sugestao: t.sugestao }))));
  return {
    passo: i, origemId: args.origemId ?? null, simetria: simetria ? 'x' : null,
    cadeias: {
      porNome, colunas: cadeias.filter((c) => c.tipo === 'coluna').length, estacoes: ativas.filter((c) => c.tipo === 'estacao').length, arestas: cadeias.filter((c) => c.tipo === 'aresta').length,
      ...(REDE ? { rede: true, curvas: cadeias.length } : {}),
      ...(est.geradas.size ? { estacoesGeradas: est.geradas.size } : {}),
    },
    linhas: saidaDasLinhas,
    vincos: vincos.map((v) => ({
      ...declaracaoPublica(v), acompanha: descrever(cadeias[v.cadeia], v.k0, v.k1), nitidezPorque: v.nitidezPorque,
      ...(v.escada ? { escada: v.escada } : {}), ...(v.cantos?.length ? { cantos: v.cantos.map(({ k, ...x }) => x) } : {}),
      ...(v.cantosSemChave?.length ? { cantosSemChave: v.cantosSemChave } : {}), ...(v.comVinco ? { comVinco: v.comVinco } : {}),
    })),
    vincosNaGaiola: porNome && !REDE ? vincos.map(naGaiola) : null,
    ...(REDE ? { vincosNaRede: vincos.map(naRede) } : {}),
    cantos: [...new Set(vincos.flatMap((v) => (v.cantos ?? []).map((x) => noDoCanto(x.ponto))))],
    ...(REDE ? { cantosNaRede: [...new Set(vincos.flatMap((v) => (v.cantos ?? []).map((x) => noDoCanto(x.ponto))))] } : {}),
    cantosNaGaiola: porNome && !REDE ? vincos.flatMap((v) => (v.cantos ?? []).map((x) => {
      const c = cadeias[v.cadeia];
      return c.tipo === 'coluna' ? { estacao: c.rotulos[x.k], coluna: c.nome } : { estacao: c.nome, coluna: c.rotulos[x.k] };
    })).filter((x, k, todos) => todos.findIndex((y) => y.estacao === x.estacao && y.coluna === x.coluna) === k) : null,
    ...(cantosSemChave.length ? { cantosSemChave } : {}),
    bordas,
    faltantes,
    comVincos,
  };
}

/** vincosDasLinhas(receita, linhasJson, opcoes) -> { opcoes, superficies: [uma por passo `subdivisao`] } */
export function vincosDasLinhas(receita, linhasJson, opcoes = {}) {
  const o = { ...PADROES, ...opcoes };
  for (const [k, x] of Object.entries(o)) if (!(Number.isFinite(x) && x > 0)) throw new Error(`vincos-das-linhas: a opção ${k} precisa ser número maior que zero`);
  const linhas = lerLinhas3d(linhasJson);
  /* a rede de curvas montada ao ler a receita fica capturada, e é ela que diz que a gaiola se lê por curvas */
  const { resultado: entrada, gaiolas } = capturarGaiolas(() => entradaDaReceita(receita));
  const superficies = [];
  entrada.PASSOS.forEach(([op], i) => { if (op === 'subdivisao') superficies.push(vincosDoPasso(entrada, i, linhas, o, { receita, gaiolas })); });
  if (!superficies.length) throw new Error('vincos-das-linhas: a receita não tem passo subdivisao');
  return { opcoes: o, superficies };
}

function lerOpcoes(args) {
  const o = {}; let linhas = null;
  const nomes = { 'limiar-mm': 'limiarMm', 'passo-mm': 'passoMm', 'alinhamento-graus': 'alinhamentoGraus', 'minimo-mm': 'minimoMm', 'cobertura-mm': 'coberturaMm', 'passo-da-curva-mm': 'passoDaCurvaMm', 'fundir-mm': 'fundirMm' };
  for (const a of args) {
    const m = /^--([a-z-]+)=(.+)$/.exec(a);
    if (m && m[1] === 'linhas') { linhas = m[2]; continue; }
    if (!m || !nomes[m[1]]) throw new Error(`vincos-das-linhas: opção desconhecida ${a}; as opções são --linhas=, ${Object.keys(nomes).map((k) => `--${k}=`).join(', ')}`);
    const x = Number(m[2]); if (!(x > 0)) throw new Error(`vincos-das-linhas: ${a} precisa ser número maior que zero`);
    o[nomes[m[1]]] = x;
  }
  if (!linhas) throw new Error('vincos-das-linhas: falta --linhas=<arquivo JSON de ler-linhas --3d>');
  return { o, linhas };
}

async function principal(argv) {
  const [alvo, ...resto] = argv.slice(2);
  if (!alvo) { process.stderr.write('uso: node tools/modelar/vincos-das-linhas.mjs <peça> --linhas=<linhas.json> [--limiar-mm=5] [--passo-mm=2] [--alinhamento-graus=30] [--minimo-mm=15] [--cobertura-mm=2] [--passo-da-curva-mm=60] [--fundir-mm=10]\n'); return 2; }
  const caminho = resolverCaminhoReceita(alvo);
  if (!caminho) { process.stderr.write(`vincos-das-linhas: não achei a receita '${alvo}'.\n`); return 2; }
  const { o, linhas } = lerOpcoes(resto);
  const receita = receitaDoModulo(await importarReceita(caminho));
  const resultado = vincosDasLinhas(receita, JSON.parse(readFileSync(linhas, 'utf8')), o);
  process.stdout.write(`${JSON.stringify({ peca: alvo, ...resultado }, null, 2)}\n`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal(process.argv).then((codigo) => { process.exitCode = codigo; }, (erro) => { process.stderr.write(`${erro.message}\n`); process.exitCode = 1; });
}

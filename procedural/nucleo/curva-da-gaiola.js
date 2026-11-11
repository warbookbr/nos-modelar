/* curva-da-gaiola.js — a curva sobre a superfície de uma gaiola, tirada dela sem digitar coordenada
 *
 * FICHA curvaDaGaiola
 * serve: tirar da gaiola de `gaiolaPorEstacoes` ou de `gaiolaPorLacos` a polilinha, em mm, que corre sobre a superfície da subdivisão ao longo de uma estação (ou laço), de uma coluna, ou entre duas colunas numa estação, também numa posição fracionária entre duas estações ou colunas; é a entrada `linhas[i].curva` de `paineisPorVaos`.
 * quando: a linha de vão, de uma porta, de uma janela ou de um filete que precisa subir uma quina arredondada, onde a linha desenhada numa vista é recusada ou degrau; a curva sai da gaiola e acompanha a superfície, sem coordenada escrita à mão.
 * unidades: SAÍDA em mm. `gaiolaPorLacos` entra em mm (`pontosMm`); `gaiolaPorEstacoes` entra em metro (`pontos`), e `unidade: 'mm'` diz que os pontos já estão em mm (uma gaiola escrita à mão em mm).
 * campos:
 *   estacao | laco: a posição da linha: o nome, o índice (7 ou 7,4: a estação 7 e 0,4 do caminho até a 8), { em } (a posição no eixo) ou { entre: [a, b], fracao }; com `de` e `ate`, as colunas entre as quais a linha corre (nome, índice, ou { trecho, k } nos laços); sem eles, a estação inteira (no laço, a volta fechada).
 *   coluna: a coluna (nome, ou { entre: [a, b], fracao } para uma posição entre duas colunas); `de` e `ate` são as estações entre as quais a linha corre (padrão: todas).
 *   opcoes: { niveis? (3), borda? ('suave', ou a do passo), unidade? ('metro') } os níveis e a borda do passo `subdivisao` que a chapa usa, para a curva cair na malha dela.
 * devolve: { curva: [[x, y, z], ...], fechada, celulas }.
 * exemplo:
 *   const g = gaiolaPorEstacoes({ eixo: 'z', estacoes: [...], vincos: [{ nome: 'cintura', coluna: 'cintura', raio: 6 }] });
 *   curvaDaGaiola(g, { estacao: 7.4, de: 'soleira', ate: 'teto' }).curva   // a linha da porta, subindo a quina
 * peça: procedural/nucleo/curva-da-gaiola.test.ts (a chapa em L de quina de raio 6 e de raio 3, em estação fracionária).
 * FIM DA FICHA
 *
 * COMO AVALIA. A gaiola é resolvida como o passo `subdivisao` a resolve (`gaiolaDoPasso`) e refinada com os mesmos níveis (`subdividirCatmullClark`); com `medidas`, a malha
 * vai ao limite, como no passo. O vértice i da gaiola continua o vértice i da malha, e as faces da malha descem das faces da gaiola em ordem: cada face de quatro cantos vira
 * 4 elevado a `niveis` folhas, numa grade de 2^niveis por 2^niveis. Um ponto da superfície é dado pela face da gaiola e pela posição (u, v) nela, e vale a interpolação
 * bilinear dos quatro cantos da folha que o contém. A linha numa estação fracionária fixa u e anda v pelos nós da grade das folhas; a de uma coluna fixa v e anda u.
 *
 * AS COLUNAS DE APOIO. O raio em mm de um vinco insere colunas de apoio entre as colunas declaradas (nomes `${vinco}_apoio${j}_${ponto}_${vizinho}`, em `origens` da gaiola);
 * a cadeia entre duas colunas declaradas vizinhas é a coluna, os apoios dela, os apoios da outra, e a outra. A linha passa por elas todas, e a quina sobe sobre o filete.
 * A fração entre duas colunas é contada em trechos da cadeia (uma fração de 0,5 numa cadeia de 3 trechos cai no meio do segundo).
 *
 * O QUE RECUSA, com os nomes: a estação ou a coluna que não existe, a face da gaiola entre duas colunas que não é de quatro cantos (a transição de colunas, uma fusão ou
 * divisão), duas estações vizinhas em que a coluna não existe ou não é vizinha da mesma, e cadeias com número de apoios diferente entre elas. A curva é a da malha refinada,
 * e não a da superfície limite exata; com `niveis` igual ao do passo da chapa ela cai na malha. */
import { subdividirCatmullClark } from './subdivisao.js';
import { gaiolaDoPasso } from './operacoes/subdivisao.js';

const erro = (texto) => { throw new Error(`curvaDaGaiola: ${texto}`); };
const citar = (x) => (typeof x === 'string' ? `'${x}'` : JSON.stringify(x));
const EPS = 1e-9;

/* ---- a superfície: a malha refinada e a avaliação por (face da gaiola, u, v) ---- */
const memoria = new WeakMap();

function superficieDe(gaiola, opcoes) {
  const niveis = opcoes.niveis ?? 3;
  if (!Number.isInteger(niveis) || niveis < 1 || niveis > 6) erro(`opcoes.niveis é um inteiro de 1 a 6 (recebido ${citar(opcoes.niveis)})`);
  const passo = gaiola.passo;
  if (!passo || !Array.isArray(passo.vertices) || !Array.isArray(passo.faces)) erro('a gaiola precisa trazer `passo` (o que gaiolaPorEstacoes e gaiolaPorLacos devolvem)');
  const unidade = opcoes.unidade ?? 'metro';
  if (unidade !== 'metro' && unidade !== 'mm') erro(`opcoes.unidade é 'metro' ou 'mm' (recebido ${citar(opcoes.unidade)})`);
  const borda = opcoes.borda ?? passo.borda ?? 'suave';
  const chave = `${niveis}|${borda}|${unidade}`;
  const guardado = memoria.get(gaiola)?.get(chave);
  if (guardado) return guardado;
  const posicoes = gaiola.pontosMm ?? Object.fromEntries(Object.entries(gaiola.pontos ?? {}).map(([n, p]) => [n, p.map((x) => (unidade === 'metro' ? x * 1000 : x))]));
  const vec = (nome) => { const p = posicoes[nome]; if (!p) erro(`o ponto ${citar(nome)} da gaiola não tem posição em \`pontos\``); return p; };
  const r = gaiolaDoPasso(passo, { vec, num: (x) => x });
  if (r.erro) erro(`a gaiola não resolve como passo subdivisao: ${r.erro[1]}`);
  const { gaiola: g, declarados } = r;
  const indiceDoNome = new Map(); declarados.forEach((n, k) => { if (typeof n === 'string') indiceDoNome.set(n, k); });
  const malha = subdividirCatmullClark({ vertices: g.vertices, faces: g.faces, vincos: g.vincos, cantos: g.cantos, niveis, borda, aoLimite: passo.medidas != null, comVincos: true });
  const inicio = []; let n = 0;
  for (const f of g.faces) { inicio.push(n); n += f.length * 4 ** (niveis - 1); }
  if (n !== malha.faces.length) erro(`a malha refinada tem ${malha.faces.length} faces e a descendência da gaiola ${n}`);
  const porVertice = new Map();
  g.faces.forEach((f, fi) => { for (const v of f) { if (!porVertice.has(v)) porVertice.set(v, []); porVertice.get(v).push(fi); } });
  const folhas = new Map();
  const S = { niveis, lado: 2 ** niveis, malha, gaiola: g, indiceDoNome, inicio, porVertice, folhas, unidade };
  if (!memoria.has(gaiola)) memoria.set(gaiola, new Map());
  memoria.get(gaiola).set(chave, S);
  return S;
}

/** As folhas de uma face da gaiola de quatro cantos: o mapa (iu, iv) -> { coords: os cantos em (u, v) da face, ids: os vértices da malha, u0, v0, s }. */
function folhasDe(S, fi) {
  if (S.folhas.has(fi)) return S.folhas.get(fi);
  const f = S.gaiola.faces[fi];
  let lista = [[[0, 0], [1, 0], [1, 1], [0, 1]]];
  for (let nivel = 1; nivel <= S.niveis; nivel += 1) {
    const prox = [];
    for (const P of lista) {
      const meio = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const centro = [(P[0][0] + P[2][0]) / 2, (P[0][1] + P[2][1]) / 2];
      for (let k = 0; k < 4; k += 1) prox.push([P[k], meio(P[k], P[(k + 1) % 4]), centro, meio(P[(k + 3) % 4], P[k])]);
    }
    lista = prox;
  }
  void f;
  const mapa = new Map();
  lista.forEach((coords, idx) => {
    const u0 = Math.min(...coords.map((c) => c[0])); const v0 = Math.min(...coords.map((c) => c[1]));
    const s = 1 / S.lado;
    mapa.set(`${Math.round(u0 * S.lado)},${Math.round(v0 * S.lado)}`, { coords, ids: S.malha.faces[S.inicio[fi] + idx], u0, v0, s });
  });
  S.folhas.set(fi, mapa);
  return mapa;
}

/** A posição da superfície na face `fi` da gaiola, no ponto (u, v) dos cantos da face. */
function avaliar(S, fi, u, v) {
  const L = S.lado;
  const iu = Math.min(L - 1, Math.max(0, Math.floor(u * L + EPS))); const iv = Math.min(L - 1, Math.max(0, Math.floor(v * L + EPS)));
  const folha = folhasDe(S, fi).get(`${iu},${iv}`);
  const a = Math.min(1, Math.max(0, (u - folha.u0) / folha.s)); const b = Math.min(1, Math.max(0, (v - folha.v0) / folha.s));
  const p = [0, 0, 0];
  folha.coords.forEach((c, k) => {
    const w = (Math.abs(c[0] - folha.u0) < EPS ? 1 - a : a) * (Math.abs(c[1] - folha.v0) < EPS ? 1 - b : b);
    const q = S.malha.vertices[folha.ids[k]];
    p[0] += w * q[0]; p[1] += w * q[1]; p[2] += w * q[2];
  });
  return p;
}

/** A face da gaiola que tem os quatro pontos nomeados, com as coordenadas (u, v) dela em cada um; recusa a que não é de quatro cantos. */
function celula(S, nomes, onde) {
  const idx = nomes.map((n) => { const i = S.indiceDoNome.get(n); if (i === undefined) erro(`${onde}: o ponto ${citar(n)} não é ponto da gaiola`); return i; });
  const candidatas = S.porVertice.get(idx[0])?.filter((fi) => idx.every((i) => S.gaiola.faces[fi].includes(i))) ?? [];
  if (!candidatas.length) erro(`${onde}: não há face da gaiola com os pontos ${nomes.map(citar).join(', ')}; a transição de colunas (um polígono que não é de quatro cantos, um apoio que começa ou acaba) fica entre eles, e a curva não passa por ali: escolha outro trecho`);
  const fi = candidatas[0];
  const f = S.gaiola.faces[fi];
  if (f.length !== 4) erro(`${onde}: a face da gaiola entre ${nomes.map(citar).join(', ')} tem ${f.length} cantos, e a curva só passa por faces de quatro cantos`);
  const local = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const canto = (n) => local[f.indexOf(idx[n])];
  const c00 = canto(0); const c10 = canto(1); const c11 = canto(2); const c01 = canto(3);
  /* o ponto (gu, gv) da grade, nos cantos da face */
  return { fi, ponto: (gu, gv) => [0, 1].map((e) => (1 - gu) * (1 - gv) * c00[e] + gu * (1 - gv) * c10[e] + gu * gv * c11[e] + (1 - gu) * gv * c01[e]) };
}

/* ---- a grade: linhas (estações ou laços) por colunas ---- */
function gradeDeEstacoes(gaiola) {
  const lista = gaiola.estrutura.estacoes;
  const apoios = new Map();
  for (const [nome, o] of Object.entries(gaiola.origens ?? {})) {
    if (o?.tipo !== 'apoio') continue;
    const c = `${o.ponto}\u0000${o.vizinho}`;
    if (!apoios.has(c)) apoios.set(c, []);
    apoios.get(c).push({ nome, coluna: o.coluna });
  }
  for (const l of apoios.values()) l.sort((a, b) => a.coluna - b.coluna);
  const apoiosDe = (a, b) => (apoios.get(`${a}\u0000${b}`) ?? []).map((x) => x.nome);
  const linhas = lista.map((E) => {
    const colunas = E.colunas.map((c) => c[0]);
    return { nome: E.nome, em: E.em, colunas, pontos: colunas.map((c) => gaiola.ponto(E.nome, c)), indice: new Map(colunas.map((c, k) => [c, k])) };
  });
  const fechaU = gaiola.estrutura.definicao?.eixo?.fechada === true;
  return {
    tipo: 'estações', unidade: 'estação', linhas, fechaU, fechaV: false,
    cadeia: (linha, ja, jb) => { const a = linha.pontos[ja]; const b = linha.pontos[jb]; return [a, ...apoiosDe(a, b), ...apoiosDe(b, a).reverse(), b]; },
  };
}

function gradeDeLacos(gaiola) {
  const trechos = gaiola.trechos;
  if (!Array.isArray(trechos) || !trechos.length) erro('a gaiola de laços não traz `trechos`');
  const linhas = gaiola.lacos.map((l) => {
    const colunas = []; const pontos = [];
    for (const t of trechos) {
      const total = t.pontos ?? t.n;
      for (let k = 0; k < total - 1; k += 1) {
        const nome = gaiola.nomeDe(l.nome, t.nome, k);
        if (pontos.length && pontos[pontos.length - 1] === nome) continue;
        colunas.push(`${t.nome}.${k}`); pontos.push(nome);
      }
    }
    if (pontos.length > 1 && pontos[0] === pontos[pontos.length - 1]) { pontos.pop(); colunas.pop(); }
    return { nome: l.nome, em: l.em, colunas, pontos, indice: new Map(colunas.map((c, k) => [c, k])) };
  });
  return { tipo: 'laços', unidade: 'laço', linhas, fechaU: false, fechaV: true, cadeia: (linha, ja, jb) => [linha.pontos[ja], linha.pontos[jb]] };
}

function gradeDe(gaiola) {
  if (gaiola?.estrutura?.estacoes && typeof gaiola.ponto === 'function') return gradeDeEstacoes(gaiola);
  if (gaiola?.lacos && typeof gaiola.nomeDe === 'function') return gradeDeLacos(gaiola);
  return erro('a gaiola precisa ser a que gaiolaPorEstacoes ou gaiolaPorLacos devolve (com `estrutura.estacoes` e `ponto`, ou com `lacos` e `nomeDe`)');
}

/* ---- as referências do pedido ---- */
/** A posição de uma linha da grade (estação ou laço): { i, t }, com t em [0, 1) a fração do caminho até a linha seguinte. */
function posicaoDaLinha(G, ref, onde) {
  const n = G.linhas.length;
  const nomeDe = (k) => G.linhas[k].nome;
  const porNome = (nome) => { const k = G.linhas.findIndex((l) => l.nome === nome); if (k < 0) erro(`${onde}: ${G.unidade} ${citar(nome)} não existe (há ${G.linhas.slice(0, 8).map((l) => citar(l.nome)).join(', ')}${n > 8 ? ', ...' : ''})`); return k; };
  let x;
  if (typeof ref === 'string') x = porNome(ref);
  else if (typeof ref === 'number' && Number.isFinite(ref)) x = ref;
  else if (ref && typeof ref === 'object' && Number.isFinite(ref.em)) {
    const e = G.linhas.map((l) => l.em);
    let k = -1; for (let j = 0; j + 1 < n; j += 1) if (ref.em >= e[j] - EPS && ref.em <= e[j + 1] + EPS) { k = j; break; }
    if (k < 0) erro(`${onde}: em = ${ref.em} cai fora das ${G.unidade}s (de ${e[0]} a ${e[n - 1]})`);
    x = k + (e[k + 1] === e[k] ? 0 : (ref.em - e[k]) / (e[k + 1] - e[k]));
  } else if (ref && typeof ref === 'object' && Array.isArray(ref.entre) && ref.entre.length === 2 && Number.isFinite(ref.fracao)) {
    const a = porNome(ref.entre[0]); const b = porNome(ref.entre[1]);
    if (!(b === a + 1 || (G.fechaU && a === n - 1 && b === 0))) erro(`${onde}: ${citar(ref.entre[0])} e ${citar(ref.entre[1])} não são ${G.unidade}s vizinhas, nessa ordem`);
    x = a + ref.fracao;
  } else erro(`${onde}: a ${G.unidade} se dá por nome, índice (7 ou 7,4), { em } ou { entre: [a, b], fracao } (recebido ${JSON.stringify(ref)})`);
  if (!(x >= -EPS && x <= n - 1 + EPS) && !G.fechaU) erro(`${onde}: o índice ${x} cai fora das ${G.unidade}s (de 0 a ${n - 1})`);
  let i = Math.floor(x + EPS); let t = x - i; if (t < EPS) t = 0;
  if (i > n - 1) { i = n - 1; t = 0; }
  void nomeDe;
  return { i, t };
}

/** O índice de uma coluna na linha: nome, número inteiro ou { trecho, k } (laços). */
function indiceDaColuna(linha, ref, onde) {
  if (typeof ref === 'number' && Number.isInteger(ref) && ref >= 0 && ref < linha.colunas.length) return ref;
  const nome = typeof ref === 'string' ? ref : ref && typeof ref === 'object' && typeof ref.trecho === 'string' ? `${ref.trecho}.${ref.k ?? 0}` : null;
  if (nome != null) {
    if (linha.indice.has(nome)) return linha.indice.get(nome);
    if (linha.indice.has(`${nome}.0`)) return linha.indice.get(`${nome}.0`);
  }
  return erro(`${onde}: a coluna ${citar(ref)} não existe em ${citar(linha.nome)} (há ${linha.colunas.slice(0, 10).map(citar).join(', ')}${linha.colunas.length > 10 ? ', ...' : ''})`);
}

/* ---- as linhas ---- */
function juntar(pontos) {
  const saida = [];
  for (const p of pontos) {
    const u = saida[saida.length - 1];
    if (u && Math.hypot(p[0] - u[0], p[1] - u[1], p[2] - u[2]) < 1e-9) continue;
    saida.push(p.map((x) => Math.round(x * 1e6) / 1e6));
  }
  return saida;
}

function linhaAoLongoDaLinha(S, G, pedido, onde) {
  const ref = pedido.estacao ?? pedido.laco;
  const n = G.linhas.length;
  let { i, t } = posicaoDaLinha(G, ref, onde);
  let ia = i; let ib = (i + 1) % n; let u = t;
  if (t === 0 && i === n - 1 && !G.fechaU) { ia = n - 2; ib = n - 1; u = 1; }
  if (n < 2) erro(`${onde}: a gaiola tem uma ${G.unidade} só`);
  const A = G.linhas[ia]; const B = G.linhas[ib];
  const m = A.colunas.length;
  /* as colunas entre `de` e `ate`, na ordem da linha A; no laço a volta fecha, e sem `de` nem `ate` a linha é a volta inteira */
  const de = pedido.de == null ? 0 : indiceDaColuna(A, pedido.de, `${onde} (de)`);
  const volta = G.fechaV && pedido.de == null && pedido.ate == null;
  const sequencia = [de];
  if (volta) { for (let j = 1; j <= m; j += 1) sequencia.push(j); } else if (G.fechaV) {
    const ate = pedido.ate == null ? (de + m - 1) % m : indiceDaColuna(A, pedido.ate, `${onde} (ate)`);
    for (let j = de; j !== ate; ) { j = (j + 1) % m; sequencia.push(j); }
  } else {
    const ate = pedido.ate == null ? m - 1 : indiceDaColuna(A, pedido.ate, `${onde} (ate)`);
    const passo = Math.sign(ate - de);
    for (let j = de; j !== ate; ) { j += passo; sequencia.push(j); }
  }
  if (sequencia.length < 2) erro(`${onde}: de e ate são a mesma coluna (${citar(A.colunas[de])}); a linha precisa de duas colunas ou mais`);
  const pontos = [];
  const doB = (nome) => { const k = B.indice.get(nome); if (k === undefined) erro(`${onde}: a coluna ${citar(nome)} existe em ${citar(A.nome)} e não em ${citar(B.nome)}`); return k; };
  for (let s = 0; s + 1 < sequencia.length; s += 1) {
    const ja = sequencia[s] % m; const jb = sequencia[s + 1] % m;
    const kja = doB(A.colunas[ja]); const kjb = doB(A.colunas[jb]);
    const vizinhas = (a, b) => Math.abs(a - b) === 1 || (G.fechaV && Math.abs(a - b) === B.colunas.length - 1);
    if (!vizinhas(kja, kjb)) erro(`${onde}: as colunas ${citar(A.colunas[ja])} e ${citar(A.colunas[jb])} são vizinhas em ${citar(A.nome)} e não em ${citar(B.nome)}`);
    const cadA = G.cadeia(A, ja, jb); const cadB = G.cadeia(B, kja, kjb);
    if (cadA.length !== cadB.length) erro(`${onde}: entre as colunas ${citar(A.colunas[ja])} e ${citar(A.colunas[jb])} a ${G.unidade} ${citar(A.nome)} tem ${cadA.length - 2} coluna(s) de apoio e ${citar(B.nome)} tem ${cadB.length - 2}`);
    for (let k = 0; k + 1 < cadA.length; k += 1) {
      const c = celula(S, [cadA[k], cadB[k], cadB[k + 1], cadA[k + 1]], `${onde}, entre ${citar(A.nome)} e ${citar(B.nome)}`);
      for (let r = k === 0 && s === 0 ? 0 : 1; r <= S.lado; r += 1) {
        const [fu, fv] = c.ponto(u, r / S.lado);
        pontos.push(avaliar(S, c.fi, fu, fv));
      }
    }
  }
  return { pontos, fechada: volta };
}

function linhaAoLongoDaColuna(S, G, pedido, onde) {
  const n = G.linhas.length;
  /* a coluna de cada linha: um nome fixo, ou uma fração entre duas colunas, contada em trechos da cadeia */
  const ref = pedido.coluna;
  const entre = ref && typeof ref === 'object' && Array.isArray(ref.entre) ? ref : null;
  const intervalo = (linha) => {
    if (entre) { const a = indiceDaColuna(linha, entre.entre[0], onde); const b = indiceDaColuna(linha, entre.entre[1], onde); return { ja: a, jb: b, f: entre.fracao }; }
    const j = indiceDaColuna(linha, ref, onde);
    const m = linha.colunas.length;
    if (j + 1 < m || G.fechaV) return { ja: j, jb: (j + 1) % m, f: 0 };
    return { ja: j - 1, jb: j, f: 1 };
  };
  if (entre && !(Number.isFinite(entre.fracao) && entre.fracao >= 0 && entre.fracao <= 1)) erro(`${onde}: a fração entre colunas vai de 0 a 1 (recebido ${JSON.stringify(entre.fracao)})`);
  const de = pedido.de == null ? 0 : posicaoDaLinha(G, pedido.de, `${onde} (de)`).i;
  const ate = pedido.ate == null ? n - 1 : posicaoDaLinha(G, pedido.ate, `${onde} (ate)`).i;
  const passo = Math.sign(ate - de) || 1;
  const sequencia = [];
  for (let i = de; ; i += passo) { sequencia.push(i); if (i === ate) break; }
  if (sequencia.length < 2) erro(`${onde}: a linha ao longo da coluna precisa de duas ${G.unidade}s ou mais (de ${citar(G.linhas[de].nome)} a ${citar(G.linhas[ate].nome)})`);
  const pontos = [];
  for (let s = 0; s + 1 < sequencia.length; s += 1) {
    const A = G.linhas[sequencia[s]]; const B = G.linhas[sequencia[s + 1]];
    const ia = intervalo(A);
    const nomeA = A.colunas[ia.ja]; const nomeB = A.colunas[ia.jb];
    const kja = B.indice.get(nomeA); const kjb = B.indice.get(nomeB);
    if (kja === undefined || kjb === undefined) erro(`${onde}: as colunas ${citar(nomeA)} e ${citar(nomeB)} existem em ${citar(A.nome)} e não ambas em ${citar(B.nome)}`);
    const cadA = G.cadeia(A, ia.ja, ia.jb); const cadB = G.cadeia(B, kja, kjb);
    if (cadA.length !== cadB.length) erro(`${onde}: entre as colunas ${citar(nomeA)} e ${citar(nomeB)} a ${G.unidade} ${citar(A.nome)} tem ${cadA.length - 2} coluna(s) de apoio e ${citar(B.nome)} tem ${cadB.length - 2}`);
    const trechos = cadA.length - 1;
    const x = ia.f * trechos; const k = Math.min(trechos - 1, Math.floor(x + EPS)); const v = x - k;
    const c = celula(S, [cadA[k], cadB[k], cadB[k + 1], cadA[k + 1]], `${onde}, entre ${citar(A.nome)} e ${citar(B.nome)}`);
    for (let r = s === 0 ? 0 : 1; r <= S.lado; r += 1) {
      const [fu, fv] = c.ponto(r / S.lado, v);
      pontos.push(avaliar(S, c.fi, fu, fv));
    }
  }
  return { pontos, fechada: false };
}

/**
 * A curva sobre a superfície da gaiola, em mm.
 * @param {any} gaiola o que `gaiolaPorEstacoes` ou `gaiolaPorLacos` devolve
 * @param {{ estacao?: any, laco?: any, coluna?: any, de?: any, ate?: any }} pedido
 * @param {{ niveis?: number, borda?: string, unidade?: 'metro' | 'mm' }} [opcoes]
 * @returns {{ curva: number[][], fechada: boolean, celulas: number }}
 */
export function curvaDaGaiola(gaiola, pedido, opcoes = {}) {
  if (!pedido || typeof pedido !== 'object') erro('espera o pedido { estacao | laco | coluna, de?, ate? }');
  const dadas = ['estacao', 'laco', 'coluna'].filter((k) => pedido[k] !== undefined);
  if (dadas.length !== 1) erro(`o pedido dá uma de estacao, laco ou coluna (recebido ${dadas.length ? dadas.join(' e ') : 'nenhuma'})`);
  const G = gradeDe(gaiola);
  if (dadas[0] === 'estacao' && G.tipo !== 'estações') erro('`estacao` é da gaiola de estações; na de laços use `laco`');
  if (dadas[0] === 'laco' && G.tipo !== 'laços') erro('`laco` é da gaiola de laços; na de estações use `estacao`');
  const S = superficieDe(gaiola, opcoes);
  const onde = `o pedido ${dadas[0]} ${citar(pedido[dadas[0]])}`;
  const r = dadas[0] === 'coluna' ? linhaAoLongoDaColuna(S, G, pedido, onde) : linhaAoLongoDaLinha(S, G, pedido, onde);
  let curva = juntar(r.pontos);
  if (r.fechada && curva.length > 1) {
    const a = curva[0]; const b = curva[curva.length - 1];
    if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 1e-6) curva = curva.slice(0, -1);
  }
  return { curva, fechada: r.fechada, celulas: S.gaiola.faces.length };
}

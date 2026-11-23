/* tracador.js — o traçador automático do cobre de uma placa declarada: um roteador em grade sobre as duas faces, com via onde
   troca de face.

   A GRADE. O plano da placa vira células de `passo` mm (padrão 0,25) nas duas faces. As máscaras de cada rede valem para a rede
   inteira: o cobre que ela mesma ganha no caminho não a bloqueia. Para cada rede, uma célula fica bloqueada
   quando o centro dela está mais perto de um cobre de outra rede (ilha, trilha, via) ou de um furo de fixação do que a folga
   exigida mais meia largura da trilha e meio passo, ou mais perto da borda do que a distância à borda mais meia largura; a
   via precisa da mesma folga para o raio do anel, nas duas faces. A célula dentro de uma ilha da própria rede, a meia largura
   ou mais da borda da ilha, fica livre mesmo perto de outra rede, porque ali a trilha está dentro do cobre que já existe.

   A ROTA. As redes saem na ordem da lista; a rede de vários terminais cresce como árvore, do primeiro terminal ao mais perto
   dos que faltam, e cada ligação é um A* de várias origens (o cobre que a rede já tem) até as células do terminal alvo, com
   passos nas oito direções, um custo a cada curva (a trilha sai em retas longas com curvas de 45 graus, sem escada) e a via
   como passo de custo alto entre as faces. O desempate é fixo (a ordem de entrada na fila),
   e a mesma entrada dá o mesmo traçado. O caminho vira trechos de pontos nos centros das células, sem os pontos do meio das
   retas, e uma via em cada troca de face.

   O traçado sai no formato de `geometria.js`, com `origem: 'tracado'` em cada trecho, e as redes que não fecharam saem em
   `naoTracadas`, com o terminal que faltou. Quem garante as regras é o conferidor, que mede o traçado depois; a grade só
   procura um caminho que tenha folga. */
import { capsula, circulo } from './geometria.js';

const FACES = ['cima', 'baixo'];
const CUSTO_DA_VIA = 20;
const CURVA_DE_45 = 2;
const CURVA_DE_90 = 8;

function arestas(p) { return p.map((a, k) => [a, p[(k + 1) % p.length]]); }
function distanciaAoSegmento(p, [a, b]) {
  const d = [b[0] - a[0], b[1] - a[1]];
  const L2 = d[0] * d[0] + d[1] * d[1];
  const t = L2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / L2)) : 0;
  return Math.hypot(p[0] - a[0] - t * d[0], p[1] - a[1] - t * d[1]);
}
function dentro(p, poligono) {
  let sinal = 0;
  for (const [a, b] of arestas(poligono)) {
    const z = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    if (Math.abs(z) < 1e-12) continue;
    if (sinal && Math.sign(z) !== sinal) return false;
    sinal = Math.sign(z);
  }
  return true;
}
const aBorda = (p, poligono) => Math.min(...arestas(poligono).map((e) => distanciaAoSegmento(p, e)));
const distancia = (p, poligono) => (dentro(p, poligono) ? 0 : aBorda(p, poligono));
function dentroDoContorno([x, z], contorno) {
  let c = false;
  for (const [a, b] of arestas(contorno)) if ((a[1] > z) !== (b[1] > z) && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  return c;
}

/* fila de prioridade binária com desempate pela ordem de entrada */
class Fila {
  constructor() { this.h = []; this.n = 0; }
  get tamanho() { return this.h.length; }
  por(prioridade, valor) {
    const h = this.h; h.push([prioridade, this.n++, valor]);
    let i = h.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (menor(h[i], h[p])) { [h[i], h[p]] = [h[p], h[i]]; i = p; } else break; }
  }
  tirar() {
    const h = this.h; const topo = h[0]; const ultimo = h.pop();
    if (h.length) {
      h[0] = ultimo; let i = 0;
      for (;;) { const l = 2 * i + 1; const r = l + 1; let m = i; if (l < h.length && menor(h[l], h[m])) m = l; if (r < h.length && menor(h[r], h[m])) m = r; if (m === i) break; [h[i], h[m]] = [h[m], h[i]]; i = m; }
    }
    return topo[2];
  }
}
const menor = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);

/**
 * tracar({ contorno, ilhas, furosDeFixacao, lista, regras, base?, passo? })
 *   ilhas: [{ peca, terminal, face, poligono }] do placaDeclarada; furosDeFixacao: [poligono]; lista: as redes do pedido;
 *   regras: PLACA; base: um traçado já declarado (trechos fixos), mantido e usado como cobre da rede dele; passo: da grade, mm.
 *   -> { tracado: { versao: 1, placa, redes }, naoTracadas: [{ rede, terminal, motivo }] }
 */
export function tracar({ placa = 'placa', contorno, ilhas, furosDeFixacao = [], lista, regras, base = null, passo = 0.25 }) {
  const xs = contorno.map((p) => p[0]); const zs = contorno.map((p) => p[1]);
  const x0 = Math.min(...xs); const z0 = Math.min(...zs);
  const NX = Math.ceil((Math.max(...xs) - x0) / passo) + 1; const NZ = Math.ceil((Math.max(...zs) - z0) / passo) + 1;
  const N = NX * NZ;
  const centro = (i, j) => [x0 + i * passo, z0 + j * passo];
  const redeDoTerminal = new Map(lista.flatMap((r) => r.terminais.map((t) => [`${t.peca}.${t.porta}`, r.id])));
  const redes = new Map(lista.map((r) => [r.id, r]));
  const larguraDe = (r) => Math.max(regras.trilhaPadrao, regras.trilhaMinima, r.larguraMinima ?? 0);
  const folgaDe = (r) => Math.max(regras.folga, r?.distanciaMinima ?? 0);
  const rv = regras.via.furo / 2 + regras.via.anel;

  /* o cobre que existe, por face: as ilhas, os furos de fixação (de ninguém) e o que o traçado já tem */
  const cobre = { cima: [], baixo: [] };
  for (const i of ilhas) cobre[i.face].push({ rede: redeDoTerminal.get(`${i.peca}.${i.terminal}`) ?? `terminal:${i.peca}.${i.terminal}`, poligono: i.poligono, ilha: true });
  for (const f of furosDeFixacao) for (const face of FACES) cobre[face].push({ rede: null, poligono: f });
  const saida = new Map(lista.map((r) => [r.id, { id: r.id, trechos: [], vias: [] }]));
  const acrescentar = (rede, trecho, via) => {
    const s = saida.get(rede);
    if (trecho) { s.trechos.push(trecho); for (let k = 0; k + 1 < trecho.pontos.length; k += 1) cobre[trecho.face].push({ rede, poligono: capsula(trecho.pontos[k], trecho.pontos[k + 1], trecho.largura) }); }
    if (via) { s.vias.push(via); for (const face of FACES) cobre[face].push({ rede, poligono: circulo(via.centro, via.furo / 2 + via.anel) }); }
  };
  for (const r of base?.redes ?? []) {
    if (!saida.has(r.id)) continue;
    for (const t of r.trechos) acrescentar(r.id, { ...t, origem: t.origem ?? 'declarado' });
    for (const v of r.vias ?? []) acrescentar(r.id, null, v);
  }

  /* a máscara da borda para um raio, calculada uma vez: fora do contorno ou mais perto da borda que a distância exigida */
  const bordas = new Map();
  function mascaraDaBorda(raio) {
    if (!bordas.has(raio)) {
      const m = new Uint8Array(N);
      for (let j = 0; j < NZ; j += 1) {
        for (let i = 0; i < NX; i += 1) {
          const c = centro(i, j);
          if (!dentroDoContorno(c, contorno) || aBorda(c, contorno) < regras.borda + raio) m[j * NX + i] = 1;
        }
      }
      bordas.set(raio, m);
    }
    return bordas.get(raio);
  }
  /* a máscara de uma face para uma rede: 1 bloqueado; com `raio`, a da via */
  function mascara(face, rede, raio) {
    const m = mascaraDaBorda(raio).slice();
    const propria = folgaDe(redes.get(rede));
    for (const o of cobre[face]) {
      if (o.rede === rede) continue;
      const margem = Math.max(propria, folgaDe(redes.get(o.rede))) + raio + passo / 2;
      const bx = o.poligono.map((p) => p[0]); const bz = o.poligono.map((p) => p[1]);
      const i0 = Math.max(0, Math.floor((Math.min(...bx) - margem - x0) / passo)); const i1 = Math.min(NX - 1, Math.ceil((Math.max(...bx) + margem - x0) / passo));
      const j0 = Math.max(0, Math.floor((Math.min(...bz) - margem - z0) / passo)); const j1 = Math.min(NZ - 1, Math.ceil((Math.max(...bz) + margem - z0) / passo));
      for (let j = j0; j <= j1; j += 1) for (let i = i0; i <= i1; i += 1) if (!m[j * NX + i] && distancia(centro(i, j), o.poligono) < margem) m[j * NX + i] = 1;
    }
    return m;
  }
  function livresNaPropria(face, rede, meia, m) {
    for (const o of cobre[face]) {
      if (o.rede !== rede || !o.ilha) continue;
      const bx = o.poligono.map((p) => p[0]); const bz = o.poligono.map((p) => p[1]);
      for (let j = Math.max(0, Math.floor((Math.min(...bz) - z0) / passo)); j <= Math.min(NZ - 1, Math.ceil((Math.max(...bz) - z0) / passo)); j += 1) {
        for (let i = Math.max(0, Math.floor((Math.min(...bx) - x0) / passo)); i <= Math.min(NX - 1, Math.ceil((Math.max(...bx) - x0) / passo)); i += 1) {
          const c = centro(i, j);
          if (dentro(c, o.poligono) && aBorda(c, o.poligono) >= meia) m[j * NX + i] = 0;
        }
      }
    }
  }
  /* as células cobertas pelo cobre de uma rede (para origem e alvo) */
  function celulasDe(poligonos, face) {
    const l = [];
    for (const p of poligonos) {
      const bx = p.map((q) => q[0]); const bz = p.map((q) => q[1]);
      for (let j = Math.max(0, Math.floor((Math.min(...bz) - z0) / passo)); j <= Math.min(NZ - 1, Math.ceil((Math.max(...bz) - z0) / passo)); j += 1) {
        for (let i = Math.max(0, Math.floor((Math.min(...bx) - x0) / passo)); i <= Math.min(NX - 1, Math.ceil((Math.max(...bx) - x0) / passo)); i += 1) if (dentro(centro(i, j), p)) l.push((FACES.indexOf(face) * N) + j * NX + i);
      }
    }
    return l;
  }

  const naoTracadas = [];
  const VIZ = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [-1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, -1, Math.SQRT2]];
  /* o custo de passar da direção a para a b: 0 em frente, CURVA_DE_45 e CURVA_DE_90; null para a curva mais fechada */
  const GIRO = VIZ.map(([ai, aj]) => VIZ.map(([bi, bj]) => {
    const cos = (ai * bi + aj * bj) / (Math.hypot(ai, aj) * Math.hypot(bi, bj));
    if (cos > 0.99) return 0;
    if (cos > 0.7) return CURVA_DE_45;
    if (cos > -0.01) return CURVA_DE_90;
    return null;
  }));
  for (const r of lista) {
    const largura = larguraDe(r); const meia = largura / 2;
    const terminais = r.terminais.map((t) => `${t.peca}.${t.porta}`);
    const ilhasDe = (chave) => ilhas.filter((i) => `${i.peca}.${i.terminal}` === chave);
    if (terminais.some((t) => !ilhasDe(t).length)) { naoTracadas.push({ rede: r.id, terminal: terminais.find((t) => !ilhasDe(t).length), motivo: 'terminal que não está na placa' }); continue; }
    const masc = FACES.map((f) => { const m = mascara(f, r.id, meia); livresNaPropria(f, r.id, meia, m); return m; });
    const mascVia = FACES.map((f) => mascara(f, r.id, rv));
    /* a árvore: o cobre da rede que já existe (o primeiro terminal e o traçado de base); os terminais ligados por ele saem da fila */
    const conectado = new Set([terminais[0]]);
    const toca = (chave) => ilhasDe(chave).some((i) => cobre[i.face].some((o) => o.rede === r.id && !o.ilha && distancia(o.poligono[0], i.poligono) <= meia + 1e-6));
    for (const t of terminais.slice(1)) if (saida.get(r.id).trechos.length && toca(t)) conectado.add(t);
    let falhou = null;
    while (conectado.size < terminais.length) {
      const origem = new Set([
        ...[...conectado].flatMap((t) => ilhasDe(t).flatMap((i) => celulasDe([i.poligono], i.face))),
        ...FACES.flatMap((f) => celulasDe(cobre[f].filter((o) => o.rede === r.id && !o.ilha).map((o) => o.poligono), f)),
      ]);
      /* o alvo: o terminal que falta mais perto do cobre da rede, pelos centros das ilhas */
      const centroDe = (t) => { const p = ilhasDe(t)[0].poligono; return p.reduce((s, q) => [s[0] + q[0] / p.length, s[1] + q[1] / p.length], [0, 0]); };
      const ligados = [...conectado].map(centroDe);
      const faltam = terminais.filter((t) => !conectado.has(t));
      faltam.sort((a, b) => Math.min(...ligados.map((c) => Math.hypot(c[0] - centroDe(a)[0], c[1] - centroDe(a)[1]))) - Math.min(...ligados.map((c) => Math.hypot(c[0] - centroDe(b)[0], c[1] - centroDe(b)[1]))) || terminais.indexOf(a) - terminais.indexOf(b));
      const alvoT = faltam[0];
      const alvo = new Set(ilhasDe(alvoT).flatMap((i) => celulasDe([i.poligono], i.face)));
      const ca = centroDe(alvoT);
      /* o estado é a célula e a direção em que se chegou nela (8: sem direção, na origem ou depois da via), para cobrar cada
         curva: a de 45 graus custa CURVA_DE_45, a de 90 CURVA_DE_90, e a mais fechada não se faz. Assim o caminho sai em retas
         longas, com uma curva de 45 graus onde a direção muda, e não em escada de passos retos e diagonais. */
      const S = 9;
      const custo = new Float64Array(2 * N * S).fill(Infinity); const veio = new Int32Array(2 * N * S).fill(-1);
      const fila = new Fila();
      const h = (k) => { const c = centro((k % N) % NX, Math.floor((k % N) / NX)); return Math.hypot(c[0] - ca[0], c[1] - ca[1]) / passo; };
      for (const k of [...origem].sort((a, b) => a - b)) { custo[k * S + 8] = 0; fila.por(h(k), k * S + 8); }
      let fim = -1;
      while (fila.tamanho) {
        const st = fila.tirar(); const k = Math.floor(st / S); const dir = st % S;
        if (alvo.has(k) && !origem.has(k)) { fim = st; break; }
        const camada = Math.floor(k / N); const c = k % N; const i = c % NX; const j = Math.floor(c / NX);
        VIZ.forEach(([di, dj, d], nd) => {
          const curva = dir === 8 ? 0 : GIRO[dir][nd];
          if (curva === null) return;
          const ni = i + di; const nj = j + dj;
          if (ni < 0 || nj < 0 || ni >= NX || nj >= NZ) return;
          const nc = nj * NX + ni;
          if (masc[camada][nc] && !alvo.has(camada * N + nc)) return;
          if (di && dj && (masc[camada][j * NX + ni] || masc[camada][nj * NX + i]) && !alvo.has(camada * N + nc)) return;
          const nk = camada * N + nc; const ns = nk * S + nd; const nv = custo[st] + d + curva;
          if (nv < custo[ns]) { custo[ns] = nv; veio[ns] = st; fila.por(nv + h(nk), ns); }
        });
        const outra = 1 - camada; const nk = outra * N + c; const ns = nk * S + 8;
        if (!mascVia[0][c] && !mascVia[1][c]) {
          const nv = custo[st] + CUSTO_DA_VIA;
          if (nv < custo[ns]) { custo[ns] = nv; veio[ns] = st; fila.por(nv + h(nk), ns); }
        }
      }
      if (fim < 0) { falhou = { rede: r.id, terminal: alvoT, motivo: 'nenhum caminho com folga até o terminal' }; break; }
      /* o caminho, de trás para a frente, em trechos por face e vias nas trocas */
      const celulas = [];
      for (let st = fim; st >= 0; st = veio[st]) celulas.push(Math.floor(st / S));
      celulas.reverse();
      let atual = null;
      for (const k of celulas) {
        const face = FACES[Math.floor(k / N)]; const c = k % N; const p = centro(c % NX, Math.floor(c / NX)).map((v) => Math.round(v * 1e6) / 1e6);
        if (!atual || atual.face !== face) {
          if (atual) { if (atual.pontos.length > 1) acrescentar(r.id, comprimir(atual)); acrescentar(r.id, null, { centro: atual.pontos.at(-1), furo: regras.via.furo, anel: regras.via.anel }); }
          atual = { face, largura, pontos: [p], origem: 'tracado' };
        } else atual.pontos.push(p);
      }
      if (atual.pontos.length > 1) acrescentar(r.id, comprimir(atual));
      conectado.add(alvoT);
      /* o novo cobre pode ter tocado outros terminais da rede pelo caminho */
      for (const t of terminais) if (!conectado.has(t) && toca(t)) conectado.add(t);
    }
    if (falhou) naoTracadas.push(falhou);
  }
  return { tracado: { versao: 1, placa, redes: [...saida.values()] }, naoTracadas };
}

/* tira os pontos do meio de cada reta do trecho */
function comprimir(t) {
  const p = t.pontos; const saida = [p[0]];
  for (let k = 1; k + 1 < p.length; k += 1) {
    const a = saida.at(-1); const b = p[k]; const c = p[k + 1];
    const cruz = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(cruz) > 1e-9) saida.push(b);
  }
  saida.push(p.at(-1));
  return { ...t, pontos: saida };
}

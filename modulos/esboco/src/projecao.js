/* Sobreposição na projeção: o gate de contato mede colisão, folga e ligação em três
   dimensões, e a pessoa vê o que ele não mede: duas peças sem penetração alguma que, numa
   vista, parecem uma sobre a outra. Aqui cada forma visível vira uma silhueta numa grade de
   células (a mesma projeção e as mesmas faces que o desenho usa, com a forma inteira e não só a
   parte visível), e cada par tem a área em que as silhuetas se cobrem, a fração da menor
   silhueta que é coberta e quem fica na frente (profundidade média na região de cobertura).
   O achado `sobreposicao-na-projecao` é o par acima do limiar, sem penetração 3D acima da
   `penetracao` e que não é `atravessa`; ele diz a folga real e a vista em que o par não se cobre.
   A medida sai da geometria real: a `explosao` só afasta as formas no desenho. */
import { ErroDeEsboco, VISTAS, deslocarForma, explodir, fatiarForma, lerExplosao, origemDoDeslocamento, resolverOpcao } from './index.js';
import { herdarDoEspelho, lerContato, medirPar, padroesDoContato, pecasDe } from './contato.js';
import { expandirEsboco } from './expandir.js';

export const LIMIAR_PADRAO = 0.15;
/* Ruído do relato: pares com folga real abaixo disto (cubo e disco a 5 mm, por exemplo) e pares em que as duas
   formas são cópias de espelho não entram no relato, e só os MAXIMO_PADRAO grupos mais graves aparecem. Os achados
   completos continuam em `achados` e `porVista`. */
export const FOLGA_MINIMA_PADRAO = 10;
export const MAXIMO_PADRAO = 10;
export const TIPO_DO_ACHADO = 'sobreposicao-na-projecao';
/* Células no maior lado do desenho: equivale às células de 2 px que a grade do balão usa num painel de 620 px. */
const CELULAS_NO_LADO = 320;
const EIXOS = ['x', 'y', 'z'];
/* Folga 3D abaixo disto é contato: peças que se tocam se cobrem na projeção sem enganar ninguém. */
const CONTATO_MM = 1;

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalizar = (v) => { const n = Math.hypot(...v) || 1; return v.map((c) => c / n); };
const arred = (x) => Math.round(x * 10) / 10;
const arred3 = (x) => Math.round(x * 1000) / 1000;

/* Ajusta a profundidade de uma face plana como função afim da posição na tela. */
function profundidadeAfim(pts3, V, olho) {
  const s = pts3.map((p) => V.p(p));
  const d = pts3.map((p) => dot(p, olho));
  let ib = 0;
  let maior = -1;
  s.forEach((q, i) => { const t = Math.hypot(q[0] - s[0][0], q[1] - s[0][1]); if (t > maior) { maior = t; ib = i; } });
  let ic = 0;
  maior = -1;
  s.forEach((q, i) => { const t = Math.abs((s[ib][0] - s[0][0]) * (q[1] - s[0][1]) - (s[ib][1] - s[0][1]) * (q[0] - s[0][0])); if (t > maior) { maior = t; ic = i; } });
  const det = (s[ib][0] - s[0][0]) * (s[ic][1] - s[0][1]) - (s[ic][0] - s[0][0]) * (s[ib][1] - s[0][1]);
  if (Math.abs(det) < 1e-9) return null;
  const du1 = d[ib] - d[0];
  const du2 = d[ic] - d[0];
  const a = (du1 * (s[ic][1] - s[0][1]) - du2 * (s[ib][1] - s[0][1])) / det;
  const b = (du2 * (s[ib][0] - s[0][0]) - du1 * (s[ic][0] - s[0][0])) / det;
  return { a, b, c: d[0] - a * s[0][0] - b * s[0][1] };
}

/* Preenche as células cujo centro está dentro dos anéis (par-ímpar) com a profundidade da face. A grade da
   forma é só a caixa dela: as colunas I0..I0+W-1 e as linhas J0..J0+H-1 da grade global. */
function preencher(prof, I0, J0, W, H, u0, v0, cel, aneis, plano) {
  let vmin = Infinity;
  let vmax = -Infinity;
  for (const an of aneis) for (const q of an) { if (q[1] < vmin) vmin = q[1]; if (q[1] > vmax) vmax = q[1]; }
  const j0 = Math.max(J0, Math.ceil((vmin - v0) / cel - 0.5));
  const j1 = Math.min(J0 + H - 1, Math.floor((vmax - v0) / cel - 0.5));
  const xs = [];
  const pa = plano.a; const pb = plano.b; const pc = plano.c;
  for (let j = j0; j <= j1; j++) {
    const y = v0 + (j + 0.5) * cel;
    xs.length = 0;
    for (const an of aneis) {
      let p1 = an[an.length - 1];
      for (let k = 0; k < an.length; k++) {
        const p2 = an[k];
        /* a aresta de p1 a p2, na mesma ordem em que o anel foi escrito, a menos do ponto de partida: só a ordem dos
           cruzamentos muda, e eles são ordenados a seguir */
        if ((p1[1] <= y) !== (p2[1] <= y)) xs.push(p1[0] + ((y - p1[1]) * (p2[0] - p1[0])) / (p2[1] - p1[1]));
        p1 = p2;
      }
    }
    for (let a = 1; a < xs.length; a++) {
      const x = xs[a];
      let b = a - 1;
      while (b >= 0 && xs[b] > x) { xs[b + 1] = xs[b]; b--; }
      xs[b + 1] = x;
    }
    for (let m = 0; m + 1 < xs.length; m += 2) {
      const i0 = Math.max(I0, Math.ceil((xs[m] - u0) / cel - 0.5));
      const i1 = Math.min(I0 + W - 1, Math.floor((xs[m + 1] - u0) / cel - 0.5));
      const linha = (j - J0) * W - I0;
      for (let i = i0; i <= i1; i++) {
        const d = pa * (u0 + (i + 0.5) * cel) + pb * y + pc;
        if (d > prof[linha + i]) prof[linha + i] = d;
      }
    }
  }
}

/* Faces de uma forma numa vista (a mesma lista que o desenho usa). O fatiamento é a parte cara e só depende
   da forma original e da vista: as cópias deslocadas pela explosão reaproveitam as faces, somando o deslocamento
   aos pontos. */
const facesEmCache = new WeakMap();
function facesDaVista(r, vista, olho) {
  const origem = origemDoDeslocamento(r);
  const base = origem ? origem.base : r;
  let porVista = facesEmCache.get(base);
  if (!porVista) { porVista = new Map(); facesEmCache.set(base, porVista); }
  if (!porVista.has(vista)) porVista.set(vista, fatiarForma(base, olho, { semFatias: true }).flatMap((ch) => [...ch.lados, ...ch.dentro, ...ch.tampas]));
  const faces = porVista.get(vista);
  if (!origem || origem.delta.every((x) => x === 0)) return faces;
  const d = origem.delta;
  const mover = (pts) => pts.map((p) => [p[0] + d[0], p[1] + d[1], p[2] + d[2]]);
  return faces.map((f) => ({ ...f, pts: mover(f.pts), furos: f.furos ? f.furos.map(mover) : f.furos, furo: f.furo ? mover(f.furo) : f.furo }));
}

/* Silhueta de cada forma numa vista: as células que qualquer face dela cobre e, em cada uma,
   a profundidade da face mais próxima do observador. Devolve as áreas e os pares que se cobrem.
   Só as formas cuja caixa na tela cruza a de outra são preenchidas (duas silhuetas com caixas separadas
   não dividem célula alguma); com `areas: false` as outras ficam de fora e `areas` não vai no resultado. */
export function medirProjecaoDaOpcao(formas, vista, { areas: comAreas = true } = {}) {
  const V = VISTAS[vista];
  if (!V) throw new ErroDeEsboco(`vista desconhecida "${vista}" (válidas: ${Object.keys(VISTAS).join(', ')})`);
  const olho = normalizar(V.olho);
  const listas = formas.map((r) => facesDaVista(r, vista, olho).map((f) => {
    const furos = f.furos && f.furos.length > 0 ? f.furos : f.furo ? [f.furo] : [];
    return { pts: f.pts, aneis: [f.pts.map((p) => V.p(p)), ...furos.map((fu) => fu.map((p) => V.p(p)))] };
  }));
  let umin = Infinity; let umax = -Infinity; let vmin = Infinity; let vmax = -Infinity;
  const caixas = listas.map((fs) => {
    let a0 = Infinity; let a1 = -Infinity; let b0 = Infinity; let b1 = -Infinity;
    for (const f of fs) {
      for (const q of f.aneis[0]) {
        if (q[0] < umin) umin = q[0]; if (q[0] > umax) umax = q[0];
        if (q[1] < vmin) vmin = q[1]; if (q[1] > vmax) vmax = q[1];
      }
      for (const an of f.aneis) for (const q of an) {
        if (q[0] < a0) a0 = q[0]; if (q[0] > a1) a1 = q[0];
        if (q[1] < b0) b0 = q[1]; if (q[1] > b1) b1 = q[1];
      }
    }
    return { a0, a1, b0, b1 };
  });
  const cel = Math.max(umax - umin, vmax - vmin, 1) / CELULAS_NO_LADO;
  const W = Math.ceil((umax - umin) / cel) + 2;
  const H = Math.ceil((vmax - vmin) / cel) + 2;
  const u0 = umin - cel;
  const v0 = vmin - cel;
  const cruzam = (x, y) => x.a0 <= y.a1 && y.a0 <= x.a1 && x.b0 <= y.b1 && y.b0 <= x.b1;
  const precisa = formas.map(() => comAreas);
  if (!comAreas) {
    for (let a = 0; a < formas.length; a++) for (let b = a + 1; b < formas.length; b++) {
      if (!precisa[a] || !precisa[b]) if (cruzam(caixas[a], caixas[b])) { precisa[a] = true; precisa[b] = true; }
    }
  }
  const grades = formas.map((r, k) => {
    if (!precisa[k]) return null;
    const c = caixas[k];
    const I0 = Math.max(0, Math.floor((c.a0 - u0) / cel) - 1);
    const I1 = Math.min(W - 1, Math.ceil((c.a1 - u0) / cel) + 1);
    const J0 = Math.max(0, Math.floor((c.b0 - v0) / cel) - 1);
    const J1 = Math.min(H - 1, Math.ceil((c.b1 - v0) / cel) + 1);
    if (!(I1 >= I0 && J1 >= J0)) return { I0: 0, J0: 0, w: 0, h: 0, prof: new Float64Array(0), n: 0 };
    const w = I1 - I0 + 1;
    const h = J1 - J0 + 1;
    const prof = new Float64Array(w * h).fill(-Infinity);
    for (const f of listas[k]) {
      const plano = profundidadeAfim(f.pts, V, olho);
      if (plano) preencher(prof, I0, J0, w, h, u0, v0, cel, f.aneis, plano);
    }
    let n = 0;
    for (let i = 0; i < prof.length; i++) if (prof[i] > -Infinity) n++;
    return { I0, J0, w, h, prof, n };
  });
  const pares = [];
  for (let a = 0; a < formas.length; a++) {
    if (!grades[a]) continue;
    for (let b = a + 1; b < formas.length; b++) {
      if (!grades[b]) continue;
      const A = grades[a]; const B = grades[b];
      const i0 = Math.max(A.I0, B.I0); const i1 = Math.min(A.I0 + A.w - 1, B.I0 + B.w - 1);
      const j0 = Math.max(A.J0, B.J0); const j1 = Math.min(A.J0 + A.h - 1, B.J0 + B.h - 1);
      let n = 0; let somaA = 0; let somaB = 0;
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const pa = A.prof[(j - A.J0) * A.w + (i - A.I0)];
          if (pa === -Infinity) continue;
          const pb = B.prof[(j - B.J0) * B.w + (i - B.I0)];
          if (pb === -Infinity) continue;
          n++; somaA += pa; somaB += pb;
        }
      }
      if (n === 0) continue;
      const frente = somaA >= somaB ? a : b;
      pares.push({
        a: formas[a].id, b: formas[b].id, celulas: n, area_mm2: n * cel * cel,
        fracao: n / Math.min(A.n, B.n),
        cobre: formas[frente].id, coberta: formas[frente === a ? b : a].id,
      });
    }
  }
  return { vista, celula_mm: cel, ...(comAreas ? { areas: Object.fromEntries(formas.map((r, k) => [r.id, grades[k].n * cel * cel])) } : {}), pares };
}

const numFracao = (v, onde) => {
  if (v === undefined) return undefined;
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0 || v > 1) throw new ErroDeEsboco(`${onde}: "contato.projecao.limiar" deve ser uma fração maior que 0 e no máximo 1, por exemplo 0.15`);
  return v;
};

function lerProjecao(p, onde) {
  if (p === undefined) return {};
  if (!p || typeof p !== 'object' || Array.isArray(p)) throw new ErroDeEsboco(`${onde}: "contato.projecao" deve ser um objeto { limiar, reprova, folgaMinima, maximo }`);
  if (p.reprova !== undefined && typeof p.reprova !== 'boolean') throw new ErroDeEsboco(`${onde}: "contato.projecao.reprova" deve ser true ou false`);
  if (p.folgaMinima !== undefined && (typeof p.folgaMinima !== 'number' || !Number.isFinite(p.folgaMinima) || p.folgaMinima < 0)) throw new ErroDeEsboco(`${onde}: "contato.projecao.folgaMinima" deve ser uma folga em mm, maior ou igual a 0, por exemplo ${FOLGA_MINIMA_PADRAO}`);
  if (p.maximo !== undefined && (!Number.isInteger(p.maximo) || p.maximo < 1)) throw new ErroDeEsboco(`${onde}: "contato.projecao.maximo" deve ser um inteiro de 1 ou mais, por exemplo ${MAXIMO_PADRAO}`);
  return { limiar: numFracao(p.limiar, onde), reprova: p.reprova, folgaMinima: p.folgaMinima, maximo: p.maximo };
}

const chave = (a, b) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);

/* Achados de uma opção sobre as formas dadas (exploradas ou não): [{ vista, par, fracao... }]. */
function achadosDaOpcao(ctx, formas) {
  const { cfg, medida3d } = ctx;
  const fracoes = new Map();
  const cruas = [];
  for (const vista of Object.keys(VISTAS)) {
    for (const p of medirProjecaoDaOpcao(formas, vista, { areas: false }).pares) {
      const k = chave(p.a, p.b);
      if (!fracoes.has(k)) fracoes.set(k, {});
      fracoes.get(k)[vista] = p.fracao;
      cruas.push({ vista, ...p });
    }
  }
  const saida = [];
  for (const p of cruas) {
    if (!(p.fracao > cfg.limiar)) continue;
    if (cfg.tipos.get(chave(p.a, p.b)) === 'atravessa') continue;
    const { folga, penetracao } = medida3d(p.a, p.b);
    if (penetracao > cfg.penetracao) continue;
    /* Em contato, a sobreposição é o contato; longe (além da espessura da mais fina das duas peças,
       ou da tolerância do gate se maior), a distância explica a sobreposição: nenhum dos dois engana. */
    const alcance = Math.max(cfg.tolerancia, Math.min(cfg.espessura(p.a), cfg.espessura(p.b)));
    if (folga < CONTATO_MM || folga > alcance) continue;
    const porVista = fracoes.get(chave(p.a, p.b));
    let alternativa = null;
    for (const v of Object.keys(VISTAS)) {
      const f = porVista[v] ?? 0;
      if (f <= cfg.limiar && (!alternativa || f < alternativa.fracao)) alternativa = { vista: v, fracao: arred3(f) };
    }
    saida.push({ p, folga, alternativa });
  }
  saida.total = cruas.reduce((t, p) => t + p.fracao, 0);
  return saida;
}

/* Relato de uma opção: os achados sem o ruído, agrupados por componente (a instância de `usa`, ou a própria forma),
   do grupo mais grave (a maior fração coberta) ao menos grave, e só os `maximo` primeiros, com o total omitido.
   Ignorados: os pares em que uma forma é o espelho da outra ou as duas são cópias de espelho (o achado do lado
   original já cobre o do lado copiado) e os de folga real abaixo de `folgaMinima`. */
export function relatarOpcao(titulo, achados, resolvidas, { folgaMinima = FOLGA_MINIMA_PADRAO, maximo = MAXIMO_PADRAO } = {}) {
  const forma = new Map(resolvidas.map((r) => [r.id, r.forma]));
  /* A cópia de espelho de uma instância não carrega `daInstancia`: a instância dela é o prefixo do id que sobra
     depois de tirar o nome local da parte, o mesmo da parte que ela espelha (`garfoD.perna` copia `garfoE.perna`). */
  const componente = (id) => {
    const f = forma.get(id);
    if (f?.daInstancia) return f.daInstancia.id;
    const fonte = f?.espelha ? forma.get(f.espelha.forma) : null;
    if (fonte?.daInstancia && typeof fonte.id === 'string' && fonte.id.startsWith(`${fonte.daInstancia.id}.`)) {
      const local = fonte.id.slice(fonte.daInstancia.id.length + 1);
      if (id.endsWith(`.${local}`)) return id.slice(0, -(local.length + 1));
    }
    return id;
  };
  const espelho = (id) => forma.get(id)?.espelha;
  const ehEspelhoDoPar = (a, b) => (espelho(a) && espelho(b)) || espelho(a)?.forma === b || espelho(b)?.forma === a;
  const ignorados = { espelho: 0, folga: 0 };
  const grupos = new Map();
  for (const a of achados) {
    const [x, y] = a.pecas;
    if (ehEspelhoDoPar(x, y)) { ignorados.espelho++; continue; }
    if (a.folga_mm < folgaMinima) { ignorados.folga++; continue; }
    const [ca, cb] = [componente(x), componente(y)].sort();
    const k = `${ca}\u0000${cb}`;
    if (!grupos.has(k)) grupos.set(k, { componentes: [ca, cb], achados: 0, vistas: [], pior: null });
    const g = grupos.get(k);
    g.achados++;
    if (!g.vistas.includes(a.vista)) g.vistas.push(a.vista);
    if (!g.pior || a.fracao > g.pior.fracao || (a.fracao === g.pior.fracao && a.area_mm2 > g.pior.area_mm2)) g.pior = a;
  }
  const ordenados = [...grupos.values()].sort((p, q) => q.pior.fracao - p.pior.fracao || q.pior.area_mm2 - p.pior.area_mm2 || (p.componentes.join() < q.componentes.join() ? -1 : 1));
  const mostrados = ordenados.slice(0, maximo);
  const omitidos = ordenados.slice(maximo);
  return {
    opcao: titulo, folgaMinima, maximo, total: achados.length, ignorados,
    grupos: mostrados, omitidos: { grupos: omitidos.length, achados: omitidos.reduce((t, g) => t + g.achados, 0) },
  };
}

/* Menor deslocamento, em mm, de uma das duas formas ao longo de um eixo do mundo (x, y ou z, nos dois sentidos)
   que zera a cobertura entre elas NA VISTA dada. Só informação: afastar peças contraria a montagem.
   Um deslocamento na direção do olho não muda a silhueta, e por isso o eixo é escolhido pela medida.
   Devolve null se nenhum eixo até a soma das diagonais das duas formas separa o par. */
export function deslocamentoQueZera(ra, rb, vista) {
  const diag = (r) => Math.hypot(r.max[0] - r.min[0], r.max[1] - r.min[1], r.max[2] - r.min[2]);
  const limite = diag(ra) + diag(rb);
  const mover = (r, k, t) => deslocarForma(r, [0, 1, 2].map((i) => (i === k ? t : 0)));
  const livre = (quem, k, t) => medirProjecaoDaOpcao(quem === 'a' ? [mover(ra, k, t), rb] : [ra, mover(rb, k, t)], vista, { areas: false }).pares.length === 0;
  let melhor = null;
  for (const quem of ['a', 'b']) for (let k = 0; k < 3; k++) for (const sinal of [1, -1]) {
    if (!livre(quem, k, sinal * limite)) continue;
    let lo = 0; let hi = limite;
    while (hi - lo > 0.25) { const m = (lo + hi) / 2; if (livre(quem, k, sinal * m)) hi = m; else lo = m; }
    let t = Math.ceil(hi * 10) / 10;
    while (!livre(quem, k, sinal * t) && t < limite) t = Math.round((t + 0.1) * 10) / 10;
    if (!melhor || t < melhor.mm - 1e-9) melhor = { forma: quem === 'a' ? ra.id : rb.id, eixo: EIXOS[k], mm: t, delta: [0, 1, 2].map((i) => (i === k ? sinal * t : 0)) };
  }
  if (!melhor) return null;
  const v = melhor.delta.map((c) => String(c).replace('.', ',')).join(' ');
  return { ...melhor, vista, aplicavel: false, texto: `mova ${melhor.forma} em [${v}] mm (zera a cobertura na vista ${vista}; só informação, afastar peças contraria a montagem)` };
}

/* Fatores que a sugestão experimenta, do mais discreto ao teto: de 1,2 em passos de 0,2 até 2,4, e 2,5. */
export const FATORES_DA_SUGESTAO = [1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4, 2.5];

/* Explosão sugerida: em cada eixo, o MENOR fator que zera os achados de projeção; entre os eixos que
   zeram, o de menor fator (empate: a menor sobreposição total nas quatro vistas). Se nenhum fator até o
   teto zera, vale o par eixo/fator com menos achados e, empatando, o de menor fator e, com o mesmo fator, o de menor soma das frações. */
function sugerirExplosao(ctx) {
  const { formas } = ctx;
  const extensao = (k) => Math.max(...formas.map((r) => r.max[k])) - Math.min(...formas.map((r) => r.min[k]));
  const ordem = [0, 1, 2].sort((x, y) => extensao(y) - extensao(x) || x - y);
  const menos = (a, b) => a.n !== b.n ? a.n < b.n : Math.abs(a.fator - b.fator) > 1e-9 ? a.fator < b.fator : a.total < b.total - 1e-9;
  let zera = null;
  let melhor = null;
  for (const k of ordem) {
    for (const fator of FATORES_DA_SUGESTAO) {
      const r = achadosDaOpcao(ctx, explodir(formas, { eixo: EIXOS[k], fator }));
      const c = { eixo: EIXOS[k], fator, n: r.length, total: r.total };
      if (c.n === 0) {
        if (!zera || c.fator < zera.fator - 1e-9 || (Math.abs(c.fator - zera.fator) < 1e-9 && c.total < zera.total - 1e-9)) zera = c;
        break;
      }
      if (!melhor || menos(c, melhor)) melhor = c;
    }
  }
  const e = zera ?? melhor;
  return { eixo: e.eixo, fator: e.fator };
}

/* Verifica a sobreposição na projeção de todas as opções. Devolve
   { usar, limiar, reprova, resultado, achados, porVista, explosao, opcoes, relatorio }.
   Só roda com `contato.usar` verdadeiro na opção, ou com `forcar` (a `--analise`); do
   contrário devolve `resultado: 'desligado'` sem medir. `contato.projecao` ({ limiar, reprova })
   pode ser declarado na raiz e na opção, que sobrepõe a raiz. Com `sugerir`, cada opção com
   achado e sem `explosao` declarada ganha em `explosao` o eixo que mais separa o que se cobre. */
export function verificarProjecao(bruto, { forcar = false, sugerir = false, deslocar = sugerir, resolvidas: prontas } = {}) {
  const esboco = expandirEsboco(bruto);
  const opcoes = Array.isArray(esboco?.opcoes) ? esboco.opcoes : [];
  const raiz = lerContato(esboco?.contato, 'esboço');
  const lidas = opcoes.map((o, i) => lerContato(o.contato, `opção ${i + 1}`));
  const projRaiz = lerProjecao(esboco?.contato?.projecao, 'esboço');
  const projOpcao = opcoes.map((o, i) => lerProjecao(o.contato?.projecao, `opção ${i + 1}`));
  const ativa = (i) => forcar || (lidas[i]?.usar ?? raiz?.usar) === true;
  const desligado = { usar: false, limiar: null, reprova: false, resultado: 'desligado', achados: [], porVista: {}, explosao: [], opcoes: [] };
  if (!opcoes.some((_, i) => ativa(i))) return desligado;

  const resolvidas = prontas ?? opcoes.map((o, i) => resolverOpcao(o, `opção ${i + 1}${o.titulo ? ` (${o.titulo})` : ''}`, esboco?.pontos).filter((r) => r.forma.oculto !== true));
  const { padraoPen, padraoTol } = padroesDoContato(resolvidas);
  const limiarRaiz = projRaiz.limiar ?? LIMIAR_PADRAO;
  const reprovaRaiz = projRaiz.reprova === true;
  const achados = [];
  const porVista = Object.fromEntries(Object.keys(VISTAS).map((v) => [v, []]));
  const explosao = [];
  const relatorio = [];
  const resumo = [];
  let reprovado = false;
  opcoes.forEach((o, i) => {
    const titulo = o.titulo ?? `Opção ${i + 1}`;
    if (!ativa(i)) { resumo.push({ opcao: titulo, usar: false, resultado: 'desligado' }); return; }
    const tipos = new Map();
    for (const p of herdarDoEspelho([...(raiz?.pares ?? []), ...(lidas[i]?.pares ?? [])], o)) tipos.set(chave(p.a, p.b), p.tipo);
    const rs = resolvidas[i];
    const pecas = new Map();
    const memo = new Map();
    const medida3d = (a, b) => {
      const k = chave(a, b);
      if (!memo.has(k)) {
        const de = (id) => { if (!pecas.has(id)) pecas.set(id, pecasDe(rs.find((r) => r.id === id))); return pecas.get(id); };
        memo.set(k, medirPar(de(a), de(b)));
      }
      return memo.get(k);
    };
    const espessura = (id) => { const r = rs.find((x) => x.id === id); return Math.min(...[0, 1, 2].map((k) => r.max[k] - r.min[k])); };
    const cfg = { limiar: projOpcao[i].limiar ?? limiarRaiz, reprova: projOpcao[i].reprova ?? reprovaRaiz, folgaMinima: projOpcao[i].folgaMinima ?? projRaiz.folgaMinima ?? FOLGA_MINIMA_PADRAO, maximo: projOpcao[i].maximo ?? projRaiz.maximo ?? MAXIMO_PADRAO, penetracao: lidas[i]?.penetracao ?? raiz?.penetracao ?? padraoPen, tolerancia: lidas[i]?.tolerancia ?? raiz?.tolerancia ?? padraoTol, espessura, tipos };
    const ctx = { cfg, medida3d, formas: rs };
    const doOpcao = achadosDaOpcao(ctx, rs).map(({ p, folga, alternativa }) => ({
      opcao: titulo, tipo: TIPO_DO_ACHADO, vista: p.vista, pecas: [p.a, p.b], cobre: p.cobre, coberta: p.coberta,
      fracao: arred3(p.fracao), area_mm2: arred(p.area_mm2), folga_mm: arred(folga), alternativa,
      ...(deslocar ? { sugestao: deslocamentoQueZera(rs.find((r) => r.id === p.a), rs.find((r) => r.id === p.b), p.vista) } : {}),
    }));
    const ordemDeVista = Object.keys(VISTAS);
    doOpcao.sort((x, y) => ordemDeVista.indexOf(x.vista) - ordemDeVista.indexOf(y.vista) || y.fracao - x.fracao);
    for (const a of doOpcao) { achados.push(a); porVista[a.vista].push(a); }
    relatorio.push(relatarOpcao(titulo, doOpcao, rs, cfg));
    if (cfg.reprova && doOpcao.length) reprovado = true;
    const declarada = lerExplosao(o.explosao, `opção ${i + 1}`) ?? lerExplosao(esboco.explosao, 'esboço');
    const escolhida = declarada ?? (sugerir && doOpcao.length ? sugerirExplosao(ctx) : null);
    if (escolhida) {
      /* medida, e não olho: quantos achados sobram na geometria afastada */
      const depois = achadosDaOpcao(ctx, explodir(rs, escolhida)).length;
      explosao.push({ opcao: titulo, indice: i, ...escolhida, origem: declarada ? 'declarada' : 'sugerida', achados_antes: doOpcao.length, achados_depois: depois, converge: depois === 0 });
    }
    resumo.push({ opcao: titulo, usar: true, limiar: cfg.limiar, reprova: cfg.reprova, resultado: doOpcao.length ? (cfg.reprova ? 'reprovado' : 'aviso') : 'aprovado' });
  });
  return {
    usar: true, limiar: limiarRaiz, reprova: reprovaRaiz, resultado: reprovado ? 'reprovado' : achados.length ? 'aviso' : 'aprovado',
    achados, porVista, explosao, opcoes: resumo, relatorio,
  };
}

const mm = (x) => x.toFixed(1).replace('.', ',');
const pct = (f) => Math.round(f * 100);

/* Linha legível de um achado de projeção. */
export function descreverProjecao(a) {
  const alt = a.alternativa
    ? (a.alternativa.fracao === 0 ? `na vista ${a.alternativa.vista} elas não se cobrem` : `na vista ${a.alternativa.vista} elas se cobrem só em ${pct(a.alternativa.fracao)}%`)
    : 'nas quatro vistas elas se cobrem, e a vista explodida separa o par';
  return `[${a.opcao}] sobreposição na projeção: na vista ${a.vista}, ${a.cobre} cobre ${a.coberta} em ${pct(a.fracao)}% (a folga real entre elas é ${mm(a.folga_mm)} mm); ${alt}`;
}

/* Linha legível de um grupo do relato: o pior achado e, se há outros entre os mesmos componentes, quantos e em que vistas. */
export function descreverGrupoDaProjecao(g) {
  const [a, b] = g.componentes;
  const outros = g.achados - 1;
  const linha = descreverProjecao(g.pior);
  if (outros <= 0) return linha;
  return `${linha}\n    mais ${outros} ${outros === 1 ? 'achado' : 'achados'} ${a === b ? `dentro de ${a}` : `entre ${a} e ${b}`}, nas vistas ${g.vistas.join(', ')}`;
}

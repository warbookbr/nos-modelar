/* Sobreposição na projeção: o gate de contato mede colisão, folga e ligação em três
   dimensões, e a pessoa vê o que ele não mede: duas peças sem penetração alguma que, numa
   vista, parecem uma sobre a outra. Aqui cada forma visível vira uma silhueta numa grade de
   células (a mesma projeção e as mesmas faces que o desenho usa, com a forma inteira e não só a
   parte visível), e cada par tem a área em que as silhuetas se cobrem, a fração da menor
   silhueta que é coberta e quem fica na frente (profundidade média na região de cobertura).
   O achado `sobreposicao-na-projecao` é o par acima do limiar, sem penetração 3D acima da
   `penetracao` e que não é `atravessa`; ele diz a folga real e a vista em que o par não se cobre.
   A medida sai da geometria real: a `explosao` só afasta as formas no desenho. */
import { ErroDeEsboco, VISTAS, explodir, fatiarForma, lerExplosao, resolverOpcao } from './index.js';
import { lerContato, medirPar, padroesDoContato, pecasDe } from './contato.js';

export const LIMIAR_PADRAO = 0.15;
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

/* Preenche as células cujo centro está dentro dos anéis (par-ímpar) com a profundidade da face. */
function preencher(prof, W, H, u0, v0, cel, aneis, plano) {
  let vmin = Infinity;
  let vmax = -Infinity;
  for (const an of aneis) for (const q of an) { if (q[1] < vmin) vmin = q[1]; if (q[1] > vmax) vmax = q[1]; }
  const j0 = Math.max(0, Math.ceil((vmin - v0) / cel - 0.5));
  const j1 = Math.min(H - 1, Math.floor((vmax - v0) / cel - 0.5));
  const xs = [];
  for (let j = j0; j <= j1; j++) {
    const y = v0 + (j + 0.5) * cel;
    xs.length = 0;
    for (const an of aneis) {
      for (let k = 0; k < an.length; k++) {
        const p1 = an[k];
        const p2 = an[(k + 1) % an.length];
        if ((p1[1] <= y) !== (p2[1] <= y)) xs.push(p1[0] + ((y - p1[1]) * (p2[0] - p1[0])) / (p2[1] - p1[1]));
      }
    }
    xs.sort((p, q) => p - q);
    for (let m = 0; m + 1 < xs.length; m += 2) {
      const i0 = Math.max(0, Math.ceil((xs[m] - u0) / cel - 0.5));
      const i1 = Math.min(W - 1, Math.floor((xs[m + 1] - u0) / cel - 0.5));
      for (let i = i0; i <= i1; i++) {
        const d = plano.a * (u0 + (i + 0.5) * cel) + plano.b * y + plano.c;
        if (d > prof[j * W + i]) prof[j * W + i] = d;
      }
    }
  }
}

/* Silhueta de cada forma numa vista: as células que qualquer face dela cobre e, em cada uma,
   a profundidade da face mais próxima do observador. Devolve as áreas e os pares que se cobrem. */
export function medirProjecaoDaOpcao(formas, vista) {
  const V = VISTAS[vista];
  if (!V) throw new ErroDeEsboco(`vista desconhecida "${vista}" (válidas: ${Object.keys(VISTAS).join(', ')})`);
  const olho = normalizar(V.olho);
  const poligonos = formas.map((r) => fatiarForma(r, olho).flatMap((ch) => [...ch.lados, ...ch.dentro, ...ch.tampas]));
  let umin = Infinity; let umax = -Infinity; let vmin = Infinity; let vmax = -Infinity;
  for (const fs of poligonos) for (const f of fs) for (const p of f.pts) {
    const q = V.p(p);
    if (q[0] < umin) umin = q[0]; if (q[0] > umax) umax = q[0];
    if (q[1] < vmin) vmin = q[1]; if (q[1] > vmax) vmax = q[1];
  }
  const cel = Math.max(umax - umin, vmax - vmin, 1) / CELULAS_NO_LADO;
  const W = Math.ceil((umax - umin) / cel) + 2;
  const H = Math.ceil((vmax - vmin) / cel) + 2;
  const u0 = umin - cel;
  const v0 = vmin - cel;
  const grades = formas.map((r, k) => {
    const prof = new Float64Array(W * H).fill(-Infinity);
    for (const f of poligonos[k]) {
      const plano = profundidadeAfim(f.pts, V, olho);
      if (!plano) continue;
      const aneis = [f.pts.map((p) => V.p(p))];
      const furos = f.furos && f.furos.length > 0 ? f.furos : f.furo ? [f.furo] : [];
      for (const fu of furos) aneis.push(fu.map((p) => V.p(p)));
      preencher(prof, W, H, u0, v0, cel, aneis, plano);
    }
    const celulas = [];
    for (let i = 0; i < prof.length; i++) if (prof[i] > -Infinity) celulas.push(i);
    return { prof, celulas };
  });
  const pares = [];
  for (let a = 0; a < formas.length; a++) {
    for (let b = a + 1; b < formas.length; b++) {
      const [menor, outra] = grades[a].celulas.length <= grades[b].celulas.length ? [grades[a], grades[b]] : [grades[b], grades[a]];
      let n = 0; let somaA = 0; let somaB = 0;
      for (const k of menor.celulas) {
        if (outra.prof[k] === -Infinity) continue;
        n++; somaA += grades[a].prof[k]; somaB += grades[b].prof[k];
      }
      if (n === 0) continue;
      const frente = somaA >= somaB ? a : b;
      pares.push({
        a: formas[a].id, b: formas[b].id, celulas: n, area_mm2: n * cel * cel,
        fracao: n / Math.min(grades[a].celulas.length, grades[b].celulas.length),
        cobre: formas[frente].id, coberta: formas[frente === a ? b : a].id,
      });
    }
  }
  return { vista, celula_mm: cel, areas: Object.fromEntries(formas.map((r, k) => [r.id, grades[k].celulas.length * cel * cel])), pares };
}

const numFracao = (v, onde) => {
  if (v === undefined) return undefined;
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0 || v > 1) throw new ErroDeEsboco(`${onde}: "contato.projecao.limiar" deve ser uma fração maior que 0 e no máximo 1, por exemplo 0.15`);
  return v;
};

function lerProjecao(p, onde) {
  if (p === undefined) return {};
  if (!p || typeof p !== 'object' || Array.isArray(p)) throw new ErroDeEsboco(`${onde}: "contato.projecao" deve ser um objeto { limiar, reprova }`);
  if (p.reprova !== undefined && typeof p.reprova !== 'boolean') throw new ErroDeEsboco(`${onde}: "contato.projecao.reprova" deve ser true ou false`);
  return { limiar: numFracao(p.limiar, onde), reprova: p.reprova };
}

const chave = (a, b) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);

/* Achados de uma opção sobre as formas dadas (exploradas ou não): [{ vista, par, fracao... }]. */
function achadosDaOpcao(ctx, formas) {
  const { cfg, medida3d } = ctx;
  const fracoes = new Map();
  const cruas = [];
  for (const vista of Object.keys(VISTAS)) {
    for (const p of medirProjecaoDaOpcao(formas, vista).pares) {
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
   { usar, limiar, reprova, resultado, achados, porVista, explosao, opcoes }.
   Só roda com `contato.usar` verdadeiro na opção, ou com `forcar` (a `--analise`); do
   contrário devolve `resultado: 'desligado'` sem medir. `contato.projecao` ({ limiar, reprova })
   pode ser declarado na raiz e na opção, que sobrepõe a raiz. Com `sugerir`, cada opção com
   achado e sem `explosao` declarada ganha em `explosao` o eixo que mais separa o que se cobre. */
export function verificarProjecao(esboco, { forcar = false, sugerir = false, resolvidas: prontas } = {}) {
  const opcoes = Array.isArray(esboco?.opcoes) ? esboco.opcoes : [];
  const raiz = lerContato(esboco?.contato, 'esboço');
  const lidas = opcoes.map((o, i) => lerContato(o.contato, `opção ${i + 1}`));
  const projRaiz = lerProjecao(esboco?.contato?.projecao, 'esboço');
  const projOpcao = opcoes.map((o, i) => lerProjecao(o.contato?.projecao, `opção ${i + 1}`));
  const ativa = (i) => forcar || (lidas[i]?.usar ?? raiz?.usar) === true;
  const desligado = { usar: false, limiar: null, reprova: false, resultado: 'desligado', achados: [], porVista: {}, explosao: [], opcoes: [] };
  if (!opcoes.some((_, i) => ativa(i))) return desligado;

  const resolvidas = prontas ?? opcoes.map((o, i) => resolverOpcao(o, `opção ${i + 1}${o.titulo ? ` (${o.titulo})` : ''}`).filter((r) => r.forma.oculto !== true));
  const { padraoPen, padraoTol } = padroesDoContato(resolvidas);
  const limiarRaiz = projRaiz.limiar ?? LIMIAR_PADRAO;
  const reprovaRaiz = projRaiz.reprova === true;
  const achados = [];
  const porVista = Object.fromEntries(Object.keys(VISTAS).map((v) => [v, []]));
  const explosao = [];
  const resumo = [];
  let reprovado = false;
  opcoes.forEach((o, i) => {
    const titulo = o.titulo ?? `Opção ${i + 1}`;
    if (!ativa(i)) { resumo.push({ opcao: titulo, usar: false, resultado: 'desligado' }); return; }
    const tipos = new Map();
    for (const p of [...(raiz?.pares ?? []), ...(lidas[i]?.pares ?? [])]) tipos.set(chave(p.a, p.b), p.tipo);
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
    const cfg = { limiar: projOpcao[i].limiar ?? limiarRaiz, reprova: projOpcao[i].reprova ?? reprovaRaiz, penetracao: lidas[i]?.penetracao ?? raiz?.penetracao ?? padraoPen, tolerancia: lidas[i]?.tolerancia ?? raiz?.tolerancia ?? padraoTol, espessura, tipos };
    const ctx = { cfg, medida3d, formas: rs };
    const doOpcao = achadosDaOpcao(ctx, rs).map(({ p, folga, alternativa }) => ({
      opcao: titulo, tipo: TIPO_DO_ACHADO, vista: p.vista, pecas: [p.a, p.b], cobre: p.cobre, coberta: p.coberta,
      fracao: arred3(p.fracao), area_mm2: arred(p.area_mm2), folga_mm: arred(folga), alternativa,
    }));
    const ordemDeVista = Object.keys(VISTAS);
    doOpcao.sort((x, y) => ordemDeVista.indexOf(x.vista) - ordemDeVista.indexOf(y.vista) || y.fracao - x.fracao);
    for (const a of doOpcao) { achados.push(a); porVista[a.vista].push(a); }
    if (cfg.reprova && doOpcao.length) reprovado = true;
    const declarada = lerExplosao(o.explosao, `opção ${i + 1}`) ?? lerExplosao(esboco.explosao, 'esboço');
    const escolhida = declarada ?? (sugerir && doOpcao.length ? sugerirExplosao(ctx) : null);
    if (escolhida) {
      /* medida, e não olho: quantos achados sobram na geometria afastada */
      const depois = achadosDaOpcao(ctx, explodir(rs, escolhida)).length;
      explosao.push({ opcao: titulo, indice: i, ...escolhida, origem: declarada ? 'declarada' : 'sugerida', achados_antes: doOpcao.length, achados_depois: depois });
    }
    resumo.push({ opcao: titulo, usar: true, limiar: cfg.limiar, reprova: cfg.reprova, resultado: doOpcao.length ? (cfg.reprova ? 'reprovado' : 'aviso') : 'aprovado' });
  });
  return {
    usar: true, limiar: limiarRaiz, reprova: reprovaRaiz, resultado: reprovado ? 'reprovado' : achados.length ? 'aviso' : 'aprovado',
    achados, porVista, explosao, opcoes: resumo,
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

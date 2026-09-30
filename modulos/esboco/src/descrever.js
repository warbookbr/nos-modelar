/* Leitura do esboço em texto: cada forma resolvida, as âncoras, o grafo de contatos 3D,
   as formas soltas e as sobreposições (3D e por vista), sem desenhar nada. Também calcula a
   diferença entre duas leituras (`--descrever --mudou`). Puro: não lê nem grava arquivo. */
import { ancorasDe, relacaoDe, resolverOpcao } from './index.js';
import { lerContato, medirPar, paresImplicitos, padroesDoContato, pecasDe, verificarContato, descreverAchado } from './contato.js';
import { verificarProjecao } from './projecao.js';

const EIXOS = ['x', 'y', 'z'];
const r2 = (x) => Math.round(x * 100) / 100;
const vec = (v) => v.map(r2);
const chave = (a, b) => `${a}|${b}`;
const chaveSimetrica = (a, b) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);

/* Limite abaixo do qual um movimento não é mudança (mm). */
export const RUIDO_MM = 0.05;

function eixoDe(r) {
  const t = r.forma.tipo;
  if (t === 'caixa') return null;
  return r.forma.eixo ?? 'y';
}

function descreverForma(r) {
  const extensao = r.max.map((v, i) => v - r.min[i]);
  return {
    id: r.id,
    tipo: r.forma.tipo,
    centro: vec(r.centro),
    extensao: vec(extensao),
    ...(eixoDe(r) ? { eixo: eixoDe(r) } : {}),
    ...(r.forma.rotacao !== undefined ? { rotacao: r.forma.rotacao } : {}),
    ...(relacaoDe(r.forma) ? { relacao: relacaoDe(r.forma) } : {}),
    caixa: { x: [r2(r.min[0]), r2(r.max[0])], y: [r2(r.min[1]), r2(r.max[1])], z: [r2(r.min[2]), r2(r.max[2])] },
    ancoras: Object.fromEntries(Object.entries(ancorasDe(r)).map(([k, v]) => [k, vec(v)])),
  };
}

/* { opcoes, ... } a partir do JSON já lido. */
export function descreverEsboco(esboco) {
  const opcoes = Array.isArray(esboco?.opcoes) ? esboco.opcoes : [];
  const raiz = lerContato(esboco?.contato, 'esboço');
  const lidas = opcoes.map((o, i) => lerContato(o.contato, `opção ${i + 1}`));
  const ativa = (i) => (lidas[i]?.usar ?? raiz?.usar) === true;
  const todas = opcoes.map((o, i) => resolverOpcao(o, `opção ${i + 1}${o.titulo ? ` (${o.titulo})` : ''}`, esboco?.pontos));
  const visiveis = todas.map((rs) => rs.filter((r) => r.forma.oculto !== true));
  const gate = opcoes.some((_, i) => ativa(i)) ? verificarContato(esboco, { resolvidas: visiveis }) : null;
  const projecao = verificarProjecao(esboco, { forcar: true, resolvidas: visiveis });
  const padrao = padroesDoContato(visiveis);
  const resultado = opcoes.map((o, i) => {
    const titulo = o.titulo ?? `Opção ${i + 1}`;
    const rs = visiveis[i];
    const declarado = ativa(i);
    const tol = lidas[i]?.tolerancia ?? raiz?.tolerancia ?? padrao.padraoTol;
    const penMax = lidas[i]?.penetracao ?? raiz?.penetracao ?? padrao.padraoPen;
    const tipos = new Map();
    for (const p of [...paresImplicitos(o, tol), ...(raiz?.pares ?? []), ...(lidas[i]?.pares ?? [])]) tipos.set(chaveSimetrica(p.a, p.b), p.tipo);
    const pecas = rs.map(pecasDe);
    const n = rs.length;
    const contatos = [];
    const sobreposicoes3d = [];
    const ligados = Array.from({ length: n }, () => []);
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      const tipo = tipos.get(chaveSimetrica(rs[a].id, rs[b].id));
      if (tipo === 'livre') continue;
      const { folga, penetracao } = medirPar(pecas[a], pecas[b]);
      if (tipo === 'atravessa' || folga <= tol) { ligados[a].push(b); ligados[b].push(a); }
      if (folga <= tol) {
        contatos.push({ a: rs[a].id, b: rs[b].id, ...(folga > 0 || penetracao < 0.05 ? { folga_mm: r2(folga) } : { penetracao_mm: r2(penetracao) }) });
      }
      if (penetracao > penMax) sobreposicoes3d.push({ a: rs[a].id, b: rs[b].id, penetracao_mm: r2(penetracao), ...(tipo === 'atravessa' ? { declarado: true } : {}) });
    }
    /* grupo principal: o maior, e no empate o que contém a primeira forma (a mesma regra do gate) */
    const grupo = Array(n).fill(-1); const grupos = [];
    for (let a = 0; a < n; a++) {
      if (grupo[a] >= 0) continue;
      const fila = [a]; grupo[a] = grupos.length; const membros = [];
      while (fila.length) { const x = fila.pop(); membros.push(x); for (const y of ligados[x]) if (grupo[y] < 0) { grupo[y] = grupos.length; fila.push(y); } }
      grupos.push(membros);
    }
    const principal = grupos.reduce((m, g) => (g.length > m.length ? g : m), grupos[0] ?? []);
    const soltas = rs.filter((_, a) => !principal.includes(a)).map((r) => r.id);
    const projecaoDaOpcao = projecao.achados.filter((a) => a.opcao === titulo).map((a) => ({
      vista: a.vista, a: a.pecas[0], b: a.pecas[1], fracao: a.fracao, cobre: a.cobre, folga_mm: a.folga_mm,
    }));
    return {
      titulo,
      gate: declarado
        ? { declarado: true, tolerancia_mm: r2(tol), penetracao_mm: r2(penMax) }
        : { declarado: false, tolerancia_mm: r2(tol), penetracao_mm: r2(penMax) },
      ocultas: todas[i].length - rs.length,
      formas: rs.map(descreverForma),
      contatos,
      soltas,
      sobreposicoes3d,
      projecao: projecaoDaOpcao,
      achadosDeContato: (gate?.achados ?? []).filter((a) => a.opcao === titulo).map(descreverAchado),
    };
  });
  return { opcoes: resultado };
}

const mm1 = (x) => (Math.round(x * 10) / 10).toString().replace('.', ',');
const vetor = (v) => `[${v.map(mm1).join(' ')}]`;
const faixa = (p) => `${mm1(p[0])}..${mm1(p[1])}`;

/* Texto compacto: uma linha por fato, na ordem de declaração. */
export function formatarDescricao(d) {
  const L = [];
  for (const [i, o] of d.opcoes.entries()) {
    L.push(`opção ${i + 1} (${o.titulo}): ${o.formas.length} formas${o.ocultas ? `, ${o.ocultas} ocultas (só referência)` : ''}`);
    L.push(o.gate.declarado
      ? `gate de contato declarado: tolerância ${mm1(o.gate.tolerancia_mm)} mm, penetração ${mm1(o.gate.penetracao_mm)} mm`
      : `sem gate declarado (padrões do gate: tolerância ${mm1(o.gate.tolerancia_mm)} mm, penetração ${mm1(o.gate.penetracao_mm)} mm)`);
    for (const f of o.formas) {
      L.push(`forma ${f.id}: ${f.tipo}, centro ${vetor(f.centro)}, extensão ${f.extensao.map(mm1).join('x')}${f.eixo ? `, eixo ${f.eixo}` : ''}${f.rotacao !== undefined ? `, rotação ${Array.isArray(f.rotacao) ? vetor(f.rotacao) : JSON.stringify(f.rotacao)}` : ''}${f.relacao ? `, relação: ${f.relacao}` : ''}, caixa x ${faixa(f.caixa.x)} y ${faixa(f.caixa.y)} z ${faixa(f.caixa.z)}`);
      L.push(`âncoras ${f.id}: ${Object.entries(f.ancoras).map(([k, v]) => `${k} ${vetor(v)}`).join('; ')}`);
    }
    for (const c of o.contatos) L.push(`contato: ${c.a} toca ${c.b} (${c.folga_mm !== undefined ? `folga ${mm1(c.folga_mm)} mm` : `penetração ${mm1(c.penetracao_mm)} mm`})`);
    for (const s of o.soltas) L.push(`solta: ${s} fora do maior grupo conectado`);
    for (const s of o.sobreposicoes3d) L.push(`sobreposição 3D: ${s.a} e ${s.b} se atravessam ${mm1(s.penetracao_mm)} mm${s.declarado ? ' (atravessa declarado)' : ''}`);
    for (const p of o.projecao) L.push(`sobreposição na vista ${p.vista}: ${p.cobre} cobre ${p.cobre === p.a ? p.b : p.a} em ${Math.round(p.fracao * 100)}% (par ${p.a} e ${p.b}, folga real ${mm1(p.folga_mm)} mm)`);
    for (const a of o.achadosDeContato) L.push(`achado de contato: ${a}`);
    if (o.contatos.length === 0 && o.formas.length > 1) L.push('nenhum contato entre as formas');
  }
  return `${L.join('\n')}\n`;
}

const deltaDe = (a, b) => b.map((v, i) => r2(v - a[i]));
const dist = (v) => Math.hypot(...v);

/* Diferença entre duas leituras, por opção (chave: o título; empate: o índice). */
export function diferenca(anterior, atual) {
  const linhas = [];
  const mudancas = [];
  const nota = (texto, tipo, extra = {}) => { linhas.push(texto); mudancas.push({ tipo, ...extra }); };
  const chaveOpcao = (d, i) => (d.opcoes.filter((o) => o.titulo === d.opcoes[i].titulo).length > 1 ? `${d.opcoes[i].titulo}#${i}` : d.opcoes[i].titulo);
  const antes = new Map(anterior.opcoes.map((o, i) => [chaveOpcao(anterior, i), o]));
  atual.opcoes.forEach((o, i) => {
    const k = chaveOpcao(atual, i);
    const p = antes.get(k);
    const rot = `[${o.titulo}]`;
    if (!p) { nota(`${rot} opção nova`, 'opcao-nova', { opcao: o.titulo }); return; }
    antes.delete(k);
    const fa = new Map(p.formas.map((f) => [f.id, f]));
    const fb = new Map(o.formas.map((f) => [f.id, f]));
    for (const f of o.formas) if (!fa.has(f.id)) nota(`${rot} forma nova: ${f.id} (${f.tipo}), centro ${vetor(f.centro)}`, 'forma-nova', { opcao: o.titulo, forma: f.id });
    for (const f of p.formas) if (!fb.has(f.id)) nota(`${rot} forma removida: ${f.id}`, 'forma-removida', { opcao: o.titulo, forma: f.id });
    for (const f of o.formas) {
      const q = fa.get(f.id);
      if (!q) continue;
      const d = deltaDe(q.centro, f.centro);
      if (dist(d) > RUIDO_MM) nota(`${rot} forma movida: ${f.id} de ${vetor(q.centro)} para ${vetor(f.centro)} (delta ${vetor(d)} mm)`, 'forma-movida', { opcao: o.titulo, forma: f.id, delta: d });
      const e = deltaDe(q.extensao, f.extensao);
      if (dist(e) > RUIDO_MM) nota(`${rot} forma redimensionada: ${f.id} de ${q.extensao.map(mm1).join('x')} para ${f.extensao.map(mm1).join('x')}`, 'forma-redimensionada', { opcao: o.titulo, forma: f.id });
    }
    const pares = (lista) => new Map(lista.map((c) => [chave(c.a, c.b), c]));
    const ca = pares(p.contatos); const cb = pares(o.contatos);
    for (const [kk, c] of cb) if (!ca.has(kk)) nota(`${rot} passou a tocar: ${c.a} e ${c.b} (${c.folga_mm !== undefined ? `folga ${mm1(c.folga_mm)} mm` : `penetração ${mm1(c.penetracao_mm)} mm`})`, 'contato-novo', { opcao: o.titulo, par: [c.a, c.b] });
    for (const [kk, c] of ca) if (!cb.has(kk)) nota(`${rot} deixou de tocar: ${c.a} e ${c.b}${fb.has(c.a) && fb.has(c.b) ? '' : ' (uma das formas saiu)'}`, 'contato-perdido', { opcao: o.titulo, par: [c.a, c.b] });
    for (const s of o.soltas) if (!p.soltas.includes(s)) nota(`${rot} ficou solta: ${s}`, 'solta-nova', { opcao: o.titulo, forma: s });
    for (const s of p.soltas) if (!o.soltas.includes(s)) nota(`${rot} deixou de ficar solta: ${s}${fb.has(s) ? '' : ' (removida)'}`, 'solta-resolvida', { opcao: o.titulo, forma: s });
    const conjunto = (tipo, lista, antesLista) => {
      const sa = new Set(antesLista); const sb = new Set(lista);
      for (const t of lista) if (!sa.has(t)) nota(`${rot} ${tipo} novo: ${t}`, `${tipo}-novo`, { opcao: o.titulo });
      for (const t of antesLista) if (!sb.has(t)) nota(`${rot} ${tipo} resolvido: ${t}`, `${tipo}-resolvido`, { opcao: o.titulo });
    };
    conjunto('achado de contato', o.achadosDeContato, p.achadosDeContato);
    const proj = (l) => l.map((q) => `na vista ${q.vista}, ${q.cobre} cobre ${q.cobre === q.a ? q.b : q.a}`);
    conjunto('achado de projeção', proj(o.projecao), proj(p.projecao));
    conjunto('sobreposição 3D', o.sobreposicoes3d.map((q) => `${q.a} e ${q.b}`), p.sobreposicoes3d.map((q) => `${q.a} e ${q.b}`));
  });
  for (const [, p] of antes) nota(`[${p.titulo}] opção removida`, 'opcao-removida', { opcao: p.titulo });
  return { linhas, mudancas };
}

/* O mapa de ligações de uma opção, em texto (`--ligacoes`): quem toca quem, em quantos pontos distintos, as pontas livres e as
   unidades presas a nada. Os pontos distintos seguem a regra do `plano.contrato.fixa` (os pontos de contato separados por mais
   de uma tolerância, agrupados em cadeia), menos a face: o `fixa` conta como plano (três pontos) a face que cobre a peça presa, e o mapa, que
   é simétrico e não tem peça presa, conta o local de cada par de peças. A ponta livre é o achado do gate de contato, que aqui vale mesmo com o contato
   desligado. Não desenha nem grava nada. Puro: recebe o JSON declarado e, opcionalmente, a lista de unidades do Condutor. */
import { ErroDeEsboco, resolverOpcao } from './index.js';
import { expandirEsboco } from './expandir.js';
import { achadosDePonta, agruparPontos, lerContato, padroesDoContato, pecasDe, pontosDeContato, unidadesDeclaradas } from './contato.js';
import { quisDizer } from './parecido.js';

const exigir = (cond, msg) => { if (!cond) throw new ErroDeEsboco(msg); };
const arred = (x) => Math.round(x * 10) / 10;
const n1 = (x) => String(arred(x)).replace('.', ',');
const vet = (p) => `[${p.map(n1).join(' ')}]`;
const pontos = (n) => `${n} ${n === 1 ? 'ponto' : 'pontos'}`;
const MAXIMO_DE_LOCAIS = 3;

const funcaoDeclarada = (bruto, id) => { const f = bruto?.unidades?.[id]?.funcao; return typeof f === 'string' && f.trim() ? f.trim() : null; };
const separacao = (a, b) => Math.max(...[0, 1, 2].map((i) => Math.max(a.min[i] - b.max[i], b.min[i] - a.max[i])));

/* { opcao, tolerancia, formas, unidades }: `formas` por id (a unidade, a ligação criada por `ligar`, as formas que ela toca com os
   pontos distintos e as pontas livres) e `unidades` com as unidades vizinhas, as pontas livres e `presa` (nenhuma outra
   unidade a toca). `unidades` (opcional) é a lista `{ id, membros }` do Condutor; sem ela cada instância de componente, ou
   forma solta, é uma unidade. A forma com `unidade` declarada fica na unidade que declara. */
export function mapaDeLigacoes(bruto, { unidades, opcao = 0, funcoes = {} } = {}) {
  const e = expandirEsboco(bruto);
  const opcoes = Array.isArray(e?.opcoes) ? e.opcoes : [];
  const o = opcoes[opcao];
  exigir(o && Array.isArray(o.formas), `ligações: a opção ${opcao + 1} não existe ou não tem formas`);
  const titulo = o.titulo ?? `Opção ${opcao + 1}`;
  const todas = opcoes.map((x, i) => (Array.isArray(x?.formas) ? resolverOpcao(x, `opção ${i + 1}`, e.pontos) : []));
  const visiveis = todas.map((rs) => rs.filter((r) => r.forma.oculto !== true));
  const rs = visiveis[opcao];
  const ocultas = todas[opcao].filter((r) => r.forma.oculto === true && r.forma.cortador !== true);
  const raiz = lerContato(e.contato, 'esboço');
  const daOpcao = lerContato(o.contato, `opção ${opcao + 1}`);
  const tol = daOpcao?.tolerancia ?? raiz?.tolerancia ?? padroesDoContato(visiveis).padraoTol;

  const planejada = new Map((unidades ?? []).flatMap((u) => u.membros.map((m) => [m, u.id])));
  for (const [id, u] of unidadesDeclaradas(o.formas)) planejada.set(id, u);
  const brutas = new Map(o.formas.filter((f) => f && typeof f.id === 'string').map((f) => [f.id, f]));
  const unidadeDe = (r) => planejada.get(r.id) ?? brutas.get(r.id)?.daInstancia?.id ?? r.id;

  const pecas = rs.map(pecasDe);
  const pares = [];
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
    if (separacao(rs[i], rs[j]) > tol) continue;
    const achados = pontosDeContato(pecas[i], pecas[j], tol).map((p) => p.ponto);
    if (achados.length > 0) pares.push({ a: rs[i].id, b: rs[j].id, pontos: achados });
  }
  const pontas = achadosDePonta({ titulo, rs, pecas, ocultas, tol }).map((a) => ({ forma: a.pecas[0], formas: a.pecas, tipo: a.tipo, ponta: a.ponta, ponto: a.ponto }));
  const dono = new Map(rs.map((r) => [r.id, unidadeDe(r)]));

  const formas = new Map(rs.map((r) => [r.id, { id: r.id, unidade: dono.get(r.id), ligacao: r.forma.daLigacao ?? null, toca: [], pontasLivres: pontas.filter((p) => p.formas.includes(r.id)) }]));
  for (const p of pares) {
    const grupos = agruparPontos(p.pontos, tol);
    formas.get(p.a).toca.push({ forma: p.b, unidade: dono.get(p.b), pontos: grupos.length, locais: grupos.map((g) => g.ponto.map(arred)) });
    formas.get(p.b).toca.push({ forma: p.a, unidade: dono.get(p.a), pontos: grupos.length, locais: grupos.map((g) => g.ponto.map(arred)) });
  }

  const ids = [...new Set(rs.map((r) => dono.get(r.id)))];
  const entre = new Map();
  for (const p of pares) {
    const ua = dono.get(p.a); const ub = dono.get(p.b);
    if (ua === ub) continue;
    const chave = [ua, ub].sort().join('\u0000');
    if (!entre.has(chave)) entre.set(chave, { unidades: [ua, ub].sort(), pontos: [], pares: [] });
    entre.get(chave).pontos.push(...p.pontos);
    entre.get(chave).pares.push({ a: p.a, b: p.b, ponto: agruparPontos(p.pontos, tol)[0].ponto.map(arred) });
  }
  const resultado = ids.map((id) => {
    const membros = rs.filter((r) => dono.get(r.id) === id).map((r) => r.id);
    const vizinhas = [];
    for (const x of entre.values()) {
      if (!x.unidades.includes(id)) continue;
      const outra = x.unidades.find((u) => u !== id);
      const aqui = x.pares.map((p) => (dono.get(p.a) === id ? { dela: p.a, daOutra: p.b, ponto: p.ponto } : { dela: p.b, daOutra: p.a, ponto: p.ponto }));
      vizinhas.push({ unidade: outra, pontos: agruparPontos(x.pontos, tol).length, locais: aqui });
    }
    vizinhas.sort((a, b) => a.unidade.localeCompare(b.unidade));
    return { id, membros, funcao: funcoes[id] ?? funcaoDeclarada(bruto, id), vizinhas, pontasLivres: pontas.filter((p) => p.formas.some((f) => membros.includes(f))), presa: ids.length > 1 && vizinhas.length === 0 };
  });
  return { opcao: titulo, tolerancia: tol, formas, unidades: resultado };
}

const LINHA_DE_PONTA = (p) => (p.tipo === 'ponta-livre' ? `${p.forma} (${p.ponta}) em ${vet(p.ponto)}` : `${p.formas.join(', ')} terminam no mesmo ponto ${vet(p.ponto)} sem coletor`);
const locais = (l, nomear) => { const mostra = l.slice(0, MAXIMO_DE_LOCAIS).map(nomear).join('; '); return l.length > MAXIMO_DE_LOCAIS ? `${mostra}; mais ${l.length - MAXIMO_DE_LOCAIS}` : mostra; };

/* O texto do mapa: todas as unidades, uma unidade (`unidade`) ou uma forma, ou a instância dela com todas as formas (`forma`). */
export function formatarLigacoes(mapa, { unidade = null, forma = null } = {}) {
  const L = [`ligações da opção "${mapa.opcao}" (pontos distintos: separados por mais de ${n1(mapa.tolerancia)} mm):`];
  if (forma !== null) {
    const ids = [...mapa.formas.keys()];
    const achadas = ids.filter((id) => id === forma);
    const dasInstancia = achadas.length > 0 ? achadas : ids.filter((id) => id.startsWith(`${forma}.`));
    exigir(dasInstancia.length > 0, `--ligacoes --forma: "${forma}" não é uma forma visível da opção${quisDizer(forma, ids)} (ids: ${ids.join(', ')})`);
    for (const id of dasInstancia) {
      const f = mapa.formas.get(id);
      L.push(`forma ${f.id} (unidade ${f.unidade})${f.ligacao ? `, ligação ${f.ligacao.tipo} de ${typeof f.ligacao.de === 'string' ? f.ligacao.de : vet(f.ligacao.de)} para ${typeof f.ligacao.para === 'string' ? f.ligacao.para : vet(f.ligacao.para)}` : ''}:`);
      if (f.toca.length === 0) L.push('  toca: nenhuma forma');
      for (const t of [...f.toca].sort((a, b) => a.forma.localeCompare(b.forma))) L.push(`  toca ${t.forma}${t.unidade === f.unidade ? '' : ` (unidade ${t.unidade})`}: ${pontos(t.pontos)} ${locais(t.locais, vet)}`);
      L.push(f.pontasLivres.length === 0 ? '  pontas livres: nenhuma' : `  pontas livres: ${f.pontasLivres.map(LINHA_DE_PONTA).join('; ')}`);
    }
    return `${L.join('\n')}\n`;
  }
  const escolhidas = unidade === null ? mapa.unidades : mapa.unidades.filter((u) => u.id === unidade);
  exigir(escolhidas.length > 0, `--ligacoes: a unidade "${unidade}" não existe na opção${quisDizer(String(unidade), mapa.unidades.map((u) => u.id))} (unidades: ${mapa.unidades.map((u) => u.id).join(', ')})`);
  for (const u of escolhidas) {
    L.push(`unidade ${u.id} (${u.membros.length} ${u.membros.length === 1 ? 'forma' : 'formas'}${u.funcao ? `; função: ${u.funcao}` : ''}):`);
    if (u.vizinhas.length === 0) L.push(`  presa a nada: ${mapa.unidades.length > 1 ? 'nenhuma outra unidade a toca' : 'é a única unidade da opção'}`);
    for (const v of u.vizinhas) L.push(`  toca ${v.unidade}: ${pontos(v.pontos)} (${locais(v.locais, (p) => `${p.dela} em ${p.daOutra} ${vet(p.ponto)}`)})`);
    L.push(u.pontasLivres.length === 0 ? '  pontas livres: nenhuma' : `  pontas livres: ${u.pontasLivres.map(LINHA_DE_PONTA).join('; ')}`);
  }
  if (unidade === null) {
    const presas = mapa.unidades.filter((u) => u.presa).map((u) => u.id);
    L.push(presas.length === 0 ? 'unidades presas a nada: nenhuma' : `unidades presas a nada: ${presas.join(', ')}`);
  }
  return `${L.join('\n')}\n`;
}

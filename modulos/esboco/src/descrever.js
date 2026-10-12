/* Leitura do esboço em texto: cada forma resolvida, as âncoras, o grafo de contatos 3D,
   as formas soltas e as sobreposições (3D e por vista), sem desenhar nada. Também calcula a
   diferença entre duas leituras (`--descrever --mudou`). Puro: não lê nem grava arquivo. */
import { ancorasDe, ErroDeEsboco, relacaoDe, resolverOpcao } from './index.js';
import { expandirEsboco } from './expandir.js';
import { completarPelasOcultas, contarGrupos, herdarDoEspelho, lerContato, medirPar, paresImplicitos, padroesDoContato, pecasDe, verificarContato, descreverAchado } from './contato.js';
import { verificarProjecao } from './projecao.js';
import { conferirPlano } from './plano.js';
import { quisDizer } from './parecido.js';
import { resumoDoRecorte } from './recorte.js';

const EIXOS = ['x', 'y', 'z'];
const r2 = (x) => Math.round(x * 100) / 100;
const vec = (v) => v.map(r2);
const chave = (a, b) => `${a}|${b}`;
const chaveSimetrica = (a, b) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);

/* Limite abaixo do qual um movimento não é mudança (mm). */
export const RUIDO_MM = 0.05;

function eixoDe(r) {
  const t = r.forma.tipo;
  if (t === 'caixa' || t === 'esfera' || t === 'tubo' || t === 'envolve') return null;
  return r.forma.eixo ?? 'y';
}

/* O que o recorte fez (`subtrai`): os moldes, o volume que sai e o que sobra, em cm3. Só a forma recortada leva o campo. */
function descreverRecorte(r) {
  const q = resumoDoRecorte(r);
  const cm3 = (mm3) => Math.round(mm3 / 100) / 10;
  return { cortadores: q.cortadores.map((c) => ({ id: c.id, ...(c.folga ? { folga_mm: r2(c.folga) } : {}), ...(c.profundidade !== undefined ? { profundidade_mm: r2(c.profundidade), lado: c.lado } : {}), retira_cm3: cm3(c.retiradoMm3) })), volume_cm3: cm3(q.volumeMm3), retira_cm3: cm3(q.retiradoMm3), pecas: q.pecas };
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
    ...(r.subtrai ? { recorte: descreverRecorte(r) } : {}),
    caixa: { x: [r2(r.min[0]), r2(r.max[0])], y: [r2(r.min[1]), r2(r.max[1])], z: [r2(r.min[2]), r2(r.max[2])] },
    ancoras: Object.fromEntries(Object.entries(ancorasDe(r)).map(([k, v]) => [k, vec(v)])),
  };
}

/* Gravidade das divergências, da mais grave para a menos: forma solta, atravessamento além do declarado, relação
   declarada que não se cumpre (par que devia encostar, contrato de contato), assimetria de espelho, medida do plano
   fora da tolerância e silhueta fora da referência. A ponta livre (ponta de tubo ou de haste que não encosta em nada, ou várias pontas no mesmo ponto sem coletor) vem logo depois do contrato. */
export const GRAVIDADES = { peca: 0, solto: 1, atravessa: 2, contrato: 3, ponta: 4, assimetria: 5, medida: 6, referencia: 7 };
const CLASSE_DO_ACHADO = { colisao: 'atravessa', 'atravessa-excedido': 'atravessa', longe: 'solto', voando: 'solto', 'par-nao-encosta': 'contrato', 'ponta-livre': 'ponta', 'pontas-sem-coletor': 'ponta', 'porta-fora': 'contrato' };
const CLASSE_DO_PLANO = { 'recorte-vazio': 'contrato', 'cortador-solto': 'contrato', 'medida-fora': 'medida', 'referencia-fora': 'referencia', 'peca-ausente': 'peca', 'contrato-toca': 'contrato', 'contrato-livre': 'contrato', 'contrato-fixa': 'contrato', assimetria: 'assimetria' };

/* { opcoes, ... } a partir do JSON já lido. */
export function descreverEsboco(bruto) {
  return medirEsboco(bruto).descricao;
}

/* A leitura e, junto dela, a lista numerada de divergências (`n` global, na ordem em que a leitura padrão as imprime:
   por opção, da mais grave para a menos). `projecao: false` pula a medida de sobreposição na vista, que não entra nas
   divergências (só a leitura completa a mostra). `unidades` (formaId -> unidade) é o Plano de detalhe do Condutor, que o gate usa para relaxar o `atravessa` dentro da
   mesma unidade. `medidasLidas` (por opção e por nome de medida) é a leitura de outra fonte que vale no lugar da medida sobre as formas do esboço (ver `conferirPlano`). Devolve { descricao, divergencias, plano }. */
export function medirEsboco(bruto, { projecao: comProjecao = true, referencias, unidades, medidasLidas } = {}) {
  const esboco = expandirEsboco(bruto);
  const opcoes = Array.isArray(esboco?.opcoes) ? esboco.opcoes : [];
  const raiz = lerContato(esboco?.contato, 'esboço');
  const lidas = opcoes.map((o, i) => lerContato(o.contato, `opção ${i + 1}`));
  const ativa = (i) => (lidas[i]?.usar ?? raiz?.usar) === true;
  const todas = opcoes.map((o, i) => resolverOpcao(o, `opção ${i + 1}${o.titulo ? ` (${o.titulo})` : ''}`, esboco?.pontos));
  const visiveis = todas.map((rs) => rs.filter((r) => r.forma.oculto !== true));
  const gate = opcoes.some((_, i) => ativa(i)) ? verificarContato(esboco, { resolvidas: visiveis, ocultas: todas.map((rs) => rs.filter((r) => r.forma.oculto === true && r.forma.cortador !== true)), unidades }) : null;
  const projecao = comProjecao ? verificarProjecao(esboco, { forcar: true, resolvidas: visiveis }) : { achados: [] };
  const plano = conferirPlano(esboco, visiveis, { referencias, unidades, medidasLidas });
  const padrao = padroesDoContato(visiveis);
  const divergencias = [];
  const resultado = opcoes.map((o, i) => {
    const titulo = o.titulo ?? `Opção ${i + 1}`;
    const rs = visiveis[i];
    const declarado = ativa(i);
    const tol = lidas[i]?.tolerancia ?? raiz?.tolerancia ?? padrao.padraoTol;
    const penMax = lidas[i]?.penetracao ?? raiz?.penetracao ?? padrao.padraoPen;
    const tipos = new Map();
    for (const p of herdarDoEspelho([...paresImplicitos(o, tol), ...(raiz?.pares ?? []), ...(lidas[i]?.pares ?? [])], o)) tipos.set(chaveSimetrica(p.a, p.b), p.tipo);
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
    /* a unidade isolada (as outras formas ocultas) julga a conectividade com o mestre inteiro, como o gate */
    const ocultasDaOpcao = todas[i].filter((r) => r.forma.oculto === true && r.forma.cortador !== true);
    if (ocultasDaOpcao.length > 0 && n > 1 && contarGrupos(ligados) > 1) {
      completarPelasOcultas({ visiveis: pecas, ocultas: ocultasDaOpcao.map(pecasDe), ligados, menorFolga: Array(n).fill(Infinity), tol, alcance: tol, declarado: (a, h) => tipos.get(chaveSimetrica(rs[a].id, ocultasDaOpcao[h].id)) === 'atravessa' });
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
    /* divergências: com o gate declarado vêm dos achados dele, e sem ele das soltas e das sobreposições não declaradas */
    const divs = [];
    const somar = (classe, texto, pecas, sugestao, extra = {}) => divs.push({ opcao: titulo, classe, gravidade: GRAVIDADES[classe], texto, pecas, ...(sugestao ? { sugestao } : {}), ...extra });
    if (declarado) {
      const doGate = (gate?.achados ?? []).filter((x) => x.opcao === titulo);
      const voando = new Set(doGate.filter((x) => x.tipo === 'voando').map((x) => x.pecas[0]));
      /* a peça que está fora do grupo conectado e também longe de tudo é uma divergência só */
      for (const a of doGate.filter((x) => !(x.tipo === 'longe' && voando.has(x.pecas[0])))) somar(CLASSE_DO_ACHADO[a.tipo], descreverAchado(a).slice(`[${a.opcao}] `.length).replace(/^[^:]+: /, ''), a.pecas, a.sugestao?.texto ?? null, { tipo: a.tipo, mm: a.mm });
    } else {
      for (const id of soltas) somar('solto', `${id} fora do maior grupo conectado`, [id], null, { tipo: 'solta' });
      for (const t of sobreposicoes3d) if (!t.declarado) somar('atravessa', `${t.a} e ${t.b} se atravessam ${mm1(t.penetracao_mm)} mm`, [t.a, t.b], null, { tipo: 'sobreposicao-3d', mm: t.penetracao_mm });
    }
    for (const a of plano.achados.filter((x) => x.opcao === titulo)) somar(CLASSE_DO_PLANO[a.tipo], a.texto, a.pecas, null, { tipo: a.tipo, mm: a.mm });
    divs.sort((x, y) => x.gravidade - y.gravidade);
    divergencias.push(...divs);
    const doPlano = divs.filter((x) => x.classe === 'medida' || x.tipo === 'contrato-toca' || x.tipo === 'contrato-livre' || x.tipo === 'contrato-fixa' || x.tipo === 'recorte-vazio' || x.tipo === 'cortador-solto' || x.tipo === 'assimetria' || x.tipo === 'referencia-fora' || x.tipo === 'peca-ausente');
    return {
      titulo,
      ...(o.parametros && Object.keys(o.parametros).length ? { parametros: o.parametros } : {}),
      gate: declarado
        ? { declarado: true, tolerancia_mm: r2(tol), penetracao_mm: r2(penMax) }
        : { declarado: false, tolerancia_mm: r2(tol), penetracao_mm: r2(penMax) },
      ocultas: todas[i].filter((r) => r.forma.oculto === true && r.forma.cortador !== true).length,
      ...(todas[i].some((r) => r.forma.cortador === true) ? { cortadores: todas[i].filter((r) => r.forma.cortador === true).length } : {}),
      formas: rs.map(descreverForma),
      contatos,
      soltas,
      sobreposicoes3d,
      projecao: projecaoDaOpcao,
      achadosDeContato: (gate?.achados ?? []).filter((a) => a.opcao === titulo).map(descreverAchado),
      sugestoesDeContato: (gate?.achados ?? []).filter((a) => a.opcao === titulo).map((a) => a.sugestao?.texto ?? null),
      ...(doPlano.length ? { divergenciasDoPlano: doPlano.map((x) => x.texto) } : {}),
    };
  });
  divergencias.forEach((d, k) => { d.n = k + 1; });
  return { descricao: { opcoes: resultado }, divergencias, plano };
}

const mm1 = (x) => (Math.round(x * 10) / 10).toString().replace('.', ',');
const vetor = (v) => `[${v.map(mm1).join(' ')}]`;
const faixa = (p) => `${mm1(p[0])}..${mm1(p[1])}`;

const textoDoRecorte = (q) => `subtrai ${q.cortadores.map((c) => `${c.id}${c.folga_mm ? ` (folga ${mm1(c.folga_mm)} mm)` : ''}${c.profundidade_mm ? ` (${mm1(c.profundidade_mm)} mm a partir de ${c.lado})` : ''}${c.retira_cm3 > 0 ? '' : ' (não toca a forma)'}`).join(', ')}; retira ${mm1(q.retira_cm3)} cm3 e sobram ${mm1(q.volume_cm3)} cm3 em ${q.pecas} peças convexas`;
const linhaDaForma = (f) => `forma ${f.id}: ${f.tipo}, centro ${vetor(f.centro)}, extensão ${f.extensao.map(mm1).join('x')}${f.eixo ? `, eixo ${f.eixo}` : ''}${f.rotacao !== undefined ? `, rotação ${Array.isArray(f.rotacao) ? vetor(f.rotacao) : JSON.stringify(f.rotacao)}` : ''}${f.relacao ? `, relação: ${f.relacao}` : ''}${f.recorte ? `, recorte: ${textoDoRecorte(f.recorte)}` : ''}, caixa x ${faixa(f.caixa.x)} y ${faixa(f.caixa.y)} z ${faixa(f.caixa.z)}`;
const linhaDeAncoras = (f) => `âncoras ${f.id}: ${Object.entries(f.ancoras).map(([k, v]) => `${k} ${vetor(v)}`).join('; ')}`;
const linhaDeContato = (c) => `contato: ${c.a} toca ${c.b} (${c.folga_mm !== undefined ? `folga ${mm1(c.folga_mm)} mm` : `penetração ${mm1(c.penetracao_mm)} mm`})`;
const linhaDeSobreposicao3d = (s) => `sobreposição 3D: ${s.a} e ${s.b} se atravessam ${mm1(s.penetracao_mm)} mm${s.declarado ? ' (atravessa declarado)' : ''}`;
const linhaDeProjecao = (p) => `sobreposição na vista ${p.vista}: ${p.cobre} cobre ${p.cobre === p.a ? p.b : p.a} em ${Math.round(p.fracao * 100)}% (par ${p.a} e ${p.b}, folga real ${mm1(p.folga_mm)} mm)`;

/* Texto compacto: uma linha por fato, na ordem de declaração. */
export function formatarDescricao(d) {
  const L = [];
  for (const [i, o] of d.opcoes.entries()) {
    L.push(`opção ${i + 1} (${o.titulo}): ${o.formas.length} formas${o.ocultas ? `, ${o.ocultas} ocultas (só referência)` : ''}${o.cortadores ? `, ${o.cortadores} ${o.cortadores === 1 ? 'cortador' : 'cortadores'} (molde de recorte)` : ''}`);
    if (o.parametros) L.push(`parâmetros: ${Object.entries(o.parametros).map(([k, v]) => `${k} ${mm1(v)}`).join('; ')}`);
    L.push(linhaDoGate(o));
    for (const f of o.formas) {
      L.push(linhaDaForma(f));
      L.push(linhaDeAncoras(f));
    }
    for (const c of o.contatos) L.push(linhaDeContato(c));
    for (const s of o.soltas) L.push(`solta: ${s} fora do maior grupo conectado`);
    for (const s of o.sobreposicoes3d) L.push(linhaDeSobreposicao3d(s));
    for (const p of o.projecao) L.push(linhaDeProjecao(p));
    for (const [k, a] of o.achadosDeContato.entries()) L.push(`achado de contato: ${a}${o.sugestoesDeContato?.[k] ? `; sugestão: ${o.sugestoesDeContato[k]}` : ''}`);
    for (const t of o.divergenciasDoPlano ?? []) L.push(`divergência do plano: ${t}`);
    if (o.contatos.length === 0 && o.formas.length > 1) L.push('nenhum contato entre as formas');
  }
  return `${L.join('\n')}\n`;
}

const linhaDoGate = (o) => (o.gate.declarado
  ? `gate de contato declarado: tolerância ${mm1(o.gate.tolerancia_mm)} mm, penetração ${mm1(o.gate.penetracao_mm)} mm`
  : `sem gate declarado (padrões do gate: tolerância ${mm1(o.gate.tolerancia_mm)} mm, penetração ${mm1(o.gate.penetracao_mm)} mm)`);

/* Leitura padrão: por opção só o total de formas, os parâmetros e as divergências em ordem de gravidade, cada uma com o
   número que `--achado <n>` desenha. O detalhe de cada forma (âncoras, caixas, vizinhos) sai com `--forma <id>` e a
   leitura completa com `--completo`. */
export function formatarResumo(d, divergencias) {
  const L = [];
  for (const [i, o] of d.opcoes.entries()) {
    L.push(`opção ${i + 1} (${o.titulo}): ${o.formas.length} formas${o.ocultas ? `, ${o.ocultas} ocultas (só referência)` : ''}${o.cortadores ? `, ${o.cortadores} ${o.cortadores === 1 ? 'cortador' : 'cortadores'} (molde de recorte)` : ''}`);
    if (o.parametros) L.push(`parâmetros: ${Object.entries(o.parametros).map(([k, v]) => `${k} ${mm1(v)}`).join('; ')}`);
    L.push(linhaDoGate(o));
    const meus = divergencias.filter((x) => x.opcao === o.titulo);
    if (meus.length === 0) { L.push('divergências: nenhuma'); continue; }
    L.push(`divergências (${meus.length}, da mais grave para a menos):`);
    for (const x of meus) L.push(`  [${x.n}] ${x.classe}: ${x.texto}${x.sugestao ? `; sugestão: ${x.sugestao}` : ''}`);
  }
  L.push('detalhe de uma forma: --forma <id>; imagem de uma divergência: --achado <n>; leitura completa: --completo');
  return `${L.join('\n')}\n`;
}

const casaPadrao = (padrao, id) => new RegExp(`^${padrao.split('*').map((t) => t.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`).test(id);

/* Leitura de uma forma (ou de um padrão como `garfoE.*`) em cada opção: a linha dela, as âncoras, a caixa, os vizinhos
   (contatos), as sobreposições e as divergências que a citam. Um id que não existe é recusado com os ids válidos. */
export function formatarForma(d, divergencias, id) {
  const ids = [...new Set(d.opcoes.flatMap((o) => o.formas.map((f) => f.id)))];
  const alvo = (x) => (id.includes('*') ? casaPadrao(id, x) : x === id);
  if (!ids.some(alvo)) throw new ErroDeEsboco(`--forma: "${id}" não é uma forma do esboço${quisDizer(id, ids)} (ids: ${ids.join(', ')})`);
  const L = [];
  for (const [i, o] of d.opcoes.entries()) {
    const achadas = o.formas.filter((f) => alvo(f.id));
    if (achadas.length === 0) continue;
    L.push(`opção ${i + 1} (${o.titulo}):`);
    for (const f of achadas) {
      L.push(linhaDaForma(f));
      L.push(linhaDeAncoras(f));
      for (const c of o.contatos) if (c.a === f.id || c.b === f.id) L.push(linhaDeContato(c));
      if (o.soltas.includes(f.id)) L.push(`solta: ${f.id} fora do maior grupo conectado`);
      for (const s of o.sobreposicoes3d) if (s.a === f.id || s.b === f.id) L.push(linhaDeSobreposicao3d(s));
      for (const p of o.projecao) if (p.a === f.id || p.b === f.id) L.push(linhaDeProjecao(p));
      for (const x of divergencias.filter((q) => q.opcao === o.titulo && q.pecas.includes(f.id))) L.push(`divergência [${x.n}] ${x.classe}: ${x.texto}`);
    }
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
    const pa = p.parametros ?? {}; const pb = o.parametros ?? {};
    for (const k of new Set([...Object.keys(pa), ...Object.keys(pb)])) {
      if (pa[k] === pb[k]) continue;
      nota(`${rot} parâmetro ${pa[k] === undefined ? 'novo' : pb[k] === undefined ? 'removido' : 'alterado'}: ${k}${pa[k] === undefined ? '' : ` de ${mm1(pa[k])}`}${pb[k] === undefined ? '' : ` para ${mm1(pb[k])}`}`, 'parametro', { opcao: o.titulo, parametro: k });
    }
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

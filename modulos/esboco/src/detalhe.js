/* Detalhar e integrar uma Unidade de detalhe: `detalharUnidade` devolve um esboço isolado da unidade (as entradas das outras
   unidades com `oculto: true`, o plano mínimo), e `integrarUnidade` troca no mestre as entradas da unidade pelas do esboço
   detalhado, mantendo parâmetros, pontos, juntas e pares que continuam valendo e removendo os que citam formas que saíram.
   O mestre e o detalhado são JSON bruto (com instâncias, espelhos, arranjos e parâmetros, como a pessoa os escreveu). Puro:
   não lê nem grava arquivo, e não muda o que recebe. */
import { ErroDeEsboco, resolverOpcao } from './index.js';
import { expandirArranjos, expandirEsboco, numerosDaForma, resolvedor } from './expandir.js';
import { lerContato, padroesDoContato } from './contato.js';
import { conferirEnvelope, montarUnidadesDoEstado, planoDeDetalhe, registrarEnvelope, sincronizarAvisoDeCiclo, unidadePorNome, abreviar } from './condutor.js';
import { quisDizer } from './parecido.js';
import { mapaDeLigacoes } from './mapa-de-ligacoes.js';

const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);
const clone = (v) => JSON.parse(JSON.stringify(v));
const exigir = (cond, msg) => { if (!cond) throw new ErroDeEsboco(msg); };
export const COR_DO_VIZINHO = '#c9ced6';
export const OPACIDADE_DO_VIZINHO = 0.4;
const PLANO_MINIMO = (unidade) => ({ texto: `detalhe da unidade ${unidade}`, nivel: 'esquematico' });

/* A lista de formas do mestre que vale para a primeira opção: a da opção, ou a da raiz. */
function listaDoMestre(bruto) {
  const opcao = bruto?.opcoes?.[0];
  if (objeto(opcao) && Array.isArray(opcao.formas)) return { lista: opcao.formas, onde: 'opcao' };
  exigir(Array.isArray(bruto?.formas), 'o esboço não tem lista de formas (nem na raiz nem na primeira opção)');
  return { lista: bruto.formas, onde: 'raiz' };
}

/* As cópias que uma entrada `{ arranja }` bruta gera, com os números (parâmetros e "=expressão" do `total`, do `passo`, do
   `centro` e dos `graus`) resolvidos no escopo da primeira opção, como a expansão do esboço faz. */
function copiasDoArranjo(f, esboco) {
  const { num } = resolvedor(esboco.opcoes[0].parametros ?? {}, 'opção 1');
  return expandirArranjos([numerosDaForma(f, num, 'opção 1, arranjo')], 'opção 1');
}

/* Os ids das formas expandidas que cada entrada da lista bruta gera (uma forma, as de uma instância, as cópias de um arranjo). */
function idsPorEntrada(lista, expandidas, esboco) {
  return lista.map((f) => {
    if (!objeto(f)) return [];
    if (f.arranja !== undefined && f.id === undefined) return copiasDoArranjo(f, esboco).map((v) => v.id);
    if (typeof f.id !== 'string') return [];
    return expandidas.filter((x) => x.id === f.id || x.daInstancia?.id === f.id).map((x) => x.id);
  });
}

function unidadeDoEstado(bruto, estado, nome) {
  const unidades = estado?.unidades?.length ? estado.unidades : planoDeDetalhe(bruto).unidades;
  const unidade = unidadePorNome(unidades, nome);
  const ids = unidades.map((u) => u.id);
  exigir(ids.includes(unidade), `condutor: "${unidade}" não é uma unidade de detalhe${quisDizer(unidade, ids)} (unidades: ${ids.map(abreviar).join(', ')})`);
  return { unidades, u: unidades.find((x) => x.id === unidade) };
}

/* Classifica cada entrada da lista bruta: 'dentro' (todas as formas visíveis dela são da unidade), 'fora' (nenhuma é) ou erro
   (uma instância ou um arranjo dividido entre unidades por --mover de uma forma só). */
function classificar(lista, ids, unidades, u) {
  const donos = new Map(unidades.flatMap((x) => x.membros.map((m) => [m, x.id])));
  return lista.map((f, k) => {
    const nas = ids[k].filter((id) => donos.has(id));
    const dentro = nas.filter((id) => u.membros.includes(id));
    if (dentro.length === 0) return 'fora';
    if (dentro.length === nas.length) return 'dentro';
    const outras = [...new Set(nas.filter((id) => !u.membros.includes(id)).map((id) => donos.get(id)))];
    throw new ErroDeEsboco(`a entrada "${f.id ?? f.arranja?.forma}" do esboço tem formas na unidade "${u.id}" e em ${outras.map((x) => `"${x}"`).join(', ')}: a troca da unidade não divide uma instância nem um arranjo; mova todas as formas dela para a mesma unidade (--mover ${f.id ?? f.arranja?.forma} --para ${u.id} --motivo <texto>) e tente de novo`);
  });
}

/* A tolerância, a penetração e a folga que o gate usa no mestre (a opção, a raiz ou o padrão da caixa do conjunto visível). */
function limiaresDoMestre(esboco) {
  const o = esboco.opcoes[0];
  const raiz = lerContato(esboco.contato, 'esboço');
  const daOpcao = lerContato(o.contato, 'opção 1');
  const visiveis = resolverOpcao(o, 'opção 1', esboco.pontos).filter((r) => r.forma.oculto !== true);
  const p = padroesDoContato([visiveis]);
  return { tolerancia: daOpcao?.tolerancia ?? raiz?.tolerancia ?? p.padraoTol, penetracao: daOpcao?.penetracao ?? raiz?.penetracao ?? p.padraoPen, folga: daOpcao?.folga ?? raiz?.folga ?? p.padraoFolga };
}

/* O esboço isolado da unidade: as entradas dela como estão, as outras com `oculto: true` (só servem de referência de posição),
   só a primeira opção e o plano mínimo. Parâmetros, pontos e contato do mestre ficam; as juntas e os pares que citam formas
   ocultas não reprovam (o gate as ignora). */
export function detalharUnidade(bruto, estado, nome) {
  const { unidades, u } = unidadeDoEstado(bruto, estado, nome);
  const unidade = u.id;
  const esboco = expandirEsboco(bruto);
  const { lista, onde } = listaDoMestre(bruto);
  const ids = idsPorEntrada(lista, esboco.opcoes[0].formas, esboco);
  const tipo = classificar(lista, ids, unidades, u);
  const formas = [];
  lista.forEach((f, k) => {
    if (tipo[k] === 'dentro' || !objeto(f)) { formas.push(clone(f)); return; }
    if (f.arranja !== undefined && f.id === undefined) { formas.push(...copiasDoArranjo(f, esboco).map((v) => ({ ...v, oculto: true }))); return; }
    formas.push({ ...clone(f), oculto: true });
  });
  const d = clone(bruto);
  d.plano = PLANO_MINIMO(unidade);
  d.opcoes = [clone(bruto.opcoes[0])];
  /* a tolerância, a penetração e a folga do gate são as do mestre inteiro: sem declará-las o isolado calcularia o padrão de 1%
     da caixa da unidade, bem menor, e inventaria peças soltas e longe que o mestre não tem */
  const l = limiaresDoMestre(esboco);
  d.contato = { ...(objeto(d.contato) ? d.contato : {}) };
  for (const k of ['tolerancia', 'penetracao', 'folga']) if (d.contato[k] === undefined) d.contato[k] = l[k];
  if (onde === 'opcao') { d.opcoes[0].formas = formas; delete d.formas; } else d.formas = formas;
  return d;
}

/* Os ids das formas de outras unidades que tocam a unidade (as mesmas que o `--ligacoes` lista como contato, no mestre), em
   ordem. Só elas, e não a unidade vizinha inteira: o que mostra onde a unidade se prende. */
export function formasVizinhas(bruto, estado, nome) {
  const { unidades, u } = unidadeDoEstado(bruto, estado, nome);
  const mapa = mapaDeLigacoes(bruto, { unidades });
  const da = mapa.unidades.find((x) => x.id === u.id);
  return [...new Set((da?.vizinhas ?? []).flatMap((v) => v.locais.map((l) => l.daOutra)))].sort();
}

/* O esboço isolado e já expandido (`expandirEsboco(detalharUnidade(...))`) com as formas `ids` à vista em contorno claro e
   translúcido, sem rótulo, sem linha de centro e sem a cor própria: só mostram onde a unidade se prende. Não muda o que recebe. */
export function comFormasVizinhas(isolado, ids) {
  if (ids.length === 0) return isolado;
  const quais = new Set(ids);
  const e = clone(isolado);
  for (const o of e.opcoes) {
    o.formas = o.formas.map((f) => {
      if (!quais.has(f.id)) return f;
      const { oculto, rotulo, ocultar, linhaCentro, daInstancia, ...resto } = f;
      void oculto; void rotulo; void ocultar; void linhaCentro; void daInstancia;
      return { ...resto, cor: COR_DO_VIZINHO, opacidade: OPACIDADE_DO_VIZINHO };
    });
  }
  return e;
}

const chaveDoPar = (p) => `${p.a}\u0000${p.b}\u0000${p.tipo}`;

/* Junta os parâmetros e os pontos novos do detalhado aos do mestre: um nome que o mestre já tem fica como está, e se o
   detalhado o redefine com outro valor é erro (renomeie no detalhado). */
function juntarNomes(mestre, detalhado, campo) {
  for (const de of [detalhado, detalhado?.opcoes?.[0]]) {
    if (!objeto(de?.[campo])) continue;
    for (const [nome, v] of Object.entries(de[campo])) {
      const atual = mestre[campo]?.[nome] ?? mestre.opcoes?.[0]?.[campo]?.[nome];
      if (atual === undefined) { mestre[campo] = { ...(mestre[campo] ?? {}), [nome]: clone(v) }; continue; }
      exigir(JSON.stringify(atual) === JSON.stringify(v), `o detalhado redefine ${campo === 'parametros' ? 'o parâmetro' : 'o ponto'} "${nome}" (mestre ${JSON.stringify(atual)}, detalhado ${JSON.stringify(v)}): dê outro nome no detalhado`);
    }
  }
}

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* Devolve ao mestre o que o detalhado muda fora da lista de formas: os `modulos` (módulo novo entra, módulo que o detalhado
   alterou passa a ser o do detalhado) e o `simetrico` da raiz e de cada unidade (o do mestre só muda se ele não tinha). Um
   `simetrico` que o mestre já tem com outro valor é conflito e a integração é recusada, dizendo qual. O que o detalhado
   apagou não volta (o mestre mantém). Devolve a lista, em texto, do que voltou. */
function devolverAoMestre(mestre, detalhado) {
  const voltou = [];
  if (objeto(detalhado?.modulos)) {
    for (const [nome, m] of Object.entries(detalhado.modulos)) {
      const atual = objeto(mestre.modulos) ? mestre.modulos[nome] : undefined;
      if (atual !== undefined && igual(atual, m)) continue;
      mestre.modulos = { ...(objeto(mestre.modulos) ? mestre.modulos : {}), [nome]: clone(m) };
      voltou.push(atual === undefined ? `módulo "${nome}" (novo, ${m?.formas?.length ?? 0} formas)` : `módulo "${nome}" (alterado: ${atual?.formas?.length ?? 0} -> ${m?.formas?.length ?? 0} formas, a versão do detalhado substituiu a do mestre)`);
    }
  }
  const simetria = (onde, atual, nova, grava) => {
    if (nova === undefined || igual(atual, nova)) return;
    exigir(atual === undefined, `integrar: o detalhado e o mestre discordam do "simetrico" ${onde}: o mestre tem ${JSON.stringify(atual)} e o detalhado ${JSON.stringify(nova)}; deixe os dois iguais (edite o mestre com --editar ou volte o detalhado ao valor do mestre) e integre de novo`);
    grava(clone(nova));
    voltou.push(`"simetrico" ${onde} (${JSON.stringify(nova)})`);
  };
  simetria('da raiz', mestre.simetrico, detalhado?.simetrico, (v) => { mestre.simetrico = v; });
  if (objeto(detalhado?.unidades)) {
    for (const [nome, u] of Object.entries(detalhado.unidades)) {
      if (!objeto(u) || u.simetrico === undefined) continue;
      const atual = objeto(mestre.unidades?.[nome]) ? mestre.unidades[nome].simetrico : undefined;
      simetria(`da unidade "${nome}"`, atual, u.simetrico, (v) => { mestre.unidades = { ...(objeto(mestre.unidades) ? mestre.unidades : {}), [nome]: { ...(objeto(mestre.unidades?.[nome]) ? mestre.unidades[nome] : {}), simetrico: v } }; });
    }
  }
  return voltou;
}

/* Junta os pares e as juntas do contato do detalhado (na raiz e na opção) ao do mestre, sem repetir. */
function juntarContato(mestre, detalhado) {
  const alvo = (m) => { m.contato = objeto(m.contato) ? m.contato : {}; return m.contato; };
  for (const [de, para] of [[detalhado?.contato, () => alvo(mestre)], [detalhado?.opcoes?.[0]?.contato, () => alvo(mestre.opcoes[0])]]) {
    if (!objeto(de)) continue;
    for (const [campo, chave] of [['pares', chaveDoPar], ['juntas', (j) => JSON.stringify(j)]]) {
      if (!Array.isArray(de[campo])) continue;
      const c = para();
      const tem = new Set((c[campo] ?? []).map(chave));
      const novos = de[campo].filter((x) => !tem.has(chave(x))).map(clone);
      if (novos.length) c[campo] = [...(c[campo] ?? []), ...novos];
    }
  }
}

const padraoDe = (q) => new RegExp(`^${q.split('*').map((t) => t.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);

/* Tira do contato (raiz e primeira opção) os pares e as peças de junta que citam formas que não existem mais. */
function limparContato(mestre, todos) {
  const ids = new Set(todos.map((f) => f.id));
  const instancias = new Set(todos.map((f) => f.daInstancia?.id).filter(Boolean));
  const existe = (id) => ids.has(id) || instancias.has(id);
  const removidos = { pares: 0, juntas: 0, pecas: 0 };
  for (const c of [mestre.contato, mestre.opcoes?.[0]?.contato]) {
    if (!objeto(c)) continue;
    if (Array.isArray(c.pares)) {
      const fica = c.pares.filter((p) => existe(p.a) && existe(p.b));
      removidos.pares += c.pares.length - fica.length;
      c.pares = fica;
      if (fica.length === 0) delete c.pares;
    }
    if (Array.isArray(c.juntas)) {
      const fica = [];
      for (const j of c.juntas) {
        const pecas = (j.pecas ?? []).filter((q) => (q.includes('*') ? todos.some((f) => padraoDe(q).test(f.id)) : existe(q)));
        removidos.pecas += (j.pecas ?? []).length - pecas.length;
        const casadas = new Set(pecas.flatMap((q) => (q.includes('*') ? todos.filter((f) => padraoDe(q).test(f.id)).map((f) => f.id) : [q])));
        if (casadas.size < 2) { removidos.juntas += 1; continue; }
        fica.push({ ...j, pecas });
      }
      c.juntas = fica;
      if (fica.length === 0) delete c.juntas;
    }
  }
  return removidos;
}

/* O esboço com o contato (raiz e primeira opção) sem o que cita formas que não existem nele. */
function comContatoSaneado(doc) {
  const d = clone(doc);
  const provisorio = clone(doc);
  for (const c of [provisorio.contato, provisorio.opcoes?.[0]?.contato]) if (objeto(c)) { delete c.pares; delete c.juntas; }
  limparContato(d, expandirEsboco(provisorio).opcoes[0].formas);
  return d;
}

/* Troca, no mestre, as entradas da unidade pelas visíveis do detalhado (as com `oculto: true` só são referência). Devolve
   { mestre, estado, envelope, removidos, formas }: o mestre novo, o estado do Condutor com a unidade no mesmo lugar (os
   membros dela passam a ser as formas novas, o Envelope da maquete continua e ganha o resultado da conferência contra o
   detalhado, e o resto fica como estava), o resultado de `conferirEnvelope` (ou null sem Envelope), o que saiu do contato
   e os ids novos da unidade, e `devolvidos`, o que voltou ao mestre fora da lista de formas (`modulos`, `simetrico`). Sem estado, as unidades vêm do Plano de detalhe do próprio mestre e `estado` volta null. O mestre
   novo precisa resolver (todas as referências das outras unidades às formas trocadas), ou a troca é recusada. */
export function integrarUnidade(bruto, estado, nome, detalhado, { arquivo = 'detalhado' } = {}) {
  const { unidades, u } = unidadeDoEstado(bruto, estado, nome);
  const unidade = u.id;
  exigir(objeto(detalhado), 'integrar: o arquivo detalhado deve ser um esboço (objeto JSON)');
  const esboco = expandirEsboco(bruto);
  const { lista, onde } = listaDoMestre(bruto);
  const ids = idsPorEntrada(lista, esboco.opcoes[0].formas, esboco);
  const tipo = classificar(lista, ids, unidades, u);
  const doDetalhe = detalhado.opcoes?.[0]?.formas ?? detalhado.formas;
  exigir(Array.isArray(doDetalhe), 'integrar: o detalhado não tem lista de formas (nem na raiz nem na primeira opção)');
  const novas = doDetalhe.filter((f) => !(objeto(f) && f.oculto === true)).map(clone);
  exigir(novas.length > 0, 'integrar: o detalhado não tem nenhuma forma visível (as com "oculto": true só servem de referência)');
  if (u.declarada) for (const f of novas) if (objeto(f) && f.arranja === undefined && f.unidade === undefined) f.unidade = unidade;
  const mestre = clone(bruto);
  const nova = [];
  let posto = false;
  lista.forEach((f, k) => {
    if (tipo[k] === 'dentro') { if (!posto) { nova.push(...novas); posto = true; } return; }
    nova.push(f);
  });
  exigir(posto, `integrar: a unidade "${unidade}" não tem entrada no esboço para trocar`);
  if (onde === 'opcao') mestre.opcoes[0].formas = nova; else mestre.formas = nova;
  juntarNomes(mestre, detalhado, 'parametros');
  juntarNomes(mestre, detalhado, 'pontos');
  juntarContato(mestre, detalhado);
  const devolvidos = devolverAoMestre(mestre, detalhado);
  /* as referências: o que resta do contato vale só para formas que existem */
  const provisorio = clone(mestre);
  for (const c of [provisorio.contato, provisorio.opcoes[0].contato]) if (objeto(c)) { delete c.pares; delete c.juntas; }
  let depois;
  try { depois = expandirEsboco(provisorio); } catch (e) {
    if (e instanceof ErroDeEsboco) throw new ErroDeEsboco(`integrar: o esboço com a unidade "${unidade}" trocada não expande: ${e.message}`);
    throw e;
  }
  const removidos = limparContato(mestre, depois.opcoes[0].formas);
  let expandido;
  try {
    expandido = expandirEsboco(mestre);
    resolverOpcao(expandido.opcoes[0], 'opção 1', expandido.pontos);
  } catch (e) {
    if (e instanceof ErroDeEsboco) throw new ErroDeEsboco(`integrar: o esboço com a unidade "${unidade}" trocada não resolve (alguma forma de outra unidade cita uma forma que saiu?): ${e.message}`);
    throw e;
  }
  const visiveis = expandido.opcoes[0].formas.filter((f) => f.oculto !== true).map((f) => f.id);
  const outras = new Set(unidades.filter((x) => x.id !== unidade).flatMap((x) => x.membros));
  const formas = visiveis.filter((id) => !outras.has(id));
  let envelope = null;
  if (u.envelope) envelope = conferirEnvelope(bruto, { ...(estado ?? {}), unidades }, unidade, comContatoSaneado(detalhado));
  let novoEstado = null;
  if (estado?.unidades?.length) {
    novoEstado = clone(estado);
    const brutas = unidades.map((x) => ({ id: x.id, membros: x.id === unidade ? formas : x.membros, feito: x.feito, declarada: x.declarada, custo: x.custo }));
    const refeitas = montarUnidadesDoEstado(mestre, brutas);
    novoEstado.unidades = refeitas.map((x) => {
      const antiga = unidades.find((y) => y.id === x.id);
      return { ...x, ...(antiga?.envelope ? { envelope: antiga.envelope } : {}), ...(antiga?.envelopeConferido ? { envelopeConferido: antiga.envelopeConferido } : {}) };
    });
    if (envelope) novoEstado = registrarEnvelope(novoEstado, envelope, arquivo);
    sincronizarAvisoDeCiclo(novoEstado);
  }
  return { mestre, estado: novoEstado, envelope, removidos, formas, devolvidos };
}

/* Detalhar e integrar uma Unidade de detalhe: `detalharUnidade` devolve um esboço isolado da unidade (as entradas das outras
   unidades com `oculto: true`, o plano mínimo), e `integrarUnidade` troca no mestre as entradas da unidade pelas do esboço
   detalhado, levando ao mestre o que o detalhe reescreveu (parâmetros e pontos da unidade, `funcao`, juntas e pares apagados,
   `tocam` e `livres` do contrato do plano) e removendo o que cita formas que saíram.
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

/* As mesmas formas vizinhas de `formasVizinhas`, descritas para o brief do crítico: `{ id, rotulo, unidade, funcao }` (rotulo e
   funcao só quando existem). A imagem continua sem legenda; o nome só vai no texto. */
export function descricaoDasVizinhas(bruto, estado, nome) {
  const { unidades, u } = unidadeDoEstado(bruto, estado, nome);
  const mapa = mapaDeLigacoes(bruto, { unidades });
  const da = mapa.unidades.find((x) => x.id === u.id);
  const rotulos = new Map(expandirEsboco(bruto).opcoes[0].formas.filter((f) => typeof f.rotulo === 'string' && f.rotulo.trim()).map((f) => [f.id, f.rotulo.trim()]));
  const achadas = new Map();
  for (const v of da?.vizinhas ?? []) {
    const funcao = mapa.unidades.find((x) => x.id === v.unidade)?.funcao;
    for (const l of v.locais) if (!achadas.has(l.daOutra)) achadas.set(l.daOutra, { id: l.daOutra, ...(rotulos.has(l.daOutra) ? { rotulo: rotulos.get(l.daOutra) } : {}), unidade: v.unidade, ...(funcao ? { funcao } : {}) });
  }
  return [...achadas.values()].sort((a, b) => a.id.localeCompare(b.id));
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


const IDENTIFICADOR = /[A-Za-z_][A-Za-z0-9_]*/g;

/* Os valores de `parametros` ou de `pontos` que valem no esboço: os da primeira opção sobrepõem os da raiz. */
const efetivos = (doc, campo) => ({ ...(objeto(doc?.[campo]) ? doc[campo] : {}), ...(objeto(doc?.opcoes?.[0]?.[campo]) ? doc.opcoes[0][campo] : {}) });

/* Acrescenta a `achados` os `nomes` que o valor JSON cita: a "=expressão" cita os identificadores dela, e o texto sem "=" cita o
   nome quando é o texto inteiro (`"largura": "capoLargA"`). */
function citarNomes(valor, nomes, achados) {
  if (typeof valor === 'string') {
    if (valor.startsWith('=')) { for (const t of valor.match(IDENTIFICADOR) ?? []) if (nomes.has(t)) achados.add(t); } else if (nomes.has(valor)) achados.add(valor);
  } else if (Array.isArray(valor)) for (const x of valor) citarNomes(x, nomes, achados);
  else if (objeto(valor)) for (const x of Object.values(valor)) citarNomes(x, nomes, achados);
}

/* Os nomes que o esboço cita fora dos próprios blocos `parametros` (da raiz e das opções): formas, pontos, contato, plano. */
function nomesDoEsboco(doc, nomes) {
  const achados = new Set();
  const { parametros, ...resto } = doc;
  void parametros;
  citarNomes({ ...resto, ...(Array.isArray(resto.opcoes) ? { opcoes: resto.opcoes.map((o) => { if (!objeto(o)) return o; const { parametros: p, ...r } = o; void p; return r; }) } : {}) }, nomes, achados);
  return achados;
}

/* `inicial` mais os parâmetros que as definições deles citam, e assim por diante (`escAng` usa `escDx` e `escDz`). */
function comDependencias(inicial, definicoes, nomes) {
  const todos = new Set(inicial);
  const fila = [...inicial];
  while (fila.length > 0) {
    const achados = new Set();
    citarNomes(definicoes[fila.pop()], nomes, achados);
    for (const a of achados) if (!todos.has(a)) { todos.add(a); fila.push(a); }
  }
  return todos;
}

/* O `bruto` sem as entradas da unidade (a lista de formas só com as de fora), para ver o que as outras unidades usam. */
function semAUnidade(bruto, restantes, onde) {
  const d = clone(bruto);
  if (onde === 'opcao') d.opcoes[0].formas = clone(restantes); else d.formas = clone(restantes);
  return d;
}

const nomeDaEntrada = (f) => (objeto(f) ? (f.id ?? (f.arranja ? `arranja de ${[f.arranja.forma].flat().join(', ')}` : '?')) : '?');

/* Leva ao mestre os parâmetros (ou pontos) do detalhado. Um nome novo entra. Um nome que o mestre já tem com outro valor vale o
   do detalhado quando nada fora da unidade o usa (nem por outro parâmetro): o detalhe é onde a unidade se ajusta, e a saída diz
   o que mudou. Quando formas, pontos ou o contrato de outras unidades usam o nome, o novo valor as moveria sem que a pessoa
   decidisse, e a integração é recusada com o caminho (editar o mestre, ou dar outro nome no detalhado). Devolve
   { alterados: [{ nome, de, para }], novos: [nome] }. */
function juntarNomes(mestre, detalhado, campo, { foraDaUnidade, entradasFora }) {
  const doMestre = efetivos(mestre, campo);
  const doDetalhe = efetivos(detalhado, campo);
  const nomes = new Set(Object.keys(doMestre));
  const ehParametro = campo === 'parametros';
  const citadosFora = ehParametro ? comDependencias(nomesDoEsboco(foraDaUnidade, nomes), doMestre, nomes) : nomesDoEsboco(foraDaUnidade, nomes);
  const alterados = [];
  const novos = [];
  const compartilhados = [];
  for (const [nome, v] of Object.entries(doDetalhe)) {
    if (!Object.hasOwn(doMestre, nome)) { mestre[campo] = { ...(objeto(mestre[campo]) ? mestre[campo] : {}), [nome]: clone(v) }; novos.push(nome); continue; }
    if (igual(doMestre[nome], v)) continue;
    if (citadosFora.has(nome)) { compartilhados.push({ nome, mestre: doMestre[nome], detalhe: v }); continue; }
    const dono = objeto(mestre.opcoes?.[0]?.[campo]) && Object.hasOwn(mestre.opcoes[0][campo], nome) ? mestre.opcoes[0] : mestre;
    dono[campo][nome] = clone(v);
    alterados.push({ nome, de: doMestre[nome], para: v });
  }
  if (compartilhados.length > 0) {
    const rotulo = ehParametro ? 'o parâmetro' : 'o ponto';
    const quem = (nome) => {
      const ids = entradasFora.filter((f) => { const a = new Set(); citarNomes(f, nomes, a); return (ehParametro ? comDependencias(a, doMestre, nomes) : a).has(nome); }).map(nomeDaEntrada);
      return ids.length === 0 ? 'campos de fora da lista de formas (pontos, contato ou plano)' : `${ids.slice(0, 6).join(', ')}${ids.length > 6 ? ` e mais ${ids.length - 6}` : ''}`;
    };
    const linhas = compartilhados.map((c) => `${rotulo} "${c.nome}" (mestre ${JSON.stringify(c.mestre)}, detalhado ${JSON.stringify(c.detalhe)}) também é usado por ${quem(c.nome)}`);
    const edicoes = compartilhados.map((c) => `--editar <mestre> ${campo}.${c.nome}=${JSON.stringify(c.detalhe)}`);
    throw new ErroDeEsboco(`integrar: o detalhado muda ${compartilhados.length === 1 ? linhas[0] : `${compartilhados.length} ${ehParametro ? 'parâmetros' : 'pontos'} que outras unidades também usam:\n  - ${linhas.join('\n  - ')}`}, e o novo valor moveria essas formas junto. Se a mudança vale para todas, edite o mestre (${edicoes.join('; ')}) e integre de novo; se vale só para esta unidade, dê outro nome no detalhado e use o novo nome nas formas dela`);
  }
  return { alterados, novos };
}

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* Devolve ao mestre o que o detalhado muda fora da lista de formas: os `modulos` (módulo novo entra, módulo que o detalhado
   alterou passa a ser o do detalhado) e o `simetrico` da raiz e de cada unidade (o do mestre só muda se ele não tinha). Um
   `simetrico` que o mestre já tem com outro valor é conflito e a integração é recusada, dizendo qual. O que o detalhado
   apagou não volta (o mestre mantém). A `funcao` da unidade integrada, quando o detalhado a reescreve, passa a ser a do mestre:
   é o texto que os briefs do crítico e do Marco imprimem, e o detalhe é onde a pessoa sabe o que a unidade passou a ter (a das
   outras unidades, que o detalhado só copia do mestre, não volta). Devolve a lista, em texto, do que voltou. */
function devolverAoMestre(mestre, detalhado, unidade) {
  const voltou = [];
  const funcao = detalhado?.unidades?.[unidade]?.funcao;
  if (typeof funcao === 'string' && funcao.trim()) {
    const atual = mestre.unidades?.[unidade]?.funcao;
    if (atual !== funcao) {
      mestre.unidades = { ...(objeto(mestre.unidades) ? mestre.unidades : {}), [unidade]: { ...(objeto(mestre.unidades?.[unidade]) ? mestre.unidades[unidade] : {}), funcao } };
      voltou.push(`"funcao" da unidade "${abreviar(unidade)}" (${atual === undefined ? 'nova' : 'reescrita'}: ${funcao.length > 70 ? `${funcao.slice(0, 69)}…` : funcao})`);
    }
  }
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

/* Se o id (de forma, de instância ou padrão com `*`) cita alguma das formas `antigas` da unidade que o detalhe trocou. */
function citaAntiga(q, antigas) {
  if (typeof q !== 'string') return false;
  if (q.includes('*')) { const re = padraoDe(q); return antigas.some((id) => re.test(id)); }
  return antigas.some((id) => id === q || id.startsWith(`${q}.`));
}

const textoDaJunta = (j) => (Array.isArray(j?.pecas) ? j.pecas.join(' + ') : JSON.stringify(j));
const textoDoPar = (p) => `${p?.a} + ${p?.b}`;

/* Põe no contato (raiz e primeira opção) do mestre o que o detalhado declara de juntas e de pares, e tira o que o detalhado
   apagou. O detalhado nasce como cópia do mestre (`--detalhar`), então a junta ou o par que o mestre tem, cita uma das formas
   que o detalhe trocou (`antigas`) e não está mais no detalhado foi apagado pela pessoa: sai, mesmo que as formas dele ainda
   existam (a perna que passou a ficar sob o piso do capô deixa de atravessá-lo, e a junta de 40 mm esconderia uma travessia de
   verdade). A junta ou o par que muda de `max` ou de `motivo` no detalhado vale no lugar do antigo. O que não cita a unidade o
   detalhe não apaga, e só acrescenta a que cita uma forma nova da unidade (`novasDaUnidade`): a junta entre formas que já
   existiam, ausente do mestre, é quase sempre a que o mestre tirou depois da cópia, e voltaria a esconder uma travessia. O detalhado sem `contato` (a raiz ou a opção) não fala de contato naquele nível. Devolve as juntas e os
   pares apagados, em texto. */
function reconciliarContato(mestre, detalhado, antigas, novasDaUnidade) {
  const apagados = { juntas: [], pares: [] };
  for (const [de, dono] of [[detalhado?.contato, mestre], [detalhado?.opcoes?.[0]?.contato, mestre.opcoes[0]]]) {
    if (!objeto(de)) continue;
    const dosIds = (ids) => [(p) => citaAntiga(p?.a, ids) || citaAntiga(p?.b, ids), (j) => (Array.isArray(j?.pecas) ? j.pecas.some((q) => citaAntiga(q, ids)) : false)];
    const [citaPar, citaJunta] = dosIds(antigas);
    const [citaNovaPar, citaNovaJunta] = dosIds(novasDaUnidade);
    for (const [campo, cita, citaNova, texto, ident] of [['pares', citaPar, citaNovaPar, textoDoPar, (x) => `${[x?.a, x?.b].sort().join('|')}|${x?.tipo}`], ['juntas', citaJunta, citaNovaJunta, textoDaJunta, (x) => (Array.isArray(x?.pecas) ? [...x.pecas].sort().join('|') : JSON.stringify(x))]]) {
      const doDetalhe = Array.isArray(de[campo]) ? de[campo] : [];
      const doMestre = Array.isArray(dono.contato?.[campo]) ? dono.contato[campo] : [];
      if (doMestre.length === 0 && doDetalhe.length === 0) continue;
      const noDetalhe = new Set(doDetalhe.map((x) => JSON.stringify(x)));
      const noMestre = new Set(doMestre.map((x) => JSON.stringify(x)));
      const usados = new Set();
      const todos = [];
      for (const x of doMestre) {
        if (noDetalhe.has(JSON.stringify(x))) { todos.push(x); continue; }
        if (!cita(x)) { todos.push(x); continue; }
        /* as mesmas peças com outro `max` ou `motivo`: o detalhado reescreveu a junta */
        const reescrita = doDetalhe.find((y) => !noMestre.has(JSON.stringify(y)) && ident(y) === ident(x));
        if (reescrita) { todos.push(clone(reescrita)); usados.add(JSON.stringify(reescrita)); } else apagados[campo].push(texto(x));
      }
      for (const y of doDetalhe) {
        if (noMestre.has(JSON.stringify(y)) || usados.has(JSON.stringify(y)) || !citaNova(y)) continue;
        if (!todos.some((x) => ident(x) === ident(y))) todos.push(clone(y));
      }
      if (todos.length > 0) { dono.contato = objeto(dono.contato) ? dono.contato : {}; dono.contato[campo] = todos; } else if (objeto(dono.contato)) delete dono.contato[campo];
    }
  }
  return apagados;
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

const mesmoPar = (p, q) => { const f = (x) => (Array.isArray(x) ? x : [x?.a, x?.b]); const [a, b] = f(p); const [c, d] = f(q); return (a === c && b === d) || (a === d && b === c); };
const textoDoParDoPlano = (p) => (Array.isArray(p) ? p.join(' + ') : textoDoPar(p));

/* `plano.contrato.tocam` e `livres` do mestre quando o detalhado declara os dele no `plano` mínimo: o detalhe diz quem toca
   quem depois de trocada a unidade (o trem principal da maquete tocava a asa pela perna, e o detalhe a toca pela baia). Para
   cada lista que o detalhado traz (até a lista vazia), os pares do mestre que citam uma forma da unidade e não estão nela
   saem, e os pares dela que citam uma forma nova da unidade e que o mestre não tem entram. O detalhado sem `plano.contrato.tocam` não mexe nos `tocam` do mestre.
   Devolve { tirados, postos } em texto. */
function reconciliarContratoDoPlano(mestre, detalhado, antigas, novasDaUnidade) {
  const saida = { tirados: [], postos: [] };
  const dc = detalhado?.plano?.contrato;
  if (!objeto(dc) || !objeto(mestre.plano)) return saida;
  for (const chave of ['tocam', 'livres']) {
    if (!Array.isArray(dc[chave])) continue;
    mestre.plano.contrato = objeto(mestre.plano.contrato) ? mestre.plano.contrato : {};
    const atuais = Array.isArray(mestre.plano.contrato[chave]) ? mestre.plano.contrato[chave] : [];
    const cita = (p) => (Array.isArray(p) ? p : [p?.a, p?.b]).some((q) => citaAntiga(q, antigas));
    const fica = atuais.filter((p) => !cita(p) || dc[chave].some((q) => mesmoPar(p, q)));
    for (const p of atuais) if (!fica.includes(p)) saida.tirados.push(`${chave} ${textoDoParDoPlano(p)}`);
    const novos = dc[chave].filter((q) => !atuais.some((p) => mesmoPar(p, q)) && (Array.isArray(q) ? q : [q?.a, q?.b]).some((id) => citaAntiga(id, novasDaUnidade)));
    for (const q of novos) saida.postos.push(`${chave} ${textoDoParDoPlano(q)}`);
    const todos = [...fica, ...novos.map(clone)];
    if (todos.length > 0 || Array.isArray(mestre.plano.contrato[chave])) mestre.plano.contrato[chave] = todos;
  }
  return saida;
}

/* Os pares de `plano.contrato` (tocam, livres, simetricas) que citam um id que não existe mais no mestre integrado: não são
   removidos (o contrato é exigência da pessoa), só acusados. O id pode ser forma, instância, padrão com `*` ou unidade. */
function contratoComIdAusente(mestre, formas, unidades) {
  const ids = formas.map((f) => f.id);
  const instancias = new Set(formas.map((f) => f.daInstancia?.id).filter(Boolean));
  const existe = (q) => typeof q !== 'string' || ids.includes(q) || instancias.has(q) || unidades.includes(q) || ids.some((id) => id.startsWith(`${q}.`)) || (q.includes('*') && ids.some((id) => padraoDe(q).test(id)));
  const achados = [];
  for (const chave of ['tocam', 'livres', 'simetricas']) {
    for (const p of Array.isArray(mestre.plano?.contrato?.[chave]) ? mestre.plano.contrato[chave] : []) {
      const par = Array.isArray(p) ? p : [p?.a, p?.b];
      const falta = par.filter((q) => !existe(q));
      if (falta.length > 0) achados.push(`plano.contrato.${chave} cita ${falta.map((q) => `"${q}"`).join(' e ')}, que não existe mais (${textoDoParDoPlano(p)}); reescreva o par no \`plano.contrato\` do detalhado e integre de novo, ou edite o mestre`);
    }
  }
  return achados;
}

/* Quanto o parâmetro valia para quem o usava: os que saíram do mestre (e o que valiam) e os que ficaram sem uso desde antes. */
function parametrosSemUso(bruto, mestre) {
  const defs = efetivos(mestre, 'parametros');
  const nomes = new Set(Object.keys(defs));
  const defsAntes = efetivos(bruto, 'parametros');
  const nomesAntes = new Set(Object.keys(defsAntes));
  const depois = comDependencias(nomesDoEsboco(mestre, nomes), defs, nomes);
  const antes = comDependencias(nomesDoEsboco(bruto, nomesAntes), defsAntes, nomesAntes);
  const sem = [...nomes].filter((n) => !depois.has(n));
  return { saem: sem.filter((n) => antes.has(n) && Object.hasOwn(defsAntes, n)), semUso: sem.filter((n) => !(antes.has(n) && Object.hasOwn(defsAntes, n))) };
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
  /* as formas que a troca tira: as expandidas da unidade e os ids das entradas dela (a instância, o arranjo) */
  const antigas = [...new Set([...u.membros, ...lista.flatMap((f, k) => (tipo[k] === 'dentro' && objeto(f) && typeof f.id === 'string' ? [f.id] : []))])];
  const restantes = lista.filter((f, k) => tipo[k] !== 'dentro');
  const contexto = { foraDaUnidade: semAUnidade(bruto, restantes, onde), entradasFora: restantes };
  const parametros = juntarNomes(mestre, detalhado, 'parametros', contexto);
  const pontos = juntarNomes(mestre, detalhado, 'pontos', contexto);
  /* as referências: o que resta do contato vale só para formas que existem */
  const provisorio = clone(mestre);
  for (const c of [provisorio.contato, provisorio.opcoes[0].contato]) if (objeto(c)) { delete c.pares; delete c.juntas; }
  let depois;
  try { depois = expandirEsboco(provisorio); } catch (e) {
    if (e instanceof ErroDeEsboco) throw new ErroDeEsboco(`integrar: o esboço com a unidade "${unidade}" trocada não expande: ${e.message}`);
    throw e;
  }
  const outras = new Set(unidades.filter((x) => x.id !== unidade).flatMap((x) => x.membros));
  const visiveisDepois = depois.opcoes[0].formas.filter((f) => f.oculto !== true).map((f) => f.id);
  const formas = visiveisDepois.filter((id) => !outras.has(id));
  /* o que é da unidade: as formas que saem e as que entram (o detalhe só decide o que cita uma delas) */
  const daUnidade = [...new Set([...antigas, ...formas, ...novas.flatMap((f) => (objeto(f) && typeof f.id === 'string' ? [f.id] : []))])];
  const novasDaUnidade = daUnidade.filter((id) => !antigas.includes(id));
  const apagados = reconciliarContato(mestre, detalhado, daUnidade, novasDaUnidade);
  const contrato = reconciliarContratoDoPlano(mestre, detalhado, daUnidade, novasDaUnidade);
  const devolvidos = devolverAoMestre(mestre, detalhado, unidade);
  const removidos = limparContato(mestre, depois.opcoes[0].formas);
  /* o parâmetro que só a unidade trocada usava e que o detalhe deixou de usar sai; o que já estava sem uso fica e é acusado */
  const { saem, semUso } = parametrosSemUso(bruto, mestre);
  const retirados = [];
  for (const n of saem) for (const c of [mestre, mestre.opcoes?.[0]]) {
    if (objeto(c?.parametros) && Object.hasOwn(c.parametros, n)) { if (!retirados.some((r) => r.nome === n)) retirados.push({ nome: n, valor: c.parametros[n] }); delete c.parametros[n]; if (Object.keys(c.parametros).length === 0) delete c.parametros; }
  }
  let expandido;
  try {
    expandido = expandirEsboco(mestre);
    resolverOpcao(expandido.opcoes[0], 'opção 1', expandido.pontos);
  } catch (e) {
    if (e instanceof ErroDeEsboco) throw new ErroDeEsboco(`integrar: o esboço com a unidade "${unidade}" trocada não resolve (alguma forma de outra unidade cita uma forma que saiu?): ${e.message}`);
    throw e;
  }
  const avisos = contratoComIdAusente(mestre, expandido.opcoes[0].formas, unidades.map((x) => x.id));
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
  return { mestre, estado: novoEstado, envelope, removidos, formas, devolvidos, parametros: { alterados: parametros.alterados, novos: parametros.novos, retirados, semUso }, pontos, apagados, contrato, avisos };
}

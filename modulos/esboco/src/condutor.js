/* O Condutor: a máquina de estados do fluxo de um esboço grande. Estágios: Maquete (formas primitivas com dimensões e
   posições certas), Conferência da maquete, Plano de detalhe (agrupa em Unidades de detalhe as formas de acoplamento
   apertado e ordena por dependência), Detalhe por unidade e Montagem. O estado é um objeto simples, gravado pela linha de
   comando em `<arquivo>.condutor.json`, e cada função devolve um estado novo. O Portão de estágio é o que decide se o
   estágio seguinte abre: o gate de contato aprovado, as medidas do plano dentro da tolerância e o contrato de relações
   cumprido (mais o que o estágio pede). O nível de detalhe do plano (`plano.nivel`) liga ou desliga estágios. A cada 25%
   do custo estimado (o número de formas das unidades) o Marco registra "chamar o crítico" no estado; o despacho do
   crítico é da skill. Puro e determinístico: sem data nem sorteio, e sem ler nem gravar arquivo. */
import { ancorasDe, ErroDeEsboco, resolverOpcao } from './index.js';
import { expandirEsboco } from './expandir.js';
import { descreverAchado, herdarDoEspelho, lerContato, unidadesDeclaradas, verificarContato } from './contato.js';
import { medirEsboco } from './descrever.js';
import { lerPlano } from './plano.js';
import { quisDizer } from './parecido.js';

export const ESTAGIOS = {
  maquete: 'Maquete',
  'conferencia-da-maquete': 'Conferência da maquete',
  'plano-de-detalhe': 'Plano de detalhe',
  'detalhe-por-unidade': 'Detalhe por unidade',
  montagem: 'Montagem',
};
export const ORDEM_DOS_ESTAGIOS = Object.keys(ESTAGIOS);
/* O nível de detalhe liga os estágios: um esboço rápido para na Maquete, um médio confere a maquete, e só o detalhado
   agrupa em unidades, detalha cada uma e monta. */
export const ESTAGIOS_POR_NIVEL = {
  esquematico: ['maquete'],
  medio: ['maquete', 'conferencia-da-maquete'],
  detalhado: ORDEM_DOS_ESTAGIOS,
};
export const NIVEL_PADRAO = 'medio';
/* O que cada nível pede do plano antes de o Portão passar. */
export const EXIGENCIAS_POR_NIVEL = {
  esquematico: { medidas: 1, relacoes: 0 },
  medio: { medidas: 3, relacoes: 1 },
  detalhado: { medidas: 5, relacoes: 1 },
};
export const LIMIARES_DO_MARCO = [25, 50, 75, 100];
export const MINIMO_DO_MOTIVO = 15;
export const CONCLUIDO = 'concluido';
/* A nota que libera uma unidade (ou Marco) e as rodadas do crítico antes de o bloqueio só sair com a autorização da pessoa. */
export const NOTA_MINIMA = 8;
export const RODADAS_DO_CRITICO = 3;
/* A unidade com mais formas que isto precisa de `funcao` (e passa pelo crítico por unidade) para virar feita. */
export const LIMITE_DA_FUNCAO = 8;

/* A `funcao` declarada da unidade em `unidades.<id>.funcao` do esboço (ou undefined). */
export function funcaoDaUnidade(bruto, id) {
  const f = bruto?.unidades?.[id]?.funcao;
  return typeof f === 'string' && f.trim() ? f.trim() : undefined;
}

export const nomeDoEstagio = (id) => (id === CONCLUIDO ? 'Concluído' : ESTAGIOS[id]);
const clone = (v) => JSON.parse(JSON.stringify(v));
const exigir = (cond, msg) => { if (!cond) throw new ErroDeEsboco(msg); };

/* Referências (ids de forma) que uma forma cita para se posicionar. `ids` é o conjunto de ids do esboço. */
function referenciasDaForma(f, ids) {
  const brutas = [];
  const ponto = (v) => {
    if (typeof v === 'string') brutas.push(v);
    else if (v && typeof v === 'object' && Array.isArray(v.entre)) v.entre.forEach(ponto);
    else if (v && typeof v === 'object' && typeof v.ancora === 'string') brutas.push(v.ancora);
    else if (v && typeof v === 'object' && v.ponto !== undefined && v.nome !== undefined) ponto(v.ponto);
  };
  if (typeof f.sobre === 'string') brutas.push(f.sobre);
  if (Array.isArray(f.ponta)) brutas.push(f.ponta[0]); else if (f.ponta && typeof f.ponta === 'object' && typeof f.ponta.id === 'string') brutas.push(f.ponta.id); else if (typeof f.ponta === 'string') brutas.push(f.ponta);
  if (f.encosta && typeof f.encosta.referencia === 'string') brutas.push(f.encosta.referencia);
  if (f.alinha) ponto(f.alinha.com);
  for (const k of ['centro', 'de', 'para']) if (f[k] !== undefined) ponto(f[k]);
  if (Array.isArray(f.caminho)) f.caminho.forEach(ponto);
  if (f.espelha && typeof f.espelha.forma === 'string') brutas.push(f.espelha.forma);
  if (f.arranjoDe && typeof f.arranjoDe.fonte === 'string') brutas.push(f.arranjoDe.fonte);
  if (f.arranjoDe && typeof f.arranjoDe.centro === 'string') brutas.push(f.arranjoDe.centro);
  if (f.arranjoDe && typeof f.arranjoDe.caminho === 'string') brutas.push(f.arranjoDe.caminho);
  if (Array.isArray(f.circulos)) for (const c of f.circulos) if (c) ponto(c.centro);
  const saida = [];
  for (const b of brutas) {
    if (ids.has(b)) { saida.push(b); continue; }
    const i = b.lastIndexOf('.');
    if (i > 0 && ids.has(b.slice(0, i))) saida.push(b.slice(0, i));
  }
  return saida;
}

/* Ordem topológica estável: cada unidade depois das que ela usa como referência; num ciclo, o resto segue na ordem de
   declaração (e o ciclo vai em `avisos`). */
function ordenar(unidades, dependeDe) {
  const feitas = new Set();
  const ordem = [];
  const restantes = [...unidades];
  while (restantes.length > 0) {
    const k = restantes.findIndex((u) => [...dependeDe.get(u.id)].every((d) => feitas.has(d)));
    const u = restantes.splice(k < 0 ? 0 : k, 1)[0];
    if (k < 0) u.ciclo = true;
    feitas.add(u.id);
    ordem.push(u);
  }
  return ordem;
}

/* O aviso de dependência circular segue o estado das unidades: some quando um `--mover` desfaz o ciclo e volta se ele existe. */
const PREFIXO_DO_CICLO = 'dependência circular entre unidades';
export function sincronizarAvisoDeCiclo(estado) {
  const ciclos = (estado.unidades ?? []).filter((u) => u.ciclo).map((u) => u.id);
  estado.avisos = (estado.avisos ?? []).filter((a) => !a.startsWith(PREFIXO_DO_CICLO));
  if (ciclos.length) estado.avisos.push(`${PREFIXO_DO_CICLO} (${ciclos.map(abreviar).join(', ')}): a ordem segue a declaração`);
  return estado;
}

function dependenciasDasUnidades(unidades, formas) {
  const ids = new Set(formas.map((f) => f.id));
  const unidadeDe = new Map();
  for (const u of unidades) for (const m of u.membros) unidadeDe.set(m, u.id);
  const porId = new Map(formas.map((f) => [f.id, f]));
  const dependeDe = new Map(unidades.map((u) => [u.id, new Set()]));
  for (const u of unidades) {
    for (const m of u.membros) {
      for (const r of referenciasDaForma(porId.get(m) ?? {}, ids)) {
        const dono = unidadeDe.get(r);
        if (dono && dono !== u.id) dependeDe.get(u.id).add(dono);
      }
    }
  }
  return dependeDe;
}

const OPOSTO = { '+x': '-x', '-x': '+x', '+y': '-y', '-y': '+y', '+z': '-z', '-z': '+z' };
const EIXOS = ['x', 'y', 'z'];
const r1 = (x) => Math.round(x * 10) / 10;

/* O lado da forma de referência que fica encostado quando a forma anda em `direcao`: ela anda e para do lado oposto. */
function ladoDaDirecao(d) {
  if (typeof d === 'string') return OPOSTO[d] ?? null;
  if (Array.isArray(d) && d.length === 3 && d.every(Number.isFinite)) {
    const k = d.map((v, i) => [v, i]).filter(([v]) => Math.abs(v) > 1e-9);
    if (k.length === 1) return OPOSTO[`${k[0][0] > 0 ? '+' : '-'}${EIXOS[k[0][1]]}`];
  }
  return null;
}

/* As âncoras de outras formas que uma forma usa para se posicionar: [{ forma, ancora }]. `sobre`, `ponta` e `encosta` usam a
   face da referência (a de cima, o lado pedido, a oposta ao movimento); as demais citam "<id>.<ancora>" ou uma âncora com
   deslocamento. Uma citação de id sem âncora é só dependência, e não porta. */
function ancorasCitadas(f, ids) {
  const saida = [];
  const texto = (b) => {
    if (typeof b !== 'string' || ids.has(b)) return;
    const i = b.lastIndexOf('.');
    if (i > 0 && ids.has(b.slice(0, i))) saida.push({ forma: b.slice(0, i), ancora: b.slice(i + 1) });
  };
  const ponto = (v) => {
    if (typeof v === 'string') texto(v);
    else if (v && typeof v === 'object' && Array.isArray(v.entre)) v.entre.forEach(ponto);
    else if (v && typeof v === 'object' && typeof v.ancora === 'string') texto(v.ancora);
    else if (v && typeof v === 'object' && v.ponto !== undefined && v.nome !== undefined) ponto(v.ponto);
  };
  if (typeof f.sobre === 'string' && ids.has(f.sobre)) saida.push({ forma: f.sobre, ancora: '+y' });
  const ponta = Array.isArray(f.ponta) ? { id: f.ponta[0], lado: f.ponta[1] } : (f.ponta && typeof f.ponta === 'object' ? f.ponta : null);
  if (ponta && ids.has(ponta.id) && OPOSTO[ponta.lado]) saida.push({ forma: ponta.id, ancora: ponta.lado });
  if (f.encosta && ids.has(f.encosta.referencia) && ladoDaDirecao(f.encosta.direcao)) saida.push({ forma: f.encosta.referencia, ancora: ladoDaDirecao(f.encosta.direcao) });
  if (f.alinha) ponto(f.alinha.com);
  for (const k of ['centro', 'de', 'para']) if (f[k] !== undefined) ponto(f[k]);
  if (Array.isArray(f.caminho)) f.caminho.forEach(ponto);
  if (Array.isArray(f.circulos)) for (const c of f.circulos) if (c) ponto(c.centro);
  return saida;
}

/* O Envelope de cada unidade: a caixa que envolve as formas dela na maquete e as portas, que são as âncoras das formas dela
   que outras unidades usam. A versão detalhada da unidade cabe na caixa e mantém as portas nos mesmos pontos. */
function envelopesDasUnidades(unidades, formas, resolvidas) {
  if (!resolvidas) return new Map();
  const ids = new Set(formas.map((f) => f.id));
  const porId = new Map(formas.map((f) => [f.id, f]));
  const resolvida = new Map(resolvidas.map((r) => [r.id, r]));
  const unidadeDe = new Map();
  for (const u of unidades) for (const m of u.membros) unidadeDe.set(m, u.id);
  const portas = new Map(unidades.map((u) => [u.id, new Map()]));
  for (const u of unidades) {
    for (const m of u.membros) {
      for (const c of ancorasCitadas(porId.get(m) ?? {}, ids)) {
        const dono = unidadeDe.get(c.forma);
        if (!dono || dono === u.id) continue;
        const r = resolvida.get(c.forma);
        const ancoras = r ? ancorasDe(r) : null;
        if (!ancoras || !Object.hasOwn(ancoras, c.ancora)) continue;
        const chave = `${c.forma}\u0000${c.ancora}`;
        const mapa = portas.get(dono);
        if (!mapa.has(chave)) mapa.set(chave, { forma: c.forma, ancora: c.ancora, ponto: ancoras[c.ancora].map(r1), usadaPor: [] });
        const p = mapa.get(chave);
        if (!p.usadaPor.includes(u.id)) p.usadaPor.push(u.id);
      }
    }
  }
  const ordem = new Map(formas.map((f, i) => [f.id, i]));
  return new Map(unidades.map((u) => {
    const rs = u.membros.map((m) => resolvida.get(m)).filter(Boolean);
    const caixa = Object.fromEntries(EIXOS.map((e, k) => [e, rs.length ? [r1(Math.min(...rs.map((r) => r.min[k]))), r1(Math.max(...rs.map((r) => r.max[k])))] : [0, 0]]));
    const lista = [...portas.get(u.id).values()].sort((a, b) => ordem.get(a.forma) - ordem.get(b.forma) || (a.ancora < b.ancora ? -1 : a.ancora > b.ancora ? 1 : 0));
    /* a caixa de cada forma da unidade, para o Envelope por forma (o detalhado que declara `substitui`) */
    const formasDaUnidade = Object.fromEntries(u.membros.filter((m) => resolvida.has(m)).map((m) => { const r = resolvida.get(m); return [m, Object.fromEntries(EIXOS.map((e, k) => [e, [r1(r.min[k]), r1(r.max[k])]]))]; }));
    return [u.id, { caixa, portas: lista, formas: formasDaUnidade }];
  }));
}

function montarUnidades(unidades, formas, resolvidas) {
  const dependeDe = dependenciasDasUnidades(unidades, formas);
  const ordenadas = ordenar(unidades.map((u) => ({ ...u })), dependeDe);
  const envelopes = envelopesDasUnidades(ordenadas, formas, resolvidas);
  return ordenadas.map((u) => ({ id: u.id, membros: u.membros, depende: [...dependeDe.get(u.id)], custo: u.custo ?? u.membros.length, feito: u.feito === true, ...(u.declarada ? { declarada: true } : {}), ...(u.ciclo ? { ciclo: true } : {}), envelope: envelopes.get(u.id) }));
}

/* As unidades `{ id, membros, feito, declarada }` montadas de novo contra o esboço (dependências, ordem, custo e Envelope). */
export function montarUnidadesDoEstado(bruto, brutas, { opcao = 0 } = {}) {
  const e = expandirEsboco(bruto);
  const o = e.opcoes[opcao];
  return montarUnidades(brutas.filter((u) => u.membros.length > 0), o.formas.filter((f) => f.oculto !== true), resolverVisiveis(o, `opção ${opcao + 1}`, e.pontos));
}

/* As formas resolvidas e visíveis de uma opção, ou null se a geometria não resolve (o agrupamento não depende dela; só o
   Envelope, que fica sem caixa, e o Portão é quem recusa o esboço que não resolve). */
function resolverVisiveis(opcao, onde, pontos) {
  try {
    return resolverOpcao(opcao, onde, pontos).filter((r) => r.forma.oculto !== true);
  } catch (e) {
    if (e instanceof ErroDeEsboco) return null;
    throw e;
  }
}

/* O agrupamento automático não junta mais de metade das formas numa unidade só (nem menos de 4 formas num esboço pequeno):
   a união por `atravessa` que passaria do limite não acontece, e a fronteira do componente fica onde está. */
export const MINIMO_DO_LIMITE = 4;

/* As formas visíveis da opção (a primeira, por padrão) e o mapa de acoplamento apertado. A forma com `unidade` declarada
   (na forma, na instância de componente ou herdada do espelho) fica na unidade que declara. As outras se agrupam sozinhas:
   o componente inteiro é uma unidade, e `atravessa` declarado (o eixo no furo, a coroa na presilha) une as formas, desde
   que a unidade não passe de metade das formas. */
export function planoDeDetalhe(bruto, { opcao = 0 } = {}) {
  const esboco = expandirEsboco(bruto);
  const o = esboco.opcoes?.[opcao];
  exigir(o && Array.isArray(o.formas), `condutor: a opção ${opcao + 1} não existe ou não tem formas`);
  const formas = o.formas.filter((f) => f.oculto !== true);
  const declarada = unidadesDeclaradas(o.formas);
  const chaveDe = (f) => f.daInstancia?.id ?? f.id;
  const pai = new Map();
  const tamanho = new Map();
  const raizDe = (k) => { while (pai.get(k) !== k) { pai.set(k, pai.get(pai.get(k))); k = pai.get(k); } return k; };
  for (const f of formas) if (!declarada.has(f.id)) { const k = chaveDe(f); pai.set(k, pai.get(k) ?? k); tamanho.set(k, (tamanho.get(k) ?? 0) + 1); }
  const limite = Math.max(MINIMO_DO_LIMITE, Math.floor(formas.length / 2));
  const donoDe = new Map(formas.filter((f) => !declarada.has(f.id)).map((f) => [f.id, chaveDe(f)]));
  const raiz = lerContato(esboco.contato, 'esboço');
  const daOpcao = lerContato(o.contato, `opção ${opcao + 1}`);
  const pares = herdarDoEspelho([...(raiz?.pares ?? []), ...(daOpcao?.pares ?? [])], o).filter((p) => p.tipo === 'atravessa');
  for (const p of pares) {
    if (!donoDe.has(p.a) || !donoDe.has(p.b)) continue;
    const a = raizDe(donoDe.get(p.a)); const b = raizDe(donoDe.get(p.b));
    if (a === b || tamanho.get(a) + tamanho.get(b) > limite) continue;
    pai.set(b, a);
    tamanho.set(a, tamanho.get(a) + tamanho.get(b));
  }
  const chavesDaRaiz = new Map();
  for (const f of formas) {
    if (declarada.has(f.id)) continue;
    const r = raizDe(chaveDe(f));
    if (!chavesDaRaiz.has(r)) chavesDaRaiz.set(r, []);
    if (!chavesDaRaiz.get(r).includes(chaveDe(f))) chavesDaRaiz.get(r).push(chaveDe(f));
  }
  const grupos = new Map();
  for (const f of formas) {
    const id = declarada.has(f.id) ? declarada.get(f.id) : chavesDaRaiz.get(raizDe(chaveDe(f))).join('+');
    if (!grupos.has(id)) grupos.set(id, { id, membros: [], declarada: false });
    const g = grupos.get(id);
    g.membros.push(f.id);
    if (declarada.has(f.id)) g.declarada = true;
  }
  const resolvidas = resolverVisiveis(o, `opção ${opcao + 1}`, esboco.pontos);
  const unidades = montarUnidades([...grupos.values()], formas, resolvidas);
  return { opcao: o.titulo ?? `Opção ${opcao + 1}`, unidades, formas: formas.map((f) => f.id) };
}

/* formaId -> unidade do estado do Condutor (o Plano de detalhe, com as mudanças de `--mover`), para o gate. */
export function unidadesDoEstado(estado) {
  return Object.fromEntries((estado?.unidades ?? []).flatMap((u) => u.membros.map((m) => [m, u.id])));
}

/* Mede o esboço para o Portão: divergências (gate, soltas, atravessamentos, medidas, contrato) e o que o nível pede do plano. */
function medirParaOPortao(bruto, estado, referencias) {
  const nivel = estado.nivel;
  const medido = medirEsboco(bruto, { projecao: false, referencias, unidades: unidadesDoEstado(estado) });
  const { descricao, plano } = medido;
  /* a silhueta contra a referência é coisa da Conferência da maquete: na Maquete ainda se constrói, a menos que o nível
     não tenha Conferência (o esquemático) */
  const cobraReferencia = estado.atual !== 'maquete' || !estado.estagios.includes('conferencia-da-maquete');
  const divergencias = cobraReferencia ? medido.divergencias : medido.divergencias.filter((d) => d.classe !== 'referencia' && d.classe !== 'peca');
  const falta = [];
  for (const o of descricao.opcoes) if (!o.gate.declarado && o.formas.length >= 4) falta.push(`o gate de contato não está ligado na opção "${o.titulo}" (contato.usar: true; a política liga a partir de 4 formas)`);
  for (const d of divergencias) falta.push(`[${d.n}] ${d.classe}: ${d.texto}`);
  const exige = EXIGENCIAS_POR_NIVEL[nivel];
  if (plano.resumo.medidas < exige.medidas) falta.push(`o plano declara ${plano.resumo.medidas} medida${plano.resumo.medidas === 1 ? '' : 's'} nomeada${plano.resumo.medidas === 1 ? '' : 's'} e o nível ${nivel} pede pelo menos ${exige.medidas} (plano.medidas: nome, valor, unidade, origem e mede)`);
  if (plano.resumo.relacoes < exige.relacoes) falta.push(`o nível ${nivel} pede o contrato de relações declarado (plano.contrato: tocam, livres, simetricas) e ele está vazio`);
  return { falta, divergencias, resumo: plano.resumo };
}

/* Custo estimado: o número de formas das unidades (feito e total). */
export function custoDe(estado) {
  const unidades = estado.unidades ?? [];
  const total = unidades.reduce((s, u) => s + u.custo, 0);
  const feito = unidades.filter((u) => u.feito).reduce((s, u) => s + u.custo, 0);
  return { total, feito, percentual: total === 0 ? 0 : Math.round((feito / total) * 1000) / 10 };
}

function estagiosDoNivel(nivel) { return [...ESTAGIOS_POR_NIVEL[nivel]]; }

/* Estado novo, no primeiro estágio do nível do plano (`medio` se o plano não declara). */
export function criarEstado(bruto, arquivo) {
  const plano = lerPlano(bruto?.plano);
  const nivel = plano?.nivel ?? NIVEL_PADRAO;
  return { versao: 1, esboco: arquivo, nivel, nivelDoPlano: plano?.nivel !== undefined, estagios: estagiosDoNivel(nivel), atual: estagiosDoNivel(nivel)[0], historico: [], unidades: [], alteracoes: [], marcos: [], avisos: [] };
}

/* O nível declarado no plano pode mudar entre uma chamada e outra: os estágios seguem o nível, e se o estágio atual saiu
   da lista o estado vai para o próximo que continua ligado. */
function sincronizarNivel(estado, bruto) {
  const plano = lerPlano(bruto?.plano);
  const nivel = plano?.nivel ?? estado.nivel;
  if (nivel === estado.nivel) return estado;
  const novo = clone(estado);
  novo.avisos.push(`o nível mudou de ${estado.nivel} para ${nivel}: os estágios ligados passam a ser ${estagiosDoNivel(nivel).map(nomeDoEstagio).join(', ')}`);
  novo.nivel = nivel; novo.nivelDoPlano = true; novo.estagios = estagiosDoNivel(nivel);
  if (novo.atual !== CONCLUIDO && !novo.estagios.includes(novo.atual)) {
    const depois = ORDEM_DOS_ESTAGIOS.slice(ORDEM_DOS_ESTAGIOS.indexOf(novo.atual) + 1).find((e) => novo.estagios.includes(e));
    novo.atual = depois ?? CONCLUIDO;
  }
  return novo;
}

/* O Portão do estágio atual: { estagio, passa, falta }. `falta` diz, em frases, o que impede o próximo estágio. */
export function portaoDoEstagio(bruto, estadoBruto, { referencias } = {}) {
  const estado = sincronizarNivel(estadoBruto, bruto);
  if (estado.atual === CONCLUIDO) return { estagio: CONCLUIDO, passa: true, falta: [] };
  const { falta, divergencias, resumo } = medirParaOPortao(bruto, estado, referencias);
  if (['plano-de-detalhe', 'detalhe-por-unidade', 'montagem'].includes(estado.atual)) {
    const atuais = planoDeDetalhe(bruto).formas;
    const nas = new Set(estado.unidades.flatMap((u) => u.membros));
    const novas = atuais.filter((id) => !nas.has(id));
    const saidas = [...nas].filter((id) => !atuais.includes(id));
    if (novas.length || saidas.length) falta.push(`as formas mudaram desde o Plano de detalhe (${novas.length ? `sem unidade: ${novas.join(', ')}` : ''}${novas.length && saidas.length ? '; ' : ''}${saidas.length ? `que não existem mais: ${saidas.join(', ')}` : ''}); refaça o agrupamento com --replanejar e um "motivo" de pelo menos ${MINIMO_DO_MOTIVO} caracteres`);
  }
  const envelopeDeclarado = lerPlano(bruto?.plano)?.envelope !== undefined;
  if (estado.atual === 'detalhe-por-unidade') {
    const pendentes = estado.unidades.filter((u) => !u.feito).map((u) => u.id);
    if (pendentes.length) falta.push(`${pendentes.length} ${pendentes.length === 1 ? 'unidade' : 'unidades'} de detalhe sem marcar como feita (--feito <unidade>): ${pendentes.join(', ')}`);
    /* com `plano.envelope` declarado, a versão detalhada de cada unidade tem de caber no Envelope e manter as portas */
    if (envelopeDeclarado) {
      const sem = estado.unidades.filter((u) => !u.envelopeConferido?.ok).map((u) => u.id);
      if (sem.length) falta.push(`${sem.length} ${sem.length === 1 ? 'unidade' : 'unidades'} sem o Envelope conferido (--envelope <unidade> <arquivo-detalhado.esboco.json>): ${sem.join(', ')}`);
    }
  }
  return { estagio: estado.atual, passa: falta.length === 0, falta, divergencias, resumo, ...(envelopeDeclarado ? { envelopeDeclarado: true } : {}) };
}

/* Avança se o Portão passa. Devolve { ok, estado, portao }; sem passar o estado não muda e `portao.falta` diz o que falta. */
export function avancar(bruto, estadoBruto, { referencias } = {}) {
  const estado = sincronizarNivel(estadoBruto, bruto);
  const portao = portaoDoEstagio(bruto, estado, { referencias });
  if (estado.atual === CONCLUIDO) return { ok: false, estado, portao, concluido: true };
  const barrado = bloqueiosDaNota(estado);
  if (barrado.length > 0) return { ok: false, estado, portao, bloqueio: `condutor: ${barrado.map(textoDoBloqueio).join('; ')}` };
  if (!portao.passa) return { ok: false, estado, portao };
  const novo = clone(estado);
  const i = novo.estagios.indexOf(novo.atual);
  const proximo = novo.estagios[i + 1] ?? CONCLUIDO;
  novo.historico.push({ passo: novo.historico.length + 1, de: novo.atual, para: proximo });
  novo.atual = proximo;
  if (proximo === 'plano-de-detalhe') {
    const p = planoDeDetalhe(bruto);
    novo.opcao = p.opcao;
    novo.unidades = p.unidades;
    novo.alteracoes = [];
    novo.marcos = [];
    sincronizarAvisoDeCiclo(novo);
  }
  return { ok: true, estado: novo, portao };
}

const validarMotivo = (motivo, o) => {
  const m = typeof motivo === 'string' ? motivo.trim() : '';
  exigir(m.length >= MINIMO_DO_MOTIVO, `condutor: ${o} exige "motivo" de pelo menos ${MINIMO_DO_MOTIVO} caracteres${motivo === undefined ? ' (falta o campo)' : ` (veio ${m.length})`}; diga por que o agrupamento muda`);
  return m;
};

/* As formas de uma unidade que um alvo de `--mover` designa: o id de uma forma, o id de uma instância de componente (todas as
   formas dela, `garfoE.*`) ou um padrão com `*` (`garfoE.*`, `*.pneu`). */
export function formasDoAlvo(alvo, membros) {
  exigir(typeof alvo === 'string' && alvo, 'condutor: --mover precisa de uma forma, uma instância ou um padrão');
  if (membros.includes(alvo)) return [alvo];
  if (alvo.includes('*')) {
    const re = new RegExp(`^${alvo.split('*').map((t) => t.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
    const casadas = membros.filter((m) => re.test(m));
    exigir(casadas.length > 0, `condutor: o padrão "${alvo}" não casa com nenhuma forma de nenhuma unidade (formas: ${membros.join(', ')})`);
    return casadas;
  }
  const daInstancia = membros.filter((m) => m.startsWith(`${alvo}.`));
  exigir(daInstancia.length > 0, `condutor: "${alvo}" não é uma forma de nenhuma unidade${quisDizer(alvo, membros)} (formas: ${membros.join(', ')})`);
  return daInstancia;
}

/* Muda o agrupamento: as formas vão para outra Unidade de detalhe (uma existente, ou uma nova com o nome dado). `formas` é uma
   lista de alvos (ver `formasDoAlvo`), e `padrao` um alvo só; `forma` é o alvo único de antes. Só no estágio Plano de
   detalhe e com `motivo` de pelo menos 15 caracteres. Devolve o estado novo. */
export function moverFormas(bruto, estadoBruto, { forma, formas, padrao, para, motivo }) {
  const estado = sincronizarNivel(estadoBruto, bruto);
  exigir(estado.atual === 'plano-de-detalhe', `condutor: o agrupamento só muda no estágio Plano de detalhe (o estágio atual é ${nomeDoEstagio(estado.atual)})`);
  const m = validarMotivo(motivo, 'mudar o agrupamento');
  const alvos = [forma, ...(Array.isArray(formas) ? formas : []), padrao].filter((x) => x !== undefined);
  exigir(alvos.length > 0, 'condutor: --mover precisa de uma forma, uma instância de componente ou um padrão (garfoE.*)');
  exigir(typeof para === 'string' && para, 'condutor: --mover <forma> --para <unidade> precisa da unidade de destino (uma existente ou um nome novo)');
  const membros = estado.unidades.flatMap((u) => u.membros);
  const escolhidas = [...new Set(alvos.flatMap((x) => formasDoAlvo(x, membros)))];
  const de = new Map(estado.unidades.flatMap((u) => u.membros.map((x) => [x, u.id])));
  const a_mover = escolhidas.filter((x) => de.get(x) !== para);
  exigir(a_mover.length > 0, escolhidas.length === 1 ? `condutor: "${escolhidas[0]}" já está na unidade "${para}"` : `condutor: as ${escolhidas.length} formas já estão na unidade "${para}"`);
  const saem = new Set(a_mover);
  const brutas = estado.unidades.map((u) => ({ id: u.id, membros: u.membros.filter((x) => !saem.has(x)), feito: u.feito, declarada: u.declarada }));
  const destino = brutas.find((u) => u.id === para);
  if (destino) destino.membros.push(...a_mover); else brutas.push({ id: para, membros: [...a_mover], feito: false });
  const expandido = expandirEsboco(bruto);
  const visiveis = expandido.opcoes[0].formas.filter((f) => f.oculto !== true);
  const resolvidas = resolverVisiveis(expandido.opcoes[0], 'opção 1', expandido.pontos);
  const novo = clone(estado);
  novo.unidades = montarUnidades(brutas.filter((u) => u.membros.length > 0), visiveis, resolvidas);
  for (const x of a_mover) novo.alteracoes.push({ forma: x, de: de.get(x), para, motivo: m });
  return sincronizarAvisoDeCiclo(novo);
}

/* `moverFormas` para uma forma só (a chamada de antes). */
export function moverForma(bruto, estadoBruto, { forma, para, motivo }) {
  return moverFormas(bruto, estadoBruto, { forma, para, motivo });
}

/* Uma lista de movimentos `{ formas | forma | padrao, para, motivo }`, aplicada em ordem; se um falha, nenhum vale. */
export function moverEmLote(bruto, estadoBruto, movimentos) {
  exigir(Array.isArray(movimentos) && movimentos.length > 0, 'condutor: --mover-lote precisa de uma lista não vazia de { "formas" | "padrao", "para", "motivo" }');
  let estado = estadoBruto;
  movimentos.forEach((mv, i) => {
    exigir(mv && typeof mv === 'object' && !Array.isArray(mv), `condutor: --mover-lote, movimento ${i + 1}: deve ser { "formas": ["a", "b"] | "padrao": "garfoE.*", "para": "unidade", "motivo": "..." }`);
    try { estado = moverFormas(bruto, estado, mv); } catch (e) {
      if (e instanceof ErroDeEsboco) throw new ErroDeEsboco(`${e.message} (--mover-lote, movimento ${i + 1})`);
      throw e;
    }
  });
  return estado;
}

/* Refaz o Plano de detalhe (as formas do esboço mudaram) e exige `motivo`. A forma que continua existindo fica na unidade
   em que estava; a forma com `unidade` declarada vai para a que declara; só as formas novas, sem declaração, recebem
   unidade (a do vizinho do mesmo agrupamento automático ou uma nova), e vão listadas em `novas` da alteração. */
export function replanejar(bruto, estadoBruto, { motivo }) {
  const estado = sincronizarNivel(estadoBruto, bruto);
  exigir(['plano-de-detalhe', 'detalhe-por-unidade', 'montagem'].includes(estado.atual), `condutor: só há Plano de detalhe a refazer depois dele (o estágio atual é ${nomeDoEstagio(estado.atual)})`);
  const m = validarMotivo(motivo, 'refazer o Plano de detalhe');
  const p = planoDeDetalhe(bruto);
  const antigoDe = new Map(estado.unidades.flatMap((u) => u.membros.map((x) => [x, u.id])));
  const autoDe = new Map(p.unidades.flatMap((u) => u.membros.map((x) => [x, u])));
  const grupo = new Map();
  const novas = [];
  for (const id of p.formas) {
    const auto = autoDe.get(id);
    let unidade;
    if (auto.declarada) unidade = auto.id;
    else if (antigoDe.has(id)) unidade = antigoDe.get(id);
    else {
      const vizinha = auto.membros.find((x) => antigoDe.has(x) && !autoDe.get(x).declarada);
      unidade = vizinha !== undefined ? antigoDe.get(vizinha) : auto.id;
      novas.push({ forma: id, unidade });
    }
    if (!grupo.has(unidade)) grupo.set(unidade, { id: unidade, membros: [], declarada: false, feito: estado.unidades.find((u) => u.id === unidade)?.feito === true });
    grupo.get(unidade).membros.push(id);
    /* o custo é o da maquete: a forma que o detalhe trouxe não o aumenta, e a forma nova do esboço acrescenta uma unidade de custo */
    const antigaDaUnidade = estado.unidades.find((u) => u.id === unidade);
    if (antigaDaUnidade) { const g = grupo.get(unidade); g.custo = (g.custo ?? antigaDaUnidade.custo) + (novas.some((n) => n.forma === id) ? 1 : 0); }
    if (auto.declarada) grupo.get(unidade).declarada = true;
  }
  const expandido = expandirEsboco(bruto);
  const visiveis = expandido.opcoes[0].formas.filter((f) => f.oculto !== true);
  const resolvidas = resolverVisiveis(expandido.opcoes[0], 'opção 1', expandido.pontos);
  const novo = clone(estado);
  novo.unidades = montarUnidades([...grupo.values()], visiveis, resolvidas).map((u) => {
    const antiga = estado.unidades.find((x) => x.id === u.id);
    /* a unidade conferida guarda o Envelope da maquete: o esboço de agora pode já ter o detalhe dela */
    if (antiga?.envelopeConferido?.ok && antiga.envelope) return { ...u, envelope: antiga.envelope, envelopeConferido: antiga.envelopeConferido };
    const igual = antiga?.envelopeConferido && JSON.stringify(antiga.envelope) === JSON.stringify(u.envelope);
    return { ...u, ...(igual ? { envelopeConferido: antiga.envelopeConferido } : {}) };
  });
  novo.alteracoes.push({ replanejado: true, motivo: m, ...(novas.length ? { novas } : {}) });
  return sincronizarAvisoDeCiclo(novo);
}

/* A unidade que um nome designa: o id exato; o nome de uma forma ou de uma instância que só uma unidade contém (`rodaFrente`
   para `rodaFrente+eixoFrente+...`); ou o primeiro nome de um id composto. Sem correspondência única devolve o próprio nome,
   e a recusa de quem chama diz quais unidades existem. */
export function unidadePorNome(unidades, nome) {
  if (unidades.some((u) => u.id === nome)) return nome;
  for (const acha of [(u) => u.id.startsWith(`${nome}+`), (u) => u.membros.includes(nome) || u.membros.some((m) => m.startsWith(`${nome}.`))]) {
    const c = unidades.filter(acha);
    if (c.length === 1) return c[0].id;
  }
  return nome;
}

/* As divergências do gate de contato do mestre que citam formas da unidade: a unidade só vira feita quando o mestre, com a
   versão dela, não tem colisão, travessia acima do máximo, par que não encosta nem peça solta que a envolva. Sem o gate
   ligado não há o que conferir. */
function achadosDaUnidade(bruto, estado, unidade) {
  const membros = new Set(estado.unidades.find((x) => x.id === unidade).membros);
  const gate = verificarContato(bruto, { unidades: unidadesDoEstado(estado) });
  return gate.usar ? gate.achados.filter((a) => a.pecas.some((p) => membros.has(p))) : [];
}

/* Os bloqueios pela nota do crítico: cada unidade com brief (mais de 8 formas) e cada Marco cujo último veredito, depois da última
   liberação, está abaixo de 8. `rodada` conta os vereditos desde a última liberação; com `RODADAS_DO_CRITICO` rodadas o bloqueio é
   `travado` e só sai com `liberar`. Estado sem `vereditos` (versão 1) não bloqueia nada. Ordem determinística: a dos vereditos. */
export function bloqueiosDaNota(estado) {
  const comBrief = new Set((estado.unidades ?? []).filter((u) => u.membros.length > LIMITE_DA_FUNCAO).map((u) => u.id));
  const ids = [...new Set((estado.vereditos ?? []).map((v) => v.unidade))].filter((id) => /^marco-\d+$/.test(id) || comBrief.has(id));
  const saida = [];
  for (const id of ids) {
    const lib = (estado.liberacoes ?? []).filter((l) => l.unidade === id).reduce((m, l) => Math.max(m, l.aposVeredito), 0);
    const vs = estado.vereditos.filter((v) => v.unidade === id && v.ordem > lib);
    if (vs.length === 0 || vs[vs.length - 1].nota >= NOTA_MINIMA) continue;
    saida.push({ unidade: id, nota: vs[vs.length - 1].nota, rodada: vs.length, travado: vs.length >= RODADAS_DO_CRITICO });
  }
  return saida;
}

const nota1 = (n) => String(n).replace('.', ',');
export function textoDoBloqueio(b) {
  const marco = /^marco-/.test(b.unidade);
  const o = `a unidade "${abreviar(b.unidade)}"`.replace(/a unidade "(marco-\d+)"/, 'o $1');
  const rodada = `${Math.min(b.rodada, RODADAS_DO_CRITICO)} de ${RODADAS_DO_CRITICO}`;
  if (b.travado) return `${o} tirou nota ${nota1(b.nota)} (abaixo de ${NOTA_MINIMA}) na rodada ${rodada} e está travada: o fluxo só segue com --condutor <arquivo> --liberar ${b.unidade} --motivo <texto>, e a liberação exige pedir autorização explícita à pessoa antes (o motivo é o que ela disser)`;
  return `${o} tirou nota ${nota1(b.nota)} (abaixo de ${NOTA_MINIMA}) na rodada ${rodada}: ${marco ? 'corrija as unidades apontadas pelo crítico e chame o crítico do Marco de novo (--veredito)' : `refaça a unidade, rode --feito ${b.unidade} de novo e registre o novo veredito do crítico`}`;
}

function exigirNotaLivre(estado, { exceto } = {}) {
  const b = bloqueiosDaNota(estado).filter((x) => x.unidade !== exceto || x.travado);
  exigir(b.length === 0, `condutor: ${b.map(textoDoBloqueio).join('; ')}`);
}

/* Libera uma unidade ou Marco travado (três vereditos abaixo de 8 desde a última liberação). Grava em `liberacoes` (versão 3 do
   estado) o motivo, que é o que a pessoa autorizou, e o veredito até onde ela vale. */
export function liberar(estadoBruto, { unidade, motivo }) {
  const doMarco = /^marco-(\d+)$/.test(String(unidade));
  const id = doMarco ? String(unidade) : unidadePorNome(estadoBruto.unidades ?? [], unidade);
  const b = bloqueiosDaNota(estadoBruto).find((x) => x.unidade === id);
  exigir(b !== undefined, `condutor: "${abreviar(String(unidade))}" não está bloqueada pela nota do crítico; não há o que liberar${bloqueiosDaNota(estadoBruto).length ? ` (bloqueadas: ${bloqueiosDaNota(estadoBruto).map((x) => x.unidade).join(', ')})` : ''}`);
  exigir(b.travado, `condutor: --liberar só vale depois de ${RODADAS_DO_CRITICO} vereditos abaixo de ${NOTA_MINIMA} na mesma unidade, e "${abreviar(id)}" está na rodada ${b.rodada} de ${RODADAS_DO_CRITICO}: ${textoDoBloqueio(b)}`);
  const m = typeof motivo === 'string' ? motivo.trim() : '';
  exigir(m.length >= MINIMO_DO_MOTIVO, `condutor: --liberar exige --motivo de pelo menos ${MINIMO_DO_MOTIVO} caracteres com a autorização que a pessoa deu${motivo === undefined ? ' (falta o campo)' : ` (veio ${m.length})`}`);
  const novo = clone(estadoBruto);
  novo.versao = Math.max(3, novo.versao ?? 1);
  const ultimo = novo.vereditos[novo.vereditos.length - 1].ordem;
  novo.liberacoes = [...(novo.liberacoes ?? []), { ordem: (novo.liberacoes ?? []).length + 1, unidade: id, nota: b.nota, rodadas: b.rodada, aposVeredito: ultimo, motivo: m }];
  return novo;
}

/* Marca uma unidade como detalhada e registra o Marco (25%, 50%, 75%, 100% do custo estimado) que ela cruzou. O custo é o da
   maquete (`--integrar` não o aumenta), e um salto por vários limiares registra só o mais alto, com os pulados em `saltou`:
   o crítico é chamado uma vez com as imagens de agora. A unidade com achado aberto do gate no mestre é recusada, com o achado. */
export function marcarFeito(bruto, estadoBruto, nomeDaUnidade) {
  const estado = sincronizarNivel(estadoBruto, bruto);
  const unidade = unidadePorNome(estado.unidades ?? [], nomeDaUnidade);
  exigir(estado.atual === 'detalhe-por-unidade', `condutor: --feito vale no estágio Detalhe por unidade (o estágio atual é ${nomeDoEstagio(estado.atual)})`);
  const ids = estado.unidades.map((u) => u.id);
  exigir(ids.includes(unidade), `condutor: "${unidade}" não é uma unidade de detalhe${quisDizer(unidade, ids)} (unidades: ${ids.map(abreviar).join(', ')})`);
  exigirNotaLivre(estado, { exceto: unidade });
  if (lerPlano(bruto?.plano)?.envelope !== undefined) {
    const conferida = estado.unidades.find((x) => x.id === unidade).envelopeConferido;
    exigir(conferida?.ok === true, `condutor: a unidade "${unidade}" só vira feita depois de o Envelope conferir a versão detalhada dela (plano.envelope está declarado): rode --envelope ${unidade} <arquivo-detalhado.esboco.json>${conferida ? `; a última conferência falhou: ${conferida.falta.join('; ')}` : ''}`);
  }
  const daUnidade = estado.unidades.find((x) => x.id === unidade);
  if (!daUnidade.feito && daUnidade.membros.length > LIMITE_DA_FUNCAO && funcaoDaUnidade(bruto, unidade) === undefined) {
    throw new ErroDeEsboco(`condutor: a unidade "${abreviar(unidade)}" tem ${daUnidade.membros.length} formas (mais de ${LIMITE_DA_FUNCAO}) e não declara "funcao": escreva uma frase que diga para que ela serve em unidades["${unidade}"].funcao na raiz do esboço (por exemplo { "funcao": "laço fechado que contorna duas rodas" }); o crítico por unidade e quem lê o esboço dependem dela`);
  }
  if (!daUnidade.feito) {
    const abertos = achadosDaUnidade(bruto, estado, unidade);
    exigir(abertos.length === 0, `condutor: a unidade "${abreviar(unidade)}" tem ${abertos.length} ${abertos.length === 1 ? 'achado aberto' : 'achados abertos'} do gate de contato no mestre e não vira feita assim (${abertos.slice(0, 5).map((a) => descreverAchado(a)).join('; ')}${abertos.length > 5 ? `; e mais ${abertos.length - 5}` : ''}): corrija a versão detalhada, rode --integrar de novo e marque a unidade depois`);
  }
  const novo = clone(estado);
  const u = novo.unidades.find((x) => x.id === unidade);
  const novosMarcos = [];
  if (!u.feito) {
    u.feito = true;
    const { total, feito } = custoDe(novo);
    const fracao = total === 0 ? 0 : (feito / total) * 100;
    const cruzados = LIMIARES_DO_MARCO.filter((limiar) => fracao >= limiar - 1e-9 && !novo.marcos.some((m) => m.limiar >= limiar));
    if (cruzados.length > 0) {
      const limiar = Math.max(...cruzados);
      const marco = { limiar, custoFeito: feito, custoTotal: total, unidades: novo.unidades.filter((x) => x.feito).map((x) => x.id), chamar: 'critico', imagens: 'limpas', ...(cruzados.length > 1 ? { saltou: cruzados.filter((l) => l !== limiar) } : {}) };
      novo.marcos.push(marco); novosMarcos.push(marco);
    }
  }
  return { estado: novo, novosMarcos };
}

/* As unidades que o Marco de `limiar`% fechou: as feitas até ele menos as dos Marcos de limiar menor. */
export function unidadesNovasDoMarco(estado, limiar) {
  const marco = (estado.marcos ?? []).find((m) => m.limiar === limiar);
  if (!marco) return [];
  const antes = new Set((estado.marcos ?? []).filter((m) => m.limiar < limiar).flatMap((m) => m.unidades));
  return marco.unidades.filter((u) => !antes.has(u));
}

/* Registra o veredito do crítico visual cego de uma unidade no histórico do estado (`vereditos`, campo que a versão 2 do estado
   acrescenta; `liberacoes` é da versão 3. Estado de versão 1 ou 2 continua válido: os campos novos são opcionais, e a regra da nota vale também sobre vereditos antigos). `nota` de 0 a 10 e `motivo` com o que o
   crítico apontou (pelo menos 15 caracteres). Devolve o estado novo. */
export function registrarVeredito(estadoBruto, { unidade, nota, motivo }) {
  const ids = (estadoBruto.unidades ?? []).map((u) => u.id);
  /* `marco-50` é o veredito do crítico do Marco de 50%, que precisa estar registrado */
  const doMarco = /^marco-(\d+)$/.exec(String(unidade));
  const id = doMarco ? `marco-${doMarco[1]}` : unidadePorNome(estadoBruto.unidades ?? [], unidade);
  if (doMarco) exigir((estadoBruto.marcos ?? []).some((m) => m.limiar === Number(doMarco[1])), `condutor: o Marco ${doMarco[1]}% não foi registrado (marcos registrados: ${(estadoBruto.marcos ?? []).map((m) => `marco-${m.limiar}`).join(', ') || 'nenhum'})`);
  else exigir(ids.includes(id), `condutor: "${unidade}" não é uma unidade de detalhe${quisDizer(String(unidade), ids)} (unidades: ${ids.map(abreviar).join(', ')})`);
  const n = Number(nota);
  exigir(Number.isFinite(n) && n >= 0 && n <= 10, `condutor: --veredito precisa de --nota entre 0 e 10 (a nota do crítico), e veio ${JSON.stringify(nota)}`);
  const m = validarMotivo(motivo, 'registrar o veredito do crítico (--motivo: o que ele apontou)');
  const novo = clone(estadoBruto);
  novo.versao = Math.max(2, novo.versao ?? 1);
  novo.vereditos = [...(novo.vereditos ?? []), { ordem: (novo.vereditos ?? []).length + 1, unidade: id, nota: n, motivo: m }];
  return novo;
}

/* Texto da situação: estágio, Portão e o que falta, unidades e custo. */
/* `historico` mostra também as linhas de "agrupamento alterado" (uma por forma movida), que a leitura padrão omite. */
/* Nome de unidade com no máximo 48 caracteres: o agrupamento automático de um conjunto grande junta dezenas de nomes. */
export const LIMITE_DO_NOME = 48;
export const abreviar = (nome) => (typeof nome === 'string' && nome.length > LIMITE_DO_NOME ? `${nome.slice(0, LIMITE_DO_NOME - 1)}…` : nome);

export function formatarSituacao(estado, portao, { historico = false, marcos = true } = {}) {
  const n = (x) => String(x).replace('.', ',');
  const L = [];
  L.push(`condutor de ${estado.esboco}: nível ${estado.nivel}${estado.nivelDoPlano ? '' : ' (padrão; declare plano.nivel)'}`);
  L.push(`estágios: ${estado.estagios.map((e) => (e === estado.atual ? `[${nomeDoEstagio(e)}]` : nomeDoEstagio(e))).join(' > ')}${estado.atual === CONCLUIDO ? ' > [Concluído]' : ''}`);
  if (estado.atual === CONCLUIDO) L.push('o fluxo terminou: todos os Portões dos estágios ligados passaram');
  else L.push(`Portão de ${nomeDoEstagio(estado.atual)}: ${portao.passa ? 'passa (--proximo avança)' : 'não passa, falta:'}`);
  if (estado.atual !== CONCLUIDO && !portao.passa) for (const f of portao.falta) L.push(`  - ${f}`);
  if (estado.unidades.length > 0) {
    const c = custoDe(estado);
    L.push(`unidades de detalhe (${estado.unidades.length}, custo estimado ${c.total} formas, feito ${c.feito}, ${n(c.percentual)}%), na ordem de dependência:`);
    estado.unidades.forEach((u, i) => {
      L.push(`  ${i + 1}. ${abreviar(u.id)}: ${u.custo} ${u.custo === 1 ? 'forma' : 'formas'}${u.declarada ? ' (declarada)' : ''}${u.depende.length ? `, depende de ${u.depende.slice(0, 4).map(abreviar).join(', ')}${u.depende.length > 4 ? ` e mais ${u.depende.length - 4}` : ''}` : ''}${u.feito ? ' [feita]' : ''}${u.ciclo ? ' [ciclo]' : ''}`);
      if (portao?.envelopeDeclarado && u.envelope) L.push(`     ${textoDoEnvelope(u.envelope, { curto: true })}${u.envelopeConferido ? (u.envelopeConferido.ok ? ` [envelope conferido com ${u.envelopeConferido.arquivo}]` : ` [envelope reprovado com ${u.envelopeConferido.arquivo}]`) : ' [envelope a conferir]'}`);
    });
  }
  if (marcos) for (const m of estado.marcos ?? []) L.push(`marco de ${m.limiar}%: chamar o crítico visual sem contexto, com imagens limpas (registrado; o despacho é da skill)`);
  if (historico) for (const v of estado.vereditos ?? []) L.push(`veredito do crítico ${v.ordem}: ${abreviar(v.unidade)} nota ${String(v.nota).replace('.', ',')} (${v.motivo})`);
  if (historico) for (const l of estado.liberacoes ?? []) L.push(`liberação ${l.ordem}: ${abreviar(l.unidade)} (nota ${nota1(l.nota)} em ${l.rodadas} rodadas) liberada com o motivo: ${l.motivo}`);
  if (historico) for (const a of estado.alteracoes ?? []) if (a.forma !== undefined) L.push(`agrupamento alterado: ${a.forma} de ${abreviar(a.de)} para ${abreviar(a.para)} (${a.motivo})`);
  for (const a of estado.avisos ?? []) L.push(`aviso: ${a}`);
  return `${L.join('\n')}\n`;
}

const faixa = (f) => `${n1(f[0])}..${n1(f[1])}`;
const n1 = (x) => String(r1(x)).replace('.', ',');

/* Uma linha com a caixa e as portas de um Envelope. */
export function textoDoEnvelope(e, { curto = false } = {}) {
  /* curto: nomes de unidade abreviados e no máximo 3 por porta (um agrupamento grande cita dezenas) */
  const quem = (u) => (curto ? `${u.slice(0, 3).map(abreviar).join(', ')}${u.length > 3 ? ` e mais ${u.length - 3}` : ''}` : u.join(', '));
  return `envelope: x ${faixa(e.caixa.x)} y ${faixa(e.caixa.y)} z ${faixa(e.caixa.z)}; ${e.portas.length === 0 ? 'sem portas' : `portas ${e.portas.map((p) => `${p.forma}.${p.ancora} [${p.ponto.map(n1).join(' ')}] (usada por ${quem(p.usadaPor)})`).join('; ')}`}`;
}

/* Confere que a versão detalhada de uma unidade (um esboço à parte, `detalhado`) cabe no Envelope que a maquete deu a ela e
   mantém as portas nos mesmos pontos. A tolerância é `plano.envelope.tolerancia` da maquete (em mm) ou, sem ela, 1% da maior
   dimensão da caixa (no mínimo 1 mm). A versão detalhada usa a opção de mesmo título da maquete (ou a primeira) e precisa ter
   as formas e as âncoras das portas com os mesmos nomes. Devolve { unidade, ok, tolerancia_mm, tolerancia_declarada, caixa,
   portas, falta }; não lê nem grava arquivo. */
export function conferirEnvelope(bruto, estadoBruto, nomeDaUnidade, detalhado) {
  const unidades = estadoBruto?.unidades?.length ? estadoBruto.unidades : planoDeDetalhe(bruto).unidades;
  const unidade = unidadePorNome(unidades, nomeDaUnidade);
  const ids = unidades.map((u) => u.id);
  exigir(ids.includes(unidade), `condutor: "${unidade}" não é uma unidade de detalhe${quisDizer(unidade, ids)} (unidades: ${ids.map(abreviar).join(', ')})`);
  const u = unidades.find((x) => x.id === unidade);
  exigir(u.envelope, `condutor: a unidade "${unidade}" não tem Envelope gravado (o estado é de antes do Envelope): refaça o Plano de detalhe com --replanejar e um motivo`);
  const plano = lerPlano(bruto?.plano);
  const maior = Math.max(...EIXOS.map((e) => u.envelope.caixa[e][1] - u.envelope.caixa[e][0]), 0);
  const declarada = plano?.envelope?.tolerancia;
  const tolerancia = declarada ?? Math.max(1, 0.01 * maior);
  /* o Envelope mede geometria: o contato do detalhado (juntas e pares que citam formas trocadas) não entra na conta */
  const semContato = { ...detalhado, contato: undefined, opcoes: Array.isArray(detalhado?.opcoes) ? detalhado.opcoes.map((o) => (o && typeof o === 'object' ? { ...o, contato: undefined } : o)) : detalhado?.opcoes };
  const expandido = expandirEsboco(semContato);
  const opcoes = Array.isArray(expandido.opcoes) ? expandido.opcoes : [];
  exigir(opcoes.length > 0, 'condutor: a versão detalhada não tem opção');
  const titulo = estadoBruto?.opcao;
  const k = Math.max(0, opcoes.findIndex((o, i) => (o.titulo ?? `Opção ${i + 1}`) === titulo));
  const rs = resolverOpcao(opcoes[k], `opção ${k + 1}`, expandido.pontos).filter((r) => r.forma.oculto !== true);
  exigir(rs.length > 0, 'condutor: a versão detalhada não tem forma visível');
  const falta = [];
  const caixa = {};
  /* o Envelope por forma: o detalhado que declara `substitui: "<forma-da-maquete>"` em uma forma é conferido contra a caixa
     daquela forma da maquete; as formas sem `substitui` continuam conferidas pela caixa da unidade */
  const trocas = rs.filter((r) => typeof r.forma.substitui === 'string');
  const resto = trocas.length > 0 ? rs.filter((r) => typeof r.forma.substitui !== 'string') : rs;
  const formasDaMaquete = u.envelope.formas ?? {};
  const porForma = [];
  for (const alvo of [...new Set(trocas.map((r) => r.forma.substitui))]) {
    const doAlvo = trocas.filter((r) => r.forma.substitui === alvo);
    const env = formasDaMaquete[alvo];
    if (!env) {
      const nomes = Object.keys(formasDaMaquete);
      falta.push(`a forma "${alvo}", que ${doAlvo.map((r) => r.id).join(', ')} diz substituir, não é uma forma da unidade "${unidade}" na maquete${quisDizer(alvo, nomes)} (formas da unidade: ${nomes.join(', ') || 'nenhuma gravada'})`);
      porForma.push({ forma: alvo, por: doAlvo.map((r) => r.id), ok: false, ausente: true });
      continue;
    }
    const caixaDaForma = {};
    const toleranciaDaForma = declarada ?? Math.max(1, 0.01 * Math.max(...EIXOS.map((e) => env[e][1] - env[e][0]), 0));
    for (const [i, e] of EIXOS.entries()) {
      const d = [Math.min(...doAlvo.map((r) => r.min[i])), Math.max(...doAlvo.map((r) => r.max[i]))];
      const excesso = Math.max(env[e][0] - d[0], d[1] - env[e][1], 0);
      caixaDaForma[e] = { envelope: env[e], detalhe: [r1(d[0]), r1(d[1])], excesso_mm: r1(excesso), ok: excesso <= toleranciaDaForma + 1e-9 };
    }
    const ok = EIXOS.every((e) => caixaDaForma[e].ok);
    porForma.push({ forma: alvo, por: doAlvo.map((r) => r.id), ok, tolerancia_mm: r1(toleranciaDaForma), caixa: caixaDaForma });
    for (const e of EIXOS.filter((x) => !caixaDaForma[x].ok)) falta.push(`a forma "${alvo}" da maquete foi excedida: ${doAlvo.map((r) => r.id).join(', ')} passa${doAlvo.length === 1 ? '' : 'm'} ${n1(caixaDaForma[e].excesso_mm)} mm em ${e} (detalhe ${faixa(caixaDaForma[e].detalhe)}, forma da maquete ${faixa(caixaDaForma[e].envelope)}, tolerância ${n1(toleranciaDaForma)} mm)`);
  }
  const base = resto.length > 0 ? resto : rs;
  EIXOS.forEach((e, i) => {
    const d = [Math.min(...base.map((r) => r.min[i])), Math.max(...base.map((r) => r.max[i]))];
    const env = u.envelope.caixa[e];
    const excesso = resto.length === 0 && trocas.length > 0 ? 0 : Math.max(env[0] - d[0], d[1] - env[1], 0);
    caixa[e] = { envelope: env, detalhe: [r1(d[0]), r1(d[1])], excesso_mm: r1(excesso), ok: excesso <= tolerancia + 1e-9 };
    if (!caixa[e].ok) falta.push(`a versão detalhada passa ${n1(excesso)} mm do Envelope em ${e} (detalhe ${faixa(caixa[e].detalhe)}, envelope ${faixa(env)}, tolerância ${n1(tolerancia)} mm)`);
  });
  const portas = u.envelope.portas.map((p) => {
    const r = rs.find((q) => q.id === p.forma);
    const ancoras = r ? ancorasDe(r) : null;
    if (!ancoras || !Object.hasOwn(ancoras, p.ancora)) {
      falta.push(`a porta ${p.forma}.${p.ancora} (usada por ${p.usadaPor.join(', ')}) não existe na versão detalhada: ela precisa ter a forma "${p.forma}" com a âncora "${p.ancora}"`);
      return { forma: p.forma, ancora: p.ancora, esperado: p.ponto, medido: null, desvio_mm: null, ok: false };
    }
    const medido = ancoras[p.ancora].map(r1);
    const desvio = Math.hypot(...medido.map((v, i) => v - p.ponto[i]));
    const ok = desvio <= tolerancia + 1e-9;
    if (!ok) falta.push(`a porta ${p.forma}.${p.ancora} (usada por ${p.usadaPor.join(', ')}) saiu do lugar: [${medido.map(n1).join(' ')}] na versão detalhada e [${p.ponto.map(n1).join(' ')}] na maquete, ${n1(desvio)} mm de diferença, com tolerância de ${n1(tolerancia)} mm`);
    return { forma: p.forma, ancora: p.ancora, esperado: p.ponto, medido, desvio_mm: r1(desvio), ok };
  });
  return { unidade, ok: falta.length === 0, tolerancia_mm: r1(tolerancia), tolerancia_declarada: declarada !== undefined, caixa, portas, ...(porForma.length > 0 ? { formas: porForma } : {}), falta };
}

/* Texto do resultado de `conferirEnvelope`. */
export function formatarEnvelope(r, arquivo) {
  const L = [`envelope da unidade ${r.unidade} contra ${arquivo}: ${r.ok ? 'cabe' : 'não cabe'} (tolerância ${n1(r.tolerancia_mm)} mm${r.tolerancia_declarada ? '' : ', padrão de 1% da maior dimensão'})`];
  L.push(`  caixa: ${EIXOS.map((e) => (r.caixa[e].ok ? `${e} cabe` : `${e} passa ${n1(r.caixa[e].excesso_mm)} mm`)).join('; ')}`);
  if (r.formas?.length) L.push(`  formas da maquete: ${r.formas.map((f) => (f.ausente ? `${f.forma} ausente` : f.ok ? `${f.forma} cabe` : `${f.forma} excedida`)).join('; ')}`);
  L.push(r.portas.length === 0 ? '  portas: nenhuma (nenhuma outra unidade usa uma âncora desta)' : `  portas: ${r.portas.map((p) => `${p.forma}.${p.ancora} ${p.ok ? `no lugar (${n1(p.desvio_mm)} mm)` : p.medido === null ? 'ausente' : `fora do lugar (${n1(p.desvio_mm)} mm)`}`).join('; ')}`);
  for (const f of r.falta) L.push(`  - ${f}`);
  return `${L.join('\n')}\n`;
}

/* Grava no estado o resultado da conferência do Envelope da unidade (só o resultado, sem data). */
export function registrarEnvelope(estado, resultado, arquivo) {
  const novo = clone(estado);
  const u = novo.unidades.find((x) => x.id === resultado.unidade);
  if (u) u.envelopeConferido = { ok: resultado.ok, arquivo, tolerancia_mm: resultado.tolerancia_mm, falta: resultado.falta };
  return novo;
}
